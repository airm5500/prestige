package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 9 : configuration de la passerelle Posos.
 *
 * <p>
 * La consigne de l'officine est qu'aucun secret ne se trouve dans le JavaScript, dans Git, dans une reponse de statut
 * ni dans les journaux. Ce test verifie ce qui peut l'etre ici : le statut ne rend jamais le secret ni l'identifiant en
 * clair, et une configuration incomplete est refusee plutot que d'appeler Posos a moitie.
 */
public class PososConfigurationTest {

    private static Map<String, String> complete() {
        Map<String, String> m = new HashMap<>();
        m.put(PososConfiguration.CLE_URL, "https://api.exemple.test/");
        m.put(PososConfiguration.CLE_CLIENT_ID, "identifiant-de-recette");
        m.put(PososConfiguration.CLE_CLIENT_SECRET, "secret-tres-confidentiel");
        return m;
    }

    @Test
    public void uneConfigurationCompleteEstUtilisable() {
        PososConfiguration c = PososConfiguration.de(complete());

        assertTrue(c.estConfiguree());
        assertEquals("https://api.exemple.test", c.url());
    }

    @Test
    public void lesCheminsOntDesValeursParDefautEtRestentModifiables() {
        PososConfiguration defaut = PososConfiguration.de(complete());
        assertEquals(PososConfiguration.TOKEN_PATH_DEFAUT, defaut.cheminJeton());
        assertEquals(PososConfiguration.ANALYSIS_PATH_DEFAUT, defaut.cheminAnalyse());

        Map<String, String> m = complete();
        m.put(PososConfiguration.CLE_TOKEN_PATH, "/auth/v2/token");
        m.put(PososConfiguration.CLE_ANALYSIS_PATH, "/v2/prescription/analysis");
        PososConfiguration choisi = PososConfiguration.de(m);

        assertEquals("https://api.exemple.test/auth/v2/token", choisi.urlJeton());
        assertEquals("https://api.exemple.test/v2/prescription/analysis", choisi.urlAnalyse());
    }

    @Test
    public void uneConfigurationIncompleteEstRefusee() {
        Map<String, String> sansSecret = complete();
        sansSecret.remove(PososConfiguration.CLE_CLIENT_SECRET);
        assertFalse(PososConfiguration.de(sansSecret).estConfiguree());

        Map<String, String> sansUrl = complete();
        sansUrl.remove(PososConfiguration.CLE_URL);
        assertFalse(PososConfiguration.de(sansUrl).estConfiguree());

        Map<String, String> sansId = complete();
        sansId.remove(PososConfiguration.CLE_CLIENT_ID);
        assertFalse(PososConfiguration.de(sansId).estConfiguree());

        assertFalse(PososConfiguration.de(new HashMap<>()).estConfiguree());
    }

    @Test
    public void uneValeurBlancheVautAbsente() {
        Map<String, String> m = complete();
        m.put(PososConfiguration.CLE_CLIENT_SECRET, "   ");

        assertFalse(PososConfiguration.de(m).estConfiguree());
    }

    @Test
    public void leStatutNeRendJamaisLeSecretNiLIdentifiantEnClair() {
        Map<String, Object> d = PososConfiguration.de(complete()).diagnostic();
        String rendu = d.toString();

        assertFalse(rendu.contains("secret-tres-confidentiel"), rendu);
        assertFalse(rendu.contains("identifiant-de-recette"), rendu);
        assertEquals("****ette", d.get("clientId"));
        assertEquals(Boolean.TRUE, d.get("secretRenseigne"));
        assertEquals(Boolean.TRUE, d.get("configuree"));
    }

    @Test
    public void unIdentifiantCourtNEstPasDevinableDepuisSonMasque() {
        assertEquals("****", PososConfiguration.masquer("court"));
        assertEquals("", PososConfiguration.masquer(null));
        assertEquals("", PososConfiguration.masquer(""));
    }

    @Test
    public void lAdresseEtLeCheminSeJoignentSansDoublerNiPerdreLeSeparateur() {
        assertEquals("https://a.test/x", PososConfiguration.joindre("https://a.test/", "/x"));
        assertEquals("https://a.test/x", PososConfiguration.joindre("https://a.test", "x"));
        assertEquals("https://a.test/x", PososConfiguration.joindre("https://a.test///", "x"));
        assertEquals("https://a.test", PososConfiguration.joindre("https://a.test/", ""));
    }

    @Test
    public void leDelaiAUneValeurParDefautEtResisteAUneSaisieAberrante() {
        assertEquals(PososConfiguration.DELAI_DEFAUT_MS, PososConfiguration.de(complete()).delaiMs());

        Map<String, String> m = complete();
        m.put(PososConfiguration.CLE_DELAI, "pas un nombre");
        assertEquals(PososConfiguration.DELAI_DEFAUT_MS, PososConfiguration.de(m).delaiMs());

        m.put(PososConfiguration.CLE_DELAI, "-5");
        assertEquals(PososConfiguration.DELAI_DEFAUT_MS, PososConfiguration.de(m).delaiMs());

        m.put(PososConfiguration.CLE_DELAI, "3000");
        assertEquals(3000, PososConfiguration.de(m).delaiMs());
    }

    @Test
    public void lIdentificationEnBasicEstLeDefautEtResteDebranchable() {
        assertTrue(PososConfiguration.de(complete()).jetonEnBasic());

        Map<String, String> m = complete();
        m.put(PososConfiguration.CLE_BASIC, "0");
        assertFalse(PososConfiguration.de(m).jetonEnBasic());
    }
}
