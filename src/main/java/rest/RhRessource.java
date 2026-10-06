package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.RhService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Ressources humaines (plan d'octobre, section 3, lot L11a). Tout demande P_SM_RH ; decider (valider / refuser) une
 * absence demande en plus P_RH_VALIDER_CONGE.
 */
@Path("v1/rh")
@Produces(MediaType.APPLICATION_JSON)
public class RhRessource {

    static final String PRIVILEGE = "P_SM_RH";
    static final String VALIDER = "P_RH_VALIDER_CONGE";

    @EJB
    private RhService service;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise(String privilege) {
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                privilege);
    }

    private Response controle() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return autorise(PRIVILEGE) ? null : refus("Vous n'avez pas accès aux ressources humaines.");
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response refus(String m) {
        return ok(new JSONObject().put("success", false).put("msg", m).put("message", m));
    }

    private static LocalDate date(String s, LocalDate defaut) {
        try {
            return StringUtils.isBlank(s) ? defaut : LocalDate.parse(s.trim().substring(0, 10));
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    private static JSONObject corps(String c) {
        try {
            return StringUtils.isBlank(c) ? new JSONObject() : new JSONObject(c);
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }

    @GET
    @Path("droits")
    public Response droits() {
        Response r = controle();
        return r != null ? r : ok(new JSONObject().put("success", true).put("valider", autorise(VALIDER)));
    }

    /* ---------------------------------------------------------------- employes */

    @GET
    @Path("employes")
    public Response employes(@QueryParam("query") String query,
            @DefaultValue("false") @QueryParam("inactifs") boolean inactifs) {
        Response r = controle();
        return r != null ? r : ok(service.employes(query, inactifs));
    }

    @POST
    @Path("employes")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerEmploye(String c) {
        Response r = controle();
        return r != null ? r : ok(service.enregistrerEmploye(corps(c), utilisateur()));
    }

    @GET
    @Path("utilisateurs-libres")
    public Response utilisateursLibres(@QueryParam("employeId") String employeId) {
        Response r = controle();
        return r != null ? r : ok(service.utilisateursLibres(employeId));
    }

    /* ---------------------------------------------------------------- planning */

    @GET
    @Path("planning")
    public Response planning(@QueryParam("semaine") String semaine) {
        Response r = controle();
        return r != null ? r : ok(service.planning(date(semaine, LocalDate.now())));
    }

    @POST
    @Path("planning")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerPlanning(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray cases;
        try {
            cases = StringUtils.trimToEmpty(c).startsWith("[") ? new JSONArray(c) : corps(c).optJSONArray("cases");
        } catch (RuntimeException e) {
            return refus("Saisie illisible.");
        }
        return ok(service.enregistrerPlanning(cases, utilisateur()));
    }

    @POST
    @Path("planning/copier")
    public Response copier(@QueryParam("source") String source, @QueryParam("cible") String cible,
            @DefaultValue("false") @QueryParam("remplacer") boolean remplacer) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        LocalDate c = date(cible, null);
        if (c == null) {
            return refus("Semaine cible absente.");
        }
        return ok(service.copierSemaine(date(source, c.minusDays(7)), c, remplacer, utilisateur()));
    }

    /* ---------------------------------------------------------------- absences */

    @GET
    @Path("absences")
    public Response absences(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("employeId") String employeId, @QueryParam("statut") String statut) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        LocalDate d = date(du, LocalDate.now().withDayOfMonth(1));
        LocalDate a = date(au, d.plusMonths(1).minusDays(1));
        return ok(service.absences(d, a, employeId, statut));
    }

    @POST
    @Path("absences")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerAbsence(String c) {
        Response r = controle();
        return r != null ? r : ok(service.enregistrerAbsence(corps(c), utilisateur()));
    }

    @POST
    @Path("absences/{id}/decision")
    public Response decider(@PathParam("id") String id, @QueryParam("statut") String statut) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        if (!autorise(VALIDER)) {
            return refus("Vous n'avez pas le droit de valider les congés et absences.");
        }
        return ok(service.deciderAbsence(id, statut, utilisateur()));
    }

    @DELETE
    @Path("absences/{id}")
    public Response supprimer(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : ok(service.supprimerAbsence(id, utilisateur(), autorise(VALIDER)));
    }

    /* ---------------------------------------------------------------- connexions */

    @GET
    @Path("sessions")
    public Response sessions(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("userId") String userId) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        LocalDate a = date(au, LocalDate.now());
        return ok(service.sessions(date(du, a.minusDays(6)), a, userId));
    }
}
