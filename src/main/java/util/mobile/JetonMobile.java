package util.mobile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * JETON SIGNE DES TELEPHONES (plan d'octobre, 0.3, lot L13). Calcul pur, sans base (teste dans JetonMobileTest).
 *
 * Forme : {@code base64url(terminal|utilisateur|expiration) . base64url(HMAC-SHA256(cle, contenu))}. Le serveur ne
 * garde rien du jeton : il recalcule la signature. La revocation passe par le statut du terminal (verifie a chaque
 * appel) et la duree de vie courte ; regenerer la cle invalide tous les jetons.
 */
public final class JetonMobile {

    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder D64 = Base64.getUrlDecoder();

    private JetonMobile() {
    }

    /** Contenu d'un jeton valide. */
    public static final class Contenu {
        public final String terminal;
        public final String utilisateur;
        public final long expiration;

        Contenu(String terminal, String utilisateur, long expiration) {
            this.terminal = terminal;
            this.utilisateur = utilisateur;
            this.expiration = expiration;
        }
    }

    public static String emettre(byte[] cle, String terminal, String utilisateur, long expirationEpochSec) {
        if (terminal.contains("|") || utilisateur.contains("|")) {
            throw new IllegalArgumentException("identifiant invalide");
        }
        String contenu = terminal + "|" + utilisateur + "|" + expirationEpochSec;
        return B64.encodeToString(contenu.getBytes(StandardCharsets.UTF_8)) + "."
                + B64.encodeToString(hmac(cle, contenu));
    }

    /** Jeton intact et non expire ; sinon vide (jamais d'exception sur une valeur quelconque). */
    public static Optional<Contenu> verifier(byte[] cle, String jeton, long maintenantEpochSec) {
        try {
            if (jeton == null || jeton.length() > 600) {
                return Optional.empty();
            }
            int p = jeton.indexOf('.');
            if (p <= 0 || p != jeton.lastIndexOf('.')) {
                return Optional.empty();
            }
            String contenu = new String(D64.decode(jeton.substring(0, p)), StandardCharsets.UTF_8);
            byte[] signature = D64.decode(jeton.substring(p + 1));
            if (!MessageDigest.isEqual(signature, hmac(cle, contenu))) {
                return Optional.empty();
            }
            String[] t = contenu.split("\\|");
            if (t.length != 3) {
                return Optional.empty();
            }
            long exp = Long.parseLong(t[2]);
            return exp <= maintenantEpochSec ? Optional.empty() : Optional.of(new Contenu(t[0], t[1], exp));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    static byte[] hmac(byte[] cle, String contenu) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(cle, "HmacSHA256"));
            return mac.doFinal(contenu.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
