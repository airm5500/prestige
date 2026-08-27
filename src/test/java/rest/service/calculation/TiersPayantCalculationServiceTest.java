package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;

/**
 * Moteur de calcul de la part tiers payant : priorite entre le plafond du client, celui predefini par l'organisme et la
 * valeur zero, et sort du plafond de credit - qui ne s'ecrete plus mais refuse.
 */
class TiersPayantCalculationServiceTest {

    /** Une vente d'une ligne a 10 000, un organisme a 100 %. */
    private CalculationInput vente(TiersPayantInput organisme) {
        SaleItemInput ligne = new SaleItemInput();
        ligne.setSalesLineId("ligne-1");
        ligne.setQuantity(1);
        ligne.setRegularUnitPrice(BigDecimal.valueOf(10000));
        ligne.setTotalSalesAmount(BigDecimal.valueOf(10000));

        CalculationInput input = new CalculationInput();
        input.setNatureVente(NatureVente.CARNET);
        input.setDiscountAmount(BigDecimal.ZERO);
        input.setTotalSalesAmount(BigDecimal.valueOf(10000));
        input.setTiersPayants(Collections.singletonList(organisme));
        input.setSaleItems(Collections.singletonList(ligne));
        return input;
    }

    private TiersPayantInput organisme() {
        TiersPayantInput tp = new TiersPayantInput();
        tp.setClientTiersPayantId("lien-1");
        tp.setTiersPayantId("tp-1");
        tp.setTiersPayantFullName("MUGEFCI");
        tp.setTaux(1.0f);
        tp.setPriorite(1);
        return tp;
    }

    private BigDecimal partTiersPayant(CalculationResult resultat) {
        return resultat.getTiersPayantLines().get(0).getMontant();
    }

    @Test
    @DisplayName("Sans aucun plafond, l'organisme prend toute la part")
    void sansPlafond() {
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(organisme()));
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(10000)));
        assertTrue(r.getMotifsRefus().isEmpty());
    }

    @Test
    @DisplayName("Le plafond par vente du lien ecrete la part, le reste revient au client")
    void plafondParVenteEcrete() {
        TiersPayantInput tp = organisme();
        tp.setPlafondJournalierClient(BigDecimal.valueOf(6000));
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(6000)));
        assertTrue(r.getMotifsRefus().isEmpty());
    }

    @Test
    @DisplayName("Un plafond par vente a zero veut dire aucun plafond, pas un remboursement a zero")
    void plafondParVenteZero() {
        TiersPayantInput tp = organisme();
        tp.setPlafondJournalierClient(BigDecimal.ZERO);
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(10000)));
    }

    @Test
    @DisplayName("Le plafond d'encours du compte client s'applique une seule fois, deduction faite de la conso")
    void plafondEncoursClientDeduitLaConso() {
        TiersPayantInput tp = organisme();
        tp.setPlafondConso(BigDecimal.valueOf(8000));
        tp.setConsoMensuelle(BigDecimal.valueOf(5000));
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        // reste 3000 : la part est ecretee la, pas a 8000
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(3000)));
    }

    @Test
    @DisplayName("Plafond de credit de l'organisme depasse : la part n'est PAS ecretee, la vente est refusee")
    void plafondCreditRefuseSansEcreter() {
        TiersPayantInput tp = organisme();
        tp.setPlafondCreditTiersPayant(BigDecimal.valueOf(500));
        tp.setConsoGlobaleTiersPayant(BigDecimal.ZERO);
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        // la part reste la part reelle - l'ancien moteur l'aurait silencieusement ramenee a 500
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(10000)));
        assertEquals(1, r.getMotifsRefus().size());
        assertTrue(r.getMotifsRefus().get(0).contains("MUGEFCI"), r.getMotifsRefus().get(0));
    }

    @Test
    @DisplayName("Le plafond de credit tient compte de la consommation globale deja enregistree")
    void plafondCreditDeduitLaConsoGlobale() {
        TiersPayantInput tp = organisme();
        tp.setPlafondCreditTiersPayant(BigDecimal.valueOf(50000));
        tp.setConsoGlobaleTiersPayant(BigDecimal.valueOf(45000));
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        // reste 5000, part demandee 10000 : refus - l'ancien moteur laissait passer
        // (il comparait 10000 au plafond total de 50000, sans deduire les 45000 consommes)
        assertEquals(1, r.getMotifsRefus().size());
    }

    @Test
    @DisplayName("Encours suffisant : rien n'est refuse et la part reste entiere")
    void encoursSuffisant() {
        TiersPayantInput tp = organisme();
        tp.setPlafondCreditTiersPayant(BigDecimal.valueOf(50000));
        tp.setConsoGlobaleTiersPayant(BigDecimal.valueOf(30000));
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        assertTrue(r.getMotifsRefus().isEmpty());
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(10000)));
    }

    @Test
    @DisplayName("Priorite complete : plafond client, puis plafond par vente, et le credit en controle final")
    void prioritesComposees() {
        TiersPayantInput tp = organisme();
        tp.setPlafondConso(BigDecimal.valueOf(9000)); // encours client : reste 9000
        tp.setConsoMensuelle(BigDecimal.ZERO);
        tp.setPlafondJournalierClient(BigDecimal.valueOf(4000)); // plafond par vente
        tp.setPlafondCreditTiersPayant(BigDecimal.valueOf(100000));
        tp.setConsoGlobaleTiersPayant(BigDecimal.valueOf(97000)); // reste 3000 < 4000
        CalculationResult r = new TiersPayantCalculationService().calculate(vente(tp));
        // part ecretee au plafond par vente (4000)...
        assertEquals(0, partTiersPayant(r).compareTo(BigDecimal.valueOf(4000)));
        // ... mais l'encours de credit (3000) ne la couvre pas : refus
        assertEquals(1, r.getMotifsRefus().size());
    }
}
