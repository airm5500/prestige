/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.teller;

import bll.common.Parameter;
import bll.configManagement.familleManagement;
import bll.configManagement.trancheHoraireManagement;
import bll.entity.EntityData;
import bll.stockManagement.StockManager;
import bll.userManagement.privilege;
import dal.TAjustementDetail;
import dal.TCaisse;
import dal.TEmplacement;
import dal.TEmplacement_;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleGrossiste_;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TFamillearticle;
import dal.TFamillearticle_;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaireFamille_;
import dal.TInventaire_;
import dal.TMouvement;
import dal.TMouvementSnapshot;
import dal.TMouvement_;
import dal.TMouvementprice;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TRecettes;
import dal.TSnapShopDalyRecette;
import dal.TSnapShopDalyRecetteCaisse;
import dal.TSnapShopDalyStat;
import dal.TSnapShopDalyVente;
import dal.TTrancheHoraire;
import dal.TTypeStockFamille;
import dal.TTypeVente;
import dal.TUser;
import dal.TZoneGeographique;
import dal.TZoneGeographique_;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class SnapshotManager extends bll.bllBase {

    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat dateFormat2 = new SimpleDateFormat("HH:mm:ss");

    public SnapshotManager(dataManager odataManager) {
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public SnapshotManager(dataManager odataManager, TUser oTUser) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public List<TSnapShopDalyRecette> getTSnapShopDalyRecetteVeille() {

        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = this.getKey().GetDateNowForSearch(-1);
        String Date_Fin = this.getKey().GetDateNowForSearch(0);
        dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        // Toute les caisse
        try {

            List<TSnapShopDalyRecette> LstTSnapShopDalyRecette = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalyRecette t WHERE  t.dtDAY >= ?3  AND t.dtDAY < ?4 AND t.strSTATUT LIKE ?5 AND t.lgTYPERECETTEID.lgTYPERECETTEID LIKE ?6")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, "%%").getResultList();

            return LstTSnapShopDalyRecette;

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
            return null;

        }
    }

    public TSnapShopDalyRecette BuildTSnapShopDalyRecette(TRecettes oTRecettes) {
        TSnapShopDalyRecette OTSnapShopDalyRecette = null;

        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        // Toute les caisse
        try {

            OTSnapShopDalyRecette = (TSnapShopDalyRecette) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalyRecette t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgTYPERECETTEID.lgTYPERECETTEID LIKE ?6")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable)
                    .setParameter(6, oTRecettes.getLgTYPERECETTEID().getLgTYPERECETTEID()).getSingleResult();

        } catch (Exception e) {

            OTSnapShopDalyRecette = new TSnapShopDalyRecette();
            OTSnapShopDalyRecette.setLgID(this.getKey().getComplexId());
            OTSnapShopDalyRecette.setIntNUMBERTRANSACTION(1);
            OTSnapShopDalyRecette.setDtDAY(new Date());
            OTSnapShopDalyRecette.setStrSTATUT(commonparameter.statut_enable);
            OTSnapShopDalyRecette.setIntAMOUNT(oTRecettes.getIntAMOUNT());
            OTSnapShopDalyRecette.setLgTYPERECETTEID(oTRecettes.getLgTYPERECETTEID());

            this.getOdataManager().getEm().persist(OTSnapShopDalyRecette);
            this.buildErrorTraceMessage("Creation  snapshot day recette");
            return OTSnapShopDalyRecette;

        }

        OTSnapShopDalyRecette.setIntAMOUNT(OTSnapShopDalyRecette.getIntAMOUNT() + oTRecettes.getIntAMOUNT());
        OTSnapShopDalyRecette.setIntNUMBERTRANSACTION(OTSnapShopDalyRecette.getIntNUMBERTRANSACTION() + 1);
        this.getOdataManager().getEm().merge(OTSnapShopDalyRecette);
        this.buildErrorTraceMessage("Update snapshot day recette");

        // La caisse conecter
        try {
            TPreenregistrement OTPreenregistrement = this.GetTTypeVente(oTRecettes.getStrREFFACTURE());
            this.BuildTSnapShopDalyRecetteCaisse(oTRecettes);
        } catch (Exception e) {
        }

        return OTSnapShopDalyRecette;
    }

    public TSnapShopDalyVente BuildTSnapShopDalyVente(TRecettes oTRecettes, TPreenregistrement OTPreenregistrement) {

        if (OTPreenregistrement == null) {

            new logger().OCategory
                    .info("La ref de Preenregistrement est invalide impossible d'enregistre le snap shot des vent");
            return null;
        }

        for (TPreenregistrementDetail OTPreenregistrementDetail : OTPreenregistrement
                .getTPreenregistrementDetailCollection()) {
            this.BuildTSnapShopDalyStat(oTRecettes, OTPreenregistrementDetail); //
        } //

        TSnapShopDalyVente OTSnapShopDalyVente = null;

        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        // Toute les caisse
        try {

            OTSnapShopDalyVente = (TSnapShopDalyVente) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalyVente t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?6")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable)
                    .setParameter(6, OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()).getSingleResult();

        } catch (Exception e) {

            OTSnapShopDalyVente = new TSnapShopDalyVente();
            OTSnapShopDalyVente.setLgID(this.getKey().getComplexId());
            OTSnapShopDalyVente.setIntNUMBERTRANSACTION(1);
            OTSnapShopDalyVente.setDtDAY(new Date());
            OTSnapShopDalyVente.setStrSTATUT(commonparameter.statut_enable);
            OTSnapShopDalyVente.setIntAMOUNT(oTRecettes.getIntAMOUNT());
            OTSnapShopDalyVente.setLgTYPEVENTEID(OTPreenregistrement.getLgTYPEVENTEID());

            this.getOdataManager().getEm().persist(OTSnapShopDalyVente);
            this.buildErrorTraceMessage("Creation  snapshot day recette");
            return OTSnapShopDalyVente;

        }

        OTSnapShopDalyVente.setIntAMOUNT(OTSnapShopDalyVente.getIntAMOUNT() + oTRecettes.getIntAMOUNT());
        OTSnapShopDalyVente.setIntNUMBERTRANSACTION(OTSnapShopDalyVente.getIntNUMBERTRANSACTION() + 1);
        this.getOdataManager().getEm().merge(OTSnapShopDalyVente);

        this.buildErrorTraceMessage("Update snapshot day vente");
        return OTSnapShopDalyVente;
    }

    public TSnapShopDalyStat BuildTSnapShopDalyStat(TRecettes oTRecettes,
            TPreenregistrementDetail OTPreenregistrement) {

        if (OTPreenregistrement == null) {

            new logger().OCategory.info(
                    "La ref de Preenregistrementdetail est invalide impossible d'enregistre le snap shot des dtat");
            return null;
        }

        TSnapShopDalyStat OTSnapShopDalyVente = null;

        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
        TTrancheHoraire OTTrancheHoraire = new trancheHoraireManagement(this.getOdataManager()).find(new Date());

        // Toute les caisse
        try {

            OTSnapShopDalyVente = (TSnapShopDalyStat) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalyStat t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?6  AND t.lgTRANCHEHORAIREID.lgTRANCHEHORAIREID LIKE ?7  AND t.lgFAMILLEID.lgFAMILLEID LIKE ?8 AND t.lgUSERID.lgUSERID LIKE ?9")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable)
                    .setParameter(6,
                            OTPreenregistrement.getLgPREENREGISTREMENTID().getLgTYPEVENTEID().getLgTYPEVENTEID())
                    .setParameter(7, OTTrancheHoraire.getLgTRANCHEHORAIREID())
                    .setParameter(8, OTPreenregistrement.getLgFAMILLEID().getLgFAMILLEID())
                    .setParameter(9, OTPreenregistrement.getLgPREENREGISTREMENTID().getLgUSERVENDEURID().getLgUSERID())
                    .getSingleResult();

        } catch (Exception e) {

            OTSnapShopDalyVente = new TSnapShopDalyStat();
            OTSnapShopDalyVente.setLgID(this.getKey().getComplexId());
            // OTSnapShopDalyVente.setIntNUMBERTRANSACTION(1); // a decommenter en cas de probleme
            OTSnapShopDalyVente.setIntNUMBERTRANSACTION(OTPreenregistrement.getIntPRICE() > 0 ? 1 : 0);
            OTSnapShopDalyVente.setDtDAY(new Date());
            OTSnapShopDalyVente.setStrSTATUT(commonparameter.statut_enable);
            OTSnapShopDalyVente.setIntAMOUNT(oTRecettes.getIntAMOUNT());
            OTSnapShopDalyVente.setLgTRANCHEHORAIREID(OTTrancheHoraire);
            OTSnapShopDalyVente.setLgFAMILLEID(OTPreenregistrement.getLgFAMILLEID());
            OTSnapShopDalyVente.setLgTYPEVENTEID(OTPreenregistrement.getLgPREENREGISTREMENTID().getLgTYPEVENTEID());
            OTSnapShopDalyVente.setLgUSERID(OTPreenregistrement.getLgPREENREGISTREMENTID().getLgUSERVENDEURID());
            OTSnapShopDalyVente.setIntNUMBER((OTPreenregistrement.getBISAVOIR()
                    ? OTPreenregistrement.getIntQUANTITYSERVED() : OTPreenregistrement.getIntQUANTITY()));
            OTSnapShopDalyVente.setStrPKEY(OTPreenregistrement.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID());
            this.getOdataManager().getEm().persist(OTSnapShopDalyVente);
            this.buildErrorTraceMessage("Creation  snapshot day recette");
            return OTSnapShopDalyVente;

        }

        OTSnapShopDalyVente.setIntAMOUNT(OTSnapShopDalyVente.getIntAMOUNT() + oTRecettes.getIntAMOUNT());
        OTSnapShopDalyVente.setIntNUMBER(OTSnapShopDalyVente.getIntNUMBER() + (OTPreenregistrement.getBISAVOIR()
                ? OTPreenregistrement.getIntQUANTITYSERVED() : OTPreenregistrement.getIntQUANTITY()));
        OTSnapShopDalyVente.setIntNUMBERTRANSACTION(
                OTPreenregistrement.getIntPRICE() > 0 ? OTSnapShopDalyVente.getIntNUMBERTRANSACTION() + 1
                        : OTSnapShopDalyVente.getIntNUMBERTRANSACTION() - 1);
        this.getOdataManager().getEm().merge(OTSnapShopDalyVente);
        this.buildErrorTraceMessage("Update snapshot day stat");
        return OTSnapShopDalyVente;
    }

    public TSnapShopDalyRecetteCaisse BuildTSnapShopDalyRecetteCaisse(TRecettes oTRecettes) {
        new logger().OCategory.info(" *** 155 *** ");

        Double dbl_amount_remise = 0.0;
        TSnapShopDalyRecetteCaisse OTSnapShopDalyRecetteCaisse = null;
        TPreenregistrement OTPreenregistrement = this.GetTTypeVente(oTRecettes.getStrREFFACTURE());
        TTypeVente OTTypeVente = OTPreenregistrement.getLgTYPEVENTEID();
        dbl_amount_remise = OTPreenregistrement.getIntPRICEREMISE().doubleValue();
        TCaisse OTCaisse = new caisseManagement(this.getOdataManager(), this.getOTUser())
                .findByUserId(this.getOTUser());

        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        try {

            OTSnapShopDalyRecetteCaisse = (TSnapShopDalyRecetteCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalyRecetteCaisse t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgTYPERECETTEID.lgTYPERECETTEID LIKE ?6 AND t.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?7 ")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable)
                    .setParameter(6, oTRecettes.getLgTYPERECETTEID().getLgTYPERECETTEID())
                    .setParameter(7, OTTypeVente.getLgTYPEVENTEID()).getSingleResult();

            new logger().OCategory.info(" *** 180 *** ");

        } catch (Exception e) {

            OTSnapShopDalyRecetteCaisse = new TSnapShopDalyRecetteCaisse();
            OTSnapShopDalyRecetteCaisse.setLgID(this.getKey().getComplexId());
            OTSnapShopDalyRecetteCaisse.setIntNUMBERTRANSACTION(1);
            OTSnapShopDalyRecetteCaisse.setLgCAISSEID(OTCaisse);
            OTSnapShopDalyRecetteCaisse.setLgTYPEVENTEID(OTTypeVente);
            OTSnapShopDalyRecetteCaisse.setIntAMOUNTREMISE(dbl_amount_remise);
            OTSnapShopDalyRecetteCaisse.setDtDAY(new Date());
            OTSnapShopDalyRecetteCaisse.setStrSTATUT(commonparameter.statut_enable);
            OTSnapShopDalyRecetteCaisse.setIntAMOUNT(oTRecettes.getIntAMOUNT());
            OTSnapShopDalyRecetteCaisse.setLgTYPERECETTEID(oTRecettes.getLgTYPERECETTEID());
            if (OTTypeVente.getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {
                OTSnapShopDalyRecetteCaisse.setIntNUMBERVNO(1);
                OTSnapShopDalyRecetteCaisse.setIntNUMBERVO(0);
            } else {
                OTSnapShopDalyRecetteCaisse.setIntNUMBERVO(1);
                OTSnapShopDalyRecetteCaisse.setIntNUMBERVNO(0);
            }

            this.getOdataManager().getEm().persist(OTSnapShopDalyRecetteCaisse);
            this.buildErrorTraceMessage("Creation  snapshot day recette caisse");

            new logger().OCategory.info(" *** 205 *** ");

            return OTSnapShopDalyRecetteCaisse;

        }

        OTSnapShopDalyRecetteCaisse
                .setIntAMOUNT(OTSnapShopDalyRecetteCaisse.getIntAMOUNT() + oTRecettes.getIntAMOUNT());
        OTSnapShopDalyRecetteCaisse
                .setIntAMOUNTREMISE(OTSnapShopDalyRecetteCaisse.getIntAMOUNTREMISE() + dbl_amount_remise);
        OTSnapShopDalyRecetteCaisse.setIntNUMBERTRANSACTION(OTSnapShopDalyRecetteCaisse.getIntNUMBERTRANSACTION() + 1);
        if (OTTypeVente.getLgTYPEVENTEID().equals(bll.common.Parameter.VENTE_COMPTANT)) {
            OTSnapShopDalyRecetteCaisse.setIntNUMBERVNO(OTSnapShopDalyRecetteCaisse.getIntNUMBERVNO() + 1);
        } else {
            OTSnapShopDalyRecetteCaisse.setIntNUMBERVO(OTSnapShopDalyRecetteCaisse.getIntNUMBERVO() + 1);
        }

        this.getOdataManager().getEm().merge(OTSnapShopDalyRecetteCaisse);

        new logger().OCategory.info(" *** 223 *** ");

        this.buildErrorTraceMessage("Update snapshot day recette caisse ");

        return OTSnapShopDalyRecetteCaisse;
    }

    private TPreenregistrement GetTTypeVente(String str_Ref) {

        TPreenregistrement OTPreenregistrement = null;
        TTypeVente OTTypeVente = null;
        try {
            OTPreenregistrement = (TPreenregistrement) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TPreenregistrement t WHERE t.lgPREENREGISTREMENTID LIKE ?1 ")
                    .setParameter(1, str_Ref).getSingleResult();
            new logger().OCategory
                    .info(" *** OTPreenregistrement *** " + OTPreenregistrement.getLgPREENREGISTREMENTID());

            return OTPreenregistrement;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Type de vente Inexistant");
            new logger().OCategory.info("Type de vente Inexistant depuis TSnapShopDalyRecetteCaisse " + e.toString());

            return null;
        }

    }

    // public TMouvement getDalyTMouvement(TFamille OTFamille, String P_KEY, String str_ACTION, Date dt_Date_debut, Date
    // dt_Date_Fin) { // a decommenter en cas de probleme
    public TMouvement getDalyTMouvement(TFamille OTFamille, String P_KEY, String str_ACTION, String str_TYPE_ACTION,
            Date dt_Date_debut, Date dt_Date_Fin) {
        TMouvement OTMouvement = null;
        try {
            if (P_KEY.equalsIgnoreCase("")) {
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

    public TMouvement getDalyTMouvement(TFamille OTFamille, String P_KEY, String str_ACTION, Date dt_Date_debut,
            Date dt_Date_Fin, String lg_EMPLACEMENT_ID) {
        TMouvement OTMouvement = null;
        try {
            if (P_KEY.equalsIgnoreCase("")) {
                P_KEY = "%%";
            }
            OTMouvement = (TMouvement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvement t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.strACTION LIKE ?8 AND t.pKey LIKE ?9")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, OTFamille.getLgFAMILLEID())
                    .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, str_ACTION).setParameter(9, P_KEY)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }

        return OTMouvement;
    }

    // public TMouvement initTMouvement(TFamille OTFamille, int int_STOCK_JOUR) {
    public TMouvement initTMouvement(TFamille OTFamille, TEmplacement OTEmplacement) {
        TMouvement OTMouvement = null;
        try {
            OTMouvement = createTMouvement(OTFamille, OTEmplacement);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvement;
    }

    // public TMouvement createTMouvement(TFamille OTFamille, int int_STOCK_JOUR) { //a decommenter en cas de probleme
    public TMouvement createTMouvement(TFamille OTFamille, TEmplacement OTEmplacement) {
        try {

            TMouvement OTMouvement = new TMouvement();
            OTMouvement.setLgMOUVEMENTID(this.getKey().getComplexId());
            OTMouvement.setIntNUMBERTRANSACTION(0);
            OTMouvement.setDtDAY(new Date());
            OTMouvement.setStrSTATUT(commonparameter.statut_enable);
            OTMouvement.setIntNUMBER(0);
            OTMouvement.setLgFAMILLEID(OTFamille);
            OTMouvement.setLgUSERID(this.getOTUser());
            OTMouvement.setPKey("init");
            OTMouvement.setStrACTION("init");
            OTMouvement.setStrTYPEACTION("init");
            OTMouvement.setDtCREATED(new Date());
            OTMouvement.setLgEMPLACEMENTID(OTEmplacement);
            this.persiste(OTMouvement); // a decommenter en cas de probleme
            // this.getOdataManager().getEm().persist(OTMouvement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTMouvement;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
            return null;
        }
    }

    // enregistrement mouvement d'un article
    public TMouvement SaveMouvementFamille(TFamille OTFamille, String P_KEY, String str_TYPE_ACTION, String str_ACTION,
            Integer int_NUMBER, TEmplacement OTEmplacement) {
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        try {

            TMouvement OTMouvement = this.getDalyTMouvement(OTFamille, P_KEY, str_ACTION, str_TYPE_ACTION,
                    dt_Date_debut, dt_Date_Fin);
            if (OTMouvement == null) {
                OTMouvement = this.initTMouvement(OTFamille, OTEmplacement);
                System.err.println(
                        "OTMouvement **************************** " + OTMouvement + " ------------------------------ ");
            }

            OTMouvement.setIntNUMBERTRANSACTION(1 + OTMouvement.getIntNUMBERTRANSACTION());
            OTMouvement.setIntNUMBER(int_NUMBER + OTMouvement.getIntNUMBER());
            OTMouvement.setLgUSERID(this.getOTUser());
            OTMouvement.setPKey(P_KEY);
            OTMouvement.setStrACTION(str_ACTION);
            OTMouvement.setStrTYPEACTION(str_TYPE_ACTION);
            OTMouvement.setDtUPDATED(new Date());

            this.merge(OTMouvement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.createSnapshotMouvementArticle(OTFamille, int_NUMBER, str_TYPE_ACTION, str_ACTION); // a decommenter en
                                                                                                     // cas de probleme

            return OTMouvement;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible", e.getMessage());
            return null;
        }

    }

    public TMouvement SaveMouvementFamille(TFamille OTFamille, String P_KEY, String str_TYPE_ACTION, String str_ACTION,
            Integer int_NUMBER, TUser OTUser, TEmplacement OTEmplacement) {
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
        new logger().OCategory.info("Date_debut:" + Date_debut + "|Date_Fin:" + Date_Fin + "|dt_Date_Fin:" + dt_Date_Fin
                + "|dt_Date_debut:" + dt_Date_debut);
        try {

            TMouvement OTMouvement = this.getDalyTMouvement(OTFamille, P_KEY, str_ACTION, dt_Date_debut, dt_Date_Fin,
                    OTEmplacement.getLgEMPLACEMENTID());
            if (OTMouvement == null) {

                OTMouvement = this.initTMouvement(OTFamille, OTEmplacement);
            }

            OTMouvement.setIntNUMBERTRANSACTION(1 + OTMouvement.getIntNUMBERTRANSACTION());
            OTMouvement.setIntNUMBER(int_NUMBER + OTMouvement.getIntNUMBER());
            OTMouvement.setLgUSERID(OTUser);
            OTMouvement.setPKey(P_KEY);
            OTMouvement.setStrACTION(str_ACTION);
            OTMouvement.setStrTYPEACTION(str_TYPE_ACTION);
            OTMouvement.setDtUPDATED(new Date());

            this.persiste(OTMouvement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.createSnapshotMouvementArticle(OTFamille, int_NUMBER, str_TYPE_ACTION, OTEmplacement); // a decommenter
                                                                                                        // en cas de
                                                                                                        // probleme

            return OTMouvement;

        } catch (Exception e) {
            // e.printStackTrace();
            this.buildErrorTraceMessage("Impossible", e.getMessage());
            return null;
        }

    }

    public TMouvement SaveMouvementFamilleBis(TFamille OTFamille, String P_KEY, String str_TYPE_ACTION,
            String str_ACTION, Integer int_NUMBER, TEmplacement OTEmplacement) {
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
        // new logger().OCategory.info("Date_debut:" + Date_debut + "|Date_Fin:" + Date_Fin + "|dt_Date_Fin:" +
        // dt_Date_Fin + "|dt_Date_debut:" + dt_Date_debut);
        try {
            // new logger().OCategory.info("Produit " + OTFamille.getIntCIP() + ":" + OTFamille.getStrDESCRIPTION() +
            // "|int_NUMBER:" + int_NUMBER + "|str_ACTION:" + str_ACTION);
            TMouvement OTMouvement = this.getDalyTMouvement(OTFamille, P_KEY, str_ACTION, str_TYPE_ACTION,
                    dt_Date_debut, dt_Date_Fin);
            if (OTMouvement == null) {
                OTMouvement = this.initTMouvement(OTFamille, OTEmplacement);
            }

            OTMouvement.setIntNUMBERTRANSACTION(1 + OTMouvement.getIntNUMBERTRANSACTION());
            OTMouvement.setIntNUMBER(int_NUMBER + OTMouvement.getIntNUMBER());
            OTMouvement.setLgUSERID(this.getOTUser());
            OTMouvement.setPKey(P_KEY);
            OTMouvement.setStrACTION(str_ACTION);
            OTMouvement.setStrTYPEACTION(str_TYPE_ACTION);
            OTMouvement.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTMouvement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.createSnapshotMouvementArticle(OTFamille, int_NUMBER, this.getOTUser().getLgEMPLACEMENTID()); // a
                                                                                                               // decommenter
                                                                                                               // en cas
                                                                                                               // de
                                                                                                               // probleme
            return OTMouvement;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible", e.getMessage());
            return null;
        }

    }

    // fin enregistrement mouvement d'un article
    // recuperation d'un mouvement d'une famille
    public TMouvement getTMouvement(String P_KEY, String lg_FAMILLE_ID, String str_ACTION) {
        TMouvement OTMouvement = null;
        try {
            if (P_KEY.equalsIgnoreCase("") || P_KEY == null) {
                P_KEY = "%%";
            }
            OTMouvement = (TMouvement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvement t WHERE t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.strACTION LIKE ?8 AND t.pKey LIKE ?9 ORDER BY t.dtUPDATED DESC")
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(8, str_ACTION).setParameter(9, P_KEY).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvement;
    }
    // fin recuperation d'un mouvement d'une famille

    // suivi des mouvements d'articles
    public List<TMouvement> listTMouvement(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION) {

        List<TMouvement> lstTMouvement = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            // new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
            try {
                lstTMouvement = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TMouvement t WHERE (t.dtCREATED >= ?3 AND t.dtCREATED <= ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.strTYPEACTION LIKE ?5 AND t.strACTION LIKE ?7 AND t.pKey LIKE ?8 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?9 ORDER BY t.strTYPEACTION ASC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_USER_ID).setParameter(3, dtDEBUT)
                        .setParameter(4, dtFin).setParameter(5, str_TYPE_ACTION).setParameter(6, lg_FAMILLE_ID)
                        .setParameter(7, str_ACTION).setParameter(8, P_KEY)
                        .setParameter(9, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            } catch (Exception e) {
                e.printStackTrace();
                lstTMouvement = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TMouvement t WHERE (t.dtCREATED >= ?3 AND t.dtCREATED <= ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgUSERID.strFIRSTNAME LIKE ?1 OR t.lgUSERID.strLASTNAME LIKE ?1) AND t.lgUSERID.lgUSERID LIKE ?2 AND t.strTYPEACTION LIKE ?5 AND t.strACTION LIKE ?7 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?9 ORDER BY t.lgFAMILLEID.strNAME ASC")
                        .setParameter(1, "%" + search_value + "%").setParameter(2, lg_USER_ID).setParameter(3, dtDEBUT)
                        .setParameter(4, dtFin).setParameter(5, str_TYPE_ACTION).setParameter(6, lg_FAMILLE_ID)
                        .setParameter(7, str_ACTION)
                        .setParameter(9, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTMouvement taille " + lstTMouvement.size());
        return lstTMouvement;
    }

    public List<TFamille> listTMouvementBis(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION) {

        List<TFamille> lstTFamille = new ArrayList<>();
        List<TFamille> lstTFamilleFinal = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTFamille = new familleManagement(this.getOdataManager()).getListArticle(search_value, lg_FAMILLE_ID);

            for (TFamille OTFamille : lstTFamille) {
                List<TMouvement> lstTMouvement = new ArrayList<>();
                lstTMouvement = this.listTMouvement(OTFamille.getIntCIP(), dtDEBUT, dtFin, OTFamille.getLgFAMILLEID(),
                        "%%", "%%", "%%", "%%");
                if (lstTMouvement.size() > 0) {
                    new logger().OCategory.info("Famille " + OTFamille.getIntCIP());
                    new logger().OCategory
                            .info("Entrée " + this.getQauntityArticle(OTFamille.getStrDESCRIPTION(), dtDEBUT, dtFin,
                                    OTFamille.getLgFAMILLEID(), lg_USER_ID, P_KEY, commonparameter.ADD, str_ACTION));
                    lstTFamilleFinal.add(OTFamille);
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTFamilleFinal taille " + lstTFamilleFinal.size());
        return lstTFamilleFinal;
    }

    public List<TTypeStockFamille> listTMouvementBis(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID) { // ancienne bonne version de
                                                                                           // suivi mouvement article

        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        List<TTypeStockFamille> lstTTypeStockFamilleFinal = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTTypeStockFamille = new familleManagement(this.getOdataManager(), this.getOTUser())
                    .showAllOrOneArticleTypeStock(search_value, lg_FAMILLE_ID, lg_FAMILLEARTICLE_ID, lg_ZONE_GEO_ID,
                            lg_FABRIQUANT_ID, "%%");

            for (TTypeStockFamille OTTypeStockFamille : lstTTypeStockFamille) {
                List<TMouvement> lstTMouvement = new ArrayList<TMouvement>();
                lstTMouvement = this.listTMouvement(OTTypeStockFamille.getLgFAMILLEID().getIntCIP(), dtDEBUT, dtFin,
                        OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID(), "%%", "%%", "%%", "%%");
                if (lstTMouvement.size() > 0) {
                    // new logger().OCategory.info("Famille " + OTFamille.getIntCIP());
                    // new logger().OCategory.info("Entrée " + this.getQauntityArticle(OTFamille.getStrDESCRIPTION(),
                    // dtDEBUT, dtFin, OTFamille.getLgFAMILLEID(), lg_USER_ID, P_KEY, commonparameter.ADD, str_ACTION));
                    lstTTypeStockFamilleFinal.add(OTTypeStockFamille);
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTTypeStockFamilleFinal taille " + lstTTypeStockFamilleFinal.size());
        return lstTTypeStockFamilleFinal;
    }
    // fin suivi des mouvements d'articles

    // quantité d'entree ou sortie d'un article
    public int getQauntityArticle(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION) {
        int result = 0;
        List<TMouvement> lstTMouvement = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTMouvement = this.listTMouvement(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID, lg_USER_ID, P_KEY,
                    str_TYPE_ACTION, str_ACTION);
            for (TMouvement OTMouvement : lstTMouvement) {
                result += OTMouvement.getIntNUMBER();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    // fin quantité d'entree ou sortie d'un article
    // nombre de transaction d'entree ou sortie d'un article
    public int getNumberTransactionByArticle(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION) {
        int result = 0;
        List<TMouvement> lstTMouvement = new ArrayList<TMouvement>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTMouvement = this.listTMouvement(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID, lg_USER_ID, P_KEY,
                    str_TYPE_ACTION, str_ACTION);
            for (TMouvement OTMouvement : lstTMouvement) {
                result += OTMouvement.getIntNUMBERTRANSACTION();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTMouvement taille " + lstTMouvement.size());
        return result;
    }

    // fin nombre de transaction d'entree ou sortie d'un article
    // quantité stock du jour d'un article
    /*
     * public int getQauntityStockJourArticle(String search_value, Date dtDEBUT, Date dtFin, // a decommenter en cas de
     * probleme String lg_FAMILLE_ID, String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION) { int
     * result = 0; List<TMouvement> lstTMouvement = new ArrayList<TMouvement>();
     *
     * try { if (search_value.equalsIgnoreCase("") || search_value == null) { search_value = "%%"; } lstTMouvement =
     * this.listTMouvement(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID, lg_USER_ID, P_KEY, str_TYPE_ACTION, str_ACTION);
     * for (TMouvement OTMouvement : lstTMouvement) { new logger().OCategory.info("Stock jour:" +
     * OTMouvement.getIntSTOCKJOUR() + " Nombre transaction "+OTMouvement.getIntNUMBERTRANSACTION() +
     * " Nombre produit "+OTMouvement.getIntNUMBER()); result += OTMouvement.getIntSTOCKJOUR(); } } catch (Exception e)
     * { e.printStackTrace(); this.setMessage(commonparameter.PROCESS_FAILED); } new logger().OCategory.info("result:" +
     * result); return result; }
     */
    // fin quantité stock du jour d'un article
    // liste des ventes d'un article sur une peride
    public List<TPreenregistrementDetail> listTPreenregistrementDetail(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String lg_PREENREGISTREMENT_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.lgPREENREGISTREMENTID.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.lgPREENREGISTREMENTID.dtCREATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, commonparameter.statut_is_Closed)
                    .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrementDetail taille " + lstTPreenregistrementDetail.size());
        return lstTPreenregistrementDetail;
    }

    public List<TPreenregistrementDetail> listTPreenregistrementDetail(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String lg_PREENREGISTREMENT_ID, String lg_FABRIQUANT_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE ( FUNCTION('DATE',t.dtUPDATED)  >=  FUNCTION('DATE', ?3) AND  FUNCTION('DATE',t.dtUPDATED) <= FUNCTION('DATE', ?4) ) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?9 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?10 AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?11 ORDER BY t.dtUPDATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDEBUT, TemporalType.DATE).setParameter(4, dtFin, TemporalType.DATE)
                    .setParameter(5, lg_USER_ID).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, commonparameter.statut_is_Closed).setParameter(9, lg_FAMILLEARTICLE_ID)
                    .setParameter(10, lg_ZONE_GEO_ID)
                    .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrementDetail taille " + lstTPreenregistrementDetail.size());
        return lstTPreenregistrementDetail;
    }

    public List<TPreenregistrementDetail> listTPreenregistrementDetailAnnule(String search_value, Date dtDEBUT,
            Date dtFin, String lg_FAMILLE_ID, String lg_USER_ID, String lg_PREENREGISTREMENT_ID,
            String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.lgPREENREGISTREMENTID.dtUPDATED >= ?3 AND t.lgPREENREGISTREMENTID.dtUPDATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?9 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?10 AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?11 AND t.lgPREENREGISTREMENTID.intPRICE < 0 ORDER BY t.lgPREENREGISTREMENTID.dtUPDATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, commonparameter.statut_is_Closed)
                    .setParameter(9, lg_FAMILLEARTICLE_ID).setParameter(10, lg_ZONE_GEO_ID)
                    .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrementDetail taille " + lstTPreenregistrementDetail.size());
        return lstTPreenregistrementDetail;
    }

    public List<TPreenregistrementDetail> listTPreenregistrementDetailDirecte(String search_value, Date dtDEBUT,
            Date dtFin, String lg_FAMILLE_ID, String lg_USER_ID, String lg_PREENREGISTREMENT_ID,
            String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.lgPREENREGISTREMENTID.dtUPDATED >= ?3 AND t.lgPREENREGISTREMENTID.dtUPDATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?9 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?10 AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?11 AND t.lgPREENREGISTREMENTID.intPRICE > 0 ORDER BY t.lgPREENREGISTREMENTID.dtUPDATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, commonparameter.statut_is_Closed)
                    .setParameter(9, lg_FAMILLEARTICLE_ID).setParameter(10, lg_ZONE_GEO_ID)
                    .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrementDetail taille " + lstTPreenregistrementDetail.size());
        return lstTPreenregistrementDetail;
    }

    public List<TPreenregistrementDetail> listTPreenregistrementDetail(String search_value, Date dtDATE,
            String lg_FAMILLE_ID, String lg_USER_ID, String lg_PREENREGISTREMENT_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<TPreenregistrementDetail>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.dtCREATED < ?3) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1) AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 ORDER BY t.lgPREENREGISTREMENTID.dtCREATED DESC")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, lg_PREENREGISTREMENT_ID)
                    .setParameter(3, dtDATE).setParameter(5, lg_USER_ID).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, commonparameter.statut_is_Closed).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        // new logger().OCategory.info("lstTMouvement taille " + lstTMouvement.size());
        return lstTPreenregistrementDetail;
    }

    // fin liste des ventes d'un article sur une periode
    // quantité de vente d'un article
    public int getQauntityVenteByArticle(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID) {

        int result = 0;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.listTPreenregistrementDetail(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID,
                    lg_USER_ID, lg_PREENREGISTREMENT_ID);
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                result += OTPreenregistrementDetail.getIntQUANTITY();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    public int getQauntityVenteByArticle(String search_value, Date dtDATE, String lg_FAMILLE_ID, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID) {

        int result = 0;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTPreenregistrementDetail = this.listTPreenregistrementDetail(search_value, dtDATE, lg_FAMILLE_ID,
                    lg_USER_ID, lg_PREENREGISTREMENT_ID);
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                result += OTPreenregistrementDetail.getIntQUANTITY();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    public int getQauntityVenteByArticle(String search_value, String dtDEBUT, String dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID) {

        int result = 0;
        List<Object[]> lstTPreenregistrementDetail = new ArrayList<>();
        try {
            String qry = "";
            lstTPreenregistrementDetail = this.listTPreenregistrementDetail(search_value, dtDEBUT, dtFin, lg_FAMILLE_ID,
                    lg_USER_ID, lg_PREENREGISTREMENT_ID);
            for (Object[] OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                result += Integer.parseInt(OTPreenregistrementDetail[3].toString());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }
    // fin quantité de vente d'un article

    public List<Object[]> listTPreenregistrementDetail(String search_value, String dtDEBUT, String dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String lg_PREENREGISTREMENT_ID) {
        List<Object[]> lstTPreenregistrementDetail = new ArrayList<Object[]>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            String qry = "SELECT f.lg_FAMILLE_ID, f.`int_CIP`,f.`str_NAME`, SUM(t.int_QUANTITY) AS int_QUANTITY FROM t_preenregistrement_detail t, t_preenregistrement p, t_famille f, t_user u WHERE p.lg_PREENREGISTREMENT_ID = t.lg_PREENREGISTREMENT_ID AND t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND p.lg_USER_ID = u.lg_USER_ID "
                    + "AND (date(p.dt_UPDATED) >= '" + dtDEBUT + "' AND date(p.dt_UPDATED) <= '" + dtFin
                    + "') AND t.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' AND (f.str_DESCRIPTION LIKE '" + search_value
                    + "%' OR f.int_CIP LIKE '" + search_value + "%' OR f.int_EAN13 LIKE '" + search_value
                    + "%') AND p.lg_PREENREGISTREMENT_ID LIKE '" + lg_PREENREGISTREMENT_ID + "' "
                    + "AND p.lg_USER_ID LIKE '" + lg_USER_ID
                    + "' AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE`>0 AND p.`str_STATUT`='"
                    + commonparameter.statut_is_Closed + "' AND u.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' GROUP BY f.`lg_FAMILLE_ID` ORDER BY f.str_DESCRIPTION ASC";
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrementDetail taille " + lstTPreenregistrementDetail.size());
        return lstTPreenregistrementDetail;
    }

    // liste des mouvements snapshot d un article
    public List<TMouvementSnapshot> getlisteTMouvementSnapshot(String lg_FAMILLE_ID) {
        List<TMouvementSnapshot> lstTMouvementSnapshots = new ArrayList<>();
        try {
            lstTMouvementSnapshots = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTMouvementSnapshots taille " + lstTMouvementSnapshots.size());
        return lstTMouvementSnapshots;
    }
    // fin liste des mouvements snapshot d un article

    // initialisation du snap shot d'un article
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

    // fin initialisation du snap shot d'un article
    // creation ndu snap shot mouvement article
    // public TMouvementSnapshot createSnapshotMouvementArticleBis(TFamille OTFamille, int int_NUMBER) { // a
    // decommenter en cas de probleme
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
            this.persiste(OTMouvementSnapshot); // a decommenter en cas de probleme
            // this.getOdataManager().getEm().persist(OTMouvementSnapshot);
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

    // creation ndu snap shot mouvement article
    public TMouvementSnapshot createSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER, String str_ACTION,
            String str_TYPE_ACTION) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        int add_to_stock_debut = 0;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID());
            if (OTMouvementSnapshot == null) {
                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { // a revoir apres
                    /*
                     * int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016 add_to_stock_debut
                     * = int_NUMBER;
                     */

                    // code ajouté
                    if (!str_TYPE_ACTION.equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) {
                        int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016
                        add_to_stock_debut = int_NUMBER;
                    }
                    /*
                     * else { //a decommenter en cas de probleme 22/11/2016 add_to_stock_debut = int_NUMBER; }
                     */
                    // fin code ajouté
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
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
                    if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) {
                        int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() - int_NUMBER);
                }
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());

            this.merge(OTMouvementSnapshot);

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER, String str_ACTION,
            TEmplacement OTEmplacement) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement); //
            if (OTMouvementSnapshot == null) {
                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { // a revoir apres
                    int_NUMBER = (-1) * int_NUMBER;
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                    }
                }
                OTMouvementSnapshot = this.initSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), int_NUMBER,
                        OTEmplacement);
                // OTMouvementSnapshot = this.initSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), 0);
            } else {
                new logger().OCategory.info("Quantite ---- " + OTMouvementSnapshot.getIntSTOCKJOUR());
                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) {
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() - int_NUMBER);
                }
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());

            this.persiste(OTMouvementSnapshot);

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER,
            TEmplacement OTEmplacement) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement); //
            if (OTMouvementSnapshot == null) {
                /*
                 * if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { //a revoir apres int_NUMBER = (-1) *
                 * int_NUMBER; } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) { if (int_NUMBER < 0) {
                 * // cas de l'ajustement négatif ou une annulation de vente int_NUMBER = (-1) * int_NUMBER; } }
                 */
                OTMouvementSnapshot = this.initSnapshotMouvementArticleBis(OTFamille.getLgFAMILLEID(), int_NUMBER,
                        OTEmplacement);
                // OTMouvementSnapshot = this.initSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), 0);
            } else {
                new logger().OCategory.info("Quantite ---- " + OTMouvementSnapshot.getIntSTOCKJOUR());
                /*
                 * if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { // a decommenter en cas de probleme
                 * OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER); } else if
                 * (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) { if (int_NUMBER < 0) { // cas de l'ajustement
                 * négatif ou une annulation de vente int_NUMBER = (-1) * int_NUMBER; }
                 * OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() - int_NUMBER); }
                 */
                OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());

            this.merge(OTMouvementSnapshot);

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    // fin creation ndu snap shot mouvement article
    // recuperation du snap shot d'un article pour le jour en cours
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
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot getTMouvementSnapshotForCurrentDay(String lg_FAMILLE_ID, TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = "", Date_Fin = "";
        try {
            Date_debut = this.getKey().GetDateNowForSearch(0);
            Date_Fin = this.getKey().GetDateNowForSearch(1);
            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT = ?5 AND t.lgFAMILLEID.lgFAMILLEID = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?7")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, OTEmplacement.getLgEMPLACEMENTID());
            if (qry.getResultList().size() > 0) {
                OTMouvementSnapshot = (TMouvementSnapshot) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }
    // fin recuperation du snap shot d'un article pour le jour en cours

    // enregistrement du mouvement du prix d'un article
    public TMouvementprice SaveMouvementPrice(TFamille OTFamille, String str_ACTION, int int_PRICE, int int_PRICE_OLD,
            String str_REF) {
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        try {
            TMouvementprice OTMouvementprice = this.getDalyTMouvementprice(OTFamille, str_ACTION, dt_Date_debut,
                    dt_Date_Fin);
            if (OTMouvementprice == null) {
                OTMouvementprice = this.initTMouvementprice(OTFamille, str_REF, true);
            }

            OTMouvementprice.setLgUSERID(this.getOTUser());
            OTMouvementprice.setStrACTION(str_ACTION);
            OTMouvementprice.setDtUPDATED(new Date());
            OTMouvementprice.setIntPRICENEW(int_PRICE);
            OTMouvementprice.setIntPRICEOLD(int_PRICE_OLD);

            this.persiste(OTMouvementprice); // a decommenter en cas de probleme

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTMouvementprice;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible", e.getMessage());
            return null;
        }

    }

    public TMouvementprice SaveMouvementPriceBis(TFamille OTFamille, String str_ACTION, int int_PRICE,
            int int_PRICE_OLD, String str_REF) {
        String Date_debut = this.getKey().GetDateNowForSearch(0);
        String Date_Fin = this.getKey().GetDateNowForSearch(1);
        Date dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
        Date dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);

        try {
            TMouvementprice OTMouvementprice = this.getDalyTMouvementprice(OTFamille, str_ACTION, dt_Date_debut,
                    dt_Date_Fin);
            if (OTMouvementprice == null) {
                OTMouvementprice = this.initTMouvementprice(OTFamille, str_REF, false);
            }

            OTMouvementprice.setLgUSERID(this.getOTUser());
            OTMouvementprice.setStrACTION(str_ACTION);
            OTMouvementprice.setDtUPDATED(new Date());
            OTMouvementprice.setIntPRICENEW(int_PRICE);
            OTMouvementprice.setIntPRICEOLD(int_PRICE_OLD);
            this.getOdataManager().getEm().persist(OTMouvementprice);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTMouvementprice;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible", e.getMessage());
            return null;
        }

    }

    // fin enregistrement du mouvement du prix d'un article
    public TMouvementprice getDalyTMouvementprice(TFamille OTFamille, String str_ACTION, Date dt_Date_debut,
            Date dt_Date_Fin) {
        TMouvementprice OTMouvementprice = null;
        try {

            /*
             * OTMouvementprice = (TMouvementprice) this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TMouvementprice t WHERE (t.dtCREATED >= ?3  AND t.dtCREATED < ?4) AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.lgUSERID.lgUSERID LIKE ?7 AND t.strACTION LIKE ?8"
             * ). // a decommenter en cas de probleme setParameter(3, dt_Date_debut). setParameter(4, dt_Date_Fin).
             * setParameter(5, commonparameter.statut_enable). setParameter(6, OTFamille.getLgFAMILLEID()).
             * setParameter(7, this.getOTUser().getLgUSERID()). setParameter(8, str_ACTION). getSingleResult();
             */
            OTMouvementprice = (TMouvementprice) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementprice t WHERE (t.dtCREATED >= ?3  AND t.dtCREATED < ?4) AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.strACTION LIKE ?8")
                    . // a decommenter en cas de probleme
                    setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, OTFamille.getLgFAMILLEID())
                    .setParameter(8, str_ACTION).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTMouvementprice;
    }

    public TMouvementprice initTMouvementprice(TFamille OTFamille, String str_REF, boolean bis) {
        TMouvementprice OTMouvementprice = null;
        try {
            if (bis) {
                OTMouvementprice = createTMouvementprice(OTFamille, str_REF);
            } else {
                OTMouvementprice = createTMouvementpriceBis(OTFamille, str_REF);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementprice;
    }

    public TMouvementprice createTMouvementprice(TFamille OTFamille, String str_REF) {
        try {

            TMouvementprice OTMouvementprice = new TMouvementprice();
            OTMouvementprice.setLgMOUVEMENTPRICEID(this.getKey().getComplexId());
            OTMouvementprice.setIntPRICEOLD(0);
            OTMouvementprice.setIntPRICENEW(0);
            OTMouvementprice.setStrREF(str_REF);
            OTMouvementprice.setDtDAY(new Date());
            OTMouvementprice.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementprice.setLgFAMILLEID(OTFamille);
            OTMouvementprice.setLgUSERID(this.getOTUser());
            OTMouvementprice.setStrACTION("init");
            OTMouvementprice.setDtCREATED(new Date());
            // this.persiste(OTMouvementprice); // a decommenter en cas de probleme
            this.getOdataManager().getEm().persist(OTMouvementprice);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTMouvementprice;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le TMouvementprice  ", e.getMessage());
            return null;
        }
    }

    public TMouvementprice createTMouvementpriceBis(TFamille OTFamille, String str_REF) {
        try {

            TMouvementprice OTMouvementprice = new TMouvementprice();
            OTMouvementprice.setLgMOUVEMENTPRICEID(this.getKey().getComplexId());
            OTMouvementprice.setIntPRICEOLD(0);
            OTMouvementprice.setIntPRICENEW(0);
            OTMouvementprice.setStrREF(str_REF);
            OTMouvementprice.setDtDAY(new Date());
            OTMouvementprice.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementprice.setLgFAMILLEID(OTFamille);
            OTMouvementprice.setLgUSERID(this.getOTUser());
            OTMouvementprice.setStrACTION("init");
            OTMouvementprice.setDtCREATED(new Date());
            this.getOdataManager().getEm().persist(OTMouvementprice);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTMouvementprice;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de pris en compte de la modification du prix de vente dans le mouchard");
            return null;
        }
    }

    // derniere bonne liste de mouvement suivi article
    public List<EntityData> getMouvementSuiviArticle(String search_value, String dtDEBUT, String dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID, String lg_EMPLACEMENT_ID) {
        List<EntityData> lstEntityData = new ArrayList<>();
        List<EntityData> lstEntityDataFinal = new ArrayList<>();
        List<String> lstString = new ArrayList<>();
        EntityData OEntityData = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) { // a decommenter apres
             * pour le super admin lg_EMPLACEMENT_ID = "%%"; }
             */
            // String qry = "SELECT * FROM v_mouvement_suivi_article v WHERE (v.dt_DAY >= '" + dtDEBUT + "' AND v.dt_DAY
            // <= '" + dtFin + "') AND v.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID + "' AND v.lg_ZONE_GEO_ID
            // LIKE '" + lg_ZONE_GEO_ID + "' AND (v.lg_FABRIQUANT_ID LIKE '" + lg_FABRIQUANT_ID + "' OR
            // v.lg_FABRIQUANT_ID IS NULL) AND v.lg_ARTICLE_ID LIKE '" + lg_FAMILLE_ID + "' AND v.lg_USER_ID LIKE '" +
            // lg_USER_ID + "' AND v.lg_EMPLACEMENT_ID = '" + lg_EMPLACEMENT_ID + "' AND v.P_KEY LIKE '" + P_KEY + "'
            // AND v.str_TYPE_ACTION LIKE '" + str_TYPE_ACTION + "' AND v.str_ACTION LIKE '" + str_ACTION + "' AND
            // (v.int_CIP LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '" + search_value + "%' OR v.int_EAN13
            // LIKE '" + search_value + "%' OR v.str_CODE_ARTICLE LIKE '" + search_value + "%' OR v.str_CODE LIKE '" +
            // search_value + "%') GROUP BY v.dt_UPDATED, v.lg_ARTICLE_ID";
            String qry = "SELECT * FROM v_mouvement_suivi_article v WHERE (v.dt_DAY >= '" + dtDEBUT
                    + "' AND v.dt_DAY <= '" + dtFin + "') AND v.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID
                    + "' AND v.lg_ZONE_GEO_ID LIKE '" + lg_ZONE_GEO_ID + "' AND (v.lg_FABRIQUANT_ID LIKE '"
                    + lg_FABRIQUANT_ID + "' OR v.lg_FABRIQUANT_ID IS NULL) AND v.lg_ARTICLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND v.P_KEY LIKE '" + P_KEY + "' AND v.str_TYPE_ACTION LIKE '" + str_TYPE_ACTION
                    + "' AND v.str_ACTION LIKE '" + str_ACTION + "' AND (v.int_CIP LIKE '" + search_value
                    + "%' OR v.str_DESCRIPTION LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '" + search_value
                    + "%' OR v.str_CODE_ARTICLE LIKE '" + search_value + "%') GROUP BY v.dt_UPDATED, v.lg_ARTICLE_ID";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();

            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_ARTICLE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_EAN13"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_NUMBER_STOCK"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_NUMBER"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_TYPE_ACTION"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("str_ACTION"));
                lstEntityData.add(OEntityData);
            }
            for (int i = 0; i < lstEntityData.size(); i++) {
                if (lstString.size() == 0) {
                    OEntityData = new EntityData();
                    lstString.add(lstEntityData.get(0).getStr_value1());
                    // new logger().OCategory.info("chaine " + lstString.get(0));
                    OEntityData.setStr_value1(lstEntityData.get(i).getStr_value1());
                    OEntityData.setStr_value2(lstEntityData.get(i).getStr_value2());
                    OEntityData.setStr_value3(lstEntityData.get(i).getStr_value3());
                    OEntityData.setStr_value5(lstEntityData.get(i).getStr_value5());
                    OEntityData.setStr_value6(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_VENTE)));
                    OEntityData.setStr_value7(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_PERIME)));
                    OEntityData.setStr_value8(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_AJUSTEMENT)));
                    OEntityData.setStr_value9(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                    OEntityData.setStr_value10(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_ENTREESTOCK)));
                    OEntityData.setStr_value11(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                    OEntityData.setStr_value12(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_AJUSTEMENT)));
                    OEntityData.setStr_value13(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.OTHER, commonparameter.str_ACTION_INVENTAIRE)));
                    OEntityData.setStr_value14(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_RETOURFOURNISSEUR)));
                    lstEntityDataFinal.add(OEntityData);
                } else {

                    if (!lstString.get(0).equalsIgnoreCase(lstEntityData.get(i).getStr_value1())) {
                        // new logger().OCategory.info("i " + i + " valeur " + lstEntityData.get(i).getStr_value1());
                        // new logger().OCategory.info("chaine " + lstString.get(0));
                        lstString.clear();
                        OEntityData = new EntityData();
                        lstString.add(lstEntityData.get(i).getStr_value1());
                        OEntityData.setStr_value1(lstEntityData.get(i).getStr_value1());
                        OEntityData.setStr_value2(lstEntityData.get(i).getStr_value2());
                        OEntityData.setStr_value3(lstEntityData.get(i).getStr_value3());
                        OEntityData.setStr_value5(lstEntityData.get(i).getStr_value5());
                        OEntityData.setStr_value6(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_VENTE)));
                        OEntityData.setStr_value7(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_PERIME)));
                        OEntityData.setStr_value8(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_AJUSTEMENT)));
                        OEntityData.setStr_value9(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                        OEntityData.setStr_value10(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_ENTREESTOCK)));
                        OEntityData.setStr_value11(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                        OEntityData.setStr_value12(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_AJUSTEMENT)));
                        OEntityData.setStr_value13(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.OTHER, commonparameter.str_ACTION_INVENTAIRE)));
                        OEntityData.setStr_value14(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_RETOURFOURNISSEUR)));
                        lstEntityDataFinal.add(OEntityData);
                    }

                }
            }

            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstEntityDataFinal;
    }
    // cette fonction est à revoir pour une meilleure gestion du suivi mvt article

    public Integer getStock(String lgFAMILLE_ID, String lgEMPLACEMENT) {
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            cq.select(root.get(TFamilleStock_.intNUMBERAVAILABLE));
            cq.where(cb.and(cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lgFAMILLE_ID)),
                    cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEMPLACEMENT));
            Query q = em.createQuery(cq);
            q.setMaxResults(1);
            return (Integer) q.getSingleResult();

        } finally {

        }
    }

    public int getQauntityArticle(List<EntityData> lstEntityData, String lg_FAMILLE_ID, String str_TYPE_ACTION,
            String str_ACTION) {
        int result = 0;

        try {
            result = lstEntityData.stream()
                    .filter((entityData) -> (entityData.getStr_value1().equals(lg_FAMILLE_ID)
                            && entityData.getStr_value7().equals(str_TYPE_ACTION)
                            && entityData.getStr_value8().equals(str_ACTION)))
                    .map((entityData) -> Integer.parseInt(entityData.getStr_value6())).reduce(result, Integer::sum);
            /*
             * for (EntityData entityData : lstEntityData) {
             * System.out.println("entityData.getStr_value7()----------->>>> "+entityData.getStr_value7()
             * +" entityData.getStr_value8() "+entityData.getStr_value8());
             * if(entityData.getStr_value1().equals(lg_FAMILLE_ID) && entityData.getStr_value7().equals(str_TYPE_ACTION)
             * && entityData.getStr_value8().equals(str_ACTION)){
             * System.out.println("entityData.getStr_value6()--------------------------------------- "+entityData.
             * getStr_value6()+" str_TYPE_ACTION "+str_TYPE_ACTION+" str_ACTION "+str_ACTION); result+=
             * Integer.valueOf(entityData.getStr_value6()); } }
             */

        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("result str_ACTION:" + str_ACTION + "|str_TYPE_ACTION:" + str_TYPE_ACTION +
        // "|Quantité:" + result);
        return result;
    }

    // fin derniere bonne liste de mouvement suivi article
    // quantité d'entree ou sortie d'un article
    // add 203082017 by kobena
    public int getNumberTransaction(String lg_FAMILLE_ID, String dt_start, String dt_end) {
        int result = 0;
        try {
            CriteriaBuilder cb = this.getOdataManager().getEm().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> pr = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrement, TUser> pru = pr.join("lgUSERID", JoinType.INNER);
            Predicate criteria = cb.conjunction();

            criteria = cb.and(criteria, cb
                    .equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            criteria = cb.and(criteria, cb.equal(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                    "is_Closed"));
            criteria = cb.and(criteria, cb.equal(pru.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()));
            Predicate pu = cb.greaterThan(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0);

            Predicate btw = cb.between(
                    cb.function("DATE", Date.class,
                            root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                    .get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intFREEPACKNUMBER)));
            cq.where(criteria, cb.and(pu), cb.and(btw));
            Query q = this.getOdataManager().getEm().createQuery(cq);
            List<Object[]> oblist = q.getResultList();
            result = oblist.stream().mapToInt((value) -> {
                return Integer.valueOf((value[0] != null ? value[0].toString() : "0"))
                        + Integer.valueOf((value[1] != null ? value[1].toString() : "0"));
            }).sum();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    public int getNumberTransaction1(String lg_FAMILLE_ID, String dt_start, String dt_end) {
        int result = 0;

        try {
            /*
             * String query =
             * "SELECT SUM(p.`int_QUANTITY`)+SUM(p.`int_FREE_PACK_NUMBER`)  FROM `t_preenregistrement_detail` p ,`t_preenregistrement` r "
             * + "WHERE DATE(p.`dt_UPDATED`)>='" + dt_start + "' AND DATE(p.`dt_UPDATED`)<='" + dt_end + "' " +
             * "AND r.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` AND r.`int_PRICE`>0 AND  " +
             * "r.`str_STATUT`='is_Closed' AND (r.`lg_TYPE_VENTE_ID` <>'4' AND r.`lg_TYPE_VENTE_ID` <>'5') " +
             * "AND p.`lg_FAMILLE_ID`='" + lg_FAMILLE_ID + "'";
             */

            String query = "SELECT SUM(p.`int_QUANTITY`)+SUM( CASE WHEN (p.`int_FREE_PACK_NUMBER` IS NOT NULL) THEN p.`int_FREE_PACK_NUMBER` ELSE 0 END)  FROM `t_preenregistrement_detail` p ,`t_preenregistrement` r "
                    + "WHERE DATE(p.`dt_UPDATED`)>='" + dt_start + "' AND DATE(p.`dt_UPDATED`)<='" + dt_end + "' "
                    + "AND r.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` AND r.`int_PRICE`>0 AND  "
                    + "r.`str_STATUT`='is_Closed'  " + "AND p.`lg_FAMILLE_ID`='" + lg_FAMILLE_ID + "'";

            Object count = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

            result = Integer.valueOf(count + "");

        } catch (Exception e) {
            // e.printStackTrace();
        }
        // new logger().OCategory.info("result str_ACTION:" + str_ACTION + "|str_TYPE_ACTION:" + str_TYPE_ACTION +
        // "|Quantité:" + result);
        return result;
    }

    // fin quantité d'entree ou sortie d'un article
    // derniere bonne version de l'ajustement d'un produit
    public List<TAjustementDetail> listTAjustementDetail(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_AJUSTEMENT_ID, String lg_USER_ID, String str_TYPE_ACTION) {

        List<TAjustementDetail> lstTAjustementDetail = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.ADD)) {
                lstTAjustementDetail = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TAjustementDetail t WHERE (t.lgAJUSTEMENTID.dtUPDATED >= ?3 AND t.lgAJUSTEMENTID.dtUPDATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgAJUSTEMENTID.lgAJUSTEMENTID LIKE ?2 AND t.lgAJUSTEMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgAJUSTEMENTID.strSTATUT LIKE ?7 AND t.intNUMBER >= 0 AND t.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.lgAJUSTEMENTID.dtUPDATED DESC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_AJUSTEMENT_ID).setParameter(3, dtDEBUT)
                        .setParameter(4, dtFin).setParameter(5, lg_USER_ID).setParameter(6, lg_FAMILLE_ID)
                        .setParameter(7, commonparameter.statut_enable)
                        .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            } else if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
                lstTAjustementDetail = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TAjustementDetail t WHERE (t.lgAJUSTEMENTID.dtUPDATED >= ?3 AND t.lgAJUSTEMENTID.dtUPDATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgAJUSTEMENTID.lgAJUSTEMENTID LIKE ?2 AND t.lgAJUSTEMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgAJUSTEMENTID.strSTATUT LIKE ?7 AND t.intNUMBER < 0 AND t.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.lgAJUSTEMENTID.dtUPDATED DESC")
                        .setParameter(1, search_value + "%").setParameter(2, lg_AJUSTEMENT_ID).setParameter(3, dtDEBUT)
                        .setParameter(4, dtFin).setParameter(5, lg_USER_ID).setParameter(6, lg_FAMILLE_ID)
                        .setParameter(7, commonparameter.statut_enable)
                        .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTAjustementDetail taille " + lstTAjustementDetail.size());
        return lstTAjustementDetail;
    }
    // fin derniere bonne version de l'ajustement d'un produit

    // derniere bonne version de l'inventaire d'un produit
    public List<TInventaireFamille> listTInventaireFamille(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String lg_INVENTAIRE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID) {

        List<TInventaireFamille> lstTInventaireFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTInventaireFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TInventaireFamille t WHERE (t.lgINVENTAIREID.dtUPDATED >= ?3 AND t.lgINVENTAIREID.dtUPDATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?1 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?1 OR t.lgFAMILLEID.intEAN13 LIKE ?1) AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?2 AND t.lgINVENTAIREID.lgUSERID.lgUSERID LIKE ?5 AND t.lgINVENTAIREID.strSTATUT LIKE ?7 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?9 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?10 AND t.lgINVENTAIREID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?11 ORDER BY t.lgINVENTAIREID.dtUPDATED DESC")
                    .setParameter(1, search_value + "%").setParameter(2, lg_INVENTAIRE_ID).setParameter(3, dtDEBUT)
                    .setParameter(4, dtFin).setParameter(5, lg_USER_ID).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, commonparameter.statut_is_Closed).setParameter(9, lg_FAMILLEARTICLE_ID)
                    .setParameter(10, lg_ZONE_GEO_ID)
                    .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTInventaireFamille taille " + lstTInventaireFamille.size());
        return lstTInventaireFamille;
    }

    // fin derniere bonne version de l'inventaire d'un produit
    // derniere bon recapitulatif des mouvements d'un article
    public List<EntityData> getRecapMouvementSuiviByArticle(String search_value, String dtDEBUT, String dtFin,
            String lg_FAMILLE_ID) {
        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData = null;

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "SELECT * FROM v_recap_mouvement_article v WHERE (v.dt_DAY >= '" + dtDEBUT + "' AND v.dt_DAY
            // <= '" + dtFin + "') AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' AND (v.int_CIP LIKE '" +
            // search_value + "%' OR v.str_DESCRIPTION_ARTICLE LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '" +
            // search_value + "%') ORDER BY v.dt_DAY"; // a decommenter en cas de probleme 27/04/2016
            String qry = "SELECT `t`.`dt_DAY` AS `dt_DAY`,`t`.`int_STOCK_DEBUT` AS `int_STOCK_DEBUT`,`t`.`int_STOCK_JOUR` AS `int_STOCK_JOUR`,`t`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION_ARTICLE`,`f`.`int_CIP` AS `int_CIP`,`f`.`int_EAN13` AS `int_EAN13`,`f`.`int_PRICE` AS `int_PRICE`,`f`.`int_PAF` AS `int_PAF`,`f`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`f`.`lg_FAMILLEARTICLE_ID` AS `lg_FAMILLEARTICLE_ID`,`f`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID`, CONCAT(`f`.`int_CIP`,' ',`f`.`str_DESCRIPTION`) AS `CIP_ARTICLE`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_VENTE + "') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "') AND (`m`.`str_TYPE_ACTION` = '"
                    + commonparameter.REMOVE
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_VENTE`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_VENTE + "') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "') AND (`m`.`str_TYPE_ACTION` = '"
                    + commonparameter.ADD
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_ANNULEVENTE`,(SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'DECONDITIONNEMENT') AND (`m`.`str_TYPE_ACTION` = 'REMOVE') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_DECONDITIONNEMENT_OUT`,(SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_DECONDITIONNEMENT + "') AND (`m`.`str_TYPE_ACTION` = '"
                    + commonparameter.ADD + "') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_DECONDITIONNEMENT_IN`,(SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'RETOURFOURNISSEUR') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_RETOURFOURNISSEUR`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'PERIME') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_PERIME`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'AJUSTEMENT') AND (`m`.`str_TYPE_ACTION` = 'REMOVE') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_AJUSTEMENT_OUT`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'AJUSTEMENT') AND (`m`.`str_TYPE_ACTION` = 'ADD') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_AJUSTEMENT_IN`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'ENTREESTOCK') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_ENTREESTOCK`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'INVENTAIRE') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_INVENTAIRE` FROM (`t_mouvement_snapshot` `t` JOIN `t_famille` `f`) WHERE (`t`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID`) AND (`t`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "') AND (t.dt_DAY >= '" + dtDEBUT
                    + "' AND t.dt_DAY <= '" + dtFin + "') AND f.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value
                    + "%' OR f.int_EAN13 LIKE '" + search_value + "%') ORDER BY f.str_DESCRIPTION, t.dt_DAY";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();

            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("dt_DAY"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("int_STOCK_DEBUT"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("int_STOCK_JOUR"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_DESCRIPTION_ARTICLE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_PAF"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_NUMBER_VENTE"));
                // OEntityData.setStr_value9(this.getNumberTransaction(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"),
                // dtDEBUT, dtFin) + "");

                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("int_NUMBER_DECONDITIONNEMENT_OUT"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("int_NUMBER_DECONDITIONNEMENT_IN"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_NUMBER_RETOURFOURNISSEUR"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_NUMBER_PERIME"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("int_NUMBER_AJUSTEMENT_OUT"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("int_NUMBER_AJUSTEMENT_IN"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("int_NUMBER_ENTREESTOCK"));
                OEntityData.setStr_value17(Ojconnexion.get_resultat().getString("int_NUMBER_INVENTAIRE"));
                // OEntityData.setStr_value18(getQtyVenteAnnuler(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"),
                // dtDEBUT, dtFin) + "");
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("int_NUMBER_ANNULEVENTE"));
                lstEntityData.add(OEntityData);
            }

            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstEntityData;
    }

    public List<EntityData> getRecapMouvementSuiviByArticle(String search_value, String dtDEBUT, String dtFin,
            String lg_FAMILLE_ID, int start, int limit) {
        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData = null;

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            // String qry = "SELECT * FROM v_recap_mouvement_article v WHERE (v.dt_DAY >= '" + dtDEBUT + "' AND v.dt_DAY
            // <= '" + dtFin + "') AND v.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' AND (v.int_CIP LIKE '" +
            // search_value + "%' OR v.str_DESCRIPTION_ARTICLE LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '" +
            // search_value + "%') ORDER BY v.dt_DAY"; // a decommenter en cas de probleme 27/04/2016
            String qry = "SELECT `t`.`dt_DAY` AS `dt_DAY`,`t`.`int_STOCK_DEBUT` AS `int_STOCK_DEBUT`,`t`.`int_STOCK_JOUR` AS `int_STOCK_JOUR`,`t`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,`f`.`str_DESCRIPTION` AS `str_DESCRIPTION_ARTICLE`,`f`.`int_CIP` AS `int_CIP`,`f`.`int_EAN13` AS `int_EAN13`,`f`.`int_PRICE` AS `int_PRICE`,`f`.`int_PAF` AS `int_PAF`,`f`.`lg_GROSSISTE_ID` AS `lg_GROSSISTE_ID`,`f`.`lg_FAMILLEARTICLE_ID` AS `lg_FAMILLEARTICLE_ID`,`f`.`lg_ZONE_GEO_ID` AS `lg_ZONE_GEO_ID`, CONCAT(`f`.`int_CIP`,' ',`f`.`str_DESCRIPTION`) AS `CIP_ARTICLE`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_VENTE + "') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "') AND (`m`.`str_TYPE_ACTION` = '"
                    + commonparameter.REMOVE
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_VENTE`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_VENTE + "') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "') AND (`m`.`str_TYPE_ACTION` = '"
                    + commonparameter.ADD
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_ANNULEVENTE`,(SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_DECONDITIONNEMENT
                    + "') AND (`m`.`str_TYPE_ACTION` = 'REMOVE') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_DECONDITIONNEMENT_OUT`,(SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = '"
                    + commonparameter.str_ACTION_DECONDITIONNEMENT + "') AND (`m`.`str_TYPE_ACTION` = '"
                    + commonparameter.ADD + "') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_DECONDITIONNEMENT_IN`,(SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'RETOURFOURNISSEUR') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_RETOURFOURNISSEUR`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'PERIME') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_PERIME`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'AJUSTEMENT') AND (`m`.`str_TYPE_ACTION` = 'REMOVE') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_AJUSTEMENT_OUT`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'AJUSTEMENT') AND (`m`.`str_TYPE_ACTION` = 'ADD') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_AJUSTEMENT_IN`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'ENTREESTOCK') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_ENTREESTOCK`, (SELECT SUM(`m`.`int_NUMBER`) FROM `t_mouvement` `m` WHERE ((`t`.`dt_DAY` = `m`.`dt_DAY`) AND (`m`.`lg_FAMILLE_ID` = `t`.`lg_FAMILLE_ID`) AND (`m`.`str_ACTION` = 'INVENTAIRE') AND (`m`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "')) GROUP BY `m`.`lg_FAMILLE_ID`) AS `int_NUMBER_INVENTAIRE` FROM (`t_mouvement_snapshot` `t` JOIN `t_famille` `f`) WHERE (`t`.`lg_FAMILLE_ID` = `f`.`lg_FAMILLE_ID`) AND (`t`.`lg_EMPLACEMENT_ID` LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "') AND (t.dt_DAY >= '" + dtDEBUT
                    + "' AND t.dt_DAY <= '" + dtFin + "') AND f.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND (f.int_CIP LIKE '" + search_value + "%' OR f.str_DESCRIPTION LIKE '" + search_value
                    + "%' OR f.int_EAN13 LIKE '" + search_value + "%') ORDER BY f.str_DESCRIPTION, t.dt_DAY LIMIT "
                    + start + "," + limit;
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);

            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("dt_DAY"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("int_STOCK_DEBUT"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("int_STOCK_JOUR"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("str_DESCRIPTION_ARTICLE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_PRICE"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_PAF"));
                OEntityData.setStr_value9(getNumberTransaction(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"),
                        Ojconnexion.get_resultat().getString("dt_DAY")) + "");
                // OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_NUMBER_VENTE"));
                // OEntityData.setStr_value9(this.getNumberTransaction(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"),
                // dtDEBUT, dtFin) + "");
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("int_NUMBER_DECONDITIONNEMENT_OUT"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("int_NUMBER_DECONDITIONNEMENT_IN"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_NUMBER_RETOURFOURNISSEUR"));
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("int_NUMBER_PERIME"));
                OEntityData.setStr_value14(Ojconnexion.get_resultat().getString("int_NUMBER_AJUSTEMENT_OUT"));
                OEntityData.setStr_value15(Ojconnexion.get_resultat().getString("int_NUMBER_AJUSTEMENT_IN"));
                OEntityData.setStr_value16(Ojconnexion.get_resultat().getString("int_NUMBER_ENTREESTOCK"));
                // 28032018
                Integer int_NUMBER_INVENTAIRE = suiviMvtArticlesInventaire(
                        Ojconnexion.get_resultat().getString("dt_DAY"), Ojconnexion.get_resultat().getString("dt_DAY"),
                        Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value17(int_NUMBER_INVENTAIRE + "");
                // OEntityData.setStr_value18(getQtyVenteAnnuler(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"),
                // dtDEBUT, dtFin) + "");
                OEntityData.setStr_value18(Ojconnexion.get_resultat().getString("int_NUMBER_ANNULEVENTE"));

                lstEntityData.add(OEntityData);
            }

            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstEntityData;
    }

    // fin derniere bonne liste de mouvement suivi article
    /* insetion dans la table mouvement snapshot pour les retours depot */
    public TMouvementSnapshot createSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER, int int_STOCK_DEBUT,
            TEmplacement EmplacementId) {
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
            OTMouvementSnapshot.setLgEMPLACEMENTID(EmplacementId);
            // this.persiste(OTMouvementSnapshot); //a decommenter en cas de probleme
            this.getOdataManager().getEm().persist(OTMouvementSnapshot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    /* fin retout depot 26/01/2017 */
    /* ajoute le 31/03/2017 pour l'anomalie ajustement */
    public TMouvementSnapshot initSnapshotMouvementArticleAjustement(String lg_FAMILLE_ID, int int_NUMBER,
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
                        OTTypeStockFamille.getIntNUMBER(), OTTypeStockFamille.getIntNUMBER() - int_NUMBER,
                        OTEmplacement);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot initSnapshotMouvementArticleAjustement(TFamille famille, int int_NUMBER, int stockDebut,
            TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;

        try {

            OTMouvementSnapshot = createSnapshotMouvementArticleBis(famille, int_NUMBER, stockDebut, OTEmplacement);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleAjustement(TFamille OTFamille, int int_NUMBER,
            String str_ACTION, TEmplacement OTEmplacement) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement); //
            if (OTMouvementSnapshot == null) {

                OTMouvementSnapshot = this.initSnapshotMouvementArticleAjustement(OTFamille.getLgFAMILLEID(),
                        int_NUMBER, OTEmplacement);

            } else {
                new logger().OCategory.info("Quantite ---- " + OTMouvementSnapshot.getIntSTOCKJOUR());

                OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);

            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());

            this.persiste(OTMouvementSnapshot);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    /* fin code du 31/03/2017 */
    /* fonction pr recupperer la quantite des ventes annulees 20062017 */
    private int getQtyVenteAnnuler(String ID, String dt_start, String dt_end) {
        int count = 0;
        TPreenregistrementDetail b;

        try {
            Object _count = this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intQUANTITY) FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.bISCANCEL=TRUE AND o.intQUANTITY > 0 AND o.lgPREENREGISTREMENTID.intPRICE > 0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.lgFAMILLEID.lgFAMILLEID =?1 AND o.lgPREENREGISTREMENTID.lgTYPEVENTEID.lgTYPEVENTEID <> 4 AND o.lgPREENREGISTREMENTID.lgTYPEVENTEID.lgTYPEVENTEID <> 5 AND FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED) >= FUNCTION('DATE', ?2)  AND FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED) <= FUNCTION('DATE', ?3)")
                    .setParameter(1, ID).setParameter(2, java.sql.Date.valueOf(dt_start))
                    .setParameter(3, java.sql.Date.valueOf(dt_end)).getSingleResult();
            if (_count != null) {
                count = new Integer(_count + "");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return (count > 0 ? count * (-1) : 0);
    }

    public TMouvementSnapshot createDepotSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER, String str_ACTION,
            TEmplacement OTEmplacement) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {

            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement);
            boolean isOfficine = false;
            if (OTMouvementSnapshot == null) {
                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { // a revoir apres
                    int_NUMBER = (-1) * int_NUMBER;
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                    }
                    isOfficine = true;
                }
                OTMouvementSnapshot = this.initDepotSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), int_NUMBER,
                        OTEmplacement, isOfficine);

            } else {

                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) {
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
                    if (int_NUMBER < 0) { // cas de l'ajustement négatif ou une annulation de vente
                        int_NUMBER = (-1) * int_NUMBER;
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() - int_NUMBER);
                }
                OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            }

            OTMouvementSnapshot.setDtUPDATED(new Date());

            this.merge(OTMouvementSnapshot);

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createDepotSnapshotMouvementArticle(TFamille OTFamille, int int_NUMBER,
            int int_STOCK_DEBUT, TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        Date d = new Date();
        try {

            OTMouvementSnapshot = new TMouvementSnapshot();
            OTMouvementSnapshot.setLgMOUVEMENTSNAPSHOTID(this.getKey().getComplexId());
            OTMouvementSnapshot.setLgFAMILLEID(OTFamille);
            OTMouvementSnapshot.setDtDAY(d);
            OTMouvementSnapshot.setDtCREATED(d);
            OTMouvementSnapshot.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(1);
            OTMouvementSnapshot.setIntSTOCKJOUR(int_NUMBER);
            OTMouvementSnapshot.setIntSTOCKDEBUT(int_STOCK_DEBUT);
            OTMouvementSnapshot.setLgEMPLACEMENTID(OTEmplacement);
            new logger().OCategory.info("Emplacement " + OTEmplacement.getStrDESCRIPTION());
            this.getOdataManager().getEm().persist(OTMouvementSnapshot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot initDepotSnapshotMouvementArticle(String lg_FAMILLE_ID, int int_NUMBER,
            TEmplacement OTEmplacement, boolean isOfficine) {
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

                if (isOfficine) {
                    int finatQty = OTTypeStockFamille.getIntNUMBER() - int_NUMBER;

                    OTMouvementSnapshot = createDepotSnapshotMouvementArticle(OTTypeStockFamille.getLgFAMILLEID(),
                            finatQty, OTTypeStockFamille.getIntNUMBER(), OTEmplacement);
                } else {
                    OTMouvementSnapshot = createDepotSnapshotMouvementArticle(OTTypeStockFamille.getLgFAMILLEID(),
                            OTTypeStockFamille.getIntNUMBER(), OTTypeStockFamille.getIntNUMBER() + int_NUMBER,
                            OTEmplacement);
                    OTMouvementSnapshot.setStrSTATUT("disable");
                    this.merge(OTMouvementSnapshot);
                    System.out.println("****************-> disable ");
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleBack(TFamille OTFamille, int int_NUMBER, String str_ACTION,
            String str_TYPE_ACTION) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        int add_to_stock_debut = 0;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID());
            if (OTMouvementSnapshot == null) {
                if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { // a revoir apres
                    /*
                     * int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016 add_to_stock_debut
                     * = int_NUMBER;
                     */

                    // code ajouté
                    if (!str_TYPE_ACTION.equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) {
                        int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016
                        add_to_stock_debut = int_NUMBER;
                    }
                    /*
                     * else { //a decommenter en cas de probleme 22/11/2016 add_to_stock_debut = int_NUMBER; }
                     */
                    // fin code ajouté
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
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
                    if (str_TYPE_ACTION.equalsIgnoreCase(commonparameter.str_ACTION_VENTE)) {
                        int_NUMBER = (-1) * int_NUMBER; // a decommenter en cas de probleme 07/11/2016
                    }
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
                } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) {
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
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public int getNumberTransaction(String lg_FAMILLE_ID, String dt_start) {
        int result = 0;
        try {
            CriteriaBuilder cb = this.getOdataManager().getEm().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> pr = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrement, TUser> pru = pr.join("lgUSERID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb
                    .equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            criteria = cb.and(criteria, cb.equal(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                    "is_Closed"));
            criteria = cb.and(criteria, cb.equal(pru.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()));
            Predicate pu = cb.greaterThan(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.equal(cb.function("DATE", Date.class,
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start));
            cq.multiselect(cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intFREEPACKNUMBER)));
            cq.where(criteria, cb.and(pu), cb.and(btw));
            Query q = this.getOdataManager().getEm().createQuery(cq);
            List<Object[]> oblist = q.getResultList();
            result = oblist.stream().mapToInt((value) -> {
                return Integer.valueOf((value[0] != null ? value[0].toString() : "0"))
                        + Integer.valueOf((value[1] != null ? value[1].toString() : "0"));
            }).sum();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleBon(TFamille OTFamille, int int_NUMBER,
            TEmplacement OTEmplacement) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement); //
            if (OTMouvementSnapshot == null) {
                /*
                 * if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { //a revoir apres int_NUMBER = (-1) *
                 * int_NUMBER; } else if (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) { if (int_NUMBER < 0) {
                 * // cas de l'ajustement négatif ou une annulation de vente int_NUMBER = (-1) * int_NUMBER; } }
                 */
                OTMouvementSnapshot = this.initSnapshotMouvement(OTFamille.getLgFAMILLEID(), int_NUMBER, OTEmplacement);
                // OTMouvementSnapshot = this.initSnapshotMouvementArticle(OTFamille.getLgFAMILLEID(), 0);
            } else {
                new logger().OCategory.info("Quantite ---- " + OTMouvementSnapshot.getIntSTOCKJOUR());
                /*
                 * if (str_ACTION.equalsIgnoreCase(commonparameter.ADD)) { // a decommenter en cas de probleme
                 * OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER); } else if
                 * (str_ACTION.equalsIgnoreCase(commonparameter.REMOVE)) { if (int_NUMBER < 0) { // cas de l'ajustement
                 * négatif ou une annulation de vente int_NUMBER = (-1) * int_NUMBER; }
                 * OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() - int_NUMBER); }
                 */
                OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTMouvementSnapshot);

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot initSnapshotMouvement(String lg_FAMILLE_ID, int int_NUMBER, TEmplacement OTEmplacement) {
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
                OTMouvementSnapshot = createSnapshotMouvement(OTTypeStockFamille.getLgFAMILLEID(),
                        OTTypeStockFamille.getIntNUMBER() + int_NUMBER, OTTypeStockFamille.getIntNUMBER(),
                        OTEmplacement);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvement(TFamille OTFamille, int int_NUMBER, int int_STOCK_DEBUT,
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
            this.getOdataManager().getEm().persist(OTMouvementSnapshot);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    public List<EntityData> getMouvementSuiviArticle(String search_value, String dtDEBUT, String dtFin,
            String lg_FAMILLE_ID, String lg_USER_ID, String P_KEY, String str_TYPE_ACTION, String str_ACTION,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID, String lg_EMPLACEMENT_ID,
            int start, int limit) {
        List<EntityData> lstEntityData = new ArrayList<>();
        List<EntityData> lstEntityDataFinal = new ArrayList<>();
        List<String> lstString = new ArrayList<>();
        EntityData OEntityData = null;
        // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) { // a decommenter apres
             * pour le super admin lg_EMPLACEMENT_ID = "%%"; }
             */
            // String qry = "SELECT * FROM v_mouvement_suivi_article v WHERE (v.dt_DAY >= '" + dtDEBUT + "' AND v.dt_DAY
            // <= '" + dtFin + "') AND v.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID + "' AND v.lg_ZONE_GEO_ID
            // LIKE '" + lg_ZONE_GEO_ID + "' AND (v.lg_FABRIQUANT_ID LIKE '" + lg_FABRIQUANT_ID + "' OR
            // v.lg_FABRIQUANT_ID IS NULL) AND v.lg_ARTICLE_ID LIKE '" + lg_FAMILLE_ID + "' AND v.lg_USER_ID LIKE '" +
            // lg_USER_ID + "' AND v.lg_EMPLACEMENT_ID = '" + lg_EMPLACEMENT_ID + "' AND v.P_KEY LIKE '" + P_KEY + "'
            // AND v.str_TYPE_ACTION LIKE '" + str_TYPE_ACTION + "' AND v.str_ACTION LIKE '" + str_ACTION + "' AND
            // (v.int_CIP LIKE '" + search_value + "%' OR v.str_DESCRIPTION LIKE '" + search_value + "%' OR v.int_EAN13
            // LIKE '" + search_value + "%' OR v.str_CODE_ARTICLE LIKE '" + search_value + "%' OR v.str_CODE LIKE '" +
            // search_value + "%') GROUP BY v.dt_UPDATED, v.lg_ARTICLE_ID";
            String qry = "SELECT * FROM v_mouvement_suivi_article v WHERE (v.dt_DAY >= '" + dtDEBUT
                    + "' AND v.dt_DAY <= '" + dtFin + "') AND v.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID
                    + "' AND v.lg_ZONE_GEO_ID LIKE '" + lg_ZONE_GEO_ID + "' AND (v.lg_FABRIQUANT_ID LIKE '"
                    + lg_FABRIQUANT_ID + "' OR v.lg_FABRIQUANT_ID IS NULL) AND v.lg_ARTICLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND v.lg_USER_ID LIKE '" + lg_USER_ID + "' AND v.lg_EMPLACEMENT_ID LIKE '" + lg_EMPLACEMENT_ID
                    + "' AND v.P_KEY LIKE '" + P_KEY + "' AND v.str_TYPE_ACTION LIKE '" + str_TYPE_ACTION
                    + "' AND v.str_ACTION LIKE '" + str_ACTION + "' AND (v.int_CIP LIKE '" + search_value
                    + "%' OR v.str_DESCRIPTION LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '" + search_value
                    + "%' OR v.str_CODE_ARTICLE LIKE '" + search_value + "%') GROUP BY v.dt_UPDATED, v.lg_ARTICLE_ID ";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            ResultSet rs = Ojconnexion.get_resultat();

            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_ARTICLE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_EAN13"));

                OEntityData.setStr_value5(
                        getStock(Ojconnexion.get_resultat().getString("lg_ARTICLE_ID"), lg_EMPLACEMENT_ID) + "");
                // OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_NUMBER_STOCK"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_NUMBER"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_TYPE_ACTION"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("str_ACTION"));
                // OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("dt_DAY"));
                lstEntityData.add(OEntityData);
            }
            for (int i = 0; i < lstEntityData.size(); i++) {
                if (lstString.size() == 0) {
                    OEntityData = new EntityData();
                    lstString.add(lstEntityData.get(0).getStr_value1());
                    // new logger().OCategory.info("chaine " + lstString.get(0));
                    OEntityData.setStr_value1(lstEntityData.get(i).getStr_value1());
                    OEntityData.setStr_value2(lstEntityData.get(i).getStr_value2());
                    OEntityData.setStr_value3(lstEntityData.get(i).getStr_value3());
                    OEntityData.setStr_value5(lstEntityData.get(i).getStr_value5());
                    // getNumberTransaction
                    OEntityData.setStr_value6(String
                            .valueOf(this.getNumberTransaction(lstEntityData.get(i).getStr_value1(), dtDEBUT, dtFin)));
                    // OEntityData.setStr_value6(String.valueOf(this.getQauntityArticle(lstEntityData,
                    // lstEntityData.get(i).getStr_value1(), commonparameter.REMOVE,
                    // commonparameter.str_ACTION_VENTE)));
                    OEntityData.setStr_value7(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_PERIME)));
                    OEntityData.setStr_value8(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_AJUSTEMENT)));
                    OEntityData.setStr_value9(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                    OEntityData.setStr_value10(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_ENTREESTOCK)));
                    OEntityData.setStr_value11(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                    OEntityData.setStr_value12(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_AJUSTEMENT)));
                    OEntityData.setStr_value13(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.OTHER, commonparameter.str_ACTION_INVENTAIRE)));
                    OEntityData.setStr_value14(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.REMOVE, commonparameter.str_ACTION_RETOURFOURNISSEUR)));
                    OEntityData.setStr_value15(
                            String.valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                    commonparameter.ADD, commonparameter.str_ACTION_VENTE)));

                    lstEntityDataFinal.add(OEntityData);
                } else {

                    if (!lstString.get(0).equalsIgnoreCase(lstEntityData.get(i).getStr_value1())) {
                        // new logger().OCategory.info("i " + i + " valeur " + lstEntityData.get(i).getStr_value1());
                        // new logger().OCategory.info("chaine " + lstString.get(0));
                        lstString.clear();
                        OEntityData = new EntityData();
                        lstString.add(lstEntityData.get(i).getStr_value1());
                        OEntityData.setStr_value1(lstEntityData.get(i).getStr_value1());
                        OEntityData.setStr_value2(lstEntityData.get(i).getStr_value2());
                        OEntityData.setStr_value3(lstEntityData.get(i).getStr_value3());
                        OEntityData.setStr_value5(lstEntityData.get(i).getStr_value5());
                        OEntityData.setStr_value6(String.valueOf(
                                this.getNumberTransaction(lstEntityData.get(i).getStr_value1(), dtDEBUT, dtFin)));
                        OEntityData.setStr_value7(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_PERIME)));
                        OEntityData.setStr_value8(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_AJUSTEMENT)));
                        OEntityData.setStr_value9(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                        OEntityData.setStr_value10(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_ENTREESTOCK)));
                        OEntityData.setStr_value11(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_DECONDITIONNEMENT)));
                        OEntityData.setStr_value12(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_AJUSTEMENT)));
                        OEntityData.setStr_value13(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.OTHER, commonparameter.str_ACTION_INVENTAIRE)));
                        OEntityData.setStr_value14(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.REMOVE, commonparameter.str_ACTION_RETOURFOURNISSEUR)));
                        OEntityData.setStr_value15(String
                                .valueOf(this.getQauntityArticle(lstEntityData, lstEntityData.get(i).getStr_value1(),
                                        commonparameter.ADD, commonparameter.str_ACTION_VENTE)));

                        lstEntityDataFinal.add(OEntityData);
                    }

                }
            }

            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstEntityDataFinal;
    }

    public JSONArray suiviMvt(boolean all, String search_value, String dtDEBUT, String dtFin, String lg_FAMILLE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, int start, int limit) {
        JSONArray data = new JSONArray();
        try {
            String emp = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TMouvement> root = cq.from(TMouvement.class);
            Join<TMouvement, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TMouvement, TEmplacement> je = root.join("lgEMPLACEMENTID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection");
            Predicate predicate = cb.conjunction();
            if (!"".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> fa = jf.join("lgFAMILLEARTICLEID", JoinType.INNER);
                predicate = cb.and(predicate,
                        cb.equal(fa.get(TFamillearticle_.lgFAMILLEARTICLEID), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> fz = jf.join("lgZONEGEOID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(fz.get(TZoneGeographique_.lgZONEGEOID), lg_ZONE_GEO_ID));
            }
            if (!"".equals(lg_FAMILLE_ID)) {
                predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            }

            if (!"".equals(search_value)) {
                Join<TFamille, TFamilleGrossiste> fg = jf.joinCollection("tFamilleGrossisteCollection");
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%")));

            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TMouvement_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicate = cb.and(predicate, btw);
            predicate = cb.and(predicate, cb.equal(root.get(TMouvement_.strSTATUT), commonparameter.statut_enable));
            predicate = cb.and(predicate, cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));

            predicate = cb.and(predicate, cb.equal(je.get(TEmplacement_.lgEMPLACEMENTID), emp));
            cq.multiselect(jf.get(TFamille_.lgFAMILLEID), jf.get(TFamille_.intCIP), jf.get(TFamille_.strDESCRIPTION),
                    st.get(TFamilleStock_.intNUMBERAVAILABLE)).groupBy(jf.get(TFamille_.lgFAMILLEID))
                    .orderBy(cb.asc(root.get(TMouvement_.dtDAY)));

            cq.where(predicate);

            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Object[]> list = q.getResultList();
            list.forEach((t) -> {
                try {
                    JSONObject json = new JSONObject();
                    json.put("lg_FAMILLE_ID", t[0]);
                    json.put("int_CIP", t[1]);
                    json.put("str_NAME", t[2]);
                    json.put("int_TAUX_MARQUE", Integer.valueOf(t[3] + ""));
                    json.put("int_STOCK", Integer.valueOf(t[3] + ""));

                    json.put("int_NUMBER_VENTE", this.getNumberTransaction(t[0] + "", dtDEBUT, dtFin));
                    Integer int_NUMBER_RETOUR = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_RETOURFOURNISSEUR, commonparameter.REMOVE);
                    json.put("int_NUMBER_RETOUR", (int_NUMBER_RETOUR != null ? int_NUMBER_RETOUR : 0));
                    Integer int_NUMBER_AJUSTEMENT_IN = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_AJUSTEMENT, commonparameter.ADD);
                    json.put("int_NUMBER_AJUSTEMENT_IN",
                            (int_NUMBER_AJUSTEMENT_IN != null ? int_NUMBER_AJUSTEMENT_IN : 0));
                    Integer int_NUMBER_AJUSTEMENT_OUT = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_AJUSTEMENT, commonparameter.REMOVE);
                    json.put("int_NUMBER_AJUSTEMENT_OUT",
                            (int_NUMBER_AJUSTEMENT_OUT != null ? int_NUMBER_AJUSTEMENT_OUT : 0));
                    Integer int_NUMBER_DECONDITIONNEMENT_IN = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_DECONDITIONNEMENT, commonparameter.ADD);
                    json.put("int_NUMBER_DECONDITIONNEMENT_IN",
                            (int_NUMBER_DECONDITIONNEMENT_IN != null ? int_NUMBER_DECONDITIONNEMENT_IN : 0));
                    Integer int_NUMBER_DECONDITIONNEMENT_OUT = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_DECONDITIONNEMENT, commonparameter.REMOVE);
                    json.put("int_NUMBER_DECONDITIONNEMENT_OUT",
                            (int_NUMBER_DECONDITIONNEMENT_OUT != null ? int_NUMBER_DECONDITIONNEMENT_OUT : 0));
                    Integer int_NUMBER_PERIME = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_PERIME, commonparameter.REMOVE);
                    json.put("int_NUMBER_PERIME", (int_NUMBER_PERIME != null ? int_NUMBER_PERIME : 0));
                    Integer int_NUMBER_BON = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_ENTREESTOCK, commonparameter.ADD);
                    json.put("int_NUMBER_BON", (int_NUMBER_BON != null ? int_NUMBER_BON : 0));
                    Integer int_NUMBER_INVENTAIRE = suiviMvtArticlesInventaire(dtDEBUT, dtFin, t[0] + "");
                    json.put("int_NUMBER_INVENTAIRE", (int_NUMBER_INVENTAIRE != null ? int_NUMBER_INVENTAIRE : 0));
                    Integer str_ACTION_VENTE = suiviMvtArticles(dtDEBUT, dtFin, t[0] + "",
                            commonparameter.str_ACTION_VENTE, commonparameter.ADD);
                    json.put("int_NUMBER_ANNULEVENTE", (str_ACTION_VENTE != null ? str_ACTION_VENTE : 0));

                    data.put(json);
                } catch (JSONException ex) {
                    Logger.getLogger(SnapshotManager.class.getName()).log(Level.SEVERE, null, ex);
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
        return data;

    }

    public Integer suiviMvtArticles(String dtDEBUT, String dtFin, String lg_FAMILLE_ID, String action,
            String typeACTION) {
        try {
            String emp = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TMouvement> root = cq.from(TMouvement.class);
            Join<TMouvement, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TMouvement, TEmplacement> je = root.join("lgEMPLACEMENTID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TMouvement_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicate = cb.and(predicate, btw);
            predicate = cb.and(predicate, cb.equal(root.get(TMouvement_.strSTATUT), commonparameter.statut_enable));
            predicate = cb.and(predicate, cb.equal(root.get(TMouvement_.strACTION), action));
            predicate = cb.and(predicate, cb.equal(root.get(TMouvement_.strTYPEACTION), typeACTION));
            predicate = cb.and(predicate, cb.equal(je.get(TEmplacement_.lgEMPLACEMENTID), emp));
            cq.select(cb.sum(root.get(TMouvement_.intNUMBER)));

            cq.where(predicate);

            Query q = em.createQuery(cq);

            return (Integer) q.getSingleResult();

        } finally {

        }

    }

    public int suiviMvtCount(String search_value, String dtDEBUT, String dtFin, String lg_FAMILLE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {
        EntityManager em = this.getOdataManager().getEm();
        JSONObject ob = new JSONObject();
        try {
            String emp = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TMouvement> root = cq.from(TMouvement.class);
            Join<TMouvement, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TMouvement, TEmplacement> je = root.join("lgEMPLACEMENTID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection");
            Predicate predicate = cb.conjunction();
            if (!"".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> fa = jf.join("lgFAMILLEARTICLEID", JoinType.INNER);
                predicate = cb.and(predicate,
                        cb.equal(fa.get(TFamillearticle_.lgFAMILLEARTICLEID), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> fz = jf.join("lgZONEGEOID", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(fz.get(TZoneGeographique_.lgZONEGEOID), lg_ZONE_GEO_ID));
            }
            if (!"".equals(lg_FAMILLE_ID)) {
                predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            }

            if (!"".equals(search_value)) {
                Join<TFamille, TFamilleGrossiste> fg = jf.joinCollection("tFamilleGrossisteCollection");
                predicate = cb.and(predicate,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%")));

            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TMouvement_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicate = cb.and(predicate, btw);
            predicate = cb.and(predicate, cb.equal(root.get(TMouvement_.strSTATUT), commonparameter.statut_enable));
            predicate = cb.and(predicate, cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));

            predicate = cb.and(predicate, cb.equal(je.get(TEmplacement_.lgEMPLACEMENTID), emp));
            cq.multiselect(cb.countDistinct(jf.get(TFamille_.lgFAMILLEID))).groupBy(jf.get(TFamille_.lgFAMILLEID));

            cq.where(predicate);

            Query q = em.createQuery(cq);

            return q.getResultList().size();

        } finally {
            if (em != null) {

            }
        }

    }

    public TMouvementSnapshot createSnapshotMouvementArticleBons(TFamille OTFamille, int int_NUMBER,
            TEmplacement OTEmplacement, TFamilleStock stock) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement); //
            if (OTMouvementSnapshot == null) {

                OTMouvementSnapshot = this.initSnapshotMouvement(OTFamille.getLgFAMILLEID(), int_NUMBER, OTEmplacement,
                        stock);

            } else {

                OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTMouvementSnapshot);

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot initSnapshotMouvement(String lg_FAMILLE_ID, int int_NUMBER, TEmplacement OTEmplacement,
            TFamilleStock stock) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        String lg_TYPE_STOCK_ID = "1";
        try {
            if (!OTEmplacement.getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                lg_TYPE_STOCK_ID = "3";
            }

            OTMouvementSnapshot = createSnapshotMouvement(stock.getLgFAMILLEID(),
                    stock.getIntNUMBERAVAILABLE() + int_NUMBER, stock.getIntNUMBERAVAILABLE(), OTEmplacement);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public Integer suiviMvtArticlesInventaire(String dtDEBUT, String dtFin, String lg_FAMILLE_ID) {

        try {

            String emp = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jf = root.join("lgINVENTAIREID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lg_FAMILLE_ID));
            Predicate btw = cb.between(cb.function("DATE", Date.class, jf.get(TInventaire_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicate = cb.and(predicate, btw);
            predicate = cb.and(predicate, cb.equal(jf.get(TInventaire_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lg_FAMILLE_ID));
            predicate = cb.and(predicate, cb.equal(jf.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            cq.select(cb.sum(root.get(TInventaireFamille_.intNUMBER)));// root.get(TInventaireFamille_.intNUMBER)
            cq.where(predicate);
            Query q = em.createQuery(cq);

            Integer count = (Integer) q.getSingleResult();
            if (count == null) {
                return 0;
            }
            return count;
        } finally {

        }

    }

    public JSONArray suiviMvtArticleInventaire(String dtDEBUT, String dtFin, String lg_FAMILLE_ID) {
        JSONArray array = new JSONArray();

        try {
            String emp = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TInventaireFamille> cq = cb.createQuery(TInventaireFamille.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jf = root.join("lgINVENTAIREID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lg_FAMILLE_ID));
            Predicate btw = cb.between(cb.function("DATE", Date.class, jf.get(TInventaire_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicate = cb.and(predicate, btw);
            predicate = cb.and(predicate, cb.equal(jf.get(TInventaire_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lg_FAMILLE_ID));
            predicate = cb.and(predicate,
                    cb.equal(root.get("lgINVENTAIREID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            cq.select(root);
            cq.where(predicate);
            Query q = em.createQuery(cq);
            List<TInventaireFamille> familles = q.getResultList();
            familles.forEach((t) -> {
                try {
                    JSONObject json = new JSONObject();
                    json.put("dt_DAY", dateFormat.format(t.getLgINVENTAIREID().getDtUPDATED()));
                    json.put("int_NUMBER_VENTE", t.getIntNUMBERINIT());
                    json.put("int_NUMBER_RETOUR", t.getIntNUMBER());
                    json.put("lg_USER_ID", t.getLgINVENTAIREID().getLgUSERID().getStrFIRSTNAME() + " "
                            + t.getLgINVENTAIREID().getLgUSERID().getStrLASTNAME());
                    json.put("lg_FAMILLE_ID", t.getLgFAMILLEID().getLgFAMILLEID());
                    json.put("int_CIP", t.getLgFAMILLEID().getIntCIP());
                    json.put("str_NAME", t.getLgFAMILLEID().getStrDESCRIPTION());
                    json.put("dt_UPDATED", dateFormat2.format(t.getLgINVENTAIREID().getDtUPDATED()));
                    array.put(json);
                } catch (JSONException ex) {
                    Logger.getLogger(SnapshotManager.class.getName()).log(Level.SEVERE, null, ex);
                }

            });
            return array;

        } finally {

        }

    }

    public TMouvementSnapshot createSnapshotMouvement(TFamille OTFamille, int int_NUMBER, int int_STOCK_DEBUT,
            TEmplacement OTEmplacement, EntityManager em) {
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
            em.persist(OTMouvementSnapshot);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleBons(TFamille OTFamille, int int_NUMBER,
            TEmplacement OTEmplacement, TFamilleStock stock, EntityManager em) {

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement,
                    em);
            if (OTMouvementSnapshot == null) {
                OTMouvementSnapshot = createSnapshotMouvement(OTFamille, stock.getIntNUMBERAVAILABLE() + int_NUMBER,
                        stock.getIntNUMBERAVAILABLE(), OTEmplacement, em);
            } else {

                OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());
            em.merge(OTMouvementSnapshot);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot getTMouvementSnapshotForCurrentDay(String lg_FAMILLE_ID, TEmplacement OTEmplacement,
            EntityManager em) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            OTMouvementSnapshot = em.createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE  FUNCTION('DATE',t.dtDAY) = FUNCTION('DATE', ?3)   AND t.lgFAMILLEID.lgFAMILLEID = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?7 ",
                    TMouvementSnapshot.class).setParameter(3, java.sql.Date.valueOf(LocalDate.now()), TemporalType.DATE)
                    .setParameter(6, lg_FAMILLE_ID).setParameter(7, OTEmplacement.getLgEMPLACEMENTID()).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot createSnapshotMouvementArticleAjustement(TFamille OTFamille, int int_NUMBER,
            int stock_debut, String str_ACTION, TEmplacement OTEmplacement) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            new logger().OCategory.info("int_NUMBER:" + int_NUMBER);
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement); //
            if (OTMouvementSnapshot == null) {

                OTMouvementSnapshot = this.initSnapshotMouvementArticleAjustement(OTFamille, int_NUMBER, stock_debut,
                        OTEmplacement);

            } else {
                new logger().OCategory.info("Quantite ---- " + OTMouvementSnapshot.getIntSTOCKJOUR());

                OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);

            }
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            OTMouvementSnapshot.setDtUPDATED(new Date());

            this.persiste(OTMouvementSnapshot);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public int getStockProduitByIdProduitAndEmplacement(String produitId) {
        try {
            String emplacementId = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            TypedQuery<TFamilleStock> query = this.getOdataManager().getEm().createQuery(
                    "SELECT o  FROM  TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ",
                    TFamilleStock.class);
            query.setMaxResults(1);
            query.setParameter(1, produitId);
            query.setParameter(2, emplacementId);
            return query.getSingleResult().getIntNUMBERAVAILABLE();
        } catch (Exception e) {

            return 0;
        }
    }
}
