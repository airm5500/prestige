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
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.service.exception.FneExeception;
import rest.service.fne.FneService;

/**
 *
 * @author koben
 */
@Path("v1/fne")
@Produces("application/json")
@Consumes("application/json")
public class FneRessource {

    @EJB
    private FneService fneService;

    @GET
    @Path("invoices/sign/{id}")
    public Response getSign(@PathParam("id") String id) throws FneExeception {
        fneService.createInvoice(id);
        return Response.ok().build();
    }

}
