package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Demande 68 : la carte TVA reprend la statistique TVA sans rien perdre. Sur 10 000 reponses tirees au hasard (graine
 * fixe) : une ligne par taux, triee ; pour chaque taux, ht, tva et ttc = somme des lignes de ce taux ; totaux egaux ;
 * reponse vide ou absente : data vide.
 */
class TvaTableauBordCoherenceTest {

    @Test
    void reglesSurDesReponsesTireesAuHasard() {
        Random r = new Random(68L);
        int[] taux = { 0, 9, 18 };
        for (int cas = 0; cas < 10_000; cas++) {
            JSONArray lignes = new JSONArray();
            Map<Integer, long[]> attendu = new HashMap<>();
            int n = r.nextInt(7);
            for (int i = 0; i < n; i++) {
                int t = taux[r.nextInt(taux.length)];
                long ttc = r.nextInt(5) == 0 ? 0 : r.nextInt(50_000_000);
                long ht = (long) Math.ceil(ttc / (1 + t / 100.0));
                long tva = ttc - ht;
                // forme reelle de TvaDTO (JSONPropertyName) ; une fois sur dix, les noms Java
                lignes.put(r.nextInt(10) == 0
                        ? new JSONObject().put("taux", t).put("montantHt", ht).put("montantTva", tva).put("montantTtc",
                                ttc)
                        : new JSONObject().put("TAUX", t).put("Total HT", ht).put("Total TVA", tva)
                                .put("Total TTC", ttc).put("montantUg", 0));
                long[] a = attendu.computeIfAbsent(t, k -> new long[3]);
                a[0] += ht;
                a[1] += tva;
                a[2] += ttc;
            }
            JSONArray data = TvaTableauBord.convertir(new JSONObject().put("total", n).put("data", lignes))
                    .getJSONArray("data");
            assertEquals(attendu.size(), data.length(), "une ligne par taux");
            long precedent = -1;
            for (int i = 0; i < data.length(); i++) {
                JSONObject o = data.getJSONObject(i);
                int t = o.getInt("taux");
                assertTrue(t > precedent, "tri par taux");
                precedent = t;
                long[] a = attendu.get(t);
                assertEquals(a[0], o.getLong("ht"));
                assertEquals(a[1], o.getLong("tva"));
                assertEquals(a[2], o.getLong("ttc"));
                assertEquals(o.getLong("ttc"), o.getLong("ht") + o.getLong("tva"), "ttc = ht + tva");
            }
        }
        assertEquals(0, TvaTableauBord.convertir(null).getJSONArray("data").length());
        assertEquals(0, TvaTableauBord.convertir(new JSONObject().put("total", 0)).getJSONArray("data").length());
    }
}
