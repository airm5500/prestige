/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.AddLot;
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
import dal.TFamillearticle;
import dal.TFamillearticle_;
import dal.TGrossiste;
import dal.TGrossiste_;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaire_;
import dal.TLot;
import dal.TLot_;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TUser;
import dal.TUser_;
import dal.TWarehouse;
import dal.TWarehouse_;
import dal.TZoneGeographique;
import dal.TZoneGeographique_;
import enumeration.MargeEnum;
import static enumeration.MargeEnum.EQUAL;
import static enumeration.MargeEnum.GREATER;
import static enumeration.MargeEnum.GREATER_EQUAL;
import static enumeration.MargeEnum.LESS;
import static enumeration.MargeEnum.LESS_EQUAL;
import static enumeration.MargeEnum.NOT;
import static enumeration.MargeEnum.STOCK_LESS_THAN_SEUIL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
import rest.service.dto.UpdateProduit;
import util.Constant;
import util.DateCommonUtils;
import util.DateConverter;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import rest.service.InventaireService;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.Set;
import org.json.JSONException;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;
import rest.service.InventaireService;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;
import java.io.IOException;
import rest.service.LotService;

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

    @EJB
    private CsvExportService csvExportService;

    @EJB
    private ReportExcelExportService reportExcelExportService;

    @EJB
    private InventaireService inventaireService;
    @EJB
    private LotService lotService;

    @Override
    public JSONObject produitPerimes(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, int start, int limit) throws JSONException {
        Pair<commonTasks.dto.LotDTO, List<commonTasks.dto.LotDTO>> p = produitPerimes(query, nbreMois, dtStart, dtEnd,
                codeFamile, codeRayon, codeGrossiste, start, limit, false);
        List<commonTasks.dto.LotDTO> data = p.getRight();
        return new JSONObject()
                .put("total",
                        produitPerimesCount(query, nbreMois, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste,
                                sessionHelperService.getCurrentUser().getLgEMPLACEMENTID()))
                .put("data", new JSONArray(data)).put("metaData", new JSONObject(p.getLeft()));
    }

    private commonTasks.dto.LotDTO produitPerimes(String query, int nbreMois, String dtStart, String dtEnd,
            TEmplacement emp, String codeFamille, String codeRayon, String codeGrossiste) throws Exception {
        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaQuery<commonTasks.dto.LotDTO> cq = cb.createQuery(commonTasks.dto.LotDTO.class);
        Root<TLot> root = cq.from(TLot.class);
        Join<TLot, TFamille> joinLot = root.join(TLot_.lgFAMILLEID);
        Join<TFamille, TFamilleStock> fa = joinLot.join(TFamille_.tFamilleStockCollection);
        Join<TFamille, TFamillearticle> joinFa = joinLot.join(TFamille_.lgFAMILLEARTICLEID);
        Join<TFamille, TGrossiste> joinFaG = joinLot.join(TFamille_.lgGROSSISTEID);
        Join<TFamille, TZoneGeographique> joinFaz = joinLot.join(TFamille_.lgZONEGEOID);

        List<Predicate> predicates = perimePredicat(cb, root, fa, joinLot, joinFa, joinFaG, joinFaz, query, nbreMois,
                dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, emp);
        cq.select(cb.construct(commonTasks.dto.LotDTO.class, cb.sum(root.get(TLot_.currentStock)),
                cb.sum(cb.prod(root.get(TLot_.currentStock), joinLot.get(TFamille_.intPAF))),
                cb.sum(cb.prod(root.get(TLot_.currentStock), joinLot.get(TFamille_.intPRICE)))));
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<commonTasks.dto.LotDTO> q = getEntityManager().createQuery(cq);
        q.setMaxResults(1);
        return q.getSingleResult();

    }

    @Override
    public Pair<commonTasks.dto.LotDTO, List<commonTasks.dto.LotDTO>> produitPerimes(String query, int nbreMois,
            String dtStart, String dtEnd, String codeFamille, String codeRayon, String codeGrossiste, int start,
            int limit, boolean all) {
        try {
            TEmplacement emp = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<commonTasks.dto.LotDTO> cq = cb.createQuery(commonTasks.dto.LotDTO.class);
            Root<TLot> root = cq.from(TLot.class);
            Join<TLot, TFamille> joinLot = root.join(TLot_.lgFAMILLEID);
            Join<TFamille, TFamilleStock> fa = joinLot.join(TFamille_.tFamilleStockCollection);
            Join<TFamille, TFamillearticle> joinFa = joinLot.join(TFamille_.lgFAMILLEARTICLEID);
            Join<TFamille, TGrossiste> joinFaG = joinLot.join(TFamille_.lgGROSSISTEID);
            Join<TFamille, TZoneGeographique> joinFaz = joinLot.join(TFamille_.lgZONEGEOID);

            List<Predicate> predicates = perimePredicat(cb, root, fa, joinLot, joinFa, joinFaG, joinFaz, query,
                    nbreMois, dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, emp);
            cq.select(cb.construct(commonTasks.dto.LotDTO.class, root.get(TLot_.lgLOTID), joinLot.get(TFamille_.intCIP),
                    joinFa.get(TFamillearticle_.strLIBELLE), joinFaz.get(TZoneGeographique_.strLIBELLEE),
                    joinLot.get(TFamille_.strNAME), root.get(TLot_.intNUMLOT), root.get(TLot_.dtPEREMPTION),
                    joinFaG.get(TGrossiste_.strLIBELLE), root.get(TLot_.intNUMBER),
                    cb.prod(root.get(TLot_.intNUMBER), joinLot.get(TFamille_.intPAF)),
                    cb.prod(root.get(TLot_.intNUMBER), joinLot.get(TFamille_.intPRICE))))

                    .orderBy(cb.asc(joinFaz.get(TZoneGeographique_.strLIBELLEE)), cb.asc(root.get(TLot_.dtPEREMPTION)));

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<commonTasks.dto.LotDTO> l = q.getResultList();
            if (l.isEmpty()) {
                return Pair.of(new commonTasks.dto.LotDTO(), Collections.emptyList());
            }
            commonTasks.dto.LotDTO summary = produitPerimes(query, nbreMois, dtStart, dtEnd, emp, codeFamille,
                    codeRayon, codeGrossiste);

            return Pair.of(summary, l);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produitPerimes", e);
            return Pair.of(new commonTasks.dto.LotDTO(), Collections.emptyList());
        }

    }

    /* ---- Visualisation des perimes (peremptionquery) : exports + inventaire ---- */

    private String perimesTitre(int nbreMois, String dtStart, String dtEnd) {
        StringBuilder titre = new StringBuilder("Peremptions proches");
        if (nbreMois > 0) {
            titre.append(" (").append(nbreMois).append(" mois)");
        } else if (!StringUtils.isEmpty(dtStart) && !StringUtils.isEmpty(dtEnd)) {
            titre.append(" du ").append(dtStart).append(" au ").append(dtEnd);
        }
        return titre.toString();
    }

    private static final String[] PERIMES_HEADERS = { "Numéro lot", "Code CIP", "Libellé", "Famille", "Emplacement",
            "Grossiste", "Quantité", "Valeur achat", "Valeur vente", "Date péremption", "Statut" };

    private String nvl(String value) {
        return value == null ? "" : value;
    }

    @Override
    public byte[] exportPerimesCsv(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws java.io.IOException {
        List<commonTasks.dto.LotDTO> data = produitPerimes(query, nbreMois, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste, 0, 0, true).getRight();
        byte[] csvData = csvExportService.createCsvReport(perimesTitre(nbreMois, dtStart, dtEnd), PERIMES_HEADERS, data,
                dto -> new String[] { nvl(dto.getNumLot()), nvl(dto.getCodeCip()), nvl(dto.getLibelle()),
                        nvl(dto.getLibelleFamille()), nvl(dto.getLibelleRayon()), nvl(dto.getLibelleGrossiste()),
                        String.valueOf(dto.getQuantiteLot() == null ? 0 : dto.getQuantiteLot()),
                        String.valueOf(dto.getValeurAchat() == null ? 0 : dto.getValeurAchat()),
                        String.valueOf(dto.getValeurVente() == null ? 0 : dto.getValeurVente()),
                        nvl(dto.getDatePerement()), nvl(dto.getStatut()) });
        return csvExportService.addUtf8Bom(csvData);
    }

    @Override
    public byte[] exportPerimesExcel(String query, int nbreMois, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws java.io.IOException {
        List<commonTasks.dto.LotDTO> data = produitPerimes(query, nbreMois, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste, 0, 0, true).getRight();
        return reportExcelExportService.createExcelReport(perimesTitre(nbreMois, dtStart, dtEnd), PERIMES_HEADERS, data,
                (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(nvl(dto.getNumLot()));
                    row.createCell(col++).setCellValue(nvl(dto.getCodeCip()));
                    row.createCell(col++).setCellValue(nvl(dto.getLibelle()));
                    row.createCell(col++).setCellValue(nvl(dto.getLibelleFamille()));
                    row.createCell(col++).setCellValue(nvl(dto.getLibelleRayon()));
                    row.createCell(col++).setCellValue(nvl(dto.getLibelleGrossiste()));
                    row.createCell(col++).setCellValue(dto.getQuantiteLot() == null ? 0 : dto.getQuantiteLot());
                    row.createCell(col++).setCellValue(dto.getValeurAchat() == null ? 0 : dto.getValeurAchat());
                    row.createCell(col++).setCellValue(dto.getValeurVente() == null ? 0 : dto.getValeurVente());
                    row.createCell(col++).setCellValue(nvl(dto.getDatePerement()));
                    row.createCell(col++).setCellValue(nvl(dto.getStatut()));
                });
    }

    @Override
    public java.util.Set<String> perimesProduitIds(String query, int nbreMois, String dtStart, String dtEnd,
            String codeFamile, String codeRayon, String codeGrossiste) {
        try {
            TEmplacement emp = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TLot> root = cq.from(TLot.class);
            Join<TLot, TFamille> joinLot = root.join(TLot_.lgFAMILLEID);
            Join<TFamille, TFamilleStock> fa = joinLot.join(TFamille_.tFamilleStockCollection);
            Join<TFamille, TFamillearticle> joinFa = joinLot.join(TFamille_.lgFAMILLEARTICLEID);
            Join<TFamille, TGrossiste> joinFaG = joinLot.join(TFamille_.lgGROSSISTEID);
            Join<TFamille, TZoneGeographique> joinFaz = joinLot.join(TFamille_.lgZONEGEOID);
            List<Predicate> predicates = perimePredicat(cb, root, fa, joinLot, joinFa, joinFaG, joinFaz, query,
                    nbreMois, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, emp);
            cq.select(joinLot.get(TFamille_.lgFAMILLEID)).distinct(true)
                    .where(cb.and(predicates.toArray(Predicate[]::new)));
            return new java.util.LinkedHashSet<>(getEntityManager().createQuery(cq).getResultList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "perimesProduitIds", e);
            return java.util.Collections.emptySet();
        }
    }

    @Override
    public JSONObject createInventairePerimes(String query, int nbreMois, String dtStart, String dtEnd,
            String codeFamile, String codeRayon, String codeGrossiste) throws JSONException {
        java.util.Set<String> ids = perimesProduitIds(query, nbreMois, dtStart, dtEnd, codeFamile, codeRayon,
                codeGrossiste);
        if (ids.isEmpty()) {
            return new JSONObject().put("success", false).put("count", 0).put("message",
                    "Aucun produit perime avec ces criteres");
        }
        String name = "Inventaire peremptions proches "
                + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(ids, name, name);
        return new JSONObject().put("success", true).put("count", count).put("name", name);
    }

    private List<Predicate> perimePredicat(CriteriaBuilder cb, Root<TLot> root, Join<TFamille, TFamilleStock> fa,
            Join<TLot, TFamille> joinLot, Join<TFamille, TFamillearticle> joinFa, Join<TFamille, TGrossiste> joinFaG,
            Join<TFamille, TZoneGeographique> joinFaz, String query, int nbreMois, String dtStart, String dtEnd,
            String codeFamille, String codeRayon, String codeGrossiste, TEmplacement emp) {
        LocalDate today = LocalDate.now();
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.isNotNull(root.get(TLot_.dtPEREMPTION)));
        predicates.add(cb.isNotNull(root.get(TLot_.intNUMLOT)));
        // predicates.add(cb.greaterThan(cb.diff(root.get(TLot_.intNUMBER), root.get(TLot_.intQTYVENDUE)), 0));
        predicates.add(cb.greaterThan(root.get(TLot_.currentStock), 0));
        predicates.add(cb.equal(joinLot.get(TFamille_.strSTATUT), Constant.STATUT_ENABLE));
        predicates.add(cb.greaterThan(fa.get(TFamilleStock_.intNUMBERAVAILABLE), 0));
        predicates.add(cb.equal(fa.get(TFamilleStock_.strSTATUT), Constant.STATUT_ENABLE));
        predicates.add(cb.equal(fa.get(TFamilleStock_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID),
                emp.getLgEMPLACEMENTID()));
        if (!StringUtils.isEmpty(query)) {
            query = query + "%";
            predicates.add(cb.or(cb.like(joinLot.get(TFamille_.intCIP), query),
                    cb.like(joinLot.get(TFamille_.strNAME), query)));
        }
        if (!StringUtils.isEmpty(codeFamille) && !codeFamille.equals("ALL")) {
            predicates.add(cb.equal(joinFa.get(TFamillearticle_.lgFAMILLEARTICLEID), codeFamille));
        }
        if (!StringUtils.isEmpty(codeRayon) && !codeRayon.equals("ALL")) {
            predicates.add(cb.equal(joinFaz.get(TZoneGeographique_.lgZONEGEOID), codeRayon));
        }
        if (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equals("ALL")) {
            predicates.add(cb.equal(joinFaG.get(TGrossiste_.lgGROSSISTEID), codeGrossiste));
        }
        // Bornes appliquees DIRECTEMENT sur la colonne dt_PEREMPTION (memes resultats que
        // l'ancien DATE(dt_PEREMPTION), qui interdisait tout usage d'index : chaque appel
        // parcourait la table t_lot entiere — jusqu'a saturer les threads HTTP du serveur
        // via le rafraichissement de la cloche de notifications).
        // Rappel : DATE(col) <= J <=> col < J+1 jour ; DATE(col) = J <=> J <= col < J+1.
        if (nbreMois > 0) {
            predicates.add(cb.greaterThanOrEqualTo(root.get(TLot_.dtPEREMPTION), java.sql.Date.valueOf(today)));
            predicates.add(cb.lessThan(root.get(TLot_.dtPEREMPTION),
                    java.sql.Date.valueOf(today.plusMonths(nbreMois).plusDays(1))));
        } else {
            if (StringUtils.isEmpty(dtEnd) && StringUtils.isEmpty(dtStart)) {
                predicates.add(cb.lessThan(root.get(TLot_.dtPEREMPTION), java.sql.Date.valueOf(today.plusDays(1))));
            } else {
                if (!StringUtils.isEmpty(dtEnd) && !StringUtils.isEmpty(dtStart)) {
                    predicates
                            .add(cb.greaterThanOrEqualTo(root.get(TLot_.dtPEREMPTION), java.sql.Date.valueOf(dtStart)));
                    predicates.add(cb.lessThan(root.get(TLot_.dtPEREMPTION),
                            java.sql.Date.valueOf(LocalDate.parse(dtEnd).plusDays(1))));
                } else {
                    if (!StringUtils.isEmpty(dtStart)) {
                        predicates.add(
                                cb.greaterThanOrEqualTo(root.get(TLot_.dtPEREMPTION), java.sql.Date.valueOf(dtStart)));
                        predicates.add(cb.lessThan(root.get(TLot_.dtPEREMPTION),
                                java.sql.Date.valueOf(LocalDate.parse(dtStart).plusDays(1))));
                    } else if (!StringUtils.isEmpty(dtEnd)) {
                        predicates.add(
                                cb.greaterThanOrEqualTo(root.get(TLot_.dtPEREMPTION), java.sql.Date.valueOf(dtEnd)));
                        predicates.add(cb.lessThan(root.get(TLot_.dtPEREMPTION),
                                java.sql.Date.valueOf(LocalDate.parse(dtEnd).plusDays(1))));
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
            famille.setDtPEREMPTION(DateCommonUtils.convertLocalDateToDate(LocalDate.parse(dtperemption)));
            getEntityManager().merge(famille);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
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
            LOG.log(Level.SEVERE, null, e);
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

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Object[]> typedQuery = getEntityManager().createQuery(cq);

            List<Object[]> resultList = typedQuery.getResultList();
            return resultList.stream().collect(Collectors.toMap(e -> e[0] + "", e -> Integer.valueOf(e[1] + "")));

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
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
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<FamilleDTO> typedQuery = getEntityManager().createQuery(cq);
            typedQuery.setFirstResult(start);
            typedQuery.setMaxResults(limit);

            List<FamilleDTO> resultList = typedQuery.getResultList();
            Long total = produitAccounts(query, u, rayon, filtre);
            return new JSONObject().put("total", total).put("data", new JSONArray(resultList));
        } catch (Exception e) {

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
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
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
                    return x.dateBon(getDateBonLivraison(x.getId())).dateEntree(ent).qtyEntree(qtyEntree)
                            .dateInventaire(getDateInventaire(x.getId(), emId))
                            .lastDateVente(getDateDerniereVente(x.getId(), emId))
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
                    .map(x -> x.dateBon(getDateBonLivraison(x.getId())).dateEntree(getDateEntreeStock(x.getId()))
                            .dateInventaire(getDateInventaire(x.getId(), emId))
                            .lastDateVente(getDateDerniereVente(x.getId(), emId)).grossisteId(x.getGrossisteId()))
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
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
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
    public Date getDateDerniereVente(String idProduit, String empl) {
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
    public Date getDateEntreeStock(String idProduit) {
        try {
            return bonLivraisonByArticleId(idProduit).getDtUPDATED();

        } catch (Exception e) {
            // e.printStackTrace();
            return null;

        }
    }

    @Override
    public Date getDateBonLivraison(String idProduit) {
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
    public Date getDateInventaire(String idProduit, String empl) {
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
        predicates.add(cb.equal(root.get(TWarehouse_.strSTATUT), Constant.STATUT_DELETE));
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

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
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
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "saisiePerimes", e);
            return 0;
        }
    }

    private List<VenteDetailsDTO> saisiePerimesAll(String query, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) {

        // all = true, start/limit = 0 ignorés
        return saisiePerimes(query, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, null, 0, 0, true);
    }

    @Override
    public void addLot(AddLot addLot) {
        lotService.addLot(addLot);
    }

    @Override
    public void updateProduitLiteInfo(UpdateProduit updateProduit) {
        TFamille famille = em.find(TFamille.class, updateProduit.getId());
        if (StringUtils.isNotEmpty(updateProduit.getCodeEanFabriquant())) {
            famille.setCodeEanFabriquant(updateProduit.getCodeEanFabriquant());
        }
        if (StringUtils.isNotEmpty(updateProduit.getRayonId())) {
            TZoneGeographique geographique = em.find(TZoneGeographique.class, updateProduit.getRayonId());
            famille.setLgZONEGEOID(geographique);
            famille.setLgZONEGEOID(geographique);
        }
        // Code Geo article (localisation fine - socle ABC Lot 0).
        // != null : une chaine vide permet d'effacer la valeur existante.
        if (updateProduit.getCodeGeoArticle() != null) {
            famille.setStrCODEGEOARTICLE(updateProduit.getCodeGeoArticle().trim());
        }
        em.merge(famille);
    }

    // ----------------------- MAJ SEUIL groupee (Q1/Q2 par produit) -----------------------

    /** Construit la clause WHERE (famille, emplacement, classe ABC + recherche) commune liste/ids. */
    private String majSeuilWhere(String codeFamille, String zoneGeoId, String search, String classeAbcId) {
        StringBuilder w = new StringBuilder(" WHERE f.str_STATUT='enable' ");
        if (StringUtils.isNotBlank(codeFamille)) {
            w.append(" AND f.lg_FAMILLEARTICLE_ID = :fam ");
        }
        if (StringUtils.isNotBlank(zoneGeoId)) {
            w.append(" AND f.lg_ZONE_GEO_ID = :zone ");
        }
        if (StringUtils.isNotBlank(classeAbcId)) {
            w.append(" AND f.lg_CLASSE_ABC_ID = :classeAbc ");
        }
        if (StringUtils.isNotBlank(search)) {
            w.append(" AND (f.int_CIP LIKE :s OR f.str_NAME LIKE :s) ");
        }
        return w.toString();
    }

    private void majSeuilParams(Query q, String codeFamille, String zoneGeoId, String search, String classeAbcId) {
        if (StringUtils.isNotBlank(codeFamille)) {
            q.setParameter("fam", codeFamille);
        }
        if (StringUtils.isNotBlank(zoneGeoId)) {
            q.setParameter("zone", zoneGeoId);
        }
        if (StringUtils.isNotBlank(classeAbcId)) {
            q.setParameter("classeAbc", classeAbcId);
        }
        if (StringUtils.isNotBlank(search)) {
            q.setParameter("s", "%" + search.trim() + "%");
        }
    }

    @Override
    public JSONObject majSeuilList(String codeFamille, String zoneGeoId, String search, String classeAbcId, int start,
            int limit) {
        JSONObject data = new JSONObject();
        JSONArray arr = new JSONArray();
        try {
            String where = majSeuilWhere(codeFamille, zoneGeoId, search, classeAbcId);
            Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, "
                    + "f.int_Q1_SEUIL_REAPPRO, f.int_Q2_QTE_REAPPRO FROM t_famille f " + where
                    + " ORDER BY f.str_NAME ASC");
            majSeuilParams(q, codeFamille, zoneGeoId, search, classeAbcId);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                arr.put(new JSONObject().put("lg_FAMILLE_ID", r[0] != null ? r[0].toString() : "")
                        .put("int_CIP", r[1] != null ? r[1] : "").put("str_NAME", r[2] != null ? r[2] : "")
                        .put("int_Q1_SEUIL_REAPPRO", r[3] != null ? r[3] : "")
                        .put("int_Q2_QTE_REAPPRO", r[4] != null ? r[4] : ""));
            }
            Query qc = em.createNativeQuery("SELECT COUNT(*) FROM t_famille f " + where);
            majSeuilParams(qc, codeFamille, zoneGeoId, search, classeAbcId);
            long total = ((Number) qc.getSingleResult()).longValue();
            data.put("total", total).put("data", arr);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "majSeuilList", e);
            data.put("total", 0).put("data", arr);
        }
        return data;
    }

    @Override
    public JSONObject majSeuilApply(String mode, String codeFamille, String zoneGeoId, String search,
            String classeAbcId, List<String> ids, List<String> uncheckedIds, Integer q1, Integer q2) {
        JSONObject res = new JSONObject();
        try {
            List<String> targets;
            if ("ALL".equalsIgnoreCase(mode)) {
                String where = majSeuilWhere(codeFamille, zoneGeoId, search, classeAbcId);
                Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID FROM t_famille f " + where);
                majSeuilParams(q, codeFamille, zoneGeoId, search, classeAbcId);
                targets = new java.util.ArrayList<>();
                for (Object o : q.getResultList()) {
                    if (o != null) {
                        targets.add(o.toString());
                    }
                }
                if (uncheckedIds != null && !uncheckedIds.isEmpty()) {
                    targets.removeAll(uncheckedIds);
                }
            } else {
                targets = (ids != null) ? new java.util.ArrayList<>(ids) : new java.util.ArrayList<>();
            }
            int count = 0;
            int chunk = 1000;
            for (int i = 0; i < targets.size(); i += chunk) {
                List<String> sub = targets.subList(i, Math.min(targets.size(), i + chunk));
                if (sub.isEmpty()) {
                    continue;
                }
                count += em
                        .createQuery("UPDATE TFamille f SET f.intQ1SEUILREAPPRO = :q1, "
                                + "f.intQ2QTEREAPPRO = :q2 WHERE f.lgFAMILLEID IN :ids")
                        .setParameter("q1", q1).setParameter("q2", q2).setParameter("ids", sub).executeUpdate();
            }
            res.put("success", true).put("count", count);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "majSeuilApply", e);
            res.put("success", false).put("count", 0);
        }
        return res;
    }

    // ----------------------- MAJ SELECTIVE (une donnee, plusieurs produits) -----------------------

    /** Champs modifiables par la MAJ selective. Une seule operation a la fois : l'ecran n'en propose qu'un. */
    private static final String CHAMP_GROSSISTE = "GROSSISTE";
    private static final String CHAMP_FAMILLE = "FAMILLE";
    private static final String CHAMP_TVA = "TVA";
    private static final String CHAMP_CODE_REMISE = "CODE_REMISE";
    private static final String CHAMP_CODE_TABLEAU = "CODE_TABLEAU";
    private static final String CHAMP_LABORATOIRE = "LABORATOIRE";
    private static final String CHAMP_GAMME = "GAMME";

    /**
     * Les combos « Tous » des services communs renvoient la valeur ALL - ou, pour les laboratoires et les gammes, un
     * simple espace. Dans les deux cas c'est l'absence de filtre, pas un identifiant : la confondre avec un identifiant
     * reel ne ramenerait aucune ligne, et l'utilisateur croirait le fichier vide.
     */
    static boolean filtreActif(String valeur) {
        return StringUtils.isNotBlank(valeur) && !"ALL".equalsIgnoreCase(valeur.trim());
    }

    private String majSelectiveWhere(String zoneGeoId, String codeFamille, String codeTableau, String codeTvaId,
            String codeRemise, String laboratoireId, String gammeId, String search) {
        StringBuilder w = new StringBuilder(" WHERE f.str_STATUT='enable' ");
        if (filtreActif(laboratoireId)) {
            w.append(" AND f.laboratoire_id = :labo ");
        }
        if (filtreActif(gammeId)) {
            w.append(" AND f.gamme_id = :gamme ");
        }
        if (filtreActif(zoneGeoId)) {
            w.append(" AND f.lg_ZONE_GEO_ID = :zone ");
        }
        if (filtreActif(codeFamille)) {
            w.append(" AND f.lg_FAMILLEARTICLE_ID = :fam ");
        }
        if (filtreActif(codeTableau)) {
            w.append(" AND f.int_T = :tableau ");
        }
        if (filtreActif(codeTvaId)) {
            w.append(" AND f.lg_CODE_TVA_ID = :tva ");
        }
        // Le code remise est vide sur une grande partie du fichier : « (vide) » doit rester selectionnable.
        if (filtreActif(codeRemise)) {
            w.append("VIDE".equalsIgnoreCase(codeRemise.trim())
                    ? " AND (f.str_CODE_REMISE IS NULL OR f.str_CODE_REMISE = '') "
                    : " AND f.str_CODE_REMISE = :remise ");
        }
        if (StringUtils.isNotBlank(search)) {
            w.append(" AND (f.int_CIP LIKE :s OR f.str_NAME LIKE :s) ");
        }
        return w.toString();
    }

    private void majSelectiveParams(Query q, String zoneGeoId, String codeFamille, String codeTableau, String codeTvaId,
            String codeRemise, String laboratoireId, String gammeId, String search) {
        if (filtreActif(laboratoireId)) {
            q.setParameter("labo", laboratoireId);
        }
        if (filtreActif(gammeId)) {
            q.setParameter("gamme", gammeId);
        }
        if (filtreActif(zoneGeoId)) {
            q.setParameter("zone", zoneGeoId);
        }
        if (filtreActif(codeFamille)) {
            q.setParameter("fam", codeFamille);
        }
        if (filtreActif(codeTableau)) {
            q.setParameter("tableau", codeTableau);
        }
        if (filtreActif(codeTvaId)) {
            q.setParameter("tva", codeTvaId);
        }
        if (filtreActif(codeRemise) && !"VIDE".equalsIgnoreCase(codeRemise.trim())) {
            q.setParameter("remise", codeRemise.trim());
        }
        if (StringUtils.isNotBlank(search)) {
            q.setParameter("s", "%" + search.trim() + "%");
        }
    }

    private static String texteDe(Object valeur) {
        return valeur != null ? valeur.toString() : "";
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject majSelectiveList(String zoneGeoId, String codeFamille, String codeTableau, String codeTvaId,
            String codeRemise, String laboratoireId, String gammeId, String search, int start, int limit) {
        JSONObject data = new JSONObject();
        JSONArray arr = new JSONArray();
        try {
            String where = majSelectiveWhere(zoneGeoId, codeFamille, codeTableau, codeTvaId, codeRemise, laboratoireId,
                    gammeId, search);
            // Jointures externes : un article sans emplacement, sans famille ou sans grossiste doit rester
            // visible et modifiable - c'est meme souvent celui que l'on cherche a corriger.
            // Alias explicites : sans eux str_NAME (article et TVA) puis str_LIBELLE (famille et grossiste)
            // apparaissent deux fois, et la requete native est rejetee au lieu de rendre des lignes.
            Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID AS id, f.int_CIP AS cip, f.str_NAME AS nom,"
                    + " z.str_LIBELLEE AS emplacement, fa.str_LIBELLE AS famille, t.str_NAME AS tva,"
                    + " f.str_CODE_REMISE AS remise, f.int_T AS tableau, g.str_LIBELLE AS grossiste,"
                    + " lab.libelle AS laboratoire, gam.libelle AS gamme" + " FROM t_famille f"
                    + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                    + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"
                    + " LEFT JOIN t_code_tva t ON t.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID"
                    + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
                    + " LEFT JOIN laboratoire lab ON lab.id = f.laboratoire_id"
                    + " LEFT JOIN gamme_produit gam ON gam.id = f.gamme_id" + where + " ORDER BY f.str_NAME ASC");
            majSelectiveParams(q, zoneGeoId, codeFamille, codeTableau, codeTvaId, codeRemise, laboratoireId, gammeId,
                    search);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                arr.put(new JSONObject().put("lg_FAMILLE_ID", texteDe(r[0])).put("int_CIP", texteDe(r[1]))
                        .put("str_NAME", texteDe(r[2])).put("emplacement", texteDe(r[3])).put("famille", texteDe(r[4]))
                        .put("tva", texteDe(r[5])).put("codeRemise", texteDe(r[6])).put("codeTableau", texteDe(r[7]))
                        .put("grossiste", texteDe(r[8])).put("laboratoire", texteDe(r[9]))
                        .put("gamme", texteDe(r[10])));
            }
            Query qc = em.createNativeQuery("SELECT COUNT(*) FROM t_famille f " + where);
            majSelectiveParams(qc, zoneGeoId, codeFamille, codeTableau, codeTvaId, codeRemise, laboratoireId, gammeId,
                    search);
            data.put("total", ((Number) qc.getSingleResult()).longValue()).put("data", arr);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "majSelectiveList", e);
            data.put("total", 0).put("data", arr);
        }
        return data;
    }

    @Override
    public JSONObject majSelectiveCodesTableau() {
        JSONObject data = new JSONObject();
        JSONArray arr = new JSONArray();
        try {
            List<?> valeurs = em.createNativeQuery("SELECT DISTINCT f.int_T FROM t_famille f"
                    + " WHERE f.str_STATUT='enable' AND f.int_T IS NOT NULL AND f.int_T <> ''"
                    + " ORDER BY f.int_T ASC").getResultList();
            for (Object valeur : valeurs) {
                String code = texteDe(valeur);
                arr.put(new JSONObject().put("id", code).put("libelle", code));
            }
            data.put("total", arr.length()).put("data", arr);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "majSelectiveCodesTableau", e);
            data.put("total", 0).put("data", arr);
        }
        return data;
    }

    /** Produits vises par l'operation : les coches, ou tout le filtre moins les exceptions decochees. */
    @SuppressWarnings("unchecked")
    private List<String> majSelectiveCibles(String mode, String zoneGeoId, String codeFamille, String codeTableau,
            String codeTvaId, String codeRemise, String laboratoireId, String gammeId, String search, List<String> ids,
            List<String> uncheckedIds) {
        if (!"ALL".equalsIgnoreCase(mode)) {
            return (ids != null) ? new java.util.ArrayList<>(ids) : new java.util.ArrayList<>();
        }
        String where = majSelectiveWhere(zoneGeoId, codeFamille, codeTableau, codeTvaId, codeRemise, laboratoireId,
                gammeId, search);
        Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID FROM t_famille f " + where);
        majSelectiveParams(q, zoneGeoId, codeFamille, codeTableau, codeTvaId, codeRemise, laboratoireId, gammeId,
                search);
        List<String> cibles = new java.util.ArrayList<>();
        for (Object o : (List<Object>) q.getResultList()) {
            if (o != null) {
                cibles.add(o.toString());
            }
        }
        if (uncheckedIds != null && !uncheckedIds.isEmpty()) {
            cibles.removeAll(uncheckedIds);
        }
        return cibles;
    }

    @Override
    public JSONObject majSelectiveApply(String mode, String zoneGeoId, String codeFamille, String codeTableau,
            String codeTvaId, String codeRemise, String laboratoireId, String gammeId, String search, List<String> ids,
            List<String> uncheckedIds, String champ, String valeur) {
        JSONObject res = new JSONObject();
        try {
            String cible = StringUtils.trimToEmpty(champ).toUpperCase();
            String valeurSaisie = StringUtils.trimToEmpty(valeur);
            String jpql;
            Object valeurAffectee;
            /*
             * Les trois premiers champs referencent une autre table : on resout la reference AVANT d'ecrire quoi que ce
             * soit. Affecter un identifiant inexistant a des centaines d'articles d'un seul geste laisserait un fichier
             * articles casse, sans moyen simple de retrouver l'etat d'avant.
             */
            switch (cible) {
            case CHAMP_GROSSISTE:
                valeurAffectee = em.find(TGrossiste.class, valeurSaisie);
                jpql = "UPDATE TFamille f SET f.lgGROSSISTEID = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            case CHAMP_FAMILLE:
                valeurAffectee = em.find(TFamillearticle.class, valeurSaisie);
                jpql = "UPDATE TFamille f SET f.lgFAMILLEARTICLEID = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            case CHAMP_TVA:
                valeurAffectee = em.find(dal.TCodeTva.class, valeurSaisie);
                jpql = "UPDATE TFamille f SET f.lgCODETVAID = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            case CHAMP_CODE_REMISE:
                valeurAffectee = valeurSaisie;
                jpql = "UPDATE TFamille f SET f.strCODEREMISE = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            case CHAMP_CODE_TABLEAU:
                valeurAffectee = valeurSaisie;
                jpql = "UPDATE TFamille f SET f.intT = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            case CHAMP_LABORATOIRE:
                valeurAffectee = em.find(dal.Laboratoire.class, valeurSaisie);
                jpql = "UPDATE TFamille f SET f.laboratoire = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            case CHAMP_GAMME:
                valeurAffectee = em.find(dal.GammeProduit.class, valeurSaisie);
                jpql = "UPDATE TFamille f SET f.gamme = :valeur WHERE f.lgFAMILLEID IN :ids";
                break;
            default:
                return res.put("success", false).put("count", 0).put("message",
                        "Donnée à mettre à jour inconnue : " + champ);
            }
            if (valeurAffectee == null) {
                return res.put("success", false).put("count", 0).put("message",
                        "La valeur choisie n'existe plus. Rafraîchissez la liste puis recommencez.");
            }
            List<String> cibles = majSelectiveCibles(mode, zoneGeoId, codeFamille, codeTableau, codeTvaId, codeRemise,
                    laboratoireId, gammeId, search, ids, uncheckedIds);
            if (cibles.isEmpty()) {
                return res.put("success", false).put("count", 0).put("message", "Aucun produit retenu.");
            }
            int count = 0;
            int chunk = 1000;
            for (int i = 0; i < cibles.size(); i += chunk) {
                List<String> sub = cibles.subList(i, Math.min(cibles.size(), i + chunk));
                count += em.createQuery(jpql).setParameter("valeur", valeurAffectee).setParameter("ids", sub)
                        .executeUpdate();
            }
            LOG.log(Level.INFO, "MAJ selective : {0} = {1} sur {2} produit(s)",
                    new Object[] { cible, valeurSaisie, count });
            res.put("success", true).put("count", count);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "majSelectiveApply", e);
            res.put("success", false).put("count", 0).put("message", "La mise à jour a échoué.");
        }
        return res;
    }

    @Override
    public long produitPerimesCount(String query, int nbreMois, String dtStart, String dtEnd, String codeFamille,
            String codeRayon, String codeGrossiste) {
        return produitPerimesCount(query, nbreMois, dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste,
                sessionHelperService.getCurrentUser().getLgEMPLACEMENTID());
    }

    private long produitPerimesCount(String query, int nbreMois, String dtStart, String dtEnd, String codeFamille,
            String codeRayon, String codeGrossiste, TEmplacement emp) {

        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TLot> root = cq.from(TLot.class);
            Join<TLot, TFamille> joinLot = root.join(TLot_.lgFAMILLEID);
            Join<TFamille, TFamilleStock> fa = joinLot.join(TFamille_.tFamilleStockCollection);
            Join<TFamille, TFamillearticle> joinFa = joinLot.join(TFamille_.lgFAMILLEARTICLEID);
            Join<TFamille, TGrossiste> joinFaG = joinLot.join(TFamille_.lgGROSSISTEID);
            Join<TFamille, TZoneGeographique> joinFaz = joinLot.join(TFamille_.lgZONEGEOID);

            cq.select(cb.count(root));
            List<Predicate> predicates = perimePredicat(cb, root, fa, joinLot, joinFa, joinFaG, joinFaz, query,
                    nbreMois, dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, emp);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0l;
        }

    }

    @Override
    public byte[] buildComparaisonExcel(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil) throws JSONException {

        List<ArticleDTO> datas = comparaisonStock(u, query, filtreStock, filtreSeuil, codeFamile, codeRayon,
                codeGrossiste, stock, seuil, 0, 0, true);

        if (datas.isEmpty()) {
            return new byte[0];
        }

        String title = "Comparaison stock du " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        String[] headers = new String[] { "CIP", "Libellé", "Prix vente", "Prix achat", "Stock", "Stock moyen",
                "Seuil réappro", "Rayon", "Famille", "Dernière vente" };

        try {
            return reportExcelExportService.createExcelReport(title, headers, datas, (row, dto) -> {
                int col = 0;
                row.createCell(col++).setCellValue(dto.getCode());
                row.createCell(col++).setCellValue(dto.getLibelle());
                row.createCell(col++).setCellValue(dto.getPrixVente());
                row.createCell(col++).setCellValue(dto.getPrixAchat());
                row.createCell(col++).setCellValue(dto.getStock());
                row.createCell(col++).setCellValue(dto.getStockMoyen());
                row.createCell(col++).setCellValue(dto.getSeuiRappro());
                row.createCell(col++).setCellValue(dto.getFilterLibelle());
                row.createCell(col++).setCellValue(dto.getFamilleLibelle());
                row.createCell(col++).setCellValue(dto.getLastDateVente() != null ? dto.getLastDateVente() : "");
            });
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "buildComparaisonExcel error", e);
            return new byte[0];
        }
    }

    @Override
    public byte[] buildComparaisonCsv(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil) throws JSONException {

        List<ArticleDTO> datas = comparaisonStock(u, query, filtreStock, filtreSeuil, codeFamile, codeRayon,
                codeGrossiste, stock, seuil, 0, 0, true);

        if (datas.isEmpty()) {
            return new byte[0];
        }

        String title = "Comparaison stock du " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        String[] headers = new String[] { "CIP", "Libellé", "Prix vente", "Prix achat", "Stock", "Stock moyen",
                "Seuil réappro", "Rayon", "Famille", "Dernière vente" };

        try {
            byte[] raw = csvExportService.createCsvReport(title, headers, datas,
                    dto -> new String[] { dto.getCode(), dto.getLibelle(), String.valueOf(dto.getPrixVente()),
                            String.valueOf(dto.getPrixAchat()), String.valueOf(dto.getStock()),
                            String.valueOf(dto.getStockMoyen()), String.valueOf(dto.getSeuiRappro()),
                            dto.getFilterLibelle(), dto.getFamilleLibelle(),
                            dto.getLastDateVente() != null ? dto.getLastDateVente() : "" });

            return csvExportService.addUtf8Bom(raw);
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "buildComparaisonCsv error", e);
            return new byte[0];
        }
    }

    @Override
    public JSONObject createInventaireComparaison(TUser u, String query, MargeEnum filtreStock, MargeEnum filtreSeuil,
            String codeFamile, String codeRayon, String codeGrossiste, int stock, int seuil) throws JSONException {

        List<ArticleDTO> datas = comparaisonStock(u, query, filtreStock, filtreSeuil, codeFamile, codeRayon,
                codeGrossiste, stock, seuil, 0, 0, true);

        if (datas.isEmpty()) {
            return new JSONObject().put("count", 0);
        }

        java.util.Set<String> ids = datas.stream().map(ArticleDTO::getId).collect(Collectors.toSet());

        String title = "Inventaire comparaison stock du "
                + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        int count = inventaireService.create(ids, title);

        return new JSONObject().put("count", count);
    }

    @Override
    public byte[] exportSaisiePerimesCsv(String query, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws IOException {

        List<VenteDetailsDTO> data = saisiePerimesAll(query, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste);

        LocalDate d1 = null;
        LocalDate d2 = null;
        try {
            d1 = LocalDate.parse(dtStart);
        } catch (Exception e) {
        }
        try {
            d2 = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String periode;
        if (d1 != null && d2 != null) {
            periode = "du " + d1.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                    + d2.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } else {
            periode = "";
        }

        String title = "Saisie des périmés " + periode;

        String[] headers = { "Id", "Code CIP", "Libellé", "Qté", "Montant", "Stock", "Avoir", "Emplacement" };

        // On réutilise le même mapping que pour les articles vendus (VenteDetailsDTO)
        byte[] csvData = csvExportService.createCsvReport(title, headers, data,
                dto -> new String[] { dto.getLgFAMILLEID(), // Id produit
                        dto.getIntCIP(), // Code CIP
                        dto.getStrNAME(), // Libellé
                        String.valueOf(dto.getIntQUANTITY()), // Quantité (ici : quantité périmée)
                        String.valueOf(dto.getIntPRICE()), // Montant (ou prix total)
                        String.valueOf(dto.getCurrentStock()), // Stock courant
                        String.valueOf(dto.getIntAVOIR()), // Avoir (si utilisé, sinon 0)
                        dto.getLibelleRayon() // Emplacement / rayon
                });

        return csvExportService.addUtf8Bom(csvData);
    }

    @Override
    public byte[] exportSaisiePerimesExcel(String query, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws IOException {

        List<VenteDetailsDTO> data = saisiePerimesAll(query, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste);

        LocalDate d1 = null;
        LocalDate d2 = null;
        try {
            d1 = LocalDate.parse(dtStart);
        } catch (Exception e) {
        }
        try {
            d2 = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String periode;
        if (d1 != null && d2 != null) {
            periode = "du " + d1.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                    + d2.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } else {
            periode = "";
        }

        String title = "Saisie des périmés " + periode;

        String[] headers = { "Id", "Code CIP", "Libellé", "Qté", "Montant", "Stock", "Avoir", "Emplacement" };

        return reportExcelExportService.createExcelReport(title, headers, data, (row, dto) -> {
            int col = 0;
            row.createCell(col++).setCellValue(dto.getLgFAMILLEID());
            row.createCell(col++).setCellValue(dto.getIntCIP());
            row.createCell(col++).setCellValue(dto.getStrNAME());
            row.createCell(col++).setCellValue(dto.getIntQUANTITY());
            row.createCell(col++).setCellValue(dto.getIntPRICE());
            row.createCell(col++).setCellValue(dto.getCurrentStock());
            row.createCell(col++).setCellValue(dto.getIntAVOIR());
            row.createCell(col++).setCellValue(dto.getLibelleRayon());
        });
    }

    @Override
    public JSONObject createInventaireSaisiePerimes(String query, String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste) throws JSONException {

        List<VenteDetailsDTO> data = saisiePerimesAll(query, dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste);

        if (data.isEmpty()) {
            return new JSONObject().put("count", 0);
        }

        java.util.Set<String> ids = data.stream().map(VenteDetailsDTO::getLgFAMILLEID).collect(Collectors.toSet());

        LocalDate d1 = null;
        LocalDate d2 = null;
        try {
            d1 = LocalDate.parse(dtStart);
        } catch (Exception e) {
        }
        try {
            d2 = LocalDate.parse(dtEnd);
        } catch (Exception e) {
        }

        String periode;
        if (d1 != null && d2 != null) {
            periode = "du " + d1.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                    + d2.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } else {
            periode = "";
        }

        String title = "Inventaire produits saisis périmés " + periode;

        int count = inventaireService.create(ids, title);

        return new JSONObject().put("count", count);
    }

}
