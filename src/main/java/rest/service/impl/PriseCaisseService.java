package rest.service.impl;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 * Plan du 08/11, point 15.3 : prise en caisse d'une prevente (ouverture a l'ecran de vente par une caissiere qui n'en
 * est pas le vendeur). Seule la premiere ouverture par une meme caissiere compte ; la vente n'est pas touchee.
 */
@Stateless
public class PriseCaisseService {

    /**
     * Insere la prise si la vente est une prevente en attente (is_Process, non annulee), d'un autre vendeur, et pas
     * encore prise par cette caissiere. INSERT IGNORE : deux ouvertures simultanees ne font qu'une ligne.
     */
    static final String SQL = "INSERT IGNORE INTO vente_prise_caisse (vente_id, user_id, pris_le)"
            + " SELECT p.lg_PREENREGISTREMENT_ID, ?2, NOW() FROM t_preenregistrement p"
            + " WHERE p.lg_PREENREGISTREMENT_ID = ?1 AND p.str_STATUT = 'is_Process' AND p.b_IS_CANCEL = 0"
            + " AND p.lg_USER_VENDEUR_ID IS NOT NULL AND p.lg_USER_VENDEUR_ID <> ?2";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** @return vrai si une prise vient d'etre enregistree */
    public boolean enregistrer(String venteId, String userId) {
        if (venteId == null || venteId.isBlank() || userId == null || userId.isBlank()) {
            return false;
        }
        return em.createNativeQuery(SQL).setParameter(1, venteId).setParameter(2, userId).executeUpdate() > 0;
    }
}
