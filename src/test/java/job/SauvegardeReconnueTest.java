package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import config.AppConfig;
import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import org.junit.jupiter.api.Test;
import rest.service.SupportEventService;

/**
 * Retour support du 18/11 (R7) : chaque matin vers 08:35, la surveillance de la base (SupportDatabaseMonitor) publiait
 * « 1 requete(s) en cours depuis plus de 10 s (la plus ancienne : 115 s) » (16/11 ×27, 17/11 ×6, 18/11 ×8). Cette
 * requete etait la sauvegarde elle-meme (mysqldump --single-transaction : « SELECT /*!40001 SQL_NO_CACHE *&#47; * FROM
 * t_preenregistrement »), longue par nature et sans verrou. La surveillance doit la reconnaitre : un evenement INFO «
 * sauvegarde en cours », jamais une alerte de requete lente ; une vraie requete lente reste signalee, sans la
 * sauvegarde dans ses chiffres.
 */
class SauvegardeReconnueTest {

    private static final String DUMP = "SELECT /*!40001 SQL_NO_CACHE */ * FROM `t_preenregistrement`";

    /** Ligne de information_schema.PROCESSLIST : ID, USER, TIME, INFO. */
    private static Object[] ligne(long id, String compte, long secondes, String info) {
        return new Object[] { id, compte, secondes, info };
    }

    /** Evenements publies : code (sans la date), niveau, message, detail. */
    private final List<String[]> publies = Collections.synchronizedList(new ArrayList<>());

    /**
     * Fait tourner la surveillance par son vrai point d'entree, sur un serveur, avec une liste de processus donnee. La
     * fausse base applique le filtre de duree (TIME >= ?1), le tri, la limite, et rend COUNT/MAX comme MariaDB.
     */
    private List<String[]> surveiller(List<Object[]> processus) throws Exception {
        publies.clear();
        SupportDatabaseMonitor m = new SupportDatabaseMonitor();
        injecter(m, AppConfig.class, new AppConfig() {
            @Override
            public boolean isServerMode() {
                return true;
            }
        });
        injecter(m, SupportEventService.class, Proxy.newProxyInstance(SupportEventService.class.getClassLoader(),
                new Class<?>[] { SupportEventService.class }, (p, meth, a) -> {
                    if ("getParameter".equals(meth.getName())) {
                        return "SUPPORT_DB_MONITOR_ENABLED".equals(a[0]) ? "1" : null;
                    }
                    if ("recordServerIncident".equals(meth.getName())) {
                        publies.add(new String[] { String.valueOf(a[0]).replaceAll("-\\d{4}-\\d{2}-\\d{2}$", ""),
                                (String) a[1], (String) a[2], (String) a[3] });
                    }
                    return null;
                }));
        injecter(m, EntityManager.class, Proxy.newProxyInstance(EntityManager.class.getClassLoader(),
                new Class<?>[] { EntityManager.class },
                (p, meth, a) -> "createNativeQuery".equals(meth.getName()) ? requete((String) a[0], processus) : null));
        m.verifier();
        return new ArrayList<>(publies);
    }

    private static Query requete(String sql, List<Object[]> processus) {
        long[] seuil = { 0 };
        return (Query) Proxy.newProxyInstance(Query.class.getClassLoader(), new Class<?>[] { Query.class },
                (p, meth, a) -> {
                    switch (meth.getName()) {
                    case "setParameter":
                        seuil[0] = ((Number) a[1]).longValue();
                        return p;
                    case "getResultList": {
                        if (!sql.contains("PROCESSLIST")) {
                            return Collections.emptyList(); // SHOW STATUS / VARIABLES : mesure indisponible
                        }
                        List<Object[]> l = processus.stream().filter(r -> (long) r[2] >= seuil[0])
                                .sorted((x, y) -> Long.compare((long) y[2], (long) x[2])).collect(Collectors.toList());
                        Matcher lim = Pattern.compile("LIMIT (\\d+)").matcher(sql);
                        return lim.find() ? l.subList(0, Math.min(l.size(), Integer.parseInt(lim.group(1)))) : l;
                    }
                    case "getSingleResult": {
                        List<Object[]> l = processus.stream().filter(r -> (long) r[2] >= seuil[0])
                                .collect(Collectors.toList());
                        long max = l.stream().mapToLong(r -> (long) r[2]).max().orElse(0);
                        return sql.contains("MAX(") ? new Object[] { (long) l.size(), max } : (Object) (long) l.size();
                    }
                    default:
                        return m(meth.getReturnType(), p);
                    }
                });
    }

    private static Object m(Class<?> type, Object p) {
        return type.isInstance(p) ? p : null;
    }

    private static void injecter(Object cible, Class<?> type, Object valeur) throws Exception {
        for (Field f : cible.getClass().getDeclaredFields()) {
            if (f.getType() == type) {
                f.setAccessible(true);
                f.set(cible, valeur);
                return;
            }
        }
        throw new AssertionError("pas de champ " + type.getSimpleName());
    }

    private static List<String[]> code(List<String[]> evts, String code) {
        return evts.stream().filter(e -> e[0].equals(code)).collect(Collectors.toList());
    }

    @Test
    void sauvegardeDu18NovembreNEstPlusUneRequeteLente() throws Exception {
        List<String[]> e = surveiller(Arrays.<Object[]> asList(ligne(4711, "root", 115, DUMP)));
        assertEquals(0, code(e, "bdd-requetes-lentes").size(), "la sauvegarde n'est pas une requete lente");
        List<String[]> s = code(e, "bdd-sauvegarde");
        assertEquals(1, s.size(), "un evenement « sauvegarde en cours »");
        assertEquals("INFO", s.get(0)[1]);
        assertTrue(s.get(0)[2].contains("115 s") && s.get(0)[2].contains("root"), s.get(0)[2]);
        assertTrue(s.get(0)[2].toLowerCase().contains("sauvegarde en cours"), s.get(0)[2]);
    }

