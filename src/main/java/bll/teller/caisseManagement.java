/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.teller;

import bll.common.Parameter;
import bll.entity.EntityData;
import bll.gateway.outService.ServicesNotifCustomer;
import bll.report.JournalVente;
import bll.userManagement.authentification;
import bll.userManagement.privilege;
import bll.userManagement.user;
import bll.utils.TparameterManager;
import dal.TAlertEventUserFone;
import dal.TBilletage;
import dal.TBilletageDetails;
import dal.TCaisse;
import dal.TCashTransaction;
import dal.TCoffreCaisse;
import dal.TDepenses;
import dal.TEventLog;
import dal.TMvtCaisse;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TRecettes;
import dal.TReglement;
import dal.TResumeCaisse;
import dal.TSnapShopDalyVente;
import dal.TTypeDepense;
import dal.TTypeMvtCaisse;
import dal.TTypeRecette;
import dal.TTypeReglement;
import dal.TUser;
import dal.dataManager;
import dal.enumeration.TypeLog;
import dal.jconnexion;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.ParameterMode;
import javax.persistence.Query;
import javax.persistence.StoredProcedureQuery;
import javax.persistence.TemporalType;
import rest.service.impl.Mail;
import rest.service.impl.Sms;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.logger;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author thierry
 */
public class caisseManagement extends bll.bllBase {

    private static final String SOLDE_SQL = "SELECT SUM(m.`montantRegle`) AS montantRegle FROM t_preenregistrement p,mvttransaction m,t_user u WHERE p.`lg_USER_CAISSIER_ID`=u.`lg_USER_ID` AND p.`lg_PREENREGISTREMENT_ID`=m.vente_id"
            + " AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?1 AND  p.`lg_USER_CAISSIER_ID`= ?2 AND p.`dt_UPDATED` BETWEEN ?3 AND ?4 AND m.`typeReglementId` =?5 ";
    private static final String SOLDE_SQL_OTHERS = "SELECT SUM(m.int_AMOUNT) AS montant  FROM t_mvt_caisse m,t_user u WHERE m.`lg_USER_ID`=u.`lg_USER_ID` AND u.`lg_USER_ID`=?1 AND m.`dt_CREATED` BETWEEN ?2 AND ?3 AND  m.`lg_MODE_REGLEMENT_ID`=?4 AND m.`lg_TYPE_MVT_CAISSE_ID` <> '1'  ";

    public TCaisse OTCaisse;

    public caisseManagement(dataManager odataManager, TUser oTUser) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();

