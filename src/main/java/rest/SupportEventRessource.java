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
        supportEventService.record(dto, StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")");
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
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
