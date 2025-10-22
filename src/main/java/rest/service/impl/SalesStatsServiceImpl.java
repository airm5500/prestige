/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.MagasinDTO;
import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.SummaryDTO;
import commonTasks.dto.TicketDTO;
import commonTasks.dto.TiersPayantParams;
import commonTasks.dto.TvaDTO;
import commonTasks.dto.VenteDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.HMvtProduit;
import dal.Medecin_;
import dal.MvtTransaction;
import dal.MvtTransaction_;
import dal.PrixReferenceVente;
import dal.PrixReferenceVente_;
import dal.TAyantDroit;
import dal.TClient;
import dal.TCompteClientTiersPayant;
import dal.TCompteClientTiersPayant_;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TGrossiste_;
import dal.TNatureVente_;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementCompteClientTiersPayent_;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TTiersPayant_;
import dal.TTypeReglement_;
import dal.TTypeVente_;
import dal.TUser_;
import dal.TZoneGeographique_;
import dal.enumeration.TypeTransaction;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.ListIterator;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CaisseService;
import rest.service.SalesStatsService;
import rest.service.SessionHelperService;
import rest.service.SuggestionService;
import rest.service.VenteReglementService;
import rest.service.dto.builder.VenteDTOBuilder;
import util.Constant;

/**
 *
 * @author Kobena
 */
@Stateless
public class SalesStatsServiceImpl implements SalesStatsService {

