/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import bll.common.Parameter;
import commonTasks.dto.AchatDTO;
import commonTasks.dto.BalanceDTO;
import commonTasks.dto.FamilleArticleStatDTO;
import commonTasks.dto.GenericDTO;
import commonTasks.dto.MvtProduitDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RapportDTO;
import commonTasks.dto.RecapActiviteCreditDTO;
import commonTasks.dto.RecapActiviteDTO;
import commonTasks.dto.RecapActiviteReglementDTO;
import commonTasks.dto.ResumeCaisseDTO;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.SummaryDTO;
import commonTasks.dto.TableauBaordPhDTO;
import commonTasks.dto.TableauBaordSummary;
import commonTasks.dto.TvaDTO;
import commonTasks.dto.VenteDTO;
import commonTasks.dto.VenteDetailsDTO;
import commonTasks.dto.VisualisationCaisseDTO;
import dal.MvtTransaction;
import dal.TEmplacement;
import dal.TFamille;
import dal.TOfficine;
import dal.TPrivilege;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.LongAdder;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import rest.report.ReportUtil;
import rest.service.BalanceService;
import rest.service.CaisseService;
import rest.service.DashBoardService;
import rest.service.FamilleArticleService;
import rest.service.FicheArticleService;
import rest.service.ProduitService;
import rest.service.SalesStatsService;
import rest.service.TvaService;
import rest.service.dto.BalanceParamsDTO;
import toolkits.utils.jdom;
import util.DateConverter;
import util.NumberUtils;

/**
 * @author DICI
 */
@Stateless
public class Balance {

    @EJB
    CaisseService caisseService;
    @EJB
    private ReportUtil reportUtil;

    @EJB
    private SalesStatsService salesStatsService;
    @EJB
    private ProduitService produitService;
    @EJB
    private DashBoardService dashBoardService;
    @EJB
    private FamilleArticleService familleArticleService;
    @EJB
    private FicheArticleService ficheArticleService;
    @EJB
    private TvaService tvaService;
    @EJB
    private BalanceService balanceService;

