package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

public class TelephoneCiTest {

    @Test
    public void numerosConformesNormalises() {
        for (String s : new String[] { "0708473750", "07 08 47 37 50", "+225 07 08 47 37 50", "2250708473750",
                "00225 07-08-47-37-50", "07.08.47.37.50", "(07) 08 47 37 50" }) {
            TelephoneCi.Resultat r = TelephoneCi.controler(s);
            assertTrue(r.isValide(), s);
            assertEquals("0708473750", r.getLocal(), s);
            assertEquals("2250708473750", r.getInternational(), s);
            assertEquals("", r.getMotif(), s);
        }
        assertTrue(TelephoneCi.controler("0102030405").isValide());
        assertTrue(TelephoneCi.controler("0501020304").isValide());
    }

    @Test
    public void numerosNonConformesAvecMotif() {
        assertEquals("Numéro absent", TelephoneCi.controler(null).getMotif());
        assertEquals("Numéro absent", TelephoneCi.controler("   ").getMotif());
        assertEquals("Nombre de chiffres incorrect (5)", TelephoneCi.controler("12345").getMotif());
        assertEquals("Caractères non numériques", TelephoneCi.controler("pas de numero").getMotif());
        assertEquals("Numéro fixe (non mobile)", TelephoneCi.controler("2722334455").getMotif());
        assertEquals("Nombre de chiffres incorrect (9)", TelephoneCi.controler("070847375").getMotif());
        assertEquals("Ancien format à 8 chiffres", TelephoneCi.controler("08473750").getMotif());
        assertEquals("Préfixe non mobile (09)", TelephoneCi.controler("0908473750").getMotif());
        assertFalse(TelephoneCi.controler("2250708473750X").isValide());
    }

    @Test
    public void localOuSaisieNeCasseJamaisLEnvoi() {
        assertEquals("0708473750", TelephoneCi.localOuSaisie("+225 07 08 47 37 50"));
        assertEquals("08473750", TelephoneCi.localOuSaisie("08473750"));
    }
}
