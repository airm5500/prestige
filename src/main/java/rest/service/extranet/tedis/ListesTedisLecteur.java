package rest.service.extranet.tedis;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.Normalisation;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.commun.TransportExtranet.Attendu;
import rest.service.extranet.tedis.ListeTedis.Colonne;
import rest.service.extranet.tedis.ListeTedis.Genre;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Lecture des listes TEDIS (GET uniquement) et mise en lignes. Toute reponse qui ne ressemble plus au releve du 08/11
 * (succes a faux, tableau absent, titre de colonne deplace, objet attendu) arrete la collecte : jamais de liste
 * incomplete. Aucune valeur n'est journalisee.
 */
public final class ListesTedisLecteur {

    /** Au-dela : la liste n'est pas lue (le catalogue comptait 16 940 produits le 08/11). */
    public static final int LIGNES_MAX = 30000;
    /** Au-dela : quinzaines, annees ou commandes en attente ne sont pas toutes lues. */
    static final int SOUS_LISTES_MAX = 60;
    static final int LONGUEUR_CELLULE = 1000;
    /** Page qui porte le choix de l'agence (ChooseAgence) : son agence choisie est l'agence principale du client. */
    static final String PAGE_AGENCE = "/catalogueProduit";
    private static final Pattern IDENTIFIANT = Pattern.compile("[0-9A-Za-z_-]{1,20}");
    private static final Pattern CIP = Pattern.compile("\\d{6,14}");
    private static final Pattern NOMBRE = Pattern.compile("-?\\d+(\\.\\d+)?");

    /** Lignes lues ; annoncees est toujours null (TEDIS n'annonce aucun total). */
    public static final class Resultat {
        public final List<Ligne> lignes;

        Resultat(List<Ligne> lignes) {
            this.lignes = Collections.unmodifiableList(lignes);
        }
    }

    private ListesTedisLecteur() {
    }

    public static Resultat lire(TransportExtranet t, ListeTedis l) throws ExtranetException {
        if (t == null || l == null) {
            throw new IllegalArgumentException("transport et liste attendus");
        }
        List<Ligne> lignes = new ArrayList<>();
        switch (l.mode) {
        case CATALOGUE: {
            String[] agence = agencePrincipale(t.lire(PAGE_AGENCE, null, Attendu.HTML, null).texte());
            Map<String, String> p = new LinkedHashMap<>();
            p.put("AgenceId", agence[0]);
            lignes.addAll(objets(l, data(l, json(t, l, p), "data"), agence[1], 0));
            break;
        }
        case JSON:
            lignes.addAll(objets(l, data(l, json(t, l, null), "data"), null, 0));
            break;
        case HTML:
            lignes.addAll(page(l, t.lire(l.chemin, null, Attendu.HTML, null).texte()));
            break;
        case BL_QUINZAINE:
        case FACTURES_ANNEES: {
            boolean bl = l.mode == ListeTedis.Mode.BL_QUINZAINE;
            List<String[]> choix = options(l, t.lire(l.pageOrigine, null, Attendu.HTML, null).texte(),
                    bl ? "SearchBlv" : "envoiAnnee");
            for (String[] c : choix) {
                Map<String, String> p = new LinkedHashMap<>();
                p.put(bl ? "idDate" : "Annee", c[0]);
                lignes.addAll(objets(l, data(l, json(t, l, p), bl ? "DatabonLivraison" : "data"), c[1], lignes.size()));
                borner(l, lignes.size());
            }
            break;
        }
        default: {
            List<String[]> commandes = commandesAttente(l, t.lire(l.pageOrigine, null, Attendu.HTML, null).texte());
            for (String[] c : commandes) {
                Map<String, String> p = new LinkedHashMap<>();
                p.put("IDCommandeAttente", c[0]);
                lignes.addAll(objets(l, data(l, json(t, l, p), "data"), c[1], lignes.size()));
            }
        }
        }
        borner(l, lignes.size());
        return new Resultat(lignes);
    }

    /* ================================================================ JSON */

    /** Tableau {@code cle} de la reponse ; {@code succes} a faux ou tableau absent : refuse. */
    static JSONArray data(ListeTedis l, JSONObject racine, String cle) throws ExtranetException {
        if (racine.has("succes") && !racine.optBoolean("succes")) {
            throw inattendue(l, "l'extranet répond « succes » à faux");
        }
        JSONArray a = racine.optJSONArray(cle);
        if (a == null) {
            throw inattendue(l, "tableau « " + cle + " » absent de la réponse");
        }
        borner(l, a.length());
        return a;
    }

