/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.TUser;
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
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.ListDesBonService;
import rest.service.dto.BonsParam;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v1/facture-subro")
@Produces("application/json")
@Consumes("application/json")
public class ListBonRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ListDesBonService listDesBonService;

    @GET
    @Path("list")
    public Response list(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "query") String query,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "hEnd") String hEnd,
            @QueryParam(value = "hStart") String hStart, @QueryParam(value = "tiersPayantId") String tiersPayantId)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = listDesBonService.listBons(BonsParam.builder().dtStart(dtStart).hStart(hStart).hEnd(hEnd)
                .tiersPayantId(tiersPayantId).all(false).start(start).search(query).limit(limit).dtEnd(dtEnd)
                .showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        return Response.ok().entity(jsono.toString()).build();
    }

}
