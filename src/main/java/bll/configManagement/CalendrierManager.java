/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TCalendrier;
import dal.TMonth;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import javax.persistence.Query;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class CalendrierManager extends bllBase {

    TCalendrier OTCalendrier = new TCalendrier();

    public CalendrierManager(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public CalendrierManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    // recupere le recupere le mois
    public TMonth getTMonth(String lg_MONTH_ID) {
        TMonth OTMonth = null;
        try {
            OTMonth = (TMonth) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMonth t WHERE (t.lgMONTHID LIKE ?1 OR t.strNAME LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_MONTH_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
            new logger().OCategory.info("Mois " + OTMonth.getStrNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMonth;
    }
    // fin recupere le mois

    // fonction pour créer un calendrier
    public boolean createCalendrier(String lg_MONTH_ID, int int_ANNEE) {
        boolean result = false;
        TCalendrier OTCalendrier = null, OTCalendrier1 = null;
        Date today = new Date();
        Date dt_END_MONTH;
        try {

            OTCalendrier = this.getTCalendrier(lg_MONTH_ID, int_ANNEE);
            if (OTCalendrier == null) { // verifie si le mois de l'année en cours est deja pris en compte
                OTCalendrier = this.initCalendrier(lg_MONTH_ID, int_ANNEE);
            }

            OTCalendrier1 = this.getDalyTCalendrier();
            dt_END_MONTH = this.getKey()
                    .getLastDayofSomeMonth(Integer.parseInt(OTCalendrier.getLgMONTHID().getLgMONTHID()));
            if (OTCalendrier1 == null) { // verifie si le jour du mois est deja pris en compte
                /*
                 * if (OTCalendrier.getLgMONTHID().getLgMONTHID().equalsIgnoreCase("2")) { // ancien bon code. a
                 * decommenter en cas de probleme if (OTCalendrier.getIntNUMBERJOUR() <
                 * Integer.parseInt(date.getDay(dt_END_MONTH))) {
                 * OTCalendrier.setIntNUMBERJOUR(OTCalendrier.getIntNUMBERJOUR() + 1); OTCalendrier.setDtEND(today);
                 * OTCalendrier.setDtUPDATED(today); } }
                 */
                if (OTCalendrier.getIntNUMBERJOUR() < Integer.parseInt(date.getDayOfMonth(dt_END_MONTH))) {
                    OTCalendrier.setIntNUMBERJOUR(OTCalendrier.getIntNUMBERJOUR() + 1);
                    OTCalendrier.setDtEND(today);
                    OTCalendrier.setDtUPDATED(today);
                }
            }
            this.getOdataManager().getEm().merge(OTCalendrier);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            // if (this.persiste(OTCalendrier)) {
            // this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            // result = true;
            // } else {
            // this.buildErrorTraceMessage("Echec de création du mois de calendrier de l'année sélectionné");
            // }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du mois de calendrier de l'année sélectionné");
        }
        return result;
    }

    public TCalendrier initCalendrier(String lg_MONTH_ID, int int_ANNEE) {
        TCalendrier OTCalendrier = null;

        try {
            TMonth OTMonth = this.getTMonth(lg_MONTH_ID);
            Date today = new Date();
            OTCalendrier = new TCalendrier();
            OTCalendrier.setLgCALENDRIERID(this.getKey().getComplexId());
            OTCalendrier.setLgMONTHID(OTMonth);
            OTCalendrier.setIntNUMBERJOUR(1);
            OTCalendrier.setIntANNEE(int_ANNEE);
            OTCalendrier.setDtBEGIN(today);
            OTCalendrier.setDtEND(today);
            OTCalendrier.setStrSTATUT(commonparameter.statut_enable);
            OTCalendrier.setDtCREATED(today);
            OTCalendrier.setDtUPDATED(today);
            this.getOdataManager().getEm().persist(OTCalendrier);
            /*
             * if(this.persiste(OTCalendrier)){ this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); }
             */

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du mois de calendrier de l'année sélectionné");
        }
        return OTCalendrier;
    }
    // fin fonction pour créer un calendrier

    // mise a jour d'un calendrier
    public boolean updateCalendrier(String lg_CALENDRIER_ID, String lg_MONTH_ID, int int_NUMBER_JOUR, int int_ANNEE) {
        boolean result = false;
        try {
            TCalendrier OTCalendrier = this.getOdataManager().getEm().find(TCalendrier.class, lg_CALENDRIER_ID);

            TMonth OTMonth = this.getTMonth(lg_MONTH_ID);
            new logger().OCategory.info("Mois dans updateCalendrier " + OTMonth.getIntMOIS() + " Calendrier "
                    + OTCalendrier.getIntNUMBERJOUR());
            OTCalendrier.setLgMONTHID(OTMonth);
            OTCalendrier.setIntNUMBERJOUR(int_NUMBER_JOUR);
            OTCalendrier.setIntANNEE(int_ANNEE);
            OTCalendrier.setDtBEGIN(this.getKey().getDayofSomeMonthAndYear(1, OTMonth.getIntMOIS(), int_ANNEE));
            OTCalendrier
                    .setDtEND(this.getKey().getDayofSomeMonthAndYear(int_NUMBER_JOUR, OTMonth.getIntMOIS(), int_ANNEE));
            OTCalendrier.setStrSTATUT(commonparameter.statut_enable);
            OTCalendrier.setDtCREATED(new Date());
            if (this.persiste(OTCalendrier)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du mois de calendrier de l'année sélectionné");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du mois de calendrier de l'année sélectionné");
        }
        return result;
    }
    // fin mise a jour d'un calendrier

    // fonction pour supprimer d'un calendrier
    public boolean deleteCalendrier(String lg_CALENDRIER_ID) {
        boolean result = false;
        try {
            TCalendrier OTCalendrier = this.getOdataManager().getEm().find(TCalendrier.class, lg_CALENDRIER_ID);
            OTCalendrier.setStrSTATUT(commonparameter.statut_delete);
            OTCalendrier.setDtUPDATED(new Date());
            this.persiste(OTCalendrier);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du mois de calendrier de l'année sélectionné");
        }
        return result;
    }
    // fin fonction pour supprimer un litige

    // Liste des calendrier par intervalle de mois d'une année
    public List<TCalendrier> listTCalendrierByIntervalMonth(Date dtBEGIN, Date dtEND) {

        List<TCalendrier> lstTCalendrier = new ArrayList<TCalendrier>();

        try {
            String OdateDebut = this.getKey().DateToString(dtBEGIN, this.getKey().formatterMysqlShort2),
                    OdateFin = this.getKey().DateToString(dtEND, this.getKey().formatterMysqlShort2);
            dtBEGIN = this.getKey().getDate(OdateDebut, "00:00");
            dtEND = this.getKey().getDate(OdateFin, "23:59");
            new logger().OCategory.info("dtBEGIN " + dtBEGIN + " dtEND " + dtEND);
            lstTCalendrier = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCalendrier t WHERE (t.dtBEGIN >= ?1 AND t.dtEND <= ?2) AND t.strSTATUT = ?3 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, dtBEGIN).setParameter(2, dtEND).setParameter(3, commonparameter.statut_enable)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTCalendrier.size());
        return lstTCalendrier;
    }

    // fin Liste des calendrier par intervalle de mois d'une année
    // nombre de jour d'une periode
    public long numberDayByPeriod(Date dtBEGIN, Date dtEND) {
        long result = 0;
        List<TCalendrier> lstTCalendrier = new ArrayList<TCalendrier>();
        try {
            lstTCalendrier = this.listTCalendrierByIntervalMonth(dtBEGIN, dtEND);
            for (TCalendrier OTCalendrier : lstTCalendrier) {
                result += OTCalendrier.getIntNUMBERJOUR();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    public TCalendrier getTCalendrier(String lg_MONTH_ID, int int_ANNEE) {
        TCalendrier OTCalendrier = null;
        try {
            OTCalendrier = (TCalendrier) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCalendrier t WHERE t.lgMONTHID.lgMONTHID = ?1 AND t.intANNEE = ?2")
                    .setParameter(1, lg_MONTH_ID).setParameter(2, int_ANNEE).getSingleResult();
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTCalendrier;
    }

    public TCalendrier getDalyTCalendrier() {
        TCalendrier OTCalendrier = null;
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
        new logger().OCategory.info("Date_debut:" + Date_debut + "|Date_Fin:" + Date_Fin + "|dt_Date_Fin:" + dt_Date_Fin
                + "|dt_Date_debut:" + dt_Date_debut);

        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCalendrier t WHERE  t.dtUPDATED >= ?3  AND t.dtUPDATED < ?4 AND t.strSTATUT LIKE ?5")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable);
            if (qry.getResultList().size() > 0) {
                OTCalendrier = (TCalendrier) qry.setMaxResults(1).getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTCalendrier;
    }

    public boolean createCalendrierBACK(String lg_MONTH_ID, int int_ANNEE) {
        boolean result = false;
        TCalendrier OTCalendrier = null, OTCalendrier1 = null;
        Date today = new Date();
        Date dt_END_MONTH;
        try {

            OTCalendrier = this.getTCalendrier(lg_MONTH_ID, int_ANNEE);
            if (OTCalendrier == null) { // verifie si le mois de l'année en cours est deja pris en compte
                OTCalendrier = this.initCalendrier2(lg_MONTH_ID, int_ANNEE);
            }

            OTCalendrier1 = this.getDalyTCalendrier();
            dt_END_MONTH = this.getKey()
                    .getLastDayofSomeMonth(Integer.parseInt(OTCalendrier.getLgMONTHID().getLgMONTHID()));
            if (OTCalendrier1 == null) { // verifie si le jour du mois est deja pris en compte

                if (OTCalendrier.getIntNUMBERJOUR() < Integer.parseInt(date.getDayOfMonth(dt_END_MONTH))) {
                    OTCalendrier.setIntNUMBERJOUR(OTCalendrier.getIntNUMBERJOUR() + 1);
                    OTCalendrier.setDtEND(today);
                    OTCalendrier.setDtUPDATED(today);
                }
            }
            this.getOdataManager().getEm().merge(OTCalendrier);

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du mois de calendrier de l'année sélectionné");
        }
        return result;
    }

    public TCalendrier initCalendrier2(String lg_MONTH_ID, int int_ANNEE) {
        TCalendrier OTCalendrier = null;

        try {
            TMonth OTMonth = this.getTMonth(lg_MONTH_ID);
            Date today = new Date();
            OTCalendrier = new TCalendrier();
            OTCalendrier.setLgCALENDRIERID(this.getKey().getComplexId());
            OTCalendrier.setLgMONTHID(OTMonth);
            OTCalendrier.setIntNUMBERJOUR(1);
            OTCalendrier.setIntANNEE(int_ANNEE);
            OTCalendrier.setDtBEGIN(today);
            OTCalendrier.setDtEND(today);
            OTCalendrier.setStrSTATUT(commonparameter.statut_enable);
            OTCalendrier.setDtCREATED(today);
            OTCalendrier.setDtUPDATED(today);
            this.getOdataManager().getEm().persist(OTCalendrier);

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du mois de calendrier de l'année sélectionné");
        }
        return OTCalendrier;
    }

}
