package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regles d'alerte du pool de connexions.
 *
 * <p>
 * Ces regles decident quand signaler au support. Elles doivent alerter sur un vrai ralentissement, et se taire le reste
 * du temps : une alerte quotidienne sans objet serait ignoree le jour ou elle compte.
 */
class SupportPoolMonitorTest {

    private static Map<String, Object> stats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("numconnused", "32");
        stats.put("waitqueuelength", "7");
        return stats;
    }

    @Test
    @DisplayName("Une obtention rapide ne declenche rien")
    void obtentionRapide() {
        assertNull(SupportPoolMonitor.evaluerAttente(3, 2000, stats()));
        assertNull(SupportPoolMonitor.evaluerAttente(1999, 2000, stats()));
    }

    @Test
    @DisplayName("Une mesure manquante ne declenche rien : on ne signale pas ce qu'on n'a pas mesure")
    void mesureManquante() {
        assertNull(SupportPoolMonitor.evaluerAttente(-1, 2000, stats()));
        assertNull(SupportPoolMonitor.evaluerDormantes(-1, 20, 60));
    }

    @Test
    @DisplayName("Au-dela du seuil, l'alerte porte la duree, la conduite a tenir et les compteurs du pool")
    void obtentionLente() {
        SupportPoolMonitor.Alerte a = SupportPoolMonitor.evaluerAttente(4500, 2000, stats());
        assertNotNull(a);
        assertEquals("POOL_ATTENTE", a.code);
        assertEquals(dal.ApplicationEvent.NIVEAU_WARN, a.niveau);
        assertTrue(a.detail.contains("4500 ms"), a.detail);
        assertTrue(a.detail.contains("max-pool-size"), a.detail);
        assertTrue(a.detail.contains("waitqueuelength = 7"), a.detail);
    }

    @Test
    @DisplayName("Une attente tres au-dela du seuil passe en erreur, pas en simple avertissement")
    void obtentionTresLente() {
        SupportPoolMonitor.Alerte a = SupportPoolMonitor.evaluerAttente(10000, 2000, stats());
        assertNotNull(a);
        assertEquals(dal.ApplicationEvent.NIVEAU_ERROR, a.niveau);
    }

    @Test
    @DisplayName("L'alerte reste lisible quand les compteurs JMX sont absents")
    void sansCompteursJmx() {
        SupportPoolMonitor.Alerte a = SupportPoolMonitor.evaluerAttente(4500, 2000, Collections.emptyMap());
        assertNotNull(a);
        assertTrue(a.detail.contains("4500 ms"), a.detail);
    }

    @Test
    @DisplayName("Les connexions dormantes n'alertent qu'au-dela du seuil, et nomment ou chercher")
    void dormantes() {
        assertNull(SupportPoolMonitor.evaluerDormantes(19, 20, 60));
        SupportPoolMonitor.Alerte a = SupportPoolMonitor.evaluerDormantes(45, 20, 60);
        assertNotNull(a);
        assertEquals("POOL_DORMANTES", a.code);
        assertTrue(a.detail.contains("45 connexion"), a.detail);
        assertTrue(a.detail.contains("60 minute"), a.detail);
        assertTrue(a.detail.contains("jconnexion"), a.detail);
    }

    @Test
    @DisplayName("Les fils HTTP n'alertent que lorsqu'ils sont TOUS occupes")
    void filsHttp() {
        assertNull(SupportPoolMonitor.evaluerFilsHttp(4, 5));
        assertNull(SupportPoolMonitor.evaluerFilsHttp(0, 0));
        SupportPoolMonitor.Alerte a = SupportPoolMonitor.evaluerFilsHttp(5, 5);
        assertNotNull(a);
        assertEquals("HTTP_FILS_SATURES", a.code);
        assertEquals(dal.ApplicationEvent.NIVEAU_ERROR, a.niveau);
        assertTrue(a.detail.contains("5 fil(s)"), a.detail);
        assertTrue(a.detail.contains("max-thread-pool-size"), a.detail);
    }

    @Test
    @DisplayName("Le comptage des fils HTTP rend toujours deux valeurs coherentes")
    void comptageDesFils() {
        java.util.Map<String, Object> m = SupportPoolMonitor.filsHttp();
        int total = (Integer) m.get("filsHttpTotal");
        int occupes = (Integer) m.get("filsHttpOccupes");
        assertTrue(total >= 0);
        assertTrue(occupes >= 0 && occupes <= total);
    }
}
