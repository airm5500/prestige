package rest.report;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;
import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.util.DefaultFormatFactory;

/**
 * Formats des nombres de toutes les editions Jasper (retour du 30/10).
 *
 * <p>
 * Sous Java 13 et plus, le francais groupe les milliers par une espace fine insecable (U+202F). Les polices des PDF ne
 * l'affichent pas : un motif « #,##0 » rendait « 11000 » au lieu de « 11 000 ». Cette fabrique garde le motif et la
 * langue de chaque champ et remplace seulement ce separateur par l'espace insecable ordinaire (U+00A0), que les polices
 * affichent. Posee dans les parametres de chaque remplissage ({@link #avec(Map)}), elle passe aussi aux sous-rapports.
 * </p>
 */
public class FormatsEditions extends DefaultFormatFactory {

    private static final char ESPACE_FINE = ' ', INSECABLE = ' ';

    @Override
    public NumberFormat createNumberFormat(String pattern, Locale locale) {
        return adapter(super.createNumberFormat(pattern, locale));
    }

    /** Le meme format, avec l'espace insecable ordinaire comme separateur des milliers a la place de l'espace fine. */
    static NumberFormat adapter(NumberFormat format) {
        if (format instanceof DecimalFormat) {
            DecimalFormat decimal = (DecimalFormat) format;
            DecimalFormatSymbols symboles = decimal.getDecimalFormatSymbols();
            if (symboles.getGroupingSeparator() == ESPACE_FINE) {
                symboles.setGroupingSeparator(INSECABLE);
                decimal.setDecimalFormatSymbols(symboles);
            }
        }
        return format;
    }

    /** Pose cette fabrique dans les parametres d'un remplissage, sauf si une autre y est deja ; rend les parametres. */
    @SuppressWarnings({ "rawtypes", "unchecked" })
    public static <M extends Map> M avec(M parametres) {
        if (parametres != null && !parametres.containsKey(JRParameter.REPORT_FORMAT_FACTORY)) {
            parametres.put(JRParameter.REPORT_FORMAT_FACTORY, new FormatsEditions());
        }
        return parametres;
    }
}
