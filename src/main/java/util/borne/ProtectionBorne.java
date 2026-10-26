package util.borne;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Demande mobile 57 : signature des appels d'une borne de pointage et protections associees, sans base de donnees.
 * <ul>
 * <li>CHAINE = methode, chemin (avec « ? » et les parametres s'il y en a), date, empreinte et SHA-256 du corps, separes
 * par un saut de ligne ; signature = base64url(HMAC-SHA256(secret, CHAINE)). Le secret ne circule jamais.</li>
 * <li>Anti-rejeu : une signature deja vue dans les 10 minutes est refusee.</li>
 * <li>Debit : 120 appels par minute et par borne ; 10 signatures fausses par minute et par adresse bloquent l'adresse,
 * avec une attente qui double a chaque recidive (de 1 a 15 minutes), comme LimiteConnexion.</li>
 * </ul>
 */
public final class ProtectionBorne {

    public static final long ECART_HORLOGE_MS = 300_000L;
    static final long REJEU_MS = 10 * 60_000L;
    static final int APPELS_PAR_MINUTE = 120;
    static final int ECHECS_PAR_MINUTE = 10;
    static final long BLOCAGE_INITIAL_MS = 60_000L;
    static final long BLOCAGE_MAX_MS = 15 * 60_000L;
    static final long OUBLI_MS = 15 * 60_000L;

    private static final ProtectionBorne INSTANCE = new ProtectionBorne(System::currentTimeMillis);

    private final LongSupplier horloge;
    private final Map<String, Long> signaturesVues = new ConcurrentHashMap<>();
    private final Map<String, long[]> appels = new ConcurrentHashMap<>(); // borne -> {debut de minute, nombre}
    private final Map<String, long[]> echecs = new ConcurrentHashMap<>(); // adresse -> {debut, nombre, bloque jusqu'a,
                                                                          // attente}

    ProtectionBorne(LongSupplier horloge) {
        this.horloge = horloge;
    }

    public static ProtectionBorne instance() {
        return INSTANCE;
    }

    public static String chaine(String methode, String chemin, String date, String empreinte, byte[] corps) {
        return methode + "\n" + chemin + "\n" + date + "\n" + empreinte + "\n" + sha256Hex(corps);
    }

    public static String sha256Hex(byte[] donnees) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(donnees == null ? new byte[0] : donnees);
            StringBuilder s = new StringBuilder(64);
            for (byte b : h) {
                s.append(String.format("%02x", b));
            }
            return s.toString();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String signer(byte[] secret, String chaine) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(chaine.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Comparaison a temps constant (le remplissage base64url eventuel est ignore). */
    public static boolean signaturesEgales(String attendue, String recue) {
        if (attendue == null || recue == null) {
            return false;
        }
        return MessageDigest.isEqual(attendue.getBytes(StandardCharsets.US_ASCII),
                recue.trim().replace("=", "").getBytes(StandardCharsets.US_ASCII));
    }

    /** Secret neuf : 32 octets aleatoires. */
    public static byte[] nouveauSecret() {
        byte[] s = new byte[32];
        new SecureRandom().nextBytes(s);
        return s;
    }

    public static String base64Url(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    /** Vrai si la date est a moins de 5 minutes de l'horloge du serveur. */
    public boolean dateAcceptee(long dateMs) {
        return Math.abs(horloge.getAsLong() - dateMs) <= ECART_HORLOGE_MS;
    }

    /** Vrai la premiere fois qu'une signature est vue dans les 10 minutes (et l'enregistre). */
    public boolean premiereFois(String signature) {
        long maintenant = horloge.getAsLong();
        if (signaturesVues.size() > 20_000) {
            for (Iterator<Map.Entry<String, Long>> i = signaturesVues.entrySet().iterator(); i.hasNext();) {
                if (i.next().getValue() < maintenant) {
                    i.remove();
                }
            }
        }
        Long avant = signaturesVues.putIfAbsent(signature, maintenant + REJEU_MS);
        if (avant != null && avant < maintenant) {
            signaturesVues.put(signature, maintenant + REJEU_MS);
            return true;
        }
        return avant == null;
    }

    /** Compte un appel de la borne ; faux au-dela de 120 par minute. */
    public boolean appelAccepte(String borneId) {
        long maintenant = horloge.getAsLong();
        long[] c = appels.compute(borneId, (k, v) -> v == null || maintenant - v[0] >= 60_000L
                ? new long[] { maintenant, 1 } : new long[] { v[0], v[1] + 1 });
        return c[1] <= APPELS_PAR_MINUTE;
    }

    /** Secondes de blocage restantes pour cette adresse (signatures fausses), 0 si aucune. */
    public long blocageSecondes(String adresse) {
        long[] e = echecs.get(adresse == null ? "" : adresse);
        long reste = e == null ? 0 : e[2] - horloge.getAsLong();
        return reste > 0 ? (reste + 999) / 1000 : 0;
    }

    /** Signature fausse depuis cette adresse ; rend les secondes de blocage si le seuil est atteint. */
    public long echec(String adresse) {
        long maintenant = horloge.getAsLong();
        long[] e = echecs.compute(adresse == null ? "" : adresse, (k, v) -> {
            long[] n = v == null ? new long[] { maintenant, 0, 0, 0 } : v.clone();
            /* comme LimiteConnexion : 15 minutes sans nouveau blocage, l'attente repart de 1 minute */
            if (n[2] != 0 && maintenant - n[2] > OUBLI_MS) {
                n[3] = 0;
                n[2] = 0;
            }
            if (maintenant - n[0] >= 60_000L) {
                n[0] = maintenant;
                n[1] = 0;
            }
            n[1]++;
            if (n[1] >= ECHECS_PAR_MINUTE) {
                n[3] = n[3] == 0 ? BLOCAGE_INITIAL_MS : Math.min(BLOCAGE_MAX_MS, n[3] * 2);
                n[2] = maintenant + n[3];
                n[1] = 0;
                n[0] = maintenant;
            }
            return n;
        });
        return e[2] > maintenant ? (e[2] - maintenant + 999) / 1000 : 0;
    }

    /** Essais : remet les compteurs a zero. */
    public void oublier() {
        signaturesVues.clear();
        appels.clear();
        echecs.clear();
    }
}
