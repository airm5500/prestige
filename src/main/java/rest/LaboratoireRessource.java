/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.Laboratoire;
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
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import rest.query.repo.ProduitQueryRepo;
import rest.repo.LaboratoireRepo;
import toolkits.parameters.commonparameter;

/**
 *
 * @author koben
 */
@Path("v1/laboratoireproduits")
@Produces("application/json")
@Consumes("application/json")
public class LaboratoireRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ProduitQueryRepo produitQueryRepo;
    @EJB
    private LaboratoireRepo repo;

    @GET
    public Response findAllGammeProduit(
            @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "query") String query) {
        List<Laboratoire> data = produitQueryRepo.findAllLaboratoire(query, start, limit, false);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, produitQueryRepo.countLaboratoire(query))).build();
    }

    @POST
    public Response save(Laboratoire obj) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        obj = repo.saveOrUpdate(obj);
        if (obj != null) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }

    @DELETE
    @Path("{id}")
    public Response remove(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter")).build();
        }
        int result = repo.deleteById(id);
        if (result > 0) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }
}
