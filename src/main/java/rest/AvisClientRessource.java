package rest;

import avisclients.Analyse;
import avisclients.Texte;
import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
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
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.report.pdf.AvisPdf;
import rest.service.impl.AvisClientService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Menu AVIS CLIENTS : liste des avis (filtres, tri, impression, export Excel), traitement et reponse au client,
 * analyse, reglages et affiche du QR code. Droits : P_SM_AVIS_CLIENTS (lire), P_AVIS_REPONDRE (traiter, repondre),
 * P_AVIS_REGLAGES (reglages, lien et affiche - le lien contient le jeton secret).
 */
@Path("v1/avis-clients")
@Produces("application/json; charset=UTF-8")
public class AvisClientRessource {

    private static final Logger LOG = Logger.getLogger(AvisClientRessource.class.getName());
    static final String LIRE = "P_SM_AVIS_CLIENTS", REPONDRE = "P_AVIS_REPONDRE", REGLAGES = "P_AVIS_REGLAGES";
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private AvisClientService service;
    @EJB
    private rest.service.utils.ReportExcelExportService excelExportService;

    /* ------------------------------------------------------------------ droits */

    @SuppressWarnings("unchecked")
    private boolean droit(String nom) {
        HttpSession s = servletRequest.getSession(false);
        return s != null && s.getAttribute(commonparameter.AIRTIME_USER) != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), nom);
    }

    private JSONObject refus(String nom) {
        HttpSession s = servletRequest.getSession(false);
        if (s == null || s.getAttribute(commonparameter.AIRTIME_USER) == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!droit(LIRE) || !droit(nom)) {
            return echec("Vous n'avez pas le droit d'effectuer cette action.").put("interdit", true);
        }
        return null;
    }

    private String utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        if (u instanceof TUser) {
            TUser t = (TUser) u;
            return (StringUtils.defaultString(t.getStrFIRSTNAME()) + " "
                    + StringUtils.defaultString(t.getStrLASTNAME())).trim();
        }
        return null;
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg).put("message", msg);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).header("Cache-Control", "no-store").build();
    }

    private static LocalDate date(String s, LocalDate defaut) {
        if (StringUtils.isBlank(s)) {
            return defaut;
        }
        try {
            return LocalDate.parse(s.trim().length() > 10 ? s.trim().substring(0, 10) : s.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Date invalide : " + s);
        }
    }

    private static JSONObject filtres(String note, String statut, String contient, String motCle, String employe,
            String theme, String reponse, String tri) {
        return new JSONObject().put("note", StringUtils.defaultString(note))
                .put("statut", StringUtils.defaultString(statut)).put("contient", StringUtils.defaultString(contient))
                .put("motCle", StringUtils.defaultString(motCle)).put("employe", StringUtils.defaultString(employe))
                .put("theme", StringUtils.defaultString(theme)).put("reponse", StringUtils.defaultString(reponse))
                .put("tri", StringUtils.defaultIfBlank(tri, "DATE_DESC"));
    }

    private LocalDate[] periode(String du, String au) {
        LocalDate fin = date(au, LocalDate.now()), debut = date(du, fin.minusDays(29));
        if (debut.isAfter(fin)) {
            throw new IllegalArgumentException("La date de début est après la date de fin.");
        }
        if (debut.isBefore(fin.minusYears(3))) {
            throw new IllegalArgumentException("Période de 3 ans au plus.");
        }
        return new LocalDate[] { debut, fin };
    }

    private static String libellePeriode(LocalDate[] p) {
        return "Du " + p[0].format(JOUR) + " au " + p[1].format(JOUR);
    }

    /* ------------------------------------------------------------------ lecture */

    @GET
    @Path("droits")
    public Response droits() {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return json(r);
        }
        return json(new JSONObject().put("success", true).put("repondre", droit(REPONDRE))
                .put("reglages", droit(REGLAGES)).put("nouveaux", service.nouveaux())
                .put("publie", !service.parametre(AvisClientService.ADRESSE).isEmpty())
                .put("criteres", new JSONObject(Analyse.LIBELLES_CRITERES))
                .put("themes", new org.json.JSONArray(Analyse.themes())));
    }

    @GET
    @Path("liste")
    public Response liste(@QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("note") String note,
            @QueryParam("statut") String statut, @QueryParam("contient") String contient,
            @QueryParam("motCle") String motCle, @QueryParam("employe") String employe,
            @QueryParam("theme") String theme, @QueryParam("reponse") String reponse, @QueryParam("tri") String tri,
            @QueryParam("start") int start, @QueryParam("limit") int limit) {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return json(r);
        }
        try {
            LocalDate[] p = periode(du, au);
            return json(service.liste(p[0], p[1], filtres(note, statut, contient, motCle, employe, theme, reponse, tri),
                    start, limit <= 0 ? 50 : limit));
        } catch (IllegalArgumentException e) {
            return json(echec(e.getMessage()));
        }
    }

    @GET
    @Path("avis/{id}")
    public Response detail(@PathParam("id") String id) {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return json(r);
        }
        JSONObject a = service.detail(id, true);
        return json(a == null ? echec("Avis introuvable.") : new JSONObject().put("success", true).put("data", a));
    }

    @POST
    @Path("avis/{id}/traiter")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response traiter(@PathParam("id") String id, String corps) {
        JSONObject r = refus(REPONDRE);
        if (r != null) {
            return json(r);
        }
        try {
            JSONObject j = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
            service.traiter(id, j.optString("statut"), j.optString("noteInterne", null));
            return json(new JSONObject().put("success", true).put("data", service.detail(id, false)));
        } catch (IllegalArgumentException | JSONException e) {
            return json(echec(e.getMessage()));
        }
    }

    @POST
    @Path("avis/{id}/repondre")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response repondre(@PathParam("id") String id, String corps) {
        JSONObject r = refus(REPONDRE);
        if (r != null) {
            return json(r);
        }
        try {
            JSONObject j = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
            JSONObject e = service.repondre(id, j.optString("canal"), j.optString("texte", null), utilisateur());
            return json(e.put("data", service.detail(id, false)));
        } catch (IllegalArgumentException | JSONException e) {
            return json(echec(e.getMessage()));
        }
    }

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("du") String du, @QueryParam("au") String au) {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return json(r);
        }
        try {
            LocalDate[] p = periode(du, au);
            return json(service.analyse(p[0], p[1]));
        } catch (IllegalArgumentException e) {
            return json(echec(e.getMessage()));
        }
    }

    /* ------------------------------------------------------------------ editions */

    private Response fichier(byte[] data, String type, String nom) {
        return Response.ok(data, type).header("Content-Disposition", "inline; filename=\"" + nom + "\"")
                .header("Cache-Control", "no-store").build();
    }

    private static String horodatage() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm"));
    }

    @GET
    @Path("liste/pdf")
    @Produces({ "application/pdf", "application/json" })
    public Response listePdf(@QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("note") String note,
            @QueryParam("statut") String statut, @QueryParam("contient") String contient,
            @QueryParam("motCle") String motCle, @QueryParam("employe") String employe,
            @QueryParam("theme") String theme, @QueryParam("reponse") String reponse, @QueryParam("tri") String tri) {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return Response.status(403).entity(r.toString()).type(MediaType.APPLICATION_JSON).build();
        }
        try {
            LocalDate[] p = periode(du, au);
            List<JSONObject> l = service.tous(p[0], p[1],
                    filtres(note, statut, contient, motCle, employe, theme, reponse, tri));
            return fichier(AvisPdf.liste(service.pharmacie()[0], libellePeriode(p), l), "application/pdf",
                    "avis_clients_" + horodatage() + ".pdf");
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(echec(e.getMessage()).toString()).type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Avis : impression de la liste", e);
            return Response.status(500).entity(echec("Impression impossible.").toString())
                    .type(MediaType.APPLICATION_JSON).build();
        }
    }

    @GET
    @Path("liste/excel")
    @Produces({ "application/vnd.ms-excel", "application/json" })
    public Response listeExcel(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("note") String note, @QueryParam("statut") String statut,
            @QueryParam("contient") String contient, @QueryParam("motCle") String motCle,
            @QueryParam("employe") String employe, @QueryParam("theme") String theme,
            @QueryParam("reponse") String reponse, @QueryParam("tri") String tri) {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return Response.status(403).entity(r.toString()).type(MediaType.APPLICATION_JSON).build();
        }
        try {
            LocalDate[] p = periode(du, au);
            List<JSONObject> l = service.tous(p[0], p[1],
                    filtres(note, statut, contient, motCle, employe, theme, reponse, tri));
            String[] entetes = { "Date", "Note", "Apprécié", "À améliorer", "Ressenti", "Employé cité", "Client",
                    "Téléphone", "E-mail", "Rappel accepté", "Statut", "Note interne", "Réponse", "Canal",
                    "Date réponse", "Répondu par" };
            byte[] data = excelExportService.createLandscapeExcelReport(
                    "AVIS CLIENTS - " + libellePeriode(p).toUpperCase(java.util.Locale.FRANCE), entetes, l,
                    (row, a) -> {
                        StringBuilder plus = new StringBuilder(), moins = new StringBuilder();
                        JSONObject c = a.getJSONObject("criteres");
                        for (String k : c.keySet()) {
                            StringBuilder b = "PLUS".equals(c.getString(k)) ? plus : moins;
                            b.append(b.length() == 0 ? "" : ", ").append(Analyse.LIBELLES_CRITERES.getOrDefault(k, k));
                        }
                        String[] v = { a.getString("date"), null, plus.toString(), moins.toString(),
                                a.getString("texte"), a.getString("employe"),
                                a.getBoolean("anonyme") ? "Anonyme" : a.getString("nom"), a.getString("telephone"),
                                a.getString("email"), a.getBoolean("rappel") ? "Oui" : "Non",
                                "TRAITE".equals(a.getString("statut")) ? "Traité"
                                        : "LU".equals(a.getString("statut")) ? "Lu" : "Nouveau",
                                a.getString("noteInterne"), a.getString("reponse"), a.getString("canalReponse"),
                                a.getString("dateReponse"), a.getString("auteurReponse") };
                        for (int i = 0; i < v.length; i++) {
                            if (i == 1) {
                                row.createCell(i).setCellValue(a.getInt("note"));
                            } else {
                                row.createCell(i).setCellValue(Texte.cellule(v[i]));
                            }
                        }
                    });
            return Response.ok(data)
                    .header("Content-Disposition", "attachment; filename=\"avis_clients_" + horodatage() + ".xls\"")
                    .build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(echec(e.getMessage()).toString()).type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Avis : export Excel", e);
            return Response.status(500).entity(echec("Export impossible.").toString()).type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }

    @GET
    @Path("analyse/pdf")
    @Produces({ "application/pdf", "application/json" })
    public Response analysePdf(@QueryParam("du") String du, @QueryParam("au") String au) {
        JSONObject r = refus(LIRE);
        if (r != null) {
            return Response.status(403).entity(r.toString()).type(MediaType.APPLICATION_JSON).build();
        }
        try {
            LocalDate[] p = periode(du, au);
            return fichier(AvisPdf.analyse(service.pharmacie()[0], libellePeriode(p), service.analyse(p[0], p[1])),
                    "application/pdf", "analyse_avis_" + horodatage() + ".pdf");
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(echec(e.getMessage()).toString()).type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Avis : impression de l'analyse", e);
            return Response.status(500).entity(echec("Impression impossible.").toString())
                    .type(MediaType.APPLICATION_JSON).build();
        }
    }

    /* ------------------------------------------------------------------ reglages et affiche */

    @GET
    @Path("reglages")
    public Response reglages() {
        JSONObject r = refus(REGLAGES);
        if (r != null) {
            return json(r);
        }
        return json(
                new JSONObject().put("success", true).put("data", service.reglages(servletRequest.getContextPath())));
    }

    @POST
    @Path("reglages")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerReglages(String corps) {
        JSONObject r = refus(REGLAGES);
        if (r != null) {
            return json(r);
        }
        try {
            service.enregistrerReglages(new JSONObject(StringUtils.defaultIfBlank(corps, "{}")));
            return json(new JSONObject().put("success", true).put("data",
                    service.reglages(servletRequest.getContextPath())));
        } catch (IllegalArgumentException | JSONException e) {
            return json(echec(e.getMessage()));
        }
    }

    @POST
    @Path("reglages/regenerer")
    public Response regenerer() {
        JSONObject r = refus(REGLAGES);
        if (r != null) {
            return json(r);
        }
        service.regenererJeton();
        LOG.log(Level.INFO, "Avis clients : nouveau QR code genere par {0}", utilisateur());
        return json(
                new JSONObject().put("success", true).put("data", service.reglages(servletRequest.getContextPath())));
    }

    @GET
    @Path("affiche")
    @Produces({ "application/pdf", "application/json" })
    public Response affiche(@QueryParam("format") String format) {
        JSONObject r = refus(REGLAGES);
        if (r != null) {
            return Response.status(403).entity(r.toString()).type(MediaType.APPLICATION_JSON).build();
        }
        String lien = service.lien(servletRequest.getContextPath());
        if (lien == null) {
            return Response.status(400).entity(echec("Saisissez d'abord l'adresse IP publique.").toString())
                    .type(MediaType.APPLICATION_JSON).build();
        }
        try {
            String[] p = service.pharmacie();
            return fichier(AvisPdf.affiche(p[0], p[1], lien, "A5".equalsIgnoreCase(format)), "application/pdf",
                    "affiche_avis.pdf");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Avis : affiche", e);
            return Response.status(500).entity(echec("Affiche impossible.").toString()).type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }
}
