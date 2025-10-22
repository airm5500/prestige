/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.preenregistrement;

import bll.common.Parameter;
import bll.configManagement.CalendrierManager;
import bll.configManagement.EmplacementManagement;
import bll.configManagement.familleManagement;
import bll.differe.DiffereManagement;
import bll.entity.EntityData;
import bll.entity.Journalvente;

import bll.printer.DriverPrinter;
import bll.stockManagement.StockManager;
import bll.teller.SnapshotManager;
import bll.teller.caisseManagement;
import bll.teller.clientManager;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import bll.userManagement.user;
import bll.utils.TparameterManager;
import bll.warehouse.WarehouseManager;
import dal.TAyantDroit;
import dal.TCashTransaction;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TDepenses;
import dal.TEmplacement;
import dal.TFacture;
import dal.TFactureDetail;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TGrilleRemise;
import dal.THistorypreenregistrement;
import dal.TModeReglement;
import dal.TNatureVente;
import dal.TOfficine;
import dal.TOutboudMessage;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TRecettes;
import dal.TReglement;
import dal.TRemise;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TTypeVente;
import dal.TUser;
import dal.TWorkflowRemiseArticle;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import javax.persistence.NoResultException;
import javax.persistence.TemporalType;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import toolkits.parameters.commonparameter;
import toolkits.utils.Maths;
import toolkits.utils.StringComplexUtils.DataStringManager;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;

import bll.commandeManagement.suggestionManagement;
import dal.AnnulationSnapshot;
import dal.TFamilleStock_;
import dal.TFamille_;

import dal.TMouvement;
import dal.TMouvementSnapshot;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TPromotionProduct;
import dal.TTiersPayant;
import dal.TTypeStockFamille;
import dal.TUser_;
import dal.TZoneGeographique;
import dal.TZoneGeographique_;
import java.sql.Timestamp;
import java.text.ParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.ParameterMode;
import javax.persistence.Query;
import javax.persistence.StoredProcedureQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import toolkits.utils.StringUtils;
import util.Afficheur;
import util.DateConverter;

/**
 *
 * @author MARTIAL
 */
public class Preenregistrement extends bll.bllBase {

    public Preenregistrement(dataManager OdataManager, TUser OTuser) {
        super.setOTUser(OTuser);
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    // do_event_log
    public boolean log(String ID_INSCRIPTION, String str_DESCRIPTION, String str_CREATED_BY, String str_STATUT,
            String str_TABLE_CONCERN, String str_MODULE_CONCERN, String ID_ANNEE_SCOLAIRE) {
        try {
            StoredProcedureQuery q = this.getOdataManager().getEm().createStoredProcedureQuery("proc_logfile");

            q.registerStoredProcedureParameter("lg_EVENT_LOG_ID", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("MATRICULE_ELEVE", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_DESCRIPTION", Integer.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_TABLE_CONCERN", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_MODULE_CONCERN", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_CREATED_BY", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_STATUT", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_TYPE_LOG", Integer.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("lg_USER_ID", Integer.class, ParameterMode.IN);
            q.setParameter("lg_EVENT_LOG_ID", this.getKey().gettimeid());

            q.setParameter("ID_INSCRIPTION", ID_INSCRIPTION);
            q.setParameter("str_DESCRIPTION", str_DESCRIPTION);
            q.setParameter("str_STATUT", str_STATUT);
            q.setParameter("str_TABLE_CONCERN", str_TABLE_CONCERN);
            q.setParameter("str_CREATED_BY", str_CREATED_BY);
            q.setParameter("str_MODULE_CONCERN", str_MODULE_CONCERN);
            q.setParameter("str_TYPE_LOG", ID_ANNEE_SCOLAIRE);
            q.setParameter("lg_USER_ID", this.getOTUser().getLgUSERID());

            return q.execute();

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    // public String buildVenteRef(Date ODate) { //ancienne bonne version. a decommenter en cas de probleme.
    public String buildVenteRefBis(Date ODate, String KEY_PARAMETER) throws JSONException {
        // TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_LAST_ORDER_NUMBER");
        // // a decommenter en cas de probleme
        String str_code = "", str_lasd = "", str_actd = "", str_last_code = "";
        THistorypreenregistrement OHistorypreenregistrement = null;
        try {

            TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, KEY_PARAMETER);
            TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = this.getOdataManager().getEm().find(TParameters.class,
                    "KEY_SIZE_ORDER_NUMBER");
            this.refresh(OTParameters);

            String jsondata = OTParameters.getStrVALUE();
            int int_last_code = 0;
            int_last_code = int_last_code + 1;

            new logger().OCategory.info("jsondata =  " + jsondata);
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);

            int_last_code = new Integer(jsonObject.getString("int_last_code"));
            Date dt_last_date = date.stringToDate(jsonObject.getString("str_last_date"), date.formatterMysqlShort2);

            str_lasd = this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort2);
            str_actd = this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2);

            Calendar now = Calendar.getInstance();
            int hh = now.get(Calendar.HOUR_OF_DAY);
            int mois = now.get(Calendar.MONTH) + 1;
            int jour = now.get(Calendar.DAY_OF_MONTH);
            try {
                OHistorypreenregistrement = this.getTHistorypreenregistrement(ODate);
            } catch (Exception e) {
            }

            if (!str_lasd.equals(str_actd)) {
                // int_last_code = 0; // a decommenter en cas de probleme 27/05/2016
                // code ajouté 27/05/2016. a retirer en cas de probleme
                int_last_code = 0;

                if (OHistorypreenregistrement == null) {
                    int intsize = ((int_last_code + 1) + "").length();
                    int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
                    str_last_code = "";
                    for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                        str_last_code = str_last_code + "0";
                    }

                    str_last_code = str_last_code + (int_last_code + 1) + "";
                    new logger().OCategory.info("str_last_code:" + str_last_code);
                    OHistorypreenregistrement = this.createTHistorypreenregistrement(str_last_code, ODate, 1);
                } else {
                    int_last_code = OHistorypreenregistrement.getIntLASTNUMBER();
                    int intsize = ((int_last_code + 1) + "").length();
                    int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());

                    for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                        str_last_code = str_last_code + "0";
                    }

                    str_last_code = str_last_code + (int_last_code + 1) + "";
                    OHistorypreenregistrement.setIntLASTNUMBER(int_last_code + 1);
                    OHistorypreenregistrement.setStrREF(str_last_code);
                    OHistorypreenregistrement.setDtUPDATED(new Date());
                    this.getOdataManager().getEm().merge(OHistorypreenregistrement);

                    // send sms to pharmacien
                    this.log(commonparameter.ALL,
                            "Modification de date à la vente par " + this.getOTUser().getStrFIRSTNAME() + " "
                                    + this.getOTUser().getStrLASTNAME() + ". Ancienne date: "
                                    + this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort)
                                    + ". Nouvelle date: "
                                    + this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort),
                            this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                            commonparameter.statut_enable, "TPreenregistrement", "Vente",
                            "Modification de date à la vente");
                }
                // fin code ajouté 27/05/2016
            } else if (OHistorypreenregistrement == null) {

                int intsize = ((int_last_code + 1) + "").length();
                int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
                str_last_code = "";
                for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                    str_last_code = str_last_code + "0";
                }

                str_last_code = str_last_code + (int_last_code + 1) + "";
                new logger().OCategory.info("str_last_code:" + str_last_code);
                OHistorypreenregistrement = this.createTHistorypreenregistrement(str_last_code, ODate, 1);
            } else {
                int_last_code = OHistorypreenregistrement.getIntLASTNUMBER();
                int intsize = ((int_last_code + 1) + "").length();
                int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());

                for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                    str_last_code = str_last_code + "0";
                }

                str_last_code = str_last_code + (int_last_code + 1) + "";
                OHistorypreenregistrement.setIntLASTNUMBER(int_last_code + 1);
                OHistorypreenregistrement.setStrREF(str_last_code);
                OHistorypreenregistrement.setDtUPDATED(new Date());
                this.getOdataManager().getEm().persist(OHistorypreenregistrement);

            }

            new logger().OCategory.info(int_last_code + "  " + dt_last_date);
            // KEY_SIZE_ORDER_NUMBER

            str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

            JSONObject json = new JSONObject();
            JSONArray arrayObj = new JSONArray();
            json.put("int_last_code", str_last_code);
            json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
            arrayObj.put(json);
            String jsonData = arrayObj.toString();

            OTParameters.setStrVALUE(jsonData);
            this.getOdataManager().getEm().merge(OTParameters);
        } catch (Exception e) {
            e.printStackTrace();

        }
        System.out.println("******************* " + str_code + "*********");
        return str_code;

    }

    public String UpdateParameters(Date ODate, String KEY_PARAMETER, String lastNumber) throws JSONException {
        // TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_LAST_ORDER_NUMBER");
        // // a decommenter en cas de probleme
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, KEY_PARAMETER);
        TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = this.getOdataManager().getEm().find(TParameters.class,
                "KEY_SIZE_ORDER_NUMBER");
        // this.refresh(OTParameters);
        String jsondata = OTParameters.getStrVALUE();
        int int_last_code = 0;
        new logger().OCategory.info("jsondata =  " + jsondata);
        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);
            int_last_code = new Integer(lastNumber);
            new logger().OCategory.info(int_last_code + " ");
        } catch (Exception e) {
            e.printStackTrace();
        }

        // KEY_SIZE_ORDER_NUMBER
        Calendar now = Calendar.getInstance();
        int hh = now.get(Calendar.HOUR_OF_DAY);
        int mois = now.get(Calendar.MONTH) + 1;
        int jour = now.get(Calendar.DAY_OF_MONTH);
        int intsize = ((int_last_code + 1) + "").length();
        int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
        String str_last_code = "";
        for (int i = 0; i < (intsize_tobuild - intsize); i++) {
            str_last_code = str_last_code + "0";
        }

        str_last_code = str_last_code + (int_last_code + 1) + "";

        String str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", str_last_code);
        json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        OTParameters.setStrVALUE(jsonData);
        this.getOdataManager().getEm().merge(OTParameters);

        new logger().OCategory.info(jsonData);
        new logger().OCategory.info(str_code);
        return str_code;
    }

    public int GetTotalDetail(int int_price_article, int int_qte) {
        int int_total_detail = 0;
        int_total_detail = int_price_article * int_qte;
        return int_total_detail;
    }
    // ancien bon code
    // public TPreenregistrementDetail CreateDetailsPreenregistrement(String lg_PREENREGISTREMENT_ID, String
    // lg_famille_id, int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
    // ArrayList<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_REMISE_ID, Date dt_CREATED, int
    // int_PRICE_INIT) {

    public TPreenregistrementDetail CreateDetailsPreenregistrement(String lg_PREENREGISTREMENT_ID, String lg_famille_id,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            ArrayList<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_REMISE_ID, Date dt_CREATED,
            int int_PRICE_INIT, int int_quantite_avoir, int int_FREE_PACK_NUMBER) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        TPreenregistrement OTPreenregistrement = null;
        TTypeVente OTTypeVente = null;
        TFamille OTFamille = null;
        String str_type = "";
        int int_vente_amount = 0;
        TRemise OTRemise = null;
        TGrilleRemise OTGrilleRemise = null;
        int int_remise_price = 0;

        try {
            OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
            OTFamille = this.FindFamilleSold(lg_famille_id);
            OTTypeVente = (TTypeVente) this.find(lg_type_vente_id, new TTypeVente());
            OTPreenregistrementDetail = this.findFamilleInTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_famille_id);

            if (OTPreenregistrementDetail == null) {
                OTPreenregistrementDetail = new TPreenregistrementDetail();
                OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
                OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
                OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
                // code ajouté
                OTPreenregistrementDetail.setIntPRICE(this.GetTotalDetail(int_PRICE_INIT, int_quantite));// à
                                                                                                         // décommenter
                                                                                                         // en cas de
                                                                                                         // probleme
                OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_INIT);
                // fin code ajouté
                OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
                OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
                OTPreenregistrementDetail.setIntAVOIR(int_quantite_avoir);

                OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
                OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
                OTPreenregistrementDetail.setDtUPDATED(new Date());
            } else {
                // OTPreenregistrementDetail.setIntPRICE(OTPreenregistrementDetail.getIntPRICE() +
                // (this.GetTotalDetail(OTFamille.getIntPRICE(), int_quantite))); // a décommenter en cas de probleme
                // code ajouté
                OTPreenregistrementDetail.setIntPRICE(OTPreenregistrementDetail.getIntPRICE()
                        + (this.GetTotalDetail(OTPreenregistrementDetail.getIntPRICEUNITAIR(), int_quantite)));
                // fin code ajouté
                OTPreenregistrementDetail.setIntQUANTITY(OTPreenregistrementDetail.getIntQUANTITY() + int_quantite);
                OTPreenregistrementDetail
                        .setIntQUANTITYSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_quantite);
                OTPreenregistrementDetail.setIntAVOIR(int_quantite_avoir);
                // OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntAVOIRSERVED() +
                // int_quantite);
                OTPreenregistrementDetail.setDtUPDATED(new Date());
            }
            OTPreenregistrementDetail.setIntAVOIRSERVED(0);
            OTPreenregistrementDetail.setBISAVOIR(OTPreenregistrementDetail.getIntAVOIR() == 0 ? false : true);

            // OTPreenregistrementDetail.getLgPREENREGISTREMENTID().setBISAVOIR(false);
            OTPreenregistrementDetail.setIntFREEPACKNUMBER(int_FREE_PACK_NUMBER);
            // OTPreenregistrementDetail.getLgPREENREGISTREMENTID().setBISAVOIR(false);

            // new logger().OCategory.info(" creation de OTPreenregistrement Details ------ ***** ----- ");
            this.persiste(OTPreenregistrementDetail);

            OTRemise = this.GetRemiseToApply(lg_REMISE_ID);
            if (OTRemise != null) {
                OTPreenregistrement.setLgREMISEID(OTRemise.getLgREMISEID());

                this.persiste(OTPreenregistrement);

                // code ajoute
                int int_remise_temp = 0;
                if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equalsIgnoreCase(Parameter.TYPE_REMISE_CLIENT)) {
                    int_remise_temp = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTRemise.getDblTAUX()) / 100);

                } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID()
                        .equalsIgnoreCase(Parameter.TYPE_REMISE_PRODUCT)) {
                    OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(OTPreenregistrement,
                            OTPreenregistrementDetail.getLgFAMILLEID());
                    if (OTGrilleRemise != null) {
                        if (this.CheckifRemiseisAllowed(OTGrilleRemise.getLgREMISEID())) {
                            int_remise_temp = this.GetAmountRemiseByDetails(
                                    OTPreenregistrementDetail.getLgPREENREGISTREMENTDETAILID(),
                                    OTTypeVente.getLgTYPEVENTEID());
                            OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                        }
                    }
                }
                new logger().OCategory.info("int_remise_temp   create details  " + int_remise_temp);
                OTPreenregistrementDetail.setIntPRICEREMISE(int_remise_temp);
                this.persiste(OTPreenregistrementDetail);
                // fin code ajoute
            }
            new logger().OCategory.info("int_remise_price   create details 194 " + int_remise_price);
            new WarehouseManager(this.getOdataManager(), this.getOTUser()).updateVirtualStock(OTPreenregistrementDetail,
                    OTPreenregistrementDetail.getIntQUANTITY(), "ins");

            // new logger().OCategory.info(" creation de OTPreenregistrementDetail " +
            // OTPreenregistrementDetail.getLgPREENREGISTREMENTDETAILID());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            if (OTTypeVente.getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {
                str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
            }
            OTPreenregistrement.setStrTYPEVENTE(str_type);
            int_vente_amount = this.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID());
            // new logger().OCategory.info("int_vente_amount preenregistrement " + int_vente_amount);

            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setIntPRICE(int_vente_amount);
            this.persiste(OTPreenregistrement);

            if (str_type.equals(bll.common.Parameter.KEY_VENTE_ORDONNANCE)) {
                // new logger().OCategory.info("188 str_type = " + str_type);
                if (!LstTCompteClientTiersPayant.isEmpty()) {

                    this.WorkflowPreenregistrement(LstTCompteClientTiersPayant, OTPreenregistrement, int_vente_amount);
                }
            }

            // try {
            // DisplayerManager ODisplayerManager = new DisplayerManager();
            // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
            // 0, 20));
            // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
            // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
            // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
            // ODisplayerManager.close();
            // } catch (Exception e) {
            // e.printStackTrace();
            // }
            return OTPreenregistrementDetail;
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("impossible de creer OTPreenregistrementDetail   " + e.toString());
            return null;
        }
    }
    // ancien bon code

    public void WorkflowPreenregistrement(ArrayList<TCompteClientTiersPayant> lstTCompteClientTiersPayant,
            TPreenregistrement OTPreenregistrement, int dbl_Amount) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        ArrayList<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        List<TPreenregistrementCompteClientTiersPayent> lstTemp = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        int tp_taux = 0;
        int Amount_tampon_init = 0;
        int int_price = 0;
        int Amount_to_check = 0;
        int Amount_final = 0;
        int Amount_tampon = 0;

        int dbl_Amount_final = 0;
        // new logger().OCategory.info(" 7777 cloture vente amount 7777 " + dbl_Amount);

        TPreenregistrementCompteClientTiersPayent oTPreenregistrementCompteClientTiersPayent = null;
        if (lstTCompteClientTiersPayant == null || lstTCompteClientTiersPayant.isEmpty()) {
            this.buildErrorTraceMessage("Désolé aucun tiers payant n'est associé au client en cours");
            return;
        }

        // new logger().OCategory.info(" lstTCompteClientTiersPayant size " + lstTCompteClientTiersPayant.size());
        for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) {
            OTCompteClientTiersPayant = lstTCompteClientTiersPayant.get(k);
            lstTemp = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = ?1 AND t.strSTATUT = ?2 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?3")
                    .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID())
                    .setParameter(2, commonparameter.statut_is_Process)
                    .setParameter(3, OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID()).getResultList();

            lstT.addAll(lstTemp);
        }
        // new logger().OCategory.info(" 223 lstT " + lstT.size());

        if (lstT == null || lstT.isEmpty()) {
            // new logger().OCategory.info(" 226 lstT is null ");
            this.buildErrorTraceMessage("ERROR", "Desole pas de preenregistrement compte client tiers payant");
            for (int j = lstTCompteClientTiersPayant.size(); --j >= 0;) {
                if (lstTCompteClientTiersPayant.get(j).getIntPOURCENTAGE() == null) {
                    tp_taux = 0;
                } else {
                    tp_taux = lstTCompteClientTiersPayant.get(j).getIntPOURCENTAGE();
                }
                // new logger().OCategory.info(" tp ds workflow " +
                // lstTCompteClientTiersPayant.get(j).getLgTIERSPAYANTID().getStrFULLNAME() + " tp_taux ds workflow " +
                // tp_taux);
                dbl_Amount_final = this.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID())
                        + dbl_Amount_final;
                // new logger().OCategory.info(" --------WWWWW +dbl_Amount_final " + dbl_Amount_final);
                Amount_final = dbl_Amount_final - Amount_to_check;
                if (int_price <= Amount_final) {
                    int_price = (dbl_Amount_final * tp_taux) / 100;
                } else {
                    int_price = Amount_final;
                }
                Amount_tampon = int_price + Amount_tampon;
                Amount_to_check = Amount_tampon;
                oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                oTPreenregistrementCompteClientTiersPayent
                        .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

                oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
                oTPreenregistrementCompteClientTiersPayent
                        .setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(j));
                oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
                oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
                oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());

                // new logger().OCategory.info(" *** Amount vente *** " + int_price);
                oTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_price);
                oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Process);
                // update du solde du tier payant
                this.persiste(oTPreenregistrementCompteClientTiersPayent);
            }
            return;
        }

        /*
         * if (!lstT.isEmpty() && lstT.size() == lstTCompteClientTiersPayant.size()) { for (int i = 0; i < lstT.size();
         * i++) { oTPreenregistrementCompteClientTiersPayent = lstT.get(i); if
         * (oTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getIntPOURCENTAGE() == null) {
         * tp_taux = 0; } else { tp_taux =
         * oTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID().getIntPOURCENTAGE(); } // int
         * int_price = (dbl_Amount * tp_taux) / 100;
         *
         * Amount_final = dbl_Amount - Amount_to_check; if (int_price <= Amount_final) { int_price = (dbl_Amount *
         * tp_taux) / 100; } else { int_price = Amount_final; } Amount_tampon = int_price + Amount_tampon;
         * Amount_to_check = Amount_tampon; oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
         * oTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_price);
         * oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
         * oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
         * oTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(lstT.get(i).
         * getLgCOMPTECLIENTTIERSPAYANTID()); this.persiste(oTPreenregistrementCompteClientTiersPayent);
         *
         * } } else
         */
        if (!lstT.isEmpty() && lstT.size() != lstTCompteClientTiersPayant.size()) {
            for (int q = lstTCompteClientTiersPayant.size(); --q >= 0;) {
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
                    /*
                     * if (OTCompteClientTiersPayant.getIntPOURCENTAGE() == null) { tp_taux = 0; } else { tp_taux =
                     * lstTCompteClientTiersPayant.get(q).getIntPOURCENTAGE(); }
                     *
                     * Amount_final = dbl_Amount - Amount_to_check; if (int_price <= Amount_final) { int_price =
                     * (dbl_Amount * tp_taux) / 100; } else { int_price = Amount_final; } Amount_tampon = int_price +
                     * Amount_tampon; Amount_to_check = Amount_tampon;
                     *
                     * oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
                     * oTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_price);
                     * oTPreenregistrementCompteClientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(
                     * OTCompteClientTiersPayant);
                     * oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);
                     * oTPreenregistrementCompteClientTiersPayent.setDtUPDATED(new Date());
                     * this.persiste(oTPreenregistrementCompteClientTiersPayent);
                     */
                } catch (Exception e) {
                    if (lstTCompteClientTiersPayant.get(q).getIntPOURCENTAGE() == null) {
                        tp_taux = 0;
                    } else {
                        tp_taux = lstTCompteClientTiersPayant.get(q).getIntPOURCENTAGE();
                    }

                    Amount_final = dbl_Amount - Amount_to_check;
                    if (int_price <= Amount_final) {
                        int_price = (dbl_Amount * tp_taux) / 100;
                    } else {
                        int_price = Amount_final;
                    }

                    Amount_tampon = int_price + Amount_tampon;
                    Amount_to_check = Amount_tampon;

                    oTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
                    oTPreenregistrementCompteClientTiersPayent
                            .setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(this.getKey().getComplexId());

                    oTPreenregistrementCompteClientTiersPayent.setDtCREATED(new Date());
                    oTPreenregistrementCompteClientTiersPayent
                            .setLgCOMPTECLIENTTIERSPAYANTID(lstTCompteClientTiersPayant.get(q));
                    oTPreenregistrementCompteClientTiersPayent.setLgPREENREGISTREMENTID(OTPreenregistrement);

                    new logger().OCategory.info(" *** Amount vente  *** " + int_price);
                    oTPreenregistrementCompteClientTiersPayent.setIntPRICE(int_price);
                    oTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
                    oTPreenregistrementCompteClientTiersPayent.setIntPERCENT(tp_taux);
                    oTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Process);
                    // update du solde du tier payant
                    this.persiste(oTPreenregistrementCompteClientTiersPayent);
                }

            }
        }
    }

    public String buildRef(Date ODate, String KEY_PARAMETER) throws JSONException {
        // TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_LAST_ORDER_NUMBER");
        // // a decommenter en cas de probleme
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, KEY_PARAMETER);
        TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = this.getOdataManager().getEm().find(TParameters.class,
                "KEY_SIZE_ORDER_NUMBER");
        this.refresh(OTParameters);

        String jsondata = OTParameters.getStrVALUE();
        int int_last_code = 0;
        int_last_code = int_last_code + 1;

        new logger().OCategory.info("jsondata =  " + jsondata);
        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);

            int_last_code = new Integer(jsonObject.getString("int_last_code"));
            Date dt_last_date = date.stringToDate(jsonObject.getString("str_last_date"), date.formatterMysqlShort2);

            String str_lasd = this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort2);
            String str_actd = this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2);

            if (!str_lasd.equals(str_actd)) {
                int_last_code = 0;
            }

            new logger().OCategory.info(int_last_code + "  " + dt_last_date);

        } catch (Exception e) {
            e.printStackTrace();
        }

        // KEY_SIZE_ORDER_NUMBER
        Calendar now = Calendar.getInstance();
        int hh = now.get(Calendar.HOUR_OF_DAY);
        int mois = now.get(Calendar.MONTH) + 1;
        int jour = now.get(Calendar.DAY_OF_MONTH);
        int intsize = ((int_last_code + 1) + "").length();
        int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
        String str_last_code = "";
        for (int i = 0; i < (intsize_tobuild - intsize); i++) {
            str_last_code = str_last_code + "0";
        }

        str_last_code = str_last_code + (int_last_code + 1) + "";

        String str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", str_last_code);
        json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        OTParameters.setStrVALUE(jsonData);
        this.getOdataManager().getEm().merge(OTParameters);

        return str_code;
    }

    public String buildRef(Date ODate, String KEY_PARAMETER, EntityManager em) throws JSONException {

        TParameters OTParameters = em.find(TParameters.class, KEY_PARAMETER);
        TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = em.find(TParameters.class, "KEY_SIZE_ORDER_NUMBER");

        String jsondata = OTParameters.getStrVALUE();
        int int_last_code = 0;
        int_last_code = int_last_code + 1;
        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);
            int_last_code = new Integer(jsonObject.getString("int_last_code"));
            Date dt_last_date = date.stringToDate(jsonObject.getString("str_last_date"), date.formatterMysqlShort2);
            String str_lasd = this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort2);
            String str_actd = this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2);
            if (!str_lasd.equals(str_actd)) {
                int_last_code = 0;
            }

            new logger().OCategory.info(int_last_code + "  " + dt_last_date);

        } catch (Exception e) {
            e.printStackTrace();
        }

        // KEY_SIZE_ORDER_NUMBER
        Calendar now = Calendar.getInstance();
        int hh = now.get(Calendar.HOUR_OF_DAY);
        int mois = now.get(Calendar.MONTH) + 1;
        int jour = now.get(Calendar.DAY_OF_MONTH);
        int intsize = ((int_last_code + 1) + "").length();
        int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
        String str_last_code = "";
        for (int i = 0; i < (intsize_tobuild - intsize); i++) {
            str_last_code = str_last_code + "0";
        }

        str_last_code = str_last_code + (int_last_code + 1) + "";

        String str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", str_last_code);
        json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        OTParameters.setStrVALUE(jsonData);
        em.merge(OTParameters);

        return str_code;
    }

    public TPreenregistrementDetail findFamilleInTPreenregistrementDetail(String lg_PREENREGISTREMENT_ID,
            String lg_famille_id) {
        TPreenregistrementDetail OTPreenregistrementDetail = null;
        try {
            OTPreenregistrementDetail = (TPreenregistrementDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(1, lg_famille_id)
                    .setParameter(3, commonparameter.statut_is_Process).getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTPreenregistrementDetail;
    }

    public TPreenregistrementDetail findFamilleInTPreenregistrementDetail(String lg_PREENREGISTREMENT_ID,
            String lg_famille_id, String str_STATUT) {
        TPreenregistrementDetail OTPreenregistrementDetail = null;
        try {
            OTPreenregistrementDetail = (TPreenregistrementDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.strSTATUT LIKE ?3  ")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(1, lg_famille_id).setParameter(3, str_STATUT)
                    .getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTPreenregistrementDetail;
    }

    public TPreenregistrementDetail UpdateDetailsPreenregistrement(String lg_PREENREGISTREMENT_DETAIL_ID,
            String lg_PREENREGISTREMENT_ID, String lg_famille_id, int int_PRICE, int int_quantite,
            int int_quantite_served, String lg_type_vente_id, int int_vente_amount,
            ArrayList<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_remise_id) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        TGrilleRemise OTGrilleRemise = null;
        // int int_remise_price = 0; //a decommenter en cas de probleme
        int int_remise_price = 1;
        String str_statut_final = commonparameter.statut_is_Process;
        DiffereManagement ODiffereManagement = new DiffereManagement(this.getOdataManager(), this.getOTUser());
        TRemise OTRemise = null;
        int int_AVOIR_SERVED = 0;

        try {
            int int_ids = ODiffereManagement.GetIds();
            OTPreenregistrementDetail = this.getOdataManager().getEm().find(TPreenregistrementDetail.class,
                    lg_PREENREGISTREMENT_DETAIL_ID);

            // code ajouté
            if (new familleManagement(this.getOdataManager())
                    .checkpricevente(OTPreenregistrementDetail.getLgFAMILLEID(), int_PRICE)) {
                this.buildErrorTraceMessage("Impossible. Vérifiez le montant à modifier du prix de vente");
                return null;
            }

            if (OTPreenregistrementDetail.getIntPRICEUNITAIR() - int_PRICE != 0) {
                if (!ODiffereManagement.CheckUserIds(this.getOTUser(), int_ids)) {
                    this.buildErrorTraceMessage(ODiffereManagement.getDetailmessage());
                    return null;
                }
            }

            // fin code ajouté
            // Recup de lancienne qte
            int int_last_nb = OTPreenregistrementDetail.getIntQUANTITY(),
                    int_last_qs = OTPreenregistrementDetail.getIntQUANTITYSERVED();
            if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getBISAVOIR()
                    && int_last_qs > int_quantite_served) {
                this.buildErrorTraceMessage("QS ne doit pas etre superieur a QS de l'avoir");
                return OTPreenregistrementDetail;
            }
            OTPreenregistrementDetail.setLgPREENREGISTREMENTID(this.FindPreenregistrement(lg_PREENREGISTREMENT_ID));
            OTPreenregistrementDetail.setLgFAMILLEID(this.FindFamilleSold(lg_famille_id));

            // OTPreenregistrementDetail.setIntPRICE(this.GetTotalDetail(int_PRICE, int_quantite)); // a decommenter en
            // cas de probleme
            if (!OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getBISAVOIR()) {
                OTPreenregistrementDetail.setIntPRICE(this.GetTotalDetail(int_PRICE, int_quantite));
            }

            OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
            // code ajouté pour les avoirs
            /*
             * int_AVOIR_SERVED = int_quantite_served - OTPreenregistrementDetail.getIntAVOIRSERVED(); if
             * (OTPreenregistrementDetail.getIntAVOIRSERVED() == 0) { int_AVOIR_SERVED = int_quantite_served -
             * int_last_qs; }
             */
            int_AVOIR_SERVED = (int_quantite_served - int_last_qs) + OTPreenregistrementDetail.getIntAVOIRSERVED();
            new logger().OCategory.info("int_AVOIR_SERVED " + int_AVOIR_SERVED);
            if (int_quantite_served != int_last_qs) {
                OTPreenregistrementDetail
                        .setIntAVOIRSERVED(int_AVOIR_SERVED < 0 ? int_quantite_served : int_AVOIR_SERVED);
            }

            OTPreenregistrementDetail.setIntAVOIR(
                    OTPreenregistrementDetail.getIntQUANTITY() - OTPreenregistrementDetail.getIntQUANTITYSERVED());
            if (OTPreenregistrementDetail.getIntAVOIR() > 0) {
                if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT()
                        .equalsIgnoreCase(commonparameter.statut_is_Process)) {
                    OTPreenregistrementDetail.setBISAVOIR(true);
                }
            } else if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT()
                    .equalsIgnoreCase(commonparameter.statut_is_Process)) {
                OTPreenregistrementDetail.setBISAVOIR(false);
            }

            // code code ajouté pour les avoirs
            // OTPreenregistrementDetail.setStrSTATUT(str_statut_final); // a decommenter en cas de probleme
            OTPreenregistrementDetail.setStrSTATUT(OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT());
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            this.persiste(OTPreenregistrementDetail);
            /*
             * this.refresh(OTPreenregistrementDetail); new
             * logger().OCategory.info(" update de OTPreenregistrementDetail  " +
             * OTPreenregistrementDetail.getLgPREENREGISTREMENTDETAILID());
             */
            // code ajouté
            OTRemise = this.GetRemiseToApply(OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgREMISEID());
            if (OTRemise != null) {

                if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equalsIgnoreCase(Parameter.TYPE_REMISE_CLIENT)) {
                    int_remise_price = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTRemise.getDblTAUX()) / 100);

                } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID()
                        .equalsIgnoreCase(Parameter.TYPE_REMISE_PRODUCT)) {
                    OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(
                            OTPreenregistrementDetail.getLgPREENREGISTREMENTID(),
                            OTPreenregistrementDetail.getLgFAMILLEID());
                    if (OTGrilleRemise != null) {
                        if (this.CheckifRemiseisAllowed(OTGrilleRemise.getLgREMISEID())) {
                            int_remise_price = (this.GetAmountRemiseByDetails(
                                    OTPreenregistrementDetail.getLgPREENREGISTREMENTDETAILID(),
                                    OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID()
                                            .getLgTYPEVENTEID()));
                            OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                        }
                    }
                }
                new logger().OCategory.info("int_remise_price   create details  " + int_remise_price);
                OTPreenregistrementDetail.setIntPRICEREMISE(int_remise_price);
                this.persiste(OTPreenregistrementDetail);
            }

            // fin code ajouté
            // new WarehouseManager(this.getOdataManager(),
            // this.getOTUser()).updateVirtualStock(OTPreenregistrementDetail, (int_quantite - int_last_nb), "upd"); //
            // ancien bon code. a decommenter cas de probleme
            // code ajouté pour la gestion des avoir
            if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getBISAVOIR()) { // si vente avoir
                new WarehouseManager(this.getOdataManager(), this.getOTUser())
                        .updateVirtualStock(OTPreenregistrementDetail, (int_quantite - int_quantite_served), "upd");
            } else {
                new WarehouseManager(this.getOdataManager(), this.getOTUser())
                        .updateVirtualStock(OTPreenregistrementDetail, (int_quantite - int_last_nb), "upd");
            }
            // fin code ajouté pour la gestion des avoir

            // try {
            // DisplayerManager ODisplayerManager = new DisplayerManager();
            // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
            // 0, 20));
            // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
            // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
            // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
            // ODisplayerManager.close();
            // } catch (Exception e) {
            // }
            return OTPreenregistrementDetail;
        } catch (Exception e) {
            // OTPreenregistrementDetail = this.CreateDetailsPreenregistrement(lg_PREENREGISTREMENT_ID, lg_famille_id,
            // int_PRICE, int_quantite, int_quantite_served, lg_type_vente_id, LstTCompteClientTiersPayant,
            // lg_remise_id, new Date()); a decommenter en cas de probleme
            new logger().OCategory.info(" create de OTPreenregistrementDetail  "
                    + OTPreenregistrementDetail.getLgPREENREGISTREMENTDETAILID() + "    " + e.toString());
            this.buildErrorTraceMessage("ERROR", e.toString());
            return OTPreenregistrementDetail;
        }
    }

    public TPreenregistrementDetail FindDetailsPreenregistrement(String lg_PREENREGISTREMENT_DETAIL_ID) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;

        try {
            OTPreenregistrementDetail = this.getOdataManager().getEm().find(TPreenregistrementDetail.class,
                    lg_PREENREGISTREMENT_DETAIL_ID);

            new logger().OCategory.info("Succes OTPreenregistrementDetail trouve   "
                    + OTPreenregistrementDetail.getLgPREENREGISTREMENTID());
            return OTPreenregistrementDetail;
        } catch (NoResultException e) {
            new logger().OCategory.info("Error Detail inexistant   " + e.toString());
            return null;

        }

    }

    public TPreenregistrement FindPreenregistrement(String lg_PREENREGISTREMENT_ID) {
        new logger().OCategory.info(" *******  Recherche de  OTPreenregistrement ****** ");
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID, new TPreenregistrement());
            new logger().OCategory.info(" *******   OTPreenregistrement  Trouver   ****** "
                    + OTPreenregistrement.getLgPREENREGISTREMENTID());
        } catch (Exception e) {
            new logger().OCategory.info(" ** FindPreenregistrement  catch   ** " + e.toString());
            this.buildErrorTraceMessage("ERROR", e.toString());
        }

        return OTPreenregistrement;
    }

    public TPreenregistrementDetail FindTPreenregistrementDetail(String lg_PREENREGISTREMENT_DETAIL_ID) {
        new logger().OCategory.info("recherche de TPreenregistrementDetail");
        TPreenregistrementDetail OTPreenregistrementDetail = null;
        try {
            OTPreenregistrementDetail = (TPreenregistrementDetail) this.find(lg_PREENREGISTREMENT_DETAIL_ID,
                    new TPreenregistrementDetail());
        } catch (Exception e) {
            new logger().OCategory.info(e.toString());
        }
        return OTPreenregistrementDetail;
    }

    public TFamille FindFamilleSold(String lg_FAMILLE_ID) {

        TFamille OTFamille = null;

        try {
            OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);

            return OTFamille;
        } catch (NoResultException e) {
            new logger().OCategory.info("Error Famille inexistante   " + e.toString());
            return null;

        }

    }

    public TPreenregistrement DeletePreenregistrementDetail(String lg_PREENREGISTREMENT_DETAIL_ID) {
        TPreenregistrementDetail OTPreenregistrementDetail;
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrementDetail = this.FindTPreenregistrementDetail(lg_PREENREGISTREMENT_DETAIL_ID);
            OTPreenregistrement = OTPreenregistrementDetail.getLgPREENREGISTREMENTID();
            OTPreenregistrement
                    .setIntPRICE(OTPreenregistrement.getIntPRICE() - OTPreenregistrementDetail.getIntPRICE());
            OTPreenregistrement.setDtUPDATED(new Date());
            this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().remove(OTPreenregistrementDetail);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du produit de la vente");
        }

        return OTPreenregistrement;
    }

    public TPreenregistrement DeleteTPreenregistrement(String lg_PREENREGISTREMENT_ID) {
        TPreenregistrement OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
        List<TPreenregistrementDetail> lstT = this
                .getTPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID());
        for (int i = 0; i < lstT.size(); i++) {

            TPreenregistrementDetail OTPreenregistrementDetail = lstT.get(i);
            OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_delete);

            this.persiste(OTPreenregistrementDetail);
            this.refresh(OTPreenregistrementDetail);
            new WarehouseManager(this.getOdataManager(), this.getOTUser()).updateVirtualStock(OTPreenregistrementDetail,
                    OTPreenregistrementDetail.getIntQUANTITY(), "del");

        }
        OTPreenregistrement.setStrSTATUT(commonparameter.statut_delete);
        this.persiste(OTPreenregistrement);
        this.refresh(OTPreenregistrement);
        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        return OTPreenregistrement;
    }

    public TPreenregistrement addToPreenregistrement(String lg_PREENREGISTREMENT_ID, String lg_famille_id,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            ArrayList<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_REMISE_ID, double int_PRICE_INIT,
            int int_FREE_PACK_NUMBER) {

        return this
                .CreateDetailsPreenregistrement(lg_PREENREGISTREMENT_ID, lg_famille_id, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, LstTCompteClientTiersPayant, lg_REMISE_ID, new Date(),
                        (int) int_PRICE_INIT, (int_quantite - int_quantite_served), int_FREE_PACK_NUMBER)
                .getLgPREENREGISTREMENTID();

    }

    public TPreenregistrement updateToPreenregistrement(String lg_PREENREGISTREMENT_ID, String lg_famille_id,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            ArrayList<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_REMISE_ID, int int_PRICE_INIT,
            int int_FREE_PACK_NUMBER) {

        // TPreenregistrementDetail OTPreenregistrementDetail =(TPreenregistrementDetail)
        // this.find(lg_PREENREGISTREMENT_DETAIL_ID, new TPreenregistrementDetail());
        return this
                .CreateDetailsPreenregistrement(lg_PREENREGISTREMENT_ID, lg_famille_id, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, LstTCompteClientTiersPayant, lg_REMISE_ID, new Date(),
                        int_PRICE_INIT, (int_quantite - int_quantite_served), int_FREE_PACK_NUMBER)
                .getLgPREENREGISTREMENTID();

    }

    public List<TPreenregistrementDetail> getTPreenregistrementDetail(String lgPREENREGISTREMENTID) {
        List<TPreenregistrementDetail> lstT = new ArrayList<>();
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lgPREENREGISTREMENTID);
            if (OTPreenregistrement != null) {
                /*
                 * lstT = this.getOdataManager().getEm(). //a decommenter en cas de probleme 19/05/2016
                 * createQuery("SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 "
                 * ). setParameter(3, OTPreenregistrement.getStrSTATUT()). setParameter(4,
                 * OTPreenregistrement.getLgPREENREGISTREMENTID()). getResultList();
                 */
                lstT = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 ")
                        .setParameter(4, OTPreenregistrement.getLgPREENREGISTREMENTID()).getResultList();
            }

        } catch (Exception e) {
        }

        return lstT;
    }

    public List<TPreenregistrementDetail> getTPreenregistrementDetail(String lgPREENREGISTREMENTID, String lgUSERID,
            String strSTATUT) {
        List<TPreenregistrementDetail> lstT = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 ")
                .setParameter(3, strSTATUT).setParameter(4, lgPREENREGISTREMENTID).setParameter(5, lgUSERID)
                .getResultList();

        return lstT;
    }

    public TPreenregistrement CreatePreVente(String str_Medecin, String lg_TYPE_VENTE_ID, String lg_NATURE_VENTE_ID,
            String lg_REMISE_ID, Date dt_CREATED, String KEY_PARAMETER, TUser OTUserVendeur,
            String str_FIRST_NAME_CUSTOMER, String str_LAST_NAME_CUSTOMER) {
        TPreenregistrement OTPreenregistrement = new TPreenregistrement();
        TTypeVente OTTypeVente = null;
        TNatureVente oTNatureVente = null;
        TRemise OTRemise = null;
        try {
            OTTypeVente = this.getTypeVente(lg_TYPE_VENTE_ID);
            oTNatureVente = this.getTNatureVente(lg_NATURE_VENTE_ID);
            OTRemise = this.GetRemiseToApply(lg_REMISE_ID);
            if (OTTypeVente == null) {
                this.buildSuccesTraceMessage("Echec de l'enregistrement. Type de vente inexistant");
                return null;
            }
            if (oTNatureVente == null) {
                this.buildSuccesTraceMessage("Echec de l'enregistrement. Nature de vente inexistante");
                return null;
            }

            OTPreenregistrement.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            if (!KEY_PARAMETER.equalsIgnoreCase("")) {
                OTPreenregistrement.setStrREF(this.buildVenteRef(dt_CREATED, KEY_PARAMETER));
            } else {
                OTPreenregistrement.setStrREF(KEY_PARAMETER);
            }
            OTPreenregistrement.setLgREMISEID(OTRemise != null ? OTRemise.getLgREMISEID() : "");
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_CUSTOMER);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_CUSTOMER);
            OTPreenregistrement.setDtCREATED(dt_CREATED);
            OTPreenregistrement.setDtUPDATED(dt_CREATED);
            OTPreenregistrement.setStrMEDECIN(str_Medecin);
            OTPreenregistrement.setLgNATUREVENTEID(oTNatureVente);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);
            this.persiste(OTPreenregistrement);

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'enregistrement de la vente. Veuillez réessayer");
            new logger().OCategory.info("impossible de creer OTPreenregistrement   " + e.toString());
        }
        return OTPreenregistrement;
    }

    public TPreenregistrement CreatePreVente(String str_Medecin, String lg_TYPE_VENTE_ID, String lg_NATURE_VENTE_ID,
            String lg_REMISE_ID, String KEY_PARAMETER, String lg_USER_VENDEUR_ID, String str_FIRST_NAME_CUSTOMER,
            String str_LAST_NAME_CUSTOMER) {
        TUser OTUserVendeur = this.getUserById(lg_USER_VENDEUR_ID);
        return this.CreatePreVente(str_Medecin, lg_TYPE_VENTE_ID, lg_NATURE_VENTE_ID, lg_REMISE_ID, new Date(),
                KEY_PARAMETER, OTUserVendeur, str_FIRST_NAME_CUSTOMER, str_LAST_NAME_CUSTOMER);

    }

    public int GetVenteTotal(String lgPREENREGISTREMENTID) {
        int Total_vente = 0;
        List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID);
        for (int i = 0; i < lstT.size(); i++) {

            Total_vente = lstT.get(i).getIntPRICE() + Total_vente;
        }
        new logger().OCategory.info(" @@@@@@@@  Le total de la vente est de  @@@@@@@@   " + Total_vente);
        return Total_vente;
    }

    public int GetVenteTotalwithRemise(String lgPREENREGISTREMENTID, String str_statut) {
        int Total_vente_temp = 0;
        int Total_vente = 0;
        double total_remise = 0;
        int int_amount_remise = 0;

        List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID, str_statut);
        new logger().OCategory.info("List lstTFamille   " + lstT.size());

        for (TPreenregistrementDetail OTPreenregistrementDetail : lstT) {
            Total_vente_temp = OTPreenregistrementDetail.getIntPRICE() + Total_vente;
            if (OTPreenregistrementDetail.getLgFAMILLEID().getStrCODEREMISE() != null) {

                // total_remise =
                // this.GetTauxRemiseToApply(OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID(),
                // OTPreenregistrementDetail.getLgFAMILLEID().getLgREMISEID().getLgREMISEID(),
                // OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise; a decommenter en cas de probleme
                total_remise = this.GetTauxRemiseToApply(
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID(),
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgREMISEID(),
                        OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise;
                new logger().OCategory.info("total_remise to apply   " + total_remise);
                int_amount_remise = (int) (((OTPreenregistrementDetail.getIntPRICE() * total_remise) / 100)
                        + int_amount_remise);

            } else {
                int_amount_remise = 0;
            }
            Total_vente = Total_vente_temp - int_amount_remise;
        }

        new logger().OCategory.info(" @@@@@@@@  Le total de la vente est de  @@@@@@@@   " + Total_vente);
        return Total_vente;
    }

    public int GetVenteTotalAmountTTc(String lgPREENREGISTREMENTID) {
        int Total_vente_temp = 0;
        int Total_vente = 0;
        TPreenregistrement OTPreenregistrement = null;
        List<TPreenregistrementDetail> lstT = new ArrayList<TPreenregistrementDetail>();
        try {
            /*
             * OTPreenregistrement = this.getTPreenregistrementByRef(lgPREENREGISTREMENTID); //gestion des avoirs y
             * compris les modifications des prix if (OTPreenregistrement != null) { lstT =
             * this.getTPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID(),
             * OTPreenregistrement.getStrSTATUT()); new logger().OCategory.info("List lstTFamille   " + lstT.size());
             *
             * if (OTPreenregistrement.getBISAVOIR()) { new logger().OCategory.info("total amount avoir"); for
             * (TPreenregistrementDetail OTPreenregistrementDetail : lstT) { if(OTPreenregistrementDetail.getBISAVOIR())
             * { Total_vente += OTPreenregistrementDetail.getIntAVOIRSERVED() *
             * OTPreenregistrementDetail.getIntPRICEUNITAIR(); }
             *
             * } } else { for (TPreenregistrementDetail OTPreenregistrementDetail : lstT) { Total_vente_temp =
             * OTPreenregistrementDetail.getIntPRICE() + Total_vente; Total_vente = Total_vente_temp; } }
             *
             *
             * }
             */
            lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID);
            new logger().OCategory.info("List lstTFamille   " + lstT.size());
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstT) {
                Total_vente_temp = OTPreenregistrementDetail.getIntPRICE() + Total_vente;
                Total_vente = Total_vente_temp;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        new logger().OCategory.info(" @@@@@@@@  Le total de la vente est de  @@@@@@@@   " + Total_vente);
        return Total_vente;
    }

    public double GetTotalAmountRemise(String lgPREENREGISTREMENTID) {
        double dbl_amount_total = 0.0;
        List<TPreenregistrementDetail> lstT = new ArrayList<TPreenregistrementDetail>();
        try {
            lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID);
            for (int i = 0; i < lstT.size(); i++) {
                if (lstT.get(i).getIntPRICEREMISE() != null) {
                    dbl_amount_total = lstT.get(i).getIntPRICEREMISE() + dbl_amount_total;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory
                .info(" @@@@@@@@  Le Montant total des remises appliquees   @@@@@@@@   " + dbl_amount_total);
        return dbl_amount_total;
    }

    public double GetAmountRemise(String lgPREENREGISTREMENTID, String str_statut) {
        double total_remise = 0;
        int int_amount_remise = 0;

        List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID, str_statut);
        new logger().OCategory.info("List lstTFamille   " + lstT.size());

        for (TPreenregistrementDetail OTPreenregistrementDetail : lstT) {

            if (OTPreenregistrementDetail.getLgFAMILLEID().getStrCODEREMISE() != null) {

                // total_remise =
                // this.GetTauxRemiseToApply(OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID(),
                // OTPreenregistrementDetail.getLgFAMILLEID().getLgREMISEID().getLgREMISEID(),
                // OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise; // a decommenter en cas de probleme
                total_remise = this.GetTauxRemiseToApply(
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID(),
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgREMISEID(),
                        OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise;
                new logger().OCategory.info("total_remise to apply   " + total_remise);
                int_amount_remise = (int) (((OTPreenregistrementDetail.getIntPRICE() * total_remise) / 100)
                        + int_amount_remise);

            } else {
                int_amount_remise = 0;
            }

        }

        new logger().OCategory.info(" @@@@@@@@  Le total de la remise est de  @@@@@@@@   " + int_amount_remise);
        return int_amount_remise;
    }

    public int GetAmountRemiseByDetails(String lgPREENREGISTREMENTID_Details, String str_statut) {
        double total_remise = 0;
        int int_amount_remise = 0;

        TPreenregistrementDetail OTPreenregistrementDetail = new TPreenregistrementDetail();
        OTPreenregistrementDetail = (TPreenregistrementDetail) this.find(lgPREENREGISTREMENTID_Details,
                new TPreenregistrementDetail());
        if (OTPreenregistrementDetail != null) {
            if (OTPreenregistrementDetail.getLgFAMILLEID().getStrCODEREMISE() != null) {

                total_remise = this.GetTauxRemiseToApply(
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID(),
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgREMISEID(),
                        OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise;
                // new logger().OCategory.info("total_remise to apply " + total_remise);
                int_amount_remise = (int) (((OTPreenregistrementDetail.getIntPRICE() * total_remise) / 100)
                        + int_amount_remise);

            } else {
                int_amount_remise = 0;
            }

            // new logger().OCategory.info(" @@@@@@@@ Le total de la remise detail est de @@@@@@@@ " +
            // int_amount_remise);
            return int_amount_remise;
        } else {

        }
        return int_amount_remise;
    }

    public double GetTotalRemise(String lgPREENREGISTREMENTID) {

        double total_remise = 0;

        List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID);
        new logger().OCategory.info("List lstTFamille   " + lstT.size());

        for (TPreenregistrementDetail OTPreenregistrementDetail : lstT) {

            if (OTPreenregistrementDetail.getLgFAMILLEID().getStrCODEREMISE() != null) {
                total_remise = this.GetTauxRemiseToApply(
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID(),
                        null, OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise;
            } else {
                total_remise = 0;
            }

        }

        new logger().OCategory.info(" @@@@@@@@  Le total des remises de la vente est de  @@@@@@@@   " + total_remise);
        return total_remise;
    }

    public int GetProductTotal(String lgPREENREGISTREMENTID, String str_statut) {
        int Total_product = 0;
        List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID, str_statut);
        for (int i = 0; i < lstT.size(); i++) {

            Total_product = lstT.get(i).getIntQUANTITYSERVED() + Total_product;
        }
        new logger().OCategory.info(" @@@@@@@@  Le total de lproduit est de  @@@@@@@@   " + Total_product);
        return Total_product;
    }

    public TFamilleStock getTProductItemStock(TFamille OTProductItem) {
        TFamilleStock OTProductItemStock = null;
        try {

            OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 ")
                    .setParameter("1", OTProductItem.getLgFAMILLEID()).getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTProductItemStock;
    }

    public void AnnulerCloturerVente(String lg_PREENREGISTREMENT_ID) {

        String str_type = "";
        String str_reglement = "";
        TTypeMvtCaisse OTTypeMvtCaisse = null;
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        if (!OcaisseManagement.CheckResumeCaisse()) {
            this.buildErrorTraceMessage(OcaisseManagement.getDetailmessage());
            return;
        }

        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("Impossible de valider la commande",
                    "Ref commande inconnue " + lg_PREENREGISTREMENT_ID);
            return;
        }

        this.refresh(OTPreenregistrement);
        if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
            this.buildErrorTraceMessage("Impossible d annuler la commande",
                    "la commande a deja ete  " + this.getOTranslate().getValue(commonparameter.statut_is_Process));
            return;
        }

        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)
                || OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
            str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                    this.getOdataManager());

        } else {
            str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                    this.getOdataManager());

        }

        List<TCashTransaction> lstTCashTransaction = new ArrayList<>();
        lstTCashTransaction = this.getOdataManager().getEm()
                .createQuery(
                        "SELECT t FROM TCashTransaction t WHERE t.strRESSOURCEREF LIKE ?1  ORDER BY t.dtCREATED DESC  ")
                .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID()).getResultList();

        TTypeReglement OTTypeReglement = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgMODEREGLEMENTID()
                .getLgTYPEREGLEMENTID(); // this.getOdataManager().getEm().find(dal.TTypeReglement.class,
                                         // lstTCashTransaction.get(0).getLgTYPEREGLEMENTID().);

        if (OTTypeReglement == null) {

            new logger().OCategory.info(" *** Desole OTTypeReglement is null  *** ");

            return;
        } else {

            str_reglement = OTTypeReglement.getLgTYPEREGLEMENTID();

        }

        new logger().OCategory.info(" *** le type de reglement utilise est   *** " + str_reglement);

        String libItemOrder = this.getTOrderTransactionText(OTPreenregistrement.getLgPREENREGISTREMENTID());
        // Enregistrer la recette et la depense la transaction
        // Mise a jour du montant final sur la base du montant un paid
        // OTPreenregistrement.setIntPRICE(int_TOTAL_VENTE_RECAP);
        String Description = "ANNULATION . " + libItemOrder + " ";
        TDepenses OTDepenses = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddDepense(
                OTPreenregistrement.getIntPRICE().doubleValue(), Parameter.KEY_TYPE_DEPENSE_ANNULATION, Description,
                OTPreenregistrement.getLgPREENREGISTREMENTID(), lstTCashTransaction.get(0).getIntAMOUNTREMIS(),
                lstTCashTransaction.get(0).getIntAMOUNTRECU(), OTPreenregistrement.getLgPREENREGISTREMENTID(),
                str_reglement, bll.common.Parameter.KEY_TASK_VENTE, str_type, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                true);

        // (OTPreenregistrement.getIntPRICE().doubleValue(), Parameter.KEY_TYPE_DEPENSE_ANNULATION, Description,
        // OTPreenregistrement.getLgPREENREGISTREMENTID(), lstTCashTransaction.get(0).getIntAMOUNTREMIS(),
        // lstTCashTransaction.get(0).getIntAMOUNTRECU(), OTPreenregistrement.getLgPREENREGISTREMENTID(),
        // OTTypeReglement.getLgTYPEREGLEMENTID());
        List<TPreenregistrementDetail> lstTTPreenregistrementDetail = new ArrayList(
                OTPreenregistrement.getTPreenregistrementDetailCollection());
        new logger().OCategory.info("List size   " + lstTTPreenregistrementDetail.size());
        for (TPreenregistrementDetail OTPreenregistrementDetail : lstTTPreenregistrementDetail) {
            OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            this.persiste(OTPreenregistrementDetail);
            // rool back stock
            new WarehouseManager(this.getOdataManager(), this.getOTUser()).updateReelStock(OTPreenregistrementDetail,
                    OTPreenregistrementDetail.getIntQUANTITY(), "del");
        }

        OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Process);
        OTPreenregistrement.setDtUPDATED(new Date());
        this.persiste(OTPreenregistrement);
        this.refresh(OTPreenregistrement);

    }

    // code ajouté 11/10/2016
    public boolean CloturerVente(TPreenregistrement OTPreenregistrement, TTypeVente OTTypeVente, boolean b_WITHOUT_BON,
            String lg_TYPE_REGLEMENT_ID, TReglement OTReglement, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            int int_PART_TIERSPAYANT, TCompteClient OTCompteClient, String lg_USER_VENDEUR_ID, int int_TAUX) {
        boolean result = false;

        TTypeReglement OTTypeReglement;
        TUser OTUserVendeur;
        String lg_MOTIF_REGLEMENT_ID = "1";
        try {

            OTPreenregistrement.setBWITHOUTBON(b_WITHOUT_BON);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);

            // OTTypeReglement = this.getTTypeReglement(lg_TYPE_REGLEMENT_ID);
            OTTypeReglement = this.getOdataManager().getEm().getReference(TTypeReglement.class, lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Type de règlement inexistant");
                return result;
            }

            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);
            OTPreenregistrement.setLgREGLEMENTID(OTReglement);
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));
            // OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));

            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                    .getPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID()); // code ajouté
            this.closureProductVente(OTPreenregistrement, lstTPreenregistrementDetail, 0); // enregistrement de la
                                                                                           // cloture des produits

            if (!this.saveCashOfPurchase(OTTypeVente, OTPreenregistrement, OTReglement,
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                            ? OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()
                            : (int_TAUX == 100 ? 0
                                    : (OTPreenregistrement.getIntCUSTPART()
                                            - OTPreenregistrement.getIntPRICEREMISE() >= 0
                                                    ? OTPreenregistrement.getIntCUSTPART()
                                                            - OTPreenregistrement.getIntPRICEREMISE()
                                                    : 0)),
                    int_AMOUNT_RECU, int_AMOUNT_REMIS, OTTypeReglement.getLgTYPEREGLEMENTID(), OTCompteClient,
                    lg_MOTIF_REGLEMENT_ID, int_PART_TIERSPAYANT, int_TAUX)) { // encaissement
                return result;
            }

            // this.getOdataManager().getEm().merge(OTPreenregistrement);
            // new CalendrierManager(this.getOdataManager(), this.getOTUser()).createCalendrier(date.getoMois(new
            // Date()), Integer.parseInt(date.getAnnee(new Date())));
            this.buildSuccesTraceMessage("Vente terminée avec succès");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente. Veuillez réessayer svp!");
        }
        return result;
    }
    // fin code ajouté 11/10/2016

    public boolean CloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            TReglement OTReglement, int int_AMOUNT_RECU, int int_AMOUNT_REMIS, String lg_COMPTE_CLIENT_ID,
            String str_FIRST_NAME_FACTURE, String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE,
            String lg_USER_VENDEUR_ID) throws JSONException {

        TPreenregistrement OTPreenregistrement = null;
        TCompteClient OTCompteClient = null;
        boolean result = false;
        try {

            if (OTReglement == null) {
                this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
                return result;
            }
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);

            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Référence commande inconnue");
                return result;
            }
            // OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);

            if (!"".equals(lg_COMPTE_CLIENT_ID)) {
                OTCompteClient = this.getOdataManager().getEm().getReference(TCompteClient.class, lg_COMPTE_CLIENT_ID);
            }
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            result = this.CloturerVente(OTPreenregistrement, OTTypeVente, false, lg_TYPE_REGLEMENT_ID, OTReglement,
                    int_AMOUNT_RECU, int_AMOUNT_REMIS, 0, OTCompteClient, lg_USER_VENDEUR_ID, 0);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    // fonction d'enregistrement des produits de la vente lors de la cloture de vente
    public int closureProductVente(TPreenregistrement OTPreenregistrement,
            List<TPreenregistrementDetail> lstTPreenregistrementDetail, int int_MOVEMENT_FALSE_VALUE) {

        WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser(),
                new familleManagement(this.getOdataManager(), this.getOTUser()),
                new tellerManagement(this.getOdataManager(), this.getOTUser()));
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        try {
            updateVenteDetails(OTPreenregistrement.getLgPREENREGISTREMENTID());
            lstTPreenregistrementDetail.forEach((OTPreenregistrementDetail) -> {
                OWarehouseManager.updateStock(OTPreenregistrementDetail,
                        (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                : OTPreenregistrementDetail.getIntQUANTITYSERVED()));
            });
            /*
             * lstTPreenregistrementDetail.stream().map((OTPreenregistrementDetail) -> {
             * OWarehouseManager.updateStock(OTPreenregistrementDetail, (OTPreenregistrementDetail.getIntAVOIR() == 0 ?
             * OTPreenregistrementDetail.getIntQUANTITY() : OTPreenregistrementDetail.getIntQUANTITYSERVED())); return
             * OTPreenregistrementDetail; }).map((OTPreenregistrementDetail) -> {
             * this.saveMouvementFamille(OSnapshotManager, OTPreenregistrementDetail.getLgFAMILLEID(), "",
             * commonparameter.REMOVE, commonparameter.str_ACTION_VENTE, (OTPreenregistrementDetail.getIntAVOIR() == 0 ?
             * OTPreenregistrementDetail.getIntQUANTITY() : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
             * this.getOTUser().getLgEMPLACEMENTID()); return OTPreenregistrementDetail;
             * }).forEachOrdered((OTPreenregistrementDetail) -> {
             * OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
             * (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY() :
             * OTPreenregistrementDetail.getIntQUANTITYSERVED())); });
             */
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0;
    }

    public TMouvement getDalyTMouvement(TFamille OTFamille, String P_KEY, String str_ACTION, String str_TYPE_ACTION,
            Date dt_Date_debut, Date dt_Date_Fin) {
        TMouvement OTMouvement = null;
        try {
            if (P_KEY.equals("")) {
                P_KEY = "%%";
            }

            /*
             * OTMouvement = (TMouvement) this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TMouvement t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.strACTION LIKE ?8 AND t.pKey LIKE ?9"
             * ). //a decommenter en cas de probleme 08/11/2016 setParameter(3, dt_Date_debut). setParameter(4,
             * dt_Date_Fin). setParameter(5, commonparameter.statut_enable). setParameter(6,
             * OTFamille.getLgFAMILLEID()). setParameter(7, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).
             * setParameter(8, str_ACTION). setParameter(9, P_KEY). setMaxResults(1). getSingleResult();
             */
            OTMouvement = (TMouvement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvement t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.strACTION LIKE ?8 AND t.strTYPEACTION LIKE ?10 AND t.pKey LIKE ?9")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, OTFamille.getLgFAMILLEID())
                    .setParameter(7, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(8, str_ACTION).setParameter(9, P_KEY).setParameter(10, str_TYPE_ACTION)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTMouvement;
    }

    public TMouvement saveMouvementFamille(SnapshotManager OSnapshotManager, TFamille OTFamille, String P_KEY,
            String str_TYPE_ACTION, String str_ACTION, Integer int_NUMBER, TEmplacement OTEmplacement) {
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        try {

            TMouvement OTMouvement = this.getDalyTMouvement(OTFamille, P_KEY, str_ACTION, str_TYPE_ACTION,
                    dt_Date_debut, dt_Date_Fin);
            if (OTMouvement == null) {
                System.out.println("OTMouvement ******************   ");
                OTMouvement = new TMouvement();
                OTMouvement.setLgMOUVEMENTID(this.getKey().getComplexId());
                OTMouvement.setIntNUMBERTRANSACTION(1);
                OTMouvement.setDtDAY(new Date());
                OTMouvement.setStrSTATUT(commonparameter.statut_enable);
                OTMouvement.setIntNUMBER(int_NUMBER);
                OTMouvement.setLgFAMILLEID(OTFamille);
                OTMouvement.setLgUSERID(this.getOTUser());
                OTMouvement.setPKey(P_KEY);
                OTMouvement.setStrACTION(str_ACTION);
                OTMouvement.setStrTYPEACTION(str_TYPE_ACTION);
                OTMouvement.setDtCREATED(new Date());
                OTMouvement.setLgEMPLACEMENTID(OTEmplacement);
                // this.persiste(OTMouvement);
                this.getOdataManager().getEm().persist(OTMouvement);
                System.out.println("OTMouvement persist  ******************   " + OTMouvement);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {

                OTMouvement.setIntNUMBERTRANSACTION(1 + OTMouvement.getIntNUMBERTRANSACTION());
                OTMouvement.setIntNUMBER(int_NUMBER + OTMouvement.getIntNUMBER());
                OTMouvement.setLgUSERID(this.getOTUser());
                OTMouvement.setPKey(P_KEY);
                OTMouvement.setStrACTION(str_ACTION);
                OTMouvement.setStrTYPEACTION(str_TYPE_ACTION);
                OTMouvement.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTMouvement);
                System.out.println("OTMouvement merge  ******************   " + P_KEY);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            }

            this.createSnapshotMouvementArticle(OTFamille, int_NUMBER, str_TYPE_ACTION, str_ACTION); // a decommenter en
                                                                                                     // cas de probleme

            return OTMouvement;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible", e.getMessage());
            return null;
        }

    }

    public TMouvementSnapshot initSnapshotMouvementArticleBis(String lg_FAMILLE_ID, int int_NUMBER,
            TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        String lg_TYPE_STOCK_ID = "1";
        try {
            if (!OTEmplacement.getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                lg_TYPE_STOCK_ID = "3";
            }
            TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, lg_FAMILLE_ID,
                            OTEmplacement.getLgEMPLACEMENTID());
            if (OTTypeStockFamille != null) {
                OTMouvementSnapshot = createSnapshotMouvementArticleBis(OTTypeStockFamille.getLgFAMILLEID(),
                        OTTypeStockFamille.getIntNUMBER() + int_NUMBER, OTTypeStockFamille.getIntNUMBER(),
                        OTEmplacement);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot initSnapshotMouvementArticle(String lg_FAMILLE_ID, int int_NUMBER,
            TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        String lg_TYPE_STOCK_ID = "1";
        try {
            if (!OTEmplacement.getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                lg_TYPE_STOCK_ID = "3";
            }
            TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, lg_FAMILLE_ID,
                            OTEmplacement.getLgEMPLACEMENTID());
            if (OTTypeStockFamille != null) {
                OTMouvementSnapshot = createSnapshotMouvementArticleBis(OTTypeStockFamille.getLgFAMILLEID(),
                        OTTypeStockFamille.getIntNUMBER(), OTTypeStockFamille.getIntNUMBER() + int_NUMBER,
                        OTEmplacement);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER, String str_ACTION,
            String str_TYPE_ACTION) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        int add_to_stock_debut = 0;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID());
            if (OTMouvementSnapshot == null) {
                if (str_ACTION.equals(commonparameter.ADD)) { // a revoir apres
                    /*
                     * int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016 add_to_stock_debut
                     * = int_NUMBER;
                     */

                    // code ajouté
                    if (!str_TYPE_ACTION.equals(commonparameter.str_ACTION_VENTE)) {
                        int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016
                        add_to_stock_debut = int_NUMBER;
                    }
                    /*
                     * else { //a decommenter en cas de probleme 22/11/2016 add_to_stock_debut = int_NUMBER; }
                     */
                    // fin code ajouté
                } else if (str_ACTION.equals(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                        /*
                         * if(!str_TYPE_ACTION.equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) { // a decommenter en
                         * cas de probleme 07/11/2016 add_to_stock_debut = int_NUMBER; }
                         */
                    } else {
                        add_to_stock_debut = int_NUMBER;
                    }
                }
                new logger().OCategory.info("add_to_stock_debut ---- " + add_to_stock_debut); //
                // OTMouvementSnapshot = this.initSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), int_NUMBER); // a
                // decommenter en cas de probleme 13/09/2016
                OTMouvementSnapshot = this.initSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), add_to_stock_debut); // code
                                                                                                                         // ajouté
                                                                                                                         // 13/09/2016
            } else {
                new logger().OCategory.info("Quantite ---- " + OTMouvementSnapshot.getIntSTOCKJOUR());
                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) {
                    if (str_TYPE_ACTION.equals(commonparameter.str_ACTION_VENTE)) {
                        int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
                } else if (str_ACTION.equals(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() - int_NUMBER);
                }
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTMouvementSnapshot);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot initSnapshotMouvementArticle(String lg_FAMILLE_ID, int int_NUMBER) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        String lg_TYPE_STOCK_ID = "1";
        try {
            if (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals(commonparameter.PROCESS_SUCCESS)) {
                lg_TYPE_STOCK_ID = "3";
            }
            TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, lg_FAMILLE_ID);
            if (OTTypeStockFamille != null) {
                OTMouvementSnapshot = createSnapshotMouvementArticleBis(OTTypeStockFamille.getLgFAMILLEID(),
                        OTTypeStockFamille.getIntNUMBER(), OTTypeStockFamille.getIntNUMBER() + int_NUMBER);//
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleBis(TFamille OTFamille, int int_NUMBER,
            int int_STOCK_DEBUT) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        Date d = new Date();
        try {
            OTMouvementSnapshot = new TMouvementSnapshot();
            OTMouvementSnapshot.setLgMOUVEMENTSNAPSHOTID(this.getKey().getComplexId());
            OTMouvementSnapshot.setLgFAMILLEID(OTFamille);
            OTMouvementSnapshot.setDtDAY(d);
            OTMouvementSnapshot.setDtCREATED(d);

            OTMouvementSnapshot.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(0);
            OTMouvementSnapshot.setIntSTOCKJOUR(int_NUMBER);
            OTMouvementSnapshot.setIntSTOCKDEBUT(int_STOCK_DEBUT);
            OTMouvementSnapshot.setLgEMPLACEMENTID(this.getOTUser().getLgEMPLACEMENTID());

            this.getOdataManager().getEm().persist(OTMouvementSnapshot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleBis(TFamille OTFamille, int int_NUMBER, int int_STOCK_DEBUT,
            TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        Date d = new Date();
        try {

            OTMouvementSnapshot = new TMouvementSnapshot();
            OTMouvementSnapshot.setLgMOUVEMENTSNAPSHOTID(this.getKey().getComplexId());
            OTMouvementSnapshot.setLgFAMILLEID(OTFamille);
            OTMouvementSnapshot.setDtDAY(d);
            OTMouvementSnapshot.setDtCREATED(d);

            OTMouvementSnapshot.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(0);
            OTMouvementSnapshot.setIntSTOCKJOUR(int_NUMBER);
            OTMouvementSnapshot.setIntSTOCKDEBUT(int_STOCK_DEBUT);
            OTMouvementSnapshot.setLgEMPLACEMENTID(OTEmplacement);

            this.persiste(OTMouvementSnapshot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    // fin fonction d'enregistrement des produits de la vente lors de la cloture de vente
    public String GetNextNumeroVente(Date UpdatedDate, String PARAMETER_KEY, Boolean isVente) {
        String NumeroVente = "";
        String Status = "%is_Process%";
        if (isVente == true) {
            Status = "%is_Closed%";
        }
        try {
            NumeroVente = this.buildVenteRef(UpdatedDate, PARAMETER_KEY);
            TPreenregistrement AQueryPreEnreg = (TPreenregistrement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t WHERE t.strREF LIKE ?1 and t.strSTATUT LIKE ?2 order by t.dtCREATED desc ")
                    .setParameter(1, NumeroVente).setParameter(2, Status).setMaxResults(1).getSingleResult();
            if (AQueryPreEnreg != null) {
                String _NumDate = AQueryPreEnreg.getStrREF();
                String Datepart = _NumDate.substring(0, _NumDate.indexOf("_"));
                Datepart = "%" + Datepart + "%";
                TPreenregistrement LastPreenregsitrementDay = (TPreenregistrement) this.getOdataManager().getEm()
                        .createQuery(
                                "SELECT t FROM TPreenregistrement t WHERE t.strREF LIKE ?1 and t.strSTATUT LIKE ?2 order by t.dtCREATED desc ")
                        .setParameter(1, Datepart).setParameter(2, Status).setMaxResults(1).getSingleResult();
                String NumPart = LastPreenregsitrementDay.getStrREF();
                NumPart = NumPart.substring(NumPart.indexOf("_") + 1, NumPart.length());
                NumeroVente = this.UpdateParameters(UpdatedDate, PARAMETER_KEY, NumPart);
            }
        } catch (Exception exp) {
            new logger().OCategory.info(" Erreur : " + exp.toString());
        }
        return NumeroVente;
    }

    public boolean CloturerVenteBack(String lg_PREENREGISTREMENT_ID, String str_REF_BON, String lg_TYPE_REGLEMENT_ID,
            String lg_TYPE_VENTE_ID, int int_TOTAL_VENTE_RECAP, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String str_ORDONNANCE) {
        double total_remise = 0;
        int int_amount_remise = 0;
        int int_total_vente = 0;
        String str_type = "";
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        TTypeVente OTTypeVente = (TTypeVente) this.find(lg_TYPE_VENTE_ID, new TTypeVente());

        if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
            this.buildErrorTraceMessage("Impossible de valide la commande ", "La caisse est fermée");

            return false;
        }

        TPreenregistrement OTPreenregistrement = null;
        TCashTransaction OTCashTransaction = null;
        TTypeReglement OTTypeReglement = null;
        TReglement OTReglement = null;
        TTypeMvtCaisse OTTypeMvtCaisse = null;

        OTPreenregistrement = this.getOdataManager().getEm().find(dal.TPreenregistrement.class,
                lg_PREENREGISTREMENT_ID);
        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("Impossible de valider la vente",
                    "Ref commande inconnue " + lg_PREENREGISTREMENT_ID);
            return false;
        }

        this.refresh(OTPreenregistrement);
        if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Closed)) {
            this.buildErrorTraceMessage("Impossible de valider la vente",
                    "la vente a deja ete  " + this.getOTranslate().getValue(commonparameter.statut_is_Closed));
            return false;
        }

        OTTypeReglement = this.getOdataManager().getEm().find(dal.TTypeReglement.class, lg_TYPE_REGLEMENT_ID);
        OTReglement = this.getOdataManager().getEm().find(dal.TReglement.class, lg_REGLEMENT_ID);

        String libItemOrder = this.getTOrderTransactionText(OTPreenregistrement.getLgPREENREGISTREMENTID());
        String Description = "ENC. " + libItemOrder + " ";

        List<TPreenregistrementDetail> lstTTPreenregistrementDetail = new ArrayList(
                OTPreenregistrement.getTPreenregistrementDetailCollection());

        OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);

        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {
            str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                    this.getOdataManager());

        } else {
            str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                    this.getOdataManager());

        }

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                .getTFamille(OTPreenregistrement.getLgPREENREGISTREMENTID());

        /*
         * for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) { if
         * (OTPreenregistrementDetail.getLgFAMILLEID().getStrCODEREMISE() != null) {
         *
         * total_remise =
         * this.GetTauxRemiseToApply(OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().
         * getLgTYPEVENTEID(), OTPreenregistrementDetail.getLgFAMILLEID().getLgREMISEID().getLgREMISEID(),
         * OTPreenregistrementDetail.getLgFAMILLEID()) + total_remise; int_amount_remise = (int)
         * (((OTPreenregistrementDetail.getIntPRICE() * total_remise) / 100) + int_amount_remise); } if
         * (OTPreenregistrementDetail.getLgFAMILLEID().getStrCODEREMISE() == null) {
         *
         * int_amount_remise = 0; } OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(),
         * "", commonparameter.REMOVE, commonparameter.str_ACTION_VENTE, OTPreenregistrementDetail.getIntQUANTITY());
         * OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
         * OTPreenregistrementDetail.getIntQUANTITY()); }
         */
        for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
            OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                    commonparameter.REMOVE, commonparameter.str_ACTION_VENTE,
                    OTPreenregistrementDetail.getIntQUANTITY(), this.getOTUser().getLgEMPLACEMENTID());
            OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                    OTPreenregistrementDetail.getIntQUANTITY());
        }

        double dbl_total_remise = this.GetTotalAmountRemise(OTPreenregistrement.getLgPREENREGISTREMENTID());
        double dbl_total_vente = this.GetVenteTotalAmountTTc(OTPreenregistrement.getLgPREENREGISTREMENTID());// OTPreenregistrement.getIntPRICE().doubleValue();

        // int_total_vente = int_TOTAL_VENTE_RECAP - int_amount_remise;
        OTPreenregistrement.setIntPRICE((int) dbl_total_vente);
        OTPreenregistrement.setIntPRICEREMISE((int) dbl_total_remise);
        OTPreenregistrement.setStrTYPEVENTE(str_type);
        if (OTReglement == null) {
            this.buildErrorTraceMessage("Impossible de cloture la vente", "le reglement na pas ete effectue");
            return false;
        }
        new logger().OCategory.info(" dbl_total_remise   cloturer " + dbl_total_remise);
        new logger().OCategory.info(" dbl_total_vente cloturer    " + dbl_total_vente);
        if (!str_type.equals(bll.common.Parameter.KEY_VENTE_ORDONNANCE)) {
            OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);

            TRecettes OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                    OTPreenregistrement.getIntPRICE().doubleValue(), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON,
                    Description, OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(), str_type,
                    bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                    OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);

            if (OTRecettes == null) {
                this.buildErrorTraceMessage("Impossible de cloture la vente", "la recette n'a pas pu etre MAJ");

                return false;
            }
            /*
             * if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) { TCompteClient OTCompteClient
             * = (TCompteClient) this.find(str_REF_COMPTE_CLIENT, new TCompteClient()); if (OTCompteClient == null) {
             * new logger().OCategory.info(" *** Pas de compte client associe a ce differe *** "); return false; }
             * OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe); TRecettes OTRecettes = new
             * caisseManagement(this.getOdataManager(),
             * this.getOTUser()).AddRecette(OTPreenregistrement.getIntPRICE().doubleValue() * (-1),
             * Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description, OTPreenregistrement.getLgPREENREGISTREMENTID(),
             * int_AMOUNT_REMIS, int_AMOUNT_RECU, OTPreenregistrement.getLgPREENREGISTREMENTID(),
             * OTTypeReglement.getLgTYPEREGLEMENTID(), str_type, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID,
             * str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID); if (OTRecettes == null) {
             * this.buildErrorTraceMessage("Impossible de cloture la vente",
             * "la recette du differe n'a pas pu etre MAJ");
             *
             * return false; }
             */
            // new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(OTCompteClient,
            // lg_PREENREGISTREMENT_ID, OTPreenregistrement.getIntPRICE() * (-1));
        } // else if (!"6".equals(OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID())) {
        /*
         * Double dbl_amount_recette = (OTPreenregistrement.getIntPRICE().doubleValue()) * (-1);
         * OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere); TRecettes OTRecettes = new
         * caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(dbl_amount_recette,
         * Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description, OTPreenregistrement.getLgPREENREGISTREMENTID(),
         * int_AMOUNT_REMIS, int_AMOUNT_RECU, OTPreenregistrement.getLgPREENREGISTREMENTID(),
         * OTTypeReglement.getLgTYPEREGLEMENTID(), str_type, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID,
         * str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID); new logger().OCategory.info("dbl_amount_recette    " +
         * dbl_amount_recette); if (OTRecettes == null) { this.buildErrorTraceMessage("Impossible de cloture la vente",
         * "la recette du differe n'a pas pu etre MAJ");
         *
         * return false; } }
         */
        /*
         * } else {
         *
         * OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere); TRecettes OTRecettes = new
         * caisseManagement(this.getOdataManager(),
         * this.getOTUser()).AddRecette(OTPreenregistrement.getIntPRICE().doubleValue(),
         * Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description, OTPreenregistrement.getLgPREENREGISTREMENTID(),
         * int_AMOUNT_REMIS, int_AMOUNT_RECU, OTPreenregistrement.getLgPREENREGISTREMENTID(),
         * OTTypeReglement.getLgTYPEREGLEMENTID(), str_type, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID,
         * str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID);
         *
         * if (OTRecettes == null) { this.buildErrorTraceMessage("Impossible de cloture la vente",
         * "la recette n'a pas pu etre MAJ");
         *
         * return false; } }
         */
        OTPreenregistrement.setLgREGLEMENTID(OTReglement);

        OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
        OTPreenregistrement.setStrREFBON(str_REF_BON);
        OTPreenregistrement.setStrORDONNANCE(str_ORDONNANCE);
        OTPreenregistrement.setDtUPDATED(new Date());
        OTPreenregistrement.setLgUSERID(this.getOTUser());
        // OTPreenregistrement.setLgUSERVENDEURID(this.getOTUser());
        OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
        this.persiste(OTPreenregistrement);
        for (TPreenregistrementDetail OTPreenregistrementDetail : lstTTPreenregistrementDetail) {
            if (OTPreenregistrementDetail.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
                OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                OTPreenregistrementDetail.setDtUPDATED(new Date());
                this.persiste(OTPreenregistrementDetail);
                // maf stock
                new WarehouseManager(this.getOdataManager(), this.getOTUser())
                        .updateReelStock(OTPreenregistrementDetail, OTPreenregistrementDetail.getIntQUANTITY(), "ins");
            } else {
            }
        }
        this.refresh(OTPreenregistrement);

        return true;
    }

    // public boolean CloturerVente(String lg_PREENREGISTREMENT_ID, String str_REF_BON, String lg_TYPE_REGLEMENT_ID,
    // String lg_TYPE_VENTE_ID, int int_TOTAL_VENTE_RECAP, int int_AMOUNT_RECU, int int_AMOUNT_REMIS, String
    // str_REF_CLIENT, String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String
    // str_ORDONNANCE) {
    //
    // TTypeVente OTTypeVente = (TTypeVente) this.find(lg_TYPE_VENTE_ID, new TTypeVente());
    // TCompteClient OTCompteClient = null;
    // if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_AVEC_CARNET)) {
    // String lg_COMPTE_CLIENT_ID = str_REF_CLIENT;
    // OTCompteClient = (TCompteClient) this.find(lg_COMPTE_CLIENT_ID, new TCompteClient());
    //
    // if (OTCompteClient == null) {
    // this.buildErrorTraceMessage("Impossible de valide la commande ", "Le client n a pas de compte");
    // return false;
    // }
    //
    // if (!new clientManager(this.getOdataManager(), this.getOTUser()).isAuthorize(OTCompteClient,
    // lg_PREENREGISTREMENT_ID, lg_TYPE_REGLEMENT_ID)) {
    // this.buildErrorTraceMessage("IError", "Desolez ce client na pas le droit deffectuer cette action");
    // return false;
    // }
    //
    // this.CloturerVente(lg_PREENREGISTREMENT_ID, str_REF_BON, lg_TYPE_REGLEMENT_ID, lg_TYPE_VENTE_ID,
    // int_TOTAL_VENTE_RECAP, int_AMOUNT_RECU, int_AMOUNT_REMIS, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
    // lg_MOTIF_REGLEMENT_ID, str_ORDONNANCE);
    // new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(OTCompteClient,
    // lg_PREENREGISTREMENT_ID);
    //
    // } else if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_ASSURANCE)) {
    // TCompteClientTiersPayant OTCompteClientTiersPayant = (TCompteClientTiersPayant) this.find(str_REF_CLIENT, new
    // TCompteClientTiersPayant());
    // if (OTCompteClientTiersPayant == null) {
    // this.buildErrorTraceMessage("Impossible de valide la commande ", "TCompteClientTiersPayant invalide");
    // return false;
    // }
    //
    // new logger().OCategory.info("**** vente assuance depuis bll **** ");
    // OTCompteClient = OTCompteClientTiersPayant.getLgCOMPTECLIENTID();
    // if (new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransactionTiersPayent(OTCompteClient,
    // lg_PREENREGISTREMENT_ID, OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTIERSPAYANTID(),
    // this.GetVenteTotal(lg_PREENREGISTREMENT_ID), "")) {
    // this.CloturerVente(lg_PREENREGISTREMENT_ID, str_REF_BON, lg_TYPE_REGLEMENT_ID, lg_TYPE_VENTE_ID,
    // int_TOTAL_VENTE_RECAP, int_AMOUNT_RECU, int_AMOUNT_REMIS, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
    // lg_MOTIF_REGLEMENT_ID, str_ORDONNANCE);
    // new
    // tierspayantManagement(this.getOdataManager()).createsnapshotVente(OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID(),
    // int_TOTAL_VENTE_RECAP);
    // }
    //
    // }
    // return true;
    // }
    public void Devis(String lg_PREENREGISTREMENT_ID, int int_TOTAL_VENTE_RECAP) {

        TPreenregistrement OTPreenregistrement = null;

        OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class, lg_PREENREGISTREMENT_ID);

        List<TPreenregistrementDetail> lstTTPreenregistrementDetail = new ArrayList(
                OTPreenregistrement.getTPreenregistrementDetailCollection());
        new logger().OCategory.info("List size   " + lstTTPreenregistrementDetail.size());
        for (TPreenregistrementDetail OTPreenregistrementDetail : lstTTPreenregistrementDetail) {
            OTPreenregistrementDetail.setStrSTATUT("devis");
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            this.persiste(OTPreenregistrementDetail);
        }
        new logger().OCategory.info("int_TOTAL_VENTE_RECAP avt update  " + int_TOTAL_VENTE_RECAP);
        OTPreenregistrement.setIntPRICE(int_TOTAL_VENTE_RECAP);
        OTPreenregistrement.setStrSTATUT("devis");
        OTPreenregistrement.setDtUPDATED(new Date());
        this.persiste(OTPreenregistrement);
        this.refresh(OTPreenregistrement);

    }

    public String getTOrderTransactionText(String lgOrderId) {
        List<TPreenregistrementDetail> lstT = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 ")
                .setParameter(3, "%%").setParameter(4, lgOrderId).getResultList();
        String strLib = "";
        for (int i = 0; i < lstT.size(); i++) {
            TFamille oTProductItem = lstT.get(i).getLgFAMILLEID();
            this.getOdataManager().getEm().refresh(oTProductItem);
            strLib = strLib + commonparameter.SEPARATEUR_POINT_VIRGULE + oTProductItem.getStrNAME() + " ("
                    + (lstT.get(i).getIntQUANTITY()) + ") ";
        }

        this.buildSuccesTraceMessage("ProduitItem associer a  " + lgOrderId + "  : " + strLib);
        return strLib;
    }

    public List<TPreenregistrementDetail> getTFamille(String lgOrderId) {
        List<TPreenregistrementDetail> lstT = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 ")
                .setParameter(3, "%%").setParameter(4, lgOrderId).getResultList();
        String strLib = "";
        for (int i = 0; i < lstT.size(); i++) {
            TFamille oTProductItem = lstT.get(i).getLgFAMILLEID();
            this.getOdataManager().getEm().refresh(oTProductItem);
        }
        new logger().OCategory.info(" *** List de produit pour cette vente  ***" + lstT.size());
        // this.buildSuccesTraceMessage("ProduitItem associer a " + lgOrderId + " : " + strLib);
        return lstT;
    }

    public int getAmount(String lg_PREENREGISTREMENT_ID) {

        // aller dans le detail
        return 0;
    }

    private Boolean CheckifRemiseisAllowed(TRemise OTRemise) {
        boolean result = true;

        if (this.getOTUser().getStrIDS() == null) {
            result = false;
            new logger().OCategory.info(" *** Desole verifier votre Indice de securite *** ");
            this.buildErrorTraceMessage(" *** Desole verifier votre Indice de securite  *** ");
        } else if (this.getOTUser().getStrIDS() < OTRemise.getStrIDS()) {
            result = false;
            new logger().OCategory.info(" *** Desole vous navez pas le droit dappliquer des remises *** ");
            this.buildErrorTraceMessage(" *** Desole vous navez pas le droit dappliquer des remises *** ");
        }

        return result;
    }

    public TRemise GetRemiseToApply(String lg_remise_id) {
        TRemise OTRemise = null;

        try {
            OTRemise = (TRemise) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRemise t WHERE (t.lgREMISEID = ?1 OR  t.strNAME LIKE ?1 OR t.strCODE LIKE ?1)  AND t.strSTATUT = ?3 ")
                    .setParameter(1, lg_remise_id).setParameter(3, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            return null;
        }

        return OTRemise;

    }

    private Integer CodeGrilleRemiseFromWorkflow(String typeventid, TFamille OTFamille) {
        int int_code_grille_remise = 0;
        TWorkflowRemiseArticle OTWorkflowRemiseArticle = null;

        if (OTFamille == null) {
            return int_code_grille_remise;
        }

        try {
            OTWorkflowRemiseArticle = (TWorkflowRemiseArticle) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEREMISEARTICLE = ?1  AND t.strSTATUT = ?2 ")
                    .setParameter(1, OTFamille.getStrCODEREMISE()).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();

            if ((typeventid.equals(bll.common.Parameter.VENTE_ASSURANCE))
                    || (typeventid.equals(bll.common.Parameter.VENTE_AVEC_CARNET))) {
                int_code_grille_remise = OTWorkflowRemiseArticle.getStrCODEGRILLEVO();
                return int_code_grille_remise;
            } else {
                int_code_grille_remise = OTWorkflowRemiseArticle.getStrCODEGRILLEVNO();
                return int_code_grille_remise;
            }

        } catch (Exception e) {
            new logger().OCategory.info(" *** ERROR CodeGrilleRemiseFromWorkflow ***" + e.toString());
            return null;
        }

    }

    private TGrilleRemise GrilleRemiseRemiseFromWorkflow(TPreenregistrement OTPreenregistrement, TFamille OTFamille) {
        int int_code_grille_remise = 0;
        TWorkflowRemiseArticle OTWorkflowRemiseArticle = null;
        TGrilleRemise OTGrilleRemise = null;

        if (OTFamille == null) {
            return OTGrilleRemise;
        }
        if (OTPreenregistrement == null) {
            return OTGrilleRemise;
        }

        try {
            OTWorkflowRemiseArticle = (TWorkflowRemiseArticle) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEREMISEARTICLE = ?1  AND t.strSTATUT = ?2 ")
                    .setParameter(1, OTFamille.getStrCODEREMISE()).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();

            if ((OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_ASSURANCE))
                    || (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()
                            .equals(bll.common.Parameter.VENTE_AVEC_CARNET))) {
                int_code_grille_remise = OTWorkflowRemiseArticle.getStrCODEGRILLEVO();
                OTGrilleRemise = (TGrilleRemise) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1  AND t.strSTATUT = ?2  AND t.lgREMISEID.lgREMISEID = ?3 ")
                        .setParameter(1, int_code_grille_remise).setParameter(2, commonparameter.statut_enable)
                        .setParameter(3, OTPreenregistrement.getLgREMISEID()).getSingleResult();

                return OTGrilleRemise;
            } else {
                int_code_grille_remise = OTWorkflowRemiseArticle.getStrCODEGRILLEVNO();
                OTGrilleRemise = (TGrilleRemise) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE  = ?1  AND t.strSTATUT = ?2 AND t.lgREMISEID.lgREMISEID = ?3 ")
                        .setParameter(1, int_code_grille_remise).setParameter(2, commonparameter.statut_enable)
                        .setParameter(3, OTPreenregistrement.getLgREMISEID()).getSingleResult();
                return OTGrilleRemise;
            }

        } catch (Exception e) {
            new logger().OCategory.info(" *** ERROR GrilleRemiseRemiseFromWorkflow ***" + e.toString());
            return null;
        }

    }

    public double GetTauxRemiseToApply(String typeventid, String lg_remise_id, TFamille OTFamille) {
        double dbl_taux = 0.0;
        TGrilleRemise OTGrilleRemise = null;
        int codegrille = 0;
        try {
            codegrille = this.CodeGrilleRemiseFromWorkflow(typeventid, OTFamille);
            new logger().OCategory.info(" codegrille  " + codegrille);
        } catch (Exception e) {
            new logger().OCategory.info(" ERROR  " + e.toString());
        }

        try {
            OTGrilleRemise = (TGrilleRemise) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TGrilleRemise t WHERE t.lgREMISEID.lgREMISEID  =?1 AND t.strCODEGRILLE =?2 AND t.strSTATUT = ?3 ")
                    .setParameter(1, lg_remise_id).setParameter(2, codegrille)
                    .setParameter(3, commonparameter.statut_enable).getSingleResult();
            if (this.CheckifRemiseisAllowed(OTGrilleRemise.getLgREMISEID())) {
                dbl_taux = OTGrilleRemise.getDblTAUX();
            }
            new logger().OCategory.info(" dbl_taux  " + dbl_taux);
            return dbl_taux;
        } catch (Exception e) {
            new logger().OCategory.info(" *** ERROR PAS DE REMISE ***" + e.toString());
            return dbl_taux;
        }

    }

    public int GetVenteTotal(String lgPREENREGISTREMENTID, String str_STATUT) {
        int Total_vente = 0;
        List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID, str_STATUT);
        for (int i = 0; i < lstT.size(); i++) {

            Total_vente = lstT.get(i).getIntPRICE() + Total_vente;
        }
        new logger().OCategory.info(" @@@@@@@@  Le total de la vente est de  @@@@@@@@   " + Total_vente);
        return Total_vente;
    }

    public Integer GetProductTotal(String lgPREENREGISTREMENTID) {
        Integer Total_product = 0;
        TPreenregistrement OTPreenregistrement = null;
        try {
            List<TPreenregistrementDetail> lstT = this.getTPreenregistrementDetail(lgPREENREGISTREMENTID);
            Total_product = lstT.stream().mapToInt((value) -> {
                return value.getIntQUANTITY();
            }).sum();
        } catch (Exception e) {
            e.printStackTrace();
        }

        new logger().OCategory.info(" @@@@@@@@  Le total de lproduit est de  @@@@@@@@   " + Total_product);
        return Total_product;
    }

    public List<TPreenregistrementDetail> getTPreenregistrementDetailJdbc(String lgPREENREGISTREMENTID,
            String str_STATUT) {
        String str_statut_final = "";
        if (str_STATUT.equals("")) {
            str_statut_final = commonparameter.statut_is_Process;
        } else {
            str_statut_final = str_STATUT;
        }
        List<TPreenregistrementDetail> lstT = new ArrayList<TPreenregistrementDetail>();

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM t_preenregistrement_detail  WHERE lg_PREENREGISTREMENT_ID LIKE '"
                    + lgPREENREGISTREMENTID + "'  AND str_STATUT = '" + str_statut_final + "' ";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TPreenregistrementDetail OTPreenregistrementDetail = new TPreenregistrementDetail();
                OTPreenregistrementDetail.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));

                lstT.add(OTPreenregistrementDetail);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return lstT;
    }

    public List<TPreenregistrementDetail> getTPreenregistrementDetail(String lgPREENREGISTREMENTID, String str_STATUT) {
        List<TPreenregistrementDetail> lstT = new ArrayList<>();

        String str_statut_final = "";
        if (str_STATUT.equals("")) {
            str_statut_final = commonparameter.statut_is_Process;
        } else {
            str_statut_final = str_STATUT;
        }
        try {

            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(3, str_statut_final).setParameter(4, lgPREENREGISTREMENTID).getResultList();
            return lstT;
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        return lstT;
    }

    public List<Journalvente> getOtherJournalData(String lgPREENREGISTREMENTID) {
        TPreenregistrement OTPreenregistrement = this.FindPreenregistrement(lgPREENREGISTREMENTID);

        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        List<Journalvente> Lst = new ArrayList<Journalvente>();
        Journalvente OJournalvente = null;

        Double dbl_amount_tp = 0.0;
        Double dbl_amount_clt = 0.0;
        Double dbl_amount_remise = 0.0;
        String list_amount = "";

        if (OTPreenregistrement == null) {
            new logger().OCategory.info(" *** Desole cette vente est nulle *** ");
            return null;
        }

        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_ASSURANCE)) {

            try {

                Iterator iteraror = OTPreenregistrement.getTPreenregistrementCompteClientTiersPayentCollection()
                        .iterator();

                Iterator iteraror_clt = OTPreenregistrement.getTPreenregistrementCompteClientCollection().iterator();

                while (iteraror.hasNext()) {
                    OJournalvente = new Journalvente();

                    Object el = iteraror.next();
                    Object el_clt = iteraror_clt.next();
                    this.refresh((TPreenregistrementCompteClient) el_clt);
                    this.refresh((TPreenregistrementCompteClientTiersPayent) el);
                    OTPreenregistrementCompteClientTiersPayent = ((TPreenregistrementCompteClientTiersPayent) el);
                    OTPreenregistrementCompteClient = ((TPreenregistrementCompteClient) el_clt);
                    this.refresh(OTPreenregistrementCompteClientTiersPayent);
                    this.refresh(OTPreenregistrementCompteClient);
                    dbl_amount_tp = OTPreenregistrementCompteClientTiersPayent.getIntPRICE().doubleValue();
                    dbl_amount_clt = OTPreenregistrementCompteClient.getIntPRICE().doubleValue();
                    dbl_amount_remise = OTPreenregistrementCompteClient.getLgPREENREGISTREMENTID().getIntPRICEREMISE()
                            .doubleValue();

                    OJournalvente.setStr_client(
                            OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCLIENTID().getStrCODEINTERNE());
                    OJournalvente.setStr_mt_tp(dbl_amount_tp.toString());
                    OJournalvente.setStr_mt_clt(dbl_amount_clt.toString());
                    OJournalvente.setStr_mt_rem(dbl_amount_remise.toString());
                    Lst.add(OJournalvente);

                }

                return Lst;
            } catch (Exception er) {
                new logger().OCategory.info(" *** Erreur list_amount tp   *** " + er.toString());

            }

        } else if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()
                .equals(bll.common.Parameter.VENTE_AVEC_CARNET)) {

            try {

                if (OTPreenregistrement == null) {
                    new logger().OCategory.info(" *** OTPreenregistrement clt is null *** ");
                    return null;
                }

                Iterator iteraror_clt_temp = OTPreenregistrement.getTPreenregistrementCompteClientCollection()
                        .iterator();

                if (iteraror_clt_temp == null) {
                    new logger().OCategory.info(" *** iteraror_clt_temp clt is null *** ");
                    return null;
                }

                while (iteraror_clt_temp.hasNext()) {
                    OJournalvente = new Journalvente();
                    Object el_clt_temp = iteraror_clt_temp.next();
                    this.refresh((TPreenregistrementCompteClient) el_clt_temp);
                    OTPreenregistrementCompteClient = ((TPreenregistrementCompteClient) el_clt_temp);

                    this.refresh(OTPreenregistrementCompteClient);
                    dbl_amount_clt = OTPreenregistrementCompteClient.getIntPRICE().doubleValue();
                    dbl_amount_remise = OTPreenregistrementCompteClient.getLgPREENREGISTREMENTID().getIntPRICEREMISE()
                            .doubleValue();

                    OJournalvente.setStr_client(
                            OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCLIENTID().getStrCODEINTERNE());
                    OJournalvente.setStr_client_infos(OTPreenregistrementCompteClient.getLgCOMPTECLIENTID()
                            .getLgCLIENTID().getStrFIRSTNAME() + "  "
                            + OTPreenregistrementCompteClient.getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME());
                    OJournalvente.setStr_mt_clt(dbl_amount_clt.toString());
                    OJournalvente.setStr_mt_rem(dbl_amount_remise.toString());
                    Lst.add(OJournalvente);

                }

                return Lst;
            } catch (Exception er) {
                new logger().OCategory.info(" *** Erreur list_amount  clt *** " + er.toString());

            }

        } else {

        }
        return null;
    }

    // verifier si la vente peut etre fete
    public boolean checkIsVentePossible(String lg_NATURE_VENTE_ID, String lg_FAMILLE_ID, int int_NUMBER) {
        boolean result = true;
        try {
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);

            new logger().OCategory.info("lg_NATURE_VENTE_ID " + lg_NATURE_VENTE_ID + " lg_FAMILLE_ID " + lg_FAMILLE_ID
                    + " Description " + OTFamille.getStrDESCRIPTION());
            if (Parameter.KEY_NATURE_VENTE_DEPOT.equalsIgnoreCase(lg_NATURE_VENTE_ID)) {
                TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getTProductItemStock(OTFamille);
                new logger().OCategory.info("Quantité stock réelle actuelle : " + OTFamilleStock.getIntNUMBERAVAILABLE()
                        + " int_NUMBER " + int_NUMBER);
                if (OTFamilleStock.getIntNUMBERAVAILABLE() < int_NUMBER) {
                    this.buildErrorTraceMessage("Impossible d'ajouter le produit. Stock insuffisant");
                    result = false;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    public boolean checkIsVentePossible(TFamilleStock OTFamilleStock, int int_NUMBER) {
        boolean result = true;
        try {
            if (OTFamilleStock.getIntNUMBERAVAILABLE() < int_NUMBER) {
                this.buildErrorTraceMessage(
                        "Impossible d'ajouter le produit, tock insuffisant. Procédé à un déconditionnement");
                result = false;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    // fin verifier si la vente peut etre fete
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
            OTReglement.setDtUPDATED(new Date());
            OTReglement.setLgMODEREGLEMENTID(OTModeReglement);
            OTReglement.setDtREGLEMENT(dt_reglement);
            OTReglement.setLgUSERID(this.getOTUser());
            OTReglement.setBoolCHECKED(bool_CHECKED);
            OTReglement.setStrSTATUT(OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")
                    ? commonparameter.statut_differe : commonparameter.statut_is_Closed);

            this.persiste(OTReglement);
        } catch (Exception e) {
        }

        return OTReglement;
    }

    public TPreenregistrement createPreVente(String str_Medecin, String lg_TYPE_VENTE_ID, String lg_NATURE_VENTE_ID,
            String lg_REMISE_ID, Date dt_CREATED, String KEY_PARAMETER, TUser OTUserVendeur,
            String str_FIRST_NAME_CUSTOMER, String str_LAST_NAME_CUSTOMER, TFamilleStock OTFamilleStock,
            int int_QUANTITY, int int_QUANTITY_SERVED, int int_FREE_PACK_NUMBER, String listeCompteclientTierspayant) {

        TPreenregistrement OTPreenregistrement = null;
        TTypeVente OTTypeVente;
        TNatureVente oTNatureVente;
        TRemise OTRemise;
        EntityManager em = this.getOdataManager().getEm();
        try {
            OTTypeVente = this.getTypeVente(lg_TYPE_VENTE_ID);
            oTNatureVente = this.getTNatureVente(lg_NATURE_VENTE_ID);
            OTRemise = this.GetRemiseToApply(lg_REMISE_ID);

            if (OTTypeVente == null) {
                this.buildSuccesTraceMessage("Echec de l'enregistrement. Type de vente inexistant");
                return null;
            }
            if (oTNatureVente == null) {
                this.buildSuccesTraceMessage("Echec de l'enregistrement. Nature de vente inexistante");
                return null;
            }

            em.getTransaction().begin();

            OTPreenregistrement = new TPreenregistrement();
            OTPreenregistrement.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setIntREMISEPARA(0);
            OTPreenregistrement.setPkBrand("");
            if (!"".equals(KEY_PARAMETER)) {
                OTPreenregistrement.setStrREF(this.buildRef(dt_CREATED, KEY_PARAMETER, em));
            } else {
                OTPreenregistrement.setStrREF(KEY_PARAMETER);
            }
            OTPreenregistrement.setLgREMISEID(OTRemise != null ? OTRemise.getLgREMISEID() : "");
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_CUSTOMER);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_CUSTOMER);
            OTPreenregistrement.setDtCREATED(dt_CREATED);
            OTPreenregistrement.setDtUPDATED(dt_CREATED);
            OTPreenregistrement.setStrMEDECIN(str_Medecin);
            OTPreenregistrement.setLgNATUREVENTEID(oTNatureVente);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setIntPRICE(0);
            OTPreenregistrement.setIntACCOUNT(0);
            OTPreenregistrement.setIntPRICEOTHER(0);
            OTPreenregistrement.setBISCANCEL(false);
            OTPreenregistrement.setBWITHOUTBON(false);
            OTPreenregistrement.setIntCUSTPART(0);
            OTPreenregistrement.setIntPRICEREMISE(0);
            OTPreenregistrement.setIntSENDTOSUGGESTION(0);
            // OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Process);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);

            TPreenregistrementDetail detail = addPreenregistrementItem(em, OTPreenregistrement, OTFamilleStock,
                    int_QUANTITY, int_QUANTITY_SERVED, int_FREE_PACK_NUMBER);
            em.persist(OTPreenregistrement);
            detail.setLgPREENREGISTREMENTID(OTPreenregistrement);
            em.persist(detail);
            if (!OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)) {
                TPreenregistrementCompteClientTiersPayent clientTiersPayent = this
                        .createTPreenregistrementCompteClientTierspayant(listeCompteclientTierspayant,
                                OTPreenregistrement);
            }

            em.getTransaction().commit();
            this.buildSuccesTraceMessage("création effectuée avec success");

        } catch (Exception e) {
            em.getTransaction().rollback();
            this.buildErrorTraceMessage("Echec d'enregistrement de la vente. Veuillez réessayer");
            e.printStackTrace();
        }
        return OTPreenregistrement;
    }

    public TPreenregistrementCompteClientTiersPayent createTPreenregistrementCompteClientTiersPayent(
            TPreenregistrement OTPreenregistrement, TCompteClientTiersPayant OTCompteClientTiersPayant, int int_PERCENT,
            int int_PRICE, int int_PRICE_RESTE, String str_REFBON) {
        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        Date today = new Date();
        try {
            OTPreenregistrementCompteClientTiersPayent = new TPreenregistrementCompteClientTiersPayent();
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

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }
        return OTPreenregistrementCompteClientTiersPayent;
    }

    public TPreenregistrementCompteClientTiersPayent createTPreenregistrementCompteClientTierspayant(
            String listeCompteclientTierspayant, TPreenregistrement OTPreenregistrement) {
        TCompteClientTiersPayant OTCompteClientTiersPayant;
        TPreenregistrementCompteClientTiersPayent clientTiersPayent = null;
        String[] tabStringTierspayant;

        try {
            String[] tabString = StringUtils.split(listeCompteclientTierspayant,
                    commonparameter.SEPARATEUR_POINT_VIRGULE);
            for (String OString : tabString) {
                tabStringTierspayant = StringUtils.split(OString, commonparameter.SEPARATEUR_DOUBLE_POINT);
                OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                        tabStringTierspayant[0] != null ? tabStringTierspayant[0] : "");
                if (OTCompteClientTiersPayant != null) {
                    clientTiersPayent = this.createTPreenregistrementCompteClientTiersPayent(OTPreenregistrement,
                            OTCompteClientTiersPayant, OTCompteClientTiersPayant.getIntPOURCENTAGE(), 0, 0,
                            tabStringTierspayant.length == 2 && tabStringTierspayant[1] != null
                                    ? tabStringTierspayant[1] : " ");

                }
            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return clientTiersPayent;
    }

    public TPreenregistrementDetail addPreenregistrementDetail(TPreenregistrement OTPreenregistrement,
            TFamilleStock OTFamilleStock, int int_QUANTITY, int int_QUANTITY_SERVED, int int_FREE_PACK_NUMBER) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        int int_PRICE_OLD;
        TParameters OTParameters;
        TPromotionProduct OTPromotionProduct;
        TParameters KEY_TAKE_INTO_ACCOUNT;
        boolean KEYTAKEINTOACCOUNT = false;
        try {

            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement du produit sur la vente");
                return null;
            }
            TFamille OTFamille = OTFamilleStock.getLgFAMILLEID();
            this.getOdataManager().getEm().refresh(OTFamille);// ajoute le 02/05/2018
            try {
                KEY_TAKE_INTO_ACCOUNT = this.getOdataManager().getEm().getReference(TParameters.class,
                        "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null) {
                    if (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1) {
                        KEYTAKEINTOACCOUNT = true;
                    }
                }
            } catch (Exception e) {
            }

            int_PRICE_OLD = OTFamille.getIntPRICE();

            OTPreenregistrementDetail = new TPreenregistrementDetail();
            OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());

            OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
            OTPreenregistrementDetail.setDtCREATED(new Date());
            if (OTFamille.getBlPROMOTED() == true) {

                OTPromotionProduct = this.getPromotionProduct(OTFamille.getLgFAMILLEID());
                if (OTPromotionProduct != null
                        && (isActivePromotion(OTPromotionProduct.getLgCODEPROMOTIONID().getDtENDDATE(),
                                new Date()) >= 0)) {
                    if (OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equals("REMISE")
                            || OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equals("PRIX SPECIAL")) {
                        int_PRICE_OLD = OTPromotionProduct.getDbPRICE().intValue();
                    } else {
                        if (OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equalsIgnoreCase("UNITES GRATUITES")
                                && (OTPreenregistrementDetail.getIntQUANTITY() >= OTPromotionProduct
                                        .getIntACTIVEAT())) {
                            int_FREE_PACK_NUMBER = (int) ((OTPreenregistrementDetail.getIntQUANTITY()
                                    / OTPromotionProduct.getIntACTIVEAT()) * OTPromotionProduct.getIntPACKNUMBER());
                        }
                    }
                } else {
                    OTFamille.setBlPROMOTED(false);
                    this.getOdataManager().getEm().merge(OTFamille);
                }
            }
            OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_OLD);

            OTPreenregistrementDetail.setIntPRICE(int_QUANTITY * int_PRICE_OLD);

            OTPreenregistrementDetail.setIntUG(0);

            OTPreenregistrementDetail.setIntQUANTITY(int_QUANTITY);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setIntPRICEOTHER(0);
            OTPreenregistrementDetail.setIntPRICEDETAILOTHER(0);
            OTPreenregistrementDetail.setIntFREEPACKNUMBER(int_FREE_PACK_NUMBER);
            OTPreenregistrementDetail.setIntAVOIR(int_QUANTITY - int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            OTPreenregistrementDetail.setIntAVOIRSERVED(int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setStrSTATUT("is_Process");
            TZoneGeographique OEmplacement = OTFamille.getLgZONEGEOID();
            if ((KEYTAKEINTOACCOUNT) && (!OEmplacement.getBoolACCOUNT() || !OTFamille.getBoolACCOUNT())) {
                OTPreenregistrementDetail.setBoolACCOUNT(false);
            } else {
                OTPreenregistrementDetail.setBoolACCOUNT(true);
                OTPreenregistrement.setIntACCOUNT(OTPreenregistrement.getIntACCOUNT() + (int_QUANTITY * int_PRICE_OLD));
            }

            OTPreenregistrement.setIntPRICE(OTPreenregistrement.getIntPRICE() + (int_QUANTITY * int_PRICE_OLD));

            this.getOdataManager().getEm().merge(OTPreenregistrement);
            OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
            this.getOdataManager().getEm().persist(OTPreenregistrementDetail);
            this.buildSuccesTraceMessage("Produit ajouté avec succès à la vente avec succès*************** "
                    + OTPreenregistrement.getIntPRICE());

            OTParameters = this.getOdataManager().getEm().getReference(TParameters.class,
                    Parameter.KEY_ACTIVATE_DISPLAYER);
            // if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
            // try {
            // DisplayerManager ODisplayerManager = new DisplayerManager();
            // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
            // 0, 20));
            // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
            // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
            // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
            // ODisplayerManager.close();
            // } catch (Exception e) {
            // e.printStackTrace();
            // }
            // }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec d'ajout du produit à la vente. Veuillez contacter votre administrateur svp!");
        }
        return OTPreenregistrementDetail;
    }

    public TPreenregistrementDetail addPreenregistrementItem(EntityManager em, TPreenregistrement OTPreenregistrement,
            TFamilleStock OTFamilleStock, int int_QUANTITY, int int_QUANTITY_SERVED, int int_FREE_PACK_NUMBER) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        int int_PRICE_OLD;
        TParameters OTParameters;
        TPromotionProduct OTPromotionProduct;
        TParameters KEY_TAKE_INTO_ACCOUNT;
        boolean KEYTAKEINTOACCOUNT = false;
        try {

            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement du produit sur la vente");
                return null;
            }
            TFamille OTFamille = OTFamilleStock.getLgFAMILLEID();
            em.refresh(OTFamille);// ajoute le 02/05/2018
            try {
                KEY_TAKE_INTO_ACCOUNT = em.getReference(TParameters.class, "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null) {
                    if (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1) {
                        KEYTAKEINTOACCOUNT = true;
                    }
                }
            } catch (Exception e) {
            }

            int_PRICE_OLD = OTFamille.getIntPRICE();

            OTPreenregistrementDetail = new TPreenregistrementDetail();
            OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());

            OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
            OTPreenregistrementDetail.setDtCREATED(new Date());
            if (OTFamille.getBlPROMOTED() == true) {

                OTPromotionProduct = this.getPromotionProduct(OTFamille.getLgFAMILLEID());
                if (OTPromotionProduct != null
                        && (isActivePromotion(OTPromotionProduct.getLgCODEPROMOTIONID().getDtENDDATE(),
                                new Date()) >= 0)) {
                    if (OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equals("REMISE")
                            || OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equals("PRIX SPECIAL")) {
                        int_PRICE_OLD = OTPromotionProduct.getDbPRICE().intValue();
                    } else {
                        if (OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equalsIgnoreCase("UNITES GRATUITES")
                                && (OTPreenregistrementDetail.getIntQUANTITY() >= OTPromotionProduct
                                        .getIntACTIVEAT())) {
                            int_FREE_PACK_NUMBER = (int) ((OTPreenregistrementDetail.getIntQUANTITY()
                                    / OTPromotionProduct.getIntACTIVEAT()) * OTPromotionProduct.getIntPACKNUMBER());
                        }
                    }
                } else {
                    OTFamille.setBlPROMOTED(false);
                    em.merge(OTFamille);
                }
            }
            OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_OLD);

            OTPreenregistrementDetail.setIntPRICE(int_QUANTITY * int_PRICE_OLD);

            OTPreenregistrementDetail.setIntUG(0);

            OTPreenregistrementDetail.setIntQUANTITY(int_QUANTITY);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setIntPRICEOTHER(0);
            OTPreenregistrementDetail.setIntPRICEDETAILOTHER(0);
            OTPreenregistrementDetail.setIntFREEPACKNUMBER(int_FREE_PACK_NUMBER);
            OTPreenregistrementDetail.setIntAVOIR(int_QUANTITY - int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            OTPreenregistrementDetail.setIntAVOIRSERVED(int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setStrSTATUT("is_Process");
            TZoneGeographique OEmplacement = OTFamille.getLgZONEGEOID();
            if ((KEYTAKEINTOACCOUNT) && (!OEmplacement.getBoolACCOUNT() || !OTFamille.getBoolACCOUNT())) {
                OTPreenregistrementDetail.setBoolACCOUNT(false);
            } else {
                OTPreenregistrementDetail.setBoolACCOUNT(true);
                OTPreenregistrement.setIntACCOUNT(OTPreenregistrement.getIntACCOUNT() + (int_QUANTITY * int_PRICE_OLD));
            }

            OTPreenregistrement.setIntPRICE(OTPreenregistrement.getIntPRICE() + (int_QUANTITY * int_PRICE_OLD));

            this.buildSuccesTraceMessage("Produit ajouté avec succès à la vente avec succès*************** "
                    + OTPreenregistrement.getIntPRICE());

            OTParameters = this.getOdataManager().getEm().getReference(TParameters.class,
                    Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                // try {
                // DisplayerManager ODisplayerManager = new DisplayerManager();
                // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
                // 0, 20));
                // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
                // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
                // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
                // ODisplayerManager.close();
                // } catch (Exception e) {
                // e.printStackTrace();
                // }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec d'ajout du produit à la vente. Veuillez contacter votre administrateur svp!");
        }
        return OTPreenregistrementDetail;
    }

    public TPreenregistrement addORupdatePreenregistrementDetail(String idVente, TFamilleStock OTFamilleStock,
            int int_QUANTITY, int int_QUANTITY_SERVED, int int_FREE_PACK_NUMBER) {
        TPreenregistrement OTPreenregistrement = null;

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        int int_PRICE_OLD = 0;
        TParameters OTParameters = null;
        TPromotionProduct OTPromotionProduct = null;
        try {
            this.getOdataManager().getEm().getTransaction().begin();

            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement du produit sur la vente");
                return null;
            }
            OTPreenregistrement = this.getOdataManager().getEm().getReference(TPreenregistrement.class, idVente);

            OTPreenregistrementDetail = this.findFamilleInTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
            if (OTPreenregistrementDetail == null) {
                this.addPreenregistrementDetail(OTPreenregistrement, OTFamilleStock, int_QUANTITY, int_QUANTITY_SERVED,
                        int_FREE_PACK_NUMBER);
                OTPreenregistrement.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTPreenregistrement);
            } else {

                int_PRICE_OLD = OTPreenregistrementDetail.getIntPRICE();
                System.out.println("int_PRICE_OLD  **** " + int_PRICE_OLD);
                // code ajouté 08/12/2016
                if (OTPreenregistrementDetail.getLgFAMILLEID().getBlPROMOTED()) {
                    OTPromotionProduct = this
                            .getPromotionProduct(OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID());
                    if (OTPromotionProduct != null
                            && OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE()
                                    .equalsIgnoreCase("UNITES GRATUITES")
                            && (OTPreenregistrementDetail.getIntQUANTITY() >= OTPromotionProduct.getIntACTIVEAT())) {
                        int_FREE_PACK_NUMBER = (int) ((OTPreenregistrementDetail.getIntQUANTITY()
                                / OTPromotionProduct.getIntACTIVEAT()) * OTPromotionProduct.getIntPACKNUMBER());
                    }
                }

                OTPreenregistrementDetail
                        .setIntFREEPACKNUMBER(OTPreenregistrementDetail.getIntFREEPACKNUMBER() + int_FREE_PACK_NUMBER);
                OTPreenregistrementDetail.setIntQUANTITY(OTPreenregistrementDetail.getIntQUANTITY() + int_QUANTITY);
                OTPreenregistrementDetail.setIntPRICE(
                        OTPreenregistrementDetail.getIntPRICEUNITAIR() * OTPreenregistrementDetail.getIntQUANTITY());
                OTPreenregistrementDetail
                        .setIntQUANTITYSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_QUANTITY_SERVED);

                OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED());
                OTPreenregistrementDetail.setIntAVOIR(
                        OTPreenregistrementDetail.getIntQUANTITY() - OTPreenregistrementDetail.getIntQUANTITYSERVED());
                OTPreenregistrementDetail.setDtUPDATED(new Date());
                OTPreenregistrementDetail.setBISAVOIR(OTPreenregistrementDetail.getIntAVOIR() > 0);

                this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
                if (OTPreenregistrementDetail.getBoolACCOUNT()) {
                    OTPreenregistrement.setIntACCOUNT(OTPreenregistrement.getIntACCOUNT()
                            + (OTPreenregistrementDetail.getIntPRICEUNITAIR() * int_QUANTITY));
                }
                OTPreenregistrement.setIntPRICE(OTPreenregistrement.getIntPRICE()
                        + (OTPreenregistrementDetail.getIntPRICEUNITAIR() * int_QUANTITY));
                this.getOdataManager().getEm().merge(OTPreenregistrement);

                this.buildSuccesTraceMessage("Produit ajouté avec succès à la vente avec succès");

                OTParameters = this.getOdataManager().getEm().getReference(TParameters.class,
                        Parameter.KEY_ACTIVATE_DISPLAYER);
                if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                    // try {
                    // DisplayerManager ODisplayerManager = new DisplayerManager();
                    // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
                    // 0, 20));
                    // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
                    // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
                    // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
                    // ODisplayerManager.close();
                    // } catch (Exception e) {
                    // e.printStackTrace();
                    // }
                }

            }
            this.getOdataManager().getEm().getTransaction().commit();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec d'ajout du produit à la vente. Veuillez contacter votre administrateur svp!");
        }
        return OTPreenregistrement;
    }

    public TPreenregistrement removePreenregistrementDetail(String lg_PREENREGISTREMENT_DETAIL_ID) {

        TPreenregistrement OTPreenregistrement = null;
        try {
            this.getOdataManager().getEm().getTransaction().begin();
            TPreenregistrementDetail OTPreenregistrementDetail = this
                    .FindTPreenregistrementDetail(lg_PREENREGISTREMENT_DETAIL_ID);
            OTPreenregistrement = OTPreenregistrementDetail.getLgPREENREGISTREMENTID();
            OTPreenregistrement
                    .setIntPRICE(OTPreenregistrement.getIntPRICE() - OTPreenregistrementDetail.getIntPRICE());
            if (OTPreenregistrementDetail.getBoolACCOUNT()) {
                OTPreenregistrement
                        .setIntACCOUNT(OTPreenregistrement.getIntACCOUNT() - OTPreenregistrementDetail.getIntPRICE());
            }
            OTPreenregistrement.setDtUPDATED(new Date());
            // OTPreenregistrement.getTPreenregistrementDetailCollection().remove(OTPreenregistrementDetail);
            this.getOdataManager().getEm().remove(OTPreenregistrementDetail);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            this.getOdataManager().getEm().getTransaction().commit();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du produit de la vente");
        }

        return OTPreenregistrement;
    }

    public TPreenregistrement createPreVente2(String str_Medecin, String lg_TYPE_VENTE_ID, String lg_NATURE_VENTE_ID,
            String lg_REMISE_ID, String KEY_PARAMETER, String lg_USER_VENDEUR_ID, String str_FIRST_NAME_CUSTOMER,
            String str_LAST_NAME_CUSTOMER, TFamilleStock OTFamilleStock, int int_QUANTITY, int int_QUANTITY_SERVED,
            int int_FREE_PACK_NUMBER, String listeCompteclientTierspayant) {
        TUser OTUserVendeur = this.getUserById(lg_USER_VENDEUR_ID);
        return this.createPreVente(str_Medecin, lg_TYPE_VENTE_ID, lg_NATURE_VENTE_ID, lg_REMISE_ID, new Date(),
                KEY_PARAMETER, OTUserVendeur, str_FIRST_NAME_CUSTOMER, str_LAST_NAME_CUSTOMER, OTFamilleStock,
                int_QUANTITY, int_QUANTITY_SERVED, int_FREE_PACK_NUMBER, listeCompteclientTierspayant);

    }

    private Map<Integer, JSONObject> verificationConsommation2(JSONArray array,
            TPreenregistrement OTPreenregistrement) {
        Map<Integer, JSONObject> map = new HashMap<>();
        int result = 0, int_PART_TIERSPAYANT = 0;
        TTiersPayant payant;
        TCompteClientTiersPayant tc;
        int int_TAUX = 0;

        JSONObject js = new JSONObject();
        JSONArray jsonarray = new JSONArray();
        try {
            int montantvente = OTPreenregistrement.getIntPRICE();
            if (!OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)) {
                String message = "";
                for (int idx = 0; idx < array.length(); idx++) {
                    int montant;
                    double montanttp;
                    JSONObject json = array.getJSONObject(idx);

                    tc = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class, json.get("IDCMPT"));
                    payant = tc.getLgTIERSPAYANTID();
                    int plafondClient = tc.getDblPLAFOND().intValue();
                    int encoursClient = tc.getDbPLAFONDENCOURS();
                    int plafondTp = payant.getDblPLAFONDCREDIT().intValue();
                    int_TAUX = Integer.valueOf(json.get("TAUX") + "");
                    montant = ((Double) Math.ceil(((Double.valueOf(montantvente) * int_TAUX) / 100))).intValue();
                    if ((plafondClient > 0) && (montant > plafondClient)) {
                        int _montant;
                        if (encoursClient > 0 && (tc.getDbCONSOMMATIONMENSUELLE() + plafondClient) > encoursClient) {
                            _montant = (encoursClient - tc.getDbCONSOMMATIONMENSUELLE());
                        } else {
                            _montant = plafondClient;
                        }
                        // int _payer = (tc.getDblPLAFOND().intValue() - tc.getDbCONSOMMATIONMENSUELLE());
                        if (plafondTp > 0 && (payant.getDbCONSOMMATIONMENSUELLE() + _montant) > plafondTp) {
                            int _montanttp = (plafondTp - payant.getDbCONSOMMATIONMENSUELLE());
                            montanttp = _montanttp;
                            int_PART_TIERSPAYANT += montanttp;

                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + (payant.getDblPLAFONDCREDIT().intValue() - payant.getDbCONSOMMATIONMENSUELLE())
                                    + " FCFA</span><br/> .Son plafond est atteint.<br/> ";
                        } else {

                            montanttp = _montant;

                            int_PART_TIERSPAYANT += montanttp;

                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + montanttp + " FCFA</span><br/> qui est le plafond de la vente.<br/>";

                        }

                    } else {
                        int _montant;

                        if (encoursClient > 0 && (tc.getDbCONSOMMATIONMENSUELLE() + montant) > encoursClient) {
                            _montant = (encoursClient - tc.getDbCONSOMMATIONMENSUELLE());
                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + _montant + " FCFA</span> votre plafond est atteint.<br/>";
                        } else {
                            _montant = montant;
                        }

                        if (plafondTp > 0 && (payant.getDbCONSOMMATIONMENSUELLE() + _montant) > plafondTp) {
                            montanttp = (plafondTp - payant.getDbCONSOMMATIONMENSUELLE());
                            int_PART_TIERSPAYANT += montanttp;
                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + montanttp + " FCFA</span><br/> Son plafond est atteint.<br/>";
                        } else {

                            montanttp = _montant;
                            int_PART_TIERSPAYANT += montanttp;

                        }

                    }

                    JSONObject ob = new JSONObject();
                    ob.put("LGCOMPTECLIENT", tc.getLgCOMPTECLIENTTIERSPAYANTID());
                    ob.put("LGPreenregistrement", OTPreenregistrement.getLgPREENREGISTREMENTID());
                    ob.put("REFBON", json.get("REFBON"));
                    ob.putOnce("DISCOUNT", OTPreenregistrement.getIntPRICEREMISE());
                    if ((montantvente - int_PART_TIERSPAYANT) <= 0) {
                        double nettp = (montantvente - (int_PART_TIERSPAYANT - montanttp));

                        ob.put("tpnet", nettp);

                        ob.put("TAUX", Math.round((nettp * 100) / montantvente));
                        jsonarray.put(ob);

                        break;
                    } else {

                        ob.put("tpnet", montanttp);

                        ob.put("TAUX", Math.round((montanttp * 100) / montantvente));
                        jsonarray.put(ob);
                    }

                }

                js.put("message", "<span style='font-size:14px;'>" + message + "</span>");
                js.put("success", (message.length() > 1 ? 1 : 0));
                js.put("datatierspayant", jsonarray);

                int _reste = (montantvente - int_PART_TIERSPAYANT) - OTPreenregistrement.getIntPRICEREMISE();
                result = (_reste > 0 ? montantvente - int_PART_TIERSPAYANT : 0);
                result = result - OTPreenregistrement.getIntPRICEREMISE();
                result = Maths.arrondiModuloOfNumber(result, 5);
                OTPreenregistrement.setIntCUSTPART((result > 4 ? result : 0));
                OTPreenregistrement.setIntREMISEPARA(0);

            } else {
                js.put("datatierspayant", jsonarray);
                result = montantvente;
            }
            js.put("partTP", (int_PART_TIERSPAYANT > montantvente ? montantvente : int_PART_TIERSPAYANT));
            map.put(result, js);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return map;
    }

    public JSONObject netWithoutDiscount(TPreenregistrement OTPreenregistrement, JSONArray array) {
        TParameters OTParameters = null;
        int result = 0;
        boolean isAvoir = false;

        JSONObject js = new JSONObject();
        Map<Integer, JSONObject> map = verificationConsommation2(array, OTPreenregistrement);
        for (Map.Entry<Integer, JSONObject> entry : map.entrySet()) {
            result = entry.getKey();
            js = entry.getValue();

        }

        try {

            isAvoir = this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT());
            OTPreenregistrement.setBISAVOIR(isAvoir);

            this.getOdataManager().getEm().merge(OTPreenregistrement);

            this.buildSuccesTraceMessage("Opréation effectuée avec succe");
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                this.showNetPaid(String.valueOf(result));
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
        }

        return js;
    }

    public boolean CloturerAnnulerVente(String lg_PREENREGISTREMENT_ID, String str_REF_BON, String lg_TYPE_REGLEMENT_ID,
            String lg_TYPE_VENTE_ID, int int_TOTAL_VENTE_RECAP, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String str_ORDONNANCE,
            int int_CUST_PART, TPreenregistrement OTPreenregistrementOld) {

        Double int_send_to_cashtransaction;
        String str_type;
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser());
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        TTypeVente OTTypeVente = (TTypeVente) this.find(lg_TYPE_VENTE_ID, new TTypeVente());
        TPreenregistrementCompteClient OTPreenregistrementCompteClient;

        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParametersValue = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE_VALUE),
                OTParametersKey = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);

        TPreenregistrement OTPreenregistrement;
        TTypeReglement OTTypeReglement;
        TReglement OTReglement;
        TTypeMvtCaisse OTTypeMvtCaisse;

        OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("Impossible de valider la vente",
                    "Référence de vente inconnue " + lg_PREENREGISTREMENT_ID);
            return false;
        }

        if (OTPreenregistrementOld == null) {
            this.buildErrorTraceMessage("Vente à annuler inexistante");
            return false;
        }

        this.refresh(OTPreenregistrement);
        if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Closed)) {
            this.buildErrorTraceMessage("Impossible de valider la vente",
                    "la vente a deja ete  " + this.getOTranslate().getValue(commonparameter.statut_is_Closed));
            return false;
        }

        OTTypeReglement = this.getOdataManager().getEm().find(dal.TTypeReglement.class, lg_TYPE_REGLEMENT_ID);
        OTReglement = this.getOdataManager().getEm().find(dal.TReglement.class, lg_REGLEMENT_ID);

        OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
        String Description = "ENC. Vente " + OTPreenregistrement.getStrREF() + " ";

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                .getTPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID());

        OTPreenregistrement.setIntPRICE(int_TOTAL_VENTE_RECAP);
        // fin code ajouté

        // OTPreenregistrement.setStrTYPEVENTE(str_type);
        if (OTReglement == null) {
            this.buildErrorTraceMessage("Impossible de cloture la vente", "le reglement na pas ete effectue");
            return false;
        }
        new logger().OCategory.info(" *** OTTypeReglement   cloture vente  *** " + OTTypeReglement.getStrNAME());
        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {

            // code ajouté 25/04/2016
            str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
            int_send_to_cashtransaction = Double
                    .valueOf(OTPreenregistrement.getIntPRICE() + ((-1) * OTPreenregistrement.getIntPRICEREMISE()));

            if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) {
                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);
                OTPreenregistrementCompteClient = this
                        .getTPreenregistrementCompteClient(OTPreenregistrementOld.getLgPREENREGISTREMENTID());
                if (OTPreenregistrementCompteClient == null) {
                    buildErrorTraceMessage("Pas de vente liée à ce compte client associe au differe *** ");
                    return false;
                }

                TRecettes OTRecettes;
                if (OTPreenregistrementCompteClient.getIntPRICE() >= 0) {

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
                    // new clientManager(this.getOdataManager(),
                    // this.getOTUser()).addToMytransaction(OTPreenregistrementCompteClient.getLgCOMPTECLIENTID(),
                    // lg_PREENREGISTREMENT_ID, int_AMOUNT_RECU, (int_AMOUNT_RECU == 0 ?
                    // OTPreenregistrementCompteClient.getIntPRICERESTE() :
                    // OTPreenregistrementCompteClient.getIntPRICERESTE() * (-1))); // a decommenter en cas de probleme
                    // 29/06/2016
                    new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(
                            OTPreenregistrementCompteClient.getLgCOMPTECLIENTID(), OTPreenregistrement,
                            OTPreenregistrementCompteClient.getIntPRICE() * (-1),
                            OTPreenregistrementCompteClient.getIntPRICERESTE() * (-1));

                }

                if (int_AMOUNT_RECU != 0) {
                    OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                            this.getOdataManager()); // a decommenter en cas de probleme. 18/05/2016
                    OcaisseManagement.AddRecette(new Double(OTPreenregistrementCompteClient.getIntPRICERESTE() + ""),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, OTTypeMvtCaisse.getStrDESCRIPTION(),
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                            Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_ANNULE_VENTE,
                            lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                            OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);
                }
                // fin code ajouté 18/05/2016

            } else {
                OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                        this.getOdataManager());
                TRecettes OTRecettes = OcaisseManagement.AddRecetteAnnulerVente(int_send_to_cashtransaction,
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                        str_type, bll.common.Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                        lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        commonparameter.TRANSACTION_CREDIT, true);
                if (OTRecettes == null) {
                    this.buildErrorTraceMessage("Impossible de cloture la vente", "la recette n'a pas pu etre MAJ");
                    return false;
                }
            }

            // fin code ajouté 25/04/2016
        }

        OTPreenregistrement.setLgREGLEMENTID(OTReglement);
        OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
        OTPreenregistrement.setStrREFBON(str_REF_BON);
        OTPreenregistrement.setStrORDONNANCE(str_ORDONNANCE);
        OTPreenregistrement.setDtUPDATED(new Date());
        OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
        OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());

        // code ajouté 13/08/2016
        OTPreenregistrement.setIntPRICEOTHER((-1) * OTPreenregistrementOld.getIntPRICEOTHER());
        if (OTParametersKey != null && OTParametersValue != null && Integer.parseInt(OTParametersKey.getStrVALUE()) == 1
                && OTPreenregistrement.getIntPRICE() != OTPreenregistrement.getIntPRICEOTHER() && date.formatterShort
                        .format(OTPreenregistrement.getDtUPDATED()).equals(OTParametersKey.getStrISENKRYPTED())) {
            new logger().OCategory.info("movement amount false before: " + OTParametersValue.getStrISENKRYPTED());
            OTParametersValue.setStrISENKRYPTED(String.valueOf(Integer.parseInt(OTParametersValue.getStrISENKRYPTED())
                    + OTPreenregistrementOld.getIntPRICEOTHER()));
            OTParametersValue.setDtUPDATED(new Date());
            new logger().OCategory.info("movement amount false after: " + OTParametersValue.getStrISENKRYPTED());
            this.getOdataManager().getEm().merge(OTParametersValue);
        }
        // fin code ajouté 13/08/2016

        this.persiste(OTPreenregistrement);
        String pkBrand = OTPreenregistrement.getPkBrand();
        if ("".equals(pkBrand)) {
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                if (OTPreenregistrementDetail.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
                    OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                    OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED());
                    OTPreenregistrementDetail.setDtUPDATED(new Date());
                    this.persiste(OTPreenregistrementDetail);
                    // OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                    // commonparameter.REMOVE, commonparameter.str_ACTION_VENTE,
                    // (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY() :
                    // OTPreenregistrementDetail.getIntAVOIR()), this.getOTUser().getLgEMPLACEMENTID());//a decommenter
                    // en cas de probleme 07/11/2016
                    OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                            commonparameter.ADD, commonparameter.str_ACTION_VENTE,
                            (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                    : OTPreenregistrementDetail.getIntAVOIR()),
                            this.getOTUser().getLgEMPLACEMENTID());
                    OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                            (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                    : OTPreenregistrementDetail.getIntAVOIR()));

                    OWarehouseManager.updateReelStock(OTPreenregistrementDetail,
                            (OTPreenregistrementDetail.getIntAVOIR() == 0
                                    ? (-1) * OTPreenregistrementDetail.getIntQUANTITY()
                                    : (-1) * OTPreenregistrementDetail.getIntAVOIR()),
                            "del"); // a remplacer par "ins" en cas de probleme
                }
            }
        } else {
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                if (OTPreenregistrementDetail.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
                    OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                    OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED());
                    OTPreenregistrementDetail.setDtUPDATED(new Date());
                    this.persiste(OTPreenregistrementDetail);
                    // OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                    // commonparameter.REMOVE, commonparameter.str_ACTION_VENTE,
                    // (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY() :
                    // OTPreenregistrementDetail.getIntAVOIR()), this.getOTUser().getLgEMPLACEMENTID());//a decommenter
                    // en cas de probleme 07/11/2016
                    OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                            commonparameter.ADD, commonparameter.str_ACTION_VENTE,
                            (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                    : OTPreenregistrementDetail.getIntAVOIR()),
                            this.getOTUser().getLgEMPLACEMENTID());
                    OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                            (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                    : OTPreenregistrementDetail.getIntAVOIR()));

                    OWarehouseManager.updateReelStock(OTPreenregistrementDetail,
                            (OTPreenregistrementDetail.getIntAVOIR() == 0
                                    ? (-1) * OTPreenregistrementDetail.getIntQUANTITY()
                                    : (-1) * OTPreenregistrementDetail.getIntAVOIR()),
                            "del"); // a remplacer par "ins" en cas de probleme
                    this.updateReelStockAnnulationDepot(OTPreenregistrementDetail,
                            (-1) * OTPreenregistrementDetail.getIntQUANTITY(), pkBrand);
                }
            }
        }
        this.refresh(OTPreenregistrement);
        // code ajouté. Mise a jour du calendrier de l'officine
        new CalendrierManager(this.getOdataManager(), this.getOTUser()).createCalendrier(date.getoMois(new Date()),
                Integer.parseInt(date.getAnnee(new Date())));
        // fin code ajouté

        return true;
    }

    private void createAnnulleSnapshot(TPreenregistrement preenregistrement, Integer montantPaye) {
        AnnulationSnapshot as = new AnnulationSnapshot();
        as.setMontant(preenregistrement.getIntPRICE());
        as.setMontantPaye(montantPaye);
        as.setDateOp(preenregistrement.getDtUPDATED());
        as.setPreenregistrement(preenregistrement);
        as.setRemise(preenregistrement.getIntPRICEREMISE());
        as.setUser(this.getOTUser());
        as.setCaissier(preenregistrement.getLgUSERCAISSIERID());
        if (preenregistrement.getStrTYPEVENTE().equals("VO")) {
            as.setMontantTP(preenregistrement.getIntPRICE()
                    - (preenregistrement.getIntCUSTPART() - preenregistrement.getIntPRICEREMISE()));
        }
        this.persiste(as);
    }

    public TPreenregistrement AnnulerVente(String lg_PREENREGISTREMENT_ID) throws JSONException {

        String str_type;
        String str_reglement;
        TPreenregistrement OTPreenregistrementNew;
        TParameters OTParameters = new TparameterManager(this.getOdataManager())
                .getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);
        if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                                    // automatique. False = fermeture automatique desactivée
            this.buildErrorTraceMessage("Paramètre d'autorisation de saisie de ventes sans bon inexistant");
            return null;

        }

        if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
            this.buildErrorTraceMessage("Impossible d'annuler la vente", "La caisse est fermée");
            return null;
        }

        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("Impossible dannuler la vente",
                    "Ref vente inconnue " + lg_PREENREGISTREMENT_ID);
            return null;
        }

        this.refresh(OTPreenregistrement);

        if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
            this.buildErrorTraceMessage("Impossible d annuler la vente", "la vente n'a jamais ete cloturee  "
                    + this.getOTranslate().getValue(commonparameter.statut_is_Process));
            return null;
        }
        if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && OTPreenregistrement.getBWITHOUTBON()) { // si valeur 0,
                                                                                                        // on passe en
                                                                                                        // cloture
                                                                                                        // manuelle
            this.buildErrorTraceMessage(
                    "Impossible d'annuler la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
            return null;
        }

        String CODEFACTURE = checkChargedPreenregistrement(lg_PREENREGISTREMENT_ID);
        if (!"".equals(CODEFACTURE)) {
            this.buildErrorTraceMessage(
                    "Impossible de supprimer cette vente. Elle figure déjà sur la facture :<span style='font-weight:900;'> "
                            + CODEFACTURE + "</span>");
            return null;
        }

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                OTPreenregistrement.getLgPREENREGISTREMENTID(), commonparameter.statut_is_Closed);
        if (lstTPreenregistrementDetail == null || lstTPreenregistrementDetail.isEmpty()) {
            this.buildErrorTraceMessage("Cette Vente na pas de details", "TPreenregistrementDetail is null");
            return null;
        }
        String LgTYPEVENTEID = OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID();

        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {
            str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
        } else {
            str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
        }

        List<TCashTransaction> lstTCashTransaction;
        lstTCashTransaction = this.getOdataManager().getEm()
                .createQuery(
                        "SELECT t FROM TCashTransaction t WHERE t.strRESSOURCEREF LIKE ?1  ORDER BY t.dtCREATED DESC  ")
                .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID()).getResultList();

        if (lstTCashTransaction == null || lstTCashTransaction.isEmpty()) {
            this.buildErrorTraceMessage("Cette Vente na pas de cash transaction", "lstTCashTransaction is null");
            return null;
        }

        TTypeReglement OTTypeReglement = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgMODEREGLEMENTID()
                .getLgTYPEREGLEMENTID(); // this.getOdataManager().getEm().find(dal.TTypeReglement.class,
                                         // lstTCashTransaction.get(0).getLgTYPEREGLEMENTID().);

        if (OTTypeReglement == null) {
            this.buildErrorTraceMessage("Error", "OTTypeReglement is null");
            return null;
        } else {

            str_reglement = OTTypeReglement.getLgTYPEREGLEMENTID();

        }
        int amount_recu = lstTCashTransaction.get(0).getIntAMOUNTRECU();
        int amount_remis = lstTCashTransaction.get(0).getIntAMOUNTREMIS();
        String strreglementid = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgREGLEMENTID();
        String strmotifreglementid = lstTCashTransaction.get(0).getLgMOTIFREGLEMENTID().getLgMOTIFREGLEMENTID();
        String strcompteclientref = lstTCashTransaction.get(0).getStrREFCOMPTECLIENT();

        TPreenregistrementDetail OTPreenregistrementDetail, OTPreenregistrementDetailNew;
        // OTPreenregistrementNew = this.CreatePreVente(OTPreenregistrement.getStrMEDECIN(),
        // OTPreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID(), new Date(),
        // Parameter.KEY_LAST_ORDER_NUMBER_VENTE, OTPreenregistrement.getLgUSERVENDEURID()); //a decommenter en cas de
        // probleme . 29/05/2016
        // code ajouté 29/05/2016
        OTPreenregistrementNew = this.CreatePreVente(OTPreenregistrement.getStrMEDECIN(),
                OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                OTPreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID(), OTPreenregistrement.getLgREMISEID(),
                new Date(), "", OTPreenregistrement.getLgUSERVENDEURID(), OTPreenregistrement.getStrFIRSTNAMECUSTOMER(),
                OTPreenregistrement.getStrLASTNAMECUSTOMER());
        OTPreenregistrementNew.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
        // fin code ajouté 29/05/2016

        OTPreenregistrementNew.setLgREMISEID(OTPreenregistrement.getLgREMISEID());

        // code ajouté pris en compte du nom de l'acheteur
        OTPreenregistrementNew.setStrFIRSTNAMECUSTOMER(OTPreenregistrement.getStrFIRSTNAMECUSTOMER());
        OTPreenregistrementNew.setStrLASTNAMECUSTOMER(OTPreenregistrement.getStrLASTNAMECUSTOMER());
        OTPreenregistrementNew.setStrNUMEROSECURITESOCIAL(OTPreenregistrement.getStrNUMEROSECURITESOCIAL());
        OTPreenregistrementNew.setStrPHONECUSTOME(OTPreenregistrement.getStrPHONECUSTOME());
        OTPreenregistrementNew.setIntPRICEREMISE((-1) * OTPreenregistrement.getIntPRICEREMISE());
        OTPreenregistrementNew.setStrTYPEVENTE(str_type);
        OTPreenregistrementNew.setStrSTATUTVENTE(OTPreenregistrement.getStrSTATUTVENTE());
        OTPreenregistrementNew.setIntACCOUNT((-1) * OTPreenregistrement.getIntACCOUNT());
        OTPreenregistrementNew.setIntREMISEPARA((-1) * OTPreenregistrement.getIntREMISEPARA());
        OTPreenregistrementNew.setPkBrand(OTPreenregistrement.getPkBrand());
        this.persiste(OTPreenregistrementNew);
        createAnnulleSnapshot(OTPreenregistrement, lstTCashTransaction.get(0).getIntAMOUNT());
        // fin code ajouté
        if (LgTYPEVENTEID.equals(Parameter.VENTE_ASSURANCE) || LgTYPEVENTEID.equals(Parameter.VENTE_AVEC_CARNET)) { // cas
                                                                                                                    // des
                                                                                                                    // ventes
                                                                                                                    // ordonnancées
            List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent;

            lstTPreenregistrementCompteClientTiersPayent = this.getListeTPreenregistrementCompteClientTiersPayent(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());

            if (lstTPreenregistrementCompteClientTiersPayent == null
                    || lstTPreenregistrementCompteClientTiersPayent.isEmpty()
                            && (LgTYPEVENTEID.equals(bll.common.Parameter.TYPE_VENTE_CARNET)
                                    || LgTYPEVENTEID.equals(bll.common.Parameter.TYPE_VENTE_ASSURANCE))) {
                this.buildErrorTraceMessage("Cette Vente n'a pas de tiers",
                        "La liste des tiers payants de cette vente est vide");
                return null;
            }

            // construction de la liste des tiers payants lié à la vente à annuler
            ArrayList<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
            for (int i = 0; i < lstTPreenregistrementCompteClientTiersPayent.size(); i++) {
                TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = lstTPreenregistrementCompteClientTiersPayent
                        .get(i);
                lstTCompteClientTiersPayant
                        .add(OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID());
            }
            // construction de la liste des tiers payants lié à la vente à annuler

            // création du détail de la vente
            for (int i = 0; i < lstTPreenregistrementDetail.size(); i++) {
                OTPreenregistrementDetail = lstTPreenregistrementDetail.get(i);
                // this.CreateDetailsPreenregistrement(OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                // OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(), (OTPreenregistrementDetail.getIntPRICE()
                // * (-1)), (OTPreenregistrementDetail.getIntQUANTITY() * (-1)),
                // (OTPreenregistrementDetail.getIntQUANTITYSERVED() * (-1)),
                // OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(), lstTCompteClientTiersPayant,
                // OTPreenregistrement.getLgREMISEID(), OTPreenregistrementNew.getDtCREATED(),
                // OTPreenregistrementDetail.getIntPRICEUNITAIR(), (OTPreenregistrementDetail.getIntAVOIR() * (-1)),
                // OTPreenregistrementDetail.getIntFREEPACKNUMBER()); // code ajouté 13/08/2016
                OTPreenregistrementDetailNew = this.CreateDetailsPreenregistrement(
                        OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                        OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        (OTPreenregistrementDetail.getIntPRICE() * (-1)),
                        (OTPreenregistrementDetail.getIntQUANTITY() * (-1)),
                        (OTPreenregistrementDetail.getIntQUANTITYSERVED() * (-1)),
                        OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(), lstTCompteClientTiersPayant,
                        OTPreenregistrement.getLgREMISEID(), OTPreenregistrementNew.getDtCREATED(),
                        OTPreenregistrementDetail.getIntPRICEUNITAIR(),
                        (OTPreenregistrementDetail.getIntAVOIR() * (-1)),
                        OTPreenregistrementDetail.getIntFREEPACKNUMBER());
                if (OTPreenregistrementDetailNew != null) {
                    OTPreenregistrementDetailNew.setIntPRICEOTHER((-1) * OTPreenregistrementDetail.getIntPRICEOTHER());
                    OTPreenregistrementDetailNew
                            .setIntPRICEDETAILOTHER(OTPreenregistrementDetail.getIntPRICEDETAILOTHER());
                    this.persiste(OTPreenregistrementDetailNew);
                }
            }
            // création du détail de la vente

            if (lstTCompteClientTiersPayant.isEmpty() && (LgTYPEVENTEID.equals(bll.common.Parameter.TYPE_VENTE_CARNET)
                    || LgTYPEVENTEID.equals(bll.common.Parameter.TYPE_VENTE_ASSURANCE))) {
                this.buildErrorTraceMessage("pas de compte tiers", "lstTCompteClientTiersPayant is null");
                return null;
            }

            new DiffereManagement(this.getOdataManager(), this.getOTUser()).CloturerAnnulerVente(
                    OTPreenregistrementNew.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrREFBON(),
                    str_reglement, OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                    (OTPreenregistrement.getIntPRICE() * (-1)), (amount_recu * (-1)), (amount_remis * (-1)),
                    lstTCompteClientTiersPayant, strreglementid, strcompteclientref, strmotifreglementid,
                    OTPreenregistrement.getStrORDONNANCE(), OTPreenregistrement);
        } else {
            for (int i = 0; i < lstTPreenregistrementDetail.size(); i++) {
                OTPreenregistrementDetail = lstTPreenregistrementDetail.get(i);
                OTPreenregistrementDetailNew = this.CreateDetailsPreenregistrement(
                        OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                        OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        (OTPreenregistrementDetail.getIntPRICE() * (-1)),
                        (OTPreenregistrementDetail.getIntQUANTITY() * (-1)),
                        (OTPreenregistrementDetail.getIntQUANTITYSERVED() * (-1)),
                        OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(), null,
                        OTPreenregistrement.getLgREMISEID(), OTPreenregistrementNew.getDtCREATED(),
                        OTPreenregistrementDetail.getIntPRICEUNITAIR(),
                        (OTPreenregistrementDetail.getIntAVOIR() * (-1)),
                        OTPreenregistrementDetail.getIntFREEPACKNUMBER());
                if (OTPreenregistrementDetailNew != null) {
                    OTPreenregistrementDetailNew.setIntPRICEOTHER((-1) * OTPreenregistrementDetail.getIntPRICEOTHER());
                    OTPreenregistrementDetailNew
                            .setIntPRICEDETAILOTHER(OTPreenregistrementDetail.getIntPRICEDETAILOTHER());
                    this.persiste(OTPreenregistrementDetailNew);
                }
            }
            this.CloturerAnnulerVente(OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrREFBON(), str_reglement,
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                    (OTPreenregistrement.getIntPRICE() * (-1)), (amount_recu * (-1)), (amount_remis * (-1)),
                    strreglementid, strcompteclientref, strmotifreglementid, OTPreenregistrement.getStrORDONNANCE(), 0,
                    OTPreenregistrement);

        }
        // OTPreenregistrement.setDtUPDATED(new Date());
        OTPreenregistrement.setBISCANCEL(Boolean.TRUE);
        OTPreenregistrement.setDtANNULER(new Date());

        OTPreenregistrementNew.setLgUSERVENDEURID(OTPreenregistrement.getLgUSERVENDEURID());
        OTPreenregistrement.setLgPREENGISTREMENTANNULEID(OTPreenregistrementNew.getLgPREENREGISTREMENTID());

        this.persiste(OTPreenregistrement);
        // Ajout du code de traçage
        this.do_event_log(commonparameter.ALL, "Annulation de la vente de référence " + OTPreenregistrement.getStrREF(),
                this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                commonparameter.statut_enable, "TPreenregistrement", "Annulation de vente", "Annulation de vente",
                this.getOTUser().getLgUSERID());

        this.buildTraceMessage("Succes", " Operation effectuee avec succes");
        return OTPreenregistrementNew;
    }

    // code ajouté
    // liste des ventes sur une période dans un emplacement donné
    public List<TPreenregistrement> listTPreenregistrement(String search_value, Date dtDEBUT, Date dtFin,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String str_STATUT) {

        List<TPreenregistrement> lstTPreenregistrement = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t WHERE t.strREF LIKE ?1 AND (t.dtCREATED BETWEEN ?3 AND ?4) AND t.lgPREENREGISTREMENTID LIKE ?2 AND t.lgUSERID.lgUSERID LIKE ?5 AND t.strSTATUT LIKE ?7 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.dtCREATED ASC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(7, str_STATUT).setParameter(8, lg_EMPLACEMENT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrement taille " + lstTPreenregistrement.size());
        return lstTPreenregistrement;
    }
    // fin liste des ventes sur une période

    // liste des ventes faites a un depot
    public List<TPreenregistrement> listTPreenregistrementForDepot(String search_value, Date dtDEBUT, Date dtFin,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID, String str_STATUT, String lg_NATURE_VENTE_ID) {

        List<TPreenregistrement> lstTPreenregistrement = new ArrayList<TPreenregistrement>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t WHERE (t.dtCREATED BETWEEN ?3 AND ?4) AND t.lgPREENREGISTREMENTID LIKE ?2 AND t.lgUSERID.lgUSERID LIKE ?5 AND t.strSTATUT LIKE ?7 AND t.lgNATUREVENTEID.lgNATUREVENTEID LIKE ?8 ORDER BY t.dtCREATED DESC")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(5, lg_USER_ID).setParameter(7, str_STATUT).setParameter(8, lg_NATURE_VENTE_ID)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrement taille " + lstTPreenregistrement.size());
        return lstTPreenregistrement;
    }

    // fin liste des ventes faites a un depot
    // liste des impayés d'un tiers payant sur une periode
    public List<TPreenregistrementCompteClientTiersPayent> listTPreenregistrementCompteClientTiersPayent(
            String search_value, Date dtDEBUT, Date dtFin, String lg_USER_ID, String lg_PREENREGISTREMENT_ID,
            String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID) {

        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t,TFactureDetail o WHERE (t.lgPREENREGISTREMENTID.dtCREATED BETWEEN ?3 AND ?4) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND (t.strSTATUTFACTURE LIKE ?7 OR t.strSTATUTFACTURE LIKE ?9) AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11 AND t.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=o.strREF AND o.strSTATUT <>?12 AND (t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR  t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strNUMEROSECURITESOCIAL LIKE ?13 OR t.lgPREENREGISTREMENTID.strREF LIKE ?13 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?13  ) ORDER BY t.dtCREATED DESC")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(5, lg_USER_ID).setParameter(7, commonparameter.statut_unpaid)
                    .setParameter(9, commonparameter.CHARGED).setParameter(8, lg_EMPLACEMENT_ID)
                    .setParameter(10, lg_COMPTE_CLIENT_ID).setParameter(11, lg_TIERS_PAYANT_ID)
                    .setParameter(12, commonparameter.statut_paid).setParameter(13, search_value + "%").getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTPreenregistrementCompteClientTiersPayent;
    }

    public List<TPreenregistrementCompteClientTiersPayent> listTPreenregistrementCompteClientTiersPayent(
            String search_value, Date dtDATE, String lg_USER_ID, String lg_PREENREGISTREMENT_ID,
            String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID) {

        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE (t.lgPREENREGISTREMENTID.dtCREATED < ?3) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND (t.strSTATUTFACTURE LIKE ?7 OR t.strSTATUTFACTURE LIKE ?9) AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11 ORDER BY t.dtCREATED DESC")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDATE).setParameter(5, lg_USER_ID)
                    .setParameter(7, commonparameter.statut_unpaid).setParameter(9, commonparameter.CHARGED)
                    .setParameter(8, lg_EMPLACEMENT_ID).setParameter(10, lg_COMPTE_CLIENT_ID)
                    .setParameter(11, lg_TIERS_PAYANT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrementCompteClientTiersPayent taille "
                + lstTPreenregistrementCompteClientTiersPayent.size());
        return lstTPreenregistrementCompteClientTiersPayent;
    }
    // fin liste des impayés d'un tiers payant sur période

    // quantité de produits vendus aux clients d'un tiers payant sur une periode
    public int getQauntityProductVenteToCustomerOFTierspayant(String search_value, Date dtDEBUT, Date dtFin,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        int result = 0;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        List<String> lstString = new ArrayList<String>();
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager());
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.listTPreenregistrementCompteClientTiersPayent(
                    search_value, dtDEBUT, dtFin, lg_USER_ID, lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID,
                    lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID);
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                if (lstString.size() == 0) {
                    lstString.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());

                    result += OSnapshotManager.getQauntityVenteByArticle("", dtDEBUT, dtFin, "%%", lg_USER_ID,
                            lstString.get(0));
                } else if (!lstString.get(0).equals(OTPreenregistrementCompteClientTiersPayent
                        .getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID())) {
                    result += OSnapshotManager.getQauntityVenteByArticle("", dtDEBUT, dtFin, "%%", lg_USER_ID,
                            OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                                    .getLgPREENREGISTREMENTID());
                    lstString.clear();
                    lstString.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    public int getQauntityProductVenteToCustomerOFTierspayant(String search_value, Date dtDATE, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        int result = 0;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        List<String> lstString = new ArrayList<>();
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager());
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.listTPreenregistrementCompteClientTiersPayent(
                    search_value, dtDATE, lg_USER_ID, lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID,
                    lg_TIERS_PAYANT_ID);
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                if (lstString.size() == 0) {
                    lstString.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());

                    result += OSnapshotManager.getQauntityVenteByArticle("", dtDATE, "%%", lg_USER_ID,
                            lstString.get(0));
                } else if (!lstString.get(0).equals(OTPreenregistrementCompteClientTiersPayent
                        .getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID())) {
                    result += OSnapshotManager.getQauntityVenteByArticle("", dtDATE, "%%", lg_USER_ID,
                            OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                                    .getLgPREENREGISTREMENTID());
                    lstString.clear();
                    lstString.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }
    // fin quantité de produits vendus aux clients d'un tiers payant sur une periode

    // nombre de transaction de vente aux clients d'un tiers payant sur une periode
    public int getNombreTransactionVenteByCpteCltTiersP(String search_value, Date dtDEBUT, Date dtFin,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        int result = 0;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.listTPreenregistrementCompteClientTiersPayent(
                    search_value, dtDEBUT, dtFin, lg_USER_ID, lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID,
                    lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID);
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                result++;
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    public int getNombreTransactionVenteByCpteCltTiersP(String search_value, Date dtDATE, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        int result = 0;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.listTPreenregistrementCompteClientTiersPayent(
                    search_value, dtDATE, lg_USER_ID, lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID,
                    lg_TIERS_PAYANT_ID);
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                result++;
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }
    // fin nombre de transaction de vente aux clients d'un tiers payant sur une periode

    // montant des ventes aux clients d'un tiers payant sur une periode
    public int getAmountVenteByCpteCltTiersP(String search_value, Date dtDEBUT, Date dtFin, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        int result = 0;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.listTPreenregistrementCompteClientTiersPayent(
                    search_value, dtDEBUT, dtFin, lg_USER_ID, lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID,
                    lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID);
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                result += OTPreenregistrementCompteClientTiersPayent.getIntPRICERESTE();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    public int getAmountVenteByCpteCltTiersP(String search_value, Date dtDATE, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        int result = 0;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.listTPreenregistrementCompteClientTiersPayent(
                    search_value, dtDATE, lg_USER_ID, lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID, lg_COMPTE_CLIENT_ID,
                    lg_TIERS_PAYANT_ID);
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                result += OTPreenregistrementCompteClientTiersPayent.getIntPRICE();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }
    // fin montant des ventes aux clients d'un tiers payant sur une periode

    // recuperation d'une vente fonction de la reference de la vente
    public TPreenregistrement getTPreenregistrementByRef(String str_REF) {
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = (TPreenregistrement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t  WHERE (t.strREFBON = ?1 OR t.lgPREENREGISTREMENTID = ?1 OR t.strREF = ?1 OR t.strREFTICKET = ?1)")
                    .setParameter(1, str_REF).getSingleResult();
            new logger().OCategory.info("Montant de la vente " + OTPreenregistrement.getIntPRICE());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTPreenregistrement;
    }
    // fin recuperation d'une vente fonction de la reference de la vente

    // recuperation du client qui a vente fonction de la reference de la vente
    public TPreenregistrementCompteClient getTPreenregistrementCompteClient(String lg_PREENREGISTREMENT_ID) {
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        try {
            OTPreenregistrementCompteClient = (TPreenregistrementCompteClient) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TPreenregistrementCompteClient t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).getSingleResult();
            new logger().OCategory
                    .info("Montant endocé par le client " + OTPreenregistrementCompteClient.getIntPRICE());
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTPreenregistrementCompteClient;
    }
    // fin recuperation du client qui a vente fonction de la reference de la vente

    public List<TPreenregistrementDetail> getTPreenregistrementDetailBis(String lgPREENREGISTREMENTID) {
        List<TPreenregistrementDetail> lstT = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 AND t.strSTATUT LIKE ?3")
                .setParameter(3, commonparameter.statut_is_Closed).setParameter(4, lgPREENREGISTREMENTID)
                .getResultList();

        return lstT;
    }

    // fin code ajouté
    public static TCashTransaction getTCashTransactionByVENTE_ID(String VENTE_ID) {

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT t_cash_transaction.`int_AMOUNT_REMIS` AS Monnaie,
            // t_cash_transaction.`int_AMOUNT_RECU` AS Verse, SUM(ABS(t_cash_transaction.`int_AMOUNT`))AS Total,
            // t_preenregistrement.`int_PRICE_REMISE` AS Remise, t_cash_transaction.int_AMOUNT_CREDIT,
            // t_cash_transaction.int_AMOUNT_DEBIT, t_type_reglement.`str_NAME` AS Reglement FROM `t_cash_transaction`
            // t_cash_transaction INNER JOIN `t_preenregistrement` t_preenregistrement ON
            // t_cash_transaction.`str_RESSOURCE_REF` = t_preenregistrement.`lg_PREENREGISTREMENT_ID` INNER JOIN
            // `t_type_reglement` t_type_reglement ON t_cash_transaction.`lg_TYPE_REGLEMENT_ID` =
            // t_type_reglement.`lg_TYPE_REGLEMENT_ID` WHERE t_cash_transaction.str_RESSOURCE_REF LIKE '" + VENTE_ID +
            // "'"; // a decommenter en cas de probleme
            String qry = "SELECT t_cash_transaction.`int_AMOUNT_REMIS` AS Monnaie, t_cash_transaction.`int_AMOUNT_RECU` AS Verse, SUM(ABS(t_cash_transaction.`int_AMOUNT`)) AS Total, t_preenregistrement.`int_PRICE_REMISE` AS Remise, t_cash_transaction.int_AMOUNT_CREDIT, t_cash_transaction.int_AMOUNT_DEBIT, (CASE WHEN t_type_reglement.`str_NAME` = 'Differe' THEN 'Especes' ELSE t_type_reglement.`str_NAME` END) AS Reglement  FROM `t_cash_transaction` t_cash_transaction INNER JOIN `t_preenregistrement` t_preenregistrement ON t_cash_transaction.`str_RESSOURCE_REF` = t_preenregistrement.`lg_PREENREGISTREMENT_ID` INNER JOIN `t_type_reglement` t_type_reglement ON t_cash_transaction.`lg_TYPE_REGLEMENT_ID` = t_type_reglement.`lg_TYPE_REGLEMENT_ID` WHERE t_cash_transaction.str_RESSOURCE_REF LIKE '"
                    + VENTE_ID + "'";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TCashTransaction OTCashTransaction = new TCashTransaction();
                OTCashTransaction.setIntAMOUNTREMIS(Ojconnexion.get_resultat().getInt("Monnaie"));
                OTCashTransaction.setIntAMOUNTRECU(Ojconnexion.get_resultat().getInt("Verse"));
                OTCashTransaction.setIntAMOUNT(Ojconnexion.get_resultat().getInt("Total"));
                OTCashTransaction.setIntAMOUNTCREDIT(Ojconnexion.get_resultat().getInt("int_AMOUNT_CREDIT"));
                OTCashTransaction.setIntAMOUNTDEBIT(Ojconnexion.get_resultat().getInt("int_AMOUNT_DEBIT"));
                OTCashTransaction.setLgTYPEREGLEMENTID(Ojconnexion.get_resultat().getString("Reglement"));

                Ojconnexion.CloseConnexion();
                return OTCashTransaction;
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        return null;
    }

    public List<String> generateData(TPreenregistrement OTPreenregistrement,
            List<TPreenregistrementDetail> lstTPreenregistrementDetail) {
        List<String> datas = new ArrayList<>();

        System.out.println("OTPreenregistrement ----- > " + OTPreenregistrement + " lstTPreenregistrementDetail "
                + lstTPreenregistrementDetail.size() + " OTPreenregistrement.getIntPRICE() "
                + OTPreenregistrement.getIntPRICE());
        if (OTPreenregistrement.getIntPRICE() >= 0) {
            lstTPreenregistrementDetail.forEach((OTPreenregistrementDetail) -> {
                datas.add(" " + OTPreenregistrementDetail.getIntQUANTITY() + "; *;"
                        + DataStringManager.subStringData(
                                OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(), 0, 20)
                        + ";" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR()) + ";"
                        + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE()));
            });
        } else {
            lstTPreenregistrementDetail.forEach((OTPreenregistrementDetail) -> {
                // datas.add(" " + (-1 * OTPreenregistrementDetail.getIntQUANTITY()) + ";*;" +
                // DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
                // 0, 16) + ";" + conversion.AmountFormat(OTPreenregistrementDetail.getLgFAMILLEID().getIntPRICE()) +
                // ";" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE() * (-1))); // a decommenter en
                // cas de probleme
                datas.add(" " + (-1 * OTPreenregistrementDetail.getIntQUANTITY()) + ";*;"
                        + DataStringManager.subStringData(
                                OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(), 0, 16)
                        + ";" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR()) + ";"
                        + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE() * (-1)));
            });
        }
        // TCashTransaction OTCashTransaction =
        // this.getTCashTransactionByVENTE_ID(OTPreenregistrement.getLgPREENREGISTREMENTID());
        // String P_TOTAL_VALUE = conversion.AmountFormat(new Integer((OTCashTransaction.getIntAMOUNT())));
        // datas.add(";*;;" + conversion.AmountFormat((OTCashTransaction.getIntAMOUNT() >= 0) ?
        // OTCashTransaction.getIntAMOUNT() : (-1) * OTCashTransaction.getIntAMOUNT()));
        datas.add(";;;;------");
        datas.add(";;;;" + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0)
                ? OTPreenregistrement.getIntPRICE() : (-1) * OTPreenregistrement.getIntPRICE()));
        return datas;
    }

    // chargement des données d'une vente
    public List<String> generateData(TPreenregistrement OTPreenregistrement) {
        List<String> datas = new ArrayList<>();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                .getTPreenregistrementDetailBis(OTPreenregistrement.getLgPREENREGISTREMENTID());
        if (OTPreenregistrement.getIntPRICE() >= 0) {
            lstTPreenregistrementDetail.forEach((OTPreenregistrementDetail) -> {
                datas.add(" " + OTPreenregistrementDetail.getIntQUANTITY() + "; *;"
                        + DataStringManager.subStringData(
                                OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(), 0, 20)
                        + ";" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR()) + ";"
                        + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE()));
            });
        } else {
            lstTPreenregistrementDetail.forEach((OTPreenregistrementDetail) -> {
                // datas.add(" " + (-1 * OTPreenregistrementDetail.getIntQUANTITY()) + ";*;" +
                // DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
                // 0, 16) + ";" + conversion.AmountFormat(OTPreenregistrementDetail.getLgFAMILLEID().getIntPRICE()) +
                // ";" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE() * (-1))); // a decommenter en
                // cas de probleme
                datas.add(" " + (-1 * OTPreenregistrementDetail.getIntQUANTITY()) + ";*;"
                        + DataStringManager.subStringData(
                                OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(), 0, 16)
                        + ";" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR()) + ";"
                        + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE() * (-1)));
            });
        }
        // TCashTransaction OTCashTransaction =
        // this.getTCashTransactionByVENTE_ID(OTPreenregistrement.getLgPREENREGISTREMENTID());
        // String P_TOTAL_VALUE = conversion.AmountFormat(new Integer((OTCashTransaction.getIntAMOUNT())));
        // datas.add(";*;;" + conversion.AmountFormat((OTCashTransaction.getIntAMOUNT() >= 0) ?
        // OTCashTransaction.getIntAMOUNT() : (-1) * OTCashTransaction.getIntAMOUNT()));
        datas.add(";;;;------");
        datas.add(";;;;" + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0)
                ? OTPreenregistrement.getIntPRICE() : (-1) * OTPreenregistrement.getIntPRICE()));
        return datas;
    }

    public List<String> generateDataSummary2(TPreenregistrement OTPreenregistrement) {
        List<String> datas = new ArrayList<>();
        int vente_net = 0;

        TCashTransaction OTCashTransaction = getTCashTransactionByVENTE_ID(
                OTPreenregistrement.getLgPREENREGISTREMENTID());

        if (OTPreenregistrement.getStrTYPEVENTE().equalsIgnoreCase(Parameter.KEY_VENTE_ORDONNANCE)) { // ancienne bonne
                                                                                                      // version
            if (OTPreenregistrement.getIntCUSTPART() == 0) {
                if (OTPreenregistrement.getIntPRICEREMISE() > 0) {
                    datas.add("Remise: ;(-) " + conversion.AmountFormat(OTPreenregistrement.getIntPRICEREMISE())
                            + "; F CFA;1");
                }
                // ajoute le 22 05 2017 pour annulation depot
                if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("5")
                        || OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("4")) {

                    datas.add("Vente à terme: ;    "
                            + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0)
                                    ? OTCashTransaction.getIntAMOUNTDEBIT() : OTPreenregistrement.getIntPRICE())
                            + "; F CFA;1");
                } else {
                    datas.add("Vente à terme: ;    " + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0)
                            ? OTCashTransaction.getIntAMOUNTDEBIT() : (-1) * OTCashTransaction.getIntAMOUNTCREDIT())
                            + "; F CFA;1");
                }
            } else {
                vente_net = Maths.arrondiModuloOfNumber(OTPreenregistrement.getIntCUSTPART(), 5);
                // vente_net =
                // Maths.arrondiModuloOfNumber(OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)
                // ? OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE() :
                // (OTPreenregistrement.getIntCUSTPART() == 0 ? 0 : (OTPreenregistrement.getIntCUSTPART() -
                // OTPreenregistrement.getIntPRICEREMISE() >= 0 ? OTPreenregistrement.getIntCUSTPART() -
                // OTPreenregistrement.getIntPRICEREMISE() : 0)), 5);
                if (OTPreenregistrement.getIntPRICEREMISE() > 0) {
                    datas.add("Remise: ;(-) " + conversion.AmountFormat(OTPreenregistrement.getIntPRICEREMISE())
                            + "; F CFA;1");
                }

                // datas.add("Net à payer: ; " + conversion.AmountFormat(OTPreenregistrement.getIntCUSTPART()) + "; F
                // CFA;1"); bonne version. a decommenter en cas de probleme
                datas.add("Net à payer: ;     " + conversion.AmountFormat(vente_net) + "; F CFA;1");
                datas.add("Règlement: ;     " + OTCashTransaction.getLgTYPEREGLEMENTID() + "; ;0");

                if (OTPreenregistrement.getIntPRICE() >= 0) {
                    datas.add("Montant Versé: ;     "
                            + conversion
                                    .AmountFormat(Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTRECU(), 5))
                            + "; F CFA;0");
                    // datas.add("Monnaie: ; " + conversion.AmountFormat(OTCashTransaction.getIntAMOUNTREMIS()) + "; F
                    // CFA;0"); bonne version. a decommenter en cas de probleme
                    datas.add("Monnaie: ;     "
                            + conversion.AmountFormat((OTCashTransaction.getIntAMOUNTRECU() - vente_net >= 0
                                    ? OTCashTransaction.getIntAMOUNTRECU() - vente_net : 0))
                            + "; F CFA;0");
                }
            }
        } else {
            if (OTPreenregistrement.getIntPRICEREMISE() > 0) {
                datas.add("Remise: ;(-) " + conversion.AmountFormat(OTPreenregistrement.getIntPRICEREMISE())
                        + "; F CFA;1");
            }
            /*
             * vente_net = Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTCREDIT(), 5); // ancien bon code. a
             * decommenter en cas de probleme datas.add("Net à payer: ;     " +
             * conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0) ? vente_net : (-1) *
             * Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTDEBIT(), 5)) + "; F CFA;1");
             */

            vente_net = OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE();
            datas.add(
                    "Net à payer: ;     "
                            + conversion.AmountFormat(
                                    (OTPreenregistrement.getIntPRICE() >= 0) ? Maths.arrondiModuloOfNumber(vente_net, 5)
                                            : Maths.arrondiModuloOfNumber(OTPreenregistrement.getIntPRICE()
                                                    + ((-1) * OTPreenregistrement.getIntPRICEREMISE()), 5))
                            + "; F CFA;1");
            datas.add("Règlement: ;     " + OTCashTransaction.getLgTYPEREGLEMENTID() + "; ;0");

            if (OTPreenregistrement.getIntPRICE() >= 0) {
                datas.add("Montant Versé: ;     "
                        + conversion.AmountFormat(Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTRECU(), 5))
                        + "; F CFA;0");
                // datas.add("Monnaie: ; " + conversion.AmountFormat(OTCashTransaction.getIntAMOUNTREMIS()) + "; F
                // CFA;0"); bonne version. a decommenter en cas de probleme
                datas.add("Monnaie: ;     "
                        + conversion.AmountFormat((OTCashTransaction.getIntAMOUNTRECU() - vente_net >= 0
                                ? OTCashTransaction.getIntAMOUNTRECU() - vente_net : 0))
                        + "; F CFA;0");
            }

        }

        return datas;
    }

    public List<String> generateDataSummary(TPreenregistrement OTPreenregistrement) {
        List<String> datas = new ArrayList<>();
        try {

            int vente_net;

            TCashTransaction OTCashTransaction = getTCashTransactionByVENTE_ID(
                    OTPreenregistrement.getLgPREENREGISTREMENTID());
            if (OTPreenregistrement.getStrTYPEVENTE().equals(Parameter.KEY_VENTE_ORDONNANCE)) { // ancienne bonne
                                                                                                // version
                if (OTPreenregistrement.getIntCUSTPART() == 0) {
                    if (OTPreenregistrement.getIntPRICEREMISE() > 0) {
                        datas.add("Remise: ;(-) " + conversion.AmountFormat(OTPreenregistrement.getIntPRICEREMISE())
                                + "; F CFA;1");
                    }
                    String lgTyvente = OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID();
                    if (lgTyvente.equals(Parameter.VENTE_ASSURANCE) || lgTyvente.equals(Parameter.VENTE_AVEC_CARNET)) {
                        datas.add("Vente à terme: ;    " + conversion.AmountFormat(
                                (OTPreenregistrement.getIntPRICE() >= 0) ? OTCashTransaction.getIntAMOUNTDEBIT()
                                        : (-1) * OTCashTransaction.getIntAMOUNTCREDIT())
                                + "; F CFA;1");
                        // datas.add("Vente à terme: ; " + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >=
                        // 0) ? OTCashTransaction.getIntAMOUNTDEBIT() :
                        // Math.abs(OTCashTransaction.getIntAMOUNTCREDIT())) + "; F CFA;1");
                    } else {
                        datas.add("Vente à terme: ;    "
                                + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0)
                                        ? OTCashTransaction.getIntAMOUNTDEBIT() : OTPreenregistrement.getIntPRICE())
                                + "; F CFA;1");
                        // datas.add("Vente à terme: ; " + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >=
                        // 0) ? OTCashTransaction.getIntAMOUNTDEBIT() : Math.abs(OTPreenregistrement.getIntPRICE())) +
                        // "; F CFA;1");
                    }
                } else {

                    int partClient = OTPreenregistrement.getIntCUSTPART();
                    if (partClient < 0) {
                        vente_net = (-1) * Maths.arrondiModuloOfNumber(Math.abs(partClient), 5);
                    } else {
                        vente_net = Maths.arrondiModuloOfNumber(partClient, 5);
                    }

                    int remise = OTPreenregistrement.getIntPRICEREMISE();
                    if (remise > 0) {
                        datas.add("Remise: ;(-) " + conversion.AmountFormat(remise) + "; F CFA;1");
                    }

                    // datas.add("Net à payer: ; " + conversion.AmountFormat(OTPreenregistrement.getIntCUSTPART()) + ";
                    // F CFA;1"); bonne version. a decommenter en cas de probleme
                    datas.add("Net à payer: ;     "
                            + conversion.AmountFormat(Maths.arrondiModuloOfNumber((vente_net - remise), 5))
                            + "; F CFA;1");
                    // datas.add("Net à payer: ; " + conversion.AmountFormat(vente_net) + "; F CFA;1");//11/102017
                    datas.add("Règlement: ;     " + OTCashTransaction.getLgTYPEREGLEMENTID() + "; ;0");

                    if (OTPreenregistrement.getIntPRICE() >= 0) {
                        datas.add("Montant Versé: ;     "
                                + conversion.AmountFormat(
                                        Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTRECU(), 5))
                                + "; F CFA;0");
                        // datas.add("Monnaie: ; " + conversion.AmountFormat(OTCashTransaction.getIntAMOUNTREMIS()) + ";
                        // F CFA;0"); bonne version. a decommenter en cas de probleme
                        int change = OTCashTransaction.getIntAMOUNTRECU() - (vente_net - remise);
                        // datas.add("Monnaie: ; " + conversion.AmountFormat((OTCashTransaction.getIntAMOUNTRECU() -
                        // vente_net >= 0 ? OTCashTransaction.getIntAMOUNTRECU() - vente_net : 0)) + "; F CFA;0");
                        datas.add(
                                "Monnaie: ;     " + conversion.AmountFormat((change >= 0 ? change : 0)) + "; F CFA;0");
                    }
                }
            } else {
                if (OTPreenregistrement.getIntPRICEREMISE() > 0) {
                    datas.add("Remise: ;(-) " + conversion.AmountFormat(OTPreenregistrement.getIntPRICEREMISE())
                            + "; F CFA;1");
                }
                /*
                 * vente_net = Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTCREDIT(), 5); // ancien bon
                 * code. a decommenter en cas de probleme datas.add("Net à payer: ;     " +
                 * conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0) ? vente_net : (-1) *
                 * Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTDEBIT(), 5)) + "; F CFA;1");
                 */

                vente_net = OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE();
                datas.add(
                        "Net à payer: ;     "
                                + conversion
                                        .AmountFormat((OTPreenregistrement.getIntPRICE() >= 0)
                                                ? Maths.arrondiModuloOfNumber(vente_net, 5)
                                                : Maths.arrondiModuloOfNumber(OTPreenregistrement.getIntPRICE()
                                                        + ((-1) * OTPreenregistrement.getIntPRICEREMISE()), 5))
                                + "; F CFA;1");
                // datas.add("Net à payer: ; " + conversion.AmountFormat((OTPreenregistrement.getIntPRICE() >= 0) ?
                // Maths.arrondiModuloOfNumber(vente_net, 5) :
                // Math.abs(Maths.arrondiModuloOfNumber(OTPreenregistrement.getIntPRICE() + ((-1) *
                // OTPreenregistrement.getIntPRICEREMISE()), 5))) + "; F CFA;1");
                datas.add("Règlement: ;     " + OTCashTransaction.getLgTYPEREGLEMENTID() + "; ;0");

                if (OTPreenregistrement.getIntPRICE() >= 0) {
                    datas.add("Montant Versé: ;     "
                            + conversion
                                    .AmountFormat(Maths.arrondiModuloOfNumber(OTCashTransaction.getIntAMOUNTRECU(), 5))
                            + "; F CFA;0");
                    // datas.add("Monnaie: ; " + conversion.AmountFormat(OTCashTransaction.getIntAMOUNTREMIS()) + "; F
                    // CFA;0"); bonne version. a decommenter en cas de probleme
                    datas.add("Monnaie: ;     "
                            + conversion.AmountFormat((OTCashTransaction.getIntAMOUNTRECU() - vente_net >= 0
                                    ? OTCashTransaction.getIntAMOUNTRECU() - vente_net : 0))
                            + "; F CFA;0");
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<String> generateDataTiersPayant(TPreenregistrement OTPreenregistrement,
            List<TPreenregistrementCompteClientTiersPayent> lstT) {
        List<String> datas = new ArrayList<>();

        datas.add("Matricule Assuré:: " + lstT.get(0).getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID()
                .getLgCLIENTID().getStrNUMEROSECURITESOCIAL());
        datas.add("Bénéficiaire:: " + OTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " "
                + OTPreenregistrement.getStrLASTNAMECUSTOMER());

        if (OTPreenregistrement.getIntCUSTPART() < 0) {
            datas.add("Part du Client:: "
                    + conversion.AmountFormat(
                            (-1) * Maths.arrondiModuloOfNumber(Math.abs(OTPreenregistrement.getIntCUSTPART()), 5))
                    + "  CFA");
        } else {

            datas.add("Part du Client:: "
                    + conversion.AmountFormat(Maths.arrondiModuloOfNumber(OTPreenregistrement.getIntCUSTPART(), 5))
                    + "  CFA");
        }
        for (int i = 0; i < lstT.size(); i++) {
            if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_AVEC_CARNET)) {
                datas.add(
                        lstT.get(i).getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME() + "   "
                                + lstT.get(i).getIntPERCENT() + "%" + " :: "
                                + conversion.AmountFormat(
                                        OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE())
                                + "  CFA");
            } else {
                datas.add(lstT.get(i).getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME() + "   "
                        + lstT.get(i).getIntPERCENT() + "%" + " :: "
                        + conversion.AmountFormat(lstT.get(i).getIntPRICE()) + "  CFA");
            }

        }
        return datas;
    }

    public List<String> generateDataTiersPayant(TPreenregistrement OTPreenregistrement) {
        List<String> datas = new ArrayList<>();
        TClient client = OTPreenregistrement.getClient();
        if (client != null) {
            datas.add("Nom du Client:: " + client.getStrFIRSTNAME() + " " + client.getStrLASTNAME());
            return datas;
        }
        datas.add("Nom du Client:: " + OTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " "
                + OTPreenregistrement.getStrLASTNAMECUSTOMER());

        return datas;
    }

    public List<String> generateDataSeller(TPreenregistrement OTPreenregistrement) {
        List<String> datas = new ArrayList<>();
        /*
         * datas.add("Caissier:: " + OTPreenregistrement.getLgUSERCAISSIERID().getStrFIRSTNAME() + " " +
         * OTPreenregistrement.getLgUSERCAISSIERID().getStrLASTNAME()); datas.add("Vendeur:: " +
         * OTPreenregistrement.getLgUSERVENDEURID().getStrFIRSTNAME() + " " +
         * OTPreenregistrement.getLgUSERVENDEURID().getStrLASTNAME());
         */
        try {
            datas.add("Caissier(e):: "
                    + DataStringManager.subStringData(OTPreenregistrement.getLgUSERCAISSIERID().getStrFIRSTNAME(), 0, 1)
                    + "." + OTPreenregistrement.getLgUSERCAISSIERID().getStrLASTNAME() + "   |   " + "Vendeur:: "
                    + DataStringManager.subStringData(OTPreenregistrement.getLgUSERVENDEURID().getStrFIRSTNAME(), 0, 1)
                    + "." + OTPreenregistrement.getLgUSERVENDEURID().getStrLASTNAME());
            if (OTPreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID()
                    .equalsIgnoreCase(Parameter.KEY_NATURE_VENTE_DEPOT)) {
                TEmplacement OTEmplacement = new EmplacementManagement(this.getOdataManager())
                        .getEmplacementByOwner(OTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " "
                                + OTPreenregistrement.getStrLASTNAMECUSTOMER());
                datas.add(OTEmplacement != null ? "DEPOT: " + OTEmplacement.getStrDESCRIPTION() : " ");
                datas.add("Client(e):: " + (OTEmplacement != null
                        ? OTEmplacement.getStrFIRSTNAME() + " " + OTEmplacement.getStrLASTNAME()
                        : OTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " "
                                + OTPreenregistrement.getStrLASTNAMECUSTOMER()));

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }
    // fin chargement des données d'une vente

    public List<TPreenregistrementCompteClientTiersPayent> getListeTPreenregistrementCompteClientTiersPayent(
            String lg_PREENGISTREMENT_ID) {
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<>();
        try {
            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?1 ORDER BY t.lgCOMPTECLIENTTIERSPAYANTID.intPRIORITY ASC")
                    .setParameter(1, lg_PREENGISTREMENT_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstT;
    }

    public List<TPreenregistrementCompteClientTiersPayent> getListeTPreenregistrementCompteClientTiersPayent(
            String lg_PREENGISTREMENT_ID, String str_STATUT) {
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<>();
        try {
            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.strSTATUT = ?2 ORDER BY t.intPERCENT DESC")
                    .setParameter(1, lg_PREENGISTREMENT_ID).setParameter(2, str_STATUT).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstT;
    }

    // liste des articles vendus
    public int getListeArticleVendu(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String lg_USER_ID, String criteria, String str_TYPE_TRANSACTION, int int_NUMBER,
            String lg_FAMILLE_ID) {
        List<EntityData> Lst = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_TYPE_STOCK_ID = "", lg_EMPLACEMENT_ID = "";
        // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        int count = 0;
        try {
            lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.TYPE_STOCK_RAYON) ? commonparameter.TYPE_STOCK_RAYON
                            : commonparameter.TYPE_STOCK_DEPOT);
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            // if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
            // lg_EMPLACEMENT_ID = "%%";
            // } else {
            // lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            // }
            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String dateCriteria = "AND v.dt_UPDATED >= '" + OdateDebut + " " + h_debut + "' AND v.dt_UPDATED <= '"
                    + OdateFin + " " + h_fin + "' ";
            String qry = "SELECT COUNT(*) AS NB FROM v_article_vendu v WHERE v.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                    + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' AND (DATE(v.dt_UPDATED)>= '" + OdateDebut
                    + "' AND DATE(v.dt_UPDATED)<= '" + OdateFin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut
                    + "' and TIME(v.dt_UPDATED) <= '" + h_fin + "') AND (v.int_CIP LIKE '" + search_value
                    + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '" + search_value
                    + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '" + search_value
                    + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' " + criteria + " ";

            if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                qry = "SELECT COUNT(*) AS NB FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "'" + dateCriteria
                        + " AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER < "
                        + int_NUMBER;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                qry = "SELECT COUNT(*) AS NB FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "'" + dateCriteria
                        + " AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER = "
                        + int_NUMBER;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                qry = "SELECT COUNT(*) AS NB FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "'" + dateCriteria
                        + "  AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER > "
                        + int_NUMBER;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                qry = "SELECT COUNT(*) AS NB FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "  AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER <= "
                        + int_NUMBER;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                qry = "SELECT COUNT(*) AS NB FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + " AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER >= "
                        + int_NUMBER;
            }

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                count = Ojconnexion.get_resultat().getInt("NB");
                System.out.println("count  " + count);

            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + count);
        return count;
    }

    public List<EntityData> getListeArticleVendu__(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String lg_USER_ID, String criteria, String str_TYPE_TRANSACTION,
            int int_NUMBER, int start, int limit, String lg_FAMILLE_ID) {
        List<EntityData> Lst = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_TYPE_STOCK_ID = "", lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.TYPE_STOCK_RAYON) ? commonparameter.TYPE_STOCK_RAYON
                            : commonparameter.TYPE_STOCK_DEPOT);
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (criteria.equals("")) {
                criteria = "order by v.dt_UPDATED ASC";
                // criteria = "order by v.str_DESCRIPTION ASC";

            }
            String dateCriteria = "AND v.dt_UPDATED >= '" + OdateDebut + " " + h_debut + "' AND v.dt_UPDATED <= '"
                    + OdateFin + " " + h_fin + "' ";

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "SELECT * FROM v_article_vendu v WHERE v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'" + dateCriteria + "    AND (v.int_CIP LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '"
                    + search_value + "%' OR v.str_DESCRIPTION LIKE '" + search_value + "%' OR v.str_REF LIKE '"
                    + search_value + "%' OR v.str_REF_TICKET LIKE '" + search_value + "%') AND v.lg_USER_ID LIKE '"
                    + lg_USER_ID + "%' " + criteria + " LIMIT " + start + "," + limit;

            if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "'  AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "   AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER < "
                        + int_NUMBER + " " + criteria + " LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "'  AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "   AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER = "
                        + int_NUMBER + " " + criteria + " LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "'  AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "   AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER > "
                        + int_NUMBER + " " + criteria + " LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "' AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "   AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER <= "
                        + int_NUMBER + " " + criteria + " LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "'  AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "   AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER >= "
                        + int_NUMBER + " " + criteria + " LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.SEUIL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                        + "'  AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' " + dateCriteria
                        + "   AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID
                        + "%' AND v.int_NUMBER w= v.int_SEUIL_MIN " + criteria + " LIMIT " + start + "," + limit;
            }
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_QUANTITY"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("int_NUMBER"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("lg_GROSSISTE_ID"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("str_LIBELLE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("int_AVOIR"));

                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + Lst.size());
        return Lst;
    }

    public List<EntityData> getListeArticleVenduForOrder(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String lg_USER_ID, String criteria, String str_TYPE_TRANSACTION,
            int int_NUMBER) {
        List<EntityData> Lst = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_TYPE_STOCK_ID = "";

        try {
            lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.TYPE_STOCK_RAYON) ? commonparameter.TYPE_STOCK_RAYON
                            : commonparameter.TYPE_STOCK_DEPOT);
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (criteria.equalsIgnoreCase("")) {
                criteria = "order by v.dt_UPDATED ASC";
            }

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "SELECT * FROM v_article_vendu v WHERE v.bool_DECONDITIONNE = 0 AND v.lg_EMPLACEMENT_ID LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND v.lg_TYPE_STOCK_ID = '"
                    + lg_TYPE_STOCK_ID + "' AND (v.dt_UPDATED > '" + OdateDebut + "' AND v.dt_UPDATED <= '" + OdateFin
                    + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' and TIME(v.dt_UPDATED) <= '" + h_fin
                    + "') AND (v.int_CIP LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '" + search_value
                    + "%' OR v.str_DESCRIPTION LIKE '" + search_value + "%' OR v.str_REF LIKE '" + search_value
                    + "%' OR v.str_REF_TICKET LIKE '" + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID
                    + "%' " + criteria + " ";

            if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.bool_DECONDITIONNE = 0 AND v.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' AND (v.dt_UPDATED > '" + OdateDebut + "' AND v.dt_UPDATED <= '"
                        + OdateFin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' and TIME(v.dt_UPDATED) <= '"
                        + h_fin + "')  AND v.lg_EMPLACEMENT_ID LIKE '"
                        + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER < "
                        + int_NUMBER + " " + criteria;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.bool_DECONDITIONNE = 0 AND v.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' AND (v.dt_UPDATED > '" + OdateDebut + "' AND v.dt_UPDATED <= '"
                        + OdateFin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' and TIME(v.dt_UPDATED) <= '"
                        + h_fin + "')  AND v.lg_EMPLACEMENT_ID = '"
                        + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER = "
                        + int_NUMBER + " " + criteria;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.bool_DECONDITIONNE = 0 AND v.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' AND (v.dt_UPDATED > '" + OdateDebut + "' AND v.dt_UPDATED <= '"
                        + OdateFin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' and TIME(v.dt_UPDATED) <= '"
                        + h_fin + "')  AND v.lg_EMPLACEMENT_ID = '"
                        + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER > "
                        + int_NUMBER + " " + criteria;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.bool_DECONDITIONNE = 0 AND v.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' AND (v.dt_UPDATED > '" + OdateDebut + "' AND v.dt_UPDATED <= '"
                        + OdateFin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' and TIME(v.dt_UPDATED) <= '"
                        + h_fin + "')  AND v.lg_EMPLACEMENT_ID = '"
                        + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER <= "
                        + int_NUMBER + " " + criteria;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                qry = "SELECT * FROM v_article_vendu v WHERE v.bool_DECONDITIONNE = 0 AND v.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' AND (v.dt_UPDATED > '" + OdateDebut + "' AND v.dt_UPDATED <= '"
                        + OdateFin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' and TIME(v.dt_UPDATED) <= '"
                        + h_fin + "')  AND v.lg_EMPLACEMENT_ID = '"
                        + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.int_EAN13 LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '"
                        + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '"
                        + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "%' AND v.int_NUMBER >= "
                        + int_NUMBER + " " + criteria;
            }

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_QUANTITY"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("int_NUMBER"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("lg_GROSSISTE_ID"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("str_LIBELLE"));
                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + Lst.size());
        return Lst;
    }

    // fin liste des articles vendus
    public double getTotalMontantTvaByVente(String lg_PREENREGISTREMENT_ID) {

        double result = 0.0;

        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "SELECT SUM(pd.int_PRICE) AS TOTAL_HT, ct.lg_CODE_TVA_ID, ct.int_VALUE, SUM((pd.int_PRICE + ((pd.int_PRICE * ct.int_VALUE)/100)))  AS TOTAL_TTC FROM t_famille t, t_preenregistrement_detail pd, t_code_tva ct WHERE t.lg_FAMILLE_ID = pd.lg_FAMILLE_ID AND ct.lg_CODE_TVA_ID = t.lg_CODE_TVA_ID AND pd.lg_PREENREGISTREMENT_ID = '"
                    + lg_PREENREGISTREMENT_ID + "' GROUP BY ct.lg_CODE_TVA_ID ORDER BY ct.int_VALUE ASC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                result += Ojconnexion.get_resultat().getDouble("TOTAL_TTC");

            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("result " + result);

        return result;
    }

    public long getMontantTvaByVente(String lg_PREENREGISTREMENT_ID) {
        long montanttva = 0l;
        String query = "SELECT (SUM(pd.`int_PRICE`)-SUM(CASE WHEN ct.`int_VALUE` >0 THEN ((pd.int_PRICE /(1+( ct.int_VALUE)/100))) ELSE pd.int_PRICE  END)) AS TOTAL_HT "
                + "FROM t_famille t, t_preenregistrement_detail pd, t_code_tva ct "
                + "WHERE t.lg_FAMILLE_ID = pd.lg_FAMILLE_ID AND ct.lg_CODE_TVA_ID = t.lg_CODE_TVA_ID "
                + "AND pd.lg_PREENREGISTREMENT_ID ='" + lg_PREENREGISTREMENT_ID + "'";
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

    public List<TPreenregistrement> getListeTPreenregistrement(String search_value, String lg_PREENREGISTREMENT_ID,
            String str_STATUT, String lg_USER_ID, Date dt_Date_Debut, Date dt_Date_Fin, String str_TYPE_VENTE) {
        List<TPreenregistrement> lst = new ArrayList<TPreenregistrement>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            // lst = this.getOdataManager().getEm().createQuery("SELECT t FROM TPreenregistrement t WHERE
            // t.lgPREENREGISTREMENTID LIKE ?1 AND t.strREF LIKE ?2 AND t.strSTATUT LIKE ?3 AND t.lgUSERID.lgUSERID LIKE
            // ?4 AND t.dtCREATED > ?5 AND t.dtCREATED <= ?6 AND t.strTYPEVENTE LIKE ?7 AND
            // t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.dtCREATED ASC") // ancienne bonne version.
            // a decommenter en cas de probleme
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t, TPreenregistrementDetail tp WHERE t.lgNATUREVENTEID.lgNATUREVENTEID NOT LIKE ?9 AND t.lgPREENREGISTREMENTID = tp.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID AND t.lgPREENREGISTREMENTID LIKE ?1 AND (t.strREF LIKE ?2 OR tp.lgFAMILLEID.strDESCRIPTION LIKE ?2 OR tp.lgFAMILLEID.intCIP LIKE ?2 OR tp.lgFAMILLEID.intEAN13 LIKE ?2) AND t.strSTATUT LIKE ?3 AND t.lgUSERID.lgUSERID LIKE ?4 AND t.dtUPDATED > ?5 AND t.dtUPDATED <= ?6 AND t.strTYPEVENTE LIKE ?7 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY tp.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID ORDER BY t.dtUPDATED ASC")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, str_STATUT).setParameter(4, lg_USER_ID).setParameter(5, dt_Date_Debut)
                    .setParameter(6, dt_Date_Fin).setParameter(7, str_TYPE_VENTE).setParameter(8, lg_EMPLACEMENT_ID)
                    .setParameter(9, Parameter.KEY_NATURE_VENTE_DEPOT).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;

    }

    // verification du prix pour la vente afin d'envoyer un sms
    public void checkpriceForSendSMS(TFamille OTFamille, int int_PRICE_OLD, int int_PRICE, String str_REF) {
        TParameters OParameters = null;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        int int_TAUX = 0;
        try {
            OParameters = OTparameterManager.getParameter(Parameter.KEY_MAX_PRICE_POURCENT_VENTE_SEND_SMS);
            if (OParameters != null) {
                int_TAUX = (Integer.parseInt(OParameters.getStrVALUE()) * int_PRICE_OLD) / 100;
            }
            if (int_PRICE_OLD != int_PRICE) {
                String Description = "Modification de prix de " + OTFamille.getStrDESCRIPTION()
                        + " à la vente par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".Prix de vente: " + int_PRICE_OLD + " remplacé par "
                        + int_PRICE + ".";

                if (new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPrice(OTFamille,
                        commonparameter.str_ACTION_VENTE, int_PRICE, int_PRICE_OLD, str_REF) != null) {
                    new logger().OCategory.info("abs:" + Math.abs(int_PRICE_OLD - int_PRICE) + "|taux:" + int_TAUX);
                    if (Math.abs(int_PRICE_OLD - int_PRICE) <= int_TAUX) {
                        new familleManagement(this.getOdataManager(), this.getOTUser()).sendSMS(Description, "Vente",
                                "N_UPDATE_FAMILLE_PRICE");
                    }
                }
                // new familleManagement(this.getOdataManager(), this.getOTUser()).sendSMS(OTFamille, int_PRICE_OLD,
                // int_PRICE);
                this.do_event_log(commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                        commonparameter.statut_enable, "TFamille", "Donnee de ref", "Modification de prix de produit",
                        this.getOTUser().getLgUSERID());
            }
        } catch (Exception e) {
        }

    }
    // fin verification du prix pour la vente afin d'envoyer un sms

    public List<TPreenregistrement> listVenteAnnules(String search_value, Date dtDEBUT, Date dtFin, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String str_STATUT) {

        List<TPreenregistrement> lstTPreenregistrement = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            lstTPreenregistrement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t, TPreenregistrementDetail tp WHERE tp.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = t.lgPREENREGISTREMENTID AND (t.strREF LIKE ?1 OR t.strREFTICKET LIKE ?1 OR tp.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR tp.lgFAMILLEID.intCIP LIKE ?1 OR tp.lgFAMILLEID.intEAN13 LIKE ?1) AND (t.dtANNULER BETWEEN ?3 AND ?4) AND t.lgPREENREGISTREMENTID LIKE ?2 AND t.lgUSERID.lgUSERID LIKE ?5 AND t.strSTATUT LIKE ?7 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.bISCANCEL =?9 GROUP BY tp.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID ORDER BY t.dtCREATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(7, str_STATUT).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, true)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrement taille " + lstTPreenregistrement.size());
        return lstTPreenregistrement;
    }

    public Double getTotalAmountVente(List<TPreenregistrement> lstPreenregistrements) {
        Double result = 0.0;
        try {
            for (TPreenregistrement OTPreenregistrement : lstPreenregistrements) {
                result += OTPreenregistrement.getIntPRICE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    // appel de la fonction d'impression lors d'une vente
    public void lunchPrinterForTicket(TPreenregistrement oTPreenregistrement, String fileBarecode) {

        try {

            jdom.InitRessource();
            jdom.LoadRessource();
            // impression ticket de caisse
            this.lunchPrinterForTicketCaisse(oTPreenregistrement, fileBarecode);
            Thread.sleep(5000);
            new logger().OCategory.info("Fin de l'impression du ticket");
            // fin impression ticket de caisse

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'impression du ticket");
        }
        new logger().OCategory.info(this.getDetailmessage());
    }

    // impression ticket de caisse
    public void lunchPrinterForTicketCaisse(TPreenregistrement oTPreenregistrement, String fileBarecode) {
        DriverPrinter ODriverPrinter = new DriverPrinter(this.getOdataManager(), this.getOTUser());
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<>();
        String title = "";
        List<String> lstData, lstDataFinal = new ArrayList<>();
        int counter = 40, k = 0, page = 1, pageCurrent = 0, diff = 0, counter_constante = 40;
        try {

            // TUserImprimante OTUserImprimante = OPrinterManager.getTUserImprimante(this.getOTUser().getLgUSERID(),
            // lg_IMPRIMANTE_ID, commonparameter.str_ACTION_VENTE);
            TParameters OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_SHOW_NUMERO_TICKET);
            if (OTParameters != null) {
                if (Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                    title = oTPreenregistrement.getStrREF();
                } else {
                    title = oTPreenregistrement.getStrREFTICKET();
                }
            }
            // if (OTUserImprimante != null) {
            lstData = this.generateData(oTPreenregistrement);

            ODriverPrinter.setDatasInfoSeller(this.generateDataSeller(oTPreenregistrement));
            ODriverPrinter.setType_ticket(commonparameter.str_ACTION_VENTE);
            ODriverPrinter.setDatasInfoTiersPayant(new ArrayList<>());
            if (oTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("3")
                    || oTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("2")) {
                // lstT =
                // this.getListeTPreenregistrementCompteClientTiersPayent(oTPreenregistrement.getLgPREENREGISTREMENTID());//oTPreenregistrement.getStrSTATUT()
                lstT = this.getListeTPreenregistrementCompteClientTiersPayent(
                        oTPreenregistrement.getLgPREENREGISTREMENTID());
                ODriverPrinter.setDatasInfoTiersPayant(this.generateDataTiersPayant(oTPreenregistrement, lstT));
                title = title + " | Bon N°:: " + oTPreenregistrement.getStrREFBON();
            } else if (oTPreenregistrement.getStrSTATUTVENTE().equalsIgnoreCase(commonparameter.statut_differe)
                    || oTPreenregistrement.getBISAVOIR() == true) {
                ODriverPrinter.setDatasInfoTiersPayant(this.generateDataTiersPayant(oTPreenregistrement));
            }
            ODriverPrinter.setTitle("Ticket N° " + title);

            if (lstData.size() <= counter) {
                ODriverPrinter.setDatas(lstData);
                ODriverPrinter.setDatasSubTotal(this.generateDataSummary(oTPreenregistrement));
                ODriverPrinter.setDataCommentaires(this.generateCommentaire(oTPreenregistrement));
                ODriverPrinter.setDateOperation(oTPreenregistrement.getDtUPDATED());
                ODriverPrinter.setCodeShow(true);
                ODriverPrinter.setName_code_bare(fileBarecode);
                if (lstT.isEmpty()) {
                    ODriverPrinter.PrintTicketVente(1);
                } else if (oTPreenregistrement.getIntPRICE() < 0) {
                    ODriverPrinter.PrintTicketVente(1);
                } else {
                    for (int i = 0; i <= lstT.size(); i++) {
                        ODriverPrinter.PrintTicketVente(1);
                    }
                }
            } else {
                page = lstData.size() / counter;

                while (page != pageCurrent) {
                    ODriverPrinter.setDatasSubTotal(new ArrayList<>());
                    ODriverPrinter.setDataCommentaires(new ArrayList<>());
                    ODriverPrinter.setDateOperation(oTPreenregistrement.getDtUPDATED());
                    ODriverPrinter.setCodeShow(true);
                    ODriverPrinter.setName_code_bare(fileBarecode);
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(lstData.get(i));
                    }
                    ODriverPrinter.setDatas(lstDataFinal);
                    if (lstT.isEmpty()) {
                        ODriverPrinter.PrintTicketVente(1);
                    } else if (oTPreenregistrement.getIntPRICE() < 0) {
                        ODriverPrinter.PrintTicketVente(1);
                    } else {
                        for (int i = 0; i <= lstT.size(); i++) {
                            ODriverPrinter.PrintTicketVente(1);
                        }
                    }
                    k = counter;
                    diff = lstData.size() - counter;
                    if (diff > counter_constante) {
                        counter = counter + counter_constante;
                    } else {
                        counter = counter + diff;
                    }
                    // new logger().OCategory.info("k:" + k + "|counter:" + counter + "|diff:" + diff + "pageCurrent:" +
                    // pageCurrent);
                    pageCurrent++;
                    lstDataFinal.clear();
                    // new logger().OCategory.info("pageCurrent dans le while:" + pageCurrent);
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(lstData.get(i));
                    }
                    // new logger().OCategory.info("pageCurrent a la fin:" + pageCurrent);
                    ODriverPrinter.setDatas(lstDataFinal);
                    ODriverPrinter.setDatasSubTotal(this.generateDataSummary(oTPreenregistrement));
                    ODriverPrinter.setDataCommentaires(this.generateCommentaire(oTPreenregistrement));
                    ODriverPrinter.setDateOperation(oTPreenregistrement.getDtUPDATED());
                    ODriverPrinter.setCodeShow(true);
                    ODriverPrinter.setName_code_bare(fileBarecode);
                }

                if (lstT.isEmpty()) {
                    ODriverPrinter.PrintTicketVente(1);
                } else if (oTPreenregistrement.getIntPRICE() < 0) {
                    ODriverPrinter.PrintTicketVente(1);
                } else {
                    for (int i = 0; i <= lstT.size(); i++) {
                        ODriverPrinter.PrintTicketVente(1);
                    }
                }
            }

            this.setMessage(ODriverPrinter.getMessage());
            this.setDetailmessage(ODriverPrinter.getDetailmessage());

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'impression du ticket");
        }
    }
    // fin impression ticket de caisse

    // recuperation de la quantité d'un article dans une vente donnée
    public int getQauntityFamilleInVente(String lg_PREENREGISTREMENT_ID, String lg_FAMILLE_ID) {
        int result = 0;
        TPreenregistrementDetail OTPreenregistrementDetail = null;
        try {
            OTPreenregistrementDetail = (TPreenregistrementDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, lg_FAMILLE_ID).getSingleResult();
            if (OTPreenregistrementDetail != null) {
                result = OTPreenregistrementDetail.getIntQUANTITY();
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }
        new logger().OCategory.info("result dans getQauntityFamilleInVente " + result);
        return result;
    }

    // fin recuperation de la quantité d'un article dans une vente donnée
    // fin appel de la fonction d'impression lors d'une vente
    // Recupération d'un preenregistrement tiers payant compte client lié à une vente et un preengistrement
    // compteclient_tierspaynt
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
    // fin Recupération d'un preenregistrement tiers payant compte client lié à une vente et un preengistrement
    // compteclient_tierspaynt

    // recuperation montant total de la part des tiers payant à une vente
    public double getTotalPartTierPayantByVente(String lg_PREENREGISTREMENT_ID) {
        List<TPreenregistrementCompteClientTiersPayent> lst = new ArrayList<>();
        double result = 0.0;
        try {
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .getResultList();
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lst) {
                result += OTPreenregistrementCompteClientTiersPayent.getIntPRICE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    // fin recuperation montant total de la part des tiers payant à une vente
    // derniere bonne liste de vente
    public List<EntityData> listTPreenregistrement(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE) {
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "";
        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());

        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                    + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                    + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '"
                    + search_value + "%' OR f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENGISTREMENT_ID
                    + "' AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut + "' and DATE(t.dt_UPDATED) <= '" + dt_Date_Fin
                    + "')  AND (TIME(t.dt_UPDATED) >= '" + h_debut + "' and TIME(t.dt_UPDATED) <= '" + h_fin
                    + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                new logger().OCategory
                        .info("Date " + this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("dt_DATE_BRUT"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("h_HEURE_BRUT"));
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("lg_TYPE_VENTE_ID"));
                lstTPreenregistrement.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    public List<EntityData> listTPreenregistrement(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE, int start,
            int limit) {
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "";
        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = null;
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                    + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                    + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '"
                    + search_value + "%' OR f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENGISTREMENT_ID
                    + "' AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut + "' and DATE(t.dt_UPDATED) <= '" + dt_Date_Fin
                    + "')  AND (TIME(t.dt_UPDATED) >= '" + h_debut + "' and TIME(t.dt_UPDATED) <= '" + h_fin
                    + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC LIMIT " + start + "," + limit;
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                new logger().OCategory
                        .info("Date " + this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
                // OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE")); // a decommenter en cas
                // de probleme. 15/08/2016
                OEntityData.setStr_value5(OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && Ojconnexion.get_resultat().getString("int_PRICE_OTHER") != null
                                ? Ojconnexion.get_resultat().getString("int_PRICE_OTHER")
                                : Ojconnexion.get_resultat().getString("int_PRICE")); // code ajouté 15/08/2016
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("dt_DATE_BRUT"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("h_HEURE_BRUT"));
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("lg_TYPE_VENTE_ID"));
                OEntityData.setStr_value19(Ojconnexion.get_resultat().getString("b_IS_AVOIR"));
                lstTPreenregistrement.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }
    // derniere bonne liste de vente

    // mise a jour de la remise ou des tiers payants
    public TPreenregistrement updateVenteByTierpayantAndRemise(String lg_PREENREGISTREMENT_ID,
            ArrayList<TCompteClientTiersPayant> LstTCompteClientTiersPayant, String lg_REMISE_ID, String mode_change,
            String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {
        TPreenregistrement OTPreenregistrement = null;
        TRemise OTRemise = null;
        TGrilleRemise OTGrilleRemise = null;
        String str_type = "";
        int int_vente_amount = 0;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
        try {
            OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {
                str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
            }

            int_vente_amount = this.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID());

            OTRemise = this.GetRemiseToApply(lg_REMISE_ID);
            lstTPreenregistrementDetail = this.getTPreenregistrementDetail(lg_PREENREGISTREMENT_ID);
            if (OTRemise != null) {
                OTPreenregistrement.setLgREMISEID(OTRemise.getLgREMISEID());

                this.persiste(OTPreenregistrement);
                int int_remise_temp = 0;
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                    if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID()
                            .equalsIgnoreCase(Parameter.TYPE_REMISE_CLIENT)) {
                        int_remise_temp = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTRemise.getDblTAUX())
                                / 100);
                    } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID()
                            .equalsIgnoreCase(Parameter.TYPE_REMISE_PRODUCT)) {
                        OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(OTPreenregistrement,
                                OTPreenregistrementDetail.getLgFAMILLEID());
                        if (OTGrilleRemise != null) {
                            if (this.CheckifRemiseisAllowed(OTGrilleRemise.getLgREMISEID())) {
                                int_remise_temp = this.GetAmountRemiseByDetails(
                                        OTPreenregistrementDetail.getLgPREENREGISTREMENTDETAILID(),
                                        OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID());
                                OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                            }
                        }
                    }
                    OTPreenregistrementDetail.setIntPRICEREMISE(int_remise_temp);
                    this.persiste(OTPreenregistrementDetail);
                }

            }
            if (str_type.equals(bll.common.Parameter.KEY_VENTE_ORDONNANCE)) {
                if (mode_change.equalsIgnoreCase(commonparameter.statut_delete)) {
                    this.removeTiersPayantFromVente(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                            lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
                } else if (!LstTCompteClientTiersPayant.isEmpty()) {
                    this.WorkflowPreenregistrement(LstTCompteClientTiersPayant, OTPreenregistrement, int_vente_amount);
                }

            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour");
        }
        return OTPreenregistrement;
    }

    // fin mise a jour de la remise ou des tiers payants
    // suppression d'un d'un tiers payant sur lors d'une vente
    public boolean removeTiersPayantFromVente(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {
        boolean result = false;
        try {
            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = (TPreenregistrementCompteClientTiersPayent) this
                    .getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID = ?1 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?2")
                    .setParameter(1, lg_COMPTE_CLIENT_TIERS_PAYANT_ID).setParameter(2, lg_PREENREGISTREMENT_ID)
                    .getSingleResult();
            if (OTPreenregistrementCompteClientTiersPayent != null) {
                if (this.delete(OTPreenregistrementCompteClientTiersPayent)) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    this.buildErrorTraceMessage("Echec de suppression du tiers payant sélectionné");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du tiers payant sélectionné");
        }
        return result;
    }
    // fin suppression d'un d'un tiers payant sur lors d'une vente

    // mise a jour d'un ayant droit a la vente
    public boolean updateayantdroit(String lg_PREENREGISTREMENT_ID, String lg_AYANTS_DROITS_ID) {
        boolean result = false;

        try {
            TPreenregistrement OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
            TAyantDroit OTAyantDroit = this.getOdataManager().getEm().find(TAyantDroit.class, lg_AYANTS_DROITS_ID);
            if (OTAyantDroit != null && OTPreenregistrement != null) {
                OTPreenregistrement.setStrFIRSTNAMECUSTOMER(OTAyantDroit.getStrFIRSTNAME());
                OTPreenregistrement.setStrLASTNAMECUSTOMER(OTAyantDroit.getStrLASTNAME());
                this.persiste(OTPreenregistrement);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de l'opération");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    // fin mise a jour d'un ayant droit a la vente
    // fin mise a jour d'un ayant droit a la vente
    public List<String> generateCommentaire(TPreenregistrement OTPreenregistrement) {
        List<String> datas = new ArrayList<String>();
        TOfficine officine = null;

        try {
            officine = (TOfficine) this.getOdataManager().getEm().find(TOfficine.class, "1");

            // code ajouté
            if (OTPreenregistrement.getBISAVOIR()) {
                List<TPreenregistrementDetail> lstPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
                lstPreenregistrementDetail = this.getListeProduitAvoirByVente(
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                int int_AMOUNT_ACCOMPTE = 0;
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstPreenregistrementDetail) {
                    int_AMOUNT_ACCOMPTE += OTPreenregistrementDetail.getIntAVOIR()
                            * OTPreenregistrementDetail.getIntPRICEUNITAIR();
                }
                datas.add(" ;0");
                datas.add("ACOMPTE: " + conversion.AmountFormat(int_AMOUNT_ACCOMPTE, ' ') + " F CFA;1");
                datas.add(" ;0");
            }

            if (OTPreenregistrement.getStrSTATUTVENTE().equalsIgnoreCase(commonparameter.statut_differe)
                    && OTPreenregistrement.getIntPRICE() > 0) {
                TPreenregistrementCompteClient OPreenregistrementCompteClient = this
                        .getTPreenregistrementCompteClient(OTPreenregistrement.getLgPREENREGISTREMENTID());
                datas.add(" ;0");
                datas.add("MONTANT RESTANT: "
                        + conversion.AmountFormat(OPreenregistrementCompteClient.getIntPRICERESTE(), ' ') + " F CFA;1");
                datas.add(" ;0");
            }
            // fin code ajouté

            if (!officine.getStrCOMMENTAIRE1().equals("") && officine.getStrCOMMENTAIRE1() != null) {
                datas.add(officine.getStrCOMMENTAIRE1() + ";0");
            }
            if (!officine.getStrCOMMENTAIRE2().equals("") && officine.getStrCOMMENTAIRE2() != null) {
                datas.add(officine.getStrCOMMENTAIRE2() + ";0");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return datas;
    }

    // fin chargement des données d'une vente
    // numbre de facture dun tiers payant sur une periode
    public int getInvoiceNumberForCustomer(String search_value, Date dtDEBUT, Date dtFin, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        Set<TFacture> listFactures = new HashSet<>();
        List<TFactureDetail> lstTFactureDetail = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            lstTFactureDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFacture o, TPreenregistrementCompteClientTiersPayent t WHERE (t.lgPREENREGISTREMENTID.dtCREATED BETWEEN ?3 AND ?4) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND (t.strSTATUTFACTURE LIKE ?7 OR t.strSTATUTFACTURE LIKE ?9) AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11 AND t.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=o.strREF AND o.strSTATUT <>?12 ORDER BY t.dtCREATED DESC")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(5, lg_USER_ID).setParameter(7, commonparameter.statut_unpaid)
                    .setParameter(9, commonparameter.CHARGED).setParameter(8, lg_EMPLACEMENT_ID)
                    .setParameter(10, lg_COMPTE_CLIENT_ID).setParameter(11, lg_TIERS_PAYANT_ID)
                    .setParameter(12, commonparameter.statut_paid).getResultList();
            for (TFactureDetail OFactureDetail : lstTFactureDetail) {
                this.refresh(OFactureDetail);
                listFactures.add(OFactureDetail.getLgFACTUREID());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return listFactures.size();
    }

    public int getTransactionVenteByCpteCltTiers(String search_value, Date dtDEBUT, Date dtFin, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {

        Set<TPreenregistrement> listTPreenregistrement = new HashSet<>();
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM  TPreenregistrementCompteClientTiersPayent t,TFactureDetail o WHERE (t.lgPREENREGISTREMENTID.dtCREATED BETWEEN ?3 AND ?4) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND (t.strSTATUTFACTURE LIKE ?7 OR t.strSTATUTFACTURE LIKE ?9) AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11 AND t.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=o.strREF AND o.strSTATUT <>?12 ORDER BY t.dtCREATED DESC")
                    .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDEBUT).setParameter(4, dtFin)
                    .setParameter(5, lg_USER_ID).setParameter(7, commonparameter.statut_unpaid)
                    .setParameter(9, commonparameter.CHARGED).setParameter(8, lg_EMPLACEMENT_ID)
                    .setParameter(10, lg_COMPTE_CLIENT_ID).setParameter(11, lg_TIERS_PAYANT_ID)
                    .setParameter(12, commonparameter.statut_paid).getResultList();
            for (TPreenregistrementCompteClientTiersPayent OClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                this.refresh(OClientTiersPayent);
                listTPreenregistrement.add(OClientTiersPayent.getLgPREENREGISTREMENTID());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return listTPreenregistrement.size();
    }

    // recuperation du type de vente
    public TTypeVente getTypeVente(String search_value) {
        TTypeVente OTTypeVente = null;
        try {
            OTTypeVente = (TTypeVente) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeVente t WHERE (t.lgTYPEVENTEID = ?1 OR t.strNAME = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypeVente;
    }
    // fin recuperation du type de vente

    public TPreenregistrementCompteClient getTPreenregistrementCompteClient(String lg_PREENREGISTREMENT_ID,
            String lg_COMPTE_CLIENT_ID) {
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        try {
            OTPreenregistrementCompteClient = (TPreenregistrementCompteClient) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TPreenregistrementCompteClient t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 AND t.lgCOMPTECLIENTID.lgCOMPTECLIENTID = ?2")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, lg_COMPTE_CLIENT_ID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTPreenregistrementCompteClient;
    }

    public boolean createPreenregistrementCompteClient(TPreenregistrement OTPreenregistrement,
            TCompteClient OTCompteClient, int int_PRICE) {
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        boolean result = false;
        try {
            OTPreenregistrementCompteClient = this.getTPreenregistrementCompteClient(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTCompteClient.getLgCOMPTECLIENTID());
            if (OTPreenregistrementCompteClient == null) {
                OTPreenregistrementCompteClient = new TPreenregistrementCompteClient();
                OTPreenregistrementCompteClient.setLgPREENREGISTREMENTCOMPTECLIENTID(this.getKey().getComplexId());
            }
            OTPreenregistrementCompteClient.setLgCOMPTECLIENTID(OTCompteClient);
            OTPreenregistrementCompteClient.setLgPREENREGISTREMENTID(OTPreenregistrement);
            OTPreenregistrementCompteClient.setLgUSERID(this.getOTUser());
            OTPreenregistrementCompteClient.setIntPRICE(int_PRICE);
            OTPreenregistrementCompteClient.setStrSTATUT(commonparameter.statut_enable);
            OTPreenregistrementCompteClient.setDtCREATED(new Date());
            if (this.persiste(OTPreenregistrementCompteClient)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de prise en compte de cette opération");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de cette opération");
        }
        return result;
    }

    public boolean deletePreenregistrementCompteClient(String lg_PREENREGISTREMENT_ID) {
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        boolean result = false;
        try {
            OTPreenregistrementCompteClient = this.getTPreenregistrementCompteClient(lg_PREENREGISTREMENT_ID);
            if (this.delete(OTPreenregistrementCompteClient)) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de prise en compte de cette opération");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de cette opération");
        }
        return result;
    }

    // recuperation d'un type de reglement
    public TTypeReglement getTTypeReglement(String search_value) {
        TTypeReglement OTTypeReglement = null;
        try {
            OTTypeReglement = (TTypeReglement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeReglement t WHERE (t.lgTYPEREGLEMENTID = ?1 OR t.strNAME= ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, search_value).setParameter(2, commonparameter.statut_enable).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypeReglement;
    }
    // fin recuperation d'un type de reglement

    // recuperation d'un mode de reglement en fonction d'un type de reglement
    public TModeReglement getTModeReglementByTypeReglement(String search_value, String lg_TYPE_REGLEMENT_ID) {
        TModeReglement OTModeReglement = null;
        try {
            OTModeReglement = (TModeReglement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TModeReglement t WHERE (t.lgMODEREGLEMENTID LIKE ?1 OR t.strNAME LIKE ?1) AND t.strSTATUT = ?2 AND (t.lgTYPEREGLEMENTID.lgTYPEREGLEMENTID LIKE ?3 OR t.lgTYPEREGLEMENTID.strDESCRIPTION LIKE ?3)")
                    .setParameter(1, search_value + "%").setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, lg_TYPE_REGLEMENT_ID).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTModeReglement;
    }
    // fin recuperation d'un mode de reglement en fonction d'un type de reglement

    // liste des ventes avec avoir
    public List<EntityData> listTPreenregistrementAvoir(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE) {
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME, ' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET "
                    + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                    + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '"
                    + search_value + "%' OR f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENGISTREMENT_ID
                    + "' AND (DATE(t.dt_CREATED) >= '" + dt_Date_Debut + "' and DATE(t.dt_CREATED) <= '" + dt_Date_Fin
                    + "')  AND (TIME(t.dt_CREATED) >= '" + h_debut + "' and TIME(t.dt_CREATED) <= '" + h_fin
                    + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' AND t.int_PRICE > 0 AND t.b_IS_AVOIR = true AND t.`b_IS_CANCEL`=false  GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                new logger().OCategory
                        .info("Date " + this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("lg_TYPE_VENTE_ID"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("b_IS_AVOIR"));

                lstTPreenregistrement.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    // fin liste des ventes avec avoir
    // verifie si vente avoir
    public boolean isVenteAvoir(String lg_PREENREGISTREMENT_ID, String str_STATUT) {
        boolean result = false;
        List<TPreenregistrementDetail> lstPreenregistrementDetails = new ArrayList<TPreenregistrementDetail>();
        try {
            lstPreenregistrementDetails = this.getListeProduitAvoirByVente(lg_PREENREGISTREMENT_ID, str_STATUT);
            new logger().OCategory.info("lstPreenregistrementDetails taille " + lstPreenregistrementDetails.size());
            if (lstPreenregistrementDetails.size() > 0) {
                result = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin verifie si vente avoir

    // cloture d'une vente avoir
    public boolean clotureravoir(String lg_PREENREGISTREMENT_ID) {
        boolean result = false;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser(),
                new tellerManagement(this.getOdataManager(), this.getOTUser()));
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        int i = 0;
        try {
            TPreenregistrement OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement != null) {
                lstTPreenregistrementDetail = this.getListeProduitAvoirByVente(
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                updateSnaphotAvoirclient(OTPreenregistrement);
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                    OTPreenregistrementDetail.setDtUPDATED(new Date());
                    OTPreenregistrementDetail.setBISAVOIR(false);
                    // OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntQUANTITY()); // a
                    // decommenter en cas de probleme 04/11/2016
                    OTPreenregistrementDetail.setIntAVOIRSERVED(0);
                    OTPreenregistrementDetail.setIntQUANTITYSERVED(
                            OTPreenregistrementDetail.getIntQUANTITYSERVED() + OTPreenregistrementDetail.getIntAVOIR());
                    OWarehouseManager.updateReelStock(OTPreenregistrementDetail,
                            OTPreenregistrementDetail.getIntAVOIR(), "ins");
                    OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                            commonparameter.REMOVE, commonparameter.str_ACTION_VENTE,
                            OTPreenregistrementDetail.getIntAVOIR(), this.getOTUser().getLgEMPLACEMENTID());
                    OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                            OTPreenregistrementDetail.getIntAVOIR());
                    OTPreenregistrementDetail.setIntAVOIR(0);
                    if (this.persiste(OTPreenregistrementDetail)) {
                        i++;
                    }
                }
            }

            if (lstTPreenregistrementDetail.size() > 0) {
                if (lstTPreenregistrementDetail.size() == i++) {
                    OTPreenregistrement.setLgUSERID(this.getOTUser());
                    OTPreenregistrement.setBISAVOIR(false);
                    this.persiste(OTPreenregistrement);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildSuccesTraceMessage(
                            i + "/" + lstTPreenregistrementDetail.size() + " produits pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Aucun produit n'a été trouvé sur cet avoir");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de la cloture de l'avoir");
        }
        return result;
    }

    // fin cloture d'une vente avoir
    // liste des produits ayant un avoir sur une vente
    public List<TPreenregistrementDetail> getListeProduitAvoirByVente(String lg_PREENREGISTREMENT_ID,
            String str_STATUT) {
        List<TPreenregistrementDetail> lstPreenregistrementDetails = new ArrayList<>();
        try {
            lstPreenregistrementDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?1 AND t.bISAVOIR = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, true).setParameter(3, str_STATUT)
                    .getResultList();
            new logger().OCategory.info("lstPreenregistrementDetails taille " + lstPreenregistrementDetails.size());

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstPreenregistrementDetails;
    }
    // fin liste des produits ayant un avoir sur une vente

    // construction du message de notification d'un client pour une vente avoir
    public void generationDataForNotif() {
        List<TPreenregistrement> lstPreenregistrements = new ArrayList<TPreenregistrement>();
        List<TPreenregistrementDetail> lstPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());

        String texte = "", libPharmacie = "";
        TFamilleStock OTFamilleStock = null;
        TOutboudMessage OTOutboudMessage = null;
        int i = 0, j = 0;
        try {

            if (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                libPharmacie = this.getOdataManager().getEm().find(TOfficine.class, commonparameter.PROCESS_SUCCESS)
                        .getStrNOMCOMPLET();
            } else {
                libPharmacie = this.getOTUser().getLgEMPLACEMENTID().getStrDESCRIPTION();
            }

            lstPreenregistrements = this.getListAvoirbis("", "%%", commonparameter.statut_is_Closed, 30);
            for (TPreenregistrement OTPreenregistrement : lstPreenregistrements) {
                texte += libPharmacie + ". ";
                texte += "M/Mme " + OTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " "
                        + OTPreenregistrement.getStrLASTNAMECUSTOMER()
                        + ". Vos produits en avoir suivant(s) sont disponibles:\n";
                lstPreenregistrementDetail = this.getListeProduitAvoirByVente(
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstPreenregistrementDetail) {
                    OTFamilleStock = OtellerManagement.getTProductItemStock(
                            OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(),
                            this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                    new logger().OCategory.info("Stock actu:" + OTFamilleStock.getIntNUMBERAVAILABLE()
                            + " ****** avoir:" + OTPreenregistrementDetail.getIntAVOIR());
                    if (OTFamilleStock != null
                            && OTFamilleStock.getIntNUMBERAVAILABLE() > OTPreenregistrementDetail.getIntAVOIR()
                            && OTPreenregistrementDetail.getIntAVOIR() > 0) {
                        texte += "- " + OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION() + " ("
                                + OTPreenregistrementDetail.getIntAVOIR() + ")\n";
                        i++;
                    }
                }
                texte += "Ref: " + OTPreenregistrement.getStrREFTICKET() + ". Montant vente "
                        + (OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()) + "\n";
                texte += "Merci de nous faire toujours confiance.";

                i = 0;
                texte = "";
            }
            if (j > 0) {
                if (lstPreenregistrements.size() == j) {
                    this.buildSuccesTraceMessage("Tous les messages ont été envoyé");
                } else {
                    this.buildErrorTraceMessage(i + "/" + lstPreenregistrements.size() + " messages ont été envoyé");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // fin construction du message de notification d'un client pour une vente avoir
    public List<TPreenregistrement> getListAvoirbis(String search_value, String lg_PREENGISTREMENT_ID,
            String str_STATUT, int int_MAX_ROW) {
        List<TPreenregistrement> lstPreenregistrements = new ArrayList<TPreenregistrement>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (int_MAX_ROW == 0) {
                lstPreenregistrements = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TPreenregistrement t WHERE (t.strREF LIKE ?1 OR t.strREFTICKET LIKE ?1) AND t.lgPREENREGISTREMENTID LIKE ?2 AND t.bISAVOIR = ?3 AND t.strSTATUT = ?4 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?5")
                        .setParameter(1, search_value + "%").setParameter(2, lg_PREENGISTREMENT_ID)
                        .setParameter(3, true).setParameter(4, str_STATUT)
                        .setParameter(5, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            } else {
                lstPreenregistrements = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TPreenregistrement t WHERE (t.strREF LIKE ?1 OR t.strREFTICKET LIKE ?1) AND t.lgPREENREGISTREMENTID LIKE ?2 AND t.bISAVOIR = ?3 AND t.strSTATUT = ?4")
                        .setParameter(1, search_value + "%").setParameter(2, lg_PREENGISTREMENT_ID)
                        .setParameter(3, true).setParameter(4, str_STATUT).setMaxResults(int_MAX_ROW).getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstPreenregistrements taille: " + lstPreenregistrements.size());
        return lstPreenregistrements;
    }

    public TPreenregistrement updatePreenregistrementCustomerInfo(String lg_PREENREGISTREMENT_ID, String str_FIRST_NAME,
            String str_LAST_NAME, String str_ADRESSE) {

        TPreenregistrement OPreenregistrement = null;
        try {
            OPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class, lg_PREENREGISTREMENT_ID);

            OPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME);
            OPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME);
            OPreenregistrement.setStrPHONECUSTOME(str_ADRESSE);
            this.merge(OPreenregistrement);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OPreenregistrement;
    }

    // liste des ventes effectées à un dépôt
    public List<TPreenregistrementCompteClient> getListeVenteDepot(String search_value, String lg_TYPE_VENTE_ID,
            String str_Date_Debut, String str_Date_Fin) {
        List<TPreenregistrementCompteClient> listTPreenregistrementCompteClients = new ArrayList<TPreenregistrementCompteClient>();
        Date dt_BEGIN = new Date(), dt_END = new Date();
        String OdateDebut = "", OdateFin = "";
        try {
            OdateDebut = str_Date_Debut.equalsIgnoreCase("") ? date.DateToString(dt_BEGIN, date.formatterMysqlShort2)
                    : date.DateToString(date.stringToDate(str_Date_Debut, date.formatterMysqlShort),
                            date.formatterMysqlShort2);
            dt_BEGIN = date.getDate(OdateDebut, "00:00");
            new logger().OCategory.info("dt_BEGIN *** " + dt_BEGIN + " OdateDebut *** " + OdateDebut);

            OdateFin = str_Date_Fin.equalsIgnoreCase("") ? date.DateToString(dt_END, date.formatterMysqlShort2) : date
                    .DateToString(date.stringToDate(str_Date_Fin, date.formatterMysqlShort), date.formatterMysqlShort2);
            dt_END = date.getDate(OdateFin, "23:59");
            new logger().OCategory.info("dt_END *** " + dt_END + " OdateFin *** " + OdateFin);

            listTPreenregistrementCompteClients = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClient t WHERE t.lgPREENREGISTREMENTID.dtUPDATED >= ?1 AND t.lgPREENREGISTREMENTID.dtUPDATED <= ?2 AND t.lgPREENREGISTREMENTID.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?3 AND (t.lgPREENREGISTREMENTID.strREF LIKE ?4 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?4 OR t.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?4 OR t.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?4 OR CONCAT(t.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME,' ' ,t.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME) LIKE ?4) AND t.lgPREENREGISTREMENTID.intPRICE > 0 AND t.lgPREENREGISTREMENTID.bISCANCEL = ?5")
                    .setParameter(1, dt_BEGIN).setParameter(2, dt_END).setParameter(3, lg_TYPE_VENTE_ID)
                    .setParameter(4, search_value + "%").setParameter(5, false).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory
                .info("listTPreenregistrementCompteClients taille " + listTPreenregistrementCompteClients.size());
        return listTPreenregistrementCompteClients;
    }

    // fin liste des ventes effectées à un dépôt extension
    // liste des ventes effectées à un dépôt
    public Double getPriceVenteToDepot(String search_value, String lg_TYPE_VENTE_ID, String str_Date_Debut,
            String str_Date_Fin) {
        List<TPreenregistrementCompteClient> listTPreenregistrementCompteClients = new ArrayList<>();
        Double result = 0.0;
        try {
            listTPreenregistrementCompteClients = this.getListeVenteDepot(search_value, lg_TYPE_VENTE_ID,
                    str_Date_Debut, str_Date_Fin);
            for (TPreenregistrementCompteClient OTPreenregistrementCompteClient : listTPreenregistrementCompteClients) {
                result += (OTPreenregistrementCompteClient.getLgPREENREGISTREMENTID().getIntPRICE()
                        - OTPreenregistrementCompteClient.getLgPREENREGISTREMENTID().getIntPRICEREMISE());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }
    // fin liste des ventes effectées à un dépôt extension

    // 22/04/2016 by KOBENA
    public List<TFacture> getBalanceInvoice(String search_value, Date dateValue, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {
        TClient client = null;

        List<TFacture> lstTFacture = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_USER_ID)) {

                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                lstTFacture = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5 AND ( FUNCTION('MONTH',t.dtCREATED)=  FUNCTION('MONTH',?6) AND FUNCTION('YEAR',t.dtCREATED)= FUNCTION('YEAR',?6)) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(6, dateValue).setParameter(8, lg_TIERS_PAYANT_ID).getResultList();
            } else {
                lstTFacture = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)  AND ( FUNCTION('MONTH',t.dtCREATED)= FUNCTION('MONTH',?6) AND FUNCTION('YEAR',t.dtCREATED)= FUNCTION('YEAR',?6)) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%").setParameter(6, dateValue)
                        .setParameter(8, lg_TIERS_PAYANT_ID).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;
    }

    public List<TFacture> getPreviousHalfYearBalanceInvoice(String search_value, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {
        TClient client = null;

        List<TFacture> lstTFacture = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_USER_ID)) {
                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                lstTFacture = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5 AND t.dtCREATED <= ?6  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(6, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(8, lg_TIERS_PAYANT_ID).getResultList();
            } else {
                lstTFacture = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT t FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)  AND t.dtCREATED <= ?6  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%")
                        .setParameter(6, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(8, lg_TIERS_PAYANT_ID).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;
    }

    public List<TClient> getAllClients(String query, String lg_TIERS_PAYANT_ID) {
        return this.getOdataManager().getEm().createQuery(
                "SELECT DISTINCT o FROM TClient  o,TCompteClient cl,TTiersPayant p,TCompteClientTiersPayant cp   WHERE  o.lgCLIENTID=cl.lgCLIENTID.lgCLIENTID AND cl.lgCOMPTECLIENTID=cp.lgCOMPTECLIENTID.lgCOMPTECLIENTID AND p.lgTIERSPAYANTID=cp.lgTIERSPAYANTID.lgTIERSPAYANTID   AND p.lgTIERSPAYANTID=?2 AND   o.strSTATUT='enable' AND (o.strFIRSTNAME LIKE ?1 OR o.strLASTNAME LIKE ?1 OR CONCAT(o.strFIRSTNAME,' ',o.strLASTNAME) LIKE ?1 OR o.strNUMEROSECURITESOCIAL LIKE ?1 ) AND o.strSTATUT='enable' ORDER BY o.strFIRSTNAME,o.strLASTNAME ")
                .setParameter(1, query + "%").setParameter(2, lg_TIERS_PAYANT_ID).getResultList();

    }

    public long getBalanceInvoiceDetails(String search_value, Date dateValue, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {
        TClient client = null;
        long amount = 0l;
        Object object = 0;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }

            if (!"%%".equals(lg_USER_ID)) {

                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5 AND ( FUNCTION('MONTH',t.dtCREATED)= ?6 AND FUNCTION('YEAR',t.dtCREATED)= ?6) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d  ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(6, dateValue).setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            } else {

                object = this.getOdataManager().getEm().createQuery(
                        "SELECT  SUM(DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)  AND ( FUNCTION('MONTH',t.dtCREATED)= FUNCTION('MONTH',?6) AND FUNCTION('YEAR',t.dtCREATED)= FUNCTION('YEAR',?6)) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d  ")
                        .setParameter(2, search_value + "%").setParameter(6, dateValue)
                        .setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            }
            if (object != null) {
                amount = Double.valueOf(object + "").longValue();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return amount;
    }

    public long getHalfyearBalanceInvoiceDetails(String search_value, String lg_USER_ID, String lg_TIERS_PAYANT_ID) {
        TClient client = null;
        long amount = 0l;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            Object object = 0;
            if (!"%%".equals(lg_USER_ID)) {
                System.out.println("cccc ");
                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5 AND t.dtCREATED <=?6  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d GROUP BY p.lgTIERSPAYANTID ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(6, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            } else {

                object = this.getOdataManager().getEm().createQuery(
                        "SELECT  SUM(DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)  AND t.dtCREATED <=?6  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d  GROUP BY p.lgTIERSPAYANTID ")
                        .setParameter(2, search_value + "%")
                        .setParameter(6, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            }
            if (object != null) {
                amount = Double.valueOf(object + "").longValue();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return amount;
    }

    public List<EntityData> getAllInvoicesTiersPayant(String search_value, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {
        TClient client = null;

        List<EntityData> lstTFacture = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            List<Object[]> list = new ArrayList<>();
            if (!"%%".equals(lg_USER_ID)) {

                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                list = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT p.lgTIERSPAYANTID ,p.strFULLNAME FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5   AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(8, lg_TIERS_PAYANT_ID).getResultList();
            } else {

                list = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT p.lgTIERSPAYANTID,p.strFULLNAME FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)    AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d  ")
                        .setParameter(2, search_value + "%").setParameter(8, lg_TIERS_PAYANT_ID).getResultList();
            }
            for (Object[] object : list) {

                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");

                lstTFacture.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;
    }

    public long getBalanceInvoiceItems(String search_value, String lg_USER_ID, String lg_TIERS_PAYANT_ID) {
        TClient client = null;
        long finalcount = 0l;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            Object count = 0;
            if (!"%%".equals(lg_USER_ID)) {
                System.out.println("cccc ");
                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                count = this.getOdataManager().getEm().createQuery(
                        "SELECT COUNT(d ) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d AND d.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            } else {

                count = this.getOdataManager().getEm().createQuery(
                        "SELECT  COUNT(d) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)   AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND d.dblMONTANTRESTANT >0d ")
                        .setParameter(2, search_value + "%").setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            }
            finalcount = Long.valueOf(count + "");

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return finalcount;
    }

    public long getHalfyearIncludeCurrentBalanceInvoiceDetails(String search_value, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {
        TClient client = null;
        long amount = 0l;
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            Object object = 0;
            if (!"%%".equals(lg_USER_ID)) {
                System.out.println("cccc ");
                client = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                object = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2  OR p.strCODEORGANISME LIKE ?2) AND d.strFIRSTNAMECUSTOMER = ?3 AND d.strLASTNAMECUSTOMER = ?4 AND d.strNUMEROSECURITESOCIAL = ?5 AND t.dtCREATED >?6  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND t.dblMONTANTRESTANT >0d  ")
                        .setParameter(2, search_value + "%").setParameter(3, client.getStrFIRSTNAME())
                        .setParameter(4, client.getStrLASTNAME()).setParameter(5, client.getStrNUMEROSECURITESOCIAL())
                        .setParameter(6, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            } else {

                object = this.getOdataManager().getEm().createQuery(
                        "SELECT  SUM(DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2)  AND t.dtCREATED >?6  AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d  ")
                        .setParameter(2, search_value + "%")
                        .setParameter(6, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(8, lg_TIERS_PAYANT_ID).getSingleResult();
            }
            if (object != null) {
                amount = Double.valueOf(object + "").longValue();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return amount;
    }

    public List<EntityData> getAllInvoicesBalanceRecapDetails(String search_value, String lg_TIERS_PAYANT_ID,
            String dt_start, String dt_end) {

        List<EntityData> lstTFacture = new ArrayList<>();

        Date dtstart = ("".equals(dt_start) ? new Date() : java.sql.Date.valueOf(dt_start));
        Date dtend = ("".equals(dt_end) ? new Date() : java.sql.Date.valueOf(dt_end));
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            List<Object[]> list = new ArrayList<>();

            list = this.getOdataManager().getEm().createQuery(
                    "SELECT  p.lgTIERSPAYANTID,p.strFULLNAME ,SUM( DISTINCT t.intNBDOSSIER),SUM( DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2 OR d.strFIRSTNAMECUSTOMER LIKE ?2 OR d.strLASTNAMECUSTOMER LIKE ?2 OR d.strNUMEROSECURITESOCIAL LIKE ?2) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND FUNCTION('DATE',t.dtCREATED) >=FUNCTION('DATE',?9)  AND  FUNCTION('DATE',t.dtCREATED) <=FUNCTION('DATE',?10)  GROUP BY p.lgTIERSPAYANTID ")
                    .setParameter(2, search_value + "%").setParameter(8, lg_TIERS_PAYANT_ID).setParameter(9, dtstart)
                    .setParameter(10, dtend).getResultList();

            for (Object[] object : list) {
                long amount = 0l;
                if (object[3] != null) {
                    amount = Double.valueOf(object[3] + "").longValue();
                }

                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityData.setStr_value3(object[2] + "");
                entityData.setStr_value4(amount + "");

                lstTFacture.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;
    }

    public long getTierspayantNbreProduitVendu(String lg_TIERS_PAYANT_ID, String dt_start, String dt_end) {
        List<String> id = new ArrayList<>();
        long qty = 0l;
        try {
            id = this.getOdataManager().getEm().createQuery(
                    "SELECT  d.strREF FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE   t.strCUSTOMER LIKE ?1 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND FUNCTION('DATE',t.dtCREATED) >=FUNCTION('DATE',?9)  AND FUNCTION('DATE',t.dtCREATED) <=FUNCTION('DATE',?10) AND d.dblMONTANTRESTANT >0d")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(9, java.sql.Date.valueOf(dt_start))
                    .setParameter(10, java.sql.Date.valueOf(dt_end)).getResultList();
            for (String OString : id) {
                TPreenregistrementCompteClientTiersPayent oClientTiersPayent = this.getOdataManager().getEm()
                        .find(TPreenregistrementCompteClientTiersPayent.class, OString);
                List<TPreenregistrementDetail> details = new ArrayList<>();
                if (oClientTiersPayent != null) {
                    TPreenregistrement OPreenregistrement = oClientTiersPayent.getLgPREENREGISTREMENTID();
                    for (TPreenregistrementDetail ODetail : OPreenregistrement
                            .getTPreenregistrementDetailCollection()) {
                        qty += ODetail.getIntQUANTITY();
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return qty;
    }

    public long getNombreDossierImpayeParFacture(String lg_FACTURE_ID) {
        long count = 0l;
        try {

            Object object = this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o) FROM TFactureDetail o WHERE o.dblMONTANTRESTANT >0d AND o.lgFACTUREID.lgFACTUREID LIKE ?1 ")
                    .setParameter(1, lg_FACTURE_ID).getSingleResult();

            count = Long.valueOf(object + "");

        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    // transformation d'une vente terminée en une nouvelle prévente
    public boolean transformVenteclosedToNewprevente(String lg_PREENREGISTREMENT_ID) {
        boolean result = false;
        TPreenregistrement OTPreenregistrement = null, OTPreenregistrementNew = null;
        List<TPreenregistrementDetail> lsPreenregistrementDetails = new ArrayList<TPreenregistrementDetail>();
        int i = 0;
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de la transformation. Vente inexistante");
                return result;
            }

            if (!OTPreenregistrement.getStrSTATUT().equalsIgnoreCase(commonparameter.statut_is_Closed)) {
                this.buildErrorTraceMessage(
                        "Echec de la transformation. Seule les ventes terminées peuvent être transformées");
                return result;
            }

            lsPreenregistrementDetails = this.getListeProduitAvoirByVente(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
            OTPreenregistrementNew = this.CreatePreVente(OTPreenregistrement.getStrMEDECIN(),
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                    OTPreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID(), OTPreenregistrement.getLgREMISEID(),
                    Parameter.KEY_LAST_ORDER_NUMBER_PREVENTE, this.getOTUser().getLgUSERID(),
                    OTPreenregistrement.getStrFIRSTNAMECUSTOMER(), OTPreenregistrement.getStrLASTNAMECUSTOMER());
            for (TPreenregistrementDetail OTPreenregistrementDetail : lsPreenregistrementDetails) {
                if (this.addToPreenregistrement(OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                        OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OTPreenregistrementDetail.getIntPRICEUNITAIR(), OTPreenregistrementDetail.getIntQUANTITY(),
                        OTPreenregistrementDetail.getIntQUANTITYSERVED(),
                        OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                        new ArrayList<TCompteClientTiersPayant>(), OTPreenregistrement.getLgREMISEID(),
                        OTPreenregistrementDetail.getLgFAMILLEID().getIntPRICE(),
                        OTPreenregistrementDetail.getIntFREEPACKNUMBER()) != null) {
                    i++;
                }
            }
            if (i > 0) {
                if (i == lsPreenregistrementDetails.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

                } else {
                    this.buildSuccesTraceMessage(
                            i + "/" + lsPreenregistrementDetails.size() + " ont été pris en compte");
                }
            } else {
                this.delete(OTPreenregistrementNew);
                this.buildErrorTraceMessage("Aucun ligne de produit trouvée dans cette vente");
            }
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin transformation d'une vente terminée en une nouvelle prévente

    // liste des dossiers en attente d'edition
    public List<TPreenregistrementCompteClientTiersPayent> getListVenteTiersPayant(String search_value,
            String lg_TIERS_PAYANT_ID, Date dt_debut, Date dt_fin) {
        List<TPreenregistrementCompteClientTiersPayent> ListVenteTiersPayant = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            ListVenteTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.strSTATUT LIKE ?1 AND t.lgPREENREGISTREMENTID.dtCREATED >= ?2 AND t.lgPREENREGISTREMENTID.dtCREATED <= ?3 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?4 AND t.strSTATUTFACTURE = ?5 AND t.lgPREENREGISTREMENTID.lgUSERCAISSIERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?6 AND (t.lgPREENREGISTREMENTID.strREF LIKE ?7 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?7 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?7 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?7 OR CONCAT(t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME, ' ', t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME) LIKE ?7) AND t.lgPREENREGISTREMENTID.bWITHOUTBON = ?8 AND t.lgPREENREGISTREMENTID.intPRICE > 0 AND t.lgPREENREGISTREMENTID.bISCANCEL = false ORDER BY t.lgPREENREGISTREMENTID.dtUPDATED")
                    .setParameter(1, commonparameter.statut_is_Closed).setParameter(2, dt_debut).setParameter(3, dt_fin)
                    .setParameter(4, lg_TIERS_PAYANT_ID).setParameter(5, commonparameter.UNPAID)
                    .setParameter(6, lg_EMPLACEMENT_ID).setParameter(7, search_value + "%").setParameter(8, false)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("ListVenteTiersPayant taille " + ListVenteTiersPayant.size());
        return ListVenteTiersPayant;
    }

    // total general des ventes a credit a afficher sur les factures en attentes d'édition
    public double getTotalBon(
            List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent) {
        double result = 0.0;
        List<String> data = new ArrayList<String>();
        try {
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                if (data.size() == 0) {
                    data.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());
                    result += (OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getIntPRICE()
                            - OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                                    .getIntPRICEREMISE());
                } else if (!data.get(0).equalsIgnoreCase(OTPreenregistrementCompteClientTiersPayent
                        .getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID())) {
                    data.clear();
                    result += (OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getIntPRICE()
                            - OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                                    .getIntPRICEREMISE());
                    data.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin total general des ventes a credit a afficher sur les factures en attentes d'édition

    // total general des ventes a credit a afficher sur les factures en attentes d'édition
    public double getTotalAttenduParTP(
            List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent) {
        double result = 0.0;
        try {
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                result += OTPreenregistrementCompteClientTiersPayent.getIntPRICE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin total general des ventes a credit a afficher sur les factures en attentes d'édition

    // total general des ventes a credit a afficher sur les factures en attentes d'édition
    public int getTotalNbreBon(
            List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent) {
        int result = 0;
        List<String> data = new ArrayList<String>();
        try {
            for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                if (data.size() == 0) {
                    data.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());
                    result++;
                } else if (!data.get(0).equalsIgnoreCase(OTPreenregistrementCompteClientTiersPayent
                        .getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID())) {
                    data.clear();
                    result++;
                    data.add(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                            .getLgPREENREGISTREMENTID());
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin total general des ventes a credit a afficher sur la facture subrogatoire

    // liste des ventes sans bon
    public List<EntityData> getListeVenteSansBon(String search_value, String dt_Date_Debut, String dt_Date_Fin,
            String h_debut, String h_fin, String lg_TIERS_PAYANT_ID) {

        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        List<String> data = new ArrayList<String>();
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "SELECT * FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false AND v.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND (DATE(v.dt_UPDATED) >= '" + dt_Date_Debut
                    + "' AND DATE(v.dt_UPDATED) <= '" + dt_Date_Fin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut
                    + "' AND TIME(v.dt_UPDATED) <= '" + h_fin + "') AND (v.str_FIRST_NAME_CUSTOMER LIKE '"
                    + search_value + "%' OR v.str_LAST_NAME_CUSTOMER LIKE '" + search_value
                    + "%' OR v.str_FIRST_LAST_NAME LIKE '" + search_value + "%' OR v.str_REF_BON LIKE '" + search_value
                    + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '" + search_value
                    + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND v.lg_TIERS_PAYANT_ID LIKE '"
                    + lg_TIERS_PAYANT_ID + "' AND b_WITHOUT_BON = true ORDER BY v.dt_UPDATED ASC";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                if (data.size() == 0) {
                    data.add((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? ""
                            : Ojconnexion.get_resultat().getString("str_REF_BON")));
                    OEntityData = new EntityData();
                    OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                    OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                    OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                    OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                    OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                    OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                    OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                    OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_PRICE_TOTAL"));
                    OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                    OEntityData.setStr_value14((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? ""
                            : Ojconnexion.get_resultat().getString("str_REF_BON")));
                    OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("str_NAME"));
                    OEntityData
                            .setStr_value16((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? "0" : "1"));
                    lstTPreenregistrement.add(OEntityData);
                } else {
                    new logger().OCategory.info("Debut:" + data.get(0) + ":fin");
                    if (!data.get(0).equalsIgnoreCase((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? ""
                            : Ojconnexion.get_resultat().getString("str_REF_BON")))) {
                        data.clear();
                        OEntityData = new EntityData();
                        OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                        OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                        OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                        OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                        OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                        OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                        OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                        OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_PRICE_TOTAL"));
                        OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                        OEntityData.setStr_value14((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? ""
                                : Ojconnexion.get_resultat().getString("str_REF_BON")));
                        OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("str_NAME"));
                        OEntityData.setStr_value16(
                                (Ojconnexion.get_resultat().getString("str_REF_BON") == null ? "0" : "1"));
                        data.add((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? ""
                                : Ojconnexion.get_resultat().getString("str_REF_BON")));
                        lstTPreenregistrement.add(OEntityData);
                    }
                }

            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    // fin liste des ventes sans bon
    // mise a jour de bon a une vente
    public boolean updateBonOfVente(String lg_PREENREGISTREMENT_ID, String str_REF_BON) {
        boolean result = false;
        TPreenregistrement OPreenregistrement = null;
        String str_REF_BON_OLD = "";
        try {
            OPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Vente inexistante");
                return result;
            }
            if (this.getTPreenregistrementByRef(str_REF_BON) != null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Ce bon est déjà utilisé");
                return result;
            }
            str_REF_BON_OLD = OPreenregistrement.getStrREFBON();
            OPreenregistrement.setDtUPDATED(new Date());
            OPreenregistrement.setStrREFBON(str_REF_BON);
            OPreenregistrement.setBWITHOUTBON(false);
            if (this.persiste(OPreenregistrement)) {
                this.buildSuccesTraceMessage("Numero de bon mise à jour avec succès");
                result = true;
                this.do_event_log(commonparameter.ALL,
                        "Mise à jour du numero de bon de la vente " + OPreenregistrement.getStrREF()
                                + ". Ancien numero: " + str_REF_BON_OLD + ". Nouveau numero: "
                                + OPreenregistrement.getStrREFBON(),
                        this.getOTUser().getStrLOGIN(), commonparameter.statut_enable, "TPreenregistrement",
                        "Vente à crédit: Mise à jour de numero de bon.", "Mise à jour du numero de bon de la vente",
                        this.getOTUser().getLgUSERID());

            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du numero de bon");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du numero de bon");
        }
        return result;
    }
    // fin mise a jour de bon a une vente

    // fonction qui teste si une vente est liée à une facture
    public String checkChargedPreenregistrement(String str_REF) {
        String CODEFACTURE = "";

        try {
            List<TFactureDetail> list = this.getOdataManager().getEm().createQuery(
                    "SELECT o  FROM TFactureDetail o,TPreenregistrementCompteClientTiersPayent p WHERE p.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 AND p.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=o.strREF")
                    .setParameter(1, str_REF).setMaxResults(1).getResultList();
            if (!list.isEmpty()) {
                CODEFACTURE = list.get(0).getLgFACTUREID().getStrCODEFACTURE();

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return CODEFACTURE;
    }

    // création d'un dévis
    public boolean DoDevis(String lg_PREENREGISTREMENT_ID, String lg_TYPE_VENTE_ID, String lg_COMPTE_CLIENT_ID)
            throws JSONException {
        boolean result = false;
        TPreenregistrement OTPreenregistrement = null;
        TCompteClient OTCompteClient = null;
        // List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement de la proforma. Référence inexistante");
                return result;
            }

            OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);
            if (OTCompteClient == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement de la proforma. Client inexistatnt");
                return result;
            }

            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Devis);
            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setStrREF(
                    buildVenteRef(OTPreenregistrement.getDtUPDATED(), Parameter.KEY_LAST_ORDER_NUMBER_DEVIS));
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(OTCompteClient.getLgCLIENTID().getStrFIRSTNAME());
            OTPreenregistrement.setStrLASTNAMECUSTOMER(OTCompteClient.getLgCLIENTID().getStrLASTNAME());
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(OTCompteClient.getLgCLIENTID().getStrNUMEROSECURITESOCIAL());
            OTPreenregistrement.setStrPHONECUSTOME(OTCompteClient.getLgCLIENTID().getStrADRESSE());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setStrINFOSCLT(OTCompteClient.getLgCOMPTECLIENTID());
            if (OTPreenregistrement.getLgREMISEID() != null && !OTPreenregistrement.getLgREMISEID().equals("")) {
                this.setupNetPaidWithRemise(OTPreenregistrement, 0);
                this.buildSuccesTraceMessage("Proforma " + OTPreenregistrement.getStrREF() + " créée avec succès");
                result = true;
            } else {
                this.persiste(OTPreenregistrement);
                this.buildSuccesTraceMessage("Proforma " + OTPreenregistrement.getStrREF() + " créée avec succès");
                result = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'enregistrement de la proforma.");
        }
        return result;

    }

    // fin création d'un dévis
    // mise à jour du type de vente
    public TPreenregistrement updateTypeventeInVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_VENTE_ID,
            int int_TAUX) {
        TPreenregistrement OTPreenregistrement = null;
        TTypeVente OTypeVente = null;
        int int_vente_net = 0;
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Référence de vente inexistante");
                return null;
            }
            OTypeVente = this.getTypeVente(lg_TYPE_VENTE_ID);
            if (OTypeVente == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Type de vente inexistant");
                return null;
            }
            OTPreenregistrement.setLgTYPEVENTEID(OTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTypeVente.getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);
            OTPreenregistrement.setDtUPDATED(new Date());

            // code ajouté 26/05/2016
            if (!OTypeVente.getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)) {
                int_vente_net = OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE();
                OTPreenregistrement.setIntCUSTPART(int_vente_net - ((int_vente_net * int_TAUX) / 100));
            }
            // fin code ajouté 26/05/2016
            if (this.persiste(OTPreenregistrement)) {
                String lg_TYPE_CLIENT_ID = "2";
                if (lg_TYPE_VENTE_ID.equals(Parameter.VENTE_ASSURANCE)) {
                    lg_TYPE_CLIENT_ID = "1";
                }

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du type de vente");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du type de vente");
        }
        return OTPreenregistrement;
    }

    public boolean updateTypeventeInVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_VENTE_ID) {
        boolean result = false;
        TTypeVente OTypeVente = null;
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Référence de vente inexistante");
                return result;
            }
            OTypeVente = this.getTypeVente(lg_TYPE_VENTE_ID);
            if (OTypeVente == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Type de vente inexistant");
                return result;
            }

            if (OTypeVente.getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT) && !OTPreenregistrement
                    .getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)) {
                List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = this
                        .getListeTPreenregistrementCompteClientTiersPayent(
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent : lstTPreenregistrementCompteClientTiersPayent) {
                    this.getOdataManager().getEm().remove(OTPreenregistrementCompteClientTiersPayent);
                }
            }
            OTPreenregistrement.setLgTYPEVENTEID(OTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTypeVente.getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);
            OTPreenregistrement.setDtUPDATED(new Date());
            if (this.persiste(OTPreenregistrement)) {
                this.buildSuccesTraceMessage("Mise à jour du type de vente effectué avec succès");
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du type de vente");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin mise à jour du type de vente

    public THistorypreenregistrement createTHistorypreenregistrement(String str_REF, Date day, int int_LAST_NUMBER) {
        THistorypreenregistrement OTHistorypreenregistrement = null;
        try {
            OTHistorypreenregistrement = new THistorypreenregistrement();
            OTHistorypreenregistrement.setLgHISTORYPREENREGISTREMENTID(this.getKey().getComplexId());
            OTHistorypreenregistrement.setStrREF(str_REF);
            OTHistorypreenregistrement.setIntLASTNUMBER(int_LAST_NUMBER);
            OTHistorypreenregistrement.setDtDAY(day);
            OTHistorypreenregistrement.setDtCREATED(new Date());
            OTHistorypreenregistrement.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().persist(OTHistorypreenregistrement);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTHistorypreenregistrement;
    }

    public THistorypreenregistrement getTHistorypreenregistrement(Date day) {
        THistorypreenregistrement OTHistorypreenregistrement = null;
        try {
            OTHistorypreenregistrement = (THistorypreenregistrement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM THistorypreenregistrement t WHERE FUNCTION('DATE',t.dtDAY) = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, day, TemporalType.DATE).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTHistorypreenregistrement;
    }

    public String buildVenteRef(Date ODate, String KEY_PARAMETER) throws JSONException {
        // TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_LAST_ORDER_NUMBER");
        // // a decommenter en cas de probleme
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, KEY_PARAMETER);
        TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = this.getOdataManager().getEm().find(TParameters.class,
                "KEY_SIZE_ORDER_NUMBER");
        // this.refresh(OTParameters);

        String jsondata = OTParameters.getStrVALUE();
        int int_last_code = 0;
        int_last_code = int_last_code + 1;

        new logger().OCategory.info("jsondata =  " + jsondata);
        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);

            int_last_code = new Integer(jsonObject.getString("int_last_code"));
            Date dt_last_date = date.stringToDate(jsonObject.getString("str_last_date"), date.formatterMysqlShort2);

            String str_lasd = this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort2);
            String str_actd = this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2);

            if (!str_lasd.equals(str_actd)) {
                int_last_code = 0;
            }

            new logger().OCategory.info(int_last_code + "  " + dt_last_date);

        } catch (Exception e) {
            e.printStackTrace();
        }

        // KEY_SIZE_ORDER_NUMBER
        Calendar now = Calendar.getInstance();
        int hh = now.get(Calendar.HOUR_OF_DAY);
        int mois = now.get(Calendar.MONTH) + 1;
        int jour = now.get(Calendar.DAY_OF_MONTH);
        int intsize = ((int_last_code + 1) + "").length();
        int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
        String str_last_code = "";
        for (int i = 0; i < (intsize_tobuild - intsize); i++) {
            str_last_code = str_last_code + "0";
        }

        str_last_code = str_last_code + (int_last_code + 1) + "";

        String str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", str_last_code);
        json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        OTParameters.setStrVALUE(jsonData);
        this.getOdataManager().getEm().merge(OTParameters);

        new logger().OCategory.info(jsonData);
        new logger().OCategory.info(str_code);
        return str_code;
    }

    private void updateSnaphotAvoirclient(TPreenregistrement OPreenregistrement) {
        List<TPreenregistrementCompteClientTiersPayent> list = (List<TPreenregistrementCompteClientTiersPayent>) OPreenregistrement
                .getTPreenregistrementCompteClientTiersPayentCollection();
        if (!list.isEmpty()) {
            List<TPreenregistrementDetail> details = (List<TPreenregistrementDetail>) OPreenregistrement
                    .getTPreenregistrementDetailCollection();
            String lg_CLIENT_ID = list.get(0).getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                    .getLgCLIENTID();
            long avoir = 0l;

            for (TPreenregistrementDetail ODetail : details) {
                avoir += (ODetail.getIntAVOIR() * ODetail.getIntPRICEUNITAIR());
            }
            String query = "UPDATE t_snap_shop_vente_client SET `int_AMOUNT_AVOIR`=`int_AMOUNT_AVOIR`-" + avoir
                    + " WHERE MONTH(`dt_DAY`)=MONTH('" + date.formatterMysql.format(OPreenregistrement.getDtCREATED())
                    + "') AND `lg_CLIENT_ID`='" + lg_CLIENT_ID + "'";

            try {
                this.getOdataManager().getEm().getTransaction().begin();
                this.getOdataManager().getEm().createNativeQuery(query).executeUpdate();
                this.getOdataManager().getEm().getTransaction().commit();
            } catch (Exception e) {
                e.printStackTrace();
            }

        }
    }

    public List<String> generateDataToExportProductUpdateStockdepot(String liste_param) {

        List<TPreenregistrementDetail> listeTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();

        String row = "";
        List<String> lst = new ArrayList<String>();
        String search_value = "";
        TPreenregistrement OTPreenregistrement = null;
        try {

            // code ajouté
            String[] tabString = liste_param.split(";"); // on case la ligne courante pour recuperer les differentes
                                                         // colonnes
            String[] search_value_Tab = tabString[0].split(":");

            search_value = (search_value_Tab.length > 1 ? search_value_Tab[1] : "");
            OTPreenregistrement = this.getTPreenregistrementByRef(search_value);
            listeTPreenregistrementDetail = this.getTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
            for (TPreenregistrementDetail OTPreenregistrementDetail : listeTPreenregistrementDetail) {
                // "IDENTIFIANT;CIP;DESIGNATION;QUANTITE;PRIXVENTE;MONTANT
                row += OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID() + ";"
                        + OTPreenregistrementDetail.getLgFAMILLEID().getIntCIP() + ";"
                        + OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION() + ";"
                        + OTPreenregistrementDetail.getIntQUANTITYSERVED() + ";"
                        + OTPreenregistrementDetail.getIntPRICEUNITAIR() + ";" + OTPreenregistrementDetail.getIntPRICE()
                        + ";";

                row = row.substring(0, row.length() - 1);
                new logger().OCategory.info(row);
                lst.add(row);
                row = "";
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Taille de la nouvelle liste " + lst.size());
        return lst;
    }

    public String generateEnteteForFileProductUpdateStockdepot() {
        return "IDENTIFIANT;CIP;DESIGNATION;QUANTITE;PRIX VENTE;MONTANT";
    }

    // afficher le net a payer
    public TPreenregistrement showNetPaid(String lg_PREENREGISTREMENT_ID, int int_TAUX) {
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Référence de vente inexistante");
                return OTPreenregistrement;
            }

            if (OTPreenregistrement.getLgREMISEID() != null
                    && !OTPreenregistrement.getLgREMISEID().equalsIgnoreCase("")) { // si vente remise
                this.setupNetPaidWithRemise(OTPreenregistrement, int_TAUX);
            } else {
                this.setupNetPaidWithoutRemise(OTPreenregistrement, int_TAUX);
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération. Veuillez réessayer");
        }
        return OTPreenregistrement;
    }

    public int setupNetPaidWithRemise(TPreenregistrement OTPreenregistrement, int int_TAUX) {
        TParameters OTParameters = null;
        TRemise OTRemise = null;
        int result = 0, int_TOTAL_REMISE = 0, int_REMISE = 0, int_PART_TIERSPAYANT = 0;
        TGrilleRemise OTGrilleRemise = null;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        boolean isAvoir = false;
        try {

            OTRemise = this.GetRemiseToApply(OTPreenregistrement.getLgREMISEID());
            if (OTRemise != null) {

                if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equalsIgnoreCase(Parameter.TYPE_REMISE_CLIENT)) {
                    int_TOTAL_REMISE = (int) ((OTPreenregistrement.getIntPRICE() * OTRemise.getDblTAUX()) / 100);
                } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID()
                        .equalsIgnoreCase(Parameter.TYPE_REMISE_PRODUCT)) {
                    lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                    for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                        OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(
                                OTPreenregistrementDetail.getLgPREENREGISTREMENTID(),
                                OTPreenregistrementDetail.getLgFAMILLEID());
                        if (OTGrilleRemise != null) {
                            int_REMISE = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTGrilleRemise.getDblTAUX())
                                    / 100);
                            int_TOTAL_REMISE += int_REMISE;
                            OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                            OTPreenregistrementDetail.setIntPRICEREMISE(int_REMISE);
                        }
                        if (OTPreenregistrementDetail.getBISAVOIR()) {
                            isAvoir = true;
                        }
                    }
                }
                OTPreenregistrement.setIntPRICEREMISE(int_TOTAL_REMISE);
                OTPreenregistrement.setBISAVOIR(isAvoir);
                if (!OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()
                        .equalsIgnoreCase(Parameter.VENTE_COMPTANT)) {
                    int_PART_TIERSPAYANT = (OTPreenregistrement.getIntPRICE() * int_TAUX) / 100;
                    // result = (int_TAUX == 100 ? 0 : (OTPreenregistrement.getIntPRICE() - (int_PART_TIERSPAYANT +
                    // int_TOTAL_REMISE) < 0) ? 0 : OTPreenregistrement.getIntPRICE() - (int_PART_TIERSPAYANT +
                    // int_TOTAL_REMISE));
                    result = (int_TAUX == 100 ? 0 : OTPreenregistrement.getIntPRICE() - int_PART_TIERSPAYANT);
                    OTPreenregistrement.setIntCUSTPART(result);
                } else {
                    result = OTPreenregistrement.getIntPRICE();
                }
                new logger().OCategory.info("result:" + result);
                this.persiste(OTPreenregistrement);
            }
            this.buildSuccesTraceMessage("Opréation effectuée avec succe");
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                this.showNetPaid(String.valueOf(result));
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
        }
        return result;
    }

    public int setupNetPaidWithoutRemise(TPreenregistrement OTPreenregistrement, int int_TAUX) {
        TParameters OTParameters = null;
        int result = 0, int_PART_TIERSPAYANT = 0;
        boolean isAvoir = false;
        try {

            if (!OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)) {
                int_PART_TIERSPAYANT = (OTPreenregistrement.getIntPRICE() * int_TAUX) / 100;
                result = (int_TAUX == 100 ? 0 : OTPreenregistrement.getIntPRICE() - int_PART_TIERSPAYANT);
                OTPreenregistrement.setIntCUSTPART(result);

            } else {
                result = OTPreenregistrement.getIntPRICE();
            }
            isAvoir = this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT());
            OTPreenregistrement.setBISAVOIR(isAvoir);
            this.persiste(OTPreenregistrement);
            new logger().OCategory.info("result:" + result);
            this.buildSuccesTraceMessage("Opréation effectuée avec succe");
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                this.showNetPaid(String.valueOf(result));
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
        }
        return result;
    }

    public void showNetPaid(String str_net_paid) {
        String netpaid = "NET A PAYER: ";
        // try {
        // DisplayerManager ODisplayerManager = new DisplayerManager();
        // ODisplayerManager.DisplayData(DataStringManager.subStringData(netpaid, 0, 20));
        // ODisplayerManager.DisplayData(DataStringManager.subStringData(str_net_paid, 0, 20), "begin");
        // ODisplayerManager.close();
        // this.buildSuccesTraceMessage("Opération effectuée avec succès");
        // } catch (Exception e) {
        // e.printStackTrace();
        // this.buildErrorTraceMessage("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
        // }
    }
    // fin afficher le net a payer

    public void reinitializeDisplay(String first_text, String second_text) {
        TParameters OTParameters = null;
        try {
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                Afficheur afficheur = Afficheur.getInstance();
                afficheur.affichage(DataStringManager.subStringData(first_text, 0, 20));
                afficheur.affichage(DataStringManager.subStringData(second_text, 0, 20));
                this.buildSuccesTraceMessage("Opération effectuée avec succès");
            } else {
                this.buildErrorTraceMessage(
                        "Désolé. Cette caisse n'a pas activé l'affichage des données sur un aficheur");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
    }

    // code ajouté 03/08/2016
    // liste des ventes presentes dans la corbeille
    public List<TPreenregistrement> getListeTPreenregistrement(String search_value, String lg_PREENREGISTREMENT_ID,
            String str_STATUT, String lg_USER_ID, Date dt_Date_Debut, Date dt_Date_Fin, String str_TYPE_VENTE,
            int start, int limit) {
        List<TPreenregistrement> lst = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t, TPreenregistrementDetail tp WHERE t.lgNATUREVENTEID.lgNATUREVENTEID NOT LIKE ?9 AND t.lgPREENREGISTREMENTID = tp.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID AND t.lgPREENREGISTREMENTID LIKE ?1 AND (t.strREF LIKE ?2 OR tp.lgFAMILLEID.strDESCRIPTION LIKE ?2 OR tp.lgFAMILLEID.intCIP LIKE ?2 OR tp.lgFAMILLEID.intEAN13 LIKE ?2) AND t.strSTATUT LIKE ?3 AND t.lgUSERID.lgUSERID LIKE ?4 AND t.dtUPDATED > ?5 AND t.dtUPDATED <= ?6 AND t.strTYPEVENTE LIKE ?7 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY tp.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID ORDER BY t.dtUPDATED ASC")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, str_STATUT).setParameter(4, lg_USER_ID).setParameter(5, dt_Date_Debut)
                    .setParameter(6, dt_Date_Fin).setParameter(7, str_TYPE_VENTE).setParameter(8, lg_EMPLACEMENT_ID)
                    .setParameter(9, Parameter.KEY_NATURE_VENTE_DEPOT).setFirstResult(start).setMaxResults(limit)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;

    }
    // fin liste des ventes presentes dans la corbeille

    // envoi d'une vente dans la corbeille
    public TPreenregistrement DeleteTPreenregistrement(String lg_PREENREGISTREMENT_ID, String str_STATUT) {
        TPreenregistrement OTPreenregistrement = null;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        Date now = new Date();
        try {
            OTPreenregistrement = this.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de l'opération, référence de vente inexistante");
                return null;
            }
            lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                OTPreenregistrementDetail.setStrSTATUT(str_STATUT);
                OTPreenregistrementDetail.setDtUPDATED(now);
                this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
            }
            OTPreenregistrement.setStrSTATUT(str_STATUT);
            if (this.persiste(OTPreenregistrement)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de l'opération. Veuillez réeassayer svp!");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération. Veuillez contacter l'administrateur svp!");
        }
        return OTPreenregistrement;
    }

    public boolean RestaureAllPrevente(String lg_PREENREGISTREMENT_ID, String str_STATUT, String str_TYPE_VENTE) {
        Date ODate = new Date();
        String OdateFin = date.DateToString(ODate, date.formatterMysqlShort2);
        Date dt_Date_Debut = date.getDate(OdateFin, "00:00");
        Date dt_Date_Fin = date.getDate(OdateFin, "23:59");
        List<TPreenregistrement> lstTPreenregistrement = new ArrayList<TPreenregistrement>();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
        Date now = new Date();
        boolean result = false;
        try {
            if (lg_PREENREGISTREMENT_ID.equals("")) {
                lg_PREENREGISTREMENT_ID = "%%";
            }
            lstTPreenregistrement = this.getListeTPreenregistrement("", lg_PREENREGISTREMENT_ID, "is_Trash",
                    this.getOTUser().getLgUSERID(), dt_Date_Debut, dt_Date_Fin, str_TYPE_VENTE);

            if (lstTPreenregistrement.size() > 0) {
                this.getOdataManager().BeginTransaction();
                for (TPreenregistrement OTPreenregistrement : lstTPreenregistrement) {
                    lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                    for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                        OTPreenregistrementDetail.setStrSTATUT(str_STATUT);
                        OTPreenregistrementDetail.setDtUPDATED(now);
                        this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
                    }
                    OTPreenregistrement.setStrSTATUT(str_STATUT);
                    this.getOdataManager().getEm().merge(OTPreenregistrement);
                }
                this.getOdataManager().CloseTransaction();
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildSuccesTraceMessage("Désolé, la corbeille est vide");
            }

            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de la restauration. Veuillez contacter l'administrateur svp!");
        }
        return result;
    }
    // fin envoi d'une vente dans la corbeille

    // fin code ajouté 03/08/2016
    // Reinitialisation des valeurs de ventes
    public void initPreenregistrement() {
        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
        Date dt_BEGIN = date.getFirstDayofSomeMonth(-7), dt_END = new Date();
        String OdateDebut = "", OdateFin = "";
        TPreenregistrement OTPreenregistrement = null;
        try {
            OdateDebut = date.DateToString(dt_BEGIN, date.formatterMysqlShort2);
            OdateFin = date.DateToString(dt_END, date.formatterMysqlShort2);
            lstTPreenregistrement = this.listTPreenregistrement("", "%%", OdateDebut, OdateFin, "00:00", "23:59", "%%");
            this.getOdataManager().BeginTransaction();
            for (int i = 0; i < lstTPreenregistrement.size(); i++) {
                OTPreenregistrement = this.FindPreenregistrement(lstTPreenregistrement.get(i).getStr_value1());
                lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                        lstTPreenregistrement.get(i).getStr_value1(), "%%", commonparameter.statut_is_Closed);
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                    OTPreenregistrementDetail.setIntPRICEOTHER(OTPreenregistrementDetail.getIntPRICE());
                    this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
                }
                OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
                this.getOdataManager().getEm().merge(OTPreenregistrement);
            }
            this.getOdataManager().CloseTransaction();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    // fin reinitialisation des valeurs de ventes

    // liste des vendeurs et caissier ayant intervenue dans les ventes sur une periode
    public List<EntityData> listTPreenregistrement(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE,
            String lg_USER_SEARCH_ID, String str_TYPE, int start, int limit) {
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "",
                lg_USER_VENDEUR_ID = lg_USER_SEARCH_ID, lg_USER_CAISSIER_ID = lg_USER_SEARCH_ID;
        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = null;
        String query = " AND (t.lg_USER_VENDEUR_ID LIKE '" + lg_USER_VENDEUR_ID + "' OR t.lg_USER_CAISSIER_ID LIKE '"
                + lg_USER_CAISSIER_ID + "')";
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            if (str_TYPE.equalsIgnoreCase(Parameter.VENDEUR)) {
                lg_USER_VENDEUR_ID = lg_USER_SEARCH_ID;
                lg_USER_CAISSIER_ID = "%%";
                query = " AND t.lg_USER_VENDEUR_ID LIKE '" + lg_USER_VENDEUR_ID + "' AND t.lg_USER_CAISSIER_ID LIKE '"
                        + lg_USER_CAISSIER_ID + "'";
            } else if (str_TYPE.equalsIgnoreCase(Parameter.CAISSIER)) {
                lg_USER_CAISSIER_ID = lg_USER_SEARCH_ID;
                lg_USER_VENDEUR_ID = "%%";
                query = " AND t.lg_USER_VENDEUR_ID LIKE '" + lg_USER_VENDEUR_ID + "' AND t.lg_USER_CAISSIER_ID LIKE '"
                        + lg_USER_CAISSIER_ID + "'";
            }
            String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                    + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                    + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '"
                    + search_value + "%' OR f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENGISTREMENT_ID
                    + "' AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut + "' and DATE(t.dt_UPDATED) <= '" + dt_Date_Fin
                    + "')  AND (TIME(t.dt_UPDATED) >= '" + h_debut + "' and TIME(t.dt_UPDATED) <= '" + h_fin
                    + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed + "'" + query
                    + " GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC LIMIT " + start + "," + limit;

            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                new logger().OCategory
                        .info("Date " + this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
                // OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE")); // a decommenter en cas
                // de probleme. 15/08/2016
                OEntityData.setStr_value5(OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && Ojconnexion.get_resultat().getString("int_PRICE_OTHER") != null
                                ? Ojconnexion.get_resultat().getString("int_PRICE_OTHER")
                                : Ojconnexion.get_resultat().getString("int_PRICE")); // code ajouté 15/08/2016
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("dt_DATE_BRUT"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("h_HEURE_BRUT"));
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("lg_TYPE_VENTE_ID"));
                lstTPreenregistrement.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    public List<EntityData> listTPreenregistrement(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE,
            String lg_USER_SEARCH_ID, String str_TYPE) {
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "",
                lg_USER_VENDEUR_ID = lg_USER_SEARCH_ID, lg_USER_CAISSIER_ID = lg_USER_SEARCH_ID;
        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = null;
        String query = " AND (t.lg_USER_VENDEUR_ID LIKE '" + lg_USER_VENDEUR_ID + "' OR t.lg_USER_CAISSIER_ID LIKE '"
                + lg_USER_CAISSIER_ID + "')";
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            if (str_TYPE.equalsIgnoreCase(Parameter.VENDEUR)) {
                lg_USER_VENDEUR_ID = lg_USER_SEARCH_ID;
                lg_USER_CAISSIER_ID = "%%";
                query = " AND t.lg_USER_VENDEUR_ID LIKE '" + lg_USER_VENDEUR_ID + "' AND t.lg_USER_CAISSIER_ID LIKE '"
                        + lg_USER_CAISSIER_ID + "'";
            } else if (str_TYPE.equalsIgnoreCase(Parameter.CAISSIER)) {
                lg_USER_CAISSIER_ID = lg_USER_SEARCH_ID;
                lg_USER_VENDEUR_ID = "%%";
                query = " AND t.lg_USER_VENDEUR_ID LIKE '" + lg_USER_VENDEUR_ID + "' AND t.lg_USER_CAISSIER_ID LIKE '"
                        + lg_USER_CAISSIER_ID + "'";
            }
            String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                    + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                    + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '"
                    + search_value + "%' OR f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENGISTREMENT_ID
                    + "' AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut + "' and DATE(t.dt_UPDATED) <= '" + dt_Date_Fin
                    + "')  AND (TIME(t.dt_UPDATED) >= '" + h_debut + "' and TIME(t.dt_UPDATED) <= '" + h_fin
                    + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed + "'" + query
                    + " GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC";

            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                new logger().OCategory
                        .info("Date " + this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
                // OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE")); // a decommenter en cas
                // de probleme. 15/08/2016
                OEntityData.setStr_value5(OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && Ojconnexion.get_resultat().getString("int_PRICE_OTHER") != null
                                ? Ojconnexion.get_resultat().getString("int_PRICE_OTHER")
                                : Ojconnexion.get_resultat().getString("int_PRICE")); // code ajouté 15/08/2016
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("dt_DATE_BRUT"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("h_HEURE_BRUT"));
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("lg_TYPE_VENTE_ID"));
                lstTPreenregistrement.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }
    // fin liste des vendeurs et caissier ayant intervenue dans les ventes sur une periode

    // liste des articles vendus groupé par produit
    public int getListeArticleVenduGroupCount(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String lg_USER_ID, String str_TYPE_TRANSACTION, int int_NUMBER) {
        List<EntityData> Lst = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_TYPE_STOCK_ID = "", lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        int count = 0;
        int _count = 0;
        try {
            lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.TYPE_STOCK_RAYON) ? commonparameter.TYPE_STOCK_RAYON
                            : commonparameter.TYPE_STOCK_DEPOT);
            if (search_value.equals("")) {
                search_value = "%%";
            }
            String dateCriteria = "AND p.dt_UPDATED >= '" + OdateDebut + " " + h_debut + "' AND p.dt_UPDATED <= '"
                    + OdateFin + " " + h_fin + "' ";
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
            // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
            // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f,
            // t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE
            // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
            // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
            // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0 and
            // p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND DATE(p.dt_UPDATED) >= '" +
            // OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND (TIME(p.dt_UPDATED) >= '" + h_debut + "'
            // and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND
            // (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION
            // LIKE '" + search_value + "%' OR p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" +
            // search_value + "%') AND p.lg_USER_ID LIKE '" + lg_USER_ID + "' GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID
            // ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
            String qry = " SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                    + "'" + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '" + search_value
                    + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";

            if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {

                qry = "SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB  FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER < " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND DATE(p.dt_UPDATED)
                // >= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND (TIME(p.dt_UPDATED) >= '" +
                // h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND tsf.lg_EMPLACEMENT_ID LIKE '" +
                // lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" +
                // search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '" +
                // search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '" +
                // lg_USER_ID + "' AND tsf.int_NUMBER < " + int_NUMBER + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER
                // BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER = " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB  FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER = " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";

            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER > " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB  FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER > " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER <= " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER <= " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER >= " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER >= " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.SEUIL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER >= " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT COUNT(tsf.lg_TYPE_STOCK_FAMILLE_ID) AS NB FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER <= f.int_SEUIL_MIN GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ";
            }

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();

            while (Ojconnexion.get_resultat().next()) {
                count = Ojconnexion.get_resultat().getInt("NB");
                _count++;
            }
            Ojconnexion.CloseConnexion();
            System.out.println("_count " + _count + " count " + count);
        } catch (Exception ex) {
            ex.printStackTrace();
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + Lst.size());
        return _count;
    }

    public List<EntityData> getListeArticleVendu00Group(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String lg_USER_ID, String str_TYPE_TRANSACTION, int int_NUMBER, int start,
            int limit) {
        List<EntityData> Lst = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_TYPE_STOCK_ID = "", lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.TYPE_STOCK_RAYON) ? commonparameter.TYPE_STOCK_RAYON
                            : commonparameter.TYPE_STOCK_DEPOT);
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) { lg_EMPLACEMENT_ID =
             * "%%"; } else { lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(); }
             */
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String dateCriteria = "AND p.dt_UPDATED >= '" + OdateDebut + " " + h_debut + "' AND p.dt_UPDATED <= '"
                    + OdateFin + " " + h_fin + "' ";
            // String qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
            // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
            // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f,
            // t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE
            // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
            // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
            // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0 and
            // p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND DATE(p.dt_UPDATED) >= '" +
            // OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND (TIME(p.dt_UPDATED) >= '" + h_debut + "'
            // and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND
            // (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION
            // LIKE '" + search_value + "%' OR p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" +
            // search_value + "%') AND p.lg_USER_ID LIKE '" + lg_USER_ID + "' GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID
            // ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
            String qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID
                    + "'" + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '" + search_value
                    + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY  f.str_DESCRIPTION LIMIT " + start + ","
                    + limit;

            if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {

                qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER < " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY  f.str_DESCRIPTION LIMIT " + start + ","
                        + limit;
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g, t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND DATE(p.dt_UPDATED)
                // >= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND (TIME(p.dt_UPDATED) >= '" +
                // h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND tsf.lg_EMPLACEMENT_ID LIKE '" +
                // lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" +
                // search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '" +
                // search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '" +
                // lg_USER_ID + "' AND tsf.int_NUMBER < " + int_NUMBER + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER
                // BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER = " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER = " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID  ORDER BY  f.str_DESCRIPTION LIMIT " + start + ","
                        + limit;

            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER > " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER > " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY  f.str_DESCRIPTION LIMIT " + start + ","
                        + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER <= " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER <= " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY  f.str_DESCRIPTION LIMIT " + start + ","
                        + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER >= " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND tsf.int_NUMBER >= " + int_NUMBER
                        + " GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY  f.str_DESCRIPTION LIMIT " + start + ","
                        + limit;
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.SEUIL)) {
                // qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID,
                // f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY,
                // SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille
                // f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE
                // z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID =
                // t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID =
                // f.lg_GROSSISTE_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND p.int_PRICE >= 0
                // and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '" + lg_TYPE_STOCK_ID + "' AND
                // DATE(p.dt_UPDATED)>= '" + OdateDebut + "' AND DATE(p.dt_UPDATED)<= '" + OdateFin + "' AND
                // (TIME(p.dt_UPDATED) >= '" + h_debut + "' and TIME(p.dt_UPDATED) <= '" + h_fin + "') AND
                // tsf.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR
                // f.int_EAN13 LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR
                // p.str_REF LIKE '" + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND
                // p.lg_USER_ID LIKE '" + lg_USER_ID + "' AND tsf.int_NUMBER >= " + int_NUMBER + " GROUP BY
                // tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY g.str_LIBELLE, f.str_DESCRIPTION LIMIT " + start + "," + limit;
                qry = "SELECT z.str_LIBELLEE AS str_LIBELLEE_EMP, z.str_CODE, f.lg_FAMILLE_ID, g.lg_GROSSISTE_ID, f.int_CIP, f.str_DESCRIPTION, SUM(t.int_AVOIR) AS int_AVOIR, SUM(t.int_QUANTITY) AS int_QUANTITY, SUM(t.int_PRICE) AS int_PRICE, tsf.int_NUMBER, g.str_LIBELLE FROM t_type_stock_famille tsf, t_famille f, t_preenregistrement_detail t, t_preenregistrement p, t_grossiste g , t_zone_geographique z WHERE z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID AND tsf.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = t.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID AND p.str_STATUT = '"
                        + commonparameter.statut_is_Closed
                        + "' AND p.int_PRICE >= 0 and p.`b_IS_CANCEL` = 0 AND tsf.lg_TYPE_STOCK_ID = '"
                        + lg_TYPE_STOCK_ID + "' " + dateCriteria + " AND tsf.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '"
                        + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR p.str_REF LIKE '"
                        + search_value + "' OR p.str_REF_TICKET LIKE '" + search_value + "%') AND p.lg_USER_ID LIKE '"
                        + lg_USER_ID
                        + "' AND tsf.int_NUMBER <= f.int_SEUIL_MIN  GROUP BY tsf.lg_TYPE_STOCK_FAMILLE_ID ORDER BY  f.str_DESCRIPTION LIMIT "
                        + start + "," + limit;
            }

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("int_QUANTITY"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_NUMBER"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("lg_GROSSISTE_ID"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("str_LIBELLE"));
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("str_LIBELLEE_EMP"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("str_CODE"));
                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + Lst.size());
        return Lst;
    }
    // fin liste des articles vendus groupé par produit

    // changemente de remise sur une vente
    public boolean updateRemiseByVente(String lg_PREENREGISTREMENT_ID, String lg_REMISE_ID) {
        boolean result = false;
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de mise à jour de la remise. Référence de vente inexistante");
                return result;
            }
            OTPreenregistrement.setLgREMISEID(lg_REMISE_ID);
            if (this.persiste(OTPreenregistrement)) {
                this.buildSuccesTraceMessage("Remise mise à jour avec succès");
                result = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la remise");
        }
        return result;
    }
    // fin changemente de remise sur une vente

    /* nouvelle implémentation de la vente 03/10/2016 */
    public TNatureVente getTNatureVente(String lg_NATURE_VENTE_ID) {
        TNatureVente OTNatureVente = null;
        try {
            OTNatureVente = (TNatureVente) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TNatureVente t WHERE t.lgNATUREVENTEID LIKE ?1 OR t.strLIBELLE LIKE ?1")
                    .setParameter(1, lg_NATURE_VENTE_ID).getSingleResult();
        } catch (Exception e) {
        }
        return OTNatureVente;
    }

    private TUser getUserById(String lg_USER_ID) {
        TUser OTUser = null;
        try {
            OTUser = (TUser) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TUser t WHERE t.lgUSERID LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1")
                    .setParameter(1, lg_USER_ID).getSingleResult();
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTUser;

    }

    public boolean createPreenregistrementDetail(TPreenregistrement OTPreenregistrement, TFamilleStock OTFamilleStock,
            int int_QUANTITY, int int_QUANTITY_SERVED, int int_FREE_PACK_NUMBER) {
        boolean result = false;

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        int int_PRICE_OLD = 0;
        TParameters OTParameters = null;
        try {

            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement du produit sur la vente");
                return result;
            }

            OTPreenregistrementDetail = this.findFamilleInTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
            if (OTPreenregistrementDetail == null) {
                OTPreenregistrementDetail = this.createTPreenregistrementDetail(OTPreenregistrement,
                        OTFamilleStock.getLgFAMILLEID(), new Date());
            }
            int_PRICE_OLD = OTPreenregistrementDetail.getIntPRICE();
            OTPreenregistrementDetail
                    .setIntFREEPACKNUMBER(OTPreenregistrementDetail.getIntFREEPACKNUMBER() + int_FREE_PACK_NUMBER);
            OTPreenregistrementDetail.setIntQUANTITY(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_QUANTITY);
            OTPreenregistrementDetail
                    .setIntQUANTITYSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_QUANTITY_SERVED);
            OTPreenregistrementDetail.setIntPRICE(this.GetTotalDetail(OTPreenregistrementDetail.getIntPRICEUNITAIR(),
                    OTPreenregistrementDetail.getIntQUANTITYSERVED()));
            OTPreenregistrementDetail.setIntAVOIR(
                    OTPreenregistrementDetail.getIntQUANTITY() - OTPreenregistrementDetail.getIntQUANTITYSERVED());
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            this.persiste(OTPreenregistrementDetail);
            OTPreenregistrement.setIntPRICE(
                    OTPreenregistrement.getIntPRICE() + (OTPreenregistrementDetail.getIntPRICE() - int_PRICE_OLD));
            /*
             * this.getOdataManager().BeginTransaction();
             * this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
             * this.getOdataManager().getEm().merge(OTPreenregistrement); this.getOdataManager().CloseTransaction();
             */

            this.persiste(OTPreenregistrement);
            this.buildSuccesTraceMessage("Produit ajouté avec succès à la vente avec succès");
            result = true;
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                try {
                    // DisplayerManager ODisplayerManager = new DisplayerManager();
                    // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
                    // 0, 20));
                    // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
                    // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
                    // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
                    // ODisplayerManager.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec d'ajout du produit à la vente. Veuillez contacter votre administrateur svp!");
        }
        return result;
    }

    public TPreenregistrementDetail createTPreenregistrementDetail(TPreenregistrement OTPreenregistrement,
            TFamille OTFamille, Date dt_CREATED) {
        TPreenregistrementDetail OTPreenregistrementDetail = null;
        int int_PRICE = 0;
        try {
            int_PRICE = OTFamille.getIntPRICE();

            OTPreenregistrementDetail = new TPreenregistrementDetail();
            OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
            OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
            OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
            OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
            if (OTFamille.getBlPROMOTED() == true) {
                TPromotionProduct OTPromotionProduct = this.getPromotionProduct(OTFamille.getLgFAMILLEID());
                if (OTPromotionProduct != null && ((OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE()
                        .equalsIgnoreCase("REMISE")
                        || OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equalsIgnoreCase("PRIX SPECIAL"))
                        && (OTPromotionProduct.getLgCODEPROMOTIONID().getDtENDDATE()
                                .getTime() > (new Date().getTime())))) {
                    int_PRICE = OTPromotionProduct.getDbPRICE().intValue();
                }
            }
            OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE);
            OTPreenregistrementDetail.setIntPRICE(0);
            OTPreenregistrementDetail.setIntFREEPACKNUMBER(0);
            OTPreenregistrementDetail.setIntQUANTITY(0);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(0);
            OTPreenregistrementDetail.setIntAVOIR(0);
            this.getOdataManager().getEm().persist(OTPreenregistrementDetail);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTPreenregistrementDetail;
    }

    /*
     * public TPreenregistrement updateTPreenregistrementDetail(String lg_PREENREGISTREMENT_DETAIL_ID, int
     * int_PRICE_UNITAIR, int int_QUANTITY, int int_QUANTITY_SERVED) { TPreenregistrementDetail
     * OTPreenregistrementDetail = null; TPreenregistrement OTPreenregistrement = null; TParameters OTParameters = null;
     * int int_PRICE_OLD = 0, int_QUANTITY_SERVED_OLD = 0, int_AVOIR_SERVED = 0; try { OTPreenregistrementDetail =
     * this.getOdataManager().getEm().find(TPreenregistrementDetail.class, lg_PREENREGISTREMENT_DETAIL_ID); if
     * (OTPreenregistrementDetail == null) {
     * this.buildErrorTraceMessage("Echec de mise à jour du produit. Produit inexistant sur la vente"); return null; }
     * OTPreenregistrement = OTPreenregistrementDetail.getLgPREENREGISTREMENTID(); int_PRICE_OLD =
     * OTPreenregistrementDetail.getIntPRICE(); if (this.checkpricevente(OTPreenregistrementDetail.getLgFAMILLEID(),
     * int_PRICE_UNITAIR)) { return null; } int_QUANTITY_SERVED_OLD = OTPreenregistrementDetail.getIntQUANTITYSERVED();
     * if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getBISAVOIR() && int_QUANTITY_SERVED_OLD >
     * int_QUANTITY_SERVED) { this.buildErrorTraceMessage("QS ne doit pas être superieur à QD de l'avoir"); return null;
     * }
     *
     * if (OTPreenregistrementDetail.getIntPRICEUNITAIR() != int_PRICE_UNITAIR) {
     * this.checkpriceForSendSMS(OTPreenregistrementDetail.getLgFAMILLEID(),
     * OTPreenregistrementDetail.getLgFAMILLEID().getIntPRICE(), int_PRICE_UNITAIR,
     * OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrREF());
     * OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_UNITAIR); }
     * OTPreenregistrementDetail.setIntPRICE(this.GetTotalDetail(int_PRICE_UNITAIR, int_QUANTITY));
     * OTPreenregistrementDetail.setIntQUANTITY(int_QUANTITY);
     * OTPreenregistrementDetail.setIntQUANTITYSERVED(int_QUANTITY_SERVED);
     *
     * int_AVOIR_SERVED = (int_QUANTITY_SERVED - int_QUANTITY_SERVED_OLD) +
     * OTPreenregistrementDetail.getIntAVOIRSERVED(); // a decommenter en cas de probleme if (int_QUANTITY_SERVED !=
     * int_QUANTITY_SERVED_OLD) { OTPreenregistrementDetail.setIntAVOIRSERVED(int_AVOIR_SERVED < 0 ?
     * int_QUANTITY_SERVED_OLD : int_AVOIR_SERVED); }
     * OTPreenregistrementDetail.setIntAVOIR(OTPreenregistrementDetail.getIntQUANTITY() -
     * OTPreenregistrementDetail.getIntQUANTITYSERVED()); if (OTPreenregistrementDetail.getIntAVOIR() > 0) { if
     * (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT().equalsIgnoreCase(commonparameter.
     * statut_is_Process)) { OTPreenregistrementDetail.setBISAVOIR(true); } } else if
     * (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT().equalsIgnoreCase(commonparameter.
     * statut_is_Process)) { OTPreenregistrementDetail.setBISAVOIR(false); } OTPreenregistrementDetail.setDtUPDATED(new
     * Date()); OTPreenregistrement.setIntPRICE(OTPreenregistrement.getIntPRICE() +
     * (OTPreenregistrementDetail.getIntPRICE() - int_PRICE_OLD)); OTPreenregistrement.setDtUPDATED(new Date());
     * this.getOdataManager().BeginTransaction(); this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
     * this.getOdataManager().getEm().merge(OTPreenregistrement); this.getOdataManager().CloseTransaction();
     * this.buildSuccesTraceMessage("Produit mise à jour avec succès à la vente avec succès"); OTParameters =
     * this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER); if (OTParameters !=
     * null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) { try { DisplayerManager ODisplayerManager = new
     * DisplayerManager();
     * ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().
     * getStrDESCRIPTION().toUpperCase(), 0, 20));
     * ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY() + "*" +
     * conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
     * conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
     * ODisplayerManager.close(); } catch (Exception e) { e.printStackTrace(); } } } catch (Exception e) {
     * e.printStackTrace(); } return OTPreenregistrement; }
     */
    private TPromotionProduct getPromotionProduct(String lg_FAMILLE_ID) {
        TPromotionProduct OTPromotionProduct = null;
        try {
            OTPromotionProduct = (TPromotionProduct) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TPromotionProduct t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1")
                    .setParameter(1, lg_FAMILLE_ID).getSingleResult();
        } catch (Exception e) {
        }
        return OTPromotionProduct;
    }

    // verification du prix de vente par rapport au pourcentage
    private boolean checkpricevente(TFamille OTFamille, int int_PRICE) {
        boolean result = false;
        try {
            TParameters OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(commonparameter.KEY_MAX_PRICE_POURCENT_VENTE);
            int int_PRICE_COEF = (OTFamille.getIntPRICE() * Integer.parseInt(OTParameters.getStrVALUE())) / 100;
            if ((!((OTFamille.getIntPRICE() - int_PRICE_COEF) <= int_PRICE))
                    || (!(int_PRICE <= (OTFamille.getIntPRICE() + int_PRICE_COEF)))) {
                this.buildErrorTraceMessage("Impossible. Vérifiez le montant à modifier du prix de vente");
                result = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de vérification du prix de vente");
        }
        return result;
    }

    // fin verification du prix de vente par rapport au pourcentage
    /* fin nouvelle implémentation de la vente 03/10/2016 */
    // save cash of purchase
    public boolean saveCashOfPurchase(TTypeVente OTTypeVente, TPreenregistrement OTPreenregistrement,
            TReglement OTReglement, int int_PART_CLIENT, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            String lg_TYPE_REGLEMENT_ID, TCompteClient OTCompteClient, String lg_MOTIF_REGLEMENT_ID,
            int int_PART_TIERSPAYANT, int int_TAUX) {
        boolean result = false;
        TTypeMvtCaisse OTTypeMvtCaisse = null;
        TRecettes OTRecettes = null;
        int int_amount_differe = 0;
        String Description = "";
        try {
            Description = "ENC. Vente " + OTPreenregistrement.getStrREF();
            if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_AVEC_CARNET)
                    || OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_ASSURANCE)) {
                caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
                if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) {
                    if (int_AMOUNT_RECU >= 0) {
                        int_amount_differe = int_PART_CLIENT - int_AMOUNT_RECU;
                        if (int_amount_differe >= 0) {
                            if (int_AMOUNT_RECU == 0) {
                                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(
                                        Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES, this.getOdataManager());
                                OTRecettes = OcaisseManagement.AddRecette(new Double(int_AMOUNT_RECU) * (-1),
                                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS,
                                        int_AMOUNT_RECU, OTPreenregistrement.getLgPREENREGISTREMENTID(),
                                        lg_TYPE_REGLEMENT_ID, Parameter.KEY_VENTE_ORDONNANCE, Parameter.KEY_TASK_VENTE,
                                        OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                        lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                        commonparameter.TRANSACTION_CREDIT, true);
                                if (OTRecettes == null) {
                                    this.buildErrorTraceMessage("Impossible de cloture la vente",
                                            "la recette du differe n'a pas pu etre MAJ");
                                    return false;
                                }
                            }
                            new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(
                                    OTCompteClient, OTPreenregistrement, int_AMOUNT_RECU, int_amount_differe);
                        }

                        OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                                this.getOdataManager());
                        if (int_AMOUNT_RECU > 0) {
                            OcaisseManagement.AddRecette(new Double(int_AMOUNT_RECU + ""),
                                    Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                    Parameter.KEY_VENTE_ORDONNANCE, Parameter.KEY_TASK_VENTE,
                                    OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                    lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                    commonparameter.TRANSACTION_CREDIT, true);
                        }
                        OcaisseManagement.AddRecette(new Double(String.valueOf(int_PART_TIERSPAYANT)) * (-1),
                                Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                Parameter.KEY_VENTE_ORDONNANCE, Parameter.KEY_TASK_VENTE,
                                OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, false);
                    }
                    OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_differe);//

                } else {
                    OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                            this.getOdataManager());
                    if (int_PART_CLIENT >= 0) {

                        if (int_PART_CLIENT > 0) {
                            OTRecettes = OcaisseManagement.AddRecette(new Double(String.valueOf(int_PART_CLIENT)),
                                    Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                    Parameter.KEY_VENTE_ORDONNANCE, Parameter.KEY_TASK_VENTE,
                                    OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                    lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                    commonparameter.TRANSACTION_CREDIT, true);
                            if (OTRecettes == null) {
                                this.buildErrorTraceMessage(
                                        "Impossible de cloture la vente. La recette n'a pas pu etre mise à jour");
                                return false;
                            }
                        }

                        OcaisseManagement.AddRecette(new Double(String.valueOf(int_PART_TIERSPAYANT)) * (-1),
                                Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                Parameter.KEY_VENTE_ORDONNANCE, Parameter.KEY_TASK_VENTE,
                                OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, true);

                    } else {
                        // OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);

                        OTRecettes = OcaisseManagement.AddRecette(
                                new Double(String.valueOf(int_PART_TIERSPAYANT)) * (-1),
                                Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                Parameter.KEY_VENTE_ORDONNANCE, Parameter.KEY_TASK_VENTE,
                                OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, true);
                        if (OTRecettes == null) {
                            this.buildErrorTraceMessage("Impossible de cloture la vente",
                                    "la recette du differe n'a pas pu etre MAJ");
                            return false;
                        }
                    }
                    OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);
                }
                this.getOdataManager().getEm().merge(OTPreenregistrement);
                result = true;
            } else {
                result = this.saveCashOfPurchaseComptant(OTTypeVente, OTPreenregistrement, OTReglement, int_AMOUNT_RECU,
                        int_AMOUNT_REMIS, lg_TYPE_REGLEMENT_ID, OTCompteClient, lg_MOTIF_REGLEMENT_ID, Description);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean saveCashOfPurchaseComptant(TTypeVente OTTypeVente, TPreenregistrement OTPreenregistrement,
            TReglement OTReglement, Integer int_AMOUNT_RECU, Integer int_AMOUNT_REMIS, String lg_TYPE_REGLEMENT_ID,
            TCompteClient OTCompteClient, String lg_MOTIF_REGLEMENT_ID, String Description) {
        boolean result = false;
        String str_STATUTVENTE = commonparameter.statut_nondiffere;
        TRecettes OTRecettes = null;
        TTypeMvtCaisse OTTypeMvtCaisse = null;
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        try {
            if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) {
                str_STATUTVENTE = commonparameter.statut_differe;
                if (OTCompteClient == null) {
                    this.buildErrorTraceMessage("Pas de compte client associé a ce différé");
                    return false;
                }
                OTPreenregistrement.setStrFIRSTNAMECUSTOMER(OTCompteClient.getLgCLIENTID().getStrFIRSTNAME());
                OTPreenregistrement.setStrLASTNAMECUSTOMER(OTCompteClient.getLgCLIENTID().getStrLASTNAME());
                OTPreenregistrement.setStrPHONECUSTOME(OTCompteClient.getLgCLIENTID().getStrADRESSE());
                if (int_AMOUNT_RECU >= 0) {
                    Integer int_amount_differe = ((OTPreenregistrement.getIntPRICE()
                            - OTPreenregistrement.getIntPRICEREMISE()) - int_AMOUNT_RECU);
                    if (int_amount_differe >= 0) {
                        OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES,
                                this.getOdataManager());
                        OTRecettes = OcaisseManagement.AddRecette(
                                new Double(String.valueOf(int_AMOUNT_RECU > 0 ? int_amount_differe : 0)) * (-1),
                                Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                Parameter.KEY_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_VENTE,
                                OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, true);
                        if (OTRecettes == null) {
                            this.buildErrorTraceMessage(
                                    "Impossible de cloture la vente. La recette du différé n'a pas pu etre mise à jour");
                            return result;
                        }
                        new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(OTCompteClient,
                                OTPreenregistrement, int_AMOUNT_RECU, int_amount_differe);
                    }
                    if (int_AMOUNT_RECU > 0) {
                        OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(
                                Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE, this.getOdataManager()); // a decommenter
                                                                                                        // en cas de
                                                                                                        // probleme.
                                                                                                        // 18/05/2016
                        OcaisseManagement.AddRecette(new Double(String.valueOf(int_AMOUNT_RECU)),
                                Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                                Parameter.KEY_VENTE_NON_ORDONNANCEE, Parameter.KEY_TASK_VENTE,
                                OTReglement.getLgREGLEMENTID(), OTCompteClient.getLgCOMPTECLIENTID(),
                                lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, true);
                    }
                }
            } else {
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                        this.getOdataManager()); // a decommenter en cas de probleme. 18/05/2016
                OTRecettes = OcaisseManagement.AddRecette(
                        new Double(String
                                .valueOf(OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE())),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID,
                        Parameter.KEY_VENTE_NON_ORDONNANCEE, bll.common.Parameter.KEY_TASK_VENTE,
                        OTReglement.getLgREGLEMENTID(), "", lg_MOTIF_REGLEMENT_ID,
                        OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);
                if (OTRecettes == null) {
                    this.buildErrorTraceMessage(
                            "Impossible de cloture la vente. La recette du differe n'a pas pu etre mise à jour");
                    return result;
                }
            }
            OTPreenregistrement.setStrSTATUTVENTE(str_STATUTVENTE);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // end save cash of purchase

    // liste des produits d'une vente
    public List<TPreenregistrementDetail> getListeTPreenregistrementDetail(String search_value,
            String lgPREENREGISTREMENTID, String strSTATUT) {
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        try {
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 AND (t.lgFAMILLEID.intCIP LIKE ?5 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?5 OR t.lgFAMILLEID.intEAN13 LIKE ?5) ")
                    .setParameter(3, strSTATUT).setParameter(4, lgPREENREGISTREMENTID)
                    .setParameter(5, search_value + "%").getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTPreenregistrementDetail;
    }

    public List<TPreenregistrementDetail> getListeTPreenregistrementDetail(String search_value,
            String lgPREENREGISTREMENTID, String strSTATUT, int start, int limit) {
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();
        try {
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.strSTATUT LIKE ?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?4 AND (t.lgFAMILLEID.intCIP LIKE ?5 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?5 OR t.lgFAMILLEID.intEAN13 LIKE ?5) ")
                    .setParameter(3, strSTATUT).setParameter(4, lgPREENREGISTREMENTID)
                    .setParameter(5, search_value + "%").setFirstResult(start).setMaxResults(limit).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTPreenregistrementDetail;
    }
    // fin liste des produits d'une vente

    // code ajoute pour la modification de la balance agee 08/11/2016
    // fonction pour recuperer les ventes non facturees depuis 6 mois
    public JSONObject getPreviousHalfYearBalance() {
        JSONObject json = new JSONObject();

        try {
            List<Object[]> list = this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intPRICERESTE) AS MONTANT,COUNT(o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID) AS NOMBRE FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.bISCANCEL = FALSE AND o.lgPREENREGISTREMENTID.intPRICE>0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'  AND o.dtCREATED <=?1 AND o.strSTATUTFACTURE = 'unpaid'  AND o.strSTATUT = 'is_Closed' AND o.intPRICERESTE >0 AND o.intPRICE >0 ")
                    .setParameter(1, date.getPreviousHalfYearIncludeCurrentMonth(new Date())).getResultList();

            for (Object[] objects : list) {
                long MONTANT = 0;
                long count = Long.valueOf(objects[1] + "");
                if (count > 0) {
                    MONTANT = Long.valueOf(objects[0] + "");

                }
                json.put("MONTANT", MONTANT);
                json.put("NOMBRE", count);
            }
        } catch (Exception e) {
            e.printStackTrace();

        }

        return json;
    }

    // recuperation nombre dossiers non factures
    public JSONObject getBalanceInvoice(Date dateValue) {
        JSONObject json = new JSONObject();

        try {
            List<Object[]> list = this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intPRICERESTE) AS MONTANT,COUNT(o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID) AS NOMBRE FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.bISCANCEL = FALSE AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'   AND o.strSTATUTFACTURE ='unpaid'  AND o.strSTATUT = 'is_Closed' AND  FUNCTION('MONTH',o.dtCREATED)=   FUNCTION('MONTH',?1) AND FUNCTION('YEAR',o.dtCREATED)= FUNCTION('YEAR',?1) AND o.intPRICERESTE >0 AND o.intPRICE >0")
                    .setParameter(1, dateValue, TemporalType.DATE).getResultList();
            for (Object[] objects : list) {
                long MONTANT = 0;

                long count = Long.valueOf(objects[1] + "");
                if (count > 0) {
                    MONTANT = Long.valueOf(objects[0] + "");

                }
                json.put("MONTANT", MONTANT);
                json.put("NOMBRE", count);
            }

        } catch (Exception e) {
            e.printStackTrace();

        }

        return json;
    }

    public List<EntityData> getBalanceRecapDetails(String search_value, String lg_TIERS_PAYANT_ID, String dt_start,
            String dt_end) {

        List<EntityData> lstTFacture = new ArrayList<>();

        Date dtstart = ("".equals(dt_start) ? new Date() : java.sql.Date.valueOf(dt_start));
        Date dtend = ("".equals(dt_end) ? new Date() : java.sql.Date.valueOf(dt_end));
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            List<Object[]> list = new ArrayList<>();
            if ("".equals(dt_start) || "".equals(dt_end)) {
                list = this.getOdataManager().getEm().createQuery(
                        "SELECT  p.lgTIERSPAYANTID,p.strFULLNAME ,SUM( DISTINCT t.intNBDOSSIER),SUM( DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2 OR d.strFIRSTNAMECUSTOMER LIKE ?2 OR d.strLASTNAMECUSTOMER LIKE ?2 OR d.strNUMEROSECURITESOCIAL LIKE ?2) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND FUNCTION('DATE',t.dtCREATED) >=FUNCTION('DATE',?9)    GROUP BY p.lgTIERSPAYANTID ")
                        .setParameter(2, search_value + "%").setParameter(8, lg_TIERS_PAYANT_ID)
                        .setParameter(9, date.getPreviousHalfYearIncludeCurrentMonth(new Date())).getResultList();
            } else {
                list = this.getOdataManager().getEm().createQuery(
                        "SELECT  p.lgTIERSPAYANTID,p.strFULLNAME ,SUM( DISTINCT t.intNBDOSSIER),SUM( DISTINCT t.dblMONTANTRESTANT) FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE  (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR  p.strCODEORGANISME LIKE ?2 OR d.strFIRSTNAMECUSTOMER LIKE ?2 OR d.strLASTNAMECUSTOMER LIKE ?2 OR d.strNUMEROSECURITESOCIAL LIKE ?2) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND FUNCTION('DATE',t.dtCREATED) >=FUNCTION('DATE',?9)  AND  FUNCTION('DATE',t.dtCREATED) <=FUNCTION('DATE',?10)  GROUP BY p.lgTIERSPAYANTID ")
                        .setParameter(2, search_value + "%").setParameter(8, lg_TIERS_PAYANT_ID)
                        .setParameter(9, dtstart).setParameter(10, dtend).getResultList();
            }
            for (Object[] object : list) {
                long amount = 0l;
                if (object[3] != null) {
                    amount = Double.valueOf(object[3] + "").longValue();
                }
                // block ajoute le 08/11/2016 pour les dossiers non facturé
                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityData.setStr_value3(object[2] + "");
                entityData.setStr_value4(amount + "");

                lstTFacture.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;
    }

    public long getTierspayantNbProduitVendu(String lg_TIERS_PAYANT_ID, String dt_start, String dt_end) {
        List<String> id = new ArrayList<>();
        long qty = 0l;
        try {
            if ("".equals(dt_end) || "".equals(dt_start)) {
                id = this.getOdataManager().getEm().createQuery(
                        "SELECT  d.strREF FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE   t.strCUSTOMER LIKE ?1 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND FUNCTION('DATE',t.dtCREATED) >=FUNCTION('DATE',?9)   AND d.dblMONTANTRESTANT >0d")
                        .setParameter(1, lg_TIERS_PAYANT_ID)
                        .setParameter(9, date.getPreviousHalfYearIncludeCurrentMonth(new Date())).getResultList();
            } else {
                id = this.getOdataManager().getEm().createQuery(
                        "SELECT  d.strREF FROM TFacture t,TTiersPayant p,TFactureDetail d WHERE   t.strCUSTOMER LIKE ?1 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID AND t.dblMONTANTRESTANT >0d AND FUNCTION('DATE',t.dtCREATED) >=FUNCTION('DATE',?9)  AND FUNCTION('DATE',t.dtCREATED) <=FUNCTION('DATE',?10) AND d.dblMONTANTRESTANT >0d")
                        .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(9, java.sql.Date.valueOf(dt_start))
                        .setParameter(10, java.sql.Date.valueOf(dt_end)).getResultList();
            }

            for (String OString : id) {
                TPreenregistrementCompteClientTiersPayent oClientTiersPayent = this.getOdataManager().getEm()
                        .find(TPreenregistrementCompteClientTiersPayent.class, OString);

                if (oClientTiersPayent != null) {
                    TPreenregistrement OPreenregistrement = oClientTiersPayent.getLgPREENREGISTREMENTID();
                    for (TPreenregistrementDetail ODetail : OPreenregistrement
                            .getTPreenregistrementDetailCollection()) {
                        qty += ODetail.getIntQUANTITY();
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return qty;
    }

    public List<EntityData> getBalancePreenregistrementDetails(String search_value, String lg_TIERS_PAYANT_ID,
            String dt_start, String dt_end) {

        List<EntityData> lstTFacture = new ArrayList<>();

        Date dtstart = ("".equals(dt_start) ? new Date() : java.sql.Date.valueOf(dt_start));
        Date dtend = ("".equals(dt_end) ? new Date() : java.sql.Date.valueOf(dt_end));
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            List<Object[]> list = new ArrayList<>();

            if ("".equals(dt_start) || "".equals(dt_end)) {
                String query = "SELECT `t_tiers_payant`.`lg_TIERS_PAYANT_ID`,`t_tiers_payant`.`str_FULLNAME`, COUNT(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) AS `NOMBRE`,SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE_RESTE`) AS `MONTANT`"
                        + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                        + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                        + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                        + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND "
                        + "    DATE(`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`) <= DATE('"
                        + date.formatterMysqlShort.format(date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        + "') AND  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERS_PAYANT_ID
                        + "' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                        + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                        + "') GROUP BY `t_tiers_payant`.`lg_TIERS_PAYANT_ID`, `t_tiers_payant`.`str_FULLNAME`";
                list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();

            } else {
                String query = "SELECT `t_tiers_payant`.`lg_TIERS_PAYANT_ID`,`t_tiers_payant`.`str_FULLNAME`, COUNT(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) AS `NOMBRE`,SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE_RESTE`) AS `MONTANT`"
                        + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                        + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                        + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                        + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND "
                        + "  DATE(`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`) >= DATE('"
                        + date.formatterMysqlShort.format(dtstart)
                        + "')     AND  DATE(`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`) <= DATE('"
                        + date.formatterMysqlShort.format(dtend)
                        + "') AND  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERS_PAYANT_ID
                        + "' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                        + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                        + "') GROUP BY `t_tiers_payant`.`lg_TIERS_PAYANT_ID`, `t_tiers_payant`.`str_FULLNAME`";
                list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            }
            for (Object[] object : list) {
                long amount = 0l;
                if (object[3] != null) {
                    amount = Double.valueOf(object[3] + "").longValue();
                }

                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityData.setStr_value3(object[2] + "");
                entityData.setStr_value4(amount + "");

                lstTFacture.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;

    }

    public long getTierspayantProduitsVendus(String lg_TIERS_PAYANT_ID, String dt_start, String dt_end) {
        List<String> id = new ArrayList<>();
        long qty = 0l;
        Object somme = 0;

        try {
            if ("".equals(dt_end) || "".equals(dt_start)) {
                somme = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(d.intQUANTITY) AS NOMBRE  FROM TPreenregistrementCompteClientTiersPayent o,TPreenregistrementDetail d  WHERE o.lgPREENREGISTREMENTID.bISCANCEL = FALSE AND o.lgPREENREGISTREMENTID.intPRICE>0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'  AND o.dtCREATED <=?1 AND o.strSTATUTFACTURE <> 'paid'  AND o.strSTATUT = 'is_Closed' AND o.intPRICERESTE >0 AND o.intPRICE >0 AND o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2  AND d.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID     ")
                        .setParameter(2, lg_TIERS_PAYANT_ID)
                        .setParameter(1, date.getPreviousHalfYearIncludeCurrentMonth(new Date())).getSingleResult();
            } else {
                somme = this.getOdataManager().getEm().createQuery(
                        "SELECT SUM(d.intQUANTITY) AS NOMBRE  FROM TPreenregistrementCompteClientTiersPayent o,TPreenregistrementDetail d  WHERE o.lgPREENREGISTREMENTID.bISCANCEL = FALSE AND o.lgPREENREGISTREMENTID.intPRICE>0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'  AND FUNCTION('DATE',o.dtCREATED) >=FUNCTION('DATE',?1)  AND FUNCTION('DATE',o.dtCREATED) <=FUNCTION('DATE',?3) AND o.strSTATUTFACTURE <> 'paid'  AND o.strSTATUT = 'is_Closed' AND o.intPRICERESTE >0 AND o.intPRICE >0 AND o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2  AND d.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID ")
                        .setParameter(2, lg_TIERS_PAYANT_ID).setParameter(1, java.sql.Date.valueOf(dt_start))
                        .setParameter(3, java.sql.Date.valueOf(dt_end)).getSingleResult();
            }
            if (somme != null) {
                qty = (long) somme;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return qty;
    }

    public List<TPreenregistrementCompteClientTiersPayent> listTPreenregistrementTiersPayent(String search_value,
            String dtDEBUT, String dtFin, String lg_USER_ID, String lg_PREENREGISTREMENT_ID, String lg_EMPLACEMENT_ID,
            String lg_COMPTE_CLIENT_ID, String lg_TIERS_PAYANT_ID, String All) {

        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            if ("".equals(dtDEBUT) || "".equals(dtFin)) {
                lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE  t.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND t.intPRICE>0 AND t.lgPREENREGISTREMENTID.intPRICE >0 AND t.strSTATUT='is_Closed'  AND t.lgPREENREGISTREMENTID.intPRICE >0 AND   t.lgPREENREGISTREMENTID.dtCREATED  <=?3 AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.strSTATUTFACTURE <> 'paid'  AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11  AND (t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR  t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strNUMEROSECURITESOCIAL LIKE ?13 OR t.lgPREENREGISTREMENTID.strREF LIKE ?13 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?13  ) ORDER BY t.dtCREATED DESC")
                        .setParameter(2, lg_PREENREGISTREMENT_ID)
                        .setParameter(3, date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                        .setParameter(5, lg_USER_ID).setParameter(8, lg_EMPLACEMENT_ID)
                        .setParameter(10, lg_COMPTE_CLIENT_ID).setParameter(11, lg_TIERS_PAYANT_ID)
                        .setParameter(13, search_value + "%").getResultList();
                if (!"".equals(All)) {
                    lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE  t.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND t.intPRICE>0 AND t.lgPREENREGISTREMENTID.intPRICE >0 AND t.strSTATUT='is_Closed'  AND t.lgPREENREGISTREMENTID.intPRICE >0  AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.strSTATUTFACTURE <> 'paid'  AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11  AND (t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR  t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strNUMEROSECURITESOCIAL LIKE ?13 OR t.lgPREENREGISTREMENTID.strREF LIKE ?13 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?13  ) ORDER BY t.dtCREATED DESC")
                            .setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(5, lg_USER_ID)
                            .setParameter(8, lg_EMPLACEMENT_ID).setParameter(10, lg_COMPTE_CLIENT_ID)
                            .setParameter(11, lg_TIERS_PAYANT_ID).setParameter(13, search_value + "%").getResultList();

                }

            } else {
                lstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND t.intPRICE>0 AND t.lgPREENREGISTREMENTID.intPRICE >0 AND t.strSTATUT='is_Closed'  AND t.lgPREENREGISTREMENTID.intPRICE >0 AND   FUNCTION('DATE', t.lgPREENREGISTREMENTID.dtCREATED ) >=FUNCTION('DATE', ?3)  AND FUNCTION('DATE', t.lgPREENREGISTREMENTID.dtCREATED ) <=FUNCTION('DATE', ?4)   AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.strSTATUTFACTURE <> 'paid'  AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?10 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?11  AND (t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?13 OR  t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strNUMEROSECURITESOCIAL LIKE ?13 OR t.lgPREENREGISTREMENTID.strREF LIKE ?13 OR t.lgPREENREGISTREMENTID.strREFTICKET LIKE ?13  ) ORDER BY t.dtCREATED DESC")
                        .setParameter(2, lg_PREENREGISTREMENT_ID)
                        .setParameter(3, java.sql.Date.valueOf(dtDEBUT), TemporalType.DATE)
                        .setParameter(4, java.sql.Date.valueOf(dtFin), TemporalType.DATE).setParameter(5, lg_USER_ID)
                        .setParameter(8, lg_EMPLACEMENT_ID).setParameter(10, lg_COMPTE_CLIENT_ID)
                        .setParameter(11, lg_TIERS_PAYANT_ID).setParameter(13, search_value + "%").getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTPreenregistrementCompteClientTiersPayent;
    }

    public List<EntityData> getBalanceDetailsTiersPayant(String search_value, String lg_TIERS_PAYANT_ID,
            String lg_USER_ID) {

        List<EntityData> lstTFacture = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            List<Object[]> list = new ArrayList<>();
            String UserName = "%%";
            String UserLastName = "%%";
            if (!"".equals(lg_USER_ID)) {
                TClient OClient = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                if (OClient != null) {
                    UserName = OClient.getStrFIRSTNAME();
                    UserLastName = OClient.getStrLASTNAME();
                }
            }

            String query = "SELECT DISTINCT `t_tiers_payant`.`lg_TIERS_PAYANT_ID`,`t_tiers_payant`.`str_FULLNAME`"
                    + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                    + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                    + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                    + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND "
                    + "  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERS_PAYANT_ID
                    + "' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                    + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                    + "')     AND (`t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '" + UserName + "' OR \n"
                    + "  `t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '" + UserLastName + "')";
            list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();

            for (Object[] object : list) {

                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");

                lstTFacture.add(entityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTFacture;

    }

    public long getBalanceCount(String search_value, String lg_USER_ID, String lg_TIERS_PAYANT_ID) {

        long finalcount = 0l;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            Object count = 0;

            String UserName = "%%";
            String UserLastName = "%%";
            if (!"".equals(lg_USER_ID)) {
                TClient OClient = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                if (OClient != null) {
                    UserName = OClient.getStrFIRSTNAME();
                    UserLastName = OClient.getStrLASTNAME();
                }
            }

            String query = "SELECT COUNT(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) AS NOMBRE "
                    + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                    + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                    + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                    + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND "
                    + "  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERS_PAYANT_ID
                    + "' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                    + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                    + "')     AND (`t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '" + UserName + "' OR \n"
                    + "  `t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '" + UserLastName + "')";
            count = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

            finalcount = Long.valueOf(count + "");

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return finalcount;
    }

    public long getBalanceInvoiceDetailsAmount(String search_value, Date dateValue, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {

        long amount = 0l;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            String UserName = "";
            String UserLastName = "";
            if (!"".equals(lg_USER_ID)) {
                TClient OClient = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                if (OClient != null) {
                    UserName = OClient.getStrFIRSTNAME();
                    UserLastName = OClient.getStrLASTNAME();
                }
            }

            String query = "SELECT SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE_RESTE`) AS MONTANT "
                    + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                    + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                    + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                    + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND  (MONTH( `t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`)=MONTH('"
                    + date.formatterMysqlShort.format(dateValue)
                    + "') AND YEAR( `t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`)=YEAR('"
                    + date.formatterMysqlShort.format(dateValue) + "')) AND "
                    + "  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '%" + lg_TIERS_PAYANT_ID
                    + "%' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                    + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                    + "')     AND (`t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '" + UserName + "' OR \n"
                    + "  `t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '%" + UserLastName + "%')";
            Object count = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

            if (count != null) {
                amount = Double.valueOf(count + "").longValue();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return amount;
    }

    public long getBalanceHalfYearAmount(String search_value, String lg_USER_ID, String lg_TIERS_PAYANT_ID) {

        long amount = 0l;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            String UserName = "";
            String UserLastName = "";
            if (!"".equals(lg_USER_ID)) {
                TClient OClient = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                if (OClient != null) {
                    UserName = OClient.getStrFIRSTNAME();
                    UserLastName = OClient.getStrLASTNAME();
                }
            }

            String query = "SELECT SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE_RESTE`) AS MONTANT "
                    + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                    + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                    + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                    + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND   DATE(`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`) <=DATE('"
                    + date.formatterMysqlShort.format(date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                    + "'  ) AND " + "  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERS_PAYANT_ID
                    + "' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                    + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                    + "')     AND (`t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '%" + UserName + "%' OR \n"
                    + "  `t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '%" + UserLastName + "%')";
            Object count = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

            if (count != null) {
                amount = Double.valueOf(count + "").longValue();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return amount;
    }

    public long getBalanceHalfYearMonthIncludeAmount(String search_value, String lg_USER_ID,
            String lg_TIERS_PAYANT_ID) {
        TClient client = null;
        long amount = 0l;
        Object object = 0;

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            String UserName = "%%";
            String UserLastName = "%%";
            if (!"".equals(lg_USER_ID)) {
                TClient OClient = this.getOdataManager().getEm().find(TClient.class, lg_USER_ID);
                if (OClient != null) {
                    UserName = OClient.getStrFIRSTNAME();
                    UserLastName = OClient.getStrLASTNAME();
                }
            }

            String query = "SELECT SUM(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE_RESTE`) AS MONTANT "
                    + " FROM `t_tiers_payant` INNER JOIN `t_compte_client_tiers_payant` ON (`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`) INNER JOIN `t_preenregistrement_compte_client_tiers_payent` ON (`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`)"
                    + "  INNER JOIN `t_preenregistrement` ON (`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`) WHERE "
                    + "  `t_preenregistrement`.`int_PRICE` > 0 AND  `t_preenregistrement`.`str_STATUT` = 'is_Closed' AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed' AND "
                    + " `t_preenregistrement_compte_client_tiers_payent`.`int_PRICE` > 0 AND  `t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` <> 'paid' AND  `t_preenregistrement`.`b_IS_CANCEL` = 0 AND   (MONTH(`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`) >= MONTH('"
                    + date.formatterMysqlShort.format(date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                    + "') AND YEAR(`t_preenregistrement_compte_client_tiers_payent`.`dt_CREATED`) = YEAR('"
                    + date.formatterMysqlShort.format(date.getPreviousHalfYearIncludeCurrentMonth(new Date()))
                    + "')) AND " + "  `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERS_PAYANT_ID
                    + "' AND (`t_tiers_payant`.`str_NAME` LIKE '" + search_value
                    + "' OR  `t_tiers_payant`.`str_CODE_ORGANISME` LIKE '" + search_value
                    + "')     AND (`t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '%" + UserName + "%' OR \n"
                    + "  `t_preenregistrement`.`str_LAST_NAME_CUSTOMER` LIKE '%" + UserLastName + "%')";
            Object count = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

            if (count != null) {
                amount = Double.valueOf(count + "").longValue();
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return amount;
    }

    // liste des ventes réalisées à un dépôt
    public List<Object[]> listTPreenregistrementDepot(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE) {
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "";
        List<Object[]> lstTPreenregistrement = new ArrayList<Object[]>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String qry = "";
        try {

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            if (dt_Date_Debut.equalsIgnoreCase(dt_Date_Fin)) {
                qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                        + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                        + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value
                        + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '" + search_value
                        + "%' OR f.int_EAN13 LIKE '" + search_value + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '"
                        + lg_PREENGISTREMENT_ID + "' AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut
                        + "' and DATE(t.dt_UPDATED) <= '" + dt_Date_Fin + "')  AND (TIME(t.dt_UPDATED) >= '" + h_debut
                        + "' and TIME(t.dt_UPDATED) <= '" + h_fin + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                        + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                        + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                        + commonparameter.statut_is_Closed + "' AND (t.lg_TYPE_VENTE_ID = '"
                        + Parameter.VENTE_DEPOT_AGREE + "' OR t.lg_TYPE_VENTE_ID = '" + Parameter.VENTE_DEPOT_EXTENSION
                        + "') GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC";
            } else {
                qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                        + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                        + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value
                        + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '" + search_value
                        + "%' OR f.int_EAN13 LIKE '" + search_value + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '"
                        + lg_PREENGISTREMENT_ID + "' AND (t.dt_UPDATED >= '" + dt_Date_Debut + " " + h_debut
                        + "' AND t.dt_UPDATED <= '" + dt_Date_Fin + " " + h_fin + "')  AND t.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE
                        + "' AND t.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND (t.lg_TYPE_VENTE_ID = '"
                        + Parameter.VENTE_DEPOT_AGREE + "' OR t.lg_TYPE_VENTE_ID = '" + Parameter.VENTE_DEPOT_EXTENSION
                        + "') GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC";
            }
            new logger().OCategory.info("qry -- " + qry);
            lstTPreenregistrement = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    public JSONArray listTPreenregistrementDepot(boolean all, String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_VENTE, int start, int limit) {
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        JSONArray data = new JSONArray();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());

        try {
            final String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            if (!Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                predicate = cb.and(predicate,
                        cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            }
            predicate = cb.and(predicate,
                    cb.or(cb.like(jp.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_AGREE),
                            cb.like(jp.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION)));

            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            if (!"".equals(str_TYPE_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strTYPEVENTE), str_TYPE_VENTE));
            }
            if (!Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgUSERID"), lg_USER_ID));
            }

            if (!"".equals(search_value)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREF), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREFTICKET), search_value + "%")));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {

                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            cq.select(jp).distinct(true).groupBy(jp.get(TPreenregistrement_.lgPREENREGISTREMENTID))
                    .orderBy(cb.asc(jp.get(TPreenregistrement_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);

            }

            List<TPreenregistrement> list = q.getResultList();
            long dbl_AMOUNT = 0;
            if (!list.isEmpty()) {
                dbl_AMOUNT = listPreenregistrementCountDepotSum(search_value, OdateDebut, OdateFin, h_debut, h_fin,
                        str_TYPE_VENTE);
            }

            // boolean BTN_ANNULATION = Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_BT_ANNULER_VENTE);
            for (TPreenregistrement t : list) {

                List<TPreenregistrementDetail> listPreenregistrementDetail = getPreenregistrementDetail(
                        t.getLgPREENREGISTREMENTID());
                String str_Product = "";
                for (int k = 0; k < listPreenregistrementDetail.size(); k++) {
                    TPreenregistrementDetail OTPreenregistrementDetail = listPreenregistrementDetail.get(k);
                    if (OTPreenregistrementDetail != null) {
                        str_Product = "<b><span style='display:inline-block;width: 7%;'>"
                                + OTPreenregistrementDetail.getLgFAMILLEID().getIntCIP()
                                + "</span><span style='display:inline-block;width: 25%;'>"
                                + OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION()
                                + "</span><span style='display:inline-block;width: 15%;'>"
                                + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.')
                                + " F CFA " + "</span><span style='display:inline-block;width: 15%;'>("
                                + ((t.getIntPRICE() >= 0) ? OTPreenregistrementDetail.getIntQUANTITY()
                                        : (-1 * OTPreenregistrementDetail.getIntQUANTITY()))
                                + ")</span></b><span style='display:inline-block;width: 15%;'>"
                                + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " F CFA "
                                + "</span><br> " + str_Product;
                    }
                }
                try {
                    JSONObject json = new JSONObject();
                    TUser lgUSERCAISSIERID = t.getLgUSERCAISSIERID();
                    TUser lgUSERVENDEURID = t.getLgUSERCAISSIERID();

                    json.put("str_TYPE_VENTE",
                            t.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE) ? "DEPÔT AGRE"
                                    : "DEPÔT EXTENSION");

                    json.put("lg_EMPLACEMENT_ID", lg_EMPLACEMENT_ID);
                    json.put("lg_TYPE_VENTE_ID", t.getLgTYPEVENTEID().getLgTYPEVENTEID());
                    json.put("dbl_AMOUNT", dbl_AMOUNT);
                    json.put("lg_PREENREGISTREMENT_ID", t.getLgPREENREGISTREMENTID());
                    json.put("str_REF", t.getStrREF());
                    json.put("lg_USER_CAISSIER_ID",
                            lgUSERCAISSIERID.getStrFIRSTNAME() + " " + lgUSERCAISSIERID.getStrLASTNAME());
                    json.put("lg_USER_VENDEUR_ID",
                            lgUSERCAISSIERID.getStrFIRSTNAME() + " " + lgUSERCAISSIERID.getStrLASTNAME());
                    json.put("int_PRICE", t.getIntPRICE());
                    json.put("dt_CREATED", date.formatterShort.format(t.getDtUPDATED()));
                    json.put("str_hour", date.NomadicUiFormat_Time.format(t.getDtUPDATED()));
                    json.put("str_STATUT", t.getStrSTATUT());
                    json.put("str_FAMILLE_ITEM", str_Product);
                    json.put("b_IS_CANCEL", t.getBISCANCEL());
                    json.put("bISCANCEL", t.getBISCANCEL());

                    json.put("str_FIRST_LAST_NAME_CLIENT",
                            t.getStrFIRSTNAMECUSTOMER() + " " + t.getStrLASTNAMECUSTOMER());

                    json.put("int_PRICE_FORMAT", conversion.AmountFormat(t.getIntPRICE(), '.'));

                    data.put(json);
                } catch (JSONException ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            }
            /* ) */;

        } catch (Exception e) {
            e.printStackTrace();
        }

        return data;
    }

    public int listPreenregistrementCountDepot(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String str_TYPE_VENTE) {
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        EntityManager em = this.getOdataManager().getEm();
        try {
            final String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));

            if (!Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                predicate = cb.and(predicate,
                        cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            }
            predicate = cb.and(predicate,
                    cb.or(cb.like(jp.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_AGREE),
                            cb.like(jp.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION)));

            if (!"".equals(str_TYPE_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strTYPEVENTE), str_TYPE_VENTE));
            }
            if (!Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgUSERID"), lg_USER_ID));
            }
            if (!"".equals(search_value)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREF), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREFTICKET), search_value + "%")));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {
                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            cq.select(cb.countDistinct(jp.get(TPreenregistrement_.lgPREENREGISTREMENTID)))
                    .groupBy(jp.get(TPreenregistrement_.lgPREENREGISTREMENTID));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            return q.getResultList().size();

        } finally {

        }

    }

    public long listPreenregistrementCountDepotSum(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_VENTE) {
        long amount = 0;
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        EntityManager em = this.getOdataManager().getEm();
        try {
            final String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));

            if (!Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                predicate = cb.and(predicate,
                        cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            }
            predicate = cb.and(predicate,
                    cb.or(cb.like(jp.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_AGREE),
                            cb.like(jp.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION)));

            if (!"".equals(str_TYPE_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strTYPEVENTE), str_TYPE_VENTE));
            }
            if (!Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgUSERID"), lg_USER_ID));
            }
            if (!"".equals(search_value)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREF), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREFTICKET), search_value + "%")));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {
                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }
            cq.select(cb.sumAsLong(root.get(TPreenregistrementDetail_.intPRICE)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            amount = (long) q.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return amount;
    }

    public List<Object[]> listTPreenregistrementDepot(String search_value, String lg_PREENGISTREMENT_ID,
            String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE, int start,
            int limit) {
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "";
        List<Object[]> lstTPreenregistrement = new ArrayList<Object[]>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String qry = "";
        try {

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            if (dt_Date_Debut.equalsIgnoreCase(dt_Date_Fin)) {
                qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                        + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                        + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value
                        + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '" + search_value
                        + "%' OR f.int_EAN13 LIKE '" + search_value + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '"
                        + lg_PREENGISTREMENT_ID + "' AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut
                        + "' and DATE(t.dt_UPDATED) <= '" + dt_Date_Fin + "')  AND (TIME(t.dt_UPDATED) >= '" + h_debut
                        + "' and TIME(t.dt_UPDATED) <= '" + h_fin + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                        + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                        + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                        + commonparameter.statut_is_Closed + "' AND (t.lg_TYPE_VENTE_ID = '"
                        + Parameter.VENTE_DEPOT_AGREE + "' OR t.lg_TYPE_VENTE_ID = '" + Parameter.VENTE_DEPOT_EXTENSION
                        + "') GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC LIMIT " + start + ","
                        + limit;
            } else {
                qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ' ,u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ' ,u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ' ,t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + t.int_PRICE_REMISE END as VENTE_NET, DATE_FORMAT(t.dt_UPDATED,'%d-%m-%Y') AS dt_DATE_BRUT, DATE_FORMAT(t.dt_UPDATED,'%H:%i:%s') AS h_HEURE_BRUT "
                        + "FROM t_preenregistrement t, t_user u, t_preenregistrement_detail tp, t_famille f WHERE t.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID AND tp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND (t.str_REF LIKE '"
                        + search_value + "%' OR t.str_REF_TICKET LIKE '" + search_value
                        + "%' OR f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '" + search_value
                        + "%' OR f.int_EAN13 LIKE '" + search_value + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '"
                        + lg_PREENGISTREMENT_ID + "' AND (t.dt_UPDATED >= '" + dt_Date_Debut + " " + h_debut
                        + "' AND t.dt_UPDATED <= '" + dt_Date_Fin + " " + h_fin + "')  AND t.lg_USER_ID LIKE '"
                        + lg_USER_ID + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '"
                        + lg_EMPLACEMENT_ID + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE
                        + "' AND t.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND (t.lg_TYPE_VENTE_ID = '"
                        + Parameter.VENTE_DEPOT_AGREE + "' OR t.lg_TYPE_VENTE_ID = '" + Parameter.VENTE_DEPOT_EXTENSION
                        + "') GROUP BY tp.lg_PREENREGISTREMENT_ID ORDER BY t.dt_CREATED ASC LIMIT " + start + ","
                        + limit;
            }
            new logger().OCategory.info("qry -- " + qry);
            lstTPreenregistrement = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    // fin liste des ventes réalisées à un dépôt
    public double getAmountTotalTPreenregistrementDepot(List<Object[]> lst, boolean isAmountOther) {
        double result = 0.0;
        try {
            if (isAmountOther) {
                for (Object[] O : lst) {
                    result += Double.parseDouble(O[34].toString());
                }
            } else {
                for (Object[] O : lst) {
                    result += Double.parseDouble(O[4].toString());
                }
            }

        } catch (Exception e) {
        }
        return result;
    }

    public int isActivePromotion(Date _1, Date _2) throws ParseException {

        Date end = date.formatterMysqlShort.parse(date.formatterMysqlShort.format(_2));
        long _3 = end.getTime();
        long _4 = _1.getTime();

        return Long.compare(_4, _3);

    }

    public Map<TPreenregistrement, JSONObject> getNetPaid(String lg_PREENREGISTREMENT_ID, JSONArray array) {

        Map<TPreenregistrement, JSONObject> map = new HashMap<>();
        EntityManager em = this.getOdataManager().getEm();
        JSONObject json;
        try {
            TPreenregistrement OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Référence de vente inexistante");
                return null;
            }

            em.getTransaction().begin();

            if (OTPreenregistrement.getLgREMISEID() != null && !"".equals(OTPreenregistrement.getLgREMISEID())) { // si
                                                                                                                  // vente
                                                                                                                  // remise

                json = this.netWithDiscount(OTPreenregistrement, array);
                System.out.println("------------------------------------------------------ " + json);
            } else {
                json = this.netWithoutDiscount(OTPreenregistrement, array);
            }
            em.getTransaction().commit();
            em.clear();

            map.put(OTPreenregistrement, json);

        } catch (Exception e) {
            // em.getTransaction().rollback();
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération. Veuillez réessayer");
        }
        return map;
    }

    public long getNetWithDiscount(TPreenregistrement OTPreenregistrement, JSONArray array) {
        TParameters OTParameters = null;
        TRemise OTRemise = null;
        int result = 0, int_TOTAL_REMISE = 0, int_REMISE = 0, int_PART_TIERSPAYANT = 0;
        TGrilleRemise OTGrilleRemise = null;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        TTiersPayant payant;
        TCompteClientTiersPayant tc;
        int int_TAUX = 0;
        boolean isAvoir = false;
        try {

            OTRemise = this.GetRemiseToApply(OTPreenregistrement.getLgREMISEID());
            if (OTRemise != null) {

                if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equalsIgnoreCase(Parameter.TYPE_REMISE_CLIENT)) {
                    int_TOTAL_REMISE = (int) ((OTPreenregistrement.getIntPRICE() * OTRemise.getDblTAUX()) / 100);
                } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID()
                        .equalsIgnoreCase(Parameter.TYPE_REMISE_PRODUCT)) {
                    lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                    for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                        OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(
                                OTPreenregistrementDetail.getLgPREENREGISTREMENTID(),
                                OTPreenregistrementDetail.getLgFAMILLEID());
                        if (OTGrilleRemise != null) {
                            int_REMISE = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTGrilleRemise.getDblTAUX())
                                    / 100);
                            int_TOTAL_REMISE += int_REMISE;
                            OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                            OTPreenregistrementDetail.setIntPRICEREMISE(int_REMISE);
                        }
                        if (OTPreenregistrementDetail.getBISAVOIR()) {
                            isAvoir = true;
                        }
                    }
                }
                OTPreenregistrement.setIntPRICEREMISE(int_TOTAL_REMISE);
                OTPreenregistrement.setBISAVOIR(isAvoir);
                if (!OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()
                        .equalsIgnoreCase(Parameter.VENTE_COMPTANT)) {
                    // int_PART_TIERSPAYANT = (OTPreenregistrement.getIntPRICE() * int_TAUX) / 100;
                    // result = (int_TAUX == 100 ? 0 : (OTPreenregistrement.getIntPRICE() - (int_PART_TIERSPAYANT +
                    // int_TOTAL_REMISE) < 0) ? 0 : OTPreenregistrement.getIntPRICE() - (int_PART_TIERSPAYANT +
                    // int_TOTAL_REMISE));
                    for (int idx = 0; idx < array.length(); idx++) {
                        double montant = 0;
                        JSONObject json = array.getJSONObject(idx);
                        payant = this.getOdataManager().getEm().find(TTiersPayant.class, json.get("IDTIERSPAYANT"));
                        tc = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class, json.get("ID"));

                        int_TAUX = Integer.valueOf(json.get("TAUX") + "");
                        montant = ((OTPreenregistrement.getIntPRICE() * int_TAUX) / 100);
                        if ((tc.getDblPLAFOND().intValue() > 0) && (montant > tc.getDblPLAFOND().intValue())) {
                            int_PART_TIERSPAYANT += tc.getDblPLAFOND().longValue();
                        } else {
                            int_PART_TIERSPAYANT += montant;
                        }
                        if (OTPreenregistrement.getIntPRICE() == int_PART_TIERSPAYANT) {
                            break;
                        }
                    }
                    int _reste = OTPreenregistrement.getIntPRICE() - int_PART_TIERSPAYANT;
                    result = (_reste > 0 ? _reste : 0);

                    // result = (int_TAUX == 100 ? 0 : OTPreenregistrement.getIntPRICE() - int_PART_TIERSPAYANT);
                    OTPreenregistrement.setIntCUSTPART(result);
                } else {
                    result = OTPreenregistrement.getIntPRICE();
                }
                new logger().OCategory.info("result:" + result);
                this.persiste(OTPreenregistrement);
            }
            this.buildSuccesTraceMessage("Opréation effectuée avec succe");
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                this.showNetPaid(String.valueOf(result));
            }
        } catch (Exception e) {
            new logger().OCategory.info("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
            // e.printStackTrace();
            this.buildSuccesTraceMessage("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
        }
        return result;
    }

    public JSONObject netWithDiscount(TPreenregistrement OTPreenregistrement, JSONArray array) {
        TParameters OTParameters;
        TRemise OTRemise = null;
        int result = 0;

        JSONObject js = new JSONObject();
        TParameters KEY_TAKE_INTO_ACCOUNT;
        boolean KEYTAKEINTOACCOUNT = false;
        Map<Integer, JSONObject> map;
        try {
            try {
                KEY_TAKE_INTO_ACCOUNT = this.getOdataManager().getEm().getReference(TParameters.class,
                        "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null) {
                    if (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1) {
                        KEYTAKEINTOACCOUNT = true;
                    }

                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            if (KEYTAKEINTOACCOUNT) {

                map = verificationConsommationWithDiscountExclude(array, OTPreenregistrement);
            } else {
                map = verificationConsommationWithDiscount(array, OTPreenregistrement);
            }
            for (Map.Entry<Integer, JSONObject> entry : map.entrySet()) {
                result = entry.getKey();
                js = entry.getValue();

            }
            this.buildSuccesTraceMessage("Opréation effectuée avec succe");
            OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                this.showNetPaid(String.valueOf(result));
            }
        } catch (Exception e) {
            new logger().OCategory.info("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
            e.printStackTrace();
            this.buildSuccesTraceMessage("Echec de l'opération. Vérifier si votre afficheur est bien connecté");
        }
        return js;
    }

    public TPreenregistrement updateTPreenregistrementDetail(String lg_PREENREGISTREMENT_DETAIL_ID,
            int int_PRICE_UNITAIR, int int_QUANTITY, int int_QUANTITY_SERVED) {
        TPreenregistrementDetail OTPreenregistrementDetail;
        TPreenregistrement OTPreenregistrement = null;
        TPromotionProduct OTPromotionProduct = null;
        TParameters OTParameters = null;
        int int_PRICE_OLD = 0, int_QUANTITY_SERVED_OLD = 0, int_AVOIR_SERVED = 0, int_FREE_PACK_NUMBER = 0;
        try {
            OTPreenregistrementDetail = this.getOdataManager().getEm().find(TPreenregistrementDetail.class,
                    lg_PREENREGISTREMENT_DETAIL_ID);
            if (OTPreenregistrementDetail == null) {
                this.buildErrorTraceMessage("Echec de mise à jour du produit. Produit inexistant sur la vente");
                return null;
            }
            OTPreenregistrement = OTPreenregistrementDetail.getLgPREENREGISTREMENTID();
            int_PRICE_OLD = OTPreenregistrementDetail.getIntPRICE();
            int_FREE_PACK_NUMBER = OTPreenregistrementDetail.getIntFREEPACKNUMBER();
            TParameters p = this.getOdataManager().getEm().find(TParameters.class, "KEY_CHECK_PRICE_UPDATE_AUTH");
            int checkPersmission = 1;
            if (p != null) {
                checkPersmission = Integer.valueOf(p.getStrVALUE());
            }
            if (checkPersmission == 1) {
                if (this.checkpricevente(OTPreenregistrementDetail.getLgFAMILLEID(), int_PRICE_UNITAIR)) {
                    return null;
                }
            }
            int_QUANTITY_SERVED_OLD = OTPreenregistrementDetail.getIntQUANTITYSERVED();
            if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getBISAVOIR()
                    && int_QUANTITY_SERVED_OLD > int_QUANTITY_SERVED) {
                this.buildErrorTraceMessage("QS ne doit pas être superieur à QD de l'avoir");
                return null;
            }

            if (OTPreenregistrementDetail.getIntPRICEUNITAIR() != int_PRICE_UNITAIR) {
                this.checkpriceForSendSMS(OTPreenregistrementDetail.getLgFAMILLEID(),
                        OTPreenregistrementDetail.getLgFAMILLEID().getIntPRICE(), int_PRICE_UNITAIR,
                        OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrREF());
                OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_UNITAIR);
            }
            OTPreenregistrementDetail.setIntPRICE(this.GetTotalDetail(int_PRICE_UNITAIR, int_QUANTITY));
            OTPreenregistrementDetail.setIntQUANTITY(int_QUANTITY);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_QUANTITY_SERVED);

            // code ajouté 08/12/2016
            if (OTPreenregistrementDetail.getLgFAMILLEID().getBlPROMOTED()) {

                OTPromotionProduct = this
                        .getPromotionProduct(OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID());
                if (OTPromotionProduct != null
                        && OTPromotionProduct.getLgCODEPROMOTIONID().getStrTYPE().equalsIgnoreCase("UNITES GRATUITES")
                        && (OTPreenregistrementDetail.getIntQUANTITY() >= OTPromotionProduct.getIntACTIVEAT())) {
                    int_FREE_PACK_NUMBER = (int) ((OTPreenregistrementDetail.getIntQUANTITY()
                            / OTPromotionProduct.getIntACTIVEAT()) * OTPromotionProduct.getIntPACKNUMBER());
                } else {
                    int_FREE_PACK_NUMBER = 0;

                }
            }
            new logger().OCategory.info("int_FREE_PACK_NUMBER:" + int_FREE_PACK_NUMBER);
            OTPreenregistrementDetail.setIntFREEPACKNUMBER(int_FREE_PACK_NUMBER);
            // fin code ajouté 08/12/2016

            int_AVOIR_SERVED = (int_QUANTITY_SERVED - int_QUANTITY_SERVED_OLD)
                    + (OTPreenregistrementDetail.getIntAVOIRSERVED() != null
                            ? OTPreenregistrementDetail.getIntAVOIRSERVED() : 0); // a decommenter en cas de probleme
            if (int_QUANTITY_SERVED != int_QUANTITY_SERVED_OLD) {
                OTPreenregistrementDetail
                        .setIntAVOIRSERVED(int_AVOIR_SERVED < 0 ? int_QUANTITY_SERVED_OLD : int_AVOIR_SERVED);
            }
            OTPreenregistrementDetail.setIntAVOIR(
                    OTPreenregistrementDetail.getIntQUANTITY() - OTPreenregistrementDetail.getIntQUANTITYSERVED());
            if (OTPreenregistrementDetail.getIntAVOIR() > 0) {
                if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT()
                        .equalsIgnoreCase(commonparameter.statut_is_Process)) {
                    OTPreenregistrementDetail.setBISAVOIR(true);
                }
            } else if (OTPreenregistrementDetail.getLgPREENREGISTREMENTID().getStrSTATUT()
                    .equalsIgnoreCase(commonparameter.statut_is_Process)) {
                OTPreenregistrementDetail.setBISAVOIR(false);
            }
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            OTPreenregistrement.setIntPRICE(
                    OTPreenregistrement.getIntPRICE() + (OTPreenregistrementDetail.getIntPRICE() - int_PRICE_OLD));
            if (OTPreenregistrementDetail.getBoolACCOUNT()) {
                OTPreenregistrement.setIntACCOUNT(OTPreenregistrement.getIntACCOUNT()
                        + (OTPreenregistrementDetail.getIntPRICE() - int_PRICE_OLD));
            }
            OTPreenregistrement.setDtUPDATED(new Date());
            this.merge(OTPreenregistrementDetail);
            this.merge(OTPreenregistrement);

            this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
            this.getOdataManager().getEm().merge(OTPreenregistrement);

            this.buildSuccesTraceMessage("Produit mise à jour avec succès à la vente avec succès");
            OTParameters = this.getOdataManager().getEm().getReference(TParameters.class,
                    Parameter.KEY_ACTIVATE_DISPLAYER);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                try {
                    // DisplayerManager ODisplayerManager = new DisplayerManager();
                    // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(),
                    // 0, 20));
                    // ODisplayerManager.DisplayData(DataStringManager.subStringData(OTPreenregistrementDetail.getIntQUANTITY()
                    // + "*" + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.') + " = " +
                    // conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " CFA", 0, 20), "begin");
                    // ODisplayerManager.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTPreenregistrement;
    }

    public TParameters getParameter(String str_KEY) {
        TParameters OTParameters = null;

        try {
            OTParameters = this.getOdataManager().getEm().getReference(TParameters.class, str_KEY);

        } catch (Exception e) {
            e.printStackTrace();

        }
        return OTParameters;
    }

    public boolean cloturerVente(TPreenregistrement OTPreenregistrement, TTypeVente OTTypeVente, boolean b_WITHOUT_BON,
            String lg_TYPE_REGLEMENT_ID, TReglement OTReglement, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            int int_PART_TIERSPAYANT, TCompteClient OTCompteClient, String lg_USER_VENDEUR_ID,
            JSONArray tierspayantsda) {
        boolean result = false;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParametersValue = null, OTParametersKey = null;
        int int_MOVEMENT_FALSE_VALUE = 0, int_MOVEMENT_FALSE_VALUE_CURRENT = 0;
        TTypeReglement OTTypeReglement = null;
        TUser OTUserVendeur = null;
        String lg_MOTIF_REGLEMENT_ID = "1";
        try {
            OTParametersValue = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE_VALUE);
            OTParametersKey = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            OTPreenregistrement.setBWITHOUTBON(b_WITHOUT_BON);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);
            if (OTParametersValue != null) {
                int_MOVEMENT_FALSE_VALUE = Integer.parseInt(OTParametersValue.getStrISENKRYPTED());
            }
            OTTypeReglement = this.getTTypeReglement(lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Type de règlement inexistant");
                return result;
            }
            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), commonparameter.statut_is_Process); // code ajouté
            int_MOVEMENT_FALSE_VALUE_CURRENT = this.closureProductVente(OTPreenregistrement,
                    lstTPreenregistrementDetail, int_MOVEMENT_FALSE_VALUE); // enregistrement de la cloture des produits

            /*
             * if (!this.saveCashOfPurchase(OTTypeVente, OTPreenregistrement, OTReglement,
             * OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT) ?
             * OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE() : (int_PART_TIERSPAYANT -
             * OTPreenregistrement.getIntPRICE() == 0 ? 0 : (OTPreenregistrement.getIntCUSTPART() -
             * OTPreenregistrement.getIntPRICEREMISE() >= 0 ? OTPreenregistrement.getIntCUSTPART() -
             * OTPreenregistrement.getIntPRICEREMISE() : 0)), int_AMOUNT_RECU, int_AMOUNT_REMIS,
             * OTTypeReglement.getLgTYPEREGLEMENTID(), OTCompteClient, lg_MOTIF_REGLEMENT_ID, int_PART_TIERSPAYANT)) {
             * // encaissement return result; }
             */
            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);
            // OTPreenregistrement.setLgREGLEMENTID(OTReglement.getLgREGLEMENTID());
            OTPreenregistrement.setLgREGLEMENTID(OTReglement);
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));
            // OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
            // //a decommenter en cas de probleme 14/02/2017
            OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date()));
            // OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));

            if (OTParametersKey != null && OTParametersValue != null
                    && Integer.parseInt(OTParametersKey.getStrVALUE()) == 1
                    && int_MOVEMENT_FALSE_VALUE > int_MOVEMENT_FALSE_VALUE_CURRENT
                    && OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()
                            .equals(bll.common.Parameter.VENTE_COMPTANT)
                    && OTPreenregistrement.getLgREMISEID() == null) {
                OTParametersValue
                        .setStrISENKRYPTED(String.valueOf(int_MOVEMENT_FALSE_VALUE - int_MOVEMENT_FALSE_VALUE_CURRENT));
                OTParametersValue.setDtUPDATED(new Date());
                OTPreenregistrement.setIntPRICEOTHER(int_MOVEMENT_FALSE_VALUE_CURRENT);
                this.getOdataManager().getEm().merge(OTParametersValue);
            } else {
                OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
            }
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            new CalendrierManager(this.getOdataManager(), this.getOTUser()).createCalendrier(date.getoMois(new Date()),
                    Integer.parseInt(date.getAnnee(new Date())));
            this.buildSuccesTraceMessage("Vente terminée avec succès");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente. Veuillez réessayer svp!");
        }
        return result;
    }

    public String buildVenteRefBis(Date ODate) throws JSONException {
        String str_code = "", str_lasd = "", str_actd = "", str_last_code = "";
        THistorypreenregistrement OHistorypreenregistrement = null;
        TEmplacement OTEmplacement = null;
        try {

            OTEmplacement = this.getOTUser().getLgEMPLACEMENTID();
            TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = this.getOdataManager().getEm().find(TParameters.class,
                    "KEY_SIZE_ORDER_NUMBER");

            String jsondata = this.getOTUser().getLgEMPLACEMENTID().getStrREF();
            int int_last_code = 0;
            int_last_code = int_last_code + 1;

            new logger().OCategory.info("jsondata =  " + jsondata);
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);

            int_last_code = new Integer(jsonObject.getString("int_last_code"));
            Date dt_last_date = date.stringToDate(jsonObject.getString("str_last_date"), date.formatterMysqlShort2);

            str_lasd = this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort2);
            str_actd = this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2);

            Calendar now = Calendar.getInstance();
            int hh = now.get(Calendar.HOUR_OF_DAY);
            int mois = now.get(Calendar.MONTH) + 1;
            int jour = now.get(Calendar.DAY_OF_MONTH);
            OHistorypreenregistrement = this.getTHistorypreenregistrement(ODate);//
            if (!str_lasd.equals(str_actd)) {
                // int_last_code = 0; // a decommenter en cas de probleme 27/05/2016
                // code ajouté 27/05/2016. a retirer en cas de probleme
                int_last_code = 0;

                if (OHistorypreenregistrement == null) {
                    int intsize = ((int_last_code + 1) + "").length();
                    int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
                    str_last_code = "";
                    for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                        str_last_code = str_last_code + "0";
                    }

                    str_last_code = str_last_code + (int_last_code + 1) + "";
                    new logger().OCategory.info("str_last_code:" + str_last_code);
                    OHistorypreenregistrement = this.createTHistorypreenregistrement(str_last_code, ODate, 1);
                } else {
                    int_last_code = OHistorypreenregistrement.getIntLASTNUMBER();
                    int intsize = ((int_last_code + 1) + "").length();
                    int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());

                    for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                        str_last_code = str_last_code + "0";
                    }

                    str_last_code = str_last_code + (int_last_code + 1) + "";
                    OHistorypreenregistrement.setIntLASTNUMBER(int_last_code + 1);
                    OHistorypreenregistrement.setStrREF(str_last_code);
                    OHistorypreenregistrement.setDtUPDATED(new Date());
                    this.getOdataManager().getEm().merge(OHistorypreenregistrement);

                    // send sms to pharmacien
                    this.do_event_log(commonparameter.ALL,
                            "Modification de date à la vente par " + this.getOTUser().getStrFIRSTNAME() + " "
                                    + this.getOTUser().getStrLASTNAME() + ". Ancienne date: "
                                    + this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort)
                                    + ". Nouvelle date: "
                                    + this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort),
                            this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                            commonparameter.statut_enable, "TPreenregistrement", "Vente",
                            "Modification de prix de produit", this.getOTUser().getLgUSERID());
                }
                // fin code ajouté 27/05/2016
            } else if (OHistorypreenregistrement == null) {
                int intsize = ((int_last_code + 1) + "").length();
                int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
                str_last_code = "";
                for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                    str_last_code = str_last_code + "0";
                }

                str_last_code = str_last_code + (int_last_code + 1) + "";
                new logger().OCategory.info("str_last_code:" + str_last_code);
                OHistorypreenregistrement = this.createTHistorypreenregistrement(str_last_code, ODate, 1);
            } else {
                int_last_code = OHistorypreenregistrement.getIntLASTNUMBER();
                int intsize = ((int_last_code + 1) + "").length();
                int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());

                for (int i = 0; i < (intsize_tobuild - intsize); i++) {
                    str_last_code = str_last_code + "0";
                }

                str_last_code = str_last_code + (int_last_code + 1) + "";
                OHistorypreenregistrement.setIntLASTNUMBER(int_last_code + 1);
                OHistorypreenregistrement.setStrREF(str_last_code);
                OHistorypreenregistrement.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OHistorypreenregistrement);

            }

            new logger().OCategory.info(int_last_code + "  " + dt_last_date);
            // KEY_SIZE_ORDER_NUMBER

            str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

            JSONObject json = new JSONObject();
            JSONArray arrayObj = new JSONArray();
            json.put("int_last_code", str_last_code);
            json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
            arrayObj.put(json);
            String jsonData = arrayObj.toString();

            OTEmplacement.setStrREF(jsonData);
            this.getOdataManager().getEm().merge(OTEmplacement);
            new logger().OCategory.info(jsonData);
            new logger().OCategory.info(str_code);

        } catch (Exception e) {
            e.printStackTrace();

        }
        return str_code;

    }

    public boolean cloturerVente(JSONArray tierspayantsda, boolean b_WITHOUT_BON,
            TPreenregistrement OTPreenregistrement, DiffereManagement differeManagement) {

        boolean result = false;
        TParameters OTParameters = null;

        try {

            OTParameters = getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);

            if (OTParameters == null) {

                this.buildErrorTraceMessage("Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                return false;
            }

            if (tierspayantsda.length() <= 0) {

                this.buildErrorTraceMessage("Impossible de terminer la vente. tiers-payant inexistant");
                return false;
            }

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && b_WITHOUT_BON) { // si valeur 0, on passe en cloture
                                                                                     // manuelle

                this.buildErrorTraceMessage(
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");

                return false;
            }

            differeManagement.updateCompteTierpayant(tierspayantsda, OTPreenregistrement, b_WITHOUT_BON);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    public List<TPreenregistrementDetail> getPreenregistrementDetail(String lgPREENREGISTREMENTID) {
        List<TPreenregistrementDetail> lstT = new ArrayList<>();

        try {

            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE  t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID =?1 ")
                    .setParameter(1, lgPREENREGISTREMENTID).getResultList();
            return lstT;
        } catch (Exception ex) {

        }
        return lstT;
    }

    public TMouvementSnapshot getTMouvementSnapshotForCurrentDay(String lg_FAMILLE_ID) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = "", Date_Fin = "";
        try {
            Date_debut = this.getKey().GetDateNowForSearch(0);
            Date_Fin = this.getKey().GetDateNowForSearch(1);
            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
            OTMouvementSnapshot = (TMouvementSnapshot) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT = ?5 AND t.lgFAMILLEID.lgFAMILLEID = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?7")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public boolean cloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, TReglement OTReglement, String lg_COMPTE_CLIENT_ID,
            String str_FIRST_NAME_FACTURE, String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE,
            String str_NUMERO_SECURITE_SOCIAL, String lg_USER_VENDEUR_ID, boolean b_WITHOUT_BON,
            JSONArray tierspayantsda, int int_TAUX) {

        int int_total_remise_convert = 0;
        Double dbl_Amount = 0.0, dbl_PART_TIERSPAYANT = 0.0;
        boolean result = false;
        TParameters OTParameters = null;
        TCompteClient OTCompteClient = null;
        TPreenregistrement OTPreenregistrement = null;
        try {

            OTParameters = getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);
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

            OTCompteClient = this.getOdataManager().getEm().getReference(TCompteClient.class, lg_COMPTE_CLIENT_ID);
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
            result = this.CloturerVente(OTPreenregistrement, OTTypeVente, b_WITHOUT_BON, lg_TYPE_REGLEMENT_ID,
                    OTReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS, dbl_PART_TIERSPAYANT.intValue(), OTCompteClient,
                    lg_USER_VENDEUR_ID, int_TAUX);

            this.buildSuccesTraceMessage("Operation effectuée avec succes");
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente à crédit. Veuillez réessayer svp!");
        }

        return result;
    }

    private boolean updateComptclientTierspayant(TCompteClientTiersPayant OTCompteClientTiersPayant,
            Integer int_CURRENT_PART_TIERSPAYANT) {
        boolean isOK = false;

        try {

            if (OTCompteClientTiersPayant != null) {
                TTiersPayant oPayant = OTCompteClientTiersPayant.getLgTIERSPAYANTID();
                if (OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() != null) {
                    OTCompteClientTiersPayant.setDbCONSOMMATIONMENSUELLE(
                            OTCompteClientTiersPayant.getDbCONSOMMATIONMENSUELLE() + int_CURRENT_PART_TIERSPAYANT);
                } else {
                    OTCompteClientTiersPayant.setDbCONSOMMATIONMENSUELLE(int_CURRENT_PART_TIERSPAYANT);
                }
                oPayant.setDbCONSOMMATIONMENSUELLE(oPayant.getDbCONSOMMATIONMENSUELLE() + int_CURRENT_PART_TIERSPAYANT);
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
                this.getOdataManager().getEm().merge(oPayant);
                this.getOdataManager().getEm().merge(OTCompteClientTiersPayant);

                isOK = true;
            }
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return isOK;
    }

    public Double createTPreenregistrementCompteClientTierspayant(JSONArray data,
            TPreenregistrement OTPreenregistrement, int int_AMOUNT_REMIS, int int_AMOUNT_RECU, boolean b_WITHOUT_BON) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        int int_RESTE = 0, int_CURRENT_PART_TIERSPAYANT = 0, int_PERCENT_INIT = 100, int_PERCENT = 0;

        Double result = 0.0;
        try {

            for (int k = 0; k < data.length(); k++) {
                JSONObject json = data.getJSONObject(k);
                int_CURRENT_PART_TIERSPAYANT = (Integer.valueOf(json.getInt("tpnet") + "")
                        - Integer.valueOf(json.getInt("DISCOUNT") + ""));
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

                    if (!this.createPreenregistrementCompteClientTiersPayent(OTPreenregistrement,
                            OTCompteClientTiersPayant, json.getInt("TAUX"), int_CURRENT_PART_TIERSPAYANT,
                            int_CURRENT_PART_TIERSPAYANT, json.getString("REFBON"), k)) {
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

    public boolean createPreenregistrementCompteClientTiersPayent(TPreenregistrement OTPreenregistrement,
            TCompteClientTiersPayant OTCompteClientTiersPayant, int int_PERCENT, int int_PRICE, int int_PRICE_RESTE,
            String str_REFBON, int length) {
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
            OTPreenregistrementCompteClientTiersPayent.setStrREFBON(str_REFBON);
            OTPreenregistrementCompteClientTiersPayent.setDblQUOTACONSOVENTE(OTPreenregistrementCompteClientTiersPayent
                    .getLgCOMPTECLIENTTIERSPAYANTID().getDblQUOTACONSOVENTE() != null
                            ? OTPreenregistrementCompteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                    .getDblQUOTACONSOVENTE()
                            : 0);
            OTPreenregistrementCompteClientTiersPayent.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrementCompteClientTiersPayent.setLgUSERID(this.getOTUser());
            this.getOdataManager().getEm().merge(OTPreenregistrementCompteClientTiersPayent);

            // this.updateComptclientTierspayant(OTCompteClientTiersPayant, int_PRICE);//11112017 appaul
            /*
             * if (OTCompteClientTiersPayant.getIntPRIORITY() == 1) { OTPreenregistrement.setStrREFBON(str_REFBON);
             * this.getOdataManager().getEm().merge(OTPreenregistrement);
             *
             * }
             */
            if (length == 0) {
                OTPreenregistrement.setStrREFBON(str_REFBON);
                this.getOdataManager().getEm().merge(OTPreenregistrement);

            }

            if (!OTCompteClientTiersPayant.getLgTIERSPAYANTID().getBoolIsACCOUNT()) {
                this.crediteAccount(OTCompteClientTiersPayant.getLgCOMPTECLIENTID(),
                        this.getOTUser().getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), int_PRICE);

            }

            this.buildSuccesTraceMessage("Tiers payant ajouté avec succès à la vente en cours");
            result = true;
        } catch (Exception e) {
            if (this.getOdataManager().getEm().isOpen()) {
                this.getOdataManager().getEm().getTransaction().rollback();

            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du tiers payant à la vente en cours");
        }
        return result;
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

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("cannot do transaction  " + e.getMessage());

        }
    }

    public boolean checkRefBonIsUse(String Ref_Bon, TCompteClientTiersPayant oTCompteClientTiersPayant,
            String str_STATUT) {
        boolean result = false;
        try {

            if (!"".equals(Ref_Bon)) {
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

    public List<TPreenregistrementDetail> getListePreenregistrementDetail(boolean all, String search_value,
            String lgPREENREGISTREMENTID, String str_Statut, int start, int limit) {
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> pf = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate p = cb.conjunction();
            if (!"".equals(search_value) && !"%%".equals(search_value)) {
                p = cb.and(p,
                        cb.or(cb.like(pf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(pf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(pf.get(TFamille_.intEAN13), search_value + "%")));
            }
            if (!"".equals(str_Statut) && !"%%".equals(str_Statut)) {
                p = cb.and(p, cb.equal(join.get(TPreenregistrement_.strSTATUT), str_Statut));
            }
            p = cb.and(p, cb.equal(join.get(TPreenregistrement_.lgPREENREGISTREMENTID), lgPREENREGISTREMENTID));
            cq.select(root).orderBy(cb.desc(root.get(TPreenregistrementDetail_.dtUPDATED)));
            cq.where(p);

            Query q = em.createQuery(cq);

            if (!all) {
                q.setMaxResults(limit);
                q.setFirstResult(start);
            }
            lstTPreenregistrementDetail = q.getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTPreenregistrementDetail;
    }

    public int getPreenregistrementDetailCount(String search_value, String lgPREENREGISTREMENTID, String str_Statut) {
        EntityManager em = this.getOdataManager().getEm();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> pf = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate p = cb.conjunction();
            if (!"".equals(search_value) && !"%%".equals(search_value)) {
                p = cb.and(p,
                        cb.or(cb.like(pf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(pf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(pf.get(TFamille_.intEAN13), search_value + "%")));
            }
            if (!"".equals(str_Statut) && !"%%".equals(str_Statut)) {
                p = cb.and(p, cb.equal(join.get(TPreenregistrement_.strSTATUT), str_Statut));
            }
            p = cb.and(p, cb.equal(join.get(TPreenregistrement_.lgPREENREGISTREMENTID), lgPREENREGISTREMENTID));
            cq.select(cb.count(root));

            cq.where(p);

            Query q = em.createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();

        } finally {

        }
    }

    public double getAmountTotalTPreenregistrement(List<EntityData> lst) {
        double result = 0.0;
        try {
            for (EntityData O : lst) {
                result += Double.parseDouble(O.getStr_value5());
            }

        } catch (Exception e) {
        }
        return result;
    }

    public void updateVenteDetails2(String lgVENTEID) {

        try {
            CriteriaBuilder cb = this.getOdataManager().getEm().getCriteriaBuilder();
            CriteriaUpdate<TPreenregistrementDetail> cu = cb.createCriteriaUpdate(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cu.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> j = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cu.set(root.get(TPreenregistrementDetail_.strSTATUT), commonparameter.statut_is_Closed)
                    .set(root.get(TPreenregistrementDetail_.dtUPDATED), new Date());
            cu.where(cb.equal(j.get(TPreenregistrement_.lgPREENREGISTREMENTID), lgVENTEID));
            this.getOdataManager().getEm().createQuery(cu).executeUpdate();
            // this.getOdataManager().getEm().flush();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private Map<Integer, JSONObject> verificationConsommationWithDiscount(JSONArray array,
            TPreenregistrement OTPreenregistrement) {
        Map<Integer, JSONObject> map = new HashMap<>();
        int result = 0, int_PART_TIERSPAYANT = 0;
        boolean isAvoir = false;
        TTiersPayant payant;
        TCompteClientTiersPayant tc;
        int int_TAUX = 0;
        int RemiseCarnet = 0;
        JSONObject js = new JSONObject();
        JSONArray jsonarray = new JSONArray();
        try {
            int montantvente = OTPreenregistrement.getIntPRICE();

            if (!OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)) {
                String message = "";
                if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_AVEC_CARNET)) {
                    RemiseCarnet = getRemise(OTPreenregistrement, montantvente);
                }
                for (int idx = 0; idx < array.length(); idx++) {
                    int montant = 0;
                    double montanttp = 0;
                    JSONObject json = array.getJSONObject(idx);

                    tc = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class, json.get("IDCMPT"));
                    payant = tc.getLgTIERSPAYANTID();
                    int plafondClient = tc.getDblPLAFOND().intValue();
                    int encoursClient = tc.getDbPLAFONDENCOURS();
                    int plafondTp = payant.getDblPLAFONDCREDIT().intValue();

                    int_TAUX = Integer.valueOf(json.get("TAUX") + "");

                    montant = ((Double) Math.ceil(((Double.valueOf(montantvente) * int_TAUX) / 100))).intValue();
                    if ((plafondClient > 0) && (montant > plafondClient)) {
                        int _montant = 0;
                        if (encoursClient > 0 && (tc.getDbCONSOMMATIONMENSUELLE() + plafondClient) > encoursClient) {
                            _montant = (encoursClient - tc.getDbCONSOMMATIONMENSUELLE());
                        } else {
                            _montant = plafondClient;
                        }

                        if (plafondTp > 0 && (payant.getDbCONSOMMATIONMENSUELLE() + _montant) > plafondTp) {
                            int _montanttp = (plafondTp - payant.getDbCONSOMMATIONMENSUELLE());
                            montanttp = _montanttp;
                            int_PART_TIERSPAYANT += montanttp;

                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + (payant.getDblPLAFONDCREDIT().intValue() - payant.getDbCONSOMMATIONMENSUELLE())
                                    + " FCFA</span><br/> .Son plafond est atteint.<br/> ";
                        } else {
                            // montanttp=tc.getDblPLAFOND().intValue();
                            montanttp = _montant;

                            int_PART_TIERSPAYANT += montanttp;

                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + montanttp + " FCFA</span><br/> qui est le plafond de la vente.<br/>";

                        }

                    } else {
                        int _montant = 0;

                        if (encoursClient > 0 && (tc.getDbCONSOMMATIONMENSUELLE() + montant) > encoursClient) {
                            _montant = (encoursClient - tc.getDbCONSOMMATIONMENSUELLE());
                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + _montant + " FCFA</span> votre plafond est atteint.<br/>";
                        } else {
                            _montant = montant;
                        }

                        if (plafondTp > 0 && (payant.getDbCONSOMMATIONMENSUELLE() + _montant) > plafondTp) {
                            montanttp = (plafondTp - payant.getDbCONSOMMATIONMENSUELLE());
                            int_PART_TIERSPAYANT += montanttp;
                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + montanttp + " FCFA</span><br/> Son plafond est atteint.<br/>";
                        } else {

                            montanttp = _montant;
                            int_PART_TIERSPAYANT += montanttp;

                        }

                    }

                    JSONObject ob = new JSONObject();
                    ob.put("LGCOMPTECLIENT", tc.getLgCOMPTECLIENTTIERSPAYANTID());
                    ob.put("LGPreenregistrement", OTPreenregistrement.getLgPREENREGISTREMENTID());
                    ob.put("REFBON", json.get("REFBON"));

                    if ((montantvente - int_PART_TIERSPAYANT) <= 0) {
                        double nettp = (montantvente - (int_PART_TIERSPAYANT - montanttp));

                        ob.put("tpnet", nettp);
                        ob.put("DISCOUNT", RemiseCarnet);
                        ob.put("TAUX", Math.round((nettp * 100) / montantvente));
                        jsonarray.put(ob);

                        break;
                    } else {

                        ob.put("tpnet", montanttp);
                        ob.put("DISCOUNT", RemiseCarnet);
                        ob.put("TAUX", Math.round((montanttp * 100) / montantvente));
                        jsonarray.put(ob);
                    }

                }

                js.put("message", "<span style='font-size:14px;'>" + message + "</span>");
                js.put("success", (message.length() > 1 ? 1 : 0));
                js.put("datatierspayant", jsonarray);

                int _reste = (montantvente - int_PART_TIERSPAYANT);
                // pour une vente assurance la remise s'applique à la part tu client
                if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("2")) {

                    getRemise(OTPreenregistrement, _reste);

                }
                result = (_reste > 0 ? montantvente - int_PART_TIERSPAYANT : 0);
                result = Maths.arrondiModuloOfNumber(result, 5);
                OTPreenregistrement.setIntCUSTPART((result > 4 ? result : 0));

            } else {
                js.put("datatierspayant", jsonarray);
                result = montantvente;
                getRemise(OTPreenregistrement, montantvente);
            }
            js.put("partTP", (int_PART_TIERSPAYANT - RemiseCarnet));
            map.put(result, js);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return map;
    }
    // montant a payer sans les emplacement para

    private Map<Integer, JSONObject> verificationConsommationWithDiscountExclude(JSONArray array,
            TPreenregistrement OTPreenregistrement) {
        Map<Integer, JSONObject> map = new HashMap<>();
        int result = 0, int_PART_TIERSPAYANT = 0;

        TTiersPayant payant;
        TCompteClientTiersPayant tc;
        int int_TAUX = 0;
        int RemiseCarnet = 0;
        JSONObject js = new JSONObject();
        JSONArray jsonarray = new JSONArray();
        try {
            int montantvente = OTPreenregistrement.getIntPRICE();
            int montantpara = montantvente - OTPreenregistrement.getIntACCOUNT();
            if (!OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)) {
                String message = "";
                if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_AVEC_CARNET)) {
                    RemiseCarnet = getRemise(OTPreenregistrement, montantvente, montantpara);
                }
                for (int idx = 0; idx < array.length(); idx++) {
                    int montant = 0;
                    double montanttp = 0;
                    JSONObject json = array.getJSONObject(idx);

                    tc = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class, json.get("IDCMPT"));
                    payant = tc.getLgTIERSPAYANTID();
                    int plafondClient = tc.getDblPLAFOND().intValue();
                    int encoursClient = tc.getDbPLAFONDENCOURS();
                    int plafondTp = payant.getDblPLAFONDCREDIT().intValue();

                    int_TAUX = Integer.valueOf(json.get("TAUX") + "");

                    montant = ((Double) Math.ceil(((Double.valueOf(montantvente) * int_TAUX) / 100))).intValue();
                    if ((plafondClient > 0) && (montant > plafondClient)) {
                        int _montant = 0;
                        if (encoursClient > 0 && (tc.getDbCONSOMMATIONMENSUELLE() + plafondClient) > encoursClient) {
                            _montant = (encoursClient - tc.getDbCONSOMMATIONMENSUELLE());
                        } else {
                            _montant = plafondClient;
                        }

                        if (plafondTp > 0 && (payant.getDbCONSOMMATIONMENSUELLE() + _montant) > plafondTp) {
                            int _montanttp = (plafondTp - payant.getDbCONSOMMATIONMENSUELLE());
                            montanttp = _montanttp;
                            int_PART_TIERSPAYANT += montanttp;

                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + (payant.getDblPLAFONDCREDIT().intValue() - payant.getDbCONSOMMATIONMENSUELLE())
                                    + " FCFA</span><br/> .Son plafond est atteint.<br/> ";
                        } else {
                            // montanttp=tc.getDblPLAFOND().intValue();
                            montanttp = _montant;

                            int_PART_TIERSPAYANT += montanttp;

                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + montanttp + " FCFA</span><br/> qui est le plafond de la vente.<br/>";

                        }

                    } else {
                        int _montant = 0;

                        if (encoursClient > 0 && (tc.getDbCONSOMMATIONMENSUELLE() + montant) > encoursClient) {
                            _montant = (encoursClient - tc.getDbCONSOMMATIONMENSUELLE());
                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + _montant + " FCFA</span> votre plafond est atteint.<br/>";
                        } else {
                            _montant = montant;
                        }

                        if (plafondTp > 0 && (payant.getDbCONSOMMATIONMENSUELLE() + _montant) > plafondTp) {
                            montanttp = (plafondTp - payant.getDbCONSOMMATIONMENSUELLE());
                            int_PART_TIERSPAYANT += montanttp;
                            message += "Le tierspayant: <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + payant.getStrNAME()
                                    + "</span> ne peut prendre en compte <span style='font-weight:900;color:blue;text-decoration: underline;'>"
                                    + montanttp + " FCFA</span><br/> Son plafond est atteint.<br/>";
                        } else {

                            montanttp = _montant;
                            int_PART_TIERSPAYANT += montanttp;

                        }

                    }

                    JSONObject ob = new JSONObject();
                    ob.put("LGCOMPTECLIENT", tc.getLgCOMPTECLIENTTIERSPAYANTID());
                    ob.put("LGPreenregistrement", OTPreenregistrement.getLgPREENREGISTREMENTID());
                    ob.put("REFBON", json.get("REFBON"));

                    if ((montantvente - int_PART_TIERSPAYANT) <= 0) {
                        double nettp = (montantvente - (int_PART_TIERSPAYANT - montanttp));

                        ob.put("tpnet", nettp);
                        ob.put("DISCOUNT", RemiseCarnet);
                        ob.put("TAUX", Math.round((nettp * 100) / montantvente));
                        jsonarray.put(ob);

                        break;
                    } else {

                        ob.put("tpnet", montanttp);
                        ob.put("DISCOUNT", RemiseCarnet);
                        ob.put("TAUX", Math.round((montanttp * 100) / montantvente));
                        jsonarray.put(ob);
                    }

                }

                js.put("message", "<span style='font-size:14px;'>" + message + "</span>");
                js.put("success", (message.length() > 1 ? 1 : 0));
                js.put("datatierspayant", jsonarray);

                int _reste = (montantvente - int_PART_TIERSPAYANT);
                // pour une vente assurance la remise s'applique à la part tu client
                if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("2")) {

                    getRemise(OTPreenregistrement, _reste);

                }
                result = (_reste > 0 ? montantvente - int_PART_TIERSPAYANT : 0);
                result = Maths.arrondiModuloOfNumber(result, 5);
                OTPreenregistrement.setIntCUSTPART((result > 4 ? result : 0));

            } else {
                js.put("datatierspayant", jsonarray);
                result = montantvente;

                getRemise(OTPreenregistrement, montantvente, montantpara);
            }

            js.put("partTP", (int_PART_TIERSPAYANT - RemiseCarnet));
            map.put(result, js);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return map;
    }

    private Integer getRemise(TPreenregistrement OTPreenregistrement, Integer amount) {
        TRemise OTRemise = this.GetRemiseToApply(OTPreenregistrement.getLgREMISEID());
        Integer int_TOTAL_REMISE = 0;
        if (OTRemise != null) {
            if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equals(Parameter.TYPE_REMISE_CLIENT)) {
                int_TOTAL_REMISE = (int) ((amount * OTRemise.getDblTAUX()) / 100);
            } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equals(Parameter.TYPE_REMISE_PRODUCT)) {
                int int_REMISE = 0;
                List<TPreenregistrementDetail> lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                    TGrilleRemise OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(
                            OTPreenregistrementDetail.getLgPREENREGISTREMENTID(),
                            OTPreenregistrementDetail.getLgFAMILLEID());
                    if (OTGrilleRemise != null) {
                        int_REMISE = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTGrilleRemise.getDblTAUX())
                                / 100);
                        int_TOTAL_REMISE += int_REMISE;
                        OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                        OTPreenregistrementDetail.setIntPRICEREMISE(int_REMISE);
                        this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
                    }

                }
            }

            OTPreenregistrement.setIntPRICEREMISE(int_TOTAL_REMISE);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
        }
        return int_TOTAL_REMISE;
    }

    private Integer getRemise(TPreenregistrement OTPreenregistrement, Integer amount, Integer para) {
        TRemise OTRemise = this.GetRemiseToApply(OTPreenregistrement.getLgREMISEID());
        Integer int_TOTAL_REMISE = 0, int_REMISE_PARA = 0;
        if (OTRemise != null) {
            if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equals(Parameter.TYPE_REMISE_CLIENT)) {
                int_TOTAL_REMISE = (int) ((amount * OTRemise.getDblTAUX()) / 100);
                int_REMISE_PARA = (int) ((para * OTRemise.getDblTAUX()) / 100);
            } else if (OTRemise.getLgTYPEREMISEID().getLgTYPEREMISEID().equals(Parameter.TYPE_REMISE_PRODUCT)) {
                int int_REMISE = 0;
                List<TPreenregistrementDetail> lstTPreenregistrementDetail = this.getTPreenregistrementDetail(
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
                for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                    TGrilleRemise OTGrilleRemise = this.GrilleRemiseRemiseFromWorkflow(
                            OTPreenregistrementDetail.getLgPREENREGISTREMENTID(),
                            OTPreenregistrementDetail.getLgFAMILLEID());
                    if (OTGrilleRemise != null) {
                        int_REMISE = (int) ((OTPreenregistrementDetail.getIntPRICE() * OTGrilleRemise.getDblTAUX())
                                / 100);
                        int_TOTAL_REMISE += int_REMISE;
                        if (!OTPreenregistrementDetail.getBoolACCOUNT()) {
                            int_REMISE_PARA += int_REMISE;
                        }
                        OTPreenregistrementDetail.setLgGRILLEREMISEID(OTGrilleRemise.getLgGRILLEREMISEID());
                        OTPreenregistrementDetail.setIntPRICEREMISE(int_REMISE);
                        this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
                    }

                }
            }

            OTPreenregistrement.setIntPRICEREMISE(int_TOTAL_REMISE);
            OTPreenregistrement.setIntREMISEPARA(int_REMISE_PARA);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
        }
        return int_TOTAL_REMISE;
    }

    public boolean CloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, TCompteClient OTCompteClient, String str_FIRST_NAME_FACTURE,
            String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE, String lg_USER_VENDEUR_ID, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, TModeReglement OTModeReglement, int int_TAUX_CHANGE,
            Integer int_TOTAL_VENTE_RECAP, String str_NOM) throws JSONException {

        TPreenregistrement OTPreenregistrement;
        TParameters KEY_TAKE_INTO_ACCOUNT;
        TUser OTUserVendeur;
        boolean result = false;
        try {
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);

            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Référence commande inconnue");
                return result;
            }
            TTypeReglement OTTypeReglement = this.getOdataManager().getEm().getReference(TTypeReglement.class,
                    lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Type de règlement inexistant");
                return result;
            }
            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                    .getPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID()); // code ajouté

            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);
            this.getOdataManager().getEm().getTransaction().begin();
            TReglement OTReglement = createTReglement(
                    (OTCompteClient != null ? OTCompteClient.getLgCOMPTECLIENTID() : ""), lg_PREENREGISTREMENT_ID,
                    str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_LIEU, OTModeReglement, int_TAUX_CHANGE,
                    int_TOTAL_VENTE_RECAP, str_NOM, new Date(), true);
            if (OTReglement == null) {
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }

                // this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
                return result;
            }

            OTPreenregistrement.setBWITHOUTBON(false);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);

            // OTTypeReglement = this.getTTypeReglement(lg_TYPE_REGLEMENT_ID);
            OTPreenregistrement.setLgREGLEMENTID(OTReglement);

            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());

            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));
            // OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            OTPreenregistrement.setStrINFOSCLT((OTCompteClient != null ? OTCompteClient.getLgCOMPTECLIENTID() : ""));

            Integer montant = lstTPreenregistrementDetail.stream().mapToInt((value) -> {
                return value.getIntPRICE();
            }).sum();
            OTPreenregistrement.setIntPRICE(montant);

            OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
            try {
                KEY_TAKE_INTO_ACCOUNT = this.getOdataManager().getEm().getReference(TParameters.class,
                        "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null
                        && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {
                    OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntACCOUNT());
                }
            } catch (Exception e) {
            }

            // result = this.cloturerVente(OTPreenregistrement, lstTPreenregistrementDetail, OTTypeVente, OTReglement,
            // OTTypeReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS, 0, OTCompteClient, lg_USER_VENDEUR_ID, 0);
            result = this.cloturerVente(OTPreenregistrement, OTTypeVente, OTReglement, OTTypeReglement, int_AMOUNT_RECU,
                    int_AMOUNT_REMIS, 0, OTCompteClient, lg_USER_VENDEUR_ID, 0);
            TEmplacement em = this.getOTUser().getLgEMPLACEMENTID();
            if ("1".equals(em.getLgEMPLACEMENTID())) {
                executeStoreProcedure(OTPreenregistrement.getLgPREENREGISTREMENTID());
            } else {
                executeStoreProcedureDepot(OTPreenregistrement.getLgPREENREGISTREMENTID());
            }
            //

            this.closureProductVente(OTPreenregistrement.getLgPREENREGISTREMENTID()); // enregistrement de la cloture
                                                                                      // des produits

            // new begin hier
            // executeStoreProcedure(OTPreenregistrement.getLgPREENREGISTREMENTID());
            this.getOdataManager().getEm().getTransaction().commit();
            this.getOdataManager().getEm().clear();

            this.buildSuccesTraceMessage("Operation effectuée avec succes");

            //
            try {
                if ("1".equals(em.getLgEMPLACEMENTID())) {
                    updateStock(lstTPreenregistrementDetail);
                }

            } catch (Exception e) {

                e.printStackTrace();
                this.buildSuccesTraceMessage("Operation effectuée avec succes");

            }
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();

            }
            this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
            e.printStackTrace();
        }
        return result;
    }

    private void executeStoreProcedure(String ID) {
        try {
            StoredProcedureQuery q = this.getOdataManager().getEm().createStoredProcedureQuery("proc_vente");
            // q.setHint(QueryHints.PESSIMISTIC_LOCK, PessimisticLock.NoLock);
            q.setHint("javax.persistence.query.timeout", 10000);
            q.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
            q.setParameter(1, ID);

            q.execute();
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private void executeStoreProcedureDepot(String ID) {
        try {
            StoredProcedureQuery q = this.getOdataManager().getEm().createStoredProcedureQuery("proc_ventedepot");
            // q.setHint(QueryHints.PESSIMISTIC_LOCK, PessimisticLock.NoLock);
            q.setHint("javax.persistence.query.timeout", 10000);
            q.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
            q.setParameter(1, ID);

            q.execute();
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public JSONObject cloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, String lg_COMPTE_CLIENT_ID, String str_FIRST_NAME_FACTURE,
            String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE, String str_NUMERO_SECURITE_SOCIAL,
            String lg_USER_VENDEUR_ID, boolean b_WITHOUT_BON, JSONArray tierspayantsda, int int_TAUX, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, TModeReglement OTModeReglement, int int_TAUX_CHANGE,
            Integer int_TOTAL_VENTE_RECAP, String str_NOM, Integer partTP) {

        JSONObject result = new JSONObject();
        TParameters OTParameters;
        TCompteClient OTCompteClient;
        TPreenregistrement OTPreenregistrement;
        TUser OTUserVendeur;
        TParameters KEY_TAKE_INTO_ACCOUNT;
        try {

            OTParameters = getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);

            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente", "Ref commande inconnue");
                result.put("statut", 0).put("message", "Impossible de valider la vente, Ref commande inconnue");
                return result;
            }

            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                                        // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage("Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                result.put("statut", 0).put("message",
                        "Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                return result;
            }

            try {
                OTCompteClient = this.getOdataManager().getEm().getReference(TCompteClient.class, lg_COMPTE_CLIENT_ID);
            } catch (Exception e) {
                OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);
            }

            if (OTCompteClient == null) {
                this.buildErrorTraceMessage("Impossible de terminer la vente. Client inexistant");

                result.put("statut", 0).put("message", "Impossible de terminer la vente. Veuillez ajouter un compte");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            }

            TTypeReglement OTTypeReglement = this.getOdataManager().getEm().getReference(TTypeReglement.class,
                    lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement == null) {
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                result.put("statut", 0).put("message", "Impossible de valider la vente. Type de règlement inexistant");
                this.buildErrorTraceMessage("Impossible de valider la vente. Type de règlement inexistant");
                return result;
            }
            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                    .getPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID()); // code ajouté

            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && b_WITHOUT_BON) { // si valeur 0, on passe en cloture
                                                                                     // manuelle
                this.buildErrorTraceMessage(
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
                result.put("statut", 0).put("message",
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            }
            this.getOdataManager().getEm().getTransaction().begin();

            TReglement OTReglement = createTReglement(lg_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, str_BANQUE,
                    str_LIEU, str_CODE_MONNAIE, str_LIEU, OTModeReglement, int_TAUX_CHANGE, int_TOTAL_VENTE_RECAP,
                    str_NOM, new Date(), true);
            if (OTReglement == null) {
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                result.put("statut", 0).put("message",
                        "Impossible de clôturer la vente. Le reglement na pas ete effectue");
                this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
                return result;
            }

            int statut = this.createPreenregistrementCompteClientTierspayant(tierspayantsda, OTPreenregistrement,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, b_WITHOUT_BON);
            switch (statut) {
            case 1:
                // result.put("statut", 1).put("message", "Impossible de terminer la vente. Vous n'êtes pas autorisé à
                // faire une vente sans bon");
                break;
            case 2:
                result.put("statut", 0).put("message", "Veuillez saisir une référence de bon pour le tiers payant ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            case 3:
                result.put("statut", 0).put("message", "Le bon est déjà utilisé ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            case 4:
                result.put("statut", 0).put("message", "Impossible de terminer la vente ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            }
            OTPreenregistrement.setBWITHOUTBON(b_WITHOUT_BON);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);

            OTPreenregistrement.setLgREGLEMENTID(OTReglement);
            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));
            // OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            Integer montant = lstTPreenregistrementDetail.stream().mapToInt((value) -> {
                return value.getIntPRICE();
            }).sum();

            System.out.println("***********************************  map to int **************-------------> " + montant
                    + " ------------------");
            OTPreenregistrement.setIntPRICE(montant);
            OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
            try {
                KEY_TAKE_INTO_ACCOUNT = this.getOdataManager().getEm().getReference(TParameters.class,
                        "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null
                        && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {
                    OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntACCOUNT());
                }
            } catch (Exception e) {
            }

            // boolean bool = this.cloturerVente(OTPreenregistrement, lstTPreenregistrementDetail, OTTypeVente,
            // OTReglement, OTTypeReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS, partTP, OTCompteClient,
            // lg_USER_VENDEUR_ID, 0);
            boolean bool = this.cloturerVente(OTPreenregistrement, OTTypeVente, OTReglement, OTTypeReglement,
                    int_AMOUNT_RECU, int_AMOUNT_REMIS, partTP, OTCompteClient, lg_USER_VENDEUR_ID, 0);
            if (bool == false) {
                result.put("statut", 0).put("message", "Impossible de terminer la vente ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            }
            TEmplacement em = this.getOTUser().getLgEMPLACEMENTID();
            if ("1".equals(em.getLgEMPLACEMENTID())) {
                executeStoreProcedure(OTPreenregistrement.getLgPREENREGISTREMENTID());
            } else {
                executeStoreProcedureDepot(OTPreenregistrement.getLgPREENREGISTREMENTID());
            }

            // executeStoreProcedure(OTPreenregistrement.getLgPREENREGISTREMENTID());
            this.closureProductVente(OTPreenregistrement.getLgPREENREGISTREMENTID()); // enregistrement de la cloture
                                                                                      // des produits

            // new begin hier
            updateSnapshotVenteSociete(lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID);
            this.getOdataManager().getEm().getTransaction().commit();
            this.getOdataManager().getEm().clear();

            this.buildSuccesTraceMessage("Operation effectuée avec succes");
            result.put("statut", 1).put("message", "Operation effectuée avec succes ");
            //
            try {
                if ("1".equals(em.getLgEMPLACEMENTID())) {
                    updateStock(lstTPreenregistrementDetail);
                }

            } catch (Exception e) {
                e.printStackTrace();
                if (result.getInt("statut") == 1) {

                }
            }

            return result;
        } catch (Exception e) {
            e.printStackTrace();

            this.buildErrorTraceMessage("Echec de clôture de la vente à crédit. Veuillez réessayer svp!");

            try {

                result.put("statut", 0).put("message",
                        "Echec de clôture de la vente à crédit. Veuillez réessayer svp!");
            } catch (JSONException ex) {
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
            }

        }

        return result;
    }

    public TReglement createTReglement(String str_REF_COMPTE_CLIENT, String str_REF_RESSOURCE, String str_BANQUE,
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
                // this.buildErrorTraceMessage(OcaisseManagement.getDetailmessage());
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
            OTReglement.setStrSTATUT(OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")
                    ? commonparameter.statut_differe : commonparameter.statut_is_Closed);
            this.getOdataManager().getEm().persist(OTReglement);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTReglement;
    }

    public void updateSnapshotVenteSociete(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_ID) {

        try {
            Object o = this.getOdataManager().getEm().createNativeQuery("CALL `proc_populatestatventesociete`(?1)")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).getSingleResult();

            if ("".equals(lg_COMPTE_CLIENT_ID)) {
                lg_COMPTE_CLIENT_ID = getCOMPTECLIENTID(lg_PREENREGISTREMENT_ID);
            }
            o = this.getOdataManager().getEm().createNativeQuery("CALL `proc_clientventetrigger`(?1,?2)")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(2, lg_PREENREGISTREMENT_ID).getSingleResult();

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

    public int createPreenregistrementCompteClientTierspayant(JSONArray data, TPreenregistrement OTPreenregistrement,
            int int_AMOUNT_REMIS, int int_AMOUNT_RECU, boolean b_WITHOUT_BON) {
        TCompteClientTiersPayant OTCompteClientTiersPayant = null;
        int int_RESTE = 0, int_CURRENT_PART_TIERSPAYANT = 0, int_PERCENT_INIT = 100, int_PERCENT = 0;

        int result = 1;
        try {

            for (int k = 0; k < data.length(); k++) {
                JSONObject json = data.getJSONObject(k);
                int_CURRENT_PART_TIERSPAYANT = (Integer.valueOf(json.getInt("tpnet") + "")
                        - Integer.valueOf(json.getInt("DISCOUNT") + ""));

                OTCompteClientTiersPayant = this.getOdataManager().getEm().find(TCompteClientTiersPayant.class,
                        json.getString("LGCOMPTECLIENT"));

                if (OTCompteClientTiersPayant != null) {

                    // controle de la reference de bon
                    if (!b_WITHOUT_BON && "".equals(json.getString("REFBON"))) {
                        this.buildErrorTraceMessage("Veuillez saisir une référence de bon pour le tiers payant "
                                + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                        return 2;
                    }

                    if (this.checkRefBonIsUse(json.getString("REFBON"), OTCompteClientTiersPayant,
                            commonparameter.statut_is_Closed)) {

                        return 3;
                    }

                    if (!this.createPreenregistrementCompteClientTiersPayent(OTPreenregistrement,
                            OTCompteClientTiersPayant, json.getInt("TAUX"), int_CURRENT_PART_TIERSPAYANT,
                            int_CURRENT_PART_TIERSPAYANT, json.getString("REFBON"), k)) {
                        return 4;
                    }

                }

            }

        } catch (Exception e) {

            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la part des tiers payants à la vente en cours");
            return 0;
        }
        return result;
    }

    // code reecrit le 13/10/2017 à 00:30
    public boolean cloturerVente(TPreenregistrement OTPreenregistrement,
            List<TPreenregistrementDetail> lstTPreenregistrementDetail, TTypeVente OTTypeVente, TReglement OTReglement,
            TTypeReglement OTTypeReglement, int int_AMOUNT_RECU, int int_AMOUNT_REMIS, int int_PART_TIERSPAYANT,
            TCompteClient OTCompteClient, String lg_USER_VENDEUR_ID, int int_TAUX) {
        boolean result = false;

        String lg_MOTIF_REGLEMENT_ID = "1";
        try {

            if (!this.saveCashOfPurchase(OTTypeVente, OTPreenregistrement, OTReglement,
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)
                            ? OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()
                            : (int_TAUX == 100 ? 0
                                    : (OTPreenregistrement.getIntCUSTPART()
                                            - OTPreenregistrement.getIntPRICEREMISE() >= 0
                                                    ? OTPreenregistrement.getIntCUSTPART()
                                                            - OTPreenregistrement.getIntPRICEREMISE()
                                                    : 0)),
                    int_AMOUNT_RECU, int_AMOUNT_REMIS, OTTypeReglement.getLgTYPEREGLEMENTID(), OTCompteClient,
                    lg_MOTIF_REGLEMENT_ID, int_PART_TIERSPAYANT, int_TAUX)) { // encaissement
                return result;
            }

            this.closureProductVente(OTPreenregistrement, lstTPreenregistrementDetail, 0); // enregistrement de la
                                                                                           // cloture des produits

            this.buildSuccesTraceMessage("Vente terminée avec succès");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente. Veuillez réessayer svp!");
        }
        return result;
    }

    public void updateVenteDetails(String lgVENTEID) {

        try {
            StoredProcedureQuery q = this.getOdataManager().getEm().createStoredProcedureQuery("proc_updatestock");

            q.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
            q.setParameter(1, lgVENTEID);

            q.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void updateStockFamille(String lgVENTEID) {

        try {
            StoredProcedureQuery q = this.getOdataManager().getEm()
                    .createStoredProcedureQuery("proc_vente_stockfamille");

            q.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter(2, String.class, ParameterMode.IN);
            q.setParameter(1, lgVENTEID);
            q.setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());

            q.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public int closureProductVente(String lgIDVENTE) {

        try {
            updateVenteDetails(lgIDVENTE);
            updateStockFamille(lgIDVENTE);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0;
    }

    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID) {
        TFamilleStock OTProductItemStock = null;
        try {

            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setMaxResults(1).setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());

            OTProductItemStock = (TFamilleStock) qry.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Produit inexistant");
        }
        return OTProductItemStock;
    }

    public int articleStatusSuggestion(String lgFamilleID) {
        int status = 0;

        try {

            long count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o)  FROM TSuggestionOrderDetails o WHERE o.strSTATUT='is_Process' AND o.lgFAMILLEID.lgFAMILLEID =?1 ")
                    .setParameter(1, lgFamilleID).setMaxResults(1).getSingleResult();

            if (count > 0) {
                status = 1;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return status;

    }

    public void updateStock(List<TPreenregistrementDetail> OTPreenregistrementDetail) {
        suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());

        try {
            OTPreenregistrementDetail.forEach((t) -> {
                TFamille famille = t.getLgFAMILLEID();
                TFamilleStock OTProductItemStock = getTProductItemStock(famille.getLgFAMILLEID());
                this.getOdataManager().getEm().refresh(OTProductItemStock);
                if (famille.getBoolDECONDITIONNE() == 0
                        && (famille.getBCODEINDICATEUR() == null || famille.getBCODEINDICATEUR() == 0)) {
                    OsuggestionManagement.makeSuggestionAuto(OTProductItemStock, famille);

                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public boolean cloturerVente(TPreenregistrement OTPreenregistrement, TTypeVente OTTypeVente, TReglement OTReglement,
            TTypeReglement OTTypeReglement, int int_AMOUNT_RECU, int int_AMOUNT_REMIS, int int_PART_TIERSPAYANT,
            TCompteClient OTCompteClient, String lg_USER_VENDEUR_ID, int int_TAUX) {
        boolean result = false;

        String lg_MOTIF_REGLEMENT_ID = "1";
        try {

            if (!this.saveCashOfPurchase(OTTypeVente, OTPreenregistrement, OTReglement,
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equalsIgnoreCase(Parameter.VENTE_COMPTANT)
                            ? OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()
                            : (int_TAUX == 100 ? 0
                                    : (OTPreenregistrement.getIntCUSTPART()
                                            - OTPreenregistrement.getIntPRICEREMISE() >= 0
                                                    ? OTPreenregistrement.getIntCUSTPART()
                                                            - OTPreenregistrement.getIntPRICEREMISE()
                                                    : 0)),
                    int_AMOUNT_RECU, int_AMOUNT_REMIS, OTTypeReglement.getLgTYPEREGLEMENTID(), OTCompteClient,
                    lg_MOTIF_REGLEMENT_ID, int_PART_TIERSPAYANT, int_TAUX)) { // encaissement
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            }

            this.buildSuccesTraceMessage("Vente terminée avec succès");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture de la vente. Veuillez réessayer svp!");
        }
        return result;
    }

    // cloture vno avec suggestion en indifféré
    public boolean cloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, TCompteClient OTCompteClient, String str_FIRST_NAME_FACTURE,
            String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE, String lg_USER_VENDEUR_ID, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, TModeReglement OTModeReglement, int int_TAUX_CHANGE,
            Integer int_TOTAL_VENTE_RECAP, String str_NOM) throws JSONException {

        TPreenregistrement OTPreenregistrement = null;

        TUser OTUserVendeur;
        boolean result = false;
        try {
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);

            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Référence commande inconnue");
                return result;
            }

            TTypeReglement OTTypeReglement = this.getOdataManager().getEm().getReference(TTypeReglement.class,
                    lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Type de règlement inexistant");
                return result;
            }
            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                    .getPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID()); // code ajouté

            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);
            this.getOdataManager().getEm().getTransaction().begin();

            TReglement OTReglement = createTReglement(
                    (OTCompteClient != null ? OTCompteClient.getLgCOMPTECLIENTID() : ""), lg_PREENREGISTREMENT_ID,
                    str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_LIEU, OTModeReglement, int_TAUX_CHANGE,
                    int_TOTAL_VENTE_RECAP, str_NOM, new Date(), true);
            if (OTReglement == null) {
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
                return result;
            }

            OTPreenregistrement.setBWITHOUTBON(false);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);

            // OTTypeReglement = this.getTTypeReglement(lg_TYPE_REGLEMENT_ID);
            OTPreenregistrement.setLgREGLEMENTID(OTReglement);

            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));
            // OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            // result = this.cloturerVente(OTPreenregistrement, lstTPreenregistrementDetail, OTTypeVente, OTReglement,
            // OTTypeReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS, 0, OTCompteClient, lg_USER_VENDEUR_ID, 0);
            this.cloturerVente(OTPreenregistrement, OTTypeVente, OTReglement, OTTypeReglement, int_AMOUNT_RECU,
                    int_AMOUNT_REMIS, 0, OTCompteClient, lg_USER_VENDEUR_ID, 0);
            executeStoreProcedure(OTPreenregistrement.getLgPREENREGISTREMENTID());
            this.closureProductVente(OTPreenregistrement.getLgPREENREGISTREMENTID()); // enregistrement de la cloture
                                                                                      // des produits

            // new begin hier
            this.getOdataManager().getEm().getTransaction().commit();
            this.getOdataManager().getEm().clear();

            this.buildSuccesTraceMessage("Operation effectuée avec succes");
            return true;
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();

            }
            this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
            e.printStackTrace();
        }
        return result;
    }

    public void updateStock(String OTPreenregistrement) {
        suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());

        try {
            List<TPreenregistrementDetail> OTPreenregistrementDetail = this
                    .getPreenregistrementDetail(OTPreenregistrement);
            String emplacementId = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            OTPreenregistrementDetail.forEach((t) -> {
                TFamille famille = t.getLgFAMILLEID();
                TFamilleStock OTProductItemStock = getTProductItemStock(famille.getLgFAMILLEID(), emplacementId);

                if (famille.getBoolDECONDITIONNE() == 0 && famille.getBCODEINDICATEUR() != 1) {

                    OsuggestionManagement.makeSuggestionAuto(OTProductItemStock, famille);// 15102017 21:15
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();

            }
        }

    }

    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID, String lg_EMPLACEMENT_ID) {
        TFamilleStock OTProductItemStock = null;

        try {
            OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable'")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_EMPLACEMENT_ID).setMaxResults(1)
                    .getSingleResult();
            this.getOdataManager().getEm().refresh(OTProductItemStock);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTProductItemStock;
    }

    public JSONObject validateVO(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, TTypeVente OTTypeVente,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, TCompteClient OTCompteClient, String str_FIRST_NAME_FACTURE,
            String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE, String str_NUMERO_SECURITE_SOCIAL,
            String lg_USER_VENDEUR_ID, boolean b_WITHOUT_BON, JSONArray tierspayantsda, int int_TAUX, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, TModeReglement OTModeReglement, int int_TAUX_CHANGE,
            Integer int_TOTAL_VENTE_RECAP, String str_NOM, Integer partTP) {

        int int_total_remise_convert = 0;
        Double dbl_Amount = 0.0, dbl_PART_TIERSPAYANT = 0.0;
        JSONObject result = new JSONObject();
        TParameters OTParameters = null;

        TPreenregistrement OTPreenregistrement = null;
        TUser OTUserVendeur;
        try {

            OTParameters = getParameter(Parameter.KEY_ACTIVATE_VENTE_WITHOUT_BON);
            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);

            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente", "Ref commande inconnue");
                result.put("statut", 0).put("message", "Impossible de valider la vente, Ref commande inconnue");
                return result;
            }

            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                                        // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage("Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                result.put("statut", 0).put("message",
                        "Paramètre d'autorisation de saisie de ventes sans bon inexistant");
                return result;
            }

            if (OTCompteClient == null) {
                this.buildErrorTraceMessage("Impossible de terminer la vente. Client inexistant");

                result.put("statut", 0).put("message", "Impossible de terminer la vente. Veuillez ajouter un compte");
                return result;
            }

            TTypeReglement OTTypeReglement = this.getOdataManager().getEm().getReference(TTypeReglement.class,
                    lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente. Type de règlement inexistant");
                return result;
            }
            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                    .getPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID()); // code ajouté

            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && b_WITHOUT_BON) { // si valeur 0, on passe en cloture
                                                                                     // manuelle
                this.buildErrorTraceMessage(
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
                result.put("statut", 0).put("message",
                        "Impossible de terminer la vente. Vous n'êtes pas autorisé à faire une vente sans bon");
                return result;
            }
            this.getOdataManager().getEm().getTransaction().begin();

            TReglement OTReglement = createTReglement(OTCompteClient.getLgCOMPTECLIENTID(), lg_PREENREGISTREMENT_ID,
                    str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_LIEU, OTModeReglement, int_TAUX_CHANGE,
                    int_TOTAL_VENTE_RECAP, str_NOM, new Date(), true);
            if (OTReglement == null) {
                this.buildErrorTraceMessage("Impossible de clôturer la vente. Le reglement na pas ete effectue");
                return result;
            }

            int statut = this.createPreenregistrementCompteClientTierspayant(tierspayantsda, OTPreenregistrement,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, b_WITHOUT_BON);
            switch (statut) {
            case 1:
                // result.put("statut", 1).put("message", "Impossible de terminer la vente. Vous n'êtes pas autorisé à
                // faire une vente sans bon");
                break;
            case 2:
                result.put("statut", 0).put("message", "Veuillez saisir une référence de bon pour le tiers payant ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            case 3:
                result.put("statut", 0).put("message", "Le bon est déjà utilisé ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            case 4:
                result.put("statut", 0).put("message", "Impossible de terminer la vente ");
                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().rollback();
                    this.getOdataManager().getEm().clear();

                }
                return result;
            }
            OTPreenregistrement.setBWITHOUTBON(b_WITHOUT_BON);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setStrTYPEVENTE(OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                    ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);

            OTPreenregistrement.setLgREGLEMENTID(OTReglement);

            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setBISAVOIR(this.isVenteAvoir(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT()));
            // OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            // boolean bool = this.cloturerVente(OTPreenregistrement, lstTPreenregistrementDetail, OTTypeVente,
            // OTReglement, OTTypeReglement, int_AMOUNT_RECU, int_AMOUNT_REMIS, partTP, OTCompteClient,
            // lg_USER_VENDEUR_ID, 0);
            boolean bool = this.cloturerVente(OTPreenregistrement, OTTypeVente, OTReglement, OTTypeReglement,
                    int_AMOUNT_RECU, int_AMOUNT_REMIS, partTP, OTCompteClient, lg_USER_VENDEUR_ID, 0);
            if (bool == false) {
                result.put("statut", 0).put("message", "Impossible de terminer la vente 1000 ");
                return result;
            }
            // new begin hier
            executeStoreProcedure(OTPreenregistrement.getLgPREENREGISTREMENTID());

            this.closureProductVente(OTPreenregistrement.getLgPREENREGISTREMENTID()); // enregistrement de la cloture
                                                                                      // des produits

            updateSnapshotVenteSociete(lg_PREENREGISTREMENT_ID, OTCompteClient.getLgCOMPTECLIENTID());
            this.getOdataManager().getEm().getTransaction().commit();
            this.getOdataManager().getEm().clear();

            this.buildSuccesTraceMessage("Operation effectuée avec succes");
            result.put("statut", 1).put("message", "Operation effectuée avec succes ");

            return result;
        } catch (Exception e) {
            // if(this.getOdataManager().getEm().getTransaction().isActive()){
            // this.getOdataManager().getEm().getTransaction().rollback();
            // this.getOdataManager().getEm().clear();
            //
            // }
            e.printStackTrace();

            this.buildErrorTraceMessage("Echec de clôture de la vente à crédit. Veuillez réessayer svp!");

            try {

                result.put("statut", 0).put("message",
                        "Echec de clôture de la vente à crédit. Veuillez réessayer svp!");
            } catch (JSONException ex) {
                Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
            }

        }

        return result;
    }

    public void removeTiersPayant(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_TIERS_PAYANT_ID) {
        this.removeTiersPayantFromVente(lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
    }

    public boolean closeVenteBon(String lg_PREENREGISTREMENT_ID) { // a decommenter en cas de probleme 22/11/2016
        boolean result = false;
        TPreenregistrement OPreenregistrement = null;
        try {
            OPreenregistrement = this.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de clôture des mises à jour de bon. Vente inexistante");
                return result;
            }

            OPreenregistrement.setDtUPDATED(new Date());
            OPreenregistrement.setBWITHOUTBON(false);
            if (this.persiste(OPreenregistrement)) {
                this.buildSuccesTraceMessage("Clôture des mises à jour de bon effectutée avec succès");
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de clôture des mises à jour de bon");
            }
        } catch (Exception e) {

            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec de clôture des mises à jour de bon. Veuillez contacter votre administrateur");
        }
        return result;
    }

    public void recoverySell() {
        List<Object[]> lst = new ArrayList<>(), lstProduct = new ArrayList<>();
        try {
            lst = this.getOdataManager().getEm().createNativeQuery(
                    "SELECT t.lg_PREENREGISTREMENT_ID, t.str_REF, t.str_REF_TICKET, m.lg_TYPE_REGLEMENT_ID, t.lg_TYPE_VENTE_ID, r.lg_REGLEMENT_ID, c.int_AMOUNT_RECU, c.int_AMOUNT_REMIS, c.str_REF_COMPTE_CLIENT, t.str_FIRST_NAME_CUSTOMER, t.str_LAST_NAME_CUSTOMER, t.str_NUMERO_SECURITE_SOCIAL, t.lg_USER_VENDEUR_ID, t.lg_USER_CAISSIER_ID "
                            + "FROM t_preenregistrement t, t_reglement r, t_mode_reglement m, t_cash_transaction c "
                            + "WHERE t.lg_PREENREGISTREMENT_ID = r.str_REF_RESSOURCE AND r.lg_MODE_REGLEMENT_ID = m.lg_MODE_REGLEMENT_ID AND c.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND t.dt_UPDATED >= '2017-01-12 18:04:59' AND t.dt_UPDATED <= '2017-01-13 16:00:59' AND t.str_STATUT = 'is_Closed' AND t.str_TYPE_VENTE = 'VNO' AND t.int_PRICE > 0 AND t.b_IS_CANCEL = false")
                    .getResultList();
            for (Object[] objects : lst) {

            }
        } catch (Exception e) {
        }
    }

    public void addCompteClient(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int int_TAUX) {
        try {
            TPreenregistrement preenregistrement = this.getOdataManager().getEm().getReference(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            TCompteClientTiersPayant clientTiersPayant = this.getOdataManager().getEm()
                    .getReference(TCompteClientTiersPayant.class, lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
            TPreenregistrementCompteClientTiersPayent clientTiersPayent = new TPreenregistrementCompteClientTiersPayent(
                    this.getKey().getComplexId());
            clientTiersPayent.setLgUSERID(this.getOTUser());
            clientTiersPayent.setDblQUOTACONSOVENTE(0.0);
            clientTiersPayent.setDtCREATED(new Date());
            clientTiersPayent.setDtUPDATED(new Date());
            clientTiersPayent.setLgPREENREGISTREMENTID(preenregistrement);
            clientTiersPayent.setLgCOMPTECLIENTTIERSPAYANTID(clientTiersPayant);
            clientTiersPayent.setIntPRICE(0);
            clientTiersPayent.setIntPERCENT(int_TAUX);
            clientTiersPayent.setStrSTATUT(commonparameter.statut_is_Process);
            clientTiersPayent.setStrSTATUTFACTURE("unpaid");
            this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().persist(clientTiersPayent);
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage("Tiers payant ajouté avec success");
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d' ajout de  Tiers payant");
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();

            }
            e.printStackTrace();
        }
    }

    public boolean updateVente(String lg_PREENREGISTREMENT_ID, String str_REF_BON) {
        boolean result = false;

        String str_REF_BON_OLD = "";
        try {
            TPreenregistrementCompteClientTiersPayent OPreenregistrement = this.getOdataManager().getEm()
                    .find(TPreenregistrementCompteClientTiersPayent.class, lg_PREENREGISTREMENT_ID);
            if (OPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Vente inexistante");
                return result;
            }

            str_REF_BON_OLD = (OPreenregistrement.getStrREFBON() != null ? OPreenregistrement.getStrREFBON() : "");
            OPreenregistrement.setDtUPDATED(new Date());
            OPreenregistrement.setStrREFBON(str_REF_BON);
            TPreenregistrement preenregistrement = OPreenregistrement.getLgPREENREGISTREMENTID();
            preenregistrement.setStrREFBON(str_REF_BON);
            if (this.merge(OPreenregistrement)) {
                this.buildSuccesTraceMessage("Numero de bon mise à jour avec succès");
                this.merge(preenregistrement);
                result = true;
                //
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du numero de bon");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du numero de bon");
        }
        return result;
    }

    public boolean closeventeBon(String lg_PREENREGISTREMENT_ID) {
        boolean result = false;
        TPreenregistrement OPreenregistrement = null;
        try {
            OPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class, lg_PREENREGISTREMENT_ID);
            if (OPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de clôture des mises à jour de bon. Vente inexistante");
                return result;
            }

            OPreenregistrement.setDtUPDATED(new Date());
            OPreenregistrement.setBWITHOUTBON(false);
            if (this.merge(OPreenregistrement)) {
                this.buildSuccesTraceMessage("Clôture des mises à jour de bon effectutée avec succès");
                result = true;
                // this.do_event_log(commonparameter.ALL, "Mise à jour du numero de bon de la vente " +
                // OPreenregistrement.getLgPREENREGISTREMENTID(). getStrREF() + ". Ancien numero: " + str_REF_BON_OLD +
                // ". Nouveau numero: " + OPreenregistrement.getStrREFBON(), this.getOTUser().getStrLOGIN(),
                // commonparameter.statut_enable, "TPreenregistrement", "Vente à crédit: Mise à jour de numero de bon.",
                // "");

            } else {
                this.buildErrorTraceMessage("Echec de clôture des mises à jour de bon");
            }
        } catch (Exception e) {

            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec de clôture des mises à jour de bon. Veuillez contacter votre administrateur");
        }
        return result;
    }

    public List<TPreenregistrementCompteClientTiersPayent> getListePreenregistrementCompteClientTiersPayent(
            String lg_PREENGISTREMENT_ID) {
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<>();
        try {
            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 ORDER BY t.intPERCENT DESC")
                    .setParameter(1, lg_PREENGISTREMENT_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstT;
    }

    List<Predicate> articlesVendusSpecialisation(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> jp, Join<TPreenregistrementDetail, TFamille> jf,
            Join<TFamille, TFamilleStock> st, String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, String lg_FAMILLE_ID, String prixachatFiltre,
            int stock, String stockFiltre, String lg_USER_ID, String rayonId) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
        predicates.add(cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
        predicates.add(cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
        predicates.add(cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0));

        if (!"".equals(lg_FAMILLE_ID)) {
            predicates.add(cb.equal(jf.get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
        }
        if (!"".equals(search_value)) {
            predicates.add(cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                    cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                    cb.like(jf.get(TFamille_.intEAN13), search_value + "%")));
        }
        if ("".equals(h_debut)) {
            predicates.add(cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin)));

        } else {
            predicates.add(cb.between(cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                    java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59")));

        }
        if (!org.apache.commons.lang3.StringUtils.isEmpty(lg_USER_ID)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                    .get(TPreenregistrement_.lgUSERCAISSIERID).get(TUser_.lgUSERID), lg_USER_ID));
        }
        if (!org.apache.commons.lang3.StringUtils.isEmpty(rayonId) && !"ALL".equals(rayonId)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), rayonId));
        }
        predicates.add(cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));

        switch (str_TYPE_TRANSACTION) {
        case Parameter.LESS:
            predicates.add(cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER));

            break;
        case Parameter.EQUAL:
            predicates.add(cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER));

            break;
        case Parameter.SEUIL:
            predicates.add(
                    cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), jf.get(TFamille_.intSEUILMIN)));

            break;
        case Parameter.MORE:
            predicates.add(cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER));

            break;
        case Parameter.MOREOREQUAL:
            predicates.add(cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER));

            break;
        case Parameter.LESSOREQUAL:
            predicates.add(cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER));

            break;
        default:
            break;
        }
        switch (prixachatFiltre) {
        case Parameter.LESS:
            predicates.add(cb.lessThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF)));

            break;
        case Parameter.EQUAL:
            predicates.add(cb.equal(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF)));

            break;
        case Parameter.MORE:
            predicates.add(cb.greaterThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF)));

            break;
        default:
            break;
        }
        switch (stockFiltre) {
        case Parameter.LESS:
            predicates.add(cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock));

            break;
        case Parameter.EQUAL:
            predicates.add(cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock));

            break;
        case Parameter.DIFF:
            predicates.add(cb.notEqual(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock));

            break;
        case Parameter.MORE:
            predicates.add(cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock));

            break;
        case Parameter.MOREOREQUAL:
            predicates.add(cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
            break;
        case Parameter.LESSOREQUAL:
            predicates.add(cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock));

            break;
        default:
            break;

        }
        return predicates;

    }
    // article venduc 28/11/2017

    public JSONObject getArticlesVendus(String search_value, boolean all, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, int start, int limit,
            String lg_FAMILLE_ID, String prixachatFiltre, int stock, String stockFiltre, String lg_USER_ID,
            String rayonId) {

        JSONObject json = new JSONObject();
        JSONArray aray = new JSONArray();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);

            cq.multiselect(jf.get(TFamille_.lgFAMILLEID), jf.get(TFamille_.strDESCRIPTION), jf.get(TFamille_.intCIP),
                    root.get(TPreenregistrementDetail_.intPRICE), root.get(TPreenregistrementDetail_.intQUANTITY),
                    root.get(TPreenregistrementDetail_.intAVOIR), jp.get(TPreenregistrement_.strREF),
                    jp.get(TPreenregistrement_.strTYPEVENTE), st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    jp.get("lgUSERID").get("strFIRSTNAME"), jp.get("lgUSERID").get("strLASTNAME"),
                    cb.function("DATE_FORMAT", String.class, jp.get(TPreenregistrement_.dtUPDATED),
                            cb.literal("%d/%m/%Y")),
                    cb.function("DATE_FORMAT", String.class, jp.get(TPreenregistrement_.dtUPDATED),
                            cb.literal("%H:%i")))
                    .distinct(true).orderBy(cb.asc(jp.get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, search_value, OdateDebut,
                    OdateFin, h_debut, h_fin, str_TYPE_TRANSACTION, int_NUMBER, lg_FAMILLE_ID, prixachatFiltre, stock,
                    stockFiltre, lg_USER_ID, rayonId);
            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);

            }
            List<Object[]> list = q.getResultList();

            list.forEach((t) -> {

                try {
                    JSONObject ob = new JSONObject();

                    ob.put("lg_FAMILLE_ID", t[0]);
                    ob.put("str_NAME", t[7]);
                    ob.put("str_DESCRIPTION", t[1]);
                    ob.put("int_CIP", t[2]);
                    ob.put("int_NUMBER_AVAILABLE", t[4]);
                    ob.put("int_NUMBER", t[8]);
                    ob.put("dt_UPDATED", t[11]);
                    ob.put("lg_ETAT_ARTICLE_ID", t[12]);
                    ob.put("int_T", t[6]);
                    ob.put("lg_AJUSTEMENTDETAIL_ID", t[9].toString().substring(0, 1) + "." + t[10]);
                    ob.put("int_PRICE", t[3]);
                    ob.put("int_AVOIR", t[5]);
                    aray.put(ob);
                } catch (JSONException ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            });
            json.put("results", aray);
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return json;
    }

    public int getArticlesVendusCount(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, String lg_FAMILLE_ID, String prixachatFiltre,
            int stock, String stockFiltre, String lg_USER_ID, String rayonId) {
        EntityManager em = this.getOdataManager().getEm();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, search_value, OdateDebut,
                    OdateFin, h_debut, h_fin, str_TYPE_TRANSACTION, int_NUMBER, lg_FAMILLE_ID, prixachatFiltre, stock,
                    stockFiltre, lg_USER_ID, rayonId);
            cq.select(cb.countDistinct(root));
            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } catch (Exception e) {
            return 0;
        }

    }

    public List<EntityData> getListeArticleVendu(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<EntityData> json = new ArrayList<>();

        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            Predicate predicate_ = cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID),
                    "6316174618995554241");

            if (!"".equals(search_value)) {

                // predicate = cb.and(predicate, cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                // cb.like(jf.get(TFamille_.intCIP), search_value + "%"), cb.like(jf.get(TFamille_.intEAN13),
                // search_value + "%")));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(
                        cb.function("DATE", Date.class, root.get(TPreenregistrementDetail_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {
                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            predicate = cb.and(predicate,
                    cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));

            switch (str_TYPE_TRANSACTION) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.SEUIL:
                Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        jf.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, SEUIL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;
            }

            cq.multiselect(jf.get(TFamille_.lgFAMILLEID), root.get(TPreenregistrementDetail_.intQUANTITY),
                    jf.get("lgGROSSISTEID").get("lgGROSSISTEID"));

            cq.where(cb.and(predicate, predicate_));
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();

            list.forEach((t) -> {

                try {
                    EntityData OEntityData = new EntityData();
                    OEntityData.setStr_value1(t[0] + "");
                    OEntityData.setStr_value8(t[1] + "");
                    OEntityData.setStr_value12(t[2] + "");
                    json.add(OEntityData);

                } catch (Exception ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            });

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return json;
    }

    public JSONObject getArticlesVendusGroup(String search_value, boolean all, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, int start, int limit,
            String prixachatFiltre, int stock, String stockFiltre) {
        JSONObject json = new JSONObject();
        JSONArray aray = new JSONArray();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            Predicate predicate = articlesGroupSpecialisation(cb, root, jp, jf, st, search_value, OdateDebut, OdateFin,
                    h_debut, h_fin, str_TYPE_TRANSACTION, int_NUMBER, prixachatFiltre, stock, stockFiltre);
            cq.multiselect(jf.get(TFamille_.lgFAMILLEID), jf.get(TFamille_.strDESCRIPTION), jf.get(TFamille_.intCIP),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    cb.sum(root.get(TPreenregistrementDetail_.intAVOIR)), st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    jf.get("lgZONEGEOID").get("strLIBELLEE")).groupBy(jf.get(TFamille_.lgFAMILLEID))
                    .orderBy(cb.asc(jf.get(TFamille_.strDESCRIPTION)));

            cq.where(predicate);
            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);

            }
            List<Object[]> list = q.getResultList();

            list.forEach((t) -> {

                try {
                    JSONObject ob = new JSONObject();

                    ob.put("lg_FAMILLE_ID", t[0]);
                    ob.put("int_CIP", t[2]);
                    ob.put("str_DESCRIPTION", t[1]);
                    ob.put("int_NUMBER_AVAILABLE", t[4]);
                    ob.put("int_PRICE", t[3]);
                    ob.put("int_NUMBER", t[6]);
                    ob.put("int_AVOIR", t[5]);
                    ob.put("lg_ZONE_GEO_ID", t[7]);

                    aray.put(ob);
                } catch (JSONException ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            });
            json.put("results", aray);
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return json;
    }

    Predicate articlesGroupSpecialisation(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> jp, Join<TPreenregistrementDetail, TFamille> jf,
            Join<TFamille, TFamilleStock> st, String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, String prixachatFiltre, int stock,
            String stockFiltre) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        Predicate predicate = cb.conjunction();
        predicate = cb.and(predicate,
                cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
        predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
        predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
        Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
        predicate = cb.and(predicate, ge);

        if (!"".equals(search_value)) {
            predicate = cb.and(predicate,
                    cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                            cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                            cb.like(jf.get(TFamille_.intEAN13), search_value + "%")));
        }
        if ("".equals(h_debut)) {
            Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
            predicate = cb.and(predicate, btw);
        } else {
            Predicate hour = cb.between(
                    cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                    java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
            predicate = cb.and(predicate, hour);
        }

        predicate = cb.and(predicate, cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
        switch (str_TYPE_TRANSACTION) {
        case Parameter.LESS:
            Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
            predicate = cb.and(predicate, LESS);
            break;
        case Parameter.EQUAL:
            Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
            predicate = cb.and(predicate, EQUAL);
            break;
        case Parameter.SEUIL:
            Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    jf.get(TFamille_.intSEUILMIN));
            predicate = cb.and(predicate, SEUIL);
            break;
        case Parameter.MORE:
            Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
            predicate = cb.and(predicate, MORE);
            break;
        case Parameter.MOREOREQUAL:
            Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
            predicate = cb.and(predicate, MOREOREQUAL);
            break;
        case Parameter.LESSOREQUAL:
            Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
            predicate = cb.and(predicate, LESSOREQUAL);
            break;
        default:
            break;
        }
        switch (prixachatFiltre) {
        case Parameter.LESS:
            Predicate LESS = cb.lessThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF));
            predicate = cb.and(predicate, LESS);
            break;
        case Parameter.EQUAL:
            Predicate EQUAL = cb.equal(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF));
            predicate = cb.and(predicate, EQUAL);
            break;
        case Parameter.MORE:
            Predicate MORE = cb.greaterThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF));
            predicate = cb.and(predicate, MORE);
            break;
        default:
            break;
        }
        switch (stockFiltre) {
        case Parameter.LESS:
            Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
            predicate = cb.and(predicate, LESS);
            break;
        case Parameter.EQUAL:
            Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
            predicate = cb.and(predicate, EQUAL);
            break;
        case Parameter.DIFF:
            Predicate DIFF = cb.notEqual(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
            predicate = cb.and(predicate, DIFF);
            break;
        case Parameter.MORE:
            Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
            predicate = cb.and(predicate, MORE);
            break;
        case Parameter.MOREOREQUAL:
            Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
            predicate = cb.and(predicate, MOREOREQUAL);
            break;
        case Parameter.LESSOREQUAL:
            Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
            predicate = cb.and(predicate, LESSOREQUAL);
            break;
        default:
            break;

        }
        return predicate;

    }

    public int getArticlesVendusGroup(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, String prixachatFiltre, int stock,
            String stockFiltre) {
        EntityManager em = this.getOdataManager().getEm();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);

            cq.select(cb.count(jf.get(TFamille_.lgFAMILLEID))).groupBy(jf.get(TFamille_.lgFAMILLEID));
            Predicate predicate = articlesGroupSpecialisation(cb, root, jp, jf, st, search_value, OdateDebut, OdateFin,
                    h_debut, h_fin, str_TYPE_TRANSACTION, int_NUMBER, prixachatFiltre, stock, stockFiltre);
            cq.where(predicate);
            Query q = em.createQuery(cq);
            return q.getResultList().size();

        } finally {
            if (em != null) {
                em.clear();

            }

        }

    }

    public List<EntityData> getArticlesVendusRecap(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<EntityData> json = new ArrayList<>();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);

            if (!"".equals(search_value)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%")),
                        cb.like(jp.get(TPreenregistrement_.strREF), search_value + "%"));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {
                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            predicate = cb.and(predicate,
                    cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));

            switch (str_TYPE_TRANSACTION) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.SEUIL:
                Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        jf.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, SEUIL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        jf.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;
            }

            cq.multiselect(jf.get(TFamille_.lgFAMILLEID), cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    jf.get("lgGROSSISTEID").get("lgGROSSISTEID")).groupBy(jf.get(TFamille_.lgFAMILLEID));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();

            list.forEach((t) -> {

                try {
                    EntityData OEntityData = new EntityData();
                    OEntityData.setStr_value1(t[0] + "");
                    OEntityData.setStr_value8(t[1] + "");
                    OEntityData.setStr_value12(t[2] + "");
                    json.add(OEntityData);
                } catch (Exception ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            });

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return json;
    }

    public JSONArray listPreenregistrements(boolean all, String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_VENTE, int start, int limit) {
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        JSONArray data = new JSONArray();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());

        try {
            final String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            if (!"".equals(str_TYPE_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strTYPEVENTE), str_TYPE_VENTE));
            }
            if (!Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgUSERID"), lg_USER_ID));
            }
            if (!"".equals(search_value)) {

                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREF), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREFTICKET), search_value + "%")));

            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {

                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            cq.select(jp).distinct(true).groupBy(jp.get(TPreenregistrement_.lgPREENREGISTREMENTID))
                    .orderBy(cb.asc(jp.get(TPreenregistrement_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);

            }

            List<TPreenregistrement> list = q.getResultList();
            boolean BTN_ANNULATION = Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_BT_ANNULER_VENTE);
            for (TPreenregistrement t : list) {

                // }
                // list.forEach((t) -> {
                List<TPreenregistrementDetail> listPreenregistrementDetail = getPreenregistrementDetail(
                        t.getLgPREENREGISTREMENTID());
                String str_Product = "";
                for (int k = 0; k < listPreenregistrementDetail.size(); k++) {
                    TPreenregistrementDetail OTPreenregistrementDetail = listPreenregistrementDetail.get(k);
                    if (OTPreenregistrementDetail != null) {
                        str_Product = "<b><span style='display:inline-block;width: 7%;'>"
                                + OTPreenregistrementDetail.getLgFAMILLEID().getIntCIP()
                                + "</span><span style='display:inline-block;width: 25%;'>"
                                + OTPreenregistrementDetail.getLgFAMILLEID().getStrDESCRIPTION()
                                + "</span><span style='display:inline-block;width: 15%;'>"
                                + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICEUNITAIR(), '.')
                                + " F CFA " + "</span><span style='display:inline-block;width: 15%;'>("
                                + ((t.getIntPRICE() >= 0) ? OTPreenregistrementDetail.getIntQUANTITY()
                                        : (-1 * OTPreenregistrementDetail.getIntQUANTITY()))
                                + ")</span></b><span style='display:inline-block;width: 15%;'>"
                                + conversion.AmountFormat(OTPreenregistrementDetail.getIntPRICE(), '.') + " F CFA "
                                + "</span><br> " + str_Product;
                    }
                }
                try {
                    JSONObject json = new JSONObject();
                    TUser lgUSERCAISSIERID = t.getLgUSERCAISSIERID();
                    TUser lgUSERVENDEURID = t.getLgUSERVENDEURID();
                    json.put("lg_PREENREGISTREMENT_ID", t.getLgPREENREGISTREMENTID());
                    json.put("str_REF", t.getStrREF());
                    json.put("lg_USER_CAISSIER_ID",
                            lgUSERCAISSIERID.getStrFIRSTNAME() + " " + lgUSERCAISSIERID.getStrLASTNAME());
                    json.put("lg_USER_VENDEUR_ID",
                            lgUSERVENDEURID.getStrFIRSTNAME() + " " + lgUSERVENDEURID.getStrLASTNAME());
                    json.put("int_PRICE", t.getIntPRICE());
                    json.put("dt_CREATED", date.formatterShort.format(t.getDtUPDATED()));
                    json.put("str_hour", date.NomadicUiFormat_Time.format(t.getDtUPDATED()));
                    json.put("str_STATUT", t.getStrSTATUT());
                    json.put("str_FAMILLE_ITEM", str_Product);
                    json.put("b_IS_CANCEL", t.getBISCANCEL());
                    json.put("bISCANCEL", t.getBISCANCEL());
                    json.put("str_TYPE_VENTE", t.getStrTYPEVENTE());
                    json.put("str_FIRST_LAST_NAME_CLIENT",
                            t.getStrFIRSTNAMECUSTOMER() + " " + t.getStrLASTNAMECUSTOMER());

                    json.put("int_PRICE_FORMAT", conversion.AmountFormat(t.getIntPRICE(), '.'));

                    if (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                            .equals(commonparameter.PROCESS_SUCCESS) && t.getIntSENDTOSUGGESTION() == 0) {
                        json.put("etat", commonparameter.PROCESS_SUCCESS);
                    }
                    json.put("int_SENDTOSUGGESTION", t.getIntSENDTOSUGGESTION());
                    json.put("BTN_ANNULATION", BTN_ANNULATION);
                    json.put("lg_EMPLACEMENT_ID", lg_EMPLACEMENT_ID);
                    json.put("lg_TYPE_VENTE_ID", t.getLgTYPEVENTEID().getLgTYPEVENTEID());
                    json.put("b_IS_AVOIR", t.getBISAVOIR());
                    json.put("dbl_AMOUNT", t.getIntPRICE());
                    data.put(json);
                } catch (JSONException ex) {
                    Logger.getLogger(Preenregistrement.class.getName()).log(Level.SEVERE, null, ex);
                }

            } /* ) */

        } catch (Exception e) {
            e.printStackTrace();
        }

        return data;
    }

    public int listPreenregistrementCount(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String str_TYPE_VENTE) {
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        EntityManager em = this.getOdataManager().getEm();
        try {
            final String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            if (!"".equals(str_TYPE_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strTYPEVENTE), str_TYPE_VENTE));
            }
            if (!Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgUSERID"), lg_USER_ID));
            }
            if (!"".equals(search_value)) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREF), search_value + "%"),
                                cb.like(jp.get(TPreenregistrement_.strREFTICKET), search_value + "%")));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {
                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            cq.select(cb.countDistinct(jp.get(TPreenregistrement_.lgPREENREGISTREMENTID)))
                    .groupBy(jp.get(TPreenregistrement_.lgPREENREGISTREMENTID));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            return q.getResultList().size();

        } finally {
            if (em != null) {

            }
        }

    }

    public TPreenregistrement createPreVente(TPreenregistrement initialTPreenregistrement, Date dt_CREATED) {
        TPreenregistrement OTPreenregistrement = new TPreenregistrement();

        try {
            OTPreenregistrement.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
            OTPreenregistrement.setLgUSERVENDEURID(initialTPreenregistrement.getLgUSERVENDEURID() != null
                    ? initialTPreenregistrement.getLgUSERVENDEURID() : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setDtCREATED(dt_CREATED);
            OTPreenregistrement.setDtUPDATED(dt_CREATED);
            OTPreenregistrement.setStrMEDECIN((initialTPreenregistrement.getStrMEDECIN() != null
                    ? initialTPreenregistrement.getStrMEDECIN() : ""));
            OTPreenregistrement.setLgNATUREVENTEID(initialTPreenregistrement.getLgNATUREVENTEID());
            OTPreenregistrement.setLgTYPEVENTEID(initialTPreenregistrement.getLgTYPEVENTEID());
            OTPreenregistrement.setStrTYPEVENTE(
                    initialTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_COMPTANT)
                            ? Parameter.KEY_VENTE_NON_ORDONNANCEE : Parameter.KEY_VENTE_ORDONNANCE);
            OTPreenregistrement.setStrREF(this.buildVenteRefBis(new Date(), Parameter.KEY_LAST_ORDER_NUMBER_VENTE));
            OTPreenregistrement.setLgREMISEID(initialTPreenregistrement.getLgREMISEID());
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(initialTPreenregistrement.getStrFIRSTNAMECUSTOMER());
            OTPreenregistrement.setStrLASTNAMECUSTOMER(initialTPreenregistrement.getStrLASTNAMECUSTOMER());
            OTPreenregistrement
                    .setStrNUMEROSECURITESOCIAL((initialTPreenregistrement.getStrNUMEROSECURITESOCIAL() != null
                            ? initialTPreenregistrement.getStrNUMEROSECURITESOCIAL() : ""));
            OTPreenregistrement.setStrPHONECUSTOME((initialTPreenregistrement.getStrPHONECUSTOME() != null
                    ? initialTPreenregistrement.getStrPHONECUSTOME() : ""));
            OTPreenregistrement.setIntPRICEREMISE((-1) * initialTPreenregistrement.getIntPRICEREMISE());
            OTPreenregistrement.setStrTYPEVENTE(initialTPreenregistrement.getStrTYPEVENTE());
            this.getOdataManager().getEm().persist(OTPreenregistrement);

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'enregistrement de la vente. Veuillez réessayer");
            new logger().OCategory.info("impossible de creer OTPreenregistrement   " + e.toString());
        }
        return OTPreenregistrement;
    }

    public boolean cloturerAnnulerVente(TPreenregistrement initialTPreenregistrement,
            TPreenregistrement OTPreenregistrement,
            List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent) {
        boolean isOk = true;
        TCompteClient OTCompteClient = null;
        TPreenregistrementCompteClient OTPreenregistrementCompteClient = null;
        int montantClient = 0;

        try {
            clientManager OclientManager = new clientManager(this.getOdataManager(), this.getOTUser());

        } catch (Exception e) {
        }
        return isOk;
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

    public void updateReelStockAnnulationDepot(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte,
            String empl) {

        TFamilleStock OTProductItemStock = null;
        TTypeStockFamille OTTypeStockFamille = null;
        try {
            OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(), empl);
            OTProductItemStock.setIntNUMBERAVAILABLE(OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte);
            OTProductItemStock.setIntNUMBER(OTProductItemStock.getIntNUMBER() - int_qte);
            OTProductItemStock.setDtUPDATED(new Date());
            OTTypeStockFamille = this.getTypeStock(OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID(), empl);
            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() - int_qte);
            this.getOdataManager().getEm().merge(OTProductItemStock);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public TTypeStockFamille getTypeStock(String lg_FAMILLE_ID, String lg_EMPLACEMENT_ID) {
        TTypeStockFamille OTProductItemStock = null;

        try {
            OTProductItemStock = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_EMPLACEMENT_ID).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTProductItemStock;
    }

    // fonction d'impression de ticket 29 04 2018
    public void lunchPrinterticketCaisse(TPreenregistrement oTPreenregistrement, String fileBarecode) {
        DriverPrinter ODriverPrinter = new DriverPrinter(this.getOdataManager(), this.getOTUser());
        List<TPreenregistrementCompteClientTiersPayent> lstT = new ArrayList<>();
        String lg_IMPRIMANTE_ID = "%%", title = "";
        List<String> lstData, lstDataFinal = new ArrayList<>();
        int counter = 40, k = 0, page = 1, pageCurrent = 0, diff = 0, counter_constante = 40;
        try {
            List<TPreenregistrementDetail> lstTPreenregistrementDetail = this
                    .getPreenregistrementDetail(oTPreenregistrement.getLgPREENREGISTREMENTID());

            TParameters OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_SHOW_NUMERO_TICKET);
            if (OTParameters != null) {
                if (Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                    title = oTPreenregistrement.getStrREF();
                } else {
                    title = oTPreenregistrement.getStrREFTICKET();
                }
            }
            // if (OTUserImprimante != null) {
            lstData = this.generateData(oTPreenregistrement, lstTPreenregistrementDetail);
            new logger().OCategory.info(lstData.size() + " ****************************** +++++++++++++++++++++++++++  "
                    + oTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID());
            ODriverPrinter.setDatasInfoSeller(this.generateDataSeller(oTPreenregistrement));
            ODriverPrinter.setType_ticket(commonparameter.str_ACTION_VENTE);
            ODriverPrinter.setDatasInfoTiersPayant(new ArrayList<>());
            if (oTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("3")
                    || oTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("2")) {
                // lstT =
                // this.getListeTPreenregistrementCompteClientTiersPayent(oTPreenregistrement.getLgPREENREGISTREMENTID());
                lstT = this.getListeTPreenregistrementCompteClientTiersPayent(
                        oTPreenregistrement.getLgPREENREGISTREMENTID(), oTPreenregistrement.getStrSTATUT());
                ODriverPrinter.setDatasInfoTiersPayant(this.generateDataTiersPayant(oTPreenregistrement, lstT));
                title = title + " | Bon N°:: " + oTPreenregistrement.getStrREFBON();
            } else if (oTPreenregistrement.getStrSTATUTVENTE().equalsIgnoreCase(commonparameter.statut_differe)
                    || oTPreenregistrement.getBISAVOIR() == true) {
                ODriverPrinter.setDatasInfoTiersPayant(this.generateDataTiersPayant(oTPreenregistrement));
            }
            ODriverPrinter.setTitle("Ticket N° " + title);

            if (lstData.size() <= counter) {
                ODriverPrinter.setDatas(lstData);
                ODriverPrinter.setDatasSubTotal(this.generateDataSummary(oTPreenregistrement));
                ODriverPrinter.setDataCommentaires(this.generateCommentaire(oTPreenregistrement));
                ODriverPrinter.setDateOperation(oTPreenregistrement.getDtUPDATED());
                ODriverPrinter.setCodeShow(true);
                ODriverPrinter.setName_code_bare(fileBarecode);
                if (lstT.size() == 0) {
                    ODriverPrinter.PrintTicketVente(1);
                } else if (oTPreenregistrement.getIntPRICE() < 0) {
                    ODriverPrinter.PrintTicketVente(1);
                } else {
                    for (int i = 0; i <= lstT.size(); i++) {
                        ODriverPrinter.PrintTicketVente(1);
                    }
                }
            } else {
                page = lstData.size() / counter;
                new logger().OCategory.info("total page----" + page);
                while (page != pageCurrent) {
                    ODriverPrinter.setDatasSubTotal(new ArrayList<>());
                    ODriverPrinter.setDataCommentaires(new ArrayList<>());
                    ODriverPrinter.setDateOperation(oTPreenregistrement.getDtUPDATED());
                    ODriverPrinter.setCodeShow(true);
                    ODriverPrinter.setName_code_bare(fileBarecode);
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(lstData.get(i));
                    }
                    ODriverPrinter.setDatas(lstDataFinal);
                    if (lstT.size() == 0) {
                        ODriverPrinter.PrintTicketVente(1);
                    } else if (oTPreenregistrement.getIntPRICE() < 0) {
                        ODriverPrinter.PrintTicketVente(1);
                    } else {
                        for (int i = 0; i <= lstT.size(); i++) {
                            ODriverPrinter.PrintTicketVente(1);
                        }
                    }
                    k = counter;
                    diff = lstData.size() - counter;
                    if (diff > counter_constante) {
                        counter = counter + counter_constante;
                    } else {
                        counter = counter + diff;
                    }
                    new logger().OCategory
                            .info("k:" + k + "|counter:" + counter + "|diff:" + diff + "pageCurrent:" + pageCurrent);
                    pageCurrent++;
                    lstDataFinal.clear();
                    new logger().OCategory.info("pageCurrent dans le while:" + pageCurrent);
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(lstData.get(i));
                    }
                    new logger().OCategory.info("pageCurrent a la fin:" + pageCurrent);
                    ODriverPrinter.setDatas(lstDataFinal);
                    ODriverPrinter.setDatasSubTotal(this.generateDataSummary(oTPreenregistrement));
                    ODriverPrinter.setDataCommentaires(this.generateCommentaire(oTPreenregistrement));
                    ODriverPrinter.setDateOperation(oTPreenregistrement.getDtUPDATED());
                    ODriverPrinter.setCodeShow(true);
                    ODriverPrinter.setName_code_bare(fileBarecode);
                }

                if (lstT.size() == 0) {
                    ODriverPrinter.PrintTicketVente(1);
                } else if (oTPreenregistrement.getIntPRICE() < 0) {
                    ODriverPrinter.PrintTicketVente(1);
                } else {
                    for (int i = 0; i <= lstT.size(); i++) {
                        ODriverPrinter.PrintTicketVente(1);
                    }
                }
            }

            this.setMessage(ODriverPrinter.getMessage());
            this.setDetailmessage(ODriverPrinter.getDetailmessage());
            // updateLot(oTPreenregistrement.getLgPREENREGISTREMENTID());

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'impression du ticket");
        }
    }

    public List<EntityData> getListeArticleVenduPourSuggestion(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String str_TYPE_TRANSACTION, int int_NUMBER, String prixachatFiltre,
            int stock, String stockFiltre) {
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<EntityData> json = new ArrayList<>();
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<EntityData> cq = cb.createQuery(EntityData.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);

            if (!"".equals(search_value)) {

                predicate = cb.and(predicate,
                        cb.or(cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                                search_value + "%"),
                                cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strDESCRIPTION),
                                        search_value + "%"),
                                cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intEAN13),
                                        search_value + "%")));
            }
            if ("".equals(h_debut)) {
                Predicate btw = cb.between(
                        cb.function("DATE", Date.class, root.get(TPreenregistrementDetail_.dtUPDATED)),
                        java.sql.Date.valueOf(OdateDebut), java.sql.Date.valueOf(OdateFin));
                predicate = cb.and(predicate, btw);
            } else {
                Predicate hour = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(OdateDebut + " " + h_debut + ":00"),
                        java.sql.Timestamp.valueOf(OdateFin + " " + h_fin + ":59"));
                predicate = cb.and(predicate, hour);
            }

            predicate = cb.and(predicate,
                    cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));

            switch (str_TYPE_TRANSACTION) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.SEUIL:
                Predicate SEUIL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE),
                        jf.get(TFamille_.intSEUILMIN));
                predicate = cb.and(predicate, SEUIL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), int_NUMBER);
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;
            }
            switch (prixachatFiltre) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF));
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF));
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF));
                predicate = cb.and(predicate, MORE);
                break;
            default:
                break;
            }
            switch (stockFiltre) {
            case Parameter.LESS:
                Predicate LESS = cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
                predicate = cb.and(predicate, LESS);
                break;
            case Parameter.EQUAL:
                Predicate EQUAL = cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
                predicate = cb.and(predicate, EQUAL);
                break;
            case Parameter.DIFF:
                Predicate DIFF = cb.notEqual(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
                predicate = cb.and(predicate, DIFF);
                break;
            case Parameter.MORE:
                Predicate MORE = cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
                predicate = cb.and(predicate, MORE);
                break;
            case Parameter.MOREOREQUAL:
                Predicate MOREOREQUAL = cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
                predicate = cb.and(predicate, MOREOREQUAL);
                break;
            case Parameter.LESSOREQUAL:
                Predicate LESSOREQUAL = cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), stock);
                predicate = cb.and(predicate, LESSOREQUAL);
                break;
            default:
                break;

            }
            cq.select(cb.construct(EntityData.class, jf.get(TFamille_.lgFAMILLEID),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    jf.get("lgGROSSISTEID").get("lgGROSSISTEID")))
                    .groupBy(jf.get(TFamille_.lgFAMILLEID), jf.get("lgGROSSISTEID").get("lgGROSSISTEID"));
            cq.where(predicate);
            Query q = em.createQuery(cq);
            json = q.getResultList();
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return json;
    }

}
