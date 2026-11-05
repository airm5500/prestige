package dal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

/** Cas 4, lot 4.A : aucun mot de passe ni URL de connexion dans ce que JdbConnexion journalise. */
class JdbConnexionTest {

    @Test
    void messageJournaliseSansMotDePasseNiUrl() {
        String url = "jdbc:mysql://srv/base?user=prestige&password=Tr3s-Secret";
        String m = JdbConnexion.filtrer("java.sql.SQLException: No suitable driver found for " + url, "Tr3s-Secret",
                url);
        assertEquals("java.sql.SQLException: No suitable driver found for jdbc:mysql://***", m);
        m = JdbConnexion.filtrer(
                "Access denied for user 'prestige' (using password: Tr3s-Secret) password=Tr3s-Secret&x", "Tr3s-Secret",
                url);
        assertFalse(m.contains("Tr3s-Secret"), m);
        assertEquals("Access denied for user 'prestige' (using password: ***) password=***&x", m);
        assertEquals("", JdbConnexion.filtrer(null, "x", url));
        assertEquals("sans rien", JdbConnexion.filtrer("sans rien", "", null));
    }
}
