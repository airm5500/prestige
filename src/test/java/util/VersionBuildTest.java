package util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** Rapport du 26/10 (SC8) : version du build jointe aux evenements du Centre de support. */
class VersionBuildTest {

    private static String lire(String contenu) throws IOException {
        return VersionBuild.lire(new ByteArrayInputStream(contenu.getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    void horodatageDuBuild() throws IOException {
        assertEquals("2026-10-28 17:09 UTC", lire("# commentaire\nbuild=2026-10-28 17:09\n"));
    }

    @Test
    void fichierNonFiltreOuAbsent() throws IOException {
        assertEquals("", lire("build=${maven.build.timestamp}\n"));
        assertEquals("", lire(""));
        assertEquals("", VersionBuild.lire(null));
    }

    @Test
    void fichierDuBuildCourant() {
        /* sous Maven, target/classes porte le fichier filtre : une date */
        String v = VersionBuild.libelle();
        assertEquals(true, v.isEmpty() || v.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2} UTC"), v);
    }
}
