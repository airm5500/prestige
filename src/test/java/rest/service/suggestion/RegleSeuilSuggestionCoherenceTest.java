package rest.service.suggestion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Coherence de « Nettoyer la suggestion » avec l'entree d'un produit en suggestion (plan du 08/11, point 11.2), sur 20
 * 000 cas tires au hasard (graine fixe) : rayon, reserve, gestion en reserve, seuil (0 compris) et les trois options.
 */
class RegleSeuilSuggestionCoherenceTest {

    private static final String[] OPTIONS = { "=", "<", "<=" };

    @Test
    void exempleDuPlan() {
        // rayon 26, seuil 50, reserve 502 : le produit doit disparaitre
        for (String o : OPTIONS) {
            assertTrue(RegleSeuilSuggestion.aRetirer(26, 502, true, 50, o), o);
        }
        // meme produit non gere en reserve : sa reserve ne compte pas, il reste
        for (String o : OPTIONS) {
            assertFalse(RegleSeuilSuggestion.aRetirer(26, 502, false, 50, o), o);
        }
    }

    @Test
    void vingtMilleCas() {
        Random r = new Random(20261108L);
        for (int i = 0; i < 20000; i++) {
            int rayon = r.nextInt(120);
            int reserve = r.nextInt(5) == 0 ? 0 : r.nextInt(600);
            boolean gere = r.nextBoolean();
            int seuil = r.nextInt(5) == 0 ? 0 : r.nextInt(150);
            String option = OPTIONS[r.nextInt(3)];
            String cas = "rayon=" + rayon + " reserve=" + reserve + " gere=" + gere + " seuil=" + seuil + " option="
                    + option;

            int stock = RegleSeuilSuggestion.stockACommander(rayon, reserve, gere);
            boolean entre = RegleSeuilSuggestion.declenche(stock, seuil, option);
            boolean retire = RegleSeuilSuggestion.aRetirer(rayon, reserve, gere, seuil, option);

            // la reserve ne compte que pour un produit gere en reserve
            assertEquals(gere ? rayon + reserve : rayon, stock, cas);
            // un produit que la generation ferait entrer n'est jamais retire par le nettoyage
            if (entre) {
                assertFalse(retire, cas);
            }
            // stock (rayon + reserve geree) au-dessus du seuil : toujours retire
            if (stock > seuil) {
                assertTrue(retire, cas);
            }
            // options « < » et « <= » : le nettoyage est exactement l'inverse de l'entree
            if (!"=".equals(option)) {
                assertEquals(!entre, retire, cas);
            } else {
                // option « = » : seul le depassement du seuil retire (un stock sous le seuil reste a commander)
                assertEquals(stock > seuil, retire, cas);
            }
        }
    }
}
