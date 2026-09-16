package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import util.StockageDisque;

/**
 * Le fichier de configuration de Posos doit se trouver LA OU L'OFFICINE REGARDE, c'est-a-dire dans le meme dossier que
 * {@code dicisms.properties}. Un chemin en dur - qui plus est un chemin Unix - ne convenait pas : les postes sont sous
 * Windows, et un fichier depose dans un dossier que personne ne pense a ouvrir n'est jamais trouve.
 */
public class PososEmplacementConfigTest {

    @Test
    public void lePosoPropertiesEstDansLeMemeDossierQueDicisms() {
        Path dossier = StockageDisque.dossierConfiguration();
        Path dicisms = StockageDisque.fichierConfiguration("dicisms.properties");
        Path posos = Paths.get(PososConfiguration.fichierParDefaut());

        assertEquals(dossier, posos.getParent(), "posos.properties doit etre dans le dossier de configuration");
        assertEquals(dicisms.getParent(), posos.getParent(),
                "posos.properties et dicisms.properties doivent etre cote a cote");
        assertEquals("posos.properties", posos.getFileName().toString());
    }

    @Test
    public void aucunCheminUnixEnDur() {
        // Le defaut d'origine : « /opt/CONF/LABOREX/CONF », invisible depuis un poste Windows.
        String defaut = PososConfiguration.fichierParDefaut();

        assertFalse(defaut.startsWith("/opt/"), defaut);
    }

    @Test
    public void leCheminResteRemplacable() {
        Map<String, String> m = new HashMap<>();
        m.put(PososConfiguration.CLE_FICHIER, "/un/autre/endroit/posos.properties");

        assertEquals("/un/autre/endroit/posos.properties", PososConfiguration.de(m).fichierAttendu());
    }

    @Test
    public void leDiagnosticDitOuLeFichierEstAttenduEtSilYEst() {
        Map<String, String> m = new HashMap<>();
        m.put(PososConfiguration.CLE_FICHIER, "/chemin/qui/n/existe/pas/posos.properties");
        m.put(PososConfiguration.CLE_URL, "https://api.exemple.test");
        m.put(PososConfiguration.CLE_CLIENT_ID, "identifiant-de-recette");
        m.put(PososConfiguration.CLE_CLIENT_SECRET, "valeur-secrete-a-ne-pas-montrer");
        Map<String, Object> d = PososConfiguration.de(m).diagnostic();

        assertEquals("/chemin/qui/n/existe/pas/posos.properties", d.get("fichierAttendu"));
        assertEquals(Boolean.FALSE, d.get("fichierPresent"));
        // Dire OU le fichier est attendu ne doit pas faire sortir ce qu'il contient.
        assertFalse(d.toString().contains("valeur-secrete-a-ne-pas-montrer"), d.toString());
        assertFalse(d.toString().contains("identifiant-de-recette"), d.toString());
    }

    @Test
    public void leDossierDeConfigurationEstUnCheminAbsolu() {
        // Un chemin relatif dependrait du dossier de travail du service Windows : introuvable en pratique.
        assertTrue(StockageDisque.dossierConfiguration().isAbsolute(),
                String.valueOf(StockageDisque.dossierConfiguration()));
    }
}
