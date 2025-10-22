package rest.service.impl;

import commonTasks.dto.BalanceDTO;
import commonTasks.dto.GenericDTO;
import commonTasks.dto.SummaryDTO;
import commonTasks.dto.TableauBaordPhDTO;
import commonTasks.dto.TableauBaordSummary;
import commonTasks.dto.TvaDTO;
import commonTasks.dto.VenteReglementReportDTO;
import dal.TParameters;
import dal.enumeration.TypeTransaction;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.Collections;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;

import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import rest.service.BalanceService;
import rest.service.dto.BalanceParamsDTO;
import rest.service.dto.BalanceVenteItemDTO;
import rest.service.dto.EtatAnnuelDTO;
import rest.service.dto.EtatAnnuelWrapperDTO;
import util.Constant;
import util.DateConverter;
import dal.TEmplacement;
import java.io.FileInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.inject.Inject;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MagasinService;
import util.FunctionUtils;

/**
 * @author koben
 */
@Stateless
public class BalanceServiceImpl implements BalanceService {

    private static final Logger LOG = Logger.getLogger(BalanceServiceImpl.class.getName());
    private static final String BALANCE_SQL_QUERY = "SELECT %s %s m.`typeTransaction`  AS typeVente, m.`typeReglementId` AS typeReglement ,SUM(m.montant) AS montantTTC,"
            + "SUM(m.`montantNet`) AS montantNet,SUM(m.`montantCredit`) AS montantCredit,SUM(m.`montantRemise`) AS montantRemise, SUM(CASE WHEN m.flag_id IS NOT NULL THEN m.`montantAcc` ELSE 0 END) AS flagedAmount,"
            + " SUM(m.`montantRegle`) AS montantRegle, SUM(m.`montantPaye`) AS montantPaye,SUM(m.`montantRestant`) AS montantDiffere,SUM(sqlQ.montantTTCDetatil) AS montantTTCDetatil,SUM(sqlQ.montantTTCDetatilReal) AS montantTTCDetatilReal,SUM(sqlQ.montantAChat) AS montantAChat, "
            + " SUM(sqlQ.montantUg) AS montantUg,SUM(sqlQ.montantAchatDetatilToRemove) AS montantAchatDetatilToRemove,SUM(sqlQ.montantTTCDetatilToRemove) AS montantTTCDetatilToRemove,SUM(sqlQ.montantTva) AS montantTva,SUM(sqlQ.montantAchatUg) AS montantAchatUg,SUM(sqlQ.montantRemiseDetail) AS montantRemiseDetail, SUM(sqlQ.montantTvaUg) AS montantTvaUg,"
            + " SUM(CASE WHEN p.`int_PRICE` <0 OR p.`b_IS_CANCEL`=1 THEN 0 ELSE 1 END) AS totalVente,SUM(m.`avoidAmount`) AS avoidAmount,SUM(m.`montantAcc`) AS montantAcc "
            + " FROM  mvttransaction m,t_preenregistrement p,(SELECT d.`lg_PREENREGISTREMENT_ID` AS idVente,"
            + " SUM(d.`int_PRICE`) AS montantTTCDetatilReal,SUM(d.`int_QUANTITY`*d.`prixAchat`) AS montantAChat,SUM(d.`int_UG`*d.`int_PRICE_UNITAIR`) AS montantUg,SUM(d.`montantTva`) AS montantTva "
            + ",SUM(d.`int_UG`*d.`prixAchat`) AS montantAchatUg,SUM(d.`int_PRICE_REMISE`) AS montantRemiseDetail,SUM(d.montanttvaug) AS montantTvaUg , SUM(CASE WHEN d.`bool_ACCOUNT` THEN d.`int_PRICE` ELSE 0 END) AS montantTTCDetatil,"
            + " SUM(CASE WHEN d.`bool_ACCOUNT` IS FALSE THEN d.`int_PRICE` ELSE 0 END) AS montantTTCDetatilToRemove,SUM(CASE WHEN d.`bool_ACCOUNT` IS FALSE THEN (d.`prixAchat`*d.`int_QUANTITY`) ELSE 0 END) AS montantAchatDetatilToRemove "
            + " FROM t_preenregistrement_detail d  GROUP BY d.`lg_PREENREGISTREMENT_ID`  ) AS sqlQ  WHERE  sqlQ.idVente=p.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.lg_PREENREGISTREMENT_ID AND  DATE(p.`dt_UPDATED`) BETWEEN "
            + " ?3 AND ?4 AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?1 AND m.`lg_EMPLACEMENT_ID` =?2 AND p.imported=0 {excludeStatement} GROUP BY typeVente,typeReglement %s %s";

    private static final String RAPPORT_SQL_QUERY = "SELECT m.`typeMvtCaisseId` AS typeMvtCaisse, m.`typeTransaction`  AS typeVente, m.`typeReglementId` AS typeReglement ,SUM(m.montant) AS montantTTC,"
            + "SUM(m.`montantNet`) AS montantNet,SUM(m.`montantCredit`) AS montantCredit,SUM(m.`montantRemise`) AS montantRemise, SUM(CASE WHEN m.flag_id IS NOT NULL THEN m.`montantAcc` ELSE 0 END) AS flagedAmount,"
            + " SUM(m.`montantRegle`) AS montantRegle, SUM(m.`montantPaye`) AS montantPaye,SUM(m.`montantRestant`) AS montantDiffere,SUM(sqlQ.montantTTCDetatil) AS montantTTCDetatil,SUM(sqlQ.montantTTCDetatilReal) AS montantTTCDetatilReal,SUM(sqlQ.montantAChat) AS montantAChat, "
            + " SUM(sqlQ.montantUg) AS montantUg,SUM(sqlQ.montantAchatDetatilToRemove) AS montantAchatDetatilToRemove,SUM(sqlQ.montantTTCDetatilToRemove) AS montantTTCDetatilToRemove,SUM(sqlQ.montantTva) AS montantTva,SUM(sqlQ.montantAchatUg) AS montantAchatUg,SUM(sqlQ.montantRemiseDetail) AS montantRemiseDetail, SUM(sqlQ.montantTvaUg) AS montantTvaUg,"
            + " SUM(CASE WHEN p.`int_PRICE` <0 OR p.`b_IS_CANCEL`=1 THEN 0 ELSE 1 END) AS totalVente,SUM(m.`avoidAmount`) AS avoidAmount,SUM(m.`montantAcc`) AS montantAcc "
            + " FROM  mvttransaction m,t_preenregistrement p,(SELECT d.`lg_PREENREGISTREMENT_ID` AS idVente,"
            + " SUM(d.`int_PRICE`) AS montantTTCDetatilReal,SUM(d.`int_QUANTITY`*d.`prixAchat`) AS montantAChat,SUM(d.`int_UG`*d.`int_PRICE_UNITAIR`) AS montantUg,SUM(d.`montantTva`) AS montantTva "
            + ",SUM(d.`int_UG`*d.`prixAchat`) AS montantAchatUg,SUM(d.`int_PRICE_REMISE`) AS montantRemiseDetail,SUM(d.montanttvaug) AS montantTvaUg , SUM(CASE WHEN d.`bool_ACCOUNT` THEN d.`int_PRICE` ELSE 0 END) AS montantTTCDetatil,"
            + " SUM(CASE WHEN d.`bool_ACCOUNT` IS FALSE THEN d.`int_PRICE` ELSE 0 END) AS montantTTCDetatilToRemove,SUM(CASE WHEN d.`bool_ACCOUNT` IS FALSE THEN (d.`prixAchat`*d.`int_QUANTITY`) ELSE 0 END) AS montantAchatDetatilToRemove "
            + " FROM t_preenregistrement_detail d  GROUP BY d.`lg_PREENREGISTREMENT_ID`  ) AS sqlQ  WHERE  sqlQ.idVente=p.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.lg_PREENREGISTREMENT_ID AND  DATE(p.`dt_UPDATED`) BETWEEN "
            + " ?3 AND ?4 AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?1 AND m.`lg_EMPLACEMENT_ID` =?2 AND p.imported=0 {excludeStatement} GROUP BY typeVente,typeReglement ,typeMvtCaisse";

    private static final String OTHER_MVT_SQL_QUERY = "SELECT m.`typeMvtCaisseId` AS typeMvtCaisse, SUM(m.montant) AS montantTTC FROM  mvttransaction m WHERE DATE(m.mvtdate) BETWEEN ?1 AND ?2 AND m.`typeTransaction` >2  AND m.`lg_EMPLACEMENT_ID` =?3  GROUP BY m.`typeMvtCaisseId` ";

    private static final String BONS_SQL_QUERY = "SELECT  SUM(m.montant) AS montant FROM  mvttransaction m WHERE DATE(m.mvtdate) BETWEEN ?1 AND ?2 AND m.`typeTransaction` =2  AND m.`lg_EMPLACEMENT_ID` =?3 ";
    private static final String EXCLUDE_STATEMENT = " AND  p.`lg_PREENREGISTREMENT_ID`  NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) ";

