package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.SupportEventService;
import rest.service.impl.sauvegarde.SauvegardeService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * SAUVEGARDES DE LA BASE (retour du 01/11), Centre de support > Stabilite du serveur > Sauvegardes. Droit
 * P_SM_SUPPORT_SERVEUR.
 * <ul>
 * <li>GET etat : reglages, outil, espace libre, sauvegarde en cours, historique ;</li>
 * <li>POST maintenant : lance une sauvegarde en arriere-plan ;</li>
 * <li>POST reglages : dossier, copie, sauvegarde automatique, conservation.</li>
 * </ul>
 * Aucun acces a la base (utilisateur, mot de passe) n'est renvoye.
 */
@Path("v1/support/sauvegardes")
@Produces("application/json")
@Consumes("application/json")
public class SupportSauvegardeRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SauvegardeService sauvegardeService;
    @EJB
    private SupportEventService supportEventService;

    @SuppressWarnings("unchecked")
    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        if (s == null || !(s.getAttribute(commonparameter.AIRTIME_USER) instanceof TUser)) {
            return null;
        }
        if (!CommonUtils.hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                SupportServeurRessource.DROIT)) {
            return null;
        }
        return (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response refus() {
        HttpSession s = servletRequest.getSession(false);
        return echec(s == null || !(s.getAttribute(commonparameter.AIRTIME_USER) instanceof TUser)
                ? Constant.DECONNECTED_MESSAGE : "Votre profil ne donne pas accès aux sauvegardes.");
    }

    private static Response echec(String m) {
        return Response.ok(new JSONObject().put("success", false).put("message", m).toString()).build();
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.put("success", true).toString()).build();
    }

    @GET
    @Path("etat")
    public Response etat() {
        if (utilisateur() == null) {
            return refus();
        }
        return ok(sauvegardeService.etat());
    }

    @POST
    @Path("maintenant")
    public Response maintenant() {
        TUser u = utilisateur();
        if (u == null) {
            return refus();
        }
        String refus = sauvegardeService.lancer("MANUELLE");
        if (refus != null) {
            return echec(refus);
        }
        supportEventService.recordMaintenance("SAUVEGARDE_MANUELLE", "Sauvegarde de la base lancée depuis l'écran",
                u.getStrLOGIN());
        return ok(new JSONObject().put("message", "Sauvegarde lancée."));
    }

    @POST
    @Path("reglages")
    public Response reglages(String corps) {
        TUser u = utilisateur();
        if (u == null) {
            return refus();
        }
        JSONObject c;
        try {
            c = new JSONObject(corps == null || corps.isEmpty() ? "{}" : corps);
        } catch (Exception e) {
            return echec("Réglages illisibles.");
        }
        String erreur = sauvegardeService.enregistrer(c.optString("dossier", null), c.optString("copie", ""),
                c.has("active") ? c.optBoolean("active", true) : null,
                c.has("garderHeures") ? c.optInt("garderHeures", -1) : null,
                c.has("garderJours") ? c.optInt("garderJours", -1) : null);
        if (erreur != null) {
            return echec(erreur);
        }
        supportEventService.recordMaintenance("SAUVEGARDE_REGLAGES", "Réglages des sauvegardes enregistrés",
                u.getStrLOGIN());
        return ok(new JSONObject().put("message", "Réglages enregistrés."));
    }
}
