package rest;

import dal.TUser;
import java.io.File;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.impl.AvoirsBonLivraisonService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Produits en avoir d'un bon de livraison (demande du 05/10) : la liste pour la fenetre affichee apres l'entree en
 * stock et depuis l'etat de controle des achats, et son edition PDF (ouverte dans l'onglet). Lecture seule.
 */
@Path("v1/avoirs-bon")
public class AvoirsBonLivraisonRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private AvoirsBonLivraisonService service;

    @EJB
    private ReportUtil reportUtil;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @GET
    @Path("{bonId}")
    @Produces("application/json")
    public Response liste(@PathParam("bonId") String bonId) {
        if (utilisateur() == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        return Response.ok().entity(service.liste(bonId).toString()).build();
    }

    @EJB
    private rest.service.impl.AvoirsEnvoiService envoiService;

    /** Retours du 22/11 (lot 10, point 3) : etat de l'envoi des messages d'avoir du bon. */
    @GET
    @Path("{bonId}/envoi")
    @Produces("application/json")
    public Response etatEnvoi(@PathParam("bonId") String bonId) {
        if (utilisateur() == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        return Response.ok().entity(envoiService.etat(bonId).toString()).build();
    }

    /**
     * Retours du 22/11 (lot 10, point 3) : envoi des messages d'avoir du bon pas encore partis. mode=MANUEL avec
     * canal=SMS ou WHATSAPP (choix de l'utilisateur, trace) ; mode=AUTO (fermeture de la fenetre) : canal du parametre.
     */
    @POST
    @Path("{bonId}/envoyer")
    @Produces("application/json")
    public Response envoyer(@PathParam("bonId") String bonId, @javax.ws.rs.QueryParam("canal") String canal,
            @javax.ws.rs.QueryParam("mode") String mode) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        return Response.ok()
                .entity(envoiService.envoyer(bonId, canal, rest.service.impl.AvoirsEnvoiService.MANUEL.equals(mode)
                        ? rest.service.impl.AvoirsEnvoiService.MANUEL : rest.service.impl.AvoirsEnvoiService.AUTO,
                        user.getLgUSERID()).toString())
                .build();
    }

    @GET
    @Path("{bonId}/pdf")
    @Produces("application/pdf")
    public Response pdf(@PathParam("bonId") String bonId) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        String reference = service.referenceBon(bonId);
        Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS",
                "PRODUITS EN AVOIR DU BON DE LIVRAISON " + (reference == null ? "" : reference));
        String url = reportUtil.buildReport(parametres, "avoirs_bon_livraison", service.lignes(bonId));
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=avoirs_bon_livraison.pdf").build();
    }
}
