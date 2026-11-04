package rest.service.calculation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.PrixReferenceType;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import rest.service.calculation.dto.CalculatedShare;
import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;
import rest.service.calculation.dto.TiersPayantLineOutput;
import rest.service.calculation.dto.TiersPayantPrixInput;

/**
 * Lot « base de calcul par tiers-payant » (Q2.5 du cas 2 du 03/11/2026), sur le moteur
 * {@link TiersPayantCalculationService#calculate}.
 *
 * <p>
 * Les ventes rejouees sont celles du banc ({@code outils/banc/peupler_banc.py}) : ventes assurance a un et a deux
 * tiers-payants, taux de 60 a 80 %, prix de vente des produits du banc, avec des prix de reference differents par
 * tiers-payant. La premiere serie ({@link RegleDuMinimum}) fige les resultats d'aujourd'hui, parametre a 0 : ils
 * doivent rester identiques au franc pres apres ce lot. La seconde ({@link BaseParTiersPayantActive}) exprime la regle
 * attendue avec le parametre a 1 : pour chaque tiers-payant, base = son propre prix de reference (ou le prix de vente
 * s'il n'en a pas) x quantite, taux propre, plafonds inchanges.
 */
class BaseParTiersPayantTest {

    private static final String A = "lien-A";
    private static final String B = "lien-B";

    /* ---------------------------------------------------------------- jeu d'essai, dans l'esprit du banc */

    private static TiersPayantInput tiersPayant(String lien, String nom, int taux, int priorite) {
        TiersPayantInput tp = new TiersPayantInput();
        tp.setClientTiersPayantId(lien);
        tp.setTiersPayantId("tp-" + lien);
        tp.setTiersPayantFullName(nom);
        tp.setTaux(taux / 100.0f);
        tp.setPriorite(priorite);
        return tp;
    }

    private static TiersPayantPrixInput reference(String lien, PrixReferenceType type, Integer prix, float taux) {
        TiersPayantPrixInput p = new TiersPayantPrixInput();
        p.setCompteTiersPayantId(lien);
        p.setOptionPrixType(type);
        p.setPrice(prix == null ? 0 : prix);
        p.setRate(taux);
        return p;
    }

    private static SaleItemInput ligne(String id, int prixUnitaire, int quantite, TiersPayantPrixInput... refs) {
        SaleItemInput l = new SaleItemInput();
        l.setSalesLineId(id);
        l.setQuantity(quantite);
        l.setRegularUnitPrice(BigDecimal.valueOf(prixUnitaire));
        l.setTotalSalesAmount(BigDecimal.valueOf((long) prixUnitaire * quantite));
        l.getPrixAssurances().addAll(Arrays.asList(refs));
        return l;
    }

    private static CalculationInput vente(boolean baseParTp, List<TiersPayantInput> tps, SaleItemInput... lignes) {
        CalculationInput in = new CalculationInput();
        in.setNatureVente(NatureVente.ASSURANCE);
        in.setDiscountAmount(BigDecimal.ZERO);
        in.setTiersPayants(new ArrayList<>(tps));
        in.setSaleItems(Arrays.asList(lignes));
        BigDecimal total = BigDecimal.ZERO;
        for (SaleItemInput l : lignes) {
            total = total.add(l.getTotalSalesAmount());
        }
        in.setTotalSalesAmount(total);
        in.setBasePrixReferenceParTiersPayant(baseParTp);
        return in;
    }

    private static CalculationResult calcul(CalculationInput in) {
        return new TiersPayantCalculationService().calculate(in);
    }

    private static int part(CalculationResult r, String lien) {
        for (TiersPayantLineOutput l : r.getTiersPayantLines()) {
            if (l.getClientTiersPayantId().equals(lien)) {
                return l.getMontant().intValue();
            }
        }
        throw new AssertionError("tiers-payant absent : " + lien);
    }

    private static CalculatedShare partLigne(CalculationResult r, String ligne) {
        return r.getItemShares().stream().filter(s -> s.getSaleLineId().equals(ligne)).findFirst().orElseThrow();
    }

