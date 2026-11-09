package rest.service.extranet.ubipharm;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.jsoup.Jsoup;
import rest.service.extranet.commun.Normalisation;
import rest.service.extranet.commun.SourceExtranet;

/**
 * Fiche produit Ubipharm normalisee, lue sur {@code GET /SavoirPlusJSON?pscode=...} (plan du 07/11, §4 et §17).
 * <ul>
 * <li>references et CIP en chaines (zeros de tete gardes) ;</li>
 * <li>champ absent et valeur null distincts : la liste {@link #absents()} nomme les champs documentes absents ;</li>
 * <li>prix : valeur brute (texte) a cote du {@link BigDecimal} ; ni devise ni regle HT/TTC attribuee (§4 : non
 * etablies) ;</li>
 * <li>listes au schema inconnu ({@code reappro}, {@code promos}, {@code arrivage}, {@code substitu}, {@code qttcde},
 * {@code produitsSubstitution}) gardees en texte JSON brut ;</li>
 * <li>stock societe ({@code psstkSoc}) et somme des stocks des agences exposes tous deux : leur egalite n'est pas
 * supposee.</li>
 * </ul>
 * Le JSON brut complet de la reponse est garde pour la base ({@link #jsonBrut()}), jamais renvoye par
 * {@link #toJson()}.
 */
public final class FicheProduitUbipharm {

    /** Listes de la racine dont le schema est inconnu (§4). */
    static final String[] LISTES_RACINE = { "reappro", "promos", "arrivage", "substitu", "qttcde" };
    /** Liste de produit au schema inconnu (null dans l'exemple observe). */
    static final String LISTE_SUBSTITUTION = "produitsSubstitution";

    String pscode;
    String pslib;
    String pslibc;
    String picode;
    List<String> cips;
    String cipsBrut;
    String cmcode;
    String falib;
    String nalib;
    String fslib;
    String stlib;
    String psdtcrBrut;
    String pspvenBrut;
    BigDecimal pspven;
    String psppubBrut;
    BigDecimal psppub;
    String pspvigBrut;
    BigDecimal pspvig;
    String tvtauxBrut;
    BigDecimal tvtaux;
    String psstkSocBrut;
    Integer psstkSoc;
    String nbProduitsSubstitutionBrut;
    Integer nbProduitsSubstitution;
    /** Nom de liste -> texte JSON brut (« null » si la valeur est null) ; une liste absente n'a pas d'entree. */
    final Map<String, String> listesBrutes = new LinkedHashMap<>();
    /** null si infosParEtablissement est absent, null ou illisible. */
    List<StockAgenceUbipharm> agences;
    String infosParEtablissementBrut;
    /** Champs documentes absents : « cips », « reappro »... pour la racine, nom simple pour le produit. */
    final Set<String> absents = new LinkedHashSet<>();
    String jsonBrut;

    FicheProduitUbipharm() {
    }

    public SourceExtranet source() {
        return SourceExtranet.UBIPHARM;
    }

    public String pscode() {
        return pscode;
    }

    public String pslib() {
        return pslib;
    }

    public String pslibc() {
        return pslibc;
    }

    /** Code produit / CIP affiche, en chaine. */
    public String picode() {
        return picode;
    }

    /** Liste {@code cips} de la racine, en chaines ; null si absente, null ou d'un schema non scalaire. */
    public List<String> cips() {
        return cips == null ? null : Collections.unmodifiableList(cips);
    }

    public String cipsBrut() {
        return cipsBrut;
    }

    public String cmcode() {
        return cmcode;
    }

    public String falib() {
        return falib;
    }

    public String nalib() {
        return nalib;
    }

    public String fslib() {
        return fslib;
    }

    public String stlib() {
        return stlib;
    }

    /** psdtcr tel que recu : sa signification et son format ne sont pas confirmes (§4), il n'est pas interprete. */
    public String psdtcrBrut() {
        return psdtcrBrut;
    }

