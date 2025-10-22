package rest;

import rest.service.OfficineService;
import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;

@Path("v1/officine")
@Produces("application/json")
public class OfficineRessource {

    @Inject
    private OfficineService officineService;

    @GET
    public Response getAllOfficines() {
        try {
            return Response.ok(officineService.getAllOfficines()).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Erreur lors de la récupération des officines").build();
        }
    }

    @GET
    @Path("principal")
    public Response getOfficine() {

        return Response.ok(new JSONObject(officineService.getOfficine()).toString()).build();

    }
}
