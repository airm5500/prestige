package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Response;
import rest.service.ParametreService;

/**
 *
 * @author koben
 */
@Path("v1/app-params")
@Produces("application/json")
@Consumes("application/json")
public class ParametreRessource {

    @EJB
    private ParametreService parametreService;

    @GET
    @Path("key/{key}")
    public Response isEnable(@PathParam("key") String key) {
        boolean isEnable = parametreService.isEnable(key);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(isEnable, 1)).build();
    }

    @GET
    @Path("check/{key}")
    public Response chekIsEnable(@PathParam("key") String key) {
        boolean isEnable = parametreService.chekIsEnable(key);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(isEnable, 1)).build();
    }

    /** Valeur brute d'un parametre (str_VALUE), vide si absent. */
    @GET
    @Path("value/{key}")
    public Response value(@PathParam("key") String key) {
        String value = parametreService.getValue(key, "");
        return Response.ok().entity(ResultFactory.getSuccessResult(value, 1)).build();
    }

}
