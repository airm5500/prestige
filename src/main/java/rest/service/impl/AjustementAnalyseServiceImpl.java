package rest.service.impl;

import commonTasks.dto.AjustementAnalyseDTO;
import commonTasks.dto.ArticleDTO;
import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.AjustementAnalyseService;
import rest.service.InventaireService;
import rest.service.SuggestionService;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;

/**
 * Suivi des produits les plus ajustes sur une periode.
 */
@Stateless
public class AjustementAnalyseServiceImpl implements AjustementAnalyseService {

    private static final Logger LOG = Logger.getLogger(AjustementAnalyseServiceImpl.class.getName());
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String BASE_QUERY = "SELECT f.lg_FAMILLE_ID AS familleId, f.lg_GROSSISTE_ID AS grossisteId,"
            + " f.int_CIP AS cip, f.str_NAME AS name, COUNT(d.lg_AJUSTEMENTDETAIL_ID) AS nbAjustement,"
            + " COALESCE(SUM(CASE WHEN d.int_NUMBER > 0 THEN d.int_NUMBER ELSE 0 END),0) AS qtePositive,"
            + " COALESCE(SUM(CASE WHEN d.int_NUMBER < 0 THEN ABS(d.int_NUMBER) ELSE 0 END),0) AS qteNegative,"
            + " COALESCE(SUM(ABS(d.int_NUMBER)),0) AS qteTotale"
            + " FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
            + " WHERE a.str_STATUT = 'enable' AND DATE(d.dt_CREATED) BETWEEN ?1 AND ?2 AND u.lg_EMPLACEMENT_ID = ?3"
            + " GROUP BY f.lg_FAMILLE_ID ORDER BY qteTotale DESC, nbAjustement DESC";

    private static final String COUNT_QUERY = "SELECT COUNT(DISTINCT d.lg_FAMILLE_ID)"
            + " FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
            + " WHERE a.str_STATUT = 'enable' AND DATE(d.dt_CREATED) BETWEEN ?1 AND ?2 AND u.lg_EMPLACEMENT_ID = ?3";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SuggestionService suggestionService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private CsvExportService csvExportService;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private ReportUtil reportUtil;

