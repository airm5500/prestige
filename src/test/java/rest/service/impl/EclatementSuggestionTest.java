package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Retour du 17/09, point 8 : « eclater en 3 fois une commande de 1500 lignes creera 3 suggestions manuelles de 500
 * lignes ».
 *
 * <p>
 * Le decoupage lui-meme est une division entiere, et c'est justement la qu'on perd des lignes sans s'en apercevoir : 1
 * 501 lignes en 3 donnent 501, 500 et 500, et non trois fois 500 avec une ligne oubliee. Une ligne perdue, c'est un
 * article qui ne sera pas commande, et personne ne le verra avant la rupture. Ces tests fixent la regle, independamment
 * de la base.
 */
public class EclatementSuggestionTest {

    /**
     * Meme calcul que {@code SuggestionImpl.eclaterSuggestion} : le reste de la division va aux premiers morceaux.
     * Reproduit ici parce que c'est la seule partie du traitement qui se raisonne sans base de donnees.
     */
    private static int[] tailles(int total, int nombre) {
        int base = total / nombre;
        int reste = total % nombre;
        int[] t = new int[nombre];
        for (int i = 0; i < nombre; i++) {
            t[i] = base + (i < reste ? 1 : 0);
        }
        return t;
    }

    private static int somme(int[] t) {
        int s = 0;
        for (int x : t) {
            s += x;
        }
        return s;
    }

    /** Le cas donne par l'officine, mot pour mot. */
    @Test
    public void mille500LignesEnTroisDonnentTroisFois500() {
        int[] t = tailles(1500, 3);

        assertEquals(3, t.length);
        assertEquals(500, t[0]);
        assertEquals(500, t[1]);
        assertEquals(500, t[2]);
    }

    @Test
    public void leResteDeLaDivisionEstRepartiSurLesPremiers() {
        assertEquals("[501, 500, 500]", java.util.Arrays.toString(tailles(1501, 3)));
        assertEquals("[501, 501, 500]", java.util.Arrays.toString(tailles(1502, 3)));
        assertEquals("[4, 3, 3]", java.util.Arrays.toString(tailles(10, 3)));
    }

    /** La regle qui compte : aucune ligne perdue, aucune ligne en trop, quel que soit le decoupage. */
    @Test
    public void aucuneLigneNEstJamaisPerdueNiEnTrop() {
        for (int total = 2; total <= 300; total++) {
            for (int nombre = 2; nombre <= total; nombre++) {
                assertEquals(total, somme(tailles(total, nombre)), "total=" + total + " nombre=" + nombre);
            }
        }
    }

    /** Aucun morceau vide : une suggestion sans ligne n'a aucun sens et encombrerait la liste. */
    @Test
    public void aucunMorceauNEstVide() {
        for (int total = 2; total <= 200; total++) {
            for (int nombre = 2; nombre <= total; nombre++) {
                for (int taille : tailles(total, nombre)) {
                    assertTrue(taille >= 1, "morceau vide pour total=" + total + " nombre=" + nombre);
                }
            }
        }
    }

    /** Les morceaux ne s'ecartent jamais de plus d'une ligne : c'est ce que veut dire « de meme taille ». */
    @Test
    public void lesMorceauxNeSEcartentJamaisDePlusDUneLigne() {
        for (int total = 2; total <= 300; total++) {
            for (int nombre = 2; nombre <= total; nombre++) {
                int[] t = tailles(total, nombre);
                int min = t[0];
                int max = t[0];
                for (int x : t) {
                    min = Math.min(min, x);
                    max = Math.max(max, x);
                }
                assertTrue(max - min <= 1, "ecart " + (max - min) + " pour total=" + total + " nombre=" + nombre);
            }
        }
    }

    /** Eclater en autant de morceaux que de lignes est la limite : une ligne par suggestion. */
    @Test
    public void eclaterEnAutantDeMorceauxQueDeLignesDonneUneLigneChacun() {
        int[] t = tailles(7, 7);

        assertEquals(7, t.length);
        for (int x : t) {
            assertEquals(1, x);
        }
    }
}
