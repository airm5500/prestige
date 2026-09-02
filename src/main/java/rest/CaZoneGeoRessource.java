package rest;

import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CaZoneGeoService;
import rest.service.CaZoneGeoService.Filtres;
import rest.service.CaZoneGeoService.Regroupement;
import rest.service.utils.ReportExcelExportService;
import util.Constant;
import util.PeriodesCa;

/**
 * Chiffre d'affaires par zone geographique et famille d'articles, avec comparaison de periodes (point 3).
 *
 * <p>
 * Parametres communs : typePeriode (TROIS_SEMAINES, TROIS_MOIS, SIX_MOIS, TROIS_ANS, LIBRE), dtStart/dtEnd (periode
 * libre, AAAA-MM-JJ), zoneId, familleId (vides ou ALL = tous), regroupement (ZONE, FAMILLE, ZONE_FAMILLE).
 */
@Path("v1/ca-zone-geo")
@Produces("application/json")
@Consumes("application/json")
public class CaZoneGeoRessource {

    @EJB
    private CaZoneGeoService caZoneGeoService;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @Context
    private HttpServletRequest servletRequest;

    @GET
    public Response chiffreAffaires(@QueryParam("typePeriode") String typePeriode,
            @QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("zoneId") String zoneId, @QueryParam("familleId") String familleId,
            @QueryParam("regroupement") String regroupement) {
        TUser utilisateur = utilisateur();
        if (utilisateur == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = caZoneGeoService.chiffreAffaires(utilisateur,
                filtres(typePeriode, dtStart, dtEnd, zoneId, familleId, regroupement));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("zoneId") String zoneId,
            @QueryParam("familleId") String familleId, @QueryParam("regroupement") String regroupement)
            throws java.io.IOException {
        TUser utilisateur = utilisateur();
        if (utilisateur == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Filtres filtres = filtres(typePeriode, dtStart, dtEnd, zoneId, familleId, regroupement);
        JSONObject json = caZoneGeoService.chiffreAffaires(utilisateur, filtres);
        JSONArray tranches = json.optJSONArray("tranches") == null ? new JSONArray() : json.getJSONArray("tranches");
        JSONArray data = json.optJSONArray("data") == null ? new JSONArray() : json.getJSONArray("data");

        List<String> entetes = new ArrayList<>();
        boolean avecZone = filtres.getRegroupement() != Regroupement.FAMILLE;
        boolean avecFamille = filtres.getRegroupement() != Regroupement.ZONE;
        if (avecZone) {
            entetes.add("Zone géographique");
        }
        if (avecFamille) {
            entetes.add("Famille d'articles");
        }
        for (int i = 0; i < tranches.length(); i++) {
            entetes.add(tranches.getJSONObject(i).getString("libelle"));
        }
        entetes.add("Total");
        entetes.add("Évolution %");

        List<JSONObject> lignes = new ArrayList<>();
        for (int i = 0; i < data.length(); i++) {
            lignes.add(data.getJSONObject(i));
        }
        // Ligne des totaux par tranche en fin de tableau.
        JSONObject totauxLigne = new JSONObject().put("zone", "TOTAL").put("famille", "").put("total",
                json.optLong("totalGeneral"));
        JSONObject totauxTranches = json.optJSONObject("totauxTranches");
        for (int i = 0; i < tranches.length(); i++) {
            String cle = tranches.getJSONObject(i).getString("cle");
            totauxLigne.put("t_" + cle, totauxTranches == null ? 0 : totauxTranches.optLong(cle));
        }
        totauxLigne.put("evolution", json.opt("evolutionGenerale"));
        lignes.add(totauxLigne);

        String titre = "CHIFFRE D'AFFAIRES PAR "
                + (avecZone && avecFamille ? "ZONE GEOGRAPHIQUE ET FAMILLE"
                        : avecZone ? "ZONE GEOGRAPHIQUE" : "FAMILLE D'ARTICLES")
                + " - DU " + formatFr(json.optString("debut")) + " AU " + formatFr(json.optString("fin"));
        byte[] fichier = reportExcelExportService.createLandscapeExcelReport(titre, entetes.toArray(new String[0]),
                lignes, (row, o) -> {
                    int col = 0;
                    if (avecZone) {
                        row.createCell(col++).setCellValue(o.optString("zone"));
                    }
                    if (avecFamille) {
                        row.createCell(col++).setCellValue(o.optString("famille"));
                    }
                    for (int i = 0; i < tranches.length(); i++) {
                        row.createCell(col++)
                                .setCellValue(o.optLong("t_" + tranches.getJSONObject(i).getString("cle")));
                    }
                    row.createCell(col++).setCellValue(o.optLong("total"));
                    Object evolution = o.opt("evolution");
                    if (evolution instanceof Number) {
                        row.createCell(col).setCellValue(((Number) evolution).doubleValue());
                    } else {
                        row.createCell(col).setCellValue("");
                    }
                });
        return Response.ok(fichier, "application/vnd.ms-excel").encoding("UTF-8")
                .header("Content-Disposition", "attachment; filename=ca-zone-geographique.xls").build();
    }

    private Filtres filtres(String typePeriode, String dtStart, String dtEnd, String zoneId, String familleId,
            String regroupement) {
        return new Filtres().typePeriode(PeriodesCa.Type.de(typePeriode)).debut(date(dtStart)).fin(date(dtEnd))
                .zoneId(zoneId).familleId(familleId).regroupement(Regroupement.de(regroupement));
    }

    private static LocalDate date(String valeur) {
        try {
            return valeur == null || valeur.trim().isEmpty() ? null : LocalDate.parse(valeur.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static String formatFr(String iso) {
        try {
            LocalDate d = LocalDate.parse(iso);
            return String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
        } catch (Exception e) {
            return iso == null ? "" : iso;
        }
    }

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }
}
