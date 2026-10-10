package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.FideliteService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Retours du 09/10 (6) : fidelite clients. Consultation (P_SM_FIDELITE), utilisation et ajustement des points
 * (P_FIDELITE_UTILISER), parametrage (P_FIDELITE_PARAMETRER). Modifications directement dans l'ecran.
 */
@Path("v1/fidelite")
@Produces("application/json")
public class FideliteRessource {

    static final String P_SM_FIDELITE = "P_SM_FIDELITE", P_FIDELITE_UTILISER = "P_FIDELITE_UTILISER",
            P_FIDELITE_PARAMETRER = "P_FIDELITE_PARAMETRER";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private FideliteService service;
    @EJB
    private rest.service.utils.ReportExcelExportService excel;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean droit(String nom) {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), nom);
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    /** null si l'acces est permis, sinon la reponse de refus. */
    private JSONObject refus(String... droits) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        for (String d : droits) {
            if (!droit(d)) {
                return echec("Vous n'avez pas le droit d'effectuer cette opération (fidélité).").put("interdit", true);
            }
        }
        return null;
    }

    private static JSONObject corps(String body) {
        try {
            return new JSONObject(StringUtils.defaultIfBlank(body, "{}"));
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }

    @GET
    @Path("droits")
    public Response droits() {
        JSONObject r = refus(P_SM_FIDELITE);
        if (r != null) {
            return json(r);
        }
        return json(new JSONObject().put("success", true).put("utiliser", droit(P_FIDELITE_UTILISER)).put("parametrer",
                droit(P_FIDELITE_PARAMETRER)));
    }

    /**
     * Caisse : points du client de la vente et montant payable avec (mode « Points fidelite »). Ouvert a tout
     * utilisateur connecte (le caissier n'a pas forcement l'ecran Fidelite) ; ne donne que le solde de ce client.
     */
    @GET
    @Path("paiement")
    public Response paiement(@QueryParam("client") String client) {
        if (utilisateur() == null) {
            return json(echec(Constant.DECONNECTED_MESSAGE));
        }
        if (StringUtils.isBlank(client)) {
            return json(echec("Choisissez d'abord le client de la vente."));
        }
        return json(service.pourPaiement(client.trim()));
    }

    @GET
    @Path("parametres")
    public Response parametres() {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.lireParametres());
    }

    @PUT
    @Path("parametres")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerParametres(String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.enregistrerParametres(corps(body), utilisateur().getLgUSERID()));
    }

    @PUT
    @Path("palier")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response palier(String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.enregistrerPalier(corps(body)));
    }

    @DELETE
    @Path("palier/{id}")
    public Response supprimerPalier(@PathParam("id") String id) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.supprimerPalier(id));
    }

    @PUT
    @Path("exclusion/{categorie}")
    public Response exclusion(@PathParam("categorie") String categorie, @QueryParam("exclue") boolean exclue) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.exclure(categorie, exclue));
    }

    /** Met le registre des points a jour (ventes cloturees, annulations, expirations). */
    @POST
    @Path("synchroniser")
    public Response synchroniser() {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.synchroniser());
    }

    @GET
    @Path("synthese")
    public Response synthese() {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.synthese());
    }

    @GET
    @Path("clients")
    public Response clients(@QueryParam("query") String query, @QueryParam("start") int start,
            @QueryParam("limit") int limit) {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.clients(query, start, limit <= 0 ? 50 : limit));
    }

    @GET
    @Path("client/{id}/historique")
    public Response historique(@PathParam("id") String id) {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.historique(id));
    }

    @GET
    @Path("client/{id}")
    public Response compte(@PathParam("id") String id) {
        JSONObject r = refus(P_SM_FIDELITE);
        return json(r != null ? r : service.compte(id));
    }

    @POST
    @Path("client/{id}/utiliser")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response utiliser(@PathParam("id") String id, String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_UTILISER);
        if (r != null) {
            return json(r);
        }
        JSONObject o = corps(body);
        service.synchroniser();
        return json(service.utiliser(id, o.optInt("points", 0), o.optString("reference", null),
                utilisateur().getLgUSERID()));
    }

    @POST
    @Path("client/{id}/ajuster")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response ajuster(@PathParam("id") String id, String body) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_UTILISER);
        if (r != null) {
            return json(r);
        }
        JSONObject o = corps(body);
        return json(service.ajuster(id, o.optInt("points", 0), o.optString("motif", ""), utilisateur().getLgUSERID()));
    }

    /* ------------------------------------------------------------ retours du 10/10 (section 15) */

    /** Exclusions par familles OU par emplacements (jamais les deux). */
    @PUT
    @Path("mode-exclusion")
    public Response modeExclusion(@QueryParam("mode") String mode) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.changerModeExclusion(mode, utilisateur().getLgUSERID()));
    }

    @PUT
    @Path("exclusion-emplacement/{zone}")
    public Response exclusionEmplacement(@PathParam("zone") String zone, @QueryParam("exclue") boolean exclue) {
        JSONObject r = refus(P_SM_FIDELITE, P_FIDELITE_PARAMETRER);
        return json(r != null ? r : service.exclureEmplacement(zone, exclue));
    }

    private static java.time.LocalDate date(String v) {
        try {
            return StringUtils.isBlank(v) ? null : java.time.LocalDate.parse(v.trim().substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static final java.time.format.DateTimeFormatter JJ = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy");

    /** Periode de l'analyse : par defaut les 12 derniers mois (du 1er du mois, il y a 11 mois, a aujourd'hui). */
    private static java.time.LocalDate[] periode(String du, String au) {
        java.time.LocalDate fin = date(au) == null ? java.time.LocalDate.now() : date(au);
        java.time.LocalDate debut = date(du) == null ? fin.minusMonths(11).withDayOfMonth(1) : date(du);
        return new java.time.LocalDate[] { debut, fin };
    }

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("dtStart") String du, @QueryParam("dtEnd") String au,
            @QueryParam("meilleurs") Integer meilleurs) {
        JSONObject r = refus(P_SM_FIDELITE);
        if (r != null) {
            return json(r);
        }
        java.time.LocalDate[] p = periode(du, au);
        if (p[0].isAfter(p[1])) {
            return json(echec("La date de début doit précéder la date de fin."));
        }
        return json(service.analyse(p[0], p[1], meilleurs == null || meilleurs <= 0 ? 10 : Math.min(meilleurs, 100)));
    }

    private static String nb(long v) {
        return String.format(java.util.Locale.FRANCE, "%,d", v).replace(' ', ' ').replace(' ', ' ');
    }

    private String imprimePar() {
        TUser u = utilisateur();
        return (StringUtils.defaultString(u.getStrFIRSTNAME()) + " " + StringUtils.defaultString(u.getStrLASTNAME()))
                .trim();
    }

    /** PDF ou Excel d'un tableau ; les colonnes « droite » sont des nombres dans Excel. */
    private Response edition(String format, String titre, String sousTitre, String[] entetes, float[] largeurs,
            boolean[] droite, List<String[]> lignes, String fichier) throws java.io.IOException {
        if ("excel".equals(format)) {
            byte[] b = excel.createExcelReport(titre + (sousTitre.isEmpty() ? "" : " — " + sousTitre), entetes, lignes,
                    (row, l) -> {
                        for (int i = 0; i < entetes.length; i++) {
                            String v = i < l.length && l[i] != null ? l[i] : "";
                            String n = v.replace(" ", "").replace(",", ".");
                            if (droite[i] && n.matches("-?\\d+(\\.\\d+)?")) {
                                row.createCell(i).setCellValue(Double.parseDouble(n));
                            } else {
                                row.createCell(i).setCellValue(v);
                            }
                        }
                    });
            return Response.ok(b, "application/vnd.ms-excel")
                    .header("Content-Disposition", "attachment; filename=\"" + fichier + ".xls\"").build();
        }
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.nomOfficine();
        e.titre = titre;
        e.sousTitre = sousTitre;
        e.imprimePar = imprimePar();
        e.entetes = entetes;
        e.largeurs = largeurs;
        e.droite = droite;
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=" + fichier + ".pdf").build();
    }

    private Response refusEdition(JSONObject r) {
        return Response.status(Response.Status.FORBIDDEN).type(MediaType.APPLICATION_JSON).entity(r.toString()).build();
    }

    private static boolean formatValide(String f) {
        return "pdf".equals(f) || "excel".equals(f);
    }

    /** Clients et leurs points (meme recherche que l'ecran). */
    @GET
    @Path("clients/{format}")
    @Produces({ "application/pdf", "application/vnd.ms-excel", "application/json" })
    public Response editionClients(@PathParam("format") String format, @QueryParam("query") String query)
            throws java.io.IOException {
        JSONObject r = refus(P_SM_FIDELITE);
        if (r != null || !formatValide(format)) {
            return refusEdition(r != null ? r : echec("Format inconnu."));
        }
        org.json.JSONArray d = service.clientsEdition(query).getJSONArray("data");
        List<String[]> lignes = new java.util.ArrayList<>();
        long points = 0, valeur = 0;
        for (int i = 0; i < d.length(); i++) {
            JSONObject c = d.getJSONObject(i);
            points += c.optLong("solde");
            valeur += c.optLong("valeur");
            lignes.add(new String[] { c.optString("nom"), c.optString("telephone"), nb(c.optLong("solde")),
                    nb(c.optLong("valeur")), c.optString("palier"), nb(c.optLong("acquis12Mois")),
                    nb(c.optLong("expireBientot")), c.optString("derniereOperation") });
        }
        String st = (StringUtils.isBlank(query) ? "Clients ayant des points" : "Recherche « " + query.trim() + " »")
                + " · " + lignes.size() + " client(s) · " + nb(points) + " points · " + nb(valeur) + " FCFA";
        return edition(format, "POINTS FIDÉLITÉ — CLIENTS", st,
                new String[] { "Client", "Téléphone", "Points", "Valeur (FCFA)", "Palier", "Acquis sur 12 mois",
                        "Expirent sous 30 j", "Dernière opération" },
                new float[] { 22f, 11f, 8f, 10f, 10f, 11f, 11f, 13f },
                new boolean[] { false, false, true, true, false, true, true, false }, lignes,
                "points_fidelite_clients");
    }

    private static final java.util.Map<String, String> OPERATIONS = java.util.Map.of("GAIN", "Points gagnés",
            "ANNULATION", "Annulation (vente annulée)", "EXPIRATION", "Points expirés", "UTILISATION",
            "Points utilisés", "AJUSTEMENT", "Ajustement", "RESTITUTION", "Restitution (paiement annulé)");

    /** Historique des points d'un client. */
    @GET
    @Path("client/{id}/historique/{format}")
    @Produces({ "application/pdf", "application/vnd.ms-excel", "application/json" })
    public Response editionHistorique(@PathParam("id") String id, @PathParam("format") String format)
            throws java.io.IOException {
        JSONObject r = refus(P_SM_FIDELITE);
        if (r != null || !formatValide(format)) {
            return refusEdition(r != null ? r : echec("Format inconnu."));
        }
        JSONObject h = service.historique(id);
        org.json.JSONArray d = h.getJSONArray("data");
        List<String[]> lignes = new java.util.ArrayList<>();
        for (int i = 0; i < d.length(); i++) {
            JSONObject m = d.getJSONObject(i);
            lignes.add(new String[] { m.optString("date"),
                    OPERATIONS.getOrDefault(m.optString("type"), m.optString("type")), nb(m.optLong("points")),
                    m.optString("reference"), m.optString("motif"), m.optString("expiration"), m.optString("par") });
        }
        String nom = service.nomClient(id);
        return edition(format, "POINTS FIDÉLITÉ — HISTORIQUE" + (nom.isEmpty() ? "" : " DE " + nom.toUpperCase()),
                "Solde : " + nb(h.optLong("solde")) + " points · " + lignes.size() + " opération(s)",
                new String[] { "Date", "Opération", "Points", "Référence", "Détail", "Expire le", "Par" },
                new float[] { 11f, 16f, 7f, 12f, 28f, 9f, 14f },
                new boolean[] { false, false, true, false, false, false, false }, lignes, "points_fidelite_historique");
    }

    /** Analyse : par mois, repartition par palier, meilleurs clients (PDF en sections, Excel en un tableau). */
    @GET
    @Path("analyse/{format}")
    @Produces({ "application/pdf", "application/vnd.ms-excel", "application/json" })
    public Response editionAnalyse(@PathParam("format") String format, @QueryParam("dtStart") String du,
            @QueryParam("dtEnd") String au) throws java.io.IOException {
        JSONObject r = refus(P_SM_FIDELITE);
        if (r != null || !formatValide(format)) {
            return refusEdition(r != null ? r : echec("Format inconnu."));
        }
        java.time.LocalDate[] p = periode(du, au);
        if (p[0].isAfter(p[1])) {
            return refusEdition(echec("La date de début doit précéder la date de fin."));
        }
        JSONObject a = service.analyse(p[0], p[1], 20), t = a.getJSONObject("total");
        String st = "Du " + p[0].format(JJ) + " au " + p[1].format(JJ) + " · " + t.optInt("clientsActifs")
                + " client(s) actif(s) · " + nb(t.optLong("gagnes")) + " points gagnés · " + nb(t.optLong("utilises"))
                + " utilisés (" + String.valueOf(t.optDouble("tauxUtilisation")).replace('.', ',') + " %) · "
                + nb(t.optLong("expires")) + " expirés · coût " + nb(t.optLong("cout")) + " FCFA";
        List<String[]> mois = new java.util.ArrayList<>(), paliers = new java.util.ArrayList<>(),
                meilleurs = new java.util.ArrayList<>();
        org.json.JSONArray m = a.getJSONArray("mois");
        for (int i = 0; i < m.length(); i++) {
            JSONObject x = m.getJSONObject(i);
            mois.add(new String[] { x.getString("mois"), nb(x.optLong("gagnes")), nb(x.optLong("annules")),
                    nb(x.optLong("utilises")), nb(x.optLong("expires")), nb(x.optLong("ajustements")),
                    nb(x.optLong("cout")), String.valueOf(x.optDouble("tauxUtilisation")).replace('.', ',') });
        }
        org.json.JSONArray pa = a.getJSONArray("paliers");
        for (int i = 0; i < pa.length(); i++) {
            JSONObject x = pa.getJSONObject(i);
            paliers.add(new String[] { x.getString("palier"), nb(x.optLong("clients")),
                    String.valueOf(x.optDouble("part")).replace('.', ',') });
        }
        org.json.JSONArray b = a.getJSONArray("meilleurs");
        for (int i = 0; i < b.length(); i++) {
            JSONObject x = b.getJSONObject(i);
            meilleurs.add(new String[] { String.valueOf(i + 1), x.optString("nom"), x.optString("palier"),
                    nb(x.optLong("gagnes")), nb(x.optLong("utilises")), nb(x.optLong("solde")) });
        }
        if ("excel".equals(format)) {
            List<String[]> lignes = new java.util.ArrayList<>();
            mois.forEach(
                    x -> lignes.add(new String[] { "Mois", x[0], "", x[1], x[2], x[3], x[4], x[5], x[6], x[7], "" }));
            paliers.forEach(x -> lignes.add(new String[] { "Palier", x[0], x[1], "", "", "", "", "", "", "", "" }));
            meilleurs.forEach(x -> lignes.add(new String[] { "Meilleur client",
                    x[1] + (x[2].isEmpty() ? "" : " (" + x[2] + ")"), "", x[3], "", x[4], "", "", "", "", x[5] }));
            return edition(format, "POINTS FIDÉLITÉ — ANALYSE", st,
                    new String[] { "Rubrique", "Libellé", "Clients", "Gagnés", "Annulés", "Utilisés", "Expirés",
                            "Ajustements", "Coût (FCFA)", "Taux d'utilisation (%)", "Solde" },
                    null, new boolean[] { false, false, true, true, true, true, true, true, true, true, true }, lignes,
                    "points_fidelite_analyse");
        }
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.nomOfficine();
        e.titre = "POINTS FIDÉLITÉ — ANALYSE";
        e.sousTitre = st;
        e.imprimePar = imprimePar();
        rest.report.pdf.TableauPdf.Section s1 = new rest.report.pdf.TableauPdf.Section();
        s1.titre = "Par mois";
        s1.entetes = new String[] { "Mois", "Gagnés", "Annulés", "Utilisés", "Expirés", "Ajustements", "Coût (FCFA)",
                "Taux d'utilisation (%)" };
        s1.droite = new boolean[] { false, true, true, true, true, true, true, true };
        s1.lignes = mois;
        rest.report.pdf.TableauPdf.Section s2 = new rest.report.pdf.TableauPdf.Section();
        s2.titre = "Clients actifs par palier";
        s2.entetes = new String[] { "Palier", "Clients", "Part (%)" };
        s2.droite = new boolean[] { false, true, true };
        s2.lignes = paliers;
        rest.report.pdf.TableauPdf.Section s3 = new rest.report.pdf.TableauPdf.Section();
        s3.titre = "Meilleurs clients (points gagnés sur la période)";
        s3.entetes = new String[] { "#", "Client", "Palier", "Gagnés", "Utilisés", "Solde" };
        s3.largeurs = new float[] { 4f, 36f, 14f, 10f, 10f, 10f };
        s3.droite = new boolean[] { true, false, false, true, true, true };
        s3.lignes = meilleurs;
        return Response
                .ok(rest.report.pdf.TableauPdf.genererSections(e, java.util.Arrays.asList(s1, s2, s3)),
                        "application/pdf")
                .header("Content-Disposition", "inline; filename=points_fidelite_analyse.pdf").build();
    }
}
