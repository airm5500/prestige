package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rest.service.impl.ReglementDiffereControle.Ligne;
import rest.service.impl.ReglementDiffereControle.Resultat;

/** Controles d'un reglement de differes (retours du 09/10) : appartenance, fraicheur, montant, total. */
class ReglementDiffereControleTest {

    private final Ligne a1 = new Ligne("A1", "A", "is_Closed", false, 5000);
    private final Ligne a2 = new Ligne("A2", "A", "is_Closed", false, 3000);
    private final Ligne b1 = new Ligne("B1", "B", "is_Closed", false, 4000);

    @Test
    void venteDUnAutreClientRefusee() {
        assertFalse(ReglementDiffereControle.partiel(List.of(a1), "B", null, 1000).valide());
    }

    @Test
    void partielValide() {
        Resultat r = ReglementDiffereControle.partiel(List.of(b1), "B", Map.of("B1", 4000), 1000);
        assertTrue(r.valide());
        assertEquals(1000, r.encaisse);
        assertEquals(3000, r.affectations.get(0).nouveauReste);
    }

    @Test
    void resteChangeDepuisLEcranRefuse() {
        Ligne apres = new Ligne("B1", "B", "is_Closed", false, 3000);
        assertFalse(ReglementDiffereControle.partiel(List.of(apres), "B", Map.of("B1", 4000), 1000).valide());
        assertFalse(ReglementDiffereControle.partiel(List.of(new Ligne("B1", "B", "is_Closed", false, 0)), "B", null, 10)
                .valide());
    }

    @Test
    void montantsAbsurdesRefuses() {
        assertFalse(ReglementDiffereControle.partiel(List.of(b1), "B", null, 10000).valide());
        assertFalse(ReglementDiffereControle.partiel(List.of(b1), "B", null, 0).valide());
        assertFalse(ReglementDiffereControle.partiel(List.of(b1), "B", null, -5).valide());
        assertFalse(ReglementDiffereControle.partiel(List.of(), "B", null, 10).valide());
    }

    @Test
    void repartitionDansLOrdreChoisi() {
        Resultat r = ReglementDiffereControle.partiel(List.of(a1, a2), "A", null, 6000);
        assertTrue(r.valide());
        assertEquals(0, r.affectations.get(0).nouveauReste);
        assertEquals(2000, r.affectations.get(1).nouveauReste);
        assertEquals(1000, r.affectations.get(1).montant);
    }

    @Test
    void venteAnnuleeOuInexistanteRefusee() {
        assertFalse(ReglementDiffereControle.partiel(List.of(new Ligne("A1", "A", "is_Closed", true, 5000)), "A", null, 100)
                .valide());
        assertFalse(ReglementDiffereControle.partiel(List.of(new Ligne("A1", "A", "is_Process", false, 5000)), "A", null,
                100).valide());
        assertFalse(ReglementDiffereControle.partiel(Arrays.asList((Ligne) null), "A", null, 100).valide());
    }

    @Test
    void reglementTotal() {
        assertFalse(ReglementDiffereControle.total(List.of(a1, a2), "A", 5000, 5000).valide());
        assertFalse(ReglementDiffereControle.total(List.of(a1, a2), "A", 8000, 7000).valide());
        assertFalse(ReglementDiffereControle.total(List.of(), "A", 0, 0).valide());
        Resultat r = ReglementDiffereControle.total(List.of(a1, a2), "A", 8000, 10000);
        assertTrue(r.valide());
        assertEquals(8000, r.encaisse);
        assertTrue(r.affectations.stream().allMatch(x -> x.nouveauReste == 0));
    }
}
