package rest.service.impl;

import dal.TUser;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
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
import rest.service.SurstockService;
import rest.service.dto.SurstockDTO;
import rest.service.utils.ReportExcelExportService;

/**
 * Gestion des surstocks : calculs corriges et une seule requete agregee (pas de N+1), filtre de date indexable.
 *
 * Definitions affichees a l'utilisateur (tooltips) : moyenne mensuelle = qte vendue periode / mois d'historique ; nb
 * mois de stock = stock / moyenne mensuelle ; qte surplus = stock - (moyenne x mois de projection) ; valeur surplus =
 * qte surplus x prix d'achat ; coefficient = stock / qte vendue periode.
 */
@Stateless
public class SurstockServiceImpl implements SurstockService {

    private static final Logger LOG = Logger.getLogger(SurstockServiceImpl.class.getName());
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private rest.service.InventaireService inventaireService;
    @EJB
    private ReportUtil reportUtil;

    private static final String SELECT_CLAUSE = "SELECT f.lg_FAMILLE_ID AS id, f.int_CIP AS cip,"
            + " f.str_NAME AS libelle, MAX(COALESCE(fg.str_CODE_ARTICLE,'')) AS codeGrossiste,"
            + " COALESCE(f.int_PRICE,0) AS prixVente, COALESCE(f.int_PAF,0) AS prixAchat,"
            + " fs.int_NUMBER_AVAILABLE AS stock, SUM(d.int_QUANTITY) AS qteVendue,"
            + " (fs.int_NUMBER_AVAILABLE - ROUND(SUM(d.int_QUANTITY) / :hist * :proj)) AS qteSurplus,"
            + " (fs.int_NUMBER_AVAILABLE - ROUND(SUM(d.int_QUANTITY) / :hist * :proj)) * COALESCE(f.int_PAF,0) AS valeurSurplus";

