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
import dal.TNotification;
import dal.TRole;
import dal.TRoleUser;
import dal.TUser;
import dal.TUserFone;
import dal.dataManager;
import dal.jconnexion;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import javax.persistence.Query;
import toolkits.parameters.commonparameter;
import toolkits.security.Md5;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author Administrator
 */
public class user extends bllBase {

    Object Otable = TUser.class;

    public user(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void createUser(String str_LOGIN, String str_PASSWORD, int str_IDS, String str_FIRST_NAME, String str_LAST_NAME, String lg_ROLE_ID, String lg_Language_ID, String str_LIEU_TRAVAIL, String str_TYPE) {
        TEmplacement OTEmplacement = null;
        try {

            TUser OTUser = new TUser();

            // lg_Language_ID
            TLanguage OTLanguage = this.getOdataManager().getEm().find(TLanguage.class, lg_Language_ID);
            if (OTLanguage == null) {
                //this.buildErrorTraceMessage("Impossible de creer un " + Otable, "lg_Language_ID : " + lg_Language_ID + "  Invalide ");
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
                //this.buildErrorTraceMessage("Impossible de creer un " + Otable, "lg_Language_ID : " + lg_Language_ID + "  Invalide ");
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

    public void updateMyUser(String lg_USER_ID, String str_LOGIN, int str_IDS, String str_FIRST_NAME, String str_LAST_NAME, String lg_Language_ID, String str_LIEU_TRAVAIL, String lg_ROLE_ID) {
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
            //setRoleToUser(TRole OTRole, TUser OTUser) 
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

    public void updateUser(String lg_USER_ID, Integer str_IDS, String str_LOGIN, String str_PASSWORD, String str_FIRST_NAME, String str_LAST_NAME, Object lg_ROLE_ID, String str_FUNCTION) {
        String str_role_user = "";
        String Str_Password_MD5 = Md5.encode(str_PASSWORD);
        TUser OTUser = null;
        TRole OTRole = getOdataManager().getEm().find(TRole.class, lg_ROLE_ID);
        System.out.println("lg_ROLE_ID " + lg_ROLE_ID);

        if (OTRole == null) {

            OTUser = getOdataManager().getEm().find(TUser.class, lg_USER_ID);

            OTUser.setLgUSERID(lg_USER_ID);
            // str_IDS
            OTUser.setStrIDS(str_IDS);
            OTUser.setStrLOGIN(str_LOGIN);
            OTUser.setStrLASTNAME(str_LAST_NAME);
            OTUser.setStrFIRSTNAME(str_FIRST_NAME);
            OTUser.setStrPASSWORD(Str_Password_MD5);
            OTUser.setStrFUNCTION(str_FUNCTION);
            getOdataManager().BeginTransaction();
            getOdataManager().getEm().persist(OTUser);
            getOdataManager().CloseTransaction();

        } else {
            OTUser = getOdataManager().getEm().find(TUser.class, lg_USER_ID);

            OTUser.setLgUSERID(lg_USER_ID);
            OTUser.setStrLOGIN(str_LOGIN);
            OTUser.setStrLASTNAME(str_LAST_NAME);
            OTUser.setStrFIRSTNAME(str_FIRST_NAME);
            OTUser.setStrPASSWORD(Str_Password_MD5);
            OTUser.setStrFUNCTION(str_FUNCTION);
            Iterator iteraror = OTUser.getTRoleUserCollection().iterator();
            while (iteraror.hasNext()) {
                Object el = iteraror.next();
                str_role_user = ((TRoleUser) el).getLgUSERROLEID();
            }
            TRoleUser OTRoleUser = getOdataManager().getEm().find(TRoleUser.class, str_role_user);
            OTRoleUser.setLgROLEID(OTRole);
            OTRoleUser.setLgUSERID(OTUser);
            getOdataManager().BeginTransaction();
            getOdataManager().getEm().persist(OTUser);
            getOdataManager().getEm().persist(OTRoleUser);
            getOdataManager().CloseTransaction();
        }

        this.setOTUser(OTUser);
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        
        this.do_event_log(Ojconnexion, commonparameter.statut_is_not_assign, "Update de user " + OTUser.getStrLOGIN(), jdom.APP_NAME, commonparameter.statut_enable, "t_user", "userManagement","Modification Utilisateur",(this.getOTUser()!=null?this.getOTUser().getLgUSERID():commonparameter.ADMINID));
        this.is_activity(Ojconnexion);
        Ojconnexion.CloseConnexion();
        this.buildSuccesTraceMessage("Utilisateur " + OTUser.getStrLOGIN() + "  modifier avec succes");
    }

    public void isconnected(TUser OTUser) {
        OTUser.setStrLASTCONNECTIONDATE(new Date());
        getOdataManager().BeginTransaction();
        getOdataManager().getEm().persist(OTUser);
        getOdataManager().CloseTransaction();
        new logger().oCategory.warn("L'utilisateur " + OTUser.getStrLOGIN() + "  ");
        this.setMessage("Operation Effectuer avec succes");
    }

    //mise a jour des informations du compte d'un utilisateur
    public boolean updateProfilUser(String lg_USER_ID, String str_FIRST_NAME, String str_LAST_NAME, String str_PASSWORD) {
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
    //fin mise a jour des informations du compte d'un utilisateur

    public Boolean ChangeStatus(String lg_USER_ID, String Str_Statut) {
        try {
            TUser OTUser = this.getOdataManager().getEm().find(TUser.class, lg_USER_ID);
            OTUser.setStrSTATUT(Str_Statut);
            getOdataManager().BeginTransaction();
            getOdataManager().getEm().persist(OTUser);
            getOdataManager().CloseTransaction();
            new logger().oCategory.warn("le satut de L'utilisateur " + OTUser.getStrLOGIN() + "  a ete modifier ");
            this.setMessage("Operation Effectuer avec succes");
            this.setDetailmessage("Operation Effectuer avec succes");
        } catch (Exception ex) {
            new logger().OCategory.error(ex.getMessage());
            this.setDetailmessage(ex.getMessage());
            this.setMessage("Impossible de modifier le statut");
        }

        return false;
    }

    public List<TNotification> getTNotification() {
        List<TNotification> lstTNotification = new ArrayList<TNotification>();
        try {

            lstTNotification = this.getOdataManager().getEm().
                    createQuery("SELECT t FROM TNotification t WHERE t.lgUSERIDOUT.lgUSERID LIKE ?1 AND t.strSTATUT LIKE ?2 AND t.strTYPE <> ?3  ORDER BY t.dtCREATED DESC  ").
                    setParameter(1, this.getOTUser().getLgUSERID()).
                    setParameter(2, commonparameter.statut_UnRead).
                    setParameter(3, "%%").
                    getResultList();

        } catch (Exception e) {
        }
        return lstTNotification;
    }

    private String GenerateUserCode(TUser OTUser) {

        String str_user_firstname = "";
        String str_user_lastname = "";
        String str_code_user = "";
        TRoleUser OTRoleUser = null;

        try {
            Iterator iterator = OTUser.getTRoleUserCollection().iterator();

            while (iterator.hasNext()) {
                Object el = iterator.next();

                this.refresh((TRoleUser) el);
                OTRoleUser = ((TRoleUser) el);
                this.refresh(OTRoleUser);

                if (OTRoleUser.getLgROLEID().getLgROLEID().equals("2015361644415413406")) {

                    str_user_lastname = OTRoleUser.getLgUSERID().getStrLASTNAME().substring(0, 2);
                    str_user_firstname = OTRoleUser.getLgUSERID().getStrFIRSTNAME().substring(0, 2);
                    str_code_user = "V_" + str_user_lastname + "_" + str_user_firstname;

                    return str_code_user;
                }
                if (OTRoleUser.getLgROLEID().getLgROLEID().equals("52141843193914405435")) {

                    str_user_lastname = OTRoleUser.getLgUSERID().getStrLASTNAME().substring(0, 2);
                    str_user_firstname = OTRoleUser.getLgUSERID().getStrFIRSTNAME().substring(0, 2);
                    str_code_user = "C_" + str_user_lastname + "_" + str_user_firstname;

                    return str_code_user;

                }

            }

        } catch (Exception e) {
        }

        return str_code_user;
    }

    //liste des utillisateurs d'un emplacements possible de l'office
    public List<TUser> showAllOrOneEmplacement(String search_value, String lg_USER_ID, String lg_EMPLACEMENT_ID) {
        List<TUser> lstTUser = new ArrayList<TUser>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (lg_EMPLACEMENT_ID.equalsIgnoreCase("1")) {
                lg_EMPLACEMENT_ID = "%%";
            }

            lstTUser = this.getOdataManager().getEm().createQuery("SELECT t FROM TUser t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1) AND t.lgUSERID LIKE ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.strSTATUT LIKE ?3 ORDER BY t.strFIRSTNAME ASC").
                    setParameter(1, search_value + "%").
                    setParameter(2, lg_USER_ID).
                    setParameter(4, lg_EMPLACEMENT_ID).
                    setParameter(3, commonparameter.statut_enable).
                    getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTUser taille " + lstTUser.size());
        return lstTUser;
    }
    
    public List<TRoleUser> showAllOrOneEmplacement(String search_value, String lg_USER_ID, String lg_EMPLACEMENT_ID, String str_NAME_ROLE, boolean etat, int start, int limit) {
        List<TRoleUser> lstTRoleUser = new ArrayList<>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (str_NAME_ROLE.equalsIgnoreCase(commonparameter.ROLE_SUPERADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
                lstTRoleUser = this.getOdataManager().getEm().createQuery("SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 ORDER BY t.lgUSERID.strFIRSTNAME ASC").
                        setParameter(1, search_value + "%").
                        setParameter(2, lg_USER_ID).
                        setParameter(4, lg_EMPLACEMENT_ID).
                        setParameter(3, commonparameter.statut_enable).
                        setFirstResult(start).setMaxResults(limit).
                        getResultList();
            } else /*if (str_NAME_ROLE.equalsIgnoreCase(commonparameter.ROLE_ADMIN))*/ { //a decommenter en cas de besoin
                if(etat) {
                    lg_EMPLACEMENT_ID = "%%";
                }
                
                lstTRoleUser = this.getOdataManager().getEm().createQuery("SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.strNAME NOT LIKE ?5 ORDER BY t.lgUSERID.strFIRSTNAME ASC").
                        setParameter(1, search_value + "%").
                        setParameter(2, lg_USER_ID).
                        setParameter(4, lg_EMPLACEMENT_ID).
                        setParameter(5, commonparameter.ROLE_SUPERADMIN).
                        setParameter(3, commonparameter.statut_enable).
                        setFirstResult(start).setMaxResults(limit).
                        getResultList();
            } 
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTUser taille " + lstTRoleUser.size());
        return lstTRoleUser;
    }

    public List<TRoleUser> showAllOrOneEmplacement(String search_value, String lg_USER_ID, String lg_EMPLACEMENT_ID, String str_NAME_ROLE, boolean etat) {
        List<TRoleUser> lstTRoleUser = new ArrayList<TRoleUser>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            /*if (lg_EMPLACEMENT_ID.equalsIgnoreCase("1")) {
                lg_EMPLACEMENT_ID = "%%";
            }*/

            if (str_NAME_ROLE.equalsIgnoreCase(commonparameter.ROLE_SUPERADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
                lstTRoleUser = this.getOdataManager().getEm().createQuery("SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 ORDER BY t.lgUSERID.strFIRSTNAME ASC").
                        setParameter(1, search_value + "%").
                        setParameter(2, lg_USER_ID).
                        setParameter(4, lg_EMPLACEMENT_ID).
                        setParameter(3, commonparameter.statut_enable).
                        getResultList();
            } else /*if (str_NAME_ROLE.equalsIgnoreCase(commonparameter.ROLE_ADMIN))*/ { //a decommenter en cas de besoin
                if(etat) {
                    lg_EMPLACEMENT_ID = "%%";
                }
                
                lstTRoleUser = this.getOdataManager().getEm().createQuery("SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.strNAME NOT LIKE ?5 ORDER BY t.lgUSERID.strFIRSTNAME ASC").
                        setParameter(1, search_value + "%").
                        setParameter(2, lg_USER_ID).
                        setParameter(4, lg_EMPLACEMENT_ID).
                        setParameter(5, commonparameter.ROLE_SUPERADMIN).
                        setParameter(3, commonparameter.statut_enable).
                        getResultList();
            } /*else {
                lstTRoleUser = this.getOdataManager().getEm().createQuery("SELECT t FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND t.lgUSERID.strSTATUT LIKE ?3 AND t.lgROLEID.strNAME NOT LIKE ?5 AND t.lgROLEID.strNAME NOT LIKE ?6 ORDER BY t.lgUSERID.strFIRSTNAME ASC").
                        setParameter(1, search_value + "%").
                        setParameter(2, lg_USER_ID).
                        setParameter(4, lg_EMPLACEMENT_ID).
                        setParameter(5, commonparameter.ROLE_SUPERADMIN).
                        setParameter(6, commonparameter.ROLE_ADMIN).
                        setParameter(3, commonparameter.statut_enable).
                        getResultList();
            }*/

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTUser taille " + lstTRoleUser.size());
        return lstTRoleUser;
    }
    //fin liste des utillisateurs d'un emplacements possible de l'office

    //liste des roles
    public List<TRole> lstTRoles(String search_value, String lg_ROLE_ID, String str_NAME_ROLE) {
        List<TRole> lstTRole = new ArrayList<TRole>();
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (str_NAME_ROLE.equalsIgnoreCase(commonparameter.ROLE_SUPERADMIN)) {
                lstTRole = this.getOdataManager().getEm().createQuery("SELECT t FROM TRole t WHERE t.lgROLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESIGNATION LIKE ?2) ORDER BY t.strDESIGNATION").
                        setParameter(1, lg_ROLE_ID).setParameter(2, search_value + "%").getResultList();
            } else if (str_NAME_ROLE.equalsIgnoreCase(commonparameter.ROLE_ADMIN)) {
                lstTRole = this.getOdataManager().getEm().createQuery("SELECT t FROM TRole t WHERE t.lgROLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESIGNATION LIKE ?2) AND t.strNAME NOT LIKE ?3 ORDER BY t.strDESIGNATION").
                        setParameter(1, lg_ROLE_ID).setParameter(2, search_value + "%").setParameter(3, commonparameter.ROLE_SUPERADMIN).getResultList();
            } else {
                lstTRole = this.getOdataManager().getEm().createQuery("SELECT t FROM TRole t WHERE t.lgROLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESIGNATION LIKE ?2) AND t.strNAME NOT LIKE ?3 AND t.strNAME NOT LIKE ?4 ORDER BY t.strDESIGNATION").
                        setParameter(1, lg_ROLE_ID).setParameter(2, search_value + "%").setParameter(3, commonparameter.ROLE_SUPERADMIN).setParameter(4, commonparameter.ROLE_ADMIN).getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTRole taille " + lstTRole.size());
        return lstTRole;
    }
    //fin liste des roles

    //recuperer un role
    public TRole getRole(String search_value) {
        TRole OTRole = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            OTRole = (TRole) this.getOdataManager().getEm().createQuery("SELECT t FROM TRole t WHERE (t.strNAME LIKE ?1 OR t.lgROLEID LIKE ?1 OR t.strDESIGNATION LIKE ?1) AND t.strSTATUT LIKE ?2").
                    setParameter(1, search_value).
                    setParameter(2, commonparameter.statut_enable).
                    getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
//        new logger().OCategory.info("Role " + OTRole.getStrDESIGNATION());
        return OTRole;
    }
    //fin recuperer un role 

    //recuperer du role d'un user
    public TRoleUser getTRoleUser(String lg_USER_ID) {
        TRoleUser OTRoleUser = null;
        try {
            OTRoleUser = (TRoleUser) this.getOdataManager().getEm().createQuery("SELECT t FROM TRoleUser t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND t.lgUSERID.strSTATUT = ?2 AND t.lgROLEID.strSTATUT = ?2")
                    .setParameter(1, lg_USER_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
            //new logger().OCategory.info("Role du user " + OTRoleUser.getLgROLEID().getStrNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTRoleUser;
    }
    //fin recuperer du role d'un user

    //mise a jour du role d'un user
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
    //fin mise a jour du role d'un user
/*
    public boolean createUserImprimante(String lg_USER_ID, String lg_IMPRIMANTE_ID) {
        boolean result = false;

        try {

            TUser OTUser = this.getOdataManager().getEm().find(TUser.class, lg_USER_ID);
            TImprimante OTImprimante = this.getOdataManager().getEm().find(TImprimante.class, lg_IMPRIMANTE_ID);
            TUserImprimante OTUserImprimante = new TUserImprimante();
            OTUserImprimante.setLgUSERIMPRIMQNTEID(this.getKey().getComplexId());
            OTUserImprimante.setLgIMPRIMANTEID(OTImprimante);
            OTUserImprimante.setLgUSERID(OTUser);
            OTUserImprimante.setStrNAME(OTImprimante.getStrNAME());
            OTUserImprimante.setStrDESCRIPTION(OTImprimante.getStrDESCRIPTION());
            OTUserImprimante.setStrSTATUT(commonparameter.statut_enable);
            OTUserImprimante.setDtCREATED(new Date());
            this.persiste(OTUserImprimante);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de d'ajout de l'imprimante à l'utilisateur connecté");
        }
        return result;
    }

    public boolean deleteUserImprimante(String lg_USER_ID, String lg_IMPRIMANTE_ID) {
        boolean result = false;
        try {

            TUserImprimante OTUserImprimante = (TUserImprimante) this.getOdataManager().getEm().createQuery("SELECT t FROM TUserImprimante t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND t.lgIMPRIMANTEID.lgIMPRIMANTEID LIKE ?2")
                    .setParameter(1, lg_USER_ID).setParameter(2, lg_IMPRIMANTE_ID).getSingleResult();
            if (this.delete(OTUserImprimante)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de suppression");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'imprimante à l'utilisateur");
        }
        return result;
    }
*/
    //recuperation d'un utilisateur par son id
    public TUser getUserById(String lg_USER_ID) {
        TUser OTUser = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery("SELECT t FROM TUser t WHERE t.lgUSERID LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1")
                    .setParameter(1, lg_USER_ID).setMaxResults(1);
            if(qry.getResultList().size() > 0) {
                OTUser = (TUser) qry.getSingleResult();
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTUser;
    }
    //fin recuperation d'un utilisateur par son id

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
                    OEventLogManagement.createAlertEventUserPhone(OTAlertEvent.getStrEvent(), OTUserFone.getLgUSERFONEID());
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
                    OEventLogManagement.updateAlertEventUserPhone(OTAlertEventUserFone, OTAlertEventUserFone.getStrEvent(), OTUserFone);
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

    public String createStandardUser(String str_FIRST_NAME, String str_LAST_NAME, String str_PHONE) {
        String lg_USER_ID = null;
        try {
           TEmplacement  OTEmplacement = this.getOdataManager().getEm().find(TEmplacement.class,commonparameter.DEFAULT_EMPLACEMENT_ID );
            TUser OTUser = new TUser(this.getKey().getComplexId());
            OTUser.setStrFIRSTNAME(str_FIRST_NAME);
            OTUser.setStrLASTNAME(str_LAST_NAME);
            OTUser.setStrSTATUT(commonparameter.statut_enable);
            OTUser.setStrTYPE(commonparameter.PARAMETER_STANDARD);
            OTUser.setStrPHONE(str_PHONE);
            OTUser.setLgEMPLACEMENTID(OTEmplacement);
            OTUser.setStrLOGIN(this.getKey().getComplexId());
            if (this.persiste(OTUser)) {
                lg_USER_ID = OTUser.getLgUSERID();
            } else {
                this.buildErrorTraceMessage("Echec de création de l'utilisateur");
            }

        } catch (Exception Ex) {
            this.buildErrorTraceMessage("Echec de création de l'utilisateur");

        }
        return lg_USER_ID;

    }

}