    /**
     * Lignes d'un tableau d'objets ; {@code contexte} (agence, quinzaine, annee, commande) en premiere cellule. Le
     * filtre de statut (mises en place) ne garde que les objets dont « Statut » vaut le filtre.
     */
    static List<Ligne> objets(ListeTedis l, JSONArray data, String contexte, int depart) throws ExtranetException {
        List<Ligne> r = new ArrayList<>();
        boolean filtrer = l.mode == ListeTedis.Mode.CATALOGUE && l.filtre != null;
        for (int i = 0; i < data.length(); i++) {
            JSONObject o = data.optJSONObject(i);
            if (o == null) {
                throw inattendue(l, "ligne " + (i + 1) + " : objet attendu");
            }
            if (filtrer && !l.filtre.equalsIgnoreCase(Normalisation.texte(o.optString("Statut", "")))) {
                continue;
            }
            List<String> cellules = new ArrayList<>();
            if (l.colonneContexte() != null) {
                cellules.add(borne(contexte == null ? "" : contexte));
            }
            String reference = null, cip = null;
            for (Colonne c : l.colonnes) {
                if (!o.has(c.cle)) {
                    throw inattendue(l, "champ « " + c.cle + " » absent (ligne " + (i + 1) + ")");
                }
                String v = valeur(o.opt(c.cle), c.genre);
                cellules.add(v);
                if (c.genre == Genre.REFERENCE && !v.isEmpty()) {
                    reference = v;
                } else if (c.genre == Genre.CIP && CIP.matcher(v).matches()) {
                    cip = v;
                }
            }
            r.add(new Ligne(depart + r.size(), contexte, reference, cip, cellules, document(l, o)));
        }
        return r;
    }

    /**
     * Demande du 09/11, point 4 : BL de quinzaine, identifiant attendu par les exports TXT et CSV de l'extranet
     * (IDFACTURECLIENT) ; null pour les autres listes ou si l'identifiant manque.
     */
    static java.util.Map<String, String> document(ListeTedis l, JSONObject o) {
        if (l.mode != ListeTedis.Mode.BL_QUINZAINE) {
            return null;
        }
        Object v = o.opt("IDFACTURECLIENT");
        if (v == null || v == JSONObject.NULL) {
            return null;
        }
        String s = v instanceof Number ? new BigDecimal(v.toString()).stripTrailingZeros().toPlainString()
                : String.valueOf(v);
        s = rest.service.extranet.commun.FichiersExtranet.reference(s);
        return s == null ? null : java.util.Collections.singletonMap("IDFACTURECLIENT", s);
    }

    /**
     * Valeur affichee : texte sans HTML ; montant sans zeros inutiles (« 1805.000000 » : « 1805 ») ; disponibilite Oui
     * / Non (stock ou indicateur positif) ; null : vide.
     */
    static String valeur(Object v, Genre g) {
        if (v == null || v == JSONObject.NULL) {
            return g == Genre.DISPO ? "Non" : "";
        }
        if (g == Genre.DISPO) {
            if (v instanceof Boolean) {
                return (Boolean) v ? "Oui" : "Non";
            }
            String s = String.valueOf(v).trim();
            return NOMBRE.matcher(s).matches() && new BigDecimal(s).signum() > 0 ? "Oui" : "Non";
        }
        String s = v instanceof String ? (String) v : String.valueOf(v);
        if (s.indexOf('<') >= 0) {
            s = Jsoup.parseBodyFragment(s).body().text();
        }
        s = Normalisation.texte(s);
        if (g == Genre.MONTANT && NOMBRE.matcher(s).matches()) {
            BigDecimal b = new BigDecimal(s).stripTrailingZeros();
            s = b.scale() < 0 ? b.setScale(0).toPlainString() : b.toPlainString();
        }
        return borne(s);
    }

    /* ================================================================ HTML */

