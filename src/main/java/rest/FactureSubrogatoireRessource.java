package rest;

import dal.TPrivilege;
import dal.TUser;
import java.io.File;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.impl.FactureSubrogatoireService;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;
import util.CommonUtils;
import util.Constant;

/**
 * FACTURES SUBROGATOIRES (ecran « facturesubrogatoire ») passees en API, demande de l'officine du 05/10.
 *
 * <p>
 * Memes parametres que les pages JSP, conservees (dt_Date_Debut / dt_Date_Fin AAAA-MM-JJ, h_debut / h_fin HH:mm,
 * search_value, lg_TIERS_PAYANT_ID, start / limit), memes regles : periode vide = aujourd'hui, heures vides = toute la
 * journee ; sans le droit str_SHOW_VENTE l'operateur ne voit que ses ventes, sans P_SHOW_ALL_ACTIVITY que son
 * emplacement. Le PDF (releve des ventes a credit) s'ouvre dans l'onglet.
 */
@Path("v1/facture-subrogatoire")
public class FactureSubrogatoireRessource {

    private static final DateTimeFormatter AFFICHE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private FactureSubrogatoireService service;

    @EJB
    private ReportUtil reportUtil;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise(String privilege) {
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                privilege);
    }

    private static boolean vide(String v) {
        return StringUtils.isBlank(v) || "null".equalsIgnoreCase(v.trim());
    }

    /** Jour AAAA-MM-JJ tel que recu, ou aujourd'hui s'il est vide (comme la page JSP). */
    private static String jour(String v) {
        return vide(v) ? LocalDate.now().toString() : v.trim();
    }

    private static String heure(String v, String parDefaut) {
        return vide(v) ? parDefaut : v.trim();
    }

    private List<FactureSubrogatoireService.Vente> lister(TUser user, String debut, String fin, String hDebut,
            String hFin, String recherche, String tiersPayantId) {
        return service.lister(jour(debut), jour(fin), heure(hDebut, "00:00"), heure(hFin, "23:59"), recherche,
                vide(tiersPayantId) ? null : tiersPayantId.trim(),
                autorise(commonparameter.str_SHOW_VENTE) ? null : user.getLgUSERID(),
                autorise(Constant.P_SHOW_ALL_ACTIVITY) || user.getLgEMPLACEMENTID() == null ? null
                        : user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
    }

    @GET
    @Path("liste")
    @Produces("application/json")
    public Response liste(@QueryParam("dt_Date_Debut") String debut, @QueryParam("dt_Date_Fin") String fin,
            @QueryParam("h_debut") String hDebut, @QueryParam("h_fin") String hFin,
            @QueryParam("search_value") String recherche, @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @QueryParam("start") int start, @QueryParam("limit") Integer limit) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                    .put("message", Constant.DECONNECTED_MESSAGE).toString()).build();
        }
        return Response.ok().entity(service.page(lister(user, debut, fin, hDebut, hFin, recherche, tiersPayantId),
                start, limit == null ? jdom.int_size_pagination : limit).toString()).build();
    }

    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("dt_Date_Debut") String debut, @QueryParam("dt_Date_Fin") String fin,
            @QueryParam("h_debut") String hDebut, @QueryParam("h_fin") String hFin,
            @QueryParam("search_value") String recherche, @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Map<String, Object> parametres = reportUtil.officineData(user);
        // Milliers separes par un point, comme a l'ecran (1.390 et non 1,390).
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        String du = jour(debut), au = jour(fin);
        String titre;
        try {
            titre = "RELEVE DES VENTES A CREDIT " + LocalDate.parse(du).format(AFFICHE) + " AU "
                    + LocalDate.parse(au).format(AFFICHE);
        } catch (Exception e) {
            titre = "RELEVE DES VENTES A CREDIT " + du + " AU " + au;
        }
        parametres.put("P_H_CLT_INFOS", titre);
        String url = reportUtil.buildReport(parametres, "facture_subrogatoire",
                service.pourEdition(lister(user, debut, fin, hDebut, hFin, recherche, tiersPayantId)));
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=facture_subrogatoire.pdf").build();
    }
}
