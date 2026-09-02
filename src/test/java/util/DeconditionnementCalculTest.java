package util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Non-regression du calcul de deconditionnement automatique. L'ancienne boucle while mutait la variable "stock
 * initial", ce qui gonflait les instantanes qteDebut/qteFinale historises dans h_mvt_produit (fiche des mouvements
 * affichant 204 au lieu de 99 sur le cas reel du 20/08/2026 : stock 4, vente 5, boite de 100).
 */
public class DeconditionnementCalculTest {

    @Test
    public void stockSuffisantAucuneBoite() {
        assertEquals(0, DeconditionnementCalcul.boitesNecessaires(12, 12, 100));
        assertEquals(0, DeconditionnementCalcul.boitesNecessaires(50, 12, 100));
    }

    @Test
    public void casReelDuVingtAout() {
        // stock detail 4, vente de 5, boite de 100 details -> une seule boite
        assertEquals(1, DeconditionnementCalcul.boitesNecessaires(4, 5, 100));
    }

    @Test
    public void venteDepassantPlusieursBoites() {
        assertEquals(3, DeconditionnementCalcul.boitesNecessaires(0, 250, 100));
        assertEquals(2, DeconditionnementCalcul.boitesNecessaires(10, 210, 100));
        // pile une boite complete
        assertEquals(1, DeconditionnementCalcul.boitesNecessaires(0, 100, 100));
        assertEquals(2, DeconditionnementCalcul.boitesNecessaires(0, 101, 100));
    }

    @Test
    public void memeResultatQueLAncienneBoucle() {
        for (int stock = 0; stock <= 15; stock++) {
            for (int vente = 1; vente <= 30; vente++) {
                for (int detail = 1; detail <= 12; detail++) {
                    int attendu = 0;
                    int s = stock;
                    while (s < vente) {
                        attendu++;
                        s += detail;
                    }
                    assertEquals(attendu, DeconditionnementCalcul.boitesNecessaires(stock, vente, detail),
                            "stock=" + stock + " vente=" + vente + " detail=" + detail);
                }
            }
        }
    }

    @Test
    public void stockVendableAdditionneRayonEtBoites() {
        // cas rapporte : 10 details en rayon, plus aucune boite -> on peut vendre 10, pas 11
        assertEquals(10, DeconditionnementCalcul.stockVendable(10, 0, 100));
        // 4 en rayon + 1 boite de 100
        assertEquals(104, DeconditionnementCalcul.stockVendable(4, 1, 100));
        // rien en rayon, 2 boites de 10
        assertEquals(20, DeconditionnementCalcul.stockVendable(0, 2, 10));
    }

    @Test
    public void stockVendableNeutraliseLesValeursInvalides() {
        // nombre de details par boite invalide ou stock de boites negatif : seules les unites en rayon comptent
        assertEquals(7, DeconditionnementCalcul.stockVendable(7, 5, 0));
        assertEquals(7, DeconditionnementCalcul.stockVendable(7, 5, -1));
        assertEquals(7, DeconditionnementCalcul.stockVendable(7, -3, 100));
    }

    @Test
    public void nombreDeDetailsParBoiteInvalide() {
        // l'ancienne boucle while ne terminait jamais dans ce cas ; le garde-fou stockVirtuel l'evitait en amont,
        // la fonction doit rester sure meme appelee directement
        assertEquals(0, DeconditionnementCalcul.boitesNecessaires(4, 5, 0));
        assertEquals(0, DeconditionnementCalcul.boitesNecessaires(4, 5, -1));
    }
}
