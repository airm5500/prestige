package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.SupportEventService;

/**
 * Purge du releve journalier : ne conserve que ce qui sert reellement.
 *
 * <p>
 * Une journee est conservee si elle est dans la fenetre glissante recente, ou si c'est la premiere ou la derniere
 * journee effectivement relevee de son mois. La regle porte sur les journees reelles et non sur des numeros de jour
 * fixes : la pharmacie ferme, le poste reste parfois eteint, et fevrier n'a pas le meme dernier jour que mars.
 * Conserver le dernier releve du mois donne la cloture du mois meme si le 30 et le 31 manquent ; conserver le premier
 * releve du mois suivant donne la cloture exacte du mois precedent, puisque le releve de 00:05 decrit le stock a la
 * fermeture de la veille.
 * </p>
 *
 * <p>
 * La suppression se fait par tranches bornees, chacune dans sa propre transaction. Supprimer des millions de lignes en
 * un seul ordre gonflerait l'undo log et tiendrait des verrous sur toute la table : c'est la faute qui bloquait les
 * caisses du temps de la procedure stockee, et elle n'a pas plus sa place dans une purge.
 * </p>
 *
 * @author koben
 */
@Stateless
public class StockSnapshotPurgeService {

    private static final Logger LOG = Logger.getLogger(StockSnapshotPurgeService.class.getName());

    /** Nombre de lignes supprimees par transaction. */
    private static final int TAILLE_TRANCHE = 5000;

    /** Garde-fou : au-dela, la purge s'arrete et sera reprise au passage suivant. */
    private static final int TRANCHES_MAX = 400;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private StockSnapshotPurgeService self;

    @EJB
    private SupportEventService supportEventService;

    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void purgerAsync(int retentionJours) {
        try {
            if (!releveAJour()) {
                LOG.warning("Purge du releve journalier annulee : aucun releve recent, la base pourrait etre "
                        + "incomplete. Rien n'est supprime.");
                return;
            }

            int limite = Integer.parseInt(
                    LocalDate.now().minusDays(retentionJours).format(DateTimeFormatter.ofPattern("yyyyMMdd")));

            // Les clotures sont calculees une seule fois : quelques dizaines de journees, deux agregats sur la cle
            // primaire. Les recalculer a chaque tranche relancerait deux parcours complets a chaque fois.
            List<Integer> clotures = journeesDeCloture();
            if (clotures.isEmpty()) {
                LOG.warning("Purge du releve journalier annulee : aucune cloture de mois identifiee.");
                return;
            }

            long total = 0;
            int tranches = 0;
            int supprimees;
            do {
                supprimees = self.purgerTranche(limite, clotures);
                total += supprimees;
                tranches++;
            } while (supprimees == TAILLE_TRANCHE && tranches < TRANCHES_MAX);

            LOG.log(Level.INFO, "Purge du releve journalier : {0} lignes supprimees anterieures a {1} "
                    + "({2} clotures de mois conservees).", new Object[] { total, limite, clotures.size() });
            supportEventService.recordJobRun("PURGE_VALORISATION");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Purge du releve journalier", e);
        }
    }

    /**
     * Journees de cloture a conserver indefiniment : premiere et derniere journee effectivement relevee de chaque mois.
     * {@code stock_of_day DIV 100} donne le mois d'une journee au format yyyyMMdd, ce qui evite toute logique de
     * calendrier (fevrier, mois de 30 ou 31 jours, jours de fermeture).
     */
    @SuppressWarnings("unchecked")
    private List<Integer> journeesDeCloture() {
        List<Integer> jours = new ArrayList<>();
        try {
            List<Object> lignes = em
                    .createNativeQuery("SELECT MAX(stock_of_day) FROM stock_snapshot_day GROUP BY stock_of_day DIV 100 "
                            + "UNION SELECT MIN(stock_of_day) FROM stock_snapshot_day GROUP BY stock_of_day DIV 100")
                    .getResultList();
            for (Object ligne : lignes) {
                if (ligne != null) {
                    jours.add(((Number) ligne).intValue());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Calcul des clotures de mois", e);
        }
        return jours;
    }

    /**
     * Supprime une tranche de journees non conservees.
     *
     * @return nombre de lignes supprimees
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int purgerTranche(int limite, List<Integer> clotures) {
        return em
                .createNativeQuery("DELETE FROM stock_snapshot_day WHERE stock_of_day < :limite "
                        + "AND stock_of_day NOT IN (:clotures) LIMIT " + TAILLE_TRANCHE)
                .setParameter("limite", limite).setParameter("clotures", clotures).executeUpdate();
    }

    /**
     * Verifie qu'un releve recent existe. Purger sur la foi d'une base ou le traitement quotidien ne tourne plus
     * reviendrait a supprimer des journees sans que de nouvelles soient ecrites.
     */
    private boolean releveAJour() {
        try {
            Object r = em.createNativeQuery("SELECT MAX(stock_of_day) FROM stock_snapshot_day").getSingleResult();
            if (r == null) {
                return false;
            }
            int dernier = ((Number) r).intValue();
            int ilYaHuitJours = Integer
                    .parseInt(LocalDate.now().minusDays(8).format(DateTimeFormatter.ofPattern("yyyyMMdd")));
            return dernier >= ilYaHuitJours;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Controle de fraicheur du releve avant purge", e);
            return false;
        }
    }
}
