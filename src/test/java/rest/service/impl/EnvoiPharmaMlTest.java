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

    /** Vecteur de la RFC 2104 (HMAC-MD5) : cle « Jefe ». */
    @Test
    void controleHmacMd5() {
        byte[] hex = new byte[16];
        String h = "750c783e6ab0b503eaa86e310a5db738";
        for (int i = 0; i < 16; i++) {
            hex[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
        }
        String attendu = java.util.Base64.getEncoder().encodeToString(hex);
        assertEquals(attendu, EnvoiPharmaMl.controle("what do ya want for nothing?", null, "Jefe", "HMAC_MD5"));
        assertEquals(attendu, EnvoiPharmaMl.controle("what do ya want for nothing?", null, "Jefe", "hmac_md5"));
    }

    @Test
    void controleAutresModesEtAbsences() throws Exception {
        java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
        String fin = java.util.Base64.getEncoder()
                .encodeToString(md.digest("<X/>4083".getBytes(StandardCharsets.UTF_8)));
        String debut = java.util.Base64.getEncoder()
                .encodeToString(md.digest("4083<X/>".getBytes(StandardCharsets.UTF_8)));
        assertEquals(fin, EnvoiPharmaMl.controle("<X/>", "0999908", "4083", "MD5_CLE_FIN"));
        assertEquals(debut, EnvoiPharmaMl.controle("<X/>", "0999908", "4083", "MD5_CLE_DEBUT"));
        assertEquals(null, EnvoiPharmaMl.controle("<X/>", "0999908", "", "HMAC_MD5"));
        assertEquals(null, EnvoiPharmaMl.controle("<X/>", "0999908", null, null));
        assertEquals(null, EnvoiPharmaMl.controle("<X/>", "0999908", "4083", "AUCUN"));
    }

    @Test
    void enteteEnvoyeAvecLeMessage() throws Exception {
        java.util.concurrent.atomic.AtomicReference<String> recu = new java.util.concurrent.atomic.AtomicReference<>();
        serveur.createContext("/controle", e -> {
            recu.set(e.getRequestHeaders().getFirst("Content-PharmaML"));
            repondre(e, 200, "<R/>", new AtomicInteger());
        });
        EnvoiPharmaMl.envoyer(List.of(base + "/controle"), "<X>é</X>", "9999", "ShFD", null, C, R);
        assertEquals(EnvoiPharmaMl.controle("<X>é</X>", "9999", "ShFD", "CSRP"), recu.get());
        EnvoiPharmaMl.envoyer(List.of(base + "/controle"), "<X/>", "9999", null, null, C, R);
        assertEquals(null, recu.get(), "sans cle : pas d'en-tete (comportement d'avant)");
    }

    /**
     * Specification Pharma-ML v4.8 § 4.4.3, prouvee par DPCI (07/10) : pour ce message exact, DPCI a recalcule «
     * jbRS0FUm//7Dq2m4sJg0rQ== » (officine 0999908, cle 4083).
     */
    @Test
    void controleCsrpEgalAuCalculDeDpci() throws Exception {
        String xml;
        try (java.io.InputStream in = getClass().getResourceAsStream("/pharmaml/C_DPCI_commande_v1.xml")) {
            /*
             * message envoye a DPCI avec des fins de ligne « \n » : une extraction Git sous Windows peut les convertir
             * en « \r\n », ce qui changerait l'empreinte
             */
            xml = new String(in.readAllBytes(), StandardCharsets.UTF_8).replace("\r\n", "\n");
        }
        assertEquals("09999080000000004083", EnvoiPharmaMl.donneeSecrete("0999908", "4083"));
        assertEquals("jbRS0FUm//7Dq2m4sJg0rQ==", EnvoiPharmaMl.controle(xml, "0999908", "4083", null));
        assertEquals("jbRS0FUm//7Dq2m4sJg0rQ==", EnvoiPharmaMl.controle(xml, "0999908", "4083", "CSRP"));
        assertEquals("U05MjN4nHUBsJUoDhDX6Rw==", EnvoiPharmaMl.controle(xml, "0999908", "4083", "HMAC_MD5"),
                "valeur refusee par DPCI (ancien reglage)");
        assertEquals("ABCDEFGHIJKLMNOPCLE1", EnvoiPharmaMl.donneeSecrete("ABCDEFGHIJKLMNOPQRS", "CLE1"));
    }
}
