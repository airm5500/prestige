package rest.service.impl.audit;

import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * AUDIT & RAPPROCHEMENTS, onglet Rapports : colonnes des editions et comparaison de deux rapports. Calcul pur, sans
 * base (AuditRapportsTest).
 * <p>
 * Comparer A (le plus ancien) et B : pour chaque section, les ecarts APPARUS (dans B, pas dans A), DISPARUS (dans A,
 * pas dans B) et le nombre de PERSISTANTS. Un ecart est reconnu d'un rapport a l'autre par sa cle : produit et
 * emplacement pour le stock, caisse, client, depot, code du controle.
 */
public final class AuditRapports {

    /** Colonnes par section : {champ, titre, numerique ("1") ou texte ("")}. Memes colonnes que l'ecran. */
    static final Map<String, String[][]> COLONNES = new LinkedHashMap<>();

    static {
        COLONNES.put("STOCK",
                new String[][] { { "cip", "CIP", "" }, { "libelle", "Produit", "" },
                        { "emplacement", "Emplacement", "" }, { "stockReel", "Stock réel", "1" },
                        { "stockHistorique", "Stock historique", "1" }, { "ecart", "Écart", "1" },
                        { "dernierMouvement", "Dernier mouvement", "" } });
        COLONNES.put("STOCK_NEGATIF", new String[][] { { "cip", "CIP", "" }, { "libelle", "Produit", "" },
                { "emplacement", "Emplacement", "" }, { "stockReel", "Stock", "1" } });
        COLONNES.put("CAISSES_OUVERTES", new String[][] { { "caissier", "Caissier", "" },
                { "ouverture", "Ouverte le", "" }, { "jours", "Jours", "1" } });
        COLONNES.put("BILLETAGE",
                new String[][] { { "caissier", "Caissier", "" }, { "ouverture", "Ouverture", "" },
                        { "fermeture", "Fermeture", "" }, { "attendu", "Attendu", "1" },
                        { "billetage", "Billetage", "1" }, { "ecart", "Écart", "1" } });
        COLONNES.put("DIFFERES",
                new String[][] { { "client", "Client", "" }, { "ventes", "Ventes différées", "1" },
                        { "reglements", "Règlements", "1" }, { "soldeReleve", "Solde du relevé", "1" },
                        { "resteDu", "Reste dû enregistré", "1" }, { "ecart", "Écart", "1" } });
        COLONNES.put("CARNETS",
                new String[][] { { "depot", "Dépôt", "" }, { "solde", "Solde du carnet", "1" },
                        { "ventes", "Ventes", "1" }, { "reglements", "Règlements", "1" }, { "retours", "Retours", "1" },
                        { "soldeCalcule", "Solde calculé", "1" }, { "ecart", "Écart", "1" } });
        COLONNES.put("CONTROLES", new String[][] { { "module", "Module", "" }, { "libelle", "Contrôle", "" },
                { "cas", "Cas", "1" }, { "erreur", "Remarque", "" } });
    }

    private AuditRapports() {
    }

    static String[][] colonnes(String code) {
        return COLONNES.getOrDefault(code, new String[0][]);
    }

    /** Cle d'un ecart, stable d'un rapport a l'autre ; null : la ligne n'est pas un ecart (controle sans cas). */
    static String cle(String code, JSONObject l) {
        switch (code) {
        case "STOCK":
        case "STOCK_NEGATIF":
            return l.optString("produitId") + "|" + l.optString("emplacement");
        case "CAISSES_OUVERTES":
        case "BILLETAGE":
            return l.optString("caisse");
        case "DIFFERES":
            return l.optString("clientId");
        case "CARNETS":
            return l.optString("tiersPayantId");
        case "CONTROLES":
            return l.optLong("cas") > 0 ? l.optString("code") : null;
        default:
            return l.toString();
        }
    }

