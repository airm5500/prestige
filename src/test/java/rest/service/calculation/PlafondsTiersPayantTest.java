package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Plafonds portes par la fiche du tiers payant : heritage du plafond par vente a la creation du lien client, et refus
 * de la vente quand la part tiers payant depasse ce qu'il reste du plafond de credit.
 */
class PlafondsTiersPayantTest {

    @Test
    @DisplayName("La valeur saisie sur le client prime sur celle de la fiche de l'organisme")
    void prioriteAuClient() {
        assertEquals(15000, PlafondsTiersPayant.plafondInitialDuLien(15000, 25000.0));
    }

    @Test
    @DisplayName("Sans valeur sur le client, le lien herite du plafond predefini par l'organisme")
    void heritageDeLOrganisme() {
        assertEquals(25000, PlafondsTiersPayant.plafondInitialDuLien(0, 25000.0));
    }

    @Test
    @DisplayName("Zero partout veut dire aucun plafond - et ne plafonne jamais a zero")
    void zeroVeutDireAucunPlafond() {
        assertEquals(0, PlafondsTiersPayant.plafondInitialDuLien(0, 0.0));
        assertEquals(0, PlafondsTiersPayant.plafondInitialDuLien(0, null));
        assertEquals(0, PlafondsTiersPayant.plafondInitialDuLien(-1, null));
    }

    @Test
    @DisplayName("Sans plafond de credit, aucun encours n'est calcule et rien n'est refuse")
    void sansPlafondDeCredit() {
        assertTrue(PlafondsTiersPayant.encoursRestant(null, 100000).isEmpty());
        assertTrue(PlafondsTiersPayant.encoursRestant(0.0, 100000).isEmpty());
        assertTrue(PlafondsTiersPayant.motifDeRefus("CNPS", null, 100000, 1000000).isEmpty());
        assertTrue(PlafondsTiersPayant.motifDeRefus("CNPS", 0.0, 100000, 1000000).isEmpty());
    }

    @Test
    @DisplayName("L'encours restant deduit la consommation deja enregistree")
    void encoursDeduitLaConsommation() {
        assertEquals(BigDecimal.valueOf(300.0), PlafondsTiersPayant.encoursRestant(500.0, 200).orElseThrow());
        // consommation inconnue = zero
        assertEquals(BigDecimal.valueOf(500.0), PlafondsTiersPayant.encoursRestant(500.0, null).orElseThrow());
    }

    @Test
    @DisplayName("Le cas rapporte : plafond 500, vente dont la part tiers payant fait 1000 - refusee")
    void venteSuperieureAuPlafond() {
        Optional<String> refus = PlafondsTiersPayant.motifDeRefus("MUGEFCI", 500.0, 0, 1000);
        assertTrue(refus.isPresent());
        assertTrue(refus.get().contains("MUGEFCI"), refus.get());
        assertTrue(refus.get().contains("1000"), refus.get());
        assertTrue(refus.get().contains("500"), refus.get());
    }

    @Test
    @DisplayName("Un encours anterieur au plafond compte : l'organisme deja au plafond ne passe plus")
    void encoursAnterieurPrisEnCompte() {
        // plafond pose apres coup ; la conso etait deja de 600 : plus rien ne passe
        assertTrue(PlafondsTiersPayant.motifDeRefus("CNPS", 500.0, 600, 1).isPresent());
        // et l'encours restant montre est ramene a zero, pas negatif
        String motif = PlafondsTiersPayant.motifDeRefus("CNPS", 500.0, 600, 1).orElseThrow();
        assertTrue(motif.contains("(0 sur 500)"), motif);
    }

    @Test
    @DisplayName("La part qui tient exactement dans l'encours restant passe")
    void partExactementDansLEncours() {
        assertFalse(PlafondsTiersPayant.motifDeRefus("CNPS", 500.0, 200, 300).isPresent());
        assertTrue(PlafondsTiersPayant.motifDeRefus("CNPS", 500.0, 200, 301).isPresent());
    }
}
