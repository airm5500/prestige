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

    /**
     * journal support du 26/11 (J26-7) : image du QR code d'un mode, servie a part de la liste. 404 sans image.
     */
    @GET
    @Path("/{id}/qrcode")
    @Produces("image/png")
    public Response qrCode(@PathParam("id") String id) {
        byte[] image = modeReglementService.qrCode(id);
        if (image == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        javax.ws.rs.core.CacheControl cache = new javax.ws.rs.core.CacheControl();
        cache.setPrivate(true);
        cache.setMaxAge(86400);
        return Response.ok(image, "image/png").cacheControl(cache).build();
    }

    /** Clients standards par defaut des modes mobile money (lot 3) — volet selection rapide de la vente. */
    @GET
    @Path("/clients-mobile-money")
    public Response clientsMobileMoney() {
        return Response.ok(modeReglementService.clientsMobileMoney().toString()).build();
    }

    /** Cree un mode de reglement : corps JSON {name, mobileMoney, clientRequis}. 201 si cree, 400 sinon (msg). */
    @POST
    public Response creer(String corps) {
        org.json.JSONObject entree = new org.json.JSONObject(corps == null || corps.isBlank() ? "{}" : corps);
        org.json.JSONObject resultat = modeReglementService.creer(entree.optString("name", ""),
                entree.optBoolean("mobileMoney", false), entree.optBoolean("clientRequis", false));
        return Response.status(resultat.optBoolean("success") ? Response.Status.CREATED : Response.Status.BAD_REQUEST)
                .entity(resultat.toString()).build();
    }

    /** Exigence de client d'un mode de reglement (point 12) : {requis} en parametre d'URL. */
    @POST
    @Path("/client-requis/{modeId}")
    public Response setClientRequis(@PathParam("modeId") String modeId, @QueryParam("requis") boolean requis) {
        return Response.ok(modeReglementService.setClientRequis(modeId, requis).toString()).build();
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
