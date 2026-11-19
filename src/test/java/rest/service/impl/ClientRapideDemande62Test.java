package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import util.Constant;

/**
 * Demande 62 (applications mobiles, 15/11). Point 2 : un client rapide sans type est un client standard (6), sinon la
 * recherche des clients standard ne le retrouve pas ; un type donne est garde tel quel (le controle refuse un type
 * inconnu avant). Point 3a : la cloture automatique d'un paiement mobile money accepte les droits de « Terminer une
 * vente » ET le droit propre de la borne, et rien d'autre.
 */
public class ClientRapideDemande62Test {

    @Test
    void typeParDefautSurDesMilliersDeSaisies() {
        Random r = new Random(20261119L);
        List<String> blancs = Arrays.asList(null, "", " ", "   ", "\t", " \t ");
        List<String> types = Arrays.asList("1", "2", "3", "6", "8", "XX");
        int defauts = 0, gardes = 0;
        for (int i = 0; i < 5000; i++) {
            if (r.nextBoolean()) {
                String b = blancs.get(r.nextInt(blancs.size()));
                assertEquals("6", ClientServiceImpl.typeClientRapide(b), "saisie vide « " + b + " »");
                defauts++;
            } else {
                String t = types.get(r.nextInt(types.size()));
                String saisie = (r.nextBoolean() ? " " : "") + t + (r.nextBoolean() ? " " : "");
                assertEquals(t, ClientServiceImpl.typeClientRapide(saisie), "type donné « " + saisie + " » gardé");
                gardes++;
            }
        }
        assertTrue(defauts > 1000 && gardes > 1000, defauts + " / " + gardes);
        assertEquals(Constant.STANDART_CLIENT_ID, ClientServiceImpl.typeClientRapide(null));
    }

    @Test
    void droitsDeLaClotureParMobileMoney() {
        List<String> mobile = Arrays.asList(Constant.PRIVILEGES_CLOTURE_PAIEMENT_MOBILE);
        /* tout ce qui terminait une vente termine toujours une vente payee par mobile money */
        assertTrue(mobile.containsAll(Arrays.asList(Constant.PRIVILEGES_CLOTURE_VENTE)), mobile.toString());
        /* plus le droit de la borne, et rien d'autre */
        assertTrue(mobile.contains("P_BORNE_PAIEMENT_MOBILE"));
        assertEquals(Constant.PRIVILEGES_CLOTURE_VENTE.length + 1, mobile.size(), mobile.toString());
        /* le droit de la borne ne termine pas une vente ordinaire */
        assertFalse(Arrays.asList(Constant.PRIVILEGES_CLOTURE_VENTE).contains("P_BORNE_PAIEMENT_MOBILE"));
    }
}
