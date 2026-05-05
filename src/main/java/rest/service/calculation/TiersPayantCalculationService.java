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
import java.util.Objects;
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

    private BigDecimal applyCeilings(BigDecimal partTiersPayantNet, TiersPayantInput tp, StringBuilder warnings) {
        BigDecimal finalAmount = computeThirdPartyPart(tp, partTiersPayantNet);
        if (finalAmount.compareTo(partTiersPayantNet) != 0) {
            warnings.append("Le montant remboursé pour le tiers payant ")
                    .append(" <span style='font-weight:900;color:blue;text-decoration: underline;'> ")
                    .append(tp.getTiersPayantFullName()).append("</span> a été plafonné à ")
                    .append(" <span style='font-weight:900;color:blue;text-decoration: underline;'> ")
                    .append(finalAmount).append("</span>.\n");
        }
        return finalAmount;
    }

    private BigDecimal computeThirdPartyPart(TiersPayantInput tp, BigDecimal partTiersPayantNet) {
        BigDecimal totalNetAmount = computePlafond(tp, partTiersPayantNet);// plafon

        return computePlafondClient(tp, totalNetAmount);
    }

    private BigDecimal computePlafondClient(TiersPayantInput tp, BigDecimal partTiersPayantNet) {
        BigDecimal totalNetAmount = computePlafond(tp, partTiersPayantNet);// plafon

        return computePlafondVente(tp.getPlafondJournalierClient(), totalNetAmount);
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
        BigDecimal plafondCreditTiersPayant = tp.getPlafondCreditTiersPayant();// plafond sur la fiche tp
        BigDecimal conso = tp.getConsoMensuelle();

        if (Objects.nonNull(plafondCreditTiersPayant) && plafondCreditTiersPayant.compareTo(BigDecimal.ZERO) > 0) {
            partTiersPayantNet = partTiersPayantNet.min(plafondCreditTiersPayant);

        }

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
