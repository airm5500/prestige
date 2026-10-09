package rest;

import dal.TPrivilege;
import dal.TUser;
import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.impl.ArticlesDormantsService;
import rest.service.impl.ArticlesDormantsService.Criteres;
import rest.service.impl.ArticlesDormantsService.Ligne;
import rest.service.utils.ReportExcelExportService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Retours du 09/10 (4) : onglet « Articles dormants » de l'ecran Articles invendus (droit du menu P_SM_STOCKMORT).
 * Liste paginee avec totaux, export Excel et edition PDF des memes lignes.
 */
@Path("v1/articles-dormants")
@Produces("application/json")
public class ArticlesDormantsRessource {

    private static final String P_SM_STOCKMORT = "P_SM_STOCKMORT";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private ArticlesDormantsService service;

    @EJB
    private ReportExcelExportService excel;

    @EJB
    private ReportUtil reportUtil;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), P_SM_STOCKMORT);
    }

    private static Response echec(String msg) {
        return Response.ok(new JSONObject().put("success", false).put("msg", msg).toString()).build();
    }

    private static String emplacement(TUser u) {
        return u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    @GET
    public Response liste(@QueryParam("jours") Integer jours, @QueryParam("query") String query,
            @QueryParam("rayon") String rayon, @QueryParam("grossiste") String grossiste,
            @QueryParam("famille") String famille, @QueryParam("tri") String tri,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("25") @QueryParam("limit") int limit) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return echec("Vous n'avez pas le droit d'accéder aux articles invendus.");
        }
        return Response.ok(
                service.page(new Criteres(jours, query, rayon, grossiste, famille, tri), emplacement(u), start, limit)
                        .toString())
                .build();
    }

    private static final String[] ENTETES = { "CIP", "Désignation", "Rayon", "Grossiste", "Dernière entrée",
            "Qté entrée", "Jours sans vente", "Dernière vente", "Stock", "Prix achat", "Prix vente", "Valeur stock" };

    @GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("jours") Integer jours, @QueryParam("query") String query,
            @QueryParam("rayon") String rayon, @QueryParam("grossiste") String grossiste,
            @QueryParam("famille") String famille, @QueryParam("tri") String tri) throws java.io.IOException {
        TUser u = utilisateur();
        if (u == null || !autorise()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Criteres c = new Criteres(jours, query, rayon, grossiste, famille, tri);
        byte[] data = excel.createExcelReport(
                "Articles dormants : non vendus depuis la dernière entrée (plus de " + c.getJours() + " jours)",
                ENTETES, service.lignes(c, emplacement(u), 0, 0), (row, l) -> {
                    int i = 0;
                    row.createCell(i++).setCellValue(l.getCip());
                    row.createCell(i++).setCellValue(l.getDesignation());
                    row.createCell(i++).setCellValue(l.getRayon() == null ? "" : l.getRayon());
                    row.createCell(i++).setCellValue(l.getGrossiste() == null ? "" : l.getGrossiste());
                    row.createCell(i++).setCellValue(l.getDerniereEntree() == null ? "" : l.getDerniereEntree());
                    row.createCell(i++).setCellValue(l.getQteEntree() == null ? 0 : l.getQteEntree());
                    row.createCell(i++).setCellValue(l.getJours());
                    row.createCell(i++).setCellValue(l.getDerniereVente() == null ? "" : l.getDerniereVente());
                    row.createCell(i++).setCellValue(l.getStock());
                    row.createCell(i++).setCellValue(l.getPrixAchat() == null ? 0 : l.getPrixAchat());
                    row.createCell(i++).setCellValue(l.getPrixVente() == null ? 0 : l.getPrixVente());
                    row.createCell(i).setCellValue(l.getValeurStock());
                });
        String nom = "articles-dormants_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm"))
                + ".xls";
        return Response.ok(data, "application/vnd.ms-excel")
                .header("content-disposition", "attachment; filename=" + nom).build();
    }

    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("jours") Integer jours, @QueryParam("query") String query,
            @QueryParam("rayon") String rayon, @QueryParam("grossiste") String grossiste,
            @QueryParam("famille") String famille, @QueryParam("tri") String tri) {
        TUser u = utilisateur();
        if (u == null || !autorise()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Criteres c = new Criteres(jours, query, rayon, grossiste, famille, tri);
        List<Ligne> lignes = service.lignes(c, emplacement(u), 0, 0);
        long[] t = service.totaux(c, emplacement(u));
        Map<String, Object> parametres = reportUtil.officineData(u);
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS",
                "ARTICLES DORMANTS : NON VENDUS DEPUIS LEUR DERNIÈRE ENTRÉE (PLUS DE " + c.getJours() + " JOURS)");
        parametres.put("P_TOTAUX", t[0] + " article(s), stock " + String.format("%,d", t[1]).replace(',', '.')
                + ", valeur immobilisée " + String.format("%,d", t[2]).replace(',', '.') + " (prix d'achat)");
        String url = reportUtil.buildReport(parametres, "articles_dormants", lignes);
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=articles_dormants.pdf").build();
    }
}
