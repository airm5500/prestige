package rest;

import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.AbcAnalysisService;

/**
 * Ressource REST de la classification ABC (Lot 1).
 *
 * Totalement independante des endpoints 20/80 (statfamillearticle).
 */
@Path("v1/articles/abc")
@Produces("application/json")
@Consumes("application/json")
public class AbcArticleRessource {

    @EJB
    private AbcAnalysisService abcAnalysisService;
    @EJB
    private rest.report.ReportUtil reportUtil;
    @EJB
    private rest.service.SessionHelperService sessionHelperService;

    /**
     * Nom du fichier edite (retour du 09/09) : feuille_de_match_<officine>_<periode>.<extension>, le nom de l'officine
     * et la periode reduits a des caracteres surs pour un nom de fichier.
     */
    private String nomFichierFeuille(String dtStart, String dtEnd, String extension) {
        String officine = "";
        try {
            Object nom = reportUtil.officineData(sessionHelperService.getCurrentUser()).get("P_H_INSTITUTION");
            officine = nom == null ? "" : String.valueOf(nom);
        } catch (Exception e) {
            officine = "";
        }
        return "feuille_de_match_" + slug(officine) + "_" + slug(dtStart) + "_" + slug(dtEnd) + "." + extension;
    }

    public static String slug(String valeur) {
        if (valeur == null) {
            return "";
        }
        String sans = java.text.Normalizer.normalize(valeur.trim(), java.text.Normalizer.Form.NFD).replaceAll("\\p{M}",
                "");
        String propre = sans.replaceAll("[^A-Za-z0-9]+", "_").replaceAll("^_+|_+$", "");
        return propre.length() > 40 ? propre.substring(0, 40) : propre;
    }

    private java.util.Map<String, Object> enTete() {
        try {
            return reportUtil.officineData(sessionHelperService.getCurrentUser());
        } catch (Exception e) {
            return new java.util.HashMap<>();
        }
    }

    @GET
    public Response grid(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit, @QueryParam("sort") String sort,
            @QueryParam("dir") String dir, @QueryParam("topN") Integer topN) {

        JSONObject json = abcAnalysisService.grid(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, start, limit, sort, dir, topN);
        return Response.ok().entity(json.toString()).build();
    }

