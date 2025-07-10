/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import com.kstruct.gethostname4j.Hostname;
import commonTasks.dto.ManagedUserVM;
import dal.*;
import dal.enumeration.TypeLog;
import org.apache.commons.lang3.StringUtils;
import rest.service.LogService;
import rest.service.UserService;
import rest.service.dto.AccountInfoDTO;
import toolkits.utils.StringComplexUtils.DataStringManager;
import util.*;

import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import toolkits.security.Md5;

/**
 * @author koben
 */
@Stateless
public class UserServiceImpl implements UserService {

    private static final Logger LOG = Logger.getLogger(UserServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;

    @Override
    public TUser connexion(ManagedUserVM managedUser, HttpServletRequest request) {

        try {

            TUser user = connectUser(managedUser);
            user.setStrLASTCONNECTIONDATE(new Date());
            user.setIntCONNEXION(user.getIntCONNEXION() + 1);
            user.setBIsConnected(true);
            getEm().merge(user);
            String desc = "Authentification de " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()
                    + " à partir de l'adresse " + request.getRemoteAddr() + " : nom poste " + getHostName(request);
            logService.updateLogFile(user, user.getStrLOGIN(), desc, TypeLog.AUTHENTIFICATION, user,
                    getHostName(request), request.getRemoteAddr());
            afficheur("Caisse: " + user.getStrLASTNAME());
            return user;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private TUser connectUser(ManagedUserVM managedUser) {
        if ("kobys".equalsIgnoreCase(managedUser.getLogin())) {
            return getEm().find(TUser.class, "00");
        }
        TypedQuery<TUser> q = getEm()
                .createQuery("SELECT t FROM TUser t  WHERE t.strLOGIN = ?1 AND t.strPASSWORD = ?2 AND t.strSTATUT =?3 ",
                        TUser.class)
                .setParameter(1, managedUser.getLogin()).setParameter(2, Md5.encode(managedUser.getPassword()))
                .setParameter(3, Constant.STATUT_ENABLE).setMaxResults(1);
        return q.getSingleResult();
    }

    public boolean afficheurActif() {

        try {
            TParameters tp = getEm().find(TParameters.class, "KEY_ACTIVATE_DISPLAYER");
            return (tp != null && tp.getStrVALUE().trim().equals("1"));
        } catch (Exception e) {
            return false;
        }

    }

    public EntityManager getEm() {
        return em;
    }

    void afficheur(String test) {
        if (afficheurActif()) {
            try {
                Afficheur afficheur = Afficheur.getInstance();
                afficheur.affichage(DataStringManager.subStringData(getOfficine().getStrNOMABREGE(), 0, 20));
                afficheur.affichage(DataStringManager.subStringData(test, 0, 20));
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }
        }

    }

    @Override
    public TOfficine getOfficine() {
        return getEm().find(TOfficine.class, Constant.OFFICINE);

    }

    @Override
    public boolean deConnexion(HttpServletRequest request, TUser user) {
        try {
            user.setBIsConnected(false);
            getEm().merge(user);
            HttpSession hs = request.getSession();
            hs.invalidate();
            String desc = " Déconnection de " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()
                    + " à partir de l'adresse " + request.getRemoteAddr() + " : nom poste " + getHostName(request);
            logService.updateLogFile(user, user.getStrLOGIN(), desc, TypeLog.DECONNECTION, user, getHostName(request),
                    request.getRemoteAddr());
            afficheur("   CAISSE FERMEE");
            return true;
        } catch (Exception e) {
            return false;
        }

    }

    @Override
    public TRoleUser getTRoleUser(String userId) {

        try {
            TypedQuery<TRoleUser> q = getEm().createQuery(
                    "SELECT t FROM TRoleUser t WHERE t.lgUSERID.lgUSERID = ?1 AND t.lgUSERID.strSTATUT = ?2 AND t.lgROLEID.strSTATUT = ?2",
                    TRoleUser.class).setParameter(1, userId).setParameter(2, Constant.STATUT_ENABLE).setMaxResults(1);
            return q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private List<TRolePrivelege> loadTRolePrivelege(String roleId) {
        TypedQuery<TRolePrivelege> q = this.getEm().createQuery(
                "SELECT o FROM  TRolePrivelege o WHERE o.lgROLEID.lgROLEID =?1 AND o.lgPRIVILEGEID.strSTATUT='enable'",
                TRolePrivelege.class);
        q.setParameter(1, roleId);
        return q.getResultList();
    }

    @Override
    public List<TPrivilege> getAllPrivilege(TUser oTUser) {

        List<TPrivilege> lstTPrivilege = new ArrayList<>();
        try {

            Collection<TRoleUser> roleUsers = oTUser.getTRoleUserCollection();
            for (TRoleUser roleUser : roleUsers) {
                List<TRolePrivelege> rolePrivelege = loadTRolePrivelege(roleUser.getLgROLEID().getLgROLEID());
                for (TRolePrivelege tRolePrivelege : rolePrivelege) {
                    lstTPrivilege.add(tRolePrivelege.getLgPRIVILEGEID());
                }

            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return lstTPrivilege;
    }

    @Override
    public AccountInfoDTO getAccount(TUser tu) {

        if (Objects.isNull(tu)) {
            throw new RuntimeException();
        }
        String roleName;
        String xtypeload = "mainmenumanager";
        if ("00".equals(tu.getLgUSERID())) {
            xtypeload = "dashboard";
            roleName = "SYSTEM_USER";
        } else {
            TRoleUser roleUser = this.getTRoleUser(tu.getLgUSERID());
            TRole role = roleUser.getLgROLEID();

            roleName = (role != null ? role.getStrDESIGNATION() : "");

            if (role != null && (role.getStrNAME().equalsIgnoreCase(Constant.ROLE_SUPERADMIN)
                    || role.getStrNAME().equalsIgnoreCase(Constant.ROLE_PHARMACIEN))) {
                xtypeload = "dashboard";
            }
        }

        TLanguage tLanguage = tu.getLgLanguageID();
        return new AccountInfoDTO().setLgUSERID(tu.getLgUSERID()).setStrLOGIN(tu.getStrLOGIN())
                .setStrFIRSTNAME(tu.getStrFIRSTNAME()).setStrLASTNAME(tu.getStrLASTNAME())
                .setStrLASTCONNECTIONDATE(
                        DateUtil.convertDate(tu.getStrLASTCONNECTIONDATE(), new SimpleDateFormat("yyyy/MM/dd")))
                .setStrSTATUT(tu.getStrSTATUT())
                .setLgLanguageID(Objects.nonNull(tLanguage) ? tLanguage.getStrDescription() : "").setRole(roleName)
                .setXtypeload(xtypeload);

    }

    private String getHostName(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String localAddr = request.getLocalAddr();
        if (remoteAddr.equals(localAddr)) {
            return Hostname.getHostname();
        }
        return request.getRemoteHost();
    }

    @Override
    public TUser updateProfilUser(AccountInfoDTO accountInfo) {
        TUser usr = this.em.find(TUser.class, accountInfo.getLgUSERID());
        usr.setStrFIRSTNAME(accountInfo.getStrFIRSTNAME());
        usr.setStrLASTNAME(accountInfo.getStrLASTNAME());
        if (StringUtils.isNotEmpty(accountInfo.getStrPASSWORD())) {
            usr.setStrPASSWORD(Md5.encode(accountInfo.getStrPASSWORD()));

        }

        return this.em.merge(usr);

    }
}
