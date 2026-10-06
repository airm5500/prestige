package util.whatsapp;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Corps des requetes de la WhatsApp Cloud API (Meta) : POST
 * {@code https://graph.facebook.com/{version}/{phone_number_id}/messages} avec {@code Authorization: Bearer <jeton>}.
 * Hors de la fenetre de 24 h ouverte par le client, Meta n'accepte qu'un MODELE APPROUVE : le message de l'officine en
 * est alors l'unique variable ({{1}}).
 */
public final class WhatsAppCloudApi {

    public static final String HOTE = "https://graph.facebook.com";
    public static final String VERSION_DEFAUT = "v21.0";

    private WhatsAppCloudApi() {
    }

    public static String url(String version, String phoneNumberId) {
        return HOTE + "/" + StringUtils.defaultIfBlank(StringUtils.trimToNull(version), VERSION_DEFAUT) + "/"
                + StringUtils.trimToEmpty(phoneNumberId) + "/messages";
    }

    /** Texte libre (dans la fenetre de 24 h) ou modele approuve si {@code modele} est renseigne. */
    public static JSONObject corps(String numeroInternational, String texte, String modele, String langue) {
        JSONObject o = new JSONObject().put("messaging_product", "whatsapp").put("recipient_type", "individual")
                .put("to", numeroInternational);
        if (StringUtils.isBlank(modele)) {
            return o.put("type", "text").put("text", new JSONObject().put("preview_url", false).put("body", texte));
        }
        JSONObject parametre = new JSONObject().put("type", "text").put("text", texte);
        JSONObject composant = new JSONObject().put("type", "body").put("parameters", new JSONArray().put(parametre));
        return o.put("type", "template").put("template",
                new JSONObject().put("name", modele.trim())
                        .put("language", new JSONObject().put("code", StringUtils.defaultIfBlank(langue, "fr")))
                        .put("components", new JSONArray().put(composant)));
    }

    /** Identifiant du message (wamid) d'une reponse acceptee, sinon null. */
    public static String identifiant(JSONObject reponse) {
        JSONArray m = reponse == null ? null : reponse.optJSONArray("messages");
        return m != null && m.length() > 0 ? StringUtils.trimToNull(m.getJSONObject(0).optString("id")) : null;
    }

    /** « code message » d'une reponse en erreur (sans les donnees du destinataire). */
    public static String erreur(JSONObject reponse) {
        JSONObject e = reponse == null ? null : reponse.optJSONObject("error");
        if (e == null) {
            return "réponse inattendue";
        }
        return StringUtils.left((e.optInt("code") + " " + e.optString("message")).trim(), 250);
    }
}
