/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.service;


import dal.TInboudMessage;
import dal.TOutboudMessage;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author user
 */
public class ServiceStock extends bll.bllBase implements Iservice {

    @Override
    public void init(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    
    
   
    
    @Override
    public String doservice(TInboudMessage OTInboudMessage) {
        String str_result = "";
        try {
           /* List<TProductItemStock> LstTProductItemStock = new ArrayList<TProductItemStock>();
            LstTProductItemStock = this.getOdataManager().getEm().createQuery("SELECT t FROM TProductItemStock t ORDER BY t.lgPRODUCTITEMID.strNAME,t.dtCREATED  ").getResultList();
            for (int i = 0; i < LstTProductItemStock.size(); i++) {
                TProductItemStock OTProductItemStock = LstTProductItemStock.get(i);
                str_result = OTProductItemStock.getLgPRODUCTITEMID().getStrNAME() + "(" + OTProductItemStock.getIntNUMBER() + ");" + str_result;
            }
            */
            str_result ="Un test";
            return this.BuidlDataToNotify(str_result, OTInboudMessage);
        } catch (Exception e) {
            // this.setMessage(commonparameter.PROCESS_FAILED + "  " + e.getMessage());
            this.buildErrorTraceMessage("Le services est indisponible", e.getMessage());
        }

        return str_result;

    }

    @Override
    public String BuidlDataToNotify(String str_result, TInboudMessage OTInboudMessage) {

        //Creer une ligne dans outbound_message statut waitning
        TOutboudMessage OTOutboudMessage = new TOutboudMessage();
        OTOutboudMessage.setLgOUTBOUNDMESSAGEID(this.getKey().getComplexId());
        OTOutboudMessage.setStrMESSAGE(str_result);
        OTOutboudMessage.setStrPHONE(OTInboudMessage.getStrPHONE());
        OTOutboudMessage.setDtCREATED(new Date());
        OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Waiting);//Statut waitning
        this.persiste(OTOutboudMessage);
//        webservice Owebservice = new clientservice.webservice();
//        if (Owebservice.send_SMS(OTInboudMessage.getStrPHONE(), str_result)) {
//            //Met a jour le statut de out_bound message
//            OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Valided);//Statut waitning
//            this.persiste(OTOutboudMessage);
//        } else {
//            this.buildErrorTraceMessage("Impossible d'envoyer le SMS", Owebservice.getMessage());
//        }


        return str_result;
    }
}