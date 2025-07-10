/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.SalesParams;
import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.DeconditionService;
import rest.service.v2.dto.DeconditionnementParamsDTO;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author Kobena
 */
@Path("v1/decondition")
@Produces("application/json")
@Consumes("application/json")
public class DeconditionRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    DeconditionService deconditionService;

    @POST
    @Path("vente")
    public Response add(SalesParams params) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        params.setUserId(tu);
        JSONObject json = deconditionService.deconditionnementVente(params);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("deconditionner")
    public Response deconditionner(DeconditionnementParamsDTO params) throws Exception {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        deconditionService.deconditionner(params, tu);
        return Response.ok().build();
    }
}
