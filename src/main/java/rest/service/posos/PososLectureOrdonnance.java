package rest.service.posos;

import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * LECTURE D'UNE ORDONNANCE SCANNEE par Posos (retour du 30/09) : ce que Posos a reconnu sur la photo ou le PDF, ramene
 * a une forme simple pour l'ecran de scan.
 *
 * <p>
 * Comme {@link PososLecteur}, la lecture est TOLERANTE : la forme exacte de la reponse n'a pas pu etre verifiee contre
 * le service reel (documentation et acces non fournis). Chaque champ est cherche sous plusieurs noms, francais et
 * anglais ; ce qui n'est pas reconnu est ignore. Les tests decrivent chaque forme acceptee.
 *
 * <p>
 * Forme rendue :
 *
 * <pre>
 * {"produits": [{"texte", "posologie", "quantite", "duree", "confiance"}],
 *  "patient": {"nom", "age", "naissance"}, "prescripteur": {"nom"}, "dateOrdonnance"}
 * </pre>
 */
public final class PososLectureOrdonnance {

    private static final String[] CLES_PRODUITS = { "produits", "products", "medications", "medicaments", "drugs",
            "lines", "lignes", "prescriptionLines", "items" };
    private static final String[] CLES_NOM_PRODUIT = { "nom", "name", "libelle", "label", "drug", "product",
            "medication", "text", "texte", "raw" };
    private static final String[] CLES_POSOLOGIE = { "posologie", "posology", "dosage", "instructions", "sig",
            "frequency" };
    private static final String[] CLES_QUANTITE = { "quantite", "quantity", "qty", "boxes", "boites" };
    private static final String[] CLES_DUREE = { "duree", "duration" };
    private static final String[] CLES_CONFIANCE = { "confiance", "confidence", "score", "certainty" };
    private static final String[] CLES_PATIENT = { "patient", "beneficiaire", "beneficiary" };
    private static final String[] CLES_PRESCRIPTEUR = { "prescripteur", "prescriber", "doctor", "medecin",
            "physician" };
    private static final String[] CLES_NOM_PERSONNE = { "nom", "name", "fullName", "nomComplet", "lastName" };
    private static final String[] CLES_DATE = { "dateOrdonnance", "prescriptionDate", "date", "issuedAt" };

    private PososLectureOrdonnance() {
    }

    public static JSONObject lire(JSONObject reponse) {
        JSONObject sortie = new JSONObject();
        JSONArray produits = new JSONArray();
        JSONArray brut = tableau(reponse, CLES_PRODUITS, 0);
        for (int i = 0; brut != null && i < brut.length(); i++) {
            Object o = brut.opt(i);
            JSONObject l = new JSONObject();
            if (o instanceof String) {
                l.put("texte", ((String) o).trim());
            } else if (o instanceof JSONObject) {
                JSONObject p = (JSONObject) o;
                String nom = texte(p, CLES_NOM_PRODUIT);
                if (nom == null) {
                    continue;
                }
                l.put("texte", nom);
                putSi(l, "posologie", texte(p, CLES_POSOLOGIE));
                putSi(l, "duree", texte(p, CLES_DUREE));
                Double q = nombre(p, CLES_QUANTITE);
                if (q != null && q > 0) {
                    l.put("quantite", (int) Math.round(q));
                }
                Double c = nombre(p, CLES_CONFIANCE);
                if (c != null) {
                    /* 0-1 ou 0-100 selon les services : ramene a 0-1. */
                    l.put("confiance", c > 1 ? c / 100.0 : c);
                }
            } else {
                continue;
            }
            if (!l.optString("texte", "").isEmpty()) {
                produits.put(l);
            }
        }
        sortie.put("produits", produits);
        JSONObject patient = objet(reponse, CLES_PATIENT);
        if (patient != null) {
            JSONObject pa = new JSONObject();
            String nom = texte(patient, CLES_NOM_PERSONNE);
            String prenom = texte(patient, new String[] { "prenom", "prenoms", "firstName", "givenName" });
            if (nom != null || prenom != null) {
                pa.put("nom", ((nom == null ? "" : nom) + " " + (prenom == null ? "" : prenom)).trim());
            }
            Double age = nombre(patient, new String[] { "age", "ageAnnees", "ageYears" });
            if (age != null && age >= 0) {
                pa.put("age", (int) Math.floor(age));
            }
            putSi(pa, "naissance",
                    texte(patient, new String[] { "naissance", "dateNaissance", "birthDate", "dateOfBirth" }));
            sortie.put("patient", pa);
        }
        JSONObject prescripteur = objet(reponse, CLES_PRESCRIPTEUR);
        if (prescripteur != null) {
            String nom = texte(prescripteur, CLES_NOM_PERSONNE);
            if (nom != null) {
                sortie.put("prescripteur", new JSONObject().put("nom", nom));
            }
        } else {
            String nom = texte(reponse, CLES_PRESCRIPTEUR);
            if (nom != null) {
                sortie.put("prescripteur", new JSONObject().put("nom", nom));
            }
        }
        putSi(sortie, "dateOrdonnance", texte(reponse, CLES_DATE));
        return sortie;
    }

    /** Le premier tableau trouve sous l'un des noms, en profondeur (enveloppes « data », « result »...). */
    private static JSONArray tableau(JSONObject o, String[] cles, int profondeur) {
        if (o == null || profondeur > 4) {
            return null;
        }
        for (String c : cles) {
            JSONArray a = o.optJSONArray(c);
            if (a != null) {
                return a;
            }
        }
        Iterator<String> it = o.keys();
        while (it.hasNext()) {
            Object v = o.opt(it.next());
            if (v instanceof JSONObject) {
                JSONArray a = tableau((JSONObject) v, cles, profondeur + 1);
                if (a != null) {
                    return a;
                }
            }
        }
        return null;
    }

    /** Le premier objet trouve sous l'un des noms, en profondeur. */
    private static JSONObject objet(JSONObject o, String[] cles) {
        return objet(o, cles, 0);
    }

    private static JSONObject objet(JSONObject o, String[] cles, int profondeur) {
        if (o == null || profondeur > 4) {
            return null;
        }
        for (String c : cles) {
            JSONObject x = o.optJSONObject(c);
            if (x != null) {
                return x;
            }
        }
        Iterator<String> it = o.keys();
        while (it.hasNext()) {
            Object v = o.opt(it.next());
            if (v instanceof JSONObject) {
                JSONObject x = objet((JSONObject) v, cles, profondeur + 1);
                if (x != null) {
                    return x;
                }
            }
        }
        return null;
    }

    private static String texte(JSONObject o, String[] cles) {
        for (String c : cles) {
            Object v = o.opt(c);
            if (v instanceof String && !((String) v).trim().isEmpty()) {
                return ((String) v).trim();
            }
            if (v instanceof Number) {
                return String.valueOf(v);
            }
        }
        return null;
    }

    private static Double nombre(JSONObject o, String[] cles) {
        for (String c : cles) {
            Object v = o.opt(c);
            if (v instanceof Number) {
                return ((Number) v).doubleValue();
            }
            if (v instanceof String) {
                try {
                    return Double.valueOf(((String) v).trim().replace(',', '.'));
                } catch (NumberFormatException e) {
                    /* Un texte (« 2 boites ») n'est pas un nombre : on passe au nom suivant. */
                }
            }
        }
        return null;
    }

    private static void putSi(JSONObject o, String cle, String valeur) {
        if (valeur != null && !valeur.trim().isEmpty()) {
            o.put(cle, valeur.trim());
        }
    }
}
