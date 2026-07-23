package rest;

import bll.utils.TparameterManager;
import dal.TParameters;
import dal.TRole;
import dal.TUser;
import dal.dataManager;
import java.util.List;
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
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ParametreService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
@Path("v1/app-params")
@Produces("application/json")
@Consumes("application/json")
public class ParametreRessource {

    private static final Logger LOG = Logger.getLogger(ParametreRessource.class.getName());

    @EJB
    private ParametreService parametreService;
    @Inject
    private HttpServletRequest servletRequest;

    @GET
    @Path("key/{key}")
    public Response isEnable(@PathParam("key") String key) {
        boolean isEnable = parametreService.isEnable(key);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(isEnable, 1)).build();
    }

    @GET
    @Path("check/{key}")
    public Response chekIsEnable(@PathParam("key") String key) {
        boolean isEnable = parametreService.chekIsEnable(key);
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(isEnable, 1)).build();
    }

    /** Valeur brute d'un parametre (str_VALUE), vide si absent. */
    @GET
    @Path("value/{key}")
    public Response value(@PathParam("key") String key) {
        String value = parametreService.getValue(key, "");
        return Response.ok().entity(ResultFactory.getSuccessResult(value, 1)).build();
    }

    private TUser currentUser() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    /**
     * Liste des parametres pour l'ecran Gestion des parametrages : memes cles JSON et MEMES regles de visibilite que la
     * JSP historique ws_data_all.jsp (administrateur / super administrateur / role de type ADMIN : tous les parametres
     * ; autres profils : type CUSTOMER uniquement), via la MEME methode metier bll.TparameterManager.listeParameter.
     */
    @GET
    @Path("liste")
    public Response liste(@QueryParam("search_value") String searchValue, @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String search = (searchValue != null && !searchValue.isEmpty()) ? searchValue : query;
            // Regle de visibilite historique de ws_data_all.jsp
            String type = commonparameter.PARAMETER_CUSTOMER;
            bll.userManagement.user ouser = new bll.userManagement.user(odm);
            TRole role = ouser.getTRoleUser(sessionUser.getLgUSERID()).getLgROLEID();
            if (role != null && (bll.userManagement.user.isSuperAdminRole(role.getStrNAME())
                    || bll.userManagement.user.isAdminRole(role.getStrNAME())
                    || commonparameter.PARAMETER_ADMIN.equalsIgnoreCase(role.getStrTYPE()))) {
                type = "%%";
            }
            TparameterManager manager = new TparameterManager(odm, sessionUser);
            List<TParameters> parametres = manager.listeParameter(StringUtils.defaultString(search), type);
            JSONArray results = new JSONArray();
            int fin = limit > 0 ? Math.min(parametres.size(), Math.max(0, start) + limit) : parametres.size();
            for (int i = Math.max(0, start); i < fin; i++) {
                TParameters p = parametres.get(i);
                JSONObject row = new JSONObject().put("str_KEY", p.getStrKEY()).put("str_VALUE", p.getStrVALUE())
                        .put("str_DESCRIPTION", p.getStrDESCRIPTION()).put("str_TYPE", p.getStrTYPE())
                        .put("str_STATUT", p.getStrSTATUT());
                try {
                    row.put("str_SECTION_KEY", p.getStrSECTIONKEY());
                } catch (Exception ignore) {
                }
                results.put(row);
            }
            return Response.ok()
                    .entity(new JSONObject().put("total", parametres.size()).put("results", results).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste parametres", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Mise a jour d'un parametre : MEME methode metier bll.TparameterManager.updateParameter que la JSP historique, y
     * compris la regle d'exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT.
     */
    @POST
    @Path("update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response update(@FormParam("str_KEY") String key, @FormParam("str_VALUE") String value,
            @FormParam("str_DESCRIPTION") String description) {
        if (currentUser() == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TparameterManager manager = new TparameterManager(odm);
            manager.updateParameter(key, value, description);
            // Exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT : si l'un passe a 1, l'autre est force a 0
            String v = value != null ? value.trim() : "";
            if ("SEMOIS_ABC".equals(key) && "1".equals(v)) {
                TParameters autre = manager.getParameter("SEMOIS_PAR_PRODUIT");
                if (autre != null) {
                    manager.updateParameter("SEMOIS_PAR_PRODUIT", "0", autre.getStrDESCRIPTION());
                }
            } else if ("SEMOIS_PAR_PRODUIT".equals(key) && "1".equals(v)) {
                TParameters autre = manager.getParameter("SEMOIS_ABC");
                if (autre != null) {
                    manager.updateParameter("SEMOIS_ABC", "0", autre.getStrDESCRIPTION());
                }
            }
            return Response.ok().entity(new JSONObject().put("success", manager.getMessage())
                    .put("errors", StringUtils.defaultString(manager.getDetailmessage())).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "update parametre", e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Impossible de mettre à jour le paramètre").toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

}
