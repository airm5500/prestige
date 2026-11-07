package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Mots de passe des extranets chiffres (AES-GCM) : sur des milliers de mots de passe tires avec une graine fixe, le
 * dechiffrement rend exactement la saisie, le texte enregistre ne contient jamais le clair, deux chiffrements
 * different, une valeur alteree ou une autre cle est refusee, la cle est creee une fois puis reutilisee.
 */
class ChiffrementExtranetCoherenceTest {

    private static final String ALPHABET = "abcXYZ0129 &=+%#?/\\'\"éèçàùœ€ñ😀\t";

    @Test
    void allerRetourSurDesMilliersDeMotsDePasse(@TempDir Path dir) throws Exception {
        ChiffrementExtranet c = new ChiffrementExtranet(dir.resolve("cles").resolve("extranet.cle"));
        Random r = new Random(20261107L);
        Set<String> chiffres = new HashSet<>();
        for (int cas = 0; cas < 3000; cas++) {
            StringBuilder sb = new StringBuilder();
            int n = cas % 50 == 0 ? 200 : 1 + r.nextInt(40);
            for (int i = 0; i < n; i++) {
                sb.appendCodePoint(ALPHABET.codePointAt(
                        ALPHABET.offsetByCodePoints(0, r.nextInt(ALPHABET.codePointCount(0, ALPHABET.length())))));
            }
            String clair = sb.toString();
            String e = c.chiffrer(clair);
            assertTrue(e.startsWith("v1:"));
            assertTrue(e.length() <= 1000, "colonne de 1000 : " + e.length());
            if (clair.trim().length() >= 4) {
                assertFalse(e.contains(clair));
                assertFalse(
                        new String(Base64.getDecoder().decode(e.substring(3)), StandardCharsets.UTF_8).contains(clair));
            }
            assertEquals(clair, c.dechiffrer(e));
            assertTrue(chiffres.add(e), "deux chiffrements identiques");
            /* meme clair, nouveau chiffrement : different, meme resultat */
            String e2 = c.chiffrer(clair);
            assertNotEquals(e, e2);
            assertEquals(clair, c.dechiffrer(e2));
        }
    }

    @Test
    void alterationOuAutreCleRefusees(@TempDir Path dir) throws Exception {
        ChiffrementExtranet c = new ChiffrementExtranet(dir.resolve("a.cle"));
        String e = c.chiffrer("secret-essai");
        byte[] b = Base64.getDecoder().decode(e.substring(3));
        Random r = new Random(20261107L);
        for (int i = 0; i < 200; i++) {
            byte[] x = b.clone();
            x[r.nextInt(x.length)] ^= (byte) (1 + r.nextInt(255));
            String altere = "v1:" + Base64.getEncoder().encodeToString(x);
            assertThrows(GeneralSecurityException.class, () -> c.dechiffrer(altere));
        }
        ChiffrementExtranet autre = new ChiffrementExtranet(dir.resolve("b.cle"));
        assertThrows(GeneralSecurityException.class, () -> autre.dechiffrer(e));
        for (String invalide : new String[] { null, "", "secret-essai", "v1:", "v1:!!", "v2:" + e.substring(3) }) {
            assertThrows(GeneralSecurityException.class, () -> c.dechiffrer(invalide));
        }
    }

    @Test
    void cleCreeeUneFoisPuisReutilisee(@TempDir Path dir) throws Exception {
        Path f = dir.resolve("cles").resolve("extranet.cle");
        String e = new ChiffrementExtranet(f).chiffrer("abc");
        assertTrue(Files.exists(f));
        byte[] cle = Files.readAllBytes(f);
        assertEquals(32, Base64.getDecoder().decode(new String(cle, StandardCharsets.US_ASCII).trim()).length);
        /* une autre instance (redemarrage du serveur) relit la meme cle */
        assertEquals("abc", new ChiffrementExtranet(f).dechiffrer(e));
        assertEquals(new String(cle, StandardCharsets.US_ASCII), Files.readString(f, StandardCharsets.US_ASCII));
        /* cle corrompue : refus, jamais une nouvelle cle silencieuse */
        Files.writeString(f, "trop-courte");
        assertThrows(GeneralSecurityException.class, () -> new ChiffrementExtranet(f).dechiffrer(e));
    }
}
