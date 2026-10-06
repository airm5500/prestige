package rest;

import dal.TUser;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.DisponibiliteService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * DISPONIBILITE PHARMAML (plan d'octobre 1.2), pour une suggestion ou une commande :
 * <ul>
 * <li>GET produits : produits a interroger (tous, ou indisponibles) ;</li>
 * <li>POST verifier : une interrogation de 50 produits au plus (l'ecran enchaine les paquets) ;</li>
 * <li>GET etat : dernier resultat par produit (colonne « Dispo ») ;</li>
 * <li>GET pdf : impression, ouverte dans l'onglet.</li>
 * </ul>
 * Information seulement : aucune commande n'est passee.
 */
@Path("v1/disponibilite")
@Produces(MediaType.APPLICATION_JSON)
public class DisponibiliteRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private DisponibiliteService service;

    @EJB
    private ReportUtil reportUtil;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static Response echec(String m) {
        return Response.ok(new JSONObject().put("success", false).put("msg", m).toString()).build();
    }

    @GET
    @Path("produits")
    public Response produits(@QueryParam("source") String source, @QueryParam("id") String id,
            @DefaultValue("false") @QueryParam("indisponibles") boolean indisponibles) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        return Response.ok(service.produits(source, id, indisponibles).toString()).build();
    }

    @POST
    @Path("verifier")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response verifier(String corps) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        JSONObject c;
        try {
            c = new JSONObject(corps);
        } catch (Exception e) {
            return echec("Demande invalide");
        }
        List<String> familles = new ArrayList<>();
        JSONArray a = c.optJSONArray("familles");
        for (int i = 0; a != null && i < a.length(); i++) {
            familles.add(a.getString(i));
        }
        return Response.ok(service
                .verifier(c.optString("source"), c.optString("id"), c.optString("grossisteId", null), familles, u)
                .toString()).build();
    }

    @GET
    @Path("etat")
    public Response etat(@QueryParam("source") String source, @QueryParam("id") String id) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        return Response.ok(service.etat(source, id).toString()).build();
    }

    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("source") String source, @QueryParam("id") String id,
            @QueryParam("reference") String reference) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Map<String, Object> parametres = reportUtil.officineData(u);
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS",
                "DISPONIBILITÉ CHEZ LE GROSSISTE (PHARMAML) — "
                        + (DisponibiliteService.SUGGESTION.equals(source) ? "SUGGESTION " : "COMMANDE ")
                        + (reference == null ? "" : reference));
        String url = reportUtil.buildReport(parametres, "disponibilite_pharmaml", service.lignesImpression(source, id));
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=disponibilite_pharmaml.pdf").build();
    }
}
