package filter;

import util.Constant;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * Audit du 12/10 (constat I1) : les anciennes JSP de {@code /webservices/} et les servlets ne verifiaient pas toutes
 * qu'un utilisateur etait connecte ; plusieurs, joignables sans session, construisaient leur SQL avec le texte recu. Ce
 * filtre exige la session de Prestige avant de les laisser repondre. La connexion passe par l'API REST (v1/user/auth) :
 * aucune de ces pages n'est necessaire avant de se connecter.
 * <p>
 * Sans session : 401 et le message habituel « Veuillez vous connecter », que les ecrans savent deja traiter.
 */
public class SessionObligatoireFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {
        // rien
    }

    static boolean connecte(HttpSession s) {
        return s != null && s.getAttribute(Constant.AIRTIME_USER) != null;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse rep, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest r = (HttpServletRequest) req;
        if (connecte(r.getSession(false))) {
            chain.doFilter(req, rep);
            return;
        }
        HttpServletResponse s = (HttpServletResponse) rep;
        s.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        s.setContentType("application/json");
        s.setCharacterEncoding(StandardCharsets.UTF_8.name());
        s.setHeader("Cache-Control", "no-store");
        s.getWriter().write("{\"success\":false,\"msg\":\"" + Constant.DECONNECTED_MESSAGE + "\",\"message\":\""
                + Constant.DECONNECTED_MESSAGE + "\"}");
    }

    @Override
    public void destroy() {
        // rien
    }
}
