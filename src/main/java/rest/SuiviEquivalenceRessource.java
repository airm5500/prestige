package rest;

import commonTasks.dto.SuiviEquivalenceLigneDTO;
import dal.TUser;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.report.excel.ClasseurExcel;
import rest.service.SuiviEquivalenceService;
import rest.service.impl.SuiviEquivalence;
import util.Constant;

/**
 * Analyse article, onglet « Suivi équivalence » (plan d'octobre, section 9) : produits regroupes par ensemble exact de
 * DCI, du plus vendu au moins vendu sur la periode, avec le repere des doublons peu vendus. Lecture seule ; exports
 * Excel et PDF (rendu dans l'onglet).
 *
 * <p>
 * La pagination porte sur les GROUPES (un groupe n'est jamais coupe entre deux pages) : start / limit et total comptent
 * des groupes.
 */
@Path("v1/suivi-equivalence")
@Produces(MediaType.APPLICATION_JSON)
public class SuiviEquivalenceRessource {

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @EJB
    private SuiviEquivalenceService suiviEquivalenceService;
    @EJB
    private ReportUtil reportUtil;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static SuiviEquivalence.Criteres criteres(String dci, int minProduits, boolean stockPositif,
            boolean seulementCandidats, int seuil) {
        SuiviEquivalence.Criteres c = new SuiviEquivalence.Criteres();
        c.dci = dci;
        c.minProduits = minProduits;
        c.stockPositif = stockPositif;
        c.seulementCandidats = seulementCandidats;
        c.seuil = seuil;
        return c;
    }

    private static String couverture(double v) {
        return v < 0 ? "∞" : String.format(Locale.FRANCE, "%.1f", v).replace(",0", "");
    }

    private static String libelleGroupe(SuiviEquivalence.Groupe g) {
        return g.dci + " (" + g.produits.size() + " produits"
                + (g.candidats > 0 ? ", " + g.candidats + " à ne plus commander" : "") + ")";
    }

