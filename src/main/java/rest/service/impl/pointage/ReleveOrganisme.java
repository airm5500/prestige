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

import rest.service.impl.ReleveGrossistePdf;
import rest.service.impl.ReleveModele.Cellule;
import rest.service.impl.ReleveModele.LigneBrute;

/**
 * Pointage des bons (15/11) : lecture du releve telecharge sur la plateforme d'un organisme (facultatif : seulement
 * pour ceux qui en proposent un). Excel (xlsx, xls), CSV (separateur ; , ou tabulation) ou PDF (demande du 15/11 : PDF
 * avec du texte ; un PDF scanne n'a pas de texte et l'ecran le dit).
 *
 * La ligne d'en-tetes est la premiere qui nomme une colonne de numero de bon ; colonnes reconnues (sans accents ni
 * casse) : bon / n bon / numero bon / ref bon ; matricule ; date ; montant / part / net. Chaque ligne donne {bon,
 * matricule, date (aaaa-mm-jj), montant (entier)} ; une ligne sans numero de bon ni montant est ignoree.
 *
 * Demande du 15/11 : les colonnes reconnues sont proposees a l'ecran ({@link #analyser}) et l'utilisateur peut en
 * choisir d'autres ({@link #lire(byte[], int[])}).
 */
public final class ReleveOrganisme {

    /** Champs du releve, dans l'ordre des colonnes : n° de bon, matricule, date, montant. */
    public static final String[] CHAMPS = { "bon", "matricule", "date", "montant" };
    static final int APERCU = 8;

    private ReleveOrganisme() {
    }

    /** Tableau lu : en-tetes, rang de la ligne d'en-tetes, lignes de donnees, colonnes reconnues. */
    public static final class Tableau {
        public final List<String> entetes;
        public final List<List<String>> donnees;
        public final int[] colonnes;
        public final String format;

        Tableau(List<String> entetes, List<List<String>> donnees, int[] colonnes, String format) {
            this.entetes = entetes;
            this.donnees = donnees;
            this.colonnes = colonnes;
            this.format = format;
        }
    }

    public static List<Map<String, Object>> lire(byte[] contenu) throws IOException {
        return lire(contenu, null);
    }

