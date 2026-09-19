package filter;

import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.transaction.Status;
import javax.transaction.UserTransaction;

import dal.TUser;
import rest.service.SessionHelperService;
import util.Constant;

/**
 * Renseigne l'utilisateur courant pour les ecrans servis par une SERVLET (les editions PDF et Excel).
 *
 * L'utilisateur courant est range dans un ThreadLocal par AuthenticationFilter, qui est un filtre JAX-RS : il ne
 * s'execute que pour les appels /api/... Les editions, elles, passent par des servlets classiques (une quarantaine dans
 * rest.report). Le ThreadLocal y restait donc vide, et tout service appelant sessionHelperService.getCurrentUser()
 * levait un NullPointerException - c'est ce qui arrivait a l'edition du 20/80, qui a besoin de l'emplacement de
 * l'utilisateur pour appeler sa procedure stockee.
 *
 * Le filtre ne fait qu'une chose : si le contexte est vide et que la session HTTP porte un utilisateur connecte, il l'y
 * pose pour la duree de la requete, puis efface ce qu'il a pose. Il ne cree jamais de session, ne remplace jamais une
 * valeur deja presente (le filtre JAX-RS reste maitre sur /api/...) et n'authentifie personne : il ne fait que rendre
 * disponible, cote servlet, l'utilisateur que la session porte deja.
 */
@WebFilter(filterName = "UtilisateurEditionFilter", urlPatterns = { "/*" })
public class UtilisateurEditionFilter implements Filter {

    private static final Logger LOG = Logger.getLogger(UtilisateurEditionFilter.class.getName());

    @EJB
    private SessionHelperService sessionHelperService;

    @Resource
    private UserTransaction transactionDuThread;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        libererTransactionOrpheline();
        boolean poseParCeFiltre = false;
        try {
            poseParCeFiltre = poserUtilisateurCourant(request);
            chain.doFilter(request, response);
        } finally {
            if (poseParCeFiltre) {
                // Les threads HTTP sont reutilises : ne jamais laisser un utilisateur derriere soi.
                sessionHelperService.setCurrentUser(null);
            }
        }
    }

    /**
     * UNE TRANSACTION NE DOIT JAMAIS SURVIVRE A LA REQUETE QUI L'A OUVERTE.
     *
     * <p>
     * Symptome mesure chez l'officine : « Les chiffres n'ont pas pu etre rassembles » qui revient au hasard, sur
     * n'importe quel menu, et disparait tout seul. Dans le journal, ce n'est pas l'ecran qui echoue mais le filtre
     * d'authentification lui-meme : {@code TransactionRolledbackLocalException: Client's transaction aborted}, des la
     * premiere ligne de la requete.
     *
     * <p>
     * L'explication tient au recyclage des threads. Un traitement qui ouvre une transaction a la main
     * ({@code UserTransaction.begin()}) et qui sort par une exception sans la terminer la laisse ATTACHEE AU THREAD. Le
     * serveur rend ce thread au pool ; la requete suivante servie par ce thread hérite d'une transaction condamnee, et
     * tout appel de service echoue avant meme d'avoir commence. L'utilisateur, lui, voit un menu qui marche et le
     * suivant qui ne marche pas, sans logique apparente.
     *
     * <p>
     * Ce filtre voit passer TOUTES les requetes : il est le bon endroit pour verifier qu'aucune transaction ne traine
     * en debut de requete, et pour la liberer le cas echeant. C'est un filet, pas un pansement : la fuite est corrigee
     * la ou elle se produit, mais une seule fuite oubliee ailleurs suffirait a empoisonner un thread pour la journee.
     */
    private void libererTransactionOrpheline() {
        if (transactionDuThread == null) {
            return;
        }
        try {
            int statut = transactionDuThread.getStatus();
            if (statut == Status.STATUS_NO_TRANSACTION) {
                return;
            }
            LOG.log(Level.WARNING,
                    "Transaction heritee d''une requete precedente (statut {0}) : elle est annulee avant de servir "
                            + "celle-ci. Un traitement a ouvert une transaction sans la terminer.",
                    statut);
            transactionDuThread.rollback();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "impossible de liberer la transaction heritee", e);
        }
    }

    /** @return vrai si c'est bien ce filtre qui a pose l'utilisateur, et donc a lui de l'effacer. */
    private boolean poserUtilisateurCourant(ServletRequest request) {
        try {
            if (sessionHelperService == null || sessionHelperService.getCurrentUser() != null
                    || !(request instanceof HttpServletRequest)) {
                return false;
            }
            // false : on ne cree pas de session pour une requete qui n'en a pas
            HttpSession session = ((HttpServletRequest) request).getSession(false);
            if (session == null) {
                return false;
            }
            Object utilisateur = session.getAttribute(Constant.AIRTIME_USER);
            if (!(utilisateur instanceof TUser)) {
                return false;
            }
            sessionHelperService.setCurrentUser((TUser) utilisateur);
            return true;
        } catch (Exception e) {
            // Un contexte utilisateur absent ne doit jamais empecher la requete d'aboutir :
            // on laisse passer, le comportement reste celui d'avant ce filtre.
            return false;
        }
    }
}
