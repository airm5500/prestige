/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.AddLot;
import commonTasks.dto.ArticleDTO;
import commonTasks.dto.Params;
import dal.TUser;
import enumeration.MargeEnum;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FicheArticleService;
import rest.service.SuggestionService;
import rest.service.dto.UpdateProduit;
import toolkits.parameters.commonparameter;
import util.Constant;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.json.JSONException;

/**
 *
 * @author DICI
 */
@Path("v1/fichearticle")
@Produces("application/json")
@Consumes("application/json")
public class FicheArticleRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private FicheArticleService ficheArticleService;
    @EJB
    private SuggestionService suggestionService;

    @GET
    @Path("perimes")
    public Response produitPerimes(@QueryParam(value = "nbreMois") int nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {

        JSONObject jsono = ficheArticleService.produitPerimes(query, nbreMois, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    /**
     * Compteur leger pour le badge de la cloche de notifications : une seule requete COUNT, sans la liste ni le resume
     * valorise que calcule l'endpoint complet ci-dessus.
     */
    @GET
    @Path("perimes/count")
    public Response produitPerimesCount(@QueryParam(value = "nbreMois") int nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        long total = ficheArticleService.produitPerimesCount(query, nbreMois, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste);
        return Response.ok().entity(new JSONObject().put("total", total).toString()).build();
    }

    @PUT
    @Path("dateperemption/{id}/{date}")
    public Response modifierDatePeremption(@PathParam("id") String id, @PathParam("date") String datePeremption)
            throws JSONException {

        return Response.ok().entity(ficheArticleService.modifierArticleDatePeremption(id, datePeremption).toString())
                .build();
    }

    @GET
    @Path("surstocks")
    public Response articleSurStock(@QueryParam(value = "nbreMois") int nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "nbreConsommation") int nbreConsommation) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = ficheArticleService.articleSurStock(tu, query, codeFamile, codeRayon, codeGrossiste,
                nbreMois, nbreConsommation, 0, 0);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("comparaison")
    public Response comparaisonStock(@QueryParam(value = "seuil") int seuil,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "filtreSeuil") MargeEnum filtreSeuil,
            @QueryParam(value = "filtreStock") MargeEnum filtreStock, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = ficheArticleService.comparaisonStock(tu, query, filtreStock, filtreSeuil, codeFamile,
                codeRayon, codeGrossiste, stock, seuil, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("comparaison/details/{id}")
    public Response produitConsomamation(@PathParam("id") String id, @QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = ficheArticleService.produitConsomamation(tu, query, dtStart, dtEnd, id, 0, 0);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("comparaison/suggestion")
    public Response suggestion(@QueryParam(value = "seuil") int seuil,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "filtreSeuil") MargeEnum filtreSeuil,
            @QueryParam(value = "filtreStock") MargeEnum filtreStock, @QueryParam(value = "stock") int stock,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<ArticleDTO> datas = ficheArticleService.comparaisonStock(tu, query, filtreStock, filtreSeuil, codeFamile,
                codeRayon, codeGrossiste, stock, seuil, 0, 0, true);
        JSONObject json = suggestionService.makeSuggestionFromArticleInvendus(datas, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("account/{id}")
    public Response updateProduct(@PathParam("id") String id, Params account) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        boolean res = ficheArticleService.updateProduitAccount(id, account.isCheckug());
        return Response.ok().entity(new JSONObject().put("success", res).toString()).build();
    }

    @GET
    @Path("account")
    public Response getProducts(@QueryParam(value = "query") String query, @QueryParam(value = "rayon") String rayon,
            @QueryParam(value = "filtre") String filtre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = ficheArticleService.produitAccounts(query, rayon, filtre, tu, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("saisieperimes")
    public Response saisiePerimes(@QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = ficheArticleService.saisiePerimes(query, dtStart, dtEnd, tu, codeFamile, codeRayon,
                codeGrossiste, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    /*
     * Visualisation des perimes (peremptionquery) : exports CSV/Excel et creation d'inventaire sur la liste filtree.
     * nbreMois recu en String pour tolerer une valeur vide (equivalent 0 = filtre par periode/dates).
     */
    private int parseNbreMois(String nbreMois) {
        try {
            return Integer.parseInt(nbreMois.trim());
        } catch (Exception e) {
            return 0;
        }
    }

    @GET
    @Path("perimes/csv")
    @Produces("text/csv")
    public Response exportPerimesCsv(@QueryParam(value = "nbreMois") String nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws IOException, JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = ficheArticleService.exportPerimesCsv(query, parseNbreMois(nbreMois), dtStart, dtEnd, codeFamile,
                codeRayon, codeGrossiste);
        String filename = "peremptions-proches_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".csv";
        return Response.ok(data, "text/csv; charset=UTF-8").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("perimes/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportPerimesExcel(@QueryParam(value = "nbreMois") String nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws IOException, JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = ficheArticleService.exportPerimesExcel(query, parseNbreMois(nbreMois), dtStart, dtEnd, codeFamile,
                codeRayon, codeGrossiste);
        String filename = "peremptions-proches_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    // Nombre de produits distincts (controle avant confirmation de creation d'inventaire)
    @GET
    @Path("perimes/produits/count")
    public Response perimesProduitsCount(@QueryParam(value = "nbreMois") String nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int count = ficheArticleService
                .perimesProduitIds(query, parseNbreMois(nbreMois), dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste)
                .size();
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    // Creation d'inventaire "Inventaire peremptions proches yyyy-MM-dd HH:mm:ss"
    @POST
    @Path("perimes/create-inventaire")
    public Response perimesCreateInventaire(@QueryParam(value = "nbreMois") String nbreMois,
            @QueryParam(value = "codeFamile") String codeFamile, @QueryParam(value = "query") String query,
            @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = ficheArticleService.createInventairePerimes(query, parseNbreMois(nbreMois), dtStart, dtEnd,
                codeFamile, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("saisieperimes/csv")
    @Produces("text/csv")
    public Response exportSaisiePerimesCsv(@QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = ficheArticleService.exportSaisiePerimesCsv(query, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste);

        String filename = "saisie-perimes_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".csv";

        return Response.ok(data, "text/csv; charset=UTF-8").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("saisieperimes/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportSaisiePerimesExcel(@QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = ficheArticleService.exportSaisiePerimesExcel(query, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste);

        String filename = "saisie-perimes_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".xls";

        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("saisieperimes/create-inventaire")
    public Response createInventaireSaisiePerimes(@QueryParam(value = "codeFamile") String codeFamile,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = ficheArticleService.createInventaireSaisiePerimes(query, dtStart, dtEnd, codeFamile,
                codeRayon, codeGrossiste);

        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("add-lot")
    public Response addLot(AddLot addLot) {

        ficheArticleService.addLot(addLot);
        return Response.accepted().build();
    }

    @POST
    @Path("produit/update-lite-info")
    public Response updateProduit(UpdateProduit updateProduit) {
        ficheArticleService.updateProduitLiteInfo(updateProduit);
        return Response.accepted().build();
    }

    // ----------------------- Privileges des boutons de la fiche article -----------------------
    /**
     * Droits de l'utilisateur connecte sur les boutons de l'ecran fiche article, lus en un seul appel a l'ouverture de
     * l'ecran (memes privileges que ceux verifies cote serveur sur les operations correspondantes).
     */
    @GET
    @Path("privileges-boutons")
    public Response privilegesBoutons() {
        HttpSession hs = servletRequest.getSession();
        TUser user = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (user == null) {
            return Response.ok().entity(new JSONObject().put("success", false).toString()).build();
        }
        @SuppressWarnings("unchecked")
        List<dal.TPrivilege> privileges = (List<dal.TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        JSONObject json = new JSONObject().put("success", true);
        json.put(Constant.P_BTN_CREER_ARTICLE, hasPrivilege(privileges, Constant.P_BTN_CREER_ARTICLE));
        json.put(Constant.P_BTN_RECALCULER_SEUILS, hasPrivilege(privileges, Constant.P_BTN_RECALCULER_SEUILS));
        json.put(Constant.P_BTN_MAJ_SEUIL, hasPrivilege(privileges, Constant.P_BTN_MAJ_SEUIL));
        json.put(Constant.P_BTN_IMPORT_ARTICLE, hasPrivilege(privileges, Constant.P_BTN_IMPORT_ARTICLE));
        return Response.ok().entity(json.toString()).build();
    }

    private static boolean hasPrivilege(List<dal.TPrivilege> privileges, String name) {
        return privileges != null && util.DateConverter.hasAuthorityByName(privileges, name);
    }

    // ----------------------- MAJ SEUIL groupee (Q1/Q2 par produit) -----------------------
    @GET
    @Path("maj-seuil/list")
    public Response majSeuilList(@QueryParam("codeFamille") String codeFamille,
            @QueryParam("zoneGeoId") String zoneGeoId, @QueryParam("search") String search,
            @QueryParam("classeAbcId") String classeAbcId, @QueryParam("start") int start,
            @QueryParam("limit") int limit) {
        int lim = (limit > 0) ? limit : 15;
        return Response.ok().entity(
                ficheArticleService.majSeuilList(codeFamille, zoneGeoId, search, classeAbcId, start, lim).toString())
                .build();
    }

    @POST
    @Path("maj-seuil/apply")
    public Response majSeuilApply(String body) {
        // Meme controle que le bouton 'MAJ SEUIL' de l'ecran : privilege obligatoire cote serveur
        HttpSession hs = servletRequest.getSession();
        @SuppressWarnings("unchecked")
        List<dal.TPrivilege> privileges = (List<dal.TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        if (!hasPrivilege(privileges, Constant.P_BTN_MAJ_SEUIL)) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false)
                            .put("message", "Vous n'avez pas le privilège requis pour cette opération").toString())
                    .build();
        }
        JSONObject in = new JSONObject(body);
        String mode = in.optString("mode", "SELECTED");
        String codeFamille = in.optString("codeFamille", "");
        String zoneGeoId = in.optString("zoneGeoId", "");
        String search = in.optString("search", "");
        String classeAbcId = in.optString("classeAbcId", "");
        Integer q1 = (in.has("q1") && !in.isNull("q1")) ? in.getInt("q1") : null;
        Integer q2 = (in.has("q2") && !in.isNull("q2")) ? in.getInt("q2") : null;
        List<String> ids = jsonArrToList(in.optJSONArray("ids"));
        List<String> unchecked = jsonArrToList(in.optJSONArray("uncheckedIds"));
        return Response.ok().entity(ficheArticleService
                .majSeuilApply(mode, codeFamille, zoneGeoId, search, classeAbcId, ids, unchecked, q1, q2).toString())
                .build();
    }

    private static List<String> jsonArrToList(org.json.JSONArray a) {
        List<String> l = new java.util.ArrayList<>();
        if (a != null) {
            for (int i = 0; i < a.length(); i++) {
                String s = a.optString(i, null);
                if (s != null && !s.isEmpty()) {
                    l.add(s);
                }
            }
        }
        return l;
    }

    @GET
    @Path("comparaison/csv")
    @Produces("text/csv")
    public Response exportComparaisonCsv(@QueryParam("seuil") int seuil, @QueryParam("codeFamile") String codeFamile,
            @QueryParam("query") String query, @QueryParam("codeRayon") String codeRayon,
            @QueryParam("codeGrossiste") String codeGrossiste, @QueryParam("filtreSeuil") MargeEnum filtreSeuil,
            @QueryParam("filtreStock") MargeEnum filtreStock, @QueryParam("stock") int stock) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = ficheArticleService.buildComparaisonCsv(tu, query, filtreStock, filtreSeuil, codeFamile,
                codeRayon, codeGrossiste, stock, seuil);

        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"comparaison_stock.csv\"")
                .build();
    }

    @GET
    @Path("comparaison/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportComparaisonExcel(@QueryParam("seuil") int seuil, @QueryParam("codeFamile") String codeFamile,
            @QueryParam("query") String query, @QueryParam("codeRayon") String codeRayon,
            @QueryParam("codeGrossiste") String codeGrossiste, @QueryParam("filtreSeuil") MargeEnum filtreSeuil,
            @QueryParam("filtreStock") MargeEnum filtreStock, @QueryParam("stock") int stock) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        byte[] data = ficheArticleService.buildComparaisonExcel(tu, query, filtreStock, filtreSeuil, codeFamile,
                codeRayon, codeGrossiste, stock, seuil);

        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"comparaison_stock.xls\"")
                .build();
    }

    @GET
    @Path("comparaison/inventaire")
    @Produces("application/json")
    public Response createInventaireComparaison(@QueryParam("seuil") int seuil,
            @QueryParam("codeFamile") String codeFamile, @QueryParam("query") String query,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("filtreSeuil") MargeEnum filtreSeuil, @QueryParam("filtreStock") MargeEnum filtreStock,
            @QueryParam("stock") int stock) throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = ficheArticleService.createInventaireComparaison(tu, query, filtreStock, filtreSeuil,
                codeFamile, codeRayon, codeGrossiste, stock, seuil);

        return Response.ok(json.toString()).build();
    }

}
