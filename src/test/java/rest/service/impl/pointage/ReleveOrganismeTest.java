package rest.service.impl.pointage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

/**
 * Pointage des bons (15/11) : lecture d'un releve d'organisme. Releves tires au hasard (graine fixe) ecrits en CSV
 * (trois separateurs, montants avec espaces, virgules, F CFA) et en Excel, relus ligne par ligne : chaque valeur relue
 * = valeur ecrite.
 */
class ReleveOrganismeTest {

    private static final long GRAINE = 15112026L;

    private static String[] entetes(Random r) {
        String[][] choix = { { "N° bon", "Matricule", "Date", "Montant" },
                { "Numéro de bon", "MATRICULE ASSURE", "Date soins", "Part organisme" },
                { "Référence bon", "Matricule", "Date du bon", "Net" } };
        return choix[r.nextInt(choix.length)];
    }

    @Test
    void csvAuHasard() throws IOException {
        Random r = new Random(GRAINE);
        for (int essai = 0; essai < 300; essai++) {
            char sep = ";,\t".charAt(r.nextInt(3));
            String[] h = entetes(r);
            StringBuilder b = new StringBuilder();
            if (r.nextBoolean()) {
                b.append("Relevé de l'organisme").append(sep).append(sep).append("\n\n");
            }
            b.append(String.join(String.valueOf(sep), h)).append("\r\n");
            int n = r.nextInt(40);
            List<Object[]> attendu = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String bon = "B-" + (10000 + r.nextInt(90000));
                String mat = "M" + r.nextInt(99999);
                int j = 1 + r.nextInt(28), m = 1 + r.nextInt(12);
                long montant = r.nextInt(5) == 0 ? 0 : r.nextInt(500000);
                String texteMontant;
                switch (r.nextInt(4)) {
                case 0:
                    texteMontant = String.valueOf(montant);
                    break;
                case 1:
                    texteMontant = String.format("%,d", montant).replace(',', ' ');
                    break;
                case 2:
                    texteMontant = montant + ",00";
                    break;
                default:
                    texteMontant = "\"" + String.format("%,d", montant).replace(',', ' ') + " F CFA\"";
                }
                String date = String.format("%02d/%02d/2026", j, m);
                b.append(bon).append(sep).append(mat).append(sep).append(date).append(sep).append(texteMontant)
                        .append("\n");
                attendu.add(new Object[] { bon, mat, String.format("2026-%02d-%02d", m, j), montant });
            }
            List<Map<String, Object>> lu = ReleveOrganisme.lire(b.toString().getBytes(StandardCharsets.UTF_8));
            assertEquals(n, lu.size(), "nombre de lignes");
            for (int i = 0; i < n; i++) {
                assertEquals(attendu.get(i)[0], lu.get(i).get("bon"));
                assertEquals(attendu.get(i)[1], lu.get(i).get("matricule"));
                assertEquals(attendu.get(i)[2], lu.get(i).get("date"));
                assertEquals(attendu.get(i)[3], lu.get(i).get("montant"));
            }
        }
    }

    @Test
    void excelAuHasard() throws IOException {
        Random r = new Random(GRAINE + 1);
        for (int essai = 0; essai < 40; essai++) {
            String[] h = entetes(r);
            int n = 1 + r.nextInt(60);
            long[] montants = new long[n];
            try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                Sheet f = wb.createSheet("Bons");
                Row e = f.createRow(2);
                for (int i = 0; i < 4; i++) {
                    e.createCell(i).setCellValue(h[i]);
                }
                for (int i = 0; i < n; i++) {
                    Row l = f.createRow(3 + i);
                    l.createCell(0).setCellValue(r.nextBoolean() ? "B" + i : String.valueOf(70000 + i));
                    l.createCell(1).setCellValue("M" + i);
                    l.createCell(2).setCellValue("0" + (1 + i % 9) + "/11/2026");
                    montants[i] = r.nextInt(300000);
                    l.createCell(3).setCellValue(montants[i]);
                }
                wb.write(out);
                List<Map<String, Object>> lu = ReleveOrganisme.lire(out.toByteArray());
                assertEquals(n, lu.size());
                for (int i = 0; i < n; i++) {
                    assertEquals(montants[i], lu.get(i).get("montant"));
                    assertEquals("2026-11-0" + (1 + i % 9), lu.get(i).get("date"));
                    assertEquals("M" + i, lu.get(i).get("matricule"));
                }
            }
        }
    }

    @Test
    void casLimites() {
        assertThrows(IOException.class, () -> ReleveOrganisme.lire(new byte[0]));
        assertThrows(IOException.class,
                () -> ReleveOrganisme.lire("Nom;Prenom\nA;B\n".getBytes(StandardCharsets.UTF_8)));
        assertEquals(12480L, ReleveOrganisme.montant("12 480"));
        assertEquals(12480L, ReleveOrganisme.montant("12.480"));
        assertEquals(12481L, ReleveOrganisme.montant("12480,50"));
        assertEquals(0L, ReleveOrganisme.montant("0"));
        assertNull(ReleveOrganisme.montant(""));
        assertNull(ReleveOrganisme.montant("abc"));
        assertEquals("2026-11-03", ReleveOrganisme.date("03/11/2026"));
        assertEquals("2026-11-03", ReleveOrganisme.date("2026-11-03T10:42"));
        assertNull(ReleveOrganisme.date("pas une date"));
    }
}
