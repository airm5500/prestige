/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stockManagement;

import bll.commandeManagement.suggestionManagement;
import bll.common.Parameter;
import bll.configManagement.CalendrierManager;
import bll.configManagement.EmplacementManagement;
import bll.configManagement.familleManagement;
import bll.facture.factureManagement;
import bll.preenregistrement.Preenregistrement;
import bll.teller.SnapshotManager;
import bll.teller.caisseManagement;
import bll.teller.clientManager;
import bll.teller.tellerManagement;
import bll.userManagement.privilege;
import bll.userManagement.user;
import bll.warehouse.WarehouseManager;
import dal.TCashTransaction;
import dal.TCompteClient;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TModeReglement;
import dal.TMouvementSnapshot;
import dal.TNatureVente;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TRecettes;
import dal.TReglement;
import dal.TRetourdepot;
import dal.TRetourdepotdetail;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TTypeStockFamille;
import dal.TTypeVente;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.ParameterMode;
import javax.persistence.Query;
import javax.persistence.StoredProcedureQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Root;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.impl.MvtProduitObselete;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;
import util.DateConverter;

/**
 *
 * @author MARTIAL
 */
public class DepotManager extends bll.bllBase {

    familleManagement OfamilleManagement = null;
    Preenregistrement OPreenregistrement = null;
    WarehouseManager OWarehouseManager = null;

    public DepotManager(dataManager OdataManager, TUser OTuser) {
        super.setOTUser(OTuser);
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
        OWarehouseManager = new WarehouseManager(OdataManager, OTuser);
        OfamilleManagement = new familleManagement(OdataManager, OTuser);
        OPreenregistrement = new Preenregistrement(OdataManager, OTuser);
    }

    public TPreenregistrementDetail CreateDetailsPreenregistrement(String lg_PREENREGISTREMENT_ID, String lg_famille_id,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id, int lg_REMISE_ID,
            Date dt_CREATED, int int_PRICE_INIT) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        TPreenregistrement OTPreenregistrement = null;
        TTypeVente OTTypeVente = null;
        TFamille OTFamille = null;
        String str_type = "";
        int int_vente_amount = 0, int_remise_price = 0;
        try {
            OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            OTFamille = OfamilleManagement.getTFamille(lg_famille_id);
            OTTypeVente = (TTypeVente) this.find(lg_type_vente_id, new TTypeVente());
            OTPreenregistrementDetail = OPreenregistrement.findFamilleInTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_famille_id, OTPreenregistrement.getStrSTATUT());

