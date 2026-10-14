package rest.service.impl.serveur;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4) : historique de vie du serveur (t_serveur_vie) et releves de son etat
 * (t_serveur_mesure). Chaque ecriture a sa propre transaction : un echec n'en entraine aucun autre.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class ServeurVieService {

    static final int JOURS_MESURES = 14;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Releve de l'etat du serveur. Les mesures indisponibles valent null. */
    public static final class Mesure {
        public Long vieId, memoireMo, memoireMaxMo, gcNombre, gcMs, ramLibreMo, ramTotaleMo, disqueLibreMo;
        public Integer fils, filsHttpActifs, requetes, bddConnexions;
        public Double cpuServeurPct, cpuMachinePct;
        public LocalDateTime quand = LocalDateTime.now();
    }

    private static Timestamp ts(LocalDateTime t) {
        return t == null ? null : Timestamp.valueOf(t);
    }

    private static Long l(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : null;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public long demarrer(String hote, long pid, String java, long memoireMaxMo, String options) {
        em.createNativeQuery("INSERT INTO t_serveur_vie (hote, pid, demarre_at, dernier_signe_at, arret, java_version,"
                + " memoire_max_mo, options_jvm) VALUES (?1, ?2, NOW(), NOW(), 'EN_COURS', ?3, ?4, ?5)")
                .setParameter(1, StringUtils.left(hote, 80)).setParameter(2, pid)
                .setParameter(3, StringUtils.left(java, 40)).setParameter(4, memoireMaxMo)
                .setParameter(5, StringUtils.left(options, 1000)).executeUpdate();
        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).longValue();
    }

    /** Session precedente de cette machine restee « en cours » (arret brutal) : {id, dernier signe}, ou null. */
    @SuppressWarnings("unchecked")
    public Object[] precedenteEnCours(String hote, long courant) {
        List<Object[]> r = em
                .createNativeQuery("SELECT id, COALESCE(dernier_signe_at, demarre_at) FROM t_serveur_vie"
                        + " WHERE hote = ?1 AND id < ?2 AND arret = 'EN_COURS' ORDER BY id DESC LIMIT 1")
                .setParameter(1, StringUtils.left(hote, 80)).setParameter(2, courant).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        Object t = r.get(0)[1];
        return new Object[] { l(r.get(0)[0]), t instanceof Timestamp ? ((Timestamp) t).toLocalDateTime() : null };
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void cloturerBrutal(long id, CauseArret.Diagnostic d, long indisponibiliteMin) {
        em.createNativeQuery("UPDATE t_serveur_vie SET arret = 'BRUTAL', cause_code = ?1, cause_libelle = ?2,"
                + " cause_explication = ?3, cause_conseil = ?4, indisponibilite_min = ?5 WHERE id = ?6")
                .setParameter(1, d.code.name()).setParameter(2, StringUtils.left(d.code.libelle, 120))
                .setParameter(3, StringUtils.left(d.explication, 400)).setParameter(4, StringUtils.left(d.conseil, 400))
                .setParameter(5, (int) Math.min(Integer.MAX_VALUE, indisponibiliteMin)).setParameter(6, id)
                .executeUpdate();
        /* les sessions plus anciennes restees « en cours » (avant cette version) sont closes sans cause */
        em.createNativeQuery("UPDATE t_serveur_vie SET arret = 'BRUTAL', cause_libelle = 'Non analysé'"
                + " WHERE arret = 'EN_COURS' AND id < ?1 AND hote = (SELECT h.hote FROM (SELECT hote FROM t_serveur_vie"
                + " WHERE id = ?1) h)").setParameter(1, id).executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void enregistrerParametre(String cle, String valeur) {
        em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1, dt_UPDATED = NOW() WHERE str_KEY = ?2")
                .setParameter(1, valeur).setParameter(2, cle).executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void signe(long id) {
        em.createNativeQuery("UPDATE t_serveur_vie SET dernier_signe_at = NOW() WHERE id = ?1").setParameter(1, id)
                .executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void arretPropre(long id) {
        em.createNativeQuery("UPDATE t_serveur_vie SET arret = 'PROPRE', arrete_at = NOW(), dernier_signe_at = NOW()"
                + " WHERE id = ?1").setParameter(1, id).executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void mesurer(String hote, Mesure m) {
        em.createNativeQuery("INSERT INTO t_serveur_mesure (vie_id, hote, mesure_at, memoire_mo, memoire_max_mo, fils,"
                + " fils_http_actifs, gc_nombre, gc_ms, cpu_serveur_pct, cpu_machine_pct, ram_libre_mo, ram_totale_mo,"
                + " disque_libre_mo, requetes, bdd_connexions) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,"
                + " ?13, ?14, ?15, ?16)").setParameter(1, m.vieId).setParameter(2, StringUtils.left(hote, 80))
                .setParameter(3, ts(m.quand)).setParameter(4, m.memoireMo).setParameter(5, m.memoireMaxMo)
                .setParameter(6, m.fils).setParameter(7, m.filsHttpActifs).setParameter(8, m.gcNombre)
                .setParameter(9, m.gcMs).setParameter(10, arrondi(m.cpuServeurPct))
                .setParameter(11, arrondi(m.cpuMachinePct)).setParameter(12, m.ramLibreMo)
                .setParameter(13, m.ramTotaleMo).setParameter(14, m.disqueLibreMo).setParameter(15, m.requetes)
                .setParameter(16, m.bddConnexions).executeUpdate();
        em.createNativeQuery("DELETE FROM t_serveur_mesure WHERE mesure_at < ?1 LIMIT 2000")
                .setParameter(1, ts(LocalDateTime.now().minusDays(JOURS_MESURES))).executeUpdate();
    }

    private static BigDecimal arrondi(Double d) {
        return d == null || d.isNaN() || d < 0 ? null : BigDecimal.valueOf(Math.round(d * 10) / 10.0);
    }

    /** Variable d'etat de MariaDB (SHOW GLOBAL STATUS), ou null. */
    @SuppressWarnings("unchecked")
    public Long statutMariadb(String nom) {
        try {
            List<Object[]> r = em
                    .createNativeQuery("SHOW GLOBAL STATUS LIKE '" + nom.replaceAll("[^A-Za-z_]", "") + "'")
                    .getResultList();
            return r.isEmpty() ? null : Long.valueOf(String.valueOf(r.get(0)[1]).trim());
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Variables de MariaDB (SHOW GLOBAL VARIABLES), noms en minuscules. */
    @SuppressWarnings("unchecked")
    public java.util.Map<String, String> variablesMariadb() {
        java.util.Map<String, String> m = new java.util.HashMap<>();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SHOW GLOBAL VARIABLES").getResultList()) {
            m.put(String.valueOf(r[0]).toLowerCase(java.util.Locale.ROOT), String.valueOf(r[1]));
        }
        return m;
    }

    /** Releves d'une machine avant un instant (les plus recents d'abord). */
    @SuppressWarnings("unchecked")
    public List<Object[]> mesuresAvant(String hote, LocalDateTime avant, int nombre) {
        return em.createNativeQuery(
                "SELECT mesure_at, memoire_mo, memoire_max_mo, fils, fils_http_actifs, cpu_serveur_pct,"
                        + " cpu_machine_pct, ram_libre_mo, disque_libre_mo, requetes, bdd_connexions FROM t_serveur_mesure"
                        + " WHERE hote = ?1 AND mesure_at <= ?2 ORDER BY mesure_at DESC LIMIT "
                        + Math.max(1, Math.min(200, nombre)))
                .setParameter(1, StringUtils.left(hote, 80)).setParameter(2, ts(avant)).getResultList();
    }

    /** Historique des sessions du serveur (les plus recentes d'abord). */
    @SuppressWarnings("unchecked")
    public JSONArray historique(int limite) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT id, hote, demarre_at, dernier_signe_at, arrete_at,"
                        + " arret, cause_code, cause_libelle, cause_explication, cause_conseil, indisponibilite_min, java_version,"
                        + " memoire_max_mo FROM t_serveur_vie ORDER BY demarre_at DESC, id DESC LIMIT "
                        + Math.max(1, Math.min(500, limite)))
                .getResultList()) {
            a.put(new JSONObject().put("id", l(r[0])).put("hote", r[1]).put("demarre", texte(r[2]))
                    .put("dernierSigne", texte(r[3])).put("arrete", texte(r[4])).put("arret", r[5])
                    .put("causeCode", StringUtils.defaultString((String) r[6]))
                    .put("cause", StringUtils.defaultString((String) r[7]))
                    .put("explication", StringUtils.defaultString((String) r[8]))
                    .put("conseil", StringUtils.defaultString((String) r[9]))
                    .put("indisponibilite", r[10] == null ? "" : r[10])
                    .put("java", StringUtils.defaultString((String) r[11]))
                    .put("memoireMaxMo", r[12] == null ? "" : r[12]));
        }
        return a;
    }

    /** Releves des dernieres heures (les plus anciens d'abord). */
    @SuppressWarnings("unchecked")
    public JSONArray mesures(int heures) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT mesure_at, memoire_mo, memoire_max_mo, fils,"
                + " fils_http_actifs, cpu_serveur_pct, cpu_machine_pct, ram_libre_mo, ram_totale_mo, disque_libre_mo,"
                + " requetes, bdd_connexions, gc_ms FROM t_serveur_mesure WHERE mesure_at >= ?1 ORDER BY mesure_at")
                .setParameter(1, ts(LocalDateTime.now().minusHours(Math.max(1, Math.min(24 * JOURS_MESURES, heures)))))
                .getResultList()) {
            a.put(new JSONObject().put("quand", texte(r[0])).put("memoireMo", n(r[1])).put("memoireMaxMo", n(r[2]))
                    .put("fils", n(r[3])).put("filsHttp", n(r[4])).put("cpuServeur", n(r[5])).put("cpuMachine", n(r[6]))
                    .put("ramLibreMo", n(r[7])).put("ramTotaleMo", n(r[8])).put("disqueLibreMo", n(r[9]))
                    .put("requetes", n(r[10])).put("bddConnexions", n(r[11])).put("gcMs", n(r[12])));
        }
        return a;
    }

    private static Object n(Object o) {
        return o == null ? JSONObject.NULL : o;
    }

    private static String texte(Object o) {
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime().toString().replace('T', ' ').substring(0, 16);
        }
        return o == null ? "" : o.toString();
    }

    public static List<String> optionsUtiles(List<String> arguments) {
        List<String> l = new ArrayList<>();
        for (String a : arguments) {
            /* seules les options de la JVM (-X, -XX) : les -D peuvent porter des mots de passe */
            if (a.startsWith("-X") && !a.toLowerCase(java.util.Locale.ROOT).contains("password")) {
                l.add(a);
            }
        }
        return l;
    }
}
