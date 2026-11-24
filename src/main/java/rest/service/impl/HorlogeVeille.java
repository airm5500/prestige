package rest.service.impl;

import dal.TParameters;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import util.horloge.DecisionHorloge;
import util.horloge.ReferenceTemps;
import util.horloge.SuiviHorloge;

/**
 * Cahier des charges du 24/11, point 1 : veille de l'heure du serveur, chaque minute.
 * <ul>
 * <li>suit l'heure réelle ({@link SuiviHorloge}) et l'enregistre dans horloge_repere : un redémarrage la retrouve, et
 * une date saisie à la main n'intervient plus dans le contrôle ;</li>
 * <li>trace l'apparition, le changement et la levée du blocage (horloge_trace) ;</li>
 * <li>referme et trace une régularisation dont le délai est écoulé.</li>
 * </ul>
 * Les postes lisent la décision à l'instant par {@link #etatActuel()} : le blocage se lève dès que l'heure est remise.
 * <p>
 * Essais d'écran : avec la propriété système {@code prestige.essais.horloge=true} (domaines d'essai seulement), les
 * paramètres KEY_HORLOGE_ESSAI_MURALE_MIN (minutes ajoutées à l'horloge du serveur), KEY_HORLOGE_ESSAI_SANS_INTERNET (1
 * : Internet injoignable) et KEY_HORLOGE_ESSAI_DECALAGE (secondes ajoutées à l'écart avec Internet) simulent une
 * horloge fausse sans toucher à la date de Windows. Sans la propriété, ils sont ignorés : personne ne peut s'en servir
 * pour masquer une heure fausse.
 */
@Singleton
@Startup
@ConcurrencyManagement(ConcurrencyManagementType.BEAN)
public class HorlogeVeille {

    private static final Logger LOG = Logger.getLogger(HorlogeVeille.class.getName());
    static final String CLE_SEUIL_ECART = "KEY_HORLOGE_SEUIL_ECART_MIN";
    static final String CLE_SEUIL_RECUL = "KEY_HORLOGE_SEUIL_RECUL_MIN";
    static final String CLE_DUREE = "KEY_HORLOGE_REGULARISATION_DUREE_H";
    static final String CLE_RECUL_MAX = "KEY_HORLOGE_REGULARISATION_RECUL_J";
    static final String CLE_ESSAI_MURALE = "KEY_HORLOGE_ESSAI_MURALE_MIN";
    static final String CLE_ESSAI_SANS_INTERNET = "KEY_HORLOGE_ESSAI_SANS_INTERNET";
    static final String CLE_ESSAI_DECALAGE = "KEY_HORLOGE_ESSAI_DECALAGE";
    public static final String PROPRIETE_ESSAIS = "prestige.essais.horloge";
    /** Une date au-delà de 3 ans après la construction de cette version n'est pas plausible. */
    static final long PLAFOND_MS = LocalDateTime.of(2029, 12, 31, 23, 59).toInstant(ZoneOffset.UTC).toEpochMilli();

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private final SuiviHorloge suivi = new SuiviHorloge();
    /*
     * Chaque écriture par l'API lit la décision (HorlogeBlocageFilter) : la ligne horloge_repere et les paramètres sont
     * relus au plus toutes les 5 secondes. La veille de la minute relit toujours la base.
     */
    private static final long CACHE_MS = 5_000L;
    private volatile Object[] repereCache;
    private volatile long repereLu;
    private final java.util.concurrent.ConcurrentHashMap<String, Object[]> parametres = new java.util.concurrent.ConcurrentHashMap<>();

    static boolean essais() {
        return Boolean.parseBoolean(System.getProperty(PROPRIETE_ESSAIS, "false"));
    }

