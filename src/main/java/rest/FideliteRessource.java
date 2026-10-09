package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.FideliteService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Retours du 09/10 (6) : fidelite clients. Consultation (P_SM_FIDELITE), utilisation et ajustement des points
 * (P_FIDELITE_UTILISER), parametrage (P_FIDELITE_PARAMETRER). Modifications directement dans l'ecran.
 */
@Path("v1/fidelite")
@Produces("application/json")
public class FideliteRessource {

    static final String P_SM_FIDELITE = "P_SM_FIDELITE", P_FIDELITE_UTILISER = "P_FIDELITE_UTILISER",
            P_FIDELITE_PARAMETRER = "P_FIDELITE_PARAMETRER";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private FideliteService service;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean droit(String nom) {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), nom);
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    /** null si l'acces est permis, sinon la reponse de refus. */
    private JSONObject refus(String... droits) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        for (String d : droits) {
            if (!droit(d)) {
                return echec("Vous n'avez pas le droit d'effectuer cette opération (fidélité).").put("interdit", true);
            }
        }
        return null;
    }

    private static JSONObject corps(String body) {
        try {
            return new JSONObject(StringUtils.defaultIfBlank(body, "{}"));
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }

    @GET
    @Path("droits")
    public Response droits() {
        JSONObject r = refus(P_SM_FIDELITE);
        if (r != null) {
            return json(r);
        }
        return json(new JSONObject().put("success", true).put("utiliser", droit(P_FIDELITE_UTILISER)).put("parametrer",
                droit(P_FIDELITE_PARAMETRER)));
    }

    /**
     * Caisse : points du client de la vente et montant payable avec (mode « Points fidelite »). Ouvert a tout
     * utilisateur connecte (le caissier n'a pas forcement l'ecran Fidelite) ; ne donne que le solde de ce client.
     */
    @GET
    @Path("paiement")
    public Response paiement(@QueryParam("client") String client) {
        if (utilisateur() == null) {
            return json(echec(Constant.DECONNECTED_MESSAGE));
        }
        if (StringUtils.isBlank(client)) {
            return json(echec("Choisissez d'abord le client de la vente."));
        }
        return json(service.pourPaiement(client.trim()));
    }

    @GET
    @Path("parametres")
    public Response parametres() {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.lireParametres());
    }

    @PUT
    @Path("parametres")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerParametres(String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.enregistrerParametres(corps(body), utilisateur().getLgUSERID()));
    }

    @PUT
    @Path("palier")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response palier(String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.enregistrerPalier(corps(body)));
    }

    @DELETE
    @Path("palier/{id}")
    public Response supprimerPalier(@PathParam("id") String id) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.supprimerPalier(id));
    }

    @PUT
    @Path("exclusion/{categorie}")
    public Response exclusion(@PathParam("categorie") String categorie, @QueryParam("exclue") boolean exclue) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.exclure(categorie, exclue));
    }

    /** Met le registre des points a jour (ventes cloturees, annulations, expirations). */
    @POST
    @Path("synchroniser")
    public Response synchroniser() {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.synchroniser());
    }

    @GET
    @Path("synthese")
    public Response synthese() {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.synthese());
    }

    @GET
    @Path("clients")
    public Response clients(@QueryParam("query") String query, @QueryParam("start") int start,
            @QueryParam("limit") int limit) {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.clients(query, start, limit <= 0 ? 50 : limit));
    }

    @GET
    @Path("client/{id}/historique")
    public Response historique(@PathParam("id") String id) {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.historique(id));
    }

    @GET
    @Path("client/{id}")
    public Response compte(@PathParam("id") String id) {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.compte(id));
    }

    @POST
    @Path("client/{id}/utiliser")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response utiliser(@PathParam("id") String id, String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_UTILISER);
        if (r != null) {
            return json(r);
        }
        JSONObject o = corps(body);
        service.synchroniser();
        return json(service.utiliser(id, o.optInt("points", 0), o.optString("reference", null),
                utilisateur().getLgUSERID()));
    }

    @POST
    @Path("client/{id}/ajuster")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response ajuster(@PathParam("id") String id, String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_UTILISER);
        if (r != null) {
            return json(r);
        }
        JSONObject o = corps(body);
        return json(service.ajuster(id, o.optInt("points", 0), o.optString("motif", ""), utilisateur().getLgUSERID()));
    }
}
