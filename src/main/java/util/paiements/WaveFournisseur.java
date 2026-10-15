package util.paiements;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.json.JSONObject;

/**
 * B3 : adaptateur Wave Business (API Checkout), Wave seulement.
 * <p>
 * <b>À VALIDER AVEC LA DOCUMENTATION DU COMPTE MARCHAND</b> — écrit d'après la documentation publique Wave connue :
 * <ul>
 * <li>création : {@code POST https://api.wave.com/v1/checkout/sessions}, {@code Authorization: Bearer <clé API>}, JSON
 * amount (texte), currency XOF, success_url, error_url, client_reference → id (cos-…), wave_launch_url ;</li>
 * <li>webhook : en-tête {@code Wave-Signature: t=<horodatage>,v1=<hex>} = HMAC-SHA256(horodatage + corps brut) avec le
 * secret du webhook ; événement checkout.session.completed (data.client_reference = notre transaction) ;</li>
 * <li>vérification : {@code GET https://api.wave.com/v1/checkout/sessions/{id}} → checkout_status, payment_status
 * (succeeded), amount, currency.</li>
 * </ul>
 * Les notifications de plus de 5 minutes sont refusées (rejeu).
 */
public final class WaveFournisseur implements FournisseurPaiement {

    static final String BASE = "https://api.wave.com/v1";
    static final long FENETRE_SECONDES = 300;

    private final HttpPaiements http;
    private final String apiKey;
    private final String webhookSecret;
    /** Horloge (tests). */
    java.util.function.LongSupplier maintenant = () -> System.currentTimeMillis() / 1000;

    public WaveFournisseur(HttpPaiements http, String apiKey, String webhookSecret) {
        this.http = http;
        this.apiKey = apiKey;
        this.webhookSecret = webhookSecret;
    }

    @Override
    public String code() {
        return "wave";
    }

    @Override
    public List<Operateur> operateurs() {
        return Collections.singletonList(Operateur.WAVE);
    }

    private Map<String, String> entetes() {
        return Map.of("Authorization", "Bearer " + apiKey, "Content-Type", "application/json");
    }

    @Override
    public Creation creer(Demande d) throws IOException {
        JSONObject b = new JSONObject().put("amount", String.valueOf(d.montant)).put("currency", d.devise)
                .put("success_url", d.urlRetour).put("error_url", d.urlRetour).put("client_reference", d.transactionId);
        HttpPaiements.Reponse r = http.envoyer("POST", BASE + "/checkout/sessions", entetes(), b.toString());
        JSONObject o = new JSONObject(r.corps == null || r.corps.isBlank() ? "{}" : r.corps);
        if (r.statut / 100 != 2 || o.optString("wave_launch_url").isEmpty()) {
            throw new IOException("Wave a refusé la création (" + r.statut + " " + o.optString("message") + ")");
        }
        return new Creation(o.getString("id"), o.getString("wave_launch_url"));
    }

    @Override
    public String lireNotification(String corpsBrut, Function<String, String> entete) {
        String sig = entete.apply("Wave-Signature");
        if (sig == null || corpsBrut == null) {
            return null;
        }
        String t = null;
        String v1 = null;
        for (String part : sig.split(",")) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length == 2 && "t".equals(kv[0])) {
                t = kv[1];
            } else if (kv.length == 2 && "v1".equals(kv[0])) {
                v1 = kv[1];
            }
        }
        if (t == null || v1 == null || !Signatures.valide(webhookSecret, t + corpsBrut, v1)) {
            return null;
        }
        try {
            if (Math.abs(maintenant.getAsLong() - Long.parseLong(t)) > FENETRE_SECONDES) {
                return null;
            }
            JSONObject data = new JSONObject(corpsBrut).optJSONObject("data");
            String ref = data == null ? "" : data.optString("client_reference", "");
            return ref.isEmpty() ? null : ref;
        } catch (RuntimeException e) {
            return null;
        }
    }

    @Override
    public Etat verifier(String transactionId, String refFournisseur) throws IOException {
        if (refFournisseur == null || refFournisseur.isBlank()) {
            return new Etat(Resultat.EN_ATTENTE, null, null, null, "Session Wave inconnue");
        }
        HttpPaiements.Reponse r = http.envoyer("GET", BASE + "/checkout/sessions/" + refFournisseur, entetes(), null);
        JSONObject o = new JSONObject(r.corps == null || r.corps.isBlank() ? "{}" : r.corps);
        if (r.statut / 100 != 2) {
            return new Etat(Resultat.EN_ATTENTE, null, null, null, "Wave : code " + r.statut);
        }
        if (!transactionId.equals(o.optString("client_reference"))) {
            return new Etat(Resultat.EN_ATTENTE, null, null, null, "Session Wave d'une autre transaction");
        }
        String ps = o.optString("payment_status", "");
        String cs = o.optString("checkout_status", "");
        Integer montant = o.has("amount") ? (int) Math.round(Double.parseDouble(o.optString("amount", "0"))) : null;
        Resultat res = "succeeded".equals(ps) ? Resultat.PAYE
                : ("cancelled".equals(ps) || "expired".equals(cs)) ? Resultat.ECHOUE : Resultat.EN_ATTENTE;
        return new Etat(res, montant, o.optString("currency", null), o.optString("transaction_id", null), ps);
    }
}
