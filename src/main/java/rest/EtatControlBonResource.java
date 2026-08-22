package rest;

import bll.common.Parameter;
import java.io.IOException;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.EtatControlBonService;
import rest.service.dto.EtatControlBonEditDto;

/**
 *
 * @author koben
 */
@Path("v1/etat-control-bon")
@Produces("application/json")
@Consumes("application/json")
public class EtatControlBonResource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EtatControlBonService etatControlBonService;
    @EJB
    private ExportExcelUtilService exportExcelUtilService;
    @EJB
    private rest.service.ReserveService reserveService;

    @GET
    @Path("list")
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search") String search, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "dateType") String dateType) {
        boolean returnFullBLLAuthority = Utils.hasAuthorityByName(Utils.getconnectedUserPrivileges(servletRequest),
                Parameter.ACTION_RETURN_FULL_BL);

        return Response.ok().entity(etatControlBonService
                .list(returnFullBLLAuthority, search, dtStart, dtEnd, grossisteId, start, limit, dateType).toString())
                .build();

    }

    @GET
    @Path("list-annuelle")
    public Response listAnnuelle(@QueryParam(value = "groupeId") Integer groupeId,
            @QueryParam(value = "groupBy") String groupBy, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        return Response.ok().entity(
                etatControlBonService.listBonAnnuelView(groupBy, dtStart, dtEnd, grossisteId, groupeId).toString())
                .build();

    }

    @GET
    @Path("etat-annuel")
    public Response etatLastThreeYears() {
        return Response.ok().entity(etatControlBonService.etatLastThreeYears().toString()).build();

    }

    @GET
    @Path("achats-mensuels")
    public Response achatsMensuels(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "type") String type) {
        return Response.ok().entity(etatControlBonService.achatsMensuelsView(dtStart, dtEnd, type).toString()).build();

    }

    @POST
    @Path("edit")
    public Response editBon(EtatControlBonEditDto bonEditDto) {
        return Response.ok().entity(etatControlBonService.updateBon(bonEditDto).toString()).build();

    }

    /**
     * Cree un inventaire sur les produits d'un ou plusieurs bons de livraison.
     *
     * <p>
     * Enchainement naturel du controle des achats : on vient de recevoir une livraison, on veut recompter ce qu'elle
     * contenait. L'ecran n'envoie que les identifiants des bons ; c'est le serveur qui en tire la liste des produits,
     * un bon pouvant porter des centaines de lignes.
     *
     * @param body
     *            tableau JSON des identifiants de bons, par exemple {@code ["id1","id2"]}
     */
    @POST
    @Path("inventaire")
    public Response inventaireDepuisBons(String body) throws org.json.JSONException {
        javax.servlet.http.HttpSession hs = servletRequest.getSession();
        dal.TUser user = (dal.TUser) hs.getAttribute(util.Constant.AIRTIME_USER);
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(util.Constant.DECONNECTED_MESSAGE)).build();
        }
        java.util.List<String> bons = new java.util.ArrayList<>();
        org.json.JSONArray tableau = new org.json.JSONArray(body == null ? "[]" : body);
        for (int i = 0; i < tableau.length(); i++) {
            String id = tableau.optString(i, "").trim();
            if (!id.isEmpty()) {
                bons.add(id);
            }
        }
        if (bons.isEmpty()) {
            return Response.ok().entity(new org.json.JSONObject().put("success", false)
                    .put("msg", "Veuillez sélectionner au moins un bon de livraison.").toString()).build();
        }
        java.util.Set<String> produits = etatControlBonService.produitsDesBons(bons);
        if (produits.isEmpty()) {
            return Response.ok().entity(new org.json.JSONObject().put("success", false)
                    .put("msg", "Ces bons de livraison ne contiennent aucun produit.").toString()).build();
        }
        String quoi = bons.size() == 1 ? "du bon de livraison " + bons.get(0)
                : "de " + bons.size() + " bons de livraison";
        // Titre laisse au service : il porte la convention de nommage et l'horodatage des inventaires.
        return Response.ok().entity(
                reserveService.createInventaireFromSelection(user, produits, "Inventaire issu " + quoi).toString())
                .build();
    }

    @GET
    @Path("export-annuel-excel")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportEtatAnnuelToExecel(@QueryParam(value = "groupeId") Integer groupeId,
            @QueryParam(value = "groupBy") String groupBy, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws IOException {

        return this.exportExcelUtilService.exportToExecel(
                etatControlBonService.generate(groupBy, dtStart, dtEnd, grossisteId, groupeId), "etat_control_annuel_");

    }

    @GET
    @Path("export-excel")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToExecel(@QueryParam(value = "search") String search,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dateType") String dateType)
            throws IOException {

        return this.exportExcelUtilService.exportToExecel(
                etatControlBonService.generate(search, dtStart, dtEnd, grossisteId, dateType), "etat_control_");

    }
}
