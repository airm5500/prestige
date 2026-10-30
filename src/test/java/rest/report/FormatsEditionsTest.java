package rest.report;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.NumberFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.util.DefaultFormatFactory;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Separateur des milliers des editions PDF (retour du 30/10) : sous Java 13 et plus, le francais groupe les milliers
 * par une espace fine insecable (U+202F) que les polices des PDF n'affichent pas (« 11000 » au lieu de « 11 000 »).
 */
public class FormatsEditionsTest {

    private static final char ESPACE_FINE = ' ', INSECABLE = ' ';

    @Test
    public void lEspaceFineDevientUneEspaceInsecable() {
        DecimalFormatSymbols symboles = DecimalFormatSymbols.getInstance(Locale.FRANCE);
        symboles.setGroupingSeparator(ESPACE_FINE);
        DecimalFormat format = new DecimalFormat("#,##0", symboles);
        assertEquals("11" + ESPACE_FINE + "000", format.format(11000), "situation de depart (Java 17, francais)");

        NumberFormat adapte = FormatsEditions.adapter(format);
        assertEquals("11" + INSECABLE + "000", adapte.format(11000));
    }

    @Test
    public void lesAutresSeparateursNeChangentPas() {
        DecimalFormatSymbols symboles = DecimalFormatSymbols.getInstance(Locale.US);
        DecimalFormat format = new DecimalFormat("#,##0.00", symboles);
        assertEquals("11,000.50", FormatsEditions.adapter(format).format(11000.5));
    }

    @Test
    public void laFabriqueDesEditionsNeRendJamaisDEspaceFine() {
        NumberFormat format = new FormatsEditions().createNumberFormat("#,##0", Locale.FRANCE);
        String texte = format.format(1234567);
        assertTrue(texte.indexOf(ESPACE_FINE) < 0, texte);
        assertEquals(7, texte.replaceAll("[^0-9]", "").length(), texte);
    }

    @Test
    public void lesParametresRecoiventLaFabriqueSansEcraserCelleDejaPosee() {
        Map<String, Object> parametres = new HashMap<>();
        assertSame(parametres, FormatsEditions.avec(parametres));
        assertTrue(parametres.get(JRParameter.REPORT_FORMAT_FACTORY) instanceof FormatsEditions);

        DefaultFormatFactory autre = new DefaultFormatFactory();
        Map<String, Object> avecAutre = new HashMap<>();
        avecAutre.put(JRParameter.REPORT_FORMAT_FACTORY, autre);
        assertSame(autre, FormatsEditions.avec(avecAutre).get(JRParameter.REPORT_FORMAT_FACTORY));
    }
}
