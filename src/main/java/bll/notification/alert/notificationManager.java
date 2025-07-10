/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.notification.alert;

import bll.userManagement.privilege;
import dal.TNotification;
import dal.TUser;
import dal.TUserFone;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author DELL
 */
public class notificationManager extends bll.bllBase {

    public notificationManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    public void performNotification(String P_K_PRIVILEGE, List<Object> ListRessource) {

        privilege Oprivilege = new privilege();
        Oprivilege.LoadDataManger(this.getOdataManager());
        Oprivilege.LoadMultilange(this.getOTranslate());

        List<TUser> lstTUser = this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TUser t WHERE t.strSTATUT LIKE ?1  ")
                .setParameter(1, commonparameter.statut_enable).getResultList();

        for (int i = 0; i < lstTUser.size(); i++) {
            Oprivilege.setOTUser(lstTUser.get(i));
            if (Oprivilege.isAvalaible(P_K_PRIVILEGE)) {
                String data = this.buildNofication(P_K_PRIVILEGE, lstTUser.get(i), ListRessource);
                TNotification OTNotification = new TNotification();
                OTNotification.setLgID(this.getKey().getComplexId());
                OTNotification.setStrCONTENT(data);
                OTNotification.setDtCREATED(new Date());
                OTNotification.setLgUSERIDIN(this.getOTUser());
                OTNotification.setLgUSERIDOUT(lstTUser.get(i));
                OTNotification.setStrDESCRIPTION(OTranslate.getValue(P_K_PRIVILEGE));
                OTNotification.setStrSTATUT(commonparameter.statut_UnRead);
                OTNotification.setStrTYPE(P_K_PRIVILEGE);
                OTNotification.setStrREFRESSOURCE((String) ListRessource.get(1));
                this.persiste(OTNotification);

            }
        }

    }

    private String buildNofication(String P_K_PRIVILEGE, TUser OTUser, List<Object> ListRessource) {

        String data = "";
        if (P_K_PRIVILEGE.equals("N_VALIDATION_ORDER")) {
            data = this.getDataNotificationml_validation_order(OTUser, P_K_PRIVILEGE, ListRessource);

        } else if (P_K_PRIVILEGE.equals("N_NEW_ORDER")) {
            data = this.getDataNotificationml_new_register_order(OTUser, P_K_PRIVILEGE, ListRessource);
        }
        // N_NEW_ORDER

        return data;
    }

    private String getDataNotificationml_validation_order(TUser OTUser, String P_K_PRIVILEGE,
            List<Object> ListRessource) {
        alertManagement OalertManagement = new alertManagement(this.getOdataManager());
        OalertManagement.addParameter("[ml_USER]",
                OTUser.getStrFIRSTNAME().toUpperCase() + "  " + OTUser.getStrLASTNAME().toUpperCase());
        String data = "";// OalertManagement.notify(P_K_PRIVILEGE, OTUser, null);
        return data;
    }

    private String getDataNotificationml_new_register_order(TUser OTUser, String P_K_PRIVILEGE,
            List<Object> ListRessource) {
        alertManagement OalertManagement = new alertManagement(this.getOdataManager());
        OalertManagement.addParameter("[ml_USER]",
                OTUser.getStrFIRSTNAME().toUpperCase() + "  " + OTUser.getStrLASTNAME().toUpperCase());
        OalertManagement.addParameter("[ml_PRODUCT]", (String) ListRessource.get(0));
        String data = "";// OalertManagement.notify(P_K_PRIVILEGE, OTUser, null);
        return data;
    }

    public void ProcessNotificationRessource(String P_K_PRIVILEGE, List<Object> ListRessource) {
        List<TNotification> lstTNotification = this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TNotification t WHERE t.strSTATUT LIKE ?1  AND t.strREFRESSOURCE LIKE ?2  ")
                .setParameter(1, commonparameter.statut_UnRead).setParameter(2, ((String) ListRessource.get(0)))
                .getResultList();

        for (int i = 0; i < lstTNotification.size(); i++) {
            lstTNotification.get(i).setStrSTATUT(commonparameter.statut_Read);
            this.persiste(lstTNotification.get(i));
        }

    }

    // creation de notification
    private boolean buildNofication(String Description, String content, String str_TYPE) {
        List<TUserFone> lstTUserFone = new ArrayList<TUserFone>();
        boolean result = false;
        try {
            lstTUserFone = this.lstUserAuthorizeToNofication();
            for (TUserFone OTUserFone : lstTUserFone) {
                this.buildNofication(Description, content, OTUserFone.getLgUSERID(), str_TYPE);
            }
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    private boolean buildNofication(String Description, String content, TUser OTUser, String str_TYPE) {

        boolean result = false;
        try {
            TNotification OTNotification = new TNotification();
            OTNotification.setLgID(this.getKey().getComplexId());
            OTNotification.setLgUSERIDIN(this.getOTUser());
            OTNotification.setLgUSERIDOUT(OTUser);
            OTNotification.setStrDESCRIPTION(Description);
            OTNotification.setStrCONTENT(content);
            OTNotification.setStrTYPE(str_TYPE);
            OTNotification.setStrSTATUT(commonparameter.statut_UnRead);
            OTNotification.setDtCREATED(new Date());
            OTNotification.setStrREFRESSOURCE("");
            this.persiste(OTNotification);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la notification");
        }
        return result;
    }

    // fin creation de notification
    // liste des user abilité a recevoir des notification sms
    public List<TUserFone> lstUserAuthorizeToNofication() {
        List<TUserFone> lst = new ArrayList<TUserFone>();
        try {
            lst = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TUserFone t WHERE t.strSTATUT = ?1 AND t.lgUSERID.strSTATUT = ?1")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("liste lstUserAuthorizeToNofication " + lst.size());
        return lst;
    }
    // fin liste des user abilité a recevoir des notification sms
}
