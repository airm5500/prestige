package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Controle d'integrite des agregats (19/10) : un bon de livraison corrige apres coup doit faire reprendre la journee ou
 * le mois, comme une vente annulee apres coup.
 */
class PilotageAgregatsControleTest {

    private static PilotageAgregats.Agregat agregat(int bons, double achatTTC) {
        PilotageAgregats.Agregat a = new PilotageAgregats.Agregat("2026-10");
        a.nbBons = bons;
        a.achatTTC = achatTTC;
        return a;
    }

    @Test
    @DisplayName("Memes bons, meme montant : rien a reprendre")
    void identiques() {
        assertFalse(PilotageAgregats.achatsDivergents(agregat(5, 964355), new double[] { 5, 964355 }));
    }

    @Test
    @DisplayName("Meme nombre de bons, montant corrige : a reprendre")
    void montantCorrige() {
        assertTrue(PilotageAgregats.achatsDivergents(agregat(5, 1066113), new double[] { 5, 964355 }));
    }

    @Test
    @DisplayName("Un bon de plus ou de moins : a reprendre")
    void nombreDeBons() {
        assertTrue(PilotageAgregats.achatsDivergents(agregat(82, 8249978), new double[] { 81, 8249978 }));
    }

    @Test
    @DisplayName("Aucun bon en base : un agregat a zero est juste, un agregat avec des achats ne l'est plus")
    void sansBon() {
        assertFalse(PilotageAgregats.achatsDivergents(agregat(0, 0), null));
        assertTrue(PilotageAgregats.achatsDivergents(agregat(1, 1200), null));
    }
}
