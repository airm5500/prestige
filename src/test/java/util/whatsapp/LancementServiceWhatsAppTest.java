package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** CAM-02 (retour de Codex du 02/11) : le service Windows installe ne sert que pour son propre dossier. */
public class LancementServiceWhatsAppTest {

    private static final String SC_QC = "[SC] QueryServiceConfig réussite(s)\r\n\r\nSERVICE_NAME: prestige-whatsapp\r\n"
            + "        TYPE               : 10  WIN32_OWN_PROCESS \r\n"
            + "        BINARY_PATH_NAME   : \"C:\\prestige\\whatsapp-web\\service-windows\\prestige-whatsapp.exe\"\r\n"
            + "        DISPLAY_NAME       : Prestige - WhatsApp\r\n";

    @Test
    public void dossierLuDansLaConfigurationDuService() {
        assertEquals(new File("C:\\prestige\\whatsapp-web").getPath(),
                LancementServiceWhatsApp.dossierDuService(SC_QC).getPath());
        assertNull(LancementServiceWhatsApp.dossierDuService("[SC] OpenService échec(s) 1060"));
    }

    @Test
    public void serviceWindowsSeulementPourSonDossier(@TempDir Path essai) throws IOException {
        File installe = new File(System.getProperty("java.io.tmpdir"), "prestige-wa-installe");
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, ""), "aucun dossier indique : le service");
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, installe.getPath()));
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, installe.getPath().toUpperCase()),
                "Windows : casse indifferente");
        assertFalse(LancementServiceWhatsApp.parLeServiceWindows(installe, compagnon(essai).getPath()),
                "autre dossier du compagnon (instance d'essai) : son script");
        assertFalse(LancementServiceWhatsApp.parLeServiceWindows(null, "C:\\nimporte"), "pas de service installe");
    }

    @Test
    public void codesDeSortie() {
        assertNull(LancementServiceWhatsApp.resultat(true, 0));
        assertNull(LancementServiceWhatsApp.resultat(true, 1056), "service deja demarre : pas un echec");
        assertTrue(LancementServiceWhatsApp.resultat(true, 5).contains("pas le droit"));
        assertTrue(LancementServiceWhatsApp.resultat(false, 5).contains("code 5"));
        assertTrue(LancementServiceWhatsApp.resultat(false, 1056).contains("code 1056"),
                "1056 ne vaut que pour sc start");
    }

    /** Faux dossier du compagnon : package.json « prestige-whatsapp-web », src/serveur.js, demarrer.bat. */
    static File compagnon(Path d) throws IOException {
        Files.createDirectories(d.resolve("src"));
        Files.write(d.resolve("package.json"),
                "{\"name\": \"prestige-whatsapp-web\"}".getBytes(StandardCharsets.UTF_8));
        Files.write(d.resolve("src").resolve("serveur.js"), new byte[0]);
        Files.write(d.resolve("demarrer.bat"), "@echo off".getBytes(StandardCharsets.US_ASCII));
        return d.toFile();
    }

    /**
     * Plan avoir du 08/11, point 9 : la valeur par defaut C:\prestige\whatsapp-web peut n'etre que le dossier des
     * donnees du service Windows (sans package.json) ; le service Windows installe sert alors, comme avant quand le
     * dossier etait vide. Un dossier absent aussi.
     */
    @Test
    public void serviceWindowsSiLeDossierNEstPasCeluiDuCompagnon(@TempDir Path donnees) {
        File installe = new File(System.getProperty("java.io.tmpdir"), "prestige-wa-installe");
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, donnees.toString()),
                "dossier des donnees, sans le compagnon : le service installe");
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, donnees.resolve("absent").toString()),
                "dossier absent : le service installe");
        assertFalse(LancementServiceWhatsApp.parLeServiceWindows(null, donnees.toString()),
                "aucun service installe : rien a demarrer par sc");
    }

    /**
     * Plan avoir du 08/11, point 9 : « je ne veux pas que l'ecran noir reste affiche ». Plus de « start » (qui ouvre
     * toujours une fenetre de console, meme reduite) : cmd est lance directement par Java, qui cree le processus sans
     * fenetre (CREATE_NO_WINDOW) ; la sortie va dans journaux\demarrer.log du dossier ; aucune entree (NUL).
     */
    @Test
    public void lancementDirectSansFenetreAvecJournal(@TempDir Path essai) throws IOException {
        File d = compagnon(essai);
        ProcessBuilder pb = LancementServiceWhatsApp.commandeDirecte(d, true);
        List<String> c = pb.command();
        assertEquals(Arrays.asList("cmd.exe", "/c", new File(d, "demarrer.bat").getAbsolutePath(), "/auto"), c);
        assertFalse(c.contains("start") || c.contains("/min"), "aucune fenetre ouverte par start : " + c);
        assertEquals(d, pb.directory());
        assertTrue(pb.redirectErrorStream(), "erreurs dans le meme journal");
        File journal = new File(new File(d, "journaux"), "demarrer.log");
        assertEquals(ProcessBuilder.Redirect.appendTo(journal), pb.redirectOutput(),
                "sortie dans le journal du dossier");
        assertEquals(ProcessBuilder.Redirect.Type.READ, pb.redirectInput().type(),
                "aucune entree : ni pause ni question");
        assertEquals(journal, LancementServiceWhatsApp.journalDirect(d));
        /* hors Windows : demarrer.sh, meme journal */
        ProcessBuilder sh = LancementServiceWhatsApp.commandeDirecte(d, false);
        assertEquals(Arrays.asList("sh", new File(d, "demarrer.sh").getAbsolutePath(), "--auto"), sh.command());
        assertEquals(ProcessBuilder.Redirect.appendTo(journal), sh.redirectOutput());
    }

    /** Le journal du lancement direct ne grossit pas sans fin : au-dela de 5 Mo, il est garde sous demarrer.1.log. */
    @Test
    public void journalDirectTourne(@TempDir Path essai) throws IOException {
        File d = compagnon(essai);
        File journal = LancementServiceWhatsApp.journalDirect(d);
        LancementServiceWhatsApp.preparerJournal(journal);
        assertTrue(journal.getParentFile().isDirectory(), "dossier journaux cree");
        Files.write(journal.toPath(), new byte[6 * 1024 * 1024]);
        LancementServiceWhatsApp.preparerJournal(journal);
        assertFalse(journal.exists(), "ancien journal mis de cote");
        assertEquals(6L * 1024 * 1024, new File(journal.getParentFile(), "demarrer.1.log").length());
        Files.write(journal.toPath(), "petit".getBytes(StandardCharsets.US_ASCII));
        LancementServiceWhatsApp.preparerJournal(journal);
        assertTrue(journal.exists(), "petit journal garde");
    }
}
