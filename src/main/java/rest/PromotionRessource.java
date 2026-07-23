package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.PromotionService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Ecrans Promotions et Historique de promotions en REST (les anciens ecrans n'existaient plus dans l'application).
 * Regles alignees sur la consommation des promotions par la vente : types REMISE / PRIX SPECIAL / UNITES GRATUITES,
 * produit marque blPROMOTED, promotion active tant que sa date de fin n'est pas depassee.
 */
@Path("v1/promotions")
@Produces("application/json")
@Consumes("application/json")
public class PromotionRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private PromotionService promotionService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (currentUser() == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(promotionService.listPromotions(search, start, limit).toString()).build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("str_TYPE") String type, @FormParam("dt_START_DATE") String dtStart,
            @FormParam("dt_END_DATE") String dtEnd) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(promotionService.createPromotion(type, dtStart, dtEnd).toString()).build();
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_CODE_PROMOTION_ID") int promotionId, @FormParam("str_TYPE") String type,
            @FormParam("dt_START_DATE") String dtStart, @FormParam("dt_END_DATE") String dtEnd) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(promotionService.updatePromotion(promotionId, type, dtStart, dtEnd).toString())
                .build();
    }

    @POST
    @Path("cloturer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response cloturer(@FormParam("lg_CODE_PROMOTION_ID") int promotionId) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(promotionService.cloturerPromotion(promotionId).toString()).build();
    }

    @GET
    @Path("produits")
    public Response produits(@QueryParam("lg_CODE_PROMOTION_ID") int promotionId,
            @QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (currentUser() == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(promotionService.listProduits(promotionId, search, start, limit).toString())
                .build();
    }

    @POST
    @Path("produits/add")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response addProduit(@FormParam("lg_CODE_PROMOTION_ID") int promotionId,
            @FormParam("lg_FAMILLE_ID") String familleId, @DefaultValue("0") @FormParam("int_DISCOUNT") int discount,
            @DefaultValue("0") @FormParam("db_PROMOTION_PRICE") double promoPrice,
            @DefaultValue("0") @FormParam("int_PACK_NUMBER") int packNumber,
            @DefaultValue("0") @FormParam("int_ACTIVE_AT") int activeAt) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response
                .ok().entity(promotionService
                        .addProduit(promotionId, familleId, discount, promoPrice, packNumber, activeAt).toString())
                .build();
    }

    @POST
    @Path("produits/remove")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response removeProduit(@FormParam("lg_PROMOTION_PRODUCT_ID") int promotionProductId) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(promotionService.removeProduit(promotionProductId).toString()).build();
    }

    @GET
    @Path("historique")
    public Response historique(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (currentUser() == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(promotionService.listHistorique(search, start, limit).toString()).build();
    }
}
