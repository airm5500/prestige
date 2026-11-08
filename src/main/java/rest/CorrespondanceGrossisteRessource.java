package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.correspondance.CorrespondanceGrossisteService;

/**
 * CORRESPONDANCE PRODUITS GROSSISTES / PRESTIGE (lot 1, cles exactes) :
 * <ul>
 * <li>POST calculer : recalcule les correspondances a partir des codes deja connus par grossiste et des CIP / EAN
 * (droit P_CORRESPONDANCE_GROSSISTES) ; une correspondance validee, rejetee ou contredite est conservee ;</li>
 * <li>GET produit/{familleId} : correspondances d'un produit, chez chaque grossiste ;</li>
 * <li>GET liste : liste filtree (etat, grossiste), paginee ;</li>
 * <li>GET mesures : effectifs par grossiste, etat et source, et dernier calcul ;</li>
 * <li>GET calculs : journal des calculs.</li>
 * </ul>
 * Lecture : tout utilisateur connecte. Aucune fiche article n'est modifiee.
 */
@Path("v1/correspondance-grossiste")
@Produces(MediaType.APPLICATION_JSON)
public class CorrespondanceGrossisteRessource {

    static final String DROIT = "P_CORRESPONDANCE_GROSSISTES";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private CorrespondanceGrossisteService service;

    private Response nonConnecte() {
        return Droits.utilisateur(servletRequest) == null ? Response.status(Response.Status.UNAUTHORIZED)
                .type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString()).build()
                : null;
    }

    @POST
    @Path("calculer")
    public Response calculer() {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        TUser u = Droits.utilisateur(servletRequest);
        JSONObject calcul = service.calculerDepuisCodesGrossistes(u.getStrLOGIN());
        return Response.ok(new JSONObject().put("success", true).put("calcul", calcul).toString()).build();
    }

    @GET
    @Path("produit/{familleId}")
    public Response produit(@PathParam("familleId") String familleId) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.produit(familleId).toString()).build();
    }

    @GET
    @Path("liste")
    public Response liste(@QueryParam("etat") String etat, @QueryParam("grossiste") String grossiste,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.liste(etat, grossiste, start, limit).toString()).build();
    }

    @GET
    @Path("mesures")
    public Response mesures() {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.mesures().toString()).build();
    }

    @GET
    @Path("calculs")
    public Response calculs(@DefaultValue("20") @QueryParam("limit") int limit) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.calculs(limit).toString()).build();
    }
}
