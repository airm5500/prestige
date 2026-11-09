package rest.service.impl.securite;

import java.io.EOFException;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;
import com.sun.jna.platform.win32.Crypt32Util;

/**
 * ARCHIVES DE SAUVEGARDE CHIFFREES (cas 4, lot 4.C, S6) : le meme format que outils/officine/archive-chiffree.ps1, lu
 * et ecrit par les deux.
 *
 * <pre>
 *   8 octets  'PRSTGA01'           magie et version
 *  16 octets  sel                  tire pour chaque fichier
 *  16 octets  IV                   tire pour chaque fichier
 *   4 octets  iterations PBKDF2    gros-boutiste
 *  ...        AES-256-CBC, PKCS7
 *  32 octets  HMAC-SHA256 de tout ce qui precede
 * </pre>
 *
 * Cles : PBKDF2-HMAC-SHA256(cle du pharmacien, sel, iterations), 64 octets : 32 pour AES, 32 pour le HMAC. A la
 * lecture, le HMAC du fichier entier est verifie AVANT de dechiffrer le premier octet (deux lectures). La cle n'existe
 * sur le serveur que chiffree par DPAPI (portee machine) dans {@link #fichierCle} ; elle n'est jamais journalisee ni
 * renvoyee, et les messages d'erreur ne la citent pas.
 */
public final class ArchiveChiffree {

    public static final String SUFFIXE = ".aes";
    public static final String CLE_FICHIER_CLE = "KEY_SECURITE_FICHIER_CLE_ARCHIVE";
    public static final String ENTETE_FICHIER_CLE = "# Prestige : cle des archives chiffrees (DPAPI)";
    static final byte[] MAGIE = "PRSTGA01".getBytes(StandardCharsets.US_ASCII);
    static final int ITERATIONS = 200_000;
    static final int ENTETE = 44, HMAC = 32, BLOC = 16;
    private static final boolean WINDOWS = java.io.File.separatorChar == '\\';

    private ArchiveChiffree() {
    }

    /** Taille exacte d'une archive d'apres celle du clair (en-tete, blocs bourres, HMAC). */
    public static long tailleChiffree(long clair) {
        return ENTETE + (clair / BLOC + 1) * BLOC + HMAC;
    }

    public static boolean estChiffree(String nom) {
        return nom != null && nom.toLowerCase().endsWith(SUFFIXE);
    }

    /* ============================================================================================ la cle */

    /** Chemin du fichier de la cle : le parametre s'il est renseigne, sinon a cote du fichier d'identifiants. */
    public static Path fichierCle(String parametre) {
        if (StringUtils.isNotBlank(parametre)) {
            return Paths.get(parametre.trim());
        }
        return IdentifiantsBaseService.fichierParDefaut().resolveSibling("archive.cnf");
    }

    /**
     * Octets de la cle lus dans le fichier DPAPI ; null si le fichier n'existe pas (archives en clair) ;
     * IllegalStateException sans aucune valeur s'il existe mais n'est pas lisible par ce compte sur ce poste.
     */
    public static byte[] lireCle(Path f) {
        if (f == null || !Files.isRegularFile(f)) {
            return null;
        }
        String texte;
        try {
            texte = new String(Files.readAllBytes(f), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Fichier de la clé des archives illisible : " + f + " ("
                    + e.getClass().getSimpleName() + ") : le compte du serveur doit pouvoir le lire.");
        }
        StringBuilder b64 = new StringBuilder();
        for (String l : texte.split("\\r?\\n")) {
            String t = l.trim();
            if (!t.isEmpty() && !t.startsWith("#")) {
                b64.append(t);
            }
        }
        byte[] bloc;
        try {
            bloc = Base64.getDecoder().decode(b64.toString());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "Le fichier de la clé des archives " + f + " n'est pas un bloc chiffré par 7-cle-archive.ps1.");
        }
        if (!WINDOWS) {
            /* banc : la cle en clair, lisible par le seul compte du serveur */
            return texte.trim().getBytes(StandardCharsets.UTF_8);
        }
        try {
            return Crypt32Util.cryptUnprotectData(bloc);
        } catch (Throwable e) {
            throw new IllegalStateException(
                    "La clé des archives " + f + " n'est pas déchiffrable par le compte du serveur sur ce poste ("
                            + e.getClass().getSimpleName() + ") : relancez 7-cle-archive.ps1 -Creer sur ce poste.");
        }
    }

