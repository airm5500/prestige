package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.File;
import org.junit.jupiter.api.Test;

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
    public void serviceWindowsSeulementPourSonDossier() {
        File installe = new File(System.getProperty("java.io.tmpdir"), "prestige-wa-installe");
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, ""), "aucun dossier indique : le service");
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, installe.getPath()));
        assertTrue(LancementServiceWhatsApp.parLeServiceWindows(installe, installe.getPath().toUpperCase()),
                "Windows : casse indifferente");
        assertFalse(
                LancementServiceWhatsApp.parLeServiceWindows(installe,
                        new File(System.getProperty("java.io.tmpdir"), "e2e-whatsapp-web-essai").getPath()),
                "autre dossier : son script");
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
}
