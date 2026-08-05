package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

/**
 * Regles metier du suivi mouvement article complet : union des articles (suivi general + reserve) et cumul des
 * mouvements internes par type. Ces regles garantissent les criteres de recette CR-05 a CR-08.
 */
public class SuiviCompletAgregatsTest {

    // ------------------------------------------------------------ unionFamilles

    @Test
    public void unionInclutLesProduitsReserveSeulement() {
        // Produit B n'a bouge QUE dans la reserve : il doit apparaitre dans la liste,
        // c'est precisement l'angle mort du suivi 2.
        List<Object[]> general = Collections.singletonList(new Object[] { "A", "AMOXICILLINE" });
        List<Object[]> reserve = Collections.singletonList(new Object[] { "B", "BETADINE" });

        List<Object[]> union = ProduitServiceImpl.unionFamilles(general, reserve);

        assertEquals(2, union.size());
        assertEquals("A", union.get(0)[0]);
        assertEquals("B", union.get(1)[0]);
    }

    @Test
    public void unionSansDoublonQuandLeProduitABougeDesDeuxCotes() {
        List<Object[]> general = Collections.singletonList(new Object[] { "A", "AMOXICILLINE" });
        List<Object[]> reserve = Collections.singletonList(new Object[] { "A", "AMOXICILLINE" });

        assertEquals(1, ProduitServiceImpl.unionFamilles(general, reserve).size());
    }

    @Test
    public void unionTrieeParDesignationSansCasse() {
        List<Object[]> general = Arrays.asList(new Object[] { "1", "zyrtec" }, new Object[] { "2", "Aspirine" });
        List<Object[]> reserve = Collections.singletonList(new Object[] { "3", "DOLIPRANE" });

        List<Object[]> union = ProduitServiceImpl.unionFamilles(general, reserve);

        assertEquals("Aspirine", union.get(0)[1]);
        assertEquals("DOLIPRANE", union.get(1)[1]);
        assertEquals("zyrtec", union.get(2)[1]);
    }

    @Test
    public void unionDeListesVides() {
        assertTrue(ProduitServiceImpl.unionFamilles(Collections.emptyList(), Collections.emptyList()).isEmpty());
    }

    // -------------------------------------------------- cumulerAgregatsReserve

    @Test
    public void assortEtReassortSontCumulesSeparement() {
        // [familleId, type, somme(qte), delta reserve signe]
        List<Object[]> rows = Arrays.asList(new Object[] { "A", "ASSORT", 10L, 10L },
                new Object[] { "A", "REASSORT", 6L, -6L });

        Map<String, int[]> agg = ProduitServiceImpl.cumulerAgregatsReserve(rows);

        assertArrayEquals(new int[] { 10, 6, 0 }, agg.get("A"));
    }

    @Test
    public void ajustementUtiliseLeDeltaSigneEtNonLaQuantiteAbsolue() {
        // int_QTE stocke |delta| : un retrait de 4 arrive avec somme=4 mais delta=-4.
        // C'est le delta qui doit alimenter la colonne Ajust.reserve.
        List<Object[]> rows = Collections.singletonList(new Object[] { "A", "AJUSTEMENT", 4L, -4L });

        assertArrayEquals(new int[] { 0, 0, -4 }, ProduitServiceImpl.cumulerAgregatsReserve(rows).get("A"));
    }

    @Test
    public void typeInconnuIgnorePlutotQueCompteATort() {
        // DESTOCKAGE est declare dans le modele mais jamais produit par l'application :
        // une ligne historique de ce type ne doit fausser aucune colonne.
        List<Object[]> rows = Arrays.asList(new Object[] { "A", "DESTOCKAGE", 5L, -5L },
                new Object[] { "A", "ASSORT", 2L, 2L });

        assertArrayEquals(new int[] { 2, 0, 0 }, ProduitServiceImpl.cumulerAgregatsReserve(rows).get("A"));
    }

    @Test
    public void annulationInverseSeCompenseDansLesSommes() {
        // Un ASSORT de 10 annule par son mouvement inverse (REASSORT de 10) :
        // les deux colonnes affichent le flux reel, et le net rayon/reserve est nul.
        List<Object[]> rows = Arrays.asList(new Object[] { "A", "ASSORT", 10L, 10L },
                new Object[] { "A", "REASSORT", 10L, -10L });

        int[] agg = ProduitServiceImpl.cumulerAgregatsReserve(rows).get("A");

        assertArrayEquals(new int[] { 10, 10, 0 }, agg);
        // Invariant du stock total : ni ASSORT ni REASSORT ne le modifient.
        assertEquals(0, agg[2]);
    }

    @Test
    public void sommesNullesTolereesEtFamillesSeparees() {
        List<Object[]> rows = Arrays.asList(new Object[] { "A", "ASSORT", null, null },
                new Object[] { "B", "REASSORT", 3L, -3L });

        Map<String, int[]> agg = ProduitServiceImpl.cumulerAgregatsReserve(rows);

        assertArrayEquals(new int[] { 0, 0, 0 }, agg.get("A"));
        assertArrayEquals(new int[] { 0, 3, 0 }, agg.get("B"));
        assertFalse(agg.containsKey("C"));
    }
}
