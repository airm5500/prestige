package bll.facture;

import bll.common.Parameter;
import bll.configManagement.GroupeTierspayantController;
import bll.entity.EntityData;
import bll.preenregistrement.Preenregistrement;
import bll.printer.DriverPrinter;
import bll.teller.TellerMovement;
import bll.teller.caisseManagement;
import dal.MvtTransaction;
import dal.TCashTransaction;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TDossierReglement;
import dal.TDossierReglementDetail;
import dal.TEventLog;
import dal.TFacture;
import dal.TFactureDetail;
import dal.TGroupeFactures;
import dal.TModeReglement;
import dal.TMotifReglement;
import dal.TMvtCaisse;
import dal.TParameters;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TReglement;
import dal.TReglementDossier;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.dataManager;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeTransaction;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.TemporalType;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.Maths;
import toolkits.utils.StringComplexUtils.DataStringManager;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author FCARDIOULA
 */
public class reglementManager extends bll.bllBase {

    public final date pkey = new date();

    public reglementManager(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public boolean createReglementDosssier(String str_ref_dossier, double dbl_montant, double dbl_montant_restant,
            double dbl_montant_paye, Date dt_date, short bl_isPartial, String str_type_reglement) {

        TReglementDossier OTReglementDossier = new TReglementDossier();

        OTReglementDossier.setLgREGLEMENTDOSSIERID(new date().getComplexId());
        OTReglementDossier.setStrREFRESSOURCE(str_ref_dossier);
        OTReglementDossier.setDblMONTANT(dbl_montant);
        OTReglementDossier.setDblMONTANTRESTANT(dbl_montant_restant);
        OTReglementDossier.setDblMONTANTPAYE(dbl_montant_paye);
        OTReglementDossier.setBISPARTIEL(bl_isPartial);
        OTReglementDossier.setDtDATEREGLEMENT(dt_date);

        TTypeReglement OTTypeReglement = (TTypeReglement) this.find(str_type_reglement, new TTypeReglement());

        if (OTTypeReglement == null) {
            return false;
        }

        if (dbl_montant_paye == dbl_montant_restant) {
            OTReglementDossier.setStrSTATUT(commonparameter.statut_paid);
        } else {
            OTReglementDossier.setStrSTATUT(commonparameter.statut_is_Waiting);
        }
        // OTReglementDossier.set
        OTReglementDossier.setDtCREATED(new Date());

        return true;
    }

    public TDossierReglement GetTDossierReglement(String lg_Reglement_id) {
        // chercher le dossier du reglement
        TDossierReglement OTDossierReglement = (TDossierReglement) this.find(lg_Reglement_id, new TDossierReglement());

        return OTDossierReglement;
    }

    public List<TDossierReglementDetail> getListTDossierReglementDetail(String lg_customer_id) {

        List<TDossierReglementDetail> ListTDossierReglementDetail = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TDossierReglementDetail t WHERE t.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID LIKE ?1 AND t.strSTATUT like ?2 ")
                .setParameter(1, lg_customer_id).setParameter(2, commonparameter.statut_is_Process).getResultList();

        return ListTDossierReglementDetail;
    }

    public TDossierReglement createDossierReglement(String Nature_dossier) {
        TDossierReglement OTDossierReglement = new TDossierReglement();

        OTDossierReglement.setLgDOSSIERREGLEMENTID(new date().getComplexId());
        OTDossierReglement.setDblAMOUNT(0.0);
        OTDossierReglement.setStrNATUREDOSSIER(Nature_dossier);
        OTDossierReglement.setDtCREATED(new Date());
        OTDossierReglement.setStrSTATUT(commonparameter.statut_is_Process);
        this.persiste(OTDossierReglement);
        return OTDossierReglement;

    }

    public boolean createDossierReglementDetail(TDossierReglement OTDossierReglement, String ref) {
        try {
            TDossierReglementDetail OTDossierReglementDetail = new TDossierReglementDetail();

            List<TDossierReglementDetail> lstTDossierReglementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TDossierReglementDetail t WHERE t.strSTATUT LIKE ?1 AND t.strREF like ?2 AND t.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID like ?3")
                    .setParameter(1, commonparameter.statut_is_Process).setParameter(2, ref)
                    .setParameter(3, OTDossierReglement.getLgDOSSIERREGLEMENTID()).getResultList();

            if (lstTDossierReglementDetail.size() > 0) {
                new logger().OCategory.info("impossible de creer ref existe  " + ref);
                return false;
            }

            OTDossierReglementDetail.setLgDOSSIERREGLEMENTDETAILID(new date().getComplexId());
            OTDossierReglementDetail.setLgDOSSIERREGLEMENTID(OTDossierReglement);
            OTDossierReglementDetail.setStrREF(ref);
            OTDossierReglementDetail.setStrSTATUT(commonparameter.statut_is_Process);
            OTDossierReglementDetail.setDtCREATED(new Date());
            this.persiste(OTDossierReglementDetail);

            return true;
        } catch (Exception e) {
            return false;
        }

    }

    public void deleteDetailDossierReglement(String str_ref, String lgDOSSIERREGLEMENTID) {
        try {
            TDossierReglementDetail OTDossierReglementDetail = (TDossierReglementDetail) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TDossierReglementDetail t WHERE t.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID LIKE ?1 AND t.strREF like ?2 AND t.strSTATUT like ?3")
                    .setParameter(1, lgDOSSIERREGLEMENTID).setParameter(2, str_ref)
                    .setParameter(3, commonparameter.statut_is_Process).getSingleResult();
            OTDossierReglementDetail.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTDossierReglementDetail);
            this.buildSuccesTraceMessage("success");
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de supprimer une facture ", e.getMessage());
        }

    }

    public TDossierReglement GetInfoDossierReglement(String Lg_reglement_Dossier) {
        try {
            TDossierReglement OTDossierReglement = (TDossierReglement) this.find(Lg_reglement_Dossier,
                    new TDossierReglement());
            return OTDossierReglement;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de trouver la facture ", e.getMessage());
            return null;
        }
    }

    public int GetAmountReglement(String Lg_reglement) {
        try {
            List<TCashTransaction> ListTCashTransaction = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCashTransaction t WHERE t.lgREGLEMENTID.lgREGLEMENTID LIKE ?1")
                    .setParameter(1, Lg_reglement).getResultList();
            int Amout = 0;
            for (int i = 0; i < ListTCashTransaction.size(); i++) {
                Amout = Amout + ListTCashTransaction.get(i).getIntAMOUNT();
            }
            return Amout;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de trouver la facture ", e.getMessage());
            return 0;
        }
    }

