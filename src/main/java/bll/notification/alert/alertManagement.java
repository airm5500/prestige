/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.notification.alert;

import dal.TAlertEvent;
import dal.TNotification;
import dal.TParameters;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class alertManagement extends bll.bllBase {

    List<TParameters> Lstparameters = new ArrayList<TParameters>();
    public TAlertEvent OTAlertEvent = new TAlertEvent();

    public alertManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
        Lstparameters.clear();
    }

    public alertManagement(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    public void addParameter(String key, String Value) {
        TParameters OTParameters = new TParameters();
        OTParameters.setStrKEY(key);
        OTParameters.setStrVALUE(Value);
        Lstparameters.add(OTParameters);
    }

    public List<TNotification> UnReadNotifications() {

        List<TNotification> lstunReadNotification = new ArrayList<TNotification>();
        lstunReadNotification = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TNotification t WHERE t.lgUSERIDOUT.lgUSERID LIKE ?1 AND t.strSTATUT LIKE ?2  ORDER BY t.dtCREATED")
                .setParameter(1, this.getOTUser().getLgUSERID()).setParameter(2, commonparameter.statut_UnRead)
                .getResultList();

        for (int i = 0; i < lstunReadNotification.size(); i++) {
            try {
                this.getOdataManager().getEm().refresh(lstunReadNotification.get(i));
            } catch (Exception e) {
            }

        }

        return lstunReadNotification;
    }

    public List<TNotification> UnReadNotification() {

        List<TNotification> lstunReadNotification = new ArrayList<TNotification>();
        lstunReadNotification = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TNotification t WHERE t.lgUSERIDOUT.lgUSERID LIKE ?1 AND t.strSTATUT LIKE ?2  ORDER BY t.dtCREATED")
                .setParameter(1, this.getOTUser().getLgUSERID()).setParameter(2, commonparameter.statut_UnRead)
                .getResultList();

        for (int i = 0; i < lstunReadNotification.size(); i++) {
            try {
                this.getOdataManager().getEm().refresh(lstunReadNotification.get(i));
            } catch (Exception e) {
            }

        }

        return lstunReadNotification;
    }

    public String notify(String lgId_TAlertEvent, String local) {
        String Odata = commonparameter.statut_Non_Defini;
        try {
            OTAlertEvent = (TAlertEvent) this.find(lgId_TAlertEvent, new TAlertEvent());// this.getOdataManager().getEm().find(TAlertEvent.class,
                                                                                        // lgId_TAlertEvent);
            if (local.equals(commonparameter.Lg_FRANCAIS)) {
                Odata = OTAlertEvent.getStrSMSFrenchText();
            } else if (local.equals(commonparameter.Lg_ENGLISH)) {
                Odata = OTAlertEvent.getStrSMSEnglishText();
            } else {
                Odata = OTAlertEvent.getStrEvent();
            }
            for (int i = 0; i < Lstparameters.size(); i++) {
                Odata = Odata.replace(Lstparameters.get(i).getStrKEY(), Lstparameters.get(i).getStrVALUE());
            }
            new logger().OCategory.info(Odata);

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        Lstparameters.clear();
        return Odata;
    }
    /*
     * public String notify(String lgId_TAlertEvent, String local, TChannel OTChannel) { String Odata =
     * commonparameter.statut_Non_Defini; try { OTAlertEvent = this.getOdataManager().getEm().find(TAlertEvent.class,
     * lgId_TAlertEvent); try{
     *
     * this.getOdataManager().getEm().refresh(OTAlertEvent);
     *
     * }catch(Exception ed){
     *
     * }
     *
     *
     * if (local.equals(commonparameter.Lg_FRANCAIS)) { Odata = OTAlertEvent.getStrSMSFrenchText(); } else if
     * (local.equals(commonparameter.Lg_ENGLISH)) { Odata = OTAlertEvent.getStrSMSEnglishText(); } else { Odata =
     * OTAlertEvent.getStrEvent(); } for (int i = 0; i < Lstparameters.size(); i++) { Odata =
     * Odata.replace(Lstparameters.get(i).getStrKEY(), Lstparameters.get(i).getStrVALUE()); } new
     * logger().OCategory.info(Odata);
     *
     * } catch (Exception ex) { new logger().OCategory.fatal(ex.getMessage()); } Lstparameters.clear(); return Odata; }
     *
     * public String PreparnotifyParieur(String lgId_TAlertEvent, TCustomer OTCustomer, TChannel OTChannel) { String
     * Odata = commonparameter.statut_Non_Defini; try { // TParieur OTParieur =
     * this.getOdataManager().getEm().find(TParieur.class, lgId_TParieur); OTAlertEvent =
     * this.getOdataManager().getEm().find(TAlertEvent.class, lgId_TAlertEvent); if
     * (OTCustomer.getLgLanguageID().getLgLanguageID().equals(commonparameter.Lg_FRANCAIS)) { Odata =
     * OTAlertEvent.getStrSMSFrenchText(); } else if
     * (OTCustomer.getLgLanguageID().getLgLanguageID().equals(commonparameter.Lg_ENGLISH)) { Odata =
     * OTAlertEvent.getStrSMSEnglishText(); } else { Odata = OTAlertEvent.getStrEvent(); } for (int i = 0; i <
     * Lstparameters.size(); i++) { Odata = Odata.replace(Lstparameters.get(i).getStrKEY(),
     * Lstparameters.get(i).getStrVALUE()); } new logger().OCategory.info(Odata);
     *
     * } catch (Exception ex) { new logger().OCategory.fatal(ex.getMessage()); } Lstparameters.clear(); return Odata; }
     */
}
