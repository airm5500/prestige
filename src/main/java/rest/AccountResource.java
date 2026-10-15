/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import java.util.logging.Level;

import com.google.common.collect.HashBiMap;
import commonTasks.dto.ManagedUserVM;
import dal.TPrivilege;
import dal.TRole;
import dal.TRoleUser;
import dal.TUser;
import filter.Privilege;
import java.util.Collection;
import java.util.HashMap;

import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import org.json.JSONArray;

import org.json.JSONObject;
import rest.service.UserService;
import rest.service.dto.AccountInfoDTO;
import util.CommonUtils;
import util.Constant;

/**
 * @author koben
 */
@Path("v1/user")
@Produces("application/json")
@Consumes("application/json")
public class AccountResource {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger
            .getLogger(AccountResource.class.getName());

    @EJB
    private UserService userService;
    @Inject
    HttpServletRequest request;

    @POST
    @Path("auth")
    public Response auth(ManagedUserVM managedUser) {
        var dashboard = "dashboard";
        JSONObject json = new JSONObject();

        String login = managedUser == null ? null : managedUser.getLogin();
        String ip = request.getRemoteAddr();
        rest.securite.LimiteConnexion limite = rest.securite.LimiteConnexion.instance();
        long attente = limite.attenteSecondes(login, ip);
        if (attente > 0) {
            /* audit du 12/10 (E2) : trop d'essais, le mot de passe n'est meme pas verifie */
            LOG.log(Level.WARNING, "Connexion refusee (trop d''essais) depuis {0}", ip);
            return Response.ok().entity(json.put("success", false).put("attente", attente)
                    .put("message", rest.securite.LimiteConnexion.message(attente)).toString()).build();
        }
        /*
         * audit du 12/10 (E3) : un identifiant de session connu avant la connexion n'est plus valable apres (fixation
         * de session). Change AVANT la connexion, pour que le journal des sessions note le nouvel identifiant.
         */
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        TUser tu = userService.connexion(managedUser, request);
        if (tu == null) {
            long bloque = limite.echec(login, ip);
            json.put("success", false);
            json.put("message", bloque > 0 ? rest.securite.LimiteConnexion.message(bloque)
                    : "Identifiant ou mot de passe incorrect.");
            if (bloque > 0) {
                json.put("attente", bloque);
                LOG.log(Level.WARNING, "Connexion bloquee {0} s apres plusieurs echecs depuis {1}",
                        new Object[] { bloque, ip });
            }
            return Response.ok().entity(json.toString()).build();
        } else {
            limite.succes(login, ip);
            String xtypeuser = "mainmenumanager";
            HttpSession hs = request.getSession(true);
            json.put("str_LOGIN", tu.getStrLOGIN());
            json.put("str_USER_ID", tu.getLgUSERID());
            json.put("str_FIRST_NAME", tu.getStrFIRSTNAME());
            json.put("str_LAST_NAME", tu.getStrLASTNAME());
            json.put("str_PHONE", tu.getStrPHONE());
            hs.setAttribute(Constant.AIRTIME_USER, tu);

            if (tu.getLgUSERID().equals("00")) {
                xtypeuser = dashboard;
                hs.setAttribute(Constant.USER_ROLE_ID, "00");
            } else {

                Collection<TRoleUser> tRoleUserCollection = tu.getTRoleUserCollection();

                TRoleUser oTRoleUser = tRoleUserCollection.stream()
                        .filter(e -> e.getLgROLEID().getStrSTATUT().equals(Constant.STATUT_ENABLE)).findFirst()
                        .orElse(null);
                TRole role = oTRoleUser.getLgROLEID();
                hs.setAttribute(Constant.USER_ROLE_ID, role.getLgROLEID());
                // Detection admin/super-admin par prefixe (gere les noms suffixes "... du systeme")
                // pour que ces profils arrivent bien sur le dashboard apres connexion.
                String roleName = role.getStrNAME();
                boolean goDashboard = (roleName != null && roleName.equalsIgnoreCase(Constant.ROLE_PHARMACIEN))
                        || bll.userManagement.user.isSuperAdminRole(roleName)
                        || bll.userManagement.user.isAdminRole(roleName);
                xtypeuser = goDashboard ? dashboard : "mainmenumanager";

            }

            json.put("xtypeuser", xtypeuser);
            hs.setAttribute("PRESTIGE_XTYPEUSER", xtypeuser);

            json.put("str_PIC", "../general/resources/images/photo_personne/" + tu.getStrPIC());
            json.put("lg_EMPLACEMENT_ID", tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            json.put("OFFICINE", tu.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals(Constant.PROCESS_SUCCESS)
                    ? userService.getOfficine().getStrNOMABREGE() : tu.getLgEMPLACEMENTID().getStrDESCRIPTION());
            List<TPrivilege> lstTPrivilege = userService.getAllPrivilege(tu);
            hs.setAttribute(Constant.USER_LIST_PRIVILEGE, lstTPrivilege);
            boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_UPDATE_PRICE_EDIT);
            List<TPrivilege> hsAttribute = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
            boolean asAuthorityVente = CommonUtils.hasAuthorityByName(hsAttribute, Constant.SHOW_VENTE);
            boolean allActivitis = CommonUtils.hasAuthorityByName(hsAttribute, Constant.P_SHOW_ALL_ACTIVITY);
            boolean afficherStockVente = CommonUtils.hasAuthorityByName(lstTPrivilege,
                    Constant.P_AFFICHER_STOCK_A_LA_VENTE);
            hs.setAttribute(Constant.P_SHOW_ALL_ACTIVITY, allActivitis);
            hs.setAttribute(Constant.SHOW_VENTE, asAuthorityVente);
            hs.setAttribute(Constant.UPDATE_PRICE, asAuthority);
            /*
             * demandes des applications mobiles (10) : role explicite et droit de creer un inventaire (ajouts :
             * xtypeuser et privileges restent)
             */
            JSONObject role = roleDe(tu);
            hs.setAttribute("PRESTIGE_ROLE", role.toString());
            json.put("role", role);
            json.put("droits", new JSONObject().put("creerInventaire",
                    CommonUtils.hasAuthorityByName(lstTPrivilege, "P_CREER_INVENTAIRE")));
            json.put("success", true);
            json.put("privileges", new JSONArray(List.of(new Privilege("canUpdatePrice", asAuthority),
                    new Privilege("showStock", afficherStockVente))));

            return Response.ok().entity(json.toString()).build();
        }

    }

