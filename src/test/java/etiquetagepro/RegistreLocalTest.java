package etiquetagepro;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Etiquetage Pro autonome : registre local des codes (prefixe d'installation, jamais reproduits). */
class RegistreLocalTest {

    @TempDir
    Path dossier;

    @Test
    void prefixeTireUneFoisPuisRetenu() throws Exception {
        RegistreLocal r = RegistreLocal.ouvrir(dossier);
        assertTrue(RegistreLocal.prefixeValide(r.getPrefixe()), r.getPrefixe());
        assertEquals(r.getPrefixe(), RegistreLocal.ouvrir(dossier).getPrefixe());
        String code = r.attribuer("123");
        assertEquals(5, code.length());
        assertTrue(code.startsWith(r.getPrefixe()));
        for (char c : code.toCharArray()) {
            assertTrue(RegistreLocal.ALPHABET.indexOf(c) >= 0, code);
        }
    }

    @Test
    void jamaisDeuxFoisLeMemeCodeMemeAvecDeuxFenetres() throws Exception {
        RegistreLocal a = RegistreLocal.ouvrir(dossier, new Random(1));
        RegistreLocal b = RegistreLocal.ouvrir(dossier, new Random(1)); // meme tirage : les doublons sont evites
        Set<String> vus = new HashSet<>();
        for (int i = 0; i < 300; i++) {
            assertTrue(vus.add(a.attribuer("x")));
            assertTrue(vus.add(b.attribuer("x")));
        }
        assertEquals(600, a.nombre());
        assertEquals(600, Files.readAllLines(dossier.resolve("codes.txt")).size());
        /* relu a l'ouverture suivante */
        RegistreLocal c = RegistreLocal.ouvrir(dossier, new Random(1));
        assertEquals(600, c.nombre());
        assertFalse(vus.contains(c.attribuer("x")));
    }

    @Test
    void sixCaracteresQuandLesCinqSEpuisent() throws Exception {
        RegistreLocal r = RegistreLocal.ouvrir(dossier, new Random(7));
        String p = r.getPrefixe();
        /* 90 % des codes a 5 caracteres de ce prefixe deja pris */
        StringBuilder b = new StringBuilder();
        int n = 0, max = (int) (RegistreLocal.capacite(5) * 9 / 10);
        String a = RegistreLocal.ALPHABET;
        outer: for (char x : a.toCharArray()) {
            for (char y : a.toCharArray()) {
                for (char z : a.toCharArray()) {
                    if (n++ >= max) {
                        break outer;
                    }
                    b.append(p).append(x).append(y).append(z).append('\n');
                }
            }
        }
        Files.write(dossier.resolve("codes.txt"), b.toString().getBytes(StandardCharsets.UTF_8));
        assertEquals(6, r.attribuer("x").length());
        assertEquals(32768L, RegistreLocal.capacite(5));
    }

    @Test
    void prefixeChoisi() throws Exception {
        RegistreLocal.changerPrefixe(dossier, "K7");
        assertEquals("K7", RegistreLocal.ouvrir(dossier).getPrefixe());
        assertThrows(IllegalArgumentException.class, () -> RegistreLocal.changerPrefixe(dossier, "O1"));
        assertThrows(IllegalArgumentException.class, () -> RegistreLocal.changerPrefixe(dossier, "ABC"));
        assertNotEquals("O1", RegistreLocal.ouvrir(dossier).getPrefixe());
    }

    @Test
    void prefixeAbimeRetire() throws Exception {
        Files.write(dossier.resolve("prefixe.txt"), "??".getBytes(StandardCharsets.UTF_8));
        assertTrue(RegistreLocal.prefixeValide(RegistreLocal.ouvrir(dossier).getPrefixe()));
    }
}
