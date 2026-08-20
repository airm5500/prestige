package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regles de l'auto-diagnostic de la supervision. Ces regles decident de ce qui est signale a l'administrateur : trop
 * severes elles creent du bruit a chaque demarrage, trop laxistes elles laissent passer exactement les reglages muets
 * que ce controle existe pour reveler (un seuil non numerique est ignore a l'execution, une notification activee sans
 * adresse echoue en silence au moment de l'incident).
 */
class SupportPreflightTest {

    @Test
    @DisplayName("Parametre absent : pas une anomalie, la valeur par defaut du code s'applique")
    void parametreAbsent() {
        assertTrue(SupportPreflight.verifierEntier("C", "libelle", null, 1L, 100L).ok);
        assertTrue(SupportPreflight.verifierEntier("C", "libelle", "", 1L, 100L).ok);
        assertTrue(SupportPreflight.verifierEntier("C", "libelle", "   ", 1L, 100L).ok);
    }

    @Test
    @DisplayName("Parametre non numerique : anomalie, car il est ignore en silence a l'execution")
    void parametreNonNumerique() {
        SupportPreflight.Controle controle = SupportPreflight.verifierEntier("C", "libelle", "5000ms", 1L, 100_000L);

        assertFalse(controle.ok);
        assertTrue(controle.detail.contains("5000ms"), "le detail doit montrer la valeur fautive");
    }

    @Test
    @DisplayName("Parametre hors bornes : anomalie, bornes incluses acceptees")
    void parametreHorsBornes() {
        assertFalse(SupportPreflight.verifierEntier("C", "libelle", "0", 1L, 100L).ok);
        assertFalse(SupportPreflight.verifierEntier("C", "libelle", "101", 1L, 100L).ok);
        assertTrue(SupportPreflight.verifierEntier("C", "libelle", "1", 1L, 100L).ok);
        assertTrue(SupportPreflight.verifierEntier("C", "libelle", "100", 1L, 100L).ok);
        assertTrue(SupportPreflight.verifierEntier("C", "libelle", "50", 1L, 100L).ok);
    }

    @Test
    @DisplayName("Valeur exploitable : le defaut prend le relais quand le parametre est absent ou illisible")
    void entierOuDefaut() {
        assertEquals(500L, SupportPreflight.entierOuDefaut(null, 500L));
        assertEquals(500L, SupportPreflight.entierOuDefaut("", 500L));
        assertEquals(500L, SupportPreflight.entierOuDefaut("beaucoup", 500L));
        assertEquals(1024L, SupportPreflight.entierOuDefaut(" 1024 ", 500L));
    }

    @Test
    @DisplayName("Notification desactivee : aucune adresse requise")
    void notificationDesactivee() {
        assertTrue(SupportPreflight.verifierNotification("0", null).ok);
        assertTrue(SupportPreflight.verifierNotification("0", "").ok);
    }

    @Test
    @DisplayName("Notification activee sans adresse : anomalie, aucun incident critique ne serait signale")
    void notificationSansAdresse() {
        // Le defaut le plus couteux : tout parait configure, et le jour d'un incident FATAL personne n'est prevenu.
        assertFalse(SupportPreflight.verifierNotification("1", null).ok);
        assertFalse(SupportPreflight.verifierNotification("1", "  ").ok);
        // Parametre absent = notification active par defaut.
        assertFalse(SupportPreflight.verifierNotification(null, null).ok);
    }

    @Test
    @DisplayName("Notification activee : l'adresse doit avoir une forme plausible")
    void notificationAdresse() {
        assertTrue(SupportPreflight.verifierNotification("1", "support@prestige.ci").ok);
        assertFalse(SupportPreflight.verifierNotification("1", "support.prestige.ci").ok);
        assertFalse(SupportPreflight.verifierNotification("1", "@prestige.ci").ok);
        assertFalse(SupportPreflight.verifierNotification("1", "support@").ok);
    }

    @Test
    @DisplayName("Privilege PROCESS : reconnu quand il est accorde globalement")
    void processAccorde() {
        assertTrue(SupportPreflight.accordeProcess("GRANT PROCESS ON *.* TO `prestige`@`localhost`"));
        assertTrue(SupportPreflight.accordeProcess("GRANT SELECT, PROCESS, INSERT ON *.* TO `prestige`@`%`"));
        assertTrue(SupportPreflight.accordeProcess("GRANT ALL PRIVILEGES ON *.* TO `root`@`localhost`"));
        assertTrue(SupportPreflight.accordeProcess("grant process on *.* to `p`@`%`"), "casse indifferente");
    }

    @Test
    @DisplayName("Privilege PROCESS : non reconnu s'il n'est pas global ou pas reellement present")
    void processNonAccorde() {
        // Accorde sur une seule base, il ne donne aucune visibilite sur les connexions.
        assertFalse(SupportPreflight.accordeProcess("GRANT PROCESS ON `prestige`.* TO `p`@`%`"));
        assertFalse(SupportPreflight.accordeProcess("GRANT ALL PRIVILEGES ON `prestige`.* TO `p`@`%`"));
        assertFalse(SupportPreflight.accordeProcess("GRANT SELECT, INSERT ON *.* TO `p`@`%`"));
        // Un nom de base contenant le mot ne doit pas faire illusion.
        assertFalse(SupportPreflight.accordeProcess("GRANT SELECT ON `process_db`.* TO `p`@`%`"));
        assertFalse(SupportPreflight.accordeProcess(""));
        assertFalse(SupportPreflight.accordeProcess(null));
    }

    @Test
    @DisplayName("Privilege PROCESS : la declaration suffit, sans regarder les compteurs")
    void processDeclareSuffit() {
        SupportPreflight.Controle controle = SupportPreflight
                .evaluerPrivilegeProcess(Arrays.asList("GRANT PROCESS ON *.* TO `p`@`%`"), -1L, -1L);

        assertTrue(controle.ok);
        assertTrue(controle.detail.contains("accorde"));
    }

    @Test
    @DisplayName("Privilege PROCESS : anomalie quand des connexions echappent au moniteur")
    void processCecieProuvee() {
        // 12 connexions ouvertes, 3 visibles : le moniteur est aveugle a 9 d'entre elles.
        SupportPreflight.Controle controle = SupportPreflight.evaluerPrivilegeProcess(Collections.emptyList(), 12L, 3L);

        assertFalse(controle.ok);
        assertTrue(controle.detail.contains("3 connexion(s) sur 12"));
        assertTrue(controle.detail.contains("GRANT PROCESS"), "le detail doit donner la commande de correction");
    }

    @Test
    @DisplayName("Privilege PROCESS : aucune alerte tant que la cecite n'est pas prouvee")
    void processPasDAlarmeInjustifiee() {
        // L'application est le seul client : voir uniquement ses propres connexions n'a rien d'anormal.
        assertTrue(SupportPreflight.evaluerPrivilegeProcess(Collections.emptyList(), 8L, 8L).ok);
        // Ecart d'une unite : une connexion ouverte entre les deux mesures, pas une preuve.
        assertTrue(SupportPreflight.evaluerPrivilegeProcess(Collections.emptyList(), 9L, 8L).ok);
        // Mesures indisponibles : on ne conclut pas.
        assertTrue(SupportPreflight.evaluerPrivilegeProcess(Collections.emptyList(), -1L, -1L).ok);
        assertTrue(SupportPreflight.evaluerPrivilegeProcess(null, -1L, 3L).ok);
    }

    @Test
    @DisplayName("Acces de depannage ouvert : signale, avec la consigne de le refermer")
    void accesDepannageOuvert() {
        SupportPreflight.Controle controle = SupportPreflight.evaluerAccesDepannage("1");

        assertFalse(controle.ok);
        assertTrue(controle.detail.contains("OUVERT"));
        assertTrue(controle.detail.contains("ACCES_DEPANNAGE_ACTIF"),
                "le detail doit nommer le parametre a remettre a 0");
    }

    @Test
    @DisplayName("Acces de depannage ferme : aucune alerte, y compris parametre absent")
    void accesDepannageFerme() {
        // Meme regle que l'authentification : tout ce qui n'est pas exactement '1' laisse l'acces
        // ferme, et ne doit donc pas etre signale comme ouvert.
        assertTrue(SupportPreflight.evaluerAccesDepannage("0").ok);
        assertTrue(SupportPreflight.evaluerAccesDepannage(null).ok, "parametre absent = acces ferme");
        assertTrue(SupportPreflight.evaluerAccesDepannage("").ok);
        assertTrue(SupportPreflight.evaluerAccesDepannage("true").ok);
        assertTrue(SupportPreflight.evaluerAccesDepannage("oui").ok);
    }

    @Test
    @DisplayName("Synthese : compte les anomalies, et le dit clairement quand il n'y en a aucune")
    void synthese() {
        SupportPreflight.Controle ok = SupportPreflight.Controle.ok("A", "a", "");
        SupportPreflight.Controle ko = SupportPreflight.Controle.anomalie("B", "b", "");

        assertFalse(SupportPreflight.aAnomalie(Arrays.asList(ok, ok)));
        assertTrue(SupportPreflight.aAnomalie(Arrays.asList(ok, ko)));
        assertTrue(SupportPreflight.synthese(Arrays.asList(ok, ok)).contains("aucune anomalie"));
        assertTrue(SupportPreflight.synthese(Arrays.asList(ok, ko)).contains("1 anomalie(s) sur 2"));
        assertFalse(SupportPreflight.aAnomalie(Collections.emptyList()));
    }

    @Test
    @DisplayName("Detail : chaque anomalie est marquee et sa cause reportee")
    void detail() {
        List<SupportPreflight.Controle> controles = Arrays.asList(
                SupportPreflight.Controle.ok("A", "Stockage inscriptible", "D:/prestige/support"),
                SupportPreflight.Controle.anomalie("B", "Destinataire des notifications", "SUPPORT_EMAIL est vide"));

        String detail = SupportPreflight.detail(controles);

        assertTrue(detail.contains("[OK]"));
        assertTrue(detail.contains("[ANOMALIE]"));
        assertTrue(detail.contains("Destinataire des notifications"));
        assertTrue(detail.contains("SUPPORT_EMAIL est vide"));
        // Comptage sur les lignes qui COMMENCENT par le marqueur : l'en-tete explicatif cite lui aussi le mot.
        long lignesEnAnomalie = Arrays.stream(detail.split("\\R")).filter(ligne -> ligne.startsWith("[ANOMALIE]"))
                .count();
        assertEquals(1L, lignesEnAnomalie, "une seule ligne en anomalie");
    }
}
