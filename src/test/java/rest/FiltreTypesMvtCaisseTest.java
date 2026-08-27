package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Filtre des types de mouvement du journal de caisse. Le meme parametre porte desormais un type ou plusieurs ; il entre
 * dans une requete construite par concatenation, d'ou les cas d'injection.
 */
class FiltreTypesMvtCaisseTest {

    private static final String COL = "m.lg_TYPE_MVT_CAISSE_ID";

    @Test
    @DisplayName("Aucun type demande : le filtre disparait, la liste montre tout")
    void aucunType() {
        assertEquals(" ", FiltreTypesMvtCaisse.fragment(COL, null));
        assertEquals(" ", FiltreTypesMvtCaisse.fragment(COL, ""));
        assertEquals(" ", FiltreTypesMvtCaisse.fragment(COL, "   "));
    }

    @Test
    @DisplayName("Un seul type : egalite, comme avant")
    void unSeulType() {
        assertEquals(" AND m.lg_TYPE_MVT_CAISSE_ID='3' ", FiltreTypesMvtCaisse.fragment(COL, "3"));
    }

    @Test
    @DisplayName("Les trois types du journal : entree, sortie, reglement tiers payant")
    void plusieursTypes() {
        assertEquals(" AND m.lg_TYPE_MVT_CAISSE_ID IN ('5','4','3') ", FiltreTypesMvtCaisse.fragment(COL, "5,4,3"));
    }

    @Test
    @DisplayName("Espaces, elements vides et doublons sont ecartes")
    void nettoyage() {
        assertEquals(Arrays.asList("5", "4"), FiltreTypesMvtCaisse.identifiants(" 5 , , 4 ,5 "));
        assertEquals(Collections.emptyList(), FiltreTypesMvtCaisse.identifiants(" , , "));
    }

    @Test
    @DisplayName("Une tentative d'injection ne peut pas sortir de la chaine")
    void injection() {
        String fragment = FiltreTypesMvtCaisse.fragment(COL, "3' OR '1'='1'; DROP TABLE t_mvt_caisse; --");
        // Ce qui compte : aucune apostrophe ne survit a l'interieur, donc il ne reste que les deux
        // qui delimitent la valeur. Le contenu, lui, ne designera simplement aucun type.
        assertEquals(2, fragment.chars().filter(c -> c == '\'').count());
        assertEquals(-1, fragment.indexOf(';'));
        assertEquals(-1, fragment.toUpperCase().indexOf(" DROP "));
        assertEquals(" AND m.lg_TYPE_MVT_CAISSE_ID='3OR11DROPTABLEt_mvt_caisse--' ", fragment);
    }

    @Test
    @DisplayName("Un identifiant en UUID passe intact, tiret compris")
    void identifiantUuid() {
        assertEquals(" AND m.lg_TYPE_MVT_CAISSE_ID='0346e812-5e44-46fd-80cf-9a04f21a5d85' ",
                FiltreTypesMvtCaisse.fragment(COL, "0346e812-5e44-46fd-80cf-9a04f21a5d85"));
    }
}
