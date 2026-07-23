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
import rest.service.ZoneGeographiqueService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Gestion des emplacements (zones geographiques) en REST : liste, creation, modification, prise en compte comptage et
 * desactivation/reactivation (unitaire ou en masse). Remplace les JSP webservices/configmanagement/zonegeographique
 * (formats JSON identiques). Le chemin v1/zones-geographiques est distinct de v1/emplacements/pdf (ErpRessource).
 */
@Path("v1/zones-geographiques")
@Produces("application/json")
@Consumes("application/json")
public class ZoneGeographiqueRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ZoneGeographiqueService zoneGeographiqueService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("true") @QueryParam("actifs") boolean actifs,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
        return Response.ok().entity(zoneGeographiqueService.list(user, search, actifs, start, limit).toString())
                .build();
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response create(@FormParam("str_CODE") String code, @FormParam("str_LIBELLEE") String libelle) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(zoneGeographiqueService.create(user, code, libelle).toString()).build();
    }

    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("lg_ZONE_GEO_ID") String zoneId, @FormParam("str_CODE") String code,
            @FormParam("str_LIBELLEE") String libelle) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(zoneGeographiqueService.update(user, zoneId, code, libelle).toString()).build();
    }

    @POST
    @Path("update-count")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response updateCount(@FormParam("lg_ZONE_GEO_ID") String zoneId,
            @FormParam("bool_ACCOUNT") boolean boolAccount) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(zoneGeographiqueService.updateCount(zoneId, boolAccount).toString()).build();
    }

    @POST
    @Path("toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleStatut(@FormParam("lg_ZONE_GEO_ID") String zoneId, @FormParam("actif") boolean actif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(zoneGeographiqueService.toggleStatus(user, zoneId, actif).toString()).build();
    }

    @POST
    @Path("toggle-statut-masse")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggleStatutMasse(@FormParam("lg_ZONE_GEO_IDS") String zoneIds, @FormParam("actif") boolean actif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(zoneGeographiqueService.toggleStatusMasse(user, zoneIds, actif).toString()).build();
    }
}