    public String pspvenBrut() {
        return pspvenBrut;
    }

    /** Probablement prix de vente professionnel (non confirme). */
    public BigDecimal pspven() {
        return pspven;
    }

    public String psppubBrut() {
        return psppubBrut;
    }

    /** Probablement prix public (non confirme). */
    public BigDecimal psppub() {
        return psppub;
    }

    public String pspvigBrut() {
        return pspvigBrut;
    }

    /** Signification a confirmer. */
    public BigDecimal pspvig() {
        return pspvig;
    }

    public String tvtauxBrut() {
        return tvtauxBrut;
    }

    public BigDecimal tvtaux() {
        return tvtaux;
    }

    public String psstkSocBrut() {
        return psstkSocBrut;
    }

    /** Stock societe annonce ; null si absent, null ou inconnu. */
    public Integer psstkSoc() {
        return psstkSoc;
    }

    public String nbProduitsSubstitutionBrut() {
        return nbProduitsSubstitutionBrut;
    }

    public Integer nbProduitsSubstitution() {
        return nbProduitsSubstitution;
    }

    /**
     * Listes au schema inconnu, en texte JSON brut. Une liste absente n'a pas d'entree ; une liste null vaut « null ».
     */
    public Map<String, String> listesBrutes() {
        return Collections.unmodifiableMap(listesBrutes);
    }

    /** Stocks par agence ; null si {@code infosParEtablissement} est absent, null ou n'est pas une liste. */
    public List<StockAgenceUbipharm> agences() {
        return agences == null ? null : Collections.unmodifiableList(agences);
    }

    public String infosParEtablissementBrut() {
        return infosParEtablissementBrut;
    }

    public Set<String> absents() {
        return Collections.unmodifiableSet(absents);
    }

    public boolean absent(String champ) {
        return absents.contains(champ);
    }

    /** Reponse complete telle que recue : pour la base seulement, jamais pour l'ecran. */
    public String jsonBrut() {
        return jsonBrut;
    }

    /**
     * Somme des stocks des agences ; null si la liste des agences est inconnue ou si un stock d'agence est inconnu (on
     * ne remplace jamais un inconnu par 0). Liste vide : 0. A comparer a {@link #psstkSoc()} sans supposer l'egalite.
     */
    public Integer sommeStockAgences() {
        if (agences == null) {
            return null;
        }
        long s = 0;
        for (StockAgenceUbipharm a : agences) {
            if (a.psstk == null) {
                return null;
            }
            s += a.psstk;
        }
        return s > Integer.MAX_VALUE || s < Integer.MIN_VALUE ? null : (int) s;
    }

