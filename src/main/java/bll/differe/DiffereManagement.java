/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* comment  */
package bll.differe;

import bll.common.Parameter;
import bll.preenregistrement.Preenregistrement;
import bll.teller.caisseManagement;
import bll.teller.clientManager;
import bll.tierspayantManagement.tierspayantManagement;
import bll.utils.TparameterManager;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TDci;
import dal.TFamille;
import dal.TFamilleDci;
import dal.TFamilleStock;
import dal.TMotifReglement;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TRecettes;
import dal.TReglement;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TTypeVente;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.sql.CallableStatement;
import java.sql.ResultSetMetaData;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.persistence.ParameterMode;
import javax.persistence.StoredProcedureQuery;
import multilangue.Translate;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.StringUtils;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class DiffereManagement extends bll.bllBase {

    public DiffereManagement(dataManager OdataManager, TUser OTuser) {
        super.setOTUser(OTuser);
        super.setOdataManager(OdataManager);
        OTranslate = new Translate();
        if (OdataManager != null) {
            super.checkDatamanager();
        }

    }

    public String func_BuildTransactionDesc(String str_task, String str_beneficicaire_id) {
        String str_Description = "";
        TCompteClient OTCompteClient = null;
        TTiersPayant OTTiersPayant = null;
        if (str_task.equals(bll.common.Parameter.KEY_TASK_VENTE)) {
            try {

                OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                        .createQuery(
                                "SELECT t FROM TCompteClient t WHERE t.lgCOMPTECLIENTID = ?1  AND t.strSTATUT = ?2 ")
                        .setParameter(1, str_beneficicaire_id).setParameter(2, commonparameter.statut_enable)
                        .getSingleResult();

                new logger().OCategory.info(" *** Client bien trouve depuis differemangement   *** "
                        + OTCompteClient.getLgCLIENTID().getStrFIRSTNAME());
                str_Description = "REGLEMENT DIFFERE(S) DU  CLIENT  " + OTCompteClient.getLgCLIENTID().getStrFIRSTNAME()
                        + "   " + OTCompteClient.getLgCLIENTID().getStrLASTNAME();
                return str_Description;

            } catch (Exception e) {

                new logger().OCategory
                        .info(" ***  Desole pas de OTCompteClient correspondant au client*** " + e.toString());
            }
        } else {
            try {

                OTTiersPayant = (TTiersPayant) this.getOdataManager().getEm()
                        .createQuery(
                                "SELECT t FROM TTiersPayant t WHERE t.lgTIERSPAYANTID  = ?1  AND t.strSTATUT = ?2 ")
                        .setParameter(1, str_beneficicaire_id).setParameter(2, commonparameter.statut_enable)
                        .getSingleResult();

                new logger().OCategory.info(" *** Tiers Payant bien trouve depuis differemangement   *** "
                        + OTTiersPayant.getStrFULLNAME());
                str_Description = "REGLEMENT DIFFERE(S) DU  CLIENT TIERS PAYANT  " + OTTiersPayant.getStrFULLNAME();
                return str_Description;

            } catch (Exception e) {
                new logger().OCategory
                        .info(" ***  Desole pas de Tiers Payant correspondant au client*** " + e.toString());

            }

            return str_Description;

        }
        return str_Description;
    }

    public String func_GetBeneficiaireMotifReglement(String str_task) {
        String str_motif = "";
        TMotifReglement OTMotifReglement = null;

        if (str_task.equals(bll.common.Parameter.KEY_TASK_VENTE)) {
            OTMotifReglement = this.getOdataManager().getEm().find(dal.TMotifReglement.class, "1");

        } else {
            OTMotifReglement = this.getOdataManager().getEm().find(dal.TMotifReglement.class, "2");
        }
        str_motif = OTMotifReglement.getLgMOTIFREGLEMENTID();

        return str_motif;
    }

    public List<TClient> func_GetClient(String Osearch_value) {
        TClient OTClient = null;
        List<TClient> lstTClient = new ArrayList<>();

        lstTClient = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TClient t WHERE  t.lgCLIENTID LIKE ?1 OR t.strCODEINTERNE LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 ")
                .setParameter(1, '%' + Osearch_value + '%').getResultList();

        new logger().OCategory.info("  +++  lstTClient func_GetClient  +++   " + lstTClient.size());
        if (lstTClient.isEmpty()) {
            new logger().OCategory.info("  +++  Desole ce client nexiste pas +++   " + lstTClient.size());
            this.buildErrorTraceMessage("Desole ce client nexiste pas");
            return lstTClient;
        }

        return lstTClient;
    }

    public List<TCompteClient> func_GetCompteClient(String str_Ref) {
        TCompteClient OTCompteClient = null;
        List<TCompteClient> lstTCompteClientTemp = new ArrayList<>();
        List<TCompteClient> lstTCompteClient = new ArrayList<>();
        List<TClient> lstTClient = this.func_GetClient(str_Ref);

        if (lstTClient == null) {
            this.buildErrorTraceMessage("Desole ce client nexiste pas");
            return null;

        }

        if (lstTClient.isEmpty()) {
            this.buildErrorTraceMessage("Desole ce client nexiste pas");
            return null;

        }
        new logger().OCategory.info("lstTClient size   " + lstTClient.size());
        for (int i = 0; i < lstTClient.size(); i++) {
            TClient OTClient = lstTClient.get(i);
            lstTCompteClientTemp = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClient t WHERE  t.lgCLIENTID.lgCLIENTID  = ?1  AND t.strSTATUT LIKE ?2")
                    .setParameter(1, OTClient.getLgCLIENTID()).setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            lstTCompteClient.addAll(lstTCompteClientTemp);

        }

        if (lstTCompteClient == null) {
            new logger().OCategory.info("  +++  Desole Liste lstTCompteClient is null +++   ");
            this.buildErrorTraceMessage("Desole ce compte client nexiste pas");
            return lstTCompteClient;
        }

        if (lstTCompteClient.isEmpty()) {
            new logger().OCategory.info("  +++  Desole lstTCompteClient is empty +++   ");
            this.buildErrorTraceMessage("Desole ce compte client nexiste pas");
            return lstTCompteClient;
        }

        return lstTCompteClient;
    }

    public List<TCompteClientTiersPayant> func_GetCustomerTiersPayants(String str_Ref) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayantTemp = new ArrayList<>();
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
        List<TCompteClient> lstTCompteClient = new ArrayList<>();
        TCompteClient OTCompteClient = null;
        //
        lstTCompteClient = this.func_GetCompteClient(str_Ref);

        if (lstTCompteClient == null) {
            this.buildErrorTraceMessage("Desole ce compte client nexiste pas");
            return null;
        }

        if (lstTCompteClient.isEmpty()) {
            this.buildErrorTraceMessage("Desole ce compte client nexiste pas");
            return null;
        }

        new logger().OCategory.info(" lstTCompteClient  func_GetCompteClient " + lstTCompteClient.size());
        for (int i = 0; i < lstTCompteClient.size(); i++) {
            OTCompteClient = lstTCompteClient.get(i);
            lstTCompteClientTiersPayantTemp = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?1  AND t.strSTATUT LIKE ?2")
                    .setParameter(1, OTCompteClient.getLgCOMPTECLIENTID())
                    .setParameter(2, commonparameter.statut_enable).getResultList();
            lstTCompteClientTiersPayant.addAll(lstTCompteClientTiersPayantTemp);
        }
        if (lstTCompteClientTiersPayant == null) {
            new logger().OCategory.info(
                    "  +++  Desole pas de tiers payant pour ce client+++   " + lstTCompteClientTiersPayant.size());
            this.buildErrorTraceMessage("Desole pas de tiers payant pour ce client");
            return lstTCompteClientTiersPayant;
        }
        if (lstTCompteClientTiersPayant.isEmpty()) {
            new logger().OCategory.info(
                    "  +++  Desole pas de tiers payant pour ce client+++   " + lstTCompteClientTiersPayant.size());
            this.buildErrorTraceMessage("Desole pas de tiers payant pour ce client");
            return lstTCompteClientTiersPayant;
        }

        new logger().OCategory.info("  +++  lstTTiersPayant +++   " + lstTCompteClientTiersPayant.size());

        return lstTCompteClientTiersPayant;
    }

    public List<TCompteClientTiersPayant> func_GetCustomerRo(TCompteClient OTCompteClient) {

        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();

        lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TCompteClientTiersPayant t WHERE  t.lgCOMPTECLIENTID.lgCOMPTECLIENTID  = ?1 ORDER BY t.intPRIORITY ASC ")
                .setParameter(1, OTCompteClient.getLgCOMPTECLIENTID()).getResultList();

        new logger().OCategory
                .info("  +++  lstTCompteClientTiersPayant func_GetClient  +++   " + lstTCompteClientTiersPayant.size());
        if (lstTCompteClientTiersPayant.isEmpty()) {
            new logger().OCategory.info("  +++  Desole ce client na pas de tiers payant qui lui sont associes +++   "
                    + lstTCompteClientTiersPayant.size());
            this.buildErrorTraceMessage("Desole ce client na pas de tiers payant qui lui sont associes");
            return lstTCompteClientTiersPayant;
        }

        return lstTCompteClientTiersPayant;
    }

    public String func_GetCustomerWorkflow(TTiersPayant OTTiersPayant) {
        String str_tierspayant_process = "";

        if (OTTiersPayant.getBoolIsACCOUNT() == true) {
            this.buildErrorTraceMessage(" vous etes un client post paye");
            str_tierspayant_process = "postpaye";
            return str_tierspayant_process;
        } else {
            str_tierspayant_process = "prepaye";
            return str_tierspayant_process;
        }

    }

    public int GetVenteTotal(String lgPREENREGISTREMENTID) {
        int Total_vente = 0;
        List<TPreenregistrementDetail> lstT = new Preenregistrement(this.getOdataManager(), this.getOTUser())
                .getTPreenregistrementDetail(lgPREENREGISTREMENTID);
        for (int i = 0; i < lstT.size(); i++) {

            Total_vente = lstT.get(i).getIntPRICE() + Total_vente;
        }
        new logger().OCategory.info(" @@@@@@@@  Le total de la vente est de  @@@@@@@@   " + Total_vente);
        return Total_vente;
    }

    public double func_GetCustomerSolde(String str_ref_compte_client) {
        double dbl_solde_cust = 0.0;

        TCompteClient OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TCompteClient t WHERE  t.lgCOMPTECLIENTID  = ?1  AND t.strSTATUT LIKE ?2")
                .setParameter(1, str_ref_compte_client).setParameter(2, commonparameter.statut_enable)
                .getSingleResult();

        if (OTCompteClient == null) {
            this.buildErrorTraceMessage(" Desole ce compte client est inexistant ");
            return dbl_solde_cust;
        }

        if (OTCompteClient.getDecBalance() == null) {
            this.buildErrorTraceMessage(" Desole vous navez pas de solde ");
            return dbl_solde_cust;
        }
        dbl_solde_cust = OTCompteClient.getDecBalance();
        return dbl_solde_cust;
    }

    public boolean func_CheckIfCustIsSolvable(String str_ref) {
        boolean result = false;
        double cust_solde = this.func_GetCustomerSolde(str_ref);
        if (cust_solde > 0) {
            result = true;
            return result;

        } else {
            this.buildErrorTraceMessage("Desole votre solde est atteint");
            return result;
        }
    }

    public boolean CloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, String listeCompteclientTierspayant, TReglement OTReglement,
            String lg_COMPTE_CLIENT_ID, String str_FIRST_NAME_FACTURE, String str_LAST_NAME_FACTURE,
            String int_NUMBER_FACTURE, String str_NUMERO_SECURITE_SOCIAL, String lg_USER_VENDEUR_ID,
            boolean b_WITHOUT_BON, int int_TAUX) throws JSONException {

        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());

        int int_total_remise_convert = 0;
        Double dbl_Amount = 0.0, dbl_PART_TIERSPAYANT = 0.0;
        boolean result = false;
        TParameters OTParameters = null;
        TCompteClient OTCompteClient = null;
        TPreenregistrement OTPreenregistrement = null;
        try {

            String[] tabString = StringUtils.split(listeCompteclientTierspayant,
                    commonparameter.SEPARATEUR_POINT_VIRGULE);
            OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);
            OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente", "Ref commande inconnue");
                return false;
            }

            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                                        // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage("Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                return false;
            }

            OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);
            if (OTCompteClient == null) {
                this.buildErrorTraceMessage("Impossible de terminer la vente. Client inexistant");
                return false;
            }

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && b_WITHOUT_BON) { // si valeur 0, on passe en cloture
                                                                                     // manuelle
                this.buildErrorTraceMessage(
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
                return false;
            }

            dbl_Amount = OTPreenregistrement.getIntPRICE().doubleValue();
            int_total_remise_convert = OTPreenregistrement.getIntPRICEREMISE();
            if (OTTypeVente.getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_AVEC_CARNET)) {
                dbl_Amount = dbl_Amount - int_total_remise_convert;
            }

            // enregistrer le cash
            dbl_PART_TIERSPAYANT = this.createTPreenregistrementCompteClientTierspayant(tabString, OTPreenregistrement,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, dbl_Amount, b_WITHOUT_BON);
            if (this.getMessage().equals(commonparameter.PROCESS_FAILED)) {// code ajouté 26/10/2016
                return false;
            }

            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            result = OPreenregistrement.CloturerVente(OTPreenregistrement, OTTypeVente, b_WITHOUT_BON,
                    lg_TYPE_REGLEMENT_ID, OTReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS,
                    dbl_PART_TIERSPAYANT.intValue(), OTCompteClient, lg_USER_VENDEUR_ID, int_TAUX);
            this.buildSuccesTraceMessage(OPreenregistrement.getDetailmessage());

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente à crédit. Veuillez réessayer svp!");
        }

        return result;
    }

    public int func_GetCustomerAmountPart(int int_amount_vente, int int_amount_tp_supported) {
        int int_result = 0;
        int int_reste = 0;
        int_reste = int_amount_vente - int_amount_tp_supported;
        if (int_reste <= 0) {
            return int_result;
        } else {
            int_result = int_reste;
            return int_result;
        }

    }

    public TPreenregistrement CreateVente(TPreenregistrement OTPreenregistrement, int Amount_vente) {
        TPreenregistrement OTPreenregistrementTemp = null;
        try {

            if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Process)
                    || OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Devis)) {

                OTPreenregistrementTemp = new TPreenregistrement();
                OTPreenregistrementTemp.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
                OTPreenregistrementTemp.setIntPRICE(Amount_vente);
                OTPreenregistrementTemp.setLgPARENTID(OTPreenregistrement.getLgPREENREGISTREMENTID());
                OTPreenregistrementTemp.setLgNATUREVENTEID(OTPreenregistrement.getLgNATUREVENTEID());
                OTPreenregistrementTemp.setLgTYPEVENTEID(OTPreenregistrement.getLgTYPEVENTEID());
                OTPreenregistrementTemp.setLgUSERID(OTPreenregistrement.getLgUSERID());
                OTPreenregistrementTemp.setDtCREATED(new Date());
                OTPreenregistrementTemp.setStrSTATUT(commonparameter.statut_is_Process);
                // this.persiste(OTPreenregistrementTemp); // a decommenter en cas de probleme
                this.getOdataManager().getEm().persist(OTPreenregistrementTemp);
                // return OTPreenregistrementTemp;
            }
        } catch (Exception e) {
            new logger().OCategory.info(" Desole creation de preenregistrement enfant impossible  " + e.toString());
            this.buildErrorTraceMessage("ERROR", "Desole creation de preenregistrement enfant impossible");
            // return OTPreenregistrementTemp;
        }
        return OTPreenregistrementTemp;
    }

    public TFamilleStock GetFamilleStock(String Lg_FAMILLE_ID) {
        TFamilleStock OTFamilleStock = null;
        try {

            OTFamilleStock = (TFamilleStock) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID =?1 ")
                    .setParameter(1, Lg_FAMILLE_ID).getSingleResult();
            return OTFamilleStock;
        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR GetFamilleStock ", e.toString());
            return null;
        }
    }

    public TFamilleStock GetStock_Famille(String Lg_FAMILLE_ID) {

        TFamilleStock OTFamilleStock = null;
        try {
            OTFamilleStock = this.GetFamilleStock(Lg_FAMILLE_ID);
        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", "Ce produit nexiste pas en stock " + e.toString());
        }
        return OTFamilleStock;
    }

    public List<TFamilleDci> Func_GetAllFamille_By_Dci(String search_value) {

        List<TFamilleDci> lstTFamilleDci = new ArrayList<TFamilleDci>();

        try {

            lstTFamilleDci = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleDci t WHERE ( t.lgDCIID.strNAME LIKE ?1 OR t.lgDCIID.strCODE LIKE ?1)   AND t.strSTATUT LIKE ?4")
                    .setParameter(1, search_value).setParameter(4, commonparameter.statut_enable).getResultList();
            // new logger().OCategory.info("lstTFamilleDci size " + lstTFamilleDci.size());

            if ((lstTFamilleDci == null) || lstTFamilleDci.isEmpty()) {
                this.buildErrorTraceMessage("WARNING", "Desole aucun poroduit ne correspond a votre recherche");
                return null;
            }

            for (TFamilleDci OTFamilleDci : lstTFamilleDci) {
                this.refresh(OTFamilleDci);
                // new logger().OCategory.info("OTFamilleDci " + OTFamilleDci.getLgFAMILLEID().getStrNAME());
            }

            this.buildSuccesTraceMessage("Produits Dci(s) Existant(s)   :: " + lstTFamilleDci);

        } catch (Exception e) {
            this.buildErrorTraceMessage("Desole aucun poroduit ne correspond a votre recherche ", e.getMessage());
        }
        return lstTFamilleDci;
    }

    public List<TFamilleDci> Func_GetAllFamille_By_DciJdbc(String search_value) {

        List<TFamilleDci> lstTFamilleDci = new ArrayList<TFamilleDci>();

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_famille_dci WHERE ( dci_str_NAME LIKE '" + search_value
                    + "' OR str_CODE LIKE '" + search_value + "')   AND str_STATUT LIKE '"
                    + commonparameter.statut_enable + "'  ";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));

                TDci oTDci = new TDci();
                oTDci.setLgDCIID(Ojconnexion.get_resultat().getString("lg_DCI_ID"));
                oTDci.setStrCODE(Ojconnexion.get_resultat().getString("str_CODE"));
                oTDci.setStrNAME(Ojconnexion.get_resultat().getString("dci_str_NAME"));

                TFamilleDci OTFamilleDci = new TFamilleDci();
                OTFamilleDci.setLgFAMILLEDCIID(Ojconnexion.get_resultat().getString("lg_FAMILLE_DCI_ID"));
                OTFamilleDci.setStrSTATUT(Ojconnexion.get_resultat().getString("str_STATUT"));

                OTFamilleDci.setLgDCIID(oTDci);
                OTFamilleDci.setLgFAMILLEID(OTFamille);

                lstTFamilleDci.add(OTFamilleDci);
            }
            Ojconnexion.CloseConnexion();

            if ((lstTFamilleDci == null) || lstTFamilleDci.isEmpty()) {
                this.buildErrorTraceMessage("WARNING", "Desole aucun poroduit ne correspond a votre recherche");
                return null;
            }

            this.buildSuccesTraceMessage("Produits Dci(s) Existant(s)   :: " + lstTFamilleDci.size());

        } catch (Exception ex) {
            this.buildErrorTraceMessage("Desole aucun poroduit ne correspond a votre recherche ", ex.getMessage());

        }
        return lstTFamilleDci;
    }

    /*
     * public boolean DoDevis(String lg_PREENREGISTREMENT_ID, String lg_TYPE_VENTE_ID, int int_TOTAL_VENTE_RECAP,
     * List<TCompteClientTiersPayant> lstTCompteClientTiersPayant, String str_REF_COMPTE_CLIENT, String str_ORDONNANCE)
     * throws JSONException { //a decommenter en cas de probleme. 19/05/2016
     *
     * TTypeVente OTTypeVente = (TTypeVente) this.find(lg_TYPE_VENTE_ID, new TTypeVente());
     * List<TPreenregistrementCompteClientTiersPayent> lstT = new
     * ArrayList<TPreenregistrementCompteClientTiersPayent>(); List<TPreenregistrementCompteClientTiersPayent> lstTemp =
     * new ArrayList<TPreenregistrementCompteClientTiersPayent>(); TPreenregistrementCompteClientTiersPayent
     * oTPreenregistrementCompteClientTiersPayent = null; TCompteClientTiersPayant OTCompteClientTiersPayant = null; int
     * int_price = 0; int Amount_to_check = 0; int Amount_final = 0; int int_final_price = 0; int Amount_tampon = 0; int
     * dbl_Amount = this.GetVenteTotal(lg_PREENREGISTREMENT_ID);
     *
     * TPreenregistrement OTPreenregistrement = this.getOdataManager().getEm().find(dal.TPreenregistrement.class,
     * lg_PREENREGISTREMENT_ID);
     *
     * if (OTPreenregistrement == null) { this.buildErrorTraceMessage("ERROR", "Desole Ce Devis nexiste pas"); return
     * false; }
     *
     * List<TPreenregistrementDetail> lstTTPreenregistrementDetail = this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TPreenregistrementDetail t WHERE  t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 "
     * ). setParameter(4, OTPreenregistrement.getLgPREENREGISTREMENTID()). getResultList();
     *
     * new logger().OCategory.info("   details_length  " + lstTTPreenregistrementDetail.size());
     *
     * if (lstTTPreenregistrementDetail == null || lstTTPreenregistrementDetail.isEmpty()) {
     * this.buildErrorTraceMessage("Erreur", "Pas de details pour ce devis"); return false;
     *
     * }
     *
     * for (int k = 0; k < lstTTPreenregistrementDetail.size(); k++) { TPreenregistrementDetail
     * OTPreenregistrementDetail = lstTTPreenregistrementDetail.get(k);
     * OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
     * OTPreenregistrementDetail.setDtUPDATED(new Date()); this.persiste(OTPreenregistrementDetail);
     *
     * } new logger().OCategory.info("int_TOTAL_VENTE_RECAP avt update  " + int_TOTAL_VENTE_RECAP);
     * OTPreenregistrement.setIntPRICE(int_TOTAL_VENTE_RECAP); OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
     * OTPreenregistrement.setStrINFOSCLT(str_REF_COMPTE_CLIENT);
     * OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Devis); OTPreenregistrement.setDtUPDATED(new Date());
     * OTPreenregistrement.setStrORDONNANCE(str_ORDONNANCE); //Allou 27/04/2016 boolean trouve=true; do {
     * OTPreenregistrement.setStrREF(new Preenregistrement(this.getOdataManager(),
     * this.getOTUser()).buildVenteRef(OTPreenregistrement.getDtUPDATED(), Parameter.KEY_LAST_ORDER_NUMBER_DEVIS)); //
     * TPreenregistrement AnotherPreenregistrement = (TPreenregistrement)
     * this.getOdataManager().getEm().find(dal.TPreenregistrement.class,OTPreenregistrement. ); } while(trouve);
     * OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10)); if (lstTCompteClientTiersPayant.size() > 0) {
     * try { OTPreenregistrement.setStrFIRSTNAMECUSTOMER(lstTCompteClientTiersPayant.get(0).getLgCOMPTECLIENTID().
     * getLgCLIENTID().getStrFIRSTNAME());
     * OTPreenregistrement.setStrLASTNAMECUSTOMER(lstTCompteClientTiersPayant.get(0).getLgCOMPTECLIENTID().getLgCLIENTID
     * ().getStrLASTNAME());
     * OTPreenregistrement.setStrNUMEROSECURITESOCIAL(lstTCompteClientTiersPayant.get(0).getLgCOMPTECLIENTID().
     * getLgCLIENTID().getStrNUMEROSECURITESOCIAL());
     *
     * } catch (Exception e) { }
     *
     * } this.persiste(OTPreenregistrement);
     *
     * if (OTTypeVente.getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_ASSURANCE) ||
     * OTTypeVente.getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_AVEC_CARNET)) { if (lstTCompteClientTiersPayant
     * == null || lstTCompteClientTiersPayant.isEmpty()) { this.buildErrorTraceMessage("Erreur", "Pas de Tiers Payant");
     * return false;
     *
     * }
     *
     * for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) { OTCompteClientTiersPayant =
     * lstTCompteClientTiersPayant.get(k); lstTemp = this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = ?1  AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?3 "
     * ). setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID()) // .setParameter(2,
     * commonparameter.statut_is_Process) .setParameter(3, OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID())
     * // .setParameter(4, commonparameter.statut_is_Devis) .getResultList(); lstT.addAll(lstTemp);
     *
     * if (OTCompteClientTiersPayant == null) { this.buildErrorTraceMessage("Erreur",
     * "OTCompteClientTiersPayant is null"); return false; }
     *
     * } new logger().OCategory.info(" *** lstT  TPreenregistrementCompteClientTiersPayent  devis *** " + lstT.size());
     *
     * if (lstT == null || lstT.isEmpty()) { for (int k = lstTCompteClientTiersPayant.size(); --k >= 0;) { // for (int k
     * = 0; k < lstTCompteClientTiersPayant.size(); k++) { int_price = (dbl_Amount *
     * lstTCompteClientTiersPayant.get(k).getIntPOURCENTAGE()) / 100;
     *
     * Amount_final = dbl_Amount - Amount_to_check; new logger().OCategory.info(" ----    Amount_final    ----    " +
     * Amount_final);
     *
     * int_final_price = (dbl_Amount * lstTCompteClientTiersPayant.get(k).getIntPOURCENTAGE()) / 100; new
     * logger().OCategory.info(" ----    int_price    ----    " + int_price); if (int_final_price <= Amount_final) {
     * int_price = int_final_price; } else { int_price = Amount_final; } Amount_tampon = int_price + Amount_tampon;
     * Amount_to_check = Amount_tampon;
     *
     * oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
     * oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId(
     * ));
     *
     * oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
     * oTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(k));
     * oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
     *
     * new logger().OCategory.info(" *** Amount vente  *** " + int_price);
     * oTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_price);
     * oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
     * oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Devis); // update du solde du
     * tier payant this.persiste(oTPreenregistrementCompteClientTiersPayent); this.buildErrorTraceMessage("ERROR",
     * "Desole pas de preenregistrement compte client tiers payant"); // return true; }
     *
     * return true; }
     *
     * if (!lstT.isEmpty()) { // for (int j = 0; j < lstTCompteClientTiersPayant.size(); j++) { for (int q = 0; q <
     * lstT.size(); q++) { oTPreenregistrementCompteClientTiersPayent = lstT.get(q); // int_price = (dbl_Amount *
     * oTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getIntPOURCENTAGE()) / 100;
     * oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
     * oTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(lstT.get(q).
     * getLgCOMPTECLIENTTIERSPAYANTID());
     * oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
     *
     * new logger().OCategory.info(" *** Amount Devis  *** " + int_price); //
     * oTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_price);
     * oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
     * oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Devis); // update du solde du
     * tier payant this.persiste(oTPreenregistrementCompteClientTiersPayent);
     *
     * this.buildTraceMessage("Succes", " Devis cree avec succes"); //return true; } return true;
     *
     * } } else {
     *
     * } return false;
     *
     * }
     */
    public boolean CheckUserIds(TUser OTUser, int int_ids) {
        boolean result = true;
        if (OTUser.getStrIDS() != null) {
            if (OTUser.getStrIDS() < int_ids) {
                // this.buildErrorTraceMessage("ERREUR", "DESOLE VOUS NAVEZ PAS LE DROIT");
                this.buildErrorTraceMessage("DESOLE VOUS NAVEZ PAS LE DROIT");
                // this.buildTraceMessage("ERREUR", "DESOLE VOUS NAVEZ PAS LE DROIT");
                result = false;
                return result;
            } else {
                return result;
            }
        } else {
            result = false;
            // this.buildErrorTraceMessage("ERREUR", "DESOLE VOUS NAVEZ PAS LE DROIT");
            this.buildTraceMessage("ERREUR", "DESOLE VOUS NAVEZ PAS LE DROIT");
            return result;
        }

    }

    public void UpdateArticlePrice(TPreenregistrementDetail OTPreenregistrementDetail, int int_price) {

        int reste = OTPreenregistrementDetail.getIntPRICEUNITAIR() - int_price;
        int price = 0;
        // int_ids = this.GetIds(); // a decommenter en cas de prbleme
        if (reste == 0) {
        } else {
            price = OTPreenregistrementDetail.getLgFAMILLEID().getIntPRICE();
            OTPreenregistrementDetail.setIntPRICEUNITAIR(int_price);
            if (this.persiste(OTPreenregistrementDetail)) {
                new Preenregistrement(this.getOdataManager(), this.getOTUser()).checkpriceForSendSMS(
                        OTPreenregistrementDetail.getLgFAMILLEID(), price, int_price,
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrREF());
                this.buildSuccesTraceMessage("PRIX ARTICLE MODIFIE AVEC SUCCES");

            }
            /*
             * if (this.CheckUserIds(this.getOTUser(), int_ids)) { // a decommenter en cas de probleme
             *
             * OTPreenregistrementDetail.setIntPRICEUNITAIR(int_price); if (this.persiste(OTPreenregistrementDetail)) {
             * new Preenregistrement(this.getOdataManager(),
             * this.getOTUser()).checkpriceForSendSMS(OTPreenregistrementDetail.getLgFAMILLEID(), price, int_price,
             * OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrREF());
             * this.buildSuccesTraceMessage("PRIX ARTICLE MODIFIE AVEC SUCCES");
             *
             * } // this.buildTraceMessage("SUCCES", "PRIX ARTICLE MODIFIE AVEC SUCCES");
             *
             * }
             */
        }
    }

    public int GetIds() {
        int int_ids = 0;
        try {
            TParameters OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(commonparameter.PARAMETER_INDICE_SECURITY);
            if (OTParameters.getStrVALUE() != null) {
                int_ids = Integer.parseInt(OTParameters.getStrVALUE());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return int_ids;//  new logger().OCategory.info("Valeur IDS "+Integer.parseInt(OTParameters.getStrVALUE()));
    }

    public Integer getNbrVenteLimite() {
        TParameters OTParameters;

        try {
            OTParameters = (TParameters) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TParameters t WHERE t.strKEY =?1 AND t.strSTATUT = ?2")
                    .setParameter(1, "KEY_MAX_VALUE_VENTE").setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();
            return Integer.parseInt(OTParameters.getStrVALUE());

        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR get vente limite vente ", e.toString());
            return 0;
        }

    }

    public Integer GetBon(String OValue) {
        List<String> LstBon = new ArrayList<>();
        int int_result = 0;
        String str_ref_bon = "";

        List<TPreenregistrementCompteClientTiersPayent> LsTPreenregistrementTPC = new ArrayList<>();

        LsTPreenregistrementTPC = this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TPreenregistrementCompteClientTiersPayent t").getResultList();

        if (!LsTPreenregistrementTPC.isEmpty()) {
            for (int q = 0; q < LsTPreenregistrementTPC.size(); q++) {
                str_ref_bon = LsTPreenregistrementTPC.get(q).getLgPREENREGISTREMENTID().getStrREFBON();
                if (OValue.equalsIgnoreCase(str_ref_bon)) {
                    this.buildTraceMessage("ERROR", "DESOLE CE NUMERO DE BON EXISTE DEJA");
                    return int_result;
                } else {
                    int_result = 1;
                    return int_result;
                }

            }

        } else {
            int_result = 1;
            return int_result;
        }

        return int_result;
    }

    // verification du bon
    public boolean checkRefBonIsUse(String Ref_Bon, TCompteClientTiersPayant oTCompteClientTiersPayant,
            String str_STATUT) {
        boolean result = false;
        try {
            // Ref_Bon = Ref_Bon.trim(); 11/09/2017

            if (!Ref_Bon.equalsIgnoreCase("")) {
                TPreenregistrementCompteClientTiersPayent OPreenregistrementCompteClientTiersPayent = (TPreenregistrementCompteClientTiersPayent) this
                        .getOdataManager().getEm()
                        .createQuery(
                                "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID = ?1 AND t.strREFBON = ?2 AND t.strSTATUT = ?3")
                        .setParameter(1, oTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTIERSPAYANTID())
                        .setParameter(2, Ref_Bon).setParameter(3, str_STATUT).getSingleResult();

                if (OPreenregistrementCompteClientTiersPayent != null) {
                    this.buildErrorTraceMessage("Référence de bon de "
                            + OPreenregistrementCompteClientTiersPayent
                                    .getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME()
                            + " déjà utilisé par le client "
                            + OPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                                    .getStrFIRSTNAMECUSTOMER()
                            + " " + OPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                                    .getStrLASTNAMECUSTOMER());
                    result = true;
                }
            }

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        return result;
    }

    public boolean checkRefBonIsUse(String Ref_Bon, List<TCompteClientTiersPayant> lstTCompteClientTiersPayant) {
        boolean result = false;
        try {
            if (lstTCompteClientTiersPayant.stream()
                    .map((OTCompteClientTiersPayant) -> (TPreenregistrementCompteClientTiersPayent) this
                            .getOdataManager().getEm()
                            .createQuery(
                                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID = ?1 AND t.lgPREENREGISTREMENTID.strREFBON = ?2")
                            .setParameter(1, OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTIERSPAYANTID())
                            .setParameter(2, Ref_Bon).getSingleResult())
                    .anyMatch((
                            OPreenregistrementCompteClientTiersPayent) -> (OPreenregistrementCompteClientTiersPayent != null))) {
                return true;
            }

        } catch (Exception ex) {
            // ex.printStackTrace();
            return false;
        }
        return result;
    }
    // fin verification du bon

    // nouvelle bonne version de l'annulation vente ordonnancée
    public boolean CloturerAnnulerVente(String lg_PREENREGISTREMENT_ID, String str_REF_BON, String lg_TYPE_REGLEMENT_ID,
            String lg_TYPE_VENTE_ID, int int_TOTAL_VENTE_RECAP, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            List<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String str_ORDONNANCE,
            TPreenregistrement OTPreenregistrementOld) {
        clientManager OclientManager = new clientManager(this.getOdataManager(), this.getOTUser());
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());
        tierspayantManagement OtierspayantManagement = new tierspayantManagement(this.getOdataManager());
        TCompteClient OTCompteClient = null;
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        int int_price_support_by_customer = 0;

        TPreenregistrement OTPreenregistrement = OPreenregistrement.FindPreenregistrement(lg_PREENREGISTREMENT_ID);

        TReglement OTReglement = this.getOdataManager().getEm().find(TReglement.class, lg_REGLEMENT_ID);
        if (OTReglement == null) {
            this.buildErrorTraceMessage("Erreur", "Règlement inexistant");
            return false;
        }

        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("Erreur", "Vente à annuler inexistante");
            return false;
        }

        String str_mode_operatoire = "";

        if (OTPreenregistrementOld == null) {
            this.buildErrorTraceMessage("Erreur", "Vente à annuler inexistante");
            return false;
        }

        if (LstTCompteClientTiersPayant == null || LstTCompteClientTiersPayant.isEmpty()) {
            this.buildErrorTraceMessage("Erreur", "Pas de Tiers Payant");
            return false;

        }

        for (int i = 0; i < LstTCompteClientTiersPayant.size(); i++) {

            // TCompteClient OTCompteClient = null;
            TTiersPayant OTTiersPayant;
            TCompteClientTiersPayant OTCompteClientTiersPayant;

            OTTiersPayant = LstTCompteClientTiersPayant.get(i).getLgTIERSPAYANTID();
            if (OTTiersPayant == null) {
                this.buildErrorTraceMessage("Erreur", "OTTiersPayant is null");
                return false;

            }
            OTCompteClient = LstTCompteClientTiersPayant.get(i).getLgCOMPTECLIENTID();
            if (OTCompteClient == null) {
                this.buildErrorTraceMessage("Erreur", "OTCompteClient is null");
                return false;
            }
            OTCompteClientTiersPayant = LstTCompteClientTiersPayant.get(i);
            if (OTCompteClientTiersPayant == null) {
                this.buildErrorTraceMessage("Erreur", "OTCompteClientTiersPayant is null");
                return false;
            }
            str_mode_operatoire = this.func_GetCustomerWorkflow(OTTiersPayant);

            TPreenregistrementCompteClientTiersPayent OPreenregistrementCompteClientTiersPayent = OPreenregistrement
                    .getTPreenregistrementCompteClientTiersPayent(OTPreenregistrementOld.getLgPREENREGISTREMENTID(),
                            OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID());
            if (OPreenregistrementCompteClientTiersPayent == null) {
                this.buildErrorTraceMessage("Erreur", "OPreenregistrementCompteClientTiersPayent is null");
                return false;
            }
            new logger().OCategory
                    .info("Part tiers payant à annuler " + OPreenregistrementCompteClientTiersPayent.getIntPRICE()
                            + " Pourcentage " + OPreenregistrementCompteClientTiersPayent.getIntPERCENT());
            this.CreateVente(OTPreenregistrement, OPreenregistrementCompteClientTiersPayent.getIntPRICE() * (-1));
            System.out.println("OTCompteClientTiersPayant " + OTCompteClientTiersPayant + " OTPreenregistrement "
                    + OTPreenregistrement + " " + OPreenregistrementCompteClientTiersPayent.getIntPRICE() + " "
                    + OPreenregistrementCompteClientTiersPayent.getIntPERCENT() + " " + str_mode_operatoire
                    + "   OPreenregistrementCompteClientTiersPayent " + OPreenregistrementCompteClientTiersPayent + " "
                    + OPreenregistrementCompteClientTiersPayent.getDblQUOTACONSOVENTE() + "");
            OclientManager.addToMytransactionTiersPayent(OTCompteClientTiersPayant, OTPreenregistrement,
                    OPreenregistrementCompteClientTiersPayent.getIntPRICE() * (-1),
                    OPreenregistrementCompteClientTiersPayent.getIntPERCENT(), str_mode_operatoire,
                    OPreenregistrementCompteClientTiersPayent.getStrREFBON(),
                    OPreenregistrementCompteClientTiersPayent.getDblQUOTACONSOVENTE());
            OtierspayantManagement.createsnapshotVente(OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID(),
                    OPreenregistrementCompteClientTiersPayent.getIntPRICE() * (-1));

        }
        int_price_support_by_customer = OTPreenregistrementOld.getIntCUSTPART() * (-1);
        new logger().OCategory.info(" int_price_support_by_customer   " + int_price_support_by_customer);

        new logger().OCategory.info(" Montant brut de la vente à annuler " + int_TOTAL_VENTE_RECAP);

        // code ajouté pour la gestion des recettes
        if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) {
            // code ajouté

            if (OTCompteClient == null) {
                buildErrorTraceMessage("Pas de compte client associe a ce differe");
                return false;
            }

            // code ajouté
            OTPreenregistrementCompteClient = OPreenregistrement
                    .getTPreenregistrementCompteClient(OTPreenregistrementOld.getLgPREENREGISTREMENTID());
            if (OTPreenregistrementCompteClient == null) {
                buildErrorTraceMessage("Pas de vente liée à ce compte client associe au differe *** ");
                return false;
            }
            TTypeMvtCaisse OTTypeMvtCaisse = null;
            TRecettes OTRecettes = null;
            if (OTPreenregistrementCompteClient.getIntPRICE() >= 0) {

                /*
                 * OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES,
                 * this.getOdataManager()); // a decommenter en cas de probleme. 17/06/2016 OTRecettes =
                 * OcaisseManagement.AddRecette(new Double((OTPreenregistrementCompteClient.getIntPRICE()) + ""),
                 * Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                 * OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                 * OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                 * Parameter.KEY_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID,
                 * OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(), lg_MOTIF_REGLEMENT_ID,
                 * OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_DEBIT);
                 *
                 * if (OTRecettes == null) { this.buildErrorTraceMessage("Echec de retrait du montant de la caisse");
                 * return false; }
                 */
                if (OTPreenregistrementCompteClient.getIntPRICE() == 0) {
                    OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES,
                            this.getOdataManager());
                    OTRecettes = OcaisseManagement.AddRecette(
                            new Double((OTPreenregistrementCompteClient.getIntPRICE()) + ""),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                            Parameter.KEY_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID,
                            OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(),
                            lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                            commonparameter.TRANSACTION_DEBIT, true);

                    if (OTRecettes == null) {
                        this.buildErrorTraceMessage("Echec de retrait du montant de la caisse");
                        return false;
                    }
                }
                // new clientManager(this.getOdataManager(),
                // this.getOTUser()).addToMytransaction(OTPreenregistrementCompteClient.getLgCOMPTECLIENTID(),
                // lg_PREENREGISTREMENT_ID, int_AMOUNT_RECU, OTPreenregistrementCompteClient.getIntPRICERESTE() * (-1));
                // // a decommenter en cas de probleme 24/06/2016
                new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(
                        OTPreenregistrementCompteClient.getLgCOMPTECLIENTID(), OTPreenregistrement,
                        OTPreenregistrementCompteClient.getIntPRICE() * (-1),
                        OTPreenregistrementCompteClient.getIntPRICERESTE() * (-1));

            }
            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                    this.getOdataManager());

            // OcaisseManagement.AddRecette(new Double(OTPreenregistrementCompteClient.getIntPRICERESTE() + ""),
            // Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
            // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
            // OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
            // Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID,
            // str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
            // commonparameter.TRANSACTION_CREDIT); //a decommenter en cas de probleme. 18/05/2016
            // code ajouté 18/05/2016
            if (int_AMOUNT_RECU != 0) {
                new logger().OCategory.info("différé ");
                OcaisseManagement.AddRecette(new Double(OTPreenregistrementCompteClient.getIntPRICE() + ""),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                        Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE, Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID,
                        str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        commonparameter.TRANSACTION_DEBIT, true);
            }
            // fin code ajouté 18/05/2016

            OcaisseManagement.AddRecette(
                    new Double(OPreenregistrement
                            .getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID()) + ""),
                    Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                    bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                    lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                    OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT,
                    (int_AMOUNT_RECU == 0 ? false : true)); // a decommenter en cas de probleme 28/06/2016
            // OcaisseManagement.AddRecette(new
            // Double(OPreenregistrement.getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID())
            // + ""), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
            // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
            // OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
            // bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID,
            // str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
            // commonparameter.TRANSACTION_DEBIT);
            OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
            OTPreenregistrement.setIntCUSTPART(int_price_support_by_customer);
            this.persiste(OTPreenregistrement);

            // fin code ajouté
        } else if (!"6".equals(OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID())) {
            TTypeMvtCaisse OTTypeMvtCaisse = caisseManagement
                    .getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE, this.getOdataManager());
            new logger().OCategory.info("Dans les ventes ordonnancées non différé " + int_price_support_by_customer);
            if (OTPreenregistrementOld.getIntCUSTPART() > 0) {
                // new logger().OCategory.info("int_price_support_by_customer > 0 " + int_price_support_by_customer);
                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);
                OTPreenregistrement.setIntCUSTPART(int_price_support_by_customer);
                this.persiste(OTPreenregistrement);

                TRecettes OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                        new Double((-1) * int_price_support_by_customer + ""), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON,
                        OTTypeMvtCaisse.getStrDESCRIPTION(), OTPreenregistrement.getLgPREENREGISTREMENTID(),
                        int_AMOUNT_REMIS, int_AMOUNT_RECU, OTPreenregistrement.getLgPREENREGISTREMENTID(),
                        lg_TYPE_REGLEMENT_ID, bll.common.Parameter.KEY_VENTE_ORDONNANCE,
                        bll.common.Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                        lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        commonparameter.TRANSACTION_DEBIT, true);
                // TRecettes OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(new
                // Double(int_price_support_by_customer + ""), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON,
                // OTTypeMvtCaisse.getStrDESCRIPTION(), OTPreenregistrement.getLgPREENREGISTREMENTID(),
                // int_AMOUNT_REMIS, int_AMOUNT_RECU, OTPreenregistrement.getLgPREENREGISTREMENTID(),
                // lg_TYPE_REGLEMENT_ID, bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_VENTE,
                // lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                // OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT); // a decommenter en cas
                // de probleme
                // new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(new
                // Double(OPreenregistrement.getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID())
                // + ""), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                // bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID,
                // str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                // commonparameter.TRANSACTION_CREDIT); //a retire en cas de probleme
                new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                        new Double(OPreenregistrement
                                .getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID()) + ""),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                        bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                        lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                        OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);

                if (OTRecettes == null) {
                    this.buildErrorTraceMessage("Impossible de cloture la vente", "la recette n'a pas pu etre MAJ");
                    return false;
                }
            } else {
                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);
                // TTypeMvtCaisse OTTypeMvtCaisse =
                // caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES,
                // this.getOdataManager());
                TRecettes OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                        new Double(OPreenregistrement
                                .getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID()) + ""),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                        bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                        lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                        OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);

                if (OTRecettes == null) {
                    this.buildErrorTraceMessage("Impossible de cloture la vente",
                            "la recette du differe n'a pas pu etre MAJ");
                    return false;
                }
            }
        }
        // fin code ajouté pour la gestion des recettes

        new Preenregistrement(this.getOdataManager(), this.getOTUser()).CloturerAnnulerVente(lg_PREENREGISTREMENT_ID,
                str_REF_BON, lg_TYPE_REGLEMENT_ID, lg_TYPE_VENTE_ID, int_TOTAL_VENTE_RECAP, int_AMOUNT_RECU,
                int_AMOUNT_REMIS, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, str_ORDONNANCE,
                int_price_support_by_customer, OTPreenregistrementOld);
        // fin code ajouté

        this.buildTraceMessage("Succes", " Operation effectuee avec succes");
        return true;
    }

    // fin
    // liste des differés
    public List<TPreenregistrementCompteClient> getListeDifferes(String search_value, String lg_COMPTE_CLIENT_ID,
            Date dt_BEGIN, Date dt_END) {
        List<TPreenregistrementCompteClient> lstTPreenregistrementCompteClient = new ArrayList<>();
        try {
            lstTPreenregistrementCompteClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClient t WHERE (t.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?1 OR t.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?1 OR t.lgCOMPTECLIENTID.lgCLIENTID.strNUMEROSECURITESOCIAL LIKE ?1 OR t.lgCOMPTECLIENTID.lgCLIENTID.strCODEINTERNE LIKE ?1 OR t.lgPREENREGISTREMENTID.strFIRSTNAMECUSTOMER LIKE ?1 OR t.lgPREENREGISTREMENTID.strLASTNAMECUSTOMER LIKE ?1 OR t.lgPREENREGISTREMENTID.strPHONECUSTOME LIKE ?1 OR t.lgPREENREGISTREMENTID.strREF LIKE ?1 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?1) AND t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.strSTATUT = ?3 AND t.intPRICERESTE > 0 AND t.lgPREENREGISTREMENTID.intPRICE > 0 AND t.lgPREENREGISTREMENTID.bISCANCEL = ?4 AND (t.lgPREENREGISTREMENTID.dtUPDATED >= ?5 AND t.lgPREENREGISTREMENTID.dtUPDATED <= ?6) ORDER BY t.dtUPDATED")
                    .setParameter(1, search_value + "%").setParameter(2, lg_COMPTE_CLIENT_ID)
                    .setParameter(3, commonparameter.statut_is_Closed).setParameter(4, false).setParameter(5, dt_BEGIN)
                    .setParameter(6, dt_END).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrementCompteClient;
    }
    // fin liste des différés

    public void updateSnapshotVenteSociete(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_ID) {

        try {
            Object o = this.getOdataManager().getEm().createNativeQuery("CALL `proc_populatestatventesociete`(?1)")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).getSingleResult();

            if ("".equals(lg_COMPTE_CLIENT_ID)) {
                lg_COMPTE_CLIENT_ID = getCOMPTECLIENTID(lg_PREENREGISTREMENT_ID);
            }
            if (!"".equals(lg_COMPTE_CLIENT_ID)) {
                o = this.getOdataManager().getEm().createNativeQuery("CALL `proc_clientventetrigger`(?1,?2)")
                        .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(2, lg_PREENREGISTREMENT_ID)
                        .getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String getCOMPTECLIENTID(String lg_PREENREGISTREMENT_ID) {
        String lg_COMPTE_CLIENT_ID = "";
        try {
            lg_COMPTE_CLIENT_ID = (String) this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT c.lgCOMPTECLIENTID FROM TCompteClient c,TCompteClientTiersPayant co,TPreenregistrementCompteClientTiersPayent p WHERE  c.lgCOMPTECLIENTID=co.lgCOMPTECLIENTID.lgCOMPTECLIENTID AND co.lgCOMPTECLIENTTIERSPAYANTID=p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID AND p.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).getSingleResult();
        } catch (Exception e) {
        }
        return lg_COMPTE_CLIENT_ID;
    }

    public Double createTPreenregistrementCompteClientTierspayant(String[] tabString,
            TPreenregistrement OTPreenregistrement, int int_AMOUNT_REMIS, int int_AMOUNT_RECU,
            Double int_TIERSPAYANT_PART, boolean b_WITHOUT_BON) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        int int_RESTE = 0, int_CURRENT_PART_TIERSPAYANT = 0, int_PERCENT_INIT = 100, int_PERCENT = 0;
        String[] tabStringTierspayant;
        Double result = 0.0;
        try {
            // int_TIERSPAYANT_PART = OTVente.getDblAMOUNT(); // a decommenter en cas de probleme 13/09/2016
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            for (String OString : tabString) {
                tabStringTierspayant = StringUtils.split(OString, commonparameter.SEPARATEUR_DOUBLE_POINT);
                OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                        tabStringTierspayant[0] != null ? tabStringTierspayant[0] : "");
                if (OTCompteClientTiersPayant != null) {
                    if (int_PERCENT_INIT >= OTCompteClientTiersPayant.getIntPOURCENTAGE()) {
                        // controle de la reference de bon
                        if (!b_WITHOUT_BON && tabStringTierspayant.length < 2) {
                            this.buildErrorTraceMessage("Veuillez saisir une référence de bon pour le tiers payant "
                                    + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                            return 0.0;
                        }

                        if (this.checkRefBonIsUse(
                                tabStringTierspayant.length == 2 && tabStringTierspayant[1] != null
                                        ? tabStringTierspayant[1] : " ",
                                OTCompteClientTiersPayant, commonparameter.statut_is_Closed)) {
                            return 0.0;
                        }
                        // fin controle de la reference de bon
                        int_CURRENT_PART_TIERSPAYANT = (int) ((OTCompteClientTiersPayant.getIntPOURCENTAGE()
                                * int_TIERSPAYANT_PART) / 100);
                        int_RESTE = (int) (int_TIERSPAYANT_PART - int_CURRENT_PART_TIERSPAYANT);
                        if (!this.createTPreenregistrementCompteClientTiersPayent(Ojconnexion, OTPreenregistrement,
                                OTCompteClientTiersPayant, OTCompteClientTiersPayant.getIntPOURCENTAGE(),
                                int_CURRENT_PART_TIERSPAYANT, int_CURRENT_PART_TIERSPAYANT,
                                tabStringTierspayant[1] != null ? tabStringTierspayant[1] : "")) {
                            return 0.0;
                        }
                        int_PERCENT_INIT = int_PERCENT_INIT - OTCompteClientTiersPayant.getIntPOURCENTAGE();
                        result += int_CURRENT_PART_TIERSPAYANT;
                    } else {
                        // controle de la reference de bon
                        if (!b_WITHOUT_BON && tabStringTierspayant.length < 2) {
                            this.buildErrorTraceMessage("Veuillez saisir une référence de bon pour le tiers payant "
                                    + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                            return 0.0;
                        }
                        if (this.checkRefBonIsUse(
                                tabStringTierspayant.length == 2 && tabStringTierspayant[1] != null
                                        ? tabStringTierspayant[1] : " ",
                                OTCompteClientTiersPayant, commonparameter.statut_is_Closed)) {
                            return 0.0;
                        }
                        // fin controle de la reference de bon
                        // int_PERCENT = 100 - OTCompteClientTiersPayant.getIntPOURCENTAGE();
                        int_PERCENT = int_PERCENT_INIT;
                        int_CURRENT_PART_TIERSPAYANT = int_RESTE;
                        this.createTPreenregistrementCompteClientTiersPayent(Ojconnexion, OTPreenregistrement,
                                OTCompteClientTiersPayant, int_PERCENT, int_CURRENT_PART_TIERSPAYANT,
                                int_CURRENT_PART_TIERSPAYANT,
                                tabStringTierspayant[1] != null ? tabStringTierspayant[1] : "");
                        result += int_CURRENT_PART_TIERSPAYANT;
                    }

                }

            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la part des tiers payants à la vente en cours");
        }
        return result;
    }

    public boolean createTPreenregistrementCompteClientTiersPayent(TPreenregistrement OTPreenregistrement,
            TCompteClientTiersPayant OTCompteClientTiersPayant, int int_PERCENT, int int_PRICE) {
        boolean result = false;
        Date today = new Date();
        if (!preenregistrementExist(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID())) {
            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
            try {
                OTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                OTPreenregistrementCompteClientTiersPayent
                        .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());
                OTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
                OTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
                OTPreenregistrementCompteClientTiersPayent.setStrSTATUT(OTPreenregistrement.getStrSTATUT());
                OTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
                OTPreenregistrementCompteClientTiersPayent.setDtCREATED(today);
                OTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_PERCENT);
                OTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_PRICE);
                OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(int_PRICE);
                if (this.persiste(OTPreenregistrementCompteClientTiersPayent)) {
                    this.buildSuccesTraceMessage("Tiers payant ajouté avec succès à la vente en cours");
                    result = true;
                } else {
                    this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
                }

            } catch (Exception e) {
                e.printStackTrace();
                this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
            }
        } else {
            result = true;
        }
        return result;
    }

    public boolean createTPreenregistrementCompteClientTiersPayent(String lg_PREENREGISTREMENT_ID,
            String lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int int_PERCENT, int int_PRICE) {
        boolean result = false;
        TPreenregistrement OTPreenregistrement = null;
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        try {
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                    lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de l'ajout du tiers payant. Référence de vente inexistante");
                return result;
            }
            if (OTCompteClientTiersPayant == null) {
                this.buildErrorTraceMessage(
                        "Echec de l'ajout du tiers payant. Tiers payant inexistant sur la fiche du client");
                return result;
            }
            result = this.createTPreenregistrementCompteClientTiersPayent(OTPreenregistrement,
                    OTCompteClientTiersPayant, int_PERCENT, int_PRICE);

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }
        return result;
    }

    public boolean createTPreenregistrementCompteClientTiersPayent(jconnexion Ojconnexion,
            TPreenregistrement OTPreenregistrement, TCompteClientTiersPayant OTCompteClientTiersPayant, int int_PERCENT,
            int int_PRICE, int int_PRICE_RESTE, String str_REFBON) {
        boolean result = false;
        Date today = new Date();
        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        try {
            OTPreenregistrementCompteClientTiersPayent = this.getTPreenregistrementCompteClientTiersPayent(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID());
            if (OTPreenregistrementCompteClientTiersPayent == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Tiers payant inexistant sur la vente");
                return result;
            }

            if (OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                    .getDblQUOTACONSOVENTE() != null
                    && OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                            .getDblQUOTACONSOVENTE() != 0
                    && OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                            .getDblQUOTACONSOVENTE() < int_PRICE) {
                this.buildErrorTraceMessage(
                        "Impossible de terminer la vente. Le plafond est atteint pour le tiers payant "
                                + OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                        .getLgTIERSPAYANTID().getStrFULLNAME());
                return result;
            }
            // new logger().OCategory.info("str_REFBON:"+str_REFBON.trim() + "|int_PRICE:"+int_PRICE+
            // "|int_PRICE_RESTE:"+int_PRICE_RESTE);
            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(today);
            OTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_PERCENT);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_PRICE);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(int_PRICE_RESTE);
            OTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REFBON.trim());
            OTPreenregistrementCompteClientTiersPayent.setDblQUOTACONSOVENTE(OTPreenregistrementCompteClientTiersPayent
                    .getLgCOMPTECLIENTTIERSPAYANTID().getDblQUOTACONSOVENTE() != null
                            ? OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                    .getDblQUOTACONSOVENTE()
                            : 0);
            OTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
            this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);
            this.CreateVente(OTPreenregistrement, int_PRICE);

            if (OTCompteClientTiersPayant.getIntPRIORITY() == 1) {
                OTPreenregistrement.setStrREFBON(str_REFBON.trim());
                this.getOdataManager().getEm().merge(OTPreenregistrement);
            }

            if (!OTCompteClientTiersPayant.getLgTIERSPAYANTID().getBoolIsACCOUNT()) {
                this.debiterCompteClient(Ojconnexion, OTCompteClientTiersPayant.getLgCOMPTECLIENTID(), int_PRICE);
            }

            this.buildSuccesTraceMessage("Tiers payant ajouté avec succès à la vente en cours");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }
        return result;
    }

    public boolean createTPreenregistrementCompteClientTiersPayent(TPreenregistrement OTPreenregistrement,
            TCompteClientTiersPayant OTCompteClientTiersPayant, int int_PERCENT, int int_PRICE, int int_PRICE_RESTE,
            String str_REFBON) {
        boolean result = false;
        Date today = new Date();
        try {
            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
            OTPreenregistrementCompteClientTiersPayent
                    .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());
            OTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
            OTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
            OTPreenregistrementCompteClientTiersPayent.setDtCREATED(today);
            OTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_PERCENT);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_PRICE);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(int_PRICE_RESTE);
            // OTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REFBON.trim());//23/09/2017
            OTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REFBON);
            OTPreenregistrementCompteClientTiersPayent.setDblQUOTACONSOVENTE(OTPreenregistrementCompteClientTiersPayent
                    .getLgCOMPTECLIENTTIERSPAYANTID().getDblQUOTACONSOVENTE() != null
                            ? OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                    .getDblQUOTACONSOVENTE()
                            : 0);
            OTPreenregistrementCompteClientTiersPayent.setStrSTATUT(OTPreenregistrement.getStrSTATUT());
            this.getOdataManager().getEm().persist(OTPreenregistrementCompteClientTiersPayent);
            // this.CreateVente(OTPreenregistrement, int_PRICE);
            if (OTCompteClientTiersPayant.getIntPRIORITY() == 1) {
                // OTPreenregistrement.setStrREFBON(str_REFBON.trim());//23/09/2017
                OTPreenregistrement.setStrREFBON(str_REFBON);
                this.getOdataManager().getEm().merge(OTPreenregistrement);
            }
            this.buildSuccesTraceMessage("Tiers payant ajouté avec succès à la vente en cours");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }
        return result;
    }

    public TPreenregistrementCompteClientTiersPayent getTPreenregistrementCompteClientTiersPayent(
            String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {
        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        try {
            OTPreenregistrementCompteClientTiersPayent = (TPreenregistrementCompteClientTiersPayent) this
                    .getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?2")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, lg_COMPTE_CLIENT_TIERS_PAYANT_ID)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTPreenregistrementCompteClientTiersPayent;
    }

    private void debiterCompteClient(jconnexion Ojconnexion, TCompteClient OTCompteClient, int int_amount) {
        this.crediteAccount(Ojconnexion, OTCompteClient, this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(),
                int_amount);
    }

    private void debiterCompteClient(TCompteClient OTCompteClient, int int_amount) {
        this.crediteAccount(OTCompteClient, this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), int_amount);
    }

    private void crediteAccount(TCompteClient DebitTCompteClient, TCompteClient CreditTCompteClient, int int_amount) {
        try {
            UUID uui = UUID.randomUUID();
            String str_transaction_id_param = uui.toString();
            UUID uui1 = UUID.randomUUID();
            String str_transaction_id_param2 = uui1.toString();
            StoredProcedureQuery q = this.getOdataManager().getEm()
                    .createStoredProcedureQuery("create_transaction_proc");

            q.registerStoredProcedureParameter("str_transaction_id_param", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_transaction_id_param2", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_transaction_code_param", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("dt_transaction_date_param", Timestamp.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_Emetteur_Phone_param", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_Beneficiare_Phone_param", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("dec_Amount_param", Double.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("b_valide_param", Short.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_Emetteur_Pin_Param", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("error_message", String.class, ParameterMode.OUT);
            q.registerStoredProcedureParameter("transaction_number_param", String.class, ParameterMode.OUT);
            q.registerStoredProcedureParameter("str_Motif_Transaction_param", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_transaction_number_Param", String.class, ParameterMode.IN);

            q.setParameter("str_transaction_id_param", str_transaction_id_param);
            q.setParameter("str_transaction_id_param2", str_transaction_id_param2);
            q.setParameter("str_transaction_code_param", "w");
            q.setParameter("dt_transaction_date_param", new Date());
            q.setParameter("str_Emetteur_Phone_param", DebitTCompteClient.getLgCOMPTECLIENTID());
            q.setParameter("str_Beneficiare_Phone_param", CreditTCompteClient.getLgCOMPTECLIENTID());
            q.setParameter("dec_Amount_param", int_amount);
            q.setParameter("b_valide_param", Short.valueOf("1"));
            q.setParameter("str_Emetteur_Pin_Param", DebitTCompteClient.getLgCOMPTECLIENTID());

            q.setParameter("str_Motif_Transaction_param", "TEST");
            q.setParameter("str_transaction_number_Param", this.getKey().getComplexId());
            q.execute();
            System.out.println(" out 1" + q.getOutputParameterValue("error_message") + " out 2 "
                    + q.getOutputParameterValue("transaction_number_param"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("cannot do transaction  " + e.getMessage().toString());

        }
    }

    private void crediteAccount(jconnexion Ojconnexion, TCompteClient DebitTCompteClient,
            TCompteClient CreditTCompteClient, int int_amount) {
        try {
            UUID uui = UUID.randomUUID();
            String str_transaction_id_param = uui.toString();
            UUID uui1 = UUID.randomUUID();
            String str_transaction_id_param2 = uui1.toString();
            long current_time = System.currentTimeMillis();
            java.sql.Date transaction_date = new java.sql.Date(current_time);
            // String lg_emetteur_id = this.GetSystemeCompte().getLgCOMPTECLIENTID();

            String sProc = "{ CALL create_transaction_proc(?,?,?,?,?,?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            cs.setString(1, str_transaction_id_param);
            cs.setString(2, str_transaction_id_param2);
            cs.setString(3, "w");
            cs.setDate(4, transaction_date);
            cs.setString(5, DebitTCompteClient.getLgCOMPTECLIENTID());
            cs.setString(6, CreditTCompteClient.getLgCOMPTECLIENTID());
            cs.setDouble(7, int_amount);
            cs.setBoolean(8, true);
            cs.setString(9, DebitTCompteClient.getLgCOMPTECLIENTID());
            cs.setString(10, "");
            cs.setString(11, "");
            cs.setString(12, "TEST");
            cs.setString(13, this.getKey().getComplexId());
            cs.execute();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("cannot do transaction  " + e.getMessage().toString());

        }
    }

    public boolean cloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, TReglement OTReglement, String lg_COMPTE_CLIENT_ID,
            String str_FIRST_NAME_FACTURE, String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE,
            String str_NUMERO_SECURITE_SOCIAL, String lg_USER_VENDEUR_ID, boolean b_WITHOUT_BON,
            JSONArray tierspayantsda, int int_TAUX) {

        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());

        int int_total_remise_convert = 0;
        Double dbl_Amount = 0.0, dbl_PART_TIERSPAYANT = 0.0;
        boolean result = false;
        TParameters OTParameters = null;
        TCompteClient OTCompteClient = null;
        TPreenregistrement OTPreenregistrement = null;
        try {

            OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente", "Ref commande inconnue");
                return false;
            }

            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                                        // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage("Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                return false;
            }

            OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);
            if (OTCompteClient == null) {
                this.buildErrorTraceMessage("Impossible de terminer la vente. Client inexistant");
                return false;
            }

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && b_WITHOUT_BON) { // si valeur 0, on passe en cloture
                                                                                     // manuelle
                this.buildErrorTraceMessage(
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
                return false;
            }

            dbl_PART_TIERSPAYANT = this.createTPreenregistrementCompteClientTierspayant(tierspayantsda,
                    OTPreenregistrement, int_AMOUNT_REMIS, int_AMOUNT_RECU, b_WITHOUT_BON);
            if (this.getMessage().equals(commonparameter.PROCESS_FAILED)) {
                return false;
            }

            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            result = OPreenregistrement.CloturerVente(OTPreenregistrement, OTTypeVente, b_WITHOUT_BON,
                    lg_TYPE_REGLEMENT_ID, OTReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS,
                    dbl_PART_TIERSPAYANT.intValue(), OTCompteClient, lg_USER_VENDEUR_ID, int_TAUX);
            updateComptclientTierspayant(tierspayantsda);

            this.buildSuccesTraceMessage(OPreenregistrement.getDetailmessage());
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente à crédit. Veuillez réessayer svp!");
        }

        return result;
    }

    public boolean createPreenregistrementCompteClientTiersPayent(jconnexion Ojconnexion,
            TPreenregistrement OTPreenregistrement, TCompteClientTiersPayant OTCompteClientTiersPayant, int int_PERCENT,
            int int_PRICE, int int_PRICE_RESTE, String str_REFBON) {
        boolean result = false;
        Date today = new Date();
        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        try {
            OTPreenregistrementCompteClientTiersPayent = this.getTPreenregistrementCompteClientTiersPayent(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID());
            if (OTPreenregistrementCompteClientTiersPayent == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Tiers payant inexistant sur la vente");
                return result;
            }

            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(today);
            OTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_PERCENT);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_PRICE);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(int_PRICE_RESTE);
            OTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REFBON.trim());
            OTPreenregistrementCompteClientTiersPayent.setDblQUOTACONSOVENTE(OTPreenregistrementCompteClientTiersPayent
                    .getLgCOMPTECLIENTTIERSPAYANTID().getDblQUOTACONSOVENTE() != null
                            ? OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                    .getDblQUOTACONSOVENTE()
                            : 0);
            OTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
            this.merge(OTPreenregistrementCompteClientTiersPayent);
            // this.createVente(OTPreenregistrement, int_PRICE);//commenter le 30 09 2017

            if (OTCompteClientTiersPayant.getIntPRIORITY() == 1) {
                OTPreenregistrement.setStrREFBON(str_REFBON);
                this.merge(OTPreenregistrement);
            }

            if (!OTCompteClientTiersPayant.getLgTIERSPAYANTID().getBoolIsACCOUNT()) {
                this.debiterCompteClient(OTCompteClientTiersPayant.getLgCOMPTECLIENTID(), int_PRICE);
            }

            this.buildSuccesTraceMessage("Tiers payant ajouté avec succès à la vente en cours");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }
        return result;
    }

    public TPreenregistrement createVente(TPreenregistrement OTPreenregistrement, int Amount_vente) {
        TPreenregistrement OTPreenregistrementTemp = null;
        try {

            if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Process)
                    || OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Devis)) {

                OTPreenregistrementTemp = new TPreenregistrement();
                OTPreenregistrementTemp.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
                OTPreenregistrementTemp.setIntPRICE(Amount_vente);
                OTPreenregistrementTemp.setLgPARENTID(OTPreenregistrement.getLgPREENREGISTREMENTID());
                OTPreenregistrementTemp.setLgNATUREVENTEID(OTPreenregistrement.getLgNATUREVENTEID());
                OTPreenregistrementTemp.setLgTYPEVENTEID(OTPreenregistrement.getLgTYPEVENTEID());
                OTPreenregistrementTemp.setLgUSERID(OTPreenregistrement.getLgUSERID());
                OTPreenregistrementTemp.setDtCREATED(new Date());
                OTPreenregistrementTemp.setStrSTATUT(commonparameter.statut_is_Process);
                // this.persiste(OTPreenregistrementTemp); // a decommenter en cas de probleme
                this.persiste(OTPreenregistrementTemp);
                this.getOdataManager().getEm().persist(OTPreenregistrementTemp);
                // return OTPreenregistrementTemp;
            }
        } catch (Exception e) {
            new logger().OCategory.info(" Desole creation de preenregistrement enfant impossible  " + e.toString());
            this.buildErrorTraceMessage("ERROR", "Desole creation de preenregistrement enfant impossible");
            // return OTPreenregistrementTemp;
        }
        return OTPreenregistrementTemp;
    }

    private boolean updateComptclientTierspayant(JSONArray data) {
        boolean isOK = false;
        for (int k = 0; k < data.length(); k++) {
            try {
                JSONObject json = data.getJSONObject(k);
                int int_CURRENT_PART_TIERSPAYANT = Integer.valueOf(json.getInt("MONTANT") + "");
                TCompteClientTiersPayant OTCompteClientTiersPayant = this.getOdataManager().getEm()
                        .find(TCompteClientTiersPayant.class, json.get("LGCOMPTECLIENT").toString());

                if (OTCompteClientTiersPayant != null) {
                    TTiersPayant oPayant = OTCompteClientTiersPayant.getLgTIERSPAYANTID();
                    OTCompteClientTiersPayant.setDbCONSOMMATIONMENSUELLE(
                            OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() + int_CURRENT_PART_TIERSPAYANT);
                    oPayant.setDbCONSOMMATIONMENSUELLE(
                            oPayant.getDbCONSOMMATIONMENSUELLE() + int_CURRENT_PART_TIERSPAYANT);
                    if (OTCompteClientTiersPayant.getDbPLAFONDENCOURS() > 0) {
                        if (OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() >= OTCompteClientTiersPayant
                                .getDbPLAFONDENCOURS()) {
                            OTCompteClientTiersPayant.setBCANBEUSE(false);
                        }
                    }
                    if (oPayant.getDblPLAFONDCREDIT() > 0) {
                        if (oPayant.getDbCONSOMMATIONMENSUELLE() >= oPayant.getDblPLAFONDCREDIT()) {
                            oPayant.setBCANBEUSE(false);
                        }
                    }
                    this.merge2(oPayant);
                    this.merge2(OTCompteClientTiersPayant);
                    isOK = true;
                }
            } catch (JSONException ex) {
                ex.printStackTrace();
            }
        }
        return isOK;
    }

    private boolean preenregistrementExist(String idPreenregistrement, String idCompteClientTierspayant) {
        boolean isExist = false;
        try {
            Object count = this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT( o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID ) FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 AND o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID =?2 ")
                    .setParameter(1, idPreenregistrement).setParameter(2, idCompteClientTierspayant).getSingleResult();
            if ((long) count > 0) {
                isExist = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isExist;
    }

    public boolean createTPreenregistrementCompteClientTierspayant(String listeCompteclientTierspayant,
            TPreenregistrement OTPreenregistrement) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        String[] tabStringTierspayant;
        boolean result = false;
        try {
            String[] tabString = StringUtils.split(listeCompteclientTierspayant,
                    commonparameter.SEPARATEUR_POINT_VIRGULE);
            for (String OString : tabString) {
                tabStringTierspayant = StringUtils.split(OString, commonparameter.SEPARATEUR_DOUBLE_POINT);
                OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                        tabStringTierspayant[0] != null ? tabStringTierspayant[0] : "");
                if (OTCompteClientTiersPayant != null) {
                    if (!this.createTPreenregistrementCompteClientTiersPayent(OTPreenregistrement,
                            OTCompteClientTiersPayant, OTCompteClientTiersPayant.getIntPOURCENTAGE(), 0, 0,
                            tabStringTierspayant.length == 2 && tabStringTierspayant[1] != null
                                    ? tabStringTierspayant[1] : " ")) {
                        this.buildErrorTraceMessage("Echec de tiers payant à la vente");
                        return result;
                    }
                }
            }
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la part des tiers payants à la vente en cours");
        }
        return result;
    }

    public Double createTPreenregistrementCompteClientTierspayant(JSONArray data,
            TPreenregistrement OTPreenregistrement, int int_AMOUNT_REMIS, int int_AMOUNT_RECU, boolean b_WITHOUT_BON) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        int int_RESTE = 0, int_CURRENT_PART_TIERSPAYANT = 0, int_PERCENT_INIT = 100, int_PERCENT = 0;

        Double result = 0.0;
        try {

            for (int k = 0; k < data.length(); k++) {
                JSONObject json = data.getJSONObject(k);
                int_CURRENT_PART_TIERSPAYANT = Integer.valueOf(json.getInt("tpnet") + "");
                OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                        json.get("LGCOMPTECLIENT").toString());
                if (OTCompteClientTiersPayant != null) {

                    // controle de la reference de bon
                    if (!b_WITHOUT_BON && "".equals(json.getString("REFBON"))) {
                        this.buildErrorTraceMessage("Veuillez saisir une référence de bon pour le tiers payant "
                                + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                        return 0.0;
                    }

                    if (this.checkRefBonIsUse(json.getString("REFBON"), OTCompteClientTiersPayant,
                            commonparameter.statut_is_Closed)) {
                        return 0.0;
                    }

                    /*
                     * if (!this.createPreenregistrementCompteClientTiersPayent(Ojconnexion, OTPreenregistrement,
                     * OTCompteClientTiersPayant, OTCompteClientTiersPayant.getIntPOURCENTAGE(),
                     * int_CURRENT_PART_TIERSPAYANT, int_CURRENT_PART_TIERSPAYANT,
                     * json.get("REFBON").toString().trim())) { return 0.0; }
                     */
                    if (!this.createPreenregistrementCompteClientTiersPayent(null, OTPreenregistrement,
                            OTCompteClientTiersPayant, json.getInt("TAUX"), int_CURRENT_PART_TIERSPAYANT,
                            int_CURRENT_PART_TIERSPAYANT, json.getString("REFBON"))) {
                        return 0.0;
                    }

                    result += int_CURRENT_PART_TIERSPAYANT;

                }

            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la part des tiers payants à la vente en cours");
        }
        return result;
    }

    public boolean updateCompteTierpayant(JSONArray data, TPreenregistrement OTPreenregistrement,
            boolean b_WITHOUT_BON) {

        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        int int_CURRENT_PART_TIERSPAYANT = 0;

        boolean result = false;
        try {
            // int_TIERSPAYANT_PART = OTVente.getDblAMOUNT(); // a decommenter en cas de probleme 13/09/2016
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            for (int k = 0; k < data.length(); k++) {
                JSONObject json = data.getJSONObject(k);
                int_CURRENT_PART_TIERSPAYANT = json.getInt("tpnet");
                OTCompteClientTiersPayant = this.getOdataManager().getEm().getReference(TCompteClientTiersPayant.class,
                        json.getString("LGCOMPTECLIENT"));
                if (OTCompteClientTiersPayant != null) {

                    // controle de la reference de bon
                    if (!b_WITHOUT_BON && "".equals(json.getString("REFBON"))) {
                        this.buildErrorTraceMessage("Veuillez saisir une référence de bon pour le tiers payant "
                                + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                        return false;
                    }

                    if (this.checkRefBonIsUse(json.getString("REFBON"), OTCompteClientTiersPayant,
                            commonparameter.statut_is_Closed)) {
                        return false;
                    }
                    Collection<TPreenregistrementCompteClientTiersPayent> clientTiersPayents = OTPreenregistrement
                            .getTPreenregistrementCompteClientTiersPayentCollection();
                    for (TPreenregistrementCompteClientTiersPayent op : clientTiersPayents) {
                        if (op.getLgCOMPTECLIENTTIERSPAYANTID().equals(OTCompteClientTiersPayant)) {
                            this.savePreenregistrementCompteClientTiersPayent(Ojconnexion, OTPreenregistrement, op,
                                    OTCompteClientTiersPayant, json.getInt("TAUX"), int_CURRENT_PART_TIERSPAYANT,
                                    int_CURRENT_PART_TIERSPAYANT, json.getString("REFBON"));

                        }

                    }
                    updateComptclientTierspayant2(OTCompteClientTiersPayant, int_CURRENT_PART_TIERSPAYANT);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la part des tiers payants à la vente en cours");
        }
        return result;
    }

    public void savePreenregistrementCompteClientTiersPayent(jconnexion Ojconnexion,
            TPreenregistrement OTPreenregistrement,
            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent,
            TCompteClientTiersPayant tcctp, int int_PERCENT, int int_PRICE, int int_PRICE_RESTE, String str_REFBON) {

        try {

            OTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
            OTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_PERCENT);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_PRICE);
            OTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(0);
            OTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REFBON);
            OTPreenregistrementCompteClientTiersPayent.setDblQUOTACONSOVENTE(OTPreenregistrementCompteClientTiersPayent
                    .getLgCOMPTECLIENTTIERSPAYANTID().getDblQUOTACONSOVENTE() != null
                            ? OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                    .getDblQUOTACONSOVENTE()
                            : 0);
            OTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
            this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);

            if (tcctp.getIntPRIORITY() == 1) {
                OTPreenregistrement.setStrREFBON(str_REFBON);
                this.getOdataManager().getEm().merge(OTPreenregistrement);

            }

            if (!tcctp.getLgTIERSPAYANTID().getBoolIsACCOUNT()) {
                this.debiterCompteClient(Ojconnexion, tcctp.getLgCOMPTECLIENTID(), int_PRICE);
            }

            this.buildSuccesTraceMessage("Tiers payant ajouté avec succès à la vente en cours");

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }

    }

    private void updateComptclientTierspayant2(TCompteClientTiersPayant OTCompteClientTiersPayant, Integer amount) {

        try {

            TTiersPayant oPayant = OTCompteClientTiersPayant.getLgTIERSPAYANTID();
            OTCompteClientTiersPayant
                    .setDbCONSOMMATIONMENSUELLE(OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() + amount);
            oPayant.setDbCONSOMMATIONMENSUELLE(oPayant.getDbCONSOMMATIONMENSUELLE() + amount);
            if (OTCompteClientTiersPayant.getDbPLAFONDENCOURS() > 0) {
                if (OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() >= OTCompteClientTiersPayant
                        .getDbPLAFONDENCOURS()) {
                    OTCompteClientTiersPayant.setBCANBEUSE(false);
                }
            }
            if (oPayant.getDblPLAFONDCREDIT() > 0) {
                if (oPayant.getDbCONSOMMATIONMENSUELLE() >= oPayant.getDblPLAFONDCREDIT()) {
                    oPayant.setBCANBEUSE(false);
                }
            }
            this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
            this.getOdataManager().getEm().merge(oPayant);

        } catch (Exception ex) {
            ex.printStackTrace();
        }

    }

    // .cloturerAnnulerVente(OTPreenregistrementNew, OTPreenregistrement.getStrREFBON(), str_reglement,
    // OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(), (OTPreenregistrement.getIntPRICE() * (-1)),
    // (amount_recu * (-1)), (amount_remis * (-1)), lstTCompteClientTiersPayant, strreglementid, strcompteclientref,
    // strmotifreglementid, OTPreenregistrement.getStrORDONNANCE(), OTPreenregistrement);
    public boolean cloturerAnnulerVente(TPreenregistrement OTPreenregistrement,
            TPreenregistrement OTPreenregistrementOld,
            List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent,
            Integer amount_recu, Integer amount_remis, String lg_MOTIF_REGLEMENT_ID, String str_REF_COMPTE_CLIENT)
            throws Exception {
        clientManager OclientManager = new clientManager(this.getOdataManager(), this.getOTUser());
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());
        tierspayantManagement OtierspayantManagement = new tierspayantManagement(this.getOdataManager());
        TTypeMvtCaisse OTTypeMvtCaisse;
        TRecettes OTRecettes;

        try {
            // int int_price_support_by_customer = 0;
            TReglement OTReglement = OTPreenregistrementOld.getLgREGLEMENTID();
            String str_mode_operatoire = "";
            for (TPreenregistrementCompteClientTiersPayent OPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                TCompteClientTiersPayant OTCompteClientTiersPayant = OPreenregistrementCompteClientTiersPayent
                        .getLgCOMPTECLIENTTIERSPAYANTID();
                TTiersPayant OTTiersPayant = OTCompteClientTiersPayant.getLgTIERSPAYANTID();
                str_mode_operatoire = this.func_GetCustomerWorkflow(OTTiersPayant);
                OclientManager.addToMytransactionTiersPayent(OTCompteClientTiersPayant, OTPreenregistrement,
                        OPreenregistrementCompteClientTiersPayent.getIntPRICE() * (-1),
                        OPreenregistrementCompteClientTiersPayent.getIntPERCENT(), str_mode_operatoire,
                        OPreenregistrementCompteClientTiersPayent.getStrREFBON(),
                        OPreenregistrementCompteClientTiersPayent.getDblQUOTACONSOVENTE());
            }
            Integer int_price_support_by_customer = OTPreenregistrementOld.getIntCUSTPART() * (-1);

            if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals(Parameter.MODE_REGLEMENT_DIFERRE)) {

                TPreenregistrementCompteClient OTPreenregistrementCompteClient = OPreenregistrement
                        .getTPreenregistrementCompteClient(OTPreenregistrementOld.getLgPREENREGISTREMENTID());
                if (OTPreenregistrementCompteClient == null) {
                    buildErrorTraceMessage("Pas de vente liée à ce compte client associe au differe *** ");
                    return false;
                }

                if (OTPreenregistrementCompteClient.getIntPRICE() >= 0) {
                    if (OTPreenregistrementCompteClient.getIntPRICE() == 0) {
                        OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES,
                                this.getOdataManager());
                        OTRecettes = OcaisseManagement
                                .AddRecette(new Double((OTPreenregistrementCompteClient.getIntPRICE()) + ""),
                                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                                        OTPreenregistrement.getLgPREENREGISTREMENTID(), amount_remis, amount_recu,
                                        OTPreenregistrement.getLgPREENREGISTREMENTID(),
                                        OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID()
                                                .getLgTYPEREGLEMENTID(),
                                        Parameter.KEY_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_ANNULE_VENTE,
                                        OTReglement.getLgREGLEMENTID(),
                                        OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(),
                                        lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                        commonparameter.TRANSACTION_DEBIT, true);

                        if (OTRecettes == null) {
                            this.buildErrorTraceMessage("Echec de retrait du montant de la caisse");
                            return false;
                        }
                    }
                    //
                    new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(
                            OTPreenregistrementCompteClient.getLgCOMPTECLIENTID(), OTPreenregistrement,
                            OTPreenregistrementCompteClient.getIntPRICE() * (-1),
                            OTPreenregistrementCompteClient.getIntPRICERESTE() * (-1));

                }
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                        this.getOdataManager());

                // OcaisseManagement.AddRecette(new Double(OTPreenregistrementCompteClient.getIntPRICERESTE() + ""),
                // Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                // Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID,
                // str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                // commonparameter.TRANSACTION_CREDIT); //a decommenter en cas de probleme. 18/05/2016
                // code ajouté 18/05/2016
                if (amount_recu != 0) {
                    new logger().OCategory.info("différé ");
                    OcaisseManagement.AddRecette(new Double(OTPreenregistrementCompteClient.getIntPRICE() + ""),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), amount_remis, amount_recu,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(),
                            OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
                            Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE, Parameter.KEY_TASK_ANNULE_VENTE,
                            OTReglement.getLgREGLEMENTID(),
                            OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(),
                            lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                            commonparameter.TRANSACTION_DEBIT, true);
                }
                // fin code ajouté 18/05/2016

                OcaisseManagement.AddRecette(
                        new Double(OPreenregistrement
                                .getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID()) + ""),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), amount_remis, amount_recu,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(),
                        OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
                        bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                        OTReglement.getLgREGLEMENTID(),
                        OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID(),
                        lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        commonparameter.TRANSACTION_CREDIT, (amount_recu == 0 ? false : true)); // a decommenter en cas
                                                                                                // de probleme
                                                                                                // 28/06/2016
                // OcaisseManagement.AddRecette(new
                // Double(OPreenregistrement.getTotalPartTierPayantByVente(OTPreenregistrementOld.getLgPREENREGISTREMENTID())
                // + ""), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                // bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                // lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                // OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_DEBIT);
                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
                OTPreenregistrement.setIntCUSTPART(int_price_support_by_customer);
                this.getOdataManager().getEm().merge(OTPreenregistrement);
                // fin code ajouté
            } else {
                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                        this.getOdataManager());
                new logger().OCategory
                        .info("Dans les ventes ordonnancées non différé " + int_price_support_by_customer);
                if (OTPreenregistrementOld.getIntCUSTPART() > 0) {
                    // new logger().OCategory.info("int_price_support_by_customer > 0 " +
                    // int_price_support_by_customer);

                    OTPreenregistrement.setIntCUSTPART(int_price_support_by_customer);

                    OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                            new Double((-1) * int_price_support_by_customer + ""),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), amount_remis, amount_recu,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(),
                            OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
                            bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                            OTReglement.getLgREGLEMENTID(), str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                            OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_DEBIT, true);
                    new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                            new Double(OPreenregistrement.getTotalPartTierPayantByVente(
                                    OTPreenregistrementOld.getLgPREENREGISTREMENTID()) + ""),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), amount_remis, amount_recu,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(),
                            OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
                            bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                            OTReglement.getLgREGLEMENTID(), str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                            OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);

                    if (OTRecettes == null) {
                        this.buildErrorTraceMessage("Impossible de cloture la vente", "la recette n'a pas pu etre MAJ");
                        return false;
                    }
                } else {
                    OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                            new Double(OPreenregistrement.getTotalPartTierPayantByVente(
                                    OTPreenregistrementOld.getLgPREENREGISTREMENTID()) + ""),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), amount_remis, amount_recu,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(),
                            OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
                            bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
                            OTReglement.getLgREGLEMENTID(), str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                            OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);

                    if (OTRecettes == null) {
                        this.buildErrorTraceMessage("Impossible de cloture la vente",
                                "la recette du differe n'a pas pu etre MAJ");
                        return false;
                    }
                }
            }
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            // fin code ajouté pour la gestion des recettes
            // OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
            // bll.common.Parameter.KEY_VENTE_ORDONNANCE, bll.common.Parameter.KEY_TASK_ANNULE_VENTE,
            // OTReglement.getLgREGLEMENTID(), str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
            // OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);
            new Preenregistrement(this.getOdataManager(), this.getOTUser()).CloturerAnnulerVente(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrementOld.getStrREFBON(),
                    OTReglement.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(),
                    OTPreenregistrementOld.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                    OTPreenregistrementOld.getIntPRICE() * (-1), amount_recu, amount_remis,
                    OTReglement.getLgREGLEMENTID(), str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                    OTPreenregistrementOld.getStrORDONNANCE(), int_price_support_by_customer, OTPreenregistrementOld);
            // fin code ajouté

            this.buildTraceMessage("Succes", " Operation effectuee avec succes");
        } catch (Exception e) {
            throw new Exception(e.getLocalizedMessage());
        }
        return true;
    }

}
