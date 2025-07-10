/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.outService;

import bll.notification.alert.alertManagement;
import bll.teller.caisseManagement;
//import clientservice.webservice;
import dal.TAlertEventUserFone;
import dal.TCaisse;

import dal.TOutboudMessage;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;

/**
 *
 * @author user
 */
public class ServiceSoldeCaisse extends bll.bllBase implements Iservice {

    @Override
    public void init(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public ServiceSoldeCaisse(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();

    }

    @Override
    public String doservice(TAlertEventUserFone OTAlertEventUserFone) {
        Double str_result = 0.0;

        try {

            caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
            // str_result = OcaisseManagement.GetSoldeCaisse(this.getOTUser().getLgUSERID()) + ";" + str_result;

            List<TCaisse> LstTCaisse = OcaisseManagement.getAllCaisse();

            for (int i = 0; i < LstTCaisse.size(); i++) {
                str_result = str_result + LstTCaisse.get(i).getIntSOLDE();
            }
            this.buildSuccesTraceMessage("result : " + str_result + "   ");
            return this.BuidlDataToNotify(str_result + "", OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE());

        } catch (Exception e) {
            // this.setMessage(commonparameter.PROCESS_FAILED + " " + e.getMessage());
            this.buildErrorTraceMessage("Le services est indisponible", e.getMessage());
        }

        return str_result + "";
    }

    @Override
    public String BuidlDataToNotify(String str_result, String str_phone) {
        // Creer une ligne dans outbound_message statut waitning

        alertManagement OalertManagement = new alertManagement(this.getOdataManager());
        OalertManagement.addParameter("[ml_SOLDE]", str_result);
        String data = OalertManagement.notify("N_GET_SOLDE_CAISSE", commonparameter.Lg_FRANCAIS);

        TOutboudMessage OTOutboudMessage = new TOutboudMessage();
        OTOutboudMessage.setLgOUTBOUNDMESSAGEID(this.getKey().getComplexId());
        OTOutboudMessage.setStrMESSAGE(data);
        OTOutboudMessage.setStrPHONE(str_phone);
        OTOutboudMessage.setDtCREATED(new Date());
        OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Waiting);// Statut waitning

        this.persiste(OTOutboudMessage);
        // webservice Owebservice = new clientservice.webservice();
        //
        // if (Owebservice.send_SMS(str_phone, OTOutboudMessage.getStrMESSAGE())) {
        // //Met a jour le statut de out_bound message
        // OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Valided);//Statut waitning
        //
        // this.persiste(OTOutboudMessage);
        //
        // } else {
        // this.buildErrorTraceMessage("Impossible d'envoyer le SMS", Owebservice.getMessage());
        //
        // }

        return str_result;

    }

    @Override
    public int doservice(String strResult, String str_phone, String str_REF) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public String BuidlDataToNotify(String strResult, String str_phone, String str_REF) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public TOutboudMessage saveNotification(String strResult, String str_phone, String str_REF) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

}
