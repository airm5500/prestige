package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.AnomalieService;
import rest.service.dto.AnomalieDTO;
import util.Constant;

/**
 * Anomalies par employe (retour du 24/10) : le navigateur envoie ici, a chaque refus affiche a l'employe ou erreur du
 * logiciel, l'anomalie et le fil de ses dernieres actions. L'employe est celui de la session, jamais celui du corps.
 */
@Path("v1/anomalies")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AnomalieRessource {

    @EJB
    private AnomalieService service;
    @Context
    private HttpServletRequest servletRequest;

    @POST
    public Response enregistrer(AnomalieDTO anomalie) {
        HttpSession s = servletRequest.getSession(false);
        TUser u = s == null ? null : (TUser) s.getAttribute(Constant.AIRTIME_USER);
        if (u == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        boolean fait = service.enregistrer(u.getLgUSERID(), util.PosteClient.infoPoste(servletRequest), anomalie);
        return Response.ok().entity(fait ? ResultFactory.getSuccessResultMsg() : ResultFactory.getFailResult("Ignorée"))
                .build();
    }
}
