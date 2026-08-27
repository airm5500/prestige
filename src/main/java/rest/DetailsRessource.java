package rest;

import commonTasks.dto.DeconditionnementHistoDTO;
import commonTasks.dto.ProduitDetailleDTO;
import dal.TUser;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.DetailsProduitService;
import rest.service.InventaireService;
import rest.service.utils.ReportExcelExportService;
import util.Constant;

/**
 * Menu Détails : liste des produits détaillés et historique des déconditionnements. Ecran, editions PDF fideles aux
 * apercus de reference, exports Excel, et creation d'inventaire depuis la liste filtree.
 */
@Path("v1/details")
@Produces("application/json")
@Consumes("application/json")
public class DetailsRessource {

    private static final String[] ENTETES_LISTE = { "Identifiant PP", "Produit Principal", "Stock PP", "Identifiant PD",
            "Produit Détail", "Contenance", "Stock Détail" };
    private static final String[] ENTETES_HISTORIQUE = { "Date", "Code CH", "Nom CH", "Qté Det", "Code Det", "Nom Det",
            "Stock avant", "Stock après", "Utilisateur" };

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private DetailsProduitService detailsProduitService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private ReportExcelExportService reportExcelExportService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    @GET
    @Path("produits")
    public Response produits(@QueryParam("rechPP") String rechPP, @QueryParam("rechPD") String rechPD,
            @DefaultValue("0") @QueryParam("contenance") int contenance,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<ProduitDetailleDTO> lignes = detailsProduitService.produitsDetailles(rechPP, rechPD, contenance);
        JSONArray data = new JSONArray();
        int fin = limit > 0 ? Math.min(lignes.size(), start + limit) : lignes.size();
        for (int i = Math.min(start, lignes.size()); i < fin; i++) {
            ProduitDetailleDTO l = lignes.get(i);
            data.put(new JSONObject().put("cipPP", l.getCipPP()).put("nomPP", l.getNomPP())
                    .put("stockPP", l.getStockPP()).put("cipPD", l.getCipPD()).put("nomPD", l.getNomPD())
                    .put("contenance", l.getContenance()).put("stockPD", l.getStockPD()));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", lignes.size()).put("data", data).toString())
                .build();
    }

    @GET
    @Path("historique")
    public Response historique(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<DeconditionnementHistoDTO> lignes = detailsProduitService.historique(dtStart, dtEnd);
        JSONArray data = new JSONArray();
        int fin = limit > 0 ? Math.min(lignes.size(), start + limit) : lignes.size();
        for (int i = Math.min(start, lignes.size()); i < fin; i++) {
            DeconditionnementHistoDTO l = lignes.get(i);
            data.put(new JSONObject().put("date", l.getDate()).put("codeCh", l.getCodeCh()).put("nomCh", l.getNomCh())
                    .put("qteDet", l.getQteDet()).put("codeDet", l.getCodeDet()).put("nomDet", l.getNomDet())
                    .put("stockAvant", l.getStockAvant()).put("stockApres", l.getStockApres())
                    .put("utilisateur", l.getUtilisateur()));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", lignes.size()).put("data", data).toString())
                .build();
    }

    /** Edition PDF de la liste filtree, au format de l'apercu de reference. */
    @GET
    @Path("produits/print")
    public Response imprimerProduits(@QueryParam("rechPP") String rechPP, @QueryParam("rechPD") String rechPD,
            @DefaultValue("0") @QueryParam("contenance") int contenance) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        List<ProduitDetailleDTO> lignes = detailsProduitService.produitsDetailles(rechPP, rechPD, contenance);
        Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "LISTE DES PRODUITS DETAILLES");
        parametres.put("P_PERIODE", sousTitreListe(rechPP, rechPD, contenance, lignes.size()));
        String url = reportUtil.buildReport(parametres, "liste_produits_detailles", lignes);
        return reponseEdition(url);
    }

