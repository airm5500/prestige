package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.InventaireService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/inventaire")
@Produces("application/json")
@Consumes("application/json")
public class InventaireRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private InventaireService inventaireService;

    @GET
    @Path("produit-annules")
    public Response doInventaireFromProduitsAnnules(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "userId") String userId) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = this.inventaireService.createInventaireFromCanceledList(dtStart, dtEnd, userId, tu);

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("refreshStockLigneInventaire/{id}")
    public Response refreshStockLigneInventaire(@PathParam("id") String id) {

        inventaireService.refreshStockLigneInventaire(id);
        return Response.ok().build();
    }
}
