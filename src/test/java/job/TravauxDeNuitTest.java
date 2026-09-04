package job;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Travaux de nuit d'une officine qui eteint son serveur : un traitement volontairement desactive ne doit plus etre
 * signale « en retard » toutes les heures, alors qu'un traitement reellement attendu doit continuer de l'etre.
 */
class TravauxDeNuitTest {

    @Test
    void jobDesactiveParSonParametreNestPlusSurveille() {
        assertTrue(SupportJobMonitor.jobSuspendu("KEY_VALORISATION_JOURNALIERE", "0"));
        assertTrue(SupportJobMonitor.jobSuspendu("KEY_VALORISATION_JOURNALIERE", " 0 "));
    }

    @Test
    void jobActifOuParametreIndetermineResteSurveille() {
        assertFalse(SupportJobMonitor.jobSuspendu("KEY_VALORISATION_JOURNALIERE", "1"));
        // Parametre absent de la base : on ne se tait pas sur une absence, seulement sur un refus explicite.
        assertFalse(SupportJobMonitor.jobSuspendu("KEY_VALORISATION_JOURNALIERE", null));
        assertFalse(SupportJobMonitor.jobSuspendu("KEY_VALORISATION_JOURNALIERE", ""));
        // Aucun interrupteur declare pour ce job : il reste surveille quoi qu'il arrive.
        assertFalse(SupportJobMonitor.jobSuspendu(null, "0"));
        assertFalse(SupportJobMonitor.jobSuspendu("", "0"));
    }
}
