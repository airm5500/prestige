package rest;

import dal.TUser;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.enterprise.concurrent.ManagedExecutorService;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import rest.service.StockReapproService;
import job.SemoisService;
import config.AppConfig;
import toolkits.parameters.commonparameter;

/**
 *
 * @author koben
 */
@Path("v1/update")
@Produces("application/json")
@Consumes("application/json")
public class BatchUpdateRessource {

    @Resource(name = "concurrent/__defaultManagedExecutorService")
    ManagedExecutorService mes;
    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private StockReapproService stockReapproService;
    @EJB
    private SemoisService semoisService;
    @EJB
    private AppConfig appConfig;

    @GET
    @Path("/compute-reappro")
    public Response computeReapprovisionnement() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult("Vous êtes déconnecté. Veuillez vous reconnecter"))
                    .build();
        }
        // Meme controle que le bouton 'Recalculer seuils' de l'ecran : privilege obligatoire cote serveur
        @SuppressWarnings("unchecked")
        java.util.List<dal.TPrivilege> privileges = (java.util.List<dal.TPrivilege>) hs
                .getAttribute(util.Constant.USER_LIST_PRIVILEGE);
        if (privileges == null
                || !util.DateConverter.hasAuthorityByName(privileges, util.Constant.P_BTN_RECALCULER_SEUILS)) {
            return Response.ok().entity(
                    "{\"success\":false,\"message\":\"Vous n'avez pas le privilège requis pour cette opération\"}")
                    .build();
        }
        // Recalcul immediat selon le MODE ACTIF (sans attendre la fin du mois) :
        // mode "semois" -> SEMOIS (normal / ABC / par-produit selon les parametres) ; sinon mode defaut.
        // Execution SYNCHRONE : on rend la main une fois le recalcul termine (l'IHM en informe l'utilisateur).
        try {
            if (appConfig != null && appConfig.isSemoisReapproMode()) {
                semoisService.computeReapproSemois();
            } else {
                stockReapproService.computeReappro();
            }
            return Response.ok().entity("{\"success\":true,\"message\":\"Recalcul des seuils termine\"}").build();
        } catch (Exception e) {
            return Response.ok().entity("{\"success\":false,\"message\":\"Echec du recalcul des seuils\"}").build();
        }
    }

}
