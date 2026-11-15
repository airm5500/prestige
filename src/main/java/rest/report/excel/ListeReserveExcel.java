package rest.report.excel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

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

/**
 * Onglet « Liste réserve » (15/11) : export Excel construit a partir du meme JSON que la grille
 * (ListeReserveService.liste). Titre (ligne 1), filtres (ligne 2), en-tetes (ligne 4), donnees a partir de la ligne 5 ;
 * stocks, VMJ, capacite et seuil en cellules numeriques ; valeur absente = cellule vide.
 */
public final class ListeReserveExcel {

    public static final int LIGNE_ENTETES = 3;
    public static final String[] ENTETES = { "CIP", "Désignation", "Emplacement", "Famille", "Grossiste", "Stock rayon",
            "Stock réserve", "VMJ", "En réserve", "Capacité maxi rayon", "Seuil mini rayon" };

    private ListeReserveExcel() {
    }

    public static byte[] construire(JSONObject liste, String filtres) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet f = wb.createSheet("Liste réserve");
            Font gras = wb.createFont();
            gras.setBold(true);
            CellStyle titre = wb.createCellStyle();
            Font grand = wb.createFont();
            grand.setBold(true);
            grand.setFontHeightInPoints((short) 13);
            titre.setFont(grand);
            CellStyle entete = wb.createCellStyle();
            entete.setFont(gras);
            entete.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            entete.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle decimal = wb.createCellStyle();
            decimal.setDataFormat(wb.createDataFormat().getFormat("0.00"));
            CellStyle entierStyle = wb.createCellStyle();
            entierStyle.setDataFormat(wb.createDataFormat().getFormat("0"));

            JSONArray data = liste.optJSONArray("data");
            if (data == null) {
                data = new JSONArray();
            }
            f.createRow(0).createCell(0).setCellValue("LISTE RÉSERVE");
            f.getRow(0).getCell(0).setCellStyle(titre);
            f.createRow(1).createCell(0).setCellValue(filtres + " · " + data.length() + " produit(s)");
            Row h = f.createRow(LIGNE_ENTETES);
            for (int i = 0; i < ENTETES.length; i++) {
                Cell c = h.createCell(i);
                c.setCellValue(ENTETES[i]);
                c.setCellStyle(entete);
            }
            for (int i = 0; i < data.length(); i++) {
                JSONObject l = data.getJSONObject(i);
                Row r = f.createRow(LIGNE_ENTETES + 1 + i);
                r.createCell(0).setCellValue(l.optString("cip"));
                r.createCell(1).setCellValue(l.optString("designation"));
                r.createCell(2).setCellValue(l.optString("emplacement"));
                r.createCell(3).setCellValue(l.optString("famille"));
                r.createCell(4).setCellValue(l.optString("grossiste"));
                nombre(r, 5, l, "stockRayon", entierStyle);
                nombre(r, 6, l, "stockReserve", entierStyle);
                nombre(r, 7, l, "vmj", decimal);
                r.createCell(8).setCellValue(l.optBoolean("enReserve") ? "Oui" : "Non");
                nombre(r, 9, l, "capacite", entierStyle);
                nombre(r, 10, l, "seuilMini", entierStyle);
            }
            f.createFreezePane(0, LIGNE_ENTETES + 1);
            f.setAutoFilter(new CellRangeAddress(LIGNE_ENTETES, LIGNE_ENTETES + Math.max(1, data.length()), 0,
                    ENTETES.length - 1));
            int[] largeurs = { 12, 42, 18, 22, 20, 11, 12, 9, 10, 18, 16 };
            for (int i = 0; i < largeurs.length; i++) {
                f.setColumnWidth(i, largeurs[i] * 256);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static void nombre(Row r, int col, JSONObject l, String cle, CellStyle s) {
        Cell c = r.createCell(col);
        if (l.has(cle) && !l.isNull(cle)) {
            c.setCellValue(l.getDouble(cle));
            c.setCellStyle(s);
        }
    }
}
