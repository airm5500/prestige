/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import bll.common.Parameter;
import commonTasks.dto.AchatDTO;
import commonTasks.dto.BalanceDTO;
import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.FamilleArticleStatDTO;
import commonTasks.dto.GenericDTO;
import commonTasks.dto.MvtProduitDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RapportDTO;
import commonTasks.dto.RecapActiviteDTO;
import commonTasks.dto.ResumeCaisseDTO;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.SumCaisseDTO;
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
import enumeration.Peremption;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.LongAdder;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import rest.report.ReportUtil;
import rest.service.CaisseService;
import rest.service.CommonService;
import rest.service.DashBoardService;
import rest.service.FamilleArticleService;
import rest.service.FicheArticleService;
import rest.service.ProduitService;
import rest.service.SalesStatsService;
import toolkits.utils.jdom;
import util.DateConverter;

/**
 *
 * @author DICI
 */
@Stateless
public class Balance {

    @EJB
    CaisseService caisseService;
    @EJB
    ReportUtil reportUtil;
    @EJB
    CommonService commonService;
    @EJB
    SalesStatsService salesStatsService;
    @EJB
    ProduitService produitService;
    @EJB
    DashBoardService dashBoardService;
    @EJB
    FamilleArticleService familleArticleService;
    @EJB
    FicheArticleService ficheArticleService;

