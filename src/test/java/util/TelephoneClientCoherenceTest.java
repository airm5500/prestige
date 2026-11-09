package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan avoir du 08/11, point 4 : le numero d'un client se lit dans str_TELEPHONE, sinon dans str_ADRESSE s'il y porte
 * un numero valide. Cas types, puis 20 000 fiches tirees au hasard (graine fixe) verifiees par les regles.
 */
class TelephoneClientCoherenceTest {

    @Test
    void casTypes() {
        /* telephone seul */
        assertEquals("0708473750", TelephoneClient.controler("07 08 47 37 50", null).getLocal());
        assertEquals("0708473750", TelephoneClient.affiche("+225 0708473750", ""));
        /* adresse seule (fiches non reprises) */
        assertEquals("0102030405", TelephoneClient.controler(null, "0102030405").getLocal());
        assertEquals("0102030405", TelephoneClient.affiche("", "01.02.03.04.05"));
        /* les deux : le telephone l'emporte */
        assertEquals("0708473750", TelephoneClient.controler("0708473750", "0102030405").getLocal());
        /* telephone invalide, adresse valide : l'adresse sert */
        assertEquals("0102030405", TelephoneClient.controler("12345", "0102030405").getLocal());
        /* aucun */
        assertFalse(TelephoneClient.controler(null, null).isValide());
        assertEquals("", TelephoneClient.affiche(null, null));
        /* adresse non numerique : jamais montree pour un numero */
        assertFalse(TelephoneClient.controler("", "Cocody, rue des jardins").isValide());
        assertEquals("", TelephoneClient.affiche("", "Cocody, rue des jardins"));
        /* telephone saisi invalide : montre tel quel, refuse */
        assertEquals("12345", TelephoneClient.affiche("12345", "Cocody"));
        assertFalse(TelephoneClient.controler("12345", "Cocody").isValide());
        /* fixe, ancien format : refuses */
        assertFalse(TelephoneClient.controler("2722445566", null).isValide());
        assertFalse(TelephoneClient.controler("08473750", null).isValide());
    }

    private static String mobile(Random r) {
        StringBuilder s = new StringBuilder(new String[] { "01", "05", "07" }[r.nextInt(3)]);
        for (int i = 0; i < 8; i++) {
            s.append(r.nextInt(10));
        }
        return s.toString();
    }

    /** Un champ tire au hasard : vide, numero valide sous diverses formes, numero invalide, adresse postale. */
    private static String champ(Random r) {
        String m = mobile(r);
        switch (r.nextInt(9)) {
        case 0:
            return null;
        case 1:
            return "";
        case 2:
            return m;
        case 3:
            return "+225 " + m.substring(0, 2) + " " + m.substring(2, 4) + " " + m.substring(4, 6) + " "
                    + m.substring(6, 8) + " " + m.substring(8);
        case 4:
            return "00225" + m;
        case 5:
            return m.substring(2); /* ancien format a 8 chiffres */
        case 6:
            return "27" + m.substring(2); /* fixe */
        case 7:
            return "Quartier " + r.nextInt(100) + ", lot " + m.substring(6);
        default:
            return m.substring(0, 2 + r.nextInt(7)); /* trop court */
        }
    }

    @Test
    void reglesSurDesFichesAuHasard() {
        Random r = new Random(20261108L);
        int telephone = 0, adresse = 0, aucun = 0;
        for (int i = 0; i < 20000; i++) {
            String t = champ(r), a = champ(r);
            TelephoneCi.Resultat ct = TelephoneCi.controler(t), ca = TelephoneCi.controler(a);
            TelephoneCi.Resultat x = TelephoneClient.controler(t, a);
            String vu = TelephoneClient.affiche(t, a);
            if (ct.isValide()) {
                telephone++;
                assertTrue(x.isValide());
                assertEquals(ct.getLocal(), x.getLocal(), "le telephone l'emporte : " + t + " / " + a);
            } else if (ca.isValide()) {
                adresse++;
                assertTrue(x.isValide());
                assertEquals(ca.getLocal(), x.getLocal(), "a defaut, l'adresse : " + t + " / " + a);
            } else {
                aucun++;
                assertFalse(x.isValide(), t + " / " + a);
            }
            /* joignable <=> affiche un numero local a 10 chiffres, celui retenu */
            assertEquals(x.isValide(), vu.matches("0[157]\\d{8}") && vu.equals(x.getLocal()),
                    t + " / " + a + " -> " + vu);
            /* jamais une adresse postale a l'ecran */
            assertTrue(vu.isEmpty() || vu.equals(t == null ? "" : t.trim()) || vu.matches("[0-9+ ().-]+"), vu);
            assertFalse(vu.matches(".*[A-Za-z].*") && !vu.equals(t == null ? "" : t.trim()), vu);
        }
        /* les trois branches ont ete parcourues abondamment */
        assertTrue(telephone > 3000 && adresse > 1500 && aucun > 3000, telephone + "/" + adresse + "/" + aucun);
    }
}
