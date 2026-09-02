package util;

import java.util.List;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import util.ComparaisonLignesVente.Ecart;
import util.ComparaisonLignesVente.Ligne;

public class ComparaisonLignesVenteTest {

    private static Ligne l(String id, int qte, int pu) {
        return new Ligne(id, "CIP" + id, "PRODUIT " + id, qte, pu, qte * pu);
    }

    @Test
    public void produitsInchangesIgnores() {
        List<Ecart> ecarts = ComparaisonLignesVente.comparer(List.of(l("A", 2, 100)), List.of(l("A", 2, 100)));
        Assertions.assertTrue(ecarts.isEmpty());
    }

    @Test
    public void ajoutRetraitQuantitePrix() {
        List<Ligne> avant = List.of(l("A", 2, 100), l("B", 1, 500), l("C", 3, 200));
        List<Ligne> apres = List.of(l("A", 5, 100), l("C", 3, 250), l("D", 1, 1000));
        List<Ecart> ecarts = ComparaisonLignesVente.comparer(avant, apres);
        Assertions.assertEquals(4, ecarts.size());
        Ecart a = ecarts.get(0);
        Assertions.assertEquals(Ecart.QUANTITE, a.action);
        Assertions.assertEquals(2, a.qteAvant);
        Assertions.assertEquals(5, a.qteApres);
        Assertions.assertEquals(500, a.montantApres);
        Ecart b = ecarts.get(1);
        Assertions.assertEquals(Ecart.RETRAIT, b.action);
        Assertions.assertEquals(1, b.qteAvant);
        Assertions.assertEquals(0, b.qteApres);
        Ecart c = ecarts.get(2);
        Assertions.assertEquals(Ecart.PRIX, c.action);
        Assertions.assertEquals(200, c.puAvant);
        Assertions.assertEquals(250, c.puApres);
        Ecart d = ecarts.get(3);
        Assertions.assertEquals(Ecart.AJOUT, d.action);
        Assertions.assertEquals("D", d.produitId);
        Assertions.assertEquals(1000, d.montantApres);
    }

    @Test
    public void memeProduitPlusieursLignesCumule() {
        List<Ecart> ecarts = ComparaisonLignesVente.comparer(List.of(l("A", 1, 100), l("A", 1, 100)),
                List.of(l("A", 2, 100)));
        Assertions.assertTrue(ecarts.isEmpty());
    }

    @Test
    public void listesNulles() {
        List<Ecart> ecarts = ComparaisonLignesVente.comparer(null, List.of(l("A", 1, 100)));
        Assertions.assertEquals(1, ecarts.size());
        Assertions.assertEquals(Ecart.AJOUT, ecarts.get(0).action);
    }
}
