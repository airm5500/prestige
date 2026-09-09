package rest.report.pdf;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Le recap « part de chaque mode de reglement dans le chiffre d'affaires realise », tel qu'il s'affiche au bas de
 * l'ecran caisse / recette, rendu en une phrase pour le PDF (retour des tests du 09/09, point 2).
 *
 * <p>
 * Lit la reponse du suivi des modes (data, chiffreAffaires, totalMobile, partMobileCa, montantCredit, partCreditCa) :
 * les modes classiques d'abord, puis le mobile money en global avec le detail par operateur, puis le credit.
 * </p>
 */
public final class RecapModesCa {

    private RecapModesCa() {
    }

    public static String texte(JSONObject json) {
        if (json == null) {
            return "";
        }
        long ca = json.optLong("chiffreAffaires", 0L);
        JSONArray modes = json.optJSONArray("data");
        if (ca == 0 && (modes == null || modes.length() == 0)) {
            return "Part des modes de règlement dans le CA : aucune vente sur la période.";
        }
        List<String> morceaux = new ArrayList<>();
        List<String> operateurs = new ArrayList<>();
        for (int i = 0; modes != null && i < modes.length(); i++) {
            JSONObject m = modes.getJSONObject(i);
            if (m.optBoolean("mobile")) {
                operateurs.add(m.optString("mode") + " " + pourcent(m.optDouble("partCa", 0D)));
            } else {
                morceaux.add(m.optString("mode") + " " + pourcent(m.optDouble("partCa", 0D)) + " ("
                        + nombre(m.optLong("montant", 0L)) + ")");
            }
        }
        morceaux.add("Mobile money " + pourcent(json.optDouble("partMobileCa", 0D)) + " ("
                + nombre(json.optLong("totalMobile", 0L))
                + (operateurs.isEmpty() ? "" : " : " + String.join(", ", operateurs)) + ")");
        if (json.optLong("montantCredit", 0L) != 0) {
            morceaux.add("Crédit " + pourcent(json.optDouble("partCreditCa", 0D)) + " ("
                    + nombre(json.optLong("montantCredit", 0L)) + ")");
        }
        return "Part des modes de règlement dans le CA réalisé (" + nombre(ca) + ") : " + String.join(" - ", morceaux);
    }

    private static String pourcent(double valeur) {
        return String.format(Locale.FRANCE, "%.1f %%", valeur);
    }

    private static String nombre(long valeur) {
        return NumberFormat.getIntegerInstance(Locale.FRANCE).format(valeur).replace(' ', ' ').replace(' ', ' ');
    }
}
