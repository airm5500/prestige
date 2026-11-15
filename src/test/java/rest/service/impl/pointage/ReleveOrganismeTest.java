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

    /**
     * Demande du 15/11 : releve en PDF texte, sur plusieurs pages avec l'en-tete repete en haut de chaque page,
     * colonnes a des positions tirees au hasard. Chaque ligne relue = ligne ecrite ; l'en-tete repete n'est pas une
     * ligne.
     */
    @Test
    void pdfAuHasard() throws Exception {
        Random r = new Random(GRAINE + 2);
        for (int essai = 0; essai < 25; essai++) {
            String[] h = entetes(r);
            int n = 1 + r.nextInt(70);
            float[] x = { 40, 150 + r.nextInt(30), 290 + r.nextInt(30), 430 + r.nextInt(40) };
            List<Object[]> attendu = new ArrayList<>();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            com.itextpdf.text.Document doc = new com.itextpdf.text.Document(com.itextpdf.text.PageSize.A4);
            com.itextpdf.text.pdf.PdfWriter w = com.itextpdf.text.pdf.PdfWriter.getInstance(doc, out);
            doc.open();
            com.itextpdf.text.pdf.BaseFont police = com.itextpdf.text.pdf.BaseFont.createFont(
                    com.itextpdf.text.pdf.BaseFont.HELVETICA, com.itextpdf.text.pdf.BaseFont.WINANSI, false);
            com.itextpdf.text.pdf.PdfContentByte cb = w.getDirectContent();
            float y = 0;
            for (int i = 0; i <= n; i++) {
                if (i == 0 || y < 60) {
                    if (i > 0) {
                        doc.newPage();
                    }
                    y = 780;
                    ecrire(cb, police, 40, y + 25, "RELEVE DES BONS - ORGANISME");
                    for (int k = 0; k < 4; k++) {
                        ecrire(cb, police, x[k], y, h[k]);
                    }
                    y -= 16;
                }
                if (i == n) {
                    break;
                }
                String bon = String.valueOf(100000 + r.nextInt(900000));
                String mat = "M" + r.nextInt(99999);
                int j = 1 + r.nextInt(28), m = 1 + r.nextInt(12);
                long montant = r.nextInt(6) == 0 ? 0 : r.nextInt(400000);
                ecrire(cb, police, x[0], y, bon);
                ecrire(cb, police, x[1], y, mat);
                ecrire(cb, police, x[2], y, String.format("%02d/%02d/2026", j, m));
                ecrire(cb, police, x[3], y, String.format("%,d", montant).replace(',', ' '));
                attendu.add(new Object[] { bon, mat, String.format("2026-%02d-%02d", m, j), montant });
                y -= 14;
            }
            doc.close();
            ReleveOrganisme.Tableau t = ReleveOrganisme.analyser(out.toByteArray());
            assertEquals("PDF", t.format);
            assertEquals(0, t.colonnes[0], "colonne du n° de bon reconnue");
            List<Map<String, Object>> lu = ReleveOrganisme.lire(out.toByteArray());
            assertEquals(n, lu.size(), "nombre de lignes (essai " + essai + ")");
            for (int i = 0; i < n; i++) {
                assertEquals(attendu.get(i)[0], lu.get(i).get("bon"));
                assertEquals(attendu.get(i)[1], lu.get(i).get("matricule"));
                assertEquals(attendu.get(i)[2], lu.get(i).get("date"));
                assertEquals(attendu.get(i)[3], lu.get(i).get("montant"));
            }
        }
    }

    private static void ecrire(com.itextpdf.text.pdf.PdfContentByte cb, com.itextpdf.text.pdf.BaseFont f, float x,
            float y, String t) {
        cb.beginText();
        cb.setFontAndSize(f, 9);
        cb.setTextMatrix(x, y);
        cb.showText(t);
        cb.endText();
    }

    /**
     * Demande du 15/11 : en-tetes inconnus (rien de reconnu) puis colonnes choisies a l'ecran, dans un ordre tire au
     * hasard ; « aucune » (-1) pour le n° de bon = appariement par matricule + date + montant.
     */
    @Test
    void colonnesImposeesAuHasard() throws IOException {
        Random r = new Random(GRAINE + 3);
        for (int essai = 0; essai < 200; essai++) {
            int nbCol = 4 + r.nextInt(3);
            List<Integer> ordre = new ArrayList<>();
            for (int i = 0; i < nbCol; i++) {
                ordre.add(i);
            }
            java.util.Collections.shuffle(ordre, r);
            int[] col = { ordre.get(0), ordre.get(1), ordre.get(2), ordre.get(3) };
            boolean sansBon = r.nextInt(4) == 0;
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < nbCol; i++) {
                b.append(i == 0 ? "" : ";").append("Champ").append(i);
            }
            b.append("\n");
            int n = 1 + r.nextInt(30);
            List<Object[]> attendu = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String[] l = new String[nbCol];
                for (int k = 0; k < nbCol; k++) {
                    l[k] = "x" + r.nextInt(9);
                }
                String bon = "B" + (1000 + i);
                String mat = "M" + r.nextInt(9999);
                int j = 1 + r.nextInt(28);
                long montant = r.nextInt(250000);
                l[col[0]] = bon;
                l[col[1]] = mat;
                l[col[2]] = String.format("%02d/10/2026", j);
                l[col[3]] = String.valueOf(montant);
                b.append(String.join(";", l)).append("\n");
                attendu.add(new Object[] { sansBon ? "" : bon, mat, String.format("2026-10-%02d", j), montant });
            }
            byte[] csv = b.toString().getBytes(StandardCharsets.UTF_8);
            ReleveOrganisme.Tableau t = ReleveOrganisme.analyser(csv);
            assertEquals(-1, t.colonnes[0], "aucune colonne de bon reconnue");
            assertEquals(nbCol, t.entetes.size());
            assertThrows(IOException.class, () -> ReleveOrganisme.lire(csv), "sans colonnes choisies : refus");
            int[] choisies = { sansBon ? -1 : col[0], col[1], col[2], col[3] };
            List<Map<String, Object>> lu = ReleveOrganisme.lire(csv, choisies);
            assertEquals(n, lu.size());
            for (int i = 0; i < n; i++) {
                assertEquals(attendu.get(i)[0], lu.get(i).get("bon"));
                assertEquals(attendu.get(i)[1], lu.get(i).get("matricule"));
                assertEquals(attendu.get(i)[2], lu.get(i).get("date"));
                assertEquals(attendu.get(i)[3], lu.get(i).get("montant"));
            }
        }
        byte[] csv = "a;b;c;d\n1;2;3;4\n".getBytes(StandardCharsets.UTF_8);
        assertThrows(IOException.class, () -> ReleveOrganisme.lire(csv, new int[] { -1, 1, -1, 3 }));
        assertThrows(IOException.class, () -> ReleveOrganisme.lire(csv, new int[] { 9, 1, 2, 3 }));
        assertThrows(IOException.class, () -> ReleveOrganisme.lire(csv, new int[] { 0, 1 }));
        assertThrows(IOException.class, () -> ReleveOrganisme.lire("%PDF-1.4 abimé".getBytes(StandardCharsets.UTF_8)));
    }

    /**
     * Regles de colonneDe, colonnes separees tirees au hasard : une cellule contenue dans une colonne va a cette
     * colonne ; au-dela de la derniere ou en deca de la premiere, a la plus proche ; le rang est toujours valide.
     */
    @Test
    void colonneDeCoherence() {
        Random r = new Random(GRAINE + 4);
        for (int essai = 0; essai < 5000; essai++) {
            int n = 1 + r.nextInt(8);
            List<rest.service.impl.ReleveModele.Cellule> ancres = new ArrayList<>();
            float x = 20 + r.nextInt(30);
            for (int k = 0; k < n; k++) {
                float l = 20 + r.nextInt(100);
                ancres.add(new rest.service.impl.ReleveModele.Cellule("c" + k, x, x + l));
                x += l + 5 + r.nextInt(40);
            }
            int k = r.nextInt(n);
            rest.service.impl.ReleveModele.Cellule a = ancres.get(k);
            float x0 = a.x0 + r.nextFloat() * (a.x1 - a.x0) * 0.4f;
            float x1 = Math.min(a.x1, x0 + 1 + r.nextFloat() * (a.x1 - x0));
            assertEquals(k, ReleveOrganisme.colonneDe(ancres, x0, x1), "cellule contenue");
            float droite = ancres.get(n - 1).x1 + 1 + r.nextInt(200);
            assertEquals(n - 1, ReleveOrganisme.colonneDe(ancres, droite, droite + 10), "au-dela : derniere colonne");
            assertEquals(0, ReleveOrganisme.colonneDe(ancres, 0, ancres.get(0).x0 - 1), "en deca : premiere colonne");
            int q = ReleveOrganisme.colonneDe(ancres, r.nextFloat() * 1000, r.nextFloat() * 1000 + 1000);
            org.junit.jupiter.api.Assertions.assertTrue(q >= 0 && q < n);
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
