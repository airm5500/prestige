package rest;

import bll.stockManagement.InventaireManager;
import bll.userManagement.privilege;
import bll.utils.TparameterManager;
import dal.TInventaire;
import dal.TParameters;
import dal.TUser;
import dal.dataManager;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ws.rs.DefaultValue;
import org.json.JSONArray;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.InventaireService;
import toolkits.parameters.commonparameter;
import util.Constant;
import javax.ws.rs.POST;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
@Path("v1/inventaire")
@Produces("application/json")
@Consumes("application/json")
public class InventaireRessource {

    private static final Logger LOG = Logger.getLogger(InventaireRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private rest.service.SupportEventService supportEventService;

    @GET
    @Path("produit-annules")
    public Response doInventaireFromProduitsAnnules(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "userId") String userId) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = this.inventaireService.createInventaireFromCanceledList(dtStart, dtEnd, userId, tu);

        return Response.ok().entity(json.toString()).build();
    }

    private java.util.List<String> parseVenteIds(String body) {
        java.util.List<String> venteIds = new java.util.ArrayList<>();
        try {
            org.json.JSONArray ids = new JSONObject(body).optJSONArray("ids");
            if (ids != null) {
                for (int i = 0; i < ids.length(); i++) {
                    String id = ids.optString(i);
                    if (StringUtils.isNotEmpty(id)) {
                        venteIds.add(id);
                    }
                }
            }
        } catch (Exception e) {
        }
        return venteIds;
    }

    // Nombre de produits distincts des ventes annulees selectionnees (controle avant confirmation)
    @POST
    @Path("produit-annules/selection/count")
    public Response produitsAnnulesSelectionCount(String body) throws org.json.JSONException {
        int count = inventaireService.produitIdsFromVentes(parseVenteIds(body)).size();
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    // Creation d'inventaire a partir des produits des ventes annulees selectionnees
    // (selection conservee sur toutes les pages cote ecran)
    @POST
    @Path("produit-annules/selection")
    public Response doInventaireFromProduitsAnnulesSelection(String body) throws org.json.JSONException {
        java.util.Set<String> produitIds = inventaireService.produitIdsFromVentes(parseVenteIds(body));
        if (produitIds.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Aucun produit dans les ventes selectionnees").toString()).build();
        }
        String name = "INVENTAIRE PRODUITS ANNULES " + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(produitIds, name, name);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    @GET
    @Path("refreshStockLigneInventaire/{id}")
    public Response refreshStockLigneInventaire(@PathParam("id") String id) {

        inventaireService.refreshStockLigneInventaire(id);
        return Response.ok().build();
    }

    @POST
    @Path("create-from-ecarts/{id}")
    public Response createInventaireFromEcarts(@PathParam("id") String id) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = inventaireService.createInventaireFromEcarts(id, tu);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Enregistrement de la quantite comptee sur une ligne : remplace ws_transactions.jsp?mode=updateinventairefamille.
     *
     * <p>
     * C'est l'appel le plus frequent de tout l'inventaire - un par produit compte. La reponse garde la forme attendue
     * par l'ecran de saisie, {@code success} et {@code errors}, pour que la navigation d'une ligne a l'autre ne change
     * pas.
     */
    @POST
    @Path("ligne/quantite")
    public Response majQuantiteLigne(String payload) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        Long ligneId = null;
        try {
            ligneId = Long.valueOf(in.optString("lg_INVENTAIRE_FAMILLE_ID", "").trim());
        } catch (NumberFormatException e) {
            ligneId = null;
        }
        Integer quantite = in.has("int_NUMBER") && !in.isNull("int_NUMBER") ? in.optInt("int_NUMBER", -1) : null;
        JSONObject json = inventaireService.updateQuantiteLigne(ligneId, quantite);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Valeurs proposees par les filtres de la fiche d'inventaire : remplace les pages
     * configmanagement/*_/ws_data_inventaire.jsp et sm_user/utilisateur/ws_data.jsp.
     *
     * <p>
     * Les listes sont cadrees sur l'inventaire ouvert : un inventaire cree sur trois emplacements ne propose que ces
     * trois emplacements. L'entree "Tous", qui remet le filtre a zero, est toujours presente.
     */
    @GET
    @Path("criteres")
    public Response criteres(@DefaultValue("") @QueryParam("lg_INVENTAIRE_ID") String inventaireId,
            @DefaultValue("ZONE") @QueryParam("axe") String axe,
            @DefaultValue("") @QueryParam("search_value") String recherche,
            @DefaultValue("") @QueryParam("query") String query) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        String search = StringUtils.isNotEmpty(recherche) ? recherche : query;
        return Response.ok().entity(inventaireService.criteresInventaire(inventaireId, axe, search).toString()).build();
    }

    /**
     * Articles d'un inventaire unitaire : remplace ws_data_article_unitaire.jsp.
     *
     * <p>
     * L'ancienne page ramenait toutes les lignes de l'inventaire avant d'en decouper une page en memoire, d'ou
     * l'attente a l'affichage. Le comptage et la page sont desormais demandes a la base.
     */
    @GET
    @Path("articles-unitaires")
    public Response articlesUnitaires(@DefaultValue("") @QueryParam("lg_INVENTAIRE_ID") String inventaireId,
            @DefaultValue("") @QueryParam("search_value") String recherche,
            @DefaultValue("") @QueryParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @QueryParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @QueryParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        return Response.ok().entity(inventaireService
                .articlesUnitaires(inventaireId, recherche, familleArticleId, zoneGeoId, grossisteId, start, limit)
                .toString()).build();
    }

    /**
     * Retient ou ecarte une ligne d'un inventaire unitaire : remplace
     * ws_transactions.jsp?mode=updateInventaireUnitaireFamille.
     */
    @POST
    @Path("ligne/retenue")
    public Response retenirLigne(String payload) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        Long ligneId;
        try {
            ligneId = Long.valueOf(in.optString("lg_INVENTAIRE_FAMILLE_ID", "").trim());
        } catch (NumberFormatException e) {
            ligneId = null;
        }
        return Response.ok().entity(inventaireService.retenirLigne(ligneId, in.optBoolean("retenue", true)).toString())
                .build();
    }

    /**
     * Retient ou ecarte plusieurs lignes d'un coup : remplace ws_transactions.jsp?mode=createInventaireArticle et
     * createInventaireArticleBis.
     *
     * <p>
     * Les lignes sont designees par {@code ids} (identifiants de lignes d'inventaire) ou par {@code produits}
     * (identifiants de produits, resolus dans {@code lg_INVENTAIRE_ID}).
     */
    @POST
    @Path("lignes/retenue")
    public Response retenirLignes(String payload) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        java.util.List<Long> ligneIds = new java.util.ArrayList<>();
        JSONArray ids = in.optJSONArray("ids");
        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                try {
                    ligneIds.add(Long.valueOf(ids.optString(i, "").trim()));
                } catch (NumberFormatException e) {
                    // identifiant illisible : on l'ignore plutot que de refuser tout le lot
                }
            }
        }
        java.util.List<String> produitIds = new java.util.ArrayList<>();
        JSONArray produits = in.optJSONArray("produits");
        if (produits != null) {
            for (int i = 0; i < produits.length(); i++) {
                String p = produits.optString(i, null);
                if (StringUtils.isNotBlank(p)) {
                    produitIds.add(p);
                }
            }
        }
        JSONObject json = inventaireService.retenirLignes(in.optString("lg_INVENTAIRE_ID", ""), ligneIds, produitIds,
                in.optBoolean("retenue", true));
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Suppression d'une ligne d'inventaire : remplace ws_transactions.jsp?mode=deleteInventaireFamille.
     */
    @POST
    @Path("ligne/supprimer")
    public Response supprimerLigne(String payload) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        Long ligneId;
        try {
            ligneId = Long.valueOf(in.optString("lg_INVENTAIRE_FAMILLE_ID", "").trim());
        } catch (NumberFormatException e) {
            ligneId = null;
        }
        return Response.ok().entity(inventaireService.supprimerLigne(ligneId).toString()).build();
    }

    /**
     * Suppression d'un inventaire : remplace ws_transactions.jsp?mode=delete.
     *
     * <p>
     * La suppression passe par la procedure stockee {@code proc_delete_inventory}, qui n'est pas modifiee : on emprunte
     * la methode metier existante. La reponse garde les champs {@code code_statut} et {@code desc_satut} que l'ecran
     * lit deja, aussi bien pour la suppression d'une ligne que pour celle d'une selection entiere.
     */
    @POST
    @Path("supprimer")
    public Response supprimerInventaire(String payload) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        String inventaireId = in.optString("lg_INVENTAIRE_ID", "").trim();
        if (inventaireId.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", 0).put("code_statut", "0")
                    .put("desc_satut", "Inventaire non identifie.").toString()).build();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            InventaireManager manager = new InventaireManager(odm, user);
            boolean ok = manager.deleteInventaire(inventaireId);
            String detail = StringUtils.defaultIfBlank(manager.getDetailmessage(),
                    ok ? "Inventaire supprime." : "Echec de suppression de l'inventaire.");
            return Response.ok().entity(new JSONObject().put("success", ok ? 1 : 0).put("code_statut", ok ? "1" : "0")
                    .put("desc_satut", detail).toString()).build();
        } catch (Exception e) {
            // Panne : tracee au centre de support, avec la meme forme de reponse que l'ecran attend.
            incident("supprimerInventaire", "Echec de suppression de l'inventaire.", e);
            return Response.ok()
                    .entity(new JSONObject().put("success", 0).put("code_statut", "0")
                            .put("desc_satut", "L'operation a echoue. L'incident a ete transmis a l'equipe technique.")
                            .toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Creation d'un inventaire : remplace ws_transactions.jsp?mode=createbis.
     *
     * <p>
     * Corps attendu : {@code str_NAME}, {@code str_TYPE_TRANSACTION} (Emplacement, Famille ou Grossiste),
     * {@code valeurs} (tableau des identifiants coches sur cet axe, vide pour "tous"), et les options existantes
     * {@code str_BEGIN}, {@code str_END}, {@code stockFilter}, {@code stockProduit}, {@code bool_INVENTAIRE}.
     *
     * <p>
     * La reponse reprend la forme de l'ancienne JSP - {@code success}, {@code nombre} - pour que le message affiche a
     * l'ecran reste le meme.
     */
    @POST
    @Path("creation")
    public Response creerInventaire(String payload) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        String nom = in.optString("str_NAME", "").trim();
        String type = in.optString("str_TYPE_TRANSACTION", "").trim();
        if (nom.isEmpty()) {
            return refus("Indiquez un libelle pour cet inventaire.");
        }
        if (type.isEmpty()) {
            return refus("Choisissez un type d'inventaire.");
        }

        java.util.List<String> valeurs = new java.util.ArrayList<>();
        JSONArray brut = in.optJSONArray("valeurs");
        if (brut != null) {
            for (int i = 0; i < brut.length(); i++) {
                String v = brut.optString(i, null);
                // "0" (Personnalise) et "%%" (Tous) signifient tous les deux "aucun filtre sur cet axe" :
                // c'est la traduction que faisait l'ancienne JSP, on la conserve.
                if (v != null && !v.isEmpty() && !"0".equals(v) && !"%%".equals(v)) {
                    valeurs.add(v);
                }
            }
        }

        String debut = in.optString("str_BEGIN", "");
        String fin = in.optString("str_END", "");
        if (valeurs.isEmpty() && (debut.isEmpty() || fin.isEmpty()) && brut != null && brut.length() > 0) {
            // Reprise du controle existant : sans valeur precise, l'intervalle devient obligatoire.
            return refus("Cochez au moins un element, ou saisissez un intervalle.");
        }

        Integer stockProduit = in.has("stockProduit") && !in.isNull("stockProduit")
                && !in.optString("stockProduit", "").isEmpty() ? in.optInt("stockProduit") : null;

        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            InventaireManager manager = new InventaireManager(odm, user);
            long lignes = manager.createInventaireMultiCriteres(nom, valeurs, axeDepuisType(type), debut, fin, type,
                    in.optInt("bool_INVENTAIRE", 1), in.optString("stockFilter", "ALL"), stockProduit);

            if (lignes == InventaireManager.ECHEC_TECHNIQUE) {
                // Panne, et non absence de resultat : les deux ne doivent pas porter le meme message.
                // L'utilisateur repart avec une reference, que le journal porte a l'identique.
                return incident("creerInventaire", manager.getDetailmessage(), null);
            }
            if (lignes == 0) {
                // Cas metier ordinaire, et non un defaut : la selection ne contient aucun produit.
                // Le message nomme la cause pour que l'utilisateur sache quoi corriger.
                return refus("Aucun inventaire n'a ete cree. Cause : " + causeSelectionVide(type) + ".");
            }
            return Response.ok().entity(new JSONObject().put("success", 1).put("lignes", lignes)
                    .put("nombre", lignes + " article(s) inventorie(s)").toString()).build();
        } catch (Exception e) {
            return incident("creerInventaire", "La creation de l'inventaire a echoue.", e);
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Nomme ce qui est vide, selon l'axe choisi, pour que le message dise quoi corriger. */
    private String causeSelectionVide(String type) {
        if ("Emplacement".equalsIgnoreCase(type)) {
            return "emplacement(s) vide(s), aucun produit n'y est rattache";
        }
        if ("Famille".equalsIgnoreCase(type)) {
            return "famille(s) vide(s), aucun produit n'y est rattache";
        }
        if ("Grossiste".equalsIgnoreCase(type)) {
            return "grossiste(s) sans produit rattache";
        }
        return "aucun produit ne correspond aux criteres retenus";
    }

    /** Traduit le type d'inventaire choisi a l'ecran en axe de selection. */
    private String axeDepuisType(String type) {
        if ("Emplacement".equalsIgnoreCase(type)) {
            return "EMPLACEMENT";
        }
        if ("Famille".equalsIgnoreCase(type)) {
            return "FAMILLE";
        }
        if ("Grossiste".equalsIgnoreCase(type)) {
            return "GROSSISTE";
        }
        return "";
    }

    /**
     * Enregistre un incident TECHNIQUE dans le centre de support, et rend une reponse d'echec.
     *
     * <p>
     * A n'utiliser que pour une panne : un cas metier normal - selection vide, inventaire cloture, saisie invalide -
     * n'est pas un incident et se traite par {@link #refus(String)}, sans encombrer les diagnostics.
     *
     * <p>
     * Le message rendu a l'utilisateur reste sobre : il dit que l'operation a echoue, sans reference a communiquer ni
     * jargon technique. La trace, elle, part au centre de support, ou l'equipe la retrouve avec son module et son
     * ecran.
     */
    private Response incident(String operation, String message, Exception e) {
        try {
            rest.service.dto.SupportEventDTO evenement = new rest.service.dto.SupportEventDTO();
            evenement.setType("APPLICATION");
            evenement.setNiveau("ERREUR");
            evenement.setModule("INVENTAIRE");
            evenement.setUrlOuEcran("api/v1/inventaire/" + operation);
            evenement.setMessageCourt(StringUtils.abbreviate(message, 500));
            if (e != null) {
                java.io.StringWriter trace = new java.io.StringWriter();
                e.printStackTrace(new java.io.PrintWriter(trace));
                evenement.setStack(trace.toString());
            }
            TUser user = currentUser();
            supportEventService.record(evenement, user != null ? user.getStrLOGIN() : null);
        } catch (Exception enregistrement) {
            // Le signalement ne doit jamais empecher de rendre une reponse a l'utilisateur.
            LOG.log(Level.WARNING, "incident : signalement non enregistre", enregistrement);
        }
        LOG.log(Level.SEVERE, "incident sur " + operation + " : " + message, e);
        String pourEcran = "L'operation a echoue. L'incident a ete transmis a l'equipe technique.";
        return Response.ok().entity(new JSONObject().put("success", 0).put("incident", true).put("nombre", pourEcran)
                .put("message", pourEcran).put("errors", pourEcran).toString()).build();
    }

    private Response refus(String message) {
        return Response.ok()
                .entity(new JSONObject().put("success", 0).put("nombre", message).put("message", message).toString())
                .build();
    }

    /**
     * Liste paginee des inventaires : remplace ws_data.jsp.
     *
     * <p>
     * L'ancienne page chargeait TOUS les inventaires de l'emplacement puis decoupait la page en memoire, en
     * rafraichissant chaque ligne une par une. Le comptage et la page sont desormais demandes a la base, avec les memes
     * filtres. Le contenu de chaque ligne est identique a celui que produisait la JSP.
     */
    @GET
    @Path("liste")
    public Response listeInventaires(@DefaultValue("") @QueryParam("str_TYPE") String statut,
            @DefaultValue("") @QueryParam("str_ZONE") String zone,
            @DefaultValue("") @QueryParam("search_value") String recherche,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            InventaireManager manager = new InventaireManager(odm, user);
            String zoneRetenue = ("ALL".equalsIgnoreCase(zone)) ? "" : zone;
            long total = manager.countInventaires(statut, zoneRetenue, recherche);
            JSONArray lignes = new JSONArray();
            for (TInventaire inv : manager.listInventairesPagines(statut, zoneRetenue, recherche, start, limit)) {
                lignes.put(ligneInventaire(inv));
            }
            return Response.ok().entity(new JSONObject().put("total", total).put("results", lignes).toString()).build();
        } catch (Exception e) {
            // Une liste vide sans explication laisse croire qu'il n'y a rien a afficher : on trace.
            incident("listeInventaires", "Echec du chargement de la liste des inventaires.", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Ligne de la liste des inventaires, champ pour champ comme l'ancienne JSP. */
    private JSONObject ligneInventaire(TInventaire inv) {
        toolkits.utils.date cle = new toolkits.utils.date();
        JSONObject json = new JSONObject();
        json.put("lg_INVENTAIRE_ID", inv.getLgINVENTAIREID());
        json.put("str_NAME", inv.getStrNAME());
        json.put("str_DESCRIPTION", inv.getStrDESCRIPTION());
        try {
            json.put("lg_USER_ID", inv.getLgUSERID().getStrFIRSTNAME() + " " + inv.getLgUSERID().getStrLASTNAME());
        } catch (Exception e) {
            json.put("lg_USER_ID", "");
        }
        String libelleStatut = "";
        if (commonparameter.statut_enable.equalsIgnoreCase(inv.getStrSTATUT())) {
            libelleStatut = "En cours";
        } else if (commonparameter.statut_is_Closed.equalsIgnoreCase(inv.getStrSTATUT())) {
            libelleStatut = "Cloturé";
        }
        json.put("str_STATUT", libelleStatut);
        json.put("etat", inv.getStrSTATUT());
        json.put("str_TYPE", inv.getStrTYPE());
        json.put("dt_CREATED", cle.DateToString(inv.getDtCREATED(), cle.formatterShort));
        json.put("dt_UPDATED", cle.DateToString(inv.getDtUPDATED(), cle.formatterShort));
        return json;
    }

    /**
     * Contenu d'un inventaire ouvert : remplace ws_data_inventaire_famille.jsp.
     *
     * <p>
     * Transposition a l'identique. Les memes methodes de {@link InventaireManager} sont appelees, dans le meme ordre,
     * avec les memes parametres, et le JSON produit porte exactement les memes cles : l'ecran d'inventaire n'a pas a
     * etre adapte, seule l'adresse appelee change.
     */
    @GET
    @Path("detail")
    public Response detailInventaire(@DefaultValue("") @QueryParam("lg_INVENTAIRE_ID") String inventaireId,
            @DefaultValue("") @QueryParam("search_value") String recherche,
            @DefaultValue("") @QueryParam("str_TYPE") String type,
            @DefaultValue("") @QueryParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @QueryParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @QueryParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("") @QueryParam("lg_USER_ID") String userId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("10") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        // Chronometrage par etape : l'ouverture d'une fiche coute un temps FIXE d'environ une
        // seconde, identique pour 344 et pour 8086 lignes. Les mesures faites depuis le
        // navigateur ne disent pas OU il se situe ; ces reperes le montrent dans le journal.
        long t0 = System.currentTimeMillis();
        try {
            // "%%" est la valeur "pas de filtre" attendue par les requetes du manager.
            String inv = defautJoker(inventaireId);
            String famille = defautJoker(familleArticleId);
            String zone = defautJoker(zoneGeoId);
            String grossiste = defautJoker(grossisteId);
            String utilisateur = defautJoker(userId);
            String search = StringUtils.defaultString(recherche);

            InventaireManager manager = new InventaireManager(odm);
            privilege oPrivilege = new privilege(odm, user);
            boolean colonneStockVisible = oPrivilege
                    .isColonneStockMachineIsAuthorize(commonparameter.P_SHOW_INVENTAIRE);
            long tPrivilege = System.currentTimeMillis();

            int alerte = 0;
            TParameters parametre = new TparameterManager(odm).getParameter("KEY_MAX_VALUE_INVENTAIRE");
            if (parametre != null) {
                try {
                    alerte = Integer.parseInt(parametre.getStrVALUE());
                } catch (NumberFormatException e) {
                    alerte = 0;
                }
            }

            long tParametre = System.currentTimeMillis();

            long total;
            java.util.List<dal.TInventaireFamille> lignes;
            if ("MANQUANT".equalsIgnoreCase(type)) {
                total = manager.getInventaireManquantCount(search, inv, famille, zone, grossiste, utilisateur);
                lignes = manager.listEcartInventaireManquant(search, inv, famille, zone, grossiste, start, limit,
                        utilisateur);
            } else if ("SURPLUS".equalsIgnoreCase(type)) {
                total = manager.getCountInventaireSurplus(search, inv, famille, zone, grossiste, utilisateur);
                lignes = manager.listEcartInventaireSurplus(search, inv, famille, zone, grossiste, start, limit,
                        utilisateur);
            } else if ("MANQUANTSURPLUS".equalsIgnoreCase(type)) {
                total = manager.getCountEcartInventaireSurplus(search, inv, famille, zone, grossiste, utilisateur);
                lignes = manager.allEcartInventaireSurplus(search, inv, famille, zone, grossiste, start, limit,
                        utilisateur);
            } else if ("ALERTE".equalsIgnoreCase(type)) {
                total = manager.getCountAlertInventaire(search, inv, famille, zone, grossiste, alerte);
                lignes = manager.listAlertInventaire(search, inv, famille, zone, grossiste, alerte, start, limit);
            } else if ("TOUCHE".equalsIgnoreCase(type)) {
                total = manager.getCountInventaireTouche(search, inv, famille, zone, grossiste, true, utilisateur);
                lignes = manager.listInventaireTouche(search, inv, famille, zone, grossiste, true, start, limit,
                        utilisateur);
            } else if ("NONTOUCHE".equalsIgnoreCase(type)) {
                total = manager.getCountInventaireTouche(search, inv, famille, zone, grossiste, false, utilisateur);
                lignes = manager.listInventaireTouche(search, inv, famille, zone, grossiste, false, start, limit,
                        utilisateur);
            } else {
                total = manager.getCountByInventaire(search, inv, famille, zone, grossiste, true, utilisateur);
                lignes = manager.listTFamilleByInventaire(search, inv, famille, zone, grossiste, true, start, limit,
                        utilisateur);
            }

            long tRequetes = System.currentTimeMillis();

            JSONArray resultats = new JSONArray();
            for (dal.TInventaireFamille ligne : lignes) {
                resultats.put(ligneDetailInventaire(ligne, colonneStockVisible));
            }
            long tFin = System.currentTimeMillis();
            LOG.log(Level.INFO,
                    "detailInventaire [{0} lignes/{1} total] privilege={2}ms parametre={3}ms requetes={4}ms"
                            + " serialisation={5}ms TOTAL={6}ms",
                    new Object[] { lignes.size(), total, tPrivilege - t0, tParametre - tPrivilege,
                            tRequetes - tParametre, tFin - tRequetes, tFin - t0 });
            return Response.ok().entity(new JSONObject().put("total", total).put("results", resultats).toString())
                    .build();
        } catch (Exception e) {
            incident("detailInventaire", "Echec du chargement du contenu de l'inventaire.", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    private String defautJoker(String valeur) {
        return StringUtils.isBlank(valeur) ? "%%" : valeur;
    }

    /** Ligne de detail d'inventaire, cle pour cle comme l'ancienne JSP. */
    private JSONObject ligneDetailInventaire(dal.TInventaireFamille ligne, boolean colonneStockVisible) {
        JSONObject json = new JSONObject();
        dal.TFamille produit = ligne.getLgFAMILLEID();
        json.put("lg_INVENTAIRE_FAMILLE_ID", ligne.getLgINVENTAIREFAMILLEID());
        json.put("lg_INVENTAIRE_ID", ligne.getLgINVENTAIREID().getLgINVENTAIREID());
        json.put("lg_FAMILLE_ID", produit.getLgFAMILLEID());
        json.put("int_CIP", produit.getIntCIP());
        json.put("str_NAME", produit.getStrNAME());
        json.put("str_DESCRIPTION", produit.getStrDESCRIPTION());

        // Le regroupement suit le type d'inventaire : rayon par defaut, sinon famille ou grossiste.
        String code = produit.getLgZONEGEOID().getStrCODE();
        String groupe = produit.getLgZONEGEOID().getStrLIBELLEE();
        String typeInventaire = ligne.getLgINVENTAIREID().getStrTYPE();
        if ("famille".equals(typeInventaire)) {
            code = produit.getLgFAMILLEARTICLEID().getStrCODEFAMILLE();
            groupe = produit.getLgFAMILLEARTICLEID().getStrLIBELLE();
        } else if ("grossiste".equals(typeInventaire)) {
            code = produit.getLgGROSSISTEID().getStrCODE();
            groupe = produit.getLgGROSSISTEID().getStrLIBELLE();
        }
        json.put("str_CODE", code == null ? "" : code.trim());
        json.put("groupeby", groupe);

        try {
            json.put("lg_ZONE_GEO_ID", produit.getLgZONEGEOID().getStrLIBELLEE());
        } catch (Exception e) {
        }
        try {
            json.put("lg_FAMILLEARTICLE_ID", produit.getLgFAMILLEARTICLEID().getStrLIBELLE());
        } catch (Exception e) {
        }
        try {
            json.put("lg_GROSSISTE_ID", produit.getLgGROSSISTEID().getStrLIBELLE());
        } catch (Exception e) {
        }

        json.put("int_PRICE", produit.getIntPRICE());
        json.put("int_PRICE_REF", produit.getIntPRICE());
        json.put("int_PAF", produit.getIntPAF());
        json.put("int_PAT", produit.getIntPAT());
        json.put("int_MOY_VENTE", produit.getDblPRIXMOYENPONDERE() * ligne.getIntNUMBERINIT());
        json.put("int_TAUX_MARQUE", ligne.getIntNUMBERINIT());
        int ecart = ligne.getIntNUMBER() - ligne.getIntNUMBERINIT();
        json.put("int_QTE_SORTIE", ecart);
        json.put("int_QTE_REAPPROVISIONNEMENT", ecart * produit.getIntPRICE());
        json.put("is_AUTHORIZE_STOCK", colonneStockVisible);
        json.put("int_NUMBER_AVAILABLE", ligne.getIntNUMBER());
        return json;
    }

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
    }

    /**
     * Modification du commentaire (motif) d'un inventaire EN COURS.
     *
     * <p>
     * Refusee sur un inventaire cloture : le commentaire est la trace du pourquoi de l'inventaire, il ne doit plus
     * bouger une fois le stock applique. Le controle est fait cote serveur, l'ecran se contentant de ne pas proposer
     * l'edition.
     */
    @POST
    @Path("commentaire/{id}")
    public Response updateCommentaire(@PathParam("id") String id, String payload) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject in = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        JSONObject json = inventaireService.updateCommentaire(id, in.optString("commentaire", ""));
        return Response.ok().entity(json.toString()).build();
    }

    // Export Excel des produits d'un inventaire (tous les champs), meme apres cloture
    @GET
    @Path("export-excel/{id}")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@PathParam("id") String id) throws Exception {
        byte[] data = inventaireService.exportInventaireExcel(id);
        return Response.ok(data)
                .header("Content-Disposition", "attachment; filename=\"produits_inventaire_" + id + ".xls\"").build();
    }

    @POST
    @Path("import-csv")
    public Response createInventaireFromCsv(String payload) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject request = StringUtils.isBlank(payload) ? new JSONObject() : new JSONObject(payload);
        JSONObject json = inventaireService.createInventaireFromCsv(request.optString("csvContent"), tu);
        return Response.ok().entity(json.toString()).build();
    }

}
