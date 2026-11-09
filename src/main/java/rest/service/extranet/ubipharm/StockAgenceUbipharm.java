package rest.service.extranet.ubipharm;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Une ligne de {@code produit.infosParEtablissement} de {@code /SavoirPlusJSON} (plan du 07/11, §4).
 * <p>
 * Disponibilite, stock et colisage restent distincts (§17) : {@code psstk} est le stock affiche par l'agence,
 * {@code colisages} la liste des conditionnements ; {@code envProduit} et {@code pectvp} ont une signification inconnue
 * et sont gardes bruts (texte JSON). Un stock absent, null ou illisible donne {@code null}, jamais 0.
 */
public final class StockAgenceUbipharm {

    /** Champs documentes d'une agence (§4). */
    static final String[] CHAMPS = { "envProduit", "etcode", "etlib", "pectvp", "psstk", "colisages" };

    String envProduitBrut;
    String etcode;
    String etlib;
    String pectvpBrut;
    String psstkBrut;
    Integer psstk;
    List<Integer> colisages;
    String colisagesBrut;
    final Set<String> absents = new LinkedHashSet<>();

    StockAgenceUbipharm() {
    }

    /** Valeur brute de envProduit, en texte JSON (signification inconnue) ; null si absente ou null. */
    public String envProduitBrut() {
        return envProduitBrut;
    }

    public String etcode() {
        return etcode;
    }

    public String etlib() {
        return etlib;
    }

    /** Valeur brute de pectvp, en texte JSON (signification inconnue). */
    public String pectvpBrut() {
        return pectvpBrut;
    }

    /** Stock tel que recu (nombre ecrit en texte, ou chaine d'origine). */
    public String psstkBrut() {
        return psstkBrut;
    }

    /** Stock de l'agence ; null si absent, null, inconnu (N/A) ou non entier. */
    public Integer psstk() {
        return psstk;
    }

    /** Colisages lus ; null si absents ou illisibles, liste vide si la source donne une liste vide. */
    public List<Integer> colisages() {
        return colisages == null ? null : Collections.unmodifiableList(colisages);
    }

    /** Colisages tels que recus, en texte JSON. */
    public String colisagesBrut() {
        return colisagesBrut;
    }

    /** Champs documentes absents de la reponse (a distinguer d'une valeur null). */
    public Set<String> absents() {
        return Collections.unmodifiableSet(absents);
    }

    public boolean absent(String champ) {
        return absents.contains(champ);
    }

    /** Representation pour l'API : un champ absent n'est pas ecrit, un champ null vaut null. Sans HTML. */
    public JSONObject toJson() {
        JSONObject o = new JSONObject();
        FicheProduitUbipharm.mettre(o, "etcode", FicheProduitUbipharm.nettoyer(etcode), absent("etcode"));
        FicheProduitUbipharm.mettre(o, "etlib", FicheProduitUbipharm.nettoyer(etlib), absent("etlib"));
        FicheProduitUbipharm.mettre(o, "psstk", psstk, absent("psstk"));
        FicheProduitUbipharm.mettre(o, "psstkBrut", FicheProduitUbipharm.nettoyer(psstkBrut), absent("psstk"));
        FicheProduitUbipharm.mettre(o, "colisages", colisages == null ? null : new JSONArray(colisages),
                absent("colisages"));
        FicheProduitUbipharm.mettre(o, "colisagesBrut", FicheProduitUbipharm.jsonNettoye(colisagesBrut),
                absent("colisages"));
        FicheProduitUbipharm.mettre(o, "envProduitBrut", FicheProduitUbipharm.jsonNettoye(envProduitBrut),
                absent("envProduit"));
        FicheProduitUbipharm.mettre(o, "pectvpBrut", FicheProduitUbipharm.jsonNettoye(pectvpBrut), absent("pectvp"));
        o.put("absents", new JSONArray(absents));
        return o;
    }
}
