package rest;

import commonTasks.dto.VenteRateeDTO;
import commonTasks.dto.VenteRateeFiltres;
import dal.MotifVenteRatee;
import dal.TUser;
import dal.VenteRatee;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.VentesRateesService;
import rest.service.utils.ReportExcelExportService;
import util.Constant;

/**
 * Registre des ventes ratees : saisie rapide depuis le bouton panier, menu de consultation, analyse, editions et
 * exports. Toutes les reponses de donnees suivent le format {success, total, data} attendu par les stores ExtJS.
 */
@Path("v1/ventes-ratees")
@Produces("application/json")
@Consumes("application/json")
public class VentesRateesRessource {

    private static final Logger LOG = Logger.getLogger(VentesRateesRessource.class.getName());

    private static final String[] ENTETES = { "Date", "CIP", "Produit / désignation", "Qté", "Client", "Téléphone",
            "Motif", "Commentaire", "Utilisateur", "État", "Produit rattaché" };

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private VentesRateesService ventesRateesService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private ReportExcelExportService reportExcelExportService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    private Response echec(Exception e) {
        LOG.log(Level.WARNING, "ventes ratees", e);
        return Response.ok()
                .entity(new JSONObject().put("success", false)
                        .put("msg", StringUtils.defaultIfBlank(e.getMessage(), "Operation impossible")).toString())
                .build();
    }

    @GET
    @Path("motifs")
    public Response motifs() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONArray data = new JSONArray();
        for (MotifVenteRatee m : ventesRateesService.motifs()) {
            data.put(new JSONObject().put("id", m.getLgMOTIFID()).put("libelle", m.getStrLIBELLE()));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    /** Pastille du bouton panier : nombre de produits distincts non commandes du jour. */
    @GET
    @Path("compteur-jour")
    public Response compteurJour() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok().entity(
                new JSONObject().put("success", true).put("total", ventesRateesService.compteurJour()).toString())
                .build();
    }

