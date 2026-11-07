package rest.service.extranet.ubipharm;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.Normalisation;

/**
 * Lecture de la reponse de {@code /SavoirPlusJSON} (plan du 07/11, §4) en {@link FicheProduitUbipharm}.
 * <p>
 * Seuls les champs documentes sont lus ; les autres restent dans le JSON brut. Un champ absent ({@code has} faux) est
 * note dans {@code absents} ; un champ present a null garde null. Aucune valeur inconnue n'est remplacee par 0.
 */
public final class FicheProduitParseur {

    private FicheProduitParseur() {
    }

    /** Texte de la reponse -> fiche. */
    public static FicheProduitUbipharm lire(String texte) throws ExtranetException {
        if (texte == null) {
            throw inattendue("réponse vide");
        }
        Object racine;
        try {
            racine = new JSONTokener(texte).nextValue();
        } catch (JSONException e) {
            throw inattendue("JSON illisible");
        }
        if (!(racine instanceof JSONObject)) {
            throw inattendue("objet JSON attendu à la racine");
        }
        FicheProduitUbipharm f = lire((JSONObject) racine);
        f.jsonBrut = texte;
        return f;
    }

    /** Racine JSON -> fiche. Leve REPONSE_INATTENDUE si {@code produit} ou {@code produit.pscode} manque. */
    public static FicheProduitUbipharm lire(JSONObject racine) throws ExtranetException {
        if (racine == null || !racine.has("produit") || !(racine.get("produit") instanceof JSONObject)) {
            throw inattendue("objet « produit » absent");
        }
        JSONObject p = racine.getJSONObject("produit");
        Object brut = p.opt("pscode");
        String pscode = brut instanceof String || brut instanceof Number ? texte(brut) : null;
        if (pscode == null || pscode.isEmpty()) {
            throw inattendue("« produit.pscode » absent ou vide");
        }
        FicheProduitUbipharm f = new FicheProduitUbipharm();
        f.jsonBrut = racine.toString();
        f.pscode = pscode;
        f.pslib = texte(p, "pslib", f);
        f.pslibc = texte(p, "pslibc", f);
        f.picode = texte(p, "picode", f);
        f.cmcode = texte(p, "cmcode", f);
        f.falib = texte(p, "falib", f);
        f.nalib = texte(p, "nalib", f);
        f.fslib = texte(p, "fslib", f);
        f.stlib = texte(p, "stlib", f);
        f.psdtcrBrut = texte(p, "psdtcr", f);
        f.pspvenBrut = texte(p, "pspven", f);
        f.pspven = montant(p.opt("pspven"));
        f.psppubBrut = texte(p, "psppub", f);
        f.psppub = montant(p.opt("psppub"));
        f.pspvigBrut = texte(p, "pspvig", f);
        f.pspvig = montant(p.opt("pspvig"));
        f.tvtauxBrut = texte(p, "tvtaux", f);
        f.tvtaux = montant(p.opt("tvtaux"));
        f.psstkSocBrut = texte(p, "psstkSoc", f);
        f.psstkSoc = entier(p.opt("psstkSoc"));
        f.nbProduitsSubstitutionBrut = texte(p, "nbProduitsSubstitution", f);
        f.nbProduitsSubstitution = entier(p.opt("nbProduitsSubstitution"));

        if (racine.has("cips")) {
            Object c = racine.get("cips");
            f.cipsBrut = jsonBrut(c);
            f.cips = cips(c);
        } else {
            f.absents.add("cips");
        }
        for (String n : FicheProduitUbipharm.LISTES_RACINE) {
            if (racine.has(n)) {
                f.listesBrutes.put(n, jsonBrut(racine.get(n)));
            } else {
                f.absents.add(n);
            }
        }
        String ps = FicheProduitUbipharm.LISTE_SUBSTITUTION;
        if (p.has(ps)) {
            f.listesBrutes.put(ps, jsonBrut(p.get(ps)));
        } else {
            f.absents.add(ps);
        }

        if (p.has("infosParEtablissement")) {
            Object i = p.get("infosParEtablissement");
            f.infosParEtablissementBrut = jsonBrut(i);
            if (i instanceof JSONArray) {
                List<StockAgenceUbipharm> l = new ArrayList<>();
                for (Object x : (JSONArray) i) {
                    if (!(x instanceof JSONObject)) {
                        /* element d'un schema inattendu : la liste entiere reste inconnue, le brut est garde */
                        l = null;
                        break;
                    }
                    l.add(agence((JSONObject) x));
                }
                f.agences = l;
            }
        } else {
            f.absents.add("infosParEtablissement");
        }
        return f;
    }