    private static final String TVAS_SQL = "SELECT {byDay} SUM(d.int_PRICE) AS montantTTC,SUM(d.int_UG*d.int_PRICE_UNITAIR) AS montantUg,d.valeurTva AS valeurTva FROM t_preenregistrement_detail d,t_preenregistrement p,t_user u ,mvttransaction m WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID AND p.`lg_PREENREGISTREMENT_ID`=m.pkey  AND  d.`bool_ACCOUNT` "
            + " AND p.lg_TYPE_VENTE_ID <> ?1 AND p.str_STATUT='is_Closed'  AND p.imported=0 AND DATE(p.dt_UPDATED)  BETWEEN ?2 AND ?3 AND p.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=?4 {excludeStatement} {tvaVnoOnly} GROUP BY d.`valeurTva` {groupByDay}";

    private static final String AMOUNT_TO_REMOVE = "SELECT COALESCE(SUM(m.`montantAcc`),0) AS montantAcc, COALESCE(SUM(m.`montant`),0) AS montant FROM mvttransaction m,t_preenregistrement p WHERE m.flag IS TRUE AND m.flag_id IS NULL AND m.`typeTransaction` =0  AND p.imported=0 AND p.`lg_PREENREGISTREMENT_ID`=m.pkey AND DATE(p.`dt_UPDATED`) BETWEEN  ?1 AND ?2 AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 ";

    private static final String TVA_VNO_ONLY = " AND m.`typeTransaction` =0 ";
    private static final String BY_DAY = " DATE_FORMAT(p.`dt_UPDATED`,'%Y-%m-%d' ) AS mvtDate ,";
    private static final String GROUP_BY_DAY = " ,mvtDate ";
    private static final String TVA_DATE_PATERN = "dd/MM/yyyy";

    private static final String TABLEAU_BOARD_SQL = "SELECT DATE_FORMAT(p.`dt_UPDATED`,'%Y-%m-%d' ) AS mvtDate , SUM(m.montant) AS montantTTC,SUM(m.`montantNet`) AS montantNet,SUM(m.`montantCredit`) AS montantCredit,SUM(m.`montantRemise`) AS montantRemise,SUM(CASE WHEN m.flag_id IS NOT NULL THEN m.`montantAcc` ELSE 0 END) AS flagedAmount,"
            + "SUM(m.`montantRegle`) AS montantRegle, SUM(m.`montantPaye`) AS montantPaye,SUM(m.`montantRestant`) AS montantDiffere,SUM(sqlQ.montantTTCDetatil) AS montantTTCDetatil,SUM(sqlQ.montantTTCDetatilToRemove) AS montantTTCDetatilToRemove,SUM(sqlQ.montantUg) AS montantUg,SUM(sqlQ.montantRemiseDetail) AS montantRemiseDetail,  SUM(CASE  WHEN p.`int_PRICE` <0 OR p.`b_IS_CANCEL`=1 THEN 0 ELSE 1 END) AS totalVente,SUM(m.`avoidAmount`) AS avoidAmount,SUM(m.`montantAcc`) AS montantAcc  FROM  mvttransaction m,t_preenregistrement p,(SELECT d.`lg_PREENREGISTREMENT_ID` AS idVente, SUM(d.`int_PRICE`) AS montantTTCDetatilReal,SUM(d.`int_UG`*d.`int_PRICE_UNITAIR`) AS montantUg,"
            + " SUM(CASE WHEN d.`bool_ACCOUNT` THEN d.`int_PRICE` ELSE 0 END) AS montantTTCDetatil,"
            + " SUM(CASE WHEN d.`bool_ACCOUNT` IS FALSE THEN d.`int_PRICE` ELSE 0 END) AS montantTTCDetatilToRemove,"
            + " SUM(d.`int_PRICE_REMISE`) AS montantRemiseDetail FROM t_preenregistrement_detail d WHERE   d.`bool_ACCOUNT` GROUP BY d.`lg_PREENREGISTREMENT_ID`  ) AS sqlQ  WHERE  sqlQ.idVente=p.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.lg_PREENREGISTREMENT_ID AND  DATE(p.`dt_UPDATED`) BETWEEN  ?3 AND ?4 AND p.`str_STATUT`='is_Closed'  AND p.imported=0 AND p.`lg_TYPE_VENTE_ID` <> ?1 AND m.`lg_EMPLACEMENT_ID` =?2  {excludeStatement}  GROUP BY mvtDate";
    private static final String TABLEAU_BOARD_SQL_ACHATS = "SELECT m.mvtdate AS mvtDate ,SUM(m.montant) AS montant,gf.libelle FROM mvttransaction m JOIN t_grossiste g ON m.grossisteId=g.`lg_GROSSISTE_ID` LEFT JOIN groupefournisseur gf ON g.`groupeId`=gf.id WHERE DATE(m.mvtdate) BETWEEN ?1 AND ?2 AND m.`typeTransaction` =2 AND m.`lg_EMPLACEMENT_ID` =?3  GROUP BY m.`grossisteId`,mvtdate ORDER BY mvtDate";

    private static final String FLAGED_AMOUNT = "SELECT COALESCE(SUM(m.`montantAcc`),0) AS montantAcc  FROM  mvttransaction m,t_preenregistrement p where p.`lg_PREENREGISTREMENT_ID`=m.pkey AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2  AND m.flag_id IS NOT NULL AND p.imported=0 ";
    private static final String FLAGED_AMOUNT_GROUP_BY_DAY = "SELECT m.mvtdate AS mvtdate,COALESCE(SUM(m.`montantAcc`),0) AS montantAcc  FROM  mvttransaction m,t_preenregistrement p where p.`lg_PREENREGISTREMENT_ID`=m.pkey AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2  AND m.flag_id IS NOT NULL  AND p.imported=0 GROUP BY mvtdate";

    private static final String STAT_LAST_THREE_YEARS = "SELECT YEAR(p.`dt_UPDATED`) AS annee, MONTH(p.`dt_UPDATED`) AS mois,SUM(d.int_PRICE) AS montantTTC FROM t_preenregistrement_detail d,t_preenregistrement p,t_user u ,mvttransaction m WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID AND p.`lg_PREENREGISTREMENT_ID`=m.pkey  AND  d.`bool_ACCOUNT` "
            + " AND p.lg_TYPE_VENTE_ID <> ?1 AND p.str_STATUT='is_Closed'  AND p.imported=0 AND YEAR(p.dt_UPDATED)  BETWEEN ?2 AND ?3 AND p.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=?4 GROUP BY annee,mois ";

    private static final String TYPE_REGELEMENT_QUERY = "SELECT SUM(vr.flaged_amount) AS flaged_amount, p.`lg_TYPE_VENTE_ID` AS typeVente, r.`str_NAME` AS libelle, vr.type_regelement AS typeReglement,SUM(vr.montant) AS montant,SUM(vr.montant_attentu) AS montant_attendu,SUM(vr.ug_amount) AS ug_amount,SUM(vr.ug_amount_net) AS ug_amount_net,SUM(vr.amount_non_ca) AS amount_non_ca FROM  vente_reglement vr JOIN t_preenregistrement p ON p.`lg_PREENREGISTREMENT_ID`=vr.vente_id JOIN mvttransaction m ON m.pkey=p.`lg_PREENREGISTREMENT_ID` JOIN t_type_reglement r ON r.`lg_TYPE_REGLEMENT_ID`=vr.type_regelement WHERE DATE(p.`dt_UPDATED`) BETWEEN   ?3 AND ?4 AND p.`str_STATUT`='is_Closed'  AND p.`lg_TYPE_VENTE_ID` <>  ?1  AND m.`lg_EMPLACEMENT_ID` =?2 AND p.imported=0 {excludeStatement}  GROUP BY typeReglement,typeVente ";

    private final Comparator<TableauBaordPhDTO> comparator = Comparator.comparing(TableauBaordPhDTO::getMvtDate);

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Inject
    private MagasinService magasinService; // Injection du service

