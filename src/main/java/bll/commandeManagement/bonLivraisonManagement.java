/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.commandeManagement;

import java.sql.ResultSetMetaData;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.persistence.EntityManager;
import javax.persistence.ParameterMode;
import javax.persistence.Query;
import javax.persistence.StoredProcedureQuery;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;

import org.json.JSONObject;

import bll.bllBase;
import bll.common.Parameter;
import bll.configManagement.familleGrossisteManagement;
import bll.configManagement.familleManagement;
import bll.configManagement.grossisteManagement;
import bll.interfacemanager.Bonlivraisonmanagerinterface;
import bll.stockManagement.StockManager;
import bll.teller.SnapshotManager;
import bll.teller.tellerManagement;
import bll.utils.TparameterManager;
import bll.warehouse.WarehouseManager;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraisonDetail_;
import dal.TBonLivraison_;
import dal.TEmplacement;
import dal.TEtiquette;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TFamille_;
import dal.TGrossiste;
import dal.TLot;
import dal.TLot_;
import dal.TMouvement;
import dal.TMouvementSnapshot;
import dal.TOrder;
import dal.TOrderDetail;
import dal.TOrderDetail_;
import dal.TParameters;
import dal.TPrivilege;
import dal.TRole;
import dal.TRolePrivelege;
import dal.TRoleUser;
import dal.TTypeStock;
import dal.TTypeStockFamille;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TWarehouse;
import dal.TZoneGeographique;
import dal.dataManager;
import dal.jconnexion;
import javax.persistence.CacheRetrieveMode;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;
import util.Constant;

/**
 *
 * @author AMIGONE
 */
public class bonLivraisonManagement extends bllBase implements Bonlivraisonmanagerinterface {

