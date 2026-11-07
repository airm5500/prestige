package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/** Transport vers un faux extranet local : controles de type, page de connexion, cookies, lecture seule. */
class TransportExtranetTest {

    private static final String CONNEXION = "<html><body><form action='/Login' method='post'>"
            + "<input name='login'><input type='password' name='pwd'></form></body></html>";

    @Test
    void jsonAttenduRecuAvecEnTetesAjaxEtCookie() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/SavoirPlusJSON", Reponse.json("{\"produit\":{\"pscode\":\"FAIR248\"}}"));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            Map<String, String> p = new LinkedHashMap<>();
            p.put("pscode", "FAIR248");
            ReponseExtranet r = t.lire("/SavoirPlusJSON", p, Attendu.JSON, "/NouveauxProduits");
            assertTrue(r.texte().contains("FAIR248"));
            FauxExtranet.Appel a = f.appels().get(0);
            assertEquals("GET", a.methode);
            assertEquals("pscode=FAIR248", a.requete);
            assertEquals("SESSIONID=essai-local", a.cookie);
            assertEquals("XMLHttpRequest", a.ajax);
            assertEquals(f.adresse() + "/NouveauxProduits", a.referer);
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
        }
    }

    @Test
    void pageDeConnexionEn200AuLieuDuJsonExpireLaSession() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/ReturnProduitsReapproJSON", Reponse.html(CONNEXION));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/ReturnProduitsReapproJSON", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
            assertEquals(SessionExtranet.Etat.EXPIREE, t.session().etat());
            assertFalse(t.session().utilisable());
            assertFalse(e.getMessage().contains("essai-local"));
            /* plus aucun appel tant qu'un administrateur n'a pas redonne une session */
            ExtranetException e2 = assertThrows(ExtranetException.class,
                    () -> t.lire("/ReturnProduitsReapproJSON", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.SESSION_ABSENTE, e2.nature());
            assertEquals(1, f.appels().size());
        }
    }

    @Test
    void pageDeConnexionEn200AuLieuDuHtmlExpireLaSession() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/NouveauxProduits", Reponse.html(CONNEXION));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE,
                    assertThrows(ExtranetException.class, () -> t.lire("/NouveauxProduits", null, Attendu.HTML, null))
                            .nature());
        }
    }

    @Test
    void redirectionVersLaConnexionNEstPasSuivie() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/ListeReleves", new Reponse(302, "text/html", new byte[0], Map.of("Location", "/Login")));
            f.route("/Login", Reponse.html(CONNEXION));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE,
                    assertThrows(ExtranetException.class, () -> t.lire("/ListeReleves", null, Attendu.HTML, null))
                            .nature());
            assertEquals(1, f.appels().size(), "la redirection n'est pas suivie");
        }
    }

    @Test
    void refus401Et403ExpirentLaSession() throws Exception {
        for (int st : new int[] { 401, 403 }) {
            try (FauxExtranet f = new FauxExtranet()) {
                f.route("/a", new Reponse(st, "text/html", "non".getBytes(StandardCharsets.UTF_8), null));
                TransportExtranet t = f.transport(SourceExtranet.TEDIS, 0, "laravel_session=x");
                assertEquals(ExtranetException.Nature.SESSION_EXPIREE,
                        assertThrows(ExtranetException.class, () -> t.lire("/a", null, Attendu.JSON, null)).nature());
            }
        }
    }

    @Test
    void erreurServeurNExpirePasLaSession() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/a", new Reponse(500, "text/html", "erreur".getBytes(StandardCharsets.UTF_8), null));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            assertEquals(ExtranetException.Nature.TRANSPORT,
                    assertThrows(ExtranetException.class, () -> t.lire("/a", null, Attendu.JSON, null)).nature());
            assertTrue(t.session().utilisable());
        }
    }

    @Test
    void htmlSansFormulaireAuLieuDuJsonEstInattenduSansExpirer() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/a", Reponse.html("<html><body>Maintenance</body></html>"));
            f.route("/b", new Reponse(200, "application/json", "<html></html>".getBytes(StandardCharsets.UTF_8), null));
            f.route("/c", new Reponse(200, "text/plain", "{\"a\":1}".getBytes(StandardCharsets.UTF_8), null));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            for (String c : new String[] { "/a", "/b", "/c" }) {
                assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                        assertThrows(ExtranetException.class, () -> t.lire(c, null, Attendu.JSON, null)).nature(), c);
            }
            assertTrue(t.session().utilisable());
        }
    }

    @Test
    void pdfVerifieParSaSignatureEtOctetsConserves() throws Exception {
        byte[] pdf = "%PDF-1.4\néÿ binaire".getBytes(StandardCharsets.ISO_8859_1);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/ReclamationPDF", new Reponse(200, "application/pdf", pdf, null));
            f.route("/DisplayPDF",
                    new Reponse(200, "application/pdf", "pas un pdf".getBytes(StandardCharsets.UTF_8), null));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            assertArrayEquals(pdf, t.lire("/ReclamationPDF", null, Attendu.PDF, null).octets());
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> t.lire("/DisplayPDF", null, Attendu.PDF, null))
                            .nature());
        }
    }

    @Test
    void cookieRenouveleParLExtranetEstRepris() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/a", new Reponse(200, "application/json", "{}".getBytes(StandardCharsets.UTF_8),
                    Map.of("Set-Cookie", "SESSIONID=nouveau; Path=/; HttpOnly")));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=ancien");
            t.lire("/a", null, Attendu.JSON, null);
            t.lire("/a", null, Attendu.JSON, null);
            List<FauxExtranet.Appel> a = f.appels();
            assertEquals("SESSIONID=ancien", a.get(0).cookie);
            assertEquals("SESSIONID=nouveau", a.get(1).cookie);
        }
    }

    @Test
    void aucunAppelSansSession() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, null);
            assertEquals(ExtranetException.Nature.SESSION_ABSENTE,
                    assertThrows(ExtranetException.class, () -> t.lire("/a", null, Attendu.JSON, null)).nature());
            assertTrue(f.appels().isEmpty());
        }
    }

    @Test
    void cheminHorsExtranetRefuse() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            for (String c : new String[] { "https://ailleurs.example/a", "//ailleurs.example/a", "a", "/a?x=1", "/a b",
                    "/a\r\nX: y", null }) {
                assertThrows(ExtranetException.class, () -> t.lire(c, null, Attendu.JSON, null), String.valueOf(c));
            }
            assertTrue(f.appels().isEmpty());
        }
    }

    @Test
    void pauseEntreDeuxAppels() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/a", Reponse.json("{}"));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 300, "SESSIONID=x");
            t.lire("/a", null, Attendu.JSON, null);
            t.lire("/a", null, Attendu.JSON, null);
            List<FauxExtranet.Appel> a = f.appels();
            assertTrue(a.get(1).instant - a.get(0).instant >= 250, "pause respectée");
            assertEquals(2, t.appels());
        }
    }

    @Test
    void parametresEncodesDansLOrdre() {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("order[0][column]", "1");
        p.put("search[value]", "");
        p.put("x", "a b&c");
        assertEquals("?order%5B0%5D%5Bcolumn%5D=1&search%5Bvalue%5D=&x=a+b%26c", TransportExtranet.requete(p));
        assertEquals("", TransportExtranet.requete(null));
    }

    /** Lecture seule par construction : une seule methode d'appel public, et elle ne fait que des GET. */
    @Test
    void lectureSeuleParConstruction() throws Exception {
        List<String> publiques = Arrays.stream(TransportExtranet.class.getDeclaredMethods())
                .filter(m -> Modifier.isPublic(m.getModifiers())).map(Method::getName).sorted()
                .collect(Collectors.toList());
        assertEquals(List.of("appels", "lire", "session"), publiques);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/a", Reponse.json("{}"));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            t.lire("/a", null, Attendu.JSON, null);
            assertTrue(f.appels().stream().allMatch(a -> "GET".equals(a.methode)));
        }
    }

    @Test
    void reponseVideNEstPasDuJson() {
        ReponseExtranet r = new ReponseExtranet(200, "application/json", null, new byte[0], "/a");
        assertEquals(0, r.premierCaractere());
        assertNull(r.location());
    }
}
