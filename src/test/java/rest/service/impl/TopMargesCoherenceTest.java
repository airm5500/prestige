package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.report.excel.AnalyseMargesExcel;

/**
 * Plan du 19/11, point 13 : produits et familles qui apportent le plus de marge (tableau de bord et onglet Analyse),
 * sur 3 000 periodes tirees au hasard (graine fixe ; 0 a 300 produits, quantites 1 a 40, remises, TVA 0 ou 18 %, marges
 * negatives, ex aequo, produits sans famille) :
 * <ul>
 * <li>marge = CA HT − achat, CA HT = TTC − remise − TVA ; taux de marque = marge / HT, taux de marge = marge / achat (0
 * si base nulle) ;</li>
 * <li>produits : marge decroissante, a marge egale par nom ; les n premiers ; aucun produit perdu ni double ;</li>
 * <li>familles : somme des produits de la famille (toutes familles = tous produits) ; les n premieres par marge ;</li>
 * <li>Excel : une ligne par produit et par famille de l'ecran, memes montants, meme ordre.</li>
 * </ul>
 */
class TopMargesCoherenceTest {

    private static final String[] FAMILLES = { null, "F1", "F2", "F3", "F4", "F5" };

    @Test
    void produitsEtFamilles() {
        Random r = new Random(20261119L);
        int exAequo = 0;
        int negatives = 0;
        for (int cas = 0; cas < 3000; cas++) {
            int nb = r.nextInt(301);
            List<Object[]> lignes = new ArrayList<>();
            Map<String, long[]> parFamille = new HashMap<>();
            long totalMarge = 0;
            for (int i = 0; i < nb; i++) {
                long qte = 1 + r.nextInt(40);
                long pu = 50 + r.nextInt(20000);
                long ttc = qte * pu;
                long remise = r.nextInt(5) == 0 ? ttc * r.nextInt(15) / 100 : 0;
                long tva = r.nextBoolean() ? Math.round((ttc - remise) * 18.0 / 118) : 0;
                long achat = r.nextInt(10) == 0 ? 0 : qte * (long) (pu * (0.5 + r.nextDouble() * 0.7));
                if (r.nextInt(30) == 0 && !lignes.isEmpty()) {
                    /* meme marge qu'un produit deja tire */
                    Object[] autre = lignes.get(r.nextInt(lignes.size()));
                    ttc = (long) autre[6];
                    remise = (long) autre[7];
                    tva = (long) autre[8];
                    achat = (long) autre[9];
                    exAequo++;
                }
                String fam = FAMILLES[r.nextInt(FAMILLES.length)];
                lignes.add(new Object[] { "P" + i, "PRODUIT " + (char) ('A' + r.nextInt(26)) + i, "CIP" + i, fam,
                        fam == null ? "(sans famille)" : "Famille " + fam, qte, ttc, remise, tva, achat });
                long ht = ttc - remise - tva;
                negatives += ht - achat < 0 ? 1 : 0;
                totalMarge += ht - achat;
                long[] t = parFamille.computeIfAbsent(fam == null ? "" : fam, k -> new long[2]);
                t[0] += ht - achat;
                t[1] += ht;
            }
            String ici = "cas " + cas;
            int n = 1 + r.nextInt(25);
            JSONArray p = AnalyseMargesService.produits(lignes, n);
            assertEquals(Math.min(n, nb), p.length(), ici);
            JSONArray tous = AnalyseMargesService.produits(lignes, Integer.MAX_VALUE);
            assertEquals(nb, tous.length(), ici + " : aucun produit perdu");
            long somme = 0;
            java.util.Set<String> ids = new java.util.HashSet<>();
            for (int i = 0; i < tous.length(); i++) {
                JSONObject x = tous.getJSONObject(i);
                assertEquals(x.getLong("ht") - x.getLong("achat"), x.getLong("marge"), ici);
                assertEquals(AnalyseMargesService.taux(x.getLong("marge"), x.getLong("ht")), x.getDouble("tauxMarque"),
                        1e-9, ici);
                assertEquals(AnalyseMargesService.taux(x.getLong("marge"), x.getLong("achat")),
                        x.getDouble("tauxMarge"), 1e-9, ici);
                somme += x.getLong("marge");
                assertTrue(ids.add(x.getString("id")), ici + " : produit en double");
                if (i > 0) {
                    JSONObject y = tous.getJSONObject(i - 1);
                    assertTrue(
                            y.getLong("marge") > x.getLong("marge") || y.getLong("marge") == x.getLong("marge")
                                    && y.getString("libelle").compareTo(x.getString("libelle")) <= 0,
                            ici + " : ordre " + i);
                }
                if (i < p.length()) {
                    assertEquals(x.toString(), p.getJSONObject(i).toString(), ici + " : les n premiers");
                }
            }
            assertEquals(totalMarge, somme, ici + " : somme des marges");

            JSONArray f = AnalyseMargesService.familles(lignes, 100);
            assertEquals(parFamille.size(), f.length(), ici);
            long sommeF = 0;
            for (int i = 0; i < f.length(); i++) {
                JSONObject x = f.getJSONObject(i);
                String cle = "(sans famille)".equals(x.getString("libelle")) ? "" : x.getString("libelle").substring(8);
                assertEquals(parFamille.get(cle)[0], x.getLong("marge"), ici + " : famille " + cle);
                assertEquals(parFamille.get(cle)[1], x.getLong("ht"), ici + " : famille " + cle);
                sommeF += x.getLong("marge");
                if (i > 0) {
                    assertTrue(f.getJSONObject(i - 1).getLong("marge") >= x.getLong("marge"), ici);
                }
            }
            assertEquals(totalMarge, sommeF, ici + " : familles = produits");
            assertEquals(Math.min(3, parFamille.size()), AnalyseMargesService.familles(lignes, 3).length(), ici);

            /* Excel : memes lignes que l'ecran */
            JSONObject analyse = new JSONObject().put("debut", "2026-11-01").put("fin", "2026-11-19")
                    .put("courante",
                            AnalyseMargesService.indicateurs(1000, 0, 0, 600).put("debut", "2026-11-01").put("fin",
                                    "2026-11-19"))
                    .put("precedente",
                            AnalyseMargesService.indicateurs(900, 0, 0, 500).put("debut", "2026-10-13").put("fin",
                                    "2026-10-31"))
                    .put("familles", AnalyseMargesService.familles(lignes, 15)).put("produits", p);
            List<Object[]> xl = AnalyseMargesExcel.lignes(analyse);
            int k = 2 + Math.min(15, parFamille.size());
            assertEquals(k + p.length(), xl.size(), ici + " : lignes Excel");
            for (int i = 0; i < p.length(); i++) {
                Object[] e = xl.get(k + i);
                JSONObject x = p.getJSONObject(i);
                assertEquals(AnalyseMargesExcel.PRODUIT, e[0], ici);
                assertEquals(x.getString("libelle") + " (" + x.getString("cip") + ")", e[1], ici);
                assertEquals(x.getLong("quantite"), e[2], ici);
                assertEquals(x.getLong("marge"), e[5], ici);
            }
        }
        assertTrue(exAequo > 1000, "ex aequo essayes : " + exAequo);
        assertTrue(negatives > 100, "marges negatives essayees : " + negatives);
    }
}
