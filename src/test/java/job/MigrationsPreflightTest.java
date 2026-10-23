package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Journaux de l'officine du 02/10 au 17/10 : « Schema contains a failed repeatable migration (update system privilege)
 * » a chaque demarrage. Une migration en echec bloque toutes les suivantes, et rien ne le signalait hors du server.log
 * : l'auto-diagnostic doit le dire.
 */
class MigrationsPreflightTest {

    @Test
    @DisplayName("Aucune migration en echec : rien a signaler")
    void aucunEchec() {
        SupportPreflight.Controle c = SupportPreflight.evaluerMigrations(Collections.emptyList());

        assertTrue(c.ok);
        assertEquals("MIGRATIONS", c.code);
    }

    @Test
    @DisplayName("Une migration en echec : anomalie qui la nomme, dit ce qu'elle bloque et comment debloquer")
    void unEchec() {
        SupportPreflight.Controle c = SupportPreflight
                .evaluerMigrations(Collections.singletonList("update system privilege (repetable)"));

        assertFalse(c.ok);
        assertTrue(c.detail.contains("update system privilege (repetable)"), c.detail);
        assertTrue(c.detail.contains("ne s'appliquent plus"), c.detail);
        assertTrue(c.detail.contains("flyway_schema_history"), c.detail);
    }

    @Test
    @DisplayName("Plusieurs echecs : tous nommes, au nombre exact")
    void plusieurs() {
        SupportPreflight.Controle c = SupportPreflight
                .evaluerMigrations(Arrays.asList("update system privilege (repetable)", "menu x (7.2.5)"));

        assertFalse(c.ok);
        assertTrue(c.detail.startsWith("2 mise(s) a jour"), c.detail);
        assertTrue(c.detail.contains("menu x (7.2.5)"), c.detail);
    }
}
