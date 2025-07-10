/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.ReglementCarnetDTO;
import commonTasks.dto.TiersPayantExclusDTO;
import commonTasks.dto.VenteTiersPayantsDTO;
import dal.MvtTransaction;
import dal.ReglementCarnet;
import dal.ReglementCarnet_;
import dal.TCompteClientTiersPayant_;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementCompteClientTiersPayent_;
import dal.TPreenregistrement_;
import dal.TTiersPayant;
import dal.TTiersPayant_;
import dal.TTypeMvtCaisse;
import dal.TUser;
import dal.VenteExclus;
import dal.enumeration.TypeReglementCarnet;
import dal.enumeration.TypeTiersPayant;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CarnetAsDepotService;
import rest.service.ReglementService;
import rest.service.RetourCarnetService;
import rest.service.dto.DepotProduitVendusDTO;
import rest.service.dto.ExtraitCompteClientDTO;
import rest.service.dto.ProduitVenduDTO;

import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
public class CarnetDepotServiceImpl implements CarnetAsDepotService {

    private static final Logger LOG = Logger.getLogger(CarnetDepotServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private RetourCarnetService retourCarnetService;
    @EJB
    private ReglementService reglementService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<TiersPayantExclusDTO> all(int start, int size, String query, boolean all, Boolean exclude) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TTiersPayant> cq = cb.createQuery(TTiersPayant.class);
            Root<TTiersPayant> root = cq.from(TTiersPayant.class);
            cq.select(root).orderBy(cb.asc(root.get(TTiersPayant_.strNAME)));
            List<Predicate> predicates = depotPredicatCountAll(cb, root, query, exclude);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TTiersPayant> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(size);
            }

