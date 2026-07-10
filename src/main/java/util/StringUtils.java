
package util;

import java.util.Objects;

/**
 *
 * @author koben
 */
public class StringUtils {

    public static String subStringData(String texte, int begin, int end) {
        if (Objects.isNull(texte)) {
            return "";
        }
        if (texte.length() > end) {
            texte = texte.substring(begin, end);
        }
        return texte;
    }

    /**
     * Normalise un numéro de téléphone destiné aux éditions : un numéro local de 9 chiffres ayant perdu son 0 initial
     * (ex. 708094545) est réécrit avec son préfixe (0708094545). Toute autre valeur (indicatif +225, numéro avec
     * espaces, texte libre) est conservée telle quelle après trim.
     */
    public static String normalizePhone(String value) {
        if (Objects.isNull(value)) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.matches("[1-9]\\d{8}")) {
            return "0" + trimmed;
        }
        return trimmed;
    }
}
