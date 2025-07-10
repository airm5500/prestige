/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.FamilleDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TBonLivraisonDetail;
import dal.TEmplacement;
import dal.TEmplacement_;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TFamillearticle_;
import dal.TGrossiste_;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaire_;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TUser;
import dal.TUser_;
import dal.TWarehouse;
import dal.TWarehouse_;
import dal.TZoneGeographique_;
import enumeration.MargeEnum;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CollectionJoin;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FicheArticleService;
import rest.service.SessionHelperService;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author DICI
 */
@Stateless
public class FicheArticleServiceImpl implements FicheArticleService {

    private static final Logger LOG = Logger.getLogger(FicheArticleServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SessionHelperService sessionHelperService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject produitPerimes(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException {
        Pair<VenteDetailsDTO, List<VenteDetailsDTO>> p = produitPerimes(query, nbreMois, dtStart, dtEnd, codeFamile,
                codeRayon, codeGrossiste, start, limit, true);
        List<VenteDetailsDTO> data = p.getRight();
        return new JSONObject().put("total", data.size()).put("data", new JSONArray(data)).put("metaData",
                new JSONObject(p.getLeft()));
    }

    private VenteDetailsDTO produitPerimes(String query, int nbreMois, String dtStart, String dtEnd, TEmplacement emp,
            String codeFamille, String codeRayon, String codeGrossiste) throws Exception {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<VenteDetailsDTO> cq = cb.createQuery(VenteDetailsDTO.class);
        Root<TFamilleStock> root = cq.from(TFamilleStock.class);
        Join<TFamilleStock, TFamille> fa = root.join(TFamilleStock_.lgFAMILLEID, JoinType.INNER);
        List<Predicate> predicates = perimePredicat(cb, root, fa, query, nbreMois, dtStart, dtEnd, codeFamille,
                codeRayon, codeGrossiste, emp);
        cq.select(cb.construct(VenteDetailsDTO.class,
                cb.sum(cb.prod(fa.get(TFamille_.intPAF), root.get(TFamilleStock_.intNUMBERAVAILABLE))),
                cb.sum(cb.prod(fa.get(TFamille_.intPRICE), root.get(TFamilleStock_.intNUMBERAVAILABLE))),
                cb.sumAsLong(root.get(TFamilleStock_.intNUMBERAVAILABLE))));
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<VenteDetailsDTO> q = getEntityManager().createQuery(cq);
        q.setMaxResults(1);
        return q.getSingleResult();

    }

    @Override
    public Pair<VenteDetailsDTO, List<VenteDetailsDTO>> produitPerimes(String query, int nbreMois, String dtStart,
            String dtEnd, String codeFamille, String codeRayon, String codeGrossiste, int start, int limit,
            boolean all) {
        try {
            TEmplacement emp = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<VenteDetailsDTO> cq = cb.createQuery(VenteDetailsDTO.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            Join<TFamilleStock, TFamille> fa = root.join(TFamilleStock_.lgFAMILLEID, JoinType.INNER);
            List<Predicate> predicates = perimePredicat(cb, root, fa, query, nbreMois, dtStart, dtEnd, codeFamille,
                    codeRayon, codeGrossiste, emp);
            if (!StringUtils.isEmpty(codeFamille) && codeFamille.equals("ALL")) {
                cq.select(cb.construct(VenteDetailsDTO.class, fa.get(TFamille_.intCIP), fa.get(TFamille_.strNAME),
                        fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE),
                        fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE),
                        fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE),
                        fa.get(TFamille_.dtPEREMPTION), fa.get(TFamille_.intPAF), fa.get(TFamille_.intPRICE),
                        root.get(TFamilleStock_.intNUMBERAVAILABLE),
                        fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                        fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE),
                        fa.get(TFamille_.intSEUILMIN))).groupBy(fa.get(TFamille_.lgFAMILLEID))
                        .orderBy(cb.desc(fa.get(TFamille_.dtPEREMPTION)));

            } else if (!StringUtils.isEmpty(codeGrossiste) && codeGrossiste.equals("ALL")) {
                cq.select(cb.construct(VenteDetailsDTO.class, fa.get(TFamille_.intCIP), fa.get(TFamille_.strNAME),
                        fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE),
                        fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE),
                        fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE),
                        fa.get(TFamille_.dtPEREMPTION), fa.get(TFamille_.intPAF), fa.get(TFamille_.intPRICE),
                        root.get(TFamilleStock_.intNUMBERAVAILABLE),
                        fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID),
                        fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE), fa.get(TFamille_.intSEUILMIN)))
                        .groupBy(fa.get(TFamille_.lgFAMILLEID)).orderBy(cb.desc(fa.get(TFamille_.dtPEREMPTION)));
            } else {
                cq.select(cb.construct(VenteDetailsDTO.class, fa.get(TFamille_.intCIP), fa.get(TFamille_.strNAME),
                        fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE),
                        fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE),
                        fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE),
                        fa.get(TFamille_.dtPEREMPTION), fa.get(TFamille_.intPAF), fa.get(TFamille_.intPRICE),
                        root.get(TFamilleStock_.intNUMBERAVAILABLE),
                        fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID),
                        fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE),
                        fa.get(TFamille_.intSEUILMIN))).groupBy(fa.get(TFamille_.lgFAMILLEID))
                        .orderBy(cb.desc(fa.get(TFamille_.dtPEREMPTION)));
            }

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<VenteDetailsDTO> l = q.getResultList();
            if (l.isEmpty()) {
                return Pair.of(new VenteDetailsDTO(), Collections.emptyList());
            }
            VenteDetailsDTO summary = produitPerimes(query, nbreMois, dtStart, dtEnd, emp, codeFamille, codeRayon,
                    codeGrossiste);

            return Pair.of(summary, l);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produitPerimes", e);
            return Pair.of(new VenteDetailsDTO(), Collections.emptyList());
        }

    }

    private List<Predicate> perimePredicat(CriteriaBuilder cb, Root<TFamilleStock> root,
            Join<TFamilleStock, TFamille> fa, String query, int nbreMois, String dtStart, String dtEnd,
            String codeFamille, String codeRayon, String codeGrossiste, TEmplacement emp) {
        LocalDate today = LocalDate.now();
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.isNotNull(fa.get(TFamille_.dtPEREMPTION)));
        predicates.add(cb.equal(fa.get(TFamille_.strSTATUT), Constant.STATUT_ENABLE));
        predicates.add(cb.greaterThan(root.get(TFamilleStock_.intNUMBERAVAILABLE), 0));
        predicates.add(cb.equal(root.get(TFamilleStock_.strSTATUT), DateConverter.STATUT_ENABLE));
        predicates.add(cb.equal(root.get(TFamilleStock_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID),
                emp.getLgEMPLACEMENTID()));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(fa.get(TFamille_.intCIP), query + "%"),
                    cb.like(fa.get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille) && !codeFamille.equals("ALL")) {
            predicates.add(cb.equal(fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                    codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon) && !codeRayon.equals("ALL")) {
            predicates.add(cb.equal(fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equals("ALL")) {
            predicates.add(cb.equal(fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }
        if (nbreMois > 0) {
            predicates.add(cb.between(cb.function("DATE", Date.class, fa.get(TFamille_.dtPEREMPTION)),
                    java.sql.Date.valueOf(today), java.sql.Date.valueOf(today.plusMonths(nbreMois))));
        } else {
            if (StringUtils.isEmpty(dtEnd) && StringUtils.isEmpty(dtStart)) {
                predicates.add(cb.lessThanOrEqualTo(cb.function("DATE", Date.class, fa.get(TFamille_.dtPEREMPTION)),
                        new Date()));
            } else {
                if (!StringUtils.isEmpty(dtEnd) && !StringUtils.isEmpty(dtStart)) {
                    predicates.add(cb.between(cb.function("DATE", Date.class, fa.get(TFamille_.dtPEREMPTION)),
                            java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd)));
                } else {
                    if (!StringUtils.isEmpty(dtStart)) {
                        predicates.add(cb.equal(cb.function("DATE", Date.class, fa.get(TFamille_.dtPEREMPTION)),
                                java.sql.Date.valueOf(dtStart)));
                    } else if (!StringUtils.isEmpty(dtEnd)) {
                        predicates.add(cb.equal(cb.function("DATE", Date.class, fa.get(TFamille_.dtPEREMPTION)),
                                java.sql.Date.valueOf(dtEnd)));
                    }
                }

            }
        }
        return predicates;
    }

    @Override
    public JSONObject modifierArticleDatePeremption(String lgFAMILLEID, String dtperemption) throws JSONException {
        try {
            TFamille famille = getEntityManager().find(TFamille.class, lgFAMILLEID);
            famille.setDtPEREMPTION(DateConverter.convertLocalDateToDate(LocalDate.parse(dtperemption)));
            getEntityManager().merge(famille);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "modifierArticleDatePeremption", e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public List<ArticleDTO> articleSurStock(TUser u, String query, String codeFamile, String codeRayon,
            String codeGrossiste, int nbreMois, int nbreConsommation, int start, int limit, boolean all) {
        try {
            final String emId = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TFamille> root = cq.from(TFamille.class);
            CollectionJoin<TFamille, TFamilleStock> stock = root.join(TFamille_.tFamilleStockCollection,
                    JoinType.INNER);
            CollectionJoin<TFamille, TPreenregistrementDetail> item = root
                    .join(TFamille_.tPreenregistrementDetailCollection, JoinType.INNER);
            Expression sumConsom = cb.sum(item.get(TPreenregistrementDetail_.INT_QU_AN_TI_TY));
            Expression quantiteVente = cb.quot(cb.sumAsDouble(item.get(TPreenregistrementDetail_.INT_QU_AN_TI_TY)),
                    nbreMois);
            if (!StringUtils.isEmpty(codeFamile) || codeFamile.equals(DateConverter.ALL)) {
                cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                        root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strCODEFAMILLE),
                        root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE),
                        root.get(TFamille_.intPAF), root.get(TFamille_.intPRICE),
                        root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                        stock.get(TFamilleStock_.intNUMBERAVAILABLE), sumConsom, quantiteVente,
                        root.get(TFamille_.dtPEREMPTION))
                        .having(cb.greaterThan(stock.get(TFamilleStock_.INT_NU_MB_ER_AV_AI_LA_BL_E), sumConsom));
                cq.distinct(true).groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else if (!StringUtils.isEmpty(codeGrossiste) || codeGrossiste.equals(DateConverter.ALL)) {
                cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                        root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                        root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE), root.get(TFamille_.intPAF),
                        root.get(TFamille_.intPRICE), root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                        stock.get(TFamilleStock_.intNUMBERAVAILABLE), sumConsom, quantiteVente,
                        root.get(TFamille_.dtPEREMPTION))
                        .having(cb.greaterThan(stock.get(TFamilleStock_.INT_NU_MB_ER_AV_AI_LA_BL_E), sumConsom));
                cq.distinct(true).groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else if (!StringUtils.isEmpty(codeRayon) || codeRayon.equals(DateConverter.ALL)) {
                cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strCODE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE), root.get(TFamille_.intPAF),
                        root.get(TFamille_.intPRICE), root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                        stock.get(TFamilleStock_.intNUMBERAVAILABLE), sumConsom, quantiteVente.alias("coefficient"),
                        root.get(TFamille_.dtPEREMPTION))
                        .having(cb.greaterThan(stock.get(TFamilleStock_.INT_NU_MB_ER_AV_AI_LA_BL_E), sumConsom));
                cq.distinct(true).groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else {
                cq.multiselect(root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP), root.get(TFamille_.strNAME),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strCODE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE), root.get(TFamille_.intPAF),
                        root.get(TFamille_.intPRICE), root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                        stock.get(TFamilleStock_.intNUMBERAVAILABLE), sumConsom, quantiteVente.alias("coefficient"),
                        root.get(TFamille_.dtPEREMPTION))
                        .having(cb.greaterThan(stock.get(TFamilleStock_.INT_NU_MB_ER_AV_AI_LA_BL_E), sumConsom));
                cq.distinct(true).groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            }

            List<Predicate> predicates = surStockPredicats(cb, root, item, stock, query, codeFamile, codeRayon,
                    codeGrossiste, emId, nbreMois);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Object[]> typedQuery = getEntityManager().createQuery(cq);

            List<Object[]> resultList = typedQuery.getResultList();

            return resultList.stream().map(x -> {
                Map<String, Integer> conso = consomationArticle(x[0] + "", emId, nbreConsommation);
                return new ArticleDTO().id(x[0] + "").code(x[1] + "").libelle(x[2] + "").filterId(x[3] + "")
                        .filterLibelle(x[4] + "").prixAchat(Integer.parseInt(x[5] + ""))
                        .prixVente(Integer.parseInt(x[6] + "")).codeGrossiste(x[7] + "")
                        .stock(Integer.parseInt(x[8] + "")).consommation(Integer.parseInt(x[9] + ""))
                        .datePeremption(x[11] + "")
                        .consommationUn(
                                conso.getOrDefault(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                        .consommationsOne(conso.getOrDefault(
                                LocalDate.now().minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                        .consommationsTwo(conso.getOrDefault(
                                LocalDate.now().minusMonths(2).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                        .consommationsThree(conso.getOrDefault(
                                LocalDate.now().minusMonths(3).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                        .stockMoyen(nbreConsommation)
                        // .stockMoyen(Integer.valueOf(x[9] + "") / nbreConsommation)
                        .qteSurplus(nbreMois).coefficient(Double.valueOf(nbreConsommation));
            }).filter(x -> x.getQteSurplus() >= 0).collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }

    }

    @Override
    public JSONObject articleSurStock(TUser u, String query, String codeFamile, String codeRayon, String codeGrossiste,
            int nbreMois, int nbreConsommation, int start, int limit) throws JSONException {
        List<ArticleDTO> datas = articleSurStock(u, query, codeFamile, codeRayon, codeGrossiste, nbreMois,
                nbreConsommation, start, limit, false);
        return new JSONObject().put("total", datas.size()).put("data", new JSONArray(datas));
    }

    private List<Predicate> surStockPredicats(CriteriaBuilder cb, Root<TFamille> root,
            CollectionJoin<TFamille, TPreenregistrementDetail> item, CollectionJoin<TFamille, TFamilleStock> fa,
            String query, String codeFamille, String codeRayon, String codeGrossiste, String emplacementId,
            int nbreMois) {

        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(TFamille_.strSTATUT), DateConverter.STATUT_ENABLE));
        predicates.add(cb.equal(fa.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emplacementId));
        predicates.add(
                cb.equal(item.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                        DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb
                .isFalse(item.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(
                item.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0));
        predicates.add(cb.equal(root.get(TFamille_.boolDECONDITIONNE), 0));
        Predicate btw = cb
                .between(
                        cb.function("DATE", Date.class,
                                item.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                        .get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(LocalDate.now().minusMonths(nbreMois).toString()),
                        java.sql.Date.valueOf(LocalDate.now().toString()));
        predicates.add(btw);
        predicates.add(
                cb.equal(item.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.lgUSERID)
                        .get(TUser_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID), emplacementId));

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

        return predicates;
    }

    private Map<String, Integer> consomationArticle(String idProduit, String emplId, int nbreMois) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            cq.multiselect(
                    cb.function("DATE_FORMAT", String.class,
                            root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                    .get(TPreenregistrement_.dtUPDATED),
                            cb.literal("%Y-%m")),
                    cb.sum(root.get(TPreenregistrementDetail_.intQUANTITY)))
                    .groupBy(cb.function("DATE_FORMAT", String.class, root
                            .get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.dtUPDATED),
                            cb.literal("%Y-%m")));
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(
                    cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID), idProduit));
            predicates.add(cb.equal(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                    DateConverter.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0));
            Predicate btw = cb.between(
                    cb.function("DATE", Date.class,
                            root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                    .get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(LocalDate.now().minusMonths(nbreMois).toString()),
                    java.sql.Date.valueOf(LocalDate.now().toString()));
            predicates.add(btw);
            predicates.add(
                    cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.lgUSERID)
                            .get(TUser_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID), emplId));

            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            TypedQuery<Object[]> typedQuery = getEntityManager().createQuery(cq);

            List<Object[]> resultList = typedQuery.getResultList();
            return resultList.stream().collect(Collectors.toMap(e -> e[0] + "", e -> Integer.valueOf(e[1] + "")));

        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyMap();
        }
    }

    @Override
    public JSONObject comparaisonStock(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil, int start, int limit)
            throws JSONException {

        long total = comparaisonStock(filtreStock, filtreSeuil, query, codeFamile, codeRayon, codeGrossiste,
                u.getLgEMPLACEMENTID().getLgEMPLACEMENTID(), stock, seuil);

        if (total == 0) {
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }

        return new JSONObject().put("total", total).put("data", new JSONArray(comparaisonStock(u, query, filtreStock,
                filtreSeuil, codeFamile, codeRayon, codeGrossiste, stock, seuil, start, limit, false)));
    }

    private Long produitAccounts(String query, TUser u, String rayon, String filtre) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            Join<TFamilleStock, TFamille> stock = root.join(TFamilleStock_.lgFAMILLEID, JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = produitAccounts(cb, root, stock, query, rayon, filtre, u);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return q.getSingleResult() != null ? (Long) q.getSingleResult() : 0;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produitAccounts ---->> ", e);
            return 0l;
        }
    }

    private List<Predicate> produitAccounts(CriteriaBuilder cb, Root<TFamilleStock> root,
            Join<TFamilleStock, TFamille> stock, String query, String rayon, String filtre, TUser u) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(TFamilleStock_.lgEMPLACEMENTID), u.getLgEMPLACEMENTID()));
        predicates.add(cb.equal(stock.get(TFamille_.strSTATUT), DateConverter.STATUT_ENABLE));
        predicates.add(cb.equal(root.get(TFamilleStock_.strSTATUT), DateConverter.STATUT_ENABLE));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(stock.get(TFamille_.intCIP), query + "%"),
                    cb.like(stock.get(TFamille_.strNAME), query + "%")));
        }
        if (!StringUtils.isEmpty(rayon)) {
            predicates.add(cb.equal(stock.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID), rayon));
        }
        if (!StringUtils.isEmpty(filtre) && !filtre.equals("A")) {
            if (filtre.equals("Y")) {
                predicates.add(cb.isFalse(stock.get(TFamille_.boolACCOUNT)));
            } else {
                predicates.add(cb.isTrue(stock.get(TFamille_.boolACCOUNT)));
            }
        }
        return predicates;
    }

    @Override
    public JSONObject produitAccounts(String query, String rayon, String filtre, TUser u, int start, int limit)
            throws JSONException {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleDTO> cq = cb.createQuery(FamilleDTO.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            Join<TFamilleStock, TFamille> stock = root.join(TFamilleStock_.lgFAMILLEID, JoinType.INNER);
            // String id,String cip, String libelle, int prixAchat, int prixUni, int stock, boolean chiffre
            cq.select(cb.construct(FamilleDTO.class, stock.get(TFamille_.lgFAMILLEID), stock.get(TFamille_.intCIP),
                    stock.get(TFamille_.strNAME), stock.get(TFamille_.intPAF), stock.get(TFamille_.intPRICE),
                    root.get(TFamilleStock_.intNUMBERAVAILABLE), stock.get(TFamille_.boolACCOUNT)))
                    .orderBy(cb.asc(stock.get(TFamille_.strNAME)));
            List<Predicate> predicates = produitAccounts(cb, root, stock, query, rayon, filtre, u);
            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            TypedQuery<FamilleDTO> typedQuery = getEntityManager().createQuery(cq);
            typedQuery.setFirstResult(start);
            typedQuery.setMaxResults(limit);

            List<FamilleDTO> resultList = typedQuery.getResultList();
            Long total = produitAccounts(query, u, rayon, filtre);
            return new JSONObject().put("total", total).put("data", new JSONArray(resultList));
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    @Override
    public List<ArticleDTO> comparaisonStock(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int qty, int seuil, int start, int limit,
            boolean all) {

        try {
            final String emId = u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ArticleDTO> cq = cb.createQuery(ArticleDTO.class);
            Root<TFamille> root = cq.from(TFamille.class);
            CollectionJoin<TFamille, TFamilleStock> stock = root.join(TFamille_.tFamilleStockCollection,
                    JoinType.INNER);

            if (!StringUtils.isEmpty(codeFamile) || codeFamile.equals(DateConverter.ALL)) {
                cq.select(cb.construct(ArticleDTO.class, root, stock.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strCODEFAMILLE),
                        root.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.strLIBELLE)))
                        .groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else if (!StringUtils.isEmpty(codeGrossiste) || codeGrossiste.equals(DateConverter.ALL)) {
                cq.select(cb.construct(ArticleDTO.class, root, stock.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strCODE),
                        root.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.strLIBELLE)))
                        .groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else if (!StringUtils.isEmpty(codeRayon) || codeRayon.equals(DateConverter.ALL)) {
                cq.select(cb.construct(ArticleDTO.class, root, stock.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strCODE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE)))
                        .groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            } else {
                cq.select(cb.construct(ArticleDTO.class, root, stock.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strCODE),
                        root.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.strLIBELLEE)))
                        .groupBy(root.get(TFamille_.lgFAMILLEID)).orderBy(cb.asc(root.get(TFamille_.strNAME)));
            }

            List<Predicate> predicates = comparaisonStock(cb, root, stock, filtreStock, filtreSeuil, query, codeFamile,
                    codeRayon, codeGrossiste, emId, qty, seuil);
            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            TypedQuery<ArticleDTO> typedQuery = getEntityManager().createQuery(cq);
            if (!all) {
                typedQuery.setFirstResult(start);
                typedQuery.setMaxResults(limit);
            }
            List<ArticleDTO> resultList = typedQuery.getResultList();
            if (all) {
                return resultList.stream().map(x -> {
                    Map<String, Integer> conso = consomationArticle(x.getId() + "", emId, 6);
                    TBonLivraisonDetail bonLivraisonDetail = bonLivraisonByArticleId(x.getId() + "");
                    Date ent = bonLivraisonDetail != null ? bonLivraisonDetail.getLgBONLIVRAISONID().getDtUPDATED()
                            : null;
                    int qtyEntree = bonLivraisonDetail != null ? bonLivraisonDetail.getIntQTERECUE() : 0;
                    return x.dateBon(dateBonLivraison(x.getId())).dateEntree(ent).qtyEntree(qtyEntree)
                            .dateInventaire(dateInventaire(x.getId(), emId))
                            .lastDateVente(dateDerniereVente(x.getId(), emId))
                            .consommationUn(conso
                                    .getOrDefault(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                            .consommationsOne(conso.getOrDefault(
                                    LocalDate.now().minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                            .consommationsTwo(conso.getOrDefault(
                                    LocalDate.now().minusMonths(2).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                            .consommationsThree(conso.getOrDefault(
                                    LocalDate.now().minusMonths(3).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                            .consommationsFour(conso.getOrDefault(
                                    LocalDate.now().minusMonths(4).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                            .consommationsFive(conso.getOrDefault(
                                    LocalDate.now().minusMonths(5).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0))
                            .consommationsSix(conso.getOrDefault(
                                    LocalDate.now().minusMonths(6).format(DateTimeFormatter.ofPattern("yyyy-MM")), 0));
                }).collect(Collectors.toList());
            }
            return resultList.stream()
                    .map(x -> x.dateBon(dateBonLivraison(x.getId())).dateEntree(dateEntreeStock(x.getId()))
                            .dateInventaire(dateInventaire(x.getId(), emId))
                            .lastDateVente(dateDerniereVente(x.getId(), emId)).grossisteId(x.getGrossisteId()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }

    }

    public Long comparaisonStock(MargeEnum stockFiltre, MargeEnum filtreSeuil, String query, String codeFamile,
            String codeRayon, String codeGrossiste, String emplacementId, int stock, int seuil) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            CollectionJoin<TFamille, TFamilleStock> fa = root.join(TFamille_.tFamilleStockCollection, JoinType.INNER);
            cq.select(cb.countDistinct(root));
            List<Predicate> predicates = comparaisonStock(cb, root, fa, stockFiltre, filtreSeuil, query, codeFamile,
                    codeRayon, codeGrossiste, emplacementId, stock, seuil);
            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            Query q = getEntityManager().createQuery(cq);
            return (q.getSingleResult() != null ? (Long) q.getSingleResult() : 0);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "comparaisonStock ---->> ", e);
            return 0l;
        }
    }

    private List<Predicate> comparaisonStock(CriteriaBuilder cb, Root<TFamille> root,
            CollectionJoin<TFamille, TFamilleStock> fa, MargeEnum stockFiltre, MargeEnum filtreSeuil, String query,
            String codeFamille, String codeRayon, String codeGrossiste, String emplacementId, int stock, int seuil) {
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
            case STOCK_LESS_THAN_SEUIL:
                predicates.add(cb.lessThan(fa.get(TFamilleStock_.intNUMBERAVAILABLE),
                        root.get(TFamille_.intSTOCKREAPROVISONEMENT)));
                break;
            default:
                break;
            }
        }

        if (filtreSeuil != null && filtreSeuil != MargeEnum.ALL) {
            switch (filtreSeuil) {

            case EQUAL:
                predicates.add(cb.equal(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuil));
                break;
            case GREATER:
                predicates.add(cb.greaterThan(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuil));
                break;
            case GREATER_EQUAL:
                predicates.add(cb.greaterThanOrEqualTo(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuil));
                break;
            case LESS:
                predicates.add(cb.lessThan(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuil));
                break;

            case LESS_EQUAL:
                predicates.add(cb.lessThanOrEqualTo(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuil));
                break;
            case NOT:
                predicates.add(cb.notEqual(root.get(TFamille_.intSTOCKREAPROVISONEMENT), seuil));
                break;

            default:
                break;
            }
        }

        return predicates;
    }

    @Override
    public Date dateDerniereVente(String idProduit, String empl) {
        try {
            Query q = getEntityManager().createQuery(
                    "SELECT o.lgPREENREGISTREMENTID.dtUPDATED FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.strSTATUT= 'is_Closed' AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID =?1 AND o.lgFAMILLEID.lgFAMILLEID=?2 ORDER BY o.lgPREENREGISTREMENTID.dtUPDATED DESC");
            q.setMaxResults(1);
            q.setParameter(1, empl);
            q.setParameter(2, idProduit);
            return (Date) q.getSingleResult();
        } catch (Exception e) {
            // e.printStackTrace(System.err);
            return null;
        }
    }

    @Override
    public Date dateEntreeStock(String idProduit) {
        try {
            return bonLivraisonByArticleId(idProduit).getDtUPDATED();

        } catch (Exception e) {
            // e.printStackTrace();
            return null;

        }
    }

    @Override
    public Date dateBonLivraison(String idProduit) {
        try {

            return bonLivraisonByArticleId(idProduit).getLgBONLIVRAISONID().getDtDATELIVRAISON();

        } catch (Exception e) {

            return null;
        }
    }

    private TBonLivraisonDetail bonLivraisonByArticleId(String id) {
        try {
            TypedQuery<TBonLivraisonDetail> q = this.getEntityManager().createQuery(
                    "SELECT o FROM TBonLivraisonDetail o where o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgBONLIVRAISONID.strSTATUT='is_Closed' ORDER BY o.lgBONLIVRAISONID.dtDATELIVRAISON DESC  ",
                    TBonLivraisonDetail.class);
            q.setMaxResults(1);
            q.setParameter(1, id);
            return q.getSingleResult();

        } catch (Exception e) {

            return null;
        }
    }

    @Override
    public Date dateInventaire(String idProduit, String empl) {
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Date> cq = cb.createQuery(Date.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jp = root.join("lgINVENTAIREID", JoinType.INNER);
            Join<TInventaireFamille, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), empl));

            predicate = cb.and(predicate, cb.equal(jp.get(TInventaire_.strSTATUT), "is_Closed"));

            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), idProduit));
            cq.select(jp.get(TInventaire_.dtUPDATED)).orderBy(cb.desc(jp.get(TInventaire_.dtUPDATED)));

            cq.where(predicate);
            Query q = getEntityManager().createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            return (Date) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
            return null;
        }
    }

    @Override
    public JSONObject produitConsomamation(TUser u, String query, String dtStart, String dtEnd, String id, int start,
            int limit) throws JSONException {
        List<VenteDetailsDTO> data = produitConsomamation(u, query, dtStart, dtEnd, id);
        return new JSONObject().put("total", data.size()).put("data", new JSONArray(data));
    }

    @Override
    public List<VenteDetailsDTO> produitConsomamation(TUser u, String query, String dtStart, String dtEnd, String id) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            cq.select(root).orderBy(cb.desc(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.dtUPDATED)));
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID), id));
            predicates.add(cb.equal(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                    DateConverter.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(
                    root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0));
            Predicate btw = cb.between(
                    cb.function("DATE", Date.class,
                            root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                    .get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                    .get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), u.getLgEMPLACEMENTID()));
            if (!StringUtils.isEmpty(query)) {
                predicates.add(cb.or(
                        cb.like(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                .get(TPreenregistrement_.strREF), query + "%"),
                        cb.like(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                .get(TPreenregistrement_.strREFTICKET), query + "%")));
            }

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TPreenregistrementDetail> typedQuery = getEntityManager().createQuery(cq);

            List<TPreenregistrementDetail> resultList = typedQuery.getResultList();
            return resultList.stream()
                    .map(x -> new VenteDetailsDTO().dateHeure(x.getLgPREENREGISTREMENTID().getDtUPDATED())
                            .operateur(x.getLgPREENREGISTREMENTID().getLgUSERCAISSIERID())
                            .strREF(x.getLgPREENREGISTREMENTID().getStrREF()).intQUANTITY(x.getIntQUANTITY())
                            .intPRICEUNITAIR(x.getIntPRICEUNITAIR()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }
    }

    @Override
    public boolean updateProduitAccount(String id, boolean account) {
        TFamille famille = getEntityManager().find(TFamille.class, id);
        famille.setBoolACCOUNT(!account);
        getEntityManager().merge(famille);
        return true;
    }

    @Override
    public JSONObject saisiePerimes(String query, String dtStart, String dtEnd, TUser u, String codeFamile,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException {
        long count = saisiePerimes(query, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste);
        if (count == 0) {
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
        List<VenteDetailsDTO> data = saisiePerimes(query, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, null,
                start, limit, false);

        return new JSONObject().put("total", count).put("data", new JSONArray(data));

    }

    private List<Predicate> saisiePerimesPredicat(CriteriaBuilder cb, Root<TWarehouse> root,
            Join<TWarehouse, TFamille> fa, String query, String dtStart, String dtEnd, String codeFamille,
            String codeRayon, String codeGrossiste) {
        List<Predicate> predicates = new ArrayList<>();
        LocalDate toDay = LocalDate.now();
        LocalDate dayEnd = toDay;
        predicates.add(cb.equal(root.get(TWarehouse_.strSTATUT), DateConverter.STATUT_DELETE));
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(fa.get(TFamille_.intCIP), query + "%"),
                    cb.like(fa.get(TFamille_.strNAME), query + "%"),
                    cb.like(root.get(TWarehouse_.intNUMLOT), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamille) && !codeFamille.equals("ALL")) {
            predicates.add(cb.equal(fa.get(TFamille_.lgFAMILLEARTICLEID).get(TFamillearticle_.lgFAMILLEARTICLEID),
                    codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon) && !codeRayon.equals("ALL")) {
            predicates.add(cb.equal(fa.get(TFamille_.lgZONEGEOID).get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equals("ALL")) {
            predicates.add(cb.equal(fa.get(TFamille_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
            // predicates.add(cb.equal(root.get(TWarehouse_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID),
            // codeGrossiste));
        }
        try {
            toDay = LocalDate.parse(dtStart);
        } catch (Exception e) {
        }
        try {
            dayEnd = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }
        predicates.add(cb.or(
                cb.between(cb.function("DATE", Date.class, root.get(TWarehouse_.dtCREATED)),
                        java.sql.Date.valueOf(toDay), java.sql.Date.valueOf(dayEnd)),
                cb.between(cb.function("DATE", Date.class, root.get(TWarehouse_.dtPEREMPTION)),
                        java.sql.Date.valueOf(toDay), java.sql.Date.valueOf(dayEnd))));

        return predicates;
    }

    @Override
    public List<VenteDetailsDTO> saisiePerimes(String query, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, Integer grouby, int start, int limit, boolean all) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TWarehouse> cq = cb.createQuery(TWarehouse.class);
            Root<TWarehouse> root = cq.from(TWarehouse.class);
            Join<TWarehouse, TFamille> fa = root.join(TWarehouse_.lgFAMILLEID, JoinType.INNER);
            // List<Predicate> predicates = saisiePerimesPredicat(cb, root, fa, query, dtStart, dtEnd, codeFamile,
            // codeRayon, codeGrossiste);
            List<Predicate> predicates = saisiePerimesPredicat(cb, root, fa, query, dtStart, dtEnd, codeFamile,
                    codeRayon, codeGrossiste);
            cq.select(root).orderBy(cb.desc(root.get(TWarehouse_.dtCREATED)));

            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<TWarehouse> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }

            return q.getResultList().stream().map(x -> new VenteDetailsDTO(x, grouby)).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "saisiePerimes", e);
            return Collections.emptyList();
        }
    }

    private long saisiePerimes(String query, String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TWarehouse> root = cq.from(TWarehouse.class);
            Join<TWarehouse, TFamille> fa = root.join(TWarehouse_.lgFAMILLEID, JoinType.INNER);
            List<Predicate> predicates = saisiePerimesPredicat(cb, root, fa, query, dtStart, dtEnd, codeFamile,
                    codeRayon, codeGrossiste);
            cq.select(cb.count(root));
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "saisiePerimes", e);
            return 0;
        }
    }

}