    @Override
    public List<BalanceDTO> buildBalanceFromPreenregistrement(BalanceParamsDTO balanceParams) {

        List<BalanceDTO> balances = new ArrayList<>();
        List<BalanceVenteItemDTO> dataVentes;
        if (!balanceParams.isToPrint()) {
            dataVentes = fetchPreenregistrements(balanceParams, "", "", "", "").stream().map(this::buildFromTuple)
                    .collect(Collectors.toList());
        } else {
            dataVentes = fetchPreenregistrements(balanceParams, "", "", "m.`typeMvtCaisseId` AS typeMvtCaisse,",
                    ",typeMvtCaisse").stream().map(this::buildPdfDataFromTuple).collect(Collectors.toList());
        }

        Map<TypeTransaction, List<BalanceVenteItemDTO>> groupByTypeVente = dataVentes.stream()
                .collect(Collectors.groupingBy(BalanceVenteItemDTO::getTypeTransaction));
        Map<String, List<VenteReglementReportDTO>> venteRegelementMap = fetchByModeReglements(balanceParams).stream()
                .map(this::buildVenteReglementReportDTO)
                .collect(Collectors.groupingBy(VenteReglementReportDTO::getTypeVente));
        if (groupByTypeVente.containsKey(TypeTransaction.VENTE_COMPTANT)) {
            boolean checkUg = checkUg() && !balanceParams.isShowAllAmount();
            List<BalanceVenteItemDTO> vnoData = groupByTypeVente.remove(TypeTransaction.VENTE_COMPTANT);
            BalanceDTO balanceVno = buildVenteBalance(vnoData, checkUg, balanceParams.isShowAllAmount(),
                    venteRegelementMap.remove(Constant.VENTE_COMPTANT_ID));

            balanceVno.setTypeVente(Constant.VENTE_COMPTANT);
            balanceVno.setBalanceId(balanceVno.getTypeVente());
            balanceVno.setMontantTTC((balanceVno.getMontantTTC() - this.montantToRemove(balanceParams)));
            balances.add(balanceVno);
        }
        if (groupByTypeVente.containsKey(TypeTransaction.VENTE_CREDIT)) {
            List<BalanceVenteItemDTO> vnoData = groupByTypeVente.remove(TypeTransaction.VENTE_CREDIT);

            BalanceDTO balanceVo = buildVenteBalance(vnoData, false, balanceParams.isShowAllAmount(),
                    venteRegelementMap.values().stream().flatMap(v -> v.stream()).collect(Collectors.toList()));

            balanceVo.setTypeVente(Constant.VENTE_ASSURANCE);
            balanceVo.setBalanceId(balanceVo.getTypeVente());
            balances.add(balanceVo);
        }
        return updatePourcent(balances);
    }

    @Override
    public GenericDTO getBalanceVenteCaisseData(BalanceParamsDTO balanceParams) {
        List<BalanceDTO> balances = buildBalanceFromPreenregistrement(balanceParams);
        long montantAchat = bonLivraisonsAmount(balanceParams);
        List<BalanceVenteItemDTO> othersTypeMvts = othersTypeMvts(balanceParams);
        return buildBalance(balances, othersTypeMvts, montantAchat);
    }

    @Override
    public JSONObject getBalanceVenteCaisseDataView(BalanceParamsDTO balanceParams) {
        GenericDTO generic = this.getBalanceVenteCaisseData(balanceParams);
        SummaryDTO summary = generic.getSummary();
        List<BalanceDTO> balances = generic.getBalances();
        return FunctionUtils.returnData(balances, balances.size(), summary);
    }

    @Override
    public Map<TableauBaordSummary, List<TableauBaordPhDTO>> getTableauBoardData(BalanceParamsDTO balanceParams) {

        List<TableauBaordPhDTO> bons = buildBonAchats(fetchBonLivraisons(balanceParams));
        List<TableauBaordPhDTO> ventes = buildVente(fetchPreenregistrements(balanceParams), balanceParams);
        bons.addAll(ventes);

        if (!balanceParams.isByMonth()) {
            Map<LocalDate, List<TableauBaordPhDTO>> dailyData = bons.stream()
                    .collect(Collectors.groupingBy(TableauBaordPhDTO::getMvtDate));
            return buildTableauBoard(dailyData);
        } else {

            Map<YearMonth, List<TableauBaordPhDTO>> monthyData = bons.stream()
                    .collect(Collectors.groupingBy(TableauBaordPhDTO::getYearMonth));
            return buildTableauBoard(monthyData);
        }

    }

    @Override
    public JSONObject tableauBoardDatas(BalanceParamsDTO balanceParams) throws JSONException {

        JSONObject json = new JSONObject();
        Map<TableauBaordSummary, List<TableauBaordPhDTO>> map = getTableauBoardData(balanceParams);

        if (map.isEmpty()) {
            json.put("total", 0);
            json.put("data", new JSONArray());

        }
        map.forEach((k, v) -> {
            json.put("total", v.size());
            json.put("data", new JSONArray(v));
            json.put("metaData", new JSONObject(k));

        });
        return json;

    }

    @Override
    public List<TvaDTO> statistiqueTva(BalanceParamsDTO balanceParams) {
        if (balanceParams.isByDay()) {
            return this.statistiqueTvaGroupingByDay(balanceParams);
        }
        return this.statistiqueTvaPeriodique(balanceParams);
    }

    private long getFlagedAmount(boolean showAllAmount, BigDecimal flagedAmount) {

        if (showAllAmount) {
            return 0;
        }
        return flagedAmount.longValue();
    }

    private String replacePlaceHolder(String sql, BalanceParamsDTO balanceParams) {
        if (balanceParams.isShowAllAmount()) {
            sql = sql.replace("{excludeStatement}", "");

        } else {
            sql = sql.replace("{excludeStatement}", EXCLUDE_STATEMENT);
        }

        return sql;
    }

    private List<Tuple> fetchPreenregistrements(BalanceParamsDTO balanceParams, String subQueryMvtDate,
            String subQueryGroupBy, String typeMvtCaisse, String typeMvtCaisseGroupBy) {

        String sql = String.format(BALANCE_SQL_QUERY, subQueryMvtDate, typeMvtCaisse, subQueryGroupBy,
                typeMvtCaisseGroupBy);

        sql = replacePlaceHolder(sql, balanceParams);
        LOG.log(Level.INFO, "sql--- balance vente {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private List<Tuple> fetchRecapPreenregistrements(BalanceParamsDTO balanceParams) {

        String sql = replacePlaceHolder(RAPPORT_SQL_QUERY, balanceParams);
        LOG.log(Level.INFO, "sql--- RAPPORT_SQL_QUERY vente {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private List<TvaDTO> findTvaDatas(BalanceParamsDTO balanceParams) {
        if (balanceParams.isByDay()) {
            return findTvas(balanceParams).stream().map(this::buildPdfByDayTva).collect(Collectors.toList());
        }
        return findTvas(balanceParams).stream().map(this::buildTva).collect(Collectors.toList());
    }

    private List<Tuple> findTvas(BalanceParamsDTO balanceParams) {

        String sql = replacePlaceHolder(TVAS_SQL, balanceParams);
        try {

            if (balanceParams.isVnoOnly()) {
                sql = sql.replace("{tvaVnoOnly}", TVA_VNO_ONLY);
            } else {
                sql = sql.replace("{tvaVnoOnly}", "");
            }
            if (balanceParams.isByDay()) {
                sql = sql.replace("{byDay}", BY_DAY).replace("{groupByDay}", GROUP_BY_DAY);
            } else {
                sql = sql.replace("{byDay}", "").replace("{groupByDay}", "");
            }
            LOG.log(Level.INFO, "sql--- TVAS {0}", sql);
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtEnd()))
                    .setParameter(4, balanceParams.getEmplacementId());
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }

    }

    private TvaDTO buildTva(Tuple tuple) {
        TvaDTO o = new TvaDTO();
        o.setMontantTtc(tuple.get("montantTTC", BigDecimal.class).longValue());
        o.setMontantUg(tuple.get("montantUg", BigDecimal.class).longValue());
        o.setTaux(tuple.get("valeurTva", Integer.class));
        return o;
    }

    private TvaDTO buildPdfByDayTva(Tuple tuple) {
        TvaDTO o = new TvaDTO();
        LocalDate mvDate = LocalDate.parse(tuple.get("mvtDate", String.class));
        o.setMontantTtc(tuple.get("montantTTC", BigDecimal.class).longValue());
        o.setMontantUg(tuple.get("montantUg", BigDecimal.class).longValue());
        o.setTaux(tuple.get("valeurTva", Integer.class));
        o.setLocalOperation(mvDate);
        o.setDateOperation(mvDate.format(DateTimeFormatter.ofPattern(TVA_DATE_PATERN)));
        return o;
    }

    private List<BalanceVenteItemDTO> othersTypeMvts(BalanceParamsDTO balanceParams) {

        LOG.log(Level.INFO, "sql--- balance othersTypeMvts {0}", OTHER_MVT_SQL_QUERY);
        try {
            Query query = em.createNativeQuery(OTHER_MVT_SQL_QUERY, Tuple.class)
                    .setParameter(1, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtEnd()))
                    .setParameter(3, balanceParams.getEmplacementId());
            List<Tuple> list = query.getResultList();
            return list.stream().map(this::buildFromTupleOtherMvt).collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private long bonLivraisonsAmount(BalanceParamsDTO balanceParams) {

        LOG.log(Level.INFO, "sql--- bonLivraison {0}", BONS_SQL_QUERY);
        try {
            Query query = em.createNativeQuery(BONS_SQL_QUERY, Tuple.class)
                    .setParameter(1, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtEnd()))
                    .setParameter(3, balanceParams.getEmplacementId());
            Tuple tuple = (Tuple) query.getSingleResult();
            return Objects.nonNull(tuple) ? tuple.get("montant", BigDecimal.class).longValue() : 0;

        } catch (Exception e) {

            return 0;
        }
    }

