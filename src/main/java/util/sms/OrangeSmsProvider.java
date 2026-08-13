package util.sms;

import dal.SmsFournisseur;
import java.util.function.Supplier;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import util.AppParameters;
import util.OrangeSmsClient;
import util.OrangeSmsResult;

/**
 * Fournisseur SMS Orange : encapsule l'appel {@link OrangeSmsClient} avec la configuration lue en base
 * (sms_fournisseur_param), en repli sur dicisms.properties ({@link AppParameters}) pour les officines dont la
 * configuration n'a pas encore été reprise.
 *
 * Le token OAuth2 est fourni par {@code SmsImpl} (cycle de vie SmsToken inchangé) via {@code tokenSupplier}. Le solde
 * Orange reste servi par {@code SmsAdminService} (API admin dédiée), pas par ce provider.
 *
 * @author koben
 */
public class OrangeSmsProvider implements SmsProvider {

    private final SmsFournisseur config;
    private final Supplier<String> tokenSupplier;
    private final AppParameters sp;

    public OrangeSmsProvider(SmsFournisseur config, Supplier<String> tokenSupplier, AppParameters sp) {
        this.config = config;
        this.tokenSupplier = tokenSupplier;
        this.sp = sp;
    }

    @Override
    public String getCode() {
        return SmsProviderCatalog.CODE_ORANGE;
    }

    private String param(String cle, String fallback) {
        String valeur = config != null ? config.getParamValue(cle) : null;
        return StringUtils.isNotBlank(valeur) ? valeur.trim() : fallback;
    }

    @Override
    public SmsSendResult send(String localNumber, String message, String customData) {
        String bearer = tokenSupplier.get();
        if (StringUtils.isBlank(bearer)) {
            return SmsSendResult.rejected(0, "NO_TOKEN", "Impossible de charger l'acces token Orange");
        }
        String sendUrl = param(SmsProviderCatalog.ORANGE_SEND_URL, sp.pathsmsapisendmessageurl);
        String senderAddress = param(SmsProviderCatalog.ORANGE_SENDER_ADDRESS, sp.senderAddress);
        String address = "tel:+225" + StringUtils.trimToEmpty(localNumber);
        OrangeSmsResult result = OrangeSmsClient.send(sendUrl, bearer, senderAddress, address, message);
        if (result.isAccepted()) {
            return SmsSendResult.accepted(result.getResourceUrl(), result.getHttpStatus());
        }
        return SmsSendResult.rejected(result.getHttpStatus(), result.getErrorCode(), result.getErrorMessage());
    }

    @Override
    public JSONObject balance() {
        return new JSONObject().put("success", false).put("msg",
                "Le solde Orange est consulté via l'API d'administration (écran Notifications).");
    }

    @Override
    public boolean supportsMessageStatus() {
        return false;
    }

    @Override
    public SmsStatusResult messageStatus(String messageId) {
        return SmsStatusResult
                .notFound("Orange ne propose pas d'interrogation de statut : suivi par Delivery Receipt.");
    }

}
