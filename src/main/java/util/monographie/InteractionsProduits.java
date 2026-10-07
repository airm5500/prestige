package util.monographie;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Interactions entre les produits d'une vente ou d'une ordonnance (retours du 07/10), a partir de la rubrique 3 de
 * chaque produit lue par {@link FichePharmagora}. Calcul pur (InteractionsProduitsTest).
 *
 * Une classe C du produit A est signalee en interaction avec une classe K ; si K est une classe du produit B, la paire
 * (A, B) recoit une alerte : niveau, analyse et conseil au dispensateur. Les noms de classes sont compares sans accents
 * ni casse, et un « ? » de la source (accent perdu) vaut n'importe quelle lettre. Une meme paire vue des deux cotes
 * n'est rendue qu'une fois ; les alertes sont triees de la plus grave a la moins grave.
 */
public final class InteractionsProduits {

    /** Un produit : identifiant, nom affiche et fiche « interactions » (sortie de FichePharmagora, rubrique 3). */
    public static final class Produit {
        final String id, nom;
        final JSONObject fiche;

        public Produit(String id, String nom, JSONObject fiche) {
            this.id = id;
            this.nom = nom;
            this.fiche = fiche;
        }

        List<String> classes() {
            List<String> l = new ArrayList<>();
            JSONArray a = fiche == null ? new JSONArray() : fiche.optJSONArray("interactions");
            for (int i = 0; a != null && i < a.length(); i++) {
                l.add(a.getJSONObject(i).optString("classe"));
            }
            return l;
        }
    }

    private InteractionsProduits() {
    }

    public static JSONArray alertes(List<Produit> produits) {
        List<JSONObject> out = new ArrayList<>();
        Set<String> vues = new HashSet<>();
        for (Produit a : produits) {
            JSONArray classesA = a.fiche == null ? null : a.fiche.optJSONArray("interactions");
            for (int i = 0; classesA != null && i < classesA.length(); i++) {
                JSONObject ca = classesA.getJSONObject(i);
                JSONArray avec = ca.optJSONArray("avec");
                for (int j = 0; avec != null && j < avec.length(); j++) {
                    JSONObject x = avec.getJSONObject(j);
                    for (Produit b : produits) {
                        if (b == a || b.id.equals(a.id)) {
                            continue;
                        }
                        for (String cb : b.classes()) {
                            if (!memeClasse(x.optString("classe"), cb)) {
                                continue;
                            }
                            String cle = paire(a.id, b.id) + "|" + paire(cle(ca.optString("classe")), cle(cb));
                            if (!vues.add(cle)) {
                                continue;
                            }
                            out.add(new JSONObject().put("produitA", a.id).put("nomA", a.nom).put("produitB", b.id)
                                    .put("nomB", b.nom).put("classeA", ca.optString("classe")).put("classeB", cb)
                                    .put("niveau", x.optString("niveau")).put("gravite", x.optInt("gravite"))
                                    .put("analyse", x.optString("analyse", ""))
                                    .put("conseilDispensateur", x.optString("conseilDispensateur", ""))
                                    .put("conseilPrescripteur", x.optString("conseilPrescripteur", "")));
                        }
                    }
                }
            }
        }
        out.sort((p, q) -> Integer.compare(q.getInt("gravite"), p.getInt("gravite")));
        return new JSONArray(out);
    }

    private static String paire(String x, String y) {
        return x.compareTo(y) <= 0 ? x + "~" + y : y + "~" + x;
    }

    static String cle(String s) {
        String n = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase().replaceAll("[^a-z0-9?]+", " ").trim();
    }

    /** Meme classe, sans accents ni casse ; « ? » (accent perdu a la source) vaut un caractere quelconque. */
    static boolean memeClasse(String x, String y) {
        String a = cle(x), b = cle(y);
        if (a.isEmpty() || b.isEmpty() || a.length() != b.length()) {
            return a.equals(b) && !a.isEmpty();
        }
        for (int i = 0; i < a.length(); i++) {
            char p = a.charAt(i), q = b.charAt(i);
            if (p != q && p != '?' && q != '?') {
                return false;
            }
        }
        return true;
    }
}
