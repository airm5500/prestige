package filter;

import java.io.IOException;
import java.util.Set;
import javax.ejb.EJB;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import rest.service.impl.AvisClientService;

/**
 * Port public des avis clients. La pharmacie ouvre sur Internet un port dedie (KEY_AVIS_PORT_PUBLIC, 8090 par defaut)
 * et non celui de Prestige : sur ce port, seules la page d'avis et ses deux appels repondent ; tout le reste (ecrans,
 * API, y compris les API sans connexion) rend 404. Les postes de la pharmacie, sur le port habituel, ne sont pas
 * concernes.
 * <p>
 * Pour la page d'avis (quel que soit le port), en-tetes de securite : contenu limite au site lui-meme, pas
 * d'integration dans une autre page, pas de devinette de type, pas de referent.
 */
public class PortPublicAvisFilter implements Filter {

    static final Set<String> OUVERTS = Set.of("/avis/", "/avis/index.html", "/avis/avis.css", "/avis/avis.js",
            "/api/v1/avis-public/contexte", "/api/v1/avis-public/envoyer");
    static final String CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;"
            + " connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

    @EJB
    private AvisClientService service;

    @Override
    public void init(FilterConfig filterConfig) {
        // rien
    }

    /** Chemin dans l'application (sans le contexte), « /avis » ramene a « /avis/ ». */
    static String chemin(HttpServletRequest r) {
        String c = r.getRequestURI().substring(r.getContextPath().length());
        return "/avis".equals(c) ? "/avis/" : c;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse rep, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest r = (HttpServletRequest) req;
        HttpServletResponse s = (HttpServletResponse) rep;
        String c = chemin(r);
        int port = service == null ? -1 : service.portPublic();
        if (port > 0 && r.getLocalPort() == port) {
            String m = r.getMethod();
            /* l'envoi en POST seulement, tout le reste en lecture seulement */
            boolean ouvert = OUVERTS.contains(c)
                    && (c.endsWith("/envoyer") ? "POST".equals(m) : "GET".equals(m) || "HEAD".equals(m));
            if (!ouvert) {
                /* 404 sans page d'erreur du serveur : rien a apprendre sur ce qui tourne derriere */
                s.setStatus(HttpServletResponse.SC_NOT_FOUND);
                s.setContentLength(0);
                return;
            }
        }
        if (c.startsWith("/avis/") || c.startsWith("/api/v1/avis-public/")) {
            s.setHeader("Content-Security-Policy", CSP);
            s.setHeader("X-Frame-Options", "DENY");
            s.setHeader("X-Content-Type-Options", "nosniff");
            s.setHeader("Referrer-Policy", "no-referrer");
            s.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            if ("/avis/".equals(c) && r.getRequestURI().endsWith("/avis")) {
                /* /avis sans barre : les chemins relatifs de la page (avis.css...) seraient faux */
                String q = r.getQueryString();
                s.sendRedirect(r.getRequestURI() + "/" + (q == null ? "" : "?" + q));
                return;
            }
        }
        if ("/avis/".equals(c)) {
            /* page d'accueil du dossier sans toucher aux fichiers d'accueil de toute l'application (index.jsp) */
            r.getRequestDispatcher("/avis/index.html").forward(req, rep);
            return;
        }
        chain.doFilter(req, rep);
    }

    @Override
    public void destroy() {
        // rien
    }
}
