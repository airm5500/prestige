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
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
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

    /** Cree un mode de reglement : corps JSON {name, mobileMoney}. 201 si cree, 400 sinon (msg). */
    @POST
    public Response creer(String corps) {
        org.json.JSONObject entree = new org.json.JSONObject(corps == null || corps.isBlank() ? "{}" : corps);
        org.json.JSONObject resultat = modeReglementService.creer(entree.optString("name", ""),
                entree.optBoolean("mobileMoney", false));
        return Response.status(resultat.optBoolean("success") ? Response.Status.CREATED : Response.Status.BAD_REQUEST)
                .entity(resultat.toString()).build();
    }

    /**
     * Associe (ou retire si clientId vide) le client standard par defaut d'un mode de reglement. Parametres en URL,
     * sans corps : l'ecran envoie l'en-tete JSON comme pour toutes les ressources.
     */
    @POST
    @Path("/client-defaut/{modeId}")
    public Response setClientDefaut(@PathParam("modeId") String modeId, @QueryParam("clientId") String clientId) {
        return Response.ok(modeReglementService.setClientDefaut(modeId, clientId).toString()).build();
    }
}
