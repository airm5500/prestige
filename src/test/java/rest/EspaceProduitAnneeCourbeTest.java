package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Annee presentee par la courbe d'evolution de l'espace produit : en janvier, l'annee qui commence n'a rien a montrer,
 * c'est l'annee ecoulee qui s'affiche ; a partir de fevrier, l'annee en cours.
 */
class EspaceProduitAnneeCourbeTest {

    @Test
    @DisplayName("En janvier : la courbe montre l'annee ecoulee")
    void enJanvierAnneePrecedente() {
        assertEquals(2025, EspaceProduitRessource.anneeDeLaCourbe(LocalDate.of(2026, 1, 1)));
        assertEquals(2025, EspaceProduitRessource.anneeDeLaCourbe(LocalDate.of(2026, 1, 31)));
    }

    @Test
    @DisplayName("De fevrier a decembre : l'annee en cours")
    void resteDeLAnneeEnCours() {
        assertEquals(2026, EspaceProduitRessource.anneeDeLaCourbe(LocalDate.of(2026, 2, 1)));
        assertEquals(2026, EspaceProduitRessource.anneeDeLaCourbe(LocalDate.of(2026, 8, 27)));
        assertEquals(2026, EspaceProduitRessource.anneeDeLaCourbe(LocalDate.of(2026, 12, 31)));
    }
}
