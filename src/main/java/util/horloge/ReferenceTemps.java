package util.horloge;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Heure de reference (retours du 25/10, point 2 : date du systeme fausse). Ecart entre l'horloge de ce serveur et
 * l'heure d'Internet : un serveur de temps (SNTP, port 123), sinon l'en-tete Date d'un site HTTPS. Le resultat est
 * garde quelques minutes (succes comme echec) : la verification est appelee par chaque poste toutes les 5 minutes.
 */
public final class ReferenceTemps {

    private static final Logger LOG = Logger.getLogger(ReferenceTemps.class.getName());
    private static final String[] SERVEURS_NTP = { "pool.ntp.org", "time.windows.com", "time.google.com" };
    private static final String[] SITES_HTTP = { "https://www.google.com", "https://www.microsoft.com" };
    private static final int DELAI_MS = 2000;
    private static final long DUREE_CACHE_MS = 4 * 60_000L;
    /** Secondes entre 1900 (NTP) et 1970 (Java). */
    private static final long DECALAGE_NTP = 2_208_988_800L;

    /** Ecart mesure : horloge locale moins reference, en millisecondes ; source « ntp:hote » ou « http:site ». */
    public static final class Mesure {
        public final long ecartMs;
        public final String source;
        public final long mesureLe;

        Mesure(long ecartMs, String source, long mesureLe) {
            this.ecartMs = ecartMs;
            this.source = source;
            this.mesureLe = mesureLe;
        }
    }

    private static volatile Mesure derniere;
    private static volatile long derniereTentative;

    private ReferenceTemps() {
    }

    /** Ecart avec l'heure d'Internet, ou null si aucune reference n'a repondu (poste sans Internet). */
    public static Mesure mesurer() {
        long maintenant = System.currentTimeMillis();
        if (Math.abs(maintenant - derniereTentative) < DUREE_CACHE_MS) {
            return derniere;
        }
        derniereTentative = maintenant;
        Mesure m = null;
        for (String hote : SERVEURS_NTP) {
            try {
                m = new Mesure(ecartNtp(hote), "ntp:" + hote, System.currentTimeMillis());
                break;
            } catch (IOException | RuntimeException e) {
                LOG.log(Level.FINE, "Serveur de temps {0} injoignable : {1}", new Object[] { hote, e.getMessage() });
            }
        }
        if (m == null) {
            for (String site : SITES_HTTP) {
                try {
                    m = new Mesure(ecartHttp(site), "http:" + site, System.currentTimeMillis());
                    break;
                } catch (IOException | RuntimeException e) {
                    LOG.log(Level.FINE, "Site {0} injoignable : {1}", new Object[] { site, e.getMessage() });
                }
            }
        }
        derniere = m;
        return m;
    }

    /** SNTP (RFC 4330) : heure d'emission du serveur, corrigee de la moitie de l'aller-retour. */
    static long ecartNtp(String hote) throws IOException {
        byte[] demande = new byte[48];
        demande[0] = 0x1B; // LI 0, version 3, mode client
        try (DatagramSocket s = new DatagramSocket()) {
            s.setSoTimeout(DELAI_MS);
            long t0 = System.currentTimeMillis();
            s.send(new DatagramPacket(demande, demande.length, InetAddress.getByName(hote), 123));
            DatagramPacket reponse = new DatagramPacket(new byte[48], 48);
            s.receive(reponse);
            long t1 = System.currentTimeMillis();
            byte[] d = reponse.getData();
            long secondes = entier32(d, 40), fraction = entier32(d, 44);
            if (secondes == 0) {
                throw new IOException("reponse vide");
            }
            long emission = (secondes - DECALAGE_NTP) * 1000L + ((fraction * 1000L) >>> 32);
            return t1 - (emission + (t1 - t0) / 2);
        }
    }

    /** En-tete Date (a la seconde pres) d'une requete HEAD. */
    static long ecartHttp(String site) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(site).openConnection();
        c.setRequestMethod("HEAD");
        c.setConnectTimeout(DELAI_MS);
        c.setReadTimeout(DELAI_MS);
        long t0 = System.currentTimeMillis();
        try {
            c.getResponseCode();
            long t1 = System.currentTimeMillis();
            String date = c.getHeaderField("Date");
            if (date == null) {
                throw new IOException("pas d'en-tete Date");
            }
            long reference = ZonedDateTime.parse(date, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli();
            return t1 - (reference + 500 + (t1 - t0) / 2);
        } finally {
            c.disconnect();
        }
    }

    private static long entier32(byte[] d, int i) {
        return ((d[i] & 0xFFL) << 24) | ((d[i + 1] & 0xFFL) << 16) | ((d[i + 2] & 0xFFL) << 8) | (d[i + 3] & 0xFFL);
    }
}
