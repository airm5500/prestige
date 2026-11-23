package rest;

import dal.TPrivilege;
import dal.TUser;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.excel.ClasseurExcel;
import rest.service.ReglementFournisseurService;
import util.CommonUtils;
import util.Constant;

/**
 * Plan du 19/11, point 16 : onglet « Règlements fournisseurs » de l'état de contrôle des achats (à régler, saisie,
 * historique, relevé Excel et PDF par grossiste, date de départ du suivi).
 */
@Path("v1/reglements-fournisseurs")
@Produces("application/json")
@Consumes("application/json")
public class ReglementFournisseurRessource {

    public static final String P_DATE_DEPART = "P_REGLEMENT_FRS_DATE_DEPART";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ReglementFournisseurService service;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(Constant.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean peutChangerDepart() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(Constant.USER_LIST_PRIVILEGE), P_DATE_DEPART);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response deconnecte() {
        return json(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE));
    }

    @GET
    @Path("depart")
    public Response depart() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return json(service.depart(peutChangerDepart()));
    }

    @POST
    @Path("depart")
    public Response changerDepart(String corps) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        if (!peutChangerDepart()) {
            return json(new JSONObject().put("success", false).put("interdit", true).put("msg",
                    "Vous n'avez pas le droit de changer la date de départ du suivi."));
        }
        return json(service.changerDepart(u,
                new JSONObject(corps == null || corps.isBlank() ? "{}" : corps).optString("date", "")));
    }

    @GET
    @Path("a-regler")
    public Response aRegler(@QueryParam("groupeId") String groupeId) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return json(service.aRegler(groupeId));
    }

    @GET
    @Path("bls")
    public Response bls(@QueryParam("grossisteId") String grossisteId) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return json(service.bls(grossisteId));
    }

    @POST
    @Path("regler")
    public Response regler(String corps) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        return json(service.regler(u, new JSONObject(corps == null || corps.isBlank() ? "{}" : corps)));
    }

    @POST
    @Path("annuler/{id}")
    public Response annuler(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        return json(service.annuler(u, id));
    }

    @GET
    @Path("historique")
    public Response historique(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("grossisteId") String grossisteId, @QueryParam("groupeId") String groupeId) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return json(service.historique(dtStart, dtEnd, grossisteId, groupeId));
    }

    @GET
    @Path("releve")
    public Response releve(@QueryParam("grossisteId") String grossisteId, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return json(service.releve(grossisteId, dtStart, dtEnd));
    }

    /** Une ligne du relevé (BL, règlement ou total), la même dans l'Excel et dans le PDF. */
    public static final class LigneReleve {
        public String nature, date, numero, mode, reference, detail, tranche;
        public Long ttc, regle, restant, montant, age;
    }

    /** Lignes du relevé : BL suivis de la période, total des BL, règlements de la période, total des règlements. */
    public static List<LigneReleve> lignesReleve(JSONObject r) {
        List<LigneReleve> l = new ArrayList<>();
        JSONArray bls = r.getJSONArray("bls");
        for (int i = 0; i < bls.length(); i++) {
            JSONObject b = bls.getJSONObject(i);
            LigneReleve x = new LigneReleve();
            x.nature = "BL";
            x.date = b.optString("date");
            x.numero = b.optString("numero");
            x.ttc = b.optLong("ttc");
            x.regle = b.optLong("regle");
            x.restant = b.optLong("restant");
            x.age = b.optLong("age");
            x.tranche = b.optString("tranche");
            x.detail = b.optString("statut");
            l.add(x);
        }
        JSONObject t = r.getJSONObject("totaux");
        LigneReleve tb = new LigneReleve();
        tb.nature = "TOTAL BL";
        tb.numero = t.optLong("nombreBl") + " BL";
        tb.ttc = t.optLong("ttc");
        tb.regle = t.optLong("regle");
        tb.restant = t.optLong("restant");
        l.add(tb);
        JSONArray rg = r.getJSONArray("reglements");
        for (int i = 0; i < rg.length(); i++) {
            JSONObject g = rg.getJSONObject(i);
            LigneReleve x = new LigneReleve();
            boolean annule = g.optBoolean("annule");
            x.nature = annule ? "RÈGLEMENT ANNULÉ" : "RÈGLEMENT";
            x.date = g.optString("date");
            x.numero = g.optString("reference");
            x.mode = g.optString("libelleMode");
            x.reference = g.optString("referencePaiement");
            x.montant = g.optLong("montant");
            x.detail = "BL : " + g.optString("bls") + (annule ? " · annulé le " + g.optString("annuleLe") : "");
            l.add(x);
        }
        LigneReleve tr = new LigneReleve();
        tr.nature = "TOTAL RÈGLEMENTS";
        tr.montant = t.optLong("reglements");
        tr.detail = "hors règlements annulés";
        l.add(tr);
        return l;
    }

    private static String fichier(JSONObject r, String extension) {
        return "releve_fournisseur_" + r.optString("grossiste").replaceAll("[^A-Za-z0-9]+", "_") + "_"
                + r.optString("du").replace("/", "") + "_" + r.optString("au").replace("/", "") + "." + extension;
    }

    @GET
    @Path("releve/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response releveExcel(@QueryParam("grossisteId") String grossisteId, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) throws IOException {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        JSONObject r = service.releve(grossisteId, dtStart, dtEnd);
        if (!r.optBoolean("success")) {
            return Response.status(Response.Status.BAD_REQUEST).entity(r.optString("msg"))
                    .type("text/plain;charset=UTF-8").build();
        }
        byte[] contenu = new ClasseurExcel<LigneReleve>("Relevé fournisseur")
                .titre("Relevé fournisseur — " + r.optString("grossiste"))
                .critere("Période", "du " + r.optString("du") + " au " + r.optString("au"))
                .critere("Suivi des règlements depuis le " + r.optString("depart")
                        + " (les BL antérieurs sont considérés comme réglés)")
                .texte("Nature", x -> x.nature).texte("Date", x -> x.date).texte("N° BL / règlement", x -> x.numero)
                .nombre("TTC", x -> x.ttc).nombre("Réglé", x -> x.regle).nombre("Reste à payer", x -> x.restant)
                .nombre("Âge (jours)", x -> x.age).texte("Tranche", x -> x.tranche).texte("Mode", x -> x.mode)
                .texte("Référence", x -> x.reference).nombre("Montant du règlement", x -> x.montant)
                .texte("Détail", x -> x.detail).construire(lignesReleve(r));
        return Response.ok(contenu).header("Content-Disposition", "attachment; filename=" + fichier(r, "xlsx")).build();
    }

    private static String nombre(Long v) {
        return v == null ? "" : String.format(java.util.Locale.FRENCH, "%,d", v).replace(' ', ' ').replace(' ', ' ');
    }

    @GET
    @Path("releve/pdf")
    @Produces("application/pdf")
    public Response relevePdf(@QueryParam("grossisteId") String grossisteId, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        JSONObject r = service.releve(grossisteId, dtStart, dtEnd);
        if (!r.optBoolean("success")) {
            return Response.status(Response.Status.BAD_REQUEST).entity(r.optString("msg"))
                    .type("text/plain;charset=UTF-8").build();
        }
        List<String[]> bls = new ArrayList<>(), reglements = new ArrayList<>();
        for (LigneReleve x : lignesReleve(r)) {
            if ("BL".equals(x.nature) || "TOTAL BL".equals(x.nature)) {
                bls.add(new String[] { x.nature, x.date == null ? "" : x.date, x.numero == null ? "" : x.numero,
                        nombre(x.ttc), nombre(x.regle), nombre(x.restant), x.age == null ? "" : String.valueOf(x.age),
                        x.tranche == null ? "" : x.tranche, x.detail == null ? "" : x.detail });
            } else {
                reglements.add(new String[] { x.nature, x.date == null ? "" : x.date, x.numero == null ? "" : x.numero,
                        x.mode == null ? "" : x.mode, x.reference == null ? "" : x.reference, nombre(x.montant),
                        x.detail == null ? "" : x.detail });
            }
        }
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.officine();
        e.titre = "RELEVÉ FOURNISSEUR — " + r.optString("grossiste");
        JSONObject t = r.getJSONObject("totaux");
        e.sousTitre = "Du " + r.optString("du") + " au " + r.optString("au") + " · suivi des règlements depuis le "
                + r.optString("depart") + " · TTC " + nombre(t.optLong("ttc")) + " · réglé "
                + nombre(t.optLong("regle")) + " · reste à payer " + nombre(t.optLong("restant"))
                + " · règlements de la période " + nombre(t.optLong("reglements"));
        e.imprimePar = (u.getStrFIRSTNAME() + " " + u.getStrLASTNAME()).trim();
        rest.report.pdf.TableauPdf.Section sb = new rest.report.pdf.TableauPdf.Section();
        sb.titre = "BL";
        sb.entetes = new String[] { "Nature", "Date", "N° BL", "TTC", "Réglé", "Reste à payer", "Âge (j)", "Tranche",
                "Statut" };
        sb.largeurs = new float[] { 9f, 8f, 12f, 10f, 10f, 10f, 6f, 7f, 12f };
        sb.droite = new boolean[] { false, false, false, true, true, true, true, false, false };
        sb.lignes = bls;
        rest.report.pdf.TableauPdf.Section sr = new rest.report.pdf.TableauPdf.Section();
        sr.titre = "Règlements";
        sr.entetes = new String[] { "Nature", "Date", "Règlement", "Mode", "Référence", "Montant", "Détail" };
        sr.largeurs = new float[] { 12f, 8f, 13f, 9f, 12f, 10f, 30f };
        sr.droite = new boolean[] { false, false, false, false, false, true, false };
        sr.lignes = reglements;
        List<rest.report.pdf.TableauPdf.Section> sections = new ArrayList<>();
        sections.add(sb);
        sections.add(sr);
        return Response.ok(rest.report.pdf.TableauPdf.genererSections(e, sections), "application/pdf")
                .header("Content-Disposition", "inline; filename=" + fichier(r, "pdf")).build();
    }
}
