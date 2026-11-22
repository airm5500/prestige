package rest.service.impl;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;

/**
 * Plan du 21/11, point 8.1 : journal des messages (SMS et WhatsApp). Lit trois sources sur la periode :
 * <ul>
 * <li>whatsapp_message : un message WhatsApp ;</li>
 * <li>notification_client : un SMS a un client, sauf si ce destinataire a ete servi par WhatsApp pour la meme
 * notification (la ligne n'est alors que le destinataire du message WhatsApp) ;</li>
 * <li>message_administration : un SMS au numero d'administration (ticket Z, cloture de caisse, point d'activite).</li>
 * </ul>
 * Jamais le texte des messages.
 */
@Stateless
public class JournalMessagesService {

    private static final Logger LOG = Logger.getLogger(JournalMessagesService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     * Trace d'un SMS au numero d'administration, dans sa propre transaction : un incident ici ne gene jamais l'envoi ni
     * l'operation qui l'a demande. Statut seulement.
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void tracerAdministration(String origine, String telephone, String statut, String motif, String fournisseur,
            String messageId, String utilisateurId) {
        try {
            em.createNativeQuery("INSERT INTO message_administration (id, created_at, canal, origine, telephone,"
                    + " statut, motif, fournisseur, message_id, utilisateur_id)"
                    + " VALUES (?1, NOW(), 'SMS', ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                    .setParameter(1, UUID.randomUUID().toString())
                    .setParameter(2, JournalMessages.origineAdministration(origine))
                    .setParameter(3, StringUtils.left(telephone, 30)).setParameter(4, statut)
                    .setParameter(5, StringUtils.left(motif, 255)).setParameter(6, StringUtils.left(fournisseur, 30))
                    .setParameter(7, StringUtils.left(messageId, 100)).setParameter(8, utilisateurId).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Trace du SMS d'administration non enregistree", e);
        }
    }

    /** Periode lue : du debut du premier jour a la fin du dernier, bornee a JOURS_MAX jours ; vide = aujourd'hui. */
    static LocalDate[] periode(String du, String au) {
        LocalDate fin = lire(au, LocalDate.now());
        LocalDate debut = lire(du, fin);
        if (debut.isAfter(fin)) {
            LocalDate t = debut;
            debut = fin;
            fin = t;
        }
        if (ChronoUnit.DAYS.between(debut, fin) >= JournalMessages.JOURS_MAX) {
            debut = fin.minusDays(JournalMessages.JOURS_MAX - 1L);
        }
        return new LocalDate[] { debut, fin };
    }

    private static LocalDate lire(String s, LocalDate defaut) {
        try {
            return StringUtils.isBlank(s) ? defaut : LocalDate.parse(s.trim().substring(0, 10));
        } catch (Exception e) {
            return defaut;
        }
    }

    private static String nom(Object prenom, Object nomFamille) {
        return StringUtils.trimToEmpty(
                StringUtils.defaultString((String) prenom) + " " + StringUtils.defaultString((String) nomFamille));
    }

    private static boolean vrai(Object o) {
        if (o == null) {
            return false;
        }
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        return ((Number) o).intValue() != 0;
    }

    private static String numero(Object telephone, Object adresse) {
        String t = StringUtils.trimToNull((String) telephone);
        util.TelephoneCi.Resultat r = util.TelephoneCi
                .controler(t != null ? t : StringUtils.trimToNull((String) adresse));
        if (r.isValide()) {
            return r.getLocal();
        }
        return StringUtils.defaultString(t);
    }

    /** Toutes les lignes de la periode, pour les canaux demandes (filtre canal applique a la lecture). */
    @SuppressWarnings("unchecked")
    public List<JournalMessages.Ligne> lignes(String du, String au, String canal) {
        LocalDate[] p = periode(du, au);
        Date debut = java.sql.Timestamp.valueOf(p[0].atStartOfDay());
        Date fin = java.sql.Timestamp.valueOf(p[1].plusDays(1).atStartOfDay());
        String c = StringUtils.trimToEmpty(canal).toUpperCase();
        List<JournalMessages.Ligne> l = new ArrayList<>();
        if (c.isEmpty() || JournalMessages.WHATSAPP.equals(c)) {
            List<Object[]> r = em
                    .createNativeQuery("SELECT w.id, w.created_at, w.statut, w.erreur, w.telephone,"
                            + " c.str_FIRST_NAME, c.str_LAST_NAME, w.notification_id, w.origine,"
                            + " u.str_FIRST_NAME AS u_prenom, u.str_LAST_NAME AS u_nom,"
                            + " CASE WHEN w.notification_id IS NOT NULL AND EXISTS (SELECT 1 FROM t_campagne_ligne cl"
                            + " WHERE cl.lg_NOTIFICATION_ID = w.notification_id) THEN 1 ELSE 0 END AS de_campagne"
                            + " FROM whatsapp_message w LEFT JOIN t_client c ON c.lg_CLIENT_ID = w.client_id"
                            + " LEFT JOIN t_user u ON u.lg_USER_ID = w.utilisateur_id"
                            + " WHERE w.created_at >= ?1 AND w.created_at < ?2")
                    .setParameter(1, debut).setParameter(2, fin).getResultList();
            for (Object[] x : r) {
                String origine = rest.service.impl.whatsapp.OrigineEnvoi.afficher((String) x[8], (String) x[7],
                        vrai(x[11]));
                l.add(new JournalMessages.Ligne("W" + x[0], (Date) x[1], JournalMessages.WHATSAPP, origine,
                        nom(x[5], x[6]), StringUtils.defaultString((String) x[4]),
                        JournalMessages.etatWhatsApp((String) x[2]), (String) x[3], nom(x[9], x[10])));
            }
        }
        if (c.isEmpty() || JournalMessages.SMS.equals(c)) {
            List<Object[]> r = em.createNativeQuery("SELECT nc.id, COALESCE(nc.sent_at, n.created_at) AS quand,"
                    + " n.statut AS n_statut, nc.statut AS nc_statut, nc.delivery_status, nc.error_code,"
                    + " nc.error_message, c.str_FIRST_NAME, c.str_LAST_NAME, c.str_TELEPHONE, c.str_ADRESSE,"
                    + " cat.name AS categorie, u.str_FIRST_NAME AS u_prenom, u.str_LAST_NAME AS u_nom,"
                    + " CASE WHEN EXISTS (SELECT 1 FROM t_campagne_ligne cl WHERE cl.lg_NOTIFICATION_ID = n.id)"
                    + " THEN 1 ELSE 0 END AS de_campagne"
                    + " FROM notification_client nc JOIN notification n ON n.id = nc.notification_id"
                    + " LEFT JOIN categorie_notification cat ON cat.id = n.type_notification"
                    + " LEFT JOIN t_client c ON c.lg_CLIENT_ID = nc.client_id"
                    + " LEFT JOIN t_user u ON u.lg_USER_ID = n.user_id"
                    + " WHERE n.created_at >= ?1 - INTERVAL 7 DAY AND n.created_at < ?2"
                    + " AND COALESCE(nc.sent_at, n.created_at) >= ?1 AND COALESCE(nc.sent_at, n.created_at) < ?2"
                    + " AND NOT EXISTS (SELECT 1 FROM whatsapp_message w WHERE w.notification_id = n.id"
                    + " AND w.client_id = nc.client_id)").setParameter(1, debut).setParameter(2, fin).getResultList();
            for (Object[] x : r) {
                String motif = StringUtils.defaultIfBlank((String) x[6], (String) x[5]);
                l.add(new JournalMessages.Ligne("S" + x[0], (Date) x[1], JournalMessages.SMS,
                        JournalMessages.origineSms((String) x[11], vrai(x[14])), nom(x[7], x[8]), numero(x[9], x[10]),
                        JournalMessages.etatSms((String) x[2], (String) x[3], (String) x[4], (String) x[5]), motif,
                        nom(x[12], x[13])));
            }
            List<Object[]> a = em
                    .createNativeQuery("SELECT m.id, m.created_at, m.origine, m.telephone, m.statut,"
                            + " m.motif, u.str_FIRST_NAME, u.str_LAST_NAME FROM message_administration m"
                            + " LEFT JOIN t_user u ON u.lg_USER_ID = m.utilisateur_id"
                            + " WHERE m.created_at >= ?1 AND m.created_at < ?2")
                    .setParameter(1, debut).setParameter(2, fin).getResultList();
            for (Object[] x : a) {
                l.add(new JournalMessages.Ligne("A" + x[0], (Date) x[1], JournalMessages.SMS,
                        JournalMessages.origineAdministration((String) x[2]), "Numéro d'administration",
                        StringUtils.defaultString((String) x[3]), JournalMessages.etatAdministration((String) x[4]),
                        (String) x[5], nom(x[6], x[7])));
            }
        }
        return l;
    }

    public List<JournalMessages.Ligne> selection(String du, String au, JournalMessages.Filtre f) {
        return JournalMessages.filtrer(lignes(du, au, f.canal), f);
    }
}
