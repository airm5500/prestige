package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PilotageChargesTest {

    @Test
    void resultatNetEtTaux() {
        double[] r = PilotageCharges.resultat(1_000_000, 650_000, 5_000_000);
        assertEquals(350_000, r[0], 0.001);
        assertEquals(7.0, r[1], 0.001);
        double[] perte = PilotageCharges.resultat(200_000, 500_000, 4_000_000);
        assertEquals(-300_000, perte[0], 0.001);
        assertEquals(-7.5, perte[1], 0.001);
        assertTrue(Double.isNaN(PilotageCharges.resultat(0, 100, 0)[1]));
    }

    @Test
    void controleDesSaisies() {
        assertNull(PilotageCharges.controler(2026, 9, "LOYER", 250_000L));
        assertNull(PilotageCharges.controler(2026, 9, "LOYER", null));
        assertEquals("Mois invalide.", PilotageCharges.controler(2026, 13, "LOYER", 1L));
        assertEquals("Catégorie de charge inconnue.", PilotageCharges.controler(2026, 9, "X'; DROP", 1L));
        assertEquals("Montant invalide.", PilotageCharges.controler(2026, 9, "LOYER", -5L));
    }
}
