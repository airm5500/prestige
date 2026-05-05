/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import java.util.Objects;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import rest.service.impl.FlagService;

/**
 *
 * @author koben
 */
@Path("v1/custom")
@Produces("application/json")
@Consumes("application/json")
public class CustomRessource {

    @EJB
    private FlagService flagService;

    @GET
    @Path("get-ca")
    @Produces("application/json")
    public Response getMontantCa(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {

        return Response.ok().entity(flagService.getMontantCa(dtStart, dtEnd).toString()).build();
    }

    @GET
    @Path("ponctionner")
    @Produces("application/json")
    public Response ponctionner(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "amount") Integer amount) {

        return Response.ok().entity(
                flagService.ponctionnerMontant(dtStart, dtEnd, Objects.requireNonNullElse(amount, 0)).toString())
                .build();
    }
}
