/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.SupportTicket;
import dal.SupportTicketMessage;
import dal.TUser;
import java.util.List;
import java.util.Map;
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
import rest.report.ReportUtil;
import rest.service.SupportBusinessException;
import rest.service.SupportTicketService;
import rest.service.dto.TicketPrintDTO;
import util.Constant;

/**
 * Tickets du Centre de Support : consultation, creation manuelle, changement de statut et conversation.
 *
 * @author koben
 */
@Path("v1/support/tickets")
@Produces("application/json")
@Consumes("application/json")
public class SupportTicketRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SupportTicketService supportTicketService;
    @EJB
    private ReportUtil reportUtil;

    @GET
    public Response findAll(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit, @QueryParam("statut") String statut) {
        List<SupportTicket> data = supportTicketService.findAll(start, limit, statut);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, supportTicketService.count(statut))).build();
    }

    /**
     * Export Excel des tickets (point 2) : meme filtre de statut que l'ecran, mais tout le resultat et non la seule
     * page affichee.
     */
    @GET
    @Path("export/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportExcel(@QueryParam("statut") String statut) throws java.io.IOException {
        List<SupportTicket> data = supportTicketService.tous(statut);
        byte[] contenu = new rest.report.excel.ClasseurExcel<SupportTicket>("Tickets")
                .titre("CENTRE DE SUPPORT - TICKETS").critere("Statut", statut)
                .texte("Numéro", SupportTicket::getNumero).dateHeure("Créé le", SupportTicket::getCreatedAt)
                .dateHeure("Mis à jour", SupportTicket::getModifiedAt).texte("Sujet", SupportTicket::getSujet)
                .texte("Module", SupportTicket::getModule).texte("Type", SupportTicket::getType)
                .texte("Priorité", SupportTicket::getPriorite).texte("Statut", SupportTicket::getStatutTicket)
                .texte("Déclarant", SupportTicket::getUtilisateur).texte("Affecté à", SupportTicket::getAffecteA)
                .texte("Description", SupportTicket::getDescription).construire(data);
        return rest.report.excel.NomFichierExport.reponse(contenu, "tickets_support");
    }

    /**
     * Impression du dictionnaire de suivi des pannes : TOUS les tickets, une ligne par ticket, PDF paysage (modele
     * ticket_support.jrxml). Retourne l'URL du PDF genere.
     */
    @GET
    @Path("print")
    public Response print() {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<SupportTicket> tickets = supportTicketService.findAll(0, Integer.MAX_VALUE, null);
        List<TicketPrintDTO> datas = new java.util.ArrayList<>();
        for (SupportTicket ticket : tickets) {
            datas.add(new TicketPrintDTO(ticket));
        }
        Map<String, Object> parameters = reportUtil.officineData(user);
        parameters.put("P_H_CLT_INFOS", "DICTIONNAIRE DE SUIVI DES PANNES - TICKETS SUPPORT (" + datas.size() + ")");
        String url = reportUtil.buildReport(parameters, "ticket_support", datas);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg(url)).build();
    }

    @POST
    public Response create(SupportTicket payload) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (payload == null || StringUtils.isBlank(payload.getSujet())) {
            return Response.ok().entity(ResultFactory.getFailResult("Le sujet est obligatoire")).build();
        }
        SupportTicket ticket = supportTicketService.createTicket(user, payload.getSujet(), payload.getDescription(),
                payload.getModule(), payload.getType(), payload.getPriorite());
        return Response.ok().entity(ResultFactory.getSuccessResult(ticket, "Ticket " + ticket.getNumero() + " créé", 1))
                .build();
    }

    @POST
    @Path("{id}/statut")
    public Response changeStatut(@PathParam("id") String id, Map<String, String> body) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        try {
            String statut = body != null ? body.get("statut") : null;
            SupportTicket ticket = supportTicketService.changeStatut(id, statut, userLabel(user));
            return Response.ok().entity(ResultFactory.getSuccessResult(ticket, 1)).build();
        } catch (SupportBusinessException e) {
            return Response.ok().entity(ResultFactory.getFailResult(e.getMessage())).build();
        }
    }

    @GET
    @Path("{id}/messages")
    public Response findMessages(@PathParam("id") String id) {
        List<SupportTicketMessage> data = supportTicketService.findMessages(id);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("{id}/messages")
    public Response addMessage(@PathParam("id") String id, Map<String, String> body) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String message = body != null ? body.get("message") : null;
        if (StringUtils.isBlank(message)) {
            return Response.ok().entity(ResultFactory.getFailResult("Le message est obligatoire")).build();
        }
        try {
            SupportTicketMessage ticketMessage = supportTicketService.addMessage(id, message, userLabel(user),
                    SupportTicketMessage.DIRECTION_OFFICINE);
            return Response.ok().entity(ResultFactory.getSuccessResult(ticketMessage, 1)).build();
        } catch (SupportBusinessException e) {
            return Response.ok().entity(ResultFactory.getFailResult(e.getMessage())).build();
        }
    }

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private String userLabel(TUser user) {
        return StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " " + StringUtils.trimToEmpty(user.getStrLASTNAME())
                + " (" + user.getStrLOGIN() + ")";
    }
}
