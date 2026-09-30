package rest;

import dal.TPrivilege;
import dal.TUser;
import java.io.File;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.impl.MouchardPrixService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * MOUCHARD DES PRIX DE VENTE (ecran « mouvementprixvente ») passe en API, demande de l'officine du 30/09.
 *
 * <p>
 * Memes parametres que les anciennes pages JSP (dt_Date_Debut / dt_Date_Fin au format AAAA-MM-JJ, search_value,
 * str_ACTION, lg_USER_ID, start / limit), memes regles : periode vide = aujourd'hui ; l'operateur ne voit que son
 * emplacement, sauf avec P_SHOW_ALL_ACTIVITY_ADMIN pour la liste et P_SHOW_ALL_ACTIVITY pour l'edition, comme avant. Le
 * PDF s'ouvre dans l'onglet (aucune fenetre surgissante).
 */
@Path("v1/mouchard-prix")
public class MouchardPrixRessource {

    private static final String P_SHOW_ALL_ACTIVITY_ADMIN = "P_SHOW_ALL_ACTIVITY_ADMIN";
    private static final DateTimeFormatter AFFICHE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private MouchardPrixService service;

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

    /** Jour AAAA-MM-JJ, ou aujourd'hui si vide ou illisible (comme la page JSP). */
    private static LocalDate jour(String valeur) {
        try {
            return valeur == null || valeur.trim().isEmpty() ? LocalDate.now() : LocalDate.parse(valeur.trim());
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private static Date date(LocalDate jour, LocalTime heure) {
        return Date.from(jour.atTime(heure).atZone(ZoneId.systemDefault()).toInstant());
    }

    private String emplacement(TUser user, String privilege) {
        return autorise(privilege) || user.getLgEMPLACEMENTID() == null ? null
                : user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    @GET
    @Path("liste")
    @Produces("application/json")
    public Response liste(@QueryParam("dt_Date_Debut") String debut, @QueryParam("dt_Date_Fin") String fin,
            @QueryParam("search_value") String recherche, @QueryParam("str_ACTION") String action,
            @QueryParam("lg_USER_ID") String utilisateurId, @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                    .put("message", Constant.DECONNECTED_MESSAGE).toString()).build();
        }
        return Response.ok()
                .entity(service.page(service.lister(recherche, date(jour(debut), LocalTime.MIN),
                        date(jour(fin), LocalTime.of(23, 59)), utilisateurId, action,
                        emplacement(user, P_SHOW_ALL_ACTIVITY_ADMIN)), start, limit).toString())
                .build();
    }

    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("dt_Date_Debut") String debut, @QueryParam("dt_Date_Fin") String fin,
            @QueryParam("search_value") String recherche, @QueryParam("str_ACTION") String action,
            @QueryParam("lg_USER_ID") String utilisateurId) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate du = jour(debut), au = jour(fin);
        Map<String, Object> parametres = reportUtil.officineData(user);
        // Milliers separes par un point, comme a l'ecran (1.390 et non 1,390).
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS",
                ("Mouchard de prix de vente du " + du.format(AFFICHE) + " au " + au.format(AFFICHE)).toUpperCase());
        String url = reportUtil.buildReport(parametres, "mouchard_prix_vente",
                service.lignesEdition(service.lister(recherche, date(du, LocalTime.MIN), date(au, LocalTime.of(23, 59)),
                        utilisateurId, action, emplacement(user, Constant.P_SHOW_ALL_ACTIVITY))));
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=mouchard_prix_vente.pdf").build();
    }
}
