package rest;

import commonTasks.dto.ArticleAnalyseDTO;
import commonTasks.dto.PaireArticleDTO;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.excel.ClasseurExcel;
import rest.service.AnalyseArticleService;
import rest.service.InventaireService;
import rest.service.impl.AnalyseArticle;
import util.Constant;
import util.PeriodesCa;

/**
 * Analyse article : matrice marge x rotation (avec ses decisions pratiques), produits achetes ensemble, exports Excel,
 * edition PDF en flux et creation d'un inventaire depuis la liste.
 *
 * <p>
 * La periode suit le selecteur habituel (3 dernieres semaines, 3 mois, 6 mois, 3 ans, libre) ; l'analyse porte sur
 * l'etendue complete de la periode choisie. Les seuils « eleve / faible » valent, sauf saisie, les medianes de
 * l'assortiment vendu sur la periode.
 * </p>
 */
@Path("v1/analyse-article")
@Produces(MediaType.APPLICATION_JSON)
public class AnalyseArticleRessource {

    private static final Logger LOG = Logger.getLogger(AnalyseArticleRessource.class.getName());
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @EJB
    private AnalyseArticleService analyseArticleService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private rest.report.ReportUtil reportUtil;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response echec(String message) {
        return Response.ok().entity(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    /* ------------------------------------------------------------------ periode et seuils */

    /** L'etendue [debut, fin] de la periode demandee, par le meme decoupage que l'analyse comparative. */
    static LocalDate[] periode(String typePeriode, String dtStart, String dtEnd) {
        List<PeriodesCa.Tranche> tranches = PeriodesCa.tranches(PeriodesCa.Type.de(typePeriode), dateOuNull(dtStart),
                dateOuNull(dtEnd), LocalDate.now());
        if (tranches.isEmpty()) {
            LocalDate fin = LocalDate.now();
            return new LocalDate[] { fin.minusMonths(3).plusDays(1), fin };
        }
        return new LocalDate[] { tranches.get(0).getDebut(), tranches.get(tranches.size() - 1).getFin() };
    }

    private static LocalDate dateOuNull(String valeur) {
        try {
            return StringUtils.isBlank(valeur) ? null : LocalDate.parse(valeur.trim());
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static Double nombreOuNull(String valeur) {
        try {
            return StringUtils.isBlank(valeur) ? null : Double.valueOf(valeur.trim().replace(',', '.'));
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Le resultat complet d'une analyse : articles affectes a leur quadrant, seuils retenus, periode. */
    private static final class Analyse {
        LocalDate debut;
        LocalDate fin;
        double seuilMarge;
        double seuilRotation;
        double medianeMarge;
        double medianeRotation;
        List<ArticleAnalyseDTO> articles;
    }

    private Analyse analyser(String typePeriode, String dtStart, String dtEnd, String seuilMarge,
            String seuilRotation) {
        Analyse a = new Analyse();
        LocalDate[] p = periode(typePeriode, dtStart, dtEnd);
        a.debut = p[0];
        a.fin = p[1];
        a.articles = analyseArticleService.articles(a.debut, a.fin);
        a.medianeMarge = AnalyseArticle.medianeMarge(a.articles);
        a.medianeRotation = AnalyseArticle.medianeRotation(a.articles);
        Double marge = nombreOuNull(seuilMarge);
        Double rotation = nombreOuNull(seuilRotation);
        a.seuilMarge = marge == null ? a.medianeMarge : marge;
        a.seuilRotation = rotation == null ? a.medianeRotation : rotation;
        AnalyseArticle.affecterQuadrants(a.articles, a.seuilMarge, a.seuilRotation);
        AnalyseArticle.trier(a.articles);
        return a;
    }

    private static JSONObject enteteJson(Analyse a) {
        return new JSONObject().put("success", true)
                .put("periode",
                        new JSONObject().put("debut", a.debut.toString()).put("fin", a.fin.toString())
                                .put("libelle", "du " + a.debut.format(JOUR) + " au " + a.fin.format(JOUR))
                                .put("jours", java.time.temporal.ChronoUnit.DAYS.between(a.debut, a.fin) + 1))
                .put("seuils",
                        new JSONObject().put("marge", a.seuilMarge).put("rotation", a.seuilRotation)
                                .put("medianeMarge", a.medianeMarge).put("medianeRotation", a.medianeRotation))
                .put("quadrants", AnalyseArticle.resume(a.articles)).put("totalProduits", a.articles.size());
    }

    /* ------------------------------------------------------------------ matrice */

    @GET
    @Path("matrice")
    public Response matrice(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("seuilMarge") String seuilMarge,
            @QueryParam("seuilRotation") String seuilRotation, @DefaultValue("0") @QueryParam("quadrant") int quadrant,
            @DefaultValue("") @QueryParam("famille") String famille,
            @DefaultValue("") @QueryParam("rayon") String rayon,
            @DefaultValue("") @QueryParam("grossiste") String grossiste,
            @DefaultValue("") @QueryParam("query") String recherche, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        Analyse a = analyser(typePeriode, dtStart, dtEnd, seuilMarge, seuilRotation);
        List<ArticleAnalyseDTO> retenus = AnalyseArticle.filtrer(a.articles, quadrant, famille, rayon, grossiste,
                recherche);
        JSONArray data = new JSONArray();
        int depart = Math.max(0, start);
        int fin = limit <= 0 ? retenus.size() : Math.min(retenus.size(), depart + limit);
        for (int i = depart; i < fin; i++) {
            data.put(AnalyseArticle.json(retenus.get(i)));
        }
        return Response.ok().entity(enteteJson(a).put("total", retenus.size()).put("data", data).toString()).build();
    }

    @GET
    @Path("matrice/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response matriceExcel(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("seuilMarge") String seuilMarge,
            @QueryParam("seuilRotation") String seuilRotation, @DefaultValue("0") @QueryParam("quadrant") int quadrant,
            @DefaultValue("") @QueryParam("famille") String famille,
            @DefaultValue("") @QueryParam("rayon") String rayon,
            @DefaultValue("") @QueryParam("grossiste") String grossiste,
            @DefaultValue("") @QueryParam("query") String recherche) throws IOException {
        Analyse a = analyser(typePeriode, dtStart, dtEnd, seuilMarge, seuilRotation);
        List<ArticleAnalyseDTO> retenus = AnalyseArticle.filtrer(a.articles, quadrant, famille, rayon, grossiste,
                recherche);
        byte[] data = new ClasseurExcel<ArticleAnalyseDTO>("Marge x rotation")
                .titre("ANALYSE ARTICLE - MARGE × ROTATION")
                .critere("Période", "du " + a.debut.format(JOUR) + " au " + a.fin.format(JOUR))
                .critere("Seuil taux de marge (%)", String.valueOf(a.seuilMarge))
                .critere("Seuil rotation", String.valueOf(a.seuilRotation))
                .critere("Quadrant", quadrant > 0 ? AnalyseArticle.libelleQuadrant(quadrant) : "Tous")
                .texte("Quadrant", x -> AnalyseArticle.libelleQuadrant(x.getQuadrant()))
                .texte("CIP", ArticleAnalyseDTO::getCip).texte("Produit", ArticleAnalyseDTO::getLibelle)
                .nombre("Quantité", ArticleAnalyseDTO::getQuantite).nombre("Tickets", ArticleAnalyseDTO::getTickets)
                .nombre("Chiffre d'affaires", ArticleAnalyseDTO::getMontant)
                .nombre("Marge", ArticleAnalyseDTO::getMarge).nombre("Taux marge %", ArticleAnalyseDTO::getTauxMarge)
                .nombre("Stock", ArticleAnalyseDTO::getStock).nombre("Rotation", ArticleAnalyseDTO::getRotation)
                .nombre("Couverture (jours)", x -> x.getCouverture() < 0 ? null : x.getCouverture())
                .nombre("Valeur stock", ArticleAnalyseDTO::getValeurStock)
                .texte("Classe ABC", ArticleAnalyseDTO::getClasse)
                .texte("Décision", x -> AnalyseArticle.decisionQuadrant(x.getQuadrant())).construire(retenus);
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=" + nomFichier("analyse_article", "xlsx")).build();
    }

    @GET
    @Path("matrice/pdf")
    @Produces("application/pdf")
    public Response matricePdf(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("seuilMarge") String seuilMarge,
            @QueryParam("seuilRotation") String seuilRotation, @DefaultValue("0") @QueryParam("quadrant") int quadrant,
            @DefaultValue("") @QueryParam("famille") String famille,
            @DefaultValue("") @QueryParam("rayon") String rayon,
            @DefaultValue("") @QueryParam("grossiste") String grossiste,
            @DefaultValue("") @QueryParam("query") String recherche) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Analyse a = analyser(typePeriode, dtStart, dtEnd, seuilMarge, seuilRotation);
        List<ArticleAnalyseDTO> retenus = AnalyseArticle.filtrer(a.articles, quadrant, famille, rayon, grossiste,
                recherche);
        Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_PERIODE", "Du " + a.debut.format(JOUR) + " au " + a.fin.format(JOUR)
                + (quadrant > 0 ? "  -  " + AnalyseArticle.libelleQuadrant(quadrant) : ""));
        parametres.put("P_SEUILS", "Seuils : taux de marge " + a.seuilMarge + " %  -  rotation " + a.seuilRotation
                + "  (médianes : " + a.medianeMarge + " % et " + a.medianeRotation + ")");
        parametres.put("P_RESUME", resumeTexte(AnalyseArticle.resume(a.articles)));
        String url = reportUtil.buildReport(parametres, "analyse_article", retenus);
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=" + nomFichier("analyse_article", "pdf")).build();
    }

    /** Le resume des quadrants sur une ligne par quadrant, pour l'en-tete de l'edition. */
    static String resumeTexte(JSONArray resume) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < resume.length(); i++) {
            JSONObject q = resume.getJSONObject(i);
            if (sb.length() > 0) {
                sb.append('\n');
            }
            sb.append(q.optString("libelle")).append(" : ").append(q.optLong("produits")).append(" produit(s), CA ")
                    .append(String.format("%,d", q.optLong("montant")).replace(',', ' ')).append(", marge ")
                    .append(String.format("%,d", q.optLong("marge")).replace(',', ' ')).append(", stock ")
                    .append(String.format("%,d", q.optLong("valeurStock")).replace(',', ' ')).append(" - ")
                    .append(q.optString("decision"));
        }
        return sb.toString();
    }

    /* ------------------------------------------------------------------ paires */

    @GET
    @Path("paires")
    public Response paires(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @DefaultValue("3") @QueryParam("minimum") int minimum,
            @DefaultValue("100") @QueryParam("limite") int limite) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        LocalDate[] p = periode(typePeriode, dtStart, dtEnd);
        List<PaireArticleDTO> paires = pairesCompletes(p[0], p[1], minimum, limite);
        JSONArray data = new JSONArray();
        for (PaireArticleDTO paire : paires) {
            data.put(AnalyseArticle.json(paire));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true)
                        .put("periode",
                                new JSONObject().put("debut", p[0].toString()).put("fin", p[1].toString())
                                        .put("libelle", "du " + p[0].format(JOUR) + " au " + p[1].format(JOUR)))
                        .put("total", paires.size()).put("data", data).toString())
                .build();
    }

