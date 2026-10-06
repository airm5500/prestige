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
    @EJB
    private rest.service.RhPointageService pointages;
    @EJB
    private rest.report.ReportUtil reportUtil;
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

    /* ---------------------------------------------------------------- pointage (L11b) */

    @GET
    @Path("pointages/modeles")
    public Response modeles() {
        Response r = controle();
        return r != null ? r : ok(pointages.modeles());
    }

    @POST
    @Path("pointages/modeles")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerModele(String c) {
        Response r = controle();
        return r != null ? r : ok(pointages.enregistrerModele(corps(c)));
    }

    /** Etape 1 : le fichier n'est envoye qu'ici (text/html : l'envoi de fichier ExtJS passe par une iframe). */
    @POST
    @Path("pointages/import/analyse")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    @SuppressWarnings("unchecked")
    public Response importAnalyse() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            org.apache.commons.fileupload.servlet.ServletFileUpload upload = new org.apache.commons.fileupload.servlet.ServletFileUpload(
                    new org.apache.commons.fileupload.disk.DiskFileItemFactory());
            String nom = null;
            byte[] contenu = null;
            for (org.apache.commons.fileupload.FileItem item : (List<org.apache.commons.fileupload.FileItem>) upload
                    .parseRequest(servletRequest)) {
                if (!item.isFormField() && contenu == null) {
                    nom = item.getName();
                    contenu = item.get();
                }
            }
            if (contenu == null || contenu.length == 0) {
                return refus("Aucun fichier reçu.");
            }
            return ok(pointages.analyserImport(nom, contenu));
        } catch (Exception e) {
            return refus("Lecture du fichier impossible. Formats acceptés : CSV, TXT, XLS ou XLSX.");
        }
    }

    @POST
    @Path("pointages/import/controle")
    public Response importControle(@QueryParam("jeton") String jeton, @QueryParam("modeleId") String modeleId) {
        Response r = controle();
        return r != null ? r : ok(pointages.importer(jeton, modeleId, false, utilisateur()));
    }

    @POST
    @Path("pointages/import/executer")
    public Response importExecuter(@QueryParam("jeton") String jeton, @QueryParam("modeleId") String modeleId) {
        Response r = controle();
        return r != null ? r : ok(pointages.importer(jeton, modeleId, true, utilisateur()));
    }

    @GET
    @Path("pointages/lots")
    public Response lots() {
        Response r = controle();
        return r != null ? r : ok(pointages.lots(100));
    }

    @POST
    @Path("pointages")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response saisirPointage(String c) {
        Response r = controle();
        return r != null ? r : ok(pointages.saisirPointage(corps(c), utilisateur()));
    }

    @DELETE
    @Path("pointages/{id}")
    public Response supprimerPointage(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : ok(pointages.supprimerPointage(id));
    }

    @GET
    @Path("presence")
    public Response presence(@QueryParam("jour") String jour) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        LocalDate j = date(jour, LocalDate.now());
        JSONArray a = new JSONArray();
        pointages.presences(j, j, null).forEach(p -> a.put(new JSONObject(p)));
        return ok(new JSONObject().put("success", true).put("data", a).put("pointages",
                pointages.pointagesDuJour(j).getJSONArray("data")));
    }

    @GET
    @Path("tableau")
    public Response tableau(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("employeId") String employeId) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        LocalDate[] p = periode(du, au);
        JSONArray a = new JSONArray();
        pointages.tableau(p[0], p[1], employeId).forEach(x -> a.put(new JSONObject(x)));
        return ok(new JSONObject().put("success", true).put("data", a).put("du", p[0].toString()).put("au",
                p[1].toString()));
    }

    private static LocalDate[] periode(String du, String au) {
        LocalDate a = date(au, LocalDate.now());
        LocalDate d = date(du, a.withDayOfMonth(1));
        if (d.isAfter(a)) {
            d = a;
        }
        if (d.isBefore(a.minusDays(366))) {
            d = a.minusDays(366);
        }
        return new LocalDate[] { d, a };
    }

    private static final java.time.format.DateTimeFormatter FR = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy");

    /** Tableau (une ligne par employe) ou detail (une ligne par employe et par jour), en Excel. */
    @GET
    @Path("tableau/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response tableauExcel(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("employeId") String employeId, @DefaultValue("false") @QueryParam("detail") boolean detail)
            throws java.io.IOException {
        if (controle() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate[] p = periode(du, au);
        String titre = "du " + p[0].format(FR) + " au " + p[1].format(FR);
        byte[] data;
        if (detail) {
            data = new rest.report.excel.ClasseurExcel<commonTasks.dto.RhPresenceDTO>("Présence")
                    .titre("RESSOURCES HUMAINES - PRÉSENCE JOURNALIÈRE").critere("Période", titre)
                    .texte("Jour", x -> LocalDate.parse(x.getJour()).format(FR))
                    .texte("Matricule", commonTasks.dto.RhPresenceDTO::getMatricule)
                    .texte("Employé", commonTasks.dto.RhPresenceDTO::getEmploye)
                    .texte("Prévu", commonTasks.dto.RhPresenceDTO::getPrevu)
                    .texte("Pointages", commonTasks.dto.RhPresenceDTO::getPointages)
                    .texte("Entrée", commonTasks.dto.RhPresenceDTO::getEntree)
                    .texte("Sortie", commonTasks.dto.RhPresenceDTO::getSortie)
                    .nombre("Présence (min)", commonTasks.dto.RhPresenceDTO::getMinutesPresence)
                    .nombre("Retard (min)", commonTasks.dto.RhPresenceDTO::getRetard)
                    .nombre("Départ anticipé (min)", commonTasks.dto.RhPresenceDTO::getDepartAnticipe)
                    .nombre("Heures sup. (min)", commonTasks.dto.RhPresenceDTO::getHeuresSup)
                    .texte("Absence", commonTasks.dto.RhPresenceDTO::getAbsence)
                    .texte("Anomalies", commonTasks.dto.RhPresenceDTO::getAnomalies)
                    .construire(pointages.presences(p[0], p[1], employeId));
        } else {
            data = new rest.report.excel.ClasseurExcel<commonTasks.dto.RhTableauDTO>("Tableau RH")
                    .titre("RESSOURCES HUMAINES - RETARDS, ABSENCES, HEURES SUPPLÉMENTAIRES").critere("Période", titre)
                    .texte("Matricule", commonTasks.dto.RhTableauDTO::getMatricule)
                    .texte("Employé", commonTasks.dto.RhTableauDTO::getEmploye)
                    .nombre("Jours prévus", commonTasks.dto.RhTableauDTO::getJoursPrevus)
                    .nombre("Jours présents", commonTasks.dto.RhTableauDTO::getJoursPresents)
                    .nombre("Absences justifiées (j)", commonTasks.dto.RhTableauDTO::getJoursAbsenceJustifiee)
                    .nombre("Absences non justifiées", commonTasks.dto.RhTableauDTO::getAbsencesNonJustifiees)
                    .nombre("Retards", commonTasks.dto.RhTableauDTO::getRetards)
                    .nombre("Minutes de retard", commonTasks.dto.RhTableauDTO::getMinutesRetard)
                    .nombre("Départs anticipés", commonTasks.dto.RhTableauDTO::getDepartsAnticipes)
                    .nombre("Heures prévues (min)", commonTasks.dto.RhTableauDTO::getMinutesPrevues)
                    .nombre("Présence (min)", commonTasks.dto.RhTableauDTO::getMinutesPresence)
                    .nombre("Heures sup. (min)", commonTasks.dto.RhTableauDTO::getHeuresSup)
                    .nombre("Anomalies", commonTasks.dto.RhTableauDTO::getAnomalies)
                    .construire(pointages.tableau(p[0], p[1], employeId));
        }
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=" + (detail ? "presence" : "tableau_rh") + ".xlsx")
                .build();
    }

    /** Tableau en PDF, ouvert dans l'onglet (inline). */
    @GET
    @Path("tableau/pdf")
    @Produces("application/pdf")
    public Response tableauPdf(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("employeId") String employeId) {
        if (controle() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate[] p = periode(du, au);
        java.util.Map<String, Object> parametres = reportUtil.officineData(utilisateur());
        parametres.put("P_H_CLT_INFOS",
                "RETARDS, ABSENCES ET HEURES SUPPLÉMENTAIRES — du " + p[0].format(FR) + " au " + p[1].format(FR));
        String url = reportUtil.buildReport(parametres, "rh_tableau", pointages.tableau(p[0], p[1], employeId));
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf").header("Content-Disposition", "inline; filename=tableau_rh.pdf")
                .build();
    }
}
