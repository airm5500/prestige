package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
import rest.service.impl.RisqueRuptureService;
import rest.service.impl.RisqueRuptureService.Ligne;
import rest.service.utils.ReportExcelExportService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/** Retours du 09/10 (3) : onglet « Risque de rupture » de Commandes en cours (droit P_CEC_RISQUE_RUPTURE). */
@Path("v1/risque-rupture")
@Produces("application/json")
public class RisqueRuptureRessource {

    static final String P_CEC_RISQUE_RUPTURE = "P_CEC_RISQUE_RUPTURE";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private RisqueRuptureService service;

    @EJB
    private ReportExcelExportService excel;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), P_CEC_RISQUE_RUPTURE);
    }

    private static Response echec(String msg) {
        return Response.ok(new JSONObject().put("success", false).put("msg", msg).toString()).build();
    }

    @GET
    public Response liste(@QueryParam("statuts") String statuts, @QueryParam("query") String query,
            @QueryParam("grossiste") String grossiste, @QueryParam("rayon") String rayon,
            @QueryParam("ruptureFournisseur") boolean ruptureFournisseur,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("50") @QueryParam("limit") int limit) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return Response.ok(new JSONObject().put("success", false).put("interdit", true)
                    .put("msg", "Vous n'avez pas le droit d'accéder à cet onglet.").toString()).build();
        }
        return Response.ok(service.page(u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), statuts, query, grossiste, rayon,
                ruptureFournisseur, start, limit).toString()).build();
    }

    private static final String[] ENTETES = { "Statut", "CIP", "Désignation", "Grossiste", "Rayon", "Ventes/jour",
            "Stock", "En commande", "Couverture (j)", "Délai (j)", "Délai + sécurité (j)", "Seuil (unités)",
            "Épuisement prévu", "À commander", "Rupture fournisseur" };

    @GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("statuts") String statuts, @QueryParam("query") String query,
            @QueryParam("grossiste") String grossiste, @QueryParam("rayon") String rayon,
            @QueryParam("ruptureFournisseur") boolean ruptureFournisseur) throws java.io.IOException {
        TUser u = utilisateur();
        if (u == null || !autorise()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        List<Ligne> lignes = service.filtrer(
                service.lignes(u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), service.reglages()),
                RisqueRuptureService.statuts(statuts), query, grossiste, rayon, ruptureFournisseur);
        byte[] data = excel.createExcelReport("Risque de rupture", ENTETES, lignes, (row, l) -> {
            int i = 0;
            row.createCell(i++).setCellValue(l.calcul.statut.name().replace('_', ' '));
            row.createCell(i++).setCellValue(l.cip);
            row.createCell(i++).setCellValue(l.designation);
            row.createCell(i++).setCellValue(l.grossiste == null ? "" : l.grossiste);
            row.createCell(i++).setCellValue(l.rayon == null ? "" : l.rayon);
            row.createCell(i++).setCellValue(Math.round(l.parJour * 100) / 100.0);
            row.createCell(i++).setCellValue(l.stock);
            row.createCell(i++).setCellValue(l.enCours);
            if (l.calcul.couverture == null) {
                row.createCell(i++).setCellValue("");
            } else {
                row.createCell(i++).setCellValue(l.calcul.couverture);
            }
            row.createCell(i++).setCellValue(l.calcul.delai);
            row.createCell(i++).setCellValue(l.calcul.horizon);
            row.createCell(i++).setCellValue(l.calcul.seuil);
            row.createCell(i++).setCellValue(l.calcul.epuisement == null ? ""
                    : l.calcul.epuisement.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            row.createCell(i++).setCellValue(l.calcul.aCommander);
            row.createCell(i).setCellValue(l.ruptureFournisseur == null ? "" : l.ruptureFournisseur);
        });
        return Response.ok(data, "application/vnd.ms-excel")
                .header("content-disposition",
                        "attachment; filename=risque-rupture_"
                                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm")) + ".xls")
                .build();
    }
}
