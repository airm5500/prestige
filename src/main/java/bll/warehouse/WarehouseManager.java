/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.warehouse;

import bll.commandeManagement.bonLivraisonManagement;
import bll.commandeManagement.etatControle;
import java.sql.*;
import bll.commandeManagement.orderManagement;
import bll.commandeManagement.suggestionManagement;
import bll.common.Parameter;
import bll.configManagement.familleManagement;
import bll.entity.EntityData;
import bll.stock.Stock;
import bll.stock.impl.StockImpl;
import bll.stockManagement.StockManager;
import bll.teller.SnapshotManager;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import bll.utils.TparameterManager;
import cust_barcode.barecodeManager;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TEmplacement;
import dal.TEtiquette;
import dal.TEventLog;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamille_;
import dal.TFamillearticle;
import dal.TGrossiste;
import dal.TLot;
import dal.TLot_;
import dal.TMouvement;
import dal.TMouvementSnapshot;
import dal.TOfficine;
import dal.TParameters;
import dal.TPreenregistrementDetail;
import dal.TSnapShopDalySortieFamille;
import dal.TSuggestionOrder;
import dal.TSuggestionOrderDetails;
import dal.TTypeStockFamille;
import dal.TTypeetiquette;
import dal.TTypesuggestion;
import dal.TUser;
import dal.TWarehouse;
import dal.TWarehouse_;
import dal.TWarehousedetail;
import dal.TZoneGeographique;
import dal.dataManager;
import dal.enumeration.TypeLog;
import dal.jconnexion;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
import org.json.JSONObject;
import rest.service.impl.MvtProduitObselete;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;
import util.DateConverter;

/**
 *
 * @author user
 */
public class WarehouseManager extends bll.bllBase {

    private familleManagement OfamilleManagement;
    private tellerManagement OtellerManagement;
    private SnapshotManager OSnapshotManager;

    public WarehouseManager(dataManager odataManager, TUser oTUser) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public WarehouseManager(dataManager odataManager) {
        super.setOdataManager(odataManager);
        super.checkDatamanager();
    }

