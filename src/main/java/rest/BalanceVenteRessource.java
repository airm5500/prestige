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
    @EJB
    private rest.report.ReportUtil reportUtil;

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
                .dtEnd(dtEnd).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).avecTva(true).build());
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Les privileges de l'ecran (retour des tests du 09/09) : l'ancienne presentation complete est conservee dans un
     * onglet cache, visible seulement avec P_BALANCE_ANCIENNE_PRESENTATION, pour depanner en cas de doute.
     */
    @GET
    @Path("/balancesalecash/privileges")
    public Response privileges() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        dal.dataManager odm = new dal.dataManager();
        odm.initEntityManager();
        try {
            // Verification par requete SQL (comme le privilege du stock d'inventaire) : la lecture par les
            // collections de l'utilisateur de session, detache, ne voit pas ses roles.
            boolean ancienne = new bll.userManagement.privilege(odm, tu)
                    .isColonneStockMachineIsAuthorize(P_BALANCE_ANCIENNE);
            return Response.ok()
                    .entity(new JSONObject().put("success", true).put("anciennePresentation", ancienne).toString())
                    .build();
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(BalanceVenteRessource.class.getName())
                    .log(java.util.logging.Level.WARNING, "privileges balance", e);
            return Response.ok()
                    .entity(new JSONObject().put("success", true).put("anciennePresentation", false).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    private static final String P_BALANCE_ANCIENNE = "P_BALANCE_ANCIENNE_PRESENTATION";

    /**
     * L'edition de la balance dans sa nouvelle presentation (retour des tests du 09/09) : les memes blocs que l'ecran,
     * sur son propre modele balance_vente_caisse.jrxml, en flux dans l'onglet ouvert par le clic.
     */
    @GET
    @Path("/balancesalecash/pdf")
    @Produces("application/pdf")
    public Response imprimerBalance(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        JSONObject vue = balanceService.getBalanceVenteCaisseDataView(BalanceParamsDTO.builder().dtStart(dtStart)
                .dtEnd(dtEnd).emplacementId(tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).avecTva(true).build());
        java.util.Map<String, Object> parametres = reportUtil.officineData(tu);
        parametres.put("P_PERIODE", "Du " + dateLisible(dtStart) + " au " + dateLisible(dtEnd));
        parametres.put("P_ENTETES", rest.service.impl.EditionBalance.entetes());
        String url = reportUtil.buildReport(parametres, "balance_vente_caisse",
                rest.service.impl.EditionBalance.lignes(vue));
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head>"
                            + "<body style=\"font-family:Arial,sans-serif;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=balance_vente_caisse_"
                        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".pdf")
                .build();
    }

    private static String dateLisible(String iso) {
        try {
            return java.time.LocalDate.parse(iso.trim())
                    .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (RuntimeException e) {
            return iso == null ? "" : iso;
        }
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
        // Retour du 09/09 : les modes de reglement rencontres sur l'ensemble des periodes, pour l'onglet
        // « evolution par mode de paiement » (periodes en ligne, modes en colonne). Aucun mode n'est
        // ecrit d'avance : un operateur mobile cree par l'officine y figure de lui-meme.
        java.util.Map<String, JSONObject> modesRencontres = new java.util.LinkedHashMap<>();
        long depart = System.currentTimeMillis();
        util.PeriodesCa.Type type = util.PeriodesCa.Type.de(typePeriode);
        boolean avecJours = !tranches.isEmpty()
                && (type == util.PeriodesCa.Type.TROIS_ANS || type == util.PeriodesCa.Type.TROIS_SEMAINES);
        // Retours des tests 3 : toutes les tranches et les series du graphique sont lancees EN MEME TEMPS
        // (chacune sur son propre fil et sa propre connexion), puis relues dans l'ordre. Les calculs sont
        // strictement ceux d'avant : seul l'enchainement change (1,65 min -> le temps du plus long).
        java.util.List<java.util.concurrent.Future<JSONObject>> attentes = new java.util.ArrayList<>();
        for (util.PeriodesCa.Tranche tranche : tranches) {
            attentes.add(
                    lancer(() -> balanceService.getBalanceVenteCaisseDataViewAsync(parametres(tranche, emplacement))));
        }
        BalanceParamsDTO etendue = tranches.isEmpty() ? null
                : BalanceParamsDTO.builder().dtStart(tranches.get(0).getDebut().toString())
                        .dtEnd(tranches.get(tranches.size() - 1).getFin().toString()).emplacementId(emplacement)
                        .build();
        java.util.concurrent.Future<java.util.Map<String, JSONObject>> serieCa = avecJours
                ? lancer(() -> balanceService.serieCaParJourAsync(etendue)) : null;
        java.util.concurrent.Future<java.util.Map<String, JSONObject>> serieCredit = avecJours
                ? lancer(() -> balanceService.serieCreditEtAchatsParJourAsync(etendue)) : null;
        java.util.concurrent.Future<java.util.Map<String, JSONObject>> serieModes = avecJours
                ? lancer(() -> balanceService.serieModesParJourAsync(etendue)) : null;
        for (int rang = 0; rang < tranches.size(); rang++) {
            util.PeriodesCa.Tranche tranche = tranches.get(rang);
            JSONObject balance = obtenir(attentes.get(rang),
                    () -> balanceService.getBalanceVenteCaisseDataView(parametres(tranche, emplacement)));
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
            JSONObject ventilation = balance.optJSONObject("ventilation");
            JSONObject parModes = new JSONObject();
            JSONArray modes = ventilation == null ? null : ventilation.optJSONArray("modes");
            for (int i = 0; modes != null && i < modes.length(); i++) {
                JSONObject mode = modes.getJSONObject(i);
                parModes.put(mode.optString("modeId"), mode.optLong("montant"));
                modesRencontres.putIfAbsent(mode.optString("modeId"),
                        new JSONObject().put("modeId", mode.optString("modeId"))
                                .put("libelle", mode.optString("libelle")).put("mobile", mode.optBoolean("mobile")));
            }
            ligne.put("parModes", parModes);
            ligne.put("montantMobile",
                    ventilation == null ? 0L : ventilation.getJSONObject("mobile").optLong("montant"));
            long net = ligne.optLong("montantNet", 0L);
            // L'ecart se lit d'une tranche a la precedente : c'est ce que l'oeil cherche dans une
            // comparaison, et non l'ecart au premier mois de la serie.
            ligne.put("ecart", precedentNet == null ? JSONObject.NULL : net - precedentNet);
            ligne.put("ecartPourcentage", precedentNet == null || precedentNet == 0L ? JSONObject.NULL
                    : Math.round((net - precedentNet) * 10000D / precedentNet) / 100D);
            data.put(ligne);
            precedentNet = net;
        }
        java.util.List<JSONObject> modesOrdonnes = ordonnerModes(modesRencontres.values());
        java.util.List<String> idsModes = new java.util.ArrayList<>();
        for (JSONObject m : modesOrdonnes) {
            idsModes.add(m.optString("modeId"));
        }
        // Retour des tests du 09/09 : taux d'evolution sur chaque indicateur, total general, et les
        // series du graphique sous l'analyse (mois par annee, jours par semaine, ou une barre par periode).
        JSONObject total = rest.service.impl.AnalyseBalance.evolutionsEtTotal(data,
                java.util.Arrays.asList(CHAMPS_ANALYSE_BALANCE), idsModes);
        JSONArray jours = null;
        if (avecJours) {
            jours = rest.service.impl.BalanceServiceImpl.fusionnerJours(
                    java.util.Arrays.asList(obtenir(serieCa, () -> balanceService.serieCaParJour(etendue)),
                            obtenir(serieCredit, () -> balanceService.serieCreditEtAchatsParJour(etendue)),
                            obtenir(serieModes, () -> balanceService.serieModesParJour(etendue))));
        }
        java.util.logging.Logger.getLogger(BalanceVenteRessource.class.getName()).log(java.util.logging.Level.INFO,
                "[PERF] analyse balance {0} : {1} tranche(s) en {2} ms",
                new Object[] { typePeriode, tranches.size(), System.currentTimeMillis() - depart });
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data)
                        .put("modes", new JSONArray(modesOrdonnes)).put("totalGeneral", total)
                        .put("graphique", rest.service.impl.AnalyseBalance.graphique(type, tranches, data, jours))
                        // Une seule tranche : l'ecran affiche les chiffres bruts, pas une comparaison.
                        .put("comparatif", data.length() >= 2).toString())
                .build();
    }

    /**
     * L'ordre des colonnes de l'evolution par mode : especes, carte, cheque, virement, puis les autres modes
     * classiques, puis les operateurs mobiles par ordre alphabetique. Le meme ordre sert a l'ecran, au classeur et au
     * PDF.
     */
    private static java.util.List<JSONObject> ordonnerModes(java.util.Collection<JSONObject> modes) {
        java.util.List<String> fixes = java.util.Arrays.asList(Constant.MODE_ESP, Constant.MODE_CB,
                Constant.MODE_CHEQUE, Constant.MODE_VIREMENT);
        java.util.List<JSONObject> liste = new java.util.ArrayList<>(modes);
        liste.sort(java.util.Comparator.comparingInt((JSONObject m) -> m.optBoolean("mobile") ? 1 : 0)
                .thenComparingInt(m -> {
                    int rang = fixes.indexOf(m.optString("modeId"));
                    return rang < 0 ? fixes.size() : rang;
                }).thenComparing(m -> m.optString("libelle"), String.CASE_INSENSITIVE_ORDER));
        return liste;
    }

    private static BalanceParamsDTO parametres(util.PeriodesCa.Tranche tranche, String emplacement) {
        return BalanceParamsDTO.builder().dtStart(tranche.getDebut().toString()).dtEnd(tranche.getFin().toString())
                .emplacementId(emplacement).build();
    }

    /** Lance un calcul asynchrone ; s'il ne peut pas etre lance, rend null et le calcul se fera en synchrone. */
    private static <T> java.util.concurrent.Future<T> lancer(
            java.util.function.Supplier<java.util.concurrent.Future<T>> lancement) {
        try {
            return lancement.get();
        } catch (RuntimeException e) {
            java.util.logging.Logger.getLogger(BalanceVenteRessource.class.getName())
                    .log(java.util.logging.Level.WARNING, "lancement asynchrone impossible, calcul synchrone", e);
            return null;
        }
    }

    /** Le resultat d'un calcul asynchrone ; en cas d'echec, le meme calcul est refait en synchrone. */
    private static <T> T obtenir(java.util.concurrent.Future<T> attente, java.util.function.Supplier<T> secours) {
        if (attente != null) {
            try {
                return attente.get(30, java.util.concurrent.TimeUnit.MINUTES);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (java.util.concurrent.ExecutionException | java.util.concurrent.TimeoutException e) {
                java.util.logging.Logger.getLogger(BalanceVenteRessource.class.getName())
                        .log(java.util.logging.Level.WARNING, "calcul asynchrone en echec, repris en synchrone", e);
            }
        }
        return secours.get();
    }

    /**
     * L'analyse comparative en PDF, sur son propre modele (retour du 09/09 : « l'analyse comparative doit avoir son
     * fichier jrxml »). Deux tableaux : les indicateurs par periode, puis l'evolution par mode de paiement, periodes en
     * ligne et modes en colonne. Rendu en flux dans l'onglet ouvert par le clic : aucune fenetre surgissante.
     */
    @GET
    @Path("/balancesalecash/analyse/pdf")
    @Produces("application/pdf")
    public Response imprimerAnalyseBalance(@QueryParam(value = "typePeriode") String typePeriode,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        JSONObject analyse = new JSONObject(String.valueOf(analyseBalance(typePeriode, dtStart, dtEnd).getEntity()));
        JSONArray lignes = analyse.optJSONArray("data");
        JSONArray modes = analyse.optJSONArray("modes");
        java.util.List<rest.service.dto.AnalyseBalanceLigneDTO> periodes = new java.util.ArrayList<>();
        java.util.List<rest.service.dto.ModeParPeriodeDTO> cellules = new java.util.ArrayList<>();
        for (int i = 0; lignes != null && i < lignes.length(); i++) {
            JSONObject ligne = lignes.getJSONObject(i);
            rest.service.dto.AnalyseBalanceLigneDTO periode = new rest.service.dto.AnalyseBalanceLigneDTO(ligne);
            periodes.add(periode);
            JSONObject parModes = ligne.optJSONObject("parModes");
            for (int j = 0; modes != null && j < modes.length(); j++) {
                JSONObject mode = modes.getJSONObject(j);
                // Une cellule par periode ET par mode, meme a zero : le tableau croise garde ainsi
                // toutes ses colonnes sur toutes ses lignes.
                cellules.add(new rest.service.dto.ModeParPeriodeDTO(periode.getLibelleComplet(), i,
                        mode.optString("libelle"), j,
                        parModes == null ? 0L : parModes.optLong(mode.optString("modeId"), 0L)));
            }
        }
        java.util.Map<String, Object> parametres = reportUtil.officineData(tu);
        parametres.put("P_PERIODE", libellePeriode(typePeriode, lignes));
        parametres.put("P_COMPARATIF", analyse.optBoolean("comparatif"));
        parametres.put("P_MODES", new net.sf.jasperreports.engine.data.JRBeanCollectionDataSource(cellules));
        parametres.put("P_NB_MODES", modes == null ? 0 : modes.length());
        String url = reportUtil.buildReport(parametres, "balance_analyse_comparative", periodes);
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head>"
                            + "<body style=\"font-family:Arial,sans-serif;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=analyse_balance_"
                        + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".pdf")
                .build();
    }

    /** « 3 derniers mois, du 01/06/2026 au 09/09/2026 » : le type de periode et les bornes reellement couvertes. */
    private static String libellePeriode(String typePeriode, JSONArray lignes) {
        String type = util.PeriodesCa.Type.de(typePeriode).name().replace('_', ' ').toLowerCase(java.util.Locale.ROOT);
        if (lignes == null || lignes.length() == 0) {
            return type;
        }
        java.time.format.DateTimeFormatter jj = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        try {
            String debut = java.time.LocalDate.parse(lignes.getJSONObject(0).optString("debut")).format(jj);
            String fin = java.time.LocalDate.parse(lignes.getJSONObject(lignes.length() - 1).optString("fin"))
                    .format(jj);
            return type + ", du " + debut + " au " + fin;
        } catch (RuntimeException e) {
            return type;
        }
    }

    /** L'evolution par mode de paiement en classeur Excel : une ligne par periode, une colonne par mode. */
    @GET
    @Path("/balancesalecash/analyse/modes/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exporterModesBalance(@QueryParam(value = "typePeriode") String typePeriode,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd)
            throws java.io.IOException {
        Response reponse = analyseBalance(typePeriode, dtStart, dtEnd);
        JSONObject analyse = new JSONObject(String.valueOf(reponse.getEntity()));
        if (!analyse.optBoolean("success")) {
            return reponse;
        }
        JSONArray lignes = analyse.optJSONArray("data");
        JSONArray modes = analyse.optJSONArray("modes");
        java.util.List<JSONObject> donnees = new java.util.ArrayList<>();
        for (int i = 0; lignes != null && i < lignes.length(); i++) {
            donnees.add(lignes.getJSONObject(i));
        }
        rest.report.excel.ClasseurExcel<JSONObject> classeur = new rest.report.excel.ClasseurExcel<JSONObject>(
                "Evolution par mode").titre("ÉVOLUTION PAR MODE DE PAIEMENT")
                        .critere("Période", libellePeriode(typePeriode, lignes))
                        .texte("Période", o -> o.optString("libelle") + (o.optBoolean("enCours") ? " (en cours)" : ""))
                        .nombre("Ventes", o -> o.optLong("nbreVente")).nombre("Net TTC", o -> o.optLong("montantNet"));
        for (int j = 0; modes != null && j < modes.length(); j++) {
            JSONObject mode = modes.getJSONObject(j);
            String modeId = mode.optString("modeId");
            classeur.nombre(mode.optString("libelle"), o -> {
                JSONObject parModes = o.optJSONObject("parModes");
                return parModes == null ? 0L : parModes.optLong(modeId, 0L);
            });
        }
        classeur.nombre("Total mobile", o -> o.optLong("montantMobile")).nombre("Tiers payant",
                o -> o.optLong("montantTp"));
        String nomFichier = "evolution_modes_balance_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xlsx";
        return Response
                .ok(classeur.construire(donnees), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=" + nomFichier).build();
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
