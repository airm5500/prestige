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

    /** Recherche legere de produits (nom ou CIP) pour le combo d'ajout de produit a une promotion. */
    @GET
    @Path("produits-recherche")
    public Response rechercherProduits(@QueryParam("search_value") String searchValue,
            @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        if (currentUser() == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(promotionService.rechercherProduits(search, start, limit).toString()).build();
    }

    @POST
    @Path("produits/add")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response addProduit(@FormParam("lg_CODE_PROMOTION_ID") int promotionId,
            @FormParam("lg_FAMILLE_ID") String familleId, @FormParam("int_DISCOUNT") String discount,
            @FormParam("db_PROMOTION_PRICE") String promoPrice, @FormParam("int_PACK_NUMBER") String packNumber,
            @FormParam("int_ACTIVE_AT") String activeAt, @FormParam("str_MODE_UG") String modeUg) {
        if (currentUser() == null) {
            return deconnecte();
        }
        /*
         * audit 05 PR-07 : nombres recus en texte ; une valeur decimale ou illisible donne un message clair (avant :
         * erreur HTTP brute affichee telle quelle par l'ecran).
         */
        Integer remise = entier(discount), pack = entier(packNumber), seuil = entier(activeAt);
        Double prix = nombre(promoPrice);
        if (remise == null || pack == null || seuil == null || prix == null) {
            return Response.ok()
                    .entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                            .put("errors", "Remise, unités gratuites et seuil sont des nombres entiers (sans virgule)")
                            .toString())
                    .build();
        }
        return Response.ok().entity(
                promotionService.addProduit(promotionId, familleId, remise, prix, pack, modeUg, seuil).toString())
                .build();
    }

    /** entier positif ou nul ; vide = 0 ; null si decimal ou illisible */
    private static Integer entier(String v) {
        if (v == null || v.isBlank()) {
            return 0;
        }
        try {
            return Integer.valueOf(v.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Double nombre(String v) {
        if (v == null || v.isBlank()) {
            return 0d;
        }
        try {
            return Double.valueOf(v.trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
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
