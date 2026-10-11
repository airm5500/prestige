package com.prestige.etiquettage.catalogue;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.prestige.etiquettage.catalogue.Champ.Type;
import org.junit.jupiter.api.Test;

class ControlesTest {

    static final Champ CIP = new Champ("cip", "CIP", Type.CODE, 13, true, true, true, 1);
    static final Champ EAN = new Champ("ean", "EAN", Type.CODE, 14, false, true, false, 6);
    static final Champ DES = new Champ("designation", "Désignation", Type.TEXTE, 100, true, true, true, 2);
    static final Champ PRIX = new Champ("prix", "Prix", Type.PRIX, null, false, true, true, 3);
    static final Champ PER = new Champ("peremption", "Péremption", Type.DATE, null, false, true, true, 5);
    static final Champ NB = new Champ("nombre", "Nombre d'étiquettes", Type.ENTIER, null, false, true, false, 10);
    static final Champ RAYON = new Champ("rayon", "Rayon", Type.TEXTE, 30, false, false, true, 100);

    static String ok(Champ c, String v) {
        Controles.Resultat r = Controles.controler(c, v);
        assertTrue(r.ok(), () -> v + " -> " + r.erreur());
        return r.valeur();
    }

    static String erreur(Champ c, String v) {
        Controles.Resultat r = Controles.controler(c, v);
        assertFalse(r.ok(), () -> v + " accepté : " + r.valeur());
        return r.erreur();
    }

    @Test
    void cip() {
        assertEquals("3400930000014", ok(CIP, " 3400930000014 "));
        assertEquals("3529422", ok(CIP, "3529422"));
        assertEquals("3400930000014", ok(CIP, "3400930000014.0"), "nombre lu dans un tableur");
        assertEquals("CIP 340093 : 6 chiffres (7 ou 13 attendus).", erreur(CIP, "340093"));
        assertTrue(erreur(CIP, "34009A").contains("chiffres seulement"));
        assertEquals("CIP obligatoire.", erreur(CIP, "  "));
    }

    @Test
    void ean() {
        assertEquals("3400935294227", ok(EAN, "3400935294227"));
        assertTrue(erreur(EAN, "3400935294228").contains("clé de contrôle"));
        assertTrue(erreur(EAN, "34009").contains("8, 13 ou 14"));
        assertNull(ok(EAN, ""), "facultatif");
    }

    @Test
    void texte() {
        assertEquals("DOLIPRANE 1000MG CPR B/8", ok(DES, "  doliprane   1000mg cpr b/8 "));
        assertTrue(erreur(DES, "x".repeat(101)).contains("101 caractères, 100 au plus"));
        assertEquals("b-04", ok(RAYON, "b-04"), "pas de majuscules forcées hors désignation");
        assertTrue(erreur(DES, "abc\u0007").contains("caractère de contrôle"));
    }

    @Test
    void prix() {
        assertEquals("1250", ok(PRIX, "1 250"));
        assertEquals("1250", ok(PRIX, "1250 F"));
        assertEquals("1250", ok(PRIX, "1 250 FCFA"));
        assertEquals("1250", ok(PRIX, "1250,00"));
        assertEquals("1250", ok(PRIX, "1 250"));
        assertTrue(erreur(PRIX, "12,50").contains("entier"));
        assertTrue(erreur(PRIX, "-5").contains("négatif"));
        assertTrue(erreur(PRIX, "douze").contains("nombre attendu"));
    }

    @Test
    void dates() {
        assertEquals("31/12/2027", ok(PER, "31/12/2027"));
        assertEquals("05/03/2027", ok(PER, "5.3.27"));
        assertEquals("31/12/2027", ok(PER, "2027-12-31"));
        assertEquals("31/12/2027", ok(PER, "2027-12-31T00:00:00"));
        assertEquals("28/02/2027", ok(PER, "02/2027"), "mois/année : fin du mois");
        assertEquals("29/02/2028", ok(PER, "02/2028"), "année bissextile");
        assertEquals("Date invalide : février n'a pas de 31. Format jj/mm/aaaa.", erreur(PER, "31/02/2027"));
        assertEquals("Date invalide : avril n'a pas de 31. Format jj/mm/aaaa.", erreur(PER, "31/04/2027"));
        assertEquals("Date invalide : février n'a pas de 29. Format jj/mm/aaaa.", erreur(PER, "29/02/2027"));
        assertTrue(erreur(PER, "12/13/2027").contains("mois 13"));
        assertTrue(erreur(PER, "demain").contains("format jj/mm/aaaa"));
    }

    @Test
    void nombreEtiquettes() {
        assertEquals("3", ok(NB, "3"));
        assertTrue(erreur(NB, "0").contains("de 1 à 999"));
        assertTrue(erreur(NB, "1000").contains("de 1 à 999"));
    }
}
