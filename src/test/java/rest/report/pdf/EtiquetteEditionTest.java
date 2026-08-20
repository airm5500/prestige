package rest.report.pdf;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Lecture des deux valeurs que le menu Gestion etiquettes transmet au moteur d'edition. Elles arrivent en texte, d'un
 * champ de saisie pour l'une et d'une colonne VARCHAR pour l'autre : une valeur illisible ne doit jamais faire echouer
 * l'edition, sous peine de remplacer une planche d'etiquettes par une page d'erreur.
 */
class EtiquetteEditionTest {

    @Test
    @DisplayName("Position de depart : la valeur saisie est reprise telle quelle")
    void positionLisible() {
        assertEquals(1, LabelSheetPdf.positionDepart("1"));
        assertEquals(37, LabelSheetPdf.positionDepart("37"));
        assertEquals(65, LabelSheetPdf.positionDepart(" 65 "));
    }

    @Test
    @DisplayName("Position de depart : une valeur absente ou illisible repart de la premiere case")
    void positionIllisible() {
        assertEquals(1, LabelSheetPdf.positionDepart(null));
        assertEquals(1, LabelSheetPdf.positionDepart(""));
        assertEquals(1, LabelSheetPdf.positionDepart("   "));
        assertEquals(1, LabelSheetPdf.positionDepart("premiere"));
    }

    @Test
    @DisplayName("Nombre d'exemplaires : la quantite enregistree sur l'etiquette")
    void exemplairesLisibles() {
        assertEquals(1, EtiquetteEditionService.nombreExemplaires("1"));
        assertEquals(120, EtiquetteEditionService.nombreExemplaires("120"));
        assertEquals(12, EtiquetteEditionService.nombreExemplaires(" 12 "));
    }

    @Test
    @DisplayName("Nombre d'exemplaires : rien a imprimer plutot qu'une erreur")
    void exemplairesIllisibles() {
        // Zero exemplaire produit une planche vide ; c'est visible et sans consequence, alors qu'une
        // exception renverrait une page d'erreur a la place du PDF.
        assertEquals(0, EtiquetteEditionService.nombreExemplaires(null));
        assertEquals(0, EtiquetteEditionService.nombreExemplaires(""));
        assertEquals(0, EtiquetteEditionService.nombreExemplaires("beaucoup"));
        // Une quantite negative ne doit pas non plus se glisser dans la boucle d'edition.
        assertEquals(0, EtiquetteEditionService.nombreExemplaires("-5"));
    }
}
