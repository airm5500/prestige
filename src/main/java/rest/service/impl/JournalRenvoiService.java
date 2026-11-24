package rest.service.impl;

import dal.Notification;
import dal.NotificationClient;
import dal.TClient;
import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.SmsService;
import rest.service.WhatsAppService;

/**
 * Retours du 22/11 (lot 10, point 1) : renvoi d'un message en echec depuis le journal des messages, par SMS ou par
 * WhatsApp au choix.
 *
 * <ul>
 * <li>seules les lignes d'un client (WhatsApp « W… » ou SMS « S… ») en echec se renvoient ; les SMS au numero
 * d'administration non ;</li>
 * <li>le renvoi est un nouveau message (nouvelle notification, meme texte, meme categorie, meme reference) pour ce seul
 * client, au nom de l'utilisateur qui renvoie : il apparait dans le journal comme une nouvelle ligne, avec cet
 * utilisateur ; la ligne en echec reste telle quelle ;</li>
 * <li>un message d'avoir renvoye garde ses ventes (etat du message dans la liste des avoirs) ;</li>
 * <li>jamais le texte du message dans la reponse ni dans le journal du serveur.</li>
 * </ul>
 */
@Stateless
public class JournalRenvoiService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SmsService smsService;
    @EJB
    private WhatsAppService whatsAppService;
    @EJB
    private SmsProviderFactory smsProviderFactory;

    private static JSONObject refus(String m) {
        return new JSONObject().put("success", false).put("msg", m);
    }

    /** Regle sans base : seule une ligne d'un client (W : WhatsApp, S : SMS) en echec se renvoie. */
    static boolean renvoyable(String ligneId, String etat) {
        String id = StringUtils.trimToEmpty(ligneId);
        return id.length() > 1 && (id.charAt(0) == 'W' || id.charAt(0) == 'S') && AvoirMessage.ECHEC.equals(etat);
    }

    /** Notification et client de la ligne, si elle est en echec ; sinon null. */
    @SuppressWarnings("unchecked")
    private Object[] source(String ligneId) {
        String id = StringUtils.trimToEmpty(ligneId);
        if (id.length() < 2) {
            return null;
        }
        List<Object[]> r;
        if (id.charAt(0) == 'W') {
            r = em.createNativeQuery(
                    "SELECT w.notification_id, w.client_id, w.statut FROM whatsapp_message w WHERE w.id = ?1")
                    .setParameter(1, id.substring(1)).getResultList();
            if (r.isEmpty() || r.get(0)[0] == null || r.get(0)[1] == null
                    || !renvoyable(id, JournalMessages.etatWhatsApp((String) r.get(0)[2]))) {
                return null;
            }
        } else if (id.charAt(0) == 'S') {
            r = em.createNativeQuery("SELECT nc.notification_id, nc.client_id, n.statut, nc.statut AS nc_statut,"
                    + " nc.delivery_status, nc.error_code FROM notification_client nc"
                    + " JOIN notification n ON n.id = nc.notification_id WHERE nc.id = ?1")
                    .setParameter(1, id.substring(1)).getResultList();
            if (r.isEmpty() || r.get(0)[1] == null || !renvoyable(id, JournalMessages.etatSms((String) r.get(0)[2],
                    (String) r.get(0)[3], (String) r.get(0)[4], (String) r.get(0)[5]))) {
                return null;
            }
        } else {
            return null;
        }
        return r.get(0);
    }

    /**
     * Renvoie le message de la ligne par le canal choisi (SMS ou WHATSAPP), au nom de l'utilisateur. Reponse : success,
     * canal, notificationId du nouveau message, msg (sans le texte du message).
     */
    public JSONObject renvoyer(String ligneId, String canal, TUser utilisateur) {
        String c = StringUtils.trimToEmpty(canal).toUpperCase();
        if (!JournalMessages.SMS.equals(c) && !JournalMessages.WHATSAPP.equals(c)) {
            return refus("Choisissez SMS ou WhatsApp.");
        }
        /*
         * sans fournisseur SMS en vigueur, l'envoi leverait une erreur et annulerait tout : refus clair, rien d'ecrit
         */
        if (JournalMessages.SMS.equals(c) && smsProviderFactory.current() == null) {
            return refus("Aucun fournisseur SMS en vigueur : rien n'a été renvoyé.");
        }
        Object[] s = source(ligneId);
        if (s == null) {
            return refus("Seul un message en échec envoyé à un client peut être renvoyé.");
        }
        Notification n = em.find(Notification.class, (String) s[0]);
        TClient client = em.find(TClient.class, (String) s[1]);
        if (n == null) {
            return refus("Message introuvable.");
        }
        if (client == null) {
            return refus("Client introuvable.");
        }
        Notification copie = new Notification();
        copie.setCategorieNotification(n.getCategorieNotification());
        copie.setMessage(n.getMessage());
        copie.setUser(utilisateur);
        copie.entityRef(n.getEntityRef());
        copie.getNotificationClients().add(new NotificationClient(client, copie));
        em.persist(copie);
        em.flush();
        AvoirMessage.copierLiens(em, n.getId(), copie.getId());
        JSONObject r = new JSONObject().put("canal", c).put("notificationId", copie.getId());
        if (JournalMessages.SMS.equals(c)) {
            JSONObject e = smsService.resendSMSById(copie.getId());
            return r.put("success", e.optBoolean("success")).put("msg", e.optString("userMessage", ""));
        }
        JSONObject e = whatsAppService.envoyerNotification(copie.getId(), false);
        boolean ok = e.optBoolean("success") && e.optInt("envoyes") > 0;
        return r.put("success", ok).put("msg", ok ? "Message WhatsApp envoyé." : StringUtils
                .defaultIfBlank(e.optString("msg", null), "WhatsApp a refusé le message (voir le journal)."));
    }
}
