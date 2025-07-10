package rest.service.impl;

import java.math.BigInteger;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import rest.service.ProductStateService;
import rest.service.dto.EtatProduit;

/**
 *
 * @author koben
 */
@Stateless
public class ProductStateServiceImpl implements ProductStateService {

    private static final Logger LOG = Logger.getLogger(ProductStateServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public EtatProduit getEtatProduit(String produitId) {
        EtatProduit etatProduit = new EtatProduit();
        etatProduit.setEnCommande(checkCommandeAccount(produitId));
        etatProduit.setEnSuggestion(checkSuggestionAccount(produitId));
        etatProduit.setEntree(checkEntreeStock(produitId));
        return etatProduit;

    }

    private int checkSuggestionAccount(String produitId) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT  COUNT(o.lg_SUGGESTION_ORDER_DETAILS_ID) AS dataCount FROM  t_suggestion_order_details o WHERE o.lg_FAMILLE_ID=?1");
            q.setParameter(1, produitId);
            return ((BigInteger) q.getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return 0;
        }
    }

    private int checkCommandeAccount(String produitId) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT  COUNT(o.lg_ORDERDETAIL_ID) AS dataCount FROM  t_order_detail o  JOIN t_order od ON od.lg_ORDER_ID=o.lg_ORDER_ID WHERE o.lg_FAMILLE_ID=?1 AND od.str_STATUT ='is_Process'");
            q.setParameter(1, produitId);

            return ((BigInteger) q.getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return 0;
        }
    }

    private int checkEntreeStock(String produitId) {
        try {
            Query q = em.createNativeQuery(
                    "SELECT  COUNT(o.lg_BON_LIVRAISON_DETAIL) AS dataCount FROM  t_bon_livraison_detail o JOIN t_bon_livraison od ON od.lg_BON_LIVRAISON_ID=o.lg_BON_LIVRAISON_ID WHERE o.lg_FAMILLE_ID=?1 AND od.str_STATUT='enable'");
            q.setParameter(1, produitId);

            return ((BigInteger) q.getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return 0;
        }
    }
}
