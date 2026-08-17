package job;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Surveillance de la base de donnees.
 *
 * La supervision existante regarde la JVM et le disque ; la base, elle, n'etait pas surveillee. C'est pourtant de la
 * qu'est venue la serie d'effondrements corriges par les migrations d'index (peremptions, articles invendus, ouverture
 * d'inventaire) : "les threads HTTP finissaient satures et plus aucune donnee ne s'affichait". Le filtre des requetes
 * lentes voit le symptome cote HTTP, jamais la cause cote SGBD.
 *
 * Trois indicateurs, releves au meme rythme que les ressources :
 * <ul>
 * <li>connexions ouvertes rapportees a max_connections - sature, plus aucune requete ne passe ;</li>
 * <li>requetes reellement en cours d'execution depuis trop longtemps - c'est le signe d'un index manquant ;</li>
 * <li>attentes de verrou InnoDB - a l'origine des "Lock wait timeout exceeded" deja rencontres au demarrage.</li>
 * </ul>
 *
 * Anti-bruit : au plus une alerte par indicateur et par jour (signature datee), comme le moniteur de ressources. Les
 * connexions demandent en plus un depassement SOUTENU, un pic bref etant normal.
 *
 * @author koben
 */
@Singleton
@PermitAll
public class SupportDatabaseMonitor {

    private static final Logger LOG = Logger.getLogger(SupportDatabaseMonitor.class.getName());
    private static final int PALIERS_CONNEXIONS = 3;
    private static final int MAX_REQUETES_DETAILLEES = 5;

    /*
     * Requetes REELLEMENT en cours d'execution. Trois exclusions, chacune constatee sur un serveur reel :
     *
     * - 'Sleep' : connexion ouverte mais inactive, ce n'est pas une requete ; - 'Daemon' : threads systeme de MySQL
     * (event_scheduler, replication). Leur duree croit indefiniment sans qu'ils executent quoi que ce soit - sans cette
     * exclusion, l'alerte se declencherait sur tout serveur, tous les jours ; - INFO vide : thread sans instruction en
     * cours, meme raison.
     *
     * ID <> CONNECTION_ID() ecarte la requete de surveillance elle-meme.
     */
    private static final String REQUETES_EN_COURS_WHERE = " FROM information_schema.PROCESSLIST"
            + " WHERE COMMAND NOT IN ('Sleep', 'Daemon') AND INFO IS NOT NULL AND INFO <> ''"
            + " AND ID <> CONNECTION_ID() AND TIME >= ?1";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportEventService supportEventService;

    private int depassementsConnexions = 0;

    /** Alerte prete a etre journalisee. Donnee inerte : la decision est prise par les regles pures ci-dessous. */
    public static final class Alerte {

        public final String code;
        public final String niveau;
        public final String message;
        public final String detail;

        public Alerte(String code, String niveau, String message, String detail) {
            this.code = code;
            this.niveau = niveau;
            this.message = message;
            this.detail = detail;
        }
    }

    @Schedule(hour = "*", minute = "*/5", persistent = false)
    public void verifier() {
        try {
            if (!"1".equals(StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_DB_MONITOR_ENABLED")))) {
                return;
            }
            verifierConnexions();
            verifierRequetesLentes();
            verifierVerrous();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "SupportDatabaseMonitor.verifier", e);
        }
    }

    private void verifierConnexions() {
        long ouvertes = statut("Threads_connected");
        long maximum = variable("max_connections");
        int seuil = intParam("SUPPORT_DB_CONN_PCT", 80);
        if (ouvertes < 0 || maximum <= 0) {
            return;
        }
        if (pourcentage(ouvertes, maximum) >= seuil) {
            depassementsConnexions++;
            // Un pic bref de connexions est normal : on n'alerte que sur un depassement soutenu.
            if (depassementsConnexions >= PALIERS_CONNEXIONS) {
                publier(evaluerConnexions(ouvertes, maximum, seuil, statut("Threads_running")));
                depassementsConnexions = 0;
            }
        } else {
            depassementsConnexions = 0;
        }
    }

