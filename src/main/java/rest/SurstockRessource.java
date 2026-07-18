package rest;

import dal.TUser;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.SurstockService;
import util.Constant;

/**
 * Nouvel ecran "Gestion des surstocks" (calculs corriges), independant de l'ancien ecran "Articles en sur-stock".
 */
@Path("v1/surstock")
@Produces("application/json")
@Consumes("application/json")
public class SurstockRessource {

    @EJB
    private SurstockService surstockService;
    @EJB
    private InventaireService inventaireService;
    @Inject
    private HttpServletRequest servletRequest;

    private TUser getUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    @GET
    public Response fetch(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @DefaultValue("3") @QueryParam(value = "moisHistorique") int moisHistorique,
            @DefaultValue("3") @QueryParam(value = "moisProjection") int moisProjection,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "codeFamille") String codeFamille) {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = surstockService.fetch(tu, moisHistorique, moisProjection, query, codeRayon, codeGrossiste,
                codeFamille, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@DefaultValue("3") @QueryParam(value = "moisHistorique") int moisHistorique,
            @DefaultValue("3") @QueryParam(value = "moisProjection") int moisProjection,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "codeFamille") String codeFamille) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        byte[] data = surstockService.exportExcel(tu, moisHistorique, moisProjection, query, codeRayon, codeGrossiste,
                codeFamille);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"gestion_surstocks.xls\"")
                .build();
    }

    // Edition PDF (JasperReports) : rp_gestion_surstock.jrxml
    @GET
    @Path("pdf")
    public Response pdf(@DefaultValue("3") @QueryParam(value = "moisHistorique") int moisHistorique,
            @DefaultValue("3") @QueryParam(value = "moisProjection") int moisProjection,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "codeFamille") String codeFamille) throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String url = servletRequest.getContextPath() + surstockService.printPdf(tu, moisHistorique, moisProjection,
                query, codeRayon, codeGrossiste, codeFamille);
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).toString()).build();
    }

    // Nombre de produits (controle avant confirmation de creation d'inventaire)
    @GET
    @Path("produits/count")
    public Response produitsCount(@DefaultValue("3") @QueryParam(value = "moisHistorique") int moisHistorique,
            @DefaultValue("3") @QueryParam(value = "moisProjection") int moisProjection,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "codeFamille") String codeFamille) throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        int count = surstockService
                .produitIds(tu, moisHistorique, moisProjection, query, codeRayon, codeGrossiste, codeFamille).size();
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    // Creation d'inventaire a partir de la liste filtree
    @POST
    @Path("create-inventaire")
    public Response createInventaire(@DefaultValue("3") @QueryParam(value = "moisHistorique") int moisHistorique,
            @DefaultValue("3") @QueryParam(value = "moisProjection") int moisProjection,
            @QueryParam(value = "query") String query, @QueryParam(value = "codeRayon") String codeRayon,
            @QueryParam(value = "codeGrossiste") String codeGrossiste,
            @QueryParam(value = "codeFamille") String codeFamille) throws JSONException {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Set<String> produitIds = surstockService.produitIds(tu, moisHistorique, moisProjection, query, codeRayon,
                codeGrossiste, codeFamille);
        if (produitIds.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Aucun produit en surstock avec ces criteres").toString()).build();
        }
        String name = "INVENTAIRE SURSTOCKS "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(produitIds, name, name);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }
}
