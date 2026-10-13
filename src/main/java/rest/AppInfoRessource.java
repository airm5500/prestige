package rest;

import dal.TUser;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import util.Constant;

/**
 * Informations de la page de connexion (13/10 : la page n'est plus une JSP). Sans connexion : nom et version de
 * l'application, et si le poste est deja connecte (la page renvoie alors a l'accueil). Rien d'autre.
 */
@Path("v1/app")
@Produces("application/json; charset=UTF-8")
public class AppInfoRessource {

    @Inject
    private HttpServletRequest requete;

    @GET
    @Path("info")
    public Response info() {
        String nom = "Prestige";
        String version = "";
        try {
            toolkits.utils.jdom.InitRessource();
            toolkits.utils.jdom.LoadRessource();
            if (toolkits.utils.jdom.APP_NAME != null && !toolkits.utils.jdom.APP_NAME.trim().isEmpty()) {
                nom = toolkits.utils.jdom.APP_NAME.trim();
            }
            version = toolkits.utils.jdom.APP_VERSION == null ? "" : toolkits.utils.jdom.APP_VERSION.trim();
        } catch (RuntimeException e) {
            // ressources illisibles : la page garde « Prestige » sans version
        }
        HttpSession s = requete.getSession(false);
        boolean connecte = s != null && s.getAttribute(Constant.AIRTIME_USER) instanceof TUser;
        return Response
                .ok(new JSONObject().put("nom", nom).put("version", version).put("connecte", connecte).toString())
                .header("Cache-Control", "no-store").build();
    }
}
