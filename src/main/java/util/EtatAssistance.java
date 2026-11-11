package util;

/**
 * Plan du 09/11, point 8 : regles de l'onglet « Assistance » de « A propos » (Prestige 3). Chaque etat porte un niveau
 * : VERT (normal), ORANGE (a surveiller), ROUGE (a traiter). Aucun chemin, mot de passe ni jeton n'est montre.
 */
public final class EtatAssistance {

    public static final String VERT = "VERT";
    public static final String ORANGE = "ORANGE";
    public static final String ROUGE = "ROUGE";

    /** Sauvegarde : verte jusqu'a 26 h (une par jour, avec une marge), orange jusqu'a 72 h, rouge au-dela ou sans. */
    public static final int SAUVEGARDE_VERTE_H = 26;
    public static final int SAUVEGARDE_ORANGE_H = 72;
    /** Disque : rouge sous 5 % ou 2 Go libres, orange sous 15 % ou 10 Go. */
    public static final long GO = 1024L * 1024L * 1024L;
    /** Base : verte jusqu'a 200 ms de reponse, orange jusqu'a 1 s, rouge au-dela ou injoignable. */
    public static final long BASE_VERTE_MS = 200;
    public static final long BASE_ORANGE_MS = 1000;

    private EtatAssistance() {
    }

    /**
     * @param ageMinutes
     *            age de la derniere sauvegarde reussie en minutes, null s'il n'y en a aucune
     */
    public static String sauvegarde(Long ageMinutes) {
        if (ageMinutes == null || ageMinutes < 0) {
            return ROUGE;
        }
        if (ageMinutes <= SAUVEGARDE_VERTE_H * 60L) {
            return VERT;
        }
        return ageMinutes <= SAUVEGARDE_ORANGE_H * 60L ? ORANGE : ROUGE;
    }

    /** @return niveau, ou null si la taille du disque est inconnue */
    public static String disque(long libre, long total) {
        if (total <= 0 || libre < 0 || libre > total) {
            return null;
        }
        double part = (double) libre / total;
        if (part < 0.05 || libre < 2 * GO) {
            return ROUGE;
        }
        return part < 0.15 || libre < 10 * GO ? ORANGE : VERT;
    }

    /**
     * @param ms
     *            duree de reponse de la base, negative si elle n'a pas repondu
     */
    public static String base(long ms) {
        if (ms < 0) {
            return ROUGE;
        }
        if (ms <= BASE_VERTE_MS) {
            return VERT;
        }
        return ms <= BASE_ORANGE_MS ? ORANGE : ROUGE;
    }

    /** Duree lisible : « 2 j 4 h », « 3 h 12 min », « 45 min » (minutes arrondies vers le bas). */
    public static String duree(long minutes) {
        long m = Math.max(0, minutes);
        long j = m / (24 * 60), h = (m / 60) % 24, mn = m % 60;
        if (j > 0) {
            return j + " j " + h + " h";
        }
        if (h > 0) {
            return h + " h " + mn + " min";
        }
        return mn + " min";
    }

    /** Plus haute version (« 7.6.40 » avant « 7.6.7 », comparee nombre par nombre) ; vide si aucune. */
    public static String plusHauteVersion(java.util.Collection<String> versions) {
        String max = "";
        for (String v : versions) {
            if (v != null && v.matches("\\d+(\\.\\d+)*") && (max.isEmpty() || comparer(v, max) > 0)) {
                max = v;
            }
        }
        return max;
    }

    static int comparer(String a, String b) {
        String[] x = a.split("\\."), y = b.split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            long d = (i < x.length ? Long.parseLong(x[i]) : 0) - (i < y.length ? Long.parseLong(y[i]) : 0);
            if (d != 0) {
                return d > 0 ? 1 : -1;
            }
        }
        return 0;
    }

    /** Taille lisible en Go, une decimale (« 148,2 Go »). */
    public static String go(long octets) {
        return String.format(java.util.Locale.FRANCE, "%.1f Go", octets / (double) GO);
    }
}
