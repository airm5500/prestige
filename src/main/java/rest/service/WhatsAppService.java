package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * WhatsApp, nouveau canal a cote du SMS (plan d'octobre, section 4.2, lot L10) : comptes (API officielle / WhatsApp
 * Web), envoi des notifications, repli SMS, statuts et desinscription par webhook, journal.
 */
@Local
public interface WhatsAppService {

    String MODE_DEFAUT = "KEY_WHATSAPP_MODE_DEFAUT";

    /** Les deux comptes, sans aucun secret, et le mode par defaut. */
    JSONObject comptes();

    /**
     * Enregistre un compte. Un secret laisse vide garde sa valeur ; {@code effacer} (tableau) vide ceux qui y sont
     * nommes. {@code defaut} = true fait de ce mode le mode par defaut.
     */
    JSONObject enregistrer(String mode, JSONObject saisie, TUser operateur);

    /** Message d'essai, par le mode par defaut (simule si le compte est en mode test). */
    JSONObject tester(String numero, String texte, TUser operateur);

    /**
     * Avis clients : envoie un texte a un numero qui n'est pas forcement un client de la base (reponse a un avis).
     * Resultat : success, simule, statut (ENVOYE, SIMULE, ECHEC), message. Le texte n'est jamais journalise.
     */
    JSONObject envoyerTexte(String numero, String texte);

    /**
     * Envoie par WhatsApp une notification deja enregistree (un message par destinataire, consentement WhatsApp et
     * numero controles). Avec {@code repliSms}, les destinataires non servis sont repris dans une notification SMS dont
     * l'identifiant est rendu ({@code repliNotificationId}) pour etre envoyee apres validation.
     */
    JSONObject envoyerNotification(String notificationId, boolean repliSms);

    /** Meme envoi en tache de fond, repli SMS compris. */
    void envoyerNotificationAsync(String notificationId, boolean repliSms);

    /** Abonnement du webhook Meta : le challenge, ou null si le jeton ne correspond pas. */
    String verifierWebhook(String mode, String jeton, String challenge);

    /** Notification Meta : signature controlee, statuts mis a jour, STOP -> consentement WhatsApp retire. */
    boolean webhookMeta(String corpsBrut, String signature);

    /** Notification du service compagnon WhatsApp Web (jeton partage). */
    boolean webhookWeb(String corpsBrut, String jeton);

    /** Mode d'envoi par defaut : API (Meta) ou WEB (service WhatsApp Web). */
    String modeDefaut();

    /** Derniers envois (sans le texte des messages). */
    JSONObject journal(int limite);

    /**
     * Fils de discussion (demande du 25/10) : reponse a un client depuis l'ecran « Discussions WhatsApp », texte et/ou
     * piece jointe, par le mode par defaut (simulee si le compte est en mode test). Refusee si le client a demande
     * l'arret (STOP). Gardee dans le fil avec son statut et son auteur ; le texte n'est jamais journalise.
     */
    JSONObject repondreDiscussion(String numero, String texte, util.whatsapp.PieceJointe piece, String userId);
}
