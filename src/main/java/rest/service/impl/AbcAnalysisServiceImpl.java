package rest.service.impl;

import commonTasks.dto.AbcProduitDTO;
import dal.TClasseAbc;
import dal.TFamille;
import dal.TParameters;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.AbcAnalysisService;
import rest.service.InventaireService;
import rest.service.SessionHelperService;
import rest.service.SuggestionService;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;
import commonTasks.dto.VenteDetailsDTO;

@Stateless
public class AbcAnalysisServiceImpl implements AbcAnalysisService {

    private static final Logger LOG = Logger.getLogger(AbcAnalysisServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private SessionHelperService sessionHelperService;

    @EJB
    private ReportExcelExportService reportExcelExportService;

    @EJB
    private CsvExportService csvExportService;

    @EJB
    private InventaireService inventaireService;

    @EJB
    private SuggestionService suggestionService;

    @EJB
    private AbcReclassWriter abcReclassWriter;

    @EJB
    private rest.report.ReportUtil reportUtil;

    private String procedureName(String type) {
        if (type == null) {
            return "analyse_abc_par_ca";
        }
        switch (type.trim().toUpperCase()) {
        case "QTY":
            return "analyse_abc_par_quantite";
        case "MARGE":
            return "analyse_abc_par_marge";
        case "CA":
        default:
            return "analyse_abc_par_ca";
        }
    }

    private static String norm(String v) {
        return ("ALL".equalsIgnoreCase(v)) ? "" : (v == null ? "" : v);
    }

    private static int asInt(Object o) {
        return (o instanceof Number) ? ((Number) o).intValue() : 0;
    }

    private static long asLong(Object o) {
        return (o instanceof Number) ? ((Number) o).longValue() : 0L;
    }

    private static double asDouble(Object o) {
        return (o instanceof Number) ? ((Number) o).doubleValue() : 0d;
    }

    private static Integer asInteger(Object o) {
        return (o instanceof Number) ? ((Number) o).intValue() : null;
    }

    private static String asStr(Object o) {
        return (o == null) ? "" : o.toString();
    }

    @Override
    public List<AbcProduitDTO> classify(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste) {
        String emplacement;
        try {
            emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        } catch (Exception e) {
            emplacement = "";
        }
        return classifyForEmplacement(emplacement, dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
    }

    /**
     * Classification pour un emplacement donne. emplacement vide/null = toute la pharmacie (procedures adaptees pour
     * ignorer le filtre emplacement).
     */
    private List<AbcProduitDTO> classifyForEmplacement(String emplacement, String dtStart, String dtEnd, String type,
            String codeFamille, String codeRayon, String codeGrossiste) {
        List<AbcProduitDTO> list = new ArrayList<>();
        try {
            Query query = em.createNativeQuery("CALL " + procedureName(type) + "(?, ?, ?, ?, ?, ?)");
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacement == null ? "" : emplacement);
            query.setParameter(4, norm(codeFamille));
            query.setParameter(5, norm(codeRayon));
            query.setParameter(6, norm(codeGrossiste));

            @SuppressWarnings("unchecked")
            List<Object[]> rows = query.getResultList();
            for (Object[] r : rows) {
                AbcProduitDTO dto = new AbcProduitDTO();
                dto.setCip(asStr(r[0]));
                dto.setEan(asStr(r[1]));
                dto.setLibelle(asStr(r[2]));
                dto.setClasse(asStr(r[3]));
                dto.setFamille(asStr(r[4]));
                dto.setRayon(asStr(r[5]));
                dto.setCodeGeoArticle(asStr(r[6]));
                dto.setStockDisponible(asInt(r[7]));
                dto.setSeuilMini(asInt(r[8]));
                dto.setQuantiteReappro(asInt(r[9]));
                dto.setQuantiteVendue(asLong(r[10]));
                dto.setChiffreAffaires(asLong(r[11]));
                dto.setMarge(asLong(r[12]));
                dto.setPartPourcentage(asDouble(r[13]));
                dto.setCumulPourcentage(asDouble(r[14]));
                dto.setProduitId(asStr(r[15]));
                dto.setGrossisteId(asStr(r[16]));
                dto.setQ1(asInteger(r[17]));
                dto.setQ2(asInteger(r[18]));
                dto.setQ3(asInteger(r[19]));
                dto.setUniteCalcul(asStr(r[20]));
                list.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Erreur classification ABC", e);
            return Collections.emptyList();
        }
        return list;
    }

    private boolean matchSearch(AbcProduitDTO d, String search) {
        if (StringUtils.isBlank(search)) {
            return true;
        }
        String s = search.trim().toLowerCase();
        return (d.getCip() != null && d.getCip().toLowerCase().contains(s))
                || (d.getLibelle() != null && d.getLibelle().toLowerCase().contains(s))
                || (d.getEan() != null && d.getEan().toLowerCase().contains(s))
                || (d.getCodeGeoArticle() != null && d.getCodeGeoArticle().toLowerCase().contains(s));
    }

    private boolean matchStock(AbcProduitDTO d, String stockFilter, Integer min, Integer max) {
        if (StringUtils.isBlank(stockFilter) || "ALL".equalsIgnoreCase(stockFilter)) {
            return true;
        }
        int stock = d.getStockDisponible();
        int val = (min != null) ? min : 0; // valeur libre saisie par l'utilisateur
        switch (stockFilter.trim().toUpperCase()) {
        // Operateurs avec valeur libre
        case "SUP":
            return stock > val;
        case "SUPEQ":
            return stock >= val;
        case "INF":
            return stock < val;
        case "INFEQ":
            return stock <= val;
        case "EGAL":
            return stock == val;
        // Operateurs sur le seuil du produit
        case "INF_SEUIL":
            return stock < d.getSeuilMini();
        case "INF_EGAL_SEUIL":
            return stock <= d.getSeuilMini();
        // Anciens codes conserves (compatibilite)
        case "SUP0":
            return stock > 0;
        case "EGAL0":
            return stock == 0;
        case "NEGATIF":
            return stock < 0;
        case "ENTRE":
            int lo = (min != null) ? min : Integer.MIN_VALUE;
            int hi = (max != null) ? max : Integer.MAX_VALUE;
            return stock >= lo && stock <= hi;
        default:
            return true;
        }
    }

    private Comparator<AbcProduitDTO> buildComparator(String sort, String dir) {
        Comparator<AbcProduitDTO> cmp;
        String s = (sort == null) ? "" : sort.trim();
        switch (s) {
        case "quantiteVendue":
        case "QTY":
            cmp = Comparator.comparingLong(AbcProduitDTO::getQuantiteVendue);
            break;
        case "marge":
        case "MARGE":
            cmp = Comparator.comparingLong(AbcProduitDTO::getMarge);
            break;
        case "chiffreAffaires":
        case "CA":
            cmp = Comparator.comparingLong(AbcProduitDTO::getChiffreAffaires);
            break;
        default:
            return null; // conserve l'ordre de la procedure
        }
        if (!"asc".equalsIgnoreCase(dir)) {
            cmp = cmp.reversed();
        }
        return cmp;
    }

    /** Construit le resume par classe sur l'ensemble fourni (toujours A/B/C presents). */
    private JSONObject buildSummary(List<AbcProduitDTO> data) {
        Map<String, long[]> agg = new LinkedHashMap<>();
        agg.put("A", new long[4]);
        agg.put("B", new long[4]);
        agg.put("C", new long[4]);
        for (AbcProduitDTO d : data) {
            long[] a = agg.get(d.getClasse());
            if (a == null) {
                continue;
            }
            a[0] += 1; // nbProduits
            a[1] += d.getChiffreAffaires();
            a[2] += d.getQuantiteVendue();
            a[3] += d.getMarge();
        }
        JSONObject summary = new JSONObject();
        for (Map.Entry<String, long[]> e : agg.entrySet()) {
            long[] a = e.getValue();
            summary.put(e.getKey(), new JSONObject().put("nbProduits", a[0]).put("chiffreAffaires", a[1])
                    .put("quantiteVendue", a[2]).put("marge", a[3]));
        }
        return summary;
    }

    @Override
    public JSONObject grid(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax, int start,
            int limit, String sort, String dir, Integer topN) {

        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);

        // Filtres recherche + stock (le resume s'appuie sur cet ensemble, toutes classes)
        List<AbcProduitDTO> filtered = all.stream().filter(d -> matchSearch(d, search))
                .filter(d -> matchStock(d, stockFilter, stockMin, stockMax)).collect(Collectors.toList());

        JSONObject summary = buildSummary(filtered);

        // Filtre classe (n'impacte pas le resume A/B/C)
        List<AbcProduitDTO> rows = filtered;
        if (StringUtils.isNotBlank(classe) && !"ALL".equalsIgnoreCase(classe)) {
            if ("NONE".equalsIgnoreCase(classe)) {
                rows = new ArrayList<>();
            } else {
                final String c = classe.trim().toUpperCase();
                rows = filtered.stream().filter(d -> c.equalsIgnoreCase(d.getClasse())).collect(Collectors.toList());
            }
        }

        // Tri optionnel (sinon ordre de la procedure)
        Comparator<AbcProduitDTO> cmp = buildComparator(sort, dir);
        if (cmp != null) {
            rows.sort(cmp);
        }

        // Top N : on ne garde que les N premiers (les plus importants selon le critere)
        rows = applyTopN(rows, topN);

        int total = rows.size();

        // Pagination
        List<AbcProduitDTO> page = rows;
        if (limit > 0) {
            int from = Math.max(0, start);
            int to = Math.min(total, from + limit);
            page = (from <= to) ? rows.subList(from, to) : Collections.emptyList();
        }

        return new JSONObject().put("success", true).put("total", total).put("data", new JSONArray(page)).put("summary",
                summary);
    }

    @Override
    public JSONObject recalculate(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste) {
        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        return new JSONObject().put("success", true).put("total", all.size()).put("summary", buildSummary(all));
    }

    @Override
    public JSONObject apply(String dtStart, String dtEnd, String type, String codeFamille, String codeRayon,
            String codeGrossiste) {
        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);
        int count = applyClassification(all);
        return new JSONObject().put("success", true).put("count", count);
    }

