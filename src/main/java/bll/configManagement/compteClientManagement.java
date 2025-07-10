/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TClient;
import dal.TCompteClient;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class compteClientManagement extends bllBase {

    Object Otable = TCompteClient.class;

    public compteClientManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE_COMPTE_CLIENT, double dbl_QUOTA_CONSO_MENSUELLE, double dbl_SOLDE,
            double dbl_CAUTION, String lg_CLIENT_ID) {
        try {

            TClient OTClient = this.getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);
            if (OTClient == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        " Ref CLIENT : " + OTClient + "  Invalide ");
                return;
            }
            this.create(str_CODE_COMPTE_CLIENT, dbl_QUOTA_CONSO_MENSUELLE, dbl_SOLDE, dbl_SOLDE, OTClient);
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public TCompteClient create(String str_CODE_COMPTE_CLIENT, double dbl_QUOTA_CONSO_MENSUELLE, double dbl_CAUTION,
            double dbl_SOLDE, TClient OTClient) {
        try {

            TCompteClient OTCompteClient = new TCompteClient();

            OTCompteClient.setLgCOMPTECLIENTID(this.getKey().getComplexId());
            OTCompteClient.setStrCODECOMPTECLIENT(str_CODE_COMPTE_CLIENT);
            OTCompteClient.setDblQUOTACONSOMENSUELLE(dbl_QUOTA_CONSO_MENSUELLE);
            OTCompteClient.setDblCAUTION(dbl_CAUTION);
            OTCompteClient.setDecBalance(dbl_SOLDE);

            if (OTClient == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        " Ref CLIENT : " + OTClient + "  Invalide ");
                return null;
            }
            OTCompteClient.setLgCLIENTID(OTClient);

            OTCompteClient.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClient.setDtCREATED(new Date());

            this.persiste(OTCompteClient);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTCompteClient;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
            return null;
        }

    }

    // public void update(String lg_COMPTE_CLIENT_ID, String str_CODE_COMPTE_CLIENT, double dbl_QUOTA_CONSO_MENSUELLE,
    // double dbl_CAUTION, double dbl_SOLDE) {
    public void update(String lg_COMPTE_CLIENT_ID, String str_CODE_COMPTE_CLIENT, double dbl_QUOTA_CONSO_MENSUELLE,
            double dbl_CAUTION) {
        try {

            TCompteClient OTCompteClient = null;

            OTCompteClient = getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);

            /*
             * try {
             *
             * //lg_CLIENT_ID dal.TClient OTClient = getOdataManager().getEm().find(dal.TClient.class, lg_CLIENT_ID); if
             * (OTClient != null) { OTCompteClient.setLgCLIENTID(OTClient); new
             * logger().oCategory.info("lg_CLIENT_ID     Create   " + lg_CLIENT_ID); }
             *
             * } catch (Exception e) {
             *
             * new logger().oCategory.info("Impossible de mettre a jour les donnees vennant des cles etrangeres   "); }
             */

            OTCompteClient.setStrCODECOMPTECLIENT(str_CODE_COMPTE_CLIENT);
            OTCompteClient.setDblQUOTACONSOMENSUELLE(dbl_QUOTA_CONSO_MENSUELLE);
            OTCompteClient.setDblCAUTION(dbl_CAUTION);
            // OTCompteClient.setDecBalance(dbl_SOLDE);

            OTCompteClient.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClient.setDtUPDATED(new Date());

            this.persiste(OTCompteClient);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }

    }

    public void delete(String lg_COMPTE_CLIENT_ID) {

        try {

            TCompteClient OTCompteClient = null;

            OTCompteClient = getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);

            OTCompteClient.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTCompteClient);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de supprimer un " + Otable, e.getMessage());
        }

    }

    public List<TCompteClient> getAllCompteClient() {

        List<dal.TCompteClient> lstTCompteClient = null;

        try {

            lstTCompteClient = getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCompteClient t WHERE  t.strSTATUT LIKE ?1 ")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info(lstTCompteClient.size());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.buildSuccesTraceMessage("CompteClient(s) Existant(s)   :: " + lstTCompteClient);
            return lstTCompteClient;

        } catch (Exception e) {
            this.buildErrorTraceMessage("CompteClient Inexistant ", e.getMessage());
            return lstTCompteClient;
        }

    }

    // creation d'un compte client

    public TCompteClient createCompteClient(String str_CODE_COMPTE_CLIENT, double dbl_QUOTA_CONSO_MENSUELLE,
            double dbl_CAUTION, int dbl_SOLDE, String str_TYPE, String P_KEY) {
        // boolean result = false;
        try {

            TCompteClient OTCompteClient = new TCompteClient();

            OTCompteClient.setLgCOMPTECLIENTID(this.getKey().getComplexId());
            OTCompteClient.setStrCODECOMPTECLIENT(str_CODE_COMPTE_CLIENT);
            // OTCompteClient.setDblQUOTACONSOMENSUELLE(dbl_QUOTA_CONSO_MENSUELLE); // a decommenter en cas de probleme.
            // 17/08/2016
            OTCompteClient.setDblQUOTACONSOMENSUELLE(0.0); // forcer l'initialisation de la consommation a 0. La
                                                           // consommation du quota evolue au fur et a mesure de vente
            OTCompteClient.setDblPLAFOND(dbl_QUOTA_CONSO_MENSUELLE); // code ajouté
            OTCompteClient.setPKey(P_KEY);
            OTCompteClient.setDblCAUTION(dbl_CAUTION);
            OTCompteClient.setDecBalanceInDisponible(dbl_SOLDE);
            OTCompteClient.setDecbalanceDisponible(dbl_SOLDE);
            OTCompteClient.setStrTYPE(str_TYPE);
            OTCompteClient.setStrSTATUT(commonparameter.statut_enable);
            OTCompteClient.setDtCREATED(new Date());

            this.persiste(OTCompteClient);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTCompteClient;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
            return null;
        }

    }

    // fin creation d'un compte client

    // recuperation d'un compte client
    public TCompteClient getTCompteClient(String P_KEY) {
        TCompteClient OTCompteClient = null;
        try {
            OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, P_KEY).setParameter(2, commonparameter.statut_enable).getSingleResult();
            if (OTCompteClient != null) {
                this.refresh(OTCompteClient);
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTCompteClient;
    }

    // fin recuperation d'un compte client

    // Fonction pour avoir le CA, le nombre de client et l'encours d'un tiers payant

    // public JSONObject

}
