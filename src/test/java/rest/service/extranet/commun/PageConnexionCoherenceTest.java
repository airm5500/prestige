package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Page de connexion saisie dans l'onglet Sessions : gardee TELLE QUE SAISIE (adresse complete), acceptee sur le site de
 * l'extranet ou sur un serveur du meme domaine (connexion unique Ubipharm : auth.ubipharm.com), refusee ailleurs ;
 * cookies ranges par serveur pendant la connexion.
 */
class PageConnexionCoherenceTest {

    private static final String UBIPHARM = "https://client-cotedivoire.ubipharm.com";
    private static final String TEDIS = "https://www.tedispharma-ci.com";
    /** Adresses donnees par l'utilisateur le 08/11. */
    static final String PAGE_UBIPHARM = "https://auth.ubipharm.com/realms/TIC-SSO/protocol/openid-connect/auth"
            + "?scope=openid&response_type=code&client_id=ExtranetClientGrossiste02"
            + "&redirect_uri=https%3A%2F%2Fclient-cotedivoire.ubipharm.com%2FCallbackSSO&state=L0lkZW50aWZpY2F0aW9u";
    static final String PAGE_TEDIS = "https://www.tedispharma-ci.com/login";

    @Test
    void adressesDeLUtilisateurGardeesTellesQuelles() {
        assertEquals(PAGE_UBIPHARM, ComptesExtranet.normaliserPage(PAGE_UBIPHARM, UBIPHARM));
        assertEquals(PAGE_TEDIS, ComptesExtranet.normaliserPage("  " + PAGE_TEDIS + " ", TEDIS));
        assertTrue(PAGE_UBIPHARM.length() > 200 && PAGE_UBIPHARM.length() <= 1000,
                "longueur " + PAGE_UBIPHARM.length());
    }

    @Test
    void cheminsEtAdressesTiresAuHasard() {
        Random r = new Random(20261108L);
        String[] morceaux = { "login", "Login", "compte", "auth", "realms", "TIC-SSO", "index.php", "connexion-2" };
        String[] hotes = { "client-cotedivoire.ubipharm.com", "auth.ubipharm.com", "ubipharm.com",
                "sso.auth.ubipharm.com" };
        for (int cas = 0; cas < 3000; cas++) {
            StringBuilder c = new StringBuilder();
            for (int i = 0; i <= r.nextInt(4); i++) {
                c.append('/').append(morceaux[r.nextInt(morceaux.length)]);
            }
            String chemin = c + (r.nextBoolean() ? "?redirect_uri=https%3A%2F%2Fx%2FCallbackSSO&state=a1" : "");
            String blancs = r.nextBoolean() ? "  " : "";
            /* chemin : garde ; idempotent */
            assertEquals(chemin, ComptesExtranet.normaliserPage(blancs + chemin + blancs, UBIPHARM));
            /* adresse complete du domaine : gardee telle quelle, idempotente */
            String complete = "https://" + hotes[r.nextInt(hotes.length)] + chemin;
            assertEquals(complete, ComptesExtranet.normaliserPage(complete, UBIPHARM));
            assertEquals(complete,
                    ComptesExtranet.normaliserPage(ComptesExtranet.normaliserPage(complete, UBIPHARM), UBIPHARM));
            /* meme chemin sur un autre domaine, ou en http : refuse */
            String autre = "https://" + (r.nextBoolean() ? "ubipharm.com.ailleurs.net" : "fauxubipharm.com") + chemin;
            assertThrows(IllegalArgumentException.class, () -> ComptesExtranet.normaliserPage(autre, UBIPHARM), autre);
            assertThrows(IllegalArgumentException.class,
                    () -> ComptesExtranet.normaliserPage(complete.replace("https:", "http:"), UBIPHARM));
        }
    }

