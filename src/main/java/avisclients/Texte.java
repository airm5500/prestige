package avisclients;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Nettoyage des saisies de la page publique d'avis. La page est ouverte a tous : rien de ce qu'elle envoie n'est cru.
 * Les valeurs passent ensuite en parametres lies (jamais concatenees dans une requete) et sont encodees a l'affichage ;
 * ce nettoyage retire en plus ce qu'aucune saisie honnete ne contient.
 */
public final class Texte {

    /* caracteres de controle (sauf saut de ligne), largeur nulle, sens d'ecriture force, BOM */
    private static final Pattern INVISIBLES = Pattern
            .compile("[\\p{Cntrl}&&[^\\n]]|[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF]");
    private static final Pattern BALISES = Pattern.compile("<[^>]{0,200}>");
    private static final Pattern ESPACES = Pattern.compile("[ \\t\\u00A0]+");
    private static final Pattern LIGNES = Pattern.compile("\\n{3,}");
    private static final Pattern ACCENTS = Pattern.compile("\\p{M}+");

    private Texte() {
    }

    /** Texte libre : sauts de ligne gardes (deux au plus de suite), balises retirees, borne a max caracteres. */
    public static String libre(String v, int max) {
        if (v == null) {
            return null;
        }
        String s = Normalizer.normalize(v, Normalizer.Form.NFC).replace("\r\n", "\n").replace('\r', '\n');
        s = INVISIBLES.matcher(s).replaceAll("");
        s = BALISES.matcher(s).replaceAll(" ");
        s = ESPACES.matcher(s).replaceAll(" ");
        s = LIGNES.matcher(s).replaceAll("\n\n").trim();
        if (s.length() > max) {
            s = s.substring(0, max).trim();
        }
        return s.isEmpty() ? null : s;
    }

    /** Champ d'une ligne (nom, employe) : comme {@link #libre} sans saut de ligne. */
    public static String ligne(String v, int max) {
        String s = libre(v == null ? null : v.replace('\n', ' ').replace('\r', ' '), max);
        return s == null ? null : ESPACES.matcher(s).replaceAll(" ");
    }

    /** Telephone : chiffres, +, espaces, points, tirets, parentheses ; 6 a 20 caracteres ; sinon null. */
    public static String telephone(String v) {
        String s = ligne(v, 40);
        if (s == null || !s.matches("[+0-9 ().-]{6,20}") || s.replaceAll("\\D", "").length() < 6) {
            return null;
        }
        return s;
    }

    /** E-mail de forme simple, 80 caracteres au plus ; sinon null. */
    public static String email(String v) {
        String s = ligne(v, 120);
        if (s == null || s.length() > 80 || !s.matches("[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")) {
            return null;
        }
        return s.toLowerCase(Locale.ROOT);
    }

    /** Forme de comparaison : minuscules, sans accent, ponctuation remplacee par des espaces. */
    public static String plat(String v) {
        if (v == null) {
            return "";
        }
        String s = ACCENTS.matcher(Normalizer.normalize(v, Normalizer.Form.NFD)).replaceAll("");
        return s.toLowerCase(Locale.ROOT).replace('\'', ' ').replace('’', ' ').replaceAll("[^a-z0-9]+", " ").trim();
    }

    /** Neutralise une cellule d'export tableur qui commencerait comme une formule (=, +, -, @). */
    public static String cellule(String v) {
        if (v == null) {
            return "";
        }
        return !v.isEmpty() && "=+-@\t".indexOf(v.charAt(0)) >= 0 ? "'" + v : v;
    }
}
