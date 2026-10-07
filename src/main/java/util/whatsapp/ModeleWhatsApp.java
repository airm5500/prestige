package util.whatsapp;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Modele de message WhatsApp (API officielle de Meta), retours du 07/10 : hors de la fenetre de 24 h ouverte par le
 * client, seul un modele APPROUVE par Meta peut etre envoye. Cette classe, sans base ni reseau, controle un modele
 * selon les regles de Meta AVANT de le soumettre (un refus de Meta coute un aller-retour et parfois des jours), et
 * construit le corps de la soumission ({@code POST /{waba_id}/message_templates}).
 */
public final class ModeleWhatsApp {

    public static final String MARKETING = "MARKETING";
    public static final String UTILITY = "UTILITY";
    public static final String AUTHENTICATION = "AUTHENTICATION";

    private static final Pattern NOM = Pattern.compile("[a-z0-9_]{1,512}");
    private static final Pattern LANGUE = Pattern.compile("[a-z]{2,3}(_[A-Z]{2})?");
    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*(\\d+)\\s*\\}\\}");

    public String nom, langue, categorie, entete, corps, pied;
    /** Exemples des variables du corps, dans l'ordre ({{1}}, {{2}}...) : Meta les exige. */
    public List<String> exemples = new ArrayList<>();
    /** Boutons : {type: QUICK_REPLY | URL | PHONE_NUMBER, texte, valeur (url ou numero)}. */
    public List<String[]> boutons = new ArrayList<>();

    /** Erreurs bloquantes (vide = le modele peut etre soumis). */
    public List<String> erreurs() {
        List<String> e = new ArrayList<>();
        if (nom == null || !NOM.matcher(nom).matches()) {
            e.add("Nom : minuscules, chiffres et _ seulement (ex. rappel_traitement).");
        }
        if (langue == null || !LANGUE.matcher(langue).matches()) {
            e.add("Langue : code de Meta, ex. fr ou fr_FR.");
        }
        if (!MARKETING.equals(categorie) && !UTILITY.equals(categorie) && !AUTHENTICATION.equals(categorie)) {
            e.add("Catégorie : MARKETING, UTILITY ou AUTHENTICATION.");
        }
        if (StringUtils.isNotEmpty(entete)) {
            if (entete.length() > 60) {
                e.add("En-tête : 60 caractères au plus.");
            }
            if (variables(entete).size() > 1) {
                e.add("En-tête : une variable au plus.");
            }
        }
        if (StringUtils.isBlank(corps)) {
            e.add("Corps : obligatoire.");
        } else {
            if (corps.length() > 1024) {
                e.add("Corps : 1024 caractères au plus.");
            }
            List<Integer> v = variables(corps);
            for (int i = 0; i < v.size(); i++) {
                if (v.get(i) != i + 1) {
                    e.add("Corps : les variables doivent se suivre, {{1}}, {{2}}, {{3}}…");
                    break;
                }
            }
            String t = corps.trim();
            if (VARIABLE.matcher(t).lookingAt()
                    || Pattern.compile("\\{\\{\\s*\\d+\\s*\\}\\}[.!?]?$").matcher(t).find()) {
                e.add("Corps : ne doit ni commencer ni finir par une variable (règle de Meta).");
            }
            if (Pattern.compile("\\}\\}\\s*\\{\\{").matcher(t).find()) {
                e.add("Corps : deux variables ne peuvent pas se suivre sans texte entre elles.");
            }
            long nb = v.stream().distinct().count();
            if (exemples.size() < nb || exemples.stream().limit(nb).anyMatch(StringUtils::isBlank)) {
                e.add("Exemples : une valeur d'exemple par variable (Meta les demande pour valider).");
            }
            if (t.contains("\n\n\n")) {
                e.add("Corps : pas plus de deux retours à la ligne de suite.");
            }
        }
        if (StringUtils.isNotEmpty(pied)) {
            if (pied.length() > 60) {
                e.add("Pied : 60 caractères au plus.");
            }
            if (!variables(pied).isEmpty()) {
                e.add("Pied : pas de variable.");
            }
        }
        if (boutons.size() > 10) {
            e.add("Boutons : 10 au plus.");
        }
        int url = 0, tel = 0;
        for (String[] b : boutons) {
            String type = b[0], texte = b.length > 1 ? b[1] : null, val = b.length > 2 ? b[2] : null;
            if (StringUtils.isBlank(texte) || texte.length() > 25) {
                e.add("Bouton : un libellé de 1 à 25 caractères.");
            }
            if ("URL".equals(type)) {
                url++;
                if (val == null || !val.matches("https://\\S{4,1990}")) {
                    e.add("Bouton lien : une adresse https:// valide.");
                }
            } else if ("PHONE_NUMBER".equals(type)) {
                tel++;
                if (val == null || !val.matches("\\+?[0-9]{8,15}")) {
                    e.add("Bouton téléphone : un numéro international (ex. +2250708091011).");
                }
            } else if (!"QUICK_REPLY".equals(type)) {
                e.add("Bouton : type QUICK_REPLY, URL ou PHONE_NUMBER.");
            }
        }
        if (url > 2) {
            e.add("Boutons lien : 2 au plus.");
        }
        if (tel > 1) {
            e.add("Bouton téléphone : 1 au plus.");
        }
        return e;
    }

    static List<Integer> variables(String texte) {
        List<Integer> l = new ArrayList<>();
        Matcher m = VARIABLE.matcher(texte == null ? "" : texte);
        while (m.find()) {
            l.add(Integer.parseInt(m.group(1)));
        }
        return l;
    }

    /** Corps de la soumission a Meta. */
    public JSONObject soumission() {
        JSONArray composants = new JSONArray();
        if (StringUtils.isNotEmpty(entete)) {
            composants.put(new JSONObject().put("type", "HEADER").put("format", "TEXT").put("text", entete));
        }
        JSONObject c = new JSONObject().put("type", "BODY").put("text", corps);
        long nb = variables(corps).stream().distinct().count();
        if (nb > 0) {
            c.put("example", new JSONObject().put("body_text",
                    new JSONArray().put(new JSONArray(exemples.subList(0, (int) nb)))));
        }
        composants.put(c);
        if (StringUtils.isNotEmpty(pied)) {
            composants.put(new JSONObject().put("type", "FOOTER").put("text", pied));
        }
        if (!boutons.isEmpty()) {
            JSONArray bs = new JSONArray();
            for (String[] b : boutons) {
                JSONObject x = new JSONObject().put("type", b[0]).put("text", b[1]);
                if ("URL".equals(b[0])) {
                    x.put("url", b[2]);
                } else if ("PHONE_NUMBER".equals(b[0])) {
                    x.put("phone_number", b[2]);
                }
                bs.put(x);
            }
            composants.put(new JSONObject().put("type", "BUTTONS").put("buttons", bs));
        }
        return new JSONObject().put("name", nom).put("language", langue).put("category", categorie).put("components",
                composants);
    }

    /** Statut de Meta traduit pour l'ecran. */
    public static String statutLisible(String statut) {
        switch (StringUtils.defaultString(statut).toUpperCase()) {
        case "APPROVED":
            return "Approuvé";
        case "PENDING":
        case "IN_APPEAL":
            return "En attente de Meta";
        case "REJECTED":
            return "Rejeté";
        case "PAUSED":
            return "En pause (qualité)";
        case "DISABLED":
            return "Désactivé";
        case "BROUILLON":
            return "Brouillon";
        default:
            return StringUtils.defaultIfBlank(statut, "Brouillon");
        }
    }
}