    /** Representation pour l'API : champs normalises, sans HTML, sans le JSON brut complet. */
    public JSONObject toJson() {
        JSONObject o = new JSONObject();
        o.put("source", source().name());
        mettre(o, "pscode", nettoyer(pscode), false);
        mettre(o, "pslib", nettoyer(pslib), absent("pslib"));
        mettre(o, "pslibc", nettoyer(pslibc), absent("pslibc"));
        mettre(o, "picode", nettoyer(picode), absent("picode"));
        List<String> c = null;
        if (cips != null) {
            c = new ArrayList<>();
            for (String x : cips) {
                c.add(nettoyer(x));
            }
        }
        mettre(o, "cips", c == null ? null : new JSONArray(c), absent("cips"));
        mettre(o, "cipsBrut", jsonNettoye(cipsBrut), absent("cips"));
        mettre(o, "cmcode", nettoyer(cmcode), absent("cmcode"));
        mettre(o, "falib", nettoyer(falib), absent("falib"));
        mettre(o, "nalib", nettoyer(nalib), absent("nalib"));
        mettre(o, "fslib", nettoyer(fslib), absent("fslib"));
        mettre(o, "stlib", nettoyer(stlib), absent("stlib"));
        mettre(o, "psdtcrBrut", nettoyer(psdtcrBrut), absent("psdtcr"));
        mettre(o, "pspven", pspven, absent("pspven"));
        mettre(o, "pspvenBrut", nettoyer(pspvenBrut), absent("pspven"));
        mettre(o, "psppub", psppub, absent("psppub"));
        mettre(o, "psppubBrut", nettoyer(psppubBrut), absent("psppub"));
        mettre(o, "pspvig", pspvig, absent("pspvig"));
        mettre(o, "pspvigBrut", nettoyer(pspvigBrut), absent("pspvig"));
        mettre(o, "tvtaux", tvtaux, absent("tvtaux"));
        mettre(o, "tvtauxBrut", nettoyer(tvtauxBrut), absent("tvtaux"));
        mettre(o, "psstkSoc", psstkSoc, absent("psstkSoc"));
        mettre(o, "psstkSocBrut", nettoyer(psstkSocBrut), absent("psstkSoc"));
        o.put("sommeStockAgences", sommeStockAgences() == null ? JSONObject.NULL : sommeStockAgences());
        mettre(o, "nbProduitsSubstitution", nbProduitsSubstitution, absent("nbProduitsSubstitution"));
        mettre(o, "nbProduitsSubstitutionBrut", nettoyer(nbProduitsSubstitutionBrut), absent("nbProduitsSubstitution"));
        JSONObject l = new JSONObject();
        listesBrutes.forEach((k, v) -> l.put(k, jsonNettoye(v)));
        o.put("listesBrutes", l);
        if (agences != null) {
            JSONArray a = new JSONArray();
            for (StockAgenceUbipharm s : agences) {
                a.put(s.toJson());
            }
            o.put("agences", a);
        } else {
            mettre(o, "agences", null, absent("infosParEtablissement"));
            mettre(o, "infosParEtablissementBrut", jsonNettoye(infosParEtablissementBrut),
                    absent("infosParEtablissement"));
        }
        o.put("absents", new JSONArray(absents));
        o.put("devise", JSONObject.NULL);
        o.put("regleTaxePrix", "INCONNUE");
        return o;
    }

    /** Ecrit la valeur si le champ n'est pas absent ; null devient JSONObject.NULL. */
    static void mettre(JSONObject o, String cle, Object valeur, boolean absent) {
        if (!absent) {
            o.put(cle, valeur == null ? JSONObject.NULL : valeur);
        }
    }

    /**
     * Texte montrable : entites HTML decodees, balises retirees, blancs normalises. Jamais de balise dans l'API (§17 :
     * le HTML source n'est pas expose). null reste null.
     */
    static String nettoyer(String s) {
        if (s == null) {
            return null;
        }
        String t = s;
        if (t.indexOf('<') >= 0 || t.indexOf('&') >= 0) {
            t = Jsoup.parseBodyFragment(t).text();
        }
        return Normalisation.texte(t.replace("<", "").replace(">", ""));
    }

    /** Texte JSON brut -> valeur JSON dont toutes les chaines (et les cles) sont nettoyees ; null reste null. */
    static Object jsonNettoye(String jsonTexte) {
        if (jsonTexte == null) {
            return null;
        }
        Object v;
        try {
            v = new JSONTokener(jsonTexte).nextValue();
        } catch (JSONException e) {
            return nettoyer(jsonTexte);
        }
        return nettoyerValeur(v);
    }

    private static Object nettoyerValeur(Object v) {
        if (v instanceof String) {
            return nettoyer((String) v);
        }
        if (v instanceof JSONArray) {
            JSONArray r = new JSONArray();
            for (Object x : (JSONArray) v) {
                r.put(nettoyerValeur(x));
            }
            return r;
        }
        if (v instanceof JSONObject) {
            JSONObject src = (JSONObject) v;
            JSONObject r = new JSONObject();
            for (String k : src.keySet()) {
                r.put(nettoyer(k), nettoyerValeur(src.get(k)));
            }
            return r;
        }
        return v == null ? JSONObject.NULL : v;
    }
}
