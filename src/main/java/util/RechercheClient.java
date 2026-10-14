package util;

import org.apache.commons.lang3.StringUtils;

/**
 * Retours du 13/10 (point 11) : recherche des clients « commence par » (par defaut, comme avant) ou « contient », et
 * par numero (telephone, code interne, matricule) saisi avec ou sans separateurs.
 */
public final class RechercheClient {

    public static final String COMMENCE = "commence";
    public static final String CONTIENT = "contient";

    private RechercheClient() {
    }

    public static boolean contient(String mode) {
        return CONTIENT.equalsIgnoreCase(StringUtils.trimToEmpty(mode));
    }

    /**
     * Motif LIKE de la saisie : « x% » (commence par) ou « %x% » (contient) ; espaces parasites ignores. Un « % » tape
     * par l'utilisateur reste un joker, comme avant.
     */
    public static String motif(String saisie, String mode) {
        String s = StringUtils.trimToEmpty(saisie);
        return (contient(mode) ? "%" : "") + s + "%";
    }

    /**
     * La saisie ressemble a un numero (chiffres, espaces, points, tirets, +) avec au moins 3 chiffres : ses chiffres
     * seuls, a comparer au numero sans separateurs ; sinon null.
     */
    public static String chiffres(String saisie) {
        String s = StringUtils.trimToEmpty(saisie);
        if (s.isEmpty() || !s.matches("[0-9 .\\-+/]+")) {
            return null;
        }
        String c = s.replaceAll("[^0-9]", "");
        return c.length() >= 3 ? c : null;
    }

    /** Motif LIKE des chiffres d'un numero. */
    public static String motifChiffres(String saisie, String mode) {
        String c = chiffres(saisie);
        return c == null ? null : (contient(mode) ? "%" : "") + c + "%";
    }

    /** Expression SQL d'une colonne de numero sans ses separateurs (espaces, points, tirets). */
    public static String sansSeparateurs(String colonne) {
        return "REPLACE(REPLACE(REPLACE(" + colonne + ", ' ', ''), '.', ''), '-', '')";
    }

    /** La meme, en JPQL (REPLACE n'y existe que par FUNCTION). */
    public static String sansSeparateursJpql(String colonne) {
        return "FUNCTION('REPLACE', FUNCTION('REPLACE', FUNCTION('REPLACE', " + colonne
                + ", ' ', ''), '.', ''), '-', '')";
    }
}
