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
import rest.service.SupportBusinessException;
import rest.service.SupportTicketService;
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

    @GET
    public Response findAll(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit, @QueryParam("statut") String statut) {
        List<SupportTicket> data = supportTicketService.findAll(start, limit, statut);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, supportTicketService.count(statut))).build();
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
