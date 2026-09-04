package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Coupe-circuit des envois de SMS : une officine a accumule 74 refus POL0001 en rappelant sans fin un operateur qui
 * refusait pour un motif de configuration. Reessayer ne pouvait pas aboutir, et rien dans le journal ne disait quoi
 * corriger.
 */
class SmsCoupeCircuitTest {

    private static SmsCoupeCircuit neuf() {
        return new SmsCoupeCircuit();
    }

    @Test
    void unRefusDeConfigurationRepeteSuspendLesEnvois() {
        SmsCoupeCircuit circuit = neuf();
        assertFalse(circuit.enregistrerRefus("POL0001"), "1er refus");
        assertFalse(circuit.enregistrerRefus("POL0001"), "2e refus");
        assertFalse(circuit.suspendu(), "toujours ouvert avant le seuil");
        assertTrue(circuit.enregistrerRefus("POL0001"), "3e refus : la consigne est ecrite une fois");
        assertTrue(circuit.suspendu());
        // La consigne ne doit pas etre reecrite a chaque tentative suivante.
        assertFalse(circuit.enregistrerRefus("POL0001"), "4e refus");
    }

    @Test
    void unRefusPassagerNeSuspendJamais() {
        SmsCoupeCircuit circuit = neuf();
        for (int i = 0; i < 10; i++) {
            // Quota de debit et panne operateur : reessayer est exactement ce qu'il faut faire.
            assertFalse(circuit.enregistrerRefus("POL0013"));
            assertFalse(circuit.enregistrerRefus("HTTP_503"));
        }
        assertFalse(circuit.suspendu());
    }

    @Test
    void unRefusPassagerRemetLeCompteurAZero() {
        SmsCoupeCircuit circuit = neuf();
        circuit.enregistrerRefus("POL0001");
        circuit.enregistrerRefus("POL0001");
        circuit.enregistrerRefus("HTTP_503");
        // Le compteur est reparti : deux refus de configuration ne suffisent plus a couper.
        assertFalse(circuit.enregistrerRefus("POL0001"));
        assertFalse(circuit.enregistrerRefus("POL0001"));
        assertFalse(circuit.suspendu());
    }

    @Test
    void unEnvoiAccepteReferemeLeCircuit() {
        SmsCoupeCircuit circuit = neuf();
        circuit.enregistrerRefus("POL0001");
        circuit.enregistrerRefus("POL0001");
        circuit.enregistrerRefus("POL0001");
        assertTrue(circuit.suspendu());
        circuit.enregistrerSucces();
        assertFalse(circuit.suspendu());
        assertNull(circuit.reprisePrevue());
        assertNull(circuit.dernierCode());
    }

    @Test
    void classementDesCodes() {
        assertTrue(SmsCoupeCircuit.erreurDeConfiguration("POL0001"));
        assertTrue(SmsCoupeCircuit.erreurDeConfiguration("pol1009"), "casse indifferente");
        assertTrue(SmsCoupeCircuit.erreurDeConfiguration(" invalid_client "));
        // Passagers : solde a recharger, quota de la minute, token expire, panne operateur.
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration("POL0050"));
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration("POL0013"));
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration("HTTP_401"));
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration("HTTP_503"));
        // Code non communique : on ne coupe pas sur une inconnue.
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration(null));
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration(""));
    }

    @Test
    void laConsigneDitQuoiVerifierEtNonQueLEnvoiAEchoue() {
        String consigne = SmsCoupeCircuit.consigne("POL0001", "Erreur de politique generique", 3);
        assertTrue(consigne.contains("POL0001"), consigne);
        assertTrue(consigne.contains("senderAddress"), consigne);
        assertTrue(consigne.contains("aucun redemarrage n'est necessaire"), consigne);

        String souscription = SmsCoupeCircuit.consigne("POL1009", null, 3);
        assertTrue(souscription.contains("souscrite a l'API SMS"), souscription);
        assertFalse(souscription.contains("null"), souscription);

        String identifiants = SmsCoupeCircuit.consigne("invalid_client", "client non autorise", 3);
        assertTrue(identifiants.contains("clientSecret"), identifiants);
    }

    @Test
    void leMessageCourtNommeLOperateurEtLeCode() {
        String court = SmsCoupeCircuit.messageCourt("ORANGE", "pol0001");
        assertTrue(court.contains("ORANGE"), court);
        assertTrue(court.contains("POL0001"), court);
        assertFalse(SmsCoupeCircuit.messageCourt(null, null).contains("null"));
    }
}
