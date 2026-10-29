package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport du 26/10 (A4) : « abc » dans un filtre entier de « Liste des articles vendus » donnait la page 404 de Payara.
 * Jersey leve alors une ParamException.QueryParamException ; la classe est imitee ici par une simple RuntimeException
 * (une WebApplicationException demande l'implementation de Jersey, absente des tests unitaires) : seul le nom de la
 * classe compte.
 */
class ParametreIllisibleTest {

    /** Meme nom simple que org.glassfish.jersey.server.ParamException.QueryParamException. */
    static class QueryParamException extends RuntimeException {
        private final String nom;

        QueryParamException(String nom) {
            this.nom = nom;
        }

        public String getParameterName() {
            return nom;
        }
    }

    @Test
    @DisplayName("Filtre illisible : le message nomme le parametre")
    void parametreNomme() {
        assertEquals("Valeur saisie invalide pour « stock ».",
                SaisieInvalide.parametreIllisible(new QueryParamException("stock")));
    }

    @Test
    @DisplayName("Nom absent : message general")
    void sansNom() {
        assertEquals("Valeur saisie invalide dans un filtre.",
                SaisieInvalide.parametreIllisible(new QueryParamException(null)));
    }

    @Test
    @DisplayName("Vraie ressource absente (404) : inchangee")
    void autre404() {
        assertNull(SaisieInvalide.parametreIllisible(new IllegalStateException("ressource absente")));
        assertNull(SaisieInvalide.parametreIllisible(null));
    }
}