    /** Contenu d'un fichier de cle (tests, banc Windows) : en-tete puis bloc DPAPI (portee machine) en base64. */
    public static String fichierCleDpapi(byte[] cle) {
        if (!WINDOWS) {
            throw new IllegalStateException("Chiffrement DPAPI disponible sous Windows seulement.");
        }
        byte[] bloc = Crypt32Util.cryptProtectData(cle, null,
                com.sun.jna.platform.win32.WinCrypt.CRYPTPROTECT_LOCAL_MACHINE,
                IdentifiantsBaseService.DESCRIPTION_DPAPI, null);
        return ENTETE_FICHIER_CLE + "\r\n" + Base64.getEncoder().encodeToString(bloc) + "\r\n";
    }

    /* ============================================================================================ derivation */

    static byte[][] deriver(byte[] cle, byte[] sel, int iterations) throws GeneralSecurityException {
        char[] c = new char[cle.length];
        /*
         * PBEKeySpec attend des caracteres : chaque octet de la cle (UTF-8) devient un caractere 0..255 ; c'est le
         * comportement de Rfc2898DeriveBytes(byte[]) de .NET seulement si tous les octets sont < 128 : on y veille avec
         * {@link #octetsCle}.
         */
        for (int i = 0; i < cle.length; i++) {
            c[i] = (char) (cle[i] & 0xff);
        }
        KeySpec spec = new PBEKeySpec(c, sel, iterations, 64 * 8);
        byte[] o = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        Arrays.fill(c, '\0');
        return new byte[][] { Arrays.copyOfRange(o, 0, 32), Arrays.copyOfRange(o, 32, 64) };
    }

    /** La cle telle que le pharmacien la tape (espaces retires) ; ASCII seulement, comme les scripts. */
    public static byte[] octetsCle(String cle) {
        String c = StringUtils.defaultString(cle).replaceAll("\\s", "");
        if (c.length() < 12) {
            throw new IllegalArgumentException("Clé des archives trop courte (12 caractères au moins).");
        }
        for (char x : c.toCharArray()) {
            if (x > 127) {
                throw new IllegalArgumentException("Clé des archives : lettres, chiffres et tirets seulement.");
            }
        }
        return c.getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] grosBoutiste(int n) {
        return new byte[] { (byte) (n >>> 24), (byte) (n >>> 16), (byte) (n >>> 8), (byte) n };
    }

    /* ============================================================================================ ecriture */

    /** Flux qui chiffre ce qu'on y ecrit vers {@code sortie} ; close() ecrit le dernier bloc et le HMAC. */
    public static OutputStream chiffrer(OutputStream sortie, byte[] cle, SecureRandom alea)
            throws IOException, GeneralSecurityException {
        return chiffrer(sortie, cle, alea, ITERATIONS);
    }

