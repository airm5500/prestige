package util.paiements;

import java.util.function.Function;

/**
 * B3 : configuration des paiements mobile money, lue dans les variables d'environnement (ou propriétés système -D…) du
 * serveur. DÉSACTIVÉ PAR DÉFAUT : sans {@code PRESTIGE_PAIEMENTS_FOURNISSEUR}, aucune route ne crée de paiement et la
 * capacité annonce une liste vide. Les secrets ne sont jamais renvoyés ni journalisés ({@link #toString()} les masque).
 *
 * <pre>
 * PRESTIGE_PAIEMENTS_FOURNISSEUR   simulateur | cinetpay | wave      (vide = désactivé)
 * PRESTIGE_PAIEMENTS_URL_PUBLIQUE  https://pharmacie.exemple.ci/prestige/api/v1   (notifications du fournisseur)
 * PRESTIGE_PAIEMENTS_EXPIRATION_MIN  10 (1 à 60)
 * PRESTIGE_PAIEMENTS_SIMULATEUR_SECRET  secret HMAC des notifications du simulateur
 * CINETPAY_APIKEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY
 * WAVE_API_KEY, WAVE_WEBHOOK_SECRET
 * </pre>
 */
public final class ConfigPaiements {

    public final String fournisseur;
    public final String urlPublique;
    public final int expirationMin;
    final String simulateurSecret;
    final String cinetpayApiKey;
    final String cinetpaySiteId;
    final String cinetpaySecret;
    final String waveApiKey;
    final String waveWebhookSecret;

    ConfigPaiements(String fournisseur, String urlPublique, int expirationMin, String simulateurSecret,
            String cinetpayApiKey, String cinetpaySiteId, String cinetpaySecret, String waveApiKey,
            String waveWebhookSecret) {
        this.fournisseur = fournisseur == null ? "" : fournisseur.trim().toLowerCase(java.util.Locale.ROOT);
        this.urlPublique = urlPublique == null ? "" : urlPublique.trim().replaceAll("/+$", "");
        this.expirationMin = Math.max(1, Math.min(60, expirationMin));
        this.simulateurSecret = simulateurSecret;
        this.cinetpayApiKey = cinetpayApiKey;
        this.cinetpaySiteId = cinetpaySiteId;
        this.cinetpaySecret = cinetpaySecret;
        this.waveApiKey = waveApiKey;
        this.waveWebhookSecret = waveWebhookSecret;
    }

    /** Lecture : {@code lire} renvoie la valeur d'une clé (variable d'environnement, sinon propriété système). */
    public static ConfigPaiements depuis(Function<String, String> lire) {
        int exp;
        try {
            exp = Integer.parseInt(nz(lire.apply("PRESTIGE_PAIEMENTS_EXPIRATION_MIN"), "10").trim());
        } catch (NumberFormatException e) {
            exp = 10;
        }
        return new ConfigPaiements(lire.apply("PRESTIGE_PAIEMENTS_FOURNISSEUR"),
                lire.apply("PRESTIGE_PAIEMENTS_URL_PUBLIQUE"), exp, lire.apply("PRESTIGE_PAIEMENTS_SIMULATEUR_SECRET"),
                lire.apply("CINETPAY_APIKEY"), lire.apply("CINETPAY_SITE_ID"), lire.apply("CINETPAY_SECRET_KEY"),
                lire.apply("WAVE_API_KEY"), lire.apply("WAVE_WEBHOOK_SECRET"));
    }

    /** Configuration du serveur (environnement, puis propriétés système). */
    public static ConfigPaiements systeme() {
        return depuis(k -> {
            String v = System.getenv(k);
            return v != null && !v.isBlank() ? v : System.getProperty(k);
        });
    }

    private static String nz(String v, String d) {
        return v == null || v.isBlank() ? d : v;
    }

    private static boolean ok(String... v) {
        for (String s : v) {
            if (s == null || s.isBlank()) {
                return false;
            }
        }
        return true;
    }

    /** Fournisseur configuré et complet, sinon null (paiements désactivés). */
    public FournisseurPaiement creerFournisseur(HttpPaiements http) {
        switch (fournisseur) {
        case "simulateur":
            return ok(simulateurSecret) ? new SimulateurPaiement(simulateurSecret) : null;
        case "cinetpay":
            return ok(cinetpayApiKey, cinetpaySiteId, cinetpaySecret, urlPublique)
                    ? new CinetPayFournisseur(http, cinetpayApiKey, cinetpaySiteId, cinetpaySecret) : null;
        case "wave":
            return ok(waveApiKey, waveWebhookSecret, urlPublique)
                    ? new WaveFournisseur(http, waveApiKey, waveWebhookSecret) : null;
        default:
            return null;
        }
    }

    @Override
    public String toString() {
        return "ConfigPaiements{fournisseur=" + fournisseur + ", urlPublique=" + urlPublique + ", expirationMin="
                + expirationMin + ", secrets=***}";
    }
}
