/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.*;
import java.math.BigDecimal;
import java.math.BigInteger;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.*;

import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.ProductStateService;
import rest.service.SuggestionService;
import rest.service.dto.ArticleCsvDTO;
import rest.service.dto.SuggestionDTO;
import rest.service.dto.SuggestionOrderDetailDTO;

import rest.service.dto.SuggestionsDTO;
import util.Constant;
import static util.Constant.*;
import util.DateConverter;

import util.FunctionUtils;

/**
 * @author Kobena
 */
@Stateless
public class SuggestionImpl implements SuggestionService {

    private static final Logger LOG = Logger.getLogger(SuggestionImpl.class.getName());
    private static final String SUGGESTION_QUERY = "SELECT g.int_DATE_BUTOIR_ARTICLE AS dateButoir, SUM(d.`int_NUMBER` * d.`int_PRICE_DETAIL`) AS montantVente,SUM(d.`int_NUMBER` * d.`int_PAF_DETAIL`) AS montantAchat, o.`lg_SUGGESTION_ORDER_ID` AS id,o.`str_REF` AS reference,o.`str_STATUT` AS statut, DATE_FORMAT(o.`dt_CREATED`, '%d/%m/%Y') AS dateSuggession,DATE_FORMAT(o.`dt_CREATED`, '%k:%i:%s') AS heureSuggession, COUNT(d.`lg_SUGGESTION_ORDER_DETAILS_ID`) AS itemCount , SUM(d.`int_NUMBER`) AS productCount,o.`lg_GROSSISTE_ID` AS grossisteId,g.str_LIBELLE AS libelleGrossiste FROM  t_suggestion_order_details d JOIN t_suggestion_order o ON o.`lg_SUGGESTION_ORDER_ID`=d.`lg_SUGGESTION_ORDER_ID` JOIN t_famille f ON f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` JOIN t_grossiste g ON o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` WHERE o.`str_STATUT` IN ('is_Process','auto','pending') AND (o.`str_REF` LIKE ?1 OR f.int_CIP LIKE ?1 OR f.str_NAME LIKE ?1) GROUP BY id ORDER BY o.`dt_UPDATED` desc";
    private static final String SUGGESTION_QUERY_COUNT = "SELECT COUNT( distinct o.`lg_SUGGESTION_ORDER_ID`) AS COUNT_SUGGESTION  FROM  t_suggestion_order_details d JOIN t_suggestion_order o ON o.`lg_SUGGESTION_ORDER_ID`=d.`lg_SUGGESTION_ORDER_ID` JOIN t_famille f ON f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` JOIN t_grossiste g ON o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` WHERE o.`str_STATUT` IN ('is_Process','auto','pending') AND (o.`str_REF` LIKE ?1 OR f.int_CIP LIKE ?1 OR f.str_NAME LIKE ?1)";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ProductStateService productStateService;

    public EntityManager getEmg() {
        return em;
    }

    @Override
    public Integer getQuantityReapportByCodeGestionArticle(TFamilleStock oFamilleStock, TFamille famille) {
        int result;
        int totalJourVente = 0;
        int buttoirChoisi;
        int moisHisto;
        Integer qteReappro = 0;
        int seuilMinCalcule;
        int qteVenteArticle = 0;
        int qteVenteJour;
        try {
            List<TCoefficientPonderation> lstTCoefficientPonderations;

            int dayOfMonth = LocalDate.now().getDayOfMonth();

            TCodeGestion oCodeGestion = famille.getLgCODEGESTIONID();
            moisHisto = oCodeGestion.getIntMOISHISTORIQUEVENTE();
            // choix du butoir
            if (dayOfMonth > oCodeGestion.getIntDATEBUTOIRARTICLE()) {
                buttoirChoisi = oFamilleStock.getLgFAMILLEID().getLgGROSSISTEID().getIntDATEBUTOIRARTICLE();
                result = buttoirChoisi - dayOfMonth;

                if (!(result < oCodeGestion.getIntJOURSCOUVERTURESTOCK())) {
                    result = oCodeGestion.getIntJOURSCOUVERTURESTOCK();
                }

                if (oCodeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equals("1")) {
                    totalJourVente = nombresJourVente(LocalDate.now().minusMonths(moisHisto)).stream()
                            .map(TCalendrier::getIntNUMBERJOUR).reduce(0, Integer::sum);
                    qteVenteArticle += quantiteVendue(LocalDate.now().minusMonths(moisHisto), LocalDate.now(),
                            famille.getLgFAMILLEID());

                    if (famille.getBoolDECONDITIONNEEXIST() == 1) {

                        try {
                            double finalQty = Math
                                    .ceil(quantiteDeconditionnesVentes(LocalDate.now().minusMonths(moisHisto),
                                            LocalDate.now(), famille) / famille.getIntNUMBERDETAIL());
                            qteVenteArticle += (int) finalQty;
                        } catch (Exception e) {
                        }

                    }

                } else if (oCodeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equalsIgnoreCase("2")) {
                    lstTCoefficientPonderations = getListTCoefficientPonderation(oCodeGestion.getLgCODEGESTIONID());
                    moisHisto = oCodeGestion.getIntMOISHISTORIQUEVENTE();
                    if (lstTCoefficientPonderations.size() < oCodeGestion.getIntMOISHISTORIQUEVENTE()) {
                        moisHisto = lstTCoefficientPonderations.size();
                    }
                    qteVenteArticle += quantiteVendue(LocalDate.now().minusMonths(moisHisto), LocalDate.now(),
                            famille.getLgFAMILLEID());

                    if (famille.getBoolDECONDITIONNEEXIST() == 1) {

                        try {
                            double finalQty = Math
                                    .ceil(quantiteDeconditionnesVentes(LocalDate.now().minusMonths(moisHisto),
                                            LocalDate.now(), famille) / famille.getIntNUMBERDETAIL());
                            qteVenteArticle += (int) finalQty;
                        } catch (Exception e) {
                        }

                    }
                    qteVenteArticle = qteVenteArticle * 2;// a revoir

                    totalJourVente = nombresJourVente(LocalDate.now().minusMonths(moisHisto)).stream()
                            .map(TCalendrier::getIntNUMBERJOUR).reduce(0, Integer::sum);
                }

            } else {
                buttoirChoisi = oCodeGestion.getIntDATEBUTOIRARTICLE();
                result = buttoirChoisi - dayOfMonth;
                if (oCodeGestion.getIntDATELIMITEEXTRAPOLATION() <= dayOfMonth) {
                    totalJourVente = nombresJourVente(LocalDate.now()).stream().map(TCalendrier::getIntNUMBERJOUR)
                            .reduce(0, Integer::sum);
                    qteVenteArticle += quantiteVendue(LocalDate.now().minusMonths(moisHisto), LocalDate.now(),
                            famille.getLgFAMILLEID());

                    if (famille.getBoolDECONDITIONNEEXIST() == 1) {

                        try {
                            Double finalQty = Math
                                    .ceil(quantiteDeconditionnesVentes(LocalDate.now().minusMonths(moisHisto),
                                            LocalDate.now(), famille) / famille.getIntNUMBERDETAIL());
                            qteVenteArticle += finalQty.intValue();
                        } catch (Exception e) {
                        }

                    }
                    qteVenteArticle = qteVenteArticle * oCodeGestion.getIntCOEFFICIENTPONDERATION();// a revoir
                    moisHisto++;
                }
            }
            qteVenteJour = qteVenteArticle / totalJourVente;
            seuilMinCalcule = qteVenteJour * result;
            if (oCodeGestion.getBoolOPTIMISATIONSEUILCMDE()) {
                seuilMinCalcule = qteVenteJour * famille.getLgGROSSISTEID().getIntDELAIREAPPROVISIONNEMENT();
                if (seuilMinCalcule > oFamilleStock.getIntNUMBERAVAILABLE()) {
                    qteReappro = qteVenteJour * result;
                    qteReappro = (seuilMinCalcule - oFamilleStock.getIntNUMBERAVAILABLE()) + qteReappro;

                    Double qteReappro2 = Math
                            .ceil(qteReappro + ((famille.getLgGROSSISTEID().getIntCOEFSECURITY() * qteReappro) / 100));
                    qteReappro = qteReappro2.intValue();
                }
            } else {
                if (oFamilleStock.getLgFAMILLEID().getIntSEUILMIN() > oFamilleStock.getIntNUMBERAVAILABLE()) {
                    Double qteReapp = Math
                            .ceil((famille.getIntSEUILMIN() - oFamilleStock.getIntNUMBERAVAILABLE()) + seuilMinCalcule);
                    qteReappro = qteReapp.intValue();
                }
            }
        } catch (Exception e) {
        }
        return qteReappro;
    }

