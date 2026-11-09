package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ApplicationPayara;
import rest.service.impl.serveur.Asadmin;

/** Cas 4, lot 4.B : regles du mot de passe de la base (validation, generation, ordres) ; aucune valeur ne fuit. */
class MotDePasseBaseTest {

    @Test
    void saisieValide() {
        assertNull(MotDePasseBase.valider("Abcdef12#xyz", "Abcdef12#xyz"));
        assertNull(MotDePasseBase.valider("prestige-2026:Officine", "prestige-2026:Officine"));
    }

    @Test
    void saisieRefusee() {
        assertTrue(MotDePasseBase.valider("", "").contains("vide"));
        assertTrue(MotDePasseBase.valider("Abc12#", "Abc12#").contains("12 caractères"));
        assertTrue(MotDePasseBase.valider("Abcdefghijkl", "Abcdefghijkl").contains("symbole"),
                "sans chiffre ni symbole");
        assertTrue(MotDePasseBase.valider("Abcdefgh1234", "Abcdefgh1234").contains("symbole"), "sans symbole");
        assertTrue(MotDePasseBase.valider("Abcdef12#xyz", "Abcdef12#xyW").contains("confirmation"));
        for (String interdit : new String[] { "&", "?", "'", "\"", " ", "%", "!", "^", "|", "<", ">", "(", ")", "$",
                "{", "}", "\\", "é" }) {
            String m = MotDePasseBase.valider("Abcdef12#xy" + interdit, "Abcdef12#xy" + interdit);
            assertNotNull(m, interdit);
            assertTrue(m.contains("non admis"), interdit + " : " + m);
            assertFalse(m.contains("Abcdef12"), "la valeur ne figure pas dans le message");
        }
    }

    @Test
    void generationForte() {
        SecureRandom alea = new SecureRandom();
        for (int i = 0; i < 200; i++) {
            String m = MotDePasseBase.generer(alea);
            assertEquals(MotDePasseBase.LONGUEUR_GENEREE, m.length());
            assertNull(MotDePasseBase.valider(m, m), m);
            assertTrue(m.matches(".*[a-z].*") && m.matches(".*[A-Z].*") && m.matches(".*[0-9].*"), m);
            assertTrue(MotDePasseBase.valeurAdmise(m));
        }
        assertNotEquals(MotDePasseBase.generer(alea), MotDePasseBase.generer(alea));
    }

    @Test
    void ordreAlterUser() {
        assertEquals("ALTER USER 'prestige'@'localhost' IDENTIFIED BY 'Abcdef12#xyz'",
                MotDePasseBase.ordreAlterUser("prestige", "localhost", "Abcdef12#xyz"));
        assertEquals("ALTER USER 'p'@'%' IDENTIFIED BY 'Abcdef12#xyz'",
                MotDePasseBase.ordreAlterUser("p", "%", "Abcdef12#xyz"));
        assertThrows(IllegalArgumentException.class,
                () -> MotDePasseBase.ordreAlterUser("a'b", "localhost", "Abcdef12#xyz"));
        assertThrows(IllegalArgumentException.class,
                () -> MotDePasseBase.ordreAlterUser("prestige", "a'b", "Abcdef12#xyz"));
        assertThrows(IllegalArgumentException.class,
                () -> MotDePasseBase.ordreAlterUser("prestige", "localhost", "a'b"));
        assertThrows(IllegalArgumentException.class, () -> MotDePasseBase.ordreAlterUser("prestige", "localhost", ""));
    }

    @Test
    void exceptionControleeDeLaListeFermee() {
        assertEquals("resources.jdbc-connection-pool.laborex_pool.property.password=Abcdef12#xyz",
                ApplicationPayara.motDePassePool("laborex_pool", "Abcdef12#xyz").get(1));
        assertEquals("resources.jdbc-connection-pool.laborex_pool.property.password=${ALIAS=prestige-db}",
                ApplicationPayara.motDePassePool("laborex_pool", "${ALIAS=prestige-db}").get(1));
        /* ancien mot de passe de domain.xml, pour le retour arriere : tel quel hors espace et guillemet */
        assertEquals(2, ApplicationPayara.motDePassePool("laborex_pool", "ancien&mot!de?passe").size());
        assertThrows(IllegalArgumentException.class, () -> ApplicationPayara.motDePassePool("laborex_pool", "a b"));
        assertThrows(IllegalArgumentException.class, () -> ApplicationPayara.motDePassePool("laborex_pool", "a\"b"));
        assertThrows(IllegalArgumentException.class, () -> ApplicationPayara.motDePassePool("laborex_pool", ""));
        assertThrows(IllegalArgumentException.class, () -> ApplicationPayara.motDePassePool("pool;x", "Abcdef12#xyz"));
        /* la liste fermee n'admet que l'alias, jamais une valeur en clair */
        assertTrue(
                ApplicationPayara.autorisee(ApplicationPayara.motDePassePool("laborex_pool", "${ALIAS=prestige-db}")));
        assertFalse(ApplicationPayara.autorisee(ApplicationPayara.motDePassePool("laborex_pool", "Abcdef12#xyz")));
    }

    @Test
    void sortieAsadminSansValeur() {
        String r = Asadmin.resume(
                "resources.jdbc-connection-pool.laborex_pool.property.password=Secret12#xyz\nCommand set executed successfully.");
        assertFalse(r.contains("Secret12"), r);
        assertTrue(r.contains("password=***"), r);
        assertFalse(Asadmin.resume("erreur password=Secret12#xyz fin").contains("Secret12"));
    }

    @Test
    void causeSansValeur() {
        String c = RotationMotDePasse.cause(new RuntimeException(new java.sql.SQLException(
                "You have an error near 'ALTER USER 'p'@'h' IDENTIFIED BY 'Secret12#xyz'' ; url jdbc:mysql://h/b?user=u&password=Secret12#xyz")));
        assertFalse(c.contains("Secret12"), c);
    }
}
