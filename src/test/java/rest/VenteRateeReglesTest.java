package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regles du registre des ventes ratees : normalisation des saisies libres, cle de regroupement et confirmation de
 * commande groupee.
 */
class VenteRateeReglesTest {

    @Test
    @DisplayName("Analyse par jour : ordre chronologique, pas l'ordre du texte dd/MM/yyyy")
    void ordreDesJours() {
        java.util.TreeMap<String, Integer> jours = new java.util.TreeMap<>(VenteRateeRegles.ORDRE_DES_JOURS);
        for (String j : new String[] { "01/03/2026", "02/01/2026", "15/12/2025", "01/04/2026", "31/01/2026" }) {
            jours.put(j, 1);
        }
        assertEquals(java.util.Arrays.asList("15/12/2025", "02/01/2026", "31/01/2026", "01/03/2026", "01/04/2026"),
                new java.util.ArrayList<>(jours.keySet()));
    }

    @Test
    @DisplayName("Normalisation : casse et espaces ne creent pas de doublons")
    void normalisation() {
        assertEquals("doliprane 1000", VenteRateeRegles.normaliser("  Doliprane   1000 "));
        assertEquals("doliprane 1000", VenteRateeRegles.normaliser("DOLIPRANE\t1000"));
        assertEquals("", VenteRateeRegles.normaliser(null));
        assertEquals("", VenteRateeRegles.normaliser("   "));
    }

    @Test
    @DisplayName("Cle de regroupement : produit connu par identifiant, saisie libre par designation")
    void cleRegroupement() {
        assertEquals("p:123", VenteRateeRegles.cleRegroupement("123", "doliprane"));
        assertEquals("p:123", VenteRateeRegles.cleRegroupement(" 123 ", null));
        assertEquals("l:doliprane", VenteRateeRegles.cleRegroupement(null, "doliprane"));
        assertEquals("l:doliprane", VenteRateeRegles.cleRegroupement("  ", "doliprane"));
        // pas de collision possible entre un identifiant et une designation identiques
        assertFalse(
                VenteRateeRegles.cleRegroupement("abc", null).equals(VenteRateeRegles.cleRegroupement(null, "abc")));
    }

    @Test
    @DisplayName("Message de confirmation groupee : celui de la specification")
    void messageConfirmation() {
        assertEquals(
                "Ce produit apparaît dans 3 demandes pour une quantité totale de 5. "
                        + "Souhaitez-vous marquer comme commandées toutes les lignes de ce produit ?",
                VenteRateeRegles.messageConfirmationGroupee(3, 5));
        assertTrue(VenteRateeRegles.messageConfirmationGroupee(1, 2).contains("1 demande pour"));
    }

    @Test
    @DisplayName("La confirmation ne se pose que pour plusieurs demandes actives")
    void confirmationNecessaire() {
        assertFalse(VenteRateeRegles.confirmationGroupeeNecessaire(0));
        assertFalse(VenteRateeRegles.confirmationGroupeeNecessaire(1));
        assertTrue(VenteRateeRegles.confirmationGroupeeNecessaire(2));
    }
}
