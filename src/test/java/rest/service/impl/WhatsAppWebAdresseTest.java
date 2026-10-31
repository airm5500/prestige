package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 31/10 : adresse du service WhatsApp Web saisie avec celle de Prestige (http://localhost:8080/prestige).
 * Prestige repond une page HTML ; le message disait « injoignable (JSONException) » au lieu de pointer l'adresse.
 */
public class WhatsAppWebAdresseTest {

    @Test
    public void pageHtmlAuLieuDuService() {
        JSONObject r = WhatsAppWebServiceImpl.lireReponse(404, "<!DOCTYPE html><html><body>Not Found</body></html>");
        assertEquals(false, r.getBoolean("success"));
        assertEquals("ADRESSE_INCORRECTE", r.getString("etat"));
        assertTrue(r.getString("message").contains("http://localhost:3010"), r.getString("message"));
    }

    @Test
    public void reponsesDuService() {
        assertEquals("CONNECTE", WhatsAppWebServiceImpl.lireReponse(200, "{\"etat\":\"CONNECTE\"}").getString("etat"));
        assertTrue(WhatsAppWebServiceImpl.lireReponse(200, "{\"etat\":\"CONNECTE\"}").getBoolean("success"));
        assertEquals("JETON_REFUSE",
                WhatsAppWebServiceImpl.lireReponse(401, "{\"erreur\":\"jeton\"}").getString("etat"));
        assertEquals("panne", WhatsAppWebServiceImpl.lireReponse(500, "{\"erreur\":\"panne\"}").getString("message"));
        assertTrue(WhatsAppWebServiceImpl.lireReponse(204, "").getBoolean("success"));
    }
}
