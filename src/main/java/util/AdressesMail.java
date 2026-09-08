package util;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang3.StringUtils;

/**
 * Les adresses destinataires d'un mail d'officine, lues depuis la configuration.
 *
 * <p>
 * La cle {@code usermail} du fichier de configuration peut etre absente (la valeur lue est alors nulle), vide, ou
 * porter plusieurs adresses separees par des points-virgules. Sans cette lecture prudente, une cle absente faisait
 * lever une NullPointerException a chaque envoi de synthese, a chaque demarrage de l'application, et les notifications
 * s'accumulaient sans jamais partir ni etre signalees.
 * </p>
 */
public final class AdressesMail {

    private AdressesMail() {
    }

    /** Les adresses non vides, sans espaces autour ; liste vide si rien n'est configure. */
    public static List<String> destinataires(String configuration) {
        List<String> adresses = new ArrayList<>();
        if (StringUtils.isBlank(configuration)) {
            return adresses;
        }
        for (String adresse : configuration.split("[;,]")) {
            String propre = StringUtils.trimToEmpty(adresse);
            if (!propre.isEmpty() && !adresses.contains(propre)) {
                adresses.add(propre);
            }
        }
        return adresses;
    }

    /** La premiere adresse configuree, ou null s'il n'y en a aucune. */
    public static String premiere(String configuration) {
        List<String> adresses = destinataires(configuration);
        return adresses.isEmpty() ? null : adresses.get(0);
    }
}
