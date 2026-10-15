package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.Collections;
import java.util.List;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import util.CommonUtils;
import util.Constant;

/**
 * Droits verifies PAR LE SERVEUR sur les routes d'ecriture (demandes des applications mobiles, lot 2 : « masquer un
 * menu n'est pas une securite »). Le droit demande est celui du menu de l'ecran : quiconque voit le menu garde la
 * fonction, un compte sans le menu est refuse, meme par une application ou un script.
 *
 * <p>
 * Reponses communes : session absente -> 401 ; droit manquant -> 403 {success:false, interdit:true, msg} (jamais 401 :
 * l'application deconnecterait l'utilisateur).
 */
public final class Droits {

    private Droits() {
    }

    public static TUser utilisateur(HttpServletRequest requete) {
        HttpSession hs = requete.getSession(false);
        return hs == null ? null : (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    public static List<TPrivilege> privileges(HttpServletRequest requete) {
        HttpSession hs = requete.getSession(false);
        Object l = hs == null ? null : hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        return l instanceof List ? (List<TPrivilege>) l : Collections.emptyList();
    }

    /** Vrai si la session porte au moins un de ces privileges. */
    public static boolean a(HttpServletRequest requete, String... privileges) {
        List<TPrivilege> l = privileges(requete);
        for (String p : privileges) {
            if (CommonUtils.hasAuthorityByName(l, p)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Refus a renvoyer tel quel, ou null si la session porte au moins un des privileges.
     *
     * @param libelle
     *            nom du droit, tel que l'utilisateur le voit (« Ajustement du stock »)
     */
    public static Response refus(HttpServletRequest requete, String libelle, String... privileges) {
        if (utilisateur(requete) == null) {
            return Response.status(Response.Status.UNAUTHORIZED).type("application/json")
                    .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString())
                    .build();
        }
        if (a(requete, privileges)) {
            return null;
        }
        return interdit(libelle);
    }

    public static Response interdit(String libelle) {
        return Response.status(Response.Status.FORBIDDEN).type("application/json").entity(new JSONObject()
                .put("success", false).put("interdit", true).put("msg", "Droit manquant : " + libelle).toString())
                .build();
    }
}