    public bonLivraisonManagement(dataManager OdataManager, TUser OTUser) {
        // <editor-fold defaultstate="collapsed" desc="Compiled Code">
        this.setOTUser(OTUser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
        // </editor-fold>
    }

    public bonLivraisonManagement(dataManager OdataManager) {
        // <editor-fold defaultstate="collapsed" desc="Compiled Code">
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
        // </editor-fold>
    }

    public List<TFamille> findFamilleBLDetail(String lg_BON_LIVRAISON_ID) {

        List<TFamille> lstTFamille = new ArrayList<>();

        try {

            /*
             * lstTBonLivraisonDetail = this.getTBonLivraisonDetailBis(lg_BON_LIVRAISON_ID);
             *
             * lstTFamille = new ArrayList<TFamille>();
             */
            lstTFamille = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamille t, TBonLivraisonDetail b WHERE t.lgFAMILLEID = b.lgFAMILLEID.lgFAMILLEID AND b.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?1 AND b.strSTATUT = ?2")
                    .setParameter(1, lg_BON_LIVRAISON_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .getResultList();

            /*
             * for (TBonLivraisonDetail OTBonLivraisonDetail : lstTBonLivraisonDetail) {
             *
             * lstTFamille.add(OTBonLivraisonDetail.getLgFAMILLEID());
             *
             * }
             */
        } catch (Exception e) {
            e.printStackTrace();

        }
        new logger().OCategory.info("lstTFamille " + lstTFamille.size());
        return lstTFamille;

    }

    public int articleStatus(String lgFamilleID) {
        int status = getStatusInOrder(lgFamilleID);
        if (status == 0) {
            status = articleStatusSuggestion(lgFamilleID);
        }

        return status;

    }

    public List<TFamille> findFamilleBLDetail(String search_value, String lg_BON_LIVRAISON_ID) {

        List<TFamille> lstTFamille = new ArrayList<>();
        TFamille OTFamille = null;

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT lg_FAMILLE_ID, str_DESCRIPTION, int_CIP, int_PAF, lg_GROSSISTE_ID, int_EAN13, lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, str_STATUT FROM v_famille_retour WHERE (lg_BON_LIVRAISON_ID LIKE '"
                    + lg_BON_LIVRAISON_ID + "' OR str_REF_LIVRAISON LIKE '" + lg_BON_LIVRAISON_ID
                    + "') AND (int_CIP LIKE '" + search_value + "%' OR str_DESCRIPTION LIKE '" + search_value
                    + "%' OR int_EAN13 LIKE '" + search_value + "%' OR str_CODE_ARTICLE LIKE '" + search_value
                    + "%') AND str_STATUT = '" + commonparameter.statut_is_Closed
                    + "' GROUP BY lg_FAMILLE_ID ORDER BY str_DESCRIPTION";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OTFamille = new TFamille();
                OTFamille.setLgFAMILLEID(Ojconnexion.get_resultat().getString("lg_FAMILLE_ID"));
                OTFamille.setStrDESCRIPTION(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setStrNAME(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OTFamille.setIntCIP(Ojconnexion.get_resultat().getString("int_CIP"));
                OTFamille.setStrCODETABLEAU(Ojconnexion.get_resultat().getString("lg_GROSSISTE_ID"));
                OTFamille.setIntPAF(Ojconnexion.get_resultat().getInt("int_PAF"));
                lstTFamille.add(OTFamille);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("lstTFamille " + lstTFamille.size());
        return lstTFamille;

    }

    public TBonLivraisonDetail findTBonLivraisonDetail(String str_REF_LIVRAISON, String lg_FAMILLE_ID) {
        TBonLivraisonDetail OTBonLivraisonDetail = null;
        try {
            OTBonLivraisonDetail = (TBonLivraisonDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONID.strREFLIVRAISON LIKE ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2")
                    .setParameter(1, str_REF_LIVRAISON).setParameter(2, lg_FAMILLE_ID).getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTBonLivraisonDetail;
    }

    public void ChangePrice(String lg_BON_LIVRAISON_DETAIL, int int_PRIX_REFERENCE, int int_PRIX_VENTE, int int_PAF,
            int int_PAT, String lg_ZONE_GEO_ID) {

        dal.TBonLivraisonDetail OTBonLivraisonDetail = null;
        dal.TZoneGeographique OTZoneGeographique = null;
        dal.TFamille OTFamille = null;

        try {

            OTBonLivraisonDetail = this.findTBonLivraisonDetail(lg_BON_LIVRAISON_DETAIL);

            if (OTBonLivraisonDetail != null) {
                int OldPrice = OTBonLivraisonDetail.getIntPAF();
                OTBonLivraisonDetail.setIntPRIXREFERENCE(int_PRIX_REFERENCE);
                OTBonLivraisonDetail.setIntPRIXVENTE(int_PRIX_VENTE);
                OTBonLivraisonDetail.setIntPAF(int_PAF);
                OTBonLivraisonDetail.setIntPAREEL(int_PAT);

                OTZoneGeographique = this.getOdataManager().getEm().find(TZoneGeographique.class, lg_ZONE_GEO_ID);
                OTFamille = OTBonLivraisonDetail.getLgFAMILLEID();
                if (OTZoneGeographique != null && OTFamille != null) {
                    OTBonLivraisonDetail.setLgZONEGEOID(OTZoneGeographique);
                    /*
                     * OTFamille.setLgZONEGEOID(OTZoneGeographique); this.persiste(OTFamille);
                     */
                }

                this.persiste(OTBonLivraisonDetail);
                // updateBonLivraisonAmount(OTBonLivraisonDetail, OldPrice);
                // new suggestionManagement(this.getOdataManager(),
                // this.getOTUser()).updatePriceArticleByDuringCommand(OTFamille.getLgFAMILLEID(), int_PRIX_VENTE,
                // int_PRIX_REFERENCE, int_PAF, int_PAT, commonparameter.code_action_commande,
                // OTBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER(),
                // commonparameter.str_ACTION_ENTREESTOCK); // a decommenter en cas de probleme
                new suggestionManagement(this.getOdataManager(), this.getOTUser()).updatePriceArticleByDuringCommand(
                        OTFamille.getLgFAMILLEID(), int_PRIX_VENTE, int_PRIX_REFERENCE, int_PAF, int_PAT,
                        commonparameter.code_action_commande,
                        OTBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER(), "");
                /*
                 * && OTFamille != null) {
                 *
                 * OTFamille.setIntPRICE(int_PRIX_VENTE); OTFamille.setIntPRICETIPS(int_PRIX_REFERENCE);
                 * OTFamille.setIntPAT(int_PAT); OTFamille.setIntPAF(int_PAF);
                 *
                 * if (OTZoneGeographique != null) { OTFamille.setLgZONEGEOID(OTZoneGeographique); }
                 *
                 * this.persiste(OTFamille); new
                 * logger().OCategory.info(" UPDATE FAMILLE DEPUIS public void ChangePrice");
                 *
                 * }
                 */
            }

        } catch (Exception e) {

        }

    }

    public TBonLivraison findOrderInTBonLivraison(String lg_ORDER_ID) {
        TBonLivraison OTBonLivraison = null;
        try {
            OTBonLivraison = (TBonLivraison) this.getOdataManager().getEm()
                    .createQuery(
                            "SELECT t FROM TBonLivraison t WHERE t.lgORDERID.lgORDERID = ?1  AND t.strSTATUT LIKE ?2 ")
                    .setParameter(1, lg_ORDER_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();

            new logger().OCategory.info(" ***OTBonLivraison   5555 *** " + OTBonLivraison.getLgBONLIVRAISONID());

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
            new logger().OCategory.info(" *** Desoleeeeeee OTBonLivraison   5555 *** " + e.toString());
        }
        return OTBonLivraison;
    }

    public List<TBonLivraisonDetail> getTBonLivraisonDetail(String lg_BON_LIVRAISON_ID, String str_STATUT) {
        List<TBonLivraisonDetail> lstT = new ArrayList<TBonLivraisonDetail>();
        try {
            lstT = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraisonDetail t WHERE t.strSTATUT LIKE ?1 AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 ")
                    .setParameter(1, str_STATUT).setParameter(2, lg_BON_LIVRAISON_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstT taille " + lstT.size());
        return lstT;
    }

    public List<TBonLivraisonDetail> getTBonLivraisonDetail(String lg_BON_LIVRAISON_ID) {
        List<TBonLivraisonDetail> lstT = new ArrayList<>();
        try {

            String query = "SELECT t FROM TBonLivraisonDetail t WHERE  t.lgBONLIVRAISONID.lgBONLIVRAISONID =?1";

            lstT = this.getOdataManager().getEm().createQuery(query).setParameter(1, lg_BON_LIVRAISON_ID)
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstT;
    }

    public List<TBonLivraisonDetail> getTBonLivraisonDetailBis(String search_value, String lg_BON_LIVRAISON_ID) {
        List<TBonLivraisonDetail> lstT = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            String query = "SELECT t FROM TBonLivraisonDetail t WHERE (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?3) AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) ORDER BY t.dtUPDATED DESC";

            lstT = this.getOdataManager().getEm().createQuery(query).setParameter(1, commonparameter.statut_enable)
                    .setParameter(2, lg_BON_LIVRAISON_ID).setParameter(3, commonparameter.statut_is_Closed)
                    .setParameter(4, search_value + "%").getResultList();
            for (TBonLivraisonDetail OBonLivraisonDetail : lstT) {
                this.refresh(OBonLivraisonDetail);

            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstT;
    }

    public List<TBonLivraisonDetail> getTBonLivraisonDetailBis(String search_value, String lg_BON_LIVRAISON_ID,
            String str_TYPE_TRANSACTION, boolean bool_CHECKEXPIRATIONDATE) {
        List<TBonLivraisonDetail> lstT = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (str_TYPE_TRANSACTION.equalsIgnoreCase("ALL")) {
                String query = "SELECT t FROM TBonLivraisonDetail t WHERE (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?3) AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) ORDER BY t.lgFAMILLEID.strNAME ";
                if (bool_CHECKEXPIRATIONDATE) {
                    query = "SELECT t FROM TBonLivraisonDetail t WHERE (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?3) AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) AND t.lgFAMILLEID.boolCHECKEXPIRATIONDATE=TRUE ORDER BY t.lgFAMILLEID.strNAME ";
                }
                lstT = this.getOdataManager().getEm().createQuery(query).setParameter(1, commonparameter.statut_enable)
                        .setParameter(2, lg_BON_LIVRAISON_ID).setParameter(3, commonparameter.statut_is_Closed)
                        .setParameter(4, search_value + "%").getResultList();
            } else {
                String diff = "  ";
                if (str_TYPE_TRANSACTION.equals("PRIX")) {
                    diff = " AND t.intPRIXVENTE <> t.lgFAMILLEID.intPRICE ";
                }
                String query = "SELECT t FROM TBonLivraisonDetail t WHERE (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?3) AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) AND t.intQTERECUE = 0 "
                        + diff + "  ORDER BY t.dtUPDATED DESC";
                if (bool_CHECKEXPIRATIONDATE) {
                    query = "SELECT t FROM TBonLivraisonDetail t WHERE (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?3) AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) AND t.intQTERECUE = 0  AND t.lgFAMILLEID.boolCHECKEXPIRATIONDATE=TRUE "
                            + diff + "   ORDER BY t.dtUPDATED DESC";
                }
                lstT = this.getOdataManager().getEm().createQuery(query).setParameter(1, commonparameter.statut_enable)
                        .setParameter(2, lg_BON_LIVRAISON_ID).setParameter(3, commonparameter.statut_is_Closed)
                        .setParameter(4, search_value + "%").getResultList();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lstT;
    }

    public TBonLivraisonDetail UpdateTBonLivraisonDetail(String lg_BON_LIVRAISON_DETAIL, String lg_BON_LIVRAISON_ID,
            int int_QTE_CMDE, int int_QTE_RECUE, int int_PRIX_REFERENCE, int int_PAF, int int_PA_REEL,
            int int_PRIX_VENTE, String str_STATUT) {

        TBonLivraisonDetail oTBonLivraisonDetail = null;

        try {

            oTBonLivraisonDetail = this.getOdataManager().getEm().find(TBonLivraisonDetail.class,
                    lg_BON_LIVRAISON_DETAIL);

            oTBonLivraisonDetail.setLgBONLIVRAISONID(this.FindTBonLivraison(lg_BON_LIVRAISON_ID));
            oTBonLivraisonDetail.setIntPAF(int_PAF);
            oTBonLivraisonDetail.setIntPAREEL(int_PA_REEL);
            oTBonLivraisonDetail.setIntPRIXREFERENCE(int_PRIX_REFERENCE);
            oTBonLivraisonDetail.setIntPRIXVENTE(int_PRIX_VENTE);
            oTBonLivraisonDetail.setIntQTECMDE(int_QTE_CMDE);
            oTBonLivraisonDetail.setIntQTERECUE(int_QTE_RECUE);

            oTBonLivraisonDetail.setStrSTATUT(str_STATUT);
            oTBonLivraisonDetail.setDtUPDATED(new Date());

            this.persiste(oTBonLivraisonDetail);
            this.refresh(oTBonLivraisonDetail);

            new logger().OCategory
                    .info(" update de oTBonLivraisonDetail  " + oTBonLivraisonDetail.getLgBONLIVRAISONDETAIL());

        } catch (Exception E) {

            // oTOrderDetail = this.createOrderDetail(lg_ORDER_ID, lg_FAMILLE_GROSSISTE_ID, int_NUMBER);
            new logger().OCategory
                    .info(" CREATE de oTBonLivraisonDetail  " + oTBonLivraisonDetail.getLgBONLIVRAISONDETAIL());
        }
        return oTBonLivraisonDetail;
    }

    public TBonLivraisonDetail findFamilleInTBonLivraisonDetail(String lg_BON_LIVRAISON_ID, String lg_FAMILLE_ID,
            String str_STATUT) {
        TBonLivraisonDetail OTBonLivraisonDetail = null;
        try {
            OTBonLivraisonDetail = (TBonLivraisonDetail) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraisonDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgBONLIVRAISONID.lgBONLIVRAISONID LIKE ?2 AND t.strSTATUT LIKE ?3  ")
                    .setParameter(2, lg_BON_LIVRAISON_ID).setParameter(1, lg_FAMILLE_ID).setParameter(3, str_STATUT)
                    .getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTBonLivraisonDetail;
    }

    public TBonLivraisonDetail findTBonLivraisonDetail(String lg_BON_LIVRAISON_DETAIL) {
        TBonLivraisonDetail OTBonLivraisonDetail = null;

        try {

            OTBonLivraisonDetail = (TBonLivraisonDetail) this.find(lg_BON_LIVRAISON_DETAIL, new TBonLivraisonDetail());
            new logger().OCategory
                    .info("Succes OTBonLivraisonDetail trouve   " + OTBonLivraisonDetail.getLgBONLIVRAISONDETAIL());

        } catch (Exception E) {
            new logger().OCategory.info("Echec OTBonLivraisonDetail non trouve   " + E);
        }

        return OTBonLivraisonDetail;
    }

    public TBonLivraison FindTBonLivraison(String lg_BON_LIVRAISON_ID) {

        TBonLivraison OTBonLivraison = null;

        try {
            OTBonLivraison = (TBonLivraison) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t WHERE (t.lgBONLIVRAISONID = ?1 OR t.strREFLIVRAISON = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_BON_LIVRAISON_ID).setParameter(2, commonparameter.statut_is_Closed)
                    .getSingleResult();
            // OTBonLivraison = (TBonLivraison) this.find(lg_BON_LIVRAISON_ID, new TBonLivraison());
            // new logger().OCategory.info("Succes OTBonLivraison trouve " + OTBonLivraison.getLgBONLIVRAISONID());

        } catch (Exception E) {
            this.buildErrorTraceMessage("Bon de livraison inexistant");
        }

        return OTBonLivraison;

    }

    public TBonLivraison FindTBonLivraison(String lg_BON_LIVRAISON_ID, String str_STATUT) {

        TBonLivraison OTBonLivraison = null;

        try {
            OTBonLivraison = (TBonLivraison) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t WHERE (t.lgBONLIVRAISONID = ?1 OR t.strREFLIVRAISON = ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_BON_LIVRAISON_ID).setParameter(2, str_STATUT).getSingleResult();

        } catch (Exception E) {
            this.buildErrorTraceMessage("Bon de livraison inexistant");
        }

        return OTBonLivraison;

    }

    public TBonLivraison MakeOrderToBonLivraison(String lg_ORDER_ID, String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON,
            int int_MHT, int int_TVA) {
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        TOrder OTOrder;
        orderManagement OorderManagement = new orderManagement(this.getOdataManager(), this.getOTUser());
        List<TOrderDetail> ListTOrderDetail;
        TBonLivraison OTBonLivraison = null;
        TBonLivraisonDetail OTBonLivraisonDetail;
        TFamilleStock OTFamilleStock;

        try {

            OTOrder = this.getOdataManager().getEm().find(TOrder.class, lg_ORDER_ID);
            if (this.isRefBLExistForGrossiste(str_REF_LIVRAISON, OTOrder.getLgGROSSISTEID().getLgGROSSISTEID())) {
                return null;
            }
            if (OTOrder == null) {
                this.buildErrorTraceMessage("Echec de création du bon de livraison. Commande inexistante");
                return null;
            }
            OTBonLivraison = this.CreateBL(OTOrder, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
            ListTOrderDetail = OorderManagement.getTOrderDetail(lg_ORDER_ID, commonparameter.orderIsPassed);
            // Parcours la liste des DetailsSuggestions
            this.getOdataManager().BeginTransaction();
            for (TOrderDetail OListTOrderDetail : ListTOrderDetail) {

                if (OListTOrderDetail.getStrSTATUT().equals(commonparameter.orderIsPassed)) {
                    OTFamilleStock = OtellerManagement.getTProductItemStock(OListTOrderDetail.getLgFAMILLEID());

                    OTBonLivraisonDetail = this.CreateBLDetail(OTBonLivraison,
                            OTBonLivraison.getLgORDERID().getLgGROSSISTEID(), OListTOrderDetail.getLgFAMILLEID(),
                            OListTOrderDetail.getIntQTEREPGROSSISTE(),
                            (OListTOrderDetail.getIntQTEREPGROSSISTE() - OListTOrderDetail.getIntQTEMANQUANT()),
                            OListTOrderDetail.getIntPRICEDETAIL(), "", "", "", OListTOrderDetail.getIntPRICEDETAIL(),
                            OListTOrderDetail.getIntPAFDETAIL(), OListTOrderDetail.getLgFAMILLEID().getIntPAT(),
                            OListTOrderDetail.getLgFAMILLEID().getLgZONEGEOID(),
                            OTFamilleStock.getIntNUMBERAVAILABLE());
                    if (OTBonLivraisonDetail != null) {
                        // OListTOrderDetail.setStrSTATUT(commonparameter.statut_is_Closed);
                        OListTOrderDetail.setStrSTATUT(Parameter.STATUT_ENTREE_STOCK);
                        OListTOrderDetail.setDtUPDATED(new Date());
                        OListTOrderDetail.setIntORERSTATUS((short) 4);
                        this.getOdataManager().getEm().merge(OListTOrderDetail);
                    }

                }

            }
            OTOrder.setStrSTATUT(commonparameter.statut_is_Closed);
            OTOrder.setIntPRICE(OorderManagement.getMontantCommande(OTOrder.getStrREFORDER(), OTOrder.getStrSTATUT()));
            OTOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTOrder);

            // mise a jour du chiffre d'affaire du grossiste
            TGrossiste OTGrossiste = OTOrder.getLgGROSSISTEID();
            OTGrossiste.setDblCHIFFREDAFFAIRE(OTGrossiste.getDblCHIFFREDAFFAIRE() + int_MHT);
            this.getOdataManager().getEm().merge(OTGrossiste);
            // fin mise a jour du chiffre d'affaire du grossiste
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            this.getOdataManager().CloseTransaction();

        } catch (Exception E) {
            E.printStackTrace();
            this.buildErrorTraceMessage("Echec de création du bon de livraison");
        }

        return OTBonLivraison;

    }

    public TBonLivraison CreateBL(TOrder OTOrder, String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON, int int_MHT,
            int int_TVA) {

        TBonLivraison OTBonLivraison = new TBonLivraison();
        // TOrder OTOrder = null;
        int int_HTTC = 0;

        try {

            // OTOrder = getOdataManager().getEm().find(TOrder.class, lg_ORDER_ID);
            if (OTOrder != null) {
                OTBonLivraison.setLgORDERID(OTOrder);
                // new logger().oCategory.info("lg_ORDER_ID Create " + lg_ORDER_ID);
            }

            OTBonLivraison.setLgBONLIVRAISONID(this.getKey().getComplexId());
            OTBonLivraison.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTBonLivraison.setDtDATELIVRAISON(dt_DATE_LIVRAISON);
            OTBonLivraison.setIntMHT(int_MHT);
            OTBonLivraison.setLgUSERID(this.getOTUser());
            OTBonLivraison.setIntTVA(int_TVA);
            OTBonLivraison.setIntHTTC(OTBonLivraison.getIntMHT() + OTBonLivraison.getIntTVA());
            /*
             * if (int_TVA == 0) { int_HTTC = int_MHT; OTBonLivraison.setIntHTTC(int_HTTC); } else { int_HTTC = int_MHT
             * + ((int_MHT * int_TVA) / 100); OTBonLivraison.setIntHTTC(int_HTTC); }
             */

            OTBonLivraison.setStrSTATUT(commonparameter.statut_enable);
            OTBonLivraison.setDtCREATED(new Date());
            this.persiste(OTBonLivraison);

        } catch (Exception E) {
            E.printStackTrace();
        }

        return OTBonLivraison;

    }

    public TBonLivraisonDetail CreateBLDetail(TBonLivraison OTBonLivraison, TGrossiste OTGrossiste, TFamille OTFamille,
            int int_QTE_CMDE, int int_QTE_RECUE, int int_PRIX_REFERENCE, String str_LIVRAISON_ADP,
            String str_MANQUE_FORCES, String str_ETAT_ARTICLE, int int_PRIX_VENTE, int int_PAF, int int_PA_REEL,
            TZoneGeographique OTZoneGeographique, int int_INITSTOCK) {

        try {

            TBonLivraisonDetail OTBonLivraisonDetail = new TBonLivraisonDetail();
            OTBonLivraisonDetail.setLgBONLIVRAISONDETAIL(this.getKey().getComplexId());
            if (OTBonLivraison == null) {
                this.buildErrorTraceMessage("Echec d'ajout de produit. Bon de livraison inexistant");
                return null;
            }
            OTBonLivraisonDetail.setLgBONLIVRAISONID(OTBonLivraison);
            OTBonLivraisonDetail.setLgGROSSISTEID(OTGrossiste);
            OTBonLivraisonDetail.setLgFAMILLEID(OTFamille);
            OTBonLivraisonDetail.setLgZONEGEOID(OTZoneGeographique);
            OTBonLivraisonDetail.setIntQTECMDE(int_QTE_CMDE);
            OTBonLivraisonDetail.setIntQTERECUE(int_QTE_RECUE);
            OTBonLivraisonDetail.setIntPAF(int_PAF);
            OTBonLivraisonDetail.setIntPAREEL(int_PA_REEL);
            OTBonLivraisonDetail.setIntINITSTOCK(int_INITSTOCK);
            OTBonLivraisonDetail.setIntPRIXREFERENCE(int_PRIX_REFERENCE);
            OTBonLivraisonDetail.setIntPRIXVENTE(int_PRIX_VENTE);
            OTBonLivraisonDetail.setStrETATARTICLE(str_ETAT_ARTICLE);
            OTBonLivraisonDetail.setStrLIVRAISONADP(str_LIVRAISON_ADP);
            OTBonLivraisonDetail.setStrMANQUEFORCES(str_MANQUE_FORCES);
            OTBonLivraisonDetail.setIntQTEMANQUANT(OTBonLivraisonDetail.getIntQTECMDE());
            OTBonLivraisonDetail.setDtCREATED(new Date());
            OTBonLivraisonDetail.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().persist(OTBonLivraisonDetail);
            return OTBonLivraisonDetail;
        } catch (Exception E) {
            E.printStackTrace();
            return null;
        }

    }

    public List<TBonLivraison> getAllBL(String search_value, String lg_BON_LIVRAISON_ID, String str_STATUT) {

        List<TBonLivraison> ListTBonLivraison = new ArrayList<>();

        try {
            ListTBonLivraison = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t, TBonLivraisonDetail tb WHERE t.lgBONLIVRAISONID = tb.lgBONLIVRAISONID.lgBONLIVRAISONID AND t.lgBONLIVRAISONID LIKE ?1 AND t.strSTATUT LIKE ?2 AND (t.strREFLIVRAISON LIKE ?3 OR tb.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR tb.lgFAMILLEID.intCIP LIKE ?3 OR tb.lgFAMILLEID.intEAN13 LIKE ?3) GROUP BY tb.lgBONLIVRAISONID.lgBONLIVRAISONID ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_BON_LIVRAISON_ID).setParameter(2, str_STATUT)
                    .setParameter(3, search_value + "%").getResultList();
            // new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        } catch (Exception Ex) {
            Ex.printStackTrace();
        }
        new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        return ListTBonLivraison;

    }

    public List<TBonLivraison> getAllBL(String search_value, String lg_BON_LIVRAISON_ID, String str_STATUT,
            Date dt_BEGIN, Date dt_END) {
        List<TBonLivraison> ListTBonLivraison = new ArrayList<TBonLivraison>();
        try {
            ListTBonLivraison = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t, TBonLivraisonDetail tb WHERE t.lgBONLIVRAISONID = tb.lgBONLIVRAISONID.lgBONLIVRAISONID AND t.lgBONLIVRAISONID LIKE ?1 AND t.strSTATUT LIKE ?2 AND (t.strREFLIVRAISON LIKE ?3 OR tb.lgFAMILLEID.strDESCRIPTION LIKE ?3 OR tb.lgFAMILLEID.intCIP LIKE ?3 OR tb.lgFAMILLEID.intEAN13 LIKE ?3) AND (FUNCTION('DATE',t.dtCREATED) >= ?5 AND FUNCTION('DATE',t.dtCREATED) <= ?6) GROUP BY tb.lgBONLIVRAISONID.lgBONLIVRAISONID ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_BON_LIVRAISON_ID).setParameter(2, str_STATUT)
                    .setParameter(3, search_value + "%").setParameter(5, dt_BEGIN, TemporalType.DATE)
                    .setParameter(6, dt_END, TemporalType.DATE).getResultList();
            // new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        } catch (Exception Ex) {
            Ex.printStackTrace();
        }
        new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        return ListTBonLivraison;

    }

    public List<TBonLivraison> getAllBLOfGrossiste(String lg_GROSSISTE_ID) {

        List<TBonLivraison> ListTBonLivraison = null;

        try {

            ListTBonLivraison = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t WHERE  t.lgORDERID.lgGROSSISTEID.lgGROSSISTEID LIKE ?1 AND (t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?3) ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lg_GROSSISTE_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, commonparameter.statut_is_Closed).getResultList();
            new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        } catch (Exception Ex) {

        }

        return ListTBonLivraison;

    }

    // verification de l'autorisation de l'entrée en stock
    public boolean isEntreeStockIsAuthorize(List<TBonLivraisonDetail> lstTBonLivraisonDetail) {
        boolean result = true;
        try {
            for (TBonLivraisonDetail OTBonLivraisonDetail : lstTBonLivraisonDetail) {
                if ((OTBonLivraisonDetail.getIntQTERECUE() < OTBonLivraisonDetail.getIntQTECMDE())
                        && (OTBonLivraisonDetail.getLgFAMILLEID().getBoolCHECKEXPIRATIONDATE())) {
                    return false;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin verification de l'autorisation de l'entrée en stock

    // entree en stock sans saisie de date de peremption
    public boolean ClosureBonlivraisonSansDatePeremption(String lg_BON_LIVRAISON_ID) {
        boolean result = false;
        List<TBonLivraisonDetail> lstTBonLivraisonDetail = new ArrayList<>();
        String str_TYPE_TRANSACTION = "ALL";
        WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser());
        try {
            lstTBonLivraisonDetail = this.getTBonLivraisonDetailBis("", lg_BON_LIVRAISON_ID, str_TYPE_TRANSACTION,
                    false);
            for (TBonLivraisonDetail OTBonLivraisonDetail : lstTBonLivraisonDetail) {
                OWarehouseManager.AddLot(OTBonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OTBonLivraisonDetail.getIntQTECMDE(),
                        OTBonLivraisonDetail.getLgGROSSISTEID().getLgGROSSISTEID(),
                        OTBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON(), "", "", 0,
                        OTBonLivraisonDetail.getLgFAMILLEID().getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID(),
                        OTBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER(),
                        OTBonLivraisonDetail.getLgBONLIVRAISONDETAIL(), "");
            }
            result = this.closureBonlivraison(lg_BON_LIVRAISON_ID);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin entree en stock sans saisie de date de peremption

    // fonction cloture livraison
    public boolean closureBonlivraison(String lg_BON_LIVRAISON_ID) {
        boolean result = false;
        List<TBonLivraisonDetail> lstTBonLivraisonDetail;
        List<TLot> lst;
        String lg_TYPE_ETIQUETTE_ID = "";
        suggestionManagement OsuggestionManagement = new suggestionManagement(this.getOdataManager(), this.getOTUser());
        // WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser(), new
        // SnapshotManager(this.getOdataManager(), this.getOTUser()));
        familleGrossisteManagement OfamilleGrossisteManagement = new familleGrossisteManagement(this.getOdataManager());
        TParameters OTParameters;
        Date now = new Date();
        TBonLivraison OTBonLivraison;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        StockManager OStockManager = new StockManager(this.getOdataManager(), this.getOTUser());
        SnapshotManager OSnapshotManager = new SnapshotManager(this.getOdataManager(), this.getOTUser());
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        try {
            OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_ACTIVATE_PEREMPTION_DATE);
            if (OTParameters == null) { // replace true apres par la valeur boolean qui reprensente de la fermeture
                // automatique. False = fermeture automatique desactivée
                this.buildErrorTraceMessage(
                        "Paramètre d'autorisation de saisie de produit sans date de péremption inexistant");
                return false;
            }
            OTBonLivraison = this.FindTBonLivraison(lg_BON_LIVRAISON_ID, commonparameter.statut_enable);
            lstTBonLivraisonDetail = this.getTBonLivraisonDetail(OTBonLivraison.getLgBONLIVRAISONID());// modifie le
            // 12/02/2018
            new logger().OCategory.info("lstTBonLivraisonDetail size " + lstTBonLivraisonDetail.size());

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 1) {
                if (!this.isEntreeStockIsAuthorize(lstTBonLivraisonDetail)) {
                    this.buildErrorTraceMessage(
                            "La reception de certains produits n'a pas ete faites. Veuillez verifier vos saisie");
                    if (this.getOdataManager().getEm().getTransaction().isActive()) {
                        this.getOdataManager().getEm().getTransaction().rollback();
                        this.getOdataManager().getEm().clear();

                    }
                    return false;
                }
            }
            // ajout de lot en masse
            // this.getOdataManager().BeginTransaction();
            EntityManager em = this.getOdataManager().getEm();
            em.getTransaction().begin();
            this.bulkAddLot(lstTBonLivraisonDetail, OTBonLivraison, OfamilleGrossisteManagement, OsuggestionManagement,
                    em);
            List<TOrderDetail> list = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TOrderDetail o WHERE o.lgORDERID.lgORDERID=?1 ")
                    .setParameter(1, OTBonLivraison.getLgORDERID().getLgORDERID()).getResultList();
            // updateFamilleGrossisteCodeArticle
            // entree en stock
            lst = this.listTLot(OTBonLivraison.getStrREFLIVRAISON());

            for (TLot OTLot : lst) {
                if (OTLot.getLgTYPEETIQUETTEID() != null) {
                    OTLot.getLgTYPEETIQUETTEID().getLgTYPEETIQUETTEID();
                }
                // 04072020
                this.addStock(null, OfamilleManagement, OStockManager, OSnapshotManager, OtellerManagement,
                        OTLot.getLgFAMILLEID(), OTLot.getIntNUMBER(), OTLot.getLgGROSSISTEID(),
                        OTLot.getStrREFLIVRAISON(), OTLot.getDtSORTIEUSINE(), OTLot.getDtPEREMPTION(),
                        OTLot.getIntNUMBERGRATUIT(), OTLot.getLgTYPEETIQUETTEID(), OTLot.getStrREFORDER(),
                        OTLot.getIntNUMLOT(), OTLot.getIntNUMBERGRATUIT(), em);

                OTLot.setStrSTATUT(commonparameter.statut_is_Closed);
                OTLot.setDtUPDATED(now);
                em.merge(OTLot);

            }

            for (TOrderDetail o : list) {
                o.setIntORERSTATUS((short) 0);
                TFamille of = o.getLgFAMILLEID();

                em.merge(o);
                int status = getStatusInOrder(of.getLgFAMILLEID(), o.getLgORDERDETAILID());
                if (status == 0) {
                    status = this.articleStatusSuggestion(of.getLgFAMILLEID());
                    of.setBCODEINDICATEUR((status == 1 ? (short) 2 : (short) 0));
                } else {
                    of.setBCODEINDICATEUR((short) 1);
                }
                of.setIntORERSTATUS((short) status);

                em.merge(of);
            }
            updateLivraisonDetails(OTBonLivraison, em);
            this.closureOrder(OTBonLivraison.getLgORDERID(), em);
            OTBonLivraison.setStrSTATUT(commonparameter.statut_is_Closed);
            OTBonLivraison.setDtUPDATED(new Date());
            OTBonLivraison.setLgUSERID(this.getOTUser());
            em.merge(OTBonLivraison);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            em.getTransaction().commit();
            em.clear();
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                //
            }
            this.buildErrorTraceMessage("Echec de clôture de la commande");
            new logger().OCategory.info("Echec de clôture de la commande");
        }
        return result;
    }
    // fin fonction cloture livraison

    // liste des lots fonction d une reference de livraison
    public List<TLot> listTLot(String str_REF_LIVRAISON) {
        List<TLot> lst = new ArrayList<>();
        try {
            lst = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TLot t WHERE t.strREFLIVRAISON = ?1 AND t.strSTATUT = ?2  ")
                    .setParameter(1, str_REF_LIVRAISON).setParameter(2, commonparameter.statut_enable).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lst lot size " + lst.size());
        return lst;
    }

    // recuperation du montant d'une livraison
    public TBonLivraison getMontantLivraison(String str_REF) {
        TBonLivraison OTBonLivraison = null;

        try {
            OTBonLivraison = (TBonLivraison) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TBonLivraison t WHERE t.strREFLIVRAISON = ?1").setParameter(1, str_REF)
                    .getSingleResult();
            new logger().OCategory
                    .info("Montant " + OTBonLivraison.getIntHTTC() + " Date " + OTBonLivraison.getDtDATELIVRAISON());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTBonLivraison;
    }
    // fin recuperation du montant d'une livraison

    // prix d'achat total machine d'un bon de livraison
    public int getPrixAchatBonLivraisonMachine(List<TBonLivraisonDetail> lstTBonLivraisonDetail) {
        int result = 0;
        try {
            for (TBonLivraisonDetail OTBonLivraisonDetail : lstTBonLivraisonDetail) {
                result += OTBonLivraisonDetail.getIntPAF() * OTBonLivraisonDetail.getIntQTECMDE();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        // new logger().OCategory.info("result " + result);
        return result;
    }
    // fin prix d'achat total machine d'un bon de livraison

    // liste bon de livraison non affecté a des retours fournisseur
    public List<TBonLivraison> getAllBLForRetourFournisseur(String search_value, String lg_BON_LIVRAISON_ID) {

        List<TBonLivraison> ListTBonLivraison = new ArrayList<TBonLivraison>();
        grossisteManagement OgrossisteManagement = new grossisteManagement(this.getOdataManager());
        orderManagement OorderManagement = new orderManagement(this.getOdataManager(), this.getOTUser());
        TOrder OTOrder = null;
        try {
            /*
             * if ("".equals(search_value) || search_value == null) { search_value = "%%"; }
             *
             * ListTBonLivraison = this.getOdataManager().getEm().
             * createQuery("SELECT t FROM TBonLivraison t, TRetourFournisseur r WHERE r.lgBONLIVRAISONID.lgBONLIVRAISONID != t.lgBONLIVRAISONID AND t.lgBONLIVRAISONID LIKE ?1 AND t.strSTATUT = ?2 AND t.strREFLIVRAISON LIKE ?3 GROUP BY t.lgBONLIVRAISONID ORDER BY t.dtCREATED DESC"
             * ). setParameter(1, lg_BON_LIVRAISON_ID). setParameter(2, commonparameter.statut_is_Closed).
             * setParameter(3, search_value + "%"). getResultList();
             */
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            // String qry = "SELECT * FROM t_bon_livraison t WHERE t.lg_BON_LIVRAISON_ID NOT IN (SELECT
            // r.lg_BON_LIVRAISON_ID FROM t_retour_fournisseur r) AND t.str_REF_LIVRAISON LIKE '" + search_value + "%'
            // AND t.str_STATUT = '" + commonparameter.statut_is_Closed + "' AND t.lg_BON_LIVRAISON_ID LIKE '" +
            // lg_BON_LIVRAISON_ID + "'";
            String qry = "SELECT * FROM t_bon_livraison t WHERE  t.str_REF_LIVRAISON LIKE '" + search_value
                    + "%' AND t.str_STATUT = '" + commonparameter.statut_is_Closed
                    + "' AND t.lg_BON_LIVRAISON_ID LIKE '" + lg_BON_LIVRAISON_ID + "'";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                TBonLivraison OTBonLivraison = new TBonLivraison();
                OTOrder = OorderManagement.getOrderByRef(Ojconnexion.get_resultat().getString("lg_ORDER_ID"));
                OTBonLivraison.setLgBONLIVRAISONID(Ojconnexion.get_resultat().getString("lg_BON_LIVRAISON_ID"));
                OTBonLivraison.setStrREFLIVRAISON(Ojconnexion.get_resultat().getString("str_REF_LIVRAISON"));
                OTBonLivraison.setLgORDERID(OTOrder);
                OTBonLivraison.setIntHTTC(Integer.parseInt(Ojconnexion.get_resultat().getString("int_HTTC")));
                OTBonLivraison.setIntMHT(Integer.parseInt(Ojconnexion.get_resultat().getString("int_MHT")));
                OTBonLivraison.setIntTVA(Integer.parseInt(Ojconnexion.get_resultat().getString("int_TVA")));
                OTBonLivraison.setStrSTATUT(Ojconnexion.get_resultat().getString("str_STATUT"));

                ListTBonLivraison.add(OTBonLivraison);
            }
            Ojconnexion.CloseConnexion();

            new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        } catch (Exception Ex) {
            Ex.printStackTrace();

        }
        // new logger().OCategory.info("ListTBonLivraison " + ListTBonLivraison.size());
        return ListTBonLivraison;

    }

    // fin
    // verifier si une reference de bon de livraison n'existe pas encore pour ce grossiste
    public boolean isRefBLExistForGrossiste(String str_REF_LIVRAISON, String lg_GROSSISTE_ID) {
        boolean result = false;
        try {
            TBonLivraison OTBonLivraison = (TBonLivraison) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t WHERE t.strREFLIVRAISON = ?1 AND t.lgORDERID.lgGROSSISTEID.lgGROSSISTEID = ?2")
                    .setParameter(1, str_REF_LIVRAISON).setParameter(2, lg_GROSSISTE_ID).setMaxResults(1)
                    .getSingleResult();
            if (OTBonLivraison != null) {
                result = true;
                this.buildErrorTraceMessage("Désolé. Cette référence a déjà été utilisé pour ce grossiste");
            }
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return result;
    }
    // fin verifier si une reference de bon de livraison n'existe pas encore pour ce grossiste

    /* supprimere bon de commande */
    public boolean deleteBonLivraison(String lg_BON_LIVRAISON) {
        boolean isDelete = true;
        try {
            TBonLivraison bonLivraison = this.getOdataManager().getEm().find(TBonLivraison.class, lg_BON_LIVRAISON);
            TOrder order = bonLivraison.getLgORDERID();
            if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().begin();
            }
            deleteLots(bonLivraison.getStrREFLIVRAISON());
            deleteDetailsBonlivraison(lg_BON_LIVRAISON);
            deleteBon(bonLivraison);
            updateOrder(order);

            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().commit();
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            }

        } catch (Exception e) {
            isDelete = false;
            this.buildErrorTraceMessage("Désolé. La suppression a échouée");
            e.printStackTrace();
        }
        return isDelete;
    }

    private void deleteLots(String str_REF_LIVRAISON) {

        try {
            List<TLot> lot = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM  TLot o WHERE o.strREFLIVRAISON=?1").setParameter(1, str_REF_LIVRAISON)
                    .getResultList();
            for (TLot Object : lot) {
                this.getOdataManager().getEm().remove(Object);
            }
        } catch (Exception e) {
        }

    }

    private void deleteDetailsBonlivraison(String str_BONLIVRAISON_ID) {

        try {
            EntityManager em = this.getOdataManager().getEm();
            List<TBonLivraisonDetail> lot = em
                    .createQuery("SELECT o FROM  TBonLivraisonDetail o WHERE o.lgBONLIVRAISONID.lgBONLIVRAISONID=?1 ")
                    .setParameter(1, str_BONLIVRAISON_ID).getResultList();

            lot.forEach((Object) -> {
                this.getOdataManager().getEm().remove(Object);
            });
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private void deleteBon(TBonLivraison bonLivraison) {

        try {
            this.getOdataManager().getEm().remove(bonLivraison);
        } catch (Exception e) {
        }

    }

    private void updateOrder(TOrder order) {

        try {
            order.setDtUPDATED(new Date());
            order.setStrSTATUT(commonparameter.statut_is_Process);
            updateOrderDetails(order.getLgORDERID());
            this.getOdataManager().getEm().merge(order);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    private void updateOrderDetails(String lg_ORDER_ID) {
        List<TOrderDetail> details;

        try {
            details = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM  TOrderDetail o WHERE o.lgORDERID.lgORDERID=?1 ")
                    .setParameter(1, lg_ORDER_ID).getResultList();
            for (TOrderDetail detail : details) {
                detail.setDtUPDATED(new Date());
                detail.setStrSTATUT(commonparameter.statut_is_Process);
                this.getOdataManager().getEm().merge(detail);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public List<TLot> getAllLots(String searchValue, String lgLOTID, Date dtStart, Date dtEnd) {
        List<TLot> list = new ArrayList<>();
        try {
            TypedQuery<TLot> q = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TLot o WHERE o.lgLOTID LIKE ?1 AND (o.lgFAMILLEID.strNAME LIKE ?2 OR o.lgFAMILLEID.intCIP LIKE ?2 OR  o.strREFLIVRAISON LIKE ?2 OR o.strREFORDER LIKE ?2 )  AND  FUNCTION('DATE',o.dtUPDATED ) >=?3 AND FUNCTION('DATE',o.dtUPDATED)<=?4   ",
                    TLot.class);
            return q.setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.BYPASS)
                    .setParameter(1, "%" + lgLOTID + "%").setParameter(2, searchValue + "%").setParameter(3, dtStart)
                    .setParameter(4, dtEnd).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public boolean updateLot(String lg_LOT_ID, String int_NUM_LOT, int int_NUMBER, String dt_SORTIE_USINE,
            String dt_PEREMPTION, int int_NUMBER_GRATUIT, String lg_TYPEETIQUETTE_ID) {
        boolean isUpdate = false;
        TTypeetiquette OTTypeetiquette;
        TLot OLot;
        try {

            OTTypeetiquette = this.getOdataManager().getEm().find(TTypeetiquette.class, lg_TYPEETIQUETTE_ID);
            OLot = this.getOdataManager().getEm().find(TLot.class, lg_LOT_ID);

            if (OTTypeetiquette != null) {
                OLot.setLgTYPEETIQUETTEID(OTTypeetiquette);
            }

            OLot.setDtUPDATED(new Date());
            OLot.setDtPEREMPTION(java.sql.Date.valueOf(dt_PEREMPTION));

            OLot.setIntNUMLOT(int_NUM_LOT);

            if (this.merge(OLot)) {
                isUpdate = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return isUpdate;
    }

    // fonction de mise a jour des prix d'un article durant le processus de commande
    private boolean updatePriceArticleByDuringCommand(familleManagement OfamilleManagement,
            SnapshotManager snapshotManager, String lg_FAMILLE_ID, int int_PRICE, int int_PRICE_TIPS, int int_PAF,
            int int_PAT, String action, String str_REF, String step) {
        boolean result = false;
        int int_PAF_OLD = 0, int_PAT_OLD = 0, int_PRICE_OLD = 0, int_PRICE_TIPS_OLD = 0;
        // familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
        try {
            TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, lg_FAMILLE_ID);

            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();
            int_PRICE_TIPS_OLD = OTFamille.getIntPRICETIPS();

            new logger().OCategory.info("step avant:" + step + "-");
            if (step.equalsIgnoreCase(commonparameter.str_ACTION_ENTREESTOCK)) {
                new logger().OCategory.info("step dedans:" + step + "*");
                OTFamille.setIntPAF(int_PAF);
                OTFamille.setIntPAT(int_PAT);
                OTFamille.setIntPRICE(int_PRICE);
                OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
                OTFamille.setDtCREATED(new Date());
                // this.persiste(OTFamille); //a decommenter en cas de probleme
                this.getOdataManager().getEm().persist(OTFamille);
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

            if ((int_PRICE_OLD != int_PRICE) || (int_PAF_OLD != int_PAF) || (int_PAT_OLD != int_PAT)
                    || (int_PRICE_TIPS_OLD != int_PRICE_TIPS)) {
                String Description = "Modification de prix à la commande de " + OTFamille.getStrDESCRIPTION()
                        + " par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".";
                if (int_PRICE_OLD != int_PRICE) {
                    Description += "Prix de vente: " + int_PRICE_OLD + " remplacé par " + int_PRICE + ".";
                    // new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPrice(OTFamille,
                    // commonparameter.code_action_commande, int_PRICE, int_PRICE_OLD, str_REF);
                    snapshotManager.SaveMouvementPrice(OTFamille, commonparameter.code_action_commande, int_PRICE,
                            int_PRICE_OLD, str_REF);

                }
                if (int_PAF_OLD != int_PAF) {
                    Description += "Prix d'achat facture: " + int_PAF_OLD + " remplacé par " + int_PAF + ".";
                }
                if (int_PAT_OLD != int_PAT) {
                    Description += "Prix d'achat tarif: " + int_PAT_OLD + " remplacé par " + int_PAT + ".";
                }
                if (int_PRICE_TIPS_OLD != int_PRICE_TIPS) {
                    Description += "Prix TIP: " + int_PRICE_TIPS_OLD + " remplacé par " + int_PRICE_TIPS + ".";
                }

                OfamilleManagement.sendSMS(Description, "TFamille", action, "N_UPDATE_FAMILLE_PRICE",
                        "Modification de prix à la vente");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        new logger().OCategory.info(this.getDetailmessage());
        return result;
    }
    // fin fonction de mise a jour des prix d'un article durant le processus de commande

    // debut calcul prix moyen pondéré
    public void calculPrixMoyenPondere(TFamille OTFamille, TBonLivraisonDetail OTBonLivraisonDetail, int int_STOCK) {
        double prixMoyenPonderer = 0;
        try {
            prixMoyenPonderer = ((int_STOCK * OTFamille.getIntPAT())
                    + (OTBonLivraisonDetail.getIntQTERECUE() * OTFamille.getIntPAF()))
                    / (int_STOCK + OTBonLivraisonDetail.getIntQTERECUE());
            OTFamille.setDblPRIXMOYENPONDERE(prixMoyenPonderer);
            this.merge(OTFamille);
            new logger().OCategory.info("prixMoyenPonderer " + prixMoyenPonderer);
        } catch (Exception e) {
        }

    }

    public void calculPrixMoyenPondere(TFamille OTFamille, TBonLivraisonDetail OTBonLivraisonDetail, int int_STOCK,
            EntityManager em) {
        double prixMoyenPonderer = 0;
        try {
            prixMoyenPonderer = ((int_STOCK * OTFamille.getIntPAT())
                    + (OTBonLivraisonDetail.getIntQTERECUE() * OTFamille.getIntPAF()))
                    / (int_STOCK + OTBonLivraisonDetail.getIntQTERECUE());
            OTFamille.setDblPRIXMOYENPONDERE(prixMoyenPonderer);
            em.merge(OTFamille);
            new logger().OCategory.info("prixMoyenPonderer " + prixMoyenPonderer);
        } catch (Exception e) {
        }

    }

    // fin calcul prix moyen pondéré
    @Override
    public TBonLivraisonDetail getTBonLivraisonDetailLast(String lg_BON_LIVRAISON_ID, String lg_FAMILLE_ID) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
        // Tools | Templates.
    }

    @Override
    public boolean updateInfoBonlivraison(String lg_ORDER_ID, String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON,
            int int_MHT, int int_TVA) {
        boolean result = false;
        TBonLivraison OTBonLivraison = null;
        try {
            OTBonLivraison = this.getTBonlivraisonByOrder(lg_ORDER_ID);
            if (OTBonLivraison == null) {
                this.buildErrorTraceMessage("Echec de mise à jour. Référence de bon de livraison inexistant");
                return result;
            }
            OTBonLivraison.setStrREFLIVRAISON(str_REF_LIVRAISON);
            OTBonLivraison.setDtDATELIVRAISON(dt_DATE_LIVRAISON);
            OTBonLivraison.setIntMHT(int_MHT);
            OTBonLivraison.setIntTVA(int_TVA);
            OTBonLivraison.setIntHTTC(OTBonLivraison.getIntMHT() + OTBonLivraison.getIntTVA());
            this.persiste(OTBonLivraison);
            this.buildSuccesTraceMessage(
                    "Bon de livraison " + OTBonLivraison.getStrREFLIVRAISON() + " mis à jour avec succès");
            result = true;

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage(
                    "Echec de mise à jour des informations du bon de livraison " + str_REF_LIVRAISON);
        }
        return result;
    }

    @Override
    public TBonLivraison getTBonlivraisonByOrder(String lg_ORDER_ID) {
        TBonLivraison OTBonLivraison = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TBonLivraison t WHERE (t.lgORDERID.lgORDERID = ?1 OR t.lgORDERID.strREFORDER = ?1) AND t.lgORDERID.strSTATUT = ?2")
                    .setParameter(1, lg_ORDER_ID).setParameter(2, commonparameter.statut_is_Closed);
            if (qry.getResultList().size() > 0) {
                OTBonLivraison = (TBonLivraison) qry.getSingleResult();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTBonLivraison;
    }

    public TBonLivraisonDetail createBLDetail(TBonLivraison OTBonLivraison, TGrossiste OTGrossiste, TFamille OTFamille,
            int int_QTE_CMDE, int int_QTE_RECUE, int int_PRIX_REFERENCE, String str_LIVRAISON_ADP,
            String str_MANQUE_FORCES, String str_ETAT_ARTICLE, int int_PRIX_VENTE, int int_PAF, int int_PA_REEL,
            TZoneGeographique OTZoneGeographique, int int_INITSTOCK) {

        try {

            TBonLivraisonDetail OTBonLivraisonDetail = new TBonLivraisonDetail();
            OTBonLivraisonDetail.setLgBONLIVRAISONDETAIL(this.getKey().getComplexId());
            if (OTBonLivraison == null) {
                this.buildErrorTraceMessage("Echec d'ajout de produit. Bon de livraison inexistant");
                return null;
            }
            OTBonLivraisonDetail.setLgBONLIVRAISONID(OTBonLivraison);
            OTBonLivraisonDetail.setLgGROSSISTEID(OTGrossiste);
            OTBonLivraisonDetail.setLgFAMILLEID(OTFamille);
            OTBonLivraisonDetail.setLgZONEGEOID(OTZoneGeographique);
            OTBonLivraisonDetail.setIntQTECMDE(int_QTE_CMDE);
            OTBonLivraisonDetail.setIntQTERECUE(int_QTE_RECUE);
            OTBonLivraisonDetail.setIntPAF(int_PAF);
            OTBonLivraisonDetail.setIntPAREEL(int_PA_REEL);
            OTBonLivraisonDetail.setIntINITSTOCK(int_INITSTOCK);
            OTBonLivraisonDetail.setIntPRIXREFERENCE(int_PRIX_REFERENCE);
            OTBonLivraisonDetail.setIntPRIXVENTE(int_PRIX_VENTE);
            OTBonLivraisonDetail.setStrETATARTICLE(str_ETAT_ARTICLE);
            OTBonLivraisonDetail.setStrLIVRAISONADP(str_LIVRAISON_ADP);
            OTBonLivraisonDetail.setStrMANQUEFORCES(str_MANQUE_FORCES);
            OTBonLivraisonDetail.setIntQTEMANQUANT(OTBonLivraisonDetail.getIntQTECMDE());
            OTBonLivraisonDetail.setDtCREATED(new Date());
            OTBonLivraisonDetail.setStrSTATUT(commonparameter.statut_enable);
            this.getOdataManager().getEm().persist(OTBonLivraisonDetail);
            return OTBonLivraisonDetail;
        } catch (Exception E) {
            E.printStackTrace();
            return null;
        }

    }

    private TFamilleGrossiste findFamilleGrossiste(TFamille famille, TGrossiste grossiste, EntityManager em) {
        TypedQuery<TFamilleGrossiste> query = em.createQuery(
                "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2",
                TFamilleGrossiste.class);
        query.setParameter(1, famille.getLgFAMILLEID()).setParameter(2, grossiste.getLgGROSSISTEID());
        return query.getSingleResult();
    }

    private void updateBonLivraisonAmount(TBonLivraisonDetail detail, int oldPrice, EntityManager em) {
        try {
            TBonLivraison bonLivraison = detail.getLgBONLIVRAISONID();
            bonLivraison
                    .setIntMHT((bonLivraison.getIntMHT() - oldPrice) + (detail.getIntPAF() * detail.getIntQTECMDE()));
            bonLivraison
                    .setIntHTTC((bonLivraison.getIntHTTC() - oldPrice) + (detail.getIntPAF() * detail.getIntQTECMDE()));
            bonLivraison.setDtUPDATED(new Date());
            em.merge(bonLivraison);
        } catch (Exception e) {
        }
    }

    public boolean updatePriceArticleByDuringCommand(TFamille OTFamille, TGrossiste grossiste, int int_PRICE,
            int int_PRICE_TIPS, int int_PAF, int int_PAT, String action, String str_REF, String step,
            EntityManager em) {

        boolean result = false;
        int int_PAF_OLD, int_PAT_OLD = 0, int_PRICE_OLD = 0, int_PRICE_TIPS_OLD = 0;

        try {

            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();
            int_PRICE_TIPS_OLD = OTFamille.getIntPRICETIPS() != null ? OTFamille.getIntPRICETIPS()
                    : OTFamille.getIntPRICE();
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setIntPRICE(int_PRICE);
            OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
            OTFamille.setDtCREATED(new Date());
            em.merge(OTFamille);
            try {
                TFamilleGrossiste familleGrossiste = findFamilleGrossiste(OTFamille, grossiste, em);
                familleGrossiste.setIntPRICE(int_PRICE);
                familleGrossiste.setIntPAF(int_PAF);
                em.merge(familleGrossiste);
            } catch (Exception e) {
            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

            if ((int_PRICE_OLD != int_PRICE) || (int_PAF_OLD != int_PAF) || (int_PAT_OLD != int_PAT)
                    || (int_PRICE_TIPS_OLD != int_PRICE_TIPS)) {
                String Description = "Modification de prix à la commande de " + OTFamille.getStrDESCRIPTION()
                        + " par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".";
                if (int_PRICE_OLD != int_PRICE) {
                    Description += "Prix de vente: " + int_PRICE_OLD + " remplacé par " + int_PRICE + ".";
                    // new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPrice(OTFamille,
                    // commonparameter.code_action_commande, int_PRICE, int_PRICE_OLD, str_REF);
                }
                if (int_PAF_OLD != int_PAF) {
                    Description += "Prix d'achat facture: " + int_PAF_OLD + " remplacé par " + int_PAF + ".";
                }
                if (int_PAT_OLD != int_PAT) {
                    Description += "Prix d'achat tarif: " + int_PAT_OLD + " remplacé par " + int_PAT + ".";
                }
                if (int_PRICE_TIPS_OLD != int_PRICE_TIPS) {
                    Description += "Prix TIP: " + int_PRICE_TIPS_OLD + " remplacé par " + int_PRICE_TIPS + ".";
                }

                // OfamilleManagement.sendSMS(Description, "TFamille", action, "N_UPDATE_FAMILLE_PRICE");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        new logger().OCategory.info(this.getDetailmessage());
        return result;
    }

    public JSONObject changePrice(String lg_BON_LIVRAISON_DETAIL, int int_PRIX_REFERENCE, int int_PRIX_VENTE,
            int int_PAF, int int_PAT, String lg_ZONE_GEO_ID) {
        JSONObject json = new JSONObject();
        dal.TBonLivraisonDetail OTBonLivraisonDetail;
        dal.TZoneGeographique OTZoneGeographique;
        dal.TFamille OTFamille;
        int amountMHT = 0, amountMTTC = 0;
        EntityManager em = this.getOdataManager().getEm();
        try {

            OTBonLivraisonDetail = this.findTBonLivraisonDetail(lg_BON_LIVRAISON_DETAIL);

            if (OTBonLivraisonDetail != null) {

                OTZoneGeographique = em.find(TZoneGeographique.class, lg_ZONE_GEO_ID);
                em.getTransaction().begin();
                int OldPrice = OTBonLivraisonDetail.getIntPAF() * OTBonLivraisonDetail.getIntQTECMDE();
                OTBonLivraisonDetail.setIntPRIXREFERENCE(int_PRIX_REFERENCE);
                OTBonLivraisonDetail.setIntPRIXVENTE(int_PRIX_VENTE);
                OTBonLivraisonDetail.setIntPAF(int_PAF);
                OTBonLivraisonDetail.setIntPAREEL(int_PAT);

                OTFamille = OTBonLivraisonDetail.getLgFAMILLEID();
                if (OTZoneGeographique != null && OTFamille != null) {
                    OTBonLivraisonDetail.setLgZONEGEOID(OTZoneGeographique);
                    /*
                     * OTFamille.setLgZONEGEOID(OTZoneGeographique); this.persiste(OTFamille);
                     */
                }

                em.merge(OTBonLivraisonDetail);
                updateBonLivraisonAmount(OTBonLivraisonDetail, OldPrice, em);
                amountMHT = OTBonLivraisonDetail.getLgBONLIVRAISONID().getIntMHT();
                amountMTTC = OTBonLivraisonDetail.getLgBONLIVRAISONID().getIntHTTC();
                json.put("montantMHT", amountMHT);
                json.put("amountMTTC", amountMTTC);

                updatePriceArticleByDuringCommand(OTFamille,
                        OTBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getLgGROSSISTEID(), int_PRIX_VENTE,
                        int_PRIX_REFERENCE, int_PAF, int_PAT, commonparameter.code_action_commande,
                        OTBonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER(), "", em);
                em.getTransaction().commit();
            }

        } catch (Exception e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
                em.clear();
            }

        }
        return json;
    }

    public boolean checkEntreeStock(String lgFamilleID) {
        boolean isExist = false;
        try {

            TFamille famille = (TFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT o  FROM TFamille o WHERE o.lgFAMILLEID=?1 AND o  IN (SELECT p.lgFAMILLEID FROM TOrder r,TOrderDetail p WHERE p.lgORDERID.lgORDERID=r.lgORDERID AND p.strSTATUT='passed' OR p.strSTATUT='is_Process' )  ")
                    .setParameter(1, lgFamilleID).setMaxResults(1).getSingleResult();

            if (famille != null) {
                isExist = true;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return isExist;
    }

    public int articleStatusSuggestion(String lgFamilleID) {
        int status = 0;

        try {

            long count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o)  FROM TSuggestionOrderDetails o WHERE o.strSTATUT='is_Process' AND o.lgFAMILLEID.lgFAMILLEID =?1 ")
                    .setParameter(1, lgFamilleID).setMaxResults(1).getSingleResult();

            if (count > 0) {
                status = 1;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return status;

    }

    private int getStatusInOrder(String lgFamilleID) {
        int status = 0;
        try {
            long count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(p) FROM TOrder r,TOrderDetail p WHERE p.lgORDERID.lgORDERID=r.lgORDERID AND (p.lgFAMILLEID.intORERSTATUS =?2 OR p.lgFAMILLEID.intORERSTATUS =?3 OR p.lgFAMILLEID.intORERSTATUS=?4 ) AND  p.lgFAMILLEID.lgFAMILLEID =?1  ORDER BY p.lgFAMILLEID.intORERSTATUS DESC")
                    .setParameter(1, lgFamilleID).setParameter(2, (short) 2).setParameter(3, (short) 3)
                    .setParameter(4, (short) 4).setMaxResults(1).getSingleResult();
            if (count > 0) {
                status = new Integer(count + "");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return status;
    }

    private int getStatusInOrder(String lgFamilleID, String orderDetailID) {
        int status = 0;
        try {
            long count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(p) FROM TOrder r,TOrderDetail p WHERE p.lgORDERID.lgORDERID=r.lgORDERID AND (p.lgFAMILLEID.intORERSTATUS=?2 OR p.lgFAMILLEID.intORERSTATUS=?3 OR p.lgFAMILLEID.intORERSTATUS=?4 ) AND  p.lgFAMILLEID.lgFAMILLEID =?1   AND p.lgORDERDETAILID <>?5 ORDER BY p.lgFAMILLEID.intORERSTATUS DESC")
                    .setParameter(1, lgFamilleID).setParameter(2, (short) 2).setParameter(3, (short) 3)
                    .setParameter(4, (short) 4).setParameter(5, orderDetailID).setMaxResults(1).getSingleResult();
            if (count > 0) {
                status = new Integer(count + "");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return status;
    }

    public boolean isAllowed(String id) {
        boolean _isAllowed = false;
        try {
            TPrivilege privilege = getPrivilge(id);
            TUser us = this.getOTUser();
            for (TRoleUser ru : us.getTRoleUserCollection()) {
                TRole role = ru.getLgROLEID();
                for (TRolePrivelege rp : role.getTRolePrivelegeCollection()) {
                    if (privilege.equals(rp.getLgPRIVILEGEID())) {
                        _isAllowed = true;
                        break;
                    }
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return _isAllowed;
    }

    private TPrivilege getPrivilge(String id) {
        TPrivilege privilege = null;// P_BTN_UPDATEBL
        try {
            privilege = (TPrivilege) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TPrivilege o WHERE o.strNAME =?1 ").setParameter(1, id)
                    .getSingleResult();
        } catch (Exception e) {
        }
        return privilege;
    }

    public boolean closureOrder(TOrder OTOrder, EntityManager em) {
        boolean result = false;

        Date now = new Date();
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaUpdate<TOrderDetail> cq = cb.createCriteriaUpdate(TOrderDetail.class);
            Root<TOrderDetail> root = cq.from(TOrderDetail.class);
            Join<TOrderDetail, TOrder> j = root.join("lgORDERID", JoinType.INNER);
            cq.set(root.get(TOrderDetail_.strSTATUT), commonparameter.statut_is_Closed)
                    .set(root.get(TOrderDetail_.dtUPDATED), now);
            cq.where(cb.equal(root.get("lgORDERID").get("lgORDERID"), OTOrder.getLgORDERID()));
            em.createQuery(cq).executeUpdate();
            OTOrder.setStrSTATUT(commonparameter.statut_is_Closed);
            OTOrder.setDtUPDATED(now);
            em.merge(OTOrder);

        } catch (Exception e) {
            e.printStackTrace();

        }
        return result;
    }

    public TLot getLot(String lg_FAMILLE_ID, String lg_LIVRAISON_ID) {
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

    public TLot createTLot(TBonLivraisonDetail bonLivraisonDetail, TFamille OTFamille, int int_NUMBER,
            String str_REF_LIVRAISON, TGrossiste OTGrossiste, String str_REF_ORDER, int int_UG, EntityManager em) {

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
            em.persist(OTLot);
            this.buildSuccesTraceMessage("Lot ajouté avec succès");
            addWarehouse(bonLivraisonDetail, OTFamille, int_NUMBER, OTGrossiste, str_REF_LIVRAISON, new Date(), null, 0,
                    null, str_REF_ORDER, null, em);
        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec d'ajout de lot");
        }
        return OTLot;
    }

    public TBonLivraisonDetail UpdateTBonLivraisonDetailFromBonLivraison(String lg_BON_LIVRAISON_DETAIL,
            int int_QTE_LIVRE, int int_QUANTITE_FREE, EntityManager em) {
        TBonLivraisonDetail OTBonLivraisonDetail = null;
        try {

            OTBonLivraisonDetail = em.find(TBonLivraisonDetail.class, lg_BON_LIVRAISON_DETAIL);
            OTBonLivraisonDetail.setIntQTERECUE(OTBonLivraisonDetail.getIntQTERECUE() + int_QTE_LIVRE);
            OTBonLivraisonDetail
                    .setIntQTEMANQUANT(OTBonLivraisonDetail.getIntQTEMANQUANT() - (int_QTE_LIVRE - int_QUANTITE_FREE));
            OTBonLivraisonDetail.setIntQTEUG(OTBonLivraisonDetail.getIntQTEUG() + int_QUANTITE_FREE);
            OTBonLivraisonDetail.setDtUPDATED(new Date());
            OTBonLivraisonDetail.setStrSTATUT(commonparameter.statut_is_Closed);
            em.merge(OTBonLivraisonDetail);
            return OTBonLivraisonDetail;
        } catch (Exception e) {
            e.printStackTrace();
            return OTBonLivraisonDetail;
        }
    }

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

    public void bulkAddLot(List<TBonLivraisonDetail> lstTBonLivraisonDetail, TBonLivraison OTBonLivraison,
            familleGrossisteManagement OfamilleGrossisteManagement, suggestionManagement OsuggestionManagement,
            EntityManager em) {
        try {

            for (TBonLivraisonDetail OBonLivraisonDetail : lstTBonLivraisonDetail) {

                TLot OTLot = getLot(OBonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID(),
                        OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON());

                if (OTLot == null) {

                    OTLot = this.createTLot(OBonLivraisonDetail, OBonLivraisonDetail.getLgFAMILLEID(),
                            OBonLivraisonDetail.getIntQTECMDE(),
                            OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                            OBonLivraisonDetail.getLgGROSSISTEID(), OTBonLivraison.getLgORDERID().getStrREFORDER(), 0,
                            em);

                    UpdateTBonLivraisonDetailFromBonLivraison(OBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                            OTLot.getIntNUMBER(), OTLot.getIntNUMBERGRATUIT(), em);
                }

                OfamilleGrossisteManagement.updatePriceFamilleGrossiste(
                        OTBonLivraison.getLgORDERID().getLgGROSSISTEID(), OBonLivraisonDetail.getLgFAMILLEID(),
                        OBonLivraisonDetail.getIntPRIXVENTE(), OBonLivraisonDetail.getIntPAF(), em);

                OsuggestionManagement.updatePriceArticleByDuringCommand(OBonLivraisonDetail.getLgFAMILLEID(),
                        OBonLivraisonDetail.getIntPRIXVENTE(), OBonLivraisonDetail.getIntPRIXREFERENCE(),
                        OBonLivraisonDetail.getIntPAF(), OBonLivraisonDetail.getIntPAREEL(),
                        commonparameter.code_action_commande, OTBonLivraison.getLgORDERID().getStrREFORDER(),
                        commonparameter.str_ACTION_ENTREESTOCK);

                this.calculPrixMoyenPondere(OBonLivraisonDetail.getLgFAMILLEID(), OBonLivraisonDetail,
                        OBonLivraisonDetail.getIntINITSTOCK(), em);

            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            // this.getOdataManager().getEm().getTransaction().rollback();
            e.printStackTrace();
        }

    }

    public void updateLivraisonDetails(TBonLivraison bonLivraison, EntityManager em) {

        try {
            TUser tUser = this.getOTUser();

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaUpdate<TBonLivraisonDetail> cq = cb.createCriteriaUpdate(TBonLivraisonDetail.class);
            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            Join<TBonLivraisonDetail, TBonLivraison> j = root.join("lgBONLIVRAISONID", JoinType.INNER);
            cq.set(root.get(TBonLivraisonDetail_.strSTATUT), commonparameter.statut_is_Closed);
            cq.where(
                    cb.equal(root.get("lgBONLIVRAISONID").get("lgBONLIVRAISONID"), bonLivraison.getLgBONLIVRAISONID()));

            em.createQuery(cq).executeUpdate();
            executeStoreEntreeStock(bonLivraison.getLgBONLIVRAISONID(), tUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                    tUser.getLgUSERID(), em);

            // em.close();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();

        }

    }

    private void executeStoreEntreeStock(String lg_BON_LIVRAISON_ID, String LGEMPLACEMENTID, String LGUSERID,
            EntityManager em) {
        try {
            StoredProcedureQuery q = em.createStoredProcedureQuery("proc_update_mouvement_entreestock");

            q.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter(2, String.class, ParameterMode.IN);
            q.registerStoredProcedureParameter(3, String.class, ParameterMode.IN);
            q.setParameter(1, LGEMPLACEMENTID);
            q.setParameter(2, LGUSERID);
            q.setParameter(3, lg_BON_LIVRAISON_ID);
            q.execute();
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    // 12022018
    public boolean addStock(TBonLivraisonDetail bonLivraisonDetail, familleManagement OfamilleManagement,
            StockManager OStockManager, SnapshotManager OSnapshotManager, tellerManagement OtellerManagement,
            TFamille OTFamille, Integer int_NUMBER, TGrossiste OTGrossiste, String str_REF_LIVRAISON,
            Date dt_SORTIE_USINE, Date dt_PEREMPTION, int int_NUMBER_GRATUIT, TTypeetiquette OTTypeetiquette,
            String str_REF_ORDER, String int_NUM_LOT, int ug, EntityManager em) {
        boolean result = false;
        // TTypeStockFamille OTTypeStockFamille;
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
            OTEtiquette = createEtiquetteBis(bonLivraisonDetail, OTWarehouse.getLgTYPEETIQUETTEID(), OTWarehouse,
                    OTFamille, String.valueOf(OTWarehouse.getIntNUMBER()), em);
            OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            em.persist(OTWarehouse);

            // OTTypeStockFamille = getTypeStockFamilleByTypestock("1", OTWarehouse.getLgFAMILLEID(),
            // this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(),em);
            OTFamilleStock = OtellerManagement.geProductItemStock(OTWarehouse.getLgFAMILLEID().getLgFAMILLEID());
            OSnapshotManager.createSnapshotMouvementArticleBons(OTFamille, int_NUMBER,
                    this.getOTUser().getLgEMPLACEMENTID(), OTFamilleStock, em);

            // OTTypeStockFamille.setIntNUMBER(OTTypeStockFamille.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_NUMBER);
            OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
            OTFamilleStock.setIntUG((OTFamilleStock.getIntUG() != null ? (OTFamilleStock.getIntUG() + ug) : 0));
            // em.merge(OTTypeStockFamille);
            em.merge(OTFamilleStock);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    public TTypeStockFamille getTypeStockFamilleByTypestock(String lg_TYPE_STOCK_ID, TFamille lg_FAMILLE_ID,
            String lg_EMPLACEMENT_ID, EntityManager em) {
        TTypeStockFamille OTTypeStockFamille;
        try {

            OTTypeStockFamille = (TTypeStockFamille) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, lg_TYPE_STOCK_ID).setParameter(2, lg_FAMILLE_ID.getLgFAMILLEID())
                    .setParameter(3, lg_EMPLACEMENT_ID).getSingleResult();

        } catch (Exception e) {
            TTypeStock stock = this.getOdataManager().getEm().getReference(TTypeStock.class, lg_TYPE_STOCK_ID);
            OTTypeStockFamille = new TTypeStockFamille(this.getKey().getComplexId(), lg_FAMILLE_ID.getStrNAME(),
                    lg_FAMILLE_ID.getStrNAME());
            OTTypeStockFamille.setDtCREATED(new Date());
            OTTypeStockFamille.setDtUPDATED(new Date());
            OTTypeStockFamille.setLgEMPLACEMENTID(this.getOTUser().getLgEMPLACEMENTID());
            OTTypeStockFamille.setLgFAMILLEID(lg_FAMILLE_ID);
            OTTypeStockFamille.setIntNUMBER(0);
            OTTypeStockFamille.setLgTYPESTOCKID(stock);
            OTTypeStockFamille.setStrSTATUT("enable");
            em.persist(OTTypeStockFamille);
            e.printStackTrace();
        }
        return OTTypeStockFamille;
    }

    public TEtiquette createEtiquette(TWarehouse OTWarehouse, TTypeetiquette OTTypeetiquette, String str_CODE,
            String str_NAME, TFamille OTFamille, String int_NUMBER, EntityManager em) {
        TEtiquette OTEtiquette = null;
        try {
            OTEtiquette = new TEtiquette();
            OTEtiquette.setLgETIQUETTEID(this.getKey().getComplexId());
            OTEtiquette.setStrCODE(str_CODE);
            OTEtiquette.setStrNAME(str_NAME);
            OTEtiquette.setDtPEROMPTION(OTWarehouse.getDtPEREMPTION());
            OTEtiquette.setLgFAMILLEID(OTFamille);
            OTEtiquette.setStrSTATUT(commonparameter.statut_enable);
            OTEtiquette.setDtCREATED(new Date());
            OTEtiquette.setIntNUMBER(int_NUMBER);
            OTEtiquette.setLgTYPEETIQUETTEID(OTTypeetiquette);
            OTEtiquette.setLgEMPLACEMENTID(this.getOTUser().getLgEMPLACEMENTID());
            em.persist(OTEtiquette);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
        }
        return OTEtiquette;
    }

    public TEtiquette createEtiquetteBis(TBonLivraisonDetail bonLivraisonDetail, TTypeetiquette OTTypeetiquette,
            TWarehouse OTWarehouse, TFamille OFamille, String int_NUMBER, EntityManager em) {
        TEtiquette OTEtiquette = null;
        String result = "";
        try {
            String str_NAME_TYPE_ETIQUETTE = OTTypeetiquette.getStrNAME();
            if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP")) {
                result = OFamille.getIntCIP();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP_PRIX")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-"
                        + bonLivraisonDetail.getIntPRIXVENTE();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP_DESIGNATION")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-" + OFamille.getStrNAME();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("CIP_PRIX_DESIGNATION")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-"
                        + bonLivraisonDetail.getIntPRIXVENTE() + "-" + OFamille.getStrNAME();
            } else if (str_NAME_TYPE_ETIQUETTE.equalsIgnoreCase("POSITION")) {
                result = this.getKey().getShortId(4) + "-" + OFamille.getLgZONEGEOID().getStrLIBELLEE();
            } else {
                result = this.getKey().getShortId(4) + "-" + OFamille.getIntCIP() + "-"
                        + bonLivraisonDetail.getIntPRIXVENTE() + "-" + OFamille.getStrNAME();
            }
            OTEtiquette = this.createEtiquette(OTWarehouse, OTTypeetiquette, result, str_NAME_TYPE_ETIQUETTE, OFamille,
                    int_NUMBER, em);

        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info("Dans le catch");
        }
        return OTEtiquette;
    }

    public boolean closurerBonlivraison(String lg_BON_LIVRAISON_ID) {
        boolean result = false;
        boolean avecPeremption = false;
        TParameters OTParameters;
        TBonLivraison OTBonLivraison;
        tellerManagement OtellerManagement = new tellerManagement(this.getOdataManager(), this.getOTUser());
        try {
            OTParameters = new TparameterManager(this.getOdataManager())
                    .getParameter(Parameter.KEY_ACTIVATE_PEREMPTION_DATE);
            if (OTParameters == null) {
                this.buildErrorTraceMessage(
                        "Paramètre d'autorisation de saisie de produit sans date de péremption inexistant");
                return false;
            }
            OTBonLivraison = this.FindTBonLivraison(lg_BON_LIVRAISON_ID, commonparameter.statut_enable);

            if (Integer.valueOf(OTParameters.getStrVALUE()) == 1) {
                avecPeremption = true;

            }
            List<TBonLivraisonDetail> lstTBonLivraisonDetail = this
                    .getTBonLivraisonDetail(OTBonLivraison.getLgBONLIVRAISONID());
            EntityManager em = this.getOdataManager().getEm();
            em.getTransaction().begin();

            for (TBonLivraisonDetail bn : lstTBonLivraisonDetail) {
                TFamille OFamille = bn.getLgFAMILLEID();
                List<Object[]> lst = this.listLot(OTBonLivraison.getStrREFLIVRAISON(), em, OFamille.getLgFAMILLEID());
                if (lst.isEmpty()) {
                    this.createTLot(bn, OFamille, bn.getIntQTECMDE(), OTBonLivraison.getStrREFLIVRAISON(),
                            bn.getLgGROSSISTEID(), OTBonLivraison.getLgORDERID().getStrREFORDER(), 0, em);
                    addToStock(bn.getIntQTECMDE(), 0, em, OtellerManagement, OFamille);
                    bn.setIntQTERECUE(bn.getIntQTECMDE());
                    bn.setIntQTEMANQUANT(0);
                    bn.setIntQTEUG(0);
                } else {
                    for (Object[] item : lst) {
                        Integer cmde = Integer.valueOf(item[0] + ""), qu = Integer.valueOf(item[1] + "");

                        if (cmde < bn.getIntQTECMDE()) {
                            this.buildErrorTraceMessage(
                                    "La reception de certains produits n'a pas ete faite. Veuillez verifier vos saisie");
                            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                                this.getOdataManager().getEm().getTransaction().rollback();
                                this.getOdataManager().getEm().clear();
                                //
                            }
                            return false;
                            // break;
                        }
                        cmde = (cmde > (bn.getIntQTECMDE() + bn.getIntQTEUG()) ? (bn.getIntQTECMDE() + bn.getIntQTEUG())
                                : cmde);// a voir
                        addToStock(cmde, qu, em, OtellerManagement, OFamille);

                    }
                }

                bn.setStrSTATUT(commonparameter.statut_is_Closed);
                bn.setDtUPDATED(new Date());
                em.merge(bn);

            }

            // }
            this.closureOrder(OTBonLivraison.getLgORDERID(), em);
            OTBonLivraison.setStrSTATUT(commonparameter.statut_is_Closed);
            OTBonLivraison.setDtUPDATED(new Date());
            OTBonLivraison.setLgUSERID(this.getOTUser());
            em.merge(OTBonLivraison);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            em.getTransaction().commit();
            em.clear();
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                //
            }
            this.buildErrorTraceMessage("Echec de clôture de la commande");
            new logger().OCategory.info("Echec de clôture de la commande");
        }
        return result;
    }

    public boolean addWarehouse(TBonLivraisonDetail bonLivraisonDetail, TFamille OTFamille, Integer int_NUMBER,
            TGrossiste OTGrossiste, String str_REF_LIVRAISON, Date dt_SORTIE_USINE, Date dt_PEREMPTION,
            int int_NUMBER_GRATUIT, TTypeetiquette OTTypeetiquette, String str_REF_ORDER, String int_NUM_LOT,
            EntityManager em) {
        boolean result = false;
        // TTypeStockFamille OTTypeStockFamille;

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
            OTEtiquette = createEtiquetteBis(bonLivraisonDetail, OTWarehouse.getLgTYPEETIQUETTEID(), OTWarehouse,
                    OTFamille, String.valueOf(OTWarehouse.getIntNUMBER()), em);
            OTWarehouse.setStrCODEETIQUETTE(OTEtiquette.getStrCODE());
            em.persist(OTWarehouse);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
        }

        return result;
    }

    private void addToStock(Integer int_NUMBER, int ug, EntityManager em, tellerManagement OtellerManagement,
            TFamille OTFamille) {
        TFamilleStock OTFamilleStock = OtellerManagement.geProductItemStock(OTFamille.getLgFAMILLEID());
        createSnapshotMouvementArticleBons(OTFamille, int_NUMBER, this.getOTUser().getLgEMPLACEMENTID(), OTFamilleStock,
                em);
        OTFamilleStock.setIntNUMBER(OTFamilleStock.getIntNUMBER() + int_NUMBER);
        OTFamilleStock.setIntNUMBERAVAILABLE(OTFamilleStock.getIntNUMBERAVAILABLE() + int_NUMBER);
        OTFamilleStock.setIntUG((OTFamilleStock.getIntUG() != null ? (OTFamilleStock.getIntUG() + ug) : 0));
        em.merge(OTFamilleStock);
    }

    public List<Object[]> listLot(String str_REF_LIVRAISON, EntityManager em, String idArticle) {
        List<Object[]> lst = new ArrayList<>();
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TLot> root = cq.from(TLot.class);
            cq.multiselect(cb.sum(root.get(TLot_.intNUMBER)), cb.sum(root.get(TLot_.intNUMBERGRATUIT)),
                    root.get("lgFAMILLEID").get("lgFAMILLEID")).groupBy(root.get("lgFAMILLEID").get("lgFAMILLEID"));
            cq.where(cb.and(cb.equal(root.get(TLot_.strREFLIVRAISON), str_REF_LIVRAISON),
                    cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), idArticle)));
            Query q = em.createQuery(cq);
            lst = q.getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lst lot size " + lst.size());
        return lst;
    }

    public TBonLivraisonDetail getLivraisonDetails(TBonLivraison bonLivraison, EntityManager em, TFamille famille) {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<TBonLivraisonDetail> cq = cb.createQuery(TBonLivraisonDetail.class);
        Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
        Join<TBonLivraisonDetail, TBonLivraison> j = root.join("lgBONLIVRAISONID", JoinType.INNER);
        cq.where(cb.and(cb.equal(j.get(TBonLivraison_.lgBONLIVRAISONID), bonLivraison.getLgBONLIVRAISONID()),
                cb.equal(root.get(TBonLivraisonDetail_.lgFAMILLEID), famille)));
        TypedQuery<TBonLivraisonDetail> q = em.createQuery(cq);

        return q.getSingleResult();
    }

    public TMouvementSnapshot createSnapshotMouvementArticleBons(TFamille OTFamille, int int_NUMBER,
            TEmplacement OTEmplacement, TFamilleStock stock, EntityManager em) {

        TMouvementSnapshot OTMouvementSnapshot = null;
        TMouvement oMouvement = null;
        try {
            OTMouvementSnapshot = this.getTMouvementSnapshotForCurrentDay(OTFamille.getLgFAMILLEID(), OTEmplacement,
                    em);
            if (OTMouvementSnapshot == null) {
                OTMouvementSnapshot = createSnapshotMouvement(OTFamille, stock.getIntNUMBERAVAILABLE() + int_NUMBER,
                        stock.getIntNUMBERAVAILABLE(), OTEmplacement, em);
                createMouvement(OTFamille, int_NUMBER, OTEmplacement, em);
            } else {

                OTMouvementSnapshot.setIntSTOCKJOUR(stock.getIntNUMBERAVAILABLE() + int_NUMBER);
                OTMouvementSnapshot.setIntNUMBERTRANSACTION(OTMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
                OTMouvementSnapshot.setDtUPDATED(new Date());
                em.merge(OTMouvementSnapshot);
                try {
                    oMouvement = this.findMouvement(OTFamille, OTEmplacement, em);
                } catch (Exception e) {
                }
                if (oMouvement == null) {
                    createMouvement(OTFamille, int_NUMBER, OTEmplacement, em);
                } else {
                    oMouvement.setIntNUMBER(oMouvement.getIntNUMBER() + int_NUMBER);
                    oMouvement.setIntNUMBERTRANSACTION(oMouvement.getIntNUMBERTRANSACTION() + 1);
                    oMouvement.setDtUPDATED(new Date());
                    em.merge(oMouvement);
                }

            }

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
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(1);
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

    public TMouvement createMouvement(TFamille OTFamille, int int_NUMBER, TEmplacement OTEmplacement,
            EntityManager em) {
        TMouvement OTMouvementSnapshot = null;
        Date d = new Date();
        try {

            OTMouvementSnapshot = new TMouvement();
            OTMouvementSnapshot.setLgMOUVEMENTID(this.getKey().getComplexId());
            OTMouvementSnapshot.setLgFAMILLEID(OTFamille);
            OTMouvementSnapshot.setDtDAY(d);
            OTMouvementSnapshot.setDtCREATED(d);
            OTMouvementSnapshot.setPKey("");
            OTMouvementSnapshot.setStrACTION("ENTREESTOCK");
            OTMouvementSnapshot.setStrTYPEACTION("ADD");
            OTMouvementSnapshot.setIntNUMBER(int_NUMBER);
            OTMouvementSnapshot.setStrSTATUT(commonparameter.statut_enable);
            OTMouvementSnapshot.setIntNUMBERTRANSACTION(1);
            OTMouvementSnapshot.setLgUSERID(this.getOTUser());
            OTMouvementSnapshot.setLgEMPLACEMENTID(OTEmplacement);
            em.persist(OTMouvementSnapshot);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible de creer le snap TMouvementSnapshot  ", e.getMessage());
        }
        return OTMouvementSnapshot;
    }

    public TMouvement findMouvement(TFamille OTFamille, TEmplacement OTEmplacement, EntityManager em) {
        TypedQuery<TMouvement> query = em.createQuery(
                "SELECT t FROM TMouvement t WHERE  FUNCTION('DATE',t.dtDAY) = FUNCTION('DATE', ?1)   AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3 AND t.strACTION='ENTREESTOCK' AND t.strTYPEACTION='ADD'   ",
                TMouvement.class);
        query.setParameter(1, java.sql.Date.valueOf(LocalDate.now()), TemporalType.DATE);
        query.setParameter(2, OTFamille.getLgFAMILLEID());
        query.setParameter(3, OTEmplacement.getLgEMPLACEMENTID());
        return query.getSingleResult();
    }

    public void batchAddLot(List<TBonLivraisonDetail> lstTBonLivraisonDetail, TBonLivraison OTBonLivraison,
            familleGrossisteManagement OfamilleGrossisteManagement, suggestionManagement OsuggestionManagement,
            EntityManager em, tellerManagement OtellerManagement) {
        try {
            TOrder order = OTBonLivraison.getLgORDERID();
            TGrossiste grossiste = order.getLgGROSSISTEID();
            for (TBonLivraisonDetail OBonLivraisonDetail : lstTBonLivraisonDetail) {
                addToStock(OBonLivraisonDetail.getIntQTECMDE(), 0, em, OtellerManagement,
                        OBonLivraisonDetail.getLgFAMILLEID());
                addWarehouse(OBonLivraisonDetail, OBonLivraisonDetail.getLgFAMILLEID(),
                        OBonLivraisonDetail.getIntQTECMDE(), grossiste, OTBonLivraison.getStrREFLIVRAISON(), new Date(),
                        null, 0, null, order.getStrREFORDER(), null, em);
                TLot OTLot = this.createTLot(OBonLivraisonDetail, OBonLivraisonDetail.getLgFAMILLEID(),
                        OBonLivraisonDetail.getIntQTECMDE(),
                        OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                        OBonLivraisonDetail.getLgGROSSISTEID(), OTBonLivraison.getLgORDERID().getStrREFORDER(), 0, em);

                UpdateTBonLivraisonDetailFromBonLivraison(OBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                        OTLot.getIntNUMBER(), OTLot.getIntNUMBERGRATUIT(), em);

                OfamilleGrossisteManagement.updatePriceFamilleGrossiste(
                        OTBonLivraison.getLgORDERID().getLgGROSSISTEID(), OBonLivraisonDetail.getLgFAMILLEID(),
                        OBonLivraisonDetail.getIntPRIXVENTE(), OBonLivraisonDetail.getIntPAF(), em);

                OsuggestionManagement.updatePriceArticleByDuringCommand(OBonLivraisonDetail.getLgFAMILLEID(),
                        OBonLivraisonDetail.getIntPRIXVENTE(), OBonLivraisonDetail.getIntPRIXREFERENCE(),
                        OBonLivraisonDetail.getIntPAF(), OBonLivraisonDetail.getIntPAREEL(),
                        commonparameter.code_action_commande, OTBonLivraison.getLgORDERID().getStrREFORDER(),
                        commonparameter.str_ACTION_ENTREESTOCK);

                this.calculPrixMoyenPondere(OBonLivraisonDetail.getLgFAMILLEID(), OBonLivraisonDetail,
                        OBonLivraisonDetail.getIntINITSTOCK(), em);

            }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public void batchUpdate(TBonLivraisonDetail OBonLivraisonDetail, TBonLivraison OTBonLivraison,
            familleGrossisteManagement OfamilleGrossisteManagement, suggestionManagement OsuggestionManagement,
            EntityManager em, tellerManagement OtellerManagement) {
        try {

            addToStock(OBonLivraisonDetail.getIntQTECMDE(), 0, em, OtellerManagement,
                    OBonLivraisonDetail.getLgFAMILLEID());

            TLot OTLot = this.createTLot(OBonLivraisonDetail, OBonLivraisonDetail.getLgFAMILLEID(),
                    OBonLivraisonDetail.getIntQTECMDE(), OBonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                    OBonLivraisonDetail.getLgGROSSISTEID(), OTBonLivraison.getLgORDERID().getStrREFORDER(), 0, em);

            UpdateTBonLivraisonDetailFromBonLivraison(OBonLivraisonDetail.getLgBONLIVRAISONDETAIL(),
                    OTLot.getIntNUMBER(), OTLot.getIntNUMBERGRATUIT(), em);

            OfamilleGrossisteManagement.updatePriceFamilleGrossiste(OTBonLivraison.getLgORDERID().getLgGROSSISTEID(),
                    OBonLivraisonDetail.getLgFAMILLEID(), OBonLivraisonDetail.getIntPRIXVENTE(),
                    OBonLivraisonDetail.getIntPAF(), em);

            OsuggestionManagement.updatePriceArticleByDuringCommand(OBonLivraisonDetail.getLgFAMILLEID(),
                    OBonLivraisonDetail.getIntPRIXVENTE(), OBonLivraisonDetail.getIntPRIXREFERENCE(),
                    OBonLivraisonDetail.getIntPAF(), OBonLivraisonDetail.getIntPAREEL(),
                    commonparameter.code_action_commande, OTBonLivraison.getLgORDERID().getStrREFORDER(),
                    commonparameter.str_ACTION_ENTREESTOCK);

            this.calculPrixMoyenPondere(OBonLivraisonDetail.getLgFAMILLEID(), OBonLivraisonDetail,
                    OBonLivraisonDetail.getIntINITSTOCK(), em);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
        }

    }
}
