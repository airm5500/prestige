package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/**
 * Journaux du 13/10 : « Archivage PDF de la valorisation : aucun passage trouve » toutes les heures, alors que ce job
 * ne tourne que du 27 au 3 et n'avait simplement pas encore eu de jour d'archivage. Un job jamais passe n'est en retard
 * qu'une fois son delai tolere ecoule depuis le premier constat de son absence.
 */
class JobJamaisPasseTest {

    private static final LocalDateTime MAINTENANT = LocalDateTime.of(2026, 10, 13, 10, 10);
    private static final long TRENTE_CINQ_JOURS = 50400;

    @Test
    void jamaisPasseMaisDelaiPasEncoreEcouleDepuisLePremierConstat() {
        assertNull(SupportJobMonitor.retard(null, MAINTENANT.minusDays(2), MAINTENANT, TRENTE_CINQ_JOURS));
        // tout premier constat : pas d'alerte
        assertNull(SupportJobMonitor.retard(null, MAINTENANT, MAINTENANT, TRENTE_CINQ_JOURS));
    }

    @Test
    void jamaisPasseDepuisPlusQueLeDelaiTolere() {
        assertEquals("aucun passage depuis le 07/09/2026 (premier constat)",
                SupportJobMonitor.retard(null, MAINTENANT.minusDays(36), MAINTENANT, TRENTE_CINQ_JOURS));
    }

    @Test
    void passageAncienResteSignaleCommeAvant() {
        assertEquals("dernier passage il y a 841 h",
                SupportJobMonitor.retard(MAINTENANT.minusHours(841), null, MAINTENANT, TRENTE_CINQ_JOURS));
        assertNull(SupportJobMonitor.retard(MAINTENANT.minusHours(2), null, MAINTENANT, TRENTE_CINQ_JOURS));
    }
}
