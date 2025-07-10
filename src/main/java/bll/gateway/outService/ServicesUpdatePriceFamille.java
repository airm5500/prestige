/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway.outService;

import bll.common.Parameter;
import bll.eventlog.EventLogManagement;
import dal.TAlertEventUserFone;
import dal.TEventLog;
import dal.TOutboudMessage;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author TBEKOLA
 */
public class ServicesUpdatePriceFamille extends bll.bllBase implements Iservice {

    @Override
    public void init(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public ServicesUpdatePriceFamille(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();

    }

    @Override
    public String doservice(TAlertEventUserFone OTAlertEventUserFone) {
        Double str_result = 0.0;

        try {
            List<TEventLog> LstTEventLog = new EventLogManagement(this.getOdataManager())
                    .GetLstTEventLog(Parameter.KEY_TABLE_TFAMILLE);
            this.getOdataManager().BeginTransaction();
            for (int i = 0; i < LstTEventLog.size(); i++) {
                this.refresh(LstTEventLog.get(i));
                new logger().OCategory.info(LstTEventLog.get(i).getStrDESCRIPTION() + "****"
                        + OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE());
                this.buildSuccesTraceMessage("result : " + str_result + "   ");
                // this.BuidlDataToNotify(LstTEventLog.get(i).getStrDESCRIPTION() + "",
                // OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE()); //a decommenter en cas de probleme 09/08/2016
                this.saveNotification(LstTEventLog.get(i).getStrDESCRIPTION() + "",
                        OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE(), this.getKey().getComplexId()); //
                LstTEventLog.get(i).setStrSTATUT(commonparameter.statut_Read);
                this.getOdataManager().getEm().merge(LstTEventLog.get(i));
            }
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage("result : " + str_result + "   ");

        } catch (Exception e) {
            e.printStackTrace();
            // this.setMessage(commonparameter.PROCESS_FAILED + " " + e.getMessage());
            this.buildErrorTraceMessage("Le services est indisponible", e.getMessage());
        }

        return this.getDetailmessage() + "";
    }

    @Override
    public String BuidlDataToNotify(String str_result, String str_phone) {
        // Creer une ligne dans outbound_message statut waitning

        try {

            /*
             * TOutboudMessage OTOutboudMessage = new TOutboudMessage();
             * OTOutboudMessage.setLgOUTBOUNDMESSAGEID(this.getKey().getComplexId());
             * OTOutboudMessage.setStrMESSAGE(str_result); OTOutboudMessage.setStrPHONE(str_phone);
             * OTOutboudMessage.setDtCREATED(new Date());
             * OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Waiting);//Statut waitning
             * this.getOdataManager().getEm().persist(OTOutboudMessage);
             */
            TOutboudMessage OTOutboudMessage = this.saveNotification(str_result, str_phone,
                    this.getKey().getComplexId());
            // webservice Owebservice = new clientservice.webservice();
            //
            // if (Owebservice.send_SMS(str_phone, OTOutboudMessage.getStrMESSAGE())) {
            // //Met a jour le statut de out_bound message
            // OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Valided);//Statut waitning
            //
            // this.getOdataManager().getEm().persist(OTOutboudMessage);
            //
            // } else {
            // this.buildErrorTraceMessage("Impossible d'envoyer le SMS", Owebservice.getMessage());
            //
            // }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return str_result;

    }

    // relancer les sms non envoyé
    public void reloadSms(String search_value, String lg_OUTBOUND_MESSAGE_ID, int int_MAX_ROW) {
        List<TOutboudMessage> lstTOutboudMessage;
        int i = 0;
        try {

            lstTOutboudMessage = this.getListeMessageWaiting(search_value, lg_OUTBOUND_MESSAGE_ID, int_MAX_ROW);
            // webservice Owebservice = new clientservice.webservice();
            // for (TOutboudMessage OTOutboudMessage : lstTOutboudMessage) {
            // if (Owebservice.send_SMS(OTOutboudMessage.getStrPHONE(), OTOutboudMessage.getStrMESSAGE())) {
            // //Met a jour le statut de out_bound message
            // OTOutboudMessage.setStrSTATUT(commonparameter.statut_is_Valided);//Statut waitning
            // this.persiste(OTOutboudMessage);
            // i++;
            // } /*else {
            // this.buildErrorTraceMessage("Impossible d'envoyer le SMS", Owebservice.getMessage());
            // }*/
            //
            // }
            if (lstTOutboudMessage.size() > 0) {
                if (lstTOutboudMessage.size() == i) {
                    this.buildSuccesTraceMessage("Notification envoyée succès");
                } else {
                    this.buildErrorTraceMessage(i + "/" + lstTOutboudMessage.size() + " message(s) envoyé(s)");
                }
            } else {
                this.buildErrorTraceMessage("Aucune notification en attente");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    // fin relancer les sms non envoyé

    // liste des messages en attente
    public List<TOutboudMessage> getListeMessageWaiting(String search_value, String lg_OUTBOUND_MESSAGE_ID,
            int int_MAX_ROW) {
        List<TOutboudMessage> lstTOutboudMessage = new ArrayList<TOutboudMessage>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (int_MAX_ROW == 0) {
                lstTOutboudMessage = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TOutboudMessage t WHERE t.strPHONE LIKE ?1 AND t.strSTATUT = ?2 AND t.lgOUTBOUNDMESSAGEID LIKE ?3")
                        .setParameter(1, search_value + "%").setParameter(2, commonparameter.statut_is_Waiting)
                        .setParameter(3, lg_OUTBOUND_MESSAGE_ID).getResultList();
            } else {
                lstTOutboudMessage = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TOutboudMessage t WHERE t.strPHONE LIKE ?1 AND t.strSTATUT = ?2 AND t.lgOUTBOUNDMESSAGEID LIKE ?3")
                        .setParameter(1, search_value + "%").setParameter(2, commonparameter.statut_is_Waiting)
                        .setParameter(3, lg_OUTBOUND_MESSAGE_ID).setMaxResults(int_MAX_ROW).getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTOutboudMessage;
    }

    // fin liste des messages en attente

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
                this.getOdataManager().getEm().persist(OTOutboudMessage);
                this.buildSuccesTraceMessage("Prise en compte de la notification effectuée avec succès");
                /*
                 * if(this.persiste(OTOutboudMessage)) {
                 * this.buildSuccesTraceMessage("Prise en compte de la notification effectuée avec succès"); } else {
                 * this.buildErrorTraceMessage("Echec de prise en compte de la notification"); }
                 */
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la notification");
        }
        return OTOutboudMessage;

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

}
