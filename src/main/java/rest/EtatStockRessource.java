package rest;

import bll.stockManagement.StockManager;
import dal.TUser;
import dal.dataManager;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.EtatStockService;
import rest.service.InventaireService;
import rest.service.utils.ReportExcelExportService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Etat de stock en REST. La CONSULTATION (liste, zones pour l'edition d'emplacement) et la MODIFICATION d'emplacement
 * delegent aux MEMES methodes metier bll.StockManager que les JSP historiques (etatStock / getZone / updateProductZone)
 * : memes filtres, memes cles JSON. S'y ajoutent la creation d'inventaire et de suggestion a partir du RESULTAT DE LA
 * RECHERCHE en cours, et les exports CSV / Excel de ce meme resultat.
 */
@Path("v1/etat-stock")
@Produces("application/json")
@Consumes("application/json")
public class EtatStockRessource {

    private static final Logger LOG = Logger.getLogger(EtatStockRessource.class.getName());
    private static final DateTimeFormatter FMT_NOM = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter FMT_FICHIER = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
    private static final String[] ENTETES_EXPORT = new String[] { "CIP", "Designation", "TVA", "Fournisseur",
            "Seuil reappro", "Prix vente TTC", "Prix achat HT", "Code emplacement", "Stock" };

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private EtatStockService etatStockService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private ReportExcelExportService reportExcelExportService;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    private int nombre(String valeur) {
        try {
            return StringUtils.isBlank(valeur) ? 0 : Integer.parseInt(valeur.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * Liste de l'etat de stock : MEME delegation que la JSP historique ws_data.jsp (StockManager.etatStock + comptage).
     */
    @GET
    public Response list(@QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("str_TYPE_TRANSACTION") String typeTransaction,
            @DefaultValue("") @QueryParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @QueryParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @QueryParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("") @QueryParam("int_NUMBER") String nombreStock,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            StockManager stockManager = new StockManager(odm, sessionUser);
            String type = StringUtils.isBlank(typeTransaction) ? "%%" : typeTransaction;
            JSONArray rows = stockManager.etatStock(false, type, StringUtils.defaultString(searchValue),
                    familleArticleId, zoneGeoId, grossisteId, nombre(nombreStock), start, limit);
            int total = stockManager.etatStock(type, StringUtils.defaultString(searchValue), familleArticleId,
                    zoneGeoId, grossisteId, nombre(nombreStock));
            return Response.ok().entity(new JSONObject().put("results", rows).put("total", total).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list etat de stock", e);
            return Response.ok().entity(new JSONObject().put("results", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Zones pour l'editeur d'emplacement de la grille : MEME delegation que ws_zone.jsp. */
    @GET
    @Path("zones")
    public Response zones(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("10") @QueryParam("limit") int limit) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            StockManager stockManager = new StockManager(odm);
            String search = StringUtils.isNotBlank(searchValue) ? searchValue
                    : (StringUtils.isNotBlank(query) ? query : "%%");
            long total = stockManager.getZone(search);
            JSONArray data = new JSONArray();
            stockManager.getZone(search, sessionUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), start, limit)
                    .forEach(zone -> data.put(new JSONObject().put("lg_ZONE_GEO_ID", zone.getLgZONEGEOID())
                            .put("str_CODE", zone.getStrCODE()).put("str_LIBELLEE", zone.getStrLIBELLEE())));
            return Response.ok().entity(new JSONObject().put("data", data).put("total", total).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "zones etat de stock", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Changement d'emplacement d'un produit depuis la grille : MEME delegation que ws_transaction.jsp. */
    @POST
    @Path("update-zone")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response updateZone(@FormParam("lg_FAMILLE_ID") String familleId,
            @FormParam("CODEEMPLACEMENT") String codeEmplacement) {
        if (currentUser() == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            StockManager stockManager = new StockManager(odm);
            return Response.ok().entity(stockManager.updateProductZone(codeEmplacement, familleId).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "update zone etat de stock", e);
            return Response.ok().entity(new JSONObject().put("status", 0).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Toutes les lignes du RESULTAT DE LA RECHERCHE en cours (memes filtres que la liste, sans pagination). */
    private JSONArray lignesRecherche(TUser sessionUser, String searchValue, String typeTransaction,
            String familleArticleId, String zoneGeoId, String grossisteId, String nombreStock) {
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            StockManager stockManager = new StockManager(odm, sessionUser);
            String type = StringUtils.isBlank(typeTransaction) ? "%%" : typeTransaction;
            return stockManager.etatStock(true, type, StringUtils.defaultString(searchValue), familleArticleId,
                    zoneGeoId, grossisteId, nombre(nombreStock), 0, 0);
        } finally {
            odm.closeEntityManager();
        }
    }

    private Set<String> idsProduits(JSONArray lignes) {
        Set<String> ids = new LinkedHashSet<>();
        for (int i = 0; i < lignes.length(); i++) {
            String id = lignes.getJSONObject(i).optString("lg_FAMILLE_ID", "");
            if (StringUtils.isNotBlank(id)) {
                ids.add(id);
            }
        }
        return ids;
    }

    /**
     * Creation d'un inventaire avec le resultat de la recherche en cours. Nom : INVENTAIRE ETAT DE STOCK + date heure
     * minutes secondes. Utilise le MEME service d'inventaire que le reste de l'application.
     */
    @POST
    @Path("create-inventaire")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response createInventaire(@FormParam("search_value") String searchValue,
            @DefaultValue("") @FormParam("str_TYPE_TRANSACTION") String typeTransaction,
            @DefaultValue("") @FormParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @FormParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @FormParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("") @FormParam("int_NUMBER") String nombreStock) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        try {
            Set<String> ids = idsProduits(lignesRecherche(sessionUser, searchValue, typeTransaction, familleArticleId,
                    zoneGeoId, grossisteId, nombreStock));
            if (ids.isEmpty()) {
                return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                        .put("errors", "Aucun produit dans le résultat de la recherche").toString()).build();
            }
            String nom = "INVENTAIRE ETAT DE STOCK " + LocalDateTime.now().format(FMT_NOM);
            int count = inventaireService.create(ids, nom, nom);
            return Response.ok()
                    .entity(new JSONObject().put("success", commonparameter.PROCESS_SUCCESS)
                            .put("errors", "Inventaire '" + nom + "' créé avec " + count + " produit(s)")
                            .put("count", count).put("nom", nom).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "create inventaire etat de stock", e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Impossible de créer l'inventaire").toString()).build();
        }
    }

    /** Creation d'une NOUVELLE suggestion manuelle (une par fournisseur) avec le resultat de la recherche en cours. */
    @POST
    @Path("create-suggestion")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response createSuggestion(@FormParam("search_value") String searchValue,
            @DefaultValue("") @FormParam("str_TYPE_TRANSACTION") String typeTransaction,
            @DefaultValue("") @FormParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @FormParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @FormParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("") @FormParam("int_NUMBER") String nombreStock) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        try {
            Set<String> ids = idsProduits(lignesRecherche(sessionUser, searchValue, typeTransaction, familleArticleId,
                    zoneGeoId, grossisteId, nombreStock));
            return Response.ok().entity(etatStockService.creerSuggestion(sessionUser, new ArrayList<>(ids)).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "create suggestion etat de stock", e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Impossible de créer la suggestion").toString()).build();
        }
    }

    private String[] ligneExport(JSONObject row) {
        return new String[] { row.optString("int_CIP", ""), row.optString("str_NAME", ""),
                row.optString("str_CODE_TVA", ""), row.optString("lg_GROSSISTE_ID", ""),
                row.optString("int_STOCK_REAPROVISONEMENT", ""), row.optString("int_PRICE", ""),
                row.optString("int_NUMBER_ENTREE", ""), row.optString("CODEEMPLACEMENT", ""),
                row.optBoolean("afficherStock", false) ? row.optString("int_NUMBER", "") : "" };
    }

    /** Export CSV du resultat de la recherche en cours. */
    @GET
    @Path("export/csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportCsv(@QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("str_TYPE_TRANSACTION") String typeTransaction,
            @DefaultValue("") @QueryParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @QueryParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @QueryParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("") @QueryParam("int_NUMBER") String nombreStock) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        JSONArray lignes = lignesRecherche(sessionUser, searchValue, typeTransaction, familleArticleId, zoneGeoId,
                grossisteId, nombreStock);
        StreamingOutput output = (OutputStream out) -> {
            // BOM UTF-8 pour l'ouverture directe dans Excel avec les accents
            out.write(new byte[] { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF });
            Writer writer = new OutputStreamWriter(out, "UTF-8");
            writer.write(String.join(";", ENTETES_EXPORT) + "\r\n");
            for (int i = 0; i < lignes.length(); i++) {
                String[] valeurs = ligneExport(lignes.getJSONObject(i));
                for (int j = 0; j < valeurs.length; j++) {
                    valeurs[j] = valeurs[j].replace(";", ",");
                }
                writer.write(String.join(";", valeurs) + "\r\n");
            }
            writer.flush();
        };
        String nomFichier = "etat_stock_" + LocalDateTime.now().format(FMT_FICHIER) + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("Content-Disposition", "attachment; filename=" + nomFichier).build();
    }

    /** Export Excel du resultat de la recherche en cours. */
    @GET
    @Path("export/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("str_TYPE_TRANSACTION") String typeTransaction,
            @DefaultValue("") @QueryParam("lg_FAMILLEARTICLE_ID") String familleArticleId,
            @DefaultValue("") @QueryParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("") @QueryParam("lg_GROSSISTE_ID") String grossisteId,
            @DefaultValue("") @QueryParam("int_NUMBER") String nombreStock) throws Exception {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        JSONArray lignes = lignesRecherche(sessionUser, searchValue, typeTransaction, familleArticleId, zoneGeoId,
                grossisteId, nombreStock);
        List<String[]> data = new ArrayList<>();
        for (int i = 0; i < lignes.length(); i++) {
            data.add(ligneExport(lignes.getJSONObject(i)));
        }
        byte[] contenu = reportExcelExportService.createSimpleExcelReport("Etat de stock", ENTETES_EXPORT, data);
        String nomFichier = "etat_stock_" + LocalDateTime.now().format(FMT_FICHIER) + ".xls";
        return Response.ok(contenu).header("Content-Disposition", "attachment; filename=\"" + nomFichier + "\"")
                .build();
    }
}
