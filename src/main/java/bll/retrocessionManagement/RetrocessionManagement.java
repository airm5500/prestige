/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.retrocessionManagement;

import bll.bllBase;
import bll.configManagement.clientManagement;
import dal.TClient;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamilleStockretrocession;
import dal.TUser;
import dal.dataManager;
import dal.TRetrocession;
import dal.TRetrocessionDetail;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class RetrocessionManagement extends bllBase {

    public RetrocessionManagement(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public RetrocessionManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    // creation retrocession
    ////// public TRetrocession createRetrocession(String str_COMMENTAIRE, int int_MONTANT_HT, int int_MONTANT_TTC,
    ////// String lg_CLIENT_ID, String lg_REMISE_ID, String lg_ESCOMPTE_SOCIETE_ID, String lg_TVA_ID) {
    public TRetrocession createRetrocession(String str_COMMENTAIRE, int int_MONTANT_HT, int int_MONTANT_TTC,
            String lg_CLIENT_ID, int int_REMISE, int int_ESCOMPTE_SOCIETE) {
        try {

            TClient OTClient = new clientManagement(this.getOdataManager()).getClient(lg_CLIENT_ID);
            // new logger().OCategory.info("Client " + OTClient.getStrFIRSTNAME() + " " + OTClient.getStrLASTNAME());
            /*
             * TRemise OTRemise = this.getOdataManager().getEm().find(TRemise.class, lg_REMISE_ID); new
             * logger().OCategory.info("Remise " + OTRemise.getStrCODE() + " " + OTRemise.getStrNAME());
             *
             * TEscompteSocieteTranche OTEscompteSocieteTranche =
             * this.getOdataManager().getEm().find(TEscompteSocieteTranche.class, lg_ESCOMPTE_SOCIETE_TRANCHE_ID); new
             * logger().OCategory.info("Escompte société " +
             * OTEscompteSocieteTranche.getLgESCOMPTESOCIETEID().getStrLIBELLEESCOMPTESOCIETE() +
             * " Tranche taux "+OTEscompteSocieteTranche.getLgTRANCHEID().getDblPOURCENTAGETRANCHE());
             */
            /*
             * TTva OTTva = this.getOdataManager().getEm().find(TTva.class, lg_TVA_ID); new
             * logger().OCategory.info("Tva " + OTTva.getStrLIBELLEE());
             */
            new logger().OCategory
                    .info("Créé par " + this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME());
            TRetrocession OTRetrocession = new TRetrocession();
            OTRetrocession.setLgRETROCESSIONID(this.getKey().getComplexId());
            OTRetrocession.setLgCLIENTID(OTClient);
            OTRetrocession.setIntREMISE(int_REMISE);
            OTRetrocession.setIntESCOMPTESOCIETE(int_ESCOMPTE_SOCIETE);
            // OTRetrocession.setLgTVAID(OTTva);
            OTRetrocession.setStrCOMMENTAIRE(str_COMMENTAIRE);
            // OTRetrocession.setStrREFERENCE(new Preenregistrement(this.getOdataManager(),
            // this.getOTUser()).buildVenteRef(new Date())); // a decommenter en cas de probleme
            OTRetrocession.setStrREFERENCE(this.getKey().getShortId(10));
            OTRetrocession.setStrSTATUT(commonparameter.statut_is_Process);
            OTRetrocession.setIntMONTANTHT(int_MONTANT_HT);
            OTRetrocession.setIntMONTANTTTC(int_MONTANT_TTC);
            OTRetrocession.setDtCREATED(new Date());
            OTRetrocession.setLgUSERID(this.getOTUser());
            this.persiste(OTRetrocession);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTRetrocession;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création");
            return null;
        }
    }
    // fin creation de retrocession

    // mise a jour retrocession
    // public TRetrocession updateRetrocession(String lg_RETROCESSION_ID, String str_REFERENCE, String str_COMMENTAIRE,
    // int int_MONTANT_HT, int int_MONTANT_TTC, String lg_CLIENT_ID, String lg_REMISE_ID, String lg_ESCOMPTE_SOCIETE_ID,
    // String lg_TVA_ID) {
    public TRetrocession updateRetrocession(String lg_RETROCESSION_ID, String str_COMMENTAIRE, String lg_CLIENT_ID,
            int int_REMISE, int int_ESCOMPTE_SOCIETE) {
        TClient OTClient = null;
        TRetrocession OTRetrocession = null;
        try {
            OTClient = new clientManagement(this.getOdataManager()).getClient(lg_CLIENT_ID);
            OTRetrocession = this.getOdataManager().getEm().find(TRetrocession.class, lg_RETROCESSION_ID);
            if (OTRetrocession == null) {
                this.buildErrorTraceMessage("Echec de mise à jour de la retrocession");
                return null;
            }
            OTRetrocession.setLgCLIENTID(OTClient);
            OTRetrocession.setIntREMISE(int_REMISE);
            OTRetrocession.setIntESCOMPTESOCIETE(int_ESCOMPTE_SOCIETE);
            OTRetrocession.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTRetrocession.setDtUPDATED(new Date());
            OTRetrocession.setLgUSERID(this.getOTUser());
            if (this.persiste(OTRetrocession)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la retrocession");
        }
        return OTRetrocession;
    }
    // fin mise a jour retrocession

    // suppression d'une retrocession
    public boolean removeRetrocession(String lg_RETROCESSION_ID) {
        boolean result = false;
        TRetrocession OTRetrocession;
        RetrocessionDetailManagement ORetrocessionDetailManagement = new RetrocessionDetailManagement(
                this.getOdataManager());
        List<TRetrocessionDetail> lstTRetrocessionDetail = new ArrayList<>();
        try {

            OTRetrocession = this.getOdataManager().getEm().find(TRetrocession.class, lg_RETROCESSION_ID);
            new logger().OCategory.info("Retrocession: " + OTRetrocession.getStrREFERENCE());
            OTRetrocession.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTRetrocession);
            lstTRetrocessionDetail = ORetrocessionDetailManagement
                    .showOneOrAllRetrocessionDetailByRetrocession(lg_RETROCESSION_ID);
            for (TRetrocessionDetail OTRetrocessionDetail : lstTRetrocessionDetail) {
                this.refresh(OTRetrocessionDetail);
                OTRetrocessionDetail.setStrSTATUT(commonparameter.statut_delete);
                this.persiste(OTRetrocessionDetail);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            }

        } catch (Exception e) {
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        }
        return result;
    }
    // fin suppression d'une retrocession

    // Liste des retrocessions
    public List<TRetrocession> SearchAllOrOneRetrocession(String search_value) {
        List<TRetrocession> lstTRetrocession = null;
        try {
            if (search_value == null || search_value.equals("")) {
                search_value = "%%";
            }
            new logger().OCategory.info("search_value ----->   " + search_value);
            lstTRetrocession = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetrocession t WHERE (t.lgRETROCESSIONID LIKE ?1 OR t.strREFERENCE LIKE ?2 OR t.lgUSERID.strFIRSTNAME LIKE ?3 OR t.lgUSERID.strLASTNAME LIKE ?4) AND t.strSTATUT = ?5 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(5, commonparameter.statut_enable).getResultList();
            for (int i = 0; i < lstTRetrocession.size(); i++) {
                new logger().OCategory.info("Retrocession: " + lstTRetrocession.get(i).getStrREFERENCE());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        return lstTRetrocession;
    }
    // fin Liste des retrocessions

    // clotruer une retrocession
    public TRetrocession closureRetrocession(String lg_RETROCESSION_ID, int int_REMISE, int int_ESCOMPTE_SOCIETE,
            String str_COMMENTAIRE) {
        TRetrocession OTRetrocession = null;
        try {
            OTRetrocession = this.getOdataManager().getEm().find(TRetrocession.class, lg_RETROCESSION_ID);
            if (OTRetrocession == null) {
                this.buildErrorTraceMessage("Echec de clôture de la retrocession");
                return null;
            }
            OTRetrocession.setDtUPDATED(new Date());
            OTRetrocession.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTRetrocession.setIntESCOMPTESOCIETE(int_ESCOMPTE_SOCIETE);
            OTRetrocession.setIntREMISE(int_REMISE);
            OTRetrocession.setIntMONTANTTTC(
                    OTRetrocession.getIntMONTANTTTC() - ((int) ((OTRetrocession.getIntMONTANTTTC() * int_REMISE) / 100)
                            + (int) ((OTRetrocession.getIntMONTANTTTC() * int_ESCOMPTE_SOCIETE) / 100)));
            OTRetrocession.setLgUSERID(this.getOTUser());
            OTRetrocession.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTRetrocession);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clotûre de la retrocession");
        }
        return OTRetrocession;
    }

    // fin cloturer une retrocession
    // creation de stock retrocession
    public boolean createStockRetrocession(TFamille OTFamille, int int_NUMBER_AVAILABLE) {
        boolean result = false;
        TFamilleStockretrocession OTFamilleStockretrocession = null;
        try {
            TFamilleStock OTFamilleStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, OTFamille.getLgFAMILLEID()).setParameter(2, this.getOTUser()).getSingleResult();
            try {
                OTFamilleStockretrocession = this.getOdataManager().getEm().find(TFamilleStockretrocession.class,
                        OTFamille.getLgFAMILLEID());
                new logger().OCategory
                        .info("Stock virtuel actuel " + OTFamilleStockretrocession.getIntNUMBERAVAILABLE());
                OTFamilleStockretrocession.setDtUPDATED(new Date());
                OTFamilleStockretrocession
                        .setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - int_NUMBER_AVAILABLE);
            } catch (Exception e) {
                // e.printStackTrace();
                OTFamilleStockretrocession = new TFamilleStockretrocession();
                OTFamilleStockretrocession.setLgFAMILLESTOCKRETROCESSIONID(this.getKey().getComplexId());
                OTFamilleStockretrocession.setDtCREATED(new Date());
                OTFamilleStockretrocession.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE());
            }
            OTFamilleStockretrocession.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());

            OTFamilleStockretrocession.setLgFAMILLEID(OTFamille);
            this.persiste(OTFamilleStockretrocession);
            result = true;
        } catch (Exception e) {
            // e.printStackTrace();
            new logger().OCategory.info("Famille stock inexistant");
        }
        return result;
    }
    // fin creation de stock retrocession

    public long getMontantTvaByRetrocession(String lg_RETROCESSION_ID) {
        long montanttva = 0l;
        String query = "SELECT (SUM(pd.`int_PRICE`)-SUM(CASE WHEN ct.`int_VALUE` >0 THEN ((pd.int_PRICE /(1+( ct.int_VALUE)/100))) ELSE pd.int_PRICE  END)) AS TOTAL_HT FROM t_famille t, t_retrocession_detail pd, t_code_tva ct WHERE t.lg_FAMILLE_ID = pd.lg_FAMILLE_ID AND ct.lg_CODE_TVA_ID = t.lg_CODE_TVA_ID AND pd.lg_RETROCESSION_ID ='"
                + lg_RETROCESSION_ID + "'";
        try {
            Object object = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            if (object != null) {
                montanttva = Double.valueOf(object + "").longValue();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return montanttva;
    }

}
