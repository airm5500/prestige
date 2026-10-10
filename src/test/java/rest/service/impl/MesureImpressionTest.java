package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Retours du 10/10 : mesure de l'impression des tickets, etape par etape. */
class MesureImpressionTest {

    @Test
    void detailParEtapeLaPlusLongueEnPremier() throws Exception {
        MesureImpression.demarrer("vente/ticket/vo");
        MesureImpression.imprimante("EPSON TM-T20 (réseau)");
        long t = System.nanoTime() - 300_000_000L;
        MesureImpression.etape(MesureImpression.RECHERCHE_IMPRIMANTE, t);
        MesureImpression.etape(MesureImpression.ENVOI_SPOULEUR, System.nanoTime() - 40_000_000L);
        MesureImpression.etape(MesureImpression.ENVOI_SPOULEUR, System.nanoTime() - 40_000_000L);
        MesureImpression m = MesureImpression.terminer();
        assertEquals("vente/ticket/vo", m.getLibelle());
        assertEquals("EPSON TM-T20 (réseau)", m.getImprimante());
        assertEquals(MesureImpression.RECHERCHE_IMPRIMANTE, m.etapeLaPlusLongue());
        assertTrue(m.dureeMs(MesureImpression.RECHERCHE_IMPRIMANTE) >= 300);
        assertTrue(m.dureeMs(MesureImpression.ENVOI_SPOULEUR) >= 80);
        String d = m.detail();
        assertTrue(d.startsWith("total "), d);
        assertTrue(d.indexOf("recherche de l'imprimante") < d.indexOf("envoi au spouleur"), d);
        assertTrue(d.contains("envoi au spouleur 0,") && d.contains("(2 fois)"), d);
        assertTrue(d.contains("lecture de la vente et mise en page"), d);
    }

    @Test
    void horsMesureRienNEstGarde() {
        MesureImpression.terminer();
        MesureImpression.etape(MesureImpression.ENVOI_SPOULEUR, System.nanoTime());
        MesureImpression.imprimante("x");
        assertNull(MesureImpression.terminer());
    }

    @Test
    void resteDominantQuandLaVenteEstLongueALire() throws Exception {
        MesureImpression.demarrer("vente/ticket/vno");
        MesureImpression.etape(MesureImpression.RECHERCHE_IMPRIMANTE, System.nanoTime());
        Thread.sleep(120);
        MesureImpression m = MesureImpression.terminer();
        assertEquals("lecture de la vente et mise en page", m.etapeLaPlusLongue());
    }
}
