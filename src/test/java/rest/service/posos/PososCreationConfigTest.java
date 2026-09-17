package rest.service.posos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Retour du 17/09, point 4 : « le fichier posos.properties doit etre genere automatiquement apres deploiement s'il
 * n'existe pas, comme dicisms.properties ».
 *
 * <p>
 * Deux exigences se croisent ici et il faut tenir les deux : le fichier doit apparaitre TOUT SEUL, avec ses cles et ses
 * explications, et il ne doit JAMAIS contenir ni ecraser un secret. Ces tests verifient les deux, plus le fait qu'un
 * deploiement ne detruit pas la configuration du site.
 */
public class PososCreationConfigTest {

    private Properties relire(Path fichier) throws Exception {
        Properties p = new Properties();
        // Un fichier de proprietes se lit en ISO-8859-1 : c'est aussi ce avec quoi il est ecrit.
        p.load(new ByteArrayInputStream(Files.readAllBytes(fichier)));
        return p;
    }

    @Test
    public void leFichierEstCreeSilNexistePas(@TempDir Path dossier) throws Exception {
        Path cible = dossier.resolve("posos.properties");

        Path cree = PososConfiguration.creerModeleSiAbsent(cible);

        assertNotNull(cree, "le fichier doit etre cree");
        assertEquals(cible, cree);
        assertTrue(Files.isReadable(cible));
    }

    @Test
    public void leDossierEstCreeSilManque(@TempDir Path dossier) throws Exception {
        // Premier deploiement : D:\prestige\config n'existe pas encore.
        Path cible = dossier.resolve("prestige").resolve("config").resolve("posos.properties");

        assertNotNull(PososConfiguration.creerModeleSiAbsent(cible));
        assertTrue(Files.isReadable(cible));
    }

    @Test
    public void leFichierCreePorteToutesLesClesQueLaPasserelleLit(@TempDir Path dossier) throws Exception {
        Path cible = dossier.resolve("posos.properties");
        PososConfiguration.creerModeleSiAbsent(cible);

        Properties p = relire(cible);

        // Les trois cles sans lesquelles la passerelle ne peut rien faire doivent etre presentes, a renseigner.
        assertTrue(p.containsKey(PososConfiguration.CLE_URL));
        assertTrue(p.containsKey(PososConfiguration.CLE_CLIENT_ID));
        assertTrue(p.containsKey(PososConfiguration.CLE_CLIENT_SECRET));
        assertEquals("", p.getProperty(PososConfiguration.CLE_URL));
        assertEquals("", p.getProperty(PososConfiguration.CLE_CLIENT_ID));
        assertEquals("", p.getProperty(PososConfiguration.CLE_CLIENT_SECRET));
        // Les chemins, eux, ont une valeur par defaut utilisable telle quelle.
        assertEquals(PososConfiguration.TOKEN_PATH_DEFAUT, p.getProperty(PososConfiguration.CLE_TOKEN_PATH));
        assertEquals(PososConfiguration.ANALYSIS_PATH_DEFAUT, p.getProperty(PososConfiguration.CLE_ANALYSIS_PATH));
    }

    @Test
    public void unFichierCreeNeRendPasLaPasserelleConfiguree(@TempDir Path dossier) throws Exception {
        Path cible = dossier.resolve("posos.properties");
        PososConfiguration.creerModeleSiAbsent(cible);

        // Le fichier existe mais il est vide de valeurs : l'ecran doit continuer a dire « non configuree »
        // plutot que de laisser croire que la passerelle est prete.
        Properties p = relire(cible);
        PososConfiguration c = new PososConfiguration(cle -> null, p);

        assertFalse(c.estConfiguree());
        assertNull(c.url());
        assertNull(c.clientId());
    }

    @Test
    public void aucunSecretNestLivreDansLeModele() {
        String modele = PososConfiguration.MODELE;

        // Ni valeur d'exemple prise pour une vraie, ni identifiant : que des cles vides et des commentaires.
        assertTrue(modele.contains(PososConfiguration.CLE_CLIENT_SECRET + "=\n"), "le secret doit etre une cle vide");
        assertFalse(modele.contains("a-renseigner"), "aucune valeur factice qui finirait envoyee a Posos");
        assertFalse(modele.toLowerCase().contains("bearer"));
    }

    @Test
    public void unFichierDejaRenseigneNestJamaisEcrase(@TempDir Path dossier) throws Exception {
        Path cible = dossier.resolve("posos.properties");
        String contenu = PososConfiguration.CLE_URL + "=https://api.posos.test\n" + PososConfiguration.CLE_CLIENT_ID
                + "=identifiant-du-site\n" + PososConfiguration.CLE_CLIENT_SECRET + "=le-secret-du-site\n";
        Files.write(cible, contenu.getBytes(StandardCharsets.ISO_8859_1));

        assertNull(PososConfiguration.creerModeleSiAbsent(cible), "rien ne doit etre ecrit");
        assertEquals(contenu, new String(Files.readAllBytes(cible), StandardCharsets.ISO_8859_1),
                "la configuration du site doit survivre au deploiement");
    }

    @Test
    public void unFichierVideDejaPresentEstLaisseTelQuel(@TempDir Path dossier) throws Exception {
        // Cas limite : l'exploitant a cree le fichier a la main et n'a rien mis dedans. On ne le remplace pas :
        // on ne sait pas s'il est en train de l'editer.
        Path cible = dossier.resolve("posos.properties");
        Files.write(cible, new byte[0]);

        assertNull(PososConfiguration.creerModeleSiAbsent(cible));
        assertEquals(0, Files.readAllBytes(cible).length);
    }

    @Test
    public void unEmplacementImposeParLExploitantNestPasDevine() {
        // POSOS_CONFIG_FILE pose : l'exploitant a choisi lui-meme ou vit le fichier, on ne cree rien ailleurs.
        String ancien = System.getProperty(PososConfiguration.CLE_FICHIER);
        try {
            System.setProperty(PososConfiguration.CLE_FICHIER, "/un/endroit/choisi/posos.properties");

            assertNull(PososConfiguration.creerModeleSiAbsent());
        } finally {
            if (ancien == null) {
                System.clearProperty(PososConfiguration.CLE_FICHIER);
            } else {
                System.setProperty(PososConfiguration.CLE_FICHIER, ancien);
            }
        }
    }

    @Test
    public void laCreationEstIdempotente(@TempDir Path dossier) throws Exception {
        Path cible = dossier.resolve("posos.properties");

        assertNotNull(PososConfiguration.creerModeleSiAbsent(cible));
        assertNull(PososConfiguration.creerModeleSiAbsent(cible), "un second deploiement ne recree rien");
    }

    @Test
    public void unCheminImpossibleNeFaitPasEchouerLeDemarrage(@TempDir Path dossier) throws Exception {
        // Le fichier a la place du dossier : la creation doit echouer sans exception, l'application demarre.
        Path obstacle = dossier.resolve("obstacle");
        Files.write(obstacle, "je ne suis pas un dossier".getBytes(StandardCharsets.ISO_8859_1));

        assertNull(PososConfiguration.creerModeleSiAbsent(obstacle.resolve("posos.properties")));
    }

    @Test
    public void leModeleExpliqueOuEtQuoiRenseigner() {
        String modele = PososConfiguration.MODELE;

        assertTrue(modele.contains("dicisms.properties") || modele.contains("cree automatiquement"), modele);
        assertTrue(modele.contains("Posos"));
        // Il doit dire qu'il ne sera pas ecrase : c'est ce qui rassure l'exploitant qui le renseigne.
        assertTrue(modele.contains("jamais ecrase"));
    }
}
