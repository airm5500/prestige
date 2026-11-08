package rest;

import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.TableauPdf;
import rest.service.PromotionSuiviService;
import rest.service.promotion.PromotionAnalyse;
import rest.service.utils.ReportExcelExportService;

/**
 * Plan du 06/11, point 3.5 (demande du 07/11) : onglets Historique, Ventes en promotion et Analyse de l'ecran
 * Promotions, avec leur impression (PDF) et leur export (Excel). L'ecran, le PDF et l'Excel sont batis sur les memes
 * lignes : ce qui est imprime est ce qui est affiche.
 * <ul>
 * <li>Historique : reserve aux utilisateurs qui avaient le menu « Historique des promotions » (P_SM_PROMOTION_History)
 * ;</li>
 * <li>Ventes et Analyse : menu Promotions ou Historique.</li>
 * </ul>
 */
@Path("v1/promotions-suivi")
@Produces("application/json")
public class PromotionSuiviRessource {

    static final String DROIT_HISTORIQUE = "P_SM_PROMOTION_History";
    static final String DROIT_PROMOTIONS = "P_SM_PROMOTIONS";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private PromotionSuiviService service;
    @EJB
    private ReportExcelExportService excel;

    /** Une colonne : champ JSON, en-tete, nombre (aligne a droite), largeur relative dans le PDF. */
    private static final class Colonne {
        final String champ, entete;
        final boolean nombre;
        final float largeur;

        Colonne(String champ, String entete, boolean nombre, float largeur) {
            this.champ = champ;
            this.entete = entete;
            this.nombre = nombre;
            this.largeur = largeur;
        }
    }

    private static final Colonne[] COL_HISTORIQUE = { new Colonne("date", "Date", false, 9),
            new Colonne("actionLibelle", "Action", false, 12), new Colonne("promotion", "Promo", true, 4),
            new Colonne("type", "Type", false, 9), new Colonne("cip", "CIP", false, 6),
            new Colonne("produit", "Produit", false, 16), new Colonne("avant", "Avant", false, 15),
            new Colonne("apres", "Nouvelles valeurs", false, 15), new Colonne("vente", "Vente", false, 8),
            new Colonne("utilisateur", "Utilisateur", false, 10) };

    private static final Colonne[] COL_VENTES = { new Colonne("date", "Date", false, 8),
            new Colonne("refVente", "Vente", false, 8), new Colonne("vendeur", "Vendeur", false, 10),
            new Colonne("cip", "CIP", false, 6), new Colonne("produit", "Produit", false, 15),
            new Colonne("mention", "Promotion", false, 13), new Colonne("quantite", "Qté", true, 4),
            new Colonne("payees", "Payées", true, 4), new Colonne("offertes", "Offertes", true, 4),
            new Colonne("prixAvant", "Prix d'avant", true, 6), new Colonne("prixVendu", "Prix vendu", true, 6),
            new Colonne("montant", "Montant", true, 7), new Colonne("remise", "Coût promo", true, 7) };

    private static final Colonne[] COL_GROUPE = { new Colonne("cle", "", false, 30),
            new Colonne("ventes", "Ventes", true, 7), new Colonne("lignes", "Lignes", true, 7),
            new Colonne("payees", "Boîtes payées", true, 9), new Colonne("offertes", "Offertes", true, 9),
            new Colonne("montant", "Montant", true, 11), new Colonne("remise", "Coût promo", true, 11) };

    private TUser utilisateur() {
        return Droits.utilisateur(servletRequest);
    }

    private String imprimePar() {
        TUser u = utilisateur();
        return u == null ? ""
                : (StringUtils.defaultString(u.getStrFIRSTNAME()) + " " + StringUtils.defaultString(u.getStrLASTNAME()))
                        .trim();
    }

