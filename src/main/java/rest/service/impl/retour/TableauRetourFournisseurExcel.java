package rest.service.impl.retour;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Demande du 29/10 (point 1) : classeur Excel du tableau de bord des retours fournisseurs, une feuille par rubrique
 * (synthese, par mois, produits, motifs, utilisateurs), a partir du JSON de TableauRetourFournisseur.
 */
public final class TableauRetourFournisseurExcel {

    private TableauRetourFournisseurExcel() {
    }

    public static byte[] classeur(JSONObject t, String titre) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Font gras = wb.createFont();
            gras.setBold(true);
            CellStyle entete = wb.createCellStyle();
            entete.setFont(gras);
            JSONObject total = t.optJSONObject("total") == null ? new JSONObject() : t.getJSONObject("total");
            Sheet s = wb.createSheet("Synthèse");
            ligne(s, 0, null, titre);
            ligne(s, 2, entete, "Retours", "Lignes", "Produits", "Qté retournée", "Qté acceptée", "Montant");
            ligne(s, 3, null, total.optInt("retours"), total.optInt("lignes"), total.optInt("produits"),
                    total.optInt("quantite"), total.optInt("acceptee"), total.optLong("montant"));
            feuille(wb, entete, "Par mois", t.optJSONArray("mois"),
                    new String[] { "Mois", "Retours", "Lignes", "Qté retournée", "Qté acceptée", "Montant" },
                    o -> new Object[] { o.optString("mois"), o.optInt("retours"), o.optInt("lignes"),
                            o.optInt("quantite"), o.optInt("acceptee"), o.optLong("montant") });
            feuille(wb, entete, "Produits", t.optJSONArray("produits"),
                    new String[] { "CIP", "Produit", "Retours", "Qté retournée", "Qté acceptée", "Montant" },
                    o -> new Object[] { o.optString("cip"), o.optString("libelle"), o.optInt("retours"),
                            o.optInt("quantite"), o.optInt("acceptee"), o.optLong("montant") });
            feuille(wb, entete, "Motifs", t.optJSONArray("motifs"),
                    new String[] { "Motif", "Lignes", "Qté", "Part (%)" }, o -> new Object[] { o.optString("libelle"),
                            o.optInt("lignes"), o.optInt("quantite"), o.optDouble("part") });
            feuille(wb, entete, "Utilisateurs", t.optJSONArray("utilisateurs"),
                    new String[] { "Utilisateur", "Retours", "Part des retours (%)", "Lignes", "Qté retournée",
                            "Montant" },
                    o -> new Object[] { o.optString("libelle"), o.optInt("retours"), o.optDouble("part"),
                            o.optInt("lignes"), o.optInt("quantite"), o.optLong("montant") });
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static void feuille(XSSFWorkbook wb, CellStyle entete, String nom, JSONArray lignes, String[] titres,
            java.util.function.Function<JSONObject, Object[]> valeurs) {
        Sheet s = wb.createSheet(nom);
        ligne(s, 0, entete, (Object[]) titres);
        if (lignes != null) {
            for (int i = 0; i < lignes.length(); i++) {
                ligne(s, i + 1, null, valeurs.apply(lignes.getJSONObject(i)));
            }
        }
        for (int c = 0; c < titres.length; c++) {
            s.setColumnWidth(c, (c == 0 || "Produit".equals(titres[c]) ? 32 : 16) * 256);
        }
    }

    private static void ligne(Sheet s, int r, CellStyle style, Object... v) {
        Row row = s.createRow(r);
        for (int i = 0; i < v.length; i++) {
            if (v[i] instanceof Number) {
                row.createCell(i).setCellValue(((Number) v[i]).doubleValue());
            } else {
                row.createCell(i).setCellValue(v[i] == null ? "" : String.valueOf(v[i]));
            }
            if (style != null) {
                row.getCell(i).setCellStyle(style);
            }
        }
    }
}
