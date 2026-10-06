package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Plan d'octobre, 4.2 : webhook WhatsApp (signature, statuts, STOP) et corps de la Cloud API. */
public class WhatsAppWebhookTest {

    private static final String CORPS = "{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"1\",\"changes\":[{\"field\":\"messages\",\"value\":{"
            + "\"statuses\":[{\"id\":\"wamid.A\",\"status\":\"delivered\",\"recipient_id\":\"2250707070707\"},"
            + "{\"id\":\"wamid.B\",\"status\":\"failed\",\"recipient_id\":\"2250505050505\",\"errors\":[{\"code\":131026,\"title\":\"Message undeliverable\"}]}],"
            + "\"messages\":[{\"from\":\"2250707070707\",\"type\":\"text\",\"text\":{\"body\":\" Arrêt. \"}},"
            + "{\"from\":\"2250101010101\",\"type\":\"text\",\"text\":{\"body\":\"stop les rappels svp\"}}]}}]}]}";

    @Test
    public void signature() {
        String h = "sha256=" + WhatsAppWebhook.hmacHex("secret", CORPS);
        assertTrue(WhatsAppWebhook.signatureValide("secret", CORPS, h));
        assertTrue(WhatsAppWebhook.signatureValide("secret", CORPS, h.toUpperCase().replace("SHA256=", "sha256=")));
        assertFalse(WhatsAppWebhook.signatureValide("autre", CORPS, h));
        assertFalse(WhatsAppWebhook.signatureValide("secret", CORPS + " ", h), "corps modifie");
        assertFalse(WhatsAppWebhook.signatureValide("secret", CORPS, null));
        assertFalse(WhatsAppWebhook.signatureValide("", CORPS, h), "secret non configure : tout est refuse");
        /* valeur de reference calculee hors Java (openssl dgst -sha256 -hmac secret) */
        assertEquals("8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b",
                WhatsAppWebhook.hmacHex("secret", "message"));
    }

    @Test
    public void abonnement() {
        assertEquals("123", WhatsAppWebhook.verifierAbonnement("subscribe", "jeton", "123", "jeton"));
        assertNull(WhatsAppWebhook.verifierAbonnement("subscribe", "faux", "123", "jeton"));
        assertNull(WhatsAppWebhook.verifierAbonnement("subscribe", "jeton", "123", ""));
        assertNull(WhatsAppWebhook.verifierAbonnement("autre", "jeton", "123", "jeton"));
    }

    @Test
    public void statutsEtStop() {
        WhatsAppWebhook.Contenu c = WhatsAppWebhook.analyser(new JSONObject(CORPS));
        assertEquals(2, c.statuts.size());
        assertEquals("wamid.A", c.statuts.get(0).messageId);
        assertEquals("delivered", c.statuts.get(0).statut);
        assertNull(c.statuts.get(0).erreur);
        assertEquals("131026 Message undeliverable", c.statuts.get(1).erreur);
        assertEquals(2, c.entrants.size());
        assertTrue(c.entrants.get(0).stop, "« Arrêt. » seul = desinscription");
        assertFalse(c.entrants.get(1).stop, "une phrase qui contient stop n'est pas une desinscription");
        assertEquals(0, WhatsAppWebhook.analyser(new JSONObject("{}")).statuts.size());
    }

    @Test
    public void corpsCloudApi() {
        JSONObject t = WhatsAppCloudApi.corps("2250707070707", "Bonjour", null, null);
        assertEquals("text", t.getString("type"));
        assertEquals("Bonjour", t.getJSONObject("text").getString("body"));
        JSONObject m = WhatsAppCloudApi.corps("2250707070707", "Bonjour", "rappel_traitement", "fr");
        assertEquals("template", m.getString("type"));
        assertEquals("rappel_traitement", m.getJSONObject("template").getString("name"));
        assertEquals("Bonjour", m.getJSONObject("template").getJSONArray("components").getJSONObject(0)
                .getJSONArray("parameters").getJSONObject(0).getString("text"));
        assertEquals("https://graph.facebook.com/v21.0/123/messages", WhatsAppCloudApi.url(null, "123"));
        assertEquals("wamid.X", WhatsAppCloudApi.identifiant(new JSONObject("{\"messages\":[{\"id\":\"wamid.X\"}]}")));
        assertEquals("190 Invalid token",
                WhatsAppCloudApi.erreur(new JSONObject("{\"error\":{\"code\":190,\"message\":\"Invalid token\"}}")));
    }
}
