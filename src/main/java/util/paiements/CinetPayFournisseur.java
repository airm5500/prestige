package util.paiements;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.json.JSONObject;

/**
 * B3 : adaptateur CinetPay (Orange Money, MTN, Moov, Wave, cartes en Côte d'Ivoire), API Checkout v2.
 * <p>
 * <b>À VALIDER AVEC LA DOCUMENTATION DU COMPTE MARCHAND</b> (la documentation en ligne n'était pas accessible depuis
 * l'environnement de développement) — écrit d'après la documentation publique CinetPay connue :
 * <ul>
 * <li>création : {@code POST https://api-checkout.cinetpay.com/v2/payment} (JSON : apikey, site_id, transaction_id,
 * amount — multiple de 5 —, currency XOF, description, notify_url, return_url, channels) → {@code data.payment_url}
 * ;</li>
 * <li>notification (IPN) : POST formulaire (cpm_site_id, cpm_trans_id, …) sur notify_url, en-tête {@code x-token} =
 * HMAC-SHA256 (hex) de la concaténation des champs ci-dessous, clé = « secret key » du compte ;</li>
 * <li>vérification : {@code POST https://api-checkout.cinetpay.com/v2/payment/check} (apikey, site_id, transaction_id)
 * → {@code data.status} ACCEPTED / REFUSED / WAITING_FOR_CUSTOMER…, {@code data.amount}, {@code data.currency}.</li>
 * </ul>
 */
public final class CinetPayFournisseur implements FournisseurPaiement {

    static final String BASE = "https://api-checkout.cinetpay.com/v2";
    /** Champs signés, dans l'ordre de la documentation CinetPay (HMAC du « x-token »). */
    static final String[] CHAMPS_TOKEN = { "cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount",
            "cpm_currency", "signature", "payment_method", "cel_phone_num", "cpm_phone_prefixe", "cpm_language",
            "cpm_version", "cpm_payment_config", "cpm_page_action", "cpm_custom", "cpm_designation",
            "cpm_error_message" };

    private final HttpPaiements http;
    private final String apiKey;
    private final String siteId;
    private final String secret;

    public CinetPayFournisseur(HttpPaiements http, String apiKey, String siteId, String secret) {
        this.http = http;
        this.apiKey = apiKey;
        this.siteId = siteId;
        this.secret = secret;
    }

    @Override
    public String code() {
        return "cinetpay";
    }

    @Override
    public List<Operateur> operateurs() {
        return Arrays.asList(Operateur.ORANGE, Operateur.MTN, Operateur.MOOV, Operateur.WAVE);
    }

    @Override
    public Creation creer(Demande d) throws IOException {
        JSONObject b = new JSONObject().put("apikey", apiKey).put("site_id", siteId)
                .put("transaction_id", d.transactionId).put("amount", d.montant).put("currency", d.devise)
                .put("description", d.description).put("notify_url", d.urlNotification).put("return_url", d.urlRetour)
                .put("channels", "MOBILE_MONEY").put("lang", "fr");
        HttpPaiements.Reponse r = http.envoyer("POST", BASE + "/payment", Map.of("Content-Type", "application/json"),
                b.toString());
        JSONObject o = new JSONObject(r.corps == null || r.corps.isBlank() ? "{}" : r.corps);
        JSONObject data = o.optJSONObject("data");
        if (r.statut / 100 != 2 || data == null || data.optString("payment_url").isEmpty()) {
            throw new IOException(
                    "CinetPay a refusé la création (" + o.optString("code") + " " + o.optString("message") + ")");
        }
        return new Creation(data.optString("payment_token", d.transactionId), data.getString("payment_url"));
    }

    /** Champs d'un corps « application/x-www-form-urlencoded ». */
    static Map<String, String> formulaire(String corps) {
        Map<String, String> m = new HashMap<>();
        if (corps == null) {
            return m;
        }
        for (String p : corps.split("&")) {
            int i = p.indexOf('=');
            String k = URLDecoder.decode(i < 0 ? p : p.substring(0, i), StandardCharsets.UTF_8);
            String v = i < 0 ? "" : URLDecoder.decode(p.substring(i + 1), StandardCharsets.UTF_8);
            m.put(k, v);
        }
        return m;
    }

    static String donneesToken(Map<String, String> f) {
        StringBuilder sb = new StringBuilder();
        for (String c : CHAMPS_TOKEN) {
            sb.append(f.getOrDefault(c, ""));
        }
        return sb.toString();
    }

    @Override
    public String lireNotification(String corpsBrut, Function<String, String> entete) {
        Map<String, String> f = formulaire(corpsBrut);
        if (!siteId.equals(f.get("cpm_site_id"))) {
            return null;
        }
        if (!Signatures.valide(secret, donneesToken(f), entete.apply("x-token"))) {
            return null;
        }
        String id = f.getOrDefault("cpm_trans_id", "");
        return id.isEmpty() ? null : id;
    }

    @Override
    public Etat verifier(String transactionId, String refFournisseur) throws IOException {
        JSONObject b = new JSONObject().put("apikey", apiKey).put("site_id", siteId).put("transaction_id",
                transactionId);
        HttpPaiements.Reponse r = http.envoyer("POST", BASE + "/payment/check",
                Map.of("Content-Type", "application/json"), b.toString());
        JSONObject o = new JSONObject(r.corps == null || r.corps.isBlank() ? "{}" : r.corps);
        JSONObject data = o.optJSONObject("data");
        if (data == null) {
            return new Etat(Resultat.EN_ATTENTE, null, null, null, o.optString("message"));
        }
        String s = data.optString("status", "");
        Integer montant = data.has("amount") ? (int) Math.round(Double.parseDouble(String.valueOf(data.get("amount"))))
                : null;
        Resultat res = "ACCEPTED".equals(s) ? Resultat.PAYE
                : ("REFUSED".equals(s) || "CANCELED".equals(s) || "CANCELLED".equals(s)) ? Resultat.ECHOUE
                        : Resultat.EN_ATTENTE;
        return new Etat(res, montant, data.optString("currency", null), data.optString("operator_id", null), s);
    }
}
