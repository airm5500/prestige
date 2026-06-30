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

    /**
     * Résumé du solde SMS, prêt à afficher :
     * {@code {success, totalUnits, found, items:[{units, country, service, expiration}]}}.
     */
    JSONObject getBalanceSummary();

    /** Statistiques d'utilisation SMS. */
    JSONObject getStatistics();

    /** Historique des achats / bons de commande SMS. */
    JSONObject getPurchaseOrders();

    /** Crée une souscription aux Delivery Receipts (nécessite l'URL de callback). */
    JSONObject createDeliveryReceiptSubscription();

    /**
     * URL de callback DR et configuration de protection :
     * {@code {url, source, secret, protected}}.
     */
    JSONObject getCallbackUrlInfo();

    /**
     * Enregistre l'URL et/ou le jeton secret du callback DR dans les paramètres.
     * Un argument {@code null} laisse le paramètre correspondant inchangé.
     */
    JSONObject saveCallbackConfig(String url, String secret);

    /**
     * Vérifie le jeton fourni par l'appelant du callback. Retourne true si aucun
     * secret n'est configuré (protection désactivée) ou si le jeton correspond.
     */
    boolean isCallbackKeyValid(String providedKey);

    /** Liste les souscriptions DR existantes. */
    JSONObject getDeliveryReceiptSubscriptions();

    /** Supprime une souscription DR. */
    JSONObject deleteDeliveryReceiptSubscription(String subscriptionId);

}
