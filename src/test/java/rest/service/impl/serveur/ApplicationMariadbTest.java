package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ApplicationMariadb.Action;
import rest.service.impl.serveur.ApplicationMariadb.Droits;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

class ApplicationMariadbTest {

    private static final long GO = ReglagesServeur.GO, MO = ReglagesServeur.MO;

    /** Configuration en place chez les officines (retour du 14/10). */
    private static Map<String, String> officine() {
        Map<String, String> v = new HashMap<>();
        v.put("innodb_buffer_pool_size", String.valueOf(3500 * MO));
        v.put("innodb_log_buffer_size", String.valueOf(2048 * MO));
        v.put("max_allowed_packet", String.valueOf(1024 * MO));
        v.put("max_connections", "251");
        v.put("tmp_table_size", String.valueOf(128 * MO));
        v.put("max_heap_table_size", String.valueOf(128 * MO));
        v.put("thread_cache_size", "10");
        v.put("table_open_cache", "2000");
        v.put("innodb_io_capacity", "200");
        v.put("innodb_io_capacity_max", "2000");
        v.put("innodb_flush_log_at_trx_commit", "1");
        v.put("slow_query_log", "OFF");
        v.put("long_query_time", "10.000000");
        v.put("innodb_print_all_deadlocks", "OFF");
        v.put("version", "10.6.12-MariaDB");
        return v;
    }

    private static List<Reglage> reglages(Map<String, String> v) {
        return ReglagesServeur.comparer(16 * GO, 8, 3 * GO, v, 4, 50);
    }

    private static Action a(List<Action> l, String cle) {
        return l.stream().filter(x -> x.cle.equals(cle)).findFirst().orElse(null);
    }

    @Test
    void droitSuperOuToutAccorde() {
        assertTrue(ApplicationMariadb.droits(Arrays.asList("GRANT SUPER, PROCESS ON *.* TO `prestige`@`%`"),
                "10.6.12-MariaDB", "prestige@%").ok);
        assertTrue(ApplicationMariadb.droits(
                Arrays.asList("GRANT ALL PRIVILEGES ON *.* TO `root`@`localhost` WITH GRANT OPTION"), "10.4.0-MariaDB",
                "root@localhost").ok);
        assertTrue(ApplicationMariadb.droits(Arrays.asList("GRANT SYSTEM VARIABLES ADMIN ON *.* TO `prestige`@`%`"),
                "10.6.12-MariaDB", "prestige@%").ok);
    }

    @Test
    void droitManquantSignaleAvecLaCommande() {
        Droits d = ApplicationMariadb.droits(
                Arrays.asList("GRANT USAGE ON *.* TO `prestige`@`%`",
                        "GRANT ALL PRIVILEGES ON `laborex_v1_db`.* TO `prestige`@`%`"),
                "10.6.12-MariaDB", "prestige@%");
        assertFalse(d.ok, "tous les droits sur la seule base ne suffisent pas");
        assertTrue(d.message.contains("SUPER"), d.message);
        assertTrue(d.message.contains("SYSTEM_VARIABLES_ADMIN"), "10.6 : l'autre droit est cite");
        assertTrue(d.message.contains("GRANT SUPER ON *.* TO 'prestige'@'%'"), d.message);
        /* avant 10.5.2, SYSTEM VARIABLES ADMIN n'existe pas */
        assertFalse(ApplicationMariadb.droits(Arrays.asList("GRANT SYSTEM VARIABLES ADMIN ON *.* TO `prestige`@`%`"),
                "10.4.30-MariaDB", "prestige@%").ok);
        assertFalse(ApplicationMariadb.droits(Collections.emptyList(), "10.6.12-MariaDB", "x@y").ok);
    }

    @Test
    void seulsLesReglagesAAjusterDeLaListeFermee() {
        List<Action> l = ApplicationMariadb.preparer(reglages(officine()), officine(), null);
        assertNull(a(l, "tmp_table_size"), "deja correct : rien a faire");
        assertNull(a(l, "memoire"), "la machine n'est pas un reglage de MariaDB");
        assertNull(a(l, "Xmx"));
        Action packet = a(l, "max_allowed_packet");
        assertEquals(256 * MO, packet.valeur);
        assertTrue(packet.dynamique);
        assertEquals("1 Go", packet.avant);
        Action lent = a(l, "slow_query_log");
        assertEquals(1, lent.valeur);
        assertEquals(2, a(l, "long_query_time").valeur);
        for (Action x : l) {
            assertTrue(ApplicationMariadb.connu(x.cle), x.cle);
        }
    }

