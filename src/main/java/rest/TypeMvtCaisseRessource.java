/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import bll.Util;
import dal.TPrivilege;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import rest.service.TiersPayantService;
import rest.service.TypeMvtCaisseService;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Path("v1/typeMvtCaisse")
@Produces("application/json")
@Consumes("application/json")
public class TypeMvtCaisseRessource {

    @EJB
    private TypeMvtCaisseService typeMvtCaisseService;

    @GET
    @Path("list")
    @Produces("application/json")
    public Response fetchList(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query) {

        return Response.ok().entity(typeMvtCaisseService.fetchList(start, limit, query).toString()).build();
    }
}
