package rest.report.excel;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 19/11, point 13 : Excel de l'onglet « Analyse » des marges, construit sur le meme JSON que l'ecran et que
 * l'impression, dans le meme ordre : comparaisons (periode choisie, precedente, moyennes 3 et 6 mois), six derniers
 * mois, familles, produits qui apportent le plus de marge.
 * <p>
 * Colonnes : rubrique, libelle, quantite (produits), CA HT, achat, marge, taux de marque, taux de marge.
 */
public final class AnalyseMargesExcel {

    public static final String COMPARAISON = "Comparaison";
    public static final String MOIS = "Mois";
    public static final String FAMILLE = "Famille";
    public static final String PRODUIT = "Produit";
    private static final String[] NOMS_MOIS = { "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août",
            "sept.", "oct.", "nov.", "déc." };

    private AnalyseMargesExcel() {
    }

    private static String fr(String iso) {
        return iso == null || iso.length() < 10 ? ""
                : iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }

    private static Object[] ligne(String rubrique, String libelle, Object quantite, JSONObject p) {
        return new Object[] { rubrique, libelle, quantite, p.optLong("ht"), p.optLong("achat"), p.optLong("marge"),
                p.optDouble("tauxMarque", 0), p.optDouble("tauxMarge", 0) };
    }

    /** Lignes de l'Excel, dans l'ordre de l'ecran. */
    public static List<Object[]> lignes(JSONObject o) {
        List<Object[]> l = new ArrayList<>();
        JSONObject c = o.getJSONObject("courante");
        JSONObject pr = o.getJSONObject("precedente");
        l.add(ligne(COMPARAISON, "Période choisie (" + fr(c.optString("debut")) + " – " + fr(c.optString("fin")) + ")",
                "", c));
        l.add(ligne(COMPARAISON,
                "Période précédente (" + fr(pr.optString("debut")) + " – " + fr(pr.optString("fin")) + ")", "", pr));
        if (o.has("moyenne3")) {
            l.add(ligne(COMPARAISON, "Moyenne mensuelle des 3 derniers mois", "", o.getJSONObject("moyenne3")));
            l.add(ligne(COMPARAISON, "Moyenne mensuelle des 6 derniers mois", "", o.getJSONObject("moyenne6")));
        }
        JSONArray mois = o.optJSONArray("mois");
        for (int i = 0; mois != null && i < mois.length(); i++) {
            JSONObject m = mois.getJSONObject(i);
            String[] am = m.optString("mois").split("-");
            l.add(ligne(MOIS, NOMS_MOIS[Integer.parseInt(am[1]) - 1] + " " + am[0]
                    + (m.optBoolean("partiel") ? " (en cours)" : ""), "", m));
        }
        JSONArray familles = o.optJSONArray("familles");
        for (int i = 0; familles != null && i < familles.length(); i++) {
            JSONObject f = familles.getJSONObject(i);
            l.add(ligne(FAMILLE, f.optString("libelle"), "", f));
        }
        JSONArray produits = o.optJSONArray("produits");
        for (int i = 0; produits != null && i < produits.length(); i++) {
            JSONObject p = produits.getJSONObject(i);
            l.add(ligne(PRODUIT,
                    p.optString("libelle") + (p.optString("cip").isEmpty() ? "" : " (" + p.optString("cip") + ")"),
                    p.optLong("quantite"), p));
        }
        return l;
    }

    /** 25.0 -> « 25 », 33.33 -> « 33,33 ». */
    static String pct(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v).replace('.', ',');
    }

    public static byte[] construire(JSONObject o) throws IOException {
        JSONObject obj = o.optJSONObject("objectifs");
        return new ClasseurExcel<Object[]>("Analyse des marges").titre("ANALYSE DES MARGES")
                .critere("Période", fr(o.optString("debut")) + " au " + fr(o.optString("fin")))
                .critere("Objectifs",
                        obj == null ? ""
                                : "taux de marque ≥ " + pct(obj.optDouble("tauxMarque")) + " % · taux de marge ≥ "
                                        + pct(obj.optDouble("tauxMarge")) + " %")
                .texte("Rubrique", x -> x[0]).texte("Libellé", x -> x[1]).nombre("Quantité", x -> x[2])
                .nombre("CA HT", x -> x[3]).nombre("Achat", x -> x[4]).nombre("Marge", x -> x[5])
                .nombre("Taux de marque (%)", x -> x[6]).nombre("Taux de marge (%)", x -> x[7]).construire(lignes(o));
    }
}
