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
import commonTasks.dto.MvtProduitCompletDTO;
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
import commonTasks.dto.ArticleDTO;
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
import dal.TMouvementReserve;
import dal.TParameters;
import dal.TPreenregistrementDetail;
import dal.TRetourFournisseurDetail;
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
import rest.service.dto.UpdateCipDTO;
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

    /**
     * Support de JSON_TABLE par le serveur de base de donnees, determine au premier besoin puis memorise pour la duree
     * de vie du serveur d'application.
     */
    private static volatile Boolean jsonTableDisponible;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;
    @EJB
    private NotificationService notificationService;
    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;
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

    /**
     * Motif de recherche des suivis de mouvement : la saisie encadree de jokers, donc « contient ».
     *
     * <p>
     * La recherche etait en « commence par ». Taper un mot situe au milieu du libelle - « CILLINE » pour AMOXICILLINE,
     * « SUSP » pour une suspension buvable - ne ramenait rien, ce qui se lit comme une recherche en panne. Tous les
     * ecrans de suivi de mouvement passent par ici : le suivi 2 avec sa liste et son compteur, et le suivi complet avec
     * ses deux sources. Ils doivent rester d'accord entre eux, sans quoi le meme mot ramenerait des resultats
     * differents d'un ecran a l'autre - et, sur le suivi 2, un total qui ne correspondrait plus aux lignes.
     */
    static String motifContient(String saisie) {
        return "%" + saisie.trim() + "%";
    }

    /** Le CIP OU le libelle contient la saisie, sur une jointure vers la famille. */
    private static Predicate motifRecherche(CriteriaBuilder cb, Join<HMvtProduit, TFamille> famille, String saisie) {
        String motif = motifContient(saisie);
        return cb.or(cb.like(famille.get(TFamille_.intCIP), motif), cb.like(famille.get(TFamille_.strNAME), motif));
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
                predicates.add(motifRecherche(cb, fa, params.getSearch()));
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
                predicates.add(motifRecherche(cb, fa, params.getSearch()));
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
                MvtProduitDTO mvtProduit = new MvtProduitDTO();
                mvtProduit.setCip(v.getIntCIP());
                mvtProduit.setProduitId(v.getLgFAMILLEID());
                mvtProduit.setProduitName(v.getStrNAME());
                mvtProduit.setCurrentStock(getFamilleStockByProduitId(v.getLgFAMILLEID(), params.getMagasinId()));
                remplirQuantitesGenerales(mvtProduit, params);
                mvtProduits.add(mvtProduit);
            });
            mvtProduits.sort(comparatorByLibelle);
            return mvtProduits;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /**
     * Agrege les mouvements HMvtProduit d'un article sur la periode et renseigne les quantites du DTO. Partage entre le
     * suivi mouvement article 2 et le suivi complet : les deux ecrans affichent donc rigoureusement les memes chiffres
     * pour les mouvements generaux.
     */
    private void remplirQuantitesGenerales(MvtProduitDTO mvtProduit, MvtArticleParams params) {
        LongAdder venteStock = new LongAdder();
        Map<String, List<HMvtProduit>> hmps = suivitMvtArcticle(params.getDtStart(), params.getDtEnd(),
                mvtProduit.getProduitId(), params.getMagasinId()).stream()
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
                mvtProduit.setQtyAnnulation(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                break;

            case DateConverter.INVENTAIRE:
                mvtProduit.setEcartInventaire(findEcartInventaire(Long.parseLong(values.get(0).getPkey())));
                mvtProduit.setQtyInv(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                break;
            case DateConverter.DECONDTIONNEMENT_POSITIF:
                mvtProduit.setQtyDeconEntrant(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                break;
            case DateConverter.DECONDTIONNEMENT_NEGATIF:
                mvtProduit.setQtyDecondSortant(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                break;

            case DateConverter.AJUSTEMENT_NEGATIF:
                mvtProduit.setQtyAjustSortie(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
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
                mvtProduit.setQtyRetourDepot(values.stream().map(HMvtProduit::getQteMvt).reduce(0, Integer::sum));
                break;
            default:
                break;
            }
        });
        mvtProduit.setQtyVente(venteStock.intValue());
    }

    // ------------------------------------------------- SUIVI MOUVEMENT ARTICLE COMPLET
    // Ecran separe du "Suivi mouvement article 2" : celui-ci reste inchange pour les officines qui
    // n'utilisent pas la reserve. Le suivi complet ajoute, en LECTURE seule, les mouvements internes
    // rayon<->reserve (t_mouvement_reserve reste la source de verite) et les stocks rayon/reserve/total.

    /** Identifiant du type de stock "reserve" dans t_type_stock_famille (meme valeur que ReserveServiceImpl). */
    private static final String TYPE_STOCK_RESERVE = "2";

    @Override
    public JSONObject suivitMvtArticleCompletViewDatas(MvtArticleParams params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            List<Object[]> familles = famillesSuiviComplet(params);
            if (familles.isEmpty()) {
                json.put("total", 0);
                json.put("data", new JSONArray());
                return json;
            }
            List<Object[]> page = familles;
            if (!params.isAll()) {
                int from = Math.min(Math.max(0, params.getStart()), familles.size());
                int to = params.getLimit() > 0 ? Math.min(from + params.getLimit(), familles.size()) : familles.size();
                page = familles.subList(from, to);
            }
            List<MvtProduitCompletDTO> data = lignesSuiviComplet(page, params);
            json.put("total", familles.size());
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
    public List<MvtProduitCompletDTO> suivitMvtArticleComplet(MvtArticleParams params) {
        try {
            return lignesSuiviComplet(famillesSuiviComplet(params), params);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public byte[] exportSuiviMvtArticleComplet(MvtArticleParams params) throws java.io.IOException {
        params.setAll(true);
        List<MvtProduitCompletDTO> lignes = suivitMvtArticleComplet(params);
        if (lignes.isEmpty()) {
            return new byte[0];
        }
        String periode = "du " + params.getDtStart().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " au " + params.getDtEnd().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String[] entetes = { "CIP", "Designation", "Vente", "Ret.four", "Qte perimee", "Ajust. sortie", "Decon. sortie",
                "Qte entree", "Ajust. entree", "Decon. entree", "Qte annulee", "Ret. depot", "Qte inventaire",
                "Ecart inventaire", "Vers reserve", "Vers rayon", "Ajust. reserve", "Stock rayon", "Stock reserve",
                "Stock total" };
        return reportExcelExportService.createExcelReport("Suivi mouvement article complet " + periode, entetes, lignes,
                (row, o) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(o.getCip() == null ? "" : o.getCip());
                    row.createCell(col++).setCellValue(o.getProduitName() == null ? "" : o.getProduitName());
                    row.createCell(col++).setCellValue(o.getQtyVente());
                    row.createCell(col++).setCellValue(o.getQtyRetour());
                    row.createCell(col++).setCellValue(o.getQtyPerime());
                    row.createCell(col++).setCellValue(o.getQtyAjustSortie());
                    row.createCell(col++).setCellValue(o.getQtyDecondSortant());
                    row.createCell(col++).setCellValue(o.getQtyEntree());
                    row.createCell(col++).setCellValue(o.getQtyAjust());
                    row.createCell(col++).setCellValue(o.getQtyDeconEntrant());
                    row.createCell(col++).setCellValue(o.getQtyAnnulation());
                    row.createCell(col++).setCellValue(o.getQtyRetourDepot());
                    row.createCell(col++).setCellValue(o.getQtyInv());
                    row.createCell(col++).setCellValue(o.getEcartInventaire());
                    row.createCell(col++).setCellValue(o.getQtyVersReserve());
                    row.createCell(col++).setCellValue(o.getQtyVersRayon());
                    row.createCell(col++).setCellValue(o.getQtyAjustReserve());
                    row.createCell(col++).setCellValue(o.getCurrentStock());
                    row.createCell(col++).setCellValue(o.getCurrentStockReserve());
                    row.createCell(col).setCellValue(o.getCurrentStockTotal());
                });
    }

    @Override
    public byte[] exportSuiviMvtArticleCompletPdf(MvtArticleParams params, TUser user) {
        params.setAll(true);
        List<MvtProduitCompletDTO> lignes = suivitMvtArticleComplet(params);
        return rest.report.pdf.SuiviMvtCompletPdf.liste(nomOfficine(), lignes,
                periodeLibelle(params.getDtStart(), params.getDtEnd()), nomOperateur(user));
    }

    @Override
    public byte[] exportFicheArticleCompletPdf(MvtArticleParams params, TUser user) {
        MvtProduitCompletDTO meta = eclateComplet(params.getDtStart(), params.getDtEnd(), params.getProduitId(),
                params.getMagasinId());
        List<MvtProduitCompletDTO> jours = new ArrayList<>();
        for (MvtProduitDTO j : meta.getProduits()) {
            jours.add((MvtProduitCompletDTO) j);
        }
        TFamille famille = findById(params.getProduitId());
        String article = famille == null ? ""
                : (famille.getIntCIP() == null ? "" : famille.getIntCIP()) + " " + famille.getStrNAME();
        return rest.report.pdf.SuiviMvtCompletPdf.ficheArticle(nomOfficine(), article,
                periodeLibelle(params.getDtStart(), params.getDtEnd()), nomOperateur(user), jours, meta);
    }

    /** Nom abrege de l'officine (meme source que les editions Jasper : TOfficine id "1"). */
    private String nomOfficine() {
        try {
            dal.TOfficine officine = getEntityManager().find(dal.TOfficine.class, "1");
            return officine == null ? "" : officine.getStrNOMABREGE();
        } catch (Exception e) {
            return "";
        }
    }

    private static String periodeLibelle(LocalDate dtStart, LocalDate dtEnd) {
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        if (dtStart.isEqual(dtEnd)) {
            return "DU " + dtStart.format(fmt);
        }
        return "DU " + dtStart.format(fmt) + " AU " + dtEnd.format(fmt);
    }

    private static String nomOperateur(TUser user) {
        if (user == null) {
            return "";
        }
        return (user.getStrFIRSTNAME() == null ? "" : user.getStrFIRSTNAME()) + " "
                + (user.getStrLASTNAME() == null ? "" : user.getStrLASTNAME());
    }

    @Override
    public JSONObject suivitEclateCompletViewDatas(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl)
            throws JSONException {
        JSONObject json = new JSONObject();
        try {
            MvtProduitCompletDTO meta = eclateComplet(dtStart, dtEnd, produitId, empl);
            json.put("total", meta.getProduits().size());
            json.put("data", new JSONArray(meta.getProduits()));
            json.put("metaData", new JSONObject(meta));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("total", 0);
            json.put("data", new JSONArray());
            return json;
        }
    }

    /**
     * Detail jour par jour du suivi complet : les lignes-jour (instances MvtProduitCompletDTO) sont dans
     * {@code getProduits()} du DTO retourne, qui porte lui-meme les totaux de la periode. Partage entre la reponse JSON
     * de l'ecran et la fiche PDF : les deux editions montrent exactement les memes chiffres.
     */
    private MvtProduitCompletDTO eclateComplet(LocalDate dtStart, LocalDate dtEnd, String produitId, String empl) {
        MvtProduitDTO base = suivitEclate(dtStart, dtEnd, produitId, empl);
        Map<LocalDate, MvtProduitCompletDTO> parJour = new HashMap<>();
        for (MvtProduitDTO jour : base.getProduits()) {
            parJour.put(jour.getDateOperation(), new MvtProduitCompletDTO(jour));
        }
        // [jour, versReserve, versRayon, ajustSigne, rayonAvantPremier, rayonApresDernier,
        // reserveAvantPremier, reserveApresDernier, premierHorodatage, dernierHorodatage]
        Map<LocalDate, Object[]> reserveParJour = new HashMap<>();
        for (Object[] r : agregatsReserveParJour(produitId, empl, dtStart, dtEnd)) {
            LocalDate date = ((java.sql.Date) r[0]).toLocalDate();
            reserveParJour.put(date, r);
            if (!parJour.containsKey(date)) {
                // Jour sans aucun mouvement general : la ligne existe quand meme, avec les stocks
                // rayon debut/fin lus dans la trace de reserve (avant du premier / apres du dernier).
                MvtProduitCompletDTO jour = new MvtProduitCompletDTO();
                jour.setDateOperation(date);
                jour.setStockInit(entier(r[4]));
                jour.setStockFinal(entier(r[5]));
                parJour.put(date, jour);
            }
        }
        List<MvtProduitCompletDTO> data = new ArrayList<>(parJour.values());
        data.sort(mvtrByDate);

        // Pour un jour mixte, la photo du stock rayon debut/fin doit venir de l'historique dont le
        // mouvement est chronologiquement le premier/le dernier : un reassort fait apres la derniere
        // vente du jour modifie le stock rayon SANS ecrire dans HMvtProduit, la photo du suivi
        // general serait donc perimee.
        Map<LocalDate, java.time.LocalDateTime[]> bornesGeneral = bornesGeneralParJour(produitId, empl, dtStart, dtEnd);

        // Stock reserve debut/fin de chaque jour. La trace de reserve est l'UNIQUE voie de
        // modification de ce stock : entre deux mouvements il est constant, on peut donc le
        // reporter d'un jour a l'autre a partir du dernier mouvement anterieur a la periode.
        int reserveCourante = stockReserveAvantDate(produitId, empl, dtStart);
        int totalVersReserve = 0, totalVersRayon = 0, totalAjustReserve = 0;
        for (MvtProduitCompletDTO jour : data) {
            Object[] r = reserveParJour.get(jour.getDateOperation());
            if (r != null) {
                jour.setQtyVersReserve(entier(r[1]));
                jour.setQtyVersRayon(entier(r[2]));
                jour.setQtyAjustReserve(entier(r[3]));
                jour.setStockReserveInit(entier(r[6]));
                jour.setStockReserveFinal(entier(r[7]));
                reserveCourante = entier(r[7]);
                totalVersReserve += entier(r[1]);
                totalVersRayon += entier(r[2]);
                totalAjustReserve += entier(r[3]);

                java.time.LocalDateTime[] general = bornesGeneral.get(jour.getDateOperation());
                if (general != null && r[8] != null && r[9] != null) {
                    java.time.LocalDateTime reservePremier = ((java.sql.Timestamp) r[8]).toLocalDateTime();
                    java.time.LocalDateTime reserveDernier = ((java.sql.Timestamp) r[9]).toLocalDateTime();
                    if (reservePremier.isBefore(general[0])) {
                        jour.setStockInit(entier(r[4]));
                    }
                    if (reserveDernier.isAfter(general[1])) {
                        jour.setStockFinal(entier(r[5]));
                    }
                }
            } else {
                jour.setStockReserveInit(reserveCourante);
                jour.setStockReserveFinal(reserveCourante);
            }
        }

        MvtProduitCompletDTO meta = new MvtProduitCompletDTO(base);
        meta.setQtyVersReserve(totalVersReserve);
        meta.setQtyVersRayon(totalVersRayon);
        meta.setQtyAjustReserve(totalAjustReserve);
        meta.setProduits(new ArrayList<>(data));
        return meta;
    }

    private static int entier(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    /**
     * Premier et dernier horodatage des mouvements GENERAUX (HMvtProduit) de chaque jour de la periode. Sert a
     * departager, pour un jour mixte, quel historique detient la photo du stock rayon en debut et en fin de journee :
     * un reassort fait apres la derniere vente du jour doit se voir dans la colonne "Fin de journee".
     */
    private Map<LocalDate, java.time.LocalDateTime[]> bornesGeneralParJour(String produitId, String empl,
            LocalDate dtStart, LocalDate dtEnd) {
        Map<LocalDate, java.time.LocalDateTime[]> out = new HashMap<>();
        try {
            TypedQuery<Object[]> q = getEntityManager()
                    .createQuery("SELECT o.mvtDate, MIN(o.createdAt), MAX(o.createdAt) FROM HMvtProduit o "
                            + "WHERE o.famille.lgFAMILLEID = :fid AND o.emplacement.lgEMPLACEMENTID = :empl "
                            + "AND o.mvtDate BETWEEN :d1 AND :d2 GROUP BY o.mvtDate", Object[].class);
            q.setParameter("fid", produitId);
            q.setParameter("empl", empl);
            q.setParameter("d1", dtStart);
            q.setParameter("d2", dtEnd);
            for (Object[] r : q.getResultList()) {
                out.put((LocalDate) r[0], new java.time.LocalDateTime[] { (java.time.LocalDateTime) r[1],
                        (java.time.LocalDateTime) r[2] });
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return out;
    }

    /**
     * Stock reserve juste avant une date : "apres" du dernier mouvement de reserve anterieur. Zero si le produit n'a
     * jamais eu de mouvement de reserve avant cette date (la trace etant la seule voie de modification du stock
     * reserve, l'absence de trace signifie une reserve vide).
     */
    private int stockReserveAvantDate(String produitId, String empl, LocalDate date) {
        try {
            Query q = getEntityManager().createNativeQuery("SELECT m.int_STOCK_RESERVE_APRES "
                    + "FROM t_mouvement_reserve m WHERE m.lg_FAMILLE_ID = ?1 AND m.lg_EMPLACEMENT_ID = ?2 "
                    + "AND m.dt_CREATED < ?3 ORDER BY m.dt_CREATED DESC LIMIT 1");
            q.setParameter(1, produitId);
            q.setParameter(2, empl);
            q.setParameter(3, java.sql.Timestamp.valueOf(date.atStartOfDay()));
            @SuppressWarnings("unchecked")
            List<Object> res = q.getResultList();
            return res.isEmpty() ? 0 : entier(res.get(0));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    /**
     * Agregats des mouvements de reserve d'un article, par JOUR : [jour, somme ASSORT, somme REASSORT, delta signe des
     * AJUSTEMENT, stock rayon avant du premier mouvement, stock rayon apres du dernier]. Le filtre de periode porte sur
     * la colonne nue dt_CREATED (bornes ouvertes au lendemain) pour rester sur l'index ; DATE() ne sert qu'au
     * regroupement.
     */
    @SuppressWarnings("unchecked")
    private List<Object[]> agregatsReserveParJour(String produitId, String empl, LocalDate dtStart, LocalDate dtEnd) {
        try {
            Query q = getEntityManager().createNativeQuery("SELECT DATE(m.dt_CREATED) AS jour, "
                    + "SUM(CASE WHEN m.str_TYPE = 'ASSORT' THEN m.int_QTE ELSE 0 END), "
                    + "SUM(CASE WHEN m.str_TYPE = 'REASSORT' THEN m.int_QTE ELSE 0 END), "
                    + "SUM(CASE WHEN m.str_TYPE = 'AJUSTEMENT' THEN m.int_STOCK_RESERVE_APRES - m.int_STOCK_RESERVE_AVANT ELSE 0 END), "
                    + "CAST(SUBSTRING_INDEX(GROUP_CONCAT(m.int_STOCK_RAYON_AVANT ORDER BY m.dt_CREATED ASC), ',', 1) AS SIGNED), "
                    + "CAST(SUBSTRING_INDEX(GROUP_CONCAT(m.int_STOCK_RAYON_APRES ORDER BY m.dt_CREATED DESC), ',', 1) AS SIGNED), "
                    + "CAST(SUBSTRING_INDEX(GROUP_CONCAT(m.int_STOCK_RESERVE_AVANT ORDER BY m.dt_CREATED ASC), ',', 1) AS SIGNED), "
                    + "CAST(SUBSTRING_INDEX(GROUP_CONCAT(m.int_STOCK_RESERVE_APRES ORDER BY m.dt_CREATED DESC), ',', 1) AS SIGNED), "
                    + "MIN(m.dt_CREATED), MAX(m.dt_CREATED) "
                    + "FROM t_mouvement_reserve m WHERE m.lg_FAMILLE_ID = ?1 AND m.lg_EMPLACEMENT_ID = ?2 "
                    + "AND m.dt_CREATED >= ?3 AND m.dt_CREATED < ?4 GROUP BY DATE(m.dt_CREATED)");
            q.setParameter(1, produitId);
            q.setParameter(2, empl);
            q.setParameter(3, java.sql.Timestamp.valueOf(dtStart.atStartOfDay()));
            q.setParameter(4, java.sql.Timestamp.valueOf(dtEnd.plusDays(1).atStartOfDay()));
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /**
     * Union des familles ayant bouge sur la periode, toutes sources confondues : mouvements generaux (HMvtProduit) ET
     * mouvements de reserve. Un produit n'ayant connu que des transferts rayon/reserve apparait donc bien dans la
     * liste, ce que ne garantit pas le suivi 2. Retour : [lg_FAMILLE_ID, str_NAME] tries par designation.
     */
    private List<Object[]> famillesSuiviComplet(MvtArticleParams params) {
        return unionFamilles(famillesMvtGeneral(params), famillesMvtReserve(params));
    }

    /**
     * Union sans doublon des deux listes de familles [id, nom], triee par designation sans tenir compte de la casse. En
     * cas de doublon, la ligne du suivi general fait foi. Statique et sans etat : couverte par les tests unitaires.
     */
    static List<Object[]> unionFamilles(List<Object[]> general, List<Object[]> reserve) {
        Map<String, Object[]> union = new HashMap<>();
        for (Object[] r : general) {
            union.putIfAbsent((String) r[0], r);
        }
        for (Object[] r : reserve) {
            union.putIfAbsent((String) r[0], r);
        }
        List<Object[]> out = new ArrayList<>(union.values());
        out.sort(Comparator.comparing(r -> String.valueOf(r[1]), String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    /** Familles avec au moins un mouvement general sur la periode : memes filtres que le suivi 2, sans pagination. */
    private List<Object[]> famillesMvtGeneral(MvtArticleParams params) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<HMvtProduit> root = cq.from(HMvtProduit.class);
            Join<HMvtProduit, TFamille> fa = root.join(HMvtProduit_.famille, JoinType.INNER);
            cq.multiselect(fa.get(TFamille_.lgFAMILLEID), fa.get(TFamille_.strNAME)).distinct(true);
            predicates.add(cb.and(cb.equal(root.get(HMvtProduit_.emplacement).get(TEmplacement_.lgEMPLACEMENTID),
                    params.getMagasinId())));
            // mvtdate est deja une colonne DATE : comparer la colonne NUE, sans fonction DATE(), pour que
            // MySQL puisse utiliser l'index HMvtProduit7 (avec DATE(), la table etait balayee entierement).
            predicates.add(cb.and(cb.between(root.get(HMvtProduit_.mvtDate), params.getDtStart(), params.getDtEnd())));
            if (params.getCategorieId() != null && !"".equals(params.getCategorieId())) {
                predicates.add(
                        cb.and(cb.equal(fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                                params.getCategorieId())));
            }
            if (params.getSearch() != null && !"".equals(params.getSearch())) {
                predicates.add(motifRecherche(cb, fa, params.getSearch()));
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
            return getEntityManager().createQuery(cq).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /** Familles avec au moins un mouvement de reserve sur la periode, pour l'emplacement demande. */
    private List<Object[]> famillesMvtReserve(MvtArticleParams params) {
        try {
            StringBuilder jpql = new StringBuilder("SELECT DISTINCT f.lgFAMILLEID, f.strNAME "
                    + "FROM TMouvementReserve t JOIN t.lgFAMILLEID f "
                    + "WHERE t.lgEMPLACEMENTID.lgEMPLACEMENTID = :empl AND t.dtCREATED >= :d1 AND t.dtCREATED < :d2");
            boolean hasCategorie = params.getCategorieId() != null && !"".equals(params.getCategorieId());
            boolean hasSearch = params.getSearch() != null && !"".equals(params.getSearch());
            boolean hasRayon = params.getRayonId() != null && !"".equals(params.getRayonId());
            boolean hasFabricant = params.getFabricantId() != null && !"".equals(params.getFabricantId());
            if (hasCategorie) {
                jpql.append(" AND f.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID = :categorie");
            }
            if (hasSearch) {
                jpql.append(" AND (f.intCIP LIKE :search OR f.strNAME LIKE :search)");
            }
            if (hasRayon) {
                jpql.append(" AND f.lgZONEGEOID.lgZONEGEOID = :rayon");
            }
            if (hasFabricant) {
                jpql.append(" AND f.lgFABRIQUANTID.lgFABRIQUANTID = :fabricant");
            }
            TypedQuery<Object[]> q = getEntityManager().createQuery(jpql.toString(), Object[].class);
            q.setParameter("empl", params.getMagasinId());
            q.setParameter("d1", java.sql.Timestamp.valueOf(params.getDtStart().atStartOfDay()));
            // Borne superieure EXCLUSIVE au lendemain : couvre la fin de journee sans bricolage de 23:59:59.
            q.setParameter("d2", java.sql.Timestamp.valueOf(params.getDtEnd().plusDays(1).atStartOfDay()));
            if (hasCategorie) {
                q.setParameter("categorie", params.getCategorieId());
            }
            if (hasSearch) {
                q.setParameter("search", motifContient(params.getSearch()));
            }
            if (hasRayon) {
                q.setParameter("rayon", params.getRayonId());
            }
            if (hasFabricant) {
                q.setParameter("fabricant", params.getFabricantId());
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /** Construit les lignes du suivi complet pour une page de familles [id, nom]. */
    private List<MvtProduitCompletDTO> lignesSuiviComplet(List<Object[]> familles, MvtArticleParams params) {
        List<String> ids = new ArrayList<>();
        for (Object[] r : familles) {
            ids.add((String) r[0]);
        }
        Map<String, int[]> interne = agregatsMouvementsReserve(ids, params);
        Map<String, Integer> stocksReserve = stocksReserve(ids, params.getMagasinId());
        List<MvtProduitCompletDTO> out = new ArrayList<>();
        for (Object[] r : familles) {
            String id = (String) r[0];
            TFamille famille = getEntityManager().find(TFamille.class, id);
            if (famille == null) {
                continue;
            }
            MvtProduitCompletDTO dto = new MvtProduitCompletDTO();
            dto.setCip(famille.getIntCIP());
            dto.setProduitId(id);
            dto.setProduitName(famille.getStrNAME());
            dto.setCurrentStock(getFamilleStockByProduitId(id, params.getMagasinId()));
            remplirQuantitesGenerales(dto, params);
            int[] mi = interne.get(id);
            if (mi != null) {
                dto.setQtyVersReserve(mi[0]);
                dto.setQtyVersRayon(mi[1]);
                dto.setQtyAjustReserve(mi[2]);
            }
            int reserve = stocksReserve.getOrDefault(id, 0);
            dto.setCurrentStockReserve(reserve);
            dto.setCurrentStockTotal(dto.getCurrentStock() + reserve);
            out.add(dto);
        }
        return out;
    }

    /**
     * Agregats des mouvements de reserve par famille sur la periode, en UNE requete pour toute la page (pas de N+1).
     * Retour : familleId -> {somme ASSORT, somme REASSORT, delta signe des AJUSTEMENT}. Le delta d'un ajustement se lit
     * dans (stock reserve apres - avant) car int_QTE n'en stocke que la valeur absolue. Les mouvements d'annulation,
     * enregistres comme mouvements inverses, se compensent naturellement dans ces sommes.
     */
    private Map<String, int[]> agregatsMouvementsReserve(List<String> familleIds, MvtArticleParams params) {
        Map<String, int[]> out = new HashMap<>();
        if (familleIds.isEmpty()) {
            return out;
        }
        try {
            TypedQuery<Object[]> q = getEntityManager().createQuery("SELECT t.lgFAMILLEID.lgFAMILLEID, t.strTYPE, "
                    + "SUM(t.intQTE), SUM(t.intSTOCKRESERVEAPRES - t.intSTOCKRESERVEAVANT) "
                    + "FROM TMouvementReserve t WHERE t.lgEMPLACEMENTID.lgEMPLACEMENTID = :empl "
                    + "AND t.lgFAMILLEID.lgFAMILLEID IN :ids AND t.dtCREATED >= :d1 AND t.dtCREATED < :d2 "
                    + "GROUP BY t.lgFAMILLEID.lgFAMILLEID, t.strTYPE", Object[].class);
            q.setParameter("empl", params.getMagasinId());
            q.setParameter("ids", familleIds);
            q.setParameter("d1", java.sql.Timestamp.valueOf(params.getDtStart().atStartOfDay()));
            q.setParameter("d2", java.sql.Timestamp.valueOf(params.getDtEnd().plusDays(1).atStartOfDay()));
            out.putAll(cumulerAgregatsReserve(q.getResultList()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return out;
    }

    /**
     * Cumule les lignes groupees [familleId, type, somme(qte), delta reserve signe] en agregats par famille :
     * {versReserve, versRayon, ajustReserve}. Un type inconnu (ex. DESTOCKAGE historique) est ignore plutot que compte
     * a tort dans une colonne. Statique et sans etat : couverte par les tests unitaires.
     */
    static Map<String, int[]> cumulerAgregatsReserve(List<Object[]> rows) {
        Map<String, int[]> out = new HashMap<>();
        for (Object[] r : rows) {
            String id = (String) r[0];
            String type = (String) r[1];
            int somme = r[2] == null ? 0 : ((Number) r[2]).intValue();
            int delta = r[3] == null ? 0 : ((Number) r[3]).intValue();
            int[] agg = out.computeIfAbsent(id, k -> new int[3]);
            if (TMouvementReserve.TYPE_ASSORT.equals(type)) {
                agg[0] += somme;
            } else if (TMouvementReserve.TYPE_REASSORT.equals(type)) {
                agg[1] += somme;
            } else if (TMouvementReserve.TYPE_AJUSTEMENT.equals(type)) {
                agg[2] += delta;
            }
        }
        return out;
    }

    /** Stock reserve courant de chaque famille de la page, en une requete. */
    private Map<String, Integer> stocksReserve(List<String> familleIds, String empl) {
        Map<String, Integer> out = new HashMap<>();
        if (familleIds.isEmpty()) {
            return out;
        }
        try {
            StringBuilder in = new StringBuilder();
            for (int i = 0; i < familleIds.size(); i++) {
                in.append(i == 0 ? "?" : ",?").append(i + 2);
            }
            Query q = getEntityManager().createNativeQuery("SELECT tsf.lg_FAMILLE_ID, COALESCE(MAX(tsf.int_NUMBER), 0) "
                    + "FROM t_type_stock_famille tsf WHERE tsf.lg_EMPLACEMENT_ID = ?1 " + "AND tsf.lg_TYPE_STOCK_ID = '"
                    + TYPE_STOCK_RESERVE + "' AND tsf.lg_FAMILLE_ID IN (" + in + ") GROUP BY tsf.lg_FAMILLE_ID");
            q.setParameter(1, empl);
            for (int i = 0; i < familleIds.size(); i++) {
                q.setParameter(i + 2, familleIds.get(i));
            }
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();
            for (Object[] r : rows) {
                out.put(String.valueOf(r[0]), r[1] == null ? 0 : ((Number) r[1]).intValue());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return out;
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
        // value/valueTwo restent le stock RAYON (achat/vente) : aucun changement de comportement pour l'existant.
        // On ajoute la valorisation RESERVE et le TOTAL (rayon + reserve) pour les 3 onglets.
        Params rayon;
        Params reserve;
        boolean dateDuJour = dtStart.equals(LocalDate.now());
        boolean sourceRelationnelle = !dateDuJour && lireDepuisReleveRelationnel();
        if (dateDuJour) {
            rayon = getValeurStockFrorCurrenDate(mode, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN,
                    emplacementId);
            reserve = getValeurReserveStockForCurrentDate(mode, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                    BEGIN, emplacementId);
        } else {
            // Historique : releve relationnel si la bascule est active, sinon archive JSON (comportement d'origine).
            Params hist = sourceRelationnelle
                    ? getValeurStockFromReleve(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                            BEGIN)
                    : getValeurStockFromJson(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN);
            rayon = new Params(hist.longValue(), hist.longValueTwo());
            reserve = new Params(hist.longValueThree(), hist.longValueFour());
        }
        // Montants en 64 bits : la valorisation totale de l'officine depasse Integer.MAX_VALUE (2,1 milliards) et
        // repartait jusqu'ici tronquee, voire negative.
        long rAchat = rayon.longValue();
        long rVente = rayon.longValueTwo();
        long reAchat = reserve.longValue();
        long reVente = reserve.longValueTwo();
        JSONObject data = new JSONObject();
        data.put("value", rAchat);
        data.put("valueTwo", rVente);
        data.put("reserveValue", reAchat);
        data.put("reserveValueTwo", reVente);
        data.put("totalValue", rAchat + reAchat);
        data.put("totalValueTwo", rVente + reVente);
        // Une journee jamais relevee renvoie les memes zeros qu'une officine reellement vide. Le drapeau permet a
        // l'ecran de dire "aucun releve pour cette date" plutot que d'afficher un total qui ressemble a une mesure.
        data.put("releveDisponible",
                releveDisponible(dateDuJour, sourceRelationnelle, () -> compterLignesReleve(dtStart)));
        return new JSONObject().put("data", data);
    }

    /**
     * Indique si la date demandee a effectivement fait l'objet d'un releve.
     *
     * <p>
     * Trois cas. La date du jour est calculee en direct sur le stock courant : la mesure existe toujours. L'historique
     * lu dans le releve relationnel se verifie en comptant les lignes de la journee : zero ligne signifie que le
     * traitement n'a pas tourne ce jour-la, pas que le stock etait nul. L'historique lu dans l'archive JSON, lui, n'est
     * pas verifiable a cout raisonnable ; ce mode n'etant qu'un retour arriere temporaire, il conserve son comportement
     * d'origine et ne signale rien.
     * </p>
     *
     * @param dateDuJour
     *            la valorisation porte sur aujourd'hui
     * @param sourceRelationnelle
     *            l'historique est lu dans stock_snapshot_day
     * @param lignesRelevees
     *            compte des lignes de la journee, evalue seulement lorsque c'est necessaire
     */
    static boolean releveDisponible(boolean dateDuJour, boolean sourceRelationnelle,
            java.util.function.LongSupplier lignesRelevees) {
        if (dateDuJour || !sourceRelationnelle) {
            return true;
        }
        return lignesRelevees.getAsLong() > 0L;
    }

    /**
     * Valorisation du stock RESERVE (t_type_stock_famille, lg_TYPE_STOCK_ID='2') a la date du jour. Requete dediee,
     * independante du calcul rayon : aucun risque de double comptage / fan-out sur la valorisation rayon existante.
     */
    private Params getValeurReserveStockForCurrentDate(int mode, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId) {
        try {
            List<String> predicates = new ArrayList<>();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder(
                    "SELECT COALESCE(SUM(o.int_PAF*tsf.int_NUMBER),0) AS achat, COALESCE(SUM(o.int_PRICE*tsf.int_NUMBER),0) AS vente ");
            predicates.add(" o.lg_FAMILLE_ID=tsf.lg_FAMILLE_ID ");
            predicates.add(" tsf.lg_TYPE_STOCK_ID='2' ");
            predicates.add(" tsf.str_STATUT='enable' ");
            predicates.add(" tsf.lg_EMPLACEMENT_ID = :emplacementId ");
            predicates.add(" o.str_STATUT = :statut ");
            parasm.put("statut", DateConverter.STATUT_ENABLE);
            parasm.put("emplacementId", emplacementId);
            switch (mode) {
            case 3:
                query.append(" FROM t_famille o, t_type_stock_famille tsf, t_grossiste g ");
                predicates.add(" o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                query.append(" FROM t_famille o, t_type_stock_famille tsf, t_zone_geographique g ");
                predicates.add(" o.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                query.append(" FROM t_famille o, t_type_stock_famille tsf, t_famillearticle g ");
                predicates.add(" o.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);
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
                query.append(" FROM t_famille o, t_type_stock_famille tsf ");
                break;
            }
            query.append(" WHERE ");
            for (int i = 0; i < predicates.size(); i++) {
                if (i > 0) {
                    query.append(" AND ");
                }
                query.append(predicates.get(i));
            }
            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> q.setParameter(k, v));
            Object[] r = (Object[]) q.getSingleResult();
            long achat = r[0] == null ? 0 : ((Number) r[0]).longValue();
            long vente = r[1] == null ? 0 : ((Number) r[1]).longValue();
            return new Params(achat, vente);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new Params(0, 0);
        }
    }

    /**
     * Valorisation historique depuis l'archive JSON stock_snapshot (stock_journalier). Retourne dans un seul Params :
     * value/valueTwo = rayon (achat/vente), valueThree/valueFour = reserve (achat/vente). Utilise les prix figes du
     * jour (prixPaf/prixUni stockes dans le JSON), comme l'historique existant. Necessite MariaDB 10.6+ (JSON_TABLE) ;
     * en cas d'erreur, retourne 0 (comportement neutre, identique a l'historique vide actuel).
     */
    @Override
    public JSONObject comparerValorisationHistorique(int mode, LocalDate dtStart, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId,
            String typeStock) throws JSONException {

        long debutJson = System.currentTimeMillis();
        Params json = getValeurStockFromJson(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN);
        long dureeJson = System.currentTimeMillis() - debutJson;

        long debutReleve = System.currentTimeMillis();
        Params releve = getValeurStockFromReleve(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                BEGIN);
        long dureeReleve = System.currentTimeMillis() - debutReleve;

        JSONObject montants = new JSONObject();
        montants.put("rayonAchat", comparerMontant(json.longValue(), releve.longValue()));
        montants.put("rayonVente", comparerMontant(json.longValueTwo(), releve.longValueTwo()));
        montants.put("reserveAchat", comparerMontant(json.longValueThree(), releve.longValueThree()));
        montants.put("reserveVente", comparerMontant(json.longValueFour(), releve.longValueFour()));

        boolean montantsIdentiques = json.longValue() == releve.longValue()
                && json.longValueTwo() == releve.longValueTwo() && json.longValueThree() == releve.longValueThree()
                && json.longValueFour() == releve.longValueFour();

        // Etat detaille (celui des exports PDF) : on compare les totaux et le nombre de groupes restitues.
        ValorisationDTO detailJson = valorisation(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                BEGIN, emplacementId, typeStock);
        ValorisationDTO detailReleve = valorisationDepuisReleve(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID,
                lgZONEGEOID, END, BEGIN, emplacementId, typeStock);

        JSONObject detail = new JSONObject();
        detail.put("montantAchat",
                comparerMontant(montant(detailJson.getMontantFacture()), montant(detailReleve.getMontantFacture())));
        detail.put("montantVente",
                comparerMontant(montant(detailJson.getMontantPu()), montant(detailReleve.getMontantPu())));
        detail.put("nombreGroupes", comparerMontant(nombreGroupes(detailJson), nombreGroupes(detailReleve)));

        boolean detailIdentique = montant(detailJson.getMontantFacture()) == montant(detailReleve.getMontantFacture())
                && montant(detailJson.getMontantPu()) == montant(detailReleve.getMontantPu())
                && nombreGroupes(detailJson) == nombreGroupes(detailReleve);

        JSONObject data = new JSONObject();
        data.put("date", dtStart.toString());
        data.put("mode", mode);
        data.put("typeStock", typeStock == null ? "" : typeStock);
        data.put("lignesReleve", compterLignesReleve(dtStart));
        data.put("montants", montants);
        data.put("detail", detail);
        data.put("dureeJsonMs", dureeJson);
        data.put("dureeReleveMs", dureeReleve);
        data.put("identique", montantsIdentiques && detailIdentique);
        data.put("source", lireDepuisReleveRelationnel() ? "TABLE" : "JSON");

        LOG.log(Level.INFO,
                "Comparaison valorisation {0} mode {1} : {2} (JSON {3} ms, releve {4} ms, {5} lignes relevees)",
                new Object[] { dtStart, mode, (montantsIdentiques && detailIdentique) ? "identique" : "ECART",
                        dureeJson, dureeReleve, data.get("lignesReleve") });

        return new JSONObject().put("data", data);
    }

    private JSONObject comparerMontant(long json, long releve) throws JSONException {
        return new JSONObject().put("json", json).put("releve", releve).put("ecart", releve - json);
    }

    /** Montant d'un etat detaille en 64 bits, tolerant a l'absence de valeur. */
    private long montant(Integer valeur) {
        return valeur == null ? 0L : valeur.longValue();
    }

    private long nombreGroupes(ValorisationDTO dto) {
        return dto == null || dto.getDatas() == null ? 0L : dto.getDatas().size();
    }

    /** Nombre de lignes relevees pour la journee : permet de distinguer un ecart d'une reprise incomplete. */
    private long compterLignesReleve(LocalDate date) {
        try {
            int dateInt = date.getYear() * 10000 + date.getMonthValue() * 100 + date.getDayOfMonth();
            Object r = getEntityManager()
                    .createNativeQuery("SELECT COUNT(*) FROM stock_snapshot_day WHERE stock_of_day = :dateInt")
                    .setParameter("dateInt", dateInt).getSingleResult();
            return r == null ? 0L : ((Number) r).longValue();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "compterLignesReleve", e);
            return 0L;
        }
    }

    /**
     * Source de lecture des valorisations historiques, pilotee par le parametre KEY_VALORISATION_SOURCE.
     *
     * <p>
     * {@code TABLE} lit le releve journalier relationnel (stock_snapshot_day) ; toute autre valeur, dont l'absence du
     * parametre, conserve la lecture de l'archive JSON. Le retour arriere se fait donc en base, sans redeploiement : il
     * suffit de remettre le parametre a JSON.
     * </p>
     */
    private boolean lireDepuisReleveRelationnel() {
        return getParamettre("KEY_VALORISATION_SOURCE")
                .map(p -> "TABLE".equalsIgnoreCase(org.apache.commons.lang3.StringUtils.trimToEmpty(p.getStrVALUE())))
                .orElse(Boolean.FALSE);
    }

    /**
     * Valorisation historique lue dans le releve relationnel : la journee est filtree par la cle primaire, MariaDB
     * agrege et ne renvoie que les quatre montants. Aucun document JSON n'est transfere ni analyse.
     */
    private Params getValeurStockFromReleve(int mode, LocalDate date, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN) {
        Params p = new Params(0L, 0L);
        p.setLongValueThree(0L);
        p.setLongValueFour(0L);
        try {
            List<String> predicates = new ArrayList<>();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder(
                    "SELECT COALESCE(SUM(s.prix_paf*s.qty),0) AS rayonAchat, COALESCE(SUM(s.prix_uni*s.qty),0) AS rayonVente, "
                            + "COALESCE(SUM(s.prix_paf*s.qty_reserve),0) AS resAchat, "
                            + "COALESCE(SUM(s.prix_uni*s.qty_reserve),0) AS resVente ");
            query.append(fromReleveSelonMode(mode, date, predicates, parasm, lgGROSSISTEID, lgFAMILLEARTICLEID,
                    lgZONEGEOID, END, BEGIN, false));
            appliquerPredicats(query, predicates);

            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> q.setParameter(k, v));
            Object[] r = (Object[]) q.getSingleResult();
            p.setLongValue(r[0] == null ? 0L : ((Number) r[0]).longValue());
            p.setLongValueTwo(r[1] == null ? 0L : ((Number) r[1]).longValue());
            p.setLongValueThree(r[2] == null ? 0L : ((Number) r[2]).longValue());
            p.setLongValueFour(r[3] == null ? 0L : ((Number) r[3]).longValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return p;
    }

    /**
     * Construit la clause FROM du releve relationnel et les predicats communs et propres au mode demande.
     *
     * <p>
     * Le magasin est fige a l'officine, exactement comme le traitement qui ecrit le releve : filtrer sur le magasin
     * transmis par l'ecran exposerait a un total vide si sa valeur differait de celle enregistree, et ne pas filtrer du
     * tout compterait deux fois un produit present dans deux magasins.
     * </p>
     *
     * @param avecTva
     *            ajoute la jointure sur le code TVA, necessaire aux ventilations par taux
     *
     * @return le fragment FROM, les predicats etant ajoutes a {@code predicates}
     */
    private String fromReleveSelonMode(int mode, LocalDate date, List<String> predicates, Map<String, Object> parasm,
            String lgGROSSISTEID, String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN,
            boolean avecTva) {

        int dateInt = date.getYear() * 10000 + date.getMonthValue() * 100 + date.getDayOfMonth();
        predicates.add(" f.lg_FAMILLE_ID=s.produit_id ");
        predicates.add(" f.str_STATUT = :statut ");
        predicates.add(" s.stock_of_day = :dateInt ");
        predicates.add(" s.magasin_id = :magasinId ");
        parasm.put("statut", DateConverter.STATUT_ENABLE);
        parasm.put("dateInt", dateInt);
        parasm.put("magasinId", Constant.OFFICINE);

        String tva = avecTva ? ", t_code_tva v " : "";
        if (avecTva) {
            predicates.add(" v.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID ");
        }

        switch (mode) {
        case 3:
            predicates.add(" f.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
            if (estFiltreExplicite(lgGROSSISTEID)) {
                ajouterFiltreIds(predicates, parasm, "f.lg_GROSSISTE_ID", lgGROSSISTEID);
            } else {
                ajouterBornesCode(predicates, parasm, "g.str_CODE", END, BEGIN);
            }
            return " FROM stock_snapshot_day s, t_famille f, t_grossiste g " + tva;
        case 2:
            predicates.add(" f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
            if (estFiltreExplicite(lgZONEGEOID)) {
                ajouterFiltreIds(predicates, parasm, "f.lg_ZONE_GEO_ID", lgZONEGEOID);
            } else {
                ajouterBornesCode(predicates, parasm, "g.str_CODE", END, BEGIN);
            }
            return " FROM stock_snapshot_day s, t_famille f, t_zone_geographique g " + tva;
        case 1:
            predicates.add(" f.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
            if (estFiltreExplicite(lgFAMILLEARTICLEID)) {
                ajouterFiltreIds(predicates, parasm, "f.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);
            } else {
                ajouterBornesCode(predicates, parasm, "g.str_CODE_FAMILLE", END, BEGIN);
            }
            return " FROM stock_snapshot_day s, t_famille f, t_famillearticle g " + tva;
        default:
            return " FROM stock_snapshot_day s, t_famille f " + (avecTva ? ", t_code_tva v " : "");
        }
    }

    /** Un identifiant vaut filtre explicite s'il designe une selection reelle et non "tous" ("0", "%%", vide). */
    private boolean estFiltreExplicite(String id) {
        return id != null && !"0".equals(id) && !"%%".equals(id) && !"".equals(id);
    }

    private void ajouterBornesCode(List<String> predicates, Map<String, Object> parasm, String colonne, String END,
            String BEGIN) {
        if (BEGIN != null && !"".equals(BEGIN)) {
            predicates.add(" " + colonne + " >= :debut ");
            parasm.put("debut", BEGIN);
        }
        if (END != null && !"".equals(END)) {
            predicates.add(" " + colonne + " <= :fin ");
            parasm.put("fin", END);
        }
    }

    private void appliquerPredicats(StringBuilder query, List<String> predicates) {
        query.append(" WHERE ");
        for (int i = 0; i < predicates.size(); i++) {
            if (i > 0) {
                query.append(" AND ");
            }
            query.append(predicates.get(i));
        }
    }

    private Params getValeurStockFromJson(int mode, LocalDate date, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN) {
        if (isJsonTableDisponible()) {
            try {
                // Voie rapide : JSON_TABLE (MariaDB 10.6+).
                return getValeurStockFromJsonTable(mode, date, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                        BEGIN);
            } catch (Exception e) {
                // La version annoncait JSON_TABLE mais la requete echoue : on ne retentera plus jusqu'au prochain
                // demarrage, au lieu de rejouer l'echec a chaque affichage.
                jsonTableDisponible = Boolean.FALSE;
                LOG.log(Level.WARNING,
                        "JSON_TABLE indisponible/erreur, bascule sur le fallback Java pour la valorisation historique",
                        e);
            }
        }
        return getValeurStockFromJsonJava(mode, date, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN);
    }

    /**
     * Indique si le serveur de base de donnees connait JSON_TABLE (MariaDB 10.6+, MySQL 8+). Le resultat est calcule
     * une fois puis memorise.
     *
     * <p>
     * Avant cette verification, chaque affichage d'une valorisation historique lancait la requete JSON_TABLE, la voyait
     * echouer en erreur de syntaxe 1064 sur MariaDB 10.5, et journalisait une trace complete : un aller-retour SQL et
     * une pile d'exception perdus a chaque clic, sur une base qui ne supportera jamais la fonction.
     * </p>
     */
    private boolean isJsonTableDisponible() {
        Boolean connu = jsonTableDisponible;
        if (connu != null) {
            return connu;
        }
        boolean disponible = false;
        String version = "inconnue";
        try {
            Object v = getEntityManager().createNativeQuery("SELECT VERSION()").getSingleResult();
            version = v == null ? "" : v.toString();
            disponible = supporteJsonTable(version);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Version du serveur de base de donnees illisible : JSON_TABLE suppose absent", e);
        }
        LOG.log(Level.INFO, "Valorisation historique : base {0}, JSON_TABLE {1}",
                new Object[] { version, disponible ? "disponible" : "absent (extraction Java)" });
        jsonTableDisponible = disponible;
        return disponible;
    }

    /** Extrait le couple majeur.mineur de la banniere de version et le compare au seuil de chaque moteur. */
    static boolean supporteJsonTable(String version) {
        if (version == null) {
            return false;
        }
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+)\\.(\\d+)").matcher(version.trim());
        if (!m.find()) {
            return false;
        }
        int majeur = Integer.parseInt(m.group(1));
        int mineur = Integer.parseInt(m.group(2));
        if (version.toLowerCase().contains("mariadb")) {
            return majeur > 10 || (majeur == 10 && mineur >= 6);
        }
        return majeur >= 8;
    }

    /**
     * Voie rapide : extraction historique via JSON_TABLE (MariaDB 10.6+). Laisse remonter l'exception si JSON_TABLE est
     * indisponible, afin de declencher le fallback Java.
     */
    private Params getValeurStockFromJsonTable(int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN) {
        Params p = new Params(0L, 0L);
        p.setValueThree(0);
        p.setValueFour(0);
        {
            int dateInt = date.getYear() * 10000 + date.getMonthValue() * 100 + date.getDayOfMonth();
            List<String> predicates = new ArrayList<>();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append(
                    "SELECT COALESCE(SUM(jt.prixPaf*jt.qty),0) AS rayonAchat, COALESCE(SUM(jt.prixUni*jt.qty),0) AS rayonVente, ");
            query.append(
                    "COALESCE(SUM(jt.prixPaf*jt.qtyReserve),0) AS resAchat, COALESCE(SUM(jt.prixUni*jt.qtyReserve),0) AS resVente ");
            String jsonTable = " JSON_TABLE(ss.stock_journalier, '$[*]' COLUMNS ("
                    + " stockOfDay INT PATH '$.stockOfDay', prixPaf INT PATH '$.prixPaf', prixUni INT PATH '$.prixUni', "
                    + " qty INT PATH '$.qty', qtyReserve INT PATH '$.qtyReserve' DEFAULT '0' ON EMPTY DEFAULT '0' ON ERROR"
                    + ")) jt ";
            predicates.add(" o.lg_FAMILLE_ID=ss.produit_id ");
            predicates.add(" o.str_STATUT = :statut ");
            predicates.add(" jt.stockOfDay = :dateInt ");
            parasm.put("statut", DateConverter.STATUT_ENABLE);
            parasm.put("dateInt", dateInt);
            switch (mode) {
            case 3:
                query.append(" FROM stock_snapshot ss, ").append(jsonTable).append(", t_famille o, t_grossiste g ");
                predicates.add(" o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                query.append(" FROM stock_snapshot ss, ").append(jsonTable)
                        .append(", t_famille o, t_zone_geographique g ");
                predicates.add(" o.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                query.append(" FROM stock_snapshot ss, ").append(jsonTable)
                        .append(", t_famille o, t_famillearticle g ");
                predicates.add(" o.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);
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
                query.append(" FROM stock_snapshot ss, ").append(jsonTable).append(", t_famille o ");
                break;
            }
            query.append(" WHERE ");
            for (int i = 0; i < predicates.size(); i++) {
                if (i > 0) {
                    query.append(" AND ");
                }
                query.append(predicates.get(i));
            }
            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> q.setParameter(k, v));
            Object[] r = (Object[]) q.getSingleResult();
            p.setLongValue(r[0] == null ? 0L : ((Number) r[0]).longValue());
            p.setLongValueTwo(r[1] == null ? 0L : ((Number) r[1]).longValue());
            p.setLongValueThree(r[2] == null ? 0L : ((Number) r[2]).longValue());
            p.setLongValueFour(r[3] == null ? 0L : ((Number) r[3]).longValue());
        }
        return p;
    }

    /**
     * Fallback (MariaDB < 10.6, sans JSON_TABLE) : on recupere les JSON stock_journalier des familles correspondant au
     * filtre, puis on parse cote Java pour extraire l'entree de la date demandee et sommer rayon (qty) et reserve
     * (qtyReserve). value/valueTwo = rayon (achat/vente), valueThree/valueFour = reserve (achat/vente).
     */
    private Params getValeurStockFromJsonJava(int mode, LocalDate date, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN) {
        Params p = new Params(0L, 0L);
        p.setValueThree(0);
        p.setValueFour(0);
        try {
            int dateInt = date.getYear() * 10000 + date.getMonthValue() * 100 + date.getDayOfMonth();
            List<String> predicates = new ArrayList<>();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder("SELECT ss.stock_journalier ");
            predicates.add(" o.lg_FAMILLE_ID=ss.produit_id ");
            predicates.add(" o.str_STATUT = :statut ");
            parasm.put("statut", DateConverter.STATUT_ENABLE);
            switch (mode) {
            case 3:
                query.append(" FROM stock_snapshot ss, t_famille o, t_grossiste g ");
                predicates.add(" o.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                query.append(" FROM stock_snapshot ss, t_famille o, t_zone_geographique g ");
                predicates.add(" o.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                query.append(" FROM stock_snapshot ss, t_famille o, t_famillearticle g ");
                predicates.add(" o.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    ajouterFiltreIds(predicates, parasm, "o.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);
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
                query.append(" FROM stock_snapshot ss, t_famille o ");
                break;
            }
            query.append(" WHERE ");
            for (int i = 0; i < predicates.size(); i++) {
                if (i > 0) {
                    query.append(" AND ");
                }
                query.append(predicates.get(i));
            }
            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> q.setParameter(k, v));
            List<?> rows = q.getResultList();
            long rayonAchat = 0L;
            long rayonVente = 0L;
            long resAchat = 0L;
            long resVente = 0L;
            for (Object row : rows) {
                String json = jsonToString(row);
                if (json == null || json.isEmpty()) {
                    continue;
                }
                JSONArray arr = new JSONArray(json);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject day = arr.getJSONObject(i);
                    if (day.optInt("stockOfDay", 0) == dateInt) {
                        int prixPaf = day.optInt("prixPaf", 0);
                        int prixUni = day.optInt("prixUni", 0);
                        int qty = day.optInt("qty", 0);
                        int qtyReserve = day.optInt("qtyReserve", 0);
                        rayonAchat += (long) prixPaf * qty;
                        rayonVente += (long) prixUni * qty;
                        resAchat += (long) prixPaf * qtyReserve;
                        resVente += (long) prixUni * qtyReserve;
                        break; // une seule entree par jour
                    }
                }
            }
            p.setLongValue(rayonAchat);
            p.setLongValueTwo(rayonVente);
            p.setLongValueThree(resAchat);
            p.setLongValueFour(resVente);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return p;
    }

    /**
     * Convertit la valeur de la colonne stock_journalier (String, byte[] ou autre) en chaine JSON exploitable.
     */
    private String jsonToString(Object row) {
        if (row instanceof Object[]) {
            Object[] arr = (Object[]) row;
            row = arr.length > 0 ? arr[0] : null;
        }
        if (row == null) {
            return null;
        }
        if (row instanceof String) {
            return (String) row;
        }
        if (row instanceof byte[]) {
            return new String((byte[]) row, java.nio.charset.StandardCharsets.UTF_8);
        }
        return row.toString();
    }

    /**
     * Filtre d'identifiant des requetes de valorisation, etendu a la selection multiple : la valeur recue est soit un
     * id unique (comportement historique, SQL strictement inchange : egalite sur :idParam), soit plusieurs ids separes
     * par des virgules (cases cochees de l'ecran de valorisation), traduits en IN (...). Les autres appelants, qui
     * n'envoient jamais de virgule, conservent l'egalite a l'octet pres.
     */
    private void ajouterFiltreIds(List<String> predicates, Map<String, Object> parasm, String colonne, String valeur) {
        String[] ids = valeur.split(",");
        if (ids.length == 1) {
            predicates.add(" " + colonne + " = :idParam ");
            parasm.put("idParam", valeur);
            return;
        }
        StringBuilder in = new StringBuilder(" " + colonne + " IN (");
        for (int i = 0; i < ids.length; i++) {
            String nom = "idsel" + i;
            if (i > 0) {
                in.append(",");
            }
            in.append(":").append(nom);
            parasm.put(nom, ids[i].trim());
        }
        in.append(") ");
        predicates.add(in.toString());
    }

    /** Meme extension que {@link #ajouterFiltreIds} pour les requetes Criteria : egalite ou IN selon la valeur. */
    private Predicate construireFiltreIds(CriteriaBuilder cb, javax.persistence.criteria.Expression<String> chemin,
            String valeur) {
        String[] ids = valeur.split(",");
        if (ids.length == 1) {
            return cb.equal(chemin, valeur);
        }
        List<String> liste = new ArrayList<>();
        for (String id : ids) {
            liste.add(id.trim());
        }
        return chemin.in(liste);
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
                    predicates.add(construireFiltreIds(cb, gr.get(TGrossiste_.lgGROSSISTEID), lgGROSSISTEID));

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
                    predicates.add(construireFiltreIds(cb, zne.get(TZoneGeographique_.lgZONEGEOID), lgZONEGEOID));

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
                    predicates.add(
                            construireFiltreIds(cb, fm.get(TFamillearticle_.lgFAMILLEARTICLEID), lgFAMILLEARTICLEID));

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
    public ValorisationDTO getValeurStockPdf(int mode, LocalDate dtStart, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId,
            String typeStock) {
        if (dtStart.equals(LocalDate.now())) {
            // typeStock : "2" = reserve, "0" = total (rayon+reserve), sinon rayon (defaut, comportement existant).
            return valorisationCurrentStock(mode, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN,
                    emplacementId, typeStock);
        }
        // Historique detaille (PDF), par type de stock (rayon/reserve/total) : releve relationnel si la bascule est
        // active, sinon archive JSON.
        if (lireDepuisReleveRelationnel()) {
            ValorisationDTO etat = valorisationDepuisReleve(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID,
                    lgZONEGEOID, END, BEGIN, emplacementId, typeStock);
            // Un etat vide sur une journee jamais relevee ne doit pas se lire comme une officine vide.
            etat.setReleveDisponible(releveDisponible(false, true, () -> compterLignesReleve(dtStart)));
            return etat;
        }
        return valorisation(mode, dtStart, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END, BEGIN, emplacementId,
                typeStock);
    }

    /**
     * Expression SQL de la quantite a valoriser cote JSON (historique) selon typeStock. Defaut = rayon.
     */
    private String qtyExprJson(String typeStock) {
        if ("2".equals(typeStock) || "reserve".equalsIgnoreCase(typeStock)) {
            return "jt.qtyReserve";
        }
        if ("0".equals(typeStock) || "total".equalsIgnoreCase(typeStock)) {
            return "(jt.qty + jt.qtyReserve)";
        }
        return "jt.qty";
    }

    /**
     * Fragment SQL JSON_TABLE (MariaDB 10.6+) exposant les colonnes du stock_journalier sous l'alias jt.
     */
    private String jsonTableExpr() {
        return " JSON_TABLE(ss.stock_journalier, '$[*]' COLUMNS ("
                + " stockOfDay INT PATH '$.stockOfDay', prixPaf INT PATH '$.prixPaf', prixUni INT PATH '$.prixUni',"
                + " prixMoyentpondere INT PATH '$.prixMoyentpondere', qty INT PATH '$.qty',"
                + " qtyReserve INT PATH '$.qtyReserve' DEFAULT '0' ON EMPTY DEFAULT '0' ON ERROR)) jt ";
    }

    /**
     * Expression SQL de la quantite a valoriser selon typeStock. La reserve est lue via sous-requete correlee sur
     * t_type_stock_famille (type=2) -> pas de jointure supplementaire, donc pas de fan-out. Defaut = rayon (existant).
     */
    private String qtyExpr(String typeStock) {
        String reserve = "COALESCE((SELECT z.int_NUMBER FROM t_type_stock_famille z WHERE z.lg_FAMILLE_ID=o.lg_FAMILLE_ID"
                + " AND z.lg_TYPE_STOCK_ID='2' AND z.str_STATUT='enable' AND z.lg_EMPLACEMENT_ID=s.lg_EMPLACEMENT_ID),0)";
        if ("2".equals(typeStock) || "reserve".equalsIgnoreCase(typeStock)) {
            return reserve;
        }
        if ("0".equals(typeStock) || "total".equalsIgnoreCase(typeStock)) {
            return "(s.int_NUMBER_AVAILABLE + " + reserve + ")";
        }
        return "s.int_NUMBER_AVAILABLE";
    }

    /**
     * Agrege les groupes d'une valorisation historique detaillee (par grossiste, rayon, famille ou taux de TVA) et
     * calcule les totaux. Logique commune aux deux sources de lecture, archive JSON et releve relationnel, pour que les
     * deux produisent exactement le meme etat.
     */
    private ValorisationDTO agregerGroupes(List<Object[]> result, final int mode) {
        List<ValorisationDTO> os = new ArrayList<>();
        ValorisationDTO valorisation = new ValorisationDTO();
        LongAdder _montantFacture = new LongAdder();
        LongAdder _montantPu = new LongAdder();
        LongAdder _montantTarif = new LongAdder();
        LongAdder _qty = new LongAdder();
        LongAdder pmp = new LongAdder();
        result.forEach((_item) -> {
            Integer qty = Integer.valueOf(_item[3] + "");
            if (qty == null || qty <= 0) {
                return; // on n'affiche pas les groupes sans stock/reserve
            }
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
        valorisation.setMontantPu(_montantPu.intValue());
        valorisation.setMontantPmd(pmp.intValue());
        return valorisation;
    }

    /** Expression SQL de la quantite a valoriser cote releve relationnel selon typeStock. Defaut = rayon. */
    private String qtyExprReleve(String typeStock) {
        if ("2".equals(typeStock) || "reserve".equalsIgnoreCase(typeStock)) {
            return "s.qty_reserve";
        }
        if ("0".equals(typeStock) || "total".equalsIgnoreCase(typeStock)) {
            return "(s.qty + s.qty_reserve)";
        }
        return "s.qty";
    }

    /**
     * Taux de TVA d'une ligne de releve : le taux fige au jour du releve, et a defaut celui de la fiche produit.
     *
     * <p>
     * Les lignes reprises depuis l'archive JSON n'ont pas de taux, le document ne le portait pas : elles retombent sur
     * la fiche produit, soit exactement le comportement de l'etat actuel. Les releves ecrits depuis la mise en place du
     * releve relationnel portent le taux du jour, et une modification ulterieure du taux ne deforme plus une
     * ventilation deja publiee.
     * </p>
     */
    private String tauxTvaReleve() {
        return "COALESCE(NULLIF(s.valeur_tva,0), v.int_VALUE)";
    }

    /** Valorisation historique detaillee (PDF), lue dans le releve relationnel. Pendant de {@link #valorisation}. */
    private ValorisationDTO valorisationDepuisReleve(final int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId,
            String typeStock) {
        try {
            String qte = qtyExprReleve(typeStock);
            List<String> predicates = new ArrayList<>();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append("SELECT SUM(s.prix_paf*" + qte + ") AS montantFacture, SUM(s.prix_uni*" + qte
                    + ") AS montantPu , 0 AS montantTarif , SUM(" + qte
                    + ") AS qty , SUM(s.prix_moyen_pondere) AS pmp ");

            boolean parTva = mode != 1 && mode != 2 && mode != 3;
            switch (mode) {
            case 3:
                query.append(",g.str_LIBELLE AS LIBELLE,g.str_CODE AS CODE ");
                break;
            case 2:
                query.append(",g.str_LIBELLEE AS LIBELLE,g.str_CODE AS CODE ");
                break;
            case 1:
                query.append(",g.str_LIBELLE AS LIBELLE,g.str_CODE_FAMILLE AS CODE ");
                break;
            default:
                query.append("," + tauxTvaReleve() + " AS tva ");
                break;
            }

            query.append(fromReleveSelonMode(mode, date, predicates, parasm, lgGROSSISTEID, lgFAMILLEARTICLEID,
                    lgZONEGEOID, END, BEGIN, parTva));
            appliquerPredicats(query, predicates);

            switch (mode) {
            case 3:
                query.append(" GROUP BY g.lg_GROSSISTE_ID ORDER BY g.str_CODE ASC ");
                break;
            case 2:
                query.append(" GROUP BY g.lg_ZONE_GEO_ID ORDER BY g.str_CODE ASC ");
                break;
            case 1:
                query.append(" GROUP BY g.lg_FAMILLEARTICLE_ID ORDER BY g.str_CODE_FAMILLE ASC ");
                break;
            default:
                query.append(" GROUP BY " + tauxTvaReleve());
                break;
            }

            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> q.setParameter(k, v));
            ValorisationDTO valorisation = agregerGroupes(q.getResultList(), mode);
            valorisation.setTvas(valorisationTvaDepuisReleve(mode, date, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID,
                    END, BEGIN, emplacementId, typeStock));
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    /** Ventilation par taux de TVA, lue dans le releve relationnel. Pendant de {@link #valorisationTva}. */
    private ValorisationDTO valorisationTvaDepuisReleve(final int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId,
            String typeStock) {
        try {
            String qte = qtyExprReleve(typeStock);
            List<String> predicates = new ArrayList<>();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append("SELECT SUM(s.prix_paf*" + qte + ") AS montantFacture, SUM(s.prix_uni*" + qte
                    + ") AS montantPu , 0 AS montantTarif , SUM(" + qte + ") AS qty , " + tauxTvaReleve()
                    + " AS tva , SUM(s.prix_moyen_pondere) AS pmp ");
            query.append(fromReleveSelonMode(mode, date, predicates, parasm, lgGROSSISTEID, lgFAMILLEARTICLEID,
                    lgZONEGEOID, END, BEGIN, true));
            appliquerPredicats(query, predicates);
            query.append(" GROUP BY " + tauxTvaReleve());

            Query q = getEntityManager().createNativeQuery(query.toString());
            parasm.forEach((k, v) -> q.setParameter(k, v));
            List<Object[]> result = q.getResultList();

            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            LongAdder _montantFacture = new LongAdder();
            LongAdder _montantPu = new LongAdder();
            LongAdder pmp = new LongAdder();
            result.forEach((_item) -> {
                Integer qty = Integer.valueOf(_item[3] + "");
                if (qty == null || qty <= 0) {
                    return;
                }
                ValorisationDTO dTO = new ValorisationDTO();
                Integer montantFacture = Integer.valueOf(_item[0] + "");
                _montantFacture.add(montantFacture);
                dTO.setMontantFacture(montantFacture);
                Integer montantPu = Integer.valueOf(_item[1] + "");
                dTO.setMontantPu(montantPu);
                _montantPu.add(montantPu);
                dTO.setMontantTarif(Integer.valueOf(_item[2] + ""));
                int _pmp = Double.valueOf(_item[5] + "").intValue();
                pmp.add(_pmp);
                dTO.setMontantPmd(_pmp);
                dTO.setLibelle("Tva " + _item[4]);
                os.add(dTO);
            });
            valorisation.setDatas(os);
            valorisation.setMontantFacture(_montantFacture.intValue());
            valorisation.setMontantPu(_montantPu.intValue());
            valorisation.setMontantPmd(pmp.intValue());
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    // les produits qui on subit un mvt à cette date
    private ValorisationDTO valorisation(final int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId,
            String typeStock) {
        try {
            int dateInt = date.getYear() * 10000 + date.getMonthValue() * 100 + date.getDayOfMonth();
            String qte = qtyExprJson(typeStock);
            String jt = jsonTableExpr();
            List<String> predicates = new ArrayList<>();
            ValorisationDTO valorisation;
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append("SELECT SUM(jt.prixPaf*" + qte + ") AS montantFacture, SUM(jt.prixUni*" + qte
                    + ") AS montantPu , 0 AS montantTarif , SUM(" + qte
                    + ") AS qty , SUM(jt.prixMoyentpondere) AS pmp ");
            predicates.add(" f.lg_FAMILLE_ID=ss.produit_id ");
            predicates.add(" f.str_STATUT='enable' ");
            predicates.add(" jt.stockOfDay = :dateInt ");
            parasm.put("dateInt", dateInt);
            switch (mode) {
            case 3:
                query.append(",g.str_LIBELLE AS LIBELLE,g.str_CODE AS CODE FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_grossiste g ");
                predicates.add(" f.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    ajouterFiltreIds(predicates, parasm, "f.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                query.append(",g.str_LIBELLEE AS LIBELLE,g.str_CODE AS CODE FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_zone_geographique g ");
                predicates.add(" f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    ajouterFiltreIds(predicates, parasm, "f.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                query.append(",g.str_LIBELLE AS LIBELLE,g.str_CODE_FAMILLE AS CODE FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_famillearticle g ");
                predicates.add(" f.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    ajouterFiltreIds(predicates, parasm, "f.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);
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
                query.append(",v.int_VALUE AS tva FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_code_tva v ");
                predicates.add(" v.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID ");
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
            parasm.forEach((k, v) -> q.setParameter(k, v));
            valorisation = agregerGroupes(q.getResultList(), mode);
            ValorisationDTO tvas = valorisationTva(mode, date, lgGROSSISTEID, lgFAMILLEARTICLEID, lgZONEGEOID, END,
                    BEGIN, emplacementId, typeStock);
            valorisation.setTvas(tvas);
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    private ValorisationDTO valorisationTva(final int mode, LocalDate date, String lgGROSSISTEID,
            String lgFAMILLEARTICLEID, String lgZONEGEOID, String END, String BEGIN, String emplacementId,
            String typeStock) {
        try {
            int dateInt = date.getYear() * 10000 + date.getMonthValue() * 100 + date.getDayOfMonth();
            String qte = qtyExprJson(typeStock);
            String jt = jsonTableExpr();
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append("SELECT SUM(jt.prixPaf*" + qte + ") AS montantFacture, SUM(jt.prixUni*" + qte
                    + ") AS montantPu , 0 AS montantTarif , SUM(" + qte
                    + ") AS qty, v.int_VALUE AS tva, SUM(jt.prixMoyentpondere) AS pmp ");
            predicates.add(" f.lg_FAMILLE_ID=ss.produit_id ");
            predicates.add(" f.str_STATUT='enable' ");
            predicates.add(" jt.stockOfDay = :dateInt ");
            predicates.add(" v.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID ");
            parasm.put("dateInt", dateInt);
            switch (mode) {
            case 3:
                query.append(" FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_code_tva v, t_grossiste g ");
                predicates.add(" f.lg_GROSSISTE_ID=g.lg_GROSSISTE_ID ");
                if (lgGROSSISTEID != null && !"0".equals(lgGROSSISTEID) && !"%%".equals(lgGROSSISTEID)
                        && !"".equals(lgGROSSISTEID)) {
                    ajouterFiltreIds(predicates, parasm, "f.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                query.append(" FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_code_tva v, t_zone_geographique g ");
                predicates.add(" f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID ");
                if (lgZONEGEOID != null && !"0".equals(lgZONEGEOID) && !"%%".equals(lgZONEGEOID)
                        && !"".equals(lgZONEGEOID)) {
                    ajouterFiltreIds(predicates, parasm, "f.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                query.append(" FROM stock_snapshot ss, ").append(jt)
                        .append(", t_famille f, t_code_tva v, t_famillearticle g ");
                predicates.add(" f.lg_FAMILLEARTICLE_ID=g.lg_FAMILLEARTICLE_ID ");
                if (lgFAMILLEARTICLEID != null && !"0".equals(lgFAMILLEARTICLEID) && !"%%".equals(lgFAMILLEARTICLEID)
                        && !"".equals(lgFAMILLEARTICLEID)) {
                    ajouterFiltreIds(predicates, parasm, "f.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);
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
                query.append(" FROM stock_snapshot ss, ").append(jt).append(", t_famille f, t_code_tva v ");
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
            parasm.forEach((k, v) -> q.setParameter(k, v));
            List<Object[]> result = q.getResultList();
            LongAdder _montantFacture = new LongAdder();
            LongAdder _montantPu = new LongAdder();
            LongAdder _montantTarif = new LongAdder();
            LongAdder _qty = new LongAdder();
            LongAdder pmp = new LongAdder();
            result.forEach((_item) -> {
                Integer qty = Integer.valueOf(_item[3] + "");
                if (qty == null || qty <= 0) {
                    return; // pas de ligne TVA sans stock/reserve
                }
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
            String lgZONEGEOID, String END, String BEGIN, String emplacementId, String typeStock) {
        try {
            String qte = qtyExpr(typeStock);
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append("SELECT SUM(o.int_PAF *" + qte + ") AS montantFacture, SUM(o.int_PRICE *" + qte
                    + ") AS montantPu ,SUM(o.int_PAT *" + qte + ") AS montantTarif , SUM(" + qte
                    + ") AS qty ,SUM(o.dbl_PRIX_MOYEN_PONDERE) AS pmp");
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
                    ajouterFiltreIds(predicates, parasm, "o.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                    ajouterFiltreIds(predicates, parasm, "o.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                    ajouterFiltreIds(predicates, parasm, "o.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);

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
                Integer qty = Integer.valueOf(_item[3] + "");
                if (qty == null || qty <= 0) {
                    return; // on n'affiche pas les groupes sans stock/reserve
                }
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
                    END, BEGIN, emplacementId, typeStock);
            valorisation.setTvas(tvas);
            return valorisation;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ValorisationDTO();
        }
    }

    private ValorisationDTO valorisationCurrentStockTva(final int mode, String lgGROSSISTEID, String lgFAMILLEARTICLEID,
            String lgZONEGEOID, String END, String BEGIN, String emplacementId, String typeStock) {
        try {
            String qte = qtyExpr(typeStock);
            List<String> predicates = new ArrayList<>();
            List<ValorisationDTO> os = new ArrayList<>();
            ValorisationDTO valorisation = new ValorisationDTO();
            Map<String, Object> parasm = new HashMap<>();
            StringBuilder query = new StringBuilder();
            query.append("SELECT SUM(o.int_PAF *" + qte + ") AS montantFacture, SUM(o.int_PRICE *" + qte
                    + ") AS montantPu ,SUM(o.int_PAT *" + qte + ") AS montantTarif , SUM(" + qte
                    + ") AS qty, SUM(o.dbl_PRIX_MOYEN_PONDERE) AS pmp ");
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
                    ajouterFiltreIds(predicates, parasm, "o.lg_GROSSISTE_ID", lgGROSSISTEID);
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
                    ajouterFiltreIds(predicates, parasm, "o.lg_ZONE_GEO_ID", lgZONEGEOID);
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
                    ajouterFiltreIds(predicates, parasm, "o.lg_FAMILLEARTICLE_ID", lgFAMILLEARTICLEID);

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
                Integer qty = Integer.valueOf(item0[3] + "");
                if (qty == null || qty <= 0) {
                    return; // pas de ligne TVA sans stock/reserve
                }
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

    @Override
    public JSONObject updateCodeCip(String familleId, UpdateCipDTO dto) {
        JSONObject json = new JSONObject();
        String code = dto.getNewCip() != null ? dto.getNewCip().trim() : "";
        String grossisteId = dto.getGrossisteId();
        boolean isEAN = "EAN".equalsIgnoreCase(dto.getField());

        if (code.length() < 6) {
            return json.put("success", false).put("message", "Le code doit avoir au minimum 6 caractères");
        }

        TFamille famille = em.find(TFamille.class, familleId);
        if (famille == null) {
            return json.put("success", false).put("message", "Produit introuvable");
        }

        if (isEAN) {
            // Mise à jour de int_EAN13 uniquement — int_CIP reste inchangé
            famille.setIntEAN13(code);
            em.merge(famille);
        } else {
            // Mise à jour de int_CIP : vérification doublon d'abord
            TFamilleGrossiste existant = isCIPExist(code, grossisteId);
            if (existant != null && !existant.getLgFAMILLEID().getLgFAMILLEID().equals(familleId)) {
                return json.put("success", false).put("message",
                        "Ce code est déjà utilisé par : " + existant.getLgFAMILLEID().getStrDESCRIPTION());
            }
            TFamille existProduct = isCIPGrossistet(code, grossisteId);
            if (existProduct != null && !existProduct.getLgFAMILLEID().equals(familleId)) {
                return json.put("success", false).put("message",
                        "Ce code est déjà utilisé par : " + existProduct.getStrDESCRIPTION());
            }

            famille.setIntCIP(code);
            em.merge(famille);

            try {
                TypedQuery<TFamilleGrossiste> q = em.createQuery(
                        "SELECT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2",
                        TFamilleGrossiste.class);
                q.setParameter(1, familleId).setParameter(2, grossisteId).setMaxResults(1);
                TFamilleGrossiste fg = q.getSingleResult();
                fg.setStrCODEARTICLE(code);
                em.merge(fg);
            } catch (Exception e) {
                // pas de TFamilleGrossiste pour ce grossiste, acceptable
            }
        }

        return json.put("success", true);
    }

    // Suivi UG : liste des produits ayant du stock d'unites gratuites (intUG > 0) pour l'emplacement de l'utilisateur
    @Override
    public List<ArticleDTO> suiviUgArticles(TUser user, String query) {
        List<ArticleDTO> result = new ArrayList<>();
        try {
            String empId = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            StringBuilder jpql = new StringBuilder(
                    "SELECT s FROM TFamilleStock s WHERE s.intUG > 0 AND s.lgEMPLACEMENTID.lgEMPLACEMENTID = :empId AND s.strSTATUT = 'enable'");
            boolean hasQuery = query != null && !query.trim().isEmpty();
            if (hasQuery) {
                jpql.append(" AND (s.lgFAMILLEID.strNAME LIKE :q OR s.lgFAMILLEID.intCIP LIKE :q)");
            }
            jpql.append(" ORDER BY s.lgFAMILLEID.strNAME ASC");
            javax.persistence.TypedQuery<TFamilleStock> q = getEntityManager().createQuery(jpql.toString(),
                    TFamilleStock.class);
            q.setParameter("empId", empId);
            if (hasQuery) {
                q.setParameter("q", query.trim() + "%");
            }
            for (TFamilleStock s : q.getResultList()) {
                TFamille f = s.getLgFAMILLEID();
                if (f == null) {
                    continue;
                }
                ArticleDTO dto = new ArticleDTO();
                dto.setId(f.getLgFAMILLEID());
                dto.setCode(f.getIntCIP());
                dto.setLibelle(f.getStrNAME());
                dto.setPrixAchat(f.getIntPAF() != null ? f.getIntPAF() : 0);
                dto.setPrixVente(f.getIntPRICE() != null ? f.getIntPRICE() : 0);
                dto.setStock(s.getIntNUMBERAVAILABLE() != null ? s.getIntNUMBERAVAILABLE() : 0);
                dto.setStockUg(s.getIntUG() != null ? s.getIntUG() : 0);
                if (f.getLgGROSSISTEID() != null) {
                    dto.setGrossisteId(f.getLgGROSSISTEID().getLgGROSSISTEID());
                }
                result.add(dto);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    @Override
    public JSONObject suiviUg(TUser user, String query, int start, int limit) throws JSONException {
        List<ArticleDTO> datas = suiviUgArticles(user, query);
        int total = datas.size();
        List<ArticleDTO> page = datas;
        // Pagination cote serveur uniquement si limit > 0 (sinon on renvoie tout : cas suggestion / inventaire)
        if (limit > 0) {
            int from = Math.max(0, start);
            int to = Math.min(total, from + limit);
            page = (from < to) ? new ArrayList<>(datas.subList(from, to)) : new ArrayList<>();
        }
        return new JSONObject().put("total", total).put("data", new JSONArray(page));
    }
}
