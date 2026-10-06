package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.NotificationsCentreService;
import util.CommonUtils;
import util.Constant;

/**
 * Centre de notifications (plan d'octobre, section 7, lot L9) : catalogue, compteurs agreges (une requete pour toute la
 * cloche), listes des nouvelles categories.
 */
@Path("v1/notifications-centre")
@Produces(MediaType.APPLICATION_JSON)
public class NotificationsCentreRessource {

    @EJB
    private NotificationsCentreService service;
    @Context
    private HttpServletRequest servletRequest;

    private static Response deconnecte() {
        return Response.ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    @GET
    @Path("catalogue")
    public Response catalogue() {
        if (servletRequest.getSession().getAttribute(Constant.AIRTIME_USER) == null) {
            return deconnecte();
        }
        return Response.ok(new JSONObject().put("success", true).put("data", service.catalogue()).toString()).build();
    }

    @GET
    @Path("compteurs")
    @SuppressWarnings("unchecked")
    public Response compteurs(@DefaultValue("reserve,perimes,avoirs") @QueryParam("cles") String cles) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return deconnecte();
        }
        List<TPrivilege> privileges = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        List<String> l = new ArrayList<>();
        for (String c : StringUtils.defaultString(cles).split(",")) {
            if (StringUtils.isNotBlank(c) && l.size() < 20) {
                l.add(c.trim());
            }
        }
        Map<String, Long> m = service.compteurs(tu, CommonUtils.hasAuthorityByName(privileges, Constant.SHOW_VENTE),
                CommonUtils.hasAuthorityByName(privileges, Constant.P_SHOW_ALL_ACTIVITY), l);
        long total = 0;
        JSONObject c = new JSONObject();
        for (Map.Entry<String, Long> e : m.entrySet()) {
            c.put(e.getKey(), e.getValue());
            total += e.getValue();
        }
        return Response.ok(new JSONObject().put("success", true).put("compteurs", c).put("total", total).toString())
                .build();
    }

    @GET
    @Path("liste")
    public Response liste(@QueryParam("cle") String cle, @DefaultValue("50") @QueryParam("limit") int limit) {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return deconnecte();
        }
        return Response.ok(service.liste(cle, tu, limit).put("success", true).toString()).build();
    }
}