    @Test
    void videParDefautEtRefus() {
        for (String vide : new String[] { null, "", "   " }) {
            assertNull(ComptesExtranet.normaliserPage(vide, UBIPHARM));
            assertNull(ComptesExtranet.normaliserChamp(vide));
        }
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> ComptesExtranet.normaliserPage("https://ailleurs.exemple/login", UBIPHARM));
        assertEquals("La page de connexion doit être sur client-cotedivoire.ubipharm.com ou un autre serveur de"
                + " ubipharm.com (en https)", e.getMessage());
        for (String mauvais : new String[] { "login", "//ailleurs.exemple/x", "/a b", "/a#b", "/a\\b",
                "/" + "x".repeat(1000), PAGE_TEDIS }) {
            assertThrows(IllegalArgumentException.class, () -> ComptesExtranet.normaliserPage(mauvais, UBIPHARM),
                    mauvais);
        }
        assertEquals("user[login]", ComptesExtranet.normaliserChamp(" user[login] "));
        for (String mauvais : new String[] { "a b", "a\"b", "<x>", "x".repeat(101) }) {
            assertThrows(IllegalArgumentException.class, () -> ComptesExtranet.normaliserChamp(mauvais));
        }
        ConnexionExtranet.Identifiants i = new ConnexionExtranet.Identifiants("u", "p", "e", null, " ");
        assertEquals("/", i.pageConnexion);
        assertNull(i.champIdentifiant);
    }

    @Test
    void memeDomaine() {
        URI u = URI.create(UBIPHARM + "/");
        assertTrue(ConnexionExtranet.memeDomaine(u, URI.create(PAGE_UBIPHARM)));
        assertTrue(ConnexionExtranet.memeDomaine(u,
                URI.create("https://client-cotedivoire.ubipharm.com/CallbackSSO?code=x")));
        assertFalse(ConnexionExtranet.memeDomaine(u, URI.create("https://ubipharm.com.ailleurs.net/")));
        assertFalse(ConnexionExtranet.memeDomaine(u, URI.create("http://auth.ubipharm.com/")));
        assertFalse(ConnexionExtranet.memeDomaine(u, URI.create("https://www.tedispharma-ci.com/login")));
        /* adresse IP : elle seule, meme port */
        URI ip = URI.create("http://127.0.0.1:18765/");
        assertTrue(ConnexionExtranet.memeDomaine(ip, URI.create("http://127.0.0.1:18765/login")));
        assertFalse(ConnexionExtranet.memeDomaine(ip, URI.create("http://127.0.0.2:18765/login")));
        assertFalse(ConnexionExtranet.memeDomaine(ip, URI.create("http://127.0.0.1:18766/login")));
        assertNull(ConnexionExtranet.domaine("localhost"));
    }

    @Test
    void cookiesRangesParServeur() {
        ConnexionExtranet.Bocal b = new ConnexionExtranet.Bocal();
        URI auth = URI.create("https://auth.ubipharm.com/realms/TIC-SSO/login-actions/authenticate");
        URI client = URI.create("https://client-cotedivoire.ubipharm.com/CallbackSSO");
        b.recevoir(auth,
                List.of("AUTH_SESSION_ID=a1; Path=/realms/TIC-SSO/; Secure; HttpOnly",
                        "KEYCLOAK_IDENTITY=k1; Path=/realms/TIC-SSO/", "COMMUN=c1; Domain=.ubipharm.com; Path=/",
                        "VOL=v1; Domain=com; Path=/", "AUTRE=x; Domain=ailleurs.net"));
        b.recevoir(client, List.of("SESSIONID=s1; Path=/; HttpOnly"));
        /* l'extranet ne recoit jamais les cookies du serveur d'authentification */
        assertEquals(Map.of("COMMUN", "c1", "SESSIONID", "s1"), b.pour("client-cotedivoire.ubipharm.com"));
        assertEquals(
                Map.of("COMMUN", "c1", "AUTH_SESSION_ID", "a1", "KEYCLOAK_IDENTITY", "k1", "VOL", "v1", "AUTRE", "x"),
                b.pour("auth.ubipharm.com"));
        assertEquals(Map.of(), b.pour("www.tedispharma-ci.com"));
        /* cookie efface par le serveur */
        b.recevoir(client, List.of("SESSIONID=; Max-Age=0"));
        assertEquals(Map.of("COMMUN", "c1"), b.pour("client-cotedivoire.ubipharm.com"));
    }
}
