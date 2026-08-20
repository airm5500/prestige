package bll.configManagement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regle du prix de vente face au code tableau. Associer un code tableau majore le prix du taux KEY_TAUX_CODE_TABLEAU ;
 * le probleme que ces regles resolvent est le parc d'articles dont le prix porte deja cette majoration alors que la
 * colonne code tableau est restee vide : les traiter comme un article vierge ajouterait le taux une seconde fois, sur
 * le prix affiche au comptoir.
 *
 * Les deux ecrans concernes n'ont jamais eu la meme regle, et on ne les unifie pas : la fiche article reprend le prix
 * saisi dans des cas ou l'import ne touche a rien. Chaque regle est donc verifiee separement.
 */
class CodeTableauPrixTest {

    private static final int TAUX = 30;
    private static final short ARTICLE_NORMAL = 0;
    private static final short ARTICLE_DETAIL = 1;
    private static final boolean MAJORER = true;
    private static final boolean CODE_SEUL = false;

    // ------------------------------------------------------------------ fiche article

    @Test
    @DisplayName("Fiche article : associer un code tableau majore le prix, comme avant")
    void ficheAssociationMajore() {
        assertEquals(1030, familleManagement.prixSelonCodeTableau("2", "", 1000, 1000, TAUX, ARTICLE_NORMAL, MAJORER));
        // Colonne jamais renseignee : un null en base vaut « pas de code tableau ».
        assertEquals(1030,
                familleManagement.prixSelonCodeTableau("2", null, 1000, 1000, TAUX, ARTICLE_NORMAL, MAJORER));
    }

    @Test
    @DisplayName("Fiche article : code seul, le prix qui porte deja la majoration n'est pas majore deux fois")
    void ficheAssociationCodeSeul() {
        // Le cas qui motive l'option : le prix affiche est 1030 parce qu'il contient deja le taux ;
        // on associe le code pour rendre l'article conforme, sans y ajouter 30 F de plus.
        assertEquals(1030,
                familleManagement.prixSelonCodeTableau("2", "", 1030, 1030, TAUX, ARTICLE_NORMAL, CODE_SEUL));
    }

    @Test
    @DisplayName("Fiche article : article detail, le prix ne suit pas le code tableau")
    void ficheArticleDetail() {
        assertNull(familleManagement.prixSelonCodeTableau("2", "", 1000, 1000, TAUX, ARTICLE_DETAIL, MAJORER));
        assertNull(familleManagement.prixSelonCodeTableau("2", "", 1000, 1000, TAUX, ARTICLE_DETAIL, CODE_SEUL));
    }

    @Test
    @DisplayName("Fiche article : code deja present, le choix ne change rien")
    void ficheCodeDejaPresent() {
        // Prix inchange a l'ecran : on ne touche pas au prix.
        assertNull(familleManagement.prixSelonCodeTableau("2", "1", 1030, 1030, TAUX, ARTICLE_NORMAL, MAJORER));
        assertNull(familleManagement.prixSelonCodeTableau("2", "1", 1030, 1030, TAUX, ARTICLE_NORMAL, CODE_SEUL));
        // Prix modifie a l'ecran : c'est le prix saisi qui gagne, sans majoration supplementaire.
        assertEquals(1200, familleManagement.prixSelonCodeTableau("2", "1", 1200, 1030, TAUX, ARTICLE_NORMAL, MAJORER));
        assertEquals(1200,
                familleManagement.prixSelonCodeTableau("2", "1", 1200, 1030, TAUX, ARTICLE_NORMAL, CODE_SEUL));
    }

    @Test
    @DisplayName("Fiche article : retrait du code tableau, le prix perd la majoration")
    void ficheRetraitCode() {
        assertEquals(1000, familleManagement.prixSelonCodeTableau("", "2", 1030, 1030, TAUX, ARTICLE_NORMAL, MAJORER));
        assertEquals(1000,
                familleManagement.prixSelonCodeTableau("", "2", 1030, 1030, TAUX, ARTICLE_NORMAL, CODE_SEUL));
        // Article detail : pas de retrait de majoration, le prix saisi est repris tel quel.
        assertEquals(1030, familleManagement.prixSelonCodeTableau("", "2", 1030, 1030, TAUX, ARTICLE_DETAIL, MAJORER));
    }

