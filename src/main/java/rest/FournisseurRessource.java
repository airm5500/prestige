/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.FournisseurService;

/**
 *
 * @author koben
 */
@Path("v1/grossiste")
@Produces("application/json")
@Consumes("application/json")
public class FournisseurRessource {

    @EJB
    private FournisseurService fournisseurService;

    @GET
    @Path("all")
    public Response findAll(@QueryParam(value = "query") String query) {
        JSONObject jsono = this.fournisseurService.getAll(query);
        return Response.ok().entity(jsono.toString()).build();
    }

}
