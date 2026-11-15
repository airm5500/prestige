package rest.report.excel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retour du 15/11 : export Excel de l'onglet Analyse des perimes.
 *
 * Le classeur est construit A PARTIR DU MEME JSON que l'ecran (AnalysePerimesService.analyser) : ce que l'on voit et ce
 * que l'on exporte ne peuvent pas diverger. Montants, quantites et taux sont de vraies cellules numeriques (le taux en
 * pourcentage, 12,5 pour 12,5 %), l'en-tete est figee et filtrable.
 *
 * Feuilles : Synthese, Emplacements, Produits par valeur, Produits frequents, puis l'evolution par l'intervalle choisi
 * (semaine, mois, trimestre ou annee). Chaque feuille : titre (ligne 1), periode (ligne 2), en-tetes (ligne 4), donnees
 * a partir de la ligne 5.
 *
 * Aucune dependance a JPA ni a JAX-RS : testable sans base.
 */
public final class AnalysePerimesExcel {

    /** Ligne (0-based) des en-tetes de colonnes ; les donnees suivent. */
    public static final int LIGNE_ENTETES = 3;

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private AnalysePerimesExcel() {
    }

    public static String nomFeuillePeriodes(String pas) {
        switch (pas == null ? "" : pas) {
        case "semaine":
            return "Par semaine";
        case "trimestre":
            return "Par trimestre";
        case "annee":
            return "Par année";
        default:
            return "Par mois";
        }
    }

    public static byte[] construire(JSONObject a) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles s = new Styles(wb);
            String periode = "Du " + jour(a.optString("debut")) + " au " + jour(a.optString("fin"));
            JSONObject t = a.optJSONObject("total");
            if (t == null) {
                t = new JSONObject();
            }

            Sheet syn = feuille(wb, s, "Synthèse", periode, "Indicateur", "Valeur");
            int r = LIGNE_ENTETES + 1;
            r = ligne(syn, s, r, "Valeur périmée (prix de vente)", t.optLong("valeur"));
            r = ligne(syn, s, r, "Valeur périmée (prix d'achat)", t.optLong("valeurAchat"));
            r = ligne(syn, s, r, "Chiffre d'affaires de la période", t.optLong("ca"));
            r = lignePct(syn, s, r, "Taux de péremption (%)", t.optDouble("ratio", 0));
            r = lignePct(syn, s, r, "Objectif de taux (%)", a.optDouble("objectif", 0));
            r = ligneTexte(syn, s, r, "Objectif atteint", t.optBoolean("objectifAtteint") ? "Oui" : "Non");
            r = ligne(syn, s, r, "Produits périmés", t.optLong("produits"));
            r = ligne(syn, s, r, "Saisies", t.optLong("saisies"));
            ligne(syn, s, r, "Quantité", t.optLong("quantite"));
            syn.setColumnWidth(0, 34 * 256);
            syn.setColumnWidth(1, 18 * 256);

            Sheet z = feuille(wb, s, "Emplacements", periode, "Emplacement", "Saisies", "Produits", "Quantité",
                    "Valeur (vente)", "Valeur (achat)", "Part (%)");
            JSONArray zones = tableau(a, "zones");
            for (int i = 0; i < zones.length(); i++) {
                JSONObject o = zones.getJSONObject(i);
                Row l = z.createRow(LIGNE_ENTETES + 1 + i);
                texte(l, 0, o.optString("libelle"), s.texte);
                nombre(l, 1, o.optLong("saisies"), s.entier);
                nombre(l, 2, o.optLong("produits"), s.entier);
                nombre(l, 3, o.optLong("quantite"), s.entier);
                nombre(l, 4, o.optLong("valeur"), s.entier);
                nombre(l, 5, o.optLong("valeurAchat"), s.entier);
                nombre(l, 6, o.optDouble("part", 0), s.pct);
            }
            largeurs(z, 30, 10, 10, 10, 16, 16, 10);

            produits(wb, s, "Produits par valeur", periode, tableau(a, "produits"));
            produits(wb, s, "Produits fréquents", periode, tableau(a, "frequents"));

            String pas = a.optString("pas", "mois");
            Sheet p = feuille(wb, s, nomFeuillePeriodes(pas), periode, "Période", "Valeur périmée",
                    "Chiffre d'affaires", "Taux (%)");
            JSONArray periodes = a.optJSONArray("periodes") != null ? tableau(a, "periodes") : tableau(a, "mois");
            for (int i = 0; i < periodes.length(); i++) {
                JSONObject o = periodes.getJSONObject(i);
                Row l = p.createRow(LIGNE_ENTETES + 1 + i);
                texte(l, 0, o.has("periode") ? o.optString("periode") : o.optString("mois"), s.texte);
                nombre(l, 1, o.optLong("valeur"), s.entier);
                nombre(l, 2, o.optLong("ca"), s.entier);
                nombre(l, 3, o.optDouble("ratio", 0), s.pct);
            }
            largeurs(p, 16, 18, 20, 10);