    /** Designation lisible d'un ecart (liste des apparus / disparus). */
    static String designation(String code, JSONObject l) {
        switch (code) {
        case "STOCK":
            return l.optString("cip") + " " + l.optString("libelle") + " (" + l.optString("emplacement") + ") : écart "
                    + l.optLong("ecart");
        case "STOCK_NEGATIF":
            return l.optString("cip") + " " + l.optString("libelle") + " (" + l.optString("emplacement") + ") : stock "
                    + l.optLong("stockReel");
        case "CAISSES_OUVERTES":
            return l.optString("caissier") + ", ouverte le " + l.optString("ouverture");
        case "BILLETAGE":
            return l.optString("caissier") + ", caisse du " + l.optString("ouverture") + " : écart "
                    + l.optLong("ecart");
        case "DIFFERES":
            return l.optString("client") + " : écart " + l.optLong("ecart");
        case "CARNETS":
            return l.optString("depot") + " : écart " + l.optLong("ecart");
        case "CONTROLES":
            return l.optString("libelle") + " : " + l.optLong("cas") + " cas";
        default:
            return l.toString();
        }
    }

    private static Map<String, JSONObject> index(String code, JSONObject section) {
        Map<String, JSONObject> m = new LinkedHashMap<>();
        JSONArray lignes = section == null ? null : section.optJSONArray("lignes");
        if (lignes != null) {
            for (int i = 0; i < lignes.length(); i++) {
                JSONObject l = lignes.getJSONObject(i);
                String k = cle(code, l);
                if (k != null) {
                    m.putIfAbsent(k, l);
                }
            }
        }
        return m;
    }

    private static Map<String, JSONObject> sections(JSONObject rapport) {
        Map<String, JSONObject> m = new LinkedHashMap<>();
        JSONArray s = rapport.optJSONArray("sections");
        if (s != null) {
            for (int i = 0; i < s.length(); i++) {
                m.put(s.getJSONObject(i).optString("code"), s.getJSONObject(i));
            }
        }
        return m;
    }

    /** Compare le rapport A (ancien) au rapport B (recent). */
    static JSONObject comparer(JSONObject a, JSONObject b) {
        Map<String, JSONObject> sa = sections(a), sb = sections(b);
        JSONArray res = new JSONArray();
        for (String code : COLONNES.keySet()) {
            JSONObject x = sa.get(code), y = sb.get(code);
            if (x == null && y == null) {
                continue;
            }
            Map<String, JSONObject> ia = index(code, x), ib = index(code, y);
            JSONArray apparus = new JSONArray(), disparus = new JSONArray();
            int persistants = 0;
            for (Map.Entry<String, JSONObject> e : ib.entrySet()) {
                if (ia.containsKey(e.getKey())) {
                    persistants++;
                } else {
                    apparus.put(designation(code, e.getValue()));
                }
            }
            for (Map.Entry<String, JSONObject> e : ia.entrySet()) {
                if (!ib.containsKey(e.getKey())) {
                    disparus.put(designation(code, e.getValue()));
                }
            }
            JSONObject ref = y != null ? y : x;
            res.put(new JSONObject().put("code", code).put("titre", ref.optString("titre"))
                    .put("nbA", x == null ? 0 : x.optInt("nb")).put("nbB", y == null ? 0 : y.optInt("nb"))
                    .put("apparus", apparus).put("disparus", disparus).put("persistants", persistants)
                    .put("complet", lignesCompletes(x) && lignesCompletes(y)));
        }
        return new JSONObject().put("success", true).put("sections", res);
    }

    /** Toutes les lignes de la section sont dans le rapport (sinon la comparaison ne porte que sur les premieres). */
    private static boolean lignesCompletes(JSONObject s) {
        if (s == null || "CONTROLES".equals(s.optString("code"))) {
            return true;
        }
        JSONArray l = s.optJSONArray("lignes");
        return l == null || l.length() >= s.optInt("nb");
    }

    /** Resume court d'un rapport (liste des rapports) : nombre d'ecarts par section. */
    static JSONObject resume(JSONObject rapport) {
        JSONObject r = new JSONObject();
        for (JSONObject s : sections(rapport).values()) {
            r.put(s.optString("code"), s.optInt("nb"));
        }
        return r;
    }
}
