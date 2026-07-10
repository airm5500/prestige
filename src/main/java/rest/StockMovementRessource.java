package rest;

import dal.TUser;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import rest.service.dto.StockMovementFilterDTO;
import rest.service.utils.StockMovementDataHelper;
import util.Constant;

/**
 * API REST de l'écran « Point détaillé entrée/sortie » (remplace les JSP ws_data_mouvement_*.jsp). La réponse de liste
 * conserve le contrat {success, total, results} attendu par le reader ExtJS existant.
 */
@Path("v1/stock-movements")
@Produces("application/json")
@Consumes("application/json")
public class StockMovementRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @GET
    public Response list(@QueryParam("transactionType") String transactionType,
            @QueryParam("searchValue") String searchValue, @QueryParam("dateDebut") String dateDebut,
            @QueryParam("dateFin") String dateFin, @QueryParam("grossisteId") String grossisteId,
            @QueryParam("familleArticleId") String familleArticleId, @QueryParam("zoneGeoId") String zoneGeoId,
            @QueryParam("start") @DefaultValue("0") int start, @QueryParam("limit") @DefaultValue("20") int limit)
            throws JSONException {
        TUser user = connectedUser();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        try (StockMovementDataHelper helper = new StockMovementDataHelper(user)) {
            StockMovementFilterDTO filter = buildFilter(transactionType, searchValue, dateDebut, dateFin, grossisteId,
                    familleArticleId, zoneGeoId);
            return Response.ok().entity(helper.list(filter, start, limit).toString()).build();
        }
    }

    private TUser connectedUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    private static StockMovementFilterDTO buildFilter(String transactionType, String searchValue, String dateDebut,
            String dateFin, String grossisteId, String familleArticleId, String zoneGeoId) {
        StockMovementFilterDTO filter = new StockMovementFilterDTO();
        filter.setTransactionType(transactionType);
        filter.setSearchValue(searchValue);
        filter.setDateDebut(dateDebut);
        filter.setDateFin(dateFin);
        filter.setGrossisteId(grossisteId);
        filter.setFamilleArticleId(familleArticleId);
        filter.setZoneGeoId(zoneGeoId);
        return filter;
    }
}
