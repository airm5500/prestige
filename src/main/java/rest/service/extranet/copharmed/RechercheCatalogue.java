package rest.service.extranet.copharmed;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Recherche dans le catalogue Copharmed garde (retour du 08/11, point 1). Le moteur du site ne reconnait que des mots
 * entiers : « esop », un code partiel ou « doliprane 1000 » (le site attend « 1000MG ») ne donnent rien. Ici, chaque
 * mot saisi peut etre un morceau, dans n'importe quel ordre, cherche dans le nom, le code et la DCI, sans tenir compte
 * des accents ni des majuscules. Une ligne est retenue si elle contient tous les mots. Colonnes du catalogue
 * (ListeCopharmed.COPHARMED_CATALOGUE) : Désignation, Code, DCI, Colisage, Prix HT, Taux TVA, Prix TTC, Prix public,
 * Disponibilité, Promotion, Unités gratuites.
 */
public final class RechercheCatalogue {

    static final String[] CHAMPS = { "designation", "code", "dci", "colisage", "prixHT", "remise", "prixNet",
            "prixPublic", "dispo", "promotion", "ug" };

    private RechercheCatalogue() {
    }

    /** Texte sans accents, en minuscules, blancs reduits. */
    public static String normal(String s) {
        if (s == null) {
            return "";
        }
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ").trim();
    }

    /** Mots de la saisie (sans doublon, dans l'ordre). */
    public static List<String> mots(String motif) {
        Set<String> m = new LinkedHashSet<>();
        for (String x : normal(motif).split(" ")) {
            if (!x.isEmpty()) {
                m.add(x);
            }
        }
        return new ArrayList<>(m);
    }

    /** Vrai si le nom, le code ou la DCI de la ligne contiennent chacun des mots (morceaux acceptes). */
    public static boolean correspond(JSONArray cellules, List<String> mots) {
        if (mots.isEmpty()) {
            return false;
        }
        String t = normal(cellules.optString(0, "")) + " " + normal(cellules.optString(1, "")) + " "
                + normal(cellules.optString(2, ""));
        for (String m : mots) {
            if (t.indexOf(m) < 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Lignes du catalogue qui correspondent, au plus {@code max}, dans l'ordre : nom commencant par le premier mot,
     * puis code commencant par le premier mot, puis le reste ; a egalite, ordre du catalogue.
     */
    public static List<JSONObject> chercher(JSONArray lignes, String motif, int max) {
        List<String> m = mots(motif);
        List<JSONObject> debutNom = new ArrayList<>(), debutCode = new ArrayList<>(), autres = new ArrayList<>();
        if (m.isEmpty() || lignes == null) {
            return autres;
        }
        String premier = m.get(0);
        for (int i = 0; i < lignes.length(); i++) {
            JSONObject l = lignes.optJSONObject(i);
            JSONArray c = l == null ? null : l.optJSONArray("cellules");
            if (c == null || !correspond(c, m)) {
                continue;
            }
            JSONObject p = new JSONObject();
            for (int k = 0; k < CHAMPS.length; k++) {
                p.put(CHAMPS[k], c.optString(k, ""));
            }
            if (normal(c.optString(0, "")).startsWith(premier)) {
                debutNom.add(p);
            } else if (normal(c.optString(1, "")).startsWith(premier)) {
                debutCode.add(p);
            } else {
                autres.add(p);
            }
        }
        List<JSONObject> r = new ArrayList<>(debutNom);
        r.addAll(debutCode);
        r.addAll(autres);
        return r.size() > max ? new ArrayList<>(r.subList(0, max)) : r;
    }
}
