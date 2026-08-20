package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regle d'ouverture de l'acces de depannage (login ouvrant le compte systeme sans mot de passe).
 *
 * Cette regle decide si une officine est accessible sans mot de passe : elle doit se tromper du bon cote. Un parametre
 * absent, vide, mal saisi ou supprime doit FERMER l'acces. Seule la valeur exacte '1' l'ouvre.
 */
class AccesDepannageTest {

    @Test
    @DisplayName("Seule la valeur '1' ouvre l'acces")
    void seulUnOuvre() {
        assertTrue(UserServiceImpl.accesDepannageAutorise("1"));
        assertTrue(UserServiceImpl.accesDepannageAutorise(" 1 "), "espaces autour de la valeur toleres");
    }

    @Test
    @DisplayName("Parametre absent, vide ou nul : acces ferme")
    void absentFerme() {
        assertFalse(UserServiceImpl.accesDepannageAutorise(null), "parametre supprime de la base");
        assertFalse(UserServiceImpl.accesDepannageAutorise(""));
        assertFalse(UserServiceImpl.accesDepannageAutorise("   "));
    }

    @Test
    @DisplayName("Toute autre valeur ferme l'acces, y compris les formulations proches")
    void touteAutreValeurFerme() {
        assertFalse(UserServiceImpl.accesDepannageAutorise("0"));
        // Formulations qu'un administrateur pourrait saisir en croyant activer : elles ne doivent PAS
        // ouvrir. Mieux vaut un acces qui ne s'ouvre pas qu'une officine ouverte par megarde.
        assertFalse(UserServiceImpl.accesDepannageAutorise("true"));
        assertFalse(UserServiceImpl.accesDepannageAutorise("oui"));
        assertFalse(UserServiceImpl.accesDepannageAutorise("O"));
        assertFalse(UserServiceImpl.accesDepannageAutorise("actif"));
        assertFalse(UserServiceImpl.accesDepannageAutorise("11"));
        assertFalse(UserServiceImpl.accesDepannageAutorise("1,0"));
    }
}
