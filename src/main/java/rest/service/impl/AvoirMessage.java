package rest.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;

/**
 * Plan du 21/11, point 11 : message « vos produits en avoir sont disponibles ».
 *
 * <ul>
 * <li>canal : parametre {@code KEY_SMS_AVOIR_CANAL} (SMS par defaut, WHATSAPP, SMS_WHATSAPP = WhatsApp puis SMS si
 * WhatsApp refuse) ;</li>
 * <li>ventes du message : table {@code notification_vente} (un message peut couvrir plusieurs ventes d'un client),
 * copiee sur la notification de repli SMS ;</li>
 * <li>etat du message de chaque vente pour la liste des avoirs : celui du dernier envoi (le repli SMS passe apres
 * WhatsApp), avec le canal, la date et le motif d'un echec. Jamais le texte du message.</li>
 * </ul>
 */
public final class AvoirMessage {

    private static final Logger LOG = Logger.getLogger(AvoirMessage.class.getName());

    public static final String CLE_CANAL = "KEY_SMS_AVOIR_CANAL";
    public static final String SMS = "SMS";
    public static final String WHATSAPP = "WHATSAPP";
    public static final String SMS_WHATSAPP = "SMS_WHATSAPP";

    public static final String EN_ATTENTE = "En attente";
    public static final String ENVOYE = "Envoyé";
    public static final String DISTRIBUE = "Distribué";
    public static final String LU = "Lu";
    public static final String ECHEC = "Échec";

    private AvoirMessage() {
    }

    /** Valeur du parametre ramenee a SMS, WHATSAPP ou SMS_WHATSAPP ; toute autre valeur (ou absence) vaut SMS. */
    public static String canal(String valeur) {
        String v = StringUtils.trimToEmpty(valeur).toUpperCase();
        return WHATSAPP.equals(v) || SMS_WHATSAPP.equals(v) ? v : SMS;
    }

    public static String canal(EntityManager em) {
        try {
            List<?> l = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                    .setParameter(1, CLE_CANAL).getResultList();
            return canal(l.isEmpty() ? null : (String) l.get(0));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Canal des messages d'avoir illisible : SMS", e);
            return SMS;
        }
    }

    /** Rattache le message a ses ventes. */
    public static void lier(EntityManager em, String notificationId, Collection<String> venteIds) {
        for (String v : venteIds) {
            em.createNativeQuery("INSERT IGNORE INTO notification_vente (notification_id, lg_PREENREGISTREMENT_ID)"
                    + " VALUES (?1, ?2)").setParameter(1, notificationId).setParameter(2, v).executeUpdate();
        }
    }

    /** Le repli SMS d'un message WhatsApp porte les memes ventes. */
    public static int copierLiens(EntityManager em, String de, String vers) {
        return em
                .createNativeQuery("INSERT IGNORE INTO notification_vente (notification_id, lg_PREENREGISTREMENT_ID)"
                        + " SELECT ?2, lg_PREENREGISTREMENT_ID FROM notification_vente WHERE notification_id = ?1")
                .setParameter(1, de).setParameter(2, vers).executeUpdate();
    }

    /** Un envoi (une notification) d'une vente, tel que lu en base. */
    public static final class Envoi {
        final String notificationId;
        final Date creeLe;
        final String notificationStatut;
        final String whatsapp;
        final Date whatsappMaj;
        final String whatsappErreur;
        final String smsStatut;
        final String livraison;
        final Date smsEnvoyeLe;
        final String smsErreurCode;
        final String smsErreur;

        public Envoi(String notificationId, Date creeLe, String notificationStatut, String whatsapp, Date whatsappMaj,
                String whatsappErreur, String smsStatut, String livraison, Date smsEnvoyeLe, String smsErreurCode,
                String smsErreur) {
            this.notificationId = notificationId;
            this.creeLe = creeLe;
            this.notificationStatut = notificationStatut;
            this.whatsapp = whatsapp;
            this.whatsappMaj = whatsappMaj;
            this.whatsappErreur = whatsappErreur;
            this.smsStatut = smsStatut;
            this.livraison = livraison;
            this.smsEnvoyeLe = smsEnvoyeLe;
            this.smsErreurCode = smsErreurCode;
            this.smsErreur = smsErreur;
        }

        boolean parWhatsApp() {
            return whatsapp != null;
        }
    }

    /** Etat affiche d'une vente : etat, canal (SMS / WhatsApp), date, motif d'echec. */
    public static final class Etat {
        public final String etat;
        public final String canal;
        public final Date date;
        public final String motif;

        Etat(String etat, String canal, Date date, String motif) {
            this.etat = etat;
            this.canal = canal;
            this.date = date;
            this.motif = motif;
        }
    }

