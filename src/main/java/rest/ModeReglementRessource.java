/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import javax.ejb.EJB;
import javax.servlet.annotation.MultipartConfig;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.ModeReglementService;

/**
 *
 * @author koben
 */
@Path("v1/modereglement")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@MultipartConfig
public class ModeReglementRessource {

    @EJB
    private ModeReglementService modeReglementService;

    /*
     * @POST
     *
     * @Path("qrcode/{id}")
     *
     * @Consumes(MediaType.MULTIPART_FORM_DATA) public Response uploadQrCode(@PathParam("id") String id, @Context
     * HttpServletRequest request) throws IOException, ServletException { modeReglementService.addQrCode(id,
     * request.getPart("file")); return Response.ok().build(); }
     */

    @GET
    @Path("/all")
    public Response fetchAll() {
        return Response.ok(modeReglementService.fetch().toString()).build();
    }

    /** Clients standards par defaut des modes mobile money (lot 3) — volet selection rapide de la vente. */
    @GET
    @Path("/clients-mobile-money")
    public Response clientsMobileMoney() {
        return Response.ok(modeReglementService.clientsMobileMoney().toString()).build();
    }

    /** Associe (ou retire si clientId vide) le client standard par defaut d'un mode de reglement. */
    @javax.ws.rs.POST
    @Path("/client-defaut/{modeId}")
    @Consumes(MediaType.WILDCARD)
    public Response setClientDefaut(@javax.ws.rs.PathParam("modeId") String modeId,
            @javax.ws.rs.QueryParam("clientId") String clientId) {
        return Response.ok(modeReglementService.setClientDefaut(modeId, clientId).toString()).build();
    }
}
