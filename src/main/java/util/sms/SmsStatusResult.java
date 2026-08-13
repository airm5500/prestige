package util.sms;

/**
 * Résultat normalisé d'une interrogation de statut de message (mode POLLING).
 *
 * {@code deliveryStatus} est exprimé dans le référentiel {@link util.SmsDeliveryStatus}.
 *
 * @author koben
 */
public final class SmsStatusResult {

    private final boolean found;
    private final String deliveryStatus;
    private final String rawStatus;
    private final String errorMessage;

    private SmsStatusResult(boolean found, String deliveryStatus, String rawStatus, String errorMessage) {
        this.found = found;
        this.deliveryStatus = deliveryStatus;
        this.rawStatus = rawStatus;
        this.errorMessage = errorMessage;
    }

    public static SmsStatusResult of(String deliveryStatus, String rawStatus) {
        return new SmsStatusResult(true, deliveryStatus, rawStatus, null);
    }

    public static SmsStatusResult notFound(String errorMessage) {
        return new SmsStatusResult(false, null, null, errorMessage);
    }

    public boolean isFound() {
        return found;
    }

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public String getRawStatus() {
        return rawStatus;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

}
