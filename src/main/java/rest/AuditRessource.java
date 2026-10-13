package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.audit.AuditAnalyseService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * AUDIT & RAPPROCHEMENTS (besoins du 11/10, point 6). Onglet Analyse : lecture seule, droit P_SM_AUDIT revérifié ici.
 */
@Path("v1/audit")
@Produces("application/json; charset=UTF-8")
public class AuditRessource {

    static final String LIRE = "P_SM_AUDIT";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private AuditAnalyseService analyse;

    @SuppressWarnings("unchecked")
    private TUser autorise() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        if (!(u instanceof TUser) || !CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), LIRE)) {
            return null;
        }
        return (TUser) u;
    }

    private static Response echec(String message) {
        return Response.ok(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    /** Analyse complete ; la periode ne concerne que les ecarts de billetage (par defaut : le mois en cours). */
    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd) {
        TUser u = autorise();
        if (u == null) {
            HttpSession s = servletRequest.getSession(false);
            return echec(s == null || s.getAttribute(commonparameter.AIRTIME_USER) == null
                    ? Constant.DECONNECTED_MESSAGE : "Vous n'avez pas le droit de consulter l'audit.");
        }
        LocalDate fin = LocalDate.now(), debut = fin.withDayOfMonth(1);
        try {
            if (dtStart != null && !dtStart.trim().isEmpty()) {
                debut = LocalDate.parse(dtStart.trim());
            }
            if (dtEnd != null && !dtEnd.trim().isEmpty()) {
                fin = LocalDate.parse(dtEnd.trim());
            }
        } catch (RuntimeException e) {
            return echec("Dates invalides.");
        }
        if (debut.isAfter(fin)) {
            return echec("La date de début doit précéder la date de fin.");
        }
        return Response.ok(analyse.analyser(debut, fin, u).toString()).build();
    }
}
