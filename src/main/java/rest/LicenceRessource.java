package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import dal.Licence;
import rest.service.LicenceService;
import rest.service.SessionHelperService;
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
    @EJB
    private SessionHelperService sessionHelperService;

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
        Licence licence = licenceService.getLicence();
        if (licence == null || sessionHelperService.getCurrentUser() != null) {
            return Response.ok().entity(licence).build();
        }
        // Route publique (applications mobiles avant connexion) : dates et type seulement, la cle est masquee.
        return Response.ok().entity(masquee(licence)).build();
    }

    static Licence masquee(Licence licence) {
        Licence copie = new Licence();
        String cle = licence.getId();
        copie.setId(cle == null || cle.length() <= 4 ? "****" : "****" + cle.substring(cle.length() - 4));
        copie.setDateStart(licence.getDateStart());
        copie.setDateEnd(licence.getDateEnd());
        copie.setTypeLicence(licence.getTypeLicence());
        return copie;
    }

}
