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
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MedecinService;

/**
 *
 * @author koben
 */
@Path("v1/medecin")
@Produces("application/json")
@Consumes("application/json")
public class MedecinRessource {

    @EJB
    MedecinService medecinService;

    @GET
    @Path("medecins")
    public Response getUsers(@QueryParam(value = "query") String query) throws JSONException {
        JSONObject json = medecinService.findAllByNonOrNumOrder(query);
        return Response.ok().entity(json.toString()).build();
    }

}
