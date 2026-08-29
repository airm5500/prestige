package rest.service.calculation;

import dal.PrixReferenceType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.collections4.CollectionUtils;
import rest.service.calculation.dto.CalculatedShare;
import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import dal.Rate;
import javax.ejb.Stateless;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;
import rest.service.calculation.dto.TiersPayantLineOutput;
import rest.service.calculation.dto.TiersPayantPrixInput;

@Stateless
public class TiersPayantCalculationService {

    public CalculationResult calculate(CalculationInput input) {
        CalculationResult calculationResult = new CalculationResult();

        if (CollectionUtils.isEmpty(input.getSaleItems())) {
            return calculationResult;
        }
        BigDecimal totalAmountAssurance = BigDecimal.ZERO;

        BigDecimal discountAmount = BigDecimal.ZERO;
        Map<String, BigDecimal> tiersPayants = new HashMap<>();
        for (SaleItemInput saleItemInput : input.getSaleItems()) {
            CalculatedShare itemShare = calculateSaleItem(saleItemInput, input.getTiersPayants(),
                    input.getNatureVente());

            totalAmountAssurance = totalAmountAssurance.add(itemShare.getTotalReimbursedAmount());
            discountAmount = discountAmount.add(saleItemInput.getDiscountAmount());

            itemShare.getTiersPayants().forEach((clientTiersPayantId, montant) -> tiersPayants
                    .merge(clientTiersPayantId, montant, BigDecimal::add));
            calculationResult.getItemShares().add(itemShare);
        }
        calculationResult.setDiscountAmount(discountAmount.setScale(0, RoundingMode.HALF_UP));
        calculationResult.setTotalSaleAmount(input.getTotalSalesAmount().setScale(0, RoundingMode.HALF_UP));
        List<TiersPayantLineOutput> lineOutputs = new ArrayList<>();
        StringBuilder warnings = new StringBuilder();
        for (TiersPayantInput tpInput : input.getTiersPayants()) {

            BigDecimal remainingAmountForTps = tiersPayants.getOrDefault(tpInput.getClientTiersPayantId(),
                    BigDecimal.ZERO);
            remainingAmountForTps = remainingAmountForTps.setScale(0, RoundingMode.HALF_UP);

            BigDecimal actualShare = applyCeilings(remainingAmountForTps, tpInput, warnings);

            totalAmountAssurance = totalAmountAssurance.add(actualShare).subtract(remainingAmountForTps);
            totalAmountAssurance = totalAmountAssurance.setScale(0, RoundingMode.HALF_UP);
            TiersPayantLineOutput lineOutput = new TiersPayantLineOutput();
            lineOutput.setClientTiersPayantId(tpInput.getClientTiersPayantId());
            lineOutput.setMontant(actualShare);
            lineOutput.setFinalTaux(calculateFinalTaux(actualShare, calculationResult.getTotalSaleAmount()));
            // Taux effectivement UTILISE par le calcul (contractuel ou saisi par la caisse) : c'est
            // lui qui doit etre memorise sur la ligne de vente et imprime sur le ticket. Le taux
            // effectif ci-dessus (part ecretee / total) ne doit JAMAIS etre reecrit comme taux de la
            // ligne : chaque recalcul le reprendrait comme taux contractuel et degraderait la part a
            // chaque modification de produit (100 -> 92 -> 85...), en figeant le resultat meme apres
            // un relevement de plafond.
            lineOutput.setTauxApplique(Math.round(tpInput.getTaux() * 100));
            lineOutput.setNumBon(tpInput.getNumBon());
            lineOutputs.add(lineOutput);
        }
        calculationResult.setTotalTiersPayant(totalAmountAssurance);
        calculationResult.setTiersPayantLines(lineOutputs);
        BigDecimal partAssure = calculatePatientShare(calculationResult, input.getNatureVente());
        calculationResult.setTotalPatientShare(partAssure);

        calculationResult.setWarningMessage(warnings.toString());
        return calculationResult;
    }

