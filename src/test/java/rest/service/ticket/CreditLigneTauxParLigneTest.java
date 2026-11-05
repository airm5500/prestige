package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

/**
 * Ticket 2912673621 du 05/11 : MUGEFCI 80 %, DOLIRHUME passe a 70 % a l'ecran de vente ; la part de l'organisme (5 148)
 * est juste, mais le ticket montrait « Taux 80 % » partout avec des montants au prorata (2 954, 2 042, 152).
 */
class CreditLigneTauxParLigneTest {

    @Test
    void chaqueLigneGardeSonTaux() {
        assertEquals(Arrays.asList(3108, 1880, 160),
                CreditLigne.parts(Arrays.asList(3885, 2685, 200), Arrays.asList(80, 70, 80), 5148));
    }

    @Test
    void sansTauxDeLigneRienNeChange() {
        assertEquals(CreditLigne.parts(Arrays.asList(6725, 3145), 70, 6909),
                CreditLigne.parts(Arrays.asList(6725, 3145), Arrays.asList(70, 70), 6909));
    }

    @Test
    void plafondToujoursRamenéAuTotal() {
        // plafond de l'organisme a 3 000 : les parts restent proportionnelles a base x taux de chaque ligne
        assertEquals(Arrays.asList(1811, 1096, 93),
                CreditLigne.parts(Arrays.asList(3885, 2685, 200), Arrays.asList(80, 70, 80), 3000));
    }
}
