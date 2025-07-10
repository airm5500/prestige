/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.service;

import bll.teller.caisseManagement;
import dal.TInboudMessage;
import dal.dataManager;

/**
 *
 * @author TBEKOLA
 */
public class ServiceCaisse extends bll.bllBase implements Iservice {

    @Override
    public void init(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
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
            this.buildErrorTraceMessage("Le services est indisponible", e.getMessage());
        }

        return str_result;
    }

    @Override
    public String BuidlDataToNotify(String strResult, TInboudMessage OTInboudMessage) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

}
