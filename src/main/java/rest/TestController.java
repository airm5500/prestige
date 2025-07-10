/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.Params;
import commonTasks.dto.TvaDTO;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import rest.service.MouvementProduitService;
import rest.service.SalesStatsService;
import rest.service.impl.CommonCorrection;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/test")
@Produces("application/json")
@Consumes("application/json")
public class TestController {

    @EJB
    private SalesStatsService salesStatsService;
    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private MouvementProduitService mouvementProduitService;
    @EJB
    CommonCorrection commonCorrection;

    @GET
    @Path("tva")
    public Response tvastat(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "typeVente") String typeVente) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        Params params = new Params();
        params.setDtEnd("2021-10-01");
        params.setDtStart("2020-08-01");
        params.setOperateur(tu);
        params.setRef(typeVente);
        List<TvaDTO> l = salesStatsService.tvasRapport2(params);
        return Response.ok().entity(l).build();
    }

    @GET
    @Path("correction-marie/produit")
    public Response updateFamille() throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int result = commonCorrection.updateFamille();
        return Response.ok(result).build();
    }

    @GET
    @Path("correction-marie/tva-vente")
    public Response updateVente() throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int result = commonCorrection.updateVente();
        return Response.ok(result).build();
    }
}
