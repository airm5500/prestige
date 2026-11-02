package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/**
 * Rapport du 26/10, § 21, S7 : le temoin du chien de garde etait commun a toute la machine. Deux domaines Payara sur le
 * meme poste : l'un l'effacait a son arret propre, l'autre le reecrivait, et le premier croyait a un arret brutal en
 * redemarrant (66 faux « arret force ~0 min »). Un redeploiement, ou la JVM ne s'arrete pas, etait aussi pris pour un
 * arret brutal.
 */
class SupportWatchdogTemoinTest {

    @Test
    void unTemoinParDomaine() {
        assertEquals("heartbeat-domain1.flag",
                SupportWatchdog.nomTemoin("D:/payara5/payara5/glassfish/domains/domain1"));
        assertEquals("heartbeat-domain2.flag",
                SupportWatchdog.nomTemoin("D:/payara5/payara5/glassfish/domains/domain2/"));
        assertNotEquals(SupportWatchdog.nomTemoin("/opt/payara/domains/domain1"),
                SupportWatchdog.nomTemoin("/opt/payara/domains/domain2"));
    }

    @Test
    void sansDomaineConnuLAncienNom() {
        assertEquals("heartbeat.flag", SupportWatchdog.nomTemoin(null));
        assertEquals("heartbeat.flag", SupportWatchdog.nomTemoin("  "));
        assertEquals("heartbeat-dom_ain-1.flag", SupportWatchdog.nomTemoin("/x/dom ain-1"),
                "caracteres surs seulement");
    }

    @Test
    void jvmDemarreeAvantLeDernierBattementCEstUnRedeploiement() {
        LocalDateTime battement = LocalDateTime.of(2026, 11, 2, 14, 46);
        assertTrue(SupportWatchdog.redeploiement(battement.minusHours(3), battement));
        assertFalse(SupportWatchdog.redeploiement(battement.plusMinutes(1), battement), "JVM redemarree : vrai arret");
        assertFalse(SupportWatchdog.redeploiement(null, battement));
        assertFalse(SupportWatchdog.redeploiement(battement, null));
    }
}
