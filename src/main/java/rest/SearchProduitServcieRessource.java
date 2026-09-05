package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.SearchProduitServcie;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/produit-search")
@Produces("application/json")
@Consumes("application/json")
public class SearchProduitServcieRessource {

    @Inject
    private HttpServletRequest servletRequest;
    private @EJB SearchProduitServcie searchProduitServcie;
    private @EJB InventaireService inventaireService;

    @GET
    @Path("fiche")
    public Response getAll(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search_value") String search, @QueryParam(value = "str_TYPE_TRANSACTION") String type,
            @QueryParam(value = "lg_DCI_ID") String diciId, @QueryParam(value = "lg_ZONE_GEO_ID") String zoneGeoId,
            @QueryParam(value = "stock_operator") String stockOperator,
            @QueryParam(value = "stock_value") String stockValue, @QueryParam(value = "lg_CODE_TVA_ID") String tvaId,
            @QueryParam(value = "produitId") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> attribute = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        JSONObject jsono = this.searchProduitServcie.fetchProduits(attribute, tu, produitId, search, diciId, type,
                zoneGeoId, stockOperator, stockValue, tvaId, limit, start);
        return Response.ok().entity(jsono.toString()).build();
    }

    /**
     * Indicateurs de la fiche article pour les memes criteres que la liste, calcules sur l'ensemble du resultat et non
     * sur la page affichee.
     */
    @GET
    @Path("fiche-kpi")
    public Response kpiFiche(@QueryParam(value = "search_value") String search,
            @QueryParam(value = "str_TYPE_TRANSACTION") String type, @QueryParam(value = "lg_DCI_ID") String diciId,
            @QueryParam(value = "lg_ZONE_GEO_ID") String zoneGeoId,
            @QueryParam(value = "stock_operator") String stockOperator,
            @QueryParam(value = "stock_value") String stockValue, @QueryParam(value = "lg_CODE_TVA_ID") String tvaId)
            throws JSONException {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(new JSONObject().put("success", false).toString()).build();
        }
        return Response.ok()
                .entity(this.searchProduitServcie
                        .kpiFiche(tu, search, diciId, type, zoneGeoId, stockOperator, stockValue, tvaId).toString())
                .build();
    }

    /**
     * Cree un inventaire a partir du resultat de la recherche courante de la fiche article. mode = "RESERVE" :
     * inventaire de reserve, restreint aux produits ayant bool_RESERVE = true ; sinon : inventaire normal (emplacement)
     * de tous les produits filtres.
     */
    @POST
    @Path("create-inventaire")
    public Response createInventaire(String body) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        JSONObject in = new JSONObject(body);
        String search = in.optString("search_value", "");
        String type = in.optString("str_TYPE_TRANSACTION", "");
        String diciId = in.optString("lg_DCI_ID", "");
        String zoneGeoId = in.optString("lg_ZONE_GEO_ID", "");
        String stockOperator = in.optString("stock_operator", "");
        String stockValue = in.optString("stock_value", "");
        String tvaId = in.optString("lg_CODE_TVA_ID", "");
        String mode = in.optString("mode", "RAYON");
        String name = in.optString("name", "Inventaire");
        boolean onlyReserve = "RESERVE".equalsIgnoreCase(mode);

        List<String> idList = this.searchProduitServcie.fetchProduitIds(tu, search, diciId, type, zoneGeoId,
                stockOperator, stockValue, tvaId, onlyReserve);
        Set<String> ids = new LinkedHashSet<>(idList);

        JSONObject json = new JSONObject();
        if (ids.isEmpty()) {
            return Response.ok().entity(json.put("success", false).put("count", 0)
                    .put("message", "Aucun produit a inventorier.").toString()).build();
        }
        int count = onlyReserve ? this.inventaireService.createReserveInventaire(ids, name, name)
                : this.inventaireService.create(ids, name);
        return Response.ok().entity(json.put("success", true).put("count", count).put("name", name).toString()).build();
    }

    @GET
    @Path("/produits")
    public Response getProduits(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "produitId") String produitId, @QueryParam(value = "query") String query,
            @QueryParam(value = "search_value") String searchValue) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = this.searchProduitServcie.fetchOrderProduits(tu, produitId,
                StringUtils.isNotEmpty(query) ? query : searchValue, limit, start);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("/produits/{id}")
    public Response getOne(@PathParam("id") String produitId) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        List<TPrivilege> attribute = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        JSONObject jsono = this.searchProduitServcie.fetchOne(attribute, tu, produitId);
        return Response.ok().entity(jsono.toString()).build();
    }

}
