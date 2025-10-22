/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.userManagement;

import bll.bllBase;
import bll.preenregistrement.Preenregistrement;
import dal.TOfficine;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import javax.persistence.TypedQuery;
import toolkits.parameters.commonparameter;
import toolkits.security.Md5;
import toolkits.utils.logger;

/**
 *
 * @author Administrator
 */
public class authentification extends bllBase {

    public authentification() {
        checkDatamanager();
    }

    public authentification(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        checkDatamanager();
    }

    @SuppressWarnings("static-access")
    public boolean loginUser(String Str_Password, String Str_login) {

        // String Str_Password_MD5 = Md5.encode(Str_Password);
        String Str_Password_MD5 = null;
        boolean result = false;
        try {

            TypedQuery<TUser> q = this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TUser t WHERE t.strLOGIN = ?1 AND t.strPASSWORD = ?2 AND t.strSTATUT =?3 ",
                            TUser.class)
                    // .setParameter(1, Str_login).setParameter(2, Str_Password_MD5)
                    .setParameter(3, null).setMaxResults(1);
            TUser OTUser = q.getSingleResult();

            if (OTUser == null) {
                this.buildErrorTraceMessage("Accès incorrect. Utilisateur non valide");
                return result;
            }

            OTUser.setStrLASTCONNECTIONDATE(new Date());
            OTUser.setIntCONNEXION(OTUser.getIntCONNEXION() + 1);
            OTUser.setBIsConnected(true);
            if (this.persiste(OTUser)) {

                this.buildSuccesTraceMessage(
                        "Connexion de " + OTUser.getStrLOGIN() + "  -- " + OTUser.getStrLASTCONNECTIONDATE());
                result = true;
                this.setOTUser(OTUser);
            } else {
                this.buildErrorTraceMessage("Echec de connexion de l'utilisateur. Vérifiez vos accès");
            }

        } catch (Exception ex) {
            ex.printStackTrace(System.err);
            this.buildErrorTraceMessage("Echec de connexion de l'utilisateur. Vérifiez vos accès");

        }

        return result;
    }

    public boolean GetUserConnexionState(String lg_USER_ID) {
        TUser OTuser = this.getOdataManager().getEm().find(TUser.class, lg_USER_ID);

        if (OTuser == null) {
            new logger().OCategory.info(" Desole cet utilisateur nexiste pas ");
            this.buildErrorTraceMessage(" ERROR  ", " Desole cet utilisateur nexiste pas ");
            return false;
        }
        if (OTuser.getBIsConnected() == null) {
            new logger().OCategory.info(" Desole cet utilisateur nest pas connecte ");
            this.buildErrorTraceMessage(" ERROR  ", " Desole cet utilisateur nest pas connecte ");
            return false;
        }
        if (OTuser.getBIsConnected().equals(false)) {
            new logger().OCategory.info(" Desole cet utilisateur nest pas connecte ");
            this.buildErrorTraceMessage(" ERROR  ", " Desole cet utilisateur nest pas connecte ");
            return false;
        } else {
            new logger().OCategory.info(" Cet utilisateur est connecte ");
            this.buildSuccesTraceMessage(" Cet utilisateur est connecte ");
            return true;
        }

    }

    public boolean GetUserConnexionState(TUser OTuserCome) {
        boolean result = false;
        TUser OTuser = OTuserCome;
        try {
            new logger().OCategory.info("User avant " + OTuserCome.getStrFIRSTNAME() + " " + OTuserCome.getStrLASTNAME()
                    + "|Statut:" + OTuserCome.getBIsConnected());
            // this.getOdataManager().getEm().clear();
            this.getOdataManager().getEm().getEntityManagerFactory().getCache().evictAll(); // vider le cache de l'objet
            new logger().OCategory.info("User affecté " + OTuser.getStrFIRSTNAME() + " " + OTuser.getStrLASTNAME()
                    + "|Statut:" + OTuserCome.getBIsConnected());
            new logger().OCategory.info("User après " + OTuserCome.getStrFIRSTNAME() + " " + OTuserCome.getStrLASTNAME()
                    + "|Statut:" + OTuserCome.getBIsConnected());
            if (OTuser == null) {
                // new logger().OCategory.info("User affecté dans le null:"+OTuser.getStrFIRSTNAME() + " " +
                // OTuser.getStrLASTNAME()+ "|Statut:"+OTuserCome.getBIsConnected());
                this.buildErrorTraceMessage("Desole cet utilisateur n'existe pas");
                return false;
            }

            this.refresh(OTuser);
            new logger().OCategory.info("Utilisateur dans BLL " + OTuser.getStrFIRSTNAME() + " "
                    + OTuser.getStrLASTNAME() + " etat " + OTuser.getBIsConnected());
            if (OTuser.getBIsConnected() == null || OTuser.getBIsConnected().equals(false)) {
                this.buildErrorTraceMessage("Desole cet utilisateur n'est pas connecté");
                return false;
            }

            this.buildSuccesTraceMessage("Cet utilisateur est connecté");
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Utilisateur inexistant ou non connecté");
        }
        new logger().OCategory.info(this.getDetailmessage());
        return result;
    }

    public TUser SetUserConnexionStateAtDeconnexion(String lg_USER_ID) {
        TUser OTuser = this.getOdataManager().getEm().find(TUser.class, lg_USER_ID);

        if (OTuser == null) {
            new logger().OCategory.info(" Desole cet utilisateur nexiste pas ");
            this.buildErrorTraceMessage(" ERROR  ", " Desole cet utilisateur nexiste pas ");
            return null;
        } else {

            OTuser.setBIsConnected(false);
            this.persiste(OTuser);
            TOfficine OTOfficine = this.getOdataManager().getEm().find(TOfficine.class, "1");
            new Preenregistrement(this.getOdataManager(), OTuser).reinitializeDisplay(OTOfficine.getStrNOMABREGE(),
                    "   CAISSE FERMEE");
            new logger().OCategory.info(" User Deconnecte avec Succes ");
            this.buildSuccesTraceMessage(" User Deconnecte avec Succes ");
            return OTuser;
        }
    }

}
