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
        return envoyer("SMS", null, corps);
    }

    /**
     * Rappel par le canal choisi (plan d'octobre, 4.2) : SMS, WHATSAPP, ou SMS_WHATSAPP (WhatsApp, repli SMS pour les
     * destinataires non servis). Les messages sont prepares et valides, PUIS envoyes en tache de fond.
     */
    @POST
    @Path("envoyer")
    public Response envoyer(@QueryParam("canal") String canal, @QueryParam("modele") String modele, String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        String c = StringUtils.defaultIfBlank(canal, "SMS").trim().toUpperCase();
        if (!java.util.Arrays.asList("SMS", "WHATSAPP", "SMS_WHATSAPP").contains(c)) {
            return refus("Canal inconnu.");
        }
        JSONObject o = service.preparerMessages(ids(corps), utilisateur(), c, modele);
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

    /* ------------------------------------------------------------ retours du 10/10 (section 13) */

    private static final java.time.format.DateTimeFormatter JJ = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy");
    private static final java.util.Map<String, String> STATUTS = java.util.Map.of("A_PREPARER", "À préparer", "PREPARE",
            "Préparé", "ECARTE", "Écarté", "ACHETE", "Racheté");

    /** Analyse des rappels : periode de la date prevue (par defaut les 6 derniers mois). */
    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("dtStart") String du, @QueryParam("dtEnd") String au) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        LocalDate fin = date(au) == null ? LocalDate.now() : date(au);
        LocalDate debut = date(du) == null ? fin.minusMonths(5).withDayOfMonth(1) : date(du);
        if (debut.isAfter(fin)) {
            return refus("La date de début doit précéder la date de fin.");
        }
        return reponse(service.analyse(debut, fin));
    }

    private List<String[]> lignesEdition(String statut, String query, String du, String au) {
        TUser u = utilisateur();
        List<String[]> lignes = new ArrayList<>();
        for (RappelHabitudeDTO d : service.liste(statut, query, date(du), date(au),
                u.getLgEMPLACEMENTID() == null ? null : u.getLgEMPLACEMENTID().getLgEMPLACEMENTID())) {
            JSONObject j = d.toJson();
            Object envoi = j.opt("envoi");
            lignes.add(new String[] { jour(j.optString("prevu")), j.optString("client"), j.optString("telephone"),
                    j.optString("cip"), j.optString("produit"), String.valueOf(j.optInt("stock")),
                    j.optInt("frequence") + " j", jour(j.optString("dernierAchat")),
                    STATUTS.getOrDefault(j.optString("statut"), j.optString("statut")),
                    envoi instanceof Number ? new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm")
                            .format(new java.util.Date(((Number) envoi).longValue())) : "" });
        }
        return lignes;
    }

    private static String jour(String iso) {
        LocalDate d = date(iso);
        return d == null ? "" : d.format(JJ);
    }

    private static final String[] ENTETES = { "Prévu le", "Client", "Téléphone", "CIP", "Produit", "Stock", "Fréquence",
            "Dernier achat", "Statut", "Rappel envoyé" };

    private String sousTitre(String statut, String query, String du, String au, int n) {
        String s = StringUtils.isBlank(statut) ? "À préparer et préparés" : "TOUS".equalsIgnoreCase(statut)
                ? "Tous les statuts" : STATUTS.getOrDefault(statut.toUpperCase(), statut);
        if (date(du) != null || date(au) != null) {
            s += " · prévus " + (date(du) == null ? "" : "du " + date(du).format(JJ) + " ")
                    + (date(au) == null ? "" : "au " + date(au).format(JJ));
        }
        if (StringUtils.isNotBlank(query)) {
            s += " · recherche « " + query.trim() + " »";
        }
        return s.trim() + " · " + n + " ligne(s)";
    }

    /** Impression de la liste affichee (memes criteres). */
    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("statut") String statut, @QueryParam("query") String query,
            @QueryParam("dtStart") String du, @QueryParam("dtEnd") String au) {
        Response r = controle();
        if (r != null) {
            return Response.status(Response.Status.FORBIDDEN).type(MediaType.APPLICATION_JSON).entity(r.getEntity())
                    .build();
        }
        List<String[]> lignes = lignesEdition(statut, query, du, au);
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.nomOfficine();
        e.titre = "RAPPELS DE TRAITEMENT";
        e.sousTitre = sousTitre(statut, query, du, au, lignes.size());
        TUser u = utilisateur();
        e.imprimePar = (StringUtils.defaultString(u.getStrFIRSTNAME()) + " "
                + StringUtils.defaultString(u.getStrLASTNAME())).trim();
        e.entetes = ENTETES;
        e.largeurs = new float[] { 7f, 14f, 9f, 7f, 22f, 5f, 7f, 8f, 8f, 11f };
        e.droite = new boolean[] { false, false, false, false, false, true, true, false, false, false };
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=rappels_traitement.pdf").build();
    }

    /** Export CSV (separateur « ; », UTF-8 avec BOM pour Excel) de la liste affichee. */
    @GET
    @Path("csv")
    @Produces("text/csv")
    public Response csv(@QueryParam("statut") String statut, @QueryParam("query") String query,
            @QueryParam("dtStart") String du, @QueryParam("dtEnd") String au) {
        Response r = controle();
        if (r != null) {
            return Response.status(Response.Status.FORBIDDEN).type(MediaType.APPLICATION_JSON).entity(r.getEntity())
                    .build();
        }
        StringBuilder sb = new StringBuilder("\uFEFF");
        sb.append(csvLigne(ENTETES));
        for (String[] l : lignesEdition(statut, query, du, au)) {
            sb.append(csvLigne(l));
        }
        return Response.ok(sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8), "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=rappels_traitement.csv").build();
    }

    static String csvLigne(String[] valeurs) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < valeurs.length; i++) {
            String v = valeurs[i] == null ? "" : valeurs[i];
            /* formule interdite (injection dans le tableur) et separateurs echappes */
            if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 && !v.matches("-?\\d+([.,]\\d+)?")) {
                v = "'" + v;
            }
            sb.append(i == 0 ? "" : ";").append(v.contains(";") || v.contains("\"") || v.contains("\n")
                    ? "\"" + v.replace("\"", "\"\"") + "\"" : v);
        }
        return sb.append("\r\n").toString();
    }
}
