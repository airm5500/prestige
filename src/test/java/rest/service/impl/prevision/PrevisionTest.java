package rest.service.impl.prevision;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/** Plan d'octobre, section 5 : prevision par produit et quantite recommandee. */
public class PrevisionTest {

    @Test
    public void venteStableMoyenneTresFiable() {
        double[] s = { 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 };
        Prevision.Resultat r = Prevision.analyser(s);
        assertEquals(Prevision.MOYENNE, r.methode, "a erreur egale, la plus simple");
        assertEquals(10.0, r.prevuMois);
        assertEquals(100, r.fiabilite);
    }

    @Test
    public void tendanceHausseHolt() {
        double[] s = new double[12];
        for (int i = 0; i < 12; i++) {
            s[i] = 10 + 5 * i;
        }
        Prevision.Resultat r = Prevision.analyser(s);
        assertEquals(Prevision.HOLT, r.methode);
        assertTrue(r.prevuMois > 60 && r.prevuMois < 75, "~70 : " + r.prevuMois);
        assertTrue(r.fiabilite >= 90, String.valueOf(r.fiabilite));
    }

    @Test
    public void saisonnaliteMarquee() {
        double[] s = new double[36];
        for (int i = 0; i < 36; i++) {
            s[i] = (i % 12 == 6 || i % 12 == 7) ? 100 : 10;
        }
        Prevision.Resultat r = Prevision.analyser(s);
        assertTrue(r.methode.equals(Prevision.SAISON) || r.methode.equals(Prevision.HOLT_WINTERS), r.methode);
        assertTrue(r.fiabilite >= 80, String.valueOf(r.fiabilite));
        assertEquals(10.0, r.prevuMois, 3, "le mois 36 (= mois 0) est un mois creux");
    }

    @Test
    public void historiqueCourtOuVide() {
        assertEquals(0, Prevision.analyser(new double[0]).prevuMois);
        assertEquals(0, Prevision.analyser(new double[0]).fiabilite);
        Prevision.Resultat r = Prevision.analyser(new double[] { 3, 6 });
        assertEquals(4.5, r.prevuMois);
        assertEquals(0, r.fiabilite, "pas assez d'historique pour juger");
        assertEquals(Double.NaN, Prevision.prevoir(new double[] { 1, 2 }, Prevision.SAISON));
    }

    @Test
    public void ventesIrregulieresMoinsFiables() {
        double[] s = { 0, 30, 0, 2, 25, 0, 1, 40, 0, 3, 0, 28 };
        assertTrue(Prevision.analyser(s).fiabilite < 50);
    }

    @Test
    public void quantiteRecommandee() {
        /* 2 par jour, delai 3 j + couverture 15 j = 36 ; securite 1,65 x (6/racine30) x racine3 = 3,13 -> 40 */
        assertEquals(40 - 10 - 5 - 2, Recommandation.quantite(2, 6, 3, 15, 10, 5, 2));
        assertEquals(0, Recommandation.quantite(2, 6, 3, 15, 100, 0, 0), "deja en stock : rien");
        assertEquals(0, Recommandation.quantite(0, 0, 3, 15, 0, 0, 0), "rien ne se vend : rien");
        assertEquals(9, Recommandation.couverture(18, 0, 2));
        assertEquals(-1, Recommandation.couverture(5, 0, 0));
    }
}
