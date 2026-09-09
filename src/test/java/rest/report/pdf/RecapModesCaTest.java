package rest.report.pdf;

import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/** Le recap des modes de reglement du PDF caisse / recette (retour des tests du 09/09, point 2). */
public class RecapModesCaTest {

    @Test
    public void phraseComplete() {
        JSONObject json = new JSONObject().put("chiffreAffaires", 53000).put("totalMobile", 9000)
                .put("partMobileCa", 17.0).put("montantCredit", 22000).put("partCreditCa", 41.5).put("data",
                        new JSONArray()
                                .put(new JSONObject().put("mode", "Especes").put("mobile", false).put("montant", 22000)
                                        .put("partCa", 41.5))
                                .put(new JSONObject().put("mode", "WAVE").put("mobile", true).put("montant", 5000)
                                        .put("partCa", 9.4))
                                .put(new JSONObject().put("mode", "ORANGE").put("mobile", true).put("montant", 4000)
                                        .put("partCa", 7.5)));
        String texte = RecapModesCa.texte(json);
        assertTrue(texte.startsWith("Part des modes de règlement dans le CA réalisé (53 000) : "), texte);
        assertTrue(texte.contains("Especes 41,5 % (22 000)"), texte);
        assertTrue(texte.contains("Mobile money 17,0 % (9 000 : WAVE 9,4 %, ORANGE 7,5 %)"), texte);
        assertTrue(texte.endsWith("Crédit 41,5 % (22 000)"), texte);
    }

    @Test
    public void sansVente() {
        assertEquals("Part des modes de règlement dans le CA : aucune vente sur la période.",
                RecapModesCa.texte(new JSONObject().put("chiffreAffaires", 0).put("data", new JSONArray())));
        assertEquals("", RecapModesCa.texte(null));
    }
}
