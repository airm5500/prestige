package rest.service.mobile;

import java.sql.Timestamp;
import java.util.Date;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONObject;
import rest.service.mobile.lecture.FournisseurLecture;
import rest.service.mobile.lecture.LectureAvanceeConfiguration;

/**
 * O5 (Prestige Mobile) : lecture avancee d'une ordonnance par un service externe, AVEC le consentement de l'officine.
 * <p>
 * Le telephone envoie l'image JPEG de la seule ZONE DES MEDICAMENTS, recadree et masquee (en-tete, patient, signature
 * caches ; metadonnees retirees). Le serveur :
 * <ul>
 * <li>n'enregistre PAS l'image (ni sur disque, ni en base, ni dans les journaux) : elle n'existe qu'en memoire le temps
 * de l'appel au fournisseur ;</li>
 * <li>appelle le fournisseur configure avec la cle gardee sur le serveur ({@link LectureAvanceeConfiguration}), une
 * seule lecture a la fois, avec un delai maximal, sans relance automatique ;</li>
 * <li>applique un quota par jour pour toute l'officine ;</li>
 * <li>journalise chaque appel dans {@code mobile_lecture_avancee_journal} : date, utilisateur, taille, fournisseur,
 * modele, resultat, nombre de lignes, jetons, cout estime, duree - jamais l'image ni le texte lu.</li>
 * </ul>
 */
@Stateless
public class MobileLectureAvanceeService {

    private static final Logger LOG = Logger.getLogger(MobileLectureAvanceeService.class.getName());

    /** Taille maximale de l'image recue (la zone recadree et compressee par le telephone fait 100 a 600 Ko). */
    public static final int TAILLE_MAX = 4 * 1024 * 1024;

    /** Une seule lecture a la fois pour tout le serveur. */
    private static final Semaphore UNE_A_LA_FOIS = new Semaphore(1);

    private static volatile boolean tablePresente;
    private static volatile long tableVerifieeA;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Reponse : code HTTP + corps JSON. */
    public static final class Reponse {
        public final int statut;
        public final JSONObject corps;

        Reponse(int statut, JSONObject corps) {
            this.statut = statut;
            this.corps = corps;
        }

        static Reponse erreur(int statut, String msg) {
            return new Reponse(statut, new JSONObject().put("success", false).put("msg", msg));
        }
    }

    /** Configuration courante (relue a chaque appel : un changement de cle ne demande pas de redemarrage). */
    LectureAvanceeConfiguration config() {
        return LectureAvanceeConfiguration.duServeur();
    }

    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public boolean disponible() {
        return config().configuree() && tablePresente();
    }

