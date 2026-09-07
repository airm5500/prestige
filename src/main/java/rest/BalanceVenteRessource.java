package rest;

import dal.TUser;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.BalanceService;
import rest.service.dto.BalanceParamsDTO;
import toolkits.parameters.commonparameter;
import static toolkits.parameters.enumExtentionFiles.LOG;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Path("v1/balance")
@Produces("application/json")
@Consumes("application/json")
public class BalanceVenteRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private BalanceService balanceService;
    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;

    @GET
    @Path("/balancesalecash")
    public Response balanceCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * L'analyse comparative de la balance vente / caisse sur plusieurs periodes.
     *
     * <p>
     * Chaque tranche est calculee par le MEME appel que l'onglet « Balance » : le service est simplement rappele une
     * fois par tranche, avec ses bornes. Recrire ici une requete agregeant toutes les periodes d'un coup serait plus
     * rapide, mais les deux onglets finiraient par repondre differemment sur la meme periode -- et rien ne le
     * signalerait.
     * </p>
     *
     * <p>
     * Une seule tranche ne fait pas une comparaison : l'ecran affiche alors les chiffres bruts. C'est a partir de deux
     * que les ecarts ont un sens.
     * </p>
     *
     * @param typePeriode
     *            TROIS_SEMAINES, TROIS_MOIS, SIX_MOIS, TROIS_ANS ou LIBRE
     */
    @GET
    @Path("/balancesalecash/analyse")
    public Response analyseBalance(@QueryParam(value = "typePeriode") String typePeriode,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        java.time.LocalDate debutLibre = dateOuNull(dtStart);
        java.time.LocalDate finLibre = dateOuNull(dtEnd);
        java.util.List<util.PeriodesCa.Tranche> tranches = util.PeriodesCa
                .tranches(util.PeriodesCa.Type.de(typePeriode), debutLibre, finLibre, java.time.LocalDate.now());
        String emplacement = tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

        JSONArray data = new JSONArray();
        Long precedentNet = null;
        for (util.PeriodesCa.Tranche tranche : tranches) {
            JSONObject balance = balanceService
                    .getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(tranche.getDebut().toString())
                            .dtEnd(tranche.getFin().toString()).emplacementId(emplacement).build());
            // « metaData » est la cle sous laquelle FunctionUtils.returnData range le resume. Se
            // tromper de cle ne leve aucune erreur : toutes les colonnes seraient simplement a
            // zero, ce qui passerait pour une periode sans activite.
            JSONObject resume = balance.optJSONObject("metaData");
            JSONObject ligne = new JSONObject().put("cle", tranche.getCle()).put("libelle", tranche.getLibelle())
                    .put("debut", tranche.getDebut().toString()).put("fin", tranche.getFin().toString())
                    // « enCours » dit que la tranche n'est pas terminee. Sans lui, le mois entame
                    // passerait pour un mois entier et l'officine lirait un effondrement le 2 du mois.
                    .put("enCours", tranche.isEnCours());
            for (String champ : CHAMPS_ANALYSE_BALANCE) {
                ligne.put(champ, resume != null ? resume.optLong(champ, 0L) : 0L);
            }
            long net = ligne.optLong("montantNet", 0L);
            // L'ecart se lit d'une tranche a la precedente : c'est ce que l'oeil cherche dans une
            // comparaison, et non l'ecart au premier mois de la serie.
            ligne.put("ecart", precedentNet == null ? JSONObject.NULL : net - precedentNet);
            ligne.put("ecartPourcentage", precedentNet == null || precedentNet == 0L ? JSONObject.NULL
                    : Math.round((net - precedentNet) * 10000D / precedentNet) / 100D);
            data.put(ligne);
            precedentNet = net;
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data)
                // Une seule tranche : l'ecran affiche les chiffres bruts, pas une comparaison.
                .put("comparatif", data.length() >= 2).toString()).build();
    }

    /** Les indicateurs repris dans la comparaison, dans l'ordre des colonnes de l'ecran. */
    private static final String[] CHAMPS_ANALYSE_BALANCE = { "nbreVente", "montantTTC", "montantRemise", "montantNet",
            "montantAchat", "marge", "panierMoyen", "montantEsp", "montantCB", "montantCheque", "montantVirement",
            "montantMobilePayment", "montantTp", "montantDiff" };

    /** Une date absente ou illisible vaut {@code null} : le type de periode decidera alors seul. */
    private static java.time.LocalDate dateOuNull(String valeur) {
        if (valeur == null || valeur.trim().isEmpty()) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(valeur.trim());
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }
    }

    @GET
    @Path("/balancesalecash/analyse/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporterAnalyseBalance(@QueryParam(value = "typePeriode") String typePeriode,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws java.io.IOException {
        Response reponse = analyseBalance(typePeriode, dtStart, dtEnd);
        JSONObject analyse = new JSONObject(String.valueOf(reponse.getEntity()));
        if (!analyse.optBoolean("success")) {
            return reponse;
        }
        JSONArray lignes = analyse.optJSONArray("data");
        java.util.List<JSONObject> donnees = new java.util.ArrayList<>();
        for (int i = 0; lignes != null && i < lignes.length(); i++) {
            donnees.add(lignes.getJSONObject(i));
        }
        String titre = "ANALYSE COMPARATIVE BALANCE VENTE / CAISSE - "
                + util.PeriodesCa.Type.de(typePeriode).name().replace('_', ' ').toLowerCase(java.util.Locale.ROOT);
        byte[] data = reportExcelExportService.createExcelReport(titre, ENTETES_EXCEL_ANALYSE, donnees, (row, o) -> {
            int col = 0;
            // La periode en cours est signalee DANS le libelle : un classeur se relit sans les
            // couleurs de l'ecran, et rien n'y dirait sinon que le dernier mois est incomplet.
            row.createCell(col++).setCellValue(o.optString("libelle") + (o.optBoolean("enCours") ? " (en cours)" : ""));
            row.createCell(col++).setCellValue(o.optString("debut"));
            row.createCell(col++).setCellValue(o.optString("fin"));
            for (String champ : CHAMPS_ANALYSE_BALANCE) {
                row.createCell(col++).setCellValue(o.optLong(champ, 0L));
            }
            row.createCell(col++).setCellValue(o.isNull("ecart") ? 0L : o.optLong("ecart"));
            row.createCell(col).setCellValue(o.isNull("ecartPourcentage") ? 0D : o.optDouble("ecartPourcentage"));
        });
        String nomFichier = "analyse_balance_" + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }

    /** En-tetes du classeur : la periode, ses bornes, les indicateurs, puis les ecarts. */
    private static final String[] ENTETES_EXCEL_ANALYSE = { "Période", "Début", "Fin", "Ventes", "Brut TTC", "Remise",
            "Net TTC", "Achat", "Marge", "Panier moyen", "Espèces", "Carte", "Chèque", "Virement", "Mobile",
            "Tiers payant", "Différé", "Écart net", "Écart %" };

    @GET
    @Path("/balancesalecash/carnet")
    public Response balanceCaisseCarnet(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).showAllAmount(true).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).build());
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/balancesalecash/carnet-depot")
    public Response balanceCaisseCarnetDepot(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {

        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }

        JSONObject json = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).showAllAmount(true).build());

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("etat-annuel")
    public Response etatLastThreeYears() {

        JSONObject json = balanceService.etatLastThreeYears();
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("/balancesalecashdepot")
    public Response balanceCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "emplacementId") String emplacementId) {

        if (emplacementId == null || emplacementId.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Le paramètre emplacementId est obligatoire")
                    .build();
        }

        BalanceParamsDTO params = BalanceParamsDTO.builder().dtStart(dtStart).dtEnd(dtEnd).emplacementId(emplacementId)
                .build();
        JSONObject json;

        if ("ALL".equalsIgnoreCase(emplacementId)) {
            // Appelle la nouvelle méthode pour le cumul
            json = balanceService.getBalanceForAllDepots(params);
        } else {
            // Comportement existant
            json = balanceService.getBalanceVenteCaisseDataView(params);
        }

        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("/print-balancesalecashdepot")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response printBalanceCaisse(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "emplacementId") String emplacementId) {

        try {
            BalanceParamsDTO params = BalanceParamsDTO.builder().dtStart(dtStart).dtEnd(dtEnd)
                    .emplacementId(emplacementId).build();
            byte[] data = balanceService.generateBalanceReport(params);

            String fileIdentifier = "ALL".equalsIgnoreCase(emplacementId) ? "toutdepot" : "depot";

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            String filename = String.format("balance_%s_%s.pdf", fileIdentifier, timestamp);

            return Response.ok(data, MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"").build();

        } catch (Exception e) {
            // LOG.log(java.util.logging.Level.SEVERE, "Erreur lors de la génération du PDF", e);
            return Response.serverError().entity("Erreur interne du serveur lors de la génération du rapport.").build();
        }
    }
}