    /**
     * Applique les trois plafonds dans l'ordre - encours du compte client, plafond par vente du lien, credit de
     * l'organisme - en ECRETANT la part a chaque fois (jamais de refus de vente), et nomme dans l'avertissement LE
     * plafond qui a joue, avec la difference laissee a la charge du client.
     */
    private BigDecimal applyCeilings(BigDecimal partTiersPayantNet, TiersPayantInput tp, StringBuilder warnings) {
        BigDecimal apresEncours = computePlafond(tp, partTiersPayantNet);
        if (apresEncours.compareTo(partTiersPayantNet) < 0) {
            BigDecimal reste = tp.getPlafondConso().subtract(tp.getConsoMensuelle()).max(BigDecimal.ZERO);
            avertissement(warnings, "Plafond encours atteint", tp.getTiersPayantFullName(), partTiersPayantNet,
                    apresEncours, "dépasse ce qu'il reste de son plafond d'encours (" + format(reste) + " sur "
                            + format(tp.getPlafondConso()) + ")");
        }

        BigDecimal apresVente = computePlafondVente(tp.getPlafondJournalierClient(), apresEncours);
        if (apresVente.compareTo(apresEncours) < 0) {
            avertissement(warnings, "Plafond vente atteint", tp.getTiersPayantFullName(), apresEncours, apresVente,
                    "dépasse son plafond par vente (" + format(tp.getPlafondJournalierClient()) + ")");
        }

        BigDecimal apresCredit = PlafondsTiersPayant.partEcreteeAuCredit(
                tp.getPlafondCreditTiersPayant() != null ? tp.getPlafondCreditTiersPayant().doubleValue() : null,
                tp.getConsoGlobaleTiersPayant(), apresVente);
        if (apresCredit.compareTo(apresVente) < 0) {
            BigDecimal resteCredit = tp.getPlafondCreditTiersPayant()
                    .subtract(
                            tp.getConsoGlobaleTiersPayant() == null ? BigDecimal.ZERO : tp.getConsoGlobaleTiersPayant())
                    .max(BigDecimal.ZERO);
            avertissement(warnings, "Plafond crédit atteint", tp.getTiersPayantFullName(), apresVente, apresCredit,
                    "dépasse ce qu'il reste de son plafond de crédit (" + format(resteCredit) + " sur "
                            + format(tp.getPlafondCreditTiersPayant()) + ")");
        }
        return apresCredit;
    }

    private void avertissement(StringBuilder warnings, String plafond, String tiersPayant, BigDecimal avant,
            BigDecimal apres, String detail) {
        warnings.append("⚠ ").append(plafond).append(", la part du tiers payant ")
                .append(" <span style='font-weight:900;color:blue;text-decoration: underline;'> ").append(tiersPayant)
                .append("</span> (").append(format(avant)).append(") ").append(detail)
                .append(". Sa part est ramenée à ")
                .append(" <span style='font-weight:900;color:blue;text-decoration: underline;'> ").append(format(apres))
                .append("</span> ; la différence de ").append(" <span style='font-weight:900;color:red;'> ")
                .append(format(avant.subtract(apres)))
                .append("</span> sera payée en espèces ou par un autre règlement.\n");
    }

