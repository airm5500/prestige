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

    /**
     * Les autres erreurs qui viennent de la SAISIE, reconnues a leur nature ET a une valeur envoyee qui les explique
     * (sinon : erreur interne, comme avant). Rend le message a afficher, ou null.
     * <ul>
     * <li>emoji ou symbole hors du jeu de caracteres de la base dans une recherche (« Illegal mix of collations »)
     * ;</li>
     * <li>numero de ligne ou de page negatif (start=-5) ;</li>
     * <li>date impossible dans un champ date (2026-13-45, 31/02, « abc ») qui a echappe a la lecture.</li>
     * </ul>
     */
    public static String autreSaisie(Throwable racine, Map<String, String[]> parametres) {
        if (racine == null || parametres == null || parametres.isEmpty()) {
            return null;
        }
        String m = racine.getMessage() == null ? "" : racine.getMessage();
        if (m.contains("Illegal mix of collations") && contient(parametres, SaisieInvalide::horsJeuDeCaracteres)) {
            return "Les émojis et symboles spéciaux ne sont pas acceptés dans la saisie.";
        }
        if ((m.contains("first-result value cannot be negative") || racine instanceof IndexOutOfBoundsException)
                && contient(parametres, v -> v.trim().matches("-\\d+") && m.contains(v.trim()))) {
            return "Numéro de page ou de ligne invalide.";
        }
        boolean erreurDeDate = racine instanceof java.time.DateTimeException
                || (racine instanceof IllegalArgumentException
                        && (m.startsWith("Timestamp format must be") || m.startsWith("Format de date invalide")));
        if (erreurDeDate) {
            for (Map.Entry<String, String[]> e : parametres.entrySet()) {
                if (champDate(e.getKey()) && e.getValue() != null) {
                    for (String v : e.getValue()) {
                        if (v != null && !v.trim().isEmpty() && !dateLisible(v.trim())) {
                            return message(v);
                        }
                    }
                }
            }
        }
        return null;
    }

    static boolean horsJeuDeCaracteres(String v) {
        return v.codePoints().anyMatch(c -> c > 0xFFFF);
    }

    private static boolean contient(Map<String, String[]> parametres, java.util.function.Predicate<String> test) {
        for (String[] valeurs : parametres.values()) {
            if (valeurs != null) {
                for (String v : valeurs) {
                    if (v != null && test.test(v)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    static boolean champDate(String nom) {
        return nom != null && nom.toLowerCase(java.util.Locale.ROOT)
                .matches(".*(dt|date|jour|debut|fin|start|end|mois|periode|annee|semaine|du|au).*");
    }

    static boolean dateLisible(String v) {
        try {
            java.time.LocalDate.parse(v.length() > 10 ? v.substring(0, 10) : v);
            return true;
        } catch (java.time.format.DateTimeParseException e) {
            return false;
        }
    }

    /**
     * Parametres de l'adresse relus en UTF-8 depuis la requete brute : le serveur d'application les decode en Latin-1,
     * ce qui deforme les accents et les emojis (l'egalite avec la valeur fautive echouerait). Les parametres deja
     * connus (formulaire) sont conserves.
     */
    public static Map<String, String[]> parametresUtf8(String requeteBrute, Map<String, String[]> connus) {
        Map<String, String[]> p = new java.util.LinkedHashMap<>();
        if (connus != null) {
            p.putAll(connus);
        }
        if (requeteBrute == null || requeteBrute.isEmpty()) {
            return p;
        }
        Map<String, java.util.List<String>> lus = new java.util.LinkedHashMap<>();
        for (String paire : requeteBrute.split("&")) {
            int i = paire.indexOf('=');
            try {
                String nom = URLDecoder.decode(i < 0 ? paire : paire.substring(0, i), StandardCharsets.UTF_8.name());
                String val = i < 0 ? "" : URLDecoder.decode(paire.substring(i + 1), StandardCharsets.UTF_8.name());
                lus.computeIfAbsent(nom, k -> new java.util.ArrayList<>()).add(val);
            } catch (Exception e) {
                /* morceau mal encode : ignore */
            }
        }
        lus.forEach((k, v) -> p.put(k, v.toArray(new String[0])));
        return p;
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
