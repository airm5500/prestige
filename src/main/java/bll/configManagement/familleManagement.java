/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import bll.commandeManagement.bonLivraisonManagement;
import bll.commandeManagement.suggestionManagement;
import bll.common.Parameter;
import bll.entity.EntityData;

import bll.interfacemanager.Famillemanagerinterface;
import bll.preenregistrement.Preenregistrement;
import bll.stockManagement.StockManager;
import bll.teller.SnapshotManager;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import bll.utils.TparameterManager;
import bll.warehouse.WarehouseManager;
import dal.CategorieNotification;
import dal.GammeProduit;
import dal.Laboratoire;
import dal.Notification;
import dal.TAlertEvent;
import dal.TAlertEventUserFone;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraison_;
import dal.TCalendrier;
import dal.TCodeActe;
import dal.TCodeGestion;
import dal.TCodeTva;
import dal.TCoefficientPonderation;
import dal.TDci_;
import dal.TDeconditionnement;
import dal.TEmplacement;
import dal.TEventLog;
import dal.TFamille;
import dal.TFormeArticle;
import dal.TFabriquant;
import dal.TFamilleDci;
import dal.TFamilleDci_;
import dal.TFamilleGrossiste;
import dal.TFamilleGrossiste_;
import dal.TFamilleStock;
import dal.TFamilleZonegeo;
import dal.TFamille_;
import dal.TFamillearticle;
import dal.TGrossiste;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaire_;
import dal.TMouvement;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrement_;
import dal.TRemise;
import dal.TSnapshotFamillesell;
import dal.TTypeStock;
import dal.TTypeStockFamille;
import dal.TTypeetiquette;

import dal.TUser;
import dal.TZoneGeographique;
import dal.dataManager;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.collections4.MapUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.StringUtils;
import toolkits.utils.date;
import toolkits.utils.logger;
import util.Constant;
import util.DateCommonUtils;
import util.DateConverter;
import util.NotificationUtils;

/**
 *
 * @author AKOUAME
 */
public class familleManagement extends bllBase implements Famillemanagerinterface {

    Object Otable = TFamille.class;

    public familleManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public familleManagement(dataManager OdataManager, TUser OTUser) {
        this.setOTUser(OTUser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public TFamille create(String str_NAME, String str_DESCRIPTION, int int_PRICE, int int_PRICE_TIPS,
            int int_TAUX_MARQUE, int int_PAF, int int_PAT, int int_S, String int_T, String int_CIP, String int_EAN13,
            String lg_GROSSISTE_ID, String lg_FAMILLEARTICLE_ID, String lg_CODE_ACTE_ID, String lg_CODE_GESTION_ID,
            String str_CODE_REMISE, String str_CODE_TAUX_REMBOURSEMENT, String lg_ZONE_GEO_ID, int int_NUMBER_AVAILABLE,
            int int_QTEDETAIL, String lg_FORME_ARTICLE_ID, String lg_FABRIQUANT_ID, short bool_DECONDITIONNE,
            String lg_TYPEETIQUETTE_ID, String lg_REMISE_ID, String lg_CODE_TVA_ID, boolean bool_RESERVE,
            int int_SEUIL_RESERVE, String lg_FAMILLE_PARENT_ID, int int_STOCK_REAPROVISONEMENT,
            int int_QTE_REAPPROVISIONNEMENT, int int_QUANTITY_STOCK, String dt_Peremtion) {
        TFamille OTFamille = null;
        TParameters OParameters, OParametersPerime = null;
        String lg_TYPE_STOCK_RESERVE_ID = "2";
        short bool_DECONDITIONNE_EXIST = 1;
        int int_TAUX = 0;
        TCodeGestion OTCodeGestion;
        TTypeetiquette OTTypeetiquette;
        TFamillearticle OTFamillearticle;
        TZoneGeographique OTZoneGeographique;
        TCodeActe OTCodeActe;
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        grossisteManagement OgrossisteManagement = new grossisteManagement(this.getOdataManager());
        try {

            if (int_CIP.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return null;
            }
            int_CIP = this.generateCIP(int_CIP);
            if (this.isCIPExist(int_CIP)) {
                return null;
            }

            OTFamille = new TFamille();
            OParameters = OTparameterManager.getParameter(Parameter.KEY_TAUX_CODE_TABLEAU);
            if (OParameters != null) {
                int_TAUX = Integer.parseInt(OParameters.getStrVALUE());
            }
            OTFamille.setLgFAMILLEID(this.getKey().getComplexId());
            try {
                OTCodeActe = (TCodeActe) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TCodeActe t WHERE t.lgCODEACTEID LIKE ?1 OR t.strLIBELLEE LIKE ?2")
                        .setParameter(1, lg_CODE_ACTE_ID).setParameter(2, lg_CODE_ACTE_ID).getSingleResult();
                OTFamille.setLgCODEACTEID(OTCodeActe);
            } catch (Exception e) {
                // e.printStackTrace();
            }

            OTFamillearticle = this.getTFamillearticle(lg_FAMILLEARTICLE_ID);
            if (OTFamillearticle == null) {
                OTFamillearticle = this.getTFamillearticle(Parameter.DEFAUL_FAMILLEARTICE);
            }
            OTFamille.setLgFAMILLEARTICLEID(OTFamillearticle);

            OTZoneGeographique = this.getTZoneGeographique(lg_ZONE_GEO_ID);
            if (OTZoneGeographique == null) {
                OTZoneGeographique = this.getTZoneGeographique(Parameter.DEFAUL_ZONE_GEOGRAPHIQUE);
            }
            OTFamille.setLgZONEGEOID(OTZoneGeographique);

            OTCodeGestion = this.getTCodeGestion(lg_CODE_GESTION_ID);
            if (OTCodeGestion != null) {
                OTFamille.setLgCODEGESTIONID(OTCodeGestion);
            }

            // ajouter par KOBENA
            OTTypeetiquette = this.getTTypeetiquette(lg_TYPEETIQUETTE_ID);
            if (OTTypeetiquette == null) {
                OTTypeetiquette = this.getTTypeetiquette(Parameter.DEFAUL_TYPEETIQUETTE);
            }
            OTFamille.setLgTYPEETIQUETTEID(OTTypeetiquette);

            TGrossiste OTGrossiste = OgrossisteManagement.getGrossiste(lg_GROSSISTE_ID);
            if (OTGrossiste == null) {
                OTGrossiste = OgrossisteManagement.getGrossiste(Parameter.DEFAUL_GROSSISTE);
            }
            OTFamille.setLgGROSSISTEID(OTGrossiste);
            try {
                TFormeArticle OTFormeArticle = (TFormeArticle) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFormeArticle t WHERE t.lgFORMEARTICLEID LIKE ?1 OR t.strLIBELLE LIKE ?2")
                        .setParameter(1, lg_FORME_ARTICLE_ID).setParameter(2, lg_FORME_ARTICLE_ID).getSingleResult();
                OTFamille.setLgFORMEID(OTFormeArticle);
            } catch (Exception e) {
            }

            try {
                TFabriquant OTFabriquant = (TFabriquant) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFabriquant t WHERE t.lgFABRIQUANTID LIKE ?1 OR t.strDESCRIPTION LIKE ?2 OR t.strCODE LIKE ?2")
                        .setParameter(1, lg_FABRIQUANT_ID).setParameter(2, lg_FABRIQUANT_ID).getSingleResult();
                OTFamille.setLgFABRIQUANTID(OTFabriquant);
            } catch (Exception e) {
            }

            OTFamille.setIntCIP(int_CIP);
            OTFamille.setIntEAN13(int_EAN13);
            OTFamille.setIntNUMBERDETAIL(int_QTEDETAIL);
            OTFamille.setBoolRESERVE(bool_RESERVE);
            OTFamille.setIntSEUILRESERVE(int_SEUIL_RESERVE);
            OTFamille.setBoolACCOUNT(true);
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setIntT(int_T);
            OTFamille.setIntS(int_S);
            OTFamille.setIntPRICE((!int_T.equalsIgnoreCase("") && lg_FAMILLE_PARENT_ID.equalsIgnoreCase("")
                    ? int_PRICE + int_TAUX : int_PRICE));
            OTFamille.setIntPRICETIPS(OTFamille.getIntPRICETIPS());
            OTFamille.setIntTAUXMARQUE(int_TAUX_MARQUE);
            if (!"".equals(dt_Peremtion)) {
                OTFamille.setDtPEREMPTION(java.sql.Date.valueOf(dt_Peremtion));
            }
            // OTFamille.setStrCODEETIQUETTE(str_CODE_ETIQUETTE);
            OTFamille.setStrCODEREMISE(str_CODE_REMISE);
            TCodeTva OTCodeTva;
            try {
                OTCodeTva = this.getCodeTva(lg_CODE_TVA_ID);
                if (OTCodeTva == null) {
                    OTCodeTva = this.getCodeTva(Parameter.DEFAUL_CODE_TVA);
                }
                OTFamille.setLgCODETVAID(OTCodeTva);

            } catch (Exception e) {
                e.printStackTrace();
            }

            OTFamille.setStrCODETAUXREMBOURSEMENT(str_CODE_TAUX_REMBOURSEMENT);
            OTFamille.setStrDESCRIPTION(str_DESCRIPTION.toUpperCase());
            OTFamille.setStrNAME(str_NAME.toUpperCase());
            OTFamille.setIntSTOCKREAPROVISONEMENT(int_STOCK_REAPROVISONEMENT);
            OTFamille.setIntSEUILMIN(OTFamille.getIntSTOCKREAPROVISONEMENT());
            OTFamille.setIntQTEREAPPROVISIONNEMENT(int_QTE_REAPPROVISIONNEMENT);
            OTFamille.setIntSEUILMAX(int_NUMBER_AVAILABLE);
            OTFamille.setStrSTATUT(commonparameter.statut_enable);
            OTFamille.setDtCREATED(new Date());
            OTFamille.setLgFAMILLEPARENTID(lg_FAMILLE_PARENT_ID);

            OTFamille.setBoolDECONDITIONNE(bool_DECONDITIONNE);
            new logger().OCategory.info("bool_DECONDITIONNE article " + OTFamille.getBoolDECONDITIONNE());
            if (OTFamille.getBoolDECONDITIONNE() == 1) {
                OTFamille.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE_EXIST);
            } else {
                bool_DECONDITIONNE_EXIST = 0;
                OTFamille.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE_EXIST);
            }

            // code ajouté 28/06/2016
            OParametersPerime = OTparameterManager.getParameter(Parameter.KEY_ACTIVATE_PEREMPTION_DATE);
            OTFamille.setBoolCHECKEXPIRATIONDATE(
                    OParametersPerime != null && Integer.parseInt(OParametersPerime.getStrVALUE()) == 1 ? true : false);
            // fin code ajouté 28/06/2016
            this.persiste(OTFamille);

            new familleGrossisteManagement(this.getOdataManager()).create(OTFamille.getLgGROSSISTEID(), OTFamille,
                    OTFamille.getIntCIP(), OTFamille.getIntPRICE(), OTFamille.getIntPAF());
            if (this.createFamilleStock(OTFamille, int_QUANTITY_STOCK, this.getOTUser().getLgEMPLACEMENTID()) != null
                    && this.createFamilleZoneGeo(OTFamille, OTZoneGeographique,
                            this.getOTUser().getLgEMPLACEMENTID())) {
                OStockManager.createTypeStockFamille(OTFamille.getLgFAMILLEID(), "1", int_QUANTITY_STOCK,
                        this.getOTUser().getLgEMPLACEMENTID()); // creation dans type stock famille
                if (bool_RESERVE) {
                    // if (new StockManager(this.getOdataManager(), this.getOTUser()).doReassort(0,
                    // OTFamille.getLgFAMILLEID(), commonparameter.ASSORT)) {
                    // this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    // }
                    TTypeStockFamille OTTypeStockFamille = OStockManager.createTypeStockFamille(
                            OTFamille.getLgFAMILLEID(), lg_TYPE_STOCK_RESERVE_ID, 0,
                            this.getOTUser().getLgEMPLACEMENTID());
                    if (OTTypeStockFamille != null) {
                        OTFamille.setIntSEUILRESERVE(int_SEUIL_RESERVE);
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    }
                } else {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }

            }
            new logger().OCategory.info(this.getDetailmessage());
            // on verifie si l'on veut que ce produit soit deconditionnable
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer cet article");
            this.delete(OTFamille);
        }
        return OTFamille;
    }

    public void sendSMS(TFamille OTFamille, int int_PRICE_OLD, int int_PRICE_NEW) {

        try {

            OTFamille = (TFamille) this.find(OTFamille.getLgFAMILLEID(), new TFamille());
            new logger().OCategory.info(OTFamille.getStrNAME() + " - " + OTFamille.getStrDESCRIPTION() + "  - ");

            String Description = int_PRICE_OLD + commonparameter.SEPARATEUR_DIESE + int_PRICE_NEW
                    + commonparameter.SEPARATEUR_DIESE + this.getOTUser().getLgUSERID()
                    + commonparameter.SEPARATEUR_DIESE + this.getOTUser().getStrLOGIN()
                    + commonparameter.SEPARATEUR_DIESE + OTFamille.getStrDESCRIPTION()
                    + commonparameter.SEPARATEUR_DIESE + "Modification de l'article " + OTFamille.getStrDESCRIPTION();
            this.do_event_log(commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "TFamille", "Donnee de ref", "Modification de date à la vente",
                    this.getOTUser().getLgUSERID());

            TAlertEvent oTAlertEvent = (TAlertEvent) this.find("N_UPDATE_FAMILLE_PRICE", new TAlertEvent());

            int int_price = 0;

            this.refresh(OTFamille);

            new logger().OCategory.info("Envoie de SMS effectue");

        } catch (Exception e) {

            new logger().OCategory.info("Echec lors de l'envoie du SMS " + e.getMessage());

        }

    }

    public void sendSMS(String Description, String tableName, String title, String ID_AlertEvent, String ActionType) {
        List<TAlertEventUserFone> lstTAlertEventUserFone;
        try {
            this.do_event_log(commonparameter.ALL, Description,
                    this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                    commonparameter.statut_enable, tableName, title, ActionType, this.getOTUser().getLgUSERID());

            // TAlertEvent oTAlertEvent = (TAlertEvent) this.find("N_UPDATE_FAMILLE_PRICE", new TAlertEvent());
            lstTAlertEventUserFone = this.getTAlertEventUserFone(ID_AlertEvent);

            this.getOdataManager().BeginTransaction();

            this.getOdataManager().CloseTransaction();
        } catch (Exception e) {

            new logger().OCategory.info("Echec lors de l'envoie du SMS " + e.getMessage());

        }

    }

    public void sendSMS(String Description, String title, String ID_AlertEvent) {
        List<TAlertEventUserFone> lstTAlertEventUserFone = new ArrayList<>();
        try {
            lstTAlertEventUserFone = this.getTAlertEventUserFone(ID_AlertEvent);

        } catch (Exception e) {

            new logger().OCategory.info("Echec lors de l'envoie du SMS " + e.getMessage());

        }

    }

    // mise a jour famille depuis inventaire
    public boolean update(String lg_FAMILLE_ID, int int_NUMBER, Date dt_LAST_INVENTAIRE, TTypeStock OTypeStock) {

        boolean result = false;
        // String lg_TYPE_STOCK_ID = "1";
        try {
            TFamille OTFamille = this.getTFamille(lg_FAMILLE_ID);
            OTFamille.setDtLASTINVENTAIRE(dt_LAST_INVENTAIRE);

            // this.persiste(OTFamille);
            TFamilleStock OFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTFamille.getLgFAMILLEID());
            OFamilleStock.setIntNUMBERAVAILABLE(int_NUMBER);
            OFamilleStock.setIntNUMBER(int_NUMBER);
            OFamilleStock.setDtUPDATED(new Date());
            this.persiste(OFamilleStock);

            if (new StockManager(this.getOdataManager(), this.getOTUser()).updateTypeStockFamille(OTFamille, OTypeStock,
                    int_NUMBER)) {
                // result = true;
                try {
                    if (new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementFamille(OTFamille,
                            "", commonparameter.OTHER, commonparameter.str_ACTION_INVENTAIRE, int_NUMBER,
                            this.getOTUser().getLgEMPLACEMENTID()) != null) {
                        result = true;
                    }
                } catch (Exception e) {
                }
            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de mise à jour de l'article");
        }
        return result;
    }

    // fin mise a jour famille depuis inventaire
    public TFamille CreateTFamille(String str_NAME, String str_DESCRIPTION, int int_PRICE, String int_CIP,
            String int_EAN13, String lg_GROSSISTE_ID, String lg_FAMILLEARTICLE_ID, int int_STOCK_REAPROVISONEMENT,
            int int_PAF, int int_PAT, int int_S, String int_T) {
        TFamille OTFamille = null;
        try {

            OTFamille = new TFamille();
            OTFamille.setLgFAMILLEID(this.getKey().getComplexId());
            OTFamille.setStrNAME(str_NAME);
            OTFamille.setStrDESCRIPTION(str_DESCRIPTION);
            OTFamille.setIntPRICE(int_PRICE);
            OTFamille.setIntCIP(int_CIP);
            OTFamille.setIntEAN13(int_EAN13);
            OTFamille.setIntSTOCKREAPROVISONEMENT(int_STOCK_REAPROVISONEMENT);
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setIntS(int_S);
            // OTFamille.setIntT(int_T);

            TGrossiste OTGrossiste = this.getOdataManager().getEm().find(TGrossiste.class, lg_GROSSISTE_ID);
            if (OTGrossiste == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        "Ref Grossiste : " + lg_GROSSISTE_ID + "  Invalide ");
                return null;
            }
            OTFamille.setLgGROSSISTEID(OTGrossiste);

            TFamillearticle OTFamillearticle = this.getOdataManager().getEm().find(TFamillearticle.class,
                    lg_FAMILLEARTICLE_ID);
            if (OTFamillearticle == null) {
                this.buildErrorTraceMessage("Impossible de creer un " + Otable,
                        "Ref Groupefamille : " + lg_FAMILLEARTICLE_ID + "  Invalide ");
                return null;
            }

            OTFamille.setLgFAMILLEARTICLEID(OTFamillearticle);

            OTFamille.setStrSTATUT(commonparameter.statut_enable);
            OTFamille.setDtCREATED(new Date());
            this.persiste(OTFamille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTFamille;

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }
        return OTFamille;
    }

