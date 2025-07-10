/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.reportventeManagement;

import bll.common.Parameter;
import bll.entity.EntityData;
import bll.entity.Journalvente;
import bll.preenregistrement.Preenregistrement;
import bll.userManagement.privilege;
import dal.TBilletage;
import dal.TPreenregistrement;
import dal.TResumeCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class Reportvente extends bll.bllBase {

    public Reportvente(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();

    }

    public List<EntityData> getBalanceVente(String dt_date_debut, String dt_date_fin) {

        Date dtDEBUT = this.getKey().stringToDate(dt_date_debut, this.getKey().backabaseUiFormat);
        Date dtFIN = this.getKey().stringToDate(dt_date_fin, this.getKey().backabaseUiFormat);

        new logger().OCategory.info(" ** dtDEBUT jv ** " + dtDEBUT);
        new logger().OCategory.info(" ** dtFIN  jv  ** " + dtFIN);
        String dtdebt = this.getKey().DateToString(dtDEBUT, this.getKey().formatterMysqlShort2);
        String dtfin = this.getKey().DateToString(dtFIN, this.getKey().formatterMysqlShort2);

        List<EntityData> Lst = new ArrayList<EntityData>();
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "select v_balance_vente.VO AS VO,v_balance_vente.VNO  AS VNO,v_balance_vente.TOTAL_VENTE AS TOTAL_VENTE,v_balance_vente.MONTANT_REMISE AS MONTANT_REMISE from v_balance_vente where v_balance_vente.dt_CREATED between '"
                    + dtdebt + "' and  '" + dtfin + "' ";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                EntityData OEntityData = new EntityData();

                OEntityData.setStr_value1(String.valueOf(Ojconnexion.get_resultat().getInt("VNO")));
                OEntityData.setStr_value2(String.valueOf(Ojconnexion.get_resultat().getInt("VO")));
                OEntityData.setStr_value3(String.valueOf(Ojconnexion.get_resultat().getDouble("TOTAL_VENTE")));
                OEntityData.setStr_value4(String.valueOf(Ojconnexion.get_resultat().getDouble("MONTANT_REMISE")));
                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info(" 000   data balance vente  000 " + Lst.size());
        return Lst;
    }

    public EntityData getBalanceCaisse(String dt_date_debut, String dt_date_fin) {

        Date dtDEBUT = this.getKey().stringToDate(dt_date_debut, this.getKey().backabaseUiFormat);
        Date dtFIN = this.getKey().stringToDate(dt_date_fin, this.getKey().backabaseUiFormat);

        new logger().OCategory.info(" ** dtDEBUT jv ** " + dtDEBUT);
        new logger().OCategory.info(" ** dtFIN  jv  ** " + dtFIN);
        String dtdebt = this.getKey().DateToString(dtDEBUT, this.getKey().formatterMysqlShort2);
        String dtfin = this.getKey().DateToString(dtFIN, this.getKey().formatterMysqlShort2);

        EntityData OEntityData = null;

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "select SUM(t_resume_caisse.int_SOLDE_SOIR) AS MONTANT_CAISSE from t_resume_caisse where t_resume_caisse.dt_CREATED  between '"
                    + dtdebt + "' and  '" + dtfin + "' ";

            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {

                OEntityData = new EntityData();
                OEntityData.setStr_value1(String.valueOf(Ojconnexion.get_resultat().getDouble("MONTANT_CAISSE")));
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return OEntityData;
    }

    public List<EntityData> getDataFromCashTransaction(String dt_date_debut, String dt_date_fin) {

        Date dtDEBUT = this.getKey().stringToDate(dt_date_debut, this.getKey().backabaseUiFormat);
        Date dtFIN = this.getKey().stringToDate(dt_date_fin, this.getKey().backabaseUiFormat);

        new logger().OCategory.info(" ** dtDEBUT getDataFromCashTransaction ** " + dtDEBUT);
        new logger().OCategory.info(" ** dtFIN  getDataFromCashTransaction  ** " + dtFIN);

        String dtdebt = this.getKey().DateToString(dtDEBUT, this.getKey().formatterMysqlShort2);
        String dtfin = this.getKey().DateToString(dtFIN, this.getKey().formatterMysqlShort2);

        new logger().OCategory.info(" ** dtdebt getDataFromCashTransaction ** " + dtdebt);
        new logger().OCategory.info(" ** dtfin  getDataFromCashTransaction  ** " + dtfin);

        List<EntityData> Lst = new ArrayList<EntityData>();
        Journalvente OJournalvente = null;
        EntityData OEntityData = null;
        Journalvente OJournalvente_amount = null;
        TTypeReglement OTTypeReglement = null;
        TPreenregistrement OTPreenregistrement = null;

        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "select t_cash_transaction.str_RESSOURCE_REF AS str_RESSOURCE_REF,t_cash_transaction.str_TYPE_VENTE  AS str_TYPE_VENTE,t_cash_transaction.int_AMOUNT_CREDIT AS int_AMOUNT_CREDIT,t_cash_transaction.dt_CREATED AS dt_CREATED,t_cash_transaction.lg_USER_ID AS lg_USER_ID,t_cash_transaction.lg_TYPE_REGLEMENT_ID AS lg_TYPE_REGLEMENT_ID from t_cash_transaction where t_cash_transaction.dt_CREATED between '"
                    + dtdebt + "' and '" + dtfin
                    + "' order by t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";

            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("lg_USER_ID"));

                OTTypeReglement = (TTypeReglement) this
                        .find(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"), new TTypeReglement());
                OEntityData.setStr_value6(OTTypeReglement.getStrNAME());

                OTPreenregistrement = OPreenregistrement
                        .FindPreenregistrement(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OEntityData.setStr_value7(OTPreenregistrement.getIntPRICEREMISE().toString());

                if (OEntityData.getStr_value2().equals("VO")) {
                    OJournalvente_amount = OPreenregistrement
                            .getOtherJournalData(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF")).iterator()
                            .next();
                    OEntityData.setStr_value8(OJournalvente_amount.getStr_client());
                    OEntityData.setStr_value9(OJournalvente_amount.getStr_client_infos());
                    OEntityData.setStr_value10(OJournalvente_amount.getStr_mt_clt());
                    OEntityData.setStr_value11(OJournalvente_amount.getStr_mt_tp());

                }

                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info(" 000   data cash  000 " + Lst.size());
        return Lst;
    }

    public List<EntityData> getDataFromCashTransaction(Date dtDEBUT, Date dtFIN, String lg_USER_ID,
            String lg_TYPE_REGLEMENT_ID) {

        new logger().OCategory.info(" ** dtDEBUT getDataFromCashTransaction ** " + dtDEBUT);
        new logger().OCategory.info(" ** dtFIN  getDataFromCashTransaction  ** " + dtFIN);

        // String dtdebt = this.getKey().DateToString(dtDEBUT, this.getKey().formatterMysqlShort2);
        // String dtfin = this.getKey().DateToString(dtFIN, this.getKey().formatterMysqlShort2);
        String dtdebt = this.getKey().DateToString(dtDEBUT, this.getKey().formatterMysql);
        String dtfin = this.getKey().DateToString(dtFIN, this.getKey().formatterMysql);

        new logger().OCategory.info(" ** dtdebt getDataFromCashTransaction ** " + dtdebt);
        new logger().OCategory.info(" ** dtfin  getDataFromCashTransaction  ** " + dtfin);

        List<EntityData> Lst = new ArrayList<EntityData>();
        Journalvente OJournalvente = null;
        EntityData OEntityData = null;
        Journalvente OJournalvente_amount = null;
        TTypeReglement OTTypeReglement = null;
        TPreenregistrement OTPreenregistrement = null;

        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // AND t_cash_transaction.int_AMOUNT>0
            // String qry = "select t_cash_transaction.str_RESSOURCE_REF AS
            // str_RESSOURCE_REF,t_cash_transaction.str_TYPE_VENTE AS
            // str_TYPE_VENTE,t_cash_transaction.int_AMOUNT_CREDIT AS int_AMOUNT_CREDIT,t_cash_transaction.dt_CREATED AS
            // dt_CREATED,t_cash_transaction.lg_USER_ID AS lg_USER_ID,t_cash_transaction.lg_TYPE_REGLEMENT_ID AS
            // lg_TYPE_REGLEMENT_ID from t_cash_transaction where t_cash_transaction.dt_CREATED between '" + dtdebt + "'
            // and '" + dtfin + "' order by t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
            String qry = "select t_cash_transaction.str_RESSOURCE_REF AS str_RESSOURCE_REF, SUM(t_cash_transaction.int_AMOUNT) AS int_AMOUNT_TOTAL,t_cash_transaction.str_TYPE_VENTE  AS str_TYPE_VENTE,t_cash_transaction.int_AMOUNT_CREDIT AS int_AMOUNT_CREDIT,t_cash_transaction.dt_CREATED AS dt_CREATED,t_cash_transaction.lg_USER_ID AS lg_USER_ID,t_cash_transaction.lg_TYPE_REGLEMENT_ID AS lg_TYPE_REGLEMENT_ID from t_cash_transaction where (t_cash_transaction.dt_CREATED >= '"
                    + dtdebt + "' and t_cash_transaction.dt_CREATED <= '" + dtfin
                    + "') and t_cash_transaction.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' and t_cash_transaction.lg_TYPE_REGLEMENT_ID LIKE '" + lg_TYPE_REGLEMENT_ID
                    + "' GROUP BY t_cash_transaction.str_RESSOURCE_REF order by t_cash_transaction.str_TYPE_VENTE,t_cash_transaction.dt_CREATED DESC";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_TYPE_VENTE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("int_AMOUNT_CREDIT"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("int_AMOUNT_TOTAL"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("dt_CREATED"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("lg_USER_ID"));

                OTTypeReglement = (TTypeReglement) this
                        .find(Ojconnexion.get_resultat().getString("lg_TYPE_REGLEMENT_ID"), new TTypeReglement());
                OEntityData.setStr_value6(OTTypeReglement.getStrNAME());

                OTPreenregistrement = OPreenregistrement
                        .FindPreenregistrement(Ojconnexion.get_resultat().getString("str_RESSOURCE_REF"));
                if (OTPreenregistrement != null) {
                    if (OTPreenregistrement.getIntPRICE() < 0) {
                        OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("int_AMOUNT_TOTAL"));
                    }
                    OEntityData.setStr_value7(OTPreenregistrement.getIntPRICEREMISE().toString());
                }

                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info(" 000   data cash  000 " + Lst.size());
        return Lst;
    }

    // resumé de la caisse sur une periode par utilisateur
    public List<TResumeCaisse> listeTResumeCaisseByUser(Date dt_Date_Debut, Date dt_Date_Fin, String lg_USER_ID) {
        List<TResumeCaisse> lstCaisses = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            lstCaisses = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND (t.dtCREATED >= ?3 AND t.dtCREATED <= ?4) AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?5 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_USER_ID).setParameter(3, dt_Date_Debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, lg_EMPLACEMENT_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstCaisses taille " + lstCaisses.size());
        return lstCaisses;
    }
    // fin resumé de la caisse sur une periode par utilisateur

    // recuperation du billage d'une caisse
    public TBilletage getBilletageByCaisse(String ld_CAISSE_ID, String lg_USER_ID) {
        TBilletage OTBilletage = null;
        try {
            OTBilletage = (TBilletage) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TBilletage t WHERE t.ldCAISSEID LIKE ?1 AND t.lgUSERID.lgUSERID LIKE ?2")
                    .setParameter(1, ld_CAISSE_ID).setParameter(2, lg_USER_ID).getSingleResult();
            new logger().OCategory.info("Montant caisse " + OTBilletage.getIntAMOUNT());
        } catch (Exception e) {
            // e.printStackTrace();
            new logger().OCategory.info("Error get billetage data  " + e.toString());
        }
        return OTBilletage;

    }
    // fin recuperation du billage d'une caisse

}