    /**
     * Liste du jour pour la modale : les lignes detaillees, plus la vue regroupee (quantite totale, nombre de demandes)
     * calculee sans fusionner les lignes en base.
     */
    @GET
    @Path("jour")
    public Response jour() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<VenteRateeDTO> lignes = ventesRateesService.lignesDuJour();
        return Response.ok().entity(new JSONObject().put("success", true).put("total", lignes.size())
                .put("data", enJson(lignes)).put("groupes", groupes(lignes)).toString()).build();
    }

    @POST
    public Response ajouter(String body) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        try {
            VenteRatee creee = ventesRateesService.ajouter(depuisJson(new JSONObject(body)), user);
            return Response.ok().entity(new JSONObject().put("success", true).put("id", creee.getLgVENTERATEEID())
                    .put("total", ventesRateesService.compteurJour()).toString()).build();
        } catch (Exception e) {
            return echec(e);
        }
    }

    @PUT
    @Path("{id}")
    public Response modifier(@PathParam("id") String id, String body) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        try {
            ventesRateesService.modifier(id, depuisJson(new JSONObject(body)), user);
            return Response.ok().entity(new JSONObject().put("success", true).toString()).build();
        } catch (Exception e) {
            return echec(e);
        }
    }

    @DELETE
    @Path("{id}")
    public Response supprimer(@PathParam("id") String id) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        try {
            ventesRateesService.supprimer(id, user);
            return Response.ok().entity(
                    new JSONObject().put("success", true).put("total", ventesRateesService.compteurJour()).toString())
                    .build();
        } catch (Exception e) {
            return echec(e);
        }
    }

    /** Demandes actives du meme produit : de quoi poser (ou non) la confirmation de commande groupee. */
    @GET
    @Path("{id}/groupe")
    public Response groupe(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        try {
            int[] groupe = ventesRateesService.groupeActif(id);
            return Response.ok().entity(new JSONObject().put("success", true).put("nbDemandes", groupe[0])
                    .put("quantiteTotale", groupe[1])
                    .put("confirmationNecessaire", VenteRateeRegles.confirmationGroupeeNecessaire(groupe[0]))
                    .put("message", VenteRateeRegles.messageConfirmationGroupee(groupe[0], groupe[1])).toString())
                    .build();
        } catch (Exception e) {
            return echec(e);
        }
    }

    @POST
    @Path("{id}/commander")
    public Response commander(@PathParam("id") String id, String body) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        try {
            boolean toutes = StringUtils.isNotBlank(body) && new JSONObject(body).optBoolean("toutes", false);
            int marquees = ventesRateesService.commander(id, toutes, user);
            return Response.ok().entity(new JSONObject().put("success", true).put("marquees", marquees)
                    .put("total", ventesRateesService.compteurJour()).toString()).build();
        } catch (Exception e) {
            return echec(e);
        }
    }

    @POST
    @Path("{id}/rattacher")
    public Response rattacher(@PathParam("id") String id, String body) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        try {
            String familleId = new JSONObject(body).optString("familleId", "");
            ventesRateesService.rattacher(id, familleId, user);
            return Response.ok().entity(new JSONObject().put("success", true).toString()).build();
        } catch (Exception e) {
            return echec(e);
        }
    }

    /** Produits de la base pour la saisie rapide et le rattachement. */
    @GET
    @Path("produits")
    public Response produits(@QueryParam("q") String q) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONArray data = new JSONArray();
        for (Object[] p : ventesRateesService.rechercherProduits(q)) {
            data.put(new JSONObject().put("id", String.valueOf(p[0])).put("cip", p[1] == null ? "" : p[1])
                    .put("designation", p[2] == null ? "" : p[2]).put("stock", ((Number) p[3]).intValue()));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    @GET
    @Path("recherche")
    public Response recherche(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("userId") String userId, @QueryParam("produit") String produit,
            @QueryParam("client") String client, @QueryParam("motifId") String motifId,
            @DefaultValue("") @QueryParam("connu") String connu,
            @DefaultValue("") @QueryParam("commande") String commande,
            @DefaultValue("") @QueryParam("rattache") String rattache,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<VenteRateeDTO> lignes = ventesRateesService
                .recherche(filtres(dtStart, dtEnd, userId, produit, client, motifId, connu, commande, rattache));
        JSONArray data = new JSONArray();
        int fin = limit > 0 ? Math.min(lignes.size(), start + limit) : lignes.size();
        for (int i = Math.min(start, lignes.size()); i < fin; i++) {
            data.put(enJson(lignes.get(i)));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", lignes.size()).put("data", data).toString())
                .build();
    }

    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("userId") String userId, @QueryParam("motifId") String motifId) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok().entity(ventesRateesService
                .analyse(filtres(dtStart, dtEnd, userId, null, null, motifId, "", "", "")).toString()).build();
    }

    @GET
    @Path("utilisateurs")
    public Response utilisateurs() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONArray data = new JSONArray();
        for (Object[] u : ventesRateesService.utilisateurs()) {
            data.put(new JSONObject().put("id", String.valueOf(u[0])).put("nom", u[1] == null ? "" : u[1]));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    /** Edition PDF de la liste filtree, memes filtres que la recherche. */
    @GET
    @Path("recherche/print")
    public Response imprimer(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("userId") String userId, @QueryParam("produit") String produit,
            @QueryParam("client") String client, @QueryParam("motifId") String motifId,
            @DefaultValue("") @QueryParam("connu") String connu,
            @DefaultValue("") @QueryParam("commande") String commande,
            @DefaultValue("") @QueryParam("rattache") String rattache) {
        TUser user = utilisateur();
        if (user == null) {
            return deconnecte();
        }
        List<VenteRateeDTO> lignes = ventesRateesService
                .recherche(filtres(dtStart, dtEnd, userId, produit, client, motifId, connu, commande, rattache));
        Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "REGISTRE DES VENTES RATEES");
        parametres.put("P_PERIODE", sousTitre(dtStart, dtEnd, lignes.size()));
        String url = reportUtil.buildReport(parametres, "ventes_ratees", lignes);
        if (StringUtils.isBlank(url)) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("msg", "L'edition n'a pas pu etre generee").toString())
                    .build();
        }
        // La cle "msg" porte l'URL du PDF : c'est le contrat des autres editions de l'application.
        return Response.ok().entity(new JSONObject().put("success", true).put("msg", url).put("url", url).toString())
                .build();
    }

    @GET
    @Path("recherche/excel")
    @Produces("application/vnd.ms-excel")
    public Response excel(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("userId") String userId, @QueryParam("produit") String produit,
            @QueryParam("client") String client, @QueryParam("motifId") String motifId,
            @DefaultValue("") @QueryParam("connu") String connu,
            @DefaultValue("") @QueryParam("commande") String commande,
            @DefaultValue("") @QueryParam("rattache") String rattache) throws java.io.IOException {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<VenteRateeDTO> lignes = ventesRateesService
                .recherche(filtres(dtStart, dtEnd, userId, produit, client, motifId, connu, commande, rattache));
        byte[] data = reportExcelExportService.createExcelReport("REGISTRE DES VENTES RATEES", ENTETES, lignes,
                (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getDate());
                    row.createCell(col++).setCellValue(dto.getCip());
                    row.createCell(col++).setCellValue(dto.getDesignation());
                    row.createCell(col++).setCellValue(dto.getQuantite());
                    row.createCell(col++).setCellValue(dto.getNomClient());
                    row.createCell(col++).setCellValue(dto.getTelephone());
                    row.createCell(col++).setCellValue(dto.getMotif());
                    row.createCell(col++).setCellValue(dto.getCommentaire());
                    row.createCell(col++).setCellValue(dto.getUtilisateur());
                    row.createCell(col++).setCellValue(dto.getEtat());
                    row.createCell(col++).setCellValue(dto.getProduitRattache());
                });
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("Content-Disposition", "attachment; filename=ventes-ratees.xls").build();
    }

    /** Export CSV (séparateur « ; », BOM UTF-8 pour Excel). */
    @GET
    @Path("recherche/csv")
    @Produces("text/csv")
    public Response csv(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("userId") String userId, @QueryParam("produit") String produit,
            @QueryParam("client") String client, @QueryParam("motifId") String motifId,
            @DefaultValue("") @QueryParam("connu") String connu,
            @DefaultValue("") @QueryParam("commande") String commande,
            @DefaultValue("") @QueryParam("rattache") String rattache) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        List<VenteRateeDTO> lignes = ventesRateesService
                .recherche(filtres(dtStart, dtEnd, userId, produit, client, motifId, connu, commande, rattache));
        StringBuilder csv = new StringBuilder();
        csv.append('\ufeff'); // BOM : Excel ouvre le fichier UTF-8 avec les accents corrects
        csv.append(String.join(";", ENTETES)).append("\r\n");
        for (VenteRateeDTO l : lignes) {
            csv.append(champCsv(l.getDate())).append(';').append(champCsv(l.getCip())).append(';')
                    .append(champCsv(l.getDesignation())).append(';').append(l.getQuantite()).append(';')
                    .append(champCsv(l.getNomClient())).append(';').append(champCsv(l.getTelephone())).append(';')
                    .append(champCsv(l.getMotif())).append(';').append(champCsv(l.getCommentaire())).append(';')
                    .append(champCsv(l.getUtilisateur())).append(';').append(champCsv(l.getEtat())).append(';')
                    .append(champCsv(l.getProduitRattache())).append("\r\n");
        }
        return Response.ok(csv.toString().getBytes(StandardCharsets.UTF_8), "text/csv").encoding("UTF-8")
                .header("Content-Disposition", "attachment; filename=ventes-ratees.csv").build();
    }

    private static String champCsv(String valeur) {
        String v = StringUtils.defaultString(valeur);
        if (v.contains(";") || v.contains("\"") || v.contains("\n")) {
            return '"' + v.replace("\"", "\"\"") + '"';
        }
        return v;
    }

    private static String sousTitre(String dtStart, String dtEnd, int nb) {
        StringBuilder titre = new StringBuilder();
        if (StringUtils.isNotBlank(dtStart) || StringUtils.isNotBlank(dtEnd)) {
            titre.append("Période ").append(StringUtils.defaultIfBlank(dtStart, "...")).append(" au ")
                    .append(StringUtils.defaultIfBlank(dtEnd, "...")).append(" - ");
        }
        return titre.append(nb).append(" demande(s)").toString();
    }

    private static VenteRateeFiltres filtres(String dtStart, String dtEnd, String userId, String produit, String client,
            String motifId, String connu, String commande, String rattache) {
        return new VenteRateeFiltres().setDtStart(dtStart).setDtEnd(dtEnd).setUserId(userId).setProduit(produit)
                .setClient(client).setMotifId(motifId).setConnu(StringUtils.defaultString(connu))
                .setCommande(StringUtils.defaultString(commande)).setRattache(StringUtils.defaultString(rattache));
    }

    private static VenteRateeDTO depuisJson(JSONObject o) {
        return new VenteRateeDTO().setFamilleId(o.optString("familleId", null)).setCip(o.optString("cip", null))
                .setDesignation(o.optString("designation", "")).setQuantite(o.optInt("quantite", 1))
                .setClientId(o.optString("clientId", null)).setNomClient(o.optString("nomClient", null))
                .setTelephone(o.optString("telephone", null)).setMotifId(o.optString("motifId", null))
                .setCommentaire(o.optString("commentaire", null));
    }

    private static JSONArray enJson(List<VenteRateeDTO> lignes) {
        JSONArray data = new JSONArray();
        for (VenteRateeDTO l : lignes) {
            data.put(enJson(l));
        }
        return data;
    }

    private static JSONObject enJson(VenteRateeDTO l) {
        return new JSONObject().put("id", l.getId()).put("familleId", l.getFamilleId() == null ? "" : l.getFamilleId())
                .put("cip", l.getCip()).put("designation", l.getDesignation()).put("quantite", l.getQuantite())
                .put("clientId", l.getClientId() == null ? "" : l.getClientId()).put("nomClient", l.getNomClient())
                .put("telephone", l.getTelephone()).put("motifId", l.getMotifId() == null ? "" : l.getMotifId())
                .put("motif", l.getMotif()).put("commentaire", l.getCommentaire()).put("commande", l.isCommande())
                .put("dateCommande", l.getDateCommande()).put("utilisateurCommande", l.getUtilisateurCommande())
                .put("rattache", l.isRattache()).put("produitRattache", l.getProduitRattache()).put("date", l.getDate())
                .put("utilisateur", l.getUtilisateur()).put("connu", l.isConnu()).put("etat", l.getEtat());
    }

    /** Vue regroupee du jour : une entree par produit (connu) ou designation normalisee (libre). */
    private static JSONArray groupes(List<VenteRateeDTO> lignes) {
        Map<String, JSONObject> parCle = new LinkedHashMap<>();
        for (VenteRateeDTO l : lignes) {
            String cle = VenteRateeRegles.cleRegroupement(l.getFamilleId(),
                    VenteRateeRegles.normaliser(l.getDesignation()));
            JSONObject groupe = parCle.computeIfAbsent(cle,
                    k -> new JSONObject().put("cle", k).put("cip", l.getCip()).put("designation", l.getDesignation())
                            .put("quantiteTotale", 0).put("nbDemandes", 0).put("nonCommandees", 0)
                            .put("connu", l.isConnu()));
            groupe.put("quantiteTotale", groupe.getInt("quantiteTotale") + l.getQuantite());
            groupe.put("nbDemandes", groupe.getInt("nbDemandes") + 1);
            if (!l.isCommande()) {
                groupe.put("nonCommandees", groupe.getInt("nonCommandees") + 1);
            }
        }
        return new JSONArray(parCle.values());
    }
}
