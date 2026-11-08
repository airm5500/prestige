package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Cellules des listes Ubipharm sur des milliers de cas tires avec une graine fixe : la lecture rend exactement ce que
 * la page affiche (produit, PSCODE, CIP, disponibilite par agence, paliers), jamais de balise, et les champs de saisie
 * et bulles ne fuient pas dans le texte.
 */
class ListesUbipharmParseurCoherenceTest {

    @Test
    void milliersDeCellules() {
        Random r = new Random(20261108L);
        for (int i = 0; i < 3000; i++) {
            String designation = ListesUbipharmJeuEssai.mots(r, 1, 8);
            String ps = ListesUbipharmJeuEssai.pscode(r);
            String cip = r.nextInt(5) == 0 ? null : ListesUbipharmJeuEssai.cip(r);
            String[] p = ListesUbipharmParseur
                    .produit(ListesUbipharmJeuEssai.produit(designation, ps, cip) + ListesUbipharmJeuEssai.saisie(i));
            assertEquals(designation, p[0]);
            assertEquals(ps, p[1]);
            assertEquals(cip, p[2]);

            String[] d = ListesUbipharmJeuEssai.dispo(r, ps);
            String lu = ListesUbipharmParseur.dispo(d[0]);
            assertEquals(d[1], lu);
            assertFalse(lu.contains("<") || lu.contains("Colisage") || lu.contains("CIP:"), lu);

            String[] pal = ListesUbipharmJeuEssai.paliers(r, ps);
            assertEquals(pal[1], ListesUbipharmParseur.paliers(pal[0]));

            String t = ListesUbipharmJeuEssai.mots(r, 0, 5);
            String h = r.nextBoolean() ? ListesUbipharmJeuEssai.esc(t)
                    : "<span>" + ListesUbipharmJeuEssai.esc(t) + "</span>" + ListesUbipharmJeuEssai.saisie(i);
            assertEquals(t, ListesUbipharmParseur.texte(h));
        }
    }

    @Test
    void casLimites() throws Exception {
        assertEquals("", ListesUbipharmParseur.texte(null));
        assertEquals("", ListesUbipharmParseur.texte(""));
        String[] p = ListesUbipharmParseur.produit("<span>Sans lien</span><div class='td-detail'>X - 12</div>");
        assertEquals("Sans lien", p[0]);
        assertNull(p[1]);
        assertNull(p[2], "12 n'est pas un CIP");
        assertEquals("", ListesUbipharmParseur.paliers("<span id='promook_0'></span>"));
        /* script jamais execute ni rendu */
        assertEquals("a b", ListesUbipharmParseur.texte("a<script>alert(1)</script> b"));
        /* cellule tres longue bornee */
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < 3000; i++) {
            s.append('x');
        }
        ListesUbipharmParseur.Ligne l = ListesUbipharmParseur.ligne(ListeUbipharm.RELEVES, 0, null,
                new org.json.JSONArray().put("menu").put(s.toString()).put("01/01/2026").put("12"));
        assertEquals(ListesUbipharmParseur.LONGUEUR_CELLULE, l.cellules.get(0).length());
    }
}
