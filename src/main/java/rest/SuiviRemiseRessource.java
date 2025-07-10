
package rest;

import bll.common.Parameter;
import commonTasks.dto.SalesStatsParams;
import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.time.LocalTime;
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
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.StatistiqueRemiseService;
import toolkits.parameters.commonparameter;
import util.DateConverter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/suivi-remise")
@Produces("application/json")
@Consumes("application/json")
public class SuiviRemiseRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private StatistiqueRemiseService statistiqueRemiseService;

    @GET
    @Path("ventes")
    public Response getAlls(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "tiersPayantId") String tiersPayantId) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
        boolean asAuthority = DateConverter.hasAuthorityByName(lstTPrivilege, commonparameter.str_SHOW_VENTE);
        boolean allActivitis = DateConverter.hasAuthorityByName(lstTPrivilege, Parameter.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(typeVenteId);
        body.setStatut(commonparameter.statut_is_Closed);
        body.setAll(false);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        body.setTiersPayantId(tiersPayantId);
        body.setDiscountStat(true);
        body.sethStart(LocalTime.of(0, 0, 0));
        body.sethEnd(LocalTime.of(23, 59));

        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }
        JSONObject jsono = statistiqueRemiseService.suiviRemise(body);
        return Response.ok().entity(jsono.toString()).build();
    }
}
