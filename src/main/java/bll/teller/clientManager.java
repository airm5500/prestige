/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.teller;

import bll.common.Parameter;
import dal.TVille;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TUser;
import bll.common.errorEnumm;
import bll.preenregistrement.Preenregistrement;
import dal.TRemise;
import dal.dataManager;
import dal.jconnexion;
import java.sql.CallableStatement;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class clientManager extends bll.bllBase {

    Object Otable = TClient.class;

    public clientManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    public boolean isAuthorize(TCompteClient OTCompteClient, String lg_PREENREGISTREMENT_ID,
            String lg_TYPE_REGLEMENT_ID) {
        double db_cust_solde = GetcustBalance(OTCompteClient.getLgCOMPTECLIENTID());
        int int_Total_vente = new Preenregistrement(this.getOdataManager(), this.getOTUser())
                .GetVenteTotal(lg_PREENREGISTREMENT_ID);
        double dbl_Total_vente = new Double(int_Total_vente + "");
        // verrifiation de lautoo
        // date de recouvrement echue
        // plafond de vente sur un montant
        // verifi solde
        if (db_cust_solde < dbl_Total_vente) // verrif du droit au type ddfdfd
        {
            new logger().OCategory.info(" *** votre solde " + db_cust_solde
                    + "   est inferieur au montant de la vente  *** " + dbl_Total_vente);
            return false;
        }
        return true;
    }

    public boolean isAuthorize(TCompteClient OTCompteClient, int int_Total_vente) {
        double db_cust_solde = GetcustBalance(OTCompteClient.getLgCOMPTECLIENTID());
        // int int_Total_vente = new Preenregistrement(this.getOdataManager(),
        // this.getOTUser()).GetVenteTotal(lg_PREENREGISTREMENT_ID);
        double dbl_Total_vente = new Double(int_Total_vente + "");
        // verrifiation de lautoo
        // date de recouvrement echue
        // plafond de vente sur un montant
        // verifi solde
        if (db_cust_solde < dbl_Total_vente) // verrif du droit au type ddfdfd
        {
            new logger().OCategory.info(" *** votre solde " + db_cust_solde
                    + "   est inferieur au montant de la vente  *** " + dbl_Total_vente);
            return false;
        }
        return true;
    }

    private double GetcustBalance(String lg_COMPTE_CLIENT_ID) {
        double cust_balance = 0;

        TCompteClient OTCompteClient = (TCompteClient) this.find(lg_COMPTE_CLIENT_ID, new TCompteClient());
        if (OTCompteClient == null) {
            new logger().OCategory.info(" *** Desole le compte est inexistant *** ");
            return cust_balance;
        }
        cust_balance = OTCompteClient.getDecBalance();
        new logger().OCategory.info(" *** Le solde de ce compte est de  *** " + cust_balance);

        return cust_balance;
    }

    public Boolean addToMytransactionTiersPayent(TCompteClientTiersPayant OTCompteClientTiersPayant,
            String lg_PREENREGISTREMENT_ID, int dbl_Amount, int int_percent, String str_mode_operatoire) {
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        TCompteClient OTCompteClient = null;

        List<TPreenregistrementCompteClientTiersPayent> lstTemp = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        TPreenregistrementCompteClientTiersPayent oTPreenregistrementCompteClientTiersPayent = null;
        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        if (OTCompteClientTiersPayant == null) {
            this.buildErrorTraceMessage("ERROR", "Desole OTCompteClientTiersPayant est null");
            return null;
        }

        if (str_mode_operatoire.equals(bll.common.Parameter.KEY_CUSTOMER_PREPAYE)) {
            this.debiterCompteClient(Ojconnexion, OTCompteClientTiersPayant.getLgCOMPTECLIENTID(), dbl_Amount);
        }
        Ojconnexion.CloseConnexion();

        lstTemp = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = ?1  AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?3")
                .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID())
                .setParameter(3, OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID()).getResultList();

        new logger().OCategory.info("  lstTemp clientmanager   " + lstTemp.size());

        OTCompteClient = this.getTCompteClient(OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTIERSPAYANTID());

        if (lstTemp == null || lstTemp.isEmpty()) {

            oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
            oTPreenregistrementCompteClientTiersPayent
                    .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

            oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
            oTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
            oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);

            new logger().OCategory.info(" *** Amount vente  *** " + dbl_Amount);
            oTPreenregistrementCompteClientTiersPayent.setIntPRICE(dbl_Amount);
            oTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(dbl_Amount);
            oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
            // oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(OTCompteClientTiersPayant.getIntPOURCENTAGE());
            oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_percent);
            oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);

            // code ajouté 18/08/2016
            if (OTCompteClientTiersPayant.getDblPLAFOND() != 0) {
                OTCompteClientTiersPayant
                        .setDblQUOTACONSOMENSUELLE(OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() + dbl_Amount);
                OTCompteClientTiersPayant.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
            }
            if (OTCompteClient != null && OTCompteClient.getDblPLAFOND() != 0) {
                OTCompteClient.setDblQUOTACONSOMENSUELLE(OTCompteClient.getDblQUOTACONSOMENSUELLE() + dbl_Amount);
                OTCompteClient.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTCompteClient);
            }
            // fin code ajouté 18/08/2016

            this.persiste(oTPreenregistrementCompteClientTiersPayent);

            // OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
            // this.persiste(OTPreenregistrement); a decommenté en cas de problème
            this.buildErrorTraceMessage("ERROR", "Desole pas de preenregistrement compte client tiers payant");

            return false;
        } else if (!lstTemp.isEmpty() && null != lstTemp) {
            for (int i = 0; i < lstTemp.size(); i++) {
                oTPreenregistrementCompteClientTiersPayent = lstTemp.get(i);
                oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                new logger().OCategory.info(" *** Amount vente add transaction tp  *** " + dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setIntPRICE(dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
                oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_percent);
                oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);

                // code ajouté 18/08/2016
                if (OTCompteClientTiersPayant.getDblPLAFOND() != 0) {
                    OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(
                            OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() + dbl_Amount);
                    OTCompteClientTiersPayant.setDtUPDATED(new Date());
                    this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
                }
                if (OTCompteClient != null && OTCompteClient.getDblPLAFOND() != 0) {
                    OTCompteClient.setDblQUOTACONSOMENSUELLE(OTCompteClient.getDblQUOTACONSOMENSUELLE() + dbl_Amount);
                    OTCompteClient.setDtUPDATED(new Date());
                    this.getOdataManager().getEm().merge(OTCompteClient);
                }
                // fin code ajouté 18/08/2016

                this.persiste(oTPreenregistrementCompteClientTiersPayent);
            }
            return true;
        }
        return false;
    }

    public boolean addToMytransactionTiersPayent(TCompteClientTiersPayant OTCompteClientTiersPayant,
            TPreenregistrement OTPreenregistrement, int dbl_Amount, int int_percent, String str_mode_operatoire,
            String str_REF_BON, double dbl_QUOTA_CONSO_VENTE) {

        TCompteClient OTCompteClient;
        TPreenregistrementCompteClientTiersPayent oTPreenregistrementCompteClientTiersPayent;
        boolean result = false;
        try {

            OTCompteClient = this.getTCompteClient(OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTIERSPAYANTID());
            oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
            oTPreenregistrementCompteClientTiersPayent
                    .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());
            oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
            oTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
            oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
            oTPreenregistrementCompteClientTiersPayent.setIntPRICE(dbl_Amount);
            oTPreenregistrementCompteClientTiersPayent.setIntPRICERESTE(dbl_Amount);
            oTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REF_BON);
            oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
            oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(int_percent);
            oTPreenregistrementCompteClientTiersPayent.setDblQUOTACONSOVENTE(dbl_QUOTA_CONSO_VENTE);
            oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);

            // code ajouté 18/08/2016
            if (OTCompteClientTiersPayant.getDblPLAFOND() != 0) {
                OTCompteClientTiersPayant
                        .setDblQUOTACONSOMENSUELLE((OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() != null
                                ? OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() : 0) + dbl_Amount);
                OTCompteClientTiersPayant.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);
            }
            if (OTCompteClient != null && OTCompteClient.getDblPLAFOND() != 0) {
                OTCompteClient.setDblQUOTACONSOMENSUELLE(OTCompteClient.getDblQUOTACONSOMENSUELLE() + dbl_Amount);
                OTCompteClient.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTCompteClient);
            }
            // fin code ajouté 18/08/2016

            this.getOdataManager().getEm().persist(oTPreenregistrementCompteClientTiersPayent);

            if (str_mode_operatoire.equals(bll.common.Parameter.KEY_CUSTOMER_PREPAYE)) {
                jconnexion Ojconnexion = new jconnexion();
                Ojconnexion.initConnexion();
                Ojconnexion.OpenConnexion();
                this.debiterCompteClient(Ojconnexion, OTCompteClientTiersPayant.getLgCOMPTECLIENTID(), dbl_Amount);
                Ojconnexion.CloseConnexion();
            }

            this.buildSuccesTraceMessage("Ajout du tiers payant " + oTPreenregistrementCompteClientTiersPayent
                    .getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrFULLNAME() + " effectué avec succès");

            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente");
        }
        return result;
    }

    // recuperation d'un compte client
    public TCompteClient getTCompteClient(String P_KEY) {
        TCompteClient OTCompteClient = null;
        try {
            OTCompteClient = (TCompteClient) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, P_KEY).setParameter(2, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTCompteClient;
    }

    // fin recuperation d'un compte client
    public Boolean addToMytransactionTiersPayent(List<TCompteClientTiersPayant> lstTCompteClientTiersPayant,
            String lg_PREENREGISTREMENT_ID, int dbl_Amount, String str_mode_operatoire) {
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<>();
        List<TPreenregistrementCompteClientTiersPayent> lstTemp = new ArrayList<>();
        TPreenregistrementCompteClientTiersPayent oTPreenregistrementCompteClientTiersPayent = null;
        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        int int_total_vente = 0;

        /*
         * lstTCompteClientTiersPayant = this.getOdataManager().getEm().
         * createQuery("SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?1  AND t.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2  AND t.strSTATUT LIKE ?3"
         * ). setParameter(1, OTCompteClient.getLgCOMPTECLIENTID()) .setParameter(2, lg_TIERS_PAYANT_ID)
         * .setParameter(3, commonparameter.statut_enable) .getResultList();
         */
        if (lstTCompteClientTiersPayant == null) {
            this.buildErrorTraceMessage("ERROR", "Desole lstTCompteClientTiersPayant est null");
            return null;
        }

        if (lstTCompteClientTiersPayant.isEmpty()) {
            this.buildErrorTraceMessage("ERROR", "Desole lstTCompteClientTiersPayant est vide");
            return null;
        }
        TCompteClient OTCompteClient = lstTCompteClientTiersPayant.get(0).getLgCOMPTECLIENTID();
        new logger().OCategory
                .info(" clientmanager OTCompteClient  " + OTCompteClient.getLgCLIENTID().getStrFIRSTNAME());
        if (str_mode_operatoire.equals(bll.common.Parameter.KEY_CUSTOMER_PREPAYE)) {
            this.debiterCompteClient(Ojconnexion, OTCompteClient, dbl_Amount);
        }
        Ojconnexion.CloseConnexion();
        for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) {
            OTCompteClientTiersPayant = lstTCompteClientTiersPayant.get(k);
            lstTemp = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = ?1  AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?3")
                    .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID())
                    // .setParameter(2, commonparameter.statut_is_Process)
                    .setParameter(3, OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID()).getResultList();

            lstT.addAll(lstTemp);

        }
        if (lstT == null || lstT.isEmpty()) {
            for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) {
                oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                oTPreenregistrementCompteClientTiersPayent
                        .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

                oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
                oTPreenregistrementCompteClientTiersPayent
                        .setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(k));
                oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);

                new logger().OCategory.info(" *** Amount vente  *** " + dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setIntPRICE(dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
                oTPreenregistrementCompteClientTiersPayent
                        .setIntPERCENT(lstTCompteClientTiersPayant.get(k).getIntPOURCENTAGE());
                oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);
                // update du solde du tier payant
                this.persiste(oTPreenregistrementCompteClientTiersPayent);

                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
                this.persiste(OTPreenregistrement);

                this.buildErrorTraceMessage("ERROR", "Desole pas de preenregistrement compte client tiers payant");

            }
            return false;
        }

        if (!lstT.isEmpty() && lstT.size() == lstTCompteClientTiersPayant.size()) {
            for (int i = 0; i < lstT.size(); i++) {
                oTPreenregistrementCompteClientTiersPayent = lstT.get(i);
                oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                oTPreenregistrementCompteClientTiersPayent
                        .setLgCOMPTECLIENTTIERSPAYANTID(lstT.get(i).getLgCOMPTECLIENTTIERSPAYANTID());
                oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);

                new logger().OCategory.info(" *** Amount vente  *** " + dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setIntPRICE(dbl_Amount);
                oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
                oTPreenregistrementCompteClientTiersPayent
                        .setIntPERCENT(lstTCompteClientTiersPayant.get(i).getIntPOURCENTAGE());
                oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);
                // update du solde du tier payant
                this.persiste(oTPreenregistrementCompteClientTiersPayent);

                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
                this.persiste(OTPreenregistrement);

            }
            return true;
        } else {
            for (int q = 0; q < lstTCompteClientTiersPayant.size(); q++) {
                // il rech un preenregistrement compte client tiers payant
                // sil trouve il fait maj sinon il cree
                OTCompteClientTiersPayant = lstTCompteClientTiersPayant.get(q);
                try {
                    oTPreenregistrementCompteClientTiersPayent = (TPreenregistrementCompteClientTiersPayent) this
                            .getOdataManager().getEm()
                            .createQuery(
                                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = ?1 AND t.strSTATUT = ?2 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?3")
                            .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID())
                            .setParameter(2, commonparameter.statut_is_Process)
                            .setParameter(3, OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID())
                            .getSingleResult();

                    oTPreenregistrementCompteClientTiersPayent
                            .setIntPERCENT(OTCompteClientTiersPayant.getIntPOURCENTAGE());
                    oTPreenregistrementCompteClientTiersPayent.setIntPRICE(dbl_Amount);
                    oTPreenregistrementCompteClientTiersPayent
                            .setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
                    oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
                    oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                    this.persiste(oTPreenregistrementCompteClientTiersPayent);
                } catch (Exception e) {

                    oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                    oTPreenregistrementCompteClientTiersPayent
                            .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

                    oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
                    oTPreenregistrementCompteClientTiersPayent
                            .setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(q));
                    oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);

                    oTPreenregistrementCompteClientTiersPayent
                            .setIntPRICE(OTCompteClientTiersPayant.getIntPOURCENTAGE());
                    oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
                    oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(dbl_Amount);
                    oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Process);
                    // update du solde du tier payant
                    this.persiste(oTPreenregistrementCompteClientTiersPayent);
                }

            }
        }
        return false;
    }

    public void addToMytransaction(TCompteClient OTCompteClient, String lg_PREENREGISTREMENT_ID) {

        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        if (OTPreenregistrement == null) {
            return;
        }
        // this.addToMytransaction(OTCompteClient, lg_PREENREGISTREMENT_ID, OTPreenregistrement.getIntPRICE());
        this.addToMytransactionBis(OTCompteClient, lg_PREENREGISTREMENT_ID, OTPreenregistrement.getIntPRICE());
    }

    public boolean addToMytransaction(TCompteClient OTCompteClient, TPreenregistrement OTPreenregistrement,
            Integer int_PRICE, Integer int_DETTE) {
        boolean result = false;
        try {
            TPreenregistrementCompteClient oTPreenregistrementCompteClient = new TPreenregistrementCompteClient();
            oTPreenregistrementCompteClient.setLgPREENREGISTREMENTCOMPTECLIENTID(this.getKey().getComplexId());
            oTPreenregistrementCompteClient.setDtCREATED(new Date());
            oTPreenregistrementCompteClient.setLgCOMPTECLIENTID(OTCompteClient);
            oTPreenregistrementCompteClient.setLgPREENREGISTREMENTID(OTPreenregistrement);
            oTPreenregistrementCompteClient.setLgUSERID(this.getOTUser());
            oTPreenregistrementCompteClient.setIntPRICE(int_PRICE);
            oTPreenregistrementCompteClient.setIntPRICERESTE(int_DETTE);
            oTPreenregistrementCompteClient.setStrSTATUT(commonparameter.statut_is_Closed);

            this.getOdataManager().getEm().persist(oTPreenregistrementCompteClient);
            this.debiterCompteClient(OTCompteClient, 0, int_DETTE);
            if (int_PRICE >= 0) {
                this.debiterCompteClient(this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), int_DETTE, 0);//
            } else {
                this.debiterCompteClient(this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), 0,
                        (-1) * int_DETTE);
            }
            result = true;
        } catch (Exception e) {
        }

        return result;
    }

    public boolean debiterCompteClient(TCompteClient OTCompteClient, Integer int_AMOUNT_DISPO,
            Integer int_AMOUNT_INDISPO) {
        boolean result = false;

        try {
            OTCompteClient.setDecbalanceDisponible(OTCompteClient.getDecbalanceDisponible() + int_AMOUNT_DISPO);
            OTCompteClient.setDecBalanceInDisponible(OTCompteClient.getDecBalanceInDisponible() + int_AMOUNT_INDISPO);
            this.getOdataManager().getEm().merge(OTCompteClient);
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    // ajout de la transaction sans controle du solde
    public boolean addToMytransactionBis(TCompteClient OTCompteClient, String lg_PREENREGISTREMENT_ID, int int_PRICE) {
        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        this.refresh(OTCompteClient);
        // if (OTCompteClient.getDecBalance() < int_PRICE) {
        // error_def = errorEnumm.SOLDE_INSUFISANT.name();
        // this.buildErrorTraceMessage("Solde inferieur");
        // return false;
        // }

        TPreenregistrementCompteClient oTPreenregistrementCompteClient = new TPreenregistrementCompteClient();
        oTPreenregistrementCompteClient.setLgPREENREGISTREMENTCOMPTECLIENTID(this.getKey().getComplexId());
        oTPreenregistrementCompteClient.setDtCREATED(new Date());
        oTPreenregistrementCompteClient.setLgCOMPTECLIENTID(OTCompteClient);
        oTPreenregistrementCompteClient.setLgPREENREGISTREMENTID(OTPreenregistrement);

        oTPreenregistrementCompteClient.setIntPRICE(int_PRICE);
        oTPreenregistrementCompteClient.setStrSTATUT(commonparameter.statut_is_Closed);
        this.persiste(oTPreenregistrementCompteClient);
        // update du pre enregistrement
        OTPreenregistrement.setIntPRICEREMISE(int_PRICE);
        this.persiste(OTPreenregistrement);
        // update du solde
        this.debiterCompteClient(Ojconnexion, OTCompteClient, int_PRICE);

        Ojconnexion.CloseConnexion();
        // OTCompteClient.setDecBalance(OTCompteClient.getDecBalance() - oTPreenregistrementCompteClient.getIntPRICE());
        // this.persiste(OTCompteClient);
        return true;
    }
    // fin ajout de la transaction sans controle du solde

    // Ajouter d un tier payant au compte client
    public void addTTiersPayant(String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID, int int_POURCENTAGE) {
        TCompteClient OTCompteClient = (TCompteClient) this.find(lg_COMPTE_CLIENT_ID, new TCompteClient());
        TTiersPayant OTTiersPayant = (TTiersPayant) this.find(lg_TIERS_PAYANT_ID, new TTiersPayant());
        TCompteClientTiersPayant OTCompteClientTiersPayant = new TCompteClientTiersPayant();
        OTCompteClientTiersPayant.setLgCOMPTECLIENTTIERSPAYANTID(this.getKey().getComplexId());
        OTCompteClientTiersPayant.setLgTIERSPAYANTID(OTTiersPayant);
        OTCompteClientTiersPayant.setLgCOMPTECLIENTID(OTCompteClient);
        OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
        OTCompteClientTiersPayant.setDtCREATED(new Date());
        OTCompteClientTiersPayant.setIntPOURCENTAGE(int_POURCENTAGE);
        this.persiste(OTCompteClientTiersPayant);
    }

    public void create(String str_CODE_INTERNE, String str_FIRST_NAME, String str_LAST_NAME,
            String str_NUMERO_SECURITE_SOCIAL, Date dt_NAISSANCE, String str_SEXE, String str_ADRESSE,
            String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL, String str_COMMENTAIRE,
            String lg_RISQUE_ID, String lg_VILLE_ID) {
        try {

            TClient OTClient = new TClient();

            OTClient.setLgCLIENTID(this.getKey().getComplexId());
            OTClient.setStrCODEINTERNE(str_CODE_INTERNE);
            OTClient.setStrFIRSTNAME(str_FIRST_NAME);
            OTClient.setStrLASTNAME(str_LAST_NAME);
            OTClient.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTClient.setDtNAISSANCE(dt_NAISSANCE);
            OTClient.setStrSEXE(str_SEXE);
            OTClient.setStrADRESSE(str_ADRESSE);
            OTClient.setStrDOMICILE(str_DOMICILE);
            OTClient.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTClient.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTClient.setStrCOMMENTAIRE(str_COMMENTAIRE);

            /*
             * TRisque OTRisque = this.getOdataManager().getEm().find(TRisque.class, lg_RISQUE_ID); if (OTRisque ==
             * null) { this.buildErrorTraceMessage("Impossible de creer un " + Otable, " Ref RISQUE : " + OTRisque +
             * "  Invalide "); return; } OTClient.setLgRISQUEID(OTRisque);
             */
            TVille OTVille = this.getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        " Ref VILLE : " + OTVille + "  Invalide ");
                return;
            }
            OTClient.setLgVILLEID(OTVille);

            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtCREATED(new Date());

            this.persiste(OTClient);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_CLIENT_ID, String str_CODE_INTERNE, String str_FIRST_NAME, String str_LAST_NAME,
            String str_NUMERO_SECURITE_SOCIAL, Date dt_NAISSANCE, String str_SEXE, String str_ADRESSE,
            String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL, String str_COMMENTAIRE,
            String lg_RISQUE_ID, String lg_VILLE_ID) {

        try {

            TClient OTClient = null;

            OTClient = getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);

            OTClient.setStrCODEINTERNE(str_CODE_INTERNE);
            OTClient.setStrFIRSTNAME(str_FIRST_NAME);
            OTClient.setStrLASTNAME(str_LAST_NAME);
            OTClient.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTClient.setDtNAISSANCE(dt_NAISSANCE);
            OTClient.setStrSEXE(str_SEXE);
            OTClient.setStrADRESSE(str_ADRESSE);
            OTClient.setStrDOMICILE(str_DOMICILE);
            OTClient.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTClient.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTClient.setStrCOMMENTAIRE(str_COMMENTAIRE);

            // TRisque
            try {

                // lg_RISQUE_ID
                /*
                 * dal.TRisque OTRisque = getOdataManager().getEm().find(dal.TRisque.class, lg_RISQUE_ID); if (OTRisque
                 * != null) { OTClient.setLgRISQUEID(OTRisque); new logger().oCategory.info("lg_RISQUE_ID     Create   "
                 * + lg_RISQUE_ID); }
                 */
                // lg_VILLE_ID
                dal.TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
                if (OTVille != null) {
                    OTClient.setLgVILLEID(OTVille);
                    new logger().oCategory.info("lg_VILLE_ID     Create   " + lg_VILLE_ID);
                }

            } catch (Exception e) {

                new logger().oCategory
                        .info("Impossible de mettre a jour les donnees vennant de la cle etrangere TRisque   ");
            }

            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtUPDATED(new Date());

            this.persiste(OTClient);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }

    }

    public void delete(String lg_CLIENT_ID) {

        try {

            TClient OTClient = null;

            OTClient = getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);

            OTClient.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTClient);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de supprimer un " + Otable, e.getMessage());
        }

    }

    public List<TClient> getAllClient() {

        List<dal.TClient> lstTClient = null;

        try {

            lstTClient = getOdataManager().getEm().createQuery("SELECT t FROM TClient t WHERE  t.strSTATUT LIKE ?1 ")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info(lstTClient.size());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.buildSuccesTraceMessage("Client(s) Existant(s)   :: " + lstTClient);
            return lstTClient;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Client Inexistant ", e.getMessage());
            return lstTClient;
        }

    }

    public List<TClient> getClientByRisque(String lg_RISQUE_ID) {

        List<dal.TClient> lstTClient = null;

        try {

            lstTClient = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TClient t WHERE t.lgCLIENTID LIKE ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, "%" + lg_RISQUE_ID + "%").setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            new logger().OCategory.info(lstTClient.size());

            for (TClient lstTClient1 : lstTClient) {
                this.refresh(lstTClient1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTClient);
            return lstTClient;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTClient;
        }

    }

    public List<TClient> getClientByVille(String lg_VILLE_ID) {

        List<dal.TClient> lstTClient = null;

        try {

            lstTClient = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TClient t WHERE t.lgCLIENTID LIKE ?1 AND t.strSTATUT LIKE ?2")
                    .setParameter(1, "%" + lg_VILLE_ID + "%").setParameter(2, commonparameter.statut_enable)
                    .getResultList();
            new logger().OCategory.info(lstTClient.size());

            for (TClient lstTClient1 : lstTClient) {
                this.refresh(lstTClient1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTClient);
            return lstTClient;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTClient;
        }

    }

    public List<TClient> getClientByRisque_Ville(String lg_RISQUE_ID, String lg_VILLE_ID) {

        List<dal.TClient> lstTClient = null;

        try {

            lstTClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TClient t WHERE t.lgCLIENTID LIKE ?1 AND t.lgVILLEID LIKE ?2 AND t.strSTATUT LIKE ?3")
                    .setParameter(1, "%" + lg_RISQUE_ID + "%").setParameter(2, "%" + lg_VILLE_ID + "%")
                    .setParameter(3, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info(lstTClient.size());

            for (TClient lstTClient1 : lstTClient) {
                this.refresh(lstTClient1);
            }

            this.buildSuccesTraceMessage("Produit(s) Existant(s)   :: " + lstTClient);
            return lstTClient;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Produit Inexistant ", e.getMessage());
            return lstTClient;
        }

    }

    public void crediterCompteClient(TCompteClient OTCompteClient, int int_amount) {
        jconnexion Ojconnexion = new jconnexion();
        Ojconnexion.initConnexion();
        Ojconnexion.OpenConnexion();
        this.crediteAccount(Ojconnexion, this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), OTCompteClient,
                int_amount);
        Ojconnexion.CloseConnexion();

    }

    public void crediterCompteClient(jconnexion Ojconnexion, TCompteClient OTCompteClient, int int_amount) {

        this.crediteAccount(Ojconnexion, this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), OTCompteClient,
                int_amount);

    }

    public void debiterCompteClient(jconnexion Ojconnexion, TCompteClient OTCompteClient, int int_amount) {
        // this.crediteAccount(Ojconnexion, OTCompteClient, this.GetSystemeCompte(), int_amount); // a decommenter en
        // cas de probleme
        this.crediteAccount(Ojconnexion, OTCompteClient, this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(),
                int_amount);
    }

    public void crediteAccount(jconnexion Ojconnexion, TCompteClient DebitTCompteClient,
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

    public void crediteAccount(TCompteClient DebitTCompteClient, TCompteClient CreditTCompteClient, int int_amount) {
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            this.crediteAccount(Ojconnexion, DebitTCompteClient, CreditTCompteClient, int_amount);
            Ojconnexion.CloseConnexion();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("cannot do transaction  " + e.getMessage().toString());

        }
    }

    private TCompteClient GetSystemeCompte() {
        TCompteClient OTCompteClient = (TCompteClient) this.find("3", new TCompteClient());
        return OTCompteClient;
    }

    public int GetCustPart(String ref_vente, int int_percentage) {
        int int_cust_part = 0;
        int int_tiers_part = 0;
        int int_total_vente = 0;
        int int_result = 0;
        int dbl_total_remise = 0;// dbl_total_vente =
                                 // OPreenregistrement.GetVenteTotalAmountTTc(OTPreenregistrement.getLgPREENREGISTREMENTID());//OTPreenregistrement.getIntPRICE().doubleValue();

        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());
        TPreenregistrement OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(ref_vente);

        int_total_vente = OPreenregistrement.GetVenteTotalAmountTTc(ref_vente);
        int_tiers_part = (int_total_vente * int_percentage) / 100;
        new logger().OCategory.info(" @@@@@@@@  Le Tiers Payant supporte  @@@@@@@@   " + int_tiers_part);
        dbl_total_remise = (int) OPreenregistrement.GetTotalAmountRemise(ref_vente);

        int int_reste = int_total_vente - int_tiers_part;
        int int_reste_final = 0;
        if (int_reste <= 0) {
            return int_result;
        } else {
            // code ajouté. a retirer en cas de probleme
            TRemise OTRemise = OPreenregistrement.GetRemiseToApply(OTPreenregistrement.getLgREMISEID());
            if (OTRemise != null) {
                if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equalsIgnoreCase(Parameter.TYPE_REMISE_CLIENT)) {
                    dbl_total_remise = (int) ((int_reste * OTRemise.getDblTAUX()) / 100);
                }
            }

            // fin code ajouté
            int_reste_final = int_reste - dbl_total_remise;
            if (int_reste_final <= 0) {
                return int_result;
            } else {
                int_result = int_reste_final;
                return int_result;
            }

        }

    }

    public int GetCustPart(int coutvente, int int_percentage) {

        int int_tiers_part = 0;
        int int_result = 0;

        int_tiers_part = (coutvente * int_percentage) / 100;
        new logger().OCategory.info(" @@@@@@@@  Le Tiers Payant supporte  @@@@@@@@   " + int_tiers_part);

        int int_reste = coutvente - int_tiers_part;
        int int_reste_final = 0;
        if (int_reste <= 0) {
            return int_result;
        } else {
            int_reste_final = int_reste;
            if (int_reste_final <= 0) {
                return int_result;
            } else {
                int_result = int_reste_final;
                return int_result;
            }

        }

    }

    // 22 04 2017
    public boolean add2Mytransaction(TCompteClient OTCompteClient, TPreenregistrement OTPreenregistrement,
            int int_PRICE, int int_DETTE) {
        boolean result = false;
        try {
            TPreenregistrementCompteClient oTPreenregistrementCompteClient = new TPreenregistrementCompteClient();
            oTPreenregistrementCompteClient.setLgPREENREGISTREMENTCOMPTECLIENTID(this.getKey().getComplexId());
            oTPreenregistrementCompteClient.setDtCREATED(new Date());
            oTPreenregistrementCompteClient.setLgCOMPTECLIENTID(OTCompteClient);
            oTPreenregistrementCompteClient.setLgPREENREGISTREMENTID(OTPreenregistrement);
            oTPreenregistrementCompteClient.setLgUSERID(this.getOTUser());
            oTPreenregistrementCompteClient.setIntPRICE(int_PRICE);
            oTPreenregistrementCompteClient.setIntPRICERESTE(int_DETTE);
            oTPreenregistrementCompteClient.setStrSTATUT(commonparameter.statut_is_Closed);
            this.getOdataManager().getEm().persist(oTPreenregistrementCompteClient);
            this.debiterCompteClient(OTCompteClient, 0, int_DETTE);
            if (int_PRICE >= 0) {
                this.debiterCompteClient(this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), int_DETTE, 0);//
            } else {
                this.debiterCompteClient(this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), 0,
                        (-1) * int_DETTE);
            }
            result = true;
        } catch (Exception e) {
        }

        return result;
    }

}
