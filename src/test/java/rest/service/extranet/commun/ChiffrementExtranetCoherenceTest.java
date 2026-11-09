package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Mots de passe des extranets chiffres (AES-GCM) : sur des milliers de mots de passe tires avec une graine fixe, le
 * dechiffrement rend exactement la saisie, le texte enregistre ne contient jamais le clair, deux chiffrements
 * different, une valeur alteree ou une autre cle est refusee, la cle est lue une fois, une cle invalide est refusee.
 */
class ChiffrementExtranetCoherenceTest {

    private static final String ALPHABET = "abcXYZ0129 &=+%#?/\\'\"éèçàùœ€ñ😀\t";

    @Test
    void allerRetourSurDesMilliersDeMotsDePasse() throws Exception {
        ChiffrementExtranet c = cle(1);
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
    void alterationOuAutreCleRefusees() throws Exception {
        ChiffrementExtranet c = cle(2);
        String e = c.chiffrer("secret-essai");
        byte[] b = Base64.getDecoder().decode(e.substring(3));
        Random r = new Random(20261107L);
        for (int i = 0; i < 200; i++) {
            byte[] x = b.clone();
            x[r.nextInt(x.length)] ^= (byte) (1 + r.nextInt(255));
            String altere = "v1:" + Base64.getEncoder().encodeToString(x);
            assertThrows(GeneralSecurityException.class, () -> c.dechiffrer(altere));
        }
        ChiffrementExtranet autre = cle(3);
        assertThrows(GeneralSecurityException.class, () -> autre.dechiffrer(e));
        for (String invalide : new String[] { null, "", "secret-essai", "v1:", "v1:!!", "v2:" + e.substring(3) }) {
            assertThrows(GeneralSecurityException.class, () -> c.dechiffrer(invalide));
        }
    }

    /** Cle aleatoire tiree avec une graine (en officine : table extranet_cle). */
    private static ChiffrementExtranet cle(long graine) {
        byte[] k = new byte[32];
        new Random(graine).nextBytes(k);
        return new ChiffrementExtranet(() -> k.clone());
    }

    @Test
    void cleLueUneFoisEtCleInvalideRefusee() throws Exception {
        int[] lectures = { 0 };
        byte[] k = new byte[32];
        new Random(4L).nextBytes(k);
        ChiffrementExtranet c = new ChiffrementExtranet(() -> {
            lectures[0]++;
            return k.clone();
        });
        String e = c.chiffrer("abc");
        assertEquals("abc", c.dechiffrer(e));
        assertEquals(1, lectures[0]);
        /* meme cle relue (redemarrage du serveur) : meme resultat */
        assertEquals("abc", new ChiffrementExtranet(() -> k.clone()).dechiffrer(e));
        /* cle absente, trop courte ou illisible : refus, jamais une nouvelle cle silencieuse */
        assertThrows(GeneralSecurityException.class, () -> new ChiffrementExtranet(() -> null).dechiffrer(e));
        assertThrows(GeneralSecurityException.class, () -> new ChiffrementExtranet(() -> new byte[16]).dechiffrer(e));
        assertThrows(GeneralSecurityException.class, () -> ChiffrementExtranet.decoder("trop-courte"));
        assertThrows(GeneralSecurityException.class, () -> ChiffrementExtranet.decoder("!!pas du base64!!"));
        assertEquals(32, ChiffrementExtranet.decoder(Base64.getEncoder().encodeToString(k)).length);
    }
}
