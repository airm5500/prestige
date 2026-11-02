package rest.service.impl.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import rest.service.impl.client.RetraitTiersPayant.Effet;
import rest.service.impl.client.RetraitTiersPayant.Lien;

/**
 * Plan « clients assures et tiers-payants » (02/11), etape 2 : retirer un tiers-payant d'un client assure. Un client
 * assure n'existe que par son assurance : retirer le dernier lien actif desactive le client ; retirer le principal
 * quand il reste un complementaire fait de celui-ci le principal (priorite 1, sans devenir regime obligatoire).
 */
class RetraitTiersPayantTest {

    private static Lien lien(String id, boolean ro, int priorite) {
        return new Lien(id, "ORGANISME " + id, ro, priorite);
    }

    @Test
    void dernierLienActifDesactiveLeClient() {
        RetraitTiersPayant.Decision d = RetraitTiersPayant.decider("A", Collections.singletonList(lien("A", true, 1)));
        assertEquals(Effet.DESACTIVATION_CLIENT, d.effet);
        assertNull(d.promu);
    }

    @Test
    void carnetSeulDesactiveLeClient() {
        RetraitTiersPayant.Decision d = RetraitTiersPayant.decider("C", Collections.singletonList(lien("C", false, 1)));
        assertEquals(Effet.DESACTIVATION_CLIENT, d.effet);
    }

    @Test
    void principalRetireLeComplementairePasseEnPriorite1() {
        RetraitTiersPayant.Decision d = RetraitTiersPayant.decider("RO",
                Arrays.asList(lien("RO", true, 1), lien("RC2", false, 3), lien("RC1", false, 2)));
        assertEquals(Effet.PROMOTION, d.effet);
        assertEquals("RC1", d.promu.id, "le complementaire de plus haute priorite");
        assertEquals("ORGANISME RC1", d.promu.nom);
    }

    @Test
    void sansRegimeObligatoireLePrincipalEstLaPriorite1() {
        RetraitTiersPayant.Decision d = RetraitTiersPayant.decider("P1",
                Arrays.asList(lien("P2", false, 2), lien("P1", false, 1)));
        assertEquals(Effet.PROMOTION, d.effet);
        assertEquals("P2", d.promu.id);
    }

    @Test
    void complementaireRetireRienNeChangePourLeClient() {
        RetraitTiersPayant.Decision d = RetraitTiersPayant.decider("RC",
                Arrays.asList(lien("RO", true, 1), lien("RC", false, 2)));
        assertEquals(Effet.SIMPLE, d.effet);
        assertNull(d.promu);
    }

    @Test
    void leRegimeObligatoirePrimeSurLaPriorite() {
        // donnee ancienne : RO en priorite 2, un complementaire en priorite 1 ; le principal est le RO
        RetraitTiersPayant.Decision d = RetraitTiersPayant.decider("X",
                Arrays.asList(lien("X", false, 1), lien("RO", true, 2)));
        assertEquals(Effet.SIMPLE, d.effet);
    }

    @Test
    void lienInconnuOuDejaRetire() {
        assertEquals(Effet.INTROUVABLE,
                RetraitTiersPayant.decider("Z", Collections.singletonList(lien("A", true, 1))).effet);
    }
}