    private List<PaireArticleDTO> pairesCompletes(LocalDate debut, LocalDate fin, int minimum, int limite) {
        List<PaireArticleDTO> paires = analyseArticleService.paires(debut, fin, minimum, limite);
        AnalyseArticle.completerPaires(paires, analyseArticleService.articles(debut, fin));
        return paires;
    }

    @GET
    @Path("paires/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response pairesExcel(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @DefaultValue("3") @QueryParam("minimum") int minimum,
            @DefaultValue("100") @QueryParam("limite") int limite) throws IOException {
        LocalDate[] p = periode(typePeriode, dtStart, dtEnd);
        List<PaireArticleDTO> paires = pairesCompletes(p[0], p[1], minimum, limite);
        byte[] data = new ClasseurExcel<PaireArticleDTO>("Achetés ensemble").titre("ANALYSE ARTICLE - ACHETÉS ENSEMBLE")
                .critere("Période", "du " + p[0].format(JOUR) + " au " + p[1].format(JOUR))
                .critere("Minimum de tickets en commun", String.valueOf(minimum))
                .texte("CIP 1", PaireArticleDTO::getCip1).texte("Produit 1", PaireArticleDTO::getLibelle1)
                .texte("CIP 2", PaireArticleDTO::getCip2).texte("Produit 2", PaireArticleDTO::getLibelle2)
                .nombre("Tickets ensemble", PaireArticleDTO::getTickets)
                .nombre("Tickets produit 1", PaireArticleDTO::getTickets1)
                .nombre("% des tickets du produit 1", PaireArticleDTO::getPart1)
                .nombre("Tickets produit 2", PaireArticleDTO::getTickets2)
                .nombre("% des tickets du produit 2", PaireArticleDTO::getPart2).construire(paires);
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=" + nomFichier("achetes_ensemble", "xlsx"))
                .build();
    }

