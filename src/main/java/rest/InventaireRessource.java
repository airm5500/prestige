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
            LOG.log(Level.SEVERE, "listeInventaires", e);
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

            int alerte = 0;
            TParameters parametre = new TparameterManager(odm).getParameter("KEY_MAX_VALUE_INVENTAIRE");
            if (parametre != null) {
                try {
                    alerte = Integer.parseInt(parametre.getStrVALUE());
                } catch (NumberFormatException e) {
                    alerte = 0;
                }
            }

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

            JSONArray resultats = new JSONArray();
            for (dal.TInventaireFamille ligne : lignes) {
                resultats.put(ligneDetailInventaire(ligne, colonneStockVisible));
            }
            return Response.ok().entity(new JSONObject().put("total", total).put("results", resultats).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "detailInventaire", e);
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
