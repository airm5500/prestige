package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.Test;

/** Plan avoir du 08/11, point 9 : port et libelle d'etat de la « Configuration détaillée ». */
public class WhatsAppWebConfigurationTest {

    @Test
    public void portDeLAdresse() {
        assertEquals(Integer.valueOf(3010), WhatsAppWebServiceImpl.port("http://localhost:3010"));
        assertEquals(Integer.valueOf(3010), WhatsAppWebServiceImpl.port(" http://127.0.0.1:3010/ "));
        assertEquals(Integer.valueOf(80), WhatsAppWebServiceImpl.port("http://serveur"));
        assertEquals(Integer.valueOf(443), WhatsAppWebServiceImpl.port("https://serveur/wa"));
        assertNull(WhatsAppWebServiceImpl.port(""));
        assertNull(WhatsAppWebServiceImpl.port(null));
        assertNull(WhatsAppWebServiceImpl.port("pas une adresse"));
    }

    @Test
    public void libellesDEtat() {
        assertEquals("Connecté", WhatsAppWebServiceImpl.libelleEtat("CONNECTE"));
        assertEquals("Service injoignable", WhatsAppWebServiceImpl.libelleEtat("INJOIGNABLE"));
        assertEquals("ETAT_NOUVEAU", WhatsAppWebServiceImpl.libelleEtat("ETAT_NOUVEAU"));
        assertEquals("Inconnu", WhatsAppWebServiceImpl.libelleEtat(null));
    }
}
