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

    // {motif} est remplace par un filtre optionnel sur d.motif_ajustement_id (?4)
    private static final String BASE_QUERY = "SELECT f.lg_FAMILLE_ID AS familleId, f.lg_GROSSISTE_ID AS grossisteId,"
            + " f.int_CIP AS cip, f.str_NAME AS name, COUNT(d.lg_AJUSTEMENTDETAIL_ID) AS nbAjustement,"
            + " COALESCE(SUM(CASE WHEN d.int_NUMBER > 0 THEN d.int_NUMBER ELSE 0 END),0) AS qtePositive,"
            + " COALESCE(SUM(CASE WHEN d.int_NUMBER < 0 THEN ABS(d.int_NUMBER) ELSE 0 END),0) AS qteNegative,"
            + " COALESCE(SUM(ABS(d.int_NUMBER)),0) AS qteTotale"
            + " FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID" + " JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
            + " WHERE a.str_STATUT = 'enable' AND DATE(d.dt_CREATED) BETWEEN ?1 AND ?2 AND u.lg_EMPLACEMENT_ID = ?3"
            + "{motif} GROUP BY f.lg_FAMILLE_ID ORDER BY qteTotale DESC, nbAjustement DESC";

    private static final String COUNT_QUERY = "SELECT COUNT(DISTINCT d.lg_FAMILLE_ID)"
            + " FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
            + " WHERE a.str_STATUT = 'enable' AND DATE(d.dt_CREATED) BETWEEN ?1 AND ?2 AND u.lg_EMPLACEMENT_ID = ?3"
            + "{motif}";

    private static final String MOTIF_CLAUSE = " AND d.motif_ajustement_id = ?4";

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

    private Integer parseMotifId(String motifId) {
        try {
            return StringUtils.isNotEmpty(motifId) ? Integer.valueOf(motifId.trim()) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String withMotif(String sql, Integer motif) {
        return sql.replace("{motif}", motif != null ? MOTIF_CLAUSE : "");
    }

    /** Libelle du motif pour les titres d'exports (vide si pas de filtre). */
    private String motifLibelle(String motifId) {
        Integer id = parseMotifId(motifId);
        if (id == null) {
            return "";
        }
        try {
            dal.MotifAjustement motif = em.find(dal.MotifAjustement.class, id);
            return motif != null ? motif.getLibelle() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private List<AjustementAnalyseDTO> doAnalyse(TUser user, String dtStart, String dtEnd, String motifId, int start,
            int limit) {
        List<AjustementAnalyseDTO> datas = new ArrayList<>();
        try {
            LocalDate debut = parseOrToday(dtStart);
            LocalDate fin = parseOrToday(dtEnd);
            Integer motif = parseMotifId(motifId);
            Query q = em.createNativeQuery(withMotif(BASE_QUERY, motif), Tuple.class).setParameter(1, debut)
                    .setParameter(2, fin).setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (motif != null) {
                q.setParameter(4, motif);
            }
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
    public List<AjustementAnalyseDTO> analyse(TUser user, String dtStart, String dtEnd, String motifId) {
        return doAnalyse(user, dtStart, dtEnd, motifId, 0, 0);
    }

    @Override
    public JSONObject fetchAnalyse(TUser user, String dtStart, String dtEnd, String motifId, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            LocalDate debut = parseOrToday(dtStart);
            LocalDate fin = parseOrToday(dtEnd);
            Integer motif = parseMotifId(motifId);
            Query countQuery = em.createNativeQuery(withMotif(COUNT_QUERY, motif)).setParameter(1, debut)
                    .setParameter(2, fin).setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (motif != null) {
                countQuery.setParameter(4, motif);
            }
            long total = ((Number) countQuery.getSingleResult()).longValue();
            if (total == 0) {
                return json.put("total", 0).put("data", new JSONArray());
            }
            List<AjustementAnalyseDTO> datas = doAnalyse(user, dtStart, dtEnd, motifId, start, limit);
            return json.put("total", total).put("data", new JSONArray(datas));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("total", 0).put("data", new JSONArray());
        }
    }

    private static final String DETAILS_QUERY = "SELECT DATE_FORMAT(d.dt_CREATED,'%d/%m/%Y') AS dateAjustement,"
            + " DATE_FORMAT(d.dt_CREATED,'%H:%i') AS heure, a.str_NAME AS libelle, COALESCE(m.libelle,'') AS motif,"
            + " CONCAT(u.str_FIRST_NAME,' ',u.str_LAST_NAME) AS operateur,"
            + " COALESCE(d.int_NUMBER_CURRENT_STOCK,0) AS stockAvant, COALESCE(d.int_NUMBER,0) AS quantite,"
            + " COALESCE(d.int_NUMBER_AFTER_STOCK,0) AS stockApres"
            + " FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
            + " LEFT JOIN motif_ajustement m ON m.id = d.motif_ajustement_id"
            + " WHERE a.str_STATUT = 'enable' AND d.lg_FAMILLE_ID = ?4 AND DATE(d.dt_CREATED) BETWEEN ?1 AND ?2"
            + " AND u.lg_EMPLACEMENT_ID = ?3{motifDetail} ORDER BY d.dt_CREATED DESC";

    private static final String DETAILS_COUNT_QUERY = "SELECT COUNT(d.lg_AJUSTEMENTDETAIL_ID)"
            + " FROM t_ajustement_detail d JOIN t_ajustement a ON a.lg_AJUSTEMENT_ID = d.lg_AJUSTEMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID"
            + " WHERE a.str_STATUT = 'enable' AND d.lg_FAMILLE_ID = ?4 AND DATE(d.dt_CREATED) BETWEEN ?1 AND ?2"
            + " AND u.lg_EMPLACEMENT_ID = ?3{motifDetail}";

    private static final String MOTIF_DETAIL_CLAUSE = " AND d.motif_ajustement_id = ?5";

    private String withMotifDetail(String sql, Integer motif) {
        return sql.replace("{motifDetail}", motif != null ? MOTIF_DETAIL_CLAUSE : "");
    }

    @Override
    public JSONObject fetchAnalyseDetails(TUser user, String familleId, String dtStart, String dtEnd, String motifId,
            int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            LocalDate debut = parseOrToday(dtStart);
            LocalDate fin = parseOrToday(dtEnd);
            Integer motif = parseMotifId(motifId);
            Query countQuery = em.createNativeQuery(withMotifDetail(DETAILS_COUNT_QUERY, motif)).setParameter(1, debut)
                    .setParameter(2, fin).setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(4, familleId);
            if (motif != null) {
                countQuery.setParameter(5, motif);
            }
            long total = ((Number) countQuery.getSingleResult()).longValue();
            if (total == 0) {
                return json.put("total", 0).put("data", new JSONArray());
            }
            Query q = em.createNativeQuery(withMotifDetail(DETAILS_QUERY, motif), Tuple.class).setParameter(1, debut)
                    .setParameter(2, fin).setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                    .setParameter(4, familleId);
            if (motif != null) {
                q.setParameter(5, motif);
            }
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Tuple> tuples = q.getResultList();
            JSONArray datas = new JSONArray();
            for (Tuple t : tuples) {
                JSONObject row = new JSONObject();
                row.put("dateAjustement", t.get("dateAjustement", String.class));
                row.put("heure", t.get("heure", String.class));
                row.put("libelle", t.get("libelle", String.class));
                row.put("motif", t.get("motif", String.class));
                row.put("operateur", t.get("operateur", String.class));
                row.put("stockAvant", ((Number) t.get("stockAvant")).longValue());
                row.put("quantite", ((Number) t.get("quantite")).longValue());
                row.put("stockApres", ((Number) t.get("stockApres")).longValue());
                datas.put(row);
            }
            return json.put("total", total).put("data", datas);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("total", 0).put("data", new JSONArray());
        }
    }

    private String periode(String dtStart, String dtEnd) {
        return "du " + parseOrToday(dtStart).format(FR) + " au " + parseOrToday(dtEnd).format(FR);
    }

    /** Complement de titre lorsque le filtre motif est actif. */
    private String motifSuffix(String motifId) {
        String libelle = motifLibelle(motifId);
        return StringUtils.isNotEmpty(libelle) ? " - motif : " + libelle : "";
    }

    private String[] headers() {
        return new String[] { "CIP", "Libellé", "Nb ajustements", "Qté augmentée", "Qté diminuée",
                "Qté totale ajustée" };
    }

    @Override
    public byte[] exportCsv(TUser user, String dtStart, String dtEnd, String motifId) throws IOException {
        List<AjustementAnalyseDTO> datas = analyse(user, dtStart, dtEnd, motifId);
        if (datas.isEmpty()) {
            return new byte[0];
        }
        String title = "Produits les plus ajustés " + periode(dtStart, dtEnd) + motifSuffix(motifId);
        byte[] raw = csvExportService.createCsvReport(title, headers(), datas,
                dto -> new String[] { dto.getCip(), dto.getName(), String.valueOf(dto.getNbAjustement()),
                        String.valueOf(dto.getQtePositive()), String.valueOf(dto.getQteNegative()),
                        String.valueOf(dto.getQteTotale()) });
        return csvExportService.addUtf8Bom(raw);
    }

    @Override
    public byte[] exportExcel(TUser user, String dtStart, String dtEnd, String motifId) throws IOException {
        List<AjustementAnalyseDTO> datas = analyse(user, dtStart, dtEnd, motifId);
        if (datas.isEmpty()) {
            return new byte[0];
        }
        String title = "Produits les plus ajustés " + periode(dtStart, dtEnd) + motifSuffix(motifId);
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
    public JSONObject createSuggestion(TUser user, String dtStart, String dtEnd, String motifId) {
        try {
            List<ArticleDTO> datas = analyse(user, dtStart, dtEnd, motifId).stream()
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
    public JSONObject createInventaire(TUser user, String dtStart, String dtEnd, String motifId) {
        try {
            Set<String> ids = analyse(user, dtStart, dtEnd, motifId).stream().map(AjustementAnalyseDTO::getFamilleId)
                    .collect(Collectors.toSet());
            if (ids.isEmpty()) {
                return new JSONObject().put("success", false).put("count", 0);
            }
            int count = inventaireService.create(ids,
                    "Inventaire produits ajustés " + periode(dtStart, dtEnd) + motifSuffix(motifId));
            return new JSONObject().put("success", true).put("count", count);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public String printPdf(TUser user, String dtStart, String dtEnd, String motifId) {
        List<AjustementAnalyseDTO> datas = analyse(user, dtStart, dtEnd, motifId);
        Map<String, Object> parameters = reportUtil.officineData(user);
        parameters.put("P_H_CLT_INFOS", "PRODUITS LES PLUS AJUSTES - PERIODE " + periode(dtStart, dtEnd).toUpperCase()
                + motifSuffix(motifId).toUpperCase());
        return reportUtil.buildReport(parameters, "rp_analyse_ajustement", datas);
    }
}
