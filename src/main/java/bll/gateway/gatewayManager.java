/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.gateway;

import bll.common.Parameter;
import bll.gateway.service.Iservice;
import bll.gateway.service.ServiceStock;
import dal.TInboudMessage;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class gatewayManager extends bll.bllBase {

    public gatewayManager(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void processMessage(String Strmessage, String StrPhone) {
        StrPhone = StrPhone.replace("+", "");
        StrPhone = StrPhone.replaceAll("225", "");

        Strmessage = Strmessage.toUpperCase();
        Strmessage = Strmessage.replaceAll(" ", "");

        new logger().OCategory.info("StrPhone :" + StrPhone);
        new logger().OCategory.info("Strmessage :" + StrPhone);

        TInboudMessage OTInboudMessage = this.saveTInboudMessage(Strmessage, StrPhone);
        if (!this.IsAuthorized(OTInboudMessage)) {
            this.buildErrorTraceMessage("Pas authoriez");
            return;
        }
        this.doServices(OTInboudMessage);
    }

    // Enregistrement dans inbound_message
    public TInboudMessage saveTInboudMessage(String Strmessage, String StrPhone) {
        TInboudMessage OTInboudMessage = new TInboudMessage();
        OTInboudMessage.setLgINBOUNDMESSAGEID(this.getKey().getComplexId());
        OTInboudMessage.setStrMESSAGE(Strmessage);
        OTInboudMessage.setStrPHONE(StrPhone);
        OTInboudMessage.setDtCREATED(new Date());
        OTInboudMessage.setStrSTATUT(commonparameter.statut_intrusion);// Statut intrusion
        this.persiste(OTInboudMessage);
        return OTInboudMessage;
    }

    // Athentification du l'emetteur du sms
    public Boolean IsAuthorized(TInboudMessage OTInboudMessage) {

        try {
            // Verrifier si il existe dans t_user_phone et si son statut est enable
            /*
             * TUserFone OTUserFone = (TUserFone) this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TUserFone t WHERE t.strPHONE = ?1 AND t.strSTATUT = ?2"). setParameter(1,
             * OTInboudMessage.getStrPHONE()). setParameter(2, commonparameter.statut_enable). getSingleResult();
             */
            // si oui recuperer le T_user
            // Verrifier si le user es enable si ou stocker dans Ot_user public (this.setOtuser(...))
            // et tu renvoie true tu modifie le statut de OTInboudMessage athorize
            // this.setOTUser(OTUserFone.getLgUSERID());
            OTInboudMessage.setStrSTATUT(commonparameter.statut_authorized);
            OTInboudMessage.setDtUPDATED(new Date());
            this.persiste(OTInboudMessage);
            return true;

        } catch (Exception e) {
            this.setMessage(commonparameter.PROCESS_FAILED + "  " + e.getMessage());
            new logger().oCategory.fatal(e.getMessage());
        }

        // sin false
        return false;
    }

    // Verrifier le contenu du message selon le disctionnare et executer la requet et renvoyer un resultat
    public void doServices(TInboudMessage OTInboudMessage) {

        Iservice OIservice = null;
        String strCode = this.getServiceCode(OTInboudMessage.getStrMESSAGE());
        if (strCode.equals(Parameter.STR_SMS_CODE_GET_STOCK)) {
            OIservice = new ServiceStock();
            OIservice.init(this.getOdataManager());

        } else {
            this.buildErrorTraceMessage("Code inconnue", strCode + "-> " + OTInboudMessage.getStrMESSAGE());
            return;
        }
        String Result = OIservice.doservice(OTInboudMessage);

        this.buildErrorTraceMessage(Result);
    }
    // aller verifier ds la table dictionnaire si le code renvoyer is like a un code ds la table et renvoyer le vrai
    // code

    private String getServiceCode(String strMessage) {
        // strMessage = Parameter.STR_SMS_CODE_GET_STOCK;

        return strMessage;
    }
}
