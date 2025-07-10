package rest;

import java.util.List;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.PrixReferenceService;
import rest.service.dto.PrixReferenceDTO;

/**
 *
 * @author koben
 */
@Path("v1/prix-reference")
@Produces("application/json")
@Consumes("application/json")
public class PrixReferenceRessource {

    @EJB
    private PrixReferenceService prixReferenceService;

    @POST
    public Response add(PrixReferenceDTO prixReference) {
        prixReferenceService.add(prixReference);
        return Response.ok().build();
    }

    @PUT
    public Response update(PrixReferenceDTO prixReference) {
        prixReferenceService.update(prixReference);
        return Response.ok().build();
    }

    @GET
    @Path("{id}")
    public Response getByProduitId(@PathParam("id") String produitId) {
        JSONObject json = new JSONObject();
        List<PrixReferenceDTO> list = prixReferenceService.getByProduitId(produitId);
        json.put("data", new JSONArray(list)).put("total", list.size());
        return Response.ok(json.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("id") String prixId) {
        prixReferenceService.delete(prixId);
        return Response.ok().build();
    }
}
