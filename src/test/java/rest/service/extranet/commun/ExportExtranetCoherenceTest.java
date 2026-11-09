package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Export CSV / Excel des listes d'extranet (retour du 08/11, point 2) : le fichier relu redonne exactement les titres
 * et les lignes envoyes (meme nombre, meme ordre, meme texte) ; un nombre n'est ecrit comme nombre que dans une colonne
 * de nombres et s'il s'ecrit simplement ; un code garde ses zeros de tete. Milliers de lignes tirees au hasard (graine
 * fixe).
 */
class ExportExtranetCoherenceTest {

    private static final String[] PIEGES = { "", "0012345", "3400936246983", "1 175", "4342", "-12.5", "0,0%", "a;b",
            "dit \"oui\"", "ligne1\nligne2", "Désignation éèà ç", "1e5", "00", "0", "12.", "  espace  ",
            "Disponible (Livraison en 48 h)", "=" };

    private static String valeur(Random r) {
        switch (r.nextInt(5)) {
        case 0:
            return PIEGES[r.nextInt(PIEGES.length)];
        case 1:
            return String.valueOf(r.nextInt(2_000_000) - 1000);
        case 2:
            return r.nextInt(100) + "." + r.nextInt(100);
        case 3:
            return String.format("%07d", r.nextInt(9_999_999));
        default:
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < 1 + r.nextInt(25); i++) {
                {
                    String alphabet = "AZERTYUIOP éàç;\"'-/";
                    b.append(alphabet.charAt(r.nextInt(alphabet.length())));
                }
            }
            return b.toString();
        }
    }

    private static JSONObject demande(Random r, String format, int n, int c) {
        JSONArray cols = new JSONArray(), lignes = new JSONArray();
        for (int k = 0; k < c; k++) {
            cols.put(new JSONObject().put("titre", "Col " + k + (k % 3 == 0 ? " ; é" : "")).put("nombre",
                    r.nextBoolean()));
        }
        for (int i = 0; i < n; i++) {
            JSONArray l = new JSONArray();
            for (int k = 0; k < c; k++) {
                l.put(valeur(r));
            }
            lignes.put(l);
        }
        return new JSONObject().put("format", format).put("grossiste", "TEDIS")
                .put("onglet", "Notre catalogue produits").put("colonnes", cols).put("lignes", lignes);
    }

    /** Lecteur CSV independant : « ; », guillemets doubles, retours a la ligne dans les guillemets. */
    private static List<List<String>> lireCsv(String s) {
        List<List<String>> r = new ArrayList<>();
        List<String> l = new ArrayList<>();
        StringBuilder v = new StringBuilder();
        boolean dans = false;
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (dans) {
                if (ch == '"' && i + 1 < s.length() && s.charAt(i + 1) == '"') {
                    v.append('"');
                    i++;
                } else if (ch == '"') {
                    dans = false;
                } else {
                    v.append(ch);
                }
            } else if (ch == '"') {
                dans = true;
            } else if (ch == ';') {
                l.add(v.toString());
                v.setLength(0);
            } else if (ch == '\r' && i + 1 < s.length() && s.charAt(i + 1) == '\n') {
                l.add(v.toString());
                v.setLength(0);
                r.add(l);
                l = new ArrayList<>();
                i++;
            } else {
                v.append(ch);
            }
        }
        return r;
    }

    @Test
    void csvRelu_identiqueALEnvoi() {
        Random r = new Random(20261108L);
        int lignes = 0;
        for (int t = 0; t < 40; t++) {
            int n = r.nextInt(200), c = 1 + r.nextInt(12);
            ExportExtranet.Demande d = new ExportExtranet.Demande(demande(r, "csv", n, c));
            byte[] b = ExportExtranet.csv(d);
            assertEquals((byte) 0xEF, b[0]);
            String s = new String(b, StandardCharsets.UTF_8).substring(1);
            List<List<String>> lu = lireCsv(s);
            assertEquals(n + 1, lu.size());
            for (int k = 0; k < c; k++) {
                assertEquals(d.colonnes.get(k).titre, lu.get(0).get(k));
            }
            for (int i = 0; i < n; i++) {
                assertEquals(d.lignes.get(i), lu.get(i + 1), "ligne " + i);
            }
            lignes += n;
        }
        assertTrue(lignes > 3000);
    }

    @Test
    void xlsxRelu_texteEtNombres() throws Exception {
        Random r = new Random(7L);
        int nombres = 0, textes = 0;
        for (int t = 0; t < 12; t++) {
            int n = r.nextInt(400), c = 1 + r.nextInt(10);
            ExportExtranet.Demande d = new ExportExtranet.Demande(demande(r, "xlsx", n, c));
            try (XSSFWorkbook w = new XSSFWorkbook(new ByteArrayInputStream(ExportExtranet.xlsx(d)))) {
                Sheet f = w.getSheetAt(0);
                assertEquals("Notre catalogue produits", f.getSheetName());
                assertEquals(n, f.getLastRowNum());
                for (int k = 0; k < c; k++) {
                    assertEquals(d.colonnes.get(k).titre, f.getRow(0).getCell(k).getStringCellValue());
                }
                for (int i = 0; i < n; i++) {
                    Row row = f.getRow(i + 1);
                    for (int k = 0; k < c; k++) {
                        String v = d.lignes.get(i).get(k);
                        Cell cell = row.getCell(k);
                        if (ExportExtranet.commeNombre(d.colonnes.get(k), v)) {
                            assertEquals(CellType.NUMERIC, cell.getCellType(), v);
                            assertEquals(Double.parseDouble(v), cell.getNumericCellValue(), 0.0, v);
                            nombres++;
                        } else {
                            assertEquals(CellType.STRING, cell.getCellType(), v);
                            assertEquals(v, cell.getStringCellValue());
                            textes++;
                        }
                    }
                }
            }
        }
        assertTrue(nombres > 500 && textes > 500, nombres + " / " + textes);
    }

    @Test
    void regles() {
        ExportExtranet.Colonne nb = new ExportExtranet.Colonne("Prix", true),
                tx = new ExportExtranet.Colonne("CIP", false);
        assertTrue(ExportExtranet.commeNombre(nb, "4342"));
        assertTrue(ExportExtranet.commeNombre(nb, "-12.5"));
        assertFalse(ExportExtranet.commeNombre(nb, "0012345"), "zeros de tete : texte");
        assertFalse(ExportExtranet.commeNombre(nb, "3400936246983000"), "trop long : texte");
        assertFalse(ExportExtranet.commeNombre(nb, "1 175"));
        assertFalse(ExportExtranet.commeNombre(nb, "0,0%"));
        assertFalse(ExportExtranet.commeNombre(tx, "4342"), "colonne de texte : jamais un nombre");
        String nom = ExportExtranet.nomFichier("TEDIS", "Notre catalogue / produits : 1*", LocalDate.of(2026, 11, 9),
                "xlsx");
        assertEquals("TEDIS - Notre catalogue produits 1 - 2026-11-09.xlsx", nom);
        assertEquals("Ubipharm - Derniers releves - 2026-11-09.csv", ExportExtranet
                .nomAscii(ExportExtranet.nomFichier("Ubipharm", "Derniers relevés", LocalDate.of(2026, 11, 9), "csv")));
        assertThrows(IllegalArgumentException.class, () -> new ExportExtranet.Demande(new JSONObject()
                .put("format", "pdf").put("colonnes", new JSONArray().put("a")).put("lignes", new JSONArray())));
        assertThrows(IllegalArgumentException.class,
                () -> new ExportExtranet.Demande(new JSONObject().put("format", "csv")));
        JSONArray trop = new JSONArray();
        for (int i = 0; i <= ExportExtranet.LIGNES_MAX; i++) {
            trop.put(new JSONArray().put("x"));
        }
        assertThrows(IllegalArgumentException.class, () -> new ExportExtranet.Demande(
                new JSONObject().put("format", "csv").put("colonnes", new JSONArray().put("a")).put("lignes", trop)));
        /* ligne plus courte que les colonnes : cases vides, jamais de decalage */
        ExportExtranet.Demande d = new ExportExtranet.Demande(
                new JSONObject().put("format", "csv").put("colonnes", new JSONArray().put("a").put("b").put("c"))
                        .put("lignes", new JSONArray().put(new JSONArray().put("1"))));
        assertEquals("﻿a;b;c\r\n1;;\r\n", new String(ExportExtranet.csv(d), StandardCharsets.UTF_8));
    }
}
