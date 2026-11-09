package util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Plan du 08/11, point 14 : code PIN a 4 chiffres demande apres le badge, pour qu'une photo du QR ne suffise plus a se
 * connecter. Optionnel, desactive par defaut (parametre {@code KEY_CONNEXION_BADGE_PIN}).
 * <p>
 * Seule une empreinte salee (PBKDF2) est gardee en base, jamais le code. Le code n'est jamais trace.
 */
public final class BadgePin {

    public static final String PARAMETRE = "KEY_CONNEXION_BADGE_PIN";
    /** Iterations de PBKDF2 : le code n'a que 10 000 valeurs, la limite d'essais du serveur fait la protection. */
    public static final int ITERATIONS = 60000;

    /** Issue d'une connexion par badge dont le badge est reconnu. */
    public enum Etat {
        /** session ouverte */
        ACCEPTE,
        /** code demande et pas encore tape : aucune session, pas un echec */
        PIN_REQUIS,
        /** code demande mais jamais defini par l'utilisateur : aucune session, pas un echec */
        PIN_A_DEFINIR,
        /** code faux : aucune session, compte comme un echec (limite d'essais par badge) */
        PIN_FAUX
    }

    private static final SecureRandom HASARD = new SecureRandom();

    private BadgePin() {
    }

    /** Le parametre ne demande le code qu'a la valeur '1' : absent ou autre valeur, le badge seul suffit. */
    public static boolean demande(String valeurParametre) {
        return "1".equals(valeurParametre == null ? null : valeurParametre.trim());
    }

    /**
     * Raison du refus d'un code a definir, ou {@code null} s'il est accepte : exactement 4 chiffres, pas quatre fois le
     * meme chiffre, pas une suite (1234, 4321, 6789...).
     */
    public static String refusFormat(String pin) {
        if (pin == null || !pin.matches("[0-9]{4}")) {
            return "Le code PIN doit compter exactement 4 chiffres.";
        }
        boolean memes = true, monte = true, descend = true;
        for (int i = 1; i < 4; i++) {
            int d = pin.charAt(i) - pin.charAt(i - 1);
            memes &= d == 0;
            monte &= d == 1;
            descend &= d == -1;
        }
        if (memes) {
            return "Code trop facile : quatre fois le même chiffre.";
        }
        if (monte || descend) {
            return "Code trop facile : chiffres qui se suivent.";
        }
        return null;
    }

    /** Issue, une fois le badge reconnu. {@code pinJuste} n'est lu que si un code est defini et tape. */
    public static Etat etat(boolean demande, boolean defini, String pinTape, boolean pinJuste) {
        if (!demande) {
            return Etat.ACCEPTE;
        }
        if (!defini) {
            return Etat.PIN_A_DEFINIR;
        }
        if (pinTape == null || pinTape.trim().isEmpty()) {
            return Etat.PIN_REQUIS;
        }
        return pinJuste ? Etat.ACCEPTE : Etat.PIN_FAUX;
    }

    public static String nouveauSel() {
        byte[] s = new byte[16];
        HASARD.nextBytes(s);
        return Base64.getEncoder().encodeToString(s);
    }

    public static String empreinte(String pin, String sel) {
        return empreinte(pin, sel, ITERATIONS);
    }

    static String empreinte(String pin, String sel, int iterations) {
        try {
            PBEKeySpec spec = new PBEKeySpec(pin.toCharArray(), Base64.getDecoder().decode(sel), iterations, 256);
            byte[] h = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            spec.clearPassword();
            StringBuilder sb = new StringBuilder();
            for (byte b : h) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("PBKDF2 indisponible", e);
        }
    }

    /** Comparaison a temps constant ; faux si l'un des elements manque. */
    public static boolean verifier(String pin, String sel, String empreinte) {
        return verifier(pin, sel, empreinte, ITERATIONS);
    }

    static boolean verifier(String pin, String sel, String empreinte, int iterations) {
        if (pin == null || sel == null || empreinte == null || !pin.matches("[0-9]{4}")) {
            return false;
        }
        return MessageDigest.isEqual(empreinte(pin, sel, iterations).getBytes(StandardCharsets.US_ASCII),
                empreinte.getBytes(StandardCharsets.US_ASCII));
    }
}
