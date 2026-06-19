package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
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

    // @Consumes(WILDCARD) : les parametres arrivent en query string (pas de corps JSON),
    // ce qui evite l'erreur 415 declenchee par le @Consumes(application/json) de la classe.
    @POST
    @Path("recalculate")
    @Consumes(MediaType.WILDCARD)
    public Response recalculate(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste) {

        JSONObject json = abcAnalysisService.recalculate(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("apply")
    @Consumes(MediaType.WILDCARD)
    public Response apply(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste) {

        JSONObject json = abcAnalysisService.apply(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }

    // ----------------------- Configuration des classes ABC ------------------
    @GET
    @Path("classes")
    public Response listClasses() {
        return Response.ok().entity(abcAnalysisService.listClasses().toString()).build();
    }

    @POST
    @Path("classes/update")
    @Consumes(MediaType.WILDCARD)
    public Response updateClasse(@QueryParam("id") String id, @QueryParam("q1") Integer q1,
            @QueryParam("q2") Integer q2, @QueryParam("q3") Integer q3, @QueryParam("unite") String unite,
            @QueryParam("seuilMin") Double seuilMin, @QueryParam("seuilMax") Double seuilMax,
            @QueryParam("statut") String statut) {

        JSONObject json = abcAnalysisService.updateClasse(id, q1, q2, q3, unite, seuilMin, seuilMax, statut);
        return Response.ok().entity(json.toString()).build();
    }
}
