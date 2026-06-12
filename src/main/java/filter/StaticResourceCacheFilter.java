package filter;

import java.io.IOException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Ajoute des en-tetes de cache navigateur sur les ressources statiques.
 *
 * L'application ExtJS (general/) est servie en mode Ext.Loader dynamique : pres d'un millier de fichiers JS sont
 * charges individuellement a chaque ouverture de session. Sans en-tete Cache-Control, le navigateur les retelecharge
 * (ou les revalide) a chaque demarrage, ce qui retarde de plusieurs dizaines de secondes l'affichage des menus et du
 * tableau de bord. Avec ce filtre, seul le premier chargement paie ce cout ; les suivants lisent le cache local.
 *
 * Apres une mise a jour de l'application, un rechargement force (Ctrl+F5) permet de recuperer immediatement les
 * nouvelles versions des fichiers.
 */
@WebFilter(filterName = "StaticResourceCacheFilter", urlPatterns = { "*.js", "*.css", "*.png", "*.jpg", "*.jpeg",
        "*.gif", "*.ico", "*.svg", "*.woff", "*.woff2", "*.ttf", "*.eot", "*.otf" })
public class StaticResourceCacheFilter implements Filter {

    private static final long MAX_AGE_SECONDS = 86400; // 24 heures

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // rien a initialiser
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest && response instanceof HttpServletResponse) {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setHeader("Cache-Control", "public, max-age=" + MAX_AGE_SECONDS);
        }
        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {
        // rien a liberer
    }
}
