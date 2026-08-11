package rest;

import dal.TUser;
import java.util.ArrayList;
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
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SuggestionReserveService;
import util.Constant;

/**
 * Endpoints REST des suggestions de reserve.
 *
 * <p>
 * Le parcours suit le traitement en deux temps : on cree la suggestion, on ajuste les quantites retenues ligne par
 * ligne sans toucher au stock, puis on declenche le traitement qui rend un compte rendu detaille.
 */
@Path("v1/suggestion-reserve")
@Produces("application/json")
@Consumes("application/json")
public class SuggestionReserveRessource {

    @Inject
    private HttpServletRequest servletRequest;
    private @EJB SuggestionReserveService suggestionReserveService;
    private @EJB rest.service.ReserveService reserveService;

    private TUser currentUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
    }

    /** Motifs disponibles, eventuellement restreints a un sens de mouvement. */
    @GET
    @Path("motifs")
    public Response motifs(@QueryParam("categorie") String categorie) {
        if (currentUser() == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.motifs(categorie).toString()).build();
    }

    /** Liste paginee avec l'ensemble des filtres de recherche et le tri demande. */
    @GET
    @Path("liste")
    public Response liste(@QueryParam("statut") String statut, @QueryParam("categorie") String categorie,
            @QueryParam("origine") String origine, @QueryParam("motifId") Integer motifId,
            @QueryParam("search_value") String search, @QueryParam("dtStart") String dtStart,
            @QueryParam("dtEnd") String dtEnd, @QueryParam("userId") String userId,
            @QueryParam("controle") String controle, @QueryParam("tri") String tri, @QueryParam("start") int start,
            @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject json = suggestionReserveService.lister(user, statut, categorie, origine, motifId, search, dtStart,
                dtEnd, userId, controle, tri, start, limit > 0 ? limit : 20);
        return Response.ok().entity(json.toString()).build();
    }

    /** Suggestions restant a traiter, pour le panneau de la cloche de notifications. */
    @GET
    @Path("en-attente")
    public Response enAttente(@QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        // Le panneau de la cloche attend {results:[...], total:n} : un tableau nu serait ignore.
        JSONArray liste = suggestionReserveService.suggestionsEnAttente(user, limit > 0 ? limit : 50);
        return Response.ok().entity(new JSONObject().put("results", liste)
                .put("total", suggestionReserveService.compterSuggestionsEnAttente(user)).toString()).build();
    }

    /** Compteur seul, pour le badge de la cloche. */
    @GET
    @Path("en-attente/count")
    public Response enAttenteCount() {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(
                new JSONObject().put("total", suggestionReserveService.compterSuggestionsEnAttente(user)).toString())
                .build();
    }

    /**
     * Produits des suggestions filtrees, ou d'une selection precise, pour creer un inventaire sur ce que l'ecran
     * affiche reellement.
     *
     * @param ids
     *            references de suggestions separees par des virgules ; si renseigne, les filtres sont ignores
     */
    @GET
    @Path("produits")
    public Response produits(@QueryParam("ids") String ids, @QueryParam("statut") String statut,
            @QueryParam("categorie") String categorie, @QueryParam("origine") String origine,
            @QueryParam("motifId") Integer motifId, @QueryParam("search_value") String search,
            @QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("userId") String userId, @QueryParam("controle") String controle,
            @QueryParam("start") int start, @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        List<String> listeIds = new ArrayList<>();
        if (ids != null && !ids.trim().isEmpty()) {
            for (String id : ids.split(",")) {
                if (!id.trim().isEmpty()) {
                    listeIds.add(id.trim());
                }
            }
        }
        JSONObject json = suggestionReserveService.produitsDesSuggestions(user, listeIds, statut, categorie, origine,
                motifId, search, dtStart, dtEnd, userId, controle, start, limit);
        return Response.ok().entity(json.toString()).build();
    }

    /** En-tete et lignes d'une suggestion, avec l'explication de chaque proposition. */
    @GET
    @Path("{id}")
    public Response detail(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.detail(user, id).toString()).build();
    }

    /**
     * Import d'un fichier (CSV, XLS ou XLSX ; colonnes CIP;QUANTITE) pour remplir le panier du reappro manuel. Aucune
     * ecriture en base : la reponse liste les lignes reconnues (a afficher dans le panier) et les lignes rejetees avec
     * leur numero de ligne et le motif. La reponse est servie en text/html : l'envoi de fichier ExtJS passe par une
     * iframe cachee qui n'accepte pas application/json.
     */
    @POST
    @Path("import-lignes")
    @Consumes(javax.ws.rs.core.MediaType.MULTIPART_FORM_DATA)
    @Produces(javax.ws.rs.core.MediaType.TEXT_HTML)
    public Response importLignes(@QueryParam("categorie") String categorie) {
        TUser user = currentUser();
        if (user == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        try {
            org.apache.commons.fileupload.servlet.ServletFileUpload upload = new org.apache.commons.fileupload.servlet.ServletFileUpload(
                    new org.apache.commons.fileupload.disk.DiskFileItemFactory());
            List<org.apache.commons.fileupload.FileItem> items = upload.parseRequest(servletRequest);
            for (org.apache.commons.fileupload.FileItem item : items) {
                if (!item.isFormField()) {
                    JSONObject json = reserveService.importLignesReappro(user, categorie, item.getName(),
                            item.getInputStream());
                    return Response.ok().entity(json.toString()).build();
                }
            }
            return Response.ok()
                    .entity(new JSONObject().put("success", false).put("message", "Aucun fichier reçu").toString())
                    .build();
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(SuggestionReserveRessource.class.getName())
                    .log(java.util.logging.Level.SEVERE, "importLignes", e);
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", "Lecture du fichier impossible").toString())
                    .build();
        }
    }

    /**
     * Cree une suggestion a partir d'une selection de produits.
     *
     * <p>
     * Corps attendu : {@code {categorie, motifId, commentaire, items:[{lg_FAMILLE_ID, int_QTE}]}}. La quantite
     * transmise est enregistree comme quantite RETENUE : la proposition, elle, est toujours recalculee par le serveur.
     */
    @POST
    @Path("creer")
    public Response creer(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = new JSONObject(body == null || body.trim().isEmpty() ? "{}" : body);
        String categorie = in.optString("categorie", null);
        Integer motifId = in.has("motifId") && !in.isNull("motifId") ? in.optInt("motifId") : null;
        String commentaire = in.optString("commentaire", null);

        List<JSONObject> items = new ArrayList<>();
        JSONArray arr = in.optJSONArray("items");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                items.add(arr.getJSONObject(i));
            }
        }
        JSONObject json = suggestionReserveService.creer(user, categorie, motifId, commentaire, items);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Enregistre la quantite retenue d'une ligne. Aucun stock ne bouge.
     *
     * <p>
     * Une quantite de zero retire la ligne, conformement au parcours de saisie au clavier.
     */
    @PUT
    @Path("ligne/{detailId}/quantite")
    public Response majQuantite(@PathParam("detailId") String detailId, String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = new JSONObject(body == null || body.trim().isEmpty() ? "{}" : body);
        int qte = in.optInt("int_QTE", -1);
        String motif = in.optString("motif", null);
        JSONObject json = suggestionReserveService.majQuantiteRetenue(user, detailId, qte, motif);
        return Response.ok().entity(json.toString()).build();
    }

    /** Retire une ligne de la suggestion, en conservant la trace de la suppression. */
    @DELETE
    @Path("ligne/{detailId}")
    public Response supprimerLigne(@PathParam("detailId") String detailId, @QueryParam("motif") String motif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.supprimerLigne(user, detailId, motif).toString()).build();
    }

    /** Supprime une suggestion. Refuse des qu'une ligne a deja ete traitee. */
    @DELETE
    @Path("{id}")
    public Response supprimer(@PathParam("id") String id, @QueryParam("motif") String motif) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.supprimerSuggestion(user, id, motif).toString()).build();
    }

    /** Execute les mouvements des lignes retenues et renvoie le compte rendu detaille. */
    @PUT
    @Path("{id}/traiter")
    public Response traiter(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.traiter(user, id).toString()).build();
    }

    /** Rejoue uniquement les lignes en echec, sans retoucher aux lignes deja reussies. */
    @PUT
    @Path("{id}/reessayer")
    public Response reessayer(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.reessayerEchecs(user, id).toString()).build();
    }

    /** Relit le compte rendu d'une suggestion deja traitee. */
    @GET
    @Path("{id}/compte-rendu")
    public Response compteRendu(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.compteRendu(user, id).toString()).build();
    }

    /**
     * Cree une suggestion sur TOUT le resultat de recherche d'un onglet.
     *
     * <p>
     * Corps attendu : {@code {type, search, motifId, commentaire}}. Le serveur rejoue la recherche lui-meme.
     */
    @POST
    @Path("creer-depuis-recherche")
    public Response creerDepuisRecherche(String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = new JSONObject(body == null || body.trim().isEmpty() ? "{}" : body);
        Integer motifId = in.has("motifId") && !in.isNull("motifId") ? in.optInt("motifId") : null;
        JSONObject json = suggestionReserveService.creerDepuisRecherche(user, in.optString("type", null),
                in.optString("search", null), motifId, in.optString("commentaire", null));
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Ouvre la suggestion pour la traiter, en la reservant si personne ne l'occupe. Reponse enrichie de
     * {@code modifiable} et, le cas echeant, du nom de la personne qui la detient.
     */
    @PUT
    @Path("{id}/ouvrir")
    public Response ouvrir(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.ouvrirPourTraitement(user, id).toString()).build();
    }

    /** Rend la suggestion disponible pour les autres. */
    @PUT
    @Path("{id}/liberer")
    public Response liberer(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.libererVerrou(user, id).toString()).build();
    }

    /** Confirme qu'une suggestion traitee a bien ete realisee sur le terrain. */
    @PUT
    @Path("{id}/controler")
    public Response controler(@PathParam("id") String id, String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject o = (body == null || body.trim().isEmpty()) ? new JSONObject() : new JSONObject(body);
        String observation = o.optString("observation", null);
        return Response.ok().entity(suggestionReserveService.controler(user, id, observation).toString()).build();
    }

    /** Cree un inventaire reserve portant sur les produits de la suggestion. */
    @POST
    @Path("{id}/inventaire")
    public Response creerInventaire(@PathParam("id") String id) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(suggestionReserveService.creerInventaire(user, id).toString()).build();
    }

    /** Annule UNE ligne deja traitee, par mouvement inverse. */
    @PUT
    @Path("ligne/{detailId}/annuler")
    public Response annulerLigne(@PathParam("detailId") String detailId, String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = new JSONObject(body == null || body.trim().isEmpty() ? "{}" : body);
        JSONObject json = suggestionReserveService.annulerLigne(user, detailId, in.optString("motif", null));
        return Response.ok().entity(json.toString()).build();
    }

    /** Annule toutes les lignes traitees d'une suggestion, chaque refus etant explique individuellement. */
    @PUT
    @Path("{id}/annuler")
    public Response annulerSuggestion(@PathParam("id") String id, String body) throws JSONException {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = new JSONObject(body == null || body.trim().isEmpty() ? "{}" : body);
        JSONObject json = suggestionReserveService.annulerSuggestion(user, id, in.optString("motif", null));
        return Response.ok().entity(json.toString()).build();
    }

    /** Export Excel du compte rendu, en-tete de la suggestion comprise. */
    @GET
    @Path("{id}/compte-rendu/excel")
    @Produces("application/vnd.ms-excel")
    public Response compteRenduExcel(@PathParam("id") String id) throws Exception {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        byte[] data = suggestionReserveService.exportCompteRenduExcel(user, id);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"compte_rendu_suggestion.xls\"")
                .build();
    }
}