    static StockAgenceUbipharm agence(JSONObject o) {
        StockAgenceUbipharm a = new StockAgenceUbipharm();
        for (String c : StockAgenceUbipharm.CHAMPS) {
            if (!o.has(c)) {
                a.absents.add(c);
            }
        }
        a.envProduitBrut = o.has("envProduit") ? jsonBrut(o.get("envProduit")) : null;
        a.etcode = o.has("etcode") ? texte(o.get("etcode")) : null;
        a.etlib = o.has("etlib") ? texte(o.get("etlib")) : null;
        a.pectvpBrut = o.has("pectvp") ? jsonBrut(o.get("pectvp")) : null;
        a.psstkBrut = o.has("psstk") ? texte(o.get("psstk")) : null;
        a.psstk = entier(o.opt("psstk"));
        if (o.has("colisages")) {
            Object c = o.get("colisages");
            a.colisagesBrut = jsonBrut(c);
            a.colisages = colisages(c);
        }
        return a;
    }

    // ---------------------------------------------------------------- conversions

    private static String texte(JSONObject o, String cle, FicheProduitUbipharm f) {
        if (!o.has(cle)) {
            f.absents.add(cle);
            return null;
        }
        return texte(o.get(cle));
    }

    /**
     * Valeur scalaire en texte : chaine normalisee (blancs), nombre ecrit sans exposant, booleen en clair ; objet ou
     * liste en texte JSON ; null JSON -> null.
     */
    static String texte(Object v) {
        if (v == null || JSONObject.NULL.equals(v)) {
            return null;
        }
        if (v instanceof String) {
            return Normalisation.texte((String) v);
        }
        if (v instanceof Number) {
            return nombre((Number) v);
        }
        if (v instanceof Boolean) {
            return v.toString();
        }
        return jsonBrut(v);
    }

    /** Texte JSON exact d'une valeur (une chaine reste entre guillemets) ; null JSON -> « null ». */
    static String jsonBrut(Object v) {
        return JSONObject.valueToString(v == null ? JSONObject.NULL : v);
    }

    static String nombre(Number n) {
        if (n instanceof BigDecimal) {
            return ((BigDecimal) n).toPlainString();
        }
        if (n instanceof Double || n instanceof Float) {
            double d = n.doubleValue();
            if (Double.isNaN(d) || Double.isInfinite(d)) {
                return n.toString();
            }
            return BigDecimal.valueOf(d).toPlainString();
        }
        return n.toString();
    }

    /** Nombre JSON ou montant ecrit ; null si absent, null, inconnu ou illisible. */
    static BigDecimal montant(Object v) {
        if (v instanceof Number) {
            String t = nombre((Number) v);
            try {
                return new BigDecimal(t);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (v instanceof String) {
            return Normalisation.montant((String) v);
        }
        return null;
    }

    /** Entier (stock, nombre) ; null si absent, null, inconnu, decimal ou hors bornes. */
    static Integer entier(Object v) {
        if (v instanceof Number) {
            BigDecimal b = montant(v);
            if (b == null) {
                return null;
            }
            try {
                return b.intValueExact();
            } catch (ArithmeticException e) {
                return null;
            }
        }
        if (v instanceof String) {
            return Normalisation.entier((String) v);
        }
        return null;
    }

    /** cips : liste de valeurs scalaires gardees en chaines ; null si la forme n'est pas celle-la. */
    static List<String> cips(Object v) {
        if (!(v instanceof JSONArray)) {
            return null;
        }
        List<String> l = new ArrayList<>();
        for (Object x : (JSONArray) v) {
            if (x instanceof String) {
                l.add(Normalisation.texte((String) x));
            } else if (x instanceof Number && !(x instanceof BigDecimal) && !(x instanceof Double)
                    && !(x instanceof Float)) {
                l.add(x instanceof BigInteger ? x.toString() : nombre((Number) x));
            } else {
                return null;
            }
        }
        return l;
    }

    /**
     * Colisages : liste JSON d'entiers positifs, ou texte affiche (« 120, 140 », « N/A ») lu par
     * {@link Normalisation#colisages}. Une valeur illisible rend la liste inconnue (null) ; le brut est garde.
     */
    static List<Integer> colisages(Object v) {
        if (v instanceof String) {
            return Normalisation.colisages((String) v);
        }
        if (!(v instanceof JSONArray)) {
            return null;
        }
        List<Integer> l = new ArrayList<>();
        for (Object x : (JSONArray) v) {
            Integer n = x instanceof String ? Normalisation.entier((String) x) : x instanceof Number ? entier(x) : null;
            if (n == null || n < 0) {
                return null;
            }
            l.add(n);
        }
        return l;
    }

    private static ExtranetException inattendue(String detail) {
        return new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                "Fiche produit Ubipharm inattendue : " + detail);
    }
}
