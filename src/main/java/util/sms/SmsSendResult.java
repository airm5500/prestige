package util.sms;

/**
 * Résultat normalisé d'un envoi de SMS, quel que soit le fournisseur.
 *
 * {@code messageId} est l'identifiant de suivi retourné par le fournisseur (resourceURL Orange, id de message LeTexto)
 * ; il est stocké sur le destinataire pour la corrélation des accusés de réception.
 *
 * @author koben
 */
public final class SmsSendResult {

    private final boolean accepted;
    private final String messageId;
    private final int httpStatus;
    private final String errorCode;
    private final String errorMessage;

    private SmsSendResult(boolean accepted, String messageId, int httpStatus, String errorCode, String errorMessage) {
        this.accepted = accepted;
        this.messageId = messageId;
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }

    public static SmsSendResult accepted(String messageId, int httpStatus) {
        return new SmsSendResult(true, messageId, httpStatus, null, null);
    }

    public static SmsSendResult rejected(int httpStatus, String errorCode, String errorMessage) {
        return new SmsSendResult(false, null, httpStatus, errorCode, errorMessage);
    }

    public boolean isAccepted() {
        return accepted;
    }

    public String getMessageId() {
        return messageId;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    /** Résumé compact pour les logs. */
    public String toLog() {
        if (accepted) {
            return "http=" + httpStatus + ", accepte, messageId=" + messageId;
        }
        return "http=" + httpStatus + ", refuse, code=" + errorCode + ", message=" + errorMessage;
    }

}
