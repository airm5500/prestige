/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.FamilleArticleStatDTO;
import dal.TUser;
import enumeration.MargeEnum;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.report.excel.ClasseurExcel;
import rest.service.DataReporingService;
import rest.service.InventaireService;
import rest.service.SuggestionService;
import util.Constant;
import toolkits.parameters.commonparameter;

/**
 *
 * @author DICI
 */
@Path("v1/datareporting")
@Produces("application/json")
@Consumes("application/json")
public class DataReporingRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private DataReporingService dataReporingService;
    @EJB
    private SuggestionService suggestionService;
    @EJB
    private InventaireService inventaireService;

    private static final Logger LOG = Logger.getLogger(DataReporingRessource.class.getName());
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Toutes les lignes de la marge sur produits vendus, avec EXACTEMENT les filtres de l'ecran, sans pagination. */
    private List<FamilleArticleStatDTO> margeProduitsVendusComplet(String dtStart, String dtEnd, Integer critere,
            String codeFamile, String query, String codeRayon, String codeGrossiste, MargeEnum filtre, TUser tu) {
        List<FamilleArticleStatDTO> lignes = new java.util.ArrayList<>(
                dataReporingService.margeProduitsVendus(dtStart, dtEnd, codeFamile, critere, query, tu, codeRayon,
                        codeGrossiste, 0, 0, true, filtre == null ? MargeEnum.ALL : filtre).getRight());
        lignes.sort(java.util.Comparator.comparing(FamilleArticleStatDTO::getLibelle,
                java.util.Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return lignes;
    }

    private static String periodeLisible(String dtStart, String dtEnd) {
        try {
            return "du " + java.time.LocalDate.parse(dtStart).format(JOUR) + " au "
                    + java.time.LocalDate.parse(dtEnd).format(JOUR);
        } catch (RuntimeException e) {
            return "du " + dtStart + " au " + dtEnd;
        }
    }

    /**
     * Export Excel de la marge sur produits vendus : les colonnes de la liste, toutes les lignes des filtres actifs
     * (retours des tests du 12/09, point 8).
     */
    @GET
    @Path("margeproduitsvendus/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response margeProduitsVendusExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "critere") Integer critere,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "filtre") MargeEnum filtre)
            throws IOException {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<FamilleArticleStatDTO> lignes = margeProduitsVendusComplet(dtStart, dtEnd, critere, codeFamile, query,
                codeRayon, codeGrossiste, filtre, tu);
        ClasseurExcel<FamilleArticleStatDTO> classeur = new ClasseurExcel<FamilleArticleStatDTO>("Marge produits")
                .titre("MARGE SUR PRODUITS VENDUS").critere("Période", periodeLisible(dtStart, dtEnd));
        if (critere != null && filtre != null && filtre != MargeEnum.ALL) {
            classeur.critere("Filtre sur le % de marge", filtre.name() + " " + critere);
        }
        byte[] data = classeur.texte("Code CIP", FamilleArticleStatDTO::getCode)
                .texte("Libellé", FamilleArticleStatDTO::getLibelle)
                .nombre("Qté", FamilleArticleStatDTO::getMontantCumulTva)
                .nombre("P.Achat", FamilleArticleStatDTO::getMontantTva)
                .nombre("P.Vente", FamilleArticleStatDTO::getMontantRemise)
                .nombre("Valeur.Achat", FamilleArticleStatDTO::getMontantCumulAchat)
                .nombre("Montant.TTC", FamilleArticleStatDTO::getMontantCumulTTC)
                .nombre("Montant.HT", FamilleArticleStatDTO::getMontantCumulHT)
                .nombre("Marge", FamilleArticleStatDTO::getMontantCumulMarge)
                .nombre("%Marge", FamilleArticleStatDTO::getPourcentageCumulMage).construire(lignes);
        String nom = "marge_produits_vendus_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xlsx";
        return Response.ok(data).header("content-disposition", "attachment; filename=" + nom).build();
    }

    /**
     * Inventaire des produits de la marge sur produits vendus, avec les filtres actifs (retours du 12/09, point 8).
     * {@code controle=true} ne cree rien et rend seulement le nombre de produits, pour la confirmation a l'ecran.
     */
    @POST
    @Path("margeproduitsvendus/inventaire")
    public Response margeProduitsVendusInventaire(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "critere") Integer critere,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "filtre") MargeEnum filtre,
            @javax.ws.rs.DefaultValue("false") @QueryParam(value = "controle") boolean controle) {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Set<String> produits = new LinkedHashSet<>();
        for (FamilleArticleStatDTO ligne : margeProduitsVendusComplet(dtStart, dtEnd, critere, codeFamile, query,
                codeRayon, codeGrossiste, filtre, tu)) {
            if (ligne.getId() != null && !ligne.getId().isEmpty()) {
                produits.add(ligne.getId());
            }
        }
        if (controle) {
            return Response.ok().entity(new JSONObject().put("success", true).put("count", produits.size()).toString())
                    .build();
        }
        if (produits.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("msg", "Aucun produit vendu sur la période affichée.").toString()).build();
        }
        String nom = "INVENTAIRE MARGE PRODUITS VENDUS "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        try {
            int nombre = inventaireService.create(produits, nom, nom + " - période " + periodeLisible(dtStart, dtEnd));
            return Response.ok()
                    .entity(new JSONObject().put("success", true).put("count", nombre).put("nom", nom)
                            .put("msg", "Inventaire « " + nom + " » créé avec " + nombre + " produit(s).").toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "inventaire depuis la marge sur produits vendus", e);
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("msg", "L'inventaire n'a pas pu être créé.").toString())
                    .build();
        }
    }

    @GET
    @Path("margeproduitsvendus")
    public Response margeProduitsVendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "critere") Integer critere,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "filtre") MargeEnum filtre)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.margeProduitsVendus(dtStart, dtEnd, codeFamile, critere, query, tu,
                codeRayon, codeGrossiste, start, limit, filtre);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("unitesvendues")
    public Response statsUnintesVendues(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsUnintesVendues(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("unitesvendueslaboratoires")
    public Response statsUnintesVenduesparLaboratoire(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "laboratoireId") String laboratoireId, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsUnintesVenduesparLaboratoire(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, laboratoireId, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("unitesvenduesgamme")
    public Response statsUnintesVenduesparGamme(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "gammeId") String gammeId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsUnintesVenduesparGamme(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, gammeId, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("articleInvendus")
    public Response articlesInvendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum filtre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "nombreMois") int nombreMois)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dataReporingService.statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, stock, filtre, start, limit, nombreMois);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("suggestion")
    public Response makeSuggestionFromArticleInvendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum filtre

    ) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<ArticleDTO> datas = dataReporingService.statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, stock, filtre, 0, 0, true);
        JSONObject jsono = suggestionService.makeSuggestionFromArticleInvendus(datas, tu);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("articleInvendus/csv")
    @Produces("text/csv")
    public Response exportArticlesInvendusCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum stockFiltre, @QueryParam(value = "nombreMois") int nombreMois)
            throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = dataReporingService.exportArticlesInvendusCsv(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, stock, stockFiltre, nombreMois);

        String filename = "articles-invendus_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".csv";

        return Response.ok(data, "text/csv; charset=UTF-8").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("articleInvendus/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportArticlesInvendusExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum stockFiltre, @QueryParam(value = "nombreMois") int nombreMois)
            throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = dataReporingService.exportArticlesInvendusExcel(dtStart, dtEnd, codeFamile, query, tu, codeRayon,
                codeGrossiste, stock, stockFiltre, nombreMois);

        String filename = "articles-invendus_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".xls";

        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("articleInvendus/create-inventaire")
    public Response createInventaireArticlesInvendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "stockFiltre") MargeEnum stockFiltre, @QueryParam(value = "nombreMois") int nombreMois)
            throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = dataReporingService.createInventaireArticlesInvendus(dtStart, dtEnd, codeFamile, query, tu,
                codeRayon, codeGrossiste, stock, stockFiltre, nombreMois);

        return Response.ok().entity(jsono.toString()).build();
    }
}
