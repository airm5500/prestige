package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.DepotExtensionService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Depots d'extension (evolution 5, point 1) : consultation, depuis l'officine, de ce que chaque depot detient.
 *
 * <p>
 * Le depot demande est systematiquement verifie : ces services ne servent que le stock d'un depot d'extension actif,
 * jamais celui de l'officine. Passer l'emplacement « 1 » ne donne donc pas un raccourci vers l'etat de stock.
 * </p>
 */
@Path("v1/depot-extension")
@Produces("application/json")
@Consumes("application/json")
public class DepotExtensionRessource {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger
            .getLogger(DepotExtensionRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private DepotExtensionService depotExtensionService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                .put("message", Constant.DECONNECTED_MESSAGE).toString()).build();
    }

    private static Response depotInvalide() {
        return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                .put("message", "Choisissez un dépôt d'extension.").toString()).build();
    }

    /** Depots d'extension actifs, pour le choix de l'ecran. */
    @GET
    @Path("depots")
    public Response depots() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok().entity(depotExtensionService.depots().toString()).build();
    }

    /**
     * Valorisation du depot ventilee par emplacement des articles - leur rayon, le depot etant deja choisi. Le total du
     * depot accompagne la ventilation, pour que la somme des lignes soit verifiable d'un coup d'oeil.
     */
    @GET
    @Path("valorisation-emplacement")
    public Response valorisationParEmplacement(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @DefaultValue("true") @QueryParam("enStock") boolean enStock) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return depotInvalide();
        }
        return Response.ok()
                .entity(depotExtensionService.valorisationParEmplacement(depotId, query, familleId, enStock).toString())
                .build();
    }

    /**
     * Stock du depot : la liste paginee, son total, et la valorisation calculee sur l'ensemble des lignes retenues (et
     * non sur la page affichee).
     */
    @GET
    @Path("stock")
    public Response stock(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @DefaultValue("true") @QueryParam("enStock") boolean enStock,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return depotInvalide();
        }
        return Response.ok()
                .entity(depotExtensionService.stock(depotId, query, familleId, enStock, start, limit).toString())
                .build();
    }

    @GET
    @Path("stock/excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @DefaultValue("true") @QueryParam("enStock") boolean enStock) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        byte[] contenu = depotExtensionService.excel(depotId, query, familleId, enStock);
        String nom = "stock_depot_" + depotExtensionService.nomDepot(depotId).replaceAll("[^A-Za-z0-9]+", "_") + ".xls";
        return Response.ok(contenu).header("Content-Disposition", "attachment; filename=\"" + nom + "\"").build();
    }

    /** Edition servie en flux dans l'onglet ouvert par le clic : aucune fenetre intermediaire. */
    @GET
    @Path("stock/pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @QueryParam("familleLibelle") String familleLibelle,
            @DefaultValue("true") @QueryParam("enStock") boolean enStock) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        try {
            byte[] pdf = depotExtensionService.pdf(user, depotId, query, familleId, familleLibelle, enStock);
            return Response.ok(pdf, "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"stock_depot.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition du stock du depot " + depotId, e);
            return Response.serverError().build();
        }
    }
}
