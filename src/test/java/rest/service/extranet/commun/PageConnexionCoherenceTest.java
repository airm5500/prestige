package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Page de connexion et champ identifiant saisis dans l'onglet Sessions (plus de fichier de configuration) : vide = par
 * defaut, adresse complete du meme extranet ramenee au chemin, autre site et chemins dangereux refuses.
 */
class PageConnexionCoherenceTest {

    private static final String ADRESSE = "https://client-cotedivoire.ubipharm.com";

    @Test
    void cheminsTiresAuHasard() {
        Random r = new Random(20261108L);
        String[] morceaux = { "login", "Login", "compte", "auth", "fr", "index.php", "connexion-2" };
        for (int cas = 0; cas < 3000; cas++) {
            StringBuilder c = new StringBuilder();
            for (int i = 0; i <= r.nextInt(3); i++) {
                c.append('/').append(morceaux[r.nextInt(morceaux.length)]);
            }
            String chemin = c + (r.nextBoolean() ? "?retour=%2F" : "");
            String blancs = r.nextBoolean() ? "  " : "";
            assertEquals(chemin, ComptesExtranet.normaliserPage(blancs + chemin + blancs, ADRESSE));
            /* adresse complete du meme site : meme chemin ; idempotent */
            assertEquals(chemin, ComptesExtranet.normaliserPage(ADRESSE + chemin, ADRESSE));
            assertEquals(chemin, ComptesExtranet.normaliserPage(
                    ComptesExtranet.normaliserPage(ADRESSE.toUpperCase().replace("HTTPS", "https") + chemin, ADRESSE),
                    ADRESSE));
        }
    }

    @Test
    void videParDefautEtRefus() {
        for (String vide : new String[] { null, "", "   " }) {
            assertNull(ComptesExtranet.normaliserPage(vide, ADRESSE));
            assertNull(ComptesExtranet.normaliserChamp(vide));
        }
        assertEquals("/", ComptesExtranet.normaliserPage(ADRESSE, ADRESSE));
        for (String mauvais : new String[] { "https://ailleurs.exemple/login", "login", "//ailleurs.exemple/x", "/a b",
                "/a#b", "/a\\b", "/" + "x".repeat(300) }) {
            assertThrows(IllegalArgumentException.class, () -> ComptesExtranet.normaliserPage(mauvais, ADRESSE),
                    mauvais);
        }
        assertEquals("user[login]", ComptesExtranet.normaliserChamp(" user[login] "));
        for (String mauvais : new String[] { "a b", "a\"b", "<x>", "x".repeat(101) }) {
            assertThrows(IllegalArgumentException.class, () -> ComptesExtranet.normaliserChamp(mauvais));
        }
        /* par defaut dans la connexion : page « / », champ detecte */
        ConnexionExtranet.Identifiants i = new ConnexionExtranet.Identifiants("u", "p", "e", null, " ");
        assertEquals("/", i.pageConnexion);
        assertNull(i.champIdentifiant);
        assertTrue(new ConnexionExtranet.Identifiants("u", "p", "e", "/login", "email").pageConnexion.equals("/login"));
    }
}
