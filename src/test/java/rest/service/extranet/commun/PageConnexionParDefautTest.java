package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import org.junit.jupiter.api.Test;

/**
 * Page de connexion par defaut (demande du 08/11) : Ubipharm se connecte par auth.ubipharm.com sans rien saisir ; une
 * page saisie passe avant ; un extranet configure ailleurs (faux extranet des tests) n'en a pas ; TEDIS n'en a pas.
 */
class PageConnexionParDefautTest {

    static final String UBIPHARM = "https://auth.ubipharm.com/realms/TIC-SSO/protocol/openid-connect/auth?scope=openid"
            + "&response_type=code&client_id=ExtranetClientGrossiste02"
            + "&redirect_uri=https%3A%2F%2Fclient-cotedivoire.ubipharm.com%2FCallbackSSO&state=L0lkZW50aWZpY2F0aW9u";

    @Test
    void ubipharmReelSeulement() {
        SourceExtranet u = SourceExtranet.UBIPHARM;
        assertEquals(UBIPHARM, u.pageConnexionParDefaut("https://client-cotedivoire.ubipharm.com"));
        assertEquals(UBIPHARM, u.pageConnexionParDefaut(" https://client-cotedivoire.ubipharm.com/ "));
        assertEquals(UBIPHARM, u.pageConnexionParDefaut("HTTPS://CLIENT-COTEDIVOIRE.UBIPHARM.COM"));
        assertNull(u.pageConnexionParDefaut("http://127.0.0.1:18765"), "faux extranet des tests : page « / »");
        assertNull(u.pageConnexionParDefaut("http://client-cotedivoire.ubipharm.com"), "http : pas l'extranet réel");
        assertNull(u.pageConnexionParDefaut(null));
        /* TEDIS : /login par defaut depuis le 08/11 (ConnexionTedisTest) */
        assertEquals("https://www.tedispharma-ci.com/login",
                SourceExtranet.TEDIS.pageConnexionParDefaut("https://www.tedispharma-ci.com"));
    }

    @Test
    void pageParDefautAcceptee() {
        /* la page par defaut respecte la regle « meme domaine, https » des pages saisies */
        assertEquals(UBIPHARM, ComptesExtranet.normaliserPage(UBIPHARM, "https://client-cotedivoire.ubipharm.com"));
        URI p = URI.create(UBIPHARM);
        assertEquals("https", p.getScheme());
        assertTrue(ConnexionExtranet.memeDomaine(URI.create("https://client-cotedivoire.ubipharm.com"), p));
        /* retour apres connexion sur l'extranet, page d'arrivee /Identification */
        assertTrue(UBIPHARM.contains("redirect_uri=https%3A%2F%2Fclient-cotedivoire.ubipharm.com%2FCallbackSSO"));
        assertEquals("/Identification", new String(java.util.Base64.getDecoder().decode("L0lkZW50aWZpY2F0aW9u"),
                java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void identifiantsSansPageSaisie() throws Exception {
        ConnexionExtranet.Identifiants sans = new ConnexionExtranet.Identifiants("id", "mdp", "e",
                SourceExtranet.UBIPHARM.pageConnexionParDefaut("https://client-cotedivoire.ubipharm.com"), null);
        assertEquals(UBIPHARM, sans.pageConnexion);
        ConnexionExtranet.Identifiants saisie = new ConnexionExtranet.Identifiants("id", "mdp", "e", "/login", null);
        assertEquals("/login", saisie.pageConnexion);
        ConnexionExtranet.Identifiants faux = new ConnexionExtranet.Identifiants("id", "mdp", "e",
                SourceExtranet.UBIPHARM.pageConnexionParDefaut("http://127.0.0.1:18765"), null);
        assertEquals("/", faux.pageConnexion);
    }
}
