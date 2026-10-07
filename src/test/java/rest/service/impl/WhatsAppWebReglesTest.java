package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Regles WhatsApp Web (07/10) : bornees cote serveur, comme dans le service compagnon. */
public class WhatsAppWebReglesTest {

    @Test
    public void bornesEtDefauts() {
        JSONObject r = WhatsAppWebServiceImpl.normaliser(new JSONObject().put("delaiMinSec", 2).put("delaiMaxSec", 10)
                .put("plafondJour", 999999).put("heureDebut", 21).put("heureFin", 7).put("monteeEnCharge", false));
        assertEquals(20, r.getInt("delaiMinSec"), "sous le plancher de 5 s : defaut");
        assertEquals(20, r.getInt("delaiMaxSec"), "max ramene au min");
        assertEquals(150, r.getInt("plafondJour"));
        assertEquals(8, r.getInt("heureDebut"));
        assertEquals(20, r.getInt("heureFin"));
        assertTrue(!r.getBoolean("monteeEnCharge"));
        assertEquals(15, WhatsAppWebServiceImpl.normaliser(null).getInt("pauseApres"));
    }
}