    private BalanceVenteItemDTO buildFromTuple(Tuple tuple) {
        TypeTransaction typeVente = tuple.get("typeVente", Integer.class) == 0 ? TypeTransaction.VENTE_COMPTANT
                : TypeTransaction.VENTE_CREDIT;
        BigDecimal montantHorsCa0 = tuple.get("montantTTCDetatilToRemove", BigDecimal.class);
        BigDecimal montantAchatDetatilToRemove = tuple.get("montantAchatDetatilToRemove", BigDecimal.class);
        long montantAchatDetatilToRemove2 = Objects.nonNull(montantAchatDetatilToRemove)
                ? montantAchatDetatilToRemove.longValue() : 0;
        BigDecimal montantPaye = tuple.get("montantPaye", BigDecimal.class);
        BigDecimal montantRegle = tuple.get("montantRegle", BigDecimal.class);
        long montantHorsCa = Objects.nonNull(montantHorsCa0) ? montantHorsCa0.longValue() : 0;

        return BalanceVenteItemDTO.builder().typeTransaction(typeVente)
                .typeReglement(tuple.get("typeReglement", String.class))
                .montantAcc(tuple.get("montantAcc", BigDecimal.class))
                .montantAchat(tuple.get("montantAchat", BigDecimal.class))
                .montantTva(tuple.get("montantTva", BigDecimal.class))
                .montantUg(tuple.get("montantUg", BigDecimal.class))
                .montantAchatUg(tuple.get("montantAchatUg", BigDecimal.class))
                .montantTTC(tuple.get("montantTTC", BigDecimal.class))
                .montantNet(tuple.get("montantNet", BigDecimal.class))
                .montantCredit(tuple.get("montantCredit", BigDecimal.class))
                .montantRemise(tuple.get("montantRemise", BigDecimal.class))
                .montantRegle(Objects.nonNull(montantRegle) ? montantRegle.subtract(BigDecimal.valueOf(montantHorsCa))
                        : BigDecimal.ONE)
                .montantPaye(Objects.nonNull(montantPaye) ? montantPaye.subtract(BigDecimal.valueOf(montantHorsCa))
                        : BigDecimal.ONE)
                .montantDiffere(tuple.get("montantDiffere", BigDecimal.class))
                .montantTTCDetatil(tuple.get("montantTTCDetatil", BigDecimal.class))
                .totalVente(tuple.get("totalVente", BigDecimal.class).intValue())
                .montantRemiseDetail(tuple.get("montantRemiseDetail", BigDecimal.class))
                .montantTvaUg(tuple.get("montantTvaUg", BigDecimal.class))
                .montantTTCDetatilToRemove(tuple.get("montantTTCDetatilToRemove", BigDecimal.class))
                .flagedAmount(tuple.get("flagedAmount", BigDecimal.class))
                .montantTTCDetatilReal(tuple.get("montantTTCDetatilReal", BigDecimal.class))
                .montantAchatDetatilToRemove(montantAchatDetatilToRemove2).build();
    }

    private BalanceVenteItemDTO buildPdfDataFromTuple(Tuple tuple) {
        BalanceVenteItemDTO balanceVenteItem = buildFromTuple(tuple);
        balanceVenteItem.setTypeMvtCaisse(tuple.get("typeMvtCaisse", String.class));
        return balanceVenteItem;
    }

    private BalanceVenteItemDTO buildFromTupleOtherMvt(Tuple tuple) {
        return BalanceVenteItemDTO.builder().typeMvtCaisse(tuple.get("typeMvtCaisse", String.class))
                .montantTTC(tuple.get("montantTTC", BigDecimal.class)).build();
    }

    private int computePercent(long amount, long totalAmount) {
        return (int) Math.round((Double.valueOf(amount) * 100) / Math.abs(totalAmount));
    }

    private List<BalanceDTO> updatePourcent(List<BalanceDTO> balances) {
        List<BalanceDTO> list = new ArrayList<>();
        long totalMontantNet = 0;
        BalanceDTO balanceVNO = null;
        BalanceDTO balanceVO = null;
        for (BalanceDTO balance : balances) {
            totalMontantNet += balance.getMontantNet();
            if (balance.getTypeVente().equals(Constant.VENTE_COMPTANT)) {
                balanceVNO = balance;
            } else if (balance.getTypeVente().equals(Constant.VENTE_ASSURANCE)) {
                balanceVO = balance;
            }
        }
        if (balanceVNO != null) {
            balanceVNO.setPourcentage(computePercent(balanceVNO.getMontantNet(), totalMontantNet));
            list.add(balanceVNO);
        }
        if (balanceVO != null) {
            balanceVO.setPourcentage(computePercent(balanceVO.getMontantNet(), totalMontantNet));
            list.add(balanceVO);
        }
        return list;
    }

    private GenericDTO buildBalance(List<BalanceDTO> balances, List<BalanceVenteItemDTO> othersTypeMvts,
            long montantAchat) {
        long montantTTC = 0;
        long montantNet = 0;
        long montantRemise = 0;
        long panierMoyen = 0;
        long montantEsp = 0;
        long montantCheque = 0;
        long montantVirement = 0;
        long montantCB = 0;
        long montantTp = 0;
        long montantDiff = 0;
        int nbreVente = 0;
        long fondCaisse = 0;
        long montantRegDiff = 0;
        long montantMobilePayment = 0;
        long montantRegleTp = 0;
        long montantEntre = 0;
        long montantSortie = 0;
        long marge = 0;
        long montantTva = 0;
        double ratioVA = 0.0;
        double rationAV = 0.0;
        for (BalanceDTO balance : balances) {
            montantTTC += balance.getMontantTTC();
            montantNet += balance.getMontantNet();
            montantRemise += balance.getMontantRemise();
            montantEsp += balance.getMontantEsp();
            montantCheque += balance.getMontantCheque();
            montantVirement += balance.getMontantVirement();
            montantCB += balance.getMontantCB();
            montantTp += balance.getMontantTp();
            montantDiff += balance.getMontantDiff();
            nbreVente += balance.getNbreVente();
            montantMobilePayment += balance.getMontantMobilePayment();
            marge += balance.getMarge();
            montantTva += balance.getMontantTva();

        }
        long montantHT = montantTTC - montantTva;
        for (BalanceVenteItemDTO o : othersTypeMvts) {
            long amount = o.getMontantTTC().longValue();
            switch (o.getTypeMvtCaisse()) {
            case DateConverter.MVT_FOND_CAISSE:
                fondCaisse += amount;
                break;
            case DateConverter.MVT_SORTIE_CAISSE:
                montantSortie += amount;
                break;
            case DateConverter.MVT_ENTREE_CAISSE:
                montantEntre += amount;
                break;
            case DateConverter.MVT_REGLE_DIFF:
                montantRegDiff += amount;
                break;
            case DateConverter.MVT_REGLE_TP:
                montantRegleTp += amount;
                break;
            default:
                break;
            }
        }
        if (montantAchat > 0) {

            ratioVA = BigDecimal.valueOf(Double.valueOf(montantTTC) / montantAchat).setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();

        }
        if (montantTTC > 0) {
            rationAV = BigDecimal.valueOf(Double.valueOf(montantAchat) / montantTTC).setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();
        }
        if (nbreVente > 0) {
            panierMoyen = montantTTC / nbreVente;

        }
        SummaryDTO summary = new SummaryDTO();
        summary.setFondCaisse(fondCaisse);
        summary.setMarge(marge);
        summary.setMontantAchat(montantAchat);
        summary.setMontantCB(montantCB);
        summary.setMontantCheque(montantCheque);
        summary.setMontantDiff(montantDiff);
        summary.setMontantRegDiff(montantRegDiff);
        summary.setMontantEntre(montantEntre);
        summary.setMontantEsp(montantEsp);
        summary.setMontantNet(montantNet);
        summary.setMontantSortie(montantSortie);
        summary.setMontantVirement(montantVirement);
        summary.setMontantHT(montantHT);
        summary.setMontantRegleTp(montantRegleTp);
        summary.setMontantRemise(montantRemise);
        summary.setMontantTva(montantTva);
        summary.setNbreVente(nbreVente);
        summary.setMontantTTC(montantTTC);
        summary.setMontantMobilePayment(montantMobilePayment);
        summary.setPanierMoyen(panierMoyen);
        summary.setRatioVA(ratioVA);
        summary.setRationAV(rationAV);
        summary.setMontantTp(montantTp);
        GenericDTO generic = new GenericDTO();
        generic.setSummary(summary);
        generic.setBalances(balances);
        return generic;

    }

    private Pair<Long, Long> computeFlagedAmount(long montantTTC, long flagedAmount) {
        if (montantTTC >= flagedAmount) {
            montantTTC -= flagedAmount;
            flagedAmount = 0;

        } else {
            montantTTC = 0;
            flagedAmount = flagedAmount - montantTTC;
        }
        return Pair.of(montantTTC, flagedAmount);
    }

