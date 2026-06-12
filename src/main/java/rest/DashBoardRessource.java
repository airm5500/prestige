/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import bll.report.Dashboard;
import dal.TUser;
import dal.dataManager;
import java.time.LocalDate;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.DashBoardService;
import rest.service.dto.BalanceParamsDTO;
import toolkits.parameters.commonparameter;
import toolkits.utils.Util;
import toolkits.utils.date;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v1/recap")
@Produces("application/json")
@Consumes("application/json")
public class DashBoardRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    DashBoardService dashBoardService;

    // Cache memoire court pour les agregats les plus lourds du tableau de bord (scans annuels/mensuels).
    // Les donnees sont globales a l'officine : une entree par endpoint suffit.
    private static final Map<String, CachedPayload> DASHBOARD_CACHE = new ConcurrentHashMap<>();

    private static final class CachedPayload {

        final String payload;
        final long expiresAt;

        CachedPayload(String payload, long expiresAt) {
            this.payload = payload;
            this.expiresAt = expiresAt;
        }
    }

    private String cachedPayload(String key, long ttlMillis, Supplier<String> loader) {
        long now = System.currentTimeMillis();
        CachedPayload entry = DASHBOARD_CACHE.get(key);
        if (entry != null && entry.expiresAt > now) {
            return entry.payload;
        }
        String payload = loader.get();
        DASHBOARD_CACHE.put(key, new CachedPayload(payload, now + ttlMillis));
        return payload;
    }

    @GET
    @Path("credits")
    public Response donneesCreditAccordes(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "start") int start,
            @QueryParam(value = "query") String query, @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = dashBoardService.donneesCreditAccordesView(BalanceParamsDTO.builder().dtStart(dtStart)
                .all(false).start(start).query(query).limi(limit).dtEnd(dtEnd).showAllAmount(true)
                .emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("credits/totaux")
    public Response donneesRecapTotataux(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "query") String query) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = new JSONObject(dashBoardService
                .donneesRecapTotataux(BalanceParamsDTO.builder().dtStart(dtStart).query(query).dtEnd(dtEnd)
                        .showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build()));
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("credits/totauxmob")
    public Response donneesRecapTotaux(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "query") String query) throws JSONException {
        String TEmplacement = Constant.EMPLACEMENT;
        JSONObject jsono = new JSONObject(dashBoardService.donneesRecapTotaux(BalanceParamsDTO.builder()
                .dtStart(dtStart).query(query).dtEnd(dtEnd).showAllAmount(true).emplacementId(TEmplacement).build()));
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("creditsmob")
    public Response donneesCreditsAccordes(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "start") int start,
            @QueryParam(value = "query") String query, @QueryParam(value = "limit") int limit) throws JSONException {
        String TEmplacement = "1";

        JSONObject jsono = dashBoardService
                .donneesCreditAccordesView(BalanceParamsDTO.builder().dtStart(dtStart).all(false).start(start)
                        .query(query).limi(limit).dtEnd(dtEnd).showAllAmount(true).emplacementId(TEmplacement).build());
        return Response.ok().entity(jsono.toString()).build();

    }

    @GET
    @Path("reglements")
    public Response reglements(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "start") int start, @QueryParam(value = "query") String query,
            @QueryParam(value = "limit") int limit) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject jsono = dashBoardService.donneesReglementsTpView(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu, query, start, limit, false);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("dashboard")
    public Response donneesRecaps(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = dashBoardService.donneesRecapActiviteView(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), tu, "");
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("dashboardmob")
    public Response donneesRecap(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) throws JSONException {

        String TEmplacement = "1";
        JSONObject jsono = dashBoardService.donneesRecapActiviteView(LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                TEmplacement, "");
        return Response.ok().entity(jsono.toString()).build();
    }

    // Endpoints utilisés par general/dashboard.html pour remplacer les anciens JSP webservices/dashboard/*.jsp.
    @GET
    @Path("dashboard/daily")
    public Response getDashboardDaily() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return okDashboard(dashboardDailyData().toString());
    }

    @GET
    @Path("dashboard/ca-graphe")
    public Response getDashboardCaGraphe() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return okDashboard(cachedPayload("ca-graphe", 180_000, this::buildCaGraphePayload));
    }

    private String buildCaGraphePayload() {
        Dashboard dashboard = dashboardReport();
        JSONArray data = dashboard.getCaGrapheData();
        int thisYear = Integer.valueOf(date.FORMATTERYEAR.format(new Date()));
        JSONObject json = new JSONObject();
        long janv = 0, fev = 0, mars = 0, mai = 0, avril = 0, juin = 0, juillet = 0, aout = 0, sept = 0, oct = 0,
                nov = 0, dec = 0;

        for (int i = 0; i < data.length(); i++) {
            JSONObject object = data.getJSONObject(i);
            if (object.get("MONTH").equals("01/" + thisYear)) {
                janv = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("02/" + thisYear)) {
                fev = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("03/" + thisYear)) {
                mars = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("04/" + thisYear)) {
                avril = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("05/" + thisYear)) {
                mai = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("06/" + thisYear)) {
                juin = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("07/" + thisYear)) {
                juillet = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("08/" + thisYear)) {
                aout = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("09/" + thisYear)) {
                sept = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("10/" + thisYear)) {
                oct = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("11/" + thisYear)) {
                nov = object.getLong("MONTHCA");
            }
            if (object.get("MONTH").equals("12/" + thisYear)) {
                dec = object.getLong("MONTHCA");
            }
        }
        json.put("jan", janv);
        json.put("fev", fev);
        json.put("mars", mars);
        json.put("avril", avril);
        json.put("mai", mai);
        json.put("juin", juin);
        json.put("juillet", juillet);
        json.put("aout", aout);
        json.put("sept", sept);
        json.put("oct", oct);
        json.put("nov", nov);
        json.put("dec", dec);
        return json.toString();
    }

    @GET
    @Path("dashboard/top5-qty")
    public Response getDashboardTop5Quantity() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return dashboardDataResponse(dashboardReport().getTOP5ArticleVendueQTY());
    }

    @GET
    @Path("dashboard/top5-ca")
    public Response getDashboardTop5Ca() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return dashboardDataResponse(dashboardReport().getTOP5ArticleVendueCA());
    }

    @GET
    @Path("dashboard/achat-grossiste")
    public Response getDashboardAchatGrossiste() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return okDashboard(cachedPayload("achat-grossiste", 120_000, () -> {
            JSONObject json = new JSONObject();
            json.put("data", dashboardReport().getValeurAchatByGrossiste());
            return json.toString();
        }));
    }

    @GET
    @Path("dashboard/achats-grossistes")
    public Response getDashboardAchatsGrossistes() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return dashboardDataResponse(dashboardReport().getAllAchatByGrossiste());
    }

    @GET
    @Path("dashboard/best-clients")
    public Response getDashboardBestClients() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return dashboardDataResponse(dashboardReport().getBestClients());
    }

    @GET
    @Path("dashboard/mouvements")
    public Response getDashboardMouvements() {
        TUser tu = connectedUser();
        if (tu == null) {
            return okDashboard(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE));
        }
        return dashboardDataResponse(dashboardReport().getListMVT());
    }

    private JSONObject dashboardDailyData() {
        Dashboard dashboard = dashboardReport();
        JSONObject data = dashboard.getDailyCA_AND_SalesCount();
        JSONObject achat = dashboard.getAchatAmount();
        JSONObject panierMoyen = dashboard.getPanierMoyen();
        JSONObject margeNet = dashboard.getCANetAndMargeNet();
        data.put("MARGENET", Util.getFormattedLongValue(margeNet.getLong("MARGENET")));
        data.put("panierMYVNO", Util.getFormattedDoubleValue(panierMoyen.getDouble("panierMYVNO")));
        data.put("PanierMYVO", Util.getFormattedDoubleValue(panierMoyen.getDouble("PanierMYVO")));
        data.put("PanierMY", Util.getFormattedDoubleValue(panierMoyen.getDouble("PanierMY")));
        data.put("MONTANTVO", panierMoyen.getDouble("MONTANTVO"));
        data.put("MONTANTVNO", panierMoyen.getDouble("MONTANTVNO"));
        data.put("DailyAchatAmount", Util.getFormattedDoubleValue(achat.getDouble("DailyAchatAmount")));
        data.put("DailyAchatCount", Util.getFormattedDoubleValue(achat.getDouble("DailyAchatCount")));
        data.put("MONTANTDEPO", panierMoyen.getDouble("MONTANTDEPO"));
        return data;
    }

    private Response dashboardDataResponse(JSONArray data) {
        JSONObject json = new JSONObject();
        json.put("data", data);
        return okDashboard(json.toString());
    }

    private Dashboard dashboardReport() {
        return new Dashboard(new dataManager());
    }

    private TUser connectedUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response okDashboard(Object entity) {
        CacheControl cacheControl = new CacheControl();
        cacheControl.setNoCache(true);
        cacheControl.setNoStore(true);
        cacheControl.setMustRevalidate(true);
        return Response.ok().cacheControl(cacheControl).entity(entity).build();
    }

}
