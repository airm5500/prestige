package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.ArticleMvtService;

@Path("v1/articlemvt")
@Produces("application/json")
@Consumes("application/json")
public class ArticleMvtRessource {

    @EJB
    private ArticleMvtService articleMvtService;

    @GET
    @Path("list")
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "query") String query) {

        return Response.ok().entity(articleMvtService.getAllArticleMvt(dtStart, dtEnd, query, limit, start).toString())
                .build();
    }

    @GET
    @Path("all")
    public Response all(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "query") String query) {

        return Response.ok().entity(articleMvtService.getAllArticleMvt(dtStart, dtEnd, query).toString()).build();
    }

    @GET
    @Path("inventaire")
    public Response createInventaire(@QueryParam("ids") String ids, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) {

        JSONObject result = articleMvtService.createInventaireFromSelection(ids, dtStart, dtEnd);
        return Response.ok(result.toString()).build();
    }

    @GET
    @Path("export")
    @Produces("application/vnd.ms-excel")
    public Response export(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("query") String query) {

        byte[] data = articleMvtService.exportToExcel(dtStart, dtEnd, query);

        return Response.ok(data).header("Content-Disposition",
                "attachment; filename=\"articles_mouvement_" + dtStart + "_" + dtEnd + ".xls\"").build();
    }
}
