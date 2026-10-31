package util;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Faille de droits du 31/10 : parametres qui contiennent un secret (jeton, cle d'API, mot de passe). Leur valeur ne
 * sort jamais par l'API : les services qui en ont besoin la lisent en base. L'ecran des parametres la masque ; une
 * valeur renvoyee masquee par l'ecran laisse le secret tel quel.
 */
public final class ParametresSecrets {

    /** Valeur affichee a la place d'un secret. */
    public static final String MASQUE = "••••••••";

    private static final Set<String> CLES = Set.of("KEY_SMS_DR_CALLBACK_SECRET", "SUPPORT_VEILLE_JETON",
            "KEY_AVIS_JETON");
    /** Toute cle future du meme genre (le nom suffit ; KEY_MOBILE_JETON_HEURES est une duree, pas un jeton). */
    private static final Pattern MOTIF = Pattern
            .compile(".*(SECRET|TOKEN|PASSWORD|PASSWD|MOT_DE_PASSE|APIKEY|API_KEY|CLE_API|_JETON$).*");

    private ParametresSecrets() {
    }

    public static boolean estSecret(String cle) {
        if (cle == null) {
            return false;
        }
        String c = cle.trim().toUpperCase(Locale.ROOT);
        return CLES.contains(c) || MOTIF.matcher(c).matches();
    }
}