    private void verifierRequetesLentes() {
        int seuil = intParam("SUPPORT_DB_SLOW_QUERY_S", 10);
        try {
            Object[] resume = (Object[]) em
                    .createNativeQuery("SELECT COUNT(*), COALESCE(MAX(TIME), 0)" + REQUETES_EN_COURS_WHERE)
                    .setParameter(1, seuil).getSingleResult();
            long nombre = nombre(resume[0]);
            long plusLongue = nombre(resume[1]);
            Alerte alerte = evaluerRequetesLentes(nombre, plusLongue, seuil);
            if (alerte != null) {
                publier(new Alerte(alerte.code, alerte.niveau, alerte.message,
                        alerte.detail + "\n" + listerRequetesLentes(seuil)));
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "verifierRequetesLentes", e);
        }
    }

    private void verifierVerrous() {
        long attentes = statut("Innodb_row_lock_current_waits");
        publier(evaluerVerrous(attentes, intParam("SUPPORT_DB_LOCK_WAITS", 5)));
    }

    /** Les requetes fautives elles-memes : sans elles, l'alerte ne dit pas quoi corriger. */
    private String listerRequetesLentes(int seuil) {
        StringBuilder sb = new StringBuilder("=== Requetes en cours au-dela du seuil ===\n");
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = em
                    .createNativeQuery("SELECT ID, USER, TIME, LEFT(INFO, 500)" + REQUETES_EN_COURS_WHERE
                            + " ORDER BY TIME DESC LIMIT " + MAX_REQUETES_DETAILLEES)
                    .setParameter(1, seuil).getResultList();
            if (lignes.isEmpty()) {
                // La requete a pu se terminer entre les deux mesures : ce n'est pas une anomalie.
                return sb.append("(les requetes se sont terminees entre-temps)\n").toString();
            }
            for (Object[] ligne : lignes) {
                sb.append("- ").append(nombre(ligne[2])).append(" s | connexion ").append(String.valueOf(ligne[0]))
                        .append(" | ").append(String.valueOf(ligne[1])).append("\n  ")
                        .append(StringUtils.normalizeSpace(String.valueOf(ligne[3]))).append("\n");
            }
        } catch (Exception e) {
            sb.append("(liste indisponible : ").append(String.valueOf(e.getMessage())).append(")\n");
        }
        return sb.toString();
    }

    /**
     * Mesures brutes, pour consultation a la demande depuis le Centre de Support. Ne declenche aucune alerte : c'est
     * une photographie, pas une surveillance.
     */
    public Map<String, Object> mesures() {
        Map<String, Object> mesures = new LinkedHashMap<>();
        long ouvertes = statut("Threads_connected");
        long maximum = variable("max_connections");
        mesures.put("connexionsOuvertes", ouvertes);
        mesures.put("connexionsMax", maximum);
        mesures.put("connexionsPct", pourcentage(ouvertes, maximum));
        mesures.put("requetesActives", statut("Threads_running"));
        mesures.put("attentesVerrou", statut("Innodb_row_lock_current_waits"));
        mesures.put("attenteVerrouMoyenneMs", statut("Innodb_row_lock_time_avg"));
        mesures.put("connexionsRefusees", statut("Aborted_connects"));
        int seuilLent = intParam("SUPPORT_DB_SLOW_QUERY_S", 10);
        mesures.put("seuilRequeteLenteS", seuilLent);
        mesures.put("requetesLentes", requetesLentes(seuilLent));
        mesures.put("detailRequetesLentes", listerRequetesLentes(seuilLent));
        return mesures;
    }

    private long requetesLentes(int seuil) {
        try {
            return nombre(em.createNativeQuery("SELECT COUNT(*)" + REQUETES_EN_COURS_WHERE).setParameter(1, seuil)
                    .getSingleResult());
        } catch (Exception e) {
            LOG.log(Level.FINE, "requetesLentes", e);
            return -1L;
        }
    }

    private void publier(Alerte alerte) {
        if (alerte == null) {
            return;
        }
        supportEventService.recordServerIncident(alerte.code + "-" + LocalDate.now(), alerte.niveau, alerte.message,
                alerte.detail);
        LOG.log(Level.WARNING, "Alerte base de donnees : {0}", alerte.message);
    }

    // ------------------------------------------------------------------
    // Lecture des compteurs MySQL
    // ------------------------------------------------------------------

    /**
     * Valeur d'un compteur d'etat MySQL, ou -1 si indisponible. Le nom vient exclusivement de constantes du code : il
     * n'est jamais construit a partir d'une saisie.
     */
    private long statut(String nom) {
        return premiereValeur("SHOW GLOBAL STATUS LIKE '" + nom + "'");
    }

    private long variable(String nom) {
        return premiereValeur("SHOW VARIABLES LIKE '" + nom + "'");
    }

    private long premiereValeur(String sql) {
        try {
            List<?> lignes = em.createNativeQuery(sql).getResultList();
            if (lignes.isEmpty()) {
                return -1L;
            }
            Object ligne = lignes.get(0);
            // SHOW rend deux colonnes (nom, valeur) : c'est la seconde qui nous interesse.
            Object valeur = (ligne instanceof Object[]) ? ((Object[]) ligne)[1] : ligne;
            return Long.parseLong(StringUtils.trimToEmpty(String.valueOf(valeur)));
        } catch (Exception e) {
            LOG.log(Level.FINE, "premiereValeur " + sql, e);
            return -1L;
        }
    }

    private static long nombre(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).longValue() : -1L;
    }

    private int intParam(String cle, int defaut) {
        try {
            String valeur = StringUtils.trimToEmpty(supportEventService.getParameter(cle));
            return StringUtils.isNotBlank(valeur) ? Integer.parseInt(valeur) : defaut;
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    // ------------------------------------------------------------------
    // Regles pures (sans base) : testables directement
    // ------------------------------------------------------------------

    /** Pourcentage d'occupation, ou -1 quand la mesure manque. Ne divise jamais par zero. */
    static int pourcentage(long valeur, long maximum) {
        if (valeur < 0 || maximum <= 0) {
            return -1;
        }
        return (int) (valeur * 100L / maximum);
    }

    static Alerte evaluerConnexions(long ouvertes, long maximum, int seuilPct, long actives) {
        int pct = pourcentage(ouvertes, maximum);
        if (pct < 0 || pct < seuilPct) {
            return null;
        }
        String message = "Connexions a la base elevees : " + ouvertes + " / " + maximum + " (" + pct + "%)";
        StringBuilder detail = new StringBuilder();
        detail.append("Nombre de connexions ouvertes soutenu au-dessus du seuil.\n");
        detail.append("Ouvertes : ").append(ouvertes).append("\n");
        detail.append("Maximum  : ").append(maximum).append(" (max_connections)\n");
        detail.append("Seuil    : ").append(seuilPct).append(" %\n");
        if (actives >= 0) {
            detail.append("Dont reellement actives : ").append(actives).append("\n");
        }
        detail.append("\nRisque : a saturation, la base refuse toute nouvelle connexion et l'application devient "
                + "totalement indisponible.\n");
        detail.append("Pistes : connexions non rendues au pool, requetes lentes qui monopolisent le pool, ou "
                + "dimensionnement du pool a revoir.");
        return new Alerte("bdd-connexions", "WARN", message, detail.toString());
    }

    static Alerte evaluerRequetesLentes(long nombre, long plusLongueS, int seuilS) {
        if (nombre <= 0) {
            return null;
        }
        String message = nombre + " requete(s) en cours depuis plus de " + seuilS + " s (la plus ancienne : "
                + plusLongueS + " s)";
        String detail = "Des requetes s'executent anormalement longtemps.\n" + "Nombre         : " + nombre + "\n"
                + "Plus ancienne  : " + plusLongueS + " s\n" + "Seuil          : " + seuilS + " s\n\n"
                + "Risque : chaque requete lente immobilise un thread HTTP ; quand ils sont tous pris, plus aucun "
                + "ecran ne repond.\n"
                + "Pistes : index manquant sur les colonnes filtrees, ou requete balayant une table entiere. "
                + "Comparer avec les ecrans lents du journal (evenements PERFORMANCE).\n";
        return new Alerte("bdd-requetes-lentes", "WARN", message, detail);
    }

    static Alerte evaluerVerrous(long attentes, int seuil) {
        if (attentes < 0 || attentes < seuil) {
            return null;
        }
        String message = attentes + " transaction(s) en attente d'un verrou InnoDB";
        String detail = "Plusieurs transactions attendent la liberation d'un verrou.\n" + "En attente : " + attentes
                + "\n" + "Seuil      : " + seuil + "\n\n"
                + "Risque : au-dela du delai d'attente, les transactions echouent en "
                + "\"Lock wait timeout exceeded\" et l'operation de l'utilisateur est perdue.\n"
                + "Pistes : deux traitements ecrivant les memes lignes en meme temps (import, job planifie, "
                + "validation de vente), ou une transaction restee ouverte trop longtemps.";
        return new Alerte("bdd-verrous", "WARN", message, detail);
    }
}
