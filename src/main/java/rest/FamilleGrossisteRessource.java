package rest;

import bll.configManagement.familleGrossisteManagement;
import dal.TFamilleGrossiste;
import dal.TUser;
import dal.dataManager;
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
import toolkits.utils.date;
import util.Constant;

/**
 * Liste des grossistes d'un article (fenetre 'Gerer Grossiste' de la fiche article). Remplace la JSP historique
 * webservices/configmanagement/famillegrossiste/ws_data.jsp : MEME methode metier
 * bll.familleGrossisteManagement.getListeFamilleGrossiste, memes champs et memes formats de dates dans la reponse
 * {"total": n, "results": [...]}.
 */
@Path("v1/famille-grossiste")
@Produces("application/json")
@Consumes("application/json")
public class FamilleGrossisteRessource {

    private static final Logger LOG = Logger.getLogger(FamilleGrossisteRessource.class.getName());

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
    public Response list(@QueryParam("lg_FAMILLE_ID") String familleId,
            @QueryParam("lg_GROSSISTE_ID") String grossisteId, @QueryParam("search_value") String searchValue,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = currentUser();
        if (user == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // MEME methode metier que la JSP historique ws_data.jsp
            familleGrossisteManagement ofgm = new familleGrossisteManagement(odm);
            List<TFamilleGrossiste> liste = ofgm.getListeFamilleGrossiste(StringUtils.defaultString(searchValue),
                    StringUtils.defaultIfEmpty(familleId, "%%"), StringUtils.defaultIfEmpty(grossisteId, "%%"));

            int total = liste.size();
            int from = Math.max(0, start);
            int to = (limit > 0) ? Math.min(total, from + limit) : total;

            JSONArray results = new JSONArray();
            for (int i = from; i < to; i++) {
                TFamilleGrossiste fg = liste.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_FAMILLE_GROSSISTE_ID", fg.getLgFAMILLEGROSSISTEID());
                json.put("lg_GROSSISTE_ID", fg.getLgGROSSISTEID().getLgGROSSISTEID());
                json.put("lg_GROSSISTE_LIBELLE", fg.getLgGROSSISTEID().getStrLIBELLE());
                json.put("lg_FAMILLE_ID", fg.getLgFAMILLEID().getLgFAMILLEID());
                json.put("lg_FAMILLE_LIBELLE", fg.getLgFAMILLEID().getStrNAME());
                json.put("str_CODE_ARTICLE", fg.getStrCODEARTICLE());
                json.put("int_PRICE", fg.getIntPRICE());
                json.put("int_PAF", fg.getIntPAF());
                json.put("str_STATUT", fg.getStrSTATUT());
                json.put("dt_CREATED", date.DateToString(fg.getDtCREATED(), date.formatterShort));
                json.put("dt_UPDATED", date.DateToString(fg.getDtUPDATED(), date.formatterShort));
                results.put(json);
            }
            return Response.ok().entity(new JSONObject().put("total", total).put("results", results).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listFamilleGrossiste", e);
            // 500 comme la JSP historique : une erreur serveur ne doit pas s'afficher
            // comme une liste vide normale.
            return Response.serverError()
                    .entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