    private static LocalDate jour(String v, LocalDate defaut) {
        try {
            return StringUtils.isBlank(v) ? defaut : LocalDate.parse(v.trim().substring(0, 10));
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    private static String fr(LocalDate d) {
        return d == null ? "" : String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
    }

    /** Nombre avec espaces entre les milliers. */
    static String nombre(Object v) {
        if (!(v instanceof Number)) {
            return v == null ? "" : String.valueOf(v);
        }
        long n = ((Number) v).longValue();
        String s = String.valueOf(Math.abs(n)).replaceAll("\\B(?=(\\d{3})+(?!\\d))", " ");
        return (n < 0 ? "-" : "") + s;
    }

    private static List<String[]> lignes(JSONArray a, Colonne[] cols) {
        List<String[]> l = new ArrayList<>();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.getJSONObject(i);
            String[] r = new String[cols.length];
            for (int j = 0; j < cols.length; j++) {
                Object v = o.opt(cols[j].champ);
                r[j] = v == null || v == JSONObject.NULL ? "" : cols[j].nombre ? nombre(v) : String.valueOf(v);
            }
            l.add(r);
        }
        return l;
    }

    private static String[] entetes(Colonne[] cols, String premier) {
        String[] e = new String[cols.length];
        for (int i = 0; i < cols.length; i++) {
            e[i] = i == 0 && premier != null ? premier : cols[i].entete;
        }
        return e;
    }

    private static boolean[] droite(Colonne[] cols) {
        boolean[] d = new boolean[cols.length];
        for (int i = 0; i < cols.length; i++) {
            d[i] = cols[i].nombre;
        }
        return d;
    }

    private static float[] largeurs(Colonne[] cols) {
        float[] d = new float[cols.length];
        for (int i = 0; i < cols.length; i++) {
            d[i] = cols[i].largeur;
        }
        return d;
    }

    /** Excel : les colonnes numeriques sont des nombres. */
    private byte[] classeur(String titre, String[] entetes, boolean[] droite, List<String[]> lignes)
            throws java.io.IOException {
        return excel.createLandscapeExcelReport(titre, entetes, lignes, (row, l) -> {
            for (int i = 0; i < entetes.length; i++) {
                String v = i < l.length && l[i] != null ? l[i] : "";
                String n = v.replace(" ", "").replace(" ", "");
                if (droite[i] && n.matches("-?\\d+")) {
                    row.createCell(i).setCellValue(Double.parseDouble(n));
                } else {
                    row.createCell(i).setCellValue(v);
                }
            }
        });
    }

    private Response fichier(String format, byte[] pdf, byte[] xls, String nom) {
        if ("excel".equals(format)) {
            return Response.ok(xls, "application/vnd.ms-excel")
                    .header("Content-Disposition", "attachment; filename=\"" + nom + ".xls\"").build();
        }
        return Response.ok(pdf, "application/pdf").header("Content-Disposition", "inline; filename=" + nom + ".pdf")
                .build();
    }

    private TableauPdf.Edition edition(String titre, String sousTitre) {
        TableauPdf.Edition e = new TableauPdf.Edition();
        e.officine = service.officine();
        e.titre = titre;
        e.sousTitre = sousTitre;
        e.imprimePar = imprimePar();
        return e;
    }

    @GET
    @Path("droits")
    public Response droits() {
        if (utilisateur() == null) {
            return Droits.refus(servletRequest, "Promotions", DROIT_PROMOTIONS);
        }
        return Response
                .ok(new JSONObject().put("historique", Droits.a(servletRequest, DROIT_HISTORIQUE))
                        .put("ventes", Droits.a(servletRequest, DROIT_PROMOTIONS, DROIT_HISTORIQUE)).toString())
                .build();
    }

    /* ---------------------------------------------------------------- historique */

    private PromotionSuiviService.FiltreHistorique filtre(String du, String au, String action, String type,
            String produit, String util, String promotion) {
        PromotionSuiviService.FiltreHistorique f = new PromotionSuiviService.FiltreHistorique();
        f.du = jour(du, null);
        f.au = jour(au, null);
        f.action = action;
        f.type = type;
        f.produit = produit;
        f.utilisateur = util;
        f.promotion = StringUtils.isNumeric(promotion) ? Integer.valueOf(promotion) : null;
        return f;
    }

    /** Tri ExtJS : sort=[{"property":"date","direction":"DESC"}]. */
    private static String[] tri(String sort) {
        try {
            if (StringUtils.isNotBlank(sort)) {
                JSONObject o = new JSONArray(sort).getJSONObject(0);
                return new String[] { o.optString("property"), o.optString("direction", "DESC") };
            }
        } catch (RuntimeException e) {
            // tri par defaut
        }
        return new String[] { "date", "DESC" };
    }

    @GET
    @Path("historique")
    public Response historique(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("action") String action, @QueryParam("type") String type, @QueryParam("produit") String produit,
            @QueryParam("utilisateur") String util, @QueryParam("promotion") String promotion,
            @QueryParam("sort") String sort, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = Droits.refus(servletRequest, "Historique des promotions", DROIT_HISTORIQUE);
        if (r != null) {
            return r;
        }
        String[] t = tri(sort);
        return Response
                .ok(service.historique(filtre(du, au, action, type, produit, util, promotion), t[0], t[1], start, limit)
                        .toString())
                .build();
    }

    @GET
    @Path("historique/utilisateurs")
    public Response utilisateursHistorique() {
        Response r = Droits.refus(servletRequest, "Historique des promotions", DROIT_HISTORIQUE);
        return r != null ? r
                : Response.ok(new JSONObject().put("results", service.utilisateursHistorique()).toString()).build();
    }

    @GET
    @Path("historique/edition")
    @Produces({ "application/pdf", "application/vnd.ms-excel", "application/json" })
    public Response historiqueEdition(@QueryParam("format") String format, @QueryParam("du") String du,
            @QueryParam("au") String au, @QueryParam("action") String action, @QueryParam("type") String type,
            @QueryParam("produit") String produit, @QueryParam("utilisateur") String util,
            @QueryParam("promotion") String promotion, @QueryParam("sort") String sort) throws Exception {
        Response r = Droits.refus(servletRequest, "Historique des promotions", DROIT_HISTORIQUE);
        if (r != null) {
            return r;
        }
        String[] t = tri(sort);
        PromotionSuiviService.FiltreHistorique f = filtre(du, au, action, type, produit, util, promotion);
        JSONObject h = service.historique(f, t[0], t[1], 0, 0);
        List<String[]> l = lignes(h.getJSONArray("results"), COL_HISTORIQUE);
        String st = sousTitreHistorique(f) + " — " + h.getLong("total") + " ligne(s)";
        TableauPdf.Edition e = edition("HISTORIQUE DES PROMOTIONS", st);
        e.entetes = entetes(COL_HISTORIQUE, null);
        e.largeurs = largeurs(COL_HISTORIQUE);
        e.droite = droite(COL_HISTORIQUE);
        return "excel".equals(format)
                ? fichier(format, null, classeur("Historique des promotions — " + st, e.entetes, e.droite, l),
                        "historique_promotions")
                : fichier(format, TableauPdf.generer(e, l), null, "historique_promotions");
    }

    private static String sousTitreHistorique(PromotionSuiviService.FiltreHistorique f) {
        StringBuilder s = new StringBuilder();
        s.append(f.du == null && f.au == null ? "Toutes dates"
                : "Du " + (f.du == null ? "début" : fr(f.du)) + " au " + (f.au == null ? "ce jour" : fr(f.au)));
        if (StringUtils.isNotBlank(f.action)) {
            s.append(" ; action : ")
                    .append(rest.service.promotion.JournalPromotion.libelle("ANCIEN".equals(f.action) ? "" : f.action));
        }
        if (StringUtils.isNotBlank(f.type)) {
            s.append(" ; type : ").append(f.type);
        }
        if (StringUtils.isNotBlank(f.produit)) {
            s.append(" ; produit : ").append(f.produit);
        }
        if (f.promotion != null) {
            s.append(" ; promotion n° ").append(f.promotion);
        }
        return s.toString();
    }

    /* ---------------------------------------------------------------- ventes en promotion */

    private Response refusVentes() {
        return Droits.refus(servletRequest, "Promotions", DROIT_PROMOTIONS, DROIT_HISTORIQUE);
    }

    private static JSONObject json(PromotionAnalyse.Ligne l) {
        return new JSONObject().put("date", fr(l.jour) + " " + l.heure).put("jour", l.jour.toString())
                .put("refVente", l.refVente).put("vendeur", l.vendeur).put("cip", l.cip).put("produit", l.produit)
                .put("promotion", l.promotion).put("type", StringUtils.defaultString(l.type))
                .put("mention", l.mention()).put("quantite", l.quantite).put("payees", l.payees())
                .put("offertes", l.offertes).put("prixAvant", l.prixAvant == null ? JSONObject.NULL : l.prixAvant)
                .put("prixVendu", l.prixVendu).put("montant", l.montant).put("remise", l.remise());
    }

    private static JSONObject json(PromotionAnalyse.Groupe g) {
        return new JSONObject().put("cle", g.cle).put("ventes", g.ventes()).put("lignes", g.lignes)
                .put("payees", g.payees).put("offertes", g.offertes).put("montant", g.montant).put("remise", g.remise);
    }

    private static JSONArray json(List<PromotionAnalyse.Groupe> gs) {
        JSONArray a = new JSONArray();
        gs.forEach(g -> a.put(json(g)));
        return a;
    }

    private static String sousTitreVentes(LocalDate du, LocalDate au, String type, String produit, String vendeur,
            JSONArray vendeurs) {
        StringBuilder s = new StringBuilder("Du " + fr(du) + " au " + fr(au));
        if (StringUtils.isNotBlank(type)) {
            s.append(" ; type : ").append(type);
        }
        if (StringUtils.isNotBlank(produit)) {
            s.append(" ; produit : ").append(produit);
        }
        if (StringUtils.isNotBlank(vendeur)) {
            String nom = vendeur;
            for (int i = 0; i < vendeurs.length(); i++) {
                if (vendeur.equals(vendeurs.getJSONObject(i).optString("id"))) {
                    nom = vendeurs.getJSONObject(i).optString("nom");
                }
            }
            s.append(" ; vendeur : ").append(nom);
        }
        return s.toString();
    }

    private LocalDate du(String du) {
        return jour(du, LocalDate.now().withDayOfMonth(1));
    }

    private LocalDate au(String au) {
        return jour(au, LocalDate.now());
    }

    @GET
    @Path("ventes")
    public Response ventes(@QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("type") String type,
            @QueryParam("produit") String produit, @QueryParam("vendeur") String vendeur,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = refusVentes();
        if (r != null) {
            return r;
        }
        List<PromotionAnalyse.Ligne> l = service.ventes(du(du), au(au), type, produit, vendeur);
        JSONArray a = new JSONArray();
        int fin = limit > 0 ? Math.min(l.size(), Math.max(0, start) + limit) : l.size();
        for (int i = Math.max(0, start); i < fin; i++) {
            a.put(json(l.get(i)));
        }
        PromotionAnalyse.Resultat res = PromotionAnalyse.analyser(l);
        return Response
                .ok(new JSONObject().put("total", l.size()).put("results", a).put("totaux", json(res.total)).toString())
                .build();
    }

    @GET
    @Path("ventes/vendeurs")
    public Response vendeurs(@QueryParam("du") String du, @QueryParam("au") String au) {
        Response r = refusVentes();
        return r != null ? r
                : Response.ok(new JSONObject().put("results", service.vendeurs(du(du), au(au))).toString()).build();
    }

    @GET
    @Path("ventes/edition")
    @Produces({ "application/pdf", "application/vnd.ms-excel", "application/json" })
    public Response ventesEdition(@QueryParam("format") String format, @QueryParam("du") String du,
            @QueryParam("au") String au, @QueryParam("type") String type, @QueryParam("produit") String produit,
            @QueryParam("vendeur") String vendeur) throws Exception {
        Response r = refusVentes();
        if (r != null) {
            return r;
        }
        LocalDate d = du(du), a = au(au);
        List<PromotionAnalyse.Ligne> l = service.ventes(d, a, type, produit, vendeur);
        JSONArray arr = new JSONArray();
        l.forEach(x -> arr.put(json(x)));
        List<String[]> lignes = lignes(arr, COL_VENTES);
        PromotionAnalyse.Groupe t = PromotionAnalyse.analyser(l).total;
        lignes.add(new String[] { "TOTAL", t.ventes() + " vente(s)", "", "", "", "", nombre(t.payees + t.offertes),
                nombre(t.payees), nombre(t.offertes), "", "", nombre(t.montant), nombre(t.remise) });
        String st = sousTitreVentes(d, a, type, produit, vendeur, service.vendeurs(d, a));
        TableauPdf.Edition e = edition("VENTES EN PROMOTION", st);
        e.entetes = entetes(COL_VENTES, null);
        e.largeurs = largeurs(COL_VENTES);
        e.droite = droite(COL_VENTES);
        return "excel".equals(format) ? fichier(format, null,
                classeur("Ventes en promotion — " + st, e.entetes, e.droite, lignes), "ventes_promotion")
                : fichier(format, TableauPdf.generer(e, lignes), null, "ventes_promotion");
    }

    /* ---------------------------------------------------------------- analyse */

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("type") String type,
            @QueryParam("produit") String produit, @QueryParam("vendeur") String vendeur) {
        Response r = refusVentes();
        if (r != null) {
            return r;
        }
        PromotionAnalyse.Resultat a = PromotionAnalyse.analyser(service.ventes(du(du), au(au), type, produit, vendeur));
        return Response.ok(new JSONObject().put("total", json(a.total)).put("parType", json(a.parType))
                .put("parPromotion", json(a.parPromotion)).put("parVendeur", json(a.parVendeur))
                .put("parJour", json(a.parJour)).put("top", json(a.top)).toString()).build();
    }

