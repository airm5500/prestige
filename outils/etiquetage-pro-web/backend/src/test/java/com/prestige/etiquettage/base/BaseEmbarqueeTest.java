package com.prestige.etiquettage.base;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermissions;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Base embarquee reelle (MariaDB4j) : protection par mot de passe, donnees gardees d'un lancement a l'autre. */
class BaseEmbarqueeTest {

    static final Path DOSSIER = Paths.get("target", "base-essai").toAbsolutePath();

    static void effacer() throws Exception {
        if (Files.exists(DOSSIER)) {
            try (Stream<Path> l = Files.walk(DOSSIER)) {
                l.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
            }
        }
    }

    @BeforeAll
    static void avant() throws Exception {
        effacer();
    }

    @AfterAll
    static void apres() throws Exception {
        effacer();
    }

    static String port(String url) {
        return url.replaceAll(".*:(\\d+)/.*", "$1");
    }

    @Test
    void protectionEtPersistance() throws Exception {
        BaseEmbarquee b = new BaseEmbarquee(DOSSIER);
        BaseEmbarquee.Acces a = b.demarrer();
        String motDePasse;
        try {
            assertEquals(BaseEmbarquee.UTILISATEUR, a.utilisateur());
            assertTrue(a.motDePasse().length() >= 24);
            try (Connection c = DriverManager.getConnection(a.url(), a.utilisateur(), a.motDePasse());
                    Statement s = c.createStatement()) {
                s.execute("CREATE TABLE essai (x INT)");
                s.execute("INSERT INTO essai VALUES (42)");
                /* aucun droit hors de bd_etiquette */
                assertThrows(SQLException.class, () -> s.executeQuery("SELECT * FROM mysql.user"));
                assertThrows(SQLException.class, () -> s.execute("CREATE DATABASE autre"));
            }
            String racine = "jdbc:mariadb://127.0.0.1:" + port(a.url()) + "/";
            assertThrows(SQLException.class, () -> DriverManager.getConnection(racine, "root", "").close(),
                    "root sans mot de passe refuse");
            assertThrows(SQLException.class, () -> DriverManager.getConnection(racine, "", "").close(),
                    "aucun compte anonyme");
            Path f = DOSSIER.resolve(BaseEmbarquee.FICHIER_ACCES);
            assertTrue(Files.isRegularFile(f));
            if (f.getFileSystem().supportedFileAttributeViews().contains("posix")) {
                /* Windows : le dossier %LOCALAPPDATA% est deja propre a l'utilisateur */
                assertEquals("rw-------", PosixFilePermissions.toString(Files.getPosixFilePermissions(f)));
            }
            motDePasse = a.motDePasse();
        } finally {
            b.arreter();
        }

        /* second lancement : meme acces, donnees gardees, toujours protegee */
        BaseEmbarquee b2 = new BaseEmbarquee(DOSSIER);
        BaseEmbarquee.Acces a2 = b2.demarrer();
        try {
            assertEquals(motDePasse, a2.motDePasse());
            try (Connection c = DriverManager.getConnection(a2.url(), a2.utilisateur(), a2.motDePasse());
                    Statement s = c.createStatement(); var r = s.executeQuery("SELECT x FROM essai")) {
                r.next();
                assertEquals(42, r.getInt(1));
            }
            assertThrows(SQLException.class, () -> DriverManager
                    .getConnection("jdbc:mariadb://127.0.0.1:" + port(a2.url()) + "/", "root", "").close());
        } finally {
            b2.arreter();
        }

        /* base d'avant la protection (fichier d'acces absent) : protegee de nouveau, donnees gardees */
        Files.delete(DOSSIER.resolve(BaseEmbarquee.FICHIER_ACCES));
        BaseEmbarquee b3 = new BaseEmbarquee(DOSSIER);
        BaseEmbarquee.Acces a3 = b3.demarrer();
        try {
            assertNotEquals(motDePasse, a3.motDePasse());
            try (Connection c = DriverManager.getConnection(a3.url(), a3.utilisateur(), a3.motDePasse());
                    Statement s = c.createStatement(); var r = s.executeQuery("SELECT COUNT(*) FROM essai")) {
                r.next();
                assertEquals(1, r.getInt(1));
            }
            assertThrows(SQLException.class, () -> DriverManager.getConnection(a3.url(), a3.utilisateur(), motDePasse).close(),
                    "ancien mot de passe refuse");
        } finally {
            b3.arreter();
        }
    }

    @Test
    void refusDuDossierTemporaire() {
        BaseEmbarquee b = new BaseEmbarquee(Paths.get(System.getProperty("java.io.tmpdir"), "ep-essai"));
        IllegalStateException e = assertThrows(IllegalStateException.class, b::demarrer);
        assertTrue(e.getMessage().contains("dossier temporaire"));
    }
}
