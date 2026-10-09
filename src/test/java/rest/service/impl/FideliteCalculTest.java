package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.FideliteCalcul.Palier;
import rest.service.impl.FideliteCalcul.Reste;

class FideliteCalculTest {

    private static final List<Palier> PALIERS = Arrays.asList(new Palier("1", "Standard", 0, 1.0),
            new Palier("2", "Argent", 300, 1.25), new Palier("3", "Or", 1000, 1.5));

    @Test
    void baseSurLaPartDuClientEtLesProduitsEligibles() {
        assertEquals(12_500, FideliteCalcul.base(12_500, 12_500, 0), "comptant, tout eligible");
        assertEquals(8_000, FideliteCalcul.base(12_500, 8_000, 0), "produits exclus retires");
        /* assurance : le client paie 30 % */
        assertEquals(3_000, FideliteCalcul.base(10_000, 10_000, 7_000));
        assertEquals(1_800, FideliteCalcul.base(10_000, 6_000, 7_000), "30 % des produits eligibles");
        assertEquals(0, FideliteCalcul.base(10_000, 10_000, 10_000), "tout pris en charge : aucun point");
        assertEquals(0, FideliteCalcul.base(10_000, 10_000, 12_000), "tiers payant superieur au net");
        assertEquals(0, FideliteCalcul.base(0, 0, 0));
        assertEquals(10_000, FideliteCalcul.base(10_000, 15_000, 0), "eligible borne au net");
    }

    @Test
    void pointsArrondisALInferieur() {
        assertEquals(12, FideliteCalcul.points(12_999, 1000, 1.0));
        assertEquals(15, FideliteCalcul.points(12_000, 1000, 1.25));
        assertEquals(18, FideliteCalcul.points(12_000, 1000, 1.5));
        assertEquals(0, FideliteCalcul.points(999, 1000, 1.0));
        assertEquals(0, FideliteCalcul.points(5000, 0, 1.0));
        assertEquals(3, FideliteCalcul.points(3000, 1000, 1.0), "pas d'erreur d'arrondi flottant");
    }

    @Test
    void palierSelonLesPointsAcquisSur12Mois() {
        assertEquals("Standard", FideliteCalcul.palier(PALIERS, 0).libelle);
        assertEquals("Standard", FideliteCalcul.palier(PALIERS, 299).libelle);
        assertEquals("Argent", FideliteCalcul.palier(PALIERS, 300).libelle);
        assertEquals("Or", FideliteCalcul.palier(PALIERS, 5000).libelle);
        assertEquals("Argent", FideliteCalcul.prochain(PALIERS, 10).libelle);
        assertNull(FideliteCalcul.prochain(PALIERS, 1000));
        List<Palier> sansBase = Arrays.asList(new Palier("2", "Argent", 300, 1.25));
        assertNull(FideliteCalcul.palier(sansBase, 100), "sous le premier seuil : pas de palier (coefficient 1)");
        assertNull(FideliteCalcul.palier(Arrays.asList(), 100));
    }

    @Test
    void utilisationDesPointsLesPlusAnciensDabord() {
        List<Reste> gains = Arrays.asList(new Reste("a", 10), new Reste("b", 0), new Reste("c", 25), new Reste("d", 5));
        List<Reste> pris = FideliteCalcul.consommer(gains, 30);
        assertEquals(2, pris.size());
        assertEquals("a", pris.get(0).id);
        assertEquals(10, pris.get(0).restants);
        assertEquals("c", pris.get(1).id);
        assertEquals(20, pris.get(1).restants);
        assertTrue(FideliteCalcul.consommer(gains, 0).isEmpty());
        assertEquals(3, FideliteCalcul.consommer(gains, 100).size(), "au plus ce qui reste");
    }

    @Test
    void controleDesParametres() {
        assertNull(FideliteCalcul.controleParametres(1000, 5, 100, 12));
        assertNull(FideliteCalcul.controleParametres(1000, 5, 0, 0), "seuil 0, sans expiration");
        assertNotNull(FideliteCalcul.controleParametres(0, 5, 100, 12));
        assertNotNull(FideliteCalcul.controleParametres(1000, -1, 100, 12));
        assertNotNull(FideliteCalcul.controleParametres(1000, 5, -1, 12));
        assertNotNull(FideliteCalcul.controleParametres(1000, 5, 100, 121));
        assertNotNull(FideliteCalcul.controleParametres(1000, 600, 100, 12), "plus de 50 % rendu");
        assertEquals(500, FideliteCalcul.valeur(100, 5));
        assertEquals(0, FideliteCalcul.valeur(-20, 5));
    }
}
