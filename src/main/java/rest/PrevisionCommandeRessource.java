package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.PrevisionCommandeService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Analyse Suggestion / Commande (plan d'octobre, section 5, lot L12). Lecture seule, sauf le recalcul a la demande.
 * Privilege du menu : P_SM_ANALYSE_COMMANDE.
 */
@Path("v1/analyse-commande")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PrevisionCommandeRessource {

    static final String PRIVILEGE = "P_SM_ANALYSE_COMMANDE";
    /** Un seul calcul a la fois (le calcul de la nuit et un clic, ou deux clics). */
    static final AtomicBoolean EN_COURS = new AtomicBoolean();

    @EJB
    private PrevisionCommandeService service;
    @EJB
    private rest.service.SuggestionService suggestionService;
    @EJB
    private rest.service.InventaireService inventaireService;
    @EJB
    private rest.service.utils.ReportExcelExportService excel;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private String emplacement() {
        TUser u = utilisateur();
        return u == null || u.getLgEMPLACEMENTID() == null ? "1" : u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    private static Response reponse(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response refus(String message) {
        return reponse(new JSONObject().put("success", false).put("msg", message).put("message", message));
    }

    @SuppressWarnings("unchecked")
    private Response controle() {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                PRIVILEGE) ? null : refus("Vous n'avez pas accès à l'analyse des commandes.");
    }

    @SuppressWarnings("unchecked")
    private boolean a(String privilege) {
        return CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                privilege);
    }

    /**
     * Retours du 10/10 : parametres de calcul lus par l'onglet Tableau des previsions (ecran=PREVISIONS) ou par
     * l'onglet Risque de rupture (ecran=RISQUE) ; « modifiable » dit si l'utilisateur peut les changer.
     */
    @GET
    @Path("parametres")
    public Response parametres(@QueryParam("ecran") String ecran) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!a(PRIVILEGE) && !a("P_CEC_RISQUE_RUPTURE")) {
            return refus("Vous n'avez pas accès aux paramètres des prévisions.");
        }
        String e = ecran == null ? "" : ecran.trim().toUpperCase();
        return reponse(service.parametres(e).put("modifiable", a(PRIVILEGE_PARAMETRER)));
    }

    static final String PRIVILEGE_PARAMETRER = "P_PREVISION_PARAMETRER";

    @POST
    @Path("parametres")
    public Response enregistrerParametres(String corps) {
        if (utilisateur() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!a(PRIVILEGE_PARAMETRER)) {
            return refus("Vous n'avez pas le droit de modifier les paramètres de calcul.");
        }
        JSONObject valeurs;
        try {
            valeurs = new JSONObject(corps == null || corps.trim().isEmpty() ? "{}" : corps);
        } catch (RuntimeException ex) {
            return refus("Valeurs illisibles.");
        }
        return reponse(service.enregistrerParametres(valeurs));
    }

    @GET
    @Path("tableau")
    public Response tableau() {
        Response r = controle();
        return r != null ? r : reponse(service.tableau(emplacement()));
    }

    @GET
    @Path("previsions")
    public Response previsions(@QueryParam("filtre") String filtre, @QueryParam("query") String query,
            @QueryParam("methode") String methode, @QueryParam("equivalent") String equivalent,
            @QueryParam("stock") String stock, @QueryParam("start") String start, @QueryParam("limit") String limit) {
        Response r = controle();
        return r != null ? r : reponse(service.previsions(emplacement(),
                criteres(filtre, query, methode, equivalent, stock), nombre(start, 0), nombre(limit, 25)));
    }

    static java.util.Map<String, String> criteres(String filtre, String query, String methode, String equivalent,
            String stock) {
        java.util.Map<String, String> c = new java.util.HashMap<>();
        c.put("filtre", filtre);
        c.put("query", query);
        c.put("methode", methode);
        c.put("equivalent", equivalent);
        c.put("stock", stock);
        return c;
    }

    private static java.util.Map<String, String> criteres(JSONObject o) {
        JSONObject c = o == null ? new JSONObject() : o;
        return criteres(c.optString("filtre", ""), c.optString("query", ""), c.optString("methode", ""),
                c.optString("equivalent", ""), c.optString("stock", ""));
    }

    private static final String[] ENTETES = { "CIP", "Désignation", "Grossiste", "Méthode", "Fiabilité %",
            "Ventes 12 mois", "Prévu / mois", "Stock", "En cours", "Équivalents", "Couverture (j)", "Délai (j)",
            "Recommandé", "PAF", "Valeur" };
    private static final java.util.Map<String, String> METHODES = new java.util.HashMap<>();
    static {
        METHODES.put("MOYENNE", "Moyenne 3 mois");
        METHODES.put("SAISON", "Saisonnière");
        METHODES.put("HOLT", "Tendance (Holt)");
        METHODES.put("HOLT_WINTERS", "Tendance + saison");
    }

    static String[] valeurs(JSONObject l) {
        Object couverture = l.opt("couverture");
        return new String[] { l.optString("cip"), l.optString("nom"), l.optString("grossiste"),
                METHODES.getOrDefault(l.optString("methode"), l.optString("methode")),
                String.valueOf(l.optInt("fiabilite")), String.valueOf(l.optInt("ventes12")),
                String.valueOf(l.optDouble("prevuMois", 0)).replace('.', ','), String.valueOf(l.optInt("stock")),
                String.valueOf(l.optInt("enCours")), String.valueOf(l.optInt("equivalents")),
                couverture == null || JSONObject.NULL.equals(couverture) ? "" : String.valueOf(couverture),
                String.valueOf(l.optInt("delai")), String.valueOf(l.optInt("recommande")),
                String.valueOf(l.optInt("paf")), String.valueOf(l.optLong("valeur")) };
    }

    private static String libelleCriteres(java.util.Map<String, String> c) {
        StringBuilder s = new StringBuilder();
        java.util.function.BiConsumer<String, String> ajout = (l, v) -> {
            if (v != null && !v.trim().isEmpty()) {
                s.append(s.length() == 0 ? "" : " · ").append(l).append(" : ").append(v.trim());
            }
        };
        ajout.accept("Filtre", c.get("filtre"));
        ajout.accept("Méthode", METHODES.getOrDefault(String.valueOf(c.get("methode")), c.get("methode")));
        ajout.accept("Équivalent", "1".equals(c.get("equivalent")) ? "en stock" : null);
        ajout.accept("Stock", c.get("stock"));
        ajout.accept("Recherche", c.get("query"));
        return s.length() == 0 ? "Tous les produits suivis" : s.toString();
    }

    private static String horodatage() {
        return java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd_MM_yyyy_HH_mm"));
    }

    /** Retours du 10/10 : export Excel de la liste filtree (toutes pages). */
    @GET
    @Path("previsions/excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("filtre") String filtre, @QueryParam("query") String query,
            @QueryParam("methode") String methode, @QueryParam("equivalent") String equivalent,
            @QueryParam("stock") String stock) throws java.io.IOException {
        if (controle() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        List<JSONObject> lignes = service.toutes(emplacement(), criteres(filtre, query, methode, equivalent, stock));
        byte[] data = excel.createExcelReport("Prévisions", ENTETES, lignes, (row, l) -> {
            String[] v = valeurs(l);
            for (int i = 0; i < v.length; i++) {
                if (i >= 4 && i != 10 && !v[i].isEmpty()) {
                    row.createCell(i).setCellValue(Double.parseDouble(v[i].replace(',', '.')));
                } else {
                    row.createCell(i).setCellValue(v[i]);
                }
            }
        });
        return Response.ok(data, "application/vnd.ms-excel")
                .header("content-disposition", "attachment; filename=previsions_" + horodatage() + ".xls").build();
    }

    /** Retours du 10/10 : edition PDF de la liste filtree (toutes pages). */
    @GET
    @Path("previsions/pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("filtre") String filtre, @QueryParam("query") String query,
            @QueryParam("methode") String methode, @QueryParam("equivalent") String equivalent,
            @QueryParam("stock") String stock) {
        if (controle() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        java.util.Map<String, String> c = criteres(filtre, query, methode, equivalent, stock);
        List<String[]> lignes = new java.util.ArrayList<>();
        for (JSONObject l : service.toutes(emplacement(), c)) {
            lignes.add(valeurs(l));
        }
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.officine();
        e.titre = "PRÉVISIONS VENTE / ACHAT — " + lignes.size() + " PRODUIT(S)";
        e.sousTitre = libelleCriteres(c);
        TUser u = utilisateur();
        e.imprimePar = u == null ? "" : (u.getStrFIRSTNAME() + " " + u.getStrLASTNAME()).trim();
        e.entetes = ENTETES;
        e.largeurs = new float[] { 5f, 17f, 8f, 7f, 4f, 4.5f, 4.5f, 4f, 4f, 4.5f, 4.5f, 3.5f, 5f, 4.5f, 5.5f };
        e.droite = new boolean[] { false, false, false, false, true, true, true, true, true, true, true, true, true,
                true, true };
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=previsions_" + horodatage() + ".pdf").build();
    }

    /**
     * Retours du 10/10 : inventaire des produits coches (ids) ou, a defaut, de toute la liste filtree.
     */
    @POST
    @Path("previsions/inventaire")
    public Response inventaire(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject in = new JSONObject(corps == null || corps.trim().isEmpty() ? "{}" : corps);
        java.util.Set<String> ids = new java.util.LinkedHashSet<>();
        org.json.JSONArray coches = in.optJSONArray("ids");
        if (coches != null && coches.length() > 0) {
            for (int i = 0; i < coches.length(); i++) {
                ids.add(coches.getString(i));
            }
        } else {
            for (JSONObject l : service.toutes(emplacement(), criteres(in.optJSONObject("criteres")))) {
                ids.add(l.getString("id"));
            }
        }
        if (ids.isEmpty()) {
            return refus("Aucun produit à inventorier.");
        }
        String nom = in.optString("nom", "").trim();
        if (nom.isEmpty()) {
            nom = "Prévisions "
                    + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        nom = nom.length() > 100 ? nom.substring(0, 100) : nom;
        int n = inventaireService.create(ids, nom, nom);
        return reponse(new JSONObject().put("success", n > 0).put("count", n).put("nom", nom).put("msg",
                n > 0 ? "" : "L'inventaire n'a pas pu être créé."));
    }

    /**
     * Retours du 10/10 (Q3) : une suggestion par grossiste habituel a partir de TOUTE la liste filtree ; quantite =
     * recommande ; lignes a 0 exclues ; produits retires (ids) exclus ; produits sans grossiste rendus a part.
     */
    @POST
    @Path("previsions/suggestion")
    public Response genererSuggestion(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject in = new JSONObject(corps == null || corps.trim().isEmpty() ? "{}" : corps);
        java.util.Set<String> retires = new java.util.HashSet<>();
        org.json.JSONArray ret = in.optJSONArray("retires");
        for (int i = 0; ret != null && i < ret.length(); i++) {
            retires.add(ret.getString(i));
        }
        java.util.Map<String, Long> quantites = new java.util.LinkedHashMap<>();
        org.json.JSONArray sansGrossiste = new org.json.JSONArray();
        int aZero = 0;
        for (JSONObject l : service.toutes(emplacement(), criteres(in.optJSONObject("criteres")))) {
            if (retires.contains(l.getString("id"))) {
                continue;
            }
            int q = l.optInt("recommande");
            if (q <= 0) {
                aZero++;
                continue;
            }
            if (l.optString("grossiste", "").isEmpty()) {
                sansGrossiste.put(l.optString("nom") + " (" + l.optString("cip") + ")");
                continue;
            }
            quantites.put(l.getString("id"), (long) q);
        }
        if (quantites.isEmpty()) {
            return reponse(new JSONObject().put("success", false).put("count", 0).put("aZero", aZero)
                    .put("sansGrossiste", sansGrossiste)
                    .put("msg", "Aucun produit à commander dans cette liste (quantité recommandée à 0)."));
        }
        JSONObject o = suggestionService.makeSuggestionDepuisGarde(quantites, utilisateur(), "Prévisions du "
                + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        return reponse(o.put("aZero", aZero).put("retires", retires.size()).put("sansGrossiste", sansGrossiste));
    }

    @GET
    @Path("produit/{id}")
    public Response produit(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : reponse(service.produit(emplacement(), id));
    }

    /** Retours du 10/10 : equivalents d'un produit (directs et a adapter), stock rayon et reserve. */
    @GET
    @Path("equivalents/{id}")
    public Response equivalents(@PathParam("id") String id) {
        Response r = controle();
        return r != null ? r : reponse(service.equivalents(emplacement(), id));
    }

    @GET
    @Path("a-analyser")
    public Response aAnalyser() {
        Response r = controle();
        return r != null ? r : reponse(service.aAnalyser(emplacement()));
    }

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("type") String type, @QueryParam("id") String id) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        if (id == null || id.trim().isEmpty()) {
            return refus("Choisissez une suggestion ou une commande.");
        }
        return reponse(service.analyser(emplacement(), type == null ? "" : type.trim().toUpperCase(), id.trim()));
    }

    private static final String[] ENTETES_ANALYSE = { "CIP", "Désignation", "Proposé", "Recommandé", "Écart",
            "Prévu / mois", "Stock", "En cours", "Couverture (j)", "Prix", "Dernier prix", "Alertes" };

    private static String[] valeursAnalyse(JSONObject l) {
        StringBuilder al = new StringBuilder();
        org.json.JSONArray a = l.optJSONArray("alertes");
        for (int i = 0; a != null && i < a.length(); i++) {
            al.append(al.length() == 0 ? "" : " ; ").append(a.getJSONObject(i).optString("texte"));
        }
        Object couverture = l.opt("couverture");
        return new String[] { l.optString("cip"), l.optString("nom"), String.valueOf(l.optInt("quantite")),
                String.valueOf(l.optInt("recommande")), String.valueOf(l.optInt("ecart")),
                String.valueOf(l.optDouble("prevuMois", 0)).replace('.', ','), String.valueOf(l.optInt("stock")),
                String.valueOf(l.optInt("enCours")),
                couverture == null || JSONObject.NULL.equals(couverture) ? "" : String.valueOf(couverture),
                String.valueOf(l.optInt("prix")), String.valueOf(l.optInt("dernierPrix")), al.toString() };
    }

    private List<JSONObject> lignesAnalyse(JSONObject a) {
        List<JSONObject> l = new java.util.ArrayList<>();
        org.json.JSONArray d = a.optJSONArray("data");
        for (int i = 0; d != null && i < d.length(); i++) {
            l.add(d.getJSONObject(i));
        }
        return l;
    }

    /** Retours du 10/10 : analyse d'une suggestion / commande en Excel. */
    @GET
    @Path("analyse/excel")
    @Produces("application/vnd.ms-excel")
    public Response analyseExcel(@QueryParam("type") String type, @QueryParam("id") String id)
            throws java.io.IOException {
        if (controle() != null || id == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        JSONObject a = service.analyser(emplacement(), type == null ? "" : type.trim().toUpperCase(), id.trim());
        byte[] data = excel.createExcelReport("Analyse " + a.optString("ref", ""), ENTETES_ANALYSE, lignesAnalyse(a),
                (row, l) -> {
                    String[] v = valeursAnalyse(l);
                    for (int i = 0; i < v.length; i++) {
                        if (i >= 2 && i <= 10 && !v[i].isEmpty()) {
                            row.createCell(i).setCellValue(Double.parseDouble(v[i].replace(',', '.')));
                        } else {
                            row.createCell(i).setCellValue(v[i]);
                        }
                    }
                });
        return Response.ok(data, "application/vnd.ms-excel")
                .header("content-disposition", "attachment; filename=analyse_" + horodatage() + ".xls").build();
    }

    /** Retours du 10/10 : analyse d'une suggestion / commande en PDF. */
    @GET
    @Path("analyse/pdf")
    @Produces("application/pdf")
    public Response analysePdf(@QueryParam("type") String type, @QueryParam("id") String id) {
        if (controle() != null || id == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        String t = type == null ? "" : type.trim().toUpperCase();
        JSONObject a = service.analyser(emplacement(), t, id.trim());
        List<String[]> lignes = new java.util.ArrayList<>();
        for (JSONObject l : lignesAnalyse(a)) {
            lignes.add(valeursAnalyse(l));
        }
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.officine();
        e.titre = "ANALYSE " + ("COMMANDE".equals(t) ? "DE LA COMMANDE " : "DE LA SUGGESTION ") + a.optString("ref", "")
                + " — " + a.optString("grossiste", "");
        JSONObject r = a.optJSONObject("resume");
        e.sousTitre = r == null ? ""
                : r.optInt("lignes") + " ligne(s), " + r.optInt("lignesAlerte") + " avec alerte · valeur proposée "
                        + r.optLong("valeurProposee") + " F, recommandée " + r.optLong("valeurRecommandee") + " F";
        TUser u = utilisateur();
        e.imprimePar = u == null ? "" : (u.getStrFIRSTNAME() + " " + u.getStrLASTNAME()).trim();
        e.entetes = ENTETES_ANALYSE;
        e.largeurs = new float[] { 5f, 17f, 4.5f, 5f, 4f, 4.5f, 4f, 4f, 5f, 4.5f, 5f, 20f };
        e.droite = new boolean[] { false, false, true, true, true, true, true, true, true, true, true, false };
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=analyse_" + horodatage() + ".pdf").build();
    }

    /** Retours du 10/10 (Q4) : quantites recommandees appliquees a la suggestion ou a la commande choisie. */
    @POST
    @Path("analyse/appliquer")
    public Response appliquer(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject in = new JSONObject(corps == null || corps.trim().isEmpty() ? "{}" : corps);
        String id = in.optString("id", "").trim();
        if (id.isEmpty()) {
            return refus("Choisissez une suggestion ou une commande.");
        }
        return reponse(service.appliquerRecommande(emplacement(), in.optString("type", "").trim().toUpperCase(), id,
                utilisateur()));
    }

    @POST
    @Path("recalculer")
    public Response recalculer() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        if (!EN_COURS.compareAndSet(false, true)) {
            return refus("Un calcul est déjà en cours, patientez quelques instants.");
        }
        try {
            return reponse(service.recalculer(emplacement(), "DEMANDE"));
        } finally {
            EN_COURS.set(false);
        }
    }

    /** Un nombre saisi (pagination) : illisible ou absent, la valeur par defaut. */
    static int nombre(String v, int defaut) {
        try {
            return v == null || v.trim().isEmpty() ? defaut : Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            return defaut;
        }
    }
}
