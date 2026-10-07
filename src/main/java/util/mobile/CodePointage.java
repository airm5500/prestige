package util.mobile;

/**
 * CODE DE POINTAGE AFFICHE A L'OFFICINE (lot L13) : un QR code qui change chaque minute, a scanner avec le telephone.
 * Une capture d'ecran envoyee a un collegue absent ne sert plus une minute plus tard. Calcul pur (CodePointageTest).
 *
 * Code de 6 caracteres sans ambiguite de lecture (ni 0/O ni 1/I), tire du HMAC de la cle et du numero de periode. La
 * periode en cours et la precedente sont acceptees (le temps de scanner).
 */
public final class CodePointage {

    public static final int PERIODE_SEC = 60;
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    /** Prefixe du contenu du QR : le telephone reconnait un QR de pointage Prestige. */
    public static final String PREFIXE = "PRESTIGE-POINTAGE:";

    private CodePointage() {
    }

    public static String code(byte[] cle, long epochSec) {
        byte[] h = JetonMobile.hmac(cle, "pointage|" + Math.floorDiv(epochSec, PERIODE_SEC));
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(ALPHABET.charAt((h[i] & 0xFF) % ALPHABET.length()));
        }
        return sb.toString();
    }

    /** Secondes restantes avant le prochain code. */
    public static int resteSec(long epochSec) {
        return (int) (PERIODE_SEC - Math.floorMod(epochSec, PERIODE_SEC));
    }

    /** Code saisi ou scanne (avec ou sans le prefixe du QR, casse et espaces indifferents). */
    public static boolean valide(byte[] cle, String saisi, long epochSec) {
        if (saisi == null) {
            return false;
        }
        String c = saisi.trim().toUpperCase();
        if (c.startsWith(PREFIXE)) {
            c = c.substring(PREFIXE.length());
        }
        c = c.replace(" ", "");
        if (c.length() != 6) {
            return false;
        }
        return c.equals(code(cle, epochSec)) || c.equals(code(cle, epochSec - PERIODE_SEC));
    }
}