    /** Un assure a deux tiers-payants (banc : taux 60 a 80 %) : A prioritaire a 70 %, B complementaire a 20 %. */
    private static List<TiersPayantInput> deuxTiersPayants() {
        return Arrays.asList(tiersPayant(B, "ASCOMA", 20, 2), tiersPayant(A, "MUGEF-CI", 70, 1));
    }

    private static List<TiersPayantInput> unTiersPayant() {
        return Arrays.asList(tiersPayant(A, "MUGEF-CI", 70, 1));
    }

    /* ------------------------------------------------------- serie 1 : resultats d'aujourd'hui, figes */

    @Nested
    @DisplayName("Parametre a 0 : regle du minimum, resultats d'aujourd'hui figes au franc pres")
    class RegleDuMinimum {

        @Test
        @DisplayName("Un tiers-payant sans reference : 70 % du prix de vente x quantite")
        void unTiersPayantSansReference() {
            CalculationResult r = calcul(vente(false, unTiersPayant(), ligne("l1", 3450, 2)));
            assertEquals(4830, part(r, A));
            assertEquals(4830, r.getTotalTiersPayant().intValue());
            assertEquals(2070, r.getTotalPatientShare().intValue());
            assertNull(partLigne(r, "l1").getCalculationBasePrice());
            assertFalse(r.isHasPriceOption());
        }

        @Test
        @DisplayName("Un tiers-payant avec reference MIX (3 000 a 70 %) : base 3 000 x 2")
        void unTiersPayantAvecReference() {
            CalculationResult r = calcul(vente(false, unTiersPayant(),
                    ligne("l1", 3450, 2, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 3000, 70))));
            assertEquals(4200, part(r, A));
            assertEquals(2700, r.getTotalPatientShare().intValue());
            assertEquals(3000, partLigne(r, "l1").getCalculationBasePrice());
            assertTrue(r.isHasPriceOption());
        }