    @Test
    void vraieRequeteLenteResteSignaleeSansLaSauvegarde() throws Exception {
        List<String[]> e = surveiller(Arrays.<Object[]> asList(ligne(4711, "root", 60, DUMP),
                ligne(12, "prestige", 25, "SELECT f.* FROM t_famille f JOIN t_famille_stock s ON 1=1"),
                ligne(13, "prestige", 3, "SELECT 1")));
        List<String[]> l = code(e, "bdd-requetes-lentes");
        assertEquals(1, l.size(), "la vraie requete lente est signalee");
        assertTrue(l.get(0)[2].startsWith("1 requete(s)") && l.get(0)[2].contains("la plus ancienne : 25 s"),
                l.get(0)[2]);
        assertTrue(l.get(0)[3].contains("t_famille"), l.get(0)[3]);
        assertFalse(l.get(0)[3].contains("connexion 4711"), "la sauvegarde n'est pas listee parmi les requetes lentes");
        assertTrue(l.get(0)[3].contains("Sauvegarde en cours"),
                "le detail dit qu'une sauvegarde tournait en meme temps");
    }

    @Test
    void rienAuDessusDuSeuilRienPublie() throws Exception {
        assertEquals(0, surveiller(Arrays.<Object[]> asList(ligne(4711, "root", 4, DUMP), ligne(1, "p", 2, "SELECT 2")))
                .size());
    }

    @Test
    void reconnaissanceDeLaSauvegarde() {
        assertTrue(SupportDatabaseMonitor.estSauvegarde(DUMP));
        assertTrue(SupportDatabaseMonitor.estSauvegarde("  select /*!40001 SQL_NO_CACHE */ * from `t_user`"));
        assertTrue(SupportDatabaseMonitor.estSauvegarde("SELECT /*!40001 SQL_NO_CACHE */ * FROM `t_mvt` WHERE x"));
        assertFalse(SupportDatabaseMonitor.estSauvegarde("SELECT SQL_NO_CACHE * FROM t_user"), "requete d'ecran");
        assertFalse(SupportDatabaseMonitor.estSauvegarde("SELECT a FROM t WHERE c = '/*!40001 SQL_NO_CACHE */'"),
                "la marque ailleurs qu'en tete");
        assertFalse(SupportDatabaseMonitor.estSauvegarde(null));
        assertFalse(SupportDatabaseMonitor.estSauvegarde("UPDATE t_produit SET x = 1"));
    }

    /**
     * Coherence (graine fixe, 3 000 listes de processus) : l'alerte « requetes lentes » compte exactement les requetes
     * non sauvegarde au-dessus du seuil, avec leur plus longue duree ; l'evenement « sauvegarde » n'apparait que si
     * seule la sauvegarde depasse le seuil, avec sa duree ; jamais les deux a la fois sans mention de la sauvegarde.
     */
    @Test
    void reglesSurDesMilliersDeCas() throws Exception {
        Random r = new Random(20261118L);
        int alertes = 0, sauvegardes = 0, silences = 0;
        for (int i = 0; i < 3000; i++) {
            List<Object[]> proc = new ArrayList<>();
            int n = r.nextInt(6);
            for (int k = 0; k < n; k++) {
                boolean dump = r.nextInt(3) == 0;
                proc.add(ligne(k + 1, dump ? "sauvegarde" : "prestige", r.nextInt(200),
                        dump ? "SELECT /*!40001 SQL_NO_CACHE */ * FROM `t_" + k + "`" : "SELECT * FROM t_" + k));
            }
            long lentes = proc.stream().filter(p -> (long) p[2] >= 10 && !((String) p[3]).contains("40001")).count();
            long maxLente = proc.stream().filter(p -> (long) p[2] >= 10 && !((String) p[3]).contains("40001"))
                    .mapToLong(p -> (long) p[2]).max().orElse(0);
            long dumps = proc.stream().filter(p -> (long) p[2] >= 10 && ((String) p[3]).contains("40001")).count();
            long maxDump = proc.stream().filter(p -> (long) p[2] >= 10 && ((String) p[3]).contains("40001"))
                    .mapToLong(p -> (long) p[2]).max().orElse(0);
            List<String[]> e = surveiller(proc);
            List<String[]> l = code(e, "bdd-requetes-lentes"), s = code(e, "bdd-sauvegarde");
            String cas = "cas " + i + " : " + proc.stream().map(p -> p[2] + "s " + p[3]).collect(Collectors.toList());
            if (lentes > 0) {
                alertes++;
                assertEquals(1, l.size(), cas);
                assertTrue(l.get(0)[2].startsWith(lentes + " requete(s)"), cas + " / " + l.get(0)[2]);
                assertTrue(l.get(0)[2].contains("la plus ancienne : " + maxLente + " s"), cas + " / " + l.get(0)[2]);
                assertEquals(0, s.size(), cas);
                assertEquals(dumps > 0, l.get(0)[3].contains("Sauvegarde en cours"), cas);
            } else if (dumps > 0) {
                sauvegardes++;
                assertEquals(0, l.size(), cas);
                assertEquals(1, s.size(), cas);
                assertTrue(s.get(0)[2].contains(maxDump + " s"), cas + " / " + s.get(0)[2]);
            } else {
                silences++;
                assertEquals(0, e.size(), cas);
            }
        }
        assertTrue(alertes > 300 && sauvegardes > 150 && silences > 100, alertes + "/" + sauvegardes + "/" + silences);
    }
}
