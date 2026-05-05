package rest.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
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
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONObject;
import rest.service.ArticleMvtService;
import rest.service.InventaireService;
import rest.service.dto.ArticleMvtDTO;
import util.FunctionUtils;

@Stateless
public class ArticleMvtServiceImpl implements ArticleMvtService {

    private static final Logger LOG = Logger.getLogger(ArticleMvtServiceImpl.class.getName());

    private static final String MVT_QUERY = "SELECT " + " f.lg_FAMILLE_ID AS lgFamilleId, "
            + " CAST(f.int_CIP AS CHAR) AS codeCip, " + " f.str_NAME AS strName, " + " f.int_PRICE AS prixVente, "
            + " f.int_PAF AS prixAchat " + "FROM t_famille f " + "WHERE EXISTS ( " + "   SELECT 1 "
            + "   FROM hmvtproduit h " + "   WHERE h.lg_FAMILLE_ID = f.lg_FAMILLE_ID " + "     AND h.mvtdate >= ?1 "
            + "     AND h.mvtdate <  ?2 " + ") "
            + "AND ( ?3 IS NULL OR CAST(f.int_CIP AS CHAR) LIKE ?3 OR f.str_NAME LIKE ?3 ) " + "ORDER BY f.str_NAME";

    private static final String MVT_QUERY_COUNT = "SELECT COUNT(1) " + "FROM t_famille f " + "WHERE EXISTS ( "
            + "   SELECT 1 " + "   FROM hmvtproduit h " + "   WHERE h.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
            + "     AND h.mvtdate >= ?1 " + "     AND h.mvtdate <  ?2 " + ") "
            + "AND ( ?3 IS NULL OR CAST(f.int_CIP AS CHAR) LIKE ?3 OR f.str_NAME LIKE ?3 ) ";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private InventaireService inventaireService;

    @Override
    public JSONObject getAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start) {
        int total = getCount(dtStart, dtEnd, query);
        return FunctionUtils.returnData(this.getAllArticleMvt(dtStart, dtEnd, query, limit, start, true), total);
    }

    @Override
    public JSONObject getAllArticleMvt(String dtStart, String dtEnd, String query) {
        return FunctionUtils.returnData(this.getAllArticleMvt(dtStart, dtEnd, query, 0, 0, false));
    }

    @Override
    public List<ArticleMvtDTO> getAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start,
            boolean all) {
        return fetchAllArticleMvt(dtStart, dtEnd, query, limit, start, all).stream().map(this::build)
                .collect(Collectors.toList());
    }

    private List<Tuple> fetchAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start,
            boolean all) {
        LOG.log(Level.INFO, "sql--- fetchAllArticleMvt {0}", MVT_QUERY);
        try {
            LocalDate startLd = LocalDate.parse(dtStart);
            LocalDate endLd = LocalDate.parse(dtEnd);

            Timestamp startTs = Timestamp.valueOf(startLd.atStartOfDay());
            Timestamp endExclusiveTs = Timestamp.valueOf(endLd.plusDays(1).atStartOfDay());

            Query q = em.createNativeQuery(MVT_QUERY, Tuple.class).setParameter(1, startTs).setParameter(2,
                    endExclusiveTs);

            String like = StringUtils.isBlank(query) ? null : "%" + query.trim() + "%";
            q.setParameter(3, like);

            if (all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private int getCount(String dtStart, String dtEnd, String query) {
        LOG.log(Level.INFO, "sql--- getCount {0}", MVT_QUERY_COUNT);
        try {
            LocalDate startLd = LocalDate.parse(dtStart);
            LocalDate endLd = LocalDate.parse(dtEnd);

            Timestamp startTs = Timestamp.valueOf(startLd.atStartOfDay());
            Timestamp endExclusiveTs = Timestamp.valueOf(endLd.plusDays(1).atStartOfDay());

            Query q = em.createNativeQuery(MVT_QUERY_COUNT).setParameter(1, startTs).setParameter(2, endExclusiveTs);

            String like = StringUtils.isBlank(query) ? null : "%" + query.trim() + "%";
            q.setParameter(3, like);

            return ((Number) q.getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private ArticleMvtDTO build(Tuple t) {
        String lgFamilleId = t.get("lgFamilleId", String.class);
        String codeCip = t.get("codeCip", String.class);
        String strName = t.get("strName", String.class);

        Integer prixVente = t.get("prixVente", Integer.class);
        Integer prixAchat = t.get("prixAchat", Integer.class);

        prixVente = Objects.isNull(prixVente) ? 0 : prixVente;
        prixAchat = Objects.isNull(prixAchat) ? 0 : prixAchat;

        return ArticleMvtDTO.builder().lgFamilleId(lgFamilleId).codeCip(codeCip).strName(strName).prixVente(prixVente)
                .prixAchat(prixAchat).build();
    }

    @Override
    public JSONObject createInventaireFromSelection(String ids, String dtStart, String dtEnd) {
        JSONObject json = new JSONObject();

        try {
            if (StringUtils.isBlank(ids)) {
                return json.put("success", false).put("count", 0).put("message", "Aucun article sélectionné.");
            }

            Set<String> famillesIds = Arrays.stream(ids.split(",")).map(StringUtils::trimToNull)
                    .filter(Objects::nonNull).collect(Collectors.toSet());

            if (famillesIds.isEmpty()) {
                return json.put("success", false).put("count", 0).put("message", "Aucun identifiant d'article valide.");
            }

            String libelle = "INVENTAIRE ARTICLES EN MOUVEMENT DU " + dtStart + " AU " + dtEnd;

            int count = inventaireService.create(famillesIds, libelle);

            json.put("success", true).put("count", count).put("message", "Inventaire créé avec succès.");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur lors de la création de l'inventaire à partir des mouvements d'articles", e);
            json.put("success", false).put("count", 0).put("message",
                    "Erreur serveur lors de la création de l'inventaire.");
        }

        return json;
    }

    @Override
    public byte[] exportToExcel(String dtStart, String dtEnd, String query) {
        List<ArticleMvtDTO> data = getAllArticleMvt(dtStart, dtEnd, query, 0, 0, false);

        try (Workbook workbook = new HSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("ArticlesMvt");
            int rowIndex = 0;

            // En-têtes
            Row header = sheet.createRow(rowIndex++);
            header.createCell(0).setCellValue("CIP");
            header.createCell(1).setCellValue("Désignation");
            header.createCell(2).setCellValue("Prix achat");
            header.createCell(3).setCellValue("Prix vente");

            // Données
            for (ArticleMvtDTO dto : data) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(dto.getCodeCip());
                row.createCell(1).setCellValue(dto.getStrName());
                row.createCell(2).setCellValue(dto.getPrixAchat() == null ? 0 : dto.getPrixAchat());
                row.createCell(3).setCellValue(dto.getPrixVente() == null ? 0 : dto.getPrixVente());
            }

            for (int i = 0; i < 4; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "Erreur lors de l'export Excel des articles en mouvement", e);
            return new byte[0];
        }
    }
}
