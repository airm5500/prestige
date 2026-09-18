package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.impl.PilotageService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Menu de pilotage (evolution 6, point 1).
 *
 * <p>
 * Un menu de pilotage donne a lire l'activite et les marges de l'officine : il est donc sous son propre privilege,
 * verifie a chaque appel. Le tableau de bord existant n'est pas touche.
 */
@Path("v1/pilotage")
@Produces("application/json")
@Consumes("application/json")
public class PilotageRessource {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger
            .getLogger(PilotageRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private PilotageService pilotageService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        List<TPrivilege> privileges = (List<TPrivilege>) servletRequest.getSession()
                .getAttribute(commonparameter.USER_LIST_PRIVILEGE);
        return CommonUtils.hasAuthorityByName(privileges, DateConverter.P_SM_PILOTAGE);
    }

    private static Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                .put("message", Constant.DECONNECTED_MESSAGE).toString()).build();
    }

    private static Response refus() {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("total", 0)
                        .put("message", "Votre profil ne donne pas accès au pilotage de l'officine.").toString())
                .build();
    }

    /** Les axes de comparaison proposes : la liste vient du serveur, pour que l'ecran et le calcul ne divergent pas. */
    @GET
    @Path("axes")
    public Response axes() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise()) {
            return refus();
        }
        return Response.ok().entity(pilotageService.axes().toString()).build();
    }

    /**
     * Les KPI coches arrivent en une seule chaine separee par des virgules : une liste de parametres repetes serait
     * plus « propre » en theorie, mais illisible dans un journal d'acces et penible a relire.
     */
    private static PilotageService.Choix choix(String kpis, String type, String objetA, String objetB,
            String grandeur) {
        java.util.List<String> coches = new java.util.ArrayList<>();
        if (kpis != null) {
            for (String cle : kpis.split(",")) {
                if (!cle.trim().isEmpty()) {
                    coches.add(cle.trim());
                }
            }
        }
        return new PilotageService.Choix(coches, type, objetA, objetB, grandeur);
    }

    /** Catalogue des KPI cochables : la liste vient du serveur, pour que l'ecran et le calcul ne divergent pas. */
    @GET
    @Path("kpis")
    public Response kpis() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise()) {
            return refus();
        }
        return Response.ok().entity(pilotageService.catalogueKpi().toString()).build();
    }

    /**
     * Grossistes qui ont reellement livre sur la fenetre regardee.
     *
     * <p>
     * La liste depend de la periode : proposer au filtre des fournisseurs qui n'ont rien livre depuis deux ans ferait
     * chercher longtemps pour ne rien trouver.
     */
    @GET
    @Path("grossistes")
    public Response grossistes(@QueryParam("axe") String axe, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise()) {
            return refus();
        }
        return Response.ok().entity(pilotageService.grossistes(axe, debut, fin).toString()).build();
    }

    /** PDF de l'onglet, servi EN FLUX dans l'onglet ouvert par le clic : aucune fenetre surgissante. */
    @javax.ws.rs.GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("onglet") String onglet, @QueryParam("axe") String axe,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("grossisteId") String grossisteId, @QueryParam("familleId") String familleId,
            @QueryParam("emplacementId") String emplacementId, @QueryParam("kpis") String kpis,
            @QueryParam("type") String type, @QueryParam("objetA") String objetA, @QueryParam("objetB") String objetB,
            @QueryParam("grandeur") String grandeur) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise()) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            return Response
                    .ok(pilotageService.pdf(operateur, onglet, axe, debut, fin,
                            new PilotageService.Filtres(grossisteId, familleId, emplacementId),
                            choix(kpis, type, objetA, objetB, grandeur)))
                    .type("application/pdf").header("Content-Disposition", "inline; filename=\"pilotage.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "pilotage : edition " + onglet, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** Export Excel de l'onglet, filtres compris. */
    @javax.ws.rs.GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("onglet") String onglet, @QueryParam("axe") String axe,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("grossisteId") String grossisteId, @QueryParam("familleId") String familleId,
            @QueryParam("emplacementId") String emplacementId, @QueryParam("kpis") String kpis,
            @QueryParam("type") String type, @QueryParam("objetA") String objetA, @QueryParam("objetB") String objetB,
            @QueryParam("grandeur") String grandeur) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise()) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            return Response
                    .ok(pilotageService.excel(operateur, onglet, axe, debut, fin,
                            new PilotageService.Filtres(grossisteId, familleId, emplacementId),
                            choix(kpis, type, objetA, objetB, grandeur)))
                    .type("application/vnd.ms-excel")
                    .header("Content-Disposition", "attachment; filename=\"pilotage.xls\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "pilotage : export " + onglet, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Donnees d'un onglet.
     *
     * @param onglet
     *            synthese, ventes ou marge
     * @param axe
     *            code d'axe de comparaison ({@code MOIS}, {@code VS_M1}, {@code VS_N1}, {@code YTD}, {@code G12},
     *            {@code PERSO}) ; un code inconnu retombe sur le mois en cours plutot que d'echouer
     */
    @GET
    @Path("onglet/{onglet}")
    public Response onglet(@PathParam("onglet") String onglet, @QueryParam("axe") String axe,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("grossisteId") String grossisteId, @QueryParam("familleId") String familleId,
            @QueryParam("emplacementId") String emplacementId, @QueryParam("kpis") String kpis,
            @QueryParam("type") String type, @QueryParam("objetA") String objetA, @QueryParam("objetB") String objetB,
            @QueryParam("grandeur") String grandeur) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise()) {
            return refus();
        }
        try {
            return Response.ok()
                    .entity(pilotageService.donnees(operateur, onglet, axe, debut, fin,
                            new PilotageService.Filtres(grossisteId, familleId, emplacementId),
                            choix(kpis, type, objetA, objetB, grandeur)).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "pilotage : onglet " + onglet, e);
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Les chiffres n'ont pas pu être rassemblés.").toString()).build();
        }
    }
}
