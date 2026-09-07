package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Point 22 : le sous-detail des paiements mobiles doit arriver a l'ecran, pas seulement exister en memoire. */
class DetailMobileSerialiseTest {

    @Test
    @DisplayName("Le cumul par mode alimente le detail ET le montant mobile")
    void cumul() {
        StatCaisseRecetteDTO dto = new StatCaisseRecetteDTO();
        dto.ajouterDetailMobile("ORANGE", 120_000L);
        dto.ajouterDetailMobile("WAVE", 80_000L);
        dto.ajouterDetailMobile("ORANGE", 5_000L);
        assertEquals(205_000L, dto.getMontantMobile());
        assertEquals(2, dto.getDetailMobile().size());
        assertEquals(125_000L, dto.getDetailMobile().get("ORANGE"));
    }

    @Test
    @DisplayName("Le detail survit a la mise en JSON, telle que la ressource la fait")
    void serialisation() {
        StatCaisseRecetteDTO dto = new StatCaisseRecetteDTO();
        dto.ajouterDetailMobile("ORANGE", 120_000L);
        dto.ajouterDetailMobile("WAVE", 80_000L);
        JSONArray tableau = new JSONArray(java.util.List.of(dto));
        JSONObject ligne = tableau.getJSONObject(0);
        assertTrue(ligne.has("detailMobile"), "la ligne ne porte pas le detail : " + ligne);
        JSONObject detail = ligne.getJSONObject("detailMobile");
        assertEquals(120_000L, detail.getLong("ORANGE"), "detail rendu : " + detail);
        assertEquals(80_000L, detail.getLong("WAVE"), "detail rendu : " + detail);
        assertEquals(dto.getMontantMobile(), detail.getLong("ORANGE") + detail.getLong("WAVE"));
    }
}
