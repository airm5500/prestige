package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ReglementCarnetDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 28/10 (point 19) : reglement d'un carnet depot, montant et motif. */
class ReglementCarnetDepotControleTest {

    private static ReglementCarnetDTO reglement(Integer montant, Integer motif) {
        ReglementCarnetDTO r = new ReglementCarnetDTO();
        r.setMontantPaye(montant);
        r.setMotif(motif == null ? null : String.valueOf(motif));
        return r;
    }

    @Test
    @DisplayName("Montant negatif ou nul : refuse, quel que soit le motif")
    void montant() {
        String m = ReglementServiceImpl.controleReglementCarnetDepot(reglement(-500, 1), true);
        assertNotNull(m);
        assertTrue(m.contains("supérieur à zéro"), m);
        assertNotNull(ReglementServiceImpl.controleReglementCarnetDepot(reglement(0, 1), false));
        assertNotNull(ReglementServiceImpl.controleReglementCarnetDepot(reglement(null, 1), false));
    }

    @Test
    @DisplayName("Motif exige seulement si des motifs sont configures")
    void motif() {
        String m = ReglementServiceImpl.controleReglementCarnetDepot(reglement(500, null), true);
        assertNotNull(m);
        assertTrue(m.contains("motif"), m);
        assertNull(ReglementServiceImpl.controleReglementCarnetDepot(reglement(500, null), false),
                "aucun motif configure : le reglement reste possible");
        assertNull(ReglementServiceImpl.controleReglementCarnetDepot(reglement(500, 3), true));
    }
}
