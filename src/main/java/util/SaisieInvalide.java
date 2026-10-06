package util;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Controle de saisie (07/10) : distinguer une erreur due a ce que l'UTILISATEUR a tape (une date illisible, des lettres
 * dans un nombre) d'une vraie panne du programme.
 * <p>
 * Une lecture de l'API qui recoit « abc » dans un champ date levait une exception : erreur interne (HTTP 500),
 * evenement au Centre de support, et rien de comprehensible a l'ecran. Desormais, quand la valeur qui n'a pas pu etre
 * lue est EXACTEMENT l'une des valeurs envoyees par l'ecran (parametre ou morceau d'adresse), c'est une saisie invalide
 * : refus propre (HTTP 400) avec la valeur en cause. Toute autre erreur reste une erreur interne, signalee comme avant
 * (une valeur illisible venue de la base, par exemple, n'est PAS masquee).
 */
public final class SaisieInvalide {

    private static final Pattern NOMBRE = Pattern.compile("For input string: \"(.*)\"", Pattern.DOTALL);

    private SaisieInvalide() {
    }

    /** Texte qui n'a pas pu etre lu (date ou nombre), ou null si l'erreur n'est pas une erreur de lecture. */
    public static String valeurIllisible(Throwable racine) {
        if (racine instanceof DateTimeParseException) {
            return ((DateTimeParseException) racine).getParsedString();
        }
        if (racine instanceof NumberFormatException) {
            String m = racine.getMessage();
            if (m == null) {
                return null;
            }
            if ("empty String".equals(m) || "Zero length string".equals(m)) {
                return "";
            }
            Matcher x = NOMBRE.matcher(m);
            return x.find() ? x.group(1) : null;
        }
        return null;
    }

    /** Vrai si le texte est l'une des valeurs saisies : parametre de la requete ou morceau de l'adresse. */
    public static boolean estSaisie(String texte, Map<String, String[]> parametres, String adresse) {
        if (texte == null) {
            return false;
        }
        if (parametres != null) {
            for (String[] valeurs : parametres.values()) {
                if (valeurs != null) {
                    for (String v : valeurs) {
                        if (texte.equals(v) || (v != null && texte.equals(v.trim()))) {
                            return true;
                        }
                    }
                }
            }
        }
        if (adresse != null && !texte.isEmpty()) {
            for (String morceau : adresse.split("/")) {
                try {
                    if (texte.equals(URLDecoder.decode(morceau, StandardCharsets.UTF_8.name()))) {
                        return true;
                    }
                } catch (Exception e) {
                    /* morceau mal encode : on passe au suivant */
                }
            }
        }
        return false;
    }

    /** Message affiche : la valeur en cause, raccourcie. */
    public static String message(String texte) {
        if (texte == null || texte.trim().isEmpty()) {
            return "Un champ obligatoire est vide (date ou nombre attendu).";
        }
        String t = texte.length() > 40 ? texte.substring(0, 40) + "…" : texte;
        return "Valeur saisie invalide : « " + t + " » (date ou nombre attendu).";
    }
}
