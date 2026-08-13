/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.Notification;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
@Local
public interface SmsService {

    JSONObject findAccessToken();

    void sendSMS(Notification notification);

    void sendSMS(String content);

    /**
     * Envoi immédiat et asynchrone d'une notification SMS à partir de son identifiant (rechargée dans une transaction
     * dédiée). Utilisé pour ne plus attendre le job planifié (ex. SMS de disponibilité d'avoir).
     */
    void sendSMSByNotificationIdAsync(String notificationId);

    /**
     * Envoi synchrone d'une notification SMS par identifiant (rechargée puis envoyée à tous ses destinataires). Utilisé
     * par le job planifié.
     */
    void sendSMSById(String notificationId);

    /**
     * Renvoi manuel forcé d'une notification (même si déjà SENT), pour les tests et les corrections.
     *
     * @return un JSON {@code {success, statut, code, orangeMessage, userMessage}}. {@code success=false} et
     *         {@code statut=null} si la notification est introuvable. {@code userMessage} est un message d'action
     *         lisible.
     */
    JSONObject resendSMSById(String notificationId);

    /** Retourne un token d'accès Orange valide (rafraîchi si expiré), ou null. */
    String getValidAccessToken();

    /**
     * Traite un accusé de réception (callback DLR Orange ou LeTexto, format détecté automatiquement) et met à jour le
     * statut de livraison du destinataire concerné.
     *
     * @param rawPayload
     *            corps JSON reçu du fournisseur
     *
     * @return true si un destinataire a été mis à jour
     */
    boolean handleDeliveryReceipt(String rawPayload);

    /**
     * Rafraîchit à la demande (mode POLLING) les statuts de livraison des SMS envoyés sans statut terminal, en
     * interrogeant l'API de statut du fournisseur en vigueur. Borné (fenêtre de 3 jours, plafond d'interrogations par
     * message) pour rester léger.
     *
     * @return {@code {success, checked, updated}}
     */
    JSONObject refreshDeliveryStatuses();

}