        @Test
        @DisplayName("Deux tiers-payants, deux references differentes : le plus petit prix (3 000) sert aux deux")
        void deuxReferencesDifferentes() {
            CalculationResult r = calcul(vente(false, deuxTiersPayants(),
                    ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4000, 70),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            // A : 3 000 x 70 % = 2 100 ; B : 3 000 x 20 % = 600 (reste 900) ; client 5 000 - 2 700
            assertEquals(2100, part(r, A));
            assertEquals(600, part(r, B));
            assertEquals(2700, r.getTotalTiersPayant().intValue());
            assertEquals(2300, r.getTotalPatientShare().intValue());
            assertEquals(3000, partLigne(r, "l1").getCalculationBasePrice());
        }

        @Test
        @DisplayName("Deux tiers-payants, seul le complementaire a une reference : elle devient la base de A aussi")
        void referenceSurLeComplementaireSeulement() {
            CalculationResult r = calcul(vente(false, deuxTiersPayants(),
                    ligne("l1", 5000, 1, reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            // base 3 000 pour tous : A 2 100, B 600
            assertEquals(2100, part(r, A));
            assertEquals(600, part(r, B));
            assertEquals(2300, r.getTotalPatientShare().intValue());
        }

        @Test
        @DisplayName("Deux tiers-payants, A a 100 % sur sa reference : B n'a plus rien a prendre")
        void prioritaireA100PourCent() {
            List<TiersPayantInput> tps = Arrays.asList(tiersPayant(A, "CNAM CMU", 100, 1),
                    tiersPayant(B, "ASCOMA", 20, 2));
            CalculationResult r = calcul(
                    vente(false, tps, ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 3000, 100),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            assertEquals(3000, part(r, A));
            assertEquals(0, part(r, B));
            assertEquals(2000, r.getTotalPatientShare().intValue());
        }

        @Test
        @DisplayName("Reference de type TAUX : pas de prix propre, base = prix de vente, taux de la reference")
        void referenceDeTypeTaux() {
            CalculationResult r = calcul(vente(false, deuxTiersPayants(),
                    ligne("l1", 1250, 3, reference(A, PrixReferenceType.TAUX, null, 80))));
            // A : 3 750 x 80 % = 3 000 ; B : 3 750 x 20 % = 750 (reste 750)
            assertEquals(3000, part(r, A));
            assertEquals(750, part(r, B));
            assertEquals(0, r.getTotalPatientShare().intValue());
            assertNull(partLigne(r, "l1").getCalculationBasePrice());
            assertTrue(r.isHasPriceOption());
        }

        @Test
        @DisplayName("Vente a plusieurs lignes : chaque ligne garde sa base, les parts s'additionnent")
        void plusieursLignes() {
            CalculationResult r = calcul(vente(false, deuxTiersPayants(),
                    ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4000, 70),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20)),
                    ligne("l2", 3450, 2), ligne("l3", 1250, 3, reference(A, PrixReferenceType.TAUX, null, 80))));
            // l1 : A 2 100, B 600 ; l2 : A 4 830, B 1 380 (reste 2 070) ; l3 : A 3 000, B 750
            assertEquals(2100 + 4830 + 3000, part(r, A));
            assertEquals(600 + 1380 + 750, part(r, B));
            assertEquals(12660, r.getTotalTiersPayant().intValue());
            assertEquals(5000 + 6900 + 3750 - 12660, r.getTotalPatientShare().intValue());
        }

        @Test
        @DisplayName("Plafond par vente du lien : la part est ecretee apres le calcul de la base")
        void plafondParVente() {
            List<TiersPayantInput> tps = deuxTiersPayants();
            tps.get(1).setPlafondJournalierClient(BigDecimal.valueOf(1500)); // A
            CalculationResult r = calcul(
                    vente(false, tps, ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4000, 70),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            assertEquals(1500, part(r, A));
            assertEquals(600, part(r, B));
            assertEquals(2900, r.getTotalPatientShare().intValue());
            assertTrue(r.getWarningMessage().contains("MUGEF-CI"));
        }
    }

    /* ------------------------------------------------- serie 2 : regle attendue, parametre a 1 */

    @Nested
    @DisplayName("Parametre a 1 : base de chaque tiers-payant = son propre prix de reference")
    class BaseParTiersPayantActive {

        @Test
        @DisplayName("Sans reference, rien ne change : 70 % du prix de vente x quantite")
        void sansReferenceIdentique() {
            CalculationResult r0 = calcul(vente(false, deuxTiersPayants(), ligne("l1", 3450, 2)));
            CalculationResult r1 = calcul(vente(true, deuxTiersPayants(), ligne("l1", 3450, 2)));
            assertEquals(part(r0, A), part(r1, A));
            assertEquals(part(r0, B), part(r1, B));
            assertEquals(r0.getTotalPatientShare(), r1.getTotalPatientShare());
            assertEquals(4830, part(r1, A));
            assertEquals(1380, part(r1, B));
        }

        @Test
        @DisplayName("Un seul tiers-payant avec reference : identique a la regle du minimum")
        void unTiersPayantIdentique() {
            SaleItemInput l = ligne("l1", 3450, 2, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 3000, 70));
            CalculationResult r = calcul(vente(true, unTiersPayant(), l));
            assertEquals(4200, part(r, A));
            assertEquals(2700, r.getTotalPatientShare().intValue());
            assertEquals(3000, partLigne(r, "l1").getCalculationBasePrice());
        }

        @Test
        @DisplayName("Deux references differentes : A sur 4 000 a 70 %, B sur 3 000 a 20 %")
        void deuxReferencesDifferentes() {
            CalculationResult r = calcul(vente(true, deuxTiersPayants(),
                    ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4000, 70),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            assertEquals(2800, part(r, A));
            assertEquals(600, part(r, B));
            assertEquals(3400, r.getTotalTiersPayant().intValue());
            assertEquals(1600, r.getTotalPatientShare().intValue());
            // base affichee sur la ligne : celle du tiers-payant prioritaire
            assertEquals(4000, partLigne(r, "l1").getCalculationBasePrice());
            assertTrue(r.isHasPriceOption());
        }

        @Test
        @DisplayName("Seul le complementaire a une reference : A reste sur le prix de vente, B sur sa reference")
        void referenceSurLeComplementaireSeulement() {
            CalculationResult r = calcul(vente(true, deuxTiersPayants(),
                    ligne("l1", 5000, 1, reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            assertEquals(3500, part(r, A));
            assertEquals(600, part(r, B));
            assertEquals(900, r.getTotalPatientShare().intValue());
            assertEquals(3000, partLigne(r, "l1").getCalculationBasePrice());
        }

        @Test
        @DisplayName("Les parts ne depassent jamais le prix de la ligne : B est ramene a ce qui reste")
        void jamaisAuDelaDuPrixDeLaLigne() {
            List<TiersPayantInput> tps = Arrays.asList(tiersPayant(A, "CNAM CMU", 100, 1),
                    tiersPayant(B, "ASCOMA", 50, 2));
            CalculationResult r = calcul(
                    vente(true, tps, ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4500, 100),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 50))));
            assertEquals(4500, part(r, A));
            assertEquals(500, part(r, B)); // 1 500 attendus, 500 restants sur la ligne
            assertEquals(0, r.getTotalPatientShare().intValue());
        }

        @Test
        @DisplayName("Complementaire a 100 % sans reference : il prend ce qui reste du prix de vente")
        void complementaireA100SansReference() {
            List<TiersPayantInput> tps = Arrays.asList(tiersPayant(A, "MUGEF-CI", 70, 1),
                    tiersPayant(B, "CNAM CMU", 100, 2));
            CalculationResult r = calcul(
                    vente(true, tps, ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4000, 70))));
            assertEquals(2800, part(r, A));
            assertEquals(2200, part(r, B));
            assertEquals(0, r.getTotalPatientShare().intValue());
        }

        @Test
        @DisplayName("Reference de type TAUX : base = prix de vente, taux de la reference, comme aujourd'hui")
        void referenceDeTypeTaux() {
            CalculationResult r = calcul(vente(true, deuxTiersPayants(),
                    ligne("l1", 1250, 3, reference(A, PrixReferenceType.TAUX, null, 80))));
            assertEquals(3000, part(r, A));
            assertEquals(750, part(r, B));
            assertNull(partLigne(r, "l1").getCalculationBasePrice());
        }

        @Test
        @DisplayName("Quantite 3, deux references : chaque base est multipliee par la quantite")
        void quantiteMultiplieChaqueBase() {
            CalculationResult r = calcul(vente(true, deuxTiersPayants(),
                    ligne("l1", 1250, 3, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 1000, 70),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 800, 20))));
            assertEquals(2100, part(r, A)); // 3 000 x 70 %
            assertEquals(480, part(r, B)); // 2 400 x 20 %
            assertEquals(3750 - 2580, r.getTotalPatientShare().intValue());
        }

        @Test
        @DisplayName("Plafonds inchanges : le plafond par vente ecrete la part calculee sur la base propre")
        void plafondsInchanges() {
            List<TiersPayantInput> tps = deuxTiersPayants();
            tps.get(1).setPlafondJournalierClient(BigDecimal.valueOf(1500)); // A
            CalculationResult r = calcul(
                    vente(true, tps, ligne("l1", 5000, 1, reference(A, PrixReferenceType.MIX_TAUX_PRIX, 4000, 70),
                            reference(B, PrixReferenceType.MIX_TAUX_PRIX, 3000, 20))));
            assertEquals(1500, part(r, A));
            assertEquals(600, part(r, B));
            assertEquals(2900, r.getTotalPatientShare().intValue());
            assertTrue(r.getWarningMessage().contains("MUGEF-CI"));
        }
    }

    @Test
    @DisplayName("Le parametre ne vaut 1 que s'il vaut exactement 1")
    void lectureDuParametre() {
        assertTrue(BaseParTiersPayant.valeurActive("1"));
        assertTrue(BaseParTiersPayant.valeurActive(" 1 "));
        assertFalse(BaseParTiersPayant.valeurActive("0"));
        assertFalse(BaseParTiersPayant.valeurActive(null));
        assertFalse(BaseParTiersPayant.valeurActive("true"));
    }
}
