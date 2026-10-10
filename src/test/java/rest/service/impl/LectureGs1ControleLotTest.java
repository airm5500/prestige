package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.report.pdf.Gs1;

/** Retours du 10/10 : controle du lot de la boite scannee contre le lot que Prestige sort (le plus proche). */
class LectureGs1ControleLotTest {

    private static Gs1.Contenu lu(String lot, LocalDate peremption) {
        Gs1.Contenu c = new Gs1.Contenu();
        c.lot = lot;
        c.peremption = peremption;
        return c;
    }

    private static String controle(Gs1.Contenu c, Object[] prevu) {
        return LectureGs1Service.controlerLot(new JSONObject(), c, prevu).getString("controle");
    }

    @Test
    void memeLotConforme() {
        JSONObject o = LectureGs1Service.controlerLot(new JSONObject(), lu("LOT-A1", LocalDate.of(2027, 1, 31)),
                new Object[] { "31/01/2027", "LOT-A1", "12" });
        assertEquals("CONFORME", o.getString("controle"));
        assertEquals("LOT-A1", o.getString("lotPrevu"));
        assertEquals("31/01/2027", o.getString("peremptionPrevue"));
        /* casse et espaces ignores */
        assertEquals("CONFORME", controle(lu("lot a1", null), new Object[] { "", "LOTA1", "" }));
    }

    @Test
    void autreLotDifferentMemeAvecLaMemeDate() {
        assertEquals("DIFFERENT",
                controle(lu("LOT-B2", LocalDate.of(2027, 1, 31)), new Object[] { "31/01/2027", "LOT-A1", "12" }));
    }

    @Test
    void sansLotOnComparePeremption() {
        assertEquals("CONFORME", controle(lu(null, LocalDate.of(2027, 1, 31)), new Object[] { "31/01/2027", "", "" }));
        assertEquals("DIFFERENT",
                controle(lu(null, LocalDate.of(2028, 3, 1)), new Object[] { "31/01/2027", "LOT-A1", "5" }));
        assertEquals("DIFFERENT",
                controle(lu("LOT-B2", LocalDate.of(2028, 3, 1)), new Object[] { "31/01/2027", "", "" }));
    }

    @Test
    void rienAComparer() {
        assertEquals("INCONNU", controle(lu("LOT-A1", null), new Object[] { "", "", "" }));
        assertEquals("INCONNU", controle(lu(null, null), new Object[] { "31/01/2027", "LOT-A1", "5" }));
        assertEquals("INCONNU", controle(lu("LOT-A1", null), null));
    }

    @Test
    void modeDeControle() {
        assertEquals("A", LectureGs1Service.mode(null));
        assertEquals("A", LectureGs1Service.mode(""));
        assertEquals("A", LectureGs1Service.mode("a"));
        assertEquals("B", LectureGs1Service.mode(" b "));
        assertEquals("C", LectureGs1Service.mode("C"));
        assertEquals("A", LectureGs1Service.mode("X")); // valeur inconnue : avertir seulement (aucun blocage)
        assertEquals("A", LectureGs1Service.mode("1"));
    }
}
