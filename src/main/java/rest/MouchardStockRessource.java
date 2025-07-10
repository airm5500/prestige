/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import rest.service.MouchardStockService;

/**
 *
 * @author Hermann N'ZI
 */

@Path("v1/lot")
@Produces("application/json")
@Consumes("application/json")
public class MouchardStockRessource {

    @EJB
    private MouchardStockService MouchardStockService;

    @GET
    @Path("mouchard")
    // methode avec parametre
    public Response getMouchardStock(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {

        return Response.ok().entity(MouchardStockService.getMouchardStock(dtStart, dtEnd, limit, start).toString())
                .build();
    }

}
