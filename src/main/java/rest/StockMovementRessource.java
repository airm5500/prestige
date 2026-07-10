package rest;

import commonTasks.dto.ArticleDTO;
import dal.TUser;
import java.util.List;
import java.util.Set;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.SuggestionService;
import rest.service.dto.StockMovementFilterDTO;
import rest.service.utils.StockMovementDataHelper;
import util.Constant;

/**
 * API REST de l'écran « Point détaillé entrée/sortie » (remplace les JSP ws_data_mouvement_*.jsp). La réponse de liste
 * conserve le contrat {success, total, results} attendu par le reader ExtJS existant.
 */
@Path("v1/stock-movements")
@Produces("application/json")
@Consumes("application/json")
public class StockMovementRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private SuggestionService suggestionService;

    @GET
    public Response list(@QueryParam("transactionType") String transactionType,
            @QueryParam("searchValue") String searchValue, @QueryParam("dateDebut") String dateDebut,
            @QueryParam("dateFin") String dateFin, @QueryParam("grossisteId") String grossisteId,
            @QueryParam("familleArticleId") String familleArticleId, @QueryParam("zoneGeoId") String zoneGeoId,
            @QueryParam("start") @DefaultValue("0") int start, @QueryParam("limit") @DefaultValue("20") int limit)
            throws JSONException {
        TUser user = connectedUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        try (StockMovementDataHelper helper = new StockMovementDataHelper(user)) {
            StockMovementFilterDTO filter = buildFilter(transactionType, searchValue, dateDebut, dateFin, grossisteId,
                    familleArticleId, zoneGeoId);
            return Response.ok().entity(helper.list(filter, start, limit).toString()).build();
        }
    }

    @GET
    @Path("export.csv")
    @Produces("text/csv")
    public Response exportCsv(@QueryParam("transactionType") String transactionType,
            @QueryParam("searchValue") String searchValue, @QueryParam("dateDebut") String dateDebut,
            @QueryParam("dateFin") String dateFin, @QueryParam("grossisteId") String grossisteId,
            @QueryParam("familleArticleId") String familleArticleId, @QueryParam("zoneGeoId") String zoneGeoId) {
        TUser user = connectedUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        try (StockMovementDataHelper helper = new StockMovementDataHelper(user)) {
            StockMovementFilterDTO filter = buildFilter(transactionType, searchValue, dateDebut, dateFin, grossisteId,
                    familleArticleId, zoneGeoId);
            byte[] data = helper.exportCsv(filter);
            return Response.ok(data)
                    .header("Content-Disposition", "attachment; filename=\"" + exportFileName(filter, "csv") + "\"")
                    .build();
        }
    }

    @GET
    @Path("export.xlsx")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportXlsx(@QueryParam("transactionType") String transactionType,
            @QueryParam("searchValue") String searchValue, @QueryParam("dateDebut") String dateDebut,
            @QueryParam("dateFin") String dateFin, @QueryParam("grossisteId") String grossisteId,
            @QueryParam("familleArticleId") String familleArticleId, @QueryParam("zoneGeoId") String zoneGeoId) {
        TUser user = connectedUser();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        try (StockMovementDataHelper helper = new StockMovementDataHelper(user)) {
            StockMovementFilterDTO filter = buildFilter(transactionType, searchValue, dateDebut, dateFin, grossisteId,
                    familleArticleId, zoneGeoId);
            byte[] data = helper.exportXlsx(filter);
            return Response.ok(data)
                    .header("Content-Disposition", "attachment; filename=\"" + exportFileName(filter, "xlsx") + "\"")
                    .build();
        }
    }

    /**
     * Création d'inventaire depuis la sélection (selectedProductIds) ou, à défaut, depuis tout le résultat filtré.
     */
    @POST
    @Path("inventory")
    public Response createInventory(StockMovementFilterDTO filter) throws JSONException {
        TUser user = connectedUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Set<String> produitIds = resolveProduitIds(user, filter);
        if (produitIds.isEmpty()) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false)
                            .put("msg", "Aucun produit ne correspond à la sélection ou aux filtres").toString())
                    .build();
        }
        String description = "INVENTAIRE POINT ENTREE/SORTIE DU " + safe(filter.getDateDebut()) + " AU "
                + safe(filter.getDateFin());
        int count = inventaireService.create(produitIds, description);
        return Response.ok().entity(new JSONObject().put("success", count > 0).put("count", count).toString()).build();
    }

    /**
     * Création de suggestion de commande depuis la sélection ou tout le résultat filtré ; les produits sont regroupés
     * par grossiste par défaut, ceux sans grossiste sont ignorés.
     */
    @POST
    @Path("suggestion")
    public Response createSuggestion(StockMovementFilterDTO filter) throws JSONException {
        TUser user = connectedUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Set<String> produitIds = resolveProduitIds(user, filter);
        if (produitIds.isEmpty()) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false)
                            .put("msg", "Aucun produit ne correspond à la sélection ou aux filtres").toString())
                    .build();
        }
        List<ArticleDTO> articles;
        try (StockMovementDataHelper helper = new StockMovementDataHelper(user)) {
            articles = helper.toArticleDtos(produitIds);
        }
        if (articles.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("msg", "Aucun des produits retenus n'a de grossiste par défaut").toString()).build();
        }
        JSONObject result = suggestionService.makeSuggestionFromArticleInvendus(articles, user);
        return Response.ok().entity(result.toString()).build();
    }

    private Set<String> resolveProduitIds(TUser user, StockMovementFilterDTO filter) {
        if (filter.getSelectedProductIds() != null && !filter.getSelectedProductIds().isEmpty()) {
            return new java.util.LinkedHashSet<>(filter.getSelectedProductIds());
        }
        try (StockMovementDataHelper helper = new StockMovementDataHelper(user)) {
            return helper.allFamilleIds(filter);
        }
    }

    private static String safe(String value) {
        return value == null || value.trim().isEmpty() ? new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date())
                : value.trim();
    }

    private static String exportFileName(StockMovementFilterDTO filter, String extension) {
        String type = filter.getTransactionType() == null || filter.getTransactionType().trim().isEmpty()
                ? StockMovementDataHelper.TYPE_ENTREESTOCK : filter.getTransactionType().trim().toUpperCase();
        return "mouvements_stock_" + type + "_" + safe(filter.getDateDebut()) + "_" + safe(filter.getDateFin()) + "."
                + extension;
    }

    private TUser connectedUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    private static StockMovementFilterDTO buildFilter(String transactionType, String searchValue, String dateDebut,
            String dateFin, String grossisteId, String familleArticleId, String zoneGeoId) {
        StockMovementFilterDTO filter = new StockMovementFilterDTO();
        filter.setTransactionType(transactionType);
        filter.setSearchValue(searchValue);
        filter.setDateDebut(dateDebut);
        filter.setDateFin(dateFin);
        filter.setGrossisteId(grossisteId);
        filter.setFamilleArticleId(familleArticleId);
        filter.setZoneGeoId(zoneGeoId);
        return filter;
    }
}
