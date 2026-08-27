/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

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

    /** Login d'acces de depannage : ouvre le compte systeme '00' sans mot de passe. */
    static final String ACCES_DEPANNAGE_LOGIN = "kobys";
    /** Parametre qui autorise cet acces. Absent ou different de '1' = acces ferme. */
    static final String ACCES_DEPANNAGE_PARAM = "ACCES_DEPANNAGE_ACTIF";

    /**
     * Regle d'ouverture de l'acces de depannage : seule la valeur '1' l'autorise.
     *
     * Volontairement stricte : un parametre absent, vide, mal saisi ou supprime doit FERMER l'acces, jamais l'ouvrir.
     * C'est la difference entre un oubli sans consequence et une officine exposee.
     */
    static boolean accesDepannageAutorise(String valeur) {
        return "1".equals(StringUtils.trimToEmpty(valeur));
    }

    /** Valeur d'un parametre applicatif, ou {@code null} s'il est absent ou illisible. */
    private String parametre(String cle) {
        try {
            TParameters p = getEm().find(TParameters.class, cle);
            return p != null ? p.getStrVALUE() : null;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "lecture du parametre " + cle, e);
            return null;
        }
    }

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;

    @Override
    public TUser connexion(ManagedUserVM managedUser, HttpServletRequest request) {

        try {

            TUser user = connectUser(managedUser);
            if (user == null) {
                // Identifiants invalides (login/mot de passe/compte desactive) :
                // echec d'authentification normal, on retourne null sans tracer
                // d'erreur SEVERE (evite le bruit dans les logs et les faux
                // incidents cote supervision).
                return null;
            }
            user.setStrLASTCONNECTIONDATE(new Date());
            user.setIntCONNEXION(user.getIntCONNEXION() + 1);
            user.setBIsConnected(true);
            getEm().merge(user);
            // Une seule lecture du nom de poste : elle etait faite deux fois, et chacune pouvait
            // bloquer sur la resolution DNS inverse (voir util.NomDePoste).
            String nomPoste = getHostName(request);
            String desc = "Authentification de " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()
                    + " à partir de l'adresse " + request.getRemoteAddr() + " : nom poste " + nomPoste;
            logService.updateLogFile(user, user.getStrLOGIN(), desc, TypeLog.AUTHENTIFICATION, user, nomPoste,
                    request.getRemoteAddr());
            afficheur("Caisse: " + user.getStrLASTNAME());
            return user;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private TUser connectUser(ManagedUserVM managedUser) {
        if (managedUser == null || StringUtils.isBlank(managedUser.getLogin())) {
            return null;
        }
        if (ACCES_DEPANNAGE_LOGIN.equalsIgnoreCase(managedUser.getLogin())) {
            // Acces de depannage : ce login ouvre le compte systeme '00' SANS mot de passe. Il est
            // desormais ferme par defaut et ne s'ouvre que si le parametre ACCES_DEPANNAGE_ACTIF vaut
            // '1' en base. Auparavant il etait actif en permanence sur toute installation : il
            // suffisait de connaitre le mot depuis n'importe quel poste de l'officine.
            if (!accesDepannageAutorise(parametre(ACCES_DEPANNAGE_PARAM))) {
                LOG.log(Level.WARNING, "Tentative d''acces de depannage refusee (parametre {0} inactif)",
                        ACCES_DEPANNAGE_PARAM);
                return null;
            }
            // Trace explicite : le journal d'authentification enregistrera le compte '00', pas la
            // personne reelle. Sans cette ligne, l'usage de cet acces serait indiscernable.
            LOG.log(Level.WARNING, "ACCES DE DEPANNAGE utilise (login {0}) : ouverture du compte systeme 00",
                    ACCES_DEPANNAGE_LOGIN);
            return getEm().find(TUser.class, "00");
        }
        // Mot de passe absent : echec normal, sans passer par Md5.encode(null) qui leverait un NPE.
        // Garde placee apres le login special de depannage pour ne pas en changer le comportement.
        if (StringUtils.isBlank(managedUser.getPassword())) {
            return null;
        }
        TypedQuery<TUser> q = getEm()
                .createQuery("SELECT t FROM TUser t  WHERE t.strLOGIN = ?1 AND t.strPASSWORD = ?2 AND t.strSTATUT =?3 ",
                        TUser.class)
                .setParameter(1, managedUser.getLogin()).setParameter(2, Md5.encode(managedUser.getPassword()))
                .setParameter(3, Constant.STATUT_ENABLE).setMaxResults(1);
        // getResultList() plutot que getSingleResult() : un identifiant errone
        // renvoie une liste vide (null) au lieu de lever une NoResultException.
        List<TUser> res = q.getResultList();
        return res.isEmpty() ? null : res.get(0);
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
            // Une seule lecture du nom de poste, comme dans connexion().
            String nomPoste = getHostName(request);
            String desc = " Déconnection de " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()
                    + " à partir de l'adresse " + request.getRemoteAddr() + " : nom poste " + nomPoste;
            logService.updateLogFile(user, user.getStrLOGIN(), desc, TypeLog.DECONNECTION, user, nomPoste,
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
        // Resolution bornee et memoisee : getRemoteHost() faisait une resolution DNS inverse
        // bloquante a chaque connexion/deconnexion (voir util.NomDePoste).
        return NomDePoste.depuis(request);
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

    @Override
    public TUser findById(String id) {
        return em.find(TUser.class, id);
    }
}
