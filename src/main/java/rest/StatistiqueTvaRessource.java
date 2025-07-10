package rest;

import commonTasks.dto.Params;
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
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.BalanceService;
import toolkits.parameters.commonparameter;
import rest.service.TvaDataService;
import rest.service.dto.BalanceParamsDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v3")
@Produces("application/json")
@Consumes("application/json")
public class StatistiqueTvaRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private TvaDataService dataService;
    @EJB
    private BalanceService balanceService;

    @GET
    @Path("tvas/criterion")
    public Response tvastatCriterion(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json;
        if (!this.balanceService.useLastUpdateStats()) {
            Params params = new Params();
            params.setDtEnd(dtEnd);
            params.setDtStart(dtStart);
            params.setOperateur(tu);
            json = dataService.statistiqueTvaViewSomeCriteria(params);
        } else {
            json = this.balanceService.statistiqueTvaView(BalanceParamsDTO.builder().dtEnd(dtEnd).dtStart(dtStart)
                    .emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        }

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("tvas")
    public Response tvastat(@QueryParam(value = "typeVente") String typeVente,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (this.balanceService.useLastUpdateStats()) {
            boolean isTvaVNO = StringUtils.isNotBlank(typeVente) && !typeVente.equalsIgnoreCase("TOUT");

            return Response.ok()
                    .entity(this.balanceService
                            .statistiqueTvaView(
                                    BalanceParamsDTO.builder().dtEnd(dtEnd).dtStart(dtStart).vnoOnly(isTvaVNO)
                                            .emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build())
                            .toString())
                    .build();
        }
        Params params = new Params();
        params.setDtEnd(dtEnd);
        params.setDtStart(dtStart);
        params.setOperateur(tu);
        JSONObject json;
        if (StringUtils.isNotBlank(typeVente) && !typeVente.equalsIgnoreCase("TOUT")) {
            json = dataService.statistiqueTvaVnoOnlyView(params);
        } else {
            json = dataService.statistiqueTvaView(params);
        }

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("tvamobile")
    public Response tvastats(@QueryParam(value = "typeVente") String typeVente,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws JSONException {
        String TEmplacement = Constant.EMPLACEMENT;
        if (this.balanceService.useLastUpdateStats()) {
            boolean isTvaVNO = StringUtils.isNotBlank(typeVente) && !typeVente.equalsIgnoreCase("TOUT");

            return Response.ok()
                    .entity(this.balanceService.statistiqueTvaView(BalanceParamsDTO.builder().dtEnd(dtEnd)
                            .dtStart(dtStart).vnoOnly(isTvaVNO).emplacementId(TEmplacement).build()).toString())
                    .build();
        }
        Params params = new Params();
        params.setDtEnd(dtEnd);
        params.setDtStart(dtStart);
        JSONObject json;
        if (StringUtils.isNotBlank(typeVente) && !typeVente.equalsIgnoreCase("TOUT")) {
            json = dataService.statistiqueTvaVnoOnlyView(params);
        } else {
            json = dataService.statistiqueTvaView(params);
        }

        return Response.ok().entity(json.toString()).build();
    }

}
