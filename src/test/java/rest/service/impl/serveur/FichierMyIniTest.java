package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import rest.service.impl.serveur.FichierMyIni.Resultat;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

class FichierMyIniTest {

    /** my.ini ecrit par l'installateur de MariaDB sous Windows. */
    private static final String INSTALLATEUR = "[mysqld]\r\n" + "datadir=C:/Program Files/MariaDB 10.6/data\r\n"
            + "port=3306\r\n" + "innodb_buffer_pool_size=2032M\r\n" + "character-set-server=utf8mb4\r\n" + "\r\n"
            + "[client]\r\n" + "port=3306\r\n" + "plugin-dir=C:\\Program Files\\MariaDB 10.6/lib/plugin\r\n";

    private static Map<String, String> valeurs() {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("innodb_buffer_pool_size", "5632M");
        v.put("max_connections", "196");
        v.put("innodb_flush_log_at_trx_commit", "1");
        return v;
    }

    @Test
    void remplaceEnPlaceEtAjouteEnFinDeSection() {
        Resultat r = FichierMyIni.appliquer(INSTALLATEUR, valeurs());
        assertNull(r.refus, r.refus);
        assertTrue(r.texte.contains("innodb_buffer_pool_size=5632M\r\n"), r.texte);
        assertFalse(r.texte.contains("2032M"));
        /* les lignes ajoutees le sont dans [mysqld], avant [client], avec les fins de ligne du fichier */
        int ajout = r.texte.indexOf("max_connections=196\r\n"), client = r.texte.indexOf("[client]");
        assertTrue(ajout > 0 && ajout < client, r.texte);
        assertTrue(r.texte.indexOf("innodb_flush_log_at_trx_commit=1\r\n") < client);
        /* le reste est intact */
        assertTrue(r.texte.contains("datadir=C:/Program Files/MariaDB 10.6/data\r\ncharacter-set-server")
                || r.texte.contains("character-set-server=utf8mb4\r\n"));
        assertTrue(
                r.texte.endsWith("[client]\r\nport=3306\r\nplugin-dir=C:\\Program Files\\MariaDB 10.6/lib/plugin\r\n"));
        assertEquals(3, r.changements.size());
        assertEquals("2032M", r.changements.get(0).avant);
        assertEquals("5632M", r.changements.get(0).apres);
        assertNull(r.changements.get(1).avant, "max_connections etait absent");
    }

    @Test
    void cleAvecTiretsEtValeurEquivalenteInchangee() {
        String t = "[mysqld]\nmax-connections = 196\ninnodb_buffer_pool_size = 5.5G # tampon\n";
        Resultat r = FichierMyIni.appliquer(t, valeurs());
        assertNull(r.refus);
        assertTrue(r.texte.contains("max-connections = 196\n"), "orthographe et espaces gardes");
        assertTrue(r.texte.contains("innodb_buffer_pool_size = 5.5G # tampon\n"), "5.5G = 5632M : rien a changer");
        assertEquals(1, r.changements.size(), "seule la ligne absente est ajoutee");
        assertEquals("innodb_flush_log_at_trx_commit", r.changements.get(0).cle);
    }

    @Test
    void commentaireEnFinDeLigneGarde() {
        Resultat r = FichierMyIni.appliquer("[mysqld]\nmax_connections=500 ; ancien\n", valeurs());
        assertTrue(r.texte.contains("max_connections=196 ; ancien\n"), r.texte);
    }

    @Test
    void structureNonCompriseRefusee() {
        assertNotNull(FichierMyIni.appliquer("port=3306\n", valeurs()).refus, "aucune section [mysqld]");
        assertNotNull(FichierMyIni.appliquer("[mysqld]\nport=1\n[mysqld]\nport=2\n", valeurs()).refus,
                "deux sections [mysqld]");
        assertNotNull(FichierMyIni.appliquer("[mysqld]\n!includedir C:/conf.d\n", valeurs()).refus,
                "reglages possiblement dans d'autres fichiers");
        assertNotNull(FichierMyIni.appliquer("[mysqld]\n<<< conflit\n", valeurs()).refus, "ligne illisible");
        assertNotNull(FichierMyIni.appliquer("[mysqld]\nmax_connections=1\nmax-connections=2\n", valeurs()).refus,
                "reglage en double : lequel compte ?");
        assertNotNull(FichierMyIni.appliquer("[mysqld]\nport=1\n[mariadb]\nmax_connections=300\n", valeurs()).refus,
                "le meme reglage dans une autre section lue par le serveur l'emporterait");
        Resultat r = FichierMyIni.appliquer("[mysqld]\nport=1\n[mariadb]\nmax_connections=300\n", valeurs());
        assertNull(r.texte, "rien a ecrire en cas de refus");
    }

