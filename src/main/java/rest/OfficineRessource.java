package rest;

import rest.service.dto.OfficineDTO;
import rest.service.OfficineService;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.List;

@Path("v1/officine")
public class OfficineRessource {

    @Inject
    private OfficineService officineService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllOfficines() {
        try {
            return Response.ok(officineService.getAllOfficines()).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Erreur lors de la récupération des officines").build();
        }
    }
}