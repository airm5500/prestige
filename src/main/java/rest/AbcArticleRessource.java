package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.AbcAnalysisService;

/**
 * Ressource REST de la classification ABC (Lot 1).
 *
 * Totalement independante des endpoints 20/80 (statfamillearticle).
 */
@Path("v1/articles/abc")
@Produces("application/json")
@Consumes("application/json")
public class AbcArticleRessource {

    @EJB
    private AbcAnalysisService abcAnalysisService;

    @GET
    public Response grid(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit, @QueryParam("sort") String sort,
            @QueryParam("dir") String dir) {

        JSONObject json = abcAnalysisService.grid(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, start, limit, sort, dir);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("recalculate")
    public Response recalculate(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste) {

        JSONObject json = abcAnalysisService.recalculate(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("apply")
    public Response apply(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste) {

        JSONObject json = abcAnalysisService.apply(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }
}