    @Test
    void seulesLesClesConnuesSontEcrites() {
        Map<String, String> v = new HashMap<>();
        v.put("general_log", "1");
        v.put("innodb_flush_log_at_trx_commit", "2");
        Resultat r = FichierMyIni.appliquer(INSTALLATEUR, v);
        assertFalse(r.texte.contains("general_log"));
        assertTrue(r.texte.contains("innodb_flush_log_at_trx_commit=1"), "bloque a 1");
        assertFalse(r.texte.contains("innodb_flush_log_at_trx_commit=2"));
    }

    @Test
    void valeursTireesDuCalcul() {
        Map<String, String> v = new HashMap<>();
        v.put("max_connections", "100");
        v.put("version", "10.6.12-MariaDB");
        List<Reglage> l = ReglagesServeur.comparer(16 * ReglagesServeur.GO, 8, 3 * ReglagesServeur.GO, v, 4, 50);
        Map<String, String> m = FichierMyIni.valeurs(l, v, "");
        assertEquals("196", m.get("max_connections"));
        assertEquals("1", m.get("innodb_flush_log_at_trx_commit"));
        assertEquals("4000", m.get("innodb_io_capacity_max"));
        assertFalse(m.containsKey("Xmx"));
        assertFalse(m.containsKey("memoire"));
    }

    @Test
    void reglageAppliqueAChaudMaisPerimeDansLeFichier() {
        Map<String, String> v = new HashMap<>();
        v.put("max_connections", "196");
        List<Reglage> l = ReglagesServeur.comparer(16 * ReglagesServeur.GO, 8, 3 * ReglagesServeur.GO, v, 4, 50);
        assertEquals("196", FichierMyIni.valeurs(l, v, "[mysqld]\nmax_connections=500\n").get("max_connections"),
                "correct en marche, mais 500 reviendrait au redemarrage");
        assertNull(FichierMyIni.valeurs(l, v, "[mysqld]\nmax_connections=196\n").get("max_connections"));
        assertNull(FichierMyIni.valeurs(l, v, "[mysqld]\nport=3306\n").get("max_connections"),
                "absent du fichier et correct en marche : rien a changer");
    }

    @Test
    void sauvegardePuisEcriture(@TempDir Path d) throws Exception {
        Path ini = d.resolve("my.ini");
        Files.write(ini, INSTALLATEUR.getBytes(StandardCharsets.ISO_8859_1));
        FichierMyIni.Ecriture e = FichierMyIni.ecrire(ini, valeurs(), "20261030-101500");
        assertNull(e.refus, e.refus);
        assertEquals(INSTALLATEUR, new String(Files.readAllBytes(e.sauvegarde), StandardCharsets.ISO_8859_1));
        assertTrue(e.sauvegarde.getFileName().toString().startsWith("my.ini.avant-prestige-20261030-101500"));
        assertTrue(new String(Files.readAllBytes(ini), StandardCharsets.ISO_8859_1).contains("max_connections=196"));
        assertEquals(3, e.resultat.changements.size());
    }

    @Test
    void rienAEcrireNiASauvegarder(@TempDir Path d) throws Exception {
        Path ini = d.resolve("my.ini");
        Files.write(ini,
                "[mysqld]\ninnodb_buffer_pool_size=5632M\nmax_connections=196\ninnodb_flush_log_at_trx_commit=1\n"
                        .getBytes(StandardCharsets.ISO_8859_1));
        FichierMyIni.Ecriture e = FichierMyIni.ecrire(ini, valeurs(), "20261030-101500");
        assertNull(e.refus);
        assertNull(e.sauvegarde);
        assertEquals(1, Files.list(d).count());
    }

    @Test
    void fichierIllisibleJamaisTouche(@TempDir Path d) throws Exception {
        Path ini = d.resolve("my.ini");
        byte[] avant = "[mysqld]\n!include autre.cnf\n".getBytes(StandardCharsets.ISO_8859_1);
        Files.write(ini, avant);
        FichierMyIni.Ecriture e = FichierMyIni.ecrire(ini, valeurs(), "20261030-101500");
        assertNotNull(e.refus);
        assertEquals(new String(avant, StandardCharsets.ISO_8859_1),
                new String(Files.readAllBytes(ini), StandardCharsets.ISO_8859_1));
        assertEquals(1, Files.list(d).count(), "aucune sauvegarde inutile");
        assertNotNull(FichierMyIni.ecrire(d.resolve("absent.ini"), valeurs(), "x").refus);
    }

    @Test
    void cheminDepuisLeDossierDesDonnees() {
        assertEquals("C:/Program Files/MariaDB 10.6/data/my.ini",
                FichierMyIni.chemin("C:\\Program Files\\MariaDB 10.6\\data\\").toString().replace('\\', '/'));
    }
}
