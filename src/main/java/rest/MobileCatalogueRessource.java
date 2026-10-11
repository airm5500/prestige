package rest;

import dal.TUser;
import java.util.Date;
import javax.ejb.EJB;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.SessionHelperService;
import rest.service.mobile.MobileCatalogueDeltaService;

/**
 * H5 (Prestige Mobile) : mise a jour differentielle de la copie du catalogue gardee sur le telephone.
 * <p>
 * {@code GET v1/app-vente/catalogue/changements?depuis=2026-10-10 23:00:00[&jusqua=...]&start=0&limit=500} →
 * {@code {success, depuis, serveurMaintenant, total, start, limit, data:[{...produit comme v1/vente/search...,
 * statut:"actif"} | {lgFAMILLEID, statut:"supprime"}]}}. Les dates sont celles de l'horloge de la base
 * ({@code yyyy-MM-dd HH:mm:ss}) ; le telephone repasse {@code serveurMaintenant} en {@code jusqua} pour les pages
 * suivantes, puis en {@code depuis} (moins une marge) a la mise a jour suivante.
 * <p>
 * Authentification : session habituelle de l'application (cookie), comme {@code v1/vente/search} ; le prefixe
 * {@code v1/app-vente/} n'a aucune exception dans filter.AuthenticationFilter (distinct de {@code v1/mobile/}).
 */
@Path("v1/app-vente/catalogue")
@Produces(MediaType.APPLICATION_JSON)
public class MobileCatalogueRessource {

    @EJB
    private MobileCatalogueDeltaService service;
    @EJB
    private SessionHelperService sessionHelperService;

    @GET
    @Path("changements")
    public Response changements(@QueryParam("depuis") String depuis, @QueryParam("jusqua") String jusqua,
            @QueryParam("start") int start, @QueryParam("limit") int limit) {
        TUser u = sessionHelperService.getCurrentUser();
        if (u == null || u.getLgEMPLACEMENTID() == null) {
            return erreur(Response.Status.UNAUTHORIZED, "Veuillez vous connecter.");
        }
        Date d = MobileCatalogueDeltaService.lire(depuis);
        if (d == null) {
            return erreur(Response.Status.BAD_REQUEST,
                    "Parametre depuis obligatoire (" + MobileCatalogueDeltaService.FORMAT + ", horloge du serveur).");
        }
        Date j = null;
        if (jusqua != null && !jusqua.trim().isEmpty()) {
            j = MobileCatalogueDeltaService.lire(jusqua);
            if (j == null) {
                return erreur(Response.Status.BAD_REQUEST, "Parametre jusqua illisible.");
            }
        }
        JSONObject o = service.changements(d, j, start, limit, u.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        return Response.ok(o.toString(), MediaType.APPLICATION_JSON).build();
    }

    private static Response erreur(Response.Status s, String msg) {
        return Response.status(s).type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", msg).toString()).build();
    }
}
