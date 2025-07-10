/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.AjustementDetailDTO;
import commonTasks.dto.ComboDTO;
import commonTasks.dto.LotItemDTO;
import commonTasks.dto.MvtArticleParams;
import commonTasks.dto.MvtProduitDTO;
import commonTasks.dto.Params;
import commonTasks.dto.QueryDTO;
import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.SearchDTO;
import commonTasks.dto.ValorisationDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.CategorieNotification;
import dal.GammeProduit;
import dal.HMvtProduit;
import dal.HMvtProduit_;
import dal.Laboratoire;
import dal.Notification;
import dal.TAjustementDetail;
import dal.TBonLivraisonDetail;
import dal.TCodeActe;
import dal.TCodeGestion;
import dal.TCodeTva;
import dal.TDeconditionnement;
import dal.TEmplacement_;
import dal.TEventLog;
import dal.TFabriquant;
import dal.TFabriquant_;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TFamillearticle;
import dal.TFamillearticle_;
import dal.TFormeArticle;
import dal.TGrossiste;
import dal.TGrossiste_;
import dal.TInventaireFamille;
import dal.TParameters;
import dal.TPreenregistrementDetail;
import dal.TRetourFournisseurDetail;
import dal.TStockSnapshot;
import dal.TStockSnapshotPK_;
import dal.TStockSnapshot_;
import dal.TTypeStock;
import dal.TTypeStockFamille;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TWarehouse;
import dal.TZoneGeographique;
import dal.TZoneGeographique_;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.LogService;
import rest.service.NotificationService;
import rest.service.ProduitService;
import rest.service.SessionHelperService;
import rest.service.dto.CreationProduitDTO;
import util.Constant;
import util.DateCommonUtils;
import util.DateConverter;
import util.IdGenerator;
import util.NotificationUtils;

/**
 *
 * @author DICI
 */
@Stateless
public class ProduitServiceImpl implements ProduitService {

