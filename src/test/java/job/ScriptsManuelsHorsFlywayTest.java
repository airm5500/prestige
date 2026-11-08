package job;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 1 : le rattrapage des clotures d'inventaire (ancienne migration V6.9.36) est lance a la main,
 * plus par Flyway au demarrage ; et une erreur de validation Flyway ne doit jamais pouvoir vider la base.
 */
class ScriptsManuelsHorsFlywayTest {

    private static final Path MIGRATIONS = Paths.get("src/main/resources/db/migration");

    @Test
    void rattrapageInventaireSortiDesMigrations() throws IOException {
        try (Stream<Path> l = Files.list(MIGRATIONS)) {
            assertFalse(l.anyMatch(p -> p.getFileName().toString().startsWith("V6.9.36__")),
                    "V6.9.36 ne doit plus etre joue par Flyway");
        }
        Path manuel = Paths.get("outils/scripts-manuels/rattrapage_cloture_inventaire_rest.sql");
        assertTrue(Files.isRegularFile(manuel), "le script manuel doit exister");
        String sql = new String(Files.readAllBytes(manuel), StandardCharsets.UTF_8);
        assertTrue(sql.contains("rattrapage_cloture_inventaire"), "le script manuel garde sa trace de verification");
        assertTrue(Files.isRegularFile(Paths.get("outils/scripts-manuels/LISEZMOI.md")), "notice du script manuel");
    }

    @Test
    void flywayNeVidePasLaBaseSurErreurDeValidation() throws IOException {
        String src = new String(Files.readAllBytes(Paths.get("src/main/java/job/FlywayStartupBean.java")),
                StandardCharsets.UTF_8);
        assertTrue(src.contains("cleanOnValidationError(false)"), "cleanOnValidationError doit etre a false");
        assertFalse(src.contains("cleanOnValidationError(true)"));
    }
}
