package rest.service.impl;

import dal.TInventaireFamille;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.servlet.http.Part;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONObject;
import rest.service.ImportationInventaire;

@Stateless
public class ImportationInventaireImpl implements ImportationInventaire {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject bulkUpdate(Part part, String idInventaire) throws Exception {
        int count = 0;
        int i = 0;
        JSONObject json = new JSONObject();
        List<String[]> ignoredLines = new ArrayList<>();

        CSVParser parser = new CSVParser(new InputStreamReader(part.getInputStream()), CSVFormat.EXCEL);

        for (CSVRecord cSVRecord : parser) {
            try {
                TInventaireFamille inventaireFamille = findByArticleAndInventaire(cSVRecord.get(0), idInventaire);
                inventaireFamille.setIntNUMBER(Integer.valueOf(cSVRecord.get(1)));
                inventaireFamille.setDtUPDATED(new Date());
                em.merge(inventaireFamille);
                i++;
            } catch (NoResultException e) {
                // Ajouter la ligne ignorée à la liste
                ignoredLines.add(new String[] { cSVRecord.get(0), cSVRecord.get(1), "Code CIP non trouvé" });
            } catch (Exception e) {
                ignoredLines.add(new String[] { cSVRecord.get(0), cSVRecord.get(1), "Erreur: " + e.getMessage() });
            }
            count++;
        }

        // Générer le CSV des lignes ignorées si nécessaire
        if (!ignoredLines.isEmpty()) {
            String ignoredCsv = generateIgnoredLinesCsv(ignoredLines);
            json.put("ignoredCsv", ignoredCsv);
        }

        json.put("count", i);
        json.put("ligne", count);
        json.put("ignored", ignoredLines.size());

        return json;
    }

    @Override
    public JSONObject bulkUpdateWithExcel(Part part, String idInventaire) throws Exception {
        int count = 0;
        int i = 0;
        JSONObject json = new JSONObject();
        List<String[]> ignoredLines = new ArrayList<>();

        Workbook workbook = new HSSFWorkbook(part.getInputStream());

        int num = workbook.getNumberOfSheets();

        for (int j = 0; j < num; j++) {
            Sheet sheet = workbook.getSheetAt(j);
            Iterator<Row> rows = sheet.rowIterator();
            while (rows.hasNext()) {
                if (count > 0) {
                    Row nextrow = rows.next();
                    try {
                        Cell id = nextrow.getCell(1);
                        Cell qty = nextrow.getCell(4);

                        if (id != null && qty != null) {
                            String cipValue = id.getStringCellValue();
                            TInventaireFamille inventaireFamille = findByArticleAndInventaire(cipValue, idInventaire);
                            inventaireFamille.setIntNUMBER(Double.valueOf(qty.getNumericCellValue()).intValue());
                            inventaireFamille.setDtUPDATED(new Date());
                            em.merge(inventaireFamille);
                            i++;
                        }
                    } catch (NoResultException e) {
                        // Ajouter la ligne ignorée à la liste
                        String cipValue = nextrow.getCell(1) != null ? nextrow.getCell(1).toString() : "";
                        String qtyValue = nextrow.getCell(4) != null ? nextrow.getCell(4).toString() : "";
                        ignoredLines.add(new String[] { cipValue, qtyValue, "Code CIP non trouvé" });
                    } catch (Exception e) {
                        String cipValue = nextrow.getCell(1) != null ? nextrow.getCell(1).toString() : "";
                        String qtyValue = nextrow.getCell(4) != null ? nextrow.getCell(4).toString() : "";
                        ignoredLines.add(new String[] { cipValue, qtyValue, "Erreur: " + e.getMessage() });
                    }
                }
                count++;
            }
        }

        // Générer le CSV des lignes ignorées si nécessaire
        if (!ignoredLines.isEmpty()) {
            String ignoredCsv = generateIgnoredLinesCsv(ignoredLines);
            json.put("ignoredCsv", ignoredCsv);
        }

        json.put("count", i);
        json.put("ligne", count - 1);
        json.put("ignored", ignoredLines.size());

        return json;
    }

    private TInventaireFamille findByArticleAndInventaire(String cipArticle, String idInventaire) throws Exception {
        TypedQuery<TInventaireFamille> query = em.createQuery(
                "SELECT DISTINCT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE t.lgINVENTAIREID.lgINVENTAIREID =?1 "
                        + "AND g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID "
                        + "AND (t.lgFAMILLEID.intCIP =?2 OR g.strCODEARTICLE =?2)",
                TInventaireFamille.class);
        query.setFirstResult(0).setMaxResults(1).setParameter(1, idInventaire).setParameter(2, cipArticle);
        return query.getSingleResult();
    }

    private String generateIgnoredLinesCsv(List<String[]> ignoredLines) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Writer writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);

        try (CSVPrinter csvPrinter = new CSVPrinter(writer,
                CSVFormat.EXCEL.withHeader("Code CIP", "Quantité", "Raison de l'échec").withDelimiter(';'))) {

            for (String[] line : ignoredLines) {
                csvPrinter.printRecord((Object[]) line);
            }

            csvPrinter.flush();
        }

        return new String(outputStream.toByteArray(), StandardCharsets.UTF_8);
    }
}