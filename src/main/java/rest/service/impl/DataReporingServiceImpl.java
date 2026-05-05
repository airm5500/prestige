/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.FamilleArticleStatDTO;
import dal.GammeProduit_;
import dal.Laboratoire_;
import dal.TEmplacement;
import dal.TEmplacement_;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TFamillearticle_;
import dal.TGrossiste_;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TTypeVente_;
import dal.TUser;
import dal.TUser_;
import dal.TZoneGeographique_;
import enumeration.MargeEnum;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
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
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.DataReporingService;
import util.DateConverter;
import rest.service.InventaireService;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 *
 * @author DICI
 */
@Stateless
public class DataReporingServiceImpl implements DataReporingService {

    private static final Logger LOG = Logger.getLogger(DataReporingServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @EJB
    private CsvExportService csvExportService;

    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private InventaireService inventaireService;

    private List<Predicate> margesPredicats(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> join, LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamille, TUser u, String codeRayon, String codeGrossiste) {
        List<Predicate> predicates = new ArrayList<>();
        TEmplacement emp = u.getLgEMPLACEMENTID();
        Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
        predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
        predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                DateConverter.DEPOT_EXTENSION));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                    .get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }

        return predicates;
    }

    private Long countMargeProduisVendus(String dtStart, String dtEnd, String codeFamille, String query, TUser u,
            String codeRayon, String codeGrossiste) throws Exception {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
        Join<TPreenregistrementDetail, TPreenregistrement> join = root
                .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
        cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgFAMILLEID)));
        List<Predicate> predicates = margesPredicats(cb, root, join, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                query, codeFamille, u, codeRayon, codeGrossiste);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        Query q = getEntityManager().createQuery(cq);
        return (Long) q.getSingleResult();
    }

    @Override
    public Pair<Long, List<FamilleArticleStatDTO>> margeProduitsVendus(String dtStart, String dtEnd, String codeFamille,
            Integer critere, String query, TUser u, String codeRayon, String codeGrossiste, int start, int limit,
            boolean all, MargeEnum filtre) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class,
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intPAF),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intPRICE),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY))))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID))
                    .orderBy(cb.asc(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME)));

            List<Predicate> predicates = margesPredicats(cb, root, join, LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), query, codeFamille, u, codeRayon, codeGrossiste);

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            Long count = 0l;
            if (critere == null || filtre == MargeEnum.ALL) {
                if (!all) {
                    q.setFirstResult(start);
                    q.setMaxResults(limit);
                    count = countMargeProduisVendus(dtStart, dtEnd, codeFamille, query, u, codeRayon, codeGrossiste);
                }

                return Pair.of(count, q.getResultList());
            } else {
                List<FamilleArticleStatDTO> l = new ArrayList<>();
                long critere0 = Long.valueOf(critere);
                switch (filtre) {

                case EQUAL:
                    l = q.getResultList().stream().filter(x -> x.getPourcentageCumulMage() == critere0)
                            .collect(Collectors.toList());
                    break;
                case GREATER:
                    l = q.getResultList().stream().filter(x -> x.getPourcentageCumulMage() > critere0)
                            .collect(Collectors.toList());
                    break;
                case GREATER_EQUAL:
                    l = q.getResultList().stream().filter(x -> x.getPourcentageCumulMage() >= critere0)
                            .collect(Collectors.toList());
                    break;
                case LESS:
                    l = q.getResultList().stream().filter(x -> x.getPourcentageCumulMage() < critere0)
                            .collect(Collectors.toList());
                    break;
                case LESS_EQUAL:
                    l = q.getResultList().stream().filter(x -> x.getPourcentageCumulMage() <= critere0)
                            .collect(Collectors.toList());
                    break;
                case NOT:
                    l = q.getResultList().stream().filter(x -> x.getPourcentageCumulMage() != critere0)
                            .collect(Collectors.toList());
                    break;

                }

                if (!all) {
                    count = (long) l.size();
                    l.sort(Comparator.comparing(FamilleArticleStatDTO::getLibelle));
                    int limit0 = limit + start;
                    return Pair.of(count, l.subList(start, (limit0 <= l.size()) ? limit0 : l.size()));
                } else {
                    return Pair.of(0L, l);
                }

            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVenduesparGamme ---->> ", e);
            return Pair.of(0l, Collections.emptyList());
        }
    }

    @Override
    public JSONObject margeProduitsVendus(String dtStart, String dtEnd, String codeFamile, Integer critere,
            String query, TUser u, String codeRayon, String codeGrossiste, int start, int limit, MargeEnum filtre)
            throws JSONException {
        try {
            Pair<Long, List<FamilleArticleStatDTO>> margeProduit = margeProduitsVendus(dtStart, dtEnd, codeFamile,
                    critere, query, u, codeRayon, codeGrossiste, start, limit, false, filtre);
            return new JSONObject().put("total", margeProduit.getLeft()).put("data",
                    new JSONArray(margeProduit.getRight()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVenduesparGamme ---->> ", e);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    private List<Predicate> unitesVenduePredicats(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> join, LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamille, TUser u, String codeRayon, String codeGrossiste) {
        List<Predicate> predicates = new ArrayList<>();
        TEmplacement emp = u.getLgEMPLACEMENTID();
        Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
        predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
        predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                DateConverter.DEPOT_EXTENSION));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                    .get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }

        return predicates;
    }

    @Override
    public Pair<Long, List<FamilleArticleStatDTO>> statsUnintesVenduesparGamme(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste, String gammeId, int start,
            int limit, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class,
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.gamme).get(GammeProduit_.id),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.gamme).get(GammeProduit_.libelle),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY))))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.gamme))
                    .orderBy(cb.asc(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.gamme)
                            .get(GammeProduit_.libelle)));

            List<Predicate> predicates = unitesVenduePredicatsGamme(cb, root, join, LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), query, codeFamile, u, codeRayon, codeGrossiste, gammeId);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            Long count = 0l;
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
                count = countStatsUnintesVenduesGamme(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste,
                        gammeId);
            }
            List<FamilleArticleStatDTO> data = q.getResultList();
            return Pair.of(count, data);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVenduesparGamme ---->> ", e);
            return Pair.of(0l, Collections.emptyList());
        }
    }

    @Override
    public Pair<Long, List<FamilleArticleStatDTO>> statsUnintesVenduesparLaboratoire(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste, String laboratoireId,
            int start, int limit, boolean all) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class,
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.laboratoire).get(Laboratoire_.id),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.laboratoire)
                            .get(Laboratoire_.libelle),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY))))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.laboratoire))

                    .orderBy(cb.asc(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.laboratoire)
                            .get(Laboratoire_.libelle)));

            List<Predicate> predicates = unitesVenduePredicatsLaboratoires(cb, root, join, LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), query, codeFamile, u, codeRayon, codeGrossiste, laboratoireId);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            Long count = 0l;
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
                count = countStatsUnintesVenduesLaboratoires(dtStart, dtEnd, codeFamile, query, u, codeRayon,
                        codeGrossiste, laboratoireId);

            }
            List<FamilleArticleStatDTO> data = q.getResultList();
            return Pair.of(count, data);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVenduesparLaboratoire ---->> ", e);
            return Pair.of(0l, Collections.emptyList());
        }
    }

    private List<Predicate> unitesVenduePredicatsGamme(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> join, LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamille, TUser u, String codeRayon, String codeGrossiste, String gammeId) {
        List<Predicate> predicates = new ArrayList<>();
        TEmplacement emp = u.getLgEMPLACEMENTID();
        Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.isNotNull(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.gamme)));
        predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
        predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
        predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                DateConverter.DEPOT_EXTENSION));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                    .get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }
        if (!StringUtils.isEmpty(gammeId)) {
            predicates.add(
                    cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.gamme).get(GammeProduit_.id),
                            gammeId));
        }
        return predicates;
    }

    private List<Predicate> unitesVenduePredicatsLaboratoires(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> join, LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamille, TUser u, String codeRayon, String codeGrossiste, String laboratoireId) {
        List<Predicate> predicates = new ArrayList<>();
        TEmplacement emp = u.getLgEMPLACEMENTID();
        Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.isNotNull(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.laboratoire)));
        predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
        predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
        predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                DateConverter.DEPOT_EXTENSION));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste)) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                    .get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }
        if (!StringUtils.isEmpty(laboratoireId)) {
            predicates.add(cb.equal(
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.laboratoire).get(Laboratoire_.id),
                    laboratoireId));
        }
        return predicates;
    }

    private Integer stockProduit(String idProduit, String empl) {
        try {
            Query q = getEntityManager().createQuery(
                    "SELECT o.intNUMBERAVAILABLE FROM TFamilleStock o WHERE o.strSTATUT='enable' AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 AND o.lgFAMILLEID.lgFAMILLEID=?2 ");
            q.setMaxResults(1);
            q.setParameter(1, empl);
            q.setParameter(2, idProduit);
            return (Integer) q.getSingleResult();
        } catch (Exception e) {

            return 0;
        }
    }

    private Long countStatsUnintesVendues(String dtStart, String dtEnd, String codeFamille, String query, TUser u,
            String codeRayon, String codeGrossiste) throws Exception {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
        Join<TPreenregistrementDetail, TPreenregistrement> join = root
                .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
        cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgFAMILLEID)));
        List<Predicate> predicates = unitesVenduePredicats(cb, root, join, LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd), query, codeFamille, u, codeRayon, codeGrossiste);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        Query q = getEntityManager().createQuery(cq);
        return (Long) q.getSingleResult();
    }

    private Long countStatsUnintesVenduesGamme(String dtStart, String dtEnd, String codeFamille, String query, TUser u,
            String codeRayon, String codeGrossiste, String gammeId) throws Exception {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
        Join<TPreenregistrementDetail, TPreenregistrement> join = root
                .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
        cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgFAMILLEID)));
        List<Predicate> predicates = unitesVenduePredicatsGamme(cb, root, join, LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd), query, codeFamille, u, codeRayon, codeGrossiste, gammeId);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        Query q = getEntityManager().createQuery(cq);
        return (Long) q.getSingleResult();
    }

    private Long countStatsUnintesVenduesLaboratoires(String dtStart, String dtEnd, String codeFamille, String query,
            TUser u, String codeRayon, String codeGrossiste, String laboratoireId) throws Exception {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
        Join<TPreenregistrementDetail, TPreenregistrement> join = root
                .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
        cq.select(cb.countDistinct(root.get(TPreenregistrementDetail_.lgFAMILLEID)));
        List<Predicate> predicates = unitesVenduePredicatsLaboratoires(cb, root, join, LocalDate.parse(dtStart),
                LocalDate.parse(dtEnd), query, codeFamille, u, codeRayon, codeGrossiste, laboratoireId);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        Query q = getEntityManager().createQuery(cq);
        return (Long) q.getSingleResult();
    }

    @Override
    public Pair<Long, List<FamilleArticleStatDTO>> statsUnintesVendues(String dtStart, String dtEnd, String codeFamile,
            String query, TUser u, String codeRayon, String codeGrossiste, int start, int limit, boolean all) {
        try {
            String empId = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class,
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                            .get(TFamillearticle_.strCODEFAMILLE),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                            .get(TFamillearticle_.strLIBELLE),
                    cb.selectCase()
                            .when(cb.equal(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                                    DateConverter.VENTE_COMPTANT_ID),
                                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)))
                            .otherwise(0),
                    cb.selectCase()
                            .when(cb.equal(join.get(TPreenregistrement_.strTYPEVENTE), DateConverter.VENTE_ASSURANCE),
                                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)))
                            .otherwise(0),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)),
                    cb.countDistinct(join.get(TPreenregistrement_.lgPREENREGISTREMENTID)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intSEUILMIN)))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID)).orderBy(
                            cb.asc(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                                    .get(TFamillearticle_.strLIBELLE)),
                            cb.asc(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME)));
            List<Predicate> predicates = unitesVenduePredicats(cb, root, join, LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), query, codeFamile, u, codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            Long count = 0l;
            List<FamilleArticleStatDTO> data = new ArrayList<>();
            Queue<FamilleArticleStatDTO> l;
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
                count = countStatsUnintesVendues(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste);
                l = new LinkedList<>(q.getResultList());

            } else {
                l = new LinkedList<>(q.getResultList());
            }
            l.stream().forEach(x -> {
                x.setMontantCumulTva(stockProduit(x.getId(), empId));
                data.add(x);
            });
            return Pair.of(count, data);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVendues ---->> ", e);
            return Pair.of(0l, Collections.emptyList());
        }
    }

    @Override
    public JSONObject statsUnintesVendues(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException {
        try {
            Pair<Long, List<FamilleArticleStatDTO>> p = statsUnintesVendues(dtStart, dtEnd, codeFamile, query, u,
                    codeRayon, codeGrossiste, start, limit, false);
            return new JSONObject().put("total", p.getLeft()).put("data", new JSONArray(p.getRight()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVenduesparGamme ---->> ", e);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    @Override
    public JSONObject statsUnintesVenduesparLaboratoire(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste, String laboratoireId, int start, int limit)
            throws JSONException {
        try {
            Pair<Long, List<FamilleArticleStatDTO>> p = statsUnintesVenduesparLaboratoire(dtStart, dtEnd, codeFamile,
                    query, u, codeRayon, codeGrossiste, laboratoireId, start, limit, false);
            return new JSONObject().put("total", p.getLeft()).put("data", new JSONArray(p.getRight()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsUnintesVenduesparGamme ---->> ", e);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    @Override
    public JSONObject statsUnintesVenduesparGamme(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste, String gammeId, int start, int limit)
            throws JSONException {
        try {
            Pair<Long, List<FamilleArticleStatDTO>> p = statsUnintesVenduesparGamme(dtStart, dtEnd, codeFamile, query,
                    u, codeRayon, codeGrossiste, gammeId, start, limit, false);
            return new JSONObject().put("total", p.getLeft()).put("data", new JSONArray(p.getRight()));
        } catch (Exception e) {

            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    @Override
    public List<ArticleDTO> statsArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste, final int stock, MargeEnum stockFiltre, int start,
            int limit, boolean all) {
        try {
            String empId = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ArticleDTO> cq = cb.createQuery(ArticleDTO.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> fa = root.join("tFamilleStockCollection", JoinType.INNER);
            if ((StringUtils.isEmpty(codeFamile) || codeFamile.equals(DateConverter.TOUT))
                    && (StringUtils.isEmpty(codeGrossiste) || codeGrossiste.equals(DateConverter.TOUT))) {
                cq.select(cb.construct(ArticleDTO.class, root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strCODE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE), root.get(TFamille_.intPAF),
                        root.get(TFamille_.intPRICE), root.get(TFamille_.lgFAMILLEID),
                        root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID))).distinct(true)
                        .orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else {
                if (!StringUtils.isEmpty(codeFamile)) {
                    cq.select(cb.construct(ArticleDTO.class, root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                            root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strCODEFAMILLE),
                            root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE),
                            root.get(TFamille_.intPAF), root.get(TFamille_.intPRICE), root.get(TFamille_.lgFAMILLEID),
                            root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID))).distinct(true)
                            .orderBy(cb.asc(root.get(TFamille_.strNAME)));
                } else if (!StringUtils.isEmpty(codeGrossiste)) {
                    cq.select(cb.construct(ArticleDTO.class, root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                            root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                            root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE), root.get(TFamille_.intPAF),
                            root.get(TFamille_.intPRICE), root.get(TFamille_.lgFAMILLEID),
                            root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID))).distinct(true)
                            .orderBy(cb.asc(root.get(TFamille_.strNAME)));
                }
            }
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrementDetail> subroot = sub.from(TPreenregistrementDetail.class);
            sub.select(subroot.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID));
            List<Predicate> predicatesSubQuery = statsArticlesInvendusSubQueryPredicats(cb, subroot, dtStart, dtEnd,
                    empId);
            sub.where(predicatesSubQuery.toArray(Predicate[]::new));
            List<Predicate> predicates = statsArticlesInvendusPredicats(cb, root, fa, query, codeFamile, codeRayon,
                    codeGrossiste, empId, stockFiltre, stock);
            predicates.add(cb.not(cb.in(root.get(TFamille_.lgFAMILLEID)).value(sub)));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<ArticleDTO> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
                return q.getResultList().stream()
                        .map(x -> x.lastDate(dateDerniereVente(x.getId(), empId)).stock(stockProduit(x.getId(), empId)))
                        .collect(Collectors.toList());
            } else {
                return q.getResultList().stream()
                        .map(x -> x.lastDate(dateDerniereVente(x.getId(), empId)).stock(stockProduit(x.getId(), empId)))
                        .collect(Collectors.toList());
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsArticlesInvendus ---->> ", e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject statsArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre, int start, int limit)
            throws JSONException {
        long total = statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste, stock,
                stockFiltre);
        if (total == 0) {
            return new JSONObject().put("total", total).put("data", new JSONArray());
        }
        List<ArticleDTO> datas = statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste,
                stock, stockFiltre, start, limit, false);
        return new JSONObject().put("total", total).put("data", new JSONArray(datas));
    }

    private List<Predicate> statsArticlesInvendusPredicats(CriteriaBuilder cb, Root<TFamille> root,
            Join<TFamille, TFamilleStock> fa, String query, String codeFamille, String codeRayon, String codeGrossiste,
            String emplacementId, MargeEnum stockFiltre, int stock) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(TFamille_.strSTATUT), DateConverter.STATUT_ENABLE));
        predicates.add(cb.equal(fa.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emplacementId));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille) && !codeFamille.equalsIgnoreCase(DateConverter.ALL)) {
            predicates.add(cb.equal(root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                    codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon) && !codeRayon.equalsIgnoreCase(DateConverter.ALL)) {
            predicates.add(cb.equal(root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equalsIgnoreCase(DateConverter.ALL)) {
            predicates.add(cb.equal(root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }
        if (stockFiltre != null && stockFiltre != MargeEnum.ALL) {
            switch (stockFiltre) {

            case EQUAL:
                predicates.add(cb.equal(fa.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
                break;
            case GREATER:
                predicates.add(cb.greaterThan(fa.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
                break;
            case GREATER_EQUAL:
                predicates.add(cb.greaterThanOrEqualTo(fa.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
                break;
            case LESS:
                predicates.add(cb.lessThan(fa.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
                break;

            case LESS_EQUAL:
                predicates.add(cb.lessThanOrEqualTo(fa.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
                break;
            case NOT:
                predicates.add(cb.notEqual(fa.get(TFamilleStock_.intNUMBERAVAILABLE), stock));
                break;
            default:
                break;
            }
        }
        return predicates;
    }

    private List<Predicate> statsArticlesInvendusSubQueryPredicats(CriteriaBuilder cb,
            Root<TPreenregistrementDetail> root, String dtStart, String dtEnd, String emplacementId) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(
                cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                        DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb
                .isFalse(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(
                root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0));
        Predicate btw = cb
                .between(
                        cb.function("DATE", Date.class,
                                root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                        .get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(
                cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.lgUSERID)
                        .get(TUser_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID), emplacementId));

        return predicates;
    }

    private Date dateDerniereVente(String idProduit, String empl) {
        try {
            Query q = getEntityManager().createQuery(
                    "SELECT o.lgPREENREGISTREMENTID.dtUPDATED FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.strSTATUT= 'is_Closed' AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?1 AND o.lgFAMILLEID.lgFAMILLEID=?2 ORDER BY o.lgPREENREGISTREMENTID.dtUPDATED DESC");
            q.setMaxResults(1);
            q.setParameter(1, empl);
            q.setParameter(2, idProduit);
            return (Date) q.getSingleResult();
        } catch (Exception e) {

            return null;
        }
    }

    public Long statsArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, final int stock, MargeEnum stockFiltre) {
        try {
            String empId = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> fa = root.join("tFamilleStockCollection", JoinType.INNER);
            cq.select(cb.countDistinct(root));
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrementDetail> subroot = sub.from(TPreenregistrementDetail.class);
            sub.select(subroot.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID));
            List<Predicate> predicatesSubQuery = statsArticlesInvendusSubQueryPredicats(cb, subroot, dtStart, dtEnd,
                    empId);
            sub.where(predicatesSubQuery.toArray(Predicate[]::new));
            List<Predicate> predicates = statsArticlesInvendusPredicats(cb, root, fa, query, codeFamile, codeRayon,
                    codeGrossiste, empId, stockFiltre, stock);
            predicates.add(cb.not(cb.in(root.get(TFamille_.lgFAMILLEID)).value(sub)));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (q.getSingleResult() != null ? (Long) q.getSingleResult() : 0);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "statsArticlesInvendus ---->> ", e);
            return 0l;
        }
    }

    private List<ArticleDTO> findAllArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) {

        // all = true pour ignorer start/limit
        return statsArticlesInvendus(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste, stock, stockFiltre,
                0, 0, true);
    }

    private List<String> getArticlesInvendusIds(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) {

        return findAllArticlesInvendus(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste, stock,
                stockFiltre).stream().map(ArticleDTO::getId) // ArticleDTO a déjà getId() (tu l’utilises dans
                                                             // dateDerniereVente/stockProduit)
                        .collect(Collectors.toList());
    }

    @Override
    public byte[] exportArticlesInvendusCsv(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws IOException {

        List<ArticleDTO> data = findAllArticlesInvendus(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste,
                stock, stockFiltre);

        LocalDate d1 = LocalDate.parse(dtStart); // "yyyy-MM-dd"
        LocalDate d2 = LocalDate.parse(dtEnd);

        String title = "Articles invendus du " + d1.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                + d2.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        String[] headers = { "Code CIP", "Libellé", "Prix vente", "Prix achat", "Stock", "Date dernière vente",
                "Heure dernière vente" };

        byte[] csvData = csvExportService.createCsvReport(title, headers, data, dto -> new String[] { dto.getCode(), // CIP
                dto.getLibelle(), // Libellé
                String.valueOf(dto.getPrixVente()), // Prix vente
                String.valueOf(dto.getPrixAchat()), // Prix achat
                String.valueOf(dto.getStock()), // Stock
                dto.getLastDate() != null ? dto.getLastDate() : "",
                dto.getLastHour() != null ? dto.getLastHour() : "" });

        return csvExportService.addUtf8Bom(csvData);
    }

    @Override
    public byte[] exportArticlesInvendusExcel(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws IOException {

        List<ArticleDTO> data = findAllArticlesInvendus(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste,
                stock, stockFiltre);

        LocalDate d1 = LocalDate.parse(dtStart);
        LocalDate d2 = LocalDate.parse(dtEnd);

        String title = "Articles invendus du " + d1.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                + d2.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        String[] headers = { "Code CIP", "Libellé", "Prix vente", "Prix achat", "Stock", "Date dernière vente",
                "Heure dernière vente" };

        return reportExcelExportService.createExcelReport(title, headers, data, (row, dto) -> {
            int col = 0;
            row.createCell(col++).setCellValue(dto.getCode());
            row.createCell(col++).setCellValue(dto.getLibelle());
            row.createCell(col++).setCellValue(dto.getPrixVente());
            row.createCell(col++).setCellValue(dto.getPrixAchat());
            row.createCell(col++).setCellValue(dto.getStock());
            row.createCell(col++).setCellValue(dto.getLastDate() != null ? dto.getLastDate() : "");
            row.createCell(col++).setCellValue(dto.getLastHour() != null ? dto.getLastHour() : "");
        });
    }

    @Override
    public JSONObject createInventaireArticlesInvendus(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste, int stock, MargeEnum stockFiltre) throws JSONException {

        List<String> ids = getArticlesInvendusIds(dtStart, dtEnd, codeFamile, query, u, codeRayon, codeGrossiste, stock,
                stockFiltre);

        if (ids.isEmpty()) {
            return new JSONObject().put("count", 0);
        }

        LocalDate d1 = LocalDate.parse(dtStart);
        LocalDate d2 = LocalDate.parse(dtEnd);

        String title = "Inventaire articles invendus du " + d1.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " au " + d2.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        int count = inventaireService.create(Set.copyOf(ids), title);

        return new JSONObject().put("count", count);
    }

}
