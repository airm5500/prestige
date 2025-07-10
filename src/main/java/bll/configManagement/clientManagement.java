/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.Util;
import dal.TVille;
import dal.TClient;
import dal.TCompteClient;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TUser;
import bll.bllBase;
import bll.tierspayantManagement.tierspayantManagement;
import dal.TAyantDroit;
import dal.TCategorieAyantdroit;
import dal.TCategoryClient;
import dal.TClient_;
import dal.TCompany;
import dal.TCompteClientTiersPayant;
import dal.TFacture;
import dal.TMedecin;
import dal.TMedecinClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementCompteClientTiersPayent_;
import dal.TPreenregistrementDetail;
import dal.TRemise;
import dal.TRisque;
import dal.TTiersPayant;
import dal.TTypeClient;
import dal.TTypeClient_;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.Date;
import java.util.*;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.logger;
import util.DateConverter;

/**
 *
 * @author AKOUAME
 */
public class clientManagement extends bllBase {

    Object Otable = TClient.class;
    TCompteClient OTCompteClient = null;

    public clientManagement(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    public clientManagement(dataManager odataManager) {
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    public boolean isAuthorize(TCompteClient OTCompteClient, String lg_PREENREGISTREMENT_ID,
            String lg_TYPE_REGLEMENT_ID) {
        // verrifiation de lautoo

        // verifi solde
        // verrif du droit au type ddfdfd
        return true;
    }

    public void addToMytransaction(TCompteClient OTCompteClient, String lg_PREENREGISTREMENT_ID) {
        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        TPreenregistrementCompteClient oTPreenregistrementCompteClient = new TPreenregistrementCompteClient();
        oTPreenregistrementCompteClient.setLgPREENREGISTREMENTCOMPTECLIENTID(this.getKey().getComplexId());
        oTPreenregistrementCompteClient.setDtCREATED(new Date());
        oTPreenregistrementCompteClient.setLgCOMPTECLIENTID(OTCompteClient);
        oTPreenregistrementCompteClient.setLgPREENREGISTREMENTID(OTPreenregistrement);
        this.persiste(oTPreenregistrementCompteClient);

        // update du solde
    }

    public void createByAssurance(String str_CODE_INTERNE, String str_FIRST_NAME, String str_LAST_NAME,
            String str_NUMERO_SECURITE_SOCIAL, Date dt_NAISSANCE, String str_SEXE, String str_ADRESSE,
            String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL, String str_COMMENTAIRE,
            String lg_VILLE_ID, String lg_MEDECIN_ID, String lg_CATEGORIE_AYANTDROIT_ID, String lg_RISQUE_ID) {
        String str_type = "1";
        Double dbl_QUOTA_CONSO_MENSUELLE = 0.0;
        Double dbl_CAUTION = 0.0;
        Double dbl_SOLDE = 0.0;
        this.create(str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, dt_NAISSANCE, str_SEXE, str_ADRESSE,
                str_DOMICILE, str_AUTRE_ADRESSE, str_CODE_POSTAL, str_COMMENTAIRE, lg_VILLE_ID,
                dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dbl_SOLDE, str_type, lg_CATEGORIE_AYANTDROIT_ID, lg_RISQUE_ID);
    }

    public void create(String str_FIRST_NAME, String str_LAST_NAME, String str_NUMERO_SECURITE_SOCIAL,
            Date dt_NAISSANCE, String str_SEXE, String str_ADRESSE, String str_DOMICILE, String str_AUTRE_ADRESSE,
            String str_CODE_POSTAL, String str_COMMENTAIRE, String lg_VILLE_ID, Double dbl_QUOTA_CONSO_MENSUELLE,
            Double dbl_CAUTION, Double dbl_SOLDE, String lg_TYPE_CLIENT_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String lg_RISQUE_ID) {
        try {
            new logger().OCategory.info("**********************  CALLAA  -----");
            TClient OTClient = new TClient();
            TTypeClient OTTypeClient = this.getOdataManager().getEm().find(TTypeClient.class, lg_TYPE_CLIENT_ID);
            new logger().OCategory.info("Type client " + OTTypeClient.getStrNAME());
            OTClient.setLgCLIENTID(this.getKey().getComplexId());
            OTClient.setStrCODEINTERNE(this.getKey().getShortId(6));
            OTClient.setStrFIRSTNAME(str_FIRST_NAME);
            OTClient.setStrLASTNAME(str_LAST_NAME);
            OTClient.setLgTYPECLIENTID(OTTypeClient);
            OTClient.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTClient.setDtNAISSANCE(dt_NAISSANCE);
            OTClient.setStrSEXE(str_SEXE);
            OTClient.setStrADRESSE(str_ADRESSE);
            OTClient.setStrDOMICILE(str_DOMICILE);
            OTClient.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTClient.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTClient.setStrCOMMENTAIRE(str_COMMENTAIRE);

            TVille OTVille = this.getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
            if (OTVille == null) {
                System.out.println("***************  " + OTVille);
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        " Ref VILLE : " + OTVille + "  Invalide ");
                return;
            }
            OTClient.setLgVILLEID(OTVille);
            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtCREATED(new Date());

            this.persiste(OTClient);
            new compteClientManagement(this.getOdataManager()).create("", dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION,
                    dbl_SOLDE, OTClient);

            new ayantDroitManagement(this.getOdataManager()).createAyantdroit(OTClient.getLgCLIENTID(),
                    lg_CATEGORIE_AYANTDROIT_ID, str_FIRST_NAME, str_LAST_NAME, str_SEXE, dt_NAISSANCE, lg_VILLE_ID,
                    lg_RISQUE_ID, OTClient.getStrNUMEROSECURITESOCIAL(), OTClient.getStrCODEINTERNE());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer le client");
        }

    }

    // public void update(String lg_CLIENT_ID, String str_CODE_INTERNE, String str_FIRST_NAME, String str_LAST_NAME,
    // String str_NUMERO_SECURITE_SOCIAL, Date dt_NAISSANCE, String str_SEXE,
    // String str_ADRESSE, String str_DOMICILE, String str_AUTRE_ADRESSE,
    // String str_CODE_POSTAL, String str_COMMENTAIRE,
    // String lg_VILLE_ID, String lg_MEDECIN_ID, Double dbl_QUOTA_CONSO_MENSUELLE, Double dbl_CAUTION, Double dbl_SOLDE,
    // String lg_TYPE_CLIENT_ID,
    // String lg_AYANTS_DROITS_ID, String lg_CATEGORIE_AYANTDROIT_ID, String lg_RISQUE_ID) {
    public TCompteClient update(String lg_CLIENT_ID, String str_CODE_INTERNE, String str_FIRST_NAME,
            String str_LAST_NAME, String str_NUMERO_SECURITE_SOCIAL, Date dt_NAISSANCE, String str_SEXE,
            String str_ADRESSE, String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL,
            String str_COMMENTAIRE, String lg_VILLE_ID, String lg_MEDECIN_ID, Double dbl_QUOTA_CONSO_MENSUELLE,
            Double dbl_CAUTION, String lg_TYPE_CLIENT_ID, String lg_AYANTS_DROITS_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String lg_RISQUE_ID, String lg_TIERS_PAYANT_ID, int int_POURCENTAGE, int int_PRIORITY,
            double dbl_QUOTA_CONSO_VENTE, String lg_CATEGORY_CLIENT_ID) {
        TCompteClient OTCompteClient = null;
        try {

            TClient OTClient = null;

            OTClient = getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);
            TCategoryClient categoryClient = null;
            if (!"".equals(lg_CATEGORY_CLIENT_ID)) {
                categoryClient = this.getOdataManager().getEm().find(TCategoryClient.class, lg_CATEGORY_CLIENT_ID);
                OTClient.setLgCATEGORYCLIENTID(categoryClient);
            }
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

             */
            try {
                // TVille OTVille = getOdataManager().getEm().find(dal.TVille.class, lg_VILLE_ID);
                TVille OTVille = (TVille) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TVille t WHERE t.lgVILLEID LIKE ?1 OR t.strName LIKE ?2")
                        .setParameter(1, lg_VILLE_ID).setParameter(2, lg_VILLE_ID).getSingleResult();
                if (OTVille != null) {
                    new logger().oCategory.info("Ville  " + OTVille.getStrName());
                    OTClient.setLgVILLEID(OTVille);
                }

            } catch (Exception e) {

                new logger().oCategory
                        .info("Impossible de mettre a jour les donnees vennant de la cle etrangere TVille   ");
            }

            try {
                TTypeClient OTTypeClient = (TTypeClient) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeClient t WHERE (t.lgTYPECLIENTID LIKE ?1 OR t.strNAME LIKE ?2) AND t.strSTATUT = ?3")
                        .setParameter(1, lg_TYPE_CLIENT_ID).setParameter(2, lg_TYPE_CLIENT_ID)
                        .setParameter(3, commonparameter.statut_enable).getSingleResult();
                if (OTTypeClient != null) {
                    new logger().oCategory.info("Type client  " + OTTypeClient.getStrDESCRIPTION());
                    OTClient.setLgTYPECLIENTID(OTTypeClient);
                }

            } catch (Exception e) {

                new logger().oCategory
                        .info("Impossible de mettre a jour les donnees vennant de la cle etrangere Type client   ");
            }

            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtUPDATED(new Date());

            this.persiste(OTClient);

            TTiersPayant OTTiersPayant = new tierspayantManagement(this.getOdataManager())
                    .getTTiersPayant(lg_TIERS_PAYANT_ID);
            OTCompteClient = this.getTCompteClientByClient(OTClient.getLgCLIENTID());
            try {
                TCompteClientTiersPayant OTCompteClientTiersPayant = new tierspayantManagement(this.getOdataManager())
                        .isRegimeExistForCptltTiersPBis(OTCompteClient.getLgCOMPTECLIENTID(), 1,
                                commonparameter.statut_enable);
                new logger().OCategory.info("Pourcentage " + OTCompteClientTiersPayant.getIntPOURCENTAGE() + "----"
                        + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTYPETIERSPAYANTID()
                                .getLgTYPETIERSPAYANTID());
                if (OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTYPETIERSPAYANTID().getLgTYPETIERSPAYANTID()
                        .equalsIgnoreCase("1")) {
                    new ayantDroitManagement(this.getOdataManager()).updateAyantdroit(lg_AYANTS_DROITS_ID,
                            OTClient.getLgCLIENTID(), lg_CATEGORIE_AYANTDROIT_ID, OTClient.getStrFIRSTNAME(),
                            OTClient.getStrLASTNAME(), OTClient.getStrSEXE(), OTClient.getDtCREATED(),
                            OTClient.getLgVILLEID().getLgVILLEID(), lg_RISQUE_ID,
                            OTClient.getStrNUMEROSECURITESOCIAL());
                } else {
                    if (OTTiersPayant.getLgTYPETIERSPAYANTID().getLgTYPETIERSPAYANTID().equalsIgnoreCase("1")) {
                        new ayantDroitManagement(this.getOdataManager()).createAyantdroit(OTClient.getLgCLIENTID(),
                                lg_CATEGORIE_AYANTDROIT_ID, OTClient.getStrFIRSTNAME(), OTClient.getStrLASTNAME(),
                                OTClient.getStrSEXE(), OTClient.getDtCREATED(), OTClient.getLgVILLEID().getLgVILLEID(),
                                lg_RISQUE_ID, OTClient.getStrNUMEROSECURITESOCIAL(), OTClient.getStrCODEINTERNE());
                    }
                }
                new tierspayantManagement(this.getOdataManager()).updateComptecltTierspayant(
                        OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID(),
                        OTCompteClient.getLgCOMPTECLIENTID(), OTTiersPayant.getLgTIERSPAYANTID(), int_POURCENTAGE,
                        int_PRIORITY, dbl_QUOTA_CONSO_MENSUELLE, dbl_QUOTA_CONSO_VENTE, str_NUMERO_SECURITE_SOCIAL,
                        null, false, false);
            } catch (Exception e) {
            }

            /*
             * OTCompteClient = OTClient.getTCompteClientCollection().iterator().next(); new
             * compteClientManagement(this.getOdataManager()).update(OTCompteClient.getLgCOMPTECLIENTID(), "",
             * dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION);
             */
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTCompteClient;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }
        return OTCompteClient;
    }

