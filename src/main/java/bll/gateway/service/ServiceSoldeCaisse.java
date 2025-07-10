/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.service;

import bll.teller.caisseManagement;

import dal.TInboudMessage;
import dal.TOutboudMessage;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
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
    public String doservice(TInboudMessage OTInboudMessage) {
        String str_result = "";

        try {

            caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
            str_result = OcaisseManagement.GetSoldeCaisse(this.getOTUser().getLgUSERID()) + ";" + str_result;
            this.buildSuccesTraceMessage("result : " + str_result + "   ");
            return this.BuidlDataToNotify(str_result, OTInboudMessage);

        } catch (Exception e) {
            // this.setMessage(commonparameter.PROCESS_FAILED + " " + e.getMessage());
            this.buildErrorTraceMessage("Le services est indisponible", e.getMessage());
        }

        return str_result;
    }

    @Override
    public String BuidlDataToNotify(String str_result, TInboudMessage OTInboudMessage) {
        // Creer une ligne dans outbound_message statut waitning
        TOutboudMessage OTOutboudMessage = new TOutboudMessage();
        OTOutboudMessage.setLgOUTBOUNDMESSAGEID(this.getKey().getComplexId());
        OTOutboudMessage.setStrMESSAGE(str_result);
        OTOutboudMessage.setStrPHONE(OTInboudMessage.getStrPHONE());
        OTOutboudMessage.setDtCREATED(new Date());
        OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Waiting);// Statut waitning

        this.persiste(OTOutboudMessage);
        // webservice Owebservice = new clientservice.webservice();
        //
        //
        // if (Owebservice.send_SMS(OTInboudMessage.getStrPHONE(), str_result)) {
        // //Met a jour le statut de out_bound message
        // OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Valided);//Statut waitning
        //
        //
        // this.persiste(OTOutboudMessage);
        //
        //
        // } else {
        // this.buildErrorTraceMessage("Impossible d'envoyer le SMS", Owebservice.getMessage());
        //
        //
        // }

        return str_result;

    }
}
