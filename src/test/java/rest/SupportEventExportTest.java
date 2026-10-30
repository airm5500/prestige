package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dal.ApplicationEvent;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/**
 * Rapport du 26/10, § 19 (SC8) : l'export Excel du journal dit sur quelle version chaque evenement a ete vu en dernier.
 */
class SupportEventExportTest {

    @Test
    void colonneVersionEnFinDeFeuille() {
        String[] entetes = SupportEventRessource.ENTETES_EXPORT;
        assertEquals("Version", entetes[entetes.length - 1]);
        assertEquals("Détail (début)", entetes[entetes.length - 2]);
    }

    @Test
    void ligneAvecEtSansVersion() {
        ApplicationEvent e = new ApplicationEvent();
        e.setNiveau("ERROR");
        e.setOccurrences(3);
        e.setLastSeenAt(LocalDateTime.of(2026, 10, 30, 8, 7));
        e.setVersionApp("2026-10-29 04:34 UTC");
        String[] ligne = SupportEventRessource.ligneExport(e, "detail");
        assertEquals(SupportEventRessource.ENTETES_EXPORT.length, ligne.length);
        assertEquals("2026-10-29 04:34 UTC", ligne[ligne.length - 1]);
        assertEquals("detail", ligne[ligne.length - 2]);
        assertEquals("30/10/2026 08:07", ligne[1]);

        e.setVersionApp(null);
        assertEquals("", SupportEventRessource.ligneExport(e, "")[ligne.length - 1]);
    }
}
