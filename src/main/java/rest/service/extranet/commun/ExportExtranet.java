package rest.service.extranet.commun;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Export CSV ou Excel d'une liste d'extranet (retour du 08/11, point 2) : les colonnes et les lignes affichees (ou
 * toutes les lignes gardees) telles que l'ecran les montre. Le nom du grossiste est dans le nom du fichier.
 * <ul>
 * <li>CSV : UTF-8 avec BOM (accents lus par Excel), separateur « ; », guillemets si besoin ;</li>
 * <li>Excel (.xlsx) : texte partout, sauf colonnes de nombres (montant, quantite, taux) dont la valeur est un nombre
 * ecrit simplement ; un code (CIP, EAN, reference) reste toujours du texte, zeros de tete compris.</li>
 * </ul>
 * Rien n'est lu sur l'extranet ni ecrit en base.
 */
public final class ExportExtranet {

    public static final int LIGNES_MAX = 100_000;
    public static final int COLONNES_MAX = 200;
    private static final Pattern NOMBRE = Pattern.compile("-?(0|[1-9]\\d{0,14})(\\.\\d{1,6})?");

    private ExportExtranet() {
    }

    /** Une colonne : son titre et si ses valeurs sont des nombres. */
    public static final class Colonne {
        public final String titre;
        public final boolean nombre;

        public Colonne(String titre, boolean nombre) {
            this.titre = titre == null ? "" : titre;
            this.nombre = nombre;
        }
    }

    /** Demande d'export lue du JSON de l'ecran ; refus (IllegalArgumentException) si incomplete ou trop grande. */
    public static final class Demande {
        public final String format;
        public final String grossiste;
        public final String onglet;
        public final List<Colonne> colonnes = new ArrayList<>();
        public final List<List<String>> lignes = new ArrayList<>();

        public Demande(JSONObject o) {
            format = o.optString("format", "");
            if (!"csv".equals(format) && !"xlsx".equals(format)) {
                throw new IllegalArgumentException("Format inconnu : csv ou xlsx");
            }
            grossiste = o.optString("grossiste", "");
            onglet = o.optString("onglet", "");
            JSONArray c = o.optJSONArray("colonnes");
            JSONArray l = o.optJSONArray("lignes");
            if (c == null || c.length() == 0 || l == null) {
                throw new IllegalArgumentException("Rien à exporter");
            }
            if (c.length() > COLONNES_MAX || l.length() > LIGNES_MAX) {
                throw new IllegalArgumentException("Trop de lignes ou de colonnes pour un export");
            }
            for (int i = 0; i < c.length(); i++) {
                JSONObject x = c.optJSONObject(i);
                colonnes.add(x == null ? new Colonne(c.optString(i, ""), false)
                        : new Colonne(x.optString("titre", ""), x.optBoolean("nombre", false)));
            }
            for (int i = 0; i < l.length(); i++) {
                JSONArray r = l.optJSONArray(i);
                List<String> v = new ArrayList<>(colonnes.size());
                for (int k = 0; k < colonnes.size(); k++) {
                    Object x = r == null ? null : r.opt(k);
                    v.add(x == null || x == JSONObject.NULL ? "" : String.valueOf(x));
                }
                lignes.add(v);
            }
        }
    }

    /** Nom du fichier : Grossiste - Onglet - AAAA-MM-JJ.ext, sans caractere interdit dans un nom de fichier. */
    public static String nomFichier(String grossiste, String onglet, LocalDate jour, String ext) {
        StringBuilder b = new StringBuilder();
        for (String s : new String[] { grossiste, onglet }) {
            String p = propre(s);
            if (!p.isEmpty()) {
                b.append(b.length() > 0 ? " - " : "").append(p);
            }
        }
        if (b.length() == 0) {
            b.append("Extranet");
        }
        return b.append(" - ").append(jour).append('.').append(ext).toString();
    }

    /** Version sans accents du nom (en-tete HTTP filename=) ; le nom exact passe par filename*=UTF-8''. */
    public static String nomAscii(String nom) {
        return Normalizer.normalize(nom, Normalizer.Form.NFD).replaceAll("\\p{M}", "").replaceAll("[^\\x20-\\x7E]",
                "_");
    }

    private static String propre(String s) {
        return s == null ? "" : s.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", " ").replaceAll("\\s+", " ").trim();
    }

    /** Fichier CSV : BOM UTF-8, separateur « ; », fin de ligne CRLF. */
    public static byte[] csv(Demande d) {
        StringBuilder b = new StringBuilder("﻿");
        List<String> titres = new ArrayList<>();
        for (Colonne c : d.colonnes) {
            titres.add(c.titre);
        }
        ligneCsv(b, titres);
        for (List<String> l : d.lignes) {
            ligneCsv(b, l);
        }
        return b.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static void ligneCsv(StringBuilder b, List<String> v) {
        for (int i = 0; i < v.size(); i++) {
            if (i > 0) {
                b.append(';');
            }
            String s = v.get(i) == null ? "" : v.get(i);
            if (s.indexOf(';') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
                b.append('"').append(s.replace("\"", "\"\"")).append('"');
            } else {
                b.append(s);
            }
        }
        b.append("\r\n");
    }

    /**
     * Vrai si la valeur s'ecrit comme un nombre dans Excel (colonne de nombres, valeur simple, pas de zero de tete).
     */
    public static boolean commeNombre(Colonne c, String v) {
        return c.nombre && v != null && NOMBRE.matcher(v).matches();
    }

    /** Classeur Excel (.xlsx) : une feuille, ligne de titres en gras et figee, filtre automatique. */
    public static byte[] xlsx(Demande d) throws IOException {
        SXSSFWorkbook w = new SXSSFWorkbook(200);
        try {
            String nom = propre(d.onglet).replaceAll("[\\[\\]']", " ").trim();
            Sheet f = w.createSheet(nom.isEmpty() ? "Liste" : nom.length() > 31 ? nom.substring(0, 31) : nom);
            CellStyle gras = w.createCellStyle();
            Font fo = w.createFont();
            fo.setBold(true);
            gras.setFont(fo);
            Row t = f.createRow(0);
            for (int k = 0; k < d.colonnes.size(); k++) {
                Cell c = t.createCell(k);
                c.setCellValue(d.colonnes.get(k).titre);
                c.setCellStyle(gras);
            }
            for (int i = 0; i < d.lignes.size(); i++) {
                Row r = f.createRow(i + 1);
                List<String> l = d.lignes.get(i);
                for (int k = 0; k < d.colonnes.size(); k++) {
                    String v = l.get(k);
                    Cell c = r.createCell(k);
                    if (commeNombre(d.colonnes.get(k), v)) {
                        c.setCellValue(Double.parseDouble(v));
                    } else {
                        c.setCellValue(v);
                    }
                }
            }
            f.createFreezePane(0, 1);
            if (!d.lignes.isEmpty()) {
                f.setAutoFilter(
                        new org.apache.poi.ss.util.CellRangeAddress(0, d.lignes.size(), 0, d.colonnes.size() - 1));
            }
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            w.write(o);
            return o.toByteArray();
        } finally {
            w.dispose();
            w.close();
        }
    }
}
