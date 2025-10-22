
package rest;

import java.util.List;
import java.util.Map;
import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.AnalyseInvService;
import rest.service.dto.AnalyseInvDTO;

/**
 *
 * @author airman
 */
@Path("v1")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AnalyseInvRessource {

    @Inject
    private AnalyseInvService analyseInvService;

    @GET
    @Path("analyse-inventaire")
    public Response getAnalyse(@QueryParam("inventaireId") String inventaireId) {
        if (inventaireId == null || inventaireId.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("inventaireId requis.").build();
        }

        try {
            List<AnalyseInvDTO> data = analyseInvService.analyseInventaire(inventaireId);
            return Response.ok().entity(data).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Une erreur est survenue.").build();
        }
    }

    @GET
    @Path("analyse-avancee")
    public Response getAnalyseAvancee(@QueryParam("inventaireId") String inventaireId) {
        if (inventaireId == null || inventaireId.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("inventaireId requis.").build();
        }

        try {
            Map<String, Object> data = analyseInvService.getAnalyseAvanceeData(inventaireId);
            return Response.ok().entity(data).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Une erreur est survenue.").build();
        }
    }

}
