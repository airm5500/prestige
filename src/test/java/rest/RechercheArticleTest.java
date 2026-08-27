package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Mode de recherche de la fiche article : la requete ajoute deja le joker final, le mode « contient » se resume donc a
 * un joker place devant le texte.
 */
class RechercheArticleTest {

    @Test
    @DisplayName("Par defaut, la recherche contient : joker devant le texte")
    void contientParDefaut() {
        assertEquals("%doli", RechercheArticle.motif("doli", "contient"));
        assertEquals("%doli", RechercheArticle.motif("doli", null));
        assertEquals("%doli", RechercheArticle.motif("doli", ""));
        // une valeur inattendue ne prive pas l'ecran de la recherche large
        assertEquals("%doli", RechercheArticle.motif("doli", "n'importe quoi"));
    }

    @Test
    @DisplayName("Le mode historique n'est rendu que sur demande explicite")
    void commenceParExplicite() {
        assertEquals("doli", RechercheArticle.motif("doli", "commence par"));
        assertEquals("doli", RechercheArticle.motif("doli", "  Commence Par  "));
        assertEquals("doli", RechercheArticle.motif("doli", "commence"));
    }

    @Test
    @DisplayName("Un texte vide reste vide : la requete saura qu'il n'y a pas de filtre")
    void texteVideInchange() {
        assertNull(RechercheArticle.motif(null, "contient"));
        assertEquals("", RechercheArticle.motif("", "contient"));
        assertEquals("   ", RechercheArticle.motif("   ", "contient"));
    }

    @Test
    @DisplayName("La reconnaissance du mode est stricte sur le sens, souple sur la forme")
    void reconnaissanceDuMode() {
        assertTrue(RechercheArticle.estCommencePar("commence par"));
        assertTrue(RechercheArticle.estCommencePar("COMMENCE"));
        assertFalse(RechercheArticle.estCommencePar("contient"));
        assertFalse(RechercheArticle.estCommencePar(null));
        assertFalse(RechercheArticle.estCommencePar("commence partout")); // ni l'un ni l'autre : defaut
    }

    @Test
    @DisplayName("Un CIP garde sa recherche exacte en mode historique, elargie en mode contient")
    void rechercheParCip() {
        assertEquals("3006000", RechercheArticle.motif("3006000", "commence par"));
        assertEquals("%3006000", RechercheArticle.motif("3006000", "contient"));
    }
}
