package rest.service.impl;

import java.io.FileInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.PointDepotService;
import rest.service.dto.PointDepotDTO;
import util.Constant;

/**
 *
 * @author DICI
 */
@Stateless
public class PointDepotServiceImpl implements PointDepotService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject getPointDepot(String dtStart, String dtEnd, String emplacementId) {
        LocalDate startDate = StringUtils.isEmpty(dtStart) ? LocalDate.now() : LocalDate.parse(dtStart);
        LocalDate endDate = StringUtils.isEmpty(dtEnd) ? LocalDate.now() : LocalDate.parse(dtEnd);

        boolean isCumulative = !startDate.isEqual(endDate);

        List<PointDepotDTO> data = findPointDepotData(startDate, endDate, emplacementId, isCumulative);

        JSONObject json = new JSONObject();
        json.put("rows", new JSONArray(data));
        json.put("total", data.size());
        return json;
    }

    private List<PointDepotDTO> findPointDepotData(LocalDate startDate, LocalDate endDate, String emplacementId,
            boolean isCumulative) {
        try {
            StringBuilder sql = new StringBuilder();
            sql.append(
                    "SELECT SUM(m.montantNet) AS montantTotalNet, SUM(m.montantCredit) AS credit, SUM(m.montantRegle) AS especes, ");
            sql.append("u.str_FIRST_NAME AS caissiere, e.str_NAME AS depot ");

            if (!isCumulative) {
                sql.append(", DATE(m.mvtdate) AS dateTransaction ");
            }

            sql.append("FROM mvttransaction m ");
            sql.append("INNER JOIN t_user u ON m.lg_USER_ID = u.lg_USER_ID ");
            sql.append("INNER JOIN t_emplacement e ON e.lg_EMPLACEMENT_ID = m.lg_EMPLACEMENT_ID ");
            sql.append("WHERE m.lg_EMPLACEMENT_ID <> 1 AND m.typeMvtCaisseId IN (4, 5, 8, 9) ");
            sql.append("AND DATE(m.mvtdate) BETWEEN ?1 AND ?2 ");

            if (StringUtils.isNotEmpty(emplacementId) && !"ALL".equalsIgnoreCase(emplacementId)) {
                sql.append("AND m.lg_EMPLACEMENT_ID = ?3 ");
            }

            sql.append("GROUP BY m.lg_USER_ID, u.str_FIRST_NAME, e.str_NAME ");
            if (!isCumulative) {
                sql.append(", DATE(m.mvtdate)");
            }

            javax.persistence.Query query = em.createNativeQuery(sql.toString(), Tuple.class);
            query.setParameter(1, java.sql.Date.valueOf(startDate));
            query.setParameter(2, java.sql.Date.valueOf(endDate));

            if (StringUtils.isNotEmpty(emplacementId) && !"ALL".equalsIgnoreCase(emplacementId)) {
                query.setParameter(3, emplacementId);
            }

            List<Tuple> result = query.getResultList();

            String periodLabel = startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                    + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

            return result.stream().map(tuple -> buildDtoFromTuple(tuple, isCumulative, periodLabel))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    private PointDepotDTO buildDtoFromTuple(Tuple tuple, boolean isCumulative, String periodLabel) {
        String dateTransaction = isCumulative ? periodLabel : tuple.get("dateTransaction", java.sql.Date.class)
                .toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        return PointDepotDTO.builder().montantTotalNet(tuple.get("montantTotalNet", BigDecimal.class).longValue())
                .credit(tuple.get("credit", BigDecimal.class).longValue())
                .especes(tuple.get("especes", BigDecimal.class).longValue())
                .caissiere(tuple.get("caissiere", String.class)).depot(tuple.get("depot", String.class))
                .dateTransaction(dateTransaction).build();
    }

    @Override
    public byte[] generatePointCaisseReport(String dtStart, String dtEnd, String emplacementId) throws Exception {
        LocalDate startDate = StringUtils.isEmpty(dtStart) ? LocalDate.now() : LocalDate.parse(dtStart);
        LocalDate endDate = StringUtils.isEmpty(dtEnd) ? LocalDate.now() : LocalDate.parse(dtEnd);
        boolean isCumulative = !startDate.isEqual(endDate);

        List<PointDepotDTO> data = findPointDepotData(startDate, endDate, emplacementId, isCumulative);

        String reportName = "point_caisse_report.jrxml";
        String reportDirectory = Constant.REPORTDEPOT;

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("P_PERIODE", startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " au "
                + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        String reportPath = reportDirectory + reportName;
        InputStream reportStream = new FileInputStream(reportPath);
        JasperReport jasperReport = JasperCompileManager.compileReport(reportStream);
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters,
                new JRBeanCollectionDataSource(data));

        return JasperExportManager.exportReportToPdf(jasperPrint);
    }
}
