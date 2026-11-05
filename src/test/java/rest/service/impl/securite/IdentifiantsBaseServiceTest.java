package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import rest.service.impl.sauvegarde.PoolMariaDb;

/**
 * Cas 4, lot 4.A : fichier d'identifiants du compte de sauvegarde, chiffre par DPAPI ; aucun secret dans les messages
 * d'erreur.
 */
class IdentifiantsBaseServiceTest {

    private static final String OPTIONS = "[client]\nuser=\"prestige_sauvegarde\"\npassword=\"a\\\"b\\\\c#d e\"\nhost=\"127.0.0.1\"\nport=3307\n";

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void chiffreEtRelitParDpapi() throws Exception {
        String chiffre = IdentifiantsBaseService.chiffrer(OPTIONS);
        assertTrue(chiffre.startsWith(IdentifiantsBaseService.ENTETE + "\r\n"));
        assertFalse(chiffre.contains("prestige_sauvegarde"), "rien en clair");
        assertFalse(chiffre.contains("a\\\"b"), "rien en clair");
        Path f = Files.createTempFile("essai-identifiants", ".cnf");
        try {
            Files.write(f, chiffre.getBytes(StandardCharsets.UTF_8));
            PoolMariaDb p = IdentifiantsBaseService.lire(f);
            assertEquals("prestige_sauvegarde", p.utilisateur);
            assertEquals("a\"b\\c#d e", p.motDePasse);
            assertEquals("127.0.0.1", p.hote);
            assertEquals(3307, p.port);
            assertEquals("", p.base, "la base vient de l'appelant");
            assertTrue(p.options().contains("password=\"a\\\"b\\\\c#d e\"\n"));
        } finally {
            Files.deleteIfExists(f);
        }
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void fichierEnClairRefuseSousWindows() throws Exception {
        Path f = Files.createTempFile("essai-identifiants-clair", ".cnf");
        try {
            Files.write(f, OPTIONS.getBytes(StandardCharsets.UTF_8));
            IllegalStateException e = assertThrows(IllegalStateException.class, () -> IdentifiantsBaseService.lire(f));
            assertTrue(e.getMessage().contains("-Chiffrer"), e.getMessage());
            assertFalse(e.getMessage().contains("a\"b"), "aucun secret dans le message");
        } finally {
            Files.deleteIfExists(f);
        }
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void blocIllisibleSansSecretDansLeMessage() throws Exception {
        Path f = Files.createTempFile("essai-identifiants-faux", ".cnf");
        try {
            Files.write(f, (IdentifiantsBaseService.ENTETE + "\r\nAAAAQUJD\r\n").getBytes(StandardCharsets.UTF_8));
            IllegalStateException e = assertThrows(IllegalStateException.class, () -> IdentifiantsBaseService.lire(f));
            assertTrue(e.getMessage().contains("déchiffrables"), e.getMessage());
            Files.write(f, "pas du base64 !!".getBytes(StandardCharsets.UTF_8));
            e = assertThrows(IllegalStateException.class, () -> IdentifiantsBaseService.lire(f));
            assertTrue(e.getMessage().contains("ni un fichier d'options ni un bloc"), e.getMessage());
        } finally {
            Files.deleteIfExists(f);
        }
    }

    @Test
    void fichierAbsentOuIncomplet() throws Exception {
        Path absent = Paths.get(System.getProperty("java.io.tmpdir"),
                "prestige-inexistant-" + System.nanoTime() + ".cnf");
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> IdentifiantsBaseService.lire(absent));
        assertTrue(e.getMessage().contains("introuvable") && e.getMessage().contains("-CreerCompte"), e.getMessage());
        assertEquals(IdentifiantsBaseService.fichierParDefaut(), IdentifiantsBaseService.fichier(" "));
        assertEquals(Paths.get("D:\\x\\y.cnf"), IdentifiantsBaseService.fichier(" D:\\x\\y.cnf "));
        if (File.separatorChar == '\\') {
            assertTrue(IdentifiantsBaseService.fichierParDefaut().toString().endsWith("\\Prestige\\sauvegarde.cnf"));
        }
    }

    @Test
    void parametreInactifHorsPayara() {
        IdentifiantsBaseService.oublier();
        assertFalse(IdentifiantsBaseService.actifDepuisPool(), "sans pool JNDI : ancien chemin");
    }
}
