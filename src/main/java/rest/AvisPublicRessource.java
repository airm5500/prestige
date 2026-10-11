package rest;

import avisclients.Saisie;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.impl.AvisClientService;

/**
 * Page publique « Votre avis » (sans session). Seuls ces deux chemins sont ouverts sur le port public dedie (voir
 * filter.PortPublicAvisFilter). Le jeton du QR code est exige a chaque appel ; les saisies sont controlees et nettoyees
 * (avisclients.Saisie), le nombre d'avis par appareil est limite, rien du contenu n'est ecrit dans les journaux.
 */
@Path("v1/avis-public")
@Produces("application/json; charset=UTF-8")
public class AvisPublicRessource {

    private static final Logger LOG = Logger.getLogger(AvisPublicRessource.class.getName());
    /** Corps d'un avis : au-dela, ce n'est pas une saisie de la page. */
    static final int MAX_CORPS = 8000;
    private static final String LIEN_INVALIDE = "Ce QR code n'est plus valide. Demandez le nouveau QR code à la pharmacie.";

    @Inject
    private HttpServletRequest requete;
    @EJB
    private AvisClientService service;

    private static Response json(int statut, JSONObject j) {
        return Response.status(statut).entity(j.toString()).header("Cache-Control", "no-store").build();
    }

    private static JSONObject echec(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }

    @GET
    @Path("contexte")
    public Response contexte(@QueryParam("t") String jeton) {
        if (!service.jetonValide(jeton)) {
            return json(403, echec(LIEN_INVALIDE));
        }
        if (!service.actif()) {
            return json(200, echec("La pharmacie ne reçoit pas d'avis pour le moment. Merci de votre visite."));
        }
        String[] p = service.pharmacie();
        return json(200, new JSONObject().put("success", true).put("pharmacie", p[0]).put("adresse", p[1]));
    }

    @POST
    @Path("envoyer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response envoyer(String corps) {
        if (corps == null || corps.length() > MAX_CORPS) {
            return json(413, echec("Avis trop long."));
        }
        JSONObject j;
        try {
            j = new JSONObject(corps);
        } catch (JSONException e) {
            return json(400, echec("Envoi illisible. Réessayez."));
        }
        if (!service.jetonValide(j.optString("jeton", null))) {
            return json(403, echec(LIEN_INVALIDE));
        }
        if (!service.actif()) {
            return json(200, echec("La pharmacie ne reçoit pas d'avis pour le moment."));
        }
        Saisie s;
        try {
            s = Saisie.lire(j);
        } catch (IllegalArgumentException e) {
            return json(400, echec(e.getMessage()));
        }
        String empreinte = service.empreinte(requete.getRemoteAddr());
        if (!service.accepterEnvoi(empreinte)) {
            return json(429, echec("Vous avez déjà envoyé plusieurs avis. Merci, réessayez plus tard."));
        }
        if (s.robot) {
            /* reponse identique a un envoi reussi : le robot n'apprend rien */
            return json(200, new JSONObject().put("success", true));
        }
        try {
            service.enregistrer(s, empreinte);
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Avis client non enregistre : {0}", e.getClass().getSimpleName());
            return json(500, echec("L'avis n'a pas pu être enregistré. Réessayez dans un instant."));
        }
        return json(200, new JSONObject().put("success", true));
    }
}
