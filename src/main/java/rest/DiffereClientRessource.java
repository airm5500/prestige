package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.DiffereClientCorrection;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Correction du nom du client d'un differe (besoins du 11/10, point 3). Chaque appel verifie le droit
 * {@code P_CLIENT_STANDARD_MAJ} (celui de la modification du client depuis la caisse).
 */
@Path("v1/differe-client")
@Produces("application/json")
@Consumes("application/json")
public class DiffereClientRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private DiffereClientCorrection correction;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                DateConverter.P_CLIENT_STANDARD_MAJ);
    }

    private static Response reponse(JSONObject o) {
        return Response.ok().entity(o.toString()).build();
    }

    private static Response refus(String message) {
        return reponse(new JSONObject().put("success", false).put("message", message));
    }

    @GET
    @Path("{clientId}")
    public Response lire(@PathParam("clientId") String clientId) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return reponse(correction.lire(clientId).put("modifier", autorise()));
    }

    @POST
    @Path("{clientId}")
    public Response corriger(@PathParam("clientId") String clientId, String corps) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return refus("Votre profil ne permet pas de corriger le nom d'un client.");
        }
        JSONObject saisie;
        try {
            saisie = new JSONObject(corps == null ? "{}" : corps);
        } catch (Exception e) {
            return refus("Saisie illisible.");
        }
        return reponse(correction.corriger(clientId, saisie));
    }
}
