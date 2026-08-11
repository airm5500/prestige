package rest;

import bll.configManagement.GroupeTierspayantController;
import bll.stockManagement.StockManager;
import dal.TPreenregistrementDetail;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import util.Constant;

/**
 * Details d'un article de la fiche article (bouton 'Detail sur l'article'). Remplace les JSP historiques
 * webservices/stockmanagement/suivistockvente/ws_data_detailsortie_famille.jsp et ws_data_statVente_famille.jsp : MEMES
 * methodes metier (StockManager.listVenteDateAndByFamille et GroupeTierspayantController.getListeTSnapshotFamillesell),
 * memes champs et memes formats dans la reponse {"total": n, "results": [...]}.
 */
@Path("v1/suivi-stock-vente")
@Produces("application/json")
@Consumes("application/json")
public class SuiviStockVenteRessource {

    private static final Logger LOG = Logger.getLogger(SuiviStockVenteRessource.class.getName());

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

    @GET
    @Path("detail-sortie-famille")
    public Response detailSortieFamille(@QueryParam("lg_FAMILLE_ID") String familleId,
            @QueryParam("lg_USER_ID") String userId, @QueryParam("search_value") String searchValue,
            @QueryParam("datedebut") String dateDebut, @QueryParam("datefin") String dateFin,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // MEME preparation des bornes de dates que la JSP historique ws_data_detailsortie_famille.jsp
            date key = new date();
            Date dtDebut;
            Date dtFin;
            String odate;
            if (StringUtils.isEmpty(dateDebut)) {
                dtDebut = new Date();
                odate = date.DateToString(dtDebut, date.formatterMysqlShort2);
            } else {
                dtDebut = key.stringToDate(dateDebut, date.formatterMysqlShort);
                odate = date.DateToString(dtDebut, date.formatterMysqlShort2);
            }
            dtDebut = key.getDate(odate, "00:00");
            if (StringUtils.isEmpty(dateFin)) {
                dtFin = new Date();
                odate = date.DateToString(dtFin, date.formatterMysqlShort2);
            } else {
                dtFin = key.stringToDate(dateFin, date.formatterMysqlShort);
                odate = date.DateToString(dtFin, date.formatterMysqlShort2);
            }
            dtFin = key.getDate(odate, "23:59");

            // MEME methode metier que la JSP historique
            StockManager stockManager = new StockManager(odm);
            List<TPreenregistrementDetail> liste = stockManager.listVenteDateAndByFamille(
                    StringUtils.defaultString(searchValue), dtDebut, dtFin, StringUtils.defaultIfEmpty(familleId, "%%"),
                    StringUtils.defaultIfEmpty(userId, "%%"));

            int total = liste.size();
            int from = Math.max(0, start);
            int to = (limit > 0) ? Math.min(total, from + limit) : total;

            JSONArray results = new JSONArray();
            for (int i = from; i < to; i++) {
                TPreenregistrementDetail detail = liste.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_FAMILLE_ID", detail.getLgFAMILLEID().getLgFAMILLEID());
                json.put("str_NAME", detail.getLgFAMILLEID().getStrNAME());
                json.put("lg_USER_ID", detail.getLgPREENREGISTREMENTID().getLgUSERID().getStrFIRSTNAME() + " "
                        + detail.getLgPREENREGISTREMENTID().getLgUSERID().getStrLASTNAME());
                json.put("int_CIP", detail.getLgFAMILLEID().getIntCIP());
                json.put("int_NUMBER", detail.getIntQUANTITYSERVED());
                json.put("str_CODE_TVA", detail.getLgPREENREGISTREMENTID().getStrREF());
                json.put("int_VALUE1", conversion.AmountFormat(detail.getIntPRICE(), '.'));
                json.put("dt_UPDATED",
                        date.DateToString(detail.getLgPREENREGISTREMENTID().getDtUPDATED(), date.formatterShort));
                results.put(json);
            }
            return Response.ok().entity(new JSONObject().put("total", total).put("results", results).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "detailSortieFamille", e);
            // 500 comme la JSP historique : une erreur serveur ne doit pas s'afficher
            // comme une liste vide normale.
            return Response.serverError()
                    .entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    @GET
    @Path("stat-vente-famille")
    public Response statVenteFamille(@QueryParam("lg_FAMILLE_ID") String familleId) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // MEME methode metier que la JSP historique ws_data_statVente_famille.jsp
            GroupeTierspayantController controller = new GroupeTierspayantController(odm.getEmf());
            JSONArray results = controller.getListeTSnapshotFamillesell(familleId);
            return Response.ok()
                    .entity(new JSONObject().put("total", results.length()).put("results", results).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statVenteFamille", e);
            // 500 comme la JSP historique : une erreur serveur ne doit pas s'afficher
            // comme une liste vide normale.
            return Response.serverError()
                    .entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
