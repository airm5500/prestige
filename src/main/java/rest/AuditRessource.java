package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.audit.AuditAnalyseService;
import rest.service.impl.audit.AuditRapportService;
import rest.service.impl.audit.AuditRegularisationService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * AUDIT & RAPPROCHEMENTS (besoins du 11/10, point 6). Onglet Analyse : lecture seule, droit P_SM_AUDIT revérifié ici.
 */
@Path("v1/audit")
@Produces("application/json; charset=UTF-8")
public class AuditRessource {

    static final String LIRE = "P_SM_AUDIT", REGULARISER = "P_AUDIT_REGULARISER";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private AuditAnalyseService analyse;
    @EJB
    private AuditRapportService rapports;
    @EJB
    private AuditRegularisationService regularisations;

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

    @SuppressWarnings("unchecked")
    private boolean peutRegulariser() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), REGULARISER);
    }

    private static Response echec(String message) {
        return Response.ok(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    private Response refus() {
        HttpSession s = servletRequest.getSession(false);
        return echec(s == null || s.getAttribute(commonparameter.AIRTIME_USER) == null ? Constant.DECONNECTED_MESSAGE
                : "Vous n'avez pas le droit de consulter l'audit.");
    }

    /** Periode du billetage (par defaut : le mois en cours) ; null si invalide. */
    private static LocalDate[] periode(String dtStart, String dtEnd) {
        LocalDate fin = LocalDate.now(), debut = fin.withDayOfMonth(1);
        try {
            if (dtStart != null && !dtStart.trim().isEmpty()) {
                debut = LocalDate.parse(dtStart.trim());
            }
            if (dtEnd != null && !dtEnd.trim().isEmpty()) {
                fin = LocalDate.parse(dtEnd.trim());
            }
        } catch (RuntimeException e) {
            return null;
        }
        return debut.isAfter(fin) ? null : new LocalDate[] { debut, fin };
    }

    /** Analyse affichee a l'ouverture de l'ecran : non enregistree. */
    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd) {
        TUser u = autorise();
        if (u == null) {
            return refus();
        }
        LocalDate[] p = periode(dtStart, dtEnd);
        if (p == null) {
            return echec("Période invalide : la date de début doit précéder la date de fin.");
        }
        return Response.ok(analyse.analyser(p[0], p[1], u).toString()).build();
    }

    /** « Lancer l'analyse » : l'analyse est conservee dans les rapports. */
    @POST
    @Path("rapports")
    public Response lancer(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd) {
        TUser u = autorise();
        if (u == null) {
            return refus();
        }
        LocalDate[] p = periode(dtStart, dtEnd);
        if (p == null) {
            return echec("Période invalide : la date de début doit précéder la date de fin.");
        }
        JSONObject r = analyse.analyser(p[0], p[1], u);
        return Response.ok(r.put("rapportId", rapports.enregistrer(r, u)).toString()).build();
    }

    @GET
    @Path("rapports")
    public Response liste() {
        if (autorise() == null) {
            return refus();
        }
        return Response.ok(new JSONObject().put("success", true).put("data", rapports.liste(200)).toString()).build();
    }

    @GET
    @Path("rapports/comparer")
    public Response comparer(@QueryParam("a") String a, @QueryParam("b") String b) {
        if (autorise() == null) {
            return refus();
        }
        JSONObject c = a == null || b == null || a.equals(b) ? null : rapports.comparer(a, b);
        return c == null ? echec("Choisissez deux rapports différents.") : Response.ok(c.toString()).build();
    }

    @GET
    @Path("rapports/{id}")
    public Response lire(@PathParam("id") String id) {
        if (autorise() == null) {
            return refus();
        }
        JSONObject r = rapports.lire(id);
        return r == null ? echec("Rapport introuvable.") : Response.ok(r.put("success", true).toString()).build();
    }

    @GET
    @Path("rapports/{id}/pdf")
    @Produces({ "application/pdf", "application/json" })
    public Response pdf(@PathParam("id") String id) throws Exception {
        if (autorise() == null) {
            return refus();
        }
        JSONObject r = rapports.lire(id);
        if (r == null) {
            return echec("Rapport introuvable.");
        }
        return fichier(rapports.pdf(r), "application/pdf", "inline", "audit_" + horodatage(r) + ".pdf");
    }

    @GET
    @Path("rapports/{id}/excel")
    @Produces({ "application/vnd.ms-excel", "application/json" })
    public Response excel(@PathParam("id") String id) throws Exception {
        if (autorise() == null) {
            return refus();
        }
        JSONObject r = rapports.lire(id);
        if (r == null) {
            return echec("Rapport introuvable.");
        }
        return fichier(rapports.excel(r), "application/vnd.ms-excel", "attachment", "audit_" + horodatage(r) + ".xls");
    }

    private static String horodatage(JSONObject r) {
        return r.optString("date").replaceAll("[^0-9]", "");
    }

    private static Response fichier(byte[] data, String type, String disposition, String nom) {
        return Response.ok(data, type).header("Content-Disposition", disposition + "; filename=\"" + nom + "\"")
                .header("Cache-Control", "no-store").build();
    }

    /* ------------------------------------------------------------------ regularisations */

    @GET
    @Path("regularisations")
    public Response propositions() {
        if (autorise() == null) {
            return refus();
        }
        return Response.ok(new JSONObject().put("success", true).put("peutValider", peutRegulariser())
                .put("data", regularisations.propositions()).toString()).build();
    }

    /** Applique UNE regularisation validee : {type, cle, commentaire, montant (caisse)}. */
    @POST
    @Path("regularisations/appliquer")
    @Consumes("application/json")
    public Response appliquer(String corps) {
        TUser u = autorise();
        if (u == null) {
            return refus();
        }
        if (!peutRegulariser()) {
            return echec("Vous n'avez pas le droit de valider les régularisations.");
        }
        JSONObject c;
        try {
            c = new JSONObject(corps == null ? "{}" : corps);
        } catch (RuntimeException e) {
            return echec("Demande illisible.");
        }
        Long montant = c.has("montant") && !c.isNull("montant") && !String.valueOf(c.get("montant")).isEmpty()
                ? c.optLong("montant", -1) : null;
        return Response.ok(regularisations
                .appliquer(c.optString("type"), c.optString("cle"), c.optString("commentaire"), montant, u).toString())
                .build();
    }

    @GET
    @Path("regularisations/journal")
    public Response journal() {
        if (autorise() == null) {
            return refus();
        }
        return Response.ok(new JSONObject().put("success", true).put("data", regularisations.journal(500)).toString())
                .build();
    }
}
