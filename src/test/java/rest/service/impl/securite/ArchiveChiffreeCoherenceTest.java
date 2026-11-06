package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;

/**
 * Cas 4, lot 4.C, test de COHERENCE (regle du 05/11) des archives chiffrees : des milliers de contenus tires au hasard
 * (graine fixe, tailles de 0 a plus d'un mega-octet, autour des multiples de 16) chiffres puis dechiffres, verifies par
 * des regles ecrites a part : aller-retour identique, taille exacte de l'archive (en-tete + blocs bourres + HMAC),
 * en-tete attendu, deux chiffrements du meme clair differents, mauvaise cle et octet altere refuses AVANT tout octet
 * rendu ; puis le format partage avec les scripts (vecteur produit par archive-chiffree.ps1), la cle DPAPI et les
 * regles de saisie de la cle.
 */
class ArchiveChiffreeCoherenceTest {

    static final long GRAINE = 20261106L;
    static final int CAS = 3000;

    /** Regle de reference, ecrite a part : taille d'une archive pour un clair de n octets. */
    static long tailleReference(long n) {
        return 8 + 16 + 16 + 4 + 16 * (n / 16 + 1) + 32;
    }

    static Path dossier;

    @BeforeAll
    static void dossier() throws IOException {
        dossier = Files.createTempDirectory("essai-archives");
    }

    @AfterAll
    static void nettoyer() throws IOException {
        try (java.util.stream.Stream<Path> s = Files.list(dossier)) {
            s.forEach(f -> f.toFile().delete());
        }
        if (!dossier.toFile().delete()) {
            dossier.toFile().deleteOnExit();
        }
    }

    static SecureRandom graine(long g) throws Exception {
        SecureRandom r = SecureRandom.getInstance("SHA1PRNG");
        r.setSeed(g);
        return r;
    }