    private String parametre(String cle) {
        try {
            TParameters p = em.find(TParameters.class, cle);
            return p == null || p.getStrVALUE() == null ? null : p.getStrVALUE().trim();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private int entier(String cle, int defaut) {
        long maintenant = System.currentTimeMillis();
        Object[] c = parametres.get(cle);
        if (c != null && maintenant - (Long) c[1] < CACHE_MS) {
            return c[0] == null ? defaut : (Integer) c[0];
        }
        Integer v = lireEntier(cle);
        parametres.put(cle, new Object[] { v, maintenant });
        return v == null ? defaut : v;
    }

    private Integer lireEntier(String cle) {
        try {
            String v = parametre(cle);
            return v == null || v.isEmpty() ? null : Integer.valueOf(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Ligne horloge_repere, relue au plus toutes les 5 secondes. */
    private Object[] repereRecent() {
        long maintenant = System.currentTimeMillis();
        Object[] r = repereCache;
        if (r == null || maintenant - repereLu >= CACHE_MS) {
            r = repere();
            repereCache = r;
            repereLu = maintenant;
        }
        return r;
    }

    /** À appeler après une écriture dans horloge_repere ou dans les paramètres de l'horloge. */
    public void oublier() {
        repereCache = null;
        parametres.clear();
    }

    /** Ligne horloge_repere : [estimation_ms, regularisation, regularisation_ouverture_ms]. */
    private Object[] repere() {
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> l = em.createNativeQuery(
                    "SELECT estimation_ms, regularisation, regularisation_ouverture_ms FROM horloge_repere WHERE id = 1")
                    .getResultList();
            return l.isEmpty() ? new Object[3] : l.get(0);
        } catch (RuntimeException e) {
            LOG.log(Level.FINE, "horloge_repere illisible", e);
            return new Object[3];
        }
    }

    /**
     * Valeur numérique lue en base, ou null. Pas d'opérateur « ? : » ici : mêlant long et null, il convertissait la
     * valeur vide en nombre (NullPointerException au déploiement du 24/11).
     */
    static Long long_(Object o) {
        if (o instanceof Number) {
            return Long.valueOf(((Number) o).longValue());
        }
        if (o instanceof Boolean) {
            return Long.valueOf(((Boolean) o) ? 1 : 0); // TINYINT(1) lu comme booléen
        }
        return null;
    }

    /** Entrée de la décision : horloge du serveur, écart avec Internet, paramètres bornés, régularisation. */
    DecisionHorloge.Entree entree(Object[] repere) {
        DecisionHorloge.Entree e = new DecisionHorloge.Entree();
        long murale = System.currentTimeMillis();
        long essaiMurale = 0, essaiEcart = 0;
        boolean sansInternet = false;
        if (essais()) {
            essaiMurale = entier(CLE_ESSAI_MURALE, 0) * 60_000L;
            essaiEcart = entier(CLE_ESSAI_DECALAGE, 0) * 1000L;
            sansInternet = entier(CLE_ESSAI_SANS_INTERNET, 0) == 1;
        }
        e.maintenantMs = murale + essaiMurale;
        ReferenceTemps.Mesure m = sansInternet ? null : ReferenceTemps.mesurer();
        /* l'écart est mesuré sur l'horloge réelle du serveur : une horloge simulée en avance a un écart négatif */
        e.ecartInternetMs = m == null ? null : m.ecartMs - essaiMurale - essaiEcart;
        e.plafondMs = PLAFOND_MS;
        e.seuilEcartMin = SuiviHorloge.bornerSeuil(entier(CLE_SEUIL_ECART, 30));
        e.seuilReculMin = SuiviHorloge.bornerSeuil(entier(CLE_SEUIL_RECUL, 30));
        e.regularisationDureeH = SuiviHorloge.bornerDureeH(entier(CLE_DUREE, 24));
        e.regularisationReculMaxJours = SuiviHorloge.bornerReculJours(entier(CLE_RECUL_MAX, 7));
        Long regul = long_(repere[1]);
        e.regularisation = regul == null ? 0 : regul.intValue();
        e.regularisationOuvertureMs = long_(repere[2]);
        return e;
    }

    @Schedule(hour = "*", minute = "*", persistent = false)
    public void veiller() {
        try {
            Object[] r = repere();
            SuiviHorloge.Passage p = suivi.passer(entree(r), System.nanoTime(), long_(r[0]));
            if (p.estimationMs != null) {
                em.createNativeQuery("UPDATE horloge_repere SET estimation_ms = ?1, maj_le = NOW(3) WHERE id = 1")
                        .setParameter(1, p.estimationMs).executeUpdate();
            }
            for (SuiviHorloge.Evenement ev : p.evenements) {
                if (ev == SuiviHorloge.Evenement.REGULARISATION_EXPIREE) {
                    em.createNativeQuery(
                            "UPDATE horloge_repere SET regularisation = 0 WHERE id = 1 AND regularisation = 1")
                            .executeUpdate();
                    oublier();
                    tracer("REGULARISATION_FERMEE", p.resultat, p.estimationMs, "serveur", null,
                            "délai écoulé : régularisation refermée par le serveur");
                } else {
                    tracer("BLOCAGE_" + ev.name(), p.resultat, p.estimationMs, "serveur", null, null);
                }
            }
        } catch (RuntimeException e) {
            LOG.log(Level.SEVERE, "veille de l'horloge", e);
        }
    }

    /** Décision à l'instant et heure du serveur sur laquelle elle porte. */
    public static final class Instantane {
        public final DecisionHorloge.Resultat resultat;
        /** horloge du serveur (simulée pendant les essais) */
        public final long serveurMs;

        Instantane(DecisionHorloge.Resultat resultat, long serveurMs) {
            this.resultat = resultat;
            this.serveurMs = serveurMs;
        }
    }

    /** Décision à l'instant, lue par les postes. */
    public Instantane etatActuel() {
        Object[] r = repereRecent();
        DecisionHorloge.Entree e = entree(r);
        long serveur = e.maintenantMs;
        DecisionHorloge.Resultat res = suivi.demarre() ? suivi.apercu(e, System.nanoTime())
                : suivi.apercuInitial(e, long_(r[0]));
        /*
         * Essai du 24/11 : un blocage plus court qu'une minute tombait entre deux passages de la veille et n'était
         * jamais tracé. Un poste qui constate un changement (apparition, cause, levée) fait passer la veille tout de
         * suite : la trace est écrite une fois (le suivi est synchronisé), au moment où le changement est vu.
         */
        if (suivi.changeraitLaTrace(res)) {
            veiller();
        }
        return new Instantane(res, serveur);
    }

    /**
     * Date et heure réelles (heure suivie par le serveur), pour refuser une date saisie dans le futur ; l'horloge du
     * serveur si aucune n'est connue.
     */
    public java.time.LocalDateTime maintenantReel() {
        Long r;
        try {
            r = etatActuel().resultat.estimationRetenueMs;
        } catch (RuntimeException e) {
            r = null;
        }
        return java.time.LocalDateTime.ofInstant(
                java.time.Instant.ofEpochMilli(r == null ? System.currentTimeMillis() : r),
                java.time.ZoneId.systemDefault());
    }

    /**
     * Cahier du 24/11 : régularisation à date passée, ouverte ou refermée par le super administrateur (la ressource le
     * vérifie). L'ouverture est datée de l'heure réelle suivie par le serveur, jamais de l'horloge de Windows : le
     * délai (24 h au plus) court en temps réel, même si l'horloge a été reculée pour saisir. Tracée.
     */
    public void regulariser(boolean ouvrir, String utilisateur, String poste) {
        Long reel;
        try {
            reel = etatActuel().resultat.estimationRetenueMs;
        } catch (RuntimeException e) {
            reel = null;
        }
        long ouverture = reel == null ? System.currentTimeMillis() : reel;
        em.createNativeQuery("UPDATE horloge_repere SET regularisation = ?1, regularisation_ouverture_ms = ?2,"
                + " regularisation_par = ?3 WHERE id = 1").setParameter(1, ouvrir ? 1 : 0)
                .setParameter(2, ouvrir ? ouverture : null).setParameter(3, ouvrir ? utilisateur : null)
                .executeUpdate();
        oublier();
        tracer(ouvrir ? "REGULARISATION_OUVERTE" : "REGULARISATION_FERMEE_MANUELLEMENT", null, ouverture, poste,
                utilisateur, null);
    }

    /** Une ligne de trace ; jamais de texte saisi par un utilisateur. */
    public void tracer(String evenement, DecisionHorloge.Resultat r, Long reference, String poste, String utilisateur,
            String detail) {
        StringBuilder causes = new StringBuilder();
        if (r != null) {
            for (DecisionHorloge.Cause c : r.causes) {
                causes.append(causes.length() == 0 ? "" : ",").append(c.name());
            }
        }
        em.createNativeQuery("INSERT INTO horloge_trace (serveur_le, reference_ms, evenement, causes, poste, "
                + "utilisateur_id, detail) VALUES (NOW(3), ?1, ?2, ?3, ?4, ?5, ?6)").setParameter(1, reference)
                .setParameter(2, evenement).setParameter(3, causes.length() == 0 ? null : causes.toString())
                .setParameter(4, poste == null ? null : poste.length() > 100 ? poste.substring(0, 100) : poste)
                .setParameter(5, utilisateur)
                .setParameter(6, detail == null ? null : detail.length() > 500 ? detail.substring(0, 500) : detail)
                .executeUpdate();
    }
}
