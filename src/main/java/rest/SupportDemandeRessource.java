/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.SupportDemande;
import java.util.List;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import rest.service.SupportService;

/**
 * Historique des demandes envoyees au support (Centre de Support).
 *
 * @author koben
 */
@Path("v1/support/demandes")
@Produces("application/json")
@Consumes("application/json")
public class SupportDemandeRessource {

    @EJB
    private SupportService supportService;

    @GET
    public Response findAll(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        List<SupportDemande> data = supportService.findAll(start, limit);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, supportService.count())).build();
    }
}
