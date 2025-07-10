/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll;

//import dal.TFamille;
//import dal.TUser;
import dal.TPrivilege;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.io.Serializable;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import multilangue.Translate;
import toolkits.filesmanagers.FilesType.PicFile;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author Administrator
 */
/**
 * Classe de cscdicjd dcdccs
 */
public class bllBase {

    private dataManager OdataManager;
    protected Translate OTranslate;
    public static String error_def = "";
    protected String message;
    private String Detailmessage;
    private date key = new date();
    // private TCustomer OTCustomer;
    // public List<TInstitutions> lstTInstitutions;
    protected jconnexion Ojconnexion;
    public java.sql.Connection oConnection;
    private TUser OTUser;
    private List<TPrivilege> usersPrivileges = new ArrayList<>();

    public void checkDatamanager() {
        if (OTranslate == null) {
            OTranslate = new Translate();
        }
        if (OdataManager == null) {
            OdataManager = new dataManager();
            OdataManager.initEntityManager();
            return;
        }

        if (OdataManager.isConected == false) {
            OdataManager.initEntityManager();
        }

    }

    public void checkDatamanagerPU() {
        if (OTranslate == null) {
            OTranslate = new Translate();
        }
        if (OdataManager == null) {
            OdataManager = new dataManager();

            return;
        }

        if (OdataManager.isConected == false) {
            OdataManager.initEntityManager();
            return;
        }

    }

    public void refresh(Serializable o) {
        try {
            this.getOdataManager().getEm().refresh(o);
        } catch (Exception e) {
        }
    }

    public boolean persiste(Serializable oold) {
        Serializable o = oold;
        try {
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().getEm().getEntityManagerFactory().getCache().evictAll(); // vide le cache de
                                                                                                // l'objet

                this.getOdataManager().BeginTransaction();
            }
            this.getOdataManager().getEm().persist(o);
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().CloseTransaction();
            }

            this.setMessage(commonparameter.PROCESS_SUCCESS);

