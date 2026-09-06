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
import javax.persistence.metamodel.SingularAttribute;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.EtatControlBonService;
import rest.service.ExcelGeneratorService;
import rest.service.dto.AchatGrossisteMensuelDTO;
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
    // Bornes de dates comparees directement a la colonne (>= debut, < fin+1j) pour rester "sargable"
    // (utilisation de l'index sur dt_DATE_LIVRAISON), conformement au standard du projet.
    // La table derivee "item" est filtree sur la meme periode/statut afin de ne plus agreger
    // tout l'historique de t_bon_livraison_detail (cause principale de la lenteur).
    // LEFT JOIN groupefournisseur : un grossiste sans groupe reste inclus dans l'etat.
    private static final String BON_ANNUEL_SQL = " SELECT {groupByLibelle} AS groupByLibelle, SUM(b.`int_MHT`) AS montantHtaxe,SUM(b.`int_TVA`) montantTaxe, SUM(b.`int_HTTC`) montantTtc,COUNT(b.`lg_BON_LIVRAISON_ID`) AS nbreBon, SUM(item.itemPrixVente) AS montantVenteTtc, SUM(item.itemAvoir) AS montantAvoir "
            + " FROM t_bon_livraison b JOIN t_order o ON b.`lg_ORDER_ID`=o.`lg_ORDER_ID` JOIN t_grossiste g ON o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` LEFT JOIN groupefournisseur gp ON g.`groupeId`=gp.id "
            + " JOIN (SELECT d.`lg_BON_LIVRAISON_ID` AS bonId, SUM(d.`int_PRIX_VENTE`* d.`int_QTE_RECUE`) AS itemPrixVente, SUM(IFNULL(d.`int_QTE_RETURN`,0)* d.`int_PAF`) AS itemAvoir FROM t_bon_livraison_detail d JOIN t_bon_livraison b2 ON d.`lg_BON_LIVRAISON_ID`=b2.`lg_BON_LIVRAISON_ID` WHERE b2.`dt_DATE_LIVRAISON` >= ?1 AND b2.`dt_DATE_LIVRAISON` < ?2 AND b2.`str_STATUT`='is_Closed' GROUP BY bonId) AS item ON item.bonId=b.`lg_BON_LIVRAISON_ID` "
            + " WHERE b.`dt_DATE_LIVRAISON` >= ?3 AND b.`dt_DATE_LIVRAISON` < ?4 AND b.`str_STATUT`='is_Closed' {grossisteIdClose} {groupeIdClose} GROUP BY groupByLibelle ";

    private static final String ACHAT_MENSUEL_SQL = " SELECT g.`lg_GROSSISTE_ID` AS grossisteId, g.`str_LIBELLE` AS libelle, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=1 THEN b.{amountColumn} ELSE 0 END) AS janvier, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=2 THEN b.{amountColumn} ELSE 0 END) AS fevrier, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=3 THEN b.{amountColumn} ELSE 0 END) AS mars, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=4 THEN b.{amountColumn} ELSE 0 END) AS avril, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=5 THEN b.{amountColumn} ELSE 0 END) AS mai, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=6 THEN b.{amountColumn} ELSE 0 END) AS juin, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=7 THEN b.{amountColumn} ELSE 0 END) AS juillet, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=8 THEN b.{amountColumn} ELSE 0 END) AS aout, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=9 THEN b.{amountColumn} ELSE 0 END) AS septembre, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=10 THEN b.{amountColumn} ELSE 0 END) AS octobre, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=11 THEN b.{amountColumn} ELSE 0 END) AS novembre, "
            + " SUM(CASE WHEN MONTH(b.`dt_DATE_LIVRAISON`)=12 THEN b.{amountColumn} ELSE 0 END) AS decembre, "
            + " SUM(b.{amountColumn}) AS total "
            + " FROM t_bon_livraison b JOIN t_order o ON b.`lg_ORDER_ID`=o.`lg_ORDER_ID` JOIN t_grossiste g ON o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` "
            + " WHERE b.`dt_DATE_LIVRAISON` >= ?1 AND b.`dt_DATE_LIVRAISON` < ?2 AND b.`str_STATUT`='is_Closed' "
            + " GROUP BY g.`lg_GROSSISTE_ID`, g.`str_LIBELLE` ORDER BY libelle ";
    private static final String BON_ETATANNUEL_SQL = "SELECT YEAR(b.`dt_DATE_LIVRAISON`) AS annee, MONTH(b.`dt_DATE_LIVRAISON`) AS mois, SUM(b.`int_MHT`) AS montantHtaxe,SUM(b.`int_TVA`) montantTaxe, sum(b.`int_HTTC`) montantTtc  FROM  t_bon_livraison b\n"
            + " WHERE  YEAR(b.`dt_DATE_LIVRAISON`) BETWEEN  ?1 AND ?2  AND b.`str_STATUT`='is_Closed' GROUP BY annee,mois";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String DELETE = "delete";
    // Type de filtre sur la date : "ENTREE" => dt_CREATED (date d'entree en stock),
    // sinon (defaut) => dt_DATE_LIVRAISON (date du BL). Pas de regression : valeur absente = comportement actuel.
    private static final String DATE_TYPE_ENTREE = "ENTREE";
    @EJB
    private ExcelGeneratorService excelGeneratorService;

    private SingularAttribute<TBonLivraison, Date> dateAttribute(String dateType) {
        return DATE_TYPE_ENTREE.equalsIgnoreCase(dateType) ? TBonLivraison_.dtCREATED : TBonLivraison_.dtDATELIVRAISON;
    }

    @Override
    public List<EtatControlBon> list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            int start, int limit, boolean all, String dateType) {

        SingularAttribute<TBonLivraison, Date> dateAttr = dateAttribute(dateType);
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<TBonLivraison> cq = cb.createQuery(TBonLivraison.class);
        Root<TBonLivraison> root = cq.from(TBonLivraison.class);
        cq.select(root).distinct(true).orderBy(cb.desc(root.get(dateAttr)));
        List<Predicate> predicates = listPredicates(cb, root, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                grossisteId, search, dateAttr);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<TBonLivraison> q = em.createQuery(cq);
        if (!all) {
            q.setFirstResult(start);
            q.setMaxResults(limit);

        }
        // Un bon dont la commande a disparu est ecarte plutot que de faire echouer tout l'ecran
        // (voir EtatControlBonBuilder.build).
        return q.getResultList().stream().map(EtatControlBonBuilder::build).filter(Objects::nonNull)
                .peek(e1 -> e1.setReturnFullBl((!DELETE.equals(e1.getStrSTATUT()) && e1.getIntHTTC() > 0) && fullAuth))
                .collect(Collectors.toList());
    }

    private long count(String search, String dtStart, String dtEnd, String grossisteId, String dateType) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TBonLivraison> root = cq.from(TBonLivraison.class);
        cq.select(cb.countDistinct(root));
        List<Predicate> predicates = listPredicates(cb, root, LocalDate.parse(dtStart), LocalDate.parse(dtEnd),
                grossisteId, search, dateAttribute(dateType));
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<Long> q = em.createQuery(cq);
        return Objects.isNull(q.getSingleResult()) ? 0 : q.getSingleResult();

    }

    private List<Predicate> listPredicates(CriteriaBuilder cb, Root<TBonLivraison> root, LocalDate dtStart,
            LocalDate dtEnd, String grossisteId, String search, SingularAttribute<TBonLivraison, Date> dateAttr) {
        List<Predicate> predicates = new ArrayList<>();

        // On compare directement la colonne (TIMESTAMP) avec des bornes, sans l'envelopper dans DATE(...).
        // Cela rend le predicat "sargable" : MySQL peut utiliser l'index sur la colonne de date
        // au lieu de scanner toute la table (cause de la lenteur au chargement et en recherche).
        Date startInclusive = java.sql.Timestamp.valueOf(dtStart.atStartOfDay());
        Date endExclusive = java.sql.Timestamp.valueOf(dtEnd.plusDays(1).atStartOfDay());
        // Jointure INTERNE sur la commande : un bon dont la commande a disparu de la base ne peut
        // pas etre mis en forme (le grossiste se lit sur la commande), et le chargement paresseux
        // levait alors une exception qui remontait jusqu'a la ressource - l'ecran ENTIER repartait
        // en erreur a cause d'un seul bon incoherent. La jointure les ecarte des la requete, ce
        // qu'un rattrapage en Java ne peut pas faire : l'exception survient au commit.
        // Le meme predicat sert a la liste et au comptage : les deux doivent voir le meme ensemble.
        root.join(TBonLivraison_.lgORDERID, javax.persistence.criteria.JoinType.INNER);
        predicates.add(cb.equal(root.get(TBonLivraison_.strSTATUT), Constant.STATUT_IS_CLOSED));
        predicates.add(cb.greaterThanOrEqualTo(root.get(dateAttr), startInclusive));
        predicates.add(cb.lessThan(root.get(dateAttr), endExclusive));
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
            int limit, String dateType) {
        long count = count(search, dtStart, dtEnd, grossisteId, dateType);
        return FunctionUtils
                .returnData(list(fullAuth, search, dtStart, dtEnd, grossisteId, start, limit, false, dateType), count);
    }

    /**
     * Meme liste, filtree en outre par statut de controle et par presence d'ecarts (point 17).
     *
     * <p>
     * Ces deux criteres ne peuvent pas etre poses en base : le statut est calcule apres coup a partir des lignes du
     * bon, et l'ecart se lit en comparant la quantite controlee a la quantite recue. La liste complete est donc
     * chargee, filtree, PUIS paginee ; sans quoi les pages seraient inegales et le total faux. Sans critere, on retombe
     * sur la pagination en base, bien plus econome.
     */
    @Override
    public JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit, String dateType, String statutControle, String ecart) {
        rest.service.filtre.FiltresControleAchat filtres = new rest.service.filtre.FiltresControleAchat(statutControle,
                ecart);
        if (filtres.inactif()) {
            return list(fullAuth, search, dtStart, dtEnd, grossisteId, start, limit, dateType);
        }
        List<EtatControlBon> retenus = filtres
                .appliquer(list(fullAuth, search, dtStart, dtEnd, grossisteId, 0, 0, true, dateType));
        int debut = Math.max(0, Math.min(start, retenus.size()));
        int fin = limit > 0 ? Math.min(debut + limit, retenus.size()) : retenus.size();
        return FunctionUtils.returnData(retenus.subList(debut, fin), retenus.size());
    }

    /** Toutes les lignes retenues par les criteres, sans pagination : pour l'impression et l'export. */
    @Override
    public List<EtatControlBon> tous(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            String dateType, String statutControle, String ecart) {
        return new rest.service.filtre.FiltresControleAchat(statutControle, ecart)
                .appliquer(list(fullAuth, search, dtStart, dtEnd, grossisteId, 0, 0, true, dateType));
    }

    @Override
    public EtatControlAnnuelWrapperDTO listBonAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {

        List<EtatControlAnnuelDTO> list = listBonsAnnuel(groupBy, dtStart, dtEnd, grossisteId, groupeId);
        // Les totaux sont la somme des lignes groupees (meme filtre) : on les calcule en Java
        // au lieu de relancer une seconde requete identique sur la base.
        EtatControlAnnuelWrapperDTO annuelSummary = EtatControlAnnuelWrapperDTO.builder()
                .summary(buildEtatControlAnnuelSummaryDTO(list)).build();
        annuelSummary.setEtatControlAnnuels(list.stream().peek(
                el -> el.setPourcentage(computePercent(el.getMontantTtc(), annuelSummary.getSummary().getTotalTtc())))
                .sorted(Comparator.comparing(EtatControlAnnuelDTO::getGroupByLibelle)).collect(Collectors.toList()));

        return annuelSummary;

    }

    private float computePercent(long montantTTC, long totalTTC) {
        if (totalTTC == 0) {
            return 0;
        }
        return BigDecimal.valueOf((montantTTC * 100) / Double.valueOf(totalTTC)).setScale(2, RoundingMode.HALF_UP)
                .floatValue();
    }

    private long toLong(Tuple tuple, String alias) {
        Number value = tuple.get(alias, Number.class);
        return Objects.isNull(value) ? 0 : value.longValue();
    }

    private EtatControlAnnuelDTO buildEtatControlAnnuels(Tuple tuple) {
        long montantTtc = toLong(tuple, "montantTtc");
        long montantVenteTtc = toLong(tuple, "montantVenteTtc");
        long montantTaxe = toLong(tuple, "montantTaxe");
        long marge = montantVenteTtc - montantTtc;
        return EtatControlAnnuelDTO.builder().montantMarge(marge).montantHtaxe(toLong(tuple, "montantHtaxe"))
                .nbreBon(tuple.get("nbreBon", BigInteger.class).intValue()).montantTtc(montantTtc)
                .montantTaxe(montantTaxe).groupByLibelle(tuple.get("groupByLibelle", String.class))
                .montantAvoir(toLong(tuple, "montantAvoir")).montantVenteTtc(montantVenteTtc).build();
    }

    private List<EtatControlAnnuelDTO> listBonsAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {
        String sql = BON_ANNUEL_SQL;
        boolean withGrossiste = StringUtils.isNotEmpty(grossisteId);
        boolean withGroupe = Objects.nonNull(groupeId) && groupeId != 0;
        int paramIndex = 5;
        int grossisteParamIndex = 0;
        int groupeParamIndex = 0;
        if (withGrossiste) {
            grossisteParamIndex = paramIndex++;
            sql = sql.replace("{grossisteIdClose}", " AND g.`lg_GROSSISTE_ID`= ?" + grossisteParamIndex + " ");
        } else {
            sql = sql.replace("{grossisteIdClose}", " ");
        }
        if (withGroupe) {
            groupeParamIndex = paramIndex;
            sql = sql.replace("{groupeIdClose}", " AND gp.id= ?" + groupeParamIndex + " ");
        } else {
            sql = sql.replace("{groupeIdClose}", " ");
        }

        if ("GROUP".equals(groupBy)) {
            sql = sql.replace("{groupByLibelle}", " IFNULL(gp.libelle,'SANS GROUPE') ");
        } else {
            sql = sql.replace("{groupByLibelle}", " g.`str_LIBELLE` ");
        }

        LOG.log(Level.INFO, "sql--- listBonAnnuel  {0}", sql);
        try {
            java.sql.Timestamp startInclusive = java.sql.Timestamp.valueOf(LocalDate.parse(dtStart).atStartOfDay());
            java.sql.Timestamp endExclusive = java.sql.Timestamp
                    .valueOf(LocalDate.parse(dtEnd).plusDays(1).atStartOfDay());
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, startInclusive)
                    .setParameter(2, endExclusive).setParameter(3, startInclusive).setParameter(4, endExclusive);
            if (withGrossiste) {
                query.setParameter(grossisteParamIndex, grossisteId);
            }
            if (withGroupe) {
                query.setParameter(groupeParamIndex, groupeId);
            }
            List<Tuple> list = query.getResultList();
            return list.stream().map(this::buildEtatControlAnnuels).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private EtatControlAnnuelWrapperDTO.EtatControlAnnuelSummary buildEtatControlAnnuelSummaryDTO(
            List<EtatControlAnnuelDTO> list) {
        long montantTtc = list.stream().mapToLong(EtatControlAnnuelDTO::getMontantTtc).sum();
        long montantVenteTtc = list.stream().mapToLong(EtatControlAnnuelDTO::getMontantVenteTtc).sum();
        return EtatControlAnnuelWrapperDTO.EtatControlAnnuelSummary.builder().totalMarge(montantVenteTtc - montantTtc)
                .totaltHtaxe(list.stream().mapToLong(EtatControlAnnuelDTO::getMontantHtaxe).sum())
                .totalNbreBon(list.stream().mapToInt(EtatControlAnnuelDTO::getNbreBon).sum()).totalTtc(montantTtc)
                .totalTaxe(list.stream().mapToLong(EtatControlAnnuelDTO::getMontantTaxe).sum())
                .totalAvoir(list.stream().mapToLong(EtatControlAnnuelDTO::getMontantAvoir).sum())
                .totalVenteTtc(montantVenteTtc).build();
    }

    @Override
    public JSONObject listBonAnnuelView(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId) {
        EtatControlAnnuelWrapperDTO annuelSummary = listBonAnnuel(groupBy, dtStart, dtEnd, grossisteId, groupeId);
        List<EtatControlAnnuelDTO> annuels = annuelSummary.getEtatControlAnnuels();
        return FunctionUtils.returnData(annuels, annuels.size(), annuelSummary.getSummary());
    }

    @Override
    public List<AchatGrossisteMensuelDTO> listAchatsMensuels(String dtStart, String dtEnd, String type) {
        // type = "HT" => int_MHT, sinon TTC (int_HTTC) par defaut.
        String sql = ACHAT_MENSUEL_SQL.replace("{amountColumn}",
                "HT".equalsIgnoreCase(type) ? "`int_MHT`" : "`int_HTTC`");
        try {
            java.sql.Timestamp startInclusive = java.sql.Timestamp.valueOf(LocalDate.parse(dtStart).atStartOfDay());
            java.sql.Timestamp endExclusive = java.sql.Timestamp
                    .valueOf(LocalDate.parse(dtEnd).plusDays(1).atStartOfDay());
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, startInclusive).setParameter(2,
                    endExclusive);
            List<Tuple> list = query.getResultList();
            return list.stream().map(this::buildAchatGrossisteMensuel).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private AchatGrossisteMensuelDTO buildAchatGrossisteMensuel(Tuple tuple) {
        return AchatGrossisteMensuelDTO.builder().grossisteId(tuple.get("grossisteId", String.class))
                .libelle(tuple.get("libelle", String.class)).janvier(toLong(tuple, "janvier"))
                .fevrier(toLong(tuple, "fevrier")).mars(toLong(tuple, "mars")).avril(toLong(tuple, "avril"))
                .mai(toLong(tuple, "mai")).juin(toLong(tuple, "juin")).juillet(toLong(tuple, "juillet"))
                .aout(toLong(tuple, "aout")).septembre(toLong(tuple, "septembre")).octobre(toLong(tuple, "octobre"))
                .novembre(toLong(tuple, "novembre")).decembre(toLong(tuple, "decembre")).total(toLong(tuple, "total"))
                .build();
    }

    @Override
    public JSONObject achatsMensuelsView(String dtStart, String dtEnd, String type) {
        List<AchatGrossisteMensuelDTO> achats = listAchatsMensuels(dtStart, dtEnd, type);
        return FunctionUtils.returnData(achats, achats.size());
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
    public java.util.Set<String> produitsDesBons(List<String> bonIds) {
        if (bonIds == null || bonIds.isEmpty()) {
            return java.util.Collections.emptySet();
        }
        try {
            /*
             * La liste des produits est resolue ICI et non dans le navigateur : un bon peut porter des centaines de
             * lignes, et l'ecran n'a a envoyer que les identifiants des bons coches. LinkedHashSet : sans doublon - un
             * produit livre sur deux bons ne donne qu'une ligne d'inventaire - et dans un ordre stable.
             */
            List<String> ids = em
                    .createQuery("SELECT DISTINCT d.lgFAMILLEID.lgFAMILLEID FROM TBonLivraisonDetail d"
                            + " WHERE d.lgBONLIVRAISONID.lgBONLIVRAISONID IN :bons", String.class)
                    .setParameter("bons", bonIds).getResultList();
            return new java.util.LinkedHashSet<>(ids);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produitsDesBons", e);
            return java.util.Collections.emptySet();
        }
    }

    /** Les trois seuls etats qu'un bon puisse porter, ecrits tels que la table les attend. */
    static final String NON_REGLE = "NON REGLE";
    static final String REGLE_EN_PARTIE = "REGLE EN PARTIE";
    static final String REGLE = "REGLE";

    /**
     * Etat demande par l'ecran, ramene a l'une des trois valeurs connues.
     *
     * <p>
     * Rien d'autre ne doit pouvoir entrer en base : la colonne est lue telle quelle par les listes et les etats, une
     * valeur inattendue y resterait sans que personne ne la voie.
     */
    static String statutDeReglement(String demande) {
        String valeur = StringUtils.trimToEmpty(demande).toUpperCase();
        if (REGLE_EN_PARTIE.equals(valeur)) {
            return REGLE_EN_PARTIE;
        }
        if (REGLE.equals(valeur) || "REGLE TOTALEMENT".equals(valeur)) {
            return REGLE;
        }
        return NON_REGLE;
    }

    @Override
    public JSONObject reglerBons(List<String> bonIds, String statut, String dateReglement, Integer montantRegle) {
        JSONObject json = new JSONObject();
        if (bonIds == null || bonIds.isEmpty()) {
            return json.put("success", false).put("msg", "Veuillez sélectionner au moins un bon de livraison.");
        }
        String etat = statutDeReglement(statut);
        Date date = null;
        if (!NON_REGLE.equals(etat)) {
            try {
                date = java.sql.Date.valueOf(LocalDate.parse(StringUtils.trimToEmpty(dateReglement)));
            } catch (RuntimeException e) {
                return json.put("success", false).put("msg", "Veuillez indiquer une date de règlement valide.");
            }
        }
        if (REGLE_EN_PARTIE.equals(etat) && (montantRegle == null || montantRegle <= 0)) {
            return json.put("success", false).put("msg", "Veuillez indiquer le montant réglé.");
        }
        int marques = 0;
        try {
            for (String id : bonIds) {
                TBonLivraison bon = getById(id);
                if (bon == null) {
                    continue;
                }
                /*
                 * Le montant de reference est le TTC du bon. Le reste a payer se DEDUIT du montant verse : le laisser
                 * saisir a la main, c'est accepter qu'il ne corresponde pas au bon.
                 */
                int ttc = bon.getIntHTTC() != null ? bon.getIntHTTC() : 0;
                bon.setSTATUS(etat);
                bon.setDtREGLEMENTDATE(date);
                if (NON_REGLE.equals(etat)) {
                    bon.setIntMONTANTREGLE(0);
                    bon.setIntMONTANTRESTANT(ttc);
                } else if (REGLE_EN_PARTIE.equals(etat)) {
                    int verse = Math.min(montantRegle, ttc);
                    bon.setIntMONTANTREGLE(verse);
                    bon.setIntMONTANTRESTANT(ttc - verse);
                } else {
                    bon.setIntMONTANTREGLE(ttc);
                    bon.setIntMONTANTRESTANT(0);
                }
                em.merge(bon);
                marques++;
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglerBons", e);
            return json.put("success", false).put("msg", "Le règlement n'a pas pu être enregistré.");
        }
        if (marques == 0) {
            return json.put("success", false).put("msg", "Aucun des bons sélectionnés n'a été retrouvé.");
        }
        return json.put("success", true).put("count", marques).put("statut", etat);
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
    public byte[] generate(String search, String dtStart, String dtEnd, String grossisteId, String dateType)
            throws IOException {
        return this.excelGeneratorService.generate(buildExeclData(search, dtStart, dtEnd, grossisteId, dateType),
                "bordereau");
    }

    @Override
    public byte[] generate(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId)
            throws IOException {
        return this.excelGeneratorService.generate(buildExeclData(groupBy, dtStart, dtEnd, grossisteId, groupeId),
                "bordereau_annuel");
    }

    private GenericExcelDTO buildExeclData(String search, String dtStart, String dtEnd, String grossisteId,
            String dateType) {
        GenericExcelDTO genericExcel = new GenericExcelDTO();
        List<EtatControlBon> data = this.list(false, search, dtStart, dtEnd, grossisteId, 0, 0, true, dateType);

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
        genericExcel.addColumn("Libellé", "Total Ht", "Total Tva", "Avoir", "Total Ttc", "Total vente Ttc",
                "Total marge", "Nombre de bon", "Ttc%");
        genericExcel.addWidths(12000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000);
        annuels.forEach(d -> {

            Object[] row = { d.getGroupByLibelle(), d.getMontantHtaxe(), d.getMontantTaxe(), d.getMontantAvoir(),
                    d.getMontantTtc(), d.getMontantVenteTtc(), d.getMontantMarge(), d.getNbreBon(),
                    d.getPourcentage() };
            genericExcel.addRow(row);
        });

        return genericExcel;
    }
}
