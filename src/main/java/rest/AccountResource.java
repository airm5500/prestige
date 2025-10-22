/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

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

    @EJB
    private UserService userService;
    @Inject
    HttpServletRequest request;

    @POST
    @Path("auth")
    public Response auth(ManagedUserVM managedUser) {
        var dashboard = "dashboard";
        JSONObject json = new JSONObject();

        TUser tu = userService.connexion(managedUser, request);
        if (tu == null) {
            json.put("success", false);
            return Response.ok().entity(json.toString()).build();
        } else {
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
                xtypeuser = (role.getStrNAME().equalsIgnoreCase(Constant.ROLE_PHARMACIEN)
                        || role.getStrNAME().equalsIgnoreCase(Constant.ROLE_SUPERADMIN)
                        || role.getStrNAME().equalsIgnoreCase(Constant.ROLE_ADMIN) ? dashboard : "mainmenumanager");

            }

            json.put("xtypeuser", xtypeuser);

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
        HttpSession hs = request.getSession();
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
}