    /** Edition PDF de l'historique, au format de l'apercu de reference. */
    @GET
    @Path("historique/print")
    public Response imprimerHistorique(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        List<DeconditionnementHistoDTO> lignes = detailsProduitService.historique(dtStart, dtEnd);
        Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "HISTORIQUE DES DECONDITIONNEMENTS");
        parametres.put("P_PERIODE", sousTitreHistorique(dtStart, dtEnd, lignes.size()));
        String url = reportUtil.buildReport(parametres, "historique_deconditionnements", lignes);
        return reponseEdition(url);
    }

    @GET
    @Path("produits/excel")
    @Produces("application/vnd.ms-excel")
    public Response excelProduits(@QueryParam("rechPP") String rechPP, @QueryParam("rechPD") String rechPD,
            @DefaultValue("0") @QueryParam("contenance") int contenance) throws java.io.IOException {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<ProduitDetailleDTO> lignes = detailsProduitService.produitsDetailles(rechPP, rechPD, contenance);
        byte[] data = reportExcelExportService.createExcelReport("LISTE DES PRODUITS DETAILLES", ENTETES_LISTE, lignes,
                (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getCipPP());
                    row.createCell(col++).setCellValue(dto.getNomPP());
                    row.createCell(col++).setCellValue(dto.getStockPP());
                    row.createCell(col++).setCellValue(dto.getCipPD());
                    row.createCell(col++).setCellValue(dto.getNomPD());
                    row.createCell(col++).setCellValue(dto.getContenance());
                    row.createCell(col++).setCellValue(dto.getStockPD());
                });
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("Content-Disposition", "attachment; filename=liste-produits-detailles.xls").build();
    }

    @GET
    @Path("historique/excel")
    @Produces("application/vnd.ms-excel")
    public Response excelHistorique(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd)
            throws java.io.IOException {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<DeconditionnementHistoDTO> lignes = detailsProduitService.historique(dtStart, dtEnd);
        byte[] data = reportExcelExportService.createExcelReport("HISTORIQUE DES DECONDITIONNEMENTS",
                ENTETES_HISTORIQUE, lignes, (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getDate());
                    row.createCell(col++).setCellValue(dto.getCodeCh());
                    row.createCell(col++).setCellValue(dto.getNomCh());
                    row.createCell(col++).setCellValue(dto.getQteDet());
                    row.createCell(col++).setCellValue(dto.getCodeDet());
                    row.createCell(col++).setCellValue(dto.getNomDet());
                    row.createCell(col++).setCellValue(dto.getStockAvant());
                    row.createCell(col++).setCellValue(dto.getStockApres());
                    row.createCell(col++).setCellValue(dto.getUtilisateur());
                });
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("Content-Disposition", "attachment; filename=historique-deconditionnements.xls").build();
    }

    /**
     * Cree un inventaire avec les produits de la liste filtree : les principaux ET leurs details - leurs stocks bougent
     * ensemble, en inventorier un seul n'aurait pas de sens.
     */
    @POST
    @Path("produits/inventaire")
    public Response inventaire(String body) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = new JSONObject(StringUtils.defaultIfBlank(body, "{}"));
        List<ProduitDetailleDTO> lignes = detailsProduitService.produitsDetailles(in.optString("rechPP"),
                in.optString("rechPD"), in.optInt("contenance", 0));
        Set<String> ids = new LinkedHashSet<>();
        for (ProduitDetailleDTO l : lignes) {
            if (StringUtils.isNotBlank(l.getFamilleIdPP())) {
                ids.add(l.getFamilleIdPP());
            }
            if (StringUtils.isNotBlank(l.getFamilleIdPD())) {
                ids.add(l.getFamilleIdPD());
            }
        }
        if (ids.isEmpty()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("msg", "Aucun produit à inventorier.").toString())
                    .build();
        }
        String nom = in.optString("name", "INVENTAIRE PRODUITS DETAILLES");
        int count = inventaireService.create(ids, nom);
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("count", count).put("name", nom).toString()).build();
    }

    private Response reponseEdition(String url) {
        if (StringUtils.isBlank(url)
                || !new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))).isFile()) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false)
                            .put("msg", "Le PDF n'a pas pu être généré. Vérifiez le journal du serveur.").toString())
                    .build();
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("msg", url).toString()).build();
    }

    private static String sousTitreListe(String rechPP, String rechPD, int contenance, int nb) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.isNotBlank(rechPP)) {
            sb.append("produit principal « ").append(rechPP.trim()).append(" »");
        }
        if (StringUtils.isNotBlank(rechPD)) {
            sb.append(sb.length() > 0 ? " — " : "").append("produit détail « ").append(rechPD.trim()).append(" »");
        }
        if (contenance > 0) {
            sb.append(sb.length() > 0 ? " — " : "").append("contenance ").append(contenance);
        }
        sb.append(sb.length() > 0 ? " — " : "").append(nb).append(" ligne(s)");
        return sb.toString();
    }

    private static String sousTitreHistorique(String dtStart, String dtEnd, int nb) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.isNotBlank(dtStart) || StringUtils.isNotBlank(dtEnd)) {
            sb.append("période ").append(StringUtils.defaultIfBlank(dtStart, "…")).append(" au ")
                    .append(StringUtils.defaultIfBlank(dtEnd, "…"));
        }
        sb.append(sb.length() > 0 ? " — " : "").append(nb).append(" mouvement(s)");
        return sb.toString();
    }
}
