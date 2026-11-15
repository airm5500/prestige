package rest.report.excel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;

import commonTasks.dto.LignePointageBonDTO;

/**
 * Pointage des bons (15/11) : Excel complet de la periode, un bon par ligne, avec ses six controles. Titre (ligne 1),
 * organisme et periode (ligne 2), compteurs (ligne 3), en-tetes (ligne 5), donnees a partir de la ligne 6.
 */
public final class PointageBonsExcel {

    public static final int LIGNE_ENTETES = 4;
    public static final String[] ENTETES = { "N° bon", "Date vente", "Ordonnance", "Matricule", "Assuré", "Ayant droit",
            "Taux", "Part attendue", "Alerte", "Pointage", "Motif", "1 Assuré", "2 Ayant droit", "3 Taux",
            "4 Produits et prix", "5 Montant", "6 Date" };

    private PointageBonsExcel() {
    }

    public static byte[] construire(List<JSONObject> bons, String entete, String compteurs) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet f = wb.createSheet("Pointage des bons");
            Font gras = wb.createFont();
            gras.setBold(true);
            CellStyle st = wb.createCellStyle();
            st.setFont(gras);
            st.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            st.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle entier = wb.createCellStyle();
            entier.setDataFormat(wb.createDataFormat().getFormat("#,##0"));
            f.createRow(0).createCell(0).setCellValue("POINTAGE DES BONS");
            f.createRow(1).createCell(0).setCellValue(entete);
            f.createRow(2).createCell(0).setCellValue(compteurs);
            Row h = f.createRow(LIGNE_ENTETES);
            for (int i = 0; i < ENTETES.length; i++) {
                Cell c = h.createCell(i);
                c.setCellValue(ENTETES[i]);
                c.setCellStyle(st);
            }
            int n = LIGNE_ENTETES + 1;
            for (JSONObject b : bons) {
                LignePointageBonDTO d = new LignePointageBonDTO(b);
                Row r = f.createRow(n++);
                r.createCell(0).setCellValue(d.getBon());
                r.createCell(1).setCellValue(d.getDateVente());
                r.createCell(2).setCellValue(d.getDateOrdonnance());
                r.createCell(3).setCellValue(d.getMatricule());
                r.createCell(4).setCellValue(d.getAssure());
                r.createCell(5).setCellValue(b.optString("ayantDroit", ""));
                if (!b.isNull("taux")) {
                    r.createCell(6).setCellValue(b.optInt("taux"));
                }
                Cell p = r.createCell(7);
                p.setCellValue(b.optLong("part"));
                p.setCellStyle(entier);
                r.createCell(8).setCellValue(b.isNull("resumeAlerte") ? "" : b.optString("resumeAlerte"));
                r.createCell(9).setCellValue(d.getPointage());
                r.createCell(10).setCellValue(d.getMotif());
                JSONArray ctr = b.optJSONArray("controles");
                for (int i = 0; ctr != null && i < ctr.length(); i++) {
                    JSONObject c = ctr.getJSONObject(i);
                    r.createCell(10 + c.getInt("bloc"))
                            .setCellValue(c.getString("niveau") + " : " + c.getString("texte"));
                }
            }
            f.createFreezePane(1, LIGNE_ENTETES + 1);
            f.setAutoFilter(
                    new CellRangeAddress(LIGNE_ENTETES, Math.max(LIGNE_ENTETES + 1, n - 1), 0, ENTETES.length - 1));
            int[] largeurs = { 14, 16, 12, 14, 26, 22, 7, 12, 40, 20, 30, 30, 26, 26, 30, 44, 34 };
            for (int i = 0; i < largeurs.length; i++) {
                f.setColumnWidth(i, largeurs[i] * 256);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }
}
