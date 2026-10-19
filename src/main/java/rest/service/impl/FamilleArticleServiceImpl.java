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
import java.util.HashMap;
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
import static rest.service.dto.VingtQuatreVingtType.CA;
import static rest.service.dto.VingtQuatreVingtType.MARGE;
import static rest.service.dto.VingtQuatreVingtType.QTY;

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

    /**
     * Pourcentage arrondi comme avant (2 decimales du rapport, puis x 100), et 0 quand le denominateur est nul : une
     * periode sans vente (ou a HT nul) faisait « Infinite or NaN », avalee, et tronquait la liste (journaux du 13/10).
     */
    static Double pourcent(double numerateur, double denominateur) {
        if (denominateur == 0) {
            return 0d;
        }
        return new BigDecimal(numerateur / denominateur).setScale(2, RoundingMode.HALF_UP).doubleValue() * 100;
    }

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
                            Double p = pourcent(x.getMontantHT(), montanttotalHt);
                            x.setPourcentageTH(p.longValue());
                            list.add(x);

                        });
            } else {
                /* cumuls de l'annee de toutes les familles en une requete, plus une requete par famille (19/10) */
                Map<String, FamilleArticleStatDTO> cumuls = cumulsAnnuelsParFamille(periode, u);
                findPreenregistrementDetails(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), query, codeFamile, u,
                        codeRayon, codeGrossiste).stream().sorted(comparator).forEach(x -> {
                            montantMarge.add(x.getMontantMarge());
                            montantTTC.add(x.getMontantTTC());
                            montantAchat.add(x.getMontantAchat());
                            montantHT.add(x.getMontantHT());
                            appliquerCumul(x, cumuls.get(x.getFamilleId()));
                            Double p = pourcent(x.getMontantHT(), montanttotalHt);
                            x.setPourcentageTH(p.longValue());
                            list.add(x);

                        });
            }

            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            summary.setPourcentageTH(montanttotalHt == 0 ? 0 : 100);
            Double ux = pourcent(summary.getMontantCumulMarge(), summary.getMontantCumulHT());
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
        // Bornes sur la colonne brute (et non DATE(colonne)) pour que l'index sur dt_UPDATED serve
        predicates.add(cb.greaterThanOrEqualTo(join.get(TPreenregistrement_.dtUPDATED),
                (Date) java.sql.Timestamp.valueOf(dtStart.atStartOfDay())));
        predicates.add(cb.lessThan(join.get(TPreenregistrement_.dtUPDATED),
                (Date) java.sql.Timestamp.valueOf(dtEnd.plusDays(1).atStartOfDay())));
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

    /*
     * Lenteur des statistiques par famille (10 a 17 s pour un mois sur le banc, 19/10) : ecrites en criteres JPA, ces
     * sommes laissaient MariaDB partir des articles et relire TOUTES leurs lignes de vente depuis l'origine. Ici les
     * ventes de la periode sont lues d'abord (index sur la date), puis leurs lignes : memes filtres, memes sommes.
     */
    private static final String SQL_SOMMES_FAMILLE = "SELECT STRAIGHT_JOIN fa.str_CODE_FAMILLE AS code, fa.str_LIBELLE AS libelle,"
            + " COALESCE(SUM(d.int_PRICE), 0) AS ttc, COALESCE(SUM(d.prixAchat * d.int_QUANTITY), 0) AS achat,"
            + " COALESCE(SUM(d.montantTva), 0) AS tva, COALESCE(SUM(d.int_PRICE_REMISE), 0) AS remise,"
            + " fa.lg_FAMILLEARTICLE_ID AS famille FROM t_preenregistrement p"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
            + " JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"
            + " WHERE p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 AND u.lg_EMPLACEMENT_ID = ?3 AND p.str_STATUT = ?4"
            + " AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID NOT LIKE ?5";

    private List<FamilleArticleStatDTO> findPreenregistrementDetails(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        try {
            StringBuilder sql = new StringBuilder(SQL_SOMMES_FAMILLE);
            List<Object> params = filtresFamille(sql, query, codeFamillle, codeRayon, codeGrossiste);
            sql.append(" GROUP BY fa.lg_FAMILLEARTICLE_ID");
            Query q = sommes(sql.toString(), dtStart.atStartOfDay(), dtEnd.plusDays(1).atStartOfDay(), u);
            for (int i = 0; i < params.size(); i++) {
                q.setParameter(6 + i, params.get(i));
            }
            List<FamilleArticleStatDTO> out = new ArrayList<>();
            for (Object o : q.getResultList()) {
                Object[] l = (Object[]) o;
                out.add(new FamilleArticleStatDTO((String) l[0], (String) l[1], nombre(l[2]), nombre(l[3]),
                        nombre(l[4]), nombre(l[5]), (String) l[6]));
            }
            return out;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /** Filtres de l'ecran (recherche, famille, rayon, grossiste) : parametres ?6 et suivants, dans l'ordre. */
    private static List<Object> filtresFamille(StringBuilder sql, String query, String codeFamillle, String codeRayon,
            String codeGrossiste) {
        List<Object> params = new ArrayList<>();
        if (!StringUtils.isEmpty(query)) {
            params.add(query + "%");
            sql.append(" AND (fa.str_CODE_FAMILLE LIKE ?6 OR fa.str_LIBELLE LIKE ?6)");
        }
        if (!StringUtils.isEmpty(codeFamillle) && !codeFamillle.equals("ALL")) {
            params.add(codeFamillle);
            sql.append(" AND fa.lg_FAMILLEARTICLE_ID = ?").append(5 + params.size());
        }
        if (!StringUtils.isEmpty(codeRayon) && !codeRayon.equals("ALL")) {
            params.add(codeRayon);
            sql.append(" AND f.lg_ZONE_GEO_ID = ?").append(5 + params.size());
        }
        if (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equals("ALL")) {
            params.add(codeGrossiste);
            sql.append(" AND f.lg_GROSSISTE_ID = ?").append(5 + params.size());
        }
        return params;
    }

    private Query sommes(String sql, java.time.LocalDateTime debut, java.time.LocalDateTime fin, TUser u) {
        return getEntityManager().createNativeQuery(sql).setParameter(1, java.sql.Timestamp.valueOf(debut))
                .setParameter(2, java.sql.Timestamp.valueOf(fin))
                .setParameter(3, u.getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                .setParameter(4, DateConverter.STATUT_IS_CLOSED).setParameter(5, DateConverter.DEPOT_EXTENSION);
    }

    private static long nombre(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    /** Cumuls de l'annee de la periode, par famille : memes regles que {@link #cumulFamilleArticles}. */
    private Map<String, FamilleArticleStatDTO> cumulsAnnuelsParFamille(LocalDate periode, TUser u) {
        Map<String, FamilleArticleStatDTO> out = new HashMap<>();
        try {
            for (Object o : sommes(SQL_SOMMES_FAMILLE + " GROUP BY fa.lg_FAMILLEARTICLE_ID",
                    periode.withDayOfYear(1).atStartOfDay(), periode.withDayOfYear(1).plusYears(1).atStartOfDay(), u)
                            .getResultList()) {
                Object[] l = (Object[]) o;
                out.put((String) l[6],
                        new FamilleArticleStatDTO(nombre(l[2]), nombre(l[3]), nombre(l[4]), nombre(l[5])));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return out;
    }

    /** Recopie le cumul annuel dans la ligne de la famille, comme {@link #cumulFamilleArticles}. */
    private void appliquerCumul(FamilleArticleStatDTO x, FamilleArticleStatDTO t) {
        if (t == null) {
            /* famille vendue dans la periode : toujours presente dans l'annee ; garde si l'annee change en cours */
            return;
        }
        x.setMontantCumulAchat(t.getMontantCumulAchat());
        x.setMontantCumulTTC(t.getMontantCumulTTC());
        x.setMontantCumulTva(t.getMontantCumulTva());
        x.setMontantCumulHT(t.getMontantCumulHT());
        Double p = pourcent(x.getMontantHT(), x.getMontantCumulHT());
        x.setValeurPeriode(p.intValue());
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
            // Annee de la periode en intervalle sur la colonne brute (et non YEAR(colonne)) pour l'index
            predicates.add(cb.greaterThanOrEqualTo(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).atStartOfDay())));
            predicates.add(cb.lessThan(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).plusYears(1).atStartOfDay())));
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
            Double p = pourcent(familleArticleStatDTO.getMontantHT(), familleArticleStatDTO.getMontantCumulHT());
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
            /*
             * Meme correction que findPreenregistrementDetails (19/10) : ventes de la periode lues d'abord. Les
             * articles ne sont joints que si un filtre les vise, comme la requete d'origine (jointure implicite du
             * filtre).
             */
            boolean article = !StringUtils.isEmpty(query)
                    || (!StringUtils.isEmpty(codeFamillle) && !codeFamillle.equals("ALL"));
            boolean produit = article || (!StringUtils.isEmpty(codeRayon) && !codeRayon.equals("ALL"))
                    || (!StringUtils.isEmpty(codeGrossiste) && !codeGrossiste.equals("ALL"));
            StringBuilder sql = new StringBuilder(
                    "SELECT STRAIGHT_JOIN SUM(d.int_PRICE) - SUM(d.int_PRICE_REMISE) - SUM(d.montantTva)")
                            .append(" FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID")
                            .append(" JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID");
            if (produit) {
                sql.append(" JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID");
            }
            if (article) {
                sql.append(" JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID");
            }
            sql.append(SQL_SOMMES_FAMILLE.substring(SQL_SOMMES_FAMILLE.indexOf(" WHERE ")));
            List<Object> params = filtresFamille(sql, query, codeFamillle, codeRayon, codeGrossiste);
            Query q = sommes(sql.toString(), dtStart.atStartOfDay(), dtEnd.plusDays(1).atStartOfDay(), u);
            for (int i = 0; i < params.size(); i++) {
                q.setParameter(6 + i, params.get(i));
            }
            /* periode sans vente : la somme revient vide (NullPointerException journalisee le 13/10) */
            Number total = (Number) q.getSingleResult();
            return total == null ? 0 : total.longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public List<VenteDetailsDTO> geVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, boolean all, VingtQuatreVingtType vingtQuatreVingtType,
            Integer topN) {
        return geVingtQuatreVingt(dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, start, limit, all,
                vingtQuatreVingtType, topN, null, null);
    }

    /**
     * Emplacement de l'utilisateur connecte, exige par la procedure d'analyse 20/80.
     *
     * Enchainer les appels sans garde donnait un NullPointerException nu quand le contexte utilisateur etait vide, sans
     * dire lequel des trois maillons manquait (vu en officine sur l'edition, servie par une servlet ou le contexte
     * n'etait pas alimente - voir filter.UtilisateurEditionFilter).
     */
    private String emplacementCourant() {
        TUser utilisateur = sessionHelperService.getCurrentUser();
        if (utilisateur == null || utilisateur.getLgEMPLACEMENTID() == null) {
            throw new IllegalStateException("Analyse 20/80 : utilisateur connecte introuvable, "
                    + "impossible de determiner l'emplacement. Session expiree ou edition ouverte hors session.");
        }
        return utilisateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    @Override
    public List<VenteDetailsDTO> geVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, boolean all, VingtQuatreVingtType vingtQuatreVingtType,
            Integer topN, String stockFilter, Integer stockMin) {
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
            query.setParameter(3, emplacementCourant());
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
            // Stock reserve puis filtre sur le stock TOTAL (avant le Top N, comme les autres filtres)
            enrichStockReserve2080(list);
            if (StringUtils.isNotBlank(stockFilter) && !"ALL".equalsIgnoreCase(stockFilter)) {
                final String f = stockFilter;
                final Integer min = stockMin;
                list = list.stream().filter(d -> matchStockTotal(d, f, min)).collect(Collectors.toList());
            }
            // Top N : la liste est deja triee DESC par le critere (CA/QTY/MARGE) dans la procedure,
            // on ne garde donc que les N premiers (les plus importants). topN null/<=0 = tous.
            if (topN != null && topN > 0 && list.size() > topN) {
                return new ArrayList<>(list.subList(0, topN));
            }
            return list;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public JSONObject geVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile, String codeRayon,
            String codeGrossiste, int start, int limit, VingtQuatreVingtType vingtQuatreVingtType, Integer topN,
            String stockFilter, Integer stockMin) {
        List<VenteDetailsDTO> data = geVingtQuatreVingt(dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, start,
                limit, false, vingtQuatreVingtType, topN, stockFilter, stockMin);
        int total = data.size();

        return new JSONObject().put("total", total).put("data", new JSONArray(data));
    }

    /** Stock reserve par produit (t_type_stock_famille type '2', emplacement courant) en une seule requete. */
    private void enrichStockReserve2080(List<VenteDetailsDTO> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        try {
            String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            List<Object[]> rows = getEntityManager()
                    .createNativeQuery("SELECT t.lg_FAMILLE_ID, COALESCE(SUM(t.int_NUMBER),0)"
                            + " FROM t_type_stock_famille t WHERE t.lg_TYPE_STOCK_ID = '2'"
                            + " AND t.str_STATUT = 'enable' AND t.lg_EMPLACEMENT_ID = ?1 GROUP BY t.lg_FAMILLE_ID")
                    .setParameter(1, emplacement).getResultList();
            if (rows.isEmpty()) {
                return;
            }
            Map<String, Integer> reserves = new HashMap<>();
            for (Object[] r : rows) {
                reserves.put((String) r[0], r[1] == null ? 0 : ((Number) r[1]).intValue());
            }
            for (VenteDetailsDTO d : list) {
                Integer res = reserves.get(d.getLgFAMILLEID());
                if (res != null) {
                    d.setStockReserve(res);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Enrichissement stock reserve 20/80 impossible", e);
        }
    }

    /** Filtre stock du 20/80 : memes operateurs que la classification ABC (sans les seuils), sur le stock TOTAL. */
    private boolean matchStockTotal(VenteDetailsDTO d, String stockFilter, Integer min) {
        int stock = d.getStockTotal();
        int val = (min != null) ? min : 0;
        switch (stockFilter.trim().toUpperCase()) {
        case "SUP":
            return stock > val;
        case "SUPEQ":
            return stock >= val;
        case "INF":
            return stock < val;
        case "INFEQ":
            return stock <= val;
        case "EGAL":
            return stock == val;
        case "POSITIF":
            return stock > 0;
        case "NUL":
            return stock == 0;
        case "NEGATIF":
            return stock < 0;
        default:
            return true;
        }
    }

    /*
     * Lenteur des statistiques par rayon et par grossiste (13 a 19 s sur le banc, 19/10) : meme cause et meme
     * correction que SQL_SOMMES_FAMILLE. Les ventes de la periode sont lues d'abord, puis leurs lignes, puis le rayon
     * (ou le grossiste) de l'article. Les familles d'articles ne sont jointes que si un filtre les vise, comme la
     * jointure implicite de la requete d'origine.
     */
    private static final String SQL_RAYON = " JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID";
    private static final String SQL_GROSSISTE = " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID";

    private static String sqlSommesPar(boolean rayon, boolean article) {
        StringBuilder sql = new StringBuilder("SELECT STRAIGHT_JOIN ")
                .append(rayon ? "z.str_CODE, z.str_LIBELLEE," : "g.str_CODE, g.str_LIBELLE,")
                .append(SQL_SOMMES_FAMILLE, SQL_SOMMES_FAMILLE.indexOf(" COALESCE"),
                        SQL_SOMMES_FAMILLE.indexOf(" fa.lg_FAMILLEARTICLE_ID AS famille"))
                .append(rayon ? " z.lg_ZONE_GEO_ID" : " g.lg_GROSSISTE_ID").append(SQL_SOMMES_FAMILLE,
                        SQL_SOMMES_FAMILLE.indexOf(" FROM "), SQL_SOMMES_FAMILLE.indexOf(" JOIN t_famillearticle"));
        if (article) {
            sql.append(" JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID");
        }
        return sql.append(rayon ? SQL_RAYON : SQL_GROSSISTE)
                .append(SQL_SOMMES_FAMILLE.substring(SQL_SOMMES_FAMILLE.indexOf(" WHERE "))).toString();
    }

    private static String groupePar(boolean rayon) {
        return rayon ? " GROUP BY z.lg_ZONE_GEO_ID" : " GROUP BY g.lg_GROSSISTE_ID";
    }

    private List<FamilleArticleStatDTO> sommesPar(boolean rayon, LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        try {
            boolean article = !StringUtils.isEmpty(query)
                    || (!StringUtils.isEmpty(codeFamillle) && !codeFamillle.equals("ALL"));
            StringBuilder sql = new StringBuilder(sqlSommesPar(rayon, article));
            List<Object> params = filtresFamille(sql, query, codeFamillle, codeRayon, codeGrossiste);
            sql.append(groupePar(rayon));
            Query q = sommes(sql.toString(), dtStart.atStartOfDay(), dtEnd.plusDays(1).atStartOfDay(), u);
            for (int i = 0; i < params.size(); i++) {
                q.setParameter(6 + i, params.get(i));
            }
            List<FamilleArticleStatDTO> out = new ArrayList<>();
            for (Object o : q.getResultList()) {
                Object[] l = (Object[]) o;
                out.add(new FamilleArticleStatDTO((String) l[0], (String) l[1], nombre(l[2]), nombre(l[3]),
                        nombre(l[4]), nombre(l[5]), (String) l[6]));
            }
            return out;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /** Cumuls de l'annee de la periode par rayon ou par grossiste, en une requete : sans les filtres de l'ecran. */
    private Map<String, FamilleArticleStatDTO> cumulsAnnuelsPar(boolean rayon, LocalDate periode, TUser u) {
        Map<String, FamilleArticleStatDTO> out = new HashMap<>();
        try {
            for (Object o : sommes(sqlSommesPar(rayon, false) + groupePar(rayon),
                    periode.withDayOfYear(1).atStartOfDay(), periode.withDayOfYear(1).plusYears(1).atStartOfDay(), u)
                            .getResultList()) {
                Object[] l = (Object[]) o;
                out.put((String) l[6],
                        new FamilleArticleStatDTO(nombre(l[2]), nombre(l[3]), nombre(l[4]), nombre(l[5])));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return out;
    }

    /*
     * Ecran filtre sur quelques emplacements (ou grossistes) qui portent moins du quart des articles : leur cumul un
     * par un, par l'index de l'article, est plus court que le cumul de tous (1,1 s contre 2,5 s sur le banc, 19/10).
     */
    private boolean peuDArticles(boolean rayon, List<FamilleArticleStatDTO> lignes) {
        if (lignes.isEmpty() || lignes.size() > 3) {
            return lignes.isEmpty();
        }
        try {
            StringBuilder sql = new StringBuilder(
                    "SELECT COUNT(*) * 4 < (SELECT COUNT(*) FROM t_famille) FROM t_famille WHERE ")
                            .append(rayon ? "lg_ZONE_GEO_ID" : "lg_GROSSISTE_ID").append(" IN (");
            for (int i = 0; i < lignes.size(); i++) {
                sql.append(i > 0 ? ", ?" : "?").append(i + 1);
            }
            Query q = getEntityManager().createNativeQuery(sql.append(")").toString());
            for (int i = 0; i < lignes.size(); i++) {
                q.setParameter(i + 1, lignes.get(i).getFamilleId());
            }
            return nombre(q.getSingleResult()) == 1;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return false;
        }
    }

    List<FamilleArticleStatDTO> fetchDataForStatisticVenteRayons(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        return sommesPar(true, dtStart, dtEnd, query, codeFamillle, u, codeRayon, codeGrossiste);
    }

    List<FamilleArticleStatDTO> fetchDataForStatisticVenteGrossistes(LocalDate dtStart, LocalDate dtEnd, String query,
            String codeFamillle, TUser u, String codeRayon, String codeGrossiste) {
        return sommesPar(false, dtStart, dtEnd, query, codeFamillle, u, codeRayon, codeGrossiste);
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
            List<FamilleArticleStatDTO> lignes = fetchDataForStatisticVenteRayons(LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), query, codeFamile, u, codeRayon, codeGrossiste);
            Map<String, FamilleArticleStatDTO> cumuls = peuDArticles(true, lignes) ? null
                    : cumulsAnnuelsPar(true, periode, u);
            lignes.stream().sorted(comparator).forEach(x -> {
                montantMarge.add(x.getMontantMarge());
                montantTTC.add(x.getMontantTTC());
                montantAchat.add(x.getMontantAchat());
                montantHT.add(x.getMontantHT());
                if (cumuls == null) {
                    cumulStatisticRayons(periode, x, u);
                } else {
                    appliquerCumul(x, cumuls.get(x.getFamilleId()));
                }
                Double p = pourcent(x.getMontantHT(), montanttotalHt);
                x.setPourcentageTH(p.longValue());
                list.add(x);

            });
            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            try {
                summary.setPourcentageTH(montanttotalHt == 0 ? 0 : 100);
            } catch (ArithmeticException e) {
            }

            Double ux = pourcent(summary.getMontantCumulMarge(), summary.getMontantCumulHT());
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
            List<FamilleArticleStatDTO> lignes = fetchDataForStatisticVenteGrossistes(LocalDate.parse(dtStart),
                    LocalDate.parse(dtEnd), query, codeFamile, u, codeRayon, codeGrossiste);
            Map<String, FamilleArticleStatDTO> cumuls = peuDArticles(false, lignes) ? null
                    : cumulsAnnuelsPar(false, periode, u);
            lignes.stream().sorted(comparator).forEach(x -> {
                montantMarge.add(x.getMontantMarge());
                montantTTC.add(x.getMontantTTC());
                montantAchat.add(x.getMontantAchat());
                montantHT.add(x.getMontantHT());
                if (cumuls == null) {
                    cumulStatisticGrossistes(periode, x, u);
                } else {
                    appliquerCumul(x, cumuls.get(x.getFamilleId()));
                }
                Double p = pourcent(x.getMontantHT(), montanttotalHt);
                x.setPourcentageTH(p.longValue());
                list.add(x);

            });
            summary.setMontantCumulAchat(montantAchat.longValue());
            summary.setMontantCumulHT(montantHT.longValue());
            summary.setMontantCumulMarge(montantMarge.longValue());
            summary.setMontantCumulTTC(montantTTC.longValue());
            summary.setPourcentageTH(montanttotalHt == 0 ? 0 : 100);
            Double ux = pourcent(summary.getMontantCumulMarge(), summary.getMontantCumulHT());
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
            // Annee de la periode en intervalle sur la colonne brute (et non YEAR(colonne)) pour l'index
            predicates.add(cb.greaterThanOrEqualTo(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).atStartOfDay())));
            predicates.add(cb.lessThan(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).plusYears(1).atStartOfDay())));
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
            Double p = pourcent(familleArticleStatDTO.getMontantHT(), familleArticleStatDTO.getMontantCumulHT());
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
            // Annee de la periode en intervalle sur la colonne brute (et non YEAR(colonne)) pour l'index
            predicates.add(cb.greaterThanOrEqualTo(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).atStartOfDay())));
            predicates.add(cb.lessThan(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).plusYears(1).atStartOfDay())));
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
            Double p = pourcent(familleArticleStatDTO.getMontantHT(), familleArticleStatDTO.getMontantCumulHT());
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
            // Annee de la periode en intervalle sur la colonne brute (et non YEAR(colonne)) pour l'index
            predicates.add(cb.greaterThanOrEqualTo(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).atStartOfDay())));
            predicates.add(cb.lessThan(join.get(TPreenregistrement_.dtUPDATED),
                    (Date) java.sql.Timestamp.valueOf(periode.withDayOfYear(1).plusYears(1).atStartOfDay())));
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
            Double p = pourcent(familleArticleStatDTO.getMontantHT(), familleArticleStatDTO.getMontantCumulHT());
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
                                    Double p = pourcent(montantHT_.longValue(), montanttotalHt);
                                    familleArticleStat.setPourcentageTH(p.longValue());
                                    Double ma = pourcent(
                                            familleArticleStat.getMontantHT() - familleArticleStat.getMontantAchat(),
                                            familleArticleStat.getMontantHT());
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
                                    Double p = pourcent(montantHT_.longValue(), montanttotalHt);
                                    familleArticleStat.setPourcentageTH(p.longValue());
                                    Double ma = pourcent(
                                            familleArticleStat.getMontantHT() - familleArticleStat.getMontantAchat(),
                                            familleArticleStat.getMontantHT());
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
                summary.setPourcentageTH(montanttotalHt == 0 ? 0 : 100);
            } catch (Exception e) {
            }
            Double ux = 0d;
            try {
                ux = pourcent(summary.getMontantCumulMarge(), summary.getMontantCumulHT());
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
            /* periode sans vente : la somme revient vide (NullPointerException journalisee le 13/10) */
            Number total = (Number) q.getSingleResult();
            return total == null ? 0 : total.longValue();
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
                Double p = pourcent(marge, montantHT);
                o.setPourcentageMage(p.intValue() * (-1));
                results.add(o);
            }

        }
        return results;

    }

    @Override
    public byte[] buildVingtQuatreVingtExcel(String dtStart, String dtEnd, String codeFamille, String codeRayon,
            String codeGrossiste, VingtQuatreVingtType vingtQuatreVingtType, Integer topN, String stockFilter,
            Integer stockMin) throws JSONException {
        List<VenteDetailsDTO> datas = geVingtQuatreVingt(dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, 0, 0,
                true, vingtQuatreVingtType, topN, stockFilter, stockMin);
        if (datas.isEmpty()) {
            return new byte[0];
        }

        String[] headers = { "CIP", "Libellé", "Montant", "Marge", "Quantité", "Stock", "RES", "Stock total",
                "Famille" };
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
                row.createCell(col++).setCellValue(d.getStockReserve());
                row.createCell(col++).setCellValue(d.getStockTotal());
                row.createCell(col++).setCellValue(d.getTicketName());
            });
        } catch (IOException e) {
            // LOG.log(Level.SEVERE, "buildVingtQuatreVingtExcel error", e);
            return new byte[0];
        }
    }

    @Override
    public byte[] buildVingtQuatreVingtCsv(String dtStart, String dtEnd, String codeFamille, String codeRayon,
            String codeGrossiste, VingtQuatreVingtType vingtQuatreVingtType, Integer topN, String stockFilter,
            Integer stockMin) throws JSONException {
        List<VenteDetailsDTO> datas = geVingtQuatreVingt(dtStart, dtEnd, codeFamille, codeRayon, codeGrossiste, 0, 0,
                true, vingtQuatreVingtType, topN, stockFilter, stockMin);
        if (datas.isEmpty()) {
            return new byte[0];
        }

        String[] headers = { "CIP", "Libellé", "Montant", "Marge", "Quantité", "Stock", "RES", "Stock total",
                "Famille" };
        String title = "Rapport 20/80 du " + dtStart + " au " + dtEnd;

        try {
            byte[] raw = csvExportService.createCsvReport(title, headers, datas,
                    d -> new String[] { d.getIntCIP(), d.getStrNAME(), String.valueOf(d.getIntPRICE()),
                            String.valueOf(d.getMarge()), String.valueOf(d.getIntQUANTITY()),
                            String.valueOf(d.getIntQUANTITYSERVED()), String.valueOf(d.getStockReserve()),
                            String.valueOf(d.getStockTotal()), d.getTicketName() });
            return csvExportService.addUtf8Bom(raw);
        } catch (IOException e) {
            // LOG.log(Level.SEVERE, "buildVingtQuatreVingtCsv error", e);
            return new byte[0];
        }
    }

    @Override
    public JSONObject createInventaireVingtQuatreVingt(String dtStart, String dtEnd, String codeFamile,
            String codeRayon, String codeGrossiste, VingtQuatreVingtType vingtQuatreVingtType, Integer topN,
            String stockFilter, Integer stockMin) throws JSONException {

        // Récupère le 20/80 correspondant aux filtres (limité au Top N si demandé)
        List<VenteDetailsDTO> data = geVingtQuatreVingt(dtStart, dtEnd, codeFamile, codeRayon, codeGrossiste, 0, 0,
                true, vingtQuatreVingtType, topN, stockFilter, stockMin);

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
        String title = "IINVENTAIRE PRODUITS 20/80 (" + type + ") " + periode;

        int count = inventaireService.create(ids, title);

        return new JSONObject().put("count", count);
    }

}
