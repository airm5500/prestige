package rest;

import dal.TUser;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
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
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MonographieService;
import util.Constant;

/**
 * Monographies DS Pharmagora : consultation par tout utilisateur connecte (information de dispensation, comme une fiche
 * VIDAL). Le site n'est jamais appele depuis le navigateur.
 */
@Path("v1/monographie")
@Produces(MediaType.APPLICATION_JSON)
public class MonographieRessource {

    @EJB
    private MonographieService service;
    @Context
    private HttpServletRequest servletRequest;

    private boolean connecte() {
        return servletRequest.getSession().getAttribute(Constant.AIRTIME_USER) instanceof TUser;
    }

    private static Response refus(String m) {
        return Response.ok(new JSONObject().put("success", false).put("msg", m).toString()).build();
    }

    @GET
    @Path("etat")
    public Response etat() {
        return connecte() ? Response.ok(service.etat().toString()).build() : refus(Constant.DECONNECTED_MESSAGE);
    }

    @GET
    @Path("fiche/{famille}")
    public Response fiche(@PathParam("famille") String famille,
            @QueryParam("rubrique") @DefaultValue("1") String rubrique,
            @QueryParam("relire") @DefaultValue("false") boolean relire) {
        if (!connecte()) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (rubrique == null || !rubrique.trim().matches("\\d{1,3}")) {
            return refus("Rubrique inconnue.");
        }
        return Response.ok(service.fiche(famille, Integer.parseInt(rubrique.trim()), relire).toString()).build();
    }

    /** Corps : {"articles": ["lg_FAMILLE_ID", ...]}. */
    @POST
    @Path("interactions")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response interactions(String corps) {
        if (!connecte()) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        List<String> ids = new ArrayList<>();
        try {
            JSONArray a = new JSONObject(corps == null ? "{}" : corps).optJSONArray("articles");
            for (int i = 0; a != null && i < a.length(); i++) {
                ids.add(a.optString(i));
            }
        } catch (JSONException e) {
            return refus("Demande illisible.");
        }
        return Response.ok(service.interactions(ids).toString()).build();
    }
}