    @Test
    @DisplayName("Fiche article : sans code tableau ni avant ni apres, le prix saisi est repris tel quel")
    void ficheSansCodeDeBoutEnBout() {
        assertEquals(1200, familleManagement.prixSelonCodeTableau("", "", 1200, 1000, TAUX, ARTICLE_NORMAL, MAJORER));
        assertEquals(1200,
                familleManagement.prixSelonCodeTableau("  ", null, 1200, 1000, TAUX, ARTICLE_NORMAL, MAJORER));
    }

    // ------------------------------------------------------------------ import de fichier

    @Test
    @DisplayName("Import : associer un code tableau majore le prix, comme avant")
    void importAssociationMajore() {
        assertEquals(1030, familleManagement.prixSelonCodeTableauImport("2", "", 1000, TAUX, ARTICLE_NORMAL, MAJORER));
    }

    @Test
    @DisplayName("Import : code seul, le prix du fichier est repris sans majoration")
    void importAssociationCodeSeul() {
        assertEquals(1030,
                familleManagement.prixSelonCodeTableauImport("2", "", 1030, TAUX, ARTICLE_NORMAL, CODE_SEUL));
    }

    @Test
    @DisplayName("Import : code deja present, le prix du fichier n'est pas repris")
    void importCodeDejaPresent() {
        // Regle propre a l'import, differente de la fiche article : meme si le fichier porte un autre prix,
        // il n'est pas applique. On la conserve pour ne rien changer aux imports existants.
        assertNull(familleManagement.prixSelonCodeTableauImport("2", "1", 1200, TAUX, ARTICLE_NORMAL, MAJORER));
        assertNull(familleManagement.prixSelonCodeTableauImport("2", "1", 1200, TAUX, ARTICLE_NORMAL, CODE_SEUL));
    }

    @Test
    @DisplayName("Import : retrait du code tableau, le prix perd la majoration")
    void importRetraitCode() {
        assertEquals(1000, familleManagement.prixSelonCodeTableauImport("", "2", 1030, TAUX, ARTICLE_NORMAL, MAJORER));
    }

    @Test
    @DisplayName("Import : hors des cas de code tableau, le prix n'est pas touche")
    void importPrixNonTouche() {
        assertNull(familleManagement.prixSelonCodeTableauImport("", "", 1200, TAUX, ARTICLE_NORMAL, MAJORER));
        assertNull(familleManagement.prixSelonCodeTableauImport("2", "", 1000, TAUX, ARTICLE_DETAIL, MAJORER));
        assertNull(familleManagement.prixSelonCodeTableauImport("", "2", 1030, TAUX, ARTICLE_DETAIL, MAJORER));
    }

    // ------------------------------------------------------------------ lecture du champ envoye par l'ecran

    @Test
    @DisplayName("Champ absent : comportement historique, on majore")
    void champAbsentMajore() {
        assertEquals(true, familleManagement.majorationDemandee(null));
        assertEquals(true, familleManagement.majorationDemandee(""));
        assertEquals(true, familleManagement.majorationDemandee("true"));
        assertEquals(true, familleManagement.majorationDemandee(" true "));
        assertEquals(true, familleManagement.majorationDemandee("1"));
    }

    @Test
    @DisplayName("Champ a false ou 0 : on associe le code seul")
    void champFauxCodeSeul() {
        // La fiche article envoie « false », la case a cocher de l'importation envoie « 0 ».
        assertEquals(false, familleManagement.majorationDemandee("false"));
        assertEquals(false, familleManagement.majorationDemandee(" false "));
        assertEquals(false, familleManagement.majorationDemandee("0"));
        assertEquals(false, familleManagement.majorationDemandee(" 0 "));
    }
}