    /** {id, libelle} de l'agence choisie (select ChooseAgence) ; la premiere si aucune n'est choisie. */
    static String[] agencePrincipale(String html) throws ExtranetException {
        Element s = Jsoup.parse(html == null ? "" : html).selectFirst("select#ChooseAgence");
        if (s == null || s.select("option").isEmpty()) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "TEDIS : choix de l'agence introuvable sur le catalogue (page modifiée ou session expirée)");
        }
        Element o = s.selectFirst("option[selected]");
        o = o == null ? s.selectFirst("option") : o;
        String id = o.attr("value").trim();
        if (!IDENTIFIANT.matcher(id).matches()) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "TEDIS : agence inattendue");
        }
        return new String[] { id, borne(Normalisation.texte(o.text())) };
    }

    /** Choix proposes par un select de la page : {valeur, libelle}, dans l'ordre de la page. */
    static List<String[]> options(ListeTedis l, String html, String selectId) throws ExtranetException {
        Element s = Jsoup.parse(html == null ? "" : html).selectFirst("select#" + selectId);
        if (s == null) {
            throw inattendue(l, "choix « " + selectId + " » introuvable (page modifiée ou session expirée)");
        }
        List<String[]> r = new ArrayList<>();
        for (Element o : s.select("option")) {
            String v = o.attr("value").trim();
            if (v.isEmpty()) {
                continue;
            }
            if (!IDENTIFIANT.matcher(v).matches()) {
                throw inattendue(l, "valeur de choix inattendue");
            }
            r.add(new String[] { v, borne(Normalisation.texte(o.text())) });
        }
        if (r.size() > SOUS_LISTES_MAX) {
            throw inattendue(l, r.size() + " choix, au-delà de " + SOUS_LISTES_MAX);
        }
        return r;
    }

    /** Commandes en attente : {identifiant, date et heure} de chaque ligne qui porte le bouton « voir le detail ». */
    static List<String[]> commandesAttente(ListeTedis l, String html) throws ExtranetException {
        Document d = Jsoup.parse(html == null ? "" : html);
        d.select("script, noscript, template").remove();
        if (d.selectFirst("table") == null) {
            throw inattendue(l, "tableau introuvable (page modifiée ou session expirée)");
        }
        List<String[]> r = new ArrayList<>();
        for (Element i : d.select("[data-id].fa-eye, #voirDetail[data-id]")) {
            String id = i.attr("data-id").trim();
            if (!IDENTIFIANT.matcher(id).matches()) {
                throw inattendue(l, "identifiant de commande inattendu");
            }
            Element tr = i.closest("tr");
            String date = tr == null ? "" : borne(Normalisation.texte(tr.text()));
            if (r.stream().noneMatch(x -> x[0].equals(id))) {
                r.add(new String[] { id, date });
            }
        }
        if (r.size() > SOUS_LISTES_MAX) {
            throw inattendue(l, r.size() + " commandes en attente, au-delà de " + SOUS_LISTES_MAX);
        }
        return r;
    }

    /** Lignes du tableau de la page, apres controle des titres des colonnes gardees. */
    static List<Ligne> page(ListeTedis l, String html) throws ExtranetException {
        Document d = Jsoup.parse(html == null ? "" : html);
        d.select("script, noscript, template").remove();
        Element table = d.selectFirst("table" + l.filtre);
        if (table == null) {
            throw inattendue(l, "tableau introuvable (page modifiée ou session expirée)");
        }
        Elements th = table.select("> thead > tr > th");
        int max = 0;
        for (Colonne c : l.colonnes) {
            max = Math.max(max, c.index);
            String vu = c.index < th.size() ? Normalisation.texte(th.get(c.index).text()) : "";
            if (!vu.equalsIgnoreCase(c.titre)) {
                throw inattendue(l, "colonne " + (c.index + 1) + " « " + vu + " » au lieu de « " + c.titre + " »");
            }
        }
        List<Ligne> r = new ArrayList<>();
        for (Element tr : table.select("> tbody > tr")) {
            Elements tds = tr.select("> td");
            if (tds.size() == 1 && tds.first().hasAttr("colspan")) {
                continue; /* « Aucune donnée disponible dans le tableau » */
            }
            if (tds.size() <= max) {
                throw inattendue(l, "ligne " + (r.size() + 1) + " de " + tds.size() + " cellules");
            }
            List<String> cellules = new ArrayList<>();
            for (Colonne c : l.colonnes) {
                cellules.add(borne(Normalisation.texte(tds.get(c.index).text())));
            }
            r.add(new Ligne(r.size(), null, null, null, cellules));
            borner(l, r.size());
        }
        return r;
    }

    /* ================================================================ outils */

    private static JSONObject json(TransportExtranet t, ListeTedis l, Map<String, String> p) throws ExtranetException {
        String texte = t.lire(l.chemin, p, Attendu.JSON_TYPE_LIBRE, l.pageOrigine).texte();
        try {
            return new JSONObject(texte);
        } catch (JSONException e) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Réponse JSON illisible sur " + l.chemin, e);
        }
    }

    private static void borner(ListeTedis l, int n) throws ExtranetException {
        if (n > LIGNES_MAX) {
            throw new ExtranetException(ExtranetException.Nature.PAGINATION,
                    l.libelle + " : " + n + " lignes, au-delà de la limite de " + LIGNES_MAX);
        }
    }

    private static String borne(String s) {
        return s.length() > LONGUEUR_CELLULE ? s.substring(0, LONGUEUR_CELLULE) : s;
    }

    private static ExtranetException inattendue(ListeTedis l, String m) {
        return new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "TEDIS, " + l.libelle + " : " + m);
    }
}
