package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dal.PrixReferenceType;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;
import rest.service.calculation.dto.TiersPayantPrixInput;

/**
 * Prix de reference et produits DETAIL (deconditionnes) en vente assurance.
 *
 * <p>
 * La regle verrouillee ici : <b>chaque ligne de vente est remboursee sur le prix de reference de SON propre
 * produit</b>. Un produit detail n'herite de rien : s'il porte son prix de reference, c'est celui-la qui sert de base ;
 * s'il n'en porte pas, la ligne retombe sur le prix pharmacie et le taux du compte, independamment de ce que porte le
 * produit principal vendu sur la meme vente.
 *
 * <p>
 * Le scenario reprend trait pour trait un cas monte sur une vraie base : DOLIPRANE 500MG CPR B/16 a 1210 F avec un prix
 * de reference de 1000 F au taux de 20 %, et LITACOLD CPR - le produit deconditionne - a 300 F avec un prix de
 * reference de 150 F au taux de 20 %, pour un compte tiers payant a 80 %.
 */
class PrixReferenceProduitDetailTest {

    private static final String COMPTE_TP = "00709d86-c9ff-43ec-96a2-c57fd71639bc";

    private final TiersPayantCalculationService service = new TiersPayantCalculationService();

    /** Une ligne de vente, avec ou sans prix de reference (prixReference a 0 = aucun). */
    private static SaleItemInput ligne(String id, int prixUnitaire, int prixReference, float tauxReference) {
        SaleItemInput item = new SaleItemInput();
        item.setSalesLineId(id);
        item.setQuantity(1);
        item.setRegularUnitPrice(BigDecimal.valueOf(prixUnitaire));
        item.setTotalSalesAmount(BigDecimal.valueOf(prixUnitaire));
        item.setDiscountAmount(BigDecimal.ZERO);
        if (prixReference > 0) {
            TiersPayantPrixInput prix = new TiersPayantPrixInput();
            prix.setCompteTiersPayantId(COMPTE_TP);
            prix.setPrice(prixReference);
            prix.setRate(tauxReference);
            prix.setOptionPrixType(PrixReferenceType.MIX_TAUX_PRIX);
            item.getPrixAssurances().add(prix);
        }
        return item;
    }

    private CalculationResult calculer(SaleItemInput... lignes) {
        TiersPayantInput tp = new TiersPayantInput();
        tp.setClientTiersPayantId(COMPTE_TP);
        tp.setTiersPayantId("10121016501918634491");
        tp.setTaux(0.80f);
        tp.setPriorite(1);

        CalculationInput input = new CalculationInput();
        input.setNatureVente(NatureVente.ASSURANCE);
        input.setDiscountAmount(BigDecimal.ZERO);
        input.setTiersPayants(new java.util.ArrayList<>(List.of(tp)));
        input.setSaleItems(Arrays.asList(lignes));
        input.setTotalSalesAmount(
                Arrays.stream(lignes).map(SaleItemInput::getTotalSalesAmount).reduce(BigDecimal.ZERO, BigDecimal::add));
        return service.calculate(input);
    }

    @Test
    void chaqueLigneUtiliseLePrixDeReferenceDeSonProduit() {
        // 1000 x 20 % = 200 pour le principal, 150 x 20 % = 30 pour le detail
        CalculationResult r = calculer(ligne("principal", 1210, 1000, 20f), ligne("detail", 300, 150, 20f));
        assertEquals(0, BigDecimal.valueOf(230).compareTo(r.getTotalTiersPayant()));
        assertEquals(0, BigDecimal.valueOf(1280).compareTo(r.getTotalPatientShare()));
    }

    @Test
    void sansPrixDeReferenceSurLeDetail_ceLuiDuPrincipalNeDeteintPas() {
        // 200 pour le principal, et le detail retombe sur 300 x 80 % = 240
        CalculationResult r = calculer(ligne("principal", 1210, 1000, 20f), ligne("detail", 300, 0, 0f));
        assertEquals(0, BigDecimal.valueOf(440).compareTo(r.getTotalTiersPayant()));
    }

    @Test
    void sansPrixDeReferenceSurLePrincipal_leDetailGardeLeSien() {
        // 1210 x 80 % = 968 pour le principal, et le detail garde 150 x 20 % = 30
        CalculationResult r = calculer(ligne("principal", 1210, 0, 0f), ligne("detail", 300, 150, 20f));
        assertEquals(0, BigDecimal.valueOf(998).compareTo(r.getTotalTiersPayant()));
    }

    @Test
    void aucunPrixDeReference_toutPasseAuTauxDuCompte() {
        // (1210 + 300) x 80 % = 1208
        CalculationResult r = calculer(ligne("principal", 1210, 0, 0f), ligne("detail", 300, 0, 0f));
        assertEquals(0, BigDecimal.valueOf(1208).compareTo(r.getTotalTiersPayant()));
    }

    @Test
    void leDetailEstRembourseSurSaQuantite() {
        SaleItemInput detail = ligne("detail", 300, 150, 20f);
        detail.setQuantity(4);
        detail.setTotalSalesAmount(BigDecimal.valueOf(1200));
        // 150 x 4 x 20 % = 120
        CalculationResult r = calculer(detail);
        assertEquals(0, BigDecimal.valueOf(120).compareTo(r.getTotalTiersPayant()));
    }
}
