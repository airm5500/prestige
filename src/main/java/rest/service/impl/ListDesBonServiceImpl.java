package rest.service.impl;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONObject;
import rest.service.ListDesBonService;

import rest.service.dto.BonsDTO;
import rest.service.dto.BonsParam;
import rest.service.dto.BonsTotauxDTO;
import util.DateCommonUtils;
import util.DateConverter;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class ListDesBonServiceImpl implements ListDesBonService {

    private static final Logger LOG = Logger.getLogger(ListDesBonServiceImpl.class.getName());
    private static final String EXCLUDE_STATEMENT = " AND  p.`lg_PREENREGISTREMENT_ID` NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) ";
    private static final String QUERY = "SELECT  DATE_FORMAT(p.`dt_UPDATED`, \"%d/%m/%Y\") AS dtUPDATED,DATE_FORMAT(p.`dt_UPDATED`, \"%H:%i:%s\") AS HEURE, tp.lg_TIERS_PAYANT_ID AS tiersPayantId, tp.str_NAME AS libelleTiersPayant,typeTp.str_LIBELLE_TYPE_TIERS_PAYANT AS typeTiersPayant, \n"
            + " cp.int_PRICE AS cpAmount , p.`str_REF`, cp.`int_PERCENT`,cp.`int_PRICE_RESTE`, p.`int_PRICE_REMISE`\n"
            + "  ,cp.lg_PREENREGISTREMENT_ID AS lg_PREENREGISTREMENT_ID ,p.`str_FIRST_NAME_CUSTOMER`, p.`str_LAST_NAME_CUSTOMER`, clt.`str_FIRST_NAME`,clt.`str_LAST_NAME`,cl.`str_NUMERO_SECURITE_SOCIAL`,cp.`str_REF_BON`\n"
            + "FROM  t_preenregistrement_compte_client_tiers_payent cp,\n"
            + "t_compte_client_tiers_payant cl, t_tiers_payant tp,\n"
            + " t_compte_client cpt,t_type_tiers_payant typeTp, t_client clt, t_preenregistrement p,mvttransaction m\n"
            + " WHERE cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n"
            + " AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND\n"
            + " cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID \n"
            + "AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` AND cpt.`lg_CLIENT_ID`=clt.`lg_CLIENT_ID`\n"
            + "AND p.`lg_PREENREGISTREMENT_ID`=cp.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`dt_UPDATED` BETWEEN  ?1 AND ?2  AND  m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 "
            + " AND p.imported=0 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 {excludeStatement} {search} {tierspayantId} ORDER BY  libelleTiersPayant,p.`dt_UPDATED`  ";

    private static final String RAPPORT_SQL_LIKE = " AND (cp.`str_REF_BON` LIKE '%s' OR cl.`str_NUMERO_SECURITE_SOCIAL` LIKE '%s' OR tp.str_NAME LIKE '%s' OR clt.`str_FIRST_NAME` LIKE '%s' OR clt.`str_FIRST_NAME` LIKE '%s') ";
    private static final String TIERS_PAYANT_ID = " AND tp.`lg_TIERS_PAYANT_ID`= %s ";

    private static final String QUERY_TOTAUX = "SELECT  COUNT(cp.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`)  AS nbreBon, SUM(cp.`int_PRICE`) AS montant "
            + " FROM  t_preenregistrement_compte_client_tiers_payent cp,\n"
            + " t_compte_client_tiers_payant cl, t_tiers_payant tp,\n"
            + " t_compte_client cpt,t_type_tiers_payant typeTp, t_client clt, t_preenregistrement p,mvttransaction m\n"
            + " WHERE cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n"
            + " AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND\n"
            + " cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID \n"
            + "AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` AND cpt.`lg_CLIENT_ID`=clt.`lg_CLIENT_ID`\n"
            + "AND p.`lg_PREENREGISTREMENT_ID`=cp.`lg_PREENREGISTREMENT_ID` AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`dt_UPDATED` BETWEEN  ?1 AND ?2  AND  m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?3 AND m.`lg_EMPLACEMENT_ID` =?4 "
            + " AND p.imported=0 AND p.`b_IS_CANCEL`=0 AND p.`int_PRICE` >0 {excludeStatement} {search} {tierspayantId} ";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<BonsDTO> listAllBons(BonsParam bonsParam) {
        return listBonsList(bonsParam).stream().map(this::build).collect(Collectors.toList());
    }

    @Override
    public JSONObject listBons(BonsParam bonsParam) {
        BonsTotauxDTO bonsTotaux = listBonsTotaux(bonsParam);
        return FunctionUtils.returnData(listAllBons(bonsParam), bonsTotaux.getNbreBon(), bonsTotaux);
    }

    @Override
    public BonsTotauxDTO listBonsTotaux(BonsParam bonsParam) {
        Pair<LocalDateTime, LocalDateTime> dateParams = buildDateParams(bonsParam);
        String sql = replacePlaceHolder(QUERY_TOTAUX, bonsParam.getSearch(), bonsParam.getTiersPayantId(),
                bonsParam.isShowAllAmount());
        LOG.log(Level.INFO, "sql--- listAllBons {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(4, bonsParam.getEmplacementId())
                    .setParameter(1, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getLeft()),
                            TemporalType.DATE)
                    .setParameter(2, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getRight()),
                            TemporalType.DATE);

            return Optional.ofNullable((Tuple) query.getSingleResult()).map(this::buildBonsTotaux)
                    .orElse(BonsTotauxDTO.builder().build());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return BonsTotauxDTO.builder().build();
        }

    }

    private String replacePlaceHolder(String sql, String search, String tiersPayantId, boolean showAllAmount) {
        if (showAllAmount) {
            sql = sql.replace("{excludeStatement}", "");

        } else {
            sql = sql.replace("{excludeStatement}", EXCLUDE_STATEMENT);
        }
        if (StringUtils.isNotEmpty(search)) {

            sql = sql.replace("{search}", String.format(RAPPORT_SQL_LIKE, search + "%", search + "%", search + "%",
                    search + "%", search + "%"));
        } else {
            sql = sql.replace("{search}", "");
        }
        if (StringUtils.isNotEmpty(tiersPayantId)) {

            sql = sql.replace("{tierspayantId}", String.format(TIERS_PAYANT_ID, tiersPayantId));
        } else {
            sql = sql.replace("{tierspayantId}", "");
        }
        return sql;
    }

    private List<Tuple> listBonsList(BonsParam bonsParam) {
        Pair<LocalDateTime, LocalDateTime> dateParams = buildDateParams(bonsParam);
        String sql = replacePlaceHolder(QUERY, bonsParam.getSearch(), bonsParam.getTiersPayantId(),
                bonsParam.isShowAllAmount());
        LOG.log(Level.INFO, "sql--- listAllBons {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(3, DateConverter.DEPOT_EXTENSION)
                    .setParameter(4, bonsParam.getEmplacementId())
                    .setParameter(1, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getLeft()),
                            TemporalType.DATE)
                    .setParameter(2, DateCommonUtils.convertLocalDateTimeToDate(dateParams.getRight()),
                            TemporalType.DATE);
            if (!bonsParam.isAll()) {
                query.setFirstResult(bonsParam.getStart());
                query.setMaxResults(bonsParam.getLimit());
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private BonsDTO build(Tuple tuple) {
        return BonsDTO.builder().dtUPDATED(tuple.get("dtUPDATED", String.class)).heure(tuple.get("HEURE", String.class))
                .tiersPayantId(tuple.get("tiersPayantId", String.class))
                .clientFullName(
                        tuple.get("str_FIRST_NAME", String.class) + " " + tuple.get("str_LAST_NAME", String.class))
                .beneficiaireFullName(tuple.get("str_FIRST_NAME_CUSTOMER", String.class) + " "
                        + tuple.get("str_LAST_NAME_CUSTOMER", String.class))
                .strNUMEROSECURITESOCIAL(tuple.get("str_NUMERO_SECURITE_SOCIAL", String.class))
                .strREFBON(tuple.get("str_REF_BON", String.class)).strREF(tuple.get("str_REF", String.class))
                .tiersPayantLibelle(tuple.get("libelleTiersPayant", String.class))
                .intPERCENT(tuple.get("int_PERCENT", Integer.class)).intPRICE(tuple.get("cpAmount", Integer.class))
                .lg_PREENREGISTREMENT_ID(tuple.get("lg_PREENREGISTREMENT_ID", String.class))
                .typeTiersPayant(tuple.get("typeTiersPayant", String.class)).build();
    }

    private BonsTotauxDTO buildBonsTotaux(Tuple tuple) {
        return BonsTotauxDTO.builder().nbreBon(tuple.get("nbreBon", BigInteger.class).intValue())
                .montant(tuple.get("montant", BigDecimal.class)).build();
    }

    private Pair<LocalDateTime, LocalDateTime> buildDateParams(BonsParam bonsParam) {
        LocalDate dts = StringUtils.isNotEmpty(bonsParam.getDtStart()) ? LocalDate.parse(bonsParam.getDtStart())
                : LocalDate.now();
        LocalTime hs = StringUtils.isNotEmpty(bonsParam.getHStart())
                ? LocalTime.parse(bonsParam.getHStart(), DateTimeFormatter.ofPattern("HH:mm")) : LocalTime.MIN;
        LocalDateTime dtStart = dts.atTime(hs);

        LocalDate dtE = StringUtils.isNotEmpty(bonsParam.getDtEnd()) ? LocalDate.parse(bonsParam.getDtEnd())
                : LocalDate.now();
        LocalTime hE = StringUtils.isNotEmpty(bonsParam.getHEnd())
                ? LocalTime.parse(bonsParam.getHEnd(), DateTimeFormatter.ofPattern("HH:mm")) : LocalTime.MAX;
        LocalDateTime dtEnd = dtE.atTime(hE);
        return Pair.of(dtStart, dtEnd);
    }

}
