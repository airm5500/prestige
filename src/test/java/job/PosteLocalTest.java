package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Nom du poste porte par les alertes du support.
 *
 * <p>
 * Une officine compte un serveur d'application par poste. Ce nom entre dans la signature de l'evenement : il doit
 * rester stable et exploitable, quel que soit le nom que porte la machine.
 */
class PosteLocalTest {

    @Test
    @DisplayName("Un nom de machine ordinaire est conserve tel quel")
    void nomOrdinaire() {
        assertEquals("CAISSE-01", PosteLocal.nettoyer("CAISSE-01"));
        assertEquals("srv.officine.local", PosteLocal.nettoyer("srv.officine.local"));
    }

    @Test
    @DisplayName("Espaces et accents ne doivent pas entrer dans un identifiant")
    void nomAvecEspacesEtAccents() {
        assertEquals("POSTE-CAISSE-2", PosteLocal.nettoyer("POSTE CAISSE 2"));
        assertEquals("PHARMACIE-CENTRALE", PosteLocal.nettoyer("PHARMACIE  CENTRALE"));
        assertFalse(PosteLocal.nettoyer("Caissé-Numéro-1").contains("é"));
    }

    @Test
    @DisplayName("Un nom vide ou illisible ne fait pas echouer la surveillance")
    void nomAbsent() {
        assertEquals("poste-inconnu", PosteLocal.nettoyer(null));
        assertEquals("poste-inconnu", PosteLocal.nettoyer("   "));
        assertEquals("poste-inconnu", PosteLocal.nettoyer("---"));
    }

    @Test
    @DisplayName("Un nom demesure est ramene a une longueur utilisable")
    void nomTropLong() {
        String tresLong = new String(new char[200]).replace('\0', 'a');
        assertTrue(PosteLocal.nettoyer(tresLong).length() <= 60);
    }

    @Test
    @DisplayName("L'identifiant distingue le serveur d'une caisse")
    void roleDuPoste() {
        assertTrue(PosteLocal.identifiant(true).endsWith("/serveur"));
        assertTrue(PosteLocal.identifiant(false).endsWith("/caisse"));
    }

    @Test
    @DisplayName("Le nom de machine est toujours renseigne, jamais vide")
    void nomToujoursRenseigne() {
        assertFalse(PosteLocal.nomMachine().isEmpty());
    }
}