    @GET
    public Response lister(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @DefaultValue("") @QueryParam("dci") String dci,
            @DefaultValue("2") @QueryParam("minProduits") int minProduits,
            @DefaultValue("false") @QueryParam("stockPositif") boolean stockPositif,
            @DefaultValue("false") @QueryParam("seulementCandidats") boolean seulementCandidats,
            @DefaultValue("20") @QueryParam("seuil") int seuil, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("25") @QueryParam("limit") int limit) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.ok().entity(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE)
                    .put("total", 0).put("data", new JSONArray()).toString()).build();
        }
        LocalDate[] p = AnalyseArticleRessource.periode(typePeriode, dtStart, dtEnd);
        List<SuiviEquivalence.Groupe> groupes = suiviEquivalenceService.groupes(p[0], p[1],
                u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                criteres(dci, minProduits, stockPositif, seulementCandidats, seuil));
        JSONArray data = new JSONArray();
        int depart = Math.max(0, start);
        int fin = limit <= 0 ? groupes.size() : Math.min(groupes.size(), depart + limit);
        long candidats = 0;
        for (SuiviEquivalence.Groupe g : groupes) {
            candidats += g.candidats;
        }
        for (int i = depart; i < fin; i++) {
            SuiviEquivalence.Groupe g = groupes.get(i);
            for (SuiviEquivalence.Produit x : g.produits) {
                data.put(new JSONObject().put("groupe", g.cle).put("groupeLibelle", libelleGroupe(g))
                        .put("ordreGroupe", i).put("dci", g.dci).put("produitId", x.id).put("cip", x.cip)
                        .put("libelle", x.nom).put("rang", x.rang).put("equivalence", x.equivalence)
                        .put("equivalenceLibelle", SuiviEquivalence.libelleEquivalence(x.equivalence))
                        .put("raison", x.raison).put("candidat", x.candidat).put("quantite", x.quantite)
                        .put("part", x.part).put("montant", x.montant).put("marge", x.marge).put("stock", x.stock)
                        .put("couverture", x.couverture).put("valeurStock", x.valeurStock())
                        .put("derniereVente", x.derniereVente == null ? "" : x.derniereVente));
            }
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true)
                        .put("periode",
                                new JSONObject().put("debut", p[0].toString()).put("fin", p[1].toString())
                                        .put("libelle", "du " + p[0].format(JOUR) + " au " + p[1].format(JOUR)))
                        .put("total", groupes.size()).put("candidats", candidats).put("data", data).toString())
                .build();
    }

    private List<SuiviEquivalenceLigneDTO> lignes(List<SuiviEquivalence.Groupe> groupes) {
        List<SuiviEquivalenceLigneDTO> l = new ArrayList<>();
        for (SuiviEquivalence.Groupe g : groupes) {
            for (SuiviEquivalence.Produit x : g.produits) {
                SuiviEquivalenceLigneDTO d = new SuiviEquivalenceLigneDTO();
                d.setGroupe(libelleGroupe(g));
                d.setRang(x.rang);
                d.setCip(x.cip);
                d.setLibelle(x.nom);
                d.setEquivalence(SuiviEquivalence.libelleEquivalence(x.equivalence));
                d.setQuantite(x.quantite);
                d.setPart(x.part);
                d.setMontant(x.montant);
                d.setMarge(x.marge);
                d.setStock(x.stock);
                d.setCouverture(couverture(x.couverture));
                d.setDerniereVente(x.derniereVente == null ? "" : x.derniereVente);
                d.setRepere(x.candidat ? "À ne plus commander" : "");
                l.add(d);
            }
        }
        return l;
    }

    private static String criteresTexte(String dci, int minProduits, boolean stockPositif, boolean seulementCandidats,
            int seuil) {
        return (dci.isEmpty() ? "toutes DCI" : "DCI « " + dci + " »") + " · groupes d'au moins "
                + Math.max(2, minProduits) + " produits" + (stockPositif ? " · en stock seulement" : "")
                + (seulementCandidats ? " · groupes avec doublons seulement" : "")
                + " · doublon : équivalent direct vendu moins de " + seuil + " % du meneur";
    }

    @GET
    @Path("excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response excel(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @DefaultValue("") @QueryParam("dci") String dci,
            @DefaultValue("2") @QueryParam("minProduits") int minProduits,
            @DefaultValue("false") @QueryParam("stockPositif") boolean stockPositif,
            @DefaultValue("false") @QueryParam("seulementCandidats") boolean seulementCandidats,
            @DefaultValue("20") @QueryParam("seuil") int seuil) throws IOException {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate[] p = AnalyseArticleRessource.periode(typePeriode, dtStart, dtEnd);
        List<SuiviEquivalence.Groupe> groupes = suiviEquivalenceService.groupes(p[0], p[1],
                u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                criteres(dci, minProduits, stockPositif, seulementCandidats, seuil));
        byte[] data = new ClasseurExcel<SuiviEquivalenceLigneDTO>("Suivi équivalence")
                .titre("ANALYSE ARTICLE - SUIVI ÉQUIVALENCE")
                .critere("Période", "du " + p[0].format(JOUR) + " au " + p[1].format(JOUR))
                .critere("Critères", criteresTexte(dci, minProduits, stockPositif, seulementCandidats, seuil))
                .texte("Groupe (DCI)", SuiviEquivalenceLigneDTO::getGroupe)
                .nombre("Rang", SuiviEquivalenceLigneDTO::getRang).texte("CIP", SuiviEquivalenceLigneDTO::getCip)
                .texte("Produit", SuiviEquivalenceLigneDTO::getLibelle)
                .texte("Équivalence", SuiviEquivalenceLigneDTO::getEquivalence)
                .nombre("Quantité", SuiviEquivalenceLigneDTO::getQuantite)
                .nombre("Part du groupe %", SuiviEquivalenceLigneDTO::getPart)
                .nombre("Chiffre d'affaires", SuiviEquivalenceLigneDTO::getMontant)
                .nombre("Marge", SuiviEquivalenceLigneDTO::getMarge).nombre("Stock", SuiviEquivalenceLigneDTO::getStock)
                .texte("Couverture (jours)", SuiviEquivalenceLigneDTO::getCouverture)
                .texte("Dernière vente", SuiviEquivalenceLigneDTO::getDerniereVente)
                .texte("Repère", SuiviEquivalenceLigneDTO::getRepere).construire(lignes(groupes));
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=suivi_equivalence.xlsx").build();
    }

    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("typePeriode") String typePeriode, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @DefaultValue("") @QueryParam("dci") String dci,
            @DefaultValue("2") @QueryParam("minProduits") int minProduits,
            @DefaultValue("false") @QueryParam("stockPositif") boolean stockPositif,
            @DefaultValue("false") @QueryParam("seulementCandidats") boolean seulementCandidats,
            @DefaultValue("20") @QueryParam("seuil") int seuil) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate[] p = AnalyseArticleRessource.periode(typePeriode, dtStart, dtEnd);
        List<SuiviEquivalence.Groupe> groupes = suiviEquivalenceService.groupes(p[0], p[1],
                u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                criteres(dci, minProduits, stockPositif, seulementCandidats, seuil));
        Map<String, Object> parametres = reportUtil.officineData(u);
        parametres.put("P_H_CLT_INFOS", "SUIVI ÉQUIVALENCE — du " + p[0].format(JOUR) + " au " + p[1].format(JOUR));
        parametres.put("P_CRITERES", criteresTexte(dci, minProduits, stockPositif, seulementCandidats, seuil));
        String url = reportUtil.buildReport(parametres, "suivi_equivalence", lignes(groupes));
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=suivi_equivalence.pdf").build();
    }
}
