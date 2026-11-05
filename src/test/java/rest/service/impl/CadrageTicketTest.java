package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

import org.junit.jupiter.api.Test;

/** Retour du 05/11 : le ticket est centre dans la zone imprimable du pilote, reduit s'il est plus large. */
class CadrageTicketTest {

    @Test
    void centreSiLeTicketTient() {
        assertArrayEquals(new double[] { 1, 10 }, ImpressionServiceImpl.cadrage(200, 220), 1e-9);
    }

    @Test
    void reduitSiLaZoneEstPlusEtroite() {
        assertArrayEquals(new double[] { 0.9, 0 }, ImpressionServiceImpl.cadrage(200, 180), 1e-9);
    }

    @Test
    void zoneInconnueSansChangement() {
        assertArrayEquals(new double[] { 1, 0 }, ImpressionServiceImpl.cadrage(200, 0), 1e-9);
    }
}
