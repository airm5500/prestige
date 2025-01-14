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
import toolkits.parameters.commonparameter;

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
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        params.setUserId(tu);
        JSONObject json = deconditionService.deconditionnementVente(params);
        return Response.ok().entity(json.toString()).build();
    }
}
