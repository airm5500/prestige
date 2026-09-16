package rest.service.posos;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Lecture d'une reponse Posos.
 *
 * <p>
 * La forme exacte de la reponse n'a pas pu etre verifiee contre le service reel : la documentation de Posos n'est pas
 * joignable depuis l'environnement de developpement, et les acces de recette ne sont pas encore fournis. Plutot que de
 * figer une forme devinee - qui casserait au premier appel reel - la lecture est TOLERANTE :
 *
 * <ul>
 * <li>les alertes sont cherchees en profondeur, sous l'un des noms usuels, quelle que soit l'imbrication ;</li>
 * <li>chaque champ est lu sous plusieurs noms possibles, francais et anglais ;</li>
 * <li>ce qui n'est pas reconnu n'interrompt rien : on rend ce qu'on a compris.</li>
 * </ul>
 *
 * <p>
 * Quand les acces de recette seront disponibles, il suffira d'ajouter le nom reel dans les listes ci-dessous - ou de
 * les reduire a ce seul nom. Les tests decrivent chaque forme acceptee, ils servent de contrat.
 */
final class PososLecteur {

    /** Noms sous lesquels un tableau d'alertes est cherche, dans cet ordre de preference. */
    private static final String[] CLES_ALERTES = { "alertes", "alerts", "interactions", "warnings", "issues",
            "findings", "results", "analysis", "data", "items" };

    private static final String[] CLES_TYPE = { "type", "category", "categorie", "kind", "nature" };
    private static final String[] CLES_GRAVITE = { "gravite", "gravity", "severity", "severite", "level", "niveau",
            "risk" };
    private static final String[] CLES_LIBELLE = { "libelle", "label", "description", "message", "title", "titre",
            "text", "texte", "summary" };
    private static final String[] CLES_RECO = { "recommandation", "recommendation", "advice", "conseil", "action",
            "comment", "commentaire", "management" };
    private static final String[] CLES_PRODUITS = { "produits", "products", "drugs", "medications", "medicaments",
            "substances", "molecules" };
    private static final String[] CLES_NON_RECONNUS = { "produitsNonReconnus", "unmatched", "unknown", "notFound",
            "unrecognized", "unmatchedProducts" };
    private static final String[] CLES_NOM = { "nom", "name", "label", "libelle", "denomination" };

    private PososLecteur() {
    }

    static PososResultat lire(JSONObject racine) {
        PososResultat resultat = new PososResultat();
        resultat.setDisponible(true);
        if (racine == null) {
            resultat.setMessage("Réponse vide de Posos");
            return resultat;
        }
        JSONArray brutes = chercherTableau(racine, CLES_ALERTES, 0);
        List<PososResultat.Alerte> alertes = new ArrayList<>();
        if (brutes != null) {
            for (int i = 0; i < brutes.length(); i++) {
                JSONObject o = brutes.optJSONObject(i);
                if (o == null) {
                    // Un tableau de chaines : on garde le texte comme libelle, gravite inconnue donc majeure.
                    String texte = brutes.optString(i, null);
                    if (texte != null && !texte.trim().isEmpty()) {
                        PososResultat.Alerte a = new PososResultat.Alerte();
                        a.setLibelle(texte.trim());
                        alertes.add(a);
                    }
                    continue;
                }
                PososResultat.Alerte a = new PososResultat.Alerte();
                a.setType(premier(o, CLES_TYPE));
                a.setGravite(premier(o, CLES_GRAVITE));
                a.setLibelle(premier(o, CLES_LIBELLE));
                a.setRecommandation(premier(o, CLES_RECO));
                a.setProduits(noms(o, CLES_PRODUITS));
                if (a.getLibelle() == null && a.getType() == null && a.getProduits().isEmpty()) {
                    continue; // element sans rien d'exploitable
                }
                alertes.add(a);
            }
        }
        resultat.setAlertes(alertes);
        resultat.setProduitsNonReconnus(noms(racine, CLES_NON_RECONNUS));
        if (alertes.isEmpty()) {
            resultat.setMessage("Aucune alerte signalée par Posos");
        }
        return resultat;
    }

    /** Cherche en profondeur le premier tableau porte par l'une des cles. */
    private static JSONArray chercherTableau(JSONObject objet, String[] cles, int profondeur) {
        if (objet == null || profondeur > 6) {
            return null;
        }
        for (String cle : cles) {
            JSONArray direct = tableauInsensible(objet, cle);
            if (direct != null && direct.length() > 0) {
                return direct;
            }
        }
        // Rien a ce niveau : on descend dans les objets et les tableaux d'objets.
        for (String cle : objet.keySet()) {
            Object valeur = objet.opt(cle);
            if (valeur instanceof JSONObject) {
                JSONArray trouve = chercherTableau((JSONObject) valeur, cles, profondeur + 1);
                if (trouve != null) {
                    return trouve;
                }
            } else if (valeur instanceof JSONArray) {
                JSONArray tableau = (JSONArray) valeur;
                for (int i = 0; i < tableau.length(); i++) {
                    JSONObject element = tableau.optJSONObject(i);
                    if (element != null) {
                        JSONArray trouve = chercherTableau(element, cles, profondeur + 1);
                        if (trouve != null) {
                            return trouve;
                        }
                    }
                }
            }
        }
        return null;
    }

    private static JSONArray tableauInsensible(JSONObject objet, String cle) {
        for (String k : objet.keySet()) {
            if (k.equalsIgnoreCase(cle)) {
                Object v = objet.opt(k);
                if (v instanceof JSONArray) {
                    return (JSONArray) v;
                }
            }
        }
        return null;
    }

    /** Premiere valeur texte non vide parmi les cles donnees, comparaison insensible a la casse. */
    private static String premier(JSONObject objet, String[] cles) {
        for (String cle : cles) {
            for (String k : objet.keySet()) {
                if (!k.equalsIgnoreCase(cle)) {
                    continue;
                }
                Object v = objet.opt(k);
                if (v == null || v == JSONObject.NULL) {
                    continue;
                }
                if (v instanceof JSONObject) {
                    String imbrique = premier((JSONObject) v, CLES_NOM);
                    if (imbrique != null) {
                        return imbrique;
                    }
                    continue;
                }
                if (v instanceof JSONArray) {
                    continue;
                }
                String texte = String.valueOf(v).trim();
                if (!texte.isEmpty()) {
                    return texte;
                }
            }
        }
        return null;
    }

    /**
     * Liste de noms : accepte un tableau de chaines, un tableau d'objets portant un nom, ou une chaine unique.
     */
    private static List<String> noms(JSONObject objet, String[] cles) {
        List<String> liste = new ArrayList<>();
        for (String cle : cles) {
            for (String k : objet.keySet()) {
                if (!k.equalsIgnoreCase(cle)) {
                    continue;
                }
                Object v = objet.opt(k);
                if (v instanceof JSONArray) {
                    JSONArray t = (JSONArray) v;
                    for (int i = 0; i < t.length(); i++) {
                        JSONObject e = t.optJSONObject(i);
                        String nom = e != null ? premier(e, CLES_NOM) : t.optString(i, null);
                        if (nom != null && !nom.trim().isEmpty() && !liste.contains(nom.trim())) {
                            liste.add(nom.trim());
                        }
                    }
                } else if (v != null && v != JSONObject.NULL && !(v instanceof JSONObject)) {
                    String nom = String.valueOf(v).trim();
                    if (!nom.isEmpty() && !liste.contains(nom)) {
                        liste.add(nom);
                    }
                }
                if (!liste.isEmpty()) {
                    return liste;
                }
            }
        }
        return liste;
    }
}