    @Override
    public List<TvaDTO> statistiqueTvaPeriodique(BalanceParamsDTO balanceParams) {
        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> datas = findTvaDatas(balanceParams);
        boolean checkUg = checkUg();
        long flagedAmount = flagedAmount(balanceParams);

        for (TvaDTO data : datas) {
            TvaDTO o = new TvaDTO();
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long montantTTC = data.getMontantTtc();
            if (data.getTaux() == 0) {
                montantTTC -= montantToRemove(balanceParams);
                if (checkUg) {
                    montantTTC -= data.getMontantUg();
                }
            }
            Pair<Long, Long> compute = computeFlagedAmount(montantTTC, flagedAmount);
            montantTTC = compute.getLeft();
            flagedAmount = compute.getRight();

            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            tvas.add(o);
        }

        return tvas;
    }

    @Override
    public JSONObject statistiqueTvaView(BalanceParamsDTO balanceParams) {
        List<TvaDTO> datas = statistiqueTva(balanceParams);
        return FunctionUtils.returnData(datas);

    }

    @Override
    public List<TvaDTO> statistiqueTvaGroupingByDay(BalanceParamsDTO balanceParams) {
        List<TvaDTO> tvas = new ArrayList<>();
        balanceParams.setByDay(true);
        List<TvaDTO> datas = findTvaDatas(balanceParams);
        Set<FlagedAmount> amounts = buildFlagedAmount(flagedAmountByDay(balanceParams));
        LocalDate lastFoundDay = null;
        long flagedAmount = 0;
        boolean checkUg = checkUg();
        for (TvaDTO data : datas) {
            String mvtDate = data.getLocalOperation().toString();
            balanceParams.setDtStart(mvtDate);
            balanceParams.setDtEnd(mvtDate);
            TvaDTO o = new TvaDTO();
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long montantTTC = data.getMontantTtc();

            if (data.getTaux() == 0) {
                montantTTC -= montantToRemove(balanceParams);
                if (checkUg) {
                    montantTTC -= data.getMontantUg();
                }
            }
            if (!amounts.isEmpty()) {
                if (Objects.isNull(lastFoundDay) || (!data.getLocalOperation().isEqual(lastFoundDay))) {
                    Optional<FlagedAmount> fl = amounts.stream()
                            .filter(e -> e.getMvtDate().isEqual(data.getLocalOperation())).findFirst();
                    if (fl.isPresent()) {
                        FlagedAmount fa = fl.get();
                        lastFoundDay = fa.getMvtDate();
                        flagedAmount = fa.getAmount();
                    }
                }
                Pair<Long, Long> compute = computeFlagedAmount(montantTTC, flagedAmount);
                montantTTC = compute.getLeft();
                flagedAmount = compute.getRight();
            }

            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            o.setLocalOperation(data.getLocalOperation());
            o.setDateOperation(data.getDateOperation());
            tvas.add(o);
        }
        tvas.sort(Comparator.comparing(TvaDTO::getLocalOperation));
        return tvas;
    }

