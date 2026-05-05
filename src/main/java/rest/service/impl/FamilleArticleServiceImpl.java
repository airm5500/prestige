/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.FamilleArticleStatDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TEmplacement;
import dal.TFamille_;
import dal.TFamillearticle;
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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;
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
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FamilleArticleService;
import util.DateConverter;
import rest.service.InventaireService;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import rest.service.SessionHelperService;
import rest.service.dto.VingtQuatreVingtType;

/**
 *
 * @author DICI
 */
@Stateless
public class FamilleArticleServiceImpl implements FamilleArticleService {

    private static final Logger LOG = Logger.getLogger(FamilleArticleServiceImpl.class.getName());
    @EJB
    private SessionHelperService sessionHelperService;
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

    Comparator<FamilleArticleStatDTO> comparator = Comparator.comparing(FamilleArticleStatDTO::getCode);

    @Override
    public Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParFamilleArticle(String dtStart,
            String dtEnd, String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste) {
        List<FamilleArticleStatDTO> list = new ArrayList<>();
        FamilleArticleStatDTO summary = new FamilleArticleStatDTO();
        try {
            LongAdder montantTTC = new LongAdder();
            LongAdder montantMarge = new LongAdder();
            LongAdder montantHT = new LongAdder();
            LongAdder montantAchat = new LongAdder();
            final LocalDate periode = LocalDate.parse(dtStart);
            Period period = Period.between(LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
            final long montanttotalHt = totalMontantHT(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query,
                    codeFamile, u, codeRayon, codeGrossiste);
            if (period.getMonths() > 0) {
                findPreenregistrementDetails(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                        codeRayon, codeGrossiste).stream().sorted(comparator).forEach(x -> {
                            montantMarge.add(x.getMontantMarge());
                            montantTTC.add(x.getMontantTTC());
                            montantAchat.add(x.getMontantAchat());
                            montantHT.add(x.getMontantHT());
                            Double p = new BigDecimal(Double.valueOf(x.getMontantHT()) / montanttotalHt)
                                    .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
                            x.setPourcentageTH(p.longValue());
                            list.add(x);

                        });
            } else {
                findPreenregistrementDetails(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                        codeRayon, codeGrossiste).stream().sorted(comparator).forEach(x -> {
                            montantMarge.add(x.getMontantMarge());
                            montantTTC.add(x.getMontantTTC());
                            montantAchat.add(x.getMontantAchat());
                            montantHT.add(x.getMontantHT());
                            cumulFamilleArticles(periode, x, u);
                            Double p = new BigDecimal(Double.valueOf(x.getMontantHT()) / montanttotalHt)
                                    .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
                            x.setPourcentageTH(p.longValue());
                            list.add(x);

                        });
            }

            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            summary.setPourcentageTH((montanttotalHt / montanttotalHt) * 100);
            Double ux = new BigDecimal(Double.valueOf(summary.getMontantCumulMarge()) / summary.getMontantCumulHT())
                    .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
            summary.setPourcentageCumulMage(ux.longValue());
        } catch (Exception e) {
        }
        return Pair.of(summary, list);

    }

    @Override
    public JSONObject statistiqueParFamilleArticleView(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste) throws JSONException {
        JSONObject json = new JSONObject();
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = statistiqueParFamilleArticle(dtStart, dtEnd,
                codeFamile, query, u, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> l = pair.getRight();
        json.put("success", true);
        json.put("total", l.size());
        json.put("data", new JSONArray(l));
        json.put("metaData", new JSONObject(pair.getLeft()));
        return json;
    }

    private List<Predicate> famillePredicats(CriteriaBuilder cb, Root<TPreenregistrementDetail> root,
            Join<TPreenregistrementDetail, TPreenregistrement> join, LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
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
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                            .get(TFamillearticle_.strCODEFAMILLE), query + "%"),
                    cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                            .get(TFamillearticle_.strLIBELLE), query + "%")));
        }
        if (!StringUtils.isEmpty(codeFamillle) && !codeFamillle.equals("ALL")) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), codeFamillle));
        }
        if (!StringUtils.isEmpty(codeRayon) && !codeRayon.equals("ALL")) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equals("ALL")) {
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                    .get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }
        return predicates;
    }

    private List<FamilleArticleStatDTO> findPreenregistrementDetails(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(
                    cb.construct(FamilleArticleStatDTO.class,
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                                    .get(TFamillearticle_.strCODEFAMILLE),
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                                    .get(TFamillearticle_.strLIBELLE),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                            cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                                    root.get(TPreenregistrementDetail_.intQUANTITY))),
                            cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                                    .get(TFamillearticle_.lgFAMILLEARTICLEID)))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID));
            List<Predicate> predicates = famillePredicats(cb, root, join, dtStart, dtEnd, query, codeFamillle, u,
                    codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    FamilleArticleStatDTO cumulFamilleArticles(LocalDate periode, FamilleArticleStatDTO familleArticleStatDTO,
            TUser u) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class, cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE))));
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), familleArticleStatDTO.getFamilleId()));
            Predicate btw = cb.equal(cb.function("YEAR", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    periode.getYear());
            predicates.add(btw);
            predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
            predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
            predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                    DateConverter.DEPOT_EXTENSION));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            FamilleArticleStatDTO t = q.getSingleResult();
            familleArticleStatDTO.setMontantCumulAchat(t.getMontantCumulAchat());
            familleArticleStatDTO.setMontantCumulTTC(t.getMontantCumulTTC());
            familleArticleStatDTO.setMontantCumulTva(t.getMontantCumulTva());
            familleArticleStatDTO.setMontantCumulHT(t.getMontantCumulHT());
            Double p = new BigDecimal(
                    Double.valueOf(familleArticleStatDTO.getMontantHT()) / familleArticleStatDTO.getMontantCumulHT())
                            .setScale(2, RoundingMode.HALF_UP).doubleValue()
                    * 100;
            familleArticleStatDTO.setValeurPeriode(p.intValue());
            return familleArticleStatDTO;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return familleArticleStatDTO;
        }
    }

    private long totalMontantHT(LocalDate dtStart, LocalDate dtEnd, String query, String codeFamillle, TUser u,
            String codeRayon, String codeGrossiste) {
        try {
            // List<Predicate> predicates = new ArrayList<>();
            // TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Number> cq = cb.createQuery(Number.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.diff(
                    cb.diff(cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva))));

            List<Predicate> predicates = famillePredicats(cb, root, join, dtStart, dtEnd, query, codeFamillle, u,
                    codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));

            Query q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            return ((Number) q.getSingleResult()).longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public List<VenteDetailsDTO> geVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, boolean all, VingtQuatreVingtType vingtQuatreVingtType) {
        List<VenteDetailsDTO> list = new ArrayList<>();
        try {
            String procedureName;
            switch (vingtQuatreVingtType) {
            case CA:
                procedureName = "analyse_20_80_par_ca";
                break;
            case QTY:
                procedureName = "analyse_20_80_par_quantite";
                break;
            case MARGE:
                procedureName = "analyse_20_80_par_marge";
                break;

            default:
                procedureName = "analyse_20_80_par_ca";
                break;
            }
            if ("ALL".equals(codeFamile)) {
                codeFamile = "";
            }
            if ("ALL".equals(codeRayon)) {
                codeRayon = "";
            }
            if ("ALL".equals(codeGrossiste)) {
                codeGrossiste = "";
            }
            Query query = getEntityManager().createNativeQuery("CALL " + procedureName + "(?, ?, ?, ?, ?, ?)");
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            query.setParameter(4, codeFamile);
            query.setParameter(5, codeRayon);
            query.setParameter(6, codeGrossiste);

            List<Object[]> resultList = query.getResultList();
            for (Object[] row : resultList) {
                VenteDetailsDTO dto = new VenteDetailsDTO();
                dto.setIntCIP((String) row[0]);
                dto.setStrNAME((String) row[1]);
                Number price = (Number) row[2];
                dto.setIntPRICE(price != null ? price.intValue() : 0);
                Number quantity = (Number) row[3];
                dto.setIntQUANTITY(quantity != null ? quantity.intValue() : 0);
                dto.setLgFAMILLEID((String) row[4]);
                dto.setGrossisteId((String) row[5]);
                dto.setTypeVente(dto.getGrossisteId());
                dto.setTicketName((String) row[6]);
                Number marge = (Number) row[7];
                dto.setMarge(marge != null ? marge.intValue() : 0);
                Number stock = (Number) row[8];
                dto.setIntQUANTITYSERVED(stock != null ? stock.intValue() : 0);

                list.add(dto);
            }
            return list;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public JSONObject geVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, VingtQuatreVingtType vingtQuatreVingtType) {
        List<VenteDetailsDTO> data = geVingtQuatreVingt(dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, start,
                limit, false, vingtQuatreVingtType);
        int total = data.size();

        return new JSONObject().put("total", total).put("data", new JSONArray(data));
    }

    List<FamilleArticleStatDTO> fetchDataForStatisticVenteRayons(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(
                    cb.construct(FamilleArticleStatDTO.class,
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                                    .get(TZoneGeographique_.strCODE),
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                                    .get(TZoneGeographique_.strLIBELLEE),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                            cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                                    root.get(TPreenregistrementDetail_.intQUANTITY))),
                            cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                                    .get(TZoneGeographique_.lgZONEGEOID)))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID));
            List<Predicate> predicates = famillePredicats(cb, root, join, dtStart, dtEnd, query, codeFamillle, u,
                    codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    List<FamilleArticleStatDTO> fetchDataForStatisticVenteGrossistes(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class,
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                            .get(TGrossiste_.strCODE),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                            .get(TGrossiste_.strLIBELLE),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                    root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                            .get(TGrossiste_.lgGROSSISTEID)))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID));
            List<Predicate> predicates = famillePredicats(cb, root, join, dtStart, dtEnd, query, codeFamillle, u,
                    codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParRayons(String dtStart, String dtEnd,
            String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste) {
        List<FamilleArticleStatDTO> list = new ArrayList<>();
        FamilleArticleStatDTO summary = new FamilleArticleStatDTO();
        try {
            LongAdder montantTTC = new LongAdder();
            LongAdder montantMarge = new LongAdder();
            LongAdder montantHT = new LongAdder();
            LongAdder montantAchat = new LongAdder();
            final LocalDate periode = LocalDate.parse(dtStart);
            final long montanttotalHt = totalMontantHT(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query,
                    codeFamile, u, codeRayon, codeGrossiste);
            fetchDataForStatisticVenteRayons(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                    codeRayon, codeGrossiste).stream().sorted(comparator).forEach(x -> {
                        montantMarge.add(x.getMontantMarge());
                        montantTTC.add(x.getMontantTTC());
                        montantAchat.add(x.getMontantAchat());
                        montantHT.add(x.getMontantHT());
                        cumulStatisticRayons(periode, x, u);
                        Double p = new BigDecimal(Double.valueOf(x.getMontantHT()) / montanttotalHt)
                                .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
                        x.setPourcentageTH(p.longValue());
                        list.add(x);

                    });
            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            try {
                summary.setPourcentageTH((montanttotalHt / montanttotalHt) * 100);
            } catch (ArithmeticException e) {
            }

            Double ux = new BigDecimal(Double.valueOf(summary.getMontantCumulMarge()) / summary.getMontantCumulHT())
                    .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
            summary.setPourcentageCumulMage(ux.longValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return Pair.of(summary, list);

    }

    @Override
    public Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParGrossistes(String dtStart,
            String dtEnd, String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste) {
        List<FamilleArticleStatDTO> list = new ArrayList<>();
        FamilleArticleStatDTO summary = new FamilleArticleStatDTO();
        try {
            LongAdder montantTTC = new LongAdder();
            LongAdder montantMarge = new LongAdder();
            LongAdder montantHT = new LongAdder();
            LongAdder montantAchat = new LongAdder();
            final LocalDate periode = LocalDate.parse(dtStart);
            final long montanttotalHt = totalMontantHT(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query,
                    codeFamile, u, codeRayon, codeGrossiste);
            fetchDataForStatisticVenteGrossistes(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                    codeRayon, codeGrossiste).stream().sorted(comparator).forEach(x -> {
                        montantMarge.add(x.getMontantMarge());
                        montantTTC.add(x.getMontantTTC());
                        montantAchat.add(x.getMontantAchat());
                        montantHT.add(x.getMontantHT());
                        cumulStatisticGrossistes(periode, x, u);
                        Double p = new BigDecimal(Double.valueOf(x.getMontantHT()) / montanttotalHt)
                                .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
                        x.setPourcentageTH(p.longValue());
                        list.add(x);

                    });
            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            summary.setPourcentageTH((montanttotalHt / montanttotalHt) * 100);
            Double ux = new BigDecimal(Double.valueOf(summary.getMontantCumulMarge()) / summary.getMontantCumulHT())
                    .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
            summary.setPourcentageCumulMage(ux.longValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return Pair.of(summary, list);

    }

    @Override
    public JSONObject statistiqueParRayonsView(String dtStart, String dtEnd, String codeFamile, String query, TUser u,
            String codeRayon, String codeGrossiste) throws JSONException {
        JSONObject json = new JSONObject();
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = statistiqueParRayons(dtStart, dtEnd, codeFamile,
                query, u, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> l = pair.getRight();
        json.put("success", true);
        json.put("total", l.size());
        json.put("data", new JSONArray(l));
        json.put("metaData", new JSONObject(pair.getLeft()));
        return json;
    }

    @Override
    public JSONObject statistiqueParGrossistesView(String dtStart, String dtEnd, String codeFamile, String query,
            TUser u, String codeRayon, String codeGrossiste) throws JSONException {
        JSONObject json = new JSONObject();
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = statistiqueParGrossistes(dtStart, dtEnd,
                codeFamile, query, u, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> l = pair.getRight();
        json.put("success", true);
        json.put("total", l.size());
        json.put("data", new JSONArray(l));
        json.put("metaData", new JSONObject(pair.getLeft()));
        return json;
    }

    FamilleArticleStatDTO cumulStatisticRayons(LocalDate periode, FamilleArticleStatDTO familleArticleStatDTO,
            TUser u) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class, cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE))));
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgZONEGEOID)
                    .get(TZoneGeographique_.lgZONEGEOID), familleArticleStatDTO.getFamilleId()));
            Predicate btw = cb.equal(cb.function("YEAR", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    periode.getYear());
            predicates.add(btw);
            predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
            predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
            predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                    DateConverter.DEPOT_EXTENSION));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            FamilleArticleStatDTO t = q.getSingleResult();
            familleArticleStatDTO.setMontantCumulAchat(t.getMontantCumulAchat());
            familleArticleStatDTO.setMontantCumulTTC(t.getMontantCumulTTC());
            familleArticleStatDTO.setMontantCumulTva(t.getMontantCumulTva());
            familleArticleStatDTO.setMontantCumulHT(t.getMontantCumulHT());
            Double p = new BigDecimal(
                    Double.valueOf(familleArticleStatDTO.getMontantHT()) / familleArticleStatDTO.getMontantCumulHT())
                            .setScale(2, RoundingMode.HALF_UP).doubleValue()
                    * 100;
            familleArticleStatDTO.setValeurPeriode(p.intValue());
            return familleArticleStatDTO;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return familleArticleStatDTO;
        }
    }

    FamilleArticleStatDTO cumulStatisticGrossistes(LocalDate periode, FamilleArticleStatDTO familleArticleStatDTO,
            TUser u) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class, cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE))));
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgGROSSISTEID)
                    .get(TGrossiste_.lgGROSSISTEID), familleArticleStatDTO.getFamilleId()));
            Predicate btw = cb.equal(cb.function("YEAR", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    periode.getYear());
            predicates.add(btw);
            predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
            predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
            predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                    DateConverter.DEPOT_EXTENSION));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            FamilleArticleStatDTO t = q.getSingleResult();
            familleArticleStatDTO.setMontantCumulAchat(t.getMontantCumulAchat());
            familleArticleStatDTO.setMontantCumulTTC(t.getMontantCumulTTC());
            familleArticleStatDTO.setMontantCumulTva(t.getMontantCumulTva());
            familleArticleStatDTO.setMontantCumulHT(t.getMontantCumulHT());
            Double p = new BigDecimal(
                    Double.valueOf(familleArticleStatDTO.getMontantHT()) / familleArticleStatDTO.getMontantCumulHT())
                            .setScale(2, RoundingMode.HALF_UP).doubleValue()
                    * 100;
            familleArticleStatDTO.setValeurPeriode(p.intValue());
            return familleArticleStatDTO;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return familleArticleStatDTO;
        }
    }

    List<FamilleArticleStatDTO> findPreenregistrementDetailsVeto(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(
                    cb.construct(FamilleArticleStatDTO.class,
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                                    .get(TFamillearticle_.strCODEFAMILLE),
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                                    .get(TFamillearticle_.strLIBELLE),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                            cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                                    root.get(TPreenregistrementDetail_.intQUANTITY))),
                            cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                            cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                            root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID).get(
                                    TFamillearticle_.lgFAMILLEARTICLEID),
                            join.get(TPreenregistrement_.strTYPEVENTE)))
                    .groupBy(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID),
                            join.get(TPreenregistrement_.strTYPEVENTE));
            List<Predicate> predicates = famillePredicats(cb, root, join, dtStart, dtEnd, query, codeFamillle, u,
                    codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            List<FamilleArticleStatDTO> results = q.getResultList();
            results.addAll(buildArticleStatDTOs(dtStart, dtEnd, query, codeFamillle, u, codeRayon, codeGrossiste));
            return results;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    FamilleArticleStatDTO cumulFamilleArticlesVeto(LocalDate periode, FamilleArticleStatDTO familleArticleStatDTO,
            TUser u) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<FamilleArticleStatDTO> cq = cb.createQuery(FamilleArticleStatDTO.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(FamilleArticleStatDTO.class, cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(cb.prod(root.get(TPreenregistrementDetail_.prixAchat),
                            root.get(TPreenregistrementDetail_.intQUANTITY))),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva)),
                    cb.sum(root.get(TPreenregistrementDetail_.intPRICEREMISE)),
                    cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY))));
            predicates.add(cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEARTICLEID)
                    .get(TFamillearticle_.lgFAMILLEARTICLEID), familleArticleStatDTO.getFamilleId()));
            Predicate btw = cb.equal(cb.function("YEAR", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    periode.getYear());
            predicates.add(btw);
            predicates.add(cb.equal(join.get(TPreenregistrement_.lgUSERID).get(TUser_.lgEMPLACEMENTID), emp));
            predicates.add(cb.equal(join.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(join.get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0));
            predicates.add(cb.notLike(join.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                    DateConverter.DEPOT_EXTENSION));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleArticleStatDTO> q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            FamilleArticleStatDTO t = q.getSingleResult();
            familleArticleStatDTO.setMontantCumulAchat(t.getMontantCumulAchat());
            familleArticleStatDTO.setMontantCumulTTC(t.getMontantCumulTTC());
            familleArticleStatDTO.setMontantCumulTva(t.getMontantCumulTva());
            familleArticleStatDTO.setMontantCumulHT(t.getMontantCumulHT());
            Double p = new BigDecimal(
                    Double.valueOf(familleArticleStatDTO.getMontantHT()) / familleArticleStatDTO.getMontantCumulHT())
                            .setScale(2, RoundingMode.HALF_UP).doubleValue()
                    * 100;
            familleArticleStatDTO.setValeurPeriode(p.intValue());
            return familleArticleStatDTO;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return familleArticleStatDTO;
        }
    }

    @Override
    public JSONObject statistiqueParFamilleArticleViewVeto(String dtStart, String dtEnd, String codeFamile,
            String query, TUser u, String codeRayon, String codeGrossiste) throws JSONException {
        JSONObject json = new JSONObject();
        Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> pair = statistiqueParFamilleArticleVeto(dtStart, dtEnd,
                codeFamile, query, u, codeRayon, codeGrossiste);
        List<FamilleArticleStatDTO> l = pair.getRight();
        json.put("success", true);
        json.put("total", l.size());
        json.put("data", new JSONArray(l));
        json.put("metaData", new JSONObject(pair.getLeft()));
        return json;
    }

    @Override
    public Pair<FamilleArticleStatDTO, List<FamilleArticleStatDTO>> statistiqueParFamilleArticleVeto(String dtStart,
            String dtEnd, String codeFamile, String query, TUser u, String codeRayon, String codeGrossiste) {
        List<FamilleArticleStatDTO> list = new ArrayList<>();
        FamilleArticleStatDTO summary = new FamilleArticleStatDTO();
        try {
            LongAdder montantTTC = new LongAdder();
            LongAdder montantMarge = new LongAdder();
            LongAdder montantHT = new LongAdder();
            LongAdder montantAchat = new LongAdder();
            LongAdder montantCumulRemise = new LongAdder();
            LongAdder totalRemiseVO = new LongAdder();
            LongAdder totalRemiseVNO = new LongAdder();
            LongAdder totalRemiseVetoVO = new LongAdder();
            LongAdder totalRemiseVeto = new LongAdder();
            LongAdder totalRemiseVetoVNO = new LongAdder();
            LongAdder totalCaVO = new LongAdder();
            LongAdder totalCaVNO = new LongAdder();
            LongAdder totalCaVetoVO = new LongAdder();
            LongAdder totalCaVetoVNO = new LongAdder();
            LongAdder totalCaVeto = new LongAdder();
            final LocalDate periode = LocalDate.parse(dtStart);
            long period = ChronoUnit.MONTHS.between(LocalDate.parse(dtStart), LocalDate.parse(dtEnd));
            final long montanttotalHt = totalMontantBrutHT(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query,
                    codeFamile, u, codeRayon, codeGrossiste)
                    - montantHtAnnulation(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                            codeRayon, codeGrossiste);

            if (period > 0) {
                findPreenregistrementDetailsVeto(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                        codeRayon, codeGrossiste).stream()
                                .collect(Collectors.groupingBy(FamilleArticleStatDTO::getFamilleId))
                                .forEach((key, v) -> {
                                    FamilleArticleStatDTO familleArticleStat = new FamilleArticleStatDTO();
                                    familleArticleStat.setCode(v.get(0).getCode());
                                    familleArticleStat.setFamilleId(key);
                                    familleArticleStat.setLibelle(v.get(0).getLibelle());
                                    LongAdder montantHT_ = new LongAdder();
                                    v.forEach(x -> {
                                        montantMarge.add(x.getMontantMarge());
                                        montantTTC.add(x.getMontantTTC());
                                        montantAchat.add(x.getMontantAchat());
                                        montantHT.add(x.getMontantHT());
                                        montantHT_.add(x.getMontantHT());
                                        montantCumulRemise.add(x.getMontantRemise());
                                        familleArticleStat
                                                .setMontantTTC(familleArticleStat.getMontantTTC() + x.getMontantTTC());
                                        familleArticleStat.setMontantAchat(
                                                familleArticleStat.getMontantAchat() + x.getMontantAchat());
                                        familleArticleStat
                                                .setMontantTva(familleArticleStat.getMontantTva() + x.getMontantTva());
                                        familleArticleStat.setMontantRemise(
                                                familleArticleStat.getMontantRemise() + x.getMontantRemise());
                                        familleArticleStat
                                                .setMontantHT(familleArticleStat.getMontantHT() + x.getMontantHT());
                                        if (x.getTypeVente().equals(DateConverter.VENTE_ASSURANCE)) {
                                            if (x.getFamilleId().equals(DateConverter.VETERINAIRE)) {
                                                totalRemiseVetoVO.add(x.getMontantRemise());
                                                totalRemiseVeto.add(x.getMontantRemise());
                                                totalCaVeto.add(x.getMontantTTC());
                                                totalCaVetoVO.add(x.getMontantTTC());
                                            }
                                            totalCaVO.add(x.getMontantTTC());
                                            totalRemiseVO.add(x.getMontantRemise());
                                        } else {
                                            if (x.getFamilleId().equals(DateConverter.VETERINAIRE)) {
                                                totalRemiseVetoVNO.add(x.getMontantRemise());
                                                totalRemiseVeto.add(x.getMontantRemise());
                                                totalCaVeto.add(x.getMontantTTC());
                                                totalCaVetoVNO.add(x.getMontantTTC());
                                            }
                                            totalCaVNO.add(x.getMontantTTC());
                                            totalRemiseVNO.add(x.getMontantRemise());
                                        }
                                    });
                                    Double p = new BigDecimal(Double.valueOf(montantHT_.longValue()) / montanttotalHt)
                                            .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
                                    familleArticleStat.setPourcentageTH(p.longValue());
                                    Double ma = new BigDecimal(Double.valueOf(
                                            familleArticleStat.getMontantHT() - familleArticleStat.getMontantAchat())
                                            / familleArticleStat.getMontantHT()).setScale(2, RoundingMode.HALF_UP)
                                                    .doubleValue()
                                            * 100;
                                    familleArticleStat.setMontantMarge(
                                            familleArticleStat.getMontantHT() - familleArticleStat.getMontantAchat());
                                    familleArticleStat.setPourcentageMage(ma.intValue());
                                    list.add(familleArticleStat);
                                });
            } else {
                findPreenregistrementDetailsVeto(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                        codeRayon, codeGrossiste).stream()
                                .collect(Collectors.groupingBy(FamilleArticleStatDTO::getFamilleId))
                                .forEach((key, v) -> {
                                    FamilleArticleStatDTO familleArticleStat = new FamilleArticleStatDTO();
                                    familleArticleStat.setCode(v.get(0).getCode());
                                    familleArticleStat.setFamilleId(key);
                                    familleArticleStat.setLibelle(v.get(0).getLibelle());
                                    LongAdder montantHT_ = new LongAdder();
                                    v.forEach(x -> {
                                        montantMarge.add(x.getMontantMarge());
                                        montantTTC.add(x.getMontantTTC());
                                        montantAchat.add(x.getMontantAchat());
                                        montantHT.add(x.getMontantHT());
                                        montantCumulRemise.add(x.getMontantRemise());
                                        montantHT_.add(x.getMontantHT());
                                        familleArticleStat
                                                .setMontantTTC(familleArticleStat.getMontantTTC() + x.getMontantTTC());
                                        familleArticleStat.setMontantAchat(
                                                familleArticleStat.getMontantAchat() + x.getMontantAchat());
                                        familleArticleStat
                                                .setMontantTva(familleArticleStat.getMontantTva() + x.getMontantTva());
                                        familleArticleStat.setMontantRemise(
                                                familleArticleStat.getMontantRemise() + x.getMontantRemise());
                                        familleArticleStat
                                                .setMontantHT(familleArticleStat.getMontantHT() + x.getMontantHT());
                                        if (x.getTypeVente().equals(DateConverter.VENTE_ASSURANCE)) {
                                            if (x.getFamilleId().equals(DateConverter.VETERINAIRE)) {
                                                totalRemiseVetoVO.add(x.getMontantRemise());
                                                totalRemiseVeto.add(x.getMontantRemise());
                                                totalCaVeto.add(x.getMontantTTC());
                                                totalCaVetoVO.add(x.getMontantTTC());
                                            }
                                            totalCaVO.add(x.getMontantTTC());
                                            totalRemiseVO.add(x.getMontantRemise());
                                        } else {
                                            if (x.getFamilleId().equals(DateConverter.VETERINAIRE)) {
                                                totalRemiseVetoVNO.add(x.getMontantRemise());
                                                totalRemiseVeto.add(x.getMontantRemise());
                                                totalCaVeto.add(x.getMontantTTC());
                                                totalCaVetoVNO.add(x.getMontantTTC());
                                            }
                                            totalCaVNO.add(x.getMontantTTC());
                                            totalRemiseVNO.add(x.getMontantRemise());
                                        }
                                    });
                                    Double p = new BigDecimal(Double.valueOf(montantHT_.longValue()) / montanttotalHt)
                                            .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
                                    familleArticleStat.setPourcentageTH(p.longValue());
                                    Double ma = new BigDecimal(Double.valueOf(
                                            familleArticleStat.getMontantHT() - familleArticleStat.getMontantAchat())
                                            / familleArticleStat.getMontantHT()).setScale(2, RoundingMode.HALF_UP)
                                                    .doubleValue()
                                            * 100;
                                    familleArticleStat.setMontantMarge(
                                            familleArticleStat.getMontantHT() - familleArticleStat.getMontantAchat());
                                    familleArticleStat.setPourcentageMage(ma.intValue());
                                    list.add(familleArticleStat);
                                    cumulFamilleArticlesVeto(periode, familleArticleStat, u);
                                });
            }

            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            try {
                summary.setPourcentageTH((montanttotalHt / montanttotalHt) * 100);
            } catch (Exception e) {
            }
            Double ux = 0d;
            try {
                ux = new BigDecimal(Double.valueOf(summary.getMontantCumulMarge()) / summary.getMontantCumulHT())
                        .setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
            } catch (Exception e) {
            }

            summary.setPourcentageCumulMage(ux.longValue());
            summary.setTotalCaVNO(totalCaVNO.longValue());
            summary.setTotalCaVO(totalCaVO.longValue());
            summary.setTotalCaVeto(totalCaVeto.longValue());
            summary.setTotalCaVetoVNO(totalCaVetoVNO.longValue());
            summary.setTotalCaVetoVO(totalCaVetoVO.longValue());
            summary.setMontantCumulRemise(montantCumulRemise.longValue());
            summary.setTotalRemiseVNO(totalRemiseVNO.longValue());
            summary.setTotalRemiseVO(totalRemiseVO.longValue());
            summary.setTotalRemiseVeto(totalRemiseVeto.longValue());
            summary.setTotalRemiseVetoVNO(totalRemiseVetoVNO.longValue());
            summary.setTotalRemiseVetoVO(totalRemiseVetoVO.longValue());
        } catch (Exception e) {
        }
        list.sort(comparator);
        return Pair.of(summary, list);

    }

    long totalMontantBrutHT(LocalDate dtStart, LocalDate dtEnd, String query, String codeFamillle, TUser u,
            String codeRayon, String codeGrossiste) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Number> cq = cb.createQuery(Number.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.diff(cb.sum(root.get(TPreenregistrementDetail_.intPRICE)),
                    cb.sum(root.get(TPreenregistrementDetail_.montantTva))));

            List<Predicate> predicates = famillePredicats(cb, root, join, dtStart, dtEnd, query, codeFamillle, u,
                    codeRayon, codeGrossiste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            q.setMaxResults(1);
            return ((Number) q.getSingleResult()).longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<TPreenregistrementDetail> itemsFromAnnulationAnterieurs(LocalDate dtStart, LocalDate dtEnd) {
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID IN (SELECT e.preenregistrement FROM AnnulationSnapshot e WHERE FUNCTION('DATE',e.createdAt) BETWEEN ?1 AND ?2)",
                    TPreenregistrementDetail.class);
            q.setParameter(1, java.sql.Date.valueOf(dtStart));
            q.setParameter(2, java.sql.Date.valueOf(dtEnd));
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private final BiPredicate<TPreenregistrementDetail, String> queryPredicat = (item, query) -> {
        if (StringUtils.isEmpty(query)) {
            return true;
        }
        return item.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE().contains(query.toUpperCase());

    };

    private final BiPredicate<TPreenregistrementDetail, String> codeFamilllePredicat = (item, codeFamillle) -> {
        if (StringUtils.isEmpty(codeFamillle)) {
            return true;
        }
        return item.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE().equals(codeFamillle);

    };
    private final BiPredicate<TPreenregistrementDetail, String> codeRayonPredicat = (item, code) -> {
        if (StringUtils.isEmpty(code)) {
            return true;
        }
        return item.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE().equals(code);

    };
    private final BiPredicate<TPreenregistrementDetail, String> codeGrossistePredicat = (item, code) -> {
        if (StringUtils.isEmpty(code)) {
            return true;
        }
        return item.getLgFAMILLEID().getLgGROSSISTEID().getStrLIBELLE().equals(code);

    };

    private List<TPreenregistrementDetail> itemsFromAnnulationAnterieurs(LocalDate dtStart, LocalDate dtEnd,
            String query, String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        if (1 == 1) {
            return Collections.emptyList();
        }
        List<TPreenregistrementDetail> details = itemsFromAnnulationAnterieurs(dtStart, dtEnd);

        if (StringUtils.isNotEmpty(codeFamillle)) {
            return details.stream().filter(e -> codeFamilllePredicat.test(e, codeFamillle))
                    .filter(e1 -> codeRayonPredicat.test(e1, codeRayon))
                    .filter(e2 -> codeGrossistePredicat.test(e2, codeGrossiste)).collect(Collectors.toList());
        } else if (StringUtils.isNotEmpty(query)) {
            return details.stream().filter(e -> queryPredicat.test(e, query))
                    .filter(e1 -> codeRayonPredicat.test(e1, codeRayon))
                    .filter(e2 -> codeGrossistePredicat.test(e2, codeGrossiste)).collect(Collectors.toList());
        }
        return details;
    }

    private long montantHtAnnulation(LocalDate dtStart, LocalDate dtEnd, String query, String codeFamillle, TUser u,
            String codeRayon, String codeGrossiste) {
        long montantttc = 0;
        long montantTva = 0;
        List<TPreenregistrementDetail> details = itemsFromAnnulationAnterieurs(dtStart, dtEnd, query, codeFamillle, u,
                codeRayon, codeGrossiste);
        for (TPreenregistrementDetail detail : details) {
            montantttc += detail.getIntPRICE();
            montantTva += detail.getMontantTva();
        }

        return 0;
    }

    private List<FamilleArticleStatDTO> buildArticleStatDTOs(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        List<TPreenregistrementDetail> details = itemsFromAnnulationAnterieurs(dtStart, dtEnd, query, codeFamillle, u,
                codeRayon, codeGrossiste);

        Map<TFamillearticle, List<TPreenregistrementDetail>> groupeByFamille = details.stream()
                .collect(Collectors.groupingBy(e -> e.getLgFAMILLEID().getLgFAMILLEARTICLEID()));
        List<FamilleArticleStatDTO> results = new ArrayList<>();
        for (Map.Entry<TFamillearticle, List<TPreenregistrementDetail>> entry : groupeByFamille.entrySet()) {
            TFamillearticle key = entry.getKey();
            List<TPreenregistrementDetail> val = entry.getValue();
            Map<String, List<TPreenregistrementDetail>> groupeTypeVente = val.stream()
                    .collect(Collectors.groupingBy(e -> e.getLgPREENREGISTREMENTID().getStrTYPEVENTE()));
            for (Map.Entry<String, List<TPreenregistrementDetail>> entry1 : groupeTypeVente.entrySet()) {
                String typeVente = entry1.getKey();
                List<TPreenregistrementDetail> itemsByTypeVente = entry1.getValue();
                FamilleArticleStatDTO o = new FamilleArticleStatDTO();
                o.setTypeVente(typeVente);
                o.setFamilleId(key.getLgFAMILLEARTICLEID());
                o.setCode(key.getStrCODEFAMILLE());
                long montantTTC = 0;
                long montantTva = 0;
                long montantAchat = 0;
                long montantRemise = 0;
                for (TPreenregistrementDetail p : itemsByTypeVente) {
                    montantTTC += p.getIntPRICE();
                    montantTva += p.getMontantTva();
                    montantAchat += (p.getPrixAchat() * p.getIntQUANTITY());
                    montantRemise += p.getIntPRICEREMISE();
                }
                o.setMontantAchat(montantAchat * (-1));
                o.setMontantTva(montantTva * (-1));
                o.setMontantTTC(montantTTC * (-1));
                long montantHT = montantTTC - montantTva;
                o.setMontantHT(montantHT * (-1));
                o.setMontantRemise(montantRemise * (-1));
                long marge = (montantTTC - montantTva) - montantAchat;
                o.setMontantMarge(marge * (-1));
                Double p = new BigDecimal(Double.valueOf(marge) / montantHT).setScale(2, RoundingMode.HALF_UP)
                        .doubleValue() * 100;
                o.setPourcentageMage(p.intValue() * (-1));
                results.add(o);
            }

        }
        return results;

    }

    @Override
    public byte[] buildVingtQuatreVingtExcel(String dtStart, String dtEnd, String codeFamille, String codeRayon,
            String codeGrossiste, VingtQuatreVingtType vingtQuatreVingtType) throws JSONException {
        List<VenteDetailsDTO> datas = geVingtQuatreVingt(dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, 0, 0,
                true, vingtQuatreVingtType);
        if (datas.isEmpty()) {
            return new byte[0];
        }

        String[] headers = { "CIP", "Libellé", "Montant", "Marge", "Quantité", "Stock", "Famille" };
        String title = "Rapport 20/80 du " + dtStart + " au " + dtEnd;

        try {
            return reportExcelExportService.createExcelReport(title, headers, datas, (row, d) -> {
                int col = 0;
                row.createCell(col++).setCellValue(d.getIntCIP());
                row.createCell(col++).setCellValue(d.getStrNAME());
                row.createCell(col++).setCellValue(d.getIntPRICE());
                row.createCell(col++).setCellValue(d.getMarge());
                row.createCell(col++).setCellValue(d.getIntQUANTITY());
                row.createCell(col++).setCellValue(d.getIntQUANTITYSERVED());
                row.createCell(col++).setCellValue(d.getTicketName());
                row.createCell(col++).setCellValue(d.getMarge());
            });
        } catch (IOException e) {
            // LOG.log(Level.SEVERE, "buildVingtQuatreVingtExcel error", e);
            return new byte[0];
        }
    }

    @Override
    public byte[] buildVingtQuatreVingtCsv(String dtStart, String dtEnd, String codeFamille, String codeRayon,
            String codeGrossiste, VingtQuatreVingtType vingtQuatreVingtType) throws JSONException {
        List<VenteDetailsDTO> datas = geVingtQuatreVingt(dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, 0, 0,
                true, vingtQuatreVingtType);
        if (datas.isEmpty()) {
            return new byte[0];
        }

        String[] headers = { "CIP", "Libellé", "Montant", "Marge", "Quantité", "Stock", "Famille" };
        String title = "Rapport 20/80 du " + dtStart + " au " + dtEnd;

        try {
            byte[] raw = csvExportService.createCsvReport(title, headers, datas,
                    d -> new String[] { d.getIntCIP(), d.getStrNAME(), String.valueOf(d.getIntPRICE()),
                            String.valueOf(d.getMarge()), String.valueOf(d.getIntQUANTITY()),
                            String.valueOf(d.getIntQUANTITYSERVED()), d.getTicketName() });
            return csvExportService.addUtf8Bom(raw);
        } catch (IOException e) {
            // LOG.log(Level.SEVERE, "buildVingtQuatreVingtCsv error", e);
            return new byte[0];
        }
    }

    @Override
    public JSONObject createInventaireVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, VingtQuatreVingtType vingtQuatreVingtType) throws JSONException {

        // Récupère TOUT le 20/80 correspondant aux filtres
        List<VenteDetailsDTO> data = geVingtQuatreVingt(dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, 0, 0,
                true, vingtQuatreVingtType);

        if (data.isEmpty()) {
            return new JSONObject().put("count", 0);
        }

        // On ne garde que les IDs produits uniques
        java.util.Set<String> ids = data.stream().map(VenteDetailsDTO::getLgFAMILLEID)
                .collect(java.util.stream.Collectors.toSet());

        java.time.LocalDate d1 = null;
        java.time.LocalDate d2 = null;

        try {
            d1 = java.time.LocalDate.parse(dtStart);
        } catch (Exception e) {
        }
        try {
            d2 = java.time.LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String periode;
        if (d1 != null && d2 != null) {
            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            periode = "du " + d1.format(fmt) + " au " + d2.format(fmt);
        } else {
            periode = "";
        }

        String type;
        switch (vingtQuatreVingtType) {
        case QTY:
            type = "Quantité";
            break;
        case CA:
            type = "Chiffre d'affaires";
            break;
        case MARGE:
            type = "Marge";
            break;
        default:
            throw new AssertionError();
        }
        String title = "Inventaire produits 20/80 (" + type + ") " + periode;

        int count = inventaireService.create(ids, title);

        return new JSONObject().put("count", count);
    }

}