    public boolean delete(String lg_FAMILLE_ID) {
        boolean result = false;
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        try {

            TFamille OTFamille = this.getDisableTFamile(lg_FAMILLE_ID);

            OTFamille.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTFamille);
            String Description = "Supression de l'article " + OTFamille.getStrNAME();

            TTypeStockFamille OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock("1",
                    OTFamille.getLgFAMILLEID());
            TFamilleStock OTFamilleStock = this.getTProductItemStock(OTFamille);
            TFamilleGrossiste OFamilleGrossiste = this.getFamilleGrossisteByIdFamille(OTFamille.getLgFAMILLEID());
            // code ajouté
            TFamilleZonegeo OTFamilleZonegeo = this.getTFamilleZonegeo(OTFamille.getLgFAMILLEID(),
                    OTTypeStockFamille.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

            //// verifie si produit inactif (statut=disable)
            if (OTFamille.getStrSTATUT().equalsIgnoreCase(commonparameter.statut_disable)) {
                System.out.println("statut_disable condition");
                OTTypeStockFamille.setStrSTATUT(commonparameter.statut_delete);

                // typeEtiquette.setIntNUMBER(0);
                if (this.merge(OTTypeStockFamille)) {
                    OTFamilleStock.setStrSTATUT(commonparameter.statut_delete);
                    OTFamilleZonegeo.setStrSTATUT(commonparameter.statut_delete);
                    /*
                     * OTFamilleStock.setIntNUMBERAVAILABLE(0); OTFamilleStock.setIntNUMBER(0);
                     */
                    OFamilleGrossiste.setStrSTATUT(commonparameter.statut_delete);
                    if (this.merge(OTFamilleStock) && this.merge(OFamilleGrossiste) && this.merge(OTFamilleZonegeo)) {
                        OTFamille.setStrSTATUT(commonparameter.statut_delete);
                        if (this.merge(OTFamille)) {
                            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

                            result = true;

                            return result;
                        } else {
                            this.buildErrorTraceMessage(
                                    "Impossible de supprimer un article qui a déjà été utilisé dans le système");
                            Description = this.getDetailmessage();
                        }
                    } else {
                        this.buildErrorTraceMessage(
                                "Impossible de supprimer un article qui a déjà été utilisé dans le système");
                        Description = this.getDetailmessage();
                    }
                } else {
                    this.buildErrorTraceMessage(
                            "Impossible de supprimer un article qui a déjà été utilisé dans le système");
                    Description = this.getDetailmessage();
                }
            }
            String desc = "Supression de l'article  " + OTFamille.getIntCIP() + " " + OTFamille.getStrNAME() + " par "
                    + this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME();
            // this.do_event_log(this.getOdataManager(), commonparameter.ALL, "Supression de l'article " +
            // OTFamille.getStrDESCRIPTION(), this.getOTUser().getStrLOGIN(), commonparameter.statut_enable, "TFamille",
            // "Donnee de ref", "Desactivation de produit", this.getOTUser().getLgUSERID());
            this.getOdataManager().getEm().persist(new TEventLog().build(this.getOTUser(), OTFamille.getIntCIP(), desc,
                    TypeLog.SUPPRESSION_DE_PRODUIT, Otable));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer un article qui a déjà été utilisé dans le système");
            // this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }
        return result;
    }

    public void disable(String lg_FAMILLE_ID) {
        TFamille OTFamille = null;
        try {
            OTFamille = getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            OTFamille.setStrSTATUT(commonparameter.statut_disable);
            String Description = "desactivation du produit libellé:: " + OTFamille.getStrNAME() + " CIP :: "
                    + OTFamille.getIntCIP();
            this.persiste(OTFamille);
            this.do_event_log(this.getOdataManager(), commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "TFamille", "Donnee de ref", "Desactivation de produit",
                    this.getOTUser().getLgUSERID());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de desactive " + Otable, e.getMessage());
        }

    }

    public void enable(String lg_FAMILLE_ID) {

        try {
            TFamille OTFamille = this.getTFamille(lg_FAMILLE_ID);

            OTFamille.setStrSTATUT(commonparameter.statut_enable);
            this.merge(OTFamille);
            String Description = "Activation du produit " + OTFamille.getStrDESCRIPTION() + " par l'utilisateur "
                    + this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME();
            // this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
            // commonparameter.statut_enable, "TFamille", "Donnee de ref", "");
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.sendSMS(Description, "TFamille", "Fiche article", "N_UPDATE_FAMILLE_PRICE", "Activation de produit");
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'activer l'article");
        }

    }

    // creation famille stock
    public TFamilleStock getOrCreateTFamilleStock(String lg_FAMILLE_ID, int int_NUMBER) {
        TFamilleStock OTFamilleStock = null;
        TFamille OTFamille = null;
        try {
            OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            new logger().OCategory.info(
                    "Famille Trouvée " + OTFamille.getStrDESCRIPTION() + " lg_FAMILLE_ID envoyé " + lg_FAMILLE_ID);
            OTFamilleStock = (TFamilleStock) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1")
                    .setParameter(1, OTFamille.getLgFAMILLEID()).getSingleResult();
            new logger().OCategory.info("Famille " + OTFamilleStock.getLgFAMILLEID().getStrDESCRIPTION());
        } catch (Exception e) {
            e.printStackTrace();
            OTFamilleStock = this.createFamilleStock(OTFamille, int_NUMBER, this.getOTUser().getLgEMPLACEMENTID());
        }
        return OTFamilleStock;
    }
    // fin creation famille stock

    // fonction pour verifier si un produit peut avoir sa version deconditionée ou non
    public boolean isDeconditionAuthorize(String lg_FAMILLE_ID) {
        boolean result = false;
        TFamille OTFamille = null;
        try {

            List<TFamille> lstTFamille = this.getTFamilleList(lg_FAMILLE_ID);
            OTFamille = lstTFamille.get(0);
            new logger().OCategory.fatal("Famille " + OTFamille.getStrDESCRIPTION() + " Etat decondition "
                    + OTFamille.getBoolDECONDITIONNE());
            if (OTFamille.getBoolDECONDITIONNE() == 0) {
                result = true;
            } else {
                this.buildSuccesTraceMessage("Désolé! Cet article n'est pas autorisé à être déconditionné");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Désolé! Cet article est déjà déconditionné. Création d'article déconditionné refusé");
        }
        new logger().OCategory.fatal("result isDeconditionAuthorize " + result);
        return result;
    }

    // fin fonction pour verifier si un produit peut avoir sa version deconditionée ou non
    // fonction pour verifier si un produit deconditionnable a deja sa version deconditionée ou non
    public boolean isDeconditionExist(String lg_FAMILLE_ID) {
        boolean result = false;
        TFamille OTFamille = null;
        try {

            List<TFamille> lstTFamille = this.getTFamilleList(lg_FAMILLE_ID);
            OTFamille = lstTFamille.get(0);
            new logger().OCategory.fatal("Famille " + OTFamille.getStrDESCRIPTION() + " Etat decondition "
                    + OTFamille.getBoolDECONDITIONNE());
            if (OTFamille.getBoolDECONDITIONNEEXIST() == 1) {
                result = true;
                this.buildSuccesTraceMessage("Désolé! Une version décondition de ce produit existe déjà");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.fatal("result isDeconditionExist " + result);
        return result;
    }

    // fin fonction pour verifier si un produit deconditionnable a deja sa version deconditionée ou non
    // creation de la version deconditionnée d'un article
    public boolean createProductDecondition(String lg_FAMILLE_ID, String str_NAME, String str_DESCRIPTION,
            int int_PRICE, int int_PRICE_TIPS, int int_TAUX_MARQUE, int int_PAF, int int_PAT, int int_S, String int_T,
            String int_CIP, String int_EAN13, String lg_GROSSISTE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_CODE_ACTE_ID, String lg_CODE_GESTION_ID, String str_CODE_REMISE,
            String str_CODE_TAUX_REMBOURSEMENT, String lg_ZONE_GEO_ID, int int_NUMBERDETAIL, String lg_FORME_ARTICLE_ID,
            String lg_FABRIQUANT_ID, short bool_DECONDITIONNE, String lg_TYPEETIQUETTE_ID, String lg_REMISE_ID,
            boolean bool_RESERVE, int int_SEUIL_RESERVE, int int_STOCK_REAPROVISONEMENT,
            int int_QTE_REAPPROVISIONNEMENT, int int_QUANTITY_STOCK) {
        boolean result = false;
        String lg_CODE_TVA_ID = "";

        try {
            new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID + " int_NUMBERDETAIL " + int_NUMBERDETAIL
                    + " int_PRICE " + int_PRICE);
            TFamille OTFamilleInit = this.getTFamille(lg_FAMILLE_ID);
            List<TFamilleGrossiste> lstTFamilleGrossiste = new ArrayList<>();
            List<EntityData> lstEntityData = new ArrayList<>();
            familleGrossisteManagement OfamilleGrossisteManagement = new familleGrossisteManagement(
                    this.getOdataManager());
            dciManagement OdciManagement = new dciManagement(this.getOdataManager());
            new logger().OCategory
                    .info("Famille de base " + OTFamilleInit.getStrNAME() + " CIP " + OTFamilleInit.getIntCIP());
            if (this.isDeconditionAuthorize(OTFamilleInit.getLgFAMILLEID())) { // on verifie si le produit peut avoir
                // une version deconditionnable
                if (!this.isDeconditionExist(OTFamilleInit.getLgFAMILLEID())) { // on verifie si le produit a deja une
                    // version deconditionnée
                    if (OTFamilleInit.getLgCODETVAID() != null) {
                        lg_CODE_TVA_ID = OTFamilleInit.getLgCODETVAID().getLgCODETVAID();
                    }
                    TFamille OTFamilleDeconditionne = this.create(str_NAME, str_DESCRIPTION, int_PRICE, int_PRICE_TIPS,
                            int_TAUX_MARQUE, int_PAF, int_PAT, int_S, int_T, int_CIP, int_EAN13, lg_GROSSISTE_ID,
                            lg_FAMILLEARTICLE_ID, lg_CODE_ACTE_ID, lg_CODE_GESTION_ID, str_CODE_REMISE,
                            str_CODE_TAUX_REMBOURSEMENT, lg_ZONE_GEO_ID, 0, 1, lg_FORME_ARTICLE_ID, lg_FABRIQUANT_ID,
                            bool_DECONDITIONNE, lg_TYPEETIQUETTE_ID, lg_REMISE_ID, lg_CODE_TVA_ID, bool_RESERVE,
                            int_SEUIL_RESERVE, OTFamilleInit.getLgFAMILLEID(), int_STOCK_REAPROVISONEMENT,
                            int_QTE_REAPPROVISIONNEMENT, int_QUANTITY_STOCK, "");

                    // code ajouté
                    lstTFamilleGrossiste = OfamilleGrossisteManagement.getListeFamilleGrossiste("",
                            OTFamilleInit.getLgFAMILLEID(), "%%");
                    for (TFamilleGrossiste OTFamilleGrossiste : lstTFamilleGrossiste) {
                        OfamilleGrossisteManagement.create(OTFamilleGrossiste.getLgGROSSISTEID(),
                                OTFamilleDeconditionne, OTFamilleGrossiste.getStrCODEARTICLE() + "D",
                                OTFamilleDeconditionne.getIntPRICE(), OTFamilleDeconditionne.getIntPAF());
                    }
                    lstEntityData = OdciManagement.ListDciFamille("", OTFamilleInit.getLgFAMILLEID(), "%%");
                    for (EntityData OEntityData : lstEntityData) {
                        OdciManagement.createFamilleDci(OEntityData.getStr_value3(),
                                OTFamilleDeconditionne.getLgFAMILLEID());
                    }

                    // fin code ajouté
                    // creation de famille stock de cette famille OTFamilleDecondition
                    // TFamilleStock OTFamilleStock = getOrCreateTFamilleStock(OTFamilleDecondition.getLgFAMILLEID(),
                    // 0);
                    // TFamilleStock OTFamilleStock = new
                    // tellerManagement(this.getOdataManager()).getTProductItemStock(OTFamilleDecondition);
                    // mise a jour du nombre de produit detail d'un produit
                    OTFamilleInit.setIntNUMBERDETAIL(int_NUMBERDETAIL);
                    OTFamilleInit.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE);
                    OTFamilleInit.setDtUPDATED(new Date());
                    if (this.persiste(OTFamilleInit)) {
                        if (OTFamilleInit.getBoolDECONDITIONNE() == 0) {
                            /*
                             * TFamilleStock OTProductItemStock = new tellerManagement(this.getOdataManager(),
                             * this.getOTUser()).getTProductItemStock(lg_FAMILLE_ID); //a decommenteren cas de probleme
                             * new suggestionManagement(this.getOdataManager()).makeSuggestionAuto(OTProductItemStock);
                             */
                        }
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    } else {
                        this.buildErrorTraceMessage("Echec de création du produit détail de l'article sélectionné");
                    }
                }
            }
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du produit détail de l'article sélectionné");
        }
        new logger().OCategory.info("result createProductDecondition " + result);
        return result;
    }
    // fin creation de la version deconditionnée d'un article

    // fonction pour creer une famille stock
    public TFamilleStock createFamilleStock(TFamille OTFamille, int int_NUMBER, TEmplacement OTEmplacement) {

        try {

            new logger().OCategory.info("Dans le createFamilleStock " + OTFamille.getStrDESCRIPTION() + " id "
                    + OTFamille.getLgFAMILLEID());
            TFamilleStock OTFamilleStock = new TFamilleStock();
            OTFamilleStock.setLgFAMILLESTOCKID(this.getKey().getComplexId());
            OTFamilleStock.setIntNUMBER(int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(int_NUMBER);
            OTFamilleStock.setLgEMPLACEMENTID(OTEmplacement);
            OTFamilleStock.setLgFAMILLEID(OTFamille);
            OTFamilleStock.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleStock.setDtCREATED(new Date());
            OTFamilleStock.setLgEMPLACEMENTID(OTEmplacement);
            this.persiste(OTFamilleStock);
            new logger().OCategory.info("Id famille stock généré " + OTFamilleStock.getLgFAMILLESTOCKID());
            return OTFamilleStock;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }
    // fin fonction pour creer une famille stock

    // fonction pour creer une famille stock
    public TFamilleStock createFamilleStock(TFamille OTFamille, int int_NUMBER, TEmplacement OTEmplacement,
            String lg_TYPE_STOCK_ID) {
        try {
            TFamilleStock OTFamilleStock = this.createFamilleStock(OTFamille, 0, OTEmplacement);
            if (OTFamilleStock != null) {
                new StockManager(this.getOdataManager(), this.getOTUser())
                        .createTypeStockFamille(OTFamille.getLgFAMILLEID(), lg_TYPE_STOCK_ID, 0, OTEmplacement);
            }
            return OTFamilleStock;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }
    // fin fonction pour creer une famille stock

    // liste des produits deconditionnes
    public List<TFamille> lstTFamilleDeconditionne(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<TFamille>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE t.boolDECONDITIONNE = ?1 AND t.strSTATUT = ?2 AND (t.strNAME LIKE ?3 OR t.strDESCRIPTION LIKE ?4) AND t.lgFAMILLEID LIKE ?5")
                    .setParameter(1, 1).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(5, lg_FAMILLE_ID).getResultList();
            for (TFamille OFamille : lstTFamille) {
                new logger().OCategory.info("Description " + OFamille.getStrDESCRIPTION());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }
    // fin liste des produits deconditionnes

    // version déconditionné d'un produit
    public TFamille getFamilleDecondition(String ing_CIP) {
        TFamille OTFamille = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE t.boolDECONDITIONNE = ?1 AND t.strSTATUT = ?2 AND t.intCIP LIKE ?3")
                    .setParameter(1, 1).setParameter(2, commonparameter.statut_enable).setParameter(3, ing_CIP + "%");
            if (qry.getResultList().size() > 0) {
                OTFamille = (TFamille) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamille;
    }
    // fin version déconditionné d'un produit

    // deconditionnement d'un article
    public boolean doDeconditionnement(String lg_FAMILLE_PARENT_ID, String lg_FAMILLE_CHILD_ID, int int_NUMBER) {
        boolean result = false;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        try {
            TFamille OTFamilleParent = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_PARENT_ID);
            TFamille OTFamilleChild = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_CHILD_ID);
            TFamilleStock OTFamilleStockParent = OtellerManagement.getTProductItemStock(
                    OTFamilleParent.getLgFAMILLEID(), this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            TFamilleStock OTFamilleStockChild = OtellerManagement.getTProductItemStock(OTFamilleChild.getLgFAMILLEID(),
                    this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (OTFamilleStockParent.getIntNUMBERAVAILABLE() < int_NUMBER) {
                this.buildSuccesTraceMessage("Stock insuffisant. Impossible de déconditionner");
            } else {
                OTFamilleStockParent.setIntNUMBERAVAILABLE(OTFamilleStockParent.getIntNUMBERAVAILABLE() - int_NUMBER);
                OTFamilleStockParent.setIntNUMBER(OTFamilleStockParent.getIntNUMBERAVAILABLE());
                OTFamilleStockParent.setDtUPDATED(new Date());
                OTFamilleStockChild.setIntNUMBERAVAILABLE(OTFamilleStockChild.getIntNUMBERAVAILABLE()
                        + (int_NUMBER * OTFamilleParent.getIntNUMBERDETAIL()));
                OTFamilleStockChild.setIntNUMBER(OTFamilleStockChild.getIntNUMBERAVAILABLE());
                OTFamilleStockChild.setDtUPDATED(new Date());
                this.persiste(OTFamilleStockParent);
                this.persiste(OTFamilleStockChild);
                this.createDeconditionnement(OTFamilleChild, int_NUMBER * OTFamilleParent.getIntNUMBERDETAIL());
                this.createDeconditionnement(OTFamilleParent, int_NUMBER);

                if (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                        .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                    new suggestionManagement(this.getOdataManager(), this.getOTUser())
                            .makeSuggestionAuto(OTFamilleStockParent);
                }
                SnapshotManager snapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());

                if (snapshotManager.SaveMouvementFamille(OTFamilleChild, "", commonparameter.ADD,
                        commonparameter.str_ACTION_DECONDITIONNEMENT, int_NUMBER * OTFamilleParent.getIntNUMBERDETAIL(),
                        this.getOTUser().getLgEMPLACEMENTID()) != null
                        && snapshotManager.SaveMouvementFamille(OTFamilleParent, "", commonparameter.REMOVE,
                                commonparameter.str_ACTION_DECONDITIONNEMENT, int_NUMBER,
                                this.getOTUser().getLgEMPLACEMENTID()) != null) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                }

            }
            this.buildSuccesTraceMessage("Déconditionnement effectué");
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec du déconditionnement");
        }
        new logger().OCategory.info("result doDeconditionnement " + result);
        return result;
    }

    public boolean doDeconditionnement(String lg_FAMILLE_ID, int int_NUMBER) {
        boolean result = false;

        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        int numberToDecondition = 1;
        String lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        try {
            TFamille OTFamilleChild = this.getTFamille(lg_FAMILLE_ID);
            TFamille OTFamilleParent = this.getTFamille(OTFamilleChild.getLgFAMILLEPARENTID());
            TFamilleStock OTFamilleStockParent = OtellerManagement
                    .getTProductItemStock(OTFamilleParent.getLgFAMILLEID(), lg_EMPLACEMENT_ID);
            TFamilleStock OTFamilleStockChild = OtellerManagement.getTProductItemStock(OTFamilleChild.getLgFAMILLEID(),
                    lg_EMPLACEMENT_ID);
            OTFamilleStockParent
                    .setIntNUMBERAVAILABLE(OTFamilleStockParent.getIntNUMBERAVAILABLE() - numberToDecondition);
            OTFamilleStockParent.setIntNUMBER(OTFamilleStockParent.getIntNUMBERAVAILABLE());
            OTFamilleStockParent.setDtUPDATED(new Date());
            OTFamilleStockChild.setIntNUMBERAVAILABLE(OTFamilleStockChild.getIntNUMBERAVAILABLE()
                    + (numberToDecondition * OTFamilleParent.getIntNUMBERDETAIL()));
            OTFamilleStockChild.setIntNUMBER(OTFamilleStockChild.getIntNUMBERAVAILABLE());
            OTFamilleStockChild.setDtUPDATED(new Date());
            this.persiste(OTFamilleStockParent);
            this.persiste(OTFamilleStockChild);
            createDecondtionne(OTFamilleParent, int_NUMBER);
            createDecondtionne(OTFamilleChild, int_NUMBER * OTFamilleParent.getIntNUMBERDETAIL());
            this.buildSuccesTraceMessage("Déconditionnement effectué");
            if (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                new suggestionManagement(this.getOdataManager(), this.getOTUser())
                        .makeSuggestionAuto(OTFamilleStockParent);
            }
            SnapshotManager snapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());

            if (snapshotManager.SaveMouvementFamille(OTFamilleChild, "", commonparameter.ADD,
                    commonparameter.str_ACTION_DECONDITIONNEMENT,
                    numberToDecondition * OTFamilleParent.getIntNUMBERDETAIL(),
                    this.getOTUser().getLgEMPLACEMENTID()) != null
                    && snapshotManager.SaveMouvementFamille(OTFamilleParent, "", commonparameter.REMOVE,
                            commonparameter.str_ACTION_DECONDITIONNEMENT, numberToDecondition,
                            this.getOTUser().getLgEMPLACEMENTID()) != null) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            }

            // }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec du déconditionnement");
        }
        new logger().OCategory.info("result doDeconditionnement " + result);
        return result;
    }
    // fin deconditionnement d'un article

    // liste des articles
    private void createDecondtionne(TFamille OTFamille, int int_NUMBER) {
        TDeconditionnement OTDeconditionnement = new TDeconditionnement();
        OTDeconditionnement.setLgDECONDITIONNEMENTID(this.getKey().getComplexId());
        OTDeconditionnement.setLgFAMILLEID(OTFamille);
        OTDeconditionnement.setLgUSERID(this.getOTUser());
        OTDeconditionnement.setIntNUMBER(int_NUMBER);
        OTDeconditionnement.setDtCREATED(new Date());
        OTDeconditionnement.setStrSTATUT(commonparameter.statut_enable);
        this.getOdataManager().getEm().persist(OTDeconditionnement);
    }

    public List<TFamille> getListArticle(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT dt_LAST_INVENTAIRE, lg_FAMILLE_ID,str_NAME,str_DESCRIPTION,int_CIP,int_CIP2,int_EAN13, int_PRICE, lg_REMISE_ID, bool_RESERVE, int_PAF"
                    + ", int_PAT  FROM t_famille  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' )  AND str_STATUT = '" + commonparameter.statut_enable + "' ORDER BY str_DESCRIPTION ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                TRemise OTRemise = this.getOdataManager().getEm().find(TRemise.class,
                        Ojconnexion.get_resultat().getString("lg_REMISE_ID"));
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));

                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setLgREMISEID(OTRemise);
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                OTFamille.setIntPAT(Ojconnexion.get_resultat().getInt("int_PAT"));
                OTFamille.setBoolRESERVE(Boolean.parseBoolean(Ojconnexion.get_resultat().getString("bool_RESERVE")));
                OTFamille.setDtLASTINVENTAIRE(
                        this.getKey().stringToDate(Ojconnexion.get_resultat().getString("dt_LAST_INVENTAIRE")));
                // int_STOCK_REAPROVISONEMENT
                // int_QTE_REAPPROVISIONNEMENT
                // int_PRICE

                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return lstTFamille;
    }