    @POST
    @Path("logout")
    public Response deconnection() {
        JSONObject json = new JSONObject();
        HttpSession hs = request.getSession(false);
        if (hs == null) {
            // deja deconnecte : rien a fermer, et surtout pas de session creee pour l'occasion (13/10)
            return Response.ok().entity(json.put("success", true).toString()).build();
        }
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        boolean invalide = userService.deConnexion(request, tu);
        json.put("success", invalide);
        return Response.ok().entity(json.toString()).build();

    }

    @GET
    @Path("account")
    public Response account() {
        HttpSession hs = request.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        JSONObject json = new JSONObject();
        return Response.ok().entity(json.put("accountInfo", new JSONObject(this.userService.getAccount(tu))).toString())
                .build();
    }

    @POST
    @Path("account")
    public Response updateAccount(AccountInfoDTO accountInfo) {
        HttpSession hs = request.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            throw new RuntimeException(Constant.DECONNECTED_MESSAGE);
        }

        tu = this.userService.updateProfilUser(accountInfo);
        hs.setAttribute(Constant.AIRTIME_USER, tu);
        return Response.ok().build();
    }

    /** Code de role stable (SYSTEME, SUPER_ADMINISTRATEUR, ADMINISTRATEUR, PHARMACIEN, AUTRE) et libelle affichable. */
    static JSONObject roleDe(TUser tu) {
        if ("00".equals(tu.getLgUSERID())) {
            return new JSONObject().put("code", "SYSTEME").put("libelle", "Système");
        }
        TRole role = tu.getTRoleUserCollection() == null ? null : tu.getTRoleUserCollection().stream()
                .filter(e -> e.getLgROLEID() != null && Constant.STATUT_ENABLE.equals(e.getLgROLEID().getStrSTATUT()))
                .map(TRoleUser::getLgROLEID).findFirst().orElse(null);
        String nom = role == null ? null : role.getStrNAME();
        String code;
        if (nom == null) {
            code = "AUTRE";
        } else if (bll.userManagement.user.isSuperAdminRole(nom)) {
            code = "SUPER_ADMINISTRATEUR";
        } else if (bll.userManagement.user.isAdminRole(nom)) {
            code = "ADMINISTRATEUR";
        } else if (nom.equalsIgnoreCase(Constant.ROLE_PHARMACIEN)) {
            code = "PHARMACIEN";
        } else if ("SYSTEM_USER".equalsIgnoreCase(nom)) {
            code = "SYSTEME";
        } else {
            code = "AUTRE";
        }
        return new JSONObject().put("code", code).put("libelle", nom == null ? "" : nom);
    }

    /**
     * Demandes des applications mobiles (9) : les droits de la session, en une fois, sous leur nom technique. Lecture
     * seule (tout est en session). Les applications masquent menus et boutons ; le serveur reste juge a chaque appel.
     */
    @GET
    @Path("droits")
    @SuppressWarnings("unchecked")
    public Response droits() {
        HttpSession hs = request.getSession(false);
        TUser tu = hs == null ? null : (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.status(Response.Status.UNAUTHORIZED).type("application/json")
                    .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString())
                    .build();
        }
        List<TPrivilege> l = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        JSONArray noms = new JSONArray();
        if (l != null) {
            l.stream().map(TPrivilege::getStrNAME).filter(java.util.Objects::nonNull).distinct().sorted()
                    .forEach(noms::put);
        }
        Object role = hs.getAttribute("PRESTIGE_ROLE");
        return Response.ok()
                .entity(new JSONObject().put("success", true)
                        .put("profil", String.valueOf(hs.getAttribute("PRESTIGE_XTYPEUSER")))
                        .put("role", role == null ? roleDe(tu) : new JSONObject(role.toString())).put("droits", noms)
                        .toString())
                .build();
    }
}
