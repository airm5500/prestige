package util.whatsapp;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Webhook WhatsApp Cloud API (plan d'octobre, section 4.2, lot L10) : signature, statuts des messages et messages
 * entrants (desinscription « STOP »). Sans base de donnees ni reseau.
 *
 * <p>
 * Meta signe chaque notification : en-tete {@code X-Hub-Signature-256: sha256=<hex>}, HMAC-SHA256 du corps BRUT avec le
 * secret de l'application. Une notification non signee, ou mal signee, est rejetee.
 */
public final class WhatsAppWebhook {

    /** Mots de desinscription reconnus (message entrant entier, casse et accents ignores). */
    static final String[] MOTS_STOP = { "STOP", "ARRET", "ARRETER", "DESABONNER", "DESINSCRIRE", "UNSUBSCRIBE" };

    private WhatsAppWebhook() {
    }

    /** Statut d'un message envoye : sent, delivered, read, failed. */
    public static final class Statut {
        public final String messageId;
        public final String statut;
        public final String destinataire;
        public final String erreur;

        Statut(String messageId, String statut, String destinataire, String erreur) {
            this.messageId = messageId;
            this.statut = statut;
            this.destinataire = destinataire;
            this.erreur = erreur;
        }
    }

    /** Message recu d'un client : seul son numero et le fait qu'il demande l'arret sont retenus. */
    public static final class Entrant {
        public final String numero;
        public final boolean stop;

        Entrant(String numero, boolean stop) {
            this.numero = numero;
            this.stop = stop;
        }
    }

    /** Ce que contient une notification du webhook. */
    public static final class Contenu {
        public final List<Statut> statuts = new ArrayList<>();
        public final List<Entrant> entrants = new ArrayList<>();
    }

    /** Verification de l'abonnement (GET) : rend le challenge si le jeton correspond, sinon null. */
    public static String verifierAbonnement(String mode, String jetonRecu, String challenge, String jetonAttendu) {
        if (!"subscribe".equals(mode) || StringUtils.isBlank(jetonAttendu) || jetonRecu == null || challenge == null) {
            return null;
        }
        return egal(jetonAttendu.getBytes(StandardCharsets.UTF_8), jetonRecu.getBytes(StandardCharsets.UTF_8))
                ? challenge : null;
    }

    /** Signature {@code sha256=<hex>} du corps brut ; comparaison a temps constant. */
    public static boolean signatureValide(String secret, String corpsBrut, String entete) {
        if (StringUtils.isAnyBlank(secret, entete) || corpsBrut == null || !entete.startsWith("sha256=")) {
            return false;
        }
        String attendu = "sha256=" + hmacHex(secret, corpsBrut);
        return egal(attendu.getBytes(StandardCharsets.US_ASCII),
                entete.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    static String hmacHex(String secret, String corps) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = mac.doFinal(corps.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : h) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC indisponible", e);
        }
    }

    private static boolean egal(byte[] a, byte[] b) {
        return MessageDigest.isEqual(a, b);
    }

    /** Statuts et messages entrants d'une notification (format « whatsapp_business_account »). */
    public static Contenu analyser(JSONObject notification) {
        Contenu c = new Contenu();
        JSONArray entries = notification == null ? null : notification.optJSONArray("entry");
        for (int i = 0; entries != null && i < entries.length(); i++) {
            JSONArray changes = entries.getJSONObject(i).optJSONArray("changes");
            for (int j = 0; changes != null && j < changes.length(); j++) {
                JSONObject value = changes.getJSONObject(j).optJSONObject("value");
                if (value == null) {
                    continue;
                }
                JSONArray statuses = value.optJSONArray("statuses");
                for (int k = 0; statuses != null && k < statuses.length(); k++) {
                    JSONObject s = statuses.getJSONObject(k);
                    JSONArray errors = s.optJSONArray("errors");
                    String erreur = null;
                    if (errors != null && errors.length() > 0) {
                        JSONObject e = errors.getJSONObject(0);
                        erreur = StringUtils.left(e.optString("code") + " " + e.optString("title"), 250).trim();
                    }
                    c.statuts.add(
                            new Statut(s.optString("id"), s.optString("status"), s.optString("recipient_id"), erreur));
                }
                JSONArray messages = value.optJSONArray("messages");
                for (int k = 0; messages != null && k < messages.length(); k++) {
                    JSONObject m = messages.getJSONObject(k);
                    String texte = m.optJSONObject("text") == null ? "" : m.getJSONObject("text").optString("body");
                    if (m.optJSONObject("button") != null) {
                        texte = m.getJSONObject("button").optString("text", texte);
                    }
                    c.entrants.add(new Entrant(m.optString("from"), estStop(texte)));
                }
            }
        }
        return c;
    }

    /** « stop », « Arrêt », « STOP. »... : le message ENTIER est une demande d'arret. */
    public static boolean estStop(String texte) {
        if (texte == null) {
            return false;
        }
        String t = StringUtils.stripAccents(texte).trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "");
        for (String m : MOTS_STOP) {
            if (m.equals(t)) {
                return true;
            }
        }
        return false;
    }
}
