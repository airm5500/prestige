package rest;

import dal.TUser;
import java.time.LocalDate;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.OrderService;
import rest.service.PharmaMlService;
import rest.service.SuggestionService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * COMMANDER UNE SUGGESTION PAR PHARMAML depuis la liste des suggestions (plan d'octobre 1.5, decision Q-C).
 *
 * <ol>
 * <li>GET {id} : ce que la confirmation affiche (grossiste, lignes, valeur, version) ;</li>
 * <li>POST {id} : commande creee par le service existant, la suggestion etant CONSERVEE ; envoi par le service PharmaML
 * existant ; si l'envoi aboutit, la suggestion passe « Commandée » (mode PHARMAML, commande liee).</li>
 * </ol>
 * Si l'envoi echoue, la commande reste dans les commandes en cours et un nouvel essai la reprend (pas de doublon). Le
 * bouton « Commander » historique (qui supprime la suggestion) n'est pas modifie.
 */
@Path("v1/suggestion-pharmaml")
@Produces(MediaType.APPLICATION_JSON)
public class SuggestionPharmaMlRessource {

    private static final Logger LOG = Logger.getLogger(SuggestionPharmaMlRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private rest.service.mobile.MobileClientRefService mobileClientRefService;

    @EJB
    private SuggestionService suggestionService;

    @EJB
    private OrderService orderService;

    @EJB
    private PharmaMlService pharmaMlService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    @GET
    @Path("{id}")
    public Response apercu(@PathParam("id") String id) {
        Response refusDroit = Droits.refus(servletRequest, "Commandes et suggestions", "P_SM_SUGGERER_CDE",
                "P_SM_SUGGESTION", "P_SM_SUGG_REAPPRO", "P_M_COMMANDE", "P_SM_COMMANDE_PROCESS");
        if (refusDroit != null) {
            return refusDroit;
        }
        if (utilisateur() == null) {
            return json(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE));
        }
        return json(suggestionService.apercuCommandePharmaMl(id));
    }

    @javax.annotation.Resource(name = "concurrent/__defaultManagedExecutorService")
    private javax.enterprise.concurrent.ManagedExecutorService executeur;

    /**
     * Retours du 10/10 : commande de la suggestion en arriere-plan (l'ecran n'attend plus la reponse du grossiste) ; le
     * jeton se suit par GET v1/pharma/envoi/{jeton}. Une suggestion deja en cours d'envoi n'est pas renvoyee.
     */
    @POST
    @Path("{id}/envoi")
    public Response commanderArrierePlan(@PathParam("id") String id,
            @javax.ws.rs.HeaderParam("X-Client-Ref") String clientRef) {
        TUser u = utilisateur();
        if (u == null) {
            return json(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE));
        }
        // demandes des applications mobiles (2) : engagement financier -> droit des commandes verifie ici
        Response refusDroit = Droits.refus(servletRequest, "Commandes et suggestions", "P_SM_SUGGERER_CDE",
                "P_SM_SUGGESTION", "P_SM_SUGG_REAPPRO", "P_M_COMMANDE", "P_SM_COMMANDE_PROCESS");
        if (refusDroit != null) {
            return refusDroit;
        }
        // meme X-Client-Ref : meme jeton, rien de relance
        return Response
                .ok(mobileClientRefService
                        .uneFois(clientRef, rest.service.mobile.MobileClientRefService.TYPE_ENVOI_PHARMAML,
                                () -> new JSONObject().put("success", true).put("jeton",
                                        rest.service.impl.EnvoisPharmaMlEnCours.lancer("suggestion:" + id, executeur,
                                                () -> commanderMaintenant(id, u))),
                                r -> r.optString("jeton", null)))
                .build();
    }

    @POST
    @Path("{id}")
    public Response commander(@PathParam("id") String id) {
        Response refusDroit = Droits.refus(servletRequest, "Commandes et suggestions", "P_SM_SUGGERER_CDE",
                "P_SM_SUGGESTION", "P_SM_SUGG_REAPPRO", "P_M_COMMANDE", "P_SM_COMMANDE_PROCESS");
        if (refusDroit != null) {
            return refusDroit;
        }
        TUser u = utilisateur();
        if (u == null) {
            return json(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE));
        }
        return json(commanderMaintenant(id, u));
    }

    private JSONObject commanderMaintenant(String id, TUser u) {
        JSONObject a = suggestionService.apercuCommandePharmaMl(id);
        if (!a.optBoolean("success")) {
            return (a);
        }
        if (a.optBoolean("commandee")) {
            return (new JSONObject().put("success", false).put("msg", "La suggestion est déjà commandée"));
        }
        if (a.optInt("lignes") == 0) {
            return (new JSONObject().put("success", false).put("msg", "La suggestion n'a aucune ligne"));
        }
        if (!a.optBoolean("pharmaml")) {
            return (new JSONObject().put("success", false).put("msg",
                    "Le grossiste " + a.optString("grossiste") + " n'a pas de lien PharmaML (fiche grossiste)"));
        }
        String orderId = a.optString("commandeId");
        boolean reprise = !orderId.isEmpty();
        try {
            if (!reprise) {
                orderId = orderService.creerCommandeDepuisSuggestion(id, u);
                suggestionService.lierCommande(id, orderId);
            }
            JSONObject envoi = pharmaMlService.envoiCommande(orderId, LocalDate.now().plusDays(1), 0, null, null);
            if (envoi == null || !envoi.optBoolean("success")) {
                return (new JSONObject().put("success", false).put("commandeCreee", true).put("reprise", reprise).put(
                        "msg",
                        "L'envoi PharmaML n'a pas abouti"
                                + (envoi != null && envoi.has("msg") ? " : " + envoi.optString("msg") : "")
                                + ". La commande reste dans les commandes en cours ;"
                                + " un nouvel essai la reprendra."));
            }
            if (envoi.optBoolean("enAttente")) {
                /* recue par le grossiste, reponse differee : « Commandee » seulement a l'arrivee de la reponse */
                return (new JSONObject().put("success", true).put("reprise", reprise).put("commandeId", orderId)
                        .put("enAttente", true).put("msg", envoi.optString("msg")).put("envoi", envoi));
            }
            JSONObject statut = suggestionService.marquerCommandee(id, SuggestionService.MODE_COMMANDE_PHARMAML,
                    orderId, u);
            return (new JSONObject().put("success", true).put("reprise", reprise).put("commandeId", orderId)
                    .put("statut", statut.optString("statut")).put("envoi", envoi));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "commander une suggestion par PharmaML", e);
            return (new JSONObject().put("success", false).put("msg", "La commande n'a pas pu être passée."));
        }
    }
}
