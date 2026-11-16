package rest.report.excel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.io.ByteArrayInputStream;
import java.util.Random;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 15/11 : le classeur de l'analyse des perimes reprend le JSON de l'ecran, cellule par cellule.
 * <ul>
 * <li>analyses tirees au hasard (graine fixe) : listes vides, une ligne, 50 lignes ; montants nuls ou grands ; taux
 * decimaux ; les quatre intervalles ;</li>
 * <li>chaque montant, quantite et taux est une cellule NUMERIQUE egale a la valeur du JSON, chaque libelle une cellule
 * texte identique ; aucune ligne en trop ni en moins ;</li>
 * <li>somme des valeurs par emplacement = valeur de la synthese quand le jeu est coherent (emplacements =
 * partition).</li>
 * </ul>
 */
class AnalysePerimesExcelCoherenceTest {

    private static final String[] PAS = { "semaine", "mois", "trimestre", "annee" };

    private static JSONObject produit(Random r, int i) {
        return new JSONObject().put("cip", String.valueOf(1000000 + r.nextInt(9000000)))
                .put("libelle", "PRODUIT " + i + (r.nextBoolean() ? " é'\"<&" : ""))
                .put("emplacement", r.nextInt(4) == 0 ? "" : "RAYON " + r.nextInt(9)).put("fois", 1 + r.nextInt(30))
                .put("quantite", 1 + r.nextInt(500)).put("valeur", (long) r.nextInt(5_000_000))
                .put("valeurAchat", (long) r.nextInt(3_000_000))
                .put("part", Math.round(r.nextDouble() * 10000) / 100.0);
    }

    private static JSONObject analyse(Random r) {
        int nz = r.nextInt(4) == 0 ? 0 : 1 + r.nextInt(12);
        JSONArray zones = new JSONArray();
        long valeur = 0, achat = 0, quantite = 0, saisies = 0;
        for (int i = 0; i < nz; i++) {
            long v = r.nextInt(10) == 0 ? 0 : r.nextInt(20_000_000), a = v * r.nextInt(100) / 100,
                    q = 1 + r.nextInt(900), s = 1 + r.nextInt(80);
            valeur += v;
            achat += a;
            quantite += q;
            saisies += s;
            zones.put(new JSONObject().put("libelle", i == 0 ? "(sans emplacement)" : "ZONE " + i).put("saisies", s)
                    .put("produits", 1 + r.nextInt((int) s)).put("quantite", q).put("valeur", v).put("valeurAchat", a)
                    .put("part", 0.0));
        }
        for (int i = 0; i < nz; i++) {
            JSONObject z = zones.getJSONObject(i);
            z.put("part", valeur == 0 ? 0.0 : Math.round(z.getLong("valeur") * 10000.0 / valeur) / 100.0);
        }
        JSONArray produits = new JSONArray(), frequents = new JSONArray(), periodes = new JSONArray();
        int np = nz == 0 ? 0 : r.nextInt(3) == 0 ? 50 : 1 + r.nextInt(20);
        for (int i = 0; i < np; i++) {
            produits.put(produit(r, i));
            frequents.put(produit(r, i + 100));
        }
        for (int i = 0, n = r.nextInt(14); i < n; i++) {
            long v = r.nextInt(2_000_000), ca = r.nextInt(5) == 0 ? 0 : 1 + r.nextInt(900_000_000);
            periodes.put(new JSONObject().put("periode", "2026-" + (i + 1)).put("valeur", v).put("ca", ca).put("ratio",
                    ca == 0 ? 0.0 : Math.round(v * 10000.0 / ca) / 100.0));
        }
        long ca = r.nextInt(5) == 0 ? 0 : 1 + (long) r.nextInt(2_000_000_000);
        double ratio = ca == 0 ? 0 : Math.round(valeur * 10000.0 / ca) / 100.0,
                objectif = 0.01 + r.nextInt(2000) / 100.0;
        JSONObject total = new JSONObject().put("saisies", saisies).put("produits", np).put("quantite", quantite)
                .put("valeur", valeur).put("valeurAchat", achat).put("ca", ca).put("ratio", ratio)
                .put("objectif", objectif).put("objectifAtteint", ratio < objectif);
        return new JSONObject().put("success", true).put("debut", "2026-01-0" + (1 + r.nextInt(9)))
                .put("fin", "2026-11-1" + r.nextInt(6)).put("total", total).put("zones", zones)
                .put("produits", produits).put("frequents", frequents).put("pas", PAS[r.nextInt(4)])
                .put("periodes", periodes).put("objectif", objectif);
    }

