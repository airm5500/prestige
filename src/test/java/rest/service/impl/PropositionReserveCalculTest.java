package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dal.TSuggestionReserve;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 03/11 : la proposition est calculee par une seule formule, que le stock soit lu ligne par ligne ou pour
 * toute la suggestion a la fois (ouverture rapide des grosses suggestions automatiques).
 */
class PropositionReserveCalculTest {

    @Test
    void versLaReserveLeTropPleinDuRayon() {
        JSONObject j = ReserveServiceImpl.calculProposition("P", 24, 0, 22, 5, TSuggestionReserve.CATEGORIE_RESERVE);
        assertEquals(2, j.getInt("int_PROPOSITION"));
        assertEquals(24, j.getInt("int_STOCK_RAYON"));
        assertEquals(22, j.getInt("int_CIBLE"));
        assertEquals(0, ReserveServiceImpl.calculProposition("P", 10, 0, 22, 5, TSuggestionReserve.CATEGORIE_RESERVE)
                .getInt("int_PROPOSITION"));
    }

    @Test
    void versLeRayonLePlusPetitDuManqueEtDeLaReserve() {
        JSONObject j = ReserveServiceImpl.calculProposition("P", 3, 4, 10, 5, TSuggestionReserve.CATEGORIE_RAYON);
        assertEquals(4, j.getInt("int_PROPOSITION"));
        assertEquals(4, j.getInt("int_DISPONIBLE"));
        assertEquals(5, j.getInt("int_SEUIL_DECLENCHEUR"));
        assertEquals(7, ReserveServiceImpl.calculProposition("P", 3, 50, 10, null, TSuggestionReserve.CATEGORIE_RAYON)
                .getInt("int_PROPOSITION"));
    }
}
