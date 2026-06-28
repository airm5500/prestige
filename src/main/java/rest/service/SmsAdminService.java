package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Accès aux opérations d'administration de l'API SMS Orange : consultation du
 * solde / des contrats, des statistiques, des bons d'achat, et gestion des
 * souscriptions aux Delivery Receipts (DR).
 *
 * Réf : https://developer.orange.com/apis/sms-ci/api-reference
 *
 * @author koben
 */
@Local
public interface SmsAdminService {

    /** Contrats SMS (solde restant, date d'expiration des bundles). */
    JSONObject getContracts();

    /** Statistiques d'utilisation SMS. */
    JSONObject getStatistics();

    /** Historique des achats / bons de commande SMS. */
    JSONObject getPurchaseOrders();

    /** Crée une souscription aux Delivery Receipts (nécessite l'URL de callback). */
    JSONObject createDeliveryReceiptSubscription();

    /** Liste les souscriptions DR existantes. */
    JSONObject getDeliveryReceiptSubscriptions();

    /** Supprime une souscription DR. */
    JSONObject deleteDeliveryReceiptSubscription(String subscriptionId);

}
