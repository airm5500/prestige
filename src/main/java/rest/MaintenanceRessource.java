package rest;

import dal.TUser;
import java.util.Set;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.MainteanceService;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/maintenance")
@Produces("application/json")
@Consumes("application/json")
public class MaintenanceRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private MainteanceService mainteanceService;

    @GET
    @Path("/doublons-cip")
    public Response doublonsCip() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok().entity(mainteanceService.getDoublonsFamilleGrossistes().toString()).build();
    }

    @POST
    @Path("remove-cip")
    public Response removeCip(Set<String> cips) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        mainteanceService.remove(cips);
        return Response.ok().build();
    }

    @GET
    @Path("add-cip-constraint")
    public Response addConstraintCip() throws Exception {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        mainteanceService.addConstraint();
        return Response.ok().build();
    }

    @DELETE
    @Path("remove-cip/{id}")
    public Response removeCip(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        mainteanceService.remoteFamilleGrossiste(id);
        return Response.ok().build();
    }

    @GET
    @Path("/version")
    public Response getVersion() {

        return Response.ok()
                .entity(new JSONObject().put("version", new JSONObject(rest.service.impl.Utils.version)).toString())
                .build();
    }
}
