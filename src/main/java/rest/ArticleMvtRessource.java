package rest;

import commonTasks.dto.ComboDTO;
import java.util.List;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.ArticleMvtService;
import rest.service.dto.ArticleMvtFilter;

@Path("v1/articlemvt")
@Produces("application/json")
@Consumes("application/json")
public class ArticleMvtRessource {

    @EJB
    private ArticleMvtService articleMvtService;

    private static ArticleMvtFilter filtre(String dtStart, String dtEnd, String query, String typeMvt,
            String emplacementId, String familleId) {
        return ArticleMvtFilter.builder().dtStart(dtStart).dtEnd(dtEnd).query(query).typeMvt(typeMvt)
                .emplacementId(emplacementId).familleId(familleId).build();
    }

    @GET
    @Path("list")
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeMvt") String typeMvt,
            @QueryParam(value = "emplacementId") String emplacementId,
            @QueryParam(value = "familleId") String familleId) {

        return Response.ok()
                .entity(articleMvtService.getAllArticleMvt(
                        filtre(dtStart, dtEnd, query, typeMvt, emplacementId, familleId), limit, start).toString())
                .build();
    }

    @GET
    @Path("all")
    public Response all(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeMvt") String typeMvt,
            @QueryParam(value = "emplacementId") String emplacementId,
            @QueryParam(value = "familleId") String familleId) {

        return Response.ok()
                .entity(articleMvtService
                        .getAllArticleMvt(filtre(dtStart, dtEnd, query, typeMvt, emplacementId, familleId)).toString())
                .build();
    }

    /** Alimente le combo "Mode" de l'ecran : les types de mouvement lus en base, jamais une liste figee. */
    @GET
    @Path("types")
    public Response types() {
        List<ComboDTO> data = articleMvtService.typesMouvement();
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("inventaire")
    public Response createInventaire(@QueryParam("ids") String ids, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) {

        JSONObject result = articleMvtService.createInventaireFromSelection(ids, dtStart, dtEnd);
        return Response.ok(result.toString()).build();
    }

    /**
     * Inventaire de toute la liste filtree : l'utilisateur choisit un mode de mouvement et inventorie l'ensemble des
     * articles concernes, sans avoir a cocher page par page.
     */
    @GET
    @Path("inventaire-liste")
    public Response createInventaireListe(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("query") String query, @QueryParam("typeMvt") String typeMvt,
            @QueryParam("emplacementId") String emplacementId, @QueryParam("familleId") String familleId) {

        JSONObject result = articleMvtService
                .createInventaireFromFilter(filtre(dtStart, dtEnd, query, typeMvt, emplacementId, familleId));
        return Response.ok(result.toString()).build();
    }

    @GET
    @Path("export")
    @Produces("application/vnd.ms-excel")
    public Response export(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("query") String query, @QueryParam("typeMvt") String typeMvt,
            @QueryParam("emplacementId") String emplacementId, @QueryParam("familleId") String familleId) {

        byte[] data = articleMvtService.exportToExcel(filtre(dtStart, dtEnd, query, typeMvt, emplacementId, familleId));

        return Response.ok(data).header("Content-Disposition",
                "attachment; filename=\"articles_mouvement_" + dtStart + "_" + dtEnd + ".xls\"").build();
    }
}
