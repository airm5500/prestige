package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.EtiquettePanierService;
import util.Constant;

/**
 * Panier d'etiquettes de l'ecran « Creation groupee d'etiquette ».
 *
 * <p>
 * Ces points remplacent, pour ce seul ecran, les pages JSP {@code ws_data_jdbc.jsp}, {@code ws_data_detail.jsp} et
 * {@code ws_transaction.jsp}. Les pages restent en place : elles servent encore cinq autres ecrans, qui continuent de
 * les appeler sans changement.
 *
 * @author koben
 */
@Path("v1/etiquette-panier")
@Produces("application/json")
@Consumes("application/json")
public class EtiquettePanierRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EtiquettePanierService etiquettePanierService;

    private TUser utilisateur() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    /**
     * Articles proposes dans la liste deroulante. Le parametre de recherche s'appelle « query » : c'est celui que la
     * combo ExtJS envoie d'elle-meme.
     */
    @GET
    @Path("produits")
    public Response produits(@QueryParam("query") String query, @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok().entity(etiquettePanierService.produits(user, query, start, limit).toString()).build();
    }

    /** Lignes du panier en preparation. */
    @GET
    public Response panier(@QueryParam("search_value") String recherche, @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok().entity(etiquettePanierService.panier(recherche, start, limit).toString()).build();
    }

    /** Ajoute une quantite d'etiquettes pour un article : {@code {"produitId":"...","quantite":3}}. */
    @POST
    public Response ajouter(String body) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject entree = new JSONObject(body == null ? "{}" : body);
        return Response.ok()
                .entity(etiquettePanierService
                        .ajouter(user, entree.optString("produitId", ""), entree.optInt("quantite", 0)).toString())
                .build();
    }

    /** Fixe la quantite d'une ligne : {@code {"quantite":5}}. */
    @PUT
    @Path("{id}")
    public Response modifier(@PathParam("id") String id, String body) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject entree = new JSONObject(body == null ? "{}" : body);
        return Response.ok()
                .entity(etiquettePanierService.modifierQuantite(id, entree.optInt("quantite", 0)).toString()).build();
    }

    /** Retire une ligne du panier. */
    @DELETE
    @Path("{id}")
    public Response supprimer(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return Response.ok().entity(etiquettePanierService.supprimer(id).toString()).build();
    }
}
