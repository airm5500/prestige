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
import javax.ws.rs.core.Response;
import rest.service.SupportEventService;

/**
 * Tableau de bord "Sante application" du Centre de Support.
 *
 * @author koben
 */
@Path("v1/support/sante")
@Produces("application/json")
@Consumes("application/json")
public class SupportSanteRessource {

    @EJB
    private SupportEventService supportEventService;

    @GET
    public Response sante() {
        return Response.ok().entity(ResultFactory.getSuccessResult(supportEventService.sante(), 1)).build();
    }
}
