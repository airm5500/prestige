package util.whatsapp;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/** Un compte WhatsApp (mode API ou WEB) tel qu'il est stocke. Les secrets ne sortent jamais par {@link #publique()}. */
public class WhatsAppCompte {

    public static final String API = "API";
    public static final String WEB = "WEB";

    public String mode;
    public boolean actif;
    public boolean modeTest = true;
    public String apiVersion;
    public String phoneNumberId;
    public String wabaId;
    public String accessToken;
    public String verifyToken;
    public String appSecret;
    public String modeleNom;
    public String modeleLangue;
    public String webUrl;
    public String webJeton;

    /** Ce que l'ecran peut afficher : les secrets sont remplaces par « défini / non défini ». */
    public JSONObject publique() {
        return new JSONObject().put("mode", mode).put("actif", actif).put("modeTest", modeTest)
                .put("apiVersion", StringUtils.defaultString(apiVersion))
                .put("phoneNumberId", StringUtils.defaultString(phoneNumberId))
                .put("wabaId", StringUtils.defaultString(wabaId)).put("modeleNom", StringUtils.defaultString(modeleNom))
                .put("modeleLangue", StringUtils.defaultString(modeleLangue))
                .put("webUrl", StringUtils.defaultString(webUrl))
                .put("accessTokenDefini", StringUtils.isNotBlank(accessToken))
                .put("verifyTokenDefini", StringUtils.isNotBlank(verifyToken))
                .put("appSecretDefini", StringUtils.isNotBlank(appSecret))
                .put("webJetonDefini", StringUtils.isNotBlank(webJeton)).put("pret", pret());
    }

    /** Assez configure pour un envoi reel (le mode test, lui, n'a besoin de rien). */
    public boolean pret() {
        if (API.equals(mode)) {
            return StringUtils.isNoneBlank(phoneNumberId, accessToken);
        }
        return StringUtils.isNoneBlank(webUrl, webJeton);
    }
}
