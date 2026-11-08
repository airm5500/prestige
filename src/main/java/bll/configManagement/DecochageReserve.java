package bll.configManagement;

import dal.TUser;
import dal.dataManager;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;

/**
 * Ce que fait le decochage de la case « reserve » d'une fiche article, en plus du transfert de la reserve vers le rayon
 * deja fait par la fiche (plan du 08/11, point 9d).
 *
 * <p>
 * Avant, ce transfert ne laissait aucune trace et les lignes du produit restaient ouvertes dans les suggestions de
 * reserve : au traitement, elles tombaient en CONFIG_STOCK_INCOMPLETE (ligne de stock reserve retiree), sans que
 * personne ne puisse dire pourquoi ni quand la case avait ete decochee.
 * <ul>
 * <li>le transfert est trace dans {@code t_mouvement_reserve} (type REASSORT, stocks avant et apres) ;</li>
 * <li>les lignes encore ouvertes du produit (A_TRAITER ou EN_COURS, ligne proposee, modifiee ou en echec) sont
 * retirees, avec un motif qui le dit.</li>
 * </ul>
 */
public final class DecochageReserve {

    private static final Logger LOG = Logger.getLogger(DecochageReserve.class.getName());

    /** Motif porte par les lignes retirees. */
    public static final String MOTIF = "Article retire de la reserve sur sa fiche article";

    private DecochageReserve() {
    }

    /**
     * @param qteTransferee
     *            quantite passee de la reserve au rayon par le decochage (0 si rien n'a bouge)
     * @param rayonApres
     *            stock rayon apres le transfert
     *
     * @return nombre de lignes de suggestion retirees
     */
    public static int appliquer(dataManager dm, TUser user, String familleId, int qteTransferee, int rayonApres) {
        EntityManager em = dm.getEm();
        boolean propre = !dm.isTransactionGroupe();
        try {
            if (propre) {
                dm.BeginTransaction();
            }
            if (qteTransferee > 0) {
                em.createNativeQuery("INSERT INTO t_mouvement_reserve (lg_MOUVEMENT_ID, lg_FAMILLE_ID, lg_USER_ID,"
                        + " lg_EMPLACEMENT_ID, str_TYPE, int_QTE, int_STOCK_RAYON_AVANT, int_STOCK_RESERVE_AVANT,"
                        + " int_STOCK_RAYON_APRES, int_STOCK_RESERVE_APRES, dt_CREATED)"
                        + " VALUES (?1, ?2, ?3, ?4, 'REASSORT', ?5, ?6, ?5, ?7, 0, NOW())")
                        .setParameter(1, UUID.randomUUID().toString()).setParameter(2, familleId)
                        .setParameter(3, user != null ? user.getLgUSERID() : null)
                        .setParameter(4,
                                user != null && user.getLgEMPLACEMENTID() != null
                                        ? user.getLgEMPLACEMENTID().getLgEMPLACEMENTID() : null)
                        .setParameter(5, qteTransferee).setParameter(6, rayonApres - qteTransferee)
                        .setParameter(7, rayonApres).executeUpdate();
            }
            int retirees = em
                    .createNativeQuery("UPDATE t_suggestion_reserve_detail d"
                            + " JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID"
                            + " SET d.str_ETAT = 'SUPPRIMEE', d.str_MOTIF_LIGNE = ?1, d.dt_UPDATED = NOW()"
                            + " WHERE d.lg_FAMILLE_ID = ?2 AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS')"
                            + " AND d.str_ETAT IN ('PROPOSEE', 'MODIFIEE', 'ECHEC')")
                    .setParameter(1, MOTIF).setParameter(2, familleId).executeUpdate();
            if (propre) {
                dm.CloseTransaction();
            }
            LOG.log(Level.INFO, "decochage reserve produit={0} transfere={1} lignes retirees={2}",
                    new Object[] { familleId, qteTransferee, retirees });
            return retirees;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "decochage reserve " + familleId, e);
            if (propre) {
                try {
                    dm.RejectTransaction();
                } catch (Exception ignore) {
                    // transaction deja close
                }
            }
            return 0;
        }
    }
}
