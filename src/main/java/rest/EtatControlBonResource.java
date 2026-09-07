package rest;

import bll.common.Parameter;
import java.io.IOException;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
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
    /** Edition de l'etat de controle des achats (point 17). */
    @EJB
    private rest.report.ReportUtil reportUtil;

    @GET
    @Path("list")
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search") String search, @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "dateType") String dateType,
            @DefaultValue("") @QueryParam(value = "statutControle") String statutControle,
            @DefaultValue("") @QueryParam(value = "ecart") String ecart) {
        boolean returnFullBLLAuthority = Utils.hasAuthorityByName(Utils.getconnectedUserPrivileges(servletRequest),
                Parameter.ACTION_RETURN_FULL_BL);

        return Response.ok().entity(etatControlBonService.list(returnFullBLLAuthority, search, dtStart, dtEnd,
                grossisteId, start, limit, dateType, statutControle, ecart).toString()).build();

    }

    /**
     * Impression de l'etat de controle des achats (point 17) : memes criteres que l'ecran, filtres de statut et
     * d'ecarts compris, sur TOUT le resultat. Les criteres retenus sont rappeles en tete de l'etat, faute de quoi une
     * impression sortie de son contexte ne se relit pas.
     *
     * @return l'URL du PDF genere, que l'ecran ouvre dans un onglet.
     */
    @GET
    @Path("print")
    public Response print(@QueryParam(value = "search") String search,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "dateType") String dateType,
            @DefaultValue("") @QueryParam(value = "statutControle") String statutControle,
            @DefaultValue("") @QueryParam(value = "ecart") String ecart) {
        dal.TUser user = (dal.TUser) servletRequest.getSession().getAttribute(util.Constant.AIRTIME_USER);
        if (user == null) {
            return Response.ok().entity(new org.json.JSONObject().put("success", false)
                    .put("msg", util.Constant.DECONNECTED_MESSAGE).toString()).build();
        }
        try {
            boolean fullAuth = Utils.hasAuthorityByName(Utils.getconnectedUserPrivileges(servletRequest),
                    Parameter.ACTION_RETURN_FULL_BL);
            rest.service.filtre.FiltresControleAchat filtres = new rest.service.filtre.FiltresControleAchat(
                    statutControle, ecart);
            java.util.List<rest.service.dto.EtatControlBon> bons = etatControlBonService.tous(fullAuth, search, dtStart,
                    dtEnd, grossisteId, dateType, statutControle, ecart);
            java.util.List<rest.service.dto.LigneControleAchat> lignes = new java.util.ArrayList<>();
            bons.forEach(b -> lignes.add(rest.service.dto.LigneControleAchat.de(b)));

            java.util.Map<String, Object> parametres = reportUtil.officineData(user);
            parametres.put("P_H_CLT_INFOS", "ÉTAT DE CONTRÔLE DES ACHATS");
            StringBuilder periode = new StringBuilder("Période du " + dtStart + " au " + dtEnd);
            for (String critere : filtres.libelles()) {
                periode.append("   |   ").append(critere);
            }
            if (search != null && !search.trim().isEmpty()) {
                periode.append("   |   Recherche : ").append(search.trim());
            }
            periode.append("   |   ").append(lignes.size()).append(" bon(s)");
            parametres.put("P_PERIODE", periode.toString());
            String url = reportUtil.buildReport(parametres, "controle_achats", lignes);
            if (org.apache.commons.lang3.StringUtils.isNotBlank(url)
                    && !new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1)))
                            .exists()) {
                url = "";
            }
            if (org.apache.commons.lang3.StringUtils.isBlank(url)) {
                return Response.ok().entity(new org.json.JSONObject().put("success", false)
                        .put("msg", "Impossible de générer le PDF").toString()).build();
            }
            return Response.ok().entity(new org.json.JSONObject().put("success", true).put("msg", url).toString())
                    .build();
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(EtatControlBonResource.class.getName())
                    .log(java.util.logging.Level.SEVERE, "impression de l'etat de controle des achats", e);
            return Response.ok().entity(new org.json.JSONObject().put("success", false)
                    .put("msg", "Impossible de générer le PDF").toString()).build();
        }
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

    /**
     * Marque le reglement d'une selection de bons de livraison.
     *
     * <p>
     * L'ecran postait jusqu'ici vers {@code ws_transaction2.jsp}, page qui n'a jamais existe dans le projet : le
     * reglement rendait donc un 404 et n'enregistrait rien. Le bouton qui y menait etant cache depuis l'origine,
     * personne ne pouvait s'en apercevoir.
     *
     * @param body
     *            {@code {"bons":["id1","id2"],"statut":"REGLE","date":"2026-08-22","montantRegle":0}}
     */
    @POST
    @Path("reglement")
    public Response reglerBons(String body) throws org.json.JSONException {
        javax.servlet.http.HttpSession hs = servletRequest.getSession();
        if (hs.getAttribute(util.Constant.AIRTIME_USER) == null) {
            return Response.ok().entity(ResultFactory.getFailResult(util.Constant.DECONNECTED_MESSAGE)).build();
        }
        org.json.JSONObject entree = new org.json.JSONObject(body == null ? "{}" : body);
        java.util.List<String> bons = new java.util.ArrayList<>();
        org.json.JSONArray tableau = entree.optJSONArray("bons");
        for (int i = 0; tableau != null && i < tableau.length(); i++) {
            String id = tableau.optString(i, "").trim();
            if (!id.isEmpty()) {
                bons.add(id);
            }
        }
        Integer montant = entree.has("montantRegle") ? entree.optInt("montantRegle") : null;
        return Response.ok().entity(etatControlBonService
                .reglerBons(bons, entree.optString("statut", ""), entree.optString("date", ""), montant).toString())
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