    private static final Logger LOG = Logger.getLogger(ProduitServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;
    @EJB
    private NotificationService notificationService;
    @EJB
    private SessionHelperService sessionHelperService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject produitDesactives(QueryDTO params, boolean all) throws JSONException {
        JSONObject json = new JSONObject();

        try {

            long count = produitsDesactivesCount(params);
            if (count == 0) {
                json.put("total", count);
                json.put("data", new JSONArray());
                return json;
            }

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<SearchDTO> cq = cb.createQuery(SearchDTO.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleGrossiste> st = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            Join<TFamille, TFamilleStock> fa = root.join("tFamilleStockCollection", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            if (params.getQuery() != null && !"".equals(params.getQuery())) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(root.get(TFamille_.strNAME), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.intCIP), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.intEAN13), params.getQuery() + "%"),
                                cb.like(st.get("strCODEARTICLE"), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.lgFAMILLEID), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.strDESCRIPTION), params.getQuery() + "%")));
            }
            predicate = cb.and(predicate, cb.equal(root.get(TFamille_.strSTATUT), params.getStatut()));
            predicate = cb.and(predicate,
                    cb.equal(fa.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), params.getEmplacementId()));
            cq.select(cb.construct(SearchDTO.class, root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP),
                    root.get(TFamille_.strNAME), root.get(TFamille_.intPRICE),
                    fa.get(TFamilleStock_.intNUMBERAVAILABLE), root.get(TFamille_.intPAF),
                    fa.get(TFamilleStock_.intNUMBER), root.get(TFamille_.dtUPDATED)))
                    .orderBy(cb.asc(root.get(TFamille_.strNAME))).distinct(true);
            cq.where(predicate);
            Query q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }

            List<SearchDTO> list = q.getResultList();
            json.put("total", count);
            json.put("data", new JSONArray(list));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    @Override
    public long produitsDesactivesCount(QueryDTO params) {

        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleGrossiste> st = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            Join<TFamille, TFamilleStock> fa = root.join("tFamilleStockCollection", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            if (params.getQuery() != null && !"".equals(params.getQuery())) {
                predicate = cb.and(predicate,
                        cb.or(cb.like(root.get(TFamille_.strNAME), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.intCIP), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.intEAN13), params.getQuery() + "%"),
                                cb.like(st.get("strCODEARTICLE"), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.lgFAMILLEID), params.getQuery() + "%"),
                                cb.like(root.get(TFamille_.strDESCRIPTION), params.getQuery() + "%")));
            }
            predicate = cb.and(predicate, cb.equal(root.get(TFamille_.strSTATUT), params.getStatut()));
            predicate = cb.and(predicate,
                    cb.equal(fa.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), params.getEmplacementId()));

            cq.select(cb.countDistinct(root));

            cq.where(predicate);

            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
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

    private JSONObject updateProuitDesactive(String id, String statut, TUser u, TypeLog typeLog) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TFamille famille = getEntityManager().find(TFamille.class, id);
            famille.setStrSTATUT(statut);
            famille.setDtUPDATED(new Date());
            getEntityManager().merge(famille);
            updateFamilleGrossiste(famille, statut);
            json.put("success", true).put("msg", "Opération effectuée avec success");
            String desc = " ";
            TypeNotification notification = TypeNotification.ACTIVATION_DE_PRODUIT;

            if (DateConverter.STATUT_ENABLE.equalsIgnoreCase(statut)) {
                desc = "Activation ";
                notification = TypeNotification.ACTIVATION_DE_PRODUIT;
            } else if (DateConverter.STATUT_DELETE.equalsIgnoreCase(statut)) {
                desc = "Suppression ";
                notification = TypeNotification.SUPPRESSION_DE_PRODUIT;
            } else if (DateConverter.STATUT_DISABLE.equalsIgnoreCase(statut)) {
                desc = "Désactivation ";
                notification = TypeNotification.DESACTIVATION_DE_PRODUIT;
            }

            desc += " du produit " + famille.getIntCIP() + " " + famille.getStrNAME() + " stock = "
                    + getFamilleStockByProduitId(id, u.getLgEMPLACEMENTID().getLgEMPLACEMENTID()) + ", par "
                    + u.getStrFIRSTNAME() + u.getStrLASTNAME();
            logService.updateItem(u, famille.getIntCIP(), desc, typeLog, famille);
            /*
             * notificationService.save( new
             * Notification().canal(Canal.SMS_EMAIL).typeNotification(notification).message(desc).addUser(u));
             */

            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.ITEM_KEY.getId(), famille.getLgFAMILLEID());
            donnee.put(NotificationUtils.ITEM_DESC.getId(), famille.getStrNAME());
            donnee.put(NotificationUtils.TYPE_NAME.getId(), typeLog.getValue());
            donnee.put(NotificationUtils.USER.getId(), u.getStrFIRSTNAME() + " " + u.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            createNotification(desc, notification, u, donnee, famille.getLgFAMILLEID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Erreur ! l'opération n'a pas abouti");
        }
        return json;
    }

    @Override
    public JSONObject supprimerProduitDesactive(String id, TUser tUser) throws JSONException {
        return updateProuitDesactive(id, DateConverter.STATUT_DELETE, tUser, TypeLog.SUPPRESSION_DE_PRODUIT);
    }

    @Override
    public JSONObject activerProduitDesactive(String id, TUser tUser) throws JSONException {
        return updateProuitDesactive(id, DateConverter.STATUT_ENABLE, tUser, TypeLog.ACTIVATION_DE_PRODUIT);
    }

    @Override
    public JSONObject desactiverProduitDesactive(String id, TUser tUser) throws JSONException {
        return updateProuitDesactive(id, DateConverter.STATUT_DISABLE, tUser, TypeLog.DESACTIVATION_DE_PRODUIT);
    }

    private void updateFamilleGrossiste(TFamille famille, String statut) {
        getFamilleGrossistesByFamille(famille.getLgFAMILLEID()).forEach(f -> {
            f.setDtUPDATED(new Date());
            f.setStrSTATUT(statut);
            getEntityManager().merge(f);
        });
        getByFamille(famille.getLgFAMILLEID()).forEach(f -> {
            f.setDtUPDATED(new Date());
            f.setStrSTATUT(statut);
            getEntityManager().merge(f);
        });

    }

    @Override
    public List<TFamilleGrossiste> getFamilleGrossistesByFamille(String idFamille) {
        try {
            TypedQuery<TFamilleGrossiste> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1", TFamilleGrossiste.class);
            q.setParameter(1, idFamille);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<TFamilleStock> getByFamille(String idFamille) {

        try {
            TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1", TFamilleStock.class);
            q.setParameter(1, idFamille);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public Integer getLastStockForDay(String idFamille, String empl, LocalDate date) {
        try {
            TypedQuery<HMvtProduit> q = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.famille.lgFAMILLEID =?1 AND o.emplacement.lgEMPLACEMENTID=?2 AND o.mvtDate=?3  ORDER BY o.createdAt DESC",
                    HMvtProduit.class);
            q.setParameter(1, idFamille);
            q.setParameter(2, empl);
            q.setParameter(3, date);
            q.setFirstResult(0);
            q.setMaxResults(1);
            HMvtProduit hMvtProduit = q.getSingleResult();
            if (hMvtProduit != null) {
                return hMvtProduit.getQteFinale();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private Integer getFamilleStockByProduitId(String idFamille, String empl) {
        try {
            TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 AND o.strSTATUT='enable'",
                    TFamilleStock.class);
            q.setParameter(1, idFamille);
            q.setParameter(2, empl);
            q.setMaxResults(1);
            TFamilleStock familleStock = q.getSingleResult();
            return familleStock.getIntNUMBERAVAILABLE();
        } catch (Exception e) {
            return 0;
        }
    }

    private List<TFamille> produitMvtArticle(MvtArticleParams params) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TFamille> cq = cb.createQuery(TFamille.class);
            Root<HMvtProduit> root = cq.from(HMvtProduit.class);
            Join<HMvtProduit, TFamille> fa = root.join(HMvtProduit_.famille, JoinType.INNER);
            cq.select(root.get(HMvtProduit_.famille)).distinct(true)
                    .orderBy(cb.asc(root.get(HMvtProduit_.famille).get(TFamille_.strNAME)));
            predicates.add(cb.and(cb.equal(root.get(HMvtProduit_.emplacement).get(TEmplacement_.lgEMPLACEMENTID),
                    params.getMagasinId())));

            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(HMvtProduit_.mvtDate)),
                    java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd()));
            predicates.add(cb.and(btw));
            if (params.getCategorieId() != null && !"".equals(params.getCategorieId())) {
                predicates.add(
                        cb.and(cb.equal(fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                                params.getCategorieId())));
            }
            if (params.getSearch() != null && !"".equals(params.getSearch())) {
                Predicate predicate = cb.and(cb.or(cb.like(fa.get(TFamille_.intCIP), params.getSearch() + "%"),
                        cb.like(fa.get(TFamille_.strNAME), params.getSearch() + "%")));
                predicates.add(predicate);
            }
            if (params.getRayonId() != null && !"".equals(params.getRayonId())) {
                predicates.add(cb.and(cb.equal(fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID),
                        params.getRayonId())));
            }
            if (params.getFabricantId() != null && !"".equals(params.getFabricantId())) {
                predicates.add(cb.and(cb.equal(fa.get(TFamille_.lgFABRIQUANTID).get(TFabriquant_.lgFABRIQUANTID),
                        params.getFabricantId())));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TFamille> q = getEntityManager().createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<HMvtProduit> suivitMvtArcticle(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl) {
        try {
            TypedQuery<HMvtProduit> q = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.famille.lgFAMILLEID=?3 AND o.emplacement.lgEMPLACEMENTID=?4   ",
                    HMvtProduit.class);
            q.setParameter(1, dtStart).setParameter(2, dtEnd).setParameter(3, produitId).setParameter(4, empl);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    public long suivitMvtArcticleCount(MvtArticleParams params) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<HMvtProduit> root = cq.from(HMvtProduit.class);
            Join<HMvtProduit, TFamille> fa = root.join(HMvtProduit_.famille, JoinType.INNER);
            cq.select(cb.countDistinct(root.get(HMvtProduit_.famille)));
            predicates.add(cb.and(cb.equal(root.get(HMvtProduit_.emplacement).get(TEmplacement_.lgEMPLACEMENTID),
                    params.getMagasinId())));

            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(HMvtProduit_.mvtDate)),
                    java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd()));
            predicates.add(cb.and(btw));
            if (params.getCategorieId() != null && !"".equals(params.getCategorieId())) {
                predicates.add(
                        cb.and(cb.equal(fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                                params.getCategorieId())));

            }
            if (params.getSearch() != null && !"".equals(params.getSearch())) {
                Predicate predicate = cb.and(cb.or(cb.like(fa.get(TFamille_.intCIP), params.getSearch() + "%"),
                        cb.like(fa.get(TFamille_.strNAME), params.getSearch() + "%")));
                predicates.add(predicate);
            }
            if (params.getRayonId() != null && !"".equals(params.getRayonId())) {
                predicates.add(cb.and(cb.equal(fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID),
                        params.getRayonId())));
            }
            if (params.getFabricantId() != null && !"".equals(params.getFabricantId())) {
                predicates.add(cb.and(cb.equal(fa.get(TFamille_.lgFABRIQUANTID).get(TFabriquant_.lgFABRIQUANTID),
                        params.getFabricantId())));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public JSONObject suivitMvtArcticleViewDatas(MvtArticleParams params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            long count = suivitMvtArcticleCount(params);
            if (count == 0) {
                json.put("total", count);
                json.put("data", new JSONArray());
                return json;
            }
            List<MvtProduitDTO> data = suivitMvtArcticle(params);
            json.put("total", count);
            json.put("data", new JSONArray(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject findAllFamilleArticle(String query) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TFamillearticle> tq = getEntityManager().createQuery(
                    "SELECT o FROM TFamillearticle o WHERE o.strLIBELLE LIKE ?1 ORDER BY o.strLIBELLE DESC",
                    TFamillearticle.class);
            tq.setParameter(1, query + "%");
            List<TFamillearticle> geographiques = tq.getResultList();
            json.put("total", geographiques.size());
            json.put("data", geographiques.stream().map(x -> new ComboDTO(x.getLgFAMILLEARTICLEID(), x.getStrLIBELLE()))
                    .collect(Collectors.toList()));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject findAllFabricants(String query) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TFabriquant> tq = getEntityManager().createQuery(
                    "SELECT o FROM TFabriquant o WHERE o.strNAME LIKE ?1 ORDER BY o.strNAME DESC", TFabriquant.class);
            tq.setParameter(1, query + "%");
            List<TFabriquant> geographiques = tq.getResultList();
            json.put("total", geographiques.size());
            json.put("data", geographiques.stream().map(x -> new ComboDTO(x.getLgFABRIQUANTID(), x.getStrNAME()))
                    .collect(Collectors.toList()));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject findAllRayons(String query) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TZoneGeographique> tq = getEntityManager().createQuery(
                    "SELECT o FROM TZoneGeographique o WHERE o.strLIBELLEE LIKE ?1 ORDER BY o.strLIBELLEE DESC",
                    TZoneGeographique.class);
            tq.setParameter(1, query + "%");
            List<TZoneGeographique> geographiques = tq.getResultList();
            json.put("total", geographiques.size());
            json.put("data", geographiques.stream().map(x -> new ComboDTO(x.getLgZONEGEOID(), x.getStrLIBELLEE()))
                    .collect(Collectors.toList()));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclateViewDatas(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {
            MvtProduitDTO mvtProduit = suivitEclate(dtStart, dtEnd, produitId, empl);
            List<MvtProduitDTO> data = mvtProduit.getProduits();
            data.sort(mvtrByDate);
            json.put("total", data.size());
            json.put("data", new JSONArray(data));
            json.put("metaData", new JSONObject(mvtProduit));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public TFamille findById(String produitId) {
        try {
            return getEntityManager().find(TFamille.class, produitId);
        } catch (Exception e) {
            return null;
        }

    }

    private MvtProduitDTO findInitialQty(LocalDate dtStart, String produitId) {
        try {
            TypedQuery<MvtProduitDTO> q = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.MvtProduitDTO(o.qteDebut) FROM HMvtProduit o WHERE o.mvtDate=?1 AND o.famille.lgFAMILLEID=?2 ORDER BY o.createdAt ASC ",
                    MvtProduitDTO.class);
            q.setParameter(1, dtStart);
            q.setParameter(2, produitId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findInitialQty", e);
            return null;
        }
    }

    private MvtProduitDTO findFinalQty(LocalDate dtStart, String produitId) {
        try {
            TypedQuery<MvtProduitDTO> q = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.MvtProduitDTO(o.qteFinale) FROM HMvtProduit o WHERE o.mvtDate=?1 AND o.famille.lgFAMILLEID=?2 ORDER BY o.createdAt DESC ",
                    MvtProduitDTO.class);
            q.setParameter(1, dtStart);
            q.setParameter(2, produitId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findFinalQty", e);
            return null;
        }
    }

    @Override
    public MvtProduitDTO suivitEclate(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl) {
        MvtProduitDTO mvtProduit = new MvtProduitDTO();
        try {
            List<MvtProduitDTO> mvtProduits = new ArrayList<>();
            LongAdder qtyVente = new LongAdder(), qtyAnnulation = new LongAdder(), qtyRetour = new LongAdder(),
                    qtyRetourDepot = new LongAdder(), qtyInv = new LongAdder(), qtyPerime = new LongAdder(),
                    qtyAjust = new LongAdder();
            LongAdder qtyAjustSortie = new LongAdder(), qtyDeconEntrant = new LongAdder(),
                    qtyDecondSortant = new LongAdder(), qtyEntree = new LongAdder();
            Map<LocalDate, List<HMvtProduit>> hmps = suivitMvtArcticle(dtStart, dtEnd, produitId, empl).stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getMvtDate));
            hmps.forEach((k, values) -> {
                MvtProduitDTO mvt = new MvtProduitDTO();
                LongAdder venteStock = new LongAdder();
                mvt.setDateOperation(k);
                values.sort(comparatorByDateTime);

                MvtProduitDTO init = findInitialQty(k, values.get(0).getFamille().getLgFAMILLEID());
                mvt.setStockInit(init.getStockInit());

                MvtProduitDTO stockFinal = findFinalQty(k, values.get(0).getFamille().getLgFAMILLEID());
                mvt.setStockFinal(stockFinal.getStockInit());
                Map<String, List<HMvtProduit>> map = values.stream()
                        .collect(Collectors.groupingBy(p -> p.getTypemvtproduit().getId()));
                map.forEach((e, val) -> {
                    switch (e) {
                    case DateConverter.ENTREE_EN_STOCK:
                        mvt.setQtyEntree(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.VENTE:
                        venteStock.add(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.ANNULATION_DE_VENTE:
                        mvt.setQtyAnnulation(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.TMVTP_VENTE_DEPOT_EXTENSION:
                        venteStock.add(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.INVENTAIRE:
                        mvt.setEcartInventaire(findEcartInventaire(Long.parseLong(val.get(0).getPkey())));
                        mvt.setQtyInv(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.DECONDTIONNEMENT_POSITIF:
                        mvt.setQtyDeconEntrant(
                                val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.DECONDTIONNEMENT_NEGATIF:
                        mvt.setQtyDecondSortant(
                                val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.AJUSTEMENT_NEGATIF:
                        mvt.setQtyAjustSortie(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.AJUSTEMENT_POSITIF:
                        mvt.setQtyAjust(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.RETOUR_FOURNISSEUR:
                        mvt.setQtyRetour(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.PERIME:
                        mvt.setQtyPerime(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.TMVTP_RETOUR_DEPOT:
                        mvt.setQtyRetourDepot(val.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    default:
                        break;
                    }
                });
                mvt.setQtyVente(venteStock.intValue());
                qtyAjust.add(mvt.getQtyAjust());
                qtyEntree.add(mvt.getQtyEntree());
                qtyDecondSortant.add(mvt.getQtyDecondSortant());
                qtyDeconEntrant.add(mvt.getQtyDeconEntrant());
                qtyAjustSortie.add(mvt.getQtyAjustSortie());
                qtyPerime.add(mvt.getQtyPerime());
                qtyRetourDepot.add(mvt.getQtyRetourDepot());
                qtyInv.add(mvt.getQtyInv());
                qtyVente.add(venteStock.intValue());
                qtyAnnulation.add(mvt.getQtyAnnulation());
                qtyRetour.add(mvt.getQtyRetour());
                mvtProduits.add(mvt);
            });
            mvtProduit.setQtyAjust(qtyAjust.intValue());
            mvtProduit.setQtyEntree(qtyEntree.intValue());
            mvtProduit.setQtyDecondSortant(qtyDecondSortant.intValue());
            mvtProduit.setQtyDeconEntrant(qtyDeconEntrant.intValue());
            mvtProduit.setQtyAjustSortie(qtyAjustSortie.intValue());
            mvtProduit.setQtyPerime(qtyPerime.intValue());
            mvtProduit.setQtyRetourDepot(qtyRetourDepot.intValue());
            mvtProduit.setQtyInv(qtyInv.intValue());
            mvtProduit.setQtyVente(qtyVente.intValue());
            mvtProduit.setQtyAnnulation(qtyAnnulation.intValue());
            mvtProduit.setQtyRetour(qtyRetour.intValue());
            mvtProduit.setProduits(mvtProduits);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return mvtProduit;
    }

    Comparator<MvtProduitDTO> comparatorByLibelle = Comparator.comparing(MvtProduitDTO::getProduitName);

    Comparator<HMvtProduit> comparatorByDateTime = Comparator.comparing(HMvtProduit::getCreatedAt);
    Comparator<MvtProduitDTO> mvtrByDate = Comparator.comparing(MvtProduitDTO::getDateOperation);

    int findEcartInventaire(long pk) {
        try {
            TInventaireFamille tif = this.getEntityManager().find(TInventaireFamille.class, pk);
            return tif.getIntNUMBER() - tif.getIntNUMBERINIT();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public List<MvtProduitDTO> suivitMvtArcticle(MvtArticleParams params) {
        try {

            List<TFamille> familles = produitMvtArticle(params);
            List<MvtProduitDTO> mvtProduits = new ArrayList<>();
            familles.stream().forEach(v -> {
                LongAdder venteStock = new LongAdder();
                MvtProduitDTO mvtProduit = new MvtProduitDTO();
                mvtProduit.setCip(v.getIntCIP());
                mvtProduit.setProduitId(v.getLgFAMILLEID());
                mvtProduit.setProduitName(v.getStrNAME());
                mvtProduit.setCurrentStock(getFamilleStockByProduitId(v.getLgFAMILLEID(), params.getMagasinId()));
                Map<String, List<HMvtProduit>> hmps = suivitMvtArcticle(params.getDtStart(), params.getDtEnd(),
                        v.getLgFAMILLEID(), params.getMagasinId()).stream()
                                .collect(Collectors.groupingBy(p -> p.getTypemvtproduit().getId()));

                hmps.forEach((k, values) -> {
                    switch (k) {
                    case DateConverter.ENTREE_EN_STOCK:
                        // case DateConverter.TMVTP_RETOUR_DEPOT:
                        mvtProduit.setQtyEntree(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.VENTE:
                    case DateConverter.TMVTP_VENTE_DEPOT_EXTENSION:
                        Integer qtyVente = values.parallelStream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum);
                        venteStock.add(qtyVente);
                        break;
                    case DateConverter.ANNULATION_DE_VENTE:
                    case DateConverter.TMVTP_ANNUL_VENTE_DEPOT_EXTENSION:
                        mvtProduit
                                .setQtyAnnulation(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;

                    case DateConverter.INVENTAIRE:
                        mvtProduit.setEcartInventaire(findEcartInventaire(Long.parseLong(values.get(0).getPkey())));
                        mvtProduit.setQtyInv(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.DECONDTIONNEMENT_POSITIF:
                        mvtProduit.setQtyDeconEntrant(
                                values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.DECONDTIONNEMENT_NEGATIF:
                        mvtProduit.setQtyDecondSortant(
                                values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;

                    case DateConverter.AJUSTEMENT_NEGATIF:
                        mvtProduit
                                .setQtyAjustSortie(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.AJUSTEMENT_POSITIF:
                        mvtProduit.setQtyAjust(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.RETOUR_FOURNISSEUR:
                        mvtProduit.setQtyRetour(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.PERIME:
                        mvtProduit.setQtyPerime(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    case DateConverter.TMVTP_RETOUR_DEPOT:
                        mvtProduit
                                .setQtyRetourDepot(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                        break;
                    default:
                        break;
                    }
                });
                mvtProduit.setQtyVente(venteStock.intValue());
                mvtProduits.add(mvtProduit);
            });
            mvtProduits.sort(comparatorByLibelle);
            return mvtProduits;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    Comparator<VenteDetailsDTO> venteComparator = Comparator.comparing(VenteDetailsDTO::getDateOperation);
    Comparator<RetourDetailsDTO> retourComparator = Comparator.comparing(RetourDetailsDTO::getDateOperation);

    @Override
    public JSONObject suivitEclateVentes(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 AND ?3 AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?4 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'",
                    TPreenregistrementDetail.class);
            q.setParameter(1, produitId);
            q.setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(4, empl);
            List<TPreenregistrementDetail> list = q.getResultList();
            List<VenteDetailsDTO> data = list.stream().map(x -> new VenteDetailsDTO(x, true)).sorted(venteComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));

            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    Comparator<AjustementDetailDTO> ajustComparator = Comparator.comparing(AjustementDetailDTO::getDateOperation);

    @Override
    public JSONObject suivitEclateAjustement(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl,
            boolean positif) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TAjustementDetail> q;
            if (positif) {
                q = getEntityManager().createQuery(
                        "SELECT o FROM TAjustementDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.intNUMBER > 0 AND o.lgAJUSTEMENTID.strSTATUT='enable'",
                        TAjustementDetail.class);
            } else {
                q = getEntityManager().createQuery(
                        "SELECT o FROM TAjustementDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgAJUSTEMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.intNUMBER < 0 AND o.lgAJUSTEMENTID.strSTATUT='enable'",
                        TAjustementDetail.class);
            }
            q.setParameter(1, produitId);
            q.setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(4, empl);
            List<TAjustementDetail> list = q.getResultList();
            List<AjustementDetailDTO> data = list.stream().map(AjustementDetailDTO::new).sorted(ajustComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclateDecond(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl,
            boolean positif) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TDeconditionnement> q;
            if (positif) {
                q = getEntityManager().createQuery(
                        "SELECT o FROM TDeconditionnement o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.intNUMBER > 0 AND o.strSTATUT='enable'",
                        TDeconditionnement.class);
            } else {
                q = getEntityManager().createQuery(
                        "SELECT o FROM TDeconditionnement o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.intNUMBER < 0 AND o.strSTATUT='enable'",
                        TDeconditionnement.class);
            }
            q.setParameter(1, produitId);
            q.setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(4, empl);
            List<TDeconditionnement> list = q.getResultList();
            List<RetourDetailsDTO> data = list.stream().map(RetourDetailsDTO::new).sorted(retourComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclateInv(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {

            TypedQuery<HMvtProduit> q = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.famille.lgFAMILLEID=?1 AND  o.mvtDate BETWEEN ?2 and ?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.typemvtproduit.id=?5 ",
                    HMvtProduit.class);
            q.setParameter(1, produitId);
            q.setParameter(2, dtStart);
            q.setParameter(3, dtEnd);
            q.setParameter(4, empl);
            q.setParameter(5, DateConverter.INVENTAIRE);
            List<HMvtProduit> list = q.getResultList();
            List<RetourDetailsDTO> data = list.stream().map(x -> new RetourDetailsDTO(x, true)).sorted(retourComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));

            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclateAnnulation(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?4 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.lgPREENREGISTREMENTID.intPRICE < 0",
                    TPreenregistrementDetail.class);
            q.setParameter(1, produitId);
            q.setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(4, empl);
            List<TPreenregistrementDetail> list = q.getResultList();
            List<VenteDetailsDTO> data = list.stream().map(x -> new VenteDetailsDTO(x, true)).sorted(venteComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));

            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclatePerime(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {

            TypedQuery<HMvtProduit> q = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.famille.lgFAMILLEID =?1 AND  o.mvtDate  BETWEEN ?2 and ?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?4 AND o.typemvtproduit.id=?5 ",
                    HMvtProduit.class);
            q.setParameter(1, produitId);
            q.setParameter(2, dtStart);
            q.setParameter(3, dtEnd);
            q.setParameter(4, empl);
            q.setParameter(5, DateConverter.PERIME);
            List<HMvtProduit> list = q.getResultList();
            List<LotItemDTO> data = list.stream()
                    .map(x -> new LotItemDTO(x, getEntityManager().find(TWarehouse.class, x.getPkey())))
                    .sorted(entreeComparator).collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    Comparator<LotItemDTO> entreeComparator = Comparator.comparing(LotItemDTO::getDateOperation);

    private TBonLivraisonDetail findBonLivraisonDetail(String produitId, String refBon) {
        try {
            TypedQuery<TBonLivraisonDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TBonLivraisonDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgBONLIVRAISONID.strREFLIVRAISON=?2 ",
                    TBonLivraisonDetail.class);
            q.setParameter(1, produitId);
            q.setParameter(2, refBon);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public JSONObject suivitEclateEntree(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {
            if (empl.equals("1")) {
                TypedQuery<TWarehouse> q = getEntityManager().createQuery(
                        "SELECT o FROM TWarehouse o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?4 AND o.strSTATUT='enable'  ",
                        TWarehouse.class);
                q.setParameter(1, produitId);
                q.setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
                q.setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
                q.setParameter(4, empl);
                List<TWarehouse> list = q.getResultList();
                List<LotItemDTO> data = list.stream()
                        .map(x -> new LotItemDTO(x, findBonLivraisonDetail(produitId, x.getStrREFLIVRAISON())))
                        .sorted(entreeComparator).collect(Collectors.toList());
                json.put("total", data.size());
                json.put("data", new JSONArray(data));
                return json;
            }
            return suivitEclateEntreeDepot(dtStart, dtEnd, produitId, empl);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    public JSONObject suivitEclateEntreeDepot(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {

            TypedQuery<HMvtProduit> q = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.famille.lgFAMILLEID=?1 AND  o.mvtDate BETWEEN ?2 and ?3 AND o.emplacement.lgEMPLACEMENTID=?4  AND o.typemvtproduit.id=?5 ",
                    HMvtProduit.class);
            q.setParameter(1, produitId);
            q.setParameter(2, dtStart);
            q.setParameter(3, dtEnd);
            q.setParameter(4, empl);
            q.setParameter(5, DateConverter.TMVTP_VENTE_DEPOT_EXTENSION);
            List<HMvtProduit> list = q.getResultList();
            List<LotItemDTO> data = list.stream().map(x -> new LotItemDTO(x)).sorted(entreeComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));

            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclateRetourFour(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TRetourFournisseurDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TRetourFournisseurDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?2 and ?3 AND o.lgRETOURFRSID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.lgRETOURFRSID.strSTATUT='enable'",
                    TRetourFournisseurDetail.class);
            q.setParameter(1, produitId);
            q.setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(4, empl);
            List<TRetourFournisseurDetail> list = q.getResultList();
            List<RetourDetailsDTO> data = list.stream().map(RetourDetailsDTO::new).sorted(retourComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject suivitEclateRetourDepot(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {

            TypedQuery<HMvtProduit> q = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.famille.lgFAMILLEID=?1 AND  o.mvtDate BETWEEN ?2 and ?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?4  AND o.typemvtproduit.id=?5 ",
                    HMvtProduit.class);
            q.setParameter(1, produitId);
            q.setParameter(2, dtStart);
            q.setParameter(3, dtEnd);
            q.setParameter(4, empl);
            q.setParameter(5, DateConverter.TMVTP_RETOUR_DEPOT);
            List<HMvtProduit> list = q.getResultList();
            List<RetourDetailsDTO> data = list.stream().map(RetourDetailsDTO::new).sorted(retourComparator)
                    .collect(Collectors.toList());
            json.put("total", data.size());
            json.put("data", new JSONArray(data));

            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    @Override
    public JSONObject valorisationStock(int mode, LocalDate dtStart, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) throws JSONException {
        return new JSONObject().put("data", new JSONObject(getValeurStock(mode, dtStart, lgGROSSISTEID,
                lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN, emplacementId)));
    }

    private Params getValeurStockFrorCurrenDate(int mode, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Params> cq = cb.createQuery(Params.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> stock = root.join(TFamille_.tFamilleStockCollection, JoinType.INNER);
            cq.select(cb.construct(Params.class,
                    cb.sumAsLong(cb.prod(root.get(TFamille_.intPAF), stock.get(TFamilleStock_.intNUMBERAVAILABLE))),
                    cb.sumAsLong(cb.prod(root.get(TFamille_.intPRICE), stock.get(TFamilleStock_.intNUMBERAVAILABLE)))));
            predicates.add(cb.equal(root.get(TFamille_.strSTATUT), DateConverter.STATUT_ENABLE));
            predicates.add(cb.equal(stock.get(TFamilleStock_.strSTATUT), DateConverter.STATUT_ENABLE));
            predicates.add(cb.equal(stock.get(TFamilleStock_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID),
                    emplacementId));
            switch (mode) {
            case 3:
                Join<TFamille, TGrossiste> gr = root.join(TFamille_.lgGROSSISTEID, JoinType.INNER);
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    predicates.add(cb.equal(gr.get(TGrossiste_.lgGROSSISTEID), lgGROSSISTEID));

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(cb.greaterThanOrEqualTo(gr.get(TGrossiste_.strCODE), BEGIN));
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(cb.lessThanOrEqualTo(gr.get(TGrossiste_.strCODE), END));
                    }
                }

                break;
            case 2:
                Join<TFamille, TZoneGeographique> zne = root.join(TFamille_.lgZONEGEOID, JoinType.INNER);
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    predicates.add(cb.equal(zne.get(TZoneGeographique_.lgZONEGEOID), lgZONEGEOID));

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(cb.greaterThanOrEqualTo(zne.get(TZoneGeographique_.strCODE), BEGIN));
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(cb.lessThanOrEqualTo(zne.get(TZoneGeographique_.strCODE), END));
                    }
                }
                break;

            case 1:
                Join<TFamille, TFamillearticle> fm = root.join(TFamille_.lgFAMILLEARTICLEID, JoinType.INNER);
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    predicates.add(cb.equal(fm.get(TFamillearticle_.lgFAMILLEARTICLEID), lgFAMILLEARTICLEID));

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(cb.greaterThanOrEqualTo(fm.get(TFamillearticle_.strCODEFAMILLE), BEGIN));
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(cb.lessThanOrEqualTo(fm.get(TFamillearticle_.strCODEFAMILLE), END));
                    }
                }
                break;
            default:

                break;
            }

            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            TypedQuery<Params> q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new Params(0, 0);
        }

    }

    @Override
    public Params getValeurStock(int mode, LocalDate dtStart, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) {

        if (dtStart.equals(LocalDate.now())) {
            return getValeurStockFrorCurrenDate(mode, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN,
                    emplacementId);
        }
        return getValeurStaticStock(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN,
                emplacementId);

    }

    @Override
    public ValorisationDTO getValeurStockPdf(int mode, LocalDate dtStart, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        if (dtStart.equals(LocalDate.now())) {
            return valorisationCurrentStock(mode, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN,
                    emplacementId);
        }
        return valorisation(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN, emplacementId);
    }
    // on obtient le stock ds produit qui n'ont pas subit de mvt à cette date

    private Params getValeurStaticStock(int mode, LocalDate date, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            List<Predicate> predicates2 = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Params> cq = cb.createQuery(Params.class);
            Root<TStockSnapshot> root = cq.from(TStockSnapshot.class);
            cq.select(cb.construct(Params.class,
                    cb.sumAsLong(cb.prod(root.get(TStockSnapshot_.prixPaf), root.get(TStockSnapshot_.qty))),
                    cb.sumAsLong(cb.prod(root.get(TStockSnapshot_.prixUni), root.get(TStockSnapshot_.qty)))));
            predicates2.add(cb.equal(root.get(TStockSnapshot_.tStockSnapshotPK).get(TStockSnapshotPK_.id), date));
            predicates2.add(
                    cb.equal(root.get(TStockSnapshot_.tStockSnapshotPK).get(TStockSnapshotPK_.magasin), emplacementId));
            Subquery<String> sub = cq.subquery(String.class);
            Root<TFamille> subroot = sub.from(TFamille.class);
            sub.select(subroot.get(TFamille_.lgFAMILLEID));
            predicates.add(cb.equal(subroot.get(TFamille_.lgFAMILLEID),
                    root.get(TStockSnapshot_.tStockSnapshotPK).get(TStockSnapshotPK_.familleId)));
            switch (mode) {
            case 3:
                Join<TFamille, TGrossiste> gr = subroot.join(TFamille_.lgGROSSISTEID, JoinType.INNER);
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    predicates.add(cb.equal(gr.get(TGrossiste_.lgGROSSISTEID), lgGROSSISTEID));

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(cb.greaterThanOrEqualTo(gr.get(TGrossiste_.strCODE), BEGIN));
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(cb.lessThanOrEqualTo(gr.get(TGrossiste_.strCODE), END));
                    }
                }
                break;
            case 2:
                Join<TFamille, TZoneGeographique> zne = subroot.join(TFamille_.lgZONEGEOID, JoinType.INNER);
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    predicates.add(cb.equal(zne.get(TZoneGeographique_.lgZONEGEOID), lgZONEGEOID));
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(cb.greaterThanOrEqualTo(zne.get(TZoneGeographique_.strCODE), BEGIN));
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(cb.lessThanOrEqualTo(zne.get(TZoneGeographique_.strCODE), END));
                    }
                }
                break;

            case 1:
                Join<TFamille, TFamillearticle> fm = subroot.join(TFamille_.lgFAMILLEARTICLEID, JoinType.INNER);
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    predicates.add(cb.equal(fm.get(TFamillearticle_.lgFAMILLEARTICLEID), lgFAMILLEARTICLEID));

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(cb.greaterThanOrEqualTo(fm.get(TFamillearticle_.strCODEFAMILLE), BEGIN));
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(cb.lessThanOrEqualTo(fm.get(TFamillearticle_.strCODEFAMILLE), END));
                    }
                }
                break;
            default:

                break;
            }
            sub.where(predicates.toArray(Predicate[]::new));
            predicates2
                    .add(cb.in(root.get(TStockSnapshot_.tStockSnapshotPK).get(TStockSnapshotPK_.familleId)).value(sub));
            cq.where(predicates2.toArray(Predicate[]::new));
            TypedQuery<Params> q = getEntityManager().createQuery(cq);
            // q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new Params(0, 0);
        }
    }

    // les produits qui on subit un mvt à cette date
    private ValorisationDTO valorisation(final int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append(
                    "SELECT SUM(o.prixPaf*o.qty) AS montantFacture, SUM(o.prixUni*o.qty) AS montantPu ,SUM(o.prixTarif*o.qty) AS montantTarif , SUM(o.qty) AS qty , SUM(o.prix_moyent_pondere) AS pmp  ");
            predicates.add(" o.id = :operationDate");
            predicates.add(" o.magasin = :emplacementId");
            parasm.put("operationDate", date);
            parasm.put("emplacementId", emplacementId);
            switch (mode) {
            case 3:
                query.append(
                        ",g.str_LIBELLE AS LIBELLE,g.str_CODE AS CODE FROM t_stock_snapshot o, t_famille f, t_grossiste g ");
                predicates.add(" o.familleId=f.lg_FAMILLE_ID ");
                predicates.add(" f.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    predicates.add(" f.lg_GROSSISTE_ID = :idParam ");
                    parasm.put("idParam", lgGROSSISTEID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY g.lg_GROSSISTE_ID ORDER BY g.str_CODE ASC ");
                break;
            case 2:
                query.append(
                        ",g.str_LIBELLEE AS LIBELLE,g.str_CODE AS CODE FROM t_stock_snapshot o, t_famille f, t_zone_geographique g ");
                predicates.add(" o.familleId=f.lg_FAMILLE_ID ");
                predicates.add(" f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    predicates.add(" f.lg_ZONE_GEO_ID = :idParam ");
                    parasm.put("idParam", lgZONEGEOID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY g.lg_ZONE_GEO_ID ORDER BY g.str_CODE ASC ");
                break;
            case 1:
                query.append(
                        ",g.str_LIBELLE AS LIBELLE,g.str_CODE_FAMILLE AS CODE FROM t_stock_snapshot o, t_famille f, t_famillearticle g");
                predicates.add(" o.familleId=f.lg_FAMILLE_ID ");
                predicates.add(" f.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    predicates.add(" f.lg_FAMILLEARTICLE_ID = :idParam ");
                    parasm.put("idParam", lgFAMILLEARTICLEID);

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE_FAMILLE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE_FAMILLE <= :fin ");
                        parasm.put("fin", END);
                    }
                }
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY g.lg_FAMILLEARTICLE_ID ORDER BY g.str_CODE_FAMILLE ASC ");
                break;
            default:
                query.append(",o.valeurTva AS tva FROM t_stock_snapshot o ");
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY o.valeurTva");
                break;
            }

            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> {
                q.setParameter(k, v);
            });
            List<Object[]> result = q.getResultList();
            LongAdder _montantFacture = new LongAdder();
            LongAdder _montantPu = new LongAdder();
            LongAdder _montantTarif = new LongAdder();
            LongAdder _qty = new LongAdder();
            LongAdder pmp = new LongAdder();
            result.forEach((_item) -> {
                ValorisationDTO dTO = new ValorisationDTO();
                Integer montantFacture = Integer.valueOf(_item[0] + "");
                _montantFacture.add(montantFacture);
                dTO.setMontantFacture(montantFacture);
                Integer montantPu = Integer.valueOf(_item[1] + "");
                dTO.setMontantPu(montantPu);
                _montantPu.add(montantPu);
                Integer montantTarif = Integer.valueOf(_item[2] + "");
                _montantTarif.add(montantTarif);
                dTO.setMontantTarif(montantTarif);
                Integer qty = Integer.valueOf(_item[3] + "");
                _qty.add(qty);
                int _pmp = Double.valueOf(_item[4] + "").intValue();
                pmp.add(_pmp);
                dTO.setMontantPmd(_pmp);
                if (mode == 0) {
                    dTO.setLibelle("Tva " + _item[5]);
                } else {
                    dTO.setLibelle("" + _item[5]);
                    dTO.setCode("" + _item[6]);
                }
                os.add(dTO);
            });
            valorisation.setDatas(os);
            valorisation.setMontantFacture(_montantFacture.intValue());
            valorisation.setMontantTarif(_montantTarif.intValue());
            Integer montantPu = _montantPu.intValue();
            valorisation.setMontantPu(montantPu);
            valorisation.setMontantPmd(pmp.intValue());
            ValorisationDTO tvas = valorisationTva(mode, date, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                    BEGIN, emplacementId);
            valorisation.setTvas(tvas);
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    private ValorisationDTO valorisationTva(final int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append(
                    "SELECT SUM(o.prixPaf*o.qty) AS montantFacture, SUM(o.prixUni*o.qty) AS montantPu ,SUM(o.prixTarif*o.qty) AS montantTarif , SUM(o.qty) AS qty,o.valeurTva AS tva,SUM(o.prix_moyent_pondere) AS pmp ");
            predicates.add(" o.id = :operationDate");
            predicates.add(" o.magasin = :emplacementId");
            parasm.put("operationDate", date);
            parasm.put("emplacementId", emplacementId);
            switch (mode) {
            case 3:
                query.append(" FROM t_stock_snapshot o, t_famille f, t_grossiste g ");
                predicates.add(" o.familleId=f.lg_FAMILLE_ID ");
                predicates.add(" f.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    predicates.add(" f.lg_GROSSISTE_ID = :idParam ");
                    parasm.put("idParam", lgGROSSISTEID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);

                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }

                break;
            case 2:
                query.append("  FROM t_stock_snapshot o, t_famille f, t_zone_geographique g ");
                predicates.add(" o.familleId=f.lg_FAMILLE_ID ");
                predicates.add(" f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");

                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    predicates.add(" f.lg_ZONE_GEO_ID = :idParam ");
                    parasm.put("idParam", lgZONEGEOID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }

                break;

            case 1:
                query.append("  FROM t_stock_snapshot o, t_famille f, t_famillearticle g");
                predicates.add(" o.familleId=f.lg_FAMILLE_ID ");
                predicates.add(" f.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    predicates.add(" f.lg_FAMILLEARTICLE_ID = :idParam ");
                    parasm.put("idParam", lgFAMILLEARTICLEID);

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE_FAMILLE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE_FAMILLE <= :fin ");
                        parasm.put("fin", END);
                    }
                }

                break;
            default:
                query.append("  FROM t_stock_snapshot o");

                break;

            }
            query.append(" WHERE ");
            for (int i = 0; i < predicates.size(); i++) {
                if (i > 0) {
                    query.append(" AND ");
                }
                query.append(predicates.get(i));
            }
            query.append(" GROUP BY o.valeurTva");
            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> {
                q.setParameter(k, v);
            });
            List<Object[]> result = q.getResultList();
            LongAdder _montantFacture = new LongAdder();
            LongAdder _montantPu = new LongAdder();
            LongAdder _montantTarif = new LongAdder();
            LongAdder _qty = new LongAdder();
            LongAdder pmp = new LongAdder();
            result.forEach((_item) -> {
                ValorisationDTO dTO = new ValorisationDTO();
                Integer montantFacture = Integer.valueOf(_item[0] + "");
                _montantFacture.add(montantFacture);
                dTO.setMontantFacture(montantFacture);
                Integer montantPu = Integer.valueOf(_item[1] + "");
                dTO.setMontantPu(montantPu);
                _montantPu.add(montantPu);
                Integer montantTarif = Integer.valueOf(_item[2] + "");
                _montantTarif.add(montantTarif);
                dTO.setMontantTarif(montantTarif);
                Integer qty = Integer.valueOf(_item[3] + "");
                Integer _pmp = Double.valueOf(_item[5] + "").intValue();
                pmp.add(_pmp);
                _qty.add(qty);
                dTO.setMontantPmd(_pmp);
                dTO.setLibelle("Tva " + _item[4]);
                os.add(dTO);
            });

            valorisation.setDatas(os);
            valorisation.setMontantFacture(_montantFacture.intValue());
            valorisation.setMontantTarif(_montantTarif.intValue());
            Integer montantPu = _montantPu.intValue();
            valorisation.setMontantPu(montantPu);
            valorisation.setMontantPmd(pmp.intValue());
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    private ValorisationDTO valorisationCurrentStock(final int mode, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append(
                    "SELECT SUM(o.int_PAF *s.int_NUMBER_AVAILABLE) AS montantFacture, SUM(o.int_PRICE *s.int_NUMBER_AVAILABLE) AS montantPu ,SUM(o.int_PAT *s.int_NUMBER_AVAILABLE) AS montantTarif , SUM(s.int_NUMBER_AVAILABLE) AS qty ,SUM(o.dbl_PRIX_MOYEN_PONDERE) AS pmp");
            predicates.add(" s.lg_EMPLACEMENT_ID = :emplacementId");
            predicates.add(" o.str_STATUT = :statut");
            parasm.put("statut", DateConverter.STATUT_ENABLE);
            parasm.put("emplacementId", emplacementId);
            switch (mode) {
            case 3:
                query.append(
                        ",g.str_LIBELLE AS LIBELLE,g.str_CODE AS CODE FROM t_famille o, t_famille_stock s, t_grossiste g ");
                predicates.add(" o.lg_FAMILLE_ID=s.lg_FAMILLE_ID ");
                predicates.add(" o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    predicates.add(" o.lg_GROSSISTE_ID = :idParam ");
                    parasm.put("idParam", lgGROSSISTEID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY g.lg_GROSSISTE_ID ORDER BY g.str_CODE ASC ");
                break;
            case 2:
                query.append(
                        ",g.str_LIBELLEE AS LIBELLE,g.str_CODE AS CODE FROM t_famille o, t_famille_stock s, t_zone_geographique g ");
                predicates.add(" o.lg_FAMILLE_ID=s.lg_FAMILLE_ID ");
                predicates.add(" o.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    predicates.add(" o.lg_ZONE_GEO_ID = :idParam ");
                    parasm.put("idParam", lgZONEGEOID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY g.lg_ZONE_GEO_ID ORDER BY g.str_CODE ASC ");
                break;

            case 1:
                query.append(
                        ",g.str_LIBELLE AS LIBELLE,g.str_CODE_FAMILLE AS CODE FROM t_famille o, t_famille_stock s, t_famillearticle g");
                predicates.add(" o.lg_FAMILLE_ID=s.lg_FAMILLE_ID ");
                predicates.add(" o.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    predicates.add(" o.lg_FAMILLEARTICLE_ID = :idParam ");
                    parasm.put("idParam", lgFAMILLEARTICLEID);

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE_FAMILLE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE_FAMILLE <= :fin ");
                        parasm.put("fin", END);
                    }
                }
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY g.lg_FAMILLEARTICLE_ID ORDER BY g.str_CODE_FAMILLE ASC ");
                break;
            default:
                query.append(",v.int_VALUE AS tva FROM t_famille o, t_famille_stock s,t_code_tva v ");
                predicates.add(" o.lg_FAMILLE_ID=s.lg_FAMILLE_ID ");
                predicates.add("  o.lg_CODE_TVA_ID=v.lg_CODE_TVA_ID ");
                query.append(" WHERE ");
                for (int i = 0; i < predicates.size(); i++) {
                    if (i > 0) {
                        query.append(" AND ");
                    }
                    query.append(predicates.get(i));
                }
                query.append(" GROUP BY v.int_VALUE");
                break;
            }

            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> {
                q.setParameter(k, v);
            });
            List<Object[]> result = q.getResultList();
            LongAdder _montantFacture = new LongAdder();
            LongAdder _montantPu = new LongAdder();
            LongAdder _montantTarif = new LongAdder();
            LongAdder _qty = new LongAdder();
            LongAdder pmp = new LongAdder();
            result.forEach((_item) -> {
                ValorisationDTO dTO = new ValorisationDTO();
                Integer montantFacture = Integer.valueOf(_item[0] + "");
                _montantFacture.add(montantFacture);
                dTO.setMontantFacture(montantFacture);
                Integer montantPu = Integer.valueOf(_item[1] + "");
                dTO.setMontantPu(montantPu);
                _montantPu.add(montantPu);
                Integer montantTarif = Integer.valueOf(_item[2] + "");
                _montantTarif.add(montantTarif);
                dTO.setMontantTarif(montantTarif);
                Integer qty = Integer.valueOf(_item[3] + "");
                Integer _pmp = Double.valueOf(_item[4] + "").intValue();
                _qty.add(qty);
                pmp.add(_pmp);
                dTO.setMontantPmd(_pmp);
                if (mode == 0) {
                    dTO.setLibelle("Tva " + _item[5]);
                } else {
                    dTO.setLibelle("" + _item[5]);
                    dTO.setCode("" + _item[6]);
                }
                os.add(dTO);
            });
            valorisation.setDatas(os);
            valorisation.setMontantFacture(_montantFacture.intValue());
            valorisation.setMontantTarif(_montantTarif.intValue());
            Integer montantPu = _montantPu.intValue();
            valorisation.setMontantPu(montantPu);
            valorisation.setMontantPmd(pmp.intValue());
            ValorisationDTO tvas = valorisationCurrentStockTva(mode, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID,
                    END, BEGIN, emplacementId);
            valorisation.setTvas(tvas);
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    private ValorisationDTO valorisationCurrentStockTva(final int mode, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append(
                    "SELECT SUM(o.int_PAF *s.int_NUMBER_AVAILABLE) AS montantFacture, SUM(o.int_PRICE *s.int_NUMBER_AVAILABLE) AS montantPu ,SUM(o.int_PAT *s.int_NUMBER_AVAILABLE) AS montantTarif , SUM(s.int_NUMBER_AVAILABLE) AS qty, SUM(o.dbl_PRIX_MOYEN_PONDERE) AS pmp ");
            predicates.add(" s.lg_EMPLACEMENT_ID = :emplacementId");
            predicates.add(" o.str_STATUT = :statut");
            parasm.put("statut", DateConverter.STATUT_ENABLE);
            parasm.put("emplacementId", emplacementId);
            predicates.add(" o.lg_FAMILLE_ID=s.lg_FAMILLE_ID ");
            switch (mode) {
            case 3:
                query.append(" ,v.int_VALUE AS tva FROM t_famille o, t_famille_stock s, t_grossiste g ,t_code_tva v ");
                predicates.add(" o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                predicates.add("  o.lg_CODE_TVA_ID=v.lg_CODE_TVA_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    predicates.add(" o.lg_GROSSISTE_ID = :idParam ");
                    parasm.put("idParam", lgGROSSISTEID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);

                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }

                break;
            case 2:
                query.append(
                        " ,v.int_VALUE AS tva FROM t_famille o, t_famille_stock s, t_zone_geographique g ,t_code_tva v ");
                predicates.add(" o.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                predicates.add("  o.lg_CODE_TVA_ID=v.lg_CODE_TVA_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    predicates.add(" o.lg_ZONE_GEO_ID = :idParam ");
                    parasm.put("idParam", lgZONEGEOID);
                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE <= :fin ");
                        parasm.put("fin", END);
                    }
                }

                break;

            case 1:
                query.append(
                        " ,v.int_VALUE AS tva FROM t_famille o, t_famille_stock s, t_famillearticle g,t_code_tva v ");
                predicates.add(" o.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                predicates.add("  o.lg_CODE_TVA_ID=v.lg_CODE_TVA_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    predicates.add(" o.lg_FAMILLEARTICLE_ID = :idParam ");
                    parasm.put("idParam", lgFAMILLEARTICLEID);

                } else {
                    if (BEGIN != null && !"".equals(BEGIN)) {
                        predicates.add(" g.str_CODE_FAMILLE >= :debut ");
                        parasm.put("debut", BEGIN);
                    }
                    if (END != null && !"".equals(END)) {
                        predicates.add(" g.str_CODE_FAMILLE <= :fin ");
                        parasm.put("fin", END);
                    }
                }

                break;
            default:
                query.append(",v.int_VALUE FROM t_famille o, t_famille_stock s, t_code_tva v ");
                predicates.add("  o.lg_CODE_TVA_ID=v.lg_CODE_TVA_ID ");
                break;
            }

            query.append(" WHERE ");
            for (int i = 0; i < predicates.size(); i++) {
                if (i > 0) {
                    query.append(" AND ");
                }
                query.append(predicates.get(i));
            }
            query.append(" GROUP BY v.int_VALUE");
            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> {
                q.setParameter(k, v);
            });
            List<Object[]> result = q.getResultList();
            LongAdder montantFacture0 = new LongAdder();
            LongAdder montantPu0 = new LongAdder();
            LongAdder montantTarif0 = new LongAdder();
            LongAdder pmp = new LongAdder();
            LongAdder qty0 = new LongAdder();
            result.forEach(item0 -> {
                ValorisationDTO dTO = new ValorisationDTO();
                Integer montantFacture = Integer.valueOf(item0[0] + "");
                montantFacture0.add(montantFacture);
                dTO.setMontantFacture(montantFacture);
                Integer montantPu = Integer.valueOf(item0[1] + "");
                dTO.setMontantPu(montantPu);
                montantPu0.add(montantPu);
                Integer montantTarif = Integer.valueOf(item0[2] + "");
                montantTarif0.add(montantTarif);
                dTO.setMontantTarif(montantTarif);
                Integer qty = Integer.valueOf(item0[3] + "");
                qty0.add(qty);
                int pmp0 = Double.valueOf(item0[4] + "").intValue();
                pmp.add(pmp0);
                dTO.setMontantPmd(pmp0);
                dTO.setLibelle("Tva " + item0[5]);
                os.add(dTO);
            });

            valorisation.setDatas(os);
            valorisation.setMontantFacture(montantFacture0.intValue());
            valorisation.setMontantTarif(montantTarif0.intValue());
            Integer montantPu = montantPu0.intValue();
            valorisation.setMontantPu(montantPu);
            valorisation.setMontantPmd(pmp.intValue());

            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    private String generateCIP(String codeCip) {
        if (codeCip.length() == 6) {
            int resultCIP = 0;
            for (int i = 0; i < codeCip.length(); i++) {
                resultCIP += Character.getNumericValue(codeCip.charAt(i)) * (i + 2);
            }
            return codeCip + (resultCIP % 11);
        }
        return codeCip;
    }

    private Optional<TParameters> getParamettre(String key) {
        if (StringUtils.isEmpty(key)) {
            return Optional.empty();
        }
        return Optional.ofNullable(em.find(TParameters.class, key));
    }

    @Override
    public TFamilleGrossiste createTFamilleGrossisteFromRupture(CreationProduitDTO creationProduit, TFamille famille,
            TGrossiste grossiste) {
        TFamilleGrossiste familleGrossiste = new TFamilleGrossiste();
        familleGrossiste.setStrCODEARTICLE(creationProduit.getIntCip());
        familleGrossiste.setLgFAMILLEID(famille);
        familleGrossiste.setLgGROSSISTEID(grossiste);
        familleGrossiste.setIntPAF(creationProduit.getIntPaf());
        familleGrossiste.setIntPRICE(creationProduit.getIntPrice());
        familleGrossiste.setStrSTATUT(Constant.STATUT_ENABLE);
        familleGrossiste.setDtCREATED(new Date());
        familleGrossiste.setDtUPDATED(familleGrossiste.getDtCREATED());
        em.persist(familleGrossiste);
        return familleGrossiste;
    }

    @Override
    public TFamille createProduitFromRupture(CreationProduitDTO creationProduit, TGrossiste grossiste) {

        return create(creationProduit, creationProduit.getIntCip(), grossiste);
    }

    @Override
    public JSONObject createProduit(CreationProduitDTO creationProduit) {
        JSONObject json = new JSONObject();

        if (StringUtils.isEmpty(creationProduit.getIntCip()) || creationProduit.getIntCip().length() < 6) {
            return json.put("message", "Le code CIP doit avoir au minimum 6 caractères").put("success", "0");

        }
        TGrossiste grossiste = getGrossiste(creationProduit.getLgGrossisteId());
        String codeCip = generateCIP(creationProduit.getIntCip());
        TFamilleGrossiste existant = this.isCIPExist(codeCip, grossiste.getLgGROSSISTEID());
        if (existant != null) {
            return json.put("message", "Impossible d'utiliser ce code. Code CIP du grossiste principal de l'article "
                    + existant.getLgFAMILLEID().getStrDESCRIPTION()).put("success", "0");
        }
        TFamille existProduct = isCIPGrossistet(codeCip, grossiste.getLgGROSSISTEID());
        if (existProduct != null) {
            return json.put("message", "Impossible d'utiliser ce code. Code CIP du grossiste principal de l'article "
                    + existProduct.getStrDESCRIPTION()).put("success", "0");
        }
        create(creationProduit, codeCip, grossiste);

        return json.put("success", "1");

    }

    private TFamille create(CreationProduitDTO creationProduit, String codeCip, TGrossiste grossiste) {
        TFamille famille = new TFamille(UUID.randomUUID().toString());
        famille.setDtCREATED(new Date());
        famille.setLgGROSSISTEID(grossiste);
        famille.setIntCIP(codeCip);
        updateProduitCommon(famille, creationProduit);

        em.persist(famille);
        createFamilleGrossiste(famille);
        createFamilleStock(famille, creationProduit.getIntQuantityStock());
        buildNotificationCreationProduit(famille, TypeNotification.AJOUT_DE_NOUVEAU_PRODUIT,
                TypeLog.AJOUT_DE_NOUVEAU_PRODUIT);
        return famille;
    }

    private void updateProduitCommon(TFamille famille, CreationProduitDTO creationProduit) {
        int intTauxTableau = getParamettre(Constant.KEY_TAUX_CODE_TABLEAU)
                .map(p -> Integer.valueOf(p.getStrVALUE().trim())).orElse(0);
        int unitPrice = StringUtils.isNoneBlank(creationProduit.getIntT())
                && StringUtils.isEmpty(creationProduit.getLgFamilleParentId())
                        ? creationProduit.getIntPrice() + intTauxTableau : creationProduit.getIntPrice();
        famille.setStrNAME(creationProduit.getStrName());
        famille.setStrDESCRIPTION(creationProduit.getStrDescription());
        famille.setIntPRICE(unitPrice);
        famille.setIntPRICETIPS(creationProduit.getIntPriceTips());
        famille.setIntTAUXMARQUE(creationProduit.getIntTauxMarque());
        famille.setIntPAF(creationProduit.getIntPaf());
        famille.setIntPAT(creationProduit.getIntPat());
        famille.setIntS(creationProduit.getIntS());
        famille.setIntT(creationProduit.getIntT());
        famille.setIntEAN13(creationProduit.getIntEan13());
        famille.setCmuPrice(creationProduit.getCmuPrice());
        if (StringUtils.isNotEmpty(creationProduit.getDtPeremtion())) {
            famille.setDtPEREMPTION(java.sql.Date.valueOf(creationProduit.getDtPeremtion()));
        }

        famille.setLgFAMILLEARTICLEID(getFamillearticle(creationProduit.getLgFamilleArticleId()));
        famille.setLgCODEACTEID(getCodeActe(creationProduit.getLgCodeActeId()));
        famille.setLgCODEGESTIONID(getCodeGestion(creationProduit.getLgCodeGestionId()));
        famille.setStrCODEREMISE(creationProduit.getStrCodeRemise());
        famille.setStrCODETAUXREMBOURSEMENT(creationProduit.getStrCodeTauxRemboursement());
        famille.setLgZONEGEOID(getRayon(creationProduit.getLgZoneGeoId()));
        famille.setIntSEUILMAX(creationProduit.getSeuilMax());
        famille.setIntNUMBERDETAIL(creationProduit.getIntQteDetail());
        famille.setLgFORMEID(getFormeArticle(creationProduit.getLgFormeArticleId()));
        famille.setLgFABRIQUANTID(getFabriquant(creationProduit.getLgFabriquantId()));
        famille.setBoolDECONDITIONNE(creationProduit.getBoolDeconditionne());
        famille.setLgTYPEETIQUETTEID(getTypeetiquette(creationProduit.getLgTypeEtiquetteId()));

        famille.setLgCODETVAID(getCodeTva(creationProduit.getLgCodeTvaId()));
        famille.setBoolRESERVE(creationProduit.isBoolReserve());
        famille.setIntSEUILRESERVE(creationProduit.getIntSeuilReserve());
        famille.setLgFAMILLEPARENTID(creationProduit.getLgFamilleParentId());
        famille.setIntSTOCKREAPROVISONEMENT(creationProduit.getIntStockReaprovisonement());
        famille.setIntQTEREAPPROVISIONNEMENT(creationProduit.getIntQteReapprovisionnement());
        famille.setIntSEUILMIN(famille.getIntSTOCKREAPROVISONEMENT());
        famille.setBoolCHECKEXPIRATIONDATE(isExpirationDateActivated());
        famille.setLaboratoire(getLaboratoire(creationProduit.getLaboratoireId()));
        famille.setGamme(getGammeProduit(creationProduit.getGammeId()));
        famille.setDtUPDATED(new Date());

        if (famille.getBoolDECONDITIONNE() == 1) {
            famille.setBoolDECONDITIONNEEXIST(Short.valueOf("1"));
        } else {

            famille.setBoolDECONDITIONNEEXIST(Short.valueOf("0"));
        }

    }

    public TFamilleGrossiste isCIPExist(String intCip, String grossisteId) {
        try {
            TypedQuery<TFamilleGrossiste> q = em.createQuery(
                    "SELECT t FROM TFamilleGrossiste t WHERE t.strCODEARTICLE = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2",
                    TFamilleGrossiste.class);
            q.setParameter(1, intCip).setParameter(2, grossisteId).setMaxResults(1);

            return q.getSingleResult();

        } catch (Exception e) {

        }
        return null;
    }

    public TFamille isCIPGrossistet(String intCip, String grossisteId) {
        try {
            TypedQuery<TFamille> q = em.createQuery(
                    "SELECT t FROM TFamille t WHERE t.intCIP=?1 AND t.lgGROSSISTEID.lgGROSSISTEID =?2", TFamille.class);
            q.setParameter(1, intCip).setParameter(2, grossisteId).setMaxResults(1);

            return q.getSingleResult();

        } catch (Exception e) {

        }
        return null;
    }

    private TGrossiste getGrossiste(String grossisteId) {
        TypedQuery<TGrossiste> q = em.createQuery(
                "SELECT t FROM TGrossiste t WHERE (t.lgGROSSISTEID = ?1 OR t.strLIBELLE = ?1)", TGrossiste.class);
        q.setParameter(1, grossisteId).getSingleResult();
        return q.getSingleResult();
    }

    private TCodeActe getCodeActe(String codeActeId) {
        if (StringUtils.isEmpty(codeActeId)) {
            return null;
        }
        TypedQuery<TCodeActe> q = em.createQuery(
                "SELECT t FROM TCodeActe t WHERE t.lgCODEACTEID LIKE ?1 OR t.strLIBELLEE LIKE ?2", TCodeActe.class);
        q.setParameter(1, codeActeId).getSingleResult();
        return q.getSingleResult();
    }

    private TFamillearticle getFamillearticle(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        TypedQuery<TFamillearticle> q = em.createQuery(
                "SELECT t FROM TFamillearticle t WHERE (t.lgFAMILLEARTICLEID LIKE ?1 OR t.strLIBELLE LIKE ?1 OR t.strCODEFAMILLE LIKE ?1)",
                TFamillearticle.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private TZoneGeographique getRayon(String id) {
        if (StringUtils.isEmpty(id)) {
            id = Constant.DEFAUL_RAYON_ID;
        }
        TypedQuery<TZoneGeographique> q = em.createQuery(
                "SELECT t FROM TZoneGeographique t WHERE (t.lgZONEGEOID LIKE ?1 OR t.strLIBELLEE LIKE ?1 )",
                TZoneGeographique.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private TCodeGestion getCodeGestion(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        TypedQuery<TCodeGestion> q = em.createQuery(
                "SELECT t FROM TCodeGestion t WHERE (t.lgCODEGESTIONID = ?1 OR t.strCODEBAREME = ?1)",
                TCodeGestion.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private TTypeetiquette getTypeetiquette(String id) {
        if (StringUtils.isEmpty(id)) {
            id = Constant.DEFAUL_TYPEETIQUETTE;
        }
        TypedQuery<TTypeetiquette> q = em.createQuery(
                "SELECT t FROM TTypeetiquette t WHERE t.lgTYPEETIQUETTEID LIKE ?1 OR t.strDESCRIPTION LIKE ?2",
                TTypeetiquette.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private TFormeArticle getFormeArticle(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        TypedQuery<TFormeArticle> q = em.createQuery(
                "SELECT t FROM TFormeArticle t WHERE t.lgFORMEARTICLEID LIKE ?1 OR t.strLIBELLE LIKE ?2",
                TFormeArticle.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private TFabriquant getFabriquant(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        TypedQuery<TFabriquant> q = em.createQuery(
                "SELECT t FROM TFabriquant t WHERE t.lgFABRIQUANTID LIKE ?1 OR t.strDESCRIPTION LIKE ?2",
                TFabriquant.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private TCodeTva getCodeTva(String id) {
        if (StringUtils.isEmpty(id)) {
            id = Constant.DEFAUL_CODE_TVA;
        }
        TypedQuery<TCodeTva> q = em.createQuery("SELECT t FROM TCodeTva t WHERE (t.strNAME = ?1 OR t.lgCODETVAID = ?1)",
                TCodeTva.class);
        q.setParameter(1, id).getSingleResult();
        return q.getSingleResult();
    }

    private boolean isExpirationDateActivated() {
        return getParamettre(Constant.KEY_ACTIVATE_PEREMPTION_DATE)
                .map(p -> Integer.parseInt(p.getStrVALUE().trim()) == 1).orElse(false);

    }

    private Laboratoire getLaboratoire(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return em.find(Laboratoire.class, id);
    }

    private GammeProduit getGammeProduit(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return em.find(GammeProduit.class, id);
    }

    private void createFamilleGrossiste(TFamille famille) {
        TFamilleGrossiste familleGrossiste = new TFamilleGrossiste();
        familleGrossiste.setStrCODEARTICLE(famille.getIntCIP());
        familleGrossiste.setLgFAMILLEID(famille);
        familleGrossiste.setLgGROSSISTEID(famille.getLgGROSSISTEID());
        familleGrossiste.setIntPAF(famille.getIntPAF());
        familleGrossiste.setIntPRICE(famille.getIntPRICE());
        familleGrossiste.setStrSTATUT(Constant.STATUT_ENABLE);
        familleGrossiste.setDtCREATED(famille.getDtCREATED());
        em.persist(familleGrossiste);

    }

    private TFamilleGrossiste findOneByCodeAndProduitId(String code, String idpProduit) {
        TypedQuery<TFamilleGrossiste> q = em.createQuery(
                "SELECT o  FROM TFamilleGrossiste o WHERE o.strCODEARTICLE=?1 AND o.lgFAMILLEID.lgFAMILLEID=?2",
                TFamilleGrossiste.class);
        q.setParameter(1, code);
        q.setParameter(2, idpProduit);
        q.setMaxResults(1);
        return q.getSingleResult();
    }

    private void createFamilleStock(TFamille famille, int qty) {
        TFamilleStock stock = new TFamilleStock();
        stock.setLgFAMILLESTOCKID(UUID.randomUUID().toString());
        stock.setIntNUMBER(qty);
        stock.setIntNUMBERAVAILABLE(qty);
        stock.setLgFAMILLEID(famille);
        stock.setStrSTATUT(Constant.STATUT_ENABLE);
        stock.setDtCREATED(famille.getDtCREATED());
        stock.setLgEMPLACEMENTID(sessionHelperService.getCurrentUser().getLgEMPLACEMENTID());
        em.persist(stock);
    }

    private void buildNotificationCreationProduit(TFamille famille, TypeNotification typeNotification,
            TypeLog typeLog) {
        CategorieNotification categorieNotification = em.find(CategorieNotification.class, typeNotification.ordinal());
        Notification notification = new Notification();
        notification.setCategorieNotification(categorieNotification);
        notification.setUser(this.sessionHelperService.getCurrentUser());
        Map<String, Object> donneesMap = new HashMap<>();
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), typeNotification.getValue());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donneesMap.put(NotificationUtils.ITEM_KEY.getId(), famille.getIntCIP());
        donneesMap.put(NotificationUtils.ITEM_DESC.getId(), famille.getStrNAME());
        notification.donnees(buildDonnees(donneesMap));
        notification.setMessage("");
        notification.entityRef(famille.getLgFAMILLEID());
        em.persist(notification);

        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(notification.getUser());
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(eventLog.getDtCREATED());
        eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(famille.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION("Création du produit " + " cip [" + famille.getIntCIP() + " " + famille.getStrNAME()
                + " par "
                + notification.getUser().getStrFIRSTNAME().concat(" ").concat(notification.getUser().getStrLASTNAME())
                + " ]");

        em.persist(eventLog);
    }

    private String buildDonnees(Map<String, Object> donneesMap) {
        if (MapUtils.isEmpty(donneesMap)) {
            return null;
        }
        JSONObject json = new JSONObject();
        donneesMap.forEach(json::put);
        return json.toString();
    }

    @Override
    public JSONObject createProduitDetail(CreationProduitDTO creationProduit) {
        TFamille familleParent = em.find(TFamille.class, creationProduit.getLgFamilleId());
        JSONObject json = new JSONObject();
        if (familleParent.getBoolDECONDITIONNE() == 1) {
            return json.put("message", "Désolé! Cet article n'est pas autorisé à être déconditionné").put("success",
                    false);
        }
        if (familleParent.getBoolDECONDITIONNEEXIST() == 1) {
            return json.put("message", "Désolé! Une version décondition de ce produit existe déjà").put("success",
                    false);

        }
        TFamille famille = new TFamille(IdGenerator.getComplexId());
        famille.setBoolDECONDITIONNE(Short.valueOf("1"));
        familleParent.setBoolDECONDITIONNEEXIST(Short.valueOf("1"));
        famille.setStrSTATUT(Constant.STATUT_ENABLE);
        famille.setDtCREATED(new Date());
        famille.setDtUPDATED(famille.getDtCREATED());
        familleParent.setIntNUMBERDETAIL(creationProduit.getIntQteDetail());
        famille.setStrNAME(creationProduit.getStrDescription() + " DET");
        famille.setIntCIP(creationProduit.getIntCip() + "D");
        famille.setIntNUMBERDETAIL(1);
        intProduitDetailCommon(creationProduit, famille, familleParent);
        em.merge(familleParent);
        em.persist(famille);
        createFamilleGrossiste(famille);
        createFamilleStock(famille, 0);
        createTypeStockFamille(famille, "1", 0);
        if (creationProduit.isBoolReserve()) {
            createTypeStockFamille(famille, "2", 0);
        }
        buildNotificationCreationProduit(famille, TypeNotification.AJOUT_DE_DETAIL_PRODUIT,
                TypeLog.AJOUT_DE_DETAIL_PRODUIT);
        return json.put("success", true);

    }

    @Override
    public JSONObject updateProduitDetail(CreationProduitDTO creationProduit, String idProduit) {
        TFamille famille = em.find(TFamille.class, idProduit);
        TFamille familleParent = em.find(TFamille.class, famille.getLgFAMILLEPARENTID());
        JSONObject json = new JSONObject();
        famille.setStrNAME(creationProduit.getStrDescription());
        famille.setDtUPDATED(new Date());
        intProduitDetailCommon(creationProduit, famille, familleParent);

        em.merge(familleParent);
        em.merge(famille);
        TFamilleGrossiste familleGrossiste = findOneByCodeAndProduitId(famille.getIntCIP(), famille.getLgFAMILLEID());
        familleGrossiste.setIntPAF(famille.getIntPAF());
        familleGrossiste.setIntPRICE(famille.getIntPRICE());
        familleGrossiste.setLgGROSSISTEID(famille.getLgGROSSISTEID());
        em.merge(familleGrossiste);
        return json.put("success", true);

    }

    private void intProduitDetailCommon(CreationProduitDTO creationProduit, TFamille famille, TFamille familleParent) {
        famille.setLgGROSSISTEID(familleParent.getLgGROSSISTEID());
        famille.setStrDESCRIPTION(famille.getStrNAME());
        famille.setIntPRICE(creationProduit.getIntPrice());
        famille.setIntPRICETIPS(creationProduit.getIntPriceTips());
        famille.setIntTAUXMARQUE(creationProduit.getIntTauxMarque());
        famille.setIntPAF(creationProduit.getIntPaf());
        famille.setIntPAT(creationProduit.getIntPat());
        famille.setIntS(creationProduit.getIntS());
        famille.setIntT(creationProduit.getIntT());
        famille.setIntEAN13(creationProduit.getIntEan13());
        famille.setLgFAMILLEARTICLEID(familleParent.getLgFAMILLEARTICLEID());
        famille.setLgCODEACTEID(familleParent.getLgCODEACTEID());
        famille.setLgCODEGESTIONID(familleParent.getLgCODEGESTIONID());
        famille.setStrCODEREMISE(creationProduit.getStrCodeRemise());
        famille.setStrCODETAUXREMBOURSEMENT(creationProduit.getStrCodeTauxRemboursement());
        famille.setLgZONEGEOID(getRayon(creationProduit.getLgZoneGeoId()));
        famille.setIntSEUILMAX(creationProduit.getSeuilMax());
        famille.setIntNUMBERDETAIL(1);
        famille.setLgFORMEID(familleParent.getLgFORMEID());
        famille.setLgFABRIQUANTID(familleParent.getLgFABRIQUANTID());

        famille.setLgTYPEETIQUETTEID(familleParent.getLgTYPEETIQUETTEID());

        famille.setLgCODETVAID(familleParent.getLgCODETVAID());
        famille.setBoolRESERVE(creationProduit.isBoolReserve());
        famille.setIntSEUILRESERVE(creationProduit.getIntSeuilReserve());
        famille.setLgFAMILLEPARENTID(familleParent.getLgFAMILLEID());
        famille.setIntSTOCKREAPROVISONEMENT(creationProduit.getIntStockReaprovisonement());
        famille.setIntQTEREAPPROVISIONNEMENT(creationProduit.getIntQteReapprovisionnement());
        famille.setIntSEUILMIN(famille.getIntSTOCKREAPROVISONEMENT());
        famille.setBoolCHECKEXPIRATIONDATE(familleParent.getBoolCHECKEXPIRATIONDATE());
        famille.setLaboratoire(familleParent.getLaboratoire());
        famille.setGamme(familleParent.getGamme());

        familleParent.setDtUPDATED(famille.getDtCREATED());

    }

    public void createTypeStockFamille(TFamille famille, String typeStockId, int qty) {

        TTypeStockFamille typeStockFamille = new TTypeStockFamille();
        TTypeStock typeStock = em.find(TTypeStock.class, typeStockId);

        typeStockFamille.setLgTYPESTOCKFAMILLEID(IdGenerator.getComplexId());
        typeStockFamille.setLgFAMILLEID(famille);
        typeStockFamille.setLgTYPESTOCKID(typeStock);
        typeStockFamille.setStrNAME(famille.getStrDESCRIPTION() + " " + typeStock.getStrDESCRIPTION());
        typeStockFamille.setStrDESCRIPTION(typeStockFamille.getStrNAME());
        typeStockFamille.setIntNUMBER(qty);
        typeStockFamille.setDtCREATED(new Date());
        typeStockFamille.setLgEMPLACEMENTID(this.sessionHelperService.getCurrentUser().getLgEMPLACEMENTID());
        typeStockFamille.setStrSTATUT(Constant.STATUT_ENABLE);
        em.persist(typeStockFamille);

    }
}
