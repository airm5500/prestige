package rest;

import dal.TUser;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.ReserveService;
import util.Constant;

/**
 * Endpoints REST de gestion des reserves. Remplace les anciens JSP
 * ws_data / ws_transaction.
 */
@Path("v1/reserve")
@Produces("application/json")
@Consumes("application/json")
public class ReserveRessource {

    @Inject
    private HttpServletRequest servletRequest;
    private @EJB ReserveService reserveService;

    private TUser currentUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    @GET
    @Path("articles")
    public Response articles(@QueryParam("search_value") String search,
            @QueryParam("str_TYPE_TRANSACTION") String type,
            @QueryParam("start") int start, @QueryParam("limit") int limit) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.listArticles(user, search, type, start, limit > 0 ? limit : 20);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("suggestions")
    public Response suggestions(@QueryParam("search_value") String search,
            @QueryParam("start") int start, @QueryParam("limit") int limit) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = reserveService.suggestions(user, search, start, limit > 0 ? limit : 20);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("assort")
    public Response assort(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject in = new JSONObject(body);
        JSONObject json = reserveService.assort(user, in.optString("lg_FAMILLE_ID", null), in.optInt("int_NUMBER", 0));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("reassort")
    public Response reassort(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject in = new JSONObject(body);
        JSONObject json = reserveService.reassort(user, in.optString("lg_FAMILLE_ID", null), in.optInt("int_NUMBER", 0));
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("reassort-batch")
    public Response reassortBatch(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONArray arr = new JSONObject(body).optJSONArray("items");
        List<JSONObject> items = new ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                items.add(arr.getJSONObject(i));
            }
        }
        JSONObject json = reserveService.reassortBatch(user, items);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("mouvements/{id}")
    public Response mouvements(@PathParam("id") String familleId,
            @QueryParam("start") int start, @QueryParam("limit") int limit) throws JSONException {
        JSONObject json = reserveService.mouvements(familleId, start, limit > 0 ? limit : 50);
        return Response.ok().entity(json.toString()).build();
    }
}