            wb.write(out);
            return out.toByteArray();
        }
    }

    private static void produits(Workbook wb, Styles s, String nom, String periode, JSONArray liste) {
        Sheet f = feuille(wb, s, nom, periode, "CIP", "Produit", "Emplacement", "Fois", "Quantité", "Valeur (vente)",
                "Valeur (achat)", "Part (%)");
        for (int i = 0; i < liste.length(); i++) {
            JSONObject o = liste.getJSONObject(i);
            Row l = f.createRow(LIGNE_ENTETES + 1 + i);
            texte(l, 0, o.optString("cip"), s.texte);
            texte(l, 1, o.optString("libelle"), s.texte);
            texte(l, 2, o.optString("emplacement"), s.texte);
            nombre(l, 3, o.optLong("fois"), s.entier);
            nombre(l, 4, o.optLong("quantite"), s.entier);
            nombre(l, 5, o.optLong("valeur"), s.entier);
            nombre(l, 6, o.optLong("valeurAchat"), s.entier);
            nombre(l, 7, o.optDouble("part", 0), s.pct);
        }
        largeurs(f, 12, 40, 22, 8, 10, 16, 16, 10);
    }

    private static Sheet feuille(Workbook wb, Styles s, String nom, String periode, String... entetes) {
        Sheet f = wb.createSheet(nom);
        texte(f.createRow(0), 0, "Analyse des produits périmés", s.titre);
        texte(f.createRow(1), 0, periode, s.texte);
        Row e = f.createRow(LIGNE_ENTETES);
        for (int i = 0; i < entetes.length; i++) {
            texte(e, i, entetes[i], s.entete);
        }
        f.createFreezePane(0, LIGNE_ENTETES + 1);
        if (entetes.length > 2) {
            f.setAutoFilter(
                    new org.apache.poi.ss.util.CellRangeAddress(LIGNE_ENTETES, LIGNE_ENTETES, 0, entetes.length - 1));
        }
        return f;
    }

    private static int ligne(Sheet f, Styles s, int r, String libelle, long v) {
        Row l = f.createRow(r);
        texte(l, 0, libelle, s.texte);
        nombre(l, 1, v, s.entier);
        return r + 1;
    }

    private static int lignePct(Sheet f, Styles s, int r, String libelle, double v) {
        Row l = f.createRow(r);
        texte(l, 0, libelle, s.texte);
        nombre(l, 1, v, s.pct);
        return r + 1;
    }

    private static int ligneTexte(Sheet f, Styles s, int r, String libelle, String v) {
        Row l = f.createRow(r);
        texte(l, 0, libelle, s.texte);
        texte(l, 1, v, s.texte);
        return r + 1;
    }

    private static JSONArray tableau(JSONObject a, String cle) {
        JSONArray t = a.optJSONArray(cle);
        return t == null ? new JSONArray() : t;
    }

    private static String jour(String iso) {
        try {
            return LocalDate.parse(iso).format(JOUR);
        } catch (RuntimeException e) {
            return iso;
        }
    }

    private static void texte(Row l, int c, String v, CellStyle st) {
        Cell x = l.createCell(c);
        x.setCellValue(v == null ? "" : v);
        x.setCellStyle(st);
    }

    private static void nombre(Row l, int c, double v, CellStyle st) {
        Cell x = l.createCell(c);
        x.setCellValue(v);
        x.setCellStyle(st);
    }

    private static void largeurs(Sheet f, int... l) {
        for (int i = 0; i < l.length; i++) {
            f.setColumnWidth(i, l[i] * 256);
        }
    }

    private static final class Styles {
        final CellStyle titre, entete, texte, entier, pct;

        Styles(Workbook wb) {
            Font gras = wb.createFont();
            gras.setBold(true);
            Font grand = wb.createFont();
            grand.setBold(true);
            grand.setFontHeightInPoints((short) 13);
            titre = wb.createCellStyle();
            titre.setFont(grand);
            entete = wb.createCellStyle();
            entete.setFont(gras);
            entete.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            entete.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            texte = wb.createCellStyle();
            entier = wb.createCellStyle();
            entier.setDataFormat(wb.createDataFormat().getFormat("#,##0"));
            pct = wb.createCellStyle();
            pct.setDataFormat(wb.createDataFormat().getFormat("0.00"));
        }
    }
}
