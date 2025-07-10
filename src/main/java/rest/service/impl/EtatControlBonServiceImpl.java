package rest.service.impl;

import commonTasks.dto.VenteTiersPayantsDTO;
import dal.MvtTransaction;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraisonDetail_;
import dal.TBonLivraison_;
import dal.TFamille_;
import dal.TGrossiste;
import dal.TGrossiste_;
import dal.TOrder;
import dal.TOrder_;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.EtatControlBonService;
import rest.service.ExcelGeneratorService;
import rest.service.dto.EtatAnnuelDTO;
import rest.service.dto.EtatAnnuelWrapperDTO;
import rest.service.dto.EtatControlAnnuelDTO;
import rest.service.dto.EtatControlAnnuelWrapperDTO;
import rest.service.dto.EtatControlBon;
import rest.service.dto.EtatControlBonEditDto;
import rest.service.dto.GenericExcelDTO;
import rest.service.dto.builder.EtatControlBonBuilder;
import util.Constant;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class EtatControlBonServiceImpl implements EtatControlBonService {

    private static final Logger LOG = Logger.getLogger(EtatControlBonServiceImpl.class.getName());
    private static final String BON_ANNUEL_SQL = " SELECT {groupByLibelle} AS groupByLibelle, SUM(b.`int_MHT`) AS montantHtaxe,SUM(b.`int_TVA`) montantTaxe, sum(b.`int_HTTC`) montantTtc,COUNT(b.`lg_BON_LIVRAISON_ID`) AS nbreBon, SUM(item.itemPrixVente) AS montantVenteTtc  FROM  t_bon_livraison b,t_order o,t_grossiste g,groupefournisseur gp,(SELECT d.`lg_BON_LIVRAISON_ID` AS bonId,   SUM(d.`int_PRIX_VENTE`* d.`int_QTE_RECUE`) AS itemPrixVente FROM t_bon_livraison_detail d GROUP BY bonId) AS item"
            + "  WHERE item.bonId =b.`lg_BON_LIVRAISON_ID` AND  DATE(b.`dt_DATE_LIVRAISON`) BETWEEN  ?1 AND ?2 AND b.`str_STATUT`='is_Closed' AND b.`lg_ORDER_ID` =o.`lg_ORDER_ID` AND o.`lg_GROSSISTE_ID` =g.`lg_GROSSISTE_ID` AND g.`groupeId`=gp.id  {grossisteIdClose} {groupeIdClose}  GROUP BY groupByLibelle ";

    private static final String BON_ANNUEL_SQL_GROUP = " SELECT  SUM(b.`int_MHT`) AS montantHtaxe,SUM(b.`int_TVA`) montantTaxe, sum(b.`int_HTTC`) montantTtc,COUNT(b.`lg_BON_LIVRAISON_ID`) AS nbreBon, SUM(item.itemPrixVente) AS montantVenteTtc  FROM  t_bon_livraison b,t_order o,t_grossiste g,groupefournisseur gp,(SELECT d.`lg_BON_LIVRAISON_ID` AS bonId,   SUM(d.`int_PRIX_VENTE`* d.`int_QTE_RECUE`) AS itemPrixVente FROM t_bon_livraison_detail d GROUP BY bonId) AS item"
            + "  WHERE item.bonId =b.`lg_BON_LIVRAISON_ID` AND  DATE(b.`dt_DATE_LIVRAISON`) BETWEEN  ?1 AND ?2 AND b.`str_STATUT`='is_Closed' AND b.`lg_ORDER_ID` =o.`lg_ORDER_ID` AND o.`lg_GROSSISTE_ID` =g.`lg_GROSSISTE_ID` AND g.`groupeId`=gp.id  {grossisteIdClose} {groupeIdClose}  ";
    private static final String BON_ETATANNUEL_SQL = "SELECT YEAR(b.`dt_DATE_LIVRAISON`) AS annee, MONTH(b.`dt_DATE_LIVRAISON`) AS mois, SUM(b.`int_MHT`) AS montantHtaxe,SUM(b.`int_TVA`) montantTaxe, sum(b.`int_HTTC`) montantTtc  FROM  t_bon_livraison b\n"
            + " WHERE  YEAR(b.`dt_DATE_LIVRAISON`) BETWEEN  ?1 AND ?2  AND b.`str_STATUT`='is_Closed' GROUP BY annee,mois";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String DELETE = "delete";
    @EJB
    private ExcelGeneratorService excelGeneratorService;

    @Override
    public List<EtatControlBon> list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            int start, int limit, boolean all) {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<TBonLivraison> cq = cb.createQuery(TBonLivraison.class);
        Root<TBonLivraison> root = cq.from(TBonLivraison.class);
        cq.select(root).distinct(true).orderBy(cb.desc(root.get(TBonLivraison_.dtDATELIVRAISON)));
        List<Predicate> predicates = listPredicates(cb, root, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                grossisteId, search);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<TBonLivraison> q = em.createQuery(cq);
        if (!all) {
            q.setFirstResult(start);
            q.setMaxResults(limit);

        }
        return q.getResultList().stream().map(e -> EtatControlBonBuilder.build(e))
                .peek(e1 -> e1.setReturnFullBl((!DELETE.equals(e1.getStrSTATUT()) && e1.getIntHTTC() > 0) && fullAuth))
                .collect(Collectors.toList());
    }

    private long count(String search, String dtStart, String dtEnd, String grossisteId) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TBonLivraison> root = cq.from(TBonLivraison.class);
        cq.select(cb.countDistinct(root));
        List<Predicate> predicates = listPredicates(cb, root, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                grossisteId, search);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<Long> q = em.createQuery(cq);
        return Objects.isNull(q.getSingleResult()) ? 0 : q.getSingleResult();

    }

    private List<Predicate> listPredicates(CriteriaBuilder cb, Root<TBonLivraison> root, LocalDate dtStart,
            LocalDate dtEnd, String grossisteId, String search) {
        List<Predicate> predicates = new ArrayList<>();

        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TBonLivraison_.dtDATELIVRAISON)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(cb.equal(root.get(TBonLivraison_.strSTATUT), Constant.STATUT_IS_CLOSED));
        predicates.add(btw);
        if (StringUtils.isNotEmpty(grossisteId)) {
            predicates.add(cb.equal(
                    root.get(TBonLivraison_.lgORDERID).get(TOrder_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID),
                    grossisteId));
        }
        if (StringUtils.isNotEmpty(search)) {
            search = search + "%";
            Join<TBonLivraison, TBonLivraisonDetail> join = root.join(TBonLivraison_.tBonLivraisonDetailCollection);
            predicates.add(cb.or(cb.like(root.get(TBonLivraison_.strREFLIVRAISON), search),
                    cb.like(root.get(TBonLivraison_.lgORDERID).get(TOrder_.strREFORDER), search),
                    cb.like(join.get(TBonLivraisonDetail_.lgFAMILLEID).get(TFamille_.intCIP), search),
                    cb.like(join.get(TBonLivraisonDetail_.lgFAMILLEID).get(TFamille_.strNAME), search)));
        }
        return predicates;
    }

    @Override
    public JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit) {
        long count = count(search, dtStart, dtEnd, grossisteId);
        return FunctionUtils.returnData(list(fullAuth, search, dtStart, dtEnd, grossisteId, start, limit, false),
                count);
    }

    @Override
    public EtatControlAnnuelWrapperDTO listBonAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {

        List<EtatControlAnnuelDTO> list = listBonsAnnuel(groupBy, dtStart, dtEnd, grossisteId, groupeId);
        EtatControlAnnuelWrapperDTO annuelSummary = bonsAnnuelGroup(dtStart, dtEnd, grossisteId, groupeId);
        annuelSummary.setEtatControlAnnuels(list.stream().peek(
                el -> el.setPourcentage(computePercent(el.getMontantTtc(), annuelSummary.getSummary().getTotalTtc())))
                .sorted(Comparator.comparing(EtatControlAnnuelDTO::getGroupByLibelle)).collect(Collectors.toList()));

        return annuelSummary;

    }

    private float computePercent(long montantTTC, long totalTTC) {
        return BigDecimal.valueOf((montantTTC * 100) / Double.valueOf(totalTTC)).setScale(2, RoundingMode.HALF_UP)
                .floatValue();
    }

    private EtatControlAnnuelDTO buildEtatControlAnnuels(Tuple tuple) {
        long montantTtc = tuple.get("montantTtc", BigDecimal.class).longValue();
        long montantVenteTtc = tuple.get("montantVenteTtc", BigDecimal.class).longValue();
        long montantTaxe = tuple.get("montantTaxe", BigDecimal.class).longValue();
        long marge = montantVenteTtc - montantTtc;
        return EtatControlAnnuelDTO.builder().montantMarge(marge)
                .montantHtaxe(tuple.get("montantHtaxe", BigDecimal.class).longValue())
                .nbreBon(tuple.get("nbreBon", BigInteger.class).intValue()).montantTtc(montantTtc)
                .montantTaxe(montantTaxe).groupByLibelle(tuple.get("groupByLibelle", String.class))
                .montantVenteTtc(montantVenteTtc).build();
    }

    private List<EtatControlAnnuelDTO> listBonsAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {
        String sql = BON_ANNUEL_SQL;
        sql = buildSqlQuery(grossisteId, groupeId, sql);

        if ("GROUP".equals(groupBy)) {
            sql = sql.replace("{groupByLibelle}", " gp.libelle ");
        } else {
            sql = sql.replace("{groupByLibelle}", " g.`str_LIBELLE` ");
        }

        LOG.log(Level.INFO, "sql--- listBonAnnuel  {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd));
            List<Tuple> list = query.getResultList();
            return list.stream().map(this::buildEtatControlAnnuels).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private EtatControlAnnuelWrapperDTO bonsAnnuelGroup(String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {
        String sql = BON_ANNUEL_SQL_GROUP;
        sql = buildSqlQuery(grossisteId, groupeId, sql);

        LOG.log(Level.INFO, "sql--- bonsAnnuelGroup  {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd));
            Tuple tuple = (Tuple) query.getSingleResult();
            return buildEtatControlAnnuelSummaryDTO(tuple);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return EtatControlAnnuelWrapperDTO.builder().build();
        }
    }

    private EtatControlAnnuelWrapperDTO buildEtatControlAnnuelSummaryDTO(Tuple tuple) {
        long montantTtc = tuple.get("montantTtc", BigDecimal.class).longValue();
        long montantVenteTtc = tuple.get("montantVenteTtc", BigDecimal.class).longValue();
        long montantTaxe = tuple.get("montantTaxe", BigDecimal.class).longValue();
        long marge = montantVenteTtc - montantTtc;
        return EtatControlAnnuelWrapperDTO.builder()
                .summary(EtatControlAnnuelWrapperDTO.EtatControlAnnuelSummary.builder().totalMarge(marge)
                        .totaltHtaxe(tuple.get("montantHtaxe", BigDecimal.class).longValue())
                        .totalNbreBon(tuple.get("nbreBon", BigInteger.class).intValue()).totalTtc(montantTtc)
                        .totalTaxe(montantTaxe).totalVenteTtc(montantVenteTtc).build())
                .build();
    }

    @Override
    public JSONObject listBonAnnuelView(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {
        EtatControlAnnuelWrapperDTO annuelSummary = listBonAnnuel(groupBy, dtStart, dtEnd, grossisteId, groupeId);
        List<EtatControlAnnuelDTO> annuels = annuelSummary.getEtatControlAnnuels();
        return FunctionUtils.returnData(annuels, annuels.size(), annuelSummary.getSummary());
    }

    private String buildSqlQuery(String grossisteId, Integer groupeId, String sql) {
        if (StringUtils.isNotEmpty(grossisteId)) {
            sql = sql.replace("{grossisteIdClose}", String.format("  AND g.`lg_GROSSISTE_ID`= %s ", grossisteId));
        } else {
            sql = sql.replace("{grossisteIdClose}", " ");
        }
        if (Objects.nonNull(groupeId) && groupeId != 0) {
            sql = sql.replace("{groupeIdClose}", String.format("  AND gp.id= %d ", groupeId));
        } else {
            sql = sql.replace("{groupeIdClose}", " ");
        }

        return sql;
    }

    @Override
    public JSONObject etatLastThreeYears() {
        EtatAnnuelWrapperDTO annuelWrapper = new EtatAnnuelWrapperDTO();
        LocalDate now = LocalDate.now();
        Map<Integer, List<EtatAnnuelDTO>> map = etatBonAnnuelQuery().stream()
                .collect(Collectors.groupingBy(EtatAnnuelDTO::getAnnee));
        map.forEach((annee, value) -> {
            EtatAnnuelDTO annuel = new EtatAnnuelDTO();
            annuel.setAnnee(annee);
            value.forEach(e -> {
                annuel.setJanvier(annuel.getJanvier() + e.getJanvier());
                annuel.setFevrier(annuel.getFevrier() + e.getFevrier());
                annuel.setMars(annuel.getMars() + e.getMars());
                annuel.setAvril(annuel.getAvril() + e.getAvril());
                annuel.setMai(annuel.getMai() + e.getMai());
                annuel.setJuin(annuel.getJuin() + e.getJuin());
                annuel.setJuillet(annuel.getJuillet() + e.getJuillet());
                annuel.setAout(annuel.getAout() + e.getAout());
                annuel.setSeptembre(annuel.getSeptembre() + e.getSeptembre());
                annuel.setOctobre(annuel.getOctobre() + e.getOctobre());
                annuel.setNovembre(annuel.getNovembre() + e.getNovembre());
                annuel.setDecembre(annuel.getDecembre() + e.getDecembre());
            });
            if (annee == now.getYear()) {
                annuelWrapper.setCurrentYear(annuel);
            } else if (annee == now.minusYears(1).getYear()) {
                annuelWrapper.setYearMinusOne(annuel);
            } else if (annee == now.minusYears(2).getYear()) {
                annuelWrapper.setYearMinusTwo(annuel);
            }
        });
        return new JSONObject(annuelWrapper);
    }

    private List<EtatAnnuelDTO> etatBonAnnuelQuery() {
        LocalDate now = LocalDate.now();
        try {
            Query query = em.createNativeQuery(BON_ETATANNUEL_SQL, Tuple.class)
                    .setParameter(1, now.minusYears(2).getYear()).setParameter(2, now.getYear());
            return ((List<Tuple>) query.getResultList()).stream().map(this::buildEtatAnnuelDTO)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private EtatAnnuelDTO buildEtatAnnuelDTO(Tuple tuple) {
        EtatAnnuelDTO annuel = new EtatAnnuelDTO();
        annuel.setAnnee(tuple.get("annee", Integer.class));
        int mois = tuple.get("mois", Integer.class);
        long montantTtc = tuple.get("montantTtc", BigDecimal.class).longValue();
        switch (mois) {
        case 1:
            annuel.setJanvier(montantTtc);
            break;
        case 2:
            annuel.setFevrier(montantTtc);
            break;
        case 3:
            annuel.setMars(montantTtc);
            break;
        case 4:
            annuel.setAvril(montantTtc);
            break;
        case 5:
            annuel.setMai(montantTtc);
            break;
        case 6:
            annuel.setJuin(montantTtc);
            break;
        case 7:
            annuel.setJuillet(montantTtc);
            break;
        case 8:
            annuel.setAout(montantTtc);
            break;
        case 9:
            annuel.setSeptembre(montantTtc);
            break;
        case 10:
            annuel.setOctobre(montantTtc);
            break;
        case 11:
            annuel.setNovembre(montantTtc);
            break;
        case 12:
            annuel.setDecembre(montantTtc);
            break;
        default:
            break;
        }
        return annuel;
    }

    @Override
    public JSONObject updateBon(EtatControlBonEditDto bonEdit) {
        JSONObject json = new JSONObject();

        TBonLivraison bonLivraison = getById(bonEdit.getBonId());
        TGrossiste grossiste = getByNameOrId(bonEdit.getGrossisteId());
        MvtTransaction mt = getByPkey(bonLivraison.getLgBONLIVRAISONID());
        TOrder order = bonLivraison.getLgORDERID();
        order.setLgGROSSISTEID(grossiste);

        long amount = getDetailsAmount(new ArrayList<>(bonLivraison.getTBonLivraisonDetailCollection()));
        if (bonEdit.getMontantHt() != amount) {
            json.put("status", 0).put("message",
                    "Le montant HT saisie est différent du montant HT de la somme des différents articles du BL qui est : "
                            + amount);
            return json;
        }
        bonLivraison.setDtDATELIVRAISON(java.sql.Date.valueOf(bonEdit.getDateLivraison()));
        bonLivraison.setIntMHT(bonEdit.getMontantHt());
        bonLivraison.setIntTVA(bonEdit.getTva());
        bonLivraison.setIntHTTC(bonEdit.getTva() + bonEdit.getMontantHt());
        bonLivraison.setStrREFLIVRAISON(bonEdit.getReferenceBon());
        mt.setGrossiste(grossiste);
        mt.setReference(bonLivraison.getStrREFLIVRAISON());
        mt.setMontant(bonLivraison.getIntHTTC());
        mt.setMontantNet(bonLivraison.getIntMHT());
        mt.setMontantTva(bonLivraison.getIntTVA());
        mt.setMontantRestant(bonLivraison.getIntHTTC());
        mt.setMontantAcc(bonLivraison.getIntMHT());
        mt.setMvtDate(LocalDate.parse(bonEdit.getDateLivraison()));
        mt.setCreatedAt(mt.getMvtDate().atStartOfDay());
        em.merge(bonLivraison);
        em.merge(order);
        em.merge(mt);

        return json.put("status", 1).put("message", "Le BL mis à jour avec succès");
    }

    private TBonLivraison getById(String bonId) {
        return em.find(TBonLivraison.class, bonId);
    }

    private TGrossiste getByNameOrId(String nameOrId) {
        TypedQuery<TGrossiste> q = em.createQuery(
                "SELECT o FROM TGrossiste o WHERE (o.lgGROSSISTEID=:nameOrId OR o.strLIBELLE=:nameOrId)",
                TGrossiste.class);
        q.setParameter("nameOrId", nameOrId.trim());
        q.setMaxResults(1);
        return q.getSingleResult();
    }

    private MvtTransaction getByPkey(String bonId) {
        TypedQuery<MvtTransaction> q = em.createQuery("SELECT o FROM MvtTransaction o WHERE o.pkey=?1",
                MvtTransaction.class);
        q.setParameter(1, bonId);
        q.setMaxResults(1);
        return q.getSingleResult();
    }

    private long getDetailsAmount(List<TBonLivraisonDetail> bonLivraisonDetails) {
        return bonLivraisonDetails.stream().mapToLong((value) -> {
            return (value.getIntPAF() * value.getIntQTECMDE());
        }).sum();
    }

    @Override
    public byte[] generate(String search, String dtStart, String dtEnd, String grossisteId) throws IOException {
        return this.excelGeneratorService.generate(buildExeclData(search, dtStart, dtEnd, grossisteId), "bordereau");
    }

    @Override
    public byte[] generate(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId)
            throws IOException {
        return this.excelGeneratorService.generate(buildExeclData(groupBy, dtStart, dtEnd, grossisteId, groupeId),
                "bordereau_annuel");
    }

    private GenericExcelDTO buildExeclData(String search, String dtStart, String dtEnd, String grossisteId) {
        GenericExcelDTO genericExcel = new GenericExcelDTO();
        List<EtatControlBon> data = this.list(false, search, dtStart, dtEnd, grossisteId, 0, 0, true);

        genericExcel.addColumn("Grossiste", "No Commande", "Réf Bon", "Montant Ht", "Montant Tva", "Montant Ttc",
                "Date livraison", "Date d'entrée", "Montant avoir", "Opérateur");
        genericExcel.addWidths(12000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000);
        data.forEach(d -> {

            Object[] row = { d.getFournisseurLibelle(), d.getOrderRef(), d.getStrREFLIVRAISON(), d.getIntMHT(),
                    d.getIntTVA(), d.getIntHTTC(), d.getDtDATELIVRAISON(), d.getDtCREATED(), d.getMontantAvoir(),
                    d.getUserName() };
            genericExcel.addRow(row);
        });

        return genericExcel;
    }

    private GenericExcelDTO buildExeclData(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {
        GenericExcelDTO genericExcel = new GenericExcelDTO();
        EtatControlAnnuelWrapperDTO annuelSummary = listBonAnnuel(groupBy, dtStart, dtEnd, grossisteId, groupeId);
        List<EtatControlAnnuelDTO> annuels = annuelSummary.getEtatControlAnnuels();
        genericExcel.addColumn("Libellé", "Total Ht", "Total Tva", "Total Ttc", "Total vente Ttc", "Totam marge",
                "Nombre de bon", "Ttc%");
        genericExcel.addWidths(12000, 6000, 6000, 6000, 6000, 6000, 6000, 6000);
        annuels.forEach(d -> {

            Object[] row = { d.getGroupByLibelle(), d.getMontantHtaxe(), d.getMontantTaxe(), d.getMontantTtc(),
                    d.getMontantVenteTtc(), d.getMontantMarge(), d.getNbreBon(), d.getPourcentage() };
            genericExcel.addRow(row);
        });

        return genericExcel;
    }
}