    private List<TCoefficientPonderation> getListTCoefficientPonderation(String code) {
        List<TCoefficientPonderation> lst = new ArrayList<>();
        try {
            lst = this.getEmg().createQuery(
                    "SELECT t FROM TCoefficientPonderation t WHERE t.lgCODEGESTIONID.lgCODEGESTIONID = ?1 AND t.strSTATUT = ?2 ORDER BY t.intINDICEMONTH ASC")
                    .setParameter(1, code).setParameter(2, STATUT_ENABLE).getResultList();
        } catch (Exception e) {

        }
        return lst;
    }

    public TCalendrier getTCalendrier(String monthId, int year) {
        TCalendrier oTCalendrier = null;
        try {
            oTCalendrier = (TCalendrier) this.getEmg()
                    .createQuery("SELECT t FROM TCalendrier t WHERE t.lgMONTHID.lgMONTHID = ?1 AND t.intANNEE = ?2")
                    .setParameter(1, monthId).setParameter(2, year).getSingleResult();
        } catch (Exception e) {
            //
        }
        return oTCalendrier;
    }

    public TSuggestionOrder createSuggestionOrder(TGrossiste grossiste, String strSTATUT) {

        TSuggestionOrder suggestionOrder = new TSuggestionOrder();
        suggestionOrder.setLgSUGGESTIONORDERID(UUID.randomUUID().toString());
        suggestionOrder.setStrREF("REF_" + DateConverter.getShortId(7));
        suggestionOrder.setLgGROSSISTEID(grossiste);
        suggestionOrder.setStrSTATUT(strSTATUT);
        suggestionOrder.setDtCREATED(new Date());
        suggestionOrder.setDtUPDATED(suggestionOrder.getDtCREATED());
        getEmg().persist(suggestionOrder);
        return suggestionOrder;
    }

    private TSuggestionOrder checkSuggestionGrossiteExiste(String lgGROSSISTEID) {

        try {
            TypedQuery<TSuggestionOrder> q = this.getEmg().createQuery(
                    "SELECT t FROM TSuggestionOrder t WHERE t.lgGROSSISTEID.lgGROSSISTEID =?1  AND t.strSTATUT = ?2 ORDER BY t.dtUPDATED DESC ",
                    TSuggestionOrder.class);

            q.setMaxResults(1).setParameter(1, lgGROSSISTEID).setParameter(2, STATUT_AUTO);
            return q.getSingleResult();

        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return null;

        }

    }

    private TSuggestionOrderDetails isProductExistInSomeSuggestion(String lgFamilleId, String suggestionOrderId) {
        TSuggestionOrderDetails oTSuggestionOrderDetails = null;
        try {
            oTSuggestionOrderDetails = (TSuggestionOrderDetails) getEmg().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID = ?2")
                    .setParameter(1, lgFamilleId).setParameter(2, suggestionOrderId).setMaxResults(1).getSingleResult();

        } catch (Exception e) {

        }
        return oTSuggestionOrderDetails;
    }

    private TSuggestionOrderDetails addToTSuggestionOrderDetails(TFamille famille, TGrossiste oTGrossiste,
            TSuggestionOrder oTSuggestionOrder, int qteSuggere) {
        TSuggestionOrderDetails oTSuggestionOrderDetails = isProductExistInSomeSuggestion(famille.getLgFAMILLEID(),
                oTSuggestionOrder.getLgSUGGESTIONORDERID());
        if (oTSuggestionOrderDetails == null) {
            createTSuggestionOrderDetails(oTSuggestionOrder, famille, oTGrossiste, qteSuggere);
        } else {
            oTSuggestionOrderDetails.setIntNUMBER(qteSuggere);
            oTSuggestionOrderDetails.setIntPRICE(qteSuggere * oTSuggestionOrderDetails.getIntPAFDETAIL());
            oTSuggestionOrderDetails.setDtUPDATED(new Date());

            getEmg().merge(oTSuggestionOrderDetails);
        }

        return oTSuggestionOrderDetails;
    }

