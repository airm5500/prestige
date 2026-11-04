package rest.service.calculation;

import dal.TParameters;
import javax.persistence.EntityManager;

/**
 * Lot « base de calcul par tiers-payant » (Q2.5 du cas 2 du 03/11/2026).
 *
 * <p>
 * Tout passe par le parametre {@code KEY_PRIX_REF_BASE_PAR_TP} : a 0 (ou absent, ou illisible), le moteur applique la
 * regle d'aujourd'hui, le plus petit des prix de reference de la vente servant de base a toutes les parts. A 1, chaque
 * tiers-payant est calcule sur son propre prix de reference (ou le prix de vente s'il n'en a pas) multiplie par la
 * quantite, avec son propre taux ; l'ordre de priorite, les plafonds et la part client ne changent pas.
 */
public final class BaseParTiersPayant {

    public static final String PARAMETRE = "KEY_PRIX_REF_BASE_PAR_TP";

    private BaseParTiersPayant() {
    }

    /** Le parametre vaut-il 1 ? Toute erreur de lecture vaut 0 : la regle du minimum s'applique. */
    public static boolean actif(EntityManager em) {
        try {
            TParameters p = em.find(TParameters.class, PARAMETRE);
            return p != null && valeurActive(p.getStrVALUE());
        } catch (RuntimeException e) {
            return false;
        }
    }

    static boolean valeurActive(String valeur) {
        return valeur != null && "1".equals(valeur.trim());
    }
}
