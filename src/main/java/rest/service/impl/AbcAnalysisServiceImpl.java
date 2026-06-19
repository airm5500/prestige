package rest.service.impl;

import commonTasks.dto.AbcProduitDTO;
import dal.TClasseAbc;
import dal.TFamille;
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
        List<AbcProduitDTO> list = new ArrayList<>();
        try {
            String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            Query query = em.createNativeQuery("CALL " + procedureName(type) + "(?, ?, ?, ?, ?, ?)");
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacement);
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
        switch (stockFilter.trim().toUpperCase()) {
        case "SUP0":
            return stock > 0;
        case "EGAL0":
            return stock == 0;
        case "INF_SEUIL":
            return stock < d.getSeuilMini();
        case "INF_EGAL_SEUIL":
            return stock <= d.getSeuilMini();
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
            int limit, String sort, String dir) {

        List<AbcProduitDTO> all = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste);

        // Filtres recherche + stock (le resume s'appuie sur cet ensemble, toutes classes)
        List<AbcProduitDTO> filtered = all.stream()
                .filter(d -> matchSearch(d, search))
                .filter(d -> matchStock(d, stockFilter, stockMin, stockMax))
                .collect(Collectors.toList());

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

        int total = rows.size();

        // Pagination
        List<AbcProduitDTO> page = rows;
        if (limit > 0) {
            int from = Math.max(0, start);
            int to = Math.min(total, from + limit);
            page = (from <= to) ? rows.subList(from, to) : Collections.emptyList();
        }

        return new JSONObject().put("success", true).put("total", total).put("data", new JSONArray(page))
                .put("summary", summary);
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
        if (all.isEmpty()) {
            return new JSONObject().put("success", true).put("count", 0);
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
            return new JSONObject().put("success", false).put("count", 0);
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
        return new JSONObject().put("success", true).put("count", count);
    }

    @Override
    public JSONObject listClasses() {
        JSONArray arr = new JSONArray();
        try {
            List<TClasseAbc> classes = em.createNamedQuery("TClasseAbc.findAll", TClasseAbc.class).getResultList();
            classes.sort(Comparator.comparing(TClasseAbc::getStrCODE));
            for (TClasseAbc c : classes) {
                arr.put(new JSONObject()
                        .put("id", c.getLgCLASSEABCID())
                        .put("code", c.getStrCODE())
                        .put("libelle", c.getStrLIBELLE())
                        .put("q1", c.getIntQ1())
                        .put("q2", c.getIntQ2())
                        .put("q3", c.getIntQ3())
                        .put("unite", c.getStrUNITECALCUL())
                        .put("seuilMin", c.getDblSEUILCUMULMIN())
                        .put("seuilMax", c.getDblSEUILCUMULMAX())
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

    /** Resultat filtre complet (recherche + stock + classe), sans pagination. */
    private List<AbcProduitDTO> filteredList(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax) {
        List<AbcProduitDTO> rows = classify(dtStart, dtEnd, type, codeFamille, codeRayon, codeGrossiste).stream()
                .filter(d -> matchSearch(d, search))
                .filter(d -> matchStock(d, stockFilter, stockMin, stockMax))
                .collect(Collectors.toList());
        if (StringUtils.isNotBlank(classe) && !"ALL".equalsIgnoreCase(classe)) {
            if ("NONE".equalsIgnoreCase(classe)) {
                return new ArrayList<>();
            }
            final String c = classe.trim();
            rows = rows.stream().filter(d -> c.equalsIgnoreCase(d.getClasse())).collect(Collectors.toList());
        }
        return rows;
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

    private static final String[] EXPORT_HEADERS = { "CIP", "EAN", "Libellé", "Classe", "Famille", "Rayon",
            "Code Geo", "Stock", "Seuil", "Qté réappro", "Qté vendue", "CA", "Marge", "Part %", "Cumul %", "Q1", "Q2",
            "Q3", "Unité", "Conso M", "Conso M-1", "Conso M-2", "Conso M-3", "Conso M-4", "Conso M-5", "Conso M-6" };

    private static long consoAt(AbcProduitDTO d, int i) {
        long[] c = d.getConsoMois();
        return (c != null && i < c.length) ? c[i] : 0L;
    }

    @Override
    public byte[] buildExcel(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax);
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
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax);
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
            String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin, Integer stockMax) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax);
        enrichWithConso(rows, EXPORT_MONTHS);

        String[] headers = { "CIP", "Libellé", "Cl.", "Famille", "Rayon", "Stock", "Seuil", "Q.réa", "M", "M-1",
                "M-2", "M-3", "CA", "Marge", "Part %", "Cumul %" };
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
            Integer stockMax) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax);
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
            Integer stockMax) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax);
        // On ne suggère que les produits ayant un grossiste (regroupement par grossiste,
        // comme la suggestion du 20/80).
        List<VenteDetailsDTO> datas = new ArrayList<>();
        for (AbcProduitDTO d : rows) {
            if (StringUtils.isBlank(d.getGrossisteId())) {
                continue;
            }
            VenteDetailsDTO v = new VenteDetailsDTO();
            v.setLgFAMILLEID(d.getProduitId());
            v.setGrossisteId(d.getGrossisteId());
            v.setTypeVente(d.getGrossisteId());
            v.setIntQUANTITY((int) d.getQuantiteVendue());
            datas.add(v);
        }
        if (datas.isEmpty()) {
            return new JSONObject().put("success", true).put("count", 0);
        }
        try {
            return suggestionService.makeSuggestion(datas);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Creation suggestion ABC impossible", e);
            return new JSONObject().put("success", false).put("count", 0);
        }
    }

    // ----------------------- Consommation mensuelle (M .. M-n) --------------

    /**
     * Conso mensuelle consolidee (equivalent boite) par produit effectif.
     * Cle = id produit (parent), valeur = tableau [mois courant, M-1, ... M-(months-1)].
     * Si produitId != null, restreint a ce produit.
     */
    private Map<String, long[]> monthlyConso(String produitId, int months) {
        int monthsBack = Math.max(0, months - 1);
        String emplacement = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        StringBuilder sql = new StringBuilder()
                .append("SELECT t.eff_id, t.m_index, SUM(t.qty_equiv) FROM (")
                .append("SELECT CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' ")
                .append("THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id, ")
                .append("((YEAR(CURDATE())*12+MONTH(CURDATE())) - (YEAR(p.dt_UPDATED)*12+MONTH(p.dt_UPDATED))) AS m_index, ")
                .append("CASE WHEN f.bool_DECONDITIONNE=1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID<>'' ")
                .append("THEN pd.int_QUANTITY/COALESCE(NULLIF(parent.int_NUMBERDETAIL,0),1) ELSE pd.int_QUANTITY END AS qty_equiv ")
                .append("FROM t_preenregistrement p ")
                .append("JOIN t_user u ON p.lg_USER_ID=u.lg_USER_ID ")
                .append("JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID ")
                .append("JOIN t_famille f ON pd.lg_FAMILLE_ID=f.lg_FAMILLE_ID ")
                .append("LEFT JOIN t_famille parent ON parent.lg_FAMILLE_ID=f.lg_FAMILLE_PARENT_ID ")
                .append("WHERE p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0 AND p.lg_TYPE_VENTE_ID<>'5' ")
                .append("AND u.lg_EMPLACEMENT_ID=?1 ")
                .append("AND p.dt_UPDATED >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ?2 MONTH),'%Y-%m-01')")
                .append(") t WHERE t.m_index BETWEEN 0 AND ?3");
        if (produitId != null) {
            sql.append(" AND t.eff_id = ?4");
        }
        sql.append(" GROUP BY t.eff_id, t.m_index");

        Map<String, long[]> map = new HashMap<>();
        try {
            Query q = em.createNativeQuery(sql.toString());
            q.setParameter(1, emplacement);
            q.setParameter(2, monthsBack);
            q.setParameter(3, monthsBack);
            if (produitId != null) {
                q.setParameter(4, produitId);
            }
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
        try {
            TFamille f = em.find(TFamille.class, produitId);
            if (f != null) {
                libelle = nz(f.getStrNAME());
            }
        } catch (Exception e) {
            // ignore
        }
        Map<String, long[]> map = monthlyConso(produitId, months);
        long[] arr = map.getOrDefault(produitId, new long[months]);
        JSONArray data = new JSONArray();
        for (int i = 0; i < months; i++) {
            String label = (i == 0) ? "Mois courant (M)" : ("M-" + i);
            data.put(new JSONObject().put("mois", label).put("conso", arr[i]));
        }
        return new JSONObject().put("success", true).put("produitId", produitId).put("libelle", libelle)
                .put("data", data);
    }
}
