package rest.service.impl.sauvegarde;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Retour du 12/11 : « la sauvegarde doit se faire uniquement sur le serveur pas sur chaque poste ». Officine type
 * appaul : le serveur heberge la base, cinq caisses ont chacune leur Payara branche sur le serveur.
 */
class PosteSauvegardeTest {

    private static final List<String> IP_SERVEUR = Arrays.asList("192.168.1.10", "127.0.0.1", "fe80:0:0:0:1:2:3:4");

    @Test
    void seulLeServeurSauvegardeQuandLaBaseEstLocale() {
        assertTrue(PosteSauvegarde.estServeur("", "localhost", "SERVEUR", IP_SERVEUR));
        assertTrue(PosteSauvegarde.estServeur(null, "127.0.0.1", "SERVEUR", IP_SERVEUR));
        assertTrue(PosteSauvegarde.estServeur("", "192.168.1.10", "SERVEUR", IP_SERVEUR));
        assertTrue(PosteSauvegarde.estServeur("", "serveur", "SERVEUR", IP_SERVEUR));
        assertTrue(PosteSauvegarde.estServeur("", "SERVEUR.officine.local", "serveur", IP_SERVEUR));
        int serveurs = 0;
        for (String caisse : new String[] { "SERVEUR", "CAISSE11", "CAISSE22", "CAISSE33", "CAISSE44",
                "DESKTOP-CEPK07B", "SERVEURLENOVO" }) {
            boolean local = "SERVEUR".equals(caisse);
            List<String> ip = local ? IP_SERVEUR : Arrays.asList("192.168.1." + (20 + caisse.length()), "127.0.0.1");
            if (PosteSauvegarde.estServeur("", local ? "localhost" : "192.168.1.10", caisse, ip)) {
                serveurs++;
            }
            assertFalse(!local && PosteSauvegarde.estServeur("", "SERVEUR", caisse, ip), caisse);
        }
        assertEquals(1, serveurs, "une seule sauvegarde par heure pour toute l'officine");
    }

    @Test
    void posteImposeParLeParametre() {
        assertTrue(PosteSauvegarde.estServeur("CAISSE11", "192.168.1.10", "caisse11", Collections.emptyList()));
        assertFalse(PosteSauvegarde.estServeur("CAISSE11", "localhost", "SERVEUR", IP_SERVEUR));
        assertTrue(PosteSauvegarde.estServeur("serveur.officine.local", "localhost", "SERVEUR", IP_SERVEUR));
    }

    @Test
    void ipv6EtCrochets() {
        assertTrue(PosteSauvegarde.estServeur("", "[::1]", "X", Collections.emptyList()));
        assertTrue(PosteSauvegarde.estServeur("", "fe80:0:0:0:1:2:3:4", "X", IP_SERVEUR));
        assertFalse(PosteSauvegarde.estServeur("", "10.0.0.5", "X", IP_SERVEUR));
        // une adresse IP n'est pas coupee au premier point comme un nom de domaine
        assertFalse(PosteSauvegarde.estServeur("", "192.168.1.100", "192", IP_SERVEUR));
    }
}
