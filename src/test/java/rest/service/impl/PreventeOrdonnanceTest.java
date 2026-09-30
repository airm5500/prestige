package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Retour du 30/09 : prevente creee depuis une ordonnance client. Standard = comptant, assurance et carnet = leur tiers
 * payant principal ; quantite = ce qui reste a servir ; aucune ligne n'est ecartee sans motif.
 */
public class PreventeOrdonnanceTest {

    private static PreventeOrdonnance.Ligne ligne(String article, int prescrite, Integer servie, int stock, int prix) {
        return new PreventeOrdonnance.Ligne(article, "PRODUIT " + article, prescrite, servie, stock, prix, true);
    }

    @Test
    public void typeDeVenteSelonLeClient() {
        assertEquals("1", PreventeOrdonnance.typeVente("6", false), "standard : comptant");
        assertEquals("1", PreventeOrdonnance.typeVente("6", true), "standard, meme avec un tiers payant : comptant");
        assertEquals("2", PreventeOrdonnance.typeVente("1", true), "assurance : vente assurance");
        assertEquals("3", PreventeOrdonnance.typeVente("2", true), "carnet : vente carnet");
        assertNull(PreventeOrdonnance.typeVente("1", false), "assurance sans tiers payant actif : impossible");
        assertNull(PreventeOrdonnance.typeVente("3", true), "confrere : non pris en charge");
    }

    @Test
    public void refusExplique() {
        assertNull(PreventeOrdonnance.refusClient("6", "Standard", false));
        assertTrue(PreventeOrdonnance.refusClient("2", "Carnet", false).contains("aucun tiers payant actif"));
        assertTrue(PreventeOrdonnance.refusClient("4", "Proprietaire", true).contains("Proprietaire"));
    }

    @Test
    public void quantiteEgaleAuResteAServir() {
        assertEquals(3, PreventeOrdonnance.reste(3, null), "service non renseigne : tout est a servir");
        assertEquals(2, PreventeOrdonnance.reste(3, 1));
        assertEquals(0, PreventeOrdonnance.reste(3, 3));
        assertEquals(0, PreventeOrdonnance.reste(3, 5), "jamais negatif");
        PreventeOrdonnance.Decision d = PreventeOrdonnance.decider(ligne("A", 3, 1, 10, 500));
        assertTrue(d.retenue());
        assertEquals(2, d.quantite);
    }

    @Test
    public void chaqueEcartASonMotif() {
        assertTrue(PreventeOrdonnance.decider(ligne("", 1, null, 10, 500)).motif.contains("hors référentiel"));
        assertTrue(PreventeOrdonnance.decider(ligne(null, 1, null, 10, 500)).motif.contains("hors référentiel"));
        assertTrue(PreventeOrdonnance.decider(ligne("A", 2, 2, 10, 500)).motif.contains("déjà servi"));
        assertTrue(PreventeOrdonnance.decider(ligne("A", 2, null, 10, 0)).motif.contains("prix"));
        String stock = PreventeOrdonnance.decider(ligne("A", 5, null, 3, 500)).motif;
        assertTrue(stock.contains("stock insuffisant") && stock.contains("3 en stock") && stock.contains("5 à servir"),
                stock);
        PreventeOrdonnance.Decision inactif = PreventeOrdonnance
                .decider(new PreventeOrdonnance.Ligne("A", "X", 1, null, 10, 500, false));
        assertFalse(inactif.retenue());
        assertTrue(inactif.motif.contains("désactivé"));
    }

    @Test
    public void memeProduitSurDeuxLignesPartageLeStock() {
        List<PreventeOrdonnance.Decision> d = PreventeOrdonnance.decider(
                Arrays.asList(ligne("A", 3, null, 4, 500), ligne("A", 2, null, 4, 500), ligne("B", 1, null, 1, 800)));
        assertTrue(d.get(0).retenue());
        assertEquals(3, d.get(0).quantite);
        assertFalse(d.get(1).retenue(), "il ne reste qu'une boite pour la seconde ligne");
        assertNotNull(d.get(1).motif);
        assertTrue(d.get(1).motif.contains("1 en stock"), d.get(1).motif);
        assertEquals("PRODUIT A", d.get(1).ligne.libelle);
        assertTrue(d.get(2).retenue());
    }
}
