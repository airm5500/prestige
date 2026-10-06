package rest;

import commonTasks.dto.RappelHabitudeDTO;
import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.RappelHabitudeService;
import rest.service.SmsService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Rappels de traitement habituel et piluliers a preparer (plan d'octobre, section 4.1, lot L10). Consultation et
 * actions demandent le privilege du menu, P_SM_RAPPELS_HABITUDE.
 */
@Path("v1/rappels-habitude")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RappelHabitudeRessource {

    static final String PRIVILEGE = "P_SM_RAPPELS_HABITUDE";
    private static final java.util.concurrent.atomic.AtomicBoolean EN_COURS = new java.util.concurrent.atomic.AtomicBoolean();

    @EJB
    private RappelHabitudeService service;
    @EJB
    private SmsService smsService;
    @EJB
    private rest.service.WhatsAppService whatsAppService;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                PRIVILEGE);
    }

    private static Response reponse(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response refus(String message) {
        return reponse(new JSONObject().put("success", false).put("msg", message).put("message", message));
    }

    /** null si l'appel peut continuer, sinon la reponse de refus. */
    private Response controle() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return autorise() ? null : refus("Vous n'avez pas accès aux rappels de traitement.");
    }

    private static LocalDate date(String valeur) {
        try {
            return StringUtils.isBlank(valeur) ? null : LocalDate.parse(valeur.trim().substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static List<String> ids(String corps) {
        List<String> ids = new ArrayList<>();
        if (StringUtils.isBlank(corps)) {
            return ids;
        }
        JSONArray a = corps.trim().startsWith("[") ? new JSONArray(corps) : new JSONObject(corps).optJSONArray("ids");
        for (int i = 0; a != null && i < a.length(); i++) {
            if (StringUtils.isNotBlank(a.optString(i))) {
                ids.add(a.optString(i).trim());
            }
        }
        return ids;
    }

    @GET
    @Path("liste")
    public Response liste(@QueryParam("statut") String statut, @QueryParam("query") String query,
            @QueryParam("dtStart") String du, @QueryParam("dtEnd") String au) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        TUser u = utilisateur();
        List<RappelHabitudeDTO> l = service.liste(statut, query, date(du), date(au),
                u.getLgEMPLACEMENTID() == null ? null : u.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        JSONArray data = new JSONArray();
        l.forEach(d -> data.put(d.toJson()));
        return reponse(new JSONObject().put("success", true).put("total", l.size()).put("data", data));
    }

    @GET
    @Path("compteur")
    public Response compteur() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return reponse(new JSONObject().put("success", true).put("aPreparer", autorise() ? service.aPreparer() : 0));
    }

    /** Recalcule la liste (le jour est force pour les essais, sinon aujourd'hui). */
    @POST
    @Path("actualiser")
    public Response actualiser(@QueryParam("jour") String jour) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        /* Un calcul a la fois (il parcourt un an de ventes) : un second clic attend la fin du premier. */
        if (!EN_COURS.compareAndSet(false, true)) {
            return refus("Une actualisation est déjà en cours : la liste sera à jour dans un instant.");
        }
        try {
            return reponse(service.actualiser(date(jour)));
        } finally {
            EN_COURS.set(false);
        }
    }

    @POST
    @Path("marquer")
    public Response marquer(@QueryParam("statut") String statut, String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        return reponse(service.marquer(ids(corps), statut, utilisateur()));
    }

    /** SMS de rappel : prepares et valides par le service, PUIS envoyes par le module SMS existant. */
    @POST
    @Path("sms")
    public Response sms(String corps) {
        return envoyer("SMS", corps);
    }

    /**
     * Rappel par le canal choisi (plan d'octobre, 4.2) : SMS, WHATSAPP, ou SMS_WHATSAPP (WhatsApp, repli SMS pour les
     * destinataires non servis). Les messages sont prepares et valides, PUIS envoyes en tache de fond.
     */
    @POST
    @Path("envoyer")
    public Response envoyer(@QueryParam("canal") String canal, String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        String c = StringUtils.defaultIfBlank(canal, "SMS").trim().toUpperCase();
        if (!java.util.Arrays.asList("SMS", "WHATSAPP", "SMS_WHATSAPP").contains(c)) {
            return refus("Canal inconnu.");
        }
        JSONObject o = service.preparerMessages(ids(corps), utilisateur(), c);
        JSONArray n = o.optJSONArray("notifications");
        for (int i = 0; n != null && i < n.length(); i++) {
            if ("SMS".equals(c)) {
                smsService.sendSMSByNotificationIdAsync(n.getString(i));
            } else {
                whatsAppService.envoyerNotificationAsync(n.getString(i), "SMS_WHATSAPP".equals(c));
            }
        }
        return reponse(o.put("canal", c));
    }
}
