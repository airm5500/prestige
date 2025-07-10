/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.MotifReglement;
import dal.TUser;
import java.util.List;
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
import rest.repo.MotifReglementRepo;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/motifreglement")
@Produces("application/json")
@Consumes("application/json")
public class MotifReglementRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private MotifReglementRepo motifReglementRepo;

    @GET
    public Response findAll() {
        List<MotifReglement> data = motifReglementRepo.fetch();
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    public Response save(MotifReglement motifReglement) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        motifReglementRepo.saveOrUpdate(motifReglement);

        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @DELETE
    @Path("{id}")
    public Response remove(@PathParam("id") Integer id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int result = motifReglementRepo.deleteById(id);
        if (result > 0) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }
}