    public List<TFamille> getListArticleBis(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            /*
             * lstTFamille = this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TFamille t WHERE t.lgFAMILLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2) AND t.strSTATUT = ?5 ORDER BY t.strDESCRIPTION ASC"
             * ) // ancienne bonne requete. a decommenter en cas de probleme .setParameter(1,
             * lg_FAMILLE_ID).setParameter(2, search_value + "%").setParameter(3, search_value + "%").setParameter(4,
             * search_value + "%").setParameter(5, commonparameter.statut_enable).getResultList();
             */
            if (lg_DCI_ID.equalsIgnoreCase("")) {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.strSTATUT = ?5 GROUP BY t.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                        .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                        .setParameter(5, commonparameter.statut_enable).getResultList();
            } else {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND t.lgFAMILLEID LIKE ?1 AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 GROUP BY t.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                        .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                        .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID).getResultList();

            }

        } catch (Exception e) {
            // new logger().OCategory.info(" **** getListArticle catch error **** " + e.toString());
            e.printStackTrace();
        }
        // new logger().OCategory.info("lstTFamille taille " + lstTFamille.size());
        return lstTFamille;
    }

    // liste des articles en tenant compte des depot
    public List<TTypeStockFamille> getListArticleBis(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID,
            String lg_TYPE_STOCK_ID) {
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        String lg_EMPLACEMENT_ID = "";
        // privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            if (lg_DCI_ID.equalsIgnoreCase("")) {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                        .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                        .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_TYPE_STOCK_ID)
                        .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
            } else {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                        .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                        .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                        .setParameter(7, lg_TYPE_STOCK_ID).setParameter(8, lg_EMPLACEMENT_ID).getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTTypeStockFamille;
    }

    public List<TTypeStockFamille> getListArticleBis(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID,
            String lg_TYPE_STOCK_ID, int start, int limit) {
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (search_value == null || search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
                lg_TYPE_STOCK_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            if (lg_DCI_ID.equalsIgnoreCase("")) {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                        .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                        .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_TYPE_STOCK_ID)
                        .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit).getResultList();
            } else {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                        .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                        .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                        .setParameter(7, lg_TYPE_STOCK_ID).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                        .setMaxResults(limit).getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTTypeStockFamille;
    }
    // fin liste des articles en tenant compte des depots

    public List<TFamille> getListArticleByJdbc(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_article_recherche  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%'   OR str_CODE_ARTICLE LIKE '" + search_value + "%'  )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC";
            // String qry = "SELECT
            // ts.int_NUMBER_AVAILABLE,ts.int_NUMBER,f.lg_FAMILLE_ID,f.str_NAME,f.int_PRICE,f.str_DESCRIPTION,
            // f.int_CIP,f.int_CIP2,f.int_EAN13, fg.str_CODE_ARTICLE FROM t_famille f, t_famille_stock ts,
            // t_famille_grossiste fg WHERE f.lg_FAMILLE_ID = ts.lg_FAMILLE_ID AND f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID
            // AND (f.int_CIP LIKE '"+search_value+"%' OR f.int_EAN13 LIkE '"+search_value+"%' OR f.str_DESCRIPTION LIKE
            // '"+search_value+"%' OR fg.str_CODE_ARTICLE LIKE '"+search_value+"%') AND f.str_STATUT =
            // '"+commonparameter.statut_enable+"' AND f.lg_FAMILLE_ID LIKE '"+lg_FAMILLE_ID+"' GROUP BY f.lg_FAMILLE_ID
            // ORDER BY f.str_DESCRIPTION ASC"; // a decommenter en cas de probleme

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setBlPROMOTED(Ojconnexion.get_resultat().getBoolean("bl_PROMOTED"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE"));
                OTFamille.setBlPROMOTED(Ojconnexion.get_resultat().getBoolean("bl_PROMOTED"));
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            new logger().OCategory.fatal(ex.getMessage());
        }

        return lstTFamille;
    }

    public List<TFamille> getListArticleByJdbc(String search_value, String lg_FAMILLE_ID, int start, int limit) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_article_recherche  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%'   OR str_CODE_ARTICLE LIKE '" + search_value + "%'  )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC LIMIT " + start + "," + limit;

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setBlPROMOTED(Ojconnexion.get_resultat().getBoolean("bl_PROMOTED"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE"));
                OTFamille.setBlPROMOTED(Ojconnexion.get_resultat().getBoolean("bl_PROMOTED"));
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            new logger().OCategory.fatal(ex.getMessage());
        }
        return lstTFamille;
    }

    public List<TFamille> getListArticleByJdbc(String search_value, String lg_FAMILLE_ID, String lg_ZONE_GEO_ID,
            int start, int limit) {
        List<TFamille> lstTFamille = new ArrayList<>();
        TFamille OTFamille = null;
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT lg_FAMILLE_ID, int_CIP, str_DESCRIPTION, int_PRICE, int_PAF, int_NUMBER_AVAILABLE, lg_ZONE_GEO_ID FROM v_article_recherche  WHERE lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '"
                    + search_value + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%'   OR str_CODE_ARTICLE LIKE '" + search_value + "%'  )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND lg_ZONE_GEO_ID LIKE '"
                    + lg_ZONE_GEO_ID + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC LIMIT " + start + ","
                    + limit;

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                OTFamille.setIntPAT(Ojconnexion.get_resultat().getInt("int_NUMBER_AVAILABLE"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("lg_ZONE_GEO_ID"));
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return lstTFamille;
    }

    public int getTotalListArticleByJdbc(String search_value, String lg_FAMILLE_ID, String lg_ZONE_GEO_ID) {
        int result = 0;
        try {

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT COUNT(DISTINCT(lg_FAMILLE_ID)) AS TOTAL FROM v_article_recherche WHERE lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '"
                    + search_value + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%'   OR str_CODE_ARTICLE LIKE '" + search_value + "%'  )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND lg_ZONE_GEO_ID LIKE '"
                    + lg_ZONE_GEO_ID + "' ORDER BY str_DESCRIPTION ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                result = Ojconnexion.get_resultat().getInt("TOTAL");
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return result;
    }

    public List<TFamille> getListArticleDCIByJdbc(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<TFamille>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT int_NUMBER_AVAILABLE,int_NUMBER
            // ,lg_FAMILLE_ID,str_NAME,int_PRICE,str_DESCRIPTION,int_CIP,int_CIP2,int_EAN13 FROM v_article_recherche_dci
            // WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "' AND (str_NAME LIKE '" + search_value + "%' OR
            // str_DESCRIPTION LIKE '" + search_value + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '"
            // + search_value + "%' OR str_CODE LIKE '" + search_value + "%' OR str_NAME_DCI LIKE '" + search_value +
            // "%' ) AND str_STATUT = '" + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '" +
            // this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' GROUP BY lg_FAMILLE_ID ORDER BY
            // str_DESCRIPTION ASC";
            String qry = "SELECT * FROM v_article_recherche_dci  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' OR str_CODE LIKE '" + search_value + "%' OR str_NAME_DCI LIKE '" + search_value
                    + "%' )  AND str_STATUT = '" + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setBlPROMOTED(Ojconnexion.get_resultat().getBoolean("bl_PROMOTED"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE"));

                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return lstTFamille;
    }

    public List<TFamille> getListArticleDCIByJdbcInit(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT int_NUMBER_AVAILABLE,int_NUMBER ,lg_FAMILLE_ID,str_NAME,int_PRICE,str_DESCRIPTION,int_CIP,int_CIP2,int_EAN13  FROM v_article_recherche_dci  WHERE lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '"
                    + search_value + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' OR str_CODE LIKE '" + search_value + "%' OR str_NAME_DCI LIKE '" + search_value
                    + "%' ) AND bool_DECONDITIONNE = 0 AND str_STATUT = '" + commonparameter.statut_enable
                    + "' AND lg_EMPLACEMENT_ID = '" + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));

                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE")); // remplacé par
                // l'emplaceement
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return lstTFamille;
    }

    // fin liste des articles
    // liste des articles qui ont des déconditionnés
    public List<TFamille> getListArticleDecondition(String search_value, String lg_DCI_ID, short boolDECONDITIONNE) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (lg_DCI_ID.equalsIgnoreCase("")) {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.strSTATUT = ?5 AND t.boolDECONDITIONNE LIKE ?6 AND t.boolDECONDITIONNEEXIST LIKE ?7 GROUP BY t.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(3, search_value + "%")
                        .setParameter(4, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, boolDECONDITIONNE).setParameter(7, 1).getResultList();
            } else {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TFamilleGrossiste fg, TFamilleDci fd WHERE fd.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.strSTATUT = ?5 AND t.boolDECONDITIONNE LIKE ?6 AND t.boolDECONDITIONNEEXIST LIKE ?7 AND fd.lgDCIID.lgDCIID LIKE ?8 GROUP BY t.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(3, search_value + "%")
                        .setParameter(4, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, boolDECONDITIONNE).setParameter(7, 1).setParameter(8, lg_DCI_ID)
                        .getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTFamille;
    }
    // fin liste des articles qui ont des déconditionnés

    // liste des articles qui ont des déconditionnés en tenant compte des depots
    public List<TTypeStockFamille> getListArticleDecondition(String search_value, String lg_DCI_ID,
            short boolDECONDITIONNE, String lg_TYPE_STOCK_ID) {
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            if (lg_DCI_ID.equalsIgnoreCase("")) {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.boolDECONDITIONNE LIKE ?6 AND t.lgFAMILLEID.boolDECONDITIONNEEXIST LIKE ?7 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(3, search_value + "%")
                        .setParameter(4, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, boolDECONDITIONNE).setParameter(7, 1).setParameter(8, lg_TYPE_STOCK_ID)
                        .getResultList();
            } else {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeStockFamille t, TFamilleGrossiste fg, TFamilleDci fd WHERE fd.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.boolDECONDITIONNE LIKE ?6 AND t.lgFAMILLEID.boolDECONDITIONNEEXIST LIKE ?7 AND fd.lgDCIID.lgDCIID LIKE ?8 AND t.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(3, search_value + "%")
                        .setParameter(4, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, boolDECONDITIONNE).setParameter(7, 1).setParameter(8, lg_DCI_ID)
                        .setParameter(9, lg_TYPE_STOCK_ID).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTTypeStockFamille;
    }
    // fin liste des articles qui ont des déconditionnés en tenant compte des depots

    // verifier si la quantité du produit initial est disponible pour faire un deconditionnement
    public boolean isReapproDeconditionNeed(int int_NUMBER, String lg_FAMILLE_ID) {
        boolean result = false;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager());
        double rest = 0.0;

        try {

            TFamille OFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            TFamilleStock OTFamilleStock = OtellerManagement.getTProductItemStock(OFamille);
            try {
                TFamille OFamilleParent = this.getProductInitByDeconditionne(OFamille.getLgFAMILLEID());
                TFamilleStock OTFamilleStockParent = OtellerManagement.getTProductItemStock(OFamilleParent);
                new logger().OCategory.info("Famille " + OTFamilleStock.getLgFAMILLEID().getStrNAME()
                        + " Quantité stock " + OTFamilleStock.getIntNUMBERAVAILABLE() + " Quantité demandée "
                        + int_NUMBER + " Quantité parent " + OTFamilleStockParent.getIntNUMBERAVAILABLE());
                rest = OTFamilleStockParent.getIntNUMBERAVAILABLE() / int_NUMBER;
                if (rest < 1) {
                    this.buildErrorTraceMessage("Produit initial insuffisant");
                } else {
                    if (OTFamilleStock.getIntNUMBERAVAILABLE() < int_NUMBER) {
                        this.buildSuccesTraceMessage(
                                "Stock déconditionné insuffisant. Procédez à un déconditionnement");
                        result = true;
                    }
                }

            } catch (Exception e) {
                e.printStackTrace();
                this.buildErrorTraceMessage(
                        "Impossible de vérifier les différentes quantités pour le déconditionnement");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Article inexistant");
        }
        new logger().OCategory.info(this.getDetailmessage() + " resultat " + result);
        return result;
    }

    public TFamille getProductInitByDeconditionne(String lg_FAMILLE_ID) {
        String int_CIP_PARENT;
        try {
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            new logger().OCategory.info("Famille " + OTFamille.getStrNAME());
            int_CIP_PARENT = OTFamille.getIntCIP().substring(0, 7);
            TFamille OFamilleParent = (TFamille) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamille t WHERE t.intCIP LIKE ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, int_CIP_PARENT).setParameter(2, commonparameter.statut_enable).getSingleResult();
            new logger().OCategory.info("Famille parent " + OFamilleParent.getStrNAME());
            return OFamilleParent;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Article inexistant");
            return null;
        }

    }
    // fin retrouve le produit initial d'un produit deconditionné

    // liste des articles
    public List<TFamille> showAllOrOneArticle(String search_value, String lg_FAMILLE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            new logger().OCategory.info("search_value " + search_value + "-lg_FAMILLE_ID++" + lg_FAMILLE_ID
                    + "-lg_FAMILLEARTICLE_ID++" + lg_FAMILLEARTICLE_ID + "-lg_ZONE_GEO_ID++" + lg_ZONE_GEO_ID
                    + "-lg_FABRIQUANT_ID++" + lg_FABRIQUANT_ID + "-");
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                    .setParameter(3, lg_FAMILLE_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                    .setParameter(5, lg_ZONE_GEO_ID).setParameter(6, lg_FABRIQUANT_ID)
                    .setParameter(7, commonparameter.statut_enable).getResultList();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }

    public List<TFamille> showAllOrOneArticle(String search_value, String lg_FAMILLE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID, String lg_EMPLACEMENT_ID) {
        List<TFamille> lstTFamille = new ArrayList<TFamille>();
        String lg_TYPE_STOCK_ID = "1";
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!lg_TYPE_STOCK_ID.equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                lg_TYPE_STOCK_ID = "3";
            }

            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 OR t.intCIP LIKE ?1 OR t.intEAN13 LIKE ?1) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND tt.lgTYPESTOCKID.lgTYPESTOCKID = ?9 ORDER BY t.strNAME ASC")
                    .setParameter(1, search_value + "%").setParameter(3, lg_FAMILLE_ID)
                    .setParameter(4, lg_FAMILLEARTICLE_ID).setParameter(5, lg_ZONE_GEO_ID)
                    .setParameter(6, lg_FABRIQUANT_ID).setParameter(7, commonparameter.statut_enable)
                    .setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, lg_TYPE_STOCK_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }

    public List<TFamille> showAllOrOneArticle() {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {

            lstTFamille = this.getOdataManager().getEm().createQuery("SELECT t FROM TFamille t WHERE t.strSTATUT = ?1")
                    .setParameter(1, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }
    // fin liste famille

    // definition du seuil de reappro d'un produit
    // fonction de mise a jour les nouveaux seuils de stock de produit
    public void defineSeuilReaprovisionnement(TFamille oTFamille) {
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_DAY_STOCK);
        TParameters OTParameters_REAPPRO = this.getOdataManager().getEm().find(TParameters.class,
                Parameter.KEY_DELAI_REAPPRO);

        Date dt_DEBUT = this.getKey().getFirstDayofSomeMonth(-3);
        Date dt_FIN = this.getKey().getLastDayofPreviousMonth();
        new logger().OCategory
                .info("dt_DEBUT " + dt_DEBUT + " dt_FIN " + dt_FIN + " Famille " + oTFamille.getStrDESCRIPTION());
        double int_total_vente = new WarehouseManager(this.getOdataManager()).getTotalVenteByPeriode(dt_DEBUT, dt_FIN,
                oTFamille);
        new logger().OCategory.info("int_total_vente " + int_total_vente);

        double int_number_by_semaine = (int_total_vente / 3) / 4;
        new logger().OCategory.info("int_number_by_semaine " + int_number_by_semaine);

        double result = 0;
        result = (int_number_by_semaine / 7) * Integer.parseInt(OTParameters.getStrVALUE());
        int int_seuil_min = (int) result;
        new logger().OCategory.info("result " + result);

        int int_seuil_max = int_seuil_min * Integer.parseInt(OTParameters.getStrVALUE());
        oTFamille.setIntSEUILMAX(int_seuil_max);
        oTFamille.setIntSEUILMIN(int_seuil_min);
        oTFamille.setIntQTEREAPPROVISIONNEMENT(
                (int) ((int_number_by_semaine / 7) * Integer.parseInt(OTParameters_REAPPRO.getStrVALUE())));
        new logger().OCategory.info("int_seuil_min " + int_seuil_min + " int_seuil_max " + int_seuil_max);
        oTFamille.setDtUPDATED(new Date());
        this.persiste(oTFamille);
    }

    // fin fonction de mise a jour les nouveaux seuils de stock de produit
    // Liste des produits initiaux
    public TFamille showOneInitial(String search_value, String lg_FAMILLE_ID) {

        TFamille OTFamille = null;

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTFamille = (TFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE t.boolDECONDITIONNE = ?1 AND t.strSTATUT = ?2 AND (t.strNAME LIKE ?3 OR t.strDESCRIPTION LIKE ?4 OR t.intCIP LIKE ?5 OR t.lgFAMILLEID LIKE ?6 )")
                    .setParameter(1, 0).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(5, "%" + search_value + "%").setParameter(6, lg_FAMILLE_ID).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTFamille;
    }

    // liste des produits initiaux
    public List<TFamille> showAllInitial(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE t.boolDECONDITIONNE = ?1 AND t.strSTATUT = ?2 AND (t.strNAME LIKE ?3 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?3 OR t.intEAN13 LIKE ?3) AND t.lgFAMILLEID LIKE ?6")
                    .setParameter(1, 0).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, search_value + "%").setParameter(6, lg_FAMILLE_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }

    public List<TFamille> showAllOrOneArticle(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE t.boolDECONDITIONNE = ?1 AND t.strSTATUT = ?2 AND (t.strNAME LIKE ?3 OR t.strDESCRIPTION LIKE ?4) AND t.lgFAMILLEID LIKE ?5")
                    .setParameter(1, 0).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(5, lg_FAMILLE_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }

    public List<TFamille> showAllOrOneArticleBis(String search_value, String lg_FAMILLE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            new logger().OCategory.info("search_value " + search_value + "-lg_FAMILLE_ID++" + lg_FAMILLE_ID
                    + "-lg_FAMILLEARTICLE_ID++" + lg_FAMILLEARTICLE_ID + "-lg_ZONE_GEO_ID++" + lg_ZONE_GEO_ID
                    + "-lg_FABRIQUANT_ID++" + lg_FABRIQUANT_ID + "-");
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8")
                    .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                    .setParameter(3, lg_FAMILLE_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                    .setParameter(5, lg_ZONE_GEO_ID).setParameter(6, lg_FABRIQUANT_ID)
                    .setParameter(7, commonparameter.statut_enable)
                    .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }

    // fin liste des produits initiaux
    // recuperation de famille
    public List<TFamille> getTFamilleList(String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {

            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE (t.lgFAMILLEID LIKE ?1 OR t.intCIP LIKE ?1 OR t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 OR t.intEAN13 LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter("1", lg_FAMILLE_ID).setParameter("2", commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildTraceMessage("ERROR", e.toString());

        }
        return lstTFamille;
    }

    public TFamille getTFamille(String lg_FAMILLE_ID) {
        TFamille OTFamille = null;
        try {
            // new logger().OCategory.info("lg_FAMILLE_ID dans getTFamille " + lg_FAMILLE_ID);
            // TParameters OTParameters = new
            // TparameterManager(this.getOdataManager()).getParameter(commonparameter.PARAMETER_INDICE_SECURITY);
            new logger().OCategory.info("lg_FAMILLE_ID-----:" + lg_FAMILLE_ID);
            if (!lg_FAMILLE_ID.equals("")) {
                OTFamille = (TFamille) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t WHERE (t.lgFAMILLEID = ?1 OR t.intCIP = ?1 OR t.strNAME = ?1 OR t.strDESCRIPTION = ?1 OR t.intEAN13 = ?1) AND t.strSTATUT = ?2")
                        .setParameter("1", lg_FAMILLE_ID).setParameter(2, commonparameter.statut_enable)
                        .setMaxResults(1).getSingleResult();

            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Article inexistant");
        }
        return OTFamille;
    }

    // fin recuperation de famille
    // debut calcul prix moyen pondéré
    public void calculPrixMoyenPondere(TFamille OTFamille, String str_REF_LIVRAISON) {

        double prixMoyenPonderer = 0;
        int int_QTE_STOCK = 0, int_PAF = 0, int_QTE_ENTREE = 0, int_PAF_ENTREE = 0;
        // tellerManagement OtellerManagement = new tellerManagement(getOdataManager(), getOTUser());
        bonLivraisonManagement ObonLivraisonManagement = new bonLivraisonManagement(getOdataManager(), getOTUser());

        TBonLivraisonDetail OTBonLivraisonDetail;

        try {

            int_PAF = OTFamille.getIntPAF();

            OTBonLivraisonDetail = ObonLivraisonManagement.findTBonLivraisonDetail(str_REF_LIVRAISON,
                    OTFamille.getLgFAMILLEID());

            if (OTBonLivraisonDetail != null) {

                int_QTE_ENTREE = OTBonLivraisonDetail.getIntQTERECUE();
                int_PAF_ENTREE = OTBonLivraisonDetail.getIntPAF();

                prixMoyenPonderer = ((int_QTE_STOCK * int_PAF) + (int_QTE_ENTREE * int_PAF_ENTREE))
                        / (int_QTE_STOCK + int_QTE_ENTREE);

                OTFamille.setDblPRIXMOYENPONDERE(prixMoyenPonderer);
                OTFamille.setIntPAF(OTBonLivraisonDetail.getIntPAF());
                OTFamille.setIntPAT(OTBonLivraisonDetail.getIntPAREEL());
                OTFamille.setIntPRICE(OTBonLivraisonDetail.getIntPRIXVENTE());
                OTFamille.setIntPRICETIPS(OTBonLivraisonDetail.getIntPRIXREFERENCE());

                this.getOdataManager().getEm().persist(OTFamille);

            }

            new logger().OCategory.info("prixMoyenPonderer " + prixMoyenPonderer);

        } catch (Exception e) {

        }

    }

    // fin calcul prix moyen pondéré
    // recuperation d'un code tva
    public TCodeTva getCodeTva(String search_value) {
        TCodeTva OTCodeTva = null;
        try {
            OTCodeTva = (TCodeTva) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TCodeTva t WHERE t.strNAME = ?1 OR t.lgCODETVAID = ?1")
                    .setParameter(1, search_value).getSingleResult();

        } catch (Exception e) {
        }
        return OTCodeTva;
    }
    // fin recuperation d'un code tva

    // liste des codes tva
    public List<TCodeTva> listeTCodeTva(String search_value, String lg_CODE_TVA_ID) {
        List<TCodeTva> lstTCodeTva = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTCodeTva = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCodeTva t WHERE t.lgCODETVAID LIKE ?1 AND t.strNAME LIKE ?2 AND t.strSTATUT = ?3")
                    .setParameter(2, search_value + "%").setParameter(1, lg_CODE_TVA_ID)
                    .setParameter(3, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTCodeTva taille " + lstTCodeTva.size());
        return lstTCodeTva;
    }
    // fin liste des codes tva

    // calcul de la quantité de réappro à suggérer basé sur le code gestion d'un article
    public int getQuantityReapportByCodeGestionArticle__(TFamilleStock OTFamilleStock) {
        int result = 0, int_TOTAL_JOURS_VENTE = 0, int_BUTOIR_CHOISI = 0, mois_histo = 1;
        Double qteReappro = 0.0, int_SEUIL_MIN_CALCULE = 0.0, qteVenteArticle = 0.0, qteVenteJour = 0.0;
        TCalendrier OTCalendrier = null;
        CalendrierManager OCalendrierManager = new CalendrierManager(this.getOdataManager(), this.getOTUser());
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        CodeGestionManager OCodeGestionManager = new CodeGestionManager(this.getOdataManager(), this.getOTUser());
        List<TCoefficientPonderation> lstTCoefficientPonderations;

        try {
            new logger().OCategory.info("Dans le debut getQuantityReapportByCodeGestionArticle "
                    + OTFamilleStock.getLgFAMILLEID().getStrDESCRIPTION());
            String dateJ = this.getKey().getoDay(new Date());
            int JourDuMois = Integer.parseInt(dateJ);
            TCodeGestion OTCodeGestion = OTFamilleStock.getLgFAMILLEID().getLgCODEGESTIONID();
            mois_histo = OTCodeGestion.getIntMOISHISTORIQUEVENTE();
            // choix du butoir
            if (JourDuMois > OTCodeGestion.getIntDATEBUTOIRARTICLE()) {
                int_BUTOIR_CHOISI = OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDATEBUTOIRARTICLE();
            } else {
                int_BUTOIR_CHOISI = OTCodeGestion.getIntDATEBUTOIRARTICLE();
            }
            // fin choix du butoir

            // determination du nombre de jour de couverture
            result = int_BUTOIR_CHOISI - JourDuMois;
            new logger().OCategory.info("result " + result + " int_BUTOIR_CHOISI " + int_BUTOIR_CHOISI);
            if (!(result < OTCodeGestion.getIntJOURSCOUVERTURESTOCK())) {
                result = OTCodeGestion.getIntJOURSCOUVERTURESTOCK();
            }
            new logger().OCategory.info("result final " + result);
            // fin determination du nombre de jour de couverture

            // determination du nombre de vente sur les mois historique du produit
            if (OTCodeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equalsIgnoreCase("1")) {
                for (int i = 1; i <= mois_histo; i++) {
                    new logger().OCategory.info("i ---- " + i + " mois histo ---" + mois_histo);
                    OTCalendrier = OCalendrierManager.getTCalendrier(
                            String.valueOf(Integer.parseInt(date.getoMois(new Date())) - i),
                            Integer.parseInt(date.getAnnee(new Date())));
                    if (OTCalendrier != null) {
                        qteVenteArticle += OSnapshotManager.getQauntityVenteByArticle(
                                OTFamilleStock.getLgFAMILLEID().getStrDESCRIPTION(), OTCalendrier.getDtBEGIN(),
                                OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%", "%%");
                        int_TOTAL_JOURS_VENTE += OTCalendrier.getIntNUMBERJOUR();
                    }
                }
            } else if (OTCodeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equalsIgnoreCase("2")) {
                lstTCoefficientPonderations = OCodeGestionManager
                        .getListTCoefficientPonderation(OTCodeGestion.getLgCODEGESTIONID());
                mois_histo = OTCodeGestion.getIntMOISHISTORIQUEVENTE();
                if (lstTCoefficientPonderations.size() < OTCodeGestion.getIntMOISHISTORIQUEVENTE()) {
                    mois_histo = lstTCoefficientPonderations.size();
                }
                new logger().OCategory.info("lstTCoefficientPonderations taille " + lstTCoefficientPonderations.size()
                        + " mois histo " + mois_histo);
                for (int i = 1; i <= mois_histo; i++) {
                    OTCalendrier = OCalendrierManager.getTCalendrier(
                            String.valueOf(Integer.parseInt(date.getoMois(new Date())) - i),
                            Integer.parseInt(date.getAnnee(new Date())));
                    if (OTCalendrier != null) {
                        new logger().OCategory.info("Coefficient i : " + i + " valeur "
                                + lstTCoefficientPonderations.get((i - 1)).getIntCOEFFICIENTPONDERATION());
                        qteVenteArticle += (OSnapshotManager.getQauntityVenteByArticle(
                                OTFamilleStock.getLgFAMILLEID().getStrDESCRIPTION(), OTCalendrier.getDtBEGIN(),
                                OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%", "%%")
                                * lstTCoefficientPonderations.get((i - 1)).getIntCOEFFICIENTPONDERATION());
                        int_TOTAL_JOURS_VENTE += OTCalendrier.getIntNUMBERJOUR();
                    }
                }
            }
            // fin determination du nombre de vente sur les mois historique du produit
            new logger().OCategory
                    .info("int_TOTAL_JOURS_VENTE " + int_TOTAL_JOURS_VENTE + " qteVenteArticle " + qteVenteArticle);
            if (OTCodeGestion.getIntDATELIMITEEXTRAPOLATION() <= JourDuMois) {
                OTCalendrier = OCalendrierManager.getTCalendrier(date.getoMois(new Date()),
                        Integer.parseInt(date.getAnnee(new Date())));
                if (OTCalendrier != null) {
                    qteVenteArticle += (OSnapshotManager.getQauntityVenteByArticle(
                            OTFamilleStock.getLgFAMILLEID().getStrDESCRIPTION(), OTCalendrier.getDtBEGIN(),
                            OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%", "%%")
                            * OTCodeGestion.getIntCOEFFICIENTPONDERATION());
                    int_TOTAL_JOURS_VENTE += OTCalendrier.getIntNUMBERJOUR();
                }
                mois_histo++;
            }
            new logger().OCategory.info("int_TOTAL_JOURS_VENTE apres " + int_TOTAL_JOURS_VENTE
                    + " qteVenteArticle apres " + qteVenteArticle + " mois_histo " + mois_histo + " result " + result);
            qteVenteJour = qteVenteArticle / int_TOTAL_JOURS_VENTE;
            int_SEUIL_MIN_CALCULE = qteVenteJour * result; // determination du seuil de reappro
            new logger().OCategory.info("int_SEUIL_MIN_CALCULE " + int_SEUIL_MIN_CALCULE);
            // determination de la quantité de reapprovisionnement
            if (OTCodeGestion.getBoolOPTIMISATIONSEUILCMDE()) {
                int_SEUIL_MIN_CALCULE = qteVenteJour
                        * OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDELAIREAPPROVISIONNEMENT();
                if (int_SEUIL_MIN_CALCULE > OTFamilleStock.getIntNUMBERAVAILABLE()) {
                    qteReappro = qteVenteJour * result;
                    qteReappro = (int_SEUIL_MIN_CALCULE - OTFamilleStock.getIntNUMBERAVAILABLE()) + qteReappro;
                    new logger().OCategory.info("qteReappro transformé " + qteReappro + " Quantité de réappro "
                            + OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDELAIREAPPROVISIONNEMENT()
                            + " Grossiste " + OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getStrDESCRIPTION());
                    qteReappro = Math.ceil(qteReappro
                            + ((OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntCOEFSECURITY() * qteReappro)
                                    / 100));
                }

            } else {
                new logger().OCategory.info("OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() "
                        + OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() + " OTFamilleStock.getIntNUMBERAVAILABLE() "
                        + OTFamilleStock.getIntNUMBERAVAILABLE());
                if (OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() > OTFamilleStock.getIntNUMBERAVAILABLE()) {
                    qteReappro = Math.ceil(
                            (OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() - OTFamilleStock.getIntNUMBERAVAILABLE())
                                    + int_SEUIL_MIN_CALCULE);
                }

            }

            // fin determination de la quantité de reapprovisionnement
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Dans la fin getQuantityReapportByCodeGestionArticle qteReappro " + qteReappro);
        return qteReappro.intValue();
    }

    // fin calcul de la quantité de réappro à suggérer basé sur le code gestion d'un article
    // mise a jour de l'indice de securite d un article
    public boolean updateIndiceSecurity(int int_IDS, TFamille OTFamille) {
        boolean result = false;
        try {
            this.refresh(OTFamille);
            new logger().OCategory.info("Nom famille " + OTFamille.getLgFAMILLEID());
            OTFamille.setIntIDS(int_IDS);
            // OTFamille.setDtUPDATED(new Date());
            this.persiste(OTFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean updateIndiceSecurity(int int_IDS) {
        boolean result = false;
        int i = 0;
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            lstTFamille = this.getListArticle("", "%%");
            for (TFamille OTFamille : lstTFamille) {
                if (this.updateIndiceSecurity(int_IDS, OTFamille)) {
                    i++;
                }
            }
            // new logger().OCategory.info("Valeur i "+ i + " lstTFamille size "+lstTFamille.size());
            if (i == lstTFamille.size()) {
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise a jour de l'indice de sécurité");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("result "+ result + " message "+this.getDetailmessage());
        return result;
    }

    // recupere famille article
    public TFamillearticle getTFamillearticle(String lg_FAMILLEARTICLE_ID) {
        TFamillearticle OTFamillearticle = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamillearticle t WHERE (t.lgFAMILLEARTICLEID LIKE ?1 OR t.strLIBELLE LIKE ?1 OR t.strCODEFAMILLE LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, commonparameter.statut_enable);
            if (qry.getResultList().size() > 0) {
                OTFamillearticle = (TFamillearticle) qry.getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamillearticle;
    }

    // fin recupere famille article
    // recupere emplacement
    public TZoneGeographique getTZoneGeographique(String lg_ZONE_GEO_ID) {
        TZoneGeographique OTZoneGeographique = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TZoneGeographique t WHERE (t.lgZONEGEOID LIKE ?1 OR t.strLIBELLEE LIKE ?1 OR t.strCODE LIKE ?1) AND t.strSTATUT = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3")
                    .setParameter(1, lg_ZONE_GEO_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (qry.getResultList().size() > 0) {
                OTZoneGeographique = (TZoneGeographique) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTZoneGeographique;
    }

    public TZoneGeographique getTZoneGeographique(String lg_ZONE_GEO_ID, String lg_EMPLACEMENT_ID) {
        TZoneGeographique OTZoneGeographique = null;
        try {

            OTZoneGeographique = (TZoneGeographique) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TZoneGeographique t WHERE (t.lgZONEGEOID LIKE ?1 OR t.strLIBELLEE LIKE ?1 OR t.strCODE LIKE ?1) AND t.strSTATUT = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3")
                    .setParameter("1", lg_ZONE_GEO_ID).setParameter("2", commonparameter.statut_enable)
                    .setParameter(3, lg_EMPLACEMENT_ID).getSingleResult();
            // new logger().OCategory.info("Emplacement trouvé " + OTZoneGeographique.getStrLIBELLEE());
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Emplacement inexistant");
        }
        return OTZoneGeographique;
    }

    // fin recupere emplacement
    // recupere fabriquant
    public TFabriquant getFabriquant(String lg_FABRIQUANT_ID) {
        TFabriquant OTFabriquant = null;
        try {

            OTFabriquant = (TFabriquant) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFabriquant t WHERE (t.lgFABRIQUANTID LIKE ?1 OR t.strNAME LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_FABRIQUANT_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Fabriquant inexistant");
        }
        return OTFabriquant;
    }

    // fin recupere fabriquant
    // liste des type stock articles
    public List<TTypeStockFamille> showAllOrOneArticleTypeStock(String search_value, String lg_FAMILLE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID, String lg_GROSSISTE_ID) {

        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();
        String lg_TYPE_STOCK_ID = "1";

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase("1")) {
                lg_TYPE_STOCK_ID = "3";
            }
            lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?1 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3 AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?7 OR t.lgFAMILLEID.intEAN13 LIKE ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?11 AND t.lgTYPESTOCKID.lgTYPESTOCKID = ?12 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?13 AND t.lgFAMILLEID.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?14 ORDER BY t.lgFAMILLEID.strDESCRIPTION DESC")
                    .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, lg_GROSSISTE_ID)
                    .setParameter(3, lg_ZONE_GEO_ID).setParameter(6, search_value + "%")
                    .setParameter(7, search_value + "%")
                    .setParameter(11, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(12, lg_TYPE_STOCK_ID).setParameter(13, lg_FAMILLE_ID)
                    .setParameter(14, lg_FABRIQUANT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTTypeStockFamille.size());
        return lstTTypeStockFamille;
    }
    // fin liste des type stock articles

    private int getNumberToDecondition(int a, int b) {
        int mod = 0, result = 0;
        mod = a % b;
        if (mod != 0) {
            mod = 1;
        }
        result = (a / b) + mod;
        new logger().OCategory.info("result " + result);
        return result;
    }

    // reinitialisation du stock des articles
    public void reinitializeStockByFamille() {
        List<TFamille> lst = new ArrayList<>();
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        try {
            lst = this.showAllInitial("", "%%");
            for (TFamille OTFamille : lst) {
                TFamilleStock OTFamilleStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID());
                if (OTFamilleStock != null) {
                    OStockManager.createTypeStockFamille(OTFamille.getLgFAMILLEID(), "1",
                            OTFamilleStock.getIntNUMBERAVAILABLE(), this.getOTUser().getLgEMPLACEMENTID());
                }
            }
        } catch (Exception e) {
        }

    }

    // fin reinitialisation du stock des articles
    // calcul du denier caractere du code cip
    public String generateCIP(String int_CIP) {
        String result = "";
        int resultCIP = 0;

        char[] charArray = int_CIP.toCharArray();

        if (int_CIP.length() == 6) {
            for (int i = 1; i <= charArray.length; i++) {
                resultCIP += Integer.parseInt(charArray[(i - 1)] + "") * (i + 1);
            }

            int mod = resultCIP % 11;
            result = int_CIP + "" + mod;
        } else {
            result = int_CIP;
        }

        return result;
    }
    // fin calcul du denier caractere du code cip

    // verification du prix de vente par rapport au pourcentage
    public boolean checkpricevente(TFamille OTFamille, int int_PRICE) {
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

    public TFamille getTFamille(String lg_FAMILLE_ID, String str_STATUT) {
        TFamille OTFamille = null;
        try {
            // new logger().OCategory.info("lg_FAMILLE_ID dans getTFamille " + lg_FAMILLE_ID);
            // TParameters OTParameters = new
            // TparameterManager(this.getOdataManager()).getParameter(commonparameter.PARAMETER_INDICE_SECURITY);
            OTFamille = (TFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE (t.lgFAMILLEID LIKE ?1 OR t.intCIP LIKE ?1 OR t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 OR t.intEAN13 LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter("1", lg_FAMILLE_ID).setParameter("2", str_STATUT).setMaxResults(1).getSingleResult();
            // new logger().OCategory.info("Valeur " + OTParameters.getStrVALUE() + " description
            // "+OTParameters.getStrDESCRIPTION());
            // new logger().OCategory.info("Famille " + OTFamille.getStrDESCRIPTION() + " CIP " + OTFamille.getIntCIP()
            // + " IDS " + OTFamille.getIntIDS());
            /*
             * if(OTFamille.getIntIDS() != Integer.parseInt(OTParameters.getStrVALUE())) {
             * this.updateIndiceSecurity(Integer.parseInt(OTParameters.getStrVALUE()), OTFamille); }
             */
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Article inexistant");
        }
        return OTFamille;
    }

    public void enable(String lg_FAMILLE_ID, String str_STATUT) {

        try {
            TFamille OTFamille = this.getTFamille(lg_FAMILLE_ID, str_STATUT);

            OTFamille.setStrSTATUT(commonparameter.statut_enable);
            this.merge(OTFamille);
            // String Description = "Activation du produit " + OTFamille.getStrDESCRIPTION() + " par l'utilisateur " +
            // this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME();
            // this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
            // commonparameter.statut_enable, "TFamille", "Donnee de ref", "");
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            String desc = "Activation de l'article  " + OTFamille.getIntCIP() + " " + OTFamille.getStrNAME() + " par "
                    + this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME();
            // this.do_event_log(this.getOdataManager(), commonparameter.ALL, "Supression de l'article " +
            // OTFamille.getStrDESCRIPTION(), this.getOTUser().getStrLOGIN(), commonparameter.statut_enable, "TFamille",
            // "Donnee de ref", "Desactivation de produit", this.getOTUser().getLgUSERID());
            this.getOdataManager().getEm().persist(new TEventLog().build(this.getOTUser(), OTFamille.getIntCIP(), desc,
                    TypeLog.ACTIVATION_DE_PRODUIT, Otable));

            // this.sendSMS(Description, "TFamille", "Fiche article", "N_UPDATE_FAMILLE_PRICE", "Activation de
            // produit");
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'activer l'article");
        }

    }

    // verification de l'existance d'un code CIP
    public boolean isCIPExist(String int_CIP) {
        boolean result = false;
        try {
            TFamilleGrossiste OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamilleGrossiste t WHERE t.strCODEARTICLE = ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, int_CIP).setParameter(2, commonparameter.statut_enable).setMaxResults(1)
                    .getSingleResult();
            if (OTFamilleGrossiste != null) {
                if (OTFamilleGrossiste.getLgGROSSISTEID()
                        .equals(OTFamilleGrossiste.getLgFAMILLEID().getLgGROSSISTEID())) {
                    result = true;
                    this.buildErrorTraceMessage(
                            "Impossible d'utiliser ce code. Code CIP du grossiste principal de l'article "
                                    + OTFamilleGrossiste.getLgFAMILLEID().getStrDESCRIPTION());
                }
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return result;
    }
    // fin verification de l'existance d'un code CIP

    public List<TFamille> getListArticleInit(String search_value, String lg_FAMILLE_ID, int start, int limit) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_article_recherche  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' OR str_CODE_ARTICLE LIKE '" + search_value + "%'  )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' AND bool_DECONDITIONNE = 0 AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC LIMIT " + start + "," + limit;

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));

                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE")); // remplacé par
                // l'emplaceement
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            new logger().OCategory.fatal(ex.getMessage());
        }

        new logger().OCategory.info("lstTFamille taille " + lstTFamille.size());
        return lstTFamille;
    }

    public List<TFamille> getListArticleDecondition(String search_value, String lg_DCI_ID, short boolDECONDITIONNE,
            int start, int limit) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            if (lg_DCI_ID.equalsIgnoreCase("")) {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.strSTATUT = ?5 AND t.boolDECONDITIONNE LIKE ?6 AND t.boolDECONDITIONNEEXIST LIKE ?7 GROUP BY t.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(3, search_value + "%")
                        .setParameter(4, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, boolDECONDITIONNE).setParameter(7, 1).setFirstResult(start)
                        .setMaxResults(limit).getResultList();
            } else {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TFamilleGrossiste fg, TFamilleDci fd WHERE fd.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?3 OR t.intCIP LIKE ?4 OR t.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.strSTATUT = ?5 AND t.boolDECONDITIONNE LIKE ?6 AND t.boolDECONDITIONNEEXIST LIKE ?7 AND fd.lgDCIID.lgDCIID LIKE ?8 GROUP BY t.lgFAMILLEID ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(3, search_value + "%")
                        .setParameter(4, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, boolDECONDITIONNE).setParameter(7, 1).setParameter(8, lg_DCI_ID)
                        .setFirstResult(start).setMaxResults(limit).getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("lstTFamille taille " + lstTFamille.size());
        return lstTFamille;
    }

    public List<TFamille> getListArticleDCIByJdbcInit(String search_value, String lg_FAMILLE_ID, int start, int limit) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT int_NUMBER_AVAILABLE,int_NUMBER ,lg_FAMILLE_ID,str_NAME,int_PRICE,str_DESCRIPTION,int_CIP,int_CIP2,int_EAN13  FROM v_article_recherche_dci  WHERE lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '"
                    + search_value + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' OR str_CODE LIKE '" + search_value + "%' OR str_NAME_DCI LIKE '" + search_value
                    + "%' ) AND bool_DECONDITIONNE = 0 AND str_STATUT = '" + commonparameter.statut_enable
                    + "' AND lg_EMPLACEMENT_ID = '" + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC LIMIT " + start + "," + limit;

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));

                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE")); // remplacé par
                // l'emplaceement
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return lstTFamille;
    }

    public List<TFamille> getListArticleDCIByJdbc(String search_value, String lg_FAMILLE_ID, int start, int limit) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_article_recherche_dci  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' OR str_CODE LIKE '" + search_value + "%' OR str_NAME_DCI LIKE '" + search_value
                    + "%' )  AND str_STATUT = '" + commonparameter.statut_enable + "' AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC LIMIT " + start + "," + limit;

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setBlPROMOTED(Ojconnexion.get_resultat().getBoolean("bl_PROMOTED"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE"));

                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        return lstTFamille;
    }

    public List<TFamille> getListArticleInit(String search_value, String lg_FAMILLE_ID) {
        List<TFamille> lstTFamille = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_article_recherche  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' OR str_CODE_ARTICLE LIKE '" + search_value + "%'  )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' AND bool_DECONDITIONNE = 0 AND lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION ASC";

            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TFamille OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_NAME"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));

                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setIntCIP2(Ojconnexion.get_resultat().getString("int_CIP2"));
                OTFamille.setIntEAN13(Ojconnexion.get_resultat().getString("int_EAN13"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setIntPRICE(Ojconnexion.get_resultat().getInt("int_PRICE"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("str_LIBELLEE")); // remplacé par
                // l'emplaceement

                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
            new logger().OCategory.fatal(ex.getMessage());
        }

        new logger().OCategory.info("lstTFamille taille " + lstTFamille.size());
        return lstTFamille;
    }

    public TFamilleGrossiste getTFamilleGrossiste(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {

            OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.strSTATUT LIKE ?3 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?4")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(3, commonparameter.statut_enable)
                    .setParameter(4, lg_GROSSISTE_ID).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamilleGrossiste;
    }

    public TFamille getTFamilleDeconditionByParent(String lg_FAMILLE_PARENT_ID) {
        TFamille OTFamille = null;

        try {

            OTFamille = (TFamille) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamille t WHERE t.lgFAMILLEPARENTID = ?1 AND t.strSTATUT = ?3")
                    .setParameter(1, lg_FAMILLE_PARENT_ID).setParameter(3, commonparameter.statut_enable)
                    .getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamille;
    }

    // mise a jour du stock dispo par rapport au reel chaque jour
    public void updateStockFamille() {
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        StockManager OStockManager = new StockManager(this.getOdataManager());
        TParameters OTParameters = OTparameterManager.getParameter(Parameter.KEY_DAY);
        // a mettre le parametre de desactivation de la cloture automatique de la caisse
        if (OTParameters != null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
            // automatique. False = fermeture automatique desactivée
            // dayy
            String systemeday = date.formatterShort.format(new Date());// compare la date d'aujourd hui à celle dans la
            // bd

            if (!systemeday.equals(OTParameters.getStrVALUE())) {
                OStockManager.updateFamilleStockBySocketServer(OTParameters);
            }
        }
    }

    // fin mise a jour du stock dispo par rapport au reel chaque jour
    // update seuil mini et max d'une famille
    public void updateSeuil() {
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = OTparameterManager.getParameter(Parameter.KEY_DAY_SEUIL_REAPPRO);
        Date jour = new Date();
        String dateJ = date.getoDay(jour);

        int JourDuMois = Integer.parseInt(dateJ);
        new logger().OCategory.info("dateJ " + dateJ + " JourDuMois " + JourDuMois);

        if (OTParameters != null) {

            if ((JourDuMois == 1)
                    && (!date.DateToString(jour, date.formatterShort).equals(OTParameters.getStrVALUE()))) {
                new logger().OCategory.info("hello---");
                familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
                List<TFamille> lstTFamille = new ArrayList<>();
                lstTFamille = OfamilleManagement.showAllOrOneArticle("", "%%");
                for (TFamille OTFamille : lstTFamille) {
                    OfamilleManagement.defineSeuilReaprovisionnement(OTFamille);
                }
                OTParameters.setStrVALUE(date.DateToString(jour, date.formatterShort));
                this.persiste(OTParameters);
            }
        } else {
            this.buildErrorTraceMessage("Impossible de mettre à jour les seuils de réapprovisionnement");
        }

    }
    // fin update seuil mini et max d'une famille

    // creation en masse d'article
    public boolean createMasseFamille(List<String> lstData, String str_TYPE_TRANSACTION) {
        boolean result = false;
        dciManagement OdciManagement = new dciManagement(this.getOdataManager());

        try {

            if (str_TYPE_TRANSACTION.equalsIgnoreCase(commonparameter.TYPE_IMPORTATION_BASCULEMENT)) {
                result = this.createMasseFamilleBasculement(lstData);
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(commonparameter.TYPE_IMPORTATION_INSTALLATION)) {
                result = this.createMasseFamilleInstallation(lstData);
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(commonparameter.TYPE_IMPORTFAMILLEDCI)) {
                result = OdciManagement.createFamilleDciFromImportation(lstData);
                this.buildSuccesTraceMessage(OdciManagement.getDetailmessage());
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(commonparameter.TYPE_IMPORTATION_UPDATEDATAWITHSTOCK)) {
                result = this.MergeMasseFamilleBasculement(lstData, true);
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(commonparameter.TYPE_IMPORTATION_UPDATEDATAWITHOUTSTOCK)) {
                result = this.MergeMasseFamilleBasculement(lstData, false);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean createMasseFamilleInstallation(List<String> lstData) {
        boolean result = false;
        int count = 0;

        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes
                if (this.create(tabString[1].trim(), tabString[1].trim(), Integer.parseInt(tabString[2].trim()),
                        Integer.parseInt(tabString[2].trim()), 0, Integer.parseInt(tabString[3].trim()),
                        Integer.parseInt(tabString[3].trim()), 0, tabString[7].trim(),
                        (tabString[0].trim().length() == 13 ? tabString[0].trim().substring(6, 12)
                                : tabString[0].trim()),
                        (tabString[0].trim().length() == 13 ? tabString[0].trim() : ""), Parameter.DEFAUL_GROSSISTE,
                        Parameter.DEFAUL_FAMILLEARTICE, "", "", "", "", Parameter.DEFAUL_EMPLACEMENT,
                        Integer.parseInt(tabString[5].trim()), 0, "", "", Short.parseShort("0"),
                        Parameter.DEFAUL_TYPEETIQUETTE, "", (tabString[6].trim().equalsIgnoreCase("0") ? "1" : "2"),
                        false, 0, "", (Integer.parseInt(tabString[5].trim()) / 2),
                        (Integer.parseInt(tabString[5].trim()) / 2), Integer.parseInt(tabString[5].trim()),
                        "") != null) {
                    count++;
                }
            }

            if (count > 0) {
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildSuccesTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Echec d'importation. Aucune ligne n'a été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean createMasseFamilleBasculement(List<String> lstData) {
        boolean result = false;
        int count = 0;

        try {

            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes
                if (this.create(tabString[1].trim(), tabString[1].trim(), Integer.parseInt(tabString[2].trim()),
                        Integer.parseInt(tabString[2].trim()), 0, Integer.parseInt(tabString[4].trim()),
                        Integer.parseInt(tabString[5].trim()), 0, "", tabString[0].trim(), tabString[12].trim(),
                        tabString[7].trim(), tabString[8].trim(), "", "", tabString[6].trim(), "", tabString[9].trim(),
                        0, 0, "", "", Short.parseShort("0"), Parameter.DEFAUL_TYPEETIQUETTE, "",
                        (Integer.parseInt(tabString[10].trim()) == 0 ? "1" : "2"), false, 0, "",
                        Integer.parseInt(tabString[13].trim()), Integer.parseInt(tabString[14].trim()),
                        Integer.parseInt(tabString[11].trim()), "") != null) {
                    count++;
                }
            }

            if (count > 0) {
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Echec d'importation. Aucune ligne n'a été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean MergeMasseFamilleBasculement(List<String> lstData, boolean updateStock) {
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        boolean result = false;
        int count = 0;
        TFamille OTFamille = null, OTFamilleInit = null;
        TFamilleStock OTFamilleStock = null;
        TTypeStockFamille OTTypeStockFamille = null;
        short bool_DECONDITIONNE = 0;
        try {

            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes
                OTFamille = this.getTFamille(tabString[1].trim());
                if (OTFamille != null) {
                    if (this.update(OTFamille.getLgFAMILLEID(), tabString[2].trim(), "", "", "", tabString[2].trim(),
                            Integer.parseInt(tabString[3].trim()), Integer.parseInt(tabString[4].trim()), 0,
                            Integer.parseInt(tabString[5].trim()), Integer.parseInt(tabString[6].trim()),
                            OTFamille.getIntS(), tabString[16].trim(), tabString[1].trim(), tabString[12].trim(),
                            tabString[13].trim(), tabString[14].trim(), tabString[8].trim(),
                            (OTFamille.getLgCODEGESTIONID() != null
                                    ? OTFamille.getLgCODEGESTIONID().getLgCODEGESTIONID() : ""),
                            tabString[10].trim(), OTFamille.getStrCODETAUXREMBOURSEMENT(), tabString[15].trim(),
                            OTFamille.getIntNUMBERDETAIL(), 0, tabString[9].trim(), "", tabString[17].trim(),
                            OTFamille.getBoolRESERVE(), OTFamille.getIntSEUILRESERVE(),
                            OTFamille.getIntSTOCKREAPROVISONEMENT(), OTFamille.getIntQTEREAPPROVISIONNEMENT(), "", "",
                            "", null)) {
                        count++;
                        if (updateStock) {
                            OTFamilleStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID());
                            OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock("1",
                                    OTFamille.getLgFAMILLEID());
                            if (OTFamilleStock != null && OTTypeStockFamille != null) {
                                OTFamilleStock.setIntNUMBERAVAILABLE(Integer.valueOf(tabString[19].trim()));
                                OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                                OTFamilleStock.setDtUPDATED(new Date());
                                OTTypeStockFamille.setIntNUMBER(Integer.valueOf(tabString[19].trim()));
                                OTTypeStockFamille.setDtUPDATED(new Date());
                                this.persiste(OTTypeStockFamille);
                            }
                        }

                    }
                } else {
                    if (!tabString[7].trim().equalsIgnoreCase("")) {
                        OTFamilleInit = this
                                .getTFamille(tabString[1].trim().substring(0, tabString[1].trim().length() - 1));
                        if (OTFamilleInit != null) {
                            bool_DECONDITIONNE = 1;
                            OTFamille = this.create(tabString[2].trim(), tabString[2].trim(),
                                    Integer.parseInt(tabString[3].trim()), Integer.parseInt(tabString[4].trim()), 0,
                                    Integer.parseInt(tabString[5].trim()), Integer.parseInt(tabString[6].trim()), 0,
                                    tabString[16].trim(), tabString[1].trim(), tabString[12].trim(),
                                    tabString[13].trim(), tabString[14].trim(), tabString[8].trim(), "",
                                    tabString[10].trim(), "", tabString[15].trim(), 0, 1, "", "", bool_DECONDITIONNE,
                                    tabString[9].trim(), "", tabString[17].trim(), false, 0,
                                    OTFamilleInit.getLgFAMILLEID(), OTFamilleInit.getIntSTOCKREAPROVISONEMENT(),
                                    OTFamilleInit.getIntQTEREAPPROVISIONNEMENT(), 0, "");
                            if (OTFamille != null) {
                                OTFamilleInit.setIntNUMBERDETAIL(OTFamilleInit.getIntNUMBERDETAIL() == 0 ? 1
                                        : OTFamilleInit.getIntNUMBERDETAIL());
                                OTFamilleInit.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE);
                                OTFamille.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE);
                                this.persiste(OTFamille);
                            }
                        }
                    } else {
                        OTFamille = this.create(tabString[2].trim(), tabString[2].trim(),
                                Integer.parseInt(tabString[3].trim()), Integer.parseInt(tabString[4].trim()), 0,
                                Integer.parseInt(tabString[5].trim()), Integer.parseInt(tabString[6].trim()), 0,
                                tabString[16].trim(), tabString[1].trim(), tabString[12].trim(), tabString[13].trim(),
                                tabString[14].trim(), tabString[8].trim(), "", tabString[10].trim(), "",
                                tabString[15].trim(), 0, 1, "", "", bool_DECONDITIONNE, tabString[9].trim(), "",
                                tabString[17].trim(), false, 0, "", 0, 0, Integer.parseInt(tabString[19].trim()), "");
                    }
                    if (OTFamille != null) {
                        count++;
                    }

                }

            }

            if (count > 0) {
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Echec d'importation. Aucune ligne n'a été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean MergeMasseFamilleBasculement(List<String> lstData) {
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        boolean result = false;
        int count = 0;
        TFamille OTFamille = null, OTFamilleInit = null;
        TFamilleStock OTFamilleStock = null;
        TTypeStockFamille OTTypeStockFamille = null;
        short bool_DECONDITIONNE = 0;
        try {

            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes
                OTFamille = this.getTFamille(tabString[0].trim());
                if (OTFamille != null) {
                    if (this.update(OTFamille.getLgFAMILLEID(), tabString[1].trim(), "", "", "", tabString[1].trim(),
                            Integer.parseInt(tabString[2].trim()), Integer.parseInt(tabString[2].trim()), 0,
                            Integer.parseInt(tabString[4].trim()), Integer.parseInt(tabString[5].trim()),
                            OTFamille.getIntS(), OTFamille.getIntT(), tabString[0].trim(), tabString[12].trim(),
                            tabString[7].trim(), tabString[8].trim(), "",
                            (OTFamille.getLgCODEGESTIONID() != null
                                    ? OTFamille.getLgCODEGESTIONID().getLgCODEGESTIONID() : ""),
                            tabString[6].trim(), OTFamille.getStrCODETAUXREMBOURSEMENT(), tabString[9].trim(), 0, 0,
                            (OTFamille.getLgTYPEETIQUETTEID() != null
                                    ? OTFamille.getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID()
                                    : Parameter.DEFAUL_TYPEETIQUETTE),
                            "", (OTFamille.getLgCODETVAID() != null ? OTFamille.getLgCODETVAID().getLgCODETVAID() : ""),
                            OTFamille.getBoolRESERVE(), OTFamille.getIntSEUILRESERVE(),
                            OTFamille.getIntSTOCKREAPROVISONEMENT(), OTFamille.getIntQTEREAPPROVISIONNEMENT(), "", "",
                            "", null)) {

                        OTFamilleStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID());
                        OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock("1",
                                OTFamille.getLgFAMILLEID());
                        if (OTFamilleStock != null && OTTypeStockFamille != null) {
                            OTFamilleStock.setIntNUMBERAVAILABLE(Integer.valueOf(tabString[11].trim()));
                            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                            OTFamilleStock.setDtUPDATED(new Date());
                            OTTypeStockFamille.setIntNUMBER(Integer.valueOf(tabString[11].trim()));
                            OTTypeStockFamille.setDtUPDATED(new Date());
                            if (this.persiste(OTTypeStockFamille)) {
                                count++;
                            }
                        }
                    }
                }

            }

            if (count > 0) {
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Echec d'importation. Aucune ligne n'a été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean updateMasseFamille(List<String> lstData) {
        boolean result = false;
        int count = 0;
        TFamille OTFamille = null;
        String value = "";
        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes

                if (Integer.parseInt(tabString[0].trim()) > 0) {
                    value = StringUtils.generateString(tabString[0].trim(), "", (6 - tabString[0].trim().length()));
                }
                OTFamille = this.getTFamilleForUpdate(value);
                if (OTFamille != null) {
                    if (this.updateSomeInfoFamille(OTFamille,
                            (tabString[0].trim().length() == 13 ? tabString[0].trim().substring(6, 12)
                                    : tabString[0].trim()),
                            tabString[1].trim(), Integer.parseInt(tabString[6].trim()),
                            Integer.parseInt(tabString[6].trim()), Integer.parseInt(tabString[7].trim()),
                            Integer.parseInt(tabString[7].trim()),
                            (tabString[0].trim().length() == 13 ? tabString[0].trim() : ""), tabString[8].trim(),
                            tabString[5].trim())) {
                        count++;
                    }
                }

            }

            if (count > 0) {
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Echec d'importation. Aucune ligne n'a été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean updateSomeInfoFamille(TFamille OTFamille, String int_CIP, String str_DESCRIPTION, int int_PRICE,
            int int_PRICE_TIPS, int int_PAF, int int_PAT, String int_EAN13, String lg_CODE_TVA_ID, String int_T) {
        boolean result = false;
        int int_TAUX = 0;
        TParameters OParameters = null;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        try {
            if (!int_CIP.equalsIgnoreCase("")) {
                int_CIP = ((int_CIP.length() < 7) ? StringUtils.generateString(int_CIP, "0", (7 - int_CIP.length()))
                        : int_CIP);

            }
            if (int_CIP.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return false;
            }
            int_CIP = this.generateCIP(int_CIP);
            OTFamille.setIntCIP(int_CIP);
            OParameters = OTparameterManager.getParameter(Parameter.KEY_TAUX_CODE_TABLEAU);
            if (OParameters != null) {
                int_TAUX = Integer.parseInt(OParameters.getStrVALUE());
            }
            OTFamille.setStrDESCRIPTION(str_DESCRIPTION);
            // OTFamille.setIntPRICE((!int_T.equalsIgnoreCase("") ? int_PRICE + int_TAUX : int_PRICE));

            if (!int_T.equalsIgnoreCase("")) {
                if (OTFamille.getIntT().equalsIgnoreCase("") && OTFamille.getBoolDECONDITIONNE() == 0) {
                    OTFamille.setIntPRICE(int_PRICE + int_TAUX);
                }

            } else {
                if (!OTFamille.getIntT().equalsIgnoreCase("") && OTFamille.getBoolDECONDITIONNE() == 0) {
                    OTFamille.setIntPRICE(int_PRICE - int_TAUX);
                }
            }
            OTFamille.setIntT(int_T);
            OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setIntEAN13(int_EAN13);
            TCodeTva OTCodeTva = null;
            try {
                OTCodeTva = this.getCodeTva(lg_CODE_TVA_ID);
                if (OTCodeTva == null) {
                    OTCodeTva = this.getCodeTva(Parameter.DEFAUL_CODE_TVA);
                }
                OTFamille.setLgCODETVAID(OTCodeTva);

            } catch (Exception e) {
                // e.printStackTrace();
            }

            if (this.persiste(OTFamille)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Impossible de mise à jour de l'article " + OTFamille.getStrDESCRIPTION());
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mise à jour");
        }
        return result;
    }

    public TFamille getTFamilleForUpdate(String search_value) {
        TFamille OTFamille = null;
        try {
            OTFamille = (TFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE (t.lgFAMILLEID LIKE ?1 OR t.intCIP LIKE ?1 OR t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 OR t.intEAN13 LIKE ?1) AND t.strSTATUT = ?2 AND t.boolDECONDITIONNE = ?3")
                    .setParameter(1, search_value + "%").setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, 0).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Article inexistant");
        }
        return OTFamille;
    }

    // fin creation en masse d'article
    // generation de l'entete des données
    public String generateEnteteForFile() {
        return "IDENTIFIANT;CIP;DESIGNATION;PRIX VENTE;PRIX REFERENCE;PRIX ACHAT FACTURE;PRIX ACHAT TARIF;CH;CODE ACTE;TYPE ETIQUETTE;CODE REMISE;OPTIMISATION;CODE EAN13;GROSSISTE;FAMILLE;EMPLACEMENT;CODE TABLEAU;TVA;INDICE DE SECURITE;STOCK";
    }

    public String generateEnteteForFileZoneGeographie() {
        return "IDENTIFIANT;CODE;LIBELLE";
    }
    // fin generation de l'entete des données

    // generation des données à exporter
    public List<String> generateDataToExport(String liste_param) {
        List<String> lst = new ArrayList<>();
        List<TTypeStockFamille> lsTFamilles = new ArrayList<>();
        String row = "";
        TFamille OTFamilleCH = null;
        TFamilleStock OTFamilleStock = null;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        String search_value = "", lg_FAMILLE_ID = "%%", lg_DCI_ID = "", str_TYPE_TRANSACTION = "ALL";
        short boolDECONDITIONNE = 0;
        String lg_TYPE_STOCK_ID = "";
        try {
            lg_TYPE_STOCK_ID = ((this.getOTUser() != null && this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                    .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) ? commonparameter.TYPE_STOCK_RAYON
                            : commonparameter.TYPE_STOCK_DEPOT);
            // code ajouté
            String[] tabString = liste_param.split(";"); // on case la ligne courante pour recuperer les differentes
            // colonnes
            String[] search_valueTab = tabString[0].split(":"), str_TYPE_TRANSACTION_Tab = tabString[1].split(":"),
                    lg_DCI_IDTab = tabString[2].split(":");

            search_value = (search_valueTab.length > 1 ? search_valueTab[1] : "");
            lg_DCI_ID = (lg_DCI_IDTab.length > 1 ? lg_DCI_IDTab[1] : "");
            str_TYPE_TRANSACTION = (str_TYPE_TRANSACTION_Tab.length > 1 ? str_TYPE_TRANSACTION_Tab[1] : "ALL");
            new logger().OCategory.info("debut:" + search_value + "taille:" + search_valueTab.length + ":fin");
            if (str_TYPE_TRANSACTION.equalsIgnoreCase("ALL")) {

                lsTFamilles = this.getListArticleBis(search_value, lg_FAMILLE_ID, lg_DCI_ID, lg_TYPE_STOCK_ID);
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase("DECONDITIONNE")) {
                boolDECONDITIONNE = 1;
                lsTFamilles = this.getListArticleDecondition(search_value, lg_DCI_ID, boolDECONDITIONNE,
                        lg_TYPE_STOCK_ID);
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase("DECONDITION")) {
                boolDECONDITIONNE = 0;
                lsTFamilles = this.getListArticleDecondition(search_value, lg_DCI_ID, boolDECONDITIONNE,
                        lg_TYPE_STOCK_ID);
            }
            // fin code ajouté

            // lsTFamilles = this.getListArticleBis("", "%%", ""); // ancien bon code. a decommenter en cas de probleme
            for (TTypeStockFamille OTTypeStockFamille : lsTFamilles) {
                // "IDENTIFIANT;CIP;DESIGNATION;PRIX VENTE;PRIX REFERENCE;PRIX ACHAT FACTURE;PRIX ACHAT TARIF;CH;CODE
                // ACTE;TYPE ETIQUETTE;CODE REMISE;CODE GESTION;CODE EAN13;GROSSISTE;FAMILLE;EMPLACEMENT;CODE
                // TABLEAU;TVA;INDICE DE SECURITE";
                OTFamilleStock = OtellerManagement
                        .getTProductItemStock(OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID());

                row += OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEID() + ";"
                        + OTTypeStockFamille.getLgFAMILLEID().getIntCIP() + ";";
                row += OTTypeStockFamille.getLgFAMILLEID().getStrDESCRIPTION() + ";"
                        + OTTypeStockFamille.getLgFAMILLEID().getIntPRICE() + ";"
                        + (OTTypeStockFamille.getLgFAMILLEID().getIntPRICETIPS() != null
                                ? OTTypeStockFamille.getLgFAMILLEID().getIntPRICETIPS() : 0)
                        + ";" + OTTypeStockFamille.getLgFAMILLEID().getIntPAF() + ";"
                        + OTTypeStockFamille.getLgFAMILLEID().getIntPAT() + ";";
                if (OTTypeStockFamille.getLgFAMILLEID().getBoolDECONDITIONNE() == 1 && (OTFamilleCH = this
                        .getTFamille(OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEPARENTID())) != null) {
                    row += OTFamilleCH.getStrDESCRIPTION() + ";";
                } else {
                    row += " ;";
                }
                row += (OTTypeStockFamille.getLgFAMILLEID().getLgCODEACTEID() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getLgCODEACTEID().getStrLIBELLEE() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getLgTYPEETIQUETTEID() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getLgTYPEETIQUETTEID().getStrDESCRIPTION() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getStrCODEREMISE() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getStrCODEREMISE() : " ") + ";";
                row += ((OTTypeStockFamille.getLgFAMILLEID().getLgCODEGESTIONID() != null && OTTypeStockFamille
                        .getLgFAMILLEID().getLgCODEGESTIONID().getLgOPTIMISATIONQUANTITEID() != null)
                                ? OTTypeStockFamille.getLgFAMILLEID().getLgCODEGESTIONID().getLgOPTIMISATIONQUANTITEID()
                                        .getStrLIBELLEOPTIMISATION()
                                : " ")
                        + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getIntEAN13() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getIntEAN13() : "0") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getLgGROSSISTEID() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getLgGROSSISTEID().getStrLIBELLE() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEARTICLEID() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getLgZONEGEOID() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getIntT() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getIntT() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getLgCODETVAID() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getLgCODETVAID().getStrNAME() : " ") + ";";
                row += (OTTypeStockFamille.getLgFAMILLEID().getIntIDS() != null
                        ? OTTypeStockFamille.getLgFAMILLEID().getIntIDS() : " ") + ";";
                row += (OTFamilleStock != null ? OTFamilleStock.getIntNUMBERAVAILABLE() : 0) + ";";

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

    // fin generation des données à exporter
    // creation de zone geographique (rayon) par importation
    public boolean createTZoneGeographiqueBis(String str_CODE, String str_LIBELLEE, TEmplacement OTEmplacement) {
        boolean result = false;
        try {
            if (isExist(str_CODE, "")) {
                this.buildErrorTraceMessage("Le Code existe déjà");

            } else {
                TZoneGeographique OTZoneGeographique = new TZoneGeographique();
                OTZoneGeographique.setLgZONEGEOID(this.getKey().getComplexId());
                OTZoneGeographique.setStrCODE(str_CODE);
                OTZoneGeographique.setStrLIBELLEE(str_LIBELLEE);
                OTZoneGeographique.setStrSTATUT(commonparameter.statut_enable);
                OTZoneGeographique.setDtCREATED(new Date());
                OTZoneGeographique.setBoolACCOUNT(true);
                OTZoneGeographique.setLgEMPLACEMENTID(OTEmplacement);
                if (this.persiste(OTZoneGeographique)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage("Impossible de créer l'emplacement");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de créer l'emplacement");
        }
        return result;
    }

    public boolean createTZoneGeographique(String str_CODE, String str_LIBELLEE, TEmplacement OTEmplacement) {
        boolean result = false;
        TZoneGeographique OTZoneGeographique = null;
        try {
            OTZoneGeographique = this.getTZoneGeographique(str_CODE);
            if (OTZoneGeographique != null) {
                result = this.updateTZoneGeographique(OTZoneGeographique.getLgZONEGEOID(), str_CODE, str_LIBELLEE);
            } else {
                result = this.createTZoneGeographiqueBis(str_CODE, str_LIBELLEE, OTEmplacement);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin creation de zone geographique (rayon) par importation

    // verifier si le rayon existe déjà
    /*
     * public TZoneGeographique getTZoneGeographiqueByCode(String str_CODE) { TZoneGeographique OTZoneGeographique =
     * null; try {
     *
     * OTZoneGeographique = (TZoneGeographique) this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TZoneGeographique t WHERE t.strCODE LIKE ?1 AND t.strSTATUT = ?2"). setParameter("1",
     * str_CODE).setParameter("2", commonparameter.statut_enable). getSingleResult();
     *
     * } catch (Exception e) { e.printStackTrace(); this.buildErrorTraceMessage("Emplacement inexistant"); } return
     * OTZoneGeographique; }
     */
    // fin verifier si le rayon existe déjà
    // mise a jour d'un rayon
    public boolean updateZoneGeographique(String lg_ZONE_GEO_ID, boolean bool_ACCOUNT) {
        boolean result = false;
        try {

            TZoneGeographique OTZoneGeographique = this.getOdataManager().getEm().find(TZoneGeographique.class,
                    lg_ZONE_GEO_ID);

            OTZoneGeographique.setDtUPDATED(new Date());
            OTZoneGeographique.setBoolACCOUNT(bool_ACCOUNT);
            if (this.merge(OTZoneGeographique)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Impossible de mettre à jour l'emplacement");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre à jour l'emplacement");
        }
        return result;
    }

    public boolean updateTZoneGeographique(String lg_ZONE_GEO_ID, String str_CODE, String str_LIBELLEE) {
        boolean result = false;
        try {
            if (isExist(str_CODE, lg_ZONE_GEO_ID)) {
                this.buildErrorTraceMessage("Le Code existe déjà");

            } else {
                TZoneGeographique OTZoneGeographique = this.getOdataManager().getEm().find(TZoneGeographique.class,
                        lg_ZONE_GEO_ID);
                OTZoneGeographique.setStrCODE(str_CODE);
                OTZoneGeographique.setStrLIBELLEE(str_LIBELLEE);
                OTZoneGeographique.setDtUPDATED(new Date());
                if (this.persiste(OTZoneGeographique)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage("Impossible de mettre à jour l'emplacement");
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de mettre à jour l'emplacement");
        }
        return result;
    }

    private boolean isExist(String code, String lg_ZONE_GEO_ID) {
        boolean isExist = false;
        List<TZoneGeographique> geographiques;
        try {
            geographiques = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TZoneGeographique o WHERE o.strCODE =?1 AND o.lgZONEGEOID <>?2 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3 AND o.strSTATUT = ?4")
                    .setParameter(1, code).setParameter(2, lg_ZONE_GEO_ID)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(4, commonparameter.statut_enable).getResultList();
            if (!geographiques.isEmpty()) {
                isExist = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isExist;
    }

    // fin mise a jour d'un rayon
    // suppression d'un rayon
    public boolean deleteTZoneGeographique(String lg_ZONE_GEO_ID) {
        boolean result = false;
        try {
            TZoneGeographique OTZoneGeographique = this.getOdataManager().getEm().find(TZoneGeographique.class,
                    lg_ZONE_GEO_ID);
            if (this.delete(OTZoneGeographique)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Impossible de supprimer l'emplacement");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de supprimer l'emplacement");
        }
        return result;
    }

    // fin suppression d'un rayon
    // creation en masse de rayon
    public boolean createMasseTZoneGeographique(List<String> lstData) {
        boolean result = false;
        int count = 0;

        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("lstString.get(i)  " + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes

                if (this.createTZoneGeographique(tabString[0].trim(), tabString[1].trim(),
                        this.getOTUser().getLgEMPLACEMENTID())) {
                    count++;
                }
            }
            if (count == lstData.size()) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage(count + "/" + lstData.size() + " emplacement(s) pris en compte");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin creation en masse de rayon

    // liste des rayons
    public List<TZoneGeographique> getListeTZoneGeographiques(String search_value, String lg_ZONE_GEO_ID) {
        List<TZoneGeographique> lstTZoneGeographique = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            lstTZoneGeographique = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TZoneGeographique t WHERE t.lgZONEGEOID LIKE ?1 AND (t.strLIBELLEE LIKE ?2 OR t.strCODE LIKE ?2) AND t.strSTATUT LIKE ?3 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 ORDER BY t.strLIBELLEE")
                    .setParameter(1, lg_ZONE_GEO_ID).setParameter(2, search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).setParameter(4, lg_EMPLACEMENT_ID)
                    // .setParameter(4, Parameter.DEFAUL_ZONE_GEOGRAPHIQUE)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTZoneGeographique;
    }

    // fin liste des rayons
    // generation des données à exporter
    public List<String> generateDataToExportZoneGeographique() {
        List<String> lst = new ArrayList<>();
        List<TZoneGeographique> lsTZoneGeographique = new ArrayList<>();
        String row = "";

        try {
            lsTZoneGeographique = this.getListeTZoneGeographiques("", "%%");
            for (TZoneGeographique OTZoneGeographique : lsTZoneGeographique) {

                row += OTZoneGeographique.getLgZONEGEOID() + ";" + OTZoneGeographique.getStrCODE() + ";";
                row += (OTZoneGeographique.getStrLIBELLEE() != null ? OTZoneGeographique.getStrLIBELLEE() : " ") + ";";
                new logger().OCategory.info(row);
                row = row.substring(0, row.length() - 1);
                lst.add(row);
                row = "";
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Taille de la nouvelle liste " + lst.size());
        return lst;
    }

    // fin generation des données à exporter
    // recupere le recupere le code gestion
    public TCodeGestion getTCodeGestion(String lg_CODE_GESTION_ID) {
        TCodeGestion OTCodeGestion = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TCodeGestion t WHERE (t.lgCODEGESTIONID = ?1 OR t.strCODEBAREME = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_CODE_GESTION_ID).setParameter(2, commonparameter.statut_enable);
            if (qry.getResultList().size() > 0) {
                OTCodeGestion = (TCodeGestion) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTCodeGestion;
    }
    // fin recupere le recupere le code gestion

    public TTypeStockFamille createTypeStockFamille(TFamille OTFamille, String lg_TYPE_STOCK_ID, int int_NUMBER,
            TEmplacement OTEmplacement) {
        TTypeStockFamille OTTypeStockFamille = null;
        try {
            OTTypeStockFamille = new TTypeStockFamille();
            TTypeStock OTTypeStock = this.getOdataManager().getEm().find(TTypeStock.class, lg_TYPE_STOCK_ID);
            OTTypeStockFamille.setLgTYPESTOCKFAMILLEID(this.getKey().getComplexId());
            OTTypeStockFamille.setLgFAMILLEID(OTFamille);
            OTTypeStockFamille.setLgTYPESTOCKID(OTTypeStock);
            OTTypeStockFamille.setStrNAME(OTFamille.getStrDESCRIPTION() + " " + OTTypeStock.getStrDESCRIPTION());
            OTTypeStockFamille.setStrDESCRIPTION(OTTypeStockFamille.getStrNAME());
            OTTypeStockFamille.setIntNUMBER(int_NUMBER);
            OTTypeStockFamille.setDtCREATED(new Date());
            OTTypeStockFamille.setLgEMPLACEMENTID(OTEmplacement);
            OTTypeStockFamille.setStrSTATUT(commonparameter.statut_pending);
            this.getOdataManager().getEm().persist(OTTypeStockFamille);
            // result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de creation de type stock");
        }
        new logger().OCategory.info("result " + this.getDetailmessage());
        return OTTypeStockFamille;
    }

    public TFamilleStock createOrUpdateStockFamilleForDepot(TFamille OTFamille, int int_QUANTITY_STOCK,
            TEmplacement OTEmplacement) {
        System.out.println(" createOrUpdateStockFamilleForDepot ---------------------------   " + OTFamille);
        TFamilleStock OTFamilleStock = null, OTFamilleStockDecondition;
        TFamille OFamilleDecondition;
        // StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        String lg_TYPE_STOCK_ID = Parameter.STOCK_DEPOT;
        TZoneGeographique OTZoneGeographique;
        try {

            OTZoneGeographique = this.getTZoneGeographique(Parameter.DEFAUL_EMPLACEMENT,
                    OTEmplacement.getLgEMPLACEMENTID());
            OTFamilleStock = this.createStock(OTFamille, int_QUANTITY_STOCK, OTEmplacement);
            if (OTFamilleStock != null
                    && /*
                        * && createTypeStockFamille(OTFamille, lg_TYPE_STOCK_ID, int_QUANTITY_STOCK, OTEmplacement) !=
                        * null &&
                        */ this.createFamilleZoneGeog(OTFamille, OTZoneGeographique, OTEmplacement)) { // creation dans
                // type stock
                // famille

                // si le produit à un detail
                if (OTFamille.getBoolDECONDITIONNEEXIST() == 1 && OTFamille.getBoolDECONDITIONNE() == 0) {
                    OFamilleDecondition = this.getTFamilleDeconditionByParent(OTFamille.getLgFAMILLEID());
                    OTFamilleStockDecondition = this.createStock(OFamilleDecondition, 0, OTEmplacement);
                    if (/* createTypeStockFamille(OFamilleDecondition, lg_TYPE_STOCK_ID, 0, OTEmplacement) != null && */OTFamilleStockDecondition != null) {
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    } else {
                        this.buildErrorTraceMessage(
                                "Echec de création du produit dans " + OTEmplacement.getStrDESCRIPTION());
                    }
                } else {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }
                // fin si le produit à un detail
            }
            // }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamilleStock;
    }
    // fin create de produit depot

    // affichage de la liste de produit en fonction du stock
    public List<TFamilleStock> getListArticleCompareStock_(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID,
            String str_TYPE_TRANSACTION, int int_NUMBER, int start, int limit) {
        List<TFamilleStock> lstTFamilleStock = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) { lg_EMPLACEMENT_ID =
             * "%%"; } else { lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(); }
             */
            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            if ("".equals(lg_DCI_ID)) {
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE > ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();
                }
            } else {
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                            .setMaxResults(limit).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                            .setMaxResults(limit).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                            .setMaxResults(limit).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE < ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                            .setMaxResults(limit).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE > ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                            .setMaxResults(limit).getResultList();
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamilleStock taille " + lstTFamilleStock.size());
        return lstTFamilleStock;
    }

    // fonction d article desactive
    public TFamille getDisableTFamile(String lg_FAMILLE_ID) {
        TFamille OTFamille = null;
        try {

            OTFamille = (TFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t WHERE (t.lgFAMILLEID LIKE ?1 OR t.intCIP LIKE ?1 OR t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 OR t.intEAN13 LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter("1", lg_FAMILLE_ID).setParameter("2", commonparameter.statut_disable)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Article inexistant");
        }
        return OTFamille;
    }

    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID) {
        TFamilleStock OTProductItemStock = null;

        try {
            TFamille OTProductItem = this.getTFamille(lg_FAMILLE_ID);
            if (OTProductItem != null) {
                new logger().OCategory
                        .info("Id " + OTProductItem.getLgFAMILLEID() + " Famille " + OTProductItem.getStrDESCRIPTION());
                new logger().OCategory
                        .info("emplacement:" + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());

                OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                        .setParameter("1", OTProductItem.getLgFAMILLEID())
                        .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();
                new logger().OCategory.info("Stock actuel  ---------------------------------------- "
                        + OTProductItemStock.getIntNUMBERAVAILABLE());
            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return OTProductItemStock;
    }

    public List<String> checkImport(List<String> lstData) {
        List<String> lst = new ArrayList<>();
        TFamille OTFamille;
        try {
            for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i:" + i + " ///ligne--------" + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                // differentes colonnes
                OTFamille = this.getTFamille(tabString[1].trim());
                if (OTFamille == null) {
                    new logger().OCategory.info("Ligne inexistante " + i);
                    lst.add(lstData.get(i));
                }
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de vérification du fichier. Aucune ligne n'a été pris en compte");
        }
        return lst;
    }

    public TFamilleStock getTProductItemStock(TFamille OTProductItem) {
        TFamilleStock OTProductItemStock = null;

        try {

            if (OTProductItem != null) {

                OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                        .setParameter("1", OTProductItem.getLgFAMILLEID())
                        .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return OTProductItemStock;
    }

    // valeur stock prix d'achat et vente
    public EntityData valeurStockAchatVente() {
        EntityData OEntityData = null;

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT SUM(fs.int_NUMBER_AVAILABLE * t.int_PRICE) AS TOTAL_PRIX_VENTE, SUM(fs.int_NUMBER_AVAILABLE * t.int_PAF) AS TOTAL_PRIX_ACHAT FROM t_famille t, t_famille_stock fs WHERE t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND t.str_STATUT = '"
                    + commonparameter.statut_enable + "'";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("TOTAL_PRIX_VENTE"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("TOTAL_PRIX_ACHAT"));
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return OEntityData;
    }

    // fin valeur stock prix d'achat et vente
    // liste des articles en fonction d'interval de fournisseur,ou emplacement ou famille article
    public List<TFamille> showAllOrOneArticleInterval(String search_value, String lg_FAMILLE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID, String lg_FABRIQUANT_ID, String str_BEGIN,
            String str_END, String str_TYPE) {
        List<TFamille> lstTFamille = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            new logger().OCategory.info("search_value " + search_value + "-lg_FAMILLE_ID++" + lg_FAMILLE_ID
                    + "-str_BEGIN++" + str_BEGIN + "-str_END++" + str_END + "-str_TYPE++" + str_TYPE + "-");

            if (str_TYPE.equalsIgnoreCase("famille")) {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND (SUBSTRING(t.lgFAMILLEARTICLEID.strLIBELLE, 1, 1) >= ?9 AND SUBSTRING(t.lgFAMILLEARTICLEID.strLIBELLE, 1, 1) <= ?10)")
                        .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                        .setParameter(3, lg_FAMILLE_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, lg_ZONE_GEO_ID).setParameter(6, lg_FABRIQUANT_ID)
                        .setParameter(7, commonparameter.statut_enable)
                        .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                        .setParameter(9, str_BEGIN).setParameter(10, str_END).getResultList();

            } else if (str_TYPE.equalsIgnoreCase("emplacement")) {
                // SUBSTRING(t.lgZONEGEOID.strLIBELLEE, 1, 1) Permet de recuperer la premier lettre de la chaine
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND (SUBSTRING(t.lgZONEGEOID.strLIBELLEE, 1, 1) >= ?9 AND SUBSTRING(t.lgZONEGEOID.strLIBELLEE, 1, 1) <= ?10)")
                        .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                        .setParameter(3, lg_FAMILLE_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, lg_ZONE_GEO_ID).setParameter(6, lg_FABRIQUANT_ID)
                        .setParameter(7, commonparameter.statut_enable)
                        .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                        .setParameter(9, str_BEGIN).setParameter(10, str_END).getResultList();

            } else if (str_TYPE.equalsIgnoreCase("fabriquant")) {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND (SUBSTRING(t.lgFABRIQUANTID.strNAME, 1, 1) >= ?9 AND SUBSTRING(t.lgFABRIQUANTID.strNAME, 1, 1) <= ?10)")
                        .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                        .setParameter(3, lg_FAMILLE_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, lg_ZONE_GEO_ID).setParameter(6, lg_FABRIQUANT_ID)
                        .setParameter(7, commonparameter.statut_enable)
                        .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                        .setParameter(9, str_BEGIN).setParameter(10, str_END).getResultList();
            } else {
                lstTFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFamille t, TTypeStockFamille tt WHERE tt.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID AND (t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?2) AND t.lgFAMILLEID LIKE ?3 AND t.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4 AND t.lgZONEGEOID.lgZONEGEOID LIKE ?5 AND t.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?6 AND t.strSTATUT = ?7 AND tt.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8")
                        .setParameter(1, "%" + search_value + "%").setParameter(2, "%" + search_value + "%")
                        .setParameter(3, lg_FAMILLE_ID).setParameter(4, lg_FAMILLEARTICLE_ID)
                        .setParameter(5, lg_ZONE_GEO_ID).setParameter(6, lg_FABRIQUANT_ID)
                        .setParameter(7, commonparameter.statut_enable)
                        .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }
    // fin liste des articles en fonction d'interval de fournisseur,ou emplacement ou famille article

    // liste des articles en fonction d'interval de fournisseur,ou emplacement ou famille article
    public List<TFamille> showAllOrOneArticleInterval(String lg_FAMILLE_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID, String lg_GROSSISTE_ID, String str_BEGIN, String str_END, String str_TYPE) {
        List<TFamille> lstTFamille = new ArrayList<>();
        TFamille OTFamille = null;
        String table = "", other = "", lg_TYPE_STOCK_ID = "1";

        try {

            new logger().OCategory.info("lg_FAMILLE_ID++" + lg_FAMILLE_ID + "-str_BEGIN++" + str_BEGIN + "-str_END++"
                    + str_END + "-str_TYPE++" + str_TYPE + "-");

            if (str_TYPE.equalsIgnoreCase("famille")) {
                table = ", t_famillearticle a";
                other = " AND a.lg_FAMILLEARTICLE_ID = t.lg_FAMILLEARTICLE_ID ";
                if (!str_BEGIN.equalsIgnoreCase("")) {
                    other += "AND a.str_CODE_FAMILLE >= '" + str_BEGIN + "' ";
                }
                if (!str_END.equalsIgnoreCase("")) {
                    other += "AND a.str_CODE_FAMILLE <= '" + str_END + "' ";
                }
            } else if (str_TYPE.equalsIgnoreCase("grossiste")) {
                table = ", t_grossiste a";
                other = " AND a.lg_GROSSISTE_ID = t.lg_GROSSISTE_ID ";
                if (!str_BEGIN.equalsIgnoreCase("")) {
                    other += "AND a.str_CODE >= '" + str_BEGIN + "' ";
                }
                if (!str_END.equalsIgnoreCase("")) {
                    other += "AND a.str_CODE <= '" + str_END + "' ";
                }
            } else if (str_TYPE.equalsIgnoreCase("emplacement")) {
                table = ", t_zone_geographique a";
                other = " AND a.lg_ZONE_GEO_ID = t.lg_ZONE_GEO_ID ";
                if (!str_BEGIN.equalsIgnoreCase("")) {
                    other += "AND a.str_CODE >= '" + str_BEGIN + "' ";
                }
                if (!str_END.equalsIgnoreCase("")) {
                    other += "AND a.str_CODE <= '" + str_END + "' ";
                }

            }

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT t.lg_FAMILLE_ID FROM t_famille t, t_type_stock_famille fs " + table
                    + " WHERE t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID AND t.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND t.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID + "' AND t.lg_ZONE_GEO_ID LIKE '"
                    + lg_ZONE_GEO_ID + "' AND t.lg_GROSSISTE_ID LIKE '" + lg_GROSSISTE_ID + "' AND t.str_STATUT = '"
                    + commonparameter.statut_enable + "' AND fs.lg_EMPLACEMENT_ID LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "' AND fs.lg_TYPE_STOCK_ID = '"
                    + lg_TYPE_STOCK_ID + "'" + other + " ORDER BY t.str_DESCRIPTION ASC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamille size " + lstTFamille.size());
        return lstTFamille;
    }
    // fin liste des articles en fonction d'interval de fournisseur,ou emplacement ou famille article

    // liste des grossistes d'un inventaire
    public List<TZoneGeographique> getListZoneEmplacementFromInventaire(String search_value, String lg_INVENTAIRE_ID) {
        List<TZoneGeographique> lstTZoneGeographique = new ArrayList<>();
        TZoneGeographique OTZoneGeographique = null;
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT DISTINCT(t.lg_ZONE_GEO_ID), t.str_LIBELLEE, t.str_CODE FROM t_zone_geographique t, t_inventaire_famille i, t_famille f WHERE f.lg_ZONE_GEO_ID = t.lg_ZONE_GEO_ID AND f.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND (t.str_LIBELLEE LIKE '"
                    + search_value + "%' OR t.str_CODE LIKE '" + search_value + "%') AND i.lg_INVENTAIRE_ID = '"
                    + lg_INVENTAIRE_ID + "' ORDER BY t.str_LIBELLEE";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OTZoneGeographique = new TZoneGeographique();
                OTZoneGeographique.setLgZONEGEOID(Ojconnexion.get_resultat().getString("lg_ZONE_GEO_ID"));
                OTZoneGeographique.setStrLIBELLEE(Ojconnexion.get_resultat().getString("str_LIBELLEE"));
                OTZoneGeographique.setStrCODE(Ojconnexion.get_resultat().getString("str_CODE"));

                lstTZoneGeographique.add(OTZoneGeographique);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTZoneGeographique taille " + lstTZoneGeographique.size());
        return lstTZoneGeographique;
    }

    // fin liste des grossistes d'un inventaire
    public List<TAlertEventUserFone> getTAlertEventUserFone(String str_Event) {
        List<TAlertEventUserFone> lst = new ArrayList<>();
        try {
            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAlertEventUserFone t WHERE t.strEvent.strEvent LIKE ?1 AND t.strSTATUT = ?2")
                    .setParameter(1, str_Event).setParameter(2, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;
    }

    public EntityData valeurStockAchatVente(String lg_FAMILLE_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID,
            String lg_GROSSISTE_ID, String str_BEGIN, String str_END, String str_TYPE, String lg_TYPE_STOCK_ID) {
        EntityData OEntityData = null;
        String table = "", other = "";

        if (str_TYPE.equalsIgnoreCase("famille")) {
            table = ", t_famillearticle a";
            other = " AND a.lg_FAMILLEARTICLE_ID = t.lg_FAMILLEARTICLE_ID ";
            if (!str_BEGIN.equalsIgnoreCase("")) {
                other += "AND a.str_CODE_FAMILLE >= '" + str_BEGIN + "' ";
            }
            if (!str_END.equalsIgnoreCase("")) {
                other += "AND a.str_CODE_FAMILLE <= '" + str_END + "' ";
            }
        } else if (str_TYPE.equalsIgnoreCase("grossiste")) {
            table = ", t_grossiste a";
            other = " AND a.lg_GROSSISTE_ID = t.lg_GROSSISTE_ID ";
            if (!str_BEGIN.equalsIgnoreCase("")) {
                other += "AND a.str_CODE >= '" + str_BEGIN + "' ";
            }
            if (!str_END.equalsIgnoreCase("")) {
                other += "AND a.str_CODE <= '" + str_END + "' ";
            }
        } else if (str_TYPE.equalsIgnoreCase("emplacement")) {
            table = ", t_zone_geographique a";
            other = " AND a.lg_ZONE_GEO_ID = t.lg_ZONE_GEO_ID ";
            if (!str_BEGIN.equalsIgnoreCase("")) {
                other += "AND a.str_CODE >= '" + str_BEGIN + "' ";
            }
            if (!str_END.equalsIgnoreCase("")) {
                other += "AND a.str_CODE <= '" + str_END + "' ";
            }

        }

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT SUM(fs.int_NUMBER_AVAILABLE * t.int_PRICE) AS TOTAL_PRIX_VENTE, SUM(fs.int_NUMBER_AVAILABLE * t.int_PAF) AS TOTAL_PRIX_ACHAT FROM t_famille t, t_famille_stock fs "
                    + table + " WHERE t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID AND t.lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID
                    + "' AND t.lg_FAMILLEARTICLE_ID LIKE '" + lg_FAMILLEARTICLE_ID + "' AND t.lg_ZONE_GEO_ID LIKE '"
                    + lg_ZONE_GEO_ID + "' AND t.lg_GROSSISTE_ID LIKE '" + lg_GROSSISTE_ID + "' AND t.str_STATUT = '"
                    + commonparameter.statut_enable + "' AND fs.lg_EMPLACEMENT_ID LIKE '"
                    + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID() + "'" + other
                    + " ORDER BY t.str_DESCRIPTION ASC";
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("TOTAL_PRIX_VENTE"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("TOTAL_PRIX_ACHAT"));
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return OEntityData;
    }

    public List<EntityData> getValorisationTVAData(String Search_value) {
        List<EntityData> listtva = new ArrayList<>();
        String query = "SELECT\n" + "     SUM(fs.int_NUMBER_AVAILABLE*t.int_PRICE) AS TOTAL_PRIX_VENTE,\n"
                + "     SUM(fs.int_NUMBER_AVAILABLE*t.int_PAF) AS TOTAL_PRIX_ACHAT_FACTURE,\n"
                + "     SUM(fs.int_NUMBER_AVAILABLE*t.`int_PAT`) AS TOTAL_PRIX_ACHAT_TARIF,\n" + "     tv.`str_NAME`,\n"
                + "     tv.`int_VALUE`,\n" + "     t.`dbl_PRIX_MOYEN_PONDERE` AS PMPONDERE\n" + "FROM\n"
                + "     `t_famille` t INNER JOIN `t_famille_stock` fs ON t.`lg_FAMILLE_ID` = fs.`lg_FAMILLE_ID`\n"
                + "     INNER JOIN `t_zone_geographique` z ON t.`lg_ZONE_GEO_ID` = z.`lg_ZONE_GEO_ID`\n"
                + "     INNER JOIN `t_code_tva` tv ON t.`lg_CODE_TVA_ID` = tv.`lg_CODE_TVA_ID`\n" + "WHERE\n"
                + "(t.lg_FAMILLEARTICLE_ID LIKE ?1 \n" + " OR t.lg_ZONE_GEO_ID LIKE ?1 \n"
                + " OR t.lg_GROSSISTE_ID LIKE ?1 )\n" + " AND t.str_STATUT = 'enable'\n" + "\n" + "GROUP BY\n"
                + "     tv.`str_NAME`,\n" + "     tv.`int_VALUE`\n" + "ORDER BY\n" + "     tv.`int_VALUE` ASC";
        System.out.println(query);
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).setParameter(1, Search_value)
                    .getResultList();
            for (Object[] object : list) {
                System.out.println("bb  " + object[0] + "  " + object[1] + " " + object[2] + "" + object[5]);
                EntityData entityData = new EntityData();
                entityData.setStr_value1(object[0] + "");
                entityData.setStr_value2(object[1] + "");
                entityData.setStr_value3(object[2] + "");
                entityData.setStr_value4(object[5] + "");
                entityData.setStr_value5(object[3] + " :" + object[4]);
                listtva.add(entityData);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return listtva;
    }

    private boolean updateFamilleGrossiste(TFamilleGrossiste OTFamilleGrossiste, TGrossiste OGrossiste) {
        boolean isUpdated = false;
        try {
            OTFamilleGrossiste.setLgGROSSISTEID(OGrossiste);
            if (this.merge(OTFamilleGrossiste)) {
                isUpdated = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return isUpdated;
    }

    private boolean updateFamilleCIP(TFamilleGrossiste OTFamilleGrossiste, TGrossiste OGrossiste, TFamille OFamille,
            String int_CIP) {
        boolean isUpdated = false;
        try {
            if (OTFamilleGrossiste != null) {
                OTFamilleGrossiste.setLgGROSSISTEID(OGrossiste);
                OTFamilleGrossiste.setStrCODEARTICLE(int_CIP);
                if (this.merge(OTFamilleGrossiste)) {
                    isUpdated = true;
                }
            } else {

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isUpdated;
    }

    public boolean update(String lg_FAMILLE_ID, String str_NAME, String int_CIP2, String int_CIP3, String int_CIP4,
            String str_DESCRIPTION, int int_PRICE, int int_PRICE_TIPS, int int_TAUX_MARQUE, int int_PAF, int int_PAT,
            int int_S, String int_T, String int_CIP, String int_EAN13, String lg_GROSSISTE_ID,
            String lg_FAMILLEARTICLE_ID, String lg_CODE_ACTE_ID, String lg_CODE_GESTION_ID, String str_CODE_REMISE,
            String str_CODE_TAUX_REMBOURSEMENT, String lg_ZONE_GEO_ID, int int_QTEDETAIL, int int_PRICE_DETAIL,
            String lg_TYPEETIQUETTE_ID, String lg_REMISE_ID, String lg_CODE_TVA_ID, boolean bool_RESERVE,
            int int_SEUIL_RESERVE, int int_STOCK_REAPROVISONEMENT, int int_QTE_REAPPROVISIONNEMENT, String dt_Peremtion,
            String gammeId, String laboratoireId, Integer cmuPrice) {
        String lg_TYPE_STOCK_RESERVE_ID = "2";
        int int_PRICE_OLD = 0, int_PAT_OLD = 0, int_PAF_OLD = 0, int_TAUX = 0;

        boolean result = false;

        TParameters OParameters = null;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());

        try {
            if (int_CIP.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return false;
            }
            int_CIP = this.generateCIP(int_CIP);

            TFamille OTFamille = this.getTFamille(lg_FAMILLE_ID);
            OParameters = OTparameterManager.getParameter(Parameter.KEY_TAUX_CODE_TABLEAU);
            if (OParameters != null) {
                int_TAUX = Integer.parseInt(OParameters.getStrVALUE());
            }
            TGrossiste OTGrossiste = new grossisteManagement(this.getOdataManager()).getGrossiste(lg_GROSSISTE_ID);
            if (OTFamille == null) {
                this.buildErrorTraceMessage("Impossible de mettre à jour cet article. Référence invalide");
                return false;
            }

            if (OTGrossiste != null) {
                OTFamille.setLgGROSSISTEID(OTGrossiste);
            }
            String curentcip = OTFamille.getIntCIP();
            if (!int_CIP.equals(curentcip)) {

                if (this.isCIPExist(int_CIP)) {
                    return false;
                } else {
                    if (!updateFamilleGrossisteCip(int_CIP, OTFamille, OTGrossiste, 1, curentcip)) {
                        return false;
                    }
                }
            }

            if (OTFamille.getBoolDECONDITIONNE() == 0) {
                updateFamilleGrossisteCip(int_CIP, OTFamille, OTGrossiste, 0, curentcip);
            }

            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();

            TCodeActe OTCodeActe = this.getOdataManager().getEm().find(TCodeActe.class, lg_CODE_ACTE_ID);

            if (OTCodeActe != null) {
                OTFamille.setLgCODEACTEID(OTCodeActe);
            }
            TCodeGestion OTCodeGestion = this.getOdataManager().getEm().find(TCodeGestion.class, lg_CODE_GESTION_ID);
            if (OTCodeGestion != null) {
                OTFamille.setLgCODEGESTIONID(OTCodeGestion);
            }
            try {
                TTypeetiquette OTTypeetiquette = (TTypeetiquette) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TTypeetiquette t WHERE t.lgTYPEETIQUETTEID LIKE ?1 OR t.strDESCRIPTION LIKE ?2")
                        .setParameter(1, lg_TYPEETIQUETTE_ID).setParameter(2, lg_TYPEETIQUETTE_ID).getSingleResult();
                new logger().OCategory.info("Type etiquette " + OTTypeetiquette.getStrDESCRIPTION());
                OTFamille.setLgTYPEETIQUETTEID(OTTypeetiquette);
            } catch (Exception e) {
            }

            try {
                TRemise OTRemise = (TRemise) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TRemise t WHERE t.strSTATUT LIKE ?1 AND( t.lgREMISEID LIKE ?2 OR t.strNAME LIKE ?2)")
                        .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_REMISE_ID).getSingleResult();
                new logger().OCategory.info("remise " + OTRemise.getStrNAME());
                OTFamille.setLgREMISEID(OTRemise);
            } catch (Exception e) {
            }

            TFamillearticle OTFamillearticle = this.getTFamillearticle(lg_FAMILLEARTICLE_ID);

            if (OTFamillearticle != null) {
                OTFamille.setLgFAMILLEARTICLEID(OTFamillearticle);
            }

            TZoneGeographique OTZoneGeographique = this.getTZoneGeographique(lg_ZONE_GEO_ID);
            if (OTZoneGeographique != null) {
                if (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                        .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                    OTFamille.setLgZONEGEOID(OTZoneGeographique);
                }
                this.createFamilleZoneGeo(OTFamille, OTZoneGeographique, this.getOTUser().getLgEMPLACEMENTID());

            }

            try {
                TCodeTva OTCodeTva = this.getCodeTva(lg_CODE_TVA_ID);
                OTFamille.setLgCODETVAID(OTCodeTva);
            } catch (Exception e) {
            }
            OTFamille.setIntCIP2(int_CIP2);
            OTFamille.setIntCIP3(int_CIP3);
            OTFamille.setIntCIP4(int_CIP4);
            OTFamille.setIntEAN13(int_EAN13);
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setCmuPrice(cmuPrice);
            if (!"".equals(dt_Peremtion)) {
                OTFamille.setDtPEREMPTION(java.sql.Date.valueOf(dt_Peremtion));
            }
            if (!int_T.equalsIgnoreCase("")) {
                if (OTFamille.getIntT().equalsIgnoreCase("")) {
                    if (OTFamille.getBoolDECONDITIONNE() == 0) {
                        OTFamille.setIntPRICE(int_PRICE + int_TAUX);
                    }
                } else {
                    if (int_PRICE != int_PRICE_OLD) {
                        OTFamille.setIntPRICE(int_PRICE);
                    }
                }

            } else {
                if (!OTFamille.getIntT().equalsIgnoreCase("") && OTFamille.getBoolDECONDITIONNE() == 0) {
                    OTFamille.setIntPRICE(int_PRICE - int_TAUX);
                } else {
                    OTFamille.setIntPRICE(int_PRICE);
                    new logger().OCategory.info("prix avant:" + int_PRICE + ":fin:" + OTFamille.getIntPRICE());
                }
            }
            OTFamille.setIntS(int_S);
            OTFamille.setIntT(int_T);
            OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
            OTFamille.setIntTAUXMARQUE(int_TAUX_MARQUE);
            OTFamille.setStrCODEREMISE(str_CODE_REMISE);
            OTFamille.setStrCODETAUXREMBOURSEMENT(str_CODE_TAUX_REMBOURSEMENT);
            OTFamille.setStrDESCRIPTION(str_DESCRIPTION.toUpperCase());
            OTFamille.setStrNAME(str_NAME.toUpperCase());
            OTFamille.setIntNUMBERDETAIL(int_QTEDETAIL);
            OTFamille.setIntSTOCKREAPROVISONEMENT(int_STOCK_REAPROVISONEMENT);
            OTFamille.setIntSEUILMIN(OTFamille.getIntSTOCKREAPROVISONEMENT());
            OTFamille.setIntQTEREAPPROVISIONNEMENT(int_QTE_REAPPROVISIONNEMENT);
            if (!bool_RESERVE) {
                if (OTFamille.getBoolRESERVE()) {
                    TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                            .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_RESERVE_ID, OTFamille.getLgFAMILLEID());
                    if (new StockManager(this.getOdataManager(), this.getOTUser()).doReassort(
                            OTTypeStockFamille.getIntNUMBER(), OTFamille.getLgFAMILLEID(), commonparameter.REASSORT)) {
                        this.delete(OTTypeStockFamille);
                        OTFamille.setIntSEUILRESERVE(0);
                    }
                }
            } else {
                if (!OTFamille.getBoolRESERVE()) {
                    TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                            .createTypeStockFamille(OTFamille.getLgFAMILLEID(), lg_TYPE_STOCK_RESERVE_ID, 0,
                                    this.getOTUser().getLgEMPLACEMENTID());
                    if (OTTypeStockFamille != null) {
                        OTFamille.setIntSEUILRESERVE(int_SEUIL_RESERVE);
                    }
                    // if (new StockManager(this.getOdataManager(), this.getOTUser()).doReassort(0,
                    // OTFamille.getLgFAMILLEID(), commonparameter.ASSORT)) {
                    // OTFamille.setIntSEUILRESERVE(int_SEUIL_RESERVE);
                    // }
                }

            }

            OTFamille.setBoolRESERVE(bool_RESERVE);
            // OTFamille.setIntPRICEDETAIL(int_PRICE_DETAIL);
            OTFamille.setStrSTATUT(commonparameter.statut_enable);
            OTFamille.setDtUPDATED(new Date());
            try {
                Laboratoire laboratoire = this.getOdataManager().getEm().find(Laboratoire.class, laboratoireId);
                System.out.println("laboratoire ----  " + laboratoire + " " + laboratoireId);
                OTFamille.setLaboratoire(laboratoire);

            } catch (Exception e) {
                e.printStackTrace();
            }
            try {
                System.out.println("gammeId ----   " + gammeId);
                GammeProduit gammeProduit = this.getOdataManager().getEm().find(GammeProduit.class, gammeId);
                OTFamille.setGamme(gammeProduit);
                System.out.println("gammeProduit ----  " + gammeProduit + " " + gammeId);
            } catch (Exception e) {
                e.printStackTrace();
            }
            this.merge(OTFamille);
            // this.persiste(OTFamilleGrossiste);
            // this.buildSuccesTraceMessage("ARTICLE MODIFIE AVEC SUCCES");
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
            /*
             * if (int_PRICE_OLD != int_PRICE_NEW) { this.sendSMS(OTFamille, int_PRICE_OLD, int_PRICE_NEW); }
             */
            if ((int_PRICE_OLD != OTFamille.getIntPRICE()) || (int_PAF_OLD != OTFamille.getIntPAF())
                    || (int_PAT_OLD != OTFamille.getIntPAT())) {
                String Description = "Modification de prix de " + OTFamille.getStrDESCRIPTION()
                        + " sur la fiche article par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".";
                if (int_PRICE_OLD != OTFamille.getIntPRICE()) {
                    Description += "Prix de vente: " + int_PRICE_OLD + " remplacé par " + OTFamille.getIntPRICE() + ".";
                    // new logger().OCategory.info("Description prix:"+Description);
                    new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPrice(OTFamille,
                            commonparameter.str_ACTION_FICHEARTICLE, OTFamille.getIntPRICE(), int_PRICE_OLD, "");
                }
                // 8008567
                if (int_PAF_OLD != OTFamille.getIntPAF()) {
                    Description += "Prix d'achat facture: " + int_PAF_OLD + " remplacé par " + OTFamille.getIntPAF()
                            + ".";
                }
                if (int_PAT_OLD != OTFamille.getIntPAT()) {
                    Description += "Prix d'achat tarif: " + int_PAT_OLD + " remplacé par " + OTFamille.getIntPAT()
                            + ".";
                }

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de l'article");
        }
        return result;

    }

    private TFamilleGrossiste getFamilleGrossisteByCIP(String CIP, TGrossiste OGrossiste) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.strCODEARTICLE =?1 AND o.strSTATUT = ?2 AND o.lgGROSSISTEID=?3")
                    .setParameter(1, CIP).setParameter(2, commonparameter.statut_enable).setParameter(3, OGrossiste)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamilleGrossiste;
    }

    public boolean updateFamilleGrossisteCip(String CIP, TFamille OFamille, TGrossiste OGrossiste, int mode,
            String currentcip) {
        boolean isUpdate = false;
        String Codecip = CIP;

        TFamilleGrossiste familleGrossiste = getFamilleGrossisteByCIP(CIP, OGrossiste);
        TFamilleGrossiste OFamilleGrossiste = getFamilleGrossisteByIDANDLGROSSISTE(OFamille.getLgFAMILLEID(),
                OGrossiste.getLgGROSSISTEID());
        TFamille OTFamilleDecontionne = null;
        TFamilleGrossiste OTFamilleGrossisteDeconditionne = null;
        familleGrossisteManagement OfamilleGrossisteManagement = new familleGrossisteManagement(this.getOdataManager());
        // Si on modifie le cip et le grossiste mode=1

        if (familleGrossiste != null) {

            if (OFamille.getBoolDECONDITIONNEEXIST() == 1) {
                OTFamilleDecontionne = this.getTFamilleDeconditionByParent(OFamille.getLgFAMILLEID());
                if (OTFamilleDecontionne != null) {
                    OTFamilleGrossisteDeconditionne = this.getTFamilleGrossiste(OTFamilleDecontionne.getLgFAMILLEID(),
                            OTFamilleDecontionne.getLgGROSSISTEID().getLgGROSSISTEID());
                }

            }
            if (mode == 1) {

                if (OFamilleGrossiste != null) {
                    if (familleGrossiste.getLgGROSSISTEID().equals(OFamilleGrossiste.getLgGROSSISTEID())) {
                        OFamilleGrossiste.setStrCODEARTICLE(Codecip);
                        OFamille.setIntCIP(Codecip);
                        this.merge(OFamille);
                        this.merge(OFamilleGrossiste);
                        if (OTFamilleDecontionne != null && OTFamilleGrossisteDeconditionne != null) {

                            OTFamilleDecontionne.setIntCIP(Codecip + "D");
                            OTFamilleGrossisteDeconditionne.setStrCODEARTICLE(Codecip + "D");
                            this.merge(OTFamilleDecontionne);
                            this.merge(OTFamilleGrossisteDeconditionne);
                        }

                        isUpdate = true;

                    } else {

                        this.buildErrorTraceMessage("Ce Code CIP est déjà utilisé par : "
                                + familleGrossiste.getLgGROSSISTEID().getStrLIBELLE());
                        isUpdate = false;
                    }
                } else {

                    this.buildErrorTraceMessage("Ce Code CIP est déjà utilisé par : "
                            + familleGrossiste.getLgGROSSISTEID().getStrLIBELLE());
                    isUpdate = false;
                }
            } else {

                OFamille.setLgGROSSISTEID(OGrossiste);
                this.merge(OFamille);
                familleGrossiste.setLgGROSSISTEID(OGrossiste);
                this.merge(familleGrossiste);
                if (OTFamilleDecontionne != null && OTFamilleGrossisteDeconditionne != null) {

                    OTFamilleDecontionne.setLgGROSSISTEID(OGrossiste);
                    OTFamilleGrossisteDeconditionne.setLgGROSSISTEID(OGrossiste);
                    OTFamilleDecontionne.setIntCIP(Codecip + "D");
                    OTFamilleGrossisteDeconditionne.setStrCODEARTICLE(Codecip + "D");
                    this.merge(OTFamilleDecontionne);
                    this.merge(OTFamilleGrossisteDeconditionne);
                }
            }

        } else {

            if (OFamilleGrossiste != null) {

                OFamilleGrossiste.setStrCODEARTICLE(Codecip);
                OFamille.setIntCIP(Codecip);
                this.merge(OFamille);
                this.merge(OFamilleGrossiste);
                if (OTFamilleDecontionne != null && OTFamilleGrossisteDeconditionne != null) {

                    OTFamilleDecontionne.setIntCIP(Codecip + "D");
                    OTFamilleGrossisteDeconditionne.setStrCODEARTICLE(Codecip + "D");
                    this.merge(OTFamilleDecontionne);
                    this.merge(OTFamilleGrossisteDeconditionne);
                }
                isUpdate = true;

            } else {
                OFamille.setIntCIP(Codecip);
                this.merge(OFamille);
                OfamilleGrossisteManagement.create(OGrossiste, OFamille, Codecip, OFamille.getIntPRICE(),
                        OFamille.getIntPAF());
                if (OTFamilleDecontionne != null && OTFamilleGrossisteDeconditionne != null) {
                    OTFamilleDecontionne.setIntCIP(Codecip + "D");
                    this.merge(OTFamilleDecontionne);
                    OfamilleGrossisteManagement.create(OGrossiste, OTFamilleDecontionne, Codecip + "D",
                            OTFamilleDecontionne.getIntPRICE(), OTFamilleDecontionne.getIntPAF());
                }
                isUpdate = true;
            }
        }
        return isUpdate;
    }

    private TFamilleGrossiste getFamilleGrossiste(String CIP) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TFamilleGrossiste o WHERE o.strCODEARTICLE =?1 AND o.strSTATUT = ?2")
                    .setParameter(1, CIP).setParameter(2, commonparameter.statut_enable).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamilleGrossiste;
    }

    private TFamilleGrossiste getFamilleGrossisteByCIP(String CIP) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TFamilleGrossiste o WHERE o.strCODEARTICLE =?1 AND o.strSTATUT = ?2")
                    .setParameter(1, CIP).setParameter(2, commonparameter.statut_enable).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamilleGrossiste;
    }

    private TFamilleGrossiste getFamilleGrossisteByIDANDLGROSSISTE(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        TFamilleGrossiste familleGrossiste = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2 ")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_GROSSISTE_ID);
            if (qry.getResultList().size() > 0) {
                familleGrossiste = (TFamilleGrossiste) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return familleGrossiste;
    }

    private TFamilleGrossiste getFamilleGrossisteByIdFamille(String lg_FAMILLE_ID) {

        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = (TFamilleGrossiste) this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.strSTATUT = ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, commonparameter.statut_enable).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTFamilleGrossiste;
    }

    // liste des produits a exporter d'un depot pour un achat dans l'officine
    public List<String> generateDataToExportFromDepot(String liste_param) {
        String criteria = "ORDER BY v.str_LIBELLE, v.str_DESCRIPTION";
        List<EntityData> listeProduct = new ArrayList<>();
        List<String> lst = new ArrayList<>();
        String row = "";
        Date dt_Date_Debut = new Date(), dt_Date_Fin = new Date();

        String search_value = "", OdateDebut = "", OdateFin = "", h_debut = "00:00", h_fin = "23:59",
                str_TYPE_TRANSACTION = Parameter.LESS, str_Date_Debut = "", str_Date_Fin = "";
        int int_NUMBER = 0;
        try {

            // code ajouté
            String[] tabString = liste_param.split(";"); // on case la ligne courante pour recuperer les differentes
            // colonnes
            String[] dt_Date_Debut_Tab = tabString[0].split(":"), dt_Date_Fin_Tab = tabString[1].split(":"),
                    h_debut_Tab = tabString[2].split(":"), h_fin_Tab = tabString[3].split(":"),
                    search_value_Tab = tabString[4].split(":"), str_TYPE_TRANSACTION_Tab = tabString[5].split(":"),
                    int_NUMBER_Tab = tabString[6].split(":");

            str_Date_Debut = (dt_Date_Debut_Tab.length > 1 ? dt_Date_Debut_Tab[1] : "");
            str_Date_Fin = (dt_Date_Fin_Tab.length > 1 ? dt_Date_Debut_Tab[1] : "");
            h_debut = (h_debut_Tab.length > 1 ? h_debut_Tab[1] : h_debut);
            h_fin = (h_fin_Tab.length > 1 ? h_fin_Tab[1] : h_fin);
            search_value = (search_value_Tab.length > 1 ? search_value_Tab[1] : "");
            str_TYPE_TRANSACTION = (str_TYPE_TRANSACTION_Tab.length > 1 ? str_TYPE_TRANSACTION_Tab[1] : "");
            int_NUMBER = (int_NUMBER_Tab.length > 1 ? Integer.parseInt(int_NUMBER_Tab[1]) : 0);
            new logger().OCategory.info("dt_Date_Debut_Tab:" + dt_Date_Debut_Tab[0] + ";" + dt_Date_Debut_Tab[1]
                    + "|dt_Date_Fin_Tab:" + dt_Date_Fin_Tab + "|h_debut_Tab:" + h_debut_Tab + "|h_fin_Tab:" + h_fin_Tab
                    + "|search_value_Tab:" + search_value_Tab + "|str_TYPE_TRANSACTION_Tab:" + str_TYPE_TRANSACTION_Tab
                    + "|int_NUMBER_Tab:" + int_NUMBER_Tab);
            new logger().OCategory.info("avant-----str_Date_Debut:" + str_Date_Debut + "|str_Date_Fin:" + str_Date_Fin
                    + "|h_debut:" + h_debut + "|h_fin:" + h_fin + "|search_value:" + search_value
                    + "|str_TYPE_TRANSACTION:" + str_TYPE_TRANSACTION + "|int_NUMBER:" + int_NUMBER);
            if (str_Date_Fin.equalsIgnoreCase("")) {
                OdateFin = date.DateToString(dt_Date_Fin, date.formatterMysqlShort2);
            } else {
                dt_Date_Fin = date.stringToDate(str_Date_Fin, date.formatterMysqlShort);
                OdateFin = date.DateToString(dt_Date_Fin, date.formatterMysqlShort2);
            }

            dt_Date_Fin = date.getDate(OdateFin, "23:59");
            OdateFin = date.DateToString(dt_Date_Fin, date.formatterMysql);

            if (str_Date_Debut.equalsIgnoreCase("") || str_Date_Debut == null) {
                OdateDebut = date.DateToString(dt_Date_Debut, date.formatterMysqlShort2);
            } else {
                dt_Date_Debut = date.stringToDate(str_Date_Debut, date.formatterMysqlShort);
                OdateDebut = date.DateToString(dt_Date_Debut, date.formatterMysqlShort2);
            }
            dt_Date_Debut = date.getDate(OdateDebut, "00:00");
            OdateDebut = date.DateToString(dt_Date_Debut, date.formatterMysql);
            new logger().OCategory.info("apres-----str_Date_Debut:" + str_Date_Debut + "|str_Date_Fin:" + str_Date_Fin
                    + "|h_debut:" + h_debut + "|h_fin:" + h_fin + "|search_value:" + search_value
                    + "|str_TYPE_TRANSACTION:" + str_TYPE_TRANSACTION + "|int_NUMBER:" + int_NUMBER);
            listeProduct = new Preenregistrement(this.getOdataManager(), this.getOTUser()).getListeArticleVenduForOrder(
                    search_value, OdateDebut, OdateFin, h_debut, h_fin, "%%", criteria, str_TYPE_TRANSACTION,
                    int_NUMBER);

            for (EntityData OEntityData : listeProduct) {
                // "IDENTIFIANT;CIP;DESIGNATION;QUANTITE;

                row += OEntityData.getStr_value1() + ";" + OEntityData.getStr_value9() + ";"
                        + OEntityData.getStr_value2() + ";" + OEntityData.getStr_value8() + ";";

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

    public String generateEnteteForFileFromDepot() {
        return "IDENTIFIANT;CIP;DESIGNATION;QUANTITE";
    }
    // fin liste des produits a exporter d'un depot pour un achat dans l'officine

    public boolean checkDeconditionneExistForDepot(TFamille OTFamille, TEmplacement OTEmplacement,
            String lg_TYPE_STOCK_ID) {
        boolean result = false;
        TFamille OFamilleDeconditionne;
        TFamilleStock OTProductItemDeconditionneStock;
        try {
            OFamilleDeconditionne = this.getTFamilleDeconditionByParent(OTFamille.getLgFAMILLEID());
            OTProductItemDeconditionneStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OFamilleDeconditionne.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            if (OTProductItemDeconditionneStock == null) {
                OTProductItemDeconditionneStock = this.createStock(OFamilleDeconditionne, 0, OTEmplacement);
                if (OTProductItemDeconditionneStock != null
                        && createTypeStockFamille(OFamilleDeconditionne, lg_TYPE_STOCK_ID, 0, OTEmplacement) != null) {
                    result = true;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    public List<TTypeStockFamille> getListArticleSansAmplacement(String search_value, String lg_FAMILLE_ID,
            String lg_DCI_ID, String lg_TYPE_STOCK_ID) {
        List<TTypeStockFamille> lstTTypeStockFamille = new ArrayList<>();

        try {
            if ("".equals(search_value)) {
                search_value = "%%";
            }
            if ("".equals(lg_DCI_ID)) {

                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT o FROM TTypeStockFamille o, TFamille t,TFamilleStock s WHERE o.lgFAMILLEID.lgFAMILLEID=t.lgFAMILLEID  AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2 OR t.intCIP LIKE ?2 OR t.intEAN13 LIKE ?2 ) AND t.strSTATUT = ?5 AND o.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?6 AND (t.lgZONEGEOID.lgZONEGEOID IS NULL OR t.lgZONEGEOID.lgZONEGEOID LIKE '1' ) ORDER BY t.strDESCRIPTION ASC")
                        .setParameter(2, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(6, lg_TYPE_STOCK_ID).getResultList();

            } else {
                lstTTypeStockFamille = this.getOdataManager().getEm().createQuery(
                        "SELECT DISTINCT o FROM TTypeStockFamille o, TFamille t,TFamilleStock s, TFamilleDci d WHERE o.lgFAMILLEID.lgFAMILLEID=t.lgFAMILLEID  AND (t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2 OR t.intCIP LIKE ?2 OR t.intEAN13 LIKE ?2 ) AND t.strSTATUT = ?5 AND o.lgTYPESTOCKID.lgTYPESTOCKID LIKE ?6  AND d.lgFAMILLEID.lgFAMILLEID=t.lgFAMILLEID  AND d.lgDCIID.lgDCIID LIKE ?7 AND (t.lgZONEGEOID.lgZONEGEOID IS NULL OR t.lgZONEGEOID.lgZONEGEOID LIKE '1' )  ORDER BY t.strDESCRIPTION ")
                        .setParameter(2, search_value + "%").setParameter(5, commonparameter.statut_enable)
                        .setParameter(7, lg_DCI_ID).setParameter(6, lg_TYPE_STOCK_ID).getResultList();

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTTypeStockFamille;
    }

    public boolean createFamilleZoneGeo(TFamille OTFamille, TZoneGeographique OTZoneGeographique,
            TEmplacement OTEmplacement) {
        boolean result = false;
        TFamilleZonegeo OTFamilleZonegeo = null;
        try {
            OTFamilleZonegeo = this.getTFamilleZonegeo(OTFamille.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            if (OTFamilleZonegeo == null) {
                OTFamilleZonegeo = new TFamilleZonegeo();
                OTFamilleZonegeo.setLgFAMILLEZONEGEOID(this.getKey().getComplexId());
                OTFamilleZonegeo.setLgEMPLACEMENTID(OTEmplacement);
                OTFamilleZonegeo.setLgFAMILLEID(OTFamille);
                OTFamilleZonegeo.setDtCREATED(new Date());
                OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                OTFamilleZonegeo.setDtUPDATED(new Date());
                OTFamilleZonegeo.setStrSTATUT(commonparameter.statut_enable);
                if (this.persiste(OTFamilleZonegeo)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage("Echec de pris en l'emplacement pour ce produit");
                }
            } else {
                if (!OTFamilleZonegeo.getLgZONEGEOID().equals(OTZoneGeographique)) {
                    OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                    OTFamilleZonegeo.setDtUPDATED(new Date());
                    if (this.persiste(OTFamilleZonegeo)) {
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                        result = true;
                    } else {
                        this.buildErrorTraceMessage("Echec de pris en l'emplacement pour ce produit");
                    }
                } else {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean createFamilleZoneGeo(String lg_FAMILLE_ID, String lg_ZONE_GEO_ID, String lg_EMPLACEMENT_ID) {
        boolean result = false;
        TFamille OTFamille = null;
        TZoneGeographique OTZoneGeographique = null;
        TEmplacement OTEmplacement = null;
        try {
            OTFamille = this.getTFamille(lg_FAMILLE_ID);
            OTZoneGeographique = this.getTZoneGeographique(lg_ZONE_GEO_ID);
            OTEmplacement = this.getOdataManager().getEm().find(TEmplacement.class, lg_EMPLACEMENT_ID);
            if (OTFamille == null || OTZoneGeographique == null || OTEmplacement == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Vérifiez votre saisie");
                return result;
            }
            return this.createFamilleZoneGeo(OTFamille, OTZoneGeographique, OTEmplacement);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public TFamilleZonegeo getTFamilleZonegeo(String lg_FAMILLE_ID, String lg_EMPLACEMENT_ID) {
        TFamilleZonegeo OTFamilleZonegeo = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleZonegeo t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_EMPLACEMENT_ID);
            if (qry.getResultList().size() > 0) {
                OTFamilleZonegeo = (TFamilleZonegeo) qry.getSingleResult();
            }

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTFamilleZonegeo;
    }

    // affichage de la liste de produit en fonction du stock
    public long getArticleCompareStockCount(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID,
            String str_TYPE_TRANSACTION, int int_NUMBER) {
        long count = 0l;
        List _counts = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) { lg_EMPLACEMENT_ID =
             * "%%"; } else { lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(); }
             */
            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            if ("".equals(lg_DCI_ID)) {
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE > ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).getResultList();

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                            .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                }
            } else {
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE < ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE > ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                }

            }
            if (_counts != null) {
                count = _counts.size();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return count;
    }

    // fonction d article desactive
    /**
     * fonction pour activer et desactiver le control de la date de peremption
     *
     * @param lg_FAMILLE_ID
     * @param enabled
     *
     * @return isEnabled
     */
    public boolean enableORdisablePeremptionDate(String lg_FAMILLE_ID, boolean enabled) {
        boolean isEnabled = false;
        try {
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            if (OTFamille != null) {
                OTFamille.setBoolCHECKEXPIRATIONDATE(enabled);
                if (this.merge(OTFamille)) {
                    isEnabled = true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isEnabled;
    }

    public boolean addPeremptionDate(String lg_FAMILLE_ID, String dt_peremption) {
        boolean isEnabled = false;
        try {
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            if (OTFamille != null) {
                OTFamille.setDtPEREMPTION(java.sql.Date.valueOf(dt_peremption));
                if (this.merge(OTFamille)) {
                    isEnabled = true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isEnabled;
    }

    // liste des quantites vendus de produits par mois
    public List<TSnapshotFamillesell> getListeTSnapshotFamillesell(String lg_FAMILLE_ID) {
        List<TSnapshotFamillesell> lstTSnapshotFamillesell = new ArrayList<>();
        try {
            lstTSnapshotFamillesell = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TSnapshotFamillesell t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1")
                    .setParameter(1, lg_FAMILLE_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTSnapshotFamillesell;
    }

    public List<TSnapshotFamillesell> getListeTSnapshotFamillesell(String lg_FAMILLE_ID, int start, int limit) {
        List<TSnapshotFamillesell> lstTSnapshotFamillesell = new ArrayList<TSnapshotFamillesell>();
        try {
            lstTSnapshotFamillesell = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TSnapshotFamillesell t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1")
                    .setParameter(1, lg_FAMILLE_ID).setFirstResult(start).setMaxResults(limit).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lstTSnapshotFamillesell;
    }
    // fin liste des quantites vendus de produits par mois

    @Override
    public boolean createDeconditionnement(TFamille OTFamille, int int_NUMBER) {
        boolean result = false;
        try {
            TDeconditionnement OTDeconditionnement = new TDeconditionnement();
            OTDeconditionnement.setLgDECONDITIONNEMENTID(this.getKey().getComplexId());
            OTDeconditionnement.setLgFAMILLEID(OTFamille);
            OTDeconditionnement.setLgUSERID(this.getOTUser());
            OTDeconditionnement.setIntNUMBER(int_NUMBER);
            OTDeconditionnement.setDtCREATED(new Date());
            OTDeconditionnement.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().persist(OTDeconditionnement);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    @Override
    public TTypeetiquette getTTypeetiquette(String lg_TYPEETIQUETTE_ID) {
        TTypeetiquette OTTypeetiquette = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeetiquette t WHERE t.lgTYPEETIQUETTEID LIKE ?1 OR t.strDESCRIPTION LIKE ?2")
                    .setParameter(1, lg_TYPEETIQUETTE_ID).setParameter(2, lg_TYPEETIQUETTE_ID);
            if (qry.getResultList().size() > 0) {
                OTTypeetiquette = (TTypeetiquette) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTTypeetiquette;
    }

    public int getQuantityReapportByCodeGestionArticle(TFamilleStock OTFamilleStock) {
        int result = 0, int_TOTAL_JOURS_VENTE = 0, int_BUTOIR_CHOISI, mois_histo;
        Double qteReappro = 0.0, int_SEUIL_MIN_CALCULE, qteVenteArticle = 0.0, qteVenteJour;
        TCalendrier OTCalendrier;
        CalendrierManager OCalendrierManager = new CalendrierManager(this.getOdataManager(), this.getOTUser());
        CodeGestionManager OCodeGestionManager = new CodeGestionManager(this.getOdataManager(), this.getOTUser());
        List<TCoefficientPonderation> lstTCoefficientPonderations;

        try {
            int JourDuMois = LocalDate.now().getDayOfMonth();
            System.out.println(" JourDuMois  " + JourDuMois);
            TCodeGestion OTCodeGestion = OTFamilleStock.getLgFAMILLEID().getLgCODEGESTIONID();
            mois_histo = OTCodeGestion.getIntMOISHISTORIQUEVENTE();
            // choix du butoir
            if (JourDuMois > OTCodeGestion.getIntDATEBUTOIRARTICLE()) {
                int_BUTOIR_CHOISI = OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDATEBUTOIRARTICLE();
            } else {
                int_BUTOIR_CHOISI = OTCodeGestion.getIntDATEBUTOIRARTICLE();
            }
            // fin choix du butoir

            // determination du nombre de jour de couverture
            result = int_BUTOIR_CHOISI - JourDuMois;
            new logger().OCategory.info("result " + result + " int_BUTOIR_CHOISI " + int_BUTOIR_CHOISI);
            if (!(result < OTCodeGestion.getIntJOURSCOUVERTURESTOCK())) {
                result = OTCodeGestion.getIntJOURSCOUVERTURESTOCK();
            }
            new logger().OCategory.info("result final " + result);
            // fin determination du nombre de jour de couverture

            // determination du nombre de vente sur les mois historique du produit
            if (OTCodeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equalsIgnoreCase("1")) {
                for (int i = 1; i <= mois_histo; i++) {
                    new logger().OCategory.info("i ---- " + i + " mois histo ---" + mois_histo);
                    OTCalendrier = OCalendrierManager.getTCalendrier(
                            String.valueOf(Integer.parseInt(date.getoMois(new Date())) - i),
                            Integer.parseInt(date.getAnnee(new Date())));
                    if (OTCalendrier != null) {
                        if (OTFamilleStock.getLgFAMILLEID().getBoolDECONDITIONNEEXIST() == 1) {
                            qteVenteArticle += (this.getQauntityVenteByArticle(OTCalendrier.getDtBEGIN(),
                                    OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%",
                                    "%%")
                                    + getDeconditionnesQty(OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(),
                                            OTCalendrier.getDtBEGIN(), OTCalendrier.getDtEND(), "%%", "%%"));
                        } else {
                            qteVenteArticle += this.getQauntityVenteByArticle(OTCalendrier.getDtBEGIN(),
                                    OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%",
                                    "%%");
                        }

                        int_TOTAL_JOURS_VENTE += OTCalendrier.getIntNUMBERJOUR();
                    }
                }
            } else if (OTCodeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equalsIgnoreCase("2")) {
                lstTCoefficientPonderations = OCodeGestionManager
                        .getListTCoefficientPonderation(OTCodeGestion.getLgCODEGESTIONID());
                mois_histo = OTCodeGestion.getIntMOISHISTORIQUEVENTE();
                if (lstTCoefficientPonderations.size() < OTCodeGestion.getIntMOISHISTORIQUEVENTE()) {
                    mois_histo = lstTCoefficientPonderations.size();
                }
                new logger().OCategory.info("lstTCoefficientPonderations taille " + lstTCoefficientPonderations.size()
                        + " mois histo " + mois_histo);
                for (int i = 1; i <= mois_histo; i++) {
                    OTCalendrier = OCalendrierManager.getTCalendrier(
                            String.valueOf(Integer.parseInt(date.getoMois(new Date())) - i),
                            Integer.parseInt(date.getAnnee(new Date())));
                    if (OTCalendrier != null) {
                        new logger().OCategory.info("Coefficient i : " + i + " valeur "
                                + lstTCoefficientPonderations.get((i - 1)).getIntCOEFFICIENTPONDERATION());
                        if (OTFamilleStock.getLgFAMILLEID().getBoolDECONDITIONNEEXIST() == 1) {
                            qteVenteArticle += ((this.getQauntityVenteByArticle(OTCalendrier.getDtBEGIN(),
                                    OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%",
                                    "%%")
                                    + getDeconditionnesQty(OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(),
                                            OTCalendrier.getDtBEGIN(), OTCalendrier.getDtEND(), "%%", "%%"))
                                    * lstTCoefficientPonderations.get((i - 1)).getIntCOEFFICIENTPONDERATION());
                        } else {
                            qteVenteArticle += (this.getQauntityVenteByArticle(OTCalendrier.getDtBEGIN(),
                                    OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%",
                                    "%%") * lstTCoefficientPonderations.get((i - 1)).getIntCOEFFICIENTPONDERATION());
                        }

                        int_TOTAL_JOURS_VENTE += OTCalendrier.getIntNUMBERJOUR();
                    }
                }
            }
            // fin determination du nombre de vente sur les mois historique du produit
            new logger().OCategory
                    .info("int_TOTAL_JOURS_VENTE " + int_TOTAL_JOURS_VENTE + " qteVenteArticle " + qteVenteArticle);
            if (OTCodeGestion.getIntDATELIMITEEXTRAPOLATION() <= JourDuMois) {
                OTCalendrier = OCalendrierManager.getTCalendrier(date.getoMois(new Date()),
                        Integer.parseInt(date.getAnnee(new Date())));
                if (OTCalendrier != null) {
                    if (OTFamilleStock.getLgFAMILLEID().getBoolDECONDITIONNEEXIST() == 1) {
                        qteVenteArticle += ((this.getQauntityVenteByArticle(OTCalendrier.getDtBEGIN(),
                                OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%", "%%")
                                + getDeconditionnesQty(OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(),
                                        OTCalendrier.getDtBEGIN(), OTCalendrier.getDtEND(), "%%", "%%"))
                                * OTCodeGestion.getIntCOEFFICIENTPONDERATION());
                    } else {
                        qteVenteArticle += (this.getQauntityVenteByArticle(OTCalendrier.getDtBEGIN(),
                                OTCalendrier.getDtEND(), OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(), "%%", "%%")
                                * OTCodeGestion.getIntCOEFFICIENTPONDERATION());
                    }

                    int_TOTAL_JOURS_VENTE += OTCalendrier.getIntNUMBERJOUR();
                }
                mois_histo++;
            }
            new logger().OCategory.info("int_TOTAL_JOURS_VENTE apres " + int_TOTAL_JOURS_VENTE
                    + " qteVenteArticle apres " + qteVenteArticle + " mois_histo " + mois_histo + " result " + result);
            qteVenteJour = qteVenteArticle / int_TOTAL_JOURS_VENTE;
            int_SEUIL_MIN_CALCULE = qteVenteJour * result; // determination du seuil de reappro
            new logger().OCategory.info("int_SEUIL_MIN_CALCULE " + int_SEUIL_MIN_CALCULE);
            // determination de la quantité de reapprovisionnement
            if (OTCodeGestion.getBoolOPTIMISATIONSEUILCMDE()) {
                int_SEUIL_MIN_CALCULE = qteVenteJour
                        * OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDELAIREAPPROVISIONNEMENT();
                if (int_SEUIL_MIN_CALCULE > OTFamilleStock.getIntNUMBERAVAILABLE()) {
                    qteReappro = qteVenteJour * result;
                    qteReappro = (int_SEUIL_MIN_CALCULE - OTFamilleStock.getIntNUMBERAVAILABLE()) + qteReappro;
                    new logger().OCategory.info("qteReappro transformé " + qteReappro + " Quantité de réappro "
                            + OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDELAIREAPPROVISIONNEMENT()
                            + " Grossiste " + OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getStrDESCRIPTION());
                    qteReappro = Math.ceil(qteReappro
                            + ((OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntCOEFSECURITY() * qteReappro)
                                    / 100));
                }

            } else {

                if (OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() > OTFamilleStock.getIntNUMBERAVAILABLE()) {
                    qteReappro = Math.ceil(
                            (OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() - OTFamilleStock.getIntNUMBERAVAILABLE())
                                    + int_SEUIL_MIN_CALCULE);
                }

            }

            // fin determination de la quantité de reapprovisionnement
        } catch (Exception e) {
            e.printStackTrace();
        }

        return qteReappro.intValue();
    }

    public int getQauntityVenteByArticle(Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID) {

        int result = 0;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();

        try {

            lstTPreenregistrementDetail = this.listTPreenregistrementDetail(dtDEBUT, dtFin, lg_FAMILLE_ID, lg_USER_ID,
                    lg_PREENREGISTREMENT_ID);
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

    public List<TPreenregistrementDetail> listTPreenregistrementDetail(Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_USER_ID, String lg_PREENREGISTREMENT_ID) {

        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        new logger().OCategory.info("dtDEBUT " + dtDEBUT + " dtFin " + dtFin);
        try {

            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.lgPREENREGISTREMENTID.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID = ?1  AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.lgPREENREGISTREMENTID.dtCREATED DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDEBUT)
                    .setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(7, commonparameter.statut_is_Closed)
                    .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }

        return lstTPreenregistrementDetail;
    }

    private int getDeconditionnesVentes(Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID) {
        int qty = 0;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();

        try {
            TFamille parent = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            lstTPreenregistrementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE (t.lgPREENREGISTREMENTID.dtCREATED BETWEEN ?3 AND ?4) AND t.lgFAMILLEID.lgFAMILLEID = ?1  AND t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID LIKE ?2 AND t.lgPREENREGISTREMENTID.lgUSERID.lgUSERID LIKE ?5 AND t.lgPREENREGISTREMENTID.strSTATUT LIKE ?7 AND t.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 ORDER BY t.lgPREENREGISTREMENTID.dtCREATED DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_PREENREGISTREMENT_ID).setParameter(3, dtDEBUT)
                    .setParameter(4, dtFin).setParameter(5, lg_USER_ID)
                    .setParameter(7, commonparameter.statut_is_Closed)
                    .setParameter(8, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getResultList();
            if (!lstTPreenregistrementDetail.isEmpty()) {
                qty = lstTPreenregistrementDetail.stream().mapToInt((value) -> {
                    return value.getIntQUANTITY();
                }).sum();
                Double finalQty = Math.ceil(qty / parent.getIntNUMBERDETAIL());
                qty = finalQty.intValue();
            }
        } catch (Exception e) {
            e.printStackTrace();

        }

        return qty;
    }

    private int getDeconditionnesQty(String parentID, Date dtDEBUT, Date dtFin, String lg_USER_ID,
            String lg_PREENREGISTREMENT_ID) {
        List<TFamille> familles = new ArrayList<>();
        int qty = 0;
        try {
            familles = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TFamille o WHERE o.lgFAMILLEPARENTID=?1  ").setParameter(1, parentID)
                    .getResultList();
            if (!familles.isEmpty()) {
                for (TFamille famille : familles) {
                    qty += getDeconditionnesVentes(dtDEBUT, dtFin, famille.getLgFAMILLEID(), lg_USER_ID,
                            lg_PREENREGISTREMENT_ID);
                }

            }
        } catch (Exception e) {
        }
        return qty;
    }
    // affichage de la liste de produit en fonction du stock

    public List<TFamilleStock> getListArticleCompareStock(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID,
            String str_TYPE_TRANSACTION, int int_NUMBER, int number2, boolean stockUndefined,
            boolean stockREAPUndefined, int start, int limit) {
        List<TFamilleStock> lstTFamilleStock = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID;
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }
            /*
             * if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) { lg_EMPLACEMENT_ID =
             * "%%"; } else { lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(); }
             */
            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            int testCase = matchCase(stockUndefined, stockREAPUndefined);
            if ("".equals(lg_DCI_ID)) {
                if (testCase == 0) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.intNUMBERAVAILABLE < 0     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(7, lg_EMPLACEMENT_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();
                }
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.lgFAMILLEID.intSEUILMIN < ?8     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.intSEUILMIN < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.lgFAMILLEID.intSEUILMIN=?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.intSEUILMIN = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {

                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE > ?6 AND t.lgFAMILLEID.intSEUILMIN >?8  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE > ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.intSEUILMIN >?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    default:
                        break;

                    }
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {

                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND (t.lgFAMILLEID.intSEUILMIN = ?8 OR t.lgFAMILLEID.intSEUILMIN < ?8) GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.lgFAMILLEID.intSEUILMIN = ?6 OR t.lgFAMILLEID.intSEUILMIN < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND (t.lgFAMILLEID.intSEUILMIN = ?8 OR t.lgFAMILLEID.intSEUILMIN > ?8) GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.lgFAMILLEID.intSEUILMIN = ?6 OR t.lgFAMILLEID.intSEUILMIN > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                                .getResultList();
                        break;
                    default:
                        break;

                    }

                } else if ("STOCKINFERIEURREAP".equals(str_TYPE_TRANSACTION)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND ( t.lgFAMILLEID.intSEUILMIN > t.intNUMBERAVAILABLE ) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(7, lg_EMPLACEMENT_ID)
                            .setFirstResult(start).setMaxResults(limit).getResultList();

                }

            } else {
                if (testCase == 0) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.intNUMBERAVAILABLE < 0 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();

                }
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < ?7 AND t.lgFAMILLEID.intSEUILMIN <?9 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .setFirstResult(start).setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgFAMILLEID.intSEUILMIN < ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    default:
                        break;

                    }
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgFAMILLEID.intSEUILMIN=?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .setFirstResult(start).setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgFAMILLEID.intSEUILMIN = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgFAMILLEID.intSEUILMIN >?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .setFirstResult(start).setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgFAMILLEID.intSEUILMIN > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    default:
                        break;

                    }
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE < ?7) AND (t.lgFAMILLEID.intSEUILMIN  = ?9 OR t.lgFAMILLEID.intSEUILMIN  < ?9) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .setFirstResult(start).setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE < ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.lgFAMILLEID.intSEUILMIN = ?7 OR t.lgFAMILLEID.intSEUILMIN < ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {

                    switch (testCase) {
                    case 1:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE > ?7) AND (t.lgFAMILLEID.intSEUILMIN = ?9 OR t.lgFAMILLEID.intSEUILMIN > ?9) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .setFirstResult(start).setMaxResults(limit).getResultList();
                        break;
                    case 2:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE > ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    case 3:
                        lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                                "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.lgFAMILLEID.intSEUILMIN = ?7 OR t.lgFAMILLEID.intSEUILMIN > ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start)
                                .setMaxResults(limit).getResultList();
                        break;
                    default:

                        break;

                    }

                } else if ("STOCKINFERIEURREAP".equals(str_TYPE_TRANSACTION)) {
                    lstTFamilleStock = this.getOdataManager().getEm().createQuery(
                            "SELECT t FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND ( t.lgFAMILLEID.intSEUILMIN > t.intNUMBERAVAILABLE ) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(8, lg_EMPLACEMENT_ID).setFirstResult(start).setMaxResults(limit)
                            .getResultList();

                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstTFamilleStock;
    }

    // fonction d article desactive
    public int matchCase(boolean v1, boolean v2) {
        int test = 0;
        if (!v1 && !v2) {
            test = 1;
        } else if (!v1 && v2) {
            test = 2;
        } else if (v1 && !v2) {
            test = 3;
        }
        return test;
    }
    // affichage de la liste de produit en fonction du stock

    public long getArticleCompareStockCount(String search_value, String lg_FAMILLE_ID, String lg_DCI_ID,
            String str_TYPE_TRANSACTION, int int_NUMBER, int number2, boolean stockUndefined,
            boolean stockREAPUndefined) {
        long count = 0l;
        List _counts = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID;
        try {
            if ("".equals(search_value) || search_value == null) {
                search_value = "%%";
            }

            lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            int testCase = matchCase(stockUndefined, stockREAPUndefined);
            if ("".equals(lg_DCI_ID)) {
                if (testCase == 0) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < 0 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(7, lg_EMPLACEMENT_ID)
                            .getResultList();
                }
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.lgFAMILLEID.intSEUILMIN < ?8     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.intSEUILMIN < ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7     GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND t.lgFAMILLEID.intSEUILMIN=?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.intSEUILMIN = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {

                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE > ?6 AND t.lgFAMILLEID.intSEUILMIN >?8  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.intNUMBERAVAILABLE > ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND t.lgFAMILLEID.intSEUILMIN >?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {

                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND (t.lgFAMILLEID.intSEUILMIN = ?8 OR t.lgFAMILLEID.intSEUILMIN < ?8) GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.lgFAMILLEID.intSEUILMIN = ?6 OR t.lgFAMILLEID.intSEUILMIN < ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 AND (t.lgFAMILLEID.intSEUILMIN = ?8 OR t.lgFAMILLEID.intSEUILMIN > ?8) GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).setParameter(8, number2).getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.intNUMBERAVAILABLE = ?6 OR t.intNUMBERAVAILABLE > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, int_NUMBER)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND (t.lgFAMILLEID.intSEUILMIN = ?6 OR t.lgFAMILLEID.intSEUILMIN > ?6) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, number2)
                                .setParameter(7, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if ("STOCKINFERIEURREAP".equals(str_TYPE_TRANSACTION)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg WHERE fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND ( t.lgFAMILLEID.intSEUILMIN > t.intNUMBERAVAILABLE ) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(7, lg_EMPLACEMENT_ID)
                            .getResultList();

                }
            } else {
                if (testCase == 0) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < 0 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(8, lg_EMPLACEMENT_ID).getResultList();

                }
                if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESS)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < ?7 AND t.lgFAMILLEID.intSEUILMIN <?9 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE < ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgFAMILLEID.intSEUILMIN < ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.EQUAL)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgFAMILLEID.intSEUILMIN=?9 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgFAMILLEID.intSEUILMIN = ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MORE)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 AND t.lgFAMILLEID.intSEUILMIN >?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.intNUMBERAVAILABLE > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND t.lgFAMILLEID.intSEUILMIN > ?7 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }
                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.LESSOREQUAL)) {
                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE < ?7) AND (t.lgFAMILLEID.intSEUILMIN  = ?9 OR t.lgFAMILLEID.intSEUILMIN  < ?9) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE < ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.lgFAMILLEID.intSEUILMIN = ?7 OR t.lgFAMILLEID.intSEUILMIN < ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.MOREOREQUAL)) {

                    switch (testCase) {
                    case 1:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE > ?7) AND (t.lgFAMILLEID.intSEUILMIN = ?9 OR t.lgFAMILLEID.intSEUILMIN > ?9) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).setParameter(9, number2)
                                .getResultList();
                        break;
                    case 2:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.intNUMBERAVAILABLE = ?7 OR t.intNUMBERAVAILABLE > ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, int_NUMBER).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    case 3:
                        _counts = this.getOdataManager().getEm().createQuery(
                                "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.lgFAMILLEID.intSEUILMIN = ?7 OR t.lgFAMILLEID.intSEUILMIN > ?7) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                                .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                                .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                                .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                                .setParameter(7, number2).setParameter(8, lg_EMPLACEMENT_ID).getResultList();
                        break;
                    default:
                        break;

                    }

                } else if ("STOCKINFERIEURREAP".equals(str_TYPE_TRANSACTION)) {
                    _counts = this.getOdataManager().getEm().createQuery(
                            "SELECT COUNT(t) FROM TFamilleStock t, TFamilleGrossiste fg, TFamilleDci fd WHERE t.lgFAMILLEID.lgFAMILLEID = fd.lgFAMILLEID.lgFAMILLEID AND fg.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID AND t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgFAMILLEID.strNAME LIKE ?2 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?2 OR fg.strCODEARTICLE LIKE ?2) AND t.lgFAMILLEID.strSTATUT = ?5 AND fd.lgDCIID.lgDCIID LIKE ?6 AND (t.lgFAMILLEID.intSEUILMIN > t.intNUMBERAVAILABLE ) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8 GROUP BY t.lgFAMILLEID.lgFAMILLEID ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                            .setParameter(1, lg_FAMILLE_ID).setParameter(2, search_value + "%")
                            .setParameter(3, search_value + "%").setParameter(4, search_value + "%")
                            .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_DCI_ID)
                            .setParameter(8, lg_EMPLACEMENT_ID).getResultList();

                }

            }

            if (_counts != null) {
                count = _counts.size();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return count;
    }

    public JSONArray getAllArticle(String produitId, String search_value, String lg_DCI_ID, TEmplacement emp,
            String str_TYPE_TRANSACTION, boolean all, int maxResults, int firstResult) {
        JSONArray jsonarray = new JSONArray();
        String lg_EMPLACEMENT_ID;
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        boolean ACTION_DESACTIVE_PRODUIT = DateConverter.hasAuthorityByName(getUsersPrivileges(),
                DateConverter.ACTION_DESACTIVE_PRODUIT);
        try {
            lg_EMPLACEMENT_ID = emp.getLgEMPLACEMENTID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TFamille> cq = cb.createQuery(TFamille.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> fs = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TFamilleGrossiste> fg = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            cq.select(root).distinct(true);
            Predicate p = cb.conjunction();
            if (!"".equals(lg_DCI_ID)) {
                Join<TFamille, TFamilleDci> fd = root.join("tFamilleDciCollection", JoinType.INNER);
                p = cb.and(p, cb.equal(fd.get(TFamilleDci_.lgDCIID).get(TDci_.lgDCIID), lg_DCI_ID));
            }
            if (!"".equals(search_value)) {
                p = cb.and(p,
                        cb.or(cb.like(root.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(root.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(root.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search_value + "%")));
            }
            p = cb.and(p, cb.equal(root.get(TFamille_.strSTATUT), commonparameter.statut_enable));
            p = cb.and(p, cb.equal(fs.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            if (null != str_TYPE_TRANSACTION) {
                switch (str_TYPE_TRANSACTION) {
                case "DECONDITIONNE":
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNE), Short.valueOf("1")));
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNEEXIST), Short.valueOf("1")));
                    break;
                case "DECONDITION":
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNE), Short.valueOf("0")));
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNEEXIST), Short.valueOf("1")));
                    break;
                case "SANSEMPLACEMENT":
                    p = cb.and(p, cb.equal(root.get("lgZONEGEOID").get("lgZONEGEOID"), "1"));
                    break;
                default:
                    break;
                }
            }
            cq.where(p).orderBy(cb.asc(root.get(TFamille_.strDESCRIPTION)));
            Query q = em.createQuery(cq);

            if (!all) {
                q.setMaxResults(maxResults);
                q.setFirstResult(firstResult);
            }

            List<TFamille> allArticles = q.getResultList();

            Object[] Obj = getPrivilegeProductByUser(this.getOTUser().getLgUSERID());

            TParameters OParameters = em.getReference(TParameters.class, "KEY_ACTIVATE_PEREMPTION_DATE");

            allArticles.forEach((t) -> {
                em.refresh(t);
                JSONObject json = new JSONObject();
                try {

                    json.put("ACTION_DESACTIVE_PRODUIT", ACTION_DESACTIVE_PRODUIT);
                    json.put("BTNDELETE", Boolean.valueOf(Obj[1].toString()));
                    json.put("P_BT_UPDATE", Boolean.valueOf(Obj[2].toString()));
                    json.put("P_UPDATE_PAF", Boolean.valueOf(Obj[3].toString()));
                    json.put("P_UPDATE_PRIXVENTE", Boolean.valueOf(Obj[4].toString()));
                    json.put("P_UPDATE_CODETABLEAU", Boolean.valueOf(Obj[5].toString()));
                    json.put("P_UPDATE_CODEREMISE", Boolean.valueOf(Obj[6].toString()));
                    json.put("P_UPDATE_CIP", Boolean.valueOf(Obj[7].toString()));
                    json.put("P_UPDATE_DESIGNATION", Boolean.valueOf(Obj[8].toString()));
                    json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
                    json.put("scheduled", t.isScheduled());

                    try {
                        json.put("gammeId", t.getGamme().getId());
                    } catch (Exception e) {
                    }
                    try {
                        json.put("laboratoireId", t.getLaboratoire().getId());
                    } catch (Exception e) {
                    }
                    json.put("dt_Peremtion",
                            (t.getDtPEREMPTION() != null ? date.formatterShort.format(t.getDtPEREMPTION()) : ""));
                    json.put("dtPEREMPTION", (t.getDtPEREMPTION() != null
                            ? date.formatterMysqlShort.format(t.getDtPEREMPTION()) : LocalDate.now().toString()));
                    json.put("lg_FAMILLEARTICLE_ID", t.getLgFAMILLEARTICLEID().getStrLIBELLE());
                    json.put("str_NAME", t.getStrNAME());
                    json.put("STATUS", t.getIntORERSTATUS());
                    json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
                    json.put("int_PRICE", t.getIntPRICE());
                    json.put("lg_GROSSISTE_ID", t.getLgGROSSISTEID().getStrLIBELLE());
                    json.put("int_CIP", t.getIntCIP());
                    json.put("int_PAF", t.getIntPAF());
                    json.put("int_PAT", t.getIntPAT());
                    json.put("int_QTE_REAPPROVISIONNEMENT",
                            (t.getIntQTEREAPPROVISIONNEMENT() != null ? t.getIntQTEREAPPROVISIONNEMENT() : 0));
                    json.put("int_STOCK_REAPROVISONEMENT", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
                    json.put("int_EAN13", t.getIntEAN13());
                    json.put("int_S", t.getIntS());
                    json.put("int_T", t.getIntT());
                    json.put("int_SEUIL_MIN", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
                    json.put("lg_ZONE_GEO_ID",
                            (t.getLgZONEGEOID().getStrLIBELLEE() != null ? t.getLgZONEGEOID().getStrLIBELLEE() : ""));
                    if (t.getBoolDECONDITIONNE() == 0 && t.getBoolDECONDITIONNEEXIST() == 1) {
                        TFamilleStock OTFamilleStock = getDecondionneParent(t.getLgFAMILLEID());
                        if (OTFamilleStock != null) {
                            json.put("lg_FAMILLE_DECONDITION_ID", OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
                            json.put("str_DESCRIPTION_DECONDITION",
                                    OTFamilleStock.getLgFAMILLEID().getStrDESCRIPTION());
                            json.put("int_NUMBER_AVAILABLE_DECONDITION", OTFamilleStock.getIntNUMBERAVAILABLE());
                        }
                    }
                    json.put("int_NUMBERDETAIL", t.getIntNUMBERDETAIL());

                    json.put("int_PRICE_TIPS", t.getIntPRICETIPS());
                    json.put("int_TAUX_MARQUE", t.getIntTAUXMARQUE());
                    try {
                        json.put("lg_TYPEETIQUETTE_ID", t.getLgTYPEETIQUETTEID().getStrDESCRIPTION());
                    } catch (Exception e) {
                    }
                    try {
                        json.put("lg_CODE_ACTE_ID", t.getLgCODEACTEID().getStrLIBELLEE());
                    } catch (Exception e) {
                    }
                    try {
                        json.put("lg_CODE_GESTION_ID", t.getLgCODEGESTIONID().getStrCODEBAREME());
                    } catch (Exception e) {
                    }
                    try {
                        json.put("lg_FABRIQUANT_ID", t.getLgFABRIQUANTID().getStrNAME());
                    } catch (Exception e) {

                    }
                    try {
                        json.put("lg_INDICATEUR_REAPPROVISIONNEMENT_ID",
                                t.getLgINDICATEURREAPPROVISIONNEMENTID().getStrLIBELLEINDICATEUR());
                    } catch (Exception e) {

                    }
                    json.put("str_CODE_TAUX_REMBOURSEMENT", t.getStrCODETAUXREMBOURSEMENT());

                    try {
                        json.put("str_CODE_REMISE", t.getStrCODEREMISE());
                        json.put("lg_REMISE_ID", t.getLgREMISEID().getStrNAME());
                    } catch (Exception e) {

                    }

                    json.put("bool_DECONDITIONNE", t.getBoolDECONDITIONNE());
                    json.put("bool_DECONDITIONNE_EXIST", t.getBoolDECONDITIONNEEXIST());

                    try {
                        json.put("lg_CODE_TVA_ID", t.getLgCODETVAID().getStrNAME());
                    } catch (Exception e) {

                    }

                    int int_NUMBER_AVAILABLE = OSnapshotManager.getStock(t.getLgFAMILLEID(), emp.getLgEMPLACEMENTID());
                    json.put("int_NUMBER", int_NUMBER_AVAILABLE);
                    json.put("int_NUMBER_AVAILABLE", int_NUMBER_AVAILABLE);
                    json.put("str_STATUT", t.getStrSTATUT());

                    json.put("bool_RESERVE", t.getBoolRESERVE());

                    if (t.getBoolRESERVE() && "1".equals(emp.getLgEMPLACEMENTID())) {
                        json.put("int_SEUIL_RESERVE", t.getIntSEUILRESERVE());
                        TTypeStockFamille typeEtiquette = new StockManager().getTTypeStockFamilleByTypestock("2",
                                t.getLgFAMILLEID());
                        json.put("int_STOCK_RESERVE", typeEtiquette.getIntNUMBER());
                    }

                    json.put("dt_CREATED", date.DateToString(t.getDtCREATED(), date.formatterShort));
                    json.put("dt_UPDATED", date.DateToString(t.getDtUPDATED(), date.formatterShort));

                    json.put("lg_EMPLACEMENT_ID", emp.getLgEMPLACEMENTID());
                    if ("1".equals(OParameters.getStrVALUE())) {
                        json.put("checkExpirationdate", t.getBoolCHECKEXPIRATIONDATE());
                    } else {
                        json.put("checkExpirationdate", false);
                    }
                    try {

                        json.put("dt_LAST_INVENTAIRE", dateDerniereInventare(t.getLgFAMILLEID()));
                    } catch (Exception e) {
                    }

                    try {

                        String dateVente = this.dateDerniereVente(t.getLgFAMILLEID());

                        json.put("dt_LAST_VENTE", dateVente);

                    } catch (Exception e) {
                    }

                    try {

                        String dateEntree = dateEntree(t.getLgFAMILLEID());

                        json.put("dt_LAST_ENTREE", dateEntree);

                    } catch (Exception e) {
                    }
                } catch (Exception e) {

                }

                TBonLivraison bonLivraison = findByFamille(t);

                if (bonLivraison != null) {
                    json.put("dt_DATE_LIVRAISON",
                            DateConverter.convertDateToDD_MM_YYYY(bonLivraison.getDtDATELIVRAISON()));
                }

                jsonarray.put(json);
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
        return jsonarray;
    }

    TBonLivraison findByFamille(TFamille famille) {
        try {
            TypedQuery<TBonLivraison> q = this.getOdataManager().getEm().createQuery(
                    "SELECT o.lgBONLIVRAISONID FROM TBonLivraisonDetail o where o.lgFAMILLEID=?1 AND o.lgBONLIVRAISONID.strSTATUT='is_Closed' ORDER BY o.lgBONLIVRAISONID.dtDATELIVRAISON DESC  ",
                    TBonLivraison.class);
            q.setMaxResults(1);
            q.setParameter(1, famille);
            return q.getSingleResult();

        } catch (Exception e) {

            return null;
        }
    }

    public Object[] getPrivilegeProductByUser(String lg_USER_ID) {
        try {
            Object[] O = (Object[]) this.getOdataManager().getEm()
                    .createNativeQuery("call proc_getprivilege_user_for_product(?)").setParameter(1, lg_USER_ID)
                    .getSingleResult();
            return O;
        } catch (Exception e) {
            return null;
        }
    }

    public TFamilleStock getDecondionneParent(String lg_FAMILLE_ID) {
        TFamilleStock OTProductItemStock = null;
        try {

            Query qry = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEPARENTID = ?1 ")
                    .setMaxResults(1).setParameter(1, lg_FAMILLE_ID);
            if (qry.getResultList().size() > 0) {
                OTProductItemStock = (TFamilleStock) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Produit inexistant");
        }
        return OTProductItemStock;
    }

    public TMouvement getTMouvement(String lg_FAMILLE_ID, String str_ACTION) {
        TMouvement OTMouvement = null;
        try {

            OTMouvement = (TMouvement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvement t WHERE t.strSTATUT = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.strACTION = ?3")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, str_ACTION).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvement;
    }

    public int allCount(String produitId, String search_value, String lg_DCI_ID, String str_TYPE_TRANSACTION,
            TEmplacement emp) {

        String lg_EMPLACEMENT_ID = "";
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        EntityManager em = null;
        try {
            em = this.getOdataManager().getEm();
            lg_EMPLACEMENT_ID = emp.getLgEMPLACEMENTID();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TTypeStockFamille> j = root.join("tTypeStockFamilleCollection", JoinType.INNER);
            Join<TFamille, TFamilleStock> fs = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TFamilleGrossiste> fg = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            cq.select(cb.countDistinct(root));
            Predicate p = cb.conjunction();
            if (!"".equals(lg_DCI_ID)) {
                Join<TFamille, TFamilleDci> fd = root.join("tFamilleDciCollection", JoinType.INNER);
                p = cb.and(p, cb.equal(fd.get(TFamilleDci_.lgDCIID).get(TDci_.lgDCIID), lg_DCI_ID));
            }
            if (!"".equals(search_value)) {
                p = cb.and(p,
                        cb.or(cb.like(root.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(root.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(root.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search_value + "%")));
            }
            String lg_TYPE_STOCK_ID = "1";
            if (!"1".equals(emp.getLgEMPLACEMENTID())) {
                lg_TYPE_STOCK_ID = "3";
            }
            p = cb.and(p, cb.equal(root.get(TFamille_.strSTATUT), commonparameter.statut_enable));
            p = cb.and(p, cb.equal(j.get("lgTYPESTOCKID").get("lgTYPESTOCKID"), lg_TYPE_STOCK_ID));
            p = cb.and(p, cb.equal(fs.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));
            if (null != str_TYPE_TRANSACTION) {
                switch (str_TYPE_TRANSACTION) {
                case "DECONDITIONNE":
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNE), Short.valueOf("1")));
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNEEXIST), Short.valueOf("1")));
                    break;
                case "DECONDITION":
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNE), Short.valueOf("0")));
                    p = cb.and(p, cb.equal(root.get(TFamille_.boolDECONDITIONNEEXIST), Short.valueOf("1")));
                    break;
                case "SANSEMPLACEMENT":

                    p = cb.and(p, cb.equal(root.get("lgZONEGEOID").get("lgZONEGEOID"), "1"));
                    break;
                default:
                    break;
                }
            }
            cq.where(p);
            Query q = em.createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();

        } finally {

        }

    }
    // 29 11 2017 00:14

    public String dateDerniereVente(String lgFAMILLEID) {
        String date = "";
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TPreenregistrement_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TPreenregistrement_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return date;
    }

    public String dateEntree(String lgFAMILLEID) {
        String date = "";
        try {

            EntityManager em = this.getOdataManager().getEm();

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);

            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            Join<TBonLivraisonDetail, TBonLivraison> j = root.join("lgBONLIVRAISONID", JoinType.INNER);
            Join<TBonLivraisonDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(j.get(TBonLivraison_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, j.get(TBonLivraison_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(j.get(TBonLivraison_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);
            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();

        }
        return date;
    }

    public String dateDerniereInventare(String lgFAMILLEID) {
        String date = "";
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jp = root.join("lgINVENTAIREID", JoinType.INNER);
            Join<TInventaireFamille, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()));

            predicate = cb.and(predicate, cb.equal(jp.get(TInventaire_.strSTATUT), "is_Closed"));

            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TInventaire_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TInventaire_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return date;
    }

    public boolean updateFamilleZone(String lg_FAMILLE_ID, String lg_ZONE_GEO_ID) {
        boolean result = false;
        TFamille OTFamille = null;
        TZoneGeographique OTZoneGeographique = null;
        TEmplacement OTEmplacement = null;
        try {
            OTFamille = this.getTFamille(lg_FAMILLE_ID);
            OTZoneGeographique = this.getTZoneGeographique(lg_ZONE_GEO_ID);
            OTEmplacement = this.getOTUser().getLgEMPLACEMENTID();
            if (OTFamille == null || OTZoneGeographique == null || OTEmplacement == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Vérifiez votre saisie");
                return result;
            }
            return this.updateFamilleZoneGeo(OTFamille, OTZoneGeographique, OTEmplacement);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean updateFamilleZoneGeo(TFamille OTFamille, TZoneGeographique OTZoneGeographique,
            TEmplacement OTEmplacement) {
        boolean result = false;
        TFamilleZonegeo OTFamilleZonegeo = null;
        try {
            OTFamilleZonegeo = this.getTFamilleZonegeo(OTFamille.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            this.getOdataManager().getEm().getTransaction().begin();
            if (OTFamilleZonegeo == null) {
                OTFamilleZonegeo = new TFamilleZonegeo();
                OTFamilleZonegeo.setLgFAMILLEZONEGEOID(this.getKey().getComplexId());
                OTFamilleZonegeo.setLgEMPLACEMENTID(OTEmplacement);
                OTFamilleZonegeo.setLgFAMILLEID(OTFamille);
                OTFamilleZonegeo.setDtCREATED(new Date());
                OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                OTFamilleZonegeo.setDtUPDATED(new Date());
                OTFamilleZonegeo.setStrSTATUT(commonparameter.statut_enable);
                this.getOdataManager().getEm().persist(OTFamilleZonegeo);

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;

            } else {

                OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                OTFamilleZonegeo.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTFamilleZonegeo);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            }
            OTFamille.setLgZONEGEOID(OTZoneGeographique);
            this.getOdataManager().getEm().merge(OTFamille);
            this.getOdataManager().getEm().getTransaction().commit();
            this.getOdataManager().getEm().clear();

        } catch (Exception e) {
            this.getOdataManager().getEm().getTransaction().rollback();
            this.getOdataManager().getEm().clear();

            e.printStackTrace();
            return false;
        }
        return result;
    }

    public JSONArray getAllArticle(String search_value, TEmplacement emp, boolean all, int maxResults,
            int firstResult) {
        JSONArray jsonarray = new JSONArray();
        String lg_EMPLACEMENT_ID;
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        try {

            lg_EMPLACEMENT_ID = emp.getLgEMPLACEMENTID();

            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TFamille> cq = cb.createQuery(TFamille.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TTypeStockFamille> j = root.join("tTypeStockFamilleCollection", JoinType.INNER);
            Join<TFamille, TFamilleStock> fs = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TFamilleGrossiste> fg = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            cq.select(root).distinct(true);
            Predicate p = cb.conjunction();

            if (!"".equals(search_value)) {

                p = cb.and(p,
                        cb.or(cb.like(root.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(root.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(root.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search_value + "%")));
            }
            p = cb.and(p, cb.equal(root.get(TFamille_.strSTATUT), commonparameter.statut_enable));
            String lg_TYPE_STOCK_ID = "1";
            if (!"1".equals(emp.getLgEMPLACEMENTID())) {
                lg_TYPE_STOCK_ID = "3";
            }
            p = cb.and(p, cb.equal(j.get("lgTYPESTOCKID").get("lgTYPESTOCKID"), lg_TYPE_STOCK_ID));
            p = cb.and(p, cb.equal(fs.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));

            cq.where(p).orderBy(cb.asc(root.get(TFamille_.strDESCRIPTION)));
            Query q = em.createQuery(cq);

            if (!all) {
                q.setMaxResults(maxResults);
                q.setFirstResult(firstResult);
            }

            List<TFamille> allArticles = q.getResultList();

            // TParameters OParameters = em.getReference(TParameters.class, "KEY_ACTIVATE_PEREMPTION_DATE");
            allArticles.forEach((t) -> {
                em.refresh(t);
                JSONObject json = new JSONObject();
                try {

                    json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
                    // json.put("dt_Peremtion", (t.getDtPEREMPTION() != null ?
                    // date.formatterShort.format(t.getDtPEREMPTION()) : ""));
                    json.put("lg_FAMILLEARTICLE_ID", t.getLgFAMILLEARTICLEID().getStrLIBELLE());
                    json.put("str_NAME", t.getStrNAME());
                    json.put("STATUS", t.getIntORERSTATUS());
                    json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
                    json.put("int_PRICE", t.getIntPRICE());
                    json.put("lg_GROSSISTE_ID", t.getLgGROSSISTEID().getStrLIBELLE());
                    json.put("int_CIP", t.getIntCIP());
                    json.put("int_PAF", t.getIntPAF());
                    json.put("int_PAT", t.getIntPAT());
                    json.put("int_EAN13", t.getIntEAN13());
                    json.put("int_S", t.getIntS());
                    json.put("int_T", t.getIntT());
                    json.put("bool_ACCOUNT", (t.getBoolACCOUNT() != true));

                    int int_NUMBER_AVAILABLE = OSnapshotManager.getStock(t.getLgFAMILLEID(), emp.getLgEMPLACEMENTID());
                    json.put("int_NUMBER", int_NUMBER_AVAILABLE);
                    json.put("int_NUMBER_AVAILABLE", int_NUMBER_AVAILABLE);
                    json.put("str_STATUT", t.getStrSTATUT());

                } catch (Exception e) {

                }
                jsonarray.put(json);
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
        return jsonarray;
    }

    public boolean updateFamille(String lg_FAMILLE_ID, boolean enabled) {
        boolean isEnabled = false;
        try {
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            if (OTFamille != null) {
                OTFamille.setBoolACCOUNT(enabled);
                if (this.merge(OTFamille)) {
                    isEnabled = true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isEnabled;
    }

    public int allCount(String search_value, TEmplacement emp) {

        String lg_EMPLACEMENT_ID = "";
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        EntityManager em = null;
        try {
            em = this.getOdataManager().getEm();
            lg_EMPLACEMENT_ID = emp.getLgEMPLACEMENTID();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TTypeStockFamille> j = root.join("tTypeStockFamilleCollection", JoinType.INNER);
            Join<TFamille, TFamilleStock> fs = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TFamilleGrossiste> fg = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            cq.select(cb.countDistinct(root));
            Predicate p = cb.conjunction();

            if (!"".equals(search_value)) {
                p = cb.and(p,
                        cb.or(cb.like(root.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(root.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(root.get(TFamille_.intEAN13), search_value + "%"),
                                cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search_value + "%")));
            }
            String lg_TYPE_STOCK_ID = "1";
            if (!"1".equals(emp.getLgEMPLACEMENTID())) {
                lg_TYPE_STOCK_ID = "3";
            }
            p = cb.and(p, cb.equal(root.get(TFamille_.strSTATUT), commonparameter.statut_enable));
            p = cb.and(p, cb.equal(j.get("lgTYPESTOCKID").get("lgTYPESTOCKID"), lg_TYPE_STOCK_ID));
            p = cb.and(p, cb.equal(fs.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lg_EMPLACEMENT_ID));

            cq.where(p);
            Query q = em.createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();

        } finally {
            if (em != null) {

            }
        }

    }

    public TFamilleStock createStock(TFamille OTFamille, int int_NUMBER, TEmplacement OTEmplacement) {
        try {

            new logger().OCategory.info("Dans le createFamilleStock " + OTFamille);
            TFamilleStock OTFamilleStock = new TFamilleStock();
            OTFamilleStock.setLgFAMILLESTOCKID(this.getKey().getComplexId());
            OTFamilleStock.setIntNUMBER(int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(int_NUMBER);
            OTFamilleStock.setLgEMPLACEMENTID(OTEmplacement);
            OTFamilleStock.setLgFAMILLEID(OTFamille);
            OTFamilleStock.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleStock.setDtCREATED(new Date());
            OTFamilleStock.setLgEMPLACEMENTID(OTEmplacement);
            this.getOdataManager().getEm().persist(OTFamilleStock);
            new logger().OCategory.info("Id famille stock généré " + OTFamilleStock.getLgFAMILLESTOCKID());
            return OTFamilleStock;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }

    public boolean createFamilleZoneGeog(TFamille OTFamille, TZoneGeographique OTZoneGeographique,
            TEmplacement OTEmplacement) {
        boolean result = false;
        TFamilleZonegeo OTFamilleZonegeo = null;
        try {
            OTFamilleZonegeo = this.getTFamilleZonegeo(OTFamille.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            if (OTFamilleZonegeo == null) {
                OTFamilleZonegeo = new TFamilleZonegeo();
                OTFamilleZonegeo.setLgFAMILLEZONEGEOID(this.getKey().getComplexId());
                OTFamilleZonegeo.setLgEMPLACEMENTID(OTEmplacement);
                OTFamilleZonegeo.setLgFAMILLEID(OTFamille);
                OTFamilleZonegeo.setDtCREATED(new Date());
                OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                OTFamilleZonegeo.setDtUPDATED(new Date());
                OTFamilleZonegeo.setStrSTATUT(commonparameter.statut_enable);
                this.getOdataManager().getEm().persist(OTFamilleZonegeo);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;

            } else {
                if (!OTFamilleZonegeo.getLgZONEGEOID().equals(OTZoneGeographique)) {
                    OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                    OTFamilleZonegeo.setDtUPDATED(new Date());
                    this.getOdataManager().getEm().merge(OTFamilleZonegeo);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public TFamille createProduct(String str_NAME, String str_DESCRIPTION, int int_PRICE, int int_PRICE_TIPS,
            int int_TAUX_MARQUE, int int_PAF, int int_PAT, int int_S, String int_T, String int_CIP, String int_EAN13,
            String lg_GROSSISTE_ID, String lg_FAMILLEARTICLE_ID, String lg_CODE_ACTE_ID, String lg_CODE_GESTION_ID,
            String str_CODE_REMISE, String str_CODE_TAUX_REMBOURSEMENT, String lg_ZONE_GEO_ID, int int_NUMBER_AVAILABLE,
            int int_QTEDETAIL, String lg_FORME_ARTICLE_ID, String lg_FABRIQUANT_ID, short bool_DECONDITIONNE,
            String lg_TYPEETIQUETTE_ID, String lg_REMISE_ID, String lg_CODE_TVA_ID, boolean bool_RESERVE,
            int int_SEUIL_RESERVE, String lg_FAMILLE_PARENT_ID, int int_STOCK_REAPROVISONEMENT,
            int int_QTE_REAPPROVISIONNEMENT, int int_QUANTITY_STOCK, String dt_Peremtion, String gammeId,
            String laboratoireId, Integer cmuPrice) {
        TFamille OTFamille = null;
        TParameters OParameters, OParametersPerime;
        String lg_TYPE_STOCK_RESERVE_ID = "2";
        short bool_DECONDITIONNE_EXIST = 1;
        int int_TAUX = 0;
        TCodeGestion OTCodeGestion;
        TTypeetiquette OTTypeetiquette;
        TFamillearticle OTFamillearticle;
        TZoneGeographique OTZoneGeographique;
        TCodeActe OTCodeActe;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        grossisteManagement OgrossisteManagement = new grossisteManagement(this.getOdataManager());
        EntityManager em = this.getOdataManager().getEm();
        try {

            if (int_CIP.length() < 6) {
                this.buildErrorTraceMessage("Le code CIP doit avoir au minimum 6 caractères");
                return null;
            }
            int_CIP = this.generateCIP(int_CIP);
            if (this.isCIPExist(int_CIP)) {
                return null;
            }
            OTFamille = new TFamille();
            OParameters = OTparameterManager.getParameter(Parameter.KEY_TAUX_CODE_TABLEAU);
            if (OParameters != null) {
                int_TAUX = Integer.parseInt(OParameters.getStrVALUE());
            }
            OTFamille.setLgFAMILLEID(this.getKey().getComplexId());
            try {
                OTCodeActe = (TCodeActe) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TCodeActe t WHERE t.lgCODEACTEID LIKE ?1 OR t.strLIBELLEE LIKE ?2")
                        .setParameter(1, lg_CODE_ACTE_ID).setParameter(2, lg_CODE_ACTE_ID).getSingleResult();
                OTFamille.setLgCODEACTEID(OTCodeActe);
            } catch (Exception e) {
                // e.printStackTrace();
            }

            OTFamillearticle = this.getTFamillearticle(lg_FAMILLEARTICLE_ID);
            if (OTFamillearticle == null) {
                OTFamillearticle = this.getTFamillearticle(Parameter.DEFAUL_FAMILLEARTICE);
            }
            OTFamille.setLgFAMILLEARTICLEID(OTFamillearticle);

            OTZoneGeographique = this.getTZoneGeographique(lg_ZONE_GEO_ID);
            if (OTZoneGeographique == null) {
                OTZoneGeographique = this.getTZoneGeographique(Parameter.DEFAUL_ZONE_GEOGRAPHIQUE);
            }
            OTFamille.setLgZONEGEOID(OTZoneGeographique);

            OTCodeGestion = this.getTCodeGestion(lg_CODE_GESTION_ID);
            if (OTCodeGestion != null) {
                OTFamille.setLgCODEGESTIONID(OTCodeGestion);
            }

            OTTypeetiquette = this.getTTypeetiquette(lg_TYPEETIQUETTE_ID);
            if (OTTypeetiquette == null) {
                OTTypeetiquette = this.getTTypeetiquette(Parameter.DEFAUL_TYPEETIQUETTE);
            }
            OTFamille.setLgTYPEETIQUETTEID(OTTypeetiquette);

            TGrossiste OTGrossiste = OgrossisteManagement.getGrossiste(lg_GROSSISTE_ID);
            if (OTGrossiste == null) {
                OTGrossiste = OgrossisteManagement.getGrossiste(Parameter.DEFAUL_GROSSISTE);
            }
            OTFamille.setLgGROSSISTEID(OTGrossiste);
            try {
                TFormeArticle OTFormeArticle = (TFormeArticle) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFormeArticle t WHERE t.lgFORMEARTICLEID LIKE ?1 OR t.strLIBELLE LIKE ?2")
                        .setParameter(1, lg_FORME_ARTICLE_ID).setParameter(2, lg_FORME_ARTICLE_ID).getSingleResult();
                OTFamille.setLgFORMEID(OTFormeArticle);
            } catch (Exception e) {
            }

            try {
                TFabriquant OTFabriquant = (TFabriquant) this.getOdataManager().getEm().createQuery(
                        "SELECT t FROM TFabriquant t WHERE t.lgFABRIQUANTID LIKE ?1 OR t.strDESCRIPTION LIKE ?2 OR t.strCODE LIKE ?2")
                        .setParameter(1, lg_FABRIQUANT_ID).setParameter(2, lg_FABRIQUANT_ID).getSingleResult();
                OTFamille.setLgFABRIQUANTID(OTFabriquant);
            } catch (Exception e) {
            }
            em.getTransaction().begin();

            try {
                Laboratoire laboratoire = em.find(Laboratoire.class, laboratoireId);
                OTFamille.setLaboratoire(laboratoire);

            } catch (Exception e) {
                e.printStackTrace();
            }
            try {
                GammeProduit gammeProduit = em.find(GammeProduit.class, gammeId);
                OTFamille.setGamme(gammeProduit);

            } catch (Exception e) {
                e.printStackTrace();
            }

            OTFamille.setIntCIP(int_CIP);
            OTFamille.setIntEAN13(int_EAN13);
            OTFamille.setIntNUMBERDETAIL(int_QTEDETAIL);
            OTFamille.setBoolRESERVE(bool_RESERVE);
            OTFamille.setIntSEUILRESERVE(int_SEUIL_RESERVE);
            OTFamille.setBoolACCOUNT(true);
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setIntT(int_T);
            OTFamille.setIntS(int_S);
            OTFamille.setScheduled(false);
            OTFamille.setCmuPrice(cmuPrice);
            OTFamille.setIntPRICE((!int_T.equalsIgnoreCase("") && lg_FAMILLE_PARENT_ID.equalsIgnoreCase("")
                    ? int_PRICE + int_TAUX : int_PRICE));
            OTFamille.setIntPRICETIPS(OTFamille.getIntPRICETIPS());
            OTFamille.setIntTAUXMARQUE(int_TAUX_MARQUE);
            if (!"".equals(dt_Peremtion)) {
                OTFamille.setDtPEREMPTION(java.sql.Date.valueOf(dt_Peremtion));
            }
            // OTFamille.setStrCODEETIQUETTE(str_CODE_ETIQUETTE);
            OTFamille.setStrCODEREMISE(str_CODE_REMISE);
            TCodeTva OTCodeTva;
            try {
                OTCodeTva = this.getCodeTva(lg_CODE_TVA_ID);
                if (OTCodeTva == null) {
                    OTCodeTva = this.getCodeTva(Parameter.DEFAUL_CODE_TVA);
                }
                OTFamille.setLgCODETVAID(OTCodeTva);

            } catch (Exception e) {
                e.printStackTrace();
            }

            OTFamille.setStrCODETAUXREMBOURSEMENT(str_CODE_TAUX_REMBOURSEMENT);
            OTFamille.setStrDESCRIPTION(str_DESCRIPTION.toUpperCase());
            OTFamille.setStrNAME(str_NAME.toUpperCase());
            OTFamille.setIntSTOCKREAPROVISONEMENT(int_STOCK_REAPROVISONEMENT);
            OTFamille.setIntSEUILMIN(OTFamille.getIntSTOCKREAPROVISONEMENT());
            OTFamille.setIntQTEREAPPROVISIONNEMENT(int_QTE_REAPPROVISIONNEMENT);
            OTFamille.setIntSEUILMAX(int_NUMBER_AVAILABLE);
            OTFamille.setStrSTATUT(commonparameter.statut_enable);
            OTFamille.setDtCREATED(new Date());
            OTFamille.setLgFAMILLEPARENTID(lg_FAMILLE_PARENT_ID);

            OTFamille.setBoolDECONDITIONNE(bool_DECONDITIONNE);
            new logger().OCategory.info("bool_DECONDITIONNE article " + OTFamille.getBoolDECONDITIONNE());
            if (OTFamille.getBoolDECONDITIONNE() == 1) {
                OTFamille.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE_EXIST);
            } else {
                bool_DECONDITIONNE_EXIST = 0;
                OTFamille.setBoolDECONDITIONNEEXIST(bool_DECONDITIONNE_EXIST);
            }

            // code ajouté 28/06/2016
            OParametersPerime = OTparameterManager.getParameter(Parameter.KEY_ACTIVATE_PEREMPTION_DATE);
            OTFamille.setBoolCHECKEXPIRATIONDATE(
                    OParametersPerime != null && Integer.parseInt(OParametersPerime.getStrVALUE()) == 1 ? true : false);
            // fin code ajouté 28/06/2016
            em.persist(OTFamille);
            new familleGrossisteManagement(this.getOdataManager()).createProduct(OTFamille.getLgGROSSISTEID(),
                    OTFamille, OTFamille.getIntCIP(), OTFamille.getIntPRICE(), OTFamille.getIntPAF());
            this.createProductStock(OTFamille, int_QUANTITY_STOCK, this.getOTUser().getLgEMPLACEMENTID(), em);
            this.createFamilleZoneGeo(OTFamille, OTZoneGeographique, this.getOTUser().getLgEMPLACEMENTID(), em);

            this.createTypeStockFamille(OTFamille.getLgFAMILLEID(), "1", int_QUANTITY_STOCK,
                    this.getOTUser().getLgEMPLACEMENTID(), em);

            CategorieNotification categorieNotification = em.find(CategorieNotification.class,
                    TypeNotification.AJOUT_DE_NOUVEAU_PRODUIT.ordinal());
            Notification notification = new Notification();
            notification.setCategorieNotification(categorieNotification);
            notification.setUser(this.getOTUser());
            Map<String, Object> donneesMap = new HashMap<>();
            donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.AJOUT_DE_NOUVEAU_PRODUIT.getValue());
            donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            donneesMap.put(NotificationUtils.ITEM_KEY.getId(), OTFamille.getIntCIP());
            donneesMap.put(NotificationUtils.ITEM_DESC.getId(), OTFamille.getStrNAME());
            notification.donnees(buildDonnees(donneesMap));
            notification.setMessage("");
            notification.entityRef(OTFamille.getLgFAMILLEID());
            em.persist(notification);

            TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
            eventLog.setLgUSERID(notification.getUser());
            eventLog.setDtCREATED(new Date());
            eventLog.setDtUPDATED(eventLog.getDtCREATED());
            eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
            eventLog.setStrTABLECONCERN(OTFamille.getClass().getName());
            eventLog.setTypeLog(TypeLog.AJOUT_DE_NOUVEAU_PRODUIT);
            eventLog.setStrDESCRIPTION("Création du produit " + " cip [" + OTFamille.getIntCIP() + " "
                    + OTFamille.getStrNAME() + " par " + notification.getUser().getStrFIRSTNAME().concat(" ")
                            .concat(notification.getUser().getStrLASTNAME())
                    + " ]");

            em.persist(eventLog);

            if (bool_RESERVE) {
                //
                TTypeStockFamille OTTypeStockFamille = this.createTypeStockFamille(OTFamille.getLgFAMILLEID(),
                        lg_TYPE_STOCK_RESERVE_ID, 0, this.getOTUser().getLgEMPLACEMENTID(), em);
                if (OTTypeStockFamille != null) {
                    OTFamille.setIntSEUILRESERVE(int_SEUIL_RESERVE);
                    em.merge(OTFamille);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                }
            } else {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }
            em.getTransaction().commit();

            new logger().OCategory.info(this.getDetailmessage());
            // on verifie si l'on veut que ce produit soit deconditionnable
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
                em.clear();

            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer cet article");
            this.delete(OTFamille);
        }
        return OTFamille;
    }

    String buildDonnees(Map<String, Object> donneesMap) {
        if (MapUtils.isEmpty(donneesMap)) {
            return null;
        }
        JSONObject json = new JSONObject();
        donneesMap.forEach(json::put);
        return json.toString();
    }

    public TTypeStockFamille createTypeStockFamille(String lg_FAMILLE_ID, String lg_TYPE_STOCK_ID, int int_NUMBER,
            TEmplacement OTEmplacement, EntityManager em) {
        // boolean result = false;
        TTypeStockFamille OTTypeStockFamille = null;
        try {
            OTTypeStockFamille = new TTypeStockFamille();
            TTypeStock OTTypeStock = em.find(TTypeStock.class, lg_TYPE_STOCK_ID);
            TFamille OTFamille = em.find(TFamille.class, lg_FAMILLE_ID);
            OTTypeStockFamille.setLgTYPESTOCKFAMILLEID(this.getKey().getComplexId());
            OTTypeStockFamille.setLgFAMILLEID(OTFamille);
            OTTypeStockFamille.setLgTYPESTOCKID(OTTypeStock);
            OTTypeStockFamille.setStrNAME(OTFamille.getStrDESCRIPTION() + " " + OTTypeStock.getStrDESCRIPTION());
            OTTypeStockFamille.setStrDESCRIPTION(OTTypeStockFamille.getStrNAME());
            OTTypeStockFamille.setIntNUMBER(int_NUMBER);
            OTTypeStockFamille.setDtCREATED(new Date());
            OTTypeStockFamille.setLgEMPLACEMENTID(OTEmplacement);
            OTTypeStockFamille.setStrSTATUT(commonparameter.statut_enable);
            em.persist(OTTypeStockFamille);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de creation de type stock");
        }
        new logger().OCategory.info("result " + this.getDetailmessage());
        return OTTypeStockFamille;
    }

    public TFamilleStock createProductStock(TFamille OTFamille, int int_NUMBER, TEmplacement OTEmplacement,
            EntityManager em) {

        try {

            new logger().OCategory.info("Dans le createFamilleStock " + OTFamille.getStrDESCRIPTION() + " id "
                    + OTFamille.getLgFAMILLEID());
            TFamilleStock OTFamilleStock = new TFamilleStock();
            OTFamilleStock.setLgFAMILLESTOCKID(this.getKey().getComplexId());
            OTFamilleStock.setIntNUMBER(int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(int_NUMBER);
            OTFamilleStock.setLgEMPLACEMENTID(OTEmplacement);
            OTFamilleStock.setLgFAMILLEID(OTFamille);
            OTFamilleStock.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleStock.setDtCREATED(new Date());
            OTFamilleStock.setLgEMPLACEMENTID(OTEmplacement);
            em.persist(OTFamilleStock);
            new logger().OCategory.info("Id famille stock généré " + OTFamilleStock.getLgFAMILLESTOCKID());
            return OTFamilleStock;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }

    public boolean createFamilleZoneGeo(TFamille OTFamille, TZoneGeographique OTZoneGeographique,
            TEmplacement OTEmplacement, EntityManager em) {
        boolean result = false;
        TFamilleZonegeo OTFamilleZonegeo = null;
        try {
            OTFamilleZonegeo = this.getTFamilleZonegeo(OTFamille.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            if (OTFamilleZonegeo == null) {
                OTFamilleZonegeo = new TFamilleZonegeo();
                OTFamilleZonegeo.setLgFAMILLEZONEGEOID(this.getKey().getComplexId());
                OTFamilleZonegeo.setLgEMPLACEMENTID(OTEmplacement);
                OTFamilleZonegeo.setLgFAMILLEID(OTFamille);
                OTFamilleZonegeo.setDtCREATED(new Date());
                OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                OTFamilleZonegeo.setDtUPDATED(new Date());
                OTFamilleZonegeo.setStrSTATUT(commonparameter.statut_enable);
                em.persist(OTFamilleZonegeo);
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;

            } else {
                if (!OTFamilleZonegeo.getLgZONEGEOID().equals(OTZoneGeographique)) {
                    OTFamilleZonegeo.setLgZONEGEOID(OTZoneGeographique);
                    OTFamilleZonegeo.setDtUPDATED(new Date());
                    em.merge(OTFamilleZonegeo);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;

                } else {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                }
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de pris en l'emplacement pour ce produit");
            e.printStackTrace();
        }
        return result;
    }

}
