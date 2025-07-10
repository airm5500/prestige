package rest;

import bll.common.Parameter;
import java.io.IOException;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.EtatControlBonService;
import rest.service.dto.EtatControlBonEditDto;

/**
 *
 * @author koben
 */
@Path("v1/etat-control-bon")
@Produces("application/json")
@Consumes("application/json")
public class EtatControlBonResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EtatControlBonService etatControlBonService;
    @EJB
    private ExportExcelUtilService exportExcelUtilService;

    @GET
    @Path("list")
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search") String search, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        boolean returnFullBLLAuthority = Utils.hasAuthorityByName(Utils.getconnectedUserPrivileges(servletRequest),
                Parameter.ACTION_RETURN_FULL_BL);

        return Response.ok()
                .entity(etatControlBonService
                        .list(returnFullBLLAuthority, search, dtStart, dtEnd, grossisteId, start, limit).toString())
                .build();

    }

    @GET
    @Path("list-annuelle")
    public Response listAnnuelle(@QueryParam(value = "groupeId") Integer groupeId,
            @QueryParam(value = "groupBy") String groupBy, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        return Response.ok().entity(
                etatControlBonService.listBonAnnuelView(groupBy, dtStart, dtEnd, grossisteId, groupeId).toString())
                .build();

    }

    @GET
    @Path("etat-annuel")
    public Response etatLastThreeYears() {
        return Response.ok().entity(etatControlBonService.etatLastThreeYears().toString()).build();

    }

    @POST
    @Path("edit")
    public Response editBon(EtatControlBonEditDto bonEditDto) {
        return Response.ok().entity(etatControlBonService.updateBon(bonEditDto).toString()).build();

    }

    @GET
    @Path("export-annuel-excel")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportEtatAnnuelToExecel(@QueryParam(value = "groupeId") Integer groupeId,
            @QueryParam(value = "groupBy") String groupBy, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws IOException {

        return this.exportExcelUtilService.exportToExecel(
                etatControlBonService.generate(groupBy, dtStart, dtEnd, grossisteId, groupeId), "etat_control_annuel_");

    }

    @GET
    @Path("export-excel")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToExecel(@QueryParam(value = "search") String search,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws IOException {

        return this.exportExcelUtilService
                .exportToExecel(etatControlBonService.generate(search, dtStart, dtEnd, grossisteId), "etat_control_");

    }
}
