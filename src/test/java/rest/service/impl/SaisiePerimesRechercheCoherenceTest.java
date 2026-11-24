package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Saisie des produits perimes (retour du 22/11, lot 11) : regles de la recherche des produits par l'API et du
 * signalement des lignes en attente depuis longtemps.
 * <ul>
 * <li>motif « commence par » : le motif LIKE construit reconnait un libelle si et seulement si le libelle commence par
 * le texte tape (espaces de bord retires), jokers % et _ et barre oblique inverse pris a la lettre ;</li>
 * <li>ligne ancienne : si et seulement si elle attend depuis plus de 30 jours (30 non, 31 oui, null non).</li>
 * </ul>
 * Cas tires au hasard, graine fixe.
 */
class SaisiePerimesRechercheCoherenceTest {

    private static final long GRAINE = 20261122L;
    private static final int CAS = 20000;
    private static final String ALPHABET = "ab_%\\ 3201Zé";

    /** Moteur LIKE de MariaDB pour l'echappement par defaut (\) : % = suite quelconque, _ = un caractere. */
    static boolean like(String texte, String motif) {
        return like(texte, 0, motif, 0);
    }

    private static boolean like(String t, int i, String m, int j) {
        if (j == m.length()) {
            return i == t.length();
        }
        char c = m.charAt(j);
        if (c == '\\' && j + 1 < m.length()) {
            return i < t.length() && t.charAt(i) == m.charAt(j + 1) && like(t, i + 1, m, j + 2);
        }
        if (c == '%') {
            for (int k = i; k <= t.length(); k++) {
                if (like(t, k, m, j + 1)) {
                    return true;
                }
            }
            return false;
        }
        if (c == '_') {
            return i < t.length() && like(t, i + 1, m, j + 1);
        }
        return i < t.length() && t.charAt(i) == c && like(t, i + 1, m, j + 1);
    }

    private static String mot(Random r, int max) {
        StringBuilder b = new StringBuilder();
        int n = r.nextInt(max + 1);
        for (int i = 0; i < n; i++) {
            b.append(ALPHABET.charAt(r.nextInt(ALPHABET.length())));
        }
        return b.toString();
    }

    @Test
    void motifCommencePar() {
        Random r = new Random(GRAINE);
        int oui = 0, non = 0, jokers = 0;
        for (int i = 0; i < CAS; i++) {
            String saisie = mot(r, 4);
            /* la moitie des libelles commencent par le texte tape, les autres sont quelconques */
            String libelle = r.nextBoolean() ? saisie.trim() + mot(r, 5) : mot(r, 8);
            boolean attendu = libelle.startsWith(saisie.trim());
            boolean vu = like(libelle, GestionPerimesServiceImpl.motifDebut(saisie));
            assertEquals(attendu, vu,
                    "« " + saisie + " » / « " + libelle + " » : " + GestionPerimesServiceImpl.motifDebut(saisie));
            if (attendu) {
                oui++;
            } else {
                non++;
            }
            if (saisie.contains("%") || saisie.contains("_")) {
                jokers++;
            }
        }
        /* jeu varie : des deux cas, et des jokers tapes */
        assertTrue(oui > CAS / 4 && non > CAS / 4 && jokers > CAS / 10, oui + " / " + non + " / " + jokers);
        /* bornes */
        assertEquals("%", GestionPerimesServiceImpl.motifDebut(null));
        assertEquals("%", GestionPerimesServiceImpl.motifDebut("   "));
        assertEquals("323201%", GestionPerimesServiceImpl.motifDebut(" 323201 "));
        assertFalse(like("3232019", GestionPerimesServiceImpl.motifDebut("32_2")));
        assertTrue(like("32_2X", GestionPerimesServiceImpl.motifDebut("32_2")));
    }

    @Test
    void ligneAncienne() {
        Random r = new Random(GRAINE + 1);
        int anciennes = 0;
        for (int i = 0; i < CAS; i++) {
            int j = r.nextInt(3) == 0 ? 28 + r.nextInt(5) : r.nextInt(4000);
            assertEquals(j > GestionPerimesServiceImpl.JOURS_ANCIENNE, GestionPerimesServiceImpl.ancienne(j),
                    "jours " + j);
            if (GestionPerimesServiceImpl.ancienne(j)) {
                anciennes++;
            }
        }
        assertTrue(anciennes > CAS / 3 && anciennes < CAS, String.valueOf(anciennes));
        assertFalse(GestionPerimesServiceImpl.ancienne(null));
        assertFalse(GestionPerimesServiceImpl.ancienne(0));
        assertFalse(GestionPerimesServiceImpl.ancienne(30));
        assertTrue(GestionPerimesServiceImpl.ancienne(31));
    }
}
