package filter;

import java.io.IOException;

import javax.ejb.EJB;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

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

    @EJB
    private SessionHelperService sessionHelperService;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
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
