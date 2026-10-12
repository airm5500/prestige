package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** Rotation, taux de rupture et evolution du panier (besoins du 11/10, point 11). */
class PilotageKpiStockTest {

    @Test
    void rotationAnnualisee() {
        /* 1 000 000 de cout d'achat sur 30 jours, stock de 2 000 000 : 1 000 000 x 365 / 30 / 2 000 000 = 6,08 */
        assertEquals(6.08, PilotageService.rotation(1_000_000, 30, 2_000_000), 0.001);
        assertEquals(0, PilotageService.rotation(1_000_000, 30, 0), 0.001);
        assertEquals(0, PilotageService.rotation(1_000_000, 0, 10), 0.001);
    }

    @Test
    void tauxDeRupture() {
        /* 20 demandes ratees sur 980 lignes vendues : 20 / 1000 = 2 % */
        assertEquals(2.0, PilotageService.tauxRupture(980, 20), 0.001);
        assertEquals(0, PilotageService.tauxRupture(0, 0), 0.001);
        assertEquals(100, PilotageService.tauxRupture(0, 3), 0.001);
    }

    @Test
    void evolutionDuPanier() {
        assertEquals(10.0, PilotageService.evolution(3300, 3000), 0.001);
        assertEquals(-25.0, PilotageService.evolution(3000, 4000), 0.001);
        assertEquals(0, PilotageService.evolution(3000, 0), 0.001);
    }
}
