/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.Groupefournisseur;
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
import rest.repo.GroupefournisseurRepo;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/groupegrossiste")
@Produces("application/json")
@Consumes("application/json")
public class GroupefournisseurRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ProduitQueryRepo produitQueryRepo;
    @EJB
    private GroupefournisseurRepo groupefournisseurRepo;

    @GET
    public Response findAll(@QueryParam(value = "query") String query) {
        List<Groupefournisseur> data = produitQueryRepo.findAllGroupeFournisseurs(query);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    public Response save(Groupefournisseur g) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        g = groupefournisseurRepo.saveOrUpdate(g);
        if (g != null) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }

    @DELETE
    @Path("{id}")
    public Response remove(@PathParam("id") Integer id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int result = groupefournisseurRepo.deleteById(id);
        if (result > 0) {
            return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
        }
        return Response.ok().entity(ResultFactory.getFailResult()).build();
    }
}
