package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SmsService;
import rest.service.WhatsAppService;

/**
 * Retours du 22/11 (lot 10, point 3) : envoi des messages « vos produits en avoir sont disponibles » d'un bon de
 * livraison, depuis la fenetre des produits en avoir qui suit l'entree en stock.
 *
 * <ul>
 * <li>envoi MANUEL : l'utilisateur choisit SMS ou WhatsApp ; l'envoi est trace (utilisateur, canal, date) ;</li>
 * <li>envoi AUTO : a la fermeture de la fenetre, les messages pas encore envoyes partent par le canal du parametre
 * KEY_SMS_AVOIR_CANAL (SMS, WHATSAPP, ou SMS_WHATSAPP = WhatsApp puis SMS en cas de refus) ;</li>
 * <li>un message n'est decide qu'une fois (cle primaire de avoir_envoi) : envoye a la main, il ne repart pas a la
 * fermeture ; un message deja parti autrement (passage planifie, WhatsApp) n'est pas renvoye.</li>
 * </ul>
 * Jamais le texte du message dans les reponses ni dans le journal.
 */
@Stateless
public class AvoirsEnvoiService {

    private static final Logger LOG = Logger.getLogger(AvoirsEnvoiService.class.getName());

    public static final String MANUEL = "MANUEL";
    public static final String AUTO = "AUTO";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SmsService smsService;
    @EJB
    private WhatsAppService whatsAppService;

    /** Messages d'avoir du bon : id, deja parti (SMS envoye ou confie a WhatsApp), envoi decide (canal, mode, qui). */
    private List<Object[]> messages(String bonId) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT n.id,"
                + " (n.statut <> 'NOT_SEND' OR EXISTS (SELECT 1 FROM whatsapp_message w WHERE w.notification_id = n.id)) AS parti,"
                + " e.canal, e.mode, TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))) AS qui,"
                + " DATE_FORMAT(e.created_at, '%d/%m/%Y %H:%i') AS quand"
                + " FROM notification n JOIN categorie_notification c ON c.id = n.type_notification"
                + " LEFT JOIN avoir_envoi e ON e.notification_id = n.id LEFT JOIN t_user u ON u.lg_USER_ID = e.utilisateur_id"
                + " WHERE n.entity_ref = ?1 AND c.name = 'AVOIR_PRODUIT' ORDER BY n.created_at, n.id")
                .setParameter(1, bonId).getResultList();
        return l;
    }

    private static boolean vrai(Object o) {
        return o != null && ((Number) o).intValue() != 0;
    }

    /** Etat de l'envoi pour la fenetre : messages, a envoyer, envois decides, canal par defaut. */
    public JSONObject etat(String bonId) {
        List<Object[]> l = messages(bonId);
        int aEnvoyer = 0;
        JSONArray envois = new JSONArray();
        for (Object[] r : l) {
            if (r[2] != null) {
                envois.put(new JSONObject().put("canal", r[2]).put("mode", r[3]).put("utilisateur", r[4]).put("date",
                        r[5]));
            } else if (!vrai(r[1])) {
                aEnvoyer++;
            }
        }
        return new JSONObject().put("success", true).put("messages", l.size()).put("aEnvoyer", aEnvoyer)
                .put("envois", envois).put("canalDefaut", AvoirMessage.canal(em)).put("canalFermeture",
                        StringUtils.defaultString(canalEffectif(false, null, parametreCanal(), smsImmediat()), ""));
    }

    /**
     * Canal de l'envoi, regle sans base. MANUEL : le canal choisi (SMS ou WHATSAPP, sinon null = refus). AUTO : le
     * canal du parametre (SMS, WHATSAPP, SMS_WHATSAPP) ; en SMS, seulement si l'envoi immediat des SMS d'avoir est
     * actif (KEY_SMS_AVOIR_IMMEDIAT, comme avant) : sinon null, le passage planifie les enverra comme avant.
     */
    static String canalEffectif(boolean manuel, String choisi, String parametre, boolean smsImmediat) {
        if (manuel) {
            String c = StringUtils.trimToEmpty(choisi).toUpperCase();
            return AvoirMessage.SMS.equals(c) || AvoirMessage.WHATSAPP.equals(c) ? c : null;
        }
        String c = AvoirMessage.canal(parametre);
        return AvoirMessage.SMS.equals(c) && !smsImmediat ? null : c;
    }

    /** Messages a envoyer, regle sans base : ni deja partis, ni deja decides (a la main ou a la fermeture). */
    static boolean aEnvoyer(boolean parti, boolean decide) {
        return !parti && !decide;
    }

    private boolean smsImmediat() {
        List<?> l = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT'")
                .getResultList();
        return !l.isEmpty() && l.get(0) != null && "1".equals(String.valueOf(l.get(0)).trim());
    }

    private String parametreCanal() {
        List<?> l = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, AvoirMessage.CLE_CANAL).getResultList();
        return l.isEmpty() ? null : (String) l.get(0);
    }

    /**
     * Envoie les messages d'avoir du bon pas encore partis ni decides. canal : SMS ou WHATSAPP (MANUEL), ou vide (AUTO,
     * canal du parametre).
     */
    public JSONObject envoyer(String bonId, String canal, String mode, String utilisateurId) {
        boolean manuel = MANUEL.equals(mode);
        String effectif = canalEffectif(manuel, canal, manuel ? null : parametreCanal(), !manuel && smsImmediat());
        if (effectif == null) {
            return manuel ? new JSONObject().put("success", false).put("message", "Choisissez SMS ou WhatsApp.")
                    : new JSONObject().put("success", true).put("envoyes", 0).put("deja", 0)
                            .put("canal", AvoirMessage.SMS).put("mode", AUTO).put("planifie", true);
        }
        List<String> liste = new ArrayList<>();
        int deja = 0;
        for (Object[] r : messages(bonId)) {
            if (!aEnvoyer(vrai(r[1]), r[2] != null)) {
                deja++;
                continue;
            }
            int n = em
                    .createNativeQuery("INSERT IGNORE INTO avoir_envoi (notification_id, bon_id, canal, mode,"
                            + " utilisateur_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, NOW())")
                    .setParameter(1, r[0]).setParameter(2, bonId).setParameter(3, effectif)
                    .setParameter(4, manuel ? MANUEL : AUTO).setParameter(5, utilisateurId).executeUpdate();
            if (n == 1) {
                liste.add((String) r[0]);
            } else {
                deja++;
            }
        }
        em.flush();
        for (String id : liste) {
            try {
                if (AvoirMessage.SMS.equals(effectif)) {
                    smsService.sendSMSByNotificationIdAsync(id);
                } else {
                    whatsAppService.envoyerNotificationAsync(id, AvoirMessage.SMS_WHATSAPP.equals(effectif));
                }
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "Envoi du message d'avoir " + id, e);
            }
        }
        return new JSONObject().put("success", true).put("envoyes", liste.size()).put("deja", deja)
                .put("canal", effectif).put("mode", manuel ? MANUEL : AUTO);
    }
}
