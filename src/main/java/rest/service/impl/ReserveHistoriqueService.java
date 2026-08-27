package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Date a partir de laquelle la reserve est suivie dans cette officine, et assainissement de l'historique anterieur.
 *
 * <p>
 * La reserve n'est historisee nulle part : t_type_stock_famille dit ce qu'il y a en reserve <em>maintenant</em>, pas ce
 * qu'il y avait a une date passee. Le vidage de la table de transit, retire depuis, appliquait pourtant cette valeur
 * vivante aux journees qu'il reprenait : l'historique porte donc, chez les officines concernees, une reserve qui n'a
 * jamais existe a la date affichee.
 * </p>
 *
 * <p>
 * Avant l'activation de la reserve, la seule valeur exacte est zero. La date d'activation differe d'une officine a
 * l'autre : elle est donc detectee dans la base, jamais ecrite en dur, puis memorisee dans le parametre
 * KEY_VALORISATION_RESERVE_DEPUIS pour rester visible, auditable et corrigeable par le support.
 * </p>
 *
 * @author koben
 */
@Stateless
public class ReserveHistoriqueService {

    private static final Logger LOG = Logger.getLogger(ReserveHistoriqueService.class.getName());

    /** Parametre portant la date d'activation de la reserve, au format yyyyMMdd. */
    public static final String CLE_RESERVE_DEPUIS = "KEY_VALORISATION_RESERVE_DEPUIS";

    /** Valeur du parametre lorsque l'officine n'a jamais active la reserve : tout l'historique est a zero. */
    public static final String JAMAIS_ACTIVEE = "AUCUNE";

    /** Valeur du parametre lorsque la detection echoue : on s'interdit alors de modifier quoi que ce soit. */
    public static final String INDETERMINEE = "INDETERMINEE";

    private static final int TAILLE_TRANCHE = 5000;

    private static final int TRANCHES_MAX = 400;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private ReserveHistoriqueService self;

    @EJB
    private SupportEventService supportEventService;

    /**
     * Detecte la date d'activation de la reserve si le parametre n'est pas encore renseigne, et retourne sa valeur.
     *
     * @return la date au format yyyyMMdd, {@link #JAMAIS_ACTIVEE} ou {@link #INDETERMINEE}
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public String reserveDepuis() {
        String existant = StringUtils.trimToEmpty(lireParametre(CLE_RESERVE_DEPUIS));
        if (!existant.isEmpty()) {
            return existant;
        }
        String detecte = detecter();
        self.enregistrerParametre(detecte);
        LOG.log(Level.INFO, "Suivi de la reserve : date d''activation detectee = {0}", detecte);
        return detecte;
    }

    /**
     * Cherche la premiere trace datee de la reserve dans la base.
     *
     * <p>
     * D'abord t_type_stock_famille : la creation de la premiere ligne de type reserve date l'activation de la
     * fonctionnalite. A defaut, t_mouvement_reserve donne le premier mouvement, forcement posterieur ou egal, donc
     * conservateur dans le bon sens. Aucune des deux ne repond et la reserve n'existe pas : zero est exact partout.
     * Elle existe mais n'est pas datable : on renvoie {@link #INDETERMINEE}, et rien ne sera modifie — mieux vaut un
     * historique douteux qu'un historique efface par exces de prudence.
     * </p>
     */
    private String detecter() {
        String date = premiereDate("SELECT MIN(t.dt_CREATED) FROM t_type_stock_famille t "
                + "WHERE t.lg_TYPE_STOCK_ID = '2' AND t.dt_CREATED IS NOT NULL");
        if (date != null) {
            return date;
        }
        date = premiereDate("SELECT MIN(m.dt_CREATED) FROM t_mouvement_reserve m WHERE m.dt_CREATED IS NOT NULL");
        if (date != null) {
            LOG.warning(
                    "Suivi de la reserve : date deduite du premier mouvement, t_type_stock_famille etant sans date.");
            return date;
        }
        if (compter("SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_ID = '2'") == 0L) {
            return JAMAIS_ACTIVEE;
        }
        LOG.warning("Suivi de la reserve : activation non datable, aucun assainissement ne sera effectue. "
                + "Renseigner " + CLE_RESERVE_DEPUIS + " a la main (format yyyyMMdd) pour debloquer.");
        supportEventService.recordServerIncident("valorisation-reserve-indeterminee", "WARN",
                "Date d'activation de la reserve indeterminable",
                "La reserve existe dans cette base mais aucune date de creation n'est exploitable.\n"
                        + "L'historique de reserve ne sera pas assaini, au risque d'afficher des valorisations "
                        + "reserve inexactes sur les dates anterieures a l'activation.\n\n" + "Renseigner le parametre "
                        + CLE_RESERVE_DEPUIS + " au format yyyyMMdd.");
        return INDETERMINEE;
    }