    // @Consumes(WILDCARD) : les parametres arrivent en query string (pas de corps JSON),
    // ce qui evite l'erreur 415 declenchee par le @Consumes(application/json) de la classe.
    @POST
    @Path("recalculate")
    @Consumes(MediaType.WILDCARD)
    public Response recalculate(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste) {

        JSONObject json = abcAnalysisService.recalculate(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("apply")
    @Consumes(MediaType.WILDCARD)
    public Response apply(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste) {

        JSONObject json = abcAnalysisService.apply(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return Response.ok().entity(json.toString()).build();
    }

    // ----------------------- Exports / Inventaire (Lot 2) -------------------
    @GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN) {
        byte[] data = abcAnalysisService.buildExcel(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"classification_abc.xls\"")
                .build();
    }

    @GET
    @Path("csv")
    @Produces("text/csv")
    public Response csv(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN) {
        byte[] data = abcAnalysisService.buildCsv(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"classification_abc.csv\"")
                .build();
    }

    @GET
    @Path("print")
    @Produces("application/pdf")
    public Response print(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN) {
        byte[] data = abcAnalysisService.buildPdf(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        return Response.ok(data).header("Content-Disposition", "inline; filename=\"classification_abc.pdf\"").build();
    }

    /** Grille de la feuille de match : classification + achats du mois en cours + statut objectif. */
    @GET
    @Path("feuille-match")
    public Response feuilleMatchGrid(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("QTY") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit, @QueryParam("topN") Integer topN,
            @DefaultValue("3") @QueryParam("objectifAchat") Integer objectifAchat,
            @DefaultValue("ALL") @QueryParam("objectifFilter") String objectifFilter,
            @DefaultValue("") @QueryParam("tri") String tri) {
        JSONObject json = abcAnalysisService.feuilleDeMatchGrid(dtStart, dtEnd, type, classe, search, codeFamille,
                codeRayon, codeGrossiste, stockFilter, stockMin, stockMax, start, limit, topN, objectifAchat,
                objectifFilter, tri);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * La feuille de match SIMPLE en PDF (retour du 09/09) : Rang, Produit, CIP13, UG, Quantites achetees, Frequence
     * d'achat, classee par quantite achetee, rangs ex aequo « 17-21 ».
     */
    @GET
    @Path("feuille-match/simple/pdf")
    @Produces("application/pdf")
    public Response feuilleMatchSimplePdf(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("QTY") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN,
            @DefaultValue("3") @QueryParam("objectifAchat") Integer objectifAchat,
            @DefaultValue("ALL") @QueryParam("objectifFilter") String objectifFilter) {
        java.util.List<commonTasks.dto.FeuilleDeMatchSimpleLigneDTO> lignes = abcAnalysisService.feuilleDeMatchSimple(
                dtStart, dtEnd, type, classe, search, codeFamille, codeRayon, codeGrossiste, stockFilter, stockMin,
                stockMax, topN, objectifAchat, objectifFilter);
        java.util.Map<String, Object> enTete = enTete();
        byte[] data = rest.report.pdf.FeuilleDeMatchSimplePdf.construire(lignes,
                String.valueOf(enTete.getOrDefault("P_H_INSTITUTION", "")),
                "Période du " + (dtStart == null ? "" : dtStart) + " au " + (dtEnd == null ? "" : dtEnd) + " - "
                        + lignes.size() + " produit(s)",
                String.valueOf(enTete.getOrDefault("P_PRINTED_BY", "")).trim());
        return Response.ok(data)
                .header("Content-Disposition", "inline; filename=\"" + nomFichierFeuille(dtStart, dtEnd, "pdf") + "\"")
                .build();
    }

    /** La feuille de match SIMPLE en classeur Excel (.xlsx), memes colonnes, meme nom de fichier. */
    @GET
    @Path("feuille-match/simple/xlsx")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response feuilleMatchSimpleXlsx(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("QTY") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN,
            @DefaultValue("3") @QueryParam("objectifAchat") Integer objectifAchat,
            @DefaultValue("ALL") @QueryParam("objectifFilter") String objectifFilter) {
        java.util.List<commonTasks.dto.FeuilleDeMatchSimpleLigneDTO> lignes = abcAnalysisService.feuilleDeMatchSimple(
                dtStart, dtEnd, type, classe, search, codeFamille, codeRayon, codeGrossiste, stockFilter, stockMin,
                stockMax, topN, objectifAchat, objectifFilter);
        rest.report.excel.ClasseurExcel<commonTasks.dto.FeuilleDeMatchSimpleLigneDTO> classeur = new rest.report.excel.ClasseurExcel<commonTasks.dto.FeuilleDeMatchSimpleLigneDTO>(
                "Feuille de match")
                        .titre("FEUILLE DE MATCH SIMPLE - " + enTete().getOrDefault("P_H_INSTITUTION", ""))
                        .critere("Période du " + (dtStart == null ? "" : dtStart) + " au "
                                + (dtEnd == null ? "" : dtEnd))
                        .texte("Rang", l -> l.getRang()).texte("Produit", l -> l.getProduit())
                        .texte("CIP13", l -> l.getCip13()).nombre("UG", l -> l.getUg())
                        .nombre("Quantités achetées", l -> l.getQuantite())
                        .nombre("Quantités vendues", l -> l.getQuantiteVendue())
                        .nombre("Fréquence d'achat", l -> l.getFrequence());
        try {
            byte[] contenu = classeur.construire(lignes);
            return Response.ok(contenu).header("Content-Disposition",
                    "attachment; filename=\"" + nomFichierFeuille(dtStart, dtEnd, "xlsx") + "\"").build();
        } catch (java.io.IOException e) {
            return Response.serverError().build();
        }
    }

    /** Impression PDF "Feuille de match" : frequences et quantites d'achat (mois courant + 3 derniers mois). */
    @GET
    @Path("feuille-match/print")
    @Produces("application/pdf")
    public Response feuilleMatchPrint(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("QTY") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN,
            @DefaultValue("3") @QueryParam("objectifAchat") Integer objectifAchat,
            @DefaultValue("ALL") @QueryParam("objectifFilter") String objectifFilter) {
        byte[] data = abcAnalysisService.buildFeuilleDeMatchPdf(dtStart, dtEnd, type, classe, search, codeFamille,
                codeRayon, codeGrossiste, stockFilter, stockMin, stockMax, topN, objectifAchat, objectifFilter);
        return Response.ok(data)
                .header("Content-Disposition", "inline; filename=\"" + nomFichierFeuille(dtStart, dtEnd, "pdf") + "\"")
                .build();
    }

    /** Detail achats d'un produit pour la vue feuille de match. */
    @GET
    @Path("feuille-match/produit-detail")
    public Response feuilleMatchProduitDetail(@QueryParam("produitId") String produitId,
            @DefaultValue("3") @QueryParam("objectifAchat") Integer objectifAchat) {
        return Response.ok().entity(abcAnalysisService.feuilleDeMatchProduitDetail(produitId, objectifAchat).toString())
                .build();
    }

    @POST
    @Path("inventaire")
    @Consumes(MediaType.WILDCARD)
    public Response inventaire(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN) {
        JSONObject json = abcAnalysisService.createInventaire(dtStart, dtEnd, type, classe, search, codeFamille,
                codeRayon, codeGrossiste, stockFilter, stockMin, stockMax, topN);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("suggestion")
    @Consumes(MediaType.WILDCARD)
    public Response suggestion(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax, @QueryParam("topN") Integer topN,
            @DefaultValue("false") @QueryParam("isReappro") boolean isReappro) {
        JSONObject json = abcAnalysisService.createSuggestion(dtStart, dtEnd, type, classe, search, codeFamille,
                codeRayon, codeGrossiste, stockFilter, stockMin, stockMax, topN, isReappro);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("produit/conso")
    public Response produitConso(@QueryParam("produitId") String produitId,
            @DefaultValue("7") @QueryParam("months") int months) {
        return Response.ok().entity(abcAnalysisService.produitConso(produitId, months).toString()).build();
    }

    @GET
    @Path("evolution")
    public Response evolution(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @DefaultValue("CA") @QueryParam("type") String type,
            @DefaultValue("CA") @QueryParam("indicator") String indicator, @QueryParam("classe") String classe,
            @QueryParam("search") String search, @QueryParam("codeFamille") String codeFamille,
            @QueryParam("codeRayon") String codeRayon, @QueryParam("codeGrossiste") String codeGrossiste,
            @QueryParam("stockFilter") String stockFilter, @QueryParam("stockMin") Integer stockMin,
            @QueryParam("stockMax") Integer stockMax) {
        JSONObject json = abcAnalysisService.evolution(dtStart, dtEnd, type, indicator, classe, search, codeFamille,
                codeRayon, codeGrossiste, stockFilter, stockMin, stockMax);
        return Response.ok().entity(json.toString()).build();
    }

    /** Declenche la reclassification automatique (respecte le verrou mensuel ABC_LAST_RECLASS_DATE). */
    @POST
    @Path("auto-reclassify")
    @Consumes(MediaType.WILDCARD)
    public Response autoReclassify() {
        return Response.ok().entity(abcAnalysisService.autoReclassifyIfDue().toString()).build();
    }

    // ----------------------- Configuration des classes ABC ------------------
    @GET
    @Path("classes")
    public Response listClasses() {
        return Response.ok().entity(abcAnalysisService.listClasses().toString()).build();
    }

    @POST
    @Path("classes/update")
    @Consumes(MediaType.WILDCARD)
    public Response updateClasse(@QueryParam("id") String id, @QueryParam("q1") Integer q1,
            @QueryParam("q2") Integer q2, @QueryParam("q3") Integer q3, @QueryParam("unite") String unite,
            @QueryParam("seuilMin") Double seuilMin, @QueryParam("seuilMax") Double seuilMax,
            @QueryParam("statut") String statut) {

        JSONObject json = abcAnalysisService.updateClasse(id, q1, q2, q3, unite, seuilMin, seuilMax, statut);
        return Response.ok().entity(json.toString()).build();
    }
}
