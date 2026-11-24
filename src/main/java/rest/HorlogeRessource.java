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
import rest.service.impl.HorlogeVeille;
import util.ContexteRequete;
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
    @EJB
    private HorlogeVeille veille;

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

    /**
     * Cahier du 24/11 : bandeau de la page de connexion, SANS session (liste blanche de AuthenticationFilter). Ne rend
     * que la date du serveur et l'état (OK, BLOQUE, REGULARISATION) : ni cause, ni écart, ni nom.
     */
    @GET
    @Path("public")
    public Response etatPublic() {
        return Response.ok(service.etatPublic().toString()).build();
    }

    private String utilisateur() {
        dal.TUser u = Droits.utilisateur(servletRequest);
        return u == null ? null : u.getLgUSERID();
    }

    /** Fenêtre de blocage affichée sur un poste (une fois par apparition) : tracée avec le poste et l'utilisateur. */
    @POST
    @Path("affichage")
    public Response affichage() {
        if (!connecte()) {
            return deconnecte();
        }
        HorlogeVeille.Instantane inst = veille.etatActuel();
        veille.tracer("FENETRE_AFFICHEE", inst.resultat, inst.resultat.estimationRetenueMs,
                ContexteRequete.poste(servletRequest), utilisateur(), null);
        return Response.ok(new JSONObject().put("success", true).toString()).build();
    }

    /**
     * Cahier du 24/11 : ouverture (ouvrir = 1) ou fermeture (ouvrir = 0) de la régularisation à date passée. Super
     * administrateur seulement ; tout autre profil est refusé (403) et le refus est tracé avec le poste et
     * l'utilisateur.
     */
    @POST
    @Path("regularisation/{ouvrir}")
    public Response regularisation(@javax.ws.rs.PathParam("ouvrir") String ouvrir) {
        if (!connecte()) {
            return deconnecte();
        }
        String poste = ContexteRequete.poste(servletRequest), qui = utilisateur();
        boolean o = "1".equals(ouvrir);
        if (!bll.userManagement.user.estSuperAdmin(Droits.utilisateur(servletRequest))) {
            veille.tracer("REGULARISATION_REFUSEE", null, null, poste, qui,
                    o ? "ouverture demandée sans le profil super administrateur"
                            : "fermeture demandée sans le profil super administrateur");
            return Droits.interdit("Régularisation à date passée (super administrateur)");
        }
        veille.regulariser(o, qui, poste);
        HorlogeVeille.Instantane apres = veille.etatActuel();
        return Response.ok(new JSONObject().put("success", true).put("regularisation", o)
                .put("bloque", apres.resultat.bloque).toString()).build();
    }

    @POST
    @Path("synchroniser")
    public Response synchroniser() {
        if (!connecte()) {
            return deconnecte();
        }
        String poste = ContexteRequete.poste(servletRequest), qui = utilisateur();
        HorlogeVeille.Instantane avant = veille.etatActuel();
        veille.tracer("MISE_A_JOUR_DEMANDEE", avant.resultat, avant.resultat.estimationRetenueMs, poste, qui, null);
        JSONObject r = service.synchroniser();
        HorlogeVeille.Instantane apres = veille.etatActuel();
        veille.tracer(r.optBoolean("success") ? "MISE_A_JOUR_FAITE" : "MISE_A_JOUR_REFUSEE", apres.resultat,
                apres.resultat.estimationRetenueMs, poste, qui, r.optString("msg", null));
        r.put("bloque", apres.resultat.bloque);
        return Response.ok(r.toString()).build();
    }
}
