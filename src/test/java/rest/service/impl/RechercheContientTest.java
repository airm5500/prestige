package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 2 : la recherche de la reconciliation BL passe de « commence par » a « contient ». Regles
 * verifiees sur 5 000 couples (nom, texte) tires au hasard (graine fixe), avec des jokers SQL dans les deux :
 * <ul>
 * <li>nom LIKE motifContient(texte) est vrai si et seulement si le nom contient le texte, a n'importe quelle position
 * (debut, milieu, fin) ;</li>
 * <li>les jokers du texte (%, _, \) sont pris a la lettre ;</li>
 * <li>le motif « debut » (motif sans son premier %) garde les noms qui commencent par le texte en tete.</li>
 * </ul>
 */
class RechercheContientTest {

    private static final String LETTRES = "AB%_\\ 1";

    /** LIKE de MariaDB (echappement \), sans tenir compte de la casse : suffisant pour ces lettres. */
    static boolean like(String valeur, String motif) {
        return like(valeur, 0, motif, 0);
    }

    private static boolean like(String v, int i, String m, int j) {
        if (j == m.length()) {
            return i == v.length();
        }
        char c = m.charAt(j);
        if (c == '%') {
            for (int k = i; k <= v.length(); k++) {
                if (like(v, k, m, j + 1)) {
                    return true;
                }
            }
            return false;
        }
        if (i == v.length()) {
            return false;
        }
        if (c == '_') {
            return like(v, i + 1, m, j + 1);
        }
        if (c == '\\' && j + 1 < m.length()) {
            return v.charAt(i) == m.charAt(j + 1) && like(v, i + 1, m, j + 2);
        }
        return v.charAt(i) == c && like(v, i + 1, m, j + 1);
    }

    private static String tirer(Random r, int max) {
        StringBuilder b = new StringBuilder();
        int n = 1 + r.nextInt(max);
        for (int i = 0; i < n; i++) {
            b.append(LETTRES.charAt(r.nextInt(LETTRES.length())));
        }
        return b.toString();
    }

    @Test
    void contientAPositionQuelconque() {
        Random r = new Random(20261110L);
        int milieu = 0;
        for (int cas = 0; cas < 5000; cas++) {
            String nom = tirer(r, 12);
            String texte;
            if (r.nextBoolean()) {
                int a = r.nextInt(nom.length()), z = a + 1 + r.nextInt(nom.length() - a);
                texte = nom.substring(a, z);
            } else {
                texte = tirer(r, 4);
            }
            String motif = CommandeServiceImpl.motifContient(texte);
            assertEquals(nom.contains(texte), like(nom, motif), "nom=" + nom + " texte=" + texte + " motif=" + motif);
            assertEquals(nom.startsWith(texte), like(nom, motif.substring(1)),
                    "debut : nom=" + nom + " texte=" + texte);
            if (nom.contains(texte) && !nom.startsWith(texte)) {
                milieu++;
            }
        }
        /* jeu varie : beaucoup de textes trouves au milieu du nom (l'ancien « commence par » les manquait) */
        assertEquals(true, milieu > 500, "cas au milieu : " + milieu);
    }

    @Test
    void casConcrets() {
        assertEquals("%DYNABE%", CommandeServiceImpl.motifContient("DYNABE"));
        assertEquals(true, like("CEINT DYNABELT 26CM", CommandeServiceImpl.motifContient("DYNABE")));
        assertEquals(false, like("CEINT DYNABELT 26CM", "DYNABE%"));
        assertEquals(false, like("DOLIPRANE 500", CommandeServiceImpl.motifContient("50%")));
        assertEquals(true, like("REMISE 50% B/10", CommandeServiceImpl.motifContient("50%")));
        assertEquals(false, like("AXB", CommandeServiceImpl.motifContient("A_B")));
        assertEquals(true, like("A_B", CommandeServiceImpl.motifContient("A_B")));
    }
}
