package rest;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Demande 68 : la reponse de la statistique TVA ({@code data} : TAUX, Total HT, Total TVA, Total TTC) ramenee a la
 * forme de la carte de l'accueil : {@code data} = [{taux, ht, tva, ttc}], triee par taux croissant. Les montants sont
 * repris tels quels ; deux lignes d'un meme taux (cas d'une statistique par jour) sont additionnees.
 */
final class TvaTableauBord {

    private TvaTableauBord() {
    }

    /* TvaDTO sort ses montants sous « TAUX », « Total HT », « Total TVA », « Total TTC » (JSONPropertyName) */
    private static long lire(JSONObject o, String nom, String nomJava) {
        return o.has(nom) ? o.optLong(nom, 0) : o.optLong(nomJava, 0);
    }

    static JSONObject convertir(JSONObject brut) {
        JSONArray lignes = brut == null ? null : brut.optJSONArray("data");
        List<long[]> parTaux = new ArrayList<>();
        if (lignes != null) {
            for (int i = 0; i < lignes.length(); i++) {
                JSONObject o = lignes.optJSONObject(i);
                if (o == null) {
                    continue;
                }
                long taux = lire(o, "TAUX", "taux");
                long[] cumul = parTaux.stream().filter(t -> t[0] == taux).findFirst().orElse(null);
                if (cumul == null) {
                    cumul = new long[] { taux, 0, 0, 0 };
                    parTaux.add(cumul);
                }
                cumul[1] += lire(o, "Total HT", "montantHt");
                cumul[2] += lire(o, "Total TVA", "montantTva");
                cumul[3] += lire(o, "Total TTC", "montantTtc");
            }
        }
        parTaux.sort(Comparator.comparingLong(t -> t[0]));
        JSONArray data = new JSONArray();
        for (long[] t : parTaux) {
            data.put(new JSONObject().put("taux", t[0]).put("ht", t[1]).put("tva", t[2]).put("ttc", t[3]));
        }
        return new JSONObject().put("data", data);
    }
}
