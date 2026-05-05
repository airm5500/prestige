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
import org.json.JSONObject;
import rest.service.EvaluationVenteService;
import rest.service.dto.EvaluationVenteFiltre;
import util.Constant;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.json.JSONException;

/**
 *
 * @author koben
 */
@Path("v1/evaluation-vente")
@Produces("application/json")
@Consumes("application/json")
public class EvaluationVenteRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EvaluationVenteService evaluationVenteService;

    @GET
    @Path("/data")
    public Response getData(@QueryParam(value = "familleId") String familleId,
            @QueryParam(value = "emplacementId") String emplacementId, @QueryParam(value = "filtre") String filtre,
            @QueryParam(value = "filtreValue") Float filtreValue, @QueryParam(value = "query") String query,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setQuery(query);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(filtreValue);
        evaluationVenteFiltre.setStart(start);
        evaluationVenteFiltre.setLimit(limit);
        JSONObject json = evaluationVenteService.fetchEvaluationVentes(evaluationVenteFiltre);

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/produit")
    public Response getDatas(@QueryParam(value = "familleId") String familleId,
            @QueryParam(value = "emplacementId") String emplacementId, @QueryParam(value = "filtre") String filtre,
            @QueryParam(value = "filtreValue") Float filtreValue, @QueryParam(value = "query") String query,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setQuery(query);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(filtreValue);
        evaluationVenteFiltre.setStart(start);
        evaluationVenteFiltre.setLimit(limit);
        JSONObject json = evaluationVenteService.fetchEvaluationVentes(evaluationVenteFiltre);

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/suggerer")
    public Response suggerer(@QueryParam(value = "familleId") String familleId,
            @QueryParam(value = "emplacementId") String emplacementId, @QueryParam(value = "filtre") String filtre,
            @QueryParam(value = "filtreValue") Float filtreValue, @QueryParam(value = "query") String query,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(filtreValue);
        evaluationVenteFiltre.setStart(start);
        evaluationVenteFiltre.setLimit(limit);
        JSONObject json = evaluationVenteService.makeSuggestion(evaluationVenteFiltre);

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/csv")
    @Produces("text/csv")
    public Response exportCsv(@QueryParam(value = "familleId") String familleId,
            @QueryParam(value = "emplacementId") String emplacementId, @QueryParam(value = "filtre") String filtre,
            @QueryParam(value = "filtreValue") Float filtreValue, @QueryParam(value = "query") String query)
            throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setQuery(query);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(filtreValue);

        byte[] data = evaluationVenteService.exportEvaluationVentesCsv(evaluationVenteFiltre);

        String filename = "evaluation-vente_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".csv";

        return Response.ok(data, "text/csv; charset=UTF-8").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam(value = "familleId") String familleId,
            @QueryParam(value = "emplacementId") String emplacementId, @QueryParam(value = "filtre") String filtre,
            @QueryParam(value = "filtreValue") Float filtreValue, @QueryParam(value = "query") String query)
            throws IOException, JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setQuery(query);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(filtreValue);

        byte[] data = evaluationVenteService.exportEvaluationVentesExcel(evaluationVenteFiltre);

        String filename = "evaluation-vente_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm_ss")) + ".xls";

        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename=" + filename).build();
    }

    @GET
    @Path("/create-inventaire")
    public Response createInventaire(@QueryParam(value = "familleId") String familleId,
            @QueryParam(value = "emplacementId") String emplacementId, @QueryParam(value = "filtre") String filtre,
            @QueryParam(value = "filtreValue") Float filtreValue, @QueryParam(value = "query") String query)
            throws JSONException {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        EvaluationVenteFiltre evaluationVenteFiltre = new EvaluationVenteFiltre();
        evaluationVenteFiltre.setEmplacementId(emplacementId);
        evaluationVenteFiltre.setFamilleId(familleId);
        evaluationVenteFiltre.setQuery(query);
        evaluationVenteFiltre.setFiltre(filtre);
        evaluationVenteFiltre.setFiltreValue(filtreValue);

        JSONObject json = evaluationVenteService.createInventaire(evaluationVenteFiltre);

        return Response.ok().entity(json.toString()).build();
    }

}
