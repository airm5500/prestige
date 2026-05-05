/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.AjustementDTO;
import commonTasks.dto.AjustementDetailDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.RetourFournisseurDTO;
import commonTasks.dto.SalesStatsParams;
import dal.*;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.DoubleAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.enterprise.concurrent.ManagedExecutorService;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.LogService;
import rest.service.LotService;
import rest.service.MouvementProduitService;
import rest.service.MvtProduitService;
import rest.service.NotificationService;
import rest.service.SuggestionService;

import static util.Constant.*;
import util.DateCommonUtils;
import util.DateConverter;
import util.NotificationUtils;
import util.NumberUtils;

/**
 *
 * @author Kobena
 */
@Stateless
public class MvtProduitServiceImpl implements MvtProduitService {

    private static final Logger LOG = Logger.getLogger(MvtProduitServiceImpl.class.getName());
    private Comparator<AjustementDetailDTO> comparator = Comparator.comparing(AjustementDetailDTO::getDateOperation);
    @EJB
    private SuggestionService suggestionService;
    @EJB
    private LogService logService;
    @EJB
    private MouvementProduitService mouvementProduitService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private NotificationService notificationService;
    @Resource(name = "concurrent/__defaultManagedExecutorService")
    private ManagedExecutorService managedExecutorService;
    @EJB
    private LotService lotService;

    public EntityManager getEmg() {
        return em;

    }

    private void updatefamillenbvente(TFamille famille, int qty, boolean updatable) {
        if (updatable) {
            famille.setDtLASTMOUVEMENT(new Date());
            famille.setIntNBRESORTIE(famille.getIntNBRESORTIE() + qty);
            this.getEmg().merge(famille);
        }

    }

    public void saveMouvementPrice(TUser user, TFamille oFamille, Integer old, Integer newPu, int taux, String action,
            String ref) {
        TMouvementprice mouvementprice = new TMouvementprice(UUID.randomUUID().toString());
        mouvementprice.setDtCREATED(new Date());
        mouvementprice.setDtDAY(new Date());
        mouvementprice.setIntPRICENEW(newPu);
        mouvementprice.setIntECART(old - newPu);
        mouvementprice.setIntPRICEOLD(old);
        mouvementprice.setDtUPDATED(new Date());
        mouvementprice.setLgUSERID(user);
        mouvementprice.setStrACTION(action);
        mouvementprice.setStrREF(ref);
        mouvementprice.setLgFAMILLEID(oFamille);
        mouvementprice.setStrSTATUT(STATUT_ENABLE);
        this.getEmg().persist(mouvementprice);
    }

    public List<TPreenregistrementDetail> getTPreenregistrementDetail(TPreenregistrement tp) {
        try {
            return getEmg().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE  t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1")
                    .setParameter(1, tp.getLgPREENREGISTREMENTID()).getResultList();

        } catch (Exception ex) {
            return Collections.emptyList();
        }

    }