    /** Etat d'un envoi. */
    static String etat(Envoi e) {
        if (e.parWhatsApp()) {
            switch (e.whatsapp) {
            case "ECHEC":
                return ECHEC;
            case "LU":
                return LU;
            case "DELIVRE":
                return DISTRIBUE;
            case "ENVOYE":
            case "SIMULE":
                return ENVOYE;
            default:
                return EN_ATTENTE;
            }
        }
        if ("DELIVERED_TO_TERMINAL".equals(e.livraison)) {
            return DISTRIBUE;
        }
        if ("DELIVERY_IMPOSSIBLE".equals(e.livraison)) {
            return ECHEC;
        }
        if ("SENT".equals(e.smsStatut)) {
            return ENVOYE;
        }
        if ("LOCK".equals(e.notificationStatut) || StringUtils.isNotBlank(e.smsErreurCode)) {
            return ECHEC;
        }
        return EN_ATTENTE;
    }

    /**
     * Etat du message d'une vente : celui de son dernier envoi. A date egale, le SMS (repli) passe apres WhatsApp. Null
     * si la vente n'a aucun message rattache.
     */
    static Etat etat(List<Envoi> envois) {
        Envoi dernier = null;
        for (Envoi e : envois) {
            if (dernier == null || apres(e, dernier)) {
                dernier = e;
            }
        }
        if (dernier == null) {
            return null;
        }
        String etat = etat(dernier);
        Date date = dernier.parWhatsApp() ? (dernier.whatsappMaj != null ? dernier.whatsappMaj : dernier.creeLe)
                : (dernier.smsEnvoyeLe != null ? dernier.smsEnvoyeLe : dernier.creeLe);
        String motif = ECHEC.equals(etat)
                ? StringUtils.defaultIfBlank(dernier.parWhatsApp() ? dernier.whatsappErreur : dernier.smsErreur,
                        dernier.parWhatsApp() ? "Refusé par WhatsApp" : "Refusé par le fournisseur SMS")
                : null;
        return new Etat(etat, dernier.parWhatsApp() ? "WhatsApp" : "SMS", date, motif);
    }

    private static boolean apres(Envoi a, Envoi b) {
        int c = compare(a.creeLe, b.creeLe);
        if (c != 0) {
            return c > 0;
        }
        if (a.parWhatsApp() != b.parWhatsApp()) {
            return !a.parWhatsApp();
        }
        return StringUtils.defaultString(a.notificationId).compareTo(StringUtils.defaultString(b.notificationId)) > 0;
    }

    private static int compare(Date a, Date b) {
        if (a == null || b == null) {
            return a == null ? (b == null ? 0 : -1) : 1;
        }
        return a.compareTo(b);
    }

    /** Etat du message de chaque vente de la page, en une requete ; une vente sans message est absente. */
    @SuppressWarnings("unchecked")
    public static Map<String, Etat> etats(EntityManager em, List<String> venteIds) {
        Map<String, Etat> etats = new HashMap<>();
        if (venteIds == null || venteIds.isEmpty()) {
            return etats;
        }
        try {
            /* alias distincts : Hibernate refuse deux colonnes de meme nom (statut) dans une requete native */
            List<Object[]> l = em.createNativeQuery("SELECT nv.lg_PREENREGISTREMENT_ID AS vente, n.id AS notif,"
                    + " n.created_at AS cree, n.statut AS n_statut, w.statut AS w_statut, w.updated_at AS w_maj,"
                    + " w.erreur AS w_erreur, nc.statut AS nc_statut, nc.delivery_status AS nc_livraison,"
                    + " nc.sent_at AS nc_envoi, nc.error_code AS nc_code, nc.error_message AS nc_erreur"
                    + " FROM notification_vente nv JOIN notification n ON n.id = nv.notification_id"
                    + " LEFT JOIN whatsapp_message w ON w.notification_id = n.id"
                    + " LEFT JOIN notification_client nc ON nc.notification_id = n.id"
                    + " WHERE nv.lg_PREENREGISTREMENT_ID IN (?1)").setParameter(1, venteIds).getResultList();
            Map<String, List<Envoi>> parVente = new HashMap<>();
            for (Object[] r : l) {
                parVente.computeIfAbsent((String) r[0], k -> new ArrayList<>())
                        .add(new Envoi((String) r[1], (Date) r[2], (String) r[3], (String) r[4], (Date) r[5],
                                (String) r[6], (String) r[7], (String) r[8], (Date) r[9], (String) r[10],
                                (String) r[11]));
            }
            parVente.forEach((v, envois) -> etats.put(v, etat(envois)));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Etat des messages d'avoir non lu", e);
        }
        return etats;
    }
}
