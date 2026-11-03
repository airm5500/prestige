package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

/** Audit 06, EN-06 : cas du rapport (le calcul d'avant donnait 1 454, -4 000 et 1 000). */
class PmpReceptionTest {

    @Test
    void ancienStockValoriseALAncienPmp() {
        /* 101 boites a un PMP de 1 004,95 ; dernier prix d'achat de la fiche 1 500 ; 10 recues a 1 000 */
        assertEquals(1005.0, PmpReception.calculer(101, 1004.95, 10, 0, 1000));
    }

    @Test
    void stockNegatifPasDePmpNegatif() {
        assertEquals(1000.0, PmpReception.calculer(-5, 2000, 6, 0, 1000));
    }

    @Test
    void ugACoutNul() {
        /* 10 payees a 1 000 + 2 UG, stock nul : 10 000 / 12 */
        assertEquals(833.0, PmpReception.calculer(0, 0, 12, 2, 1000));
        /* avec un ancien stock : (10 x 900 + 10 x 1 000) / (10 + 12) */
        assertEquals(864.0, PmpReception.calculer(10, 900, 12, 2, 1000));
    }

    @Test
    void rienNEntreLePmpNeChangePas() {
        assertNull(PmpReception.calculer(10, 900, 0, 0, 1000));
    }
}
