package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import rest.service.report.StatistiqueProduitService;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/produit/stats")
@Produces("application/json")
@Consumes("application/json")
public class StatistiqueProduitRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private StatistiqueProduitService statistiqueProduitService;

    @GET
    @Path("vente-annuelle")
    public Response quantiteVendueAnnuelle(@QueryParam(value = "year") Integer year,
            @QueryParam(value = "search") String search, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = this.statistiqueProduitService.getVenteProduits(year, search,
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), rayonId, start, limit);

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("vente-annuellep")
    public Response quantiteVendueAnnee(@QueryParam(value = "year") Integer year,
            @QueryParam(value = "search") String search, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {

        String TEmplacement = Constant.EMPLACEMENT;
        JSONObject json = this.statistiqueProduitService.getVenteProduits(year, search, TEmplacement, rayonId, start,
                limit);

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("years")
    public Response getYears() {

        JSONObject json = this.statistiqueProduitService.getIntervalAnnees();

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("produit-annules")
    public Response fetchListProduitsAnnules(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "userId") String userId,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = this.statistiqueProduitService.fetchListProduitAnnule(dtStart, dtEnd, userId, start, limit);

        return Response.ok().entity(json.toString()).build();
    }
}
