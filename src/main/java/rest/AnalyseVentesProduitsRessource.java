package rest;

import dal.TUser;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.AnalyseVentesProduitsService;
import rest.service.impl.AnalyseVentesProduitsService.Filtres;
import rest.service.impl.AnalyseVentesProduitsService.Pas;
import toolkits.parameters.commonparameter;
import util.Constant;

/** Onglet « Analyse » du menu Produits (besoins du 11/10, point 13) : lecture seule. */
@Path("v1/analyse-produits")
@Produces("application/json")
public class AnalyseVentesProduitsRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private AnalyseVentesProduitsService analyse;

    private static Response refus(String message) {
        return Response.ok(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    @GET
    public Response analyser(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("pas") String pas, @QueryParam("query") String query, @QueryParam("rayonId") String rayonId,
            @QueryParam("grossisteId") String grossisteId) {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        LocalDate d, f;
        try {
            f = fin == null || fin.isBlank() ? LocalDate.now() : LocalDate.parse(fin.trim());
            d = debut == null || debut.isBlank() ? f.withDayOfMonth(1) : LocalDate.parse(debut.trim());
        } catch (DateTimeParseException e) {
            return refus("Dates invalides.");
        }
        Pas p = pas == null || pas.isBlank() ? Pas.JOUR : Pas.lire(pas);
        String motif = AnalyseVentesProduitsService.controler(d, f, p);
        if (motif != null) {
            return refus(motif);
        }
        if (query != null && query.length() > 100) {
            return refus("Recherche trop longue (100 caractères au plus).");
        }
        return Response.ok(analyse.analyser(d, f, p, new Filtres(query, rayonId, grossisteId)).toString()).build();
    }
}
