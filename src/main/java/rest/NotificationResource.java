package rest;

import commonTasks.dto.ComboDTO;
import commonTasks.dto.NotificationDTO;
import dal.TUser;
import dal.enumeration.Canal;
import dal.enumeration.TypeNotification;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.NotificationService;
import rest.service.SmsService;
import rest.service.v2.dto.ActiviteParam;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/notifications")
@Produces("application/json")
@Consumes("application/json")
public class NotificationResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SmsService smsService;
    @EJB
    private NotificationService notificationService;

    @POST
    @Path("/send-sms")
    public Response sendSmsNotification(NotificationDTO notification) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        this.smsService.sendSMS(notificationService.buildNotification(notification, tu));
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @GET
    @Path("all")
    public Response findAllClients(@QueryParam(value = "canal") Canal canal,
            @QueryParam(value = "typeNotification") String typeNotification,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit) {
        JSONObject data = notificationService.findAll(typeNotification, canal, null, dtStart, dtEnd, start, limit);
        return Response.ok().entity(data.toString()).build();
    }

    @GET
    @Path("types")
    public Response getTypeNotifications() {
        List<ComboDTO> data = Stream.of(TypeNotification.values())
                .map(e -> new ComboDTO().id(e.name()).libelle(e.getValue())).collect(Collectors.toList());
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("canaux")
    public Response getCanaux() {
        List<ComboDTO> data = Stream.of(Canal.values()).map(e -> new ComboDTO().id(e.name()).libelle(e.name()))
                .collect(Collectors.toList());
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("sms-recap")
    public Response sendSmsRecap(ActiviteParam activiteParam) {
        notificationService.sendPointActivite(activiteParam);
        return Response.ok().build();
    }

}
