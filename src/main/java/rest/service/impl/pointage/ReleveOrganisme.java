package rest.service.impl.pointage;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

/**
 * Pointage des bons (15/11) : lecture du releve telecharge sur la plateforme d'un organisme (facultatif : seulement
 * pour ceux qui en proposent un). Excel (xlsx, xls) ou CSV (separateur ; , ou tabulation).
 *
 * La ligne d'en-tetes est la premiere qui nomme une colonne de numero de bon ; colonnes reconnues (sans accents ni
 * casse) : bon / n bon / numero bon / ref bon ; matricule ; date ; montant / part / net. Chaque ligne donne {bon,
 * matricule, date (aaaa-mm-jj), montant (entier)} ; une ligne sans numero de bon ni montant est ignoree.
 */
public final class ReleveOrganisme {

    private ReleveOrganisme() {
    }

    public static List<Map<String, Object>> lire(byte[] contenu) throws IOException {
        if (contenu == null || contenu.length == 0) {
            throw new IOException("Fichier vide.");
        }
        List<List<String>> lignes = estClasseur(contenu) ? classeur(contenu) : csv(contenu);
        int entete = -1;
        int[] col = null;
        for (int i = 0; i < lignes.size() && entete < 0; i++) {
            int[] c = colonnes(lignes.get(i));
            if (c[0] >= 0) {
                entete = i;
                col = c;
            }
        }
        if (entete < 0) {
            throw new IOException(
                    "Colonne du numéro de bon introuvable (en-tête « N° bon », « Bon » ou « Référence bon »).");
        }
        List<Map<String, Object>> res = new ArrayList<>();
        for (int i = entete + 1; i < lignes.size(); i++) {
            List<String> l = lignes.get(i);
            String bon = valeur(l, col[0]);
            Long montant = montant(valeur(l, col[3]));
            if (bon.isEmpty() && montant == null) {
                continue;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bon", bon);
            m.put("matricule", valeur(l, col[1]));
            m.put("date", date(valeur(l, col[2])));
            m.put("montant", montant);
            res.add(m);
        }
        return res;
    }

    static boolean estClasseur(byte[] b) {
        return b.length > 4 && ((b[0] == 'P' && b[1] == 'K') || ((b[0] & 0xFF) == 0xD0 && (b[1] & 0xFF) == 0xCF));
    }

    private static String valeur(List<String> l, int i) {
        return i < 0 || i >= l.size() || l.get(i) == null ? "" : l.get(i).trim();
    }

    static String simple(String s) {
        String n = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase(Locale.FRANCE).replaceAll("[^a-z0-9]+", " ").trim();
    }

    /** rang des colonnes bon, matricule, date, montant (-1 si absente) */
    static int[] colonnes(List<String> entetes) {
        int[] c = { -1, -1, -1, -1 };
        for (int i = 0; i < entetes.size(); i++) {
            String h = simple(entetes.get(i));
            if (c[0] < 0 && (h.equals("bon") || h.matches("(n|no|num|numero|ref|reference)( de)? bon.*")
                    || h.equals("n bon"))) {
                c[0] = i;
            } else if (c[1] < 0 && h.contains("matricule")) {
                c[1] = i;
            } else if (c[2] < 0 && h.startsWith("date")) {
                c[2] = i;
            } else if (c[3] < 0
                    && (h.startsWith("montant") || h.startsWith("part") || h.equals("net") || h.startsWith("net "))) {
                c[3] = i;
            }
        }
        return c;
    }

    static Long montant(String s) {
        if (s == null) {
            return null;
        }
        String t = s.replaceAll("[\\s\\u00A0\\u202F]", "").replace("CFA", "").replace("F", "");
        if (t.isEmpty()) {
            return null;
        }
        if (t.matches("-?\\d+[.,]\\d{1,2}")) {
            t = t.replace(',', '.');
        } else {
            t = t.replace(",", "").replace(".", "");
        }
        try {
            return Math.round(Double.parseDouble(t));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static String date(String s) {
        if (s == null || s.isEmpty()) {
            return null;
        }
        String t = s.trim().split("[ T]")[0];
        for (String f : new String[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "dd.MM.yyyy",
                "dd/MM/yy" }) {
            try {
                return LocalDate.parse(t, DateTimeFormatter.ofPattern(f)).toString();
            } catch (Exception e) {
                // format suivant
            }
        }
        return null;
    }

    private static List<List<String>> classeur(byte[] contenu) throws IOException {
        List<List<String>> res = new ArrayList<>();
        DataFormatter fmt = new DataFormatter(Locale.FRANCE);
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(contenu))) {
            Sheet f = wb.getSheetAt(0);
            for (Row r : f) {
                List<String> l = new ArrayList<>();
                for (int i = 0; i < Math.max(0, r.getLastCellNum()); i++) {
                    Cell c = r.getCell(i);
                    if (c == null) {
                        l.add("");
                    } else if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c)) {
                        l.add(c.getLocalDateTimeCellValue().toLocalDate().toString());
                    } else if (c.getCellType() == CellType.NUMERIC) {
                        double v = c.getNumericCellValue();
                        l.add(v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v));
                    } else {
                        l.add(fmt.formatCellValue(c));
                    }
                }
                res.add(l);
            }
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("Classeur illisible.");
        }
        return res;
    }

    private static List<List<String>> csv(byte[] contenu) {
        String t = new String(contenu, StandardCharsets.UTF_8);
        if (t.indexOf('�') >= 0) {
            t = new String(contenu, StandardCharsets.ISO_8859_1);
        }
        if (t.startsWith("﻿")) {
            t = t.substring(1);
        }
        String[] lignes = t.split("\\r?\\n");
        String premiere = lignes.length > 0 ? lignes[0] : "";
        char sep = premiere.indexOf(';') >= 0 ? ';' : premiere.indexOf('\t') >= 0 ? '\t' : ',';
        List<List<String>> res = new ArrayList<>();
        for (String l : lignes) {
            List<String> cellules = new ArrayList<>();
            StringBuilder b = new StringBuilder();
            boolean guillemets = false;
            for (int i = 0; i < l.length(); i++) {
                char ch = l.charAt(i);
                if (ch == '"') {
                    if (guillemets && i + 1 < l.length() && l.charAt(i + 1) == '"') {
                        b.append('"');
                        i++;
                    } else {
                        guillemets = !guillemets;
                    }
                } else if (ch == sep && !guillemets) {
                    cellules.add(b.toString());
                    b.setLength(0);
                } else {
                    b.append(ch);
                }
            }
            cellules.add(b.toString());
            res.add(cellules);
        }
        return res;
    }
}
