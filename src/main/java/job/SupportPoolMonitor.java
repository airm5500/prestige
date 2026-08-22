package job;

import java.sql.Connection;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.management.MBeanServer;
import javax.management.ObjectName;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Surveillance du POOL DE CONNEXIONS du serveur d'application.
 *
 * <p>
 * La surveillance existante regarde la base ; le pool, lui, n'etait pas surveille. C'est pourtant lui qui explique le
 * symptome remonte par l'officine : un « Veuillez patienter » qui tourne longtemps sans rien donner, sur toutes les
 * caisses a la fois, en fin de journee - et que le REDEMARRAGE DU SERVEUR D'APPLICATION repare. Ni le reseau ni la base
 * ne se reparent par un redemarrage de l'application : c'est donc une ressource que celle-ci detient et qui s'epuise.
 *
 * <p>
 * Trois mesures, du plus direct au plus explicatif :
 *
 * <ul>
 * <li><b>le temps d'obtention d'une connexion</b>. C'est la mesure qui compte : quand le pool est plein, toute requete
 * attend qu'une place se libere, jusqu'au delai maximal du pool. C'est litteralement la duree du « Veuillez patienter
 * ». Elle ne depend d'aucun MBean et fonctionne partout ;</li>
 * <li><b>les compteurs du pool</b>, lus par JMX quand la surveillance de Payara est active : connexions utilisees,
 * libres, en file d'attente, et fuites potentielles. Facultatif : leur absence n'empeche rien ;</li>
 * <li><b>les connexions dormantes anciennes</b>, cote base. Une connexion « Sleep » depuis des heures est le signe
 * d'une connexion empruntee et jamais rendue.</li>
 * </ul>
 *
 * <p>
 * Anti-bruit : au plus une alerte par indicateur et par jour, comme les autres moniteurs.
 *
 * @author koben
 */
@Singleton
@PermitAll
public class SupportPoolMonitor {

    private static final Logger LOG = Logger.getLogger(SupportPoolMonitor.class.getName());

    /** Un pic bref est normal : on n'alerte que sur un ralentissement soutenu. */
    private static final int PALIERS_ATTENTE = 2;
    private static final int MAX_DORMANTES_DETAILLEES = 10;

    /**
     * Connexions ouvertes mais inactives depuis longtemps. Une connexion rendue au pool ne compte pas : elle est fermee
     * ou reutilisee. Celles qui dorment des heures ont ete empruntees et jamais rendues.
     */
    private static final String DORMANTES_WHERE = " FROM information_schema.PROCESSLIST"
            + " WHERE COMMAND = 'Sleep' AND ID <> CONNECTION_ID() AND TIME >= ?1";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportEventService supportEventService;
    @javax.inject.Inject
    private config.AppConfig appConfig;

    /**
     * La source de donnees de l'application. Injectee par son nom JNDI, celui que porte la persistance : c'est bien le
     * pool des ventes que l'on mesure, et non un autre.
     */
    @Resource(lookup = "jdbc/__laborex_pool")
    private DataSource dataSource;

    private int depassementsAttente = 0;
    private int filsSatures = 0;

    @Schedule(hour = "*", minute = "*/5", persistent = false)
    public void verifier() {
        try {
            if (!"1".equals(StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_DB_MONITOR_ENABLED")))) {
                return;
            }
            verifierAttente();
            verifierFilsHttp();
            verifierDormantes();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "SupportPoolMonitor.verifier", e);
        }
    }

    private void verifierAttente() {
        long attente = tempsObtentionMs();
        int seuil = intParam("SUPPORT_POOL_WAIT_MS", 2000);
        if (attente < 0) {
            return;
        }
        if (attente >= seuil) {
            depassementsAttente++;
            if (depassementsAttente >= PALIERS_ATTENTE) {
                publier(evaluerAttente(attente, seuil, statistiquesPool()), poste());
                depassementsAttente = 0;
            }
        } else {
            depassementsAttente = 0;
        }
    }

