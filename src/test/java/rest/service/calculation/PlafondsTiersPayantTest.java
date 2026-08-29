package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Plafonds portes par la fiche du tiers payant : heritage du plafond par vente a la creation du lien client, et
 * ecretage de la part tiers payant a ce qu'il reste du plafond de credit (la difference passe au client, plus de refus
 * de vente).
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
    @DisplayName("Sans plafond de credit, aucun encours n'est calcule et rien n'est ecrete")
    void sansPlafondDeCredit() {
        assertTrue(PlafondsTiersPayant.encoursRestant(null, 100000).isEmpty());
        assertTrue(PlafondsTiersPayant.encoursRestant(0.0, 100000).isEmpty());
        assertEquals(BigDecimal.valueOf(1000000),
                PlafondsTiersPayant.partEcreteeAuCredit(null, 100000, BigDecimal.valueOf(1000000)));
        assertEquals(BigDecimal.valueOf(1000000),
                PlafondsTiersPayant.partEcreteeAuCredit(0.0, 100000, BigDecimal.valueOf(1000000)));
    }

    @Test
    @DisplayName("L'encours restant deduit la consommation deja enregistree")
    void encoursDeduitLaConsommation() {
        assertEquals(BigDecimal.valueOf(300.0), PlafondsTiersPayant.encoursRestant(500.0, 200).orElseThrow());
        // consommation inconnue = zero
        assertEquals(BigDecimal.valueOf(500.0), PlafondsTiersPayant.encoursRestant(500.0, null).orElseThrow());
    }

    @Test
    @DisplayName("Le cas rapporte : plafond 500, part de 1000 - ecretee a 500, la difference revient au client")
    void venteSuperieureAuPlafond() {
        assertEquals(0, PlafondsTiersPayant.partEcreteeAuCredit(500.0, 0, BigDecimal.valueOf(1000))
                .compareTo(BigDecimal.valueOf(500)));
    }

    @Test
    @DisplayName("Un encours anterieur au plafond compte : l'organisme deja au plafond ne rembourse plus rien")
    void encoursAnterieurPrisEnCompte() {
        // plafond pose apres coup ; la conso etait deja de 600 : la part descend a zero, jamais en negatif
        assertEquals(0, PlafondsTiersPayant.partEcreteeAuCredit(500.0, 600, BigDecimal.ONE).compareTo(BigDecimal.ZERO));
    }

    @Test
    @DisplayName("La part qui tient exactement dans l'encours restant passe entiere")
    void partExactementDansLEncours() {
        assertEquals(0, PlafondsTiersPayant.partEcreteeAuCredit(500.0, 200, BigDecimal.valueOf(300))
                .compareTo(BigDecimal.valueOf(300)));
        assertEquals(0, PlafondsTiersPayant.partEcreteeAuCredit(500.0, 200, BigDecimal.valueOf(301))
                .compareTo(BigDecimal.valueOf(300)));
    }
}