    public WarehouseManager(dataManager odataManager, TUser oTUser, SnapshotManager OSnapshotManager) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
        this.OSnapshotManager = OSnapshotManager;
    }

    public WarehouseManager(dataManager odataManager, TUser oTUser, familleManagement OfamilleManagement) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
        this.OfamilleManagement = OfamilleManagement;
    }

    public WarehouseManager(dataManager odataManager, TUser oTUser, tellerManagement OtellerManagement) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
        this.OtellerManagement = OtellerManagement;
    }

    public WarehouseManager(dataManager odataManager, TUser oTUser, familleManagement OfamilleManagement,
            tellerManagement OtellerManagement) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();
        this.OfamilleManagement = OfamilleManagement;
        this.OtellerManagement = OtellerManagement;
    }

    date key = new date();

    orderManagement OorderManagement = new orderManagement(getOdataManager(), getOTUser());

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

    public void updateVirtualStock(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte, String task) {
        int int_new_qte = 0;
        TFamilleStock OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                .getTProductItemStock(OTPreenregistrementDetail.getLgFAMILLEID());

        switch (task) {
        case "del":
            int_new_qte = OTProductItemStock.getIntNUMBER() + int_qte;
            break;
        case "upd":
            int_new_qte = OTProductItemStock.getIntNUMBER() - int_qte;
            break;
        case "ins":
            int_new_qte = OTProductItemStock.getIntNUMBER() - int_qte;
            break;
        default:
            break;
        }

        // notififier le gestionnaire de stock si besoin est
        // Mise a jour du stock disponible
        OTProductItemStock.setIntNUMBER(int_new_qte);
        OTProductItemStock.setDtUPDATED(new Date());
        this.persiste(OTProductItemStock);
        new logger().OCategory.info("Mise a jour du stock virtual " + OTProductItemStock.getIntNUMBER());
    }

    public void updateReelStock(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte, String task) {
        int int_new_qte = 0, int_entree = 0, int_sortie = 0, int_balance = 0;
        String lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals(
                commonparameter.PROCESS_SUCCESS) ? commonparameter.TYPE_STOCK_RAYON : commonparameter.TYPE_STOCK_DEPOT);
        TFamilleStock OTProductItemStock = null;
        TTypeStockFamille OTTypeStockFamille = null;
        try {
            OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID());
            switch (task) {
            case "del":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() + int_qte;
                int_entree = int_qte;
                break;
            case "upd":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_sortie = int_qte;
                break;
            case "ins":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_sortie = int_qte;

                break;
            default:
                break;
            }

            int_balance = int_qte;
            new logger().OCategory.info("int_new_qte:" + int_new_qte + "|||lg_TYPE_STOCK_ID:" + lg_TYPE_STOCK_ID);

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setDtUPDATED(new Date());

            OTTypeStockFamille = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID());

            this.getOdataManager().getEm().merge(OTProductItemStock);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);

            if (!task.equals("del") && OTProductItemStock.getLgFAMILLEID().getBoolDECONDITIONNE() == 0
                    && OTProductItemStock.getLgFAMILLEID().getBCODEINDICATEUR() != 1) {

                suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());
                OsuggestionManagement.makeSuggestionAuto(OTProductItemStock);// suggession auto
            }

            this.BuildTSnapShopDalySortieFamille(OTPreenregistrementDetail.getLgFAMILLEID(), int_balance, int_entree,
                    int_sortie);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    // mise a jour du stock depot de l'extension d'une officine
    public void updateReelStockForDepot(TFamille OTFamille, int int_qte, String task, TEmplacement OTEmplacement) {
        int int_new_qte = 0;

        Integer int_entree = 0;
        Integer int_sortie = 0;
        Integer int_balance = 0;
        String lg_TYPE_STOCK_ID = Parameter.STOCK_DEPOT;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());

        TFamilleStock OTProductItemStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID(),
                OTEmplacement.getLgEMPLACEMENTID());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());

        if (OTProductItemStock == null) {
            OTProductItemStock = new familleManagement(this.getOdataManager(), this.getOTUser())
                    .createOrUpdateStockFamilleForDepot(OTFamille, int_qte, OTEmplacement); // creation vide des stocks
                                                                                            // depots
        } else {
            switch (task) {
            case "del":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_entree = int_qte;
                break;
            case "upd":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() + int_qte;
                int_sortie = int_qte;
                break;
            case "ins":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() + int_qte;
                int_sortie = int_qte;
                break;
            default:
                break;
            }

            // code ajouté
            if (OTFamille.getBoolDECONDITIONNEEXIST() == 1) {
                OfamilleManagement.checkDeconditionneExistForDepot(OTFamille, OTEmplacement, lg_TYPE_STOCK_ID);
            }

            // fin code ajouté
            int_balance = int_qte;

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setIntNUMBER(OTProductItemStock.getIntNUMBERAVAILABLE());
            OTProductItemStock.setDtUPDATED(new Date());
            this.merge(OTProductItemStock);

            TTypeStockFamille OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            OTTypeStockFamille.setIntNUMBER(int_new_qte);
            this.merge(OTTypeStockFamille);
        }

    }

    public void updateReelStockForDepot(TFamille OTFamille, int int_qte, TEmplacement OTEmplacement) {
        int int_new_qte = 0;

        Integer int_entree = 0;
        Integer int_sortie = 0;
        Integer int_balance = 0;
        String lg_TYPE_STOCK_ID = Parameter.STOCK_DEPOT;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());

        TFamilleStock OTProductItemStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID(),
                OTEmplacement.getLgEMPLACEMENTID());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());

        if (OTProductItemStock == null) {
            OTProductItemStock = new familleManagement(this.getOdataManager(), this.getOTUser())
                    .createOrUpdateStockFamilleForDepot(OTFamille, int_qte, OTEmplacement); // creation vide des stocks
                                                                                            // depots
        } else {
            int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() + int_qte;
            int_sortie = int_qte;

            // code ajouté
            if (OTFamille.getBoolDECONDITIONNEEXIST() == 1) {
                OfamilleManagement.checkDeconditionneExistForDepot(OTFamille, OTEmplacement, lg_TYPE_STOCK_ID);
            }

            // fin code ajouté
            int_balance = int_qte;

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setIntNUMBER(OTProductItemStock.getIntNUMBERAVAILABLE());
            OTProductItemStock.setIntUG(0);
            OTProductItemStock.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTProductItemStock);

            TTypeStockFamille OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            OTTypeStockFamille.setIntNUMBER(int_new_qte);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);

        }

    }

    // fin mise a jour du stock depot de l'extension d'une officine
    public boolean AddStock(String lg_PRODUCT_ITEM_ID, Integer int_NUMBER, String lg_GROSSISTE_ID,
            String str_REF_LIVRAISON, Date dt_SORTIE_USINE, Date dt_PEREMPTION, int int_NUMBER_GRATUIT,
            String lg_TYPEETIQUETTE_ID, String str_REF_ORDER, String int_NUM_LOT) {
        boolean result = false;
        new logger().OCategory.info("lg_PRODUCT_ITEM_ID  " + lg_PRODUCT_ITEM_ID + " int_NUMBER " + int_NUMBER
                + " lg_GROSSISTE_ID " + lg_GROSSISTE_ID + " str_REF_LIVRAISON " + str_REF_LIVRAISON
                + " dt_SORTIE_USINE " + dt_SORTIE_USINE + " dt_PEREMPTION " + dt_PEREMPTION + " int_NUMBER_GRATUIT "
                + int_NUMBER_GRATUIT + " lg_TYPEETIQUETTE_ID " + lg_TYPEETIQUETTE_ID + " str_REF_ORDER " + str_REF_ORDER
                + " int_NUM_LOT " + int_NUM_LOT);

        TFamille OTProductItem = (TFamille) this.find(lg_PRODUCT_ITEM_ID, new TFamille());
        TGrossiste OTGrossiste = (TGrossiste) this.find(lg_GROSSISTE_ID, new TGrossiste());
        TTypeetiquette OTTypeetiquette = null;
        TTypeStockFamille OTTypeStockFamille = null;
        TFamilleStock OTFamilleStock = null;
        familleManagement OfamilleManagement = new familleManagement(getOdataManager(), getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());

        String lg_TYPE_STOCK_ID = "1";

        TWarehouse OTWarehouse = new TWarehouse();
        OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
        OTWarehouse.setLgUSERID(this.getOTUser());
        OTWarehouse.setLgFAMILLEID(OTProductItem);
        OTWarehouse.setIntNUMBER(int_NUMBER);
        OTWarehouse.setDtPEREMPTION(dt_PEREMPTION);
        OTWarehouse.setDtSORTIEUSINE(dt_SORTIE_USINE);
        OTWarehouse.setStrREFLIVRAISON(str_REF_LIVRAISON);
        OTWarehouse.setLgGROSSISTEID(OTGrossiste);
        OTWarehouse.setStrREFORDER(str_REF_ORDER);
        OTWarehouse.setDtCREATED(new Date());
        OTWarehouse.setDtUPDATED(new Date());
        OTWarehouse.setIntNUMLOT(int_NUM_LOT);
        OTWarehouse.setIntNUMBERGRATUIT(int_NUMBER_GRATUIT);
        OTWarehouse.setStrSTATUT(commonparameter.statut_enable);
        new logger().OCategory.info("Date peromption : " + OTWarehouse.getDtPEREMPTION());

        OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);
        if (OTTypeetiquette == null) {
            if (OTProductItem.getLgTYPEETIQUETTEID() != null) {
                OTTypeetiquette = OTProductItem.getLgTYPEETIQUETTEID();
            } else {
                OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class,
                        Parameter.DEFAUL_TYPEETIQUETTE);
            }
        }

        OTWarehouse.setLgTYPEETIQUETTEID(OTTypeetiquette);
        new logger().OCategory.info("lg_WAREHOUSE_ID " + OTWarehouse.getLgWAREHOUSEID());
        new logger().OCategory.info("lg_FAMILLE_ID " + OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
        new logger().OCategory.info("lg_TYPEETIQUETTE_ID " + OTWarehouse.getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID());
        /*
         * for (int i = 0; i < OTWarehouse.getIntNUMBER(); i++) { TEtiquette OTEtiquette =
         * OStockManager.createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID(),
         * OTWarehouse.getLgFAMILLEID().getLgFAMILLEID(), OTWarehouse.getLgWAREHOUSEID(), (i + 1) + "/" +
         * OTWarehouse.getIntNUMBER()); OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE()); }
         */
        TEtiquette OTEtiquette = OStockManager.createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID(),
                OTWarehouse.getLgFAMILLEID(), OTWarehouse, String.valueOf(OTWarehouse.getIntNUMBER()));
        OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());

        // code ajouté
        this.persiste(OTWarehouse); // a decommenter en cas de probleme
        // this.getOdataManager().getEm().persist(OTWarehouse);
        int qte_stock_actu = 0;
        try {

            OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
            OTFamilleStock = OtellerManagement.getTProductItemStock(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());

            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
            // this.persiste(OTTypeStockFamille); // a decommenter en cas de probleme
            this.getOdataManager().getEm().persist(OTTypeStockFamille);
            this.getOdataManager().getEm().persist(OTFamilleStock);

            OfamilleManagement.calculPrixMoyenPondere(OTProductItem, str_REF_LIVRAISON);

        } catch (Exception e) {
            e.printStackTrace();
        }

        Integer int_sortie = 0;
        // code de mise a jour du snapshop des ventes daly a insere avec la task = ADD
        this.BuildTSnapShopDalySortieFamille(OTProductItem, int_NUMBER, int_NUMBER, int_sortie);
        OSnapshotManager.SaveMouvementFamille(OTProductItem, lg_GROSSISTE_ID, commonparameter.ADD,
                commonparameter.str_ACTION_ENTREESTOCK, OTWarehouse.getIntNUMBER(),
                this.getOTUser().getLgEMPLACEMENTID());
        // ajout des produits dans warehousedetail
        for (int i = 0; i < OTWarehouse.getIntNUMBER(); i++) {
            this.addProductItemInWarehouseDetail(OTWarehouse.getStrREFLIVRAISON(), OTWarehouse.getLgFAMILLEID(),
                    OTWarehouse.getDtPEREMPTION(), OTWarehouse);
        }

        new logger().OCategory.info("qte_stock_actu " + qte_stock_actu);
        List<TWarehousedetail> lstTWarehousedetail;
        lstTWarehousedetail = this.listeTWarehousedetailBis(OTWarehouse.getLgWAREHOUSEID());
        for (int i = 0; i < qte_stock_actu; i++) {
            if (qte_stock_actu <= lstTWarehousedetail.size()) {
                this.deleteProductItemInWarehouseDetail(lstTWarehousedetail.get(i).getLgWAREHOUSEDETAILID());
            }

        }

        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        result = true;
        return result;
    }
    // fin fonction d'ajout de stock

    // ajout de produit dans lot
    public void AddLot(String lg_PRODUCT_ITEM_ID, Integer int_NUMBER, String lg_GROSSISTE_ID, String str_REF_LIVRAISON,
            String str_SORTIE_USINE, String str_PEREMPTION, int int_NUMBER_GRATUIT, String lg_TYPEETIQUETTE_ID,
            String str_REF_ORDER, String lg_BON_LIVRAISON_DETAIL, String int_NUM_LOT) {
        Date dt_SORTIE_USINE = this.getKey().stringToDate(str_SORTIE_USINE, this.getKey().formatterShort);
        TTypeetiquette OTTypeetiquette = null;
        try {
            TFamille OTProductItem = (TFamille) this.find(lg_PRODUCT_ITEM_ID, new TFamille());
            TGrossiste OTGrossiste = (TGrossiste) this.find(lg_GROSSISTE_ID, new TGrossiste());

            try {
                OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);

            } catch (Exception e) {
            }

            this.getOdataManager().BeginTransaction();
            TLot OTLot = new TLot();
            if (OTTypeetiquette != null) {
                OTLot.setLgTYPEETIQUETTEID(OTTypeetiquette);
            }

            OTLot.setLgLOTID(this.getKey().getComplexId());
            OTLot.setLgUSERID(this.getOTUser());

            OTLot.setLgFAMILLEID(OTProductItem);
            new logger().oCategory.info("Ajout de lot : produit--> " + OTProductItem.getIntCIP() + " ");
            OTLot.setIntNUMBER(int_NUMBER + int_NUMBER_GRATUIT); // quantite commandé + quantité livré
            new logger().oCategory.info("Ajout de lot : produit--> " + OTProductItem.getIntCIP() + " Quantité ---> "
                    + OTLot.getIntNUMBER() + " str_REF_LIVRAISON ------> " + str_REF_LIVRAISON);
            if (!"".equals(str_PEREMPTION)) {
                Date dt_PEREMPTION = java.sql.Date.valueOf(str_PEREMPTION);
                OTLot.setDtPEREMPTION(dt_PEREMPTION);
            }

            OTLot.setDtSORTIEUSINE(dt_SORTIE_USINE);
            OTLot.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTLot.setLgGROSSISTEID(OTGrossiste);
            OTLot.setDtCREATED(new Date());
            OTLot.setDtUPDATED(new Date());
            OTLot.setStrREFORDER(str_REF_ORDER);
            OTLot.setIntNUMLOT(int_NUM_LOT);
            OTLot.setIntNUMBERGRATUIT(int_NUMBER_GRATUIT);
            OTLot.setStrSTATUT(commonparameter.statut_enable);
            OTLot.setIntQTYVENDUE(0);
            this.getOdataManager().getEm().persist(OTLot);
            new orderManagement(this.getOdataManager(), this.getOTUser()).UpdateTBonLivraisonDetailFromBonLivraison(
                    lg_BON_LIVRAISON_DETAIL, (int_NUMBER + int_NUMBER_GRATUIT), int_NUMBER_GRATUIT);
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    // fin ajout de produit dans lot
    // suppression de produit dans lot
    public boolean RemoveLot(String lg_BON_LIVRAISON_DETAIL, String int_NUM_LOT) {
        boolean result = false;
        TBonLivraisonDetail OTBonLivraisonDetail;

        int int_QTE_REMOVE = 0, int_QTE_GRATUIT_REMOVE = 0;
        try {
            OTBonLivraisonDetail = this.getOdataManager().getEm().find(TBonLivraisonDetail.class,
                    lg_BON_LIVRAISON_DETAIL);
            if (OTBonLivraisonDetail == null) {
                this.buildErrorTraceMessage("Echec de retrait de lot. Produit inexistant dans le bon de livraison");
                return result;
            }

            List<TLot> lstTLot = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TLot t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.intNUMLOT = ?2")
                    .setParameter(1, OTBonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID())
                    .setParameter(2, int_NUM_LOT).getResultList();

            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            for (TLot OTLot : lstTLot) {

                int_QTE_REMOVE += OTLot.getIntNUMBER();
                int_QTE_GRATUIT_REMOVE += OTLot.getIntNUMBERGRATUIT();

                List<TWarehouse> tWarehouses = this.getOdataManager().getEm()
                        .createQuery(
                                "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.intNUMLOT  = ?2")
                        .setParameter(1, OTBonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID())
                        .setParameter(2, OTLot.getIntNUMLOT()).getResultList();
                for (TWarehouse tWarehouse : tWarehouses) {
                    this.getOdataManager().getEm().remove(tWarehouse);
                }
                this.getOdataManager().getEm().remove(OTLot);
            }

            UpdateTBonLivraisonDetailFromBonLivraison(OTBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                    (-1) * int_QTE_REMOVE, (-1) * int_QTE_GRATUIT_REMOVE);
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean removeLot(String str_REF_LIVRAISON, String lg_FAMILLE_ID, String lg_BON_LIVRAISON_DETAIL) {
        boolean result = false;
        EntityManager em = this.getOdataManager().getEm();
        TBonLivraisonDetail OTBonLivraisonDetail;

        int int_QTE_REMOVE = 0, int_QTE_GRATUIT_REMOVE = 0;
        try {
            OTBonLivraisonDetail = this.getOdataManager().getEm().find(TBonLivraisonDetail.class,
                    lg_BON_LIVRAISON_DETAIL);
            if (OTBonLivraisonDetail == null) {
                this.buildErrorTraceMessage("Echec de retrait de lot. Produit inexistant dans le bon de livraison");
                return result;
            }

            List<TLot> tLots = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TLot o WHERE o.strREFLIVRAISON=?1 AND o.lgFAMILLEID.lgFAMILLEID =?2  ",
                            TLot.class)
                    .setParameter(1, str_REF_LIVRAISON).setParameter(2, lg_FAMILLE_ID).getResultList();
            List<TWarehouse> tWarehouses = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.strREFLIVRAISON  = ?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, str_REF_LIVRAISON).getResultList();

            em.getTransaction().begin();

            for (TLot OTLot : tLots) {

                int_QTE_REMOVE += OTLot.getIntNUMBER();
                int_QTE_GRATUIT_REMOVE += OTLot.getIntNUMBERGRATUIT();

                em.remove(OTLot);
            }
            tWarehouses.forEach((tWarehouse) -> {
                em.remove(tWarehouse);
            });
            UpdateTBonLivraisonDetailFromBonLivraison(OTBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                    (-1) * int_QTE_REMOVE, (-1) * int_QTE_GRATUIT_REMOVE);
            em.getTransaction().commit();

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return true;
        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
                em.close();
            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression");
            return false;
        }

    }

    // fin suppression de produit dans lot
    private void DoAutoSuggestionToStock(TFamille OTProductItem, int int_qte) {
        TTypesuggestion OTTypesuggestion = (TTypesuggestion) this.find(Parameter.KEY_SUGGESTION_AUTO,
                new TTypesuggestion());
        String str_code = "REF_" + this.getKey().getShortId(7);
        String str_STATUT = commonparameter.statut_enable;
        this.DoSuggestionToStock(OTProductItem, int_qte, OTTypesuggestion, str_code, str_STATUT);
    }

    public void DoManuelSuggestionToStock(TFamille OTProductItem, int int_qte, String str_code, String str_STATUT) {

        TTypesuggestion OTTypesuggestion = this.getOdataManager().getEm().find(TTypesuggestion.class,
                Parameter.KEY_SUGGESTION_MANUEL);
        this.DoSuggestionToStock(OTProductItem, int_qte, OTTypesuggestion, str_code, str_STATUT);

    }

    private void DoSuggestionToStock(TFamille OTFamille, int int_qte, TTypesuggestion OTTypesuggestion, String str_code,
            String str_STATUT) {

    }

    public TSuggestionOrderDetails findFamilleInTSuggestionOrderDetails(String lg_SUGGESTION_ORDER_ID,
            String lg_famille_id, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            OTSuggestionOrderDetails = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID LIKE ?2 AND t.strSTATUT LIKE ?3  ")
                    .setParameter(2, lg_SUGGESTION_ORDER_ID).setParameter(1, lg_famille_id).setParameter(3, str_STATUT)
                    .getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTSuggestionOrderDetails;
    }

    public TSuggestionOrderDetails getTsuggestionDetailByGrossisteAndProduct(String lg_GROSSISTE_ID,
            String lg_FAMILLE_ID) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            OTSuggestionOrderDetails = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2 AND t.strSTATUT LIKE ?3  ")
                    .setParameter(2, lg_GROSSISTE_ID).setParameter(1, lg_FAMILLE_ID)
                    .setParameter(3, commonparameter.statut_is_Process).getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTSuggestionOrderDetails;
    }

    public void deleteSuggestionOrder(String lg_SUGGESTION_ORDER_ID) {

        TSuggestionOrder OTSuggestionOrder;
        List<TSuggestionOrderDetails> lstTSuggestionOrderDetails;
        int i = 0;
        try {

            OTSuggestionOrder = this.FindTSuggestionOrder(lg_SUGGESTION_ORDER_ID);
            if (OTSuggestionOrder != null) {

                lstTSuggestionOrderDetails = this.getTSuggestionOrderDetails(lg_SUGGESTION_ORDER_ID);

                for (TSuggestionOrderDetails OTSuggestionOrderDetails : lstTSuggestionOrderDetails) {

                    if (this.delete(OTSuggestionOrderDetails)) {
                        TFamille Of = OTSuggestionOrderDetails.getLgFAMILLEID();
                        int status = isCommandProcess(Of.getLgFAMILLEID());
                        switch (status) {
                        case 0:
                            Of.setBCODEINDICATEUR((short) 0);
                            break;
                        case 1:
                            Of.setBCODEINDICATEUR((short) 2);
                            break;

                        default:
                            Of.setBCODEINDICATEUR((short) 1);
                            break;
                        }
                        Of.setIntORERSTATUS((short) status);
                        this.merge(Of);
                        i++;
                    }
                }

                if (i == lstTSuggestionOrderDetails.size()) {
                    this.delete(OTSuggestionOrder);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                } else {
                    this.buildErrorTraceMessage(
                            i + "/" + lstTSuggestionOrderDetails.size() + " produit(s) supprimé(s) de la suggestion");
                }

            }

        } catch (Exception e) {
            e.printStackTrace();

        }

    }

    public TSuggestionOrder FindTSuggestionOrder(String lg_SUGGESTION_ORDER_ID) {
        new logger().OCategory.info(" *******  Recherche de  TSuggestionOrder ****** ");
        TSuggestionOrder OTSuggestionOrder = (TSuggestionOrder) this.find(lg_SUGGESTION_ORDER_ID,
                new TSuggestionOrder());
        new logger().OCategory
                .info(" *******   OTSuggestionOrder  Trouver   ****** " + OTSuggestionOrder.getLgSUGGESTIONORDERID());

        return OTSuggestionOrder;
    }

    public void processAvoir(TPreenregistrementDetail OTPreenregistrementDetail, TFamilleStock OTProductItemStock) {
        // lg_PREENREGISTREMENT_DETAIL_ID

        int reste = OTProductItemStock.getIntNUMBER() - OTPreenregistrementDetail.getIntQUANTITY();

        if (reste < 0) {
            OTPreenregistrementDetail.setIntAVOIR(reste);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(
                    OTPreenregistrementDetail.getIntQUANTITY() + OTPreenregistrementDetail.getIntAVOIR());
            this.persiste(OTPreenregistrementDetail);
            this.buildSuccesTraceMessage("Avoir mis jour ");
        }
    }

    // fonction de mise a jour les nouveaux seuils de stock de produit
    public void defineSeuilReaprovisionnement(TFamille oTFamille) {
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, Parameter.KEY_DAY_STOCK);
        Date dt_DEBUT = this.getKey().GetNewDate(-oTFamille.getIntDAYHISTORY());
        Date dt_FIN = new Date();
        int int_total_vente = this.getTotalVenteByPeriode(dt_DEBUT, dt_FIN, oTFamille);
        new logger().OCategory.info("int_total_vente " + int_total_vente);

        int int_nb_day = this.getKey().GetDayToSeparate(dt_DEBUT, dt_FIN);
        int int_seuil_min = int_total_vente / int_nb_day;
        // int int_seuil_max = int_seuil_min * (new Integer(OTParameters.getStrSTATUT()));
        int int_seuil_max = int_seuil_min * (new Integer(OTParameters.getStrVALUE()));
        oTFamille.setIntSEUILMAX(int_seuil_max);
        oTFamille.setIntSEUILMIN(int_seuil_min);
        this.persiste(oTFamille);
    }

    public void defineSeuilReaprovisionnement(String lg_FAMILLE_ID) {
        TFamille oTFamille = (TFamille) this.find(lg_FAMILLE_ID, new TFamille());
        this.defineSeuilReaprovisionnement(oTFamille);
    }
    // fin fonction de mise a jour les nouveaux seuils de stock de produit

    public int getTotalVenteByPeriode(Date dt_DEBUT, Date dt_FIN, TFamille OTFamille) {
        List<TSnapShopDalySortieFamille> lstTSnapShopDalySortieFamille = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TSnapShopDalySortieFamille t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6")
                .setParameter(3, dt_DEBUT).setParameter(4, dt_FIN).setParameter(5, commonparameter.statut_enable)
                .setParameter(6, OTFamille.getLgFAMILLEID()).getResultList();

        int intTotalVente = 0;
        for (int i = 0; i < lstTSnapShopDalySortieFamille.size(); i++) {
            intTotalVente = intTotalVente + lstTSnapShopDalySortieFamille.get(i).getIntNUMBERSORTIE();
        }

        return intTotalVente;
    }

    public int GetSuggestionTotal(String lg_SUGGESTION_ORDER_ID) {
        int Total_vente = 0;
        List<TSuggestionOrderDetails> lstT = this.getTSuggestionOrderDetails(lg_SUGGESTION_ORDER_ID);
        for (int i = 0; i < lstT.size(); i++) {

            Total_vente = lstT.get(i).getIntPRICE() + Total_vente;
        }
        new logger().OCategory.info(" @@@@@@@@  Le total de la vente est de  @@@@@@@@   " + Total_vente);
        return Total_vente;
    }

    public List<TSuggestionOrderDetails> getTSuggestionOrderDetails(String lg_SUGGESTION_ORDER_ID) {
        List<TSuggestionOrderDetails> lstT = new ArrayList<>();
        try {
            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?4 ) AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID LIKE ?3 ")
                    .setParameter(1, commonparameter.statut_is_Process).setParameter(2, commonparameter.statut_enable)
                    .setParameter(4, commonparameter.statut_is_Auto).setParameter(3, lg_SUGGESTION_ORDER_ID)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstT;
    }

    public List<TSuggestionOrderDetails> getTSuggestionOrderDetails(String lg_SUGGESTION_ORDER_ID, String str_STATUT) {
        List<TSuggestionOrderDetails> lstT = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TSuggestionOrderDetails t WHERE t.strSTATUT LIKE ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID LIKE ?3 ")
                .setParameter(1, str_STATUT).setParameter(3, lg_SUGGESTION_ORDER_ID).getResultList();

        return lstT;
    }

    // Sortie de stock (dans le cas des périmés)
    public boolean deleteProductToPerime(String lg_WAREHOUSE_ID, String lg_TYPE_STOCK_ID) {
        boolean result = false;
        Integer int_entree = 0;
        Integer int_sortie = 0;

        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        List<TWarehousedetail> lstTWarehousedetail = new ArrayList<>();
        try {
            new logger().OCategory.info("lg_WAREHOUSE_ID deleteProductToPerime " + lg_WAREHOUSE_ID);
            TWarehouse OTWarehouse = this.getOdataManager().getEm().find(TWarehouse.class, lg_WAREHOUSE_ID);
            new logger().OCategory.info("Famille " + OTWarehouse.getLgFAMILLEID().getStrNAME());
            TFamilleStock OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());

            lstTWarehousedetail = this.listeTWarehousedetailBis(OTWarehouse.getLgWAREHOUSEID());

            OTProductItemStock
                    .setIntNUMBERAVAILABLE(OTProductItemStock.getIntNUMBERAVAILABLE() - lstTWarehousedetail.size());
            // OTProductItemStock.setIntNUMBER(OTProductItemStock.getIntNUMBERAVAILABLE());
            OTProductItemStock.setDtUPDATED(new Date());

            TTypeStockFamille OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() - lstTWarehousedetail.size());
            OTTypeStockFamille.setDtUPDATED(new Date());

            this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().persist(OTProductItemStock);
            this.getOdataManager().getEm().persist(OTTypeStockFamille);
            this.getOdataManager().CloseTransaction();
            /*
             * this.persiste(OTProductItemStock); this.persiste(OTTypeStockFamille);
             */

            OTWarehouse.setIntNUMBERDELETE(lstTWarehousedetail.size());
            this.persiste(OTWarehouse);

            int_sortie = lstTWarehousedetail.size();
            // int_balance = OTWarehouse.getIntNUMBER();

            try {
                this.BuildTSnapShopDalySortieFamille(OTWarehouse.getLgFAMILLEID(), int_sortie, int_entree, int_sortie);
            } catch (Exception e) {
            }

            OSnapshotManager.SaveMouvementFamille(OTWarehouse.getLgFAMILLEID(), "", commonparameter.REMOVE,
                    commonparameter.str_ACTION_PERIME, lstTWarehousedetail.size(),
                    this.getOTUser().getLgEMPLACEMENTID());

            OTWarehouse.setStrSTATUT(commonparameter.statut_delete);
            OTWarehouse.setDtUPDATED(new Date());
            this.persiste(OTWarehouse);

            for (int i = 0; i < lstTWarehousedetail.size(); i++) {
                this.refresh(lstTWarehousedetail.get(i));
                this.deleteProductItemInWarehouseDetail(lstTWarehousedetail.get(i).getLgWAREHOUSEDETAILID());
            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'article périmé du stock");
        }
        return result;
    }
    // fin Sortie de stock (dans le cas des périmés)

    // retrouver une entree de stock par son code livraison
    public TWarehouse getWarehouseByRef(String str_REF_LIVRAISON) {
        TWarehouse OTWarehouse = null;
        try {
            OTWarehouse = (TWarehouse) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TWarehouse t WHERE t.strREFLIVRAISON = ?1")
                    .setParameter(1, str_REF_LIVRAISON).getSingleResult();
            new logger().OCategory.info("Famille retrouvé " + OTWarehouse.getLgFAMILLEID().getStrNAME() + " Id entree "
                    + OTWarehouse.getLgWAREHOUSEID());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTWarehouse;
    }
    // fin retrouver une entree de stock par son code livraison

    // ajout de produit dans warehousedetail
    public void addProductItemInWarehouseDetail(String str_REF_LIVRAISON, TFamille OTFamille, Date dt_PEREMPTION,
            TWarehouse OTWarehouse) {
        TWarehousedetail OWarehousedetail = new TWarehousedetail();

        try {
            OWarehousedetail.setLgWAREHOUSEDETAILID(this.getKey().getComplexId());
            OWarehousedetail.setLgFAMILLEID(OTFamille);
            OWarehousedetail.setLgWAREHOUSEID(OTWarehouse);
            OWarehousedetail.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OWarehousedetail.setStrSTATUT(commonparameter.statut_enable);
            OWarehousedetail.setDtCREATED(new Date());
            OWarehousedetail.setDtPEREMPTION(dt_PEREMPTION);
            this.getOdataManager().getEm().persist(OWarehousedetail);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }
    // fin ajout de produit dans warehousedetail

    // suppression de produit dans warehousedetail
    public void deleteProductItemInWarehouseDetail(String lg_WAREHOUSEDETAIL_ID) {
        TWarehousedetail OWarehousedetail = this.getOdataManager().getEm().find(TWarehousedetail.class,
                lg_WAREHOUSEDETAIL_ID);
        new logger().OCategory.info("OWarehousedetail " + OWarehousedetail.getDtPEREMPTION());
        // this.delete(OWarehousedetail);
        this.getOdataManager().getEm().remove(OWarehousedetail);
    }
    // fin ajout de produit dans warehousedetail

    // liste des produits dans warehousedetail en fonction de la date de peromption
    public List<TWarehousedetail> listeProductByDtPeromption(Date dt_PEREMPTION, String lg_FAMILLE_ID) {
        List<TWarehousedetail> lstProduct = new ArrayList<>();
        try {
            lstProduct = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehousedetail t WHERE t.dtPEREMPTION = ?1 and t.lgFAMILLEID.lgFAMILLEID = ?2")
                    .setParameter(1, dt_PEREMPTION).setParameter(2, lg_FAMILLE_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste size " + lstProduct.size());
        return lstProduct;
    }

    public List<TWarehousedetail> listeTWarehousedetail(String lg_FAMILLE_ID) {
        List<TWarehousedetail> lstProduct = new ArrayList<>();
        try {
            lstProduct = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehousedetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 ORDER BY t.dtPEREMPTION ASC")
                    .setParameter(1, lg_FAMILLE_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste size " + lstProduct.size());
        return lstProduct;
    }

    public List<TWarehousedetail> listeTWarehousedetail(String lg_FAMILLE_ID, String str_REF_LIVRAISON) {
        List<TWarehousedetail> lstProduct = new ArrayList<>();
        try {
            lstProduct = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehousedetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgWAREHOUSEID.strREFLIVRAISON = ?2 ORDER BY t.dtPEREMPTION ASC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, str_REF_LIVRAISON).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstProduct;
    }

    public List<TWarehousedetail> listeTWarehousedetailBis(String lg_WAREHOUSE_ID) {
        List<TWarehousedetail> lstProduct = new ArrayList<TWarehousedetail>();
        try {
            lstProduct = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehousedetail t WHERE t.lgWAREHOUSEID.lgWAREHOUSEID = ?1 ORDER BY t.dtPEREMPTION ASC")
                    .setParameter(1, lg_WAREHOUSE_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste size " + lstProduct.size());
        return lstProduct;
    }
    // fin liste des produits dans warehousedetail en fonction de la date de peromption

    public List<TTypeetiquette> listeTypeetiquette() {
        List<TTypeetiquette> lstTypeetiquette = new ArrayList<TTypeetiquette>();
        try {
            lstTypeetiquette = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TTypeetiquette t WHERE t.strSTATUT = ?1")
                    .setParameter(1, commonparameter.statut_enable).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste size " + lstTypeetiquette.size());
        return lstTypeetiquette;
    }

    public boolean checkQuantiteCommande(int int_Qte_cmde, int int_Qte_livre, String lg_BON_LIVRAISON_DETAIL) {
        boolean result = true;
        try {
            TBonLivraisonDetail OTBonLivraisonDetail = this.getOdataManager().getEm().find(TBonLivraisonDetail.class,
                    lg_BON_LIVRAISON_DETAIL);
            int valeur = (OTBonLivraisonDetail.getIntQTERECUE() + int_Qte_livre) - int_Qte_cmde;
            new logger().OCategory.info("valeur --- " + valeur);
            if (valeur > 0) {
                result = false;
                this.buildErrorTraceMessage("La quantité livrée est supérieure à la quantité commandée");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result --- " + result);
        return result;
    }

    public int getQuantiteResteWarehouse(String lg_WAREHOUSE_ID) {
        List<TWarehousedetail> lstTWarehousedetail = new ArrayList<TWarehousedetail>();
        int result = 0;
        new logger().OCategory.info("Dans getQuantiteResteWarehouse lg_WAREHOUSE_ID --- " + lg_WAREHOUSE_ID);
        try {
            lstTWarehousedetail = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TWarehousedetail t WHERE t.lgWAREHOUSEID.lgWAREHOUSEID = ?1")
                    .setParameter(1, lg_WAREHOUSE_ID).getResultList();
            result = lstTWarehousedetail.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result --- " + result);
        return result;
    }

    // dernier mouvement d'un article
    public Date getLastDateMouvementFamille(String lg_FAMILLE_ID, String str_TYPE_ACTION, String str_ACTION) {
        Date dateMouv = null;
        TMouvement OTMouvement = null;
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            new logger().OCategory.info("lg_FAMILLE_ID:" + lg_FAMILLE_ID);
            OTMouvement = (TMouvement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvement t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.strTYPEACTION LIKE ?2 AND t.strACTION LIKE ?3 AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?4 ORDER BY t.dtDAY DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, str_TYPE_ACTION).setParameter(3, str_ACTION)
                    .setParameter(4, lg_EMPLACEMENT_ID).setMaxResults(1).setMaxResults(1).getSingleResult();
            // new logger().OCategory.info("lstTMouvement taille " + lstTMouvement.size());
            if (OTMouvement != null) {
                dateMouv = OTMouvement.getDtUPDATED();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("dateMouv:" + dateMouv);
        return dateMouv;
    }
    // fin dernier mouvement d'un article

    // liste des perimés retiré du stock
    public List<TWarehouse> listeTWarehouseRemoveToStock(String search_value, Date dtDEBUT, Date dtFin,
            String lg_FAMILLE_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE (t.lgFAMILLEID.strNAME LIKE ?1 OR t.lgFAMILLEID.intCIP LIKE ?2) AND (t.dtUPDATED >= ?3 AND t.dtUPDATED <=?4) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6 AND t.strSTATUT = ?5 ORDER BY t.dtUPDATED ASC")
                    .setParameter(1, search_value + "%").setParameter(2, search_value + "%").setParameter(3, dtDEBUT)
                    .setParameter(4, dtFin).setParameter(5, commonparameter.statut_delete)
                    .setParameter(6, lg_FAMILLE_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Taille liste " + lstTWarehouse.size());

        return lstTWarehouse;
    }

    // fin liste des périmés retiré du stock
    // entree en stock basic
    public TWarehouse AddStock(TFamille OTProductItem, Integer int_NUMBER, String int_NUM_LOT) {
        String lg_TYPE_STOCK_ID = "1";

        try {
            // TFamille OTProductItem = (TFamille) this.find(lg_PRODUCT_ITEM_ID, new TFamille());
            new logger().OCategory.info("int_NUMBER " + int_NUMBER + " int_NUM_LOT " + int_NUM_LOT);

            TWarehouse OTWarehouse = new TWarehouse();
            OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
            OTWarehouse.setLgUSERID(this.getOTUser());
            OTWarehouse.setLgFAMILLEID(OTProductItem);
            OTWarehouse.setIntNUMBER(int_NUMBER);
            OTWarehouse.setDtPEREMPTION(new Date());
            OTWarehouse.setDtCREATED(new Date());
            OTWarehouse.setDtUPDATED(new Date());
            OTWarehouse.setIntNUMLOT(int_NUM_LOT);
            // OTWarehouse.setStrSTATUT(commonparameter.statut_enable);
            OTWarehouse.setStrSTATUT(commonparameter.statut_perime);
            new logger().OCategory.info("Date peromption : " + OTWarehouse.getDtPEREMPTION());

            // code ajouté
            if (this.persiste(OTWarehouse)) {

                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                return OTWarehouse;
            } else {
                this.buildErrorTraceMessage("Impossible ", this.getDetailmessage());
                return null;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }
    // fin entree en stock basic

    // Debut Etat de contrôle des achats
    public void EtatControleAchat(TFamille OTFamille) {

    }

    public List<etatControle> EtatControleAchat() {

        etatControle OetatControle = new etatControle();
        List<etatControle> lstetatControle = new ArrayList<>();

        try {

            jconnexion Ojconnexion = new jconnexion();
            String sql = "SELECT\n" + "w.dt_CREATED dt_CREATED,\n" + "g.str_LIBELLE str_LIBELLE,\n"
                    + "o.str_REF_ORDER str_ORDER_REF,\n" + "b.str_REF_LIVRAISON str_BL_REF,\n"
                    + "bd.int_QTE_CMDE qte_cmd,\n" + "bd.int_QTE_RECUE int_BL_NUMBER,\n"
                    + "bd.int_PA_REEL * bd.int_QTE_RECUE int_BL_PRICE,\n" + "od.int_PRICE int_ORDER_PRICE,\n"
                    + "bd.dt_CREATED dt_DATE_LIVRAISON,\n" + "w.dt_CREATED dt_entree_stock,\n"
                    + "f.str_NAME str_NAME,\n" + "f.int_CIP int_CIP,\n" + "w.int_NUMBER int_NUMBER\n"
                    + "from t_warehouse w\n" + "JOIN t_bon_livraison b on b.str_REF_LIVRAISON = w.str_REF_LIVRAISON\n"
                    + "JOIN t_bon_livraison_detail bd on bd.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID\n"
                    + "JOIN t_order o on o.str_REF_ORDER = w.str_REF_ORDER\n"
                    + "JOIN t_order_detail od on od.lg_ORDER_ID = o.lg_ORDER_ID\n"
                    + "JOIN t_famille f on f.lg_FAMILLE_ID = w.lg_FAMILLE_ID\n"
                    + "JOIN t_grossiste g on g.lg_GROSSISTE_ID = w.lg_GROSSISTE_ID\n"
                    + "WHERE w.dt_CREATED BETWEEN '2015/01/01' AND '2015/07/30' AND g.str_LIBELLE like 'LABOREX'";

            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            Ojconnexion.set_Request(sql);
            ResultSet rs = Ojconnexion.get_resultat();

            while (rs.next()) {

                String str_LIBELLE = rs.getString("str_LIBELLE");
                String str_NAME = rs.getString("str_NAME");
                String int_CIP = rs.getString("int_CIP");
                String str_ORDER_REF = rs.getString("str_ORDER_REF");
                double int_ORDER_PRICE = Double.parseDouble(rs.getString("int_ORDER_PRICE"));
                String str_BL_REF = rs.getString("str_BL_REF");
                Date dt_DATE_LIVRAISON = date.stringToDate(rs.getString("dt_DATE_LIVRAISON"));
                int int_BL_PRICE = Integer.parseInt(rs.getString("int_BL_PRICE"));
                int int_BL_NUMBER = Integer.parseInt(rs.getString("int_BL_NUMBER"));
                Date dt_CREATED = date.stringToDate(rs.getString("dt_CREATED"));
                int int_NUMBER = Integer.parseInt(rs.getString("int_NUMBER"));
                int int_QTE_CMD = Integer.parseInt(rs.getString("qte_cmd"));
                Date dt_ENTREE_STCK = date.stringToDate(rs.getString("dt_entree_stock"));

                lstetatControle.add(new etatControle(str_LIBELLE, str_NAME, int_CIP, str_ORDER_REF, int_ORDER_PRICE,
                        str_BL_REF, int_BL_PRICE, int_BL_NUMBER, dt_CREATED, int_NUMBER, dt_DATE_LIVRAISON, int_QTE_CMD,
                        dt_ENTREE_STCK));

            }

            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            System.out.println("ERROR " + e);
            lstetatControle = null;

        }

        return lstetatControle;

    }

    public List<etatControle> EtatControleAchat(String grossiste, Date dateDeb, Date dateFin) {

        etatControle OetatControle = new etatControle();
        List<etatControle> lstetatControle = new ArrayList<>();

        try {

            jconnexion Ojconnexion = new jconnexion();
            String sql = "SELECT\n" + "w.dt_CREATED dt_CREATED,\n" + "g.str_LIBELLE str_LIBELLE,\n"
                    + "o.str_REF_ORDER str_ORDER_REF,\n" + "b.str_REF_LIVRAISON str_BL_REF,\n"
                    + "bd.int_QTE_CMDE qte_cmd,\n" + "bd.int_QTE_RECUE int_BL_NUMBER,\n"
                    + "bd.int_PA_REEL * bd.int_QTE_RECUE int_BL_PRICE,\n" + "od.int_PRICE int_ORDER_PRICE,\n"
                    + "bd.dt_CREATED dt_DATE_LIVRAISON,\n" + "w.dt_CREATED dt_entree_stock,\n"
                    + "f.str_NAME str_NAME,\n" + "f.int_CIP int_CIP,\n" + "w.int_NUMBER int_NUMBER\n"
                    + "from t_warehouse w\n" + "JOIN t_bon_livraison b on b.str_REF_LIVRAISON = w.str_REF_LIVRAISON\n"
                    + "JOIN t_bon_livraison_detail bd on bd.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID\n"
                    + "JOIN t_order o on o.str_REF_ORDER = w.str_REF_ORDER\n"
                    + "JOIN t_order_detail od on od.lg_ORDER_ID = o.lg_ORDER_ID\n"
                    + "JOIN t_famille f on f.lg_FAMILLE_ID = w.lg_FAMILLE_ID\n"
                    + "JOIN t_grossiste g on g.lg_GROSSISTE_ID = w.lg_GROSSISTE_ID\n" + "WHERE g.str_LIBELLE like "
                    + grossiste;

            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            Ojconnexion.set_Request(sql);
            ResultSet rs = Ojconnexion.get_resultat();

            while (rs.next()) {

                String str_LIBELLE = rs.getString("str_LIBELLE");
                String str_NAME = rs.getString("str_NAME");
                String int_CIP = rs.getString("int_CIP");
                String str_ORDER_REF = rs.getString("str_ORDER_REF");
                double int_ORDER_PRICE = Double.parseDouble(rs.getString("int_ORDER_PRICE"));
                String str_BL_REF = rs.getString("str_BL_REF");
                Date dt_DATE_LIVRAISON = date.stringToDate(rs.getString("dt_DATE_LIVRAISON"));
                int int_BL_PRICE = Integer.parseInt(rs.getString("int_BL_PRICE"));
                int int_BL_NUMBER = Integer.parseInt(rs.getString("int_BL_NUMBER"));
                Date dt_CREATED = date.stringToDate(rs.getString("dt_CREATED"));
                int int_NUMBER = Integer.parseInt(rs.getString("int_NUMBER"));
                int int_QTE_CMD = Integer.parseInt(rs.getString("qte_cmd"));
                Date dt_ENTREE_STCK = date.stringToDate(rs.getString("dt_entree_stock"));

                lstetatControle.add(new etatControle(str_LIBELLE, str_NAME, int_CIP, str_ORDER_REF, int_ORDER_PRICE,
                        str_BL_REF, int_BL_PRICE, int_BL_NUMBER, dt_CREATED, int_NUMBER, dt_DATE_LIVRAISON, int_QTE_CMD,
                        dt_ENTREE_STCK));

            }

            System.out.println("lstetatControle " + lstetatControle.size());
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            System.out.println("ERROR " + e);
            lstetatControle = null;

        }

        return lstetatControle;

    }

    // Fin Etat de contrôle des achats
    // liste des produits périmés
    public List<TWarehouse> listTFamillePerimePerDate(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime) {

        List<TWarehouse> lstTWarehouse = new ArrayList<>();
        TParameters OTParameters = null;

        try {
            String dateJ = this.getKey().getoDay(dateMaxPerime);
            int JourDuMois = Integer.parseInt(dateJ);
            new logger().OCategory.info("dateJ " + dateJ + " JourDuMois " + JourDuMois);
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            // new logger().OCategory.info("search_value " + search_value + " dans la fonction listTFamillePerimePerDate
            // lg_FAMILLE_ID :" + lg_FAMILLE_ID + " Jour maxi périmé " + OTParameters.getStrVALUE());

            // lstTWarehouse = this.getOdataManager().getEm().createQuery("SELECT t FROM TWarehouse t WHERE
            // t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE
            // ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.lgFAMILLEID.strNAME DESC")
            // .setParameter(1, lg_FAMILLE_ID).setParameter(7, dtDEBUT).setParameter(8,
            // this.getKey().getDayofSomeMonth(Integer.parseInt(OTParameters.getStrVALUE()),
            // JourDuMois)).setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value +
            // "%").setParameter(6, commonparameter.statut_delete).getResultList();
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.dtUPDATED DESC, t.lgFAMILLEID.strNAME ASC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8,
                            this.getKey().getDayofSomeMonth(Integer.parseInt(OTParameters.getStrVALUE()), JourDuMois))
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(6, commonparameter.statut_delete).getResultList();
            // for (TWarehouse OTWarehouse : lstTWarehouse) {
            // new logger().OCategory.info("Famille " + OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION() + " Date
            // Péremption " + OTWarehouse.getDtPEREMPTION());
            // }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    public List<EntityData> listTFamillePerime(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime) {

        int nbreJour = 0;
        String str_STATUT = "";
        String etat = "";
        List<TWarehouse> lstTWarehouse = new ArrayList<>();
        List<EntityData> lstEntityData = new ArrayList<>();
        TParameters OTParameters = null;
        EntityData OEntityData = null;
        try {
            String dateJ = this.getKey().getoDay(dateMaxPerime);
            int JourDuMois = Integer.parseInt(dateJ);
            new logger().OCategory.info("dateJ " + dateJ + " JourDuMois " + JourDuMois);
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.dtUPDATED DESC, t.lgFAMILLEID.strNAME ASC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8,
                            this.getKey().getDayofSomeMonth(Integer.parseInt(OTParameters.getStrVALUE()), JourDuMois))
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(6, commonparameter.statut_delete).getResultList();
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(OTWarehouse.getLgWAREHOUSEID());
                // OEntityData.setStr_value2(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
                OEntityData.setStr_value2(
                        OTWarehouse.getLgUSERID().getStrFIRSTNAME() + " " + OTWarehouse.getLgUSERID().getStrLASTNAME());
                OEntityData.setStr_value3(OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION());
                OEntityData.setStr_value4(OTWarehouse.getLgGROSSISTEID().getStrLIBELLE());
                OEntityData.setStr_value5(OTWarehouse.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE());
                OEntityData.setStr_value6(String.valueOf(OTWarehouse.getIntNUMBER()));
                OEntityData.setStr_value7(OTWarehouse.getIntNUMLOT());
                OEntityData
                        .setStr_value8(String.valueOf(this.getQuantiteResteWarehouse(OTWarehouse.getLgWAREHOUSEID())));
                OEntityData.setStr_value9(
                        this.getKey().DateToString(OTWarehouse.getDtPEREMPTION(), this.getKey().formatterShort));

                str_STATUT = "";
                etat = "";
                long diff = key.getDifferenceBetweenDate(new Date(), OTWarehouse.getDtPEREMPTION());
                int monthPerime = Integer.parseInt(OTParameters.getStrVALUE());
                nbreJour = monthPerime * 30;
                new logger().OCategory.info("diff " + diff + " monthPerime " + monthPerime + " nbreJour " + nbreJour);

                if (diff <= 0) {
                    str_STATUT = "Périmé";
                    etat = commonparameter.PROCESS_FAILED;
                } else if (0 < diff && diff < nbreJour) {
                    str_STATUT = "En cours de péremption";
                    etat = commonparameter.PROCESS_SUCCESS;
                }
                OEntityData.setStr_value10(str_STATUT);
                OEntityData.setStr_value11(etat);
                OEntityData.setStr_value12(OTWarehouse.getLgFAMILLEID().getIntCIP());
                lstEntityData.add(OEntityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;
    }

    public List<EntityData> listTFamillePerime(String search_value, String lg_FAMILLE_ID) {
        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        TParameters OTParameters = null;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "SELECT t.lg_WAREHOUSE_ID, f.lg_FAMILLE_ID, t.int_NUM_LOT, t.int_NUMBER, t.int_NUMBER_GRATUIT, t.str_REF_LIVRAISON, t.dt_PEREMPTION, f.int_CIP, f.str_DESCRIPTION AS str_DESCRIPTION_FAMILLE, DATEDIFF(NOW(),t.dt_PEREMPTION) as ecart_peremption, g.str_DESCRIPTION AS str_DESCRIPTION_GROSSISTE FROM t_warehouse t, t_famille f, t_grossiste g  where t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID and t.lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "' AND (f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '"
                    + search_value + "%' OR f.int_EAN13 LIKE '" + search_value + "%') and t.str_STATUT NOT LIKE '"
                    + commonparameter.statut_delete
                    + "' AND (DATEDIFF(NOW(),t.dt_PEREMPTION) > 0 AND DATEDIFF(NOW(),t.dt_PEREMPTION) <= "
                    + (Integer.parseInt(OTParameters.getStrVALUE()) * 30)
                    + ") ORDER BY t.dt_UPDATED DESC, f.str_DESCRIPTION ASC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION_FAMILLE"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_DESCRIPTION_GROSSISTE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_NUMBER"));

                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_NUM_LOT"));
                OEntityData.setStr_value8(String.valueOf(
                        this.getQuantiteResteWarehouse(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"))));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("dt_PEREMPTION"));

                if (Integer.parseInt(Ojconnexion.get_resultat().getString("ecart_peremption")) <= 0) {

                    OEntityData.setStr_value10("Périmé");
                    OEntityData.setStr_value11(commonparameter.PROCESS_FAILED);
                } else if (0 < Integer.parseInt(Ojconnexion.get_resultat().getString("ecart_peremption"))
                        && Integer.parseInt(Ojconnexion.get_resultat().getString("ecart_peremption")) <= Integer
                                .parseInt(OTParameters.getStrVALUE())) {

                    OEntityData.setStr_value10("En cours de péremption");
                    OEntityData.setStr_value11(commonparameter.PROCESS_SUCCESS);
                }
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_CIP"));

                lstEntityData.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;

    }

    // liste des articles perimes
    public List<EntityData> listTFamillePerimeOnly(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime) { // bonne versionn

        int nbreJour = 0;
        String str_STATUT = "";
        String etat = "";
        List<TWarehouse> lstTWarehouse = new ArrayList<>();
        List<EntityData> lstEntityData = new ArrayList<>();
        TParameters OTParameters = null;
        EntityData OEntityData = null;
        long diff = 0;
        int monthPerime = 0;
        try {
            String dateJ = this.getKey().getoDay(dateMaxPerime);
            int JourDuMois = Integer.parseInt(dateJ);
            new logger().OCategory.info("dateJ " + dateJ + " JourDuMois " + JourDuMois);
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.dtUPDATED DESC, t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8,
                            this.getKey().getDayofSomeMonth(Integer.parseInt(OTParameters.getStrVALUE()), JourDuMois))
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(6, commonparameter.statut_delete).getResultList();

            for (TWarehouse OTWarehouse : lstTWarehouse) {
                str_STATUT = "";
                etat = "";
                diff = key.getDifferenceBetweenDate(new Date(), OTWarehouse.getDtPEREMPTION());
                monthPerime = Integer.parseInt(OTParameters.getStrVALUE());
                nbreJour = monthPerime * 30;
                new logger().OCategory.info("diff " + diff + " monthPerime " + monthPerime + " nbreJour " + nbreJour);

                if (diff <= 0) {
                    str_STATUT = "Périmé";
                    etat = commonparameter.PROCESS_FAILED;
                    OEntityData = new EntityData();
                    OEntityData.setStr_value1(OTWarehouse.getLgWAREHOUSEID());
                    OEntityData.setStr_value2(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
                    OEntityData.setStr_value3(OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION());
                    OEntityData.setStr_value4(OTWarehouse.getLgGROSSISTEID().getStrLIBELLE());
                    OEntityData.setStr_value5(OTWarehouse.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE());
                    OEntityData.setStr_value6(String.valueOf(OTWarehouse.getIntNUMBER()));
                    OEntityData.setStr_value7(OTWarehouse.getIntNUMLOT());
                    OEntityData.setStr_value8(
                            String.valueOf(this.getQuantiteResteWarehouse(OTWarehouse.getLgWAREHOUSEID())));
                    OEntityData.setStr_value9(
                            this.getKey().DateToString(OTWarehouse.getDtPEREMPTION(), this.getKey().formatterShort));
                    OEntityData.setStr_value10(str_STATUT);
                    OEntityData.setStr_value11(etat);
                    OEntityData.setStr_value12(OTWarehouse.getLgFAMILLEID().getIntCIP());
                    lstEntityData.add(OEntityData);
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;
    }

    public List<EntityData> listTFamillePerimeOnly(String search_value, String lg_FAMILLE_ID) {

        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "SELECT t.lg_WAREHOUSE_ID, f.lg_FAMILLE_ID, t.int_NUM_LOT, t.int_NUMBER, t.int_NUMBER_GRATUIT, t.str_REF_LIVRAISON, t.dt_PEREMPTION, f.int_CIP, f.str_DESCRIPTION AS str_DESCRIPTION_FAMILLE, DATEDIFF(NOW(),t.dt_PEREMPTION) as ecart_peremption, g.str_DESCRIPTION AS str_DESCRIPTION_GROSSISTE FROM t_warehouse t, t_famille f, t_grossiste g where t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID and t.lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "' AND (f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '"
                    + search_value + "%' OR f.int_EAN13 LIKE '" + search_value + "%') and t.str_STATUT NOT LIKE '"
                    + commonparameter.statut_delete
                    + "' AND DATEDIFF(NOW(),t.dt_PEREMPTION) < 0 ORDER BY t.dt_UPDATED DESC, f.str_DESCRIPTION ASC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION_FAMILLE"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_DESCRIPTION_GROSSISTE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_NUMBER"));

                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_NUM_LOT"));
                OEntityData.setStr_value8(String.valueOf(
                        this.getQuantiteResteWarehouse(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"))));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("dt_PEREMPTION"));
                OEntityData.setStr_value10("Périmé");
                OEntityData.setStr_value11(commonparameter.PROCESS_FAILED);
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_CIP"));

                lstEntityData.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;
    }

    // //fin liste des articles perimes
    // liste des articles perimes en cours
    public List<EntityData> listTFamillePerimeEncours(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime) { // bonne version

        int nbreJour = 0;
        String str_STATUT = "";
        String etat = "";
        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();
        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        TParameters OTParameters = null;
        EntityData OEntityData = null;
        long diff = 0;
        int monthPerime = 0;
        try {
            String dateJ = this.getKey().getoDay(dateMaxPerime);
            int JourDuMois = Integer.parseInt(dateJ);
            new logger().OCategory.info("dateJ " + dateJ + " JourDuMois " + JourDuMois);
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.dtUPDATED DESC, t.lgFAMILLEID.strNAME ASC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8,
                            this.getKey().getDayofSomeMonth(Integer.parseInt(OTParameters.getStrVALUE()), JourDuMois))
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .setParameter(6, commonparameter.statut_delete).getResultList();
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                str_STATUT = "";
                etat = "";
                diff = key.getDifferenceBetweenDate(new Date(), OTWarehouse.getDtPEREMPTION());
                monthPerime = Integer.parseInt(OTParameters.getStrVALUE());
                nbreJour = monthPerime * 30;
                new logger().OCategory.info("diff " + diff + " monthPerime " + monthPerime + " nbreJour " + nbreJour);

                if (0 < diff && diff < nbreJour) {
                    str_STATUT = "En cours de péremption";
                    etat = commonparameter.PROCESS_SUCCESS;
                    OEntityData = new EntityData();
                    OEntityData.setStr_value1(OTWarehouse.getLgWAREHOUSEID());
                    // OEntityData.setStr_value2(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
                    OEntityData.setStr_value2(OTWarehouse.getLgUSERID().getStrFIRSTNAME() + " "
                            + OTWarehouse.getLgUSERID().getStrLASTNAME());
                    OEntityData.setStr_value3(OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION());
                    OEntityData.setStr_value4(OTWarehouse.getLgGROSSISTEID().getStrLIBELLE());
                    OEntityData.setStr_value5(OTWarehouse.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE());
                    OEntityData.setStr_value6(String.valueOf(OTWarehouse.getIntNUMBER()));
                    OEntityData.setStr_value7(OTWarehouse.getIntNUMLOT());
                    OEntityData.setStr_value8(
                            String.valueOf(this.getQuantiteResteWarehouse(OTWarehouse.getLgWAREHOUSEID())));
                    OEntityData.setStr_value9(
                            this.getKey().DateToString(OTWarehouse.getDtPEREMPTION(), this.getKey().formatterShort));
                    OEntityData.setStr_value10(str_STATUT);
                    OEntityData.setStr_value11(etat);
                    OEntityData.setStr_value12(OTWarehouse.getLgFAMILLEID().getIntCIP());
                    lstEntityData.add(OEntityData);
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;
    }

    public List<EntityData> listTFamillePerimeEncours(String search_value, String lg_FAMILLE_ID) {
        List<EntityData> lstEntityData = new ArrayList<EntityData>();
        EntityData OEntityData = null;
        TParameters OTParameters = null;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            String qry = "SELECT t.lg_WAREHOUSE_ID, f.lg_FAMILLE_ID, t.int_NUM_LOT, t.int_NUMBER, t.int_NUMBER_GRATUIT, t.str_REF_LIVRAISON, t.dt_PEREMPTION, f.int_CIP, f.str_DESCRIPTION AS str_DESCRIPTION_FAMILLE, DATEDIFF(NOW(),t.dt_PEREMPTION) as ecart_peremption, g.str_DESCRIPTION AS str_DESCRIPTION_GROSSISTE FROM t_warehouse t, t_famille f, t_grossiste g where t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID and t.lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "' AND (f.str_DESCRIPTION LIKE '" + search_value + "%' OR f.int_CIP LIKE '"
                    + search_value + "%' OR f.int_EAN13 LIKE '" + search_value + "%') and t.str_STATUT NOT LIKE '"
                    + commonparameter.statut_delete
                    + "' AND (DATEDIFF(NOW(),t.dt_PEREMPTION) > 0 AND DATEDIFF(NOW(),t.dt_PEREMPTION) <= "
                    + (Integer.parseInt(OTParameters.getStrVALUE()) * 30)
                    + ") ORDER BY t.dt_UPDATED DESC, f.str_DESCRIPTION ASC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION_FAMILLE"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_DESCRIPTION_GROSSISTE"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_NUMBER"));

                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_NUM_LOT"));
                OEntityData.setStr_value8(String.valueOf(
                        this.getQuantiteResteWarehouse(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"))));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("dt_PEREMPTION"));
                OEntityData.setStr_value10("En cours de péremption");
                OEntityData.setStr_value11(commonparameter.PROCESS_SUCCESS);
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("int_CIP"));

                lstEntityData.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;

    }

    // //fin liste des articles perimes en cours
    public List<TWarehouse> listTFamillePerimePerDateBis(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime, String lg_GROSSISTE_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();
        TParameters OTParameters = null;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            new logger().OCategory.info(
                    "search_value  " + search_value + " dans la fonction listTFamillePerimePerDate lg_FAMILLE_ID :"
                            + lg_FAMILLE_ID + " Jour maxi périmé " + OTParameters.getStrVALUE());

            // lstTWarehouse = this.getOdataManager().getEm().createQuery("SELECT t FROM TWarehouse t WHERE
            // t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION <= ?2) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR
            // t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 ORDER BY t.lgFAMILLEID.strNAME DESC")
            // .setParameter(1, lg_FAMILLE_ID).setParameter(2,
            // this.getKey().getDayofSomeMonth(Integer.parseInt(OTParameters.getStrVALUE()),
            // JourDuMois)).setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value +
            // "%").setParameter(6, commonparameter.statut_delete).getResultList();
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT NOT LIKE ?6 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?9 ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(9, lg_GROSSISTE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8, dateMaxPerime).setParameter(3, "%" + search_value + "%")
                    .setParameter(4, "%" + search_value + "%").setParameter(6, commonparameter.statut_delete)
                    .getResultList();
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                new logger().OCategory.info("Famille " + OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION()
                        + " Date Péremption " + OTWarehouse.getDtPEREMPTION());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    public List<TWarehouse> listTFamillePerimePerDateBis(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime, String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID) { // last good version

        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();
        TParameters OTParameters = null;

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            OTParameters = new TparameterManager(this.getOdataManager()).getParameter("KEY_MONTH_PERIME");
            new logger().OCategory.info(
                    "search_value  " + search_value + " dans la fonction listTFamillePerimePerDate lg_FAMILLE_ID :"
                            + lg_FAMILLE_ID + " Jour maxi périmé " + OTParameters.getStrVALUE());

            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtPEREMPTION BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4) AND t.strSTATUT NOT LIKE ?6 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?9 AND t.lgFAMILLEID.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?10 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?11 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?12 ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(9, lg_GROSSISTE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8, dateMaxPerime).setParameter(3, search_value + "%")
                    .setParameter(4, search_value + "%").setParameter(6, commonparameter.statut_delete)
                    .setParameter(10, lg_FABRIQUANT_ID).setParameter(11, lg_FAMILLEARTICLE_ID)
                    .setParameter(12, lg_ZONE_GEO_ID).getResultList();
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                new logger().OCategory.info("Famille " + OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION()
                        + " Date Péremption " + OTWarehouse.getDtPEREMPTION());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    public List<TWarehouse> listTFamilleSendToPerime(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime, String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtUPDATED >= ?7 AND t.dtUPDATED <=?8) AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4) AND t.strSTATUT = ?6 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?9 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?11 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?12 ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC, t.dtUPDATED DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(9, lg_GROSSISTE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8, dateMaxPerime).setParameter(3, search_value + "%")
                    .setParameter(4, search_value + "%").setParameter(6, commonparameter.statut_delete)
                    .setParameter(11, lg_FAMILLEARTICLE_ID).setParameter(12, lg_ZONE_GEO_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des périmés " + lstTWarehouse.size());
        return lstTWarehouse;
    }
    // fin liste des produits périmés

    // quantité de périmé d'un article
    public int getQauntityPerimeByArticle(String search_value, Date dtDEBUT, Date dtFin, String lg_FAMILLE_ID,
            String lg_GROSSISTE_ID) {

        int result = 0;
        List<TWarehouse> lstTWarehouse = new ArrayList<>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            // lstTWarehouse = this.listTFamillePerimePerDate(search_value, lg_FAMILLE_ID, dtDEBUT, dtFin);
            lstTWarehouse = this.listTFamillePerimePerDateBis(search_value, lg_FAMILLE_ID, dtDEBUT, dtFin,
                    lg_GROSSISTE_ID);
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                result += this.getQuantiteResteWarehouse(OTWarehouse.getLgWAREHOUSEID());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("result:" + result);
        return result;
    }

    // fin quantité de périmé d'un article
    // liste des entrées en stock d'un produit
    public List<TWarehouse> listeWarehouse(String search_value, String lg_FAMILLE_ID, Date dtDEBUT, Date dtFIN,
            String lg_GROSSISTE_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            // new logger().OCategory.info("search_value " + search_value + " dans la fonction listeWarehouse
            // lg_FAMILLE_ID :" + lg_FAMILLE_ID);
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtCREATED BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) AND t.strSTATUT LIKE ?6 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?9 ORDER BY t.lgGROSSISTEID.strLIBELLE, t.dtCREATED DESC, t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(9, lg_GROSSISTE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8, dtFIN).setParameter(3, "%" + search_value + "%")
                    .setParameter(4, "%" + search_value + "%").setParameter(6, commonparameter.statut_enable)
                    .getResultList();

        } catch (Exception e) {
            // e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des entrées " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    public List<TWarehouse> listeWarehouse(String search_value, String lg_FAMILLE_ID, Date dtDEBUT, Date dtFIN,
            String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {

        List<TWarehouse> lstTWarehouse = new ArrayList<>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtCREATED >= ?7 AND t.dtCREATED <=?8) AND (t.lgFAMILLEID.strNAME LIKE ?4 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4) AND t.strSTATUT LIKE ?6 AND t.lgGROSSISTEID.lgGROSSISTEID LIKE ?9 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?11 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?12 ORDER BY t.strREFLIVRAISON, t.lgGROSSISTEID.strLIBELLE, t.dtCREATED DESC, t.lgFAMILLEID.strNAME")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(9, lg_GROSSISTE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8, dtFIN).setParameter(4, search_value + "%")
                    .setParameter(6, commonparameter.statut_enable).setParameter(11, lg_FAMILLEARTICLE_ID)
                    .setParameter(12, lg_ZONE_GEO_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des entrées " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    public List<TWarehouse> listeWarehouses(String search_value, String lg_FAMILLE_ID, String dtDEBUT, String dtFIN,
            String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID,
            boolean all, int start, int limit) {

        List<TWarehouse> lstTWarehouse = new ArrayList<>();

        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TWarehouse> cq = cb.createQuery(TWarehouse.class);
            Root<TWarehouse> root = cq.from(TWarehouse.class);
            Join<TWarehouse, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            if (!"".equals(lg_FAMILLE_ID) && !"%%".equals(lg_FAMILLE_ID)) {
                criteria = cb.and(criteria, cb.equal(jf.get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            }
            if (!"".equals(search_value) && !"%%".equals(search_value)) {
                criteria = cb.and(criteria,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%")));
            }
            if (!"".equals(lg_GROSSISTE_ID) && !"%%".equals(lg_GROSSISTE_ID)) {
                Join<TWarehouse, TGrossiste> g = root.join("lgGROSSISTEID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(g.get("lgGROSSISTEID"), lg_GROSSISTE_ID));
            }
            if (!"".equals(lg_FAMILLEARTICLE_ID) && !"%%".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> a = jf.join("lgFAMILLEARTICLEID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(a.get("lgFAMILLEARTICLEID"), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID) && !"%%".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> a = jf.join("lgZONEGEOID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(a.get("lgZONEGEOID"), lg_ZONE_GEO_ID));
            }

            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get("dtCREATED")),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFIN));
            criteria = cb.and(criteria, btw);
            criteria = cb.and(criteria, cb.equal(root.get("strSTATUT"), commonparameter.statut_enable));
            cq.select(root).orderBy(cb.asc(root.get(TWarehouse_.strREFLIVRAISON)),
                    cb.asc(jf.get(TFamille_.strDESCRIPTION)), cb.desc(root.get(TWarehouse_.dtCREATED)));// RDER BY
                                                                                                        // t.strREFLIVRAISON,
                                                                                                        // t.lgGROSSISTEID.strLIBELLE,
                                                                                                        // t.dtCREATED
                                                                                                        // DESC,
                                                                                                        // t.lgFAMILLEID.strNAME
            cq.where(criteria);

            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);

            }
            lstTWarehouse = q.getResultList();
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des entrées " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    public int listeWarehouses(String search_value, String lg_FAMILLE_ID, String dtDEBUT, String dtFIN,
            String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID, String lg_ZONE_GEO_ID) {
        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TWarehouse> root = cq.from(TWarehouse.class);
            Join<TWarehouse, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            if (!"".equals(search_value) && !"%%".equals(search_value)) {
                criteria = cb.and(criteria,
                        cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), search_value + "%"),
                                cb.like(jf.get(TFamille_.intCIP), search_value + "%"),
                                cb.like(jf.get(TFamille_.intEAN13), search_value + "%")));
            }
            if (!"".equals(lg_GROSSISTE_ID) && !"%%".equals(lg_GROSSISTE_ID)) {
                Join<TWarehouse, TGrossiste> g = root.join("lgGROSSISTEID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(g.get("lgGROSSISTEID"), lg_GROSSISTE_ID));
            }
            if (!"".equals(lg_FAMILLEARTICLE_ID) && !"%%".equals(lg_FAMILLEARTICLE_ID)) {
                Join<TFamille, TFamillearticle> a = jf.join("lgFAMILLEARTICLEID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(a.get("lgFAMILLEARTICLEID"), lg_FAMILLEARTICLE_ID));
            }
            if (!"".equals(lg_ZONE_GEO_ID) && !"%%".equals(lg_ZONE_GEO_ID)) {
                Join<TFamille, TZoneGeographique> a = jf.join("lgZONEGEOID", JoinType.INNER);
                criteria = cb.and(criteria, cb.equal(a.get("lgZONEGEOID"), lg_ZONE_GEO_ID));
            }
            if (!"".equals(lg_FAMILLE_ID) && !"%%".equals(lg_FAMILLE_ID)) {
                criteria = cb.and(criteria, cb.equal(jf.get(TFamille_.lgFAMILLEID), lg_FAMILLE_ID));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get("dtCREATED")),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFIN));
            criteria = cb.and(criteria, btw);
            criteria = cb.and(criteria, cb.equal(root.get("strSTATUT"), commonparameter.statut_enable));
            cq.select(cb.count(root));
            cq.where(criteria);

            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } finally {

        }

    }

    // fin liste des entrées en stock d'un produit
    // liste des entrées en stock d'un produit
    public List<TWarehouse> listeWarehousePerimeOrNot(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dtFIN) {

        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            new logger().OCategory.info("search_value  " + search_value
                    + " dans la fonction listeWarehouse lg_FAMILLE_ID :" + lg_FAMILLE_ID);

            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtCREATED BETWEEN ?7 AND ?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4) ORDER BY t.lgFAMILLEID.strNAME DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(7, dtDEBUT).setParameter(8, dtFIN)
                    .setParameter(3, "%" + search_value + "%").setParameter(4, "%" + search_value + "%")
                    .getResultList();
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                new logger().OCategory
                        .info("Famille " + OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION() + " Date d'entrée "
                                + OTWarehouse.getDtCREATED() + " User " + OTWarehouse.getLgUSERID().getLgUSERID());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("Liste des entrées " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    // //fin destocker stock rayon retour fournisseur
    // quantité restante d'un produit livré
    public int getTWarehousedetailRemain(String str_REF_LIVRAISON, String lg_FAMILLE_ID) {
        List<TWarehousedetail> lstProduct = new ArrayList<>();
        int result = 0;
        try {
            lstProduct = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehousedetail t WHERE t.lgWAREHOUSEID.strREFLIVRAISON = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 ORDER BY t.dtPEREMPTION ASC")
                    .setParameter(1, str_REF_LIVRAISON).setParameter(2, lg_FAMILLE_ID).getResultList();
            result = lstProduct.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result " + result);
        return result;
    }

    public List<Object[]> listeEtatControleAchat(String search_value, String dtDEBUT, String dtFIN,
            String lg_GROSSISTE_ID) {

        List<Object[]> lstEntityData = new ArrayList<>();

        try {

            String qry = "SELECT t_bon_livraison.str_REF_LIVRAISON, t_bon_livraison.dt_DATE_LIVRAISON, t_bon_livraison.int_MHT, t_bon_livraison.int_TVA, t_bon_livraison.int_HTTC, t_order.str_REF_ORDER, t_grossiste.str_LIBELLE, t_bon_livraison.dt_UPDATED, t_user.str_FIRST_NAME, t_user.str_LAST_NAME, t_bon_livraison.lg_BON_LIVRAISON_ID, (SELECT CASE WHEN SUM(bld.int_QTE_RETURN * bld.int_PAF) IS NOT NULL THEN SUM(bld.int_QTE_RETURN * bld.int_PAF) ELSE 0 END FROM t_bon_livraison_detail bld WHERE bld.lg_BON_LIVRAISON_ID = t_bon_livraison.lg_BON_LIVRAISON_ID ) AS MONTANT_AVOIR FROM t_bon_livraison INNER JOIN t_order ON (t_bon_livraison.lg_ORDER_ID = t_order.lg_ORDER_ID) INNER JOIN t_grossiste ON (t_order.lg_GROSSISTE_ID = t_grossiste.lg_GROSSISTE_ID) INNER JOIN t_user ON (t_bon_livraison.lg_USER_ID = t_user.lg_USER_ID) WHERE t_order.lg_GROSSISTE_ID LIKE '"
                    + lg_GROSSISTE_ID + "' AND (DATE(t_bon_livraison.dt_DATE_LIVRAISON) >= '" + dtDEBUT
                    + "' AND DATE(t_bon_livraison.dt_DATE_LIVRAISON) <= '" + dtFIN
                    + "') AND (t_bon_livraison.str_REF_LIVRAISON LIKE '" + search_value
                    + "%' OR t_order.str_REF_ORDER LIKE '" + search_value + "%') AND (t_bon_livraison.str_STATUT = '"
                    + commonparameter.statut_is_Closed + "' OR t_bon_livraison.str_STATUT = '"
                    + DateConverter.STATUT_DELETE
                    + "')  ORDER BY t_grossiste.str_LIBELLE ASC, t_bon_livraison.dt_DATE_LIVRAISON DESC";
            new logger().OCategory.info(qry);
            lstEntityData = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille" + lstEntityData.size());
        return lstEntityData;
    }

    public List<Object[]> listeEtatControleAchat(String search_value, String dtDEBUT, String dtFIN,
            String lg_GROSSISTE_ID, int start, int limit) {

        List<Object[]> lstEntityData = new ArrayList<>();

        try {

            String qry = "SELECT t_bon_livraison.str_REF_LIVRAISON, t_bon_livraison.dt_DATE_LIVRAISON, t_bon_livraison.int_MHT, t_bon_livraison.int_TVA, t_bon_livraison.int_HTTC, t_order.str_REF_ORDER, t_grossiste.str_LIBELLE, t_bon_livraison.dt_UPDATED, t_user.str_FIRST_NAME, t_user.str_LAST_NAME, t_bon_livraison.lg_BON_LIVRAISON_ID, (SELECT CASE WHEN SUM(bld.int_QTE_RETURN * bld.int_PAF) IS NOT NULL THEN SUM(bld.int_QTE_RETURN * bld.int_PAF) ELSE 0 END FROM t_bon_livraison_detail bld WHERE bld.lg_BON_LIVRAISON_ID = t_bon_livraison.lg_BON_LIVRAISON_ID ) AS MONTANT_AVOIR,t_grossiste.lg_GROSSISTE_ID,t_bon_livraison.str_STATUT FROM t_bon_livraison INNER JOIN t_order ON (t_bon_livraison.lg_ORDER_ID = t_order.lg_ORDER_ID) INNER JOIN t_grossiste ON (t_order.lg_GROSSISTE_ID = t_grossiste.lg_GROSSISTE_ID) INNER JOIN t_user ON (t_bon_livraison.lg_USER_ID = t_user.lg_USER_ID) WHERE t_order.lg_GROSSISTE_ID LIKE '"
                    + lg_GROSSISTE_ID + "' AND (DATE(t_bon_livraison.dt_DATE_LIVRAISON) >= '" + dtDEBUT
                    + "' AND DATE(t_bon_livraison.dt_DATE_LIVRAISON) <= '" + dtFIN
                    + "') AND (t_bon_livraison.str_REF_LIVRAISON LIKE '" + search_value
                    + "%' OR t_order.str_REF_ORDER LIKE '" + search_value
                    + "%'  OR `t_bon_livraison`.`lg_BON_LIVRAISON_ID` IN (SELECT tb.`lg_BON_LIVRAISON_ID` FROM `t_bon_livraison_detail` tb,`t_famille` f WHERE f.`lg_FAMILLE_ID`=`tb`.`lg_FAMILLE_ID` AND (f.`str_NAME` LIKE '%"
                    + search_value + "%' OR f.`int_CIP` LIKE '%" + search_value
                    + "%' )))  AND (t_bon_livraison.str_STATUT = '" + commonparameter.statut_is_Closed
                    + "' OR t_bon_livraison.str_STATUT = '" + DateConverter.STATUT_DELETE
                    + "')  ORDER BY t_grossiste.str_LIBELLE ASC, t_bon_livraison.dt_DATE_LIVRAISON DESC LIMIT " + start
                    + "," + limit;

            new logger().OCategory.info(qry);
            lstEntityData = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstEntityData taille" + lstEntityData.size());
        return lstEntityData;
    }

    // fin liste des etats de controle d'achat
    // liste des etats de controles d'un article detail en fonction d'un grossiste
    public List<EntityData> listeEtatControleAchatDetaille(String search_value, String dtDEBUT, String dtFIN,
            String lg_GROSSISTE_ID) {

        List<EntityData> lstEntityData = new ArrayList<EntityData>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT * FROM v_etat_controle_achat WHERE v_etat_controle_achat.lg_GROSSISTE_ID LIKE '"
                    + lg_GROSSISTE_ID + "' AND (v_etat_controle_achat.dt_DATE_LIVRAISON > '" + dtDEBUT
                    + "' AND v_etat_controle_achat.dt_DATE_LIVRAISON <= '" + dtFIN
                    + "') AND (v_etat_controle_achat.str_DESCRIPTION LIKE '" + search_value
                    + "%' OR v_etat_controle_achat.int_CIP LIKE '" + search_value
                    + "%' OR v_etat_controle_achat.int_EAN13 LIKE '" + search_value
                    + "%') ORDER BY v_etat_controle_achat.str_LIBELLE ASC, v_etat_controle_achat.dt_DATE_LIVRAISON DESC, v_etat_controle_achat.str_DESCRIPTION ASC";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                EntityData OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_REF_ORDER"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_REF_LIVRAISON"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("int_MHT"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("int_HTTC"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("dt_DATE_LIVRAISON"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_TVA"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value9(Ojconnexion.get_resultat().getString("int_QTE_CMDE"));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("int_QTE_RECUE"));
                OEntityData.setStr_value11(Ojconnexion.get_resultat().getString("str_LIBELLE"));
                OEntityData.setStr_value12(Ojconnexion.get_resultat().getString("str_FIRST_NAME") + " "
                        + Ojconnexion.get_resultat().getString("str_LAST_NAME"));
                lstEntityData.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstEntityData " + lstEntityData.size());
        return lstEntityData;
    }
    // fin etat de controle d achat detail

    // quantite livrée d'un article
    public int getQuantiteLivreByArticleAndCommande(String str_REF_ORDER, String lg_FAMILLE_ID) {
        List<TWarehouse> lstTWarehouse = new ArrayList<>();
        int result = 0;
        try {
            lstTWarehouse = this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TWarehouse t WHERE t.strREFORDER = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2")
                    .setParameter(1, str_REF_ORDER).setParameter(2, lg_FAMILLE_ID).getResultList();
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                result += OTWarehouse.getIntNUMBER();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result getQuantiteLivreByArticleAndCommande " + result);
        return result;
    }
    // fin quantite livrée d'un article

    // liste de l'evolution du stock d'un article
    public List<TMouvementSnapshot> listTMouvementSnapshot(String search_value, String lg_FAMILLE_ID, Date dtDEBUT,
            Date dateMaxPerime, String lg_GROSSISTE_ID, String lg_FABRIQUANT_ID, String lg_FAMILLEARTICLE_ID,
            String lg_ZONE_GEO_ID) {

        List<TMouvementSnapshot> lstTMouvementSnapshot = new ArrayList<>();

        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTMouvementSnapshot = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.dtCREATED >= ?7 AND t.dtCREATED <=?8) AND (t.lgFAMILLEID.strNAME LIKE ?3 OR t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4) AND t.strSTATUT NOT LIKE ?6 AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?9 AND t.lgFAMILLEID.lgFABRIQUANTID.lgFABRIQUANTID LIKE ?10 AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?11 AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?12 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(9, lg_GROSSISTE_ID).setParameter(7, dtDEBUT)
                    .setParameter(8, dateMaxPerime).setParameter(3, search_value + "%")
                    .setParameter(4, search_value + "%").setParameter(6, commonparameter.statut_delete)
                    .setParameter(10, lg_FABRIQUANT_ID).setParameter(11, lg_FAMILLEARTICLE_ID)
                    .setParameter(12, lg_ZONE_GEO_ID).getResultList();
            for (TMouvementSnapshot OTMouvementSnapshot : lstTMouvementSnapshot) {
                new logger().OCategory.info("Famille " + OTMouvementSnapshot.getLgFAMILLEID().getStrDESCRIPTION());
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTMouvementSnapshot taille " + lstTMouvementSnapshot.size());
        return lstTMouvementSnapshot;
    }
    // fin liste de l'evolution du stock d'un article

    // liste des warehouses par famille et bon de livraison
    public List<TWarehouse> getWarehouseByFamilleAndBonL(String lg_FAMILLE_ID, String str_REF_LIVRAISON) {
        List<TWarehouse> lstTWarehouse = new ArrayList<TWarehouse>();
        try {
            new logger().OCategory.info("lg_FAMILLE_ID " + lg_FAMILLE_ID + " str_REF_LIVRAISON " + str_REF_LIVRAISON);
            lstTWarehouse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TWarehouse t WHERE t.strREFLIVRAISON = ?1 AND (t.strSTATUT = ?2 OR t.strSTATUT = ?3) AND t.lgFAMILLEID.lgFAMILLEID LIKE ?4")
                    .setParameter(1, str_REF_LIVRAISON).setParameter(4, lg_FAMILLE_ID)
                    .setParameter(2, commonparameter.statut_enable).setParameter(3, commonparameter.statut_expire)
                    .getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTWarehouse taille " + lstTWarehouse.size());
        return lstTWarehouse;
    }

    // fin liste des warehouses par famille et bon de livraison
    // fin liste des etats de controles d'un article en fonction d'un grossiste
    // prix d'achat total d'une suggestion
    public int getPriceTotalAchat(List<TSuggestionOrderDetails> lstTSuggestionOrderDetails) {
        int result = 0;
        try {
            for (TSuggestionOrderDetails OTSuggestionOrderDetails : lstTSuggestionOrderDetails) {
                result += OTSuggestionOrderDetails.getIntPRICE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin prix d'achat total d'une suggestion

    // prix de vente total d'une suggestion
    public int getPriceTotalVente(List<TSuggestionOrderDetails> lstTSuggestionOrderDetails) {
        int result = 0;
        try {
            result = lstTSuggestionOrderDetails.stream()
                    .map((OTSuggestionOrderDetails) -> OTSuggestionOrderDetails.getIntPRICEDETAIL()
                            * OTSuggestionOrderDetails.getIntNUMBER())
                    .reduce(result, Integer::sum);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin prix de vente total d'une suggestion

    // suppresion de suggestion detail
    public boolean removeSuggestionDetail(String lg_SUGGESTION_ORDER_DETAILS_ID) {
        boolean result = false;
        TSuggestionOrder OTSuggestionOrder;
        try {
            EntityManager em = this.getOdataManager().getEm();
            Stock stock = new StockImpl(em);
            TSuggestionOrderDetails OTSuggestionOrderDetails = em.find(TSuggestionOrderDetails.class,
                    lg_SUGGESTION_ORDER_DETAILS_ID);
            OTSuggestionOrder = OTSuggestionOrderDetails.getLgSUGGESTIONORDERID();
            TFamille Of = OTSuggestionOrderDetails.getLgFAMILLEID();
            this.getOdataManager().getEm().remove(OTSuggestionOrderDetails);
            OTSuggestionOrder.setDtUPDATED(new Date());
            try {
                stock.setStatusInOrder(Of.getLgFAMILLEID());
            } catch (Exception e) {
                e.printStackTrace();
            }

            if (this.persiste(OTSuggestionOrder)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de l'opération");
            }
        } catch (Exception e) {
            System.out
                    .println("------------>>>>>>>>>>>>>>> Error !! suppression : lg_SUGGESTION_ORDER_DETAILS_ID >>>>>: "
                            + lg_SUGGESTION_ORDER_DETAILS_ID);
            this.buildErrorTraceMessage("Echec de l'opération");
            e.printStackTrace();
        }
        return result;
    }
    // fin suppresion de suggestion detail

    // derniere bonne version de la liste des perimes
    public JSONArray getListePerimes(String search_value, String str_TYPE_TRANSACTION, String str_TRI, int start,
            int limit, boolean all) {
        JSONArray json = new JSONArray();
        EntityManager em = this.getOdataManager().getEm();
        try {
            TParameters OTParameters = em.getReference(TParameters.class, "KEY_MONTH_PERIME");
            int int_NUMBER = 0;
            String ORDER = "";
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TWarehouse> root = cq.from(TWarehouse.class);
            Join<TWarehouse, TFamille> pr = root.join("lgFAMILEID", JoinType.INNER);
            if (str_TYPE_TRANSACTION.equals(Parameter.KEY_PARAM_PERIME)) {

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }

    public List<EntityData> getListePerime(String search_value, String str_TYPE_TRANSACTION, String str_TRI) {

        List<EntityData> lstEntityData = new ArrayList<>();
        EntityData OEntityData = null;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        TParameters OTParameters = OTparameterManager.getParameter("KEY_MONTH_PERIME");
        int int_NUMBER = 0;
        String ORDER = "";
        try {

            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();

            if (OTParameters != null) {
                int_NUMBER = Integer.parseInt(OTParameters.getStrVALUE()) * 30;
            }
            if (!str_TRI.equalsIgnoreCase("")) {
                ORDER = "v." + str_TRI + ",";
            }

            String qry = "SELECT * FROM v_perime v WHERE v.ecart_date <= " + int_NUMBER + " AND v.str_STATUT NOT LIKE '"
                    + commonparameter.statut_delete + "' AND (v.int_CIP LIKE '" + search_value
                    + "%' OR v.str_DESCRIPTION_ARTICLE LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '"
                    + search_value + "%') ORDER BY " + ORDER + " v.str_DESCRIPTION_ARTICLE ASC";
            if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.KEY_PARAM_PERIME)) {
                qry = "SELECT * FROM v_perime v WHERE v.ecart_date <= 0 AND v.str_STATUT NOT LIKE '"
                        + commonparameter.statut_delete + "' AND (v.int_CIP LIKE '" + search_value
                        + "%' OR v.str_DESCRIPTION_ARTICLE LIKE '" + search_value + "%' OR v.int_EAN13 LIKE '"
                        + search_value + "%') ORDER BY " + ORDER + " v.str_DESCRIPTION_ARTICLE ASC";
            } else if (str_TYPE_TRANSACTION.equalsIgnoreCase(Parameter.KEY_PERIMER_ENCOURS)) {
                qry = "SELECT * FROM v_perime v WHERE (v.ecart_date > 0 AND v.ecart_date <= " + int_NUMBER
                        + ") AND v.str_STATUT NOT LIKE '" + commonparameter.statut_delete + "' AND (v.int_CIP LIKE '"
                        + search_value + "%' OR v.str_DESCRIPTION_ARTICLE LIKE '" + search_value
                        + "%' OR v.int_EAN13 LIKE '" + search_value + "%') ORDER BY " + ORDER
                        + " v.str_DESCRIPTION_ARTICLE ASC";
            }
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();

            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("lg_WAREHOUSE_ID"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_FISRT_LAST_NAME"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_DESCRIPTION_ARTICLE"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_CIP"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("int_NUMBER"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("int_NUM_LOT"));
                OEntityData.setStr_value8(Ojconnexion.get_resultat().getString("int_RESTE"));
                OEntityData.setStr_value9(date.DateToString(
                        date.stringToDate(Ojconnexion.get_resultat().getString("dt_PEREMPTION"), date.formatterMysql),
                        date.formatterShort));
                OEntityData.setStr_value10(Ojconnexion.get_resultat().getString("ecart_date"));
                if (Integer.parseInt(OEntityData.getStr_value10()) <= 0) {
                    OEntityData.setStr_value11("Périmé");
                    OEntityData.setStr_value12(commonparameter.PROCESS_FAILED);
                } else {
                    OEntityData.setStr_value11("En cours de péremption");
                    OEntityData.setStr_value12(commonparameter.PROCESS_SUCCESS);
                }
                OEntityData.setStr_value13(Ojconnexion.get_resultat().getString("ecart_date"));
                lstEntityData.add(OEntityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Liste des périmés " + lstEntityData.size());
        return lstEntityData;
    }

    // fin derniere bonne version de la liste des perimes
    // destocker stock rayon retour fournisseur
    public boolean destockRayonByRetourFournisseur(TFamille OTFamille, String str_REF_LIVRAISON, int int_QUANTITY,
            String lg_GROSSISTE_ID) {
        boolean result = false;
        String lg_TYPE_STOCK_ID = "1";
        List<TWarehousedetail> lstTWarehousedetail;
        int qte_retour = 0;
        try {
            if (OTFamille != null) {

                new logger().OCategory.info("Famille " + OTFamille.getStrNAME());

                TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getTProductItemStock(OTFamille.getLgFAMILLEID());
                new logger().OCategory.info("Ancienne quantité " + OTFamilleStock.getIntNUMBERAVAILABLE());
                //
                lstTWarehousedetail = this.listeTWarehousedetail(OTFamille.getLgFAMILLEID(), str_REF_LIVRAISON);

                if (int_QUANTITY < lstTWarehousedetail.size()) {
                    qte_retour = int_QUANTITY;
                } else {
                    qte_retour = lstTWarehousedetail.size();
                }

                for (int i = 0; i < qte_retour; i++) {
                    this.deleteProductItemInWarehouseDetail(lstTWarehousedetail.get(i).getLgWAREHOUSEDETAILID());
                }
                // ajouté le 29/06/2016
                qte_retour = int_QUANTITY;

                TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                        .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, OTFamille.getLgFAMILLEID());
                OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - qte_retour);
                OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                new logger().OCategory.info("Nouvelle quantité " + OTFamilleStock.getIntNUMBERAVAILABLE());
                OTFamilleStock.setDtUPDATED(new Date());
                // this.persiste(OTFamilleStock);
                OTTypeStockFamille.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                OTTypeStockFamille.setDtUPDATED(new Date());
                this.persiste(OTTypeStockFamille);

                try {
                    /*
                     * if (new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementFamille(OTFamille,
                     * lg_GROSSISTE_ID, commonparameter.REMOVE, commonparameter.str_ACTION_RETOURFOURNISSEUR,
                     * qte_retour, this.getOTUser().getLgEMPLACEMENTID()) != null) { // a decommenter en cas de probleme
                     * 07/02/2017 result = true; new
                     * suggestionManagement(this.getOdataManager()).makeSuggestionAuto(OTFamilleStock);
                     * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); }
                     */

                    // code ajouté 07/02/2017
                    if (new SnapshotManager(this.getOdataManager(), this.getOTUser()).createSnapshotMouvementArticle(
                            OTFamille, qte_retour, commonparameter.REMOVE,
                            commonparameter.str_ACTION_RETOURFOURNISSEUR) != null) {
                        result = true;
                        new suggestionManagement(this.getOdataManager()).makeSuggestionAuto(OTFamilleStock);
                        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    }
                    // fin code ajouté 07/02/2017
                } catch (Exception e) {
                    e.printStackTrace();
                    this.buildErrorTraceMessage("Echec du déstockage de ce produit");
                }

            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération du retour fournisseur");
        }
        return result;
    }

    // fin destocker stock rayon retour fournisseur
    // generer les donnees pour la gestion des etiquettes
    public List<EntityData> generateDataForEtiquette(String lg_FAMILLE_ID, String str_REF_LIVRAISON) {
        List<EntityData> lstEntityData = new ArrayList<>();
        List<TWarehouse> lstTWarehouse;
        List<String> data = new ArrayList<>();
        String fileBarecode;
        EntityData OEntityData;
        String dateToday = date.DateToString(new Date(), date.formatterShortBis);
        try {
            TOfficine oTOfficine = this.getOdataManager().getEm().find(dal.TOfficine.class, "1");
            lstTWarehouse = this.getWarehouseByFamilleAndBonL(lg_FAMILLE_ID, str_REF_LIVRAISON);
            for (TWarehouse OTWarehouse : lstTWarehouse) {
                this.getOdataManager().getEm().refresh(OTWarehouse.getLgFAMILLEID());
                if (data.isEmpty()) {
                    for (int i = 0; i < OTWarehouse.getIntNUMBER(); i++) {
                        OEntityData = new EntityData();
                        data.add(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
                        fileBarecode = DateConverter.buildbarcodeOther(OTWarehouse.getLgFAMILLEID().getIntCIP(),
                                jdom.barecode_file + this.getKey().getComplexId() + ".gif");
                        OEntityData.setStr_value1(oTOfficine.getStrNOMABREGE());
                        OEntityData.setStr_value2(OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION());
                        OEntityData.setStr_value3(fileBarecode);
                        OEntityData.setStr_value4(
                                conversion.AmountFormat(OTWarehouse.getLgFAMILLEID().getIntPRICE(), ' ') + " CFA");
                        OEntityData.setStr_value5(dateToday);
                        OEntityData.setStr_value6(OTWarehouse.getLgFAMILLEID().getIntCIP());
                        lstEntityData.add(OEntityData);
                    }

                } else {
                    if (!data.get(0).equalsIgnoreCase(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID())) {
                        DateConverter.buildbarcodeOther(OTWarehouse.getLgFAMILLEID().getIntCIP(),
                                jdom.barecode_file + this.getKey().getComplexId() + ".gif");
                        data.clear();
                        data.add(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
                    }

                    for (int i = 0; i < OTWarehouse.getIntNUMBER(); i++) {
                        OEntityData = new EntityData();
                        fileBarecode = DateConverter.buildbarcodeOther(OTWarehouse.getLgFAMILLEID().getIntCIP(),
                                jdom.barecode_file + this.getKey().getComplexId() + ".gif");
                        OEntityData.setStr_value1(oTOfficine.getStrNOMABREGE());
                        OEntityData.setStr_value2(OTWarehouse.getLgFAMILLEID().getStrDESCRIPTION());
                        OEntityData.setStr_value3(fileBarecode);
                        OEntityData.setStr_value4(
                                conversion.AmountFormat(OTWarehouse.getLgFAMILLEID().getIntPRICE(), ' ') + " CFA");
                        OEntityData.setStr_value5(dateToday);
                        OEntityData.setStr_value6(OTWarehouse.getLgFAMILLEID().getIntCIP());
                        lstEntityData.add(OEntityData);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace(System.err);
        }
        new logger().OCategory.info("lstEntityData taille " + lstEntityData.size());
        return lstEntityData;
    }
    // fin generer les donnees pour la gestion des etiquettes

    // fonction pour verifier si le produit est dans le processus de commande cad suggession ou commande en cour,passes
    public boolean isCommandProcess11(String lgFamilleID) {
        boolean isExist = false;
        try {
            String query = "SELECT COUNT(f.`lg_FAMILLE_ID`) AS NB FROM t_famille f WHERE  f.`lg_FAMILLE_ID`='"
                    + lgFamilleID
                    + "' AND (f.`lg_FAMILLE_ID` IN (SELECT sg.`lg_FAMILLE_ID` FROM t_suggestion_order_details sg WHERE sg.`str_STATUT`='is_Process' ) OR f.`lg_FAMILLE_ID` IN (SELECT d.`lg_FAMILLE_ID` FROM t_order_detail d,t_order o WHERE o.`lg_ORDER_ID`=d.`lg_ORDER_ID` AND (o.`str_STATUT`='passed' OR o.`str_STATUT`='is_Process')))";
            long count = (long) this.getOdataManager().getEm().createNativeQuery(query).setMaxResults(1)
                    .getSingleResult();

            if (count > 0) {
                isExist = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return isExist;
    }

    public int isCommandProcess(String lgFamilleID) {

        bonLivraisonManagement bl = new bonLivraisonManagement(this.getOdataManager());
        int status = bl.articleStatus(lgFamilleID);

        return status;
    }

    // ajout de en masse
    public void AddLotInBulk(List<TBonLivraisonDetail> lstTBonLivraisonDetail) {
        try {
            lstTBonLivraisonDetail.forEach((OBonLivraisonDetail) -> {

                TLot OTLot = getLot(OBonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON());
                if (OTLot == null) {
                    OTLot = this.createTLot(OBonLivraisonDetail.getLgFAMILLEID(), OBonLivraisonDetail.getIntQTECMDE(),
                            OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                            OBonLivraisonDetail.getLgGROSSISTEID(),
                            OBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER(), 0);

                    new orderManagement(this.getOdataManager(), this.getOTUser())
                            .UpdateTBonLivraisonDetailFromBonLivraison(OBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                                    OTLot.getIntNUMBER(), OTLot.getIntNUMBERGRATUIT());
                }
            });

            // TEtiquette OTEtiquette = new
            // StockManager(this.getOdataManager()).createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID(),
            // OTWarehouse.getLgFAMILLEID().getLgFAMILLEID(), OTWarehouse.getLgWAREHOUSEID());
            // OTLot.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private TLot getLot(String lg_FAMILLE_ID, String lg_LIVRAISON_ID) {
        TLot lot = null;
        try {
            List<TLot> list = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TLot o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.strREFLIVRAISON =?2")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_LIVRAISON_ID).setMaxResults(1).getResultList();
            if (!list.isEmpty()) {
                lot = list.get(0);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lot;
    }

    public TSnapShopDalySortieFamille BuildTSnapShopDalySortieFamille(TFamille OTFamille, Integer int_balance,
            Integer int_entree, Integer int_sortie) {
        TSnapShopDalySortieFamille OTSnapShopDalySortieFamille = null;
        try {
            Date dt_Date_debut, dt_Date_Fin;
            String Date_debut = this.getKey().GetDateNowForSearch(0);
            String Date_Fin = this.getKey().GetDateNowForSearch(1);

            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSnapShopDalySortieFamille t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, OTFamille.getLgFAMILLEID());
            if (qry.getResultList().size() > 0) {
                OTSnapShopDalySortieFamille = (TSnapShopDalySortieFamille) qry.getSingleResult();
            }

            if (OTSnapShopDalySortieFamille == null) {
                OTSnapShopDalySortieFamille = this.createTSnapShopDalySortieFamille(OTFamille, int_balance, int_entree,
                        int_sortie);
                return OTSnapShopDalySortieFamille;
            }
            OTSnapShopDalySortieFamille.setIntBALANCE(OTSnapShopDalySortieFamille.getIntBALANCE() + int_balance);
            OTSnapShopDalySortieFamille
                    .setIntNUMBERENTREE(OTSnapShopDalySortieFamille.getIntNUMBERENTREE() + int_entree);
            OTSnapShopDalySortieFamille
                    .setIntNUMBERSORTIE(OTSnapShopDalySortieFamille.getIntNUMBERSORTIE() + int_sortie);
            OTSnapShopDalySortieFamille
                    .setIntNUMBERTRANSACTION(OTSnapShopDalySortieFamille.getIntNUMBERTRANSACTION() + 1);
            this.getOdataManager().getEm().merge(OTSnapShopDalySortieFamille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSnapShopDalySortieFamille;
    }

    public TSnapShopDalySortieFamille BuildTSnapShopDalySortieFamille(EntityManager em, TFamille OTFamille,
            Integer int_balance, Integer int_entree, Integer int_sortie) {
        TSnapShopDalySortieFamille OTSnapShopDalySortieFamille = null;
        try {
            Date dt_Date_debut, dt_Date_Fin;
            String Date_debut = this.getKey().GetDateNowForSearch(0);
            String Date_Fin = this.getKey().GetDateNowForSearch(1);
            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
            Query qry = em.createQuery(
                    "SELECT t FROM TSnapShopDalySortieFamille t WHERE  t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT LIKE ?5 AND t.lgFAMILLEID.lgFAMILLEID LIKE ?6")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, OTFamille.getLgFAMILLEID());
            if (qry.getResultList().size() > 0) {
                OTSnapShopDalySortieFamille = (TSnapShopDalySortieFamille) qry.getSingleResult();
            }

            if (OTSnapShopDalySortieFamille == null) {
                OTSnapShopDalySortieFamille = this.createTSnapShopDalySortieFamille(em, OTFamille, int_balance,
                        int_entree, int_sortie);
                return OTSnapShopDalySortieFamille;
            }
            OTSnapShopDalySortieFamille.setIntBALANCE(OTSnapShopDalySortieFamille.getIntBALANCE() + int_balance);
            OTSnapShopDalySortieFamille
                    .setIntNUMBERENTREE(OTSnapShopDalySortieFamille.getIntNUMBERENTREE() + int_entree);
            OTSnapShopDalySortieFamille
                    .setIntNUMBERSORTIE(OTSnapShopDalySortieFamille.getIntNUMBERSORTIE() + int_sortie);
            OTSnapShopDalySortieFamille
                    .setIntNUMBERTRANSACTION(OTSnapShopDalySortieFamille.getIntNUMBERTRANSACTION() + 1);
            em.merge(OTSnapShopDalySortieFamille);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSnapShopDalySortieFamille;
    }

    private TTypeStockFamille getTTypeStockFamilleByTypestock(String lg_TYPE_STOCK_ID, String lg_FAMILLE_ID) {
        TTypeStockFamille OTTypeStockFamille = null;
        try {

            OTTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();
            new logger().OCategory.info("Quantite :" + OTTypeStockFamille.getIntNUMBER());
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("ERREUR  getTTypeStockFamilleByTypestock " + e.toString());
            // OTTypeStockFamille = this.createTypeStockFamille(lg_FAMILLE_ID, lg_TYPE_STOCK_ID, 0);
        }
        return OTTypeStockFamille;
    }

    // code ajouté par Martial 10/11/2016
    public TLot createTLot(TFamille OTFamille, int int_NUMBER, String str_REF_LIVRAISON, TGrossiste OTGrossiste,
            String str_REF_ORDER, int int_UG) {

        Date now = new Date();
        TLot OTLot = null;
        try {
            OTLot = new TLot(this.getKey().getComplexId());
            OTLot.setLgUSERID(this.getOTUser());
            OTLot.setLgFAMILLEID(OTFamille);
            OTLot.setIntNUMBER(int_NUMBER); // quantite commandé + quantité livré
            OTLot.setDtSORTIEUSINE(now);
            OTLot.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTLot.setLgGROSSISTEID(OTGrossiste);
            OTLot.setDtCREATED(now);
            OTLot.setDtUPDATED(now);
            OTLot.setStrREFORDER(str_REF_ORDER);
            OTLot.setIntNUMBERGRATUIT(int_UG);
            OTLot.setStrSTATUT(commonparameter.statut_enable);
            OTLot.setIntQTYVENDUE(0);
            this.getOdataManager().getEm().persist(OTLot);
            this.buildSuccesTraceMessage("Lot ajouté avec succès");

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'ajout de lot");
        }
        return OTLot;
    }

    public boolean AddStock(TFamille OTFamille, Integer int_NUMBER, TGrossiste OTGrossiste, String str_REF_LIVRAISON,
            Date dt_SORTIE_USINE, Date dt_PEREMPTION, int int_NUMBER_GRATUIT, String lg_TYPEETIQUETTE_ID,
            String str_REF_ORDER, String int_NUM_LOT) {
        boolean result = false;
        TTypeetiquette OTTypeetiquette = null;
        TTypeStockFamille OTTypeStockFamille = null;
        TFamilleStock OTFamilleStock = null;
        TEtiquette OTEtiquette = null;
        Date now = new Date();
        familleManagement OfamilleManagement = new familleManagement(getOdataManager(), getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        String lg_TYPE_STOCK_ID = "1";

        try {
            OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);
            TWarehouse OTWarehouse = new TWarehouse();
            OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
            OTWarehouse.setLgUSERID(this.getOTUser());
            OTWarehouse.setLgFAMILLEID(OTFamille);
            OTWarehouse.setIntNUMBER(int_NUMBER);
            OTWarehouse.setDtPEREMPTION(dt_PEREMPTION);
            OTWarehouse.setDtSORTIEUSINE(dt_SORTIE_USINE);
            OTWarehouse.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTWarehouse.setLgGROSSISTEID(OTGrossiste);
            OTWarehouse.setStrREFORDER(str_REF_ORDER);
            OTWarehouse.setDtCREATED(now);
            OTWarehouse.setDtUPDATED(now);
            OTWarehouse.setIntNUMLOT(int_NUM_LOT);
            OTWarehouse.setIntNUMBERGRATUIT(int_NUMBER_GRATUIT);
            OTWarehouse.setStrSTATUT(commonparameter.statut_enable);
            OTWarehouse.setLgTYPEETIQUETTEID(OTTypeetiquette == null
                    ? this.getOdataManager().getEm().find(TTypeetiquette.class, Parameter.DEFAUL_TYPEETIQUETTE)
                    : OTFamille.getLgTYPEETIQUETTEID());
            OTEtiquette = OStockManager.createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID(),
                    OTWarehouse.getLgFAMILLEID(), OTWarehouse, String.valueOf(OTWarehouse.getIntNUMBER()));
            OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            this.getOdataManager().getEm().persist(OTWarehouse);

            OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
            OTFamilleStock = OtellerManagement.getTProductItemStock(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());

            // this.OSnapshotManager.SaveMouvementFamilleBis(OTFamille, "", commonparameter.ADD,
            // commonparameter.str_ACTION_ENTREESTOCK, int_NUMBER, this.getOTUser().getLgEMPLACEMENTID()); // a
            // decommenter en cas de probleme. 07/02/2017
            this.OSnapshotManager.createSnapshotMouvementArticle(OTFamille, int_NUMBER,
                    this.getOTUser().getLgEMPLACEMENTID()); // 07/02/2017

            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);
            this.getOdataManager().getEm().merge(OTFamilleStock);

            this.BuildTSnapShopDalySortieFamille(OTFamille, int_NUMBER, int_NUMBER, 0);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    public TSnapShopDalySortieFamille createTSnapShopDalySortieFamille(TFamille OTFamille, int int_balance,
            int int_entree, int int_sortie) {
        TSnapShopDalySortieFamille OTSnapShopDalySortieFamille = null;
        try {
            OTSnapShopDalySortieFamille = new TSnapShopDalySortieFamille();
            OTSnapShopDalySortieFamille.setLgID(this.getKey().getComplexId());
            OTSnapShopDalySortieFamille.setIntNUMBERTRANSACTION(1);
            OTSnapShopDalySortieFamille.setDtDAY(new Date());
            OTSnapShopDalySortieFamille.setStrSTATUT(commonparameter.statut_enable);
            OTSnapShopDalySortieFamille.setIntBALANCE(int_balance);
            OTSnapShopDalySortieFamille.setIntNUMBERENTREE(int_entree);
            OTSnapShopDalySortieFamille.setIntNUMBERSORTIE(int_sortie);
            OTSnapShopDalySortieFamille.setLgFAMILLEID(OTFamille);
            this.getOdataManager().getEm().persist(OTSnapShopDalySortieFamille);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSnapShopDalySortieFamille;
    }

    public TSnapShopDalySortieFamille createTSnapShopDalySortieFamille(EntityManager em, TFamille OTFamille,
            int int_balance, int int_entree, int int_sortie) {
        TSnapShopDalySortieFamille OTSnapShopDalySortieFamille = null;
        try {
            OTSnapShopDalySortieFamille = new TSnapShopDalySortieFamille();
            OTSnapShopDalySortieFamille.setLgID(this.getKey().getComplexId());
            OTSnapShopDalySortieFamille.setIntNUMBERTRANSACTION(1);
            OTSnapShopDalySortieFamille.setDtDAY(new Date());
            OTSnapShopDalySortieFamille.setStrSTATUT(commonparameter.statut_enable);
            OTSnapShopDalySortieFamille.setIntBALANCE(int_balance);
            OTSnapShopDalySortieFamille.setIntNUMBERENTREE(int_entree);
            OTSnapShopDalySortieFamille.setIntNUMBERSORTIE(int_sortie);
            OTSnapShopDalySortieFamille.setLgFAMILLEID(OTFamille);
            em.persist(OTSnapShopDalySortieFamille);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSnapShopDalySortieFamille;
    }
    // fin code ajouté par Martial 10/11/2016

    // fonction ajoutes par kobena le 10/11/2016
    public JSONArray getListArticle(String search_value, String lg_FAMILLE_ID, int start, int end) {
        JSONArray data = new JSONArray();

        try {

            String qry = "SELECT  lg_FAMILLE_ID,str_NAME,str_DESCRIPTION "
                    + "  FROM t_famille  WHERE lg_FAMILLE_ID LIKE '" + lg_FAMILLE_ID + "'  AND (str_NAME LIKE '"
                    + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value + "%' OR int_CIP LIKE '"
                    + search_value + "%' OR int_EAN13 LIKE '" + search_value + "%' )  AND str_STATUT = '"
                    + commonparameter.statut_enable + "' ORDER BY str_DESCRIPTION ASC    LIMIT " + start + ", " + end
                    + " ";

            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                json.put("lg_FAMILLE_ID", objects[0]);
                json.put("str_NAME", objects[1]);
                json.put("str_DESCRIPTION", objects[2]);
                data.put(json);

            }
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return data;
    }

    public long getListArticleCount(String search_value, String lg_FAMILLE_ID) {

        long count = 0;

        try {

            String qry = "SELECT  COUNT(lg_FAMILLE_ID)  " + "  FROM t_famille  WHERE lg_FAMILLE_ID LIKE '"
                    + lg_FAMILLE_ID + "'  AND (str_NAME LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '"
                    + search_value + "%' OR int_CIP LIKE '" + search_value + "%' OR int_EAN13 LIKE '" + search_value
                    + "%' )  AND str_STATUT = '" + commonparameter.statut_enable + "'  ";

            Object object = this.getOdataManager().getEm().createNativeQuery(qry).getSingleResult();
            count = Long.valueOf(object + "");

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return count;
    }

    public JSONObject AddStock(String lg_FAMILLE_ID, Integer int_NUMBER, String int_NUM_LOT, String dt_peremption) {

        JSONObject json = new JSONObject();

        try {
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            if (this.checkIsExist(lg_FAMILLE_ID).size() > 0) {
                TWarehouse tw = getTWarehouse(lg_FAMILLE_ID, int_NUM_LOT);
                if (tw != null) {
                    json = updateStock(tw, int_NUMBER);
                } else {
                    json = updateFamillyStock(lg_FAMILLE_ID, int_NUMBER, int_NUM_LOT, dt_peremption);
                }
            } else {
                TFamille OTProductItem = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
                TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                        .getTProductItemStock(lg_FAMILLE_ID);
                if (OTFamilleStock.getIntNUMBERAVAILABLE() < int_NUMBER) {
                    json.put("success", 0);
                    json.put("message",
                            "La quantité  à retirer est supérieure à celle en stock<br> Vous pouvez faire un ajustement du stock <br> Quantité en stock <span style='color:red;font-weight:900;'>"
                                    + OTFamilleStock.getIntNUMBERAVAILABLE() + "</span>");
                } else {
                    TWarehouse OTWarehouse = new TWarehouse();
                    OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
                    OTWarehouse.setLgUSERID(this.getOTUser());
                    OTWarehouse.setLgFAMILLEID(OTProductItem);
                    OTWarehouse.setIntNUMBER(int_NUMBER);
                    OTWarehouse.setDtPEREMPTION(java.sql.Date.valueOf(dt_peremption));
                    OTWarehouse.setDtCREATED(new Date());
                    OTWarehouse.setDtUPDATED(new Date());
                    OTWarehouse.setIntNUMLOT(int_NUM_LOT);
                    OTWarehouse.setStrSTATUT(commonparameter.statut_pending);
                    this.getOdataManager().getEm().persist(OTWarehouse);

                    if (this.getOdataManager().getEm().getTransaction().isActive()) {
                        this.getOdataManager().getEm().getTransaction().commit();
                        json.put("success", 1);
                    }

                }
            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return json;

    }

    public JSONArray getProducts(int start, int limit) {
        JSONArray data = new JSONArray();

        try {

            String qry = "SELECT  `t_warehouse`.`lg_FAMILLE_ID`, `t_warehouse`.`int_NUM_LOT`, `t_warehouse`.`int_NUMBER`, DATE_FORMAT(`t_warehouse`.`dt_CREATED`,'%d/%m/%Y %H:%i') AS DATEENTREE, `t_famille`.`int_CIP`,";
            qry += "  DATE_FORMAT(`t_warehouse`.`dt_PEREMPTION`,'%d/%m/%Y') AS  dtPEREMPTION,`t_famille`.`str_NAME`, `t_warehouse`.`lg_WAREHOUSE_ID` FROM  `t_famille`  INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)";
            qry += " WHERE  DATE(`t_warehouse`.`dt_CREATED`) = CURDATE() AND  `t_warehouse`.`str_STATUT`='"
                    + commonparameter.statut_pending + "'   ORDER BY `t_warehouse`.`dt_CREATED` DESC LIMIT " + start
                    + ", " + limit + "";
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(qry).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                json.put("lg_FAMILLE_ID", objects[0]);
                json.put("LOT", objects[1]);
                json.put("QTY", objects[2]);
                json.put("DATEPEREMPTION", objects[5]);
                json.put("CIP", objects[4]);
                json.put("ARTICLE", objects[6]);
                json.put("DATEENTREE", objects[3]);

                json.put("ID", objects[7]);

                data.put(json);

            }
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return data;
    }

    public long getProductCount() {

        long count = 0;

        try {

            String qry = "SELECT COUNT( `t_warehouse`.`lg_FAMILLE_ID`) FROM  `t_famille`  INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`) WHERE  DATE(`t_warehouse`.`dt_CREATED`) = CURDATE() AND  `t_warehouse`.`str_STATUT`='"
                    + commonparameter.statut_pending + "'";

            Object object = this.getOdataManager().getEm().createNativeQuery(qry).getSingleResult();
            count = Long.valueOf(object + "");

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }

        return count;
    }

    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID, EntityManager em) {
        TFamilleStock OTProductItemStock = null;
        try {
            TypedQuery<TFamilleStock> qry = em.createQuery(
                    "SELECT t FROM TFamilleStock t WHERE (t.lgFAMILLEID.lgFAMILLEID = ?1 OR t.lgFAMILLEID.intCIP = ?1 OR t.lgFAMILLEID.strNAME = ?1 OR t.lgFAMILLEID.strDESCRIPTION = ?1 OR t.lgFAMILLEID.intEAN13 = ?1) AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2",
                    TFamilleStock.class).setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            qry.setMaxResults(1);
            OTProductItemStock = (TFamilleStock) qry.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Produit inexistant");
        }
        return OTProductItemStock;
    }

    public Optional<TMouvement> findMouvement(TFamille OTFamille, String action, String typeAction,
            String emplacementId, EntityManager emg) {
        try {
            TypedQuery<TMouvement> query = emg.createQuery(
                    "SELECT t FROM TMouvement t WHERE    t.dtDAY  = ?1   AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3 AND t.strACTION = ?4 AND t.strTYPEACTION = ?5 ",
                    TMouvement.class);
            query.setParameter(1, new Date(), TemporalType.DATE).setParameter(2, OTFamille.getLgFAMILLEID())
                    .setParameter(3, emplacementId).setParameter(4, action).setParameter(5, typeAction);

            return Optional.ofNullable(query.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public void saveMvtArticle(TFamille tf, TUser ooTUser, int debut, int stockFinal, int qty,
            TEmplacement emplacementId, EntityManager emg) {
        Optional<TMouvement> tm = findMouvement(tf, commonparameter.REMOVE, commonparameter.str_ACTION_PERIME,
                emplacementId.getLgEMPLACEMENTID(), emg);
        if (tm.isPresent()) {
            TMouvement OTMouvement = tm.get();
            OTMouvement.setIntNUMBERTRANSACTION(1 + OTMouvement.getIntNUMBERTRANSACTION());
            OTMouvement.setIntNUMBER(qty + OTMouvement.getIntNUMBER());
            OTMouvement.setLgUSERID(ooTUser);
            OTMouvement.setDtUPDATED(new Date());
            emg.merge(OTMouvement);
        } else {
            TMouvement OTMouvement = new TMouvement();
            OTMouvement.setLgMOUVEMENTID(UUID.randomUUID().toString());
            OTMouvement.setIntNUMBERTRANSACTION(1);
            OTMouvement.setDtDAY(new Date());
            OTMouvement.setStrSTATUT(commonparameter.statut_enable);
            OTMouvement.setIntNUMBER(qty);
            OTMouvement.setLgFAMILLEID(tf);
            OTMouvement.setLgUSERID(ooTUser);
            OTMouvement.setPKey("");
            OTMouvement.setStrACTION(commonparameter.str_ACTION_PERIME);
            OTMouvement.setStrTYPEACTION(commonparameter.REMOVE);
            OTMouvement.setDtCREATED(new Date());
            OTMouvement.setDtUPDATED(new Date());
            OTMouvement.setLgEMPLACEMENTID(emplacementId);
            emg.persist(OTMouvement);
        }
        createSnapshotMouvementArticle(tf, debut, stockFinal, ooTUser, emplacementId, emg);
    }

    public Optional<TMouvementSnapshot> findTMouvementSnapshot(String lg_FAMILLE_ID, String emplacementId,
            EntityManager emg) {
        try {
            TypedQuery<TMouvementSnapshot> query = emg.createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE    t.dtDAY  = ?1   AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3  ",
                    TMouvementSnapshot.class);
            query.setParameter(1, new Date(), TemporalType.DATE).setParameter(2, lg_FAMILLE_ID).setParameter(3,
                    emplacementId);
            return Optional.ofNullable(query.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public void createSnapshotMouvementArticle(TFamille OTFamille, int debut, int stockFinal, TUser ooTUser,
            TEmplacement emplacementId, EntityManager emg) {

        Optional<TMouvementSnapshot> tm = findTMouvementSnapshot(OTFamille.getLgFAMILLEID(),
                emplacementId.getLgEMPLACEMENTID(), emg);
        if (tm.isPresent()) {
            TMouvementSnapshot mouvementSnapshot = tm.get();
            mouvementSnapshot.setDtUPDATED(new Date());
            mouvementSnapshot.setIntNUMBERTRANSACTION(mouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            mouvementSnapshot.setIntSTOCKJOUR(stockFinal);
            emg.merge(mouvementSnapshot);

        } else {
            TMouvementSnapshot OTMouvementSnapshot = new TMouvementSnapshot();
            OTMouvementSnapshot.setLgMOUVEMENTSNAPSHOTID(UUID.randomUUID().toString());
            OTMouvementSnapshot.setLgFAMILLEID(OTFamille);
            OTMouvementSnapshot.setDtDAY(new Date());
            OTMouvementSnapshot.setDtCREATED(new Date());
            OTMouvementSnapshot.setDtUPDATED(new Date());
            OTMouvementSnapshot.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(1);
            OTMouvementSnapshot.setIntSTOCKJOUR(stockFinal);
            OTMouvementSnapshot.setIntSTOCKDEBUT(debut);
            OTMouvementSnapshot.setLgEMPLACEMENTID(emplacementId);
            emg.persist(OTMouvementSnapshot);

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

    public JSONObject AddProduitPerimes(String ID) {

        JSONObject json = new JSONObject();
        EntityManager em = this.getOdataManager().getEm();
        try {
            List<TWarehouse> list;
            TWarehouse OTWarehouse = em.find(TWarehouse.class, ID);
            list = em.createQuery(
                    "SELECT o FROM TWarehouse o WHERE  FUNCTION('DATE', o.dtCREATED)= FUNCTION('DATE',?1) AND o.strSTATUT=?2")
                    .setParameter(1, OTWarehouse.getDtCREATED()).setParameter(2, commonparameter.statut_pending)
                    .getResultList();
            int i = 0;
            MvtProduitObselete mvtProduit = new MvtProduitObselete();
            TEmplacement emplacement = this.getOTUser().getLgEMPLACEMENTID();
            em.getTransaction().begin();
            for (TWarehouse tWarehouse : list) {
                // TFamille OTProductItem = this.getOdataManager().getEm().find(TFamille.class,
                // tWarehouse.getLgFAMILLEID().getLgFAMILLEID());
                TFamille famille = tWarehouse.getLgFAMILLEID();
                TFamilleStock OTFamilleStock = getTProductItemStock(tWarehouse.getLgFAMILLEID().getLgFAMILLEID(), em);
                Integer stockInit = OTFamilleStock.getIntNUMBERAVAILABLE();
                if (OTFamilleStock.getIntNUMBERAVAILABLE() > 0) {
                    OTFamilleStock
                            .setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - tWarehouse.getIntNUMBER());
                    OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
                    OTFamilleStock.setDtUPDATED(new Date());
                    tWarehouse.setIntNUMBERDELETE(tWarehouse.getIntNUMBER());
                    tWarehouse.setDtUPDATED(new Date());
                    tWarehouse.setStrSTATUT(commonparameter.statut_delete);
                    em.merge(OTFamilleStock);
                    em.merge(tWarehouse);
                    mvtProduit.saveMvtProduit(famille.getIntPRICE(), tWarehouse.getLgWAREHOUSEID(),
                            DateConverter.PERIME, famille, this.getOTUser(), this.getOTUser().getLgEMPLACEMENTID(),
                            tWarehouse.getIntNUMBER(), stockInit, stockInit - tWarehouse.getIntNUMBER(), 0, em);
                    this.BuildTSnapShopDalySortieFamille(em, tWarehouse.getLgFAMILLEID(), tWarehouse.getIntNUMBER(), 0,
                            tWarehouse.getIntNUMBER());
                    saveMvtArticle(famille, this.getOTUser(), stockInit, stockInit - tWarehouse.getIntNUMBER(),
                            tWarehouse.getIntNUMBER(), emplacement, em);
                    String desc = "Saisis de périmé du  produit " + famille.getIntCIP() + " " + famille.getStrNAME()
                            + " stock initial= " + stockInit + " qté saisie= " + tWarehouse.getIntNUMBER()
                            + " qté après saisie = " + OTFamilleStock.getIntNUMBERAVAILABLE()
                            + " . Saisie effectuée par " + this.getOTUser().getStrFIRSTNAME() + " "
                            + this.getOTUser().getStrLASTNAME();
                    updateItem(this.getOTUser(), famille.getIntCIP(), desc, TypeLog.SAISIS_PERIMES, famille, em);
                    i++;
                }
            }

            if (em.getTransaction().isActive()) {
                em.getTransaction().commit();
                json.put("success", 1);
                json.put("NB", i);
            }

        } catch (Exception e) {
            em.getTransaction().rollback();
            e.printStackTrace(System.err);
        }
        return json;

    }

    public TMouvementSnapshot getTMouvementSnapshotForCurrentDay(String lg_FAMILLE_ID, EntityManager em) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        Date dt_Date_debut, dt_Date_Fin;
        String Date_debut = "", Date_Fin = "";
        try {
            Date_debut = this.getKey().GetDateNowForSearch(0);
            Date_Fin = this.getKey().GetDateNowForSearch(1);
            dt_Date_Fin = this.getKey().stringToDate(Date_Fin, this.getKey().formatterShort);
            dt_Date_debut = this.getKey().stringToDate(Date_debut, this.getKey().formatterShort);
            OTMouvementSnapshot = (TMouvementSnapshot) em.createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE t.dtCREATED >= ?3  AND t.dtCREATED < ?4 AND t.strSTATUT = ?5 AND t.lgFAMILLEID.lgFAMILLEID = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?7")
                    .setParameter(3, dt_Date_debut).setParameter(4, dt_Date_Fin)
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public JSONObject updateStock(String ID, Integer int_NUMBER, String int_NUM_LOT, String dt_peremption) {

        JSONObject json = new JSONObject();

        try {
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            TWarehouse OWarehouse = this.getOdataManager().getEm().find(TWarehouse.class, ID);
            TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OWarehouse.getLgFAMILLEID().getLgFAMILLEID());
            if (OTFamilleStock.getIntNUMBERAVAILABLE() < int_NUMBER) {
                json.put("success", 0);
                json.put("message",
                        "La quantité  à retirer est supérieure à celle en stock<br> Vous pouvez faire un ajustement du stock <br> Quantité en stock <span style='color:red;font-weight:900;'>"
                                + OTFamilleStock.getIntNUMBERAVAILABLE() + "</span>");
            } else {

                OWarehouse.setLgUSERID(this.getOTUser());

                OWarehouse.setIntNUMBER(int_NUMBER);

                OWarehouse.setDtUPDATED(new Date());
                OWarehouse.setIntNUMLOT(int_NUM_LOT);

                this.getOdataManager().getEm().merge(OWarehouse);

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                    json.put("success", 1);
                }

            }

        } catch (Exception e) {
            e.printStackTrace();

        }
        return json;

    }

    public JSONObject deleteStock(String ID) {

        JSONObject json = new JSONObject();

        try {
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            TWarehouse OWarehouse = this.getOdataManager().getEm().find(TWarehouse.class, ID);
            this.getOdataManager().getEm().remove(OWarehouse);

            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
                json.put("success", 1);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;

    }

    public List<TWarehouse> checkIsExist(String lg_FAMILLE_ID) {
        List<TWarehouse> list = new ArrayList<>();
        list = this.getOdataManager().getEm().createQuery(
                "SELECT o FROM TWarehouse o WHERE  FUNCTION('DATE', o.dtCREATED)= FUNCTION('DATE',?1) AND o.lgFAMILLEID.lgFAMILLEID=?2  AND o.strSTATUT=?3")
                .setParameter(1, new Date()).setParameter(2, lg_FAMILLE_ID)
                .setParameter(3, commonparameter.statut_pending).getResultList();
        return list;

    }

    private TWarehouse getTWarehouse(String lg_FAMILLE_ID, String lot) {
        TWarehouse OTWarehouse = null;
        try {
            OTWarehouse = (TWarehouse) this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TWarehouse o WHERE  FUNCTION('DATE', o.dtCREATED)= FUNCTION('DATE',?1) AND o.lgFAMILLEID.lgFAMILLEID=?2  AND o.strSTATUT=?3 AND o.intNUMLOT=?4 ")
                    .setParameter(1, new Date()).setParameter(2, lg_FAMILLE_ID)
                    .setParameter(3, commonparameter.statut_pending).setParameter(4, lot).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTWarehouse;
    }

    public JSONObject updateStock(TWarehouse OWarehouse, Integer int_NUMBER) {

        JSONObject json = new JSONObject();

        try {
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();

            }
            TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OWarehouse.getLgFAMILLEID().getLgFAMILLEID());
            if (OTFamilleStock.getIntNUMBERAVAILABLE() < (int_NUMBER + OWarehouse.getIntNUMBER())) {
                json.put("success", 0);
                json.put("message",
                        "Cette ligne existe déjà avec quantité <span style='font-weight:900;'>"
                                + OWarehouse.getIntNUMBER()
                                + "</span>\n La somme des différentes quantités es supérieure à celle du stock");
            } else {
                OWarehouse.setIntNUMBER(int_NUMBER + OWarehouse.getIntNUMBER());
                OWarehouse.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OWarehouse);

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                    json.put("success", 1);
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;

    }

    public JSONObject updateFamillyStock(String lg_FAMILLE_ID, Integer int_NUMBER, String int_NUM_LOT,
            String dt_peremption) {

        JSONObject json = new JSONObject();
        int totalCount = 0;
        List<TWarehouse> list = this.checkIsExist(lg_FAMILLE_ID);
        totalCount = list.stream().map((tWarehouse) -> tWarehouse.getIntNUMBER()).reduce(totalCount, Integer::sum);

        try {
            TFamille OTProductItem = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);
            TFamilleStock OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(lg_FAMILLE_ID);
            if (OTFamilleStock.getIntNUMBERAVAILABLE() < (int_NUMBER + totalCount)) {
                json.put("success", 0);
                json.put("message",
                        "La quantité correspondant à ce produit est supérieure à celle du stock\n Quantité Stock: <span style='font-weight:900'>"
                                + OTFamilleStock.getIntNUMBERAVAILABLE()
                                + "</span> < Quantité à retirer :<span style='font-weight:900'>"
                                + (int_NUMBER + totalCount) + "</span>");
            } else {
                if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().begin();

                }
                TWarehouse OTWarehouse = new TWarehouse();
                OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
                OTWarehouse.setLgUSERID(this.getOTUser());
                OTWarehouse.setLgFAMILLEID(OTProductItem);
                OTWarehouse.setIntNUMBER(int_NUMBER);
                OTWarehouse.setDtPEREMPTION(java.sql.Date.valueOf(dt_peremption));
                OTWarehouse.setDtCREATED(new Date());
                OTWarehouse.setDtUPDATED(new Date());
                OTWarehouse.setIntNUMLOT(int_NUM_LOT);
                OTWarehouse.setStrSTATUT(commonparameter.statut_pending);
                this.getOdataManager().getEm().persist(OTWarehouse);

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                    json.put("success", 1);
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;

    }

    public long getCountPerimes(String search, String dt_start, String dt_end) {
        long count = 0;
        String query = "SELECT  COUNT(`t_warehouse`.`lg_WAREHOUSE_ID`) AS NB ";
        query += " FROM `t_famille` INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)";
        query += "  INNER JOIN `t_grossiste` ON (`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`) INNER JOIN `t_user` ON (`t_warehouse`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)";
        query += " WHERE ( (DATE(`t_warehouse`.`dt_CREATED`) >= DATE('" + dt_start
                + "') AND  DATE(`t_warehouse`.`dt_CREATED`) <= DATE('" + dt_end + "')) OR  ";
        query += "  ( DATE(`t_warehouse`.`dt_PEREMPTION`) >= DATE('" + dt_start
                + "') AND   DATE(`t_warehouse`.`dt_PEREMPTION`) <= DATE('" + dt_end + "') ))";
        query += "  AND `t_warehouse`.`str_STATUT`='delete' AND (`t_famille`.`str_NAME` LIKE '%" + search
                + "%' OR `t_famille`.`int_CIP` LIKE '%" + search + "%' OR `t_grossiste`.`str_LIBELLE` LIKE '%" + search
                + "%' OR `t_warehouse`.`int_NUM_LOT` LIKE '%" + search + "%' ) ";
        try {
            count = (long) this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public JSONArray getPerimes(String search, String dt_start, String dt_end, int start, int limit) {
        JSONArray data = new JSONArray();
        String query = "SELECT `t_warehouse`.`lg_FAMILLE_ID`, `t_warehouse`.`int_NUM_LOT`, `t_warehouse`.`int_NUMBER`,DATE_FORMAT(`t_warehouse`.`dt_CREATED`, '%d/%m/%Y %H:%i') AS `dtCREATION`,";
        query += " DATE_FORMAT(`t_warehouse`.`dt_PEREMPTION`, '%d/%m/%Y') AS `dt_PEREMPTION`,`t_famille`.`str_NAME`,";
        query += " `t_famille`.`int_CIP`,`t_grossiste`.`str_LIBELLE`, concat(`t_user`.`str_FIRST_NAME`, ' ', `t_user`.`str_LAST_NAME`) AS `USERNAME` ,(t_famille.`int_PRICE`*`t_warehouse`.`int_NUMBER`) AS MONTANT,t_famille.`int_PRICE` AS PU ";
        query += " FROM `t_famille` INNER JOIN `t_warehouse` ON (`t_famille`.`lg_FAMILLE_ID` = `t_warehouse`.`lg_FAMILLE_ID`)";
        query += "  INNER JOIN `t_grossiste` ON (`t_famille`.`lg_GROSSISTE_ID` = `t_grossiste`.`lg_GROSSISTE_ID`) INNER JOIN `t_user` ON (`t_warehouse`.`lg_USER_ID` = `t_user`.`lg_USER_ID`)";
        query += " WHERE ( (DATE(`t_warehouse`.`dt_CREATED`) >= DATE('" + dt_start
                + "') AND  DATE(`t_warehouse`.`dt_CREATED`) <= DATE('" + dt_end + "')) OR  ";
        query += "  ( DATE(`t_warehouse`.`dt_PEREMPTION`) >= DATE('" + dt_start
                + "') AND   DATE(`t_warehouse`.`dt_PEREMPTION`) <= DATE('" + dt_end + "') ))";
        query += "  AND `t_warehouse`.`str_STATUT`='delete' AND (`t_famille`.`str_NAME` LIKE '%" + search
                + "%' OR `t_famille`.`int_CIP` LIKE '%" + search + "%' OR `t_grossiste`.`str_LIBELLE` LIKE '%" + search
                + "%' OR `t_warehouse`.`int_NUM_LOT` LIKE '%" + search
                + "%' ) ORDER BY  `t_warehouse`.`dt_CREATED` DESC LIMIT " + start + ", " + limit + "";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Object[] objects : list) {
                JSONObject json = new JSONObject();
                json.put("lg_FAMILLE_ID", objects[0]);
                json.put("LOT", objects[1]);
                json.put("QTY", objects[2]);
                json.put("DATEENTREE", objects[3]);
                json.put("DATEPEREMPTION", objects[4]);
                json.put("ARTICLE", objects[5]);
                json.put("CIP", objects[6]);
                json.put("GROSSISTE", objects[7]);
                json.put("OPERATEUR", objects[8]);
                json.put("MONTANT", objects[9]);
                json.put("PU", objects[10]);
                data.put(json);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return data;
    }

    /* fonction ajoute le 23/01/2017 pour la liste des entree en stock d'un depot */
    public List<EntityData> getEntreeDepot(String lg_FAMILLE_ID, Date dtDEBUT, Date dtFIN) {
        List<EntityData> list = new ArrayList<>();
        List<TMouvement> listMvt;
        try {
            listMvt = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TMouvement o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 AND  o.dtDAY>=?3 AND o.dtDAY <=?4 AND o.strACTION=?5 ")
                    .setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(3, dtDEBUT, TemporalType.DATE).setParameter(4, dtFIN, TemporalType.DATE)
                    .setParameter(5, "ENTREESTOCK").getResultList();
            for (TMouvement OMouvement : listMvt) {
                EntityData data = new EntityData();
                data.setStr_value1(date.formatterOrange.format(OMouvement.getDtCREATED()));
                data.setStr_value2(OMouvement.getIntNUMBER() + "");
                data.setStr_value3(OMouvement.getLgFAMILLEID().getIntPAF() + "");
                data.setStr_value4(
                        OMouvement.getLgUSERID().getStrFIRSTNAME() + " " + OMouvement.getLgUSERID().getStrLASTNAME());
                data.setStr_value5(OMouvement.getLgFAMILLEID().getLgGROSSISTEID().getStrLIBELLE());
                data.setStr_value6(OMouvement.getLgFAMILLEID().getLgFAMILLEID());
                data.setStr_value7(OMouvement.getLgFAMILLEID().getIntCIP());
                data.setStr_value8(OMouvement.getLgFAMILLEID().getStrNAME());
                list.add(data);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    /* fonction ajoute le 23/01/2017 pour la liste des entree en stock d'un depot */
    /* 28/02/2017 */
    private void UpdateTBonLivraisonDetailFromBonLivraison(String lg_BON_LIVRAISON_DETAIL, int int_QTE_LIVRE,
            int int_QUANTITE_FREE) {
        TBonLivraisonDetail OTBonLivraisonDetail = null;
        try {

            OTBonLivraisonDetail = this.getOdataManager().getEm().find(TBonLivraisonDetail.class,
                    lg_BON_LIVRAISON_DETAIL);
            OTBonLivraisonDetail.setIntQTERECUE(OTBonLivraisonDetail.getIntQTERECUE() + int_QTE_LIVRE);
            OTBonLivraisonDetail
                    .setIntQTEMANQUANT(OTBonLivraisonDetail.getIntQTEMANQUANT() - (int_QTE_LIVRE - int_QUANTITE_FREE));
            OTBonLivraisonDetail.setIntQTEUG(OTBonLivraisonDetail.getIntQTEUG() + int_QUANTITE_FREE);
            OTBonLivraisonDetail.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTBonLivraisonDetail);

        } catch (Exception e) {
            e.printStackTrace();

        }
    }

    /* 28/02/2017 */
    public boolean AddStock(TFamille OTFamille, Integer int_NUMBER, TGrossiste OTGrossiste, String str_REF_LIVRAISON,
            Date dt_SORTIE_USINE, Date dt_PEREMPTION, int int_NUMBER_GRATUIT, String lg_TYPEETIQUETTE_ID,
            String str_REF_ORDER, String int_NUM_LOT, int ug) {
        boolean result = false;
        TTypeetiquette OTTypeetiquette = null;
        TTypeStockFamille OTTypeStockFamille = null;
        TFamilleStock OTFamilleStock = null;
        TEtiquette OTEtiquette = null;
        Date now = new Date();
        familleManagement OfamilleManagement = new familleManagement(getOdataManager(), getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        String lg_TYPE_STOCK_ID = "1";

        try {
            OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);
            this.getOdataManager().BeginTransaction();
            TWarehouse OTWarehouse = new TWarehouse();
            OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
            OTWarehouse.setLgUSERID(this.getOTUser());
            OTWarehouse.setLgFAMILLEID(OTFamille);
            OTWarehouse.setIntNUMBER(int_NUMBER);
            OTWarehouse.setDtPEREMPTION(dt_PEREMPTION);
            OTWarehouse.setDtSORTIEUSINE(dt_SORTIE_USINE);
            OTWarehouse.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTWarehouse.setLgGROSSISTEID(OTGrossiste);
            OTWarehouse.setStrREFORDER(str_REF_ORDER);
            OTWarehouse.setDtCREATED(now);
            OTWarehouse.setDtUPDATED(now);
            OTWarehouse.setIntNUMLOT(int_NUM_LOT);
            OTWarehouse.setIntNUMBERGRATUIT(int_NUMBER_GRATUIT);
            OTWarehouse.setStrSTATUT(commonparameter.statut_enable);
            OTWarehouse.setLgTYPEETIQUETTEID(OTTypeetiquette == null
                    ? this.getOdataManager().getEm().find(TTypeetiquette.class, Parameter.DEFAUL_TYPEETIQUETTE)
                    : OTFamille.getLgTYPEETIQUETTEID());
            OTEtiquette = OStockManager.createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID(),
                    OTWarehouse.getLgFAMILLEID(), OTWarehouse, String.valueOf(OTWarehouse.getIntNUMBER()));
            OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            this.getOdataManager().getEm().persist(OTWarehouse);

            OTTypeStockFamille = OStockManager.getTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTWarehouse.getLgFAMILLEID(), this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            OTFamilleStock = OtellerManagement.geProductItemStock(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());

            // this.OSnapshotManager.SaveMouvementFamilleBis(OTFamille, "", commonparameter.ADD,
            // commonparameter.str_ACTION_ENTREESTOCK, int_NUMBER, this.getOTUser().getLgEMPLACEMENTID()); // a
            // decommenter en cas de probleme. 07/02/2017
            this.OSnapshotManager.createSnapshotMouvementArticleBons(OTFamille, int_NUMBER,
                    this.getOTUser().getLgEMPLACEMENTID(), OTFamilleStock); // 07/02/2017

            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
            OTFamilleStock.setIntUG((OTFamilleStock.getIntUG() != null ? (OTFamilleStock.getIntUG() + ug) : 0));
            this.getOdataManager().getEm().merge(OTTypeStockFamille);
            this.getOdataManager().getEm().merge(OTFamilleStock);

            this.BuildTSnapShopDalySortieFamille(OTFamille, int_NUMBER, int_NUMBER, 0);
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                this.getOdataManager().getEm().close();
            }
            e.printStackTrace();
        }

        return result;
    }

    public void updateReelStock(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte, String task,
            TFamilleStock OTProductItemStock) {
        int int_new_qte = 0, int_entree = 0, int_sortie = 0, int_balance = 0;
        String lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(
                commonparameter.PROCESS_SUCCESS) ? commonparameter.TYPE_STOCK_RAYON : commonparameter.TYPE_STOCK_DEPOT);

        TTypeStockFamille OTTypeStockFamille = null;
        try {
            OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID());
            switch (task) {
            case "del":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() + int_qte;
                int_entree = int_qte;
                break;
            case "upd":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_sortie = int_qte;
                break;
            case "ins":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_sortie = int_qte;
                break;
            default:
                break;
            }

            int_balance = int_qte;
            new logger().OCategory.info("int_new_qte:" + int_new_qte + "|||lg_TYPE_STOCK_ID:" + lg_TYPE_STOCK_ID);

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setDtUPDATED(new Date());

            OTTypeStockFamille = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID());
            OTTypeStockFamille.setIntNUMBER(int_new_qte);
            this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().merge(OTProductItemStock);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);
            this.getOdataManager().CloseTransaction();

            if (!task.equals("del") && OTProductItemStock.getLgFAMILLEID().getBoolDECONDITIONNE() == 0
                    && OTProductItemStock.getLgFAMILLEID().getBCODEINDICATEUR() != 1) {

                suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());
                OsuggestionManagement.makeSuggestionAuto(OTProductItemStock);// suggession auto
            }

            this.BuildTSnapShopDalySortieFamille(OTPreenregistrementDetail.getLgFAMILLEID(), int_balance, int_entree,
                    int_sortie);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public void updateReelStockBack(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte, String task) {
        int int_new_qte = 0, int_entree = 0, int_sortie = 0, int_balance = 0;
        String lg_TYPE_STOCK_ID = (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID().equalsIgnoreCase(
                commonparameter.PROCESS_SUCCESS) ? commonparameter.TYPE_STOCK_RAYON : commonparameter.TYPE_STOCK_DEPOT);
        TFamilleStock OTProductItemStock = null;
        TTypeStockFamille OTTypeStockFamille = null;
        try {
            OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID());
            switch (task) {
            case "del":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() + int_qte;
                int_entree = int_qte;
                break;
            case "upd":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_sortie = int_qte;
                break;
            case "ins":
                int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
                int_sortie = int_qte;

                break;
            default:
                break;
            }

            int_balance = int_qte;
            new logger().OCategory.info("int_new_qte:" + int_new_qte + "|||lg_TYPE_STOCK_ID:" + lg_TYPE_STOCK_ID);

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setDtUPDATED(new Date());

            OTTypeStockFamille = this.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
                    OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID());
            OTTypeStockFamille.setIntNUMBER(int_new_qte);
            // this.getOdataManager().BeginTransaction();
            this.getOdataManager().getEm().merge(OTProductItemStock);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);
            // this.getOdataManager().CloseTransaction();

            if (!task.equals("del") && OTProductItemStock.getLgFAMILLEID().getBoolDECONDITIONNE() == 0
                    && OTProductItemStock.getLgFAMILLEID().getBCODEINDICATEUR() != 1) {

                suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());
                OsuggestionManagement.makeSuggestionAuto(OTProductItemStock);// suggession auto
            }

            this.BuildTSnapShopDalySortieFamille(OTPreenregistrementDetail.getLgFAMILLEID(), int_balance, int_entree,
                    int_sortie);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public void updateStock(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte) {

        TFamille famille = OTPreenregistrementDetail.getLgFAMILLEID();
        TFamilleStock OTProductItemStock = getTProductItemStock(famille.getLgFAMILLEID());

        try {
            OTProductItemStock.setIntNUMBERAVAILABLE(OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte);
            this.getOdataManager().getEm().merge(OTProductItemStock);
            if (famille.getBoolDECONDITIONNE() == 0 && famille.getBCODEINDICATEUR() != 1) {

                suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());
                OsuggestionManagement.makeSuggestionAuto(OTProductItemStock);// suggession auto
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public TFamilleStock getTProductItemStock(String lg_FAMILLE_ID) {
        TFamilleStock OTProductItemStock = null;
        try {

            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, lg_FAMILLE_ID)
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (qry.getResultList().size() > 0) {
                OTProductItemStock = (TFamilleStock) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Produit inexistant");
        }
        return OTProductItemStock;
    }

    public void BulkAddLot(List<TBonLivraisonDetail> lstTBonLivraisonDetail) {
        try {
            lstTBonLivraisonDetail.forEach((OBonLivraisonDetail) -> {

                TLot OTLot = getLot(OBonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON());
                if (OTLot == null) {
                    this.getOdataManager().BeginTransaction();
                    OTLot = this.createTLot(OBonLivraisonDetail.getLgFAMILLEID(), OBonLivraisonDetail.getIntQTECMDE(),
                            OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                            OBonLivraisonDetail.getLgGROSSISTEID(),
                            OBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER(), 0);

                    new orderManagement(this.getOdataManager(), this.getOTUser())
                            .UpdateTBonLivraisonDetailFromBonLivraison(OBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                                    OTLot.getIntNUMBER(), OTLot.getIntNUMBERGRATUIT());
                }
                this.getOdataManager().BeginTransaction();
            });

            // TEtiquette OTEtiquette = new
            // StockManager(this.getOdataManager()).createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID(),
            // OTWarehouse.getLgFAMILLEID().getLgFAMILLEID(), OTWarehouse.getLgWAREHOUSEID());
            // OTLot.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.getOdataManager().getEm().getTransaction().rollback();
            e.printStackTrace();
        }

    }

    // 12022018
    public boolean AddStock(familleManagement OfamilleManagement, StockManager OStockManager,
            SnapshotManager OSnapshotManager, tellerManagement OtellerManagement, TFamille OTFamille,
            Integer int_NUMBER, TGrossiste OTGrossiste, String str_REF_LIVRAISON, Date dt_SORTIE_USINE,
            Date dt_PEREMPTION, int int_NUMBER_GRATUIT, TTypeetiquette OTTypeetiquette, String str_REF_ORDER,
            String int_NUM_LOT, int ug, EntityManager em) {
        boolean result = false;
        TTypeStockFamille OTTypeStockFamille;
        TFamilleStock OTFamilleStock;
        TEtiquette OTEtiquette;
        Date now = new Date();
        try {
            TWarehouse OTWarehouse = new TWarehouse();
            OTWarehouse.setLgWAREHOUSEID(this.getKey().getComplexId());
            OTWarehouse.setLgUSERID(this.getOTUser());
            OTWarehouse.setLgFAMILLEID(OTFamille);
            OTWarehouse.setIntNUMBER(int_NUMBER);
            OTWarehouse.setDtPEREMPTION(dt_PEREMPTION);
            OTWarehouse.setDtSORTIEUSINE(dt_SORTIE_USINE);
            OTWarehouse.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTWarehouse.setLgGROSSISTEID(OTGrossiste);
            OTWarehouse.setStrREFORDER(str_REF_ORDER);
            OTWarehouse.setDtCREATED(now);
            OTWarehouse.setDtUPDATED(now);
            OTWarehouse.setIntNUMLOT(int_NUM_LOT);
            OTWarehouse.setIntNUMBERGRATUIT(int_NUMBER_GRATUIT);
            OTWarehouse.setStrSTATUT(commonparameter.statut_enable);
            OTWarehouse.setLgTYPEETIQUETTEID(OTTypeetiquette == null
                    ? this.getOdataManager().getEm().find(TTypeetiquette.class, Parameter.DEFAUL_TYPEETIQUETTE)
                    : OTFamille.getLgTYPEETIQUETTEID());
            OTEtiquette = OStockManager.createEtiquetteBis(OTWarehouse.getLgTYPEETIQUETTEID(),
                    OTWarehouse.getLgFAMILLEID(), OTWarehouse, String.valueOf(OTWarehouse.getIntNUMBER()));
            OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            this.getOdataManager().getEm().persist(OTWarehouse);

            OTTypeStockFamille = OStockManager.getTypeStockFamilleByTypestock("1", OTWarehouse.getLgFAMILLEID(),
                    this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            OTFamilleStock = OtellerManagement.geProductItemStock(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());

            // this.OSnapshotManager.SaveMouvementFamilleBis(OTFamille, "", commonparameter.ADD,
            // commonparameter.str_ACTION_ENTREESTOCK, int_NUMBER, this.getOTUser().getLgEMPLACEMENTID()); // a
            // decommenter en cas de probleme. 07/02/2017
            this.OSnapshotManager.createSnapshotMouvementArticleBons(OTFamille, int_NUMBER,
                    this.getOTUser().getLgEMPLACEMENTID(), OTFamilleStock); // 07/02/2017

            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
            OTFamilleStock.setIntUG((OTFamilleStock.getIntUG() != null ? (OTFamilleStock.getIntUG() + ug) : 0));
            this.getOdataManager().getEm().merge(OTTypeStockFamille);
            this.getOdataManager().getEm().merge(OTFamilleStock);

            this.BuildTSnapShopDalySortieFamille(OTFamille, int_NUMBER, int_NUMBER, 0);
            this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                this.getOdataManager().getEm().close();
            }
            e.printStackTrace();
        }

        return result;
    }
    // 16 02 2018

    public Integer getQtyLot(TBonLivraisonDetail lg_BON_LIVRAISON_DETAIL) {
        try {
            TFamille famille = lg_BON_LIVRAISON_DETAIL.getLgFAMILLEID();
            TBonLivraison on = lg_BON_LIVRAISON_DETAIL.getLgBONLIVRAISONID();
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TLot> root = cq.from(TLot.class);
            Join<TLot, TFamille> or = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(or.get(TFamille_.lgFAMILLEID), famille.getLgFAMILLEID()));
            criteria = cb.and(criteria, cb.equal(root.get(TLot_.strREFLIVRAISON), on.getStrREFLIVRAISON()));
            criteria = cb.and(criteria, cb.equal(root.get("lgGROSSISTEID").get("lgGROSSISTEID"),
                    lg_BON_LIVRAISON_DETAIL.getLgGROSSISTEID().getLgGROSSISTEID()));
            cq.select(cb.sumAsLong(root.get(TLot_.intNUMBER)));
            cq.where(criteria);
            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } catch (Exception e) {
            return 0;
        }

    }

    public int AddLot(Integer int_NUMBER, String str_SORTIE_USINE, String str_PEREMPTION, int int_NUMBER_GRATUIT,
            String lg_TYPEETIQUETTE_ID, TBonLivraisonDetail lg_BON_LIVRAISON_DETAIL, String int_NUM_LOT) {

        TTypeetiquette OTTypeetiquette = null;
        try {
            bonLivraisonManagement lm = new bonLivraisonManagement(this.getOdataManager(), this.getOTUser());
            TFamille OTProductItem = lg_BON_LIVRAISON_DETAIL.getLgFAMILLEID();
            TGrossiste OTGrossiste = lg_BON_LIVRAISON_DETAIL.getLgGROSSISTEID();
            TBonLivraison bonLivraison = lg_BON_LIVRAISON_DETAIL.getLgBONLIVRAISONID();
            try {
                OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);

            } catch (Exception e) {
            }
            Integer qty = getQtyLot(lg_BON_LIVRAISON_DETAIL) + int_NUMBER;
            if (lg_BON_LIVRAISON_DETAIL.getIntQTECMDE() < qty) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                this.buildTraceMessage(this.getOTranslate().getValue("SUCCES"),
                        "La quantité réçue est supérieure à la quantité commantée.");
                return 2;
            }

            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            TLot OTLot = new TLot();
            if (OTTypeetiquette != null) {
                OTLot.setLgTYPEETIQUETTEID(OTTypeetiquette);
            }

            OTLot.setLgLOTID(this.getKey().getComplexId());
            OTLot.setLgUSERID(this.getOTUser());
            OTLot.setStrSTATUT(commonparameter.statut_enable);
            OTLot.setLgFAMILLEID(OTProductItem);
            OTLot.setIntNUMBER(int_NUMBER + int_NUMBER_GRATUIT); // quantite commandé + quantité livré
            if (!"".equals(str_PEREMPTION)) {
                Date dt_PEREMPTION = java.sql.Date.valueOf(str_PEREMPTION);
                OTLot.setDtPEREMPTION(dt_PEREMPTION);
                LocalDate tonow = LocalDate.now();
                LocalDate dtpremption = LocalDate.parse(str_PEREMPTION);
                if (dtpremption.isBefore(tonow) || dtpremption.isEqual(tonow)) {
                    OTLot.setStrSTATUT(commonparameter.statut_perime);
                } else {
                    TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class,
                            "KEY_MONTH_PERIME");
                    int NBR = 0;
                    if (OTParameters != null) {
                        NBR = Integer.parseInt(OTParameters.getStrVALUE());
                    }
                    LocalDate peremption = tonow.plusMonths(NBR);
                    if (dtpremption.isBefore(peremption) || dtpremption.isEqual(peremption)) {
                        OTLot.setStrSTATUT(Parameter.STATUT_ENCOURS_PEREMPTION);
                    }

                }

            }
            if (!"".equals(str_SORTIE_USINE)) {
                LocalDate dtSORTIEUSINE = LocalDate.parse(str_SORTIE_USINE, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                OTLot.setDtSORTIEUSINE(java.sql.Date.valueOf(dtSORTIEUSINE));
            }
            OTLot.setStrREFLIVRAISON(bonLivraison.getStrREFLIVRAISON());
            OTLot.setLgGROSSISTEID(OTGrossiste);
            OTLot.setDtCREATED(new Date());
            OTLot.setDtUPDATED(new Date());
            OTLot.setStrREFORDER(bonLivraison.getLgORDERID().getStrREFORDER());
            OTLot.setIntNUMLOT(int_NUM_LOT);
            OTLot.setIntNUMBERGRATUIT(int_NUMBER_GRATUIT);
            OTLot.setIntQTYVENDUE(0);
            this.getOdataManager().getEm().persist(OTLot);
            lm.addWarehouse(lg_BON_LIVRAISON_DETAIL, OTProductItem, OTLot.getIntNUMBER(), OTGrossiste,
                    bonLivraison.getStrREFLIVRAISON(), OTLot.getDtSORTIEUSINE(), OTLot.getDtPEREMPTION(),
                    int_NUMBER_GRATUIT, OTLot.getLgTYPEETIQUETTEID(), OTLot.getStrREFORDER(), OTLot.getIntNUMLOT(),
                    this.getOdataManager().getEm());
            new orderManagement(this.getOdataManager(), this.getOTUser()).UpdateTBonLivraisonDetailFromBonLivraison(
                    lg_BON_LIVRAISON_DETAIL.getLgBONLIVRAISONDETAIL(), (int_NUMBER + int_NUMBER_GRATUIT),
                    int_NUMBER_GRATUIT);
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
            }
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return 1;
        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().close();
            }
            e.printStackTrace();
            return 0;
        }

    }

    public List<TSuggestionOrderDetails> getSuggestionOrderDetails(String lg_SUGGESTION_ORDER_ID) {
        List<TSuggestionOrderDetails> lstT = new ArrayList<>();
        try {
            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID = ?1 ")
                    .setParameter(1, lg_SUGGESTION_ORDER_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstT;
    }

}
