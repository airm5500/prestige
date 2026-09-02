package rest;

import dal.TUser;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
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
import org.apache.poi.ss.usermodel.Row;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.VenteModifieeService;
import rest.service.dto.VenteModifieeDTO;
import rest.service.utils.ReportExcelExportService;
import util.Constant;

/**
 * Ecran « Ventes modifiées » (point 6) : mouchard des ventes modifiees avec le detail produit, export Excel et creation
 * d'inventaire sur les produits des ventes concernees.
 */
@Path("v1/ventes-modifiees")
@Produces("application/json")
@Consumes("application/json")
public class VenteModifieeRessource {

    @EJB
    private VenteModifieeService venteModifieeService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @Inject
    private HttpServletRequest servletRequest;

    @GET
    public Response list(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "userId") String userId, @QueryParam(value = "query") String query,
            @QueryParam(value = "type") String type) {
        JSONObject json = venteModifieeService.list(dtStart, dtEnd, userId, query, type, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    /** Inventaire des produits des ventes concernees par les modifications selectionnees. */
    @POST
    @Path("create-inventaire")
    public Response createInventaire(String body) throws JSONException {
        JSONObject payload = new JSONObject(body);
        JSONArray ids = payload.optJSONArray("ids");
        List<String> modificationIds = new ArrayList<>();
        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                String id = ids.optString(i);
                if (StringUtils.isNotEmpty(id)) {
                    modificationIds.add(id);
                }
            }
        }
        Set<String> produitIds = venteModifieeService.produitIds(modificationIds);
        if (produitIds.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Aucun produit trouvé sur les ventes sélectionnées").toString()).build();
        }
        String description = payload.optString("description", "");
        String name = "INVENTAIRE VENTES MODIFIEES "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(produitIds, name,
                StringUtils.isNotEmpty(description) ? description : name);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    /**
     * Export Excel : une ligne par produit modifie (l'entete de la modification est repetee), une ligne seule pour les
     * modifications sans detail produit (informations client, date).
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
        List<VenteModifieeDTO> data = venteModifieeService.fetchAll(dtStart, dtEnd, userId, query, type);
        List<Object[]> lignes = new ArrayList<>();
        for (VenteModifieeDTO m : data) {
            if (m.getLignes().isEmpty()) {
                lignes.add(new Object[] { m, null });
            } else {
                for (VenteModifieeDTO.Ligne l : m.getLignes()) {
                    lignes.add(new Object[] { m, l });
                }
            }
        }
        String[] entetes = { "Date", "Heure", "Action", "Référence vente", "Opérateur", "Montant avant",
                "Montant après", "CIP", "Produit", "Changement", "Qté avant", "Qté après", "PU avant", "PU après",
                "Montant ligne avant", "Montant ligne après", "Détail" };
        byte[] bytes = reportExcelExportService.createLandscapeExcelReport("Ventes modifiées", entetes, lignes,
                (Row row, Object[] o) -> {
                    VenteModifieeDTO m = (VenteModifieeDTO) o[0];
                    VenteModifieeDTO.Ligne l = (VenteModifieeDTO.Ligne) o[1];
                    int col = 0;
                    row.createCell(col++).setCellValue(StringUtils.defaultString(m.getDate()));
                    row.createCell(col++).setCellValue(StringUtils.defaultString(m.getHeure()));
                    row.createCell(col++).setCellValue(StringUtils.defaultString(m.getTypeLibelle()));
                    row.createCell(col++).setCellValue(StringUtils.defaultString(m.getVenteRef()));
                    row.createCell(col++).setCellValue(StringUtils.defaultString(m.getUserName()));
                    row.createCell(col++).setCellValue(valeur(m.getMontantAvant()));
                    row.createCell(col++).setCellValue(valeur(m.getMontantApres()));
                    if (l != null) {
                        row.createCell(col++).setCellValue(StringUtils.defaultString(l.getProduitCip()));
                        row.createCell(col++).setCellValue(StringUtils.defaultString(l.getProduitLibelle()));
                        row.createCell(col++).setCellValue(libelleAction(l.getAction()));
                        row.createCell(col++).setCellValue(valeur(l.getQteAvant()));
                        row.createCell(col++).setCellValue(valeur(l.getQteApres()));
                        row.createCell(col++).setCellValue(valeur(l.getPuAvant()));
                        row.createCell(col++).setCellValue(valeur(l.getPuApres()));
                        row.createCell(col++).setCellValue(valeur(l.getMontantAvant()));
                        row.createCell(col++).setCellValue(valeur(l.getMontantApres()));
                    } else {
                        col += 9;
                    }
                    row.createCell(col).setCellValue(StringUtils.defaultString(m.getDescription()));
                });
        return Response.ok(bytes).header("Content-Disposition", "attachment; filename=\"ventes_modifiees.xls\"")
                .build();
    }

    private static int valeur(Integer i) {
        return i == null ? 0 : i;
    }

    public static String libelleAction(String action) {
        switch (StringUtils.defaultString(action)) {
        case "AJOUT":
            return "Produit ajouté";
        case "RETRAIT":
            return "Produit retiré";
        case "QUANTITE":
            return "Quantité modifiée";
        case "PRIX":
            return "Prix modifié";
        default:
            return action;
        }
    }
}
