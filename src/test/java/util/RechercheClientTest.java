package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

/** Retours du 13/10 (point 11) : recherche client « commence par » / « contient », numero avec ou sans separateurs. */
class RechercheClientTest {

    @Test
    void commenceParParDefaut() {
        assertEquals("KOUA%", RechercheClient.motif("  KOUA ", null));
        assertEquals("KOUA%", RechercheClient.motif("KOUA", "commence"));
    }

    @Test
    void contient() {
        assertEquals("%ASSI%", RechercheClient.motif("ASSI", "contient"));
    }

    @Test
    void unJokerTapeResteUnJokerCommeAvant() {
        assertEquals("%ASSI%", RechercheClient.motif("%ASSI", null));
    }

    @Test
    void numeroAvecOuSansSeparateurs() {
        assertEquals("0708091011", RechercheClient.chiffres("07 08 09 10 11"));
        assertEquals("0708%", RechercheClient.motifChiffres("07.08", null));
        assertEquals("%0910%", RechercheClient.motifChiffres("09-10", "contient"));
        assertNull(RechercheClient.chiffres("KOUASSI"));
        assertNull(RechercheClient.chiffres("12"));
    }
}
