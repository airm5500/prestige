package rest.report.pdf;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class Gs1Test {

    /** EAN-13 valable : 340093000010 + cle 6. */
    private static final String EAN = "3400930000106";

    @Test
    void gtinAvecCleDeControle() {
        assertEquals("03400930000106", Gs1.gtin14(EAN));
        assertNull(Gs1.gtin14("3400930000105")); // cle fausse : pas de (01)
        assertNull(Gs1.gtin14("ABC"));
        assertNull(Gs1.gtin14(null));
        assertEquals("00000040170725", Gs1.gtin14("40170725")); // EAN-8
    }

    @Test
    void chaineBruteOrdreEtSeparateur() {
        String b = Gs1.brute(EAN, LocalDate.of(2027, 1, 31), "LOT-A1", "3400930");
        assertEquals("01034009300001061727013110LOT-A1" + Gs1.GS + "2403400930", b);
        assertEquals("(01)03400930000106(17)270131(10)LOT-A1(240)3400930", Gs1.lisible(b));
        /* lot en dernier : pas de separateur final */
        assertEquals("0103400930000106172701311012345", Gs1.brute(EAN, LocalDate.of(2027, 1, 31), "12345", null));
        /* EAN invalide et pas de peremption : seulement le CIP */
        assertEquals("2408050457", Gs1.brute("123", null, null, "8050457"));
        assertEquals("", Gs1.brute(null, null, " ", ""));
    }

    @Test
    void caracteresHorsJeuGs1Retires() {
        assertEquals("10LOTe1", Gs1.brute(null, null, "LOT é1\t", null)); // accent retire, espace et tabulation hors
                                                                          // jeu GS1
        assertEquals(20, Gs1.brute(null, null, "123456789012345678901234", null).length() - 2);
    }

    @Test
    void lectureFormesDeDouchette() {
        String b = Gs1.brute(EAN, LocalDate.of(2027, 1, 31), "LOT-A1", "3400930");
        for (String saisie : new String[] { b, "]d2" + b, "]Q3" + b, b.replace(String.valueOf(Gs1.GS), "<GS>"),
                b.replace(String.valueOf(Gs1.GS), "|"), "(01)03400930000106(17)270131(10)LOT-A1(240)3400930" }) {
            Gs1.Contenu c = Gs1.lire(saisie);
            assertEquals("03400930000106", c.gtin, saisie);
            assertEquals(LocalDate.of(2027, 1, 31), c.peremption, saisie);
            assertEquals("LOT-A1", c.lot, saisie);
            assertEquals("3400930", c.cip, saisie);
            assertTrue(Gs1.estGs1(saisie), saisie);
        }
        assertEquals(EAN, Gs1.ean13("03400930000106"));
    }

    @Test
    void jourZeroDernierJourDuMois() {
        assertEquals(LocalDate.of(2028, 2, 29), Gs1.lire("17280200").peremption);
        assertNull(Gs1.lire("17281340").peremption); // mois 13 : ignore
    }

    @Test
    void unCipOuUnEanSeulNEstPasDuGs1() {
        assertFalse(Gs1.estGs1("8050457"));
        assertFalse(Gs1.estGs1(EAN));
        assertFalse(Gs1.estGs1("DOLIPRANE"));
        assertFalse(Gs1.estGs1(null));
        assertTrue(Gs1.estGs1("2408050457" + Gs1.GS + "17270131")); // CIP + peremption
    }

    @Test
    void motsDeCodeDataMatrix() {
        List<Integer> m = Gs1DataMatrix.motsDeCode("01034009" + Gs1.GS + "A");
        assertEquals(232, (int) m.get(0)); // FNC1 en tete : symbole GS1
        assertEquals(131, (int) m.get(1)); // "01" -> 130 + 1
        assertEquals(133, (int) m.get(2)); // "03"
        assertEquals(170, (int) m.get(3)); // "40"
        assertEquals(139, (int) m.get(4)); // "09"
        assertEquals(30, (int) m.get(5)); // GS -> 29 + 1
        assertEquals(66, (int) m.get(6)); // 'A' -> 65 + 1
    }

    @Test
    void matriceDataMatrixAvecMotifsDeReperage() {
        boolean[][] m = Gs1DataMatrix.matrice(Gs1.brute(EAN, LocalDate.of(2027, 1, 31), "LOT-A1", "3400930"));
        assertEquals(22, m.length); // 22 x 22 : une seule region
        assertEquals(22, m[0].length);
        for (int i = 0; i < 22; i++) {
            assertTrue(m[i][0], "bord gauche plein");
            assertTrue(m[21][i], "bord bas plein");
            assertEquals(i % 2 == 0, m[0][i], "bord haut alterne");
        }
        /* contenu long : plusieurs regions de donnees (36 x 36), chaque region bordee */
        boolean[][] g = Gs1DataMatrix.matrice(
                Gs1.brute(EAN, LocalDate.of(2028, 12, 5), "ABCDEFGHIJ-KLMNOPQRS", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcd"));
        assertEquals(36, g.length);
        assertTrue(g[17][5] && g[17][30], "bas de la premiere rangee de regions plein");
        assertTrue(g[5][18], "gauche de la deuxieme colonne de regions plein");
    }

    @Test
    void typeDeCode() {
        assertEquals(LabelSheetPdf.QR, LabelSheetPdf.typeCode("qr"));
        assertEquals(LabelSheetPdf.DATAMATRIX, LabelSheetPdf.typeCode(" DataMatrix "));
        assertEquals(LabelSheetPdf.CODE_BARRES, LabelSheetPdf.typeCode(null));
        assertEquals(LabelSheetPdf.CODE_BARRES, LabelSheetPdf.typeCode("autre"));
    }

    @Test
    void codeDEtiquetteCinqCaracteresSansConfusion() {
        java.util.Random r = new java.util.Random(7);
        java.util.Set<String> vus = new java.util.HashSet<>();
        for (int i = 0; i < 2000; i++) {
            String c = EtiquetteEditionService.tirerCode(r);
            assertTrue(c.matches("[A-HJ-NP-Z2-9]{5}"), c); // ni 0 / O, ni 1 / I
            vus.add(c);
        }
        assertTrue(vus.size() > 1990, "tirages varies : " + vus.size());
    }
}
