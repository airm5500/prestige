package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * La resolution du nom de poste ne doit jamais bloquer la connexion : elle rend toujours une valeur exploitable (au
 * pire l'adresse IP), et les passages suivants du meme poste sont servis par le cache.
 */
class NomDePosteTest {

    @Test
    @DisplayName("Adresse vide ou nulle : chaine vide, jamais d'exception")
    void adresseVideOuNulle() {
        assertEquals("", NomDePoste.resoudre(null));
        assertEquals("", NomDePoste.resoudre(""));
        assertEquals("", NomDePoste.resoudre("   "));
        assertEquals("", NomDePoste.depuis(null));
    }

    @Test
    @DisplayName("Rend toujours une valeur non vide pour une adresse valide")
    void rendToujoursUneValeurNonVide() {
        // 127.0.0.1 se resout localement (pas de DNS reseau) : le resultat est le nom local ou l'IP,
        // jamais vide, jamais une exception.
        String nom = NomDePoste.resoudre("127.0.0.1");
        assertNotNull(nom);
        assertFalse(nom.trim().isEmpty());
    }

    @Test
    @DisplayName("Une fois la resolution terminee, les appels suivants sont servis par le cache")
    void deuxiemeAppelServiParLeCache() throws InterruptedException {
        // Le premier appel peut depasser le delai borne (il rend alors l'IP pendant que la
        // resolution se termine en arriere-plan) : on attend que le cache soit reellement
        // rempli avant de mesurer, sinon le test rejoue une resolution complete.
        NomDePoste.resoudre("127.0.0.1");
        long dateLimite = System.currentTimeMillis() + 5000;
        long dureeMs = Long.MAX_VALUE;
        String valeurCachee = "";
        while (System.currentTimeMillis() < dateLimite) {
            long debut = System.nanoTime();
            valeurCachee = NomDePoste.resoudre("127.0.0.1");
            dureeMs = (System.nanoTime() - debut) / 1_000_000;
            if (dureeMs < 50) {
                break;
            }
            Thread.sleep(100);
        }
        // Servi par le cache : une simple lecture de table, tres loin du delai de resolution.
        assertTrue(dureeMs < 50, "appel cache trop lent : " + dureeMs + " ms");
        assertFalse(valeurCachee.trim().isEmpty());
        // Et la valeur est stable d'un appel a l'autre.
        assertEquals(valeurCachee, NomDePoste.resoudre("127.0.0.1"));
    }

    @Test
    @DisplayName("Adresse sans nom DNS : retombe sur l'adresse IP")
    void adresseIrresolvableRetombeSurLIp() {
        // Adresse de test (RFC 5737) sans nom : la resolution rend l'IP elle-meme,
        // dans le delai borne ou par le repli du timeout.
        assertEquals("192.0.2.123", NomDePoste.resoudre("192.0.2.123"));
    }
}
