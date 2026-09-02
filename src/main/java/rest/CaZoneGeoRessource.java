package rest;

import commonTasks.dto.CaZoneGeoPdfDTO;
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
    @EJB
    private rest.report.ReportUtil reportUtil;
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

    /** Nombre maximum de lignes tracees sur la courbe du PDF (les plus fortes), en plus du total. */
    private static final int COURBES_MAX = 8;

    /**
     * Edition PDF (A4 paysage) : tableau croise + courbe. Reponse {success, msg: url, url}, comme les autres editions ;
     * l'ecran ouvre l'URL dans un nouvel onglet.
     */
    @GET
    @Path("pdf")
    public Response pdf(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("zoneId") String zoneId,
            @QueryParam("familleId") String familleId, @QueryParam("regroupement") String regroupement) {
        TUser utilisateur = utilisateur();
        if (utilisateur == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        Filtres filtres = filtres(typePeriode, dtStart, dtEnd, zoneId, familleId, regroupement);
        JSONObject json = caZoneGeoService.chiffreAffaires(utilisateur, filtres);
        if (!json.optBoolean("success")) {
            return Response.ok().entity(ResultFactory.getFailResult(json.optString("msg"))).build();
        }
        JSONArray tranches = json.optJSONArray("tranches") == null ? new JSONArray() : json.getJSONArray("tranches");
        JSONArray data = json.optJSONArray("data") == null ? new JSONArray() : json.getJSONArray("data");

        java.util.Map<String, String> libelles = new java.util.HashMap<>();
        for (int i = 0; i < tranches.length(); i++) {
            JSONObject t = tranches.getJSONObject(i);
            libelles.put(t.getString("cle"), t.getString("libelle"));
        }
        // Tableau croise : toutes les cellules, y compris a zero, pour que chaque colonne existe.
        List<CaZoneGeoPdfDTO.Ligne> lignes = new ArrayList<>();
        for (int i = 0; i < data.length(); i++) {
            JSONObject o = data.getJSONObject(i);
            String cleLigne = String.format("%03d|%s", i + 1, o.optString("libelle"));
            for (int j = 0; j < tranches.length(); j++) {
                String cle = tranches.getJSONObject(j).getString("cle");
                lignes.add(new CaZoneGeoPdfDTO.Ligne(cleLigne, cle, o.optLong("t_" + cle)));
            }
        }
        // Courbe : les lignes les plus fortes puis le total, points dans l'ordre chronologique.
        List<CaZoneGeoPdfDTO.Point> courbe = new ArrayList<>();
        JSONObject totauxTranches = json.optJSONObject("totauxTranches");
        for (int j = 0; j < tranches.length(); j++) {
            JSONObject t = tranches.getJSONObject(j);
            for (int i = 0; i < Math.min(COURBES_MAX, data.length()); i++) {
                JSONObject o = data.getJSONObject(i);
                courbe.add(new CaZoneGeoPdfDTO.Point(o.optString("libelle"), t.getString("libelle"),
                        o.optLong("t_" + t.getString("cle"))));
            }
            courbe.add(new CaZoneGeoPdfDTO.Point("TOTAL", t.getString("libelle"),
                    totauxTranches == null ? 0 : totauxTranches.optLong(t.getString("cle"))));
        }

        boolean avecZone = filtres.getRegroupement() != Regroupement.FAMILLE;
        boolean avecFamille = filtres.getRegroupement() != Regroupement.ZONE;
        java.util.Map<String, Object> parametres = reportUtil.officineData(utilisateur);
        parametres.put("P_H_CLT_INFOS", "CHIFFRE D'AFFAIRES PAR " + (avecZone && avecFamille
                ? "ZONE GEOGRAPHIQUE ET FAMILLE D'ARTICLES" : avecZone ? "ZONE GEOGRAPHIQUE" : "FAMILLE D'ARTICLES"));
        parametres.put("P_PERIODE",
                "Période du " + formatFr(json.optString("debut")) + " au " + formatFr(json.optString("fin")) + " - "
                        + tranches.length() + " tranche" + (tranches.length() > 1 ? "s" : "") + " ("
                        + libelleGranularite(json.optString("granularite")) + ")" + filtresTexte(json, filtres));
        Object evolution = json.opt("evolutionGenerale");
        parametres.put("P_INDICATEURS",
                "CA total : " + String.format("%,d", json.optLong("totalGeneral")).replace(',', ' ')
                        + "   |   Évolution entre la première et la dernière tranche : " + (evolution instanceof Number
                                ? String.format("%+.1f %%", ((Number) evolution).doubleValue()) : "-")
                        + "   |   " + data.length() + " ligne" + (data.length() > 1 ? "s" : ""));
        parametres.put("P_LIBELLES", libelles);
        parametres.put("P_COURBE", courbe);
        parametres.put("P_TITRE_COURBE",
                "Courbe : " + Math.min(COURBES_MAX, data.length()) + " ligne(s) les plus fortes et le total");
        String url = reportUtil.buildReport(parametres, "ca_zone_geo", lignes);
        return Response.ok().entity(new JSONObject().put("success", true).put("msg", url).put("url", url).toString())
                .build();
    }

    private static String libelleGranularite(String granularite) {
        switch (granularite == null ? "" : granularite) {
        case "JOUR":
            return "par jour";
        case "SEMAINE":
            return "par semaine";
        case "MOIS":
            return "par mois";
        case "ANNEE":
            return "par année";
        default:
            return "";
        }
    }

    /** Rappel des filtres zone / famille, lus dans la premiere ligne de la reponse (libelles). */
    private static String filtresTexte(JSONObject json, Filtres filtres) {
        StringBuilder sb = new StringBuilder();
        JSONArray data = json.optJSONArray("data");
        JSONObject premiere = data != null && data.length() > 0 ? data.getJSONObject(0) : null;
        if (filtres.getZoneId() != null && !filtres.getZoneId().isBlank() && !"ALL".equals(filtres.getZoneId())) {
            sb.append(" - Zone : ").append(premiere == null ? filtres.getZoneId() : premiere.optString("zone"));
        }
        if (filtres.getFamilleId() != null && !filtres.getFamilleId().isBlank()
                && !"ALL".equals(filtres.getFamilleId())) {
            sb.append(" - Famille : ")
                    .append(premiere == null ? filtres.getFamilleId() : premiere.optString("famille"));
        }
        return sb.toString();
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
