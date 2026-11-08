package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 5 : synthese du comparateur du pilotage (« X fait 12,0 % de plus que Y sur la période ») et
 * phrase au-dessus de la courbe. Regles verifiees sur des milliers de couples de totaux tires au hasard (graine fixe) :
 * le pourcentage affiche = |A - B| / |B| x 100 arrondi au dixieme ; « de plus » si A &gt; B, « de moins » si A &lt; B ;
 * « autant » a l'egalite ; jamais de signe ni de division par zero ; les deux noms toujours presents.
 */
class ComparateurSyntheseCoherenceTest {

    private static final Pattern POURCENT = Pattern.compile("fait (\\d+,\\d) % (de plus|de moins) que ");

    @Test
    void syntheseParSesRegles() {
        Random h = new Random(5_0811L);
        for (int cas = 0; cas < 20000; cas++) {
            double a = h.nextInt(6) == 0 ? 0 : Math.round(h.nextDouble() * 5_000_000) / 1d;
            double b = h.nextInt(6) == 0 ? 0 : h.nextInt(10) == 0 ? a : Math.round(h.nextDouble() * 5_000_000) / 1d;
            String s = PilotageService.syntheseComparaison("Famille X", "Famille Y", a, b);
            assertTrue(s.contains("Famille X") || s.contains("Famille Y"), s);
            assertTrue(!s.contains("+") && !s.contains("NaN") && !s.contains("Infinity"), s);
            Matcher m = POURCENT.matcher(s);
            if (a == 0 && b == 0) {
                assertTrue(s.contains("sont à zéro"), s);
            } else if (b == 0) {
                assertTrue(s.contains("Famille Y est à zéro"), s);
            } else if (Math.abs(a) > Math.abs(b) * 100) {
                assertTrue(s.contains("plus de cent fois"), s);
            } else if (Math.abs((a - b) / b * 100) < 0.05) {
                assertTrue(s.contains("font autant"), s);
            } else {
                assertTrue(m.find(), s);
                double attendu = Math.round(Math.abs((a - b) / b * 100) * 10) / 10d;
                assertEquals(attendu, Double.parseDouble(m.group(1).replace(',', '.')), 0.051, s);
                assertEquals(a > b ? "de plus" : "de moins", m.group(2), s);
                assertTrue(s.startsWith("Famille X fait ") && s.endsWith("que Famille Y sur la période."), s);
            }
        }
    }

    @Test
    void phrase() {
        assertEquals("Chiffre d'affaires mois par mois : X (bleu) comparé à Y (orange), de Janvier 2026 à Octobre 2026",
                PilotageService.phraseComparaison("Chiffre d'affaires", "X", "Y", "Janvier 2026", "Octobre 2026"));
        assertEquals("Achats mois par mois : X (bleu) comparé à Y (orange), en Mars 2026",
                PilotageService.phraseComparaison("Achats", "X", "Y", "Mars 2026", "Mars 2026"));
        assertEquals("Valeur mois par mois : X (bleu) comparé à Y (orange)",
                PilotageService.phraseComparaison("", "X", "Y", "", ""));
        assertEquals("X fait 12,0 % de plus que Y sur la période.",
                PilotageService.syntheseComparaison("X", "Y", 112, 100));
        assertEquals("X fait 25,0 % de moins que Y sur la période.",
                PilotageService.syntheseComparaison("X", "Y", 75, 100));
    }
}
