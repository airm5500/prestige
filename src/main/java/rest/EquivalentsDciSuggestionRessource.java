package rest;

import commonTasks.dto.LignesSuggestionDTO;
import dal.TUser;
import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.EquivalentsDciSuggestionService;
import rest.service.SuggestionService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * EQUIVALENTS DCI ET PRODUITS RETIRES D'UNE SUGGESTION (plan d'octobre, 1.1 et 1.4).
 *
 * <ul>
 * <li>GET {id} : analyse (lecture seule), lancee par le bouton « Équivalents DCI » ;</li>
 * <li>GET {id}/pdf : impression, ouverte dans l'onglet ;</li>
 * <li>POST {id}/retirer : retire les lignes couvertes ; la couverture est RECALCULEE ici, jamais prise dans la requete
 * ;</li>
 * <li>GET {id}/retirees, POST {id}/ramener : produits retires, et leur retour dans la suggestion.</li>
 * </ul>
 */
@Path("v1/suggestion-equivalents")
@Produces(MediaType.APPLICATION_JSON)
public class EquivalentsDciSuggestionRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private EquivalentsDciSuggestionService service;

    @EJB
    private SuggestionService suggestionService;

    @EJB
    private ReportUtil reportUtil;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static Response echec(String message) {
        return Response.ok(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    @GET
    @Path("{id}")
    public Response analyser(@PathParam("id") String id, @QueryParam("itemId") String itemId) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        return Response.ok(service.analyser(id, u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                itemId == null || itemId.isEmpty() ? null : itemId).toString()).build();
    }

    @GET
    @Path("{id}/pdf")
    @Produces("application/pdf")
    public Response pdf(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        String emplacement = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONObject a = service.analyser(id, emplacement, null);
        Map<String, Object> parametres = reportUtil.officineData(u);
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS", "ÉQUIVALENTS DCI EN STOCK — SUGGESTION " + a.optString("reference", "") + " "
                + a.optString("grossiste", ""));
        JSONObject t = a.optJSONObject("tuiles");
        parametres.put("P_RESUME",
                t == null ? "" : t.optInt("concernes") + " produit(s) couvert(s), " + t.optInt("unitesCouvertes")
                        + " unité(s) ; valeur couverte " + t.optLong("valeurCouverteAchat") + " (achat) / "
                        + t.optLong("valeurCouverteVente") + " (vente). Aide à la décision : vérifier prescription,"
                        + " dosage, forme et contre-indications.");
        String url = reportUtil.buildReport(parametres, "equivalents_dci_suggestion",
                service.lignesImpression(id, emplacement));
        File fichier = reportUtil.editionEcrite(url)
                ? new File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=equivalents_dci_suggestion.pdf").build();
    }

    @POST
    @Path("{id}/retirer")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response retirer(@PathParam("id") String id, LignesSuggestionDTO corps) {
        TUser u = utilisateur();
        if (u == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (corps == null || corps.getLignes() == null || corps.getLignes().isEmpty()) {
            return echec("Aucune ligne choisie");
        }
        List<String> ids = new ArrayList<>();
        corps.getLignes().forEach(l -> ids.add(l.getId()));
        Map<String, Integer> restes = service.reliquats(id, u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), ids);
        Map<String, Integer> aRetirer = new LinkedHashMap<>();
        for (LignesSuggestionDTO.LigneSuggestionDTO l : corps.getLignes()) {
            Integer reste = restes.get(l.getId());
            if (reste == null) {
                return echec("Une ligne n'est plus couverte par un équivalent en stock : relancez l'analyse");
            }
            if (reste > 0 && !Boolean.TRUE.equals(l.getAvecReliquat())) {
                return echec("Une ligne n'est couverte qu'en partie : choisissez de la garder ou de créer un reliquat");
            }
            aRetirer.put(l.getId(), reste);
        }
        return Response.ok(suggestionService.retirerLignesCouvertes(id, aRetirer, u).toString()).build();
    }

    @GET
    @Path("{id}/retirees")
    public Response retirees(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        return Response.ok(suggestionService.lignesRetirees(id).toString()).build();
    }

    @POST
    @Path("{id}/ramener")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response ramener(@PathParam("id") String id, LignesSuggestionDTO corps) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (corps == null || corps.getLignes() == null || corps.getLignes().isEmpty()) {
            return echec("Aucun produit choisi");
        }
        Map<String, Integer> q = new LinkedHashMap<>();
        corps.getLignes().forEach(l -> q.put(l.getId(), l.getQuantite() == null ? 0 : l.getQuantite()));
        return Response.ok(suggestionService.ramenerLignes(id, q).toString()).build();
    }
}
