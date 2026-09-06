/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.ApplicationEvent;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportBusinessException;
import rest.service.SupportEventService;
import rest.service.dto.SupportEventDTO;
import util.Constant;

/**
 * Journal des evenements applicatifs du Centre de Support : consultation, collecte des erreurs frontend et creation de
 * ticket depuis un evenement.
 *
 * @author koben
 */
@Path("v1/support/events")
@Produces("application/json")
@Consumes("application/json")
public class SupportEventRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SupportEventService supportEventService;
    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;

    @GET
    public Response findAll(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit, @QueryParam("niveau") String niveau,
            @QueryParam("query") String query) {
        // « TOUS » est le libelle de la liste deroulante, pas un niveau : il vaut absence de filtre.
        String filtreNiveau = "TOUS".equalsIgnoreCase(niveau) ? "" : niveau;
        List<ApplicationEvent> data = supportEventService.findAll(start, limit, filtreNiveau, query);
        return Response.ok()
                .entity(ResultFactory.getSuccessResult(data, supportEventService.count(filtreNiveau, query))).build();
    }

    @POST
    public Response collect(SupportEventDTO dto) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (dto == null || StringUtils.isBlank(dto.getMessageCourt())) {
            return Response.ok().entity(ResultFactory.getFailResult("Message obligatoire")).build();
        }
        // Libelle utilisateur complete par l'IP et le nom du poste qui constate l'evenement.
        supportEventService.record(dto,
                util.PosteClient.utilisateurAvecPoste(
                        StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                                + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")",
                        servletRequest));
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    /**
     * Export Excel minimaliste du journal : l'essentiel de chaque evenement sur une ligne (dates, niveau, module,
     * message, ecran, occurrences, utilisateur, fil d'Ariane) et, pour les erreurs, le debut du detail (pile d'appels)
     * pour que le fichier suffise a une analyse a distance sans acces au serveur.
     *
     * @param niveau
     *            filtre de niveau (vide = tous)
     * @param limit
     *            nombre maximal d'evenements (defaut 500, plafond 2000), les plus recents d'abord
     */
    @GET
    @Path("export/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam("niveau") String niveau, @QueryParam("query") String query,
            @DefaultValue("500") @QueryParam("limit") int limit) throws java.io.IOException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int plafond = Math.max(1, Math.min(limit, 2000));
        // L'export doit refleter ce que l'utilisateur a sous les yeux : meme niveau ET meme recherche.
        List<ApplicationEvent> data = supportEventService.findAll(0, plafond,
                "TOUS".equalsIgnoreCase(niveau) ? "" : niveau, query);
        java.time.format.DateTimeFormatter format = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String[] entetes = { "Première apparition", "Dernière", "Occ.", "Niveau", "Module", "Type", "Message",
                "Écran / URL", "Utilisateur", "Fil d'Ariane", "Détail (début)" };
        List<String[]> lignes = new java.util.ArrayList<>();
        int detailsLus = 0;
        for (ApplicationEvent e : data) {
            String detail = "";
            boolean erreur = "ERROR".equalsIgnoreCase(e.getNiveau()) || "FATAL".equalsIgnoreCase(e.getNiveau());
            // le detail vient d'un fichier : borne a 150 lectures pour garder l'export rapide
            if (erreur && StringUtils.isNotBlank(e.getLogRef()) && detailsLus < 150) {
                detailsLus++;
                detail = StringUtils.abbreviate(
                        StringUtils.defaultString(supportEventService.readLogContent(e.getId())).replace("\r", ""),
                        800);
            }
            lignes.add(new String[] { e.getCreatedAt() != null ? e.getCreatedAt().format(format) : "",
                    e.getLastSeenAt() != null ? e.getLastSeenAt().format(format) : "",
                    String.valueOf(e.getOccurrences()), StringUtils.defaultString(e.getNiveau()),
                    StringUtils.defaultString(e.getModule()), StringUtils.defaultString(e.getType()),
                    StringUtils.defaultString(e.getMessageCourt()), StringUtils.defaultString(e.getUrlOuEcran()),
                    StringUtils.defaultString(e.getUtilisateur()),
                    StringUtils.abbreviate(StringUtils.defaultString(e.getPayloadJson()), 400), detail });
        }
        byte[] bytes = reportExcelExportService.createSimpleExcelReport("Journal du support", entetes, lignes);
        return Response.ok(bytes).header("Content-Disposition", "attachment; filename=\"journal_support_"
                + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + ".xls\"")
                .build();
    }

    @GET
    @Path("{id}/occurrences")
    public Response occurrences(@PathParam("id") String id) {
        List<String> dates = supportEventService.findOccurrences(id);
        return Response.ok().entity(ResultFactory.getSuccessResult(dates, dates.size())).build();
    }

    @GET
    @Path("recap")
    public Response recap(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd) {
        List<java.util.Map<String, Object>> data = supportEventService.recap(dtStart, dtEnd);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    /**
     * Export Excel de la liste des evenements telle qu'elle est affichee (point 2, onglet « Evenements captures » de
     * l'Historique) : memes colonnes que la grille, memes criteres, et TOUT le resultat.
     *
     * <p>
     * Distinct de {@code export/excel}, qui est un export d'analyse : celui-la lit en plus le detail des erreurs dans
     * les fichiers de log, ce qui impose de le borner.
     */
    @GET
    @Path("export/liste")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportListe(@QueryParam("niveau") String niveau, @QueryParam("query") String query)
            throws java.io.IOException {
        String filtreNiveau = "TOUS".equalsIgnoreCase(niveau) ? "" : niveau;
        List<ApplicationEvent> data = supportEventService.findAll(0, 0, filtreNiveau, query);
        byte[] contenu = new rest.report.excel.ClasseurExcel<ApplicationEvent>("Événements")
                .titre("CENTRE DE SUPPORT - ÉVÉNEMENTS CAPTURÉS").critere("Niveau", filtreNiveau)
                .critere("Recherche", query).dateHeure("1ère apparition", ApplicationEvent::getCreatedAt)
                .dateHeure("Dernière", ApplicationEvent::getLastSeenAt).texte("Module", ApplicationEvent::getModule)
                .texte("Type", ApplicationEvent::getType).texte("Niveau", ApplicationEvent::getNiveau)
                .texte("Message", ApplicationEvent::getMessageCourt)
                .nombre("Occurrences", ApplicationEvent::getOccurrences)
                .texte("Écran / URL", ApplicationEvent::getUrlOuEcran)
                .texte("Utilisateur", ApplicationEvent::getUtilisateur).construire(data);
        return rest.report.excel.NomFichierExport.reponse(contenu, "evenements_support");
    }

    /** Export Excel du recapitulatif analytique (point 2, onglet « Recap » de l'Historique). */
    @GET
    @Path("recap/export/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response recapExportExcel(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd)
            throws java.io.IOException {
        List<java.util.Map<String, Object>> data = supportEventService.recap(dtStart, dtEnd);
        byte[] contenu = new rest.report.excel.ClasseurExcel<java.util.Map<String, Object>>("Récapitulatif")
                .titre("CENTRE DE SUPPORT - RÉCAPITULATIF DES ANOMALIES").critere("Du", dtStart).critere("Au", dtEnd)
                .texte("Module", m -> m.get("module")).texte("Type", m -> m.get("type"))
                .texte("Niveau", m -> m.get("niveau")).nombre("Nb anomalies", m -> m.get("nbAnomalies"))
                .nombre("Total occurrences", m -> m.get("totalOccurrences"))
                .texte("Dernière apparition", m -> m.get("derniereApparition")).construire(data);
        return rest.report.excel.NomFichierExport.reponse(contenu, "recap_support");
    }

    @GET
    @Path("purge/count")
    public Response purgeCount(@QueryParam("niveaux") String niveaux, @QueryParam("avantLe") String avantLe,
            @DefaultValue("false") @QueryParam("inclureTickets") boolean inclureTickets) {
        long count = supportEventService.countForPurge(niveaux, avantLe, inclureTickets);
        return Response.ok().entity(ResultFactory.getSuccessResult(count, 1)).build();
    }

    @POST
    @Path("purge")
    public Response purge(@QueryParam("niveaux") String niveaux, @QueryParam("avantLe") String avantLe,
            @DefaultValue("false") @QueryParam("inclureTickets") boolean inclureTickets) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int purged = supportEventService.purgeSelective(niveaux, avantLe, inclureTickets,
                StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " " + StringUtils.trimToEmpty(user.getStrLASTNAME())
                        + " (" + user.getStrLOGIN() + ")");
        return Response.ok().entity(ResultFactory.getSuccessResultMsg(purged + " événement(s) supprimé(s)")).build();
    }

    @POST
    @Path("{id}/ticket")
    public Response createTicket(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        try {
            String numero = supportEventService.createTicketFromEvent(id, user);
            return Response.ok().entity(ResultFactory.getSuccessResultMsg("Ticket " + numero)).build();
        } catch (SupportBusinessException e) {
            return Response.ok().entity(ResultFactory.getFailResult(e.getMessage())).build();
        }
    }

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }
}
