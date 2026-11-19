package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TClient;
import dal.TPreenregistrement;
import dal.TRemise;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Demande 63, point 3 (regle validee le 19/11) : remise d'une vente assurance / carnet. Regles verifiees sur des
 * milliers de ventes tirees au hasard (graine fixe) : la remise choisie sur la vente l'emporte ; sans remise choisie,
 * celle de la fiche du client s'applique ; « sans remise » choisi (« 0 ») retire la remise de la fiche pour cette vente
 * ; un client sans remise, ou absent, ne donne jamais de remise.
 */
class RemiseAppliqueeCoherenceTest {

    private static TRemise remise(String id) {
        TRemise r = new TRemise();
        r.setLgREMISEID(id);
        return r;
    }

    @Test
    void reglesSurDesMilliersDeVentes() {
        Random r = new Random(20261119L);
        String[] marques = { null, "", "0", "R5", "R10" };
        int retraits = 0, fiches = 0, choisies = 0;
        for (int cas = 0; cas < 20000; cas++) {
            TPreenregistrement op = new TPreenregistrement();
            String marque = marques[r.nextInt(marques.length)];
            TRemise choisie = marque != null && marque.startsWith("R") && r.nextBoolean() ? remise(marque) : null;
            op.setLgREMISEID(marque);
            op.setRemise(choisie);
            TClient client = r.nextInt(8) == 0 ? null : new TClient();
            TRemise fiche = client != null && r.nextBoolean() ? remise("FICHE") : null;
            if (client != null) {
                client.setRemise(fiche);
            }
            TRemise res = SalesNetComputingServiceImpl.remiseAppliquee(op, client);
            String c = "cas " + cas + " marque=" + marque + " choisie=" + (choisie != null) + " fiche="
                    + (fiche != null);
            if (choisie != null) {
                choisies++;
                assertSame(choisie, res, c);
            } else if ("0".equals(marque)) {
                assertNull(res, c + " : sans remise choisi");
                if (fiche != null) {
                    retraits++;
                }
            } else {
                assertSame(fiche, res, c + " : remise de la fiche");
                if (fiche != null) {
                    fiches++;
                }
            }
        }
        assertTrue(retraits > 1000 && fiches > 1000 && choisies > 1000, retraits + " / " + fiches + " / " + choisies);
    }
}
