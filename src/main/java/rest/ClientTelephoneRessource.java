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
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.TelephoneClientModification;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Plan du 21/11, point 8.3 : corriger le numero d'un client depuis les listes de destinataires (Campagnes, Rappels).
 * Chaque appel verifie le droit {@code P_CLIENT_STANDARD_MAJ}, qui vaut ici pour tous les types de clients : cacher le
 * crayon ne suffit pas, un appel direct le contournerait.
 */
@Path("v1/client-telephone")
@Produces("application/json")
@Consumes("application/json")
public class ClientTelephoneRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private TelephoneClientModification modification;

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

    /** Les ecrans n'affichent le crayon qu'a qui a le droit. */
    @GET
    @Path("droit")
    public Response droit() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return reponse(new JSONObject().put("success", true).put("modifier", autorise()));
    }

    /** Corps : clientId, telephone, canal (SMS ou WHATSAPP), accordExplicite. */
    @POST
    public Response enregistrer(String corps) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return refus("Votre profil ne permet pas de modifier le numéro d'un client.");
        }
        JSONObject o;
        try {
            o = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
        } catch (org.json.JSONException e) {
            return refus("Demande illisible.");
        }
        return reponse(modification.enregistrer(o.optString("clientId", ""), o.optString("telephone", ""),
                o.optString("canal", "SMS"), o.optBoolean("accordExplicite", false)));
    }
}