    public String generatepdf(Params parasm, boolean exludeSome, boolean showAllAmount) {
        TUser tu = parasm.getOperateur();
        TOfficine oTOfficine = reportUtil.findOfficine();
        String scr_report_file = "rp_balancevente_caissev2";
        String P_H_CLT_INFOS;
        TEmplacement empl = tu.getLgEMPLACEMENTID();
        String P_FOOTER_RC = "";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        String pdfscr_report_pdf = jdom.scr_report_pdf + "balancevente_caisse" + report_generate_file;
        Map<String, Object> parameters = new HashMap<>();
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        BalanceDTO vo = new BalanceDTO();
        BalanceDTO vno = new BalanceDTO();
        GenericDTO generic = this.balanceService.getBalanceVenteCaisseData(BalanceParamsDTO.builder()
                .dtEnd(parasm.getDtEnd()).dtStart(parasm.getDtStart()).showAllAmount(showAllAmount)
                .emplacementId(parasm.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());

        List<VisualisationCaisseDTO> findAllMvtCaisse = caisseService.findAllMvtCaisse(dtSt, dtEn, true,
                empl.getLgEMPLACEMENTID());
        SummaryDTO summary = generic.getSummary();
        List<BalanceDTO> balances = generic.getBalances();

        int totalP = 0;
        if (!balances.isEmpty()) {
            totalP = 100;
            Map<String, List<BalanceDTO>> map = balances.stream()
                    .collect(Collectors.groupingBy(BalanceDTO::getTypeVente));
            try {
                vo = map.get("VO").get(0);
            } catch (Exception e) {
                vo = new BalanceDTO();
            }
            try {
                vno = map.get("VNO").get(0);
            } catch (Exception e) {
                vno = new BalanceDTO();
            }
        }

        P_H_CLT_INFOS = "BALANCE VENTE/CAISSE   DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU "
                + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_EMPLACEMENT", empl.getLgEMPLACEMENTID());
        parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
        parameters.put("P_TYPE_VENTE", "%%");
        parameters.put("P_VO_PERCENT", vo.getPourcentage() + "");
        parameters.put("P_AMOUNT_REMISE_VO", DateConverter.amountFormat(vo.getMontantRemise(), ' '));
        parameters.put("P_VENTE_NET_VO", DateConverter.amountFormat(vo.getMontantNet(), ' '));
        parameters.put("P_AMOUNT_BRUT_VO", DateConverter.amountFormat(vo.getMontantTTC(), ' '));
        parameters.put("P_NB_VO", DateConverter.amountFormat(vo.getNbreVente(), ' '));
        parameters.put("P_AMOUNT_VO_TIERESPAYANT", DateConverter.amountFormat(vo.getMontantTp(), ' '));
        parameters.put("P_VO_PANIER_MOYEN", DateConverter.amountFormat(vo.getPanierMoyen(), ' '));
        parameters.put("P_AMOUNT_VO_ESPECE", DateConverter.amountFormat(vo.getMontantEsp(), ' '));
        parameters.put("P_AMOUNT_VO_CHEQUE", DateConverter.amountFormat(vo.getMontantCheque(), ' '));
        parameters.put("P_AMOUNT_VO_CARTEBANCAIRE", DateConverter.amountFormat(vo.getMontantCB(), ' '));
        parameters.put("P_AMOUNT_VO_DIFFERE", DateConverter.amountFormat(vo.getMontantDiff(), ' '));
        parameters.put("montantMobilePayment", DateConverter.amountFormat(vo.getMontantMobilePayment(), ' '));
        parameters.put("P_VENTE_NET_AVOIR", "0");
        parameters.put("P_NB_AVOIR", "0");
        parameters.put("P_VO_PANIER_AVOIR", "0");
        parameters.put("P_AVOIR_", "0");
        parameters.put("P_AMOUNT_AVOIR_ESPECE", "0");
        parameters.put("P_AMOUNT_AVOIR_CHEQUE", "0");
        parameters.put("P_AMOUNT_AVOIR_CARTEBANCAIRE", "0");
        parameters.put("P_AMOUNT_AVOIR_DIFFERE", "0");
        parameters.put("P_AMOUNT_BRUT_AVOIR", "0");
        parameters.put("P_AMOUNT_AVOIR_TIERESPAYANT", "0");
        parameters.put("P_AMOUNT_AVOIR_VO", "0");
        parameters.put("P_AMOUNT_BRUT_VNO", DateConverter.amountFormat(vno.getMontantTTC(), ' '));
        parameters.put("P_VENTE_NET_VNO", DateConverter.amountFormat(vno.getMontantNet(), ' '));
        parameters.put("montantMobilePaymentVNO", DateConverter.amountFormat(vno.getMontantMobilePayment(), ' '));
        parameters.put("P_AMOUNT_VNO_ESPECE", DateConverter.amountFormat(vno.getMontantEsp(), ' '));
        parameters.put("P_NB_VNO", DateConverter.amountFormat(vno.getNbreVente(), ' '));
        parameters.put("P_AMOUNT_REMISE_VNO", DateConverter.amountFormat(vno.getMontantRemise(), ' '));
        parameters.put("P_AMOUNT_VNO_TIERSPAYANT", "0");
        parameters.put("P_VNO_PANIER_MOYEN", DateConverter.amountFormat(vno.getPanierMoyen(), ' '));
        parameters.put("P_VNO_PERCENT", vno.getPourcentage() + "");
        parameters.put("P_AMOUNT_AVOIR_TIERSPAYANT", "0");
        parameters.put("P_AMOUNT_REMISE_AVOIR", "0");
        parameters.put("P_AMOUNT_VNO_CHEQUE", DateConverter.amountFormat(vno.getMontantCheque(), ' '));
        parameters.put("P_AMOUNT_VNO_CARTEBANCAIRE", DateConverter.amountFormat(vno.getMontantCB(), ' '));
        parameters.put("P_AMOUNT_VNO_DIFFERE", DateConverter.amountFormat(vno.getMontantDiff(), ' '));
        parameters.put("P_NB", DateConverter.amountFormat(summary.getNbreVente(), ' '));
        parameters.put("P_TOTAL_BRUT", DateConverter.amountFormat(summary.getMontantTTC(), ' '));
        parameters.put("P_TOTAL_NET", DateConverter.amountFormat(summary.getMontantNet(), ' '));
        parameters.put("P_TOTAL_REMISE", DateConverter.amountFormat(summary.getMontantRemise(), ' '));
        parameters.put("P_TOTAL_PANIER", DateConverter.amountFormat(summary.getPanierMoyen(), ' '));
        parameters.put("P_TOTAL_ESPECE", DateConverter.amountFormat(summary.getMontantEsp(), ' '));
        parameters.put("P_TOTAL_CHEQUES", DateConverter.amountFormat(summary.getMontantCheque(), ' '));
        parameters.put("P_TOTAL_CARTEBANCAIRE", DateConverter.amountFormat(summary.getMontantCB(), ' '));
        parameters.put("P_TOTAL_MOBILE", DateConverter.amountFormat(summary.getMontantMobilePayment(), ' '));
        parameters.put("P_TOTAL_TIERSPAYANT", DateConverter.amountFormat(summary.getMontantTp(), ' '));
        parameters.put("P_TOTAL_AVOIR", DateConverter.amountFormat(summary.getMontantDiff(), ' '));
        parameters.put("P_TOTAL_PERCENT", totalP + "");
        parameters.put("P_TOTAL_VENTE",
                DateConverter.amountFormat(summary.getMontantEsp() + summary.getMontantCheque()
                        + summary.getMontantVirement() + summary.getMontantCB() + summary.getMontantMobilePayment(),
                        ' '));
        String P_FONDCAISSE_LABEL = "", P_SORIECAISSE_LABEL = "", P_ENTREECAISSE_LABEL = "", P_REGLEMENT_LABEL = "",
                P_ACCOMPTE_LABEL = "", P_DIFFERE_LABEL = "", P_TOTAL_CAISSE_LABEL;
        String cautionLabel = "";
        long P_SORTIECAISSE_ESPECE = 0, P_SORTIECAISSE_CHEQUES = 0, P_SORTIECAISSE_MOBILE = 0, P_SORTIECAISSE_CB = 0,
                P_SORTIECAISSE_VIREMENT = 0, P_TOTAL_SORTIE_CAISSE, P_ENTREECAISSE_ESPECE = 0,
                P_ENTREECAISSE_VIREMENT = 0, P_ENTREECAISSE_MOBILE = 0, P_ENTREECAISSE_CHEQUES = 0,
                P_ENTREECAISSE_CB = 0, P_TOTAL_ENTREE_CAISSE, P_REGLEMENT_ESPECE = 0, P_REGLEMENT_MOBILE = 0,
                P_REGLEMENT_CHEQUES = 0, P_REGLEMENT_VIREMENT = 0, P_REGLEMENT_CB = 0, P_TOTAL_REGLEMENT_CAISSE,
                P_ACCOMPTE_ESPECE = 0, P_ACCOMPTE_CHEQUES = 0, P_ACCOMPTE_VIREMENT = 0, P_ACCOMPTE_CB = 0,
                P_TOTAL_ACCOMPTE_CAISSE, P_FONDCAISSE = 0, P_DIFFERE_CHEQUES = 0, P_DIFFERE_CB = 0,
                P_TOTAL_GLOBAL_CAISSE, P_TOTAL_GLOBALE_MOBILE, P_DIFFERE_ESPECE = 0, P_DIFFERE_VIREMENT = 0,
                P_TOTAL_VIREMENT_GLOBAL, P_TOTAL_DIFFERE_CAISSE, P_TOTAL_ESPECES_GLOBAL, P_TOTAL_CHEQUES_GLOBAL,
                P_TOTAL_CB_GLOBAL;
        long cautionMontant = 0;
        long totalCautionMontant = 0;
        Map<String, List<VisualisationCaisseDTO>> typeMvtMap = findAllMvtCaisse.stream()
                .collect(Collectors.groupingBy(VisualisationCaisseDTO::getTypeMvt));

        for (Map.Entry<String, List<VisualisationCaisseDTO>> entry : typeMvtMap.entrySet()) {
            String key = entry.getKey();

            List<VisualisationCaisseDTO> val = entry.getValue();
            Map<String, List<VisualisationCaisseDTO>> typeRe;
            List<VisualisationCaisseDTO> list;
            switch (key) {
            case DateConverter.CAUTION_ID:
                cautionLabel = val.get(0).getTypeMouvement();
                cautionMontant = val.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();

                break;
            case DateConverter.MVT_FOND_CAISSE:
                P_FONDCAISSE_LABEL = val.get(0).getTypeMouvement();
                P_FONDCAISSE = val.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                break;
            case DateConverter.MVT_SORTIE_CAISSE:
                P_SORIECAISSE_LABEL = val.get(0).getTypeMouvement();
                typeRe = val.stream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                list = typeRe.get(DateConverter.MODE_ESP);
                P_SORTIECAISSE_ESPECE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CHEQUE);
                P_SORTIECAISSE_CHEQUES = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CB);
                P_SORTIECAISSE_CB = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_VIREMENT);
                P_SORTIECAISSE_VIREMENT = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_MOOV);
                P_SORTIECAISSE_MOBILE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_MTN);
                P_SORTIECAISSE_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.TYPE_REGLEMENT_ORANGE);
                P_SORTIECAISSE_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_WAVE);
                P_SORTIECAISSE_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                break;

            case DateConverter.MVT_ENTREE_CAISSE:
                P_ENTREECAISSE_LABEL = val.get(0).getTypeMouvement();
                typeRe = val.stream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                list = typeRe.get(DateConverter.MODE_ESP);
                P_ENTREECAISSE_ESPECE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CHEQUE);
                P_ENTREECAISSE_CHEQUES = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CB);
                P_ENTREECAISSE_CB = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_VIREMENT);
                P_ENTREECAISSE_VIREMENT = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_MOOV);
                P_ENTREECAISSE_MOBILE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_MTN);
                P_ENTREECAISSE_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.TYPE_REGLEMENT_ORANGE);
                P_ENTREECAISSE_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_WAVE);
                P_ENTREECAISSE_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                break;
            case DateConverter.MVT_REGLE_TP:
                P_REGLEMENT_LABEL = val.get(0).getTypeMouvement();
                typeRe = val.stream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                list = typeRe.get(DateConverter.MODE_ESP);
                P_REGLEMENT_ESPECE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CHEQUE);
                P_REGLEMENT_CHEQUES = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CB);
                P_REGLEMENT_CB = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_VIREMENT);
                P_REGLEMENT_VIREMENT = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_MOOV);
                P_REGLEMENT_MOBILE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_MTN);
                P_REGLEMENT_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.TYPE_REGLEMENT_ORANGE);
                P_REGLEMENT_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_WAVE);
                P_REGLEMENT_MOBILE += (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                break;
            case DateConverter.MVT_REGLE_DIFF:
                P_DIFFERE_LABEL = val.get(0).getTypeMouvement();
                typeRe = val.stream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                list = typeRe.get(DateConverter.MODE_ESP);
                P_DIFFERE_ESPECE = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CHEQUE);
                P_DIFFERE_CHEQUES = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_CB);
                P_DIFFERE_CB = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                list = typeRe.get(DateConverter.MODE_VIREMENT);
                P_DIFFERE_VIREMENT = (list == null) ? 0
                        : list.stream().mapToLong(VisualisationCaisseDTO::getMontantNet).sum();
                break;
            }
        }
        long P_VENTEDEPOT_ESPECE = 0, P_REGLEMENTDEPOT_MOBILE = 0, P_TOTAL_REGLEMENTDEPOT_CAISSE = 0,
                P_TOTAL_VENTEDEPOT_CAISSE = 0, P_REGLEMENTDEPOT_ESPECE = 0, P_REGLEMENTDEPOT_CB = 0,
                P_REGLEMENTDEPOT_CHEQUES = 0;
        if (empl.getLgEMPLACEMENTID().equals(DateConverter.OFFICINE)) {
            P_VENTEDEPOT_ESPECE = (-1) * caisseService.totalVenteDepot(dtSt, dtEn, empl.getLgEMPLACEMENTID());
            P_TOTAL_VENTEDEPOT_CAISSE = P_VENTEDEPOT_ESPECE;
            List<MvtTransaction> transactions = caisseService.venteDepot(dtSt, dtEn, true, empl.getLgEMPLACEMENTID());
            if (!transactions.isEmpty()) {
                LongAdder esp = new LongAdder();
                LongAdder ch = new LongAdder();
                LongAdder cb = new LongAdder();
                LongAdder mobile = new LongAdder();
                for (MvtTransaction de : transactions) {
                    String typ = de.getReglement().getLgTYPEREGLEMENTID();
                    switch (typ) {
                    case DateConverter.MODE_ESP:
                        esp.add(de.getMontantRegle());
                        break;
                    case DateConverter.MODE_CB:
                        cb.add(de.getMontantRegle());
                        break;
                    case DateConverter.MODE_CHEQUE:
                        ch.add(de.getMontantRegle());
                        break;
                    case DateConverter.MODE_MOOV:
                    case DateConverter.TYPE_REGLEMENT_ORANGE:
                    case DateConverter.MODE_MTN:
                    case DateConverter.MODE_WAVE:
                        mobile.add(de.getMontantRegle());
                        break;
                    default:
                        break;
                    }
                }

                P_REGLEMENTDEPOT_ESPECE = esp.longValue();
                P_REGLEMENTDEPOT_CHEQUES = ch.longValue();
                P_REGLEMENTDEPOT_CB = cb.longValue();
                P_REGLEMENTDEPOT_MOBILE = mobile.longValue();
                P_TOTAL_REGLEMENTDEPOT_CAISSE = P_REGLEMENTDEPOT_ESPECE + P_REGLEMENTDEPOT_CHEQUES + P_REGLEMENTDEPOT_CB
                        + P_REGLEMENTDEPOT_MOBILE;
            }
        }
        String P_VENTEDEPOT_LABEL = "Ventes aux dépôts extensions",
                P_REGLEMENTDEPOT_LABEL = "Règlement des ventes des dépôts";
        P_VENTEDEPOT_LABEL = (P_TOTAL_VENTEDEPOT_CAISSE != 0 ? P_VENTEDEPOT_LABEL : "");
        P_REGLEMENTDEPOT_LABEL = (P_TOTAL_REGLEMENTDEPOT_CAISSE > 0 ? P_REGLEMENTDEPOT_LABEL : "");

        parameters.put("P_VENTEDEPOT_LABEL", P_VENTEDEPOT_LABEL);
        parameters.put("P_VENTEDEPOT_ESPECE", DateConverter.amountFormat(P_VENTEDEPOT_ESPECE, ' '));
        parameters.put("P_VENTEDEPOT_CHEQUES", "0");
        parameters.put("P_VENTEDEPOT_CB", "0");
        parameters.put("P_TOTAL_VENTEDEPOT_CAISSE", DateConverter.amountFormat(P_TOTAL_VENTEDEPOT_CAISSE, ' '));

        parameters.put("P_REGLEMENTDEPOT_LABEL", P_REGLEMENTDEPOT_LABEL);
        parameters.put("P_REGLEMENTDEPOT_ESPECE", DateConverter.amountFormat(P_REGLEMENTDEPOT_ESPECE, ' '));
        parameters.put("P_REGLEMENTDEPOT_CHEQUES", DateConverter.amountFormat(P_REGLEMENTDEPOT_CHEQUES, ' '));
        parameters.put("P_REGLEMENTDEPOT_CB", DateConverter.amountFormat(P_REGLEMENTDEPOT_CB, ' '));
        parameters.put("P_TOTAL_REGLEMENTDEPOT_CAISSE", DateConverter.amountFormat(P_TOTAL_REGLEMENTDEPOT_CAISSE, ' '));
        parameters.put("P_REGLEMENTDEPOT_MOBILE", DateConverter.amountFormat(P_REGLEMENTDEPOT_MOBILE, ' '));
        P_TOTAL_SORTIE_CAISSE = P_SORTIECAISSE_ESPECE + P_SORTIECAISSE_CHEQUES + P_SORTIECAISSE_CB
                + P_SORTIECAISSE_MOBILE;
        P_TOTAL_ENTREE_CAISSE = P_ENTREECAISSE_ESPECE + P_ENTREECAISSE_CHEQUES + P_ENTREECAISSE_CB
                + P_ENTREECAISSE_MOBILE;
        totalCautionMontant = cautionMontant;
        P_TOTAL_REGLEMENT_CAISSE = P_REGLEMENT_ESPECE + P_REGLEMENT_CHEQUES + P_REGLEMENT_CB + P_REGLEMENT_MOBILE;
        P_TOTAL_ACCOMPTE_CAISSE = P_ACCOMPTE_ESPECE + P_ACCOMPTE_CHEQUES + P_ACCOMPTE_CB;
        P_TOTAL_DIFFERE_CAISSE = P_DIFFERE_ESPECE + P_DIFFERE_CHEQUES + P_DIFFERE_CB;

        P_TOTAL_ESPECES_GLOBAL = (P_FONDCAISSE + summary.getMontantEsp() + P_ENTREECAISSE_ESPECE + P_REGLEMENT_ESPECE
                + P_ACCOMPTE_ESPECE + P_DIFFERE_ESPECE) + P_SORTIECAISSE_ESPECE + cautionMontant;
        P_TOTAL_CHEQUES_GLOBAL = summary.getMontantCheque() + P_SORTIECAISSE_CHEQUES + P_ENTREECAISSE_CHEQUES
                + P_REGLEMENT_CHEQUES + P_ACCOMPTE_CHEQUES + P_DIFFERE_CHEQUES;
        P_TOTAL_VIREMENT_GLOBAL = summary.getMontantVirement() + P_ENTREECAISSE_VIREMENT + P_SORTIECAISSE_VIREMENT
                + P_REGLEMENT_VIREMENT + P_ACCOMPTE_VIREMENT + P_DIFFERE_VIREMENT;
        P_TOTAL_CB_GLOBAL = summary.getMontantCB() + P_SORTIECAISSE_CB + P_ENTREECAISSE_CB + P_REGLEMENT_CB
                + P_ACCOMPTE_CB + P_DIFFERE_CB;
        P_TOTAL_GLOBALE_MOBILE = summary.getMontantMobilePayment() + P_SORTIECAISSE_MOBILE + P_ENTREECAISSE_MOBILE
                + P_REGLEMENT_MOBILE;
        P_TOTAL_GLOBAL_CAISSE = +P_TOTAL_ESPECES_GLOBAL + P_TOTAL_CHEQUES_GLOBAL + P_TOTAL_CB_GLOBAL
                + P_TOTAL_VIREMENT_GLOBAL + P_TOTAL_GLOBALE_MOBILE;

        parameters.put("P_TOTAL_GLOBAL_CAISSE", DateConverter.amountFormat(P_TOTAL_GLOBAL_CAISSE, ' '));
        parameters.put("P_TOTAL_VIREMENT_GLOBAL", DateConverter.amountFormat(P_TOTAL_VIREMENT_GLOBAL, ' '));
        parameters.put("P_SORIECAISSE_LABEL", P_SORIECAISSE_LABEL);
        parameters.put("P_TOTAL_CB_GLOBAL", DateConverter.amountFormat(P_TOTAL_CB_GLOBAL, ' '));
        parameters.put("P_TOTAL_CHEQUES_GLOBAL", DateConverter.amountFormat(P_TOTAL_CHEQUES_GLOBAL, ' '));
        parameters.put("P_TOTAL_GLOBALE_MOBILE", DateConverter.amountFormat(P_TOTAL_GLOBALE_MOBILE, ' '));
        parameters.put("P_FONDCAISSE", DateConverter.amountFormat(P_FONDCAISSE, ' '));
        parameters.put("P_SORTIECAISSE_ESPECE", DateConverter.amountFormat(P_SORTIECAISSE_ESPECE, ' '));
        parameters.put("P_SORTIECAISSE_CHEQUES", DateConverter.amountFormat(P_SORTIECAISSE_CHEQUES, ' '));
        parameters.put("P_SORTIECAISSE_CB", DateConverter.amountFormat(P_SORTIECAISSE_CB, ' '));
        parameters.put("P_SORTIECAISSE_MOBILE", DateConverter.amountFormat(P_SORTIECAISSE_MOBILE, ' '));
        parameters.put("P_CAUTION_MONTANT", DateConverter.amountFormat(cautionMontant, ' '));
        parameters.put("P_SORTIECAISSE_VIREMENT", DateConverter.amountFormat(P_SORTIECAISSE_VIREMENT, ' '));
        parameters.put("P_TOTAL_FONDCAISSE", DateConverter.amountFormat(P_FONDCAISSE, ' '));
        parameters.put("P_TOTAL_SORTIE_CAISSE", DateConverter.amountFormat(P_TOTAL_SORTIE_CAISSE, ' '));
        parameters.put("P_ENTREECAISSE_ESPECE", DateConverter.amountFormat(P_ENTREECAISSE_ESPECE, ' '));
        parameters.put("P_ENTREECAISSE_VIREMENT", DateConverter.amountFormat(P_ENTREECAISSE_VIREMENT, ' '));
        parameters.put("P_ENTREECAISSE_CHEQUES", DateConverter.amountFormat(P_ENTREECAISSE_CHEQUES, ' '));
        parameters.put("P_ENTREECAISSE_MOBILE", DateConverter.amountFormat(P_ENTREECAISSE_MOBILE, ' '));
        parameters.put("P_TOTAL_CAUTION_AMOUNT", DateConverter.amountFormat(totalCautionMontant, ' '));
        parameters.put("P_ENTREECAISSE_CB", DateConverter.amountFormat(P_ENTREECAISSE_CB, ' '));
        parameters.put("P_TOTAL_ENTREE_CAISSE", DateConverter.amountFormat(P_TOTAL_ENTREE_CAISSE, ' '));
        parameters.put("P_REGLEMENT_ESPECE", DateConverter.amountFormat(P_REGLEMENT_ESPECE, ' '));
        parameters.put("P_REGLEMENT_VIREMENT", DateConverter.amountFormat(P_REGLEMENT_VIREMENT, ' '));
        parameters.put("P_REGLEMENT_MOBILE", DateConverter.amountFormat(P_REGLEMENT_MOBILE, ' '));
        parameters.put("P_REGLEMENT_CHEQUES", DateConverter.amountFormat(P_REGLEMENT_CHEQUES, ' '));
        parameters.put("P_REGLEMENT_CB", DateConverter.amountFormat(P_REGLEMENT_CB, ' '));
        parameters.put("P_TOTAL_REGLEMENT_CAISSE", DateConverter.amountFormat(P_TOTAL_REGLEMENT_CAISSE, ' '));
        parameters.put("P_ACCOMPTE_ESPECE", DateConverter.amountFormat(P_ACCOMPTE_ESPECE, ' '));
        parameters.put("P_ACCOMPTE_CHEQUES", DateConverter.amountFormat(P_ACCOMPTE_CHEQUES, ' '));
        parameters.put("P_ACCOMPTE_CB", DateConverter.amountFormat(P_ACCOMPTE_CB, ' '));
        parameters.put("P_ACCOMPTE_VIREMENT", DateConverter.amountFormat(P_ACCOMPTE_VIREMENT, ' '));
        parameters.put("P_TOTAL_ACCOMPTE_CAISSE", DateConverter.amountFormat(P_TOTAL_ACCOMPTE_CAISSE, ' '));
        parameters.put("P_DIFFERE_ESPECE", DateConverter.amountFormat(P_DIFFERE_ESPECE, ' '));
        parameters.put("P_DIFFERE_VIREMENT", DateConverter.amountFormat(P_DIFFERE_VIREMENT, ' '));
        parameters.put("P_DIFFERE_CHEQUES", DateConverter.amountFormat(P_DIFFERE_CHEQUES, ' '));
        parameters.put("P_DIFFERE_CB", DateConverter.amountFormat(P_DIFFERE_CB, ' '));
        parameters.put("P_TOTAL_DIFFERE_CAISSE", DateConverter.amountFormat(P_TOTAL_DIFFERE_CAISSE, ' '));
        P_TOTAL_CAISSE_LABEL = "Total caisse " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU "
                + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_TOTAL_CAISSE_LABEL", P_TOTAL_CAISSE_LABEL);
        parameters.put("P_FONDCAISSE_LABEL", P_FONDCAISSE_LABEL);
        parameters.put("P_CAUTION_LABEL", cautionLabel);
        parameters.put("P_ENTREECAISSE_LABEL", P_ENTREECAISSE_LABEL);
        parameters.put("P_DIFFERE_LABEL", P_DIFFERE_LABEL);
        parameters.put("P_ACCOMPTE_LABEL", P_ACCOMPTE_LABEL);
        parameters.put("P_REGLEMENT_LABEL", P_REGLEMENT_LABEL);
        parameters.put("P_TOTAL_ESPECES_GLOBAL", DateConverter.amountFormat(P_TOTAL_ESPECES_GLOBAL, ' '));
        parameters.put("P_ACCOMPTE_CB", DateConverter.amountFormat(P_ACCOMPTE_CB, ' '));
        String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
        String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
        String P_H_LOGO = jdom.scr_report_file_logo;
        parameters.put("P_H_LOGO", P_H_LOGO);
        parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);
        parameters.put("P_PRINTED_BY", " " + tu.getStrFIRSTNAME() + "  " + tu.getStrLASTNAME());
        parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
        if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
            P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
        }
        if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
            P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
        }
        if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
            P_FOOTER_RC += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
        }
        if (oTOfficine.getStrCENTREIMPOSITION() != null) {
            P_FOOTER_RC += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
        }

        if (oTOfficine.getStrPHONE() != null) {
            String finalphonestring = oTOfficine.getStrPHONE() != null
                    ? "- Tel: " + DateConverter.phoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va : phone) {
                    finalphonestring += " / " + DateConverter.phoneNumberFormat(va);
                }
            }
            P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
        }
        if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
            P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
        }
        if (oTOfficine.getStrNUMCOMPTABLE() != null) {
            P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
        }
        parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
        parameters.put("P_FOOTER_RC", P_FOOTER_RC);
        reportUtil.buildReportEmptyDs(parameters, scr_report_file, jdom.scr_report_file, pdfscr_report_pdf);
        return "/data/reports/pdf/" + "balancevente_caisse" + report_generate_file;
    }

    public String gestionCaissepdf(Params parasm, List<TPrivilege> LstTPrivilege) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();
        boolean allActivitis = DateConverter.hasAuthorityByName(LstTPrivilege, Parameter.P_SHOW_ALL_ACTIVITY);

        String scr_report_file = "rp_gestioncaisses";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "GESTION DES CAISSES  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";

        List<ResumeCaisseDTO> datas = caisseService.getResumeCaisse(dtSt, dtEn, tu, allActivitis, 0, 0, false,
                parasm.getRef(), true);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "gestioncaisses" + report_generate_file, datas);
        return "/data/reports/pdf/gestioncaisses" + report_generate_file;
    }

    public String tableauBordPharmation(Params parasm, boolean ratio, boolean monthly, boolean shollALL) {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_pharma_dashboard";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "TABLEAU DE BORD DU PHARMACIEN \nARRETE " + P_PERIODE);

        List<TableauBaordPhDTO> datas = new ArrayList<>();

        Map<TableauBaordSummary, List<TableauBaordPhDTO>> map = this.balanceService
                .getTableauBoardData(BalanceParamsDTO.builder().dtStart(parasm.getDtStart()).dtEnd(parasm.getDtEnd())
                        .byMonth(monthly).showAllAmount(shollALL)
                        .emplacementId(parasm.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());

        if (!map.isEmpty()) {
            map.forEach((k, v) -> {
                datas.addAll(v);
                parameters.put("montantEsp", k.getMontantEsp());
                parameters.put("montantNet", k.getMontantNet());
                parameters.put("ration", ratio);
                parameters.put("montantRemise", k.getMontantRemise());
                parameters.put("montantCredit", k.getMontantCredit());
                parameters.put("nbreVente", k.getNbreVente());
                parameters.put("montantAchatOne", k.getMontantAchatOne());
                parameters.put("montantAchatTwo", k.getMontantAchatTwo());
                parameters.put("montantAchatThree", k.getMontantAchatThree());
                parameters.put("montantAchatFour", k.getMontantAchatFour());
                parameters.put("montantAchatFive", k.getMontantAchatFive());
                parameters.put("montantAchat", k.getMontantAchat());
                parameters.put("montantAvoir", k.getMontantAvoir());
                parameters.put("ratioVA", k.getRatioVA());
                parameters.put("rationAV", k.getRationAV());
            });
        }

        return reportUtil.buildReport(parameters, scr_report_file, datas);
    }

    public String tvapdf(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_tvastat";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);

        boolean isTvaVNO = StringUtils.isNotBlank(parasm.getRef()) && !"TOUT".equalsIgnoreCase(parasm.getRef());
        List<TvaDTO> datas;
        if (!this.balanceService.useLastUpdateStats()) {
            if (!parasm.isCheckug()) {
                if (isTvaVNO) {
                    datas = salesStatsService.tvasRapportVNO2(parasm);
                } else {
                    if (!tvaService.isExcludTiersPayantActive()) {
                        datas = salesStatsService.tvasRapport2(parasm);
                    } else {
                        datas = tvaService.tva(dtSt, dtEn, false, null);
                    }
                }
            } else {
                if (!tvaService.isExcludTiersPayantActive()) {
                    datas = salesStatsService.tvaRapport2(parasm);
                } else {
                    datas = tvaService.tva(dtSt, dtEn, false, null);
                }
            }
        } else {
            datas = this.balanceService
                    .statistiqueTva(BalanceParamsDTO.builder().dtEnd(parasm.getDtEnd()).dtStart(parasm.getDtStart())
                            .vnoOnly(isTvaVNO).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        }

        datas.sort(Comparator.comparing(TvaDTO::getTaux));
        return reportUtil.buildReport(parameters, scr_report_file, datas);
    }

    Comparator<RapportDTO> comparatorReport = Comparator.comparingInt(RapportDTO::getOder);

    public String reportGestion(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_reportmanagement";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "RAPPORT DE GESTION  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<Params, List<RapportDTO>> map = caisseService.rapportGestion(parasm);
        List<RapportDTO> datas = new ArrayList<>();
        LongAdder montantDep = new LongAdder(), montantRg = new LongAdder();
        map.forEach((k, v) -> {
            if (k.getRef().equals(DateConverter.DEPENSES)) {
                montantDep.add(k.getValue());
            } else {
                montantRg.add(k.getValue());
            }
            if (v != null) {
                datas.addAll(v);
            }
        });
        parameters.put("montantCaisse", montantRg.intValue());
        parameters.put("montantDepense", montantDep.intValue());
        datas.sort(comparatorReport);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rapport_gestion_" + report_generate_file, datas);
        return "/data/reports/pdf/rapport_gestion_" + report_generate_file;
    }

    public String suivMvtArticle(LocalDate dtSt, LocalDate dtEn, String produitId, String empl, TUser tu) {
        Comparator<MvtProduitDTO> mvtrByDate = Comparator.comparing(MvtProduitDTO::getDateOperation);

        String scr_report_file = "rp_suivi_mvt_article";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        TFamille famille = produitService.findById(produitId);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "FICHE DES MOUVEMENTS DE L'ARTICLE  " + famille.getIntCIP() + " "
                + famille.getStrNAME() + " \n" + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";

        MvtProduitDTO map = produitService.suivitEclate(dtSt, dtEn, produitId, empl);
        List<MvtProduitDTO> datas = map.getProduits();
        datas.sort(mvtrByDate);
        if (!datas.isEmpty()) {
            parameters.put("qtyVente", map.getQtyVente());
            parameters.put("qtyAnnulation", map.getQtyAnnulation());
            parameters.put("qtyRetour", map.getQtyRetour());
            parameters.put("qtyRetourDepot", map.getQtyRetourDepot());
            parameters.put("qtyInv", map.getQtyInv());
            parameters.put("stockInit", map.getStockInit());
            parameters.put("stockFinal", map.getStockFinal());
            parameters.put("qtyPerime", map.getQtyPerime());
            parameters.put("qtyAjust", map.getQtyAjust());
            parameters.put("qtyAjustSortie", map.getQtyAjustSortie());
            parameters.put("qtyDeconEntrant", map.getQtyDeconEntrant());
            parameters.put("qtyDecondSortant", map.getQtyDecondSortant());
            parameters.put("qtyEntree", map.getQtyEntree());
        }

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "suivi_mvt_article_" + report_generate_file, datas);
        return "/data/reports/pdf/suivi_mvt_article_" + report_generate_file;
    }

    public String recap(Params parasm) {
        LocalDate dtSt = LocalDate.now();
        LocalDate dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scrreportfile = "rp_recap";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String periode = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            periode += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "RAPPORT PERIODIQUE D'ACTIVITE" + periode);
        String reportgeneratefile = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";

        List<RecapActiviteReglementDTO> totaux = new ArrayList<>();
        List<RecapActiviteReglementDTO> chiffres = new ArrayList<>();
        List<AchatDTO> achats = new ArrayList<>();
        RecapActiviteDTO o = dashBoardService.donneesRecapActivite(dtSt, dtEn,
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu);
        List<Params> factures = dashBoardService.donneesReglementsTp(dtSt, dtEn,
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu, parasm.getDescription(), 0, 0, true);
        List<RecapActiviteCreditDTO> credits = dashBoardService.donneesCreditAccordes(BalanceParamsDTO.builder()
                .dtStart(parasm.getDtStart()).dtEnd(parasm.getDtEnd()).query(parasm.getDescription()).all(true)
                .showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        List<Params> ratios = Arrays.asList(
                new Params("Total comptant",
                        NumberUtils.formatLongToString(o.getMontantEsp()) + "(" + o.getPourcentageEsp() + "%)"),
                new Params("Total crédit",
                        NumberUtils.formatLongToString(o.getMontantCredit()) + " (" + o.getPourcentageCredit() + "%)"),
                new Params("Ratio V/A", o.getRatio() + ""));
        totaux.addAll(Arrays.asList(new RecapActiviteReglementDTO("Total HT", o.getMontantTotalHT()),
                new RecapActiviteReglementDTO("Total TVA", o.getMontantTotalTVA()),
                new RecapActiviteReglementDTO("Total TTC", o.getMontantTotalTTC()),
                new RecapActiviteReglementDTO("Marge ", o.getMarge())));
        chiffres.addAll(Arrays.asList(new RecapActiviteReglementDTO("Montant TTC", o.getMontantTTC()),
                new RecapActiviteReglementDTO("Montant remise", o.getMontantRemise()),
                new RecapActiviteReglementDTO("Montant net", o.getMontantNet()),
                new RecapActiviteReglementDTO("Montant TVA", o.getMontantTVA()),
                new RecapActiviteReglementDTO("Montant HT", o.getMontantHT()),
                new RecapActiviteReglementDTO("Total comptant", o.getMontantEsp()),
                new RecapActiviteReglementDTO("Total crédit", o.getMontantCredit())));
        achats.addAll(o.getAchats());
        RecapActiviteCreditDTO summary = dashBoardService.donneesRecapTotataux(BalanceParamsDTO.builder()
                .dtStart(parasm.getDtStart()).dtEnd(parasm.getDtEnd()).query(parasm.getDescription())
                .showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        parameters.put("factures", factures);
        parameters.put("credits", credits);
        parameters.put("mvtsCaisse", o.getMvtsCaisse());
        parameters.put("reglements", o.getReglements());
        parameters.put("achats", achats);
        parameters.put("totaux", totaux);
        parameters.put("ratios", ratios);
        parameters.put("chiffres", chiffres);

        parameters.put("nbreClient", summary.getNbreClient());
        parameters.put("nbreBons", summary.getNbreBons());
        parameters.put("montant", summary.getMontant());
        reportUtil.buildReportEmptyDs(parameters, scrreportfile, jdom.scr_report_file,
                jdom.scr_report_pdf + "recap_" + reportgeneratefile);
        return "/data/reports/pdf/recap_" + reportgeneratefile;
    }

    public String tvaJourpdf(Params parasm) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_tvastatjour";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";

        List<TvaDTO> datas = salesStatsService.tvasRapportJournalier2(parasm);
        // datas.sort(comparatorTvaDTO);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "tvastat_" + report_generate_file, datas);
        return "/data/reports/pdf/tvastat_" + report_generate_file;
    }

    public String familleArticle(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_statfamilleart";
        Period periode = Period.between(dtSt, dtEn);
        if (periode.getMonths() > 0) {
            scr_report_file = "rp_statfamilleart_periode";
        }
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Statistiques Familles Articles  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService
                .statistiqueParFamilleArticle(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_statfamilleart_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_statfamilleart_" + report_generate_file;
    }

    public String produitPerimes(String query, int nbreMois, String dtStart, String dtEnd, TUser tu, String codeFamile,
            String codeRayon, String codeGrossiste) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_perimerquery";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "PRODUITS PERIMES " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<VenteDetailsDTO, List<VenteDetailsDTO>> p = ficheArticleService.produitPerimes(query, nbreMois, dtStart,
                dtEnd, codeFamile, codeRayon, codeGrossiste, 0, 0, true);
        VenteDetailsDTO summary = p.getLeft();
        List<VenteDetailsDTO> data = p.getRight();
        if (!StringUtils.isEmpty(codeFamile)) {
            data.sort(Comparator.comparing(VenteDetailsDTO::getTicketName));
        } else if (!StringUtils.isEmpty(codeGrossiste)) {
            data.sort(Comparator.comparing(VenteDetailsDTO::getTypeVente));
        } else {
            data.sort(Comparator.comparing(VenteDetailsDTO::getOperateur));
        }
        parameters.put("stock", summary.getIntQUANTITY());
        parameters.put("achat", summary.getIntPRICEREMISE());
        parameters.put("vente", summary.getIntPRICE());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_perimes_" + report_generate_file, data);
        return "/data/reports/pdf/rp_perimes_" + report_generate_file;
    }

    public String statistiqueParRayons(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_stat_vente_rayon";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Chiffre d'affaires par emplacement  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService
                .statistiqueParRayons(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("groupeLibelle", "Emplacement");
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_stat_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_stat_" + report_generate_file;
    }

    public String statistiqueParGrossistes(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_stat_vente_rayon";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Chiffre d'affaires par grossiste  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService
                .statistiqueParGrossistes(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("groupeLibelle", "Grossiste");
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_stat_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_stat_" + report_generate_file;
    }

    public String listeVentes(SalesStatsParams params) {

        String scr_report_file = "rp_list_avoirs";
        Map<String, Object> parameters = reportUtil.officineData(params.getUserId());
        parameters.put("P_H_CLT_INFOS", "LISTE DES AVOIRS");
        parameters.put("avoir_subreport", jdom.scr_report_file);

        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss"))
                + ".pdf";
        List<VenteDTO> data = salesStatsService.listeVentesReport(params);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "avoirs_" + report_generate_file, data);
        return "/data/reports/pdf/avoirs_" + report_generate_file;
    }

    public String tbalancePara(Params parasm) {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        String scr_report_file = "rp_balancevente_caissevpara";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "BALANCE VENTE PRODUITS PARA " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        GenericDTO wrapper = caisseService.balanceVenteCaisseReportPara(dtSt, dtEn,
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        List<BalanceDTO> datas = wrapper.getBalances();
        SummaryDTO summaryDTO = wrapper.getSummary();
        parameters.put("montantEsp", summaryDTO.getMontantEsp());
        parameters.put("montantNet", summaryDTO.getMontantNet());
        parameters.put("montantRemise", summaryDTO.getMontantRemise());
        parameters.put("nbreVente", summaryDTO.getNbreVente());
        parameters.put("montantTTC", summaryDTO.getMontantTTC());
        parameters.put("montantMobilePayment", summaryDTO.getMontantMobilePayment());
        parameters.put("montantCB", summaryDTO.getMontantCB());
        parameters.put("montantCheque", summaryDTO.getMontantCheque());
        parameters.put("montantVirement", summaryDTO.getMontantVirement());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_balancevente_caissevpara_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_balancevente_caissevpara_" + report_generate_file;
    }

    public String saisiePerimes(String query, String dtStart, String dtEnd, TUser tu, String codeFamile,
            String codeRayon, String codeGrossiste, Integer grouby) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_perimev2";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "PRODUITS PERIMES " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<VenteDetailsDTO> data = ficheArticleService.saisiePerimes(query, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste, grouby, 0, 0, true);
        if (grouby != null) {
            scr_report_file = "rp_perimegroup";
            if (grouby.compareTo(0) == 0) {
                data.sort(Comparator.comparing(VenteDetailsDTO::getLibelleFamille)
                        .thenComparing(VenteDetailsDTO::getDateOperation, Comparator.reverseOrder()));
            } else if (grouby.compareTo(1) == 0) {
                data.sort(Comparator.comparing(VenteDetailsDTO::getLibelleRayon)
                        .thenComparing(VenteDetailsDTO::getDateOperation, Comparator.reverseOrder()));
            } else if (grouby.compareTo(2) == 0) {
                data.sort(Comparator.comparing(VenteDetailsDTO::getLibelleGrossiste)
                        .thenComparing(VenteDetailsDTO::getDateOperation, Comparator.reverseOrder()));
            }
        }

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_perimes_" + report_generate_file, data);
        return "/data/reports/pdf/rp_perimes_" + report_generate_file;
    }

    public String familleArticleveto(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_statfamilleartveto";
        Period periode = Period.between(dtSt, dtEn);
        if (periode.getMonths() > 0) {
            scr_report_file = "rp_statfamilleart_periodeveto";
        }
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Statistiques Familles Articles  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService
                .statistiqueParFamilleArticleVeto(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        parameters.put("totalRemiseVO", summary.getTotalRemiseVO());
        parameters.put("totalRemiseVNO", summary.getTotalRemiseVNO());
        parameters.put("totalRemiseVetoVO", summary.getTotalRemiseVetoVO());
        parameters.put("totalRemiseVetoVNO", summary.getTotalRemiseVetoVNO());
        parameters.put("montantCumulRemise", summary.getMontantCumulRemise());
        parameters.put("totalCaVO", summary.getTotalCaVO());
        parameters.put("totalCaVNO", summary.getTotalCaVNO());
        parameters.put("totalCaVetoVO", summary.getTotalCaVetoVO());
        parameters.put("totalCaVetoVNO", summary.getTotalCaVetoVNO());
        parameters.put("totalRemiseVeto", summary.getTotalRemiseVeto());
        parameters.put("totalCaVeto", summary.getTotalCaVeto());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_statfamilleart_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_statfamilleart_" + report_generate_file;
    }

    public String suiviRemise(SalesStatsParams params) {

        String scr_report_file = "rp_suivi_remise";
        Map<String, Object> parameters = reportUtil.officineData(params.getUserId());
        String periode = "PERIODE DU " + params.getDtStart().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!params.getDtStart().isEqual(params.getDtEnd())) {
            periode += " AU " + params.getDtEnd().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "SUIVI  REMISE " + periode);
        parameters.put("suivi_remise_subreport", jdom.scr_report_file);

        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss"))
                + ".pdf";
        List<VenteDTO> data = salesStatsService.venteAvecRemise(params);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "suivi_remise_" + report_generate_file, data);
        return "/data/reports/pdf/suivi_remise_" + report_generate_file;
    }
}