    private String premiereDate(String sql) {
        try {
            List<?> r = em.createNativeQuery(sql).getResultList();
            if (r.isEmpty() || r.get(0) == null) {
                return null;
            }
            Object v = r.get(0);
            LocalDate d = null;
            if (v instanceof java.sql.Timestamp) {
                d = ((java.sql.Timestamp) v).toLocalDateTime().toLocalDate();
            } else if (v instanceof java.sql.Date) {
                d = ((java.sql.Date) v).toLocalDate();
            } else if (v instanceof java.util.Date) {
                d = new java.sql.Timestamp(((java.util.Date) v).getTime()).toLocalDateTime().toLocalDate();
            }
            return d == null ? null : d.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        } catch (Exception e) {
            // Table absente sur les versions plus anciennes : ce n'est pas une erreur, on passe au repli suivant.
            LOG.log(Level.FINE, "Detection de la reserve : " + sql, e);
            return null;
        }
    }

    private long compter(String sql) {
        try {
            Object r = em.createNativeQuery(sql).getSingleResult();
            return r == null ? 0L : ((Number) r).longValue();
        } catch (Exception e) {
            LOG.log(Level.FINE, "Detection de la reserve : " + sql, e);
            return 0L;
        }
    }

    private String lireParametre(String cle) {
        try {
            List<?> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                    .setParameter(1, cle).getResultList();
            return r.isEmpty() || r.get(0) == null ? null : r.get(0).toString();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Lecture du parametre " + cle, e);
            return null;
        }
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void enregistrerParametre(String valeur) {
        try {
            em.createNativeQuery("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) "
                    + "VALUES (?1, ?2, ?3, 'SYSTEME', 'enable') " + "ON DUPLICATE KEY UPDATE str_VALUE = ?2")
                    .setParameter(1, CLE_RESERVE_DEPUIS).setParameter(2, valeur)
                    .setParameter(3, "DATE D'ACTIVATION DU SUIVI DE LA RESERVE (yyyyMMdd, AUCUNE OU INDETERMINEE)")
                    .executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Enregistrement du parametre " + CLE_RESERVE_DEPUIS, e);
        }
    }

    /**
     * Remet a zero la reserve des journees anterieures a l'activation, par tranches bornees.
     *
     * <p>
     * Sans effet si la date est indeterminee : on ne touche pas a un historique qu'on ne sait pas dater. Sans effet non
     * plus une fois l'assainissement fait, la mise a jour ne portant que sur les lignes encore non nulles.
     * </p>
     *
     * @return nombre de lignes assainies
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public long assainir() {
        String depuis = reserveDepuis();
        if (INDETERMINEE.equals(depuis)) {
            LOG.warning("Assainissement de la reserve ignore : date d'activation indeterminee.");
            return 0L;
        }
        // Reserve jamais activee : aucune journee n'a de reserve legitime, la borne est donc l'infini.
        int borne = JAMAIS_ACTIVEE.equals(depuis) ? 99999999 : Integer.parseInt(depuis);

        long total = 0;
        int tranches = 0;
        int modifiees;
        do {
            modifiees = self.assainirTranche(borne);
            total += modifiees;
            tranches++;
        } while (modifiees == TAILLE_TRANCHE && tranches < TRANCHES_MAX);

        if (total > 0) {
            LOG.log(Level.INFO, "Assainissement de la reserve : {0} lignes remises a zero avant le {1}.",
                    new Object[] { total, borne });
        }
        return total;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int assainirTranche(int borne) {
        return em
                .createNativeQuery("UPDATE stock_snapshot_day SET qty_reserve = 0 "
                        + "WHERE stock_of_day < ?1 AND qty_reserve <> 0 LIMIT " + TAILLE_TRANCHE)
                .setParameter(1, borne).executeUpdate();
    }
}
