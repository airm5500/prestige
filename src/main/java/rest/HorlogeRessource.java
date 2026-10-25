package rest;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.HorlogeService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * DATE ET HEURE DU SERVEUR (retours du 25/10, point 2) : etat (GET), lu par le rappel de chaque poste toutes les 5
 * minutes, et synchronisation (POST, bouton « Mettre a jour » du rappel). Tout utilisateur connecte.
 */
@Path("v1/horloge")
@Produces("application/json")
public class HorlogeRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private HorlogeService service;

    private boolean connecte() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && s.getAttribute(commonparameter.AIRTIME_USER) != null;
    }

    private static Response deconnecte() {
        return Response.ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    @GET
    @Path("etat")
    public Response etat() {
        if (!connecte()) {
            return deconnecte();
        }
        return Response.ok(service.etat().toString()).build();
    }

    @POST
    @Path("synchroniser")
    public Response synchroniser() {
        if (!connecte()) {
            return deconnecte();
        }
        return Response.ok(service.synchroniser().toString()).build();
    }
}
