package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

class ReglagesServeurTest {

    private static final long GO = ReglagesServeur.GO, MO = ReglagesServeur.MO;

    /** Configuration en place chez les officines (retour du 14/10). */
    private static Map<String, String> myIniOfficine() {
        Map<String, String> v = new HashMap<>();
        v.put("innodb_buffer_pool_size", String.valueOf(3500 * MO));
        v.put("innodb_log_file_size", String.valueOf(2048 * MO));
        v.put("innodb_log_buffer_size", String.valueOf(2048 * MO));
        v.put("max_allowed_packet", String.valueOf(1024 * MO));
        v.put("max_connections", "251");
        v.put("tmp_table_size", String.valueOf(128 * MO));
        v.put("max_heap_table_size", String.valueOf(128 * MO));
        v.put("thread_cache_size", "10");
        v.put("table_open_cache", "2000");
        v.put("innodb_io_capacity", "200");
        v.put("innodb_flush_log_at_trx_commit", "1");
        v.put("slow_query_log", "OFF");
        v.put("long_query_time", "10.000000");
        v.put("innodb_print_all_deadlocks", "OFF");
        return v;
    }

    private static Reglage r(List<Reglage> l, String cle) {
        return l.stream().filter(x -> x.cle.equals(cle)).findFirst().orElseThrow();
    }

    @Test
    void budgetsSelonLaMemoire() {
        assertEquals(3 * GO, ReglagesServeur.heapConseille(12 * GO));
        assertEquals(6 * GO, ReglagesServeur.heapConseille(32 * GO));
        assertEquals(4 * GO, ReglagesServeur.bufferPoolConseille(12 * GO));
        assertEquals(11 * GO, ReglagesServeur.bufferPoolConseille(32 * GO));
        assertEquals(1 * GO, ReglagesServeur.bufferPoolConseille(4 * GO));
        assertEquals(50, ReglagesServeur.poolConseille(true));
        assertEquals(32, ReglagesServeur.poolConseille(false));
        /* 20 postes, chacun son Payara : 19 caisses x 32 + serveur 50 + marge 50 */
        assertEquals(708, ReglagesServeur.connexionsMariadb(20));
        assertEquals(164, ReglagesServeur.connexionsMariadb(3));
        assertEquals(151, ReglagesServeur.connexionsMariadb(1));
    }

    @Test
    void configurationDesOfficinesSur12Go() {
        List<Reglage> l = ReglagesServeur.comparer(12 * GO, 16, 3 * GO, myIniOfficine(), 4, 50);
        assertEquals(Niveau.CRITIQUE, r(l, "innodb_log_buffer_size").niveau, "2 Go de journal en mémoire");
        assertEquals("innodb_log_buffer_size=64M", r(l, "innodb_log_buffer_size").ligne);
        assertEquals(Niveau.OK, r(l, "innodb_buffer_pool_size").niveau, "3500M pour 4 Go conseillés");
        assertEquals(Niveau.A_AJUSTER, r(l, "max_allowed_packet").niveau);
        assertEquals(Niveau.A_AJUSTER, r(l, "thread_cache_size").niveau);
        assertEquals(Niveau.OK, r(l, "innodb_flush_log_at_trx_commit").niveau);
        assertEquals(Niveau.A_AJUSTER, r(l, "slow_query_log").niveau);
        assertEquals(Niveau.A_AJUSTER, r(l, "long_query_time").niveau);
        assertEquals(Niveau.OK, r(l, "Xmx").niveau);
        assertEquals(Niveau.OK, r(l, "max_connections").niveau, "251 pour 4 postes");
        String bloc = ReglagesServeur.blocMyIni(l);
        assertTrue(bloc.startsWith("[mysqld]\n") && bloc.contains("innodb_buffer_pool_size=4G")
                && bloc.contains("slow_query_log=1"), bloc);
    }

    @Test
    void posteDeCaisseSansMariadb() {
        List<Reglage> l = ReglagesServeur.comparer(8 * GO, 8, 2 * GO, new HashMap<>(), 4, 32, false, false);
        assertTrue(l.stream().noneMatch(x -> "MARIADB".equals(x.domaine)),
                "les réglages de MariaDB ne concernent que le serveur");
        assertEquals(Niveau.OK, r(l, "max-pool-size").niveau);
        assertEquals("32", r(l, "max-pool-size").conseille);
    }

    @Test
    void vingtPostesDemandentPlusDeConnexions() {
        assertEquals(Niveau.A_AJUSTER,
                r(ReglagesServeur.comparer(12 * GO, 16, 3 * GO, myIniOfficine(), 20, 50), "max_connections").niveau);
    }

    @Test
    void serveurJavaTropPetit() {
        List<Reglage> l = ReglagesServeur.comparer(12 * GO, 16, 1 * GO, myIniOfficine(), 10, 20);
        assertEquals(Niveau.CRITIQUE, r(l, "Xmx").niveau);
        assertEquals(Niveau.A_AJUSTER, r(l, "max-pool-size").niveau);
    }

    @Test
    void octetsEtTailles() {
        assertEquals(3500 * MO, ReglagesServeur.octets("3500M"));
        assertEquals(2 * GO, ReglagesServeur.octets("2G"));
        assertEquals(10, ReglagesServeur.octets("10.000000"));
        assertEquals(-1, ReglagesServeur.octets("abc"));
        assertEquals("3,4 Go", ReglagesServeur.taille(3500 * MO));
        assertEquals("64 Mo", ReglagesServeur.taille(64 * MO));
    }
}