    private LocalDate parseOrToday(String date) {
        try {
            return LocalDate.parse(date);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private List<AjustementAnalyseDTO> doAnalyse(TUser user, String dtStart, String dtEnd, int start, int limit) {
        List<AjustementAnalyseDTO> datas = new ArrayList<>();
        try {
            LocalDate debut = parseOrToday(dtStart);
            LocalDate fin = parseOrToday(dtEnd);
            Query q = em.createNativeQuery(BASE_QUERY, Tuple.class).setParameter(1, debut).setParameter(2, fin)
                    .setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Tuple> tuples = q.getResultList();
            for (Tuple t : tuples) {
                AjustementAnalyseDTO dto = new AjustementAnalyseDTO();
                dto.setFamilleId(t.get("familleId", String.class));
                dto.setGrossisteId(t.get("grossisteId", String.class));
                dto.setCip(t.get("cip", String.class));
                dto.setName(t.get("name", String.class));
                dto.setNbAjustement(((Number) t.get("nbAjustement")).longValue());
                dto.setQtePositive(((Number) t.get("qtePositive")).longValue());
                dto.setQteNegative(((Number) t.get("qteNegative")).longValue());
                dto.setQteTotale(((Number) t.get("qteTotale")).longValue());
                datas.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return datas;
    }

    @Override
    public List<AjustementAnalyseDTO> analyse(TUser user, String dtStart, String dtEnd) {
        return doAnalyse(user, dtStart, dtEnd, 0, 0);
    }

    @Override
    public JSONObject fetchAnalyse(TUser user, String dtStart, String dtEnd, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            LocalDate debut = parseOrToday(dtStart);
            LocalDate fin = parseOrToday(dtEnd);
            Query countQuery = em.createNativeQuery(COUNT_QUERY).setParameter(1, debut).setParameter(2, fin)
                    .setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            long total = ((Number) countQuery.getSingleResult()).longValue();
            if (total == 0) {
                return json.put("total", 0).put("data", new JSONArray());
            }
            List<AjustementAnalyseDTO> datas = doAnalyse(user, dtStart, dtEnd, start, limit);
            return json.put("total", total).put("data", new JSONArray(datas));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("total", 0).put("data", new JSONArray());
        }
    }

    private String periode(String dtStart, String dtEnd) {
        return "du " + parseOrToday(dtStart).format(FR) + " au " + parseOrToday(dtEnd).format(FR);
    }

    private String[] headers() {
        return new String[] { "CIP", "Libellé", "Nb ajustements", "Qté augmentée", "Qté diminuée",
                "Qté totale ajustée" };
    }

    @Override
    public byte[] exportCsv(TUser user, String dtStart, String dtEnd) throws IOException {
        List<AjustementAnalyseDTO> datas = analyse(user, dtStart, dtEnd);
        if (datas.isEmpty()) {
            return new byte[0];
        }
        String title = "Produits les plus ajustés " + periode(dtStart, dtEnd);
        byte[] raw = csvExportService.createCsvReport(title, headers(), datas,
                dto -> new String[] { dto.getCip(), dto.getName(), String.valueOf(dto.getNbAjustement()),
                        String.valueOf(dto.getQtePositive()), String.valueOf(dto.getQteNegative()),
                        String.valueOf(dto.getQteTotale()) });
        return csvExportService.addUtf8Bom(raw);
    }

    @Override
    public byte[] exportExcel(TUser user, String dtStart, String dtEnd) throws IOException {
        List<AjustementAnalyseDTO> datas = analyse(user, dtStart, dtEnd);
        if (datas.isEmpty()) {
            return new byte[0];
        }
        String title = "Produits les plus ajustés " + periode(dtStart, dtEnd);
        return reportExcelExportService.createExcelReport(title, headers(), datas, (row, dto) -> {
            int col = 0;
            row.createCell(col++).setCellValue(dto.getCip());
            row.createCell(col++).setCellValue(dto.getName());
            row.createCell(col++).setCellValue(dto.getNbAjustement());
            row.createCell(col++).setCellValue(dto.getQtePositive());
            row.createCell(col++).setCellValue(dto.getQteNegative());
            row.createCell(col++).setCellValue(dto.getQteTotale());
        });
    }

    @Override
    public JSONObject createSuggestion(TUser user, String dtStart, String dtEnd) {
        try {
            List<ArticleDTO> datas = analyse(user, dtStart, dtEnd).stream()
                    .filter(d -> StringUtils.isNotEmpty(d.getGrossisteId())).map(d -> {
                        ArticleDTO article = new ArticleDTO();
                        article.setId(d.getFamilleId());
                        article.setGrossisteId(d.getGrossisteId());
                        return article;
                    }).collect(Collectors.toList());
            if (datas.isEmpty()) {
                return new JSONObject().put("success", false).put("count", 0);
            }
            return suggestionService.makeSuggestionFromArticleInvendus(datas, user);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public JSONObject createInventaire(TUser user, String dtStart, String dtEnd) {
        try {
            Set<String> ids = analyse(user, dtStart, dtEnd).stream().map(AjustementAnalyseDTO::getFamilleId)
                    .collect(Collectors.toSet());
            if (ids.isEmpty()) {
                return new JSONObject().put("success", false).put("count", 0);
            }
            int count = inventaireService.create(ids, "Inventaire produits ajustés " + periode(dtStart, dtEnd));
            return new JSONObject().put("success", true).put("count", count);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public String printPdf(TUser user, String dtStart, String dtEnd) {
        List<AjustementAnalyseDTO> datas = analyse(user, dtStart, dtEnd);
        Map<String, Object> parameters = reportUtil.officineData(user);
        parameters.put("P_H_CLT_INFOS",
                "PRODUITS LES PLUS AJUSTES - PERIODE " + periode(dtStart, dtEnd).toUpperCase());
        return reportUtil.buildReport(parameters, "rp_analyse_ajustement", datas);
    }
}
