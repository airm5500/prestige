package rest.service.impl;

import dal.TUser;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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
 * Gestion des surstocks : calculs corriges et une seule requete agregee (pas de N+1).
 *
 * Performance : les ventes sont agregees dans une table derivee pilotee par l'index de date de t_preenregistrement (une
 * seule passe sur la periode), puis jointes aux produits ; l'ecran n'execute la requete qu'une seule fois (total,
 * valeur totale et page extraits du meme resultat).
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

    /*
     * Table derivee des ventes : une seule passe sur la periode scannee (index de date sur t_preenregistrement),
     * agregation par produit. qteVendue = periode d'historique ; m0..m3 = mois courant et 3 mois precedents.
     */
    private static final String VENTES_CLAUSE = "(SELECT d.lg_FAMILLE_ID AS fid,"
            + " SUM(CASE WHEN p.dt_UPDATED >= :debut THEN d.int_QUANTITY ELSE 0 END) AS qteVendue,"
            + " SUM(CASE WHEN p.dt_UPDATED >= :m0 THEN d.int_QUANTITY ELSE 0 END) AS m0,"
            + " SUM(CASE WHEN p.dt_UPDATED >= :m1 AND p.dt_UPDATED < :m0 THEN d.int_QUANTITY ELSE 0 END) AS m1,"
            + " SUM(CASE WHEN p.dt_UPDATED >= :m2 AND p.dt_UPDATED < :m1 THEN d.int_QUANTITY ELSE 0 END) AS m2,"
            + " SUM(CASE WHEN p.dt_UPDATED >= :m3 AND p.dt_UPDATED < :m2 THEN d.int_QUANTITY ELSE 0 END) AS m3"
            + " FROM t_preenregistrement p"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = :emp"
            + " JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " WHERE p.dt_UPDATED >= :scanDebut AND p.dt_UPDATED < :fin"
            + " AND p.str_STATUT = 'is_Closed' AND COALESCE(p.b_IS_CANCEL,0) = 0 AND p.int_PRICE > 0"
            + " GROUP BY d.lg_FAMILLE_ID"
            + " HAVING SUM(CASE WHEN p.dt_UPDATED >= :debut THEN d.int_QUANTITY ELSE 0 END) > 0) v";

    /* date de peremption la plus proche : lots actifs, sinon date famille */
    private static final String LOTS_CLAUSE = "(SELECT l.lg_FAMILLE_ID AS fid, MIN(l.dt_PEREMPTION) AS dtp"
            + " FROM t_lot l WHERE l.str_STATUT = 'enable' AND l.dt_PEREMPTION IS NOT NULL"
            + " GROUP BY l.lg_FAMILLE_ID) lo";

    private static final String BASE_SQL = "SELECT f.lg_FAMILLE_ID AS id, f.int_CIP AS cip, f.str_NAME AS libelle,"
            + " COALESCE(z.str_LIBELLEE,'SANS EMPLACEMENT') AS emplacement,"
            + " COALESCE(lo.dtp, f.dt_PEREMPTION) AS datePeremption,"
            + " COALESCE(f.int_PRICE,0) AS prixVente, COALESCE(f.int_PAF,0) AS prixAchat,"
            + " fs.int_NUMBER_AVAILABLE AS stock, v.qteVendue AS qteVendue,"
            + " v.m0 AS m0, v.m1 AS m1, v.m2 AS m2, v.m3 AS m3,"
            + " (fs.int_NUMBER_AVAILABLE - ROUND(v.qteVendue / :hist * :proj)) AS qteSurplus,"
            + " (fs.int_NUMBER_AVAILABLE - ROUND(v.qteVendue / :hist * :proj)) * COALESCE(f.int_PAF,0) AS valeurSurplus"
            + " FROM " + VENTES_CLAUSE + " JOIN t_famille f ON f.lg_FAMILLE_ID = v.fid"
            + "   AND f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE,0) = 0"
            + " JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = :emp"
            + "   AND fs.str_STATUT = 'enable'"
            + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID" + " LEFT JOIN " + LOTS_CLAUSE
            + " ON lo.fid = f.lg_FAMILLE_ID"
            // surstock : stock disponible > moyenne mensuelle x mois de projection
            // (ecrit sans division pour rester exact en entier : stock x moisHist > qteVendue x projection)
            + " WHERE fs.int_NUMBER_AVAILABLE * :hist > v.qteVendue * :proj";

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
        LocalDate now = LocalDate.now();
        LocalDate fin = now.plusDays(1);
        LocalDate debut = now.minusMonths(moisHistorique);
        LocalDate m0 = now.withDayOfMonth(1);
        LocalDate m1 = m0.minusMonths(1);
        LocalDate m2 = m0.minusMonths(2);
        LocalDate m3 = m0.minusMonths(3);
        // periode scannee = union de la periode d'historique et des 4 mois affiches
        LocalDate scanDebut = debut.isBefore(m3) ? debut : m3;
        q.setParameter("emp", user.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        q.setParameter("scanDebut", Timestamp.valueOf(scanDebut.atStartOfDay()));
        q.setParameter("debut", Timestamp.valueOf(debut.atStartOfDay()));
        q.setParameter("fin", Timestamp.valueOf(fin.atStartOfDay()));
        q.setParameter("m0", Timestamp.valueOf(m0.atStartOfDay()));
        q.setParameter("m1", Timestamp.valueOf(m1.atStartOfDay()));
        q.setParameter("m2", Timestamp.valueOf(m2.atStartOfDay()));
        q.setParameter("m3", Timestamp.valueOf(m3.atStartOfDay()));
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

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /*
     * Execution unique de la requete agregee. orderByEmplacement : tri emplacement puis valeur (edition PDF groupee) ;
     * sinon tri par valeur de surplus decroissante (ecran).
     */
    private List<SurstockDTO> query(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille, boolean orderByEmplacement) {
        List<SurstockDTO> datas = new ArrayList<>();
        try {
            int hist = sanitize(moisHistorique, 3);
            int proj = sanitize(moisProjection, 3);
            String order = orderByEmplacement ? " ORDER BY emplacement ASC, valeurSurplus DESC, libelle ASC"
                    : " ORDER BY valeurSurplus DESC, libelle ASC";
            String sql = BASE_SQL + filtres(query, codeRayon, codeGrossiste, codeFamille) + order;
            Query q = em.createNativeQuery(sql, Tuple.class);
            bind(q, user, hist, proj, query, codeRayon, codeGrossiste, codeFamille);
            List<Tuple> tuples = q.getResultList();
            for (Tuple t : tuples) {
                SurstockDTO dto = new SurstockDTO();
                dto.setId(t.get("id", String.class));
                dto.setCip(t.get("cip", String.class));
                dto.setLibelle(t.get("libelle", String.class));
                dto.setEmplacement(t.get("emplacement", String.class));
                Object dtp = t.get("datePeremption");
                if (dtp instanceof java.util.Date) {
                    dto.setDatePeremption(new java.text.SimpleDateFormat("dd/MM/yyyy").format((java.util.Date) dtp));
                } else {
                    dto.setDatePeremption("");
                }
                dto.setPrixVente(((Number) t.get("prixVente")).longValue());
                dto.setPrixAchat(((Number) t.get("prixAchat")).longValue());
                dto.setStock(((Number) t.get("stock")).longValue());
                dto.setQteVendue(((Number) t.get("qteVendue")).longValue());
                dto.setMois0(((Number) t.get("m0")).longValue());
                dto.setMois1(((Number) t.get("m1")).longValue());
                dto.setMois2(((Number) t.get("m2")).longValue());
                dto.setMois3(((Number) t.get("m3")).longValue());
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

    @Override
    public JSONObject fetch(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille, int start, int limit) {
        JSONObject json = new JSONObject();
        try {
            // une seule execution : total, valeur totale et page extraits du meme resultat
            List<SurstockDTO> all = query(user, sanitize(moisHistorique, 3), sanitize(moisProjection, 3), query,
                    codeRayon, codeGrossiste, codeFamille, false);
            long totalValeur = all.stream().mapToLong(SurstockDTO::getValeurSurplus).sum();
            List<SurstockDTO> page = all;
            if (limit > 0) {
                int from = Math.min(Math.max(start, 0), all.size());
                int to = Math.min(from + limit, all.size());
                page = all.subList(from, to);
            }
            return json.put("total", all.size()).put("totalValeur", totalValeur).put("data",
                    new JSONArray(page.stream().map(JSONObject::new).collect(Collectors.toList())));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "surstock fetch", e);
            return json.put("total", 0).put("totalValeur", 0).put("data", new JSONArray());
        }
    }

    @Override
    public List<SurstockDTO> fetchAll(TUser user, int moisHistorique, int moisProjection, String query,
            String codeRayon, String codeGrossiste, String codeFamille) {
        return query(user, sanitize(moisHistorique, 3), sanitize(moisProjection, 3), query, codeRayon, codeGrossiste,
                codeFamille, false);
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

    private String moisLabel(LocalDate date) {
        String label = date.getMonth().getDisplayName(TextStyle.FULL, Locale.FRENCH);
        return StringUtils.capitalize(label);
    }

    @Override
    public byte[] exportExcel(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille) throws IOException {
        List<SurstockDTO> datas = fetchAll(user, moisHistorique, moisProjection, query, codeRayon, codeGrossiste,
                codeFamille);
        if (datas.isEmpty()) {
            return new byte[0];
        }
        String[] headers = new String[] { "CIP", "Libelle", "Emplacement", "Date peremption", "Qte vendue periode",
                "Moyenne mensuelle", "Prix vente", "Prix achat", "Stock", "Coefficient", "Nb mois de stock",
                "Qte surplus", "Valeur surplus (achat)" };
        return reportExcelExportService.createExcelReport(titre(moisHistorique, moisProjection), headers, datas,
                (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getCip());
                    row.createCell(col++).setCellValue(dto.getLibelle());
                    row.createCell(col++).setCellValue(dto.getEmplacement());
                    row.createCell(col++).setCellValue(dto.getDatePeremption());
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
        // tri par emplacement : le PDF groupe les produits par emplacement
        List<SurstockDTO> datas = query(user, sanitize(moisHistorique, 3), sanitize(moisProjection, 3), query,
                codeRayon, codeGrossiste, codeFamille, true);
        Map<String, Object> parameters = reportUtil.officineData(user);
        parameters.put("P_H_CLT_INFOS", titre(moisHistorique, moisProjection));
        LocalDate m0 = LocalDate.now().withDayOfMonth(1);
        parameters.put("P_MOIS0", moisLabel(m0));
        parameters.put("P_MOIS1", moisLabel(m0.minusMonths(1)));
        parameters.put("P_MOIS2", moisLabel(m0.minusMonths(2)));
        parameters.put("P_MOIS3", moisLabel(m0.minusMonths(3)));
        return reportUtil.buildReport(parameters, "rp_gestion_surstock", datas);
    }
}
