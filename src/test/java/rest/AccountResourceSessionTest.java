package rest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AccountResourceSessionTest {

    @Test
    @DisplayName("Une session active refuse la connexion d'un autre compte")
    void refusesDifferentUserInSameBrowserSession() {
        TUser connectedUser = new TUser();
        connectedUser.setStrLOGIN("CAISSIER");

        assertTrue(AccountResource.hasDifferentActiveUser(connectedUser, "STAGIAIRE"));
    }

    @Test
    @DisplayName("Le meme compte reste reconnu sans tenir compte de la casse et des espaces")
    void acceptsSameUserInSameBrowserSession() {
        TUser connectedUser = new TUser();
        connectedUser.setStrLOGIN("CAISSIER");

        assertFalse(AccountResource.hasDifferentActiveUser(connectedUser, " caissier "));
    }

    @Test
    @DisplayName("Une session sans utilisateur ne bloque pas l'authentification")
    void acceptsAuthenticationWithoutActiveUser() {
        assertFalse(AccountResource.hasDifferentActiveUser(null, "STAGIAIRE"));
    }
}
