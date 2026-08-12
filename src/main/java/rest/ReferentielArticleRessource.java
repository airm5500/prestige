package rest;

import bll.configManagement.dciManagement;
import bll.configManagement.familleManagement;
import bll.entity.EntityData;
import dal.TCodeActe;
import dal.TDci;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TZoneGeographique;
import dal.dataManager;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import util.Constant;

/**
 * Referentiels de la fiche article (fenetre 'Modifier' notamment) en REST. Remplace les JSP historiques
 * typeetiquette/ws_data.jsp, codeacte/ws_data.jsp, zonegeographique/ws_data.jsp, dci/ws_data_dci_famille.jsp,
 * famillearticle/ws_data_initial.jsp et dci/ws_transaction_dci_famille.jsp : MEMES methodes metier, memes champs et
 * meme format {"total": n, "results": [...]}.
 */
@Path("v1/referentiel-article")
@Produces("application/json")
@Consumes("application/json")
public class ReferentielArticleRessource {

    private static final Logger LOG = Logger.getLogger(ReferentielArticleRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).put("results", new JSONArray()).toString())
                .build();
    }

    private static Response reponseListe(JSONArray results, int total) {
        return Response.ok().entity(new JSONObject().put("total", total).put("results", results).toString()).build();
    }

    private static Response erreurServeur() {
        return Response.serverError()
                .entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString()).build();
    }

    private static int[] bornes(int start, int limit, int total) {
        int from = Math.max(0, start);
        int to = (limit > 0) ? Math.min(total, from + limit) : total;
        return new int[] { from, to };
    }

    /** Types d'etiquette actifs (MEME methode metier que typeetiquette/ws_data.jsp). */
    @GET
    @Path("typeetiquettes")
    public Response typeetiquettes(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            List<TTypeetiquette> liste = new bll.warehouse.WarehouseManager(odm, user).listeTypeetiquette();
            int[] b = bornes(start, limit, liste.size());
            JSONArray results = new JSONArray();
            for (int i = b[0]; i < b[1]; i++) {
                TTypeetiquette t = liste.get(i);
                results.put(new JSONObject().put("lg_TYPEETIQUETTE_ID", t.getLgTYPEETIQUETTEID())
                        .put("str_NAME", t.getStrNAME()).put("str_DESCRIPTION", t.getStrDESCRIPTION())
                        .put("str_STATUT", t.getStrSTATUT()));
            }
            return reponseListe(results, liste.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "typeetiquettes", e);
            return erreurServeur();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Codes acte actifs (MEME requete que codeacte/ws_data.jsp). */
    @GET
    @Path("codeactes")
    public Response codeactes(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String search = "%" + StringUtils.defaultString(StringUtils.defaultIfEmpty(searchValue, query)) + "%";
            @SuppressWarnings("unchecked")
            List<TCodeActe> liste = odm.getEm().createQuery(
                    "SELECT t FROM TCodeActe t WHERE t.lgCODEACTEID LIKE ?1 AND t.strLIBELLEE LIKE ?2 AND t.strSTATUT LIKE ?3")
                    .setParameter(1, "%%").setParameter(2, search).setParameter(3, commonparameter.statut_enable)
                    .getResultList();
            int[] b = bornes(start, limit, liste.size());
            JSONArray results = new JSONArray();
            for (int i = b[0]; i < b[1]; i++) {
                TCodeActe t = liste.get(i);
                results.put(new JSONObject().put("lg_CODE_ACTE_ID", t.getLgCODEACTEID()).put("str_CODE", t.getStrCODE())
                        .put("str_LIBELLEE", t.getStrLIBELLEE()));
            }
            return reponseListe(results, liste.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "codeactes", e);
            return erreurServeur();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Zones geographiques / rayons (MEME methode metier que zonegeographique/ws_data.jsp). */
    @GET
    @Path("zones-geographiques")
    public Response zonesGeographiques(@QueryParam("search_value") String searchValue,
            @QueryParam("query") String query, @QueryParam("lg_ZONE_GEO_ID") String zoneGeoId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String search = "%" + StringUtils.defaultString(StringUtils.defaultIfEmpty(searchValue, query)) + "%";
            familleManagement ofm = new familleManagement(odm, user);
            List<TZoneGeographique> liste = ofm.getListeTZoneGeographiques(search,
                    StringUtils.defaultIfEmpty(zoneGeoId, "%%"));
            int[] b = bornes(start, limit, liste.size());
            JSONArray results = new JSONArray();
            for (int i = b[0]; i < b[1]; i++) {
                TZoneGeographique t = liste.get(i);
                JSONObject json = new JSONObject().put("lg_ZONE_GEO_ID", t.getLgZONEGEOID())
                        .put("str_LIBELLEE", t.getStrLIBELLEE()).put("str_CODE", t.getStrCODE())
                        .put("str_STATUT", t.getStrSTATUT()).put("bool_ACCOUNT", t.getBoolACCOUNT());
                if (t.getDtCREATED() != null) {
                    json.put("dt_CREATED", date.DateToString(t.getDtCREATED(), date.formatterShort));
                }
                if (t.getDtUPDATED() != null) {
                    json.put("dt_UPDATED", date.DateToString(t.getDtUPDATED(), date.formatterShort));
                }
                results.put(json);
            }
            return reponseListe(results, liste.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "zonesGeographiques", e);
            return erreurServeur();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** DCI actifs pour le combo d'association (MEME methode metier que famillearticle/ws_data_initial.jsp). */
    @GET
    @Path("dcis-initial")
    public Response dcisInitial(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String search = "%" + StringUtils.defaultString(StringUtils.defaultIfEmpty(searchValue, query)) + "%";
            List<TDci> liste = new dciManagement(odm).showAllInitial(search);
            int[] b = bornes(start, limit, liste.size());
            JSONArray results = new JSONArray();
            for (int i = b[0]; i < b[1]; i++) {
                TDci t = liste.get(i);
                results.put(new JSONObject().put("lg_DCI_ID", t.getLgDCIID()).put("str_NAME", t.getStrNAME())
                        .put("str_CODE", t.getStrCODE()).put("str_STATUT", t.getStrSTATUT()));
            }
            return reponseListe(results, liste.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "dcisInitial", e);
            return erreurServeur();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** DCI associes a un article (MEME methode metier que dci/ws_data_dci_famille.jsp). */
    @GET
    @Path("dci-famille")
    public Response dciFamille(@QueryParam("lg_FAMILLE_ID") String familleId, @QueryParam("lg_DCI_ID") String dciId,
            @QueryParam("search_value") String searchValue, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            List<EntityData> liste = new dciManagement(odm).ListDciFamille(StringUtils.defaultString(searchValue),
                    StringUtils.defaultIfEmpty(familleId, "%%"), StringUtils.defaultIfEmpty(dciId, "%%"));
            int[] b = bornes(start, limit, liste.size());
            JSONArray results = new JSONArray();
            for (int i = b[0]; i < b[1]; i++) {
                EntityData t = liste.get(i);
                results.put(new JSONObject().put("lg_FAMILLE_DCI_ID", t.getStr_value1())
                        .put("lg_FAMILLE_ID", t.getStr_value2()).put("lg_DCI_ID", t.getStr_value3())
                        .put("str_DESCRIPTION", t.getStr_value4()).put("int_PRICE", t.getStr_value5())
                        .put("str_CODE", t.getStr_value6()).put("dci_str_NAME", t.getStr_value7()));
            }
            return reponseListe(results, liste.size());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "dciFamille", e);
            return erreurServeur();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Association d'un DCI a un article (MEME methode metier que ws_transaction_dci_famille.jsp mode=create). */
    @POST
    @Path("dci-famille/associer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response associerDci(@FormParam("lg_DCI_ID") String dciId, @FormParam("lg_FAMILLE_ID") String familleId) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            dciManagement odcm = new dciManagement(odm);
            odcm.createFamilleDci(StringUtils.defaultString(dciId), StringUtils.defaultString(familleId));
            return Response.ok().entity(new JSONObject().put("success", odcm.getMessage())
                    .put("errors", StringUtils.defaultString(odcm.getDetailmessage())).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "associerDci", e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Impossible d'associer le DCI").toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Retrait d'un DCI d'un article (MEME methode metier que ws_transaction_dci_famille.jsp mode=delete). */
    @DELETE
    @Path("dci-famille/{id}")
    public Response supprimerDci(@PathParam("id") String familleDciId) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            dciManagement odcm = new dciManagement(odm);
            odcm.deleteFamilleDci(familleDciId);
            return Response.ok().entity(new JSONObject().put("success", odcm.getMessage())
                    .put("errors", StringUtils.defaultString(odcm.getDetailmessage())).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "supprimerDci", e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Impossible de retirer le DCI").toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
