package avisclients;

import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONObject;

/**
 * Avis tel qu'envoye par la page publique, controle et nettoye. Toute valeur inattendue est ecartee (critere inconnu,
 * note hors 1..5, coordonnees mal formees) ; seule la note est obligatoire.
 */
public final class Saisie {

    public static final String[] CRITERES = { "ACCUEIL", "ATTENTE", "CONSEIL", "DISPONIBILITE", "PRIX", "PROPRETE" };
    public static final int MAX_TEXTE = 1500, MAX_EMPLOYE = 60, MAX_NOM = 60;

    public final int note;
    public final Map<String, String> criteres;
    public final String texte, employe, nom, telephone, email;
    public final boolean anonyme, rappel;
    /** Vrai si l'envoi a tout d'un robot (piege rempli, page remplie en moins de 2 secondes) : on l'ignore. */
    public final boolean robot;

    private Saisie(int note, Map<String, String> criteres, String texte, String employe, boolean anonyme, String nom,
            String telephone, String email, boolean rappel, boolean robot) {
        this.note = note;
        this.criteres = criteres;
        this.texte = texte;
        this.employe = employe;
        this.anonyme = anonyme;
        this.nom = nom;
        this.telephone = telephone;
        this.email = email;
        this.rappel = rappel;
        this.robot = robot;
    }

    /**
     * Lit le corps JSON de la page. Exception {@link IllegalArgumentException} (message pour le client) si invalide.
     */
    public static Saisie lire(JSONObject j) {
        if (j == null) {
            throw new IllegalArgumentException("Avis vide.");
        }
        int note = j.optInt("note", 0);
        if (note < 1 || note > 5) {
            throw new IllegalArgumentException("Choisissez une note de 1 à 5 étoiles.");
        }
        Map<String, String> criteres = new LinkedHashMap<>();
        JSONObject c = j.optJSONObject("criteres");
        if (c != null) {
            for (String k : CRITERES) {
                String v = c.optString(k, "");
                if ("PLUS".equals(v) || "MOINS".equals(v)) {
                    criteres.put(k, v);
                }
            }
        }
        boolean anonyme = j.optBoolean("anonyme", true);
        String nom = anonyme ? null : Texte.ligne(j.optString("nom", null), MAX_NOM);
        String tel = anonyme ? null : Texte.telephone(j.optString("telephone", null));
        String mail = anonyme ? null : Texte.email(j.optString("email", null));
        if (!anonyme && j.optString("telephone", "").trim().length() > 0 && tel == null) {
            throw new IllegalArgumentException("Le numéro de téléphone ne semble pas valide.");
        }
        if (!anonyme && j.optString("email", "").trim().length() > 0 && mail == null) {
            throw new IllegalArgumentException("L'adresse e-mail ne semble pas valide.");
        }
        boolean sansCoordonnees = nom == null && tel == null && mail == null;
        boolean robot = j.optString("site", "").length() > 0 || j.optLong("duree", 0) < 2000;
        return new Saisie(note, criteres, Texte.libre(j.optString("texte", null), MAX_TEXTE),
                Texte.ligne(j.optString("employe", null), MAX_EMPLOYE), anonyme || sansCoordonnees, nom, tel, mail,
                !anonyme && j.optBoolean("rappel", false) && (tel != null || mail != null), robot);
    }

    /** Criteres sous la forme stockee : ACCUEIL=PLUS,ATTENTE=MOINS. */
    public String criteresTexte() {
        StringBuilder b = new StringBuilder();
        criteres.forEach((k, v) -> b.append(b.length() == 0 ? "" : ",").append(k).append('=').append(v));
        return b.length() == 0 ? null : b.toString();
    }

    /** Relit la forme stockee des criteres. */
    public static Map<String, String> criteres(String stocke) {
        Map<String, String> m = new LinkedHashMap<>();
        if (stocke != null) {
            for (String p : stocke.split(",")) {
                int i = p.indexOf('=');
                if (i > 0) {
                    m.put(p.substring(0, i), p.substring(i + 1));
                }
            }
        }
        return m;
    }
}
