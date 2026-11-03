package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.LitigeService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Litiges tiers payant (audit 05 LI-01..08, notice litiges L1..L5) : remplace les JSP
 * webservices/configmanagement/litige/ws_data.jsp, ws_transaction.jsp et ws_transaction2.jsp (gardees dans le depot,
 * plus appelees par l'ecran). Les trois portes d'entree restent : ecran Litiges, Facturation tiers payant, detail de la
 * balance agee.
 */
@Path("v1/litiges")
@Produces("application/json")
@Consumes("application/json")
public class LitigeRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private LitigeService litigeService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response ok(JSONObject json) {
        return Response.ok().entity(json.toString()).build();
    }

    private static Response deconnecte() {
        return ok(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0));
    }

    @GET
    public Response liste(@QueryParam("query") String query, @QueryParam("lg_TYPELITIGE_ID") String typeId,
            @QueryParam("filtre") String filtre, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return ok(litigeService.liste(query, typeId, filtre, start, limit));
    }

    @GET
    @Path("types")
    public Response types() {
        if (currentUser() == null) {
            return deconnecte();
        }
        return ok(litigeService.types());
    }

    @GET
    @Path("dossiers")
    public Response dossiers(@QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @QueryParam("lg_COMPTE_CLIENT_TIERS_PAYANT_ID") String compteId, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return ok(litigeService.dossiers(tiersPayantId, compteId, query, start, limit));
    }

    @GET
    @Path("{id}")
    public Response detail(@PathParam("id") String id) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return ok(litigeService.detail(id));
    }

    @POST
    @Path("create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response creer(@FormParam("lg_DOSSIER_ID") String dossierId, @FormParam("lg_TYPELITIGE_ID") String typeId,
            @FormParam("str_LIBELLE") String libelle, @FormParam("str_ETAT") String etat,
            @FormParam("str_CONSEQUENCE") String consequence, @FormParam("str_DESCRIPTION") String description,
            @FormParam("str_COMMENTAIRE") String commentaire, @FormParam("int_MONTANT_CONTESTE") String montant) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return ok(litigeService.creer(user, dossierId, typeId, libelle, etat, consequence, description, commentaire,
                montant));
    }

    @POST
    @Path("{id}/annuler")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response annuler(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return ok(litigeService.annuler(user, id));
    }

    @POST
    @Path("{id}/cloturer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response cloturer(@PathParam("id") String id, @FormParam("remboursement") boolean remboursement,
            @FormParam("int_MONTANT") String montant, @FormParam("str_MOTIF") String motif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return ok(litigeService.cloturer(user, id, remboursement, montant, motif));
    }
}
