package rest;

import commonTasks.dto.ProduitCodeGeoDTO;
import dal.TUser;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.report.excel.ClasseurExcel;
import rest.service.ProduitsCodeGeoService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * PRODUITS PAR CODE GEO (plan d'octobre, section 6) : liste, export Excel, impression PDF (onglet). Lecture seule.
 */
@Path("v1/produits-code-geo")
@Produces(MediaType.APPLICATION_JSON)
public class ProduitsCodeGeoRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private ProduitsCodeGeoService service;

    @EJB
    private ReportUtil reportUtil;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static ProduitsCodeGeoService.Filtre filtre(TUser u, String zoneId, String codeGeo, String codeGeoReserve,
            String sansCode, String query, boolean enStock) {
        ProduitsCodeGeoService.Filtre f = new ProduitsCodeGeoService.Filtre();
        f.emplacementId = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        f.zoneId = zoneId;
        f.codeGeo = codeGeo;
        f.codeGeoReserve = codeGeoReserve;
        f.sansCode = StringUtils.defaultString(sansCode);
        f.recherche = query;
        f.enStock = enStock;
        return f;
    }

    private static String libelleFiltre(ProduitsCodeGeoService.Filtre f) {
        StringBuilder b = new StringBuilder();
        if (StringUtils.isNotBlank(f.codeGeo)) {
            b.append("code géo rayon ").append(f.codeGeo).append("… ");
        }
        if (StringUtils.isNotBlank(f.codeGeoReserve)) {
            b.append("code géo réserve ").append(f.codeGeoReserve).append("… ");
        }
        if ("RAYON".equals(f.sansCode)) {
            b.append("sans code géo rayon ");
        } else if ("RESERVE".equals(f.sansCode)) {
            b.append("sans code géo réserve ");
        }
        if (f.enStock) {
            b.append("en stock ");
        }
        if (StringUtils.isNotBlank(f.recherche)) {
            b.append("« ").append(f.recherche).append(" » ");
        }
        return b.length() == 0 ? "Tous les produits" : b.toString().trim();
    }

    @GET
    public Response lister(@QueryParam("zoneId") String zoneId, @QueryParam("codeGeo") String codeGeo,
            @QueryParam("codeGeoReserve") String codeGeoReserve, @QueryParam("sansCode") String sansCode,
            @QueryParam("query") String query, @DefaultValue("false") @QueryParam("enStock") boolean enStock,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("25") @QueryParam("limit") int limit) {
        TUser u = utilisateur();
        if (u == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        ProduitsCodeGeoService.Filtre f = filtre(u, zoneId, codeGeo, codeGeoReserve, sansCode, query, enStock);
        JSONArray data = new JSONArray();
        for (ProduitCodeGeoDTO d : service.lister(f, start, Math.max(1, Math.min(limit, 500)))) {
            data.put(new JSONObject().put("id", d.getId()).put("cip", d.getCip()).put("libelle", d.getLibelle())
                    .put("emplacement", d.getEmplacement()).put("codeGeo", d.getCodeGeo())
                    .put("codeGeoReserve", d.getCodeGeoReserve()).put("stockRayon", d.getStockRayon())
                    .put("stockReserve", d.getStockReserve())
                    .put("colisage", d.getColisage() == null ? JSONObject.NULL : d.getColisage()));
        }
        return Response
                .ok(new JSONObject().put("success", true).put("total", service.compter(f)).put("data", data).toString())
                .build();
    }

    @GET
    @Path("excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response excel(@QueryParam("zoneId") String zoneId, @QueryParam("codeGeo") String codeGeo,
            @QueryParam("codeGeoReserve") String codeGeoReserve, @QueryParam("sansCode") String sansCode,
            @QueryParam("query") String query, @DefaultValue("false") @QueryParam("enStock") boolean enStock)
            throws IOException {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        ProduitsCodeGeoService.Filtre f = filtre(u, zoneId, codeGeo, codeGeoReserve, sansCode, query, enStock);
        byte[] data = new ClasseurExcel<ProduitCodeGeoDTO>("Produits par code géo").titre("PRODUITS PAR CODE GÉO")
                .critere("Filtre", libelleFiltre(f)).texte("Code géo rayon", ProduitCodeGeoDTO::getCodeGeo)
                .texte("Code géo réserve", ProduitCodeGeoDTO::getCodeGeoReserve)
                .texte("Emplacement", ProduitCodeGeoDTO::getEmplacement).texte("CIP", ProduitCodeGeoDTO::getCip)
                .texte("Produit", ProduitCodeGeoDTO::getLibelle).nombre("Stock rayon", ProduitCodeGeoDTO::getStockRayon)
                .nombre("Stock réserve", ProduitCodeGeoDTO::getStockReserve)
                .nombre("Colisage", ProduitCodeGeoDTO::getColisage).construire(service.lister(f, 0, 0));
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition",
                        "attachment; filename=produits_code_geo_"
                                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".xlsx")
                .build();
    }

    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("zoneId") String zoneId, @QueryParam("codeGeo") String codeGeo,
            @QueryParam("codeGeoReserve") String codeGeoReserve, @QueryParam("sansCode") String sansCode,
            @QueryParam("query") String query, @DefaultValue("false") @QueryParam("enStock") boolean enStock) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        ProduitsCodeGeoService.Filtre f = filtre(u, zoneId, codeGeo, codeGeoReserve, sansCode, query, enStock);
        List<ProduitCodeGeoDTO> lignes = service.lister(f, 0, 0);
        Map<String, Object> parametres = reportUtil.officineData(u);
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS", "PRODUITS PAR CODE GÉO — " + libelleFiltre(f) + " (" + lignes.size() + ")");
        String url = reportUtil.buildReport(parametres, "produits_code_geo", lignes);
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=produits_code_geo.pdf").build();
    }
}
