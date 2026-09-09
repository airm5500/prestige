package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import commonTasks.dto.FeuilleDeMatchSimpleLigneDTO;

/** La feuille de match simple : classement par quantite achetee, rangs ex aequo « 17-21 ». */
class FeuilleDeMatchSimpleTest {

    private static FeuilleDeMatchSimpleLigneDTO ligne(String produit, long quantite, long frequence) {
        return new FeuilleDeMatchSimpleLigneDTO(produit, produit, "300000" + produit, 0, quantite, frequence);
    }

    @Test
    @DisplayName("Les produits sont classes par quantite achetee decroissante")
    void classementParQuantite() {
        List<FeuilleDeMatchSimpleLigneDTO> r = FeuilleDeMatchSimple
                .classer(Arrays.asList(ligne("PETIT", 10, 1), ligne("GROS", 378, 4), ligne("MOYEN", 100, 2)));
        assertEquals("GROS", r.get(0).getProduit());
        assertEquals("1", r.get(0).getRang());
        assertEquals("2", r.get(1).getRang());
        assertEquals("3", r.get(2).getRang());
    }

    @Test
    @DisplayName("Les ex aequo partagent un rang en plage, et le rang suivant reprend apres la plage")
    void exAequoEnPlage() {
        List<FeuilleDeMatchSimpleLigneDTO> r = FeuilleDeMatchSimple.classer(Arrays.asList(ligne("A", 100, 1),
                ligne("B", 200, 1), ligne("C", 100, 2), ligne("D", 100, 1), ligne("E", 50, 1), ligne("F", 120, 1)));
        assertEquals("1", r.get(0).getRang());
        assertEquals("B", r.get(0).getProduit());
        assertEquals("2", r.get(1).getRang());
        assertEquals("F", r.get(1).getProduit());
        assertEquals("3-5", r.get(2).getRang());
        assertEquals("3-5", r.get(3).getRang());
        assertEquals("3-5", r.get(4).getRang());
        assertEquals("C", r.get(2).getProduit(), "a quantite egale, la frequence la plus forte d'abord");
        assertEquals("6", r.get(5).getRang());
        assertEquals("E", r.get(5).getProduit());
    }

    @Test
    @DisplayName("Une liste vide ou nulle ne casse rien")
    void listeVide() {
        assertTrue(FeuilleDeMatchSimple.classer(null).isEmpty());
        assertTrue(FeuilleDeMatchSimple.classer(Arrays.asList()).isEmpty());
    }

    @Test
    @DisplayName("Le nom de fichier est sur : officine et periode reduits a des caracteres simples")
    void nomDeFichier() {
        assertEquals("PH_TEST_CAPITALE", rest.AbcArticleRessource.slug("PH TEST CAPITALE"));
        assertEquals("Pharmacie_de_l_Etoile", rest.AbcArticleRessource.slug("Pharmacie de l'Étoile "));
        assertEquals("2026_09_01", rest.AbcArticleRessource.slug("2026-09-01"));
        assertEquals("", rest.AbcArticleRessource.slug(null));
    }
}