    private TFamilleStock findStock(String famille, TEmplacement emplacement) {

        try {
            TypedQuery<TFamilleStock> query = this.getEmg().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE  t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable' ORDER BY t.dtCREATED DESC",
                    TFamilleStock.class);
            query.setParameter(1, famille);
            query.setParameter(2, emplacement.getLgEMPLACEMENTID());
            query.setMaxResults(1);
            TFamilleStock familleStock = query.getSingleResult();
            return familleStock;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    @Override
    public void updateStockDepot(TUser user, TPreenregistrement tp, TEmplacement emplacement) throws Exception {
        List<TPreenregistrementDetail> list = getTPreenregistrementDetail(tp);
        user = (user == null) ? tp.getLgUSERID() : user;
        final Typemvtproduit typemvtproduit = getTypemvtproduitByID(ENTREE_EN_STOCK);
        for (TPreenregistrementDetail d : list) {
            TFamille tFamille = d.getLgFAMILLEID();
            updateStockDepot(typemvtproduit, user, tFamille, d.getIntQUANTITY(), emplacement);
        }
    }

    private TFamille findProduitById(String id) {

        try {
            return em.find(TFamille.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void updateVenteStockDepot(TPreenregistrement tp, List<TPreenregistrementDetail> list, TEmplacement depot)
            throws Exception {
        TUser tu = tp.getLgUSERID();
        final TEmplacement emplacement = tu.getLgEMPLACEMENTID();
        final String emplacementId = emplacement.getLgEMPLACEMENTID();
        final boolean isDepot = !("1".equals(emplacementId));
        JSONArray items = new JSONArray();
        final Typemvtproduit typemvtproduit = tp.getChecked() ? getTypemvtproduitByID(VENTE)
                : getTypemvtproduitByID(TMVTP_VENTE_DEPOT_EXTENSION);
        final Typemvtproduit typeMvtProduit = getTypemvtproduitByID(ENTREE_EN_STOCK);
        for (TPreenregistrementDetail it : list) {
            it.setStrSTATUT(STATUT_IS_CLOSED);
            TFamille tFamille = it.getLgFAMILLEID();
            if (it.getIntPRICEUNITAIR().compareTo(tFamille.getIntPRICE()) != 0) {
                saveMouvementPrice(tu, tFamille, tFamille.getIntPRICE(), it.getIntPRICEUNITAIR(), 0, ACTION_VENTE,
                        tp.getStrREF());
                String desc = "Modification du prix du produit [ " + tFamille.getIntCIP() + " ] de "
                        + tFamille.getIntPRICE() + " à " + it.getIntPRICEUNITAIR() + " à la vente par "
                        + tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
                logService.updateItem(tu, tp.getStrREF(), desc, TypeLog.MODIFICATION_PRIX_VENTE_PRODUIT, tp);
                /*
                 * notificationService.save(new Notification().canal(Canal.EMAIL)
                 * .typeNotification(TypeNotification.MODIFICATION_PRIX_VENTE_PRODUIT).message(desc).addUser(tu));
                 */
                JSONObject jsonItemUg = new JSONObject();
                jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tFamille.getIntCIP());
                jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tFamille.getStrNAME());
                jsonItemUg.put(NotificationUtils.PRIX_INIT.getId(),
                        NumberUtils.formatIntToString(tFamille.getIntPRICE()));
                jsonItemUg.put(NotificationUtils.PRIX_FINAL.getId(),
                        NumberUtils.formatIntToString(it.getIntPRICEUNITAIR()));
                items.put(jsonItemUg);
            }
            TFamilleStock familleStock = findStock(tFamille.getLgFAMILLEID(), emplacement);
            int initStock = familleStock.getIntNUMBERAVAILABLE();
            if (tFamille.getBoolDECONDITIONNE() == 1 && !checkIsVentePossible(familleStock, it.getIntQUANTITY())) {
                TFamille oTFamilleParent = findProduitById(tFamille.getLgFAMILLEPARENTID());
                TFamilleStock stockParent = findStockByProduitId(oTFamilleParent.getLgFAMILLEID(),
                        emplacement.getLgEMPLACEMENTID());
                deconditionner(tu, tFamille, oTFamilleParent, stockParent, familleStock, it.getIntQUANTITY());

            }

            updatefamillenbvente(tFamille, it.getIntQUANTITY(), isDepot);
            mouvementProduitService.saveMvtProduit(it.getIntPRICEUNITAIR(), it, typemvtproduit, tFamille, tu,
                    emplacement, it.getIntQUANTITY(), initStock, initStock - it.getIntQUANTITY(), it.getValeurTva(),
                    tp.getChecked(), it.getIntUG());
            updateStock(familleStock, tp, it);
            this.getEmg().merge(familleStock);
            this.getEmg().merge(it);
            updateStockDepot(typeMvtProduit, tu, tFamille, it.getIntQUANTITY(), depot);
            suggestionService.makeSuggestionAuto(familleStock, tFamille);
        }
        if (!items.isEmpty()) {
            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEM_KEY.getId(), tp.getStrREF());
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MODIFICATION_PRIX_VENTE_PRODUIT.getValue());
            donnee.put(NotificationUtils.USER.getId(), tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            createNotification("", TypeNotification.MODIFICATION_PRIX_VENTE_PRODUIT, tu, donnee,
                    tp.getLgPREENREGISTREMENTID());
        }
    }

    private Typemvtproduit getTypemvtproduitByID(String id) {
        return getEmg().find(Typemvtproduit.class, id);
    }

    private void updateQtyUg(TFamilleStock familleStock, TPreenregistrement tp, TPreenregistrementDetail it) {

        if (Objects.nonNull(familleStock.getIntUG()) && tp.getStrTYPEVENTE().equals(VENTE_COMPTANT)
                && familleStock.getIntUG() > 0) {
            int ugVendue;
            int stockUg = familleStock.getIntUG();
            int qtyVendue = it.getIntQUANTITY();
            if (qtyVendue <= stockUg) {
                ugVendue = qtyVendue;
            } else {
                ugVendue = stockUg;
            }
            familleStock.setIntUG(familleStock.getIntUG() - ugVendue);
            it.setIntUG(ugVendue);
        }

    }

    private void updateStock(TFamilleStock familleStock, TPreenregistrement tp, TPreenregistrementDetail it) {
        updateQtyUg(familleStock, tp, it);
        familleStock.setIntNUMBERAVAILABLE(familleStock.getIntNUMBERAVAILABLE() - it.getIntQUANTITY());
        familleStock.setIntNUMBER(familleStock.getIntNUMBERAVAILABLE());
        familleStock.setDtUPDATED(new Date());

    }

    @Override
    public void updateVenteStock(TPreenregistrement tp, List<TPreenregistrementDetail> list) {
        EntityManager emg = this.getEmg();
        TUser tu = tp.getLgUSERID();
        final TEmplacement emplacement = tu.getLgEMPLACEMENTID();
        final String emplacementId = emplacement.getLgEMPLACEMENTID();
        final boolean isDepot = !("1".equals(emplacementId));
        final Typemvtproduit typemvtproduit = getTypemvtproduitByID(VENTE);
        final String statut = STATUT_IS_CLOSED;
        JSONArray items = new JSONArray();
        list.stream().forEach(it -> {

            it.setStrSTATUT(statut);
            TFamille tFamille = it.getLgFAMILLEID();
            boolean isDetail = tFamille.getBoolDECONDITIONNE() == 1;
            TFamilleStock stockParent = null;
            TFamille otFamilleParent = null;
            if (it.getIntPRICEUNITAIR().compareTo(tFamille.getIntPRICE()) != 0) {
                saveMouvementPrice(tu, tFamille, tFamille.getIntPRICE(), it.getIntPRICEUNITAIR(), 0, ACTION_VENTE,
                        tp.getStrREF());
                String desc = "Modification du prix du produit [ " + tFamille.getIntCIP() + " ] de "
                        + tFamille.getIntPRICE() + " à " + it.getIntPRICEUNITAIR() + " à la vente par "
                        + tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
                logService.updateItem(tu, tFamille.getIntCIP(), desc, TypeLog.MODIFICATION_PRIX_VENTE_PRODUIT,
                        tFamille);

                JSONObject jsonItemUg = new JSONObject();
                jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tFamille.getIntCIP());
                jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tFamille.getStrNAME());
                jsonItemUg.put(NotificationUtils.PRIX_INIT.getId(),
                        NumberUtils.formatIntToString(tFamille.getIntPRICE()));
                jsonItemUg.put(NotificationUtils.PRIX_FINAL.getId(),
                        NumberUtils.formatIntToString(it.getIntPRICEUNITAIR()));
                items.put(jsonItemUg);
            }
            TFamilleStock familleStock = findStock(tFamille.getLgFAMILLEID(), emplacement);

            Integer initStock = familleStock.getIntNUMBERAVAILABLE();

            if (isDetail && !checkIsVentePossible(familleStock, it.getIntQUANTITY())) {
                otFamilleParent = findProduitById(tFamille.getLgFAMILLEPARENTID());
                stockParent = findStockByProduitId(otFamilleParent.getLgFAMILLEID(), emplacement.getLgEMPLACEMENTID());
                deconditionner(tu, stockParent, familleStock, it.getIntQUANTITY());

            }
            updatefamillenbvente(tFamille, it.getIntQUANTITY(), isDepot);
            mouvementProduitService.saveMvtProduit(it.getIntPRICEUNITAIR(), it, typemvtproduit, tFamille, tu,
                    emplacement, it.getIntQUANTITY(), initStock,
                    familleStock.getIntNUMBERAVAILABLE() - it.getIntQUANTITY(), it.getValeurTva(), true, it.getIntUG());
            updateStock(familleStock, tp, it);
            emg.merge(familleStock);
            emg.merge(it);
            lotService.pickLot(tFamille.getLgFAMILLEID(), it.getIntQUANTITY());
            if (isDetail && stockParent != null) {
                this.suggestionService.makeSuggestionAuto(stockParent, otFamilleParent);
            } else {
                this.suggestionService.makeSuggestionAuto(familleStock, tFamille);
            }

        });
        // makeSuggestionAutoAsync(list, emplacement);
        if (!items.isEmpty()) {
            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEM_KEY.getId(), tp.getStrREF());
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MODIFICATION_PRIX_VENTE_PRODUIT.getValue());
            donnee.put(NotificationUtils.USER.getId(), tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            createNotification("", TypeNotification.MODIFICATION_PRIX_VENTE_PRODUIT, tu, donnee,
                    tp.getLgPREENREGISTREMENTID());
        }

    }

    private void updateStockDepot(Typemvtproduit typemvtproduit, TUser ooTUser, TFamille oTFamille, Integer qty,
            TEmplacement oEmplacement) {
        Integer initStock = 0;
        TFamilleStock familleStock;
        boolean isDetail = (oTFamille.getLgFAMILLEPARENTID() != null && !"".equals(oTFamille.getLgFAMILLEPARENTID()));

        familleStock = findStockByProduitId(oTFamille.getLgFAMILLEID(), oEmplacement.getLgEMPLACEMENTID());

        if (familleStock != null) {
            initStock = familleStock.getIntNUMBERAVAILABLE();
            familleStock.setIntNUMBERAVAILABLE(familleStock.getIntNUMBERAVAILABLE() + qty);
            familleStock.setIntNUMBER(familleStock.getIntNUMBERAVAILABLE());
            familleStock.setDtUPDATED(new Date());
            getEmg().merge(familleStock);

        } else {

            if (isDetail) {
                familleStock = findByParent(oTFamille.getLgFAMILLEPARENTID(), oEmplacement.getLgEMPLACEMENTID());
                if (familleStock == null) {
                    familleStock = createStock(oTFamille, qty, oEmplacement);
                } else {
                    initStock = familleStock.getIntNUMBERAVAILABLE();
                    familleStock.setIntNUMBERAVAILABLE(familleStock.getIntNUMBERAVAILABLE() + qty);
                    familleStock.setIntNUMBER(familleStock.getIntNUMBERAVAILABLE());
                    familleStock.setDtUPDATED(new Date());
                    getEmg().merge(familleStock);
                }
                TFamilleStock familleStock2 = findStockByProduitId(oTFamille.getLgFAMILLEPARENTID(),
                        oEmplacement.getLgEMPLACEMENTID());
                if (familleStock2 == null) {
                    TFamille p = findProduitById(oTFamille.getLgFAMILLEPARENTID());
                    if (p != null) {
                        createStock(p, 0, oEmplacement);
                    }

                }
            } else {
                familleStock = createStock(oTFamille, qty, oEmplacement);

            }

        }
        mouvementProduitService.saveMvtProduit2(oTFamille.getIntPRICE(), familleStock.getLgFAMILLESTOCKID(),
                typemvtproduit, oTFamille, ooTUser, oEmplacement, qty, initStock, initStock - qty, 0, false, 0);

    }

    private TFamilleStock findByParent(String parentId, String emplecementId) {
        TFamilleStock familleStock = null;
        try {
            TypedQuery<TFamilleStock> query = this.getEmg().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE  t.lgFAMILLEID.lgFAMILLEPARENTID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable' ORDER BY t.dtCREATED DESC",
                    TFamilleStock.class);
            query.setParameter(1, parentId);
            query.setParameter(2, emplecementId);
            query.setMaxResults(1);
            familleStock = query.getSingleResult();
        } catch (Exception e) {
        }
        return familleStock;
    }

    public TFamilleStock findStockByProduitId(String produitId, String emplecementId) {
        TFamilleStock familleStock = null;
        try {
            TypedQuery<TFamilleStock> query = getEmg().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE  t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable' ORDER BY t.dtCREATED DESC",
                    TFamilleStock.class);
            query.setParameter(1, produitId);
            query.setParameter(2, emplecementId);
            query.setMaxResults(1);
            familleStock = query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return familleStock;
    }

    public TFamille findByParent(String parentId, EntityManager emg) {
        TFamille famille = null;
        try {
            TypedQuery<TFamille> query = emg.createQuery(
                    "SELECT t FROM TFamille t WHERE  t.lgFAMILLEPARENTID = ?1  ORDER BY t.dtCREATED DESC",
                    TFamille.class);
            query.setParameter(1, parentId);
            query.setMaxResults(1);
            famille = query.getSingleResult();
        } catch (Exception e) {

        }
        return famille;
    }

    private TFamilleStock createStock(TFamille oTFamille, Integer qte, TEmplacement oTEmplacement) {
        TFamilleStock oTFamilleStock = new TFamilleStock();
        oTFamilleStock.setLgFAMILLESTOCKID(UUID.randomUUID().toString());
        oTFamilleStock.setIntNUMBER(qte);
        oTFamilleStock.setIntNUMBERAVAILABLE(qte);
        oTFamilleStock.setLgEMPLACEMENTID(oTEmplacement);
        oTFamilleStock.setLgFAMILLEID(oTFamille);
        oTFamilleStock.setStrSTATUT(STATUT_ENABLE);
        oTFamilleStock.setDtCREATED(new Date());
        oTFamilleStock.setDtUPDATED(oTFamilleStock.getDtCREATED());
        oTFamilleStock.setIntUG(0);
        oTFamilleStock.setLgEMPLACEMENTID(oTEmplacement);
        getEmg().persist(oTFamilleStock);
        return oTFamilleStock;

    }

    public boolean checkIsVentePossible(TFamilleStock oTFamilleStock, int qte) {
        return oTFamilleStock.getIntNUMBERAVAILABLE() >= qte;
    }

    private void deconditionner(TUser tu, TFamille tFamilleChild, TFamille tFamilleParent,
            TFamilleStock ofamilleStockParent, TFamilleStock familleStockChild, Integer qteVendue) {
        Integer numberToDecondition = 0;
        Integer qtyDetail = tFamilleParent.getIntNUMBERDETAIL();
        Integer stockInitDetail = familleStockChild.getIntNUMBERAVAILABLE();

        Integer stockInit = ofamilleStockParent.getIntNUMBERAVAILABLE();
        Integer stockVirtuel = stockInitDetail + (stockInit * qtyDetail);
        int compare = stockVirtuel.compareTo(qteVendue);
        if (compare >= 0) {
            while (stockInitDetail < qteVendue) {
                numberToDecondition++;
                stockInitDetail += qtyDetail;
            }
            ofamilleStockParent
                    .setIntNUMBERAVAILABLE(ofamilleStockParent.getIntNUMBERAVAILABLE() - numberToDecondition);
            ofamilleStockParent.setIntNUMBER(ofamilleStockParent.getIntNUMBERAVAILABLE());
            ofamilleStockParent.setDtUPDATED(new Date());

            familleStockChild.setIntNUMBERAVAILABLE(
                    familleStockChild.getIntNUMBERAVAILABLE() + (numberToDecondition * qtyDetail) - qteVendue);
            familleStockChild.setIntNUMBER(familleStockChild.getIntNUMBERAVAILABLE());
            familleStockChild.setDtUPDATED(new Date());
            this.getEmg().merge(ofamilleStockParent);
            this.getEmg().merge(familleStockChild);
            TDeconditionnement parent = createDecondtionne(tFamilleParent, numberToDecondition, tu);
            TDeconditionnement child = createDecondtionne(tFamilleChild, (numberToDecondition * qtyDetail), tu);

            mouvementProduitService.saveMvtProduit(child.getLgDECONDITIONNEMENTID(), DECONDTIONNEMENT_POSITIF,
                    tFamilleChild, tu, ofamilleStockParent.getLgEMPLACEMENTID(), (numberToDecondition * qtyDetail),
                    stockInitDetail, stockInitDetail + (numberToDecondition * qtyDetail) - qteVendue, 0);
            mouvementProduitService.saveMvtProduit(parent.getLgDECONDITIONNEMENTID(), DECONDTIONNEMENT_NEGATIF,
                    tFamilleParent, tu, ofamilleStockParent.getLgEMPLACEMENTID(), numberToDecondition, stockInit,
                    stockInit - numberToDecondition, 0);
            String desc = "Déconditionnement du produit [ " + tFamilleParent.getIntCIP() + " ] de "
                    + tFamilleParent.getIntPRICE() + " stock initial " + stockInit + " quantité déconditionnée "
                    + numberToDecondition + " stock finale " + (stockInit - numberToDecondition)
                    + " stock détail initial  " + stockInitDetail + " stock détail final = "
                    + (stockInitDetail + (numberToDecondition * qtyDetail) - qteVendue) + " . Opérateur : "
                    + tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
            logService.updateItem(tu, tFamilleParent.getIntCIP(), desc, TypeLog.DECONDITIONNEMENT, tFamilleParent);

            /*
             * notificationService.save(new Notification().canal(Canal.EMAIL)
             * .typeNotification(TypeNotification.DECONDITIONNEMENT).message(desc).addUser(tu));
             */
            JSONArray items = new JSONArray();
            JSONObject jsonItemUg = new JSONObject();
            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tFamilleParent.getIntCIP());
            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tFamilleParent.getStrNAME());
            jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), numberToDecondition);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInit);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), stockInit - numberToDecondition);

            JSONObject detail = new JSONObject();
            detail.put(NotificationUtils.ITEM_KEY.getId(), tFamilleChild.getIntCIP());
            detail.put(NotificationUtils.ITEM_DESC.getId(), tFamilleChild.getStrNAME());
            detail.put(NotificationUtils.ITEM_QTY.getId(), (numberToDecondition * qtyDetail));
            detail.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInitDetail);
            detail.put(NotificationUtils.ITEM_QTY_FINALE.getId(), stockInitDetail + (numberToDecondition * qtyDetail));
            jsonItemUg.put(NotificationUtils.ITEMS.getId(), new JSONArray(detail));
            items.put(jsonItemUg);

            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.DECONDITIONNEMENT.getValue());
            donnee.put(NotificationUtils.USER.getId(), tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());

            createNotification(desc, TypeNotification.DECONDITIONNEMENT, tu, donnee, tFamilleParent.getLgFAMILLEID());

        }
    }

    private TDeconditionnement createDecondtionne(TFamille oTFamille, int qty, TUser tUser) {
        TDeconditionnement oTDeconditionnement = new TDeconditionnement();
        oTDeconditionnement.setLgDECONDITIONNEMENTID(UUID.randomUUID().toString());
        oTDeconditionnement.setLgFAMILLEID(oTFamille);
        oTDeconditionnement.setLgUSERID(tUser);
        oTDeconditionnement.setIntNUMBER(qty);
        oTDeconditionnement.setDtCREATED(new Date());
        oTDeconditionnement.setStrSTATUT(STATUT_IS_PROGRESS);
        getEmg().persist(oTDeconditionnement);
        return oTDeconditionnement;
    }

    private MotifAjustement getOneTypeAjustement(Integer value) {
        return getEmg().find(MotifAjustement.class, value);
    }

    @Override
    public JSONObject creerAjustement(Params params) throws JSONException {
        EntityManager emg = this.getEmg();
        JSONObject json = new JSONObject();
        try {
            String desc = "Ajustement du " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy H:mm"));
            TAjustement ajustement = new TAjustement();
            ajustement.setLgAJUSTEMENTID(UUID.randomUUID().toString());
            ajustement.setLgUSERID(params.getOperateur());
            ajustement.setStrNAME(desc);
            ajustement.setStrCOMMENTAIRE(params.getDescription());
            ajustement.setDtCREATED(new Date());
            ajustement.setDtUPDATED(ajustement.getDtCREATED());
            ajustement.setStrSTATUT(STATUT_IS_PROGRESS);
            emg.persist(ajustement);
            ajusterProduitAjustement(params, ajustement);
            json.put("success", true).put("msg", "L'opération effectuée avec success");
            json.put("data", new JSONObject().put("lgAJUSTEMENTID", ajustement.getLgAJUSTEMENTID()));
        } catch (Exception e) {

            json.put("success", false).put("msg", "L'opération a échoué");
        }
        return json;
    }

    @Override
    public JSONObject ajusterProduitAjustement(Params params) throws JSONException {
        EntityManager emg = this.getEmg();
        JSONObject json = new JSONObject();
        try {
            TAjustement ajustement = emg.find(TAjustement.class, params.getRefParent());
            ajusterProduitAjustement(params, ajustement);
            json.put("success", true).put("msg", "L'opération effectuée avec success");
            json.put("data", new JSONObject().put("lgAJUSTEMENTID", ajustement.getLgAJUSTEMENTID()));
        } catch (Exception e) {

            json.put("success", false).put("msg", "L'opération a échoué");

        }
        return json;
    }

    private void ajusterProduitAjustement(Params params, TAjustement ajustement) {
        TAjustementDetail ajustementDetail = updateAjustementDetail(params);
        if (ajustementDetail == null) {
            TEmplacement emplacement = ajustement.getLgUSERID().getLgEMPLACEMENTID();
            TFamilleStock familleStock = findStockByProduitId(params.getRefTwo(), emplacement.getLgEMPLACEMENTID());
            Integer currentStock = familleStock.getIntNUMBERAVAILABLE();
            ajustementDetail = new TAjustementDetail();
            ajustementDetail.setLgAJUSTEMENTDETAILID(UUID.randomUUID().toString());
            ajustementDetail.setLgAJUSTEMENTID(ajustement);
            ajustementDetail.setLgFAMILLEID(familleStock.getLgFAMILLEID());
            ajustementDetail.setIntNUMBER(params.getValue());
            ajustementDetail.setIntNUMBERCURRENTSTOCK(currentStock);
            ajustementDetail.setIntNUMBERAFTERSTOCK(ajustementDetail.getIntNUMBER() + currentStock);
            ajustementDetail.setDtCREATED(new Date());
            ajustementDetail.setDtUPDATED(ajustementDetail.getDtCREATED());
            ajustementDetail.setTypeAjustement(getOneTypeAjustement(params.getValueFour()));
            ajustementDetail.setStrSTATUT(STATUT_IS_PROGRESS);
            this.getEmg().persist(ajustementDetail);
        }
    }

    private void updateFinalyseItem(TAjustementDetail ajustementDetail, TFamilleStock familleStock, Date dateUpdated) {
        int currentStock = familleStock.getIntNUMBERAVAILABLE();
        ajustementDetail.setIntNUMBERCURRENTSTOCK(currentStock);
        ajustementDetail.setIntNUMBERAFTERSTOCK(ajustementDetail.getIntNUMBER() + currentStock);
        ajustementDetail.setDtUPDATED(dateUpdated);
        ajustementDetail.setStrSTATUT(STATUT_ENABLE);

    }

    @Override
    public JSONObject modifierProduitAjustement(Params params) throws JSONException {
        EntityManager emg = getEmg();
        JSONObject json = new JSONObject();
        try {
            TAjustementDetail ajustementDetail = emg.find(TAjustementDetail.class, params.getRef());
            if (ajustementDetail == null) {

                json.put("success", false).put("msg", "L'opération a échoué");
                return json;
            }
            ajustementDetail.setIntNUMBER(params.getValue());
            ajustementDetail.setIntNUMBERAFTERSTOCK(params.getValue() + params.getValueTwo());
            ajustementDetail.setDtUPDATED(new Date());
            emg.merge(ajustementDetail);
            json.put("success", true).put("msg", "L'opération effectuée avec success");
            json.put("data",
                    new JSONObject().put("lgAJUSTEMENTID", ajustementDetail.getLgAJUSTEMENTID().getLgAJUSTEMENTID()));
            return json;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "L'opération a échoué");
            return json;
        }
    }

    private TAjustementDetail updateAjustementDetail(Params params) {
        try {
            TAjustementDetail ajustementDetail = findAjustementDetailsByParenId(params.getRefParent(),
                    params.getRefTwo());
            if (ajustementDetail == null) {
                return null;
            }
            ajustementDetail.setIntNUMBER(ajustementDetail.getIntNUMBER() + params.getValue());
            ajustementDetail.setIntNUMBERAFTERSTOCK(ajustementDetail.getIntNUMBERAFTERSTOCK() + params.getValue());
            ajustementDetail.setDtUPDATED(new Date());
            return getEmg().merge(ajustementDetail);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public JSONObject cloreAjustement(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        EntityManager emg = this.getEmg();
        try {
            TAjustement ajustement = emg.find(TAjustement.class, params.getRefParent());
            if (ajustement == null) {

                json.put("success", false).put("msg", "L'opération a échoué");
                return json;
            }
            ajustement.setDtUPDATED(new Date());
            TUser tUser = ajustement.getLgUSERID();
            TEmplacement emplacement = tUser.getLgEMPLACEMENTID();
            List<TAjustementDetail> ajustementDetails = findAjustementDetailsByParenId(ajustement.getLgAJUSTEMENTID());
            JSONArray items = new JSONArray();
            ajustementDetails.forEach(it -> {
                TFamille famille = it.getLgFAMILLEID();
                TFamilleStock familleStock = findStockByProduitId(famille.getLgFAMILLEID(),
                        emplacement.getLgEMPLACEMENTID());
                Integer initStock = familleStock.getIntNUMBERAVAILABLE();
                updateFinalyseItem(it, familleStock, ajustement.getDtUPDATED());
                familleStock.setIntNUMBERAVAILABLE(it.getIntNUMBERAFTERSTOCK());
                familleStock.setIntNUMBER(familleStock.getIntNUMBERAVAILABLE());
                familleStock.setDtUPDATED(ajustement.getDtUPDATED());
                emg.merge(familleStock);
                int compare = initStock.compareTo(it.getIntNUMBERAFTERSTOCK());

                String action2 = (compare < 0) ? AJUSTEMENT_POSITIF : AJUSTEMENT_NEGATIF;

                mouvementProduitService.saveMvtProduit(it.getLgAJUSTEMENTDETAILID(), action2, famille, tUser,
                        emplacement, it.getIntNUMBER(), initStock, familleStock.getIntNUMBERAVAILABLE(), 0);
                suggestionService.makeSuggestionAuto(familleStock, famille);
                String desc = "Ajustement du produit :[  " + famille.getIntCIP() + "  " + famille.getStrNAME()
                        + " ] : Quantité initiale : [ " + initStock + " ] : Quantité ajustée [ " + it.getIntNUMBER()
                        + " ] :Quantité finale [ " + familleStock.getIntNUMBERAVAILABLE() + " ]";
                logService.updateItem(tUser, famille.getIntCIP(), desc, TypeLog.AJUSTEMENT_DE_PRODUIT, famille);

                emg.merge(it);
                JSONObject jsonItemUg = new JSONObject();
                jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), famille.getIntCIP());
                jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), famille.getStrNAME());
                jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), it.getIntNUMBER());
                jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), initStock);
                jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), familleStock.getIntNUMBERAVAILABLE());
                items.put(jsonItemUg);

            });
            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.AJUSTEMENT_DE_PRODUIT.getValue());
            donnee.put(NotificationUtils.USER.getId(), tUser.getStrFIRSTNAME() + " " + tUser.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());

            createNotification("", TypeNotification.AJUSTEMENT_DE_PRODUIT, tUser, donnee,
                    ajustement.getLgAJUSTEMENTID());
            ajustement.setStrCOMMENTAIRE(params.getDescription());
            ajustement.setStrSTATUT(STATUT_ENABLE);
            emg.merge(ajustement);
            json.put("success", true).put("msg", "L'opération effectuée avec success");
            return json;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "L'opération a échoué");
            return json;
        }
    }

    private List<TAjustementDetail> findAjustementDetailsByParenId(String idParent) {
        return this.getEmg().createQuery("SELECT o FROM TAjustementDetail o WHERE o.lgAJUSTEMENTID.lgAJUSTEMENTID=?1 ",
                TAjustementDetail.class).setParameter(1, idParent).getResultList();
    }

    private TAjustementDetail findAjustementDetailsByParenId(String idParent, String produitId) {
        try {
            TypedQuery<TAjustementDetail> q = getEmg().createQuery(
                    "SELECT o FROM TAjustementDetail o WHERE o.lgAJUSTEMENTID.lgAJUSTEMENTID=?1 AND o.lgFAMILLEID.lgFAMILLEID=?2 ",
                    TAjustementDetail.class);
            q.setParameter(1, idParent);
            q.setParameter(2, produitId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    public long countAjustement(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = this.getEmg().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TAjustementDetail> root = cq.from(TAjustementDetail.class);
            Join<TAjustementDetail, TAjustement> st = root.join("lgAJUSTEMENTID", JoinType.INNER);
            cq.select(cb.countDistinct(root.get(TAjustementDetail_.lgAJUSTEMENTID)));
            List<Predicate> predicates = listAllAjustementPredicates(cb, root, st, params);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = this.getEmg().createQuery(cq);
            return (Long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public List<AjustementDTO> getAllAjustements(SalesStatsParams params) {

        CriteriaBuilder cb = getEmg().getCriteriaBuilder();
        CriteriaQuery<TAjustement> cq = cb.createQuery(TAjustement.class);
        Root<TAjustementDetail> root = cq.from(TAjustementDetail.class);
        Join<TAjustementDetail, TAjustement> st = root.join("lgAJUSTEMENTID", JoinType.INNER);
        cq.select(root.get(TAjustementDetail_.lgAJUSTEMENTID)).distinct(true)
                .orderBy(cb.asc(st.get(TAjustement_.dtUPDATED)));
        List<Predicate> predicates = listAllAjustementPredicates(cb, root, st, params);
        cq.where(predicates.toArray(new Predicate[0]));
        Query q = getEmg().createQuery(cq);
        if (!params.isAll()) {
            q.setFirstResult(params.getStart());
            q.setMaxResults(params.getLimit());
        }
        List<TAjustement> list = q.getResultList();
        return list.stream().map(
                v -> new AjustementDTO(v, findAjustementDetailsByParenId(v.getLgAJUSTEMENTID()), params.isCanCancel()))
                .collect(Collectors.toList());

    }

    @Override
    public JSONObject ajsutements(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();

        try {
            long count = countAjustement(params);
            if (count == 0) {
                json.put("total", count);
                json.put("data", new JSONArray());
                return json;
            }

            List<AjustementDTO> data = getAllAjustements(params);
            json.put("total", count);
            json.put("data", new JSONArray(data));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
        }
        return json;
    }

    @Override
    public JSONObject removeAjustementDetail(String id) throws JSONException {
        JSONObject json = new JSONObject();
        EntityManager emg = this.getEmg();
        try {

            TAjustementDetail ajustementDetail = emg.find(TAjustementDetail.class, id);
            emg.remove(ajustementDetail);
            return json.put("success", true).put("msg", "Opération effectuée avec success");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            if (emg.getTransaction().isActive()) {
                emg.getTransaction().rollback();
            }
            return json.put("success", false).put("msg", "Opération a échoué");
        }
    }

    public long ajsutementsDetailsCount(SalesStatsParams params, String idAjustement) {
        EntityManager emg = this.getEmg();
        try {

            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<Number> cq = cb.createQuery(Number.class);
            Root<TAjustementDetail> root = cq.from(TAjustementDetail.class);
            Join<TAjustementDetail, TAjustement> st = root.join("lgAJUSTEMENTID", JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = listPredicates(cb, root, st, params, idAjustement);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = emg.createQuery(cq);
            return ((Number) q.getSingleResult()).longValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    @Override
    public JSONObject ajsutementsDetails(SalesStatsParams params, String idAjustement) throws JSONException {
        JSONObject json = new JSONObject();
        EntityManager emg = this.getEmg();
        try {
            long count = ajsutementsDetailsCount(params, idAjustement);
            if (count == 0) {
                json.put("total", 0);
                json.put("data", new JSONArray());
                return json;
            }

            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TAjustementDetail> cq = cb.createQuery(TAjustementDetail.class);
            Root<TAjustementDetail> root = cq.from(TAjustementDetail.class);
            Join<TAjustementDetail, TAjustement> st = root.join("lgAJUSTEMENTID", JoinType.INNER);
            cq.select(root).orderBy(cb.asc(root.get(TAjustementDetail_.dtUPDATED)));
            List<Predicate> predicates = listPredicates(cb, root, st, params, idAjustement);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = emg.createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            List<TAjustementDetail> list = q.getResultList();
            List<AjustementDetailDTO> data = list.stream().map(AjustementDetailDTO::new).sorted(comparator)
                    .collect(Collectors.toList());
            json.put("total", count);
            json.put("data", new JSONArray(data));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
        }
        return json;
    }

    private List<Predicate> listPredicates(CriteriaBuilder cb, Root<TAjustementDetail> root,
            Join<TAjustementDetail, TAjustement> st, SalesStatsParams params, String idAjustement) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.and(cb.equal(st.get(TAjustement_.lgAJUSTEMENTID), idAjustement)));
        if (params.getQuery() != null && !"".equals(params.getQuery())) {
            Predicate predicate = cb.and(cb.or(
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.intCIP), params.getQuery() + "%"),
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.strNAME), params.getQuery() + "%"),
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.intEAN13),
                            params.getQuery() + "%")));
            predicates.add(predicate);
        }

        return predicates;
    }

    private List<Predicate> listAllAjustementPredicates(CriteriaBuilder cb, Root<TAjustementDetail> root,
            Join<TAjustementDetail, TAjustement> st, SalesStatsParams params) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.between(cb.function("DATE", Date.class, st.get(TAjustement_.dtUPDATED)),
                java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd())));
        predicates.add(cb.equal(st.get(TAjustement_.strSTATUT), STATUT_ENABLE));
        if (StringUtils.isNotEmpty(params.getTypeFiltre())) {
            predicates.add(cb.equal(root.get(TAjustementDetail_.typeAjustement).get(MotifAjustement_.id),
                    Integer.valueOf(params.getTypeFiltre())));
        }
        if (StringUtils.isNotEmpty(params.getQuery())) {
            Predicate predicate = cb.or(
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.intCIP), params.getQuery() + "%"),
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.strNAME), params.getQuery() + "%"),
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.intEAN13), params.getQuery() + "%"));
            predicates.add(predicate);
        }
        if (!params.isShowAll()) {
            predicates.add(cb.and(
                    cb.equal(st.get(TAjustement_.lgUSERID).get(TUser_.lgUSERID), params.getUserId().getLgUSERID())));
        }
        if (StringUtils.isNotEmpty(params.getTypeFiltre())) {
            predicates.add(cb.equal(root.get(TAjustementDetail_.typeAjustement).get(MotifAjustement_.id),
                    Integer.valueOf(params.getTypeFiltre())));
        }
        return predicates;
    }

    @Override
    public JSONObject annulerAjustement(String id) throws JSONException {
        JSONObject json = new JSONObject();
        EntityManager emg = this.getEmg();
        try {
            TAjustement ajustement = emg.find(TAjustement.class, id);
            List<TAjustementDetail> ajustementDetails = findAjustementDetailsByParenId(id);
            ajustementDetails.forEach(c -> emg.remove(c));
            emg.remove(ajustement);
            return json.put("success", true).put("msg", "Opération effectuée avec success");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            if (emg.getTransaction().isActive()) {
                emg.getTransaction().rollback();
            }
            return json.put("success", false).put("msg", "Opération a échoué");
        }

    }

    @Override
    public JSONObject validerRetourFournisseur(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        EntityManager emg = this.getEmg();
        try {
            TRetourFournisseur fournisseur = emg.find(TRetourFournisseur.class, params.getRef());
            List<TRetourFournisseurDetail> details = getTRetourFournisseurDetail(params.getRef());
            DoubleAdder amount = new DoubleAdder();
            final TEmplacement empl = params.getOperateur().getLgEMPLACEMENTID();
            final String emplecementId = empl.getLgEMPLACEMENTID();
            JSONArray items = new JSONArray();
            TBonLivraison bonLivraison = fournisseur.getLgBONLIVRAISONID();
            details.forEach(d -> {

                TFamille tf = d.getLgFAMILLEID();
                TFamilleStock stock = findStockByProduitId(tf.getLgFAMILLEID(), emplecementId);
                int sockInit = stock.getIntNUMBERAVAILABLE();
                int finalQty = sockInit - d.getIntNUMBERRETURN();
                amount.add(d.getIntNUMBERRETURN() * d.getIntPAF());
                d.setStrSTATUT(STATUT_ENABLE);
                d.setDtUPDATED(new Date());
                stock.setIntNUMBERAVAILABLE(finalQty);
                stock.setIntNUMBER(stock.getIntNUMBERAVAILABLE());
                stock.setDtUPDATED(new Date());
                emg.merge(stock);
                emg.merge(d);
                mouvementProduitService.saveMvtProduit(0, d.getIntPAF(), d.getLgRETOURFRSDETAIL(), RETOUR_FOURNISSEUR,
                        tf, params.getOperateur(), empl, d.getIntNUMBERRETURN(), sockInit, finalQty, 0);

                suggestionService.makeSuggestionAuto(stock, tf);
                String desc = "Retour fournisseur du  produit " + tf.getIntCIP() + " " + tf.getStrNAME()
                        + "Numéro BL =  " + bonLivraison.getStrREFLIVRAISON() + " stock initial= " + sockInit
                        + " qté retournée= " + d.getIntNUMBERRETURN() + " qté après retour = " + finalQty
                        + " . Retour effectué par " + params.getOperateur().getStrFIRSTNAME() + " "
                        + params.getOperateur().getStrLASTNAME();
                logService.updateItem(params.getOperateur(), tf.getIntCIP(), desc, TypeLog.RETOUR_FOURNISSEUR, tf);

                JSONObject jsonItemUg = new JSONObject();
                jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tf.getIntCIP());
                jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tf.getStrNAME());
                jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), d.getIntNUMBERRETURN());
                jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), sockInit);
                jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), finalQty);
                items.put(jsonItemUg);

                /*
                 * notificationService .save(new
                 * Notification().canal(Canal.EMAIL).typeNotification(TypeNotification.RETOUR_FOURNISSEUR)
                 * .message(desc).addUser(params.getOperateur()));
                 */
            });
            int montantTTC = amount.intValue();
            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.RETOUR_FOURNISSEUR.getValue());
            donnee.put(NotificationUtils.USER.getId(),
                    params.getOperateur().getStrFIRSTNAME() + " " + params.getOperateur().getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            donnee.put(NotificationUtils.NUM_BL.getId(), bonLivraison.getStrREFLIVRAISON());
            donnee.put(NotificationUtils.MONTANT_TTC.getId(), NumberUtils.formatIntToString(montantTTC));
            donnee.put(NotificationUtils.DATE_BON.getId(),
                    DateCommonUtils.formatDate(bonLivraison.getDtDATELIVRAISON()));
            createNotification("", TypeNotification.RETOUR_FOURNISSEUR, params.getOperateur(), donnee,
                    fournisseur.getLgRETOURFRSID());

            fournisseur.setStrSTATUT(STATUT_ENABLE);
            fournisseur.setDtUPDATED(new Date());
            fournisseur.setDlAMOUNT((double) montantTTC);
            fournisseur.setStrCOMMENTAIRE(params.getDescription());
            fournisseur.setLgUSERID(params.getOperateur());
            fournisseur.setStrREPONSEFRS(params.getRefTwo());
            emg.merge(fournisseur);

            json.put("success", true).put("msg", "Opération effectuée avec success");
        } catch (Exception e) {
            json.put("success", false).put("msg", "Echec de la validation");
            LOG.log(Level.SEVERE, null, e);
        }

        return json;

    }

    private List<TRetourFournisseurDetail> getTRetourFournisseurDetail(String id) {
        try {
            TypedQuery<TRetourFournisseurDetail> query = this.em.createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE t.strSTATUT NOT LIKE ?1 AND t.lgRETOURFRSID.lgRETOURFRSID LIKE ?2 ",
                    TRetourFournisseurDetail.class).setParameter(1, STATUT_ENABLE).setParameter(2, id);
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public TFamilleStock updateStock(TFamille tf, TEmplacement emplacementId, int qty, int ug) {
        TFamilleStock stock = findStock(tf.getLgFAMILLEID(), emplacementId);
        stock.setIntNUMBERAVAILABLE(stock.getIntNUMBERAVAILABLE() + qty);
        stock.setIntNUMBER(stock.getIntNUMBERAVAILABLE());
        stock.setIntUG((stock.getIntUG() != null ? (stock.getIntUG() + ug) : ug));
        stock.setDtUPDATED(new Date());
        em.merge(stock);
        return stock;
    }

    @Override
    public int updateStockReturnInitStock(TFamille tf, TEmplacement emplacementId, int qty, int ug) {
        TFamilleStock stock = findStock(tf.getLgFAMILLEID(), emplacementId);
        int stockInit = stock.getIntNUMBERAVAILABLE();
        stock.setIntNUMBERAVAILABLE(stock.getIntNUMBERAVAILABLE() + qty);
        stock.setIntNUMBER(stock.getIntNUMBERAVAILABLE());
        stock.setIntUG((stock.getIntUG() != null ? (stock.getIntUG() + ug) : ug));
        stock.setDtUPDATED(new Date());
        this.getEmg().merge(stock);
        return stockInit;
    }

    @Override
    public JSONObject loadetourFournisseur(String dtStart, String dtEnd, int start, int limit, String fourId,
            String query, boolean cunRemove, String filtre) throws JSONException {
        List<RetourFournisseurDTO> data = loadretoursFournisseur(dtStart, dtEnd, start, limit, fourId, query, cunRemove,
                filtre);
        return new JSONObject().put("total", data.size()).put("results", new JSONArray(data));
    }

    @Override
    public List<RetourFournisseurDTO> loadretoursFournisseur(String dtStart, String dtEnd, int start, int limit,
            String fourId, String query, boolean cunRemove, String filtre) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<TRetourFournisseur> cq = cb.createQuery(TRetourFournisseur.class);
            Root<TRetourFournisseur> root = cq.from(TRetourFournisseur.class);
            cq.select(root).distinct(true);
            predicates.add(cb.equal(root.get(TRetourFournisseur_.strSTATUT), STATUT_ENABLE));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TRetourFournisseur_.dtUPDATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            if (!StringUtils.isEmpty(fourId)) {
                predicates.add(
                        cb.equal(root.get(TRetourFournisseur_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), fourId));
            }
            if (StringUtils.isNotEmpty(query) || (StringUtils.isNotEmpty(filtre) && !filtre.equals(ALL))) {
                List<Predicate> subpr = new ArrayList<>();
                Subquery<TRetourFournisseur> sub = cq.subquery(TRetourFournisseur.class);
                Root<TRetourFournisseurDetail> pr = sub.from(TRetourFournisseurDetail.class);
                if (StringUtils.isNotEmpty(query)) {
                    subpr.add(cb.or(
                            cb.like(pr.get(TRetourFournisseurDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                            cb.like(pr.get(TRetourFournisseurDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%"),
                            cb.like(pr.get(TRetourFournisseurDetail_.lgFAMILLEID).get(TFamille_.intEAN13),
                                    query + "%")));
                }
                if (StringUtils.isNotEmpty(filtre)) {
                    switch (filtre) {
                    case NOT:
                        subpr.add(cb.equal(pr.get(TRetourFournisseurDetail_.intNUMBERANSWER), 0));
                        break;
                    case WITH:
                        subpr.add(cb.greaterThan(pr.get(TRetourFournisseurDetail_.intNUMBERANSWER), 0));
                        break;
                    default:
                        break;
                    }
                }
                sub.select(pr.get(TRetourFournisseurDetail_.lgRETOURFRSID))
                        .where(cb.and(subpr.toArray(Predicate[]::new)));
                predicates.add(cb.in(root).value(sub));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TRetourFournisseur> q = getEmg().createQuery(cq);
            return q.getResultList().stream()
                    .map(x -> new RetourFournisseurDTO(x, x.getTRetourFournisseurDetailCollection().stream()
                            .map(RetourDetailsDTO::new).collect(Collectors.toList()), cunRemove))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<RetourDetailsDTO> loadretoursFournisseur(String dtStart, String dtEnd, String fourId, String query,
            String filtre) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<TRetourFournisseur> cq = cb.createQuery(TRetourFournisseur.class);
            Root<TRetourFournisseur> root = cq.from(TRetourFournisseur.class);

            cq.select(root).distinct(true);
            predicates.add(cb.equal(root.get(TRetourFournisseur_.strSTATUT), STATUT_ENABLE));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TRetourFournisseur_.dtUPDATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            if (!StringUtils.isEmpty(fourId)) {
                predicates.add(
                        cb.equal(root.get(TRetourFournisseur_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), fourId));
            }
            if (!StringUtils.isEmpty(query) || (StringUtils.isNotEmpty(filtre) && !filtre.equals(ALL))) {
                List<Predicate> subpr = new ArrayList<>();
                Subquery<TRetourFournisseur> sub = cq.subquery(TRetourFournisseur.class);
                Root<TRetourFournisseurDetail> pr = sub.from(TRetourFournisseurDetail.class);
                if (StringUtils.isNotEmpty(query)) {
                    subpr.add(cb.or(
                            cb.like(pr.get(TRetourFournisseurDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                            cb.like(pr.get(TRetourFournisseurDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%"),
                            cb.like(pr.get(TRetourFournisseurDetail_.lgFAMILLEID).get(TFamille_.intEAN13),
                                    query + "%")));
                }
                if (StringUtils.isNotEmpty(filtre)) {
                    switch (filtre) {
                    case NOT:
                        subpr.add(cb.equal(pr.get(TRetourFournisseurDetail_.intNUMBERANSWER), 0));
                        break;
                    case WITH:
                        subpr.add(cb.greaterThan(pr.get(TRetourFournisseurDetail_.intNUMBERANSWER), 0));
                        break;
                    default:
                        break;
                    }
                }

                sub.select(pr.get(TRetourFournisseurDetail_.lgRETOURFRSID))
                        .where(cb.and(subpr.toArray(Predicate[]::new)));
                predicates.add(cb.in(root).value(sub));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TRetourFournisseur> q = getEmg().createQuery(cq);
            if (StringUtils.isNotEmpty(filtre)) {
                switch (filtre) {
                case NOT:
                    return q.getResultList().stream().flatMap(e -> e.getTRetourFournisseurDetailCollection().stream())
                            .filter((t) -> {
                                return t.getIntNUMBERANSWER() == 0;
                            }).map(RetourDetailsDTO::new).collect(Collectors.toList());

                case WITH:
                    return q.getResultList().stream().flatMap(e -> e.getTRetourFournisseurDetailCollection().stream())
                            .filter((t) -> {
                                return t.getIntNUMBERANSWER() > 0;
                            }).map(RetourDetailsDTO::new).collect(Collectors.toList());

                default:
                    return q.getResultList().stream().flatMap(e -> e.getTRetourFournisseurDetailCollection().stream())
                            .map(RetourDetailsDTO::new).collect(Collectors.toList());

                }
            }
            return q.getResultList().stream().flatMap(e -> e.getTRetourFournisseurDetailCollection().stream())
                    .map(RetourDetailsDTO::new).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject validerRetourDepot(String retourId, TUser user) throws JSONException {
        try {
            TRetourdepot OTRetourdepot = this.getEmg().find(TRetourdepot.class, retourId);
            TRetourdepot ORetourdepotOfficine = createRetourdepot(user, OTRetourdepot.getStrNAME(),
                    user.getLgEMPLACEMENTID(), OTRetourdepot.getStrDESCRIPTION(),
                    OTRetourdepot.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            createTretourDetails(OTRetourdepot, ORetourdepotOfficine, user);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    public TRetourdepot createRetourdepot(TUser user, String libelle, TEmplacement oEmplacement, String description,
            String strPKEY) throws Exception {
        TRetourdepot oRetourdepot = new TRetourdepot();
        oRetourdepot.setStrNAME(StringUtils.isEmpty(libelle) ? DateConverter.getShortId(8) : libelle);
        oRetourdepot.setLgRETOURDEPOTID(UUID.randomUUID().toString());
        oRetourdepot.setStrDESCRIPTION(description);
        oRetourdepot.setLgUSERID(user);
        oRetourdepot.setLgEMPLACEMENTID(oEmplacement);
        oRetourdepot.setPkey(strPKEY);
        oRetourdepot.setBoolPending(oEmplacement.getBoolSAMELOCATION());
        oRetourdepot.setStrSTATUT(STATUT_IS_CLOSED);
        oRetourdepot.setDtCREATED(new Date());
        oRetourdepot.setDtUPDATED(new Date());
        oRetourdepot.setBoolFLAG(false);
        oRetourdepot.setBoolPending(false);
        return oRetourdepot;
    }

    private List<TRetourdepotdetail> getRetourdepotdetailsByRetourdepot(String lgretourDepot) {
        return this.getEmg()
                .createQuery("SELECT OBJECT(o) FROM TRetourdepotdetail o WHERE o.lgRETOURDEPOTID.lgRETOURDEPOTID=?1 ")
                .setParameter(1, lgretourDepot).getResultList();
    }

    private void createTretourDetails(TRetourdepot retourdepot, TRetourdepot officine, TUser user) throws Exception {
        int total = 0;
        List<TRetourdepotdetail> data = getRetourdepotdetailsByRetourdepot(retourdepot.getLgRETOURDEPOTID());
        Collection<TRetourdepotdetail> collection = new ArrayList<>(data.size());
        for (TRetourdepotdetail ODRetourdepot : data) {
            TFamille f = ODRetourdepot.getLgFAMILLEID();
            TFamilleStock of = this.findStock(f.getLgFAMILLEID(), officine.getLgEMPLACEMENTID());
            int ofStockInit = of.getIntNUMBERAVAILABLE();
            int ofFinale = ofStockInit + ODRetourdepot.getIntNUMBERRETURN();
            of.setIntNUMBERAVAILABLE(ofFinale);
            of.setIntNUMBER(ofFinale);
            this.getEmg().merge(of);
            TFamilleStock depot = this.findStock(f.getLgFAMILLEID(), retourdepot.getLgEMPLACEMENTID());
            int deStockInit = depot.getIntNUMBERAVAILABLE();
            int deFinale = deStockInit - ODRetourdepot.getIntNUMBERRETURN();
            depot.setIntNUMBERAVAILABLE(deFinale);
            depot.setIntNUMBER(deFinale);
            this.getEmg().merge(depot);
            TRetourdepotdetail retourdepotdetail = new TRetourdepotdetail(UUID.randomUUID().toString());
            retourdepotdetail.setDtCREATED(new Date());
            retourdepotdetail.setIntNUMBERRETURN(ODRetourdepot.getIntNUMBERRETURN());
            retourdepotdetail.setIntPRICE(ODRetourdepot.getIntPRICE());
            retourdepotdetail.setIntPRICEDETAIL(ODRetourdepot.getIntPRICEDETAIL());
            retourdepotdetail.setIntSTOCK(ODRetourdepot.getIntSTOCK());
            retourdepotdetail.setLgRETOURDEPOTID(officine);
            retourdepotdetail.setLgFAMILLEID(f);
            retourdepotdetail.setStrSTATUT(STATUT_IS_CLOSED);
            retourdepotdetail.setDtUPDATED(new Date());
            total += retourdepotdetail.getIntPRICE();
            collection.add(retourdepotdetail);
            mouvementProduitService.saveMvtProduit(0, f.getIntPAF(), retourdepotdetail.getLgRETOURDEPOTDETAILID(),
                    TMVTP_RETOUR_DEPOT, f, user, officine.getLgEMPLACEMENTID(), ODRetourdepot.getIntNUMBERRETURN(),
                    ofStockInit, ofFinale, 0);

            mouvementProduitService.saveMvtProduit(0, f.getIntPAF(), ODRetourdepot.getLgRETOURDEPOTDETAILID(),
                    RETOUR_FOURNISSEUR, f, user, retourdepot.getLgEMPLACEMENTID(), ODRetourdepot.getIntNUMBERRETURN(),
                    deStockInit, deFinale, 0);

        }
        retourdepot.setDblAMOUNT(total);
        officine.setDblAMOUNT(total);
        retourdepot.setBoolPending(false);
        retourdepot.setDtUPDATED(new Date());
        retourdepot.setStrSTATUT(STATUT_IS_CLOSED);
        officine.setTRetourdepotdetailCollection(collection);
        getEmg().persist(officine);
        getEmg().merge(retourdepot);
    }

    @Override
    public List<AjustementDetailDTO> getAllAjustementDetailDTOs(SalesStatsParams params) {
        List<Predicate> predicates = new ArrayList<>();
        CriteriaBuilder cb = getEmg().getCriteriaBuilder();
        CriteriaQuery<TAjustementDetail> cq = cb.createQuery(TAjustementDetail.class);
        Root<TAjustementDetail> root = cq.from(TAjustementDetail.class);
        Join<TAjustementDetail, TAjustement> st = root.join("lgAJUSTEMENTID", JoinType.INNER);
        cq.select(root).orderBy(cb.asc(st.get(TAjustement_.dtUPDATED)));
        Predicate btw = cb.between(cb.function("DATE", Date.class, st.get(TAjustement_.dtUPDATED)),
                java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd()));
        predicates.add(btw);
        predicates.add(cb.equal(st.get(TAjustement_.strSTATUT), STATUT_ENABLE));
        if (StringUtils.isNotEmpty(params.getTypeFiltre())) {
            predicates.add(cb.equal(root.get(TAjustementDetail_.typeAjustement).get(MotifAjustement_.id),
                    Integer.valueOf(params.getTypeFiltre())));
        }
        if (params.getQuery() != null && !"".equals(params.getQuery())) {
            Predicate predicate = cb.or(
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.intCIP), params.getQuery() + "%"),
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.strNAME), params.getQuery() + "%"),
                    cb.like(root.get(TAjustementDetail_.lgFAMILLEID).get(TFamille_.intEAN13), params.getQuery() + "%"));
            predicates.add(predicate);
        }
        if (!params.isShowAll()) {
            predicates.add(cb.and(
                    cb.equal(st.get(TAjustement_.lgUSERID).get(TUser_.lgUSERID), params.getUserId().getLgUSERID())));
        }
        cq.where(predicates.toArray(Predicate[]::new));
        TypedQuery<TAjustementDetail> q = getEmg().createQuery(cq);

        return q.getResultList().stream().map(AjustementDetailDTO::new).collect(Collectors.toList());

    }

    @Override
    public void validerFullBlRetourFournisseur(TRetourFournisseur retourFournisseur) {
        JSONArray items = new JSONArray();
        EntityManager emg = this.getEmg();
        List<TRetourFournisseurDetail> details = new ArrayList<>(
                retourFournisseur.getTRetourFournisseurDetailCollection());
        DoubleAdder amount = new DoubleAdder();
        TUser user = retourFournisseur.getLgUSERID();
        final TEmplacement empl = user.getLgEMPLACEMENTID();
        final String emplecementId = empl.getLgEMPLACEMENTID();
        TBonLivraison bonLivraison = retourFournisseur.getLgBONLIVRAISONID();
        details.forEach(d -> {
            TFamille tf = d.getLgFAMILLEID();
            TFamilleStock stock = findStockByProduitId(tf.getLgFAMILLEID(), emplecementId);
            int sockInit = stock.getIntNUMBERAVAILABLE();
            int finalQty = sockInit - d.getIntNUMBERRETURN();
            amount.add(d.getIntNUMBERRETURN() * d.getIntPAF());
            d.setStrSTATUT(STATUT_ENABLE);
            stock.setIntNUMBERAVAILABLE(finalQty);
            stock.setIntNUMBER(stock.getIntNUMBERAVAILABLE());
            stock.setDtUPDATED(new Date());
            emg.merge(stock);
            emg.persist(d);
            mouvementProduitService.saveMvtProduit(0, d.getIntPAF(), d.getLgRETOURFRSDETAIL(), RETOUR_FOURNISSEUR, tf,
                    user, empl, d.getIntNUMBERRETURN(), sockInit, finalQty, 0);

            suggestionService.makeSuggestionAuto(stock, tf);
            String desc = "Retour fournisseur du  produit " + tf.getIntCIP() + " " + tf.getStrNAME() + "Numéro BL =  "
                    + bonLivraison.getStrREFLIVRAISON() + " stock initial= " + sockInit + " qté retournée= "
                    + d.getIntNUMBERRETURN() + " qté après retour = " + finalQty + " . Retour effectué par "
                    + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
            logService.updateItem(user, tf.getIntCIP(), desc, TypeLog.RETOUR_FOURNISSEUR, tf);
            /*
             * notificationService.save(new Notification().canal(Canal.SMS)
             * .typeNotification(TypeNotification.RETOUR_FOURNISSEUR).message(desc).addUser(user));
             */
            JSONObject jsonItemUg = new JSONObject();
            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tf.getIntCIP());
            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tf.getStrNAME());
            jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), d.getIntNUMBERRETURN());
            jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), sockInit);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), finalQty);
            items.put(jsonItemUg);

        });
        int montantTTC = amount.intValue();
        Map<String, Object> donnee = new HashMap<>();
        donnee.put(NotificationUtils.ITEMS.getId(), items);
        donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.RETOUR_FOURNISSEUR.getValue());
        donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donnee.put(NotificationUtils.NUM_BL.getId(), bonLivraison.getStrREFLIVRAISON());
        donnee.put(NotificationUtils.MONTANT_TTC.getId(), NumberUtils.formatIntToString(montantTTC));
        donnee.put(NotificationUtils.DATE_BON.getId(), DateCommonUtils.formatDate(bonLivraison.getDtDATELIVRAISON()));
        createNotification("", TypeNotification.RETOUR_FOURNISSEUR, user, donnee, retourFournisseur.getLgRETOURFRSID());
        retourFournisseur.setDlAMOUNT((double) montantTTC);

        emg.persist(retourFournisseur);

    }

    @Override
    public void validerFullBlRetourFournisseur(TRetourFournisseur retourFournisseur, TMotifRetour motifRetour,
            List<TBonLivraisonDetail> bonLivraisonDetails) {
        JSONArray items = new JSONArray();
        EntityManager emg = this.getEmg();
        TBonLivraison bonLivraison = retourFournisseur.getLgBONLIVRAISONID();
        Set<TRetourFournisseurDetail> retourFournisseurDetails = new HashSet<>();
        DoubleAdder amount = new DoubleAdder();
        TUser user = retourFournisseur.getLgUSERID();
        final TEmplacement empl = user.getLgEMPLACEMENTID();
        final String emplecementId = empl.getLgEMPLACEMENTID();
        for (TBonLivraisonDetail bonLivraisonDetail : bonLivraisonDetails) {
            bonLivraisonDetail.setIntQTERETURN(bonLivraisonDetail.getIntQTERECUE());
            TFamille tf = bonLivraisonDetail.getLgFAMILLEID();
            TFamilleStock stock = findStockByProduitId(tf.getLgFAMILLEID(), emplecementId);
            int sockInit = stock.getIntNUMBERAVAILABLE();
            int finalQty = sockInit - bonLivraisonDetail.getIntQTERECUE();
            amount.add(bonLivraisonDetail.getIntQTERECUE() * bonLivraisonDetail.getIntPAF());
            stock.setIntNUMBERAVAILABLE(finalQty);
            stock.setIntNUMBER(stock.getIntNUMBERAVAILABLE());
            stock.setDtUPDATED(new Date());
            TRetourFournisseurDetail retourFournisseurDetail = createRetourDetail(bonLivraisonDetail, sockInit,
                    motifRetour, retourFournisseur);
            retourFournisseurDetails.add(retourFournisseurDetail);
            emg.merge(stock);
            mouvementProduitService.saveMvtProduit(0, retourFournisseurDetail.getIntPAF(),
                    retourFournisseurDetail.getLgRETOURFRSDETAIL(), RETOUR_FOURNISSEUR, tf, user, empl,
                    retourFournisseurDetail.getIntNUMBERRETURN(), sockInit, finalQty, 0);

            suggestionService.makeSuggestionAuto(stock, tf);
            String desc = "Retour fournisseur du  produit " + tf.getIntCIP() + " " + tf.getStrNAME() + "Numéro BL =  "
                    + bonLivraison.getStrREFLIVRAISON() + " stock initial= " + sockInit + " qté retournée= "
                    + retourFournisseurDetail.getIntNUMBERRETURN() + " qté après retour = " + finalQty
                    + " . Retour effectué par " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
            logService.updateItem(user, tf.getIntCIP(), desc, TypeLog.RETOUR_FOURNISSEUR, tf);
            /*
             * notificationService.save(new Notification().canal(Canal.SMS)
             * .typeNotification(TypeNotification.RETOUR_FOURNISSEUR).message(desc).addUser(user));
             */
            this.getEmg().merge(bonLivraisonDetail);

            JSONObject jsonItemUg = new JSONObject();
            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tf.getIntCIP());
            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tf.getStrNAME());
            jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), retourFournisseurDetail.getIntNUMBERRETURN());
            jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), sockInit);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), finalQty);
            items.put(jsonItemUg);
        }
        int montantTTC = amount.intValue();
        Map<String, Object> donnee = new HashMap<>();
        donnee.put(NotificationUtils.ITEMS.getId(), items);
        donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.RETOUR_FOURNISSEUR.getValue());
        donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donnee.put(NotificationUtils.MONTANT_TVA.getId(), NumberUtils.formatIntToString(bonLivraison.getIntTVA()));
        donnee.put(NotificationUtils.NUM_BL.getId(), bonLivraison.getStrREFLIVRAISON());
        donnee.put(NotificationUtils.MONTANT_TTC.getId(), NumberUtils.formatIntToString(montantTTC));
        donnee.put(NotificationUtils.DATE_BON.getId(), DateCommonUtils.formatDate(bonLivraison.getDtDATELIVRAISON()));
        createNotification("", TypeNotification.RETOUR_FOURNISSEUR, user, donnee, retourFournisseur.getLgRETOURFRSID());
        retourFournisseur.setDlAMOUNT((double) montantTTC);

        emg.persist(retourFournisseur);
        retourFournisseurDetails.forEach(this.getEmg()::persist);
    }

    private TRetourFournisseurDetail createRetourDetail(TBonLivraisonDetail bonLivraisonDetail, int sockInit,
            TMotifRetour motifRetour, TRetourFournisseur retourFournisseur) {
        TFamille famille = bonLivraisonDetail.getLgFAMILLEID();
        TRetourFournisseurDetail oTRetourFournisseurDetail = new TRetourFournisseurDetail(UUID.randomUUID().toString());
        oTRetourFournisseurDetail.setLgRETOURFRSID(retourFournisseur);
        oTRetourFournisseurDetail.setIntNUMBERRETURN(bonLivraisonDetail.getIntQTERECUE());
        oTRetourFournisseurDetail.setIntNUMBERANSWER(oTRetourFournisseurDetail.getIntNUMBERRETURN());
        oTRetourFournisseurDetail.setIntPAF(bonLivraisonDetail.getIntPAF());
        oTRetourFournisseurDetail.setBonLivraisonDetail(bonLivraisonDetail);
        oTRetourFournisseurDetail.setDtCREATED(retourFournisseur.getDtCREATED());
        oTRetourFournisseurDetail.setDtUPDATED(oTRetourFournisseurDetail.getDtCREATED());
        oTRetourFournisseurDetail.setStrSTATUT(STATUT_IS_PROGRESS);
        oTRetourFournisseurDetail.setLgFAMILLEID(famille);
        oTRetourFournisseurDetail.setIntSTOCK(sockInit);
        oTRetourFournisseurDetail.setLgMOTIFRETOUR(motifRetour);
        return oTRetourFournisseurDetail;

    }

    private void deconditionner(TUser tu, TFamilleStock ofamilleStockParent, TFamilleStock familleStockChild,
            Integer qteVendue) {
        Integer numberToDecondition = 0;
        TFamille tFamilleParent = ofamilleStockParent.getLgFAMILLEID();
        TFamille tFamilleChild = familleStockChild.getLgFAMILLEID();
        Integer qtyDetail = tFamilleParent.getIntNUMBERDETAIL();
        Integer stockInitDetail = familleStockChild.getIntNUMBERAVAILABLE();
        Integer stockInit = ofamilleStockParent.getIntNUMBERAVAILABLE();
        Integer stockVirtuel = stockInitDetail + (stockInit * qtyDetail);
        int compare = stockVirtuel.compareTo(qteVendue);
        if (compare >= 0) {
            while (stockInitDetail < qteVendue) {
                numberToDecondition++;
                stockInitDetail += qtyDetail;
            }
            ofamilleStockParent
                    .setIntNUMBERAVAILABLE(ofamilleStockParent.getIntNUMBERAVAILABLE() - numberToDecondition);
            ofamilleStockParent.setIntNUMBER(ofamilleStockParent.getIntNUMBERAVAILABLE());
            ofamilleStockParent.setDtUPDATED(new Date());

            familleStockChild.setIntNUMBERAVAILABLE(
                    familleStockChild.getIntNUMBERAVAILABLE() + (numberToDecondition * qtyDetail));
            familleStockChild.setIntNUMBER(familleStockChild.getIntNUMBERAVAILABLE());
            familleStockChild.setDtUPDATED(new Date());
            getEmg().merge(ofamilleStockParent);
            TDeconditionnement parent = createDecondtionne(tFamilleParent, numberToDecondition, tu);
            TDeconditionnement child = createDecondtionne(tFamilleChild, (numberToDecondition * qtyDetail), tu);

            mouvementProduitService.saveMvtProduit(child.getLgDECONDITIONNEMENTID(), DECONDTIONNEMENT_POSITIF,
                    tFamilleChild, tu, ofamilleStockParent.getLgEMPLACEMENTID(), (numberToDecondition * qtyDetail),
                    stockInitDetail, stockInitDetail + (numberToDecondition * qtyDetail), 0);
            mouvementProduitService.saveMvtProduit(parent.getLgDECONDITIONNEMENTID(), DECONDTIONNEMENT_NEGATIF,
                    tFamilleParent, tu, ofamilleStockParent.getLgEMPLACEMENTID(), numberToDecondition, stockInit,
                    stockInit - numberToDecondition, 0);
            String desc = "Déconditionnement du produit [ " + tFamilleParent.getIntCIP() + " ] de "
                    + tFamilleParent.getIntPRICE() + " stock initial " + stockInit + " quantité déconditionnée "
                    + numberToDecondition + " stock finale " + (stockInit - numberToDecondition)
                    + " stock détail initial  " + stockInitDetail + " stock détail final = "
                    + (stockInitDetail + (numberToDecondition * qtyDetail)) + " . Opérateur : " + tu.getStrFIRSTNAME()
                    + " " + tu.getStrLASTNAME();
            logService.updateItem(tu, tFamilleParent.getIntCIP(), desc, TypeLog.DECONDITIONNEMENT, tFamilleParent);

            JSONArray items = new JSONArray();
            JSONObject jsonItemUg = new JSONObject();
            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), tFamilleParent.getIntCIP());
            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), tFamilleParent.getStrNAME());
            jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), numberToDecondition);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInit);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), stockInit - numberToDecondition);

            JSONObject detail = new JSONObject();
            detail.put(NotificationUtils.ITEM_KEY.getId(), tFamilleChild.getIntCIP());
            detail.put(NotificationUtils.ITEM_DESC.getId(), tFamilleChild.getStrNAME());
            detail.put(NotificationUtils.ITEM_QTY.getId(), (numberToDecondition * qtyDetail));
            detail.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInitDetail);
            detail.put(NotificationUtils.ITEM_QTY_FINALE.getId(), stockInitDetail + (numberToDecondition * qtyDetail));
            jsonItemUg.put(NotificationUtils.ITEMS.getId(), new JSONArray().put(detail));
            items.put(jsonItemUg);

            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.DECONDITIONNEMENT.getValue());
            donnee.put(NotificationUtils.USER.getId(), tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());

            createNotification(desc, TypeNotification.DECONDITIONNEMENT, tu, donnee, tFamilleParent.getLgFAMILLEID());

            /*
             * notificationService.save(new Notification().canal(Canal.EMAIL)
             * .typeNotification(TypeNotification.DECONDITIONNEMENT).message(desc).addUser(tu));
             */
        }
    }

    private void makeSuggestionAutoAsync(List<TPreenregistrementDetail> list, TEmplacement emplacement) {
        managedExecutorService.submit(() -> this.suggestionService.makeSuggestionAuto(list, emplacement));

    }

    private void createNotification(String msg, TypeNotification typeNotification, TUser user,
            Map<String, Object> donneesMap, String entityRef) {
        try {
            notificationService.save(
                    new Notification().entityRef(entityRef).donnees(this.notificationService.buildDonnees(donneesMap))
                            .setCategorieNotification(notificationService.getOneByName(typeNotification)).message(msg)
                            .addUser(user));
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }
}
