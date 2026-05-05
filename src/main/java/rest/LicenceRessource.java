package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.service.LicenceService;
import rest.service.dto.LicenceDTO;

/**
 *
 * @author koben
 */
@Path("v1/licence")
@Produces("application/json")
@Consumes("application/json")
public class LicenceRessource {

    @EJB
    private LicenceService licenceService;

    @POST
    @Path("generate")
    public Response generate(LicenceDTO licence) {
        return Response.ok(licenceService.generateLicence(licence)).build();
    }

    @GET
    @Path("save/{licence}")
    public Response save(@PathParam("licence") String licence) {
        licenceService.save(licence);
        return Response.ok().build();
    }

    @GET
    @Path("find")
    public Response getOne() {
        return Response.ok().entity(licenceService.getLicence()).build();
    }

}
