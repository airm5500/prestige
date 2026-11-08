package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.qualifier.SalesPrimary;
import rest.service.MotifVenteService;
import rest.service.SalesService;
import util.CommonUtils;
import util.Constant;

/**
 * Plan du 08/11, point 18 : motif obligatoire sur l'annulation et la modification d'une vente ; recapitulatif par motif
 * et par auteur de la vente (onglet « Analyse » des ventes annulees, activite des equipes).
 */
@Path("v1/vente-motifs")
@Produces("application/json")
@Consumes("application/json")
public class MotifVenteRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @Inject
    @SalesPrimary
    SalesService salesService;
    @EJB
    private MotifVenteService motifVenteService;

    private TUser utilisateur() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    private static Response json(JSONObject o) {
        return Response.ok().entity(o.toString()).build();
    }

    private static Response refus(String msg) {
        return json(new JSONObject().put("success", false).put("msg", msg));
    }

    @GET
    @Path("motifs")
    public Response motifs() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return json(new JSONObject().put("success", true).put("data", motifVenteService.motifs()));
    }

    /** Annulation avec motif : memes droits et meme service que l'annulation de « Ventes terminées ». */
    @POST
    @Path("annulation/{id}")
    public Response annuler(@PathParam("id") String id, String corps) {
        TUser tu = utilisateur();
        if (tu == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        @SuppressWarnings("unchecked")
        boolean droit = CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(Constant.USER_LIST_PRIVILEGE),
                Constant.P_BT_ANNULER_VENTE);
        if (!droit) {
            return refus("Vous n'avez pas l'autorisation d'annuler une vente");
        }
        JSONObject p = corps == null || corps.isEmpty() ? new JSONObject() : new JSONObject(corps);
        String motifId = p.optString("motifId", ""), commentaire = p.optString("commentaire", "");
        String r = motifVenteService.refus(motifId, commentaire);
        if (r != null) {
            return refus(r);
        }
        /* auteur d'origine lu AVANT l'annulation (elle remplace l'utilisateur de la vente par l'annulateur) */
        JSONObject origine = motifVenteService.origine(id);
        JSONObject res = salesService.annulerVente(tu, id);
        if (res.optBoolean("success") && origine != null) {
            motifVenteService.enregistrerAnnulation(origine, motifId, commentaire, tu);
        }
        return json(res);
    }

    @POST
    @Path("modification/{id}")
    public Response modification(@PathParam("id") String id, String corps) {
        TUser tu = utilisateur();
        if (tu == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        JSONObject p = corps == null || corps.isEmpty() ? new JSONObject() : new JSONObject(corps);
        return json(motifVenteService.ouvrirModification(id, p.optString("motifId", ""), p.optString("commentaire", ""),
                tu));
    }

    @GET
    @Path("recap")
    public Response recap(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("type") String type, @QueryParam("employeId") String employeId) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return json(motifVenteService.recap(dtStart, dtEnd, type, employeId));
    }
}
