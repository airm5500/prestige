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

    /** Couleur de fond par defaut de la ligne survolee, si le parametre est vide ou invalide. */
    static final String COULEUR_SURVOL_DEFAUT = "#FFCC80";
    /** Couleur de fond par defaut de la ligne selectionnee, si le parametre est vide ou invalide. */
    static final String COULEUR_SELECTION_DEFAUT = "#CE93D8";

    /**
     * Couleurs de mise en evidence des lignes de liste, reglees par officine depuis l'ecran « Gestion des parametrages
     * » (cles COULEUR_SURVOL_LIGNE et COULEUR_SELECTION_LIGNE).
     *
     * Un seul appel au chargement de l'application plutot que deux : la page les pose ensuite en variables CSS. Une
     * valeur vide ou qui n'est pas un code hexadecimal est remplacee par la couleur d'origine — une saisie erronee ne
     * peut pas rendre les listes illisibles.
     */
    @GET
    @Path("couleurs-lignes")
    public Response couleursLignes() {
        JSONObject couleurs = new JSONObject()
                .put("survol",
                        couleurValide(parametreService.getValue("COULEUR_SURVOL_LIGNE", ""), COULEUR_SURVOL_DEFAUT))
                .put("selection", couleurValide(parametreService.getValue("COULEUR_SELECTION_LIGNE", ""),
                        COULEUR_SELECTION_DEFAUT));
        CacheControl cc = new CacheControl();
        cc.setNoCache(true);
        return Response.ok().cacheControl(cc).entity(couleurs.toString()).build();
    }

    /** Code hexadecimal #RGB ou #RRGGBB, sinon la valeur par defaut. */
    static String couleurValide(String valeur, String defaut) {
        String couleur = StringUtils.trimToEmpty(valeur);
        if (!couleur.startsWith("#")) {
            couleur = "#" + couleur;
        }
        return couleur.matches("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$") ? couleur.toUpperCase() : defaut;
    }

    /**
     * Detail d'un parametre par cle : MEMES cles JSON que la JSP historique sm_user/parameter/ws_data.jsp (utilisee par
     * le controller LaborexWorkFlow, ex. KEY_ACTIVATE_CONTROLE_VENTE_USER).
     */
    @GET
    @Path("detail")
    public Response detail(@DefaultValue("") @QueryParam("str_KEY") String strKey) {
        dataManager odm = new dataManager();
        String key = strKey, value = "", description = "";
        odm.initEntityManager();
        TparameterManager manager = new TparameterManager(odm);
        try {
            TParameters parametre = manager.getParameter(strKey);
            key = parametre.getStrKEY();
            value = parametre.getStrVALUE();
            description = parametre.getStrDESCRIPTION();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "detail parametre " + strKey, e);
        } finally {
            odm.closeEntityManager();
        }
        return Response.ok().entity(new JSONObject().put("success", StringUtils.defaultString(manager.getMessage()))
                .put("str_KEY", StringUtils.defaultString(key)).put("str_VALUE", StringUtils.defaultString(value))
                .put("str_DESCRIPTION", StringUtils.defaultString(description)).toString()).build();
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
            @QueryParam("type_filtre") String typeFiltre, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
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
            // typeFiltre est le choix de l'utilisateur dans l'ecran ; "type" reste la regle de visibilite
            // liee a son profil. Le premier restreint a l'interieur du second, il ne l'elargit jamais.
            List<TParameters> parametres = manager.listeParameter(StringUtils.defaultString(search), type,
                    StringUtils.trimToNull(typeFiltre));
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
     * Types de parametres proposables dans le filtre de l'ecran.
     *
     * Ils sont deduits de la MEME methode metier que la liste, et non d'une requete dediee : la regle de visibilite
     * liee au profil ne peut donc pas diverger entre les deux. Un type auquel l'utilisateur n'a pas acces n'apparait
     * jamais dans son filtre.
     */
    @GET
    @Path("types")
    public Response types() {
        TUser sessionUser = currentUser();
        if (sessionUser == null) {
            return deconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String type = commonparameter.PARAMETER_CUSTOMER;
            bll.userManagement.user ouser = new bll.userManagement.user(odm);
            TRole role = ouser.getTRoleUser(sessionUser.getLgUSERID()).getLgROLEID();
            if (role != null && (bll.userManagement.user.isSuperAdminRole(role.getStrNAME())
                    || bll.userManagement.user.isAdminRole(role.getStrNAME())
                    || commonparameter.PARAMETER_ADMIN.equalsIgnoreCase(role.getStrTYPE()))) {
                type = "%%";
            }
            TparameterManager manager = new TparameterManager(odm, sessionUser);
            java.util.Set<String> types = new java.util.TreeSet<>();
            for (TParameters p : manager.listeParameter("", type)) {
                if (StringUtils.isNotBlank(p.getStrTYPE())) {
                    types.add(p.getStrTYPE().trim());
                }
            }
            JSONArray results = new JSONArray();
            for (String t : types) {
                results.put(new JSONObject().put("str_TYPE", t));
            }
            return Response.ok().entity(new JSONObject().put("total", types.size()).put("results", results).toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "types parametres", e);
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

    /**
     * Bascule d'un parametre booleen (interrupteur de l'ecran Gestion des parametrages) : ne modifie QUE str_VALUE (la
     * description existante est conservee), avec la MEME regle d'exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT que
     * l'endpoint update. Refuse toute valeur autre que 0 ou 1.
     */
    @POST
    @Path("toggle")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response toggle(@FormParam("str_KEY") String key, @FormParam("str_VALUE") String value) {
        if (currentUser() == null) {
            return deconnecte();
        }
        String v = value != null ? value.trim() : "";
        if (!"0".equals(v) && !"1".equals(v)) {
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Valeur non booléenne").toString()).build();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TparameterManager manager = new TparameterManager(odm);
            TParameters existant = manager.getParameter(key);
            if (existant == null) {
                return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                        .put("errors", "Paramètre introuvable").toString()).build();
            }
            manager.updateParameter(key, v, existant.getStrDESCRIPTION());
            // Exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT : si l'un passe a 1, l'autre est force a 0
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
            LOG.log(Level.SEVERE, "toggle parametre", e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Impossible de mettre à jour le paramètre").toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

}
