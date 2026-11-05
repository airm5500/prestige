package rest.service.impl.securite;

import java.security.SecureRandom;
import java.util.regex.Pattern;

/**
 * REGLES DU MOT DE PASSE DE LA BASE (cas 4, lot 4.B) : validation d'une saisie, generation forte cote serveur, forme
 * des ordres qui le portent. Regles pures, testees a part. Aucune valeur n'est journalisee par ces methodes.
 * <p>
 * Alphabet : lettres, chiffres et les symboles {@link #SYMBOLES}. Sont exclus, en plus de ce que demande l'analyse
 * (&amp; ? ' " et l'espace : URL JDBC et fichiers .cnf), les caracteres que cmd.exe interprete quand asadmin.bat recoit
 * la valeur en argument (% ! ^ | &lt; &gt; parentheses), $ { } (syntaxe ${ALIAS=...} de Payara) et l'antislash.
 */
public final class MotDePasseBase {

    public static final int LONGUEUR_MIN = 12;
    public static final int LONGUEUR_GENEREE = 24;
    public static final String SYMBOLES = "#*+-./:;=@[]_~";
    private static final String MINUSCULES = "abcdefghijkmnopqrstuvwxyz", MAJUSCULES = "ABCDEFGHJKLMNPQRSTUVWXYZ",
            CHIFFRES = "23456789";
    private static final Pattern ADMIS = Pattern.compile("[A-Za-z0-9" + Pattern.quote(SYMBOLES) + "]+");
    /** Nom de compte MariaDB ou d'alias admis dans un ordre. */
    private static final Pattern NOM = Pattern.compile("[A-Za-z0-9_\\-.]{1,80}");

    private MotDePasseBase() {
    }

    /** Message d'erreur de la saisie (sans la valeur), ou null si le mot de passe est acceptable. */
    public static String valider(String mdp, String confirmation) {
        if (mdp == null || mdp.isEmpty()) {
            return "Le nouveau mot de passe est vide.";
        }
        if (mdp.length() < LONGUEUR_MIN) {
            return "Le nouveau mot de passe doit avoir au moins " + LONGUEUR_MIN + " caractères.";
        }
        if (mdp.length() > 120) {
            return "Le nouveau mot de passe dépasse 120 caractères.";
        }
        if (!ADMIS.matcher(mdp).matches()) {
            return "Caractère non admis : lettres, chiffres et symboles " + SYMBOLES
                    + " seulement (ni espace, ni & ? ' \" % ! ^ | < > ( ) $ { } \\).";
        }
        if (!mdp.matches(".*[A-Za-z].*") || !mdp.matches(".*[0-9].*")
                || !mdp.matches(".*[" + Pattern.quote(SYMBOLES) + "].*")) {
            return "Le nouveau mot de passe doit mêler lettres, chiffres et au moins un symbole (" + SYMBOLES + ").";
        }
        if (confirmation == null || !confirmation.equals(mdp)) {
            return "La confirmation ne correspond pas au nouveau mot de passe.";
        }
        return null;
    }

    /** Mot de passe fort tire par le serveur : {@link #LONGUEUR_GENEREE} caracteres, chaque classe presente. */
    public static String generer(SecureRandom alea) {
        String tout = MINUSCULES + MAJUSCULES + CHIFFRES + SYMBOLES;
        char[] c = new char[LONGUEUR_GENEREE];
        for (int i = 0; i < c.length; i++) {
            c[i] = tout.charAt(alea.nextInt(tout.length()));
        }
        /* une de chaque classe, a des places distinctes tirees au sort */
        int[] places = new int[4];
        for (int i = 0; i < 4; i++) {
            boolean doublon;
            do {
                places[i] = alea.nextInt(c.length);
                doublon = false;
                for (int j = 0; j < i; j++) {
                    doublon |= places[j] == places[i];
                }
            } while (doublon);
        }
        c[places[0]] = MINUSCULES.charAt(alea.nextInt(MINUSCULES.length()));
        c[places[1]] = MAJUSCULES.charAt(alea.nextInt(MAJUSCULES.length()));
        c[places[2]] = CHIFFRES.charAt(alea.nextInt(CHIFFRES.length()));
        c[places[3]] = SYMBOLES.charAt(alea.nextInt(SYMBOLES.length()));
        return new String(c);
    }

    /** ALTER USER 'compte'@'hote' IDENTIFIED BY '...' ; IllegalArgumentException si un element n'est pas admis. */
    public static String ordreAlterUser(String compte, String hote, String mdp) {
        if (!nomAdmis(compte)) {
            throw new IllegalArgumentException("Nom de compte MariaDB non admis.");
        }
        if (hote == null || hote.isEmpty() || hote.length() > 60 || !hote.matches("[A-Za-z0-9_.%:\\-]+")) {
            throw new IllegalArgumentException("Hôte du compte MariaDB non admis.");
        }
        if (!valeurAdmise(mdp)) {
            throw new IllegalArgumentException("Mot de passe non admis dans un ordre ALTER USER.");
        }
        return "ALTER USER '" + compte + "'@'" + hote + "' IDENTIFIED BY '" + mdp + "'";
    }

    /** Nom de compte MariaDB ou d'alias Payara admis ? */
    public static boolean nomAdmis(String nom) {
        return nom != null && NOM.matcher(nom).matches();
    }

    /** Valeur admise dans un argument de ligne de commande (asadmin set) ou un ordre SQL ? */
    public static boolean valeurAdmise(String v) {
        return v != null && ADMIS.matcher(v).matches();
    }
}
