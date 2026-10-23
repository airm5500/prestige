package util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Aucun compte de messagerie dans le code (regle : aucun secret dans Git). L'expediteur des mails vient seulement du
 * fichier de configuration du serveur (cles email et password de dicisms.properties) ; sans lui, aucun envoi n'est
 * tente.
 */
class AppParametersSansSecretTest {

    @Test
    void aucunCompteDeMessagerieParDefaut() throws Exception {
        String source = new String(Files.readAllBytes(Paths.get("src/main/java/util/AppParameters.java")),
                StandardCharsets.UTF_8);
        assertFalse(Pattern.compile("\\bemail\\s*=\\s*\"[^\"]+\"").matcher(source).find(),
                "adresse de l'expediteur ecrite dans le code");
        assertFalse(Pattern.compile("\\bpassword\\s*=\\s*\"[^\"]+\"").matcher(source).find(),
                "mot de passe ecrit dans le code");
    }

    @Test
    void expediteurConfigureSeulementAvecAdresseEtMotDePasse() {
        assertTrue(AppParameters.expediteurConfigure("officine@example.org", "x"));
        assertFalse(AppParameters.expediteurConfigure("officine@example.org", ""));
        assertFalse(AppParameters.expediteurConfigure(null, "x"));
        assertFalse(AppParameters.expediteurConfigure(" ", null));
    }
}
