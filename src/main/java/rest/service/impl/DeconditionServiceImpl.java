/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.SalesParams;
import dal.Notification;
import dal.TDeconditionnement;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TMouvement;
import dal.TMouvementSnapshot;
import dal.TUser;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.DeconditionService;
import rest.service.LogService;
import rest.service.MouvementProduitService;
import rest.service.NotificationService;
import rest.service.SuggestionService;
import rest.service.v2.dto.DeconditionnementParamsDTO;
import util.Constant;
import util.DateCommonUtils;
import util.NotificationUtils;

/**
 *
 * @author Kobena
 */
@Stateless
public class DeconditionServiceImpl implements DeconditionService {

    private static final Logger LOG = Logger.getLogger(DeconditionServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SuggestionService suggestionService;
    @EJB
    private MouvementProduitService mouvementProduitService;
    @EJB
    private LogService logService;
    @EJB
    private NotificationService notificationService;

    public EntityManager getEntityManager() {
        return em;
    }

    private Optional<TMouvement> findByDay(TFamille tFamille, String lgEmpl) {
        try {
            TypedQuery<TMouvement> query = getEntityManager().createQuery(
                    "SELECT o FROM TMouvement o  WHERE o.dtDAY =?1 AND o.lgFAMILLEID.lgFAMILLEID =?2 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?3 AND o.strACTION =?4",
                    TMouvement.class);
            query.setParameter(1, new Date(), TemporalType.DATE);
            query.setParameter(2, tFamille.getLgFAMILLEID());
            query.setParameter(3, lgEmpl);
            query.setParameter(4, Constant.ACTION_DECONDITIONNEMENT);
            query.setFirstResult(0).setMaxResults(1);
            return Optional.ofNullable(query.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }

    }

    private TFamilleStock getTProductItemStock(String produitId, String empl) {

        TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable'",
                TFamilleStock.class);
        return q.setParameter(1, produitId).setParameter(2, empl).setFirstResult(0).setMaxResults(1).getSingleResult();
    }

    public void updateTMouvement(TMouvement mouvement, Integer quantity) {
        mouvement.setStrSTATUT(Constant.STATUT_ENABLE);
        mouvement.setDtUPDATED(new Date());
        mouvement.setIntNUMBERTRANSACTION(mouvement.getIntNUMBERTRANSACTION() + 1);
        mouvement.setIntNUMBER(mouvement.getIntNUMBER() + quantity);
        getEntityManager().merge(mouvement);

    }

    public void createTMouvement(TFamille fam, TEmplacement empl, String typeAction, String action, Integer quantity,
            TUser user) throws Exception {

        TMouvement mouvement = new TMouvement();
        mouvement.setLgMOUVEMENTID(UUID.randomUUID().toString());
        mouvement.setDtDAY(new Date());
        mouvement.setStrSTATUT(Constant.STATUT_ENABLE);
        mouvement.setLgFAMILLEID(fam);
        mouvement.setLgUSERID(user);
        mouvement.setPKey("");
        mouvement.setStrACTION(action);
        mouvement.setStrTYPEACTION(typeAction);
        mouvement.setDtCREATED(mouvement.getDtDAY());
        mouvement.setDtUPDATED(mouvement.getDtDAY());
        mouvement.setLgEMPLACEMENTID(empl);
        mouvement.setIntNUMBERTRANSACTION(1);
        mouvement.setIntNUMBER(quantity);
        getEntityManager().persist(mouvement);

    }

    private Optional<TMouvementSnapshot> findMouvementSnapshotByDay(TFamille oFamille, String lgEmpl) {
        try {
            TypedQuery<TMouvementSnapshot> query = getEntityManager().createQuery(
                    "SELECT o FROM TMouvementSnapshot o  WHERE o.dtDAY =?1 AND o.lgFAMILLEID.lgFAMILLEID =?2 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?3 AND o.strSTATUT='enable' ",
                    TMouvementSnapshot.class);
            query.setParameter(1, new Date(), TemporalType.DATE);
            query.setParameter(2, oFamille.getLgFAMILLEID());
            query.setParameter(3, lgEmpl);
            query.setFirstResult(0).setMaxResults(1);
            return Optional.ofNullable(query.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }

    }

    public void updateSnapshotMouvementArticle(TMouvementSnapshot oMouvementSnapshot, int quantity) {
        oMouvementSnapshot.setDtUPDATED(new Date());
        oMouvementSnapshot.setIntNUMBERTRANSACTION(oMouvementSnapshot.getIntNUMBERTRANSACTION() + 1);
        oMouvementSnapshot.setIntSTOCKJOUR(oMouvementSnapshot.getIntSTOCKJOUR() + quantity);
        getEntityManager().merge(oMouvementSnapshot);
    }

    @Override
    public JSONObject deconditionnementVente(SalesParams params) throws JSONException {
        int numberToDecondition = 1;
        JSONObject json = new JSONObject();
        try {
            TUser tu = params.getUserId();
            TEmplacement te = tu.getLgEMPLACEMENTID();
            TFamille oTFamilleChild = getEntityManager().find(TFamille.class, params.getProduitId());
            TFamille oTFamilleParent = getEntityManager().find(TFamille.class, oTFamilleChild.getLgFAMILLEPARENTID());
            Integer qtyDetail = oTFamilleParent.getIntNUMBERDETAIL();
            TFamilleStock oTFamilleStockParent = getTProductItemStock(oTFamilleParent.getLgFAMILLEID(),
                    te.getLgEMPLACEMENTID());
            TFamilleStock oTFamilleStockChild = getTProductItemStock(oTFamilleChild.getLgFAMILLEID(),
                    te.getLgEMPLACEMENTID());
            Integer stockInitDetail = oTFamilleStockChild.getIntNUMBERAVAILABLE();
            Integer stockInit = oTFamilleStockParent.getIntNUMBERAVAILABLE();
            Integer stockInitItem = stockInit * qtyDetail;
            if (params.getQte() > stockInitItem) {
                json.put("success", false);
                json.put("msg", "L'opération a échoué: Le stock est insuffisant");
                return json;
            }
            Integer x = stockInitDetail + qtyDetail;
            while (params.getQte() > x) {
                numberToDecondition++;
                x += qtyDetail;
            }
            oTFamilleStockParent
                    .setIntNUMBERAVAILABLE(oTFamilleStockParent.getIntNUMBERAVAILABLE() - numberToDecondition);
            oTFamilleStockParent.setIntNUMBER(oTFamilleStockParent.getIntNUMBERAVAILABLE());
            oTFamilleStockParent.setDtUPDATED(new Date());
            oTFamilleStockChild.setIntNUMBERAVAILABLE(
                    oTFamilleStockChild.getIntNUMBERAVAILABLE() + (numberToDecondition * qtyDetail));
            oTFamilleStockChild.setIntNUMBER(oTFamilleStockChild.getIntNUMBERAVAILABLE());
            oTFamilleStockChild.setDtUPDATED(new Date());
            getEntityManager().merge(oTFamilleStockParent);
            getEntityManager().merge(oTFamilleStockChild);
            createDecondtionne(oTFamilleParent, numberToDecondition, params.getUserId());
            createDecondtionne(oTFamilleChild, (numberToDecondition * qtyDetail), params.getUserId());
            Optional<TMouvement> opChild = findByDay(oTFamilleChild, te.getLgEMPLACEMENTID());
            if (opChild.isPresent()) {
                updateTMouvement(opChild.get(), (numberToDecondition * qtyDetail));
            } else {
                createTMouvement(oTFamilleChild, te, Constant.ADD, Constant.ACTION_DECONDITIONNEMENT,
                        (numberToDecondition * qtyDetail), params.getUserId());
            }
            Optional<TMouvement> opParent = findByDay(oTFamilleParent, te.getLgEMPLACEMENTID());
            if (opParent.isPresent()) {
                updateTMouvement(opParent.get(), numberToDecondition);
            } else {
                createTMouvement(oTFamilleParent, te, Constant.REMOVE, Constant.ACTION_DECONDITIONNEMENT,
                        numberToDecondition, params.getUserId());
            }
            Optional<TMouvementSnapshot> mvtChild = findMouvementSnapshotByDay(oTFamilleChild, te.getLgEMPLACEMENTID());
            if (mvtChild.isPresent()) {
                updateSnapshotMouvementArticle(mvtChild.get(), (numberToDecondition * qtyDetail));
            } else {
                createSnapshotMouvementArticle(oTFamilleChild, oTFamilleStockChild.getIntNUMBERAVAILABLE(),
                        stockInitDetail, te);
            }
            Optional<TMouvementSnapshot> mvtparent = findMouvementSnapshotByDay(oTFamilleParent,
                    te.getLgEMPLACEMENTID());
            if (mvtparent.isPresent()) {
                updateSnapshotMouvementArticle(mvtparent.get(), numberToDecondition);
            } else {
                createSnapshotMouvementArticle(oTFamilleParent, oTFamilleStockParent.getIntNUMBERAVAILABLE(), stockInit,
                        te);
            }
            json.put("success", true);
            json.put("msg", "opération effectuée avec success");
            suggestionService.makeSuggestionAuto(oTFamilleStockParent, oTFamilleParent);
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false);
            json.put("msg", "L'opération a échoué");
            return json;
        }
    }

    public void createSnapshotMouvementArticle(TFamille famille, int quantity, int stockDebut,
            TEmplacement emplacement) {

        TMouvementSnapshot mouvementSnapshot = new TMouvementSnapshot();
        mouvementSnapshot.setLgMOUVEMENTSNAPSHOTID(UUID.randomUUID().toString());
        mouvementSnapshot.setLgFAMILLEID(famille);
        mouvementSnapshot.setDtDAY(new Date());
        mouvementSnapshot.setDtCREATED(mouvementSnapshot.getDtDAY());
        mouvementSnapshot.setDtUPDATED(mouvementSnapshot.getDtDAY());
        mouvementSnapshot.setStrSTATUT(Constant.STATUT_ENABLE);
        mouvementSnapshot.setIntNUMBERTRANSACTION(1);
        mouvementSnapshot.setIntSTOCKJOUR(quantity);
        mouvementSnapshot.setIntSTOCKDEBUT(stockDebut);
        mouvementSnapshot.setLgEMPLACEMENTID(emplacement);
        getEntityManager().persist(mouvementSnapshot);
    }

    private TDeconditionnement createDecondtionne(TFamille famille, int quantity, TUser tUser) {

        TDeconditionnement deconditionnement = new TDeconditionnement();
        deconditionnement.setLgDECONDITIONNEMENTID(UUID.randomUUID().toString());
        deconditionnement.setLgFAMILLEID(famille);
        deconditionnement.setLgUSERID(tUser);
        deconditionnement.setIntNUMBER(quantity);
        deconditionnement.setDtCREATED(new Date());
        deconditionnement.setStrSTATUT(Constant.STATUT_ENABLE);
        getEntityManager().persist(deconditionnement);
        return deconditionnement;
    }

    @Override
    public void deconditionner(DeconditionnementParamsDTO paramsDTO, TUser user) throws Exception {
        doDeconditionnementStock(paramsDTO, user);
    }

    private void doDeconditionnementStock(DeconditionnementParamsDTO params, TUser user) throws Exception {
        String produitId = params.getProduitId();
        int quantity = params.getQuantity();
        TEmplacement oEmplacement = user.getLgEMPLACEMENTID();
        try {

            TFamille oTFamilleChild = em.find(TFamille.class, produitId);
            TFamille oTFamilleParent = em.find(TFamille.class, oTFamilleChild.getLgFAMILLEPARENTID());
            Integer qtyDetail = oTFamilleParent.getIntNUMBERDETAIL();
            TFamilleStock oTFamilleStockParent = getTProductItemStock(oTFamilleParent.getLgFAMILLEID(),
                    oEmplacement.getLgEMPLACEMENTID());
            if (oTFamilleStockParent.getIntNUMBERAVAILABLE() < quantity) {
                return;
            }

            TFamilleStock oTFamilleStockChild = getTProductItemStock(oTFamilleChild.getLgFAMILLEID(),
                    oEmplacement.getLgEMPLACEMENTID());
            Integer stockInitDetail = oTFamilleStockChild.getIntNUMBERAVAILABLE();
            Integer stockInit = oTFamilleStockParent.getIntNUMBERAVAILABLE();

            oTFamilleStockParent.setIntNUMBERAVAILABLE(oTFamilleStockParent.getIntNUMBERAVAILABLE() - quantity);
            oTFamilleStockParent.setIntNUMBER(oTFamilleStockParent.getIntNUMBERAVAILABLE());
            oTFamilleStockParent.setDtUPDATED(new Date());

            oTFamilleStockChild
                    .setIntNUMBERAVAILABLE(oTFamilleStockChild.getIntNUMBERAVAILABLE() + (quantity * qtyDetail));
            oTFamilleStockChild.setIntNUMBER(oTFamilleStockChild.getIntNUMBERAVAILABLE());
            oTFamilleStockChild.setDtUPDATED(new Date());
            em.merge(oTFamilleStockParent);
            em.merge(oTFamilleStockChild);
            TDeconditionnement p = createDecondtionne(oTFamilleParent, quantity, user);
            TDeconditionnement child = createDecondtionne(oTFamilleChild, (quantity * qtyDetail), user);
            mouvementProduitService.saveMvtProduit(p.getLgDECONDITIONNEMENTID(), Constant.DECONDTIONNEMENT_NEGATIF,
                    oTFamilleParent, user, oEmplacement, quantity, stockInit, stockInit - quantity, 0);
            mouvementProduitService.saveMvtProduit(child.getLgDECONDITIONNEMENTID(), Constant.DECONDTIONNEMENT_POSITIF,
                    oTFamilleChild, user, oEmplacement, quantity, stockInitDetail,
                    stockInitDetail + (quantity * qtyDetail), 0);
            String desc = "Déconditionnement du produit " + oTFamilleParent.getIntCIP() + " "
                    + oTFamilleParent.getStrNAME() + " nombre de boîtes = " + quantity + " nombre de détails ="
                    + (quantity * qtyDetail) + " opérateur " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
            logService.updateItem(user, oTFamilleParent.getIntCIP(), desc, TypeLog.DECONDITIONNEMENT, oTFamilleParent,
                    new Date());
            JSONArray items = new JSONArray();
            JSONObject jsonItemUg = new JSONObject();
            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), oTFamilleParent.getIntCIP());
            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), oTFamilleParent.getStrNAME());
            jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), quantity);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInit);
            jsonItemUg.put(NotificationUtils.ITEM_QTY_FINALE.getId(), stockInit - quantity);

            JSONObject detail = new JSONObject();
            detail.put(NotificationUtils.ITEM_KEY.getId(), oTFamilleChild.getIntCIP());
            detail.put(NotificationUtils.ITEM_DESC.getId(), oTFamilleChild.getStrNAME());
            detail.put(NotificationUtils.ITEM_QTY.getId(), (quantity * qtyDetail));
            detail.put(NotificationUtils.ITEM_QTY_INIT.getId(), stockInitDetail);
            detail.put(NotificationUtils.ITEM_QTY_FINALE.getId(), stockInitDetail + (quantity * qtyDetail));
            jsonItemUg.put(NotificationUtils.ITEMS.getId(), new JSONArray().put(detail));
            items.put(jsonItemUg);

            /*
             * notificationService.save(new Notification().canal(Canal.SMS_EMAIL)
             * .typeNotification(TypeNotification.DECONDITIONNEMENT).message(desc).addUser(user));
             */
            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEMS.getId(), items);
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.DECONDITIONNEMENT.getValue());
            donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());

            createNotification(desc, TypeNotification.DECONDITIONNEMENT, user, donnee,
                    oTFamilleParent.getLgFAMILLEID());

            try {
                TMouvement mouvement = findByDay(oTFamilleChild, oEmplacement.getLgEMPLACEMENTID()).get();
                updateTMouvement(mouvement, (quantity * qtyDetail));
                mouvement = findByDay(oTFamilleParent, oEmplacement.getLgEMPLACEMENTID()).get();
                updateTMouvement(mouvement, quantity);
            } catch (Exception e) {
                createTMouvement(oTFamilleChild, oEmplacement, Constant.ADD, Constant.ACTION_DECONDITIONNEMENT,
                        (quantity * qtyDetail), user);
                createTMouvement(oTFamilleParent, oEmplacement, Constant.REMOVE, Constant.ACTION_DECONDITIONNEMENT,
                        quantity, user);
                LOG.log(Level.INFO, null, e);
            }
            try {
                TMouvementSnapshot mouvementSnapshot = findMouvementSnapshotByDay(oTFamilleChild,
                        oEmplacement.getLgEMPLACEMENTID()).get();
                updateSnapshotMouvementArticle(mouvementSnapshot, (quantity * qtyDetail));
            } catch (Exception e) {
                createSnapshotMouvementArticle(oTFamilleChild, oTFamilleStockChild.getIntNUMBERAVAILABLE(),
                        stockInitDetail, oEmplacement);
                LOG.log(Level.INFO, null, e);
            }
            try {
                TMouvementSnapshot mouvementSnapshot = findMouvementSnapshotByDay(oTFamilleParent,
                        oEmplacement.getLgEMPLACEMENTID()).get();
                updateSnapshotMouvementArticle(mouvementSnapshot, quantity);
            } catch (Exception e) {
                createSnapshotMouvementArticle(oTFamilleParent, oTFamilleStockParent.getIntNUMBERAVAILABLE(), stockInit,
                        oEmplacement);
                LOG.log(Level.INFO, "---------------------- mouvementSnapshot -------------->>>", e);
            }

            if (oEmplacement.getLgEMPLACEMENTID().equalsIgnoreCase(Constant.PROCESS_SUCCESS)) {

                this.suggestionService.makeSuggestionAuto(oTFamilleStockParent, oTFamilleParent);
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            throw e;

        }

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
