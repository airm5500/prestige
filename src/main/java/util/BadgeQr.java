package util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Contenu du QR code des badges RH (demande du 16/10) : {@code PRESTIGE-BADGE|1|numero|login|secret}.
 *
 * <p>
 * Le secret est propre au badge et tire au hasard (32 octets) ; seule son empreinte SHA-256 est gardee en base. Il ne
 * contient jamais le mot de passe : un badge perdu se desactive sans toucher au mot de passe, et une photo du badge ne
 * revele rien du mot de passe.
 */
public final class BadgeQr {

    public static final String PREFIXE = "PRESTIGE-BADGE";
    public static final String VERSION = "1";
    private static final SecureRandom HASARD = new SecureRandom();

    private BadgeQr() {
    }

    public static String nouveauSecret() {
        byte[] b = new byte[32];
        HASARD.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public static String contenu(String numero, String login, String secret) {
        return PREFIXE + "|" + VERSION + "|" + numero + "|" + (login == null ? "" : login) + "|" + secret;
    }

    /**
     * Numero de badge a partir d'une lecture : le numero lui-meme (code-barres) ou extrait du contenu du QR code.
     */
    public static String numero(String lu) {
        if (lu == null) {
            return null;
        }
        String v = lu.trim();
        if (v.startsWith(PREFIXE + "|")) {
            String[] p = v.split("\\|", -1);
            return p.length >= 3 ? p[2] : v;
        }
        return v;
    }

    public static String empreinte(String secret) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte x : h) {
                sb.append(String.format("%02x", x));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
