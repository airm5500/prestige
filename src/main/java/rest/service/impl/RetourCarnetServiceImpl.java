/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.MotifRetourCarnet;
import dal.RetourCarnet;
import dal.RetourCarnetDetail;
import dal.RetourCarnetDetail_;
import dal.RetourCarnet_;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamille_;
import dal.TTiersPayant;
import dal.TTiersPayant_;
import dal.TUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MouvementProduitService;
import rest.service.RetourCarnetService;
import rest.service.TiersPayantExclusService;
import rest.service.dto.RetourCarnetDTO;
import rest.service.dto.RetourCarnetDetailDTO;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
public class RetourCarnetServiceImpl implements RetourCarnetService {

    private static final Logger LOG = Logger.getLogger(RetourCarnetServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private MouvementProduitService mouvementProduitService;
    @EJB
    private TiersPayantExclusService tiersPayantExclusService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public RetourCarnet createRetourCarnet(RetourCarnetDTO retourCarnetDTO, int qty, Integer motifId, String produitId)
            throws Exception {
        RetourCarnet retourCarnet = new RetourCarnet();
        retourCarnet.setCreatedAt(LocalDateTime.now());
        retourCarnet.setLibelle(retourCarnetDTO.getLibelle());
        retourCarnet.setStatus("enable");
        retourCarnet.setUser(retourCarnetDTO.getOperateur());
        retourCarnet.setTierspayant(getOne(retourCarnetDTO.getTierspayantId()));
        getEntityManager().persist(retourCarnet);
        addDetailRetour(qty, produitId, motifId, retourCarnet);
        return retourCarnet;
    }

    @Override
    public void updateRetourCarnet(Integer id, String libelle) {
        RetourCarnet retourCarnet = getEntityManager().find(RetourCarnet.class, id);
        retourCarnet.setStatus("completed");
        retourCarnet.setLibelle(libelle);
        LongAdder montantRetour = new LongAdder();
        listItemByRetourCarnet(retourCarnet.getId()).forEach(e -> {
            montantRetour.add(e.getQtyRetour() * e.getPrixUni());
            updateStock(e.getQtyRetour(), e.getStockInit(), e.getProduit().getLgFAMILLEID(), e.getId().toString(),
                    retourCarnet.getUser());
        });
        tiersPayantExclusService.updateTiersPayantAccount(retourCarnet.getTierspayant(),
                montantRetour.intValue() * (-1));
        getEntityManager().merge(retourCarnet);
    }

    private void updateStock(int qtyMvt, int qtyDebut, String produitId, String pkey, TUser user) {
        getOptionalFamilleStock(produitId).ifPresent(e -> {
            e.setIntNUMBERAVAILABLE(e.getIntNUMBERAVAILABLE() + qtyMvt);
            e.setIntNUMBER(e.getIntNUMBERAVAILABLE());
            e.setDtUPDATED(new Date());
            getEntityManager().merge(e);
            mouvementProduitService.saveMvtProduit(pkey, DateConverter.TMVTP_RETOUR_DEPOT, e.getLgFAMILLEID(), user,
                    getEmplacement("1"), qtyMvt, qtyDebut, e.getIntNUMBERAVAILABLE(), 0);
        });
    }

    private TEmplacement getEmplacement(String id) {
        return getEntityManager().find(TEmplacement.class, id);
    }

    private void addDetailRetour(int qty, String produitId, Integer motifId, RetourCarnet retourCarnet)
            throws Exception {
        RetourCarnetDetail retourCarnetDetail = new RetourCarnetDetail();
        retourCarnetDetail.setCreatedAt(LocalDateTime.now());
        retourCarnetDetail.setQtyRetour(qty);
        retourCarnetDetail.setRetourCarnet(retourCarnet);
        TFamille famille = getFamille(produitId);
        retourCarnetDetail.setPrixUni(famille.getIntPRICE());
        retourCarnetDetail.setProduit(famille);
        TFamilleStock familleStock = getFamilleStock(produitId);
        retourCarnetDetail.setStockInit(familleStock.getIntNUMBERAVAILABLE());
        retourCarnetDetail.setStockFinal(familleStock.getIntNUMBERAVAILABLE() - qty);
        retourCarnetDetail.setMotifRetourCarnet(getMotifRetourCarnet(motifId));
        getEntityManager().persist(retourCarnetDetail);

    }

    @Override
    public Integer addDetailRetour(int qty, String produitId, Integer motifId, Integer idRetour) throws Exception {
        Optional<RetourCarnetDetail> optional = getOneItemByProduitId(produitId, idRetour);
        if (optional.isPresent()) {
            RetourCarnetDetail e = optional.get();
            e.setQtyRetour(e.getQtyRetour() + qty);
            getEntityManager().merge(e);
        } else {
            addDetailRetour(qty, produitId, motifId, getEntityManager().find(RetourCarnet.class, idRetour));

        }

        return idRetour;
    }

    @Override
    public Integer updateDetailRetour(int qty, Integer id) throws Exception {
        RetourCarnetDetail retourCarnetDetail = getEntityManager().find(RetourCarnetDetail.class, id);
        retourCarnetDetail.setQtyRetour(qty);
        getEntityManager().merge(retourCarnetDetail);
        return retourCarnetDetail.getRetourCarnet().getId();
    }

    @Override
    public void removeDetailRetour(Integer id) {
        RetourCarnetDetail retourCarnetDetail = getEntityManager().find(RetourCarnetDetail.class, id);
        getEntityManager().remove(retourCarnetDetail);
    }

    private TTiersPayant getOne(String id) {
        return getEntityManager().find(TTiersPayant.class, id);
    }

    private TFamille getFamille(String id) {
        return getEntityManager().find(TFamille.class, id);
    }

    private Optional<RetourCarnetDetail> getOneItemByProduitId(String produitId, Integer idRetour) {
        try {
            TypedQuery<RetourCarnetDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM RetourCarnetDetail o WHERE o.produit.lgFAMILLEID=?1 AND o.retourCarnet.id=?2",
                    RetourCarnetDetail.class);
            q.setParameter(1, produitId);
            q.setParameter(2, idRetour);
            return Optional.ofNullable(q.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private TFamilleStock getFamilleStock(String produitId) {
        try {
            TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID  =?2",
                    TFamilleStock.class);
            q.setParameter(1, produitId);
            q.setParameter(2, "1");
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private MotifRetourCarnet getMotifRetourCarnet(Integer id) {
        return getEntityManager().find(MotifRetourCarnet.class, id);
    }

    private List<RetourCarnetDetail> listItemByRetourCarnet(Integer idRetour) {
        try {
            TypedQuery<RetourCarnetDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM RetourCarnetDetail o WHERE  o.retourCarnet.id=?1", RetourCarnetDetail.class);
            q.setParameter(1, idRetour);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private Optional<TFamilleStock> getOptionalFamilleStock(String produitId) {
        try {
            TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID  =?2",
                    TFamilleStock.class);
            q.setParameter(1, produitId);
            q.setParameter(2, "1");
            q.setMaxResults(1);
            return Optional.ofNullable(q.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private List<Predicate> listRetourByTierspayantIdAndPeriodePredicates(CriteriaBuilder cb,
            Root<RetourCarnetDetail> root, String idTierspayant, String query, LocalDate dtStart, LocalDate dtEnd) {
        List<Predicate> predicates = new ArrayList<>();
        if (!StringUtils.isEmpty(idTierspayant)) {
            predicates.add(cb.equal(root.get(RetourCarnetDetail_.retourCarnet).get(RetourCarnet_.tierspayant)
                    .get(TTiersPayant_.lgTIERSPAYANTID), idTierspayant));
        }
        predicates.add(cb.equal(root.get(RetourCarnetDetail_.retourCarnet).get(RetourCarnet_.status), "completed"));
        predicates.add(cb.between(
                cb.function("DATE", Date.class,
                        root.get(RetourCarnetDetail_.retourCarnet).get(RetourCarnet_.createdAt)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd)));

        if (StringUtils.isNotEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(RetourCarnetDetail_.produit).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(RetourCarnetDetail_.produit).get(TFamille_.strNAME), query + "%"),
                    cb.like(root.get(RetourCarnetDetail_.produit).get(TFamille_.intEAN13), query + "%")));
        }
        return predicates;
    }

    @Override
    public List<RetourCarnetDetailDTO> findByRetourCarnetId(Integer retourCarnetId, String query) {

        if (StringUtils.isEmpty(query)) {
            TypedQuery<RetourCarnetDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM RetourCarnetDetail o WHERE o.retourCarnet.id =?1  ", RetourCarnetDetail.class);
            q.setParameter(1, retourCarnetId);
            return q.getResultList().stream().map(RetourCarnetDetailDTO::new).collect(Collectors.toList());
        } else {
            TypedQuery<RetourCarnetDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM RetourCarnetDetail o WHERE o.retourCarnet.id =?1 AND (o.produit.intCIP LIKE ?2 OR o.produit.strNAME LIKE ?2 )   ",
                    RetourCarnetDetail.class);
            q.setParameter(1, retourCarnetId);
            q.setParameter(2, query + "%");
            return q.getResultList().stream().map(RetourCarnetDetailDTO::new).collect(Collectors.toList());
        }

    }

    @Override
    public List<RetourCarnetDTO> listRetourByTierspayantIdAndPeriode(String idTierspayant, String query,
            LocalDate dtStart, LocalDate dtEnd, int start, int limit, boolean all) {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<RetourCarnet> cq = cb.createQuery(RetourCarnet.class);
        Root<RetourCarnetDetail> root = cq.from(RetourCarnetDetail.class);
        cq.select(root.get(RetourCarnetDetail_.retourCarnet)).distinct(true)
                .orderBy(cb.desc(root.get(RetourCarnetDetail_.retourCarnet).get(RetourCarnet_.createdAt)));
        List<Predicate> predicates = listRetourByTierspayantIdAndPeriodePredicates(cb, root, idTierspayant, query,
                dtStart, dtEnd);
        cq.where(cb.and(predicates.toArray(new Predicate[0])));
        TypedQuery<RetourCarnet> q = getEntityManager().createQuery(cq);
        if (!all) {
            q.setFirstResult(start);
            q.setMaxResults(limit);
        }
        return q.getResultList().stream().map(e -> new RetourCarnetDTO(e, findByRetourCarnetId(e.getId(), null)))
                .collect(Collectors.toList());
    }

    private long countRetourByTierspayantIdAndPeriode(String idTierspayant, LocalDate dtStart, LocalDate dtEnd,
            String query) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<RetourCarnetDetail> root = cq.from(RetourCarnetDetail.class);
            cq.select(cb.count(root.get(RetourCarnetDetail_.retourCarnet))).distinct(true);
            List<Predicate> predicates = listRetourByTierspayantIdAndPeriodePredicates(cb, root, idTierspayant, query,
                    dtStart, dtEnd);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "countRetourByTierspayantIdAndPeriode=====>> ", e);
            return 0;
        }
    }

    @Override
    public RetourCarnetDetailDTO retourCarnetSummary(String idTierspayant, LocalDate dtStart, LocalDate dtEnd,
            String query) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<RetourCarnetDetailDTO> cq = cb.createQuery(RetourCarnetDetailDTO.class);
            Root<RetourCarnetDetail> root = cq.from(RetourCarnetDetail.class);
            cq.select(cb.construct(RetourCarnetDetailDTO.class, cb.sum(root.get(RetourCarnetDetail_.qtyRetour)),
                    cb.sum(cb.prod(root.get(RetourCarnetDetail_.qtyRetour), root.get(RetourCarnetDetail_.prixUni)))));
            List<Predicate> predicates = listRetourByTierspayantIdAndPeriodePredicates(cb, root, idTierspayant, query,
                    dtStart, dtEnd);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<RetourCarnetDetailDTO> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglementsCarnetSummary=====>> ", e);
            return new RetourCarnetDetailDTO();
        }
    }

    @Override
    public JSONObject listRetourByTierspayantIdAndPeriode(String idTierspayant, String query, LocalDate dtStart,
            LocalDate dtEnd, int start, int limit) throws JSONException {
        RetourCarnetDetailDTO metaData = retourCarnetSummary(idTierspayant, dtStart, dtEnd, query);
        List<RetourCarnetDTO> data = listRetourByTierspayantIdAndPeriode(idTierspayant, query, dtStart, dtEnd, start,
                limit, false);
        JSONObject json = new JSONObject();
        json.put("metaData", new JSONObject(metaData));
        json.put("total", countRetourByTierspayantIdAndPeriode(idTierspayant, dtStart, dtEnd, query));
        json.put("data", new JSONArray(data));
        return json;
    }

    @Override
    public JSONObject findByRetourCarnetId(Integer retourCarnetId, String query, int start, int limit) {
        List<RetourCarnetDetailDTO> datas = findByRetourCarnetId(retourCarnetId, query);
        JSONObject json = new JSONObject();
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public List<RetourCarnetDTO> listRetourByTierspayantIdAndPeriode(String idTierspayant, String query,
            LocalDate dtStart, LocalDate dtEnd) {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<RetourCarnet> cq = cb.createQuery(RetourCarnet.class);
        Root<RetourCarnetDetail> root = cq.from(RetourCarnetDetail.class);
        cq.select(root.get(RetourCarnetDetail_.retourCarnet)).distinct(true)
                .orderBy(cb.desc(root.get(RetourCarnetDetail_.retourCarnet).get(RetourCarnet_.createdAt)));
        List<Predicate> predicates = listRetourByTierspayantIdAndPeriodePredicates(cb, root, idTierspayant, query,
                dtStart, dtEnd);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<RetourCarnet> q = getEntityManager().createQuery(cq);
        return q.getResultList().stream()
                .map(e -> new RetourCarnetDTO(e, findByRetourCarnetId(e.getId(), null).stream()
                        .mapToLong(RetourCarnetDetailDTO::getAmount).reduce(0, Long::sum)))
                .collect(Collectors.toList());
    }

    @Override
    public List<RetourCarnetDTO> fetchRetourByTierspayantIdAndPeriode(String idTierspayant, String query,
            LocalDate dtStart, LocalDate dtEnd) {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<RetourCarnet> cq = cb.createQuery(RetourCarnet.class);
        Root<RetourCarnetDetail> root = cq.from(RetourCarnetDetail.class);
        cq.select(root.get(RetourCarnetDetail_.retourCarnet)).distinct(true)
                .orderBy(cb.desc(root.get(RetourCarnetDetail_.retourCarnet).get(RetourCarnet_.createdAt)));
        List<Predicate> predicates = listRetourByTierspayantIdAndPeriodePredicates(cb, root, idTierspayant, query,
                dtStart, dtEnd);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<RetourCarnet> q = getEntityManager().createQuery(cq);

        return q.getResultList().stream().sorted(comparatorTiersPayant.thenComparing(comparatorDate))
                .map(e -> RetourCarnetDTO.buildRetourCarnetDTO(e, findByRetourCarnetId(e.getId(), null)))
                .collect(Collectors.toList());
    }

    private final Comparator<RetourCarnet> comparatorTiersPayant = (RetourCarnet e1, RetourCarnet e2) -> {
        return e1.getTierspayant().getStrNAME().compareTo(e2.getTierspayant().getStrNAME());
    };
    private final Comparator<RetourCarnet> comparatorDate = Comparator.comparing(RetourCarnet::getCreatedAt);
}
