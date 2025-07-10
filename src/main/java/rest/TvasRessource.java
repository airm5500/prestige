
package rest;

import commonTasks.dto.TvaDTO;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import rest.service.TvaService;

/**
 *
 * @author koben
 */
@Path("v2/tva")
@Produces("application/json")
@Consumes("application/json")
public class TvasRessource {

    @EJB
    private TvaService tvaService;

    @GET
    @Path("list")
    public Response tvastat(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "typeVente") String typeVente) throws JSONException {

        List<TvaDTO> json = tvaService.tva(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), false, null);
        return Response.ok().entity(json).build();
    }
}
