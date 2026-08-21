package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regle de lecture des filtres de la MAJ selective.
 *
 * Les combos communs de l'application ajoutent une entree « Tous » qui porte la valeur ALL. Prise pour un identifiant,
 * elle produirait une liste vide : l'utilisateur croirait qu'aucun article ne correspond alors qu'il n'a simplement
 * pose aucun filtre. Et en mode « Tous Selectionner », un filtre qu'on croit pose alors qu'il ne l'est pas etendrait
 * l'operation a tout le fichier articles.
 *
 * @author koben
 */
public class MajSelectiveFiltreTest {

    @Test
    @DisplayName("un identifiant reel est bien un filtre")
    public void valeurReelleEstUnFiltre() {
        assertTrue(FicheArticleServiceImpl.filtreActif("11126191448891128894"));
        assertTrue(FicheArticleServiceImpl.filtreActif("A"));
        assertTrue(FicheArticleServiceImpl.filtreActif("0"));
    }

    @Test
    @DisplayName("ALL, valeur de l'entree « Tous », n'est pas un filtre")
    public void tousNestPasUnFiltre() {
        assertFalse(FicheArticleServiceImpl.filtreActif("ALL"));
        assertFalse(FicheArticleServiceImpl.filtreActif("all"));
        assertFalse(FicheArticleServiceImpl.filtreActif(" ALL "));
    }

    @Test
    @DisplayName("ni null, ni vide, ni des espaces")
    public void absenceDeSaisieNestPasUnFiltre() {
        assertFalse(FicheArticleServiceImpl.filtreActif(null));
        assertFalse(FicheArticleServiceImpl.filtreActif(""));
        assertFalse(FicheArticleServiceImpl.filtreActif("   "));
    }

    /** « VIDE » designe les articles sans code remise : c'est un filtre a part entiere, pas une absence de choix. */
    @Test
    @DisplayName("VIDE designe les articles sans code remise : c'est un filtre")
    public void videEstUnFiltre() {
        assertTrue(FicheArticleServiceImpl.filtreActif("VIDE"));
    }
}
