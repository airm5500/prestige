package rest;

import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.MobileService;
import rest.service.dto.CodePointageAffichageDTO;

/**
 * Demande du 16/10 : QR de pointage mobile affiche par le bouton « Pointage » de la page de connexion, sans connexion,
 * sur les postes de l'officine seulement.
 */
@Path("v1/pointage-affichage")
@Produces(MediaType.APPLICATION_JSON)
public class PointageAffichageRessource {

    @EJB
    private MobileService mobile;
    @Context
    private HttpServletRequest requete;

    @GET
    public Response code() {
        CodePointageAffichageDTO d = mobile.codePointageAffichage(requete.getRemoteAddr());
        return Response.status(d.isSuccess() ? 200 : 403).entity(d).header("Cache-Control", "no-store").build();
    }
}
