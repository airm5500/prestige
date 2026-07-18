package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.InventaireService;
import toolkits.parameters.commonparameter;
import util.Constant;
import javax.ws.rs.POST;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
@Path("v1/inventaire")
@Produces("application/json")
@Consumes("application/json")
public class InventaireRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private InventaireService inventaireService;

    @GET
    @Path("produit-annules")
    public Response doInventaireFromProduitsAnnules(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "userId") String userId) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = this.inventaireService.createInventaireFromCanceledList(dtStart, dtEnd, userId, tu);

        return Response.ok().entity(json.toString()).build();
    }

    private java.util.List<String> parseVenteIds(String body) {
        java.util.List<String> venteIds = new java.util.ArrayList<>();
        try {
            org.json.JSONArray ids = new JSONObject(body).optJSONArray("ids");
            if (ids != null) {
                for (int i = 0; i < ids.length(); i++) {
                    String id = ids.optString(i);
                    if (StringUtils.isNotEmpty(id)) {
                        venteIds.add(id);
                    }
                }
            }
        } catch (Exception e) {
        }
        return venteIds;
    }

    // Nombre de produits distincts des ventes annulees selectionnees (controle avant confirmation)
    @POST
    @Path("produit-annules/selection/count")
    public Response produitsAnnulesSelectionCount(String body) throws org.json.JSONException {
        int count = inventaireService.produitIdsFromVentes(parseVenteIds(body)).size();
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    // Creation d'inventaire a partir des produits des ventes annulees selectionnees
    // (selection conservee sur toutes les pages cote ecran)
    @POST
    @Path("produit-annules/selection")
    public Response doInventaireFromProduitsAnnulesSelection(String body) throws org.json.JSONException {
        java.util.Set<String> produitIds = inventaireService.produitIdsFromVentes(parseVenteIds(body));
        if (produitIds.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Aucun produit dans les ventes selectionnees").toString()).build();
        }
        String name = "INVENTAIRE PRODUITS ANNULES " + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(produitIds, name, name);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    @GET
    @Path("refreshStockLigneInventaire/{id}")
    public Response refreshStockLigneInventaire(@PathParam("id") String id) {

        inventaireService.refreshStockLigneInventaire(id);
        return Response.ok().build();
    }

    @POST
    @Path("import-csv")
    public Response createInventaireFromCsv(String payload) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject request = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        JSONObject json = inventaireService.createInventaireFromCsv(request.optString("csvContent"), tu);
        return Response.ok().entity(json.toString()).build();
    }

}