        OTCaisse = new TCaisse();
    }

    public TCaisse findById(String lg) {
        return this.getOdataManager().getEm().find(TCaisse.class, lg);
    }

    public TCaisse findByUserId(TUser oTUser) {
        TCaisse oOTCaisse = new TCaisse();

        try {
            oOTCaisse = (TCaisse) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 ")
                    .setParameter(1, oTUser.getLgUSERID()).getSingleResult();
        } catch (Exception e) {
            oOTCaisse.setLgCAISSEID(this.getKey().getComplexId());
            new logger().OCategory.info("Creation de la caisse");
        }
        return oOTCaisse;
    }

    public TMvtCaisse OpenCaisse(String ID_COFFRE_CAISSE) {
        List<TResumeCaisse> lstTResumeCaisse = new ArrayList<>();
        try {
            TCoffreCaisse OTCoffreCaisse = this.getOdataManager().getEm().find(TCoffreCaisse.class, ID_COFFRE_CAISSE);
            if (OTCoffreCaisse == null) {
                this.buildErrorTraceMessage("Aucune attribution de fond de caisse en cours pour cet utilisateur");
                return null;
            }

            this.setOTUser(OTCoffreCaisse.getLgUSERID());

            if (OTCoffreCaisse.getStrSTATUT().equals(commonparameter.statut_is_assign)) {
                this.buildErrorTraceMessage("Impossible de reouvrir cette caisse", "la caisse specifier est deja  "
                        + this.getOTranslate().getValue(OTCoffreCaisse.getStrSTATUT()));
                return null;
            }

            lstTResumeCaisse = this.getListeResumeCaissesByUser(this.getOTUser().getLgUSERID());
            new logger().OCategory.info("lstTResumeCaisse size " + lstTResumeCaisse.size());
            if (lstTResumeCaisse.size() > 0) {
                this.buildSuccesTraceMessage("La caisse est en cours d'utilisation");
                return null;
            }
            TResumeCaisse OTResumeCaisse = new TResumeCaisse();
            TCaisse oOTCaisse = new TCaisse();
            try {
                // oOTCaisse = (TCaisse) this.getOdataManager().getEm().createQuery("SELECT t FROM TCaisse t WHERE
                // t.lgUSERID.lgUSERID LIKE ?1 AND t.idAnneeScolaire.idAnneeScolaire = ?2").setParameter(1,
                // this.getOTUser().getLgUSERID()).setParameter(2,
                // this.getOTAnneeScolaires().getIdAnneeScolaire()).getSingleResult();

                oOTCaisse = (TCaisse) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 ")
                        .setParameter(1, this.getOTUser().getLgUSERID()).getSingleResult();

                oOTCaisse.setDtUPDATED(new Date());
                oOTCaisse.setLgUPDATEDBY(this.getOTUser().getStrLOGIN());
            } catch (Exception e) {
                oOTCaisse.setLgCAISSEID(this.getKey().gettimeid());
                oOTCaisse.setDtCREATED(new Date());
                new logger().OCategory.info("Creation de la caisse");
            }
            OTResumeCaisse.setLdCAISSEID(this.getKey().gettimeid());
            OTResumeCaisse.setIntSOLDEMATIN(OTCoffreCaisse.getIntAMOUNT().intValue());
            // oTResumeCaisse.setIdAnneeScolaire(this.getOTAnneeScolaires());
            OTResumeCaisse.setLgUSERID(this.getOTUser());
            OTResumeCaisse.setDtCREATED(new Date());
            // oTResumeCaisse.setDtDAY(new Date());
            OTResumeCaisse.setLgCREATEDBY(this.getOTUser().getStrLOGIN());
            OTResumeCaisse.setIdCoffreCaisse(OTCoffreCaisse);
            OTResumeCaisse.setIntSOLDESOIR(0);
            OTResumeCaisse.setStrSTATUT(commonparameter.statut_is_Using);
            OTCoffreCaisse.setStrSTATUT(commonparameter.statut_is_assign);
            OTCoffreCaisse.setLdUPDATEDBY(this.getOTUser().getStrLOGIN());
            OTCoffreCaisse.setDtUPDATED(new Date());

            // oOTCaisse.setIdAnneeScolaire(this.getOTAnneeScolaires());
            // oOTCaisse.setIntSOLDE(OTCoffreCaisse.getIntAMOUNT()); a decommenter en cas de probleme
            oOTCaisse.setIntSOLDE(0.0);
            oOTCaisse.setLgUSERID(this.getOTUser());
            oOTCaisse.setLgCREATEDBY(this.getOTUser().getStrLOGIN());

            this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().persist(OTCoffreCaisse);
            this.getOdataManager().getEm().persist(OTResumeCaisse);
            this.getOdataManager().getEm().persist(oOTCaisse);
            this.getOdataManager().CloseTransaction();

            TTypeMvtCaisse OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_FOND_DE_CAISSE,
                    this.getOdataManager());
            TMvtCaisse OTMvtCaisse = new TellerMovement(this.getOdataManager(), this.getOTUser()).AddTMvtCaisse(
                    OTTypeMvtCaisse, OTTypeMvtCaisse.getStrCODECOMPTABLE(), OTTypeMvtCaisse.getStrNAME(), "1",
                    new Double(OTResumeCaisse.getIntSOLDEMATIN()), "", "", "", "", 0, new Date(), true, "",
                    OTCoffreCaisse.getLdCREATEDBY(), "", 0, OTResumeCaisse.getIntSOLDEMATIN(), true, new Date());

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String Description = "Ouverture de la caisse de  " + this.getOTUser().getStrLOGIN() + " avec un montant de "
                    + OTResumeCaisse.getIntSOLDEMATIN();
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_coffre_caisse,t_resume_caisse,t_caisse", "caisse",
                    "Mouvement de Caisse", this.getOTUser().getLgUSERID());
            this.is_activity(Ojconnexion);
            Ojconnexion.CloseConnexion();
            this.buildSuccesTraceMessage(Description);
            // this.setMessage(commonparameter.PROCESS_SUCCESS);
            return OTMvtCaisse;
        } catch (Exception e) {
            /*
             * this.setMessage(commonparameter.PROCESS_FAILED); this.setDetailmessage(e.getMessage());
             */
            new logger().OCategory.error(e.getMessage());
            this.buildErrorTraceMessage("Echec de l'ouverture de la caisse");
            return null;
        }
    }

    // attribution de caisse
    public TCoffreCaisse getTCoffreCaisseOfSomeDay(String lg_USER_ID, String str_STATUT, Date dt_Date_debut,
            Date dt_Date_Fin) {
        TCoffreCaisse OTCoffreCaisse = null;
        try {
            OTCoffreCaisse = (TCoffreCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCoffreCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND  t.strSTATUT LIKE ?2  AND t.dtCREATED >= ?3  AND t.dtCREATED < ?4 ")
                    .setParameter(1, lg_USER_ID).setParameter(2, str_STATUT).setParameter(3, dt_Date_debut)
                    .setParameter(4, dt_Date_Fin).getSingleResult();
            this.buildSuccesTraceMessage("Cet utilisateur a déjà reçu un fond de caisse");
        } catch (Exception e) {
            this.buildErrorTraceMessage("Cet utilisateur n'a pas encore reçu un fond de caisse");
            e.printStackTrace();
        }
        return OTCoffreCaisse;

    }
    // fin recuperation de coffre caisse par date

    // attribution de caisse
    public boolean sendCashToCaisseEmp(String lg_USER_ID, Integer int_AMOUNT) {
        authentification Oauthentification = new authentification();
        TCoffreCaisse OTCoffreCaisse = null;
        String Description = "";
        List<TResumeCaisse> lstTResumeCaisse = new ArrayList<>();
        TUser ooTuser = null;
        try {
            // TUser ooTuser = this.getOdataManager().getEm().find(TUser.class, lg_USER_ID); // a decommenter en cas de
            // probleme
            ooTuser = new user(this.getOdataManager()).getUserById(lg_USER_ID);
            if (ooTuser == null) {
                this.buildErrorTraceMessage("Utilisateur inconnu");
                return false;
            }

            if (!Oauthentification.GetUserConnexionState(ooTuser)) {
                this.buildErrorTraceMessage(Oauthentification.getDetailmessage());
                // new logger().OCategory.info(this.getDetailmessage());
                return false;
            }
            // String Description = "Impossible de Reaprovisionement de la caisse dun montant de " + int_AMOUNT;

            /*
             * String Date_debut = this.getKey().GetDateNowForSearch(0); String Date_Fin =
             * this.getKey().GetDateNowForSearch(1); new logger().OCategory.info(Date_debut + "  test   " + Date_Fin);
             * Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort); Date dt_Date_debut
             * = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
             */
            Date dt_Date_Fin = new Date(), dt_Date_debut = new Date();
            String OdateFin = this.getKey().DateToString(dt_Date_Fin, this.getKey().formatterMysqlShort2),
                    OdateDebut = this.getKey().DateToString(dt_Date_debut, this.getKey().formatterMysqlShort2);

            dt_Date_Fin = this.getKey().getDate(OdateFin, "23:59");
            dt_Date_debut = this.getKey().getDate(OdateDebut, "00:00");

            new logger().OCategory.info(" dt_Date_debut " + dt_Date_debut + " dt_Date_Fin " + dt_Date_Fin);

            lstTResumeCaisse = this.getListeResumeCaissesByUser(ooTuser.getLgUSERID());
            new logger().OCategory.info("lstTResumeCaisse size " + lstTResumeCaisse.size());
            if (lstTResumeCaisse.size() > 0) {
                this.buildSuccesTraceMessage("La caisse de cet utilisateur est en cours d'utilisation");
                return false;
            }

            /*
             * OTCoffreCaisse = (TCoffreCaisse) this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TCoffreCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND  t.strSTATUT LIKE ?2  AND t.dtCREATED >= ?3  AND t.dtCREATED < ?4 "
             * ) // a decommenter en cas de probleme 19/10/2016 .setParameter(1, ooTuser.getLgUSERID()). setParameter(2,
             * commonparameter.statut_is_Waiting_validation). setParameter(3, dt_Date_debut). setParameter(4,
             * dt_Date_Fin). getSingleResult();
             */
            OTCoffreCaisse = this.getTCoffreCaisseOfSomeDay(ooTuser.getLgUSERID(),
                    commonparameter.statut_is_Waiting_validation, dt_Date_debut, dt_Date_Fin);

            if (OTCoffreCaisse != null) {
                this.buildErrorTraceMessage("La caisse specifié est  "
                        + this.getOTranslate().getValue(commonparameter.statut_is_Waiting_validation));
                new logger().OCategory.info(this.getDetailmessage());
                return false;
            }
            return this.createCoffreCaisse(ooTuser, new Double(int_AMOUNT));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    // creation de coffre caisse
    public boolean createCoffreCaisse(TUser OTUser, double dbl_AMOUNT) {
        boolean result = false;
        String Description = "";
        try {
            TCoffreCaisse OTCoffreCaisse = new TCoffreCaisse();
            OTCoffreCaisse.setIdCoffreCaisse(this.getKey().gettimeid());
            OTCoffreCaisse.setLgUSERID(OTUser);
            OTCoffreCaisse.setIntAMOUNT(dbl_AMOUNT);
            OTCoffreCaisse.setDtCREATED(new Date());
            OTCoffreCaisse.setStrSTATUT(commonparameter.statut_is_Waiting_validation);
            OTCoffreCaisse.setLdCREATEDBY(this.getOTUser().getLgUSERID());
            this.persiste(OTCoffreCaisse);
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            Description = "Reaprovisionement de la caisse de " + OTUser.getStrLOGIN() + " d'un montant de "
                    + OTCoffreCaisse.getIntAMOUNT();
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_coffre_caisse", "caisse", "Mouvement de Caisse",
                    this.getOTUser().getLgUSERID());
            this.is_activity(Ojconnexion);
            Ojconnexion.CloseConnexion();
            this.buildSuccesTraceMessage(Description);
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin creation de coffre caisse

    // fin attribution de caisse
    public Integer GetSoldeCaisse(String lg_USER_ID) {
        try {
            OTCaisse = (TCaisse) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 ")
                    .setParameter(1, lg_USER_ID).getSingleResult();
            this.getOdataManager().getEm().refresh(OTCaisse);
            this.buildSuccesTraceMessage(
                    "Solde : " + OTCaisse.getIntSOLDE() + "  de " + OTCaisse.getLgUSERID().getStrLOGIN());

            return OTCaisse.getIntSOLDE().intValue();
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
            return 0;
        }
    }

    public Double GetSoldeCaisse(TUser OTUser, Date dt_BEGIN, Date dt_END) {
        Double result = 0.0;
        List<Object[]> lstCaisse = new ArrayList<>();
        try {
            lstCaisse = this.getOdataManager().getEm().createNativeQuery("CALL `proc_v_caisse`(?, ?, ?, ?, ?, ?, ?)")
                    .setParameter(1, date.DateToString(dt_BEGIN, date.formatterMysqlShort))
                    .setParameter(2, date.DateToString(dt_END, date.formatterMysqlShort))
                    .setParameter(3, date.DateToString(dt_BEGIN, date.NomadicUiFormatTime))
                    .setParameter(4, date.DateToString(dt_END, date.NomadicUiFormatTime))
                    .setParameter(5, OTUser.getLgUSERID()).setParameter(6, "%")
                    .setParameter(7, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            for (Object[] OObjects : lstCaisse) {
                result += Double.parseDouble(String.valueOf(OObjects[5]));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    public Integer GetSoldeAllCaisse() {
        try {
            List<TCaisse> Lst = this.getOdataManager().getEm().createQuery("SELECT t FROM TCaisse t ").
            // setParameter(1, "%%").
                    getResultList();
            int solde = 0;
            for (int i = 0; i < Lst.size(); i++) {
                solde = solde + Lst.get(i).getIntSOLDE().intValue();
            }

            this.buildSuccesTraceMessage("Solde : " + solde + "  de  Toute les caisse");
            return solde;
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
            return 0;
        }
    }

    public List<TCaisse> getAllCaisse() {
        List<TCaisse> Lst = this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TCaisse t  ORDER BY t.lgUSERID.strFIRSTNAME  ").getResultList();
        int solde = 0;
        for (int i = 0; i < Lst.size(); i++) {
            this.refresh(Lst.get(i));
            if (!this.CheckResumeCaisse(Lst.get(i).getLgUSERID())) {
                Lst.get(i).setIntSOLDE(0.0);
            }

            String str_statut_activite = this.getDetailmessage();
            Lst.get(i).setLgUPDATEDBY(str_statut_activite);

            new logger().OCategory.info(Lst.get(i).getLgUSERID().getStrLOGIN() + " " + Lst.get(i).getLgUPDATEDBY());

        }
        return Lst;
    }

    public int getSoldeBy(Date oDate) {

        return 0;
    }

    public List<TSnapShopDalyVente> getLstTSnapShopDalyVente() {
        return this.getLstTSnapShopDalyVente(new Date());
    }

    public List<TSnapShopDalyVente> getLstTSnapShopDalyVente(Date ODate) {
        List<TSnapShopDalyVente> LstTSnapShopDalyVente = new ArrayList<>();
        Date dt_Date_debut, dt_Date_Fin;
        dt_Date_debut = this.getKey().GetNewDate(ODate, 0);
        dt_Date_Fin = this.getKey().GetNewDate(ODate, 1);
        try {

            LstTSnapShopDalyVente = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalyVente t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?6")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, "%%").getResultList();

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return LstTSnapShopDalyVente;
    }

    public TCaisse GetTCaisse() {
        TCaisse OTCaisse = null;
        try {
            OTCaisse = (TCaisse) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCaisse t WHERE t.lgUSERID.lgUSERID = ?1")
                    .setParameter(1, this.getOTUser().getLgUSERID()).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec. Caisse introuvable pour l'utilisateur connecté");
        }
        return OTCaisse;
    }

    public TCaisse GetTCaisse(String lg_USER_ID) {
        try {
            OTCaisse = (TCaisse) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 ")
                    .setParameter(1, lg_USER_ID).getSingleResult();
            this.getOdataManager().getEm().refresh(OTCaisse);
            this.buildSuccesTraceMessage(
                    "Solde : " + OTCaisse.getIntSOLDE() + "  de " + OTCaisse.getLgUSERID().getStrLOGIN());

            return OTCaisse;
        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
            OTCaisse = new TCaisse();
            OTCaisse.setLgUSERID(this.getOTUser());
            OTCaisse.setIntSOLDE(0.0);
            OTCaisse.setDtCREATED(new Date());
            OTCaisse.setLgCREATEDBY(this.getOTUser().getStrLOGIN());

            OTCaisse.setLgCAISSEID(this.getKey().getComplexId());
            return OTCaisse;
        }
    }

    private double caisseAmount(TResumeCaisse caisse) {

        double solde = 0;
        try {
            Query query = this.getOdataManager().getEm().createNativeQuery(SOLDE_SQL)
                    .setParameter(1, DateConverter.DEPOT_EXTENSION).setParameter(2, caisse.getLgUSERID().getLgUSERID())
                    .setParameter(3, caisse.getDtCREATED(), TemporalType.TIMESTAMP)
                    .setParameter(4, new Date(), TemporalType.TIMESTAMP).setParameter(5, DateConverter.MODE_ESP);
            BigDecimal sum = (BigDecimal) query.getSingleResult();
            if (Objects.nonNull(sum)) {
                solde = sum.doubleValue();
            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return solde;
    }

    private double caisseAmountOtherMvts(TResumeCaisse caisse) {

        double solde = 0;
        try {
            Query query = this.getOdataManager().getEm().createNativeQuery(SOLDE_SQL_OTHERS)
                    .setParameter(1, caisse.getLgUSERID().getLgUSERID())
                    .setParameter(2, caisse.getDtCREATED(), TemporalType.TIMESTAMP)
                    .setParameter(3, new Date(), TemporalType.TIMESTAMP).setParameter(4, DateConverter.MODE_ESP);
            Double sum = (Double) query.getSingleResult();
            if (Objects.nonNull(sum)) {
                solde = sum;
            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return solde;
    }

    public void CloseCaisse(String ldCAISSEID) {
        try {
            TResumeCaisse oTResumeCaisse = this.getOdataManager().getEm().find(TResumeCaisse.class, ldCAISSEID);

            if (oTResumeCaisse == null) {
                this.buildErrorTraceMessage("Impossible de cloturer la caisse. Ref Inconnu de la caisse inconnu");
                return;
            }

            if (oTResumeCaisse.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
                this.buildErrorTraceMessage("Impossible de cloturer cette caisse",
                        "la fermeture de la caisse specifier est deja  "
                                + this.getOTranslate().getValue(oTResumeCaisse.getStrSTATUT()));
                return;
            }

            this.setOTUser(oTResumeCaisse.getLgUSERID());
            this.OTCaisse = new TCaisse();

            this.OTCaisse.setIntSOLDE(caisseAmount(oTResumeCaisse) + caisseAmountOtherMvts(oTResumeCaisse));
            oTResumeCaisse.setLgUPDATEDBY(this.getOTUser().getStrLOGIN());
            oTResumeCaisse.setIntSOLDESOIR(this.OTCaisse.getIntSOLDE().intValue());
            oTResumeCaisse.setStrSTATUT(commonparameter.statut_is_Process);
            oTResumeCaisse.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(oTResumeCaisse);
            // this.persiste(oTResumeCaisse);

            // String Description = "Cloture de la caisse de " + this.getOTUser().getStrLOGIN() + " avec un montant de "
            // + Math.abs(oTResumeCaisse.getIntSOLDESOIR());
            String description = "Cloture de la caisse de  " + this.getOTUser().getStrLOGIN()
                    + " avec succès avec un montant de: " + this.OTCaisse.getIntSOLDE();

            updateItem(this.getOTUser(), oTResumeCaisse.getLdCAISSEID(), description, TypeLog.CLOTURE_CAISSE,
                    oTResumeCaisse);
            this.setMessage(commonparameter.PROCESS_SUCCESS);

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de cloturer la caisse", e.getMessage());

        }
    }

    public void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object t) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(eventLog.getDtCREATED());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(t.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        eventLog.setStrTYPELOG(ref);
        this.getOdataManager().getEm().persist(eventLog);
    }

    public boolean checkParameterByKey(String key) {
        try {
            TParameters parameters = this.getOdataManager().getEm().find(TParameters.class, key);
            return (Integer.parseInt(parameters.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
            return false;
        }
    }

    public TBilletage getBilletageByResumeCaisse(String ld_CAISSE_ID) {
        TBilletage OTBilletage = null;
        try {
            OTBilletage = (TBilletage) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TBilletage t WHERE t.ldCAISSEID = ?1").setParameter(1, ld_CAISSE_ID)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTBilletage;
    }
    // fin recuperer un billetage en fonction du resumé

    public void ValideCloseCaisse(String ld_CAISSE_ID) {
        TBilletage OTBilletage = null;
        try {

            TResumeCaisse OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().find(TResumeCaisse.class,
                    ld_CAISSE_ID);
            this.getOdataManager().getEm().refresh(OTResumeCaisse);
            new logger().OCategory.info(OTResumeCaisse.getStrSTATUT());
            if (OTResumeCaisse.getStrSTATUT().equals(commonparameter.statut_is_Using)) {
                this.buildErrorTraceMessage(" La caisse est en cours d utilisation ");
            } else if (OTResumeCaisse.getStrSTATUT().equals(commonparameter.statut_is_Closed)) {
                this.buildErrorTraceMessage(" La caisse a deja ete ferme ");
            } else {

                this.setOTUser(OTResumeCaisse.getLgUSERID());
                OTResumeCaisse.setStrSTATUT(commonparameter.statut_is_Closed);
                // this.GetSoldeCaisse(oTResumeCaisse.getLgUSERID().getLgUSERID()); //
                OTCaisse = GetTCaisse(this.getOTUser().getLgUSERID());
                OTBilletage = this.getBilletageByResumeCaisse(OTResumeCaisse.getLdCAISSEID());

                // String Description = "Validation de la Cloture de la caisse de " + this.getOTUser().getStrLOGIN() + "
                // avec un montant de " + Math.abs(OTCaisse.getIntSOLDE() - oTResumeCaisse.getIntSOLDEMATIN());
                String Description = "Validation de la Cloture de la caisse de  " + this.getOTUser().getStrLOGIN()
                        + " avec un montant de " + (OTBilletage != null
                                ? conversion.AmountFormat(OTBilletage.getIntAMOUNT().intValue(), '.') : 0);

                OTCaisse.setIntSOLDE(0.0);
                OTCaisse.setLgUPDATEDBY(this.getOTUser().getStrLOGIN());
                OTCaisse.setDtUPDATED(new Date());
                /*
                 * this.getOdataManager().BeginTransaction(); //ancien bon code. a decommenter en cas de probleme
                 * this.getOdataManager().getEm().persist(oTResumeCaisse);
                 * this.getOdataManager().getEm().persist(OTCaisse); this.getOdataManager().CloseTransaction();
                 */
                if (this.persiste(OTCaisse)) {
                    this.buildSuccesTraceMessage("Validation de cloture de caisse effectuée avec succes");
                } else {
                    this.buildErrorTraceMessage("Echec de validation de cloture de caisse");
                }
                jconnexion Ojconnexion = new jconnexion();
                Ojconnexion.initConnexion();
                Ojconnexion.OpenConnexion();
                this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                        commonparameter.statut_enable, "t_coffre_caisse,t_resume_caisse,t_caisse", "caisse",
                        "Mouvement de Caisse", this.getOTUser().getLgUSERID());
                this.is_activity(Ojconnexion);
                Ojconnexion.CloseConnexion();

                // this.setMessage(commonparameter.PROCESS_SUCCESS);
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de valider la cloture de la caisse", e.getMessage());
        }
    }

    public boolean CheckResumeCaisse() {
        return CheckResumeCaisse(this.getOTUser());
    }

    public boolean CheckResumeCaisse(TUser ooTUser) {
        TResumeCaisse OTResumeCaisse = null, OTResumeCaisseOld = null;
        try {
            Date dt_Date_debut, dt_Date_Fin;
            String Date_debut = this.getKey().GetDateNowForSearch(0);
            String Date_Fin = this.getKey().GetDateNowForSearch(1);
            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            new logger().OCategory.info("dt_Date_Fin " + dt_Date_Fin);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
            TParameters OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_ACTIVATE_CLOTURE_CAISSE_AUTO);
            TCaisse OTCaisse = this.GetTCaisse();
            // a mettre le parametre de desactivation de la cloture automatique de la caisse
            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage("Paramètre de gestion de clôture automatique de la caisse inexistant");
                return false;

            }

            // OTResumeCaisseOld = this.getTResumeCaisseClosed(this.getOTUser().getLgUSERID());// a decommenter en cas
            // de probleme. 19/05/2016
            OTResumeCaisseOld = this.getTResumeCaisse(this.getOTUser().getLgUSERID(), commonparameter.statut_is_Using);// a
            // decommenter
            // en
            // cas
            // de
            // probleme.
            // 19/05/2016
            if (OTResumeCaisseOld == null) {
                this.buildErrorTraceMessage("Désolé. La caisse de " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + " est fermée");
                return false;
            }

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 0 && OTCaisse != null) { // si valeur 0, on passe en
                // cloture manuelle
                return true;
            }

            OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1  AND t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 ")
                    .setParameter(1, ooTUser.getLgUSERID()) // .setParameter(2,
                    // this.getOTAnneeScolaires().getIdAnneeScolaire())
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_is_Using).getSingleResult();
            if (OTResumeCaisse != null) {
                return true;
            } else {
                return false;
            }
            // this.buildSuccesTraceMessage(this.getOTranslate().getValue("CAISSE_IS_OPEN"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(this.getOTranslate().getValue("CAISSE_IS_CLOSED"));
            return false;
        }
    }

    public int GetResumeCaisse(TUser ooTUser) {
        int soldfinal = 0;
        try {
            Date dt_Date_debut, dt_Date_Fin;
            String Date_debut = this.getKey().GetDateNowForSearch(0);
            String Date_Fin = this.getKey().GetDateNowForSearch(1);
            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
            TResumeCaisse OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1  AND t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 ")
                    .setParameter(1, ooTUser.getLgUSERID()) // .setParameter(2,
                    // this.getOTAnneeScolaires().getIdAnneeScolaire())
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_is_Closed).getSingleResult();
            soldfinal = OTResumeCaisse.getIntSOLDESOIR() - OTResumeCaisse.getIntSOLDEMATIN();
            return soldfinal;
        } catch (Exception e) {
            this.buildErrorTraceMessage(this.getOTranslate().getValue("CAISSE_IS_CLOSED"));
            return soldfinal;
        }
    }

    public boolean checksolde(int MONTANT) {
        OTCaisse = GetTCaisse(this.getOTUser().getLgUSERID());

        if (OTCaisse.getIntSOLDE() < MONTANT) {
            this.buildErrorTraceMessage(this.getOTranslate().getValue("SOLDE_INSUFFISANT"));
            return false;
        } else {
            return true;
        }
    }

    // public TRecettes AddRecette(Double MONTANT, String lg_TYPE_RECETTE_ID, String str_DESCRIPTION, String
    // str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF, String
    // lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT,
    // String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID) { // last good version. A decommenter en cas de
    // probleme
    public TRecettes AddRecette(Double MONTANT, String lg_TYPE_RECETTE_ID, String str_DESCRIPTION,
            String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID,
            String transaction, boolean str_TYPE) {
        Double int_amount_hors_tva;
        Double int_amount_tva = 0.0;
        TRecettes OTRecettes = null;

        try {
            TTypeRecette OTTypeRecette = this.getOdataManager().getEm().getReference(TTypeRecette.class,
                    lg_TYPE_RECETTE_ID);
            // Verrifier si la tva es applicape
            if (OTTypeRecette.getIsUSETVA()) {
                String str_DESCRIPTIONTemp = "TVA  " + str_DESCRIPTION;
                // TTypeRecette OTTypeRecetteTVA = (TTypeRecette) this.find(Parameter.KEY_TYPE_RECETTE_TVA, new
                // TTypeRecette());// this.find(TTypeRecette.class, Parameter.KEY_TYPE_RECETTE_TVA);
                TTypeRecette OTTypeRecetteTVA = this.getOdataManager().getEm().getReference(TTypeRecette.class,
                        Parameter.KEY_TYPE_RECETTE_TVA);
                int_amount_tva = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getInAmountTva(MONTANT.intValue());

                String str_task_temp = "TVA" + str_task;
                this.AddRecette(int_amount_tva, OTTypeRecetteTVA, str_DESCRIPTIONTemp, str_REF_FACTURE,
                        int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type,
                        "TVAVENTE", lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                        lg_TYPE_MVT_CAISSE_ID, transaction, str_TYPE); //

            }
            int_amount_hors_tva = MONTANT - int_amount_tva;

            OTRecettes = this.AddRecette(int_amount_hors_tva, OTTypeRecette, str_DESCRIPTION, str_REF_FACTURE,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type, str_task,
                    lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, lg_TYPE_MVT_CAISSE_ID, transaction,
                    str_TYPE);
            // ensuite inserer pour la tva cest a dire appeler la methode ki calcule le montant de la tva et inserer ce
            // montant ds OTRecettes.setIntAMOUNT(MONTANT)
            // new SnapshotManager(this.getOdataManager(),
            // this.getOTUser()).BuildTSnapShopDalyRecetteCaisse(OTRecettes);

            return OTRecettes;
        } catch (Exception ex) {
            this.setMessage(ex.getMessage());
            new logger().oCategory.error(this.getMessage());
            return OTRecettes;
        }

    }

    public TRecettes AddRecetteAnnulerVente(Double MONTANT, String lg_TYPE_RECETTE_ID, String str_DESCRIPTION,
            String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID,
            String transaction, boolean str_TYPE) {
        Double int_amount_hors_tva = 0.0;
        Double int_amount_tva = 0.0;

        new logger().OCategory.info(" *** Add recette   dbMONTANT *** " + MONTANT);

        try {
            /*
             * if (!this.CheckResumeCaisse()) { this.buildErrorTraceMessage("ERROR", "DESOLE LA CAISSE EST FERMEE");
             * return null; }
             */

            TTypeRecette OTTypeRecette = (TTypeRecette) this.find(lg_TYPE_RECETTE_ID, new TTypeRecette());
            // Verrifier si la tva es applicape
            if (OTTypeRecette.getIsUSETVA()) {
                String str_DESCRIPTIONTemp = "TVA  " + str_DESCRIPTION;
                TTypeRecette OTTypeRecetteTVA = (TTypeRecette) this.find(Parameter.KEY_TYPE_RECETTE_TVA,
                        new TTypeRecette());// this.find(TTypeRecette.class, Parameter.KEY_TYPE_RECETTE_TVA);
                int_amount_tva = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getInAmountTva(MONTANT.intValue());

                String str_task_temp = "TVA" + str_task;
                // this.AddRecette(int_amount_tva, OTTypeRecetteTVA, str_DESCRIPTIONTemp, str_REF_FACTURE,
                // int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type, str_task_temp);

                this.AddRecette(int_amount_tva, OTTypeRecetteTVA, str_DESCRIPTIONTemp, str_REF_FACTURE,
                        int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type,
                        "TVAVENTE", lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                        lg_TYPE_MVT_CAISSE_ID, transaction, str_TYPE);

            }
            int_amount_hors_tva = MONTANT - int_amount_tva;

            new logger().OCategory.info(" *** Add recette   int_amount_hors_tva  *** " + int_amount_hors_tva);
            // OTTypeRecette.setIsUSETVA(Boolean.FALSE);
            new logger().OCategory.info("  555  OTTypeRecette 555 " + OTTypeRecette.getIsUSETVA());
            TRecettes OTRecettes = this.AddRecette(int_amount_hors_tva, OTTypeRecette, str_DESCRIPTION, str_REF_FACTURE,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type, str_task,
                    lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, lg_TYPE_MVT_CAISSE_ID, transaction,
                    str_TYPE);
            // ensuite inserer pour la tva cest a dire appeler la methode ki calcule le montant de la tva et inserer ce
            // montant ds OTRecettes.setIntAMOUNT(MONTANT)
            // new SnapshotManager(this.getOdataManager(),
            // this.getOTUser()).BuildTSnapShopDalyRecetteCaisse(OTRecettes);

            return OTRecettes;
        } catch (Exception ex) {
            this.setMessage(ex.getMessage());
            new logger().oCategory.error(this.getMessage());
            return null;
        }

    }

    // private TRecettes AddRecette(Double MONTANT, TTypeRecette OTTypeRecette, String str_DESCRIPTION, String
    // str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF, String
    // lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT,
    // String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID) {//a decommenter en cas de probleme
    private TRecettes AddRecette(Double MONTANT, TTypeRecette OTTypeRecette, String str_DESCRIPTION,
            String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID,
            String transaction, boolean str_TYPE) {
        try {

            return this.AddRecette(null, MONTANT, OTTypeRecette.getLgTYPERECETTEID(), str_DESCRIPTION, str_REF_FACTURE,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type, str_task,
                    lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, lg_TYPE_MVT_CAISSE_ID, transaction,
                    str_TYPE);

        } catch (Exception ex) {
            ex.printStackTrace();
            this.setMessage(ex.getMessage());
            new logger().oCategory.error(this.getMessage());
            return null;
        }

    }

    public TRecettes AddRecette(jconnexion Ojconnexion, double MONTANT, String lg_TYPE_RECETTE_ID,
            String str_DESCRIPTION, String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU,
            String str_RESSOURCE_REF, String lg_TYPE_REGLEMENT_ID, String str_type, String str_task,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID,
            String lg_TYPE_MVT_CAISSE_ID, String transaction, boolean str_TYPE) {
        // public TRecettes AddRecette(boolean action,jconnexion Ojconnexion, double MONTANT, String lg_TYPE_RECETTE_ID,
        // String str_DESCRIPTION, String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String
        // str_RESSOURCE_REF, String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
        // String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID) {
        String str_transaction_code = "";
        TRecettes OTRecettes = null;

        try {
            if (this.CheckResumeCaisse()) {
                TTypeRecette OTTypeRecette = this.getOdataManager().getEm().getReference(TTypeRecette.class,
                        lg_TYPE_RECETTE_ID);
                // TTypeMvtCaisse OTTypeMvtCaisse =
                // caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE, this.getOdataManager());
                TTypeMvtCaisse OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(lg_TYPE_MVT_CAISSE_ID,
                        this.getOdataManager());

                String Libelle = "ENCAISSEMENT POUR : " + OTTypeRecette.getStrTYPERECETTE();

                if (!str_DESCRIPTION.equals("")) {
                    Libelle = str_DESCRIPTION;
                }
                new logger().OCategory.info(" *** OTRecettes CREATION DE OTrecettes  *** " + MONTANT
                        + " lg_TYPE_RECETTE_ID =" + lg_TYPE_RECETTE_ID + " str_type =" + str_type);
                OTRecettes = new TRecettes();
                OTRecettes.setIdRecette(UUID.randomUUID().toString());
                OTRecettes.setLgTYPERECETTEID(OTTypeRecette);
                OTRecettes.setIntAMOUNT(MONTANT);
                OTRecettes.setDtCREATED(new Date());
                OTRecettes.setStrDESCRIPTION(str_DESCRIPTION);
                OTRecettes.setStrREFFACTURE(str_REF_FACTURE);
                OTRecettes.setLgUSERID(this.getOTUser());
                // OTRecettes.setIdAnneeScolaire(this.getKey().getOTAnneeScolaires());
                OTRecettes.setStrCREATEDBY(this.getOTUser().getStrLOGIN());

                this.getOdataManager().getEm().persist(OTRecettes);
                this.setMessage(commonparameter.PROCESS_SUCCESS);

                // String Description = "Enregistrement d une somme de " + OTRecettes.getIntAMOUNT() + " pour type de
                // recette : " + OTTypeRecette.getStrTYPERECETTE();

                /*
                 * if (!OTTypeRecette.getIsUSETVA()) { str_transaction_code = commonparameter.TRANSACTION_TVA; } if
                 * (OTTypeRecette.getIsUSETVA()) { str_transaction_code = commonparameter.TRANSACTION_CREDIT; }
                 */
                new logger().OCategory.info(" transaction code ref   " + str_transaction_code);

                // this.add_to_cash_transaction(Ojconnexion, commonparameter.TRANSACTION_CREDIT, MONTANT, Libelle,
                // OTTypeMvtCaisse.getStrCODECOMPTABLE(), int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF,
                // OTRecettes.getStrREFFACTURE(), str_type, str_task, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                // lg_MOTIF_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID); // a decommenter en cas de probleme
                this.add_to_cash_transaction(transaction, MONTANT, Libelle, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
                        int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, OTRecettes.getStrREFFACTURE(), str_type,
                        str_task, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID,
                        str_TYPE, true, new Date());
                new SnapshotManager(this.getOdataManager(), this.getOTUser()).BuildTSnapShopDalyRecette(OTRecettes);

                /*
                 * try { OTPreenregistrement = (TPreenregistrement) this.find(str_REF_FACTURE, new
                 * TPreenregistrement()); / commente le 04102017 new SnapshotManager(this.getOdataManager(),
                 * this.getOTUser()).BuildTSnapShopDalyVente(OTRecettes, (TPreenregistrement) this.find(str_REF_FACTURE,
                 * new TPreenregistrement()));
                 *
                 * } catch (Exception e) { e.printStackTrace(); }
                 */
                // creer le mouvement
                // "1080000000"
                // code ajouté
                // if(action) {
                // new TellerMovement(this.getOdataManager(), this.getOTUser()).AddTMvtCaisse(OTTypeMvtCaisse,
                // OTTypeMvtCaisse.getStrCODECOMPTABLE(), Libelle, "1", new Double(OTRecettes.getIntAMOUNT()), "", "",
                // "", "", 0, new Date(), false);
                // }
                // fin code ajouté
                new logger().OCategory.info(" *** after all in caisseManagement AddRecette 570 *** ");
                this.is_activity();/// 29/09/2017
                return OTRecettes;
            } else {

                new logger().OCategory.info(
                        " *** probleme avec la caisse +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ *** ");

            }

        } catch (Exception ex) {
            ex.printStackTrace();
            this.buildErrorTraceMessage(this.getMessage());
            new logger().OCategory.info(" error AddRecette   " + ex.toString());

        }
        return OTRecettes;
    }

    public void is_activity() {
        try {
            StoredProcedureQuery q = this.getOdataManager().getEm().createStoredProcedureQuery("proc_do_activity");
            q.registerStoredProcedureParameter("lg_USER_ID", String.class, ParameterMode.IN);
            q.setParameter("lg_USER_ID", this.getOTUser().getLgUSERID());

            q.execute();

        } catch (Exception e) {
            new logger().OCategory.error(e.getMessage());
        }
    }

    public TDepenses AddDepense(Double MONTANT, String lg_TYPE_DEPENSE_ID, String str_DESCRIPTION,
            String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_TYPE_MVT_CAISSE_ID,
            boolean str_TYPE) {
        try {

            if (!this.CheckResumeCaisse()) {
                this.buildErrorTraceMessage("ERROR", "DESOLE LA CAISSE EST FERMEE");
                return null;
            }
            if (!this.checksolde(MONTANT.intValue())) {
                this.buildErrorTraceMessage(this.getOTranslate().getValue("SOLDE_INSUFFISANT"));
                return null;
            }
            TTypeDepense OTTypeDepense = this.getOdataManager().getEm().find(TTypeDepense.class, lg_TYPE_DEPENSE_ID);
            TDepenses OTDepenses = new TDepenses();

            OTDepenses.setIdDepense(this.getKey().gettimeid());
            OTDepenses.setLgTYPEDEPENSEID(OTTypeDepense);
            OTDepenses.setIntAMOUNT(MONTANT);
            OTDepenses.setStrDESCRIPTION(str_DESCRIPTION);
            OTDepenses.setDtCREATED(new Date());
            OTDepenses.setStrREFFACTURE(str_REF_FACTURE);
            // OTDepenses.setIdAnneeScolaire(this.getOTAnneeScolaires());
            OTDepenses.setStrCREATEDBY(this.getOTUser().getStrLOGIN());

            this.persiste(OTDepenses);
            this.setMessage(commonparameter.PROCESS_SUCCESS);
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String Description = "depense d une somme de  " + OTDepenses.getIntAMOUNT() + " pour type de depense : "
                    + OTTypeDepense.getStrTYPEDEPENSE();
            String Libelle = "DEC. " + str_DESCRIPTION;

            this.add_to_cash_transaction(Ojconnexion, commonparameter.TRANSACTION_DEBIT, MONTANT, Libelle,
                    OTTypeDepense.getStrNUMEROCOMPTE(), int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF,
                    OTDepenses.getStrREFFACTURE(), str_type, str_task, "", "", "", lg_TYPE_REGLEMENT_ID, str_TYPE, true,
                    new Date());
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_depenses", "caisse", "Mouvement de Caisse",
                    this.getOTUser().getLgUSERID());
            this.is_activity(Ojconnexion);
            Ojconnexion.CloseConnexion();

            this.setDetailmessage(Libelle);

            return OTDepenses;

        } catch (Exception ex) {
            this.setMessage(ex.getMessage());
            new logger().oCategory.error(this.getMessage());
            return null;
        }

    }

    public void add_to_cash_transaction(jconnexion Ojconnexion, String str_TRANSACTION_REF, double int_AMOUNT,
            String str_DESCRIPTION, String str_NUMERO_COMPTE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU,
            String str_RESSOURCE_REF, String str_REF_FACTURE, String str_TYPE_VENTE, String str_TASK,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID,
            String lg_TYPE_REGLEMENT_ID, boolean str_TYPE, boolean bool_CHECKED, Date dt_CREATED) {

        try {
            new logger().OCategory.info(" *******  str_TRANSACTION_REF ****** " + str_TRANSACTION_REF);

            new logger().OCategory.info(" *******  Recherche de  OTReglement ****** " + lg_REGLEMENT_ID);

            TReglement OTReglement = (TReglement) this.find(lg_REGLEMENT_ID, new TReglement());

            if (OTReglement == null) {
                new logger().OCategory.info(" *******  OTReglement is null ****** ");
                return;
            }

            new logger().OCategory.info(" *** OTReglement recu dans la bll est   *** " + lg_REGLEMENT_ID
                    + " *** Celui trouve est   ***  " + OTReglement.getLgREGLEMENTID());

            /*
             * if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6") ||
             * commonparameter.TRANSACTION_DEBIT.equals(str_TRANSACTION_REF)) { // a decommenter en cas de probleme new
             * logger().OCategory.info(" *** LgMODEREGLEMENTID is 6  ***  ");
             *
             * str_TRANSACTION_REF = "D"; } else { new logger().OCategory.info(" *** LgMODEREGLEMENTID is  ***  " +
             * OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID());
             *
             * str_TRANSACTION_REF = "C"; }
             */
            new logger().OCategory.info(
                    " *** LgMODEREGLEMENTID is  ***  " + OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID());

            new logger().OCategory.info(" *******  str_TRANSACTION_REF ****** " + str_TRANSACTION_REF);
            String sProc = "{ CALL proc_add_to_cash_transaction(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) }";
            CallableStatement cs = Ojconnexion.get_StringConnexion().prepareCall(sProc);
            String id = this.getKey().gettimeid();
            TCashTransaction OTCashTransaction;
            cs.setString(1, id);
            cs.setString(2, str_TRANSACTION_REF);
            cs.setDouble(3, int_AMOUNT);
            cs.setString(4, this.getOTUser().getStrLOGIN());
            cs.setString(5, "");
            cs.setString(6, str_DESCRIPTION);
            cs.setString(7, this.getOTUser().getLgUSERID());
            cs.setString(8, str_NUMERO_COMPTE);
            cs.setDouble(9, int_AMOUNT_REMIS);
            cs.setDouble(10, int_AMOUNT_RECU);
            cs.setString(11, str_RESSOURCE_REF);
            cs.setString(12, str_REF_FACTURE);
            cs.setString(13, str_TASK);
            cs.setString(14, str_TYPE_VENTE);
            cs.setString(15, lg_REGLEMENT_ID);
            cs.setString(16, str_REF_COMPTE_CLIENT);
            cs.setString(17, lg_MOTIF_REGLEMENT_ID);
            cs.setString(18, lg_TYPE_REGLEMENT_ID);
            cs.execute();

            new logger().OCategory.info(" *** add to cash effectuee avec succes *** ");

            OTCashTransaction = this.getOdataManager().getEm().find(TCashTransaction.class, id);
            if (OTCashTransaction != null) {
                // OTCashTransaction.setDtCREATED(new Date()); // a decommenter en cas de probleme
                OTCashTransaction.setDtCREATED(dt_CREATED);
                OTCashTransaction.setStrTYPE(str_TYPE);
                OTCashTransaction.setBoolCHECKED(bool_CHECKED);
                this.persiste(OTCashTransaction);
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());

        }
    }

    public TBilletage DoBilletage(TResumeCaisse OTResumeCaisse, int nb_dix, int nb_cinq, int nb_deux, int nb_mil,
            int nb_cinq_cent, int int_nb_autre) {
        TCaisse OTCaisse = null;

        OTResumeCaisse = this.GetTResumeCaisse(this.getOTUser().getLgUSERID());
        double int_billetage_amount = this.GetBilletageAmount(nb_dix, nb_cinq, nb_deux, nb_mil, nb_cinq_cent,
                int_nb_autre);

        new logger().OCategory.info(" *** int_billetage_amount *** " + int_billetage_amount);

        if (OTResumeCaisse == null) {
            this.buildErrorTraceMessage("ERROR", "Desole cette caisse n'existe pas");
            return null;
        }

        TBilletage OTBilletage = null;
        try {
            OTBilletage = new TBilletage();
            OTBilletage.setLgBILLETAGEID(this.getKey().getComplexId());
            OTBilletage.setLdCAISSEID(OTResumeCaisse.getLdCAISSEID());
            OTBilletage.setIntAMOUNT(int_billetage_amount);
            OTBilletage.setLgUSERID(this.getOTUser());
            OTBilletage.setLgCREATEDBY(this.getOTUser().getStrLOGIN());
            OTBilletage.setDtCREATED(new Date());
            this.persiste(OTBilletage);

            TBilletageDetails OTBilletageDetails = new TBilletageDetails();
            OTBilletageDetails.setLgBILLETAGEDETAILSID(this.getKey().getComplexId());
            OTBilletageDetails.setLgBILLETAGEID(OTBilletage);
            OTBilletageDetails.setIntNBDIXMIL(nb_dix);
            OTBilletageDetails.setIntNBCINQMIL(nb_cinq);
            OTBilletageDetails.setIntNBDEUXMIL(nb_deux);
            OTBilletageDetails.setIntNBMIL(nb_mil);
            OTBilletageDetails.setIntNBCINQCENT(nb_cinq_cent);
            OTBilletageDetails.setIntAUTRE(int_nb_autre);
            OTBilletageDetails.setDtCREATED(new Date());
            OTBilletageDetails.setLgCREATEDBY(this.getOTUser().getStrLOGIN());
            this.persiste(OTBilletageDetails);
            this.buildSuccesTraceMessage(" OPERATION EFFECTUEE AVEC SUCCES ");
        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", "DESOLE LE BILLETAGE A ECHOUE " + e.toString());
        }

        return OTBilletage;

    }

    public TResumeCaisse GetTResumeCaisse(String lg_USER_ID) {
        TResumeCaisse OTResumeCaisse;

        Calendar cal = Calendar.getInstance();
        SimpleDateFormat dateOnly = new SimpleDateFormat("MM/dd/yyyy");
        Date currentdate = this.getKey().stringToDate(dateOnly.format(cal.getTime()));
        new logger().OCategory.info(" ** caisse currentdate   ** " + currentdate);
        try {

            OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1  AND  t.strSTATUT LIKE ?2 AND t.dtCREATED >= ?3  AND t.dtCREATED < ?4 ")
                    .setParameter(1, lg_USER_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .setParameter(3, currentdate).setParameter(4, currentdate).getSingleResult();
            this.getOdataManager().getEm().refresh(OTResumeCaisse);

            return OTResumeCaisse;
        } catch (Exception e) {
            return null;
        }
    }

    public int GetBilletageAmount(int nb_dix, int nb_cinq, int nb_deux, int nb_mil, int nb_cinq_cent,
            int int_nb_autre) {
        int int_amount_result = 0;

        int_amount_result = (nb_dix * 10000) + (nb_cinq * 5000) + (nb_deux * 2000) + (nb_mil * 1000)
                + (nb_cinq_cent * 500) + (int_nb_autre);

        return int_amount_result;

    }

    public static TTypeMvtCaisse getTTypeMvtCaisse(String Ovalue, dataManager odataManager) {

        return odataManager.getEm().getReference(TTypeMvtCaisse.class, Ovalue);
    }

    // liste des coffres
    public List<TCoffreCaisse> getListeCoffreCaisse(String search_value, String ID_COFFRE_CAISSE, Date dtDEBUT,
            Date dtFin) {
        List<TCoffreCaisse> lstTCoffreCaisse = new ArrayList<>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }

            lstTCoffreCaisse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCoffreCaisse t WHERE t.idCoffreCaisse LIKE ?1 AND (t.lgUSERID.strFIRSTNAME LIKE ?2 OR t.lgUSERID.strLASTNAME LIKE ?2 OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?2) AND (t.dtCREATED >= ?3 AND t.dtCREATED <=?4) AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?5 ORDER BY t.dtCREATED DESC, t.lgUSERID.lgEMPLACEMENTID.strDESCRIPTION")
                    .setParameter(1, ID_COFFRE_CAISSE).setParameter(2, search_value + "%").setParameter(3, dtDEBUT)
                    .setParameter(4, dtFin).setParameter(5, lg_EMPLACEMENT_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTCoffreCaisse;
    }
    // fin liste des coffres

    public TResumeCaisse getTResumeCaisse(Date dt_Date_debut, Date dt_Date_Fin) {
        TResumeCaisse OTResumeCaisse = null;
        List<TResumeCaisse> lstTResumeCaisse = new ArrayList<>();
        try {
            TParameters OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_ACTIVATE_CLOTURE_CAISSE_AUTO);
            // a mettre le parametre de desactivation de la cloture automatique de la caisse
            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage("Paramètre de gestion de clôture automatique de la caisse inexistant");
                return null;

            }

            if (Integer.parseInt(OTParameters.getStrVALUE()) == 0) { // si valeur 0, on passe en cloture manuelle
                lstTResumeCaisse = this.getListeResumeCaissesByUser(this.getOTUser().getLgUSERID());
                new logger().OCategory.info("lstTResumeCaisse size " + lstTResumeCaisse.size());
                if (!lstTResumeCaisse.isEmpty()) {
                    OTResumeCaisse = lstTResumeCaisse.get(0);
                    this.buildSuccesTraceMessage("La caisse est en cours d'utilisation");
                }
                return OTResumeCaisse;
            }

            OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1  AND  t.strSTATUT LIKE ?2 AND t.dtCREATED >= ?3  AND t.dtCREATED < ?4 ")
                    .setParameter(1, this.getOTUser().getLgUSERID()).setParameter(2, commonparameter.statut_is_Using)
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin).getSingleResult();
            this.buildSuccesTraceMessage("La caisse est en cours d'utilisation");
        } catch (Exception e) {
            this.buildErrorTraceMessage("La caisse n'est pas en cours d'utilisation");
        }
        return OTResumeCaisse;
    }

    // liste des resumé caisse d'un utilisateur
    public List<TResumeCaisse> getListeResumeCaissesByUser(String lg_USER_ID) {
        List<TResumeCaisse> lstTResumeCaisse = new ArrayList<>();
        try {
            lstTResumeCaisse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1  AND  t.strSTATUT LIKE ?2 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_USER_ID).setParameter(2, commonparameter.statut_is_Using).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTResumeCaisse;
    }

    // fin
    public TResumeCaisse getTResumeCaisse(String lg_USER_ID, String str_STATUT) {
        TResumeCaisse OTResumeCaisse = null;
        try {
            OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND t.strSTATUT LIKE ?2 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_USER_ID).setParameter(2, str_STATUT).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTResumeCaisse;
    }

    public TResumeCaisse getTResumeCaisseClosed(String lg_USER_ID) {
        TResumeCaisse OTResumeCaisse = null;
        try {
            OTResumeCaisse = (TResumeCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID = ?1 AND (t.strSTATUT = ?2 OR t.strSTATUT = ?3) ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_USER_ID).setParameter(2, commonparameter.statut_is_Process)
                    .setParameter(3, commonparameter.statut_is_Closed).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTResumeCaisse;
    }

    // liste des types de reglements
    public List<TTypeReglement> getListeTTypeReglement(String search_value, String lg_TYPE_REGLEMENT_ID,
            String str_FLAG) {
        List<TTypeReglement> lstTTypeReglement = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTTypeReglement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeReglement t WHERE t.lgTYPEREGLEMENTID LIKE ?1 AND t.strNAME LIKE ?2 AND t.strFLAG LIKE ?3 ")
                    .setParameter(1, lg_TYPE_REGLEMENT_ID).setParameter(2, search_value + "%").setParameter(3, str_FLAG)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTTypeReglement taille " + lstTTypeReglement.size());
        return lstTTypeReglement;
    }
    // fin Liste des ajustements detail

    // fin liste des types de reglements
    // annuler une cloture de caisse
    public void RollBackCloseCaisse(String ld_CAISSE_ID) {
        TResumeCaisse OTResumeCaisseCurrent = null;
        TBilletageDetails OTBilletageDetails = null;
        TBilletage OTBilletage = null;
        try {

            TResumeCaisse OTResumeCaisse = this.getOdataManager().getEm().find(TResumeCaisse.class, ld_CAISSE_ID);

            // if(oTResumeCaisse == null)
            if (OTResumeCaisse == null) {
                this.buildErrorTraceMessage("Impossible de cloturer la caisse. Ref Inconnu de la caisse inconnu");
                return;
            }

            OTResumeCaisseCurrent = this.getTResumeCaisse(OTResumeCaisse.getLgUSERID().getLgUSERID(),
                    commonparameter.statut_is_Using);
            if (OTResumeCaisseCurrent != null) {
                this.buildErrorTraceMessage("Impossible d'annuler la clôture cette caisse",
                        "Cet utilisateur a deja une caisse "
                                + this.getOTranslate().getValue(OTResumeCaisseCurrent.getStrSTATUT()));
                return;
            }

            if (OTResumeCaisse.getStrSTATUT().equals(commonparameter.statut_is_Using)) {
                this.buildErrorTraceMessage("Impossible de cloturer cette caisse", "La caisse specifiée est deja  "
                        + this.getOTranslate().getValue(OTResumeCaisse.getStrSTATUT()));
                return;
            }

            // this.setOTUser(oTResumeCaisse.getLgUSERID());
            this.OTCaisse = new TCaisse();
            this.OTCaisse.setIntSOLDE(OTResumeCaisse.getIntSOLDESOIR().doubleValue());
            OTResumeCaisse.setLgUPDATEDBY(this.getOTUser().getStrLOGIN());
            OTResumeCaisse.setIntSOLDESOIR(0);
            OTResumeCaisse.setStrSTATUT(commonparameter.statut_is_Using);
            OTResumeCaisse.setDtUPDATED(new Date());

            OTBilletageDetails = new JournalVente(this.getOdataManager(), this.getOTUser())
                    .getTBilletageDetails(ld_CAISSE_ID);
            if (OTBilletageDetails != null) {
                OTBilletage = OTBilletageDetails.getLgBILLETAGEID();
                this.delete(OTBilletageDetails);
                this.delete(OTBilletage);
            }
            this.persiste(OTResumeCaisse);

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String Description = "Cloture de la caisse de " + this.getOTUser().getStrLOGIN() + " avec un montant de "
            // + Math.abs(oTResumeCaisse.getIntSOLDESOIR());
            String Description = "Annulation de la clôture de la caisse de "
                    + OTResumeCaisse.getLgUSERID().getStrFIRSTNAME() + " "
                    + OTResumeCaisse.getLgUSERID().getStrLASTNAME() + " par " + this.getOTUser().getStrFIRSTNAME() + " "
                    + this.getOTUser().getStrLASTNAME() + " effectuée avec succès";
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_coffre_caisse,t_resume_caisse,t_caisse", "caisse",
                    "Mouvement de Caisse", this.getOTUser().getLgUSERID());
            this.is_activity(Ojconnexion);
            Ojconnexion.CloseConnexion();
            this.setMessage(commonparameter.PROCESS_SUCCESS);

        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info(e.getMessage());
            this.buildErrorTraceMessage("Impossible d'annuler la cloture de cette caisse");

        }
    }

    // fin annuler une cloture de caisse
    // code ajouté 04/09/2016
    public void sendNotification(String lg_USER_ID) {
        String message = "Récapitulatif de caisse " + date.DateToString(new Date(), date.formatterShort) + "\n";
        Double totalAmount = 0.0;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            Date dt_Date_Debut = date.getDate(date.DateToString(new Date(), date.formatterMysqlShort2), "00:00");
            Date dt_Date_Fin = date.getDate(date.DateToString(new Date(), date.formatterMysqlShort2), "23:59");
            List<TResumeCaisse> lstTResumeCaisse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND (t.dtUPDATED >= ?3 AND t.dtUPDATED <= ?4) AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?5 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_USER_ID).setParameter(3, dt_Date_Debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, lg_EMPLACEMENT_ID).getResultList();
            for (TResumeCaisse OTResumeCaisse : lstTResumeCaisse) {
                totalAmount += OTResumeCaisse.getIntSOLDESOIR();
                message += "- " + OTResumeCaisse.getLgUSERID().getStrFIRSTNAME() + " "
                        + OTResumeCaisse.getLgUSERID().getStrLASTNAME() + ": "
                        + conversion.AmountFormat(OTResumeCaisse.getIntSOLDESOIR(), '.') + "\n";
            }
            message += "Total Caisse: " + conversion.AmountFormat(totalAmount.intValue(), '.');
            if (checkParameterByKey(DateConverter.KEY_SMS_CLOTURE_CAISSE)) {
                Sms s = new Sms();
                s.setMessage(message);
                Thread thread = new Thread(s);
                thread.start();
            }
            if (checkParameterByKey(DateConverter.KEY_MAIL_CLOTURE_CAISSE)) {
                Mail mail = new Mail();
                mail.setMessage(message);
                mail.setSubject("Récapitulatif de caisse " + date.DateToString(new Date(), date.formatterShort));
                Thread thread = new Thread(mail);
                thread.start();
            }
        } catch (Exception e) {

        }
    }

    public void sendSmsChiffreAffaireByCaisse(Date dt_Date_Debut, Date dt_Date_Fin, String lg_USER_ID) {
        List<TResumeCaisse> lstTResumeCaisse = new ArrayList<>();
        List<TAlertEventUserFone> lstTAlertEventUserFone = new ArrayList<>();
        String message = "Récapitulatif de caisse " + date.DateToString(dt_Date_Debut, date.formatterShort) + "\n";
        Double totalAmount = 0.0;
        ServicesNotifCustomer OServicesNotifCustomer = new ServicesNotifCustomer(this.getOdataManager(),
                this.getOTUser());
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            dt_Date_Debut = date.getDate(date.DateToString(dt_Date_Debut, date.formatterMysqlShort2), "00:00");
            dt_Date_Fin = date.getDate(date.DateToString(dt_Date_Fin, date.formatterMysqlShort2), "23:59");
            lstTResumeCaisse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND (t.dtUPDATED >= ?3 AND t.dtUPDATED <= ?4) AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?5 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_USER_ID).setParameter(3, dt_Date_Debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, lg_EMPLACEMENT_ID).getResultList();
            for (TResumeCaisse OTResumeCaisse : lstTResumeCaisse) {
                totalAmount += OTResumeCaisse.getIntSOLDESOIR();
                message += "- " + OTResumeCaisse.getLgUSERID().getStrFIRSTNAME() + " "
                        + OTResumeCaisse.getLgUSERID().getStrLASTNAME() + ": "
                        + conversion.AmountFormat(OTResumeCaisse.getIntSOLDESOIR(), '.') + "\n";
            }
            message += "Total Caisse: " + conversion.AmountFormat(totalAmount.intValue(), '.');
            if (lstTResumeCaisse.size() > 0) {
                lstTAlertEventUserFone = this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TAlertEventUserFone t WHERE t.strEvent.strEvent LIKE ?1")
                        .setParameter(1, "N_GET_SOLDE_CAISSE").getResultList();
                for (TAlertEventUserFone OTAlertEventUserFone : lstTAlertEventUserFone) {
                    // OServicesNotifCustomer.doservice(message, OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE(),
                    // this.getKey().getShortId(10)+OTAlertEventUserFone.getLgUSERFONEID().getLgUSERID().getLgUSERID());
                    OServicesNotifCustomer.saveNotification(message,
                            OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE(), this.getKey().getShortId(10)
                                    + OTAlertEventUserFone.getLgUSERFONEID().getLgUSERID().getLgUSERID());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // sms de mi-journé
    public void sendSmsChiffreAffaireMiDay(String dt_date_debut, String dt_date_fin, String h_debut, String h_fin,
            String lg_USER_ID, String lg_TYPE_REGLEMENT_ID) {
        JournalVente OJournalVente = new JournalVente(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        ServicesNotifCustomer OServicesNotifCustomer = new ServicesNotifCustomer(this.getOdataManager(),
                this.getOTUser());
        List<EntityData> listTMvtCaissesFalse = new ArrayList<>();
        List<Object[]> listPreenregistrement;
        TParameters OTParameters;
        Double P_SORTIECAISSE_ESPECE_FALSE = 0.0;
        int int_PRICE_TOTAL = 0;
        List<TAlertEventUserFone> lstTAlertEventUserFone = new ArrayList<>();
        String message = "Récapitulatif de caisse de mi-journée "
                + date.formatterShort.format(java.sql.Date.valueOf(dt_date_debut)) + "\n";

        try {

            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                    && !dt_date_debut.equalsIgnoreCase(dt_date_fin)) {
                listTMvtCaissesFalse = OJournalVente.getAllMouvmentsCaisse(dt_date_debut, dt_date_fin, false);
            }
            for (EntityData Odata : listTMvtCaissesFalse) {
                P_SORTIECAISSE_ESPECE_FALSE += (-1) * Double.valueOf(Odata.getStr_value1());
            }
            new logger().OCategory.info("P_SORTIECAISSE_ESPECE_FALSE:" + P_SORTIECAISSE_ESPECE_FALSE);
            listPreenregistrement = OJournalVente.getListeCaisse(dt_date_debut, dt_date_fin, h_debut, h_fin, lg_USER_ID,
                    lg_TYPE_REGLEMENT_ID);
            int_PRICE_TOTAL = OJournalVente.getTotalAmountCashTransaction(listPreenregistrement);
            message += "Chiffre d'affaire: " + conversion.AmountFormat(int_PRICE_TOTAL, '.');
            if (int_PRICE_TOTAL > 0) {
                lstTAlertEventUserFone = this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TAlertEventUserFone t WHERE t.strEvent.strEvent LIKE ?1")
                        .setParameter(1, "N_GET_SOLDE_CAISSE").getResultList();
                for (TAlertEventUserFone OTAlertEventUserFone : lstTAlertEventUserFone) {
                    // if(OServicesNotifCustomer.doservice(message,
                    // OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE(),
                    // dt_date_debut+OTAlertEventUserFone.getLgUSERFONEID().getLgUSERID().getLgUSERID()) > 0) { //a
                    // decommenter en cas de probleme 09/08/2016
                    if (OServicesNotifCustomer.saveNotification(message,
                            OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE(), dt_date_debut
                                    + OTAlertEventUserFone.getLgUSERFONEID().getLgUSERID().getLgUSERID()) != null) {
                        this.buildSuccesTraceMessage("Opération effectuée avec succès");
                    } else {
                        this.buildErrorTraceMessage("SMS non envoyé");
                    }

                }

            } else {
                this.buildErrorTraceMessage("Aucun SMS envoyé");
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'envoi du SMS");
        }
    }
    // fin sms de mi-journé

    public TRecettes AddRecetteBACK(Double MONTANT, String lg_TYPE_RECETTE_ID, String str_DESCRIPTION,
            String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID,
            String transaction, boolean str_TYPE) {
        Double int_amount_hors_tva = 0.0;
        Double int_amount_tva = 0.0;

        try {

            TTypeRecette OTTypeRecette = (TTypeRecette) this.find(lg_TYPE_RECETTE_ID, new TTypeRecette());
            // Verrifier si la tva es applicape
            if (OTTypeRecette.getIsUSETVA()) {
                String str_DESCRIPTIONTemp = "TVA  " + str_DESCRIPTION;
                TTypeRecette OTTypeRecetteTVA = (TTypeRecette) this.find(Parameter.KEY_TYPE_RECETTE_TVA,
                        new TTypeRecette());// this.find(TTypeRecette.class, Parameter.KEY_TYPE_RECETTE_TVA);
                int_amount_tva = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getInAmountTva(MONTANT.intValue());

                String str_task_temp = "TVA" + str_task;
                this.AddRecette(int_amount_tva, OTTypeRecetteTVA, str_DESCRIPTIONTemp, str_REF_FACTURE,
                        int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type,
                        "TVAVENTE", lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                        lg_TYPE_MVT_CAISSE_ID, transaction, str_TYPE); //

            }
            int_amount_hors_tva = MONTANT - int_amount_tva;

            TRecettes OTRecettes = this.AddRecette(int_amount_hors_tva, OTTypeRecette, str_DESCRIPTION, str_REF_FACTURE,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type, str_task,
                    lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, lg_TYPE_MVT_CAISSE_ID, transaction,
                    str_TYPE);
            // ensuite inserer pour la tva cest a dire appeler la methode ki calcule le montant de la tva et inserer ce
            // montant ds OTRecettes.setIntAMOUNT(MONTANT)
            // new SnapshotManager(this.getOdataManager(),
            // this.getOTUser()).BuildTSnapShopDalyRecetteCaisse(OTRecettes);

            return OTRecettes;
        } catch (Exception ex) {
            this.setMessage(ex.getMessage());
            new logger().oCategory.error(this.getMessage());
            return null;
        }

    }

    public TRecettes AddRecetteBACK(jconnexion Ojconnexion, double MONTANT, String lg_TYPE_RECETTE_ID,
            String str_DESCRIPTION, String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU,
            String str_RESSOURCE_REF, String lg_TYPE_REGLEMENT_ID, String str_type, String str_task,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID,
            String lg_TYPE_MVT_CAISSE_ID, String transaction, boolean str_TYPE) {
        // public TRecettes AddRecette(boolean action,jconnexion Ojconnexion, double MONTANT, String lg_TYPE_RECETTE_ID,
        // String str_DESCRIPTION, String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String
        // str_RESSOURCE_REF, String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
        // String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID) {
        String str_transaction_code = "";

        try {
            if (this.CheckResumeCaisse()) {
                TTypeRecette OTTypeRecette = this.getOdataManager().getEm().find(TTypeRecette.class,
                        lg_TYPE_RECETTE_ID);
                // TTypeMvtCaisse OTTypeMvtCaisse =
                // caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE, this.getOdataManager());
                TTypeMvtCaisse OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(lg_TYPE_MVT_CAISSE_ID,
                        this.getOdataManager());

                String Libelle = "ENCAISSEMENT POUR : " + OTTypeRecette.getStrTYPERECETTE();

                if (!str_DESCRIPTION.equals("")) {
                    Libelle = str_DESCRIPTION;
                }
                new logger().OCategory.info(" *** OTRecettes CREATION DE OTrecettes  *** " + MONTANT
                        + " lg_TYPE_RECETTE_ID =" + lg_TYPE_RECETTE_ID + " str_type =" + str_type);
                TRecettes OTRecettes = new TRecettes();
                OTRecettes.setIdRecette(this.getKey().gettimeid());
                OTRecettes.setLgTYPERECETTEID(OTTypeRecette);
                OTRecettes.setIntAMOUNT(MONTANT);
                OTRecettes.setDtCREATED(new Date());
                OTRecettes.setStrDESCRIPTION(str_DESCRIPTION);
                OTRecettes.setStrREFFACTURE(str_REF_FACTURE);
                // OTRecettes.setIdAnneeScolaire(this.getKey().getOTAnneeScolaires());
                OTRecettes.setStrCREATEDBY(this.getOTUser().getStrLOGIN());
                this.getOdataManager().getEm().persist(OTRecettes);

                this.setMessage(commonparameter.PROCESS_SUCCESS);

                String Description = "Enregistrement d une somme de  " + OTRecettes.getIntAMOUNT()
                        + " pour type de recette : " + OTTypeRecette.getStrTYPERECETTE();

                /*
                 * if (!OTTypeRecette.getIsUSETVA()) { str_transaction_code = commonparameter.TRANSACTION_TVA; } if
                 * (OTTypeRecette.getIsUSETVA()) { str_transaction_code = commonparameter.TRANSACTION_CREDIT; }
                 */
                new logger().OCategory.info(" transaction code ref   " + str_transaction_code);

                // this.add_to_cash_transaction(Ojconnexion, commonparameter.TRANSACTION_CREDIT, MONTANT, Libelle,
                // OTTypeMvtCaisse.getStrCODECOMPTABLE(), int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF,
                // OTRecettes.getStrREFFACTURE(), str_type, str_task, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                // lg_MOTIF_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID); // a decommenter en cas de probleme
                this.add_to_cash_transaction(Ojconnexion, transaction, MONTANT, Libelle,
                        OTTypeMvtCaisse.getStrCODECOMPTABLE(), int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF,
                        OTRecettes.getStrREFFACTURE(), str_type, str_task, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                        lg_MOTIF_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID, str_TYPE, true, new Date());

                new SnapshotManager(this.getOdataManager(), this.getOTUser()).BuildTSnapShopDalyRecette(OTRecettes);
                new logger().OCategory.info(" *** after SnapshotManager 2 in caisseManagement AddRecette 571 ***");
                try {
                    // OTPreenregistrement = (TPreenregistrement) this.find(str_REF_FACTURE, new TPreenregistrement());
                    new SnapshotManager(this.getOdataManager(), this.getOTUser()).BuildTSnapShopDalyVente(OTRecettes,
                            (TPreenregistrement) this.find(str_REF_FACTURE, new TPreenregistrement()));

                } catch (Exception e) {
                    e.printStackTrace();
                }

                // creer le mouvement
                // "1080000000"
                // code ajouté
                // if(action) {
                // new TellerMovement(this.getOdataManager(), this.getOTUser()).AddTMvtCaisse(OTTypeMvtCaisse,
                // OTTypeMvtCaisse.getStrCODECOMPTABLE(), Libelle, "1", new Double(OTRecettes.getIntAMOUNT()), "", "",
                // "", "", 0, new Date(), false);
                // }
                // fin code ajouté
                new logger().OCategory.info(" *** after all in caisseManagement AddRecette 570 *** ");
                this.is_activity(Ojconnexion);
                return OTRecettes;
            } else {

                new logger().OCategory.info(
                        " *** probleme avec la caisse +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ *** ");

            }

        } catch (Exception ex) {
            ex.printStackTrace();
            this.buildErrorTraceMessage(this.getMessage());
            new logger().OCategory.info(" error AddRecette   " + ex.toString());

        }
        return null;
    }

    public TRecettes AddRecetteBACK2(jconnexion Ojconnexion, double MONTANT, TTypeRecette OTTypeRecette,
            String str_DESCRIPTION, String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU,
            String str_RESSOURCE_REF, String lg_TYPE_REGLEMENT_ID, String str_type, String str_task,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID,
            String lg_TYPE_MVT_CAISSE_ID, String transaction, boolean str_TYPE) {
        // public TRecettes AddRecette(boolean action,jconnexion Ojconnexion, double MONTANT, String lg_TYPE_RECETTE_ID,
        // String str_DESCRIPTION, String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String
        // str_RESSOURCE_REF, String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
        // String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID) {
        String str_transaction_code = "";

        try {

            // TTypeMvtCaisse OTTypeMvtCaisse =
            // caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE, this.getOdataManager());
            TTypeMvtCaisse OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(lg_TYPE_MVT_CAISSE_ID,
                    this.getOdataManager());

            String Libelle = "ENCAISSEMENT POUR : " + OTTypeRecette.getStrTYPERECETTE();

            if (!str_DESCRIPTION.equals("")) {
                Libelle = str_DESCRIPTION;
            }

            TRecettes OTRecettes = new TRecettes();
            OTRecettes.setIdRecette(this.getKey().gettimeid());
            OTRecettes.setLgTYPERECETTEID(OTTypeRecette);
            OTRecettes.setIntAMOUNT(MONTANT);
            OTRecettes.setDtCREATED(new Date());
            OTRecettes.setStrDESCRIPTION(str_DESCRIPTION);
            OTRecettes.setStrREFFACTURE(str_REF_FACTURE);
            // OTRecettes.setIdAnneeScolaire(this.getKey().getOTAnneeScolaires());
            OTRecettes.setStrCREATEDBY(this.getOTUser().getStrLOGIN());
            this.getOdataManager().getEm().persist(OTRecettes);

            this.setMessage(commonparameter.PROCESS_SUCCESS);

            String Description = "Enregistrement d une somme de  " + OTRecettes.getIntAMOUNT()
                    + " pour type de recette : " + OTTypeRecette.getStrTYPERECETTE();

            /*
             * if (!OTTypeRecette.getIsUSETVA()) { str_transaction_code = commonparameter.TRANSACTION_TVA; } if
             * (OTTypeRecette.getIsUSETVA()) { str_transaction_code = commonparameter.TRANSACTION_CREDIT; }
             */
            new logger().OCategory.info(" transaction code ref   " + str_transaction_code);

            // this.add_to_cash_transaction(Ojconnexion, commonparameter.TRANSACTION_CREDIT, MONTANT, Libelle,
            // OTTypeMvtCaisse.getStrCODECOMPTABLE(), int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF,
            // OTRecettes.getStrREFFACTURE(), str_type, str_task, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
            // lg_MOTIF_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID); // a decommenter en cas de probleme
            this.add_to_cash_transaction(Ojconnexion, transaction, MONTANT, Libelle,
                    OTTypeMvtCaisse.getStrCODECOMPTABLE(), int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF,
                    OTRecettes.getStrREFFACTURE(), str_type, str_task, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                    lg_MOTIF_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID, str_TYPE, true, new Date());

            new SnapshotManager(this.getOdataManager(), this.getOTUser()).BuildTSnapShopDalyRecette(OTRecettes);
            new logger().OCategory.info(" *** after SnapshotManager 2 in caisseManagement AddRecette 571 ***");
            try {
                // OTPreenregistrement = (TPreenregistrement) this.find(str_REF_FACTURE, new TPreenregistrement());
                new SnapshotManager(this.getOdataManager(), this.getOTUser()).BuildTSnapShopDalyVente(OTRecettes,
                        (TPreenregistrement) this.find(str_REF_FACTURE, new TPreenregistrement()));

            } catch (Exception e) {
                e.printStackTrace();
            }

            // creer le mouvement
            // "1080000000"
            // code ajouté
            // if(action) {
            // new TellerMovement(this.getOdataManager(), this.getOTUser()).AddTMvtCaisse(OTTypeMvtCaisse,
            // OTTypeMvtCaisse.getStrCODECOMPTABLE(), Libelle, "1", new Double(OTRecettes.getIntAMOUNT()), "", "", "",
            // "", 0, new Date(), false);
            // }
            // fin code ajouté
            new logger().OCategory.info(" *** after all in caisseManagement AddRecette 570 *** ");
            this.is_activity(Ojconnexion);
            return OTRecettes;

        } catch (Exception ex) {
            ex.printStackTrace();
            this.buildErrorTraceMessage(this.getMessage());
            new logger().OCategory.info(" error AddRecette   " + ex.toString());

        }
        return null;
    }

    public boolean add_to_cash_transaction(String str_TRANSACTION_REF, Double int_AMOUNT, String str_DESCRIPTION,
            String str_NUMERO_COMPTE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String str_REF_FACTURE, String str_TYPE_VENTE, String str_TASK, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_REGLEMENT_ID, boolean str_TYPE,
            boolean bool_CHECKED, Date dt_CREATED) {

        try {

            Integer para = 0, intAMOUNT = int_AMOUNT.intValue();
            new logger().OCategory.info(" *******  str_TRANSACTION_REF ****** " + str_TRANSACTION_REF
                    + " ************** int_AMOUNT " + int_AMOUNT + " str_TASK " + str_TASK);

            new logger().OCategory.info(" *******  Recherche de  OTReglement ****** " + lg_REGLEMENT_ID);

            TReglement OTReglement = (TReglement) this.find(lg_REGLEMENT_ID, new TReglement());

            if (OTReglement == null) {
                new logger().OCategory.info(" *******  OTReglement is null ****** ");
                return false;
            }
            try {
                TPreenregistrement op = this.getOdataManager().getEm().find(TPreenregistrement.class,
                        str_RESSOURCE_REF);

                if (op != null) {
                    // str_TRANSACTION_REF = ((intAMOUNT >= 0) ? "C" : "D");

                    para = op.getIntACCOUNT();
                    para = (int_AMOUNT > 0 ? para : (-1 * para));

                    TParameters KEY_TAKE_INTO_ACCOUNT = this.getOdataManager().getEm().getReference(TParameters.class,
                            "KEY_TAKE_INTO_ACCOUNT");
                    if (KEY_TAKE_INTO_ACCOUNT != null
                            && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {
                        Integer y = op.getIntPRICE() - op.getIntACCOUNT();
                        if (y == 0) {
                            intAMOUNT = int_AMOUNT.intValue();
                        } else if (y > 0) {
                            Integer x = Math.abs(int_AMOUNT.intValue()) - (op.getIntACCOUNT() - op.getIntREMISEPARA());
                            if (x >= 0) {
                                intAMOUNT = op.getIntACCOUNT() - op.getIntREMISEPARA();
                            } else {
                                intAMOUNT = 0;
                            }
                        }
                    }
                    // int_AMOUNT = Math.abs(int_AMOUNT);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            new logger().OCategory.info(" *** OTReglement recu dans la bll est   *** " + lg_REGLEMENT_ID
                    + " *** Celui trouve est   ***  " + OTReglement.getLgREGLEMENTID());

            StoredProcedureQuery q = this.getOdataManager().getEm()
                    .createStoredProcedureQuery("proc_add_to_cash_transaction2");
            // q.setHint(QueryHints.PESSIMISTIC_LOCK, PessimisticLock.NoLock);
            q.setHint("javax.persistence.query.timeout", 10000);
            q.registerStoredProcedureParameter("ID", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_TRANSACTION_REF", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("int_AMOUNT", Integer.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("lg_CREATED_BY", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_DESCRIPTION", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("lg_USER_ID", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_NUMERO_COMPTE", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("int_AMOUNT_REMIS", Integer.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("int_AMOUNT_RECU", Integer.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_RESSOURCE_REF", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_REF_FACTURE", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_TASK", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_TYPE_VENTE", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("lg_REGLEMENT_ID", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("str_REF_COMPTE_CLIENT", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("lg_MOTIF_REGLEMENT_ID", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("lg_TYPE_REGLEMENT_ID", String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("dtCREATED", Timestamp.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("int_ACCOUNT", Integer.class, ParameterMode.IN);
            q.registerStoredProcedureParameter("intAMOUNT", Integer.class, ParameterMode.IN);

            q.setParameter("ID", this.getKey().gettimeid());
            q.setParameter("str_TRANSACTION_REF", str_TRANSACTION_REF);
            q.setParameter("int_AMOUNT", Double.valueOf(int_AMOUNT).intValue());
            q.setParameter("lg_CREATED_BY", this.getOTUser().getStrLOGIN());
            q.setParameter("str_DESCRIPTION", str_DESCRIPTION);
            q.setParameter("lg_USER_ID", this.getOTUser().getLgUSERID());
            q.setParameter("str_NUMERO_COMPTE", str_NUMERO_COMPTE);
            q.setParameter("int_AMOUNT_REMIS", int_AMOUNT_REMIS);
            q.setParameter("int_AMOUNT_RECU", int_AMOUNT_RECU);
            q.setParameter("str_REF_FACTURE", str_REF_FACTURE);
            q.setParameter("str_TASK", str_TASK);
            q.setParameter("str_TYPE_VENTE", str_TYPE_VENTE);
            q.setParameter("lg_REGLEMENT_ID", lg_REGLEMENT_ID);
            q.setParameter("str_REF_COMPTE_CLIENT", str_REF_COMPTE_CLIENT);
            q.setParameter("lg_TYPE_REGLEMENT_ID", lg_TYPE_REGLEMENT_ID);
            q.setParameter("lg_MOTIF_REGLEMENT_ID", lg_MOTIF_REGLEMENT_ID);
            q.setParameter("str_RESSOURCE_REF", str_RESSOURCE_REF);
            q.setParameter("dtCREATED", new Date());
            q.setParameter("int_ACCOUNT", para);
            q.setParameter("intAMOUNT", intAMOUNT);

            return q.execute();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(e.getMessage());
            return false;

        }
    }

    public TRecettes addRecette(Double MONTANT, TTypeRecette OTTypeRecette, String str_DESCRIPTION,
            String str_REF_FACTURE, double int_AMOUNT_REMIS, double int_AMOUNT_RECU, String str_RESSOURCE_REF,
            String lg_TYPE_REGLEMENT_ID, String str_type, String str_task, String lg_REGLEMENT_ID,
            String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String lg_TYPE_MVT_CAISSE_ID,
            String transaction, boolean str_TYPE) {
        Double int_amount_hors_tva = 0.0;
        Double int_amount_tva = 0.0;
        TRecettes OTRecettes = null;
        new logger().OCategory.info(" *** Add recette   dbMONTANT *** ++++++++++++++++++++++++++++  " + MONTANT);

        try {
            // Verrifier si la tva es applicape
            if (OTTypeRecette.getIsUSETVA()) {
                String str_DESCRIPTIONTemp = "TVA  " + str_DESCRIPTION;
                // TTypeRecette OTTypeRecetteTVA = (TTypeRecette) this.find(Parameter.KEY_TYPE_RECETTE_TVA, new
                // TTypeRecette());// this.find(TTypeRecette.class, Parameter.KEY_TYPE_RECETTE_TVA);
                TTypeRecette OTTypeRecetteTVA = this.getOdataManager().getEm().getReference(TTypeRecette.class,
                        Parameter.KEY_TYPE_RECETTE_TVA);
                int_amount_tva = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getInAmountTva(MONTANT.intValue());

                String str_task_temp = "TVA" + str_task;
                this.AddRecette(int_amount_tva, OTTypeRecetteTVA, str_DESCRIPTIONTemp, str_REF_FACTURE,
                        int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type,
                        "TVAVENTE", lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                        lg_TYPE_MVT_CAISSE_ID, transaction, str_TYPE); //

            }
            int_amount_hors_tva = MONTANT - int_amount_tva;

            OTRecettes = this.AddRecette(int_amount_hors_tva, OTTypeRecette, str_DESCRIPTION, str_REF_FACTURE,
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, str_RESSOURCE_REF, lg_TYPE_REGLEMENT_ID, str_type, str_task,
                    lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, lg_TYPE_MVT_CAISSE_ID, transaction,
                    str_TYPE);

            return OTRecettes;
        } catch (Exception ex) {
            this.setMessage(ex.getMessage());
            new logger().oCategory.error(this.getMessage());
            return OTRecettes;
        }

    }

}