    /** Ecrit la classe (lg_CLASSE_ABC_ID + date) sur t_famille pour la liste classee. Renvoie le nb mis a jour. */
    private int applyClassification(List<AbcProduitDTO> all) {
        if (all == null || all.isEmpty()) {
            return 0;
        }
        // Code classe -> id technique
        Map<String, String> codeToId = new HashMap<>();
        try {
            List<TClasseAbc> classes = em.createNamedQuery("TClasseAbc.findAll", TClasseAbc.class).getResultList();
            for (TClasseAbc c : classes) {
                codeToId.put(c.getStrCODE(), c.getLgCLASSEABCID());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Lecture t_classe_abc impossible", e);
            return 0;
        }

        // Regroupe les produits par classe puis applique par lots
        Map<String, List<String>> idsByClasse = new HashMap<>();
        for (AbcProduitDTO d : all) {
            String id = codeToId.get(d.getClasse());
            if (id == null || StringUtils.isBlank(d.getProduitId())) {
                continue;
            }
            idsByClasse.computeIfAbsent(d.getClasse(), k -> new ArrayList<>()).add(d.getProduitId());
        }

        Date now = new Date();
        int count = 0;
        final int CHUNK = 500;
        for (Map.Entry<String, List<String>> e : idsByClasse.entrySet()) {
            String classeId = codeToId.get(e.getKey());
            List<String> ids = e.getValue();
            for (int i = 0; i < ids.size(); i += CHUNK) {
                List<String> sub = ids.subList(i, Math.min(ids.size(), i + CHUNK));
                int updated = em.createQuery(
                        "UPDATE TFamille f SET f.lgCLASSEABCID = :cid, f.dtUPDATEDCLASSEABC = :now WHERE f.lgFAMILLEID IN :ids")
                        .setParameter("cid", classeId).setParameter("now", now).setParameter("ids", sub)
                        .executeUpdate();
                count += updated;
            }
        }
        return count;
    }

    @Override
    public JSONObject listClasses() {
        JSONArray arr = new JSONArray();
        try {
            List<TClasseAbc> classes = em.createNamedQuery("TClasseAbc.findAll", TClasseAbc.class).getResultList();
            classes.sort(Comparator.comparing(TClasseAbc::getStrCODE));
            for (TClasseAbc c : classes) {
                arr.put(new JSONObject().put("id", c.getLgCLASSEABCID()).put("code", c.getStrCODE())
                        .put("libelle", c.getStrLIBELLE()).put("q1", c.getIntQ1()).put("q2", c.getIntQ2())
                        .put("q3", c.getIntQ3()).put("unite", c.getStrUNITECALCUL())
                        .put("seuilMin", c.getDblSEUILCUMULMIN()).put("seuilMax", c.getDblSEUILCUMULMAX())
                        .put("statut", c.getStrSTATUT()));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Lecture des classes ABC impossible", e);
            return new JSONObject().put("success", false).put("data", arr);
        }
        return new JSONObject().put("success", true).put("data", arr);
    }

    @Override
    public JSONObject updateClasse(String id, Integer q1, Integer q2, Integer q3, String unite, Double seuilMin,
            Double seuilMax, String statut) {
        if (StringUtils.isBlank(id)) {
            return new JSONObject().put("success", false).put("message", "Identifiant de classe manquant");
        }
        TClasseAbc c = em.find(TClasseAbc.class, id);
        if (c == null) {
            return new JSONObject().put("success", false).put("message", "Classe introuvable");
        }
        if (q1 != null) {
            c.setIntQ1(q1);
        }
        if (q2 != null) {
            c.setIntQ2(q2);
        }
        if (q3 != null) {
            c.setIntQ3(q3);
        }
        if (StringUtils.isNotBlank(unite)) {
            String u = unite.trim().toUpperCase();
            c.setStrUNITECALCUL("JOUR".equals(u) ? "JOUR" : "SEMAINE");
        }
        if (seuilMin != null) {
            c.setDblSEUILCUMULMIN(seuilMin);
        }
        if (seuilMax != null) {
            c.setDblSEUILCUMULMAX(seuilMax);
        }
        if (StringUtils.isNotBlank(statut)) {
            c.setStrSTATUT(statut.trim());
        }
        c.setDtUPDATED(new Date());
        em.merge(c);
        return new JSONObject().put("success", true);
    }

    // ----------------------- Exports / Inventaire (Lot 2) -------------------

    /** Limite la liste aux N premiers (les plus importants selon l'ordre courant). topN null/<=0 = tous. */
    private List<AbcProduitDTO> applyTopN(List<AbcProduitDTO> rows, Integer topN) {
        if (topN != null && topN > 0 && rows.size() > topN) {
            return new ArrayList<>(rows.subList(0, topN));
        }
        return rows;
    }

    /** Resultat filtre complet (recherche + stock + classe + Top N), sans pagination. */
    private List<AbcProduitDTO> filteredList(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax, Integer topN) {
        List<AbcProduitDTO> rows = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste).stream()
                .filter(d -> matchSearch(d, search)).filter(d -> matchStock(d, stockFilter, stockMin, stockMax))
                .collect(Collectors.toList());
        if (StringUtils.isNotBlank(classe) && !"ALL".equalsIgnoreCase(classe)) {
            if ("NONE".equalsIgnoreCase(classe)) {
                return new ArrayList<>();
            }
            final String c = classe.trim();
            rows = rows.stream().filter(d -> c.equalsIgnoreCase(d.getClasse())).collect(Collectors.toList());
        }
        return applyTopN(rows, topN);
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private String reportTitle(String type, String classe, String dtStart, String dtEnd) {
        String cls = (StringUtils.isBlank(classe) || "ALL".equalsIgnoreCase(classe)) ? "toutes classes"
                : ("classe " + classe);
        return "Classification ABC (" + (StringUtils.isBlank(type) ? "CA" : type) + " - " + cls + ") du " + dtStart
                + " au " + dtEnd;
    }

    private static final int EXPORT_MONTHS = 7;

    private static final String[] EXPORT_HEADERS = { "CIP", "EAN", "Libellé", "Classe", "Famille", "Rayon", "Code Geo",
            "Stock", "Seuil", "Qté réappro", "Qté vendue", "CA", "Marge", "Part %", "Cumul %", "Q1", "Q2", "Q3",
            "Unité", "Conso M", "Conso M-1", "Conso M-2", "Conso M-3", "Conso M-4", "Conso M-5", "Conso M-6" };

    private static long consoAt(AbcProduitDTO d, int i) {
        long[] c = d.getConsoMois();
        return (c != null && i < c.length) ? c[i] : 0L;
    }

    @Override
    public byte[] buildExcel(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax, Integer topN) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        if (rows.isEmpty()) {
            return new byte[0];
        }
        enrichWithConso(rows, EXPORT_MONTHS);
        try {
            return reportExcelExportService.createExcelReport(reportTitle(type, classe, dtStart, dtEnd), EXPORT_HEADERS,
                    rows, (Row row, AbcProduitDTO d) -> {
                        int col = 0;
                        row.createCell(col++).setCellValue(nz(d.getCip()));
                        row.createCell(col++).setCellValue(nz(d.getEan()));
                        row.createCell(col++).setCellValue(nz(d.getLibelle()));
                        row.createCell(col++).setCellValue(nz(d.getClasse()));
                        row.createCell(col++).setCellValue(nz(d.getFamille()));
                        row.createCell(col++).setCellValue(nz(d.getRayon()));
                        row.createCell(col++).setCellValue(nz(d.getCodeGeoArticle()));
                        row.createCell(col++).setCellValue(d.getStockDisponible());
                        row.createCell(col++).setCellValue(d.getSeuilMini());
                        row.createCell(col++).setCellValue(d.getQuantiteReappro());
                        row.createCell(col++).setCellValue(d.getQuantiteVendue());
                        row.createCell(col++).setCellValue(d.getChiffreAffaires());
                        row.createCell(col++).setCellValue(d.getMarge());
                        row.createCell(col++).setCellValue(d.getPartPourcentage());
                        row.createCell(col++).setCellValue(d.getCumulPourcentage());
                        row.createCell(col++).setCellValue(d.getQ1() != null ? d.getQ1() : 0);
                        row.createCell(col++).setCellValue(d.getQ2() != null ? d.getQ2() : 0);
                        row.createCell(col++).setCellValue(d.getQ3() != null ? d.getQ3() : 0);
                        row.createCell(col++).setCellValue(nz(d.getUniteCalcul()));
                        for (int i = 0; i < EXPORT_MONTHS; i++) {
                            row.createCell(col++).setCellValue(consoAt(d, i));
                        }
                    });
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Export Excel ABC impossible", e);
            return new byte[0];
        }
    }

    @Override
    public byte[] buildCsv(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax,
            Integer topN) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        if (rows.isEmpty()) {
            return new byte[0];
        }
        enrichWithConso(rows, EXPORT_MONTHS);
        try {
            byte[] raw = csvExportService.createCsvReport(reportTitle(type, classe, dtStart, dtEnd), EXPORT_HEADERS,
                    rows, d -> {
                        List<String> v = new ArrayList<>();
                        v.add(nz(d.getCip()));
                        v.add(nz(d.getEan()));
                        v.add(nz(d.getLibelle()));
                        v.add(nz(d.getClasse()));
                        v.add(nz(d.getFamille()));
                        v.add(nz(d.getRayon()));
                        v.add(nz(d.getCodeGeoArticle()));
                        v.add(String.valueOf(d.getStockDisponible()));
                        v.add(String.valueOf(d.getSeuilMini()));
                        v.add(String.valueOf(d.getQuantiteReappro()));
                        v.add(String.valueOf(d.getQuantiteVendue()));
                        v.add(String.valueOf(d.getChiffreAffaires()));
                        v.add(String.valueOf(d.getMarge()));
                        v.add(String.valueOf(d.getPartPourcentage()));
                        v.add(String.valueOf(d.getCumulPourcentage()));
                        v.add(String.valueOf(d.getQ1() != null ? d.getQ1() : 0));
                        v.add(String.valueOf(d.getQ2() != null ? d.getQ2() : 0));
                        v.add(String.valueOf(d.getQ3() != null ? d.getQ3() : 0));
                        v.add(nz(d.getUniteCalcul()));
                        for (int i = 0; i < EXPORT_MONTHS; i++) {
                            v.add(String.valueOf(consoAt(d, i)));
                        }
                        return v.toArray(new String[0]);
                    });
            return csvExportService.addUtf8Bom(raw);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Export CSV ABC impossible", e);
            return new byte[0];
        }
    }

