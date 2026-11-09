package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.ParcoursDataTables;
import rest.service.extranet.commun.ReponseExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Collecte d'une liste de l'onglet Ubipharm, en lecture seule (GET uniquement, adresses relevees le 08/11). Le resultat
 * dit combien de lignes l'extranet annonce quand il l'annonce ; toute incoherence arrete la collecte.
 */
public final class ListesUbipharmCollecteur {

    /** Au-dela : la liste n'est pas lue (protection contre une reponse anormale). */
    public static final int LIGNES_MAX = 20000;
    static final int LONGUEUR_PAGE = 100;
    /** Colonnes DataTables envoyees aux listes paginees (releves et avoirs : 4 colonnes, tri sur la date). */
    static final int COLONNES_PAGINE = 4;

    /** Lignes lues et lignes annoncees par l'extranet (null s'il n'en annonce pas). */
    public static final class Resultat {
        public final List<ListesUbipharmParseur.Ligne> lignes;
        public final Integer annoncees;

        Resultat(List<ListesUbipharmParseur.Ligne> lignes, Integer annoncees) {
            this.lignes = Collections.unmodifiableList(lignes);
            this.annoncees = annoncees;
        }
    }

    private ListesUbipharmCollecteur() {
    }

    public static Resultat lire(TransportExtranet t, ListeUbipharm l, int pagesMax) throws ExtranetException {
        if (t == null || l == null) {
            throw new IllegalArgumentException("transport et liste attendus");
        }
        switch (l.mode) {
        case HTML:
            return borner(l, new Resultat(
                    ListesUbipharmParseur.page(l, t.lire(l.chemin, null, Attendu.HTML, null).texte()), null));
        case JSON_COMPLET:
            return complet(l, json(t, l, l.parametresFixes()), null, 0);
        case JSON_PAGINE:
            return pagine(l, (start, length, draw) -> json(t, l, parametresPagines(l, start, length, draw)), pagesMax);
        default:
            return parAgence(t, l);
        }
    }

    /* ------------------------------------------------------------- complet */

    /**
     * Toutes les lignes d'une reponse. Le total annonce est controle quand il est positif ; un total a 0 avec des
     * lignes (produits avec UG) n'est pas une annonce : annoncees vaut alors null.
     */
    static Resultat complet(ListeUbipharm l, JSONObject racine, String agence, int depart) throws ExtranetException {
        ParcoursDataTables.Enveloppe e = ParcoursDataTables.Enveloppe.lire(racine);
        int n = e.data.length();
        if (n > LIGNES_MAX) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    l.libelle + " : " + n + " lignes, au-delà de la limite de " + LIGNES_MAX);
        }
        Integer annoncees = e.recordsTotal > 0 ? e.recordsTotal : null;
        if (annoncees != null && annoncees != n) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    l.libelle + (agence == null ? "" : " (" + agence + ")") + " : " + n + " lignes reçues pour "
                            + annoncees + " annoncées");
        }
        List<ListesUbipharmParseur.Ligne> lignes = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            JSONArray c = e.data.optJSONArray(i);
            if (c == null) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        l.libelle + " : ligne " + (i + 1) + " : tableau de cellules attendu");
            }
            lignes.add(ListesUbipharmParseur.ligne(l, depart + i, agence, c));
        }
        return new Resultat(lignes, annoncees);
    }

    /* -------------------------------------------------------------- pagine */

    static Resultat pagine(ListeUbipharm l, ParcoursDataTables.Page page, int pagesMax) throws ExtranetException {
        List<ListesUbipharmParseur.Ligne> lignes = new ArrayList<>();
        ParcoursDataTables.Bilan b = ParcoursDataTables.parcourir(page, LONGUEUR_PAGE, pagesMax,
                (position, cellules) -> lignes.add(ListesUbipharmParseur.ligne(l, position, null, cellules)));
        return borner(l, new Resultat(lignes, b.recordsFiltered));
    }

    /**
     * Parametres DataTables d'une liste paginee, dans l'ordre envoye par la page (tri : date, plus recente d'abord).
     */
    static Map<String, String> parametresPagines(ListeUbipharm l, int start, int length, int draw) {
        Map<String, String> p = new LinkedHashMap<>(l.parametresFixes());
        p.put("draw", String.valueOf(draw));
        for (int i = 0; i < COLONNES_PAGINE; i++) {
            String c = "columns[" + i + "]";
            p.put(c + "[data]", String.valueOf(i));
            p.put(c + "[name]", "");
            p.put(c + "[searchable]", String.valueOf(i != 0));
            p.put(c + "[orderable]", String.valueOf(i != 0));
            p.put(c + "[search][value]", "");
            p.put(c + "[search][regex]", "false");
        }
        p.put("order[0][column]", "2");
        p.put("order[0][dir]", "desc");
        p.put("start", String.valueOf(start));
        p.put("length", String.valueOf(length));
        p.put("search[value]", "");
        p.put("search[regex]", "false");
        return p;
    }

    /* ---------------------------------------------------------- par agence */

    private static Resultat parAgence(TransportExtranet t, ListeUbipharm l) throws ExtranetException {
        List<String> agences = ListesUbipharmParseur.agences(l,
                t.lire(l.pageOrigine, null, Attendu.HTML, null).texte());
        List<JSONObject> reponses = new ArrayList<>();
        for (String a : agences) {
            Map<String, String> p = new LinkedHashMap<>(l.parametresFixes());
            p.put("etab", a);
            reponses.add(json(t, l, p));
        }
        return assembler(l, agences, reponses);
    }

    /**
     * Une reponse par agence, dans l'ordre des agences. Une agence dont la liste est encore en cours de mise a jour
     * chez Ubipharm (sStatut ENC) arrete la collecte : sa liste serait incomplete.
     */
    static Resultat assembler(ListeUbipharm l, List<String> agences, List<JSONObject> reponses)
            throws ExtranetException {
        List<ListesUbipharmParseur.Ligne> lignes = new ArrayList<>();
        int annoncees = 0;
        boolean toutesAnnoncees = true;
        for (int i = 0; i < agences.size(); i++) {
            JSONObject r = reponses.get(i);
            if ("ENC".equals(r.optString("sStatut"))) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, l.libelle + " ("
                        + agences.get(i) + ") : mise à jour en cours chez Ubipharm, relancez dans quelques minutes");
            }
            Resultat x = complet(l, r, agences.get(i), lignes.size());
            lignes.addAll(x.lignes);
            if (x.annoncees == null) {
                toutesAnnoncees = x.lignes.isEmpty() && toutesAnnoncees;
            } else {
                annoncees += x.annoncees;
            }
        }
        return borner(l, new Resultat(lignes, toutesAnnoncees ? annoncees : null));
    }

    /* -------------------------------------------------------------- outils */

    private static Resultat borner(ListeUbipharm l, Resultat r) throws ExtranetException {
        if (r.lignes.size() > LIGNES_MAX) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    l.libelle + " : " + r.lignes.size() + " lignes, au-delà de la limite de " + LIGNES_MAX);
        }
        return r;
    }

    private static JSONObject json(TransportExtranet t, ListeUbipharm l, Map<String, String> p)
            throws ExtranetException {
        ReponseExtranet r = t.lire(l.chemin, p, Attendu.JSON, l.pageOrigine);
        try {
            return new JSONObject(r.texte());
        } catch (JSONException e) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Réponse JSON illisible sur " + l.chemin, e);
        }
    }
}
