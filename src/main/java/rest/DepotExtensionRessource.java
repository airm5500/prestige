package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
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
import rest.service.impl.DepotStockSql;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

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

    @SuppressWarnings("unchecked")
    private List<TPrivilege> privilegesSession() {
        return (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    }

    private boolean autorise(String privilege) {
        return CommonUtils.hasAuthorityByName(privilegesSession(), privilege);
    }

    private static Response refusPrivilege() {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("total", 0)
                        .put("message", "Votre profil ne donne pas accès à cette partie de l'écran.").toString())
                .build();
    }

    /**
     * Onglets auxquels l'operateur connecte a droit.
     *
     * <p>
     * Retour du 17/09 : « ajouter un privilege sur chaque onglet de sorte a ne pas permettre que tout le monde voie
     * tout ». L'ecran s'en sert pour n'afficher que les onglets concernes. Le controle qui compte est celui des
     * services, qui le refont chacun : masquer un onglet n'est pas un controle d'acces.
     *
     * <p>
     * Une nuance a connaitre, et elle est dite ici plutot que cachee : les deux services que cet ecran PARTAGE avec les
     * ecrans « Balance Depot » et « Point Caisse Depot » gardent leurs propres privileges, ceux de ces ecrans. Le
     * privilege d'onglet decide donc de l'acces par cet ecran-ci ; il ne retire pas a quelqu'un ce qu'il peut deja
     * consulter par son propre menu, et il n'y pretend pas.
     */
    @GET
    @Path("onglets")
    public Response onglets() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true)
                        .put("valorisation", autorise(DateConverter.P_DEPOT_EXT_VALORISATION))
                        .put("vente", autorise(DateConverter.P_VENTE_DEPOT_EXTENSION))
                        .put("ca", autorise(DateConverter.P_DEPOT_EXT_CA))
                        .put("pointCaisse", autorise(DateConverter.P_DEPOT_EXT_POINT_CAISSE)).toString())
                .build();
    }

    /**
     * Chiffre d'affaires du depot pour l'onglet, sous son propre privilege.
     *
     * <p>
     * Ce service existe pour que l'onglet ait une porte a lui, controlable : l'ecran lisait directement
     * {@code v1/balance/balancesalecashdepot}, partage avec l'ecran « Balance Depot », dont on ne peut pas resserrer le
     * privilege sans casser cet autre ecran. Les chiffres, eux, sortent de la MEME balance : rien n'est recalcule, les
     * deux ecrans ne peuvent donc pas se contredire.
     */
    @GET
    @Path("ca")
    public Response ca(@QueryParam("depotId") String depotId, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_CA)) {
            return refusPrivilege();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return depotInvalide();
        }
        return Response.ok().entity(depotExtensionService.ca(depotId, dtStart, dtEnd).toString()).build();
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
            @QueryParam("familleId") String familleId, @QueryParam("zoneGeoId") String zoneGeoId,
            @QueryParam("filtreStock") String filtreStock,
            @DefaultValue("false") @QueryParam("enStock") boolean enStock) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_VALORISATION)) {
            return refusPrivilege();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return depotInvalide();
        }
        return Response.ok().entity(depotExtensionService
                .valorisationParEmplacement(depotId, criteres(query, familleId, zoneGeoId, filtreStock, enStock))
                .toString()).build();
    }

    /**
     * Criteres communs a tous les services de l'ecran.
     *
     * <p>
     * {@code enStock} vaut FAUX par defaut depuis le retour du 17/09 : l'officine veut la liste complete a l'ouverture,
     * la case « masquer les articles a 0 » n'etant plus cochee au depart. Un appel qui ne precise rien obtient donc ce
     * que l'ecran montre.
     */
    private static DepotStockSql.Criteres criteres(String query, String familleId, String zoneGeoId, String filtreStock,
            boolean enStock) {
        return DepotExtensionService.criteresDe(query, familleId, zoneGeoId, filtreStock, enStock);
    }

    /**
     * Stock du depot : la liste paginee, son total, et la valorisation calculee sur l'ensemble des lignes retenues (et
     * non sur la page affichee).
     */
    @GET
    @Path("stock")
    public Response stock(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @QueryParam("zoneGeoId") String zoneGeoId,
            @QueryParam("filtreStock") String filtreStock,
            @DefaultValue("false") @QueryParam("enStock") boolean enStock,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_VALORISATION)) {
            return refusPrivilege();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return depotInvalide();
        }
        return Response.ok().entity(depotExtensionService
                .stock(depotId, criteres(query, familleId, zoneGeoId, filtreStock, enStock), start, limit).toString())
                .build();
    }

    @GET
    @Path("stock/excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @QueryParam("zoneGeoId") String zoneGeoId,
            @QueryParam("filtreStock") String filtreStock,
            @DefaultValue("false") @QueryParam("enStock") boolean enStock) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_VALORISATION)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        byte[] contenu = depotExtensionService.excel(depotId,
                criteres(query, familleId, zoneGeoId, filtreStock, enStock));
        String nom = "stock_depot_" + depotExtensionService.nomDepot(depotId).replaceAll("[^A-Za-z0-9]+", "_") + ".xls";
        return Response.ok(contenu).header("Content-Disposition", "attachment; filename=\"" + nom + "\"").build();
    }

    /** Edition servie en flux dans l'onglet ouvert par le clic : aucune fenetre intermediaire. */
    @GET
    @Path("stock/pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @QueryParam("familleLibelle") String familleLibelle,
            @QueryParam("zoneGeoId") String zoneGeoId, @QueryParam("emplacementLibelle") String emplacementLibelle,
            @QueryParam("filtreStock") String filtreStock,
            @DefaultValue("false") @QueryParam("enStock") boolean enStock) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_VALORISATION)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] pdf = depotExtensionService.pdf(user, depotId,
                    criteres(query, familleId, zoneGeoId, filtreStock, enStock), familleLibelle, emplacementLibelle);
            return Response.ok(pdf, "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"stock_depot.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition du stock du depot " + depotId, e);
            return Response.serverError().build();
        }
    }

    /**
     * Edition du chiffre d'affaires du depot (retour du 17/09 : « on doit pouvoir imprimer le chiffre d'affaire,
     * prevoir le fichier jrxml »).
     *
     * <p>
     * Servie en flux dans l'onglet ouvert par le clic, comme toutes les editions de cet ecran. Les chiffres sont ceux
     * de la balance du depot, sans recalcul : l'ecran, l'edition et l'ecran « Balance Depot » doivent dire la meme
     * chose.
     */
    @GET
    @Path("ca/pdf")
    @Produces("application/pdf")
    public Response pdfCa(@QueryParam("depotId") String depotId, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_CA)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] pdf = depotExtensionService.pdfCa(user, depotId, dtStart, dtEnd);
            return Response.ok(pdf, "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"chiffre_affaires_depot.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition du chiffre d'affaires du depot " + depotId, e);
            return Response.serverError().build();
        }
    }

    /**
     * Edition de la valorisation ventilee par emplacement (retour du 17/09).
     *
     * <p>
     * Servie en flux, comme l'autre : l'onglet est ouvert dans le clic de l'utilisateur, jamais a l'arrivee de la
     * reponse - le navigateur prendrait sinon l'onglet pour une fenetre surgissante et le bloquerait.
     */
    @GET
    @Path("valorisation-emplacement/pdf")
    @Produces("application/pdf")
    public Response pdfParEmplacement(@QueryParam("depotId") String depotId, @QueryParam("query") String query,
            @QueryParam("familleId") String familleId, @QueryParam("familleLibelle") String familleLibelle,
            @QueryParam("zoneGeoId") String zoneGeoId, @QueryParam("emplacementLibelle") String emplacementLibelle,
            @QueryParam("filtreStock") String filtreStock,
            @DefaultValue("false") @QueryParam("enStock") boolean enStock) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!depotExtensionService.estDepotExtension(depotId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        if (!autorise(DateConverter.P_DEPOT_EXT_VALORISATION)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] pdf = depotExtensionService.pdfParEmplacement(user, depotId,
                    criteres(query, familleId, zoneGeoId, filtreStock, enStock), familleLibelle, emplacementLibelle);
            return Response.ok(pdf, "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"valorisation_emplacement.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition par emplacement du depot " + depotId, e);
            return Response.serverError().build();
        }
    }
}
