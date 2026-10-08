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

    // retours du 08/10 (6) : purge au-dela de 12 mois

    private Path fichier(String relatif, String contenu) throws Exception {
        Path p = racine.resolve(relatif);
        Files.createDirectories(p.getParent());
        Files.write(p, contenu.getBytes(StandardCharsets.UTF_8));
        return p;
    }

    @Test
    void premierMoisConserve() {
        assertEquals(java.time.YearMonth.of(2025, 10),
                ArchivePharmaMl.premierMoisConserve(12, java.time.YearMonth.of(2026, 10)));
        assertEquals(java.time.YearMonth.of(2025, 10),
                ArchivePharmaMl.premierMoisConserve(0, java.time.YearMonth.of(2026, 10)), "12 par defaut");
        assertEquals(java.time.YearMonth.of(2026, 7),
                ArchivePharmaMl.premierMoisConserve(3, java.time.YearMonth.of(2026, 10)));
    }

    @Test
    void purgeDesMoisDePlusDe12MoisSeulement() throws Exception {
        java.time.YearMonth m = java.time.YearMonth.now();
        String vieux = m.minusMonths(13).toString(), limite = m.minusMonths(12).toString(), recent = m.toString();
        fichier("commandes/" + vieux + "/C_1.xml", "xxxx");
        fichier("commandes/" + vieux + "/R_1.xml", "yy");
        fichier("log/" + vieux + "/pharmaml_x.log", "z");
        fichier("vidages/" + m.minusMonths(30) + "/RV_1.xml", "z");
        fichier("commandes/" + limite + "/C_2.xml", "garde");
        fichier("infoproduit/" + recent + "/RI_3.xml", "garde");
        fichier("commandes/divers/C_9.xml", "pas un mois : garde");
        Path ancienRacine = fichier("RV_ANCIEN.xml", "vieux");
        Files.setLastModifiedTime(ancienRacine, java.nio.file.attribute.FileTime
                .from(java.time.Instant.now().minus(500, java.time.temporal.ChronoUnit.DAYS)));
        Path recentRacine = fichier("C_RECENT.xml", "garde");
        Path autre = fichier("valorisation_2020.pdf", "pas PharmaML");
        Files.setLastModifiedTime(autre, java.nio.file.attribute.FileTime
                .from(java.time.Instant.now().minus(900, java.time.temporal.ChronoUnit.DAYS)));

        java.util.Map<String, Object> avant = ArchivePharmaMl.comptesPurge(12);
        assertEquals(8L, avant.get("fichiers"),
                "archives et journal seulement (ni dossier hors mois, ni autre fichier)");
        assertEquals(5L, avant.get("fichiersPurges"));
        assertEquals(limite, avant.get("conserveDepuis"));
        assertTrue(Files.exists(racine.resolve("commandes/" + vieux + "/C_1.xml")), "le comptage ne supprime rien");

        java.util.Map<String, Object> r = ArchivePharmaMl.purger(12);
        assertEquals(5L, r.get("fichiersPurges"));
        assertEquals(java.util.Arrays.asList("commandes/" + vieux, "log/" + vieux, "vidages/" + m.minusMonths(30)),
                r.get("dossiersPurges"));
        assertFalse(Files.exists(racine.resolve("commandes/" + vieux)));
        assertFalse(Files.exists(racine.resolve("log/" + vieux)));
        assertFalse(Files.exists(ancienRacine));
        assertTrue(Files.exists(racine.resolve("commandes/" + limite + "/C_2.xml")), "12 derniers mois conserves");
        assertTrue(Files.exists(racine.resolve("infoproduit/" + recent + "/RI_3.xml")));
        assertTrue(Files.exists(racine.resolve("commandes/divers/C_9.xml")));
        assertTrue(Files.exists(recentRacine));
        assertTrue(Files.exists(autre), "les autres fichiers du dossier ne sont jamais touches");
        assertEquals(0L, ArchivePharmaMl.comptesPurge(12).get("fichiersPurges"), "rejouable : plus rien a purger");
    }

    @Test
    void purgeSansDossier() {
        ArchivePharmaMl.racineForcee = "";
        java.util.Map<String, Object> r = ArchivePharmaMl.purger(12);
        assertEquals(false, r.get("dossierPresent"));
        assertEquals(0L, r.get("fichiersPurges"));
    }
}
