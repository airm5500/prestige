package rest.service.impl;

import commonTasks.dto.AbcProduitDTO;
import dal.TClasseAbc;
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
import java.io.ByteArrayOutputStream;
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
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;

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

    private static final String[] EXPORT_HEADERS = { "CIP", "EAN", "Libellé", "Classe", "Famille", "Rayon",
            "Code Geo", "Stock", "Seuil", "Qté réappro", "Qté vendue", "CA", "Marge", "Part %", "Cumul %", "Q1", "Q2",
            "Q3", "Unité" };

    @Override
    public byte[] buildExcel(String dtStart, String dtEnd, String type, String classe, String search,
            String codeFamille, String codeRayon, String codeGrossiste, String stockFilter, Integer stockMin,
            Integer stockMax) {
        List<AbcProduitDTO> rows = filteredList(dtStart, dtEnd, type, classe, search, codeFamille, codeRayon,
                codeGrossiste, stockFilter, stockMin, stockMax);
        if (rows.isEmpty()) {
            return new byte[0];
        }
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
        try {
            byte[] raw = csvExportService.createCsvReport(reportTitle(type, classe, dtStart, dtEnd), EXPORT_HEADERS,
                    rows, d -> new String[] { nz(d.getCip()), nz(d.getEan()), nz(d.getLibelle()), nz(d.getClasse()),
                            nz(d.getFamille()), nz(d.getRayon()), nz(d.getCodeGeoArticle()),
                            String.valueOf(d.getStockDisponible()), String.valueOf(d.getSeuilMini()),
                            String.valueOf(d.getQuantiteReappro()), String.valueOf(d.getQuantiteVendue()),
                            String.valueOf(d.getChiffreAffaires()), String.valueOf(d.getMarge()),
                            String.valueOf(d.getPartPourcentage()), String.valueOf(d.getCumulPourcentage()),
                            String.valueOf(d.getQ1() != null ? d.getQ1() : 0),
                            String.valueOf(d.getQ2() != null ? d.getQ2() : 0),
                            String.valueOf(d.getQ3() != null ? d.getQ3() : 0), nz(d.getUniteCalcul()) });
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

        String[] headers = { "CIP", "Libellé", "Cl.", "Famille", "Rayon", "Stock", "Seuil", "Qté vend.", "CA",
                "Marge", "Part %", "Cumul %" };
        float[] widths = { 7f, 20f, 4f, 13f, 12f, 6f, 6f, 7f, 9f, 8f, 6f, 6f };

        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7);
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 7);

            Paragraph title = new Paragraph(reportTitle(type, classe, dtStart, dtEnd), titleFont);
            title.setSpacingAfter(8f);
            document.add(title);

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
                table.addCell(rightCell(String.valueOf(d.getQuantiteVendue()), cellFont));
                table.addCell(rightCell(String.valueOf(d.getChiffreAffaires()), cellFont));
                table.addCell(rightCell(String.valueOf(d.getMarge()), cellFont));
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
}
