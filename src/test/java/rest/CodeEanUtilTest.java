package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regles du code EAN. Le point qui compte : le groupe doit etre le MEME que l'on parte du produit ou de son
 * deconditionne, sinon la mise a jour n'est pas symetrique et les deux articles se desaccordent.
 */
class CodeEanUtilTest {

    @Test
    @DisplayName("Un code saisi avec des espaces autour est nettoye")
    void normalisation() {
        assertEquals("3000000349120", CodeEanUtil.normaliser("  3000000349120 "));
        assertEquals("", CodeEanUtil.normaliser(null));
        assertEquals("", CodeEanUtil.normaliser("   "));
    }

    @Test
    @DisplayName("Un code vide est refuse : on n'efface pas un code existant par inadvertance")
    void codeVide() {
        assertFalse(CodeEanUtil.estRenseigne(null));
        assertFalse(CodeEanUtil.estRenseigne(""));
        assertFalse(CodeEanUtil.estRenseigne("   "));
        assertTrue(CodeEanUtil.estRenseigne("3000000349120"));
    }

    @Test
    @DisplayName("Depuis le produit : le groupe est le produit lui-meme")
    void groupeDepuisLeProduit() {
        assertEquals("PARENT", CodeEanUtil.identifiantDeGroupe("PARENT", null));
        assertEquals("PARENT", CodeEanUtil.identifiantDeGroupe("PARENT", ""));
        assertEquals("PARENT", CodeEanUtil.identifiantDeGroupe("PARENT", "   "));
    }

    @Test
    @DisplayName("Depuis le deconditionne : le groupe est celui du parent")
    void groupeDepuisLeDetail() {
        assertEquals("PARENT", CodeEanUtil.identifiantDeGroupe("DETAIL", "PARENT"));
    }

    @Test
    @DisplayName("Le groupe est le meme des deux cotes : c'est ce qui rend la mise a jour symetrique")
    void symetrie() {
        String depuisLeParent = CodeEanUtil.identifiantDeGroupe("PARENT", "");
        String depuisLeDetail = CodeEanUtil.identifiantDeGroupe("DETAIL", "PARENT");
        assertEquals(depuisLeParent, depuisLeDetail);
    }
}