    private String format(BigDecimal montant) {
        return montant == null ? "0" : montant.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private BigDecimal computePlafondVente(BigDecimal plafondVente, BigDecimal totalNetAmount) {
        if (totalNetAmount == null) {
            return BigDecimal.ZERO;
        }
        if (plafondVente == null || plafondVente.compareTo(BigDecimal.ZERO) == 0) {
            return totalNetAmount;
        }
        return totalNetAmount.min(plafondVente);
    }

    private BigDecimal computePlafond(TiersPayantInput tp, BigDecimal partTiersPayantNet) {
        if (partTiersPayantNet == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal plafond = tp.getPlafondConso();
        BigDecimal conso = tp.getConsoMensuelle();

        // Le plafond de credit de la fiche de l'organisme n'ecrete plus la part ici : il etait
        // applique sans deduire la consommation globale, et un depassement doit REFUSER la vente,
        // pas reporter silencieusement la difference sur le client (voir calculate()).

        if (plafond == null || plafond.compareTo(BigDecimal.ZERO) == 0) {
            return partTiersPayantNet; // Pas de plafond → on rembourse tout
        }

        // Si déjà au plafond ou au-delà → rien
        if (conso.compareTo(plafond) >= 0) {
            return BigDecimal.ZERO;
        }
        // Reste disponible avant plafond
        BigDecimal reste = plafond.subtract(conso);

        // On rembourse au maximum la part demandée, sinon le reste disponible
        return partTiersPayantNet.min(reste);
    }

    private CalculatedShare calculateSaleItem(SaleItemInput saleItem, List<TiersPayantInput> tiersPayantInputs,
            NatureVente natureVente) {
        tiersPayantInputs.sort(Comparator.comparingInt(tp -> tp.getPriorite()));

        CalculatedShare itemShare = new CalculatedShare();
        itemShare.setPharmacyPrice(saleItem.getRegularUnitPrice());
        itemShare.setSaleLineId(saleItem.getSalesLineId());
        itemShare.setDiscountAmount(saleItem.getDiscountAmount());
        BigDecimal totalPartTiersPayant = BigDecimal.ZERO;
        int prixReference = saleItem.getPrixAssurances().stream()
                .filter(p -> p.getOptionPrixType() != PrixReferenceType.TAUX).mapToInt(TiersPayantPrixInput::getPrice)
                .min().orElse(0);
        boolean hasPrixReference = prixReference > 0;
        boolean hasOptionPrix = !saleItem.getPrixAssurances().isEmpty();
        BigDecimal calculationBaseUni = hasPrixReference ? BigDecimal.valueOf(prixReference)
                : itemShare.getPharmacyPrice();
        BigDecimal calculationBase = calculationBaseUni.multiply(BigDecimal.valueOf(saleItem.getQuantity()));
        itemShare.setCalculationBasePrice(hasPrixReference ? calculationBaseUni.intValue() : null);
        for (TiersPayantInput tiersPayantInput : tiersPayantInputs) {

            float rate = tiersPayantInput.getTaux();
            if (hasOptionPrix) {
                TiersPayantPrixInput tiersPayantPrixInput = saleItem.getPrixAssurances().stream()
                        .filter(p -> p.getCompteTiersPayantId().equals(tiersPayantInput.getClientTiersPayantId()))
                        .findFirst().orElse(null);

                if (tiersPayantPrixInput != null
                        && tiersPayantPrixInput.getOptionPrixType() != PrixReferenceType.PRIX_REFERENCE) {
                    rate = tiersPayantPrixInput.getRate() / 100.0f;
                    itemShare.getRates()
                            .add(new Rate(saleItem.getSalesLineId(), tiersPayantInput.getClientTiersPayantId(), rate));

                }
            }
            BigDecimal remainingAmountForTps = calculationBase.subtract(totalPartTiersPayant);
            if (remainingAmountForTps.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal actualShare = calculationBase.multiply(BigDecimal.valueOf(rate));
            /*
             * if (rate == 1.0f && natureVente == NatureVente.ASSURANCE) { // formulle confort remainingAmountForTps =
             * saleItem.getTotalSalesAmount().subtract(totalPartTiersPayant); actualShare =
             * BigDecimal.ZERO.max(remainingAmountForTps); } else { actualShare =
             * actualShare.min(remainingAmountForTps); }
             */

            if (rate == 1.0f && natureVente == NatureVente.ASSURANCE && !hasPrixReference) {
                remainingAmountForTps = saleItem.getTotalSalesAmount().subtract(totalPartTiersPayant);
                actualShare = remainingAmountForTps.max(BigDecimal.ZERO);
            } else {
                actualShare = actualShare.min(remainingAmountForTps);
            }

            totalPartTiersPayant = totalPartTiersPayant.add(actualShare);

            itemShare.getTiersPayants().put(tiersPayantInput.getClientTiersPayantId(), actualShare);
        }
        itemShare.setTotalReimbursedAmount(totalPartTiersPayant);

        return itemShare;
    }

    private BigDecimal calculatePatientShare(CalculationResult calculationResult, NatureVente nature) {
        if (nature == NatureVente.ASSURANCE) {

            BigDecimal patientPart = calculationResult.getTotalSaleAmount()
                    .subtract(calculationResult.getTotalTiersPayant()).subtract(calculationResult.getDiscountAmount())
                    .setScale(0, RoundingMode.HALF_UP);
            return patientPart.max(BigDecimal.ZERO);
        }
        if (nature == NatureVente.CARNET) {
            BigDecimal netAmount = calculationResult.getTotalSaleAmount()
                    .subtract(calculationResult.getTotalTiersPayant()).max(BigDecimal.ZERO)
                    .setScale(0, RoundingMode.HALF_UP);
            BigDecimal partTiersPayant = calculationResult.getTotalTiersPayant()
                    .subtract(calculationResult.getDiscountAmount()).max(BigDecimal.ZERO)
                    .setScale(0, RoundingMode.HALF_UP);
            calculationResult.setTotalTiersPayant(partTiersPayant);
            calculationResult.getTiersPayantLines().get(0).setMontant(partTiersPayant);
            return netAmount.max(BigDecimal.ZERO);
        }

        return calculationResult.getTotalSaleAmount().setScale(0, RoundingMode.HALF_UP);
    }

    private int calculateFinalTaux(BigDecimal actualShare, BigDecimal totalAmount) {
        if (totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }

        return actualShare.multiply(BigDecimal.valueOf(100)).divide(totalAmount, 0, RoundingMode.HALF_DOWN).intValue();
    }
}
