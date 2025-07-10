package rest;

import dal.TUser;
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
import org.json.JSONObject;
import rest.service.BilletageService;
import rest.service.dto.BilletageDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/billetage")
@Produces("application/json")
@Consumes("application/json")
public class BilletageServiceRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private BilletageService billetageService;

    @GET
    @Path("/cloture-data")
    public Response getClotureData(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = new JSONObject();

        json.put("data", new JSONObject(billetageService.getUserCaisseData(dtStart, dtEnd, hStart, hEnd, tu)));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/ouventure-data")
    public Response getOuvertureData(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = new JSONObject();

        json.put("data", new JSONObject(billetageService.getUserCoffreCaisse(dtStart, dtEnd, hStart, hEnd, tu)));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("/cloture")
    public Response doBillatage(BilletageDTO billetage) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        this.billetageService.cloturerCaisse(billetage, tu);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @GET
    @Path("/list-fond-caisse")
    public Response getListFondCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "search") String search,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        return Response.ok()
                .entity(this.billetageService.getListCoffreCaisses(dtStart, dtEnd, search, start, limit).toString())
                .build();
    }
}
