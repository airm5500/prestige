package rest;

import dal.TUser;
import java.util.Date;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SessionHelperService;
import rest.service.mobile.MobileCatalogueDeltaService;
import rest.service.mobile.MobileOrdonnanceCorrectionService;

/**
 * O4 (Prestige Mobile) : partage entre terminaux des corrections faites par le pharmacien sur les ordonnances lues
 * (association « segment medicament lu → produit »).
 * <p>
 * {@code POST v1/app-vente/ordonnances/corrections} corps {@code {corrections:[{cle, segment, produitId, cip, nom,
 * at}]}} (500 au plus) → {@code {success, recus, enregistres, dejaConnus, rejetes:[{cle, motif}], serveurMaintenant}} ;
 * idempotent par {@code cle}.
 * <p>
 * {@code GET v1/app-vente/ordonnances/corrections?depuis=yyyy-MM-dd HH:mm:ss[&jusqua=...]&start=0&limit=500} →
 * {@code {success, depuis, serveurMaintenant, total, start, limit, data:[{cle, segment, produitId, cip, nom, at,
 * recuLe}]}} ({@code depuis} absent : tout).
 * <p>
 * Authentification : session habituelle de l'application (cookie), comme H4 / H5 ; aucune exception dans
 * filter.AuthenticationFilter.
 */
@Path("v1/app-vente/ordonnances")
@Produces(MediaType.APPLICATION_JSON)
public class MobileOrdonnanceRessource {

    @EJB
    private MobileOrdonnanceCorrectionService service;
    @EJB
    private SessionHelperService sessionHelperService;

    @POST
    @Path("corrections")
    @Consumes(MediaType.WILDCARD)
    public Response envoyer(String corps) {
        TUser u = sessionHelperService.getCurrentUser();
        if (u == null) {
            return erreur(Response.Status.UNAUTHORIZED, "Veuillez vous connecter.");
        }
        if (!service.disponible()) {
            return erreur(Response.Status.SERVICE_UNAVAILABLE, "Partage des apprentissages indisponible (migration).");
        }
        JSONArray lot;
        try {
            lot = new JSONObject(corps == null ? "" : corps).getJSONArray("corrections");
        } catch (JSONException e) {
            return erreur(Response.Status.BAD_REQUEST, "Corps attendu : {corrections:[...]}.");
        }
        if (lot.length() > MobileOrdonnanceCorrectionService.LOT_MAX) {
            return erreur(Response.Status.BAD_REQUEST,
                    "Lot trop grand (" + MobileOrdonnanceCorrectionService.LOT_MAX + " corrections au plus).");
        }
        JSONObject o = service.enregistrer(lot, u.getLgUSERID());
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }

    @GET
    @Path("corrections")
    public Response changements(@QueryParam("depuis") String depuis, @QueryParam("jusqua") String jusqua,
            @QueryParam("start") int start, @QueryParam("limit") int limit) {
        TUser u = sessionHelperService.getCurrentUser();
        if (u == null) {
            return erreur(Response.Status.UNAUTHORIZED, "Veuillez vous connecter.");
        }
        if (!service.disponible()) {
            return erreur(Response.Status.SERVICE_UNAVAILABLE, "Partage des apprentissages indisponible (migration).");
        }
        Date d = null;
        if (depuis != null && !depuis.trim().isEmpty()) {
            d = MobileCatalogueDeltaService.lire(depuis);
            if (d == null) {
                return erreur(Response.Status.BAD_REQUEST,
                        "Parametre depuis illisible (" + MobileCatalogueDeltaService.FORMAT + ", horloge du serveur).");
            }
        }
        Date j = null;
        if (jusqua != null && !jusqua.trim().isEmpty()) {
            j = MobileCatalogueDeltaService.lire(jusqua);
            if (j == null) {
                return erreur(Response.Status.BAD_REQUEST, "Parametre jusqua illisible.");
            }
        }
        return Response.ok(service.changements(d, j, start, limit).toString(), MediaType.APPLICATION_JSON).build();
    }

    private static Response erreur(Response.Status s, String msg) {
        return Response.status(s).type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", msg).toString()).build();
    }
}
