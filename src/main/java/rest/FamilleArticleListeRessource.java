package rest;

import dal.TFamillearticle;
import dal.TUser;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
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
import util.Constant;

/**
 * Liste des familles d'article, pour les ecrans qui doivent en proposer une selection.
 *
 * <p>
 * Complete les listes deja disponibles en REST pour les emplacements (v1/zones-geographiques) et les grossistes
 * (v1/grossistes) : les trois axes de selection d'un inventaire ont ainsi la meme source.
 *
 * <p>
 * Le chemin est distinct de v1/statfamillearticle, qui porte les statistiques et non la liste.
 */
@Path("v1/familles-article")
@Produces("application/json")
@Consumes("application/json")
public class FamilleArticleListeRessource {

    private static final Logger LOG = Logger.getLogger(FamilleArticleListeRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @GET
    public Response list(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser user = (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        String search = StringUtils.isNotEmpty(searchValue) ? searchValue : query;
        // Recherche "contient", sur le libelle comme sur le code, a l'image des autres listes REST.
        String like = "%" + (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
        try {
            String where = " FROM TFamillearticle t WHERE (t.strLIBELLE LIKE ?1 OR t.strCODEFAMILLE LIKE ?1)"
                    + " AND t.strSTATUT = ?2";
            long total = em.createQuery("SELECT COUNT(t)" + where, Long.class).setParameter(1, like)
                    .setParameter(2, commonparameter.statut_enable).getSingleResult();
            TypedQuery<TFamillearticle> q = em
                    .createQuery("SELECT t" + where + " ORDER BY t.strLIBELLE ASC", TFamillearticle.class)
                    .setParameter(1, like).setParameter(2, commonparameter.statut_enable);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            JSONArray results = new JSONArray();
            for (TFamillearticle f : q.getResultList()) {
                results.put(new JSONObject().put("lg_FAMILLEARTICLE_ID", f.getLgFAMILLEARTICLEID())
                        .put("str_LIBELLE", StringUtils.defaultString(f.getStrLIBELLE()))
                        .put("str_CODE_FAMILLE", StringUtils.defaultString(f.getStrCODEFAMILLE())));
            }
            return Response.ok().entity(new JSONObject().put("total", total).put("results", results).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste des familles d'article", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        }
    }
}