    public TCompteClient delete(String lg_CLIENT_ID) {
        TClient OTClient = null;
        TCompteClient OTCompteClient = null;
        try {

            OTClient = getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);
            if (this.isDeleteIsAuthorize(OTClient.getLgCLIENTID())) {
                this.buildErrorTraceMessage(
                        "Impossible de supprimer un client qui a déjà realisé des actions dans le système");
                return null;
            }
            OTClient.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTClient);
            this.do_event_log(this.getOdataManager(), "",
                    "Suppression du client " + OTClient.getStrFIRSTNAME() + " " + OTClient.getStrLASTNAME(),
                    this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable, "t_client", "t_client",
                    "Mouvement sur Client", this.getOTUser().getLgUSERID());

            try {

                new logger().OCategory.info("info compte " + OTClient.getTCompteClientCollection().size());
                Collection<TCompteClient> CollTCompteClient = OTClient.getTCompteClientCollection();
                Iterator iterarorTCompteClient = CollTCompteClient.iterator();

                while (iterarorTCompteClient.hasNext()) {
                    Object elTCompteClient = iterarorTCompteClient.next();
                    OTCompteClient = (TCompteClient) elTCompteClient;
                    new logger().OCategory.info("Compte " + OTCompteClient.getStrCODECOMPTECLIENT());
                    this.refresh(OTCompteClient);
                    OTCompteClient.setStrSTATUT(commonparameter.statut_delete);
                    this.persiste(OTCompteClient);

                    Collection<TCompteClientTiersPayant> CollTCompteClientTiersPayant = OTCompteClient
                            .getTCompteClientTiersPayantCollection();
                    Iterator iterarorTCompteClientTiersPayant = CollTCompteClientTiersPayant.iterator();

                    while (iterarorTCompteClientTiersPayant.hasNext()) {
                        Object elTCompteClientTiersPayant = iterarorTCompteClientTiersPayant.next();
                        TCompteClientTiersPayant OTCompteClientTiersPayant = (TCompteClientTiersPayant) elTCompteClientTiersPayant;
                        new logger().OCategory.info(
                                "Tiers payant " + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                        this.refresh(OTCompteClientTiersPayant);
                        OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_delete);
                        this.persiste(OTCompteClientTiersPayant);
                    }

                }
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            } catch (Exception e) {
                this.buildErrorTraceMessage("Impossible de supprimer un " + Otable, e.getMessage());
            }
            return OTCompteClient;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de supprimer un " + Otable, e.getMessage());
        }
        return OTCompteClient;
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

    /*
     * public TCompteClient getCompteClient(String lg_CLIENT_ID) { TCompteClient OTCompteClient = null; try {
     * OTCompteClient = (TCompteClient)
     * this.getOdataManager().getEm().createQuery("SELECT t FROM TCompteClient t WHERE t.lgCLIENTID.lgCLIENTID = ?1")
     * .setParameter(1, lg_CLIENT_ID).getSingleResult(); } catch (Exception e) { e.printStackTrace(); } return
     * OTCompteClient; }
     */
    public List<TClient> showOnorAllClient(String search_value) {

        List<TClient> lstTClient = new ArrayList<>();

        try {

            lstTClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TClient t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.strNUMEROSECURITESOCIAL LIKE ?1)  AND t.strSTATUT LIKE ?4")
                    .setParameter(1, search_value + "%").setParameter(4, commonparameter.statut_enable).getResultList();
            new logger().OCategory.info("lstTClient size " + lstTClient.size());

            this.buildSuccesTraceMessage("Client(s) Existant(s)   :: " + lstTClient);

        } catch (Exception e) {
            this.buildErrorTraceMessage("Client Inexistant ", e.getMessage());
        }
        return lstTClient;
    }

    public int showOnorAllClientCount(String search_value) {

        try {

            Query q = this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(t) FROM TClient t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.strNUMEROSECURITESOCIAL LIKE ?1)  AND t.strSTATUT LIKE ?4")
                    .setParameter(1, search_value + "%").setParameter(4, commonparameter.statut_enable);

            return ((Long) q.getSingleResult()).intValue();
        } finally {
            // this.getOdataManager().getEm().close();
        }

    }

    public List<TClient> showOnorAllClient(String search_value, int start, int limit) {

        List<TClient> lstTClient = new ArrayList<>();

        try {

            lstTClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TClient t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.strNUMEROSECURITESOCIAL LIKE ?1)  AND t.strSTATUT LIKE ?4  ORDER BY t.strFIRSTNAME,t.strLASTNAME   ")
                    .setParameter(1, search_value + "%").setParameter(4, commonparameter.statut_enable)
                    .setFirstResult(start).setMaxResults(limit).getResultList();
            for (TClient OTClient : lstTClient) {
                this.refresh(OTClient);

            }

            new logger().OCategory.info("lstTClient size " + lstTClient.size());

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTClient;
    }

    public List<TClient> showOnorAllClientByType(String search_value, String lg_TYPE_CLIENT_ID, String str_STATUT) {

        List<TClient> lstTClient = new ArrayList<>();

        try {

            lstTClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TClient t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.strNUMEROSECURITESOCIAL LIKE ?1 OR t.strCODEINTERNE LIKE ?1) AND t.lgTYPECLIENTID.lgTYPECLIENTID LIKE ?3 AND t.strSTATUT LIKE ?4 ORDER BY t.lgTYPECLIENTID.strDESCRIPTION, t.strFIRSTNAME ")
                    .setParameter(1, search_value + "%").setParameter(3, lg_TYPE_CLIENT_ID).setParameter(4, str_STATUT)
                    .getResultList();

            // this.buildSuccesTraceMessage("Client(s) Existant(s) Taille :: " + lstTClient.size());
        } catch (Exception e) {
            e.printStackTrace();
            // this.buildErrorTraceMessage("Client Inexistant ", e.getMessage());
        }
        new logger().OCategory.info("lstTClient taille " + lstTClient.size());
        return lstTClient;
    }

    public List<TClient> showOnorAllClientByType(String search_value, String lg_TYPE_CLIENT_ID, String str_STATUT,
            int start, int limit) {

        List<TClient> lstTClient = new ArrayList<>();

        try {

            lstTClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TClient t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.strNUMEROSECURITESOCIAL LIKE ?1 OR t.strCODEINTERNE LIKE ?1) AND t.lgTYPECLIENTID.lgTYPECLIENTID LIKE ?3 AND t.strSTATUT LIKE ?4 ORDER BY t.lgTYPECLIENTID.strDESCRIPTION, t.strFIRSTNAME,t.strLASTNAME ")
                    .setParameter(1, search_value + "%").setParameter(3, lg_TYPE_CLIENT_ID).setParameter(4, str_STATUT)
                    .setFirstResult(start).setMaxResults(limit).getResultList();
            for (TClient tClient : lstTClient) {
                this.refresh(tClient);
            }
            // this.buildSuccesTraceMessage("Client(s) Existant(s) Taille :: " + lstTClient.size());
        } catch (Exception e) {
            e.printStackTrace();
            // this.buildErrorTraceMessage("Client Inexistant ", e.getMessage());
        }
        new logger().OCategory.info("lstTClient taille " + lstTClient.size());
        return lstTClient;
    }

    // liste des tiers payants d'un client
    public List<TTiersPayant> GetAllTierspayantgeAuthorize_To_Client(String lg_COMPTE_CLIENT_ID) {
        List<TTiersPayant> LstTTiersPayant = new ArrayList<>();
        String qry = "";
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            new logger().OCategory
                    .info("GetAllTierspayantgeAuthorize_To_Client lg_COMPTE_CLIENT_ID  " + lg_COMPTE_CLIENT_ID);

            qry = "select t_tiers_payant.lg_TIERS_PAYANT_ID, t_tiers_payant.str_NAME, t_tiers_payant.str_CODE_ORGANISME FROM t_tiers_payant WHERE t_tiers_payant.lg_TIERS_PAYANT_ID IN (SELECT t_compte_client_tiers_payant.lg_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant WHERE t_compte_client_tiers_payant.lg_COMPTE_CLIENT_ID LIKE '"
                    + lg_COMPTE_CLIENT_ID + "') ORDER BY t_tiers_payant.str_NAME DESC";
            Ojconnexion.set_Request(qry);
            new logger().OCategory.info(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TTiersPayant OTTiersPayant = new TTiersPayant();
                OTTiersPayant.setLgTIERSPAYANTID(Ojconnexion.get_resultat().getString("lg_TIERS_PAYANT_ID"));
                OTTiersPayant.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTTiersPayant.setStrCODEORGANISME(Ojconnexion.get_resultat().getString("str_CODE_ORGANISME"));
                LstTTiersPayant.add(OTTiersPayant);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory
                .info("size LstTTiersPayant dans GetAllTierspayantgeAuthorize_To_Client:" + LstTTiersPayant.size());
        return LstTTiersPayant;
    }
    // fin liste des tiers pays d'un client

    // liste des tiers payants qui ne sont pas encore associé à un client
    public List<TTiersPayant> GetAllTierspayantgeUnAuthorize_To_Client(String lg_COMPTE_CLIENT_ID) {
        List<TTiersPayant> LstTTiersPayant = new ArrayList<TTiersPayant>();
        String qry = "";
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            new logger().OCategory
                    .info("GetAllTierspayantgeUnAuthorize_To_Client lg_COMPTE_CLIENT_ID  " + lg_COMPTE_CLIENT_ID);

            qry = "select t_tiers_payant.lg_TIERS_PAYANT_ID, t_tiers_payant.str_NAME, t_tiers_payant.str_CODE_ORGANISME FROM t_tiers_payant WHERE t_tiers_payant.lg_TIERS_PAYANT_ID NOT IN (SELECT t_compte_client_tiers_payant.lg_TIERS_PAYANT_ID FROM t_compte_client_tiers_payant WHERE t_compte_client_tiers_payant.lg_COMPTE_CLIENT_ID LIKE '"
                    + lg_COMPTE_CLIENT_ID + "') ORDER BY t_tiers_payant.str_NAME DESC";
            Ojconnexion.set_Request(qry);
            new logger().OCategory.info(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TTiersPayant OTTiersPayant = new TTiersPayant();
                OTTiersPayant.setLgTIERSPAYANTID(Ojconnexion.get_resultat().getString("lg_TIERS_PAYANT_ID"));
                OTTiersPayant.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTTiersPayant.setStrCODEORGANISME(Ojconnexion.get_resultat().getString("str_CODE_ORGANISME"));
                LstTTiersPayant.add(OTTiersPayant);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory
                .info("size LstTTiersPayant dans GetAllTierspayantgeUnAuthorize_To_Client:" + LstTTiersPayant.size());
        return LstTTiersPayant;
    }
    // fin liste des tiers payants qui ne sont pas encore associé à un client

    // liste des tiers payants d'un client
    public List<TCompteClientTiersPayant> getTiersPayantsByClient(String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<TCompteClientTiersPayant>();
        try {
            lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?1 AND t.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?2 AND t.lgCOMPTECLIENTID.strSTATUT = ?3 AND t.lgTIERSPAYANTID.strSTATUT = ?3")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(2, lg_TIERS_PAYANT_ID)
                    .setParameter(3, commonparameter.statut_enable).getResultList();
            for (TCompteClientTiersPayant OTCompteClientTiersPayant : lstTCompteClientTiersPayant) {
                this.refresh(OTCompteClientTiersPayant);
                new logger().OCategory.info(
                        "Client " + OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                                + " Tiers payants " + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTCompteClientTiersPayant;
    }

    public List<TCompteClientTiersPayant> getTiersPayantsByClient(String search_value, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?1 AND t.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?2 AND t.lgCOMPTECLIENTID.strSTATUT = ?3 AND t.strSTATUT = ?3 AND t.lgTIERSPAYANTID.strSTATUT = ?3 AND t.lgTIERSPAYANTID.strFULLNAME LIKE ?4 ORDER BY t.intPRIORITY ASC")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(4, search_value + "%")
                    .setParameter(2, lg_TIERS_PAYANT_ID).setParameter(3, commonparameter.statut_enable).getResultList();
            /*
             * for (TCompteClientTiersPayant OTCompteClientTiersPayant : lstTCompteClientTiersPayant) {
             * this.refresh(OTCompteClientTiersPayant); new logger().OCategory.info("Client " +
             * OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME() + " Tiers payants " +
             * OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME()); }
             */
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTCompteClientTiersPayant;
    }

    public List<TCompteClientTiersPayant> getTiersPayantsByClient(String search_value, String lg_COMPTE_CLIENT_ID,
            String lg_TIERS_PAYANT_ID, String str_STATUT) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<TCompteClientTiersPayant>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgCOMPTECLIENTID.lgCOMPTECLIENTID LIKE ?1 AND t.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?2 AND t.lgCOMPTECLIENTID.strSTATUT = ?3 AND t.lgTIERSPAYANTID.strSTATUT = ?3 AND t.lgTIERSPAYANTID.strFULLNAME LIKE ?4 ORDER BY t.intPRIORITY ASC")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(4, search_value + "%")
                    .setParameter(2, lg_TIERS_PAYANT_ID).setParameter(3, str_STATUT).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTCompteClientTiersPayant;
    }

    // fin liste des tiers payants d'un client
    // DEBUT LES MEDECINS D'UN CLIENT DONNE
    public List<TMedecin> GetAllMedecingeAuthorize_To_Client(String lg_CLIENT_ID) {
        List<TMedecin> LstTMedecin = new ArrayList<TMedecin>();
        String qry = "";
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            new logger().OCategory.info("GetAllMedecingeAuthorize_To_Client lg_CLIENT_ID  " + lg_CLIENT_ID);

            qry = "select t_medecin.lg_MEDECIN_ID,t_medecin.str_FIRST_NAME, t_medecin.str_LAST_NAME FROM t_medecin WHERE t_medecin.lg_MEDECIN_ID IN (SELECT t_medecin_client.lg_MEDECIN_ID FROM t_medecin_client WHERE t_medecin_client.lg_CLIENT_ID  LIKE '"
                    + lg_CLIENT_ID + "') ORDER BY t_medecin.str_FIRST_NAME DESC";
            Ojconnexion.set_Request(qry);
            new logger().OCategory.info(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TMedecin OTMedecin = new TMedecin();
                OTMedecin.setLgMEDECINID(Ojconnexion.get_resultat().getString("lg_MEDECIN_ID"));
                OTMedecin.setStrFIRSTNAME(Ojconnexion.get_resultat().getString("str_FIRST_NAME"));
                OTMedecin.setStrLASTNAME(Ojconnexion.get_resultat().getString("str_LAST_NAME"));
                LstTMedecin.add(OTMedecin);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("size LstTMedecin dans GetAllMedecingeAuthorize_To_Client:" + LstTMedecin.size());
        return LstTMedecin;
    }
    // FIN LES MEDECINS D'UN CLIENT DONNE

    // DEBUT LES MEDECINS NON ASSOCIE A UN CLIENT DONNE
    public List<TMedecin> GetAllMedecingeUnAuthorize_To_Client(String lg_CLIENT_ID) {
        List<TMedecin> LstTMedecin = new ArrayList<TMedecin>();
        String qry = "";
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            new logger().OCategory.info("GetAllMedecingeAuthorize_To_Client lg_CLIENT_ID  " + lg_CLIENT_ID);

            qry = "select t_medecin.lg_MEDECIN_ID,t_medecin.str_FIRST_NAME, t_medecin.str_LAST_NAME FROM t_medecin WHERE t_medecin.lg_MEDECIN_ID NOT IN (SELECT t_medecin_client.lg_MEDECIN_ID FROM t_medecin_client WHERE t_medecin_client.lg_CLIENT_ID  LIKE '"
                    + lg_CLIENT_ID + "') ORDER BY t_medecin.str_FIRST_NAME DESC";
            Ojconnexion.set_Request(qry);
            new logger().OCategory.info(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TMedecin OTMedecin = new TMedecin();
                OTMedecin.setLgMEDECINID(Ojconnexion.get_resultat().getString("lg_MEDECIN_ID"));
                OTMedecin.setStrFIRSTNAME(Ojconnexion.get_resultat().getString("str_FIRST_NAME"));
                OTMedecin.setStrLASTNAME(Ojconnexion.get_resultat().getString("str_LAST_NAME"));
                LstTMedecin.add(OTMedecin);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("size LstTMedecin dans GetAllMedecingeAuthorize_To_Client:" + LstTMedecin.size());
        return LstTMedecin;
    }

    // FIN LES MEDECINS NON ASSOCIE A UN CLIENT DONNE
    public void create_medecin_client(String lg_MEDECIN_ID, String lg_CLIENT_ID, String str_SOINS) {
        TMedecinClient OTMedecinClient = null;
        try {

            try {
                OTMedecinClient = (TMedecinClient) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TMedecinClient t WHERE t.lgMEDECINID.lgMEDECINID = ?1 AND t.lgCLIENTID.lgCLIENTID = ?2")
                        .setParameter(1, lg_MEDECIN_ID).setParameter(2, lg_CLIENT_ID).getSingleResult();
                new logger().OCategory.info("Client " + OTMedecinClient.getLgCLIENTID().getStrFIRSTNAME() + " Medecin "
                        + OTMedecinClient.getLgMEDECINID().getStrFIRSTNAME());
                this.buildSuccesTraceMessage(
                        this.getOTranslate().getValue("Ce medecin a été déjà enregistré pour ce client"));
            } catch (Exception e) {
                OTMedecinClient = new TMedecinClient();

                OTMedecinClient.setLgMEDECINCLIENTID(this.getKey().getComplexId());
                OTMedecinClient.setStrSOINS(str_SOINS);

                TClient OTClient = this.getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);
                if (OTClient == null) {
                    this.buildErrorTraceMessage("Client inexistant " + lg_CLIENT_ID);
                    return;
                }
                OTMedecinClient.setLgCLIENTID(OTClient);

                TMedecin OTMedecin = this.getOdataManager().getEm().find(TMedecin.class, lg_MEDECIN_ID);
                if (OTMedecin == null) {
                    this.buildErrorTraceMessage("Medecin inexistant " + lg_MEDECIN_ID);
                    return;
                }
                OTMedecinClient.setLgMEDECINID(OTMedecin);

                OTMedecinClient.setStrSTATUT(commonparameter.statut_enable);
                OTMedecinClient.setDtCREATED(new Date());

                this.persiste(OTMedecinClient);

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible d\'associer un medecin a un client");
        }
    }

    public void delete_medecin_client(String lg_MEDECIN_ID, String lg_CLIENT_ID) {
        List<TMedecinClient> lstTMedecinClient = new ArrayList<TMedecinClient>();
        try {

            new logger().OCategory.info(" ID Client " + lg_MEDECIN_ID);
            new logger().OCategory.info(" ID Tiers Payant " + lg_CLIENT_ID);
            lstTMedecinClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMedecinClient t WHERE t.lgMEDECINID.lgMEDECINID = ?1 AND t.lgCLIENTID.lgCLIENTID = ?2")
                    .setParameter(1, lg_MEDECIN_ID).setParameter(2, lg_CLIENT_ID).getResultList();

            for (TMedecinClient OTMedecinClient : lstTMedecinClient) {
                this.refresh(OTMedecinClient);
                this.delete(OTMedecinClient);
            }

            // OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_delete);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer le medecin pour ce client");
        }

    }

    private TRemise findRemiseById(String remiseId) {
        if (remiseId == null) {
            return null;
        }
        try {
            return this.getOdataManager().getEm().find(TRemise.class, remiseId);
        } catch (Exception e) {
            return null;
        }
    }

    public TCompteClient createClient(String str_FIRST_NAME, String str_LAST_NAME, String str_NUMERO_SECURITE_SOCIAL,
            Date dt_NAISSANCE, String str_SEXE, String str_ADRESSE, String str_DOMICILE, String str_AUTRE_ADRESSE,
            String str_CODE_POSTAL, String str_COMMENTAIRE, String lg_VILLE_ID, Double dbl_QUOTA_CONSO_MENSUELLE,
            Double dbl_CAUTION, int dbl_SOLDE, String lg_TYPE_CLIENT_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String lg_RISQUE_ID, String lg_TIERS_PAYANT_ID, int int_POURCENTAGE, int int_PRIORITY,
            String str_CODE_INTERNE, Double dbl_QUOTA_CONSO_VENTE, String lg_COMPANY_ID, Integer dbPLAFONDENCOURS,
            boolean b_IsAbsolute, String remiseId) {

        TClient OTClient = null;
        TCompteClient OTCompteClient = null;

        try {

            OTClient = new TClient();
            TTiersPayant OTTiersPayant = null;
            TTypeClient OTTypeClient = this.getOdataManager().getEm().find(TTypeClient.class, lg_TYPE_CLIENT_ID);

            if (!OTTypeClient.getLgTYPECLIENTID().equals("6")) {
                OTTiersPayant = new tierspayantManagement(this.getOdataManager()).getTTiersPayant(lg_TIERS_PAYANT_ID);
            }
            TCompany categoryClient = null;
            if (!"".equals(lg_COMPANY_ID)) {
                categoryClient = this.getOdataManager().getEm().find(TCompany.class, lg_COMPANY_ID);
                OTClient.setLgCOMPANYID(categoryClient);
            }
            OTClient.setLgCLIENTID(this.getKey().getComplexId());

            if ("".equals(str_CODE_INTERNE) || str_CODE_INTERNE == null) {
                str_CODE_INTERNE = this.getKey().getShortId(6);
            }
            OTClient.setStrCODEINTERNE(str_CODE_INTERNE);
            OTClient.setStrFIRSTNAME(str_FIRST_NAME);
            OTClient.setStrLASTNAME(str_LAST_NAME);
            OTClient.setLgTYPECLIENTID(OTTypeClient);
            OTClient.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTClient.setDtNAISSANCE(dt_NAISSANCE);
            OTClient.setStrSEXE(str_SEXE);
            OTClient.setStrADRESSE(str_ADRESSE);
            OTClient.setStrDOMICILE(str_DOMICILE);
            OTClient.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTClient.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTClient.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTClient.setStrCODEINTERNE(str_CODE_INTERNE);
            OTClient.setRemise(findRemiseById(remiseId));

            try {
                TVille OTVille = this.getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
                OTClient.setLgVILLEID(OTVille);
            } catch (Exception e) {
            }

            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtCREATED(new Date());

            // check for an existing one
            if (doesCodeInternClientExist(str_CODE_INTERNE)) {

                this.buildErrorTraceMessage("Impossible de créer ce client. Le code interne existe déjà");
                return null;
            }

            if (!str_NUMERO_SECURITE_SOCIAL.equalsIgnoreCase("")) {
                if (doesNumeroSecuriteSocialExist(str_NUMERO_SECURITE_SOCIAL)) {
                    this.buildErrorTraceMessage(
                            "Impossible de créer ce client. Le numéro de sécurité social existe déjà");
                    return null;

                }
            }

            this.persiste(OTClient);
            try {
                // OTCompteClient = new compteClientManagement(this.getOdataManager()).createCompteClient("",
                // dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dbl_SOLDE, commonparameter.clt_CLIENT,
                // OTClient.getLgCLIENTID()); // a decommenter en cas de probleme
                OTCompteClient = new compteClientManagement(this.getOdataManager()).createCompteClient("", 0.0,
                        dbl_CAUTION, dbl_SOLDE, commonparameter.clt_CLIENT, OTClient.getLgCLIENTID());

                OTCompteClient.setLgCLIENTID(OTClient);
                this.persiste(OTCompteClient);
                if (!OTTypeClient.getLgTYPECLIENTID().equals("6")) {
                    if (OTTiersPayant.getLgTYPETIERSPAYANTID().getLgTYPETIERSPAYANTID().equalsIgnoreCase("1")) {
                        new ayantDroitManagement(this.getOdataManager()).createAyantdroit(OTClient.getLgCLIENTID(),
                                lg_CATEGORIE_AYANTDROIT_ID, str_FIRST_NAME, str_LAST_NAME, str_SEXE, dt_NAISSANCE,
                                lg_VILLE_ID, lg_RISQUE_ID, OTClient.getStrNUMEROSECURITESOCIAL(),
                                OTClient.getStrCODEINTERNE());
                    }

                    if (new tierspayantManagement(this.getOdataManager()).create_compteclt_tierspayant(
                            OTCompteClient.getLgCOMPTECLIENTID(), lg_TIERS_PAYANT_ID, int_POURCENTAGE, int_PRIORITY,
                            dbl_QUOTA_CONSO_VENTE, dbl_QUOTA_CONSO_VENTE, str_NUMERO_SECURITE_SOCIAL, dbPLAFONDENCOURS,
                            b_IsAbsolute) != null) {
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    }
                }

                /*
                 * if (new tierspayantManagement(this.getOdataManager()).create_compteclt_tierspayant(OTCompteClient.
                 * getLgCOMPTECLIENTID(), lg_TIERS_PAYANT_ID, int_POURCENTAGE, int_PRIORITY, bool_REGIME_add)) {
                 * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); }
                 */
            } catch (Exception e) {
            }

            /*
             * Client(lg_CATEGORIE_AYANTDROIT_ID,lg_RISQUE_ID String lg_CATEGORIE_AYANTDROIT_ID = " "; String
             * lg_RISQUE_ID = "1";
             */
            return OTCompteClient;
            // return null;
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }
        return null;
        // return OTCompteClient;
    }

    // verifier si le client a deja une fois un achat dans la pharmacie
    public boolean isDeleteIsAuthorize(String lg_CLIENT_ID) {
        boolean result = false;
        List<TPreenregistrementCompteClient> lstTPreenregistrementCompteClients = new ArrayList<>();
        try {
            lstTPreenregistrementCompteClients = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClient t WHERE t.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID LIKE ?1")
                    .setParameter(1, lg_CLIENT_ID).getResultList();
            new logger().OCategory.info("taille " + lstTPreenregistrementCompteClients.size());
            if (lstTPreenregistrementCompteClients.size() > 0) {
                result = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result dans checkVenteClt " + result);
        return result;
    }
    // fin verifier si le client a deja une fois un achat dans la pharmacie

    // liste des types clients
    public List<TTypeClient> getListTypeClientByType(String search_value, String lg_TYPE_CLIENT_ID, String str_TYPE) {
        List<TTypeClient> lstTTypeClient = new ArrayList<>();
        try {
            lstTTypeClient = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeClient t WHERE t.lgTYPECLIENTID LIKE ?1 AND t.strNAME LIKE ?2 AND t.strSTATUT = ?3 AND t.strTYPE LIKE ?4")
                    .setParameter(1, lg_TYPE_CLIENT_ID).setParameter(2, search_value)
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, str_TYPE).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTTypeClient size " + lstTTypeClient.size());
        return lstTTypeClient;

    }

    // fin liste des types clients
    // liste des clients par type de tiers payants
    public List<TCompteClientTiersPayant> getListTypeClientByTypeTierspayant(String search_value,
            String lg_TYPE_TIERS_PAYANT_ID) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
        try {
            lstTCompteClientTiersPayant = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE t.lgTIERSPAYANTID.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID LIKE ?1 AND (t.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?2 OR t.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?4 OR t.lgTIERSPAYANTID.strFULLNAME LIKE ?5) AND t.strSTATUT = ?3 AND t.lgCOMPTECLIENTID.lgCLIENTID.strSTATUT = ?6 ORDER BY t.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME ASC")
                    .setParameter(1, lg_TYPE_TIERS_PAYANT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).setParameter(6, commonparameter.statut_enable)
                    .setParameter(4, search_value + "%").setParameter(5, search_value + "%").getResultList();
            for (TCompteClientTiersPayant OTCompteClientTiersPayant : lstTCompteClientTiersPayant) {
                new logger().OCategory.info(
                        "Client " + OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                                + " Type client " + OTCompteClientTiersPayant.getLgCOMPTECLIENTID().getLgCLIENTID()
                                        .getLgTYPECLIENTID().getStrNAME());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTCompteClientTiersPayant size " + lstTCompteClientTiersPayant.size());
        return lstTCompteClientTiersPayant;

    }

    // fin liste des clients par type de tiers payants
    // autre creation de client
    public TCompteClient createClient(String str_FIRST_NAME, String str_LAST_NAME, String str_SEXE, String str_ADRESSE,
            String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL, String str_COMMENTAIRE,
            String lg_VILLE_ID, Double dbl_QUOTA_CONSO_MENSUELLE, Double dbl_CAUTION, int dbl_SOLDE,
            String lg_TYPE_CLIENT_ID) {
        try {

            TClient OTClient = new TClient();
            TTypeClient OTTypeClient = this.getOdataManager().getEm().find(TTypeClient.class, lg_TYPE_CLIENT_ID);
            new logger().OCategory.info("Type client " + OTTypeClient.getStrNAME());
            OTClient.setLgCLIENTID(this.getKey().getComplexId());
            OTClient.setStrCODEINTERNE(this.getKey().getShortId(6));
            OTClient.setStrFIRSTNAME(str_FIRST_NAME);
            OTClient.setStrLASTNAME(str_LAST_NAME);
            OTClient.setLgTYPECLIENTID(OTTypeClient);
            OTClient.setStrSEXE(str_SEXE);
            OTClient.setStrADRESSE(str_ADRESSE);
            OTClient.setStrDOMICILE(str_DOMICILE);
            OTClient.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTClient.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTClient.setStrCOMMENTAIRE(str_COMMENTAIRE);

            try {
                TVille OTVille = this.getOdataManager().getEm().find(TVille.class, lg_VILLE_ID);
                OTClient.setLgVILLEID(OTVille);
            } catch (Exception e) {
            }

            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtCREATED(new Date());

            this.persiste(OTClient);
            try {
                TCompteClient OTCompteClient = new compteClientManagement(this.getOdataManager()).createCompteClient("",
                        dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dbl_SOLDE, commonparameter.clt_CLIENT,
                        OTClient.getLgCLIENTID());
                // String lg_CLIENT_ID = OTClient.getLgCLIENTID();
                OTCompteClient.setLgCLIENTID(OTClient);
                this.persiste(OTCompteClient);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                return OTCompteClient;
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de créer le client");
            return null;
        }

    }
    // fin autre creation de client

    // autre update de client
    public void updateClient(String lg_CLIENT_ID, String str_FIRST_NAME, String str_LAST_NAME, String str_SEXE,
            String str_ADRESSE, String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL,
            String str_COMMENTAIRE, String lg_VILLE_ID, String lg_TYPE_CLIENT_ID, String str_CODE_INTERNE) {
        try {

            TClient OTClient = this.getOdataManager().getEm().find(TClient.class, lg_CLIENT_ID);

            OTClient.setStrCODEINTERNE(str_CODE_INTERNE);
            OTClient.setStrFIRSTNAME(str_FIRST_NAME);
            OTClient.setStrLASTNAME(str_LAST_NAME);
            try {
                TTypeClient OTTypeClient = this.getOdataManager().getEm().find(TTypeClient.class, lg_TYPE_CLIENT_ID);
                new logger().OCategory.info("Type client " + OTTypeClient.getStrNAME());
                OTClient.setLgTYPECLIENTID(OTTypeClient);
            } catch (Exception e) {
            }

            OTClient.setStrSEXE(str_SEXE);
            OTClient.setStrADRESSE(str_ADRESSE);
            OTClient.setStrDOMICILE(str_DOMICILE);
            OTClient.setStrAUTREADRESSE(str_AUTRE_ADRESSE);
            OTClient.setStrCODEPOSTAL(str_CODE_POSTAL);
            OTClient.setStrCOMMENTAIRE(str_COMMENTAIRE);

            TVille OTVille = (TVille) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TVille t WHERE t.lgVILLEID LIKE ?1 OR t.strName LIKE ?2")
                    .setParameter(1, lg_VILLE_ID).setParameter(2, lg_VILLE_ID).getSingleResult();
            new logger().OCategory.info("Ville " + OTVille.getStrName());
            OTClient.setLgVILLEID(OTVille);
            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtUPDATED(new Date());

            this.persiste(OTClient);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de metter à jour le client");
        }

    }
    // fin autre update client

    // recupereation d'un client
    public TClient getClient(String lg_CLIENT_ID) {
        TClient OTClient = null;
        try {
            OTClient = (TClient) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TClient t WHERE (CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.lgCLIENTID LIKE ?1) AND t.strSTATUT LIKE ?4")
                    .setParameter(1, lg_CLIENT_ID).setParameter(4, commonparameter.statut_enable).getSingleResult();
            // new logger().OCategory.info("Client " + OTClient.getStrFIRSTNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTClient;
    }

    // fin recuperation de client
    // recupereation d'un compte client
    public TCompteClient getTCompteClient(String lg_COMPTE_CLIENT_ID) {
        TCompteClient OTCompteClient = null;
        try {
            OTCompteClient = (TCompteClient) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClient t WHERE (CONCAT(t.lgCLIENTID.strFIRSTNAME,' ',t.lgCLIENTID.strLASTNAME) LIKE ?1 OR t.lgCOMPTECLIENTID LIKE ?1) AND t.strSTATUT LIKE ?4 AND t.lgCLIENTID.strSTATUT LIKE ?4")
                    .setParameter(1, lg_COMPTE_CLIENT_ID).setParameter(4, commonparameter.statut_enable)
                    .getSingleResult();
            // new logger().OCategory.info("Client " + OTCompteClient.getLgCLIENTID().getStrFIRSTNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTCompteClient;
    }

    public TCompteClient getTCompteClientByClient(String lg_CLIENT_ID) {
        TCompteClient _OTCompteClient = null;
        try {
            _OTCompteClient = (TCompteClient) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClient t WHERE (CONCAT(t.lgCLIENTID.strFIRSTNAME,' ',t.lgCLIENTID.strLASTNAME) LIKE ?1 OR t.lgCLIENTID.lgCLIENTID LIKE ?1) AND t.strSTATUT LIKE ?4 AND t.lgCLIENTID.strSTATUT LIKE ?4 AND t.strSTATUT LIKE ?4")
                    .setParameter(1, lg_CLIENT_ID).setParameter(4, commonparameter.statut_enable).getSingleResult();
            new logger().OCategory.info("Client " + _OTCompteClient.getLgCLIENTID().getStrFIRSTNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return _OTCompteClient;
    }

    public TCompteClient getTCompteClientByClient(String lg_CLIENT_ID, String str_STATUT) {
        TCompteClient _OTCompteClient = null;
        try {
            _OTCompteClient = (TCompteClient) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCompteClient t WHERE (CONCAT(t.lgCLIENTID.strFIRSTNAME,' ',t.lgCLIENTID.strLASTNAME) LIKE ?1 OR t.lgCLIENTID.lgCLIENTID LIKE ?1) AND t.strSTATUT LIKE ?4 AND t.lgCLIENTID.strSTATUT LIKE ?4 AND t.strSTATUT LIKE ?4")
                    .setParameter(1, lg_CLIENT_ID).setParameter(4, str_STATUT).getSingleResult();
            if (_OTCompteClient != null) {
                this.refresh(_OTCompteClient);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return _OTCompteClient;
    }

    // fin recupereation d'un compte client
    // creation en masse des clients
    public boolean createMasseClient(List<String> lstData) {
        boolean result = false;
        int count = 0;
        TCompteClient OTCompteClient = null;
        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i " + i + " valeur " + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                                                                // differentes colonnes
                // OTCompteClient = this.createClient(tabString[1], tabString[2], tabString[3], new Date(), "",
                // tabString[4], tabString[4], "", tabString[5], "", "2", 0.0, 0.0, 0,
                // (tabString[6].trim().equalsIgnoreCase("X") ? "2" : "1"), tabString[7].trim(), tabString[8].trim(),
                // tabString[9].trim(), Integer.parseInt(tabString[10]), 1, tabString[0].trim()); // a decommenter en
                // cas de probleme
                OTCompteClient = this.createClient(tabString[1].trim(), tabString[2].trim(), tabString[3].trim(),
                        new Date(), "", tabString[4].trim(), tabString[4].trim(), "", tabString[5].trim(), "", "2", 0.0,
                        0.0, 0, (tabString[7].trim().equalsIgnoreCase("X") ? "2" : "1"),
                        tabString[7].trim().equalsIgnoreCase("X") ? "2" : "555146116095894790",
                        tabString[7].trim().equalsIgnoreCase("X") ? "2" : "55181642844215217016", tabString[8].trim(),
                        Integer.parseInt(tabString[9]), 1, tabString[0].trim(), 0.0, "", 0, false, null);
                if (OTCompteClient != null) {
                    /*
                     * if (Integer.parseInt(tabString[12]) > 0) {
                     * OtierspayantManagement.create_compteclt_tierspayant(OTCompteClient.getLgCOMPTECLIENTID(),
                     * tabString[11].trim(), Integer.parseInt(tabString[12]), 2); } if (Integer.parseInt(tabString[14])
                     * > 0) { OtierspayantManagement.create_compteclt_tierspayant(OTCompteClient.getLgCOMPTECLIENTID(),
                     * tabString[13].trim(), Integer.parseInt(tabString[14]), 3); } if (Integer.parseInt(tabString[16])
                     * > 0) { OtierspayantManagement.create_compteclt_tierspayant(OTCompteClient.getLgCOMPTECLIENTID(),
                     * tabString[15].trim(), Integer.parseInt(tabString[16]), 4); }
                     */
                    count++;
                }

            }
            if (count == lstData.size()) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage(count + "/" + lstData.size() + " client(s) pris en compte");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin creation en masse des clients

    // exportation des clients
    public String generateEnteteForFile() {
        return "IDENTIFIANT;CODE INTERNE;NOM(S);PRENOM(S);MATRICULE;SEXE;ADRESSE;CODE POSTAL;TYPE CLIENT;CATEGORIE;RISQUE;RO;%RO;RC1;%RC1;RC2;%RC2;RC3;%RC3";
    }

    // generation des données à exporter
    public List<String> generateDataToExport() {
        List<String> lst = new ArrayList<String>();
        List<TClient> lstTClient = new ArrayList<TClient>();
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<TCompteClientTiersPayant>();
        String row = "";
        TAyantDroit OTAyantDroit = null;
        ayantDroitManagement OayantDroitManagement = new ayantDroitManagement(this.getOdataManager());
        tierspayantManagement OtierspayantManagement = new tierspayantManagement(this.getOdataManager());
        try {
            lstTClient = this.showOnorAllClientByType("", "%%", commonparameter.statut_enable);
            for (TClient OTClient : lstTClient) {
                if (OTClient.getLgTYPECLIENTID().getLgTYPECLIENTID().equalsIgnoreCase("1")
                        || OTClient.getLgTYPECLIENTID().getLgTYPECLIENTID().equalsIgnoreCase("2")) {
                    // return "IDENTIFIANT;CODE INTERNE;NOM(S);PRENOM(S);MATRICULE;"
                    lstTCompteClientTiersPayant = OtierspayantManagement
                            .getListCompteClientTiersPayants(OTClient.getLgCLIENTID());
                    row += OTClient.getLgCLIENTID() + ";" + OTClient.getStrCODEINTERNE() + ";"
                            + OTClient.getStrFIRSTNAME() + ";" + OTClient.getStrLASTNAME() + ";"
                            + OTClient.getStrNUMEROSECURITESOCIAL() + ";";
                    row += (OTClient.getStrSEXE() != null ? OTClient.getStrSEXE() : " ") + ";";
                    row += (OTClient.getStrADRESSE() != null ? OTClient.getStrADRESSE() : " ") + ";";
                    row += (OTClient.getStrCODEPOSTAL() != null ? OTClient.getStrCODEPOSTAL() : " ") + ";";
                    row += (OTClient.getLgTYPECLIENTID() != null ? OTClient.getLgTYPECLIENTID().getStrDESCRIPTION()
                            : " ") + ";";
                    if (OTClient.getLgTYPECLIENTID().getLgTYPECLIENTID().equalsIgnoreCase("1")) {
                        OTAyantDroit = OayantDroitManagement.getAyantDroitByNameClient(OTClient.getStrFIRSTNAME(),
                                OTClient.getStrLASTNAME());
                        if (OTAyantDroit != null) {
                            row += (OTAyantDroit.getLgCATEGORIEAYANTDROITID() != null
                                    ? OTAyantDroit.getLgCATEGORIEAYANTDROITID().getStrLIBELLECATEGORIEAYANTDROIT()
                                    : " ") + ";";
                            row += (OTAyantDroit.getLgRISQUEID() != null
                                    ? OTAyantDroit.getLgRISQUEID().getStrLIBELLERISQUE() : " ") + ";";
                        } else {
                            row += " ; ;";
                        }
                    } else {
                        row += " ; ;";
                    }

                    for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) {

                        // code
                        if (lstTCompteClientTiersPayant.get(k).getIntPRIORITY() == 1) {
                            row += lstTCompteClientTiersPayant.get(k).getLgTIERSPAYANTID().getStrNAME() + ";";
                            row += lstTCompteClientTiersPayant.get(k).getIntPOURCENTAGE() + ";";
                        } else {
                            row += lstTCompteClientTiersPayant.get(k).getLgTIERSPAYANTID().getStrNAME() + ";";
                            row += lstTCompteClientTiersPayant.get(k).getIntPOURCENTAGE() + ";";
                        }
                    }

                    new logger().OCategory.info(row);
                    row = row.substring(0, row.length() - 1);
                    lst.add(row);
                    row = "";
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Taille de la nouvelle liste " + lst.size());
        return lst;
    }

    // fin generation des données à exporter
    // fin exportation des clients
    // desactivation et activation de tiers payants
    public boolean enableOrDisableClient(String lg_COMPTE_CLIENT_ID, String str_STATUT) {
        boolean result = false;
        TTiersPayant OTTiersPayant = null;
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
        TCompteClient OTCompteClient = null;
        TClient OTClient = null;
        clientManagement OclientManagement = new clientManagement(this.getOdataManager());
        String state = "";
        try {
            state = (str_STATUT.equalsIgnoreCase(commonparameter.statut_enable) ? commonparameter.statut_disable
                    : commonparameter.statut_enable);
            OTCompteClient = this.getOdataManager().getEm().find(TCompteClient.class, lg_COMPTE_CLIENT_ID);

            if (OTCompteClient != null) {
                lstTCompteClientTiersPayant = OclientManagement.getTiersPayantsByClient("", "%%", lg_COMPTE_CLIENT_ID,
                        state);

                for (TCompteClientTiersPayant OTCompteClientTiersPayant : lstTCompteClientTiersPayant) {
                    OTCompteClientTiersPayant.setStrSTATUT(str_STATUT);
                    OTCompteClientTiersPayant.setDtUPDATED(new Date());
                }

                OTClient = OTCompteClient.getLgCLIENTID();
                OTCompteClient.setStrSTATUT(str_STATUT);
                OTCompteClient.setDtUPDATED(new Date());
                OTClient.setStrSTATUT(str_STATUT);
                OTClient.setDtUPDATED(new Date());
                this.merge(OTClient);
                String desc = (state.equals(commonparameter.statut_enable) ? "Désactivation du client "
                        : "Activation du client ");
                this.do_event_log(this.getOdataManager(), "",
                        desc + OTClient.getStrFIRSTNAME() + " " + OTClient.getStrLASTNAME(),
                        this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable, "t_client", "t_client",
                        "Mouvement sur Client", this.getOTUser().getLgUSERID());
                if (this.merge(OTCompteClient)) {

                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    this.buildErrorTraceMessage("Echec de l'opération");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    private boolean doesCodeInternClientExist(String str_CODE_INTERNE) {
        EntityManager em = getOdataManager().getEm();
        Query query = em.createNamedQuery("TClient.findByStrCODEINTERNE");
        query.setParameter("strCODEINTERNE", str_CODE_INTERNE);
        List<TClient> clients = (List<TClient>) query.getResultList();
        return (!clients.isEmpty());
    }

    private boolean doesNumeroSecuriteSocialExist(String str_NUMERO_SECURITE_SOCIAL) {
        EntityManager em = getOdataManager().getEm();
        Query query = em.createNamedQuery("TClient.findByStrNUMEROSECURITESOCIAL");
        query.setParameter("strNUMEROSECURITESOCIAL", str_NUMERO_SECURITE_SOCIAL);
        List<TClient> clients = (List<TClient>) query.getResultList();

        return !(clients.isEmpty());
    }

    public JSONArray getTiersPayantDATA(String dt_start, String dt_end, String lg_TIERSPAYANT_ID) {
        JSONArray array = new JSONArray();
        try {
            String query = "SELECT SUM(p.`int_PRICE`) MONTANTCA,COUNT(p.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`) AS NB,c.`dec_Balance_InDisponible` AS ACCOUNT FROM t_compte_client c,t_preenregistrement_compte_client_tiers_payent p,t_tiers_payant t,t_compte_client_tiers_payant cp, t_preenregistrement pp\n"
                    + "WHERE c.`lg_COMPTE_CLIENT_ID`=cp.`lg_COMPTE_CLIENT_ID` AND t.`lg_TIERS_PAYANT_ID`=cp.`lg_TIERS_PAYANT_ID`\n"
                    + "AND cp.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=p.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` AND p.lg_PREENREGISTREMENT_ID = pp.lg_PREENREGISTREMENT_ID AND t.`lg_TIERS_PAYANT_ID` ='"
                    + lg_TIERSPAYANT_ID + "' AND DATE(p.`dt_CREATED`) >='" + dt_start + "' AND DATE(p.`dt_CREATED`)<='"
                    + dt_end + "' AND p.`int_PRICE`>0 AND p.str_STATUT = '" + commonparameter.statut_is_Closed
                    + "' AND pp.b_IS_CANCEL = 0";
            new logger().OCategory.info("query:" + query);
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                json.put("MONTANTCA", objects[0] != null ? objects[0] : 0);
                json.put("NBLIENTS", objects[1]);
                json.put("ACCOUNT", objects[2] != null ? objects[2] : 0);
                array.put(json);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public TCompteClient update2(String lg_CLIENT_ID, String str_CODE_INTERNE, String str_FIRST_NAME,
            String str_LAST_NAME, String str_NUMERO_SECURITE_SOCIAL, Date dt_NAISSANCE, String str_SEXE,
            String str_ADRESSE, String str_DOMICILE, String str_AUTRE_ADRESSE, String str_CODE_POSTAL,
            String str_COMMENTAIRE, String lg_VILLE_ID, String lg_MEDECIN_ID, Double dbl_QUOTA_CONSO_MENSUELLE,
            Double dbl_CAUTION, String lg_TYPE_CLIENT_ID, String lg_AYANTS_DROITS_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String lg_RISQUE_ID, String lg_TIERS_PAYANT_ID, int int_POURCENTAGE, int int_PRIORITY,
            double dbl_QUOTA_CONSO_VENTE, String lg_COMPANY_ID, Integer plafond, Integer encours, boolean isAbsolut,
            String remiseId) {
        TCompteClient _OTCompteClient = null;
        EntityManager em = this.getOdataManager().getEm();
        try {

            TClient OTClient;
            boolean mode = false;
            OTClient = em.find(TClient.class, lg_CLIENT_ID);
            String olstr_NUMERO_SECURITE_SOCIAL = OTClient.getStrNUMEROSECURITESOCIAL();
            TCompany oCompany;
            if (!"".equals(lg_COMPANY_ID)) {
                oCompany = em.find(TCompany.class, lg_COMPANY_ID);
                if (oCompany != null) {
                    OTClient.setLgCOMPANYID(oCompany);
                }
            }
            OTClient.setStrCODEINTERNE(str_CODE_INTERNE);
            if (OTClient.getLgTYPECLIENTID().getLgTYPECLIENTID().equals("2")) {
                mode = true;
            }
            System.out.println("str_NUMERO_SECURITE_SOCIAL  " + str_NUMERO_SECURITE_SOCIAL);
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
            OTClient.setRemise(findRemiseById(remiseId));
            TTiersPayant OTTiersPayant = new tierspayantManagement(this.getOdataManager())
                    .getTTiersPayant(lg_TIERS_PAYANT_ID);
            try {

                TVille OTVille = (TVille) em
                        .createQuery("SELECT t FROM TVille t WHERE t.lgVILLEID LIKE ?1 OR t.strName LIKE ?2")
                        .setParameter(1, lg_VILLE_ID).setParameter(2, lg_VILLE_ID).getSingleResult();
                if (OTVille != null) {
                    new logger().oCategory.info("Ville  " + OTVille.getStrName());
                    OTClient.setLgVILLEID(OTVille);
                }

            } catch (Exception e) {

                new logger().oCategory
                        .info("Impossible de mettre a jour les donnees vennant de la cle etrangere TVille   ");
            }

            try {
                TTypeClient OTTypeClient = (TTypeClient) em.createQuery(
                        "SELECT t FROM TTypeClient t WHERE (t.lgTYPECLIENTID LIKE ?1 OR t.strNAME LIKE ?2) AND t.strSTATUT = ?3")
                        .setParameter(1, lg_TYPE_CLIENT_ID).setParameter(2, lg_TYPE_CLIENT_ID)
                        .setParameter(3, commonparameter.statut_enable).getSingleResult();
                if (OTTypeClient != null) {
                    new logger().oCategory.info("Type client  " + OTTypeClient.getStrDESCRIPTION());
                    OTClient.setLgTYPECLIENTID(OTTypeClient);
                }

            } catch (Exception e) {
                new logger().oCategory
                        .info("Impossible de mettre a jour les donnees vennant de la cle etrangere Type client  --> "
                                + e.getLocalizedMessage());
            }

            OTClient.setStrSTATUT(commonparameter.statut_enable);
            OTClient.setDtUPDATED(new Date());
            _OTCompteClient = this.getTCompteClientByClient(OTClient.getLgCLIENTID());
            if (!em.getTransaction().isActive()) {
                em.getTransaction().begin();
            }

            em.merge(OTClient);
            try {
                TVille _vill = OTClient.getLgVILLEID();
                TCompteClientTiersPayant OTCompteClientTiersPayant = new tierspayantManagement(this.getOdataManager())
                        .isRegimeExistForCptltTiersPBis(_OTCompteClient.getLgCOMPTECLIENTID(), 1,
                                commonparameter.statut_enable);
                new logger().OCategory.info("Pourcentage " + OTCompteClientTiersPayant.getIntPOURCENTAGE() + "----"
                        + OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTYPETIERSPAYANTID()
                                .getLgTYPETIERSPAYANTID());
                if (OTCompteClientTiersPayant.getLgTIERSPAYANTID().getLgTYPETIERSPAYANTID().getLgTYPETIERSPAYANTID()
                        .equals("1")) {
                    updateAyantdroitPrincipal(lg_AYANTS_DROITS_ID, lg_CATEGORIE_AYANTDROIT_ID,
                            OTClient.getStrFIRSTNAME(), OTClient.getStrLASTNAME(), OTClient.getStrSEXE(),
                            OTClient.getDtCREATED(), _vill, lg_RISQUE_ID, olstr_NUMERO_SECURITE_SOCIAL, OTClient, em);
                } else {
                    if (OTTiersPayant.getLgTYPETIERSPAYANTID().getLgTYPETIERSPAYANTID().equals("1")) {
                        createAyantdroit(OTClient, lg_CATEGORIE_AYANTDROIT_ID, OTClient.getStrFIRSTNAME(),
                                OTClient.getStrLASTNAME(), OTClient.getStrSEXE(), OTClient.getDtCREATED(), _vill,
                                lg_RISQUE_ID, OTClient.getStrNUMEROSECURITESOCIAL(), OTClient.getStrCODEINTERNE(), em);
                    }
                }
                if (em.getTransaction().isActive()) {
                    em.getTransaction().commit();
                }

                new tierspayantManagement(this.getOdataManager()).updateComptecltTierspayant(
                        OTCompteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID(),
                        _OTCompteClient.getLgCOMPTECLIENTID(), OTTiersPayant.getLgTIERSPAYANTID(), int_POURCENTAGE,
                        int_PRIORITY, plafond, dbl_QUOTA_CONSO_VENTE, OTClient.getStrNUMEROSECURITESOCIAL(), encours,
                        mode, isAbsolut);
            } catch (Exception e) {
                this.buildErrorTraceMessage("Impossible de mettre à jour  ", e.getMessage());
                e.printStackTrace();
            }

            /*
             * OTCompteClient = OTClient.getTCompteClientCollection().iterator().next(); new
             * compteClientManagement(this.getOdataManager()).update(OTCompteClient.getLgCOMPTECLIENTID(), "",
             * dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION);
             */
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.do_event_log(this.getOdataManager(), "",
                    "Modification des infos du client " + OTClient.getStrFIRSTNAME() + " " + OTClient.getStrLASTNAME(),
                    this.getOTUser().getStrFIRSTNAME(), commonparameter.statut_enable, "t_client", "t_client",
                    "Mouvement sur Client", this.getOTUser().getLgUSERID());
            return _OTCompteClient;
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                // this.getOdataManager().getEm().close();
            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre à jour  " + Otable, e.getMessage());
        }
        return _OTCompteClient;
    }

    public TCategorieAyantdroit getTCategorieAyantdroit(String lg_CATEGORIE_AYANTDROIT_ID) {
        TCategorieAyantdroit OTCategorieAyantdroit = null;
        try {
            OTCategorieAyantdroit = (TCategorieAyantdroit) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCategorieAyantdroit t WHERE t.lgCATEGORIEAYANTDROITID LIKE ?1 OR t.strLIBELLECATEGORIEAYANTDROIT LIKE ?1 OR t.strCODE LIKE ?1")
                    .setParameter(1, lg_CATEGORIE_AYANTDROIT_ID).getSingleResult();
        } catch (Exception e) {
        }
        return OTCategorieAyantdroit;
    }

    public boolean createAyantdroit(TClient OTClient, String lg_CATEGORIE_AYANTDROIT_ID, String str_FIRST_NAME,
            String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, TVille OTVille, String lg_RISQUE_ID,
            String str_NUMERO_SECURITE_SOCIAL, String str_CODE_INTERNE, EntityManager em) throws Exception {
        boolean result = false;
        TAyantDroit OTAyantDroit;

        if (!str_NUMERO_SECURITE_SOCIAL.equalsIgnoreCase("")) {
            OTAyantDroit = this.getAyantDroitByNum(str_NUMERO_SECURITE_SOCIAL);
            if (OTAyantDroit != null) {
                this.buildErrorTraceMessage("Echec de création. Ce matricule est déjà utilisé par "
                        + OTAyantDroit.getStrFIRSTNAME() + " " + OTAyantDroit.getStrLASTNAME());
                return false;
            }
        }

        if (str_CODE_INTERNE.equalsIgnoreCase("")) {
            str_CODE_INTERNE = this.getKey().getShortId(6);
        }
        while (this.getAyantDroitByNum(str_CODE_INTERNE) != null) {
            str_CODE_INTERNE = this.getKey().getShortId(6);
        }
        OTAyantDroit = new TAyantDroit();

        OTAyantDroit.setLgAYANTSDROITSID(this.getKey().getComplexId());
        OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
        OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
        OTAyantDroit.setStrSEXE(str_SEXE);
        OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
        OTAyantDroit.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);

        OTAyantDroit.setStrCODEINTERNE(str_CODE_INTERNE);

        if (OTClient == null) {
            this.buildErrorTraceMessage("Echec de création. Client inexistant");
            return false;
        }
        OTAyantDroit.setLgCLIENTID(OTClient);

        // lg_CATEGORIE_AYANTDROIT_ID
        TCategorieAyantdroit OTCategorieAyantdroit = this.getTCategorieAyantdroit(lg_CATEGORIE_AYANTDROIT_ID);
        if (OTCategorieAyantdroit != null) {
            OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
            new logger().oCategory.info("lg_TYPE_REGLEMENT_ID     Create   " + lg_CATEGORIE_AYANTDROIT_ID);
        }

        if (OTVille != null) {
            OTAyantDroit.setLgVILLEID(OTVille);

        }

        // lg_RISQUE_ID
        TRisque OTRisque = em.find(TRisque.class, lg_RISQUE_ID);
        if (OTRisque != null) {
            OTAyantDroit.setLgRISQUEID(OTRisque);
            new logger().oCategory.info("lg_RISQUE_ID     Create   " + lg_RISQUE_ID);
        }

        OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
        OTAyantDroit.setDtCREATED(new Date());
        OTAyantDroit.setDtUPDATED(new Date());
        em.persist(OTAyantDroit);

        result = true;

        return result;
    }

    public void updateAyantdroit(String lg_AYANTS_DROITS_ID, String lg_CATEGORIE_AYANTDROIT_ID, String str_FIRST_NAME,
            String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, TVille lg_VILLE_ID, String lg_RISQUE_ID,
            String str_NUMERO_SECURITE_SOCIAL, TClient client, EntityManager em) throws Exception {
        TAyantDroit OTAyantDroitOld = null;

        if (!str_NUMERO_SECURITE_SOCIAL.equals("")) {
            OTAyantDroitOld = this.getAyantDroitByNum(str_NUMERO_SECURITE_SOCIAL);
        }
        TAyantDroit OTAyantDroit = em.find(TAyantDroit.class, lg_AYANTS_DROITS_ID);
        if (OTAyantDroit == null) {
            OTAyantDroit = em.createNamedQuery("TAyantDroit.findByStrNUMEROSECURITESOCIAL", TAyantDroit.class)
                    .setMaxResults(1).setParameter("strNUMEROSECURITESOCIAL", client.getStrNUMEROSECURITESOCIAL())
                    .getSingleResult();

        }

        OTAyantDroit.setLgVILLEID(lg_VILLE_ID);

        // lg_CLIENT_ID
        OTAyantDroit.setLgCLIENTID(client);

        try {
            TCategorieAyantdroit OTCategorieAyantdroit = em.find(TCategorieAyantdroit.class,
                    lg_CATEGORIE_AYANTDROIT_ID);
            System.out.println("------------------------  ----WW  " + OTCategorieAyantdroit
                    + "   lg_CATEGORIE_AYANTDROIT_ID " + lg_CATEGORIE_AYANTDROIT_ID);
            if (OTCategorieAyantdroit != null) {
                OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
            }

        } catch (Exception e) {

        }

        try {
            TRisque OTRisque = em.find(TRisque.class, lg_RISQUE_ID);
            if (OTRisque != null) {
                OTAyantDroit.setLgRISQUEID(OTRisque);
            }

        } catch (Exception e) {
        }

        if (OTAyantDroitOld != null && !OTAyantDroitOld.equals(OTAyantDroit)) {
            this.buildErrorTraceMessage("Echec de mise à jour. Ce matricule est utilisé par "
                    + OTAyantDroitOld.getStrFIRSTNAME() + " " + OTAyantDroitOld.getStrLASTNAME());
            return;
        }

        OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
        OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
        if (!"".equals(str_SEXE)) {
            OTAyantDroit.setStrSEXE(str_SEXE);
        }
        OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
        OTAyantDroit.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
        // OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
        OTAyantDroit.setDtUPDATED(new Date());

        em.merge(OTAyantDroit);
        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

    }

    public List<TTiersPayant> getClientTiersPayants(String lgCMP) {
        List<TTiersPayant> list = new ArrayList<>();
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o.lgTIERSPAYANTID FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID =?1 AND o.lgTIERSPAYANTID.strSTATUT='enable' ")
                    .setParameter(1, lgCMP).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public List<TPreenregistrementCompteClientTiersPayent> getClientAchats(String lgCMP, String dt_start, String dt_end,
            String lgTP, String criteria, int start, int limit) {
        List<TPreenregistrementCompteClientTiersPayent> list = new ArrayList<>();
        if ("".equals(criteria)) {
            criteria = "%%";
        }
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID =?1 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND  FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED) BETWEEN ?2 AND ?3 AND o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?4 AND o.lgPREENREGISTREMENTID.strREF LIKE ?5 AND o.intPRICE>0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'")
                    // list = this.getOdataManager().getEm().createQuery("SELECT o FROM
                    // TPreenregistrementCompteClientTiersPayent o WHERE
                    // o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID =?1 AND
                    // o.lgPREENREGISTREMENTID.strREF LIKE ?5 ")
                    .setParameter(1, lgCMP.trim()).setParameter(2, java.sql.Date.valueOf(dt_start))
                    .setParameter(3, java.sql.Date.valueOf(dt_end)).setParameter(4, lgTP).setParameter(5, criteria)
                    .setFirstResult(start).setMaxResults(limit).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;

    }

    public long getClientAchatsCount(String lgCMP, String dt_start, String dt_end, String lgTP, String criteria) {
        long count = 0;
        if ("".equals(criteria)) {
            criteria = "%%";
        }
        try {
            count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o) FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID  =?1 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND  FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED) BETWEEN ?2 AND ?3 AND o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?4 AND o.lgPREENREGISTREMENTID.strREF LIKE ?5  AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.intPRICE >0 ")
                    .setParameter(1, lgCMP).setParameter(2, java.sql.Date.valueOf(dt_start))
                    .setParameter(3, java.sql.Date.valueOf(dt_end)).setParameter(4, lgTP).setParameter(5, criteria)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;

    }

    public String getFatucreRef(String id) {
        String ref = "";
        try {
            TFacture p = (TFacture) this.getOdataManager().getEm()
                    .createQuery("SELECT o.lgFACTUREID FROM TFactureDetail o WHERE o.strREF=?1 ").setParameter(1, id)
                    .setMaxResults(1).getSingleResult();
            ref = p.getStrCODEFACTURE();
        } catch (Exception e) {

        }
        return ref;
    }

    public JSONObject getClientAchats(String lgCMP, String dt_start, String dt_end, String lgTP, String criteria) {
        JSONObject data = new JSONObject();
        if ("".equals(criteria)) {
            criteria = "%%";
        }
        try {
            List<Object[]> list = this.getOdataManager().getEm().createQuery(
                    "SELECT SUM( DISTINCT o.intPRICE) AS TOTALTP, SUM(DISTINCT o.lgPREENREGISTREMENTID.intPRICE) AS TOTALVENTE,SUM(DISTINCT o.lgPREENREGISTREMENTID.intCUSTPART) AS TOTALCLIENT FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCOMPTECLIENTID  =?1 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND  FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED) BETWEEN ?2 AND ?3 AND o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID LIKE ?4 AND o.lgPREENREGISTREMENTID.strREF LIKE ?5 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' ")
                    .setParameter(1, lgCMP).setParameter(2, java.sql.Date.valueOf(dt_start))
                    .setParameter(3, java.sql.Date.valueOf(dt_end)).setParameter(4, lgTP).setParameter(5, criteria)
                    .getResultList();
            if (!list.isEmpty()) {
                for (Object[] objects : list) {
                    data.put("TOTALTP", (objects[0] != null ? objects[0] + "" : ""));
                    data.put("TOTALVENTE", (objects[1] != null ? objects[1] + "" : ""));
                    data.put("TOTALCLIENT", (objects[2] != null ? objects[2] + "" : ""));
                }
            } else {
                data.put("TOTALTP", 0);
                data.put("TOTALVENTE", 0);
                data.put("TOTALCLIENT", 0);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return data;

    }

    public List<TPreenregistrementDetail> getDetailsByVente(String id, String serach) {
        List<TPreenregistrementDetail> details = new ArrayList<>();

        try {

            details = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID =?1 AND (o.lgFAMILLEID.intCIP LIKE ?2 OR  o.lgFAMILLEID.strNAME LIKE ?2 )   ")
                    .setParameter(1, id).setParameter(2, serach + "%").getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return details;
    }

    public Integer getDiffere(String cmptID) {
        Long amount = 0l;
        try {
            amount = (Long) this.getOdataManager().getEm().createQuery(
                    "SELECT SUM(o.intPRICERESTE) FROM TPreenregistrementCompteClient o WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID=?1  ")
                    .setParameter(1, cmptID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return ((amount != null) ? amount.intValue() : 0);
    }

    public int showOnorAllClientByTypeCount(String search_value, String lg_TYPE_CLIENT_ID, String str_STATUT) {

        try {

            Query q = this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(t) FROM TClient t WHERE (t.strFIRSTNAME LIKE ?1 OR t.strLASTNAME LIKE ?1 OR CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) LIKE ?1 OR t.strNUMEROSECURITESOCIAL LIKE ?1 OR t.strCODEINTERNE LIKE ?1) AND t.lgTYPECLIENTID.lgTYPECLIENTID LIKE ?3 AND t.strSTATUT LIKE ?4 ORDER BY t.lgTYPECLIENTID.strDESCRIPTION, t.strFIRSTNAME ")
                    .setParameter(1, search_value + "%").setParameter(3, lg_TYPE_CLIENT_ID).setParameter(4, str_STATUT);
            return ((Long) q.getSingleResult()).intValue();
            // this.buildSuccesTraceMessage("Client(s) Existant(s) Taille :: " + lstTClient.size());
        } finally {
            // this.getOdataManager().getEm().close();

        }

    }

    public Integer getAccount(String OTCompteClient) {
        Integer account = 0;
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TCompteClientTiersPayant> cmp = root
                    .join("lgCOMPTECLIENTTIERSPAYANTID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(cmp.get("lgCOMPTECLIENTID").get("lgCOMPTECLIENTID"), OTCompteClient));
            criteria = cb.and(criteria,
                    cb.notEqual(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUTFACTURE),
                            commonparameter.statut_paid));
            criteria = cb.and(criteria,
                    cb.equal(root.get("lgPREENREGISTREMENTID").get("strSTATUT"), commonparameter.statut_is_Closed));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("bISCANCEL"), false));
            Predicate ge = cb.greaterThan(root.get("lgPREENREGISTREMENTID").get("intPRICE"), 0);
            cq.select(cb.sum(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICERESTE)));
            cq.where(criteria, ge);
            Query q = em.createQuery(cq);
            account = (Integer) q.getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return account;
    }

    public JSONObject getClients(String search_value, String lg_TYPE_CLIENT_ID, String str_STATUT, int start,
            int limit) {
        JSONObject _json = new JSONObject();
        try {

            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TClient> cq = cb.createQuery(TClient.class);
            Root<TClient> root = cq.from(TClient.class);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(root.get(TClient_.strSTATUT), str_STATUT));
            if (!"".equals(lg_TYPE_CLIENT_ID)) {
                Join<TClient, TTypeClient> cmp = root.join("lgTYPECLIENTID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(cmp.get(TTypeClient_.lgTYPECLIENTID), lg_TYPE_CLIENT_ID));
            }
            if (!"".equals(search_value)) {
                criteria = cb.and(criteria,
                        cb.or(cb.like(root.get(TClient_.strFIRSTNAME), search_value + "%"),
                                cb.like(root.get(TClient_.strFIRSTNAME), search_value + "%"),
                                cb.like(root.get(TClient_.strNUMEROSECURITESOCIAL), search_value + "%"),
                                cb.like(root.get(TClient_.strCODEINTERNE), search_value + "%"),
                                cb.like(cb.concat(cb.concat(root.get(TClient_.strFIRSTNAME), " "),
                                        root.get(TClient_.strLASTNAME)), search_value + "%"),
                                cb.like(cb.concat(cb.concat(root.get(TClient_.strLASTNAME), " "),
                                        root.get(TClient_.strFIRSTNAME)), search_value + "%")));
            }

            cq.select(root).orderBy(cb.asc(root.get("lgTYPECLIENTID").get("strDESCRIPTION")),
                    cb.asc(root.get(TClient_.strFIRSTNAME)));
            cq.where(criteria);
            Query q = em.createQuery(cq);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            List<TClient> list = q.getResultList();
            Integer dbl_total_differe = 0;
            JSONArray array = new JSONArray();
            boolean isALLOWED = DateConverter.hasAuthorityById(getUsersPrivileges(), Util.ACTIONDELETE);
            boolean P_BTN_DESACTIVER_CLIENT = DateConverter.hasAuthorityByName(getUsersPrivileges(),
                    DateConverter.P_BTN_DESACTIVER_CLIENT);

            for (TClient c : list) {
                JSONObject json = new JSONObject();
                String lg_CATEGORIE_AYANTDROIT_ID = "";
                String lg_RISQUE_ID = "";
                String lg_COMPTE_CLIENT_ID = "";
                json.put("BTNDELETE", isALLOWED);
                json.put("P_BTN_DESACTIVER_CLIENT", P_BTN_DESACTIVER_CLIENT);

                try {
                    TCompteClient tCompteClient = getCompteClientt(c.getLgCLIENTID());

                    // dbl_total_differe =
                    // ODiffereManagement.func_beneficiaireTotalDiffere(OTCompteClient.getLgCOMPTECLIENTID());
                    lg_COMPTE_CLIENT_ID = tCompteClient.getLgCOMPTECLIENTID();
                    json.put("dbl_SOLDE", conversion.AmountFormat(tCompteClient.getDecBalance().intValue(), '.'));
                    json.put("dbl_SOLDE_BIS", tCompteClient.getDecBalance().intValue());
                    json.put("dbl_CAUTION", tCompteClient.getDblCAUTION());
                    /*
                     * json.put("dbl_PLAFOND", OTCompteClient.getDblPLAFOND()); a decommenter en cas de probleme.
                     * 16/08/2016 json.put("dbl_QUOTA_CONSO_MENSUELLE", OTCompteClient.getDblQUOTACONSOMENSUELLE());
                     */
                    json.put("lg_COMPTE_CLIENT_ID", lg_COMPTE_CLIENT_ID);
                    TRemise remise = c.getRemise();
                    if (remise != null) {
                        json.put("remiseId", remise.getLgREMISEID());
                    }

                    Integer account = getDiffere(lg_COMPTE_CLIENT_ID) + getAccount(lg_COMPTE_CLIENT_ID);
                    // json.put("dbl_total_differe",
                    // OclientManagement.getDiffere(OTCompteClient.getLgCOMPTECLIENTID()));
                    json.put("dbl_total_differe", account);

                    dbl_total_differe = (OTCompteClient.getDecBalanceInDisponible() > 0
                            ? OTCompteClient.getDecBalanceInDisponible() : 0);

                } catch (Exception e) {
                }

                if (c.getLgTYPECLIENTID().getLgTYPECLIENTID().equals("1")) {
                    try {
                        TAyantDroit ayantDroit = getAyantDroit(c.getLgCLIENTID());
                        lg_CATEGORIE_AYANTDROIT_ID = (ayantDroit.getLgCATEGORIEAYANTDROITID() != null
                                ? ayantDroit.getLgCATEGORIEAYANTDROITID().getStrLIBELLECATEGORIEAYANTDROIT() : "");
                        lg_RISQUE_ID = (ayantDroit.getLgRISQUEID() != null
                                ? ayantDroit.getLgRISQUEID().getStrLIBELLERISQUE() : "");
                    } catch (Exception e) {

                    }

                }

                try {
                    TCompteClientTiersPayant OTCompteClientTiersPayant = getCompteClientTiersPayant(
                            lg_COMPTE_CLIENT_ID);
                    json.put("lg_TYPE_TIERS_PAYANT_ID", OTCompteClientTiersPayant.getLgTIERSPAYANTID()
                            .getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
                    json.put("lg_TIERS_PAYANT_ID", OTCompteClientTiersPayant.getLgTIERSPAYANTID().getStrFULLNAME());
                    json.put("int_POURCENTAGE", OTCompteClientTiersPayant.getIntPOURCENTAGE());
                    json.put("int_PRIORITY", OTCompteClientTiersPayant.getIntPRIORITY());
                    json.put("dbl_QUOTA_CONSO_MENSUELLE", OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() != null
                            ? OTCompteClientTiersPayant.getDblQUOTACONSOMENSUELLE() : 0);
                    json.put("dbl_QUOTA_CONSO_VENTE", OTCompteClientTiersPayant.getDblQUOTACONSOVENTE() != null
                            ? OTCompteClientTiersPayant.getDblQUOTACONSOVENTE() : 0);
                    json.put("dbl_PLAFOND", OTCompteClientTiersPayant.getDblPLAFOND() != null
                            ? OTCompteClientTiersPayant.getDblPLAFOND() : 0);
                    json.put("db_PLAFOND_ENCOURS", OTCompteClientTiersPayant.getDbPLAFONDENCOURS() != null
                            ? OTCompteClientTiersPayant.getDbPLAFONDENCOURS() : 0);
                    json.put("b_IsAbsolute", OTCompteClientTiersPayant.getBIsAbsolute());
                } catch (Exception e) {

                }

                json.put("lg_CLIENT_ID", c.getLgCLIENTID());
                // str_CODE_INTERNE
                json.put("str_CODE_INTERNE", c.getStrCODEINTERNE());
                // str_FIRST_NAME
                json.put("str_FIRST_NAME", c.getStrFIRSTNAME());
                json.put("lg_CATEGORY_CLIENT_ID",
                        (c.getLgCATEGORYCLIENTID() != null ? c.getLgCATEGORYCLIENTID().getStrLIBELLE() : ""));
                json.put("lg_COMPANY_ID", (c.getLgCOMPANYID() != null ? c.getLgCOMPANYID().getStrRAISONSOCIALE() : ""));

                // str_LAST_NAME
                json.put("str_LAST_NAME", c.getStrLASTNAME());
                json.put("str_FIRST_LAST_NAME", c.getStrFIRSTNAME() + " " + c.getStrLASTNAME());
                // str_NUMERO_SECURITE_SOCIAL
                json.put("str_NUMERO_SECURITE_SOCIAL", c.getStrNUMEROSECURITESOCIAL());
                // dt_NAISSANCE
                json.put("dt_NAISSANCE", date.DateToString(c.getDtNAISSANCE(), date.formatterShort));
                // str_SEXE
                json.put("str_SEXE", c.getStrSEXE());
                // str_ADRESSE
                json.put("str_ADRESSE", c.getStrADRESSE());
                // str_DOMICILE
                json.put("str_DOMICILE", c.getStrDOMICILE());
                // str_AUTRE_ADRESSE
                json.put("str_AUTRE_ADRESSE", c.getStrAUTREADRESSE());
                // str_CODE_POSTAL
                json.put("str_CODE_POSTAL", c.getStrCODEPOSTAL());
                // str_COMMENTAIRE
                json.put("str_COMMENTAIRE", c.getStrCOMMENTAIRE());
                // lg_RISQUE_ID
                json.put("lg_RISQUE_ID", lg_RISQUE_ID);
                // lg_VILLE_ID
                try {
                    json.put("lg_VILLE_ID", c.getLgVILLEID().getStrName());
                } catch (Exception e) {

                }

                json.put("lg_CATEGORIE_AYANTDROIT_ID", lg_CATEGORIE_AYANTDROIT_ID);

                json.put("lg_TYPE_CLIENT_ID", c.getLgTYPECLIENTID().getStrNAME());

                json.put("str_STATUT", c.getStrSTATUT());

                if (c.getDtCREATED() != null) {
                    json.put("dt_CREATED", date.DateToString(c.getDtCREATED(), date.formatterShort));
                }
                array.put(json);
            }
            int total = getClients(search_value, lg_TYPE_CLIENT_ID, str_STATUT);
            _json.put("results", array);
            _json.put("total_differe", dbl_total_differe);
            _json.put("total", total);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return _json;
    }

    public TAyantDroit getAyantDroitByNum(String lg_AYANT_DROIT_ID) {
        TAyantDroit OTAyantDroit = null;

        try {
            OTAyantDroit = (TAyantDroit) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAyantDroit t WHERE (CONCAT(t.strFIRSTNAME,' ',t.strLASTNAME) = ?1 OR t.strCODEINTERNE = ?1 OR t.strNUMEROSECURITESOCIAL = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_AYANT_DROIT_ID).setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();

        } catch (Exception e) {
        }
        return OTAyantDroit;
    }

    private TAyantDroit getAyantDroit(String lgCLIENT_ID) {
        try {
            return this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT o FROM TAyantDroit o WHERE o.lgCLIENTID.lgCLIENTID=?1 ORDER BY o.dtCREATED ASC ",
                            TAyantDroit.class)
                    .setParameter(1, lgCLIENT_ID).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    private TCompteClient getCompteClientt(String lgCLIENT_ID) {
        try {
            return this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TCompteClient o WHERE o.lgCLIENTID.lgCLIENTID=?1 ", TCompteClient.class)
                    .setParameter(1, lgCLIENT_ID).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    private TCompteClientTiersPayant getCompteClientTiersPayant(String lgCLIENT_ID) {
        try {
            return this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID  =?1 AND o.intPRIORITY=1",
                    TCompteClientTiersPayant.class).setParameter(1, lgCLIENT_ID).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    public int getClients(String search_value, String lg_TYPE_CLIENT_ID, String str_STATUT) {
        EntityManager em = this.getOdataManager().getEm();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TClient> root = cq.from(TClient.class);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(root.get(TClient_.strSTATUT), str_STATUT));
            if (!"".equals(lg_TYPE_CLIENT_ID)) {
                Join<TClient, TTypeClient> cmp = root.join("lgTYPECLIENTID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(cmp.get(TTypeClient_.lgTYPECLIENTID), lg_TYPE_CLIENT_ID));
            }
            if (!"".equals(search_value)) {
                criteria = cb.and(criteria,
                        cb.or(cb.like(root.get(TClient_.strFIRSTNAME), search_value + "%"),
                                cb.like(root.get(TClient_.strFIRSTNAME), search_value + "%"),
                                cb.like(root.get(TClient_.strNUMEROSECURITESOCIAL), search_value + "%"),
                                cb.like(root.get(TClient_.strCODEINTERNE), search_value + "%"),
                                cb.like(cb.concat(cb.concat(root.get(TClient_.strFIRSTNAME), " "),
                                        root.get(TClient_.strLASTNAME)), search_value + "%")));
            }

            cq.select(cb.count(root));
            cq.where(criteria);
            Query q = em.createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();

        } finally {

        }

    }

    public void updateAyantdroitPrincipal(String lg_AYANTS_DROITS_ID, String lg_CATEGORIE_AYANTDROIT_ID,
            String str_FIRST_NAME, String str_LAST_NAME, String str_SEXE, Date dt_NAISSANCE, TVille lg_VILLE_ID,
            String lg_RISQUE_ID, String str_NUMERO_SECURITE_SOCIAL, TClient client, EntityManager em) throws Exception {

        TAyantDroit OTAyantDroit = em.find(TAyantDroit.class, lg_AYANTS_DROITS_ID);
        if (OTAyantDroit == null) {
            OTAyantDroit = em.createNamedQuery("TAyantDroit.findByStrNUMEROSECURITESOCIAL", TAyantDroit.class)
                    .setMaxResults(1).setParameter("strNUMEROSECURITESOCIAL", str_NUMERO_SECURITE_SOCIAL)
                    .getSingleResult();

        }

        OTAyantDroit.setLgVILLEID(lg_VILLE_ID);

        // lg_CLIENT_ID
        OTAyantDroit.setLgCLIENTID(client);

        try {
            TCategorieAyantdroit OTCategorieAyantdroit = em.find(TCategorieAyantdroit.class,
                    lg_CATEGORIE_AYANTDROIT_ID);
            System.out.println("------------------------  ----WW  " + OTCategorieAyantdroit
                    + "   lg_CATEGORIE_AYANTDROIT_ID " + lg_CATEGORIE_AYANTDROIT_ID);
            if (OTCategorieAyantdroit != null) {
                OTAyantDroit.setLgCATEGORIEAYANTDROITID(OTCategorieAyantdroit);
            }

        } catch (Exception e) {

        }

        try {
            TRisque OTRisque = em.find(TRisque.class, lg_RISQUE_ID);
            if (OTRisque != null) {
                OTAyantDroit.setLgRISQUEID(OTRisque);
            }

        } catch (Exception e) {
        }

        OTAyantDroit.setStrFIRSTNAME(str_FIRST_NAME);
        OTAyantDroit.setStrLASTNAME(str_LAST_NAME);
        if (!"".equals(str_SEXE)) {
            OTAyantDroit.setStrSEXE(str_SEXE);
        }
        OTAyantDroit.setDtNAISSANCE(dt_NAISSANCE);
        OTAyantDroit.setStrNUMEROSECURITESOCIAL(client.getStrNUMEROSECURITESOCIAL());
        // OTAyantDroit.setStrSTATUT(commonparameter.statut_enable);
        OTAyantDroit.setDtUPDATED(new Date());

        em.merge(OTAyantDroit);
        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

    }
}