    private static TableauPdf.Section section(String titre, String premier, List<PromotionAnalyse.Groupe> gs,
            Function<String, String> libelle) {
        TableauPdf.Section s = new TableauPdf.Section();
        s.titre = titre;
        s.entetes = entetes(COL_GROUPE, premier);
        s.largeurs = largeurs(COL_GROUPE);
        s.droite = droite(COL_GROUPE);
        JSONArray a = json(gs);
        for (int i = 0; i < a.length(); i++) {
            a.getJSONObject(i).put("cle", libelle.apply(a.getJSONObject(i).getString("cle")));
        }
        s.lignes = lignes(a, COL_GROUPE);
        return s;
    }

    private static String jourFr(String iso) {
        try {
            return fr(LocalDate.parse(iso));
        } catch (RuntimeException e) {
            return iso;
        }
    }

    @GET
    @Path("analyse/edition")
    @Produces({ "application/pdf", "application/vnd.ms-excel", "application/json" })
    public Response analyseEdition(@QueryParam("format") String format, @QueryParam("du") String du,
            @QueryParam("au") String au, @QueryParam("type") String type, @QueryParam("produit") String produit,
            @QueryParam("vendeur") String vendeur) throws Exception {
        Response r = refusVentes();
        if (r != null) {
            return r;
        }
        LocalDate d = du(du), a = au(au);
        PromotionAnalyse.Resultat res = PromotionAnalyse.analyser(service.ventes(d, a, type, produit, vendeur));
        String st = sousTitreVentes(d, a, type, produit, vendeur, service.vendeurs(d, a));
        List<TableauPdf.Section> sections = new ArrayList<>();
        sections.add(section("Total", "Période", java.util.Collections.singletonList(res.total), x -> "Total"));
        sections.add(section("Par type", "Type", res.parType, x -> x));
        sections.add(section("Par promotion", "Promotion", res.parPromotion, x -> x));
        sections.add(section("Les " + PromotionAnalyse.TOP + " produits qui rapportent le plus", "Produit", res.top,
                x -> x));
        sections.add(section("Par vendeur", "Vendeur", res.parVendeur, x -> x));
        sections.add(section("Par jour", "Jour", res.parJour, PromotionSuiviRessource::jourFr));
        if ("excel".equals(format)) {
            List<String[]> l = new ArrayList<>();
            for (TableauPdf.Section s : sections) {
                for (String[] x : s.lignes) {
                    String[] y = new String[x.length + 1];
                    y[0] = s.titre;
                    System.arraycopy(x, 0, y, 1, x.length);
                    l.add(y);
                }
            }
            String[] en = new String[COL_GROUPE.length + 1];
            boolean[] dr = new boolean[COL_GROUPE.length + 1];
            en[0] = "Rubrique";
            en[1] = "Libellé";
            for (int i = 1; i < COL_GROUPE.length; i++) {
                en[i + 1] = COL_GROUPE[i].entete;
                dr[i + 1] = COL_GROUPE[i].nombre;
            }
            return fichier(format, null, classeur("Analyse des promotions — " + st, en, dr, l), "analyse_promotions");
        }
        return fichier(format, TableauPdf.genererSections(edition("ANALYSE DES PROMOTIONS", st), sections), null,
                "analyse_promotions");
    }
}
