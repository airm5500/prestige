/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.userManagement;

import bll.bllBase;
import bll.configManagement.EmplacementManagement;
import bll.eventlog.EventLogManagement;
import dal.TAlertEvent;
import dal.TAlertEventUserFone;
import dal.TEmplacement;
import dal.TLanguage;
import dal.TRole;
import dal.TRoleUser;
import dal.TUser;
import dal.TUserFone;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import javax.persistence.Query;
import toolkits.parameters.commonparameter;
import toolkits.security.Md5;
import toolkits.utils.logger;
import util.Constant;

/**
 *
 * @author Administrator
 */
public class user extends bllBase {

    public user(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void createUser(String str_LOGIN, String str_PASSWORD, int str_IDS, String str_FIRST_NAME,
            String str_LAST_NAME, String lg_ROLE_ID, String lg_Language_ID, String str_LIEU_TRAVAIL, String str_TYPE) {
        TEmplacement OTEmplacement = null;
        try {

            TUser OTUser = new TUser();

            // lg_Language_ID
            TLanguage OTLanguage = this.getOdataManager().getEm().find(TLanguage.class, lg_Language_ID);
            if (OTLanguage == null) {
                // this.buildErrorTraceMessage("Impossible de creer un " + Otable, "lg_Language_ID : " + lg_Language_ID
                // + " Invalide ");
                this.buildErrorTraceMessage("Echec. Veuillez selectionner une langue valide");
                return;
            }
            OTUser.setLgLanguageID(OTLanguage);

            // lg_USER_ID
            OTUser.setLgUSERID(this.getKey().getComplexId());
            // str_LOGIN
            OTUser.setStrLOGIN(str_LOGIN);
            // str_IDS
            OTUser.setStrIDS(str_IDS);

            // str_PASSWORD
            String Str_Password_MD5 = Md5.encode(str_PASSWORD);

            new logger().OCategory.info("Str_Password_MD5  depuis bll   " + Str_Password_MD5);

            OTUser.setStrPASSWORD(Str_Password_MD5);
            // str_FIRST_NAME
            OTUser.setStrFIRSTNAME(str_FIRST_NAME);
            // str_LAST_NAME
            OTUser.setStrLASTNAME(str_LAST_NAME);
            // str_STATUT
            OTUser.setStrSTATUT(commonparameter.statut_enable);
            OTUser.setStrTYPE(str_TYPE);
            OTUser.setBCHANGEPASSWORD(false);
            OTUser.setIntCONNEXION(0);

            OTEmplacement = this.getOdataManager().getEm().find(TEmplacement.class, str_LIEU_TRAVAIL);
            if (OTEmplacement == null) {
                this.buildErrorTraceMessage("Echec. Veuillez selectionner un lieu de travail valide");
                return;
            }

            OTUser.setLgEMPLACEMENTID(OTEmplacement);

            TRole OTRole = this.getOdataManager().getEm().find(TRole.class, lg_ROLE_ID);
            if (OTRole == null) {
                // this.buildErrorTraceMessage("Impossible de creer un " + Otable, "lg_Language_ID : " + lg_Language_ID
                // + " Invalide ");
                this.buildErrorTraceMessage("Echec. Veuillez selectionner un rôle valide");
                return;
            }
            OTUser.setStrPIC("default.png");
            this.getOdataManager().getEm().persist(OTUser);

            if (setRoleToUser(OTRole, OTUser)) { //
                this.persiste(OTUser);
                this.buildSuccesTraceMessage("Utilisateur " + OTUser.getStrFIRSTNAME() + " créé avec succes");
            } else {
                this.buildErrorTraceMessage("Echec de prise en compte du profil de l'utilisateur");
            }

        } catch (Exception Ex) {
            this.buildErrorTraceMessage("Echec de création de l'utilisateur");

        }

    }

    public void updateMyUser(String lg_USER_ID, String str_LOGIN, int str_IDS, String str_FIRST_NAME,
            String str_LAST_NAME, String lg_Language_ID, String str_LIEU_TRAVAIL, String lg_ROLE_ID) {
        TEmplacement OTEmplacement = null;
        TUser OTUser = null;
        TLanguage OTLanguage = null;
        try {
            OTUser = this.getUserById(lg_USER_ID);
            OTLanguage = this.getOdataManager().getEm().find(TLanguage.class, lg_Language_ID);
            if (OTLanguage != null) {
                OTUser.setLgLanguageID(OTLanguage);
            }

            // str_LOGIN
            OTUser.setStrLOGIN(str_LOGIN);
            // str_IDS
            OTUser.setStrIDS(str_IDS);

            // str_FIRST_NAME
            OTUser.setStrFIRSTNAME(str_FIRST_NAME);
            // str_LAST_NAME
            OTUser.setStrLASTNAME(str_LAST_NAME);
            // str_STATUT
            OTUser.setStrSTATUT(commonparameter.statut_enable);

            OTUser.setBCHANGEPASSWORD(false);
            OTUser.setIntCONNEXION(0);

            try {
                OTEmplacement = new EmplacementManagement(this.getOdataManager()).getEmplacement(str_LIEU_TRAVAIL);
            } catch (Exception e) {
                e.printStackTrace();
                OTEmplacement = this.getOdataManager().getEm().find(TEmplacement.class, "1");
            }

            new logger().OCategory.info("Emplacement " + OTEmplacement.getStrDESCRIPTION());
            OTUser.setLgEMPLACEMENTID(OTEmplacement);

            if (this.persiste(OTUser)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                TRoleUser OTRoleUser = this.getTRoleUser(lg_USER_ID);
                TRole OTRole = this.getRole(lg_ROLE_ID);

                if (OTRoleUser != null && OTRole != null) {
                    if (OTRole != OTRoleUser.getLgROLEID()) {
                        this.updateRoleUser(OTRoleUser, OTRole, OTUser);
                    } else {
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    }
                } else {
                    this.buildErrorTraceMessage("Impossible de mise à jour du rôle de l'utilisateur");
                }

            } else {
                this.buildErrorTraceMessage("Impossible de modifier cet utilisateur");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de modifier cet utilisateur");
        }

    }

    public void updatePassword(String lg_USER_ID, String str_PASSWORD) {
        try {
            TUser OTUser = this.getUserById(lg_USER_ID);

            // str_PASSWORD
            String Str_Password_MD5 = Md5.encode(str_PASSWORD);
            new logger().OCategory.info("Str_Password_MD5  depuis bll   " + Str_Password_MD5);
            OTUser.setStrPASSWORD(Str_Password_MD5);
            this.persiste(OTUser);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de réinitialiser le mot de passe de l'utilisateur sélectionné");
        }

    }

    public boolean deleteUser(String lg_USER_ID, TUser OTUserConnect) {
        boolean result = false;
        try {
            TUser OTUser = this.getUserById(lg_USER_ID);
            if (OTUser != null && OTUserConnect != null) {
                if (OTUser != OTUserConnect) {
                    this.deleteUser(OTUser, OTUserConnect);
                } else {
                    this.buildErrorTraceMessage("Impossible de supprimer un utilisateur connecté");
                }
            } else {
                this.buildErrorTraceMessage("Impossible de supprimer. Utilisateur inconnu");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer un utilisateur qui à déjà subit une action");
        }
        return result;
    }

    public boolean deleteUser(TUser OTUser, TUser OTUserConnect) {
        boolean result = false;
        try {
            TRoleUser OTRoleUser = this.getTRoleUser(OTUser.getLgUSERID());
            TRole OTRole = OTRoleUser.getLgROLEID();
            new logger().OCategory.info(OTRoleUser.getLgUSERID().getLgUSERID());
            // setRoleToUser(TRole OTRole, TUser OTUser)
            this.delete(OTRoleUser);
            if (this.delete(OTUser)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.setRoleToUser(OTRole, OTUser);
                this.buildErrorTraceMessage("Impossible de supprimer un utilisateur qui à déjà subit une action");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer un utilisateur qui à déjà subit une action");
        }
        return result;
    }

    public boolean setRoleToUser(TRole OTRole, TUser OTUser) {
        boolean result = false;
        new logger().oCategory.info("Fonction setRoleToUser");

        try {

            TRoleUser oTRoleUser = new TRoleUser();

            oTRoleUser.setLgUSERROLEID(this.getKey().getComplexId());
            oTRoleUser.setLgROLEID(OTRole);
            oTRoleUser.setLgUSERID(OTUser);
            oTRoleUser.setDtCREATED(new Date());
            this.getOdataManager().getEm().persist(oTRoleUser);
            this.buildSuccesTraceMessage("Role " + OTRole.getStrNAME() + " associé a l'utilisateur avec succes");
            return true;

        } catch (Exception Ex) {
            this.buildErrorTraceMessage("Echec d'association du role a l'utilisateur");

            return false;

        }

    }

    // mise a jour des informations du compte d'un utilisateur
    public boolean updateProfilUser(String lg_USER_ID, String str_FIRST_NAME, String str_LAST_NAME,
            String str_PASSWORD) {
        boolean result = false;
        TUser OTUser = null;
        try {
            OTUser = this.getUserById(lg_USER_ID);
            OTUser.setStrFIRSTNAME(str_FIRST_NAME);
            OTUser.setStrLASTNAME(str_LAST_NAME);
            if (!str_PASSWORD.equalsIgnoreCase("")) {
                OTUser.setStrPASSWORD(toolkits.security.Md5.encode(str_PASSWORD));
            }
            if (this.persiste(OTUser)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour des informations du compte de l'utilisateur");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour des informations du compte de l'utilisateur");
        }
        return result;
    }

    // =====================================================================
    // Detection des profils "Administrateur" / "Super Administrateur".
    // On matche par prefixe (insensible a la casse) et non par egalite stricte
    // car selon l'officine les profils peuvent etre nommes avec un suffixe
    // ("Administrateur du systeme", "Super Administrateur du systeme", ...).
    // La comparaison couvre a la fois str_NAME et str_DESIGNATION cote requete.
    // =====================================================================
    private static String normRole(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    /*
     * Faille de droits du 31/10 : un profil n'est plus special par son nom, mais par un droit P_PROFIL_* attache au
     * profil (util.RolesSpeciaux). Le nom ne sert plus qu'a refuser, a qui n'est pas super administrateur, un libelle
     * qui preterait a confusion (nomReserve).
     */

    /** Libelle reserve : « Super Administrateur… », « Administrateur… » ou « Pharmacien ». */
    public static boolean nomReserve(String name) {
        String n = normRole(name);
        return n.startsWith(commonparameter.ROLE_SUPERADMIN.toLowerCase())
                || n.startsWith(commonparameter.ROLE_ADMIN.toLowerCase())
                || n.equals(commonparameter.ROLE_PHARMACIEN.toLowerCase());
    }

    /** Profil super administrateur (droit P_PROFIL_SUPER_ADMIN). */
    public static boolean estRoleSuperAdmin(dal.TRole role) {
        return role != null && util.RolesSpeciaux.a(role.getLgROLEID(), util.RolesSpeciaux.P_SUPER_ADMIN);
    }

    /** Profil administrateur (droit P_PROFIL_ADMIN), hors super administrateur. */
    public static boolean estRoleAdmin(dal.TRole role) {
        return role != null && util.RolesSpeciaux.a(role.getLgROLEID(), util.RolesSpeciaux.P_ADMIN)
                && !estRoleSuperAdmin(role);
    }

    /** Profil pharmacien (droit P_PROFIL_PHARMACIEN). */
    public static boolean estRolePharmacien(dal.TRole role) {
        return role != null && util.RolesSpeciaux.a(role.getLgROLEID(), util.RolesSpeciaux.P_PHARMACIEN);
    }

    /** Premier profil actif de l'utilisateur, ou null. */
    public static dal.TRole roleActif(dal.TUser utilisateur) {
        if (utilisateur == null || utilisateur.getTRoleUserCollection() == null) {
            return null;
        }
        for (TRoleUser lien : utilisateur.getTRoleUserCollection()) {
            if (lien.getLgROLEID() != null
                    && commonparameter.statut_enable.equalsIgnoreCase(lien.getLgROLEID().getStrSTATUT())) {
                return lien.getLgROLEID();
            }
        }
        return null;
    }

    /** Administrateur ou super administrateur (profil actif). */
    public static boolean estAdminOuSuperAdmin(dal.TUser utilisateur) {
        dal.TRole r = roleActif(utilisateur);
        return estSuperAdmin(utilisateur) || estRoleAdmin(r);
    }

    /** Administrateur, super administrateur ou pharmacien (profil actif) : ceux qui accordent les droits ADMIN. */
    public static boolean estAdminOuPharmacien(dal.TUser utilisateur) {
        return estAdminOuSuperAdmin(utilisateur) || estRolePharmacien(roleActif(utilisateur));
    }

    /**
     * Retours du 25/10 : utilisateur super administrateur (un de ses profils actifs l'est ; l'utilisateur systeme « 00
     * » aussi). Lui seul voit le Centre de support (sauf « Me contacter ») et l'audit, les profils et comptes super
     * administrateur, et accorde les droits de type SYSTEME.
     */
    public static boolean estSuperAdmin(dal.TUser utilisateur) {
        if (utilisateur == null) {
            return false;
        }
        if ("00".equals(utilisateur.getLgUSERID())) {
            return true;
        }
        if (utilisateur.getTRoleUserCollection() == null) {
            return false;
        }
        for (TRoleUser lien : utilisateur.getTRoleUserCollection()) {
            if (lien.getLgROLEID() != null && commonparameter.statut_enable.equals(lien.getLgROLEID().getStrSTATUT())
                    && estRoleSuperAdmin(lien.getLgROLEID())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Faille de droits du 31/10 : la personne connectee n'attribue un profil, et ne gere un compte (modification, mot
     * de passe, statut, suppression), que si elle pourrait accorder elle-meme chacun des droits de ce profil. Sinon, un
     * compte qui gere les utilisateurs se donnait le profil administrateur, ou reinitialisait le mot de passe d'un
     * administrateur pour se connecter a sa place. Le super administrateur n'a pas de limite.
     */
    public static String refusGestionCompte(javax.persistence.EntityManager em, TUser connecte, String userId,
            String roleId) {
        if (estSuperAdmin(connecte)) {
            return null;
        }
        if (StringUtils.isNotBlank(roleId)) {
            TRole role = em.find(TRole.class, roleId);
            if (role == null) {
                // l'ecran historique envoie parfois le libelle du profil au lieu de son identifiant
                List<TRole> parLibelle = em
                        .createQuery("SELECT t FROM TRole t WHERE t.strNAME = ?1 OR t.strDESIGNATION = ?1", TRole.class)
                        .setParameter(1, roleId.trim()).setMaxResults(1).getResultList();
                role = parLibelle.isEmpty() ? null : parLibelle.get(0);
            }
            String refus = refusProfil(em, connecte, role);
            if (refus != null) {
                return refus;
            }
        }
        if (StringUtils.isNotBlank(userId)) {
            TUser cible = em.find(TUser.class, userId);
            if (cible != null && estSuperAdmin(cible)) {
                return "Ce compte ne peut être géré que par le super administrateur.";
            }
            if (cible != null && refusProfil(em, connecte, roleActif(cible)) != null) {
                return "Ce compte a des droits que vous ne pouvez pas accorder : seul un administrateur peut le gérer.";
            }
        }
        return null;
    }

    /** Refus d'attribuer ce profil, ou null (voir refusGestionCompte). */
    private static String refusProfil(javax.persistence.EntityManager em, TUser connecte, TRole role) {
        if (role == null) {
            return null;
        }
        if (estRoleSuperAdmin(role)) {
            return "Seul le super administrateur peut attribuer ce profil.";
        }
        boolean adminOuPharmacien = estAdminOuPharmacien(connecte);
        if ((estRoleAdmin(role) || estRolePharmacien(role)) && !adminOuPharmacien) {
            return "Ce profil ne peut être attribué que par un administrateur ou un pharmacien.";
        }
        // droits du profil hors du catalogue de la personne connectee, et qu'elle ne detient pas elle-meme
        long horsCatalogue = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM t_role_privelege rp"
                + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
                + " WHERE rp.lg_ROLE_ID = ?1 AND p.str_STATUT = 'enable' AND p.str_NAME NOT IN (?3, ?4, ?5)"
                + " AND NOT (IFNULL(p.str_TYPE, '') = 'CUSTOMER'"
                + (adminOuPharmacien ? " OR IFNULL(p.str_TYPE, '') = 'ADMIN'" : "") + ")"
                + " AND NOT EXISTS (SELECT 1 FROM t_role_user ru JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID"
                + "   JOIN t_role_privelege rp2 ON rp2.lg_ROLE_ID = ru.lg_ROLE_ID"
                + "   WHERE ru.lg_USER_ID = ?2 AND r.str_STATUT = 'enable' AND rp2.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID)")
                .setParameter(1, role.getLgROLEID()).setParameter(2, connecte.getLgUSERID())
                .setParameter(3, util.RolesSpeciaux.P_SUPER_ADMIN).setParameter(4, util.RolesSpeciaux.P_ADMIN)
                .setParameter(5, util.RolesSpeciaux.P_PHARMACIEN).getSingleResult()).longValue();
        return horsCatalogue > 0 ? "Ce profil donne des droits que vous ne pouvez pas accorder." : null;
    }

    // Profils exclus des listes (clauses NOT IN), reconnus par leur droit P_PROFIL_* et non plus par leur nom
    private static java.util.Set<String> superAdmins() {
        return util.RolesSpeciaux.roles(util.RolesSpeciaux.P_SUPER_ADMIN);
    }

    private static java.util.Set<String> admins() {
        return util.RolesSpeciaux.roles(util.RolesSpeciaux.P_SUPER_ADMIN, util.RolesSpeciaux.P_ADMIN);
    }

    public List<TRoleUser> showAllOrOneEmplacement(String search_value, String lg_USER_ID, String lg_EMPLACEMENT_ID,
            TRole roleConnecte, boolean etat, int start, int limit) {
        List<TRoleUser> lstTRoleUser = new ArrayList<>();
        try {

            if (search_value == null || search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (estRoleSuperAdmin(roleConnecte)) {
                lg_EMPLACEMENT_ID = "%%";
                lstTRoleUser = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 ORDER BY t.lgUSERID.strFIRSTNAME ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID)
                        .setParameter(4, lg_EMPLACEMENT_ID).setParameter(3, commonparameter.statut_enable)
                        .setFirstResult(start).setMaxResults(limit).getResultList();
            } else if (estRoleAdmin(roleConnecte)) {
                // L'administrateur voit tous les utilisateurs, sauf les super administrateurs (retours du 25/10)
                if (etat) {
                    lg_EMPLACEMENT_ID = "%%";
                }
                lstTRoleUser = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.lgROLEID NOT IN ?5 ORDER BY t.lgUSERID.strFIRSTNAME ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID)
                        .setParameter(4, lg_EMPLACEMENT_ID).setParameter(3, commonparameter.statut_enable)
                        .setParameter(5, superAdmins()).setFirstResult(start).setMaxResults(limit).getResultList();
            } else {
                // Les autres profils ne voient ni l'administrateur ni le super administrateur
                if (etat) {
                    lg_EMPLACEMENT_ID = "%%";
                }

                lstTRoleUser = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.lgROLEID NOT IN ?5 ORDER BY t.lgUSERID.strFIRSTNAME ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID)
                        .setParameter(4, lg_EMPLACEMENT_ID).setParameter(5, admins())
                        .setParameter(3, commonparameter.statut_enable).setFirstResult(start).setMaxResults(limit)
                        .getResultList();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTUser taille " + lstTRoleUser.size());
        return lstTRoleUser;
    }

    public List<TRoleUser> showAllOrOneEmplacement(String search_value, String lg_USER_ID, String lg_EMPLACEMENT_ID,
            TRole roleConnecte, boolean etat) {
        List<TRoleUser> lstTRoleUser = new ArrayList<TRoleUser>();
        try {

            if (search_value == null || search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (estRoleSuperAdmin(roleConnecte)) {
                lg_EMPLACEMENT_ID = "%%";
                lstTRoleUser = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 ORDER BY t.lgUSERID.strFIRSTNAME ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID)
                        .setParameter(4, lg_EMPLACEMENT_ID).setParameter(3, commonparameter.statut_enable)
                        .getResultList();
            } else if (estRoleAdmin(roleConnecte)) {
                // L'administrateur voit tous les utilisateurs, sauf les super administrateurs (retours du 25/10)
                if (etat) {
                    lg_EMPLACEMENT_ID = "%%";
                }
                lstTRoleUser = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.lgROLEID NOT IN ?5 ORDER BY t.lgUSERID.strFIRSTNAME ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID)
                        .setParameter(4, lg_EMPLACEMENT_ID).setParameter(3, commonparameter.statut_enable)
                        .setParameter(5, superAdmins()).getResultList();
            } else {
                // Les autres profils ne voient ni l'administrateur ni le super administrateur
                if (etat) {
                    lg_EMPLACEMENT_ID = "%%";
                }

                lstTRoleUser = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.lgROLEID NOT IN ?5 ORDER BY t.lgUSERID.strFIRSTNAME ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID)
                        .setParameter(4, lg_EMPLACEMENT_ID).setParameter(5, admins())
                        .setParameter(3, commonparameter.statut_enable).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTUser taille " + lstTRoleUser.size());
        return lstTRoleUser;
    }
    // fin liste des utillisateurs d'un emplacements possible de l'office

    // liste des roles
    public List<TRole> lstTRoles(String search_value, String lg_ROLE_ID, TRole roleConnecte) {
        List<TRole> lstTRole = new ArrayList<TRole>();
        try {

            if (search_value == null || search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (estRoleSuperAdmin(roleConnecte)) {
                // Le super administrateur voit tous les profils
                lstTRole = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRole t WHERE t.lgROLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESIGNATION LIKE ?2) AND t.strSTATUT='enable' ORDER BY t.strDESIGNATION")
                        .setParameter(1, lg_ROLE_ID).setParameter(2, search_value + "%").getResultList();
            } else if (estRoleAdmin(roleConnecte)) {
                // L'administrateur voit tous les profils sauf le super administrateur (retours du 25/10)
                lstTRole = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRole t WHERE t.lgROLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESIGNATION LIKE ?2) AND t.lgROLEID NOT IN ?3 AND t.strSTATUT='enable' ORDER BY t.strDESIGNATION")
                        .setParameter(1, lg_ROLE_ID).setParameter(2, search_value + "%").setParameter(3, superAdmins())
                        .getResultList();
            } else {
                // Les autres profils ne voient ni le profil administrateur ni le super administrateur
                lstTRole = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRole t WHERE t.lgROLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESIGNATION LIKE ?2) AND t.lgROLEID NOT IN ?3 AND t.strSTATUT='enable' ORDER BY t.strDESIGNATION")
                        .setParameter(1, lg_ROLE_ID).setParameter(2, search_value + "%").setParameter(3, admins())
                        .getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTRole taille " + lstTRole.size());
        return lstTRole;
    }
    // fin liste des roles

    // recuperer un role
    public TRole getRole(String search_value) {
        TRole OTRole = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            OTRole = (TRole) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRole t WHERE (t.strNAME LIKE ?1 OR t.lgROLEID LIKE ?1 OR t.strDESIGNATION LIKE ?1) AND t.strSTATUT LIKE ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("Role " + OTRole.getStrDESIGNATION());
        return OTRole;
    }
    // fin recuperer un role

    // recuperer du role d'un user
    public TRoleUser getTRoleUser(String userId) {

        TUser user = this.getOdataManager().getEm().find(TUser.class, userId);
        if (user.getLgUSERID().equals("00")) {
            return user.getTRoleUserCollection().stream().findFirst().orElse(null);
        }
        return user.getTRoleUserCollection().stream()
                .filter(e -> e.getLgROLEID().getStrSTATUT().equals(Constant.STATUT_ENABLE)).findFirst().orElse(null);

    }
    // fin recuperer du role d'un user

    // mise a jour du role d'un user
    public boolean updateRoleUser(TRoleUser OTRoleUser, TRole OTRole, TUser OTUser) {
        boolean result = false;
        try {
            if (OTRoleUser != null) {
                this.delete(OTRoleUser);
                TRoleUser OTRoleUser1 = new TRoleUser();
                OTRoleUser1.setLgUSERROLEID(this.getKey().getComplexId());
                OTRoleUser1.setLgROLEID(OTRole);
                OTRoleUser1.setLgUSERID(OTUser);
                OTRoleUser1.setDtCREATED(new Date());
                this.persiste(OTRoleUser1);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise a jour du role de cet utilisateur");
        }
        return result;
    }

    public TUser getUserById(String lg_USER_ID) {
        TUser OTUser = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TUser t WHERE t.lgUSERID LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1")
                    .setParameter(1, lg_USER_ID).setMaxResults(1);
            if (qry.getResultList().size() > 0) {
                OTUser = (TUser) qry.getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTUser;
    }
    // fin recuperation d'un utilisateur par son id

    public boolean createUserPhone(String lg_USER_ID, String str_PHONE) {
        boolean result = false;

        List<TAlertEvent> lstTAlertEvent = new ArrayList<TAlertEvent>();
        EventLogManagement OEventLogManagement = new EventLogManagement(this.getOdataManager());
        try {
            TUser OTUser = this.getUserById(lg_USER_ID);
            TUserFone OTUserFone = new TUserFone();
            OTUserFone.setLgUSERFONEID(this.getKey().getComplexId());
            OTUserFone.setStrPHONE(str_PHONE);
            OTUserFone.setStrSTATUT(commonparameter.statut_enable);
            OTUserFone.setLgUSERID(OTUser);
            OTUserFone.setDtCREATED(new Date());
            if (this.persiste(OTUserFone)) {
                lstTAlertEvent = OEventLogManagement.getListeAlertEvent();
                for (TAlertEvent OTAlertEvent : lstTAlertEvent) {
                    OEventLogManagement.createAlertEventUserPhone(OTAlertEvent.getStrEvent(),
                            OTUserFone.getLgUSERFONEID());
                }
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de l'opérateur");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'enregistrement du contact de l'utilisateur sélectionnné");
        }
        return result;
    }

    public boolean updateUserPhone(String lg_USER_FONE_ID, String str_PHONE) {
        boolean result = false;

        List<TAlertEventUserFone> lstTAlertEventUserFone = new ArrayList<TAlertEventUserFone>();
        EventLogManagement OEventLogManagement = new EventLogManagement(this.getOdataManager());
        try {
            TUserFone OTUserFone = this.getOdataManager().getEm().find(TUserFone.class, lg_USER_FONE_ID);
            OTUserFone.setStrPHONE(str_PHONE);
            OTUserFone.setDtUPDATED(new Date());
            if (this.persiste(OTUserFone)) {
                lstTAlertEventUserFone = OEventLogManagement.getListeAlertEventUserFone(lg_USER_FONE_ID);
                for (TAlertEventUserFone OTAlertEventUserFone : lstTAlertEventUserFone) {
                    OEventLogManagement.updateAlertEventUserPhone(OTAlertEventUserFone,
                            OTAlertEventUserFone.getStrEvent(), OTUserFone);
                }
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du contact de l'utilisateur sélectionnné");
        }
        return result;
    }

    public boolean removeUserPhone(String lg_USER_FONE_ID) {
        boolean result = false;
        List<TAlertEventUserFone> lstTAlertEventUserFone = new ArrayList<TAlertEventUserFone>();
        EventLogManagement OEventLogManagement = new EventLogManagement(this.getOdataManager());
        try {
            lstTAlertEventUserFone = OEventLogManagement.getListeAlertEventUserFone(lg_USER_FONE_ID);
            for (TAlertEventUserFone OTAlertEventUserFone : lstTAlertEventUserFone) {
                OEventLogManagement.removeAlertEventUserPhone(OTAlertEventUserFone);
            }
            TUserFone OTUserFone = this.getOdataManager().getEm().find(TUserFone.class, lg_USER_FONE_ID);
            this.delete(OTUserFone);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du contact de l'utilisateur sélectionnné");
        }
        return result;
    }

    public boolean createRole(String str_NAME, String str_DESIGNATION, String str_TYPE) {
        boolean result = false;
        try {
            TRole OTRole = new TRole();
            OTRole.setLgROLEID(this.getKey().getComplexId());
            OTRole.setStrDESIGNATION(str_DESIGNATION);
            OTRole.setStrNAME(str_NAME);
            OTRole.setStrTYPE(str_TYPE);
            OTRole.setStrSTATUT(commonparameter.statut_enable);
            OTRole.setDtCREATED(new Date());
            if (this.persiste(OTRole)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de ce rôle");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de ce rôle");
        }
        return result;
    }

    public boolean updateRole(String lg_ROLE_ID, String str_NAME, String str_DESIGNATION, String str_TYPE) {
        boolean result = false;
        try {
            TRole OTRole = this.getRole(lg_ROLE_ID);
            OTRole.setStrDESIGNATION(str_DESIGNATION);
            OTRole.setStrNAME(str_NAME);
            OTRole.setStrTYPE(str_TYPE);
            OTRole.setDtUPDATED(new Date());
            if (this.persiste(OTRole)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de ce rôle");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de ce rôle");
        }
        return result;
    }

    public boolean deleteRole(String lg_ROLE_ID) {
        boolean result = false;
        try {
            TRole OTRole = this.getRole(lg_ROLE_ID);

            if (this.delete(OTRole)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de suppression de ce rôle");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de ce rôle");
        }
        return result;
    }

}
