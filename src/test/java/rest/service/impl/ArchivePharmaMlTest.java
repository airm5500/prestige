package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Retours du 08/10 (5) : dossiers par type et par mois, lecture des anciennes archives, journal des transmissions. */
class ArchivePharmaMlTest {

    @TempDir
    Path racine;
    private final String mois = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

    @BeforeEach
    void forcer() {
        ArchivePharmaMl.racineForcee = racine.toString();
    }

    @AfterEach
    void liberer() {
        ArchivePharmaMl.racineForcee = null;
    }

    @Test
    void typeSelonLePrefixe() {
        assertEquals("commandes", ArchivePharmaMl.type("C_8102026_00008_TEDISPHARMA"));
        assertEquals("commandes", ArchivePharmaMl.type("R_8102026_00008_TEDISPHARMA"));
        assertEquals("commandes", ArchivePharmaMl.type("R_LOG_x"));
        assertEquals("vidages", ArchivePharmaMl.type("V_261008_DPCI"));
        assertEquals("vidages", ArchivePharmaMl.type("RV_261008_DPCI"));
        assertEquals("infoproduit", ArchivePharmaMl.type("I_PRS1_TEDIS"));
        assertEquals("infoproduit", ArchivePharmaMl.type("RI_PRS1_TEDIS"));
        assertEquals("autres", ArchivePharmaMl.type("X_1"));
        assertEquals("commandes/2026-10/C_1.xml",
                ArchivePharmaMl.cheminRelatif("C_1", LocalDateTime.of(2026, 10, 8, 14, 0)));
    }

    @Test
    void ecritDansLeDossierDuTypeEtDuMois() throws Exception {
        String rel = ArchivePharmaMl.ecrire("RI_PRS1_TEDIS", "<x/>");
        assertEquals("infoproduit/" + mois + "/RI_PRS1_TEDIS.xml", rel);
        assertEquals("<x/>", new String(Files.readAllBytes(racine.resolve(rel)), StandardCharsets.UTF_8));
        assertEquals(racine.resolve(rel), ArchivePharmaMl.trouver("RI_PRS1_TEDIS"));
    }

    @Test
    void retrouveLesAnciennesArchivesALaRacineEtLeMoisLePlusRecent() throws Exception {
        Files.write(racine.resolve("RV_ANCIEN_DPCI.xml"), "a".getBytes(StandardCharsets.UTF_8));
        assertEquals(racine.resolve("RV_ANCIEN_DPCI.xml"), ArchivePharmaMl.trouver("RV_ANCIEN_DPCI"));
        Files.createDirectories(racine.resolve("vidages/2026-09"));
        Files.createDirectories(racine.resolve("vidages/2026-10"));
        Files.write(racine.resolve("vidages/2026-09/RV_X.xml"), "9".getBytes(StandardCharsets.UTF_8));
        Files.write(racine.resolve("vidages/2026-10/RV_X.xml"), "10".getBytes(StandardCharsets.UTF_8));
        assertEquals(racine.resolve("vidages/2026-10/RV_X.xml"), ArchivePharmaMl.trouver("RV_X"));
        assertNull(ArchivePharmaMl.trouver("RV_ABSENT"));
        assertNull(ArchivePharmaMl.trouver("../RV_X"), "aucun chemin en dehors du dossier");
    }

    @Test
    void journalUneLigneParEvenementSansSecret() throws Exception {
        ArchivePharmaMl.journal("COMMANDE", "TEDIS PHARMA", "ENVOI", "message 1\nligne | 2");
        ArchivePharmaMl.journal("HTTP", "", "REPONSE 200", "essai 1/3");
        Path j = racine.resolve("log/" + mois + "/pharmaml_" + LocalDate.now() + ".log");
        List<String> l = Files.readAllLines(j, StandardCharsets.UTF_8);
        assertEquals(2, l.size());
        assertTrue(l.get(0).matches(
                "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3} \\| COMMANDE \\| TEDIS PHARMA \\| ENVOI \\| message 1 ligne \\| 2"),
                l.get(0));
        assertTrue(l.get(1).contains("| HTTP | TEDIS PHARMA | REPONSE 200 | essai 1/3"),
                "grossiste repris du traitement en cours : " + l.get(1));
    }

    @Test
    void adresseSansIdentifiantNiParametre() {
        assertEquals("http://h.ci:8080/PharmaML/",
                ArchivePharmaMl.adresseSure("http://u:motdepasse@h.ci:8080/PharmaML/?cle=abc"));
        assertFalse(ArchivePharmaMl.adresseSure("http://u:motdepasse@h.ci/x?cle=abc").contains("motdepasse"));
    }

    @Test
    void sansDossierConfigureRienNestEcrit() {
        ArchivePharmaMl.racineForcee = "";
        assertNull(ArchivePharmaMl.ecrire("C_1", "x"));
        ArchivePharmaMl.journal("COMMANDE", "G", "ENVOI", "x");
    }
}
