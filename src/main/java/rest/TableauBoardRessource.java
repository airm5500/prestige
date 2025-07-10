package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.BalanceService;
import rest.service.dto.BalanceParamsDTO;

import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/tableau-board")
@Produces("application/json")
@Consumes("application/json")
public class TableauBoardRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private BalanceService balanceService;

    @GET
    @Path("/carnet")
    public Response getTableauCarnet(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd,
            @DefaultValue("false") @QueryParam(value = "monthly") boolean monthly) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = this.balanceService
                .tableauBoardDatas(BalanceParamsDTO.builder().dtStart(dtStart).dtEnd(dtEnd).byMonth(monthly)
                        .showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/tableau")
    public Response getTableau(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @DefaultValue("false") @QueryParam(value = "monthly") boolean monthly) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        JSONObject json = this.balanceService
                .tableauBoardDatas(BalanceParamsDTO.builder().dtStart(dtStart).dtEnd(dtEnd).byMonth(monthly)
                        .showAllAmount(false).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());

        return Response.ok().entity(json.toString()).build();
    }
}
