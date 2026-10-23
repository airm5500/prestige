package util.sms;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Catalogue des fournisseurs SMS connus et de leurs paramètres attendus.
 *
 * C'est la référence unique utilisée par l'écran de configuration (champs affichés), la validation serveur (paramètres
 * obligatoires, secrets à masquer) et les implémentations d'envoi.
 *
 * @author koben
 */
public final class SmsProviderCatalog {

    public static final String CODE_ORANGE = "ORANGE";
    public static final String CODE_LETEXTO = "LETEXTO";

    // Paramètres Orange (repris de dicisms.properties / AppParameters).
    public static final String ORANGE_CLIENT_ID = "client_id";
    public static final String ORANGE_CLIENT_SECRET = "client_secret";
    public static final String ORANGE_TOKEN_ENDPOINT = "token_endpoint";
    public static final String ORANGE_SEND_URL = "send_url";
    public static final String ORANGE_SENDER_ADDRESS = "sender_address";
    public static final String ORANGE_ADMIN_BASE_URL = "admin_base_url";
    public static final String ORANGE_SUBSCRIPTION_URL = "subscription_url";

    /*
     * Retour du 23/10 : valeurs par defaut publiques de l'API Orange (aucun identifiant), reprises en indication dans
     * la fiche du fournisseur et comme valeurs par defaut de dicisms.properties.
     */
    public static final String ORANGE_TOKEN_ENDPOINT_DEFAUT = "https://api.orange.com/oauth/v2/token";
    public static final String ORANGE_SEND_URL_DEFAUT = "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B225000000/requests";
    public static final String ORANGE_SENDER_ADDRESS_DEFAUT = "tel:+225000000";
    public static final String ORANGE_ADMIN_BASE_URL_DEFAUT = "https://api.orange.com/sms/admin/v1";
    public static final String ORANGE_SUBSCRIPTION_URL_DEFAUT = "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B225000000/subscriptions";
    private static final String DEPUIS_PORTAIL_ORANGE = "Fourni par le portail Orange Developer (application SMS)";

    // Paramètres LeTexto.
    public static final String LETEXTO_BASE_URL = "base_url";
    public static final String LETEXTO_API_KEY = "api_key";
    public static final String LETEXTO_SENDER_NAME = "sender_name";

    private static final Map<String, List<SmsProviderParamDef>> DEFS;

    static {
        Map<String, List<SmsProviderParamDef>> defs = new LinkedHashMap<>();
        defs.put(CODE_ORANGE,
                List.of(new SmsProviderParamDef(ORANGE_CLIENT_ID, "Client ID", false, true,
                        DEPUIS_PORTAIL_ORANGE + " : Client ID"),
                        new SmsProviderParamDef(ORANGE_CLIENT_SECRET, "Client secret", true, true,
                                DEPUIS_PORTAIL_ORANGE + " : Client secret"),
                        new SmsProviderParamDef(ORANGE_TOKEN_ENDPOINT, "URL du token OAuth2", false, true,
                                ORANGE_TOKEN_ENDPOINT_DEFAUT),
                        new SmsProviderParamDef(ORANGE_SEND_URL, "URL d'envoi", false, true, ORANGE_SEND_URL_DEFAUT),
                        new SmsProviderParamDef(ORANGE_SENDER_ADDRESS, "Adresse émettrice (tel:+225...)", false, true,
                                ORANGE_SENDER_ADDRESS_DEFAUT + " (numéro déclaré chez Orange)"),
                        new SmsProviderParamDef(ORANGE_ADMIN_BASE_URL, "URL admin (solde/statistiques)", false, false,
                                ORANGE_ADMIN_BASE_URL_DEFAUT),
                        new SmsProviderParamDef(ORANGE_SUBSCRIPTION_URL, "URL souscription DR", false, false,
                                ORANGE_SUBSCRIPTION_URL_DEFAUT)));
        defs.put(CODE_LETEXTO,
                List.of(new SmsProviderParamDef(LETEXTO_BASE_URL, "URL de base de l'API", false, true,
                        LeTextoSmsProvider.DEFAULT_BASE_URL),
                        new SmsProviderParamDef(LETEXTO_API_KEY, "Clé API", true, true,
                                "Fournie par l'espace client LeTexto (clé API)"),
                        new SmsProviderParamDef(LETEXTO_SENDER_NAME, "Nom d'expéditeur (sender)", false, true,
                                "Nom de l'officine, 11 caractères au plus")));
        DEFS = Collections.unmodifiableMap(defs);
    }

    private SmsProviderCatalog() {
    }

    /** Paramètres attendus pour un code fournisseur ; liste vide si le code est inconnu. */
    public static List<SmsProviderParamDef> paramDefs(String code) {
        return DEFS.getOrDefault(code, List.of());
    }

    /** Vrai si le paramètre est un secret (masqué à l'affichage) pour ce fournisseur. */
    public static boolean isSecret(String code, String cle) {
        return paramDefs(code).stream().anyMatch(d -> d.getCle().equals(cle) && d.isSecret());
    }

}
