package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/**
 * Rapport du 26/10 (S1) : la cle « crash-<heure du dernier battement> » ne portait pas le poste ; deux caisses arretees
 * dans la meme fenetre de 2 min se fondaient en un seul evenement.
 */
class SupportWatchdogCleTest {

    private static final LocalDateTime BATTEMENT = LocalDateTime.of(2026, 10, 22, 2, 34);

    @Test
    void leNomDuPosteFaitPartieDeLaCle() {
        assertEquals("crash-CAISSE31-20261022023400", SupportWatchdog.cleCrash("CAISSE31", BATTEMENT));
    }

    @Test
    void deuxPostesMemeMinuteDeuxCles() {
        assertNotEquals(SupportWatchdog.cleCrash("CAISSE31", BATTEMENT),
                SupportWatchdog.cleCrash("CAISSE4", BATTEMENT));
    }

    @Test
    void posteInconnu() {
        assertEquals("crash-?-20261022023400", SupportWatchdog.cleCrash(null, BATTEMENT));
    }
}
