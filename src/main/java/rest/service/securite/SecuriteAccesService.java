package rest.service.securite;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 * Reglages de securite lus a chaque requete par filter.AuthenticationFilter : gardes une minute en memoire pour ne pas
 * interroger la base a chaque appel.
 */
@Stateless
public class SecuriteAccesService {

    /**
     * Anciens en-tetes X-User-Info / X-Token-Exp / X-client (audit du 12/10, constat C1) : ils declarent l'utilisateur
     * SANS preuve. Refuses par defaut ; « 1 » les accepte de nouveau, pour une ancienne application qui en aurait
     * besoin.
     */
    public static final String CLE_ENTETES = "KEY_ENTETES_X_USER_INFO";
    static final long DUREE_CACHE_MS = 60_000L;

    private static volatile boolean entetes;
    private static volatile long lu;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public boolean entetesUtilisateurAcceptes() {
        long maintenant = System.currentTimeMillis();
        if (maintenant - lu > DUREE_CACHE_MS) {
            boolean v = false;
            try {
                java.util.List<?> r = em
                        .createNativeQuery(
                                "SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1 AND str_STATUT = 'enable'")
                        .setParameter(1, CLE_ENTETES).getResultList();
                v = !r.isEmpty() && r.get(0) != null && "1".equals(r.get(0).toString().trim());
            } catch (RuntimeException e) {
                v = false;
            }
            entetes = v;
            lu = maintenant;
        }
        return entetes;
    }
}
