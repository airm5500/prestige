package util.sms;

import org.json.JSONObject;

/**
 * Contrat d'un fournisseur d'envoi de SMS (Orange, LeTexto...).
 *
 * Les implémentations sont construites par {@code SmsProviderFactory} à partir de la configuration en base
 * ({@link dal.SmsFournisseur}) ; elles reçoivent le numéro local tel que stocké côté client (ex. "0709133208") et se
 * chargent elles-mêmes du format attendu par leur API.
 *
 * @author koben
 */
public interface SmsProvider {

    /** Code du fournisseur (ORANGE, LETEXTO...). */
    String getCode();

    /**
     * Envoie un SMS.
     *
     * @param localNumber
     *            numéro local du destinataire (ex. "0709133208")
     * @param message
     *            contenu du SMS
     * @param customData
     *            donnée de corrélation propre à Prestige (id du destinataire de notification), ignorée par les
     *            fournisseurs qui ne la supportent pas
     */
    SmsSendResult send(String localNumber, String message, String customData);

    /** Solde SMS du compte, au format {@code {success, totalUnits?, msg?}} prêt à afficher. */
    JSONObject balance();

    /** Vrai si le fournisseur permet d'interroger le statut d'un message envoyé (mode POLLING). */
    boolean supportsMessageStatus();

    /** Statut d'un message envoyé, à partir de son identifiant de suivi. */
    SmsStatusResult messageStatus(String messageId);

}