    static byte[] chiffrer(byte[] clair, byte[] cle, SecureRandom alea, int iterations) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (OutputStream o = ArchiveChiffree.chiffrer(b, cle, alea, iterations)) {
            /* ecrit par morceaux de tailles variees : le flux doit s'en moquer */
            int p = 0;
            Random r = new Random(clair.length);
            while (p < clair.length) {
                int n = Math.min(clair.length - p, 1 + r.nextInt(70000));
                o.write(clair, p, n);
                p += n;
            }
        }
        return b.toByteArray();
    }

    static byte[] dechiffrer(Path f, byte[] cle) throws Exception {
        try (InputStream in = ArchiveChiffree.dechiffrer(f, cle)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] t = new byte[8192];
            int n;
            while ((n = in.read(t)) > 0) {
                b.write(t, 0, n);
            }
            return b.toByteArray();
        }
    }

    @Test
    void milliersDeContenusFontLAllerRetourAvecLaTailleExacte() throws Exception {
        Random r = new Random(GRAINE);
        SecureRandom alea = graine(GRAINE);
        byte[] cle = ArchiveChiffree.octetsCle("ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789");
        byte[] autre = ArchiveChiffree.octetsCle("ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-678a");
        Set<String> vus = new HashSet<>();
        Path f = dossier.resolve("cas.aes");
        int refusesCle = 0, refusesAlteration = 0;
        for (int i = 0; i < CAS; i++) {
            /* tailles variees : 0, autour des multiples de 16, petites, moyennes, et quelques grandes */
            int n = i % 50 == 0 ? 1_000_000 + r.nextInt(70000) : i % 7 == 0 ? r.nextInt(64)
                    : i % 3 == 0 ? 16 * r.nextInt(300) + (r.nextInt(3) - 1) : r.nextInt(20000);
            n = Math.max(0, n);
            byte[] clair = new byte[n];
            r.nextBytes(clair);
            byte[] archive = chiffrer(clair, cle, alea, 1000);
            assertEquals(tailleReference(n), archive.length, "taille, cas " + i + " (n=" + n + ")");
            assertEquals(ArchiveChiffree.tailleChiffree(n), archive.length, "tailleChiffree, cas " + i);
            assertEquals("PRSTGA01", new String(archive, 0, 8, StandardCharsets.US_ASCII), "magie, cas " + i);
            assertEquals(1000, ((archive[40] & 0xff) << 24) | ((archive[41] & 0xff) << 16) | ((archive[42] & 0xff) << 8)
                    | (archive[43] & 0xff), "itérations, cas " + i);
            assertTrue(vus.add(new String(archive, 8, 32, StandardCharsets.ISO_8859_1)),
                    "sel et IV déjà vus, cas " + i);
            if (n >= 16) {
                /* le clair n'apparait pas dans l'archive */
                assertFalse(contient(archive, Arrays.copyOf(clair, 16)), "clair visible, cas " + i);
            }
            Files.write(f, archive);
            assertArrayEquals(clair, dechiffrer(f, cle), "aller-retour, cas " + i);
            if (i % 10 == 0) {
                assertThrows(GeneralSecurityException.class, () -> ArchiveChiffree.dechiffrer(f, autre),
                        "mauvaise clé acceptée, cas " + i);
                refusesCle++;
            }
            if (i % 10 == 5) {
                byte[] altere = archive.clone();
                int k = r.nextInt(altere.length);
                altere[k] ^= (byte) (1 << r.nextInt(8));
                Files.write(f, altere);
                Exception x = assertThrows(Exception.class, () -> ArchiveChiffree.dechiffrer(f, cle),
                        "altération acceptée, cas " + i + " (octet " + k + ")");
                assertTrue(x instanceof GeneralSecurityException || x instanceof IOException, x.toString());
                refusesAlteration++;
            }
            if (i % 100 == 0) {
                /* deux chiffrements du meme clair : archives differentes (sel et IV), meme clair au retour */
                byte[] bis = chiffrer(clair, cle, alea, 1000);
                assertFalse(Arrays.equals(archive, bis), "deux archives identiques, cas " + i);
            }
        }
        assertEquals(CAS / 10, refusesCle);
        assertEquals(CAS / 10, refusesAlteration);
    }

    @Test
    void troncatureEtFichierEtrangerRefusesSansRienRendre() throws Exception {
        byte[] cle = ArchiveChiffree.octetsCle("ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789");
        byte[] archive = chiffrer("un contenu de plus de seize octets".getBytes(StandardCharsets.UTF_8), cle, graine(1),
                1000);
        Path f = dossier.resolve("tronque.aes");
        for (int coupe : new int[] { 0, 10, 44, 60, archive.length - 1, archive.length - 33 }) {
            Files.write(f, Arrays.copyOf(archive, coupe));
            assertThrows(Exception.class, () -> ArchiveChiffree.dechiffrer(f, cle), "coupé à " + coupe);
        }
        Files.write(f,
                "pas une archive, juste un texte assez long pour passer la taille minimale de 92 octets, et encore un peu"
                        .getBytes(StandardCharsets.UTF_8));
        IOException e = assertThrows(IOException.class, () -> ArchiveChiffree.dechiffrer(f, cle));
        assertTrue(e.getMessage().contains("pas une archive"), e.getMessage());
    }

    @Test
    void iterationsReellesEtDerivationPartagee() throws Exception {
        /* le format par defaut : 200 000 iterations ; la derivation separe cle AES et cle HMAC */
        byte[] cle = ArchiveChiffree.octetsCle("ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789");
        byte[] clair = "Dump completed".getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (OutputStream o = ArchiveChiffree.chiffrer(b, cle, graine(3))) {
            o.write(clair);
        }
        byte[] archive = b.toByteArray();
        assertEquals(ArchiveChiffree.ITERATIONS, ((archive[40] & 0xff) << 24) | ((archive[41] & 0xff) << 16)
                | ((archive[42] & 0xff) << 8) | (archive[43] & 0xff));
        Path f = dossier.resolve("defaut.aes");
        Files.write(f, archive);
        assertArrayEquals(clair, dechiffrer(f, cle));
        byte[][] k = ArchiveChiffree.deriver(cle, new byte[16], 1000);
        assertEquals(32, k[0].length);
        assertEquals(32, k[1].length);
        assertFalse(Arrays.equals(k[0], k[1]));
        assertArrayEquals(k[0], ArchiveChiffree.deriver(cle, new byte[16], 1000)[0], "dérivation déterministe");
        assertFalse(Arrays.equals(k[0], ArchiveChiffree.deriver(cle, new byte[] { 1 }, 1000)[0]), "sel différent");
    }

    /** Vecteur produit par outils/officine/archive-chiffree.ps1 (Chiffrer-Flux) : le meme format des deux cotes. */
    @Test
    void vecteurDesScriptsPowerShellEstLuTelQuel() throws Exception {
        String hex = "5052535447413031a0f7687cef889b6c396c5ca46132a60efefab4e29edbdb7549450b6955dac3b100030d401c6690790cc31209956f4e4e4b5339fbe6bc7bbaa2a95b8022caef993602a7512d189b607c9b30ff6a6818dee4d757414d82db613b3f9835f03f39b607fa4e70b65861a861a31e0e159388c1484244873ee5f1fa044dd5f76c51ba2cbf2feda5486c14c77e89433acbb00fff1a033ec3";
        byte[] archive = new byte[hex.length() / 2];
        for (int i = 0; i < archive.length; i++) {
            archive[i] = (byte) Integer.parseInt(hex.substring(2 * i, 2 * i + 2), 16);
        }
        Path f = dossier.resolve("vecteur-ps.aes");
        Files.write(f, archive);
        byte[] cle = ArchiveChiffree.octetsCle("Essai-Cle-2026-ABCD-wxyz");
        assertEquals("Prestige lot 4.C : vecteur d essai PowerShell -> Java, 47 octets!",
                new String(dechiffrer(f, cle), StandardCharsets.UTF_8));
        assertEquals(ArchiveChiffree.tailleChiffree(65), archive.length);
        assertThrows(GeneralSecurityException.class,
                () -> ArchiveChiffree.dechiffrer(f, ArchiveChiffree.octetsCle("Essai-Cle-2026-ABCD-wxyZ")));
    }

    @Test
    void reglesDeSaisieDeLaCle() {
        assertArrayEquals("ABCD-EFGH-JKLM".getBytes(StandardCharsets.US_ASCII),
                ArchiveChiffree.octetsCle(" ABCD-EFGH-\nJKLM \r\n"), "espaces et sauts de ligne retirés");
        assertThrows(IllegalArgumentException.class, () -> ArchiveChiffree.octetsCle("ABCD-EFGH"), "trop courte");
        assertThrows(IllegalArgumentException.class, () -> ArchiveChiffree.octetsCle(null));
        assertThrows(IllegalArgumentException.class, () -> ArchiveChiffree.octetsCle("ABCD-EFGH-JKLM-é"), "accent");
        assertTrue(ArchiveChiffree.estChiffree("prestige_labo_20261106_1200.sql.gz.AES"));
        assertFalse(ArchiveChiffree.estChiffree("prestige_labo_20261106_1200.sql.gz"));
        assertFalse(ArchiveChiffree.estChiffree(null));
    }

    @Test
    @EnabledOnOs(OS.WINDOWS)
    void cleDpapiEcritePuisRelue() throws Exception {
        byte[] cle = ArchiveChiffree.octetsCle("ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789");
        String fichier = ArchiveChiffree.fichierCleDpapi(cle);
        assertTrue(fichier.startsWith(ArchiveChiffree.ENTETE_FICHIER_CLE + "\r\n"));
        assertFalse(fichier.contains("ABCD-EFGH"), "rien en clair");
        Path f = dossier.resolve("archive.cnf");
        Files.write(f, fichier.getBytes(StandardCharsets.UTF_8));
        assertArrayEquals(cle, ArchiveChiffree.lireCle(f));
        assertNull(ArchiveChiffree.lireCle(dossier.resolve("absente.cnf")), "absente : archives en clair");
        Files.write(f, (ArchiveChiffree.ENTETE_FICHIER_CLE + "\r\nAAAAQUJD\r\n").getBytes(StandardCharsets.UTF_8));
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> ArchiveChiffree.lireCle(f));
        assertTrue(e.getMessage().contains("7-cle-archive.ps1"), e.getMessage());
        Files.write(f, "pas du base64 !!".getBytes(StandardCharsets.UTF_8));
        e = assertThrows(IllegalStateException.class, () -> ArchiveChiffree.lireCle(f));
        assertTrue(e.getMessage().contains("n'est pas un bloc"), e.getMessage());
    }

    static boolean contient(byte[] a, byte[] b) {
        ext: for (int i = 0; i + b.length <= a.length; i++) {
            for (int j = 0; j < b.length; j++) {
                if (a[i + j] != b[j]) {
                    continue ext;
                }
            }
            return true;
        }
        return false;
    }
}