    /* ------------------------------------------------------------------ inventaire */

    /**
     * Un inventaire des produits envoyes (les coches), ou de tous les produits de l'analyse filtree quand aucun
     * identifiant n'est envoye. Suit ensuite le circuit habituel des inventaires.
     */
    @POST
    @Path("inventaire")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response inventaire(String corps) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        JSONObject json;
        try {
            json = StringUtils.isBlank(corps) ? new JSONObject() : new JSONObject(corps);
        } catch (RuntimeException e) {
            json = new JSONObject();
        }
        List<String> produits = new ArrayList<>();
        JSONArray demandes = json.optJSONArray("produits");
        for (int i = 0; demandes != null && i < demandes.length(); i++) {
            String id = demandes.optString(i);
            if (StringUtils.isNotBlank(id)) {
                produits.add(id.trim());
            }
        }
        LocalDate[] p = periode(json.optString("typePeriode"), json.optString("dtStart"), json.optString("dtEnd"));
        if (produits.isEmpty()) {
            Analyse a = analyser(json.optString("typePeriode"), json.optString("dtStart"), json.optString("dtEnd"),
                    json.optString("seuilMarge"), json.optString("seuilRotation"));
            for (ArticleAnalyseDTO article : AnalyseArticle.filtrer(a.articles, json.optInt("quadrant", 0),
                    json.optString("famille"), json.optString("rayon"), json.optString("grossiste"),
                    json.optString("query"))) {
                produits.add(article.getProduitId());
            }
        }
        if (produits.isEmpty()) {
            return echec("Aucun produit à inventorier.");
        }
        String nom = StringUtils.defaultIfBlank(json.optString("nom"),
                "INVENTAIRE ANALYSE ARTICLE " + (json.optInt("quadrant", 0) > 0
                        ? AnalyseArticle.libelleQuadrant(json.optInt("quadrant", 0)).toUpperCase()
                        : LocalDate.now().format(JOUR)));
        try {
            int nombre = inventaireService.create(new LinkedHashSet<>(produits), nom,
                    nom + " - période du " + p[0].format(JOUR) + " au " + p[1].format(JOUR));
            return Response.ok()
                    .entity(new JSONObject().put("success", true).put("count", nombre).put("nom", nom)
                            .put("msg", "Inventaire « " + nom + " » créé avec " + nombre + " produit(s).").toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "inventaire depuis l'analyse article", e);
            return echec("L'inventaire n'a pas pu être créé.");
        }
    }

    private static String nomFichier(String prefixe, String extension) {
        return prefixe + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + "."
                + extension;
    }
}
