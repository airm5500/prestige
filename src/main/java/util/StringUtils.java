
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
}
