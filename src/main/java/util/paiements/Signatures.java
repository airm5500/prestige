package util.paiements;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** HMAC-SHA256 et comparaison à temps constant (même principe que le webhook WhatsApp). */
public final class Signatures {

    private Signatures() {
    }

    public static String hmacHex(String secret, String donnees) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = mac.doFinal(donnees.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(h.length * 2);
            for (byte b : h) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC indisponible", e);
        }
    }

    /** Signature hexadécimale attendue, comparée sans fuite de temps ; faux si un élément manque. */
    public static boolean valide(String secret, String donnees, String recue) {
        if (secret == null || secret.isBlank() || donnees == null || recue == null || recue.isBlank()) {
            return false;
        }
        byte[] a = hmacHex(secret, donnees).getBytes(StandardCharsets.US_ASCII);
        byte[] b = recue.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(a, b);
    }
}
