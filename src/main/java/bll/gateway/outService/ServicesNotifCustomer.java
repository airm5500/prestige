/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.outService;

import dal.TAlertEventUserFone;
import dal.TOutboudMessage;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author TBEKOLA
 */
public class ServicesNotifCustomer extends bll.bllBase implements Iservice {

    @Override
    public void init(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public ServicesNotifCustomer(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();

    }

    @Override
    public String doservice(TAlertEventUserFone OTAlertEventUserFone) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public String BuidlDataToNotify(String str_result, String str_phone, String str_REF) {
        // Creer une ligne dans outbound_message statut waitning
        TOutboudMessage OTOutboudMessage = null;
        try {
            /*
             * OTOutboudMessage = this.getTOutboudMessage(str_REF); //a decommenter en cas de probleme 09/08/2016 if
             * (OTOutboudMessage == null) { OTOutboudMessage = new TOutboudMessage();
             * OTOutboudMessage.setLgOUTBOUNDMESSAGEID(this.getKey().getComplexId());
             * OTOutboudMessage.setStrMESSAGE(str_result); OTOutboudMessage.setStrPHONE(str_phone);
             * OTOutboudMessage.setStrREF(str_REF); OTOutboudMessage.setDtCREATED(new Date());
             * OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Waiting);//Statut waitning
             * this.persiste(OTOutboudMessage); }
             */
            OTOutboudMessage = this.saveNotification(str_result, str_phone, str_REF);

            // if(OTOutboudMessage.getStrSTATUT().equalsIgnoreCase(commonparameter.statut_is_Waiting)) {
            // webservice Owebservice = new clientservice.webservice();
            //
            // if (Owebservice.send_SMS(str_phone, OTOutboudMessage.getStrMESSAGE())) {
            // //Met a jour le statut de out_bound message
            // OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Valided);//Statut waitning
            // this.persiste(OTOutboudMessage);
            //
            // } else {
            // this.buildErrorTraceMessage("Impossible d'envoyer le SMS", Owebservice.getMessage());
            // }
            // }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return str_result;

    }

    // envoi de sms aux clients avoir
    /*
     * @Override public String doservice() { List<String> datas = new ArrayList<String>(); Preenregistrement
     * OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser()); int i = 0; try { datas =
     * OPreenregistrement.generationDataForNotif(); new logger().OCategory.info("datas taille " + datas.size()); for
     * (String OString : datas) { new logger().OCategory.info("OString " + OString); String[] tabString =
     * OString.split("|"); this.BuidlDataToNotify(tabString[0], tabString[1]); if
     * (this.getMessage().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) { i++; } }
     *
     * if (datas.size() > 0) { if (i == datas.size()) {
     * this.buildSuccesTraceMessage("Tous les messages ont été envoyé"); } else { this.buildErrorTraceMessage(i + "/" +
     * datas.size() + " messages ont été envoyé"); } }
     *
     * } catch (Exception e) { e.printStackTrace(); } return this.getDetailmessage(); }
     */
    // fin envoi de sms aux clients avoir
    @Override
    public int doservice(String strResult, String str_phone, String str_REF) {
        int result = 0;
        try {
            this.BuidlDataToNotify(strResult, str_phone, str_REF);
            if (this.getMessage().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                result++;
            }
        } catch (Exception e) {
        }
        return result;
    }

    @Override
    public String BuidlDataToNotify(String strResult, String str_phone) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    public TOutboudMessage getTOutboudMessage(String str_REF) {
        TOutboudMessage OTOutboudMessage = null;
        try {
            OTOutboudMessage = (TOutboudMessage) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TOutboudMessage t WHERE t.strREF = ?1").setParameter(1, str_REF)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTOutboudMessage;
    }

    @Override
    public TOutboudMessage saveNotification(String strResult, String str_phone, String str_REF) {
        TOutboudMessage OTOutboudMessage = null;
        try {
            OTOutboudMessage = this.getTOutboudMessage(str_REF);
            if (OTOutboudMessage == null) {
                OTOutboudMessage = new TOutboudMessage();
                OTOutboudMessage.setLgOUTBOUNDMESSAGEID(this.getKey().getComplexId());
                OTOutboudMessage.setStrMESSAGE(strResult);
                OTOutboudMessage.setStrPHONE(str_phone);
                OTOutboudMessage.setStrREF(str_REF);
                OTOutboudMessage.setDtCREATED(new Date());
                OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Waiting);// Statut waitning
                if (this.persiste(OTOutboudMessage)) {
                    this.buildSuccesTraceMessage("Prise en compte de la notification effectuée avec succès");
                } else {
                    this.buildErrorTraceMessage("Echec de prise en compte de la notification");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la notification");
        }
        return OTOutboudMessage;

    }
}
