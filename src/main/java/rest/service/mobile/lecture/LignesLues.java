package rest.service.mobile.lecture;

import java.util.Locale;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * O5 : nettoyage des lignes renvoyees par un fournisseur (defense en profondeur) : seulement les champs attendus,
 * longueurs bornees, 30 lignes au plus, et lignes qui ressemblent a une donnee personnelle retirees (titre Dr / Mme /
 * Patient / Nom, date, telephone, e-mail).
 */
public final class LignesLues {

    static final int MAX_LIGNES = 30;
    private static final Pattern PERSONNEL = Pattern
            .compile("(?i)(\\b(dr|docteur|mme|madame|mr|monsieur|mlle|patient|patiente|nom|prenom|ne le|nee le|age|tel|"
                    + "telephone|bp|clinique|hopital|cabinet)\\b|@|\\d{1,2}\\s*[/.-]\\s*\\d{1,2}\\s*[/.-]\\s*\\d{2,4}|"
                    + "(\\+?\\d[\\s.-]?){8,})");

    private LignesLues() {
    }

    static String sansAccents(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    static String borne(String s, int max) {
        String t = s == null ? "" : s.replaceAll("[\\r\\n\\t]+", " ").trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    public static boolean personnel(String texte) {
        return PERSONNEL.matcher(sansAccents(texte).toLowerCase(Locale.ROOT)).find();
    }

    public static JSONArray nettoyer(JSONArray brut) {
        JSONArray out = new JSONArray();
        for (int i = 0; brut != null && i < brut.length() && out.length() < MAX_LIGNES; i++) {
            JSONObject l = brut.optJSONObject(i);
            if (l == null) {
                continue;
            }
            String nom = borne(l.optString("nom"), 80);
            if (nom.length() < 2 || personnel(nom)) {
                continue;
            }
            String posologie = borne(l.optString("posologie"), 120);
            if (personnel(posologie)) {
                posologie = "";
            }
            double c = l.optDouble("confiance", 0.5);
            if (Double.isNaN(c)) {
                c = 0.5;
            }
            out.put(new JSONObject().put("nom", nom).put("dosage", borne(l.optString("dosage"), 40))
                    .put("forme", borne(l.optString("forme"), 40)).put("posologie", posologie)
                    .put("quantite", borne(l.optString("quantite"), 20)).put("confiance", Math.max(0, Math.min(1, c))));
        }
        return out;
    }
}
