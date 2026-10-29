package rest.service.impl;

import commonTasks.dto.MontantAPaye;
import commonTasks.dto.MontantTp;
import commonTasks.dto.SalesParams;
import commonTasks.dto.TiersPayantParams;
import dal.Caution;
import dal.TCompteClientTiersPayant;
import dal.TFamille;
import dal.TGrilleRemise;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TRemise;
import dal.TTiersPayant;
import dal.TTypeVente;
import dal.TWorkflowRemiseArticle;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import rest.service.PrixReferenceService;
import rest.service.SalesNetComputingService;
import rest.service.calculation.TiersPayantCalculationService;
import rest.service.calculation.dto.CalculationInput;
import rest.service.calculation.dto.CalculationResult;
import rest.service.calculation.dto.NatureVente;
import rest.service.calculation.dto.SaleItemInput;
import rest.service.calculation.dto.TiersPayantInput;
import rest.service.calculation.dto.TiersPayantLineOutput;
import rest.service.calculation.dto.TiersPayantPrixInput;
import rest.service.dto.NetComputingDTO;
import util.Constant;
import util.NumberUtils;

/**
 *
 * @author koben
 */
@Stateless
public class SalesNetComputingServiceImpl implements SalesNetComputingService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private PrixReferenceService prixReferenceService;
    @EJB
    private TiersPayantCalculationService tiersPayantCalculationService;

    private MontantAPaye computeRemise(TPreenregistrement op, TRemise oTRemise,
            List<TPreenregistrementDetail> lstTPreenregistrementDetail) {
        return computeRemise(op, oTRemise, lstTPreenregistrementDetail, null);
    }

    /**
     * @param partsClient
     *            vente assurance : part client de chaque ligne (prix de la ligne - part des organismes sur la ligne),
     *            base de la remise du produit ; null : la remise porte sur le prix de la ligne (carnet).
     */
    private MontantAPaye computeRemise(TPreenregistrement op, TRemise oTRemise,
            List<TPreenregistrementDetail> lstTPreenregistrementDetail, Map<String, Integer> partsClient) {

        int montantNet;
        int totalRemise = 0;
        int totalRemisePara = 0;
        int totalAmount = 0;
        int marge = 0;
        int montantTva = 0;
        int montantAccount = 0;

        List<MontantTp> montantTps = new ArrayList<>();
        MontantAPaye aPaye = new MontantAPaye();
        for (TPreenregistrementDetail x : lstTPreenregistrementDetail) {
            totalAmount += x.getIntPRICE();
            TFamille famille = x.getLgFAMILLEID();
            int remise = 0;
            if (Objects.nonNull(oTRemise) && !StringUtils.isEmpty(famille.getStrCODEREMISE())
                    && !famille.getStrCODEREMISE().equals("2") && !famille.getStrCODEREMISE().equals("3")) {
                TGrilleRemise grilleRemise = grilleRemiseRemiseFromWorkflow(x.getLgPREENREGISTREMENTID(), famille,
                        oTRemise.getLgREMISEID());
                if (grilleRemise != null) {
                    int base = partsClient == null ? x.getIntPRICE()
                            : partsClient.getOrDefault(x.getLgPREENREGISTREMENTDETAILID(), x.getIntPRICE());
                    remise = (int) ((base * grilleRemise.getDblTAUX()) / 100);
                    if (!x.getBoolACCOUNT()) {
                        totalRemisePara += remise;
                    }
                    totalRemise += remise;
                    x.setLgGRILLEREMISEID(grilleRemise.getLgGRILLEREMISEID());
                }
                x.setIntPRICEREMISE(remise);
                em.merge(x);
            } else if (partsClient != null && Objects.nonNull(oTRemise)) {
                // produit non remisable : aucune remise, meme si la ligne en portait une
                x.setIntPRICEREMISE(0);
                em.merge(x);
            }

            if (x.getLgFAMILLEID().getBoolACCOUNT()) {
                int thatMarge = (x.getIntPRICE() - remise - x.getMontantTva())
                        - (x.getIntQUANTITY() * famille.getIntPAF());
                marge += thatMarge;
                montantAccount += x.getIntPRICE();
                montantTva += x.getMontantTva();

            }
        }

        montantNet = totalAmount - totalRemise;
        op.setIntPRICE(totalAmount);
        op.setIntACCOUNT(montantAccount);
        op.setIntPRICEREMISE(totalRemise);
        op.setIntREMISEPARA(totalRemisePara);
        op.setMontantTva(montantTva);
        if (totalRemise > 0 && oTRemise == null) {
            op.setRemise(oTRemise);
        }
        aPaye.setMontant(totalAmount);
        aPaye.setMontantNet(montantNet);
        aPaye.setMontantTp(0);
        aPaye.setRemise(totalRemise);
        aPaye.setMarge(marge);
        aPaye.setMontantTva(montantTva);
        aPaye.setMontantTierspayants(montantTps);
        return aPaye;

    }

    private TGrilleRemise grilleRemiseRemiseFromWorkflow(TPreenregistrement op, TFamille familleP, String remiseId) {
        int intCodeRemise;
        TGrilleRemise oTGrilleRemise;
        try {
            TWorkflowRemiseArticle oRemiseArticle = findByArticleRemise(familleP.getStrCODEREMISE());
            if (oRemiseArticle == null) {
                return null;
            }
            if ((op.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Constant.VENTE_ASSURANCE_ID))
                    || (op.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Constant.VENTE_AVEC_CARNET))) {
                intCodeRemise = oRemiseArticle.getStrCODEGRILLEVO();
                oTGrilleRemise = (TGrilleRemise) em.createQuery(
                        "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1  AND t.strSTATUT = ?2  AND t.lgREMISEID.lgREMISEID = ?3 ")
                        .setParameter(1, intCodeRemise).setParameter(2, Constant.STATUT_ENABLE)
                        .setParameter(3, remiseId).getSingleResult();

                return oTGrilleRemise;
            } else {
                intCodeRemise = oRemiseArticle.getStrCODEGRILLEVNO();
                oTGrilleRemise = (TGrilleRemise) em.createQuery(
                        "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE  = ?1  AND t.strSTATUT = ?2 AND t.lgREMISEID.lgREMISEID = ?3 ")
                        .setParameter(1, intCodeRemise).setParameter(2, Constant.STATUT_ENABLE)
                        .setParameter(3, remiseId).getSingleResult();
                return oTGrilleRemise;
            }

        } catch (Exception e) {
            return null;
        }

    }

    private TWorkflowRemiseArticle findByArticleRemise(String strCODEREMISE) {
        if (StringUtils.isEmpty(strCODEREMISE)) {
            return null;

        }
        try {
            TypedQuery<TWorkflowRemiseArticle> q = em.createQuery(
                    "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEREMISEARTICLE = ?1  AND t.strSTATUT = ?2 ",
                    TWorkflowRemiseArticle.class);
            q.setParameter(1, strCODEREMISE).setParameter(2, Constant.STATUT_ENABLE);
            q.setMaxResults(1);
            return q.getSingleResult();

        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public MontantAPaye computeVONet(SalesParams params) {
        return calcule(params);

    }

    private NetComputingDTO computeCaution(TiersPayantParams tierspayant, TTiersPayant payant, TPreenregistrement op) {
        int montantTp;
        Caution c = payant.getCaution();
        int caution = c.getMontant();
        int montantPaye = op.getIntPRICE() - op.getIntPRICEREMISE();
        if (caution >= montantPaye) {
            montantTp = montantPaye;
        } else {
            montantTp = caution;
        }
        NetComputingDTO netComputing = new NetComputingDTO();
        netComputing.setIdCompteClientTiersPayant(tierspayant.getCompteTp());
        netComputing.setPlafondVente(0);
        netComputing.setMontantTiersPayant(montantTp);
        netComputing.setPlafondGlobal(0);
        netComputing.setNumBon(tierspayant.getNumBon());
        op.setCaution(c);
        return netComputing;

    }

    private MontantAPaye calculNetAvecCaution(MontantAPaye aPaye, TPreenregistrement op, SalesParams params,
            TTiersPayant payant) {
        MontantAPaye montantAPaye = new MontantAPaye();
        TiersPayantParams tierspayant = params.getTierspayants().get(0);
        NetComputingDTO netComputing = computeCaution(tierspayant, payant, op);
        int custPart = (op.getIntPRICE() - op.getIntPRICEREMISE()) - netComputing.getMontantTiersPayant();
        op.setIntCUSTPART(custPart);
        em.merge(op);
        montantAPaye.setRemise(op.getIntPRICEREMISE());
        montantAPaye.setMontantNet(NumberUtils.arrondiModuloOfNumber(op.getIntCUSTPART(), 5));
        montantAPaye.setMontant(op.getIntPRICE());
        montantAPaye.setMarge(aPaye.getMarge());
        montantAPaye.setMontantTva(aPaye.getMontantTva());
        montantAPaye.setMontantTp(netComputing.getMontantTiersPayant());
        TiersPayantParams tp = new TiersPayantParams();
        tp.setCompteTp(tierspayant.getCompteTp());
        tp.setTaux(100);
        tp.setNumBon(tierspayant.getNumBon());
        tp.setTpnet(montantAPaye.getMontantTp());
        montantAPaye.getTierspayants().add(tp);
        return montantAPaye;
    }

    private MontantAPaye calcule(SalesParams params) {
        TPreenregistrement op = em.find(TPreenregistrement.class, params.getVenteId());
        boolean isCarnet = Constant.VENTE_AVEC_CARNET.equals(op.getLgTYPEVENTEID().getLgTYPEVENTEID());

        TRemise remise = op.getRemise();
        remise = remise != null ? remise : op.getClient().getRemise();
        Collection<TPreenregistrementDetail> tPreenregistrementDetailCollection = op
                .getTPreenregistrementDetailCollection();
        if (CollectionUtils.isEmpty(tPreenregistrementDetailCollection)) {
            return new MontantAPaye();
        }
        List<TPreenregistrementDetail> items = new ArrayList<>(tPreenregistrementDetailCollection);
        List<TPreenregistrementCompteClientTiersPayent> compteClientTiersPayents = new ArrayList<>(
                op.getTPreenregistrementCompteClientTiersPayentCollection());
        Map<String, List<TiersPayantParams>> tpsBons = params.getTierspayants().stream()
                .collect(Collectors.groupingBy(TiersPayantParams::getCompteTp));
        MontantAPaye montantAPaye;
        CalculationResult output;
        if (isCarnet) {
            montantAPaye = computeRemise(op, remise, items);
            TCompteClientTiersPayant tc = compteClientTiersPayents.get(0).getLgCOMPTECLIENTTIERSPAYANTID();
            TTiersPayant tTiersPayant = tc.getLgTIERSPAYANTID();
            if (tTiersPayant.hasCaution()) {
                return calculNetAvecCaution(montantAPaye, op, params, tTiersPayant);
            }
            CalculationInput input = buildCalculationInput(op, items, compteClientTiersPayents, tpsBons);
            input.setDiscountAmount(
                    BigDecimal.valueOf(Objects.requireNonNullElse(montantAPaye.getMontantAccount(), 0)));
            output = tiersPayantCalculationService.calculate(input);
            op.setIntCUSTPART(output.getTotalPatientShare().intValue());
        } else {
            output = tiersPayantCalculationService
                    .calculate(buildCalculationInput(op, items, compteClientTiersPayents, tpsBons));
            montantAPaye = remiseSurPartClient(op, remise, items, output);
        }

        Map<String, List<TPreenregistrementCompteClientTiersPayent>> maps = compteClientTiersPayents.stream().collect(
                Collectors.groupingBy(e -> e.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTTIERSPAYANTID()));

        for (TiersPayantLineOutput lineResult : output.getTiersPayantLines()) {
            TPreenregistrementCompteClientTiersPayent venteTiersPayantItem = maps
                    .get(lineResult.getClientTiersPayantId()).get(0);

            if (output.isHasPriceOption()) {
                TCompteClientTiersPayant tcctp = venteTiersPayantItem.getLgCOMPTECLIENTTIERSPAYANTID();
                venteTiersPayantItem.setIntPERCENT(tcctp.getIntPOURCENTAGE());
            } else {
                // Taux UTILISE par le calcul, jamais le taux effectif (part ecretee / total) :
                // ecrire ce dernier degradait le taux a chaque recalcul (100 -> 92 -> 85...),
                // faisait deriver les montants a chaque modification de produit et figeait la
                // part meme apres relevement d'un plafond. Le ticket retrouve aussi le taux
                // contractuel (100 % en carnet).
                venteTiersPayantItem.setIntPERCENT(lineResult.getTauxApplique());
            }
            venteTiersPayantItem.setIntPRICE(lineResult.getMontant().intValue());
            venteTiersPayantItem.setStrREFBON(lineResult.getNumBon());

            em.merge(venteTiersPayantItem);
            TiersPayantParams tp = new TiersPayantParams();
            tp.setTaux(venteTiersPayantItem.getIntPERCENT());
            tp.setCompteTp(lineResult.getClientTiersPayantId());
            tp.setNumBon(venteTiersPayantItem.getStrREFBON());
            tp.setTpnet(venteTiersPayantItem.getIntPRICE());
            montantAPaye.getTierspayants().add(tp);

        }
        for (TPreenregistrementDetail saleLine : items) {

            output.getItemShares().stream()
                    .filter(s -> s.getSaleLineId().equals(saleLine.getLgPREENREGISTREMENTDETAILID())).findFirst()
                    .ifPresent(itemShare -> {
                        saleLine.setCalculationBasePrice(itemShare.getCalculationBasePrice());
                        em.merge(saleLine);
                        itemShare.getRates().forEach(em::persist);
                    });
        }
        op.setHasPriceOption(output.isHasPriceOption());
        em.merge(op);
        montantAPaye.setMontantTp(output.getTotalTiersPayant().intValue());

        montantAPaye.setMontantNet(NumberUtils.arrondiModuloOfNumber(op.getIntCUSTPART(), 5));
        // Plus de motifs de refus : tous les plafonds (compte, par vente, credit de l'organisme)
        // ECRETENT la part tiers payant, et l'avertissement dit la difference laissee au client.
        String messagePlafonds = output.getWarningMessage();
        montantAPaye.setRestructuring(StringUtils.isNoneEmpty(messagePlafonds));
        montantAPaye.setMessage(messagePlafonds);

        return montantAPaye;

    }

    private List<SaleItemInput> buildSaleItemInputs(List<TPreenregistrementDetail> items, CalculationInput input,
            Set<String> tiersPayantIds, List<TiersPayantInput> tiersPayantInputs) {

        return items.stream().map(sl -> {
            SaleItemInput si = new SaleItemInput();
            TFamille produit = sl.getLgFAMILLEID();
            si.setSalesLineId(sl.getLgPREENREGISTREMENTDETAILID());
            si.setTotalSalesAmount(BigDecimal.valueOf(sl.getIntPRICE()));
            si.setQuantity(sl.getIntQUANTITY());
            si.setDiscountAmount(BigDecimal.valueOf(Objects.requireNonNullElse(sl.getIntPRICEREMISE(), 0)));
            si.setRegularUnitPrice(BigDecimal.valueOf(sl.getIntPRICEUNITAIR()));
            input.setTotalSalesAmount(Objects.requireNonNullElse(input.getTotalSalesAmount(), BigDecimal.ZERO)
                    .add(si.getTotalSalesAmount()));
            this.prixReferenceService.getActifByProduitIdAndTiersPayantIds(produit.getLgFAMILLEID(), tiersPayantIds)
                    .forEach(prixRef -> {

                        TTiersPayant pt = prixRef.getTiersPayant();
                        tiersPayantInputs.forEach(cl -> {
                            if (cl.getTiersPayantId().equals(pt.getLgTIERSPAYANTID())) {
                                TiersPayantPrixInput pi = new TiersPayantPrixInput();
                                pi.setCompteTiersPayantId(cl.getClientTiersPayantId());
                                pi.setPrice(prixRef.getValeur());
                                if (Objects.isNull(prixRef.getValeurTaux())) {
                                    pi.setRate(100.0f);
                                } else {
                                    pi.setRate(prixRef.getValeurTaux());
                                }

                                pi.setOptionPrixType(prixRef.getType());
                                si.getPrixAssurances().add(pi);
                            }

                        });

                    });

            return si;
        }).collect(Collectors.toList());
    }

    private CalculationInput buildCalculationInput(TPreenregistrement sale, List<TPreenregistrementDetail> items,
            List<TPreenregistrementCompteClientTiersPayent> compteClientTiersPayents,
            Map<String, List<TiersPayantParams>> tpsBons) {
        TTypeVente tTypeVente = sale.getLgTYPEVENTEID();
        CalculationInput input = new CalculationInput();
        input.setNatureVente(Constant.VENTE_ASSURANCE_ID.equals(tTypeVente.getLgTYPEVENTEID()) ? NatureVente.ASSURANCE
                : NatureVente.CARNET);
        input.setDiscountAmount(BigDecimal.valueOf(Objects.requireNonNullElse(sale.getIntPRICEREMISE(), 0)));

        Set<String> tiersPayantIds = new HashSet<>();
        List<TiersPayantInput> tiersPayantInputs = buildTiersPayantInputs(compteClientTiersPayents, tiersPayantIds,
                tpsBons);
        input.setTiersPayants(tiersPayantInputs);
        input.setSaleItems(buildSaleItemInputs(items, input, tiersPayantIds, tiersPayantInputs));

        return input;
    }

    private List<TiersPayantInput> buildTiersPayantInputs(
            List<TPreenregistrementCompteClientTiersPayent> compteClientTiersPayents, Set<String> tiersPayantIds,
            Map<String, List<TiersPayantParams>> tpsBons) {
        if (CollectionUtils.isEmpty(compteClientTiersPayents)) {
            return Collections.emptyList();
        }
        return compteClientTiersPayents.stream().map(it -> {
            TCompteClientTiersPayant ctp = it.getLgCOMPTECLIENTTIERSPAYANTID();
            TiersPayantParams tiersPayantParams = tpsBons.get(ctp.getLgCOMPTECLIENTTIERSPAYANTID()).get(0);
            TiersPayantInput ti = new TiersPayantInput();
            TTiersPayant tiersPayant = ctp.getLgTIERSPAYANTID();
            tiersPayantIds.add(tiersPayant.getLgTIERSPAYANTID());
            ti.setClientTiersPayantId(ctp.getLgCOMPTECLIENTTIERSPAYANTID());
            ti.setTiersPayantId(tiersPayant.getLgTIERSPAYANTID());
            // Nom complet, sinon nom court : le message d'avertissement des plafonds doit toujours
            // nommer le tiers payant.
            ti.setTiersPayantFullName(
                    StringUtils.defaultIfBlank(tiersPayant.getStrFULLNAME(), tiersPayant.getStrNAME()));
            // ti.setTaux(ctp.getIntPOURCENTAGE() / 100.0f);// apres les retours de franck, on prends le taux sais du
            // front
            if (Objects.nonNull(it.getIntPERCENT())) {
                ti.setTaux(it.getIntPERCENT() / 100.0f);
            } else {
                ti.setTaux(tiersPayantParams.getTaux() / 100.0f);
            }
            ti.setNumBon(tiersPayantParams.getNumBon());
            ti.setPriorite(ctp.getIntPRIORITY());
            Optional.ofNullable(tiersPayant.getDblPLAFONDCREDIT())
                    .ifPresent(v -> ti.setPlafondCreditTiersPayant(BigDecimal.valueOf(v))); // plafond sur la fiche du
            // TP
            // Consommation globale de l'organisme : c'est elle qui se confronte au plafond de
            // credit de sa fiche pour dire ce qu'il reste d'encours.
            Optional.ofNullable(tiersPayant.getDbCONSOMMATIONMENSUELLE())
                    .ifPresent(v -> ti.setConsoGlobaleTiersPayant(BigDecimal.valueOf(v)));
            Optional.ofNullable(ctp.getDbPLAFONDENCOURS()).ifPresent(v -> ti.setPlafondConso(BigDecimal.valueOf(v)));
            Optional.ofNullable(ctp.getDbCONSOMMATIONMENSUELLE())
                    .ifPresent(v -> ti.setConsoMensuelle(BigDecimal.valueOf(v)));
            Optional.ofNullable(ctp.getDblPLAFOND())
                    .ifPresent(v -> ti.setPlafondJournalierClient(BigDecimal.valueOf(v)));
            return ti;
        }).collect(Collectors.toList());

    }

    /**
     * Vente assurance (regle du 26/10, remplace le plafonnement global de CR-06) : la remise d'un produit porte sur SA
     * part client, prix de la ligne - part des organismes sur la ligne ; un produit non remisable ne recoit rien mais
     * sa part client reste due. Part client de la vente = prix - parts des organismes - remise, arrondie a 5 F au net.
     * Les parts des organismes sont calculees sans la remise.
     */
    private MontantAPaye remiseSurPartClient(TPreenregistrement op, TRemise remise,
            List<TPreenregistrementDetail> items, CalculationResult output) {
        MontantAPaye montantAPaye = computeRemise(op, remise, items, partsClientParLigne(items, output));
        int totalTiersPayant = output.getTotalTiersPayant() == null ? 0 : output.getTotalTiersPayant().intValue();
        op.setIntCUSTPART(Math.max(0, op.getIntPRICE() - totalTiersPayant - op.getIntPRICEREMISE()));
        return montantAPaye;
    }

    /**
     * Part client de chaque ligne. Un plafond s'applique au total d'un organisme : la reduction est repartie sur ses
     * lignes au prorata de sa part sur chacune. Sans plafond, rien n'est reparti.
     */
    static Map<String, Integer> partsClientParLigne(List<TPreenregistrementDetail> items, CalculationResult output) {
        Map<String, BigDecimal> demande = new HashMap<>();
        output.getItemShares()
                .forEach(s -> s.getTiersPayants().forEach((tp, m) -> demande.merge(tp, m, BigDecimal::add)));
        Map<String, BigDecimal> coefficient = new HashMap<>();
        for (TiersPayantLineOutput l : output.getTiersPayantLines()) {
            BigDecimal d = demande.getOrDefault(l.getClientTiersPayantId(), BigDecimal.ZERO);
            BigDecimal accorde = l.getMontant() == null ? BigDecimal.ZERO : l.getMontant();
            if (d.signum() > 0 && accorde.compareTo(d.setScale(0, RoundingMode.HALF_UP)) < 0) {
                coefficient.put(l.getClientTiersPayantId(), accorde.divide(d, 10, RoundingMode.HALF_UP));
            }
        }
        Map<String, Integer> parts = new HashMap<>();
        for (TPreenregistrementDetail x : items) {
            BigDecimal partTp = output.getItemShares().stream()
                    .filter(s -> x.getLgPREENREGISTREMENTDETAILID().equals(s.getSaleLineId())).findFirst()
                    .map(s -> s.getTiersPayants().entrySet().stream()
                            .map(e -> e.getValue().multiply(coefficient.getOrDefault(e.getKey(), BigDecimal.ONE)))
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .orElse(BigDecimal.ZERO);
            parts.put(x.getLgPREENREGISTREMENTDETAILID(), BigDecimal.valueOf(x.getIntPRICE()).subtract(partTp)
                    .setScale(0, RoundingMode.HALF_UP).max(BigDecimal.ZERO).intValue());
        }
        return parts;
    }

    @Override
    public MontantAPaye calculeRepair(TPreenregistrement op,
            List<TPreenregistrementCompteClientTiersPayent> compteClientTiersPayents,
            Map<String, List<TiersPayantParams>> tpsBons) {

        TRemise remise = null;

        List<TPreenregistrementDetail> items = new ArrayList<>(op.getTPreenregistrementDetailCollection());
        MontantAPaye montantAPaye;
        CalculationResult output;
        if (Constant.VENTE_AVEC_CARNET.equals(op.getLgTYPEVENTEID().getLgTYPEVENTEID())) {
            montantAPaye = computeRemise(op, remise, items);
            CalculationInput input = buildCalculationInput(op, items, compteClientTiersPayents, tpsBons);
            input.setDiscountAmount(
                    BigDecimal.valueOf(Objects.requireNonNullElse(montantAPaye.getMontantAccount(), 0)));
            output = tiersPayantCalculationService.calculate(input);
            op.setIntCUSTPART(output.getTotalPatientShare().intValue());
        } else {
            output = tiersPayantCalculationService
                    .calculate(buildCalculationInput(op, items, compteClientTiersPayents, tpsBons));
            montantAPaye = remiseSurPartClient(op, remise, items, output);
        }

        Map<String, List<TPreenregistrementCompteClientTiersPayent>> maps = compteClientTiersPayents.stream().collect(
                Collectors.groupingBy(e -> e.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTTIERSPAYANTID()));

        for (TiersPayantLineOutput lineResult : output.getTiersPayantLines()) {
            TPreenregistrementCompteClientTiersPayent saleLine = maps.get(lineResult.getClientTiersPayantId()).get(0);

            if (output.isHasPriceOption()) {
                TCompteClientTiersPayant tcctp = saleLine.getLgCOMPTECLIENTTIERSPAYANTID();
                saleLine.setIntPERCENT(tcctp.getIntPOURCENTAGE());
            } else {
                // Meme regle que sur l'autre chemin de calcul : le taux memorise est celui
                // utilise par le calcul, pas le taux effectif apres ecretage.
                saleLine.setIntPERCENT(lineResult.getTauxApplique());
            }
            saleLine.setIntPRICE(lineResult.getMontant().intValue());
            saleLine.setStrREFBON(lineResult.getNumBon());

            em.merge(saleLine);
            TiersPayantParams tp = new TiersPayantParams();
            tp.setTaux(saleLine.getIntPERCENT());
            tp.setCompteTp(lineResult.getClientTiersPayantId());
            tp.setNumBon(saleLine.getStrREFBON());
            tp.setTpnet(saleLine.getIntPRICE());
            montantAPaye.getTierspayants().add(tp);

        }
        for (TPreenregistrementDetail saleLine : items) {

            output.getItemShares().stream()
                    .filter(s -> s.getSaleLineId().equals(saleLine.getLgPREENREGISTREMENTDETAILID())).findFirst()
                    .ifPresent(itemShare -> {
                        saleLine.setCalculationBasePrice(itemShare.getCalculationBasePrice());
                        em.merge(saleLine);
                        itemShare.getRates().forEach(em::persist);
                    });
        }
        op.setHasPriceOption(output.isHasPriceOption());
        em.merge(op);
        montantAPaye.setMontantTp(output.getTotalTiersPayant().intValue());

        montantAPaye.setMontantNet(NumberUtils.arrondiModuloOfNumber(op.getIntCUSTPART(), 5));
        // Plus de motifs de refus : tous les plafonds (compte, par vente, credit de l'organisme)
        // ECRETENT la part tiers payant, et l'avertissement dit la difference laissee au client.
        String messagePlafonds = output.getWarningMessage();
        montantAPaye.setRestructuring(StringUtils.isNoneEmpty(messagePlafonds));
        montantAPaye.setMessage(messagePlafonds);

        return montantAPaye;

    }
}
