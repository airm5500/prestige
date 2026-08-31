package rest;

import dal.TUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.InventaireService;
import rest.service.VenteSuppressionService;
import rest.service.dto.VenteSuppressionDTO;
import util.Constant;

/**
 * Ecran "Suppressions de vente" : produits retires d'une vente et ventes abandonnees.
 */
@Path("v1/vente-suppressions")
@Produces("application/json")
@Consumes("application/json")
public class VenteSuppressionRessource {

    /**
     * Nom du PDF remis a l'utilisateur. Il dit ce que l'edition contient - les articles retires d'une vente et les
     * ventes abandonnees - la ou « rp_suppressions_vente » reprenait le nom technique du modele.
     */
    private static final String NOM_FICHIER_EDITION = "rp_articles_supprimes_vente_abandonnees";

    @EJB
    private VenteSuppressionService venteSuppressionService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;
    @Inject
    private HttpServletRequest servletRequest;

    @GET
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "userId") String userId, @QueryParam(value = "query") String query,
            @QueryParam(value = "type") String type) {
        JSONObject json = venteSuppressionService.list(dtStart, dtEnd, userId, query, type, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("create-inventaire")
    public Response createInventaire(String body) throws JSONException {
        JSONObject payload = new JSONObject(body);
        JSONArray ids = payload.optJSONArray("ids");
        Set<String> produitIds = new LinkedHashSet<>();
        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                String id = ids.optString(i);
                if (StringUtils.isNotEmpty(id)) {
                    produitIds.add(id);
                }
            }
        }
        if (produitIds.isEmpty()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", "Aucun produit selectionne").toString())
                    .build();
        }
        String description = payload.optString("description", "");
        String name = "INVENTAIRE SUPPRESSIONS DE VENTE "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(produitIds, name,
                StringUtils.isNotEmpty(description) ? description : name);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    /**
     * Export Excel de la liste : memes filtres et memes lignes que la grille (toutes les pages, via fetchAll).
     */
    @GET
    @Path("export/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "userId") String userId,
            @QueryParam(value = "query") String query, @QueryParam(value = "type") String type) throws Exception {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        java.util.List<VenteSuppressionDTO> data = venteSuppressionService.fetchAll(dtStart, dtEnd, userId, query,
                type);
        String[] entetes = { "Date", "Heure", "Vente", "CIP", "Produit", "Qte", "Utilisateur", "Type" };
        byte[] bytes = reportExcelExportService.createExcelReport("Suppressions de vente", entetes, data, (row, o) -> {
            int col = 0;
            row.createCell(col++).setCellValue(StringUtils.defaultString(o.getDate()));
            row.createCell(col++).setCellValue(StringUtils.defaultString(o.getHeure()));
            row.createCell(col++).setCellValue(StringUtils.defaultString(o.getVenteRef()));
            row.createCell(col++).setCellValue(StringUtils.defaultString(o.getProduitCip()));
            row.createCell(col++).setCellValue(StringUtils.defaultString(o.getProduitLibelle()));
            row.createCell(col++).setCellValue(o.getQuantite() == null ? 0 : o.getQuantite());
            row.createCell(col++).setCellValue(StringUtils.defaultString(o.getUserName()));
            row.createCell(col)
                    .setCellValue("VENTE".equals(o.getTypeSuppression()) ? "Vente abandonnee" : "Produit retire");
        });
        return Response.ok(bytes).header("Content-Disposition", "attachment; filename=\"suppressions_vente.xls\"")
                .build();
    }

    // Edition PDF (JasperReports) de la liste : rp_suppressions_vente.jrxml
    @GET
    @Path("pdf")
    public Response pdf(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "userId") String userId, @QueryParam(value = "query") String query,
            @QueryParam(value = "type") String type, @QueryParam(value = "userLibelle") String userLibelle)
            throws JSONException {
        TUser tu = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        Map<String, Object> params = reportUtil.officineData(tu);
        StringBuilder titre = new StringBuilder("SUPPRESSIONS DE VENTE");
        if (StringUtils.isNotEmpty(dtStart) && StringUtils.isNotEmpty(dtEnd)) {
            titre.append(" - PERIODE DU ").append(formatDate(dtStart)).append(" AU ").append(formatDate(dtEnd));
        }
        if (StringUtils.isNotEmpty(userLibelle)) {
            titre.append(" - UTILISATEUR : ").append(userLibelle);
        }
        if (StringUtils.isNotEmpty(query)) {
            titre.append(" - RECHERCHE : ").append(query);
        }
        params.put("P_H_CLT_INFOS", titre.toString());
        java.util.List<VenteSuppressionDTO> data = venteSuppressionService.fetchAll(dtStart, dtEnd, userId, query,
                type);
        if (data.isEmpty()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", "Aucune donnee a imprimer").toString())
                    .build();
        }
        // Le modele .jrxml garde son nom (fichier installe sur site) ; seul le document remis a
        // l'utilisateur est renomme, pour dire ce qu'il contient reellement.
        String url = servletRequest.getContextPath()
                + reportUtil.buildReport(params, "rp_suppressions_vente", data, NOM_FICHIER_EDITION);
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).toString()).build();
    }

    private String formatDate(String d) {
        try {
            return LocalDate.parse(d).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (Exception e) {
            return d;
        }
    }
}
