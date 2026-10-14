package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class RumTest {

    @Test
    void cleDesAppels() {
        assertEquals("GET v1/ventes/{id}",
                Rum.cleApi("get", "../api/v1/ventes/12345?client=KOUASSI&dtStart=2026-10-01"));
        assertEquals("POST v1/campagnes/propositions/{id}/envoyer", Rum.cleApi("POST",
                "http://localhost:8080/prestige/api/v1/campagnes/propositions/0f8fad5b-d9cb-469f-a165-70867728950e/envoyer"));
        assertEquals("GET v1/produit/{id}/stock", Rum.cleApi("GET", "/prestige/api/v1/produit/8476972/stock"));
        assertEquals("GET v1/client/{id}", Rum.cleApi("GET", "../api/v1/client/E2E-WA-A"));
        assertEquals("GET v1/pilotage/onglet", Rum.cleApi("GET", "../api/v1/pilotage/onglet?cle=marge"));
        assertEquals("GET webservices/configmanagement/famillearticle/ws_data_other.jsp",
                Rum.cleApi("GET", "../webservices/configmanagement/famillearticle/ws_data_other.jsp?start=0"));
        assertEquals("GET v1/x", Rum.cleApi("DROP", "../api/v1/x"));
    }

    @Test
    void autresRegles() {
        assertEquals("campagnesscript", Rum.cleSimple("campagnes<script>"), "seuls les caractères sûrs restent");
        assertEquals(Rum.Type.ECRAN, Rum.type("ecran"));
        assertNull(Rum.type("autre"));
        assertEquals(0, Rum.duree(-5));
        assertEquals(0, Rum.duree(10_000_000));
        assertEquals(1200, Rum.duree(1200));
    }

    @Test
    void tranchesDeCinqMinutes() {
        LocalDateTime t = LocalDateTime.of(2026, 10, 14, 10, 7, 42);
        assertEquals(LocalDateTime.of(2026, 10, 14, 10, 5), RumService.tranche(t));
        assertEquals(LocalDateTime.of(2026, 10, 14, 10, 0), RumService.tranche(LocalDateTime.of(2026, 10, 14, 10, 0)));
        assertEquals(LocalDateTime.of(2026, 10, 14, 23, 55),
                RumService.tranche(LocalDateTime.of(2026, 10, 14, 23, 59, 59)));
    }
}
