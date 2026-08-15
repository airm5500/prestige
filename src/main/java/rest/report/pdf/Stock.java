/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import commonTasks.dto.MvtArticleParams;
import commonTasks.dto.MvtProduitDTO;
import commonTasks.dto.RuptureDetailDTO;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.ValorisationDTO;
import commonTasks.dto.VenteDetailsDTO;
import commonTasks.dto.VenteTiersPayantsDTO;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import rest.report.ReportUtil;
import rest.service.CaisseService;
import rest.service.ClientService;
import rest.service.OrderService;
import rest.service.ProduitService;
import rest.service.SalesStatsService;
import rest.service.utils.ReportExcelExportService;
import toolkits.utils.jdom;

/**
 *
 * @author DICI
 */
@Stateless
public class Stock {

    @EJB
    private ProduitService produitService;
    @EJB
    private ReportUtil reportUtil;

    @EJB
    private OrderService orderService;
    @EJB
    private CaisseService caisseService;
    @EJB
    private ClientService clientService;
    @EJB
    private SalesStatsService salesStatsService;
    @EJB
    private ReportExcelExportService excelExportService;

    /** Titre commun aux exports PDF et Excel de la valorisation. */
    private String titreValorisation(int mode, LocalDate dtSt, String typeStock) {
        String subtitle;
        switch (mode) {
        case 1:
            subtitle = "VALORISATION  PAR FAMILLE D'ARTICLE ";
            break;
        case 2:
            subtitle = "VALORISATION PAR EMPLACEMENT ";
            break;
        case 3:
            subtitle = "VALORISATION PAR GROSSISTE ";
            break;
        default:
            subtitle = "VALORISATION ";
            break;
        }
        // Prefixe selon le type de stock imprime (rayon par defaut)
        String stockLabel = "STOCK RAYON - ";
        if ("2".equals(typeStock) || "reserve".equalsIgnoreCase(typeStock)) {
            stockLabel = "STOCK RESERVE - ";
        } else if ("0".equals(typeStock) || "total".equalsIgnoreCase(typeStock)) {
            stockLabel = "STOCK TOTAL - ";
        }
        return stockLabel + subtitle + "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    /** Type de stock normalise pour la couleur d'accent du rapport (1 rayon, 2 reserve, 0 total). */
    private String typeStockNormalise(String typeStock) {
        if ("2".equals(typeStock) || "reserve".equalsIgnoreCase(typeStock)) {
            return "2";
        }
        if ("0".equals(typeStock) || "total".equalsIgnoreCase(typeStock)) {
            return "0";
        }
        return "1";
    }

    /** Libelles des elements coches, tronques pour rester lisibles en tete de rapport. */
    private String elementsValorises(String elements) {
        if (elements == null) {
            return "";
        }
        String valeur = elements.trim();
        if (valeur.length() > 400) {
            return valeur.substring(0, 400) + "…";
        }
        return valeur;
    }

    /** Detail classe par valeur de vente decroissante : les postes qui pesent le plus en premier. */
    private void trierParValeurDecroissante(List<ValorisationDTO> datas) {
        if (datas == null) {
            return;
        }
        datas.sort((a, b) -> Integer.compare(b.getMontantPu() == null ? 0 : b.getMontantPu(),
                a.getMontantPu() == null ? 0 : a.getMontantPu()));
    }

    public String valorisation(TUser tu, int mode, LocalDate dtSt, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String end, String begin, String emplacementId, String typeStock, String elements)
            throws IOException {

        String scr_report_file = mode > 0 ? "rp_valorisation_stock_produit2" : "rp_valorisation_stock_produit";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        parameters.put("P_H_CLT_INFOS", titreValorisation(mode, dtSt, typeStock));
        parameters.put("P_TYPE_STOCK", typeStockNormalise(typeStock));
        parameters.put("P_ELEMENTS", elementsValorises(elements));
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        ValorisationDTO o = produitService.getValeurStockPdf(mode, dtSt, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID,
                end, begin, emplacementId, typeStock);

        ValorisationDTO tva = o.getTvas();
        parameters.put("totalpa", o.getMontantFacture());
        parameters.put("totalpu", o.getMontantPu());
        parameters.put("tvaPu", o.getMontantFacture());
        parameters.put("tvaPu", tva.getMontantPu());
        parameters.put("tvaTarif", tva.getMontantTarif());
        parameters.put("tvaFact", tva.getMontantFacture());
        parameters.put("tvaPmd", tva.getMontantPmd());
        parameters.put("tvas", tva.getDatas());
        if (mode > 0) {
            parameters.put("totalPmd", o.getMontantPmd());
            parameters.put("totalTarif", o.getMontantTarif());
            trierParValeurDecroissante(o.getDatas());

            reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                    jdom.scr_report_pdf + "valorisation_" + report_generate_file, o.getDatas());
        } else {
            reportUtil.buildReportEmptyDs(parameters, scr_report_file, jdom.scr_report_file,
                    jdom.scr_report_pdf + "valorisation_" + report_generate_file);
        }

        return "/data/reports/pdf/valorisation_" + report_generate_file;
    }

