/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.GammeProduit;
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
import rest.repo.GammeProduitRepo;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/gammeproduits")
@Produces("application/json")
@Consumes("application/json")
public class GammeProduitRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ProduitQueryRepo produitQueryRepo;
    @EJB
    private GammeProduitRepo gammeProduitRepo;

    @GET
    public Response findAllGammeProduit(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) {
        List<GammeProduit> data = produitQueryRepo.findAllGammeProduit(query, start, limit, false);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, produitQueryRepo.countGammeProduit(query)))
                .build();
    }

    @POST
    public Response save(GammeProduit gammeProduit) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        gammeProduit = gammeProduitRepo.saveOrUpdate(gammeProduit);
        if (gammeProduit != null) {
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
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int result = gammeProduitRepo.deleteById(id);
        if (result > 0) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }
}