    private static final Logger LOG = Logger.getLogger(SalesStatsServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    CaisseService caisseService;
    @EJB
    private SuggestionService suggestionService;
    @EJB
    private VenteReglementService venteReglementService;
    @EJB
    private SessionHelperService sessionHelperService;

    public EntityManager getEntityManager() {
        return em;
    }

    private TEmplacement findEmplacementById(String id) {
        return getEntityManager().find(TEmplacement.class, id);
    }

    private TPreenregistrement findById(String id) {
        TPreenregistrement tp = getEntityManager().find(TPreenregistrement.class, id);
        getEntityManager().refresh(tp);
        return tp;
    }

    List<Predicate> predicatesVentesAnnulees(SalesStatsParams params, CriteriaBuilder cb,
            Root<TPreenregistrementDetail> root, Join<TPreenregistrementDetail, TPreenregistrement> st) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.and(cb.isTrue(st.get(TPreenregistrement_.bISCANCEL))));
        Predicate btw = cb.between(cb.function("DATE", Date.class, st.get(TPreenregistrement_.dtANNULER)),
                java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd()));
        predicates.add(cb.and(btw));

        predicates.add(cb.and(cb.equal(st.get(TPreenregistrement_.strSTATUT), params.getStatut())));

        if (params.getQuery() != null && !"".equals(params.getQuery())) {
            Predicate predicate = cb.and(cb.or(
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                            params.getQuery() + "%"),
                    cb.like(st.get(TPreenregistrement_.strREFTICKET), params.getQuery() + "%"),
                    cb.like(st.get(TPreenregistrement_.strREF), params.getQuery() + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME),
                            params.getQuery() + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intEAN13),
                            params.getQuery() + "%")));
            predicates.add(predicate);
        }
        if (!params.isShowAll()) {
            predicates.add(cb.and(cb.equal(st.get(TPreenregistrement_.lgUSERID).get(TUser_.lgUSERID),
                    params.getUserId().getLgUSERID())));
        }
        if (!params.isShowAllActivities()) {
            TEmplacement te = params.getUserId().getLgEMPLACEMENTID();
            predicates.add(cb.and(
                    cb.equal(st.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID).get("lgEMPLACEMENTID"),
                            te.getLgEMPLACEMENTID())));
        }
        return predicates;
    }

    @Override
    public long montantVenteAnnulees(SalesStatsParams params) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cm = cb.createQuery(Long.class);
            Root<MvtTransaction> mv = cm.from(MvtTransaction.class);
            cm.select(cb.sumAsLong(mv.get(MvtTransaction_.montantPaye)));
            Subquery<String> cq = cm.subquery(String.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(st.get(TPreenregistrement_.lgPREENREGISTREMENTID));
            List<Predicate> predicates = predicatesVentesAnnulees(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            cm.where(cb.and(cb.greaterThan(mv.get(MvtTransaction_.montantPaye), 0), cb
                    .equal(mv.get(MvtTransaction_.reglement).get(TTypeReglement_.lgTYPEREGLEMENTID), Constant.MODE_ESP),
                    cb.in(mv.get(MvtTransaction_.pkey)).value(cq)));
            Query q = getEntityManager().createQuery(cm);
            Long sumAnnulation = (Long) q.getSingleResult();
            return (sumAnnulation != null ? sumAnnulation : 0);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    @Override
    public JSONObject annulations(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            long count = countListeAnnulations(params);
            if (count == 0) {
                json.put("total", count);
                json.put("data", new JSONArray());
                return json;
            }

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)).distinct(true)
                    .orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = predicatesVentesAnnulees(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            List<TPreenregistrement> list = q.getResultList();
            List<VenteDTO> data = list.stream().map(v -> new VenteDTO(findById(v.getLgPREENREGISTREMENTID()),
                    findByParent(v.getLgPREENREGISTREMENTID()))).collect(Collectors.toList());

            json.put("total", count);
            json.put("data", new JSONArray(data)).put("metaData", montantVenteAnnulees(params));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private MvtTransaction findByVente(String id) {
        try {
            TypedQuery<MvtTransaction> q = getEntityManager()
                    .createQuery("SELECT o FROM MvtTransaction o WHERE o.pkey=?1 ", MvtTransaction.class);
            q.setParameter(1, id);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {

            return null;
        }
    }

    @Override
    public List<VenteDTO> annulationVente(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)).distinct(true)
                    .orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = predicatesVentesAnnulees(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);

            List<TPreenregistrement> list = q.getResultList();
            return list.stream()
                    .map(v -> new VenteDTO(findById(v.getLgPREENREGISTREMENTID()),
                            findByParent(v.getLgPREENREGISTREMENTID()), findByVente(v.getLgPREENREGISTREMENTID())))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public long countListeAnnulations(SalesStatsParams params) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)));
            List<Predicate> predicates = predicatesVentesAnnulees(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private void listePreenregistrement(SalesStatsParams params, CriteriaBuilder cb, Root<TPreenregistrement> root,
            List<Predicate> predicates) {
        params.setUserId(this.sessionHelperService.getCurrentUser());

        predicates.add(cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd())));
        if (params.isDepotOnly()) {
            predicates.add(cb.notEqual(root.get(TPreenregistrement_.pkBrand), ""));
        } else {
            predicates.add(cb.notEqual(root.get(TPreenregistrement_.lgNATUREVENTEID).get("lgNATUREVENTEID"),
                    Constant.KEY_NATURE_VENTE_DEPOT));
        }
        if (params.getStatut().equals(Constant.ALL)) {
            predicates.add(cb.or(cb.equal(root.get(TPreenregistrement_.strSTATUT), Constant.STATUT_IS_PROGRESS),
                    cb.equal(root.get(TPreenregistrement_.strSTATUT), Constant.STATUT_PENDING)));
        } else {

            predicates.add(cb.equal(root.get(TPreenregistrement_.strSTATUT), params.getStatut()));
        }
        if (StringUtils.isNotEmpty(params.getQuery())) {
            var search = params.getQuery() + "%";
            Join<TPreenregistrement, TPreenregistrementDetail> st = root
                    .join(TPreenregistrement_.tPreenregistrementDetailCollection, JoinType.INNER);
            predicates.add(cb.or(
                    cb.like(st.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                            params.getQuery() + "%"),
                    cb.like(root.get(TPreenregistrement_.strREF), search),
                    cb.like(st.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), search),
                    cb.like(st.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intEAN13), search)));

        }
        if (StringUtils.isNotEmpty(params.getTypeVenteId())) {

            predicates.add(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), params.getTypeVenteId()));
        }
        if (!this.sessionHelperService.getData().isShowAllVente()) {
            predicates.add(cb.equal(root.get(TPreenregistrement_.lgUSERID).get(TUser_.lgUSERID),
                    params.getUserId().getLgUSERID()));
        }
        if (!this.sessionHelperService.getData().isShowAllActivity()) {
            TEmplacement te = params.getUserId().getLgEMPLACEMENTID();
            predicates.add(
                    cb.equal(root.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID).get("lgEMPLACEMENTID"),
                            te.getLgEMPLACEMENTID()));
        }
    }

    @Override
    public long countListeTPreenregistrement(SalesStatsParams params) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            cq.select(cb.count(root));
            listePreenregistrement(params, cb, root, predicates);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    @Override
    public JSONObject getListeTPreenregistrement(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            long count = countListeTPreenregistrement(params);
            if (count == 0) {
                json.put("total", count);
                json.put("data", new JSONArray());
                return json;
            }
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            cq.select(root).orderBy(cb.asc(root.get(TPreenregistrement_.dtUPDATED)));
            listePreenregistrement(params, cb, root, predicates);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            List<TPreenregistrement> list = q.getResultList();
            List<VenteDTO> data;
            if (!params.isDepotOnly()) {
                data = list.stream().map(v -> {
                    Collection<TPreenregistrementCompteClientTiersPayent> prs = v
                            .getTPreenregistrementCompteClientTiersPayentCollection();
                    List<TPreenregistrementDetail> items = new ArrayList<>(v.getTPreenregistrementDetailCollection());
                    List<TiersPayantParams> details = new ArrayList<>();
                    if (CollectionUtils.isNotEmpty(prs)) {
                        details = prs.stream().map(TiersPayantParams::new).collect(Collectors.toList());
                    }

                    return new VenteDTO(v, (v.getStrTYPEVENTE().equals("VO") ? details : Collections.emptyList()),
                            (v.getAyantDroit() != null ? new AyantDroitDTO(v.getAyantDroit()) : null),
                            (v.getClient() != null ? new ClientDTO(v.getClient()) : null), items);

                }).collect(Collectors.toList());
            } else {
                data = list.stream().map(v -> {

                    List<TPreenregistrementDetail> items = new ArrayList<>(v.getTPreenregistrementDetailCollection());
                    return new VenteDTO(v, new MagasinDTO(findEmplacementById(v.getPkBrand())), items);
                }).collect(Collectors.toList());
            }
            json.put("total", count);
            json.put("data", new JSONArray(data));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private List<TPreenregistrementCompteClientTiersPayent> findClientTiersPayents(String idVente) {
        return getEntityManager().createQuery(
                "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                .setParameter(1, idVente).getResultList();
    }

    private List<TPreenregistrementDetail> findByParent(String idVente) {
        return getEntityManager().createQuery(
                "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                .setParameter(1, idVente).getResultList();
    }

    public void updateItemsBulk(String venteId, String statut) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaUpdate<TPreenregistrementDetail> cq = cb.createCriteriaUpdate(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            cq.set(root.get(TPreenregistrementDetail_.strSTATUT), statut);
            cq.where(cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get("lgPREENREGISTREMENTID"),
                    venteId));
            getEntityManager().createQuery(cq).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    public void deleteCompteClientBulk(String venteId) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaDelete<TPreenregistrementCompteClientTiersPayent> cq = cb
                    .createCriteriaDelete(TPreenregistrementCompteClientTiersPayent.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            cq.where(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                    .get("lgPREENREGISTREMENTID"), venteId));
            getEntityManager().createQuery(cq).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    public void updateCompteClientBulk(String venteId, String statut) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaUpdate<TPreenregistrementCompteClientTiersPayent> cq = cb
                    .createCriteriaUpdate(TPreenregistrementCompteClientTiersPayent.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            cq.set(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUT), statut);
            cq.where(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                    .get("lgPREENREGISTREMENTID"), venteId));
            getEntityManager().createQuery(cq).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    @Override
    public JSONObject delete(String venteId) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TPreenregistrement tp = getEntityManager().find(TPreenregistrement.class, venteId);
            LOG.log(Level.INFO, "{0} {1}", new Object[] { venteId, tp });
            Collection<TPreenregistrementDetail> items = tp.getTPreenregistrementDetailCollection();
            if (CollectionUtils.isNotEmpty(items)) {
                items.forEach(em::remove);
            }

            deleteCompteClientBulk(venteId);
            getEntityManager().remove(tp);
            json.put("success", true);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

            json.put("success", false);
        }
        return json;
    }

    @Override
    public JSONObject trash(String venteId, String statut) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TPreenregistrement tp = getEntityManager().find(TPreenregistrement.class, venteId);
            updateItemsBulk(venteId, statut);
            updateCompteClientBulk(venteId, statut);
            tp.setStrSTATUT(statut);
            getEntityManager().merge(tp);
            json.put("success", true);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

            json.put("success", false);
        }
        return json;
    }

    Comparator<TiersPayantParams> comparator = Comparator.comparingInt(TiersPayantParams::getOrder);

    @Override
    public JSONObject findVenteById(String venteId) throws JSONException {
        JSONObject json = new JSONObject();
        TPreenregistrement p = findById(venteId);
        json.put("success", true).put("data",
                new JSONObject(new VenteDTO(p, new MagasinDTO(findEmplacementById(p.getPkBrand())))));
        return json;
    }

    private List<TiersPayantParams> findTiersPayantByClientId(String clientId) {
        try {
            TypedQuery<TCompteClientTiersPayant> query = getEntityManager().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1",
                    TCompteClientTiersPayant.class);
            query.setParameter(1, clientId);
            return query.getResultList().stream().map(TiersPayantParams::new).sorted(comparator)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<AyantDroitDTO> findAyantDroitByClientId(String clientId) {
        try {
            TypedQuery<TAyantDroit> query = getEntityManager()
                    .createQuery("SELECT o FROM TAyantDroit o WHERE o.lgCLIENTID.lgCLIENTID=?1", TAyantDroit.class);
            query.setParameter(1, clientId);
            return query.getResultList().stream().map(AyantDroitDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject chargerClientLorsModificationVnete(String venteId) throws JSONException {
        JSONObject json = new JSONObject();
        TPreenregistrement p = findById(venteId);
        List<TiersPayantParams> venteTps = findClientTiersPayents(p.getLgPREENREGISTREMENTID()).stream()
                .map(TiersPayantParams::new).collect(Collectors.toList());
        TClient cl = p.getClient();

        json.put("success", true).put("data",
                new JSONObject(new ClientDTO(cl, findTiersPayantByClientId(cl.getLgCLIENTID()), venteTps,
                        findAyantDroitByClientId(cl.getLgCLIENTID()))));
        return json;
    }

    @Override
    public JSONObject reloadVenteById(String venteId) throws JSONException {
        JSONObject json = new JSONObject();
        TPreenregistrement p = findById(venteId);
        ClientDTO o = null;
        TClient cl = p.getClient();

        List<TiersPayantParams> venteTps = Collections.emptyList();
        if (p.getStrTYPEVENTE().equals("VO")) {
            venteTps = findClientTiersPayents(p.getLgPREENREGISTREMENTID()).stream().map(TiersPayantParams::new)
                    .collect(Collectors.toList());
        }
        if (cl != null) {
            o = new ClientDTO(cl, findTiersPayantByClientId(cl.getLgCLIENTID()), venteTps,
                    findAyantDroitByClientId(cl.getLgCLIENTID()));
        }
        VenteDTO data = new VenteDTO(p, venteTps,
                (p.getAyantDroit() != null ? new AyantDroitDTO(p.getAyantDroit()) : null), o);
        if (CollectionUtils.isNotEmpty(p.getVenteReglements())) {
            data.setReglements(this.venteReglementService.buildFromEntities(p.getVenteReglements()));
        } else {
            if (StringUtils.isNotEmpty(p.getLgPARENTID())) {
                data.setReglements(
                        this.venteReglementService.buildFromEntities(findById(p.getLgPARENTID()).getVenteReglements()));
            }

        }

        json.put("success", true).put("data", new JSONObject(data));
        return json;
    }

    private TPreenregistrementCompteClient findPreenregistrementCompteClient(String id) {
        try {
            TypedQuery<TPreenregistrementCompteClient> q = this.getEntityManager().createQuery(
                    "SELECT OBJECT(o) FROM TPreenregistrementCompteClient o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1  ",
                    TPreenregistrementCompteClient.class);
            q.setParameter(1, id);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.INFO, "not found");
        }
        return null;
    }

    @Override
    public JSONObject listeVentes(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            long count = countListeVentes(params);
            if (count == 0) {
                json.put("total", count);
                json.put("data", new JSONArray());
                return json;
            }
            List<VenteDTO> datas = listVentes(params);
            json.put("total", count);
            json.put("data", new JSONArray(datas));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private boolean findpermission() {
        try {
            TParameters parameters = getEntityManager().find(TParameters.class, "KEY_EXPORT_VENTE_AS_STOCK");
            return Integer.parseInt(parameters.getStrVALUE().trim()) == 1;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public List<VenteDTO> listVentes(SalesStatsParams params) {
        boolean canexport = findpermission();
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)).distinct(true)
                    .orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));

            List<Predicate> predicates = predicatesVentes(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            List<TPreenregistrement> list = q.getResultList();
            if (params.isDepotOnly()) {
                return list.stream().map(v -> {

                    List<TPreenregistrementDetail> items = new ArrayList<>(v.getTPreenregistrementDetailCollection());
                    return new VenteDTO(v, new MagasinDTO(findEmplacementById(v.getPkBrand())), items);
                }).collect(Collectors.toList());
            }
            return list.stream().map(v -> {
                // Collection<TPreenregistrementCompteClientTiersPayent> prs =
                // v.getTPreenregistrementCompteClientTiersPayentCollection();
                List<TPreenregistrementDetail> items = new ArrayList<>(v.getTPreenregistrementDetailCollection());
                /*
                 * List<TiersPayantParams> details = new ArrayList<>(); if (CollectionUtils.isNotEmpty(prs)) { details =
                 * prs.stream() .map(TiersPayantParams::new).collect(Collectors.toList()); }
                 */
                return new VenteDTO(v, items, params.isCanCancel(), params,
                        findPreenregistrementCompteClient(v.getLgPREENREGISTREMENTID())).canexport(canexport)
                                .setModificationVenteDate(params.isModificationVenteDate());

            }).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<VenteDTO> listeVentesReport(SalesStatsParams params) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)).distinct(true)
                    .orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));
            if (params.isSansBon()) {
                predicates.add(cb.and(cb.isTrue(st.get(TPreenregistrement_.bWITHOUTBON))));
                predicates.add(cb.and(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL))));
            }
            if (params.isOnlyAvoir()) {
                predicates.add(cb.and(cb.isTrue(st.get(TPreenregistrement_.bISAVOIR))));
                predicates.add(cb.and(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL))));
            }
            Predicate btw = cb.between(cb.function("TIMESTAMP", Timestamp.class, st.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Timestamp.valueOf(LocalDateTime.parse(
                            params.getDtStart().toString() + " " + params.gethStart().toString().concat(":00"),
                            formatter)),
                    java.sql.Timestamp.valueOf(LocalDateTime.parse(
                            params.getDtEnd().toString() + " " + params.gethEnd().toString().concat(":59"),
                            formatter)));
            predicates.add(btw);
            predicates.add(cb.and(cb.equal(st.get(TPreenregistrement_.strSTATUT), Constant.STATUT_IS_CLOSED)));
            if (params.getTypeVenteId() != null && !"".equals(params.getTypeVenteId())) {
                predicates.add(cb.and(cb.equal(st.get(TPreenregistrement_.strTYPEVENTE), params.getTypeVenteId())));
            }
            if (params.getQuery() != null && !"".equals(params.getQuery())) {
                Predicate predicate = cb.and(cb.or(
                        cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                                params.getQuery() + "%"),
                        cb.like(st.get(TPreenregistrement_.strREFTICKET), params.getQuery() + "%"),
                        cb.like(st.get(TPreenregistrement_.strREF), params.getQuery() + "%"),
                        cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME),
                                params.getQuery() + "%"),
                        cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intEAN13),
                                params.getQuery() + "%")));
                predicates.add(predicate);
            }
            if (!params.isShowAll()) {
                predicates.add(cb.and(cb.equal(st.get(TPreenregistrement_.lgUSERID).get(TUser_.lgUSERID),
                        params.getUserId().getLgUSERID())));
            }
            if (!params.isShowAllActivities()) {
                TEmplacement te = params.getUserId().getLgEMPLACEMENTID();
                predicates.add(cb.and(cb.equal(
                        st.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID).get("lgEMPLACEMENTID"),
                        te.getLgEMPLACEMENTID())));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            List<TPreenregistrement> list = q.getResultList();
            return list
                    .stream().map(
                            v -> new VenteDTO()
                                    .buildAvoirs(findById(v.getLgPREENREGISTREMENTID()),
                                            findByParent(v.getLgPREENREGISTREMENTID()).stream()
                                                    .map(VenteDetailsDTO::new).collect(Collectors.toList())))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public long countListeVentes(SalesStatsParams params) {

        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)));
            List<Predicate> predicates = predicatesVentes(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public JSONObject tvasViewData(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas;
        if (StringUtils.isNotBlank(params.getRef()) && !params.getRef().equalsIgnoreCase("TOUT")) {
            datas = tvasRapportVNO(params);
        } else {
            datas = tvasRapport(params);
        }
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    private List<HMvtProduit> donneesTvas(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        try {
            TypedQuery<HMvtProduit> query = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ GROUP BY o.pkey ",
                    HMvtProduit.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private List<HMvtProduit> donneesTvas(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            String venteType) {
        try {
            TypedQuery<HMvtProduit> query = getEntityManager().createQuery(
                    "SELECT o FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ AND o.pkey IN (SELECT e.lgPREENREGISTREMENTDETAILID FROM TPreenregistrementDetail e WHERE e.lgPREENREGISTREMENTID.strTYPEVENTE=:typeVente)",
                    HMvtProduit.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            query.setParameter("typeVente", venteType);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private List<TvaDTO> donneesTvaV2(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        try {
            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(o.valeurTva,SUM(o.montantHt),SUM(o.montantTtc)) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ GROUP BY o.valeurTva",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private TvaDTO donneesTvasVO(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            String venteType) {
        try {
            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(SUM(o.prixUn*o.qteMvt)) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ AND o.pkey IN (SELECT e.lgPREENREGISTREMENTDETAILID FROM TPreenregistrementDetail e WHERE e.lgPREENREGISTREMENTID.strTYPEVENTE=:typeVente)",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("typeVente", venteType);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    @Override
    public List<TvaDTO> tvasRapportVNO(Params params) {
        List<HMvtProduit> details = donneesTvas(LocalDate.parse(params.getDtStart()),
                LocalDate.parse(params.getDtEnd()), true,
                params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), "VNO");
        List<TvaDTO> datas = new ArrayList<>();
        try {
            Map<Integer, List<HMvtProduit>> tvamap = details.stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getValeurTva));
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setTaux(k);
                LongAdder ht = new LongAdder();
                LongAdder ttc = new LongAdder();
                LongAdder tva = new LongAdder();
                v.stream().forEach(l -> {
                    Integer mttc = l.getPrixUn() * l.getQteMvt();
                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    Integer htAmont = (int) Math.ceil(mttc / valeurTva);
                    Integer montantTva = mttc - htAmont;
                    ht.add(htAmont);
                    ttc.add(mttc);
                    tva.add(montantTva);
                });
                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc.longValue());
                otva.setMontantTva(tva.longValue());
                if (k == 0) {
                    TvaDTO VO = donneesTvasVO(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()),
                            true, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), "VO");
                    if (VO != null) {
                        otva.setMontantTtc(otva.getMontantTtc() + VO.getMontantTtc());
                        otva.setMontantHt(otva.getMontantHt() + VO.getMontantTtc());
                    }
                    TvaDTO ajdust = donneesTvasRattrapage(LocalDate.parse(params.getDtStart()),
                            LocalDate.parse(params.getDtEnd()), true,
                            params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                    if (ajdust != null) {
                        otva.setMontantTtc(otva.getMontantTtc() + ajdust.getMontantTtc());
                        otva.setMontantHt(otva.getMontantHt() + ajdust.getMontantTtc());
                    }
                }
                datas.add(otva);
            });
            datas.sort(Comparator.comparing(TvaDTO::getTaux));
            return datas;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvasRapport(Params params) {
        if (caisseService.getKeyTakeIntoAccount() || caisseService.getKeyParams()) {
            return tvasRapport0(params);
        }
        List<TvaDTO> datas = new ArrayList<>();

        try {

            List<HMvtProduit> details = donneesTvas(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            Map<Integer, List<HMvtProduit>> tvamap = details.stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getValeurTva));
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setTaux(k);
                LongAdder ht = new LongAdder();
                LongAdder ttc = new LongAdder();
                LongAdder tva = new LongAdder();
                v.stream().forEach(l -> {
                    Integer mttc = l.getPrixUn() * l.getQteMvt();
                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    Integer htAmont = (int) Math.ceil(mttc / valeurTva);
                    Integer montantTva = mttc - htAmont;
                    ht.add(htAmont);
                    ttc.add(mttc);
                    tva.add(montantTva);
                });
                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc.longValue());
                otva.setMontantTva(tva.longValue());
                datas.add(otva);
            });

            return datas;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<VenteDetailsDTO> venteDetailsByVenteId(String venteId) {
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1",
                    TPreenregistrementDetail.class);
            q.setParameter(1, venteId);
            List<TPreenregistrementDetail> details = q.getResultList();
            return details.stream().map(VenteDetailsDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public TPreenregistrement findOneById(String venteId) {
        try {
            return getEntityManager().find(TPreenregistrement.class, venteId);

        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject modifiertypevente(String venteId, ClotureVenteParams params) throws JSONException {
        try {
            TPreenregistrement tp = findOneById(venteId);
            final TCompteClientTiersPayant clientTiersPayant = getEntityManager().find(TCompteClientTiersPayant.class,
                    params.getCompteTpNouveau().getCompteTp());
            List<TPreenregistrementCompteClientTiersPayent> clientTiersPayents = findClientTiersPayents(venteId);
            Optional<TPreenregistrementCompteClientTiersPayent> p = clientTiersPayents.stream()
                    .filter(t -> t.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTTIERSPAYANTID()
                            .equals(params.getCompteTp().getCompteTp()))
                    .findFirst();
            p.ifPresent(x -> {
                x.setLgCOMPTECLIENTTIERSPAYANTID(clientTiersPayant);
                x.setIntPERCENT(params.getCompteTpNouveau().getTaux());
                x.setLgUSERID(params.getUserId());
                getEntityManager().merge(x);

            });
            tp.setLgUSERID(params.getUserId());
            getEntityManager().merge(tp);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false).put("msg", "Désolé: l'opération a échoué");
        }
    }

    @Override
    public List<TiersPayantParams> venteTierspayantData(String venteId) {
        return findClientTiersPayents(venteId).stream().map(TiersPayantParams::new).collect(Collectors.toList());
    }

    @Override
    public TicketDTO getVenteById(String venteId) {
        TPreenregistrement p = findById(venteId);

        return new TicketDTO(p, findByParent(venteId).stream().map(VenteDetailsDTO::new).collect(Collectors.toList()),
                findByVente(venteId),
                (p.getStrTYPEVENTE().equals(Constant.VENTE_ASSURANCE) ? findClientTiersPayents(venteId).stream()
                        .map(TiersPayantParams::new).collect(Collectors.toList()) : Collections.emptyList()),
                (!StringUtils.isEmpty(p.getPkBrand()) ? findEmplacementById(p.getPkBrand()) : null));
    }

    @Override
    public TicketDTO getVenteById(TPreenregistrement p) {
        return new TicketDTO(p,
                findByParent(p.getLgPREENREGISTREMENTID())
                        .stream().map(VenteDetailsDTO::new).collect(Collectors.toList()),
                findByVente(p.getLgPREENREGISTREMENTID()),
                (p.getStrTYPEVENTE().equals(Constant.VENTE_ASSURANCE)
                        ? findClientTiersPayents(p.getLgPREENREGISTREMENTID()).stream().map(TiersPayantParams::new)
                                .collect(Collectors.toList())
                        : Collections.emptyList()),
                (!StringUtils.isEmpty(p.getPkBrand()) ? findEmplacementById(p.getPkBrand()) : null));
    }

    @Override
    public List<TvaDTO> tvasRapportJournalier(Params params) {
        List<TvaDTO> datas = new ArrayList<>();
        List<HMvtProduit> details;
        if (StringUtils.isNotBlank(params.getRef()) && !params.getRef().equalsIgnoreCase("TOUT")) {
            details = donneesTvas(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), params.getRef());
        } else {
            details = donneesTvas(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        }

        Map<LocalDate, List<HMvtProduit>> datemap = details.stream()
                .collect(Collectors.groupingBy(HMvtProduit::getMvtDate));
        datemap.forEach((key, values) -> {
            Map<Integer, List<HMvtProduit>> tvamap = values.stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getValeurTva));
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setLocalOperation(key);
                otva.setDateOperation(key.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                otva.setTaux(k);
                LongAdder ht = new LongAdder();
                LongAdder ttc = new LongAdder();
                LongAdder tva = new LongAdder();
                v.stream().forEach(l -> {
                    long mttc = l.getPrixUn() * l.getQteMvt();
                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    long htAmont = (long) Math.ceil(mttc / valeurTva);
                    long montantTva = mttc - htAmont;
                    ht.add(htAmont);
                    ttc.add(mttc);
                    tva.add(montantTva);
                });
                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc.longValue());
                otva.setMontantTva(tva.longValue());
                datas.add(otva);
            });
        });
        return datas;

    }

    @Override
    public JSONObject findAllVenteOrdonnancier(String medecinId, String dtStart, String dtEnd, String query, int start,
            int limit) throws JSONException {
        try {
            List<VenteDTO> l = findAllVenteOrdonnancier(medecinId, dtStart, dtEnd);
            return new JSONObject().put("total", l.size()).put("data", new JSONArray(l));
        } catch (Exception e) {
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    @Override
    public List<VenteDTO> findAllVenteOrdonnancier(String medecinId, String dtStart, String dtEnd) {
        try {

            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            cq.select(root).orderBy(cb.asc(root.get(TPreenregistrement_.dtUPDATED)));
            predicates.add(cb.isNotNull(root.get(TPreenregistrement_.medecin).get(Medecin_.id)));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            predicates.add(cb.equal(root.get(TPreenregistrement_.strSTATUT), Constant.STATUT_IS_CLOSED));

            if (!StringUtils.isEmpty(medecinId)) {
                predicates.add(cb.equal(root.get(TPreenregistrement_.medecin).get(Medecin_.id), medecinId));
            }

            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);

            List<TPreenregistrement> list = q.getResultList();
            return list.stream().map(v -> new VenteDTO().buildOrdonnanciers(v,
                    findByParent(v.getLgPREENREGISTREMENTID()).stream().filter(el -> {
                        return (el.getLgFAMILLEID().isScheduled() && !el.getLgFAMILLEID().getIntT().trim().isEmpty());
                    }).map(VenteDetailsDTO::new).collect(Collectors.toList()))).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvaRapport(Params params) {
        if (caisseService.getKeyTakeIntoAccount() || caisseService.getKeyParams()) {
            return tvasRapport0(params);
        }

        List<TvaDTO> datas = new ArrayList<>();
        List<HMvtProduit> details;
        try {
            if (StringUtils.isNoneBlank(params.getRef())) {
                details = donneesTvas(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                        params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), params.getRef());
            } else {
                details = donneesTvas(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                        params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            }

            Map<Integer, List<HMvtProduit>> tvamap = details.stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getValeurTva));
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setTaux(k);
                LongAdder ht = new LongAdder();
                LongAdder ttc = new LongAdder();
                LongAdder tva = new LongAdder();
                v.stream().forEach(l -> {
                    long mttc = l.getPrixUn() * (l.getQteMvt() - l.getUg());
                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    long htAmont = (long) Math.ceil(mttc / valeurTva);
                    long montantTva = mttc - htAmont;
                    ht.add(htAmont);
                    ttc.add(mttc);
                    tva.add(montantTva);

                });
                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc.longValue());
                otva.setMontantTva(tva.longValue());
                datas.add(otva);
            });

            return datas;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvaRapportJournalier(Params params) {
        List<TvaDTO> datas = new ArrayList<>();
        List<HMvtProduit> details;
        if (StringUtils.isNotBlank(params.getRef()) && !params.getRef().equalsIgnoreCase("TOUT")) {
            details = donneesTvas(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), params.getRef());
        } else {
            details = donneesTvas(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        }

        Map<LocalDate, List<HMvtProduit>> datemap = details.stream()
                .collect(Collectors.groupingBy(HMvtProduit::getMvtDate));
        datemap.forEach((key, values) -> {
            Map<Integer, List<HMvtProduit>> tvamap = values.stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getValeurTva));
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setLocalOperation(key);
                otva.setDateOperation(key.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                otva.setTaux(k);
                LongAdder ht = new LongAdder();
                LongAdder ttc = new LongAdder();
                LongAdder tva = new LongAdder();
                v.stream().forEach(l -> {
                    long mttc = l.getPrixUn() * (l.getQteMvt() - l.getUg());
                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    long htAmont = (long) Math.ceil(mttc / valeurTva);
                    long montantTva = mttc - htAmont;
                    ht.add(htAmont);
                    ttc.add(mttc);
                    tva.add(montantTva);
                });
                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc.longValue());
                otva.setMontantTva(tva.longValue());
                datas.add(otva);
            });
        });
        return datas;

    }

    @Override
    public JSONObject tvasData(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas = tvaRapport(params);
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    List<Predicate> articlesVendusSpecialisation(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> jp, Join<TPreenregistrementDetail, TFamille> jf,
            Join<TFamille, TFamilleStock> st, SalesStatsParams param) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String lgEmplacementId = this.sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmplacementId));
        predicates.add(cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
        predicates.add(cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
        predicates.add(cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0));
        if (!StringUtils.isEmpty(param.getProduitId())) {
            predicates.add(cb.equal(jf.get(TFamille_.lgFAMILLEID), param.getProduitId()));
        }
        if (!StringUtils.isEmpty(param.getQuery())) {
            var searchQ = param.getQuery() + "%";
            predicates.add(cb.or(cb.like(jf.get(TFamille_.strDESCRIPTION), searchQ),
                    cb.like(jf.get(TFamille_.intCIP), searchQ), cb.like(jf.get(TFamille_.intEAN13), searchQ)));
        }
        Predicate btw = cb.between(cb.function("TIMESTAMP", Timestamp.class, jp.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Timestamp.valueOf(LocalDateTime.parse(
                        param.getDtStart().toString() + " " + param.gethStart().toString().concat(":00"), formatter)),
                java.sql.Timestamp.valueOf(LocalDateTime.parse(
                        param.getDtEnd().toString() + " " + param.gethEnd().toString().concat(":59"), formatter)));
        predicates.add(btw);

        if (!StringUtils.isEmpty(param.getUser())) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                    .get(TPreenregistrement_.lgUSERCAISSIERID).get(TUser_.lgUSERID), param.getUser()));
        }
        if (!StringUtils.isEmpty(param.getRayonId()) && !"ALL".equals(param.getRayonId())) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), param.getRayonId()));
        }
        predicates.add(cb.equal(st.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmplacementId));
        if (!StringUtils.isEmpty(param.getTypeTransaction())) {
            switch (param.getTypeTransaction()) {
            case Constant.LESS:
                predicates.add(cb.lessThan(jf.get(TFamille_.intSEUILMIN), param.getNbre()));

                break;
            case Constant.EQUAL:
                predicates.add(cb.equal(jf.get(TFamille_.intSEUILMIN), param.getNbre()));

                break;
            case Constant.SEUIL:
                predicates.add(
                        cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), jf.get(TFamille_.intSEUILMIN)));

                break;
            case Constant.MORE:
                predicates.add(cb.greaterThan(jf.get(TFamille_.intSEUILMIN), param.getNbre()));

                break;
            case Constant.MOREOREQUAL:
                predicates.add(cb.greaterThanOrEqualTo(jf.get(TFamille_.intSEUILMIN), param.getNbre()));

                break;
            case Constant.LESSOREQUAL:
                predicates.add(cb.lessThanOrEqualTo(jf.get(TFamille_.intSEUILMIN), param.getNbre()));

                break;
            default:
                break;
            }
        }
        if (!StringUtils.isEmpty(param.getPrixachatFiltre())) {
            switch (param.getPrixachatFiltre()) {
            case Constant.LESS:
                predicates.add(cb.lessThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF)));

                break;
            case Constant.EQUAL:
                predicates.add(cb.equal(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF)));

                break;
            case Constant.MORE:
                predicates.add(cb.greaterThan(jf.get(TFamille_.intPRICE), jf.get(TFamille_.intPAF)));

                break;
            default:
                break;
            }
        }
        if (!StringUtils.isEmpty(param.getStockFiltre()) && param.getStock() != null) {
            switch (param.getStockFiltre()) {
            case Constant.LESS:
                predicates.add(cb.lessThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), param.getStock()));

                break;
            case Constant.EQUAL:
                predicates.add(cb.equal(st.get(TFamilleStock_.intNUMBERAVAILABLE), param.getStock()));

                break;
            case Constant.DIFF:
                predicates.add(cb.notEqual(st.get(TFamilleStock_.intNUMBERAVAILABLE), param.getStock()));

                break;
            case Constant.MORE:
                predicates.add(cb.greaterThan(st.get(TFamilleStock_.intNUMBERAVAILABLE), param.getStock()));

                break;
            case Constant.MOREOREQUAL:
                predicates.add(cb.greaterThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), param.getStock()));
                break;
            case Constant.LESSOREQUAL:
                predicates.add(cb.lessThanOrEqualTo(st.get(TFamilleStock_.intNUMBERAVAILABLE), param.getStock()));

                break;
            default:
                break;

            }
        }
        if (!StringUtils.isEmpty(param.getStockFiltre()) && param.getQteVendu() != null) {
            switch (param.getStockFiltre()) {
            case Constant.LESS:
                predicates.add(cb.lessThan(root.get(TPreenregistrementDetail_.intQUANTITY), param.getQteVendu()));

                break;
            case Constant.EQUAL:
                predicates.add(cb.equal(root.get(TPreenregistrementDetail_.intQUANTITY), param.getQteVendu()));

                break;
            case Constant.DIFF:
                predicates.add(cb.notEqual(root.get(TPreenregistrementDetail_.intQUANTITY), param.getQteVendu()));

                break;
            case Constant.MORE:
                predicates.add(cb.greaterThan(root.get(TPreenregistrementDetail_.intQUANTITY), param.getQteVendu()));

                break;
            case Constant.MOREOREQUAL:
                predicates.add(
                        cb.greaterThanOrEqualTo(root.get(TPreenregistrementDetail_.intQUANTITY), param.getQteVendu()));
                break;
            case Constant.LESSOREQUAL:
                predicates.add(
                        cb.lessThanOrEqualTo(root.get(TPreenregistrementDetail_.intQUANTITY), param.getQteVendu()));

                break;
            default:
                break;

            }
        }
        return predicates;

    }

    @Override
    public List<VenteDetailsDTO> getArticlesVendus(SalesStatsParams params) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<VenteDetailsDTO> cq = cb.createQuery(VenteDetailsDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            cq.select(cb.construct(VenteDetailsDTO.class, jf.get(TFamille_.lgFAMILLEID), jf.get(TFamille_.strNAME),
                    jf.get(TFamille_.intCIP), jp.get(TPreenregistrement_.dtUPDATED),
                    jp.get(TPreenregistrement_.lgUSERID), jp.get(TPreenregistrement_.lgUSERCAISSIERID),
                    jf.get(TFamille_.intSEUILMIN), st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    root.get(TPreenregistrementDetail_.intQUANTITY), root.get(TPreenregistrementDetail_.intAVOIR),
                    jp.get(TPreenregistrement_.strREF), jp.get(TPreenregistrement_.strTYPEVENTE),
                    jf.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID),
                    jf.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE),
                    root.get(TPreenregistrementDetail_.intPRICE), jp.get(TPreenregistrement_.strREFTICKET)))
                    .orderBy(cb.asc(jp.get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, params);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<VenteDetailsDTO> q = getEntityManager().createQuery(cq);
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

    @Override
    public JSONObject articlesVendus(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();
        long count = getArticlesVendusCount(params);
        if (count == 0) {
            json.put("total", count);
            json.put("data", new JSONArray()).put("metaData", new JSONObject().put("montantTotal", 0));
            return json;
        }
        List<VenteDetailsDTO> data = getArticlesVendus(params);
        json.put("total", count);
        json.put("data", new JSONArray(data)).put("metaData",
                new JSONObject().put("montantTotal", totalMontantArticleVendus(params)));
        return json;
    }

    private long getArticlesVendusCount(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, params);
            cq.select(cb.count(root));
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return (long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    private long totalMontantArticleVendus(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, params);
            cq.select(cb.sumAsLong(root.get(TPreenregistrementDetail_.intPRICE)));
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return (long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    @Override
    public List<VenteDetailsDTO> getArticlesVendusRecap(SalesStatsParams params) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<VenteDetailsDTO> cq = cb.createQuery(VenteDetailsDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            cq.select(cb.construct(VenteDetailsDTO.class, jf.get(TFamille_.lgFAMILLEID), jf.get(TFamille_.strNAME),
                    jf.get(TFamille_.intCIP), jp.get(TPreenregistrement_.lgUSERID),
                    jp.get(TPreenregistrement_.lgUSERCAISSIERID), st.get(TFamilleStock_.intNUMBERAVAILABLE),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intAVOIR)),
                    jf.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID),
                    jf.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intPRICE))))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID))
                    .orderBy(cb.asc(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME)));
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, params);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<VenteDetailsDTO> q = getEntityManager().createQuery(cq);
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

    private long getArticlesVendusCountRecap(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, params);
            cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgFAMILLEID)))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList().size();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

            return 0;
        }

    }

    @Override
    public JSONObject articlesVendusRecap(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();
        long count = getArticlesVendusCountRecap(params);

        if (count == 0) {
            json.put("total", count);
            json.put("data", new JSONArray()).put("metaData", new JSONObject().put("montantTotal", 0));
            return json;
        }
        List<VenteDetailsDTO> data = getArticlesVendusRecap(params);
        json.put("total", count);
        json.put("data", new JSONArray(data)).put("metaData",
                new JSONObject().put("montantTotal", totalMontantArticleVendus(params)));
        return json;
    }

    @Override
    public JSONObject articleVendusASuggerer(SalesStatsParams params, boolean isReappro) throws JSONException {
        if (isReappro) {
            return suggestionService.suggererQteReappro(articlesVendusASuggerer(params));
        }
        return suggestionService.makeSuggestion(articlesVendusASuggerer(params));
    }

    private Set<VenteDetailsDTO> articlesVendusASuggerer(SalesStatsParams params) {
        List<VenteDetailsDTO> datas;
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<VenteDetailsDTO> cq = cb.createQuery(VenteDetailsDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TFamilleStock> st = jf.joinCollection("tFamilleStockCollection", JoinType.INNER);
            cq.select(cb.construct(VenteDetailsDTO.class, jf.get(TFamille_.lgFAMILLEID),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    jf.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), jf.get(TFamille_.boolDECONDITIONNE),
                    jf.get(TFamille_.lgFAMILLEPARENTID))).groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID));
            List<Predicate> predicates = articlesVendusSpecialisation(cb, root, jp, jf, st, params);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<VenteDetailsDTO> q = getEntityManager().createQuery(cq);
            datas = q.getResultList();
            List<VenteDetailsDTO> details = new ArrayList<>();
            Iterator<VenteDetailsDTO> iterator = datas.iterator();
            while (iterator.hasNext()) {
                VenteDetailsDTO next = iterator.next();
                if (next.isDeconditionne()) {
                    details.add(next);
                    iterator.remove();

                }

            }
            Set<VenteDetailsDTO> datasFinal = datas.stream().collect(Collectors.toSet());
            Map<String, Integer> map = details.stream().collect(Collectors.groupingBy(
                    VenteDetailsDTO::getLgFAMILLEPARENTID, Collectors.summingInt(VenteDetailsDTO::getIntQUANTITY)));
            for (Map.Entry<String, Integer> entry : map.entrySet()) {
                String key = entry.getKey();
                Integer val = entry.getValue();
                TFamille famille = getById(key);
                if (famille != null) {
                    int qty = (int) Math.ceil(Double.valueOf(val) / famille.getIntNUMBERDETAIL());
                    VenteDetailsDTO d = new VenteDetailsDTO();
                    d.setLgFAMILLEID(key);
                    d.setLgPREENREGISTREMENTDETAILID(key);
                    d.setIntQUANTITY(qty);
                    d.setTypeVente(famille.getLgGROSSISTEID().getLgGROSSISTEID());
                    Set<VenteDetailsDTO> setD = new HashSet<>();
                    if (datasFinal.contains(d)) {
                        Iterator<VenteDetailsDTO> iterator1 = datasFinal.iterator();
                        while (iterator1.hasNext()) {
                            VenteDetailsDTO next = iterator1.next();
                            if (next.equals(d)) {
                                iterator1.remove();
                                next.setIntQUANTITY(next.getIntQUANTITY() + qty);
                                setD.add(next);
                            }

                        }
                    } else {
                        datasFinal.add(d);
                    }
                    datasFinal.addAll(setD);
                }
            }
            return datasFinal;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptySet();
        }
    }

    private TFamille getById(String id) {
        try {
            return getEntityManager().find(TFamille.class, id);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return null;
    }

    @Override
    public List<TPreenregistrementDetail> venteDetailByVenteId(String venteId) {
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1",
                    TPreenregistrementDetail.class);
            q.setParameter(1, venteId);
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public VenteDTO findVenteDTOById(String idVente) {
        TPreenregistrement preenregistrement = getEntityManager().find(TPreenregistrement.class, idVente);
        return new VenteDTO(preenregistrement,
                venteDetailByVenteId(idVente).stream().map(VenteDetailsDTO::new).collect(Collectors.toList()),
                new ClientDTO(preenregistrement.getClient()));
    }

    @Override
    public List<VenteDetailsDTO> annulationVentePlus(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(root).orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = predicatesVentesAnnulees(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(cq);
            return q.getResultList().stream().map(v -> new VenteDetailsDTO(v, true)).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<TPreenregistrementDetail> effectivesSales(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId) {
        try {
            TypedQuery<TPreenregistrementDetail> query = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o,TPreenregistrement p WHERE  p.lgPREENREGISTREMENTID=o.lgPREENREGISTREMENTID AND p.lgPREENREGISTREMENTID IN (SELECT o.pkey FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 )",
                    TPreenregistrementDetail.class);
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacementId);
            query.setParameter(4, checked);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    // @Override
    public List<TvaDTO> tvasRapportcc(Params params) {
        if (caisseService.getKeyTakeIntoAccount() || caisseService.getKeyParams()) {
            return tvasRapport0(params);
        }
        List<TvaDTO> datas = new ArrayList<>();

        try {
            List<TPreenregistrementDetail> details = effectivesSales(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            Map<Integer, List<TPreenregistrementDetail>> tvamap = details.stream()
                    .collect(Collectors.groupingBy(TPreenregistrementDetail::getValeurTva));
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setTaux(k);
                Double ht = 0d;
                long ttc = 0;
                Double tva = 0d;
                for (TPreenregistrementDetail op : v) {

                    double mttc = op.getIntPRICE();
                    double valeurTva = 1 + (Double.valueOf(k) / 100);
                    double htAmont = Math.ceil(mttc / valeurTva);
                    double montantTva = mttc - htAmont;
                    ht += htAmont;
                    ttc += op.getIntPRICE();
                    tva += montantTva;

                }

                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc);
                otva.setMontantTva(tva.longValue());
                datas.add(otva);
            });

            return datas;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvasDataReport(Params params) {
        if (caisseService.getKeyTakeIntoAccount() || caisseService.getKeyParams()) {
            return tvasRapport0(params);
        }
        return donneesTvaV2(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());

    }

    private TvaDTO donneesTvasRattrapage(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        try {
            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(SUM(o.prixUn*o.qteMvt)) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ AND o.pkey NOT IN (SELECT e.lgPREENREGISTREMENTDETAILID FROM TPreenregistrementDetail e )",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    @Override
    public List<TvaDTO> tvasRapport0(Params params) {
        List<TvaDTO> datas = new ArrayList<>();
        try {
            long montant = caisseService.montantAccount(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                    TypeTransaction.VENTE_COMPTANT, Constant.MODE_ESP, Constant.MVT_REGLE_VNO);

            List<HMvtProduit> details = donneesTvas(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            Map<Integer, List<HMvtProduit>> tvamap = details.stream()
                    .collect(Collectors.groupingBy(HMvtProduit::getValeurTva));
            LongAdder adder = new LongAdder();
            LongAdder ttt = new LongAdder();
            tvamap.forEach((k, v) -> {
                TvaDTO otva = new TvaDTO();
                otva.setTaux(k);
                LongAdder ht = new LongAdder();
                LongAdder ttc = new LongAdder();
                LongAdder tva = new LongAdder();
                v.stream().forEach(l -> {
                    ttt.add(l.getPrixUn() * l.getQteMvt());
                    long mttc = l.getPrixUn() * (l.getQteMvt() - l.getUg());
                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    long htAmont = (long) Math.ceil(mttc / valeurTva);
                    long montantTva = mttc - htAmont;
                    ht.add(htAmont);
                    ttc.add(mttc);
                    adder.add(mttc);
                    tva.add(montantTva);

                });

                otva.setMontantHt(ht.longValue());
                otva.setMontantTtc(ttc.longValue());
                otva.setMontantTva(tva.longValue());
                datas.add(otva);
            });

            // long mtn = adder.longValue() - montant;
            if (montant != 0) {
                ListIterator listIterator = datas.listIterator();
                while (listIterator.hasNext()) {
                    TvaDTO next = (TvaDTO) listIterator.next();
                    if (next.getTaux() == 0) {
                        TvaDTO e = new TvaDTO();
                        e.setTaux(next.getTaux());
                        e.setMontantHt(next.getMontantHt() - montant);
                        e.setMontantTtc(next.getMontantTtc() - montant);
                        e.setMontantTva(next.getMontantTva());
                        listIterator.set(e);

                    }

                }
            }

            return datas;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject tvasViewData2(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas;
        if (StringUtils.isNotBlank(params.getRef()) && !params.getRef().equalsIgnoreCase("TOUT")) {
            datas = tvasRapportVNO2(params);
        } else {
            datas = tvasRapport2(params);
        }
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public List<TvaDTO> donneesTvas2(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        try {
            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(o.valeurTva,SUM(o.prixUn*o.qteMvt)) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ GROUP BY o.valeurTva",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public List<TvaDTO> tvasRapport2(Params params) {
        if (caisseService.getKeyTakeIntoAccount() || caisseService.getKeyParams()) {
            return tvasRapport20(params);
        }

        try {
            List<TvaDTO> details = donneesTvas2(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            details.forEach(v -> {
                Double valeurTva = 1 + (Double.valueOf(v.getTaux()) / 100);
                long htAmont = (long) Math.ceil(v.getMontantTtc() / valeurTva);
                long montantTva = v.getMontantTtc() - htAmont;
                v.setMontantHt(htAmont);
                v.setMontantTva(montantTva);
            });
            details.sort(Comparator.comparing(TvaDTO::getTaux));
            return details;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvasRapport20(Params params) {
        try {
            long montant = caisseService.montantAccount(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), TypeTransaction.VENTE_COMPTANT,
                    Constant.MODE_ESP, Constant.MVT_REGLE_VNO);
            List<TvaDTO> details = donneesTvas2(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            details.forEach(v -> {
                Double valeurTva = 1 + (Double.valueOf(v.getTaux()) / 100);
                long htAmont = (long) Math.ceil(v.getMontantTtc() / valeurTva);
                long montantTva = v.getMontantTtc() - htAmont;
                v.setMontantHt(htAmont);
                v.setMontantTva(montantTva);
                if (v.getTaux() == 0) {
                    v.setMontantHt(v.getMontantHt() - montant);
                    v.setMontantTtc(v.getMontantTtc() - montant);
                }
            });
            details.sort(Comparator.comparing(TvaDTO::getTaux));
            return details;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvasRapportVNO2(Params params) {
        List<TvaDTO> details = donneesTvaV2(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()),
                true, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), "VNO");
        try {
            for (TvaDTO v : details) {
                Double valeurTva = 1 + (Double.valueOf(v.getTaux()) / 100);
                long htAmont = (long) Math.ceil(v.getMontantTtc() / valeurTva);
                long montantTva = v.getMontantTtc() - htAmont;
                v.setMontantHt(htAmont);
                v.setMontantTva(montantTva);
                if (v.getTaux() == 0) {
                    TvaDTO VO = donneesTvasVO(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()),
                            true, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), "VO");
                    if (VO != null) {
                        v.setMontantTtc(v.getMontantTtc() + VO.getMontantTtc());
                        v.setMontantHt(v.getMontantHt() + VO.getMontantTtc());
                    }
                    TvaDTO ajdust = donneesTvasRattrapage(LocalDate.parse(params.getDtStart()),
                            LocalDate.parse(params.getDtEnd()), true,
                            params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                    if (ajdust != null) {
                        v.setMontantTtc(v.getMontantTtc() + ajdust.getMontantTtc());
                        v.setMontantHt(v.getMontantHt() + ajdust.getMontantTtc());
                    }
                }
            }
            details.sort(Comparator.comparing(TvaDTO::getTaux));
            return details;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<TvaDTO> donneesTvaV2(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            String venteType) {
        try {

            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(o.valeurTva,SUM(o.qteMvt*o.prixUn)) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ AND o.pkey IN (SELECT e.lgPREENREGISTREMENTDETAILID FROM TPreenregistrementDetail e WHERE e.lgPREENREGISTREMENTID.strTYPEVENTE=:typeVente) GROUP BY o.valeurTva",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            query.setParameter("typeVente", venteType);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvaRapport2(Params params) {
        if (caisseService.getKeyTakeIntoAccount() || caisseService.getKeyParams()) {
            return tvasRapport20(params);
        }
        List<TvaDTO> datas;
        try {
            if (StringUtils.isNoneBlank(params.getRef())) {
                datas = donneesTvas2(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                        params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), params.getRef());
            } else {
                datas = donneesTvas2(LocalDate.parse(params.getDtStart()), LocalDate.parse(params.getDtEnd()), true,
                        params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            }

            datas.forEach(v -> {
                Double valeurTva = 1 + (Double.valueOf(v.getTaux()) / 100);
                long htAmont = (long) Math.ceil(v.getMontantTtc() / valeurTva);
                long montantTva = v.getMontantTtc() - htAmont;
                v.setMontantHt(htAmont);
                v.setMontantTva(montantTva);
            });
            datas.sort(Comparator.comparing(TvaDTO::getTaux));

            return datas;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<TvaDTO> donneesTvas2(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            String venteType) {
        try {
            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(o.valeurTva,SUM(o.prixUn*o.qteMvt)) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ AND o.pkey IN (SELECT e.lgPREENREGISTREMENTDETAILID FROM TPreenregistrementDetail e WHERE e.lgPREENREGISTREMENTID.strTYPEVENTE=:typeVente) GROUP BY o.valeurTva",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            query.setParameter("typeVente", venteType);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TvaDTO> tvasRapportJournalier2(Params params) {
        List<TvaDTO> datas = donneesTvaGrouperParJour(LocalDate.parse(params.getDtStart()),
                LocalDate.parse(params.getDtEnd()), true,
                params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());

        for (TvaDTO v : datas) {
            Double valeurTva = 1 + (Double.valueOf(v.getTaux()) / 100);
            long htAmont = (long) Math.ceil(v.getMontantTtc() / valeurTva);
            long montantTva = v.getMontantTtc() - htAmont;
            v.setMontantHt(htAmont);
            v.setMontantTva(montantTva);
            v.setDateOperation(v.getLocalOperation().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        }
        datas.sort(Comparator.comparing(TvaDTO::getLocalOperation));

        return datas;
    }

    private List<TvaDTO> donneesTvaGrouperParJour(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId) {
        try {
            TypedQuery<TvaDTO> query = getEntityManager().createQuery(
                    "SELECT new commonTasks.dto.TvaDTO(o.valeurTva,SUM(o.prixUn*o.qteMvt),o.mvtDate) FROM HMvtProduit o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.emplacement.lgEMPLACEMENTID=:empl AND o.checked=:checked AND o.typemvtproduit.id IN :categ GROUP BY o.valeurTva,o.mvtDate",
                    TvaDTO.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("categ", Arrays.asList(Constant.VENTE, Constant.ANNULATION_DE_VENTE));
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    List<Predicate> predicatesVentes(SalesStatsParams params, CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> st) {
        List<Predicate> predicates = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        if (params.isDepotOnly()) {
            CriteriaBuilder.In<String> types = cb
                    .in(st.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID));
            if (StringUtils.isEmpty(params.getTypeDepotId())) {
                Set.of(Constant.VENTE_DEPOT_AGREE, Constant.VENTE_DEPOT_EXTENSION).forEach(types::value);
            } else {
                Set.of(params.getTypeDepotId()).forEach(types::value);
            }

            predicates.add(types);
            if (StringUtils.isNotEmpty(params.getDepotId())) {
                predicates.add(cb.equal(st.get(TPreenregistrement_.pkBrand), params.getDepotId()));
            }
        }
        if (params.isSansBon()) {
            predicates.add(cb.and(cb.isTrue(st.get(TPreenregistrement_.bWITHOUTBON))));
            predicates.add(cb.and(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL))));
        }
        if (params.isOnlyAvoir()) {
            predicates.add(cb.and(cb.isTrue(st.get(TPreenregistrement_.bISAVOIR))));
            predicates.add(cb.and(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL))));
            predicates.add(cb.between(
                    cb.function("TIMESTAMP", Timestamp.class, st.get(TPreenregistrement_.completionDate)),
                    java.sql.Timestamp.valueOf(LocalDateTime.parse(
                            params.getDtStart().toString() + " " + params.gethStart().toString().concat(":00"),
                            formatter)),
                    java.sql.Timestamp.valueOf(LocalDateTime.parse(
                            params.getDtEnd().toString() + " " + params.gethEnd().toString().concat(":59"),
                            formatter))));

        } else {
            predicates.add(cb.between(cb.function("TIMESTAMP", Timestamp.class, st.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Timestamp.valueOf(LocalDateTime.parse(
                            params.getDtStart().toString() + " " + params.gethStart().toString().concat(":00"),
                            formatter)),
                    java.sql.Timestamp.valueOf(LocalDateTime.parse(
                            params.getDtEnd().toString() + " " + params.gethEnd().toString().concat(":59"),
                            formatter))));

        }

        predicates.add(cb.equal(st.get(TPreenregistrement_.strSTATUT), Constant.STATUT_IS_CLOSED));
        if (StringUtils.isNoneEmpty(params.getTypeVenteId())) {
            predicates.add(cb.equal(st.get(TPreenregistrement_.strTYPEVENTE), params.getTypeVenteId()));
        }
        if (StringUtils.isNoneEmpty(params.getQuery())) {
            String search = params.getQuery() + "%";
            Predicate predicate = cb
                    .and(cb.or(cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP), search),
                            cb.like(st.get(TPreenregistrement_.strREFTICKET), search),
                            cb.like(st.get(TPreenregistrement_.strREF), search),
                            cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), search),
                            cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intEAN13), search)));
            predicates.add(predicate);
        }
        if (!params.isShowAll()) {
            predicates.add(cb.equal(st.get(TPreenregistrement_.lgUSERID).get(TUser_.lgUSERID),
                    params.getUserId().getLgUSERID()));
        }
        if (!params.isShowAllActivities()) {
            TEmplacement te = params.getUserId().getLgEMPLACEMENTID();
            predicates.add(
                    cb.equal(st.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID).get("lgEMPLACEMENTID"),
                            te.getLgEMPLACEMENTID()));
        }
        if (params.isDiscountStat()) {
            predicates.add(cb.notEqual(st.get(TPreenregistrement_.intPRICEREMISE), 0));

        }
        if (StringUtils.isNoneEmpty(params.getTiersPayantId())) {
            Join<TPreenregistrement, TPreenregistrementCompteClientTiersPayent> stp = st
                    .join(TPreenregistrement_.tPreenregistrementCompteClientTiersPayentCollection, JoinType.INNER);
            predicates.add(cb.equal(
                    stp.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID),
                    params.getTiersPayantId()));
        }
        if (StringUtils.isNoneEmpty(params.getNature())) {
            predicates.add(cb.equal(st.get(TPreenregistrement_.lgNATUREVENTEID).get(TNatureVente_.lgNATUREVENTEID),
                    params.getNature()));
        }
        return predicates;
    }

    @Override
    public SummaryDTO summarySales(SalesStatsParams params) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)).distinct(true);
            List<Predicate> predicates = predicatesVentes(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TPreenregistrement> q = getEntityManager().createQuery(cq);
            return buildFromPreenregistrement(q.getResultList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new SummaryDTO();
        }

    }

    @Override
    public List<VenteDTO> venteAvecRemise(SalesStatsParams params) {
        boolean canexport = findpermission();
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)).distinct(true)
                    .orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));

            List<Predicate> predicates = predicatesVentes(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!params.isAll()) {
                q.setFirstResult(params.getStart());
                q.setMaxResults(params.getLimit());
            }
            List<TPreenregistrement> list = q.getResultList();
            return list.stream()
                    .map(v -> new VenteDTO(findById(v.getLgPREENREGISTREMENTID()),
                            findByParent(v.getLgPREENREGISTREMENTID()), params,
                            findPreenregistrementCompteClient(v.getLgPREENREGISTREMENTID())).canexport(canexport))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public long montantDepot(SalesStatsParams params) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(cb.sumAsLong(root.get(TPreenregistrementDetail_.intPRICE)));
            List<Predicate> predicates = predicatesVentes(params, cb, root, st);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {

            return 0;
        }

    }

    private SummaryDTO buildFromPreenregistrement(List<TPreenregistrement> preenregistrements) {

        long montantTTC = 0;
        long montantRemise = 0;
        for (TPreenregistrement preenregistrement : preenregistrements) {
            montantTTC += preenregistrement.getIntPRICE();
            montantRemise += preenregistrement.getIntPRICEREMISE();
        }
        SummaryDTO dTO = new SummaryDTO();
        dTO.setMontantTTC(montantTTC);
        dTO.setMontantRemise(montantRemise);
        return dTO;
    }

    @Override
    public rest.service.dto.VenteDTO getOne(String id) {
        TPreenregistrement tp = this.getEntityManager().find(TPreenregistrement.class, id);
        MvtTransaction mt = findByVente(id);
        return VenteDTOBuilder.buildVenteDTO(tp, mt);

    }

    private VenteDTO buldFromTuple(Tuple t) {
        VenteDTO v = new VenteDTO();
        v.setLgPREENREGISTREMENTID(t.get("id", String.class));
        v.setStrREF(t.get("ref", String.class));
        v.setIntPRICE(t.get("montant", Integer.class));
        v.setIntPRICEREMISE(t.get("discount", Integer.class));
        v.setStrREFTICKET(t.get("transactionNumber", String.class));
        v.setLgTYPEVENTEID(t.get("typeVenteId", String.class));
        v.setStrSTATUT(t.get("statut", String.class));
        v.setLgREMISEID(t.get("remiseId", String.class));
        v.setDtUPDATED(t.get("dateVente", String.class));
        v.setHeure(t.get("heureVente", String.class));
        v.setStrTYPEVENTE(t.get("typeVente", String.class));
        v.setUserFullName(t.get("userVendeur", String.class));
        return v;
    }

    @Override
    public JSONObject getPreVentes(SalesStatsParams params) throws JSONException {
        JSONObject json = new JSONObject();
        try {

            List<VenteDTO> data = getPreventeTuples(params).stream().map(this::buldFromTuple)
                    .collect(Collectors.toList());

            json.put("total", data.size());
            json.put("data", new JSONArray(data));

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private List<Tuple> getPreventeTuples(SalesStatsParams params) {
        try {
            Query q = this.getEntityManager().createNativeQuery(buildPreVentesQuery(params), Tuple.class);
            if ("ALL".equals(params.getStatut())) {
                q.setParameter(1, Set.of(Constant.STATUT_IS_PROGRESS, Constant.STATUT_PENDING));
            } else {
                q.setParameter(1, Set.of(params.getStatut()));
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }
    }

    private String buildPreVentesQuery(SalesStatsParams params) {

        String query = preventeSql.replace("{user_join}", "");

        if (!this.sessionHelperService.getData().isShowAllVente()) {
            query = query.concat(String.format(userClose, this.sessionHelperService.getCurrentUser().getLgUSERID()));
        }
        if (StringUtils.isNotEmpty(params.getTypeVenteId())) {
            query = query.concat(String.format(natureClose, params.getTypeVenteId()));

        }
        if (StringUtils.isNotEmpty(params.getQuery())) {
            String search = params.getQuery() + "%";
            query = query.concat(String.format(searchClose, search, search, search));

        }

        return query;
    }

    private final String preventeSql = "SELECT p.lg_PREENREGISTREMENT_ID AS id, p.str_REF AS ref,p.int_PRICE AS montant,DATE_FORMAT(p.dt_UPDATED, '%d/%m/%Y') AS dateVente,DATE_FORMAT(p.dt_UPDATED, '%H:%i:%s') AS heureVente, p.str_TYPE_VENTE AS typeVente,CONCAT(vendeur.str_FIRST_NAME,' ',vendeur.str_LAST_NAME) AS userVendeur,p.int_PRICE_REMISE AS  discount,p.remise AS remiseId,p.str_REF_TICKET AS transactionNumber,p.lg_TYPE_VENTE_ID AS typeVenteId,p.str_STATUT AS statut FROM  t_preenregistrement p JOIN t_preenregistrement_detail dd ON dd.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID JOIN t_user vendeur ON vendeur.lg_USER_ID=p.lg_USER_VENDEUR_ID {user_join} WHERE p.str_STATUT IN(?1) AND p.lg_NATURE_VENTE_ID <> '3' AND DATE(p.dt_UPDATED)=DATE(NOW()) ";
    private final String userJoin = " JOIN t_user u ON u.lg_USER_ID=p.lg_USER_ID ";
    private final String emplacementClose = " AND u.lg_EMPLACEMENT_ID='%s' ";
    private final String userClose = " AND p.lg_USER_ID='%s' ";
    private final String searchClose = " AND ((p.lg_PREENREGISTREMENT_ID  IN (SELECT d.lg_PREENREGISTREMENT_ID FROM  t_preenregistrement_detail d JOIN t_famille f ON d.lg_FAMILLE_ID=f.lg_FAMILLE_ID WHERE f.int_CIP LIKE '%s' OR f.str_NAME LIKE '%s' )) OR p.str_REF LIKE '%s' )";
    private final String natureClose = " AND p.str_TYPE_VENTE='%s' ";
}