            return q.getResultList().stream().map(TiersPayantExclusDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<Predicate> depotPredicatCountAll(CriteriaBuilder cb, Root<TTiersPayant> root, String query,
            Boolean exclude) {
        List<Predicate> predicates = new ArrayList<>();
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(TTiersPayant_.strNAME), query + "%"),
                    cb.like(root.get(TTiersPayant_.strCODEORGANISME), query + "%"),
                    cb.like(root.get(TTiersPayant_.strFULLNAME), query + "%")));
        }
        predicates.add(cb.equal(root.get(TTiersPayant_.strSTATUT), "enable"));
        if (exclude != null) {
            if (exclude) {

                predicates.add(cb.isTrue(root.get(TTiersPayant_.isDepot)));
            } else {
                predicates.add(cb.isFalse(root.get(TTiersPayant_.isDepot)));
            }

        }
        return predicates;
    }

    @Override
    public JSONObject all(int start, int size, String query, Boolean exclude) {
        long count = countAll(query, exclude);
        List<TiersPayantExclusDTO> data = all(start, size, query, false, exclude);
        return new JSONObject().put("total", count).put("data", data);

    }

    private long countAll(String query, Boolean exclude) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TTiersPayant> root = cq.from(TTiersPayant.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = depotPredicatCountAll(cb, root, query, exclude);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public void setAsDepot(GenererFactureDTO datas) {
        datas.getDatas().forEach(id -> {
            TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
            payant.setIsDepot(Boolean.TRUE);
            getEntityManager().merge(payant);
        });
    }

    @Override
    public void setAsDepot(String id) {
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
        payant.setIsDepot(Boolean.TRUE);
        getEntityManager().merge(payant);
    }

    @Override
    public void unsetAsDepot(String id) {
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
        payant.setIsDepot(Boolean.FALSE);
        getEntityManager().merge(payant);
    }

    @Override
    public void update(String id, boolean isDepot) {
        if (isDepot) {
            setAsDepot(id);
        } else {
            unsetAsDepot(id);
        }
    }

    @Override
    public void create(TPreenregistrement preenregistrement, MvtTransaction mvtTransaction, TTiersPayant payant) {
        Objects.requireNonNull(preenregistrement);
        Objects.requireNonNull(mvtTransaction);
        if (payant != null && payant.getToBeExclude()) {
            VenteExclus venteExclus = new VenteExclus();
            venteExclus.setMvtDate(LocalDate.now());
            venteExclus.setModifiedAt(LocalDateTime.now());
            venteExclus.setCreatedAt(venteExclus.getModifiedAt());
            venteExclus.setClient(preenregistrement.getClient());
            venteExclus.setTiersPayant(payant);
            venteExclus.setMontantClient(
                    preenregistrement.getIntCUSTPART() != null ? preenregistrement.getIntCUSTPART() : 0);
            venteExclus.setMontantPaye(mvtTransaction.getMontantPaye() != null ? mvtTransaction.getMontantPaye() : 0);
            venteExclus
                    .setMontantRegle(mvtTransaction.getMontantRegle() != null ? mvtTransaction.getMontantRegle() : 0);
            venteExclus.setTypeReglement(mvtTransaction.getReglement());
            venteExclus.setMontantTiersPayant(mvtTransaction.getMontantCredit());
            venteExclus.setMontantRemise(
                    preenregistrement.getIntPRICEREMISE() != null ? preenregistrement.getIntPRICEREMISE() : 0);
            venteExclus.setMontantVente(preenregistrement.getIntPRICE());
            venteExclus.setMvtTransactionKey(mvtTransaction.getUuid());
            venteExclus.setPreenregistrement(preenregistrement);
            venteExclus.setTypeTiersPayant(TypeTiersPayant.TIERS_PAYANT_EXCLUS);

            this.getEntityManager().persist(venteExclus);
        }

    }

    private long countFetchVenteByTiersPayant(String tiersPayantId, String dtStart, String dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = fetchVentePredicat(cb, root, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                    tiersPayantId);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public JSONObject fetchVenteByTiersPayant(String tiersPayantId, String dtStart, String dtEnd, int start, int size) {
        TiersPayantExclusDTO metaData = fetchVenteSummary(tiersPayantId, LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd));
        List<VenteTiersPayantsDTO> data = fetchVente(tiersPayantId, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                start, size, false);
        JSONObject json = new JSONObject();
        json.put("metaData", new JSONObject(metaData));
        json.put("total", countFetchVenteByTiersPayant(tiersPayantId, dtStart, dtEnd));
        json.put("data", new JSONArray(data));

        return json;
    }

    private List<Predicate> fetchVentePredicat(CriteriaBuilder cb, Root<TPreenregistrementCompteClientTiersPayent> root,
            LocalDate dtStart, LocalDate dtEnd, String tiersPayantId) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.isTrue(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.isDepot)));

        if (!StringUtils.isEmpty(tiersPayantId)) {
            predicates.add(cb.equal(
                    root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID),
                    tiersPayantId));
        }
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                .get(TPreenregistrement_.strSTATUT), "is_Closed"));
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                .get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUT), "is_Closed"));
        predicates.add(cb.greaterThan(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                .get(TPreenregistrement_.intPRICE), 0));
        Predicate btw = cb.between(
                cb.function("DATE", Date.class,
                        root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                                .get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        return predicates;
    }

    @Override
    public List<VenteTiersPayantsDTO> fetchVente(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, int start,
            int size, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementCompteClientTiersPayent> cq = cb
                    .createQuery(TPreenregistrementCompteClientTiersPayent.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            cq.select(root).orderBy(cb.desc(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                    .get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = fetchVentePredicat(cb, root, dtStart, dtEnd, tiersPayantId);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<TPreenregistrementCompteClientTiersPayent> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(size);
            }
            return q.getResultList().stream().map(VenteTiersPayantsDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }

    }

    @Override
    public TiersPayantExclusDTO fetchVenteSummary(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TiersPayantExclusDTO> cq = cb.createQuery(TiersPayantExclusDTO.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            cq.select(cb.construct(TiersPayantExclusDTO.class,
                    cb.sumAsLong(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICE)), cb.count(root)));
            List<Predicate> predicates = fetchVentePredicat(cb, root, dtStart, dtEnd, tiersPayantId);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<TiersPayantExclusDTO> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {

            return new TiersPayantExclusDTO();
        }
    }

    @Override
    public JSONObject reglementsCarnet(String tiersPayantId, TypeReglementCarnet typeReglementCarnet, String dtStart,
            String dtEnd, int start, int size) {
        ReglementCarnetDTO metaData = reglementsCarnetSummary(tiersPayantId, typeReglementCarnet,
                LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
        List<ReglementCarnetDTO> data = reglementsCarnet(tiersPayantId, typeReglementCarnet, dtStart, dtEnd, start,
                size, false);
        JSONObject json = new JSONObject();
        json.put("metaData", new JSONObject(metaData));
        json.put("total", reglementsCarnetCount(tiersPayantId, typeReglementCarnet, LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd)));
        json.put("data", new JSONArray(data));

        return json;
    }

    @Override
    public List<ReglementCarnetDTO> reglementsCarnet(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            String dtStart, String dtEnd, int start, int size, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ReglementCarnet> cq = cb.createQuery(ReglementCarnet.class);
            Root<ReglementCarnet> root = cq.from(ReglementCarnet.class);
            cq.select(root).orderBy(cb.desc(root.get(ReglementCarnet_.createdAt)));
            List<Predicate> predicates = reglementsCarnetPredicat(cb, root, LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), tiersPayantId, typeReglementCarnet);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<ReglementCarnet> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(size);
            }
            return q.getResultList().stream().map(ReglementCarnetDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglementsCarnet=====>> ", e);
            return Collections.emptyList();
        }
    }

    private List<Predicate> reglementsCarnetPredicat(CriteriaBuilder cb, Root<ReglementCarnet> root, LocalDate dtStart,
            LocalDate dtEnd, String tiersPayantId, TypeReglementCarnet typeReglementCarnet) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.isTrue(root.get(ReglementCarnet_.tiersPayant).get(TTiersPayant_.isDepot)));
        if (StringUtils.isNotEmpty(tiersPayantId)) {
            predicates.add(
                    cb.equal(root.get(ReglementCarnet_.tiersPayant).get(TTiersPayant_.lgTIERSPAYANTID), tiersPayantId));
        }
        if (Objects.nonNull(typeReglementCarnet)) {

            predicates.add(cb.equal(root.get(ReglementCarnet_.typeReglementCarnet), typeReglementCarnet));
        }
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(ReglementCarnet_.createdAt)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        return predicates;
    }

    private long reglementsCarnetCount(String tiersPayantId, TypeReglementCarnet typeReglementCarnet, LocalDate dtStart,
            LocalDate dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<ReglementCarnet> root = cq.from(ReglementCarnet.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = reglementsCarnetPredicat(cb, root, dtStart, dtEnd, tiersPayantId,
                    typeReglementCarnet);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public ReglementCarnetDTO reglementsCarnetSummary(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            LocalDate dtStart, LocalDate dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ReglementCarnetDTO> cq = cb.createQuery(ReglementCarnetDTO.class);
            Root<ReglementCarnet> root = cq.from(ReglementCarnet.class);
            cq.select(cb.construct(ReglementCarnetDTO.class, cb.sum(root.get(ReglementCarnet_.montantPaye)),
                    cb.count(root)));
            List<Predicate> predicates = reglementsCarnetPredicat(cb, root, dtStart, dtEnd, tiersPayantId,
                    typeReglementCarnet);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<ReglementCarnetDTO> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglementsCarnetSummary=====>> ", e);
            return new ReglementCarnetDTO();
        }
    }

    @Override
    public JSONObject faireReglement(ReglementCarnetDTO reglementCarnetDTO, TUser user) {
        JSONObject json = new JSONObject();
        if (!reglementService.checkCaisse(user)) {
            return json.put("success", false).put("msg", "Votre caisse est fermée");
        }
        TTypeMvtCaisse OTTypeMvtCaisse = getEntityManager().find(TTypeMvtCaisse.class, DateConverter.MVT_REGLE_TP);
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, reglementCarnetDTO.getTiersPayantId());
        if (payant.getAccount().intValue() < reglementCarnetDTO.getMontantPaye()) {
            return json.put("success", false).put("msg", "VEUILLEZ SAISIR UN MONTANT EGAL OU INFERIEUR AU SOLDE");
        }
        ReglementCarnet carnet = new ReglementCarnet();
        carnet.setCreatedAt(LocalDateTime.now());
        carnet.setUser(user);
        carnet.setTiersPayant(payant);
        carnet.setDescription(reglementCarnetDTO.getDescription());
        carnet.setMontantPaye(reglementCarnetDTO.getMontantPaye());
        carnet.setMontantPayer(payant.getAccount().intValue());
        carnet.setMontantRestant(carnet.getMontantPayer() - carnet.getMontantPaye());
        getEntityManager().persist(carnet);
        payant.setAccount(payant.getAccount() - carnet.getMontantPaye());
        carnet.setReference(findLastReference() + 1);
        getEntityManager().persist(carnet);
        getEntityManager().merge(payant);
        json.put("success", true);
        return json;
    }

    @Override
    public String getTiersPayantName(String tiersPayantId) {
        if (StringUtils.isNoneBlank(tiersPayantId)) {
            return getEntityManager().find(TTiersPayant.class, tiersPayantId).getStrFULLNAME();
        }
        return " ";
    }

    private int findLastReference() {
        try {
            TypedQuery<Integer> query = getEntityManager()
                    .createQuery("SELECT MAX(o.reference) FROM ReglementCarnet o ", Integer.class);
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findLastReference=====>> ", e);
            return 0;
        }
    }

    @Override
    public JSONObject listArticleByTiersPayant(String query, String tierspayantId, String dtStart, String dtEnd) {
        List<ProduitVenduDTO> datas = listeArticleByTiersPayant(query, tierspayantId, dtStart, dtEnd);
        JSONObject json = new JSONObject();
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public List<ProduitVenduDTO> listeArticleByTiersPayant(String query, String tierspayantId, String dtStart,
            String dtEnd) {
        try {
            if (StringUtils.isEmpty(query)) {
                query = "%%";
            } else {
                query = query + "%";
            }

            /*
             * Query q = getEntityManager().
             * createNativeQuery("SELECT prd.int_CIP,prd.str_NAME,prd.int_PRICE,prd.int_PAF,prd.lg_FAMILLE_ID  FROM   t_preenregistrement_detail d,t_famille prd, t_preenregistrement p,t_preenregistrement_compte_client_tiers_payent cpl,t_compte_client_tiers_payant cp,t_tiers_payant tp "
             * +
             * "WHERE d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID AND d.lg_FAMILLE_ID=prd.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID=cpl.lg_PREENREGISTREMENT_ID AND p.int_PRICE >0 AND p.b_IS_CANCEL=0 AND "
             * +
             * " cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND  cp.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND tp.lg_TIERS_PAYANT_ID=?1 AND DATE(p.dt_UPDATED) BETWEEN ?3 AND ?4 "
             * + "  AND (prd.int_CIP LIKE ?2 OR prd.str_NAME LIKE ?2) ", Tuple.class);
             */
            Query q = getEntityManager().createNativeQuery(
                    "SELECT prd.int_CIP,prd.str_NAME,prd.int_PRICE,prd.int_PAF,prd.lg_FAMILLE_ID  FROM  t_famille prd WHERE (prd.int_CIP LIKE ?1 OR prd.str_NAME LIKE ?1) AND prd.`str_STATUT`='enable' ",
                    Tuple.class);

            // q.setParameter(1, tierspayantId);
            q.setParameter(1, query);
            // q.setParameter(3, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            // q.setParameter(4, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            List<Tuple> list = q.getResultList();
            return list.stream().map(ProduitVenduDTO::new).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listeArticleByTiersPayant=====>> ", e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject articleByTiersPayantByProduitId(String produitId, String tierspayantId, String dtStart,
            String dtEnd) {
        List<ProduitVenduDTO> datas = listeArticleByTiersPayantByProduitId(produitId, tierspayantId, dtStart, dtEnd);
        JSONObject json = new JSONObject();
        json.put("total", datas.size());
        json.put("success", !datas.isEmpty());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public List<ProduitVenduDTO> listeArticleByTiersPayantByProduitId(String produitId, String tierspayantId,
            String dtStart, String dtEnd) {
        try {

            Query q = getEntityManager().createNativeQuery(
                    "SELECT prd.int_CIP,prd.str_NAME,prd.int_PRICE,prd.int_PAF,prd.lg_FAMILLE_ID  FROM   t_preenregistrement_detail d,t_famille prd, t_preenregistrement p,t_preenregistrement_compte_client_tiers_payent cpl,t_compte_client_tiers_payant cp,t_tiers_payant tp "
                            + "WHERE d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID AND d.lg_FAMILLE_ID=prd.lg_FAMILLE_ID AND p.lg_PREENREGISTREMENT_ID=cpl.lg_PREENREGISTREMENT_ID AND p.int_PRICE >0 AND p.b_IS_CANCEL=0 AND "
                            + " cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND   cp.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND tp.lg_TIERS_PAYANT_ID=?1 AND DATE(p.dt_UPDATED) BETWEEN ?3 AND ?4"
                            + "  AND prd.lg_FAMILLE_ID =?2  ",
                    Tuple.class);

            q.setParameter(1, tierspayantId);
            q.setParameter(2, produitId);
            q.setParameter(3, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(4, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            List<Tuple> list = q.getResultList();
            return list.stream().map(ProduitVenduDTO::new).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listeArticleByTiersPayantByProduitId=====>> ", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ExtraitCompteClientDTO> extraitcompteAvecRetour(String tiersPayantId, LocalDate dtStart,
            LocalDate dtEnd, String query) {
        List<ExtraitCompteClientDTO> datas = new ArrayList<>();
        datas.addAll(reglementsCarnet(tiersPayantId, null, dtStart.toString(), dtEnd.toString(), 0, 0, true).stream()
                .map(ExtraitCompteClientDTO::new).collect(Collectors.toList()));
        datas.addAll(fetchVente(tiersPayantId, dtStart, dtEnd, 0, 0, true).stream().map(ExtraitCompteClientDTO::new)
                .collect(Collectors.toList()));
        datas.addAll(retourCarnetService.listRetourByTierspayantIdAndPeriode(tiersPayantId, query, dtStart, dtEnd)
                .stream().map(ExtraitCompteClientDTO::new).collect(Collectors.toList()));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getCreatedAt));
        return datas;
    }

    @Override
    public void setToExcludeOrNot(String id, boolean isDepot) {
        if (isDepot) {
            setAsExclude(id);
        } else {
            unsetAsExclude(id);
        }
    }

    private void setAsExclude(String id) {
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
        payant.setToBeExclude(Boolean.TRUE);
        getEntityManager().merge(payant);
    }

    private void unsetAsExclude(String id) {
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
        payant.setToBeExclude(Boolean.FALSE);
        getEntityManager().merge(payant);
    }

    @Override
    public void updateOldData() {
        TParameters parameters = findOldDataParameter();
        if (parameters != null) {
            boolean siAlReadyUpdated = Boolean.parseBoolean(parameters.getStrVALUE());
            if (!siAlReadyUpdated) {
                getOldDataToExlude().forEach((t) -> {
                    TPreenregistrement preenregistrement = t.getLgPREENREGISTREMENTID();
                    TTiersPayant payant = t.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID();
                    updateOldData(preenregistrement, findByVenteId(preenregistrement.getLgPREENREGISTREMENTID()),
                            payant);
                    findByTiersPayantId(payant.getLgTIERSPAYANTID()).forEach((reglementCarnet) -> {
                        reglementCarnet.setTypeTiersPayant(TypeTiersPayant.TIERS_PAYANT_EXCLUS);
                        this.getEntityManager().merge(reglementCarnet);
                    });
                });
                getOldDepot().forEach((t) -> {
                    TPreenregistrement preenregistrement = t.getLgPREENREGISTREMENTID();
                    TTiersPayant payant = t.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID();
                    updateOldData(preenregistrement, findByVenteId(preenregistrement.getLgPREENREGISTREMENTID()),
                            payant);
                    findByTiersPayantId(payant.getLgTIERSPAYANTID()).forEach((reglementCarnet) -> {
                        reglementCarnet.setTypeTiersPayant(TypeTiersPayant.CARNET_AS_DEPOT);
                        this.getEntityManager().merge(reglementCarnet);
                    });
                });
                parameters.setStrVALUE(Boolean.TRUE.toString());
                this.getEntityManager().merge(parameters);
            }
        }

    }

    private List<TPreenregistrementCompteClientTiersPayent> getOldDataToExlude() {
        try {
            return this.getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o  WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.toBeExclude =TRUE AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE>0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed'  ",
                    TPreenregistrementCompteClientTiersPayent.class).getResultList();
        } catch (Exception e) {

            return new ArrayList<>();
        }
    }

    private List<TPreenregistrementCompteClientTiersPayent> getOldDepot() {
        try {
            return this.getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o  WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.isDepot=TRUE AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE>0 AND o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' ",
                    TPreenregistrementCompteClientTiersPayent.class).getResultList();
        } catch (Exception e) {

            return new ArrayList<>();
        }
    }

    private MvtTransaction findByVenteId(String venetId) {
        try {

            TypedQuery<MvtTransaction> q = this.getEntityManager()
                    .createQuery("SELECT o FROM MvtTransaction o  WHERE o.pkey=?1", MvtTransaction.class);
            q.setParameter(1, venetId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {

            return null;
        }
    }

    private List<ReglementCarnet> findByTiersPayantId(String tpId) {
        try {
            return this.getEntityManager()
                    .createQuery("SELECT o FROM ReglementCarnet o  WHERE o.tiersPayant.lgTIERSPAYANTID=?1",
                            ReglementCarnet.class)
                    .setParameter(1, tpId).getResultList();
        } catch (Exception e) {

            return new ArrayList<>();
        }
    }

    private TParameters findOldDataParameter() {
        try {
            return this.getEntityManager().find(TParameters.class, "OLD_DATA_CARNET_DEPOT");
        } catch (Exception e) {
            return null;
        }
    }

    private void updateOldData(TPreenregistrement preenregistrement, MvtTransaction mvtTransaction,
            TTiersPayant payant) {
        if (payant.getToBeExclude()) {
            VenteExclus venteExclus = new VenteExclus();
            venteExclus.setMvtDate(DateConverter.convertDateToLocalDate(preenregistrement.getDtUPDATED()));
            venteExclus.setModifiedAt(DateConverter.convertDateToLocalDateTime(preenregistrement.getDtUPDATED()));
            venteExclus.setCreatedAt(DateConverter.convertDateToLocalDateTime(preenregistrement.getDtCREATED()));
            venteExclus.setClient(preenregistrement.getClient());
            venteExclus.setTiersPayant(payant);
            venteExclus.setMontantClient(
                    preenregistrement.getIntCUSTPART() != null ? preenregistrement.getIntCUSTPART() : 0);
            venteExclus.setMontantPaye(mvtTransaction.getMontantPaye() != null ? mvtTransaction.getMontantPaye() : 0);
            venteExclus
                    .setMontantRegle(mvtTransaction.getMontantRegle() != null ? mvtTransaction.getMontantRegle() : 0);
            venteExclus.setTypeReglement(mvtTransaction.getReglement());
            venteExclus.setMontantTiersPayant(mvtTransaction.getMontantCredit());
            venteExclus.setMontantRemise(
                    preenregistrement.getIntPRICEREMISE() != null ? preenregistrement.getIntPRICEREMISE() : 0);
            venteExclus.setMontantVente(preenregistrement.getIntPRICE());
            venteExclus.setMvtTransactionKey(mvtTransaction.getUuid());
            venteExclus.setPreenregistrement(preenregistrement);
            venteExclus.setTypeTiersPayant(TypeTiersPayant.TIERS_PAYANT_EXCLUS);
            this.getEntityManager().persist(venteExclus);
        }

    }

    private String closeWhereTp(String tiersPayantId) {

        if (StringUtils.isNotEmpty(tiersPayantId)) {
            return " AND  p.lg_TIERS_PAYANT_ID = ?3 ";
        }
        return "";
    }

    private String closeWhereSearch(String query, String tiersPayantId) {

        if (StringUtils.isNotEmpty(query) && StringUtils.isNotEmpty(tiersPayantId)) {
            return " AND (  f.str_NAME LIKE ?4 OR f.int_CIP LIKE ?4  OR p.str_FULLNAME LIKE ?4) ";
        } else if (StringUtils.isNotEmpty(query)) {
            return " AND (  f.str_NAME LIKE ?3 OR f.int_CIP LIKE ?3  OR p.str_FULLNAME LIKE ?3) ";
        }
        return "";
    }

    private void updateQueryParam(Query q, String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, String query) {
        q.setParameter(1, dtStart);
        q.setParameter(2, dtEnd);
        if (StringUtils.isNotEmpty(tiersPayantId)) {
            q.setParameter(3, tiersPayantId);
        }
        if (StringUtils.isNotEmpty(query) && StringUtils.isNotEmpty(tiersPayantId)) {
            q.setParameter(4, query + "%");
        }
        if (StringUtils.isNotEmpty(query) && StringUtils.isEmpty(tiersPayantId)) {
            q.setParameter(3, query + "%");
        }
    }

    @Override
    public List<DepotProduitVendusDTO> produitVenduParDepot(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd,
            String query, int start, int size, boolean all) {
        String sqlQuery = "SELECT SUM(d.int_QUANTITY) AS quantite,SUM(d.int_PRICE) AS montantVente,SUM(d.int_QUANTITY*f.int_PAF) AS montantAchat,  f.int_PAF AS prixAchat,f.int_PRICE AS prixUni ,f.int_CIP AS codeCip,f.str_NAME AS produitName ,f.lg_FAMILLE_ID AS produitId,f.int_EAN13 AS codeEan FROM  t_preenregistrement_detail d ,t_famille f, t_preenregistrement v,t_preenregistrement_compte_client_tiers_payent cpl,t_compte_client_tiers_payant cp,t_tiers_payant p WHERE d.lg_PREENREGISTREMENT_ID=v.lg_PREENREGISTREMENT_ID AND d.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND v.str_STATUT ='is_Closed' AND v.lg_PREENREGISTREMENT_ID=cpl.lg_PREENREGISTREMENT_ID AND cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND p.lg_TIERS_PAYANT_ID=cp.lg_TIERS_PAYANT_ID AND DATE( v.dt_UPDATED) BETWEEN ?1 AND ?2 AND p.is_depot=1 ";
        sqlQuery += closeWhereTp(tiersPayantId);
        sqlQuery += closeWhereSearch(query, tiersPayantId);
        sqlQuery += "  GROUP BY f.lg_FAMILLE_ID";

        try {
            Query q = getEntityManager().createNativeQuery(sqlQuery, Tuple.class);
            updateQueryParam(q, tiersPayantId, dtStart, dtEnd, query);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(size);
            }
            List<Tuple> list = q.getResultList();
            return list.stream()
                    .map(t -> DepotProduitVendusDTO.builder().codeCip(t.get("codeCip", String.class))
                            .produitName(t.get("produitName", String.class)).produitId(t.get("produitId", String.class))
                            .prixAchat(t.get("prixAchat", Integer.class)).prixUni(t.get("prixUni", Integer.class))
                            .montantAchat(t.get("montantAchat", BigDecimal.class).longValue())
                            .montantVente(t.get("montantVente", BigDecimal.class).longValue())
                            .quantite(t.get("quantite", BigDecimal.class).longValue()).build())
                    .sorted(Comparator.comparing(DepotProduitVendusDTO::getCodeCip)).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return new ArrayList<>();
    }

    @Override
    public JSONObject produitVenduParDepot(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, String query,
            int start, int size) {
        JSONObject json = new JSONObject();
        List<DepotProduitVendusDTO> data = produitVenduParDepot(tiersPayantId, dtStart, dtEnd, query, start, size,
                false);
        DepotProduitVendusDTO metaData = produitVenduParDepotSummary(tiersPayantId, dtStart, dtEnd, query);
        json.put("metaData", new JSONObject(metaData));
        json.put("total", produitVenduParDepotCount(tiersPayantId, dtStart, dtEnd, query));
        json.put("data", new JSONArray(data));
        return json;
    }

    private int produitVenduParDepotCount(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, String query) {
        String sqlQuery = "SELECT COUNT(d.lg_FAMILLE_ID) AS produitId FROM  t_preenregistrement_detail d ,t_famille f, t_preenregistrement v,t_preenregistrement_compte_client_tiers_payent cpl,t_compte_client_tiers_payant cp,t_tiers_payant p WHERE d.lg_PREENREGISTREMENT_ID=v.lg_PREENREGISTREMENT_ID AND d.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND v.str_STATUT ='is_Closed' AND v.lg_PREENREGISTREMENT_ID=cpl.lg_PREENREGISTREMENT_ID AND cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND p.lg_TIERS_PAYANT_ID=cp.lg_TIERS_PAYANT_ID AND DATE( v.dt_UPDATED) BETWEEN ?1 AND ?2 AND p.is_depot=1 ";
        sqlQuery += closeWhereTp(tiersPayantId);
        sqlQuery += closeWhereSearch(query, tiersPayantId);
        sqlQuery += "  GROUP BY f.lg_FAMILLE_ID";

        try {
            Query q = getEntityManager().createNativeQuery(sqlQuery, Tuple.class);
            updateQueryParam(q, tiersPayantId, dtStart, dtEnd, query);

            return q.getResultList().size();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return 0;
    }

    @Override
    public DepotProduitVendusDTO produitVenduParDepotSummary(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd,
            String query) {
        String sqlQuery = "SELECT SUM(d.int_PRICE) AS montantVente,SUM(d.int_QUANTITY*f.int_PAF) AS montantAchat FROM  t_preenregistrement_detail d ,t_famille f, t_preenregistrement v,t_preenregistrement_compte_client_tiers_payent cpl,t_compte_client_tiers_payant cp,t_tiers_payant p WHERE d.lg_PREENREGISTREMENT_ID=v.lg_PREENREGISTREMENT_ID AND d.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND v.str_STATUT ='is_Closed' AND v.lg_PREENREGISTREMENT_ID=cpl.lg_PREENREGISTREMENT_ID AND cpl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND p.lg_TIERS_PAYANT_ID=cp.lg_TIERS_PAYANT_ID AND DATE( v.dt_UPDATED)BETWEEN ?1 AND ?2 AND p.is_depot=1 ";
        sqlQuery += closeWhereTp(tiersPayantId);
        sqlQuery += closeWhereSearch(query, tiersPayantId);

        try {
            Query q = getEntityManager().createNativeQuery(sqlQuery, Tuple.class);
            updateQueryParam(q, tiersPayantId, dtStart, dtEnd, query);

            Tuple summary = (Tuple) q.getSingleResult();
            return DepotProduitVendusDTO.builder()
                    .montantAchat(summary.get("montantAchat", BigDecimal.class).longValue())
                    .montantVente(summary.get("montantVente", BigDecimal.class).longValue()).build();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return DepotProduitVendusDTO.builder().build();
    }

    @Override
    public List<ExtraitCompteClientDTO> extraitcompte(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            LocalDate dtStart, LocalDate dtEnd) {
        List<ExtraitCompteClientDTO> datas = new ArrayList<>();
        datas.addAll(
                reglementsCarnet(tiersPayantId, typeReglementCarnet, dtStart.toString(), dtEnd.toString(), 0, 0, true)
                        .stream().map(ExtraitCompteClientDTO::new).collect(Collectors.toList()));
        datas.addAll(fetchVente(tiersPayantId, dtStart, dtEnd, 0, 0, true).stream().map(ExtraitCompteClientDTO::new)
                .collect(Collectors.toList()));
        datas.sort(Comparator.comparing(ExtraitCompteClientDTO::getCreatedAt));
        return datas;
    }
}
