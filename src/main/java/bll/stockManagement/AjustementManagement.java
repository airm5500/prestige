/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stockManagement;

import bll.bllBase;
import bll.commandeManagement.suggestionManagement;
import bll.common.Parameter;
import bll.teller.SnapshotManager;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TUser;
import dal.dataManager;
import dal.TAjustement;
import dal.TAjustementDetail;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class AjustementManagement extends bllBase {

    private StockManager OStockManager;
    private SnapshotManager OSnapshotManager;

    public AjustementManagement(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public AjustementManagement(dataManager OdataManager, TUser OTuser, StockManager OStockManager,
            SnapshotManager OSnapshotManager) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
        this.OStockManager = OStockManager;
        this.OSnapshotManager = OSnapshotManager;
    }

    public AjustementManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public TAjustement createAjustement(String str_COMMENTAIRE, String lg_FAMILLE_ID, int int_QUANTITY) {
        String str_NAME;
        try {
            // StockManager _OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
            // String lg_TYPE_STOCK_ID = "1";
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);

            // if
            // (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS))
            // {
            // lg_TYPE_STOCK_ID = "3";
            // }
            // TTypeStock OTypeStock = _OStockManager.getTTypeStock(lg_TYPE_STOCK_ID);
            //
            TFamilleStock familleStock = getFamilleStock(OTFamille.getLgFAMILLEID());
            str_NAME = "Ajustement du " + this.getKey().DateToString(new Date(), this.getKey().formatterShort);
            this.getOdataManager().getEm().getTransaction().begin();
            TAjustement OTAjustement = new TAjustement();
            OTAjustement.setLgAJUSTEMENTID(this.getKey().getComplexId());
            OTAjustement.setLgUSERID(this.getOTUser());
            OTAjustement.setStrNAME(str_NAME);
            OTAjustement.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTAjustement.setDtCREATED(new Date());
            OTAjustement.setStrSTATUT(commonparameter.statut_is_Process);
            this.getOdataManager().getEm().persist(OTAjustement);
            this.createAjustementDetail(OTAjustement, OTFamille, int_QUANTITY, familleStock);
            this.getOdataManager().getEm().getTransaction().commit();
            this.getOdataManager().getEm().clear();
            // this.getOdataManager().getEm().close();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTAjustement;
        } catch (Exception e) {
            this.getOdataManager().getEm().getTransaction().rollback();
            this.getOdataManager().getEm().clear();
            // this.getOdataManager().getEm().close();
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de l'ajustement");
            return null;
        }
    }
    // fin creation de ajustement

    // mise a jour ajustement
    public TAjustement updateAjustement(String lg_AJUSTEMENT_ID, String str_COMMENTAIRE) {
        try {
            TAjustement OTAjustement = this.getAjustement(lg_AJUSTEMENT_ID);
            OTAjustement.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTAjustement.setStrSTATUT(commonparameter.statut_is_Process);
            OTAjustement.setDtUPDATED(new Date());
            // OTAjustement.setLgUSERID(this.getOTUser());
            this.merge(OTAjustement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTAjustement;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour");
            return null;
        }
    }
    // fin mise a jour ajustement

    // suppression d'une ajustement
    public boolean removeAjustement(String lg_AJUSTEMENT_ID) {
        boolean result = false;
        int i = 0;
        List<TAjustementDetail> lstTAjustementDetail = new ArrayList<>();
        try {

            TAjustement OTAjustement = this.getAjustement(lg_AJUSTEMENT_ID);

            lstTAjustementDetail = this.SearchAllOrOneAjustementDetail("", OTAjustement.getLgAJUSTEMENTID(), "%%",
                    "%%");
            for (TAjustementDetail OTAjustementDetail : lstTAjustementDetail) {
                if (this.RemoveAjustementDetail(OTAjustementDetail)) {
                    i++;
                }
            }
            new logger().OCategory
                    .info("Valeur i : " + i + " lstTAjustementDetail size " + lstTAjustementDetail.size());
            if (i == lstTAjustementDetail.size()) {
                OTAjustement.setStrSTATUT(commonparameter.statut_delete);
                this.persiste(OTAjustement);
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression");
        }
        return result;
    }
    // fin suppression d'un ajustement

    // Liste des ajustements
    public List<TAjustement> SearchAllOrOneAjustement(String lg_AJUSTEMENT_ID, String lg_USER_ID, Date dtDEBUT,
            Date dtFin) {
        List<TAjustement> lstTAjustement = new ArrayList<TAjustement>();
        String lg_EMPLACEMENT_ID = "";
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            lstTAjustement = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAjustement t WHERE t.lgAJUSTEMENTID LIKE ?1 AND t.strSTATUT = ?2 AND t.lgUSERID.lgUSERID LIKE ?3 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 AND (t.dtCREATED >= ?5 AND t.dtCREATED <=?6)  ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_AJUSTEMENT_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, lg_USER_ID).setParameter(4, lg_EMPLACEMENT_ID).setParameter(5, dtDEBUT)
                    .setParameter(6, dtFin).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTAjustement taille " + lstTAjustement.size());
        return lstTAjustement;
    }
    // fin Liste des ajustements

    // Liste des ajustements detail
    public List<TAjustementDetail> SearchAllOrOneAjustementDetail(String search_value, String lg_AJUSTEMENT_ID,
            String lg_USER_ID, String lg_FAMILLE_ID) {
        List<TAjustementDetail> lstTAjustementDetail = new ArrayList<TAjustementDetail>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTAjustementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAjustementDetail t WHERE t.lgAJUSTEMENTID.lgAJUSTEMENTID LIKE ?1 AND t.strSTATUT NOT LIKE ?2 AND t.lgAJUSTEMENTID.lgUSERID.lgUSERID LIKE ?3 AND t.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID = ?4 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?5 AND (t.lgFAMILLEID.strNAME LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(1, lg_AJUSTEMENT_ID).setParameter(2, commonparameter.statut_delete)
                    .setParameter(3, lg_USER_ID)
                    .setParameter(4, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(5, lg_FAMILLE_ID).setParameter(6, search_value + "%").getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        // new logger().OCategory.info("lstTAjustementDetail taille " + lstTAjustementDetail.size());
        return lstTAjustementDetail;
    }

    public List<TAjustementDetail> SearchAllOrOneAjustementDetail(String search_value, String lg_AJUSTEMENT_ID,
            String lg_USER_ID, String lg_FAMILLE_ID, int start, int limit) {
        List<TAjustementDetail> lstTAjustementDetail = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTAjustementDetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAjustementDetail t WHERE t.lgAJUSTEMENTID.lgAJUSTEMENTID LIKE ?1 AND t.strSTATUT NOT LIKE ?2 AND t.lgAJUSTEMENTID.lgUSERID.lgUSERID LIKE ?3 AND t.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID = ?4 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?5 AND (t.lgFAMILLEID.strNAME LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(1, lg_AJUSTEMENT_ID).setParameter(2, commonparameter.statut_delete)
                    .setParameter(3, lg_USER_ID)
                    .setParameter(4, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(5, lg_FAMILLE_ID).setParameter(6, search_value + "%").setFirstResult(start)
                    .setMaxResults(limit).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        // new logger().OCategory.info("lstTAjustementDetail taille " + lstTAjustementDetail.size());
        return lstTAjustementDetail;
    }
    // fin Liste des ajustements detail

    // suppression d'un ajustement detail
    public boolean RemoveAjustementDetail(TAjustementDetail OTAjustementDetail) {
        boolean result = false;
        try {
            OTAjustementDetail.setDtUPDATED(new Date());
            OTAjustementDetail.setStrSTATUT(commonparameter.statut_delete);
            this.persiste(OTAjustementDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin suppression d'un ajustement detail

    // recuperation d'un ajustement
    public TAjustement getAjustement(String lg_AJUSTEMENT_ID) {
        TAjustement OTAjustement = null;
        try {
            new logger().OCategory.info("lg_AJUSTEMENT_ID getAjustement " + lg_AJUSTEMENT_ID);
            OTAjustement = (TAjustement) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TAjustement t WHERE t.lgAJUSTEMENTID = ?1")
                    .setParameter(1, lg_AJUSTEMENT_ID).getSingleResult();
            new logger().OCategory.info("Ajustement " + OTAjustement.getStrNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTAjustement;
    }
    // fin recuperation d'un ajustement

    // clotruer une ajustement
    /*
     * public boolean closureAjustement(String lg_AJUSTEMENT_ID, String str_COMMENTAIRE) { // a decommenter en cas de
     * probleme 10/11/2016 boolean result = false; List<TAjustementDetail> lstTAjustementDetail = new
     * ArrayList<TAjustementDetail>(); int i = 0; try { TAjustement OTAjustement = this.getAjustement(lg_AJUSTEMENT_ID);
     * lstTAjustementDetail = this.SearchAllOrOneAjustementDetail("", OTAjustement.getLgAJUSTEMENTID(), "%%", "%%"); for
     * (TAjustementDetail OTAjustementDetail : lstTAjustementDetail) { if
     * (this.ClosureAjustementDetail(OTAjustementDetail)) { i++; } } new logger().OCategory.info("Valeur i " + i +
     * " lstTAjustementDetail size " + lstTAjustementDetail.size()); if (i == lstTAjustementDetail.size()) {
     * OTAjustement.setStrSTATUT(commonparameter.statut_enable); OTAjustement.setStrCOMMENTAIRE(str_COMMENTAIRE);
     * OTAjustement.setDtUPDATED(new Date()); this.persiste(OTAjustement); //Ajout du code de traçage
     * this.do_event_log(commonparameter.ALL, OTAjustement.getStrNAME(), this.getOTUser().getStrFIRSTNAME() + " " +
     * this.getOTUser().getStrLASTNAME(), commonparameter.statut_enable, "TAjustement", "Ajustement de stock", "");
     * //fin du code de traçage this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); result = true; }
     *
     * } catch (Exception e) { e.printStackTrace(); this.buildErrorTraceMessage("Echec de clotûre de la ajustement"); }
     * return result; }
     */
    public boolean closureAjustement(String lg_AJUSTEMENT_ID, String str_COMMENTAIRE) {
        boolean result = false;
        List<TAjustementDetail> lstTAjustementDetail;
        List<TFamilleStock> lstTFamilleStock = new ArrayList<>();
        TFamilleStock OTFamilleStock;
        suggestionManagement OsuggestionManagement = new suggestionManagement(this.getOdataManager(), this.getOTUser());
        try {
            TAjustement OTAjustement = this.getAjustement(lg_AJUSTEMENT_ID);
            lstTAjustementDetail = this.SearchAllOrOneAjustementDetail("", OTAjustement.getLgAJUSTEMENTID(), "%%",
                    "%%");
            for (TAjustementDetail OTAjustementDetail : lstTAjustementDetail) {
                OTFamilleStock = this.ClosureAjustementDetail(OTAjustementDetail);
                if (OTFamilleStock == null) {
                    this.buildErrorTraceMessage("Echec de clôture de l'ajustement. Veuillez réessayer svp!");
                    return result;
                }
                if (((OTFamilleStock.getIntNUMBERAVAILABLE() + OTAjustementDetail.getIntNUMBER()) <= OTFamilleStock
                        .getLgFAMILLEID().getIntSEUILMIN())
                        && OTFamilleStock.getLgFAMILLEID().getBoolDECONDITIONNE() == 0) {
                    lstTFamilleStock.add(OTFamilleStock);
                }
            }
            OTAjustement.setStrSTATUT(commonparameter.statut_enable);
            OTAjustement.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTAjustement.setDtUPDATED(new Date());
            this.merge(OTAjustement);

            lstTFamilleStock.forEach((OFamilleStock) -> {
                OsuggestionManagement.makeSuggestionAuto(OFamilleStock);
            });

            // Ajout du code de traçage
            this.do_event_log(commonparameter.ALL, OTAjustement.getStrNAME(),
                    this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                    commonparameter.statut_enable, "TAjustement", "Ajustement de stock", "Ajustement",
                    this.getOTUser().getLgUSERID());
            // fin du code de traçage
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clotûre de la ajustement");
        }
        return result;
    }

    // fin cloturer une ajustement
    // cloture une ligne d'un ajustement
    /*
     * public boolean ClosureAjustementDetail(TAjustementDetail OTAjustementDetail) { // a decommenter en cas de
     * probleme 10/11/2016 boolean result = false;
     *
     * try { OTAjustementDetail.setDtUPDATED(new Date());
     * OTAjustementDetail.setStrSTATUT(commonparameter.statut_enable);
     * OTAjustementDetail.setIntNUMBERAFTERSTOCK(OTAjustementDetail.getIntNUMBERCURRENTSTOCK() +
     * OTAjustementDetail.getIntNUMBER()); this.persiste(OTAjustementDetail); result = new
     * StockManager(this.getOdataManager(),
     * this.getOTUser()).UpdateStockByAjustement(OTAjustementDetail.getLgFAMILLEID(),
     * OTAjustementDetail.getIntNUMBER()); if (result) { TFamilleStock OTProductItemStock = new
     * tellerManagement(this.getOdataManager(),
     * this.getOTUser()).getTProductItemStock(OTAjustementDetail.getLgFAMILLEID()); new
     * suggestionManagement(this.getOdataManager()).makeSuggestionAuto(OTProductItemStock);
     * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); }
     *
     * } catch (Exception e) { e.printStackTrace(); } return result; }
     */
    public TFamilleStock ClosureAjustementDetail(TAjustementDetail OTAjustementDetail) {
        TFamilleStock OTProductItemStock;
        try {
            OTAjustementDetail.setDtUPDATED(new Date());
            OTAjustementDetail.setStrSTATUT(commonparameter.statut_enable);
            OTAjustementDetail.setIntNUMBERAFTERSTOCK(
                    OTAjustementDetail.getIntNUMBERCURRENTSTOCK() + OTAjustementDetail.getIntNUMBER());
            this.getOdataManager().getEm().merge(OTAjustementDetail);
            OTProductItemStock = this.UpdateStockByAjustement(OTAjustementDetail.getLgFAMILLEID(),
                    OTAjustementDetail.getIntNUMBER());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTProductItemStock;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }
    // fin cloture une ligne d'un ajustement

    // mise a jour du stock par un ajustement
    public TFamilleStock UpdateStockByAjustement(TFamille OTFamille, int int_NUMBER) {
        TFamilleStock OTFamilleStock = null;
        // String str_TYPE_ACTION ;
        // int int_NUMBER_STOCK_DEBUT = 0;
        try {
            // if (int_NUMBER < 0) {
            // str_TYPE_ACTION = commonparameter.REMOVE;
            // int_NUMBER_STOCK = -1 * int_NUMBER;
            // } else {
            //// str_TYPE_ACTION = commonparameter.ADD;
            // int_NUMBER_STOCK = int_NUMBER; ///
            // }
            OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser()).getTProductItemStock(
                    OTFamille.getLgFAMILLEID(), this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            int int_NUMBER_STOCK_DEBUT = OTFamilleStock.getIntNUMBERAVAILABLE();
            OTFamilleStock.setDtUPDATED(new Date());
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());

            if (OSnapshotManager.createSnapshotMouvementArticleAjustement(OTFamille, int_NUMBER, int_NUMBER_STOCK_DEBUT,
                    commonparameter.str_ACTION_AJUSTEMENT, this.getOTUser().getLgEMPLACEMENTID()) != null) {
                this.getOdataManager().getEm().merge(OTFamilleStock);

            }
            return OTFamilleStock;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }
    // fin mise a jour du stock par un ajustement

    // recuperation d'un ajustement detail
    public TAjustementDetail getAjustementDetail(String lg_AJUSTEMENT_ID, String lg_FAMILLE_ID) {
        TAjustementDetail OTAjustementDetail = null;
        try {
            OTAjustementDetail = (TAjustementDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAjustementDetail t WHERE t.lgAJUSTEMENTID.lgAJUSTEMENTID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.strSTATUT <> ?3")
                    .setParameter(1, lg_AJUSTEMENT_ID).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, commonparameter.statut_delete).getSingleResult();
            // new logger().OCategory.info("Quantité " + OTAjustementDetail.getIntNUMBER());
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTAjustementDetail;
    }

    public TAjustementDetail getAjustementDetail(String lg_AJUSTEMENTDETAIL_ID) {
        TAjustementDetail OTAjustementDetail = null;
        try {
            OTAjustementDetail = (TAjustementDetail) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TAjustementDetail t WHERE t.lgAJUSTEMENTDETAILID = ?1")
                    .setParameter(1, lg_AJUSTEMENTDETAIL_ID).getSingleResult();
            new logger().OCategory.info("Quantité " + OTAjustementDetail.getIntNUMBER());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTAjustementDetail;
    }
    // fin recuperation d'un ajustement detail

    // creation d'un ajustement detail
    public TAjustementDetail createOrUpdateAjustementDetail(String lg_AJUSTEMENT_ID, String lg_FAMILLE_ID,
            int int_NUMBER) {
        TAjustementDetail OTAjustementDetail = null;
        try {

            OTAjustementDetail = this.getAjustementDetail(lg_AJUSTEMENT_ID, lg_FAMILLE_ID);
            if (OTAjustementDetail != null) {
                this.getOdataManager().getEm().getTransaction().begin();
                OTAjustementDetail = this.UpdateAjustementDetail(OTAjustementDetail, int_NUMBER);
            } else {
                // StockManager _OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
                // String lg_TYPE_STOCK_ID = "1";
                TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
                TAjustement oAjustement = this.getOdataManager().getEm().find(TAjustement.class, lg_AJUSTEMENT_ID);
                // if
                // (!this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS))
                // {
                // lg_TYPE_STOCK_ID = "3";
                // }
                // TTypeStock OTypeStock = _OStockManager.getTTypeStock(lg_TYPE_STOCK_ID);
                //
                TFamilleStock familleStock = getFamilleStock(OTFamille.getLgFAMILLEID());
                this.getOdataManager().getEm().getTransaction().begin();
                createAjustementDetail(oAjustement, OTFamille, int_NUMBER, familleStock);
            }
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                this.getOdataManager().getEm().clear();
                // this.getOdataManager().getEm().close();

            }
        } catch (Exception e) {
            this.getOdataManager().getEm().getTransaction().rollback();
            this.getOdataManager().getEm().clear();
            // this.getOdataManager().getEm().close();
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de la prise en compte de l'ajustement de cet article");
        }
        return OTAjustementDetail;
    }

    public TAjustementDetail createAjustementDetail(TAjustement OTAjustement, TFamille OTFamille, int int_NUMBER,
            TFamilleStock familleStock) {
        TAjustementDetail OTAjustementDetail = null;

        try {

            int int_QUANTITY = familleStock.getIntNUMBERAVAILABLE();
            OTAjustementDetail = new TAjustementDetail();
            OTAjustementDetail.setLgAJUSTEMENTDETAILID(this.getKey().getComplexId());
            OTAjustementDetail.setLgAJUSTEMENTID(OTAjustement);
            OTAjustementDetail.setLgFAMILLEID(OTFamille);
            OTAjustementDetail.setIntNUMBER(int_NUMBER);
            OTAjustementDetail.setIntNUMBERCURRENTSTOCK(int_QUANTITY);
            OTAjustementDetail.setIntNUMBERAFTERSTOCK(
                    OTAjustementDetail.getIntNUMBERCURRENTSTOCK() + OTAjustementDetail.getIntNUMBER());
            OTAjustementDetail.setDtCREATED(new Date());
            OTAjustementDetail.setStrSTATUT(commonparameter.statut_is_Process);
            this.getOdataManager().getEm().persist(OTAjustementDetail);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de creation d'ajustement detail");
        }
        return OTAjustementDetail;
    }
    // fin creation d'un ajustement detail

    // mise a jour d'un ajustement detail
    public TAjustementDetail UpdateAjustementDetail(TAjustementDetail OTAjustementDetail, int int_NUMBER) {
        EntityManager em = this.getOdataManager().getEm();
        try {

            em.getTransaction().begin();
            OTAjustementDetail.setIntNUMBER(int_NUMBER);
            OTAjustementDetail.setDtUPDATED(new Date());
            em.merge(OTAjustementDetail);
            em.getTransaction().commit();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTAjustementDetail;
        } catch (Exception e) {
            em.getTransaction().rollback();
            e.printStackTrace();
            return null;
        }
    }
    // fin mise a jour d'un ajustement detail

    public TFamilleStock getFamilleStock(String lg_FAMILLE_ID) {

        TFamilleStock f = null;
        try {
            f = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ",
                    TFamilleStock.class).setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).setFirstResult(0)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        //
        return f;
    }
}