    /**
     * Export Excel de la valorisation : memes donnees et meme titre que l'impression PDF.
     */
    public byte[] valorisationExcel(int mode, LocalDate dtSt, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String end, String begin, String emplacementId, String typeStock, String elements)
            throws IOException {
        ValorisationDTO valorisation = produitService.getValeurStockPdf(mode, dtSt, lgGROSSISTEID, lgFAMILLEARTICLEID,
                lgZONEGEOID, end, begin, emplacementId, typeStock);
        trierParValeurDecroissante(valorisation.getDatas());
        return excelExportService.createValorisationExcel(titreValorisation(mode, dtSt, typeStock),
                elementsValorises(elements), valorisation, mode > 0);
    }

    public String venteUgDTO(TUser tu, LocalDate dtSt, LocalDate dtEnd, String query) throws IOException {

        String scr_report_file = "rp_vente_ugs";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_H_CLT_INFOS", "VENTES UNITES GRATUITES " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<VenteDetailsDTO> data = caisseService.venteUgDTO(dtSt, dtEnd, query);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_vente_ugs" + report_generate_file, data);
        return "/data/reports/pdf/rp_vente_ugs" + report_generate_file;
    }

    public String rupturePharmaMl(TUser tu, LocalDate dtSt, LocalDate dtEnd, String query, String grossisteId,
            String emplacementId) throws IOException {

        String scr_report_file = "rp_ruptures_pharmaml";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_H_CLT_INFOS", "PRODUITS EN RUPTURES " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<RuptureDetailDTO> data = orderService.listeRuptures(dtSt, dtEnd, query, grossisteId, emplacementId);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_ruptures_pharmaml_" + report_generate_file, data);
        return "/data/reports/pdf/rp_ruptures_pharmaml_" + report_generate_file;
    }

    public String ventesTiersPayants(TUser tu, String scr_report_file, String query, String dtStart, String dtEnd,
            String tiersPayantId, String groupeId, String typeTp) {

        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + LocalDate.parse(dtStart).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        LocalDate end = LocalDate.parse(dtEnd);
        if (!LocalDate.parse(dtStart).equals(end)) {
            P_PERIODE += " AU " + end.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Liste des Bordereaux " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<VenteTiersPayantsDTO> data = clientService.ventesTiersPayants(query, dtStart, dtEnd, tiersPayantId,
                groupeId, typeTp, 0, 0, true);
        if ("rp_ventetpGroup".equals(scr_report_file)) {
            data.sort(Comparator
                    .comparing(VenteTiersPayantsDTO::getLibelleGroupe, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(VenteTiersPayantsDTO::getLibelleTiersPayant));
        } else {
            data.sort(Comparator.comparing(VenteTiersPayantsDTO::getTypeTiersPayant)
                    .thenComparing(VenteTiersPayantsDTO::getLibelleTiersPayant));
        }
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_ventetp" + report_generate_file, data);
        return "/data/reports/pdf/rp_ventetp" + report_generate_file;
    }

    public String articlesVendusRecap(SalesStatsParams body, String action, String type) {

        Map<String, Object> parameters = reportUtil.officineData(body.getUserId());
        String P_PERIODE = "PERIODE DU " + body.getDtStart().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!body.getDtStart().equals(body.getDtEnd())) {
            P_PERIODE += " AU " + body.getDtEnd().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "Liste des articles vendus " + P_PERIODE);
        String scr_report_file = "";
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<VenteDetailsDTO> data;
        if (action.equals("ARTICLE_VENDUS_DETAIL")) {
            scr_report_file = "rp_articlesvendus";
            data = salesStatsService.getArticlesVendus(body);
            if (type.equals("user")) {
                scr_report_file = "rp_articlesvendus_user";
                data.sort(Comparator.comparing(VenteDetailsDTO::getCaissier));
            } else if (type.equals("rayon")) {
                scr_report_file = "rp_articlesvendus_rayon";
                data.sort(Comparator.comparing(VenteDetailsDTO::getLibelleRayon));
            }
        } else {
            scr_report_file = "rp_articlesvendusgroup";
            data = salesStatsService.getArticlesVendusRecap(body);
            if (type.equals("rayon")) {
                scr_report_file = "rp_articlesvendusgroup_rayon";
                data.sort(Comparator.comparing(VenteDetailsDTO::getLibelleRayon));
            }
        }

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "articlesvendus" + report_generate_file, data);
        return "/data/reports/pdf/articlesvendus" + report_generate_file;
    }

    public String suivitMvtArcticle(MvtArticleParams params, TUser user) {

        LocalDate dtStart = params.getDtStart();
        LocalDate dtEnd = params.getDtEnd();
        Map<String, Object> parameters = reportUtil.officineData(user);
        String periode = dtStart.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtStart.isEqual(dtEnd)) {
            periode += " AU " + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        String reportName = "rp_suivit_mvt_article";

        parameters.put("P_H_CLT_INFOS", "SUIVI MOUVEMENT ARTICLE \n DU  " + periode);
        List<MvtProduitDTO> datas = produitService.suivitMvtArcticle(params);

        return reportUtil.buildReport(parameters, reportName, datas);

    }
}