    @Test
    void classeurEgalAuJsonDeLEcran() throws Exception {
        Random r = new Random(20261115L);
        for (int essai = 0; essai < 400; essai++) {
            JSONObject a = analyse(r);
            try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(AnalysePerimesExcel.construire(a)))) {
                assertEquals(5, wb.getNumberOfSheets());
                String debut = a.getString("debut"), fin = a.getString("fin");
                String periode = "Du " + debut.substring(8) + "/" + debut.substring(5, 7) + "/" + debut.substring(0, 4)
                        + " au " + fin.substring(8) + "/" + fin.substring(5, 7) + "/" + fin.substring(0, 4);
                for (int f = 0; f < 5; f++) {
                    assertEquals(periode, wb.getSheetAt(f).getRow(1).getCell(0).getStringCellValue());
                }
                JSONObject t = a.getJSONObject("total");
                Sheet syn = wb.getSheet("Synthèse");
                assertNotNull(syn);
                int l = AnalysePerimesExcel.LIGNE_ENTETES + 1;
                nombre(syn, l, 1, t.getLong("valeur"));
                nombre(syn, l + 1, 1, t.getLong("valeurAchat"));
                nombre(syn, l + 2, 1, t.getLong("ca"));
                nombre(syn, l + 3, 1, t.getDouble("ratio"));
                nombre(syn, l + 4, 1, a.getDouble("objectif"));
                assertEquals(t.getBoolean("objectifAtteint") ? "Oui" : "Non",
                        syn.getRow(l + 5).getCell(1).getStringCellValue());
                nombre(syn, l + 6, 1, t.getLong("produits"));
                nombre(syn, l + 7, 1, t.getLong("saisies"));
                nombre(syn, l + 8, 1, t.getLong("quantite"));

                Sheet z = wb.getSheet("Emplacements");
                JSONArray zones = a.getJSONArray("zones");
                assertEquals(zones.length(), lignes(z));
                long somme = 0;
                for (int i = 0; i < zones.length(); i++) {
                    JSONObject o = zones.getJSONObject(i);
                    int k = l + i;
                    assertEquals(o.getString("libelle"), z.getRow(k).getCell(0).getStringCellValue());
                    nombre(z, k, 1, o.getLong("saisies"));
                    nombre(z, k, 2, o.getLong("produits"));
                    nombre(z, k, 3, o.getLong("quantite"));
                    nombre(z, k, 4, o.getLong("valeur"));
                    nombre(z, k, 5, o.getLong("valeurAchat"));
                    nombre(z, k, 6, o.getDouble("part"));
                    somme += (long) z.getRow(k).getCell(4).getNumericCellValue();
                }
                assertEquals(t.getLong("valeur"), somme, "somme des emplacements = valeur de la synthese");

                produits(wb.getSheet("Produits par valeur"), a.getJSONArray("produits"));
                produits(wb.getSheet("Produits fréquents"), a.getJSONArray("frequents"));

                Sheet p = wb.getSheet(AnalysePerimesExcel.nomFeuillePeriodes(a.getString("pas")));
                assertNotNull(p, a.getString("pas"));
                JSONArray periodes = a.getJSONArray("periodes");
                assertEquals(periodes.length(), lignes(p));
                for (int i = 0; i < periodes.length(); i++) {
                    JSONObject o = periodes.getJSONObject(i);
                    assertEquals(o.getString("periode"), p.getRow(l + i).getCell(0).getStringCellValue());
                    nombre(p, l + i, 1, o.getLong("valeur"));
                    nombre(p, l + i, 2, o.getLong("ca"));
                    nombre(p, l + i, 3, o.getDouble("ratio"));
                }
            }
        }
    }

    private static void produits(Sheet f, JSONArray liste) {
        assertNotNull(f);
        assertEquals(liste.length(), lignes(f));
        int l = AnalysePerimesExcel.LIGNE_ENTETES + 1;
        for (int i = 0; i < liste.length(); i++) {
            JSONObject o = liste.getJSONObject(i);
            Row x = f.getRow(l + i);
            assertEquals(o.getString("cip"), x.getCell(0).getStringCellValue());
            assertEquals(o.getString("libelle"), x.getCell(1).getStringCellValue());
            assertEquals(o.getString("emplacement"), x.getCell(2).getStringCellValue());
            nombre(f, l + i, 3, o.getLong("fois"));
            nombre(f, l + i, 4, o.getLong("quantite"));
            nombre(f, l + i, 5, o.getLong("valeur"));
            nombre(f, l + i, 6, o.getLong("valeurAchat"));
            nombre(f, l + i, 7, o.getDouble("part"));
        }
    }

    /** Lignes de donnees (apres les en-tetes) ; la ligne qui suit la derniere n'existe pas. */
    private static int lignes(Sheet f) {
        int n = f.getLastRowNum() - AnalysePerimesExcel.LIGNE_ENTETES;
        assertNull(f.getRow(f.getLastRowNum() + 1));
        return Math.max(n, 0);
    }

    private static void nombre(Sheet f, int ligne, int col, double attendu) {
        Cell c = f.getRow(ligne).getCell(col);
        assertEquals(CellType.NUMERIC, c.getCellType(), f.getSheetName() + " L" + (ligne + 1) + " C" + (col + 1));
        assertEquals(attendu, c.getNumericCellValue(), 1e-9, f.getSheetName() + " L" + (ligne + 1) + " C" + (col + 1));
    }
}
