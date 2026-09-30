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
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.ClientStandardModification;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Modifier la fiche d'un client STANDARD depuis l'ecran de vente (retour du 30/09). Chaque appel verifie le droit
 * {@code P_CLIENT_STANDARD_MAJ} : cacher le bouton ne suffit pas, un appel direct le contournerait.
 */
@Path("v1/vente-client-standard")
@Produces("application/json")
@Consumes("application/json")
public class VenteClientStandardRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private ClientStandardModification modification;

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

    /** L'ecran de vente n'affiche le bouton qu'a qui a le droit. */
    @GET
    @Path("droit")
    public Response droit() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return reponse(new JSONObject().put("success", true).put("modifier", autorise()));
    }

    @GET
    @Path("{clientId}")
    public Response lire(@PathParam("clientId") String clientId) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return refus("Votre profil ne permet pas de modifier un client depuis la caisse.");
        }
        return reponse(modification.lire(clientId));
    }

    @POST
    @Path("{clientId}")
    public Response enregistrer(@PathParam("clientId") String clientId, @QueryParam("venteId") String venteId,
            String corps) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return refus("Votre profil ne permet pas de modifier un client depuis la caisse.");
        }
        JSONObject saisie;
        try {
            saisie = new JSONObject(corps == null ? "{}" : corps);
        } catch (Exception e) {
            return refus("Saisie illisible.");
        }
        return reponse(modification.enregistrer(clientId, saisie, venteId));
    }
}