    private static final String FROM_CLAUSE = " FROM t_famille f"
            + " JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = :emp"
            + "   AND fs.str_STATUT = 'enable'"
            + " JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = :emp"
            + " LEFT JOIN t_famille_grossiste fg ON fg.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
            + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE,0) = 0"
            + " AND p.str_STATUT = 'is_Closed' AND COALESCE(p.b_IS_CANCEL,0) = 0 AND p.int_PRICE > 0"
            // filtre indexable (index idx_preenregistrement_dt_updated) : pas de fonction sur la colonne
            + " AND p.dt_UPDATED >= :debut AND p.dt_UPDATED < :fin";

    private static final String GROUP_HAVING = " GROUP BY f.lg_FAMILLE_ID, fs.int_NUMBER_AVAILABLE"
            // surstock : stock disponible > moyenne mensuelle x mois de projection
            // (ecrit sans division pour rester exact en entier : stock x moisHist > qteVendue x projection)
            + " HAVING SUM(d.int_QUANTITY) > 0 AND fs.int_NUMBER_AVAILABLE * :hist > SUM(d.int_QUANTITY) * :proj";

    private String filtres(String query, String codeRayon, String codeGrossiste, String codeFamille) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.isNotEmpty(query)) {
            sb.append(" AND (f.int_CIP LIKE :search OR f.str_NAME LIKE :search OR f.int_EAN13 LIKE :search)");
        }
        if (StringUtils.isNotEmpty(codeRayon)) {
            sb.append(" AND f.lg_ZONE_GEO_ID = :rayon");
        }
        if (StringUtils.isNotEmpty(codeGrossiste)) {
            sb.append(" AND f.lg_GROSSISTE_ID = :grossiste");
        }
        if (StringUtils.isNotEmpty(codeFamille)) {
            sb.append(" AND f.lg_FAMILLEARTICLE_ID = :famille");
        }
        return sb.toString();
    }

    private void bind(Query q, TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille) {
        LocalDate fin = LocalDate.now().plusDays(1);
        LocalDate debut = LocalDate.now().minusMonths(moisHistorique);
        q.setParameter("emp", user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        q.setParameter("debut", java.sql.Date.valueOf(debut));
        q.setParameter("fin", java.sql.Date.valueOf(fin));
        q.setParameter("hist", moisHistorique);
        q.setParameter("proj", moisProjection);
        if (StringUtils.isNotEmpty(query)) {
            q.setParameter("search", query.trim() + "%");
        }
        if (StringUtils.isNotEmpty(codeRayon)) {
            q.setParameter("rayon", codeRayon);
        }
        if (StringUtils.isNotEmpty(codeGrossiste)) {
            q.setParameter("grossiste", codeGrossiste);
        }
        if (StringUtils.isNotEmpty(codeFamille)) {
            q.setParameter("famille", codeFamille);
        }
    }

    private int sanitize(int value, int fallback) {
        return value > 0 ? value : fallback;
    }

    private List<SurstockDTO> query(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille, int start, int limit) {
        List<SurstockDTO> datas = new ArrayList<>();
        try {
            int hist = sanitize(moisHistorique, 3);
            int proj = sanitize(moisProjection, 3);
            String sql = SELECT_CLAUSE + FROM_CLAUSE + filtres(query, codeRayon, codeGrossiste, codeFamille)
                    + GROUP_HAVING + " ORDER BY valeurSurplus DESC, libelle ASC";
            Query q = em.createNativeQuery(sql, Tuple.class);
            bind(q, user, hist, proj, query, codeRayon, codeGrossiste, codeFamille);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Tuple> tuples = q.getResultList();
            for (Tuple t : tuples) {
                SurstockDTO dto = new SurstockDTO();
                dto.setId(t.get("id", String.class));
                dto.setCip(t.get("cip", String.class));
                dto.setLibelle(t.get("libelle", String.class));
                dto.setCodeGrossiste(t.get("codeGrossiste", String.class));
                dto.setPrixVente(((Number) t.get("prixVente")).longValue());
                dto.setPrixAchat(((Number) t.get("prixAchat")).longValue());
                dto.setStock(((Number) t.get("stock")).longValue());
                dto.setQteVendue(((Number) t.get("qteVendue")).longValue());
                dto.setQteSurplus(((Number) t.get("qteSurplus")).longValue());
                dto.setValeurSurplus(((Number) t.get("valeurSurplus")).longValue());
                double moyenne = dto.getQteVendue() / (double) hist;
                dto.setMoyenneMensuelle(round2(moyenne));
                dto.setNbMoisStock(moyenne > 0 ? round2(dto.getStock() / moyenne) : 0);
                dto.setCoefficient(dto.getQteVendue() > 0 ? round2(dto.getStock() / (double) dto.getQteVendue()) : 0);
                datas.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "surstock query", e);
        }
        return datas;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    @Override
    public JSONObject fetch(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            int hist = sanitize(moisHistorique, 3);
            int proj = sanitize(moisProjection, 3);
            String inner = SELECT_CLAUSE + FROM_CLAUSE + filtres(query, codeRayon, codeGrossiste, codeFamille)
                    + GROUP_HAVING;
            Query countQuery = em
                    .createNativeQuery("SELECT COUNT(*), COALESCE(SUM(t.valeurSurplus),0) FROM (" + inner + ") t");
            bind(countQuery, user, hist, proj, query, codeRayon, codeGrossiste, codeFamille);
            Object[] countRow = (Object[]) countQuery.getSingleResult();
            long total = ((Number) countRow[0]).longValue();
            long totalValeur = ((Number) countRow[1]).longValue();
            if (total == 0) {
                return json.put("total", 0).put("totalValeur", 0).put("data", new JSONArray());
            }
            List<SurstockDTO> datas = query(user, hist, proj, query, codeRayon, codeGrossiste, codeFamille, start,
                    limit);
            return json.put("total", total).put("totalValeur", totalValeur).put("data",
                    new JSONArray(datas.stream().map(JSONObject::new).collect(Collectors.toList())));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "surstock fetch", e);
            return json.put("total", 0).put("totalValeur", 0).put("data", new JSONArray());
        }
    }

    @Override
    public List<SurstockDTO> fetchAll(TUser user, int moisHistorique, int moisProjection, String query,
            String codeRayon, String codeGrossiste, String codeFamille) {
        return query(user, sanitize(moisHistorique, 3), sanitize(moisProjection, 3), query, codeRayon, codeGrossiste,
                codeFamille, 0, 0);
    }

    @Override
    public Set<String> produitIds(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille) {
        return fetchAll(user, moisHistorique, moisProjection, query, codeRayon, codeGrossiste, codeFamille).stream()
                .map(SurstockDTO::getId).filter(StringUtils::isNotEmpty)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String titre(int moisHistorique, int moisProjection) {
        LocalDate fin = LocalDate.now();
        LocalDate debut = fin.minusMonths(sanitize(moisHistorique, 3));
        return "PRODUITS DONT LE STOCK EST SUPERIEUR A " + sanitize(moisProjection, 3) + " MOIS - HISTORIQUE : "
                + sanitize(moisHistorique, 3) + " MOIS - PROJECTION : " + sanitize(moisProjection, 3)
                + " MOIS DE STOCK - PERIODE DU " + debut.format(FR) + " AU " + fin.format(FR);
    }

    @Override
    public byte[] exportExcel(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille) throws IOException {
        List<SurstockDTO> datas = fetchAll(user, moisHistorique, moisProjection, query, codeRayon, codeGrossiste,
                codeFamille);
        if (datas.isEmpty()) {
            return new byte[0];
        }
        String[] headers = new String[] { "CIP", "Libelle", "Code grossiste", "Qte vendue periode", "Moyenne mensuelle",
                "Prix vente", "Prix achat", "Stock", "Coefficient", "Nb mois de stock", "Qte surplus",
                "Valeur surplus (achat)" };
        return reportExcelExportService.createExcelReport(titre(moisHistorique, moisProjection), headers, datas,
                (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getCip());
                    row.createCell(col++).setCellValue(dto.getLibelle());
                    row.createCell(col++).setCellValue(dto.getCodeGrossiste());
                    row.createCell(col++).setCellValue(dto.getQteVendue());
                    row.createCell(col++).setCellValue(dto.getMoyenneMensuelle());
                    row.createCell(col++).setCellValue(dto.getPrixVente());
                    row.createCell(col++).setCellValue(dto.getPrixAchat());
                    row.createCell(col++).setCellValue(dto.getStock());
                    row.createCell(col++).setCellValue(dto.getCoefficient());
                    row.createCell(col++).setCellValue(dto.getNbMoisStock());
                    row.createCell(col++).setCellValue(dto.getQteSurplus());
                    row.createCell(col++).setCellValue(dto.getValeurSurplus());
                });
    }

    @Override
    public String printPdf(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille) {
        List<SurstockDTO> datas = fetchAll(user, moisHistorique, moisProjection, query, codeRayon, codeGrossiste,
                codeFamille);
        Map<String, Object> parameters = reportUtil.officineData(user);
        parameters.put("P_H_CLT_INFOS", titre(moisHistorique, moisProjection));
        return reportUtil.buildReport(parameters, "rp_gestion_surstock", datas);
    }
}