            // ==> YFS le 29/07/2017: A confirmer
            // try {
            // this.getOdataManager().getEm().refresh(o);
            // } catch (Exception e) {
            // }
            // new logger().OCategory.info(o.);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            // return false;
            throw (e);
        }
    }

    public boolean persiste(List<Serializable> o) {
        try {
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().BeginTransaction();
            }

            for (int i = 0; i < o.size(); i++) {

                this.getOdataManager().getEm().persist(o.get(i));
            }
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().CloseTransaction();
            }

            this.setMessage(commonparameter.PROCESS_SUCCESS);
            try {
                this.getOdataManager().getEm().refresh(o);
            } catch (Exception e) {
            }

            // new logger().OCategory.info(o.);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean merge(Serializable o) {
        try {
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().BeginTransaction();
            }
            this.getOdataManager().getEm().merge(o);
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().CloseTransaction();
            }
            this.setMessage(commonparameter.PROCESS_SUCCESS);
            try {
                this.getOdataManager().getEm().refresh(o);
            } catch (Exception e) {
                e.printStackTrace();
            }

            // new logger().OCategory.info(o.);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean ouvrirTransaction() {
        try {

            this.getOdataManager().getEm().getTransaction().begin();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean validerTransaction() {
        try {
            this.getOdataManager().getEm().getTransaction().commit();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean mergeNew(Serializable o) {
        try {

            this.getOdataManager().getEm().merge(o);

            this.setMessage(commonparameter.PROCESS_SUCCESS);

            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean persisteNew(Serializable o) {
        try {

            this.getOdataManager().getEm().persist(o);

            this.setMessage(commonparameter.PROCESS_SUCCESS);

            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean merge2(Serializable o) {
        try {

            this.getOdataManager().getEm().merge(o);

            this.setMessage(commonparameter.PROCESS_SUCCESS);
            try {
                this.getOdataManager().getEm().refresh(o);
            } catch (Exception e) {
                e.printStackTrace();
            }

            // new logger().OCategory.info(o.);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public boolean delete(Object o, Serializable Tclass) {
        try {
            Serializable OSerializable = this.find(o, Tclass);
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().BeginTransaction();
            }

            this.getOdataManager().getEm().remove(OSerializable);
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().CloseTransaction();
            }
            this.getOdataManager().CloseTransaction();
            buildSuccesTraceMessage("Suppresion Ok");
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }
    // Renvoie l'objet donc la ref et une instance d objet sont passe respectivemment en parametre

    public Serializable find(Object o, Serializable Tclass) {
        try {
            Serializable OSerializable = getOdataManager().getEm().find(Tclass.getClass(), o);
            this.refresh(OSerializable);
            return OSerializable;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.toString());
            new logger().OCategory.info(" ERROR  " + e.toString());
            return null;
        }
    }

    public boolean delete(Serializable o) {
        try {
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().BeginTransaction();
            }

            this.getOdataManager().getEm().remove(o);
            if (this.getOdataManager().isTransactionGroupe() == false) {
                this.getOdataManager().CloseTransaction();
            }

            buildSuccesTraceMessage("Suppresion Ok");
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage(e.getMessage());
            return false;
        }
    }

    public void LoadDataManger(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
    }

    public void LoadMultilange(Translate OTranslate) {
        this.setOTranslate(OTranslate);
    }

    /**
     * @return the OdataManager
     */
    public dataManager getOdataManager() {
        return OdataManager;
    }

    /**
     * @param OdataManager
     *            the OdataManager to set
     */
    public void setOdataManager(dataManager OdataManager) {
        this.OdataManager = OdataManager;
    }

    /**
     * @return the OTranslate
     */
    public Translate getOTranslate() {
        return OTranslate;
    }

    /**
     * @param OTranslate
     *            the OTranslate to set
     */
    public void setOTranslate(Translate OTranslate) {
        this.OTranslate = OTranslate;
    }

    /**
     * @return the message
     */
    public String getMessage() {
        return message;
    }

    /**
     * @param message
     *            the message to set
     */
    public void setMessage(String message) {
        this.message = message;
    }

    /**
     * @return the key
     */
    public date getKey() {
        return key;
    }

    /**
     * @param key
     *            the key to set
     */
    public void setKey(date key) {
        this.key = key;
    }

    public bllBase() {
        if (OdataManager == null) {
            OdataManager = new dataManager();
        }

    }

    /**
     * @return the Detailmessage
     */
    public String getDetailmessage() {
        return Detailmessage;
    }

    /**
     * @param Detailmessage
     *            the Detailmessage to set
     */
    public void setDetailmessage(String Detailmessage) {
        this.Detailmessage = Detailmessage;
    }

    public static String getAbsPicture(String CUST_REF, String specialDirectory) {
        PicFile oPicFile = new PicFile();
        // oPicFile.setPath_outut(jdom.path_photo_absolute +specialDirectory+ "NO_PIC.jpg");
        oPicFile.setPath_outut("NO_PIC.jpg");
        oPicFile.isExisteAbs(specialDirectory + CUST_REF);
        return oPicFile.getPath_outut();
    }

    public static String getRelaPicture(String CUST_REF, String specialDirectory, String Type_of_pic) {
        PicFile oPicFile = new PicFile();
        oPicFile.setPath_outut(jdom.path_photo_relatif + specialDirectory + Type_of_pic + "NO_PIC.jpg");
        oPicFile.isExiste(specialDirectory + CUST_REF);
        return oPicFile.getPath_outut();
    }

    public void setoConnection(Connection oConnection) {
        this.oConnection = oConnection;
    }

    public void is_activity(String lg_CUSTOMER_ID) {
        try {
            String sProc = "{ CALL proc_do_activity(?) }";
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, lg_CUSTOMER_ID);
            cs.execute();
            Ojconnexion.CloseConnexion();
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void is_activity(jconnexion Ojconnexion) {
        try {
            String sProc = "{ CALL proc_do_activity(?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, this.OTUser.getLgUSERID());
            cs.execute();
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void is_activity(jconnexion Ojconnexion, String lg_CUSTOMER_ID) {
        try {
            String sProc = "{ CALL proc_do_activity(?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, lg_CUSTOMER_ID);
            cs.execute();
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void is_activity(dataManager OManager, String lg_CUSTOMER_ID) {
        try {
            OManager.getEm().createNativeQuery("UPDATE t_user o SET o.dt_LAST_ACTIVITY  = NOW() WHERE o.lg_USER_ID =?1")
                    .setParameter(1, lg_CUSTOMER_ID).executeUpdate();

        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void do_event_log(jconnexion Ojconnexion, String ID_INSCRIPTION, String str_DESCRIPTION,
            String str_CREATED_BY, String str_STATUT, String str_TABLE_CONCERN, String str_MODULE_CONCERN,
            String str_TYPE_LOG, String lg_USER_ID) {
        try {

            String sProc = "{ CALL proc_logfile(?,?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, key.gettimeid());
            cs.setString(2, ID_INSCRIPTION);
            cs.setString(3, str_DESCRIPTION);
            cs.setString(4, str_STATUT);
            cs.setString(5, str_TABLE_CONCERN);
            cs.setString(6, str_CREATED_BY);
            cs.setString(7, str_MODULE_CONCERN);
            cs.setString(8, str_TYPE_LOG);
            cs.setString(9, lg_USER_ID);
            cs.execute();
            this.setDetailmessage(str_DESCRIPTION);
            new logger().OCategory.error(str_DESCRIPTION);
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void do_event_log(jconnexion Ojconnexion, String ID_INSCRIPTION, String str_DESCRIPTION,
            String str_CREATED_BY, String str_STATUT, String str_TABLE_CONCERN, String str_MODULE_CONCERN) {
        try {

            String sProc = "{ CALL proc_do_event_log(?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, key.gettimeid());
            cs.setString(2, ID_INSCRIPTION);
            cs.setString(3, str_DESCRIPTION);
            cs.setString(4, str_STATUT);
            cs.setString(5, str_TABLE_CONCERN);
            cs.setString(6, str_CREATED_BY);
            cs.setString(7, str_MODULE_CONCERN);
            cs.setString(8, "");
            cs.execute();
            this.setDetailmessage(str_DESCRIPTION);
            new logger().OCategory.error(str_DESCRIPTION);
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void do_event_log(jconnexion Ojconnexion, String ID_INSCRIPTION, String str_DESCRIPTION,
            String str_CREATED_BY, String str_STATUT, String str_TABLE_CONCERN, String str_MODULE_CONCERN,
            String ID_ANNEE_SCOLAIRE) {
        try {
            new logger().OCategory.info("dans do_event_log");
            String sProc = "{ CALL proc_do_event_log(?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, key.gettimeid());
            cs.setString(2, ID_INSCRIPTION);
            cs.setString(3, str_DESCRIPTION);
            cs.setString(4, str_STATUT);
            cs.setString(5, str_TABLE_CONCERN);
            cs.setString(6, str_CREATED_BY);
            cs.setString(7, str_MODULE_CONCERN);
            cs.setString(8, ID_ANNEE_SCOLAIRE);
            cs.execute();

            this.buildSuccesTraceMessage(str_DESCRIPTION);

        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
            this.buildErrorTraceMessage(e.getMessage());
        }
    }

    public void do_event_log(String ID_INSCRIPTION, String str_DESCRIPTION, String str_CREATED_BY, String str_STATUT,
            String str_TABLE_CONCERN, String str_MODULE_CONCERN) {
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String sProc = "{ CALL proc_do_event_log(?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, key.gettimeid());
            cs.setString(2, ID_INSCRIPTION);
            cs.setString(3, str_DESCRIPTION);
            cs.setString(4, str_STATUT);
            cs.setString(5, str_TABLE_CONCERN);
            cs.setString(6, str_CREATED_BY);
            cs.setString(7, str_MODULE_CONCERN);
            cs.setString(8, "");
            cs.execute();
            Ojconnexion.CloseConnexion();
            new logger().OCategory.info(str_DESCRIPTION);
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void do_event_log(String ID_INSCRIPTION, String str_DESCRIPTION, String str_CREATED_BY, String str_STATUT,
            String str_TABLE_CONCERN, String str_MODULE_CONCERN, String str_TYPE_LOG, String lg_USER_ID) {
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String sProc = "{ CALL proc_logfile(?,?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, key.gettimeid());
            cs.setString(2, ID_INSCRIPTION);
            cs.setString(3, str_DESCRIPTION);
            cs.setString(4, str_STATUT);
            cs.setString(5, str_TABLE_CONCERN);
            cs.setString(6, str_CREATED_BY);
            cs.setString(7, str_MODULE_CONCERN);
            cs.setString(8, str_TYPE_LOG);
            cs.setString(9, lg_USER_ID);
            cs.execute();
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public void buildTraceMessage(String Message, String DetailMessage) {
        this.setDetailmessage(this.getOTranslate().getValue(DetailMessage));
        this.setMessage(message);
    }

    public void buildErrorTraceMessage(String DetailMessage) {
        this.setDetailmessage(this.getOTranslate().getValue(DetailMessage));
        this.setMessage(toolkits.parameters.commonparameter.PROCESS_FAILED);

        new logger().OCategory.error(this.Detailmessage);
    }

    public void buildErrorTraceMessage(String DetailMessage, String ErrorSystem) {
        this.setDetailmessage(this.getOTranslate().getValue(DetailMessage) + ".ERREUR  SYS:[ " + ErrorSystem + "]");
        setMessage(toolkits.parameters.commonparameter.PROCESS_FAILED);

        new logger().OCategory.error(this.Detailmessage);
    }

    public void buildSuccesTraceMessage(String DetailMessage) {
        this.setDetailmessage(this.getOTranslate().getValue(DetailMessage));
        setMessage(toolkits.parameters.commonparameter.PROCESS_SUCCESS);

        new logger().OCategory.info(this.Detailmessage);
    }

    /**
     * @return the OTUser
     */
    public TUser getOTUser() {
        return OTUser;
    }

    /**
     * @param OTUser
     *            the OTUser to set
     */
    public void setOTUser(TUser OTUser) {
        this.OTUser = OTUser;
    }

    public void prinntTraceInfo(Object message) {

        new logger().OCategory.info(message);

    }

    public void prinntTraceDebug(Object message) {
        new logger().OCategory.debug(message);

    }

    public void prinntTraceError(Object message) {
        new logger().OCategory.error(message);

    }

    public void do_event_log(dataManager OdaManager, String ID_INSCRIPTION, String str_DESCRIPTION,
            String str_CREATED_BY, String str_STATUT, String str_TABLE_CONCERN, String str_MODULE_CONCERN,
            String str_TYPE_LOG, String lg_USER_ID) {
        try {
            new logger().OCategory.info("dans do_event_log");
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().BeginTransaction();
            }

            OdaManager.getEm().createNativeQuery(
                    "INSERT INTO `t_event_log` (`lg_EVENT_LOG_ID`, `str_DESCRIPTION`, `str_CREATED_BY`, `str_STATUT`, `str_TABLE_CONCERN`,`str_MODULE_CONCERN`,`str_TYPE_LOG`,`lg_USER_ID`) VALUES(?,?,?,?,?,?,?,?)")
                    .setParameter(1, key.gettimeid()).setParameter(2, str_DESCRIPTION).setParameter(3, str_CREATED_BY)
                    .setParameter(4, str_STATUT).setParameter(5, str_TABLE_CONCERN).setParameter(6, str_MODULE_CONCERN)
                    .setParameter(7, str_TYPE_LOG).setParameter(8, lg_USER_ID).executeUpdate();
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().CloseTransaction();
            }
            this.buildSuccesTraceMessage(str_DESCRIPTION);

        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.error(e.getMessage());
            this.buildErrorTraceMessage(e.getMessage());
        }
    }

    public List<TPrivilege> getUsersPrivileges() {
        return usersPrivileges;
    }

    public void setUsersPrivileges(List<TPrivilege> usersPrivileges) {
        this.usersPrivileges = usersPrivileges;
    }

}
