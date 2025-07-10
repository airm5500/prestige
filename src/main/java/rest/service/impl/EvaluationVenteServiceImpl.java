package rest.service.impl;

import commonTasks.dto.VenteDetailsDTO;
import dal.TFamilleStock;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
import org.apache.commons.lang.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.EvaluationVenteService;
import rest.service.SuggestionService;
import rest.service.dto.EvaluationVenteDto;
import rest.service.dto.EvaluationVenteFiltre;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class EvaluationVenteServiceImpl implements EvaluationVenteService {

    private static final Logger LOG = Logger.getLogger(EvaluationVenteServiceImpl.class.getName());

    private static final String QUERY = "SELECT  p.lg_GROSSISTE_ID as grossisteId, p.lg_FAMILLE_ID as produitId,  p.int_CIP AS codeCip ,p.str_NAME AS libelle ,p.int_PRICE AS prixVente,p.int_PAF as prixAchat,SUM(CASE WHEN venteDetail.dateVente <>  MONTH(CURDATE()) "
            + " THEN venteDetail.quantiteVendue ELSE 0 END) AS quantiteVendue,ROUND(SUM(CASE WHEN venteDetail.dateVente <> MONTH(CURDATE()) THEN venteDetail.quantiteVendue ELSE 0 END)/3,2) as moyenne,"
            + "GROUP_CONCAT(venteDetail.quantiteVendue,':',venteDetail.dateVente) as quantite_mois  FROM t_famille p   join (SELECT d.lg_FAMILLE_ID AS produitId,SUM(d.int_QUANTITY) as quantiteVendue, MONTH(v.dt_UPDATED ) as dateVente FROM  t_preenregistrement_detail d JOIN t_preenregistrement v "
            + " ON d.lg_PREENREGISTREMENT_ID=v.lg_PREENREGISTREMENT_ID WHERE v.b_IS_CANCEL=0 AND v.str_STATUT='is_Closed' AND v.int_PRICE >0 AND  DATE(v.dt_UPDATED) BETWEEN ?1 AND CURDATE() GROUP BY d.lg_FAMILLE_ID,dateVente) AS venteDetail on p.lg_FAMILLE_ID=venteDetail.produitId WHERE  p.str_STATUT='enable' {famille_article} {zone_geog} {search} GROUP BY p.lg_FAMILLE_ID {having_placeholder}  ORDER by p.str_NAME";

    private static final String QUERY_COUNT = "SELECT count(c) AS total from (SELECT count(p.lg_FAMILLE_ID) as c FROM t_famille p   join (SELECT d.lg_FAMILLE_ID AS produitId,SUM(d.int_QUANTITY) as quantiteVendue, MONTH(v.dt_UPDATED ) as dateVente FROM  t_preenregistrement_detail d JOIN t_preenregistrement v "
            + "  ON d.lg_PREENREGISTREMENT_ID=v.lg_PREENREGISTREMENT_ID WHERE v.b_IS_CANCEL=0 AND v.str_STATUT='is_Closed' AND v.int_PRICE >0 AND  DATE(v.dt_UPDATED) BETWEEN ?1 AND CURDATE()GROUP BY d.lg_FAMILLE_ID,dateVente) AS venteDetail on p.lg_FAMILLE_ID=venteDetail.produitId  WHERE  p.str_STATUT='enable'"
            + " {famille_article} {zone_geog} {search} GROUP BY p.lg_FAMILLE_ID  {having_placeholder} ) as t  ";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SuggestionService suggestionService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject makeSuggestion(EvaluationVenteFiltre evaluationVenteFiltre) {
        return suggestionService.makeSuggestion(
                getEvaluationVentes(evaluationVenteFiltre).stream().filter(r -> r.getQuantiteVendue() > 0).map(e -> {
                    VenteDetailsDTO detailsDTO = new VenteDetailsDTO();
                    detailsDTO.setTypeVente(e.getGrossisteId());
                    detailsDTO.setLgFAMILLEID(e.getId());
                    detailsDTO.setIntQUANTITY(e.getQuantiteVendue());
                    return detailsDTO;
                }).collect(Collectors.toList()));
    }

    @Override
    public List<EvaluationVenteDto> getEvaluationVentes(EvaluationVenteFiltre evaluationVenteFiltre) {

        return fetchData(evaluationVenteFiltre).stream().map(this::buildFromTuple).collect(Collectors.toList());
    }

    @Override
    public JSONObject fetchEvaluationVentes(EvaluationVenteFiltre evaluationVenteFiltre) {
        JSONObject json = new JSONObject();
        int count = getCount(evaluationVenteFiltre);
        json.put("total", count);
        if (count == 0) {
            json.put("data", new JSONArray());
            return json;
        }
        List<EvaluationVenteDto> data = getEvaluationVentes(evaluationVenteFiltre);

        json.put("data", new JSONArray(data));
        return json;
    }

    private LocalDate getDateParams() {
        return LocalDate.now().minusMonths(3).withDayOfMonth(1);
    }

    private List<Tuple> fetchData(EvaluationVenteFiltre evaluationVenteFiltre) {

        String sql = replacePlaceHolder(QUERY, evaluationVenteFiltre);
        sql = manageFiltre(sql, " HAVING moyenne %s %f", evaluationVenteFiltre);
        LOG.log(Level.INFO, "sql---  evaluationVente {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1,
                    java.sql.Date.valueOf(getDateParams()));
            if (!evaluationVenteFiltre.isAll()) {
                query.setFirstResult(evaluationVenteFiltre.getStart());
                query.setMaxResults(evaluationVenteFiltre.getLimit());
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private String replacePlaceHolder(String sql, EvaluationVenteFiltre evaluationVenteFiltre) {
        if (StringUtils.isNotEmpty(evaluationVenteFiltre.getFamilleId())
                && !"ALL".equals(evaluationVenteFiltre.getFamilleId())) {
            sql = sql.replace("{famille_article}",
                    String.format(" AND p.lg_FAMILLEARTICLE_ID=%s ", evaluationVenteFiltre.getFamilleId()));

        } else {
            sql = sql.replace("{famille_article}", "");
        }
        if (StringUtils.isNotEmpty(evaluationVenteFiltre.getEmplacementId())
                && !"ALL".equals(evaluationVenteFiltre.getEmplacementId())) {
            sql = sql.replace("{zone_geog}",
                    String.format(" AND p.lg_ZONE_GEO_ID=%s ", evaluationVenteFiltre.getEmplacementId()));

        } else {
            sql = sql.replace("{zone_geog}", "");
        }

        if (StringUtils.isNotEmpty(evaluationVenteFiltre.getQuery())) {
            String searchQuery = evaluationVenteFiltre.getQuery() + "%";
            sql = sql.replace("{search}",
                    String.format(" AND (p.int_CIP LIKE '%s' OR p.str_NAME LIKE '%s') ", searchQuery, searchQuery));

        } else {
            sql = sql.replace("{search}", "");
        }

        return sql;
    }

    private String manageFiltre(String sql, String aving, EvaluationVenteFiltre evaluationVenteFiltre) {

        if (StringUtils.isNotEmpty(evaluationVenteFiltre.getFiltre())
                && Objects.nonNull(evaluationVenteFiltre.getFiltreValue())) {
            sql = sql.replace("{having_placeholder}", aving);
            switch (evaluationVenteFiltre.getFiltre()) {
            case Constant.LESS:
                sql = String.format(Locale.US, sql, "<", evaluationVenteFiltre.getFiltreValue());
                break;
            case Constant.MORE:
                sql = String.format(Locale.US, sql, ">", evaluationVenteFiltre.getFiltreValue());
                break;
            case Constant.MOREOREQUAL:
                sql = String.format(Locale.US, sql, ">=", evaluationVenteFiltre.getFiltreValue());
                break;
            case Constant.LESSOREQUAL:
                sql = String.format(Locale.US, sql, "<=", evaluationVenteFiltre.getFiltreValue());
                break;
            case Constant.EQUAL:
                sql = String.format(Locale.US, sql, "=", evaluationVenteFiltre.getFiltreValue());
                break;
            case Constant.NOT:
                sql = String.format(Locale.US, sql, "<>", evaluationVenteFiltre.getFiltreValue());
                break;
            default:
                break;
            }
        } else {
            sql = sql.replace("{having_placeholder}", "");
        }

        return sql;

    }

    private int getCount(EvaluationVenteFiltre evaluationVenteFiltre) {

        String sql = replacePlaceHolder(QUERY_COUNT, evaluationVenteFiltre);
        sql = manageFiltre(sql,
                " HAVING ROUND(SUM(CASE WHEN venteDetail.dateVente <> MONTH(CURDATE()) THEN venteDetail.quantiteVendue ELSE 0 END)/3,2) %s %f",
                evaluationVenteFiltre);
        LOG.log(Level.INFO, "sql---  COUNT {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class);
            query.setParameter(1, java.sql.Date.valueOf(getDateParams()));

            Tuple tuple = (Tuple) query.getSingleResult();
            return Objects.nonNull(tuple) ? tuple.get("total", BigInteger.class).intValue() : 0;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private EvaluationVenteDto buildFromTuple(Tuple t) {
        String quantiteMoisJson = t.get("quantite_mois", String.class);
        String produitId = t.get("produitId", String.class);
        String codeCip = t.get("codeCip", String.class);
        String libelle = t.get("libelle", String.class);
        int prixVente = t.get("prixVente", Integer.class);

        BigDecimal bd = t.get("quantiteVendue", BigDecimal.class);

        int quantiteVendue = Objects.nonNull(bd) ? bd.intValue() : 0;
        String grossisteId = t.get("grossisteId", String.class);
        EvaluationVenteDto dto = new EvaluationVenteDto();
        dto.setCodeCip(codeCip);
        dto.setLibelle(libelle);
        dto.setId(produitId);
        dto.setTotalvente(prixVente);
        dto.setQuantiteVendue(quantiteVendue);
        dto.setMoyenne(t.get("moyenne", BigDecimal.class).floatValue());
        dto.setGrossisteId(grossisteId);
        dto.setStock(getFamilleStockByProduitId(produitId));
        buildMonthQuantityValue(quantiteMoisJson, dto);
        return dto;

    }

    private void buildMonthQuantityValue(String quantiteMoisJson, EvaluationVenteDto dto) {
        LocalDate now = LocalDate.now();
        int quantiteVendueCurrentMonth = now.getMonthValue();
        int quantiteVendueMonthMinusOne = now.minusMonths(1).getMonthValue();
        int quantiteVendueMonthMinusTwo = now.minusMonths(2).getMonthValue();
        int quantiteVendueMonthMinusThree = now.minusMonths(3).getMonthValue();
        String[] r = quantiteMoisJson.split(",");
        for (String r1 : r) {
            String[] v = r1.split(":");
            int month = Integer.parseInt(v[1]);
            int monthQuantity = Integer.parseInt(v[0]);
            if (month == quantiteVendueMonthMinusOne) {
                dto.setQuantiteVendueMonthMinusOne(monthQuantity);
            } else if (month == quantiteVendueMonthMinusTwo) {
                dto.setQuantiteVendueMonthMinusTwo(monthQuantity);
            } else if (month == quantiteVendueMonthMinusThree) {
                dto.setQuantiteVendueMonthMinusThree(monthQuantity);
            } else if (month == quantiteVendueCurrentMonth) {
                dto.setQuantiteVendueCurrentMonth(monthQuantity);
            }
        }

    }

    private int getFamilleStockByProduitId(String idFamille) {
        try {
            TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID='1' AND o.strSTATUT='enable'",
                    TFamilleStock.class);
            q.setParameter(1, idFamille);

            q.setMaxResults(1);
            TFamilleStock familleStock = q.getSingleResult();
            return familleStock.getIntNUMBERAVAILABLE();
        } catch (Exception e) {
            return 0;
        }
    }

}