    @Override
    public void makeSuggestionAuto(String oTPreenregistrement) {
        EntityManager emg = this.getEmg();
        try {
            TPreenregistrement preenregistrement = emg.find(TPreenregistrement.class, oTPreenregistrement);
            TUser user = preenregistrement.getLgUSERID();
            List<TPreenregistrementDetail> list = new ArrayList<>(
                    preenregistrement.getTPreenregistrementDetailCollection());
            makeSuggestionAuto(list, user.getLgEMPLACEMENTID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
    }

    public TFamilleStock findStock(String oTFamille, TEmplacement emplacement) {

        try {
            Query query = this.getEmg().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE  t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.strSTATUT='enable' AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2");
            query.setParameter(1, oTFamille);
            query.setParameter(2, emplacement.getLgEMPLACEMENTID());
            TFamilleStock familleStock = (TFamilleStock) query.getSingleResult();
            LOG.log(Level.INFO, "familleStock {0} ", new Object[] { familleStock });
            return familleStock;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    public void makeSuggestionAuto0(List<TPreenregistrementDetail> list, TEmplacement emplacementId) {

        try {

            list.forEach(item -> {
                TFamille famille = item.getLgFAMILLEID();
                TFamilleStock familleStock = findStock(famille.getLgFAMILLEID(), emplacementId);
                if (familleStock != null) {
                    makeSuggestionAuto(familleStock, famille);
                }

            });

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    @Override
    public void makeSuggestionAuto(List<TPreenregistrementDetail> list, TEmplacement emplacementId) {

        try {

            list.forEach(item -> {
                TFamille famille = item.getLgFAMILLEID();

                if (StringUtils.isNotEmpty(famille.getLgFAMILLEPARENTID()) && famille.getBoolDECONDITIONNE() == 1) {
                    famille = this.getEmg().find(TFamille.class, famille.getLgFAMILLEPARENTID());
                }

                TFamilleStock familleStock = findStock(famille.getLgFAMILLEID(), emplacementId);
                if (familleStock != null) {
                    makeSuggestionAuto(familleStock, famille);
                }

            });

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    @Override
    public void proccessSuggetion(TFamille famille, TEmplacement emplacementId) {

        if (StringUtils.isNotEmpty(famille.getLgFAMILLEPARENTID()) && famille.getBoolDECONDITIONNE() == 1) {
            famille = this.getEmg().find(TFamille.class, famille.getLgFAMILLEPARENTID());
        }
        TFamilleStock familleStock = findStock(famille.getLgFAMILLEID(), emplacementId);
        if (familleStock != null) {
            makeSuggestionAuto(familleStock, famille);
        }

    }

    private void update(TSuggestionOrder oSuggestionOrder) {
        oSuggestionOrder.setDtUPDATED(new Date());
        getEmg().merge(oSuggestionOrder);
    }

    private boolean checkQteSeuilCondition(TFamilleStock oFamilleStock, TFamille famille) {
        switch (getOptionSuggestion()) {
        case EQUALS:
            return oFamilleStock.getIntNUMBERAVAILABLE().compareTo(famille.getIntSEUILMIN()) == 0;
        case LESS:
            return oFamilleStock.getIntNUMBERAVAILABLE().compareTo(famille.getIntSEUILMIN()) == -1;
        case LESS_EQUALS:
            return oFamilleStock.getIntNUMBERAVAILABLE().compareTo(famille.getIntSEUILMIN()) < 1;

        default:
            return false;
        }
    }

    @Override
    public void makeSuggestionAuto(TFamilleStock oFamilleStock, TFamille famille) {
        if (famille.getBoolDECONDITIONNE() == 1 || !STATUT_ENABLE.equals(famille.getStrSTATUT())) {
            return;
        }

        if (Objects.nonNull(famille.getIntSEUILMIN()) && checkQteSeuilCondition(oFamilleStock, famille)) {

            int statut = verifierProduitDansLeProcessusDeCommande(famille);
            if (statut == 0 || statut == 1) {
                TSuggestionOrder oSuggestionOrder;
                int intQTEASUGGERE;
                TGrossiste grossiste = famille.getLgGROSSISTEID();
                if (grossiste != null) {
                    oSuggestionOrder = checkSuggestionGrossiteExiste(grossiste.getLgGROSSISTEID());
                    if (statut == 0) {
                        intQTEASUGGERE = calcQteReappro(oFamilleStock, famille);
                        if (oSuggestionOrder == null) {
                            oSuggestionOrder = createSuggestionOrder(grossiste, STATUT_AUTO);
                            createTSuggestionOrderDetails(oSuggestionOrder, famille, grossiste, intQTEASUGGERE);
                        } else {
                            addToTSuggestionOrderDetails(famille, grossiste, oSuggestionOrder, intQTEASUGGERE);
                            update(oSuggestionOrder);
                        }
                    } else {
                        if (oSuggestionOrder != null) {
                            intQTEASUGGERE = calcQteReappro(oFamilleStock, famille);
                            addToTSuggestionOrderDetails(famille, grossiste, oSuggestionOrder, intQTEASUGGERE);
                            update(oSuggestionOrder);
                        }

                    }
                }

            }
        }
    }

    private TFamilleGrossiste findOrCreateFamilleGrossiste(TFamille lgFAMILLEID, TGrossiste lgGROSSISTEID) {
        TFamilleGrossiste oTFamilleGrossiste;
        try {
            Query qry = getEmg().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2  AND t.strSTATUT = ?3 ")
                    .setParameter(1, lgFAMILLEID.getLgFAMILLEID()).setParameter(2, lgGROSSISTEID.getLgGROSSISTEID())
                    .setParameter(3, STATUT_ENABLE);
            qry.setMaxResults(1);
            oTFamilleGrossiste = (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {
            oTFamilleGrossiste = new TFamilleGrossiste(UUID.randomUUID().toString());
            oTFamilleGrossiste.setLgFAMILLEID(lgFAMILLEID);
            oTFamilleGrossiste.setLgGROSSISTEID(lgGROSSISTEID);
            oTFamilleGrossiste.setDtCREATED(new Date());
            oTFamilleGrossiste.setDtUPDATED(oTFamilleGrossiste.getDtCREATED());
            oTFamilleGrossiste.setIntNBRERUPTURE(0);
            oTFamilleGrossiste.setBlRUPTURE(true);
            oTFamilleGrossiste.setStrCODEARTICLE(lgFAMILLEID.getIntCIP());
            oTFamilleGrossiste.setIntPAF(lgFAMILLEID.getIntPAF());
            oTFamilleGrossiste.setStrSTATUT(STATUT_ENABLE);
            oTFamilleGrossiste.setIntPRICE(lgFAMILLEID.getIntPRICE());
            getEmg().persist(oTFamilleGrossiste);

        }

        return oTFamilleGrossiste;
    }

    private TSuggestionOrderDetails initTSuggestionOrderDetail(TSuggestionOrder suggestionOrder, TFamille famille,
            TGrossiste grossiste, int intNumber) {
        TFamilleGrossiste familleGrossiste = findOrCreateFamilleGrossiste(famille, grossiste);
        TSuggestionOrderDetails orderDetails = new TSuggestionOrderDetails();
        orderDetails.setLgSUGGESTIONORDERDETAILSID(UUID.randomUUID().toString());
        orderDetails.setLgSUGGESTIONORDERID(suggestionOrder);
        orderDetails.setLgFAMILLEID(famille);
        orderDetails.setLgGROSSISTEID(grossiste);
        orderDetails.setIntNUMBER(intNumber);
        orderDetails.setIntPRICE(
                (familleGrossiste != null && familleGrossiste.getIntPAF() != null && familleGrossiste.getIntPAF() != 0)
                        ? familleGrossiste.getIntPAF() * intNumber : famille.getIntPAF() * intNumber);
        orderDetails.setIntPAFDETAIL(
                (familleGrossiste != null && familleGrossiste.getIntPAF() != null && familleGrossiste.getIntPAF() != 0)
                        ? familleGrossiste.getIntPAF() : famille.getIntPAF());
        orderDetails.setIntPRICEDETAIL((familleGrossiste != null && familleGrossiste.getIntPRICE() != null
                && familleGrossiste.getIntPRICE() != 0) ? familleGrossiste.getIntPRICE() : famille.getIntPRICE());
        orderDetails.setStrSTATUT(STATUT_IS_PROGRESS);
        orderDetails.setDtCREATED(new Date());
        orderDetails.setDtUPDATED(orderDetails.getDtCREATED());
        getEmg().persist(orderDetails);
        return orderDetails;

    }

    public TSuggestionOrderDetails findFamilleInTSuggestionOrderDetails(String lgSUGGESTIONORDERID,
            String lgfamilleId) {
        TSuggestionOrderDetails oTSuggestionOrderDetails = null;
        try {
            Query qry = this.getEmg().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID = ?2 ")
                    .setParameter(2, lgSUGGESTIONORDERID).setParameter(1, lgfamilleId).setMaxResults(1);
            oTSuggestionOrderDetails = (TSuggestionOrderDetails) qry.getSingleResult();

        } catch (Exception e) {

        }
        return oTSuggestionOrderDetails;
    }

    public void createTSuggestionOrderDetails(TSuggestionOrder suggestionOrder, TFamille oTFamille,
            TGrossiste oTGrossiste, int intNUMBER) {
        initTSuggestionOrderDetail(suggestionOrder, oTFamille, oTGrossiste, intNUMBER);

    }

    private Integer quantiteVendue(LocalDate dtDEBUT, LocalDate dtFin, String produitId) {
        Integer qty = 0;
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = this.getEmg().getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            cq.select(cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)));
            predicates.add(
                    cb.and(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get("lgFAMILLEID"), produitId)));
            predicates.add(cb.and(cb.equal(root.get(TPreenregistrementDetail_.strSTATUT), STATUT_IS_CLOSED)));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrementDetail_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicates.add(cb.and(btw));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = this.getEmg().createQuery(cq);
            return (Integer) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return qty;
    }

    public int calcQteReappro(TFamilleStock oFamilleStock, TFamille tf) {
        int qteReappro = 1;
        try {
            TCodeGestion codeGestion = tf.getLgCODEGESTIONID();
            if (codeGestion != null
                    && (!codeGestion.getLgOPTIMISATIONQUANTITEID().getStrCODEOPTIMISATION().equals("0"))) {
                qteReappro = getQuantityReapportByCodeGestionArticle(oFamilleStock, tf);

            } else if (Objects.nonNull(tf.getIntQTEREAPPROVISIONNEMENT())) {

                qteReappro = (tf.getIntSEUILMIN() - oFamilleStock.getIntNUMBERAVAILABLE())
                        + tf.getIntQTEREAPPROVISIONNEMENT();

            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return (qteReappro > 0 ? qteReappro : 1);
    }

    public Integer quantiteDeconditionnesVentes(LocalDate dtDEBUT, LocalDate dtFin, TFamille produitId) {
        Integer qty = 0;
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = this.getEmg().getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            cq.select(cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)));
            predicates.add(cb.and(cb.equal(
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEPARENTID).get("lgFAMILLEID"),
                    produitId.getLgFAMILLEID())));
            predicates.add(cb.and(cb.equal(root.get(TPreenregistrementDetail_.strSTATUT), STATUT_IS_CLOSED)));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrementDetail_.dtCREATED)),
                    java.sql.Date.valueOf(dtDEBUT), java.sql.Date.valueOf(dtFin));
            predicates.add(cb.and(btw));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = this.getEmg().createQuery(cq);
            return (Integer) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return qty;
    }

    @Override
    public List<TCalendrier> nombresJourVente(LocalDate begin) {
        try {
            TypedQuery<TCalendrier> tq = this.getEmg()
                    .createQuery("SELECT o FROM TCalendrier o WHERE o.lgMONTHID.lgMONTHID   =?1", TCalendrier.class);
            tq.setParameter(1, begin.getMonthValue());
            return tq.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TSuggestionOrderDetails> findFamillesBySuggestion(String suggestionId) {
        try {
            TypedQuery<TSuggestionOrderDetails> q = getEmg().createQuery(
                    "SELECT o FROM TSuggestionOrderDetails o WHERE o.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID=?1 ",
                    TSuggestionOrderDetails.class);
            q.setParameter(1, suggestionId);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private int verifierProduitDansLeProcessusDeCommande(TFamille famille) {
        int statut = verifierProduitCommande(famille);
        if (statut == 0) {
            statut = verifierProduitDansSuggestion(famille);
        }
        return statut;
    }

    private int verifierProduitDansSuggestion(TFamille famille) {
        try {
            TypedQuery<TSuggestionOrderDetails> q = getEmg().createQuery(
                    "SELECT o FROM TSuggestionOrderDetails o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND ( o.strSTATUT=?2 OR o.strSTATUT=?3 OR o.strSTATUT=?4  ) ",
                    TSuggestionOrderDetails.class);
            q.setParameter(1, famille.getLgFAMILLEID());
            q.setParameter(2, STATUT_AUTO);
            q.setParameter(3, STATUT_IS_PROGRESS);

            q.setMaxResults(1);
            return q.getSingleResult() != null ? 1 : 0;

        } catch (Exception e) {
            return 0;
        }
    }

    private int verifierProduitCommande(TFamille famille) {
        try {
            TypedQuery<TOrderDetail> q = getEmg().createQuery(
                    "SELECT o FROM TOrderDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgORDERID.recu=?2 ",
                    TOrderDetail.class);
            q.setParameter(1, famille.getLgFAMILLEID());
            q.setParameter(2, Boolean.FALSE);
            q.setMaxResults(1);
            TOrderDetail detail = q.getSingleResult();

            if (detail == null) {
                return 0;
            }
            if (detail.getStrSTATUT().equals(STATUT_IS_PROGRESS)) {
                return 2;
            }

            if (detail.getStrSTATUT().equals(STATUT_IS_CLOSED)) {
                return 4;
            }
            return 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public JSONObject makeSuggestion(List<VenteDetailsDTO> datas) throws JSONException {
        try {
            LongAdder count = new LongAdder();
            Map<String, List<VenteDetailsDTO>> groupingByGrossisteId = datas.stream()
                    .collect(Collectors.groupingBy(VenteDetailsDTO::getTypeVente));
            groupingByGrossisteId.forEach((k, v) -> {
                TGrossiste oGrossiste = getEmg().find(TGrossiste.class, k);
                TSuggestionOrder suggestionOrder = createSuggestionOrder(oGrossiste, STATUT_IS_PROGRESS);
                v.forEach(o -> {
                    TFamille oFamille = getEmg().find(TFamille.class, o.getLgFAMILLEID());
                    initTSuggestionOrderDetail(suggestionOrder, oFamille, oGrossiste, o.getIntQUANTITY());
                    count.increment();
                });

            });
            return new JSONObject().put("success", true).put("count", count.intValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }

    }

    @Override
    public JSONObject makeSuggestion(Set<VenteDetailsDTO> datas) throws JSONException {
        try {
            LongAdder count = new LongAdder();
            Map<String, List<VenteDetailsDTO>> groupingByGrossisteId = datas.stream()
                    .collect(Collectors.groupingBy(VenteDetailsDTO::getTypeVente));
            groupingByGrossisteId.forEach((k, v) -> {
                TGrossiste oGrossiste = getEmg().find(TGrossiste.class, k);
                TSuggestionOrder suggestionOrder = createSuggestionOrder(oGrossiste, STATUT_IS_PROGRESS);
                v.forEach(o -> {
                    TFamille oFamille = getEmg().find(TFamille.class, o.getLgFAMILLEID());
                    initTSuggestionOrderDetail(suggestionOrder, oFamille, oGrossiste, o.getIntQUANTITY());
                    count.increment();
                });

            });
            return new JSONObject().put("success", true).put("count", count.intValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }

    }

    @Override
    public JSONObject makeSuggestionFromArticleInvendus(List<ArticleDTO> datas, TUser u) throws JSONException {
        try {
            LongAdder count = new LongAdder();
            Map<String, List<ArticleDTO>> groupingByGrossisteId = datas.stream()
                    .collect(Collectors.groupingBy(ArticleDTO::getGrossisteId));
            groupingByGrossisteId.forEach((k, v) -> {
                TGrossiste grossiste = getEmg().find(TGrossiste.class, k);
                TSuggestionOrder suggestionOrder = createSuggestionOrder(grossiste, STATUT_IS_PROGRESS);
                v.forEach(o -> {
                    TFamille otfamille = getEmg().find(TFamille.class, o.getId());
                    TFamilleStock familleStock = findStock(otfamille.getLgFAMILLEID(), u.getLgEMPLACEMENTID());
                    if (otfamille.getBoolDECONDITIONNE().compareTo(Short.valueOf("0")) == 0 && familleStock != null) {
                        initTSuggestionOrderDetail(suggestionOrder, otfamille, grossiste,
                                (otfamille.getIntQTEREAPPROVISIONNEMENT() > 0 ? otfamille.getIntQTEREAPPROVISIONNEMENT()
                                        : 0));
                        count.increment();
                    }

                });

            });
            return new JSONObject().put("success", true).put("count", count.intValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public JSONObject findCHDetailStock(String idProduit, String emplacement) {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TFamilleStock> q = getEmg().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEPARENTID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2",
                    TFamilleStock.class);
            q.setParameter(1, idProduit);
            q.setParameter(2, emplacement);
            q.setMaxResults(1);
            TFamilleStock familleStock = q.getSingleResult();
            json.put("success", true);
            json.put("stock", familleStock.getIntNUMBERAVAILABLE());
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false);
            return json;
        }
    }

    @Override
    public void removeItem(String itemId) {

        TSuggestionOrderDetails item = getItem(itemId);
        if (Objects.nonNull(item)) {
            getEmg().remove(item);
        }

    }

    @Override
    public SuggestionDTO getSuggestionAmount(String suggestionId) {
        long montantAchat = 0;
        long montantVente = 0;
        try {
            TSuggestionOrder order = getEmg().find(TSuggestionOrder.class, suggestionId);

            for (TSuggestionOrderDetails item : order.getTSuggestionOrderDetailsCollection()) {
                montantAchat += item.getIntPRICE();
                montantVente += ((long) item.getIntPRICEDETAIL() * item.getIntNUMBER());
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return SuggestionDTO.builder().montantAchat(montantAchat).montantVente(montantVente).build();

    }

    @Override
    public void addItem(SuggestionOrderDetailDTO suggestionOrderDetail) {

        Objects.requireNonNull(suggestionOrderDetail.getQte(), "La quantité ne doit pas être null");
        TSuggestionOrder order = getEmg().find(TSuggestionOrder.class, suggestionOrderDetail.getSuggestionId());
        TGrossiste grossiste = order.getLgGROSSISTEID();
        TFamille famille = getEmg().find(TFamille.class, suggestionOrderDetail.getFamilleId());
        TSuggestionOrderDetails suggestionOrderDetails = isProductExist(famille.getLgFAMILLEID(),
                order.getLgSUGGESTIONORDERID());
        if (Objects.isNull(suggestionOrderDetails)) {
            initTSuggestionOrderDetail(order, famille, grossiste, suggestionOrderDetail.getQte());

        } else {
            suggestionOrderDetails.setIntNUMBER(suggestionOrderDetail.getQte() + suggestionOrderDetails.getIntNUMBER());
            suggestionOrderDetails
                    .setIntPRICE(suggestionOrderDetails.getIntNUMBER() * suggestionOrderDetails.getIntPAFDETAIL());
            getEmg().merge(suggestionOrderDetails);
        }

    }

    private TSuggestionOrderDetails isProductExist(String lgFamilleId, String suggId) {
        TSuggestionOrderDetails suggestionOrderDetails = null;
        try {
            suggestionOrderDetails = (TSuggestionOrderDetails) this.getEmg().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.lgSUGGESTIONORDERID = ?2")
                    .setParameter(1, lgFamilleId).setParameter(2, suggId).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getMessage());

        }
        return suggestionOrderDetails;
    }

    @Override
    public void updateItemSeuil(SuggestionOrderDetailDTO suggestionOrderDetail) {
        Objects.requireNonNull(suggestionOrderDetail.getSeuil(), "Le seuil ne doit pas être null");
        TSuggestionOrderDetails suggestionOrderDetails = getItem(suggestionOrderDetail.getItemId());
        if (Objects.nonNull(suggestionOrderDetails)) {
            TFamille famille = suggestionOrderDetails.getLgFAMILLEID();
            famille.setIntSEUILMIN(suggestionOrderDetail.getSeuil());
            famille.setDtUPDATED(new Date());
            getEmg().merge(famille);
        }

    }

    @Override
    public void updateItemQteCmde(SuggestionOrderDetailDTO suggestionOrderDetail) {
        Objects.requireNonNull(suggestionOrderDetail.getQte(), "Le quantité ne doit pas être null");
        TSuggestionOrderDetails suggestionOrderDetails = getItem(suggestionOrderDetail.getItemId());
        if (Objects.nonNull(suggestionOrderDetails)) {
            suggestionOrderDetails.setIntNUMBER(suggestionOrderDetail.getQte());
            suggestionOrderDetails
                    .setIntPRICE(suggestionOrderDetail.getQte() * suggestionOrderDetails.getIntPAFDETAIL());
            suggestionOrderDetails.setDtUPDATED(new Date());
            getEmg().merge(suggestionOrderDetails);
        }

    }

    @Override
    public void updateItemQtePrixPaf(SuggestionOrderDetailDTO suggestionOrderDetail) {
        Objects.requireNonNull(suggestionOrderDetail.getPrixPaf(), "Le prix achat ne doit pas être null");
        TSuggestionOrderDetails suggestionOrderDetails = getItem(suggestionOrderDetail.getItemId());
        if (Objects.nonNull(suggestionOrderDetails)) {
            suggestionOrderDetails.setIntPAFDETAIL(suggestionOrderDetail.getPrixPaf());
            suggestionOrderDetails
                    .setIntPRICE(suggestionOrderDetails.getIntNUMBER() * suggestionOrderDetails.getIntPAFDETAIL());
            suggestionOrderDetails.setDtUPDATED(new Date());
            getEmg().merge(suggestionOrderDetails);
        }
    }

    @Override
    public void updateItemQtePrixVente(SuggestionOrderDetailDTO suggestionOrderDetail) {
        Objects.requireNonNull(suggestionOrderDetail.getPrixVente(), "Le prix de vente ne doit pas être null");
        TSuggestionOrderDetails suggestionOrderDetails = getItem(suggestionOrderDetail.getItemId());
        if (Objects.nonNull(suggestionOrderDetails)) {
            suggestionOrderDetails.setIntPRICEDETAIL(suggestionOrderDetail.getPrixVente());
            suggestionOrderDetails.setDtUPDATED(new Date());
            getEmg().merge(suggestionOrderDetails);
        }
    }

    @Override
    public SuggestionDTO create(SuggestionDTO suggestion) {
        TGrossiste grossiste = this.getEmg().find(TGrossiste.class, suggestion.getGrossisteId());
        TSuggestionOrder suggestionOrder = createSuggestionOrder(grossiste, STATUT_IS_PROGRESS);
        TSuggestionOrderDetails details = addItem(suggestion.getItem(), suggestionOrder);
        return SuggestionDTO.builder().montantAchat(details.getIntPRICE())
                .montantVente((long) details.getIntPRICEDETAIL() * details.getIntNUMBER()).build();
    }

    private TSuggestionOrderDetails addItem(SuggestionOrderDetailDTO suggestionOrderDetail, TSuggestionOrder order) {
        Objects.requireNonNull(suggestionOrderDetail.getQte(), "La quantité ne doit pas être null");
        TGrossiste grossiste = order.getLgGROSSISTEID();
        TFamille famille = getEmg().find(TFamille.class, suggestionOrderDetail.getFamilleId());

        return initTSuggestionOrderDetail(order, famille, grossiste, suggestionOrderDetail.getQte());

    }

    @Override
    public JSONObject fetch(String search, int start, int limit) {
        search = StringUtils.isNotEmpty(search) ? search + "%" : "%%";
        int count = getSuggestionCount(search);

        return FunctionUtils.returnData(getListSuggestion(search, start, limit).stream()
                .map(this::buildSuggestionsFromTuple).collect(Collectors.toList()), count);

    }

    private TSuggestionOrderDetails getItem(String id) {
        return getEmg().find(TSuggestionOrderDetails.class, id);
    }

    @Override
    public void setToPending(String id) {
        TSuggestionOrder order = this.getEmg().find(TSuggestionOrder.class, id);
        order.setStrSTATUT(STATUT_PENDING);
        this.getEmg().merge(order);
    }

    private List<Tuple> getListSuggestion(String query, int start, int limit) {
        try {
            Query q = em.createNativeQuery(SUGGESTION_QUERY, Tuple.class).setParameter(1, query);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private int getSuggestionCount(String query) {
        try {
            Query q = em.createNativeQuery(SUGGESTION_QUERY_COUNT).setParameter(1, query);

            return ((Number) q.getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private SuggestionsDTO buildSuggestionsFromTuple(Tuple t) {
        SuggestionsDTO suggestions = new SuggestionsDTO();
        suggestions.setDateButoir(t.get("dateButoir", Integer.class));
        suggestions.setMontantAchat(t.get("montantAchat", BigDecimal.class).intValue());
        suggestions.setMontantVente(t.get("montantVente", BigDecimal.class).intValue());
        suggestions.setLgGROSSISTEID(t.get("grossisteId", String.class));
        suggestions.setGrossisteId(t.get("libelleGrossiste", String.class));
        suggestions.setGrossisteId(t.get("libelleGrossiste", String.class));
        suggestions.setNbreLigne(t.get("itemCount", BigInteger.class).intValue());
        suggestions.setTotalQty(t.get("productCount", BigDecimal.class).intValue());
        suggestions.setDtCREATED(t.get("dateSuggession", String.class));
        suggestions.setDtUPDATED(t.get("heureSuggession", String.class));
        suggestions.setStrREF(t.get("reference", String.class));
        suggestions.setStrSTATUT(t.get("statut", String.class));
        suggestions.setLgSUGGESTIONORDERID(t.get("id", String.class));
        return suggestions;
    }

    private List<TSuggestionOrderDetails> fetchSuggestionOrderDetails(String searchValue, String suggOrder, int start,
            int limit) {

        List<TSuggestionOrderDetails> detailses = new ArrayList<>();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TSuggestionOrderDetails> cq = cb.createQuery(TSuggestionOrderDetails.class);
            Root<TSuggestionOrderDetails> root = cq.from(TSuggestionOrderDetails.class);
            Join<TSuggestionOrderDetails, TSuggestionOrder> join = root.join("lgSUGGESTIONORDERID", JoinType.INNER);
            Join<TSuggestionOrderDetails, TFamille> f = root.join("lgFAMILLEID", JoinType.INNER);
            cq.select(root).orderBy(cb.asc(f.get(TFamille_.strNAME)));
            List<Predicate> predicates = fetchItemsPredicates(cb, f, join, searchValue, suggOrder);

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TSuggestionOrderDetails> q = em.createQuery(cq);

            q.setFirstResult(start);
            q.setMaxResults(limit);

            detailses = q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return detailses;
    }

    private List<Predicate> fetchItemsPredicates(CriteriaBuilder cb, Join<TSuggestionOrderDetails, TFamille> f,
            Join<TSuggestionOrderDetails, TSuggestionOrder> join, String searchValue, String suggOrder) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(join.get(TSuggestionOrder_.lgSUGGESTIONORDERID), suggOrder));
        if (StringUtils.isNotEmpty(searchValue)) {
            searchValue = searchValue + "%";
            predicates.add(cb.or(cb.like(f.get(TFamille_.intCIP), searchValue),
                    cb.like(f.get(TFamille_.strNAME), searchValue), cb.like(f.get(TFamille_.intEAN13), searchValue)));

        }
        return predicates;
    }

    private int fetchItemsCount(String searchValue, String suggOrder) {

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TSuggestionOrderDetails> root = cq.from(TSuggestionOrderDetails.class);
            Join<TSuggestionOrderDetails, TSuggestionOrder> join = root.join("lgSUGGESTIONORDERID", JoinType.INNER);
            Join<TSuggestionOrderDetails, TFamille> f = root.join("lgFAMILLEID", JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = fetchItemsPredicates(cb, f, join, searchValue, suggOrder);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } catch (Exception e) {

            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private int getProduitQuantity(String lgFamille, int month, int year, String empl) {

        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TFamille> prf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("bISCANCEL"), false));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgPREENREGISTREMENTID").get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("strSTATUT"), "is_Closed"));
            criteria = cb.and(criteria, cb.equal(
                    root.get("lgPREENREGISTREMENTID").get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    empl));
            Predicate pu = cb.greaterThan(root.get("lgPREENREGISTREMENTID").get("intPRICE"), 0);
            cb.and(criteria, pu);
            Predicate pu2 = cb.greaterThan(root.get(TPreenregistrementDetail_.intQUANTITY), 0);
            criteria = cb.and(criteria, cb.equal(prf.get(TFamille_.lgFAMILLEID), lgFamille));
            Predicate btw = cb.equal(cb.function("MONTH", Integer.class, root.get("dtCREATED")), month);
            Predicate btw2 = cb.equal(cb.function("YEAR", Integer.class, root.get("dtCREATED")), year);
            cq.select(cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY)));
            cq.where(criteria, btw, pu2, btw2, pu);
            Query q = em.createQuery(cq);
            Long r = (Long) q.getSingleResult();
            return (r != null ? r.intValue() : 0);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    public TFamilleStock getTProductItemStock(String lgId, String lgEMPLACEMENTID) {
        TFamilleStock productItemStock = null;

        try {
            productItemStock = em.createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable'",
                    TFamilleStock.class).setParameter(1, lgId).setParameter(2, lgEMPLACEMENTID).setFirstResult(0)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {

            LOG.log(Level.SEVERE, null, e);
        }
        return productItemStock;
    }

    public TFamilleGrossiste findFamilleGrossiste(String lgFAMILLEID, String lgGROSSISTEID) {
        TFamilleGrossiste familleGrossiste = null;

        try {
            Query qry = em.createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2  AND t.strSTATUT = ?3 ")
                    .setParameter(1, lgFAMILLEID).setParameter(2, lgGROSSISTEID).setParameter(3, STATUT_ENABLE);
            qry.setMaxResults(1);
            familleGrossiste = (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {

            LOG.log(Level.SEVERE, null, e);
        }

        return familleGrossiste;
    }

    @Override
    public JSONObject fetchItems(String suggestionId, String searchValue, TUser tUser, int start, int limit) {
        // removeInBulk(supprimerLigneSuggestion(suggestionId));
        JSONObject data = new JSONObject();
        int count = fetchItemsCount(searchValue, suggestionId);
        if (count == 0) {
            return data.put("total", count).put("data", Collections.emptyList());
        }
        List<TSuggestionOrderDetails> detailses = fetchSuggestionOrderDetails(searchValue, suggestionId, start, limit);

        TGrossiste grossiste = detailses.get(0).getLgSUGGESTIONORDERID().getLgGROSSISTEID();
        try {

            JSONArray arrayObj = new JSONArray();
            Integer intACHAT = 0;
            Integer intVENTE = 0;
            String empl = tUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            LocalDate today = LocalDate.now();
            LocalDate moisUn = LocalDate.of(today.getYear(), today.getMonthValue(), 1);
            LocalDate nMoinsUn = moisUn.minusMonths(1);
            LocalDate nMoinsDeux = moisUn.minusMonths(2);
            LocalDate nMoinsTrois = moisUn.minusMonths(3);
            data.put("total", count);

            for (TSuggestionOrderDetails order : detailses) {
                TFamille famille = order.getLgFAMILLEID();
                JSONObject json = new JSONObject();
                TFamilleStock oTFamillestock = getTProductItemStock(famille.getLgFAMILLEID(), empl);
                if (oTFamillestock == null) {
                    continue;
                }
                TFamilleGrossiste familleGrossiste = findFamilleGrossiste(famille.getLgFAMILLEID(),
                        grossiste.getLgGROSSISTEID());
                json.put("lg_SUGGESTION_ORDER_DETAILS_ID", order.getLgSUGGESTIONORDERDETAILSID());
                json.put("lg_FAMILLE_ID", famille.getLgFAMILLEID());
                json.put("bool_DECONDITIONNE_EXIST", famille.getBoolDECONDITIONNEEXIST());
                json.put("lg_GROSSISTE_ID", order.getLgGROSSISTEID().getLgGROSSISTEID());
                json.put("str_FAMILLE_CIP",
                        (familleGrossiste != null ? familleGrossiste.getStrCODEARTICLE() : famille.getIntCIP()));
                json.put("str_FAMILLE_NAME", famille.getStrDESCRIPTION());
                json.put("int_DATE_BUTOIR_ARTICLE", (famille.getLgCODEGESTIONID() != null
                        ? famille.getLgCODEGESTIONID().getIntDATEBUTOIRARTICLE() : 0));
                json.put("int_STOCK", oTFamillestock.getIntNUMBERAVAILABLE());

                json.put("int_NUMBER", order.getIntNUMBER());

                json.put("produitState", new JSONObject(productStateService.getEtatProduit(famille.getLgFAMILLEID())));
                json.put("int_SEUIL", famille.getIntSEUILMIN());
                json.put("str_STATUT", order.getStrSTATUT());
                json.put("lg_FAMILLE_PRIX_VENTE", order.getIntPRICEDETAIL());
                json.put("lg_FAMILLE_PRIX_ACHAT", famille.getIntPAT());
                json.put("int_PAF_SUGG", order.getIntPAFDETAIL());
                json.put("int_PRIX_REFERENCE", famille.getIntPRICETIPS());
                json.put("lg_SUGGESTION_ORDER_ID", order.getLgSUGGESTIONORDERID().getLgSUGGESTIONORDERID());

                int intQTEREASSORT = 0;
                try {
                    intQTEREASSORT = oTFamillestock.getIntNUMBERAVAILABLE() - famille.getIntSEUILMIN();

                    if (intQTEREASSORT < 0) {
                        intQTEREASSORT = -1 * intQTEREASSORT;
                    } else {
                        intQTEREASSORT = 0;
                    }
                } catch (Exception e) {
                }
                json.put("int_QTE_REASSORT", intQTEREASSORT);

                intACHAT = intACHAT + order.getIntPAFDETAIL();

                intVENTE = intVENTE + order.getIntPRICEDETAIL();

                json.put("int_ACHAT", intACHAT);
                json.put("int_VENTE", intVENTE);

                json.put("int_VALUE0",
                        getProduitQuantity(famille.getLgFAMILLEID(), moisUn.getMonthValue(), moisUn.getYear(), empl));
                json.put("int_VALUE1", getProduitQuantity(famille.getLgFAMILLEID(), nMoinsUn.getMonthValue(),
                        nMoinsUn.getYear(), empl));
                json.put("int_VALUE2", getProduitQuantity(famille.getLgFAMILLEID(), nMoinsDeux.getMonthValue(),
                        nMoinsDeux.getYear(), empl));
                json.put("int_VALUE3", getProduitQuantity(famille.getLgFAMILLEID(), nMoinsTrois.getMonthValue(),
                        nMoinsTrois.getYear(), empl));
                arrayObj.put(json);

            }
            data.put("data", arrayObj);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return data;
    }

    @Override
    public void deleteSuggestion(String suggestionId) {
        TSuggestionOrder suggestionOrder = em.find(TSuggestionOrder.class, suggestionId);
        if (Objects.nonNull(suggestionOrder)) {

            em.remove(suggestionOrder);
        }

    }

    @Override
    public boolean changeGrossiste(String suggestionId, String grossisteId) {
        TSuggestionOrder suggestionOrder = this.em.find(TSuggestionOrder.class, suggestionId);
        TGrossiste grossiste = this.em.find(TGrossiste.class, grossisteId);
        boolean existAnother = existAnotherSuggesstion(grossiste);
        suggestionOrder.setLgGROSSISTEID(grossiste);
        suggestionOrder.setDtUPDATED(new Date());
        this.em.merge(suggestionOrder);
        return existAnother;
    }

    private boolean existAnotherSuggesstion(TGrossiste grossiste) {
        try {
            Query count = this.em
                    .createQuery("SELECT COUNT(o) FROM TSuggestionOrder o WHERE o.lgGROSSISTEID.lgGROSSISTEID=?1")
                    .setParameter(1, grossiste.getLgGROSSISTEID());
            return ((Number) count.getSingleResult()).intValue() > 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return false;
        }
    }

    private List<TSuggestionOrder> getAnotherSuggesstions(TGrossiste grossiste, String suggestionId) {
        try {
            TypedQuery<TSuggestionOrder> query = this.em.createQuery(
                    "SELECT o FROM TSuggestionOrder o WHERE o.lgGROSSISTEID.lgGROSSISTEID=?1 AND o.lgSUGGESTIONORDERID <>?2 ",
                    TSuggestionOrder.class).setParameter(1, grossiste.getLgGROSSISTEID()).setParameter(2, suggestionId);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public void mergeSuggestion(String suggestionId, String grossisteId) {
        TSuggestionOrder suggestionOrder = this.em.find(TSuggestionOrder.class, suggestionId);
        TGrossiste grossiste = this.em.find(TGrossiste.class, grossisteId);
        Collection<TSuggestionOrderDetails> tOrderDetailCollection = suggestionOrder
                .getTSuggestionOrderDetailsCollection();

        List<TSuggestionOrder> suggestionOrders = this.getAnotherSuggesstions(grossiste, suggestionId);

        for (TSuggestionOrder order0 : suggestionOrders) {

            for (TSuggestionOrderDetails tOrderDetail : order0.getTSuggestionOrderDetailsCollection()) {
                TFamille famille = tOrderDetail.getLgFAMILLEID();
                boolean isExist = false;
                for (TSuggestionOrderDetails ite : tOrderDetailCollection) {
                    if (famille.getLgFAMILLEID().equals(ite.getLgFAMILLEID().getLgFAMILLEID())) {
                        ite.setIntNUMBER(ite.getIntNUMBER() + tOrderDetail.getIntNUMBER());
                        this.em.merge(ite);

                        isExist = true;
                        break;
                    }
                }
                if (!isExist) {
                    TSuggestionOrderDetails orderDetail = createMergeDetails(suggestionOrder, tOrderDetail);
                    tOrderDetailCollection.add(orderDetail);

                }
            }
            this.em.remove(order0);
            suggestionOrder.setDtUPDATED(new Date());
            this.em.merge(suggestionOrder);

        }
    }

    private TSuggestionOrderDetails createMergeDetails(TSuggestionOrder suggestionOrder, TSuggestionOrderDetails ite) {
        TSuggestionOrderDetails cloned = ite.clone();
        cloned.setLgSUGGESTIONORDERID(suggestionOrder);
        cloned.setLgSUGGESTIONORDERDETAILSID(UUID.randomUUID().toString());
        cloned.setDtCREATED(suggestionOrder.getDtUPDATED());
        cloned.setDtUPDATED(suggestionOrder.getDtUPDATED());
        cloned.setLgGROSSISTEID(suggestionOrder.getLgGROSSISTEID());
        this.em.persist(cloned);
        return cloned;
    }

    @Override
    public List<ArticleCsvDTO> buildBySuggestion(String suggestionId) {
        List<Tuple> detailses = getSuggestionDetail(suggestionId);
        List<ArticleCsvDTO> articleCsvs = new ArrayList<>();
        detailses.forEach(t -> {
            String parentCip = t.get("parentCip", String.class);
            String codeCip = t.get("codeEan", String.class);
            String grossisteCip = t.get("grossisteCip", String.class);
            int quantite = t.get("quantite", Integer.class);
            if (StringUtils.isBlank(codeCip)) {
                if (StringUtils.isNotBlank(grossisteCip)) {
                    codeCip = grossisteCip;
                } else {
                    codeCip = parentCip;
                }
            }
            articleCsvs.add(new ArticleCsvDTO(codeCip, quantite));
        });
        return articleCsvs;
    }

    @Override
    public JSONObject suggererQteReappro(Set<VenteDetailsDTO> datas) {
        try {
            LongAdder count = new LongAdder();
            Map<String, List<VenteDetailsDTO>> groupingByGrossisteId = datas.stream()
                    .collect(Collectors.groupingBy(VenteDetailsDTO::getTypeVente));
            groupingByGrossisteId.forEach((k, v) -> {
                TGrossiste oGrossiste = getEmg().find(TGrossiste.class, k);
                TSuggestionOrder suggestionOrder = createSuggestionOrder(oGrossiste, STATUT_IS_PROGRESS);
                v.forEach(o -> {
                    TFamille oFamille = getEmg().find(TFamille.class, o.getLgFAMILLEID());
                    initTSuggestionOrderDetail(suggestionOrder, oFamille, oGrossiste,
                            oFamille.getIntQTEREAPPROVISIONNEMENT().compareTo(0) == 1
                                    ? oFamille.getIntQTEREAPPROVISIONNEMENT() : 1);
                    count.increment();
                });

            });
            return new JSONObject().put("success", true).put("count", count.intValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }

    }

    private List<Tuple> getSuggestionDetail(String suggestionId) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT f.int_CIP AS parentCip, f.int_EAN13 AS codeEan, g.str_CODE_ARTICLE AS grossisteCip, sd.int_NUMBER AS quantite FROM t_suggestion_order_details sd JOIN t_suggestion_order s "
                            + " ON s.lg_SUGGESTION_ORDER_ID=sd.lg_SUGGESTION_ORDER_ID JOIN t_famille f ON f.lg_FAMILLE_ID=sd.lg_FAMILLE_ID JOIN t_famille_grossiste g ON f.lg_FAMILLE_ID=g.lg_FAMILLE_ID WHERE s.lg_SUGGESTION_ORDER_ID= ?1  AND s.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID AND sd.lg_FAMILLE_ID=g.lg_FAMILLE_ID",
                    Tuple.class).setParameter(1, suggestionId);

            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private OptionSuggestion getOptionSuggestion() {
        try {
            TParameters tp = em.find(TParameters.class, Constant.KEY_OPTION_SUGGESTION);
            return OptionSuggestion.getByValue(tp.getStrVALUE().trim());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return OptionSuggestion.LESS_EQUALS;
        }

    }

    private enum OptionSuggestion {
        EQUALS("="), LESS("<"), LESS_EQUALS("<=");

        private final String value;

        public String getValue() {
            return value;
        }

        private OptionSuggestion(String value) {
            this.value = value;
        }

        public static OptionSuggestion getByValue(String value) {
            for (OptionSuggestion option : values()) {
                if (Objects.equals(option.value, value)) {
                    return option;
                }
            }
            return OptionSuggestion.LESS_EQUALS;
        }
    }

    /*
     * supprime leslignes de suggestion dont le stock mini de reaprpro n'est plus atteint du fait d'une entrée en stock
     */
    private List<String> supprimerLigneSuggestion(String suggestionId) {

        try {
            Query q = em.createNativeQuery(
                    "SELECT sd.lg_SUGGESTION_ORDER_DETAILS_ID AS id FROM  t_suggestion_order_details sd JOIN t_famille f ON f.lg_FAMILLE_ID=sd.lg_FAMILLE_ID JOIN t_famille_stock stoc ON f.lg_FAMILLE_ID=stoc.lg_FAMILLE_ID WHERE f.int_SEUIL_MIN < stoc.int_NUMBER_AVAILABLE AND sd.lg_SUGGESTION_ORDER_ID=?1;");
            q.setParameter(1, suggestionId);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.INFO, null, e.getLocalizedMessage());
            return List.of();
        }

    }

    private void removeInBulk(List<String> ids) {
        if (CollectionUtils.isNotEmpty(ids)) {
            try {

                CriteriaBuilder cb = em.getCriteriaBuilder();
                CriteriaDelete<TSuggestionOrderDetails> q = cb.createCriteriaDelete(TSuggestionOrderDetails.class);
                Root<TSuggestionOrderDetails> root = q.from(TSuggestionOrderDetails.class);
                q.where(root.get(TSuggestionOrderDetails_.lgSUGGESTIONORDERDETAILSID).in(ids));
                em.createQuery(q).executeUpdate();
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }
        }

    }

}