            if (OTPreenregistrementDetail == null) {
                OTPreenregistrementDetail = new TPreenregistrementDetail();
                OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
                OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
                OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
                OTPreenregistrementDetail.setIntPRICE(OPreenregistrement.GetTotalDetail(int_PRICE_INIT, int_quantite));
                OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_INIT);
                OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
                OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
                OTPreenregistrementDetail.setIntAVOIR(0);
                OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
                OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
                OTPreenregistrementDetail.setDtUPDATED(dt_CREATED);
                this.persiste(OTPreenregistrementDetail);
            } else {
                OTPreenregistrementDetail.setIntPRICE(OTPreenregistrementDetail.getIntPRICE() + (OPreenregistrement
                        .GetTotalDetail(OTPreenregistrementDetail.getIntPRICEUNITAIR(), int_quantite)));
                OTPreenregistrementDetail.setIntQUANTITY(OTPreenregistrementDetail.getIntQUANTITY() + int_quantite);
                OTPreenregistrementDetail
                        .setIntQUANTITYSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_quantite);
                OTPreenregistrementDetail.setDtUPDATED(new Date());
                this.merge(OTPreenregistrementDetail);
            }
            // this.persiste(OTPreenregistrementDetail);
            int_vente_amount = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT());
            int_remise_price = (int_vente_amount * lg_REMISE_ID) / 100;

            OWarehouseManager.updateVirtualStock(OTPreenregistrementDetail, OTPreenregistrementDetail.getIntQUANTITY(),
                    "ins");

            if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = Parameter.KEY_VENTE_ORDONNANCE;
            }
            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntPRICE(int_vente_amount);
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            this.merge(OTPreenregistrement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTPreenregistrementDetail;
        } catch (NoResultException e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajouter ce produit à la vente");
            return null;
        }
    }

    public TPreenregistrementDetail UpdateDetailsPreenregistrement(String lg_PREENREGISTREMENT_DETAIL_ID,
            String lg_PREENREGISTREMENT_ID, String lg_famille_id, int int_PRICE, int int_quantite,
            int int_quantite_served, String lg_type_vente_id, int int_vente_amount, int lg_REMISE_ID) {
        TPreenregistrementDetail OTPreenregistrementDetail = null;
        TPreenregistrement OTPreenregistrement = null;
        int int_remise_price = 0, int_total_vente_brut = 0;

        try {
            OTPreenregistrementDetail = this.getOdataManager().getEm().find(TPreenregistrementDetail.class,
                    lg_PREENREGISTREMENT_DETAIL_ID);
            OTPreenregistrement = OTPreenregistrementDetail.getLgPREENREGISTREMENTID();
            if (OfamilleManagement.checkpricevente(OTPreenregistrementDetail.getLgFAMILLEID(), int_PRICE)) {
                this.buildErrorTraceMessage("Impossible. Vérifiez le montant à modifier du prix de vente");
                return null;
            }

            int int_last_nb = OTPreenregistrementDetail.getIntQUANTITY();
            OTPreenregistrementDetail.setLgFAMILLEID(OfamilleManagement.getTFamille(lg_famille_id));
            OTPreenregistrementDetail.setIntPRICE(OPreenregistrement.GetTotalDetail(int_PRICE, int_quantite));
            OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
            OTPreenregistrementDetail.setDtUPDATED(new Date());
            this.persiste(OTPreenregistrementDetail);

            int_total_vente_brut = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT());
            int_remise_price = (int_total_vente_brut * lg_REMISE_ID) / 100;
            OWarehouseManager.updateVirtualStock(OTPreenregistrementDetail, (int_quantite - int_last_nb), "upd");

            // OTPreenregistrement.setIntPRICE(OTPreenregistrement.getIntPRICE() - int_remise_price);
            OTPreenregistrement.setIntPRICE(int_total_vente_brut);
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            this.persiste(OTPreenregistrement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de la mise à jour de la ligne");

        }
        return OTPreenregistrementDetail;
    }

    public TPreenregistrement addToPreenregistrement(String lg_PREENREGISTREMENT_ID, String lg_famille_id,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id, int lg_REMISE_ID,
            int int_PRICE_INIT) {
        return this
                .CreateDetailsPreenregistrement(lg_PREENREGISTREMENT_ID, lg_famille_id, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, new Date(), int_PRICE_INIT)
                .getLgPREENREGISTREMENTID();
    }

    public TPreenregistrement updateToPreenregistrement(String lg_PREENREGISTREMENT_ID, String lg_famille_id,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id, int lg_REMISE_ID,
            int int_PRICE_INIT) {
        return this
                .CreateDetailsPreenregistrement(lg_PREENREGISTREMENT_ID, lg_famille_id, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, new Date(), int_PRICE_INIT)
                .getLgPREENREGISTREMENTID();
    }

    public TPreenregistrement CreatePreVente(String lg_COMPTE_CLIENT_ID, String lg_NATURE_VENTE_ID, Date dt_CREATED,
            String KEY_PARAMETER, String lg_USER_VENDEUR_ID) {
        TPreenregistrement OTPreenregistrement = new TPreenregistrement();
        TEmplacement OTEmplacement = null;
        TTypeVente OTTypeVente = null;
        TNatureVente OTNatureVente = null;
        TUser OTUserVendeur = null;
        try {
            OTEmplacement = new EmplacementManagement(this.getOdataManager()).getEmplacement(lg_COMPTE_CLIENT_ID);
            OTTypeVente = OPreenregistrement.getTypeVente(OTEmplacement.getLgTYPEDEPOTID().getStrNAME());
            OTNatureVente = this.getOdataManager().getEm().find(TNatureVente.class, lg_NATURE_VENTE_ID);
            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);

            if (OTEmplacement == null || OTTypeVente == null || OTNatureVente == null) {
                this.buildErrorTraceMessage("Echec de création de la pré-vente. Dépôt inconnu");
                return null;
            }

            OTPreenregistrement.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setStrREF(OPreenregistrement.buildVenteRef(dt_CREATED, KEY_PARAMETER));
            OTPreenregistrement.setIntPRICE(0);
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Process);
            OTPreenregistrement.setDtCREATED(dt_CREATED);
            OTPreenregistrement.setDtUPDATED(dt_CREATED);
            OTPreenregistrement.setLgNATUREVENTEID(OTNatureVente);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            OTPreenregistrement.setIntSENDTOSUGGESTION(0);
            OTPreenregistrement.setBISCANCEL(Boolean.FALSE);
            OTPreenregistrement
                    .setStrFIRSTNAMECUSTOMER(OTEmplacement.getStrFIRSTNAME() + " " + OTEmplacement.getStrLASTNAME());
            OTPreenregistrement.setStrLASTNAMECUSTOMER(OTEmplacement.getStrDESCRIPTION());
            OTPreenregistrement.setStrPHONECUSTOME(OTEmplacement.getStrPHONE());
            // addItem(OTPreenregistrement, lg_famille_id, 0, 0, 0, lg_NATURE_VENTE_ID, 0, 0)
            if (this.persiste(OTPreenregistrement)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                new logger().OCategory
                        .info(" creation de OTPreenregistrement  " + OTPreenregistrement.getLgPREENREGISTREMENTID());
            } else {
                this.buildErrorTraceMessage("Echec de création de la pré-vente");
                return null;
            }
            return OTPreenregistrement;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la pré-vente");
            return null;
        }
    }

    public int GetVenteTotalwithRemise(String lg_PREENREGISTREMENT_ID) {
        int Total_vente = 0;
        TPreenregistrement OTPreenregistrement = null;
        try {
            OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement != null) {
                Total_vente = OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Total vente avec remise " + Total_vente);
        return Total_vente;
    }

    public boolean CloturerVente(String lg_PREENREGISTREMENT_ID, String lg_TYPE_REGLEMENT_ID, int int_TOTAL_VENTE_RECAP,
            int int_AMOUNT_RECU, int int_AMOUNT_REMIS, String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT,
            String lg_MOTIF_REGLEMENT_ID, String str_ORDONNANCE, String str_FIRST_NAME_FACTURE,
            String str_LAST_NAME_FACTURE, String int_NUMBER_FACTURE, String str_NUMERO_SECURITE_SOCIAL,
            int int_amount_remise, String lg_USER_VENDEUR_ID) {
        boolean result = false;
        String str_type = "", str_STATUTVENTE = commonparameter.statut_nondiffere;
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        EmplacementManagement OEmplacementManagement = new EmplacementManagement(this.getOdataManager(),
                this.getOTUser());
        TTypeVente OTTypeVente = null;
        TPreenregistrement OTPreenregistrement = null;
        TTypeReglement OTTypeReglement = null;
        TReglement OTReglement = null;
        TTypeMvtCaisse OTTypeMvtCaisse = null;
        TEmplacement OTEmplacement = null;
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = new ArrayList<>();
        TRecettes OTRecettes = null;
        TUser OTUserVendeur = null;
        try {
            OTEmplacement = OEmplacementManagement.getEmplacementByCompteClient(str_REF_COMPTE_CLIENT);
            OTTypeVente = OPreenregistrement.getTypeVente(OTEmplacement.getLgTYPEDEPOTID().getStrNAME());

            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);
            System.out.println("lg_USER_VENDEUR_ID *********************  " + lg_USER_VENDEUR_ID);

            if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
                this.buildErrorTraceMessage("Impossible de valide la commande ", "La caisse est fermée");
                return false;
            }

            OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente",
                        "Ref commande inconnue " + lg_PREENREGISTREMENT_ID);
                return false;
            }

            if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Closed)) {
                this.buildErrorTraceMessage("Impossible de valider la vente",
                        "la vente a deja ete  " + this.getOTranslate().getValue(commonparameter.statut_is_Closed));
                return false;
            }

            OTTypeReglement = this.getOdataManager().getEm().find(dal.TTypeReglement.class, lg_TYPE_REGLEMENT_ID);
            OTReglement = this.getOdataManager().getEm().find(dal.TReglement.class, lg_REGLEMENT_ID);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);

            if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                        this.getOdataManager());
            } else {
                str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                        this.getOdataManager());
            }

            String Description = OTTypeMvtCaisse.getStrDESCRIPTION();
            lstTPreenregistrementDetail = OPreenregistrement.getTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                if (OTPreenregistrementDetail.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
                    OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                    OTPreenregistrementDetail.setIntPRICEOTHER(OTPreenregistrementDetail.getIntPRICE());
                    OTPreenregistrementDetail.setIntPRICEDETAILOTHER(OTPreenregistrementDetail.getIntPRICEUNITAIR());
                    OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntQUANTITY());
                    OTPreenregistrementDetail.setDtUPDATED(new Date());
                    this.persiste(OTPreenregistrementDetail);
                    // maf stock
                    if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID()
                            .equalsIgnoreCase(Parameter.VENTE_DEPOT_EXTENSION)) {
                        System.out.println("OTPreenregistrement  dbhbdbbd  ");
                        OWarehouseManager.updateReelStockForDepot(OTPreenregistrementDetail.getLgFAMILLEID(),
                                (OTPreenregistrementDetail.getIntAVOIR() == 0
                                        ? OTPreenregistrementDetail.getIntQUANTITY()
                                        : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
                                "ins", OTEmplacement);
                        // OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                        // commonparameter.ADD, commonparameter.str_ACTION_ENTREESTOCK,
                        // OTPreenregistrementDetail.getIntQUANTITY(), this.getOTUser(), OTEmplacement); // a
                        // decommenter en cas de probleme 07/02/2017
                        // OSnapshotManager.createDepotSnapshotMouvementArticle(OTPreenregistrementDetail.getLgFAMILLEID(),
                        // (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY() :
                        // OTPreenregistrementDetail.getIntQUANTITYSERVED()), commonparameter.REMOVE,
                        // this.getOTUser().getLgEMPLACEMENTID());// 07/02/2017
                        // OSnapshotManager.createDepotSnapshotMouvementArticle(OTPreenregistrementDetail.getLgFAMILLEID(),
                        // (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY() :
                        // OTPreenregistrementDetail.getIntQUANTITYSERVED()), commonparameter.ADD, OTEmplacement);//
                        // 07/02/2017

                    } else {
                        System.out.println("OTPreenregistrement  *******************************  ");
                        OSnapshotManager.createDepotSnapshotMouvementArticle(OTPreenregistrementDetail.getLgFAMILLEID(),
                                (OTPreenregistrementDetail.getIntAVOIR() == 0
                                        ? OTPreenregistrementDetail.getIntQUANTITY()
                                        : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
                                commonparameter.REMOVE, this.getOTUser().getLgEMPLACEMENTID());// 07/02/2017
                        OSnapshotManager.createDepotSnapshotMouvementArticle(OTPreenregistrementDetail.getLgFAMILLEID(),
                                (OTPreenregistrementDetail.getIntAVOIR() == 0
                                        ? OTPreenregistrementDetail.getIntQUANTITY()
                                        : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
                                commonparameter.ADD, OTEmplacement);// 07/02/2017

                    }
                    OWarehouseManager.updateReelStock(OTPreenregistrementDetail,
                            (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                    : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
                            "ins");
                    // OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                    // commonparameter.REMOVE, commonparameter.str_ACTION_VENTE,
                    // OTPreenregistrementDetail.getIntQUANTITY(), this.getOTUser().getLgEMPLACEMENTID()); // a
                    // decommenter en cas de probleme 07/02/2017

                    if (this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                            .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                        OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                                (OTPreenregistrementDetail.getIntAVOIR() == 0
                                        ? OTPreenregistrementDetail.getIntQUANTITY()
                                        : OTPreenregistrementDetail.getIntQUANTITYSERVED()));
                    }

                }
            }

            // double dbl_total_vente =
            // OPreenregistrement.GetVenteTotalAmountTTc(OTPreenregistrement.getLgPREENREGISTREMENTID());
            // OTPreenregistrement.setIntPRICE((int) dbl_total_vente);
            OTPreenregistrement.setIntPRICEREMISE((OTPreenregistrement.getIntPRICE() * int_amount_remise) / 100);
            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntACCOUNT(OTPreenregistrement.getIntPRICE());
            OTPreenregistrement.setIntREMISEPARA(0);
            if (OTReglement == null) {
                this.buildErrorTraceMessage("Impossible de cloture la vente", "le règlement n'a pas été effectué");
                return false;
            }

            // a revoir le process d'encaissement (la recette)
            // si depot extension, mettre comportement vente VO sinon appliquer la recette comme pour les ventes au
            // comptant
            if (str_type.equals(Parameter.KEY_VENTE_ORDONNANCE)) {

                OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                        new Double(OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()) * (-1),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                        str_type, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                        lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        commonparameter.TRANSACTION_CREDIT, true);
                // new clientManager(this.getOdataManager(),
                // this.getOTUser()).addToMytransaction(OTEmplacement.getLgCOMPTECLIENTID(),
                // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_RECU, (OTPreenregistrement.getIntPRICE() -
                // OTPreenregistrement.getIntPRICEREMISE()) * (-1));
            } else {
                if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) {
                    new logger().OCategory.info(" *** Valeur recupérée du mode de reglement *** "
                            + OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID());
                    if (OTEmplacement.getLgCOMPTECLIENTID() == null) {
                        new logger().OCategory.info(" *** Pas de compte client associe a ce differe *** ");
                        return false;
                    }

                    // code ajouté
                    if (int_AMOUNT_RECU > 0) {
                        str_STATUTVENTE = commonparameter.statut_differe;

                        int int_amount_differe = ((OTPreenregistrement.getIntPRICE()
                                - OTPreenregistrement.getIntPRICEREMISE()) - int_AMOUNT_RECU);
                        new logger().OCategory.info("int_amount_differe " + int_amount_differe); // dette a payer du
                                                                                                 // client
                        if (int_amount_differe > 0) {
                            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(
                                    Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES, this.getOdataManager());
                            OTRecettes = OcaisseManagement.AddRecette(new Double(int_amount_differe + "") * (-1),
                                    Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID, str_type,
                                    bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                                    lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                    commonparameter.TRANSACTION_CREDIT, true);
                            if (OTRecettes == null) {
                                this.buildErrorTraceMessage("Impossible de cloture la vente",
                                        "la recette du differe n'a pas pu etre MAJ");
                                return false;
                            }
                            // new clientManager(this.getOdataManager(),
                            // this.getOTUser()).addToMytransaction(OTEmplacement.getLgCOMPTECLIENTID(),
                            // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_RECU, int_amount_differe *
                            // (-1));
                        }

                        OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                                new Double(int_AMOUNT_RECU), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                                str_type, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                                lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, true);
                    }

                    // fin code ajouté
                } else {
                    OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                            new Double(OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                            str_type, bll.common.Parameter.KEY_TASK_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                            lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                            commonparameter.TRANSACTION_CREDIT, true);
                }

            }

            OTPreenregistrement.setStrSTATUTVENTE(str_STATUTVENTE);

            OTPreenregistrement.setLgREGLEMENTID(OTReglement);

            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setStrREFBON("");
            OTPreenregistrement.setStrORDONNANCE(str_ORDONNANCE);
            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setStrREF(OPreenregistrement.buildVenteRef(OTPreenregistrement.getDtUPDATED(),
                    Parameter.KEY_LAST_ORDER_NUMBER_VENTE)); // code ajouté
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
            if (this.persiste(OTPreenregistrement)) {
                this.buildSuccesTraceMessage("Vente dépôt terminée avec succès");
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de clôture de la vente dépôt");
            }

            // code ajouté. Mise a jour du calendrier de l'officine
            new CalendrierManager(this.getOdataManager(), this.getOTUser()).createCalendrier(date.getoMois(new Date()),
                    Integer.parseInt(date.getAnnee(new Date())));
            // fin code ajouté

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public boolean CloturerAnnulerVente(String lg_PREENREGISTREMENT_ID, String str_REF_BON, String lg_TYPE_REGLEMENT_ID,
            String lg_TYPE_VENTE_ID, int int_TOTAL_VENTE_RECAP, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            String lg_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID, String str_ORDONNANCE,
            int int_CUST_PART) {
        boolean result = false;
        int int_total_vente = 0;
        Double int_send_to_cashtransaction = 0.0;
        String str_type = "";
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        TPreenregistrement OTPreenregistrement = null;
        TTypeReglement OTTypeReglement = null;
        TReglement OTReglement = null;
        TTypeMvtCaisse OTTypeMvtCaisse = null;
        TTypeVente OTTypeVente = null;
        TRecettes OTRecettes = null;
        TEmplacement OTEmplacement = null;

        try {

            OTTypeVente = this.getOdataManager().getEm().find(TTypeVente.class, lg_TYPE_VENTE_ID);
            OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);

            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente", "Ref vente inconnue");
                return false;
            }
            if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Closed)) {
                this.buildErrorTraceMessage("Impossible de valider la vente",
                        "la vente a deja ete  " + this.getOTranslate().getValue(commonparameter.statut_is_Closed));
                return false;
            }

            OTTypeReglement = this.getOdataManager().getEm().find(TTypeReglement.class, lg_TYPE_REGLEMENT_ID);
            OTReglement = this.getOdataManager().getEm().find(dal.TReglement.class, lg_REGLEMENT_ID);
            OTEmplacement = new EmplacementManagement(this.getOdataManager())
                    .getEmplacementByCompteClient(str_REF_COMPTE_CLIENT);
            System.out.println(" OTEmplacement  depot ****************> " + OTEmplacement + " ************************ "
                    + str_REF_COMPTE_CLIENT);
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            String Description = "ENC. Vente " + OTPreenregistrement.getStrREF() + " ";

            List<TPreenregistrementDetail> lstTPreenregistrementDetail = OPreenregistrement
                    .getTPreenregistrementDetail(OTPreenregistrement.getLgPREENREGISTREMENTID());

            lstTPreenregistrementDetail.stream().map((OTPreenregistrementDetail) -> {
                // a revoir en mode dégug pour controle le stock
                OSnapshotManager.SaveMouvementFamille(OTPreenregistrementDetail.getLgFAMILLEID(), "",
                        commonparameter.REMOVE, commonparameter.str_ACTION_VENTE,
                        OTPreenregistrementDetail.getIntQUANTITY(), this.getOTUser().getLgEMPLACEMENTID());
                return OTPreenregistrementDetail;
            }).forEachOrdered((OTPreenregistrementDetail) -> {
                OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                        OTPreenregistrementDetail.getIntQUANTITY());
                // fin a revoir en mode dégug pour controle le stock
            });

            OTPreenregistrement.setIntPRICE(int_TOTAL_VENTE_RECAP);

            if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                        this.getOdataManager());
            } else {
                str_type = Parameter.KEY_VENTE_ORDONNANCE;
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                        this.getOdataManager());
            }
            new logger().OCategory.info("int_total_vente " + int_total_vente + " Montant remise "
                    + OTPreenregistrement.getIntPRICEREMISE());
            int_send_to_cashtransaction = Double
                    .valueOf(OTPreenregistrement.getIntPRICE() + ((-1) * OTPreenregistrement.getIntPRICEREMISE()));
            new logger().OCategory.info("int_send_to_cashtransaction " + int_send_to_cashtransaction);

            new logger().OCategory.info(" @@@@@@ le type de vente choisi est @@@@@  " + str_type);

            if (OTReglement == null) {
                this.buildErrorTraceMessage("Impossible de cloture la vente", "le reglement n'a pas été effectué");
                return false;
            }
            new logger().OCategory.info(" *** OTTypeReglement   cloture vente  *** " + OTTypeReglement.getStrNAME());
            OTPreenregistrement.setStrSTATUTVENTE(commonparameter.statut_nondiffere);
            if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_EXTENSION)) {

                // TCompteClient OTCompteClient = (TCompteClient) this.find(str_REF_COMPTE_CLIENT, new TCompteClient());
                if (OTEmplacement.getLgCOMPTECLIENTID() == null) {
                    new logger().OCategory.info(" *** Pas de compte client associe a ce differe *** ");
                    return false;
                }
                int int_amount_differe = ((int_send_to_cashtransaction.intValue() * (-1)) - int_AMOUNT_RECU);
                new logger().OCategory.info("int_amount_differe " + int_amount_differe); // dette a payer du client
                // new clientManager(this.getOdataManager(), this.getOTUser()).addToMytransaction(OTCompteClient,
                // lg_PREENREGISTREMENT_ID, int_send_to_cashtransaction.intValue() * (-1)); // ancienne bonne version.
                // new clientManager(this.getOdataManager(),
                // this.getOTUser()).addToMytransaction(OTEmplacement.getLgCOMPTECLIENTID(), lg_PREENREGISTREMENT_ID,
                // int_AMOUNT_RECU, int_amount_differe);

            }
            OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecetteAnnulerVente(
                    int_send_to_cashtransaction, Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(), str_type,
                    bll.common.Parameter.KEY_TASK_ANNULE_VENTE, lg_REGLEMENT_ID, str_REF_COMPTE_CLIENT,
                    lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT,
                    true); // a revoir

            if (OTRecettes == null) {
                this.buildErrorTraceMessage("Impossible de cloture la vente", "la recette n'a pas pu etre mise à jour");
                return false;
            }
            OTPreenregistrement.setLgREGLEMENTID(OTReglement);
            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setStrREFBON(OTPreenregistrement.getStrREFTICKET());
            OTPreenregistrement.setStrORDONNANCE(str_ORDONNANCE);
            OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
            OTPreenregistrement.setDtUPDATED(new Date());

            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                if (OTPreenregistrementDetail.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
                    OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                    OTPreenregistrementDetail.setIntPRICEOTHER(OTPreenregistrementDetail.getIntPRICE());
                    OTPreenregistrementDetail.setIntPRICEDETAILOTHER(OTPreenregistrementDetail.getIntPRICEUNITAIR());
                    OTPreenregistrementDetail.setIntAVOIRSERVED(OTPreenregistrementDetail.getIntQUANTITY());
                    OTPreenregistrementDetail.setDtUPDATED(new Date());
                    this.merge(OTPreenregistrementDetail);
                    OWarehouseManager.updateReelStockForDepot(OTPreenregistrementDetail.getLgFAMILLEID(),
                            (-1) * OTPreenregistrementDetail.getIntQUANTITY(), "del", OTEmplacement); // a remplacer par
                                                                                                      // "ins" en cas de
                                                                                                      // probleme
                }
            }

            this.merge(OTPreenregistrement);

            // this.refresh(OTPreenregistrement);
            // code ajouté. Mise a jour du calendrier de l'officine
            new CalendrierManager(this.getOdataManager(), this.getOTUser()).createCalendrier(date.getoMois(new Date()),
                    Integer.parseInt(date.getAnnee(new Date())));
            // fin code ajouté
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
        }

        return true;
    }

    public TPreenregistrement AnnulerVente(String lg_PREENREGISTREMENT_ID) {

        String str_type = "";
        String str_reglement = "";
        String lgTypeVente;
        TPreenregistrement OTPreenregistrementNew = null;

        if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
            this.buildErrorTraceMessage("Impossible d'annuler la vente", "La caisse est fermée");
            return null;
        }

        TPreenregistrement OTPreenregistrement = (TPreenregistrement) this.find(lg_PREENREGISTREMENT_ID,
                new TPreenregistrement());

        if (OTPreenregistrement == null) {
            this.buildErrorTraceMessage("Impossible dannuler la vente",
                    "Ref vente inconnue " + lg_PREENREGISTREMENT_ID);
            return null;
        }

        this.refresh(OTPreenregistrement);

        if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
            this.buildErrorTraceMessage("Impossible d annuler la vente", "la vente n'a jamais ete cloturee  "
                    + this.getOTranslate().getValue(commonparameter.statut_is_Process));
            return null;
        }

        if (new factureManagement(this.getOdataManager(), this.getOTUser())
                .checkChargedPreenregistrement(OTPreenregistrement.getLgPREENREGISTREMENTID())) {
            this.buildErrorTraceMessage("Impossible de supprimer cette vente. Elle figure déjà sur une facture.");
            return null;
        }
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = OPreenregistrement.getTPreenregistrementDetail(
                OTPreenregistrement.getLgPREENREGISTREMENTID(), commonparameter.statut_is_Closed);
        if (lstTPreenregistrementDetail == null || lstTPreenregistrementDetail.isEmpty()) {
            this.buildErrorTraceMessage("Cette Vente n'a pas de details");
            return null;
        }
        // lgTypeVente=OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID();
        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
            str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
        } else {
            str_type = Parameter.KEY_VENTE_ORDONNANCE;
        }

        List<TCashTransaction> lstTCashTransaction;
        lstTCashTransaction = this.getOdataManager().getEm()
                .createQuery(
                        "SELECT t FROM TCashTransaction t WHERE t.strRESSOURCEREF LIKE ?1  ORDER BY t.dtCREATED DESC  ")
                .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID()).getResultList();

        if (lstTCashTransaction == null || lstTCashTransaction.isEmpty()) {
            this.buildErrorTraceMessage("Cette Vente n'a pas de cash transaction");
            return null;
        }

        TTypeReglement OTTypeReglement = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgMODEREGLEMENTID()
                .getLgTYPEREGLEMENTID(); // this.getOdataManager().getEm().find(dal.TTypeReglement.class,
                                         // lstTCashTransaction.get(0).getLgTYPEREGLEMENTID().);

        if (OTTypeReglement == null) {
            this.buildErrorTraceMessage("Error", "OTTypeReglement is null");
            return null;
        } else {

            str_reglement = OTTypeReglement.getLgTYPEREGLEMENTID();

        }
        int amount_recu = lstTCashTransaction.get(0).getIntAMOUNTRECU();
        int amount_remis = lstTCashTransaction.get(0).getIntAMOUNTREMIS();
        String strreglementid = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgREGLEMENTID();
        String strmotifreglementid = lstTCashTransaction.get(0).getLgMOTIFREGLEMENTID().getLgMOTIFREGLEMENTID();
        String strcompteclientref = lstTCashTransaction.get(0).getStrREFCOMPTECLIENT();
        System.out.println("strcompteclientref ***************************** >  " + strcompteclientref
                + " -------------------------");

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        OTPreenregistrementNew = this.CreatePreVente(strcompteclientref,
                OTPreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID(), new Date(),
                Parameter.KEY_LAST_ORDER_NUMBER_VENTE, OTPreenregistrement.getLgUSERVENDEURID().getLgUSERID());

        // OTPreenregistrementNew.setLgREMISEID(OTPreenregistrement.getLgREMISEID());
        // code ajouté pris en compte du nom de l'acheteur
        OTPreenregistrementNew.setStrFIRSTNAMECUSTOMER(OTPreenregistrement.getStrFIRSTNAMECUSTOMER());
        OTPreenregistrementNew.setStrLASTNAMECUSTOMER(OTPreenregistrement.getStrLASTNAMECUSTOMER());
        OTPreenregistrementNew.setStrNUMEROSECURITESOCIAL(OTPreenregistrement.getStrNUMEROSECURITESOCIAL());
        OTPreenregistrementNew.setStrPHONECUSTOME(OTPreenregistrement.getStrPHONECUSTOME());
        OTPreenregistrementNew.setIntPRICEREMISE((-1) * OTPreenregistrement.getIntPRICEREMISE());
        OTPreenregistrementNew.setStrTYPEVENTE(str_type);
        this.merge(OTPreenregistrementNew);
        // fin code ajouté

        for (int i = 0; i < lstTPreenregistrementDetail.size(); i++) {
            OTPreenregistrementDetail = lstTPreenregistrementDetail.get(i);
            OPreenregistrement.CreateDetailsPreenregistrement(OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                    OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(),
                    (OTPreenregistrementDetail.getIntPRICE() * (-1)),
                    (OTPreenregistrementDetail.getIntQUANTITY() * (-1)),
                    (OTPreenregistrementDetail.getIntQUANTITYSERVED() * (-1)),
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(), null,
                    OTPreenregistrement.getLgREMISEID(), OTPreenregistrementNew.getDtCREATED(),
                    OTPreenregistrementDetail.getIntPRICEUNITAIR(), (OTPreenregistrementDetail.getIntAVOIR() * (-1)),
                    OTPreenregistrementDetail.getIntFREEPACKNUMBER());
        }
        this.CloturerAnnulerVente(OTPreenregistrementNew.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrREFBON(),
                str_reglement, OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                (OTPreenregistrement.getIntPRICE() * (-1)), (amount_recu * (-1)), (amount_remis * (-1)), strreglementid,
                strcompteclientref, strmotifreglementid, OTPreenregistrement.getStrORDONNANCE(), 0);

        OTPreenregistrement.setDtUPDATED(new Date());
        OTPreenregistrement.setBISCANCEL(Boolean.TRUE);
        OTPreenregistrement.setDtANNULER(new Date());
        if (OTPreenregistrementNew != null) {
            OTPreenregistrement.setLgPREENGISTREMENTANNULEID(OTPreenregistrementNew.getLgPREENREGISTREMENTID());
        }
        this.merge(OTPreenregistrement);
        // Ajout du code de traçage
        this.do_event_log(commonparameter.ALL, "Annulation de la vente de référence " + OTPreenregistrement.getStrREF(),
                this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                commonparameter.statut_enable, "TPreenregistrement", "Annulation de vente", "Annulation de vente",
                this.getOTUser().getLgUSERID());
        // fin du code de traçage

        this.buildTraceMessage("Succes", " Operation effectuee avec succes");
        return OTPreenregistrementNew;
    }

    // liste des preventes depots
    public List<TPreenregistrement> getListeTPreenregistrement(String search_value, String lg_PREENREGISTREMENT_ID,
            String str_STATUT, String lg_USER_ID, Date dt_Date_Debut, Date dt_Date_Fin, String str_TYPE_VENTE) {
        List<TPreenregistrement> lst = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            if (Oprivilege.isColonneStockMachineIsAuthorize(commonparameter.str_SHOW_VENTE)) {
                lg_USER_ID = "%%";
            }

            lst = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TPreenregistrement t WHERE t.lgPREENREGISTREMENTID LIKE ?1 AND t.strREF LIKE ?2 AND t.strSTATUT LIKE ?3 AND t.lgUSERID.lgUSERID LIKE ?4 AND t.dtUPDATED > ?5 AND t.dtUPDATED <= ?6 AND t.strTYPEVENTE LIKE ?7 AND (t.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?8 OR t.lgTYPEVENTEID.lgTYPEVENTEID LIKE ?9) ORDER BY t.dtUPDATED ASC")
                    .setParameter(1, lg_PREENREGISTREMENT_ID).setParameter(2, search_value + "%")
                    .setParameter(3, str_STATUT).setParameter(4, lg_USER_ID).setParameter(5, dt_Date_Debut)
                    .setParameter(6, dt_Date_Fin).setParameter(7, str_TYPE_VENTE)
                    .setParameter(8, Parameter.VENTE_DEPOT_AGREE).setParameter(9, Parameter.VENTE_DEPOT_EXTENSION)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return lst;

    }

    // fin liste des preventes depots
    // creation d'une prevente pour un depot par importation
    public boolean CreatePreVenteByImport(List<String> lstData, String lg_EMPLACEMENT_ID) {
        TPreenregistrement OTPreenregistrement = null;
        boolean result = false;
        int count = 0;
        TFamille OTFamille = null;
        try {
            if (lstData.size() <= 0) {
                this.buildErrorTraceMessage("Echec de l'opération. Aucune ligne de produit trouvé");
                return result;
            }
            OTPreenregistrement = this.CreatePreVente(lg_EMPLACEMENT_ID, Parameter.KEY_NATURE_VENTE_DEPOT, new Date(),
                    Parameter.KEY_LAST_ORDER_NUMBER_PREVENTE, this.getOTUser().getLgUSERID());
            if (OTPreenregistrement != null) {
                for (int i = 0; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                    new logger().OCategory.info("i " + i + " valeur " + lstData.get(i)); // ligne courant
                    String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                                                                    // differentes colonnes
                    OTFamille = OfamilleManagement.getTFamille(tabString[0].trim());
                    if (OTFamille != null && this.addToPreenregistrement(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                            OTFamille.getLgFAMILLEID(), OTFamille.getIntPRICE(), Integer.parseInt(tabString[3]),
                            Integer.parseInt(tabString[3]), Parameter.VENTE_DEPOT_EXTENSION, 0,
                            OTFamille.getIntPRICE()) != null) {
                        count++;
                    } else {
                        this.buildErrorTraceMessage("Echec de transformation des produits vendus du depot en vente");
                    }

                }
                if (count == lstData.size()) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildSuccesTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                    result = true;
                }

            } else {
                this.buildErrorTraceMessage("Echec de transformation des produits vendus du depot en vente");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la vente");
        }
        return result;
    }

    // fin creation d'une prevente pour un depot par importation
    // suppression de produit dans une vente
    public TPreenregistrement DeletePreenregistrementDetail(String lg_PREENREGISTREMENT_DETAIL_ID, int lg_REMISE_ID) {
        TPreenregistrement OTPreenregistrement = null;
        TPreenregistrementDetail OPreenregistrementDetail = null;
        int int_total_vente_brut = 0, int_remise_price = 0;
        try {
            OPreenregistrementDetail = OPreenregistrement.FindTPreenregistrementDetail(lg_PREENREGISTREMENT_DETAIL_ID);
            OTPreenregistrement = OPreenregistrementDetail.getLgPREENREGISTREMENTID();
            if (OPreenregistrement.DeletePreenregistrementDetail(lg_PREENREGISTREMENT_DETAIL_ID) != null) {

                int_total_vente_brut = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                        OTPreenregistrement.getStrSTATUT());
                int_remise_price = (int_total_vente_brut * lg_REMISE_ID) / 100;

                OTPreenregistrement.setIntPRICE(int_total_vente_brut);
                OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
                OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
                this.persiste(OTPreenregistrement);
            } else {
                this.buildErrorTraceMessage("Echec de suppression du produit");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTPreenregistrement;
    }
    // fin suppression de produit dans une vente

    // retour de produit
    public TRetourdepot createTRetourdepot(String str_NAME, TEmplacement OTEmplacement, String str_DESCRIPTION,
            String str_PKEY) {
        TRetourdepot OTRetourdepot = null;
        try {
            OTRetourdepot = new TRetourdepot();
            if (str_NAME.equalsIgnoreCase("")) {
                OTRetourdepot.setStrNAME(this.getKey().getShortId(8));
            } else {
                OTRetourdepot.setStrNAME(str_NAME);
            }
            OTRetourdepot.setLgRETOURDEPOTID(this.getKey().getComplexId());
            OTRetourdepot.setStrDESCRIPTION(str_DESCRIPTION);
            OTRetourdepot.setLgUSERID(this.getOTUser());
            OTRetourdepot.setLgEMPLACEMENTID(OTEmplacement);
            OTRetourdepot.setPkey(!"".equals(str_PKEY) ? str_PKEY : OTEmplacement.getLgEMPLACEMENTID());
            OTRetourdepot.setBoolPending(OTEmplacement.getBoolSAMELOCATION());
            OTRetourdepot.setStrSTATUT(commonparameter.statut_is_Process);
            OTRetourdepot.setDtCREATED(new Date());
            OTRetourdepot.setDtUPDATED(new Date());
            OTRetourdepot.setBoolFLAG(false);
            if (this.persiste(OTRetourdepot)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création du retour des produits");
            }

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du retour des produits");
        }
        return OTRetourdepot;
    }

    public TRetourdepotdetail createTRetourdepotdetail(TRetourdepot OTRetourdepot, String lg_FAMILLE_ID,
            int int_NUMBER_RETURN, int int_PRICE_DETAIL, int int_PRICE) {
        TRetourdepotdetail oTRetourdepotdetail = null;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TFamilleStock OTFamilleStock = null;
        try {
            if (OTRetourdepot == null) {
                this.buildErrorTraceMessage("Echec d'ajout du produit. Retour inexistant");
                return null;
            }
            OTFamilleStock = OtellerManagement.getTProductItemStock(lg_FAMILLE_ID,
                    OTRetourdepot.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec d'ajout du produit. Stock du produit inexistant");
                return null;
            }
            oTRetourdepotdetail = this.getTRetourdepotdetail(OTRetourdepot.getLgRETOURDEPOTID(),
                    OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
            if (oTRetourdepotdetail == null) {
                oTRetourdepotdetail = new TRetourdepotdetail();
                oTRetourdepotdetail.setLgRETOURDEPOTDETAILID(this.getKey().getComplexId());
                oTRetourdepotdetail.setIntNUMBERRETURN(0);
                oTRetourdepotdetail.setIntPRICEDETAIL(int_PRICE_DETAIL);
                oTRetourdepotdetail.setIntPRICE(int_PRICE);
            }
            oTRetourdepotdetail.setIntNUMBERRETURN(oTRetourdepotdetail.getIntNUMBERRETURN() + int_NUMBER_RETURN);

            if (OTFamilleStock.getIntNUMBERAVAILABLE() < oTRetourdepotdetail.getIntNUMBERRETURN()) {
                this.buildErrorTraceMessage(
                        "Echec d'ajout du produit. Le stock produit est inférieur à la quantité retourner");
                return null;
            }
            oTRetourdepotdetail.setLgFAMILLEID(OTFamilleStock.getLgFAMILLEID());
            oTRetourdepotdetail.setDtCREATED(new Date());
            oTRetourdepotdetail.setDtUPDATED(new Date());
            oTRetourdepotdetail.setLgRETOURDEPOTID(OTRetourdepot);
            oTRetourdepotdetail.setStrSTATUT(commonparameter.statut_is_Process);
            oTRetourdepotdetail.setIntSTOCK(OTFamilleStock.getIntNUMBERAVAILABLE());
            if (this.persiste(oTRetourdepotdetail)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec d'ajout du produit");
            }

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout de l'article dans le retour");
        }
        return oTRetourdepotdetail;
    }

    public TRetourdepotdetail createTRetourdepotdetail(TRetourdepot OTRetourdepot, String lg_FAMILLE_ID,
            int int_NUMBER_RETURN) {
        TRetourdepotdetail oTRetourdepotdetail = null;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TFamilleStock OTFamilleStock;
        EntityManager em = this.getOdataManager().getEm();
        try {
            if (OTRetourdepot == null) {
                this.buildErrorTraceMessage("Echec d'ajout du produit. Retour inexistant");
                return null;
            }
            OTFamilleStock = OtellerManagement.getTProductItemStock(lg_FAMILLE_ID,
                    OTRetourdepot.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec d'ajout du produit. Stock du produit inexistant");
                return null;
            }
            oTRetourdepotdetail = this.getTRetourdepotdetail(OTRetourdepot.getLgRETOURDEPOTID(), lg_FAMILLE_ID);
            if (oTRetourdepotdetail != null) {
                oTRetourdepotdetail.setIntNUMBERRETURN(oTRetourdepotdetail.getIntNUMBERRETURN() + int_NUMBER_RETURN);
            } else {
                oTRetourdepotdetail = new TRetourdepotdetail();
                oTRetourdepotdetail.setLgRETOURDEPOTDETAILID(this.getKey().getComplexId());
                oTRetourdepotdetail.setIntNUMBERRETURN(int_NUMBER_RETURN);
            }

            if (OTFamilleStock.getIntNUMBERAVAILABLE() < oTRetourdepotdetail.getIntNUMBERRETURN()) {
                this.buildErrorTraceMessage(
                        "Echec d'ajout du produit. Le stock produit est inférieur à la quantité retourner");
                return null;
            }
            oTRetourdepotdetail.setLgFAMILLEID(OTFamilleStock.getLgFAMILLEID());
            oTRetourdepotdetail.setDtCREATED(new Date());
            oTRetourdepotdetail.setDtUPDATED(new Date());
            oTRetourdepotdetail.setLgRETOURDEPOTID(OTRetourdepot);
            oTRetourdepotdetail.setStrSTATUT(commonparameter.statut_is_Process);
            oTRetourdepotdetail.setIntSTOCK(OTFamilleStock.getIntNUMBERAVAILABLE());

            if (!em.getTransaction().isActive()) {
                em.getTransaction().begin();
            }
            em.merge(oTRetourdepotdetail);
            // updatestock(OTFamilleStock, int_NUMBER_RETURN, em);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            if (em.getTransaction().isActive()) {
                em.getTransaction().commit();
            }

        } catch (Exception E) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }

            this.buildErrorTraceMessage("Echec d'ajout de l'article dans le retour");
            E.printStackTrace();

        }
        return oTRetourdepotdetail;
    }

    private void updatestock__(TFamilleStock OTFamilleStock, int stock, EntityManager entityManager) {
        OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - stock);
        OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
        entityManager.merge(OTFamilleStock);

    }

    public TRetourdepotdetail getTRetourdepotdetail(String lg_RETOURDEPOT_ID, String lg_FAMILLE_ID) {
        TRetourdepotdetail OTRetourdepotdetail = null;
        try {
            OTRetourdepotdetail = (TRetourdepotdetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourdepotdetail t WHERE t.lgRETOURDEPOTID.lgRETOURDEPOTID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2")
                    .setParameter(1, lg_RETOURDEPOT_ID).setParameter(2, lg_FAMILLE_ID).getSingleResult();
        } catch (Exception e) {

        }
        return OTRetourdepotdetail;
    }

    public TRetourdepot updateTRetourdepot(String lg_RETOURDEPOT_ID, String str_DESCRIPTION) {
        try {
            TRetourdepot OTRetourdepot = this.getOdataManager().getEm().find(TRetourdepot.class, lg_RETOURDEPOT_ID);
            OTRetourdepot.setStrDESCRIPTION(str_DESCRIPTION);
            OTRetourdepot.setDtUPDATED(new Date());
            OTRetourdepot.setLgUSERID(this.getOTUser());
            this.persiste(OTRetourdepot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTRetourdepot;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour");
            return null;
        }
    }

    public TRetourdepotdetail UpdateTRetourdepotdetail(String lg_RETOURDEPOTDETAIL_ID, String lg_RETOURDEPOT_ID,
            String lg_FAMILLE_ID, int int_NUMBER_RETURN) {

        TRetourdepotdetail OTRetourdepotdetail = null;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TFamilleStock OTFamilleStock = null;

        try {

            OTRetourdepotdetail = this.getOdataManager().getEm().find(TRetourdepotdetail.class,
                    lg_RETOURDEPOTDETAIL_ID);
            OTFamilleStock = OtellerManagement.getTProductItemStock(lg_FAMILLE_ID,
                    OTRetourdepotdetail.getLgRETOURDEPOTID().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            OTRetourdepotdetail.setIntNUMBERRETURN(int_NUMBER_RETURN);

            if (OTFamilleStock == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Produit inexistant");
                return null;
            }

            if (OTFamilleStock.getIntNUMBERAVAILABLE() < OTRetourdepotdetail.getIntNUMBERRETURN()) {
                this.buildErrorTraceMessage("Echec de mise à jour du produit. Stock du produit inexistant");
                return null;
            }

            OTRetourdepotdetail.setDtUPDATED(new Date());
            if (this.persiste(OTRetourdepotdetail)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour du produit");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour du produit");
        }
        return OTRetourdepotdetail;
    }

    public TRetourdepot deleteTRetourdepotdetail(String lg_RETOURDEPOTDETAIL_ID) {

        TRetourdepotdetail OTRetourdepotdetail;
        TRetourdepot OTRetourdepot = null;
        try {
            OTRetourdepotdetail = this.getOdataManager().getEm().find(TRetourdepotdetail.class,
                    lg_RETOURDEPOTDETAIL_ID);
            OTRetourdepot = OTRetourdepotdetail.getLgRETOURDEPOTID();
            if (this.delete(OTRetourdepotdetail)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTRetourdepot;
    }

    public List<TRetourdepotdetail> getTRetourdepotdetail(String search_value, String lg_RETOURDEPOT_ID,
            String str_STATUT) {
        List<TRetourdepotdetail> lstTRetourdepotdetail = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTRetourdepotdetail = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TRetourdepotdetail t WHERE  t.lgRETOURDEPOTID.lgRETOURDEPOTID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) ORDER BY t.dtUPDATED DESC")
                    .setParameter(2, lg_RETOURDEPOT_ID).setParameter(4, search_value + "%").getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }

        new logger().OCategory.info("lstTRetourdepotdetail taille " + lstTRetourdepotdetail.size());
        return lstTRetourdepotdetail;
    }

    public boolean deleteTRetourdepot(String lg_RETOURDEPOT_ID) {
        boolean result = false;
        List<TRetourdepotdetail> lstTRetourdepotdetail = new ArrayList<TRetourdepotdetail>();
        TRetourdepot OTRetourdepot = null;
        try {
            OTRetourdepot = this.getOdataManager().getEm().find(TRetourdepot.class, lg_RETOURDEPOT_ID);
            if (OTRetourdepot == null) {
                this.buildErrorTraceMessage("Echec de suppression du retour. Référence inexistante");
                return result;
            }
            lstTRetourdepotdetail = this.getTRetourdepotdetail("", OTRetourdepot.getLgRETOURDEPOTID(),
                    OTRetourdepot.getStrSTATUT());
            for (TRetourdepotdetail OTRetourdepotdetail : lstTRetourdepotdetail) {
                this.getOdataManager().getEm().remove(OTRetourdepotdetail);
            }
            if (this.delete(OTRetourdepot)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de suppression du retour.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression du retour.");
        }
        return result;
    }
    // fin retour de produit

    // cloture du retour depot
    public boolean clotureRetourDepot(String lg_RETOURDEPOT_ID, String str_DESCRIPTION, boolean isOfficine) {
        boolean result = false;
        List<TRetourdepotdetail> lstTRetourdepotdetail = new ArrayList<TRetourdepotdetail>();
        TRetourdepot OTRetourdepot = null;

        Double dbl_AMOUNT = 0.0;

        try {

            OTRetourdepot = this.getOdataManager().getEm().find(TRetourdepot.class, lg_RETOURDEPOT_ID);
            if (OTRetourdepot == null) {
                this.buildErrorTraceMessage("Echec de clôture du retour dépôt. Référence inexistante");
                return result;
            }

            lstTRetourdepotdetail = getRetourdepotdetailsByRetourdepot(OTRetourdepot.getLgRETOURDEPOTID());
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            for (TRetourdepotdetail OTRetourdepotdetail : lstTRetourdepotdetail) {
                OTRetourdepotdetail.setStrSTATUT(commonparameter.statut_is_Closed);
                OTRetourdepotdetail.setDtUPDATED(new Date());
                OTRetourdepotdetail.setIntPRICE(
                        OTRetourdepotdetail.getLgFAMILLEID().getIntPRICE() * OTRetourdepotdetail.getIntNUMBERRETURN());
                OTRetourdepotdetail.setIntPRICEDETAIL(OTRetourdepotdetail.getLgFAMILLEID().getIntPRICE());
                DoincrementStockProduit(OTRetourdepotdetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OTRetourdepotdetail.getIntNUMBERRETURN());
                dbl_AMOUNT += OTRetourdepotdetail.getIntPRICE();
                // fin code ajouté 17/11/2016
                createSnapshotMouvement(OTRetourdepotdetail.getLgFAMILLEID(), OTRetourdepotdetail.getIntNUMBERRETURN(),
                        true, OTRetourdepot.getLgEMPLACEMENTID());
            }
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();

            }
            OTRetourdepot.setStrSTATUT(commonparameter.statut_is_Closed);
            OTRetourdepot.setStrDESCRIPTION(str_DESCRIPTION);
            OTRetourdepot.setDtUPDATED(new Date());
            OTRetourdepot.setDblAMOUNT(dbl_AMOUNT);
            if (this.persiste(OTRetourdepot)) {

                // mise a jour de l'encours du dépot et la dimunition du compte de l'officine
                this.creditCompteDepot(OTRetourdepot.getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), dbl_AMOUNT.intValue());
                this.creditCompteDepot(this.getOdataManager().getEm().find(TCompteClient.class, "3"),
                        (-1) * dbl_AMOUNT.intValue());
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de clôture du retour dépôt");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture du retour dépôt");
        }
        return result;
    }
    // fin cloture du retour depot

    public boolean doDestockProduit(TFamilleStock OTFamilleStock, String lg_TYPE_STOCK_ID, int int_QUANTITY) {
        boolean result = false;
        try {
            TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(),
                            OTFamilleStock.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - int_QUANTITY);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() - int_QUANTITY);
            new logger().OCategory.info("Nouvelle quantité " + OTFamilleStock.getIntNUMBERAVAILABLE());
            OTFamilleStock.setDtUPDATED(new Date());
            // this.persiste(OTFamilleStock);
            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() - int_QUANTITY);
            OTTypeStockFamille.setDtUPDATED(new Date());
            if (this.persiste(OTTypeStockFamille) && new SnapshotManager(this.getOdataManager(), this.getOTUser())
                    .SaveMouvementFamille(OTFamilleStock.getLgFAMILLEID(), "1", commonparameter.REMOVE,
                            commonparameter.str_ACTION_RETOURFOURNISSEUR, int_QUANTITY,
                            OTFamilleStock.getLgEMPLACEMENTID()) != null) {
                this.buildSuccesTraceMessage("Opération effectuée avec succès");
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de l'opération");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    // liste des retours dépôts
    public List<TRetourdepot> getAllTRetourdepot(String search_value, String lg_RETOURDEPOT_ID, Date dtDEBUT,
            Date dtFIN, String lg_EMPLACEMENT_ID) {
        List<TRetourdepot> lstTRetourdepot = new ArrayList<TRetourdepot>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            String criteria = "AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8  ";

            if ("1".equals(lg_EMPLACEMENT_ID)) {
                criteria = "AND  (( t.boolPending=TRUE  )OR (t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?8))";
            }

            String sql = "SELECT t FROM TRetourdepot t, TRetourdepotdetail r WHERE t.lgRETOURDEPOTID = r.lgRETOURDEPOTID.lgRETOURDEPOTID AND (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?4) AND t.lgRETOURDEPOTID LIKE ?2 AND (r.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR r.lgFAMILLEID.intCIP LIKE ?3 OR r.lgFAMILLEID.intEAN13 LIKE ?3) AND (t.dtUPDATED >= ?6 AND t.dtUPDATED <= ?7) "
                    + criteria + " GROUP BY t.lgRETOURDEPOTID ORDER BY t.dtUPDATED";

            lstTRetourdepot = this.getOdataManager().getEm().createQuery(sql)
                    .setParameter(1, commonparameter.statut_is_Closed)
                    .setParameter(4, commonparameter.statut_is_Process).setParameter(2, lg_RETOURDEPOT_ID)
                    .setParameter(3, search_value + "%").setParameter(8, lg_EMPLACEMENT_ID).setParameter(6, dtDEBUT)
                    .setParameter(7, dtFIN).getResultList();

        } catch (Exception E) {
            E.printStackTrace();
        }
        new logger().OCategory.info("lstTRetourdepot taille " + lstTRetourdepot.size());
        return lstTRetourdepot;

    }
    // fin liste des retours dépôts

    // liste des produits a exporter d'un depot pour un achat dans l'officine
    public List<String> generateDataToExportRetourDepot(String liste_param) {

        List<TRetourdepotdetail> listeTRetourdepotdetail = new ArrayList<TRetourdepotdetail>();

        String row = "";
        List<String> lst = new ArrayList<String>();
        String search_value = "";
        TRetourdepot OTRetourdepot = null;
        try {

            // code ajouté
            String[] tabString = liste_param.split(";"); // on case la ligne courante pour recuperer les differentes
                                                         // colonnes
            String[] search_value_Tab = tabString[0].split(":");

            search_value = (search_value_Tab.length > 1 ? search_value_Tab[1] : "");
            OTRetourdepot = this.getOdataManager().getEm().find(TRetourdepot.class, search_value);
            if (OTRetourdepot != null) {
                listeTRetourdepotdetail = this.getTRetourdepotdetail("", OTRetourdepot.getLgRETOURDEPOTID(),
                        OTRetourdepot.getStrSTATUT());
                row += OTRetourdepot.getLgRETOURDEPOTID() + ";" + OTRetourdepot.getStrNAME() + ";"
                        + OTRetourdepot.getStrDESCRIPTION() + ";" + 0 + ";" + 0 + ";" + OTRetourdepot.getDblAMOUNT()
                        + ";";
                row = row.substring(0, row.length() - 1);
                new logger().OCategory.info(row);
                lst.add(row);
                row = "";
            }

            for (TRetourdepotdetail OTRetourdepotdetail : listeTRetourdepotdetail) {
                // "IDENTIFIANT;CIP;DESIGNATION;QUANTITE;PRIXVENTE;MONTANT

                row += OTRetourdepotdetail.getLgFAMILLEID().getLgFAMILLEID() + ";"
                        + OTRetourdepotdetail.getLgFAMILLEID().getLgFAMILLEID() + ";"
                        + OTRetourdepotdetail.getLgFAMILLEID().getStrDESCRIPTION() + ";"
                        + OTRetourdepotdetail.getIntNUMBERRETURN() + ";" + OTRetourdepotdetail.getIntPRICEDETAIL() + ";"
                        + OTRetourdepotdetail.getIntPRICE() + ";";

                row = row.substring(0, row.length() - 1);
                new logger().OCategory.info(row);
                lst.add(row);
                row = "";
            }
            if (lst.size() > 0) {
                OTRetourdepot.setBoolFLAG(true);
                // OTRetourdepot.setDtUPDATED(new Date());
                if (!this.persiste(OTRetourdepot)) {
                    lst.clear();
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("Taille de la nouvelle liste " + lst.size());
        return lst;
    }

    public String generateEnteteForFileRetourDepot() {
        return "IDENTIFIANT;CIP;DESIGNATION;QUANTITE;PRIX VENTE;MONTANT";
    }
    // fin liste des produits a exporter d'un depot pour un achat dans l'officine

    // creation d'un retour pour un depot par importation
    public boolean CreateRetourDepotInOfficineByImport(List<String> lstData, String lg_EMPLACEMENT_ID) {
        TRetourdepot OTRetourdepot = null;
        TEmplacement OTEmplacement = null;
        boolean result = false;
        int count = 0;
        TFamille OTFamille = null;

        try {
            if (lstData.size() <= 0) {
                this.buildErrorTraceMessage("Echec de l'opération. Aucune ligne de produit trouvé");
                return result;
            }
            OTEmplacement = this.getOdataManager().getEm().find(TEmplacement.class, lg_EMPLACEMENT_ID);
            if (OTEmplacement == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Dépôt inexistant");
                return result;
            }
            String[] retourString = lstData.get(0).split(";");
            new logger().OCategory.info("valeur " + lstData.get(0));
            OTRetourdepot = this.createTRetourdepot(retourString[1].trim(), this.getOTUser().getLgEMPLACEMENTID(),
                    retourString[2].trim(), OTEmplacement.getLgEMPLACEMENTID());
            if (OTRetourdepot != null) {
                for (int i = 1; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                    new logger().OCategory.info("i " + i + " valeur " + lstData.get(i)); // ligne courant
                    String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                                                                    // differentes colonnes
                    OTFamille = OfamilleManagement.getTFamille(tabString[0].trim());
                    if (OTFamille != null && this.createTRetourdepotdetail(OTRetourdepot, OTFamille.getLgFAMILLEID(),
                            Integer.parseInt(tabString[3].trim()), Integer.parseInt(tabString[4].trim()),
                            Integer.parseInt(tabString[5].trim())) != null) {
                        count++;
                    } else {
                        new logger().OCategory.info("Ligne " + i + " non insérée");
                    }
                }
                this.clotureRetourDepot(OTRetourdepot.getLgRETOURDEPOTID(), OTRetourdepot.getStrDESCRIPTION(), true);
                if (count == (lstData.size() - 1)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildSuccesTraceMessage(count + "/" + (lstData.size() - 1) + " produit(s) pris en compte");
                    result = true;
                }

            } else {
                this.buildErrorTraceMessage("Echec de transformation des produits vendus du depot en vente");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la vente");
        }
        return result;
    }
    // fin creation d'une prevente pour un depot par importation

    public boolean doIncrementStockProduit(String lg_FAMILLE_ID, String lg_TYPE_STOCK_ID, int int_QUANTITY,
            String id_DEPOT) {
        boolean result = false;
        // SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TFamilleStock OTFamilleStock = null;
        try {
            TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, lg_FAMILLE_ID,
                            this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            OTFamilleStock = OtellerManagement.getTProductItemStock(lg_FAMILLE_ID);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_QUANTITY);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_QUANTITY);
            new logger().OCategory.info("Nouvelle quantité " + OTFamilleStock.getIntNUMBERAVAILABLE());
            OTFamilleStock.setDtUPDATED(new Date());
            // this.persiste(OTFamilleStock);
            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_QUANTITY);
            /*
             * OTTypeStockFamille.setDtUPDATED(new Date()); if (this.persiste(OTTypeStockFamille) &&
             * OSnapshotManager.SaveMouvementFamille(OTFamilleStock.getLgFAMILLEID(), id_DEPOT, commonparameter.ADD,
             * commonparameter.str_ACTION_ENTREESTOCK, int_QUANTITY, this.getOTUser().getLgEMPLACEMENTID()) != null &&
             * OSnapshotManager.BuildTSnapShopDalySortieFamille(OTFamilleStock.getLgFAMILLEID(), int_QUANTITY,
             * int_QUANTITY, 0) != null) { this.buildSuccesTraceMessage("Opération effectuée avec succès"); result =
             * true; } else { this.buildErrorTraceMessage("Echec de l'opération"); }
             */
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public void creditCompteDepot(TCompteClient OTCompteClient, int int_AMOUNT) {
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            this.refresh(OTCompteClient);
            new clientManager(this.getOdataManager(), this.getOTUser()).debiterCompteClient(Ojconnexion, OTCompteClient,
                    int_AMOUNT);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // mise a jour de la remise de la vente a un depot
    public TPreenregistrement updatRemiseForVenteDepot(String lg_PREENREGISTREMENT_ID, int lg_REMISE_ID) {
        TPreenregistrement OTPreenregistrement = null;
        int int_total_vente_brut = 0, int_remise_price = 0;
        try {

            OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                    lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Echec de mise à jour de la remise. Référence de vente inconnu");
                return null;
            }
            int_remise_price = (OTPreenregistrement.getIntPRICE() * lg_REMISE_ID) / 100;
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            if (this.persiste(OTPreenregistrement)) {
                this.buildSuccesTraceMessage("Mise à jour effectuée avec succès");
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de la remise.");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de la remise.");
        }
        return OTPreenregistrement;
    }

    // fin mise a jour de la remise de la vente a un depot
    // recuperation du montant total d'un retour dépot
    public Double getTotalAmountRetour(String lg_RETOURDEPOT_ID, String str_STATUT) {
        Double result = 0.0;
        List<TRetourdepotdetail> lstTRetourdepotdetail = new ArrayList<TRetourdepotdetail>();
        try {
            lstTRetourdepotdetail = this.getTRetourdepotdetail("", lg_RETOURDEPOT_ID, str_STATUT);
            result = this.getTotalAmountRetour(lstTRetourdepotdetail);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public Double getTotalAmountRetour(List<TRetourdepotdetail> lstTRetourdepotdetail) {
        Double result = 0.0;
        try {
            for (TRetourdepotdetail OTRetourdepotdetail : lstTRetourdepotdetail) {
                result += OTRetourdepotdetail.getLgFAMILLEID().getIntPRICE() * OTRetourdepotdetail.getIntNUMBERRETURN();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin recuperation du montant total d'un retour dépot

    // recuperation de la quantite d'un retour dépot
    public int getTotalQuantityRetour(String lg_RETOURDEPOT_ID, String str_STATUT) {
        int result = 0;
        List<TRetourdepotdetail> lstTRetourdepotdetail = new ArrayList<TRetourdepotdetail>();
        try {
            lstTRetourdepotdetail = this.getTRetourdepotdetail("", lg_RETOURDEPOT_ID, str_STATUT);
            result = this.getTotalQuantityRetour(lstTRetourdepotdetail);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public int getTotalQuantityRetour(List<TRetourdepotdetail> lstTRetourdepotdetail) {
        int result = 0;
        try {
            for (TRetourdepotdetail OTRetourdepotdetail : lstTRetourdepotdetail) {
                result += OTRetourdepotdetail.getIntNUMBERRETURN();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin recuperation de la quantite d'un retour dépot

    // mise a jour du stock du dépôt d'une vente à l'officine
    public boolean updateStockdepotFromOfficineByImport(List<String> lstData, TEmplacement OTEmplacement) {

        boolean result = false;
        int count = 0;
        TFamille OTFamille = null;
        try {
            if (lstData.size() <= 0) {
                this.buildErrorTraceMessage("Echec de l'opération. Aucune ligne de produit trouvé");
                return result;
            }
            if (OTEmplacement == null) {
                this.buildErrorTraceMessage("Echec de l'opération. Dépôt inexistant");
                return result;
            }
            String[] retourString = lstData.get(0).split(";");
            new logger().OCategory.info("valeur " + lstData.get(0));
            for (int i = 1; i < lstData.size(); i++) { // lstData: liste des lignes du fichier xls ou csv
                new logger().OCategory.info("i " + i + " valeur " + lstData.get(i)); // ligne courant
                String[] tabString = lstData.get(i).split(";"); // on case la ligne courante pour recuperer les
                                                                // differentes colonnes
                OTFamille = OfamilleManagement.getTFamille(tabString[0].trim());
                // "IDENTIFIANT;CIP;DESIGNATION;QUANTITE;PRIX VENTE;MONTANT";
                OTFamille.setIntPRICE(Integer.parseInt(tabString[4].trim()));
                OTFamille.setIntCIP(tabString[1].trim());
                OTFamille.setStrDESCRIPTION(tabString[2].trim());
                OTFamille.setStrNAME(OTFamille.getStrDESCRIPTION());
                this.getOdataManager().getEm().persist(OTFamille);
                new WarehouseManager(this.getOdataManager(), this.getOTUser()).updateReelStockForDepot(OTFamille,
                        Integer.parseInt(tabString[3].trim()), "ins", OTEmplacement);
                if (new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementFamille(OTFamille, "",
                        commonparameter.ADD, commonparameter.str_ACTION_ENTREESTOCK,
                        Integer.parseInt(tabString[3].trim()), this.getOTUser(), OTEmplacement) != null) {
                    i++;
                }
            }
            if (count == lstData.size()) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildSuccesTraceMessage(count + "/" + lstData.size() + " produit(s) pris en compte");
                result = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la vente");
        }
        return result;
    }
    // fin creation d'une prevente pour un depot par importation

    /* 07 02 2017 nvelle fonction de cloture retour depot strat */
    public boolean closeRetourDepot(String lg_RETOURDEPOT_ID, String str_DESCRIPTION) {
        boolean result = false;
        List<TRetourdepotdetail> lstTRetourdepotdetail;
        TRetourdepot OTRetourdepot;
        String lg_TYPE_STOCK_ID = Parameter.STOCK_DEPOT;
        TFamilleStock OTFamilleStock;
        Double dbl_AMOUNT = 0.0;

        try {
            OTRetourdepot = this.getOdataManager().getEm().find(TRetourdepot.class, lg_RETOURDEPOT_ID);
            if (OTRetourdepot == null) {
                this.buildErrorTraceMessage("Echec de clôture du retour dépôt. Référence inexistante");
                return result;
            }

            lstTRetourdepotdetail = getRetourdepotdetailsByRetourdepot(lg_RETOURDEPOT_ID);
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            MvtProduitObselete mvtProduit = new MvtProduitObselete();
            for (TRetourdepotdetail OTRetourdepotdetail : lstTRetourdepotdetail) {
                OTRetourdepotdetail.setStrSTATUT(commonparameter.statut_is_Closed);
                OTRetourdepotdetail.setDtUPDATED(new Date());
                OTRetourdepotdetail.setIntPRICE(
                        OTRetourdepotdetail.getLgFAMILLEID().getIntPRICE() * OTRetourdepotdetail.getIntNUMBERRETURN());
                OTRetourdepotdetail.setIntPRICEDETAIL(OTRetourdepotdetail.getLgFAMILLEID().getIntPRICE());

                OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser()).getTProductItemStock(
                        OTRetourdepotdetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OTRetourdepot.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                mvtProduit.saveMvtProduit(OTRetourdepotdetail.getIntPRICEDETAIL(),
                        OTRetourdepotdetail.getLgRETOURDEPOTDETAILID(), DateConverter.TMVTP_RETOUR_DEPOT,
                        OTRetourdepotdetail.getLgFAMILLEID(), this.getOTUser(), OTRetourdepot.getLgEMPLACEMENTID(),
                        OTRetourdepotdetail.getIntNUMBERRETURN(), OTFamilleStock.getIntNUMBERAVAILABLE(),
                        OTFamilleStock.getIntNUMBERAVAILABLE() + OTRetourdepotdetail.getIntNUMBERRETURN(), 0,
                        this.getOdataManager().getEm());

                if (!OTRetourdepot.getLgEMPLACEMENTID().getBoolSAMELOCATION()) {

                    if (doDestock(OTFamilleStock, lg_TYPE_STOCK_ID, OTRetourdepotdetail.getIntNUMBERRETURN(), false)) {// a
                                                                                                                       // decommenter
                                                                                                                       // en
                                                                                                                       // cas
                                                                                                                       // de
                                                                                                                       // probleme
                                                                                                                       // 17/11/2016
                        dbl_AMOUNT += OTRetourdepotdetail.getIntPRICE();

                    }
                }
            }
            //
            OTRetourdepot.setStrDESCRIPTION(str_DESCRIPTION);
            OTRetourdepot.setDtUPDATED(new Date());
            OTRetourdepot.setDblAMOUNT(dbl_AMOUNT);
            OTRetourdepot.setBoolPending(OTRetourdepot.getLgEMPLACEMENTID().getBoolSAMELOCATION());
            if (!OTRetourdepot.getLgEMPLACEMENTID().getBoolSAMELOCATION()) {
                OTRetourdepot.setStrSTATUT(commonparameter.statut_is_Closed);
            }
            this.getOdataManager().getEm().merge(OTRetourdepot);
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture du retour dépôt");
        }
        return result;
    }

    public boolean doDestock(TFamilleStock OTFamilleStock, String lg_TYPE_STOCK_ID, int int_QUANTITY,
            boolean AddOrRemove) {
        boolean result = false;
        try {
            TEmplacement lg_EMPLACEMENT_ID = OTFamilleStock.getLgEMPLACEMENTID();
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() - int_QUANTITY);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
            OTFamilleStock.setDtUPDATED(new Date());
            if (AddOrRemove) {
                createSnapshotMouvement(OTFamilleStock.getLgFAMILLEID(), int_QUANTITY, true,
                        this.getOTUser().getLgEMPLACEMENTID());
                createSnapshotMouvement(OTFamilleStock.getLgFAMILLEID(), int_QUANTITY, false, lg_EMPLACEMENT_ID);
            } else {
                createSnapshotMouvement(OTFamilleStock.getLgFAMILLEID(), int_QUANTITY, false, lg_EMPLACEMENT_ID);

            }
            result = true;
        } catch (Exception e) {

            e.printStackTrace();
        }
        return result;
    }

    public TMouvementSnapshot createSnapshotMouvement(TFamille OTFamille, int int_NUMBER, boolean AddOrRemove,
            TEmplacement LG_EMPLACEMENT_ID) { // a decommenter en cas de probleme

        TMouvementSnapshot OTMouvementSnapshot = null;

        try {

            OTMouvementSnapshot = getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(),
                    LG_EMPLACEMENT_ID.getLgEMPLACEMENTID());
            if (OTMouvementSnapshot == null) {
                OTMouvementSnapshot = this.createSnapshotMouvementArticleBis(OTFamille, int_NUMBER, LG_EMPLACEMENT_ID);

            } else {
                if (AddOrRemove) {
                    OTMouvementSnapshot.setIntSTOCKJOUR(OTMouvementSnapshot.getIntSTOCKJOUR() + int_NUMBER);
                } else {
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

    public TMouvementSnapshot createSnapshotMouvementArticleBis(TFamille OTFamille, int int_NUMBER,
            TEmplacement lg_EMPLACEMENT_ID) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        TTypeStockFamille OTTypeStockFamille = null;
        System.out.println("***************************************************  " + int_NUMBER + " lg_EMPLACEMENT_ID "
                + lg_EMPLACEMENT_ID);

        try {
            String lg_TYPE_STOCK_ID = ("1".equals(lg_EMPLACEMENT_ID.getLgEMPLACEMENTID()) ? "1" : "3");
            System.out.println(
                    "***************************************************  lg_TYPE_STOCK_ID " + lg_TYPE_STOCK_ID);

            OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID, OTFamille.getLgFAMILLEID(),
                            lg_EMPLACEMENT_ID.getLgEMPLACEMENTID());
            System.out.println(
                    "***************************************************  OTTypeStockFamille " + OTTypeStockFamille);

        } catch (Exception e) {
            e.printStackTrace();
        }
        Date d = new Date();
        try {
            OTMouvementSnapshot = new TMouvementSnapshot();
            OTMouvementSnapshot.setLgMOUVEMENTSNAPSHOTID(this.getKey().getComplexId());
            OTMouvementSnapshot.setLgFAMILLEID(OTFamille);
            OTMouvementSnapshot.setDtDAY(d);
            OTMouvementSnapshot.setDtCREATED(d);

            OTMouvementSnapshot.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(0);

            OTMouvementSnapshot.setIntSTOCKJOUR(OTTypeStockFamille.getIntNUMBER());
            OTMouvementSnapshot.setIntSTOCKDEBUT(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            OTMouvementSnapshot.setLgEMPLACEMENTID(lg_EMPLACEMENT_ID);

            this.getOdataManager().getEm().persist(OTMouvementSnapshot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    public boolean closeRetourDepotInOfficine(String lg_RETOURDEPOT_ID) {
        boolean result = false;
        List<TRetourdepotdetail> lstTRetourdepotdetail = new ArrayList<TRetourdepotdetail>();
        TRetourdepot OTRetourdepot = null;
        String lg_TYPE_STOCK_ID = Parameter.STOCK_DEPOT;
        TFamilleStock OTFamilleStock = null;
        Double dbl_AMOUNT = 0.0;

        try {
            OTRetourdepot = this.getOdataManager().getEm().find(TRetourdepot.class, lg_RETOURDEPOT_ID);
            if (OTRetourdepot == null) {
                this.buildErrorTraceMessage("Echec de clôture du retour dépôt. Référence inexistante");
                return result;
            }

            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            TRetourdepot ORetourdepotOfficine = createRetourdepot(OTRetourdepot.getStrNAME(),
                    this.getOTUser().getLgEMPLACEMENTID(), OTRetourdepot.getStrDESCRIPTION(),
                    OTRetourdepot.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            lstTRetourdepotdetail = createTretourDetails(OTRetourdepot, ORetourdepotOfficine);

            for (TRetourdepotdetail OTRetourdepotdetail : lstTRetourdepotdetail) {

                OTFamilleStock = new tellerManagement(this.getOdataManager(), this.getOTUser()).getTProductItemStock(
                        OTRetourdepotdetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OTRetourdepot.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

                if (doDestock(OTFamilleStock, lg_TYPE_STOCK_ID, OTRetourdepotdetail.getIntNUMBERRETURN(), true)) {// a
                                                                                                                  // decommenter
                                                                                                                  // en
                                                                                                                  // cas
                                                                                                                  // de
                                                                                                                  // probleme
                                                                                                                  // 17/11/2016
                    dbl_AMOUNT += OTRetourdepotdetail.getIntPRICE();
                    incrementStockProduit(OTFamilleStock.getLgFAMILLEID().getLgFAMILLEID(),
                            OTRetourdepotdetail.getIntNUMBERRETURN());
                }

            }
            OTRetourdepot.setStrSTATUT(commonparameter.statut_is_Closed);

            OTRetourdepot.setDtUPDATED(new Date());
            OTRetourdepot.setDblAMOUNT(dbl_AMOUNT);
            ORetourdepotOfficine.setDblAMOUNT(dbl_AMOUNT);
            OTRetourdepot.setBoolPending(false);
            this.getOdataManager().getEm().merge(OTRetourdepot);
            this.getOdataManager().getEm().merge(ORetourdepotOfficine);

            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
                this.creditCompteDepot(OTRetourdepot.getLgEMPLACEMENTID().getLgCOMPTECLIENTID(), dbl_AMOUNT.intValue());
                this.creditCompteDepot(this.getOdataManager().getEm().find(TCompteClient.class, "3"),
                        (-1) * dbl_AMOUNT.intValue());
                result = true;
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de clôture du retour dépôt");
        }
        return result;
    }

    private List<TRetourdepotdetail> createTretourDetails(TRetourdepot retourdepot, TRetourdepot officine) {
        List<TRetourdepotdetail> list = new ArrayList<>();

        try {
            for (TRetourdepotdetail ODRetourdepot : getRetourdepotdetailsByRetourdepot(
                    retourdepot.getLgRETOURDEPOTID())) {
                TRetourdepotdetail retourdepotdetail = new TRetourdepotdetail(this.getKey().getComplexId());
                retourdepotdetail.setDtCREATED(new Date());
                retourdepotdetail.setIntNUMBERRETURN(ODRetourdepot.getIntNUMBERRETURN());
                retourdepotdetail.setIntPRICE(ODRetourdepot.getIntPRICE());
                retourdepotdetail.setIntPRICEDETAIL(ODRetourdepot.getIntPRICEDETAIL());
                retourdepotdetail.setIntSTOCK(ODRetourdepot.getIntSTOCK());
                retourdepotdetail.setLgRETOURDEPOTID(officine);
                retourdepotdetail.setLgFAMILLEID(ODRetourdepot.getLgFAMILLEID());
                retourdepotdetail.setStrSTATUT(commonparameter.statut_is_Closed);
                retourdepotdetail.setDtUPDATED(new Date());
                this.getOdataManager().getEm().persist(retourdepotdetail);
                list.add(retourdepotdetail);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return list;

    }

    private TMouvementSnapshot getTMouvementSnapshotForCurrentDay(String lg_FAMILLE_ID, String lg_EMPLACEMENT_ID) {
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
                    .setParameter(7, lg_EMPLACEMENT_ID).getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public TMouvementSnapshot getTMouvementSnapshotForCurrentDay(String lg_FAMILLE_ID, TEmplacement OTEmplacement) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementSnapshot t WHERE  FUNCTION('DATE',t.dtCREATED)= CURRENT_DATE  AND (t.strSTATUT = ?5 OR t.strSTATUT = ?8) AND t.lgFAMILLEID.lgFAMILLEID = ?6 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?7")
                    .setParameter(5, commonparameter.statut_enable).setParameter(6, lg_FAMILLE_ID)
                    .setParameter(7, OTEmplacement.getLgEMPLACEMENTID())
                    .setParameter(8, commonparameter.statut_disable);
            qry.setMaxResults(1);

            if (!qry.getResultList().isEmpty()) {
                OTMouvementSnapshot = (TMouvementSnapshot) qry.getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    private void incrementStockProduit(String lg_FAMILLE_ID, int int_QUANTITY) {

        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TFamilleStock OTFamilleStock = null;
        try {
            OTFamilleStock = OtellerManagement.getTProductItemStock(lg_FAMILLE_ID);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_QUANTITY);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBERAVAILABLE());
            OTFamilleStock.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTFamilleStock);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private void DoincrementStockProduit(String lg_FAMILLE_ID, int int_QUANTITY) {

        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TFamilleStock OTFamilleStock = null;
        try {
            TTypeStockFamille OTTypeStockFamille = new StockManager(this.getOdataManager(), this.getOTUser())
                    .getTTypeStockFamilleByTypestock("1", lg_FAMILLE_ID,
                            this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            OTFamilleStock = OtellerManagement.getTProductItemStock(lg_FAMILLE_ID);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_QUANTITY);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_QUANTITY);

            OTFamilleStock.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTFamilleStock);

            OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_QUANTITY);
            this.getOdataManager().getEm().merge(OTTypeStockFamille);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public TRetourdepot createRetourdepot(String str_NAME, TEmplacement OTEmplacement, String str_DESCRIPTION,
            String str_PKEY) {
        TRetourdepot OTRetourdepot = null;
        try {
            OTRetourdepot = new TRetourdepot();
            if (str_NAME.equalsIgnoreCase("")) {
                OTRetourdepot.setStrNAME(this.getKey().getShortId(8));
            }
            OTRetourdepot.setLgRETOURDEPOTID(this.getKey().getComplexId());
            OTRetourdepot.setStrDESCRIPTION(str_DESCRIPTION);
            OTRetourdepot.setLgUSERID(this.getOTUser());
            OTRetourdepot.setLgEMPLACEMENTID(OTEmplacement);
            OTRetourdepot.setPkey(str_PKEY);
            OTRetourdepot.setStrNAME(str_NAME);
            OTRetourdepot.setBoolPending(OTEmplacement.getBoolSAMELOCATION());
            OTRetourdepot.setStrSTATUT(commonparameter.statut_is_Closed);
            OTRetourdepot.setDtCREATED(new Date());
            OTRetourdepot.setDtUPDATED(new Date());
            OTRetourdepot.setBoolFLAG(false);
            this.getOdataManager().getEm().persist(OTRetourdepot);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du retour des produits");
        }
        return OTRetourdepot;
    }

    private List<TRetourdepotdetail> getRetourdepotdetailsByRetourdepot(String lg_retourDepot) {
        return this.getOdataManager().getEm()
                .createQuery("SELECT o FROM TRetourdepotdetail o WHERE o.lgRETOURDEPOTID.lgRETOURDEPOTID=?1 ")
                .setParameter(1, lg_retourDepot).getResultList();
    }

    public TEmplacement getEmplacementBYRef(String ref) {
        return this.getOdataManager().getEm().find(TEmplacement.class, ref);
    }

    /* fin fonction cloture retour depot 07022017 end */
    public TPreenregistrement createPreVente(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_ID,
            String lg_NATURE_VENTE_ID, Date dt_CREATED, String KEY_PARAMETER, String lg_USER_VENDEUR_ID,
            TFamille OTFamille, int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            int lg_REMISE_ID, int int_PRICE_INIT) {
        TPreenregistrement OTPreenregistrement = null;
        TEmplacement OTEmplacement = null;
        TTypeVente OTTypeVente = null;
        TNatureVente OTNatureVente = null;
        TUser OTUserVendeur = null;
        try {
            OTEmplacement = new EmplacementManagement(this.getOdataManager()).getEmplacement(lg_COMPTE_CLIENT_ID);
            OTTypeVente = OPreenregistrement.getTypeVente(OTEmplacement.getLgTYPEDEPOTID().getStrNAME());
            OTNatureVente = this.getOdataManager().getEm().find(TNatureVente.class, lg_NATURE_VENTE_ID);
            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);

            if (OTEmplacement == null || OTTypeVente == null || OTNatureVente == null) {
                this.buildErrorTraceMessage("Echec de création de la pré-vente. Dépôt inconnu");
                return null;
            }
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {

                this.getOdataManager().getEm().getTransaction().begin();
            }

            if ("0".equals(lg_PREENREGISTREMENT_ID)) {
                OTPreenregistrement = new TPreenregistrement();

                OTPreenregistrement.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
                OTPreenregistrement.setLgUSERID(this.getOTUser());
                OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
                OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
                OTPreenregistrement.setLgUSERID(this.getOTUser());
                OTPreenregistrement.setStrREF(this.buildVenteRef(dt_CREATED, KEY_PARAMETER));
                OTPreenregistrement.setIntPRICE(0);
                OTPreenregistrement.setIntACCOUNT(0);
                OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Process);
                OTPreenregistrement.setDtCREATED(dt_CREATED);
                OTPreenregistrement.setDtUPDATED(dt_CREATED);
                OTPreenregistrement.setLgNATUREVENTEID(OTNatureVente);
                OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
                OTPreenregistrement.setIntSENDTOSUGGESTION(0);
                OTPreenregistrement.setBISCANCEL(Boolean.FALSE);
                OTPreenregistrement.setStrFIRSTNAMECUSTOMER(
                        OTEmplacement.getStrFIRSTNAME() + " " + OTEmplacement.getStrLASTNAME());
                OTPreenregistrement.setStrLASTNAMECUSTOMER(OTEmplacement.getStrDESCRIPTION());
                OTPreenregistrement.setStrPHONECUSTOME(OTEmplacement.getStrPHONE());
                this.getOdataManager().getEm().persist(OTPreenregistrement);
                System.out.println("OTPreenregistrement  " + OTPreenregistrement);
                this.addItem(OTEmplacement, OTPreenregistrement, OTFamille, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, int_PRICE_INIT);
            } else {
                OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                        lg_PREENREGISTREMENT_ID);
                this.newItem(OTEmplacement, OTPreenregistrement, OTFamille, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, dt_CREATED, int_PRICE_INIT);
            }
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                System.err.println(
                        "**********************  this.getOdataManager().getEm().getTransaction().isActive()  ");
                this.getOdataManager().getEm().getTransaction().commit();
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            }

            return OTPreenregistrement;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la pré-vente");
            return null;
        }
    }

    public TPreenregistrement addItem(TPreenregistrement OTPreenregistrement, TFamille lg_famille_id, int int_PRICE,
            int int_quantite, int int_quantite_served, String lg_type_vente_id, int lg_REMISE_ID, int int_PRICE_INIT) {
        return this.createItem(OTPreenregistrement, lg_famille_id, int_PRICE, int_quantite, int_quantite_served,
                lg_type_vente_id, lg_REMISE_ID, new Date(), int_PRICE_INIT).getLgPREENREGISTREMENTID();
    }

    public TPreenregistrement addItem(TEmplacement OTEmplacement, TPreenregistrement OTPreenregistrement,
            TFamille lg_famille_id, int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            int lg_REMISE_ID, int int_PRICE_INIT) {
        return this
                .createItem(OTEmplacement, OTPreenregistrement, lg_famille_id, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, new Date(), int_PRICE_INIT)
                .getLgPREENREGISTREMENTID();
    }

    public TPreenregistrementDetail createItem(TEmplacement OTEmplacement, TPreenregistrement OTPreenregistrement,
            TFamille OTFamille, int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            int lg_REMISE_ID, Date dt_CREATED, int int_PRICE_INIT) {

        TPreenregistrementDetail OTPreenregistrementDetail;

        TTypeVente OTTypeVente;

        String str_type = "";
        int int_vente_amount = 0, int_remise_price = 0;
        try {

            OTTypeVente = (TTypeVente) this.find(lg_type_vente_id, new TTypeVente());

            OTPreenregistrementDetail = new TPreenregistrementDetail();
            OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
            OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
            OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
            OTPreenregistrementDetail.setIntPRICE(OPreenregistrement.GetTotalDetail(int_PRICE_INIT, int_quantite));
            OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_INIT);
            OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
            OTPreenregistrementDetail.setIntAVOIR(0);
            OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
            OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
            OTPreenregistrementDetail.setDtUPDATED(dt_CREATED);
            OTPreenregistrementDetail.setIntFREEPACKNUMBER(0);
            OTPreenregistrementDetail.setIntUG(0);
            this.getOdataManager().getEm().persist(OTPreenregistrementDetail);

            // int_vente_amount = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
            // OTPreenregistrement.getStrSTATUT());
            int_vente_amount = OTPreenregistrement.getIntPRICE() + OTPreenregistrementDetail.getIntPRICE();
            int_remise_price = (int_vente_amount * lg_REMISE_ID) / 100;

            this.updateVirtualStock(OTPreenregistrementDetail, OTPreenregistrementDetail.getIntQUANTITY(), "ins");
            //
            if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = Parameter.KEY_VENTE_ORDONNANCE;
                // OWarehouseManager.updateReelStockForDepot(OTPreenregistrementDetail.getLgFAMILLEID(),
                // OTPreenregistrementDetail.getIntQUANTITYSERVED(), OTEmplacement);

            }

            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntPRICE(int_vente_amount);
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            this.getOdataManager().getEm().merge(OTPreenregistrement);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTPreenregistrementDetail;
        } catch (NoResultException e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajouter ce produit à la vente");
            return null;
        }
    }

    public TPreenregistrementDetail createItem(TPreenregistrement OTPreenregistrement, TFamille OTFamille,
            int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id, int lg_REMISE_ID,
            Date dt_CREATED, int int_PRICE_INIT) {

        TPreenregistrementDetail OTPreenregistrementDetail = null;

        TTypeVente OTTypeVente = null;

        String str_type = "";
        int int_vente_amount = 0, int_remise_price = 0;
        try {

            OTTypeVente = (TTypeVente) this.find(lg_type_vente_id, new TTypeVente());

            OTPreenregistrementDetail = new TPreenregistrementDetail();
            OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
            OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
            OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
            OTPreenregistrementDetail.setIntPRICE(OPreenregistrement.GetTotalDetail(int_PRICE_INIT, int_quantite));
            OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_INIT);
            OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
            OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
            OTPreenregistrementDetail.setIntAVOIR(0);
            OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
            OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
            OTPreenregistrementDetail.setDtUPDATED(dt_CREATED);
            this.getOdataManager().getEm().persist(OTPreenregistrementDetail);

            // int_vente_amount = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
            // OTPreenregistrement.getStrSTATUT());
            int_vente_amount = OTPreenregistrement.getIntPRICE() + OTPreenregistrementDetail.getIntPRICE();
            int_remise_price = (int_vente_amount * lg_REMISE_ID) / 100;

            this.updateVirtualStock(OTPreenregistrementDetail, OTPreenregistrementDetail.getIntQUANTITY(), "ins");
            //
            if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = Parameter.KEY_VENTE_ORDONNANCE;

            }

            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntPRICE(int_vente_amount);
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            this.getOdataManager().getEm().merge(OTPreenregistrement);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTPreenregistrementDetail;
        } catch (NoResultException e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajouter ce produit à la vente");
            return null;
        }
    }

    public void updateVirtualStock(TPreenregistrementDetail OTPreenregistrementDetail, int int_qte, String task) {
        int int_new_qte = 0;
        TFamilleStock OTProductItemStock = getTProductItemStock(OTPreenregistrementDetail.getLgFAMILLEID());

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

        OTProductItemStock.setIntNUMBER(int_new_qte);
        OTProductItemStock.setDtUPDATED(new Date());
        this.getOdataManager().getEm().merge(OTProductItemStock);

    }

    private TFamilleStock getTProductItemStock(TFamille OTProductItem) {
        TFamilleStock OTProductItemStock = null;
        try {

            OTProductItemStock = (TFamilleStock) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, OTProductItem.getLgFAMILLEID())
                    .setParameter(2, this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()).getSingleResult();
            new logger().OCategory.info("Stock actuel " + OTProductItemStock.getIntNUMBERAVAILABLE());
        } catch (Exception e) {
            e.printStackTrace();
            /// OTProductItemStock = new familleManagement(this.getOdataManager()).createFamilleStock(OTProductItem, 0,
            /// this.getOTUser().getLgEMPLACEMENTID());
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTProductItemStock;
    }

    public TPreenregistrementDetail newItem(TEmplacement OTEmplacement, TPreenregistrement OTPreenregistrement,
            TFamille OTFamille, int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            int lg_REMISE_ID, Date dt_CREATED, int int_PRICE_INIT) {

        TPreenregistrementDetail OTPreenregistrementDetail;

        TTypeVente OTTypeVente;

        String str_type;
        int int_vente_amount, int_remise_price = 0;
        try {

            OTTypeVente = (TTypeVente) this.find(lg_type_vente_id, new TTypeVente());
            OTPreenregistrementDetail = OPreenregistrement.findFamilleInTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTFamille.getLgFAMILLEID(),
                    OTPreenregistrement.getStrSTATUT());

            if (OTPreenregistrementDetail == null) {
                OTPreenregistrementDetail = new TPreenregistrementDetail();
                OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
                OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
                OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
                OTPreenregistrementDetail.setIntPRICE(OPreenregistrement.GetTotalDetail(int_PRICE_INIT, int_quantite));
                OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_INIT);
                OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
                OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
                OTPreenregistrementDetail.setIntAVOIR(0);
                OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
                OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
                OTPreenregistrementDetail.setDtUPDATED(dt_CREATED);
                OTPreenregistrementDetail.setIntUG(0);
                OTPreenregistrementDetail.setIntFREEPACKNUMBER(0);
                this.getOdataManager().getEm().persist(OTPreenregistrementDetail);
            } else {
                OTPreenregistrementDetail.setIntPRICE(OTPreenregistrementDetail.getIntPRICE() + (OPreenregistrement
                        .GetTotalDetail(OTPreenregistrementDetail.getIntPRICEUNITAIR(), int_quantite)));
                OTPreenregistrementDetail.setIntQUANTITY(OTPreenregistrementDetail.getIntQUANTITY() + int_quantite);
                OTPreenregistrementDetail
                        .setIntQUANTITYSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_quantite);
                OTPreenregistrementDetail.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
            }
            // this.persiste(OTPreenregistrementDetail);
            int_vente_amount = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT());
            int_remise_price = (int_vente_amount * lg_REMISE_ID) / 100;

            this.updateVirtualStock(OTPreenregistrementDetail, OTPreenregistrementDetail.getIntQUANTITY(), "ins");

            if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = Parameter.KEY_VENTE_ORDONNANCE;
                // OWarehouseManager.updateReelStockForDepot(OTPreenregistrementDetail.getLgFAMILLEID(),
                // OTPreenregistrementDetail.getIntQUANTITYSERVED(), OTEmplacement);
            }
            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntPRICE(int_vente_amount);
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTPreenregistrementDetail;
        } catch (NoResultException e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajouter ce produit à la vente");
            return null;
        }
    }

    public TPreenregistrementDetail newItem(TEmplacement OTEmplacement, TPreenregistrement OTPreenregistrement,
            TFamille OTFamille, int int_PRICE, int int_quantite, int int_quantite_served, String lg_type_vente_id,
            int lg_REMISE_ID, Date dt_CREATED, int int_PRICE_INIT, int qteAutorisee) {

        TPreenregistrementDetail OTPreenregistrementDetail;

        TTypeVente OTTypeVente;

        String str_type;
        int int_vente_amount, int_remise_price = 0;
        try {

            OTTypeVente = (TTypeVente) this.find(lg_type_vente_id, new TTypeVente());
            OTPreenregistrementDetail = OPreenregistrement.findFamilleInTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTFamille.getLgFAMILLEID(),
                    OTPreenregistrement.getStrSTATUT());

            if (OTPreenregistrementDetail == null) {
                OTPreenregistrementDetail = new TPreenregistrementDetail();
                OTPreenregistrementDetail.setLgPREENREGISTREMENTDETAILID(this.getKey().getComplexId());
                OTPreenregistrementDetail.setLgPREENREGISTREMENTID(OTPreenregistrement);
                OTPreenregistrementDetail.setLgFAMILLEID(OTFamille);
                OTPreenregistrementDetail.setIntPRICE(OPreenregistrement.GetTotalDetail(int_PRICE_INIT, int_quantite));
                OTPreenregistrementDetail.setIntPRICEUNITAIR(int_PRICE_INIT);
                OTPreenregistrementDetail.setIntQUANTITY(int_quantite);
                OTPreenregistrementDetail.setIntQUANTITYSERVED(int_quantite_served);
                OTPreenregistrementDetail.setIntAVOIR(0);
                OTPreenregistrementDetail.setStrSTATUT(commonparameter.statut_is_Process);
                OTPreenregistrementDetail.setDtCREATED(dt_CREATED);
                OTPreenregistrementDetail.setDtUPDATED(dt_CREATED);
                OTPreenregistrementDetail.setIntUG(0);
                OTPreenregistrementDetail.setIntFREEPACKNUMBER(0);
                this.getOdataManager().getEm().persist(OTPreenregistrementDetail);
            } else {
                int qty = OTPreenregistrementDetail.getIntQUANTITY() + int_quantite;
                if (qty > qteAutorisee) {
                    this.buildErrorTraceMessage("La quantité saisie est supérieure à la quantité autorisée");
                }

                OTPreenregistrementDetail.setIntPRICE(OTPreenregistrementDetail.getIntPRICE() + (OPreenregistrement
                        .GetTotalDetail(OTPreenregistrementDetail.getIntPRICEUNITAIR(), int_quantite)));
                OTPreenregistrementDetail.setIntQUANTITY(OTPreenregistrementDetail.getIntQUANTITY() + int_quantite);
                OTPreenregistrementDetail
                        .setIntQUANTITYSERVED(OTPreenregistrementDetail.getIntQUANTITYSERVED() + int_quantite);
                OTPreenregistrementDetail.setDtUPDATED(new Date());
                this.getOdataManager().getEm().merge(OTPreenregistrementDetail);
            }
            // this.persiste(OTPreenregistrementDetail);
            int_vente_amount = OPreenregistrement.GetVenteTotal(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTPreenregistrement.getStrSTATUT());
            int_remise_price = (int_vente_amount * lg_REMISE_ID) / 100;

            this.updateVirtualStock(OTPreenregistrementDetail, OTPreenregistrementDetail.getIntQUANTITY(), "ins");

            if (OTTypeVente.getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
            } else {
                str_type = Parameter.KEY_VENTE_ORDONNANCE;
                // OWarehouseManager.updateReelStockForDepot(OTPreenregistrementDetail.getLgFAMILLEID(),
                // OTPreenregistrementDetail.getIntQUANTITYSERVED(), OTEmplacement);
            }
            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntPRICE(int_vente_amount);
            OTPreenregistrement.setIntPRICEREMISE(int_remise_price);
            OTPreenregistrement.setLgREMISEID(String.valueOf(lg_REMISE_ID));
            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTPreenregistrementDetail;
        } catch (NoResultException e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajouter ce produit à la vente");
            return null;
        }
    }

    public String buildVenteRef(Date ODate, String KEY_PARAMETER) throws JSONException {
        // TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, "KEY_LAST_ORDER_NUMBER");
        // // a decommenter en cas de probleme
        TParameters OTParameters = this.getOdataManager().getEm().find(TParameters.class, KEY_PARAMETER);
        TParameters OTParameters_KEY_SIZE_ORDER_NUMBER = this.getOdataManager().getEm().find(TParameters.class,
                "KEY_SIZE_ORDER_NUMBER");
        this.refresh(OTParameters);

        String jsondata = OTParameters.getStrVALUE();
        int int_last_code = 0;
        int_last_code = int_last_code + 1;

        new logger().OCategory.info("jsondata =  " + jsondata);
        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);

            int_last_code = new Integer(jsonObject.getString("int_last_code"));
            Date dt_last_date = date.stringToDate(jsonObject.getString("str_last_date"), date.formatterMysqlShort2);

            String str_lasd = this.getKey().DateToString(dt_last_date, this.getKey().formatterMysqlShort2);
            String str_actd = this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2);

            if (!str_lasd.equals(str_actd)) {
                int_last_code = 0;
            }

            new logger().OCategory.info(int_last_code + "  " + dt_last_date);

        } catch (Exception e) {
            e.printStackTrace();
        }

        // KEY_SIZE_ORDER_NUMBER
        Calendar now = Calendar.getInstance();
        int hh = now.get(Calendar.HOUR_OF_DAY);
        int mois = now.get(Calendar.MONTH) + 1;
        int jour = now.get(Calendar.DAY_OF_MONTH);
        int intsize = ((int_last_code + 1) + "").length();
        int intsize_tobuild = new Integer(OTParameters_KEY_SIZE_ORDER_NUMBER.getStrVALUE());
        String str_last_code = "";
        for (int i = 0; i < (intsize_tobuild - intsize); i++) {
            str_last_code = str_last_code + "0";
        }

        str_last_code = str_last_code + (int_last_code + 1) + "";

        String str_code = this.getKey().getKeyYear() + "" + mois + "" + jour + "_" + str_last_code;

        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", str_last_code);
        json.put("str_last_date", this.getKey().DateToString(ODate, this.getKey().formatterMysqlShort2));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        OTParameters.setStrVALUE(jsonData);
        this.getOdataManager().getEm().merge(OTParameters);

        return str_code;
    }

    public Integer getNbrVenteLimite() {
        TParameters OTParameters;
        int int_nbre_limite = 0;
        try {
            OTParameters = (TParameters) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TParameters t WHERE t.strKEY =?1 AND t.strSTATUT = ?2")
                    .setParameter(1, "KEY_MAX_VALUE_VENTE").setParameter(2, commonparameter.statut_enable)
                    .getSingleResult();
            int_nbre_limite = Integer.parseInt(OTParameters.getStrVALUE());
            return int_nbre_limite;
        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR get vente limite vente ", e.toString());
            return int_nbre_limite;
        }

    }
    // entree en stock depot

    public TPreenregistrement createVente(TEmplacement OTEmplacement, String lg_PREENREGISTREMENT_ID,
            String lg_COMPTE_CLIENT_ID, String lg_NATURE_VENTE_ID, Date dt_CREATED, String KEY_PARAMETER,
            String lg_USER_VENDEUR_ID, TFamille OTFamille, int int_PRICE, int int_quantite, int int_quantite_served,
            String lg_type_vente_id, int lg_REMISE_ID, int int_PRICE_INIT) {
        TPreenregistrement OTPreenregistrement;

        TTypeVente OTTypeVente;
        TNatureVente OTNatureVente;
        TUser OTUserVendeur;
        try {
            // OTEmplacement = new EmplacementManagement(this.getOdataManager()).getEmplacement(lg_COMPTE_CLIENT_ID);
            OTTypeVente = OPreenregistrement.getTypeVente(OTEmplacement.getLgTYPEDEPOTID().getStrNAME());
            OTNatureVente = this.getOdataManager().getEm().find(TNatureVente.class, lg_NATURE_VENTE_ID);
            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);

            if (OTTypeVente == null || OTNatureVente == null) {
                this.buildErrorTraceMessage("Echec de création de la pré-vente. Dépôt inconnu");
                return null;
            }
            int qteAuthorisee = this.getNbrVenteLimite();

            if (!this.getOdataManager().getEm().getTransaction().isActive()) {

                this.getOdataManager().getEm().getTransaction().begin();
            }

            if ("0".equals(lg_PREENREGISTREMENT_ID)) {
                if (int_quantite > qteAuthorisee) {
                    this.buildErrorTraceMessage("La quantité saisie est supérieure à la quantité autorisée");
                    // this.getOdataManager().getEm().getTransaction().commit();
                    // return null;
                }

                OTPreenregistrement = new TPreenregistrement();

                OTPreenregistrement.setLgPREENREGISTREMENTID(this.getKey().getComplexId());
                OTPreenregistrement.setLgUSERID(this.getOTUser());
                OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
                OTPreenregistrement.setLgUSERCAISSIERID(this.getOTUser());
                OTPreenregistrement.setLgUSERID(this.getOTUser());
                OTPreenregistrement.setStrREF(this.buildVenteRef(dt_CREATED, KEY_PARAMETER));
                OTPreenregistrement.setIntPRICE(0);
                OTPreenregistrement.setIntACCOUNT(0);
                OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Process);
                OTPreenregistrement.setDtCREATED(dt_CREATED);
                OTPreenregistrement.setIntCUSTPART(0);
                OTPreenregistrement.setDtUPDATED(dt_CREATED);
                OTPreenregistrement.setLgNATUREVENTEID(OTNatureVente);
                OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
                OTPreenregistrement.setIntSENDTOSUGGESTION(0);
                OTPreenregistrement.setBISCANCEL(Boolean.FALSE);
                OTPreenregistrement.setPkBrand(OTEmplacement.getLgEMPLACEMENTID());
                OTPreenregistrement.setStrFIRSTNAMECUSTOMER(
                        OTEmplacement.getStrFIRSTNAME() + " " + OTEmplacement.getStrLASTNAME());
                OTPreenregistrement.setStrLASTNAMECUSTOMER(OTEmplacement.getStrDESCRIPTION());
                OTPreenregistrement.setStrPHONECUSTOME(OTEmplacement.getStrPHONE());
                this.getOdataManager().getEm().persist(OTPreenregistrement);
                this.addItem(OTEmplacement, OTPreenregistrement, OTFamille, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, int_PRICE_INIT);
            } else {
                OTPreenregistrement = this.getOdataManager().getEm().find(TPreenregistrement.class,
                        lg_PREENREGISTREMENT_ID);
                if (int_quantite > qteAuthorisee) {
                    this.buildErrorTraceMessage("La quantité saisie est supérieure à la quantité autorisée");
                    // this.getOdataManager().getEm().getTransaction().commit();
                    // return OTPreenregistrement;
                }
                this.newItem(OTEmplacement, OTPreenregistrement, OTFamille, int_PRICE, int_quantite,
                        int_quantite_served, lg_type_vente_id, lg_REMISE_ID, dt_CREATED, int_PRICE_INIT, qteAuthorisee);
            }
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            }

            return OTPreenregistrement;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la pré-vente");
            return null;
        }
    }

    private void executeStoreProcedureVenteDepot(String ID, String empl) {
        try {
            StoredProcedureQuery q = this.getOdataManager().getEm().createStoredProcedureQuery("proc_depot_vente");
            // q.setHint(QueryHints.PESSIMISTIC_LOCK, PessimisticLock.NoLock);
            q.setHint("javax.persistence.query.timeout", 10000);
            q.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter(2, String.class, ParameterMode.IN);
            q.setParameter(1, ID);
            q.setParameter(2, empl);
            q.execute();
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public boolean cloturerVente(String lg_COMPTE_CLIENT_ID, String lg_PREENREGISTREMENT_ID,
            String lg_TYPE_REGLEMENT_ID, Integer int_TOTAL_VENTE_RECAP, int int_AMOUNT_RECU, int int_AMOUNT_REMIS,
            String lg_MODE_REGLEMENT_ID, String str_REF_COMPTE_CLIENT, String lg_MOTIF_REGLEMENT_ID,
            String str_ORDONNANCE, String str_FIRST_NAME_FACTURE, String str_LAST_NAME_FACTURE,
            String int_NUMBER_FACTURE, String str_NUMERO_SECURITE_SOCIAL, int int_amount_remise,
            String lg_USER_VENDEUR_ID, String str_BANQUE, String str_LIEU, String str_CODE_MONNAIE,
            Integer int_TAUX_CHANGE, String str_NOM) {
        boolean result = false;
        String str_type, str_STATUTVENTE = commonparameter.statut_nondiffere;

        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        EmplacementManagement OEmplacementManagement = new EmplacementManagement(this.getOdataManager(),
                this.getOTUser());
        TTypeVente OTTypeVente;
        TPreenregistrement OTPreenregistrement;
        TTypeReglement OTTypeReglement;
        TReglement OTReglement;
        TTypeMvtCaisse OTTypeMvtCaisse;
        TEmplacement OTEmplacement;
        TEmplacement userOTEmplacement = this.getOTUser().getLgEMPLACEMENTID();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail;
        TRecettes OTRecettes;
        TUser OTUserVendeur;
        try {
            if (!OcaisseManagement.CheckResumeCaisse()) {
                this.buildErrorTraceMessage(OcaisseManagement.getDetailmessage());
                return false;
            }
            OTEmplacement = OEmplacementManagement.getEmplacementByCompteClient(str_REF_COMPTE_CLIENT);
            System.out.println(" ------------------>>>  " + OTEmplacement);
            OTTypeVente = OPreenregistrement.getTypeVente(OTEmplacement.getLgTYPEDEPOTID().getStrNAME());
            OTUserVendeur = new user(this.getOdataManager()).getUserById(lg_USER_VENDEUR_ID);
            if (!new caisseManagement(this.getOdataManager(), this.getOTUser()).CheckResumeCaisse()) {
                this.buildErrorTraceMessage("Impossible de valide la commande ", "La caisse est fermée");
                return false;
            }

            OTPreenregistrement = OPreenregistrement.getTPreenregistrementByRef(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de valider la vente",
                        "Ref commande inconnue " + lg_PREENREGISTREMENT_ID);
                return false;
            }

            if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Closed)) {
                this.buildErrorTraceMessage("Impossible de valider la vente",
                        "la vente a deja ete  " + this.getOTranslate().getValue(commonparameter.statut_is_Closed));
                return false;
            }
            OTTypeReglement = OPreenregistrement.getTTypeReglement(lg_TYPE_REGLEMENT_ID);
            if (OTTypeReglement != null) {
                lg_TYPE_REGLEMENT_ID = OTTypeReglement.getLgTYPEREGLEMENTID();
            }
            TModeReglement OTModeReglement = OPreenregistrement.getTModeReglementByTypeReglement(lg_MODE_REGLEMENT_ID,
                    lg_TYPE_REGLEMENT_ID);

            OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);

            if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
                str_type = bll.common.Parameter.KEY_VENTE_NON_ORDONNANCEE;
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_NON_ORDONNANCEE,
                        this.getOdataManager());
            } else {
                str_type = bll.common.Parameter.KEY_VENTE_ORDONNANCE;
                OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(Parameter.KEY_PARAM_MVT_VENTE_ORDONNANCE,
                        this.getOdataManager());
            }

            String Description = OTTypeMvtCaisse.getStrDESCRIPTION();
            lstTPreenregistrementDetail = OPreenregistrement.getTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrSTATUT());
            this.getOdataManager().getEm().getTransaction().begin();
            OTReglement = this.createTReglement(lg_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, str_BANQUE, str_LIEU,
                    str_CODE_MONNAIE, str_LIEU, OTModeReglement, int_TAUX_CHANGE, int_TOTAL_VENTE_RECAP, str_NOM,
                    new Date(), true);

            updateVenteDetails(OTPreenregistrement.getLgPREENREGISTREMENTID());

            for (TPreenregistrementDetail OTPreenregistrementDetail : lstTPreenregistrementDetail) {
                updateReelStockForDepot(OTPreenregistrementDetail.getLgFAMILLEID(),
                        (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
                        "ins", OTEmplacement, OStockManager);
                updateReelStock(OTPreenregistrementDetail.getLgFAMILLEID(),
                        (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                : OTPreenregistrementDetail.getIntQUANTITYSERVED()),
                        OStockManager, userOTEmplacement);
                if (userOTEmplacement.getLgEMPLACEMENTID().equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                    OStockManager.updateNbreVente(OTPreenregistrementDetail.getLgFAMILLEID(),
                            (OTPreenregistrementDetail.getIntAVOIR() == 0 ? OTPreenregistrementDetail.getIntQUANTITY()
                                    : OTPreenregistrementDetail.getIntQUANTITYSERVED()));
                }
            }

            OTPreenregistrement.setIntPRICEREMISE((OTPreenregistrement.getIntPRICE() * int_amount_remise) / 100);
            OTPreenregistrement.setStrTYPEVENTE(str_type);
            OTPreenregistrement.setIntACCOUNT(OTPreenregistrement.getIntPRICE());
            OTPreenregistrement.setIntREMISEPARA(0);
            if (OTReglement == null) {
                this.buildErrorTraceMessage("Impossible de cloture la vente", "le règlement n'a pas été effectué");
                return false;
            }

            // a revoir le process d'encaissement (la recette)
            // si depot extension, mettre comportement vente VO sinon appliquer la recette comme pour les ventes au
            // comptant
            OTPreenregistrement.setStrSTATUTVENTE(str_STATUTVENTE);

            OTPreenregistrement.setLgREGLEMENTID(OTReglement);

            OTPreenregistrement.setStrSTATUT(commonparameter.statut_is_Closed);
            OTPreenregistrement.setStrREFTICKET(this.getKey().getShortId(10));
            OTPreenregistrement.setStrREFBON("");
            OTPreenregistrement.setStrORDONNANCE(str_ORDONNANCE);
            OTPreenregistrement.setDtUPDATED(new Date());
            OTPreenregistrement.setLgUSERID(this.getOTUser());
            OTPreenregistrement.setLgUSERCAISSIERID(OTPreenregistrement.getLgUSERID());
            OTPreenregistrement.setLgUSERVENDEURID(OTUserVendeur != null ? OTUserVendeur : this.getOTUser());
            OTPreenregistrement.setStrREF(OPreenregistrement.buildVenteRef(OTPreenregistrement.getDtUPDATED(),
                    Parameter.KEY_LAST_ORDER_NUMBER_VENTE)); // code ajouté
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(str_FIRST_NAME_FACTURE);
            OTPreenregistrement.setStrLASTNAMECUSTOMER(str_LAST_NAME_FACTURE);
            OTPreenregistrement.setStrNUMEROSECURITESOCIAL(str_NUMERO_SECURITE_SOCIAL);
            OTPreenregistrement.setStrPHONECUSTOME(int_NUMBER_FACTURE);
            OTPreenregistrement.setIntPRICEOTHER(OTPreenregistrement.getIntPRICE());
            this.getOdataManager().getEm().merge(OTPreenregistrement);
            executeStoreProcedureVenteDepot(OTPreenregistrement.getLgPREENREGISTREMENTID(),
                    OTEmplacement.getLgEMPLACEMENTID());
            if (str_type.equals(Parameter.KEY_VENTE_ORDONNANCE)) {
                OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                        new Double(OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()) * (-1),
                        Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                        OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                        str_type, bll.common.Parameter.KEY_TASK_VENTE, OTReglement.getLgREGLEMENTID(),
                        str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                        commonparameter.TRANSACTION_CREDIT, true);
            } else {
                if (OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")) {
                    new logger().OCategory.info(" *** Valeur recupérée du mode de reglement *** "
                            + OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID());
                    if (OTEmplacement.getLgCOMPTECLIENTID() == null) {
                        new logger().OCategory.info(" *** Pas de compte client associe a ce differe *** ");
                        return false;
                    }

                    // code ajouté
                    if (int_AMOUNT_RECU > 0) {
                        str_STATUTVENTE = commonparameter.statut_differe;

                        int int_amount_differe = ((OTPreenregistrement.getIntPRICE()
                                - OTPreenregistrement.getIntPRICEREMISE()) - int_AMOUNT_RECU);
                        new logger().OCategory.info("int_amount_differe " + int_amount_differe); // dette a payer du
                                                                                                 // client
                        if (int_amount_differe > 0) {
                            OTTypeMvtCaisse = caisseManagement.getTTypeMvtCaisse(
                                    Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES, this.getOdataManager());
                            OTRecettes = OcaisseManagement.AddRecette(new Double(int_amount_differe + "") * (-1),
                                    Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                    OTPreenregistrement.getLgPREENREGISTREMENTID(), lg_TYPE_REGLEMENT_ID, str_type,
                                    bll.common.Parameter.KEY_TASK_VENTE, OTReglement.getLgREGLEMENTID(),
                                    str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID,
                                    OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(), commonparameter.TRANSACTION_CREDIT, true);
                            if (OTRecettes == null) {
                                this.buildErrorTraceMessage("Impossible de cloture la vente",
                                        "la recette du differe n'a pas pu etre MAJ");
                                return false;
                            }
                            // new clientManager(this.getOdataManager(),
                            // this.getOTUser()).addToMytransaction(OTEmplacement.getLgCOMPTECLIENTID(),
                            // OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_RECU, int_amount_differe *
                            // (-1));
                        }

                        OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                                new Double(int_AMOUNT_RECU), Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                                OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                                str_type, bll.common.Parameter.KEY_TASK_VENTE, OTReglement.getLgREGLEMENTID(),
                                str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                                commonparameter.TRANSACTION_CREDIT, true);
                    }

                    // fin code ajouté
                } else {
                    OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(
                            new Double(OTPreenregistrement.getIntPRICE() - OTPreenregistrement.getIntPRICEREMISE()),
                            Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, Description,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), int_AMOUNT_REMIS, int_AMOUNT_RECU,
                            OTPreenregistrement.getLgPREENREGISTREMENTID(), OTTypeReglement.getLgTYPEREGLEMENTID(),
                            str_type, bll.common.Parameter.KEY_TASK_VENTE, OTReglement.getLgREGLEMENTID(),
                            str_REF_COMPTE_CLIENT, lg_MOTIF_REGLEMENT_ID, OTTypeMvtCaisse.getLgTYPEMVTCAISSEID(),
                            commonparameter.TRANSACTION_CREDIT, true);
                }

            }
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
                result = true;
            }
            // code ajouté. Mise a jour du calendrier de l'officine
            new CalendrierManager(this.getOdataManager(), this.getOTUser()).createCalendrier(date.getoMois(new Date()),
                    Integer.parseInt(date.getAnnee(new Date())));
            this.buildSuccesTraceMessage("Vente dépôt terminée avec succès");
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de clôture de la vente dépôt");
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
            }
            e.printStackTrace();
        }
        return result;
    }

    public TMouvementSnapshot initDepotSnapshotMouvementArticle(TFamille lg_FAMILLE_ID, Integer int_NUMBER,
            Integer bebut, TEmplacement OTEmplacement, boolean isOfficine) {
        TMouvementSnapshot OTMouvementSnapshot = null;
        // String lg_TYPE_STOCK_ID = "1";
        try {
            // if (!OTEmplacement.getLgEMPLACEMENTID().equals(commonparameter.PROCESS_SUCCESS)) {
            // lg_TYPE_STOCK_ID = "3";
            // }

            if (isOfficine) {

                OTMouvementSnapshot = createDepotSnapshotMouvementArticle(lg_FAMILLE_ID, int_NUMBER, bebut,
                        OTEmplacement);
            } else {
                OTMouvementSnapshot = createDepotSnapshotMouvementArticle(lg_FAMILLE_ID, int_NUMBER, bebut,
                        OTEmplacement);
                OTMouvementSnapshot.setStrSTATUT("disable");
                this.getOdataManager().getEm().merge(OTMouvementSnapshot);

            }

        } catch (Exception e) {
            e.printStackTrace();
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

    public TMouvementSnapshot createDepotSnapshotMouvementOf(TFamille OTFamille, int int_NUMBER, String str_ACTION,
            TEmplacement OTEmplacement, Integer debut) {
        boolean isOfficine = false;
        TMouvementSnapshot OTMouvementSnapshot = null;
        try {
            if (str_ACTION.equals(commonparameter.REMOVE)) {
                isOfficine = true;
            }
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement);
            System.out.println("OTMouvementSnapshot  ----------- >> " + OTMouvementSnapshot);
            if (OTMouvementSnapshot == null) {

                OTMouvementSnapshot = this.initDepotSnapshotMouvementArticle(OTFamille, int_NUMBER, debut,
                        OTEmplacement, isOfficine);

            } else {
                OTMouvementSnapshot.setIntSTOCKJOUR(int_NUMBER);

                OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
            }

            OTMouvementSnapshot.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTMouvementSnapshot);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTMouvementSnapshot;
    }

    public void updateVenteDetails(String lgVENTEID) {

        try {
            CriteriaBuilder cb = this.getOdataManager().getEm().getCriteriaBuilder();
            CriteriaUpdate<TPreenregistrementDetail> cu = cb.createCriteriaUpdate(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cu.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> j = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cu.set(root.get(TPreenregistrementDetail_.strSTATUT), commonparameter.statut_is_Closed)
                    .set(root.get(TPreenregistrementDetail_.dtUPDATED), new Date())
                    .set(root.get(TPreenregistrementDetail_.intPRICEOTHER),
                            root.get(TPreenregistrementDetail_.intPRICE))
                    .set(root.get(TPreenregistrementDetail_.intPRICEDETAILOTHER),
                            root.get(TPreenregistrementDetail_.intPRICEUNITAIR))
                    .set(root.get(TPreenregistrementDetail_.intAVOIRSERVED),
                            root.get(TPreenregistrementDetail_.intQUANTITY))
                    .set(root.get(TPreenregistrementDetail_.boolACCOUNT), true);

            cu.where(cb.equal(j.get(TPreenregistrement_.lgPREENREGISTREMENTID), lgVENTEID));
            this.getOdataManager().getEm().createQuery(cu).executeUpdate();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public TReglement createTReglement(String str_REF_COMPTE_CLIENT, String str_REF_RESSOURCE, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, TModeReglement OTModeReglement,
            int int_TAUX, double int_AMOUNT, String str_FIRST_LAST_NAME, Date dt_reglement, boolean bool_CHECKED) {
        TReglement OTReglement = null;

        try {
            if (OTModeReglement == null) {
                this.buildErrorTraceMessage("Echec de règlement. Mode de règlement inexistant");
                return null;
            }
            OTReglement = new TReglement();
            OTReglement.setLgREGLEMENTID(this.getKey().getComplexId());
            OTReglement.setStrBANQUE(str_BANQUE);
            OTReglement.setStrCODEMONNAIE(str_CODE_MONNAIE);
            OTReglement.setStrCOMMENTAIRE(str_COMMENTAIRE);
            OTReglement.setStrLIEU(str_LIEU);
            OTReglement.setStrFIRSTLASTNAME(str_FIRST_LAST_NAME);
            OTReglement.setStrREFRESSOURCE(str_REF_RESSOURCE);
            OTReglement.setIntTAUX(int_TAUX);
            OTReglement.setDtCREATED(new Date());
            OTReglement.setLgMODEREGLEMENTID(OTModeReglement);
            OTReglement.setDtREGLEMENT(dt_reglement);
            OTReglement.setLgUSERID(this.getOTUser());
            OTReglement.setBoolCHECKED(bool_CHECKED);
            OTReglement.setStrSTATUT(OTReglement.getLgMODEREGLEMENTID().getLgMODEREGLEMENTID().equals("6")
                    ? commonparameter.statut_differe : commonparameter.statut_is_Closed);
            this.getOdataManager().getEm().persist(OTReglement);

        } catch (Exception e) {
        }

        return OTReglement;
    }

    public void updateReelStockForDepot(TFamille OTFamille, int int_qte, String task, TEmplacement OTEmplacement,
            StockManager OStockManager) {
        Integer int_new_qte = 0;
        Integer oldQty = 0;
        Integer int_entree = 0;
        Integer int_sortie = 0;
        Integer int_balance = 0;
        String lg_TYPE_STOCK_ID = Parameter.STOCK_DEPOT;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        familleManagement _OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());

        TFamilleStock OTProductItemStock = null;
        if (OTFamille.getLgFAMILLEPARENTID() != null && !"".equals(OTFamille.getLgFAMILLEPARENTID())) {
            OTProductItemStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEPARENTID(),
                    OTEmplacement.getLgEMPLACEMENTID());
        } else {
            OTProductItemStock = OtellerManagement.getTProductItemStock(OTFamille.getLgFAMILLEID(),
                    OTEmplacement.getLgEMPLACEMENTID());
        }

        if (OTProductItemStock == null) {
            OTProductItemStock = _OfamilleManagement.createOrUpdateStockFamilleForDepot(OTFamille, int_qte,
                    OTEmplacement); // creation vide des stocks depots
        } else {
            oldQty = OTProductItemStock.getIntNUMBERAVAILABLE();
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
                _OfamilleManagement.checkDeconditionneExistForDepot(OTFamille, OTEmplacement, lg_TYPE_STOCK_ID);
            }

            // fin code ajouté
            int_balance = int_qte;

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setIntNUMBER(OTProductItemStock.getIntNUMBERAVAILABLE());
            OTProductItemStock.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTProductItemStock);
            // this.merge(OTProductItemStock);
            /*
             * TTypeStockFamille OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
             * OTProductItemStock.getLgFAMILLEID().getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
             *
             * OTTypeStockFamille.setIntNUMBER(int_new_qte); this.getOdataManager().getEm().merge(OTTypeStockFamille);
             */
        }
        createDepotSnapshotMouvementOf(OTFamille, OTProductItemStock.getIntNUMBERAVAILABLE(), commonparameter.ADD,
                OTEmplacement, oldQty);
    }

    public void updateReelStock(TFamille OTFamille, int int_qte, StockManager OStockManager,
            TEmplacement OTEmplacement) {
        int int_new_qte = 0, debut = 0;

        // String lg_TYPE_STOCK_ID = commonparameter.TYPE_STOCK_RAYON;
        TFamilleStock OTProductItemStock;
        // TTypeStockFamille OTTypeStockFamille;
        try {
            OTProductItemStock = new tellerManagement(this.getOdataManager(), this.getOTUser())
                    .getTProductItemStock(OTFamille.getLgFAMILLEID());
            debut = OTProductItemStock.getIntNUMBERAVAILABLE();
            int_new_qte = OTProductItemStock.getIntNUMBERAVAILABLE() - int_qte;
            // int_entree = int_qte;
            // int_balance = int_qte;

            OTProductItemStock.setIntNUMBERAVAILABLE(int_new_qte);
            OTProductItemStock.setIntNUMBER(OTProductItemStock.getIntNUMBERAVAILABLE());
            OTProductItemStock.setDtUPDATED(new Date());

            // OTTypeStockFamille = OStockManager.getTTypeStockFamilleByTypestock(lg_TYPE_STOCK_ID,
            // OTFamille.getLgFAMILLEID(), OTEmplacement.getLgEMPLACEMENTID());
            createDepotSnapshotMouvementOf(OTFamille, OTProductItemStock.getIntNUMBERAVAILABLE(),
                    commonparameter.REMOVE, OTEmplacement, debut);
            this.getOdataManager().getEm().merge(OTProductItemStock);
            // this.getOdataManager().getEm().merge(OTTypeStockFamille);

            if (OTProductItemStock.getLgFAMILLEID().getBoolDECONDITIONNE() == 0
                    && OTProductItemStock.getLgFAMILLEID().getBCODEINDICATEUR() != 1) {

                suggestionManagement OsuggestionManagement = new suggestionManagement(getOdataManager(), getOTUser());
                OsuggestionManagement.makeSuggestionAuto(OTProductItemStock);// suggession auto
            }

            // this.BuildTSnapShopDalySortieFamille(OTPreenregistrementDetail.getLgFAMILLEID(), int_balance, int_entree,
            // int_sortie);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public TPreenregistrement AnnulerVente(TPreenregistrement OTPreenregistrement) {

        String str_type = "";
        String str_reglement = "";
        String lgTypeVente;
        TPreenregistrement OTPreenregistrementNew = null;

        if (OTPreenregistrement.getStrSTATUT().equals(commonparameter.statut_is_Process)) {
            this.buildErrorTraceMessage("Impossible d annuler la vente", "la vente n'a jamais ete cloturee  "
                    + this.getOTranslate().getValue(commonparameter.statut_is_Process));
            return null;
        }

        if (new factureManagement(this.getOdataManager(), this.getOTUser())
                .checkChargedPreenregistrement(OTPreenregistrement.getLgPREENREGISTREMENTID())) {
            this.buildErrorTraceMessage("Impossible de supprimer cette vente. Elle figure déjà sur une facture.");
            return null;
        }
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = OPreenregistrement.getTPreenregistrementDetail(
                OTPreenregistrement.getLgPREENREGISTREMENTID(), commonparameter.statut_is_Closed);
        if (lstTPreenregistrementDetail == null || lstTPreenregistrementDetail.isEmpty()) {
            this.buildErrorTraceMessage("Cette Vente n'a pas de details");
            return null;
        }
        // lgTypeVente=OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID();
        if (OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(Parameter.VENTE_DEPOT_AGREE)) {
            str_type = Parameter.KEY_VENTE_NON_ORDONNANCEE;
        } else {
            str_type = Parameter.KEY_VENTE_ORDONNANCE;
        }

        List<TCashTransaction> lstTCashTransaction = new ArrayList<>();
        lstTCashTransaction = this.getOdataManager().getEm()
                .createQuery(
                        "SELECT t FROM TCashTransaction t WHERE t.strRESSOURCEREF LIKE ?1  ORDER BY t.dtCREATED DESC  ")
                .setParameter(1, OTPreenregistrement.getLgPREENREGISTREMENTID()).getResultList();

        if (lstTCashTransaction == null || lstTCashTransaction.isEmpty()) {
            this.buildErrorTraceMessage("Cette Vente n'a pas de cash transaction");
            return null;
        }

        TTypeReglement OTTypeReglement = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgMODEREGLEMENTID()
                .getLgTYPEREGLEMENTID(); // this.getOdataManager().getEm().find(dal.TTypeReglement.class,
                                         // lstTCashTransaction.get(0).getLgTYPEREGLEMENTID().);

        if (OTTypeReglement == null) {
            this.buildErrorTraceMessage("Error", "OTTypeReglement is null");
            return null;
        } else {

            str_reglement = OTTypeReglement.getLgTYPEREGLEMENTID();

        }
        int amount_recu = lstTCashTransaction.get(0).getIntAMOUNTRECU();
        int amount_remis = lstTCashTransaction.get(0).getIntAMOUNTREMIS();
        String strreglementid = lstTCashTransaction.get(0).getLgREGLEMENTID().getLgREGLEMENTID();
        String strmotifreglementid = lstTCashTransaction.get(0).getLgMOTIFREGLEMENTID().getLgMOTIFREGLEMENTID();
        String strcompteclientref = lstTCashTransaction.get(0).getStrREFCOMPTECLIENT();
        System.out.println("strcompteclientref ***************************** >  " + strcompteclientref
                + " -------------------------");

        TPreenregistrementDetail OTPreenregistrementDetail = null;
        OTPreenregistrementNew = this.CreatePreVente(strcompteclientref,
                OTPreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID(), new Date(),
                Parameter.KEY_LAST_ORDER_NUMBER_VENTE, OTPreenregistrement.getLgUSERVENDEURID().getLgUSERID());

        // OTPreenregistrementNew.setLgREMISEID(OTPreenregistrement.getLgREMISEID());
        // code ajouté pris en compte du nom de l'acheteur
        OTPreenregistrementNew.setStrFIRSTNAMECUSTOMER(OTPreenregistrement.getStrFIRSTNAMECUSTOMER());
        OTPreenregistrementNew.setStrLASTNAMECUSTOMER(OTPreenregistrement.getStrLASTNAMECUSTOMER());
        OTPreenregistrementNew.setStrNUMEROSECURITESOCIAL(OTPreenregistrement.getStrNUMEROSECURITESOCIAL());
        OTPreenregistrementNew.setStrPHONECUSTOME(OTPreenregistrement.getStrPHONECUSTOME());
        OTPreenregistrementNew.setIntPRICEREMISE((-1) * OTPreenregistrement.getIntPRICEREMISE());
        OTPreenregistrementNew.setStrTYPEVENTE(str_type);

        this.merge(OTPreenregistrementNew);
        // fin code ajouté

        for (int i = 0; i < lstTPreenregistrementDetail.size(); i++) {
            OTPreenregistrementDetail = lstTPreenregistrementDetail.get(i);
            OPreenregistrement.CreateDetailsPreenregistrement(OTPreenregistrementNew.getLgPREENREGISTREMENTID(),
                    OTPreenregistrementDetail.getLgFAMILLEID().getLgFAMILLEID(),
                    (OTPreenregistrementDetail.getIntPRICE() * (-1)),
                    (OTPreenregistrementDetail.getIntQUANTITY() * (-1)),
                    (OTPreenregistrementDetail.getIntQUANTITYSERVED() * (-1)),
                    OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(), null,
                    OTPreenregistrement.getLgREMISEID(), OTPreenregistrementNew.getDtCREATED(),
                    OTPreenregistrementDetail.getIntPRICEUNITAIR(), (OTPreenregistrementDetail.getIntAVOIR() * (-1)),
                    OTPreenregistrementDetail.getIntFREEPACKNUMBER());
        }
        this.CloturerAnnulerVente(OTPreenregistrementNew.getLgPREENREGISTREMENTID(), OTPreenregistrement.getStrREFBON(),
                str_reglement, OTPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID(),
                (OTPreenregistrement.getIntPRICE() * (-1)), (amount_recu * (-1)), (amount_remis * (-1)), strreglementid,
                strcompteclientref, strmotifreglementid, OTPreenregistrement.getStrORDONNANCE(), 0);

        OTPreenregistrement.setDtUPDATED(new Date());
        OTPreenregistrement.setBISCANCEL(Boolean.TRUE);
        OTPreenregistrement.setDtANNULER(new Date());
        if (OTPreenregistrementNew != null) {
            OTPreenregistrement.setLgPREENGISTREMENTANNULEID(OTPreenregistrementNew.getLgPREENREGISTREMENTID());
        }
        this.merge(OTPreenregistrement);
        // Ajout du code de traçage
        this.do_event_log(commonparameter.ALL, "Annulation de la vente de référence " + OTPreenregistrement.getStrREF(),
                this.getOTUser().getStrFIRSTNAME() + " " + this.getOTUser().getStrLASTNAME(),
                commonparameter.statut_enable, "TPreenregistrement", "Annulation de vente", "Annulation de vente",
                this.getOTUser().getLgUSERID());
        // fin du code de traçage

        this.buildTraceMessage("Succes", " Operation effectuee avec succes");
        return OTPreenregistrementNew;
    }

}
