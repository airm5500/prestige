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
            @DefaultValue("20") @QueryParam("limit") int limit, @QueryParam("niveau") String niveau) {
        List<ApplicationEvent> data = supportEventService.findAll(start, limit, niveau);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, supportEventService.count(niveau))).build();
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
    public Response exportExcel(@QueryParam("niveau") String niveau,
            @DefaultValue("500") @QueryParam("limit") int limit) throws java.io.IOException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int plafond = Math.max(1, Math.min(limit, 2000));
        List<ApplicationEvent> data = supportEventService.findAll(0, plafond,
                "TOUS".equalsIgnoreCase(niveau) ? "" : niveau);
        java.time.format.DateTimeFormatter format = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String[] entetes = { "Première apparition", "Dernière", "Occ.", "Niveau", "Module", "Type", "Message",
                "Écran / URL", "Utilisateur", "Fil d'Ariane / Contexte", "Détail (début)" };
        List<String[]> lignes = new java.util.ArrayList<>();
        int detailsLus = 0;
        for (ApplicationEvent e : data) {
            String detail = "";
            boolean erreur = "ERROR".equalsIgnoreCase(e.getNiveau()) || "FATAL".equalsIgnoreCase(e.getNiveau());
            // le detail vient d'un fichier : borne a 150 lectures pour garder l'export rapide. Quand le fichier a
            // disparu, la lecture rend l'extrait conserve en base, et l'export garde donc de quoi analyser.
            if (erreur && detailsLus < 150) {
                detailsLus++;
                detail = StringUtils.abbreviate(
                        StringUtils.defaultString(supportEventService.readLogContent(e.getId())).replace("\r", ""),
                        4000);
            }
            lignes.add(new String[] { e.getCreatedAt() != null ? e.getCreatedAt().format(format) : "",
                    e.getLastSeenAt() != null ? e.getLastSeenAt().format(format) : "",
                    String.valueOf(e.getOccurrences()), StringUtils.defaultString(e.getNiveau()),
                    StringUtils.defaultString(e.getModule()), StringUtils.defaultString(e.getType()),
                    StringUtils.defaultString(e.getMessageCourt()), StringUtils.defaultString(e.getUrlOuEcran()),
                    StringUtils.defaultString(e.getUtilisateur()),
                    // fil d'Ariane (ecrans) ou explication + contexte metier (serveur) : en entier, c'est
                    // souvent lui qui dit ce que faisait la caissiere juste avant
                    StringUtils.abbreviate(StringUtils.defaultString(e.getPayloadJson()), 4000), detail });
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
