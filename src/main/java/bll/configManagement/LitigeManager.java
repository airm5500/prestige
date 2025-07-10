/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import bll.preenregistrement.Preenregistrement;
import bll.tierspayantManagement.tierspayantManagement;
import dal.TCompteClient;
import dal.TFactureDetail;
import dal.TLitige;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TSnapshotPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TTypelitige;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class LitigeManager extends bllBase {

    TLitige OTLitige = new TLitige();

    public LitigeManager(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public LitigeManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    // recupere le type de litige
    public TTypelitige getTTypelitige(String lg_TYPELITIGE_ID) {
        TTypelitige OTTypelitige = null;
        try {
            OTTypelitige = (TTypelitige) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypelitige t WHERE (t.lgTYPELITIGEID LIKE ?1 OR t.strDESCRIPTION LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_TYPELITIGE_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
            new logger().OCategory.info("Description " + OTTypelitige.getStrDESCRIPTION());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypelitige;
    }
    // fin recupere le type de litige

    // fonction pour créer un litige
    public boolean createLitige(String str_NAME, String str_DESCRIPTION, String lg_PREENREGISTREMENT_ID,
            String lg_TIERS_PAYANT_ID, String lg_TYPELITIGE_ID) {
        boolean result = false;
        List<TPreenregistrementCompteClientTiersPayent> list = new ArrayList<>();
        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        try {
            TTypelitige OTypelitige = this.getTTypelitige(lg_TYPELITIGE_ID);
            TPreenregistrement OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            TTiersPayant OTTiersPayant = new tierspayantManagement(this.getOdataManager())
                    .getTTiersPayant(lg_TIERS_PAYANT_ID);

            list = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t,TFactureDetail f WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2 AND t.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=f.strREF AND f.lgFACTUREDETAILID NOT IN (SELECT d.lgFACTUREDETAILID.lgFACTUREDETAILID FROM TDossierReglementDetail d ,TFactureDetail fa WHERE fa.lgFACTUREDETAILID=d.lgFACTUREDETAILID.lgFACTUREDETAILID)")
                    .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID())
                    .setParameter(2, OTTiersPayant.getLgTIERSPAYANTID()).getResultList();

            if (list.size() > 0) {
                OTPreenregistrementCompteClientTiersPayent = list.get(0);
                OTLitige.setLgLITIGEID(this.getKey().getComplexId());

                /*
                 * OTLitige.setStrNAME(str_NAME); OTLitige.setStrDESCRIPTION(str_DESCRIPTION);
                 * OTLitige.setLgTYPELITIGEID(OTypelitige); OTLitige.setStrSTATUT(commonparameter.statut_enable);
                 * OTLitige.setDtCREATED(new Date());
                 * OTLitige.setIntAMOUNTDUS(OTPreenregistrementCompteClientTiersPayent.getIntPRICE());
                 * OTLitige.setIntAMOUNT(0); OTLitige.setIntECART(OTLitige.getIntAMOUNT() - OTLitige.getIntAMOUNTDUS());
                 * OTLitige.setStrREF(this.getKey().getShortId(10));
                 * OTLitige.setStrREFCREATED(OTPreenregistrementCompteClientTiersPayent.
                 * getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
                 */
                this.persiste(OTLitige);
                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.statut_is_Litige);
                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                // if (this.removeSnapShotPreenregistrementComptecltTiersP(str_REF_SOURCE)) {
                if (this.persiste(OTPreenregistrementCompteClientTiersPayent)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                }
            } else {
                this.buildErrorTraceMessage("Un règlement est déjà fait sur la facture liée à ce dossier");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du litige");
        }
        return result;
    }
    // fin fonction pour créer un litige

    // fonction pour supprimer un litige
    public boolean deleteLitige(String lg_LITIGE_ID) {
        boolean result = false;
        try {
            OTLitige = this.getOdataManager().getEm().find(TLitige.class, lg_LITIGE_ID);
            // OTLitige.setStrSTATUT(commonparameter.statut_delete);
            // OTLitige.setDtUPDATED(new Date());
            this.persiste(OTLitige);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du litige");
        }
        return result;
    }
    // fin fonction pour supprimer un litige

    // Liste des litiges par type de litige
    public List<TLitige> listTLitigeByTypeLitige(String search_value, String lg_TYPELITIGE_ID) {

        List<TLitige> lstTLitige = new ArrayList<TLitige>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTLitigeByTypeLitige lg_TYPELITIGE_ID :" + lg_TYPELITIGE_ID);
            lstTLitige = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TLitige t WHERE t.lgTYPELITIGEID.lgTYPELITIGEID LIKE ?1 AND (t.strNAME LIKE ?5 OR t.strREF LIKE ?6 OR t.strREFCREATED LIKE ?6) AND (t.strSTATUT = ?2 OR t.strSTATUT = ?7) ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_TYPELITIGE_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(7, commonparameter.statut_is_Closed).setParameter(5, "%" + search_value + "%")
                    .setParameter(6, search_value + "%").getResultList();

            for (TLitige OTLitige : lstTLitige) {
                this.refresh(OTLitige);
                // new logger().OCategory.info("Reference " + OTLitige.getStrREF());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTLitige.size());
        return lstTLitige;
    }
    // fin Liste des litiges par type de litige

    // Liste des litiges par type de litige qui n'ont pas about
    public List<TLitige> listTLitigeByTypeLitigeNonAbouti(String search_value, String lg_TYPELITIGE_ID) {

        List<TLitige> lstTLitige = new ArrayList<TLitige>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTLitigeByTypeLitige lg_TYPELITIGE_ID :" + lg_TYPELITIGE_ID);
            lstTLitige = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TLitige t WHERE t.lgTYPELITIGEID.lgTYPELITIGEID LIKE ?1 AND (t.strNAME LIKE ?5 OR t.strREF LIKE ?6 OR t.strREFCREATED LIKE ?6) AND t.strSTATUT = ?7 AND (t.intECART < 0) ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_TYPELITIGE_ID).setParameter(7, commonparameter.statut_is_Closed)
                    .setParameter(5, "%" + search_value + "%").setParameter(6, search_value + "%").getResultList();

            for (TLitige OTLitige : lstTLitige) {
                this.refresh(OTLitige);
                // new logger().OCategory.info("Reference " + OTLitige.getStrREF());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTLitige.size());
        return lstTLitige;
    }
    // fin Liste des litiges par type de litige qui n'ont pas about

    // Liste des clients a litige
    public List<TCompteClient> listTCompteClientForLitigeEncours(String search_value) {

        List<TCompteClient> lstTCompteClient = new ArrayList<TCompteClient>();
        List<TLitige> lstTLitige = new ArrayList<TLitige>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTLitige = this.getOdataManager().getEm().createQuery("SELECT t FROM TLitige t WHERE t.strSTATUT = ?1")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info("lstTLitige " + lstTLitige.size());
            for (TLitige OTLitige : lstTLitige) {
                // new logger().OCategory.info("Reference " + OTLitige.getStrREF());
                try {
                    // TSnapshotPreenregistrementCompteClientTiersPayent
                    // OTSnapshotPreenregistrementCompteClientTiersPayent =
                    // this.getOdataManager().getEm().find(TSnapshotPreenregistrementCompteClientTiersPayent.class,
                    // OTLitige.getStrREF());
                    // lstTCompteClient.add(OTSnapshotPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste compte client " + lstTCompteClient.size());
        return lstTCompteClient;
    }
    // fin Liste des clients a litige

    // liste des types litiges
    public List<TTypelitige> listTTypelitige(String search_value, String lg_TYPELITIGE_ID) {

        List<TTypelitige> lstTTypelitige = new ArrayList<TTypelitige>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listTTypelitige lg_TYPELITIGE_ID :" + lg_TYPELITIGE_ID);
            lstTTypelitige = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypelitige t WHERE t.lgTYPELITIGEID LIKE ?1 AND (t.strNAME LIKE ?5 OR t.strDESCRIPTION LIKE ?6) AND t.strSTATUT = ?7 ORDER BY t.strDESCRIPTION DESC")
                    .setParameter(1, lg_TYPELITIGE_ID).setParameter(5, "%" + search_value + "%")
                    .setParameter(6, "%" + search_value + "%").setParameter(7, commonparameter.statut_enable)
                    .getResultList();

            for (TTypelitige OTTypelitige : lstTTypelitige) {
                this.refresh(OTTypelitige);
                new logger().OCategory.info("Description " + OTTypelitige.getStrDESCRIPTION());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTTypelitige.size());
        return lstTTypelitige;
    }
    // fin liste des types litiges

    // fonction pour supprimer un snap shop preenregistrement compte client tiers payants
    public boolean removeSnapShotPreenregistrementComptecltTiersP(
            String lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID) {
        boolean result = false;
        try {
            TSnapshotPreenregistrementCompteClientTiersPayent O = this.getSnapShotPreenregistrementComptecltTiersP(
                    lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID);
            new logger().OCategory
                    .info("Tiers payants " + O.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME());
            O.setStrSTATUT(commonparameter.statut_delete);
            O.setDtCREATED(new Date());
            this.persiste(O);
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du dossier du client");
        }
        new logger().OCategory.info("result dans removeSnapShotPreenregistrementComptecltTiersP " + result);
        return result;
    }

    public TSnapshotPreenregistrementCompteClientTiersPayent getSnapShotPreenregistrementComptecltTiersP(
            String lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID) {
        try {
            TSnapshotPreenregistrementCompteClientTiersPayent O = this.getOdataManager().getEm().find(
                    TSnapshotPreenregistrementCompteClientTiersPayent.class,
                    lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID);
            new logger().OCategory
                    .info("Tiers payants " + O.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME());
            return O;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Dossier du client inexistant");
            return null;
        }
    }
    // fin fonction pour supprimer un snap shop preenregistrement compte client tiers payants

    // cloturer un litige avec accord de remboursement
    public boolean closureLitigeWithRemboursement(String str_REF, int int_AMOUNT) {
        boolean result = false;
        try {
            TPreenregistrementCompteClientTiersPayent OOld = this.getOdataManager().getEm()
                    .find(TPreenregistrementCompteClientTiersPayent.class, str_REF);
            if (this.closureLitige(str_REF, int_AMOUNT)) {
                // TSnapshotPreenregistrementCompteClientTiersPayent ONew = new
                // tierspayantManagement(this.getOdataManager()).createSnapShopPreenregistrementCompteCltTp(OOld.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTTIERSPAYANTID(),
                // int_AMOUNT);
                OOld.setIntPRICE(int_AMOUNT);
                OOld.setIntPRICERESTE(int_AMOUNT);
                OOld.setStrSTATUTFACTURE(commonparameter.statut_unpaid);
                OOld.setDtUPDATED(new Date());
                if (this.persiste(OOld)) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }
                /*
                 * if (ONew != null) { ONew.setIntNUMBERTRANSACTION(OOld.getIntNUMBERTRANSACTION());
                 * ONew.setDtCREATED(new Date()); if (this.persiste(ONew)) { result = true;
                 * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); } }
                 */
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de cloturer le litige avec remboursement");
        }
        return result;
    }
    // fin cloturer un litige avec accord de remboursement

    // cloturer un litige sans remboursement
    public boolean closureLitigeWithoutRemboursement(String str_REF, int int_AMOUNT) {
        boolean result = false;
        try {
            TPreenregistrementCompteClientTiersPayent OOld = this.getOdataManager().getEm()
                    .find(TPreenregistrementCompteClientTiersPayent.class, str_REF);
            if (this.closureLitige(str_REF, int_AMOUNT)) {
                // TSnapshotPreenregistrementCompteClientTiersPayent ONew = new
                // tierspayantManagement(this.getOdataManager()).createSnapShopPreenregistrementCompteCltTp(OOld.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTTIERSPAYANTID(),
                // int_AMOUNT);
                OOld.setIntPRICE(0);
                OOld.setIntPRICERESTE(0);
                OOld.setStrSTATUTFACTURE(commonparameter.statut_is_Closed);
                OOld.setDtUPDATED(new Date());
                if (this.persiste(OOld)) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de cloturer le litige avec remboursement");
        }
        return result;
    }

    public boolean closureLitige(String str_REF, int int_AMOUNT) {
        boolean result = false;
        try {

            OTLitige = (TLitige) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TLitige t WHERE t.strREFCREATED = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, str_REF).setParameter(2, commonparameter.statut_enable).getSingleResult();
            /*
             * new logger().OCategory.info("Commentaire " + OTLitige.getStrDESCRIPTION());
             * OTLitige.setIntAMOUNT(int_AMOUNT); // OTLitige.setIntECART(OTLitige.getIntAMOUNT() -
             * OTLitige.getIntAMOUNTDUS()); //old ok OTLitige.setIntECART(OTLitige.getIntAMOUNTDUS() -
             * OTLitige.getIntAMOUNT()); OTLitige.setStrSTATUT(commonparameter.statut_is_Closed);
             * if(OTLitige.getIntECART() >= 0) { OTLitige.setStrSTATUTTRAITEMENT("Litige remboursé dans la totalié"); }
             * else { OTLitige.setStrSTATUTTRAITEMENT("Litige non-abouti"); } OTLitige.setDtUPDATED(new Date());
             */
            this.persiste(OTLitige);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de cloturer le litige");
        }
        return result;
    }

    // fin cloturer un litige sans remboursement
    // avant de cloture verifie si la facture concernant cette vente a ete annuler//
    public boolean checkIsAnInvoiceItem(String str_REF) {
        boolean isDeleted = false;
        TFactureDetail OFactureDetail = null;
        try {
            OFactureDetail = this.getOdataManager().getEm().find(TFactureDetail.class, str_REF);
            // if(OFactureDetail)
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isDeleted;
    }
}
