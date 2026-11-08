package rest.service.extranet.mayite;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Liste des specialites Mayite (releve du 08/11) : GET /ajax/user/medicaments/liste/prix/ avec les parametres
 * DataTables complets (7 colonnes, sans eux : 500) et les filtres de l'ecran : nom, dci__nom, formes__nom,
 * laboratoire__nom, prix__gte, prix__lte. Reponse {recordsTotal, recordsFiltered, data:[[nom, dci, liste, dosages,
 * proprietes (liens), prix, action (lien /pro/medicament/detail/{id}/)]], result:"ok"}. Lecture seule ; aucun motif
 * n'est journalise.
 */
public final class RechercheMayite {

    public static final String CHEMIN = "/ajax/user/medicaments/liste/prix/";
    public static final String REFERER = "/pro/medicament/liste/";
    public static final int RESULTATS_MAX = 100;
    static final int COLONNES = 7;
    static final Pattern DETAIL = Pattern.compile(
            "/pro/medicament/detail/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/");

    /** Criteres de l'ecran ; un critere vide n'est pas filtre. */
    public static final class Criteres {
        public final String nom;
        public final String dci;
        public final String forme;
        public final String laboratoire;

        public Criteres(String nom, String dci, String forme, String laboratoire) {
            this.nom = propre(nom);
            this.dci = propre(dci);
            this.forme = propre(forme);
            this.laboratoire = propre(laboratoire);
        }

        /** Null si les criteres sont acceptables, sinon le motif du refus. */
        public String refus() {
            String[] t = { nom, dci, forme, laboratoire };
            int remplis = 0;
            for (String s : t) {
                if (!s.isEmpty()) {
                    remplis++;
                    if (s.length() < 2 || s.length() > 60) {
                        return "Chaque critère : de 2 à 60 caractères";
                    }
                }
            }
            return remplis == 0 ? "Saisissez un nom, une DCI, une forme ou un laboratoire" : null;
        }
    }

    private RechercheMayite() {
    }

    static String propre(String s) {
        return s == null ? "" : s.replaceAll("[\\p{Cntrl}]", " ").trim().replaceAll("\\s+", " ");
    }

    /** Parametres envoyes, dans l'ordre de l'ecran de Mayite. */
    static Map<String, String> parametres(Criteres c, int debut, int longueur) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("draw", "1");
        for (int i = 0; i < COLONNES; i++) {
            p.put("columns[" + i + "][data]", String.valueOf(i));
            p.put("columns[" + i + "][name]", "");
            p.put("columns[" + i + "][searchable]", "true");
            p.put("columns[" + i + "][orderable]", "true");
            p.put("columns[" + i + "][search][value]", "");
            p.put("columns[" + i + "][search][regex]", "false");
        }
        p.put("order[0][column]", "0");
        p.put("order[0][dir]", "asc");
        p.put("start", String.valueOf(debut));
        p.put("length", String.valueOf(longueur));
        p.put("search[value]", "");
        p.put("search[regex]", "false");
        p.put("nom", c.nom);
        p.put("dci__nom", c.dci);
        p.put("formes__nom", c.forme);
        p.put("prix__lte", "");
        p.put("prix__gte", "");
        p.put("laboratoire__nom", c.laboratoire);
        return p;
    }

    public static JSONObject rechercher(TransportExtranet t, Criteres c) throws ExtranetException {
        String json = t.lire(CHEMIN, parametres(c, 0, RESULTATS_MAX), TransportExtranet.Attendu.JSON, REFERER).texte();
        try {
            return lire(new JSONObject(json));
        } catch (JSONException e) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Mayité : réponse de recherche illisible");
        }
    }

    /** {total, trouves, tronque, resultats:[{id, nom, dci, liste, dosages, proprietes, prix}]}. */
    static JSONObject lire(JSONObject r) throws ExtranetException {
        if (!r.has("data") || !(r.get("data") instanceof JSONArray)) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Mayité : réponse de recherche sans données");
        }
        JSONArray data = r.getJSONArray("data");
        JSONArray res = new JSONArray();
        for (int i = 0; i < data.length() && res.length() < RESULTATS_MAX; i++) {
            JSONArray l = data.optJSONArray(i);
            if (l == null || l.length() < COLONNES) {
                continue;
            }
            String id = identifiant(l.optString(6));
            if (id == null) {
                continue;
            }
            res.put(new JSONObject().put("id", id).put("nom", texte(l.optString(0))).put("dci", texte(l.optString(1)))
                    .put("liste", texte(l.optString(2))).put("dosages", texte(l.optString(3)))
                    .put("proprietes", texte(l.optString(4))).put("prix", prix(l.optString(5))));
        }
        int trouves = r.optInt("recordsFiltered", res.length());
        return new JSONObject().put("total", r.optInt("recordsTotal", trouves)).put("trouves", trouves)
                .put("tronque", trouves > res.length()).put("resultats", res);
    }

    /** Identifiant (UUID) de la fiche, tire du lien ; null si absent ou d'une autre forme. */
    static String identifiant(String html) {
        Matcher m = DETAIL.matcher(html == null ? "" : html);
        return m.find() ? m.group(1).toLowerCase() : null;
    }

    static boolean identifiantValide(String id) {
        return id != null && DETAIL.matcher("/pro/medicament/detail/" + id + "/").matches();
    }

    /** Texte sans balises (liens des proprietes), 500 caracteres au plus. */
    static String texte(String html) {
        String s = html == null ? "" : Jsoup.parse(html).text().trim();
        return s.length() > 500 ? s.substring(0, 500) : s;
    }

    /** « 2095.0 » -> « 2095 » ; vide si illisible. */
    static String prix(String s) {
        try {
            BigDecimal b = new BigDecimal(s.trim()).stripTrailingZeros();
            return b.scale() < 0 ? b.setScale(0).toPlainString() : b.toPlainString();
        } catch (RuntimeException e) {
            return "";
        }
    }
}
