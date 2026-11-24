package rest.report.excel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 22/11 (lot 9) : export Excel et CSV des ventes annulees. Sur des centaines de listes tirees au hasard
 * (graine fixe ; vide, une vente, montants nuls, grands montants, textes avec « ; », guillemets, accents, debut « = »)
 * :
 * <ul>
 * <li>une ligne par vente, dans l'ordre de la liste, puis une ligne TOTAL ;</li>
 * <li>chaque cellule = la valeur de la liste ; le montant reste un nombre dans Excel ;</li>
 * <li>TOTAL = somme des montants, et le nombre de ventes ;</li>
 * <li>le CSV redonne les memes valeurs que le classeur (formules neutralisees, montants sans separateur).</li>
 * </ul>
 */
class VentesAnnuleesExportCoherenceTest {

    private static final String[] TEXTES = { "ZZVA Kouassi", "Koné ; Élodie", "N'Guessan \"Paul\"", "=SOMME(A1)", "",
            "Motif : erreur de saisie", "-moins", "@arobase" };

    private static JSONObject vente(Random r, int i) {
        int[] montants = { 0, 1, 995, 12_500, 1_234_567, r.nextInt(50_000) };
        return new JSONObject().put("lgPREENREGISTREMENTID", "V" + i).put("strREF", "ZZVA" + (100000 + i))
                .put("strTYPEVENTE", r.nextBoolean() ? "VNO" : "VO").put("intPRICE", montants[r.nextInt(6)])
                .put("dtCREATED", "2" + r.nextInt(9) + "/11/2026").put("HEUREVENTE", "1" + r.nextInt(9) + ":05:00")
                .put("dateAnnulation", "22/11/2026").put("heureAnnulation", "18:0" + r.nextInt(9))
                .put("userFullName", TEXTES[r.nextInt(TEXTES.length)]).put("userVendeurName", "ZZVA Vendeur")
                .put("userCaissierName", TEXTES[r.nextInt(TEXTES.length)])
                .put("motif", TEXTES[r.nextInt(TEXTES.length)]);
    }

    /** Lecture du CSV : champs entre guillemets, « ; », guillemets doubles. */
    private static List<List<String>> lireCsv(byte[] b) {
        String s = new String(b, StandardCharsets.UTF_8);
        assertTrue(s.startsWith("﻿"), "BOM");
        s = s.substring(1);
        List<List<String>> lignes = new ArrayList<>();
        for (String l : s.split("\r\n")) {
            if (l.isEmpty()) {
                continue;
            }
            List<String> champs = new ArrayList<>();
            int i = 0;
            while (i < l.length()) {
                assertEquals('"', l.charAt(i));
                StringBuilder c = new StringBuilder();
                i++;
                while (true) {
                    char ch = l.charAt(i);
                    if (ch == '"') {
                        if (i + 1 < l.length() && l.charAt(i + 1) == '"') {
                            c.append('"');
                            i += 2;
                            continue;
                        }
                        i++;
                        break;
                    }
                    c.append(ch);
                    i++;
                }
                champs.add(c.toString());
                if (i < l.length()) {
                    assertEquals(';', l.charAt(i));
                    i++;
                }
            }
            lignes.add(champs);
        }
        return lignes;
    }

    private static String neutre(String v) {
        return !v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0 && !v.matches("-?\\d+") ? "'" + v : v;
    }

    @Test
    void excelEtCsvRedonnentLaListeEtSonTotal() throws Exception {
        Random r = new Random(20261122L);
        for (int k = 0; k < 300; k++) {
            int n = k == 0 ? 0 : k == 1 ? 1 : r.nextInt(40);
            List<JSONObject> l = new ArrayList<>();
            long somme = 0;
            for (int i = 0; i < n; i++) {
                JSONObject v = vente(r, i);
                somme += v.getLong("intPRICE");
                l.add(v);
            }
            assertEquals(somme, VentesAnnuleesExport.total(l));
            /* Excel */
            byte[] x = VentesAnnuleesExport.xlsx(l, "01/11/2026 au 22/11/2026", k % 3 == 0 ? "ZZVA" : "", "");
            try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(x))) {
                Sheet sh = wb.getSheetAt(0);
                int entete = -1;
                for (Row row : sh) {
                    Cell c = row.getCell(0);
                    if (c != null && c.getCellType() == CellType.STRING && "Référence".equals(c.getStringCellValue())) {
                        entete = row.getRowNum();
                        break;
                    }
                }
                assertTrue(entete >= 0, "en-tete jeu " + k);
                Row t = sh.getRow(entete);
                for (int c = 0; c < VentesAnnuleesExport.COLONNES.length; c++) {
                    assertEquals(VentesAnnuleesExport.COLONNES[c][0], t.getCell(c).getStringCellValue());
                }
                for (int i = 0; i <= n; i++) {
                    Row row = sh.getRow(entete + 1 + i);
                    JSONObject attendu = i < n ? l.get(i) : null;
                    for (int c = 0; c < VentesAnnuleesExport.COLONNES.length; c++) {
                        String cle = VentesAnnuleesExport.COLONNES[c][1];
                        Cell cell = row.getCell(c);
                        if ("intPRICE".equals(cle)) {
                            assertEquals(CellType.NUMERIC, cell.getCellType(), "montant nombre jeu " + k);
                            assertEquals(attendu == null ? somme : attendu.getLong(cle),
                                    (long) cell.getNumericCellValue(), "montant jeu " + k + " ligne " + i);
                        } else if (attendu != null) {
                            String v = cell == null ? "" : cell.getStringCellValue();
                            assertEquals(attendu.getString(cle), v, "jeu " + k + " ligne " + i + " " + cle);
                        }
                    }
                    if (attendu == null) {
                        assertEquals("TOTAL", row.getCell(0).getStringCellValue());
                        assertEquals(n + " vente(s)", row.getCell(1).getStringCellValue());
                    }
                }
                assertTrue(
                        sh.getRow(entete + n + 2) == null || sh.getRow(entete + n + 2).getCell(0) == null
                                || sh.getRow(entete + n + 2).getCell(0).toString().isEmpty(),
                        "rien apres TOTAL jeu " + k);
            }
            /* CSV : memes valeurs */
            List<List<String>> csv = lireCsv(VentesAnnuleesExport.csv(l));
            assertEquals(n + 2, csv.size(), "lignes csv jeu " + k);
            for (int c = 0; c < VentesAnnuleesExport.COLONNES.length; c++) {
                assertEquals(VentesAnnuleesExport.COLONNES[c][0], csv.get(0).get(c));
            }
            for (int i = 0; i < n; i++) {
                for (int c = 0; c < VentesAnnuleesExport.COLONNES.length; c++) {
                    String cle = VentesAnnuleesExport.COLONNES[c][1];
                    String attendu = "intPRICE".equals(cle) ? String.valueOf(l.get(i).getLong(cle))
                            : neutre(l.get(i).getString(cle));
                    assertEquals(attendu, csv.get(i + 1).get(c), "csv jeu " + k + " ligne " + i + " " + cle);
                }
            }
            List<String> tot = csv.get(n + 1);
            assertEquals("TOTAL", tot.get(0));
            assertEquals(String.valueOf(somme), tot.get(2));
        }
    }
}