    /** Meme chose avec un nombre d'iterations donne (1000 au moins ; les tests en font des milliers de cas). */
    static OutputStream chiffrer(OutputStream sortie, byte[] cle, SecureRandom alea, int iterations)
            throws IOException, GeneralSecurityException {
        if (iterations < 1000) {
            throw new IllegalArgumentException("1000 itérations au moins");
        }
        byte[] sel = new byte[16], iv = new byte[16];
        alea.nextBytes(sel);
        alea.nextBytes(iv);
        byte[][] k = deriver(cle, sel, iterations);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(k[1], "HmacSHA256"));
        Cipher aes = Cipher.getInstance("AES/CBC/PKCS5Padding");
        aes.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(k[0], "AES"), new IvParameterSpec(iv));
        byte[] entete = new byte[ENTETE];
        System.arraycopy(MAGIE, 0, entete, 0, 8);
        System.arraycopy(sel, 0, entete, 8, 16);
        System.arraycopy(iv, 0, entete, 24, 16);
        System.arraycopy(grosBoutiste(iterations), 0, entete, 40, 4);
        sortie.write(entete);
        mac.update(entete);
        /* le chiffre passe par le HMAC avant d'etre ecrit ; a la fermeture, le HMAC suit */
        OutputStream hmacPuisSortie = new OutputStream() {
            @Override
            public void write(int b) throws IOException {
                mac.update((byte) b);
                sortie.write(b);
            }

            @Override
            public void write(byte[] b, int off, int len) throws IOException {
                mac.update(b, off, len);
                sortie.write(b, off, len);
            }

            @Override
            public void flush() throws IOException {
                sortie.flush();
            }

            @Override
            public void close() throws IOException {
                sortie.write(mac.doFinal());
                sortie.close();
            }
        };
        return new CipherOutputStream(hmacPuisSortie, aes);
    }

    /* ============================================================================================ lecture */

    /** En-tete lu et HMAC du fichier entier verifie ; renvoie {cle AES, IV, longueur du chiffre}. */
    static Object[] verifier(Path fichier, byte[] cle) throws IOException, GeneralSecurityException {
        long taille = Files.size(fichier);
        if (taille < ENTETE + BLOC + HMAC) {
            throw new IOException("Archive tronquée : " + fichier.getFileName());
        }
        try (InputStream in = Files.newInputStream(fichier)) {
            byte[] entete = lire(in, ENTETE, fichier);
            if (!Arrays.equals(Arrays.copyOfRange(entete, 0, 8), MAGIE)) {
                throw new IOException("Ce fichier n'est pas une archive chiffrée Prestige : " + fichier.getFileName());
            }
            byte[] sel = Arrays.copyOfRange(entete, 8, 24), iv = Arrays.copyOfRange(entete, 24, 40);
            int it = ((entete[40] & 0xff) << 24) | ((entete[41] & 0xff) << 16) | ((entete[42] & 0xff) << 8)
                    | (entete[43] & 0xff);
            if (it < 1000 || it > 10_000_000) {
                throw new IOException("En-tête d'archive invalide : " + fichier.getFileName());
            }
            long longueur = taille - ENTETE - HMAC;
            if (longueur % BLOC != 0) {
                throw new IOException("Archive tronquée : " + fichier.getFileName());
            }
            byte[][] k = deriver(cle, sel, it);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(k[1], "HmacSHA256"));
            mac.update(entete);
            byte[] tampon = new byte[1 << 16];
            long reste = longueur;
            while (reste > 0) {
                int n = in.read(tampon, 0, (int) Math.min(tampon.length, reste));
                if (n <= 0) {
                    throw new EOFException("Archive tronquée : " + fichier.getFileName());
                }
                mac.update(tampon, 0, n);
                reste -= n;
            }
            byte[] attendu = lire(in, HMAC, fichier);
            if (!MessageDigest.isEqual(mac.doFinal(), attendu)) {
                throw new GeneralSecurityException("Mauvaise clé ou archive altérée : " + fichier.getFileName());
            }
            return new Object[] { k[0], iv, longueur };
        }
    }

    private static byte[] lire(InputStream in, int n, Path fichier) throws IOException {
        byte[] b = new byte[n];
        int lu = 0;
        while (lu < n) {
            int x = in.read(b, lu, n - lu);
            if (x < 0) {
                throw new EOFException("Archive tronquée : " + fichier.getFileName());
            }
            lu += x;
        }
        return b;
    }

    /**
     * Flux du clair d'une archive : le HMAC est verifie en entier d'abord (une lecture), puis le fichier est dechiffre
     * a la volee (seconde lecture). GeneralSecurityException si la cle ne convient pas ou si le fichier a ete modifie,
     * sans qu'un octet ait ete rendu.
     */
    public static InputStream dechiffrer(Path fichier, byte[] cle) throws IOException, GeneralSecurityException {
        Object[] v = verifier(fichier, cle);
        Cipher aes = Cipher.getInstance("AES/CBC/PKCS5Padding");
        aes.init(Cipher.DECRYPT_MODE, new SecretKeySpec((byte[]) v[0], "AES"), new IvParameterSpec((byte[]) v[1]));
        InputStream in = Files.newInputStream(fichier);
        long saute = 0;
        while (saute < ENTETE) {
            long s = in.skip(ENTETE - saute);
            if (s <= 0) {
                in.close();
                throw new EOFException("Archive tronquée : " + fichier.getFileName());
            }
            saute += s;
        }
        /* les 32 derniers octets (HMAC) ne sont pas du chiffre */
        InputStream borne = new FilterInputStream(in) {
            long reste = (Long) v[2];

            @Override
            public int read() throws IOException {
                if (reste <= 0) {
                    return -1;
                }
                int b = super.read();
                if (b >= 0) {
                    reste--;
                }
                return b;
            }

            @Override
            public int read(byte[] b, int off, int len) throws IOException {
                if (reste <= 0) {
                    return -1;
                }
                int n = super.read(b, off, (int) Math.min(len, reste));
                if (n > 0) {
                    reste -= n;
                }
                return n;
            }
        };
        return new CipherInputStream(borne, aes);
    }
}
