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
    @DisplayName("Deuxieme appel servi par le cache, sans nouvelle resolution")
    void deuxiemeAppelServiParLeCache() {
        String premier = NomDePoste.resoudre("127.0.0.1");
        long debut = System.nanoTime();
        String second = NomDePoste.resoudre("127.0.0.1");
        long dureeMs = (System.nanoTime() - debut) / 1_000_000;
        assertEquals(premier, second);
        // Servi par le cache : bien en dessous du delai maximal de resolution.
        assertTrue(dureeMs < NomDePoste.DELAI_MS, "appel cache trop lent : " + dureeMs + " ms");
    }

    @Test
    @DisplayName("Adresse sans nom DNS : retombe sur l'adresse IP")
    void adresseIrresolvableRetombeSurLIp() {
        // Adresse de test (RFC 5737) sans nom : la resolution rend l'IP elle-meme,
        // dans le delai borne ou par le repli du timeout.
        assertEquals("192.0.2.123", NomDePoste.resoudre("192.0.2.123"));
    }
}
