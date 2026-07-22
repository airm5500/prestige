/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.SupportControle;
import dal.TUser;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.repo.SupportControleRepo;
import rest.service.SupportCoherenceService;
import util.Constant;

/**
 * Veilleur de coherence du Centre de Support : liste des controles et declenchement manuel.
 *
 * @author koben
 */
@Path("v1/support/coherence")
@Produces("application/json")
@Consumes("application/json")
public class SupportCoherenceRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SupportControleRepo supportControleRepo;
    @EJB
    private SupportCoherenceService supportCoherenceService;

    @GET
    public Response findAll() {
        List<SupportControle> data = supportControleRepo.findAll();
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("run")
    public Response run() {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<Map<String, Object>> synthese = supportCoherenceService.runActiveChecks();
        return Response.ok().entity(ResultFactory.getSuccessResult(synthese, synthese.size())).build();
    }
}
