/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.report.pdf;

import commonTasks.dto.AjustementDetailDTO;
import commonTasks.dto.ArticleDTO;
import commonTasks.dto.DonneesExploitationDTO;
import commonTasks.dto.FamilleArticleStatDTO;
import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.VenteDetailsDTO;
import dal.TOfficine;
import dal.TUser;
import enumeration.MargeEnum;
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
import rest.service.CommonService;
import rest.service.DataReporingService;
import rest.service.DonneesExploitation;
import rest.service.FicheArticleService;
import rest.service.MvtProduitService;
import toolkits.utils.jdom;

/**
 *
 * @author DICI
 */
@Stateless
public class DataReporting {

    @EJB
    private DataReporingService dataReporingService;
    @EJB
    ReportUtil reportUtil;

    @EJB
    FicheArticleService ficheArticleService;
    @EJB
    private DonneesExploitation donneesExploitationService;
    @EJB
    private MvtProduitService mvtProduitService;

    public String margeProduitsVendus(String dtStart, String dtEnd, String codeFamile, Integer critere, String query,
            TUser tu, String codeRayon, String codeGrossiste, MargeEnum filtre) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_margeproduits";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "MARGES DES PRODUITS VENDUS " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<FamilleArticleStatDTO> data = dataReporingService.margeProduitsVendus(dtStart, dtEnd, codeFamile, critere,
                query, tu, codeRayon, codeGrossiste, 0, 0, true, filtre).getRight();
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "marges_produit_" + report_generate_file, data);
        return "/data/reports/pdf/marges_produit_" + report_generate_file;
    }

    public String statsUnintesVendues(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_statistic_unites_vendues";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "MARGES DES PRODUITS VENDUS " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<FamilleArticleStatDTO> data = dataReporingService
                .statsUnintesVendues(dtStart, dtEnd, codeFamile, query, tu, codeRayon, codeGrossiste, 0, 0, true)
                .getRight();
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "unites_vendues_" + report_generate_file, data);
        return "/data/reports/pdf/unites_vendues_" + report_generate_file;
    }

    public String statsUnintesVenduesparLaboratoire(String dtStart, String dtEnd, String codeFamile, String query,
            TUser tu, String codeRayon, String codeGrossiste, String laboratoireId) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_stat_unites_vendues_labo";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "STATISTIQUES DES PRODUITS VENDUS PAR LABORATOIRE " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<FamilleArticleStatDTO> data = dataReporingService.statsUnintesVenduesparLaboratoire(dtStart, dtEnd,
                codeFamile, query, tu, codeRayon, codeGrossiste, laboratoireId, 0, 0, true).getRight();
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "statist_par_laboratoire_" + report_generate_file, data);
        return "/data/reports/pdf/statist_par_laboratoire_" + report_generate_file;
    }

    public String statsUnintesVenduesparGamme(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste, String gammeId) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_stat_unites_vendues_labo";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "STATISTIQUES DES PRODUITS VENDUS PAR GAMME " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<FamilleArticleStatDTO> data = dataReporingService.statsUnintesVenduesparGamme(dtStart, dtEnd, codeFamile,
                query, tu, codeRayon, codeGrossiste, gammeId, 0, 0, true).getRight();
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "statist_par_gamme_" + report_generate_file, data);
        return "/data/reports/pdf/statist_par_gamme_" + report_generate_file;
    }

    public String statsArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query, TUser tu,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_articles_invendus";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "ARTICLES NON VENDUS " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Comparator<ArticleDTO> comparator = Comparator.comparing(ArticleDTO::getFilterId)
                .thenComparing(ArticleDTO::getLibelle);

        List<ArticleDTO> data = dataReporingService.statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, stock, stockFiltre, 0, 0, true);
        data.sort(comparator);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "articles_invendus_" + report_generate_file, data);
        return "/data/reports/pdf/articles_invendus_" + report_generate_file;
    }

    public String articleSurStock(String codeFamile, String query, TUser tu, String codeRayon, String codeGrossiste,
            int nbreMois, int nbreConsommation) throws IOException {

        String scr_report_file = "rp_articles_surstock";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU "
                + LocalDate.now().minusMonths(nbreMois).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU "
                + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_H_CLT_INFOS",
                "PRODUITS DONT LE STOCK EST SUPERIEUR A " + nbreMois + " MOIS" + " \n " + P_PERIODE);
        LocalDate now = LocalDate.now();
        parameters.put("consommationsOne", now.minusMonths(1).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationsTwo", now.minusMonths(2).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationsThree", now.minusMonths(3).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationUn", now.format(DateTimeFormatter.ofPattern("MMMM")));
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Comparator<ArticleDTO> comparator = Comparator.comparing(ArticleDTO::getFilterId)
                .thenComparing(ArticleDTO::getLibelle);
        List<ArticleDTO> data = ficheArticleService.articleSurStock(tu, query, codeFamile, codeRayon, codeGrossiste,
                nbreMois, nbreConsommation, 0, 0, true);
        data.sort(comparator);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_articles_surstock_" + report_generate_file, data);
        return "/data/reports/pdf/rp_articles_surstock_" + report_generate_file;
    }

    public String comparaisonStock(TUser tu, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil) throws IOException {

        String scr_report_file = "rp_comparaison_surstock";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "";

        if (filtreStock != null && filtreStock != MargeEnum.ALL) {
            switch (filtreStock) {

            case EQUAL:
                P_PERIODE += " DONT LE STOCK EST EQAL A " + stock;

                break;
            case GREATER:
                P_PERIODE += " DONT LE STOCK EST PLUS GRAND QUE  " + stock;
                break;
            case GREATER_EQUAL:
                P_PERIODE += " DONT LE STOCK EST PLUS GRAND OU EQAL A  " + stock;
                break;
            case LESS:
                P_PERIODE += " DONT LE STOCK EST INFERIEUR A  " + stock;
                break;

            case LESS_EQUAL:
                P_PERIODE += " DONT LE STOCK EST INFERIEUR OU EGAL A  " + stock;
                break;
            case NOT:
                P_PERIODE += " DONT LE STOCK DIFFERENT DE   " + stock;
                break;
            case STOCK_LESS_THAN_SEUIL:
                P_PERIODE += " DONT LE STOCK EST INFERIEUR AU SEUIL ";
                break;
            default:
                break;
            }
        }

        if (filtreSeuil != null && filtreSeuil != MargeEnum.ALL) {
            switch (filtreSeuil) {

            case EQUAL:
                P_PERIODE += " AVEC UN SEUIL EQAL A " + seuil;
                break;
            case GREATER:
                P_PERIODE += " AVEC UN SEUIL SUPERIEUR  A " + seuil;
                break;
            case GREATER_EQUAL:
                P_PERIODE += " AVEC UN SEUIL SUPERIEUR OU EGAL A " + seuil;
                break;
            case LESS:
                P_PERIODE += " AVEC UN SEUIL INFERIEUR  A " + seuil;
                break;

            case LESS_EQUAL:
                P_PERIODE += " AVEC UN SEUIL INFERIEUR OU EGAL  A " + seuil;
                break;
            case NOT:
                P_PERIODE += " AVEC UN SEUIL DIFFERENT DE  " + seuil;
                break;

            default:
                break;
            }
        }

        parameters.put("P_H_CLT_INFOS", "LISTE DES ARTICLES  \n " + P_PERIODE);
        LocalDate now = LocalDate.now();
        parameters.put("consommationsOne", now.minusMonths(1).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationsTwo", now.minusMonths(2).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationsThree", now.minusMonths(3).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationUn", now.format(DateTimeFormatter.ofPattern("MMMM")));

        parameters.put("consommationsFour", now.minusMonths(4).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationsFive", now.minusMonths(5).format(DateTimeFormatter.ofPattern("MMMM")));
        parameters.put("consommationsSix", now.minusMonths(6).format(DateTimeFormatter.ofPattern("MMMM")));

        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        Comparator<ArticleDTO> comparator = Comparator.comparing(ArticleDTO::getFilterId)
                .thenComparing(ArticleDTO::getLibelle);
        List<ArticleDTO> data = ficheArticleService.comparaisonStock(tu, query, filtreStock, filtreSeuil, codeFamile,
                codeRayon, codeGrossiste, stock, seuil, 0, 0, true);
        data.sort(comparator);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_comparaison_tock_" + report_generate_file, data);
        return "/data/reports/pdf/rp_comparaison_tock_" + report_generate_file;
    }

    public String produitConsomamation(TUser tu, String query, String dtStart, String dtEnd, String id, String libelle,
            String cip) throws IOException {

        String scr_report_file = "rp_consoarticle_comparaison";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + LocalDate.parse(dtStart).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " AU " + LocalDate.parse(dtEnd).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_H_CLT_INFOS",
                "CONSOMMATION DE L'ARTICLE\n   " + libelle + "\n CODE CIP :  " + cip + " " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss"))
                + ".pdf";
        List<VenteDetailsDTO> data = ficheArticleService.produitConsomamation(tu, query, dtStart, dtEnd, id);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "consoarticle_comparaison_" + report_generate_file, data);
        return "/data/reports/pdf/consoarticle_comparaison_" + report_generate_file;
    }

    public String donneesCompteExploitation(String dtStart, String dtEnd, TUser tu) throws IOException {

        String scr_report_file = "rp_compte_exploitation";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + LocalDate.parse(dtStart).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " AU " + LocalDate.parse(dtEnd).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_H_CLT_INFOS", "PRESENTATION COMPTE D'EXPLOITATION" + P_PERIODE);
        DonneesExploitationDTO o = donneesExploitationService.donneesCompteExploitation(tu, dtStart, dtEnd);
        parameters.put("espece", o.getEspece());
        parameters.put("especeVeto", o.getEspeceVeto());
        parameters.put("credit", o.getCredit());
        parameters.put("creditVeto", o.getCreditVeto());
        parameters.put("especeMarge", o.getEspeceMarge());
        parameters.put("especeVetoMarge", o.getEspeceVetoMarge());
        parameters.put("creditVetoMarge", o.getCreditVetoMarge());

        parameters.put("totalCaTTC", o.getTotalCaTTC());
        parameters.put("totalCaHT", o.getTotalCaHT());
        parameters.put("totalTVA", o.getTotalTVA());
        parameters.put("totalRemise", o.getTotalRemise());
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_MM_dd_HH_mm_ss"))
                + ".pdf";
        // List<DonneesExploitationDTO> data = donneesExploitationService.donneesCompteExploitation(dtStart, dtEnd,
        // codeFrom, codeTo, tu);
        reportUtil.buildReportEmptyDs(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_compte_exploitation_" + report_generate_file);
        return "/data/reports/pdf/rp_compte_exploitation_" + report_generate_file;
    }

    public String ajustements(SalesStatsParams body) throws IOException {

        String scr_report_file = "rp_all_ajustements";
        Map<String, Object> parameters = reportUtil.officineData(body.getUserId());
        String P_PERIODE = "PERIODE DU " + body.getDtStart().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU "
                + body.getDtEnd().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        parameters.put("P_H_CLT_INFOS", "AJUSTEMENTS " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy_MM_dd_HH_mm_ss"))
                + ".pdf";
        List<AjustementDetailDTO> data = mvtProduitService.getAllAjustementDetailDTOs(body);
        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "ajustements_" + report_generate_file, data);
        return "/data/reports/pdf/ajustements_" + report_generate_file;
    }

    public String loadretoursFournisseur(String dtStart, String dtEnd, String fourId, String query, TUser tu,
            String filtre) throws IOException {
        LocalDate dtSt = LocalDate.now(), dtEn = dtSt;
        try {
            dtSt = LocalDate.parse(dtStart);
            dtEn = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String scr_report_file = "rp_retour_founisseurs";
        Map<String, Object> parameters = reportUtil.officineData(tu);
        String P_PERIODE = "PERIODE DU " + dtSt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (!dtEn.isEqual(dtSt)) {
            P_PERIODE += " AU " + dtEn.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        parameters.put("P_H_CLT_INFOS", "RETOURS FOURNISSEUR " + P_PERIODE);
        String report_generate_file = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH_mm_ss")) + ".pdf";
        List<RetourDetailsDTO> data = mvtProduitService.loadretoursFournisseur(dtStart, dtEnd, fourId, query, filtre);

        reportUtil.buildReport(parameters, scr_report_file, jdom.scr_report_file,
                jdom.scr_report_pdf + "rp_retour_founisseurs" + report_generate_file, data);
        return "/data/reports/pdf/rp_retour_founisseurs" + report_generate_file;
    }
}
