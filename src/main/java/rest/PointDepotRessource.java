
package rest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.PointDepotService;

/**
 *
 * @author airman
 */
@Path("v1/pointdepot")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PointDepotRessource {

    @EJB
    private PointDepotService pointDepotService;

    @GET
    public Response getPointDepot(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("emplacementId") String emplacementId) {

        JSONObject json = pointDepotService.getPointDepot(dtStart, dtEnd, emplacementId);
        return Response.ok(json.toString()).build();
    }

    @GET
    @Path("/print")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response printPointDepot(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("emplacementId") String emplacementId) {

        try {
            byte[] data = pointDepotService.generatePointCaisseReport(dtStart, dtEnd, emplacementId);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "point_caisse_" + timestamp + ".pdf";

            return Response.ok(data, MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"").build();
        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
        }
    }
}