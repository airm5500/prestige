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

    /**
     * Duree d'inactivite (en minutes) au bout de laquelle une session expire (13/10). Avant : jamais (web.xml -1), un
     * poste reste connecte indefiniment et chaque session reste en memoire jusqu'au redemarrage. 0 ou negatif : jamais
     * (ancien comportement).
     */
    public static final String CLE_DUREE_SESSION = "KEY_DUREE_SESSION_MINUTES";
    static final int DUREE_SESSION_DEFAUT_MINUTES = 720;

    private static volatile boolean entetes;
    private static volatile long lu;
    private static volatile int dureeSession = DUREE_SESSION_DEFAUT_MINUTES;
    private static volatile long dureeLue;

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

    /** Duree d'inactivite d'une session, en secondes ; -1 : jamais. */
    public int dureeSessionSecondes() {
        long maintenant = System.currentTimeMillis();
        if (maintenant - dureeLue > DUREE_CACHE_MS) {
            int v = DUREE_SESSION_DEFAUT_MINUTES;
            try {
                java.util.List<?> r = em
                        .createNativeQuery(
                                "SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1 AND str_STATUT = 'enable'")
                        .setParameter(1, CLE_DUREE_SESSION).getResultList();
                if (!r.isEmpty() && r.get(0) != null) {
                    v = Integer.parseInt(r.get(0).toString().trim());
                }
            } catch (RuntimeException e) {
                v = DUREE_SESSION_DEFAUT_MINUTES;
            }
            dureeSession = v;
            dureeLue = maintenant;
        }
        return enSecondes(dureeSession);
    }

    static int enSecondes(int minutes) {
        return minutes <= 0 ? -1 : (int) Math.min((long) minutes * 60L, Integer.MAX_VALUE);
    }
}