    @Override
    public byte[] buildPdf(String dtStart, String dtEnd, String type, String classe, String search, String codeFamille,
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax,
            Integer topN) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        enrichWithConso(rows, EXPORT_MONTHS);

        String[] headers = { "CIP", "Libellé", "Cl.", "Famille", "Rayon", "Stock", "Seuil", "Q.réa", "M", "M-1", "M-2",
                "M-3", "CA", "Marge", "Part %", "Cumul %" };
        // Libelle large (nom sur 1 ligne) ; CA/Marge/Stock/Seuil/Part/Cumul reduits
        // pour loger Qte reappro + conso M..M-3.
        float[] widths = { 5f, 18f, 3f, 9f, 8f, 4f, 4f, 4.5f, 4f, 4f, 4f, 4f, 6.5f, 5.5f, 4.5f, 4.5f };

        Document document = new Document(PageSize.A4.rotate(), 18, 18, 18, 18);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f);
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f);

            Paragraph title = new Paragraph(reportTitle(type, classe, dtStart, dtEnd), titleFont);
            title.setSpacingAfter(6f);
            document.add(title);

            document.add(buildPdfSummaryLine(rows));

            PdfPTable table = new PdfPTable(headers.length);
            table.setWidthPercentage(100);
            table.setWidths(widths);
            table.setHeaderRows(1);

            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setGrayFill(0.85f);
                table.addCell(cell);
            }

            for (AbcProduitDTO d : rows) {
                table.addCell(new PdfPCell(new Phrase(nz(d.getCip()), cellFont)));
                table.addCell(new PdfPCell(new Phrase(nz(d.getLibelle()), cellFont)));
                PdfPCell cl = new PdfPCell(new Phrase(nz(d.getClasse()), cellFont));
                cl.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cl);
                table.addCell(new PdfPCell(new Phrase(nz(d.getFamille()), cellFont)));
                table.addCell(new PdfPCell(new Phrase(nz(d.getRayon()), cellFont)));
                table.addCell(rightCell(String.valueOf(d.getStockDisponible()), cellFont));
                table.addCell(rightCell(String.valueOf(d.getSeuilMini()), cellFont));
                table.addCell(rightCell(String.valueOf(d.getQuantiteReappro()), cellFont));
                table.addCell(rightCell(String.valueOf(consoAt(d, 0)), cellFont));
                table.addCell(rightCell(String.valueOf(consoAt(d, 1)), cellFont));
                table.addCell(rightCell(String.valueOf(consoAt(d, 2)), cellFont));
                table.addCell(rightCell(String.valueOf(consoAt(d, 3)), cellFont));
                table.addCell(rightCell(formatFcfa(d.getChiffreAffaires()), cellFont));
                table.addCell(rightCell(formatFcfa(d.getMarge()), cellFont));
                table.addCell(rightCell(String.format(java.util.Locale.US, "%.2f", d.getPartPourcentage()), cellFont));
                table.addCell(rightCell(String.format(java.util.Locale.US, "%.2f", d.getCumulPourcentage()), cellFont));
            }

            document.add(table);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Impression PDF ABC impossible", e);
            if (document.isOpen()) {
                document.close();
            }
            return new byte[0];
        }
    }

    private PdfPCell rightCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        return cell;
    }

    /** Formatte un montant avec separateur de milliers '.' (ex: 37190 -> 37.190). */
    private static String formatFcfa(long value) {
        DecimalFormatSymbols sym = new DecimalFormatSymbols();
        sym.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", sym).format(value);
    }

    /** Ligne de resume coloree (memes codes couleur que la grille) pour le PDF. */
    private Paragraph buildPdfSummaryLine(List<AbcProduitDTO> rows) {
        Map<String, long[]> agg = new LinkedHashMap<>();
        agg.put("A", new long[2]);
        agg.put("B", new long[2]);
        agg.put("C", new long[2]);
        for (AbcProduitDTO d : rows) {
            long[] a = agg.get(d.getClasse());
            if (a != null) {
                a[0] += 1;
                a[1] += d.getChiffreAffaires();
            }
        }
        Color green = new Color(26, 126, 26);
        Color orange = new Color(230, 126, 0);
        Color red = new Color(209, 0, 0);
        Color brown = new Color(139, 69, 19);
        Color blue = new Color(0, 0, 255);
        Map<String, Color> classColor = new HashMap<>();
        classColor.put("A", green);
        classColor.put("B", orange);
        classColor.put("C", red);

        Paragraph p = new Paragraph();
        p.setSpacingAfter(8f);
        String[] order = { "A", "B", "C" };
        for (int i = 0; i < order.length; i++) {
            String c = order[i];
            long[] a = agg.get(c);
            p.add(new Chunk("Classe " + c + ": ",
                    FontFactory.getFont(FontFactory.HELVETICA, 8, Font.BOLD, classColor.get(c))));
            p.add(new Chunk(a[0] + " ", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.BOLD, brown)));
            p.add(new Chunk("-> CA " + formatFcfa(a[1]) + " F.CFA",
                    FontFactory.getFont(FontFactory.HELVETICA, 8, Font.BOLD, blue)));
            if (i < order.length - 1) {
                p.add(new Chunk("    |    ", FontFactory.getFont(FontFactory.HELVETICA, 8, Font.BOLD)));
            }
        }
        return p;
    }

    @Override
    public JSONObject createInventaire(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax, Integer topN) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        if (rows.isEmpty()) {
            return new JSONObject().put("success", true).put("count", 0);
        }
        Set<String> ids = rows.stream().map(AbcProduitDTO::getProduitId).filter(StringUtils::isNotBlank)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        String cls = (StringUtils.isBlank(classe) || "ALL".equalsIgnoreCase(classe)) ? "toutes classes"
                : ("classe " + classe);
        String title = "Inventaire ABC (" + cls + ") du " + dtStart + " au " + dtEnd;
        int count = inventaireService.create(ids, title);
        return new JSONObject().put("success", true).put("count", count);
    }

    @Override
    public JSONObject createSuggestion(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax, Integer topN, boolean isReappro) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        // On ne suggère que les produits ayant un grossiste (regroupement par grossiste,
        // comme la suggestion du 20/80).
        List<VenteDetailsDTO> datas = new ArrayList<>();
        for (AbcProduitDTO d : rows) {
            if (StringUtils.isBlank(d.getGrossisteId())) {
                continue;
            }
            VenteDetailsDTO v = new VenteDetailsDTO();
            v.setLgFAMILLEID(d.getProduitId());
            // equals/hashCode de VenteDetailsDTO reposent sur lgPREENREGISTREMENTDETAILID :
            // on l'initialise avec l'id produit (unique) sinon le Set de suggererQteReappro
            // fusionnerait tous les produits en un seul.
            v.setLgPREENREGISTREMENTDETAILID(d.getProduitId());
            v.setGrossisteId(d.getGrossisteId());
            v.setTypeVente(d.getGrossisteId());
            v.setIntQUANTITY((int) d.getQuantiteVendue());
            datas.add(v);
        }
        if (datas.isEmpty()) {
            return new JSONObject().put("success", true).put("count", 0);
        }
        try {
            // isReappro : on suggere la quantite de reappro de la fiche (int_QTE_REAPPROVISIONNEMENT),
            // sinon la quantite vendue sur la periode (meme logique que le menu articles vendus).
            if (isReappro) {
                return suggestionService.suggererQteReappro(new LinkedHashSet<>(datas));
            }
            return suggestionService.makeSuggestion(datas);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Creation suggestion ABC impossible", e);
            return new JSONObject().put("success", false).put("count", 0);
        }
    }

    // ----------------------- Consommation mensuelle (M .. M-n) --------------

    /**
     * Conso mensuelle consolidee (equivalent boite) par produit effectif. Cle = id produit (parent), valeur = tableau
     * [mois courant, M-1, ... M-(months-1)]. Si produitId != null, restreint a ce produit.
     */
    private Map<String, long[]> monthlyConso(String produitId, int months) {
        int monthsBack = Math.max(0, months - 1);
        String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        StringBuilder sql = new StringBuilder().append("SELECT t.eff_id, t.m_index, SUM(t.qty_equiv) FROM (").append(
                "SELECT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' ")
                .append("THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id, ")
                .append("((YEAR(CURDATE())*12+MONTH(CURDATE())) - (YEAR(p.dt_UPDATED)*12+MONTH(p.dt_UPDATED))) AS m_index, ")
                .append("CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' ")
                .append("THEN pd.int_QUANTITY/COALESCE(NULLIF(parent.int_NUMBERDETAIL,0),1) ELSE pd.int_QUANTITY END AS qty_equiv ")
                .append("FROM t_preenregistrement p ").append("JOIN t_user u ON p.lg_USER_ID=u.lg_USER_ID ")
                .append("JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID ")
                .append("JOIN t_famille f ON pd.lg_FAMILLE_ID=f.lg_FAMILLE_ID ")
                .append("LEFT JOIN t_famille parent ON parent.lg_FAMILLE_ID=f.lg_FAMILLE_PARENT_ID ")
                .append("WHERE p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5' ")
                .append("AND u.lg_EMPLACEMENT_ID=? ")
                .append("AND p.dt_UPDATED >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ? MONTH),'%Y-%m-01')");
        // Perf : pour un seul produit, on filtre sur pd.lg_FAMILLE_ID (indexe) via le jeu
        // { produit + ses details }, ce qui evite de balayer toutes les ventes de la periode.
        if (produitId != null) {
            sql.append(" AND pd.lg_FAMILLE_ID IN (SELECT cf.lg_FAMILLE_ID FROM t_famille cf "
                    + "WHERE cf.lg_FAMILLE_ID=? OR cf.lg_FAMILLE_PARENT_ID=?)");
        }
        sql.append(") t WHERE t.m_index BETWEEN 0 AND ? GROUP BY t.eff_id, t.m_index");

        Map<String, long[]> map = new HashMap<>();
        try {
            Query q = em.createNativeQuery(sql.toString());
            int p = 1;
            q.setParameter(p++, emplacement);
            q.setParameter(p++, monthsBack);
            if (produitId != null) {
                q.setParameter(p++, produitId);
                q.setParameter(p++, produitId);
            }
            q.setParameter(p++, monthsBack);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();
            final int m = months;
            for (Object[] r : rows) {
                String id = asStr(r[0]);
                int idx = asInt(r[1]);
                if (idx < 0 || idx >= m) {
                    continue;
                }
                long[] arr = map.computeIfAbsent(id, k -> new long[m]);
                arr[idx] = Math.round(asDouble(r[2]));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Calcul conso mensuelle ABC impossible", e);
        }
        return map;
    }

    /** Renseigne consoMois sur chaque ligne (un seul appel SQL pour tout le lot). */
    private void enrichWithConso(List<AbcProduitDTO> rows, int months) {
        if (rows == null || rows.isEmpty()) {
            return;
        }
        Map<String, long[]> map = monthlyConso(null, months);
        for (AbcProduitDTO d : rows) {
            long[] arr = map.get(d.getProduitId());
            d.setConsoMois(arr != null ? arr : new long[months]);
        }
    }

    @Override
    public JSONObject produitConso(String produitId, int months) {
        if (months <= 0) {
            months = 7;
        }
        if (StringUtils.isBlank(produitId)) {
            return new JSONObject().put("success", false);
        }
        String libelle = "";
        String cip = "";
        try {
            TFamille f = em.find(TFamille.class, produitId);
            if (f != null) {
                libelle = nz(f.getStrNAME());
                cip = nz(f.getIntCIP());
            }
        } catch (Exception e) {
            // ignore
        }
        final String[] MOIS = { "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre",
                "Octobre", "Novembre", "Décembre" };
        Map<String, long[]> map = monthlyConso(produitId, months);
        long[] arr = map.getOrDefault(produitId, new long[months]);
        java.time.LocalDate now = java.time.LocalDate.now();
        JSONArray data = new JSONArray();
        long total = 0;
        for (int i = 0; i < months; i++) {
            java.time.LocalDate d = now.minusMonths(i);
            String label = MOIS[d.getMonthValue() - 1];
            data.put(new JSONObject().put("mois", label).put("conso", arr[i]));
            total += arr[i];
        }
        return new JSONObject().put("success", true).put("produitId", produitId).put("cip", cip).put("libelle", libelle)
                .put("total", total).put("data", data);
    }

    // ----------------------- Evolution mensuelle des classes ----------------

    /** Metriques mensuelles consolidees par produit effectif sur la periode : id -> (ym -> [CA, QTE, MARGE]). */
    private Map<String, Map<String, double[]>> monthlyMetrics(String dtStart, String dtEnd) {
        String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        String sql = "SELECT t.eff_id, t.ym, SUM(t.ca), SUM(t.qty_equiv), SUM(t.marge) FROM ("
                + "SELECT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' "
                + "THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id, "
                + "DATE_FORMAT(p.dt_UPDATED,'%Y-%m') AS ym, pd.int_PRICE AS ca, "
                + "CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' "
                + "THEN pd.int_QUANTITY/COALESCE(NULLIF(parent.int_NUMBERDETAIL,0),1) ELSE pd.int_QUANTITY END AS qty_equiv, "
                + "((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat*pd.int_QUANTITY)) AS marge "
                + "FROM t_preenregistrement p " + "JOIN t_user u ON p.lg_USER_ID=u.lg_USER_ID "
                + "JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID "
                + "JOIN t_famille f ON pd.lg_FAMILLE_ID=f.lg_FAMILLE_ID "
                + "LEFT JOIN t_famille parent ON parent.lg_FAMILLE_ID=f.lg_FAMILLE_PARENT_ID "
                + "WHERE p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5' "
                + "AND u.lg_EMPLACEMENT_ID=? AND p.dt_UPDATED >= ? AND p.dt_UPDATED < DATE_ADD(?, INTERVAL 1 DAY) "
                + ") t GROUP BY t.eff_id, t.ym";
        Map<String, Map<String, double[]>> map = new HashMap<>();
        try {
            Query q = em.createNativeQuery(sql);
            q.setParameter(1, emplacement);
            q.setParameter(2, dtStart);
            q.setParameter(3, dtEnd);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();
            for (Object[] r : rows) {
                String id = asStr(r[0]);
                String ym = asStr(r[1]);
                map.computeIfAbsent(id, k -> new HashMap<>()).put(ym,
                        new double[] { asDouble(r[2]), asDouble(r[3]), asDouble(r[4]) });
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Calcul evolution ABC impossible", e);
        }
        return map;
    }

    @Override
    public JSONObject evolution(String dtStart, String dtEnd, String type, String indicator, String classe,
            String search, String codeFamille, String codeRayon, String codeGrossiste, String stockFilter,
            Integer stockMin, Integer stockMax) {
        // Classes FIGEES sur toute la periode (mode FIXED), en respectant les filtres de la grille.
        // (le Top N ne s'applique pas a la courbe)
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, null);
        Map<String, String> produitClasse = new HashMap<>();
        for (AbcProduitDTO d : rows) {
            produitClasse.put(d.getProduitId(), d.getClasse());
        }

        String ind = (indicator == null) ? "CA" : indicator.trim().toUpperCase();
        int metricIdx = "QTY".equals(ind) ? 1 : ("MARGE".equals(ind) ? 2 : 0); // COUNT gere a part

        Map<String, Map<String, double[]>> metrics = monthlyMetrics(dtStart, dtEnd);

        // Liste des mois de la periode (annee-mois)
        List<String> moisList = new ArrayList<>();
        try {
            java.time.YearMonth start = java.time.YearMonth.from(java.time.LocalDate.parse(dtStart));
            java.time.YearMonth end = java.time.YearMonth.from(java.time.LocalDate.parse(dtEnd));
            for (java.time.YearMonth ym = start; !ym.isAfter(end); ym = ym.plusMonths(1)) {
                moisList.add(ym.toString()); // format yyyy-MM
            }
        } catch (Exception e) {
            // periode invalide -> aucun mois
        }

        JSONArray months = new JSONArray();
        for (String ym : moisList) {
            double a = 0, b = 0, c = 0;
            for (Map.Entry<String, String> e : produitClasse.entrySet()) {
                Map<String, double[]> perMonth = metrics.get(e.getKey());
                if (perMonth == null) {
                    continue;
                }
                double[] m = perMonth.get(ym);
                if (m == null) {
                    continue;
                }
                double val = "COUNT".equals(ind) ? 1 : m[metricIdx];
                switch (e.getValue()) {
                case "A":
                    a += val;
                    break;
                case "B":
                    b += val;
                    break;
                case "C":
                    c += val;
                    break;
                default:
                    break;
                }
            }
            String[] p = ym.split("-");
            String label = (p.length == 2) ? (p[1] + "/" + p[0]) : ym;
            months.put(new JSONObject().put("month", label).put("A", Math.round(a)).put("B", Math.round(b)).put("C",
                    Math.round(c)));
        }
        return new JSONObject().put("success", true).put("indicator", ind).put("months", months);
    }

    // ----------------------- Reclassification automatique -------------------

    private String readParam(String key, String def) {
        try {
            TParameters p = em.find(TParameters.class, key);
            return (p != null && p.getStrVALUE() != null) ? p.getStrVALUE() : def;
        } catch (Exception e) {
            return def;
        }
    }

    private void writeParam(String key, String value) {
        try {
            TParameters p = em.find(TParameters.class, key);
            if (p == null) {
                p = new TParameters(key);
                p.setStrVALUE(value);
                p.setStrSTATUT("enable");
                p.setDtCREATED(new Date());
                em.persist(p);
            } else {
                p.setStrVALUE(value);
                p.setDtUPDATED(new Date());
                em.merge(p);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Ecriture parametre " + key + " impossible", e);
        }
    }

    @Override
    public JSONObject autoReclassifyIfDue() {
        // Activation
        if (!"1".equals(readParam("ABC_AUTO_RECLASS", "1").trim())) {
            return new JSONObject().put("success", true).put("skipped", "disabled");
        }
        java.time.LocalDate today = java.time.LocalDate.now();
        // Deja fait ce mois ?
        String last = readParam("ABC_LAST_RECLASS_DATE", "");
        try {
            if (StringUtils.isNotBlank(last)) {
                java.time.LocalDate d = java.time.LocalDate.parse(last.trim());
                if (d.getYear() == today.getYear() && d.getMonthValue() == today.getMonthValue()) {
                    return new JSONObject().put("success", true).put("skipped", "already-done");
                }
            }
        } catch (Exception e) {
            // date invalide -> on recalcule
        }

        int nbMois;
        try {
            nbMois = Integer.parseInt(readParam("ABC_RECLASS_NB_MOIS", "12").trim());
        } catch (Exception e) {
            nbMois = 12;
        }
        if (nbMois <= 0) {
            nbMois = 12;
        }
        String dtEnd = today.toString();
        String dtStart = today.minusMonths(nbMois).withDayOfMonth(1).toString();

        // Pharmacie entiere (emplacement vide), critere standard QUANTITE
        List<AbcProduitDTO> all = classifyForEmplacement("", dtStart, dtEnd, "QTY", "", "", "");
        int total = all.size();

        // Code classe -> id technique
        Map<String, String> codeToId = new HashMap<>();
        try {
            for (TClasseAbc c : em.createNamedQuery("TClasseAbc.findAll", TClasseAbc.class).getResultList()) {
                codeToId.put(c.getStrCODE(), c.getLgCLASSEABCID());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Lecture t_classe_abc impossible", e);
            return new JSONObject().put("success", false).put("message", "Lecture des classes impossible");
        }

        // Regroupe par classe
        Map<String, List<String>> idsByClasse = new LinkedHashMap<>();
        long nbA = 0, nbB = 0, nbC = 0;
        for (AbcProduitDTO d : all) {
            if (StringUtils.isBlank(d.getProduitId()) || codeToId.get(d.getClasse()) == null) {
                continue;
            }
            idsByClasse.computeIfAbsent(d.getClasse(), k -> new ArrayList<>()).add(d.getProduitId());
            if ("A".equals(d.getClasse())) {
                nbA++;
            } else if ("B".equals(d.getClasse())) {
                nbB++;
            } else if ("C".equals(d.getClasse())) {
                nbC++;
            }
        }

        // Application PAR PAQUET (commit independant via REQUIRES_NEW) -> libere les verrous au fur et a mesure
        Date now = new Date();
        int applied = 0;
        boolean partial = false;
        final int CHUNK = 500;
        for (Map.Entry<String, List<String>> e : idsByClasse.entrySet()) {
            String classeId = codeToId.get(e.getKey());
            List<String> ids = e.getValue();
            for (int i = 0; i < ids.size(); i += CHUNK) {
                List<String> sub = ids.subList(i, Math.min(ids.size(), i + CHUNK));
                try {
                    applied += abcReclassWriter.applyChunk(classeId, sub, now);
                } catch (Exception ex) {
                    partial = true;
                    LOG.log(Level.SEVERE, "Echec d'un paquet de reclassification ABC", ex);
                }
            }
        }

        boolean complete = !partial && applied >= total;
        String statut = complete ? "OK" : "PARTIEL";
        String info = "date=" + today + ", total=" + total + ", appliques=" + applied + ", A=" + nbA + ", B=" + nbB
                + ", C=" + nbC + ", statut=" + statut;
        writeParam("ABC_LAST_RECLASS_INFO", info);
        // On ne pose la date (= "fait ce mois") QUE si c'est complet -> sinon rattrapage au prochain passage
        if (complete) {
            writeParam("ABC_LAST_RECLASS_DATE", today.toString());
        }
        LOG.log(Level.INFO, "[ABC] Reclassification automatique: {0}", info);

        return new JSONObject().put("success", true).put("statut", statut).put("total", total).put("count", applied)
                .put("A", nbA).put("B", nbB).put("C", nbC).put("dtStart", dtStart).put("dtEnd", dtEnd);
    }

    // ----------------------- Feuille de match -------------------------------

    private static final int FM_CHUNK = 900;

    private static List<List<String>> fmChunks(List<String> ids) {
        List<List<String>> chunks = new ArrayList<>();
        for (int i = 0; i < ids.size(); i += FM_CHUNK) {
            chunks.add(ids.subList(i, Math.min(ids.size(), i + FM_CHUNK)));
        }
        return chunks;
    }

    /** Prix d'achat (int_PAF) et de vente (int_PRICE) par produit : id -> [paf, prix]. */
    private Map<String, long[]> fmPrix(List<String> ids) {
        Map<String, long[]> map = new HashMap<>();
        for (List<String> chunk : fmChunks(ids)) {
            List<Object[]> rows = em.createNativeQuery(
                    "SELECT f.lg_FAMILLE_ID, COALESCE(f.int_PAF,0), COALESCE(f.int_PRICE,0) FROM t_famille f"
                            + " WHERE f.lg_FAMILLE_ID IN (:ids)")
                    .setParameter("ids", chunk).getResultList();
            for (Object[] r : rows) {
                map.put(asStr(r[0]), new long[] { Math.round(asDouble(r[1])), Math.round(asDouble(r[2])) });
            }
        }
        return map;
    }

    /**
     * Entrees en stock (receptions de bons de livraison clotures) du mois courant et des 3 mois precedents : id ->
     * [4][2] avec [m][0] = frequence d'achat (nombre de receptions) et [m][1] = quantite totale entree, m = 0 (mois en
     * cours) a 3 (mois -3).
     */
    private Map<String, long[][]> fmEntrees(List<String> ids) {
        Map<String, long[][]> map = new HashMap<>();
        for (List<String> chunk : fmChunks(ids)) {
            List<Object[]> rows = em.createNativeQuery("SELECT bld.lg_FAMILLE_ID,"
                    + " ((YEAR(CURDATE())*12+MONTH(CURDATE())) - (YEAR(bld.dt_UPDATED)*12+MONTH(bld.dt_UPDATED))) AS m_index,"
                    + " COUNT(bld.lg_BON_LIVRAISON_DETAIL), SUM(COALESCE(bld.int_QTE_RECUE,0))"
                    + " FROM t_bon_livraison_detail bld"
                    + " INNER JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID"
                    + " WHERE bl.str_STATUT = 'is_Closed'"
                    + " AND bld.dt_UPDATED >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 MONTH),'%Y-%m-01')"
                    + " AND bld.lg_FAMILLE_ID IN (:ids) GROUP BY bld.lg_FAMILLE_ID, m_index").setParameter("ids", chunk)
                    .getResultList();
            for (Object[] r : rows) {
                int idx = asInt(r[1]);
                if (idx < 0 || idx > 3) {
                    continue;
                }
                long[][] arr = map.computeIfAbsent(asStr(r[0]), k -> new long[4][2]);
                arr[idx][0] = Math.round(asDouble(r[2]));
                arr[idx][1] = Math.round(asDouble(r[3]));
            }
        }
        return map;
    }

    /** Derniere entree en stock par produit : id -> [date de reception (java.util.Date), quantite recue]. */
    private Map<String, Object[]> fmDerniereEntree(List<String> ids) {
        Map<String, Object[]> map = new HashMap<>();
        for (List<String> chunk : fmChunks(ids)) {
            List<Object[]> rows = em
                    .createNativeQuery("SELECT bld.lg_FAMILLE_ID, bld.dt_UPDATED, COALESCE(bld.int_QTE_RECUE,0)"
                            + " FROM t_bon_livraison_detail bld"
                            + " INNER JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID"
                            + " INNER JOIN (SELECT bld2.lg_FAMILLE_ID AS fid, MAX(bld2.dt_UPDATED) AS maxdt"
                            + "   FROM t_bon_livraison_detail bld2"
                            + "   INNER JOIN t_bon_livraison bl2 ON bl2.lg_BON_LIVRAISON_ID = bld2.lg_BON_LIVRAISON_ID"
                            + "   WHERE bl2.str_STATUT = 'is_Closed' AND bld2.lg_FAMILLE_ID IN (:ids)"
                            + "   GROUP BY bld2.lg_FAMILLE_ID) last"
                            + " ON last.fid = bld.lg_FAMILLE_ID AND bld.dt_UPDATED = last.maxdt"
                            + " WHERE bl.str_STATUT = 'is_Closed' AND bld.lg_FAMILLE_ID IN (:ids)")
                    .setParameter("ids", chunk).getResultList();
            for (Object[] r : rows) {
                map.putIfAbsent(asStr(r[0]), new Object[] { r[1], Math.round(asDouble(r[2])) });
            }
        }
        return map;
    }

    /** Stock reserve par produit (t_type_stock_famille type '2') pour l'emplacement courant. */
    private Map<String, Long> fmStockReserve(List<String> ids, String emplacement) {
        Map<String, Long> map = new HashMap<>();
        for (List<String> chunk : fmChunks(ids)) {
            List<Object[]> rows = em
                    .createNativeQuery("SELECT t.lg_FAMILLE_ID, COALESCE(t.int_NUMBER,0) FROM t_type_stock_famille t"
                            + " WHERE t.lg_TYPE_STOCK_ID = '2' AND t.str_STATUT = 'enable'"
                            + " AND t.lg_EMPLACEMENT_ID = :empl AND t.lg_FAMILLE_ID IN (:ids)")
                    .setParameter("empl", emplacement).setParameter("ids", chunk).getResultList();
            for (Object[] r : rows) {
                map.put(asStr(r[0]), Math.round(asDouble(r[1])));
            }
        }
        return map;
    }

    /**
     * Vente hebdomadaire moyenne (MOY/4) par produit : quantites vendues (equivalent boite, consolidation deconditionne
     * -> parent) des 28 derniers jours divisees par 4.
     */
    private Map<String, Double> fmVenteHebdo(List<String> ids, String emplacement) {
        Map<String, Double> map = new HashMap<>();
        for (List<String> chunk : fmChunks(ids)) {
            List<Object[]> rows = em.createNativeQuery("SELECT t.eff_id, SUM(t.qty_equiv) FROM ("
                    + "SELECT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' "
                    + "THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id, "
                    + "CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' "
                    + "THEN pd.int_QUANTITY/COALESCE(NULLIF(parent.int_NUMBERDETAIL,0),1) ELSE pd.int_QUANTITY END AS qty_equiv "
                    + "FROM t_preenregistrement p JOIN t_user u ON p.lg_USER_ID=u.lg_USER_ID "
                    + "JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID "
                    + "JOIN t_famille f ON pd.lg_FAMILLE_ID=f.lg_FAMILLE_ID "
                    + "LEFT JOIN t_famille parent ON parent.lg_FAMILLE_ID=f.lg_FAMILLE_PARENT_ID "
                    + "WHERE p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5' "
                    + "AND u.lg_EMPLACEMENT_ID=:empl AND p.dt_UPDATED >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) "
                    + "AND pd.lg_FAMILLE_ID IN (SELECT cf.lg_FAMILLE_ID FROM t_famille cf "
                    + "WHERE cf.lg_FAMILLE_ID IN (:ids) OR cf.lg_FAMILLE_PARENT_ID IN (:ids))"
                    + ") t GROUP BY t.eff_id").setParameter("empl", emplacement).setParameter("ids", chunk)
                    .getResultList();
            for (Object[] r : rows) {
                map.put(asStr(r[0]), asDouble(r[1]) / 4.0);
            }
        }
        return map;
    }

    /** Nom francais du mois courant decale de {@code minus} mois (0 = mois en cours). */
    private static String fmNomMois(int minus) {
        return java.time.LocalDate.now().minusMonths(minus).getMonth().getDisplayName(java.time.format.TextStyle.FULL,
                java.util.Locale.FRENCH);
    }

    /** Statut de l'objectif d'achat mensuel : respecte si chaque mois observe a une frequence <= objectif. */
    private static String fmObjectifStatut(long[][] entrees, int objectif) {
        StringBuilder depassements = new StringBuilder();
        for (int m = 0; m <= 3; m++) {
            if (entrees[m][0] > objectif) {
                if (depassements.length() > 0) {
                    depassements.append(", ");
                }
                depassements.append(fmNomMois(m)).append(" (").append(entrees[m][0]).append(")");
            }
        }
        return depassements.length() == 0 ? "Respecté" : ("Dépassé : " + depassements);
    }

    /** Construit les lignes de la feuille de match (donnees d'achat) pour la liste de produits classee. */
    private List<commonTasks.dto.FeuilleDeMatchLigneDTO> buildFeuilleDeMatchRows(List<AbcProduitDTO> rows,
            int objectif) {
        String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<String> ids = rows.stream().map(AbcProduitDTO::getProduitId).filter(StringUtils::isNotBlank).distinct()
                .collect(Collectors.toList());
        Map<String, long[]> prix = fmPrix(ids);
        Map<String, long[][]> entrees = fmEntrees(ids);
        Map<String, Object[]> dernieres = fmDerniereEntree(ids);
        Map<String, Long> reserves = fmStockReserve(ids, emplacement);
        Map<String, Double> hebdos = fmVenteHebdo(ids, emplacement);

        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm");
        DecimalFormat df = new DecimalFormat("0.00", new DecimalFormatSymbols(java.util.Locale.US));

        List<commonTasks.dto.FeuilleDeMatchLigneDTO> lignes = new ArrayList<>();
        for (AbcProduitDTO d : rows) {
            String id = nz(d.getProduitId());
            long[] p = prix.getOrDefault(id, new long[] { 0, 0 });
            long[][] e = entrees.getOrDefault(id, new long[4][2]);
            Object[] derniere = dernieres.get(id);

            commonTasks.dto.FeuilleDeMatchLigneDTO ligne = new commonTasks.dto.FeuilleDeMatchLigneDTO();
            ligne.setCip(nz(d.getCip()));
            ligne.setLibelle(nz(d.getLibelle()));
            ligne.setPrixAchat(p[0]);
            ligne.setPrixVente(p[1]);
            ligne.setDerniereEntree((derniere != null && derniere[0] != null)
                    ? (sdf.format((Date) derniere[0]) + " (qté " + derniere[1] + ")") : "aucune");
            ligne.setFreqM0(e[0][0]);
            ligne.setQteM0(e[0][1]);
            ligne.setFreqM1(e[1][0]);
            ligne.setQteM1(e[1][1]);
            ligne.setFreqM2(e[2][0]);
            ligne.setQteM2(e[2][1]);
            ligne.setFreqM3(e[3][0]);
            ligne.setQteM3(e[3][1]);
            ligne.setStockReserve(reserves.getOrDefault(id, 0L));
            ligne.setVenteHebdo(df.format(hebdos.getOrDefault(id, 0d)));
            ligne.setMoyenneAchat3Mois(df.format((e[1][1] + e[2][1] + e[3][1]) / 3.0));
            ligne.setObjectifStatut(fmObjectifStatut(e, objectif));
            lignes.add(ligne);
        }
        return lignes;
    }

    /** Ids distincts non vides d'une liste de produits classes. */
    private static List<String> fmIds(List<AbcProduitDTO> rows) {
        return rows.stream().map(AbcProduitDTO::getProduitId).filter(StringUtils::isNotBlank).distinct()
                .collect(Collectors.toList());
    }

    /**
     * Filtre optionnel sur le statut de l'objectif d'achat : ATTEINT (frequence <= objectif sur chaque mois observe) ou
     * DEPASSE. Toute autre valeur = pas de filtre.
     */
    private List<AbcProduitDTO> applyObjectifFilter(List<AbcProduitDTO> rows, Map<String, long[][]> entrees,
            int objectif, String objectifFilter) {
        if (StringUtils.isBlank(objectifFilter) || "ALL".equalsIgnoreCase(objectifFilter)) {
            return rows;
        }
        boolean atteint = "ATTEINT".equalsIgnoreCase(objectifFilter);
        return rows.stream().filter(d -> {
            long[][] e = entrees.getOrDefault(nz(d.getProduitId()), new long[4][2]);
            boolean respecte = "Respecté".equals(fmObjectifStatut(e, objectif));
            return atteint == respecte;
        }).collect(Collectors.toList());
    }

    @Override
    public JSONObject feuilleDeMatchGrid(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax, int start, int limit, Integer topN, Integer objectifAchat, String objectifFilter) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        int objectif = (objectifAchat != null && objectifAchat > 0) ? objectifAchat : 3;
        boolean avecFiltreObjectif = StringUtils.isNotBlank(objectifFilter) && !"ALL".equalsIgnoreCase(objectifFilter);

        // Avec filtre objectif : les entrees de tous les produits sont necessaires
        // pour filtrer avant pagination ; sinon seules celles de la page suffisent.
        Map<String, long[][]> entrees = avecFiltreObjectif ? fmEntrees(fmIds(rows)) : null;
        if (avecFiltreObjectif) {
            rows = applyObjectifFilter(rows, entrees, objectif, objectifFilter);
        }

        int total = rows.size();
        List<AbcProduitDTO> page = rows;
        if (limit > 0) {
            int from = Math.max(0, start);
            int to = Math.min(total, from + limit);
            page = (from <= to) ? rows.subList(from, to) : Collections.emptyList();
        }
        if (entrees == null) {
            entrees = fmEntrees(fmIds(page));
        }

        JSONArray data = new JSONArray();
        for (AbcProduitDTO d : page) {
            long[][] e = entrees.getOrDefault(nz(d.getProduitId()), new long[4][2]);
            data.put(new JSONObject(d).put("freqM0", e[0][0]).put("qteM0", e[0][1]).put("objectifStatut",
                    fmObjectifStatut(e, objectif)));
        }
        return new JSONObject().put("success", true).put("total", total).put("data", data).put("moisCourant",
                fmNomMois(0));
    }

    @Override
    public byte[] buildFeuilleDeMatchPdf(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax, Integer topN, Integer objectifAchat, String objectifFilter) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax, topN);
        int objectifFiltre = (objectifAchat != null && objectifAchat > 0) ? objectifAchat : 3;
        if (StringUtils.isNotBlank(objectifFilter) && !"ALL".equalsIgnoreCase(objectifFilter) && !rows.isEmpty()) {
            rows = applyObjectifFilter(rows, fmEntrees(fmIds(rows)), objectifFiltre, objectifFilter);
        }
        if (rows.isEmpty()) {
            return new byte[0];
        }
        try {
            int objectif = objectifFiltre;
            List<commonTasks.dto.FeuilleDeMatchLigneDTO> lignes = buildFeuilleDeMatchRows(rows, objectif);

            String typeLabel = "MARGE".equalsIgnoreCase(type) ? "marge"
                    : ("CA".equalsIgnoreCase(type) ? "chiffre d'affaires" : "quantité");
            Map<String, Object> parameters = reportUtil.officineData(sessionHelperService.getCurrentUser());
            parameters.put("P_H_CLT_INFOS", "FEUILLE DE MATCH (TOP " + rows.size() + " - "
                    + typeLabel.toUpperCase(java.util.Locale.FRENCH) + ") DU " + nz(dtStart) + " AU " + nz(dtEnd));
            parameters.put("P_MOIS_COURANT", fmNomMois(0));
            parameters.put("P_MOIS_1", fmNomMois(1));
            parameters.put("P_MOIS_2", fmNomMois(2));
            parameters.put("P_MOIS_3", fmNomMois(3));
            parameters.put("P_OBJECTIF_ACHAT", objectif);

            // Modele .jrxml : version du repertoire de rapports du serveur si presente,
            // sinon le modele embarque dans le war (src/main/resources/reports).
            net.sf.jasperreports.engine.JasperReport report = reportUtil.getReport("rp_feuille_de_match",
                    toolkits.utils.jdom.scr_report_file);
            net.sf.jasperreports.engine.JasperPrint print = net.sf.jasperreports.engine.JasperFillManager.fillReport(
                    report, parameters, new net.sf.jasperreports.engine.data.JRBeanCollectionDataSource(lignes));
            return net.sf.jasperreports.engine.JasperExportManager.exportReportToPdf(print);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Impression PDF Feuille de match impossible", e);
            return new byte[0];
        }
    }

    @Override
    public JSONObject feuilleDeMatchProduitDetail(String produitId, Integer objectifAchat) {
        JSONObject json = new JSONObject();
        try {
            TFamille famille = em.find(TFamille.class, produitId);
            if (famille == null) {
                return json.put("success", false);
            }
            int objectif = (objectifAchat != null && objectifAchat > 0) ? objectifAchat : 3;
            AbcProduitDTO dto = new AbcProduitDTO();
            dto.setProduitId(famille.getLgFAMILLEID());
            dto.setCip(famille.getIntCIP());
            dto.setLibelle(famille.getStrNAME());
            commonTasks.dto.FeuilleDeMatchLigneDTO ligne = buildFeuilleDeMatchRows(Collections.singletonList(dto),
                    objectif).get(0);
            json.put("success", true).put("data", new JSONObject(ligne)).put("objectif", objectif)
                    .put("moisCourant", fmNomMois(0)).put("mois1", fmNomMois(1)).put("mois2", fmNomMois(2))
                    .put("mois3", fmNomMois(3));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "feuilleDeMatchProduitDetail", e);
            json.put("success", false);
        }
        return json;
    }

}
