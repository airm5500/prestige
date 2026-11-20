package rest.service.impl.reserve;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.report.excel.ImportReserveExcel;

/**
 * Plan du 19/11, point 9 : codes en double et codes non retenus d'un import de la liste reserve, sur 5 000 fichiers
 * tires au hasard (graine fixe ; 0 a 80 codes pris dans un petit stock pour provoquer doublons, produits a deux codes,
 * codes partages et inconnus).
 * <ul>
 * <li>chaque code en double apparait une seule fois, dans l'ordre du fichier ; « fois » = lectures dans le fichier ; un
 * code y est si et seulement s'il est lu plusieurs fois ou s'il designe un produit deja reconnu ;</li>
 * <li>le compte de l'ecran se retrouve : somme des (fois - 1) = doublons, codes « meme produit » = memeProduit ;</li>
 * <li>« même produit que » renvoie au code qui a fait reconnaitre ce produit ;</li>
 * <li>lignes de l'Excel (et de l'impression) : inconnus, ambigus, puis en double, aucune perdue, aucune en plus ; le
 * detail dit « lu n fois » et / ou « même produit que ».</li>
 * </ul>
 */
class ImportCodesEnDoubleCoherenceTest {

    @Test
    void enDoubleEtLignesNonRetenues() {
        Random r = new Random(20261119L);
        int avecDoubles = 0;
        int avecMeme = 0;
        int lesDeux = 0;
        for (int cas = 0; cas < 5000; cas++) {
            /* produits : CIP 81000xx, EAN 82000000000xx ; certains EAN partages (ambigus) */
            List<ImportCodesReserve.Produit> produits = new ArrayList<>();
            int n = r.nextInt(12);
            for (int k = 0; k < n; k++) {
                String ean = r.nextInt(3) == 0 ? null : "82000000000" + (10 + r.nextInt(8));
                produits.add(new ImportCodesReserve.Produit("P" + k, "81000" + (10 + k), ean));
            }
            List<String> stock = new ArrayList<>();
            for (int k = 0; k < 14; k++) {
                stock.add("81000" + (10 + k));
            }
            for (int k = 0; k < 8; k++) {
                stock.add("82000000000" + (10 + k));
            }
            stock.add("8999901");
            stock.add("8999902");
            List<String> codes = new ArrayList<>();
            int lus = r.nextInt(81);
            for (int k = 0; k < lus; k++) {
                codes.add(stock.get(r.nextInt(stock.size())));
            }
            ImportCodesReserve.Resultat res = ImportCodesReserve.rapprocher(codes, produits);
            List<ImportCodesReserve.EnDouble> d = ImportCodesReserve.enDouble(codes, res);
            String ici = "cas " + cas;

            Map<String, Integer> fois = new HashMap<>();
            List<String> ordre = new ArrayList<>();
            for (String c : codes) {
                if (fois.merge(c, 1, Integer::sum) == 1) {
                    ordre.add(c);
                }
            }
            Map<String, String> memeProduit = new HashMap<>();
            for (ImportCodesReserve.Reconnu x : res.memeProduit) {
                memeProduit.put(x.code, x.id);
            }
            Map<String, String> premierParId = new HashMap<>();
            for (ImportCodesReserve.Reconnu x : res.reconnus) {
                premierParId.put(x.id, x.code);
            }
            Set<String> vus = new HashSet<>();
            int position = -1;
            int sommeEnTrop = 0;
            int meme = 0;
            boolean double_ = false;
            boolean memeVu = false;
            for (ImportCodesReserve.EnDouble x : d) {
                assertTrue(vus.add(x.code), ici + " : " + x.code + " une seule fois");
                int p = ordre.indexOf(x.code);
                assertTrue(p > position, ici + " : ordre du fichier");
                position = p;
                assertEquals((int) fois.get(x.code), x.fois, ici + " : lectures de " + x.code);
                assertTrue(x.fois > 1 || memeProduit.containsKey(x.code),
                        ici + " : " + x.code + " n'est pas en double");
                sommeEnTrop += x.fois - 1;
                double_ |= x.fois > 1;
                if (x.premierCode != null) {
                    meme++;
                    memeVu = true;
                    assertEquals(memeProduit.get(x.code), x.id, ici);
                    assertEquals(premierParId.get(x.id), x.premierCode, ici + " : meme produit que");
                    assertTrue(!x.premierCode.equals(x.code), ici);
                }
                if (x.id != null) {
                    assertNotNull(premierParId.get(x.id), ici + " : produit reconnu");
                }
            }
            for (Map.Entry<String, Integer> e : fois.entrySet()) {
                if (e.getValue() > 1 || memeProduit.containsKey(e.getKey())) {
                    assertTrue(vus.contains(e.getKey()), ici + " : " + e.getKey() + " manque");
                }
            }
            assertEquals(res.doublons.values().stream().mapToInt(Integer::intValue).sum(), sommeEnTrop,
                    ici + " : somme des lectures en trop = doublons");
            assertEquals(res.memeProduit.size(), meme, ici + " : meme produit");
            avecDoubles += double_ ? 1 : 0;
            avecMeme += memeVu ? 1 : 0;
            lesDeux += double_ && memeVu ? 1 : 0;

            /* lignes de l'Excel et de l'impression, sur le JSON que l'ecran recoit */
            JSONObject json = new JSONObject().put("lus", codes.size()).put("inconnus", new JSONArray(res.inconnus));
            JSONArray ambigus = new JSONArray();
            for (Map.Entry<String, List<String>> e : res.ambigus.entrySet()) {
                ambigus.put(new JSONObject().put("code", e.getKey()).put("produits", new JSONArray(e.getValue())));
            }
            json.put("ambigus", ambigus);
            JSONArray enDouble = new JSONArray();
            for (ImportCodesReserve.EnDouble x : d) {
                enDouble.put(
                        new JSONObject().put("code", x.code).put("designation", x.id == null ? "Code inconnu" : x.id)
                                .put("fois", x.fois).put("memeQue", x.premierCode == null ? "" : x.premierCode));
            }
            json.put("enDouble", enDouble);
            List<String[]> lignes = ImportReserveExcel.lignes(json);
            assertEquals(res.inconnus.size() + res.ambigus.size() + d.size(), lignes.size(), ici + " : lignes");
            int i = 0;
            for (String c : res.inconnus) {
                assertEquals(ImportReserveExcel.INCONNU, lignes.get(i)[0], ici);
                assertEquals(c, lignes.get(i++)[1], ici);
            }
            for (Map.Entry<String, List<String>> e : res.ambigus.entrySet()) {
                assertEquals(ImportReserveExcel.AMBIGU, lignes.get(i)[0], ici);
                assertEquals(e.getKey(), lignes.get(i)[1], ici);
                assertEquals(String.join(" / ", e.getValue()), lignes.get(i++)[2], ici);
            }
            for (ImportCodesReserve.EnDouble x : d) {
                String[] l = lignes.get(i++);
                assertEquals(ImportReserveExcel.EN_DOUBLE, l[0], ici);
                assertEquals(x.code, l[1], ici);
                assertEquals(x.fois > 1, l[3].contains("lu " + x.fois + " fois"), ici + " : " + l[3]);
                assertEquals(x.premierCode != null, l[3].contains("même produit que " + x.premierCode),
                        ici + " : " + l[3]);
                assertTrue(!l[3].isEmpty(), ici);
            }
        }
        assertTrue(avecDoubles > 1000 && avecMeme > 500 && lesDeux > 300,
                "cas varies : doubles " + avecDoubles + ", meme produit " + avecMeme + ", les deux " + lesDeux);
    }
}
