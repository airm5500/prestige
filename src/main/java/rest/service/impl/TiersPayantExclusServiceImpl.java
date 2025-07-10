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
import dal.ReglementCarnet;
import dal.ReglementCarnet_;
import dal.TTiersPayant;
import dal.TTiersPayant_;
import dal.TUser;
import dal.VenteExclus;
import dal.VenteExclus_;
import dal.enumeration.Statut;
import dal.enumeration.TypeReglementCarnet;
import dal.enumeration.TypeTiersPayant;
import java.time.LocalDate;
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
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ReglementService;
import rest.service.TiersPayantExclusService;
import rest.service.dto.ExtraitCompteClientDTO;
import rest.service.dto.VenteExclusDTO;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
public class TiersPayantExclusServiceImpl implements TiersPayantExclusService {

    private static final Logger LOG = Logger.getLogger(TiersPayantExclusServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ReglementService reglementService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<TiersPayantExclusDTO> all(int start, int size, String query, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TTiersPayant> cq = cb.createQuery(TTiersPayant.class);
            Root<VenteExclus> root = cq.from(VenteExclus.class);
            cq.select(root.get(VenteExclus_.tiersPayant))
                    .orderBy(cb.asc(root.get(VenteExclus_.tiersPayant).get(TTiersPayant_.strNAME))).distinct(true);
            List<Predicate> predicates = perimePredicatCountAll(cb, root, query);
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

    private List<Predicate> perimePredicatCountAll(CriteriaBuilder cb, Root<VenteExclus> root, String query) {
        List<Predicate> predicates = new ArrayList<>();
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(VenteExclus_.tiersPayant).get(TTiersPayant_.strNAME), query + "%"),
                    cb.like(root.get(VenteExclus_.tiersPayant).get(TTiersPayant_.strCODEORGANISME), query + "%"),
                    cb.like(root.get(VenteExclus_.tiersPayant).get(TTiersPayant_.strFULLNAME), query + "%")));
        }
        predicates.add(cb.equal(root.get(VenteExclus_.status), Statut.IS_CLOSE));
        predicates.add(cb.equal(root.get(VenteExclus_.typeTiersPayant), TypeTiersPayant.TIERS_PAYANT_EXCLUS));
        return predicates;
    }

    @Override
    public JSONObject all(int start, int size, String query) {
        long count = countAll(query);
        List<TiersPayantExclusDTO> data = all(start, size, query, false);
        return new JSONObject().put("total", count).put("data", data);

    }

    private long countAll(String query) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<VenteExclus> root = cq.from(VenteExclus.class);
            cq.select(cb.countDistinct(root.get(VenteExclus_.tiersPayant)));
            List<Predicate> predicates = perimePredicatCountAll(cb, root, query);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public void exclure(GenererFactureDTO datas) {
        datas.getDatas().forEach(id -> {
            TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
            payant.setToBeExclude(Boolean.TRUE);
            getEntityManager().merge(payant);
        });
    }

    @Override
    public void exclure(String id) {
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
        payant.setToBeExclude(Boolean.TRUE);
        getEntityManager().merge(payant);
    }

    @Override
    public void inclure(String id) {
        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, id);
        payant.setToBeExclude(Boolean.FALSE);
        getEntityManager().merge(payant);
    }

    @Override
    public void update(String id, boolean toExclure) {
        if (toExclure) {
            exclure(id);
        } else {
            inclure(id);
        }
    }

    private long countFetchVenteByTiersPayant(String tiersPayantId, String dtStart, String dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<VenteExclus> root = cq.from(VenteExclus.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = fetchVentesPredicat(cb, root, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                    tiersPayantId, TypeTiersPayant.TIERS_PAYANT_EXCLUS);
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

    @Override
    public List<VenteTiersPayantsDTO> fetchVente(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, int start,
            int size, boolean all) {
        return fetchVenteExclus(tiersPayantId, dtStart, dtEnd, TypeTiersPayant.TIERS_PAYANT_EXCLUS, start, size, all)
                .stream().map(VenteTiersPayantsDTO::new).collect(Collectors.toList());
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
        json.put("total", reglementsCarnetCount(typeReglementCarnet, tiersPayantId, LocalDate.parse(dtStart),
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
            List<Predicate> predicates = reglementsCarnetPredicat(typeReglementCarnet, cb, root,
                    LocalDate.parse(dtStart), LocalDate.parse(dtEnd), tiersPayantId);
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

    private List<Predicate> reglementsCarnetPredicat(TypeReglementCarnet typeReglementCarnet, CriteriaBuilder cb,
            Root<ReglementCarnet> root, LocalDate dtStart, LocalDate dtEnd, String tiersPayantId) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(ReglementCarnet_.TYPE_TIERS_PAYANT), TypeTiersPayant.TIERS_PAYANT_EXCLUS));
        if (!StringUtils.isEmpty(tiersPayantId)) {
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

    private long reglementsCarnetCount(TypeReglementCarnet typeReglementCarnet, String tiersPayantId, LocalDate dtStart,
            LocalDate dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<ReglementCarnet> root = cq.from(ReglementCarnet.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = reglementsCarnetPredicat(typeReglementCarnet, cb, root, dtStart, dtEnd,
                    tiersPayantId);
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
            List<Predicate> predicates = reglementsCarnetPredicat(typeReglementCarnet, cb, root, dtStart, dtEnd,
                    tiersPayantId);
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

        TTiersPayant payant = getEntityManager().find(TTiersPayant.class, reglementCarnetDTO.getTiersPayantId());
        if (reglementCarnetDTO.getMontantPaye() <= 0) {
            return json.put("success", false).put("msg", "VEUILLEZ SAISIR UN MONTANT");
        }
        if (payant.getAccount().intValue() < reglementCarnetDTO.getMontantPaye()) {
            return json.put("success", false).put("msg", "VEUILLEZ SAISIR UN MONTANT EGAL OU INFERIEUR AU SOLDE");
        }
        return reglementService.faireReglementCarnetDepot(reglementCarnetDTO, user);

    }

    @Override
    public String getTiersPayantName(String tiersPayantId) {
        if (StringUtils.isNoneBlank(tiersPayantId)) {
            return getEntityManager().find(TTiersPayant.class, tiersPayantId).getStrFULLNAME();
        }
        return " ";
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

    @Override
    public void updateTiersPayantAccount(TTiersPayant payant, int montant) {

        if (payant != null) {
            payant.setAccount(payant.getAccount() + montant);
            getEntityManager().merge(payant);
        }

    }

    @Override
    public List<VenteExclusDTO> fetchVenteExclus(String tiersPayantId, LocalDate from, LocalDate to,
            TypeTiersPayant typeTiersPayant, int start, int size, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<VenteExclus> cq = cb.createQuery(VenteExclus.class);
            Root<VenteExclus> root = cq.from(VenteExclus.class);
            cq.select(root).orderBy(cb.desc(root.get(VenteExclus_.modifiedAt)));
            List<Predicate> predicates = fetchVentesPredicat(cb, root, from, to, tiersPayantId, typeTiersPayant);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<VenteExclus> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(size);
            }
            return q.getResultList().stream().map(VenteExclusDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<Predicate> fetchVentesPredicat(CriteriaBuilder cb, Root<VenteExclus> root, LocalDate from,
            LocalDate to, String tiersPayantId, TypeTiersPayant typeTiersPayant) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(VenteExclus_.TYPE_TIERS_PAYANT), typeTiersPayant));
        predicates.add(cb.equal(root.get(VenteExclus_.status), Statut.IS_CLOSE));
        if (!StringUtils.isEmpty(tiersPayantId)) {
            predicates.add(
                    cb.equal(root.get(VenteExclus_.tiersPayant).get(TTiersPayant_.lgTIERSPAYANTID), tiersPayantId));
        }

        predicates.add(cb.between(root.get(VenteExclus_.mvtDate), from, to));

        return predicates;
    }

    @Override
    public TiersPayantExclusDTO fetchVenteSummary(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TiersPayantExclusDTO> cq = cb.createQuery(TiersPayantExclusDTO.class);
            Root<VenteExclus> root = cq.from(VenteExclus.class);
            cq.select(cb.construct(TiersPayantExclusDTO.class, cb.sumAsLong(root.get(VenteExclus_.montantTiersPayant)),
                    cb.count(root)));
            List<Predicate> predicates = fetchVentesPredicat(cb, root, dtStart, dtEnd, tiersPayantId,
                    TypeTiersPayant.TIERS_PAYANT_EXCLUS);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<TiersPayantExclusDTO> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {

            return new TiersPayantExclusDTO();
        }
    }

    private long countAllTiersPayants(String query) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TTiersPayant> root = cq.from(TTiersPayant.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = allTiersPayantPredicatCountAll(cb, root, query);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public JSONObject allTiersPayant(int start, int size, String query) {
        long count = countAllTiersPayants(query);
        List<TiersPayantExclusDTO> data = allTiersPayants(start, size, query, false);
        return new JSONObject().put("total", count).put("data", data);
    }

    private List<TiersPayantExclusDTO> allTiersPayants(int start, int size, String query, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TTiersPayant> cq = cb.createQuery(TTiersPayant.class);
            Root<TTiersPayant> root = cq.from(TTiersPayant.class);
            cq.select(root).orderBy(cb.asc(root.get(TTiersPayant_.strNAME)));
            List<Predicate> predicates = allTiersPayantPredicatCountAll(cb, root, query);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
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

    private List<Predicate> allTiersPayantPredicatCountAll(CriteriaBuilder cb, Root<TTiersPayant> root, String query) {
        List<Predicate> predicates = new ArrayList<>();
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(TTiersPayant_.strNAME), query + "%"),
                    cb.like(root.get(TTiersPayant_.strCODEORGANISME), query + "%"),
                    cb.like(root.get(TTiersPayant_.strFULLNAME), query + "%")));
        }
        predicates.add(cb.equal(root.get(TTiersPayant_.strSTATUT), DateConverter.STATUT_ENABLE));

        return predicates;
    }
}
