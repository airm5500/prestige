package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.PrevisionCommandeService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Analyse Suggestion / Commande (plan d'octobre, section 5, lot L12). Lecture seule, sauf le recalcul a la demande.
 * Privilege du menu : P_SM_ANALYSE_COMMANDE.
 */
@Path("v1/analyse-commande")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PrevisionCommandeRessource {

    static final String PRIVILEGE = "P_SM_ANALYSE_COMMANDE";
    /** Un seul calcul a la fois (le calcul de la nuit et un clic, ou deux clics). */
    static final AtomicBoolean EN_COURS = new AtomicBoolean();

    @EJB
    private PrevisionCommandeService service;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private String emplacement() {
        TUser u = utilisateur();
        return u == null || u.getLgEMPLACEMENTID() == null ? "1" : u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    private static Response reponse(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response refus(String message) {
        return reponse(new JSONObject().put("success", false).put("msg", message).put("message", message));
    }

    @SuppressWarnings("unchecked")
    private Response controle() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                PRIVILEGE) ? null : refus("Vous n'avez pas accès à l'analyse des commandes.");
    }

    @GET
    @Path("tableau")
    public Response tableau() {
        Response r = controle();
        return r != null ? r : reponse(service.tableau(emplacement()));
    }

    @GET
    @Path("previsions")
    public Response previsions(@QueryParam("filtre") String filtre, @QueryParam("query") String query,
            @QueryParam("start") String start, @QueryParam("limit") String limit) {
        Response r = controle();
        return r != null ? r
                : reponse(service.previsions(emplacement(), filtre, query, nombre(start, 0), nombre(limit, 25)));
    }

    @GET
    @Path("produit/{id}")
    public Response produit(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : reponse(service.produit(emplacement(), id));
    }

    @GET
    @Path("a-analyser")
    public Response aAnalyser() {
        Response r = controle();
        return r != null ? r : reponse(service.aAnalyser(emplacement()));
    }

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("type") String type, @QueryParam("id") String id) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        if (id == null || id.trim().isEmpty()) {
            return refus("Choisissez une suggestion ou une commande.");
        }
        return reponse(service.analyser(emplacement(), type == null ? "" : type.trim().toUpperCase(), id.trim()));
    }

    @POST
    @Path("recalculer")
    public Response recalculer() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        if (!EN_COURS.compareAndSet(false, true)) {
            return refus("Un calcul est déjà en cours, patientez quelques instants.");
        }
        try {
            return reponse(service.recalculer(emplacement(), "DEMANDE"));
        } finally {
            EN_COURS.set(false);
        }
    }

    /** Un nombre saisi (pagination) : illisible ou absent, la valeur par defaut. */
    static int nombre(String v, int defaut) {
        try {
            return v == null || v.trim().isEmpty() ? defaut : Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            return defaut;
        }
    }
}
