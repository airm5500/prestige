package report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import net.sf.jasperreports.engine.JRException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Une edition qui echoue doit laisser dans le journal QUEL etat a echoue et POURQUOI.
 *
 * <p>
 * Le defaut corrige ici : {@code reportManager} sert toutes les editions JasperReports de l'application, et chacun de
 * ses echecs etait jete sur la sortie standard par un {@code printStackTrace()}. Rien n'arrivait dans le journal du
 * serveur, et surtout rien ne disait de quel etat il s'agissait. L'edition continuait, le document n'etait pas produit,
 * et l'officine se retrouvait plus loin avec un message sur un fichier temporaire qui ne designe rien pour elle.
 * </p>
 */
class EchecEditionJournaliseTest {

    private static String source() throws IOException {
        return new String(Files.readAllBytes(Paths.get("src/main/java/report/reportManager.java")),
                StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("Aucun echec d'edition n'est jete sur la sortie standard")
    void plusDePileJeteeSurLaSortieStandard() throws IOException {
        String source = source();
        // Le mot figure encore dans le commentaire qui explique le defaut : on ne compte que les
        // appels reels.
        assertFalse(source.contains("e.printStackTrace();"),
                "un echec d'edition ne doit plus partir sur la sortie standard : le journal du serveur"
                        + " ne dirait pas quel etat a echoue");
    }

    @Test
    @DisplayName("Le journal nomme l'etat en cause et traduit la cause")
    void leJournalNommeLEtat() {
        String message = reportManager.messageEchec("BuildReport", "D:/projet/prestige/etats/rp_facture_0303.jrxml",
                new JRException("Unknown column 'str_TOTO' in 'field list'"));
        assertTrue(message.contains("rp_facture_0303.jrxml"),
                "le journal doit nommer le fichier de l'etat, pas un chemin temporaire : " + message);
        assertTrue(message.contains("une colonne ou une table attendue est absente de la base de données"),
                "la cause doit etre traduite en langage courant pour etre transmise au support : " + message);
    }

    @Test
    @DisplayName("Le chemin complet du serveur n'encombre pas le message")
    void seulLeNomDuFichier() {
        String message = reportManager.messageEchec("BuildReport",
                "D:/projet/prestige/target/prestige/etats/rp_facture_0303.jrxml", new JRException("boum"));
        assertFalse(message.contains("D:/projet"),
                "le message doit rester lisible : le nom du fichier suffit, le chemin complet est du bruit");
    }

    @Test
    @DisplayName("Un etat sans chemin ne fait pas planter le signalement")
    void cheminAbsent() {
        for (String chemin : new String[] { null, "", "   " }) {
            String message = reportManager.messageEchec("BuildReport", chemin, new JRException("boum"));
            assertTrue(message.contains("inconnu"),
                    "sans chemin, le message doit le dire au lieu de lever une erreur : " + message);
        }
    }

    @Test
    @DisplayName("Un etat qui ne ramene aucune ligne est signale, avec la piste a suivre")
    void aucuneLigneSignalee() {
        String message = reportManager.messageAucuneLigne("BuildReport",
                "D:/projet/prestige/etats/rp_facture_0303.jrxml");
        assertTrue(message.contains("rp_facture_0303.jrxml"), "l'etat doit etre nomme : " + message);
        assertTrue(message.contains("AUCUNE ligne"), "le journal doit dire qu'il n'y a pas de donnees : " + message);
        assertTrue(message.contains("BLANCHE"),
                "le journal doit annoncer la consequence visible pour l'officine : " + message);
        assertTrue(message.contains("factures de groupe"),
                "le journal doit donner la piste la plus frequente : " + message);
    }

    @Test
    @DisplayName("Le controle des pages vides est pose sur les deux editions de facture")
    void controlePosePartout() throws IOException {
        String source = source();
        assertEquals(2, source.split("verifierPagesProduites\\(jasperPrint", -1).length - 1,
                "les deux methodes BuildReport doivent verifier qu'une page a bien ete produite");
    }

    @Test
    @DisplayName("Chaque methode d'edition signale son propre nom")
    void chaqueEditionSeNomme() throws IOException {
        String source = source();
        for (String etape : new String[] { "BuildReport", "CompileSubreport", "BuildReportPDF",
                "BuildReportEmptyDs" }) {
            assertTrue(source.contains("signalerEchec(\"" + etape + "\""),
                    etape + " : cette edition doit signaler son echec sous son propre nom");
        }
    }
}
