package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;

import commonTasks.dto.TiersPayantParams;
import dal.TPreenregistrementCompteClientTiersPayent;

/**
 * Ecart d'1 F (decision du 29/10) : quand seul l'organisme change, au meme taux, le nouveau bon garde la part de la
 * vente au lieu de la recalculer (2 551 a la vente, 2 552 apres).
 */
class PartGardeeModificationTest {

    private static TPreenregistrementCompteClientTiersPayent ligne(String id, int part, int taux) {
        TPreenregistrementCompteClientTiersPayent l = new TPreenregistrementCompteClientTiersPayent();
        l.setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(id);
        l.setIntPRICE(part);
        l.setIntPERCENT(taux);
        return l;
    }

    private static JSONObject calcul(int part) throws Exception {
        return new JSONObject().put("montanttp", part).put("taux", 90).put("reste", 0);
    }

    @Test
    void memeTauxLaPartDeLaVenteEstGardee() throws Exception {
        JSONObject j = SalesServiceImpl.garderPartDeLaVente(calcul(2552), Optional.of(ligne("l1", 2551, 90)), 90);
        assertEquals(2551, j.getInt("montanttp"));
    }

    @Test
    void tauxDifferentLaPartEstRecalculee() throws Exception {
        JSONObject j = SalesServiceImpl.garderPartDeLaVente(calcul(2268), Optional.of(ligne("l1", 2551, 90)), 80);
        assertEquals(2268, j.getInt("montanttp"));
    }

    @Test
    void ligneRemplaceeParSonIdentifiantOuSeuleLigne() {
        List<TPreenregistrementCompteClientTiersPayent> lignes = Arrays.asList(ligne("l1", 2551, 90),
                ligne("l2", 284, 10));
        TiersPayantParams saisi = new TiersPayantParams();
        saisi.setItemId("l2");
        assertEquals("l2",
                SalesServiceImpl.ligneRemplacee(lignes, saisi, 2).get().getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
        TiersPayantParams sansId = new TiersPayantParams();
        assertTrue(SalesServiceImpl.ligneRemplacee(lignes, sansId, 2).isEmpty());
        assertEquals("l1", SalesServiceImpl.ligneRemplacee(lignes.subList(0, 1), sansId, 1).get()
                .getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
    }
}
