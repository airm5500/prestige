package bll.report;

import bll.common.Parameter;
import bll.configManagement.GroupeTierspayantController;
import bll.entity.EntityData;
import bll.printer.DriverPrinter;
import bll.userManagement.privilege;
import bll.utils.TparameterManager;
import dal.TBilletageDetails;
import dal.TCashTransaction;
import dal.TCashTransaction_;
import dal.TMotifReglement;
import dal.TMvtCaisse;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementCompteClient_;
import dal.TPreenregistrement_;
import dal.TReglement;
import dal.TUser;
import dal.TUser_;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.Util;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class JournalVente extends bll.bllBase {

    private final date pkey = new date();

    public JournalVente() {
        this.checkDatamanager();
    }

    public JournalVente(dataManager O) {
        this.setOdataManager(O);
        this.checkDatamanager();
    }

    public JournalVente(dataManager O, TUser OTUser) {
        this.setOdataManager(O);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    /*
     * public List<TCashTransaction> func_GetDataFromCash(Date dt_date_debut, Date dt_date_fin) {
     *
     * List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();
     *
     * lstTCashTransaction = this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TCashTransaction t WHERE t.dtCREATED > ?3  AND t.dtCREATED <= ?4") .setParameter(3,
     * dt_date_debut).setParameter(4, dt_date_fin).getResultList(); if (lstTCashTransaction == null ||
     * lstTCashTransaction.isEmpty()) { this.buildErrorTraceMessage("ERROR", "Desole pas de donnees"); //return null; }
     * for (TCashTransaction OTCashTransaction : lstTCashTransaction) { this.refresh(OTCashTransaction); new
     * logger().OCategory.info("OTCashTransaction " + OTCashTransaction.getId()); }
     *
     * return lstTCashTransaction; }
     */
    public List<TCashTransaction> func_GetDataFromCash(Date dt_date_debut, Date dt_date_fin) {

        List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();
        String OdateDebut = "", OdateFin = "";
        try {
            OdateDebut = this.getKey().DateToString(dt_date_debut, this.getKey().formatterMysql);
            OdateFin = this.getKey().DateToString(dt_date_fin, this.getKey().formatterMysql);
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT_CREDIT, lg_REGLEMENT_ID,
            // lg_MOTIF_REGLEMENT_ID FROM t_cash_transaction t WHERE t.dt_CREATED > '"+OdateDebut+"' AND t.dt_CREATED <=
            // '"+OdateFin+"'";

            String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT_CREDIT, lg_REGLEMENT_ID, lg_MOTIF_REGLEMENT_ID, SUM(int_AMOUNT) AS int_AMOUNT_TOTAL FROM t_cash_transaction t WHERE t.dt_CREATED > '"
                    + OdateDebut + "' AND t.dt_CREATED <= '" + OdateFin
                    + "' GROUP BY str_RESSOURCE_REF ORDER BY str_TYPE_VENTE, dt_CREATED DESC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TCashTransaction OTCashTransaction = new TCashTransaction();
                OTCashTransaction.setStrRESSOURCEREF(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OTCashTransaction
                        .setDtCREATED(this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OTCashTransaction.setStrTYPEVENTE(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OTCashTransaction.setIntAMOUNTCREDIT(
                        Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")));
                OTCashTransaction
                        .setIntAMOUNT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_TOTAL")));

                try {
                    TReglement OTReglement = this.getOdataManager().getEm().find(TReglement.class,
                            Ojconnexion.get_resultat().getString("lg_REGLEMENT_ID"));
                    TMotifReglement OTMotifReglement = this.getOdataManager().getEm().find(TMotifReglement.class,
                            Ojconnexion.get_resultat().getString("lg_MOTIF_REGLEMENT_ID"));
                    OTCashTransaction.setLgREGLEMENTID(OTReglement);
                    OTCashTransaction.setLgMOTIFREGLEMENTID(OTMotifReglement);
                } catch (Exception e) {
                }
                lstTCashTransaction.add(OTCashTransaction);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            // new logger().OCategory.fatal(ex.getMessage());
        }
        /*
         * lstTCashTransaction = this.getOdataManager().getEm().
         * createQuery("SELECT t FROM TCashTransaction t WHERE t.dtCREATED > ?3  AND t.dtCREATED <= ?4")
         * .setParameter(3, dt_date_debut).setParameter(4, dt_date_fin).getResultList(); if (lstTCashTransaction == null
         * || lstTCashTransaction.isEmpty()) { this.buildErrorTraceMessage("ERROR", "Desole pas de donnees"); //return
         * null; } for (TCashTransaction OTCashTransaction : lstTCashTransaction) { this.refresh(OTCashTransaction); new
         * logger().OCategory.info("OTCashTransaction " + OTCashTransaction.getId()); }
         */
        return lstTCashTransaction;
    }

    public List<TCashTransaction> func_GetDataFromCashBis(Date dt_date_debut, Date dt_date_fin) {

        List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();
        String OdateDebut = "", OdateFin = "";
        try {
            OdateDebut = this.getKey().DateToString(dt_date_debut, this.getKey().formatterMysql);
            OdateFin = this.getKey().DateToString(dt_date_fin, this.getKey().formatterMysql);
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT , lg_REGLEMENT_ID,
            // lg_MOTIF_REGLEMENT_ID, SUM(int_AMOUNT_CREDIT) AS int_AMOUNT_CREDIT , SUM(int_AMOUNT_DEBIT) AS
            // int_AMOUNT_DEBIT FROM t_cash_transaction t WHERE t.dt_CREATED > '" + OdateDebut + "' AND t.dt_CREATED <=
            // '" + OdateFin + "' AND int_AMOUNT_DEBIT <=0 GROUP BY str_RESSOURCE_REF ORDER BY str_TYPE_VENTE,
            // dt_CREATED DESC";
            String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT , lg_REGLEMENT_ID, lg_MOTIF_REGLEMENT_ID, SUM(int_AMOUNT_CREDIT) AS  int_AMOUNT_CREDIT   , SUM(int_AMOUNT_DEBIT) AS int_AMOUNT_DEBIT FROM t_cash_transaction t WHERE t.dt_CREATED > '"
                    + OdateDebut + "' AND t.dt_CREATED <= '" + OdateFin
                    + "' GROUP BY str_RESSOURCE_REF ORDER BY str_TYPE_VENTE, dt_CREATED DESC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                TCashTransaction OTCashTransaction = new TCashTransaction();
                OTCashTransaction.setStrRESSOURCEREF(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OTCashTransaction
                        .setDtCREATED(this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OTCashTransaction.setStrTYPEVENTE(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OTCashTransaction.setIntAMOUNTCREDIT(
                        Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")));
                OTCashTransaction
                        .setIntAMOUNTDEBIT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_DEBIT")));
                OTCashTransaction.setIntAMOUNT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT")));
                if (Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")) > 0) {

                } else {

                }
                try {
                    TReglement OTReglement = this.getOdataManager().getEm().find(TReglement.class,
                            Ojconnexion.get_resultat().getString("lg_REGLEMENT_ID"));
                    TMotifReglement OTMotifReglement = this.getOdataManager().getEm().find(TMotifReglement.class,
                            Ojconnexion.get_resultat().getString("lg_MOTIF_REGLEMENT_ID"));
                    OTCashTransaction.setLgREGLEMENTID(OTReglement);
                    OTCashTransaction.setLgMOTIFREGLEMENTID(OTMotifReglement);
                } catch (Exception e) {
                }
                lstTCashTransaction.add(OTCashTransaction);
            }

            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            // new logger().OCategory.fatal(ex.getMessage());
        }
        /*
         * lstTCashTransaction = this.getOdataManager().getEm().
         * createQuery("SELECT t FROM TCashTransaction t WHERE t.dtCREATED > ?3  AND t.dtCREATED <= ?4")
         * .setParameter(3, dt_date_debut).setParameter(4, dt_date_fin).getResultList(); if (lstTCashTransaction == null
         * || lstTCashTransaction.isEmpty()) { this.buildErrorTraceMessage("ERROR", "Desole pas de donnees"); //return
         * null; } for (TCashTransaction OTCashTransaction : lstTCashTransaction) { this.refresh(OTCashTransaction); new
         * logger().OCategory.info("OTCashTransaction " + OTCashTransaction.getId()); }
         */
        return lstTCashTransaction;
    }

    public List<TCashTransaction> func_GetDataFromCashB(String OdateDebut, String OdateFin) {

        List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();

        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT_CREDIT, lg_REGLEMENT_ID,
            // lg_MOTIF_REGLEMENT_ID FROM t_cash_transaction t WHERE t.dt_CREATED > '"+OdateDebut+"' AND t.dt_CREATED <=
            // '"+OdateFin+"'";

            String qry = "SELECT str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, lg_USER_ID, dt_CREATED, str_TYPE_VENTE, int_AMOUNT_CREDIT, lg_REGLEMENT_ID, lg_MOTIF_REGLEMENT_ID, SUM(int_AMOUNT_CREDIT) AS int_AMOUNT_TOTAL FROM t_cash_transaction t WHERE t.dt_CREATED > '"
                    + OdateDebut + "' AND t.dt_CREATED <= '" + OdateFin
                    + "' GROUP BY str_RESSOURCE_REF ORDER BY str_TYPE_VENTE, dt_CREATED DESC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                if (Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")) > 0) {
                    TCashTransaction OTCashTransaction = new TCashTransaction();
                    OTCashTransaction.setStrRESSOURCEREF(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                    OTCashTransaction.setDtCREATED(
                            this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                    OTCashTransaction.setStrTYPEVENTE(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                    OTCashTransaction.setIntAMOUNTCREDIT(
                            Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")));
                    OTCashTransaction
                            .setIntAMOUNT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_TOTAL")));
                    OTCashTransaction
                            .setLgTYPEREGLEMENTID(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                    try {
                        TReglement OTReglement = this.getOdataManager().getEm().find(TReglement.class,
                                Ojconnexion.get_resultat().getString("lg_REGLEMENT_ID"));
                        TMotifReglement OTMotifReglement = this.getOdataManager().getEm().find(TMotifReglement.class,
                                Ojconnexion.get_resultat().getString("lg_MOTIF_REGLEMENT_ID"));
                        TUser OTUser = this.getOdataManager().getEm().find(TUser.class,
                                Ojconnexion.get_resultat().getString("lg_USER_ID"));

                        OTCashTransaction.setLgREGLEMENTID(OTReglement);
                        OTCashTransaction.setLgMOTIFREGLEMENTID(OTMotifReglement);
                        OTCashTransaction.setLgUSERID(OTUser);

                    } catch (Exception e) {
                    }
                    lstTCashTransaction.add(OTCashTransaction);
                }

            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            // new logger().OCategory.fatal(ex.getMessage());
        }

        return lstTCashTransaction;
    }

    public List<TCashTransaction> func_GetDataFromCash(String dt_date_debut, String dt_date_fin, String h_debut,
            String h_fin) {

        List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();

        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "select * from t_cash_transaction where (t_cash_transaction.dt_CREATED >= '" + dt_date_debut
            // + "' and t_cash_transaction.dt_CREATED <= '" + dt_date_fin + "') AND (TIME(t_cash_transaction.dt_CREATED)
            // >= '" + h_debut + "' and TIME(t_cash_transaction.dt_CREATED) <= '" + h_fin + "') order by
            // t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
            String qry = "select *, SUM(t_cash_transaction.int_AMOUNT) AS int_AMOUNT_TOTAL from t_cash_transaction where (t_cash_transaction.dt_CREATED >= '"
                    + dt_date_debut + "' and t_cash_transaction.dt_CREATED <= '" + dt_date_fin
                    + "') GROUP BY t_cash_transaction.str_RESSOURCE_REF order by t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TCashTransaction OTCashTransaction = new TCashTransaction();
                OTCashTransaction.setId(Ojconnexion.get_resultat().getString("ID"));
                OTCashTransaction.setLgMOTIFREGLEMENTID(this.getOdataManager().getEm().find(TMotifReglement.class,
                        Ojconnexion.get_resultat().getString("lg_MOTIF_REGLEMENT_ID")));
                OTCashTransaction.setStrTYPEVENTE(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OTCashTransaction.setStrRESSOURCEREF(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OTCashTransaction
                        .setDtCREATED(this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OTCashTransaction.setIntAMOUNTCREDIT(
                        Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")));
                OTCashTransaction
                        .setIntAMOUNT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_TOTAL")));
                OTCashTransaction
                        .setIntAMOUNTDEBIT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_DEBIT")));
                OTCashTransaction.setStrNUMEROCOMPTE(Ojconnexion.get_resultat().getString("str_REF_COMPTE_CLIENT"));
                OTCashTransaction.setLgTYPEREGLEMENTID(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                TUser OTUser = (TUser) this.find(Ojconnexion.get_resultat().getString("lg_USER_ID"), new TUser());
                if (OTUser != null) {
                    OTCashTransaction.setLgUSERID(OTUser);
                }
                lstTCashTransaction.add(OTCashTransaction);
            }
            Ojconnexion.CloseConnexion();

            if (lstTCashTransaction == null || lstTCashTransaction.isEmpty()) {
                this.buildErrorTraceMessage("ERROR", "Desole pas de donnees");
                // return null;
            }
            for (TCashTransaction OTCashTransaction : lstTCashTransaction) {
                this.refresh(OTCashTransaction);
                // new logger().OCategory.info("OTCashTransaction " + OTCashTransaction.getId());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTCashTransaction;
    }

    public List<TCashTransaction> func_GetDataFromCashBis(String OdateDebut, String OdateFin) {

        List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();
        // String OdateDebut = "", OdateFin = "";
        try {
            // OdateDebut = this.getKey().DateToString(dt_date_debut, this.getKey().formatterMysql);
            // OdateFin = this.getKey().DateToString(dt_date_fin, this.getKey().formatterMysql);
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT_CREDIT, lg_REGLEMENT_ID,
            // lg_MOTIF_REGLEMENT_ID FROM t_cash_transaction t WHERE t.dt_CREATED > '"+OdateDebut+"' AND t.dt_CREATED <=
            // '"+OdateFin+"'";
            String qry = "SELECT str_RESSOURCE_REF, dt_CREATED, str_TYPE_VENTE, int_AMOUNT_CREDIT, lg_REGLEMENT_ID, lg_MOTIF_REGLEMENT_ID, SUM(int_AMOUNT_CREDIT) AS int_AMOUNT_TOTAL FROM t_cash_transaction t WHERE t.dt_CREATED > '"
                    + OdateDebut + "' AND t.dt_CREATED <= '" + OdateFin
                    + "' GROUP BY str_RESSOURCE_REF ORDER BY str_TYPE_VENTE, dt_CREATED DESC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                if (Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")) > 0) {
                    TCashTransaction OTCashTransaction = new TCashTransaction();
                    OTCashTransaction.setStrRESSOURCEREF(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                    OTCashTransaction.setDtCREATED(
                            this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                    OTCashTransaction.setStrTYPEVENTE(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                    OTCashTransaction.setIntAMOUNTCREDIT(
                            Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")));
                    OTCashTransaction
                            .setIntAMOUNT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_TOTAL")));

                    try {
                        TReglement OTReglement = this.getOdataManager().getEm().find(TReglement.class,
                                Ojconnexion.get_resultat().getString("lg_REGLEMENT_ID"));
                        TMotifReglement OTMotifReglement = this.getOdataManager().getEm().find(TMotifReglement.class,
                                Ojconnexion.get_resultat().getString("lg_MOTIF_REGLEMENT_ID"));
                        OTCashTransaction.setLgREGLEMENTID(OTReglement);
                        OTCashTransaction.setLgMOTIFREGLEMENTID(OTMotifReglement);
                    } catch (Exception e) {
                    }
                    lstTCashTransaction.add(OTCashTransaction);
                }

            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            // new logger().OCategory.fatal(ex.getMessage());
        }
        /*
         * lstTCashTransaction = this.getOdataManager().getEm().
         * createQuery("SELECT t FROM TCashTransaction t WHERE t.dtCREATED > ?3  AND t.dtCREATED <= ?4")
         * .setParameter(3, dt_date_debut).setParameter(4, dt_date_fin).getResultList(); if (lstTCashTransaction == null
         * || lstTCashTransaction.isEmpty()) { this.buildErrorTraceMessage("ERROR", "Desole pas de donnees"); //return
         * null; } for (TCashTransaction OTCashTransaction : lstTCashTransaction) { this.refresh(OTCashTransaction); new
         * logger().OCategory.info("OTCashTransaction " + OTCashTransaction.getId()); }
         */
        return lstTCashTransaction;
    }

    public List<TPreenregistrementCompteClientTiersPayent> func_GetDataTiersPayant(TCashTransaction OTCashTransaction,
            TMotifReglement OTMotifReglement) {
        List<TPreenregistrementCompteClientTiersPayent> LstTPreenregistrementCompteClientTiersPayent = new ArrayList<TPreenregistrementCompteClientTiersPayent>();

        if (OTMotifReglement.getLgMOTIFREGLEMENTID().equals("1")) {
            /*
             * new logger().OCategory.info("ref " + OTCashTransaction.getStrRESSOURCEREF()); new
             * logger().OCategory.info("type vente " + OTCashTransaction.getStrTYPEVENTE()); new
             * logger().OCategory.info("heure " + date.getTime(OTCashTransaction.getDtCREATED())); new
             * logger().OCategory.info("ref " + OTCashTransaction.getStrRESSOURCEREF()); new
             * logger().OCategory.info("code operateur " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
             * new logger().OCategory.info("ref " + OTCashTransaction.getStrRESSOURCEREF()); new
             * logger().OCategory.info("int_amount " + OTCashTransaction.getIntAMOUNTCREDIT());
             */

            // LstTPTPTemp =
            if (OTCashTransaction.getStrTYPEVENTE().equals("VO")) {
                new logger().OCategory.info("OTMotifReglement  " + OTMotifReglement.getLgMOTIFREGLEMENTID());
                try {

                    LstTPreenregistrementCompteClientTiersPayent = this.getOdataManager().getEm().createQuery(
                            " SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?1")
                            .setParameter(1, OTCashTransaction.getStrRESSOURCEREF()).getResultList();

                    // LstTPTP.add(OTPreenregistrementCompteClientTiersPayent);
                    for (TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayentFinal : LstTPreenregistrementCompteClientTiersPayent) {
                        if (OTPreenregistrementCompteClientTiersPayentFinal.getLgCOMPTECLIENTTIERSPAYANTID().getBISRO()
                                .equals(true)) {
                            new logger().OCategory.info(
                                    "amount_tp_ro " + OTPreenregistrementCompteClientTiersPayentFinal.getIntPRICE());
                        } else if (OTPreenregistrementCompteClientTiersPayentFinal.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getBISRC1().equals(true)) {
                            new logger().OCategory.info(
                                    "amount_tp_rc1 " + OTPreenregistrementCompteClientTiersPayentFinal.getIntPRICE());
                        } else if (OTPreenregistrementCompteClientTiersPayentFinal.getLgCOMPTECLIENTTIERSPAYANTID()
                                .getBISRC1().equals(true)) {
                            new logger().OCategory.info(
                                    "amount_tp_rc2 " + OTPreenregistrementCompteClientTiersPayentFinal.getIntPRICE());
                        }

                        // new logger().OCategory.info("amount_tp " +
                        // OTPreenregistrementCompteClientTiersPayentFinal.getIntPRICE());
                        new logger().OCategory.info("amount_clt " + OTPreenregistrementCompteClientTiersPayentFinal
                                .getLgPREENREGISTREMENTID().getIntPRICE());
                        new logger().OCategory.info("amount_remise " + OTPreenregistrementCompteClientTiersPayentFinal
                                .getLgPREENREGISTREMENTID().getIntPRICEREMISE());

                    }
                } catch (Exception e) {
                    new logger().OCategory.info(" Error " + e.toString());
                }
            }
        }
        return LstTPreenregistrementCompteClientTiersPayent;
    }

    public List<TCashTransaction> func_Both_data() {
        List<TCashTransaction> LstT = this.func_GetDataFromCash(null, null);
        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = null;
        List<TPreenregistrementCompteClientTiersPayent> LstTPTP = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        List<TPreenregistrementCompteClientTiersPayent> LstTPTPTemp = new ArrayList<TPreenregistrementCompteClientTiersPayent>();
        TUser OTUser = null;
        TMotifReglement OTMotifReglement = null;
        for (TCashTransaction OTCashTransaction : LstT) {
            OTUser = (TUser) this.find(OTCashTransaction.getLgUSERID(), new TUser());
            OTMotifReglement = this
                    .func_GetMotifReglement(OTCashTransaction.getLgMOTIFREGLEMENTID().getLgMOTIFREGLEMENTID());
            if (OTMotifReglement == null) {
                new logger().OCategory.info(" DESOLE PAS DE MOTIF DE REGLEMENT CORRESPONDANT ");
                return null;
            }

        }
        return null;
    }

    public TMotifReglement func_GetMotifReglement(String lg_MOTIF_REGLEMENT_ID) {
        TMotifReglement OTMotifReglement = null;
        try {
            OTMotifReglement = this.getOdataManager().getEm().find(TMotifReglement.class, lg_MOTIF_REGLEMENT_ID);
            return OTMotifReglement;
        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", " DESOLE PAS DE MOTIF DE REGLEMENT CORRESPONDANT ");
        }

        return null;
    }

    public List<TCashTransaction> getDataBalanceVenteCash(String dt_date_debut, String dt_date_fin, String h_debut,
            String h_fin) {

        List<TCashTransaction> lstTCashTransaction = new ArrayList<TCashTransaction>();

        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "select * from t_cash_transaction where (t_cash_transaction.dt_CREATED >= '" + dt_date_debut
            // + "' and t_cash_transaction.dt_CREATED <= '" + dt_date_fin + "') AND (TIME(t_cash_transaction.dt_CREATED)
            // >= '" + h_debut + "' and TIME(t_cash_transaction.dt_CREATED) <= '" + h_fin + "') order by
            // t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
            String qry = "select * from v_balance_vente_caisse";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TCashTransaction OTCashTransaction = new TCashTransaction();
                OTCashTransaction.setId(pkey.getComplexId());
                // OTCashTransaction.setLgMOTIFREGLEMENTID(this.getOdataManager().getEm().find(TMotifReglement.class,
                // Ojconnexion.get_resultat().getString("lg_MOTIF_REGLEMENT_ID")));
                OTCashTransaction.setStrTYPEVENTE(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OTCashTransaction.setStrRESSOURCEREF(Ojconnexion.get_resultat().getString("NB"));

                // OTCashTransaction.setIntAMOUNTCREDIT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT")));
                OTCashTransaction.setIntAMOUNT(Integer.parseInt(Ojconnexion.get_resultat().getString("NET")));
                OTCashTransaction.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTCashTransaction
                        .setIntAMOUNTDEBIT(Integer.parseInt(Ojconnexion.get_resultat().getString("DETETIERPAYS")));
                OTCashTransaction.setStrNUMEROCOMPTE(Ojconnexion.get_resultat().getString("PANIER"));

                lstTCashTransaction.add(OTCashTransaction);
            }
            Ojconnexion.CloseConnexion();

            if (lstTCashTransaction == null || lstTCashTransaction.isEmpty()) {
                this.buildErrorTraceMessage("ERROR", "Desole pas de donnees");
                // return null;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTCashTransaction;
    }

    public int getBalanceVenteCount(String tyvente) {
        int count = 0;

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "select * from t_cash_transaction where (t_cash_transaction.dt_CREATED >= '" + dt_date_debut
            // + "' and t_cash_transaction.dt_CREATED <= '" + dt_date_fin + "') AND (TIME(t_cash_transaction.dt_CREATED)
            // >= '" + h_debut + "' and TIME(t_cash_transaction.dt_CREATED) <= '" + h_fin + "') order by
            // t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
            String qry = "SELECT * FROM v_balance_vente_caisse WHERE str_TYPE_VENTE='" + tyvente + "'";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                count += Integer.valueOf(Ojconnexion.get_resultat().getString("NB"));
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return count;
    }
    // public Map<Integer,String> getBalanventeTotalAmountByType(String type_vente, String lg_TYPE_REGLEMENT_ID){
    // Integer amount=0;
    // Map<Integer,String> map=new HashMap<>();
    // List <String> list=new ArrayList<>();
    // try{
    // jconnexion Ojconnexion = new jconnexion();
    // Ojconnexion.initConnexion();
    // Ojconnexion.OpenConnexion();
    //
    //// String qry = "select * from t_cash_transaction where (t_cash_transaction.dt_CREATED >= '" + dt_date_debut + "'
    // and t_cash_transaction.dt_CREATED <= '" + dt_date_fin + "') AND (TIME(t_cash_transaction.dt_CREATED) >= '" +
    // h_debut + "' and TIME(t_cash_transaction.dt_CREATED) <= '" + h_fin + "') order by
    // t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
    // String qry = "SELECT * FROM v_balance_vente_caisse v WHERE v.str_TYPE_VENTE = '"+type_vente+"' AND
    // v.lg_TYPE_REGLEMENT_ID LIKE '"+lg_TYPE_REGLEMENT_ID+"'" ;
    // new logger().OCategory.info("qry -- " + qry);
    // Ojconnexion.set_Request(qry);
    // ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
    // while (Ojconnexion.get_resultat().next()) {
    // amount=Integer.valueOf(Ojconnexion.get_resultat().getString("NET"));
    // map.put(amount, Ojconnexion.get_resultat().getString("PANIER"));
    //
    // }
    // Ojconnexion.CloseConnexion();
    //
    //
    //
    // } catch (Exception e) {
    // e.printStackTrace();
    // }
    //
    //
    // return map;
    // }
    //

    public int getIntNbreVenteBalanceVC(List<EntityData> entityDatas) {
        int result = 0;
        for (EntityData OentityData : entityDatas) {

            result += Integer.valueOf(OentityData.getStr_value2());
        }
        return result;
    }

    public int getIntNbreVenteBytype(List<EntityData> entityDatas, String type_vente) {
        int result = 0;

        for (EntityData OentityData : entityDatas) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value7());
            }

        }
        return result;
    }

    public long getIntMOYENBalanceVC(List<EntityData> entityDatas, String type_vente) {
        long result = 0;
        int count = 0;
        long sum = 0;
        for (EntityData OentityData : entityDatas) {
            if (OentityData.getStr_value1().equals(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value3());
                count = +Integer.valueOf(OentityData.getStr_value2());
            }

        }
        if (count > 0) {
            sum = result / count;
        }
        return Math.round(sum);
    }

    public long getIntTIERPAYANTBalanceVC(List<EntityData> entityDatas, String type_vente) {
        long result = 0;
        List<EntityData> lst = new ArrayList<>();
        for (EntityData OentityData : entityDatas) {
            if (OentityData.getStr_value1().equals(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value5());

            }

        }
        return result;
    }

    // get total funcash
    public long getTotalFunCash(String dt_date_debut, String dt_date_fin) {
        long funcash = 0l;
        List<TCashTransaction> lst = new ArrayList<>();
        try {
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TCashTransaction o WHERE o.dtCREATED BETWEEN ?1 AND ?2 AND o.strNUMEROCOMPTE =?3")
                    .setParameter(1, date.formatterMysql.parse(dt_date_debut), TemporalType.TIMESTAMP)
                    .setParameter(2, date.formatterMysql.parse(dt_date_fin), TemporalType.TIMESTAMP)
                    .setParameter(3, Parameter.ID_COMPTABLEFUNCASH).getResultList();
            for (TCashTransaction OCashTransaction : lst) {
                this.refresh(OCashTransaction);
                funcash += OCashTransaction.getIntAMOUNTRECU();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return funcash;
    }

    // a revoir
    public long getTotalCaisse(List<EntityData> entityDatas) {
        long result = 0l;

        for (EntityData OentityData : entityDatas) {
            result += Integer.valueOf(OentityData.getStr_value7());

        }
        return result;
    }

    // dernier bon journal de vente
    // public List<EntityData> getJournalVente(String search_value, String lg_PREENGISTREMENT_ID, String dt_Date_Debut,
    // String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE) {
    //
    // List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
    // EntityData OEntityData = null;
    // String lg_USER_ID = this.getOTUser().getLgUSERID();
    // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
    // try {
    //
    // jconnexion Ojconnexion = new jconnexion();
    // Ojconnexion.initConnexion();
    // Ojconnexion.OpenConnexion();
    //
    // if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
    // lg_USER_ID = "%%";
    // }
    //
    // String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_user u1 WHERE
    // u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,'
    // ',u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR,
    // CONCAT(t.str_FIRST_NAME_CUSTOMER,' ',t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN
    // t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + ((-1) * t.int_PRICE_REMISE) END AS
    // VENTE_NET, (SELECT tp.str_NAME from t_preenregistrement_compte_client_tiers_payent tt,
    // t_compte_client_tiers_payant c, t_tiers_payant tp where tt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID =
    // c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND
    // tt.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 1 GROUP BY t.lg_PREENREGISTREMENT_ID)
    // AS str_FULLNAME, (SELECT tt.int_PRICE from t_preenregistrement_compte_client_tiers_payent tt,
    // t_compte_client_tiers_payant c, t_tiers_payant tp where tt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID =
    // c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND
    // tt.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 1 GROUP BY t.lg_PREENREGISTREMENT_ID)
    // AS str_TIERS_PAYANT_RO, (SELECT tt2.int_PRICE from t_preenregistrement_compte_client_tiers_payent tt2,
    // t_compte_client_tiers_payant c, t_tiers_payant tp where tt2.lg_COMPTE_CLIENT_TIERS_PAYANT_ID =
    // c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND
    // tt2.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 2 GROUP BY
    // t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RC1, (SELECT tt3.int_PRICE from
    // t_preenregistrement_compte_client_tiers_payent tt3, t_compte_client_tiers_payant c, t_tiers_payant tp where
    // tt3.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID =
    // tp.lg_TIERS_PAYANT_ID AND tt3.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 3 GROUP BY
    // t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RC2, (SELECT tt4.int_PRICE from
    // t_preenregistrement_compte_client_tiers_payent tt4, t_compte_client_tiers_payant c, t_tiers_payant tp where
    // tt4.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID =
    // tp.lg_TIERS_PAYANT_ID AND tt4.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 4 GROUP BY
    // t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RC3, tv.str_NAME AS str_VENTE_NAME "
    // + "FROM t_preenregistrement t, t_user u, t_type_vente tv WHERE (t.str_REF LIKE '" + search_value + "%' OR
    // t.str_REF_TICKET LIKE '" + search_value + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENGISTREMENT_ID + "'
    // AND (DATE(t.dt_UPDATED) >= '" + dt_Date_Debut + "' AND DATE(t.dt_UPDATED) <= '" + dt_Date_Fin + "') AND
    // (TIME(t.dt_UPDATED) >= '" + h_debut + "' AND TIME(t.dt_UPDATED) <= '" + h_fin + "') AND t.lg_USER_ID LIKE '" +
    // lg_USER_ID + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" +
    // this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE +
    // "' AND t.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND t.lg_TYPE_VENTE_ID = tv.lg_TYPE_VENTE_ID
    // ORDER BY t.dt_CREATED ASC";
    // new logger().OCategory.info("qry -- " + qry);
    // Ojconnexion.set_Request(qry);
    // ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
    // while (Ojconnexion.get_resultat().next()) {
    // OEntityData = new EntityData();
    // //new logger().OCategory.info("Date " +
    // this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
    // OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
    // OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
    // OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
    // OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
    // OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
    // OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_CREATED"));
    // OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
    // OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
    // OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
    // OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
    // OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
    // OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
    // OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
    // OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
    // OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("str_FULLNAME"));
    // OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("str_VENTE_NAME"));
    //
    // lstTPreenregistrement.add(OEntityData);
    // }
    // Ojconnexion.CloseConnexion();
    //
    // } catch (Exception e) {
    // e.printStackTrace();
    // }
    //
    // return lstTPreenregistrement;
    // }
    public List<EntityData> getJournalVente(String search_value, String lg_PREENGISTREMENT_ID, String dt_Date_Debut,
            String dt_Date_Fin, String h_debut, String h_fin, String str_TYPE_VENTE) {

        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = null;
        String lg_EMPLACEMENT_ID = "";
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

            String qry = "SELECT t.*, (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_user u1 WHERE u1.lg_USER_ID = t.lg_USER_CAISSIER_ID) AS str_FIRST_LAST_NAME_CAISSIER, (SELECT CONCAT(u2.str_FIRST_NAME,' ',u2.str_LAST_NAME) FROM t_user u2 WHERE u2.lg_USER_ID = t.lg_USER_VENDEUR_ID) AS str_FIRST_LAST_NAME_VENDEUR, CONCAT(t.str_FIRST_NAME_CUSTOMER,' ',t.str_LAST_NAME_CUSTOMER) AS str_FIRST_LAST_NAME_CLIENT, CASE WHEN t.int_PRICE > 0 THEN t.int_PRICE - t.int_PRICE_REMISE ELSE t.int_PRICE + ((-1) * t.int_PRICE_REMISE) END AS VENTE_NET,CASE WHEN t.int_PRICE_OTHER > 0 THEN t.int_PRICE_OTHER - t.int_PRICE_REMISE ELSE t.int_PRICE_OTHER + ((-1) * t.int_PRICE_REMISE) END AS VENTE_NET_BIS, (SELECT tp.str_NAME from t_preenregistrement_compte_client_tiers_payent tt, t_compte_client_tiers_payant c, t_tiers_payant tp where tt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 1 AND tt.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' GROUP BY t.lg_PREENREGISTREMENT_ID) AS str_FULLNAME, (SELECT tt.int_PRICE from t_preenregistrement_compte_client_tiers_payent tt, t_compte_client_tiers_payant c, t_tiers_payant tp where tt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 1 GROUP BY t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RO, (SELECT tt2.int_PRICE from t_preenregistrement_compte_client_tiers_payent tt2, t_compte_client_tiers_payant c, t_tiers_payant tp where tt2.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt2.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 2 GROUP BY t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RC1, (SELECT tt3.int_PRICE from t_preenregistrement_compte_client_tiers_payent tt3, t_compte_client_tiers_payant c, t_tiers_payant tp where tt3.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt3.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 3 GROUP BY t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RC2, (SELECT tt4.int_PRICE from t_preenregistrement_compte_client_tiers_payent tt4, t_compte_client_tiers_payant c, t_tiers_payant tp where tt4.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt4.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND c.int_PRIORITY = 4 GROUP BY t.lg_PREENREGISTREMENT_ID) AS str_TIERS_PAYANT_RC3, tv.str_NAME AS str_VENTE_NAME "
                    + "FROM t_preenregistrement t, t_user u, t_type_vente tv WHERE (t.str_REF LIKE '" + search_value
                    + "%' OR t.str_REF_TICKET LIKE '" + search_value + "%') AND t.lg_PREENREGISTREMENT_ID LIKE '"
                    + lg_PREENGISTREMENT_ID + "' AND (t.dt_UPDATED >= '" + dt_Date_Debut + " " + h_debut
                    + "' AND t.dt_UPDATED <= '" + dt_Date_Fin + " " + h_fin + "') AND t.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.str_TYPE_VENTE LIKE '" + str_TYPE_VENTE + "' AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' AND t.lg_TYPE_VENTE_ID = tv.lg_TYPE_VENTE_ID ORDER BY t.dt_UPDATED ASC";

            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                // new logger().OCategory.info("Date " +
                // this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_CREATED")));
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_VENDEUR"));
                // OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE")); // a decommenter en cas
                // de probleme 22/08/2016

                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("lg_NATURE_VENTE_ID"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_STATUT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("b_IS_CANCEL"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_SENDTOSUGGESTION"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                // OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));// a decommenter en cas
                // de probleme. 22/08/2016
                // code ajouté 15/08/2016
                if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && Ojconnexion.get_resultat().getString("int_PRICE_OTHER") != null) {
                    OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE_OTHER"));
                    OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET_BIS"));
                } else {
                    OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));
                    OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("VENTE_NET"));
                }
                // fin code ajouté 15/08/2016

                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("str_REF_BON"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("str_FULLNAME"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("str_VENTE_NAME"));

                lstTPreenregistrement.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    // //fin dernier bon journal de vente
    // facture subrogatoire
    public List<EntityData> getFactureSubrogatoire(String search_value, String dt_Date_Debut, String dt_Date_Fin,
            String h_debut, String h_fin, String lg_TIERS_PAYANT_ID) {

        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        String lg_USER_ID = this.getOTUser().getLgUSERID(), lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        List<String> data = new ArrayList<String>();
        String qry = "";
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

            // String qry = "SELECT * FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false AND
            // v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (DATE(v.dt_UPDATED) >= '" + dt_Date_Debut + "'
            // AND DATE(v.dt_UPDATED) <= '" + dt_Date_Fin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' AND
            // TIME(v.dt_UPDATED) <= '" + h_fin + "') AND (v.str_FIRST_NAME_CUSTOMER LIKE '" + search_value + "%' OR
            // v.str_LAST_NAME_CUSTOMER LIKE '" + search_value + "%' OR v.str_FIRST_LAST_NAME LIKE '" + search_value +
            // "%' OR v.str_REF_BON LIKE '" + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR
            // v.str_REF_TICKET LIKE '" + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND
            // v.lg_TIERS_PAYANT_ID LIKE '" + lg_TIERS_PAYANT_ID + "' ORDER BY v.dt_UPDATED ASC"; // a decommenter en
            // cas de probleme 20/11/2016
            qry = "SELECT * FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false AND v.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND (v.dt_UPDATED >= '" + dt_Date_Debut + " " + h_debut
                    + "' AND v.dt_UPDATED <= '" + dt_Date_Fin + " " + h_fin + "') AND (v.str_FIRST_NAME_CUSTOMER LIKE '"
                    + search_value + "%' OR v.str_LAST_NAME_CUSTOMER LIKE '" + search_value
                    + "%' OR v.str_FIRST_LAST_NAME LIKE '" + search_value + "%' OR v.str_REF_BON LIKE '" + search_value
                    + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '" + search_value
                    + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND v.lg_TIERS_PAYANT_ID LIKE '"
                    + lg_TIERS_PAYANT_ID + "' GROUP BY v.str_REF ORDER BY v.dt_UPDATED ASC";
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
                    // new logger().OCategory.info("Debut:" + data.get(0) + ":fin");
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

    public List<EntityData> getFactureSubrogatoireOther(String search_value, String dt_Date_Debut, String dt_Date_Fin,
            String h_debut, String h_fin, String lg_TIERS_PAYANT_ID) {

        List<EntityData> lstTPreenregistrement = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        String lg_USER_ID = this.getOTUser().getLgUSERID();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        List<String> data = new ArrayList<String>();
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
            // String qry = "SELECT * FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false AND
            // v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (DATE(v.dt_UPDATED) >= '" + dt_Date_Debut + "'
            // AND DATE(v.dt_UPDATED) <= '" + dt_Date_Fin + "') AND (TIME(v.dt_UPDATED) >= '" + h_debut + "' AND
            // TIME(v.dt_UPDATED) <= '" + h_fin + "') AND (v.str_FIRST_NAME_CUSTOMER LIKE '" + search_value + "%' OR
            // v.str_LAST_NAME_CUSTOMER LIKE '" + search_value + "%' OR v.str_FIRST_LAST_NAME LIKE '" + search_value +
            // "%' OR v.str_REF_BON LIKE '" + search_value + "%' OR v.str_REF LIKE '" + search_value + "%' OR
            // v.str_REF_TICKET LIKE '" + search_value + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND
            // v.lg_TIERS_PAYANT_ID LIKE '" + lg_TIERS_PAYANT_ID + "' ORDER BY v.str_TYPE_TIERS_PAYANT, v.str_NAME,
            // v.dt_UPDATED ASC"; // a decommenter en cas de probleme
            String qry = "SELECT * FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false AND v.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND (v.dt_UPDATED >= '" + dt_Date_Debut + " " + h_debut
                    + "' AND v.dt_UPDATED <= '" + dt_Date_Fin + " " + h_fin + "') AND (v.str_FIRST_NAME_CUSTOMER LIKE '"
                    + search_value + "%' OR v.str_LAST_NAME_CUSTOMER LIKE '" + search_value
                    + "%' OR v.str_FIRST_LAST_NAME LIKE '" + search_value + "%' OR v.str_REF_BON LIKE '" + search_value
                    + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '" + search_value
                    + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND v.lg_TIERS_PAYANT_ID LIKE '"
                    + lg_TIERS_PAYANT_ID + "' ORDER BY v.str_TYPE_TIERS_PAYANT, v.str_NAME, v.dt_UPDATED ASC";

            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_PREENREGISTREMENT_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CAISSIER"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_PRICE_TP"));

                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_PRICE"));

                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("dt_UPDATED"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_NUMERO_SECURITE_SOCIAL"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("str_TYPE_TIERS_PAYANT"));

                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_PRICE_TOTAL"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_PRICE_REMISE"));
                OEntityData.setStr_value14((Ojconnexion.get_resultat().getString("str_REF_BON") == null ? ""
                        : Ojconnexion.get_resultat().getString("str_REF_BON")));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("str_NAME"));
                lstTPreenregistrement.add(OEntityData);

            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTPreenregistrement;
    }

    public int getTotalListeCaisse(String dt_date_debut, String dt_date_fin, String h_debut, String h_fin,
            String lg_USER_ID, String lg_TYPE_REGLEMENT_ID) {
        Double result = 0.0;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            String qry = "SELECT `fn_v_caisse`('" + dt_date_debut + "', '" + dt_date_fin + "', '" + h_debut + "', '"
                    + h_fin + "', '" + lg_USER_ID + "', '" + lg_TYPE_REGLEMENT_ID + "', '" + lg_EMPLACEMENT_ID + "')";
            new logger().OCategory.info(qry);
            result = (double) this.getOdataManager().getEm().createNativeQuery(qry).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("total:" + result.intValue());
        return result.intValue();

    }

    public List<Object[]> getListeCaisse(String dt_date_debut, String dt_date_fin, String h_debut, String h_fin,
            String lg_USER_ID, String lg_TYPE_REGLEMENT_ID) {

        List<Object[]> lstEntityData = new ArrayList<Object[]>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        // TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        // TParameters OTParameters = null;
        try {

            // OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "CALL `proc_v_caisse`('" + dt_date_debut + "', '" + dt_date_fin + "', '" + h_debut + "', '"
                    + h_fin + "', '" + lg_USER_ID + "', '" + lg_TYPE_REGLEMENT_ID + "', '" + lg_EMPLACEMENT_ID + "')";
            new logger().OCategory.info(qry);
            lstEntityData = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();

        } catch (Exception ex) {
            ex.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille:" + lstEntityData.size());
        return lstEntityData;
    }

    public List<Object[]> getListeCaisse(String dt_date_debut, String dt_date_fin, String h_debut, String h_fin,
            String lg_USER_ID, String lg_TYPE_REGLEMENT_ID, int start, int limit) {

        List<Object[]> lstEntityData = new ArrayList<Object[]>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        // TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        // TParameters OTParameters = null;
        try {

            // OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "CALL `proc_v_caisse_limit`('" + dt_date_debut + "', '" + dt_date_fin + "', '" + h_debut
                    + "', '" + h_fin + "', '" + lg_USER_ID + "', '" + lg_TYPE_REGLEMENT_ID + "', '" + lg_EMPLACEMENT_ID
                    + "', " + start + ", " + limit + ")";
            new logger().OCategory.info(qry);
            lstEntityData = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();

        } catch (Exception ex) {
            ex.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille:" + lstEntityData.size());
        return lstEntityData;
    }

    // fin derniere bonne liste des caisses
    public List<EntityData> getCaisses(String dt_date_debut, String dt_date_fin, String lg_USER_ID,
            String lg_TYPE_REGLEMENT_ID) {

        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        EntityData OEntityData;
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "SELECT t.str_RESSOURCE_REF, CASE WHEN t.str_TASK = 'VENTE' THEN (SELECT p.str_REF FROM
            // t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF) ELSE t.str_RESSOURCE_REF END
            // AS str_RESSOURCE_REF_BIS, CASE WHEN t.str_TASK = 'VENTE' THEN CASE WHEN t.str_TYPE_VENTE = 'VO' THEN
            // (SELECT p.int_CUST_PART FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF)
            // ELSE (SELECT CASE WHEN p.int_PRICE > 0 THEN p.int_PRICE - p.int_PRICE_REMISE ELSE p.int_PRICE + ((-1) *
            // p.int_PRICE_REMISE) END FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF)
            // END ELSE CASE WHEN t.str_TRANSACTION_REF = 'C' THEN t.int_AMOUNT_CREDIT ELSE t.int_AMOUNT_DEBIT END END
            // AS int_AMOUNT, CASE WHEN t.str_NUMERO_COMPTE = '10800000000' THEN (SELECT CONCAT(u1.str_FIRST_NAME,'
            // ',u1.str_LAST_NAME) FROM t_mvt_caisse mm, t_user u1 WHERE mm.P_KEY = u1.lg_USER_ID AND
            // t.str_RESSOURCE_REF = mm.lg_MVT_CAISSE_ID) ELSE CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) END AS
            // str_FIRST_LAST_NAME, t.dt_CREATED, m.str_NAME, tr.str_NAME AS str_NAME_TYE_REGLEMENT, mc.str_NAME AS
            // str_NAME_TYPE_MVT_CAISSE, (SELECT CONCAT(p.str_FIRST_NAME_CUSTOMER, ' ' , p.str_LAST_NAME_CUSTOMER) from
            // t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF) AS
            // str_FIRST_LAST_NAME_CLIENT, t.str_NUMERO_COMPTE "
            // + "FROM t_cash_transaction t, t_user u, t_mode_reglement m, t_reglement r, t_type_reglement tr,
            // t_type_mvt_caisse mc WHERE DATE(t.dt_CREATED) >= '"+dt_date_debut+"' AND DATE(t.dt_CREATED) <=
            // '"+dt_date_fin+"' AND t.lg_USER_ID = u.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID AND
            // t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID AND
            // mc.str_CODE_COMPTABLE = t.str_NUMERO_COMPTE AND t.lg_USER_ID LIKE '"+lg_USER_ID+"' AND
            // tr.lg_TYPE_REGLEMENT_ID LIKE '"+lg_TYPE_REGLEMENT_ID+"' GROUP BY str_RESSOURCE_REF ORDER BY
            // str_TYPE_VENTE, t.dt_CREATED ASC";
            String qry = "SELECT t.str_RESSOURCE_REF, sum(int_AMOUNT) as AMOUNT, CASE WHEN t.str_TASK = 'VENTE' THEN (SELECT p.str_REF FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF) ELSE t.str_RESSOURCE_REF END AS str_RESSOURCE_REF_BIS, CASE WHEN t.str_TASK = 'VENTE' THEN CASE WHEN t.str_TYPE_VENTE = 'VO' THEN (SELECT p.int_CUST_PART FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF) ELSE (SELECT CASE WHEN p.int_PRICE > 0 THEN p.int_PRICE - p.int_PRICE_REMISE ELSE p.int_PRICE + ((-1) * p.int_PRICE_REMISE) END FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF) END ELSE CASE WHEN t.str_TRANSACTION_REF = 'C' THEN t.int_AMOUNT_CREDIT ELSE (-1) * t.int_AMOUNT_DEBIT END END AS int_AMOUNT, CASE WHEN t.str_NUMERO_COMPTE = '10800000000' THEN (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_mvt_caisse mm, t_user u1 WHERE mm.P_KEY = u1.lg_USER_ID AND t.str_RESSOURCE_REF = mm.lg_MVT_CAISSE_ID) ELSE CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) END AS str_FIRST_LAST_NAME, t.dt_CREATED, m.str_NAME, tr.str_NAME AS str_NAME_TYE_REGLEMENT, mc.str_NAME AS str_NAME_TYPE_MVT_CAISSE, (SELECT CONCAT(p.str_FIRST_NAME_CUSTOMER, ' ' , p.str_LAST_NAME_CUSTOMER) from t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = t.str_RESSOURCE_REF) AS str_FIRST_LAST_NAME_CLIENT, t.str_NUMERO_COMPTE "
                    + "FROM t_cash_transaction t, t_user u, t_mode_reglement m, t_reglement r, t_type_reglement tr, t_type_mvt_caisse mc WHERE DATE(t.dt_CREATED) >= '"
                    + dt_date_debut + "' AND DATE(t.dt_CREATED) <= '" + dt_date_fin
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID AND t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID AND mc.str_CODE_COMPTABLE = t.str_NUMERO_COMPTE AND t.lg_USER_ID LIKE '"
                    + lg_USER_ID + "' AND tr.lg_TYPE_REGLEMENT_ID LIKE '" + lg_TYPE_REGLEMENT_ID
                    + "' GROUP BY str_FIRST_LAST_NAME ORDER BY t.dt_CREATED ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF_BIS"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_NAME"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_NAME_TYE_REGLEMENT"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_NAME_TYPE_MVT_CAISSE"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("AMOUNT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME_CLIENT"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("str_NUMERO_COMPTE"));

                lstEntityData.add(OEntityData);
            }

            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();

        }

        return lstEntityData;
    }

    // fin derniere bonne liste des caisses
    // total montant tout type de reglement confondu
    public int getTotalAmountCashTransactionOther(List<EntityData> lst) {
        int result = 0;
        try {
            for (EntityData OEntityData : lst) {
                result += Integer.parseInt(OEntityData.getStr_value7());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public int getTotalAmountCashTransaction(List<Object[]> lst) {
        int result = 0;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = null;
        try {
            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                for (Object[] objects : lst) {
                    result += Integer.parseInt(objects[6].toString());
                }
            } else {
                for (Object[] objects : lst) {
                    result += Integer.parseInt(objects[5].toString());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }
    // fin total montant tout type de reglement confondu

    // derniere bonne version de la balance vente/caisse
    public List<EntityData> getBalanceVenteCaisse(String dt_date_debut, String dt_date_fin) {

        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        // TParameters OTParameters = null;
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            /*
             * String qry =
             * "SELECT SUM(t.int_PRICE) AS VENTE_BRUT, SUM(t.int_PRICE_REMISE) AS TOTAL_REMISE, SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE) AS VENTE_NET, t.str_TYPE_VENTE AS str_TYPE_VENTE, tr.str_NAME AS str_TYPE_REGLEMENT, tr.lg_TYPE_REGLEMENT_ID AS lg_TYPE_REGLEMENT_ID, COUNT(t.lg_PREENREGISTREMENT_ID) AS NB, CASE WHEN t.lg_NATURE_VENTE_ID = '"
             * + Parameter.KEY_NATURE_VENTE_DEPOT +
             * "' THEN 0 ELSE (SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE)) - SUM(t.int_CUST_PART) END AS PART_TIERSPAYANT, CASE WHEN t.str_TYPE_VENTE = '"
             * + Parameter.KEY_VENTE_ORDONNANCE +
             * "' THEN SUM(t.int_CUST_PART) ELSE SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE) END AS TOTAL_CAISSE, CASE WHEN t.str_STATUT_VENTE = '"
             * + commonparameter.statut_nondiffere + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_ORDONNANCE +
             * "'	THEN SUM(t.int_CUST_PART) WHEN t.str_STATUT_VENTE = '" + commonparameter.statut_differe +
             * "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_ORDONNANCE +
             * "' THEN (SELECT SUM(ct.int_AMOUNT_CREDIT) FROM t_cash_transaction ct, t_preenregistrement t WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND t.str_STATUT_VENTE = '"
             * + commonparameter.statut_differe + "' AND ct.int_AMOUNT_CREDIT > 0 AND t.str_TYPE_VENTE = '" +
             * Parameter.KEY_VENTE_ORDONNANCE + "') WHEN t.str_STATUT_VENTE = '" + commonparameter.statut_nondiffere +
             * "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_NON_ORDONNANCEE +
             * "' THEN (SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE)) WHEN t.str_STATUT_VENTE = '" +
             * commonparameter.statut_differe + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_NON_ORDONNANCEE +
             * "' THEN (SELECT SUM(ct.int_AMOUNT_CREDIT) FROM t_cash_transaction ct, t_preenregistrement t WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND t.str_STATUT_VENTE = '"
             * + commonparameter.statut_differe + "' AND ct.int_AMOUNT_CREDIT > 0 AND t.str_TYPE_VENTE = '" +
             * Parameter.KEY_VENTE_NON_ORDONNANCEE + "' 	AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut +
             * "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin +
             * "')) ELSE (SELECT SUM(ct.int_AMOUNT_CREDIT) FROM t_cash_transaction ct, t_preenregistrement t WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND t.str_STATUT_VENTE = '"
             * + commonparameter.statut_differe + "' AND ct.int_AMOUNT_CREDIT > 0 AND (DATE(`t`.`dt_UPDATED`) >= '" +
             * dt_date_debut + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "')) END AS PART_CLIENT, " // a
             * decommenter en cas de probleme. 27/04/2016 + "CASE WHEN (t.str_STATUT_VENTE = '" +
             * commonparameter.statut_differe + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_NON_ORDONNANCEE +
             * "') THEN (SELECT SUM(pc.int_PRICE_RESTE) FROM t_cash_transaction ct, t_preenregistrement t, t_preenregistrement_compte_client pc WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND pc.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND t.str_STATUT_VENTE = '"
             * + commonparameter.statut_differe + "' AND ct.int_AMOUNT >= 0 AND t.str_TYPE_VENTE = '" +
             * Parameter.KEY_VENTE_NON_ORDONNANCEE + "' AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut +
             * "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "')) WHEN (t.str_STATUT_VENTE = '" +
             * commonparameter.statut_differe + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_ORDONNANCE +
             * "') THEN (SELECT SUM(pc.int_PRICE_RESTE) FROM t_cash_transaction ct, t_preenregistrement t, t_preenregistrement_compte_client pc WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND pc.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND t.str_STATUT_VENTE = '"
             * + commonparameter.statut_differe + "' AND ct.int_AMOUNT >= 0 AND t.str_TYPE_VENTE = '" +
             * Parameter.KEY_VENTE_ORDONNANCE + "' AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut +
             * "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "')) 	ELSE 0 END AS PART_CLIENT_DETTE " +
             * "FROM t_preenregistrement t, t_type_reglement tr, t_mode_reglement mr, t_reglement r, t_emplacement e, t_user u WHERE t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID AND r.lg_MODE_REGLEMENT_ID = mr.lg_MODE_REGLEMENT_ID AND (DATE(`t`.`dt_UPDATED`) >= '"
             * + dt_date_debut + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "') AND t.str_STATUT = '" +
             * commonparameter.statut_is_Closed +
             * "' AND e.lg_EMPLACEMENT_ID = u.lg_EMPLACEMENT_ID AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '"
             * + lg_EMPLACEMENT_ID + "' AND (t.int_PRICE > 0 AND t.b_IS_CANCEL = 0) AND t.lg_NATURE_VENTE_ID NOT LIKE '"
             * + Parameter.KEY_NATURE_VENTE_DEPOT + "' GROUP BY t.str_TYPE_VENTE, tr.str_NAME";
             */
            String qry = "SELECT SUM(t.int_PRICE) AS VENTE_BRUT, SUM(t.int_PRICE_OTHER) AS VENTE_BRUT_OTHER, SUM(t.int_PRICE_REMISE) AS TOTAL_REMISE, SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE) AS VENTE_NET, SUM(t.int_PRICE_OTHER) - SUM(t.int_PRICE_REMISE) AS VENTE_NET_OTHER, t.str_TYPE_VENTE AS str_TYPE_VENTE, tr.str_NAME AS str_TYPE_REGLEMENT, tr.lg_TYPE_REGLEMENT_ID AS lg_TYPE_REGLEMENT_ID, COUNT(t.lg_PREENREGISTREMENT_ID) AS NB, CASE WHEN t.lg_NATURE_VENTE_ID = '"
                    + Parameter.KEY_NATURE_VENTE_DEPOT
                    + "' THEN 0 ELSE (SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE)) - SUM(t.int_CUST_PART) END AS PART_TIERSPAYANT, CASE WHEN t.lg_NATURE_VENTE_ID = '"
                    + Parameter.KEY_NATURE_VENTE_DEPOT
                    + "' THEN 0 ELSE (SUM(t.int_PRICE_OTHER) - SUM(t.int_PRICE_REMISE)) - SUM(t.int_CUST_PART) END AS PART_TIERSPAYANT_OTHER, CASE WHEN t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_ORDONNANCE
                    + "' THEN SUM(t.int_CUST_PART) ELSE SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE) END AS TOTAL_CAISSE, CASE WHEN t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_ORDONNANCE
                    + "' THEN SUM(t.int_CUST_PART) ELSE SUM(t.int_PRICE_OTHER) - SUM(t.int_PRICE_REMISE) END AS TOTAL_CAISSE_OTHER, CASE WHEN t.str_STATUT_VENTE = '"
                    + commonparameter.statut_nondiffere + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_ORDONNANCE
                    + "'	THEN SUM(t.int_CUST_PART) WHEN t.str_STATUT_VENTE = '" + commonparameter.statut_differe
                    + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_ORDONNANCE
                    + "' THEN (SELECT SUM(ct.int_AMOUNT_CREDIT) FROM t_cash_transaction ct, t_preenregistrement t WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND t.str_STATUT_VENTE = '"
                    + commonparameter.statut_differe + "' AND ct.int_AMOUNT_CREDIT >= 0 AND t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_ORDONNANCE + "' AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut
                    + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "') AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND t.int_PRICE > 0 AND t.b_IS_CANCEL = 0) WHEN t.str_STATUT_VENTE = '"
                    + commonparameter.statut_nondiffere + "' AND t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE
                    + "' THEN (SUM(t.int_PRICE) - SUM(t.int_PRICE_REMISE)) WHEN t.str_STATUT_VENTE = '"
                    + commonparameter.statut_differe + "' AND t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE
                    + "' THEN (SELECT SUM(ct.int_AMOUNT_CREDIT) FROM t_cash_transaction ct, t_preenregistrement t WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND t.str_STATUT_VENTE = '"
                    + commonparameter.statut_differe + "' AND ct.int_AMOUNT_CREDIT >= 0 AND t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE + "' 	AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut
                    + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "') AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID
                    + "' AND t.int_PRICE > 0 AND t.b_IS_CANCEL = 0) ELSE (SELECT SUM(ct.int_AMOUNT_CREDIT) FROM t_cash_transaction ct, t_preenregistrement t WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND t.str_STATUT_VENTE = '"
                    + commonparameter.statut_differe + "' AND ct.int_AMOUNT_CREDIT > 0 AND (DATE(`t`.`dt_UPDATED`) >= '"
                    + dt_date_debut + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin
                    + "') AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "') END AS PART_CLIENT, "
                    + "CASE WHEN (t.str_STATUT_VENTE = '" + commonparameter.statut_differe
                    + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_NON_ORDONNANCEE
                    + "') THEN (SELECT SUM(pc.int_PRICE_RESTE) FROM t_cash_transaction ct, t_preenregistrement t, t_preenregistrement_compte_client pc WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND pc.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND t.str_STATUT_VENTE = '"
                    + commonparameter.statut_differe + "' AND ct.int_AMOUNT >= 0 AND t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE + "' AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut
                    + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "') AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "') WHEN (t.str_STATUT_VENTE = '" + commonparameter.statut_differe
                    + "' AND t.str_TYPE_VENTE = '" + Parameter.KEY_VENTE_ORDONNANCE
                    + "') THEN (SELECT SUM(pc.int_PRICE_RESTE) FROM t_cash_transaction ct, t_preenregistrement t, t_preenregistrement_compte_client pc WHERE t.lg_PREENREGISTREMENT_ID = ct.str_RESSOURCE_REF AND pc.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND t.str_STATUT_VENTE = '"
                    + commonparameter.statut_differe + "' AND ct.int_AMOUNT >= 0 AND t.str_TYPE_VENTE = '"
                    + Parameter.KEY_VENTE_ORDONNANCE + "' AND (DATE(`t`.`dt_UPDATED`) >= '" + dt_date_debut
                    + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "') AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND ct.str_TYPE = true) ELSE 0 END AS PART_CLIENT_DETTE "
                    + "FROM t_preenregistrement t, t_type_reglement tr, t_mode_reglement mr, t_reglement r, t_emplacement e, t_user u WHERE t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = mr.lg_TYPE_REGLEMENT_ID AND r.lg_MODE_REGLEMENT_ID = mr.lg_MODE_REGLEMENT_ID AND (DATE(`t`.`dt_UPDATED`) >= '"
                    + dt_date_debut + "' AND DATE(`t`.`dt_UPDATED`) <= '" + dt_date_fin + "') AND t.str_STATUT = '"
                    + commonparameter.statut_is_Closed
                    + "' AND e.lg_EMPLACEMENT_ID = u.lg_EMPLACEMENT_ID AND t.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID
                    + "' AND (t.int_PRICE > 0 AND t.b_IS_CANCEL = 0) AND t.lg_TYPE_VENTE_ID NOT LIKE '"
                    + Parameter.VENTE_DEPOT_EXTENSION + "' GROUP BY t.str_TYPE_VENTE, tr.str_NAME";

            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();

                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("TOTAL_REMISE"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_TYPE_REGLEMENT"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("NB"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("PART_CLIENT"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("PART_CLIENT_DETTE"));

                // code ajouté 24/08/2016
                /*
                 * if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1) {
                 * OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("VENTE_BRUT_OTHER"));
                 * OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("VENTE_NET_OTHER"));
                 * OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("PART_TIERSPAYANT_OTHER"));
                 * OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("TOTAL_CAISSE_OTHER")); } else {
                 */
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("VENTE_BRUT"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("VENTE_NET"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("PART_TIERSPAYANT"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("TOTAL_CAISSE"));
                // }
                // fin code ajouté 24/08/2016

                lstEntityData.add(OEntityData);

            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille " + lstEntityData.size());
        return lstEntityData;
    }

    // total vente brut
    public int getVenteBrutBalanceVC(List<EntityData> lstEntityData, String type_vente) {
        int result = 0;
        for (EntityData OentityData : lstEntityData) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value1());
            }

        }
        return result;
    }
    // fin total vente brut

    // total remise
    public int getTotalRemiseBalanceVC(List<EntityData> lstEntityData, String type_vente) {
        int result = 0;
        for (EntityData OentityData : lstEntityData) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value2());
            }
        }
        return result;
    }
    // fin total remise

    // total vente net
    public int getVenteNetBalanceVC(List<EntityData> lstEntityData, String type_vente) {
        int result = 0;
        for (EntityData OentityData : lstEntityData) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value3());
            }
        }
        return result;
    }
    // fin total vente net

    // total nombre de vente
    public int getNbreVenteBalanceVC(List<EntityData> lstEntityData, String type_vente) {
        int result = 0;
        for (EntityData OentityData : lstEntityData) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Integer.valueOf(OentityData.getStr_value7());
            }
        }
        return result;
    }
    // fin total nombre de vente

    // total part tiers payant
    public Double getTotalTiersPayantBalanceVC(List<EntityData> lstEntityData, String type_vente) {
        double result = 0;
        for (EntityData OentityData : lstEntityData) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Double.valueOf(OentityData.getStr_value8());
            }
        }
        return result;
    }
    // fin total part tiers payant

    // total part client
    public int getTotalClientBalanceVC(List<EntityData> lstEntityData, String type_vente) {
        int result = 0;
        for (EntityData OentityData : lstEntityData) {
            if (OentityData.getStr_value4().equalsIgnoreCase(type_vente)) {
                result += Double.valueOf(OentityData.getStr_value9());
            }
        }
        return result;
    }
    // fin total part client

    // panier moyen
    public int getPanierMoyenBalanceVC(int VENTE_NET, int NB) {
        int result = 0;
        try {
            result = (int) Math.round((double) VENTE_NET / (double) NB);

        } catch (Exception e) {
        }
        return result;
    }
    // fin panier moyen

    // ration vente en fonction du type de vente
    public int getRationBalanceVC(int TOTAL_GLOBAL, int VENTE_NET) {
        int result = 0;
        try {
            result = (int) Math.round(((double) VENTE_NET * 100) / (double) TOTAL_GLOBAL);

        } catch (Exception e) {
        }
        return result;
    }
    // fin ration vente en fonction du type de vente

    // total global
    public int getTotalGlobalBalanceVC(List<EntityData> lstEntityData) {
        int result = 0;
        for (EntityData OentityData : lstEntityData) {
            result += Integer.valueOf(OentityData.getStr_value3());
        }
        return result;
    }
    // fin total part client

    // montant total par type de vente et reglement
    public long getIntAmountByTypeRegleBalanceVC(List<EntityData> entityDatas, String type_vente,
            String lg_TYPE_REGLEMENT_ID) {
        long result = 0l;

        for (EntityData OentityData : entityDatas) {
            /*
             * if (OentityData.getStr_value4().equals(type_vente) &&
             * OentityData.getStr_value6().equalsIgnoreCase(lg_TYPE_REGLEMENT_ID)) { //a decommenter en cas de probleme
             * if (OentityData.getStr_value4().equals(Parameter.KEY_VENTE_ORDONNANCE)) { result +=
             * Integer.valueOf(OentityData.getStr_value9()); } else if
             * (OentityData.getStr_value4().equals(Parameter.KEY_VENTE_NON_ORDONNANCEE)) { result +=
             * Integer.valueOf(OentityData.getStr_value3()); } }
             */
            if (OentityData.getStr_value4().equals(type_vente)
                    && OentityData.getStr_value6().equalsIgnoreCase(lg_TYPE_REGLEMENT_ID)) {
                if (OentityData.getStr_value4().equals(Parameter.KEY_VENTE_ORDONNANCE)) {
                    result += Integer.valueOf(OentityData.getStr_value9());
                } else if (OentityData.getStr_value4().equals(Parameter.KEY_VENTE_NON_ORDONNANCEE)) {
                    // result += Integer.valueOf(OentityData.getStr_value3()); //ancien bon code. a decommenter en cas
                    // de probleme
                    // code ajouté
                    if (lg_TYPE_REGLEMENT_ID.equalsIgnoreCase(Parameter.KEY_TYPEREGLEMENT_DIFERRE)) {
                        result += Integer.valueOf(OentityData.getStr_value9());
                    } else {
                        result += Integer.valueOf(OentityData.getStr_value8());
                    }
                    // fin code ajouté

                }
            }

        }
        return result;
    }

    public long getIntAmountDetteByTypeRegleBalanceVC(List<EntityData> entityDatas, String type_vente,
            String lg_TYPE_REGLEMENT_ID) {
        long result = 0l;

        try {
            for (EntityData OentityData : entityDatas) {
                if (OentityData.getStr_value4().equals(type_vente)
                        && OentityData.getStr_value6().equalsIgnoreCase(lg_TYPE_REGLEMENT_ID)) {
                    result += Integer.valueOf(OentityData.getStr_value11());
                }
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }

        return result;
    }

    // fin montant total par type de vente et reglement
    // fin derniere bonne version de la balance vente/caisse
    // derniere bon mouvement de caisses
    public List<EntityData> getMouvementCaisse(String dt_date_debut, String dt_date_fin, String lg_USER_ID,
            String lg_TYPE_REGLEMENT_ID) {

        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        EntityData OEntityData;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            /*
             * String qry =
             * "SELECT t.str_RESSOURCE_REF, t.str_TYPE_VENTE, tr.`lg_TYPE_REGLEMENT_ID` ,CASE WHEN t.str_TRANSACTION_REF = 'C' THEN t.int_AMOUNT_CREDIT ELSE (-1) * t.int_AMOUNT_DEBIT END AS int_AMOUNT,r.str_FIRST_LAST_NAME AS CLIENTNAME, CASE WHEN t.str_NUMERO_COMPTE = '10800000000' THEN (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_mvt_caisse mm, t_user u1 WHERE mm.P_KEY = u1.lg_USER_ID AND t.str_RESSOURCE_REF = mm.lg_MVT_CAISSE_ID) ELSE CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) END AS str_FIRST_LAST_NAME, t.dt_CREATED, m.str_NAME, tr.str_NAME AS str_NAME_TYE_REGLEMENT, mc.str_NAME AS str_NAME_TYPE_MVT_CAISSE,t.str_NUMERO_COMPTE  "
             * // a decommenter en cas de probleme. 15/07/2015 +
             * "FROM t_cash_transaction t, t_user u, t_mode_reglement m, t_reglement r, t_type_reglement tr, t_type_mvt_caisse mc WHERE (t.str_TYPE_VENTE NOT LIKE '"
             * + Parameter.KEY_VENTE_NON_ORDONNANCEE + "' AND t.str_TYPE_VENTE NOT LIKE '" +
             * Parameter.KEY_VENTE_ORDONNANCE + "' AND t.str_NUMERO_COMPTE NOT LIKE '"+Parameter.
             * TYPE_NUMCOMPTE_MVTCAISSE_VO+"' AND t.str_NUMERO_COMPTE NOT LIKE '"+Parameter.
             * TYPE_NUMCOMPTE_MVTCAISSE_VNO+"') AND DATE(t.dt_CREATED) >= '" + dt_date_debut +
             * "' AND DATE(t.dt_CREATED) <= '" + dt_date_fin +
             * "' AND t.lg_USER_ID = u.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID AND t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID AND mc.str_CODE_COMPTABLE = t.str_NUMERO_COMPTE AND t.lg_USER_ID LIKE '"
             * + lg_USER_ID + "' AND tr.lg_TYPE_REGLEMENT_ID LIKE '" + lg_TYPE_REGLEMENT_ID +
             * "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID +
             * "' GROUP BY str_RESSOURCE_REF ORDER BY t.dt_CREATED ASC";
             */
            String qry = "SELECT t.str_RESSOURCE_REF, t.str_TYPE_VENTE, tr.`lg_TYPE_REGLEMENT_ID` ,CASE WHEN t.str_TRANSACTION_REF = 'C' THEN t.int_AMOUNT_CREDIT ELSE (-1) * t.int_AMOUNT_DEBIT END AS int_AMOUNT,r.str_FIRST_LAST_NAME AS CLIENTNAME, CASE WHEN t.str_NUMERO_COMPTE = '10800000000' THEN (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_mvt_caisse mm, t_user u1 WHERE mm.P_KEY = u1.lg_USER_ID AND t.str_RESSOURCE_REF = mm.lg_MVT_CAISSE_ID) ELSE CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) END AS str_FIRST_LAST_NAME, t.dt_CREATED, m.str_NAME, tr.str_NAME AS str_NAME_TYE_REGLEMENT, mc.str_NAME AS str_NAME_TYPE_MVT_CAISSE,t.str_NUMERO_COMPTE  "
                    + "FROM t_cash_transaction t, t_user u, t_mode_reglement m, t_reglement r, t_type_reglement tr, t_type_mvt_caisse mc WHERE (t.str_TYPE_VENTE NOT LIKE '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE + "' AND t.str_TYPE_VENTE NOT LIKE '"
                    + Parameter.KEY_VENTE_ORDONNANCE + "' AND t.str_NUMERO_COMPTE NOT LIKE '"
                    + Parameter.TYPE_NUMCOMPTE_MVTCAISSE_VO + "' AND t.str_NUMERO_COMPTE NOT LIKE '"
                    + Parameter.TYPE_NUMCOMPTE_MVTCAISSE_VNO + "') AND DATE(t.dt_CREATED) >= '" + dt_date_debut
                    + "' AND DATE(t.dt_CREATED) <= '" + dt_date_fin
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID AND t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID AND mc.str_CODE_COMPTABLE = t.str_NUMERO_COMPTE AND t.lg_USER_ID LIKE '"
                    + lg_USER_ID + "' AND tr.lg_TYPE_REGLEMENT_ID LIKE '" + lg_TYPE_REGLEMENT_ID
                    + "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND t.bool_CHECKED = true GROUP BY str_RESSOURCE_REF ORDER BY t.dt_CREATED ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_NAME"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_NAME_TYE_REGLEMENT"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_NAME_TYPE_MVT_CAISSE"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_AMOUNT"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("str_NUMERO_COMPTE"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("CLIENTNAME"));

                lstEntityData.add(OEntityData);
            }

            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();

        }

        return lstEntityData;
    }

    public List<EntityData> getMouvementCaisse(String dt_date_debut, String dt_date_fin, String lg_USER_ID,
            String lg_TYPE_REGLEMENT_ID, boolean bool_CHECKED) {

        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "SELECT t.str_RESSOURCE_REF, t.str_TYPE_VENTE, tr.`lg_TYPE_REGLEMENT_ID` ,CASE WHEN t.str_TRANSACTION_REF = 'C' THEN t.int_AMOUNT_CREDIT ELSE (-1) * t.int_AMOUNT_DEBIT END AS int_AMOUNT,r.str_FIRST_LAST_NAME AS CLIENTNAME, CASE WHEN t.str_NUMERO_COMPTE = '10800000000' THEN (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_mvt_caisse mm, t_user u1 WHERE mm.P_KEY = u1.lg_USER_ID AND t.str_RESSOURCE_REF = mm.lg_MVT_CAISSE_ID) ELSE CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) END AS str_FIRST_LAST_NAME, t.dt_CREATED, m.str_NAME, tr.str_NAME AS str_NAME_TYE_REGLEMENT, mc.str_NAME AS str_NAME_TYPE_MVT_CAISSE,t.str_NUMERO_COMPTE  "
                    + "FROM t_cash_transaction t, t_user u, t_mode_reglement m, t_reglement r, t_type_reglement tr, t_type_mvt_caisse mc WHERE (t.str_TYPE_VENTE NOT LIKE '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE + "' AND t.str_TYPE_VENTE NOT LIKE '"
                    + Parameter.KEY_VENTE_ORDONNANCE + "' AND t.str_NUMERO_COMPTE NOT LIKE '"
                    + Parameter.TYPE_NUMCOMPTE_MVTCAISSE_VO + "' AND t.str_NUMERO_COMPTE NOT LIKE '"
                    + Parameter.TYPE_NUMCOMPTE_MVTCAISSE_VNO + "') AND DATE(t.dt_CREATED) >= '" + dt_date_debut
                    + "' AND DATE(t.dt_CREATED) <= '" + dt_date_fin
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID AND t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID AND mc.str_CODE_COMPTABLE = t.str_NUMERO_COMPTE AND t.lg_USER_ID LIKE '"
                    + lg_USER_ID + "' AND tr.lg_TYPE_REGLEMENT_ID LIKE '" + lg_TYPE_REGLEMENT_ID
                    + "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND t.bool_CHECKED = " + bool_CHECKED
                    + " GROUP BY str_RESSOURCE_REF ORDER BY t.dt_CREATED ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_NAME"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_NAME_TYE_REGLEMENT"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_NAME_TYPE_MVT_CAISSE"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_AMOUNT"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("str_NUMERO_COMPTE"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("CLIENTNAME"));

                lstEntityData.add(OEntityData);
            }

            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();

        }

        return lstEntityData;
    }

    public List<EntityData> getMouvementCaisse(String dt_date_debut, String dt_date_fin, String lg_USER_ID,
            String lg_TYPE_REGLEMENT_ID, boolean bool_CHECKED, int start, int limit) {

        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            String qry = "SELECT t.str_RESSOURCE_REF, t.str_TYPE_VENTE, tr.`lg_TYPE_REGLEMENT_ID` ,CASE WHEN t.str_TRANSACTION_REF = 'C' THEN t.int_AMOUNT_CREDIT ELSE (-1) * t.int_AMOUNT_DEBIT END AS int_AMOUNT,r.str_FIRST_LAST_NAME AS CLIENTNAME, CASE WHEN t.str_NUMERO_COMPTE = '10800000000' THEN (SELECT CONCAT(u1.str_FIRST_NAME,' ',u1.str_LAST_NAME) FROM t_mvt_caisse mm, t_user u1 WHERE mm.P_KEY = u1.lg_USER_ID AND t.str_RESSOURCE_REF = mm.lg_MVT_CAISSE_ID) ELSE CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) END AS str_FIRSTLAST_NAME, t.dt_CREATED, m.str_NAME, tr.str_NAME AS str_NAME_TYE_REGLEMENT, mc.str_NAME AS str_NAME_TYPE_MVT_CAISSE,t.str_NUMERO_COMPTE, (SELECT mca.str_COMMENTAIRE FROM t_mvt_caisse mca WHERE mca.lg_MVT_CAISSE_ID = t.str_RESSOURCE_REF) AS str_COMMENTAIRE  "
                    + "FROM t_cash_transaction t, t_user u, t_mode_reglement m, t_reglement r, t_type_reglement tr, t_type_mvt_caisse mc WHERE (t.str_TYPE_VENTE NOT LIKE '"
                    + Parameter.KEY_VENTE_NON_ORDONNANCEE + "' AND t.str_TYPE_VENTE NOT LIKE '"
                    + Parameter.KEY_VENTE_ORDONNANCE + "' AND t.str_NUMERO_COMPTE NOT LIKE '"
                    + Parameter.TYPE_NUMCOMPTE_MVTCAISSE_VO + "' AND t.str_NUMERO_COMPTE NOT LIKE '"
                    + Parameter.TYPE_NUMCOMPTE_MVTCAISSE_VNO + "') AND DATE(t.dt_CREATED) >= '" + dt_date_debut
                    + "' AND DATE(t.dt_CREATED) <= '" + dt_date_fin
                    + "' AND t.lg_USER_ID = u.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID = r.lg_MODE_REGLEMENT_ID AND t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID AND mc.str_CODE_COMPTABLE = t.str_NUMERO_COMPTE AND t.lg_USER_ID LIKE '"
                    + lg_USER_ID + "' AND tr.lg_TYPE_REGLEMENT_ID LIKE '" + lg_TYPE_REGLEMENT_ID
                    + "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND t.bool_CHECKED = " + bool_CHECKED
                    + " GROUP BY str_RESSOURCE_REF ORDER BY t.dt_CREATED ASC LIMIT " + start + "," + limit;

            new logger().OCategory.info(qry);
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_FIRSTLAST_NAME"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_NAME"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_NAME_TYE_REGLEMENT"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_NAME_TYPE_MVT_CAISSE"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_AMOUNT"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("str_NUMERO_COMPTE"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("CLIENTNAME"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("str_COMMENTAIRE"));
                lstEntityData.add(OEntityData);
            }

            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();

        }

        return lstEntityData;
    }

    // fin derniere bon mouvement de caisses
    /* get all caisse mouvment */
    public List<EntityData> getAllMouvmentsCaisse(String dt_date_debut, String dt_date_fin) {

        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData = null;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            lg_EMPLACEMENT_ID = (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY) ? "%%"
                    : this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            // String qry = "SELECT sum(t.int_PRICE) AS VENTE_BRUT, SUM(t.int_PRICE_REMISE) AS TOTAL_REMISE,
            // sum(t.int_PRICE) - SUM(t.int_PRICE_REMISE) AS VENTE_NET,t.str_TYPE_VENTE AS str_TYPE_VENTE, tr.str_NAME
            // AS str_TYPE_REGLEMENT, tr.lg_TYPE_REGLEMENT_ID AS lg_TYPE_REGLEMENT_ID, COUNT(t.lg_PREENREGISTREMENT_ID)
            // AS NB, (sum(t.int_PRICE) - SUM(t.int_PRICE_REMISE)) - sum(t.int_CUST_PART) AS PART_TIERSPAYANT,
            // sum(t.int_CUST_PART) AS PART_CLIENT , CASE WHEN t.str_TYPE_VENTE = 'VO' THEN sum(t.int_CUST_PART) ELSE
            // sum(t.int_PRICE) - SUM(t.int_PRICE_REMISE) END AS TOTAL_CAISSE "
            // + "FROM t_preenregistrement t, t_type_reglement tr, t_mode_reglement mr, t_reglement r, t_emplacement e,
            // t_user u WHERE t.lg_REGLEMENT_ID = r.lg_REGLEMENT_ID AND tr.lg_TYPE_REGLEMENT_ID =
            // mr.lg_TYPE_REGLEMENT_ID AND r.lg_MODE_REGLEMENT_ID = mr.lg_MODE_REGLEMENT_ID AND (DATE(`t`.`dt_CREATED`)
            // >='" + dt_date_debut + "' AND DATE(`t`.`dt_CREATED`) <= '" + dt_date_fin + "') AND t.str_STATUT = '" +
            // commonparameter.statut_is_Closed + "' AND e.lg_EMPLACEMENT_ID = u.lg_EMPLACEMENT_ID AND t.lg_USER_ID =
            // u.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '" + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
            // + "' GROUP BY t.str_TYPE_VENTE, tr.str_NAME";
            String qry = "SELECT sum(`o`.`int_AMOUNT`) AS `AMOUNT`,tr.`lg_TYPE_REGLEMENT_ID`, `o`.`lg_TYPE_MVT_CAISSE_ID` ,`o`.`lg_MODE_REGLEMENT_ID` ,`tr`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`tm`.`str_NAME` AS `MOUVMENT`  FROM t_mvt_caisse o,t_type_mvt_caisse tm,t_mode_reglement t,t_type_reglement tr, t_user u WHERE u.lg_USER_ID = o.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID
                    + "' AND o.`lg_TYPE_MVT_CAISSE_ID`=tm.`lg_TYPE_MVT_CAISSE_ID` AND o.`lg_MODE_REGLEMENT_ID`=t.`lg_MODE_REGLEMENT_ID` AND t.`lg_TYPE_REGLEMENT_ID`=tr.`lg_TYPE_REGLEMENT_ID` AND DATE(o.`dt_CREATED`) >='"
                    + dt_date_debut + "' AND DATE(o.`dt_CREATED`) <='" + dt_date_fin
                    + "' AND o.bool_CHECKED = true AND o.str_STATUT = '" + commonparameter.statut_enable
                    + "'  GROUP BY tm.`lg_TYPE_MVT_CAISSE_ID`, `tr`.`lg_TYPE_REGLEMENT_ID` ORDER BY tr.`str_DESCRIPTION` ,tm.`str_NAME`";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("AMOUNT"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("MOUVMENT"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("lg_TYPE_MVT_CAISSE_ID"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("lg_MODE_REGLEMENT_ID"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));

                lstEntityData.add(OEntityData);

            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille " + lstEntityData.size());
        return lstEntityData;
    }

    public List<EntityData> getAllMouvmentsCaisse(String dt_date_debut, String dt_date_fin, boolean bool_CHECKED) {

        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            lg_EMPLACEMENT_ID = (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY) ? "%%"
                    : this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            String qry = "SELECT sum(`o`.`int_AMOUNT`) AS `AMOUNT`,tr.`lg_TYPE_REGLEMENT_ID`, `o`.`lg_TYPE_MVT_CAISSE_ID` ,`o`.`lg_MODE_REGLEMENT_ID` ,`tr`.`str_DESCRIPTION` AS `str_DESCRIPTION`,`tm`.`str_NAME` AS `MOUVMENT`  FROM t_mvt_caisse o,t_type_mvt_caisse tm,t_mode_reglement t,t_type_reglement tr, t_user u WHERE u.lg_USER_ID = o.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID
                    + "' AND o.`lg_TYPE_MVT_CAISSE_ID`=tm.`lg_TYPE_MVT_CAISSE_ID` AND o.`lg_MODE_REGLEMENT_ID`=t.`lg_MODE_REGLEMENT_ID` AND t.`lg_TYPE_REGLEMENT_ID`=tr.`lg_TYPE_REGLEMENT_ID` AND DATE(o.`dt_CREATED`) >='"
                    + dt_date_debut + "' AND DATE(o.`dt_CREATED`) <='" + dt_date_fin + "' AND o.bool_CHECKED = "
                    + bool_CHECKED
                    + " GROUP BY tm.`lg_TYPE_MVT_CAISSE_ID`, `tr`.`lg_TYPE_REGLEMENT_ID`  ORDER BY tr.`str_DESCRIPTION` ,tm.`str_NAME`";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("AMOUNT"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("MOUVMENT"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("lg_TYPE_MVT_CAISSE_ID"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("lg_MODE_REGLEMENT_ID"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));

                lstEntityData.add(OEntityData);

            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille " + lstEntityData.size());
        return lstEntityData;
    }

    // gestion du ticket z
    // impression ticket de caisse
    public void lunchPrinterForTicketCaisse(String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin,
            String str_TASK, String fileBarecode) {
        DriverPrinter ODriverPrinter = new DriverPrinter(this.getOdataManager(), this.getOTUser());
        // PrinterManager OPrinterManager = new PrinterManager(this.getOdataManager(), this.getOTUser());
        List<EntityData> lstEntityData = new ArrayList<>();
        String lg_IMPRIMANTE_ID = "%%", title = "";

        try {
            new logger().OCategory.info("fileBarecode " + fileBarecode);

            // TUserImprimante OTUserImprimante = OPrinterManager.getTUserImprimante(this.getOTUser().getLgUSERID(),
            // lg_IMPRIMANTE_ID, commonparameter.str_ACTION_VENTE);
            lstEntityData = this.generateDataForTicketZ(dt_Date_Debut, dt_Date_Fin, h_debut, h_fin, str_TASK); //
            ODriverPrinter.setType_ticket(commonparameter.str_TICKETZ);
            ODriverPrinter.setDatas(this.generateTicketZForPrint(lstEntityData));
            ODriverPrinter.setDatasSubTotal(new ArrayList<>());
            ODriverPrinter.setDatasInfoTiersPayant(new ArrayList<>());
            title = "TICKET Z DU " + dt_Date_Debut + " DE " + h_debut + " A " + h_fin;
            ODriverPrinter.setTitle(title);
            ODriverPrinter.setDatasInfoSeller(new ArrayList<>());
            ODriverPrinter.setDataCommentaires(new ArrayList<>());
            ODriverPrinter.setCodeShow(true);
            ODriverPrinter.setName_code_bare(fileBarecode);
            ODriverPrinter.PrintTicketVente(1);
            this.setMessage(ODriverPrinter.getMessage());
            this.setDetailmessage(ODriverPrinter.getDetailmessage());

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'impression du ticket");
        }
    }
    // fin impression ticket de caisse

    public List<EntityData> generateDataForTicketZ(String dt_Date_Debut, String dt_Date_Fin, String h_debut,
            String h_fin, String str_TASK) {

        List<EntityData> lstData = new ArrayList<>();
        EntityData OEntityData = null;
        Date today = new Date();
        try {
            String criteria = ("%%".equals(str_TASK) ? " t.str_TASK <> '" + Parameter.KEY_TASK_ANNULE_VENTE + "' "
                    : "t.str_TASK = '" + str_TASK + "'");

            jconnexion Ojconnexion1 = new jconnexion();
            Ojconnexion1.initConnexion();
            Ojconnexion1.OpenConnexion();

            if (!dt_Date_Debut.equalsIgnoreCase(date.DateToString(today, date.formatterMysqlShort))) {
                h_debut = "00:00:00";
            }
            if (!dt_Date_Fin.equalsIgnoreCase(date.DateToString(today, date.formatterMysqlShort))) {
                h_fin = "23:59:59";
            }

            String qry = "SELECT t.str_TASK, COUNT(t.int_AMOUNT)" + "AS nbre, SUM(t.int_AMOUNT) AS "
                    + "TOTAL, t.lg_USER_ID, t.str_NAME_TYE_REGLEMENT, t.str_FIRST_LAST_NAME,"
                    + "(SELECT SUM(tt.int_PRICE) " + "FROM t_preenregistrement_compte_client_tiers_payent tt,"
                    + "t_preenregistrement p " + "WHERE tt.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID "
                    + "AND p.lg_USER_ID = t.lg_USER_ID " + "AND p.str_STATUT = '" + commonparameter.statut_is_Closed
                    + "' " + "AND (DATE(tt.dt_CREATED) >= '" + dt_Date_Debut + "' " + "AND  DATE(tt.dt_CREATED) <= '"
                    + dt_Date_Fin + "') " + "AND (TIME(tt.dt_CREATED) >= '" + h_debut + "' "
                    + "AND  TIME(tt.dt_CREATED) <= '" + h_fin + "') " + "AND  p.int_PRICE > 0 AND p.b_IS_CANCEL = 0) "
                    + "AS int_AMOUNT_AUTRE, (SELECT COUNT(tt.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID) "
                    + "FROM t_preenregistrement_compte_client_tiers_payent tt, t_preenregistrement p "
                    + "WHERE tt.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID "
                    + "AND p.lg_USER_ID = t.lg_USER_ID AND p.str_STATUT = '" + commonparameter.statut_is_Closed + "'"
                    + "AND (DATE(tt.dt_CREATED) >= '" + dt_Date_Debut + "' " + "AND DATE(tt.dt_CREATED) <= '"
                    + dt_Date_Fin + "') " + "AND (TIME(tt.dt_CREATED) >= '" + h_debut + "' "
                    + "AND TIME(tt.dt_CREATED) <= '" + h_fin + "') " + "AND p.int_PRICE > 0 "
                    + "AND p.b_IS_CANCEL = 0) " + "AS int_NUMBER " + "FROM v_caisse t "
                    + "WHERE (DATE(t.dt_CREATED) >= '" + dt_Date_Debut + "' " + "AND DATE(t.dt_CREATED) <= '"
                    + dt_Date_Fin + "') " + "AND (TIME(t.dt_CREATED) >= '" + h_debut + "' "
                    + "AND TIME(t.dt_CREATED) <= '" + h_fin + "') " + "AND ( " + criteria + "  AND t.ETAT_VENTE = 0  ) "
                    + "AND t.lg_USER_ID LIKE '%%' "
                    + "AND t.lg_TYPE_REGLEMENT_ID LIKE '%%' GROUP BY t.str_FIRST_LAST_NAME, t.str_NAME_TYE_REGLEMENT ORDER BY t.str_FIRST_LAST_NAME, t.str_NAME_TYE_REGLEMENT";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion1.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion1.get_resultat().getMetaData();
            while (Ojconnexion1.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion1.get_resultat().getString("str_TASK"));
                OEntityData.setStr_value2(Ojconnexion1.get_resultat().getString("TOTAL"));
                OEntityData.setStr_value3(Ojconnexion1.get_resultat().getString("lg_USER_ID"));
                OEntityData.setStr_value4(Ojconnexion1.get_resultat().getString("str_NAME_TYE_REGLEMENT"));
                OEntityData.setStr_value5((Ojconnexion1.get_resultat().getString("int_AMOUNT_AUTRE") != null)
                        ? Ojconnexion1.get_resultat().getString("int_AMOUNT_AUTRE") : "0");
                OEntityData.setStr_value6(Ojconnexion1.get_resultat().getString("str_FIRST_LAST_NAME"));
                OEntityData.setStr_value7(Ojconnexion1.get_resultat().getString("nbre"));
                OEntityData.setStr_value8((Ojconnexion1.get_resultat().getString("int_NUMBER") != null)
                        ? Ojconnexion1.get_resultat().getString("int_NUMBER") : "0");

                lstData.add(OEntityData);
            }
            Ojconnexion1.CloseConnexion();

        } catch (Exception e) {
        }
        new logger().OCategory.info("lstData taille " + lstData.size());
        return lstData;
    }

    public List<String> generateTicketZForPrint(List<EntityData> lstEntityData) {

        List<String> lstData = new ArrayList<>();
        List<String> lstString = new ArrayList<>();
        int int_AMOUNT = 0, int_TOTAL = 0, int_GLOBAL = 0, int_OTHER = 0, int_NUMBER = 0, int_NUMBER_OTHER = 0;
        String str_NAME_TYE_REGLEMENT = "", str_FIRST_LAST_NAME = "";
        try {

            if (lstEntityData.size() > 0) {
                for (EntityData OEntityData : lstEntityData) {
                    if (lstString.isEmpty()) {
                        lstString.add(OEntityData.getStr_value3());

                        lstData.add("RECAPITULATIF DE LA CAISSE DE " + OEntityData.getStr_value6() + " ; ; ; ;1;0");
                        lstData.add(" ; ; ; ; ; ;");
                        int_AMOUNT = Integer.parseInt(OEntityData.getStr_value2());
                        str_NAME_TYE_REGLEMENT = OEntityData.getStr_value4();
                        int_NUMBER = Integer.parseInt(OEntityData.getStr_value7());

                        lstData.add(int_NUMBER + ";" + str_NAME_TYE_REGLEMENT + ": ;"
                                + conversion.AmountFormat(int_AMOUNT, '.') + "; F CFA;0;1");

                        str_FIRST_LAST_NAME = OEntityData.getStr_value6();
                        int_OTHER = Integer.parseInt(OEntityData.getStr_value5());
                        int_NUMBER_OTHER = Integer.parseInt(OEntityData.getStr_value8());
                        int_TOTAL = int_AMOUNT + int_OTHER;
                        int_GLOBAL = int_AMOUNT + int_OTHER;
                    } else {
                        if (lstString.get(0).equalsIgnoreCase(OEntityData.getStr_value3())) {

                            int_AMOUNT = Integer.parseInt(OEntityData.getStr_value2());
                            str_NAME_TYE_REGLEMENT = OEntityData.getStr_value4();

                            lstData.add(int_NUMBER + ";" + str_NAME_TYE_REGLEMENT + ": ;"
                                    + conversion.AmountFormat(int_AMOUNT, '.') + "; F CFA;0;1");

                            int_TOTAL += int_AMOUNT;
                            int_GLOBAL += int_AMOUNT;

                        } else {
                            new logger().OCategory.info("Total user précédent " + str_FIRST_LAST_NAME + "----"
                                    + int_TOTAL + "****" + int_GLOBAL);
                            lstData.add(int_NUMBER_OTHER + ";AUTRES: ;" + conversion.AmountFormat(int_OTHER, '.')
                                    + "; F CFA;0;1");
                            lstData.add("TOTAL " + str_FIRST_LAST_NAME + ": ; ;"
                                    + conversion.AmountFormat(int_TOTAL, '.') + "; F CFA;1;1");
                            lstData.add(" ; ; ; ; ; ;");
                            lstString.clear();
                            int_TOTAL = 0;
                            lstString.add(OEntityData.getStr_value3());

                            lstData.add("RECAPITULATIF DE LA CAISSE DE " + OEntityData.getStr_value6() + "; ; ; ;1;0");
                            lstData.add(" ; ; ; ; ; ;");
                            int_AMOUNT = Integer.parseInt(OEntityData.getStr_value2());
                            str_NAME_TYE_REGLEMENT = OEntityData.getStr_value4();
                            int_NUMBER = Integer.parseInt(OEntityData.getStr_value7());

                            str_FIRST_LAST_NAME = OEntityData.getStr_value6();
                            int_OTHER = Integer.parseInt(OEntityData.getStr_value5());
                            int_NUMBER_OTHER = Integer.parseInt(OEntityData.getStr_value8());
                            int_TOTAL = int_AMOUNT + int_OTHER;
                            int_GLOBAL += int_AMOUNT + int_OTHER;
                            lstData.add(int_NUMBER + ";" + str_NAME_TYE_REGLEMENT + ": ;"
                                    + conversion.AmountFormat(int_AMOUNT, '.') + "; F CFA;0;1");
                        }

                    }

                }
                new logger().OCategory
                        .info("Dernier user:" + str_FIRST_LAST_NAME + "----" + int_TOTAL + "****" + int_GLOBAL);
                lstData.add(int_NUMBER_OTHER + ";AUTRES: ;" + conversion.AmountFormat(int_OTHER, '.') + "; F CFA;0;1");
                lstData.add("TOTAL " + str_FIRST_LAST_NAME + ": ; ;" + conversion.AmountFormat(int_TOTAL, '.')
                        + "; F CFA;1;1");
                lstData.add(" ; ; ; ; ; ;");
                lstData.add("TOTAL GENERAL: ; ;" + conversion.AmountFormat(int_GLOBAL, '.') + "; F CFA;1;1");
                lstString.clear();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstData;
    }
    // fin gestion du ticket z

    // total general des ventes a credit a afficher sur la facture subrogatoire
    /*
     * public double getTotalBon(List<EntityData> lstEntityData) {// 20/11/2016 double result = 0.0; try { for
     * (EntityData OEntityData : lstEntityData) { result += Integer.parseInt(OEntityData.getStr_value12()); } } catch
     * (Exception e) { } return result; }
     */
    public double getTotalBon(String search_value, String dt_Date_Debut, String dt_Date_Fin, String h_debut,
            String h_fin, String lg_TIERS_PAYANT_ID) {
        double result = 0.0;
        List<Object[]> lstEntityData = new ArrayList<Object[]>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_USER_ID = this.getOTUser().getLgUSERID(),
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            }
            String qry = "SELECT * FROM v_facture_subrogatoire v WHERE v.int_PRICE > 0 AND v.b_IS_CANCEL = false AND v.lg_EMPLACEMENT_ID LIKE '"
                    + lg_EMPLACEMENT_ID + "' AND (v.dt_UPDATED >= '" + dt_Date_Debut + " " + h_debut
                    + "' AND v.dt_UPDATED <= '" + dt_Date_Fin + " " + h_fin + "') AND (v.str_FIRST_NAME_CUSTOMER LIKE '"
                    + search_value + "%' OR v.str_LAST_NAME_CUSTOMER LIKE '" + search_value
                    + "%' OR v.str_FIRST_LAST_NAME LIKE '" + search_value + "%' OR v.str_REF_BON LIKE '" + search_value
                    + "%' OR v.str_REF LIKE '" + search_value + "%' OR v.str_REF_TICKET LIKE '" + search_value
                    + "%') AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND v.lg_TIERS_PAYANT_ID LIKE '"
                    + lg_TIERS_PAYANT_ID
                    + "' GROUP BY v.lg_PREENREGISTREMENT_ID ORDER BY v.str_TYPE_TIERS_PAYANT, v.str_NAME, v.dt_UPDATED ASC";
            lstEntityData = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();
            for (Object[] OEntityData : lstEntityData) {
                result += Integer.parseInt(OEntityData[6].toString());
            }
        } catch (Exception e) {
        }
        return result;
    }
    // fin total general des ventes a credit a afficher sur la facture subrogatoire

    // total general des ventes a credit a afficher sur la facture subrogatoire
    public double getTotalAttenduParTP(List<EntityData> lstEntityData) {
        double result = 0.0;
        try {
            for (EntityData OEntityData : lstEntityData) {
                result += Integer.parseInt(OEntityData.getStr_value4());
            }
        } catch (Exception e) {
        }
        return result;
    }
    // fin total general des ventes a credit a afficher sur la facture subrogatoire

    // total general des ventes a credit a afficher sur la facture subrogatoire
    public int getTotalNbreBon(List<EntityData> lstEntityData) {
        int result = 0;
        try {
            result = lstEntityData.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public List<EntityData> getListeVenteInDepotForBalanceVenteCaisse(String dt_date_debut, String dt_date_fin,
            String lg_TYPE_REGLEMENT_ID, String lg_EMPLACEMENT_ID) {

        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData;

        try {
            jconnexion Ojconnexion1 = new jconnexion();
            Ojconnexion1.initConnexion();
            Ojconnexion1.OpenConnexion();

            String qry = "SELECT * FROM v_caisse t WHERE DATE(t.dt_CREATED) >= '" + dt_date_debut
                    + "' AND DATE(t.dt_CREATED) <= '" + dt_date_fin + "' AND t.lg_TYPE_REGLEMENT_ID LIKE '"
                    + lg_TYPE_REGLEMENT_ID + "' AND t.lg_EMPLACEMENT_ID NOT LIKE '" + commonparameter.PROCESS_SUCCESS
                    + "' AND t.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID + "' AND (t.str_TASK LIKE '"
                    + Parameter.KEY_TASK_VENTE + "' OR t.str_TASK LIKE '" + Parameter.KEY_TASK_ANNULE_VENTE
                    + "') GROUP BY str_RESSOURCE_REF ORDER BY t.dt_CREATED ASC";
            new logger().OCategory.info(qry);
            Ojconnexion1.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion1.get_resultat().getMetaData();
            while (Ojconnexion1.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion1.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value2(Ojconnexion1.get_resultat().getString("str_NAME"));
                OEntityData.setStr_value3(Ojconnexion1.get_resultat().getString("str_NAME_TYE_REGLEMENT"));
                OEntityData.setStr_value4(Ojconnexion1.get_resultat().getString("str_NAME_TYPE_MVT_CAISSE"));
                OEntityData.setStr_value5(Ojconnexion1.get_resultat().getString("int_AMOUNT"));
                OEntityData.setStr_value6(Ojconnexion1.get_resultat().getString("lg_TYPE_REGLEMENT_ID"));
                lstEntityData.add(OEntityData);
            }

            Ojconnexion1.CloseConnexion();
        } catch (Exception ex) {
        }

        return lstEntityData;
    }
    // fin Liste des ventes effectué dans tous les depot extension de l'officine

    // total vente effectué dans tous les dépôts
    public Double getTotalAmountVenteInDepotForBalanceVenteCaisse(List<EntityData> lstEntityDatas,
            String lg_TYPE_REGLEMENT_ID) {
        Double result = 0.0;

        try {
            for (EntityData OEntityData : lstEntityDatas) {
                if (OEntityData.getStr_value6().equalsIgnoreCase(lg_TYPE_REGLEMENT_ID)) {
                    result += Double.parseDouble(OEntityData.getStr_value5());
                }
            }
        } catch (Exception ex) {
        }
        new logger().OCategory.info("result : " + result);
        return result;
    }

    // fin total vente effectué dans tous les dépôts
    // recuperation du billetage d'une caisse
    public TBilletageDetails getTBilletageDetails(String lg_CAISSE_ID) {
        TBilletageDetails OTBilletageDetails = null;
        try {
            OTBilletageDetails = (TBilletageDetails) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TBilletageDetails t WHERE t.lgBILLETAGEID.ldCAISSEID = ?1")
                    .setParameter(1, lg_CAISSE_ID).getSingleResult();
        } catch (Exception e) {
        }
        return OTBilletageDetails;
    }
    // fin recuperation du billetage d'une caisse

    // chargement des données
    public List<String> generateData(TBilletageDetails OTBilletageDetails) {
        List<String> datas = new ArrayList<>();
        try {
            datas.add("BILLET 10 Milles: ;" + OTBilletageDetails.getIntNBDIXMIL() + "; ");
            datas.add("BILLET 5 Milles: ;" + OTBilletageDetails.getIntNBCINQMIL() + "; ");
            datas.add("BILLET 2 Milles: ;" + OTBilletageDetails.getIntNBDEUXMIL() + "; ");
            datas.add("BILLET Mille: ;" + OTBilletageDetails.getIntNBMIL() + "; ");
            datas.add("BILLET 500: ;" + OTBilletageDetails.getIntNBCINQCENT() + "; ");
            datas.add("BILLET Autres: ;" + OTBilletageDetails.getIntAUTRE() + "; ");
            datas.add("Opérateur: ;" + OTBilletageDetails.getLgBILLETAGEID().getLgUSERID().getStrFIRSTNAME() + " "
                    + OTBilletageDetails.getLgBILLETAGEID().getLgUSERID().getStrLASTNAME() + "; ");
            datas.add(" ; ; ");
            datas.add(
                    "TOTAL ;" + conversion.AmountFormat(OTBilletageDetails.getLgBILLETAGEID().getIntAMOUNT().intValue())
                            + "; F CFA");
        } catch (Exception e) {
        }

        return datas;
    }
    // chargement des données

    // code ajoute par kobena 09/11/2016
    // function pour recuperer un mvt de caisse par type de mvt
    public long getMVTAmountByTypeMVT(String lg_TYPE_MVT_CAISSE_ID, String dt_start, String dt_end,
            String emplacement) {
        long Amount = 0;

        try {
            if ("".equals(dt_start)) {
                dt_start = date.formatterMysqlShort.format(new Date());

            }
            if ("".equals(dt_end)) {
                dt_end = date.formatterMysqlShort.format(new Date());
            }
            /*
             * String query =
             * "SELECT  SUM(`t_mvt_caisse`.`int_AMOUNT`) AS `MONTANT` FROM `t_mvt_caisse`  INNER JOIN `t_type_mvt_caisse` ON (`t_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID`) "
             * ; query += " WHERE `t_type_mvt_caisse`.`lg_TYPE_MVT_CAISSE_ID` = '" + lg_TYPE_MVT_CAISSE_ID + "' AND ";
             * query += " DATE( `t_mvt_caisse`.`dt_CREATED`) >=DATE('" + dt_start +
             * "') AND  DATE( `t_mvt_caisse`.`dt_CREATED`) <=DATE('" + dt_end + "')";
             */
            String query = "SELECT sum(`o`.`int_AMOUNT`) AS `AMOUNT`  FROM t_mvt_caisse o,t_type_mvt_caisse tm,t_mode_reglement t,t_type_reglement tr, t_user u WHERE u.lg_USER_ID = o.lg_USER_ID AND u.lg_EMPLACEMENT_ID LIKE  '"
                    + emplacement + "' AND `o`.`lg_TYPE_MVT_CAISSE_ID` = '" + lg_TYPE_MVT_CAISSE_ID
                    + "' AND  o.`lg_TYPE_MVT_CAISSE_ID`=tm.`lg_TYPE_MVT_CAISSE_ID` AND o.`lg_MODE_REGLEMENT_ID`=t.`lg_MODE_REGLEMENT_ID` AND t.`lg_TYPE_REGLEMENT_ID`=tr.`lg_TYPE_REGLEMENT_ID` AND DATE(o.`dt_CREATED`) >=DATE('"
                    + dt_start + "')  AND DATE(o.`dt_CREATED`) <=DATE('" + dt_end
                    + "')  AND o.bool_CHECKED = true AND o.str_STATUT = '" + commonparameter.statut_enable
                    + "'    GROUP BY tm.`lg_TYPE_MVT_CAISSE_ID`";
            Object object = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

            if (object != null) {
                Amount = Double.valueOf(object + "").longValue();
            }

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return Amount;
    }

    // recuperation de la marge sur une periode
    public Object[] getDataForMarge(String dt_BEGIN, String dt_END) {
        try {
            Object[] O = (Object[]) this.getOdataManager().getEm()
                    .createNativeQuery("call proc_calcul_marge('" + dt_BEGIN + "','" + dt_END + "')").getSingleResult();
            return O;
        } catch (Exception e) {
            return null;
        }

    }
    // fin recuperation de la marge sur une periode

    public String getRef(String id) {
        String ref = "";
        try {
            TMvtCaisse o = this.getOdataManager().getEm().find(TMvtCaisse.class, id);
            if (o != null) {
                ref = o.getStrNUMPIECECOMPTABLE();
            }
        } catch (Exception e) {
        }
        return ref;
    }

    /* function qui recuppere le les ventes annulees a une date +n ajoute le 12 09 2017 */
    public JSONObject getVenteAnnuler(String dt_start, String dt_end) {
        JSONObject json = new JSONObject();

        try {
            EntityManager em = this.getOdataManager().getEm();
            List<TPreenregistrement> list = em.createQuery(
                    "SELECT  o FROM TPreenregistrement o WHERE  FUNCTION('DATE', o.dtANNULER) >=?1 AND   FUNCTION('DATE', o.dtANNULER) <=?2  AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '5' AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '4' AND o.bISCANCEL=TRUE AND  FUNCTION('DATE',o.dtANNULER)>FUNCTION('DATE',o.dtUPDATED)  ")
                    .setParameter(1, java.sql.Date.valueOf(dt_start)).setParameter(2, java.sql.Date.valueOf(dt_end))
                    .getResultList();

            Integer montant = 0, montantES = 0;
            for (TPreenregistrement op : list) {

                TCashTransaction cs = (TCashTransaction) em
                        .createQuery(
                                "SELECT o FROM TCashTransaction o WHERE o.strRESSOURCEREF=?1 AND o.intAMOUNTDEBIT =0 ")
                        .setParameter(1, op.getLgPREENREGISTREMENTID()).getSingleResult();
                montant += (op.getIntPRICE() - op.getIntPRICEREMISE());
                if (cs != null) {
                    montantES += cs.getIntAMOUNT();

                }

            }
            json.putOpt("montant", montant).putOpt("montantES", montantES);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public JSONObject getVenteAnnuler2(String dt_start, String dt_end, String typevente) {
        JSONObject json = new JSONObject();

        try {
            EntityManager em = this.getOdataManager().getEm();
            List<TPreenregistrement> list = em.createQuery(
                    "SELECT  o FROM TPreenregistrement o WHERE  FUNCTION('DATE', o.dtANNULER) >=?1 AND   FUNCTION('DATE', o.dtANNULER) <=?2  AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '5' AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '4' AND o.bISCANCEL=TRUE AND  FUNCTION('DATE',o.dtANNULER)> FUNCTION('DATE',o.dtUPDATED) AND o.strTYPEVENTE=?3 ")
                    .setParameter(1, java.sql.Date.valueOf(dt_start)).setParameter(2, java.sql.Date.valueOf(dt_end))
                    .setParameter(3, typevente).getResultList();

            Integer montant = 0, montantES = 0, remise = 0, tp = 0, monantTTC = 0, cheques = 0, dif = 0, cb = 0;
            for (TPreenregistrement op : list) {

                TCashTransaction cs = (TCashTransaction) em
                        .createQuery(
                                "SELECT o FROM TCashTransaction o WHERE o.strRESSOURCEREF=?1 AND o.intAMOUNTDEBIT =0 ")
                        .setParameter(1, op.getLgPREENREGISTREMENTID()).getSingleResult();
                String reg = cs.getLgTYPEREGLEMENTID();
                monantTTC += op.getIntPRICE();
                montant += (op.getIntPRICE() - op.getIntPRICEREMISE());
                if (cs != null) {
                    switch (reg) {
                    case "1":

                        montantES += cs.getIntAMOUNT();
                        break;
                    case "2":
                        cheques += cs.getIntAMOUNT();
                        break;
                    case "3":
                        cb += cs.getIntAMOUNT();
                        break;
                    case "4":
                        dif += cs.getIntAMOUNT();
                        break;
                    default:
                        break;

                    }

                }
                remise += op.getIntPRICEREMISE();
                tp += montant - op.getIntCUSTPART();

            }
            json.putOpt("montant", montant).putOpt("montantES", montantES).put("tp", tp).put("remise", remise)
                    .put("monantTTC", monantTTC).put("cb", cb).put("differe", dif).put("cheques", cheques);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public JSONObject getBalanceReglTicketZ(String dt_start, String typevente, String lgEmp, String lgUSERID) {
        JSONObject json = new JSONObject();

        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);

            Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente));
            predicate = cb.and(predicate, cb.equal(pu.get(TUser_.lgUSERID), lgUSERID));
            Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);

            Predicate btw = cb.equal(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start));
            sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, btw, ge);

            Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);

            cq.multiselect(
                    cb.selectCase()
                            .when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "1"),
                                    cb.sum(root.get(TCashTransaction_.intAMOUNT)))
                            .otherwise(0),
                    cb.selectCase()
                            .when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "2"),
                                    cb.sum(root.get(TCashTransaction_.intAMOUNT)))
                            .otherwise(0),
                    cb.selectCase()
                            .when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "3"),
                                    cb.sum(root.get(TCashTransaction_.intAMOUNT)))
                            .otherwise(0),
                    cb.selectCase().when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "4"),
                            cb.sum(root.get(TCashTransaction_.intAMOUNT))).otherwise(0));
            cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));

            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();
            list.forEach((t) -> {
                try {

                    json.putOpt("montantES", Integer.valueOf(t[0].toString()) + Integer.valueOf(t[3].toString()))
                            .put("Cheques", Integer.valueOf(t[1].toString()))
                            .put("cb", Integer.valueOf(t[2].toString()));

                } catch (JSONException ex) {
                    ex.printStackTrace();
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public JSONArray getTicketZData(String dt_start, String lgEmp) {
        EntityManager em = this.getOdataManager().getEm();
        JSONArray array = new JSONArray();

        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Join<TPreenregistrement, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.equal(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start));
            cq.multiselect(cb.sum(root.get(TPreenregistrement_.intPRICE)),
                    cb.sum(root.get(TPreenregistrement_.intPRICEREMISE)),
                    cb.sum(cb.diff(
                            root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intPRICEREMISE))),
                    root.get(TPreenregistrement_.strTYPEVENTE),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(root.get(TPreenregistrement_.intCUSTPART)))
                            .otherwise(cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                                    root.get(TPreenregistrement_.intPRICEREMISE)))),
                    cb.count(root), cb.quot(cb.sum(root.get(TPreenregistrement_.intPRICE)), cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                                            root.get(TPreenregistrement_.intCUSTPART))))
                            .otherwise(0),
                    pu.get(TUser_.lgUSERID), pu.get(TUser_.strFIRSTNAME), pu.get(TUser_.strLASTNAME))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE), pu.get(TUser_.lgUSERID))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();

            double percent = 0, Gbl = 0, vo = 0, vno = 0;
            int nb = 0;
            Integer totalcq = 0, totalcb = 0, totalEs = 0;
            Map<Object, List<Object[]>> mysList = list.stream().collect(Collectors.groupingBy((t) -> {

                return t[8];
                // return t[9].toString().substring(0, 1)+"."+t[10];
            }));

            for (Map.Entry<Object, List<Object[]>> entry : mysList.entrySet()) {
                Object key1 = entry.getKey();
                List<Object[]> value = entry.getValue();
                JSONObject _ob = new JSONObject();

                String typeVente = "VO";
                for (Object[] t : value) {
                    try {
                        JSONObject ob = new JSONObject();
                        Integer VENTE_BRUT = Integer.valueOf(t[0] + ""), TOTAL_REMISE = Integer.valueOf(t[1] + ""),
                                VENTE_NET = Integer.valueOf(t[2] + ""), TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                                PANIER_MOYEN = Math.round(Double.valueOf(t[6] + "").intValue()),
                                PART_TIERSPAYANT = Integer.valueOf(t[7] + "");
                        JSONObject transac = getBalanceReglTicketZ(dt_start, t[3] + "", lgEmp, t[8].toString());
                        Integer TOTAL_DIFFERE = getTicketDiff(dt_start, t[3] + "", lgEmp, t[8].toString());

                        Integer montantES = transac.getInt("montantES");
                        Integer Cheques = transac.getInt("Cheques");
                        Integer cba = transac.getInt("cb");

                        Gbl += VENTE_NET;
                        totalcq += Cheques;
                        totalcb += cba;
                        totalEs += montantES;

                        nb += Integer.valueOf(t[5] + "");

                        ob.putOnce("OPERATEUR", t[9].toString().substring(0, 1) + "." + t[10]);
                        ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE)
                                .put("TOTAL_REMISE", TOTAL_REMISE).put("VENTE_NET", VENTE_NET);
                        ob.put("str_TYPE_VENTE", t[3] + "");
                        ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                        ob.put("NB", Integer.valueOf(t[5] + ""));
                        ob.put("PANIER_MOYEN", PANIER_MOYEN);
                        ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                        if ("VNO".equals(t[3] + "")) {
                            ob.put("PART_TIERSPAYANT", 0);
                            typeVente = "VNO";
                        }

                        ob.put("TOTAL_ESPECE", montantES);
                        ob.put("TOTAL_CHEQUE", Cheques);
                        ob.put("TOTAL_CARTEBANCAIRE", cba);
                        _ob.put(typeVente, ob);

                    } catch (Exception ex) {
                        ex.printStackTrace();
                    }
                }
                array.put(_ob);
            }
            JSONObject totaux = new JSONObject();

            totaux.put("NB", nb).put("GLOBALESP", totalEs).put("GLOBALCB", totalcb).put("GLOBALCQ", totalcq)
                    .put("GLOBAL", Gbl);
            array.put(new JSONObject().put("TOTAUX", totaux));

        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public Integer getTicketDiff(String dt_start, String typevente, String lgEmp, String lgUSERID) {
        EntityManager em = this.getOdataManager().getEm();
        Integer diff = 0;

        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);

            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
            Join<TPreenregistrementCompteClient, TPreenregistrement> r = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Join<TPreenregistrementCompteClient, TUser> pu = root.join("lgUSERID", JoinType.INNER);

            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(r.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(pu.get(TUser_.lgUSERID), lgUSERID));
            Predicate ge = cb.greaterThan(r.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.strTYPEVENTE), typevente));
            Predicate btw = cb.equal(cb.function("DATE", Date.class, r.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start));
            cq.select(cb.sum(root.get(TPreenregistrementCompteClient_.intPRICERESTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            diff = (Integer) q.getSingleResult();
            if (diff == null) {
                diff = 0;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return diff;
    }

    public List<String> generateTicketZForPrintMVT(JSONArray lstEntityData) {

        List<String> lstData = new ArrayList<>();

        Integer int_AMOUNTES = 0, int_TOTALENTREECB = 0, int_TOTALENTREECH = 0, int_TOTALENTREEVIR = 0,
                int_TOTALREGLCB = 0, int_TOTALREGLCH = 0, int_TOTALREGLVIR = 0, int_TOTALSORTIECB = 0,
                int_TOTALSORTIECH = 0, int_TOTALSORTIEVIR = 0, TOTALVO = 0;

        try {

            if (lstEntityData.length() > 0) {
                for (int i = 0; i < lstEntityData.length() - 1; i++) {
                    Integer TOTAUSER = 0, TOTAL_CHEQUE = 0, TOTAL_CARTEBANCAIRE = 0, totalRegl = 0, totalSortie = 0,
                            totalEntree = 0;
                    JSONObject userOb = lstEntityData.getJSONObject(i);

                    lstData.add("RECAPITULATIF DE CAISSE: " + userOb.optString("OPERATEUR") + " ; ; ; ;1;0");
                    lstData.add(" ; ; ; ; ; ;");
                    // lstData.add(int_NUMBER + ";" + str_NAME_TYE_REGLEMENT + ": ;" +
                    // conversion.AmountFormat(int_AMOUNT, '.') + "; F CFA;0;1");
                    if (userOb.optInt("TOTAL_ESPECE") > 0) {
                        TOTAUSER += Integer.valueOf(userOb.opt("TOTAL_ESPECE") + "");
                        lstData.add("Espèce(vno/vo):" + ";"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("TOTAL_ESPECE") + ""))
                                + "; F CFA;;0;1");
                    }
                    if (userOb.optInt("PART_TIERSPAYANT") > 0) {
                        TOTALVO += Integer.valueOf(userOb.opt("PART_TIERSPAYANT") + "");
                        lstData.add("Crédit(vo):" + ";"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("PART_TIERSPAYANT") + ""))
                                + "; F CFA;;0;1");
                    }

                    if (userOb.opt("ENTRESP") != null) {
                        TOTAUSER += Integer.valueOf(userOb.opt("ENTRESP") + "");
                        lstData.add("Espèce Entrée:" + ";"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("ENTRESP") + ""))
                                + "; F CFA;;0;1");
                    }
                    if (userOb.opt("SORTIEESP") != null) {
                        TOTAUSER -= Integer.valueOf(userOb.opt("SORTIEESP") + "");
                        lstData.add("Espèce Sortie:" + ";"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("SORTIEESP") + ""))
                                + "; F CFA;;0;1");
                    }
                    if (userOb.opt("REGLTPESP") != null) {
                        TOTAUSER += Integer.valueOf(userOb.opt("REGLTPESP") + "");
                        lstData.add("Espèce Regl:" + ";"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("REGLTPESP") + ""))
                                + "; F CFA;;0;1");
                    }
                    lstData.add("Total espèce: ;" + Util.getFormattedIntegerValue(TOTAUSER) + ";F CFA;;1;1");
                    if (userOb.opt("TOTAL_CHEQUE") != null) {
                        int_TOTALENTREECH += Integer.valueOf(userOb.opt("TOTAL_CHEQUE") + "");
                        lstData.add("Total Ch (vno/vo): ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("TOTAL_CHEQUE") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("TOTAL_CARTEBANCAIRE") != null) {
                        int_TOTALENTREECB += Integer.valueOf(userOb.opt("TOTAL_CARTEBANCAIRE") + "");
                        lstData.add("Total CB (vno/vo): ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("TOTAL_CARTEBANCAIRE") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("ENTRECH") != null) {
                        int_TOTALENTREECH += Integer.valueOf(userOb.opt("ENTRECH") + "");
                        lstData.add("Entrée Chèque : ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("ENTRECH") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("ENTRECB") != null) {
                        int_TOTALENTREECB += Integer.valueOf(userOb.opt("ENTRECB") + "");
                        lstData.add("Total entrée CB: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("ENTRECB") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("ENTREVIR") != null) {
                        int_TOTALENTREEVIR += Integer.valueOf(userOb.opt("ENTREVIR") + "");
                        lstData.add("Total entrée.Vir: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("ENTREVIR") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("REGLTPCH") != null) {
                        int_TOTALENTREECH += Integer.valueOf(userOb.opt("REGLTPCH") + "");
                        lstData.add("Total Regl Ch: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("REGLTPCH") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("REGLTPCB") != null) {
                        int_TOTALENTREECB += Integer.valueOf(userOb.opt("REGLTPCB") + "");
                        lstData.add("Total Regl CB: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("REGLTPCB") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("REGLTPVIR") != null) {
                        int_TOTALENTREEVIR += Integer.valueOf(userOb.opt("REGLTPVIR") + "");
                        lstData.add("Total Regl Vir: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("REGLTPVIR") + ""))
                                + ";F CFA;;1;1");
                    }

                    if (userOb.opt("SORTIECH") != null) {
                        int_TOTALENTREECH -= Integer.valueOf(userOb.opt("REGLTPCH") + "");
                        lstData.add("Total Sortie Ch: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("SORTIECH") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("SORTIECB") != null) {
                        int_TOTALENTREECB -= Integer.valueOf(userOb.opt("REGLTPCB") + "");
                        lstData.add("Total Sortie CB: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("SORTIECB") + ""))
                                + ";F CFA;;1;1");
                    }
                    if (userOb.opt("SORTIEVIR") != null) {
                        int_TOTALENTREEVIR -= Integer.valueOf(userOb.opt("REGLTPVIR") + "");
                        lstData.add("Total Sortie Vir: ;"
                                + Util.getFormattedIntegerValue(Integer.valueOf(userOb.opt("SORTIEVIR") + ""))
                                + ";F CFA;;1;1");
                    }
                    lstData.add(" ; ; ; ; ; ;");
                    int_AMOUNTES += TOTAUSER;
                }

            }

            lstData.add("TOTAL GENERAL ESP: ; " + Util.getFormattedIntegerValue(int_AMOUNTES) + "; F CFA;;1;1;G");
            if (TOTALVO > 0) {
                lstData.add("TOTAL GENERAL (VO): ;" + Util.getFormattedIntegerValue(TOTALVO) + "; F CFA; ;1;1;G");
            }

            if (int_TOTALENTREECH != 0) {
                lstData.add(
                        "TOTAL GENERAL CH: ;" + Util.getFormattedIntegerValue(int_TOTALENTREECH) + "; F CFA; ;1;1;G");
            }
            if (int_TOTALENTREECB != 0) {
                lstData.add(
                        "TOTAL GENERAL CB: ; " + Util.getFormattedIntegerValue(int_TOTALENTREECB) + "; F CFA;;1;1;G");
            }
            if (int_TOTALENTREEVIR != 0) {
                lstData.add(
                        "TOTAL GENERAL VIR: ; " + Util.getFormattedIntegerValue(int_TOTALENTREEVIR) + "; F CFA;;1;1;G");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstData;
    }

    // 23 11 2017 16: 52 ticket z
    // impression ticket de caisse
    public void ticketCaisse(String dt_Date_Debut, String dt_Date_Fin, String h_debut, String h_fin, boolean all,
            String fileBarecode) {
        DriverPrinter ODriverPrinter = new DriverPrinter(this.getOdataManager(), this.getOTUser());
        String title;

        try {
            new logger().OCategory.info("fileBarecode " + fileBarecode);
            GroupeTierspayantController controller = new GroupeTierspayantController(this.getOdataManager().getEmf());
            List<String> datas = null;// = this.generateTicketZForPrintMVT(controller.getTicketZDatas(dt_Date_Debut,
                                      // dt_Date_Fin, "1", all));
            ODriverPrinter.setType_ticket(commonparameter.str_TICKETZ);
            ODriverPrinter.setDatas(datas);
            ODriverPrinter.setDatasSubTotal(new ArrayList<>());
            ODriverPrinter.setDatasInfoTiersPayant(new ArrayList<>());
            // title = "TICKET Z DU " + dt_Date_Debut + " DE " + h_debut + " A " + h_fin;

            String dtTitle = LocalDate.parse(dt_Date_Debut).format(DateTimeFormatter.ofPattern("dd/MM/YYYY"));
            title = "TICKET Z DU " + dtTitle + "  A  " + h_fin;
            ODriverPrinter.setTitle(title);
            ODriverPrinter.setDatasInfoSeller(new ArrayList<>());
            ODriverPrinter.setDataCommentaires(new ArrayList<>());
            ODriverPrinter.setCodeShow(true);
            ODriverPrinter.setName_code_bare(fileBarecode);
            ODriverPrinter.PrintTicketVente(1);
            this.setMessage(ODriverPrinter.getMessage());
            this.setDetailmessage(ODriverPrinter.getDetailmessage());

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'impression du ticket");
        }
    }
    // fin impression ticket de caisse

}