    /**
     * Lignes du releve ; colonnes imposees par l'utilisateur (rang pour bon, matricule, date, montant ; -1 = aucune),
     * ou null pour les colonnes reconnues.
     */
    public static List<Map<String, Object>> lire(byte[] contenu, int[] imposees) throws IOException {
        Tableau t = analyser(contenu);
        int[] col = imposees == null ? t.colonnes : imposees;
        verifier(col, t.entetes.size());
        List<Map<String, Object>> res = new ArrayList<>();
        String entete = col[0] >= 0 ? simple(t.entetes.get(col[0])) : null;
        for (List<String> l : t.donnees) {
            String bon = valeur(l, col[0]);
            Long montant = montant(valeur(l, col[3]));
            if (bon.isEmpty() && montant == null) {
                continue;
            }
            if (entete != null && !entete.isEmpty() && simple(bon).equals(entete)) {
                continue; // en-tete repete en haut de chaque page (PDF, export imprime)
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

    /** Il faut le n° de bon, ou a defaut matricule + date + montant (appariement de secours). */
    static void verifier(int[] col, int n) throws IOException {
        if (col == null || col.length != 4) {
            throw new IOException("Colonnes du relevé invalides.");
        }
        for (int c : col) {
            if (c < -1 || c >= n) {
                throw new IOException("Colonne du relevé inexistante.");
            }
        }
        if (col[0] < 0 && (col[1] < 0 || col[2] < 0 || col[3] < 0)) {
            throw new IOException(
                    "Choisissez la colonne du n° de bon, ou à défaut celles du matricule, de la date et du montant.");
        }
    }

    /** En-tetes, colonnes reconnues et lignes de donnees, quel que soit le format. */
    public static Tableau analyser(byte[] contenu) throws IOException {
        if (contenu == null || contenu.length == 0) {
            throw new IOException("Fichier vide.");
        }
        if (estPdf(contenu)) {
            return pdf(contenu);
        }
        boolean classeur = estClasseur(contenu);
        List<List<String>> lignes = classeur ? classeur(contenu) : csv(contenu);
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
            /* aucune colonne de n° de bon reconnue : la premiere ligne non vide sert d'en-tetes, a choisir a l'ecran */
            entete = 0;
            while (entete < lignes.size()
                    && lignes.get(entete).stream().allMatch(x -> x == null || x.trim().isEmpty())) {
                entete++;
            }
            if (entete >= lignes.size()) {
                throw new IOException("Relevé vide.");
            }
            col = colonnes(lignes.get(entete));
        }
        List<String> entetes = nettoyer(lignes.get(entete));
        return new Tableau(entetes, new ArrayList<>(lignes.subList(entete + 1, lignes.size())), col,
                classeur ? "EXCEL" : "CSV");
    }

    private static List<String> nettoyer(List<String> l) {
        List<String> r = new ArrayList<>();
        for (int i = 0; i < l.size(); i++) {
            String v = l.get(i) == null ? "" : l.get(i).trim();
            r.add(v.isEmpty() ? "Colonne " + (i + 1) : v);
        }
        return r;
    }

    static boolean estPdf(byte[] b) {
        return b.length > 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F';
    }

    static boolean estClasseur(byte[] b) {
        return b.length > 4 && ((b[0] == 'P' && b[1] == 'K') || ((b[0] & 0xFF) == 0xD0 && (b[1] & 0xFF) == 0xCF));
    }

    /**
     * PDF : lignes decoupees en cellules par leur position (ReleveGrossistePdf). La ligne d'en-tetes donne les colonnes
     * ; chaque cellule d'une ligne de donnees va a la colonne qu'elle chevauche le plus (a defaut, la plus proche).
     */
    private static Tableau pdf(byte[] contenu) throws IOException {
        List<LigneBrute> brutes;
        try {
            brutes = ReleveGrossistePdf.lignes(new ByteArrayInputStream(contenu));
        } catch (IOException e) {
            throw new IOException("PDF illisible.");
        } catch (RuntimeException e) {
            throw new IOException("PDF illisible.");
        }
        int h = -1;
        for (int i = 0; i < brutes.size() && h < 0; i++) {
            if (colonnes(textes(brutes.get(i)))[0] >= 0) {
                h = i;
            }
        }
        if (h < 0) {
            /* sans en-tete reconnu : la ligne qui a le plus de cellules donne les colonnes */
            int max = 0;
            for (int i = 0; i < brutes.size(); i++) {
                if (brutes.get(i).cellules.size() > max) {
                    max = brutes.get(i).cellules.size();
                    h = i;
                }
            }
        }
        if (h < 0 || brutes.get(h).cellules.isEmpty()) {
            throw new IOException(
                    "Aucun texte dans ce PDF : c'est sans doute une image scannée. Demandez le relevé en Excel, CSV ou PDF texte.");
        }
        List<Cellule> ancres = brutes.get(h).cellules;
        /* en-tete repete en haut des pages suivantes : le titre de page au-dessus n'est pas une ligne du releve */
        String signature = simple(String.join(" ", textes(brutes.get(h))));
        java.util.Set<Integer> pagesAvecEntete = new java.util.HashSet<>();
        for (int i = h + 1; i < brutes.size(); i++) {
            if (simple(String.join(" ", textes(brutes.get(i)))).equals(signature)) {
                pagesAvecEntete.add(brutes.get(i).page);
            }
        }
        java.util.Set<Integer> enteteVu = new java.util.HashSet<>();
        enteteVu.add(brutes.get(h).page);
        List<List<String>> donnees = new ArrayList<>();
        for (int i = h + 1; i < brutes.size(); i++) {
            List<Cellule> cs = brutes.get(i).cellules;
            if (cs.isEmpty()) {
                continue;
            }
            int page = brutes.get(i).page;
            if (simple(String.join(" ", textes(brutes.get(i)))).equals(signature)) {
                enteteVu.add(page);
                continue;
            }
            if (pagesAvecEntete.contains(page) && !enteteVu.contains(page)) {
                continue;
            }
            List<String> l = new ArrayList<>();
            for (int k = 0; k < ancres.size(); k++) {
                l.add("");
            }
            for (Cellule c : cs) {
                int k = colonneDe(ancres, c.x0, c.x1);
                l.set(k, l.get(k).isEmpty() ? c.texte.trim() : l.get(k) + " " + c.texte.trim());
            }
            donnees.add(l);
        }
        List<String> entetes = nettoyer(textes(brutes.get(h)));
        return new Tableau(entetes, donnees, colonnes(entetes), "PDF");
    }

    static int colonneDe(List<Cellule> ancres, float x0, float x1) {
        int meilleure = 0;
        float recouvrement = 0, distance = Float.MAX_VALUE;
        for (int k = 0; k < ancres.size(); k++) {
            Cellule a = ancres.get(k);
            float r = Math.min(a.x1, x1) - Math.max(a.x0, x0);
            if (r > recouvrement) {
                recouvrement = r;
                meilleure = k;
            }
        }
        if (recouvrement > 0) {
            return meilleure;
        }
        float centre = (x0 + x1) / 2;
        for (int k = 0; k < ancres.size(); k++) {
            float d = Math.abs((ancres.get(k).x0 + ancres.get(k).x1) / 2 - centre);
            if (d < distance) {
                distance = d;
                meilleure = k;
            }
        }
        return meilleure;
    }

    private static List<String> textes(LigneBrute l) {
        List<String> t = new ArrayList<>();
        for (Cellule c : l.cellules) {
            t.add(c.texte);
        }
        return t;
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
