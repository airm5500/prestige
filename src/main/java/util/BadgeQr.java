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
    /**
     * Retour du 23/10 (Sunmi Blink 2) : douchette restee en clavier americain (QWERTY) sur un poste AZERTY. Chaque
     * touche est remplacee par celle du clavier francais : « PRESTIGE-BADGE|1|... » arrive en « PRESTIGE)BQDGEµ&µ... ».
     * US : caractere du QR ; FR : ce que le poste en recoit (lettres permutees, chiffres sans majuscule, - _ |).
     */
    static final String TOUCHES_US = "1234567890-_|aqzwmAQZWM";
    static final String TOUCHES_FR = "&\u00e9\"'(-\u00e8_\u00e7\u00e0)\u00b0\u00b5qawz,QAWZ?";
    public static final String PREFIXE_QWERTY = "PRESTIGE)BQDGE";
    /**
     * Retour du 24/10 : meme douchette, verrouillage majuscules actif sur le poste (active pour lire les chiffres des
     * etiquettes GS1). En AZERTY il inverse la majuscule des chiffres et des touches ) ° et * µ : les chiffres arrivent
     * justes, « - » en « ° », « _ » en « ) », « | » en « * » ; les lettres gardent leur casse.
     */
    static final String TOUCHES_US_MAJ = "-_|aqzwmAQZWM";
    static final String TOUCHES_FR_MAJ = "\u00b0)*qawz,QAWZ?";
    public static final String PREFIXE_QWERTY_MAJ = "PRESTIGE\u00b0BQDGE";
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

    /**
     * Demande du 16/10 (connexion par badge) : numero, login et secret d'un contenu de QR complet, ou {@code null} si
     * le contenu n'est pas un QR de badge de cette version (prefixe, version, 5 champs, aucun vide).
     */
    public static String[] champs(String lu) {
        if (lu == null) {
            return null;
        }
        String v = lu.trim();
        if (v.startsWith(PREFIXE_QWERTY) || v.startsWith(PREFIXE_QWERTY_MAJ)) {
            v = depuisQwerty(v);
        }
        String[] p = v.split("\\|", -1);
        if (p.length != 5 || !PREFIXE.equals(p[0]) || !VERSION.equals(p[1])) {
            return null;
        }
        for (int i = 2; i < 5; i++) {
            if (p[i].trim().isEmpty()) {
                return null;
            }
        }
        return new String[] { p[2].trim(), p[3].trim(), p[4].trim() };
    }

    /** Contenu lu par une douchette en QWERTY sur un poste AZERTY, remis tel qu'il est imprime. */
    public static String depuisQwerty(String lu) {
        boolean maj = lu.startsWith(PREFIXE_QWERTY_MAJ);
        String fr = maj ? TOUCHES_FR_MAJ : TOUCHES_FR;
        String us = maj ? TOUCHES_US_MAJ : TOUCHES_US;
        StringBuilder sb = new StringBuilder(lu.length());
        for (char c : lu.toCharArray()) {
            int i = fr.indexOf(c);
            sb.append(i < 0 ? c : us.charAt(i));
        }
        return sb.toString();
    }

    /**
     * Retour du 23/10 : ce qui ne va pas dans un contenu refuse par {@link #champs}, pour les traces du serveur (jamais
     * le contenu lui-meme, qui porte le secret) : prefixe, nombre de parties, version, partie vide.
     */
    public static String defautFormat(String lu) {
        if (lu == null || lu.trim().isEmpty()) {
            return "lecture vide";
        }
        String v = lu.trim();
        String qwerty = "";
        if (v.startsWith(PREFIXE_QWERTY) || v.startsWith(PREFIXE_QWERTY_MAJ)) {
            qwerty = v.startsWith(PREFIXE_QWERTY_MAJ) ? "douchette en QWERTY et verrouillage majuscules, "
                    : "douchette en QWERTY, ";
            v = depuisQwerty(v);
        }
        if (!v.toUpperCase().startsWith(PREFIXE)) {
            return "prefixe PRESTIGE-BADGE absent, " + v.length() + " caracteres";
        }
        String[] p = v.split("\\|", -1);
        if (p.length != 5) {
            return qwerty + p.length + " parties au lieu de 5 (separateur | absent ou deforme), " + v.length()
                    + " caracteres";
        }
        if (!PREFIXE.equals(p[0])) {
            return "prefixe en minuscules (verrouillage majuscules ?)";
        }
        if (!VERSION.equals(p[1])) {
            return "version inconnue";
        }
        String[] noms = { "numero", "login", "secret" };
        for (int i = 2; i < 5; i++) {
            if (p[i].trim().isEmpty()) {
                return qwerty + noms[i - 2] + " vide"
                        + (i == 3 ? " (employe sans compte utilisateur a l'impression)" : "");
            }
        }
        return "format non reconnu";
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
