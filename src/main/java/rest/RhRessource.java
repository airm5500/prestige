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
    /** demande 52 : terminal de pointage seulement (lecture des employes, pointage, photo, empreintes) */
    static final String POINTER = "P_RH_POINTER";

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

    /** Retours du 25/10 (point 12) : droit de valider lu en base, un droit accorde en cours de session compte. */
    private boolean peutValider() {
        TUser u = utilisateur();
        return u != null && service.aLeDroit(u.getLgUSERID(), VALIDER);
    }

    /** Sans droit de validation : seulement ses demandes (son employe, ou saisies par lui). */
    private String limiteAbsences() {
        return peutValider() ? null : utilisateur().getLgUSERID();
    }

    private Response controle() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (autorise(PRIVILEGE)) {
            return null;
        }
        /* demande 52 : un compte « terminal » (P_RH_POINTER seul) recoit un refus de droit explicite */
        return autorise(POINTER) ? interdit("Ressources humaines")
                : refus("Vous n'avez pas accès aux ressources humaines.");
    }

    /** Routes du terminal de pointage (demande 52) : P_SM_RH ou P_RH_POINTER. */
    private Response controlePointer() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return autorise(PRIVILEGE) || autorise(POINTER) ? null
                : refus("Vous n'avez pas accès aux ressources humaines.");
    }

    private static Response interdit(String libelle) {
        String m = "Droit manquant : " + libelle;
        return Response.status(Response.Status.FORBIDDEN)
                .entity(new JSONObject().put("success", false).put("interdit", true).put("msg", m).toString()).build();
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
        Response r = controlePointer();
        return r != null ? r
                : ok(new JSONObject().put("success", true).put("pointer", true).put("gerer", autorise(PRIVILEGE))
                        .put("valider", peutValider()).put("photoRetentionJours", pointages.photoRetentionJours()));
    }

    /* ---------------------------------------------------------------- employes */

    @GET
    @Path("employes")
    public Response employes(@QueryParam("query") String query,
            @DefaultValue("false") @QueryParam("inactifs") boolean inactifs) {
        Response r = controlePointer();
        if (r != null) {
            return r;
        }
        JSONObject o = service.employes(query, inactifs);
        if (!autorise(PRIVILEGE)) {
            /* demande 52 : le terminal ne lit que l'identite utile au pointage */
            org.json.JSONArray lu = o.optJSONArray("data");
            org.json.JSONArray reduit = new org.json.JSONArray();
            for (int i = 0; lu != null && i < lu.length(); i++) {
                JSONObject e = lu.getJSONObject(i);
                JSONObject x = new JSONObject();
                for (String k : new String[] { "id", "matricule", "nom", "prenoms", "badge", "statut" }) {
                    x.put(k, e.opt(k));
                }
                reduit.put(x);
            }
            o.put("data", reduit);
        }
        return ok(o);
    }

    /** Cree et rattache les employes des utilisateurs actifs (retours du 07/10), appele a l'ouverture de l'ecran. */
    @POST
    @Path("employes/synchroniser")
    public Response synchroniser() {
        Response r = controle();
        return r != null ? r : ok(service.synchroniserUtilisateurs());
    }

    @POST
    @Path("employes")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerEmploye(String c) {
        Response r = controle();
        return r != null ? r : ok(service.enregistrerEmploye(corps(c), utilisateur()));
    }

    /* ---------------------------------------------------------------- badges (retours du 13/10, point 3) */

    @EJB
    private rest.service.impl.RhBadgeService badges;

    @GET
    @Path("badges")
    public Response badges(@QueryParam("query") String query,
            @DefaultValue("false") @QueryParam("inactifs") boolean inactifs) {
        Response r = controle();
        return r != null ? r : ok(badges.badges(query, inactifs));
    }

    @POST
    @Path("badges")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerBadge(String c) {
        Response r = controle();
        return r != null ? r : ok(badges.enregistrer(corps(c), utilisateur()));
    }

    @POST
    @Path("badges/{id}/regenerer")
    public Response regenererBadge(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : ok(badges.regenererQr(id));
    }

    @POST
    @Path("badges/{id}/desactiver")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response desactiverBadge(@PathParam("id") String id, String c) {
        Response r = controle();
        return r != null ? r : ok(badges.desactiver(id, corps(c).optString("motif"), utilisateur()));
    }

    /** Cartes des badges choisis (actifs), en PDF ouvert dans l'onglet ; chaque impression est comptee. */
    @GET
    @Path("badges/pdf")
    @Produces("application/pdf")
    public Response badgesPdf(@QueryParam("ids") String ids, @DefaultValue("QR") @QueryParam("code") String code,
            @DefaultValue(util.Constant.BADGE_FORMAT_A4) @QueryParam("format") String format) {
        if (controle() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        java.util.List<String> liste = new java.util.ArrayList<>();
        for (String id : StringUtils.defaultString(ids).split(",")) {
            if (StringUtils.isNotBlank(id) && liste.size() < 200) {
                liste.add(id.trim());
            }
        }
        try {
            // demande du 16/10 : QR code par defaut, code-barres (CODE128) au choix
            // demande du 17/10 : une carte par page pour une imprimante a cartes PVC, planche A4 sinon
            byte[] pdf = rest.service.impl.BadgePdf.ecrire(badges.pourImpression(liste, !"CODE128".equals(code)),
                    badges.officine(), util.Constant.BADGE_FORMAT_CARTE.equals(format));
            return Response.ok(pdf, "application/pdf").header("Content-Disposition", "inline; filename=badges.pdf")
                    .build();
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(RhRessource.class.getName()).log(java.util.logging.Level.SEVERE,
                    "badges pdf", e);
            return Response.serverError().build();
        }
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

    /* ---------------------------------------------------------------- equipes (retours du 10/10) */

    @GET
    @Path("equipes")
    public Response equipes() {
        Response r = controle();
        return r != null ? r : ok(service.equipes());
    }

    @POST
    @Path("equipes")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerEquipe(String c) {
        Response r = controle();
        return r != null ? r : ok(service.enregistrerEquipe(corps(c)));
    }

    @DELETE
    @Path("equipes/{id}")
    public Response supprimerEquipe(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : ok(service.supprimerEquipe(id));
    }

    @POST
    @Path("equipes/{id}/appliquer")
    public Response appliquerEquipe(@PathParam("id") String id, @QueryParam("semaine") String semaine,
            @DefaultValue("false") @QueryParam("remplacer") boolean remplacer) {
        Response r = controle();
        return r != null ? r
                : ok(service.appliquerEquipe(id, date(semaine, LocalDate.now()), remplacer, utilisateur()));
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
        return ok(service.absences(d, a, employeId, statut, limiteAbsences()));
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
        if (!peutValider()) {
            return refus("Vous n'avez pas le droit de valider les congés et absences.");
        }
        return ok(service.deciderAbsence(id, statut, utilisateur()));
    }

    @DELETE
    @Path("absences/{id}")
    public Response supprimer(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : ok(service.supprimerAbsence(id, utilisateur(), peutValider()));
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
        Response r = controlePointer();
        return r != null ? r : ok(pointages.saisirPointage(corps(c), utilisateur()));
    }

    /**
     * Photo de controle d'un pointage par badge (point 31) : multipart, champ « photo » (JPEG, 150 Ko et 1024 px au
     * plus), champ « prise » facultatif. Le contenu n'est jamais journalise.
     */
    @POST
    @Path("pointages/{id}/photo")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @SuppressWarnings("unchecked")
    public Response envoyerPhoto(@PathParam("id") String id) {
        Response r = controlePointer();
        if (r != null) {
            return r;
        }
        try {
            org.apache.commons.fileupload.servlet.ServletFileUpload upload = new org.apache.commons.fileupload.servlet.ServletFileUpload(
                    new org.apache.commons.fileupload.disk.DiskFileItemFactory());
            // garde-fou : rien au-dela de 2 Mo n'est lu (la limite metier de 150 Ko est controlee ensuite)
            upload.setSizeMax(2L * 1024 * 1024);
            byte[] photo = null;
            String prise = null;
            for (org.apache.commons.fileupload.FileItem item : (List<org.apache.commons.fileupload.FileItem>) upload
                    .parseRequest(servletRequest)) {
                if (item.isFormField() && "prise".equals(item.getFieldName())) {
                    prise = item.getString("UTF-8");
                } else if (!item.isFormField() && "photo".equals(item.getFieldName())) {
                    photo = item.get();
                }
            }
            return ok(pointages.enregistrerPhoto(id, photo, prise, utilisateur()));
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException e) {
            return refus("Photo trop lourde : 150 Ko au plus.");
        } catch (Exception e) {
            return refus("Lecture de la photo impossible.");
        }
    }

    /** Photo de controle (droit P_SM_RH), jamais mise en cache ; chaque consultation est tracee (sans l'image). */
    @GET
    @Path("pointages/{id}/photo")
    @Produces({ "image/jpeg", MediaType.APPLICATION_JSON })
    public Response lirePhoto(@PathParam("id") String id) {
        Response r = controle();
        if (r != null) {
            return Response.status(Response.Status.FORBIDDEN).type(MediaType.APPLICATION_JSON).entity(r.getEntity())
                    .build();
        }
        byte[] photo = pointages.photo(id);
        java.util.logging.Logger.getLogger(RhRessource.class.getName()).log(java.util.logging.Level.INFO,
                "photo de pointage consultee pointage={0} par={1} trouvee={2}",
                new Object[] { id, utilisateur().getLgUSERID(), photo != null });
        if (photo == null) {
            return Response
                    .status(Response.Status.NOT_FOUND).type(MediaType.APPLICATION_JSON).entity(new JSONObject()
                            .put("success", false).put("msg", "Aucune photo pour ce pointage.").toString())
                    .header("Cache-Control", "no-store").build();
        }
        return Response.ok(photo, "image/jpeg").header("Cache-Control", "no-store").build();
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

    /* ---------------------------------------------------------------- L13 : telephones */

    @EJB
    private rest.service.MobileService mobile;

    /** Code de pointage du moment (QR affiche a l'officine, change chaque minute) et reglages. */
    @GET
    @Path("mobile/code")
    public Response codePointage() {
        Response r = controle();
        return r != null ? r : ok(mobile.codePointage());
    }

    /* ------------------------------------- demande 51 : pointer avec la session de l'application, sans P_SM_RH */

    private Response sansSession() {
        return utilisateur() == null ? Response.status(Response.Status.UNAUTHORIZED)
                .entity(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build() : null;
    }

    /** Le compte DE LA SESSION et son employe (meme corps que v1/mobile/moi) ; aucun identifiant n'est lu. */
    @GET
    @Path("moi")
    public Response moi() {
        Response r = sansSession();
        return r != null ? r : ok(mobile.moi(utilisateur()));
    }

    /**
     * {sens?, code?, latitude?, longitude?, precision?} : memes controles que v1/mobile/pointages (QR du moment,
     * position, moins de 2 minutes, sens automatique). Le pointage va TOUJOURS a l'employe de la session : un employeId
     * ou un login dans le corps est ignore. Meme X-Client-Ref = meme reponse, un seul pointage.
     */
    @POST
    @Path("moi/pointages")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response pointerMoi(String c, @javax.ws.rs.HeaderParam("X-Client-Ref") String ref) {
        Response r = sansSession();
        if (r != null) {
            return r;
        }
        TUser u = utilisateur();
        return Response.ok(clientRef.uneFois(ref, rest.service.mobile.MobileClientRefService.TYPE_POINTAGE_SESSION,
                () -> mobile.pointer(u, null, corps(c)), o -> o.optString("heure", null))).build();
    }

    /** Mes pointages des 16 dernieres heures. */
    @GET
    @Path("moi/pointages")
    public Response mesPointages() {
        Response r = sansSession();
        return r != null ? r : ok(mobile.mesPointages(utilisateur()));
    }

    @GET
    @Path("mobile/terminaux")
    public Response terminaux() {
        Response r = controle();
        return r != null ? r : ok(mobile.terminaux());
    }

    @POST
    @Path("mobile/terminaux/{id}/{action}")
    public Response changerTerminal(@PathParam("id") String id, @PathParam("action") String action) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        if (!"retirer".equals(action) && !"reactiver".equals(action)) {
            return refus("Action inconnue.");
        }
        return ok(mobile.changerTerminal(id, "reactiver".equals(action), utilisateur()));
    }

    @POST
    @Path("mobile/deconnecter-tous")
    public Response deconnecterTous() {
        Response r = controle();
        return r != null ? r : ok(mobile.revoquerTousLesJetons());
    }

    /* ---------------------------------------------------------------- empreintes partagees (demandes serveur, 43) */

    @EJB
    private rest.service.EmpreinteService empreintes;
    @EJB
    private rest.service.mobile.MobileClientRefService clientRef;

    /**
     * Enrolement : {modeles:[base64], format, capteur, doigt, consentement:{le, par}} ; meme X-Client-Ref = meme
     * reponse.
     */
    @POST
    @Path("employes/{id}/empreintes")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enrolerEmpreintes(@PathParam("id") String id, String c,
            @javax.ws.rs.HeaderParam("X-Client-Ref") String ref) {
        Response r = controle();
        return r != null ? r
                : Response.ok(clientRef.uneFois(ref, rest.service.mobile.MobileClientRefService.TYPE_EMPREINTE,
                        () -> empreintes.enroler(id, corps(c), utilisateur()), o -> o.optString("nombre", null)))
                        .build();
    }

    /** Gabarits des employes actifs crees depuis « depuis » pour ce format, et suppressions a appliquer. */
    @GET
    @Path("empreintes")
    public Response lireEmpreintes(@QueryParam("depuis") String depuis, @QueryParam("format") String format) {
        Response r = controlePointer();
        return r != null ? r : Response.ok(empreintes.lire(depuis, format, utilisateur()))
                .header("Cache-Control", "no-store").build();
    }

    @DELETE
    @Path("employes/{id}/empreintes")
    public Response supprimerEmpreintes(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : ok(empreintes.supprimer(id, utilisateur()));
    }

    /* ---------------------------------------------------------------- editions PDF des onglets (retours du 10/10) */

    private static String hm(int minutes) {
        return minutes <= 0 ? "" : String.format("%d h %02d", minutes / 60, minutes % 60);
    }

    private static String jj(String iso) {
        LocalDate d = date(iso, null);
        return d == null ? StringUtils.defaultString(iso) : d.format(FR);
    }

    private static final java.util.Map<String, String> LIBELLES = java.util.Map.ofEntries(
            java.util.Map.entry("TRAVAIL", "Travail"), java.util.Map.entry("GARDE", "Garde"),
            java.util.Map.entry("REPOS", "Repos"), java.util.Map.entry("CONGE", "Congé"),
            java.util.Map.entry("MALADIE", "Maladie"), java.util.Map.entry("AUTRE", "Autre"),
            java.util.Map.entry("DEMANDE", "Demandée"), java.util.Map.entry("VALIDE", "Validée"),
            java.util.Map.entry("REFUSE", "Refusée"), java.util.Map.entry("ACTIF", "Actif"),
            java.util.Map.entry("INACTIF", "Inactif"), java.util.Map.entry("MATIN", "matin"),
            java.util.Map.entry("APRES_MIDI", "après-midi"), java.util.Map.entry("DECONNEXION", "déconnexion"),
            java.util.Map.entry("NOUVELLE_CONNEXION", "nouvelle connexion"));

    private static String l(String code) {
        return LIBELLES.getOrDefault(StringUtils.defaultString(code), StringUtils.defaultString(code));
    }

    /**
     * Edition PDF (modele rh_liste.jrxml) d'un onglet, memes criteres que l'ecran : planning (semaine), absences (du,
     * au, statut), employes (query, inactifs), connexions (du, au, userId), presence (jour), imports (lots de
     * pointage), telephones (terminaux mobiles).
     */
    @GET
    @Path("edition/{onglet}/pdf")
    @Produces("application/pdf")
    public Response editionOnglet(@PathParam("onglet") String onglet, @QueryParam("semaine") String semaine,
            @QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("statut") String statut,
            @QueryParam("query") String query, @DefaultValue("false") @QueryParam("inactifs") boolean inactifs,
            @QueryParam("userId") String userId, @QueryParam("jour") String jour) {
        if (controle() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        String titre, sousTitre = "";
        String[] t;
        java.util.List<rest.report.LigneEdition> lignes = new java.util.ArrayList<>();
        switch (StringUtils.defaultString(onglet)) {
        case "planning": {
            JSONObject pl = service.planning(date(semaine, LocalDate.now()));
            JSONArray jours = pl.getJSONArray("jours");
            titre = "PLANNING DE LA SEMAINE";
            sousTitre = "Du " + jj(jours.getString(0)) + " au " + jj(jours.getString(6));
            String[] noms = { "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim" };
            t = new String[] { "Employé", "", "", "", "", "", "", "", "Heures" };
            for (int i = 0; i < 7; i++) {
                t[i + 1] = noms[i] + " " + jj(jours.getString(i)).substring(0, 5);
            }
            JSONArray d = pl.getJSONArray("data");
            for (int k = 0; k < d.length(); k++) {
                JSONObject r = d.getJSONObject(k);
                String[] c = new String[9];
                c[0] = r.optString("employe")
                        + (r.optString("poste").isEmpty() ? "" : " (" + r.optString("poste") + ")");
                for (int i = 0; i < 7; i++) {
                    JSONObject j = r.optJSONObject("j" + i);
                    String abs = r.optString("a" + i, "");
                    String txt = j == null ? "" : l(j.optString("type")) + ("REPOS".equals(j.optString("type")) ? ""
                            : " " + j.optString("debut") + "-" + j.optString("fin"));
                    c[i + 1] = (txt + (abs.isEmpty() ? "" : (txt.isEmpty() ? "" : " / ") + l(abs.split(" ")[0])))
                            .trim();
                }
                c[8] = hm(r.optInt("minutes"));
                lignes.add(new rest.report.LigneEdition(c));
            }
            break;
        }
        case "absences": {
            LocalDate[] p = periode(du, au);
            JSONArray d = service.absences(p[0], p[1], null, StringUtils.trimToNull(statut), limiteAbsences())
                    .getJSONArray("data");
            titre = "CONGÉS ET ABSENCES";
            sousTitre = "Du " + p[0].format(FR) + " au " + p[1].format(FR)
                    + (StringUtils.isBlank(statut) ? "" : " · " + l(statut.trim().toUpperCase()));
            t = new String[] { "Employé", "Type", "Du", "Au", "Jours", "Motif", "Statut", "Demandé par", "Décidé par" };
            for (int k = 0; k < d.length(); k++) {
                JSONObject r = d.getJSONObject(k);
                lignes.add(new rest.report.LigneEdition(r.optString("employe"), l(r.optString("type")),
                        jj(r.optString("debut")) + (r.optString("demiJournee").isEmpty() ? ""
                                : " (" + l(r.optString("demiJournee")) + ")"),
                        jj(r.optString("fin")), String.valueOf(r.opt("jours")).replace('.', ','), r.optString("motif"),
                        l(r.optString("statut")), r.optString("demandePar"), r.optString("decidePar")));
            }
            break;
        }
        case "employes": {
            JSONArray d = service.employes(query, inactifs).getJSONArray("data");
            titre = "EMPLOYÉS";
            sousTitre = (StringUtils.isBlank(query) ? "Tous" : "Recherche « " + query.trim() + " »")
                    + (inactifs ? ", inactifs compris" : ", actifs");
            t = new String[] { "Employé", "Matricule", "Poste", "Badge", "Téléphone", "Entrée", "Sortie", "Utilisateur",
                    "Statut" };
            for (int k = 0; k < d.length(); k++) {
                JSONObject r = d.getJSONObject(k);
                lignes.add(new rest.report.LigneEdition((r.optString("nom") + " " + r.optString("prenoms")).trim(),
                        r.optString("matricule"), r.optString("poste"), r.optString("badge"), r.optString("telephone"),
                        jj(r.optString("dtEntree")), jj(r.optString("dtSortie")), r.optString("login"),
                        l(r.optString("statut"))));
            }
            break;
        }
        case "connexions": {
            LocalDate a = date(au, LocalDate.now()), b = date(du, a.minusDays(6));
            JSONArray d = service.sessions(b, a, userId).getJSONArray("data");
            titre = "CONNEXIONS";
            sousTitre = "Du " + b.format(FR) + " au " + a.format(FR)
                    + (StringUtils.isBlank(userId) ? "" : " · un utilisateur");
            t = new String[] { "Utilisateur", "Identifiant", "Connexion", "Déconnexion", "Durée", "Fin par", "Poste",
                    "Adresse", "" };
            for (int k = 0; k < d.length(); k++) {
                JSONObject r = d.getJSONObject(k);
                lignes.add(new rest.report.LigneEdition(r.optString("utilisateur"), r.optString("login"),
                        horodatage(r.optString("debut")),
                        r.optBoolean("ouverte") ? "en cours" : horodatage(r.optString("fin")), hm(r.optInt("minutes")),
                        l(r.optString("finPar")), r.optString("poste"), r.optString("ip"), ""));
            }
            break;
        }
        case "presence": {
            LocalDate j = date(jour, LocalDate.now());
            titre = "PRÉSENCE DU JOUR";
            sousTitre = j.format(FR);
            t = new String[] { "Employé", "Matricule", "Prévu", "Entrée", "Sortie", "Présence", "Retard (min)",
                    "Absence", "Anomalies" };
            for (commonTasks.dto.RhPresenceDTO r : pointages.presences(j, j, null)) {
                lignes.add(new rest.report.LigneEdition(r.getEmploye(), r.getMatricule(), r.getPrevuTexte(),
                        r.getEntree(), r.getSortie(), r.getPresenceTexte(),
                        r.getRetard() > 0 ? String.valueOf(r.getRetard()) : "", r.getAbsence(), r.getAnomalies()));
            }
            break;
        }
        case "imports": {
            JSONArray d = pointages.lots(100).getJSONArray("data");
            titre = "IMPORTS DE POINTAGE";
            sousTitre = "100 derniers imports";
            t = new String[] { "Fichier", "Date", "Pointeuse", "Lues", "Retenues", "Rejetées", "Déjà connues", "Par",
                    "" };
            for (int k = 0; k < d.length(); k++) {
                JSONObject r = d.getJSONObject(k);
                lignes.add(new rest.report.LigneEdition(r.optString("fichier"), horodatage(r.optString("date")),
                        r.optString("marque"), String.valueOf(r.optInt("lues")), String.valueOf(r.optInt("retenues")),
                        String.valueOf(r.optInt("rejetees")), String.valueOf(r.optInt("dejaConnues")),
                        r.optString("par"), ""));
            }
            break;
        }
        case "telephones": {
            JSONArray d = mobile.terminaux().getJSONArray("data");
            titre = "TÉLÉPHONES DE POINTAGE";
            t = new String[] { "Utilisateur", "Identifiant", "Appareil", "Statut", "Enregistré le", "Dernière activité",
                    "Adresse", "", "" };
            for (int k = 0; k < d.length(); k++) {
                JSONObject r = d.getJSONObject(k);
                lignes.add(new rest.report.LigneEdition(r.optString("utilisateur"), r.optString("login"),
                        r.optString("appareil"), r.optString("statut"), horodatage(r.optString("creeLe")),
                        horodatage(r.optString("derniereActivite")), r.optString("adresse"), "", ""));
            }
            break;
        }
        default:
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        java.util.Map<String, Object> parametres = reportUtil.officineData(utilisateur());
        parametres.put("P_H_CLT_INFOS", titre + " (" + lignes.size() + ")");
        parametres.put("P_SOUS_TITRE", sousTitre);
        for (int i = 0; i < 9; i++) {
            parametres.put("P_T" + (i + 1), i < t.length ? t[i] : "");
        }
        String url = reportUtil.buildReport(parametres, "rh_liste", lignes, "rh_" + onglet);
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=rh_" + onglet + ".pdf").build();
    }

    /** « 2026-10-10T08:15:00 » ou « 2026-10-10 08:15 » -> « 10/10/2026 08:15 ». */
    private static String horodatage(String v) {
        if (v == null || v.length() < 10) {
            return StringUtils.defaultString(v);
        }
        return jj(v.substring(0, 10)) + (v.length() >= 16 ? " " + v.substring(11, 16) : "");
    }
}
