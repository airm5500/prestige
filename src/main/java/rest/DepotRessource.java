/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.HistoriqueImportationDTO;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MvtProduitService;
import rest.service.impl.ImportationVente;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/depot")
@Produces("application/json")
@Consumes("application/json")
public class DepotRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private MvtProduitService mvtProduitService;
    @EJB
    private ImportationVente importationVente;

    @PUT
    @Path("validerretourdepot/{id}")
    public Response validerRetourDepot(@PathParam("id") String id) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = mvtProduitService.validerRetourDepot(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("historiques")
    @Produces("application/json")
    public Response listeHistoriques(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        List<HistoriqueImportationDTO> data = importationVente.listHistoriqueImportation(LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd), null);
        JSONObject json = new JSONObject().put("total", data.size()).put("data", new JSONArray(data));
        return Response.ok().entity(json.toString()).build();
    }
}