    /**
     * Fils d'execution HTTP occupes.
     *
     * <p>
     * Le pool de fils HTTP de Payara vaut CINQ par defaut, et il n'est pas dimensionne dans l'installation type d'une
     * caisse. Cinq requetes simultanees suffisent alors a bloquer le poste : les suivantes font la queue sans qu'aucune
     * erreur ne soit levee, et l'utilisateur voit un « Veuillez patienter » qui ne finit pas. Un redemarrage repare, ce
     * qui acheve de faire passer le probleme pour un mystere.
     *
     * <p>
     * On ne passe pas par la surveillance de Payara, qui demande une configuration : les fils portent un nom
     * reconnaissable dans la machine virtuelle, il suffit de les compter.
     */
    static java.util.Map<String, Object> filsHttp() {
        java.util.Map<String, Object> mesures = new LinkedHashMap<>();
        /*
         * Le comptage se fait PAR ECOUTEUR. Payara en declare deux - le port ordinaire et le port securise - et chacun
         * dispose de son propre quota, alors qu'ils partagent le nom du pool. Un total global masquerait la saturation
         * : cinq fils pris sur dix, ce n'est pas la moitie du poste occupee, c'est l'ecouteur qui recoit TOUT le trafic
         * qui est plein, et plus rien ne passe. Constate a l'essai.
         */
        java.util.Map<String, int[]> parEcouteur = new LinkedHashMap<>();
        try {
            java.lang.management.ThreadMXBean fils = java.lang.management.ManagementFactory.getThreadMXBean();
            java.lang.management.ThreadInfo[] infos = fils.getThreadInfo(fils.getAllThreadIds());
            for (java.lang.management.ThreadInfo info : infos) {
                if (info == null || !StringUtils.startsWith(info.getThreadName(), "http-thread-pool")) {
                    continue;
                }
                String ecouteur = StringUtils.substringBefore(StringUtils.substringAfter(info.getThreadName(), "::"),
                        "(");
                int[] compte = parEcouteur.computeIfAbsent(StringUtils.defaultIfBlank(ecouteur, "ecouteur"),
                        c -> new int[2]);
                compte[0]++;
                /*
                 * Un fil qui SERT une requete est executable ou bloque sur la base ; un fil au repos attend dans la
                 * file du pool, donc en WAITING sans requete. C'est cette distinction qui dit si le poste sature.
                 */
                if (info.getThreadState() != Thread.State.WAITING
                        && info.getThreadState() != Thread.State.TIMED_WAITING) {
                    compte[1]++;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "filsHttp", e);
        }
        int total = 0;
        int occupes = 0;
        int pireOccupes = 0;
        int pireTotal = 0;
        for (java.util.Map.Entry<String, int[]> e : parEcouteur.entrySet()) {
            total += e.getValue()[0];
            occupes += e.getValue()[1];
            mesures.put("filsHttp[" + e.getKey() + "]", e.getValue()[1] + "/" + e.getValue()[0]);
            // L'ecouteur le plus charge decide : c'est lui qui bloque, meme si les autres respirent.
            if (e.getValue()[0] > 0 && e.getValue()[1] * pireTotal >= pireOccupes * e.getValue()[0]) {
                pireOccupes = e.getValue()[1];
                pireTotal = e.getValue()[0];
            }
        }
        mesures.put("filsHttpTotal", total);
        mesures.put("filsHttpOccupes", occupes);
        mesures.put("filsHttpEcouteurLePlusCharge", pireOccupes + "/" + pireTotal);
        mesures.put("filsHttpPireOccupes", pireOccupes);
        mesures.put("filsHttpPireTotal", pireTotal);
        return mesures;
    }

    /*
     * La verification periodique tourne sur un fil de MINUTERIE, pas sur un fil HTTP : elle n'occupe donc pas elle-meme
     * une des places qu'elle compte, et peut voir l'ecouteur reellement plein. Le releve fait a la demande depuis le
     * Centre de Support, lui, arrive par HTTP et occupe une place - il montrera donc au plus n-1 sur n.
     */
    private void verifierFilsHttp() {
        java.util.Map<String, Object> fils = filsHttp();
        int total = (Integer) fils.get("filsHttpPireTotal");
        int occupes = (Integer) fils.get("filsHttpPireOccupes");
        if (total <= 0 || occupes < total) {
            filsSatures = 0;
            return;
        }
        filsSatures++;
        if (filsSatures >= PALIERS_ATTENTE) {
            publier(evaluerFilsHttp(occupes, total), poste());
            filsSatures = 0;
        }
    }

    private void verifierDormantes() {
        int ageMinutes = intParam("SUPPORT_POOL_SLEEP_MIN", 60);
        long dormantes = compterDormantes(ageMinutes);
        int seuil = intParam("SUPPORT_POOL_SLEEP_MAX", 20);
        Alerte alerte = evaluerDormantes(dormantes, seuil, ageMinutes);
        if (alerte != null) {
            publier(new Alerte(alerte.code, alerte.niveau, alerte.message,
                    alerte.detail + "\n" + listerDormantes(ageMinutes)), poste());
        }
    }

    /**
     * Temps mis pour obtenir une connexion du pool, en millisecondes, ou -1 si la mesure a echoue.
     *
     * <p>
     * La connexion est rendue immediatement : la mesure ne doit pas devenir elle-meme une cause d'epuisement. Un echec
     * est significatif - le pool refuse de servir - et ressort en duree maximale plutot qu'en -1, sans quoi la panne la
     * plus grave passerait pour une mesure manquante.
     */
    long tempsObtentionMs() {
        if (dataSource == null) {
            return -1L;
        }
        long depart = System.nanoTime();
        try (Connection cx = dataSource.getConnection()) {
            return (System.nanoTime() - depart) / 1_000_000L;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Obtention d'une connexion impossible", e);
            return (System.nanoTime() - depart) / 1_000_000L;
        }
    }

    /**
     * Compteurs du pool exposes par Payara en JMX, quand la surveillance est activee.
     *
     * <p>
     * Les noms d'objets JMX changent d'une version a l'autre : on ne les ecrit pas en dur, on CHERCHE ceux qui portent
     * le type de surveillance des pools JDBC, et on lit les attributs presents. Rien n'est obligatoire ici : ces
     * compteurs enrichissent le diagnostic, ils ne le conditionnent pas.
     */
    Map<String, Object> statistiquesPool() {
        Map<String, Object> stats = new LinkedHashMap<>();
        try {
            MBeanServer serveur = java.lang.management.ManagementFactory.getPlatformMBeanServer();
            demarrerAmx(serveur);
            /*
             * Les compteurs vivent dans l'arbre de surveillance, dont le nom d'objet a change d'une version a l'autre.
             * Plutot qu'un nom en dur qui cesserait de fonctionner a la premiere montee de version, on retient les
             * objets de surveillance dont le nom cite le pool.
             */
            Set<ObjectName> noms = serveur.queryNames(null, null);
            for (ObjectName nom : noms) {
                String texte = String.valueOf(nom);
                if (!texte.contains("laborex") || !texte.contains("mon")) {
                    continue;
                }
                for (String attribut : new String[] { "numconnused", "numconnfree", "waitqueuelength",
                        "numconnfailedvalidation", "numpotentialconnleak", "averageconnwaittime", "numconntimedout",
                        "connrequestwaittime" }) {
                    try {
                        Object valeur = serveur.getAttribute(nom, attribut);
                        if (valeur != null) {
                            stats.put(attribut, lisible(valeur));
                        }
                    } catch (Exception ignore) {
                        // Attribut absent de cette version : les autres restent lisibles.
                    }
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "statistiquesPool", e);
        }
        if (stats.isEmpty()) {
            stats.put("indisponible", "compteurs du pool non exposes. Pour les activer : asadmin set"
                    + " server.monitoring-service.module-monitoring-levels.jdbc-connection-pool=HIGH");
        }
        return stats;
    }

    /**
     * Demarre l'arbre de surveillance AMX s'il ne l'est pas deja.
     *
     * <p>
     * Payara ne le monte qu'a la demande : sans cela les compteurs du pool n'existent nulle part en JMX, meme quand la
     * surveillance est reglee sur HIGH. L'operation est sans effet si l'arbre est deja monte, et son echec n'empeche
     * rien - la mesure qui compte, le temps d'obtention, ne depend pas de JMX.
     */
    private void demarrerAmx(MBeanServer serveur) {
        try {
            ObjectName amorce = new ObjectName("amx-support:type=boot-amx");
            if (serveur.isRegistered(amorce)) {
                serveur.invoke(amorce, "bootAMX", null, null);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "demarrerAmx", e);
        }
    }

    /** Certains compteurs rendent une structure composite : on n'en garde que la valeur utile. */
    static String lisible(Object valeur) {
        if (valeur instanceof javax.management.openmbean.CompositeData) {
            javax.management.openmbean.CompositeData donnee = (javax.management.openmbean.CompositeData) valeur;
            for (String cle : new String[] { "count", "current", "highwatermark" }) {
                if (donnee.containsKey(cle)) {
                    return String.valueOf(donnee.get(cle));
                }
            }
        }
        return String.valueOf(valeur);
    }

    private long compterDormantes(int ageMinutes) {
        try {
            Object valeur = em.createNativeQuery("SELECT COUNT(*)" + DORMANTES_WHERE).setParameter(1, ageMinutes * 60)
                    .getSingleResult();
            return valeur instanceof Number ? ((Number) valeur).longValue() : -1L;
        } catch (Exception e) {
            LOG.log(Level.FINE, "compterDormantes", e);
            return -1L;
        }
    }

    /** Les connexions dormantes elles-memes : sans elles, l'alerte ne dit pas d'ou vient la fuite. */
    private String listerDormantes(int ageMinutes) {
        StringBuilder sb = new StringBuilder("=== Connexions dormantes au-dela du seuil ===\n");
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = em
                    .createNativeQuery("SELECT ID, USER, HOST, TIME, DB" + DORMANTES_WHERE
                            + " ORDER BY TIME DESC LIMIT " + MAX_DORMANTES_DETAILLEES)
                    .setParameter(1, ageMinutes * 60).getResultList();
            if (lignes.isEmpty()) {
                return sb.append("(aucune au moment du releve)\n").toString();
            }
            for (Object[] ligne : lignes) {
                sb.append("- ").append(String.valueOf(ligne[3])).append(" s | connexion ")
                        .append(String.valueOf(ligne[0])).append(" | ").append(String.valueOf(ligne[1])).append('@')
                        .append(String.valueOf(ligne[2])).append(" | ").append(String.valueOf(ligne[4])).append('\n');
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
        int ageMinutes = intParam("SUPPORT_POOL_SLEEP_MIN", 60);
        mesures.put("poste", poste());
        mesures.put("tempsObtentionMs", tempsObtentionMs());
        mesures.put("seuilAttenteMs", intParam("SUPPORT_POOL_WAIT_MS", 2000));
        mesures.put("dormantesAgeMinutes", ageMinutes);
        mesures.put("dormantes", compterDormantes(ageMinutes));
        mesures.put("seuilDormantes", intParam("SUPPORT_POOL_SLEEP_MAX", 20));
        mesures.put("detailDormantes", listerDormantes(ageMinutes));
        mesures.putAll(filsHttp());
        mesures.putAll(statistiquesPool());
        return mesures;
    }

    /**
     * Nom du poste qui fait la mesure. Chaque poste a son PROPRE serveur d'application, donc son propre pool : sans ce
     * nom, on saurait qu'un pool va mal sans savoir lequel, et le premier poste a signaler masquerait les autres.
     */
    private String poste() {
        try {
            return PosteLocal.identifiant(appConfig != null && appConfig.isServerMode());
        } catch (Exception e) {
            return PosteLocal.nomMachine();
        }
    }

    private void publier(Alerte alerte, String poste) {
        if (alerte == null) {
            return;
        }
        supportEventService.recordServerIncident(alerte.code + "-" + poste + "-" + LocalDate.now(), alerte.niveau,
                alerte.message + " (" + poste + ")", "Poste : " + poste + "\n\n" + alerte.detail);
        LOG.log(Level.WARNING, "Alerte pool de connexions sur {0} : {1}", new Object[] { poste, alerte.message });
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
    // Regles pures (sans base ni conteneur) : testables directement
    // ------------------------------------------------------------------

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

    /**
     * Obtenir une connexion doit etre instantane. Des qu'il faut attendre, c'est que le pool est plein : toutes les
     * caisses ralentissent en meme temps, et c'est ce que voit l'utilisateur comme un « Veuillez patienter » sans fin.
     */
    static Alerte evaluerAttente(long attenteMs, int seuilMs, Map<String, Object> stats) {
        if (attenteMs < 0 || attenteMs < seuilMs) {
            return null;
        }
        String niveau = attenteMs >= seuilMs * 5L ? dal.ApplicationEvent.NIVEAU_ERROR
                : dal.ApplicationEvent.NIVEAU_WARN;
        StringBuilder detail = new StringBuilder();
        detail.append("Obtenir une connexion a la base a demande ").append(attenteMs).append(" ms").append(" (seuil ")
                .append(seuilMs).append(" ms).\n\n")
                .append("Une connexion doit s'obtenir instantanement. Une attente signifie que le pool du serveur")
                .append(" d'application est plein : toutes les caisses ralentissent alors en meme temps, et la")
                .append(" cloture d'une vente peut depasser le delai du poste.\n\n")
                .append("A verifier, dans cet ordre :\n")
                .append("1. la taille du pool (max-pool-size, defaut 32) au regard du nombre de postes ;\n")
                .append("2. la recuperation des fuites (connection-leak-timeout-in-seconds, desactivee par defaut) ;\n")
                .append("3. les connexions dormantes anciennes, signalees separement.\n\n")
                .append("Compteurs du pool au moment du releve :\n");
        for (Map.Entry<String, Object> e : stats.entrySet()) {
            detail.append("  ").append(e.getKey()).append(" = ").append(String.valueOf(e.getValue())).append('\n');
        }
        return new Alerte("POOL_ATTENTE", niveau, "Le pool de connexions fait attendre les requetes",
                detail.toString());
    }

    /**
     * Tous les fils HTTP occupes : le poste ne peut plus servir une requete de plus, les suivantes attendent leur tour
     * en silence. Le pool vaut CINQ par defaut et n'est pas dimensionne dans l'installation type - c'est le plafond le
     * plus bas de la chaine, et le plus facile a atteindre.
     */
    static Alerte evaluerFilsHttp(int occupes, int total) {
        if (total <= 0 || occupes < total) {
            return null;
        }
        String detail = "Les " + total + " fil(s) d'execution HTTP de ce poste sont tous occupes.\n\n"
                + "Une requete de plus doit attendre qu'un fil se libere. Rien n'est signale a l'utilisateur :"
                + " l'ecran affiche « Veuillez patienter » et ne bouge plus. Si la caissiere abandonne et revalide,"
                + " c'est de la que vient l'erreur sur une vente pourtant encaissee.\n\n"
                + "Le pool de fils HTTP de Payara vaut CINQ par defaut. Verifier qu'il est dimensionne sur ce poste :\n"
                + "  asadmin get server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size\n"
                + "Un poste de caisse tient confortablement avec 50.";
        return new Alerte("HTTP_FILS_SATURES", dal.ApplicationEvent.NIVEAU_ERROR,
                "Tous les fils d'execution HTTP du poste sont occupes", detail);
    }

    /**
     * Connexions dormantes : une connexion empruntee et jamais rendue reste ouverte cote base sans rien faire. Elles
     * s'accumulent au fil de la journee et le plafond finit par etre atteint - a l'heure la plus chargee.
     */
    static Alerte evaluerDormantes(long dormantes, int seuil, int ageMinutes) {
        if (dormantes < 0 || dormantes < seuil) {
            return null;
        }
        String detail = dormantes + " connexion(s) ouverte(s) et inactive(s) depuis plus de " + ageMinutes
                + " minute(s) (seuil " + seuil + ").\n\n"
                + "Une connexion rendue au pool ne dort pas : elle est reutilisee ou fermee. Celles-ci ont ete"
                + " empruntees et jamais rendues. Elles s'accumulent au fil de la journee et occupent des places"
                + " qui manqueront a l'heure de pointe.\n\n"
                + "Les editions d'etats ouvrent des connexions DIRECTES, hors du pool (dal.jconnexion) : c'est le"
                + " premier endroit ou chercher.";
        return new Alerte("POOL_DORMANTES", dal.ApplicationEvent.NIVEAU_WARN,
                "Des connexions restent ouvertes sans etre utilisees", detail);
    }
}
