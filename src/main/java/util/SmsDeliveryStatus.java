package util;

/**
 * Statuts de livraison SMS, alignés sur les Delivery Receipts Orange.
 *
 * {@code ACCEPTED_BY_ORANGE} est notre statut local (réponse 201 à l'envoi) ;
 * les autres correspondent aux valeurs {@code deliveryStatus} renvoyées par
 * Orange dans les Delivery Receipts.
 * Réf : https://developer.orange.com/apis/sms-ci/api-reference
 *
 * @author koben
 */
public final class SmsDeliveryStatus {

    private SmsDeliveryStatus() {
    }

    /** Accepté par Orange (HTTP 201) - pas encore de confirmation terminal. */
    public static final String ACCEPTED_BY_ORANGE = "ACCEPTED_BY_ORANGE";
    /** Remis au réseau Orange. */
    public static final String DELIVERED_TO_NETWORK = "DELIVERED_TO_NETWORK";
    /** Livré sur le téléphone du destinataire (succès réel). */
    public static final String DELIVERED_TO_TERMINAL = "DELIVERED_TO_TERMINAL";
    /** Livraison impossible (numéro invalide, hors service...). */
    public static final String DELIVERY_IMPOSSIBLE = "DELIVERY_IMPOSSIBLE";
    /** Livraison incertaine. */
    public static final String DELIVERY_UNCERTAIN = "DELIVERY_UNCERTAIN";
    /** Message en attente de livraison (terminal injoignable temporairement). */
    public static final String MESSAGE_WAITING = "MESSAGE_WAITING";

    /**
     * Convertit un {@code deliveryStatus} brut Orange (ex. "DeliveredToTerminal")
     * vers notre constante normalisée.
     */
    public static String fromOrange(String orangeStatus) {
        if (orangeStatus == null) {
            return null;
        }
        switch (orangeStatus.trim()) {
            case "DeliveredToNetwork":
                return DELIVERED_TO_NETWORK;
            case "DeliveredToTerminal":
                return DELIVERED_TO_TERMINAL;
            case "DeliveryImpossible":
                return DELIVERY_IMPOSSIBLE;
            case "DeliveryUncertain":
                return DELIVERY_UNCERTAIN;
            case "MessageWaiting":
                return MESSAGE_WAITING;
            default:
                return orangeStatus.trim();
        }
    }
}