    private boolean tablePresente() {
        if (tablePresente) {
            return true;
        }
        long now = System.currentTimeMillis();
        if (tableVerifieeA != 0 && now - tableVerifieeA < 60_000L) {
            return false;
        }
        try {
            Number n = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM information_schema.tables "
                            + "WHERE table_schema = DATABASE() AND table_name = 'mobile_lecture_avancee_journal'")
                    .getSingleResult();
            tablePresente = n != null && n.intValue() > 0;
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "mobile_lecture_avancee_journal : verification impossible", e);
            tablePresente = false;
        }
        tableVerifieeA = now;
        return tablePresente;
    }

    /** Lectures deja faites aujourd'hui (appels au fournisseur, reussis ou non). */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public int lecturesDuJour() {
        Number n = (Number) em.createNativeQuery("SELECT COUNT(*) FROM mobile_lecture_avancee_journal "
                + "WHERE jour = CURDATE() AND resultat IN ('ok', 'echec', 'delai')").getSingleResult();
        return n == null ? 0 : n.intValue();
    }

    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public int quotaRestant() {
        return Math.max(0, config().quotaJour() - lecturesDuJour());
    }

    static boolean estJpeg(byte[] b) {
        return b != null && b.length > 4 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public Reponse lire(byte[] jpeg, String userId) {
        LectureAvanceeConfiguration c = config();
        if (!c.configuree() || !tablePresente()) {
            return Reponse.erreur(503, "Lecture avancée non configurée sur le serveur.");
        }
        int taille = jpeg == null ? 0 : jpeg.length;
        if (!estJpeg(jpeg)) {
            return Reponse.erreur(400, "Image JPEG attendue.");
        }
        if (taille > TAILLE_MAX) {
            return Reponse.erreur(413, "Image trop grande (4 Mo au plus) : recadrez la zone des médicaments.");
        }
        FournisseurLecture f = FournisseurLecture.pour(c);
        if (f == null) {
            return Reponse.erreur(503, "Lecture avancée non configurée sur le serveur.");
        }
        boolean pris;
        try {
            pris = UNE_A_LA_FOIS.tryAcquire(2, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            pris = false;
        }
        if (!pris) {
            journal(userId, taille, c, "occupe", 0, 0, 0, 0);
            return Reponse.erreur(429, "Une lecture avancée est déjà en cours : réessayez dans un instant.");
        }
        try {
            if (lecturesDuJour() >= c.quotaJour()) {
                journal(userId, taille, c, "quota", 0, 0, 0, 0);
                return Reponse.erreur(429, "Quota de lectures avancées du jour atteint (" + c.quotaJour() + ").");
            }
            long t0 = System.currentTimeMillis();
            try {
                FournisseurLecture.Resultat r = f.lire(jpeg, c);
                long duree = System.currentTimeMillis() - t0;
                double cout = (r.jetonsEntree * c.prixEntree() + r.jetonsSortie * c.prixSortie()) / 1_000_000d;
                journal(userId, taille, c, "ok", r.lignes.length(), r.jetonsEntree, r.jetonsSortie, cout, duree);
                return new Reponse(200, new JSONObject().put("success", true).put("lignes", r.lignes)
                        .put("fournisseur", c.fournisseur())
                        .put("modele", LectureAvanceeConfiguration.CLAUDE.equals(c.fournisseur()) ? c.modele() : "")
                        .put("coutEstime", Math.round(cout * 1_000_000d) / 1_000_000d)
                        .put("quotaRestant", Math.max(0, c.quotaJour() - lecturesDuJour())));
            } catch (FournisseurLecture.Echec e) {
                long duree = System.currentTimeMillis() - t0;
                journal(userId, taille, c, e.delai ? "delai" : "echec", 0, 0, 0, 0, duree);
                return Reponse.erreur(e.delai ? 504 : 502, "Lecture avancée impossible : " + e.getMessage() + ".");
            }
        } finally {
            UNE_A_LA_FOIS.release();
        }
    }

    private void journal(String userId, int taille, LectureAvanceeConfiguration c, String resultat, int lignes,
            long entree, long sortie, double cout) {
        journal(userId, taille, c, resultat, lignes, entree, sortie, cout, 0);
    }

    /** Une ligne de journal : jamais l'image ni le texte lu. */
    private void journal(String userId, int taille, LectureAvanceeConfiguration c, String resultat, int lignes,
            long entree, long sortie, double cout, long duree) {
        String modele = LectureAvanceeConfiguration.CLAUDE.equals(c.fournisseur()) ? c.modele() : c.fournisseur();
        LOG.log(Level.INFO,
                "Lecture avancee : utilisateur={0}, taille={1} octets, fournisseur={2}, modele={3}, resultat={4}, "
                        + "lignes={5}, jetons={6}/{7}, cout estime={8} $, duree={9} ms",
                new Object[] { userId, taille, c.fournisseur(), modele, resultat, lignes, entree, sortie,
                        String.format(java.util.Locale.ROOT, "%.6f", cout), duree });
        try {
            em.createNativeQuery(
                    "INSERT INTO mobile_lecture_avancee_journal (jour, horodatage, lg_USER_ID, taille_octets, "
                            + "fournisseur, modele, resultat, lignes, jetons_entree, jetons_sortie, cout_estime, duree_ms) "
                            + "VALUES (CURDATE(), ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)")
                    .setParameter(1, new Timestamp(new Date().getTime())).setParameter(2, userId)
                    .setParameter(3, taille).setParameter(4, c.fournisseur()).setParameter(5, modele)
                    .setParameter(6, resultat).setParameter(7, lignes).setParameter(8, entree).setParameter(9, sortie)
                    .setParameter(10, cout).setParameter(11, duree).executeUpdate();
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Journal de la lecture avancee : ecriture impossible", e);
        }
    }
}
