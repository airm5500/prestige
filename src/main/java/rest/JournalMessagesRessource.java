package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.JournalMessages;
import rest.service.impl.JournalMessagesService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Plan du 21/11, point 8.1 : journal des messages (SMS et WhatsApp). Ecran et export CSV lisent la MEME selection
 * (memes filtres, meme ordre). Droit P_SM_JOURNAL_MESSAGES. Jamais le texte des messages.
 */
@Path("v1/journal-messages")
@Produces(MediaType.APPLICATION_JSON)
public class JournalMessagesRessource {

    static final String PRIVILEGE = "P_SM_JOURNAL_MESSAGES";

    @EJB
    private JournalMessagesService service;
    @Context
    private HttpServletRequest servletRequest;

    @SuppressWarnings("unchecked")
    private Response controle() {
        javax.servlet.http.HttpSession session = servletRequest.getSession(false);
        TUser u = session != null ? (TUser) session.getAttribute(Constant.AIRTIME_USER) : null;
        if (u == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        boolean ok = CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE), PRIVILEGE);
        return ok ? null : refus("Vous n'avez pas accès au journal des messages.");
    }

    private static Response refus(String m) {
        return Response.ok(new JSONObject().put("success", false).put("msg", m).put("message", m).toString()).build();
    }

    @GET
    public Response lister(@QueryParam("dtStart") String du, @QueryParam("dtEnd") String au,
            @QueryParam("canal") String canal, @QueryParam("origine") String origine, @QueryParam("etat") String etat,
            @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        List<JournalMessages.Ligne> l = service.selection(du, au,
                new JournalMessages.Filtre(canal, origine, etat, query));
        return Response.ok(JournalMessages.page(l, start, Math.min(limit, 500)).toString()).build();
    }

    /** Valeurs des listes de l'ecran (origines et etats). */
    @GET
    @Path("filtres")
    public Response filtres() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray origines = new JSONArray();
        for (String o : JournalMessages.ORIGINES) {
            origines.put(new JSONObject().put("code", o).put("libelle", JournalMessages.libelleOrigine(o)));
        }
        return Response.ok(new JSONObject().put("success", true).put("origines", origines)
                .put("etats", new JSONArray(JournalMessages.ETATS)).put("joursMax", JournalMessages.JOURS_MAX)
                .toString()).build();
    }

    @GET
    @Path("csv")
    @Produces("text/csv")
    public Response csv(@QueryParam("dtStart") String du, @QueryParam("dtEnd") String au,
            @QueryParam("canal") String canal, @QueryParam("origine") String origine, @QueryParam("etat") String etat,
            @QueryParam("query") String query) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        List<JournalMessages.Ligne> l = service.selection(du, au,
                new JournalMessages.Filtre(canal, origine, etat, query));
        return Response.ok(JournalMessages.csv(l))
                .header("Content-Disposition", "attachment; filename=\"journal-messages-" + LocalDate.now() + ".csv\"")
                .type("text/csv; charset=UTF-8").build();
    }
}
