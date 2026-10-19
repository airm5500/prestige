package filter;

import dal.TUser;
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
import org.json.JSONObject;
import util.Constant;

/**
 * Cas d'officine du 17/10 : un onglet ouvert au nom d'un utilisateur, un autre compte qui se connecte dans un autre
 * onglet du meme navigateur (la session est partagee) ; le premier onglet garde ses menus et ses boutons, mais le
 * serveur agissait au nom du second (vente terminee au nom d'un profil « Pre-vente »).
 *
 * <p>
 * Chaque page de l'application envoie l'utilisateur avec lequel elle a ete chargee (en-tete {@value #ENTETE}). S'il
 * n'est plus celui de la session, la requete est refusee sans rien executer : 409 {success:false, sessionChangee:true,
 * msg} ; la page l'annonce et se recharge au nom du compte connecte. Sans en-tete (applications mobiles, scripts,
 * formulaires d'envoi de fichier), rien ne change. La deconnexion reste possible depuis l'onglet perime.
 */
public class UtilisateurOngletFilter implements Filter {

    public static final String ENTETE = "X-Prestige-Utilisateur";
    static final String ENTETE_REPONSE = "X-Prestige-Session-Changee";

    @Override
    public void init(FilterConfig filterConfig) {
        // rien
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse rep, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest r = (HttpServletRequest) req;
        String attendu = r.getHeader(ENTETE);
        HttpSession s = r.getSession(false);
        TUser u = s == null ? null : (TUser) s.getAttribute(Constant.AIRTIME_USER);
        if (attendu == null || attendu.isEmpty() || u == null || attendu.equals(u.getLgUSERID()) || deconnexion(r)) {
            chain.doFilter(req, rep);
            return;
        }
        HttpServletResponse h = (HttpServletResponse) rep;
        h.setStatus(HttpServletResponse.SC_CONFLICT);
        h.setContentType("application/json");
        h.setCharacterEncoding(StandardCharsets.UTF_8.name());
        h.setHeader("Cache-Control", "no-store");
        h.setHeader(ENTETE_REPONSE, "1");
        h.getWriter()
                .write(new JSONObject().put("success", false).put("sessionChangee", true)
                        .put("msg",
                                "Un autre compte (" + u.getStrLOGIN() + ") s'est connecté sur ce navigateur. "
                                        + "Rien n'a été enregistré : la page se recharge au nom de ce compte.")
                        .toString());
    }

    private static boolean deconnexion(HttpServletRequest r) {
        String uri = r.getRequestURI();
        return uri != null && uri.endsWith("/api/v1/user/logout");
    }

    @Override
    public void destroy() {
        // rien
    }
}
