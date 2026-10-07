package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EnvoiPharmaMlTest {

    private HttpServer serveur;
    private final AtomicInteger ok = new AtomicInteger(), refus = new AtomicInteger(), lent = new AtomicInteger();
    private String base;
    private static final Duration C = Duration.ofSeconds(3), R = Duration.ofSeconds(2);
    /** Port ferme : connexion refusee immediatement. */
    private static final String FERME = "http://127.0.0.1:1/PharmaML/";

    @BeforeEach
    void demarrer() throws IOException {
        serveur = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        serveur.createContext("/ok", e -> repondre(e, 200, "<R/>", ok));
        serveur.createContext("/refus", e -> repondre(e, 403, "non", refus));
        serveur.createContext("/lent", e -> {
            lent.incrementAndGet();
            try {
                Thread.sleep(4000);
            } catch (InterruptedException x) {
                Thread.currentThread().interrupt();
            }
            repondre(e, 200, "<R/>", new AtomicInteger());
        });
        serveur.start();
        base = "http://127.0.0.1:" + serveur.getAddress().getPort();
    }

    private static void repondre(com.sun.net.httpserver.HttpExchange e, int code, String corps, AtomicInteger n)
            throws IOException {
        n.incrementAndGet();
        e.getRequestBody().readAllBytes();
        byte[] b = corps.getBytes(StandardCharsets.UTF_8);
        e.sendResponseHeaders(code, b.length);
        try (OutputStream o = e.getResponseBody()) {
            o.write(b);
        }
    }

    @AfterEach
    void arreter() {
        serveur.stop(0);
    }

    @Test
    void principaleInjoignableSecoursUtilise() throws Exception {
        EnvoiPharmaMl.Resultat r = EnvoiPharmaMl.envoyer(EnvoiPharmaMl.adresses(FERME, base + "/ok"), "<X/>", C, R);
        assertEquals(200, r.reponse.statusCode());
        assertTrue(r.secours);
        assertEquals(1, ok.get());
    }

    @Test
    void adresseIntrouvableSecoursUtilise() throws Exception {
        EnvoiPharmaMl.Resultat r = EnvoiPharmaMl.envoyer(
                EnvoiPharmaMl.adresses("http://grossiste-inexistant.invalid/PharmaML/", base + "/ok"), "<X/>", C, R);
        assertTrue(r.secours);
        assertEquals(1, ok.get());
    }

    @Test
    void principaleQuiRepondEnErreurPasDeSecours() throws Exception {
        EnvoiPharmaMl.Resultat r = EnvoiPharmaMl.envoyer(EnvoiPharmaMl.adresses(base + "/refus", base + "/ok"), "<X/>",
                C, R);
        assertEquals(403, r.reponse.statusCode());
        assertFalse(r.secours);
        assertEquals(0, ok.get(), "le secours ne doit jamais recevoir le message apres une reponse");
    }

    @Test
    void delaiDeReponseDepassePasDeSecours() {
        assertThrows(HttpTimeoutException.class,
                () -> EnvoiPharmaMl.envoyer(EnvoiPharmaMl.adresses(base + "/lent", base + "/ok"), "<X/>", C, R));
        assertEquals(1, lent.get());
        assertEquals(0, ok.get(), "le grossiste a pu recevoir la commande : pas de second envoi");
    }

    @Test
    void lesDeuxInjoignables() {
        IOException e = assertThrows(IOException.class,
                () -> EnvoiPharmaMl.envoyer(EnvoiPharmaMl.adresses(FERME, "http://127.0.0.1:2/x"), "<X/>", C, R));
        assertTrue(EnvoiPharmaMl.injoignable(e));
    }

    @Test
    void adressesSansVideNiDoublon() {
        assertEquals(List.of("http://a/"), EnvoiPharmaMl.adresses(" http://a/ ", "http://a/"));
        assertEquals(List.of("http://a/"), EnvoiPharmaMl.adresses("http://a/", "  "));
        assertEquals(List.of("http://a/", "http://b/"), EnvoiPharmaMl.adresses("http://a/", "http://b/"));
        assertEquals(List.of(), EnvoiPharmaMl.adresses(null, null));
    }
}
