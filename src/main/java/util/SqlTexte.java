package util;

/**
 * Valeurs saisies inserees dans une requete SQL encore construite par concatenation (anciens services). Audit du 12/10
 * : en attendant leur passage en parametres lies, ces deux fonctions empechent une saisie de sortir de sa place.
 */
public final class SqlTexte {

    private SqlTexte() {
    }

    /**
     * Texte a placer ENTRE APOSTROPHES dans la requete : antislash et apostrophe doubles (MariaDB, mode par defaut),
     * caracteres de controle retires. null devient vide.
     */
    public static String litteral(String s) {
        if (s == null) {
            return "";
        }
        StringBuilder b = new StringBuilder(s.length() + 8);
        for (char c : s.toCharArray()) {
            if (c == '\\') {
                b.append("\\\\");
            } else if (c == '\'') {
                b.append("''");
            } else if (c >= ' ' || c == '\t') {
                b.append(c);
            }
        }
        return b.toString();
    }

    /**
     * Identifiant technique place SANS apostrophes (ex. {@code = %s}) : chiffres, lettres, tiret, souligne, point ;
     * sinon une valeur qui ne correspond a rien.
     */
    public static String identifiant(String s) {
        if (s != null && s.matches("[A-Za-z0-9_.-]{1,64}")) {
            return s;
        }
        return "'__invalide__'";
    }
}
