package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Les deux reglages de mise en page de la fiche tiers payant : nombre de bons par page et taille de police.
 *
 * La regle qui compte ici est celle de la non regression : tant que l'officine n'a rien choisi, l'edition ne doit
 * recevoir AUCUN de ces deux reglages, faute de quoi elle ecraserait ce que le modele impose deja de son cote.
 */
class MiseEnPageFactureTest {

    @Test
    @DisplayName("Sur automatique, aucun des deux reglages n'est transmis a l'edition")
    void automatiqueNeTransmetRien() {
        Map<String, Object> parametres = new HashMap<>();

        MiseEnPageFacture.appliquer(parametres, 0, 0);

        assertTrue(parametres.isEmpty(), "aucun reglage ne doit etre transmis : " + parametres);
    }

    @Test
    @DisplayName("Un reglage absent (fiche jamais renseignee) est traite comme automatique")
    void valeurAbsenteTraiteeCommeAutomatique() {
        Map<String, Object> parametres = new HashMap<>();

        MiseEnPageFacture.appliquer(parametres, null, null);

        assertTrue(parametres.isEmpty());
    }

    @Test
    @DisplayName("Les reglages choisis sont transmis tels quels")
    void reglagesChoisisTransmis() {
        Map<String, Object> parametres = new HashMap<>();

        MiseEnPageFacture.appliquer(parametres, 25, 7);

        assertEquals(25, parametres.get(MiseEnPageFacture.PARAMETRE_BONS_PAR_PAGE));
        assertEquals(7, parametres.get(MiseEnPageFacture.PARAMETRE_TAILLE_POLICE));
    }

    @Test
    @DisplayName("Un seul des deux reglages peut etre choisi, l'autre reste automatique")
    void unSeulReglageChoisi() {
        Map<String, Object> parametres = new HashMap<>();

        MiseEnPageFacture.appliquer(parametres, 0, 6);

        assertFalse(parametres.containsKey(MiseEnPageFacture.PARAMETRE_BONS_PAR_PAGE));
        assertEquals(6, parametres.get(MiseEnPageFacture.PARAMETRE_TAILLE_POLICE));
    }

    @Test
    @DisplayName("Une valeur aberrante revient a automatique, jamais a une facture illisible")
    void valeursAberrantes() {
        Map<String, Object> parametres = new HashMap<>();

        // 2 bons par page rendrait la facture interminable ; 40 points ne tiendrait pas dans la ligne.
        MiseEnPageFacture.appliquer(parametres, 2, 40);
        assertTrue(parametres.isEmpty(), "les valeurs hors bornes sont ignorees : " + parametres);

        MiseEnPageFacture.appliquer(parametres, 10000, -3);
        assertTrue(parametres.isEmpty(), "les valeurs hors bornes sont ignorees : " + parametres);
    }

    @Test
    @DisplayName("Les bornes annoncees a l'ecran sont bien celles appliquees")
    void bornes() {
        assertEquals(MiseEnPageFacture.AUTOMATIQUE,
                MiseEnPageFacture.bonsParPage(MiseEnPageFacture.BONS_PAR_PAGE_MINIMUM - 1));
        assertEquals(MiseEnPageFacture.BONS_PAR_PAGE_MINIMUM,
                MiseEnPageFacture.bonsParPage(MiseEnPageFacture.BONS_PAR_PAGE_MINIMUM));
        assertEquals(MiseEnPageFacture.BONS_PAR_PAGE_MAXIMUM,
                MiseEnPageFacture.bonsParPage(MiseEnPageFacture.BONS_PAR_PAGE_MAXIMUM));
        assertEquals(MiseEnPageFacture.AUTOMATIQUE,
                MiseEnPageFacture.bonsParPage(MiseEnPageFacture.BONS_PAR_PAGE_MAXIMUM + 1));

        assertEquals(MiseEnPageFacture.AUTOMATIQUE,
                MiseEnPageFacture.taillePolice(MiseEnPageFacture.TAILLE_POLICE_MINIMUM - 1));
        assertEquals(MiseEnPageFacture.TAILLE_POLICE_MINIMUM,
                MiseEnPageFacture.taillePolice(MiseEnPageFacture.TAILLE_POLICE_MINIMUM));
        assertEquals(MiseEnPageFacture.TAILLE_POLICE_MAXIMUM,
                MiseEnPageFacture.taillePolice(MiseEnPageFacture.TAILLE_POLICE_MAXIMUM));
        assertEquals(MiseEnPageFacture.AUTOMATIQUE,
                MiseEnPageFacture.taillePolice(MiseEnPageFacture.TAILLE_POLICE_MAXIMUM + 1));
    }
}