    public List<TFactureDetail> getDetailsFactureByTiersPayant(String str_CUSTOMER) {
        List<TFactureDetail> factureDetails = new ArrayList<>();
        try {
            // paid
            factureDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFactureDetail o WHERE o.lgFACTUREID.lgFACTUREID LIKE ?1 AND o.strSTATUT <>?2 AND o.strSTATUT <>?3 ORDER BY o.dtCREATED ASC")
                    .setParameter(1, str_CUSTOMER).setParameter(2, commonparameter.statut_paid)
                    .setParameter(3, commonparameter.statut_delete).getResultList();
            for (TFactureDetail OTFactureDetail : factureDetails) {
                this.refresh(OTFactureDetail);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return factureDetails;
    }

    public TPreenregistrementCompteClientTiersPayent getOPreenregistrementCompteClientTiersPayentByRef(String str_REF) {
        TPreenregistrementCompteClientTiersPayent opClientTiersPayent = null;
        try {

            opClientTiersPayent = this.getOdataManager().getEm().find(TPreenregistrementCompteClientTiersPayent.class,
                    str_REF);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return opClientTiersPayent;
    }

    /**
     * ** ADD BY KOBENA FUNCTION doReglement
     *
     ****
     * @param lg_FACTURE_ID
     * @param lg_NATURE_PAIEMENT
     * @param str_BANQUE
     * @param str_LIEU
     * @param str_CODE_MONNAIE
     * @param str_COMMENTAIRE
     * @param lg_MODE_REGLEMENT_ID
     * @param int_TAUX
     * @param int_AMOUNT
     * @param int_AMOUNT_REMIS
     * @param int_AMOUNT_RECU
     * @param listfacturedetail
     * @param str_FIRST_LAST_NAME
     * @param str_CUSTOMER
     * @param uncheckedlist
     * @param dt_reglement
     *
     * @return
     */
    public TDossierReglement doReglement(String lg_FACTURE_ID, String lg_NATURE_PAIEMENT, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, String lg_MODE_REGLEMENT_ID, int int_TAUX,
            double int_AMOUNT, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, JSONArray listfacturedetail,
            String str_FIRST_LAST_NAME, String str_CUSTOMER, JSONArray uncheckedlist, Date dt_reglement) {

        TReglement OTReglement = null;
        TDossierReglement dossierReglement = null;
        double total_amount = int_AMOUNT;
        double montantattendu = 0;
        List<TFactureDetail> lstTFactureDetail = new ArrayList<>();

        TCompteClient OTCompteClient = null;
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;

        double AmountReglement = 0;
        try {
            if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
                this.buildErrorTraceMessage("Impossible de faire le règlement", "La caisse est fermée");
                return null;
            } else {

                TFacture facture = this.getOdataManager().getEm().find(TFacture.class, lg_FACTURE_ID);
                montantattendu = facture.getDblMONTANTRESTANT();
                OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1")
                        .setParameter(1, facture.getStrCUSTOMER()).getSingleResult();

                // str_FIRST_LAST_NAME non du propriétaire de la carte bancaire ou du cheques
                dossierReglement = this.createDossierReglements(facture, int_AMOUNT, "bordereau", dt_reglement,
                        montantattendu);
                OTReglement = new Preenregistrement(this.getOdataManager(), this.getOTUser()).CreateTReglement(
                        OTCompteClient.getLgCOMPTECLIENTID(), dossierReglement.getLgDOSSIERREGLEMENTID(), str_BANQUE,
                        str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE,
                        this.getOdataManager().getEm().find(TModeReglement.class, lg_MODE_REGLEMENT_ID), int_TAUX,
                        int_AMOUNT, str_FIRST_LAST_NAME, dt_reglement, true);

                // double dbl_amount = (double) int_AMOUNT;
                TTypeMvtCaisse OTTypeMvtCaisse = this.getOdataManager().getEm().find(TTypeMvtCaisse.class,
                        facture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());

                OTReglement.setBISFACTURE(true);
                this.persiste(OTReglement);

                TDossierReglementDetail ODossierReglementDetail = null;
                TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
                if (lg_NATURE_PAIEMENT.equals("2")) {
                    new logger().OCategory.info("paiement total -----------------------------------------------");
                    lstTFactureDetail = this.getDetailsFactureByTiersPayant(facture.getLgFACTUREID());

                    for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                        OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                        double detailAmount = tFactureDetail.getDblMONTANTRESTANT();
                        System.out.println(
                                "OTPreenregistrementCompteClientTiersPayent @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ "
                                        + OTPreenregistrementCompteClientTiersPayent
                                                .getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
                        OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                .getLgCOMPTECLIENTTIERSPAYANTID(); // code ajotué 18/08/2016

                        if (int_AMOUNT >= detailAmount) {
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT >= detailAmount-------------- amount "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);
                            tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                            tFactureDetail.setDblMONTANTRESTANT(0d);
                            tFactureDetail.setDtUPDATED(new Date());
                            tFactureDetail.setStrSTATUT(commonparameter.PAID);
                            OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);

                            // code ajotué 18/08/2016
                            if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {

                                OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                            }
                            if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                this.getOdataManager().getEm().merge(OTCompteClient);
                            }
                            // fin code ajotué 18/08/2016

                            AmountReglement = detailAmount;
                            int_AMOUNT -= detailAmount;
                            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
                            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                            this.persiste(tFactureDetail);
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT >= detailAmount------------------------------------------ amount decrementer "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);
                            this.persiste(OTPreenregistrementCompteClientTiersPayent);
                            ODossierReglementDetail = this.createDossierReglementDetail(tFactureDetail,
                                    dossierReglement, AmountReglement);
                        } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT <  detailAmount && int_AMOUNT >0------------------------------------------ amount "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);
                            tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT);
                            tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT);
                            Double reste = detailAmount - int_AMOUNT;

                            new logger().oCategory
                                    .info("reste      --------------------------- " + reste + "  restetoString ");
                            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                            new logger().oCategory.info(
                                    " 1  Valeur de OTPreenregistrementCompteClientTiersPayent APRES MODIFICATION     --------------------------- "
                                            + OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE() + "   ");
                            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                            // code ajotué 18/08/2016
                            if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) int_AMOUNT);
                                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                            }
                            if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT);
                                this.getOdataManager().getEm().merge(OTCompteClient);
                            }
                            // fin code ajotué 18/08/2016

                            tFactureDetail.setDtUPDATED(new Date());
                            this.persiste(tFactureDetail);
                            AmountReglement = int_AMOUNT;
                            int_AMOUNT -= int_AMOUNT;
                            this.persiste(OTPreenregistrementCompteClientTiersPayent);
                            ODossierReglementDetail = this.createDossierReglementDetail(tFactureDetail,
                                    dossierReglement, AmountReglement);
                        }

                        new logger().OCategory.info(
                                "paiement total   Traitement de chaque dossiers de la facture-----------------------------------------------");

                    }

                } else {
                    if (uncheckedlist.length() == 0) {
                        new logger().OCategory.info(
                                "paiement partiel sans tout selection  -----------------------------------------------");
                        for (int i = 0; i < listfacturedetail.length(); i++) {

                            TFactureDetail tFactureDetail = this.getOdataManager().getEm().find(TFactureDetail.class,
                                    listfacturedetail.get(i));
                            OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                    .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                            OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                    .getLgCOMPTECLIENTTIERSPAYANTID();
                            double detailAmount = tFactureDetail.getDblMONTANTRESTANT();
                            if (int_AMOUNT >= detailAmount) {
                                new logger().OCategory.info(
                                        "paiement partiel sans tout selection----int_AMOUNT >= detailAmount-------------- amount "
                                                + int_AMOUNT + " montant restant details facture " + detailAmount);
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                                tFactureDetail.setDblMONTANTRESTANT(0d);
                                tFactureDetail.setDtUPDATED(new Date());
                                tFactureDetail.setStrSTATUT(commonparameter.PAID);
                                new logger().OCategory.info(
                                        "paiement partiel montant de la facture int_AMOUNT>=tFactureDetail.getDblMONTANT() -------------------------------"
                                                + int_AMOUNT + " >" + tFactureDetail.getDblMONTANT());
                                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                this.persiste(OTPreenregistrementCompteClientTiersPayent);
                                AmountReglement = detailAmount;
                                int_AMOUNT -= detailAmount;
                                this.persiste(tFactureDetail);
                                ODossierReglementDetail = this.createDossierReglementDetail(tFactureDetail,
                                        dossierReglement, AmountReglement);
                            } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                                new logger().OCategory.info(
                                        "paiement partiel montant de la facture int_AMOUNT< tFactureDetail.getDblMONTANT() -------------------------------"
                                                + int_AMOUNT + " <" + tFactureDetail.getDblMONTANT());
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT);
                                tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT);
                                Double reste = detailAmount - int_AMOUNT;

                                new logger().oCategory.info("reste      --------------------------- " + reste
                                        + "  restetoString | detailAmount:" + detailAmount);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                                // new logger().oCategory.info(" 2 Valeur de OTPreenregistrementCompteClientTiersPayent
                                // APRES MODIFICATION --------------------------- " +
                                // OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE() + " ");

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                tFactureDetail.setDtUPDATED(new Date());
                                AmountReglement = int_AMOUNT;
                                int_AMOUNT -= int_AMOUNT;
                                this.persiste(tFactureDetail);
                                this.persiste(OTPreenregistrementCompteClientTiersPayent);
                                ODossierReglementDetail = this.createDossierReglementDetail(tFactureDetail,
                                        dossierReglement, AmountReglement);
                            }

                        }
                    } else {
                        /**
                         * LE CAS USER SELECTION ALL ET DECOCHE DAUTRES*
                         */
                        new logger().OCategory.info(
                                "paiement partiel LE CAS USER SELECTION ALL ET DECOCHE DAUTRES -------------------------------");
                        lstTFactureDetail = this.getDetailsFactureByTiersPayant(facture.getLgFACTUREID());

                        for (int i = 0; i < uncheckedlist.length(); i++) {

                            for (int j = 0; j < lstTFactureDetail.size(); j++) {
                                if (lstTFactureDetail.get(j).getLgFACTUREDETAILID()
                                        .equals(uncheckedlist.getString(i))) {
                                    lstTFactureDetail.remove(j);
                                }

                            }

                        }
                        for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                            OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                    .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                            OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                    .getLgCOMPTECLIENTTIERSPAYANTID(); // code ajotué 18/08/2016
                            double detailAmount = tFactureDetail.getDblMONTANTRESTANT();

                            if (int_AMOUNT >= detailAmount) {
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                                tFactureDetail.setDblMONTANTRESTANT(0d);
                                tFactureDetail.setDtUPDATED(new Date());
                                tFactureDetail.setStrSTATUT(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                AmountReglement = detailAmount;
                                int_AMOUNT -= detailAmount;
                                this.persiste(tFactureDetail);
                                this.persiste(OTPreenregistrementCompteClientTiersPayent);
                                ODossierReglementDetail = this.createDossierReglementDetail(tFactureDetail,
                                        dossierReglement, AmountReglement);
                            } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                                new logger().OCategory.info(
                                        "paiement partiel LE CAS USER SELECTION ALL ET DECOCHE DAUTRES int_AMOUNT < tFactureDetail.getDblMONTANT()  -------------------------- "
                                                + int_AMOUNT);
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT);
                                tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT);
                                Double reste = detailAmount - int_AMOUNT;

                                new logger().oCategory
                                        .info("reste      --------------------------- " + reste + "  restetoString ");
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                new logger().oCategory.info(
                                        " 2 Valeur de OTPreenregistrementCompteClientTiersPayent APRES MODIFICATION     --------------------------- "
                                                + OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE()
                                                + "   ");
                                tFactureDetail.setDtUPDATED(new Date());
                                AmountReglement = int_AMOUNT;
                                int_AMOUNT -= int_AMOUNT;
                                this.persiste(tFactureDetail);
                                this.persiste(OTPreenregistrementCompteClientTiersPayent);
                                ODossierReglementDetail = this.createDossierReglementDetail(tFactureDetail,
                                        dossierReglement, AmountReglement);
                            }

                        }

                    }

                }

                double restamount = total_amount - facture.getDblMONTANTRESTANT();
                facture.setDblMONTANTPAYE(facture.getDblMONTANTPAYE() + total_amount);

                if (restamount == 0) {
                    facture.setDblMONTANTRESTANT(restamount);
                    facture.setStrSTATUT(commonparameter.PAID);
                } else if (restamount < 0) {
                    facture.setDblMONTANTRESTANT((-1) * restamount);
                    facture.setStrSTATUT(commonparameter.statut_is_Process);
                }

                facture.setDtUPDATED(new Date());

                if (this.persiste(facture)) {

                    if (new TellerMovement(this.getOdataManager(), this.getOTUser()).AddTMvtCaisse(OTTypeMvtCaisse,
                            OTTypeMvtCaisse.getStrCODECOMPTABLE(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                            OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID(), dossierReglement.getDblAMOUNT(),
                            str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX,
                            dossierReglement.getDtCREATED(), true, str_FIRST_LAST_NAME, this.getOTUser().getLgUSERID(),
                            OTTypeMvtCaisse.getStrDESCRIPTION(), (int) int_AMOUNT_REMIS, (int) int_AMOUNT_RECU, true,
                            new Date()) != null) {
                        // TRecettes OTRecettes = new caisseManagement(this.getOdataManager(),
                        // this.getOTUser()).AddRecette(int_AMOUNT, Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON,
                        // OTTypeMvtCaisse.getStrDESCRIPTION(), facture.getStrCODEFACTURE(), int_AMOUNT_REMIS,
                        // int_AMOUNT_RECU, dossierReglement.getLgDOSSIERREGLEMENTID(),
                        // OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID(), commonparameter.OTHER,
                        // Parameter.KEY_TASK_ENTREE_CAISSE, OTReglement.getLgREGLEMENTID(),
                        // lg_COMPTECLIENT_TIERSPAYANT_ID, "2", OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        // commonparameter.TRANSACTION_CREDIT);

                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                        // updateOrganismeAccount(OTCompteClient, dossierReglement.getDblAMOUNT().intValue());
                    } else {
                        this.buildErrorTraceMessage(
                                "La prise en compte du règlement à la caisse n'a pas été effectuée");
                    }

                } else {
                    this.buildErrorTraceMessage("Echec de reglement ");
                }
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de reglement ");
            e.printStackTrace();
        }
        return dossierReglement;
    }

    /**
     * ** END ADD doReglement
     *
     **
     * @param facture
     * @param amount
     * @param nature_dossier
     *
     * @return
     */
    public TDossierReglement createDossierReglements(TFacture facture, double amount, String nature_dossier,
            Date dt_reglement, double montantattendu) {
        TDossierReglement OTDossierReglement = null;
        try {

            OTDossierReglement = new TDossierReglement();

            OTDossierReglement.setLgDOSSIERREGLEMENTID(new date().getComplexId());
            OTDossierReglement.setDblAMOUNT(amount);
            OTDossierReglement.setLgFACTUREID(facture);
            OTDossierReglement.setLgUSERID(this.getOTUser());
            OTDossierReglement.setStrNATUREDOSSIER(nature_dossier);
            OTDossierReglement.setStrORGANISMEID(facture.getStrCUSTOMER());
            OTDossierReglement.setDtREGLEMENT(dt_reglement);
            OTDossierReglement.setDtCREATED(new Date());
            OTDossierReglement.setDblMONTANTATTENDU(montantattendu);
            OTDossierReglement.setStrSTATUT(commonparameter.statut_is_Closed);
            this.persiste(OTDossierReglement);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTDossierReglement;

    }

    public TDossierReglementDetail createDossierReglementDetail(TFactureDetail factureDetail,
            TDossierReglement dossierReglement, double montant) {
        TDossierReglementDetail dossierReglementDetail = null;
        try {

            dossierReglementDetail = new TDossierReglementDetail(pkey.getComplexId());
            dossierReglementDetail.setDblAMOUNT(montant);
            dossierReglementDetail.setLgFACTUREDETAILID(factureDetail);
            dossierReglementDetail.setLgDOSSIERREGLEMENTID(dossierReglement);
            dossierReglementDetail.setDtCREATED(dossierReglement.getDtCREATED());
            dossierReglementDetail.setStrREF(factureDetail.getStrREF());
            dossierReglementDetail.setStrSTATUT(commonparameter.statut_is_Closed);

            this.persiste(dossierReglementDetail);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return dossierReglementDetail;
    }

    public List<TReglement> findAllReglements(String lg_REGLEMENT_ID, String search_value, String lg_CLIENT_ID,
            Date dt_debut, Date dt_fin) {
        List<TReglement> allReglements = new ArrayList<>();
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }

            allReglements = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TReglement t WHERE t.lgREGLEMENTID LIKE ?1  AND t.strSTATUT LIKE ?2 AND t.bISFACTURE = ?3  AND (t.dtCREATED >= ?4 AND t.dtCREATED <= ?5) AND t.strREFRESSOURCE LIKE ?6 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_REGLEMENT_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .setParameter(3, true).setParameter(4, dt_debut).setParameter(5, dt_fin)
                    .setParameter(6, lg_CLIENT_ID).getResultList();
            for (TReglement OTReglement : allReglements) {
                this.refresh(OTReglement);
            }
        } catch (Exception e) {
            e.printStackTrace();

        }
        return allReglements;
    }

    /**
     * ** add by KOBENA fonction de recupération de tous les reglement de facture
     *
     * @param lg_TIERS_PAYANT
     * @param seach_value
     * @param start
     * @param end
     *
     * @return
     */
    public List<EntityData> getAllDossierReglements(String lg_TIERS_PAYANT, String seach_value, String start,
            String end) {
        List<TDossierReglement> dossierReglements = new ArrayList<>();
        List<EntityData> entityDatas = new ArrayList<>();
        try {

            dossierReglements = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT o FROM TDossierReglement o,TTiersPayant p,TDossierReglementDetail d,TFactureDetail f WHERE  o.strORGANISMEID=p.lgTIERSPAYANTID AND o.lgDOSSIERREGLEMENTID=d.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID AND d.lgFACTUREDETAILID.lgFACTUREDETAILID=f.lgFACTUREDETAILID AND   o.strORGANISMEID LIKE ?1 AND  o.dtCREATED >= ?2 AND  o.dtCREATED <=?3 AND(o.lgFACTUREID.strCODEFACTURE LIKE ?4 OR p.strNAME LIKE ?4 OR p.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT LIKE ?4 OR f.strFIRSTNAMECUSTOMER LIKE ?4 OR f.strLASTNAMECUSTOMER LIKE  ?4  OR f.strNUMEROSECURITESOCIAL LIKE ?4) ORDER BY o.dtCREATED DESC ")
                    .setParameter(1, lg_TIERS_PAYANT).setParameter(2, date.formatterMysqlShort.parse(start))
                    .setParameter(3, date.formatterMysql.parse(end)).setParameter(4, seach_value + "%").getResultList();

            for (TDossierReglement ODossierReglement : dossierReglements) {

                TTiersPayant OPayant = this.getOdataManager().getEm().find(TTiersPayant.class,
                        ODossierReglement.getStrORGANISMEID());
                TReglement oReglement = getReglementByRef(ODossierReglement.getLgDOSSIERREGLEMENTID());

                EntityData OEntityData = new EntityData();
                OEntityData.setStr_value1(ODossierReglement.getLgDOSSIERREGLEMENTID());
                OEntityData.setStr_value2(ODossierReglement.getDblAMOUNT() + "");
                OEntityData.setStr_value3(oReglement.getLgMODEREGLEMENTID().getStrNAME());
                OEntityData.setStr_value4(OPayant.getStrFULLNAME());
                OEntityData.setStr_value5(
                        oReglement.getLgUSERID().getStrFIRSTNAME() + " " + oReglement.getLgUSERID().getStrLASTNAME());
                OEntityData.setStr_value6(date.backabaseUiFormat2.format(oReglement.getDtREGLEMENT()));
                OEntityData.setStr_value7(date.NomadicUiFormatTime.format(oReglement.getDtREGLEMENT()));
                OEntityData.setStr_value8(OPayant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
                OEntityData.setStr_value9(ODossierReglement.getLgFACTUREID().getStrCODEFACTURE());
                OEntityData.setStr_value10(ODossierReglement.getDblMONTANTATTENDU() + "");

                entityDatas.add(OEntityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return entityDatas;
    }

    public TReglement getReglementByRef(String str_Ref) {
        return (TReglement) this.getOdataManager().getEm()
                .createQuery("SELECT o FROM TReglement o WHERE o.strREFRESSOURCE =?1").setParameter(1, str_Ref)
                .getSingleResult();
    }

    public List<EntityData> getAllDossierReglementDetails(String lg_DOSSIER_REGLEMENT_ID, String search_value) {
        List<TDossierReglementDetail> dossierReglementDetails = new ArrayList<>();
        List<EntityData> listEntityData = new ArrayList<>();
        try {
            dossierReglementDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TDossierReglementDetail o WHERE o.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID LIKE ?1 AND (o.strREF LIKE ?2 OR o.lgFACTUREDETAILID.lgFACTUREID.strCODEFACTURE LIKE ?3 ) ORDER BY o.dtCREATED DESC")
                    .setParameter(1, lg_DOSSIER_REGLEMENT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, search_value + "%").getResultList();
            for (TDossierReglementDetail ODetail : dossierReglementDetails) {
                TFactureDetail OFactureDetail = ODetail.getLgFACTUREDETAILID();
                TPreenregistrementCompteClientTiersPayent clientTiersPayent = this.getOdataManager().getEm()
                        .find(TPreenregistrementCompteClientTiersPayent.class, OFactureDetail.getStrREF());
                EntityData entityData = new EntityData();
                entityData.setStr_value1(ODetail.getLgDOSSIERREGLEMENTDETAILID());
                entityData.setStr_value2(clientTiersPayent.getStrREFBON());
                entityData.setStr_value6(
                        date.backabaseUiFormat2.format(clientTiersPayent.getLgPREENREGISTREMENTID().getDtUPDATED()));
                entityData.setStr_value3(ODetail.getDblAMOUNT() + "");
                entityData.setStr_value5(clientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID()
                        .getLgCLIENTID().getStrNUMEROSECURITESOCIAL());
                entityData.setStr_value4(clientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID()
                        .getLgCLIENTID().getStrFIRSTNAME() + " "
                        + clientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                                .getStrLASTNAME());
                entityData.setStr_value7(
                        date.NomadicUiFormatTime.format(clientTiersPayent.getLgPREENREGISTREMENTID().getDtUPDATED()));

                listEntityData.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return listEntityData;
    }

    // impression ticket de caisse
    public void lunchPrinterForTicketCaisse(String lg_DOSSIER_REGLEMENT_ID, String fileBarecode) {
        DriverPrinter ODriverPrinter = new DriverPrinter(this.getOdataManager(), this.getOTUser());
        // PrinterManager OPrinterManager = new PrinterManager(this.getOdataManager(), this.getOTUser());
        List<TDossierReglementDetail> lstTDossierReglementDetail = new ArrayList<>();
        String lg_IMPRIMANTE_ID = "%%", title = "";
        TParameters KEY_TICKET_COUNT = this.getOdataManager().getEm().getReference(TParameters.class,
                "KEY_TICKET_COUNT");
        int int_NUMBER_EXEMPLAIRE = 1;
        if (KEY_TICKET_COUNT != null) {
            int_NUMBER_EXEMPLAIRE = Integer.valueOf(KEY_TICKET_COUNT.getStrVALUE().trim());
        }

        try {
            new logger().OCategory.info("fileBarecode " + fileBarecode);

            // TUserImprimante OTUserImprimante = OPrinterManager.getTUserImprimante(this.getOTUser().getLgUSERID(),
            // lg_IMPRIMANTE_ID, commonparameter.str_ACTION_VENTE);
            // if (OTUserImprimante != null) {
            lstTDossierReglementDetail = this.getListeDossierReglementDetail(lg_DOSSIER_REGLEMENT_ID);
            ODriverPrinter.setType_ticket(commonparameter.str_TICKET_REGLEMENT);
            ODriverPrinter.setDatas(this.generateData(lstTDossierReglementDetail));
            ODriverPrinter.setDatasSubTotal(this.generateDataSummary(lg_DOSSIER_REGLEMENT_ID));
            ODriverPrinter.setDatasInfoTiersPayant(new ArrayList<>());
            if (lstTDossierReglementDetail.size() > 0) {
                TTiersPayant OTTiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class,
                        lstTDossierReglementDetail.get(0).getLgDOSSIERREGLEMENTID().getStrORGANISMEID());
                if (OTTiersPayant != null) {
                    title = "Règlement de la facture N°" + lstTDossierReglementDetail.get(0).getLgDOSSIERREGLEMENTID()
                            .getLgFACTUREID().getStrCODEFACTURE();
                    ODriverPrinter.setDatasInfoTiersPayant(this.generateDataTiersPayant(OTTiersPayant.getStrFULLNAME(),
                            OTTiersPayant.getStrCODECOMPTABLE(),
                            date.DateToString(
                                    lstTDossierReglementDetail.get(0).getLgDOSSIERREGLEMENTID().getDtREGLEMENT(),
                                    date.formatterOrange)));
                    if (int_NUMBER_EXEMPLAIRE < OTTiersPayant.getIntNBREEXEMPLAIREBORD()) {
                        int_NUMBER_EXEMPLAIRE = OTTiersPayant.getIntNBREEXEMPLAIREBORD();
                    }
                }
            }
            ODriverPrinter.setTitle(title);
            ODriverPrinter.setDatasInfoSeller(this.generateDataSeller());
            ODriverPrinter.setDataCommentaires(new ArrayList<>());
            ODriverPrinter.setCodeShow(true);
            ODriverPrinter.setName_code_bare(fileBarecode);
            for (int i = 0; i < int_NUMBER_EXEMPLAIRE; i++) {
                ODriverPrinter.PrintTicketVente(1);
            }
            this.setMessage(ODriverPrinter.getMessage());
            this.setDetailmessage(ODriverPrinter.getDetailmessage());

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'impression du ticket");
        }
    }
    // fin impression ticket de caisse

    // liste des reglements detail
    public List<TDossierReglementDetail> getListeDossierReglementDetail(String lg_DOSSIER_REGLEMENT_ID) {
        List<TDossierReglementDetail> lstTDossierReglementDetail = new ArrayList<>();

        try {
            lstTDossierReglementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TDossierReglementDetail t WHERE t.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID LIKE ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_DOSSIER_REGLEMENT_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTDossierReglementDetail;
    }
    // fin liste des reglements detail

    // generation du detail du reglement
    public List<String> generateData(List<TDossierReglementDetail> lstTDossierReglementDetail) {
        List<String> datas = new ArrayList<String>();

        double int_AMOUNT = 0, int_AMOUNT_RESTE = 0;
        try {

            if (lstTDossierReglementDetail.size() > 0) {
                int_AMOUNT = lstTDossierReglementDetail.get(0).getLgDOSSIERREGLEMENTID().getDblAMOUNT();
                int_AMOUNT_RESTE = lstTDossierReglementDetail.get(0).getLgDOSSIERREGLEMENTID().getDblMONTANTATTENDU()
                        - int_AMOUNT;
                datas.add("NBRE DOSSIER(S);VERSE;RESTANT");
                datas.add(lstTDossierReglementDetail.size() + ";" + conversion.AmountFormat((int) int_AMOUNT, ' ')
                        + "F CFA;" + conversion.AmountFormat((int) int_AMOUNT_RESTE, ' ') + "F CFA");
                datas.add(" ; ; ");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<String> generateDataTiersPayant(String str_FULLNAME, String str_ORGANIME, String str_DATE_REGLEMENT) {
        List<String> datas = new ArrayList<>();

        datas.add("Organisme:: " + str_FULLNAME);
        datas.add("Code Comptable:: " + str_ORGANIME);
        datas.add("Date règlement:: " + str_DATE_REGLEMENT);

        return datas;
    }

    // fin generation du detail du reglement
    public List<String> generateDataSeller() {
        List<String> datas = new ArrayList<>();
        datas.add("Opérateur:: " + DataStringManager.subStringData(this.getOTUser().getStrFIRSTNAME(), 0, 1) + "."
                + this.getOTUser().getStrLASTNAME());
        return datas;
    }

    public List<String> generateDataSummary(String lg_DOSSIER_REGLEMENT_ID) {
        List<String> datas = new ArrayList<String>();

        TCashTransaction OTCashTransaction = this.getTCashTransactionByReglement(lg_DOSSIER_REGLEMENT_ID);
        TDossierReglement OTDossierReglement = this.getOdataManager().getEm().find(TDossierReglement.class,
                lg_DOSSIER_REGLEMENT_ID);

        if (OTCashTransaction != null && OTDossierReglement != null) {
            datas.add("Net à payer: ;     "
                    + conversion.AmountFormat(
                            Maths.arrondiModuloOfNumber(OTDossierReglement.getDblMONTANTATTENDU().intValue(), 5))
                    + "; F CFA;1");
            datas.add("Règlement: ;     " + OTCashTransaction.getLgTYPEREGLEMENTID() + "; ;0");
            datas.add("Montant Versé: ;     "
                    + conversion.AmountFormat(Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTRECU(), 5))
                    + "; F CFA;0");
            datas.add("Monnaie: ;     "
                    + conversion.AmountFormat(Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTREMIS(), 5))
                    + "; F CFA;0");
        }

        return datas;
    }

    public static TCashTransaction getTCashTransactionByReglement(String lg_DOSSIER_REGLEMENT_ID) {

        try {
            /*
             * JdbConnexion Ojconnexion = new JdbConnexion(); Ojconnexion.initConnexion(); Ojconnexion.openConnexion();
             * String qry =
             * "SELECT c.int_AMOUNT_REMIS AS Monnaie, c.int_AMOUNT_RECU AS Verse, SUM(ABS(c.int_AMOUNT))AS Total, c.int_AMOUNT_CREDIT, c.int_AMOUNT_DEBIT, tr.str_NAME AS Reglement from t_dossier_reglement t, t_mvt_caisse m, t_cash_transaction c, t_type_reglement tr where t.lg_DOSSIER_REGLEMENT_ID = m.str_NUM_PIECE_COMPTABLE and c.str_RESSOURCE_REF = m.lg_MVT_CAISSE_ID AND tr.lg_TYPE_REGLEMENT_ID = c.lg_TYPE_REGLEMENT_ID AND t.lg_DOSSIER_REGLEMENT_ID = '"
             * + lg_DOSSIER_REGLEMENT_ID + "'";
             *
             * new logger().OCategory.info(qry); Ojconnexion.set_Request(qry); ResultSetMetaData rsmddatas =
             * Ojconnexion.get_resultat().getMetaData(); while (Ojconnexion.get_resultat().next()) { TCashTransaction
             * OTCashTransaction = new TCashTransaction();
             * OTCashTransaction.setIntAMOUNTREMIS(Ojconnexion.get_resultat().getInt("Monnaie"));
             * OTCashTransaction.setIntAMOUNTRECU(Ojconnexion.get_resultat().getInt("Verse"));
             * OTCashTransaction.setIntAMOUNT(Ojconnexion.get_resultat().getInt("Total"));
             * OTCashTransaction.setIntAMOUNTCREDIT(Ojconnexion.get_resultat().getInt("int_AMOUNT_CREDIT"));
             * OTCashTransaction.setIntAMOUNTDEBIT(Ojconnexion.get_resultat().getInt("int_AMOUNT_DEBIT"));
             * OTCashTransaction.setLgTYPEREGLEMENTID(Ojconnexion.get_resultat().getString("Reglement"));
             *
             * Ojconnexion.closeConnexion(); return OTCashTransaction; } Ojconnexion.closeConnexion();
             */
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        return null;
    }

    public List<EntityData> getReleverReglementData(String lg_TIERS_PAYANT_ID, Date start, Date end) {
        List<Object> maxamount = null;
        List<EntityData> entityDatas = new ArrayList<>();
        try {
            // , (SELECT MAX(t.dbl_MONTANT_ATTENDU ) FROM t_dossier_reglement t WHERE t.lg_FACTURE_ID=f.lg_FACTURE_ID)
            // AS MAXMONTANTATT
            maxamount = this.getOdataManager().getEm().createQuery(
                    "SELECT MAX(o.dblMONTANTATTENDU) ,f.dblMONTANTRESTANT  FROM  TDossierReglement o,TFacture f WHERE  o.strORGANISMEID=?1 AND o.dtCREATED BETWEEN ?2 AND ?3 AND o.lgFACTUREID.lgFACTUREID=f.lgFACTUREID GROUP BY f.lgFACTUREID")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, start, TemporalType.DATE)
                    .setParameter(3, end, TemporalType.TIMESTAMP).getResultList();

            for (Iterator it = maxamount.iterator(); it.hasNext();) {
                Object[] object = (Object[]) it.next();
                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityDatas.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return entityDatas;
    }

    public List<EntityData> getAllDifferes(String search_value, String dt_start, String dt_end) {
        String req = "SELECT p.`lg_PREENREGISTREMENT_COMPTE_CLIENT_ID`,r.`int_CUST_PART`,\n"
                + " p.`int_PRICE`,p.`int_PRICE_RESTE`,DATE_FORMAT(p.`dt_CREATED`,'%d/%m/%Y'),DATE_FORMAT(p.`dt_CREATED`,'%H:%i') ,\n"
                + "(CASE WHEN r.`str_REF_BON` IS NOT NULL THEN r.`str_REF_BON` ELSE ' ' END) \n"
                + ",(SELECT SUM(p.`int_PRICE_RESTE`) FROM t_preenregistrement_compte_client p \n"
                + ",t_preenregistrement r,t_compte_client c,t_client cl \n"
                + "WHERE r.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID`  \n"
                + "AND p.`lg_COMPTE_CLIENT_ID`=c.`lg_COMPTE_CLIENT_ID` \n"
                + "AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND cl.`lg_CLIENT_ID` = '" + search_value + "' \n"
                + "AND r.`b_IS_CANCEL`=0 AND r.`int_PRICE`>0 AND r.`str_STATUT`='is_Closed' AND DATE(p.`dt_CREATED`)>=DATE('"
                + dt_start + "') AND DATE(p.`dt_CREATED`)<=DATE('" + dt_end + "') )\n"
                + "FROM t_preenregistrement_compte_client p,t_compte_client c,t_client cl,t_preenregistrement r\n"
                + " WHERE c.`lg_COMPTE_CLIENT_ID`=p.`lg_COMPTE_CLIENT_ID` AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND r.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` AND r.`b_IS_CANCEL`=0 AND r.`int_PRICE`>0\n"
                + " AND DATE(p.`dt_CREATED`)>=DATE('" + dt_start + "') AND DATE(p.`dt_CREATED`)<=DATE('" + dt_end
                + "') AND cl.`lg_CLIENT_ID` = '" + search_value
                + "' AND p.`int_PRICE_RESTE`>0 AND r.`str_STATUT`='is_Closed';";

        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(req).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3(objects[2] + "");
                entityData.setStr_value4(objects[3] + "");
                entityData.setStr_value5(objects[4] + "");
                entityData.setStr_value6(objects[5] + "");
                entityData.setStr_value7(objects[6] + "");
                entityData.setStr_value8(objects[7] + "");
                datas.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return datas;
    }

    public List<EntityData> getAllDifferesClients(String search_value) {
        String req = "SELECT  cl.`lg_CLIENT_ID`,  CONCAT(cl.`str_FIRST_NAME`,' ',cl.`str_LAST_NAME`) AS CLIENTNAME ,(CASE WHEN cl.`str_NUMERO_SECURITE_SOCIAL` IS NOT NULL THEN cl.`str_NUMERO_SECURITE_SOCIAL` ELSE ' ' END) AS str_NUMERO_SECURITE_SOCIAL,(CASE WHEN cl.`str_ADRESSE` IS NOT NULL THEN cl.`str_ADRESSE` ELSE ' ' END) AS str_ADRESSE FROM t_preenregistrement_compte_client p,t_compte_client c,t_client cl,t_preenregistrement r\n"
                + "WHERE c.`lg_COMPTE_CLIENT_ID`=p.`lg_COMPTE_CLIENT_ID` AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND r.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` AND r.`b_IS_CANCEL`=0 AND r.`int_PRICE`>0\n"
                + " AND p.`int_PRICE_RESTE`>0 AND r.`str_STATUT`='is_Closed' AND (cl.`str_FIRST_NAME` LIKE ?1 OR cl.`str_LAST_NAME` LIKE ?1) GROUP BY cl.`lg_CLIENT_ID`";

        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(req)
                    .setParameter(1, search_value + "%").getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3(objects[2] + "");
                entityData.setStr_value4(objects[3] + "");

                datas.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return datas;
    }

    public TDossierReglement doReglementDifferred(String lg_CLIENT_ID, String lg_NATURE_PAIEMENT, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, String lg_MODE_REGLEMENT_ID, int int_TAUX,
            Integer int_AMOUNT, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, JSONArray listfacturedetail,
            String str_FIRST_LAST_NAME, JSONArray uncheckedlist, Date dt_reglement) {
        TReglement OTReglement;
        TDossierReglement dossierReglement = null;
        double total_amount = int_AMOUNT;
        double montantattendu = 0;
        String lg_COMPTECLIENT_TIERSPAYANT_ID = "";
        TCompteClient OTCompteClient;
        String lg_COMPTE_CLIENT;
        double AmountReglement;
        try {
            if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
                this.buildErrorTraceMessage("Impossible de faire le règlement", "La caisse est fermée");
                return null;
            } else {
                OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TCompteClient t WHERE t.lgCLIENTID.lgCLIENTID = ?1")
                        .setMaxResults(1).setParameter(1, lg_CLIENT_ID).getSingleResult();
                if (OTCompteClient == null) {
                    return null;
                }

                lg_COMPTECLIENT_TIERSPAYANT_ID = OTCompteClient.getLgCOMPTECLIENTID();
                lg_COMPTE_CLIENT = OTCompteClient.getLgCOMPTECLIENTID();

                // str_FIRST_LAST_NAME non du propriétaire de la carte bancaire ou du cheques
                List<TPreenregistrementCompteClient> listpreenregistrementCompteClient = getPreenregistrementCompteClients(
                        lg_COMPTE_CLIENT);
                for (TPreenregistrementCompteClient oClient : listpreenregistrementCompteClient) {
                    montantattendu += oClient.getIntPRICERESTE();
                }
                dossierReglement = this.createDossierReglements(lg_CLIENT_ID, int_AMOUNT, "DIFFERE", dt_reglement,
                        montantattendu);
                OTReglement = new Preenregistrement(this.getOdataManager(), this.getOTUser()).CreateTReglement(
                        lg_COMPTE_CLIENT, dossierReglement.getLgDOSSIERREGLEMENTID(), str_BANQUE, str_LIEU,
                        str_CODE_MONNAIE, str_COMMENTAIRE,
                        this.getOdataManager().getEm().find(TModeReglement.class, lg_MODE_REGLEMENT_ID), int_TAUX,
                        int_AMOUNT, str_FIRST_LAST_NAME, dt_reglement, true);

                // double dbl_amount = (double) int_AMOUNT;
                TTypeMvtCaisse OTTypeMvtCaisse = this.getOdataManager().getEm().find(TTypeMvtCaisse.class,
                        Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES);

                OTReglement.setBISFACTURE(false);
                this.persiste(OTReglement);

                TDossierReglementDetail ODossierReglementDetail = null;
                TPreenregistrementCompteClient preenregistrementCompteClient;

                if (lg_NATURE_PAIEMENT.equals("2")) {

                    for (TPreenregistrementCompteClient OPreenregistrementCompteClient : listpreenregistrementCompteClient) {
                        Integer detailAmount = OPreenregistrementCompteClient.getIntPRICERESTE();
                        if (int_AMOUNT >= detailAmount) {
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT >= detailAmount-------------- amount "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);
                            // OPreenregistrementCompteClient.setIntPRICE(OPreenregistrementCompteClient.getIntPRICE() +
                            // detailAmount);
                            OPreenregistrementCompteClient.setIntPRICERESTE(0);
                            OPreenregistrementCompteClient.setDtUPDATED(new Date());
                            AmountReglement = detailAmount;
                            int_AMOUNT -= detailAmount;
                            this.persiste(OPreenregistrementCompteClient);
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT >= detailAmount------------------------------------------ amount decrementer "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);

                            ODossierReglementDetail = createDossierReglementDetail(
                                    OPreenregistrementCompteClient.getLgPREENREGISTREMENTCOMPTECLIENTID(),
                                    dossierReglement, AmountReglement);
                        } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT <  detailAmount && int_AMOUNT >0------------------------------------------ amount "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);
                            // OPreenregistrementCompteClient.setIntPRICE(OPreenregistrementCompteClient.getIntPRICE() +
                            // int_AMOUNT);
                            OPreenregistrementCompteClient.setIntPRICERESTE(detailAmount - int_AMOUNT);
                            Integer reste = detailAmount - int_AMOUNT;
                            OPreenregistrementCompteClient.setDtUPDATED(new Date());
                            this.persiste(OPreenregistrementCompteClient);
                            AmountReglement = int_AMOUNT;
                            int_AMOUNT -= int_AMOUNT;

                            ODossierReglementDetail = createDossierReglementDetail(
                                    OPreenregistrementCompteClient.getLgPREENREGISTREMENTCOMPTECLIENTID(),
                                    dossierReglement, AmountReglement);
                        }

                        new logger().OCategory.info(
                                "paiement total   Traitement de chaque dossiers de la facture-----------------------------------------------");

                    }

                } else {
                    if (uncheckedlist.length() == 0) {
                        new logger().OCategory.info(
                                "paiement partiel sans tout selection  -----------------------------------------------");
                        for (int i = 0; i < listfacturedetail.length(); i++) {

                            preenregistrementCompteClient = this.getOdataManager().getEm()
                                    .find(TPreenregistrementCompteClient.class, listfacturedetail.get(i));

                            Integer detailAmount = preenregistrementCompteClient.getIntPRICERESTE();
                            if (int_AMOUNT >= detailAmount) {
                                new logger().OCategory.info(
                                        "paiement partiel sans tout selection----int_AMOUNT >= detailAmount-------------- amount "
                                                + int_AMOUNT + " montant restant details facture " + detailAmount);
                                // preenregistrementCompteClient.setIntPRICE(preenregistrementCompteClient.getIntPRICE()
                                // + detailAmount);
                                preenregistrementCompteClient.setIntPRICERESTE(0);
                                preenregistrementCompteClient.setDtUPDATED(new Date());

                                new logger().OCategory.info(
                                        "paiement partiel montant de la facture int_AMOUNT>=preenregistrementCompteClient.getDblMONTANT() -------------------------------"
                                                + int_AMOUNT + " >" + preenregistrementCompteClient.getIntPRICE());

                                this.persiste(preenregistrementCompteClient);
                                AmountReglement = detailAmount;
                                int_AMOUNT -= detailAmount;

                                ODossierReglementDetail = createDossierReglementDetail(
                                        preenregistrementCompteClient.getLgPREENREGISTREMENTCOMPTECLIENTID(),
                                        dossierReglement, AmountReglement);
                            } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                                new logger().OCategory.info(
                                        "paiement partiel montant de la facture int_AMOUNT< tFactureDetail.getDblMONTANT() -------------------------------"
                                                + int_AMOUNT + " <" + preenregistrementCompteClient.getIntPRICE());
                                // preenregistrementCompteClient.setIntPRICE(preenregistrementCompteClient.getIntPRICE()
                                // + int_AMOUNT);
                                preenregistrementCompteClient.setIntPRICERESTE(detailAmount - int_AMOUNT);
                                AmountReglement = int_AMOUNT;
                                int_AMOUNT -= int_AMOUNT;
                                this.persiste(preenregistrementCompteClient);

                                ODossierReglementDetail = this.createDossierReglementDetail(
                                        preenregistrementCompteClient.getLgPREENREGISTREMENTCOMPTECLIENTID(),
                                        dossierReglement, AmountReglement);
                            }

                        }
                    } else {
                        /**
                         * LE CAS USER SELECTION ALL ET DECOCHE DAUTRES*
                         */
                        new logger().OCategory.info(
                                "paiement partiel LE CAS USER SELECTION ALL ET DECOCHE DAUTRES -------------------------------");
                        listpreenregistrementCompteClient = getPreenregistrementCompteClients(lg_COMPTE_CLIENT);

                        for (int i = 0; i < uncheckedlist.length(); i++) {

                            for (int j = 0; j < listpreenregistrementCompteClient.size(); j++) {
                                if (listpreenregistrementCompteClient.get(j).getLgPREENREGISTREMENTCOMPTECLIENTID()
                                        .equals(uncheckedlist.getString(i))) {
                                    listpreenregistrementCompteClient.remove(j);
                                }

                            }

                        }
                        for (TPreenregistrementCompteClient OPreenregistrementCompteClient : listpreenregistrementCompteClient) {

                            Integer detailAmount = OPreenregistrementCompteClient.getIntPRICERESTE();

                            if (int_AMOUNT >= detailAmount) {
                                // OPreenregistrementCompteClient.setIntPRICE(OPreenregistrementCompteClient.getIntPRICE()
                                // + detailAmount);
                                OPreenregistrementCompteClient.setIntPRICERESTE(0);
                                OPreenregistrementCompteClient.setDtUPDATED(new Date());

                                AmountReglement = detailAmount;
                                int_AMOUNT -= detailAmount;
                                this.persiste(OPreenregistrementCompteClient);

                                ODossierReglementDetail = this.createDossierReglementDetail(
                                        OPreenregistrementCompteClient.getLgPREENREGISTREMENTCOMPTECLIENTID(),
                                        dossierReglement, AmountReglement);
                            } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                                new logger().OCategory.info(
                                        "paiement partiel LE CAS USER SELECTION ALL ET DECOCHE DAUTRES int_AMOUNT < tFactureDetail.getDblMONTANT()  -------------------------- "
                                                + int_AMOUNT);
                                // OPreenregistrementCompteClient.setIntPRICE(OPreenregistrementCompteClient.getIntPRICE()
                                // + int_AMOUNT);
                                OPreenregistrementCompteClient.setIntPRICERESTE(detailAmount - int_AMOUNT);
                                OPreenregistrementCompteClient.setDtUPDATED(new Date());
                                AmountReglement = int_AMOUNT;
                                int_AMOUNT -= int_AMOUNT;
                                this.persiste(OPreenregistrementCompteClient);
                                ODossierReglementDetail = this.createDossierReglementDetail(
                                        OPreenregistrementCompteClient.getLgPREENREGISTREMENTCOMPTECLIENTID(),
                                        dossierReglement, AmountReglement);
                            }

                        }

                    }

                }
                TellerMovement tellerMovement = new TellerMovement(this.getOdataManager(), this.getOTUser());
                TMvtCaisse caisse = tellerMovement.AddTMvtCaisseDiff(OTTypeMvtCaisse,
                        OTTypeMvtCaisse.getStrCODECOMPTABLE(), dossierReglement.getLgDOSSIERREGLEMENTID(), OTReglement,
                        dossierReglement.getDblAMOUNT(), str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE,
                        int_TAUX, dossierReglement.getDtCREATED(), true, str_FIRST_LAST_NAME,
                        this.getOTUser().getLgUSERID(), OTTypeMvtCaisse.getStrDESCRIPTION(), (int) int_AMOUNT_REMIS,
                        (int) int_AMOUNT_RECU, true, new Date());
                if (caisse != null) {
                    // TRecettes OTRecettes = new caisseManagement(this.getOdataManager(),
                    // this.getOTUser()).AddRecette(int_AMOUNT, Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON,
                    // OTTypeMvtCaisse.getStrDESCRIPTION(), facture.getStrCODEFACTURE(), int_AMOUNT_REMIS,
                    // int_AMOUNT_RECU, dossierReglement.getLgDOSSIERREGLEMENTID(),
                    // OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID(), commonparameter.OTHER,
                    // Parameter.KEY_TASK_ENTREE_CAISSE, OTReglement.getLgREGLEMENTID(), lg_COMPTECLIENT_TIERSPAYANT_ID,
                    // "2", OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT);
                    String Description = "Reglement de différé  " + dossierReglement.getDblAMOUNT()
                            + " Type de mouvement " + OTTypeMvtCaisse.getStrDESCRIPTION() + " PAR "
                            + this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME();
                    addTransaction(this.getOTUser(), this.getOTUser(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                            dossierReglement.getDblAMOUNT().intValue(), 0, dossierReglement.getDblAMOUNT().intValue(),
                            dossierReglement.getDblAMOUNT().intValue(), Boolean.TRUE, CategoryTransaction.CREDIT,
                            TypeTransaction.ENTREE, OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID(),
                            OTTypeMvtCaisse, dossierReglement.getDblAMOUNT().intValue(), 0, caisse.getStrREFTICKET(),
                            lg_CLIENT_ID);
                    updateItem(this.getOTUser(), caisse.getLgMVTCAISSEID(), Description, TypeLog.MVT_DE_CAISSE, caisse);

                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    updateOrganismeAccount(OTCompteClient, dossierReglement.getDblAMOUNT().intValue());
                } else {
                    this.buildErrorTraceMessage("La prise en compte du règlement à la caisse n'a pas été effectuée");
                }
            }
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de reglement ");
            e.printStackTrace();
        }
        return dossierReglement;
    }

    private TDossierReglementDetail createDossierReglementDetail(String ref, TDossierReglement dossierReglement,
            double montant) {
        TDossierReglementDetail dossierReglementDetail = null;
        try {
            dossierReglementDetail = new TDossierReglementDetail(pkey.getComplexId());
            dossierReglementDetail.setDblAMOUNT(montant);
            dossierReglementDetail.setLgDOSSIERREGLEMENTID(dossierReglement);
            dossierReglementDetail.setDtCREATED(dossierReglement.getDtCREATED());
            dossierReglementDetail.setStrREF(ref);
            dossierReglementDetail.setDtUPDATED(dossierReglement.getDtCREATED());
            dossierReglementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
            this.persiste(dossierReglementDetail);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return dossierReglementDetail;
    }

    private TDossierReglement createDossierReglements(String lg_CLIENT_ID, double amount, String nature_dossier,
            Date dt_reglement, double montantattendu) {
        TDossierReglement OTDossierReglement = null;
        try {
            OTDossierReglement = new TDossierReglement();
            OTDossierReglement.setLgDOSSIERREGLEMENTID(new date().getComplexId());
            OTDossierReglement.setDblAMOUNT(amount);
            OTDossierReglement.setLgUSERID(this.getOTUser());
            OTDossierReglement.setStrNATUREDOSSIER(nature_dossier);
            OTDossierReglement.setStrORGANISMEID(lg_CLIENT_ID);
            OTDossierReglement.setDtREGLEMENT(dt_reglement);
            OTDossierReglement.setDtCREATED(new Date());
            OTDossierReglement.setDtUPDATED(new Date());
            OTDossierReglement.setDblMONTANTATTENDU(montantattendu);
            OTDossierReglement.setStrSTATUT(commonparameter.statut_is_Closed);
            this.persiste(OTDossierReglement);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTDossierReglement;

    }

    private List<TPreenregistrementCompteClient> getPreenregistrementCompteClients(String lg_COMPTECLIENT_ID) {
        List<TPreenregistrementCompteClient> list = new ArrayList<>();
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClient o WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID=?1 AND o.intPRICERESTE >0 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.strSTATUT=?2")
                    .setParameter(1, lg_COMPTECLIENT_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public List<EntityData> getAllDossierReglementsDifferes(String lg_CLIENT_ID, String start, String end) {
        List<TDossierReglement> dossierReglements;
        List<EntityData> entityDatas = new ArrayList<>();
        try {

            dossierReglements = this.getOdataManager().getEm().createQuery(
                    "SELECT  o FROM TDossierReglement o WHERE FUNCTION('DATE',o.dtCREATED) >= ?1 AND  FUNCTION('DATE',o.dtCREATED)<=?2 AND o.strORGANISMEID LIKE ?3 AND o.strNATUREDOSSIER='DIFFERE' ORDER BY o.dtCREATED DESC ")
                    .setParameter(1, start).setParameter(2, end).setParameter(3, lg_CLIENT_ID).getResultList();

            for (TDossierReglement ODossierReglement : dossierReglements) {
                TReglement oReglement = getReglementByRef(ODossierReglement.getLgDOSSIERREGLEMENTID());
                TClient OClient = this.getOdataManager().getEm().find(TClient.class,
                        ODossierReglement.getStrORGANISMEID());
                EntityData OEntityData = new EntityData();
                OEntityData.setStr_value1(ODossierReglement.getLgDOSSIERREGLEMENTID());
                OEntityData.setStr_value2(ODossierReglement.getDblAMOUNT() + "");
                OEntityData.setStr_value3(oReglement.getLgMODEREGLEMENTID().getStrNAME());
                OEntityData.setStr_value4(OClient.getStrFIRSTNAME() + " " + OClient.getStrLASTNAME());
                OEntityData.setStr_value5(
                        oReglement.getLgUSERID().getStrFIRSTNAME() + " " + oReglement.getLgUSERID().getStrLASTNAME());
                OEntityData.setStr_value6(date.backabaseUiFormat2.format(oReglement.getDtREGLEMENT()));
                OEntityData.setStr_value7(date.NomadicUiFormatTime.format(oReglement.getDtREGLEMENT()));
                OEntityData.setStr_value8(ODossierReglement.getDblMONTANTATTENDU() + "");
                entityDatas.add(OEntityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return entityDatas;
    }

    public List<EntityData> getAllDefferedClients(String query) {
        List<EntityData> lists = new ArrayList<>();
        String req = "SELECT cl.`lg_CLIENT_ID`,  CONCAT(cl.`str_FIRST_NAME`,' ',cl.`str_LAST_NAME`) AS CLIENTNAME  FROM t_preenregistrement_compte_client p,t_compte_client c,t_client cl,t_preenregistrement r "
                + " WHERE c.`lg_COMPTE_CLIENT_ID`=p.`lg_COMPTE_CLIENT_ID` AND cl.`lg_CLIENT_ID`=c.`lg_CLIENT_ID` AND r.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` AND r.`b_IS_CANCEL`=0 AND r.`int_PRICE`>0 "
                + " AND r.`str_STATUT`='is_Closed' AND (cl.`str_FIRST_NAME` LIKE '%" + query
                + "%' OR cl.`str_LAST_NAME` LIKE '%" + query + "%' OR cl.`str_NUMERO_SECURITE_SOCIAL` LIKE '%" + query
                + "%'  ) GROUP BY cl.`lg_CLIENT_ID`";

        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(req).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                lists.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lists;
    }

    public List<EntityData> getAllDefferedReglementDetails(String lg_DOSSIER_REGLEMENT_ID) {
        List<TDossierReglementDetail> dossierReglementDetails = new ArrayList<>();
        List<EntityData> listEntityData = new ArrayList<>();
        try {
            dossierReglementDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TDossierReglementDetail o WHERE o.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID = ?1  ORDER BY o.dtCREATED DESC")
                    .setParameter(1, lg_DOSSIER_REGLEMENT_ID).getResultList();
            for (TDossierReglementDetail ODetail : dossierReglementDetails) {
                TPreenregistrementCompteClient preenregistrementCompteClient = this.getOdataManager().getEm()
                        .find(TPreenregistrementCompteClient.class, ODetail.getStrREF());
                EntityData entityData = new EntityData();
                entityData.setStr_value1(ODetail.getLgDOSSIERREGLEMENTDETAILID());
                entityData.setStr_value2(preenregistrementCompteClient.getLgPREENREGISTREMENTID().getStrREFBON() != null
                        ? preenregistrementCompteClient.getLgPREENREGISTREMENTID().getStrREFBON() : " ");
                entityData.setStr_value6(date.backabaseUiFormat2.format(preenregistrementCompteClient.getDtUPDATED()));
                entityData.setStr_value3(ODetail.getDblAMOUNT() + "");
                entityData.setStr_value5(preenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCLIENTID()
                        .getStrNUMEROSECURITESOCIAL());
                entityData.setStr_value7(date.NomadicUiFormatTime.format(preenregistrementCompteClient.getDtUPDATED()));
                listEntityData.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return listEntityData;
    }

    public List<TTypeReglement> getListeTTypeReglement(String search_value, String lg_TYPE_REGLEMENT_ID,
            String str_FLAG) {
        List<TTypeReglement> lstTTypeReglement = new ArrayList<>();
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            lstTTypeReglement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeReglement t WHERE t.lgTYPEREGLEMENTID LIKE ?1 AND t.strNAME LIKE ?2 AND t.strFLAG LIKE ?3  AND t.lgTYPEREGLEMENTID <>'4'")
                    .setParameter(1, lg_TYPE_REGLEMENT_ID).setParameter(2, search_value + "%").setParameter(3, str_FLAG)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTTypeReglement;
    }

    public void updateSnapshotVenteSociete(String lg_DOSSIERREGLEMENTID, String lg_FACTUREID) {
        try {
            Object o = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_populatestatreglementsociete`(?1,?2)")
                    .setParameter(1, lg_DOSSIERREGLEMENTID).setParameter(2, lg_FACTUREID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateOrganismeAccount(TCompteClient OCompteClient, Integer amount) {
        try {
            if (OCompteClient.getDecBalanceInDisponible() > 0) {
                OCompteClient.setDecBalanceInDisponible(OCompteClient.getDecBalanceInDisponible() - amount);
                this.merge(OCompteClient);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public TDossierReglement makeInvoicePayment(String lg_FACTURE_ID, String lg_NATURE_PAIEMENT, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, String lg_MODE_REGLEMENT_ID, int int_TAUX,
            double int_AMOUNT, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, JSONArray listfacturedetail,
            String str_FIRST_LAST_NAME, String str_CUSTOMER, JSONArray uncheckedlist, Date dt_reglement) {

        TReglement OTReglement;
        TDossierReglement dossierReglement = null;
        double total_amount = (int_AMOUNT > 0 ? int_AMOUNT : int_AMOUNT_RECU);
        double montantattendu;
        List<TFactureDetail> lstTFactureDetail;

        TCompteClient OTCompteClient;
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;

        double amountReglement;
        try {
            if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
                this.buildErrorTraceMessage("Impossible de faire le règlement", "La caisse est fermée");
                return null;
            } else {

                TFacture facture = this.getOdataManager().getEm().find(TFacture.class, lg_FACTURE_ID);
                montantattendu = facture.getDblMONTANTRESTANT();
                OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1")
                        .setParameter(1, facture.getStrCUSTOMER()).getSingleResult();
                if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().begin();
                }

                dossierReglement = this.createDossiersReglement(facture,
                        (int_AMOUNT > 0 ? int_AMOUNT : int_AMOUNT_RECU), "bordereau", dt_reglement, montantattendu);
                OTReglement = this.CreateTReglement(OTCompteClient.getLgCOMPTECLIENTID(),
                        dossierReglement.getLgDOSSIERREGLEMENTID(), str_BANQUE, str_LIEU, str_CODE_MONNAIE,
                        str_COMMENTAIRE,
                        this.getOdataManager().getEm().find(TModeReglement.class, lg_MODE_REGLEMENT_ID), int_TAUX,
                        int_AMOUNT, str_FIRST_LAST_NAME, dt_reglement, true);
                TTypeMvtCaisse OTTypeMvtCaisse = this.getOdataManager().getEm().find(TTypeMvtCaisse.class,
                        facture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());
                OTReglement.setBISFACTURE(true);
                this.getOdataManager().getEm().persist(OTReglement);
                TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
                if (lg_NATURE_PAIEMENT.equals("2")) {

                    lstTFactureDetail = this.getDetailsFactureByTiersPayant(facture.getLgFACTUREID());

                    for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                        OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                        double detailAmount = tFactureDetail.getDblMONTANTRESTANT();

                        OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                .getLgCOMPTECLIENTTIERSPAYANTID(); // code ajotué 18/08/2016

                        if (int_AMOUNT >= detailAmount) {

                            tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                            tFactureDetail.setDblMONTANTRESTANT(0d);
                            tFactureDetail.setDtUPDATED(new Date());
                            tFactureDetail.setStrSTATUT(commonparameter.PAID);
                            OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);

                            // code ajotué 18/08/2016
                            if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                            }
                            if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                this.getOdataManager().getEm().merge(OTCompteClient);
                            }
                            // fin code ajotué 18/08/2016

                            amountReglement = detailAmount;
                            int_AMOUNT -= detailAmount;
                            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
                            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                            this.getOdataManager().getEm().merge(tFactureDetail);
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT >= detailAmount------------------------------------------ amount decrementer "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);

                            this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                            updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent,
                                    (int) amountReglement);
                            this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                        } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                            new logger().OCategory.info(
                                    "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT <  detailAmount && int_AMOUNT >0------------------------------------------ amount "
                                            + int_AMOUNT + " montant restant details facture " + detailAmount);
                            tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT);
                            tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT);
                            Double reste = detailAmount - int_AMOUNT;

                            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                            new logger().oCategory.info(
                                    " 1  Valeur de OTPreenregistrementCompteClientTiersPayent APRES MODIFICATION     --------------------------- "
                                            + OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE() + "   ");
                            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                            // code ajotué 18/08/2016
                            if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) int_AMOUNT);
                                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                            }
                            if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                        OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT);
                                this.getOdataManager().getEm().merge(OTCompteClient);
                            }
                            // fin code ajotué 18/08/2016

                            tFactureDetail.setDtUPDATED(new Date());
                            this.getOdataManager().getEm().merge(tFactureDetail);
                            amountReglement = int_AMOUNT;
                            int_AMOUNT -= int_AMOUNT;
                            this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);

                            this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                            // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, (int)
                            // amountReglement);
                        }

                    }

                } else {
                    if (uncheckedlist.length() == 0 && listfacturedetail.length() > 0) {
                        new logger().OCategory.info(
                                "paiement partiel sans tout selection  -----------------------------------------------");
                        for (int i = 0; i < listfacturedetail.length(); i++) {

                            TFactureDetail tFactureDetail = this.getOdataManager().getEm().find(TFactureDetail.class,
                                    listfacturedetail.get(i));
                            OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                    .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                            OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                    .getLgCOMPTECLIENTTIERSPAYANTID();
                            double detailAmount = tFactureDetail.getDblMONTANTRESTANT();
                            if (int_AMOUNT >= detailAmount) {
                                new logger().OCategory.info(
                                        "paiement partiel sans tout selection----int_AMOUNT >= detailAmount-------------- amount "
                                                + int_AMOUNT + " montant restant details facture " + detailAmount);
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                                tFactureDetail.setDblMONTANTRESTANT(0d);
                                tFactureDetail.setDtUPDATED(new Date());
                                tFactureDetail.setStrSTATUT(commonparameter.PAID);
                                new logger().OCategory.info(
                                        "paiement partiel montant de la facture int_AMOUNT>=tFactureDetail.getDblMONTANT() -------------------------------"
                                                + int_AMOUNT + " >" + tFactureDetail.getDblMONTANT());
                                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                                amountReglement = detailAmount;
                                int_AMOUNT -= detailAmount;
                                this.getOdataManager().getEm().merge(tFactureDetail);
                                // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, (int)
                                // amountReglement);
                                this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                            } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                                new logger().OCategory.info(
                                        "paiement partiel montant de la facture int_AMOUNT< tFactureDetail.getDblMONTANT() -------------------------------"
                                                + int_AMOUNT + " <" + tFactureDetail.getDblMONTANT());
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT);
                                tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT);
                                Double reste = detailAmount - int_AMOUNT;

                                new logger().oCategory.info("reste      --------------------------- " + reste
                                        + "  restetoString | detailAmount:" + detailAmount);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                                // new logger().oCategory.info(" 2 Valeur de OTPreenregistrementCompteClientTiersPayent
                                // APRES MODIFICATION --------------------------- " +
                                // OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE() + " ");

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                tFactureDetail.setDtUPDATED(new Date());
                                amountReglement = int_AMOUNT;
                                int_AMOUNT -= int_AMOUNT;
                                this.getOdataManager().getEm().merge(tFactureDetail);
                                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                                // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, (int)
                                // amountReglement);
                                this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                            }

                        }
                    } else if (uncheckedlist.length() > 0) {
                        /**
                         * LE CAS USER SELECTION ALL ET DECOCHE DAUTRES*
                         */
                        new logger().OCategory.info(
                                "paiement partiel LE CAS USER SELECTION ALL ET DECOCHE DAUTRES -------------------------------");
                        lstTFactureDetail = this.getDetailsFactureByTiersPayant(facture.getLgFACTUREID());

                        for (int i = 0; i < uncheckedlist.length(); i++) {

                            for (int j = 0; j < lstTFactureDetail.size(); j++) {
                                if (lstTFactureDetail.get(j).getLgFACTUREDETAILID()
                                        .equals(uncheckedlist.getString(i))) {
                                    lstTFactureDetail.remove(j);
                                }

                            }

                        }
                        for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                            OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                    .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                            OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                    .getLgCOMPTECLIENTTIERSPAYANTID(); // code ajotué 18/08/2016
                            double detailAmount = tFactureDetail.getDblMONTANTRESTANT();

                            if (int_AMOUNT >= detailAmount) {
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                                tFactureDetail.setDblMONTANTRESTANT(0d);
                                tFactureDetail.setDtUPDATED(new Date());
                                tFactureDetail.setStrSTATUT(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                amountReglement = detailAmount;
                                int_AMOUNT -= detailAmount;
                                this.getOdataManager().getEm().merge(tFactureDetail);
                                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                                // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, (int)
                                // amountReglement);
                                this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                            } else if (int_AMOUNT < detailAmount && int_AMOUNT > 0) {
                                new logger().OCategory.info(
                                        "paiement partiel LE CAS USER SELECTION ALL ET DECOCHE DAUTRES int_AMOUNT < tFactureDetail.getDblMONTANT()  -------------------------- "
                                                + int_AMOUNT);
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT);
                                tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT);
                                Double reste = detailAmount - int_AMOUNT;

                                new logger().oCategory
                                        .info("reste      --------------------------- " + reste + "  restetoString ");
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                new logger().oCategory.info(
                                        " 2 Valeur de OTPreenregistrementCompteClientTiersPayent APRES MODIFICATION     --------------------------- "
                                                + OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE()
                                                + "   ");
                                tFactureDetail.setDtUPDATED(new Date());
                                amountReglement = int_AMOUNT;
                                int_AMOUNT -= int_AMOUNT;

                                this.getOdataManager().getEm().merge(tFactureDetail);
                                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                                // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, (int)
                                // amountReglement);
                                this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                            }

                        }

                    } else if (uncheckedlist.length() == 0 && listfacturedetail.length() == 0) {
                        lstTFactureDetail = this.getDetailsFactureByTiersPayant(facture.getLgFACTUREID());

                        for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                            OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                                    .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                            double detailAmount = tFactureDetail.getDblMONTANTRESTANT();

                            OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                                    .getLgCOMPTECLIENTTIERSPAYANTID(); // code ajotué 18/08/2016

                            if (int_AMOUNT_RECU >= detailAmount) {

                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                                tFactureDetail.setDblMONTANTRESTANT(0d);
                                tFactureDetail.setDtUPDATED(new Date());
                                tFactureDetail.setStrSTATUT(commonparameter.PAID);
                                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - (int) detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - detailAmount);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                amountReglement = detailAmount;
                                int_AMOUNT_RECU -= detailAmount;
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                                this.getOdataManager().getEm().merge(tFactureDetail);
                                new logger().OCategory.info(
                                        "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT >= detailAmount------------------------------------------ amount decrementer "
                                                + int_AMOUNT + " montant restant details facture " + detailAmount);

                                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                                updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent,
                                        (int) amountReglement);
                                this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                            } else if (int_AMOUNT_RECU < detailAmount && int_AMOUNT_RECU > 0) {
                                new logger().OCategory.info(
                                        "paiement total   Traitement de chaque dossiers de la facture-----int_AMOUNT <  detailAmount && int_AMOUNT >0------------------------------------------ amount "
                                                + int_AMOUNT + " montant restant details facture " + detailAmount);
                                tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + int_AMOUNT_RECU);
                                tFactureDetail.setDblMONTANTRESTANT(detailAmount - int_AMOUNT_RECU);
                                Double reste = detailAmount - int_AMOUNT_RECU;

                                new logger().oCategory
                                        .info("reste      --------------------------- " + reste + "  restetoString ");
                                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(reste.intValue());
                                new logger().oCategory.info(
                                        " 1  Valeur de OTPreenregistrementCompteClientTiersPayent APRES MODIFICATION     --------------------------- "
                                                + OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE()
                                                + "   ");
                                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                                // code ajotué 18/08/2016
                                if (OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() - int_AMOUNT_RECU >= 0) {
                                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE()
                                                    - (int) int_AMOUNT_RECU);
                                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                                }
                                if (OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT_RECU >= 0) {
                                    OTCompteClient.setDblQUOTACONSOMENSUELLE(
                                            OTCompteClient.getDblQUOTACONSOMENSUELLE() - int_AMOUNT_RECU);
                                    this.getOdataManager().getEm().merge(OTCompteClient);
                                }
                                // fin code ajotué 18/08/2016

                                tFactureDetail.setDtUPDATED(new Date());
                                this.getOdataManager().getEm().merge(tFactureDetail);
                                amountReglement = int_AMOUNT_RECU;
                                int_AMOUNT_RECU -= int_AMOUNT_RECU;
                                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);

                                this.createReglementDetail(tFactureDetail, dossierReglement, amountReglement);
                                // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, (int)
                                // amountReglement);
                                break;
                            }

                        }
                    }

                }

                double restamount = total_amount - facture.getDblMONTANTRESTANT();
                facture.setDblMONTANTPAYE(facture.getDblMONTANTPAYE() + total_amount);

                if (restamount == 0) {
                    facture.setDblMONTANTRESTANT(restamount);
                    facture.setStrSTATUT(commonparameter.PAID);

                } else if (restamount < 0) {
                    facture.setDblMONTANTRESTANT((-1) * restamount);
                    facture.setStrSTATUT(commonparameter.statut_is_Process);
                }
                updateInvoicePlafond(facture, (int) total_amount);
                facture.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(facture);

                TMvtCaisse caisse = this.AddTMvtCaisse(OTTypeMvtCaisse, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
                        dossierReglement.getLgDOSSIERREGLEMENTID(),
                        OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID(), dossierReglement.getDblAMOUNT(),
                        str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX,
                        dossierReglement.getDtCREATED(), true, str_FIRST_LAST_NAME, this.getOTUser().getLgUSERID(),
                        OTTypeMvtCaisse.getStrDESCRIPTION() + " de la facture " + facture.getStrCODEFACTURE(),
                        (int) int_AMOUNT_REMIS, (int) int_AMOUNT_RECU, true, new Date(),
                        OTReglement.getLgMODEREGLEMENTID(), OTReglement);
                String Description = "Reglement de facture  " + dossierReglement.getDblAMOUNT() + " Type de mouvement "
                        + OTTypeMvtCaisse.getStrDESCRIPTION() + " PAR " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME();
                addTransaction(this.getOTUser(), this.getOTUser(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                        dossierReglement.getDblAMOUNT().intValue(), 0, dossierReglement.getDblAMOUNT().intValue(),
                        (int) int_AMOUNT_RECU, true, CategoryTransaction.CREDIT, TypeTransaction.ENTREE,
                        OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID(), OTTypeMvtCaisse,
                        this.getOdataManager().getEm(), dossierReglement.getDblAMOUNT().intValue(), 0,
                        caisse.getStrREFTICKET(), OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTIERSPAYANTID());
                updateItem(this.getOTUser(), caisse.getLgMVTCAISSEID(), Description, TypeLog.MVT_DE_CAISSE, caisse,
                        this.getOdataManager().getEm());

            }
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                try {
                    this.getOdataManager().getEm().getTransaction().commit();
                    this.setDetailmessage("1");
                } catch (Exception e) {
                    this.buildErrorTraceMessage("Echec de reglement ");
                    e.printStackTrace();
                }

            }
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de reglement ");
            if (this.getOdataManager().getEm().getTransaction().isActive()) {

                this.getOdataManager().getEm().getTransaction().rollback();

            }
            e.printStackTrace();
        }
        return dossierReglement;
    }

    public TDossierReglement createDossiersReglement(TFacture facture, double amount, String nature_dossier,
            Date dt_reglement, double montantattendu) {
        TDossierReglement OTDossierReglement = null;
        try {

            OTDossierReglement = new TDossierReglement();

            OTDossierReglement.setLgDOSSIERREGLEMENTID(new date().getComplexId());
            OTDossierReglement.setDblAMOUNT(amount);
            OTDossierReglement.setLgFACTUREID(facture);
            OTDossierReglement.setLgUSERID(this.getOTUser());
            OTDossierReglement.setStrNATUREDOSSIER(nature_dossier);
            OTDossierReglement.setStrORGANISMEID(facture.getStrCUSTOMER());
            OTDossierReglement.setDtREGLEMENT(dt_reglement);
            OTDossierReglement.setDtCREATED(new Date());
            OTDossierReglement.setDblMONTANTATTENDU(montantattendu);
            OTDossierReglement.setStrSTATUT(commonparameter.statut_is_Closed);
            this.getOdataManager().getEm().persist(OTDossierReglement);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTDossierReglement;

    }

    public void createReglementDetail(TFactureDetail factureDetail, TDossierReglement dossierReglement,
            double montant) {
        TDossierReglementDetail dossierReglementDetail = null;
        try {

            dossierReglementDetail = new TDossierReglementDetail(pkey.getComplexId());
            dossierReglementDetail.setDblAMOUNT(montant);
            dossierReglementDetail.setLgFACTUREDETAILID(factureDetail);
            dossierReglementDetail.setLgDOSSIERREGLEMENTID(dossierReglement);
            dossierReglementDetail.setDtCREATED(dossierReglement.getDtCREATED());
            dossierReglementDetail.setStrREF(factureDetail.getStrREF());
            dossierReglementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
            this.getOdataManager().getEm().persist(dossierReglementDetail);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public TReglement CreateTReglement(String str_REF_COMPTE_CLIENT, String str_REF_RESSOURCE, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, TModeReglement OTModeReglement,
            int int_TAUX, double int_AMOUNT, String str_FIRST_LAST_NAME, Date dt_reglement, boolean bool_CHECKED) {
        TReglement OTReglement = null;
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        try {
            if (OTModeReglement == null) {
                this.buildErrorTraceMessage("Echec de règlement. Mode de règlement inexistant");
                return null;
            }

            if (!OcaisseManagement.CheckResumeCaisse()) {
                this.buildErrorTraceMessage(OcaisseManagement.getDetailmessage());
                return null;
            }

            OTReglement = new TReglement();
            OTReglement.setLgREGLEMENTID(this.getKey().getComplexId());
            OTReglement.setStrBANQUE(str_BANQUE);
            OTReglement.setStrCODEMONNAIE(str_CODE_MONNAIE);
            OTReglement.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTReglement.setStrLIEU(str_LIEU);
            OTReglement.setStrFIRSTLASTNAME(str_FIRST_LAST_NAME);
            OTReglement.setStrREFRESSOURCE(str_REF_RESSOURCE);
            OTReglement.setIntTAUX(int_TAUX);
            OTReglement.setDtCREATED(new Date());
            OTReglement.setLgMODEREGLEMENTID(OTModeReglement);
            OTReglement.setDtREGLEMENT(dt_reglement);
            OTReglement.setLgUSERID(this.getOTUser());
            OTReglement.setBoolCHECKED(bool_CHECKED);
            OTReglement.setStrSTATUT(OTModeReglement.getLgMODEREGLEMENTID().equals("6") ? commonparameter.statut_differe
                    : commonparameter.statut_is_Closed);
            this.getOdataManager().getEm().persist(OTReglement);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTReglement;
    }
    // creation de mvt caisse 28/11/2016

    public TMvtCaisse AddTMvtCaisse(TTypeMvtCaisse OTTypeMvtCaisse, String str_NUM_COMPTE,
            String str_NUM_PIECE_COMPTABLE, String lg_MODE_REGLEMENT_ID, double int_AMOUNT, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE_REGLEMENT, int int_TAUX, Date dt_DATE_MVT,
            boolean action, String str_FIRST_LAST_NAME, String P_KEY, String str_COMMENTAIRE, int int_AMOUNT_REMIS,
            int int_AMOUNT_RECU, boolean bool_CHECKED, Date dt_CREATED, TModeReglement OTModeReglement,
            TReglement OTReglement) {
        TMvtCaisse OTMvtCaisse;

        // TReglement OTReglement = null;
        OTMvtCaisse = new TMvtCaisse();
        OTMvtCaisse.setLgMVTCAISSEID(this.getKey().getComplexId());
        OTMvtCaisse.setLgTYPEMVTCAISSEID(OTTypeMvtCaisse);
        OTMvtCaisse.setLgMODEREGLEMENTID(OTModeReglement);
        OTMvtCaisse.setStrNUMCOMPTE(str_NUM_COMPTE);
        OTMvtCaisse.setStrNUMPIECECOMPTABLE(str_NUM_PIECE_COMPTABLE);
        OTMvtCaisse.setIntAMOUNT(int_AMOUNT);
        OTMvtCaisse.setStrCOMMENTAIRE(str_COMMENTAIRE);
        OTMvtCaisse.setStrSTATUT(commonparameter.statut_enable);
        OTMvtCaisse.setDtDATEMVT(dt_DATE_MVT);
        // OTMvtCaisse.setDtCREATED(new Date()); // a decommenter en cas de probleme
        OTMvtCaisse.setDtCREATED(dt_CREATED);
        OTMvtCaisse.setStrCREATEDBY(this.getOTUser());
        OTMvtCaisse.setPKey(P_KEY);
        OTMvtCaisse.setStrREFTICKET(this.getKey().getShortId(10));
        OTMvtCaisse.setLgUSERID(this.getOTUser().getLgUSERID());

        // code ajouté 15/07/2015
        OTMvtCaisse.setBoolCHECKED(bool_CHECKED);
        // OTReglement = new Preenregistrement(this.getOdataManager(),
        // this.getOTUser()).CreateTReglement(this.getOTUser().getLgUSERID(), OTMvtCaisse.getLgMVTCAISSEID(),
        // str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE_REGLEMENT, OTModeReglement, int_TAUX,
        // int_AMOUNT,str_FIRST_LAST_NAME,dt_CREATED, bool_CHECKED);

        this.getOdataManager().getEm().persist(OTMvtCaisse);
        if (action) {

            String Description = "Mouvement d'une somme de  " + OTMvtCaisse.getIntAMOUNT() + " Type de mouvement "
                    + OTTypeMvtCaisse.getStrDESCRIPTION();
            String transaction = "", lg_MOTIF_REGLEMENT_ID = "";
            if (OTTypeMvtCaisse.getLgTYPEMVTCAISSEID().equalsIgnoreCase("4")) {
                transaction = commonparameter.TRANSACTION_DEBIT;
                lg_MOTIF_REGLEMENT_ID = "3";
                // OTMvtCaisse.setIntAMOUNT((-1) * OTMvtCaisse.getIntAMOUNT());
            } else {
                transaction = commonparameter.TRANSACTION_CREDIT;
                lg_MOTIF_REGLEMENT_ID = "2";
            }
            TMotifReglement tmr = this.getOdataManager().getEm().find(TMotifReglement.class, lg_MOTIF_REGLEMENT_ID);
            // new caisseManagement(this.getOdataManager(), this.getOTUser()).add_to_cash_transaction(Ojconnexion,
            // transaction, OTMvtCaisse.getIntAMOUNT(), Description, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
            // int_AMOUNT_REMIS, int_AMOUNT_RECU, OTMvtCaisse.getLgMVTCAISSEID(), str_NUM_PIECE_COMPTABLE,
            // Parameter.KEY_TASK_OTHER, Parameter.KEY_TASK_OTHER, OTReglement.getLgREGLEMENTID(), "",
            // lg_MOTIF_REGLEMENT_ID, OTModeReglement.getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(), true, bool_CHECKED,
            // dt_CREATED);

            add_to_cash_transaction(transaction, OTMvtCaisse.getIntAMOUNT(), Description,
                    OTTypeMvtCaisse.getStrCODECOMPTABLE(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                    OTMvtCaisse.getLgMVTCAISSEID(), str_NUM_PIECE_COMPTABLE, Parameter.KEY_TASK_OTHER,
                    Parameter.KEY_TASK_OTHER, OTReglement, "", tmr,
                    OTModeReglement.getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(), true, bool_CHECKED, dt_CREATED);

            this.doeventlog(this.getOdataManager(), commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_mvt_caisse", "caisse", "Mouvement de Caisse",
                    this.getOTUser().getLgUSERID());
            this.is_activity(this.getOdataManager(), this.getOTUser().getLgUSERID());

        }

        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        return OTMvtCaisse;
    }

    public void doeventlog(dataManager OdaManager, String ID_INSCRIPTION, String str_DESCRIPTION, String str_CREATED_BY,
            String str_STATUT, String str_TABLE_CONCERN, String str_MODULE_CONCERN, String str_TYPE_LOG,
            String lg_USER_ID) {
        try {
            new logger().OCategory.info("dans do_event_log");

            OdaManager.getEm().createNativeQuery(
                    "INSERT INTO `t_event_log` (`lg_EVENT_LOG_ID`, `str_DESCRIPTION`, `str_CREATED_BY`, `str_STATUT`, `str_TABLE_CONCERN`,`str_MODULE_CONCERN`,`str_TYPE_LOG`,`lg_USER_ID`) VALUES(?,?,?,?,?,?,?,?)")
                    .setParameter(1, this.getKey().getComplexId()).setParameter(2, str_DESCRIPTION)
                    .setParameter(3, str_CREATED_BY).setParameter(4, str_STATUT).setParameter(5, str_TABLE_CONCERN)
                    .setParameter(6, str_MODULE_CONCERN).setParameter(7, str_TYPE_LOG).setParameter(8, lg_USER_ID)
                    .executeUpdate();

            this.buildSuccesTraceMessage(str_DESCRIPTION);

        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.error(e.getMessage());
            this.buildErrorTraceMessage(e.getMessage());
        }
    }

    private void add_to_cash_transaction(String str_TRANSACTION_REF, double int_AMOUNT, String str_DESCRIPTION,
            String str_NUMERO_COMPTE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String str_REF_FACTURE, String str_TYPE_VENTE, String str_TASK, TReglement lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, TMotifReglement lg_MOTIF_REGLEMENT_ID, String lg_TYPE_REGLEMENT_ID,
            boolean str_TYPE, boolean bool_CHECKED, Date dt_CREATED) {
        try {
            TCashTransaction transaction = new TCashTransaction(this.getKey().gettimeid());

            transaction.setStrTRANSACTIONREF(str_TRANSACTION_REF);
            transaction.setIntAMOUNT(Double.valueOf(int_AMOUNT).intValue());
            transaction.setBoolCHECKED(bool_CHECKED);
            transaction.setLgCREATEDBY(this.getOTUser().getStrLOGIN());
            transaction.setLgUPDATEDBY(this.getOTUser().getStrLOGIN());
            transaction.setDtCREATED(dt_CREATED);
            transaction.setDtUPDATED(dt_CREATED);
            transaction.setStrDESCRIPTION(str_DESCRIPTION);
            transaction.setLgUSERID(this.getOTUser());
            transaction.setStrNUMEROCOMPTE(str_NUMERO_COMPTE);
            transaction.setIntAMOUNTREMIS(Double.valueOf(int_AMOUNT_REMIS).intValue());
            transaction.setIntAMOUNTRECU(Double.valueOf(int_AMOUNT_RECU).intValue());
            transaction.setLgTYPEREGLEMENTID(lg_TYPE_REGLEMENT_ID);
            transaction.setStrRESSOURCEREF(str_RESSOURCE_REF);
            transaction.setStrREFFACTURE(str_REF_FACTURE);
            transaction.setStrTASK(str_TASK);
            transaction.setStrTYPEVENTE(str_TYPE_VENTE);
            transaction.setLgREGLEMENTID(lg_REGLEMENT_ID);
            transaction.setStrTYPE(str_TYPE);
            transaction.setLgMOTIFREGLEMENTID(lg_MOTIF_REGLEMENT_ID);
            transaction.setStrREFCOMPTECLIENT(str_REF_COMPTE_CLIENT);
            transaction.setIntAMOUNTDEBIT(0);
            this.getOdataManager().getEm().persist(transaction);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private void updateInvoicePlafond(TFacture facture, long montant) {

        try {

            TTiersPayant OTTiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class,
                    facture.getStrCUSTOMER());
            boolean isAbsolute = OTTiersPayant.getBCANBEUSE();
            if (isAbsolute) {

                OTTiersPayant.setDbCONSOMMATIONMENSUELLE(OTTiersPayant.getDbCONSOMMATIONMENSUELLE() - (int) montant);
                if (OTTiersPayant.getDbCONSOMMATIONMENSUELLE() <= 0) {
                    OTTiersPayant.setBCANBEUSE(true);
                }
                this.getOdataManager().getEm().merge(OTTiersPayant);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private void updateCompteClientTierspayant(TPreenregistrementCompteClientTiersPayent payent, Integer montant) {
        TCompteClientTiersPayant OClientTiersPayant = payent.getLgCOMPTECLIENTTIERSPAYANTID();
        if (OClientTiersPayant.getBIsAbsolute()) {
            Integer conso = OClientTiersPayant.getDbCONSOMMATIONMENSUELLE() - montant;
            OClientTiersPayant.setDbCONSOMMATIONMENSUELLE(conso > 0 ? conso : 0);
            if (OClientTiersPayant.getDbCONSOMMATIONMENSUELLE() == 0) {
                OClientTiersPayant.setBCANBEUSE(true);
            }
            this.getOdataManager().getEm().merge(OClientTiersPayant);
        }

    }

    public JSONObject makeGroupInvoicePayment(String CODEFACTURE, Integer lg_GROUP_ID, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, String lg_MODE_REGLEMENT_ID, int int_TAUX,
            double int_AMOUNT, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, JSONArray selectedList,
            String str_FIRST_LAST_NAME, JSONArray uncheckedlist, Date dt_reglement, int mode) {
        JSONObject jsono = new JSONObject();
        if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
            this.buildErrorTraceMessage("Impossible de faire le règlement", "La caisse est fermée");
            try {
                jsono.put("status", 0).put("message", "Impossible de faire le règlement, La caisse est fermée");
            } catch (JSONException ex) {

            }
            return jsono;
        }
        TTypeMvtCaisse OTTypeMvtCaisse = this.getOdataManager().getEm().find(TTypeMvtCaisse.class, "3");
        GroupeTierspayantController controller = new GroupeTierspayantController(this.getOdataManager().getEmf());
        TModeReglement modeRe = this.getOdataManager().getEm().find(TModeReglement.class, lg_MODE_REGLEMENT_ID);
        try {
            List<TFacture> listFacture;
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            long totalAmount = 0;
            switch (mode) {
            case 0:
                listFacture = controller.getGroupeInvoiceDetails(true, "", "", CODEFACTURE, -1, -1);
                totalAmount = listFacture.stream().mapToLong((t) -> {
                    TGroupeFactures op = this.groupeFactures(t);
                    return ((op.getIntPAYE() > 0 ? op.getIntPAYE() : t.getDblMONTANTRESTANT().intValue()));
                }).sum();
                if (int_AMOUNT_RECU < totalAmount) {
                    listFacture.removeIf((t) -> {
                        return (t.getStrSTATUT().equals(commonparameter.statut_paid));
                    });

                    for (TFacture OFacture : listFacture) {
                        if (int_AMOUNT_RECU > 0) {
                            int_AMOUNT_RECU = makePartialInvoice(OFacture, OTTypeMvtCaisse, int_AMOUNT_RECU,
                                    dt_reglement, modeRe, str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE,
                                    int_TAUX, str_FIRST_LAST_NAME);
                        } else {
                            break;
                        }
                    }
                } else {
                    listFacture.forEach((tFacture) -> {
                        makeInvoice(tFacture, OTTypeMvtCaisse, tFacture.getDblMONTANTRESTANT(), dt_reglement, modeRe,
                                str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX, str_FIRST_LAST_NAME);
                    });
                }

                break;
            case 1:
                listFacture = controller.getGroupeInvoiceDetails(uncheckedlist, CODEFACTURE);
                totalAmount = listFacture.stream().mapToLong((t) -> {
                    TGroupeFactures op = this.groupeFactures(t);
                    return ((op.getIntPAYE() > 0 ? op.getIntPAYE() : t.getDblMONTANTRESTANT().intValue()));
                }).sum();
                if (int_AMOUNT < totalAmount) {
                    if (this.getOdataManager().getEm().getTransaction().isActive()) {
                        this.getOdataManager().getEm().getTransaction().rollback();
                        this.getOdataManager().getEm().clear();

                    }
                    this.buildErrorTraceMessage("Impossible de faire le règlement",
                            "Le montant saisi: <span style='font-size:1.5em;font-weight:800;'>" + int_AMOUNT
                                    + "</span> est différent du montant attendu : "
                                    + "<span style='font-size:1.5em;font-weight:800;'>" + totalAmount + "</span>");
                    try {
                        jsono.put("status", 0).put("message",
                                "Le montant saisi: <span style='font-size:1.5em;font-weight:800;'>" + int_AMOUNT
                                        + "</span> est différent du montant attendu : "
                                        + "<span style='font-size:1.5em;font-weight:800;'>" + totalAmount + "</span>");
                    } catch (JSONException ex) {

                    }
                    return jsono;
                }

                listFacture.forEach((tFacture) -> {
                    TGroupeFactures og = this.groupeFactures(tFacture);
                    makeInvoice(tFacture, OTTypeMvtCaisse,
                            (og.getIntPAYE() > 0 ? og.getIntPAYE() : tFacture.getDblMONTANTRESTANT()), dt_reglement,
                            modeRe, str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX,
                            str_FIRST_LAST_NAME);
                });

                break;

            case 2:
                TFacture tFacture = null;
                for (int i = 0; i < selectedList.length(); i++) {
                    JSONObject json = selectedList.getJSONObject(i);
                    tFacture = this.getOdataManager().getEm().find(TFacture.class, json.getString("lg_FACTURE_ID"));
                    double amount = Double.valueOf(json.get("montant").toString());
                    makeInvoice(tFacture, OTTypeMvtCaisse, amount, dt_reglement, modeRe, str_BANQUE, str_LIEU,
                            str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX, str_FIRST_LAST_NAME);
                }

                break;
            case 3:
                listFacture = controller.getGroupeInvoiceDetails(CODEFACTURE);
                for (TFacture OFacture : listFacture) {
                    if (int_AMOUNT_RECU > 0) {
                        int_AMOUNT_RECU = makePartialInvoice(OFacture, OTTypeMvtCaisse, int_AMOUNT_RECU, dt_reglement,
                                modeRe, str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX,
                                str_FIRST_LAST_NAME);
                    } else {
                        break;
                    }

                }

                break;

            }
            // groupeReglement = this.createDossiersReglement(facture, int_AMOUNT, "bordereau", dt_reglement,
            // montantattendu);
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                try {
                    this.getOdataManager().getEm().getTransaction().commit();
                    this.getOdataManager().getEm().clear();

                    this.setDetailmessage("1");
                    jsono.put("status", 1).put("message", "Réglemenent effectué");
                } catch (Exception e) {
                    jsono.put("status", 0).put("message", "Echec de reglement");
                    e.printStackTrace();
                }

            }

        } catch (Exception e) {
            try {
                // this.buildErrorTraceMessage("Echec de reglement ");
                jsono.put("status", 0).put("message", "Echec de reglement");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {

                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                e.printStackTrace();
            } catch (JSONException ex) {
                Logger.getLogger(reglementManager.class.getName()).log(Level.SEVERE, null, ex);
            }
        }
        return jsono;
    }

    private void makeInvoice(TFacture facture, TTypeMvtCaisse OTTypeMvtCaisse, Double int_AMOUNT, Date dt_reglement,
            TModeReglement lg_MODE_REGLEMENT_ID, String str_BANQUE, String str_LIEU, String str_CODE_MONNAIE,
            String str_COMMENTAIRE, int int_TAUX, String str_FIRST_LAST_NAME) {

        TReglement OTReglement;
        TDossierReglement dossierReglement;

        double montantattendu;
        List<TFactureDetail> lstTFactureDetail;

        TCompteClient OTCompteClient;
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {

            montantattendu = facture.getDblMONTANTRESTANT();
            OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1")
                    .setParameter(1, facture.getStrCUSTOMER()).getSingleResult();

            // str_FIRST_LAST_NAME non du propriétaire de la carte bancaire ou du cheques
            dossierReglement = this.createDossiersReglement(facture, int_AMOUNT, "bordereau", dt_reglement,
                    montantattendu);
            OTReglement = this.CreateTReglement(OTCompteClient.getLgCOMPTECLIENTID(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(), str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE,
                    lg_MODE_REGLEMENT_ID, int_TAUX, int_AMOUNT, str_FIRST_LAST_NAME, dt_reglement, true);
            OTReglement.setBISFACTURE(true);

            this.getOdataManager().getEm().persist(OTReglement);

            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent;

            lstTFactureDetail = this.getDetailsFactureByTiersPayant(facture.getLgFACTUREID());

            for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                        .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                Double detailAmount = tFactureDetail.getDblMONTANTRESTANT();

                OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID(); // code
                                                                                                                         // ajotué
                                                                                                                         // 18/08/2016

                tFactureDetail
                        .setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + tFactureDetail.getDblMONTANTRESTANT());
                tFactureDetail.setDblMONTANTRESTANT(0d);
                tFactureDetail.setDtUPDATED(new Date());
                tFactureDetail.setStrSTATUT(commonparameter.PAID);
                OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);
                // OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE()
                // - detailAmount.intValue());
                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);

                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
                OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                this.getOdataManager().getEm().merge(tFactureDetail);

                this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent, detailAmount.intValue());
                this.createReglementDetail(tFactureDetail, dossierReglement, detailAmount);

            }

            facture.setDblMONTANTPAYE(facture.getDblMONTANTPAYE() + int_AMOUNT);
            if ((facture.getDblMONTANTCMDE() - facture.getDblMONTANTPAYE()) == 0) {
                facture.setDblMONTANTRESTANT(0.0);
                facture.setStrSTATUT(commonparameter.PAID);
            } else {
                facture.setDblMONTANTRESTANT(facture.getDblMONTANTCMDE() - facture.getDblMONTANTPAYE());
                facture.setStrSTATUT(commonparameter.statut_is_Process);
            }

            updateInvoicePlafond(facture,
                    ((facture.getDblMONTANTCMDE().intValue() - facture.getDblMONTANTPAYE().intValue())
                            + facture.getDblMONTANTPAYE().intValue()));
            facture.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(facture);
            TGroupeFactures og = this.groupeFactures(facture);
            og.setIntPAYE(facture.getDblMONTANTPAYE().intValue());
            og.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(og);
            TMvtCaisse caisse = this.AddTMvtCaisse(OTTypeMvtCaisse, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(),
                    OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID(), dossierReglement.getDblAMOUNT(),
                    str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX, dossierReglement.getDtCREATED(),
                    true, str_FIRST_LAST_NAME, this.getOTUser().getLgUSERID(),
                    OTTypeMvtCaisse.getStrDESCRIPTION() + " de la facture " + facture.getStrCODEFACTURE(), 0,
                    int_AMOUNT.intValue(), true, new Date(), OTReglement.getLgMODEREGLEMENTID(), OTReglement);

            String Description = "Reglement de facture  " + dossierReglement.getDblAMOUNT() + " Type de mouvement "
                    + OTTypeMvtCaisse.getStrDESCRIPTION() + " PAR " + this.getOTUser().getStrFIRSTNAME() + " "
                    + this.getOTUser().getStrLASTNAME();
            addTransaction(this.getOTUser(), this.getOTUser(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                    dossierReglement.getDblAMOUNT().intValue(), 0, dossierReglement.getDblAMOUNT().intValue(),
                    dossierReglement.getDblAMOUNT().intValue(), Boolean.TRUE, CategoryTransaction.CREDIT,
                    TypeTransaction.ENTREE, OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID(), OTTypeMvtCaisse,
                    this.getOdataManager().getEm(), dossierReglement.getDblAMOUNT().intValue(), 0,
                    caisse.getStrREFTICKET(),
                    (facture.getTiersPayant() != null ? facture.getTiersPayant().getLgTIERSPAYANTID() : null));
            updateItem(this.getOTUser(), caisse.getLgMVTCAISSEID(), Description, TypeLog.MVT_DE_CAISSE, caisse,
                    this.getOdataManager().getEm());
            this.updateSnapshotVenteSociete(dossierReglement.getLgDOSSIERREGLEMENTID(), facture.getLgFACTUREID());
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public TGroupeFactures groupeFactures(TFacture facture) {
        TGroupeFactures factures = null;
        try {
            factures = (TGroupeFactures) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM  TGroupeFactures o WHERE o.lgFACTURESID.lgFACTUREID =?1")
                    .setParameter(1, facture.getLgFACTUREID()).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return factures;
    }

    public List<TFactureDetail> getInvoiceDetailsByTiersPayant(String str_CUSTOMER) {
        List<TFactureDetail> factureDetails = new ArrayList<>();
        try {
            // paid
            factureDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFactureDetail o WHERE o.lgFACTUREID.lgFACTUREID LIKE ?1 AND o.strSTATUT <>?2 AND o.strSTATUT <>?3  ORDER BY o.dtCREATED ASC")
                    .setParameter(1, str_CUSTOMER).setParameter(2, commonparameter.statut_delete)
                    .setParameter(3, commonparameter.statut_paid).getResultList();
            for (TFactureDetail OTFactureDetail : factureDetails) {
                this.refresh(OTFactureDetail);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return factureDetails;
    }
    // fonction pour regler les facture groupee partial, sans selectionner des factures

    private double makePartialInvoice(TFacture facture, TTypeMvtCaisse OTTypeMvtCaisse, Double int_AMOUNT,
            Date dt_reglement, TModeReglement lg_MODE_REGLEMENT_ID, String str_BANQUE, String str_LIEU,
            String str_CODE_MONNAIE, String str_COMMENTAIRE, int int_TAUX, String str_FIRST_LAST_NAME) {

        TReglement OTReglement;
        TDossierReglement dossierReglement;
        double montantattendu;
        List<TFactureDetail> lstTFactureDetail;

        TCompteClient OTCompteClient;
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {

            montantattendu = facture.getDblMONTANTRESTANT();
            Double _amount = montantattendu;
            if (int_AMOUNT > montantattendu) {
                int_AMOUNT -= montantattendu;
            } else if (int_AMOUNT == montantattendu) {
                int_AMOUNT = 0.0;
            } else {
                _amount = int_AMOUNT;
                int_AMOUNT = 0.0;
            }

            OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1")
                    .setParameter(1, facture.getStrCUSTOMER()).getSingleResult();

            // str_FIRST_LAST_NAME non du propriétaire de la carte bancaire ou du cheques
            System.out.println("_amount ***************** " + _amount);
            dossierReglement = this.createDossiersReglement(facture, _amount, "bordereau", dt_reglement,
                    montantattendu);
            OTReglement = this.CreateTReglement(OTCompteClient.getLgCOMPTECLIENTID(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(), str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE,
                    lg_MODE_REGLEMENT_ID, int_TAUX, _amount, str_FIRST_LAST_NAME, dt_reglement, true);
            OTReglement.setBISFACTURE(true);

            this.getOdataManager().getEm().persist(OTReglement);

            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent;

            lstTFactureDetail = this.getInvoiceDetailsByTiersPayant(facture.getLgFACTUREID());
            double detailsAmounts = _amount;
            for (TFactureDetail tFactureDetail : lstTFactureDetail) {
                if (detailsAmounts > 0) {
                    OTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm()
                            .find(TPreenregistrementCompteClientTiersPayent.class, tFactureDetail.getStrREF());
                    Double detailAmount = tFactureDetail.getDblMONTANTRESTANT();
                    OTCompteClientTiersPayant = OTPreenregistrementCompteClientTiersPayent
                            .getLgCOMPTECLIENTTIERSPAYANTID(); // code ajotué 18/08/2016

                    if (detailsAmounts >= detailAmount) {
                        detailsAmounts -= detailAmount;

                        tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                        tFactureDetail.setDblMONTANTRESTANT(0d);
                        tFactureDetail.setDtUPDATED(new Date());
                        tFactureDetail.setStrSTATUT(commonparameter.PAID);
                        OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.PAID);
                    } else if (detailsAmounts < detailAmount) {
                        detailAmount = detailsAmounts;
                        tFactureDetail.setDblMONTANTPAYE(tFactureDetail.getDblMONTANTPAYE() + detailAmount);
                        tFactureDetail.setDblMONTANTRESTANT(tFactureDetail.getDblMONTANTRESTANT() - detailAmount);
                        tFactureDetail.setDtUPDATED(new Date());
                        detailsAmounts = 0;
                    }
                    // OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE()
                    // - detailAmount.intValue());
                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);

                    OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(
                            OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE() - detailAmount.intValue());
                    OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());

                    this.getOdataManager().getEm().merge(tFactureDetail);

                    this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
                    // updateCompteClientTierspayant(OTPreenregistrementCompteClientTiersPayent,
                    // detailAmount.intValue());
                    this.createReglementDetail(tFactureDetail, dossierReglement, detailAmount);
                }

            }

            facture.setDblMONTANTPAYE(facture.getDblMONTANTPAYE() + _amount);
            if ((facture.getDblMONTANTCMDE() - facture.getDblMONTANTPAYE()) == 0) {
                facture.setDblMONTANTRESTANT(0.0);
                facture.setStrSTATUT(commonparameter.PAID);
            } else {
                facture.setDblMONTANTRESTANT(facture.getDblMONTANTCMDE() - facture.getDblMONTANTPAYE());
                facture.setStrSTATUT(commonparameter.statut_is_Process);
            }

            updateInvoicePlafond(facture,
                    ((facture.getDblMONTANTCMDE().intValue() - facture.getDblMONTANTPAYE().intValue())
                            + facture.getDblMONTANTPAYE().intValue()));
            facture.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(facture);
            TGroupeFactures og = this.groupeFactures(facture);
            og.setIntPAYE(facture.getDblMONTANTPAYE().intValue() + _amount.intValue());
            og.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(og);
            TMvtCaisse caisse = this.AddTMvtCaisse(OTTypeMvtCaisse, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(),
                    OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID(), dossierReglement.getDblAMOUNT(),
                    str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE, int_TAUX, dossierReglement.getDtCREATED(),
                    true, str_FIRST_LAST_NAME, this.getOTUser().getLgUSERID(),
                    OTTypeMvtCaisse.getStrDESCRIPTION() + " de la facture " + facture.getStrCODEFACTURE(), 0,
                    _amount.intValue(), true, new Date(), OTReglement.getLgMODEREGLEMENTID(), OTReglement);
            String Description = "Reglement de facture  " + dossierReglement.getDblAMOUNT() + " Type de mouvement "
                    + OTTypeMvtCaisse.getStrDESCRIPTION() + " PAR " + this.getOTUser().getStrFIRSTNAME() + " "
                    + this.getOTUser().getStrLASTNAME();
            addTransaction(this.getOTUser(), this.getOTUser(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                    dossierReglement.getDblAMOUNT().intValue(), 0, dossierReglement.getDblAMOUNT().intValue(),
                    dossierReglement.getDblAMOUNT().intValue(), Boolean.TRUE, CategoryTransaction.CREDIT,
                    TypeTransaction.ENTREE, OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID(), OTTypeMvtCaisse,
                    this.getOdataManager().getEm(), dossierReglement.getDblAMOUNT().intValue(), 0,
                    caisse.getStrREFTICKET(),
                    (facture.getTiersPayant() != null ? facture.getTiersPayant().getLgTIERSPAYANTID() : null));
            updateItem(this.getOTUser(), caisse.getLgMVTCAISSEID(), Description, TypeLog.MVT_DE_CAISSE, caisse,
                    this.getOdataManager().getEm());
            this.updateSnapshotVenteSociete(dossierReglement.getLgDOSSIERREGLEMENTID(), facture.getLgFACTUREID());

        } catch (Exception e) {
            e.printStackTrace();
        }
        return int_AMOUNT;
    }

    public void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T, EntityManager em) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(new Date());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(commonparameter.statut_enable);
        eventLog.setStrTABLECONCERN(T.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrTYPELOG(ref);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        em.persist(eventLog);
    }

    public void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(new Date());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(commonparameter.statut_enable);
        eventLog.setStrTABLECONCERN(T.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrTYPELOG(ref);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        this.persiste(eventLog);
    }

    public void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, String reference, String organisme) {
        MvtTransaction transac = new MvtTransaction();
        int compare = montantNet.compareTo(montantVerse);
        Integer montantPaid, montantRestant = 0;
        if (compare <= 0) {
            montantPaid = montantNet;
        } else {
            montantPaid = montantNet - montantVerse;
            montantRestant = montantNet - montantVerse;
        }

        transac.setUuid(UUID.randomUUID().toString());
        transac.setUser(ooTUser);
        transac.setCreatedAt(LocalDateTime.now());
        transac.setPkey(pkey);
        transac.setMvtDate(LocalDate.now());
        transac.setAvoidAmount(voidAmount);
        transac.setMontant(montant);
        transac.setMagasin(ooTUser.getLgEMPLACEMENTID());
        transac.setCaisse(ooTUser);
        transac.setMontantCredit(0);
        transac.setReference(reference);
        transac.setMontantVerse(montantVerse);
        transac.setMontantRegle(montantPaid);
        transac.setMontantNet(montantNet);
        transac.settTypeMvtCaisse(tTypeMvtCaisse);
        transac.setReglement(reglement);
        transac.setMontantRestant(montantRestant);
        transac.setMontantPaye(montantPaye);
        transac.setMontantRemise(montant - montantNet);
        transac.setCategoryTransaction(categoryTransaction);
        transac.setTypeTransaction(typeTransaction);
        transac.setChecked(checked);
        transac.setMontantTva(montantTva);
        emg.persist(transac);

    }

    public void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse,
            Integer montantPaye, Integer montantTva, String reference, String organisme) {
        MvtTransaction _new = new MvtTransaction();
        int compare = montantNet.compareTo(montantVerse);
        Integer montantPaid, montantRestant = 0;
        if (compare <= 0) {
            montantPaid = montantNet;
        } else {
            montantPaid = montantVerse;
            montantRestant = montantNet - montantVerse;
        }

        _new.setUuid(UUID.randomUUID().toString());
        _new.setUser(ooTUser);
        _new.setCreatedAt(LocalDateTime.now());
        _new.setPkey(pkey);
        _new.setMvtDate(LocalDate.now());
        _new.setAvoidAmount(voidAmount);
        _new.setMontant(montant);
        _new.setMagasin(ooTUser.getLgEMPLACEMENTID());
        _new.setCaisse(ooTUser);
        _new.setMontantCredit(0);
        _new.setReference(reference);
        _new.setMontantVerse(montantVerse);
        _new.setMontantRegle(montantPaid);
        _new.setMontantNet(montantNet);
        _new.settTypeMvtCaisse(tTypeMvtCaisse);
        _new.setReglement(reglement);
        _new.setMontantRestant(montantRestant);
        _new.setMontantPaye(montantPaye);
        _new.setMontantRemise(montant - montantNet);
        _new.setCategoryTransaction(categoryTransaction);
        _new.setTypeTransaction(typeTransaction);
        _new.setChecked(checked);
        _new.setMontantTva(montantTva);
        _new.setOrganisme(organisme);
        this.persiste(_new);

    }

}