    public String generatepdf(Params parasm) throws IOException {
        TUser tu = parasm.getOperateur();
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_balancevente_caissev2";
        String P_H_CLT_INFOS;
        TEmplacement empl = tu.getLgEMPLACEMENTID();
        String P_FOOTER_RC = "";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        String pdfscr_report_pdf = jdom.scr_report_pdf + "balancevente_caisse" + report_generate_file;
        Map<String, Object> parameters = new HashMap();
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        BalanceDTO vo = new BalanceDTO();
        BalanceDTO vno = new BalanceDTO();
        GenericDTO generic = caisseService.balanceVenteCaisseReport(dtSt, dtEn, true, empl.getLgEMPLACEMENTID());
        List<VisualisationCaisseDTO> findAllMvtCaisse = caisseService.findAllMvtCaisse(dtSt, dtEn, true, empl.getLgEMPLACEMENTID());
        SummaryDTO summary = generic.getSummary();
        List<BalanceDTO> balances = generic.getBalances();

        int totalP = 0;
        if (!balances.isEmpty()) {
            totalP = 100;
            Map<String, List<BalanceDTO>> map = balances.stream().collect(Collectors.groupingBy(BalanceDTO::getTypeVente));
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

        P_H_CLT_INFOS = "BALANCE VENTE/CAISSE             DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
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

        parameters.put("P_TOTAL_TIERSPAYANT", DateConverter.amountFormat(summary.getMontantTp(), ' '));
        parameters.put("P_TOTAL_AVOIR", summary.getMontantDiff());
        parameters.put("P_TOTAL_PERCENT", totalP + "");
        parameters.put("P_TOTAL_VENTE", DateConverter.amountFormat(summary.getMontantEsp() + summary.getMontantCheque() + summary.getMontantVirement() + summary.getMontantCB(), ' '));
        String P_FONDCAISSE_LABEL = "",
                P_SORIECAISSE_LABEL = "",
                P_ENTREECAISSE_LABEL = "",
                P_REGLEMENT_LABEL = "",
                P_ACCOMPTE_LABEL = "",
                P_DIFFERE_LABEL = "",
                P_TOTAL_CAISSE_LABEL;
        Integer P_SORTIECAISSE_ESPECE = 0,
                P_SORTIECAISSE_CHEQUES = 0,
                P_SORTIECAISSE_CB = 0,
                P_SORTIECAISSE_VIREMENT = 0,
                P_TOTAL_SORTIE_CAISSE,
                P_ENTREECAISSE_ESPECE = 0,
                P_ENTREECAISSE_VIREMENT = 0,
                P_ENTREECAISSE_CHEQUES = 0,
                P_ENTREECAISSE_CB = 0,
                P_TOTAL_ENTREE_CAISSE,
                P_REGLEMENT_ESPECE = 0,
                P_REGLEMENT_CHEQUES = 0,
                P_REGLEMENT_VIREMENT = 0,
                P_REGLEMENT_CB = 0,
                P_TOTAL_REGLEMENT_CAISSE,
                P_ACCOMPTE_ESPECE = 0,
                P_ACCOMPTE_CHEQUES = 0,
                P_ACCOMPTE_VIREMENT = 0,
                P_ACCOMPTE_CB = 0,
                P_TOTAL_ACCOMPTE_CAISSE,
                P_FONDCAISSE = 0,
                P_DIFFERE_CHEQUES = 0,
                P_DIFFERE_CB = 0,
                P_TOTAL_GLOBAL_CAISSE,
                P_DIFFERE_ESPECE = 0,
                P_DIFFERE_VIREMENT = 0,
                P_TOTAL_VIREMENT_GLOBAL,
                P_TOTAL_DIFFERE_CAISSE,
                P_TOTAL_ESPECES_GLOBAL,
                P_TOTAL_CHEQUES_GLOBAL,
                P_TOTAL_CB_GLOBAL;
        Map<String, List<VisualisationCaisseDTO>> typeMvtMap = findAllMvtCaisse.parallelStream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getTypeMvt));
        for (Map.Entry<String, List<VisualisationCaisseDTO>> entry : typeMvtMap.entrySet()) {
            String key = entry.getKey();
            List<VisualisationCaisseDTO> val = entry.getValue();
            Map<String, List<VisualisationCaisseDTO>> typeRe;
            List<VisualisationCaisseDTO> list;
            switch (key) {
                case DateConverter.MVT_FOND_CAISSE:
                    P_FONDCAISSE_LABEL = val.get(0).getTypeMouvement();
                    P_FONDCAISSE = val.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    break;
                case DateConverter.MVT_SORTIE_CAISSE:
                    P_SORIECAISSE_LABEL = val.get(0).getTypeMouvement();
                    typeRe = val.parallelStream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                    list = typeRe.get(DateConverter.MODE_ESP);
                    P_SORTIECAISSE_ESPECE = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CHEQUE);
                    P_SORTIECAISSE_CHEQUES = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CB);
                    P_SORTIECAISSE_CB = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_VIREMENT);
                    P_SORTIECAISSE_VIREMENT = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    break;
                case DateConverter.MVT_ENTREE_CAISSE:
                    P_ENTREECAISSE_LABEL = val.get(0).getTypeMouvement();
                    typeRe = val.parallelStream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                    list = typeRe.get(DateConverter.MODE_ESP);
                    P_ENTREECAISSE_ESPECE = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CHEQUE);
                    P_ENTREECAISSE_CHEQUES = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CB);
                    P_ENTREECAISSE_CB = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_VIREMENT);
                    P_ENTREECAISSE_VIREMENT = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    break;
                case DateConverter.MVT_REGLE_TP:
                    P_REGLEMENT_LABEL = val.get(0).getTypeMouvement();
                    typeRe = val.parallelStream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                    list = typeRe.get(DateConverter.MODE_ESP);
                    P_REGLEMENT_ESPECE = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CHEQUE);
                    P_REGLEMENT_CHEQUES = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CB);
                    P_REGLEMENT_CB = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_VIREMENT);
                    P_REGLEMENT_VIREMENT = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    break;
                case DateConverter.MVT_REGLE_DIFF:
                    P_DIFFERE_LABEL = val.get(0).getTypeMouvement();
                    typeRe = val.parallelStream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getModeRegle));
                    list = typeRe.get(DateConverter.MODE_ESP);
                    P_DIFFERE_ESPECE = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CHEQUE);
                    P_DIFFERE_CHEQUES = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_CB);
                    P_DIFFERE_CB = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    list = typeRe.get(DateConverter.MODE_VIREMENT);
                    P_DIFFERE_VIREMENT = (list == null) ? 0 : list.parallelStream().map(VisualisationCaisseDTO::getMontantNet).reduce(0, Integer::sum);
                    break;
            }

        }
        Integer P_VENTEDEPOT_ESPECE = 0, P_TOTAL_REGLEMENTDEPOT_CAISSE = 0, P_TOTAL_VENTEDEPOT_CAISSE = 0, P_REGLEMENTDEPOT_ESPECE = 0, P_REGLEMENTDEPOT_CB = 0, P_REGLEMENTDEPOT_CHEQUES = 0;
        if (empl.getLgEMPLACEMENTID().equals(DateConverter.OFFICINE)) {
            P_VENTEDEPOT_ESPECE = (-1) * caisseService.totalVenteDepot(dtSt, dtEn, empl.getLgEMPLACEMENTID());
            P_TOTAL_VENTEDEPOT_CAISSE = P_VENTEDEPOT_ESPECE;
            List<MvtTransaction> transactions = caisseService.venteDepot(dtSt, dtEn, true, empl.getLgEMPLACEMENTID());
            if (!transactions.isEmpty()) {
                LongAdder esp = new LongAdder();
                LongAdder ch = new LongAdder();
                LongAdder cb = new LongAdder();
                transactions.parallelStream().forEach(de -> {
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
                        default:
                            break;
                    }

                });
                P_REGLEMENTDEPOT_ESPECE = esp.intValue();
                P_REGLEMENTDEPOT_CHEQUES = ch.intValue();
                P_REGLEMENTDEPOT_CB = cb.intValue();
                P_TOTAL_REGLEMENTDEPOT_CAISSE = P_REGLEMENTDEPOT_ESPECE + P_REGLEMENTDEPOT_CHEQUES + P_REGLEMENTDEPOT_CB;
            }

        }
        String P_VENTEDEPOT_LABEL = "Ventes aux dépôts extensions", P_REGLEMENTDEPOT_LABEL = "Règlement des ventes des dépôts";
        P_VENTEDEPOT_LABEL = (P_TOTAL_VENTEDEPOT_CAISSE != 0 ? P_VENTEDEPOT_LABEL : "");
        P_REGLEMENTDEPOT_LABEL = (P_TOTAL_REGLEMENTDEPOT_CAISSE > 0 ? P_REGLEMENTDEPOT_LABEL : "");

        parameters.put("P_VENTEDEPOT_LABEL", P_VENTEDEPOT_LABEL);
        parameters.put("P_VENTEDEPOT_ESPECE", DateConverter.amountFormat(P_VENTEDEPOT_ESPECE, ' '));
        parameters.put("P_VENTEDEPOT_CHEQUES", 0);
        parameters.put("P_VENTEDEPOT_CB", 0);
        parameters.put("P_TOTAL_VENTEDEPOT_CAISSE", DateConverter.amountFormat(P_TOTAL_VENTEDEPOT_CAISSE, ' '));

        parameters.put("P_REGLEMENTDEPOT_LABEL", P_REGLEMENTDEPOT_LABEL);
        parameters.put("P_REGLEMENTDEPOT_ESPECE", DateConverter.amountFormat(P_REGLEMENTDEPOT_ESPECE, ' '));
        parameters.put("P_REGLEMENTDEPOT_CHEQUES", DateConverter.amountFormat(P_REGLEMENTDEPOT_CHEQUES, ' '));
        parameters.put("P_REGLEMENTDEPOT_CB", DateConverter.amountFormat(P_REGLEMENTDEPOT_CB, ' '));
        parameters.put("P_TOTAL_REGLEMENTDEPOT_CAISSE", DateConverter.amountFormat(P_TOTAL_REGLEMENTDEPOT_CAISSE, ' '));

        P_TOTAL_SORTIE_CAISSE = P_SORTIECAISSE_ESPECE + P_SORTIECAISSE_CHEQUES + P_SORTIECAISSE_CB;
        P_TOTAL_ENTREE_CAISSE = P_ENTREECAISSE_ESPECE + P_ENTREECAISSE_CHEQUES + P_ENTREECAISSE_CB;
        P_TOTAL_REGLEMENT_CAISSE = P_REGLEMENT_ESPECE + P_REGLEMENT_CHEQUES + P_REGLEMENT_CB;
        P_TOTAL_ACCOMPTE_CAISSE = P_ACCOMPTE_ESPECE + P_ACCOMPTE_CHEQUES + P_ACCOMPTE_CB;
        P_TOTAL_DIFFERE_CAISSE = P_DIFFERE_ESPECE + P_DIFFERE_CHEQUES + P_DIFFERE_CB;

        P_TOTAL_ESPECES_GLOBAL = (P_FONDCAISSE + summary.getMontantEsp() + P_ENTREECAISSE_ESPECE + P_REGLEMENT_ESPECE + P_ACCOMPTE_ESPECE + P_DIFFERE_ESPECE) + P_SORTIECAISSE_ESPECE;
        P_TOTAL_CHEQUES_GLOBAL = summary.getMontantCheque() + P_SORTIECAISSE_CHEQUES + P_ENTREECAISSE_CHEQUES + P_REGLEMENT_CHEQUES + P_ACCOMPTE_CHEQUES + P_DIFFERE_CHEQUES;
        P_TOTAL_VIREMENT_GLOBAL = summary.getMontantVirement() + P_ENTREECAISSE_VIREMENT + P_SORTIECAISSE_VIREMENT + P_REGLEMENT_VIREMENT + P_ACCOMPTE_VIREMENT + P_DIFFERE_VIREMENT;
        P_TOTAL_CB_GLOBAL = summary.getMontantCB() + P_SORTIECAISSE_CB + P_ENTREECAISSE_CB + P_REGLEMENT_CB + P_ACCOMPTE_CB + P_DIFFERE_CB;

        /* code ajouté 15/07/2015 */
        P_TOTAL_GLOBAL_CAISSE = +P_TOTAL_ESPECES_GLOBAL + P_TOTAL_CHEQUES_GLOBAL + P_TOTAL_CB_GLOBAL;
        parameters.put("P_TOTAL_GLOBAL_CAISSE", DateConverter.amountFormat(P_TOTAL_GLOBAL_CAISSE, ' '));
        parameters.put("P_TOTAL_VIREMENT_GLOBAL", DateConverter.amountFormat(P_TOTAL_VIREMENT_GLOBAL, ' '));
        parameters.put("P_SORIECAISSE_LABEL", P_SORIECAISSE_LABEL);
        parameters.put("P_TOTAL_CB_GLOBAL", DateConverter.amountFormat(P_TOTAL_CB_GLOBAL, ' '));
        parameters.put("P_TOTAL_CHEQUES_GLOBAL", DateConverter.amountFormat(P_TOTAL_CHEQUES_GLOBAL, ' '));
        parameters.put("P_FONDCAISSE", DateConverter.amountFormat(P_FONDCAISSE, ' '));
        parameters.put("P_SORTIECAISSE_ESPECE", DateConverter.amountFormat(P_SORTIECAISSE_ESPECE, ' '));
        parameters.put("P_SORTIECAISSE_CHEQUES", DateConverter.amountFormat(P_SORTIECAISSE_CHEQUES, ' '));
        parameters.put("P_SORTIECAISSE_CB", DateConverter.amountFormat(P_SORTIECAISSE_CB, ' '));
        parameters.put("P_SORTIECAISSE_VIREMENT", DateConverter.amountFormat(P_SORTIECAISSE_VIREMENT, ' '));
        parameters.put("P_TOTAL_FONDCAISSE", DateConverter.amountFormat(P_FONDCAISSE, ' '));
        parameters.put("P_TOTAL_SORTIE_CAISSE", DateConverter.amountFormat(P_TOTAL_SORTIE_CAISSE, ' '));
        parameters.put("P_ENTREECAISSE_ESPECE", DateConverter.amountFormat(P_ENTREECAISSE_ESPECE, ' '));
        parameters.put("P_ENTREECAISSE_VIREMENT", DateConverter.amountFormat(P_ENTREECAISSE_VIREMENT, ' '));
        parameters.put("P_ENTREECAISSE_CHEQUES", DateConverter.amountFormat(P_ENTREECAISSE_CHEQUES, ' '));
        parameters.put("P_ENTREECAISSE_CB", DateConverter.amountFormat(P_ENTREECAISSE_CB, ' '));
        parameters.put("P_TOTAL_ENTREE_CAISSE", DateConverter.amountFormat(P_TOTAL_ENTREE_CAISSE, ' '));
        parameters.put("P_REGLEMENT_ESPECE", DateConverter.amountFormat(P_REGLEMENT_ESPECE, ' '));
        parameters.put("P_REGLEMENT_VIREMENT", DateConverter.amountFormat(P_REGLEMENT_VIREMENT, ' '));
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
        P_TOTAL_CAISSE_LABEL = "Total caisse " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_TOTAL_CAISSE_LABEL", P_TOTAL_CAISSE_LABEL);
        parameters.put("P_FONDCAISSE_LABEL", P_FONDCAISSE_LABEL);
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
            String finalphonestring = oTOfficine.getStrPHONE() != null ? "- Tel: " + DateConverter.phoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
            if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                for (String va  : phone) {
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
//        String str_final_file = jdom.scr_report_pdf + "balancevente_caisse" + report_generate_file;
//        reportUtil.buildReportEmptyDs(parameters, final_report_file, pdfscr_report_pdf);
        reportUtil.buildReportEmptyDs(parameters, scr_report_file, jdom.scr_report_file, pdfscr_report_pdf);
        // response.sendRedirect(servletRequest.getContextPath() + "/data/reports/pdf/" + "balancevente_caisse" + report_generate_file);
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
        //  List<TPrivilege> LstTPrivilege = (List<TPrivilege>) hs.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
        boolean allActivitis = DateConverter.hasAuthorityByName(LstTPrivilege, Parameter.P_SHOW_ALL_ACTIVITY);
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_gestioncaisses";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "GESTION DES CAISSES  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";

        List<ResumeCaisseDTO> datas = caisseService.resumeCaisse(dtSt, dtEn, tu, allActivitis, 0, 0, false, parasm.getRef(), true);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "gestioncaisses" + report_generate_file, datas);
        return "/data/reports/pdf/gestioncaisses" + report_generate_file;
    }

    public String tableauBordPharmation(Params parasm, boolean ratio) {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_pharma_dashboard";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "TABLEAU DE BORD DU PHARMACIEN \nARRETE " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<TableauBaordPhDTO> datas = new ArrayList<>();

        Map<TableauBaordSummary, List<TableauBaordPhDTO>> map = caisseService.tableauBoardDatas(dtSt, dtEn, Boolean.TRUE, tu, 0, 0, 0, true);
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

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "tableau_de_bord_" + report_generate_file, datas);
        return "/data/reports/pdf/tableau_de_bord_" + report_generate_file;
    }

    public String tvapdf(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_tvastat";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<TvaDTO> datas = salesStatsService.tvasRapport(parasm);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "tvastat_" + report_generate_file, datas);
        return "/data/reports/pdf/tvastat_" + report_generate_file;
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

        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_reportmanagement";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
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
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "rapport_gestion_" + report_generate_file, datas);
        return "/data/reports/pdf/rapport_gestion_" + report_generate_file;
    }

    public String listeCaisse(CaisseParamsDTO caisseParams, TUser tu) throws IOException {
        final Comparator<VisualisationCaisseDTO> comparatorCaisse = Comparator.comparing(VisualisationCaisseDTO::getDateOperation);
        SumCaisseDTO caisse = caisseService.cumul(caisseParams, true);
        List<VisualisationCaisseDTO> datas = new ArrayList<>();
        Map<String, List<VisualisationCaisseDTO>> map = caisse.getCaisses().stream().collect(Collectors.groupingBy(VisualisationCaisseDTO::getOperateurId));
        map.forEach((k, v) -> {
            v.sort(comparatorCaisse);
            VisualisationCaisseDTO dto = new VisualisationCaisseDTO();
            VisualisationCaisseDTO index0 = v.get(0);
            dto.setDateOperation(index0.getDateOperation());
            dto.setOperateur(index0.getOperateur());
            dto.setOperateurId(k);
            dto.setDatas(v);
            datas.add(dto);
        });
        datas.sort(comparatorCaisse);
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_listecaisses1";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
        String P_PERIODE = "PERIODE DU " + debut.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
        P_PERIODE += " AU " + fin.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        parameters.put("P_H_CLT_INFOS", "LISTE DES CAISSES  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        parameters.put("totaux", caisse.getSummary());
        parameters.put("sub_reportUrl", jdom.scr_report_file);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "listecaisses_" + report_generate_file, datas);
        return "/data/reports/pdf/listecaisses_" + report_generate_file;
    }

    public String suivMvtArticle(LocalDate dtSt, LocalDate dtEn, String produitId, String empl, TUser tu) {
        Comparator<MvtProduitDTO> mvtrByDate = Comparator.comparing(MvtProduitDTO::getDateOperation);
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_suivi_mvt_article";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        TFamille famille = produitService.findById(produitId);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "FICHE DES MOUVEMENTS DE L'ARTICLE  " + famille.getIntCIP() + " " + famille.getStrNAME() + " \n" + P_PERIODE);
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

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "suivi_mvt_article_" + report_generate_file, datas);
        return "/data/reports/pdf/suivi_mvt_article_" + report_generate_file;
    }

    public String tableauBordPharmationOld(Params parasm, boolean ratio) {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_pharma_dashboard";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "TABLEAU DE BORD DU PHARMACIEN \nARRETE " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<TableauBaordPhDTO> datas = new ArrayList<>();
        Map<TableauBaordSummary, List<TableauBaordPhDTO>> map = caisseService.tableauBoardDatasOld(dtSt, dtEn, Boolean.TRUE, tu, 0, 0, 0, true);
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
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "tableau_de_bord_" + report_generate_file, datas);
        return "/data/reports/pdf/tableau_de_bord_" + report_generate_file;
    }

    public String recap(Params parasm) {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_recap";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "RAPPORT PERIODIQUE D'ACTIVITE" + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<Params> reglements = new ArrayList<>();
        List<Params> mvtsCaisse = new ArrayList<>();
        List<Params> totaux = new ArrayList<>();
        List<Params> chiffres = new ArrayList<>();
        List<AchatDTO> achats = new ArrayList<>();
        RecapActiviteDTO o = dashBoardService.donneesRecapActivite(dtSt, dtEn, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu, null);
        List<Params> factures = dashBoardService.donneesReglementsTp(dtSt, dtEn, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu, null, 0, 0, true);
        List<Params> credits = dashBoardService.donneesCreditAccordes(dtSt, dtEn, tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu, null, 0, 0, true);
        List<Params> ratios = Arrays.asList(new Params("Total comptant", DateConverter.amountFormat(o.getMontantEsp()) + "(" + o.getPourcentageEsp() + "%)"),
                new Params("Total crédit", DateConverter.amountFormat(o.getMontantCredit()) + " (" + o.getPourcentageCredit() + "%)"),
                new Params("Ratio V/A", o.getRatio() + "")
        );
        totaux.addAll(Arrays.asList(new Params("Total HT", o.getMontantTotalHT()),
                new Params("Total TVA", o.getMontantTotalTVA()),
                new Params("Total TTC", o.getMontantTotalTTC()),
                new Params("Marge ", o.getMarge())
        ));
        chiffres.addAll(Arrays.asList(new Params("Montant TTC", o.getMontantTTC()),
                new Params("Montant remise", o.getMontantRemise()),
                new Params("Montant net", o.getMontantNet()),
                new Params("Montant TVA", o.getMontantTVA()),
                new Params("Montant HT", o.getMontantHT()),
                new Params("Total comptant", o.getMontantEsp()),
                new Params("Total crédit", o.getMontantCredit())
        ));
        achats.addAll(o.getAchats());
        reglements.addAll(o.getReglements());
        mvtsCaisse.addAll(o.getMvtsCaisse());
        parameters.put("factures", factures);
        parameters.put("credits", credits);
        parameters.put("mvtsCaisse", mvtsCaisse);
        parameters.put("reglements", reglements);
        parameters.put("achats", achats);
        parameters.put("totaux", totaux);
        parameters.put("ratios", ratios);
        parameters.put("chiffres", chiffres);
        reportUtil.buildReportEmptyDs(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "recap_" + report_generate_file);
        return "/data/reports/pdf/recap_" + report_generate_file;
    }

    Comparator<TvaDTO> comparatorTvaDTO = Comparator.comparing(TvaDTO::getLocalOperation);

    public String tvaJourpdf(Params parasm) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(parasm.getDtStart());
            dtEn = LocalDate.parse(parasm.getDtEnd());
        } catch (Exception e) {
        }
        TUser tu = parasm.getOperateur();

        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_tvastatjour";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA  " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<TvaDTO> datas = salesStatsService.tvasRapportJournalier(parasm);
        datas.sort(comparatorTvaDTO);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "tvastat_" + report_generate_file, datas);
        return "/data/reports/pdf/tvastat_" + report_generate_file;
    }

    public String familleArticle(String dtStart, String dtEnd, String codeFamile, String query, TUser tu, String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_statfamilleart";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Statistiques Familles Articles  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService.statistiqueParFamilleArticle(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "rp_statfamilleart_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_statfamilleart_" + report_generate_file;
    }

    Comparator<VenteDetailsDTO> comparatorQty = Comparator.comparingInt(VenteDetailsDTO::getIntQUANTITY);
    Comparator<VenteDetailsDTO> comparatorPrice = Comparator.comparingInt(VenteDetailsDTO::getIntPRICE);

    public String geVingtQuatreVingt(String dtStart, String dtEnd, TUser tu, String codeFamile, String codeRayon, String codeGrossiste, boolean qtyOrCa) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_vingtquatre";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        String tile = qtyOrCa ? " PAR QUANTITE VENDUE " : "PAR CHIFFRE D'AFFAIRE ";
        parameters.put("P_H_CLT_INFOS", "EDITION DES 20/80" + tile + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<VenteDetailsDTO> datas = familleArticleService.geVingtQuatreVingt(dtStart, dtEnd, tu, codeFamile, codeRayon, codeGrossiste, 0, 0, true, qtyOrCa);
        if (qtyOrCa) {
            datas.sort(comparatorQty.reversed());
        } else {
            datas.sort(comparatorPrice.reversed());
        }
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "rp_vingtquatre" + report_generate_file, datas);
        return "/data/reports/pdf/rp_vingtquatre" + report_generate_file;
    }

    public String produitPerimes(String query, String dtStart, Peremption filtre, TUser tu, String codeFamile, String codeRayon, String codeGrossiste) throws IOException {

        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_perimerquery";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);

        parameters.put("P_H_CLT_INFOS", "PRODUITS PERIMES ");
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair< VenteDetailsDTO, List<VenteDetailsDTO>> p = ficheArticleService.produitPerimes(query, dtStart, filtre, tu, codeFamile, codeRayon, codeGrossiste, 0, 0, true);
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
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "rp_perimes_" + report_generate_file, data);
        return "/data/reports/pdf/rp_perimes_" + report_generate_file;
    }

    public String statistiqueParRayons(String dtStart, String dtEnd, String codeFamile, String query, TUser tu, String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_stat_vente_rayon";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Chiffre d'affaires par emplacement  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService.statistiqueParRayons(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("groupeLibelle", "Emplacement");
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "rp_stat_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_stat_" + report_generate_file;
    }

    public String statistiqueParGrossistes(String dtStart, String dtEnd, String codeFamile, String query, TUser tu, String codeRayon, String codeGrossiste) throws IOException {

        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_stat_vente_rayon";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Chiffre d'affaires par grossiste  ".toUpperCase() + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = familleArticleService.statistiqueParGrossistes(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> datas = pair.getRight();
        FamilleArticleStatDTO summary = pair.getLeft();
        parameters.put("groupeLibelle", "Grossiste");
        parameters.put("montantTTC", summary.getMontantCumulTTC());
        parameters.put("montantHT", summary.getMontantCumulHT());
        parameters.put("montantAchat", summary.getMontantCumulAchat());
        parameters.put("montantMarge", summary.getMontantCumulMarge());
        parameters.put("pourcentageMarge", summary.getPourcentageCumulMage());
        parameters.put("pourcentageTH", summary.getPourcentageTH());
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "rp_stat_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_stat_" + report_generate_file;
    }

    public String listeVentes(SalesStatsParams params) {
        TOfficine oTOfficine = commonService.findOfficine();
        String scr_report_file = "rp_list_avoirs";
        Map<String, Object> parameters = reportUtil.officineData(oTOfficine, params.getUserId());
        parameters.put("P_H_CLT_INFOS", "LISTE DES AVOIRS");
        parameters.put("avoir_subreport", jdom.scr_report_file);
        System.out.println(jdom.scr_report_file);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".pdf";
        List<VenteDTO> data = salesStatsService.listeVentesReport(params);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, jdom.scr_report_pdf + "avoirs_" + report_generate_file, data);
        return "/data/reports/pdf/avoirs_" + report_generate_file;
    }
}