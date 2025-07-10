/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import bll.common.Parameter;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.CodeFactureDTO;
import commonTasks.dto.DelayedDTO;
import commonTasks.dto.FileForma;
import commonTasks.dto.LogDTO;
import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.TvaDTO;
import commonTasks.dto.VenteDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TClient;
import dal.TFacture;
import dal.TModelFacture;
import dal.TPreenregistrement;
import dal.TPrivilege;
import dal.TTiersPayant;
import dal.TUser;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang3.StringUtils;
import rest.report.ReportUtil;
import rest.service.CommonService;
import rest.service.FacturationService;
import rest.service.LogService;
import rest.service.ReglementService;
import rest.service.SalesStatsService;
import rest.service.dto.DossierReglementDTO;
import toolkits.filesmanagers.FilesType.PdfFiles;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;
import util.DateConverter;

/**
 *
 * @author DICI
 */
@Stateless
public class Facture {

    @EJB
    ReportUtil reportUtil;
    @EJB
    CommonService commonService;
    @EJB
    SalesStatsService salesStatsService;
    @EJB
    ReglementService reglementService;
    @EJB
    LogService logService;
    @EJB
    FacturationService facturationService;

    public String factureDevis(String venteId, TUser tu) throws IOException {
        Comparator<VenteDetailsDTO> comparator = Comparator.comparing(VenteDetailsDTO::getStrNAME);

        String scr_report_file = "rp_proforma";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        TPreenregistrement op = salesStatsService.findOneById(venteId);
        List<VenteDetailsDTO> datas = salesStatsService.venteDetailsByVenteId(venteId);
        datas.sort(comparator);
        List<TvaDTO> tvas = new ArrayList<>();
        Map<Integer, List<VenteDetailsDTO>> maps = datas.stream()
                .collect(Collectors.groupingBy(VenteDetailsDTO::getValeurTva));
        for (Map.Entry<Integer, List<VenteDetailsDTO>> entry : maps.entrySet()) {
            Integer key = entry.getKey();
            long montantHt = 0, montantTva = 0, montantTtc = 0;
            // new net.sf.jasperreports.engine.data.JRBeanCollectionDataSource($P{factures})
            List<VenteDetailsDTO> val = entry.getValue();
            for (VenteDetailsDTO venteDetailsDTO : val) {
                montantHt += venteDetailsDTO.getMontantHt();
                montantTva += venteDetailsDTO.getMontantTva();
                montantTtc += venteDetailsDTO.getIntPRICE();
            }
            tvas.add(new TvaDTO(key, montantHt, montantTva, montantTtc));
        }
        tvas.sort(Comparator.comparing(TvaDTO::getTaux, Comparator.naturalOrder()));
        Integer total_devis = op.getIntPRICE() - op.getIntPRICEREMISE();
        TClient client = op.getClient();
        String P_CLIENT = (client.getStrNUMEROSECURITESOCIAL() != null
                && !"".equals(client.getStrNUMEROSECURITESOCIAL()) ? client.getStrNUMEROSECURITESOCIAL() + " | " : "")
                + client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        String P_AMOUNT_DEVIS = "Le Montant TTC pour cette Proforma est de  "
                + DateConverter.amountFormat(total_devis, '.') + " F CFA";
        parameters.put("P_BARE_CODE", DateConverter.buildLineBarecode(op.getStrREFTICKET()));
        parameters.put("P_REFERENCE", op.getLgPREENREGISTREMENTID());
        parameters.put("P_H_CLT_INFOS", "Proforma N° " + op.getStrREF());
        parameters.put("tvas", tvas);
        parameters.put("totalBrut", op.getIntPRICE());
        parameters.put("totalNet", op.getIntPRICE() - op.getIntPRICEREMISE());
        parameters.put("str_REF", op.getStrREF());
        parameters.put("P_TOTAL_DEVIS", DateConverter.convertionChiffeLettres(total_devis) + " -- ("
                + DateConverter.amountFormat(total_devis) + ")");
        parameters.put("P_AMOUNT_DEVIS", P_AMOUNT_DEVIS.toUpperCase());
        parameters.put("P_REMISE", op.getIntPRICEREMISE());
        parameters.put("P_CLIENT", P_CLIENT);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "proforma_" + report_generate_file, datas);
        return "/data/reports/pdf/proforma_" + report_generate_file;
    }

    public String listeDifferes(Params params, boolean pairclient) throws IOException {

        String scr_report_file = "rp_differeslist";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(params.getOperateur());
        List<DelayedDTO> datas = reglementService.listeDifferes(params, pairclient);
        LocalDate dtEn = LocalDate.parse(params.getDtEnd()), dtSt = LocalDate.parse(params.getDtStart());
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "LISTE DES DIFFERES CLIENTS  " + P_PERIODE);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "differeslist_" + report_generate_file, datas);
        return "/data/reports/pdf/differeslist_" + report_generate_file;
    }

    public String listeDifferesRegles(Params params, boolean checked) throws IOException {

        String scr_report_file = "rp_regledifferes";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(params.getOperateur());
        LocalDate dtEn = LocalDate.parse(params.getDtEnd()), dtSt = LocalDate.parse(params.getDtStart());
        List<DelayedDTO> datas = reglementService.reglementsDifferesDto(dtSt, dtEn, checked,
                params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), params.getRef());

        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "REGLEMENT DES DIFFERES CLIENTS  " + P_PERIODE);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "regledifferes_" + report_generate_file, datas);
        return "/data/reports/pdf/regledifferes_" + report_generate_file;
    }

    public String logs(String search, LocalDate dtSt, LocalDate dtEn, String userId, int criteria, TUser u)
            throws IOException {

        String scr_report_file = "rp_logfile";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(u);
        List<LogDTO> datas = logService.logs(search, dtSt, dtEn, 0, 0, true, userId, criteria);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "FICHIER JOURNAL DU   " + P_PERIODE);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "logfile_" + report_generate_file, datas);
        return "/data/reports/pdf/logfile_" + report_generate_file;
    }

    public String annulations(String query, LocalDate dtSt, LocalDate dtEn, TUser u, List<TPrivilege> LstTPrivilege)
            throws IOException {

        String scr_report_file = "rp_vente_annulees";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(u);
        boolean asAuthority = DateConverter.hasAuthorityByName(LstTPrivilege, commonparameter.str_SHOW_VENTE);
        boolean allActivitis = DateConverter.hasAuthorityByName(LstTPrivilege, Parameter.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setQuery(query);
        body.setStatut(DateConverter.STATUT_IS_CLOSED);
        body.setAll(true);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(u);
        body.setDtEnd(dtEn);
        body.setDtStart(dtSt);
        List<VenteDTO> datas = salesStatsService.annulationVente(body);
        Long montantEspeceAnnualation = salesStatsService.montantVenteAnnulees(body);
        String P_PERIODE = " DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("montantEspece", montantEspeceAnnualation);
        parameters.put("P_H_CLT_INFOS", "LISTE DES VENTES ANNULEES DU   " + P_PERIODE);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "vente_annulees_" + report_generate_file, datas);
        return "/data/reports/pdf/vente_annulees_" + report_generate_file;
    }

    public String facturesprovisoires0(String modeId, TUser u, HttpSession session) throws IOException {
        DateFormat DF = new SimpleDateFormat("dd_MM_YYYY_HH_mm_ss");
        LongAdder longAdder = new LongAdder();

        Map<String, Object> parameters = reportUtil.officineData(u);
        parameters.put("P_PRINTED_BY", " ");
        SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy");
        List<CodeFactureDTO> code = (List<CodeFactureDTO>) session.getAttribute("codefacturedto");
        TModelFacture modelFacture = facturationService.modelFactureById(modeId);
        List<InputStream> inputPdfList = new ArrayList<>();
        String scr_report_file = modelFacture.getNomFichier();
        for (CodeFactureDTO codeFactureDTO : code) {
            TFacture OFacture = facturationService.findFactureById(codeFactureDTO.getFactureId());
            TTiersPayant OTiersPayant = OFacture.getTiersPayant();
            String P_PERIODE = "PERIODE DU " + df.format(OFacture.getDtDEBUTFACTURE()) + " AU "
                    + df.format(OFacture.getDtFINFACTURE());
            parameters.put("P_H_CLT_INFOS", P_PERIODE);
            parameters.put("P_LG_FACTURE_ID", OFacture.getLgFACTUREID());
            parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
            parameters.put("P_CODE_FACTURE",
                    "FACTURE N° " + OFacture.getStrCODEFACTURE() + " (" + OTiersPayant.getStrNAME() + ")");
            parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
            parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OFacture.getStrCODECOMPTABLE());
            parameters.put("P_CODE_POSTALE",
                    (OTiersPayant.getStrADRESSE() != null && !"".equals(OTiersPayant.getStrADRESSE()))
                            ? OTiersPayant.getStrADRESSE() : "");
            parameters.put("P_COMPTE_CONTRIBUABLE",
                    (OTiersPayant.getStrCOMPTECONTRIBUABLE() != null
                            && !"".equals(OTiersPayant.getStrCOMPTECONTRIBUABLE()))
                                    ? OTiersPayant.getStrCOMPTECONTRIBUABLE() : "");
            parameters.put("P_CODE_OFFICINE",
                    (OTiersPayant.getStrCODEOFFICINE() != null && !"".equals(OTiersPayant.getStrCODEOFFICINE()))
                            ? OTiersPayant.getStrCODEOFFICINE() : "");
            parameters.put("P_REGISTRE_COMMERCE",
                    (OTiersPayant.getStrREGISTRECOMMERCE() != null && !"".equals(OTiersPayant.getStrREGISTRECOMMERCE()))
                            ? OTiersPayant.getStrREGISTRECOMMERCE() : "");
            int P_TOTAL_AMOUNT = OFacture.getMontantVente(), P_ADHER_AMOUNT = OFacture.getDblMONTANTCMDE().intValue(),
                    P_ATT_AMOUNT = OFacture.getDblMONTANTCMDE().intValue(),
                    P_REMISE_AMOUNT = OFacture.getDblMONTANTREMISE().intValue(),
                    P_REMISEFORFAITAIRE = OFacture.getDblMONTANTFOFETAIRE().intValue(),
                    P_MONTANTBRUTTP = OFacture.getMontantVente(), P_REMISE_VENTE = OFacture.getMontantRemiseVente(),
                    P_TVA_VENTE = OFacture.getMontantTvaVente();

            parameters.put("P_REMISEFORFAITAIRE", DateConverter.amountFormat(P_REMISEFORFAITAIRE, ' '));

            parameters.put("P_MONTANTBRUTTP", DateConverter.amountFormat(P_MONTANTBRUTTP, ' '));
            parameters.put("P_TOTAL_AMOUNT", DateConverter.amountFormat(P_TOTAL_AMOUNT, ' '));
            parameters.put("P_REMISE_AMOUNT", DateConverter.amountFormat(P_REMISE_AMOUNT, ' '));
            parameters.put("P_ADHER_AMOUNT", DateConverter.amountFormat(P_ADHER_AMOUNT, ' '));
            parameters.put("P_ATT_AMOUNT", DateConverter.amountFormat(P_ATT_AMOUNT, ' '));
            parameters.put("P_TOTALNET_AMOUNT", DateConverter.amountFormat(P_ATT_AMOUNT, ' '));
            parameters.put("P_TVA_VENTE", P_TVA_VENTE);
            parameters.put("P_REMISE_VENTE", P_REMISE_VENTE);
            parameters.put("P_TOTAL_GENERAL", "TOTAL GENERAL " + OTiersPayant.getStrNAME() + " ( NOMBRE DE BONS="
                    + OFacture.getIntNBDOSSIER() + " )");

            parameters.put("P_TOTAL_IN_LETTERS", DateConverter.getNumberTowords(P_ATT_AMOUNT).toUpperCase() + " ("
                    + DateConverter.amountFormat(P_ATT_AMOUNT) + " FCFA)");
            if (OTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                scr_report_file = modelFacture.getNomFichierRemiseTierspayant();
            }

            String report_generate_file = DF.format(new Date()) + "_" + longAdder.intValue() + ".pdf";
            longAdder.increment();
            String finalpath = jdom.scr_report_pdf + "lab_facture_" + report_generate_file;
            List<?> datas = new ArrayList<>();
            switch (modelFacture.getTypeAffichage()) {
            case DETAIL_ARTICLE:
                datas = facturationService.findArticleByFacturId(OFacture.getLgFACTUREID());
                break;
            case LIGNE_VENTE:
                datas = facturationService.findFacturesDetailsByFactureId(OFacture.getLgFACTUREID());
                break;
            default:
                break;
            }
            reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file, finalpath, datas);
            inputPdfList.add(new FileInputStream(finalpath));
        }

        String str_file = "facture_" + DF.format(new Date()) + "_" + longAdder.intValue() + ".pdf";

        String outputStreamFile = jdom.scr_report_pdf + str_file;

        OutputStream outputStream = new FileOutputStream(outputStreamFile);
        try {
            PdfFiles.mergePdfFiles(inputPdfList, outputStream);

        } catch (Exception ex) {
            ex.printStackTrace(System.err);
        }
        return outputStreamFile;
    }

    public String factureDevisAsFacture(String venteId, FileForma fileForma, TUser tu) throws IOException {
        Comparator<VenteDetailsDTO> comparator = Comparator.comparing(VenteDetailsDTO::getStrNAME);

        String scr_report_file = "rp_proforma_facture";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss"))
                + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(tu);

        VenteDTO venteDTO = salesStatsService.findVenteDTOById(venteId);
        List<VenteDetailsDTO> datas = venteDTO.getItems();
        datas.sort(comparator);
        int total_devis = venteDTO.getIntPRICE() - venteDTO.getIntPRICEREMISE();
        ClientDTO client = venteDTO.getClient();
        parameters.put("fullName", client.getFullName());
        parameters.put("strADRESSE", client.getStrADRESSE());
        parameters.put("strFIRSTNAME", client.getStrFIRSTNAME());
        parameters.put("strLASTNAME", client.getStrLASTNAME());
        parameters.put("strNUMEROSECURITESOCIAL", client.getStrNUMEROSECURITESOCIAL());
        parameters.put("P_H_CLT_INFOS", "Proforma N° " + venteDTO.getStrREF());
        parameters.put("intPRICE", venteDTO.getIntPRICE());
        parameters.put("montantTva", venteDTO.getMontantTva());
        parameters.put("intPRICEREMISE", venteDTO.getIntPRICEREMISE());
        parameters.put("P_TOTAL_IN_LETTERS", DateConverter.convertionChiffeLettres(total_devis).toUpperCase() + " -- ("
                + DateConverter.amountFormat(total_devis) + ")");
        parameters.put("strREF", venteDTO.getStrREF());
        switch (fileForma) {
        case WORD:
            report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss"))
                    + ".docx";
            reportUtil.buildReportDocx(parameters, scr_report_file, jdom.scr_report_file,
                    jdom.scr_report_pdf + "proforma_facture_" + report_generate_file, datas);
            break;
        case EXCEL:
            report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss"))
                    + ".xlsx";
            reportUtil.buildReportExcel(parameters, scr_report_file, jdom.scr_report_file,
                    jdom.scr_report_pdf + "proforma_facture_" + report_generate_file, datas);
            break;
        default:
            reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                    jdom.scr_report_pdf + "proforma_facture_" + report_generate_file, datas);
            break;
        }

        return "/data/reports/pdf/proforma_facture_" + report_generate_file;
    }

    public String annulationsPlus(String query, LocalDate dtSt, LocalDate dtEn, TUser u, List<TPrivilege> LstTPrivilege)
            throws IOException {

        String scr_report_file = "rp_produits_annules";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(u);
        boolean asAuthority = DateConverter.hasAuthorityByName(LstTPrivilege, commonparameter.str_SHOW_VENTE);
        boolean allActivitis = DateConverter.hasAuthorityByName(LstTPrivilege, Parameter.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setQuery(query);
        body.setStatut(DateConverter.STATUT_IS_CLOSED);
        body.setAll(true);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(u);
        body.setDtEnd(dtEn);
        body.setDtStart(dtSt);
        List<VenteDetailsDTO> datas = salesStatsService.annulationVentePlus(body);
        String P_PERIODE = " DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        parameters.put("P_H_CLT_INFOS", "LISTE DES ARTICLES ANNULES DU   " + P_PERIODE);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_produits_annules_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_produits_annules_" + report_generate_file;
    }

    public String listeReglement(Params params) throws IOException {
        if (StringUtils.isEmpty(params.getDtStart())) {
            params.setDtStart(LocalDate.now().toString());
        }
        if (StringUtils.isEmpty(params.getDtEnd())) {
            params.setDtEnd(LocalDate.now().toString());
        }

        String scr_report_file = "rp_reglement_facture_group";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Map<String, Object> parameters = reportUtil.officineData(params.getOperateur());
        List<DossierReglementDTO> datas = reglementService.listeReglementFactures(params.getDtStart(),
                params.getDtEnd(), params.getRef());
        LocalDate dtEn = LocalDate.parse(params.getDtEnd()), dtSt = LocalDate.parse(params.getDtStart());
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        }
        datas.sort(Comparator.comparing(DossierReglementDTO::getTiersPayantName)
                .thenComparing(DossierReglementDTO::getDateReglement, Comparator.reverseOrder()));
        parameters.put("P_H_CLT_INFOS", "LISTE DES REGLEMENTS FACTURES  " + P_PERIODE);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_reglement_facture_group_" + report_generate_file, datas);
        return "/data/reports/pdf/rp_reglement_facture_group_" + report_generate_file;
    }

}
