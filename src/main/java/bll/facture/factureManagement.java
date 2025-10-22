/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.facture;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Root;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import bll.common.Parameter;
import bll.entity.EntityData;
import dal.TBonLivraison;
import dal.TBordereau;
import dal.TBordereauDetail;
import dal.TClient;
import dal.TCompteClientTiersPayant;
import dal.TDossierFacture;
import dal.TDossierReglement;
import dal.TEventLog;
import dal.TFacture;
import dal.TFactureDetail;
import dal.TFacture_;
import dal.TFamille;
import dal.TGrossiste;
import dal.TGroupeFactures;
import dal.TGroupeFactures_;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TReglement;
import dal.TSequencier;
import dal.TTiersPayant;
import dal.TTypeFacture;
import dal.TTypeMvtCaisse;
import dal.TUser;
import dal.dataManager;
import dal.enumeration.TypeLog;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;
import util.DateConverter;

/**
 *
 * @author FCARDIOULA
 */
public class factureManagement extends bll.bllBase {

    public factureManagement(dataManager OdataManager, TUser OTuser) {
        super.setOTUser(OTuser);
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    public factureManagement(EntityManager _em) {
        this.em = _em;
    }

    private EntityManager em = null;

    public EntityManager getEntityManager() {
        return em;
    }

    public TFacture createFacture(Date dt_debut, Date dt_fin, double d_montant, String str_pere, String str_TypeFacture,
            String str_CODE_COMPTABLE, TTiersPayant str_CUSTOMER, Integer NB_DOSSIER) {
        try {
            TFacture OTFacture = new TFacture();
            TParameters OParameters = this.getOdataManager().getEm().find(TParameters.class,
                    Parameter.KEY_CODE_FACTURE);
            TTypeFacture OTTypeFacture = (TTypeFacture) this.find(str_TypeFacture, new TTypeFacture());

            if (OTTypeFacture == null) {
                return null;
            }
            String CODEFACTURE = OParameters.getStrVALUE();

            OTFacture.setLgFACTUREID(new date().getComplexId());
            OTFacture.setDtDEBUTFACTURE(dt_debut);

            if (str_pere == null) {
                OTFacture.setStrPERE(OTFacture.getLgFACTUREID());
            } else {
                OTFacture.setStrPERE(str_pere);
            }

            OTFacture.setLgTYPEFACTUREID(OTTypeFacture);
            OTFacture.setDtFINFACTURE(dt_fin);
            OTFacture.setStrCUSTOMER(str_CUSTOMER.getLgTIERSPAYANTID());
            OTFacture.setDtDATEFACTURE(new Date());
            OTFacture.setTiersPayant(str_CUSTOMER);
            OTFacture.setTemplate(Boolean.FALSE);
            OTFacture.setDblMONTANTCMDE(d_montant);
            boolean numerationFacture = getParametreFacturation();
            if (numerationFacture) {
                OTFacture.setStrCODEFACTURE(
                        LocalDate.now().format(DateTimeFormatter.ofPattern("yy")).concat("_").concat(CODEFACTURE));
            } else {
                OTFacture.setStrCODEFACTURE(CODEFACTURE);
            }
            OTFacture.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
            OTFacture.setDblMONTANTRESTANT(d_montant);
            OTFacture.setDblMONTANTPAYE(0.0);
            OTFacture.setIntNBDOSSIER(NB_DOSSIER);
            OTFacture.setDtCREATED(new Date());
            OTFacture.setStrSTATUT(commonparameter.statut_enable);
            if (this.persiste(OTFacture)) {
                // UpdateSquencier(str_CUSTOMER);
                OParameters.setStrVALUE((Integer.parseInt(CODEFACTURE) + 1) + "");
                this.merge(OParameters);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }
            return OTFacture;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer une facture ", e.getMessage());
            return null;
        }

    }

    public TFacture createFacture(Date dt_debut, Date dt_fin, double d_montant, String str_pere, String str_TypeFacture,
            String str_CODE_COMPTABLE, String str_CUSTOMER, Integer NB_DOSSIER) {
        try {
            TFacture OTFacture = new TFacture();
            TParameters OParameters = this.getOdataManager().getEm().find(TParameters.class,
                    Parameter.KEY_CODE_FACTURE);
            TTypeFacture OTTypeFacture = (TTypeFacture) this.find(str_TypeFacture, new TTypeFacture());

            if (OTTypeFacture == null) {
                return null;
            }
            String CODEFACTURE = OParameters.getStrVALUE();

            OTFacture.setLgFACTUREID(new date().getComplexId());
            OTFacture.setDtDEBUTFACTURE(dt_debut);

            if (str_pere == null) {
                OTFacture.setStrPERE(OTFacture.getLgFACTUREID());
            } else {
                OTFacture.setStrPERE(str_pere);
            }

            OTFacture.setLgTYPEFACTUREID(OTTypeFacture);
            OTFacture.setDtFINFACTURE(dt_fin);
            OTFacture.setStrCUSTOMER(str_CUSTOMER);
            OTFacture.setDtDATEFACTURE(new Date());
            // add nombre dossier
            OTFacture.setDblMONTANTCMDE(d_montant);
            boolean numerationFacture = getParametreFacturation();
            if (numerationFacture) {
                OTFacture.setStrCODEFACTURE(
                        LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy")).concat("_").concat(CODEFACTURE));
            } else {
                OTFacture.setStrCODEFACTURE(CODEFACTURE);
            }
            OTFacture.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
            OTFacture.setDblMONTANTRESTANT(d_montant);
            OTFacture.setDblMONTANTPAYE(0.0);
            OTFacture.setIntNBDOSSIER(NB_DOSSIER);
            OTFacture.setDtCREATED(new Date());
            OTFacture.setStrSTATUT(commonparameter.statut_enable);
            if (this.persiste(OTFacture)) {
                // UpdateSquencier(str_CUSTOMER);
                OParameters.setStrVALUE((Integer.parseInt(CODEFACTURE) + 1) + "");
                this.merge(OParameters);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }
            return OTFacture;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer une facture ", e.getMessage());
            return null;
        }

    }

    public boolean CreateFactureDetail(TFacture OTFacture, String str_ref, Double Montant, String str_ref_description) {
        TFactureDetail OTFactureDetail = new TFactureDetail();
        try {

            if (OTFacture == null) {
                this.buildErrorTraceMessage("Impossible de creer le detail de la facture ");
                return false;
            }

            OTFactureDetail.setLgFACTUREDETAILID(new date().getComplexId());
            OTFactureDetail.setLgFACTUREID(OTFacture);
            OTFactureDetail.setStrREF(str_ref);
            OTFactureDetail.setStrREFDESCRIPTION(str_ref_description);
            OTFactureDetail.setDblMONTANT(Montant);
            OTFactureDetail.setDblMONTANTPAYE(0.0);
            OTFactureDetail.setDblMONTANTRESTANT(Montant);
            OTFactureDetail.setStrSTATUT(commonparameter.statut_enable);
            OTFactureDetail.setDtCREATED(new Date());
            this.persiste(OTFactureDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return true;
        } catch (Exception e) {
            this.buildErrorTraceMessage(
                    "Impossible de creer le detail de la facture " + OTFactureDetail.getLgFACTUREDETAILID(),
                    e.getMessage());
            return false;
        }

    }

    public String getNameCustomer(String str_Typevente, String str_customer) {
        switch (str_Typevente) {
        case "2":
            TGrossiste OTGrossiste = (TGrossiste) this.find(str_customer, new TGrossiste());
            return OTGrossiste.getStrLIBELLE();
        case "1":
            TTiersPayant OTTiersPayant = (TTiersPayant) this.find(str_customer, new TTiersPayant());
            return OTTiersPayant.getStrFULLNAME();
        default:
            break;
        }

        return null;
    }

    public List<TBonLivraison> getListTBonLivraison(String lg_customer_id, Date dt_debut, Date dt_fin,
            String str_STATUT) {
        List<TBonLivraison> lstTBonLivraison = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TBonLivraison t WHERE t.strSTATUT LIKE ?1 AND t.dtDATELIVRAISON >= ?2 AND t.dtDATELIVRAISON<= ?3 AND t.lgORDERID.lgGROSSISTEID.lgGROSSISTEID = ?4 AND t.strSTATUTFACTURE = ?5")
                .setParameter(1, str_STATUT).setParameter(2, dt_debut).setParameter(3, dt_fin)
                .setParameter(4, lg_customer_id).setParameter(5, commonparameter.UNPAID).getResultList();

        return lstTBonLivraison;
    }

    public List<TPreenregistrementCompteClientTiersPayent> getListVenteTiersPayant(String lg_customer_id, Date dt_debut,
            Date dt_fin) {
        List<TPreenregistrementCompteClientTiersPayent> ListVenteTiersPayant = new ArrayList<>();
        try {
            ListVenteTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.strSTATUT LIKE ?1 AND t.lgPREENREGISTREMENTID.dtCREATED > ?2 AND t.lgPREENREGISTREMENTID.dtCREATED <= ?3 AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID = ?4 AND t.strSTATUTFACTURE = ?5 ")
                    .setParameter(1, commonparameter.statut_is_Closed).setParameter(2, dt_debut).setParameter(3, dt_fin)
                    .setParameter(4, lg_customer_id).setParameter(5, commonparameter.UNPAID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("ListVenteTiersPayant taille " + ListVenteTiersPayant.size());
        return ListVenteTiersPayant;
    }

    public List<TDossierFacture> getDossierVenteTiersPayant(String lg_customer_id, Date dt_debut, Date dt_fin) {
        List<TDossierFacture> ListVenteTiersPayant = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TDossierFacture t WHERE t.strSTATUT LIKE ?1 AND t.dtDATE >= ?2 AND t.dtDATE <= ?3 AND  t.strTIERSPAYANT LIKE ?4")
                .setParameter(1, commonparameter.statut_is_Waiting).setParameter(2, dt_debut).setParameter(3, dt_fin)
                .setParameter(4, lg_customer_id).getResultList();

        return ListVenteTiersPayant;
    }

    public TDossierFacture CreateDossierFacture(String str_NUM_BON, String str_STATUT, double dbl_MONTANT,
            String str_ticket) {

        try {
            TDossierFacture OTDossierFacture = new TDossierFacture();

            OTDossierFacture.setLgDOSSIERFACTUREID(new date().getComplexId());
            OTDossierFacture.setDblMONTANT(Double.NaN);
            OTDossierFacture.setStrNUMDOSSIER(str_NUM_BON);
            OTDossierFacture.setStrSTATUT(str_STATUT);
            this.persiste(OTDossierFacture);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTDossierFacture;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un Dossier de facture ", e.getMessage());
            return null;
        }

    }

    public boolean UpdateMontantDossierFacture(String Lg_DOSSIERFACTURE_ID, double dbl_MONTANT) {

        TDossierFacture OTDossierFacture = (TDossierFacture) this.find(Lg_DOSSIERFACTURE_ID, new TDossierFacture());

        if (OTDossierFacture == null) {
            return false;
        }
        OTDossierFacture.setDblMONTANT(dbl_MONTANT);
        OTDossierFacture.setDtUPDATED(new Date());

        return true;
    }

    public TBordereau CreateBordereau(Integer int_nb_facture) {
        try {
            TBordereau OTBordereau = new TBordereau();

            OTBordereau.setLgBORDEREAUID(new date().getComplexId());
            OTBordereau.setIntnbFACTURE(int_nb_facture);
            OTBordereau.setStrCODE(new date().getShortId(10));
            OTBordereau.setDtCREATED(new Date());
            OTBordereau.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTBordereau);
            this.buildSuccesTraceMessage("Bordereau creer avec success");
            return OTBordereau;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer  le bordereau ", e.getMessage());
            return null;

        }

    }

    public void CreateBordereauDetail(TBordereau OTBordereau, String lg_FACTURE_ID) {

        TBordereauDetail OTBordereauDetail = new TBordereauDetail();
        try {
            if (OTBordereau == null) {
                this.buildErrorTraceMessage("Impossible de creer le detail de la facture ");
                return;
            }

            TFacture OTFacture = (TFacture) this.find(lg_FACTURE_ID, new TFacture());

            if (OTFacture == null) {
                this.buildErrorTraceMessage("Impossible de creer le detail de la facture ");
                return;
            }

            OTBordereauDetail.setLgBORDEREAUDETAILID(new date().getComplexId());
            OTBordereauDetail.setLgFACTUREID(OTFacture);
            OTBordereauDetail.setLgBORDEREAUID(OTBordereau);
            OTBordereauDetail.setDtCREATED(new Date());

            this.persiste(OTBordereauDetail);
            this.buildSuccesTraceMessage("Detail Du Bordereau creer avec success");
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer  le bordereau ", e.getMessage());
        }

    }

    public TFactureDetail GetInfoDossier(String lg_DOSSIER_FACTURE) {
        try {
            TFactureDetail OTFactureDetail = (TFactureDetail) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFactureDetail t WHERE t.strREF LIKE ?1")
                    .setParameter(1, lg_DOSSIER_FACTURE).getSingleResult();

            return OTFactureDetail;
        } catch (Exception e) {

            this.buildErrorTraceMessage("Impossible de trouver la facture ", e.getMessage());
            return null;
        }

    }

    public TFacture GetInfoFacture(String lg_FACTURE) {

        try {
            TFacture OFacture = (TFacture) this.find(lg_FACTURE, new TFacture());
            return OFacture;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de trouver la facture ", e.getMessage());

            return null;
        }
    }

    public TBonLivraison GetInfoBonLivraison(String lg_BON_LIVRAISON) {

        TBonLivraison OTBonLivraison = (TBonLivraison) this.find(lg_BON_LIVRAISON, new TBonLivraison());

        return OTBonLivraison;
    }

    public TPreenregistrementCompteClientTiersPayent GetInfoTierspayant(String lg_DOSSIER_FACTURE) {

        try {
            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = (TPreenregistrementCompteClientTiersPayent) this
                    .find(lg_DOSSIER_FACTURE, new TPreenregistrementCompteClientTiersPayent());

            return OTPreenregistrementCompteClientTiersPayent;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de trouver le compte tier payant ", e.getMessage());

            return null;
        }

    }

    public List<TFacture> getFactureTiersPayant(String lg_customer_id, Date dt_debut, Date dt_fin) {
        List<TFacture> ListFactureTiersPayant = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TFacture t WHERE t.strSTATUT LIKE ?1 AND  t.dtCREATED >= ?2 AND t.dtCREATED <= ?3 AND  t.strCUSTOMER LIKE ?4")
                .setParameter(1, commonparameter.statut_enable).setParameter(2, dt_debut, TemporalType.DATE)
                .setParameter(3, dt_fin, TemporalType.DATE).setParameter(4, lg_customer_id).getResultList();

        return ListFactureTiersPayant;
    }

    public TSequencier CreateSequencier() {
        try {
            TSequencier OTSequencier = new TSequencier();

            OTSequencier.setLgSEQUENCIERID(new date().getComplexId());
            OTSequencier.setIntSEQUENCE(0);
            OTSequencier.setDtCREATED(new Date());
            OTSequencier.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OTSequencier);
            this.buildSuccesTraceMessage("Sequencier creer avec success");
            return OTSequencier;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer  le sequencier ", e.getMessage());
            return null;

        }
    }

    public String getSequencier(String str_tiers_payant) {
        TTiersPayant OTTiersPayant;
        String Str_sequencier;

        OTTiersPayant = (TTiersPayant) this.find(str_tiers_payant, new TTiersPayant());

        try {
            Str_sequencier = OTTiersPayant.getLgSEQUENCIERID().getLgSEQUENCIERID();
        } catch (Exception ex) {
            Str_sequencier = "";
        }

        new logger().OCategory.info("in create new sequencier ");

        if ("".equals(Str_sequencier)) {
            // TSequencier OTSequencier = new TSequencier();
            new logger().OCategory.info("in create new sequencier ");
            // Integer int_sequencier = OTTiersPayant.getLgSEQUENCIERID().getIntSEQUENCE();
            TSequencier OTSequencier = this.CreateSequencier();

            OTTiersPayant.setLgSEQUENCIERID(OTSequencier);
            this.persiste(OTTiersPayant);

            Integer int_sequencier = OTTiersPayant.getLgSEQUENCIERID().getIntSEQUENCE();
            String CODEFACTURE = String.format("%06d", (int_sequencier + 1));

            new logger().OCategory.info("CODEFACTURE  ----->" + CODEFACTURE);

            return CODEFACTURE;
        }
        Integer int_sequencier = OTTiersPayant.getLgSEQUENCIERID().getIntSEQUENCE();
        String CODEFACTURE = String.format("%06d", (int_sequencier + 1));

        new logger().OCategory.info("CODEFACTURE  ----->" + CODEFACTURE);

        return CODEFACTURE;
    }

    public boolean UpdateSquencier(String str_tiers_payant) {

        try {
            TTiersPayant OTTiersPayant = (TTiersPayant) this.find(str_tiers_payant, new TTiersPayant());

            TSequencier OTSequencier = (TSequencier) this.find(OTTiersPayant.getLgSEQUENCIERID().getLgSEQUENCIERID(),
                    new TSequencier());

            Integer sequence = OTSequencier.getIntSEQUENCE();

            OTSequencier.setIntSEQUENCE(sequence + 1);
            OTSequencier.setDtUPDATED(new Date());

            this.persiste(OTSequencier);
            return true;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible d' incrementer le sequencier ", e.getMessage());
            return false;

        }

    }

    public Boolean deleteFacture(String str_facture) {

        List<TFactureDetail> ListTFactureDetail = this.getOdataManager().getEm()
                .createQuery(
                        "SELECT t FROM TFactureDetail t WHERE t.strSTATUT LIKE ?1 AND t.lgFACTUREID.lgFACTUREID =?2")
                .setParameter(1, commonparameter.statut_is_Waiting).setParameter(2, str_facture).getResultList();

        if (ListTFactureDetail.size() > 0) {
            this.buildErrorTraceMessage(
                    "Impossible de mettre de supprimer la facture car  " + ListTFactureDetail.size());
            return false;
        }

        List<TFactureDetail> ListTFactureDetailDelete = this.getOdataManager().getEm()
                .createQuery(
                        "SELECT t FROM TFactureDetail t WHERE t.strSTATUT LIKE ?1 AND t.lgFACTUREID.lgFACTUREID =?2")
                .setParameter(1, commonparameter.statut_enable).setParameter(2, str_facture).getResultList();

        new logger().OCategory.info("taille ListTFactureDetailDelete  " + ListTFactureDetailDelete.size());

        // TFactureDetail OTFactureDetail = new TFactureDetail();
        for (int i = 0; i < ListTFactureDetailDelete.size(); i++) {

            TFactureDetail OTFactureDetail = (TFactureDetail) this
                    .find(ListTFactureDetailDelete.get(i).getLgFACTUREDETAILID(), new TFactureDetail());
            if (OTFactureDetail == null) {
                this.buildErrorTraceMessage("Impossible de mettre de supprimer la facture ");
                return false;
            }
            OTFactureDetail.setStrSTATUT(commonparameter.DELETE);
            OTFactureDetail.setDtUPDATED(new Date());
            this.persiste(OTFactureDetail);

            TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = (TPreenregistrementCompteClientTiersPayent) this
                    .find(ListTFactureDetailDelete.get(i).getStrREF(), new TPreenregistrementCompteClientTiersPayent());
            if (OTPreenregistrementCompteClientTiersPayent == null) {
                this.buildErrorTraceMessage("Impossible de mettre de supprimer la facture ");
                return false;
            }
            OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.UNPAID);
            this.persiste(OTPreenregistrementCompteClientTiersPayent);
        }

        TFacture OTFacture = (TFacture) this.find(str_facture, new TFacture());
        if (OTFacture == null) {
            this.buildErrorTraceMessage("Impossible de mettre de supprimer la facture ");
            return false;
        }
        OTFacture.setStrSTATUT(commonparameter.statut_delete);
        OTFacture.setDtUPDATED(new Date());
        this.persiste(OTFacture);
        return true;
    }

    public List<TFactureDetail> getListDetailFacture(String lg_facture_id) {
        List<TFactureDetail> lstTFactureDetail = this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TFactureDetail t WHERE t.lgFACTUREID.lgFACTUREID LIKE ?1  ")
                .setParameter(1, lg_facture_id).getResultList();
        return lstTFactureDetail;
    }

    // liste des factures
    public List<TFacture> getListFacture_v0(String search_value, String lg_FACTURE_ID, String lg_TYPE_FACTURE_ID,
            Date dt_debut, Date dt_fin, String str_CUSTOMER) {
        List<TFacture> lstTFacture = new ArrayList<>();
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }

            // lstTFacture = this.getOdataManager().getEm().createQuery("SELECT t FROM TFacture t WHERE t.lgFACTUREID
            // LIKE ?1 AND t.strCODEFACTURE LIKE ?2 AND (t.strSTATUT LIKE ?3 OR t.strSTATUT LIKE ?7) AND (t.dtCREATED >=
            // ?4 AND t.dtCREATED <= ?5) AND t.strCUSTOMER LIKE ?6 AND t.lgTYPEFACTUREID.lgTYPEFACTUREID LIKE ?8 ORDER
            // BY t.lgTYPEFACTUREID.strLIBELLE ASC").
            lstTFacture = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFacture t,TTiersPayant p WHERE t.lgFACTUREID LIKE ?1 AND (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2) AND (t.dtCREATED >= ?6 AND t.dtCREATED <= ?7) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID ORDER BY p.strNAME ,p.strFULLNAME, t.strSTATUT ASC ")
                    .setParameter(1, lg_FACTURE_ID).setParameter(2, search_value + "%").setParameter(6, dt_debut)
                    .setParameter(7, dt_fin).setParameter(8, str_CUSTOMER).getResultList();
            for (TFacture OFacture : lstTFacture) {
                this.refresh(OFacture);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTFacture;
    }

    // fin liste des factures
    // liste des factures
    public List<TFacture> getListFacture(String search_value, String lg_FACTURE_ID, String lg_TYPE_FACTURE_ID,
            Date dt_debut, Date dt_fin, String str_CUSTOMER) {
        List<TFacture> lstTFacture = new ArrayList<>();
        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }

            lstTFacture = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT t FROM TFacture t,TTiersPayant p,TFactureDetail d,TPreenregistrementCompteClientTiersPayent pc,TPreenregistrement pr WHERE t.lgFACTUREID LIKE ?1 AND (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR d.strFIRSTNAMECUSTOMER LIKE ?2 OR d.strLASTNAMECUSTOMER LIKE ?2 OR d.strNUMEROSECURITESOCIAL LIKE ?2 OR pr.strREF LIKE ?2 OR pr.strREFTICKET LIKE ?2) AND (t.dtCREATED >= ?6 AND t.dtCREATED <= ?7) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND pc.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=d.strREF AND pr.lgPREENREGISTREMENTID=pc.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID ORDER BY  t.dtCREATED DESC ")
                    .setParameter(1, lg_FACTURE_ID).setParameter(2, search_value + "%").setParameter(6, dt_debut)
                    .setParameter(7, dt_fin).setParameter(8, str_CUSTOMER).getResultList();
            for (TFacture OFacture : lstTFacture) {
                this.refresh(OFacture);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTFacture;
    }
    // fin liste des factures

    // liste des types de factures
    public List<TTypeFacture> getListTTypeFacture(String search_value, String lg_TYPE_FACTURE_ID) {
        List<TTypeFacture> lstTTypeFacture = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTTypeFacture = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeFacture t WHERE t.lgTYPEFACTUREID LIKE ?1 AND t.strLIBELLE LIKE ?2  AND t.strSTATUT LIKE ?3")
                    .setParameter(1, lg_TYPE_FACTURE_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTTypeFacture taille " + lstTTypeFacture.size());
        return lstTTypeFacture;
    }
    // fin liste des types de factures

    // create de facture de grossiste
    public boolean createFactureGrossiste(String lg_customer_id, Date dt_debut, Date dt_fin, String lg_type_facture) {
        boolean result = false;
        List<TBonLivraison> lstTBonLivraison = new ArrayList<>();
        double Montant_total = 0.0;
        int j = 0;
        try {
            lstTBonLivraison = this.getListTBonLivraison(lg_customer_id, dt_debut, dt_fin,
                    commonparameter.statut_is_Closed);

            if (lstTBonLivraison.size() > 0) {
                TFacture OTFacture = this.createFacture(dt_debut, dt_fin, 0, null, lg_type_facture, "", lg_customer_id,
                        lstTBonLivraison.size());
                for (int i = 0; i < lstTBonLivraison.size(); i++) {
                    Montant_total += (double) lstTBonLivraison.get(i).getIntHTTC();
                    if (this.CreateFactureDetail(OTFacture, lstTBonLivraison.get(i).getLgBONLIVRAISONID(),
                            (double) lstTBonLivraison.get(i).getIntHTTC(),
                            lstTBonLivraison.get(i).getStrREFLIVRAISON())) {
                        TBonLivraison OTBonLivraison = lstTBonLivraison.get(i);
                        // OTBonLivraison = ObllBase.getOdataManager().getEm().find(dal.TBonLivraison.class,
                        // lstTBonLivraison.get(i).getLgBONLIVRAISONID());
                        OTBonLivraison.setStrSTATUTFACTURE(commonparameter.CHARGED);
                        OTBonLivraison.setDtUPDATED(new Date());
                        this.persiste(OTBonLivraison);
                        j++;
                    }

                }

                // TFacture OTTFacture = ObllBase.getOdataManager().getEm().find(dal.TFacture.class,
                // OTFacture.getLgFACTUREID());
                OTFacture.setDblMONTANTCMDE(Montant_total);
                OTFacture.setIntNBDOSSIER(lstTBonLivraison.size());
                this.persiste(OTFacture);
                if (j == lstTBonLivraison.size()) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    buildErrorTraceMessage(j + "/" + lstTBonLivraison.size() + " élément(s) pris en compte");
                }

                new logger().OCategory.info("Montant_total---->>>> " + Montant_total);
            } else {
                buildErrorTraceMessage("Aucun bon de livraison trouvé");
            }
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage("Echec de création de la facture");
        }
        return result;
    }
    // fin create de facture de grossiste

    // create facture tiers payant
    public boolean createFactureTiersPayant(String lg_customer_id, Date dt_debut, Date dt_fin, String lg_type_facture) {
        boolean result = false;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();
        double Montant_total = 0;
        int j = 0;
        try {
            lstTPreenregistrementCompteClientTiersPayent = this.getListVenteTiersPayant(lg_customer_id, dt_debut,
                    dt_fin);

            if (lstTPreenregistrementCompteClientTiersPayent.size() > 0) {

                TTiersPayant OTTiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class, lg_customer_id);
                TFacture OTFacture = this.createFacture(dt_debut, dt_fin, 0.0, null, lg_type_facture,
                        OTTiersPayant.getStrCODECOMPTABLE(), OTTiersPayant,
                        lstTPreenregistrementCompteClientTiersPayent.size());

                for (int i = 0; i < lstTPreenregistrementCompteClientTiersPayent.size(); i++) {

                    Montant_total += lstTPreenregistrementCompteClientTiersPayent.get(i).getIntPRICE();
                    if (this.CreateFactureDetail(OTFacture,
                            lstTPreenregistrementCompteClientTiersPayent.get(i)
                                    .getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(),
                            (double) lstTPreenregistrementCompteClientTiersPayent.get(i).getIntPRICE(),
                            lstTPreenregistrementCompteClientTiersPayent.get(i).getLgPREENREGISTREMENTID()
                                    .getStrREFBON())) {
                        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = lstTPreenregistrementCompteClientTiersPayent
                                .get(i);
                        OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.CHARGED);
                        this.persiste(OTPreenregistrementCompteClientTiersPayent);
                        j++;
                    }

                }

                // TFacture OTTFacture = ObllBase.getOdataManager().getEm().find(dal.TFacture.class,
                // OTFacture.getLgFACTUREID());
                OTFacture.setDblMONTANTCMDE(Montant_total);
                OTFacture.setDblMONTANTRESTANT(Montant_total);
                // OTFacture.setIntNBDOSSIER(lstTDossierFacture.size());
                this.persiste(OTFacture);

                if (j == lstTPreenregistrementCompteClientTiersPayent.size()) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    buildErrorTraceMessage(j + "/" + lstTPreenregistrementCompteClientTiersPayent.size()
                            + " élément(s) pris en compte");
                }

                new logger().OCategory.info("Montant_total---->>>> " + Montant_total);
            } else {
                buildErrorTraceMessage("Aucun bon trouvé");
            }
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage("Echec de création de la facture");
        }
        return result;
    }
    // fin create facture tiers payant

    // recuperation de toutes les ventes annulees
    public List<TPreenregistrementCompteClientTiersPayent> getCanceleSales(String lg_customer_id, Date dt_debut,
            Date dt_fin) {
        List<TPreenregistrementCompteClientTiersPayent> ListVenteTiersPayant = new ArrayList<>();
        try {
            ListVenteTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.strSTATUT =?1 AND t.dtCREATED > ?2 AND t.dtCREATED <= ?3 AND t.lgPREENREGISTREMENTID.bISCANCEL=TRUE  AND t.strSTATUTFACTURE=?4")
                    .setParameter(1, commonparameter.statut_is_Closed).setParameter(2, dt_debut).setParameter(3, dt_fin)
                    .setParameter(4, commonparameter.UNPAID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("ListVenteTiersPayant taille " + ListVenteTiersPayant.size());
        return ListVenteTiersPayant;
    }

    public List<EntityData> getVenteTiersPayant(String dt_debut, String dt_fin, String str_CODE_REGROUPEMENT,
            String lg_TYPE_TIERS_PAYANT_ID, String lg_TIERSPAYANT_ID) {
        List<EntityData> lstDataTiersPayant = new ArrayList<>();

        String qry = "select  `t_tiers_payant`.`str_FULLNAME` AS `str_FULLNAME`, `t_tiers_payant`.`lg_TIERS_PAYANT_ID` AS `lg_TIERS_PAYANT_ID`, count(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) AS `NB_DOSSIERS`,"
                + "sum(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE`) AS `SOMME`  from ((((`t_tiers_payant` join `t_compte_client_tiers_payant` on((`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`))) join `t_preenregistrement_compte_client_tiers_payent` on((`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`))) join `t_preenregistrement` on((`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`))) join `t_type_tiers_payant` on((`t_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID` = `t_type_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID`))) "
                + "where ((`t_preenregistrement`.`str_STATUT` = 'is_Closed') and (`t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` = 'unpaid') and (`t_preenregistrement`.`b_IS_CANCEL` = 0) and (`t_preenregistrement`.`int_PRICE` > 0)  and (`t_preenregistrement`.`b_WITHOUT_BON` = 0) AND  (`t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed')      ) "
                + "AND `t_type_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID` LIKE '" + lg_TYPE_TIERS_PAYANT_ID
                + "'   AND `t_tiers_payant`.`lg_TIERS_PAYANT_ID` LIKE '" + lg_TIERSPAYANT_ID
                + "' AND (`t_tiers_payant`.`str_CODE_REGROUPEMENT` LIKE '" + str_CODE_REGROUPEMENT
                + "' OR `t_tiers_payant`.`str_CODE_REGROUPEMENT` IS  NULL) AND `t_preenregistrement`.`dt_UPDATED` >='"
                + dt_debut + "' AND `t_preenregistrement`.`dt_UPDATED` <='" + dt_fin + "' " + "group by"
                + " `t_tiers_payant`.`str_FULLNAME`,`t_tiers_payant`.`lg_TIERS_PAYANT_ID` ";
        if (!"%%".equals(str_CODE_REGROUPEMENT)) {
            qry = "select  `t_tiers_payant`.`str_FULLNAME` AS `str_FULLNAME`, `t_tiers_payant`.`lg_TIERS_PAYANT_ID` AS `lg_TIERS_PAYANT_ID`, count(`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) AS `NB_DOSSIERS`,"
                    + "sum(`t_preenregistrement_compte_client_tiers_payent`.`int_PRICE`) AS `SOMME`  from ((((`t_tiers_payant` join `t_compte_client_tiers_payant` on((`t_tiers_payant`.`lg_TIERS_PAYANT_ID` = `t_compte_client_tiers_payant`.`lg_TIERS_PAYANT_ID`))) join `t_preenregistrement_compte_client_tiers_payent` on((`t_compte_client_tiers_payant`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` = `t_preenregistrement_compte_client_tiers_payent`.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`))) join `t_preenregistrement` on((`t_preenregistrement_compte_client_tiers_payent`.`lg_PREENREGISTREMENT_ID` = `t_preenregistrement`.`lg_PREENREGISTREMENT_ID`))) join `t_type_tiers_payant` on((`t_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID` = `t_type_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID`))) "
                    + "where ((`t_preenregistrement`.`str_STATUT` = 'is_Closed') and (`t_preenregistrement_compte_client_tiers_payent`.`str_STATUT_FACTURE` = 'unpaid') and (`t_preenregistrement`.`b_IS_CANCEL` = 0) and (`t_preenregistrement`.`int_PRICE` > 0) and (`t_preenregistrement`.`b_WITHOUT_BON` = 0) AND  (`t_preenregistrement_compte_client_tiers_payent`.`str_STATUT` = 'is_Closed')) "
                    + "AND `t_type_tiers_payant`.`lg_TYPE_TIERS_PAYANT_ID` LIKE '" + lg_TYPE_TIERS_PAYANT_ID
                    + "'   AND (`t_tiers_payant`.`str_CODE_REGROUPEMENT` LIKE '" + str_CODE_REGROUPEMENT
                    + "' AND `t_tiers_payant`.`str_CODE_REGROUPEMENT` IS NOT NULL) AND `t_preenregistrement`.`dt_UPDATED` >='"
                    + dt_debut + "' AND `t_preenregistrement`.`dt_UPDATED` <='" + dt_fin + "'" + "group by"
                    + " `t_tiers_payant`.`str_FULLNAME`,`t_tiers_payant`.`lg_TIERS_PAYANT_ID` ";
        }

        try {
            List resul = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();
            for (int i = 0; i < resul.size(); i++) {
                EntityData entityData = new EntityData();
                Object[] obj = (Object[]) resul.get(i);
                entityData.setStr_value1(obj[0] + "");
                entityData.setStr_value2(obj[1] + "");
                entityData.setStr_value3(obj[2] + "");
                entityData.setStr_value4(obj[3] + "");
                lstDataTiersPayant.add(entityData);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstDataTiersPayant;
    }

    public List<TPreenregistrementCompteClientTiersPayent> getListVenteTiersPayantBIS(String lg_tiers_payant_id,
            Date dt_debut, Date dt_fin, String lg_CLIENT_ID, String lg_TYPE_TIERS_PAYANT_ID) {
        List<TPreenregistrementCompteClientTiersPayent> ListVenteTiersPayant = new ArrayList<>();
        try {
            ListVenteTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.strSTATUT = ?1  AND t.strSTATUT = ?1   AND (t.lgPREENREGISTREMENTID.dtUPDATED > ?2 AND t.lgPREENREGISTREMENTID.dtUPDATED <= ?3) AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?4 AND t.strSTATUTFACTURE = ?5 AND t.lgPREENREGISTREMENTID.bISCANCEL = FALSE AND t.lgPREENREGISTREMENTID.intPRICE > 0 AND t.lgPREENREGISTREMENTID.bWITHOUTBON =FALSE   AND t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?6  AND t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID LIKE ?7 ORDER BY t.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.strNAME,t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME,t.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME")
                    .setParameter(1, commonparameter.statut_is_Closed).setParameter(2, dt_debut).setParameter(3, dt_fin)
                    .setParameter(4, lg_tiers_payant_id).setParameter(5, commonparameter.UNPAID)
                    .setParameter(6, lg_CLIENT_ID).setParameter(7, lg_TYPE_TIERS_PAYANT_ID).getResultList();

            for (TPreenregistrementCompteClientTiersPayent tPreenregistrementCompteClientTiersPayent : ListVenteTiersPayant) {
                this.refresh(tPreenregistrementCompteClientTiersPayent);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("ListVenteTiersPayant taille " + ListVenteTiersPayant.size());
        return ListVenteTiersPayant;
    }

    // creation facture tiers payans 2 debut
    // fin de creation facture tiers payant 2
    public boolean createFactureTiersPayantBIS(String lg_customer_id, Date dt_debut, Date dt_fin,
            String lg_type_facture) {
        boolean result = false;
        List<TPreenregistrementCompteClientTiersPayent> lstTPreenregistrementCompteClientTiersPayent = new ArrayList<>();
        double Montant_total = 0;
        int j = 0;
        try {
            lstTPreenregistrementCompteClientTiersPayent = this.getListVenteTiersPayantBIS(lg_customer_id, dt_debut,
                    dt_fin, null, null);

            if (lstTPreenregistrementCompteClientTiersPayent.size() > 0) {

                TTiersPayant OTTiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class, lg_customer_id);
                TFacture OTFacture = this.createFacture(dt_debut, dt_fin, 0.0, null, lg_type_facture,
                        OTTiersPayant.getStrCODECOMPTABLE(), OTTiersPayant,
                        lstTPreenregistrementCompteClientTiersPayent.size());

                for (int i = 0; i < lstTPreenregistrementCompteClientTiersPayent.size(); i++) {

                    Montant_total += lstTPreenregistrementCompteClientTiersPayent.get(i).getIntPRICE();
                    if (this.CreateFactureDetail(OTFacture,
                            lstTPreenregistrementCompteClientTiersPayent.get(i)
                                    .getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(),
                            (double) lstTPreenregistrementCompteClientTiersPayent.get(i).getIntPRICE(),
                            lstTPreenregistrementCompteClientTiersPayent.get(i).getLgPREENREGISTREMENTID()
                                    .getStrREFBON())) {
                        TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = lstTPreenregistrementCompteClientTiersPayent
                                .get(i);
                        OTPreenregistrementCompteClientTiersPayent.setStrSTATUTFACTURE(commonparameter.CHARGED);
                        this.persiste(OTPreenregistrementCompteClientTiersPayent);
                        j++;
                    }

                }

                // TFacture OTTFacture = ObllBase.getOdataManager().getEm().find(dal.TFacture.class,
                // OTFacture.getLgFACTUREID());
                OTFacture.setDblMONTANTCMDE(Montant_total);
                OTFacture.setDblMONTANTRESTANT(Montant_total);
                OTFacture.setIntNBDOSSIER(lstTPreenregistrementCompteClientTiersPayent.size());
                this.persiste(OTFacture);

                if (j == lstTPreenregistrementCompteClientTiersPayent.size()) {
                    result = true;
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    buildErrorTraceMessage(j + "/" + lstTPreenregistrementCompteClientTiersPayent.size()
                            + " élément(s) pris en compte");
                }

                new logger().OCategory.info("Montant_total---->>>> " + Montant_total + " Total dossier "
                        + lstTPreenregistrementCompteClientTiersPayent.size());
            } else {
                buildErrorTraceMessage("Aucun bon trouvé");
            }
        } catch (Exception e) {
            e.printStackTrace();
            buildErrorTraceMessage("Echec de création de la facture");
        }
        return result;
    }

    // liste des factures
    public List<TFacture> getListFactureBIS(String search_value, String lg_FACTURE_ID, String lg_TYPE_FACTURE_ID,
            Date dt_debut, Date dt_fin, String str_CUSTOMER) {
        List<TFacture> lstTFacture = new ArrayList<>();
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }

            lstTFacture = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFacture t WHERE t.lgFACTUREID LIKE ?1 AND t.strCODEFACTURE LIKE ?2 AND t.strSTATUT  <>?3  AND t.dtCREATED BETWEEN ?4 AND ?5 AND t.strCUSTOMER LIKE ?6 AND t.lgTYPEFACTUREID.lgTYPEFACTUREID LIKE ?7 ORDER BY t.lgTYPEFACTUREID.strLIBELLE ASC")
                    .setParameter(1, lg_FACTURE_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.PAID).setParameter(4, dt_debut, TemporalType.TIMESTAMP)
                    .setParameter(5, dt_fin, TemporalType.TIMESTAMP).setParameter(6, str_CUSTOMER)
                    .setParameter(7, lg_TYPE_FACTURE_ID).getResultList();
            for (TFacture OTFacture : lstTFacture) {
                this.refresh(OTFacture);
                System.err.println("OTFacture  " + OTFacture.getDblMONTANTPAYE() + " " + OTFacture.getStrCUSTOMER());

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFacture taille " + lstTFacture.size());
        return lstTFacture;
    }
    // fin liste des factures

    /**
     * add by KOBENA get all client by tiers payant*
     */
    public List<TClient> getAllClients(String lg_TIERS_PAYANT_ID) {
        List<TClient> listClients = new ArrayList<>();
        try {
            listClients = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TClient o JOIN o.tCompteClientCollection co JOIN co.tCompteClientTiersPayantCollection t WHERE t.lgTIERSPAYANTID.lgTIERSPAYANTID  LIKE ?1 AND o.strSTATUT=?2 ORDER BY o.strFIRSTNAME, o.strLASTNAME")
                    .setParameter(1, lg_TIERS_PAYANT_ID).setParameter(2, commonparameter.statut_enable).getResultList();
            for (TClient tClient : listClients) {
                this.refresh(tClient);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return listClients;

    }

    // get Tiers payant by id **/
    public Object getgetOrganisme(String str_Typevente, String str_customer) {

        if (str_Typevente.equals("2")) {

            TGrossiste OTGrossiste = (TGrossiste) this.find(str_customer, new TGrossiste());
            return OTGrossiste;
        } else if (str_Typevente.equals("3")) {
            TTiersPayant OTTiersPayant = (TTiersPayant) this.find(str_customer, new TTiersPayant());
            return OTTiersPayant;
        } else {

        }

        return null;
    }

    public List<TReglement> findAllReglements(String lg_REGLEMENT_ID, String search_value, String lg_CLIENT_ID,
            Date dt_debut, Date dt_fin) {
        List<TReglement> allReglements = new ArrayList<>();
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }

            allReglements = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TReglement t WHERE t.lgREGLEMENTID LIKE ?1  AND t.strSTATUT LIKE ?2 AND t.bISFACTURE = ?3  AND (t.dtCREATED >= ?4 AND t.dtCREATED <= ?5) AND t.             ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_REGLEMENT_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .setParameter(3, true).setParameter(4, dt_debut).setParameter(5, dt_fin).getResultList();
            for (TReglement OTReglement : allReglements) {
                this.refresh(OTReglement);
            }
        } catch (Exception e) {
            e.printStackTrace();

        }
        return allReglements;
    }

    private boolean factureCanBeDeleted(String lg_FACTURE_ID) {
        boolean canBeDeleted = false;
        List<TDossierReglement> list = new ArrayList<>();

        try {
            list = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TDossierReglement o WHERE o.lgFACTUREID.lgFACTUREID=?1")
                    .setParameter(1, lg_FACTURE_ID).getResultList();
            for (TDossierReglement tDossierReglement : list) {
                this.refresh(tDossierReglement);
            }
            if (list.isEmpty()) {
                canBeDeleted = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return canBeDeleted;

    }

    public boolean deleteInvoice(String lg_FACTURE_ID, TUser user) {
        boolean isDeleted = true;
        TFacture OFacture;
        try {
            if (factureCanBeDeleted(lg_FACTURE_ID)) {

                if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().begin();
                }
                OFacture = this.getOdataManager().getEm().find(TFacture.class, lg_FACTURE_ID);
                this.refresh(OFacture);
                deleteInvoiceItems(lg_FACTURE_ID);
                try {
                    TGroupeFactures of = getGroupeFacturesByfacture(lg_FACTURE_ID);
                    if (of != null) {
                        this.getOdataManager().getEm().remove(of);
                    }
                } catch (Exception e) {
                }

                this.getOdataManager().getEm().remove(OFacture);
                String description = "La facture  numéro : " + OFacture.getStrCODEFACTURE() + " a été supprimée par "
                        + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
                updateItem(this.getOTUser(), OFacture.getLgFACTUREID(), description, TypeLog.SUPPRESION_DE_FACTURE,
                        OFacture, this.getOdataManager().getEm());

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                }

                // this.do_event_log(this.getOdataManager(), "", "suppression de facture : " +
                // OFacture.getStrCODEFACTURE(), this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable,
                // "t_facture", "t_facture", "Facturation", this.getOTUser().getLgUSERID());
            } else {
                buildErrorTraceMessage(
                        "Echec de suppression de la facture car elle est déjà été objet d'un reglement ");
                isDeleted = false;
            }
        } catch (Exception e) {
            isDeleted = false;
            buildErrorTraceMessage("Echec de suppression de facture  ");
            e.printStackTrace();
        }
        return isDeleted;

    }

    private TGroupeFactures getGroupeFacturesByfacture(String id) {
        TGroupeFactures f = null;
        try {
            f = (TGroupeFactures) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TGroupeFactures o WHERE o.lgFACTURESID.lgFACTUREID=?1 ")
                    .setParameter(1, id).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
        }
        return f;
    }

    private void deleteInvoiceItems(String lg_FACTURE_ID) {
        List<TFactureDetail> list = new ArrayList<>();

        try {
            list = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TFactureDetail o WHERE o.lgFACTUREID.lgFACTUREID=?1")
                    .setParameter(1, lg_FACTURE_ID).getResultList();
            for (TFactureDetail OFactureDetail : list) {
                updateTPreenregistrementCompteClientTiersPayent(OFactureDetail.getStrREF());
                this.getOdataManager().getEm().remove(OFactureDetail);
            }

        } catch (Exception e) {
            buildErrorTraceMessage("Echec de suppression de facture detail  ");
            e.printStackTrace();
        }
    }

    private void resetComptClient(TCompteClientTiersPayant payant, int montant) {
        payant.setDbCONSOMMATIONMENSUELLE(payant.getDbCONSOMMATIONMENSUELLE() - montant);
        if (payant.getDbCONSOMMATIONMENSUELLE() <= payant.getDbPLAFONDENCOURS()) {
            payant.setBCANBEUSE(true);
            if (payant.getDbCONSOMMATIONMENSUELLE() < 0) {
                payant.setDbCONSOMMATIONMENSUELLE(0);
            }

        }
        this.getOdataManager().getEm().merge(payant);
    }

    private void updateTPreenregistrementCompteClientTiersPayent(String str_ref) {
        TPreenregistrementCompteClientTiersPayent p = null;
        try {
            p = this.getOdataManager().getEm().find(TPreenregistrementCompteClientTiersPayent.class, str_ref);
            p.setStrSTATUTFACTURE(commonparameter.statut_unpaid);
            p.setDtUPDATED(new Date());
            resetComptClient(p.getLgCOMPTECLIENTTIERSPAYANTID(), p.getIntPRICERESTE());
            this.getOdataManager().getEm().merge(p);

        } catch (Exception e) {
            buildErrorTraceMessage("Echec de mise à jour de la vente ");
            e.printStackTrace();
        }

    }

    public boolean checkChargedPreenregistrement(String str_REF) {
        boolean isWasCharged = false;
        List list = null;
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o  FROM TPreenregistrementCompteClientTiersPayent o ,TFactureDetail f WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 AND  o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=f.strREF ")
                    .setParameter(1, str_REF).getResultList();
            if (list.size() > 0) {
                isWasCharged = true;

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return isWasCharged;
    }

    public boolean CreateFactureDetail(TFacture OTFacture, TPreenregistrementCompteClientTiersPayent payent,
            Double Montant, String str_ref_description, String str_PKEY_PREENREGISTREMENT, double montantBrut,
            double montantRemise) {
        TFactureDetail OTFactureDetail = new TFactureDetail();

        try {

            if (OTFacture == null) {
                this.buildErrorTraceMessage("Impossible de creer le detail de la facture ");
                return false;
            }
            String str_CATEGORY = "";
            TPreenregistrement preenregistrement = payent.getLgPREENREGISTREMENTID();
            if (payent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                    .getLgCATEGORYCLIENTID() != null) {
                str_CATEGORY = payent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                        .getLgCATEGORYCLIENTID().getStrLIBELLE();
            }

            OTFactureDetail.setLgFACTUREDETAILID(new date().getComplexId());
            OTFactureDetail.setLgFACTUREID(OTFacture);
            OTFactureDetail.setStrREF(payent.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
            OTFactureDetail.setStrREFDESCRIPTION(str_ref_description);
            OTFactureDetail.setDblMONTANT(Montant);
            OTFactureDetail.setStrCATEGORYCLIENT(str_CATEGORY);
            OTFactureDetail.setDblMONTANTBrut(new BigDecimal(montantBrut));
            OTFactureDetail.setDblMONTANTPAYE(0.0);
            OTFactureDetail.setPKey(str_PKEY_PREENREGISTREMENT);
            OTFactureDetail.setDblMONTANTREMISE(new BigDecimal(montantRemise));
            OTFactureDetail.setDblMONTANTRESTANT(Montant);
            OTFactureDetail.setStrSTATUT(commonparameter.statut_enable);
            OTFactureDetail.setDtCREATED(new Date());
            OTFactureDetail.setStrFIRSTNAMECUSTOMER(preenregistrement.getStrFIRSTNAMECUSTOMER());
            OTFactureDetail.setStrLASTNAMECUSTOMER(preenregistrement.getStrLASTNAMECUSTOMER());
            OTFactureDetail.setStrNUMEROSECURITESOCIAL(preenregistrement.getStrNUMEROSECURITESOCIAL());
            OTFactureDetail.setTaux(payent.getIntPERCENT());
            OTFactureDetail.setAyantDroit(preenregistrement.getAyantDroit());
            OTFactureDetail.setClient(preenregistrement.getClient());
            OTFactureDetail.setMontantRemiseVente(preenregistrement.getIntPRICEREMISE());
            OTFactureDetail.setMontantTvaVente(preenregistrement.getMontantTva());
            OTFactureDetail.setMontantVente(preenregistrement.getIntPRICE());
            OTFactureDetail.setDateOperation(preenregistrement.getDtUPDATED());
            this.persiste(OTFactureDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return true;
        } catch (Exception e) {
            this.buildErrorTraceMessage(
                    "Impossible de creer le detail de la facture " + OTFactureDetail.getLgFACTUREDETAILID(),
                    e.getMessage());
            return false;
        }

    }
    // function de recuperation des dossiers de facture avec comme filtre le taux de couverture

    public List<EntityData> getFactureReportDataPercent(String lg_FACTURE_ID, String lg_TIERS_PAYANT_ID,
            int tauxcouverture) {
        List list;
        List<EntityData> entityDatas = new ArrayList<>();
        try {
            String query = "SELECT  fa.`dbl_MONTANT_REMISE` AS MONTANTREMISE,p.int_CUST_PART, fa.`dbl_MONTANT_CMDE` AS MONTANTNET ,p.int_PRICE  AS MONTANT,fa.`dbl_MONTANT_FOFETAIRE`,fa.`dbl_MONTANT_Brut` AS FACTUREMONTANTBRUT ,SUM(f.`dbl_MONTANT`) AS MONTANTPERCENT, p.*,f.`dbl_MONTANT_REMISE`,f.`dbl_MONTANT_Brut`,f.`dbl_MONTANT` AS str_TIERS_PAYANT_RO, "
                    + " fa.str_CODE_FACTURE ,"
                    + " ( SELECT DISTINCT tp.str_FULLNAME  from t_preenregistrement_compte_client_tiers_payent tt, t_compte_client_tiers_payant c, t_tiers_payant tp  where tt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = "
                    + " c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND  c.lg_TIERS_PAYANT_ID = '"
                    + lg_TIERS_PAYANT_ID + "' "
                    + " ) AS str_FULLNAME  FROM `t_preenregistrement` p, `t_preenregistrement_compte_client_tiers_payent` pr,t_facture fa,`t_facture_detail` f,`t_client` c,`t_compte_client` cp,"
                    + " `t_compte_client_tiers_payant` ctp WHERE p.`lg_PREENREGISTREMENT_ID` = pr.`lg_PREENREGISTREMENT_ID` AND pr.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` = f.`str_REF` AND  p.str_TYPE_VENTE LIKE 'VO' AND "
                    + "f.`lg_FACTURE_ID` = '" + lg_FACTURE_ID
                    + "' AND fa.lg_FACTURE_ID=f.lg_FACTURE_ID AND p.`str_STATUT`='is_Closed' AND "
                    + " c.`lg_CLIENT_ID` =`cp`.`lg_CLIENT_ID` AND cp.`lg_COMPTE_CLIENT_ID`=ctp.`lg_COMPTE_CLIENT_ID`  AND  ctp.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`  AND pr.`int_PERCENT`="
                    + tauxcouverture + " ORDER BY  p.str_REF_BON";
            list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Iterator it = list.iterator(); it.hasNext();) {
                Object[] object = (Object[]) it.next();
                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityData.setStr_value3(object[2] + "");
                entityData.setStr_value4(object[3] + "");
                entityData.setStr_value5(object[4] + "");
                entityData.setStr_value6(object[5] + "");
                entityData.setStr_value7(object[6] + "");
                // entityData.setStr_value8(object[9] + "");
                // entityData.setStr_value9(object[10] + "");
                entityDatas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return entityDatas;
    }

    public List<EntityData> getFactureReportData(String lg_FACTURE_ID, String lg_TIERS_PAYANT_ID) {
        List<Object[]> list;
        List<EntityData> entityDatas = new ArrayList<>();
        try {
            String query = "SELECT  fa.`dbl_MONTANT_REMISE` AS MONTANTREMISE,p.int_CUST_PART, fa.`dbl_MONTANT_CMDE` AS MONTANTNET ,p.int_PRICE  AS MONTANT,fa.`dbl_MONTANT_FOFETAIRE`,fa.`dbl_MONTANT_Brut` AS FACTUREMONTANTBRUT,f.`dbl_MONTANT_REMISE`,f.`dbl_MONTANT_Brut`,f.`dbl_MONTANT` AS str_TIERS_PAYANT_RO,p.int_PRICE_REMISE,p.montantTva, p.*,"
                    + " fa.str_CODE_FACTURE ,"
                    + " ( SELECT DISTINCT tp.str_FULLNAME  from t_preenregistrement_compte_client_tiers_payent tt, t_compte_client_tiers_payant c, t_tiers_payant tp  where tt.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = "
                    + " c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND c.lg_TIERS_PAYANT_ID = tp.lg_TIERS_PAYANT_ID AND tt.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND  c.lg_TIERS_PAYANT_ID = '"
                    + lg_TIERS_PAYANT_ID + "' "
                    + " ) AS str_FULLNAME  FROM `t_preenregistrement` p, `t_preenregistrement_compte_client_tiers_payent` pr,t_facture fa,`t_facture_detail` f,`t_client` c,`t_compte_client` cp,"
                    + " `t_compte_client_tiers_payant` ctp WHERE p.`lg_PREENREGISTREMENT_ID` = pr.`lg_PREENREGISTREMENT_ID` AND pr.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` = f.`str_REF` AND  p.str_TYPE_VENTE LIKE 'VO' AND "
                    + "f.`lg_FACTURE_ID` = '" + lg_FACTURE_ID
                    + "' AND fa.lg_FACTURE_ID=f.lg_FACTURE_ID AND p.`str_STATUT`='is_Closed' AND "
                    + " c.`lg_CLIENT_ID` =`cp`.`lg_CLIENT_ID` AND cp.`lg_COMPTE_CLIENT_ID`=ctp.`lg_COMPTE_CLIENT_ID`  AND  ctp.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` ORDER BY  p.str_REF_BON";
            list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Object[] object : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityData.setStr_value3(object[2] + "");
                entityData.setStr_value4(object[3] + "");
                entityData.setStr_value5(object[4] + "");
                entityData.setStr_value6(object[5] + "");
                entityData.setStr_value7(object[6] + "");
                entityData.setStr_value8(object[9] + "");
                entityData.setStr_value9(object[10] + "");
                entityDatas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return entityDatas;
    }

    public JSONObject getInvoiceExportToExcelData(String search_value, String lg_FACTURE_ID, String lg_TYPE_FACTURE_ID,
            Date dt_debut, Date dt_fin, String str_CUSTOMER, String code, String impayes) {
        JSONObject json = new JSONObject();

        try {
            List<TFacture> listfacture = this.getListFacture(search_value, lg_FACTURE_ID, lg_TYPE_FACTURE_ID, dt_debut,
                    dt_fin, str_CUSTOMER, code, impayes, 0, 0);

            json = dataJson2(listfacture);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    private JSONObject dataJson(List<TFacture> listfacture) throws JSONException {
        JSONObject object = new JSONObject();

        JSONArray array = new JSONArray();
        array.put("CODE FACTURE");
        array.put("ORGANISME");
        array.put("PERIODE");
        array.put("NOMBRE");
        array.put("MONTANT");
        array.put("MONTANTPAYE");
        array.put("MONTANTRESTANT");
        array.put("DATE");
        object.put("parentheader", array);
        array = new JSONArray();
        array.put("NUM DOSSIER");
        array.put("NOM");
        array.put("PRENOM");
        array.put("DATE");
        array.put("HEURE");
        array.put("TOTAL  VENTE");
        array.put("PART TP");
        array.put("PART Client");
        array.put("POURCENTAGE");
        object.put("childheader", array);

        array = new JSONArray();
        for (TFacture OFacture : listfacture) {
            JSONObject json = new JSONObject();
            TTiersPayant OTTiersPayant = (TTiersPayant) this
                    .getgetOrganisme(OFacture.getLgTYPEFACTUREID().getLgTYPEFACTUREID(), OFacture.getStrCUSTOMER());
            json.put("CODE FACTURE", OFacture.getStrCODEFACTURE());
            json.put("ORGANISME", OTTiersPayant.getStrFULLNAME());
            json.put("PERIODE", "Du " + date.formatterShort.format(OFacture.getDtDEBUTFACTURE()) + " Au "
                    + date.formatterShort.format(OFacture.getDtFINFACTURE()));
            json.put("NOMBRE", OFacture.getIntNBDOSSIER());
            json.put("MONTANT", OFacture.getDblMONTANTCMDE());
            json.put("MONTANTPAYE", OFacture.getDblMONTANTPAYE());
            json.put("MONTANTRESTANT", OFacture.getDblMONTANTRESTANT());
            json.put("DATE", date.formatterShort.format(OFacture.getDtCREATED()));
            JSONArray facturedetails = new JSONArray();
            List<TFactureDetail> factureDetails = this.getAllFactureDetails(OFacture.getLgFACTUREID());
            for (TFactureDetail OFactureDetail : factureDetails) {
                JSONArray jsonfacturedetai = new JSONArray();
                TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = this
                        .GetInfoTierspayant(OFactureDetail.getStrREF());
                jsonfacturedetai
                        .put(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getStrREFBON());
                jsonfacturedetai.put(OFactureDetail.getStrFIRSTNAMECUSTOMER());
                jsonfacturedetai.put(OFactureDetail.getStrLASTNAMECUSTOMER());
                jsonfacturedetai.put(date.formatterShort
                        .format(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getDtCREATED()));
                jsonfacturedetai.put(date.NomadicUiFormatTime
                        .format(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getDtCREATED()));
                jsonfacturedetai.put(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getIntPRICE()
                        - OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getIntPRICEREMISE());
                jsonfacturedetai.put(OTPreenregistrementCompteClientTiersPayent.getIntPRICE());
                jsonfacturedetai
                        .put(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getIntCUSTPART());
                jsonfacturedetai.put(OTPreenregistrementCompteClientTiersPayent.getIntPERCENT());
                facturedetails.put(jsonfacturedetai);
            }
            json.put("facturedetails", facturedetails);

            array.put(json);
        }
        object.put("parentData", array);
        return object;
    }

    private JSONObject dataJson2(List<TFacture> listfacture) throws JSONException {
        JSONObject object = new JSONObject();

        JSONArray array = new JSONArray();
        array.put("CODE FACTURE");
        array.put("ORGANISME");
        array.put("PERIODE");
        array.put("NOMBRE");
        array.put("MONTANT BRUT");
        array.put("M.REMISE");
        array.put("M.REMISE FORFAITAIRE");
        array.put("MONTANT NET");
        array.put("MONTANTPAYE");
        array.put("MONTANTRESTANT");
        array.put("DATE");
        object.put("parentheader", array);
        array = new JSONArray();
        array.put("Num Dossier");
        array.put("Nom et Prénom");
        array.put("Date et Heure ");
        array.put("Nombre Articles");
        array.put("Total  Vente");
        array.put("M.Remise");
        array.put(" ");
        array.put("Montant Net ");
        array.put("Montant Payé");
        array.put("Montant Restant");
        object.put("childheader", array);

        array = new JSONArray();
        for (TFacture OFacture : listfacture) {
            JSONObject json = new JSONObject();
            JSONArray headerdatavalue = new JSONArray();
            TTiersPayant OTTiersPayant = (TTiersPayant) this
                    .getgetOrganisme(OFacture.getLgTYPEFACTUREID().getLgTYPEFACTUREID(), OFacture.getStrCUSTOMER());
            headerdatavalue.put(OFacture.getStrCODEFACTURE());
            headerdatavalue.put(OTTiersPayant.getStrFULLNAME().trim());
            headerdatavalue.put("Du " + date.formatterShort.format(OFacture.getDtDEBUTFACTURE()) + " Au "
                    + date.formatterShort.format(OFacture.getDtFINFACTURE()));
            headerdatavalue.put(OFacture.getIntNBDOSSIER());
            headerdatavalue.put(OFacture.getDblMONTANTBrut().longValue());
            headerdatavalue.put(OFacture.getDblMONTANTREMISE().longValue());
            headerdatavalue.put(OFacture.getDblMONTANTFOFETAIRE().longValue());
            headerdatavalue.put(OFacture.getDblMONTANTCMDE().longValue());
            headerdatavalue.put(OFacture.getDblMONTANTPAYE().longValue());
            headerdatavalue.put(OFacture.getDblMONTANTRESTANT().longValue());
            headerdatavalue.put(date.formatterShort.format(OFacture.getDtCREATED()));
            json.put("headerdatavalue", headerdatavalue);
            JSONArray facturedetails = new JSONArray();
            List<TFactureDetail> factureDetails = this.getAllFactureDetails(OFacture.getLgFACTUREID());
            for (TFactureDetail OFactureDetail : factureDetails) {
                JSONArray jsonfacturedetai = new JSONArray();
                TPreenregistrementCompteClientTiersPayent OTPreenregistrementCompteClientTiersPayent = this
                        .GetInfoTierspayant(OFactureDetail.getStrREF());
                //
                jsonfacturedetai
                        .put(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getStrREFBON());
                jsonfacturedetai
                        .put(OFactureDetail.getStrFIRSTNAMECUSTOMER() + " " + OFactureDetail.getStrLASTNAMECUSTOMER());
                jsonfacturedetai.put(date.formatterShort
                        .format(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getDtCREATED())
                        + " " + date.NomadicUiFormatTime.format(
                                OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID().getDtCREATED()));
                jsonfacturedetai.put(OTPreenregistrementCompteClientTiersPayent.getLgPREENREGISTREMENTID()
                        .getTPreenregistrementDetailCollection().size());
                jsonfacturedetai.put(OFactureDetail.getDblMONTANTBrut().longValue());
                jsonfacturedetai.put(OFactureDetail.getDblMONTANTREMISE().longValue());
                jsonfacturedetai.put(" ");
                jsonfacturedetai.put(OFactureDetail.getDblMONTANT().longValue());
                jsonfacturedetai.put(OFactureDetail.getDblMONTANTPAYE().longValue());
                jsonfacturedetai.put(OFactureDetail.getDblMONTANTRESTANT().longValue());
                jsonfacturedetai.put(OTPreenregistrementCompteClientTiersPayent.getIntPERCENT());
                facturedetails.put(jsonfacturedetai);
            }
            json.put("childdatavalues", facturedetails);

            array.put(json);
        }
        object.put("parentData", array);
        return object;
    }

    public List<TFactureDetail> getAllFactureDetails(String lg_FACTURE_ID) {
        List<TFactureDetail> factureDetails = new ArrayList<>();
        try {
            factureDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFactureDetail t ,TPreenregistrementCompteClientTiersPayent p  WHERE t.lgFACTUREID.lgFACTUREID = ?1 AND t.strREF=p.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_FACTURE_ID).getResultList();
            for (TFactureDetail OFactureDetail : factureDetails) {
                this.refresh(OFactureDetail);

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return factureDetails;
    }

    public List getFacturePercent(String lg_FACTURE_ID) {

        List list = null;
        String query = "SELECT DISTINCT pr.`int_PERCENT` FROM `t_preenregistrement` p, `t_preenregistrement_compte_client_tiers_payent` pr,t_facture fa,\n"
                + "`t_facture_detail` f,`t_client` c,`t_compte_client` cp,`t_compte_client_tiers_payant` ctp WHERE p.`lg_PREENREGISTREMENT_ID` = pr.`lg_PREENREGISTREMENT_ID` AND\n"
                + "  pr.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` = f.`str_REF` AND\n"
                + "  p.str_TYPE_VENTE LIKE 'VO' AND fa.`lg_FACTURE_ID` = '" + lg_FACTURE_ID
                + "' AND fa.lg_FACTURE_ID=f.lg_FACTURE_ID\n"
                + "  AND p.`str_STATUT`='is_Closed' AND  c.`lg_CLIENT_ID` =`cp`.`lg_CLIENT_ID` AND cp.`lg_COMPTE_CLIENT_ID`=ctp.`lg_COMPTE_CLIENT_ID`\n"
                + "  AND  ctp.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`\n"
                + " ORDER BY pr.`int_PERCENT` DESC";
        try {
            list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    // fonction qui le nombre de dossiers d'une facture par pourcentage
    public long getDetailsFactureCount(String lg_FACTURE_ID, int tauxcouverture) {
        long count = 0l;
        try {

            count = this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o) FROM TFactureDetail o,TFacture f,TPreenregistrementCompteClientTiersPayent p WHERE f.lgFACTUREID=o.lgFACTUREID.lgFACTUREID AND p.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=o.strREF AND o.lgFACTUREID.lgFACTUREID=?1 AND p.intPERCENT=?2",
                    Long.TYPE).setParameter(1, lg_FACTURE_ID).setParameter(2, tauxcouverture).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public boolean InvoiceDetail(TFacture OTFacture, TPreenregistrementCompteClientTiersPayent payent, Double Montant,
            String str_ref_description, String str_PKEY_PREENREGISTREMENT, double montantBrut, double montantRemise) {
        TFactureDetail OTFactureDetail = new TFactureDetail();
        try {

            if (OTFacture == null) {
                this.buildErrorTraceMessage("Impossible de creer le detail de la facture ");
                return false;
            }
            String str_CATEGORY = "";
            if (payent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                    .getLgCATEGORYCLIENTID() != null) {
                str_CATEGORY = payent.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                        .getLgCATEGORYCLIENTID().getStrLIBELLE();
            }
            TPreenregistrement preenregistrement = payent.getLgPREENREGISTREMENTID();
            OTFactureDetail.setLgFACTUREDETAILID(new date().getComplexId());
            OTFactureDetail.setLgFACTUREID(OTFacture);
            OTFactureDetail.setStrREF(payent.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
            OTFactureDetail.setStrREFDESCRIPTION(str_ref_description);
            OTFactureDetail.setStrCATEGORYCLIENT(str_CATEGORY);
            OTFactureDetail.setDblMONTANT(Montant);
            OTFactureDetail.setDblMONTANTBrut(BigDecimal.valueOf(montantBrut));
            OTFactureDetail.setDblMONTANTPAYE(0.0);
            OTFactureDetail.setPKey(str_PKEY_PREENREGISTREMENT);
            OTFactureDetail.setDblMONTANTREMISE(BigDecimal.valueOf(montantRemise));
            OTFactureDetail.setDblMONTANTRESTANT(Montant);
            OTFactureDetail.setStrSTATUT(commonparameter.statut_enable);
            OTFactureDetail.setDtCREATED(new Date());
            OTFactureDetail.setStrFIRSTNAMECUSTOMER(preenregistrement.getStrFIRSTNAMECUSTOMER());
            OTFactureDetail.setStrLASTNAMECUSTOMER(preenregistrement.getStrLASTNAMECUSTOMER());
            OTFactureDetail.setStrNUMEROSECURITESOCIAL(preenregistrement.getStrNUMEROSECURITESOCIAL());
            OTFactureDetail.setAyantDroit(preenregistrement.getAyantDroit());
            OTFactureDetail.setClient(preenregistrement.getClient());
            OTFactureDetail.setMontantRemiseVente(preenregistrement.getIntPRICEREMISE());
            OTFactureDetail.setMontantTvaVente(preenregistrement.getMontantTva());
            OTFactureDetail.setMontantVente(preenregistrement.getIntPRICE());
            OTFactureDetail.setDateOperation(preenregistrement.getDtUPDATED());
            OTFactureDetail.setTaux(payent.getIntPERCENT());
            this.getOdataManager().getEm().persist(OTFactureDetail);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return true;
        } catch (Exception e) {
            this.buildErrorTraceMessage(
                    "Impossible de creer le detail de la facture " + OTFactureDetail.getLgFACTUREDETAILID(),
                    e.getMessage());
            return false;
        }

    }

    private boolean getParametreFacturation() {
        try {
            TParameters o = this.getOdataManager().getEm().find(TParameters.class,
                    Parameter.KEY_CODE_NUMERARTION_FACTURE);
            return Integer.valueOf(o.getStrVALUE()).compareTo(1) == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public TFacture createInvoiceItem(Date dt_debut, Date dt_fin, double d_montant, String str_pere,
            TTypeFacture OTTypeFacture, String str_CODE_COMPTABLE, TTiersPayant str_CUSTOMER, Integer NB_DOSSIER,
            long montantRemise, long montantFofetaire) {
        try {
            TFacture OTFacture = new TFacture();
            if (OTTypeFacture == null) {
                return null;
            }
            TParameters OParameters = this.getOdataManager().getEm().find(TParameters.class,
                    Parameter.KEY_CODE_FACTURE);
            boolean numerationFacture = getParametreFacturation();

            String CODEFACTURE = OParameters.getStrVALUE();

            OTFacture.setLgFACTUREID(new date().getComplexId());
            OTFacture.setDtDEBUTFACTURE(dt_debut);

            if (str_pere == null) {
                OTFacture.setStrPERE(OTFacture.getLgFACTUREID());
            } else {
                OTFacture.setStrPERE(str_pere);
            }

            OTFacture.setLgTYPEFACTUREID(OTTypeFacture);
            OTFacture.setDtFINFACTURE(dt_fin);
            OTFacture.setStrCUSTOMER(str_CUSTOMER.getLgTIERSPAYANTID());
            OTFacture.setDtDATEFACTURE(new Date());
            OTFacture.setTiersPayant(str_CUSTOMER);
            OTFacture.setTemplate(Boolean.FALSE);
            // add nombre dossier
            OTFacture.setDblMONTANTCMDE((d_montant - montantRemise));

            if (numerationFacture) {
                OTFacture.setStrCODEFACTURE(
                        LocalDate.now().format(DateTimeFormatter.ofPattern("yy")).concat("_").concat(CODEFACTURE));
            } else {
                OTFacture.setStrCODEFACTURE(CODEFACTURE);
            }

            OTFacture.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
            OTFacture.setDblMONTANTRESTANT((d_montant - montantRemise));
            OTFacture.setDblMONTANTPAYE(0.0);
            OTFacture.setDblMONTANTBrut(new BigDecimal(0));
            OTFacture.setDblMONTANTFOFETAIRE(new BigDecimal(0));
            OTFacture.setDblMONTANTREMISE(new BigDecimal(0));
            OTFacture.setIntNBDOSSIER(NB_DOSSIER);
            OTFacture.setDtCREATED(new Date());
            OTFacture.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().persist(OTFacture);
            OParameters.setStrVALUE((Integer.parseInt(CODEFACTURE) + 1) + "");
            this.getOdataManager().getEm().merge(OParameters);
            String description = "Génération de la facture numéro : " + OTFacture.getStrCODEFACTURE() + " période du "
                    + DateConverter.convertDateToDD_MM_YYYY(OTFacture.getDtDEBUTFACTURE()) + " Au "
                    + DateConverter.convertDateToDD_MM_YYYY(OTFacture.getDtFINFACTURE()) + " tiers-payant: "
                    + OTFacture.getTiersPayant().getStrFULLNAME() + " ";
            updateItem(this.getOTUser(), "", description, TypeLog.GENERATION_DE_FACTURE, OTFacture,
                    this.getOdataManager().getEm());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            return OTFacture;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer une facture ", e.getMessage());

            return null;
        }

    }

    // autoriser les ventes avec ce tierspayant en fonction du plafond de credit
    private void updateInvoicePlafond(TFacture facture, TTiersPayant OTTiersPayant) {
        boolean isAbsolute = OTTiersPayant.getBCANBEUSE();
        if (!isAbsolute) {
            OTTiersPayant.setDbCONSOMMATIONMENSUELLE(0);
            OTTiersPayant.setBCANBEUSE(true);
            this.getOdataManager().getEm().merge(OTTiersPayant);
        }
        List<TCompteClientTiersPayant> list = (List<TCompteClientTiersPayant>) OTTiersPayant
                .getTCompteClientTiersPayantCollection();
        list.stream().filter((compteClientTiersPayant) -> (!compteClientTiersPayant.getBIsAbsolute()))
                .map((compteClientTiersPayant) -> {
                    compteClientTiersPayant.setBCANBEUSE(true);
                    return compteClientTiersPayant;
                }).map((compteClientTiersPayant) -> {
                    compteClientTiersPayant.setDbCONSOMMATIONMENSUELLE(0);
                    return compteClientTiersPayant;
                }).forEachOrdered((compteClientTiersPayant) -> {
                    this.getOdataManager().getEm().merge(compteClientTiersPayant);
                });
    }

    private int getCase(TTiersPayant p) {

        if (p.getIntNBREBONS() > 0 && p.getIntMONTANTFAC() > 0) {
            return 1;
        } else if (p.getIntNBREBONS() > 0 && p.getIntMONTANTFAC() <= 0) {
            return 2;
        } else if (p.getIntNBREBONS() <= 0 && p.getIntMONTANTFAC() > 0) {
            return 1;
        } else if (Boolean.TRUE.equals(p.getGroupingByTaux())) {
            return 3;
        }

        return 0;
    }

    public TGroupeFactures getGroupeFacturesByFacture(String facture) {
        TGroupeFactures factures = null;
        try {
            factures = (TGroupeFactures) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TGroupeFactures o WHERE o.lgFACTURESID.lgFACTUREID =?1")
                    .setMaxResults(1).setParameter(1, facture).getSingleResult();
        } catch (Exception e) {

        }
        return factures;
    }

    public int getGroupeFacturesCountByFacture(String facture) {

        try {
            EntityManager myem = this.getOdataManager().getEm();
            CriteriaBuilder cb = myem.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TGroupeFactures> root = cq.from(TGroupeFactures.class);
            Join<TGroupeFactures, TFacture> join = root.join("lgFACTURESID", JoinType.INNER);
            cq.select(cb.count(root));
            cq.where(cb.equal(join.get(TFacture_.lgFACTUREID), facture));
            Query q = myem.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } finally {

        }

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
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        eventLog.setStrTYPELOG(ref);
        em.persist(eventLog);
    }

    public LinkedList<TFacture> createInvoices(List<TPreenregistrementCompteClientTiersPayent> list, Date dtDebut,
            Date dtFin, String lgTiersPayants) {

        LinkedList<TFacture> factures = new LinkedList<>();

        final TTiersPayant tiersPayant = this.getOdataManager().getEm().find(TTiersPayant.class, lgTiersPayants);

        final double tauxRemise = Objects.nonNull(tiersPayant.getDblPOURCENTAGEREMISE())
                ? (tiersPayant.getDblPOURCENTAGEREMISE() / 100) : 0;
        final double montantForfetaire = Objects.nonNull(tiersPayant.getDblREMISEFORFETAIRE())
                ? tiersPayant.getDblREMISEFORFETAIRE() : 0;

        try {
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();

            }

            if (!list.isEmpty()) {
                TTypeFacture typeFacture = this.getOdataManager().getEm().find(TTypeFacture.class,
                        commonparameter.KEY_TYPE_FACTURE_TIERSPAYANT);
                TTypeMvtCaisse typeMvtCaisse = this.getOdataManager().getEm().find(TTypeMvtCaisse.class,
                        commonparameter.KEY_TYPE_FACTURE_TIERSPAYANT);
                switch (getCase(tiersPayant)) {

                case 1:
                    final long montantFact = list.stream().mapToLong(qty -> qty.getIntPRICE()).sum();
                    if (tiersPayant.getIntMONTANTFAC() < montantFact) {
                        Integer virtualAmont = 0;
                        int myCount = 0;
                        int volatilecount = 0;
                        for (TPreenregistrementCompteClientTiersPayent op : list) {
                            if (virtualAmont > tiersPayant.getIntMONTANTFAC()) {
                                if (myCount < list.size()) {
                                    TFacture of = this.createInvoices(list.subList(volatilecount, myCount - 1), dtDebut,
                                            dtFin, tiersPayant, montantForfetaire, tauxRemise, typeFacture,
                                            typeMvtCaisse);
                                    factures.add(of);
                                } else if (myCount == (list.size() - 1)) {
                                    TFacture of = this.createInvoices(list.subList(volatilecount, list.size()), dtDebut,
                                            dtFin, tiersPayant, montantForfetaire, tauxRemise, typeFacture,
                                            typeMvtCaisse);
                                    factures.add(of);

                                }

                                volatilecount = (myCount - 1);
                                virtualAmont = (list.get(volatilecount).getIntPRICE())
                                        + (list.get(myCount).getIntPRICE());

                            } else if ((virtualAmont <= tiersPayant.getIntMONTANTFAC())
                                    && (myCount == (list.size() - 1))) {

                                TFacture of = this.createInvoices(list.subList(volatilecount, list.size()), dtDebut,
                                        dtFin, tiersPayant, montantForfetaire, tauxRemise, typeFacture, typeMvtCaisse);
                                factures.add(of);

                            }
                            virtualAmont += op.getIntPRICE();
                            myCount++;

                        }

                    } else {

                        TFacture of = this.createInvoices(list, dtDebut, dtFin, tiersPayant, montantForfetaire,
                                tauxRemise, typeFacture, typeMvtCaisse);

                        factures.add(of);

                    }

                    break;
                case 2:
                    int count = tiersPayant.getIntNBREBONS();
                    int decrementCount = list.size();
                    int _count = tiersPayant.getIntNBREBONS();
                    int virtualCnt = 0;

                    if (list.size() > _count) {
                        while (decrementCount > 0) {

                            if (count < list.size()) {

                                TFacture of = this.createInvoices(list.subList(virtualCnt, count), dtDebut, dtFin,
                                        tiersPayant, montantForfetaire, tauxRemise, typeFacture, typeMvtCaisse);
                                factures.add(of);

                            } else {

                                TFacture of = this.createInvoices(list.subList(virtualCnt, list.size()), dtDebut, dtFin,
                                        tiersPayant, montantForfetaire, tauxRemise, typeFacture, typeMvtCaisse);
                                factures.add(of);

                            }
                            virtualCnt += _count;
                            count += _count;
                            decrementCount -= (_count);
                        }

                    } else {

                        TFacture of = this.createInvoices(list.subList(virtualCnt, list.size()), dtDebut, dtFin,
                                tiersPayant, montantForfetaire, tauxRemise, typeFacture, typeMvtCaisse);
                        factures.add(of);

                    }

                    break;
                case 3:
                    list.stream()
                            .collect(Collectors.groupingBy(TPreenregistrementCompteClientTiersPayent::getIntPERCENT))
                            .forEach((k, values) -> {
                                TFacture of = this.createInvoices(values, dtDebut, dtFin, tiersPayant,
                                        montantForfetaire, tauxRemise, typeFacture, typeMvtCaisse);
                                factures.add(of);

                            });

                    break;
                default:
                    TFacture of = this.createInvoices(list, dtDebut, dtFin, tiersPayant, montantForfetaire, tauxRemise,
                            typeFacture, typeMvtCaisse);
                    factures.add(of);
                    break;

                }

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

                }
            }
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();

            }
            e.printStackTrace(System.err);
            this.buildErrorTraceMessage("La facture n'a pas pu être générée");
        }
        return factures;
    }

    private List<TPreenregistrementDetail> findItems(String OTPreenregistrement) {

        try {

            TypedQuery<TPreenregistrementDetail> q = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE  t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1",
                    TPreenregistrementDetail.class).setParameter(1, OTPreenregistrement);

            return q.getResultList();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    public TFacture createInvoices(List<TPreenregistrementCompteClientTiersPayent> list, Date dtDebut, Date dtFin,
            TTiersPayant tiersPayant, double montantForfetaire, double tauxRemise, TTypeFacture typeFacture,
            TTypeMvtCaisse typeMvtCaisse) {
        TFacture oFacture = null;
        int nbreDossier = 0;
        double totalRemise = 0;
        double totalBrut = 0;
        double montantNetDetails;
        double montantRemiseDetails = 0;
        int montantTva = 0;
        int remiseVente = 0;
        int montantvente = 0;

        try {
            oFacture = this.createInvoiceItem(dtDebut, dtFin, 0d, null, typeFacture,
                    typeMvtCaisse.getStrCODECOMPTABLE(), tiersPayant, nbreDossier, 0, 0);
            if (oFacture != null) {
                for (TPreenregistrementCompteClientTiersPayent op : list) {
                    TPreenregistrement p = op.getLgPREENREGISTREMENTID();
                    montantTva += p.getMontantTva();
                    remiseVente += p.getIntPRICEREMISE();
                    montantvente += p.getIntPRICE();
                    if (op.getIntPERCENT() == 100) {
                        if (tauxRemise > 0 && p.getIntPRICEREMISE() == 0) {
                            montantRemiseDetails = getRemise(tauxRemise,
                                    findItems(op.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID()));
                        }
                    } else {
                        if (tauxRemise > 0) {
                            montantRemiseDetails = getRemise(tauxRemise, op.getIntPRICE());
                        }
                    }

                    totalBrut += op.getIntPRICE();
                    totalRemise += montantRemiseDetails;
                    montantNetDetails = Math.round((op.getIntPRICE() - montantRemiseDetails));
                    if (this.InvoiceDetail(oFacture, op, montantNetDetails,
                            op.getLgPREENREGISTREMENTID().getStrREFBON(),
                            op.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID(), op.getIntPRICE(),
                            montantRemiseDetails)) {
                        op.setStrSTATUTFACTURE(commonparameter.CHARGED);
                        this.getOdataManager().getEm().merge(op);

                    }
                }
                oFacture.setIntNBDOSSIER(list.size());
                oFacture.setDblMONTANTBrut(BigDecimal.valueOf(totalBrut));
                oFacture.setDblMONTANTCMDE((totalBrut - montantForfetaire) - totalRemise);
                oFacture.setDblMONTANTRESTANT((totalBrut - montantForfetaire) - totalRemise);
                oFacture.setDblMONTANTFOFETAIRE(BigDecimal.valueOf(montantForfetaire));
                oFacture.setDblMONTANTREMISE(BigDecimal.valueOf(totalRemise));
                oFacture.setMontantRemiseVente(remiseVente);
                oFacture.setMontantTvaVente(montantTva);
                oFacture.setMontantVente(montantvente);
                this.getOdataManager().getEm().persist(oFacture);
                String description = "Génération de la facture numéro : " + oFacture.getStrCODEFACTURE()
                        + " période du " + DateConverter.convertDateToDD_MM_YYYY(oFacture.getDtDEBUTFACTURE()) + " Au "
                        + DateConverter.convertDateToDD_MM_YYYY(oFacture.getDtFINFACTURE()) + " tiers-payant: "
                        + tiersPayant.getStrFULLNAME() + " ";
                updateItem(this.getOTUser(), "", description, TypeLog.GENERATION_DE_FACTURE, oFacture,
                        this.getOdataManager().getEm());
                updateInvoicePlafond(oFacture, tiersPayant);

            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("La facture n'a pas pu être générée");
        }
        return oFacture;
    }

    // liste des factures
    public List<TFacture> getListFacture(String searchValue, String idFacture, String typeFactureId, Date dtDebut,
            Date dtFin, String strCUSTOMER, String code, String impayes, int start, int limit) {

        String impayerClause = " AND t.dblMONTANTRESTANT >0 ";
        if (StringUtils.isEmpty(impayes)) {
            impayerClause = "";
        } else {
            if (impayes.equals("payes")) {
                impayerClause = " AND t.dblMONTANTRESTANT = 0 ";
            }
        }
        try {
            if ("".equals(searchValue)) {
                searchValue = "%%";
            }

            String query = "SELECT DISTINCT t FROM TFacture t,TTiersPayant p,TFactureDetail d,TPreenregistrementCompteClientTiersPayent pc,TPreenregistrement pr WHERE t.lgFACTUREID LIKE ?1 AND (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR d.strFIRSTNAMECUSTOMER LIKE ?2 OR d.strLASTNAMECUSTOMER LIKE ?2 OR d.strNUMEROSECURITESOCIAL LIKE ?2 OR pr.strREF LIKE ?2 OR pr.strREFTICKET LIKE ?2) AND (t.dtCREATED >= ?6 AND t.dtCREATED <= ?7) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND pc.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=d.strREF AND pr.lgPREENREGISTREMENTID=pc.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  AND ( t.template <> TRUE OR t.template IS NULL) %s ORDER BY  t.dtCREATED DESC,t.strCODEFACTURE DESC";

            if (StringUtils.isNotEmpty(code)) {
                return this.getOdataManager().getEm().createQuery(String.format(
                        "SELECT t FROM TFacture t WHERE t.strCODEFACTURE LIKE ?1 AND ( t.template <> TRUE OR t.template IS NULL) %s",
                        impayerClause)).setParameter(1, code + "%").getResultList();
            } else {
                TypedQuery<TFacture> q = this.getOdataManager().getEm()
                        .createQuery(String.format(query, impayerClause), TFacture.class).setParameter(1, idFacture)
                        .setParameter(2, searchValue + "%").setParameter(6, dtDebut).setParameter(7, dtFin)
                        .setParameter(8, strCUSTOMER);
                if (limit > 0) {
                    q.setFirstResult(start).setMaxResults(limit);
                }

                return q.getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return Collections.emptyList();
    }
    // fin liste des factures

    // liste des factures
    public int getListFacturesCount(String searchValue, String lg_FACTURE_ID, String lg_TYPE_FACTURE_ID, Date dt_debut,
            Date dt_fin, String str_CUSTOMER, String code, String impayes) {
        String impayerClause = " AND t.dblMONTANTRESTANT >0 ";
        if (StringUtils.isEmpty(impayes)) {
            impayerClause = "";
        }
        Long count = 0l;
        try {
            if ("".equals(searchValue)) {
                searchValue = "%%";
            }
            if (!"".equals(code)) {
                count = (Long) this.getOdataManager().getEm().createQuery(String.format(
                        "SELECT COUNT(t) FROM TFacture t WHERE t.strCODEFACTURE LIKE ?1 AND ( t.template <> TRUE OR t.template IS NULL) %s",
                        impayerClause)).setParameter(1, code + "%").getSingleResult();
            } else {
                count = (Long) this.getOdataManager().getEm().createQuery(String.format(
                        "SELECT COUNT(DISTINCT t) FROM TFacture t,TTiersPayant p,TFactureDetail d,TPreenregistrementCompteClientTiersPayent pc,TPreenregistrement pr WHERE t.lgFACTUREID LIKE ?1 AND (t.strCODEFACTURE LIKE ?2  OR p.strFULLNAME LIKE ?2 OR p.strNAME LIKE ?2 OR d.strFIRSTNAMECUSTOMER LIKE ?2 OR d.strLASTNAMECUSTOMER LIKE ?2 OR d.strNUMEROSECURITESOCIAL LIKE ?2 OR pr.strREF LIKE ?2 OR pr.strREFTICKET LIKE ?2) AND (t.dtCREATED >= ?6 AND t.dtCREATED <= ?7) AND t.strCUSTOMER LIKE ?8 AND t.strCUSTOMER=p.lgTIERSPAYANTID  AND t.lgFACTUREID=d.lgFACTUREID.lgFACTUREID  AND pc.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=d.strREF AND pr.lgPREENREGISTREMENTID=pc.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID AND ( t.template <> TRUE OR t.template IS NULL) %s",
                        impayerClause)).setParameter(1, lg_FACTURE_ID).setParameter(2, searchValue + "%")
                        .setParameter(6, dt_debut).setParameter(7, dt_fin).setParameter(8, str_CUSTOMER)
                        .getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return count.intValue();
    }

    public JSONArray getCmpt(String facture) {
        JSONArray array = new JSONArray();
        String sql = "SELECT \n" + "    SUM(fd.dbl_MONTANT_RESTANT) AS total_montant_restant,"
                + "    c.str_NUMERO_SECURITE_SOCIAL," + "    c.str_FIRST_NAME," + "    c.str_LAST_NAME,"
                + "    cc_tp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS idcmp,"
                + "    COUNT(fd.lg_FACTURE_DETAIL_ID) AS nb_facture_details,DATE(preenreg.dt_UPDATED) AS dateMvt  FROM t_compte_client_tiers_payant cc_tp"
                + " INNER JOIN t_preenregistrement_compte_client_tiers_payent preenreg "
                + " ON cc_tp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = preenreg.lg_COMPTE_CLIENT_TIERS_PAYANT_ID "
                + " INNER JOIN t_compte_client cc " + "    ON cc_tp.lg_COMPTE_CLIENT_ID = cc.lg_COMPTE_CLIENT_ID"
                + " INNER JOIN t_client c " + "    ON cc.lg_CLIENT_ID = c.lg_CLIENT_ID "
                + "INNER JOIN t_facture_detail fd"
                + " ON preenreg.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = fd.str_REF "
                + "INNER JOIN t_preenregistrement pr ON pr.lg_PREENREGISTREMENT_ID=preenreg.lg_PREENREGISTREMENT_ID "
                + "WHERE fd.lg_FACTURE_ID = ?1 " + "GROUP BY "
                + " cc_tp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID,DATE(preenreg.dt_UPDATED) " + "ORDER BY "
                + "c.str_FIRST_NAME," + " c.str_LAST_NAME ";
        try {

            List<Object[]> details = this.getOdataManager().getEm().createNativeQuery(sql).setParameter(1, facture)
                    .getResultList();

            for (Object[] detail : details) {
                JSONObject json = new JSONObject();
                json.put("Montant", detail[0]).put("strNUMEROSECURITESOCIAL", detail[1])
                        .put("strFIRSTNAME", detail[2] + " " + detail[3]).put("idcmp", detail[4])
                        .put("NBONS", Integer.valueOf(detail[5] + "")).put("dateMvt", detail[6] + "");
                array.put(json);

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public Double getAmount(String facture) {
        Object amount = 0;
        try {
            amount = this.getOdataManager().getEm().createQuery(
                    "SELECT  SUM(o.dblMONTANTRESTANT)  FROM TFactureDetail o WHERE o.lgFACTUREID.lgFACTUREID=?1 ")
                    .setParameter(1, facture).getSingleResult();

        } catch (Exception e) {
        }
        return Double.valueOf(amount + "");
    }

    public String getGroupeFacturesCodeByFacture(String facture) {
        String code = null;
        try {
            EntityManager myem = this.getOdataManager().getEm();
            CriteriaBuilder cb = myem.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TGroupeFactures> root = cq.from(TGroupeFactures.class);
            Join<TGroupeFactures, TFacture> join = root.join("lgFACTURESID", JoinType.INNER);
            cq.select(root.get(TGroupeFactures_.strCODEFACTURE)).distinct(true);
            cq.where(cb.equal(join.get(TFacture_.lgFACTUREID), facture));
            Query q = myem.createQuery(cq);
            q.setMaxResults(1);
            code = (String) q.getSingleResult();

        } catch (Exception e) {

        }
        return code;
    }

    private int getRemise(double tauxRemise, List<TPreenregistrementDetail> lstTPreenregistrementDetail) {

        double sumRemise = 0;
        for (TPreenregistrementDetail x : lstTPreenregistrementDetail) {
            TFamille famille = x.getLgFAMILLEID();
            if (!StringUtils.isEmpty(famille.getStrCODEREMISE()) && !famille.getStrCODEREMISE().equals("2")
                    && !famille.getStrCODEREMISE().equals("3")) {
                sumRemise += (Double.valueOf(x.getIntPRICE()) * tauxRemise);
            }
        }
        return (int) Math.round(sumRemise);

    }

    private int getRemise(double tauxRemise, int amount) {

        return (int) Math.round(Double.valueOf(amount) * tauxRemise);

    }

}
