package bll.commandeManagement;

import bll.bllBase;
import bll.configManagement.familleGrossisteManagement;
import bll.configManagement.familleManagement;
import bll.configManagement.grossisteManagement;
import bll.entity.EntityData;
import bll.gateway.outService.ServicesUpdatePriceFamille;
import bll.preenregistrement.Preenregistrement;
import bll.teller.SnapshotManager;
import bll.warehouse.WarehouseManager;
import dal.TAlertEventUserFone;
import dal.TEventLog;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TRuptureHistory;
import dal.TSuggestionOrder;
import dal.TSuggestionOrderDetails;
import dal.TUser;
import dal.dataManager;
import dal.enumeration.TypeLog;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.StringUtils;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class suggestionManagement extends bllBase {

    Object OtableTOrder = dal.TOrder.class;
    orderManagement OorderManagement = new orderManagement(getOdataManager(), getOTUser());
    WarehouseManager OWarehouseManager = new WarehouseManager(getOdataManager(), getOTUser());
    private familleGrossisteManagement OfamilleGrossisteManagement;

    public familleGrossisteManagement getOfamilleGrossisteManagement() {
        return this.OfamilleGrossisteManagement;
    }

    public void setOfamilleGrossisteManagement(familleGrossisteManagement OfamilleGrossisteManagement) {
        this.OfamilleGrossisteManagement = OfamilleGrossisteManagement;
    }

    public suggestionManagement(dataManager OdataManager, TUser OTUser) {
        this.setOTUser(OTUser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
        OfamilleGrossisteManagement = new familleGrossisteManagement(OdataManager);
    }

    public suggestionManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public List<TFamilleStock> getAllFamilleStock() {

        List<TFamilleStock> listTFamilleStock = null;

        try {

            listTFamilleStock = this.getOdataManager().getEm().createQuery("SELECT t FROM TFamilleStock t")
                    .getResultList();

            new logger().OCategory.info("listTFamilleStock Total  " + listTFamilleStock.size());

        } catch (Exception E) {

            new logger().OCategory.info("listTFamilleStock VIDE  ");

        }

        return listTFamilleStock;
    }

    public void changeSuggestionStatut(String lg_SUGGESTION_ORDER_ID, String STATUT_DEBUT, String STATUT_FIN) {

        dal.TSuggestionOrder OTSuggestionOrder = null;
        List<TSuggestionOrderDetails> lstTTSuggestionOrderDetails = null;
        try {

            lstTTSuggestionOrderDetails = OWarehouseManager.getTSuggestionOrderDetails(lg_SUGGESTION_ORDER_ID,
                    STATUT_DEBUT);

            for (TSuggestionOrderDetails OlstTTSuggestionOrderDetails : lstTTSuggestionOrderDetails) {

                OlstTTSuggestionOrderDetails.setStrSTATUT(STATUT_FIN);
                if (persiste(OlstTTSuggestionOrderDetails)) {

                    OTSuggestionOrder = OWarehouseManager.FindTSuggestionOrder(lg_SUGGESTION_ORDER_ID);
                    OTSuggestionOrder.setStrSTATUT(STATUT_FIN);
                    OTSuggestionOrder.setDtUPDATED(new Date());
                    this.persiste(OTSuggestionOrder);

                }
            }

        } catch (Exception E) {

        }

    }

    public String SuggestionAuto(String lg_GROSSISTE_ID) {

        int int_SEUIL_MINI = 0, int_QTE_STOCK = 0, int_QTE_A_SUGGERE = 0;
        String lg_SUGGESTION_ORDER_ID = "";
        TSuggestionOrder OTSuggestionOrder = null;
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;

        try {

            List<TFamilleStock> listTFamilleStock = this.getAllFamilleStock();
            TGrossiste OTGrossiste = (TGrossiste) this.find(lg_GROSSISTE_ID, new TGrossiste());

            new logger().OCategory.info("listTFamilleStock Total  " + listTFamilleStock.size());

            if (!listTFamilleStock.isEmpty() && OTGrossiste != null) {

                // creation de la suggestion
                OTSuggestionOrder = OorderManagement.createTSuggestionOrder(lg_GROSSISTE_ID,
                        commonparameter.statut_is_Auto);

                for (TFamilleStock listTFamilleStock1 : listTFamilleStock) {

                    int_QTE_STOCK = listTFamilleStock1.getIntNUMBERAVAILABLE();
                    int_SEUIL_MINI = listTFamilleStock1.getLgFAMILLEID().getIntSEUILMIN();

                    new logger().OCategory.info("int_SEUIL_MINI   " + int_SEUIL_MINI);
                    new logger().OCategory.info("int_QTE_STOCK   " + int_QTE_STOCK);

                    if (int_QTE_STOCK < 0) {
                        int_QTE_A_SUGGERE = int_SEUIL_MINI - int_QTE_STOCK;
                    } else {
                        int_QTE_A_SUGGERE = int_SEUIL_MINI + int_QTE_STOCK;
                    }

                    new logger().OCategory.info("int_QTE_A_SUGGERE   " + int_QTE_A_SUGGERE);

                    if (int_QTE_STOCK < int_SEUIL_MINI || int_QTE_STOCK == int_SEUIL_MINI) {

                        OTSuggestionOrderDetails = this.AddToTSuggestionOrderDetails(
                                listTFamilleStock1.getLgFAMILLEID(), OTGrossiste, OTSuggestionOrder, int_QTE_A_SUGGERE,
                                commonparameter.statut_is_Auto);

                        new logger().OCategory.info("OTSuggestionOrderDetails   "
                                + OTSuggestionOrderDetails.getLgSUGGESTIONORDERDETAILSID());

                    }

                }

                lg_SUGGESTION_ORDER_ID = OTSuggestionOrder.getLgSUGGESTIONORDERID();

            }

            return lg_SUGGESTION_ORDER_ID;

        } catch (Exception E) {
            return lg_SUGGESTION_ORDER_ID;
        }

    }

    public void suggestionWorkflow() {

        // <editor-fold defaultstate="collapsed" desc="suggestionWorkflow - ">
        // </editor-fold>
    }

    // public int calcQteReappro(TFamille OTFamille) { //ancien bon code. A decommenter en cas de probleme
    //
    // int QTE_REAPPRO = 1;
    // familleManagement OfamilleManagement = new familleManagement(getOdataManager(), getOTUser());
    //
    // try {
    //
    // if (OTFamille.getLgCODEGESTIONID() != null &&
    // (!OTFamille.getLgCODEGESTIONID().getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equals("0"))) {
    //
    // QTE_REAPPRO = OfamilleManagement.getQuantityReapportByCodeGestionArticle(OTFamille);
    // new logger().OCategory.info("Code gestion - QTE_REAPPRO " + QTE_REAPPRO);
    //
    // } else if (OTFamille.getIntQTEREAPPROVISIONNEMENT() != null) {
    //
    // QTE_REAPPRO = OTFamille.getIntQTEREAPPROVISIONNEMENT();
    // new logger().OCategory.info("TFamille - QTE_REAPPRO " + QTE_REAPPRO);
    //
    // } else {
    // return QTE_REAPPRO;
    // }
    //
    // } catch (Exception e) {
    //
    // }
    //
    // new logger().OCategory.info("Return - QTE_REAPPRO " + QTE_REAPPRO);
    // return QTE_REAPPRO;
    // // </editor-fold>
    // }
    public int calcQteReappro(TFamilleStock OTFamilleStock) {

        int QTE_REAPPRO = 1;
        familleManagement OfamilleManagement = new familleManagement(getOdataManager(), getOTUser());

        try {
            if (OTFamilleStock.getLgFAMILLEID().getLgCODEGESTIONID() != null && (!OTFamilleStock.getLgFAMILLEID()
                    .getLgCODEGESTIONID().getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equals("0"))) {
                QTE_REAPPRO = OfamilleManagement.getQuantityReapportByCodeGestionArticle(OTFamilleStock);
                new logger().OCategory.info("Code gestion - QTE_REAPPRO  " + QTE_REAPPRO);
            } else if (OTFamilleStock.getLgFAMILLEID().getIntQTEREAPPROVISIONNEMENT() != null
                    && OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() != null) {

                if (OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() >= OTFamilleStock.getIntNUMBERAVAILABLE()) {
                    QTE_REAPPRO = (OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN()
                            - OTFamilleStock.getIntNUMBERAVAILABLE())
                            + OTFamilleStock.getLgFAMILLEID().getIntQTEREAPPROVISIONNEMENT();
                    new logger().OCategory.info("TFamille - QTE_REAPPRO  " + QTE_REAPPRO);
                }

            } else {
                return QTE_REAPPRO;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        new logger().OCategory.info("Return - QTE_REAPPRO  " + QTE_REAPPRO
                + " OTFamilleStock -------------------->>> qty " + OTFamilleStock.getIntNUMBERAVAILABLE());
        return QTE_REAPPRO;

    }

    public void makeSuggestionAuto(TFamilleStock OTFamilleStock) {

        TSuggestionOrder OTSuggestionOrder;
        int int_QTE_A_SUGGERE = 0;
        try {

            if (OTFamilleStock != null && OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() != null
                    && OTFamilleStock.getLgFAMILLEID().getBoolDECONDITIONNE() == 0) {
                new logger().OCategory.info("Stock actu " + OTFamilleStock.getIntNUMBERAVAILABLE() + " Seuil mini "
                        + OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN() + " Seuil de reappro "
                        + OTFamilleStock.getLgFAMILLEID().getIntQTEREAPPROVISIONNEMENT());
                if (OTFamilleStock.getIntNUMBERAVAILABLE() <= OTFamilleStock.getLgFAMILLEID().getIntSEUILMIN()) {

                    int_QTE_A_SUGGERE = this.calcQteReappro(OTFamilleStock);

                    if (int_QTE_A_SUGGERE > 0) {
                        OTSuggestionOrder = this.checkSuggestionGrossiteExiste(
                                OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getLgGROSSISTEID());

                        if (OTSuggestionOrder != null) {

                            this.CreateTSuggestionOrderDetails(OTSuggestionOrder, OTFamilleStock.getLgFAMILLEID(),
                                    OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID(), int_QTE_A_SUGGERE,
                                    commonparameter.str_ACTION_VENTE);
                        } else {
                            this.AddToTSuggestionOrderDetails(OTFamilleStock.getLgFAMILLEID(),
                                    OTFamilleStock.getLgFAMILLEID().getLgGROSSISTEID(), OTSuggestionOrder,
                                    int_QTE_A_SUGGERE, commonparameter.statut_is_Auto);
                        }
                    }

                } else {
                    new logger().OCategory.info("Le seuil n'est pas atteint ");
                }

            } else {

                new logger().OCategory.info("OTFamille  est null ");

            }

        } catch (Exception E) {
            E.printStackTrace();
            new logger().OCategory.info("ECHEC ");

        }
        new logger().OCategory.info("Quantite total suggérée " + int_QTE_A_SUGGERE);

    }

    public TSuggestionOrderDetails findFamilleInTSuggestionOrderDetails(String lg_SUGGESTION_ORDER_ID,
            String lg_famille_id) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID LIKE ?2 ")
                    .setParameter(2, lg_SUGGESTION_ORDER_ID).setParameter(1, lg_famille_id);
            if (qry.getResultList().size() > 0) {
                OTSuggestionOrderDetails = (TSuggestionOrderDetails) qry.getSingleResult();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSuggestionOrderDetails;
    }

    public TSuggestionOrderDetails CreateTSuggestionOrderDetails(TSuggestionOrder OTSuggestionOrder, TFamille OTFamille,
            TGrossiste OTGrossiste, int int_NUMBER, String step) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        Date now = new Date();
        try {

            OTSuggestionOrderDetails = this.findFamilleInTSuggestionOrderDetails(
                    OTSuggestionOrder.getLgSUGGESTIONORDERID(), OTFamille.getLgFAMILLEID());
            if (OTSuggestionOrderDetails == null) {
                OTSuggestionOrderDetails = this.initTSuggestionOrderDetail(OTSuggestionOrder, OTFamille, OTGrossiste, 0,
                        commonparameter.statut_is_Process);
            }
            OTSuggestionOrderDetails
                    .setIntNUMBER(OTSuggestionOrder.getStrSTATUT().equals(commonparameter.statut_is_Auto) ? int_NUMBER
                            : OTSuggestionOrderDetails.getIntNUMBER() + int_NUMBER);
            OTSuggestionOrderDetails
                    .setIntPRICE(OTSuggestionOrderDetails.getIntPAFDETAIL() * OTSuggestionOrderDetails.getIntNUMBER());
            OTSuggestionOrderDetails.setDtUPDATED(now);
            OTSuggestionOrder.setDtUPDATED(now);

            this.getOdataManager().getEm().merge(OTSuggestionOrderDetails);
            // OTFamille.setIntORERSTATUS((short) 1);
            // this.getOdataManager().getEm().merge(OTFamille);
            /*
             * ajoute le 09 06 2017 pour la gestion du code indicateur de reappro debut
             * OTFamille.setBCODEINDICATEUR(Boolean.TRUE); this.getOdataManager().getEm().merge(OTFamille); ajoute le 09
             * 06 2017 pour la gestion du code indicateur de reappro fin
             */
            // this.getOdataManager().CloseTransaction();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        new logger().OCategory.info(this.getDetailmessage());
        return OTSuggestionOrderDetails;
    }

    public TSuggestionOrder checkSuggestionGrossiteExiste(String lg_GROSSISTE_ID) {

        TSuggestionOrder OTSuggestionOrder;

        try {

            OTSuggestionOrder = (TSuggestionOrder) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrder t WHERE t.lgGROSSISTEID.lgGROSSISTEID =?1  AND t.strSTATUT = ?2 ORDER BY t.dtUPDATED DESC ")
                    .setFirstResult(0).setMaxResults(1).setParameter(1, lg_GROSSISTE_ID)
                    .setParameter(2, commonparameter.statut_is_Auto).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            OTSuggestionOrder = OorderManagement.createSuggestionOrder(lg_GROSSISTE_ID, commonparameter.statut_is_Auto);

        }
        return OTSuggestionOrder;

    }

    public int Suggestion_PrixDAchat(String lg_SUGGESTION_ORDER_ID) {

        int PrixDAchatTotal = 0;

        try {

            List<TSuggestionOrderDetails> lstTSuggestionOrderDetails = this
                    .getTSuggestionOrderDetails(lg_SUGGESTION_ORDER_ID);

            for (TSuggestionOrderDetails olstTSuggestionOrderDetails : lstTSuggestionOrderDetails) {

                PrixDAchatTotal = (olstTSuggestionOrderDetails.getLgFAMILLEID().getIntPAT()
                        * olstTSuggestionOrderDetails.getIntNUMBER()) + PrixDAchatTotal;

            }

            new logger().OCategory.info("PrixDAchatTotal   " + PrixDAchatTotal);
            return PrixDAchatTotal;

        } catch (Exception E) {

            new logger().OCategory.info("PrixDAchatTotal   " + PrixDAchatTotal + " ERREUR" + E);
            return PrixDAchatTotal;
        }

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
        new logger().OCategory.info("lstT taille " + lstT.size());
        return lstT;
    }

    // liste des suggestions
    public List<TSuggestionOrder> ListeSuggestionOrder(String search_value, String lg_SUGGESTION_ORDER_ID, int start,
            int limit) {
        List<TSuggestionOrder> lstTSuggestionOrder = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            lstTSuggestionOrder = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrder t, TSuggestionOrderDetails ts WHERE t.lgSUGGESTIONORDERID = ts.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID AND t.lgSUGGESTIONORDERID LIKE ?3 AND (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?5) AND (t.strREF LIKE ?4 OR ts.lgFAMILLEID.intCIP LIKE ?4 OR ts.lgFAMILLEID.intEAN13 LIKE ?4 OR ts.lgFAMILLEID.strDESCRIPTION LIKE ?4) GROUP BY ts.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID ORDER BY t.dtUPDATED DESC")
                    .setParameter(1, commonparameter.statut_is_Process).setParameter(2, commonparameter.statut_is_Auto)
                    .setParameter(5, commonparameter.statut_pending).setParameter(3, lg_SUGGESTION_ORDER_ID)
                    .setParameter(4, search_value + "%").setFirstResult(start).setMaxResults(limit).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTSuggestionOrder taille " + lstTSuggestionOrder.size());
        return lstTSuggestionOrder;
    }

    public int ListeSuggestionOrder(String search_value, String lg_SUGGESTION_ORDER_ID) {
        int count = 0;
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }

            List<Object[]> _count = this.getOdataManager().getEm().createQuery(
                    "SELECT  COUNT(DISTINCT t) FROM TSuggestionOrder t, TSuggestionOrderDetails ts WHERE t.lgSUGGESTIONORDERID = ts.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID AND t.lgSUGGESTIONORDERID LIKE ?3 AND (t.strSTATUT LIKE ?1 OR t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?5) AND (t.strREF LIKE ?4 OR ts.lgFAMILLEID.intCIP LIKE ?4 OR ts.lgFAMILLEID.intEAN13 LIKE ?4 OR ts.lgFAMILLEID.strDESCRIPTION LIKE ?4) GROUP BY ts.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID ORDER BY t.dtUPDATED DESC")
                    .setParameter(1, commonparameter.statut_is_Process).setParameter(2, commonparameter.statut_is_Auto)
                    .setParameter(5, commonparameter.statut_pending).setParameter(3, lg_SUGGESTION_ORDER_ID)
                    .setParameter(4, search_value + "%").getResultList();
            count = _count.size();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return count;
    }

    // fin liste des suggestions
    // fonction de mise a jour des prix d'un article durant le processus de commande
    public boolean updatePriceArticleByDuringCommand(String lg_FAMILLE_ID, int int_PRICE, int int_PRICE_TIPS,
            int int_PAF, int int_PAT, String action, String str_REF, String step) {

        boolean result = false;
        int int_PAF_OLD = 0, int_PAT_OLD = 0, int_PRICE_OLD = 0, int_PRICE_TIPS_OLD = 0;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
        try {
            TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);
            // if (OfamilleManagement.checkpricevente(OTFamille, int_PRICE)) {
            // this.buildErrorTraceMessage("Impossible. Le prix de vente ne doit pas être supérieur au pourcentage
            // fixé");
            // return false;
            // }

            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();
            int_PRICE_TIPS_OLD = OTFamille.getIntPRICETIPS() != null ? OTFamille.getIntPRICETIPS()
                    : OTFamille.getIntPRICE();

            new logger().OCategory.info("step avant:" + step + "-");
            if (step.equalsIgnoreCase(commonparameter.str_ACTION_ENTREESTOCK)) {
                new logger().OCategory.info("step dedans:" + step + "*");
                OTFamille.setIntPAF(int_PAF);
                OTFamille.setIntPAT(int_PAT);
                OTFamille.setIntPRICE(int_PRICE);
                OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
                OTFamille.setDtCREATED(new Date());
                // this.persiste(OTFamille); //a decommenter en cas de probleme
                this.getOdataManager().getEm().merge(OTFamille);
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

    public boolean updatePriceArticleByDuringCommand(TFamille OTFamille, int int_PRICE, int int_PRICE_TIPS, int int_PAF,
            int int_PAT, String action, String str_REF, String step) {

        int int_PAF_OLD = 0, int_PAT_OLD = 0, int_PRICE_OLD = 0, int_PRICE_TIPS_OLD = 0;
        boolean result = false;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
        try {
            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();
            int_PRICE_TIPS_OLD = OTFamille.getIntPRICETIPS() != null ? OTFamille.getIntPRICETIPS()
                    : OTFamille.getIntPRICE();
            if (step.equalsIgnoreCase(commonparameter.str_ACTION_ENTREESTOCK)) {
                OTFamille.setIntPAF(int_PAF);
                OTFamille.setIntPAT(int_PAT);
                OTFamille.setIntPRICE(int_PRICE);
                OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
                OTFamille.setDtCREATED(new Date());
                this.getOdataManager().getEm().merge(OTFamille);
            }

            if ((int_PRICE_OLD != int_PRICE) || (int_PAF_OLD != int_PAF) || (int_PAT_OLD != int_PAT)
                    || (int_PRICE_TIPS_OLD != int_PRICE_TIPS)) {
                String Description = "Modification de prix à la commande de " + OTFamille.getStrDESCRIPTION()
                        + " par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".";
                if (int_PRICE_OLD != int_PRICE) {
                    Description += "Prix de vente: " + int_PRICE_OLD + " remplacé par " + int_PRICE + ".";
                    new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPriceBis(OTFamille,
                            commonparameter.code_action_commande, int_PRICE, int_PRICE_OLD, str_REF);
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
                List<TAlertEventUserFone> lstTAlertEventUserFone = new ArrayList<>();
                ServicesUpdatePriceFamille OService = new ServicesUpdatePriceFamille(this.getOdataManager(),
                        this.getOTUser());
                lstTAlertEventUserFone = OfamilleManagement.getTAlertEventUserFone("N_UPDATE_FAMILLE_PRICE");
                for (TAlertEventUserFone OTAlertEventUserFone : lstTAlertEventUserFone) {
                    OService.saveNotification(Description, OTAlertEventUserFone.getLgUSERFONEID().getStrPHONE(),
                            this.getKey().getComplexId());
                }
                result = true;
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

                // OfamilleManagement.sendSMS(Description, "TFamille", action, "N_UPDATE_FAMILLE_PRICE"); // a
                // decommenter en cas de probleme
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }
    // fin fonction de mise a jour des prix d'un article durant le processus de commande

    // liste des suggestions details
    public List<TSuggestionOrderDetails> ListeSuggestionOrderDetails(String search_value,
            String lg_SUGGESTION_ORDER_ID) {
        List<TSuggestionOrderDetails> lstTSuggestionOrderDetails = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTSuggestionOrderDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t  WHERE t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID LIKE ?1 AND( t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?3) AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(1, lg_SUGGESTION_ORDER_ID).setParameter(2, commonparameter.statut_is_Process)
                    .setParameter(3, commonparameter.statut_is_Auto).setParameter(4, search_value + "%")
                    .getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTSuggestionOrderDetails taille " + lstTSuggestionOrderDetails.size());
        return lstTSuggestionOrderDetails;
    }

    public List<TSuggestionOrderDetails> ListeSuggestionOrderDetails(String search_value, String lg_SUGGESTION_ORDER_ID,
            int start, int limit) {
        List<TSuggestionOrderDetails> lstTSuggestionOrderDetails = new ArrayList<>();
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }
            lstTSuggestionOrderDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t  WHERE t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID LIKE ?1 AND( t.strSTATUT LIKE ?2 OR t.strSTATUT LIKE ?3) AND (t.lgFAMILLEID.intCIP LIKE ?4 OR t.lgFAMILLEID.intEAN13 LIKE ?4 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?4) ORDER BY t.lgFAMILLEID.strDESCRIPTION ASC")
                    .setParameter(1, lg_SUGGESTION_ORDER_ID).setParameter(2, commonparameter.statut_is_Process)
                    .setParameter(3, commonparameter.statut_is_Auto).setParameter(4, search_value + "%")
                    .setFirstResult(start).setMaxResults(limit).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTSuggestionOrderDetails taille " + lstTSuggestionOrderDetails.size());
        return lstTSuggestionOrderDetails;
    }
    // fin liste des suggestions details

    // creation d'une suggestion partant de la vente
    public boolean createSuggestionByVente(String lg_PREENREGISTREMENT_ID) {
        boolean result = false;
        List<TPreenregistrementDetail> lstTTPreenregistrementDetail = new ArrayList<>();
        suggestionManagement OsuggestionManagement = new suggestionManagement(this.getOdataManager());
        WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser());
        Preenregistrement OPreenregistrement = new Preenregistrement(this.getOdataManager(), this.getOTUser());
        TSuggestionOrder OTSuggestionOrder;
        int i = 0;
        try {

            TPreenregistrement OTPreenregistrement = OPreenregistrement.FindPreenregistrement(lg_PREENREGISTREMENT_ID);
            if (OTPreenregistrement == null) {
                this.buildErrorTraceMessage("Impossible de créer la suggestion. Référence de vente inconnue");
                return false;
            }
            lstTTPreenregistrementDetail = OPreenregistrement.getTPreenregistrementDetail(
                    OTPreenregistrement.getLgPREENREGISTREMENTID(), commonparameter.statut_is_Closed);

            if (lstTTPreenregistrementDetail.size() > 0) {
                TGrossiste OTGrossiste = lstTTPreenregistrementDetail.get(0).getLgFAMILLEID().getLgGROSSISTEID();

                // code ajouté
                OTSuggestionOrder = OsuggestionManagement.isGrosssiteExistInSuggestion(OTGrossiste.getLgGROSSISTEID());
                if (OTSuggestionOrder == null) {
                    OTSuggestionOrder = new orderManagement(getOdataManager(), getOTUser())
                            .createTSuggestionOrder(OTGrossiste.getLgGROSSISTEID(), commonparameter.statut_is_Auto);
                }
                // fin code ajouté

                for (TPreenregistrementDetail OTPreenregistrementDetail : lstTTPreenregistrementDetail) {

                    if (this.CreateTSuggestionOrderDetails(OTSuggestionOrder,
                            OTPreenregistrementDetail.getLgFAMILLEID(), OTGrossiste,
                            OTPreenregistrementDetail.getIntQUANTITY(), commonparameter.str_ACTION_VENTE) != null) { // code
                                                                                                                     // ajouté
                        i++;
                    }

                    // fin code ajouté
                }
                if (lstTTPreenregistrementDetail.size() == i) {
                    OTPreenregistrement.setIntSENDTOSUGGESTION(1);
                    this.persiste(OTPreenregistrement);
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                }
            } else {
                this.buildErrorTraceMessage("Impossible de créer la suggestion. Vente sans produit");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la suggestion");
        }
        return result;
    }
    // fin creation d'une suggestion partant de la vente

    // creation de suggestion détail
    public boolean createSuggestionDetail(TSuggestionOrder OTSuggestionOrder, TGrossiste OTGrossiste,
            TFamille OTFamille, int int_qte, String str_STATUT) {
        boolean result = false;
        try {
            TSuggestionOrderDetails OTSuggestionOrderDetails = new TSuggestionOrderDetails();
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERDETAILSID(this.getKey().getComplexId());
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERID(OTSuggestionOrder);
            OTSuggestionOrderDetails.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrderDetails.setLgFAMILLEID(OTFamille);
            OTSuggestionOrderDetails.setIntNUMBER(int_qte);
            OTSuggestionOrderDetails.setIntPRICE(int_qte * OTFamille.getIntPRICE());
            // String str_STATUT commonparameter.statut_is_Process
            OTSuggestionOrderDetails.setStrSTATUT(str_STATUT);
            OTSuggestionOrderDetails.setDtCREATED(new Date());
            this.persiste(OTSuggestionOrderDetails);
            OTFamille.setIntORERSTATUS((short) 1);
            this.merge(OTFamille);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de creation du detail de la suggestion");
        }
        return result;
    }
    // fin creation de suggestion détail

    public TSuggestionOrder findTsuggestionOrder(String lg_SUGGESTION_ORDER_ID) {
        TSuggestionOrder OTSuggestionOrder = null;
        try {
            OTSuggestionOrder = this.getOdataManager().getEm().find(TSuggestionOrder.class, lg_SUGGESTION_ORDER_ID);
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Suggestion inexistante");
        }
        return OTSuggestionOrder;
    }

    // verifie si un grossiste est dans la liste des suggestions
    public TSuggestionOrder isGrosssiteExistInSuggestion(String lg_GROSSISTE_ID) {
        List<TSuggestionOrder> lstTSuggestionOrder = new ArrayList<>();
        TSuggestionOrder OTSuggestionOrder = null;
        try {
            lstTSuggestionOrder = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrder t WHERE (t.lgGROSSISTEID.lgGROSSISTEID = ?1 OR t.lgGROSSISTEID.strLIBELLE = ?1) AND (t.strSTATUT = ?3 OR t.strSTATUT = ?4 OR t.strSTATUT = ?5)")
                    .setParameter(1, lg_GROSSISTE_ID).setParameter(3, commonparameter.statut_is_Process)
                    .setParameter(4, commonparameter.statut_is_Auto).setParameter(5, commonparameter.statut_pending)
                    .getResultList();
            if (lstTSuggestionOrder.size() > 0) {
                OTSuggestionOrder = lstTSuggestionOrder.get(0);
                this.buildErrorTraceMessage("Une suggestion existe déjà pour ce grossiste. Voulez-vous les fusionner");
            } else {
                this.buildSuccesTraceMessage("Grossiste inexistant");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSuggestionOrder;
    }

    public TSuggestionOrder isGrosssiteExistInSuggestion(String lg_GROSSISTE_ID, String str_STATUT) {
        List<TSuggestionOrder> lstTSuggestionOrder = new ArrayList<TSuggestionOrder>();
        TSuggestionOrder OTSuggestionOrder = null;
        try {
            lstTSuggestionOrder = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrder t WHERE (t.lgGROSSISTEID.lgGROSSISTEID = ?1 OR t.lgGROSSISTEID.strLIBELLE = ?1) AND t.strSTATUT = ?3")
                    .setParameter(1, lg_GROSSISTE_ID).setParameter(3, str_STATUT).getResultList();
            if (lstTSuggestionOrder.size() > 0) {
                OTSuggestionOrder = lstTSuggestionOrder.get(0);
                this.buildErrorTraceMessage("Une suggestion existe déjà pour ce grossiste. Voulez-vous les fusionner");
            } else {
                this.buildSuccesTraceMessage("Grossiste inexistant");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSuggestionOrder;
    }

    // fin verifie si un grossiste est dans la liste des suggestions
    // fusion de deux suggestion ayant des grossistes differents
    public boolean mergeSuggestion(TSuggestionOrder OTSuggestionOrderExist, String lg_SUGGESTION_ORDER_ID,
            String lg_GROSSISTE_ID) {
        boolean result = false;
        WarehouseManager OWarehouseManager = new WarehouseManager(this.getOdataManager(), this.getOTUser());
        List<TSuggestionOrderDetails> lstTSuggestionOrderDetails = new ArrayList<TSuggestionOrderDetails>();
        int i = 0;
        try {
            TSuggestionOrder OTSuggestionOrder = this.findTsuggestionOrder(lg_SUGGESTION_ORDER_ID);
            TGrossiste OTGrossiste = new grossisteManagement(this.getOdataManager()).getGrossiste(lg_GROSSISTE_ID);
            if (OTSuggestionOrder != null && OTGrossiste != null) {
                lstTSuggestionOrderDetails = this
                        .getTSuggestionOrderDetails(OTSuggestionOrder.getLgSUGGESTIONORDERID());
                for (TSuggestionOrderDetails OTSuggestionOrderDetails : lstTSuggestionOrderDetails) {
                    if (this.CreateTSuggestionOrderDetails(OTSuggestionOrderExist,
                            OTSuggestionOrderDetails.getLgFAMILLEID(), OTSuggestionOrderExist.getLgGROSSISTEID(),
                            OTSuggestionOrderDetails.getIntNUMBER(), commonparameter.code_action_commande) != null) {
                        i++;
                        this.delete(OTSuggestionOrderDetails);
                    }
                }
            } else {
                this.buildErrorTraceMessage("Suggestion inexistante");
            }
            new logger().OCategory.info("i " + i);
            if (lstTSuggestionOrderDetails.size() == i) {
                /*
                 * OTSuggestionOrder.setStrSTATUT(commonparameter.statut_delete); OTSuggestionOrder.setDtUPDATED(new
                 * Date()); this.persiste(OTSuggestionOrder);
                 */
                if (this.delete(OTSuggestionOrder)) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage("Echec de suppression de la suggestion");
                }

            } else {
                this.buildErrorTraceMessage(i + "/" + lstTSuggestionOrderDetails.size() + " pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    // fin fusion de deux suggestion ayant des grossistes differents

    // suggestion partant de la liste des ruptures
    public boolean sendRuptureToSuggestion(String listProductSelected) {
        boolean result = false;
        String[] part;
        int i = 0;
        TRuptureHistory OTRuptureHistory = null;
        try {
            part = StringUtils.split(listProductSelected, commonparameter.SEPARATEUR_POINT_VIRGULE);
            if (part.length > 0) {
                OTRuptureHistory = this.getOdataManager().getEm().find(TRuptureHistory.class, part[0]);
                // code ajouté
                TGrossiste OTGrossiste = OTRuptureHistory.getLgFAMILLEID().getLgGROSSISTEID();
                TSuggestionOrder OTSuggestionOrder = this.isGrosssiteExistInSuggestion(OTGrossiste.getLgGROSSISTEID());
                if (OTSuggestionOrder == null) {
                    OTSuggestionOrder = new orderManagement(getOdataManager(), getOTUser()).createTSuggestionOrder(
                            OTRuptureHistory.getLgFAMILLEID().getLgGROSSISTEID().getLgGROSSISTEID(),
                            commonparameter.statut_is_Auto);
                }
                // fin code ajouté

                for (String Ovalue : part) {
                    OTRuptureHistory = this.getOdataManager().getEm().find(TRuptureHistory.class, Ovalue);
                    if (this.CreateTSuggestionOrderDetails(OTSuggestionOrder, OTRuptureHistory.getLgFAMILLEID(),
                            OTGrossiste, OTRuptureHistory.getIntNUMBER(),
                            commonparameter.code_action_commande) != null) { // code ajouté
                        /*
                         * if (this.delete(OTRuptureHistory)) { // ancien bon code i++; }
                         */
                        OTRuptureHistory.setStrSTATUT(commonparameter.statut_delete);
                        OTRuptureHistory.setDtUPDATED(new Date());
                        if (this.persiste(OTRuptureHistory)) { // ancien bon code
                            i++;
                        }

                    }

                    // fin code ajouté
                }
                if (part.length == i) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(i + "/" + part.length + " ont été pris en compte");
                }
            } else {
                this.buildErrorTraceMessage("Impossible de créer la suggestion. liste de rupture vide");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la suggestion");
        }
        return result;
    }

    /**
     * Envoi tous les en suggessin au click de all sans les deselectionnes
     */
    private List<TRuptureHistory> getAllTRuptureHistorys(JSONArray uncheckedlist, JSONArray listfacturedetail,
            String search_value, int all) {
        List<TRuptureHistory> historys = new ArrayList<>();
        try {
            List<TRuptureHistory> listhistorys = new ArrayList<>();
            if (all == 1 && uncheckedlist.length() == 0) {
                historys = this.getOdataManager().getEm().createQuery(
                        "SELECT o FROM TRuptureHistory o WHERE (o.lgFAMILLEID.intCIP LIKE ?1 OR o.lgFAMILLEID.strNAME LIKE ?1 )")
                        .setParameter(1, search_value + "%").getResultList();
            } else if (all == 1 && uncheckedlist.length() > 0) {
                listhistorys = this.getOdataManager().getEm().createQuery(
                        "SELECT o FROM TRuptureHistory o WHERE (o.lgFAMILLEID.intCIP LIKE ?1 OR o.lgFAMILLEID.strNAME LIKE ?1)")
                        .setParameter(1, search_value + "%").getResultList();
                // (TRuptureHistory Ohistory : listhistorys) {
                for (int k = 0; k < listhistorys.size(); k++) {
                    TRuptureHistory Ohistory = listhistorys.get(k);
                    for (int i = 0; i < uncheckedlist.length(); i++) {
                        if (Ohistory.getLgRUPTUREHISTORYID().toString().equals(uncheckedlist.get(i).toString())) {
                            listhistorys.remove(k);
                        } else {

                        }
                    }
                    historys = listhistorys;
                }

            } else if (all == 0 && listfacturedetail.length() > 0) {
                for (int j = 0; j < listfacturedetail.length(); j++) {
                    TRuptureHistory oHistory = this.getOdataManager().getEm().find(TRuptureHistory.class,
                            listfacturedetail.get(j).toString());
                    historys.add(oHistory);
                }

            }

        } catch (Exception e) {
        }
        return historys;
    }

    // fin creation d'une suggestion partant de la vente
    // suggestion partant de la liste des produits vendus
    public boolean sendProductSellToSuggestion(String search_value, String OdateDebut, String OdateFin, String h_debut,
            String h_fin, String lg_USER_ID, String str_TYPE_TRANSACTION, int int_NUMBER, String mode) {
        boolean result = false;
        String criteria = "ORDER BY v.str_LIBELLE, v.str_DESCRIPTION";
        int i = 0;
        List<EntityData> listeProduct = new ArrayList<>();
        TGrossiste OTGrossiste = null;
        TSuggestionOrder OTSuggestionOrder = null;
        List<String> lstData = new ArrayList<>();
        grossisteManagement OgrossisteManagement = new grossisteManagement(this.getOdataManager());
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager(), this.getOTUser());
        TFamille OTFamille = null;
        try {
            if (search_value.equalsIgnoreCase("")) {
                search_value = "%%";
            }

            if (mode.equalsIgnoreCase("groupe")) {
                listeProduct = new Preenregistrement(this.getOdataManager(), this.getOTUser()).getArticlesVendusRecap(
                        search_value, OdateDebut, OdateFin, h_debut, h_fin, str_TYPE_TRANSACTION, int_NUMBER);
            } else {
                listeProduct = new Preenregistrement(this.getOdataManager(), this.getOTUser()).getListeArticleVendu(
                        search_value, OdateDebut, OdateFin, h_debut, h_fin, str_TYPE_TRANSACTION, int_NUMBER);
            }

            this.getOdataManager().BeginTransaction();
            for (EntityData OEntityData : listeProduct) {
                if (lstData.size() == 0) {
                    lstData.add(OEntityData.getStr_value12());
                    OTGrossiste = OgrossisteManagement.getGrossiste(OEntityData.getStr_value12());
                    OTFamille = OfamilleManagement.getTFamille(OEntityData.getStr_value1());
                    if (OTFamille != null) {
                        OTSuggestionOrder = this.isGrosssiteExistInSuggestion(OTGrossiste.getLgGROSSISTEID(),
                                commonparameter.statut_is_Process);
                        if (OTSuggestionOrder == null) {
                            OTSuggestionOrder = new orderManagement(getOdataManager(), getOTUser())
                                    .createTSuggestionOrder(OTGrossiste.getLgGROSSISTEID(),
                                            commonparameter.statut_is_Process);
                        }
                        if (OTFamille.getBoolDECONDITIONNE() == 0) {
                            if (this.CreateTSuggestionOrderDetails(OTSuggestionOrder, OTFamille, OTGrossiste,
                                    Integer.parseInt(OEntityData.getStr_value8()),
                                    commonparameter.code_action_commande) != null) { // code ajouté
                                i++;
                            }
                        }
                    }

                } else {
                    OTFamille = OfamilleManagement.getTFamille(OEntityData.getStr_value1());
                    if (OTFamille != null) {
                        if (!OEntityData.getStr_value12().equalsIgnoreCase(lstData.get(0))) {
                            lstData.clear();
                            lstData.add(OEntityData.getStr_value12());
                            OTGrossiste = OgrossisteManagement.getGrossiste(OEntityData.getStr_value12());
                            OTSuggestionOrder = this.isGrosssiteExistInSuggestion(OTGrossiste.getLgGROSSISTEID(),
                                    commonparameter.statut_is_Process);
                            if (OTSuggestionOrder == null) {
                                OTSuggestionOrder = new orderManagement(getOdataManager(), getOTUser())
                                        .createTSuggestionOrder(OTGrossiste.getLgGROSSISTEID(),
                                                commonparameter.statut_is_Process);
                            }

                        }
                        if (OTFamille.getBoolDECONDITIONNE() == 0) {
                            if (this.CreateTSuggestionOrderDetails(OTSuggestionOrder, OTFamille, OTGrossiste,
                                    Integer.parseInt(OEntityData.getStr_value8()),
                                    commonparameter.code_action_commande) != null) { // code ajouté
                                i++;
                            }

                        }
                    }

                }
            }
            this.getOdataManager().CloseTransaction();

            if (listeProduct.size() > 0) {
                if (listeProduct.size() == i) {
                    this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                    result = true;
                } else {
                    this.buildErrorTraceMessage(i + "/" + listeProduct.size() + " ont été pris en compte");
                }
            } else {
                this.buildErrorTraceMessage(
                        "Impossible de créer la suggestion. Liste de produit vendu sur la période sélectionnée vide");
            }

            // fin code ajouté
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la suggestion. Veuillez réessayer");
        }
        return result;

    }

    // fin suggestion partant de la liste des produits vendus
    public boolean sendRuptureToSuggestion_V2(JSONArray uncheckedlist, JSONArray listfacturedetail, String search_value,
            int all, String lg_GROSSISTE) {
        boolean result = false;
        String[] part;
        int i = 0;

        try {
            List<TRuptureHistory> historys = getAllTRuptureHistorys(uncheckedlist, listfacturedetail, search_value,
                    all);
            TGrossiste OTGrossiste = this.getOdataManager().getEm().find(TGrossiste.class, lg_GROSSISTE);
            TSuggestionOrder OTSuggestionOrder = this.isGrosssiteExistInSuggestion(OTGrossiste.getLgGROSSISTEID());
            if (OTSuggestionOrder == null) {
                OTSuggestionOrder = new orderManagement(getOdataManager(), getOTUser())
                        .createTSuggestionOrder(OTGrossiste.getLgGROSSISTEID(), commonparameter.statut_is_Auto);
            }
            // fin code ajouté

            for (TRuptureHistory Ovalue : historys) {

                if (this.CreateTSuggestionOrderDetails(OTSuggestionOrder, Ovalue.getLgFAMILLEID(), OTGrossiste,
                        Ovalue.getIntNUMBER(), commonparameter.code_action_commande) != null) { // code ajouté

                    Ovalue.setStrSTATUT(commonparameter.statut_delete);
                    Ovalue.setDtUPDATED(new Date());
                    if (this.persiste(Ovalue)) { // ancien bon code
                        i++;
                    }
                }

                // fin code ajouté
            }
            if (historys.size() == i) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage(i + "/" + historys.size() + " ont été pris en compte");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de création de la suggestion");
        }
        return result;
    }

    private TSuggestionOrderDetails initTSuggestionOrderDetail(TSuggestionOrder OTSuggestionOrder, TFamille OTFamille,
            TGrossiste OTGrossiste, int int_NUMBER, String str_STATUT) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            OTFamilleGrossiste = findOrFamilleGrossiste(OTFamille, OTGrossiste);

            TSuggestionOrderDetails OTSuggestionOrderDetails = new TSuggestionOrderDetails();
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERDETAILSID(this.getKey().getComplexId());
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERID(OTSuggestionOrder);
            OTSuggestionOrderDetails.setLgFAMILLEID(OTFamille);
            OTSuggestionOrderDetails.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrderDetails.setIntNUMBER(int_NUMBER);
            /*
             * OTSuggestionOrderDetails.setIntPRICE(OTFamille.getIntPAF() * int_NUMBER); //a decommenter en cas de
             * probleme 06/03/2017 OTSuggestionOrderDetails.setIntPAFDETAIL(OTFamille.getIntPAF());
             * OTSuggestionOrderDetails.setIntPRICEDETAIL(OTFamille.getIntPRICE());
             */
            OTSuggestionOrderDetails.setIntPRICE((OTFamilleGrossiste != null && OTFamilleGrossiste.getIntPAF() != null
                    && OTFamilleGrossiste.getIntPAF() != 0) ? OTFamilleGrossiste.getIntPAF() * int_NUMBER
                            : OTFamille.getIntPAF() * int_NUMBER);
            OTSuggestionOrderDetails.setIntPAFDETAIL((OTFamilleGrossiste != null
                    && OTFamilleGrossiste.getIntPAF() != null && OTFamilleGrossiste.getIntPAF() != 0)
                            ? OTFamilleGrossiste.getIntPAF() : OTFamille.getIntPAF());
            OTSuggestionOrderDetails.setIntPRICEDETAIL((OTFamilleGrossiste != null
                    && OTFamilleGrossiste.getIntPRICE() != null && OTFamilleGrossiste.getIntPRICE() != 0)
                            ? OTFamilleGrossiste.getIntPRICE() : OTFamille.getIntPRICE());
            OTSuggestionOrderDetails.setStrSTATUT(str_STATUT);
            OTSuggestionOrderDetails.setDtCREATED(new Date());
            OTSuggestionOrderDetails.setDtUPDATED(new Date());
            this.getOdataManager().getEm().persist(OTSuggestionOrderDetails);
            OTFamille.setIntORERSTATUS((short) 1);
            this.getOdataManager().getEm().merge(OTFamille);
            System.out.println("*********************************************************************  "
                    + OTFamilleGrossiste + " 1111111111111");
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTSuggestionOrderDetails;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajout cet article à la suggestion");
            return null;
        }
    }

    public TSuggestionOrderDetails UpdateTSuggestionOrderDetails(String lg_SUGGESTION_ORDER_DETAILS_ID,
            String lg_SUGGESTION_ORDER_ID, String lg_famille_id, String lg_GROSSISTE_ID, int int_NUMBER,
            String str_STATUT, int int_PAF, int int_PRICE) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        TSuggestionOrder OTSuggestionOrder = null;
        TGrossiste OTGrossiste = null;
        TFamille OTFamille = null;
        try {

            OTSuggestionOrderDetails = this.getOdataManager().getEm().find(TSuggestionOrderDetails.class,
                    lg_SUGGESTION_ORDER_DETAILS_ID);
            OTGrossiste = new grossisteManagement(this.getOdataManager()).getGrossiste(lg_GROSSISTE_ID);
            OTSuggestionOrder = this.getOdataManager().getEm().find(TSuggestionOrder.class, lg_SUGGESTION_ORDER_ID);
            OTFamille = new familleManagement(this.getOdataManager()).getTFamille(lg_famille_id);
            if (OTSuggestionOrderDetails != null) {
                OTSuggestionOrderDetails.setLgSUGGESTIONORDERID(OTSuggestionOrder);
                OTSuggestionOrderDetails.setLgFAMILLEID(OTFamille);
                OTSuggestionOrderDetails.setLgGROSSISTEID(OTGrossiste);
                OTSuggestionOrderDetails.setIntNUMBER(int_NUMBER);
                OTSuggestionOrderDetails.setIntPRICE(int_NUMBER * int_PAF); // code ajouté
                OTSuggestionOrderDetails.setIntPAFDETAIL(int_PAF);
                OTSuggestionOrderDetails.setIntPRICEDETAIL(int_PRICE);
                // OTSuggestionOrderDetails.setIntPRICE(int_NUMBER * OTFamille.getIntPAF()); // a decommenter en cas de
                // probleme
                OTSuggestionOrderDetails.setStrSTATUT(str_STATUT);
                OTSuggestionOrderDetails.setDtUPDATED(new Date());
            }
            /*
             * else { //a decommenter en cas de probleme 13/12/2016 OTSuggestionOrderDetails =
             * this.initTSuggestionOrderDetail(OTSuggestionOrder, OTFamille, OTGrossiste, int_NUMBER, str_STATUT); }
             */

            OTSuggestionOrder.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.persiste(OTSuggestionOrder);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));

            // new logger().OCategory.info(" update de OTSuggestionOrderDetails " +
            // OTSuggestionOrderDetails.getLgSUGGESTIONORDERDETAILSID());
            return OTSuggestionOrderDetails;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public TSuggestionOrderDetails AddToTSuggestionOrderDetails(TFamille OTFamille, TGrossiste OTGrossiste,
            TSuggestionOrder OTSuggestionOrder, int int_qte, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;

        try {

            OTSuggestionOrderDetails = this.isProductExistInSomeSuggestion(OTFamille.getLgFAMILLEID(), str_STATUT);
            if (OTSuggestionOrderDetails == null) {
                if (OTSuggestionOrder == null) {
                    OTSuggestionOrder = OorderManagement.createTSuggestionOrder(OTGrossiste.getLgGROSSISTEID(),
                            str_STATUT);
                }

                OTSuggestionOrderDetails = this.initTSuggestionOrderDetail(OTSuggestionOrder, OTFamille, OTGrossiste,
                        int_qte, str_STATUT);
            } else if (str_STATUT.equalsIgnoreCase(commonparameter.statut_is_Process)) {
                OTSuggestionOrderDetails.setIntNUMBER(int_qte);
                OTSuggestionOrderDetails.setIntPRICE(int_qte * OTSuggestionOrderDetails.getIntPAFDETAIL());
            }
            // code ajouté
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTSuggestionOrderDetails);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du produit à la suggestion");
        }

        this.getOdataManager().getEm().persist(OTSuggestionOrderDetails);
        new logger().OCategory
                .info("Mise a jour de OTSuggestionOrderDetails " + OTSuggestionOrderDetails.getIntNUMBER());
        return OTSuggestionOrderDetails;
    }

    // verifie si un produit existe déjà dans une suggestion
    private TSuggestionOrderDetails isProductExistInSomeSuggestion(String lg_famille_id, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            OTSuggestionOrderDetails = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.strSTATUT LIKE ?2")
                    .setParameter(1, lg_famille_id).setParameter(2, str_STATUT).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
            new logger().OCategory.info(" *** Desoleeeeeee OTSuggestionOrderDetails   5555 *** " + e.toString());
        }
        return OTSuggestionOrderDetails;
    }

    // fin verifie si un produit existe déjà dans une suggestion
    /* code ajoute le 30/03/2017 pour la sugestion des ventes terminees debut */
    public void createsuggestionOrderDetails(TFamille OTFamille, TGrossiste OTGrossiste,
            TSuggestionOrder OTSuggestionOrder, int int_qte, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;

        try {

            OTSuggestionOrderDetails = this.isProductExistInSomeSuggestion(OTFamille.getLgFAMILLEID(), str_STATUT);
            if (OTSuggestionOrderDetails == null) {

                OTSuggestionOrderDetails = this.initTSuggestionOrderDetail(OTSuggestionOrder, OTFamille, OTGrossiste,
                        int_qte, str_STATUT);
            } else if (str_STATUT.equalsIgnoreCase(commonparameter.statut_is_Process)) {
                OTSuggestionOrderDetails.setIntNUMBER(int_qte);
                OTSuggestionOrderDetails.setIntPRICE(int_qte * OTSuggestionOrderDetails.getIntPAFDETAIL());
            }
            // code ajouté
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTSuggestionOrderDetails);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du produit à la suggestion");
        }

        new logger().OCategory
                .info("Mise a jour de OTSuggestionOrderDetails " + OTSuggestionOrderDetails.getIntNUMBER());

    }

    private TSuggestionOrder createSuggestionOrder(String lgGROSSISTE_ID, String str_STATUT) {
        TSuggestionOrder OTSuggestionOrder = null;
        TGrossiste OTGrossiste = null;
        try {
            OTSuggestionOrder = new TSuggestionOrder();
            OTSuggestionOrder.setLgSUGGESTIONORDERID(this.getKey().getComplexId());
            OTSuggestionOrder.setStrREF("REF_" + this.getKey().getShortId(7));
            OTGrossiste = this.getOdataManager().getEm().find(TGrossiste.class, lgGROSSISTE_ID);
            if (OTGrossiste == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement de la suggestion. Grossiste inexistant");
                return null;
            }
            OTSuggestionOrder.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrder.setStrSTATUT(str_STATUT);
            OTSuggestionOrder.setDtCREATED(new Date());
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().persist(OTSuggestionOrder);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSuggestionOrder;
    }

    private List<TPreenregistrementDetail> getPreenregistrementDetails(String lg_Preenrengistrement_id) {
        List<TPreenregistrementDetail> list = new ArrayList<>();
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1  ")
                    .setParameter(1, lg_Preenrengistrement_id).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public boolean createsellsuggestion(String lg_Preenrengistrement_id) {
        boolean isOk = false;
        List<TPreenregistrementDetail> list = getPreenregistrementDetails(lg_Preenrengistrement_id);
        try {

            if (list.size() > 0) {
                if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().begin();
                }
                for (TPreenregistrementDetail tPreenregistrementDetail : list) {
                    TFamille famille = tPreenregistrementDetail.getLgFAMILLEID();
                    TGrossiste tg = famille.getLgGROSSISTEID();
                    TSuggestionOrder order = createSuggestionOrder(tg.getLgGROSSISTEID(),
                            commonparameter.statut_is_Process);
                    System.out.println("famille " + famille + " tg " + tg);

                    createsuggestionOrderDetails(famille, tg, order, tPreenregistrementDetail.getIntNUMBER(),
                            commonparameter.statut_is_Process);

                }

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                    isOk = true;
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return isOk;

    }

    /* fin code du 30/03/2017 */
    public JSONObject sendProductSellToSuggestion2(String search_value, String OdateDebut, String OdateFin,
            String h_debut, String h_fin, String lg_USER_ID, String str_TYPE_TRANSACTION, int int_NUMBER, String mode,
            String prixachatFiltre, int stock, String stockFiltre) {
        int result = 0;
        JSONObject json = new JSONObject();
        List<EntityData> listeProduct;

        final List<String> l = new ArrayList<>();
        final List<String> productList = new ArrayList<>();
        try {

            listeProduct = new Preenregistrement(this.getOdataManager(), this.getOTUser())
                    .getListeArticleVenduPourSuggestion(search_value, OdateDebut, OdateFin, h_debut, h_fin,
                            str_TYPE_TRANSACTION, int_NUMBER, prixachatFiltre, stock, stockFiltre);
            Map<String, List<EntityData>> _listGroup = listeProduct.stream()
                    .collect(Collectors.groupingByConcurrent(EntityData::getStr_value12));
            EntityManager em = this.getOdataManager().getEm();

            if (!em.getTransaction().isActive()) {
                em.getTransaction().begin();
            }

            _listGroup.entrySet().forEach((ob) -> {
                String lgGrossiste = ob.getKey();

                final TGrossiste oGr = em.find(TGrossiste.class, lgGrossiste);
                final TSuggestionOrder order = createTSuggestionOrder(lgGrossiste, commonparameter.statut_is_Process);

                List<EntityData> value = ob.getValue();
                Map<String, List<EntityData>> _items = value.stream()
                        .collect(Collectors.groupingByConcurrent(EntityData::getStr_value1));

                _items.entrySet().forEach((_ob) -> {
                    String LgFamille = _ob.getKey();

                    productList.add(LgFamille);
                    TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, LgFamille);
                    long qty = _ob.getValue().stream().mapToLong((_qty) -> {
                        return _qty.getLongValue();
                    }).sum();

                    double qte = Integer.valueOf(qty + "");
                    if (OTFamille.getBoolDECONDITIONNE() == 1) {
                        TFamille _OFamille = getParent(OTFamille.getLgFAMILLEPARENTID());

                        if (_OFamille != null) {
                            OTFamille = _OFamille;
                            double qtyDetail = OTFamille.getIntNUMBERDETAIL();
                            qte = (Double.valueOf(qty) / qtyDetail);
                        }

                    }
                    Double myInt = Math.ceil(qte);

                    TSuggestionOrderDetails OTSuggestionOrderDetails = findFamilleInSuggestionOrderDetails(
                            OTFamille.getLgFAMILLEID());
                    boolean flag = false;
                    if (OTSuggestionOrderDetails != null) {
                        flag = true;
                    }

                    TSuggestionOrderDetails o = findIncurrent(order.getLgSUGGESTIONORDERID(),
                            OTFamille.getLgFAMILLEID(), myInt.intValue());
                    if (o == null) {
                        o = createSuggestionOrderDetail(order, OTFamille, oGr, myInt.intValue(), flag);
                    }

                    if (o != null) {
                        l.add(LgFamille);
                        order.getTSuggestionOrderDetailsCollection().add(o);
                    }
                    if ((l.size() % 2) == 0) {
                        em.getTransaction().commit();
                        em.clear();
                        em.getTransaction().begin();
                    }
                });

            });
            if (em.getTransaction().isActive()) {
                em.getTransaction().commit();
                em.clear();
                // em.close();
                this.buildErrorTraceMessage((l.size() + "/" + productList.size()) + " ont été pris en compte");
                result = (l.size());
            }
            json.put("qty", result);
            json.put("result", "Le nombre de produit suggéré : <u><span style='font-weight:900; color:blue;'>"
                    + l.size() + "/" + productList.size() + "</span></u>");

        } catch (Exception e) {

            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                // this.getOdataManager().getEm().close();
            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la suggestion. Veuillez réessayer");
        }
        return json;

    }

    // fin mise a jour de commande
    public TSuggestionOrder createTSuggestionOrder(String lgGROSSISTE_ID, String str_STATUT) {
        TSuggestionOrder OTSuggestionOrder = null;
        TGrossiste OTGrossiste = null;
        try {
            OTSuggestionOrder = new TSuggestionOrder();
            OTSuggestionOrder.setLgSUGGESTIONORDERID(this.getKey().getComplexId());
            OTSuggestionOrder.setStrREF("REF_" + this.getKey().getShortId(7));
            OTGrossiste = new grossisteManagement(this.getOdataManager()).getGrossiste(lgGROSSISTE_ID);
            if (OTGrossiste == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement de la suggestion. Grossiste inexistant");
                return null;
            }
            OTSuggestionOrder.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrder.setStrSTATUT(str_STATUT);
            OTSuggestionOrder.setDtCREATED(new Date());
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().persist(OTSuggestionOrder);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSuggestionOrder;
    }

    TFamilleGrossiste findFamilleGrossiste(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT LIKE ?3 ")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_GROSSISTE_ID)
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            OTFamilleGrossiste = (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return OTFamilleGrossiste;
    }

    private TSuggestionOrderDetails createSuggestionOrderDetail(TSuggestionOrder OTSuggestionOrder, TFamille OTFamille,
            TGrossiste OTGrossiste, int int_NUMBER, boolean flag) {

        try {

            TFamilleGrossiste OTFamilleGrossiste = this.findFamilleGrossiste(OTFamille.getLgFAMILLEID(),
                    OTGrossiste.getLgGROSSISTEID());

            TSuggestionOrderDetails OTSuggestionOrderDetails = new TSuggestionOrderDetails();
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERDETAILSID(this.getKey().getComplexId());
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERID(OTSuggestionOrder);
            OTSuggestionOrderDetails.setLgFAMILLEID(OTFamille);
            OTSuggestionOrderDetails.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrderDetails.setIntNUMBER(int_NUMBER);

            OTSuggestionOrderDetails.setIntPRICE((OTFamilleGrossiste != null && OTFamilleGrossiste.getIntPAF() != null
                    && OTFamilleGrossiste.getIntPAF() != 0) ? OTFamilleGrossiste.getIntPAF() * int_NUMBER
                            : OTFamille.getIntPAF() * int_NUMBER);
            OTSuggestionOrderDetails.setIntPAFDETAIL((OTFamilleGrossiste != null
                    && OTFamilleGrossiste.getIntPAF() != null && OTFamilleGrossiste.getIntPAF() != 0)
                            ? OTFamilleGrossiste.getIntPAF() : OTFamille.getIntPAF());
            OTSuggestionOrderDetails.setIntPRICEDETAIL((OTFamilleGrossiste != null
                    && OTFamilleGrossiste.getIntPRICE() != null && OTFamilleGrossiste.getIntPRICE() != 0)
                            ? OTFamilleGrossiste.getIntPRICE() : OTFamille.getIntPRICE());

            OTSuggestionOrderDetails.setStrSTATUT(commonparameter.statut_is_Process);
            OTSuggestionOrderDetails.setDtCREATED(new Date());
            OTSuggestionOrderDetails.setDtUPDATED(new Date());

            OTSuggestionOrderDetails.setBFalg(flag);

            this.getOdataManager().getEm().persist(OTSuggestionOrderDetails);
            OTFamille.setBCODEINDICATEUR((short) 2);
            OTFamille.setIntORERSTATUS((short) 1);
            this.getOdataManager().getEm().merge(OTFamille);
            // this.persiste(OTSuggestionOrderDetails);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTSuggestionOrderDetails;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajout cet article à la suggestion");
            return null;
        }
    }

    private TFamille getParent(String lgFamille) {

        TFamille famille = null;
        try {
            // famille = (TFamille)
            // this.getOdataManager().getEm().createNamedQuery("TFamille.findByIntCIP").setParameter("intCIP",
            // lgFamille.substring(0, lgFamille.length() - 1)).setMaxResults(1).getSingleResult();

            famille = (TFamille) this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM   TFamille o WHERE o.lgFAMILLEID  =?1 AND o.strSTATUT='enable'  ")
                    .setParameter(1, lgFamille).setMaxResults(1).getSingleResult();
            // .setParameter(1, lgFamille.substring(0, lgFamille.length() - 1)).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return famille;
    }

    private TSuggestionOrderDetails findIncurrent(String order, String lgFamille, int qty) {
        TSuggestionOrderDetails details = null;
        try {
            details = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TSuggestionOrderDetails o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID=?2 ")
                    .setParameter(1, lgFamille).setParameter(2, order).setMaxResults(1).getSingleResult();
            if (details != null) {
                int paf = (details.getIntPRICE() / details.getIntNUMBER());
                details.setIntNUMBER(details.getIntNUMBER() + qty);
                details.setIntPRICE(paf * details.getIntNUMBER());
                this.getOdataManager().getEm().merge(details);
            }
        } catch (Exception e) {
            // e.printStackTrace();

        }
        return details;
    }

    private TSuggestionOrderDetails findFamilleInSuggestionOrderDetails(String lg_famille_id) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            OTSuggestionOrderDetails = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.strSTATUT = ?2 ")
                    .setParameter(1, lg_famille_id).setParameter(2, commonparameter.statut_is_Process).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {

        }
        return OTSuggestionOrderDetails;
    }

    public int isCommandProcess(String lgFamilleID) {

        bonLivraisonManagement bl = new bonLivraisonManagement(this.getOdataManager());
        int status = bl.articleStatus(lgFamilleID);

        return status;
    }

    public int isOnAnotherSuggestion(TFamille lgFamilleID) {

        int status = (lgFamilleID.getIntORERSTATUS() == 2 ? 2 : 0);
        try {

            long count = (long) this.getOdataManager().getEm().createQuery(
                    "SELECT COUNT(o)  FROM TSuggestionOrderDetails o WHERE o.strSTATUT='is_Process' AND o.lgFAMILLEID.lgFAMILLEID =?1 ")
                    .setParameter(1, lgFamilleID.getLgFAMILLEID()).setMaxResults(1).getSingleResult();

            if (count > 1) {

                return 1;

            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return status;
    }

    public void makeSuggestionAuto(TFamilleStock OTFamilleStock, TFamille famille) {

        TSuggestionOrder OTSuggestionOrder;
        int int_QTE_A_SUGGERE = 0;
        try {

            if (famille.getIntSEUILMIN() != null && famille.getBoolDECONDITIONNE() == 0) {

                if (OTFamilleStock.getIntNUMBERAVAILABLE() <= famille.getIntSEUILMIN()) {

                    int_QTE_A_SUGGERE = this.calcQteReappro(OTFamilleStock);

                    if (int_QTE_A_SUGGERE > 0) {
                        this.getOdataManager().getEm().getTransaction().begin();
                        OTSuggestionOrder = this
                                .checkSuggestionGrossiteExiste(famille.getLgGROSSISTEID().getLgGROSSISTEID());

                        if (OTSuggestionOrder != null) {

                            this.CreateTSuggestionOrderDetails(OTSuggestionOrder, famille, famille.getLgGROSSISTEID(),
                                    int_QTE_A_SUGGERE, commonparameter.str_ACTION_VENTE);
                        } else {

                            this.AddToTSuggestionOrderDetails(famille, famille.getLgGROSSISTEID(), OTSuggestionOrder,
                                    int_QTE_A_SUGGERE, commonparameter.statut_is_Auto);
                        }
                        this.getOdataManager().getEm().getTransaction().commit();
                        this.getOdataManager().getEm().clear();

                    }

                } else {
                    new logger().OCategory.info("Le seuil n'est pas atteint ");
                }

            } else {

                new logger().OCategory.info("OTFamille  est null ");

            }

        } catch (Exception E) {
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                // this.getOdataManager().getEm().close();
            }
            E.printStackTrace();
            new logger().OCategory.info("ECHEC ");

        }
        new logger().OCategory.info("Quantite total suggérée " + int_QTE_A_SUGGERE);

    }
    // suggestion des vinght quatre-vinght

    public JSONObject vinghtQuatreVingthSuggestion(String dt_start, String dt_end, List<EntityData> listeProduct) {
        int result = 0;
        JSONObject json = new JSONObject();

        int i = 0;

        final List<String> l = new ArrayList<>();
        final List<String> productList = new ArrayList<>();
        try {

            Map<String, List<EntityData>> _listGroup = listeProduct.stream()
                    .collect(Collectors.groupingByConcurrent(EntityData::getStr_value6));
            EntityManager em = this.getOdataManager().getEm();

            if (!em.getTransaction().isActive()) {
                em.getTransaction().begin();
            }

            _listGroup.entrySet().forEach((ob) -> {
                String lgGrossiste = ob.getKey();

                final TGrossiste oGr = em.getReference(TGrossiste.class, lgGrossiste);
                final TSuggestionOrder order = createTSuggestionOrder(lgGrossiste, commonparameter.statut_is_Process);

                List<EntityData> value = ob.getValue();

                value.forEach((_ob) -> {
                    String LgFamille = _ob.getStr_value5();

                    productList.add(LgFamille);
                    TFamille OTFamille = this.getOdataManager().getEm().find(TFamille.class, LgFamille);
                    int qty = Integer.valueOf(_ob.getStr_value4());
                    double qte = Integer.valueOf(qty + "");
                    if (OTFamille.getBoolDECONDITIONNE() == 1) {
                        TFamille _OFamille = getParent(OTFamille.getLgFAMILLEPARENTID());

                        if (_OFamille != null) {
                            OTFamille = _OFamille;
                            double qtyDetail = OTFamille.getIntNUMBERDETAIL();
                            qte = (Double.valueOf(qty) / qtyDetail);
                        }

                    }
                    Double myInt = Math.ceil(qte);

                    TSuggestionOrderDetails OTSuggestionOrderDetails = findFamilleInSuggestionOrderDetails(
                            OTFamille.getLgFAMILLEID());
                    boolean flag = false;
                    if (OTSuggestionOrderDetails != null) {
                        flag = true;
                    }

                    TSuggestionOrderDetails o = findIncurrent(order.getLgSUGGESTIONORDERID(),
                            OTFamille.getLgFAMILLEID(), myInt.intValue());
                    if (o == null) {
                        o = createSuggestionOrderDetail(order, OTFamille, oGr, myInt.intValue(), flag);
                    }

                    if (o != null) {
                        l.add(LgFamille);
                        order.getTSuggestionOrderDetailsCollection().add(o);
                    }
                    if ((l.size() % 2) == 0) {
                        em.getTransaction().commit();
                        em.clear();
                        em.getTransaction().begin();
                    }
                });

            });
            if (em.getTransaction().isActive()) {
                em.getTransaction().commit();
                em.clear();
                // em.close();
                this.buildErrorTraceMessage((l.size() + "/" + productList.size()) + " ont été pris en compte");
                result = (l.size());
            }
            json.put("qty", result);
            json.put("result", "Le nombre de produit suggéré : <u><span style='font-weight:900; color:blue;'>"
                    + l.size() + "/" + productList.size() + "</span></u>");

        } catch (Exception e) {

            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                // this.getOdataManager().getEm().close();
            }
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de prise en compte de la suggestion. Veuillez réessayer");
        }
        return json;

    }

    public TFamilleGrossiste findOrFamilleGrossiste(TFamille lg_FAMILLE_ID, TGrossiste lg_GROSSISTE_ID) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT LIKE ?3 ")
                    .setParameter(1, lg_FAMILLE_ID.getLgFAMILLEID()).setParameter(2, lg_GROSSISTE_ID.getLgGROSSISTEID())
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            OTFamilleGrossiste = (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {
            OTFamilleGrossiste = new TFamilleGrossiste(this.getKey().getComplexId());
            OTFamilleGrossiste.setLgFAMILLEID(lg_FAMILLE_ID);
            OTFamilleGrossiste.setLgGROSSISTEID(lg_GROSSISTE_ID);
            OTFamilleGrossiste.setDtUPDATED(new Date());
            OTFamilleGrossiste.setDtCREATED(new Date());
            OTFamilleGrossiste.setIntNBRERUPTURE(0);
            OTFamilleGrossiste.setBlRUPTURE(Boolean.TRUE);
            OTFamilleGrossiste.setStrCODEARTICLE(lg_FAMILLE_ID.getIntCIP());
            OTFamilleGrossiste.setIntPAF(lg_FAMILLE_ID.getIntPAF());
            OTFamilleGrossiste.setStrSTATUT(commonparameter.statut_enable);
            OTFamilleGrossiste.setIntPRICE(lg_FAMILLE_ID.getIntPRICE());
            this.getOdataManager().getEm().persist(OTFamilleGrossiste);
            e.printStackTrace();
        }

        return OTFamilleGrossiste;
    }

    public TSuggestionOrderDetails addToTSuggestionOrderDetails(TFamille OTFamille, TSuggestionOrder OTSuggestionOrder,
            int int_qte, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {

            this.getOdataManager().getEm().getTransaction().begin();
            OTSuggestionOrderDetails = this.isProductExist(OTFamille.getLgFAMILLEID(),
                    OTSuggestionOrder.getLgSUGGESTIONORDERID());
            if (OTSuggestionOrderDetails == null) {
                OTSuggestionOrderDetails = this.initTSuggestionOrderDetail(OTSuggestionOrder, OTFamille,
                        OTSuggestionOrder.getLgGROSSISTEID(), int_qte, str_STATUT);
            } else if (str_STATUT.equals(commonparameter.statut_is_Process)) {
                OTSuggestionOrderDetails.setIntNUMBER(int_qte + OTSuggestionOrderDetails.getIntNUMBER());
                OTSuggestionOrderDetails.setIntPRICE(
                        OTSuggestionOrderDetails.getIntNUMBER() * OTSuggestionOrderDetails.getIntPAFDETAIL());
            }
            // code ajouté
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTSuggestionOrderDetails);
            this.getOdataManager().getEm().getTransaction().commit();
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            if (this.getOdataManager().getEm().getTransaction().isActive()) {
                this.getOdataManager().getEm().getTransaction().rollback();
                this.getOdataManager().getEm().clear();
                // this.getOdataManager().getEm().close();
            }
            this.buildErrorTraceMessage("Echec d'ajout du produit à la suggestion");
        }

        this.getOdataManager().getEm().persist(OTSuggestionOrderDetails);
        new logger().OCategory
                .info("Mise a jour de OTSuggestionOrderDetails " + OTSuggestionOrderDetails.getIntNUMBER());
        return OTSuggestionOrderDetails;
    }

    private TSuggestionOrderDetails isProductExist(String lg_famille_id, String OTSuggestionOrder) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            OTSuggestionOrderDetails = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID = ?2")
                    .setParameter(1, lg_famille_id).setParameter(2, OTSuggestionOrder).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
            new logger().OCategory.info(" *** Desoleeeeeee OTSuggestionOrderDetails   5555 *** " + e.toString());
        }
        return OTSuggestionOrderDetails;
    }

    public boolean updatePriceArticle(String lg_GROSSISTE_ID, String lg_FAMILLE_ID, int int_PRICE, int int_PRICE_TIPS,
            int int_PAF, int int_PAT, String action, String str_REF, String step) {
        EntityManager em = this.getOdataManager().getEm();
        boolean result = false;
        int int_PAF_OLD = 0, int_PAT_OLD = 0, int_PRICE_OLD, int_PRICE_TIPS_OLD = 0;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
        try {
            TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);

            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();
            int_PRICE_TIPS_OLD = OTFamille.getIntPRICETIPS() != null ? OTFamille.getIntPRICETIPS()
                    : OTFamille.getIntPRICE();

            new logger().OCategory.info("step avant:" + step + "-");
            // if (step.equalsIgnoreCase(commonparameter.str_ACTION_ENTREESTOCK)) {

            em.getTransaction().begin();
            OTFamille.setIntPAF(int_PAF);
            OTFamille.setIntPAT(int_PAT);
            OTFamille.setIntPRICE(int_PRICE);
            OTFamille.setIntPRICETIPS(int_PRICE_TIPS);
            OTFamille.setDtCREATED(new Date());
            em.merge(OTFamille);
            try {
                TFamilleGrossiste familleGrossiste = findFamilleGrossiste(OTFamille, lg_GROSSISTE_ID);
                familleGrossiste.setIntPRICE(int_PRICE);
                familleGrossiste.setIntPAF(int_PAF);
                em.merge(familleGrossiste);
            } catch (Exception e) {
            }
            em.getTransaction().commit();
            // }

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            result = true;

            if ((int_PRICE_OLD != int_PRICE) || (int_PAF_OLD != int_PAF) || (int_PAT_OLD != int_PAT)
                    || (int_PRICE_TIPS_OLD != int_PRICE_TIPS)) {
                String Description = "Modification de prix à la commande de " + OTFamille.getStrDESCRIPTION()
                        + " par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".";
                if (int_PRICE_OLD != int_PRICE) {
                    Description += "Prix de vente: " + int_PRICE_OLD + " remplacé par " + int_PRICE + ".";
                    new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPrice(OTFamille,
                            commonparameter.code_action_commande, int_PRICE, int_PRICE_OLD, str_REF);
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
            em.getTransaction().rollback();
            em.clear();
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        new logger().OCategory.info(this.getDetailmessage());
        return result;
    }

    private TFamilleGrossiste findFamilleGrossiste(TFamille famille, String grossiste) {
        TypedQuery<TFamilleGrossiste> query = this.getOdataManager().getEm().createQuery(
                "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2   ",
                TFamilleGrossiste.class);
        query.setParameter(1, famille.getLgFAMILLEID()).setParameter(2, grossiste);
        query.setMaxResults(1);
        return query.getSingleResult();
    }

    // 24/06/2020
    public boolean updateItemPriceWhenOrdering(String lg_GROSSISTE_ID, String lg_FAMILLE_ID, int int_PRICE,
            int int_PRICE_TIPS, int int_PAF, int int_PAT, String action, String str_REF, String step) {
        EntityManager em = this.getOdataManager().getEm();
        boolean result = false;
        int int_PAF_OLD = 0, int_PAT_OLD = 0, int_PRICE_OLD, int_PRICE_TIPS_OLD = 0;
        familleManagement OfamilleManagement = new familleManagement(this.getOdataManager());
        try {
            TFamille OTFamille = OfamilleManagement.getTFamille(lg_FAMILLE_ID);

            int_PRICE_OLD = OTFamille.getIntPRICE();
            int_PAF_OLD = OTFamille.getIntPAF();
            int_PAT_OLD = OTFamille.getIntPAT();
            int_PRICE_TIPS_OLD = OTFamille.getIntPRICETIPS() != null ? OTFamille.getIntPRICETIPS()
                    : OTFamille.getIntPRICE();

            if ((int_PRICE_OLD != int_PRICE) || (int_PAF_OLD != int_PAF) || (int_PAT_OLD != int_PAT)
                    || (int_PRICE_TIPS_OLD != int_PRICE_TIPS)) {
                String Description = "Modification de prix à la commande de " + OTFamille.getStrDESCRIPTION()
                        + " par l'utilisateur " + this.getOTUser().getStrFIRSTNAME() + " "
                        + this.getOTUser().getStrLASTNAME() + ".";
                if (int_PRICE_OLD != int_PRICE) {
                    Description += "Prix de vente: " + int_PRICE_OLD + " remplacé par " + int_PRICE + ".";
                    new SnapshotManager(this.getOdataManager(), this.getOTUser()).SaveMouvementPrice(OTFamille,
                            commonparameter.code_action_commande, int_PRICE, int_PRICE_OLD, str_REF);
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
                updateItem(this.getOTUser(), OTFamille.getIntCIP(), Description,
                        TypeLog.MODIFICATION_INFO_PRODUIT_COMMANDE, OTFamille);
                // OfamilleManagement.sendSMS(Description, "TFamille", action, "N_UPDATE_FAMILLE_PRICE");
            }
        } catch (Exception e) {
            em.getTransaction().rollback();
            em.clear();
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        new logger().OCategory.info(this.getDetailmessage());
        return result;
    }

    public void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(eventLog.getDtCREATED());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(commonparameter.statut_enable);
        eventLog.setStrTABLECONCERN(T.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        eventLog.setStrTYPELOG(ref);
        this.getOdataManager().getEm().persist(eventLog);
    }

    public boolean updateProduitSeuil(String produitId, Integer qteSeuil) {
        TFamille famille = this.getOdataManager().getEm().find(TFamille.class, produitId);
        famille.setIntSEUILMIN(qteSeuil);
        this.merge(famille);

        return true;
    }

}
