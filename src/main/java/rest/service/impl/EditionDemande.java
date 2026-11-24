package rest.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.TableauPdf;

/**
 * Plan du 21/11, point 15 : impression et export Excel de l'onglet « Analyse de la demande » (Previsions), comme les
 * deux autres onglets. Meme contenu que l'ecran, dans le meme ordre et avec les memes libelles : synthese (les quatre
 * tuiles), matrice annee x mois avec la ligne des indices, produits a anticiper, produits les plus saisonniers. Les
 * chiffres sont mis en forme comme a l'ecran (AnalyseCommande.js : nombre, ind, tendance), pour que le rapprochement
 * ecran / PDF / Excel se fasse a l'identique.
 */
public final class EditionDemande {

    static final String[] MOIS = { "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.",
            "nov.", "déc." };
    static final String[] ENTETES_SYNTHESE = { "Indicateur", "Valeur", "Détail" };
    static final String[] ENTETES_PRODUITS = { "CIP", "Produit", "Unités", "Pic", "Indice du pic", "Force", "" };

    private EditionDemande() {
    }

    /** Nombre entier a la francaise (espace des milliers), comme me.nombre() de l'ecran. */
    static String nombre(long v) {
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.FRANCE);
        s.setGroupingSeparator(' ');
        return new DecimalFormat("#,##0", s).format(v);
    }

    /** Indice a deux decimales avec virgule, « — » si rien n'est vendu (ind() de l'ecran). */
    static String indice(double v, long total) {
        return total == 0 ? "—" : String.format(Locale.ROOT, "%.2f", v).replace('.', ',');
    }

    /** Pourcentage d'evolution comme String(evo) en JavaScript : « 12 », « 12,5 », « -3,4 ». */
    static String decimal(double v) {
        if (v == Math.rint(v) && Math.abs(v) < 1e15) {
            return String.valueOf((long) v);
        }
        return String.valueOf(v).replace('.', ',');
    }

    static String moisLong(String cle) {
        String[] p = String.valueOf(cle == null ? "" : cle).split("-");
        return p.length == 2 ? MOIS[Integer.parseInt(p[1]) - 1] + " " + p[0] : String.valueOf(cle);
    }

    private static double[] indices(JSONObject d) {
        JSONArray a = d.optJSONArray("indices");
        double[] r = new double[12];
        for (int i = 0; a != null && i < 12 && i < a.length(); i++) {
            r[i] = a.optDouble(i, 0);
        }
        return r;
    }

    /** Mois tries par indice decroissant (mois sans vente exclus), tri stable comme Array.sort de l'ecran. */
    private static List<Integer> tri(double[] ind) {
        List<Integer> l = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            if (ind[i] > 0) {
                l.add(i);
            }
        }
        l.sort((a, b) -> Double.compare(ind[b], ind[a]));
        return l;
    }

    private static String noms(List<Integer> mois) {
        StringBuilder s = new StringBuilder();
        for (Integer m : mois) {
            s.append(s.length() == 0 ? "" : ", ").append(MOIS[m]);
        }
        return s.length() == 0 ? "—" : s.toString();
    }

    /** Les quatre tuiles de l'ecran : unites vendues, mois le plus fort, mois les plus faibles, tendance. */
    static List<String[]> synthese(JSONObject d) {
        long total = d.optLong("total");
        double[] ind = indices(d);
        List<Integer> tri = tri(ind);
        List<Integer> sansVente = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            if (ind[i] == 0) {
                sansVente.add(i);
            }
        }
        String faibles;
        if (total == 0) {
            faibles = "—";
        } else if (sansVente.size() > 3) {
            faibles = sansVente.size() + " mois sans vente";
        } else {
            List<Integer> l = new ArrayList<>(sansVente);
            List<Integer> inverse = new ArrayList<>(tri);
            java.util.Collections.reverse(inverse);
            l.addAll(inverse);
            faibles = noms(l.subList(0, Math.min(3, l.size())));
        }
        boolean pic = !d.isNull("pic") && d.optInt("pic") > 0;
        JSONObject t = d.optJSONObject("tendance");
        boolean avecEvo = t != null && t.has("evolution") && !t.isNull("evolution");
        double evo = avecEvo ? t.optDouble("evolution") : 0;
        List<String[]> l = new ArrayList<>();
        l.add(new String[] { "Unités vendues", nombre(total), d.optInt("mois") + " mois complets" });
        l.add(new String[] { "Mois le plus fort", pic ? MOIS[d.optInt("pic") - 1] : "—",
                "pics : " + noms(tri.subList(0, Math.min(3, tri.size()))) });
        l.add(new String[] { "Mois les plus faibles", faibles,
                "force de la saison : " + indice(d.optDouble("force", 0), total) });
        l.add(new String[] { "Tendance sur 12 mois", avecEvo ? (evo > 0 ? "+" : "") + decimal(evo) + " %" : "—",
                t != null && t.has("recent")
                        ? nombre(t.optLong("recent")) + " contre " + nombre(t.optLong("avant")) + " unités"
                        : "sur 24 mois et plus" });
        return l;
    }

    static String[] entetesMatrice() {
        String[] e = new String[14];
        e[0] = "Année";
        System.arraycopy(MOIS, 0, e, 1, 12);
        e[13] = "Total";
        return e;
    }

    /** Matrice annee x mois (vide = mois hors periode) puis la ligne des indices. */
    static List<String[]> matrice(JSONObject d) {
        long total = d.optLong("total");
        List<String[]> l = new ArrayList<>();
        JSONArray annees = d.optJSONArray("annees");
        for (int i = 0; annees != null && i < annees.length(); i++) {
            JSONObject a = annees.getJSONObject(i);
            String[] r = new String[14];
            r[0] = String.valueOf(a.opt("annee"));
            JSONArray m = a.optJSONArray("mois");
            for (int k = 0; k < 12; k++) {
                r[k + 1] = m == null || m.isNull(k) ? "" : nombre(m.optLong(k));
            }
            r[13] = nombre(a.optLong("total"));
            l.add(r);
        }
        double[] ind = indices(d);
        String[] r = new String[14];
        r[0] = "Indice";
        for (int k = 0; k < 12; k++) {
            r[k + 1] = indice(ind[k], total);
        }
        r[13] = "";
        l.add(r);
        return l;
    }

    static List<String[]> produits(JSONArray liste, long total, String vide) {
        List<String[]> l = new ArrayList<>();
        for (int i = 0; liste != null && i < liste.length(); i++) {
            JSONObject p = liste.getJSONObject(i);
            int pic = p.optInt("pic");
            l.add(new String[] { p.isNull("cip") ? "" : p.optString("cip"),
                    p.isNull("libelle") ? "" : p.optString("libelle"), nombre(p.optLong("unites")),
                    pic >= 1 && pic <= 12 ? MOIS[pic - 1] : "", indice(p.optDouble("indicePic", 0), total),
                    indice(p.optDouble("force", 0), total), p.optBoolean("anticiper") ? "À anticiper" : "" });
        }
        if (l.isEmpty()) {
            l.add(new String[] { vide, "", "", "", "", "", "" });
        }
        return l;
    }

    static String titreAnticiper(JSONObject d) {
        int p = d.optInt("prochainMois", 1);
        return "À anticiper : pic de demande en " + MOIS[(p + 11) % 12] + " ou " + MOIS[p % 12];
    }

    static String titreSaisonniers(JSONObject d) {
        return "Produits les plus saisonniers (30 premiers, " + nombre(d.optLong("produitsClasses")) + " classés)";
    }

    private static TableauPdf.Section section(String titre, String[] entetes, float[] largeurs, boolean[] droite,
            List<String[]> lignes) {
        TableauPdf.Section s = new TableauPdf.Section();
        s.titre = titre;
        s.entetes = entetes;
        s.largeurs = largeurs;
        s.droite = droite;
        s.lignes = lignes;
        return s;
    }

    /** Les quatre blocs de l'ecran, dans son ordre. */
    public static List<TableauPdf.Section> sections(JSONObject d) {
        long total = d.optLong("total");
        float[] lm = new float[14];
        boolean[] dm = new boolean[14];
        lm[0] = 6f;
        for (int i = 1; i < 14; i++) {
            lm[i] = 5f;
            dm[i] = true;
        }
        lm[13] = 6f;
        float[] lp = { 6f, 24f, 5f, 4f, 5f, 4f, 6f };
        boolean[] dp = { false, false, true, false, true, true, false };
        List<TableauPdf.Section> s = new ArrayList<>();
        s.add(section("Synthèse", ENTETES_SYNTHESE, new float[] { 8f, 8f, 20f }, new boolean[] { false, true, false },
                synthese(d)));
        s.add(section("Unités vendues par mois et indice saisonnier", entetesMatrice(), lm, dm, matrice(d)));
        s.add(section(titreAnticiper(d), ENTETES_PRODUITS, lp, dp, produits(d.optJSONArray("anticiper"), total,
                "Aucun produit dont le pic arrive dans les deux prochains mois.")));
        s.add(section(titreSaisonniers(d), ENTETES_PRODUITS, lp, dp, produits(d.optJSONArray("produits"), total,
                "Pas assez de ventes pour classer les produits (24 unités au moins sur la période).")));
        return s;
    }

    /** Sous-titre : periode, puis les filtres choisis a l'ecran. */
    public static String sousTitre(JSONObject d, String recherche, String emplacement) {
        StringBuilder s = new StringBuilder("Sur les " + d.optInt("mois") + " derniers mois complets : "
                + moisLong(d.optString("debut")) + " à " + moisLong(d.optString("fin")));
        if (recherche != null && !recherche.trim().isEmpty()) {
            s.append(" · Produit : ").append(recherche.trim());
        }
        if (emplacement != null && !emplacement.trim().isEmpty()) {
            s.append(" · Emplacement : ").append(emplacement.trim());
        }
        return s.toString();
    }

    /**
     * Valeur numerique d'un texte mis en forme (« 12 345 », « 1,25 », « +12,5 % ») ; null si ce n'est pas un nombre.
     */
    static Double valeur(String texte) {
        if (texte == null) {
            return null;
        }
        String t = texte.replace(" ", "").replace(" ", "").replace(" ", "").replace(',', '.');
        if (!t.matches("[+-]?\\d+(\\.\\d+)?")) {
            return null;
        }
        return Double.valueOf(t);
    }

    /** Classeur Excel : une feuille, le titre, le sous-titre, puis chaque bloc (titre, en-tetes, lignes). */
    public static byte[] classeur(String titre, String sousTitre, List<TableauPdf.Section> sections)
            throws IOException {
        try (Workbook wb = new HSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet f = wb.createSheet("Analyse de la demande");
            Font gras = wb.createFont();
            gras.setBold(true);
            CellStyle sTitre = wb.createCellStyle();
            Font grand = wb.createFont();
            grand.setBold(true);
            grand.setFontHeightInPoints((short) 13);
            sTitre.setFont(grand);
            CellStyle sBloc = wb.createCellStyle();
            sBloc.setFont(gras);
            CellStyle sEntete = wb.createCellStyle();
            sEntete.setFont(gras);
            sEntete.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            sEntete.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            int n = 0;
            Row r = f.createRow(n++);
            r.createCell(0).setCellValue(titre);
            r.getCell(0).setCellStyle(sTitre);
            f.createRow(n++).createCell(0).setCellValue(sousTitre);
            int largeur = 0;
            for (TableauPdf.Section s : sections) {
                n++;
                Row t = f.createRow(n++);
                t.createCell(0).setCellValue(s.titre);
                t.getCell(0).setCellStyle(sBloc);
                Row e = f.createRow(n++);
                for (int i = 0; i < s.entetes.length; i++) {
                    Cell c = e.createCell(i);
                    c.setCellValue(s.entetes[i]);
                    c.setCellStyle(sEntete);
                }
                largeur = Math.max(largeur, s.entetes.length);
                for (String[] l : s.lignes) {
                    Row x = f.createRow(n++);
                    for (int i = 0; i < l.length; i++) {
                        Double v = s.droite != null && i < s.droite.length && s.droite[i] ? valeur(l[i]) : null;
                        if (v != null) {
                            x.createCell(i).setCellValue(v);
                        } else {
                            x.createCell(i).setCellValue(l[i] == null ? "" : l[i]);
                        }
                    }
                }
            }
            for (int i = 0; i < largeur; i++) {
                f.autoSizeColumn(i);
            }
            org.apache.poi.ss.usermodel.PrintSetup ps = f.getPrintSetup();
            ps.setLandscape(true);
            ps.setPaperSize(org.apache.poi.ss.usermodel.PrintSetup.A4_PAPERSIZE);
            ps.setFitWidth((short) 1);
            ps.setFitHeight((short) 0);
            f.setFitToPage(true);
            wb.write(out);
            return out.toByteArray();
        }
    }
}
