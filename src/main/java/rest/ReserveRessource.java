package rest;

import dal.TUser;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.ReserveService;
import util.Constant;

/**
 *
 * @author Hermann N'ZI
 */

/**
 * Endpoints REST de gestion des reserves. Remplace les anciens JSP ws_data / ws_transaction.
 */
@Path("v1/reserve")
@Produces("application/json")
@Consumes("application/json")
public class ReserveRessource {

    @Inject
    private HttpServletRequest servletRequest;
    private @EJB ReserveService reserveService;

    private TUser currentUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    @GET
    @Path("articles")
    public Response articles(@QueryParam("search_value") String search, @QueryParam("str_TYPE_TRANSACTION") String type,
            @QueryParam("start") int start, @QueryParam("limit") int limit) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.listArticles(user, search, type, start, limit > 0 ? limit : 20);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Export Excel de l'onglet courant. Les parametres sont ceux de {@code articles} : l'export respecte donc le
     * filtre de recherche actif et contient les memes lignes que la grille.
     */
    @GET
    @Path("export/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam("search_value") String search,
            @QueryParam("str_TYPE_TRANSACTION") String type) throws Exception {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = reserveService.exportExcel(user, search, type);
        String fichier = "reserves_" + (type == null || type.trim().isEmpty() ? "ALL" : type.trim()) + ".xls";
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"" + fichier + "\"").build();
    }

    /** Historique complet, avec recherche produit, type, periode, plage horaire et utilisateur. */
    @GET
    @Path("historique")
    public Response historique(@QueryParam("search_value") String search, @QueryParam("type") String type,
            @QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("heureDebut") Integer heureDebut, @QueryParam("heureFin") Integer heureFin,
            @QueryParam("userId") String userId, @QueryParam("start") int start, @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.historique(user, search, type, dtStart, dtEnd, heureDebut, heureFin, userId,
                start, limit > 0 ? limit : 25);
        return Response.ok().entity(json.toString()).build();
    }

    /** Export Excel de l'historique, respectant les filtres actifs. */
    @GET
    @Path("historique/excel")
    @Produces("application/vnd.ms-excel")
    public Response historiqueExcel(@QueryParam("search_value") String search, @QueryParam("type") String type,
            @QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("heureDebut") Integer heureDebut, @QueryParam("heureFin") Integer heureFin,
            @QueryParam("userId") String userId) throws Exception {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = reserveService.exportHistoriqueExcel(user, search, type, dtStart, dtEnd, heureDebut, heureFin,
                userId);
        return Response.ok(data)
                .header("Content-Disposition", "attachment; filename=\"historique_reserve.xls\"").build();
    }

    /** Utilisateurs ayant effectue au moins un mouvement, pour le filtre correspondant. */
    @GET
    @Path("historique/utilisateurs")
    public Response historiqueUtilisateurs() {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok().entity(reserveService.utilisateursMouvements(user).toString()).build();
    }

    @GET
    @Path("suggestions")
    public Response suggestions(@QueryParam("search_value") String search, @QueryParam("start") int start,
            @QueryParam("limit") int limit) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.suggestions(user, search, start, limit > 0 ? limit : 20);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Compteur leger pour le badge de la cloche de notifications : nombre d'articles a reassortir, sans construire la
     * liste detaillee.
     */
    @GET
    @Path("suggestions/count")
    public Response suggestionsCount(@QueryParam("search_value") String search) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok()
                .entity(new JSONObject().put("total", reserveService.suggestionsCount(user, search)).toString())
                .build();
    }

    @GET
    @Path("suggestions-reappro")
    public Response suggestionsReappro(@QueryParam("search_value") String search, @QueryParam("start") int start,
            @QueryParam("limit") int limit) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.suggestionsReappro(user, search, start, limit > 0 ? limit : 20);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("assort")
    public Response assort(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject in = new JSONObject(body);
        JSONObject json = reserveService.assort(user, in.optString("lg_FAMILLE_ID", null), in.optInt("int_NUMBER", 0));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("reassort")
    public Response reassort(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject in = new JSONObject(body);
        JSONObject json = reserveService.reassort(user, in.optString("lg_FAMILLE_ID", null),
                in.optInt("int_NUMBER", 0));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("reassort-batch")
    public Response reassortBatch(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONArray arr = new JSONObject(body).optJSONArray("items");
        List<JSONObject> items = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                items.add(arr.getJSONObject(i));
            }
        }
        JSONObject json = reserveService.reassortBatch(user, items);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("assort-batch")
    public Response assortBatch(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONArray arr = new JSONObject(body).optJSONArray("items");
        List<JSONObject> items = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                items.add(arr.getJSONObject(i));
            }
        }
        JSONObject json = reserveService.assortBatch(user, items);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("mouvements")
    public Response allMouvements(@QueryParam("type") String type, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("start") int start, @QueryParam("limit") int limit)
            throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.allMouvements(type, dtStart, dtEnd, start, limit > 0 ? limit : 500);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("create-inventaire")
    public Response createInventaire(@QueryParam("search_value") String search,
            @QueryParam("str_TYPE_TRANSACTION") String type) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.createInventaire(user, search, type);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("create-inventaire-selection")
    public Response createInventaireSelection(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject in = new JSONObject(body);
        String commentaire = in.optString("description", null);
        JSONArray arr = in.optJSONArray("ids");
        java.util.Set<String> ids = new java.util.LinkedHashSet<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                String id = arr.optString(i, null);
                if (id != null && !id.isEmpty()) {
                    ids.add(id);
                }
            }
        }
        JSONObject json = reserveService.createInventaireFromSelection(user, ids, commentaire);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("mouvements/{id}")
    public Response mouvements(@PathParam("id") String familleId, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("start") int start, @QueryParam("limit") int limit)
            throws JSONException {
        JSONObject json = reserveService.mouvements(familleId, dtStart, dtEnd, start, limit > 0 ? limit : 200);
        return Response.ok().entity(json.toString()).build();
    }
}