    @Test
    void journalEnMemoireNonModifiableAChaud() {
        Action j = a(ApplicationMariadb.preparer(reglages(officine()), officine(), null), "innodb_log_buffer_size");
        assertFalse(j.dynamique, "MariaDB 10.6 : redemarrage necessaire, ecrit dans my.ini seulement");
        assertEquals(64 * MO, j.valeur);
    }

    @Test
    void tamponInnodbSignaleCommeLong() {
        Action b = a(ApplicationMariadb.preparer(reglages(officine()), officine(), null), "innodb_buffer_pool_size");
        assertTrue(b.dynamique);
        assertTrue(b.long_, "le redimensionnement se fait par morceaux, pendant plusieurs minutes");
        assertNotNull(b.avertissement);
    }

    @Test
    void capaciteMaxReleveeAvantLaCapacite() {
        List<Action> l = ApplicationMariadb.preparer(reglages(officine()), officine(), null);
        Action max = a(l, "innodb_io_capacity_max"), cap = a(l, "innodb_io_capacity");
        assertNotNull(max, "innodb_io_capacity=2000 echoue si le maximum reste a 2000 ou moins");
        assertEquals(4000, max.valeur);
        assertTrue(l.indexOf(max) < l.indexOf(cap));
    }

    @Test
    void ecritureSureBloqueeA1() {
        Map<String, String> v = officine();
        v.put("innodb_flush_log_at_trx_commit", "2");
        Action f = a(ApplicationMariadb.preparer(reglages(v), v, null), "innodb_flush_log_at_trx_commit");
        assertEquals(1, f.valeur, "on ne remet que 1");
        assertNull(f.refus);
        /* une valeur autre que 1 n'est jamais appliquee, meme si elle venait d'un calcul fautif */
        Reglage faux = reglages(v).stream().filter(x -> x.cle.equals("innodb_flush_log_at_trx_commit")).findFirst()
                .get();
        faux.ligne = "innodb_flush_log_at_trx_commit=2";
        Action refus = a(ApplicationMariadb.preparer(Collections.singletonList(faux), v, null),
                "innodb_flush_log_at_trx_commit");
        assertNotNull(refus.refus);
        assertEquals("innodb_flush_log_at_trx_commit=1",
                ApplicationMariadb.ligneSure("innodb_flush_log_at_trx_commit=0"));
    }

    @Test
    void choixDeReglagesFiltreParLaListeFermee() {
        Set<String> choix = new TreeSet<>(Arrays.asList("max_allowed_packet", "general_log", "x; DROP TABLE t"));
        List<Action> l = ApplicationMariadb.preparer(reglages(officine()), officine(), choix);
        assertEquals(1, l.size(), "general_log et le texte libre sont ignores");
        assertEquals("max_allowed_packet", l.get(0).cle);
        assertFalse(ApplicationMariadb.connu("general_log"));
        assertFalse(ApplicationMariadb.connu("x; DROP TABLE t"));
    }

    @Test
    void valeurHorsBornesRefusee() {
        Reglage r = reglages(officine()).stream().filter(x -> x.cle.equals("max_connections")).findFirst().get();
        r.ligne = "max_connections=900000";
        r.niveau = ReglagesServeur.Niveau.A_AJUSTER;
        Action m = a(ApplicationMariadb.preparer(Collections.singletonList(r), officine(), null), "max_connections");
        assertNotNull(m.refus);
    }

    @Test
    void journalAvantApres() {
        List<Action> l = ApplicationMariadb.preparer(reglages(officine()), officine(),
                new TreeSet<>(Arrays.asList("max_allowed_packet", "innodb_log_buffer_size")));
        a(l, "max_allowed_packet").etat = ApplicationMariadb.Etat.APPLIQUE;
        a(l, "max_allowed_packet").apres = "256 Mo";
        a(l, "innodb_log_buffer_size").etat = ApplicationMariadb.Etat.MY_INI;
        String j = ApplicationMariadb.journal(l);
        assertTrue(j.contains("max_allowed_packet : 1 Go -> 256 Mo"), j);
        assertTrue(j.contains("innodb_log_buffer_size : 2 Go -> 64 Mo (au prochain redémarrage"), j);
    }
}
