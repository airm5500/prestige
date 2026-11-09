package rest.service.extranet.ubipharm;

import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.Normalisation;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Recherche de produits Ubipharm par CIP, libelle ou DCI (demande du 08/11). Relevee le 08/11 : le champ de recherche
 * de l'extranet poste /RechercheProduits, mais les resultats viennent de {@code GET /ReturnProduitsJSON} qui porte
 * lui-meme le motif et les filtres : Prestige n'utilise que ce GET (lecture seule, aucun POST).
 *
 * <p>
 * Reponse : {@code {msg, datatables: {recordsTotal, recordsFiltered, data}}} ; cellules : produit (lien popup-produit
 * avec data-pscode, puis « PSCODE - CIP »), statut, disponibilite (bulle des agences), prix, colisage (liste),
 * quantite.
 * </p>
 */
public final class RechercheUbipharm {

    static final String CHEMIN = "/ReturnProduitsJSON";
    static final String PAGE_ORIGINE = "/RechercheProduits";
    /** Une page de resultats : au-dela, l'ecran demande d'affiner. */
    public static final int RESULTATS_MAX = 100;
    static final int MOTIF_MIN = 2;
    static final int MOTIF_MAX = 60;

    /** Champs cherches : « Par cip, libellé » (NAME) et / ou « Par DCI » (DCI). */
    public enum Champs {
        TOUT("NAME,DCI"), CIP_LIBELLE("NAME"), DCI("DCI");

        final String valeur;

        Champs(String valeur) {
            this.valeur = valeur;
        }

        public static Champs lire(String s) {
            for (Champs c : values()) {
                if (c.name().equalsIgnoreCase(s == null ? "" : s.trim())) {
                    return c;
                }
            }
            return TOUT;
        }
    }

    private RechercheUbipharm() {
    }

    /** Motif retenu (espaces reduits), ou null s'il est trop court ou trop long. */
    public static String motif(String brut) {
        String m = brut == null ? "" : Normalisation.texte(brut);
        return m.length() < MOTIF_MIN || m.length() > MOTIF_MAX ? null : m;
    }

    public static JSONObject rechercher(TransportExtranet t, String motif, Champs champs, boolean commencePar,
            boolean enStockSeulement) throws ExtranetException {
        String m = motif(motif);
        if (m == null) {
            throw new IllegalArgumentException("Motif de " + MOTIF_MIN + " à " + MOTIF_MAX + " caractères attendu");
        }
        String texte = t.lire(CHEMIN, parametres(m, champs, commencePar, enStockSeulement), Attendu.JSON, PAGE_ORIGINE)
                .texte();
        try {
            return lire(new JSONObject(texte));
        } catch (JSONException e) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Recherche Ubipharm : réponse JSON illisible", e);
        }
    }

    /** Parametres dans l'ordre envoye par la page (DataTables, 6 colonnes, tri sur le produit). */
    static Map<String, String> parametres(String motif, Champs champs, boolean commencePar, boolean enStockSeulement) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("draw", "1");
        boolean[] triable = { true, false, true, true, false, false };
        for (int i = 0; i < triable.length; i++) {
            String c = "columns[" + i + "]";
            p.put(c + "[data]", String.valueOf(i));
            p.put(c + "[name]", "");
            p.put(c + "[searchable]", "true");
            p.put(c + "[orderable]", String.valueOf(triable[i]));
            p.put(c + "[search][value]", "");
            p.put(c + "[search][regex]", "false");
        }
        p.put("order[0][column]", "0");
        p.put("order[0][dir]", "asc");
        p.put("start", "0");
        p.put("length", String.valueOf(RESULTATS_MAX));
        p.put("search[value]", "");
        p.put("search[regex]", "false");
        p.put("motifRecherche", motif);
        p.put("filtreRecherche", commencePar ? "S" : "C");
        p.put("typeRecherche", (champs == null ? Champs.TOUT : champs).valeur);
        p.put("filtreFabricant", "ALL");
        p.put("filtreFamille", "ALL");
        p.put("filtreStatut", "ALL");
        p.put("filtreTva", "ON");
        p.put("filtreDispo", String.valueOf(enStockSeulement));
        p.put("filtrePromo", "false");
        p.put("filtrePrixMin", "");
        p.put("filtrePrixMax", "");
        return p;
    }

    /**
     * Resultats : {total, tronque, resultats: [{pscode, designation, cip, statut, dispo, prix, colisage}]}. Une reponse
     * sans « datatables » (message d'erreur de l'extranet) ou une ligne sans reference est refusee.
     */
    static JSONObject lire(JSONObject racine) throws ExtranetException {
        JSONObject dt = racine.optJSONObject("datatables");
        if (dt == null || dt.optJSONArray("data") == null) {
            String msg = Normalisation.texte(racine.optString("msg", ""));
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Recherche Ubipharm : réponse inattendue" + (msg.isEmpty() ? "" : " (" + borne(msg, 120) + ")"));
        }
        JSONArray data = dt.getJSONArray("data");
        int total = dt.optInt("recordsTotal", data.length());
        JSONArray r = new JSONArray();
        for (int i = 0; i < data.length() && i < RESULTATS_MAX; i++) {
            JSONArray c = data.optJSONArray(i);
            if (c == null || c.length() < 5) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        "Recherche Ubipharm : ligne " + (i + 1) + " de moins de 5 cellules");
            }
            String[] p = ListesUbipharmParseur.produit(c.optString(0));
            if (p[1] == null) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        "Recherche Ubipharm : ligne " + (i + 1) + " sans référence Ubipharm");
            }
            r.put(new JSONObject().put("pscode", p[1]).put("designation", p[0])
                    .put("cip", p[2] == null ? JSONObject.NULL : p[2])
                    .put("statut", ListesUbipharmParseur.texte(c.optString(1)))
                    .put("dispo", ListesUbipharmParseur.dispo(c.optString(2)))
                    .put("prix", ListesUbipharmParseur.texte(c.optString(3)))
                    .put("colisage", colisage(c.optString(4))));
        }
        return new JSONObject().put("total", total).put("tronque", total > r.length()).put("resultats", r);
    }

    /** Colisage : option choisie de la liste (sinon la premiere), ou texte de la cellule. */
    static String colisage(String html) {
        Element b = Jsoup.parseBodyFragment(html == null ? "" : html).body();
        Element o = b.selectFirst("select option[selected]");
        o = o == null ? b.selectFirst("select option") : o;
        return borne(Normalisation.texte(o != null ? o.text() : b.text()), 100);
    }

    private static String borne(String s, int n) {
        return s.length() > n ? s.substring(0, n) : s;
    }
}