    @Override
    public long montantToRemove(BalanceParamsDTO balanceParams) {
        if (isNormalUse() || balanceParams.isShowAllAmount()) {
            return 0;
        }

        try {
            Query query = em.createNativeQuery(AMOUNT_TO_REMOVE, Tuple.class)
                    .setParameter(4, balanceParams.getEmplacementId()).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(1, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            Tuple tuple = (Tuple) query.getSingleResult();
            return tuple.get("montant", BigDecimal.class).longValue()
                    - tuple.get("montantAcc", BigDecimal.class).longValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private boolean findParam(String key) {
        try {
            TParameters tp = em.find(TParameters.class, key);
            if (tp != null) {
                return Integer.parseInt(tp.getStrVALUE().trim()) == 1;
            }
            return false;
        } catch (NumberFormatException e) {

            return false;
        }
    }

    @Override
    public boolean useLastUpdateStats() {
        return true;

    }

    private boolean checkUg() {

        return this.findParam(Constant.KEY_CHECK_UG);

    }

    private boolean isNormalUse() {
        return !this.findParam(Constant.KEY_TAKE_INTO_ACCOUNT);

    }

    private List<Tuple> avoirFournisseur(LocalDate dtStart, LocalDate dtEnd) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT SUM(o.dl_AMOUNT) as montant,gr.libelle FROM  t_retour_fournisseur o JOIN t_grossiste g ON o.`lg_GROSSISTE_ID`=g.`lg_GROSSISTE_ID` left JOIN groupefournisseur gr ON g.`groupeId`=gr.id WHERE DATE(o.dt_UPDATED)  BETWEEN ?1 AND ?2  AND o.str_REPONSE_FRS <>'' AND o.str_STATUT='enable' GROUP BY g.`groupeId` HAVING montant >0 ",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd));
            return (List<Tuple>) q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }

    }

    private List<Tuple> fetchPreenregistrements(BalanceParamsDTO balanceParams) {
        String sqlQ = replacePlaceHolder(TABLEAU_BOARD_SQL, balanceParams);
        LOG.log(Level.INFO, "sql--- tableau vente {0}", sqlQ);
        try {
            Query query = em.createNativeQuery(sqlQ, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private List<Tuple> fetchBonLivraisons(BalanceParamsDTO balanceParams) {
        LOG.log(Level.INFO, "sql--- tableau vente {0}", TABLEAU_BOARD_SQL_ACHATS);
        try {
            Query query = em.createNativeQuery(TABLEAU_BOARD_SQL_ACHATS, Tuple.class)
                    .setParameter(3, balanceParams.getEmplacementId())
                    .setParameter(1, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private Map<String, Long> buildAvoir(List<Tuple> tuple) {
        Map<String, Long> avoisMap = new HashMap<>();

        if (CollectionUtils.isNotEmpty(tuple)) {

            for (Tuple t : tuple) {
                long montant = t.get("montant", Double.class).longValue();
                String libelle = t.get("libelle", String.class);
                avoisMap.put(StringUtils.isNotEmpty(libelle) ? libelle : Constant.AUTRES, montant);
            }
        }
        return avoisMap;
    }

    private List<TableauBaordPhDTO> buildBonAchats(List<Tuple> tuple) {
        List<TableauBaordPhDTO> list = new ArrayList<>();

        if (CollectionUtils.isNotEmpty(tuple)) {
            for (Tuple t : tuple) {
                TableauBaordPhDTO o = new TableauBaordPhDTO();
                java.sql.Date mvtDate = t.get("mvtDate", java.sql.Date.class);
                o.setVente(false);
                o.setMvtDate(mvtDate.toLocalDate());
                int montant = t.get("montant", BigDecimal.class).intValue();

                String libelleGroupeGrossiste = Objects.nonNull(t.get("libelle", String.class))
                        ? t.get("libelle", String.class) : Constant.AUTRES;
                Map<String, Long> avoisMap = buildAvoir(avoirFournisseur(o.getMvtDate(), o.getMvtDate()));
                Long avoir = avoisMap.get(libelleGroupeGrossiste);
                int avoir2 = Objects.isNull(avoir) ? 0 : avoir.intValue();
                o.setMontantAvoir(avoir2);
                o.setMontantAchat(montant - avoir2);
                switch (libelleGroupeGrossiste) {

                case Constant.LABOREXCI:

                    o.setMontantAchatOne(montant);

                    break;
                case Constant.DPCI:
                    o.setMontantAchatTwo(montant);

                    break;
                case Constant.COPHARMED:
                    o.setMontantAchatThree(montant);

                    break;
                case Constant.TEDIS:
                    o.setMontantAchatFour(montant);

                    break;
                case Constant.AUTRES:
                    o.setMontantAchatFive(montant);
                    break;
                default:
                    break;
                }
                list.add(o);
            }

            return list;
        }
        return list;
    }

    private TableauBaordSummary buildBaordSummary(List<TableauBaordPhDTO> datas) {
        TableauBaordSummary summary = new TableauBaordSummary();
        for (TableauBaordPhDTO o : datas) {
            summary.setMontantTTC(o.getMontantTTC() + summary.getMontantTTC());
            summary.setMontantNet(o.getMontantNet() + summary.getMontantNet());
            summary.setMontantRemise(o.getMontantRemise() + summary.getMontantRemise());
            summary.setMontantEsp(o.getMontantEsp() + summary.getMontantEsp());
            summary.setMontantCredit(o.getMontantCredit() + summary.getMontantCredit());
            summary.setNbreVente(o.getNbreVente() + summary.getNbreVente());
            summary.setMontantAchatOne(summary.getMontantAchatOne() + o.getMontantAchatOne());
            summary.setMontantAchatTwo(summary.getMontantAchatTwo() + o.getMontantAchatTwo());
            summary.setMontantAchatThree(summary.getMontantAchatThree() + o.getMontantAchatThree());
            summary.setMontantAchatFour(summary.getMontantAchatFour() + o.getMontantAchatFour());
            summary.setMontantAchatFive(summary.getMontantAchatFive() + o.getMontantAchatFive());
            summary.setMontantAchat(summary.getMontantAchat() + o.getMontantAchat());
            summary.setMontantAvoir(summary.getMontantAvoir() + o.getMontantAvoir());
            summary.setTotalModeReglement(summary.getTotalModeReglement() + o.getTotalModeReglement());
            Long montantNet2 = summary.getMontantNet();
            Long montantAchat2 = summary.getMontantAchat();
            if (montantAchat2.compareTo(0l) > 0) {
                summary.setRatioVA(BigDecimal.valueOf(Double.valueOf(montantNet2) / montantAchat2)
                        .setScale(2, RoundingMode.FLOOR).doubleValue());
            }
            if (montantNet2.compareTo(0l) > 0) {
                summary.setRationAV(BigDecimal.valueOf(Double.valueOf(montantAchat2) / montantNet2)
                        .setScale(2, RoundingMode.FLOOR).doubleValue());
            }
        }
        return summary;
    }

    private Map<TableauBaordSummary, List<TableauBaordPhDTO>> buildTableauBoard(
            Map<? extends TemporalAccessor, List<TableauBaordPhDTO>> data) {
        Map<TableauBaordSummary, List<TableauBaordPhDTO>> map = new HashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMM");
        DateTimeFormatter formatter2 = DateTimeFormatter.ofPattern("MM/yyyy");
        List<TableauBaordPhDTO> tableauBaords = new ArrayList<>();

        for (Map.Entry<? extends TemporalAccessor, List<TableauBaordPhDTO>> entry : data.entrySet()) {
            TableauBaordPhDTO baordPh = new TableauBaordPhDTO();

            if (entry.getKey() instanceof LocalDate) {
                LocalDate perode = (LocalDate) entry.getKey();
                baordPh.setMvtDate(perode);

            } else {
                YearMonth perode = (YearMonth) entry.getKey();
                baordPh.setMvtDate(perode.atEndOfMonth());
                baordPh.setMvtDateInt(Integer.valueOf(perode.format(formatter)));
                baordPh.setDateOperation(baordPh.getMvtDate().format(formatter2));

            }
            List<TableauBaordPhDTO> value = entry.getValue();
            for (TableauBaordPhDTO o : value) {
                baordPh.setMontantTTC(o.getMontantTTC() + baordPh.getMontantTTC());
                baordPh.setMontantNet(o.getMontantNet() + baordPh.getMontantNet());
                baordPh.setMontantRemise(o.getMontantRemise() + baordPh.getMontantRemise());
                baordPh.setMontantEsp(o.getMontantEsp() + baordPh.getMontantEsp());
                baordPh.setMontantCredit(o.getMontantCredit() + baordPh.getMontantCredit());
                baordPh.setNbreVente(o.getNbreVente() + baordPh.getNbreVente());
                baordPh.setMontantAchatOne(baordPh.getMontantAchatOne() + o.getMontantAchatOne());
                baordPh.setMontantAchatTwo(baordPh.getMontantAchatTwo() + o.getMontantAchatTwo());
                baordPh.setMontantAchatThree(baordPh.getMontantAchatThree() + o.getMontantAchatThree());
                baordPh.setMontantAchatFour(baordPh.getMontantAchatFour() + o.getMontantAchatFour());
                baordPh.setMontantAchatFive(baordPh.getMontantAchatFive() + o.getMontantAchatFive());
                baordPh.setMontantAchat(baordPh.getMontantAchat() + o.getMontantAchat());
                baordPh.setMontantAvoir(baordPh.getMontantAvoir() + o.getMontantAvoir());
                baordPh.setTotalModeReglement(o.getTotalModeReglement() + baordPh.getTotalModeReglement());
            }
            Integer montantNet2 = baordPh.getMontantNet();
            Integer montantAchat2 = baordPh.getMontantAchat();
            if (montantAchat2.compareTo(0) > 0) {
                baordPh.setRatioVA(BigDecimal.valueOf(Double.valueOf(montantNet2) / montantAchat2)
                        .setScale(2, RoundingMode.FLOOR).doubleValue());
            }
            if (montantNet2.compareTo(0) > 0) {
                baordPh.setRationAV(BigDecimal.valueOf(Double.valueOf(montantAchat2) / montantNet2)
                        .setScale(2, RoundingMode.FLOOR).doubleValue());
            }

            tableauBaords.add(baordPh);
        }
        tableauBaords.sort(comparator);
        map.put(buildBaordSummary(tableauBaords), tableauBaords);
        return map;
    }

    private List<TableauBaordPhDTO> buildVente(List<Tuple> tuple, BalanceParamsDTO balanceParams) {
        List<TableauBaordPhDTO> list = new ArrayList<>();
        boolean checkUg = checkUg();
        if (CollectionUtils.isNotEmpty(tuple)) {
            for (Tuple t : tuple) {
                TableauBaordPhDTO o = new TableauBaordPhDTO();

                int flagedAmountModeReglement = 0;
                int montantAttentu = 0;
                o.setVente(true);
                o.setMvtDate(LocalDate.parse(t.get("mvtDate", String.class)));
                int montantTTC = t.get("montantTTCDetatil", BigDecimal.class).intValue();
                int montantNet = t.get("montantNet", BigDecimal.class).intValue();
                int montantRemise = t.get("montantRemise", BigDecimal.class).intValue();
                int montantCredit = t.get("montantCredit", BigDecimal.class).intValue();
                int montantDiffere = t.get("montantDiffere", BigDecimal.class).intValue();

                int totalVente = t.get("totalVente", BigDecimal.class).intValue();
                int montantUg = checkUg ? t.get("montantUg", BigDecimal.class).intValue() : 0;
                o.setMontantRemise(montantRemise);
                o.setMontantCredit(montantCredit + montantDiffere);
                o.setNbreVente(totalVente);
                balanceParams.setDtStart(o.getMvtDate().toString());
                balanceParams.setDtEnd(balanceParams.getDtStart());
                List<VenteReglementReportDTO> reglementReports = fetchByModeReglements(balanceParams).stream()
                        .map(this::buildVenteReglementReportDTO).collect(Collectors.toList());

                for (VenteReglementReportDTO reglementReport : reglementReports) {
                    // montantRegle += reglementReport.getMontant();
                    flagedAmountModeReglement += (reglementReport.getFlagedAmount() + reglementReport.getAmountNonCa());
                    montantAttentu += reglementReport.getMontantAttentu();

                }
                o.setTotalModeReglement((montantAttentu - montantUg) - flagedAmountModeReglement);
                o.setMontantEsp(o.getTotalModeReglement());
                o.setMontantTTC((montantTTC - montantUg) - flagedAmountModeReglement);
                o.setMontantNet((montantNet - montantUg) - flagedAmountModeReglement);
                list.add(o);
            }

            return list;
        }
        return list;
    }

    private long flagedAmount(BalanceParamsDTO balanceParams) {

        try {
            Query query = em.createNativeQuery(FLAGED_AMOUNT, Tuple.class)
                    .setParameter(1, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            Tuple tuple = (Tuple) query.getSingleResult();
            return tuple.get("montantAcc", BigDecimal.class).longValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public JSONObject etatLastThreeYears() {
        EtatAnnuelWrapperDTO annuelWrapper = new EtatAnnuelWrapperDTO();
        LocalDate now = LocalDate.now();
        Map<Integer, List<EtatAnnuelDTO>> map = buildLastThreeYears().stream()
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

    private final class FlagedAmount {

        private final LocalDate mvtDate;
        private final int amount;

        @Override
        public int hashCode() {
            int hash = 3;
            hash = 37 * hash + Objects.hashCode(this.mvtDate);
            return hash;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (obj == null) {
                return false;
            }
            if (getClass() != obj.getClass()) {
                return false;
            }
            final FlagedAmount other = (FlagedAmount) obj;
            return Objects.equals(this.mvtDate, other.mvtDate);
        }

        public FlagedAmount(LocalDate mvtDate, int amount) {
            this.mvtDate = mvtDate;
            this.amount = amount;
        }

        public LocalDate getMvtDate() {
            return mvtDate;
        }

        public int getAmount() {
            return amount;
        }

    }

    private List<Tuple> flagedAmountByDay(BalanceParamsDTO balanceParams) {

        try {
            Query query = em.createNativeQuery(FLAGED_AMOUNT_GROUP_BY_DAY, Tuple.class)
                    .setParameter(1, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(2, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private Set<FlagedAmount> buildFlagedAmount(List<Tuple> ts) {
        return ts.stream().map(t -> new FlagedAmount(LocalDate.parse(t.get("mvtDate", String.class)),
                t.get("montantAcc", BigDecimal.class).intValue())).collect(Collectors.toSet());
    }

    @Override
    public List<BalanceDTO> recapBalance(BalanceParamsDTO balanceParams) {

        List<BalanceDTO> balances = new ArrayList<>();
        List<BalanceVenteItemDTO> dataVentes;

        dataVentes = fetchRecapPreenregistrements(balanceParams).stream().map(this::buildPdfDataFromTuple)
                .collect(Collectors.toList());

        Map<TypeTransaction, List<BalanceVenteItemDTO>> groupByTypeVente = dataVentes.stream()
                .collect(Collectors.groupingBy(BalanceVenteItemDTO::getTypeTransaction));
        Map<String, List<VenteReglementReportDTO>> venteRegelementMap = fetchByModeReglements(balanceParams).stream()
                .map(this::buildVenteReglementReportDTO)
                .collect(Collectors.groupingBy(VenteReglementReportDTO::getTypeVente));
        if (groupByTypeVente.containsKey(TypeTransaction.VENTE_COMPTANT)) {
            boolean checkUg = checkUg() && !balanceParams.isShowAllAmount();
            List<BalanceVenteItemDTO> vnoData = groupByTypeVente.remove(TypeTransaction.VENTE_COMPTANT);
            BalanceDTO balanceVno = buildVenteBalance(vnoData, checkUg, balanceParams.isShowAllAmount(),
                    venteRegelementMap.remove("1"));
            balanceVno.setTypeVente(Constant.VENTE_COMPTANT);
            balanceVno.setTypeTransaction(TypeTransaction.VENTE_COMPTANT);
            balanceVno.setBalanceId(balanceVno.getTypeVente());
            balanceVno.setMontantTTC((balanceVno.getMontantTTC() - this.montantToRemove(balanceParams)));
            balances.add(balanceVno);
        }
        if (groupByTypeVente.containsKey(TypeTransaction.VENTE_CREDIT)) {

            List<BalanceVenteItemDTO> vnoData = groupByTypeVente.remove(TypeTransaction.VENTE_CREDIT);
            BalanceDTO balanceVo = buildVenteBalance(vnoData, false, balanceParams.isShowAllAmount(),
                    venteRegelementMap.values().stream().flatMap(v -> v.stream()).collect(Collectors.toList()));
            balanceVo.setTypeVente(Constant.VENTE_ASSURANCE);
            balanceVo.setTypeTransaction(TypeTransaction.VENTE_CREDIT);
            balanceVo.setBalanceId(balanceVo.getTypeVente());
            balances.add(balanceVo);

        }
        return updatePourcent(balances);
    }

    private List<Tuple> etatLastThreeYearsQuery() {
        LocalDate now = LocalDate.now();
        try {

            Query query = em.createNativeQuery(STAT_LAST_THREE_YEARS, Tuple.class)
                    .setParameter(1, DateConverter.DEPOT_EXTENSION).setParameter(2, now.minusYears(2).getYear())
                    .setParameter(3, now.getYear()).setParameter(4, "1");
            return (List<Tuple>) query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }

    }

    private EtatAnnuelDTO buildLastThreeYear(Tuple tuple) {
        EtatAnnuelDTO annuel = new EtatAnnuelDTO();
        annuel.setAnnee(tuple.get("annee", Integer.class));
        int mois = tuple.get("mois", Integer.class);

        long montantTtc = tuple.get("montantTTC", BigDecimal.class).longValue();
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

    private List<EtatAnnuelDTO> buildLastThreeYears() {
        return etatLastThreeYearsQuery().stream().map(this::buildLastThreeYear).collect(Collectors.toList());

    }

    private List<Tuple> fetchByModeReglements(BalanceParamsDTO balanceParams) {
        String sql = replacePlaceHolder(TYPE_REGELEMENT_QUERY, balanceParams);
        LOG.log(Level.INFO, "sql--- balance vente mode reglement {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            return (List<Tuple>) query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private VenteReglementReportDTO buildVenteReglementReportDTO(Tuple tuple) {
        VenteReglementReportDTO venteReglement = new VenteReglementReportDTO();
        venteReglement.setTypeVente(tuple.get("typeVente", String.class));
        venteReglement.setTypeReglement(tuple.get("typeReglement", String.class));
        venteReglement.setMontant(tuple.get("montant", BigDecimal.class).longValue());
        venteReglement.setMontantAttentu(tuple.get("montant_attendu", BigDecimal.class).longValue());
        venteReglement.setLibelle(tuple.get("libelle", String.class));
        venteReglement.setFlagedAmount(tuple.get("flaged_amount", BigDecimal.class).longValue());
        venteReglement.setUgNetAmount(tuple.get("ug_amount_net", BigDecimal.class).longValue());
        venteReglement.setUgTtcAmount(tuple.get("ug_amount", BigDecimal.class).longValue());
        venteReglement.setAmountNonCa(tuple.get("amount_non_ca", BigDecimal.class).longValue());
        return venteReglement;
    }

    private BalanceDTO buildVenteBalance(List<BalanceVenteItemDTO> values, boolean checkUg, boolean showAllAmount,
            List<VenteReglementReportDTO> reglementReports) {
        long montantTTC = 0;
        long montantNet = 0;
        long montantEsp = 0;
        long montantCheque = 0;
        long montantVirement = 0;
        long montantCB = 0;
        long montantTva = 0;
        long marge = 0;
        long montantAchat = 0;
        long montantRemise = 0;
        long montantDiff = 0;
        long nbreVente = 0;
        long panierMoyen = 0;
        long montantCredit = 0;
        long montantRegle = 0;
        long montantTTCReel = 0;
        long montantNetReel = 0;
        long montantOrange = 0;
        long montantMoov = 0;
        long montantMtn = 0;
        long montantWave = 0;

        long totalModeReglement = 0;

        for (BalanceVenteItemDTO balanceVenteItem : values) {
            long montantRegle1 = balanceVenteItem.getMontantRegle().longValue();

            montantTTC += showAllAmount ? balanceVenteItem.getMontantTTCDetatilReal().longValue()
                    : balanceVenteItem.getMontantTTCDetatil().longValue();
            montantTTCReel += balanceVenteItem.getMontantTTCDetatil().longValue();
            long montantUg = checkUg ? balanceVenteItem.getMontantUg().longValue() : 0;
            montantTTC -= montantUg;
            montantTTC -= getFlagedAmount(showAllAmount, balanceVenteItem.getFlagedAmount());
            montantTva += balanceVenteItem.getMontantTva().longValue();
            montantAchat += balanceVenteItem.getMontantAchat().longValue()
                    - (balanceVenteItem.getMontantAchatDetatilToRemove());
            montantRemise += balanceVenteItem.getMontantRemiseDetail().longValue();
            montantDiff += balanceVenteItem.getMontantDiffere().longValue();
            nbreVente += balanceVenteItem.getTotalVente();
            montantCredit += balanceVenteItem.getMontantCredit().longValue();
            montantRegle += montantRegle1;
            // montantPaye += montantPaye1;

        }
        for (VenteReglementReportDTO reglementReport : reglementReports) {
            long ugNetAmount = checkUg ? reglementReport.getUgNetAmount() : 0;
            // long amount = ((reglementReport.getMontant() - reglementReport.getFlagedAmount()) - ugNetAmount)
            // - reglementReport.getAmountNonCa();
            long amount = ((reglementReport.getMontantAttentu() - reglementReport.getFlagedAmount()) - ugNetAmount)
                    - reglementReport.getAmountNonCa();
            totalModeReglement += amount;
            switch (reglementReport.getTypeReglement()) {

            case Constant.MODE_ESP:
                montantEsp += amount;
                break;
            case Constant.MODE_CHEQUE:
                montantCheque += amount;
                break;
            case Constant.MODE_CB:
                montantCB += amount;

                break;
            case Constant.MODE_VIREMENT:
                montantVirement += amount;
                break;
            case Constant.MODE_MOOV:
                montantMoov += amount;

                break;
            case Constant.TYPE_REGLEMENT_ORANGE:
                montantOrange += amount;

                break;
            case Constant.MODE_MTN:
                montantMtn += amount;

                break;
            case Constant.MODE_WAVE:
                montantWave += amount;

                break;
            default:
                break;

            }
        }

        BalanceDTO balance = new BalanceDTO();

        if (nbreVente > 0) {
            panierMoyen = montantTTC / nbreVente;
            balance.setNbreVente(nbreVente);
        }
        montantNet += (montantTTC - montantRemise);
        montantNetReel += (montantTTCReel - montantRemise);
        marge += (montantNetReel - montantTva) - montantAchat;

        balance.setMarge(marge);
        balance.setMontantPaye(montantRegle);// modiffie pour que toutes les valeurs sur tous les menus soient conforme
        balance.setMontantDiff(montantDiff);
        balance.setPanierMoyen(panierMoyen);
        balance.setMontantCB(montantCB);
        balance.setMontantCheque(montantCheque);
        balance.setMontantEsp(montantEsp);
        balance.setMontantTTC(montantTTC);
        balance.setMontantNet(montantNet);
        balance.setMontantRemise(montantRemise);
        balance.setMontantAchat(montantAchat);
        balance.setMontantVirement(montantVirement);
        balance.setMontantTva(montantTva);
        balance.setMontantTp(montantCredit);
        balance.setMontantRegle(montantRegle);
        balance.setMontantMoov(montantMoov);
        balance.setMontantWave(montantWave);
        balance.setMontantOrange(montantOrange);
        balance.setMontantMtn(montantMtn);
        balance.setMontantMobilePayment(balance.getMontantOrange() + balance.getMontantMoov() + balance.getMontantMtn()
                + balance.getMontantWave());
        balance.setTotalModeReglement(totalModeReglement);
        return balance;
    }

    /* depot */
    @Override
    public JSONObject getBalanceForAllDepots(BalanceParamsDTO balanceParams) {
        SummaryDTO finalSummary = new SummaryDTO();
        Map<String, BalanceDTO> aggregatedBalancesMap = new HashMap<>();

        try {
            JSONObject depotsJson = magasinService.findAllDepots("", Constant.FINDALLDEPOT);
            JSONArray depotsArray = depotsJson.getJSONArray("data");

            for (int i = 0; i < depotsArray.length(); i++) {
                JSONObject depotObj = depotsArray.getJSONObject(i);
                String depotId = depotObj.getString("lgEMPLACEMENTID");

                BalanceParamsDTO depotParams = BalanceParamsDTO.builder().dtStart(balanceParams.getDtStart())
                        .dtEnd(balanceParams.getDtEnd()).emplacementId(depotId).build();

                GenericDTO depotData = this.getBalanceVenteCaisseData(depotParams);

                aggregateSummary(finalSummary, depotData.getSummary());

                for (BalanceDTO balance : depotData.getBalances()) {
                    BalanceDTO aggregatedBalance = aggregatedBalancesMap.computeIfAbsent(balance.getBalanceId(), k -> {
                        BalanceDTO newDto = new BalanceDTO();
                        newDto.setBalanceId(k);
                        newDto.setTypeVente(balance.getTypeVente());
                        return newDto;
                    });
                    aggregateBalance(aggregatedBalance, balance);
                }
            }
        } catch (JSONException e) {
            LOG.log(java.util.logging.Level.SEVERE, "Erreur lors de la récupération ou du parsing des dépôts", e);
            return FunctionUtils.returnData(new ArrayList<>(), 0, new SummaryDTO());
        }

        List<BalanceDTO> finalBalances = new ArrayList<>(aggregatedBalancesMap.values());
        updatePourcent(finalBalances);

        return FunctionUtils.returnData(finalBalances, finalBalances.size(), finalSummary);
    }

    private void aggregateSummary(SummaryDTO total, SummaryDTO current) {
        total.setMontantTTC(total.getMontantTTC() + current.getMontantTTC());
        total.setMontantNet(total.getMontantNet() + current.getMontantNet());
        total.setMarge(total.getMarge() + current.getMarge());
        total.setNbreVente(total.getNbreVente() + current.getNbreVente());
        total.setMontantAchat(total.getMontantAchat() + current.getMontantAchat());
        total.setMontantEsp(total.getMontantEsp() + current.getMontantEsp());
        total.setMontantCheque(total.getMontantCheque() + current.getMontantCheque());
        total.setMontantCB(total.getMontantCB() + current.getMontantCB());
        total.setMontantMobilePayment(total.getMontantMobilePayment() + current.getMontantMobilePayment());
        total.setMontantTp(total.getMontantTp() + current.getMontantTp());
        // ... ajoutez d'autres champs du résumé si nécessaire
    }

    private void aggregateBalance(BalanceDTO total, BalanceDTO current) {
        total.setMontantTTC(total.getMontantTTC() + current.getMontantTTC());
        total.setMontantNet(total.getMontantNet() + current.getMontantNet());
        total.setMarge(total.getMarge() + current.getMarge());
        total.setNbreVente(total.getNbreVente() + current.getNbreVente());
        total.setMontantPaye(total.getMontantPaye() + current.getMontantPaye());
        // CORRECTION: Ajout des champs manquants à l'agrégation
        total.setMontantEsp(total.getMontantEsp() + current.getMontantEsp());
        total.setMontantTp(total.getMontantTp() + current.getMontantTp());
    }

    @Override
    public byte[] generateBalanceReport(BalanceParamsDTO balanceParams) throws Exception {
        // ... Le reste de la méthode generateBalanceReport ...
        // Le code existant pour la génération de rapport est correct.
        // Je le remets ici pour que le fichier soit complet.
        String emplacementId = balanceParams.getEmplacementId();
        String reportFileName;
        Map<String, Object> parameters = new HashMap<>();
        List<BalanceDTO> reportData = new ArrayList<>();
        String reportDirectory = Constant.REPORTDEPOT;

        try {
            SummaryDTO summary;
            if ("ALL".equalsIgnoreCase(emplacementId)) {
                reportFileName = "balance_all_depots.jrxml";
                JSONObject depotsJson = magasinService.findAllDepots("", Constant.FINDALLDEPOT);
                JSONArray depotsArray = depotsJson.getJSONArray("data");

                for (int i = 0; i < depotsArray.length(); i++) {
                    JSONObject depotObj = depotsArray.getJSONObject(i);
                    BalanceParamsDTO depotParams = BalanceParamsDTO.builder().dtStart(balanceParams.getDtStart())
                            .dtEnd(balanceParams.getDtEnd()).emplacementId(depotObj.getString("lgEMPLACEMENTID"))
                            .build();

                    GenericDTO depotGenericData = this.getBalanceVenteCaisseData(depotParams);
                    for (BalanceDTO balance : depotGenericData.getBalances()) {
                        balance.setDepotName(depotObj.getString("strNAME"));
                        reportData.add(balance);
                    }
                }
                JSONObject allDataJson = this.getBalanceForAllDepots(balanceParams);
                summary = this.convertJsonToSummaryDto(allDataJson.optJSONObject("metaData"));

            } else {
                reportFileName = "balance_single_depot.jrxml";
                GenericDTO genericData = this.getBalanceVenteCaisseData(balanceParams);
                reportData = genericData.getBalances();
                summary = genericData.getSummary();
                try {
                    TEmplacement depot = em.find(TEmplacement.class, emplacementId);
                    parameters.put("P_DEPOT_NAME", depot != null ? depot.getStrNAME() : "Inconnu");
                } catch (Exception e) {
                    parameters.put("P_DEPOT_NAME", "Inconnu");
                }
            }

            parameters.put("P_START_DATE", balanceParams.getDtStart());
            parameters.put("P_END_DATE", balanceParams.getDtEnd());
            parameters.put("P_MONTANT_TTC", summary.getMontantTTC());
            parameters.put("P_MONTANT_HT", summary.getMontantHT());
            parameters.put("P_MONTANT_TVA", summary.getMontantTva());
            parameters.put("P_MONTANT_NET", summary.getMontantNet());
            parameters.put("P_MARGE", summary.getMarge());
            parameters.put("P_MONTANT_REMISE", summary.getMontantRemise());
            parameters.put("P_NBRE_VENTE", (long) summary.getNbreVente());
            parameters.put("P_PANIER_MOYEN", summary.getPanierMoyen());
            parameters.put("P_MONTANT_ACHAT", summary.getMontantAchat());
            parameters.put("P_MONTANT_TP", summary.getMontantTp());
            parameters.put("P_MONTANT_ESP", summary.getMontantEsp());
            parameters.put("P_MONTANT_CHEQUE", summary.getMontantCheque());
            parameters.put("P_MONTANT_CB", summary.getMontantCB());
            parameters.put("P_MONTANT_VIREMENT", summary.getMontantVirement());
            parameters.put("P_MOBILE_PAYMENT", summary.getMontantMobilePayment());

            String reportPath = reportDirectory + reportFileName;
            InputStream reportStream = new FileInputStream(reportPath);
            JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                    new JRBeanCollectionDataSource(reportData));
            return JasperExportManager.exportReportToPdf(jasperPrint);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur majeure lors de la generation du rapport PDF.", e);
            throw e;
        }
    }

    private SummaryDTO convertJsonToSummaryDto(JSONObject metaDataJson) {
        SummaryDTO summary = new SummaryDTO();
        if (metaDataJson != null) {
            summary.setMontantTTC(metaDataJson.optLong("montantTTC"));
            summary.setMontantNet(metaDataJson.optLong("montantNet"));
            summary.setMarge(metaDataJson.optLong("marge"));
            summary.setNbreVente(metaDataJson.optInt("nbreVente"));
            summary.setPanierMoyen(metaDataJson.optLong("panierMoyen"));
            summary.setMontantAchat(metaDataJson.optLong("montantAchat"));
            summary.setRatioVA(metaDataJson.optDouble("ratioVA"));
            summary.setRationAV(metaDataJson.optDouble("rationAV"));
            summary.setMontantEsp(metaDataJson.optLong("montantEsp"));
            summary.setMontantCheque(metaDataJson.optLong("montantCheque"));
            summary.setMontantCB(metaDataJson.optLong("montantCB"));
            summary.setMontantMobilePayment(metaDataJson.optLong("montantMobilePayment"));
            summary.setMontantHT(metaDataJson.optLong("montantHT"));
            summary.setMontantTva(metaDataJson.optLong("montantTva"));
            summary.setMontantRemise(metaDataJson.optLong("montantRemise"));
            summary.setMontantTp(metaDataJson.optLong("montantTp"));
            summary.setMontantVirement(metaDataJson.optLong("montantVirement"));
        }
        return summary;
    }
}
