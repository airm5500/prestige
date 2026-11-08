package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Regle du rafraichissement automatique (demande du 08/11), verifiee sur 20 000 cas tires (graine fixe) : delai 0 :
 * jamais ; jamais lue : due tout de suite (sauf essai recent) ; lecture complete plus vieille que le delai : due ;
 * apres un essai, jamais avant min(delai, 30 min) ; une liste due a l'instant t l'est encore plus tard (monotonie).
 */
class RafraichissementCoherenceTest {

    @Test
    void regleSurDesMilliersDeCas() {
        Random r = new Random(20261108);
        LocalDateTime base = LocalDateTime.of(2026, 11, 8, 6, 0);
        for (int i = 0; i < 20000; i++) {
            int delai = Rafraichissement.DELAIS.get(r.nextInt(Rafraichissement.DELAIS.size()));
            LocalDateTime complete = r.nextInt(5) == 0 ? null : base.minusMinutes(r.nextInt(3000));
            LocalDateTime essai = r.nextInt(4) == 0 ? null
                    : complete != null && r.nextBoolean() ? complete : base.minusMinutes(r.nextInt(3000));
            LocalDateTime maintenant = base.plusMinutes(r.nextInt(120));
            boolean echue = Rafraichissement.echue(delai, complete, essai, maintenant);
            if (delai == 0) {
                assertFalse(echue, "delai 0 : jamais");
                assertNull(Rafraichissement.prochaine(delai, complete, essai));
                continue;
            }
            boolean vieille = complete == null || !complete.plusMinutes(delai).isAfter(maintenant);
            boolean essaiRecent = essai != null
                    && essai.plusMinutes(Math.min(delai, Rafraichissement.ATTENTE_APRES_ESSAI_MAX)).isAfter(maintenant);
            assertEquals(vieille && !essaiRecent, echue, "cas " + i + " delai " + delai);
            if (echue) {
                assertTrue(Rafraichissement.echue(delai, complete, essai, maintenant.plusMinutes(1 + r.nextInt(500))),
                        "monotonie");
            }
            if (essai != null) {
                assertFalse(Rafraichissement.echue(delai, complete, essai, essai.plusMinutes(Math.min(delai, 30) - 1)),
                        "jamais deux essais trop rapproches");
            }
        }
    }

    @Test
    void casLimites() {
        LocalDateTime t = LocalDateTime.of(2026, 11, 8, 12, 0);
        assertTrue(Rafraichissement.echue(60, null, null, t), "jamais lue : due");
        assertTrue(Rafraichissement.echue(60, t.minusMinutes(60), t.minusMinutes(60), t), "exactement le delai");
        assertFalse(Rafraichissement.echue(60, t.minusMinutes(59), t.minusMinutes(59), t));
        assertFalse(Rafraichissement.echue(1440, t.minusDays(2), t.minusMinutes(29), t), "echec il y a 29 min");
        assertTrue(Rafraichissement.echue(1440, t.minusDays(2), t.minusMinutes(30), t), "echec il y a 30 min");
        assertFalse(Rafraichissement.echue(30, null, t.minusMinutes(29), t));
        assertTrue(Rafraichissement.delaiValide(0));
        assertTrue(Rafraichissement.delaiValide(1440));
        assertFalse(Rafraichissement.delaiValide(1));
        assertFalse(Rafraichissement.delaiValide(-30));
        assertEquals(LocalDateTime.MIN, Rafraichissement.prochaine(60, null, null), "des que possible");
    }
}
