package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.BfrService;
import util.CommonUtils;
import util.Constant;

/**
 * Plan du 19/11 : menu « BFR » (ANALYSE DE GESTION). Lecture seule, reservee au droit du menu ; la carte du tableau de
 * bord lit le meme service (TableauBordRessource, route « bfr »).
 */
@Path("v1/bfr")
@Produces("application/json")
public class BfrRessource {

    public static final String P_MENU = "P_SM_BFR";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private BfrService service;

    /** Utilisateur connecte et droit du menu : null si tout va bien, sinon la reponse a rendre. */
    @SuppressWarnings("unchecked")
    static JSONObject refus(HttpServletRequest requete) {
        HttpSession s = requete.getSession(false);
        TUser u = s == null ? null : (TUser) s.getAttribute(Constant.AIRTIME_USER);
        if (u == null) {
            return new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE);
        }
        if (!CommonUtils.hasAuthorityByName((List<TPrivilege>) s.getAttribute(Constant.USER_LIST_PRIVILEGE), P_MENU)) {
            return new JSONObject().put("success", false).put("interdit", true).put("msg",
                    "Vous n'avez pas le droit de consulter le BFR.");
        }
        return null;
    }

    static String emplacement(HttpServletRequest requete) {
        TUser u = (TUser) requete.getSession(false).getAttribute(Constant.AIRTIME_USER);
        return u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    @GET
    public Response bfr() {
        JSONObject r = refus(servletRequest);
        if (r != null) {
            return Response.ok(r.toString()).build();
        }
        return Response.ok(service.calculer(emplacement(servletRequest)).toString()).build();
    }
}
