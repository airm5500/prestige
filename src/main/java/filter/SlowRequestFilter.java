package filter;

import dal.TUser;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import javax.ejb.EJB;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;
import rest.service.dto.SupportEventDTO;
import util.Constant;

/**
 * Detection des ecrans / requetes lents : mesure le temps de traitement des requetes de donnees et cree un evenement
 * PERFORMANCE pour celles qui depassent un seuil configurable. La configuration est mise en cache (rechargee au plus
 * une fois par minute) pour n'ajouter aucun surcout par requete ; l'enregistrement d'une lenteur est asynchrone.
 *
 * Limite volontairement a l'API REST (/api/*) : les web-services JSP herites (ex. chargement du menu via
 * /webservices/menumanagement/ws_tree_menu.jsp) ne sont PAS interceptes, pour ne prendre aucun risque sur ces flux.
 */
@WebFilter(filterName = "SlowRequestFilter", urlPatterns = { "/api/*" })
public class SlowRequestFilter implements Filter {

    private static final long CONFIG_TTL_MS = 60_000L;

    /** Photographie d'une requete API en cours de traitement (pour le chien de garde BlocageWatchdog). */
    public static final class RequeteEnCours {
        public final String methode;
        public final String uri;
        public final long debutMs;
        public final String nomThread;

        private RequeteEnCours(String methode, String uri, long debutMs, String nomThread) {
            this.methode = methode;
            this.uri = uri;
            this.debutMs = debutMs;
            this.nomThread = nomThread;
        }
    }

    private static final Set<RequeteEnCours> EN_COURS = ConcurrentHashMap.newKeySet();

    /** Liste des requetes API actuellement en traitement (lecture seule, sans blocage). */
    public static List<RequeteEnCours> requetesEnCours() {
        return new ArrayList<>(EN_COURS);
    }

    @EJB
    private SupportEventService supportEventService;
    @EJB
    private rest.service.SuggestionLenteurService suggestionLenteurService;

    private volatile long lastConfigLoad = 0L;
    private volatile boolean enabled = true;
    private volatile long thresholdMs = 5000L;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // rien a initialiser
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        long start = System.currentTimeMillis();
        RequeteEnCours suivi = null;
        if (request instanceof HttpServletRequest) {
            HttpServletRequest req = (HttpServletRequest) request;
            suivi = new RequeteEnCours(StringUtils.defaultString(req.getMethod()),
                    StringUtils.defaultString(req.getRequestURI()), start, Thread.currentThread().getName());
            EN_COURS.add(suivi);
        }
        try {
            chain.doFilter(request, response);
        } finally {
            if (suivi != null) {
                EN_COURS.remove(suivi);
            }
            try {
                if (supportEventService != null && request instanceof HttpServletRequest) {
                    long duree = System.currentTimeMillis() - start;
                    // La configuration n'est relue (acces base) que pour les requetes deja lentes :
                    // le chemin nominal ne fait aucun appel base, et si la base est bloquee seules
                    // les requetes deja en difficulte attendent ici.
                    if (enabled && duree >= thresholdMs) {
                        rafraichirConfig();
                        if (enabled && duree >= thresholdMs) {
                            signalerLenteur((HttpServletRequest) request, duree);
                        }
                    }
                }
            } catch (Exception ignore) {
                // la mesure ne doit jamais perturber la requete
            }
        }
    }

    private void signalerLenteur(HttpServletRequest req, long dureeMs) {
        String chemin = StringUtils.defaultString(req.getRequestURI());
        // On ne mesure pas les appels du support lui-meme (evite toute boucle de retro-action).
        if (chemin.contains("/api/v1/support/")) {
            return;
        }
        String methode = StringUtils.defaultString(req.getMethod());
        long seuilS = Math.max(1, thresholdMs / 1000);
        String utilisateur = utilisateur(req);
        SupportEventDTO dto = new SupportEventDTO();
        dto.setType("PERF");
        dto.setNiveau("WARN");
        dto.setModule("PERFORMANCE");
        dto.setMessageCourt(
                StringUtils.abbreviate("Requete lente (> " + seuilS + "s) : " + methode + " " + chemin, 500));
        dto.setUrlOuEcran(StringUtils.abbreviate(chemin, 255));
        StringBuilder detail = new StringBuilder();
        detail.append("Requete lente detectee.\n");
        detail.append("Methode : ").append(methode).append("\n");
        detail.append("URI     : ").append(chemin).append("\n");
        detail.append("Query   : ").append(StringUtils.defaultString(req.getQueryString())).append("\n");
        detail.append("Duree   : ").append(dureeMs).append(" ms\n");
        detail.append("Seuil   : ").append(thresholdMs).append(" ms\n");
        detail.append("Utilisateur : ").append(utilisateur).append("\n");
        dto.setStack(detail.toString());
        // Enregistrement asynchrone (record est @Asynchronous) : aucun surcout ajoute a la requete.
        supportEventService.record(dto, utilisateur);
        // Ouverture de suggestion : on ajoute au constat generique un diagnostic des deux causes connues
        // (lignes de vente en double, index manquant) et les requetes a executer. Lui aussi asynchrone,
        // et espace dans le temps par le service : il ne change rien a la mesure ci-dessus.
        if (suggestionLenteurService != null && rest.DiagnosticSuggestionLente.estAppelSuggestion(chemin)) {
            suggestionLenteurService.diagnostiquer(chemin, req.getQueryString(), dureeMs, thresholdMs, utilisateur);
        }
    }

    private String utilisateur(HttpServletRequest req) {
        try {
            HttpSession session = req.getSession(false);
            if (session != null) {
                Object u = session.getAttribute(Constant.AIRTIME_USER);
                if (u instanceof TUser) {
                    return StringUtils.abbreviate(((TUser) u).getStrLOGIN(), 255);
                }
            }
        } catch (Exception ignore) {
            // best-effort
        }
        return "";
    }

    private void rafraichirConfig() {
        long now = System.currentTimeMillis();
        if (now - lastConfigLoad < CONFIG_TTL_MS) {
            return;
        }
        lastConfigLoad = now;
        try {
            enabled = !"0".equals(StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_SLOWLOG_ENABLED")));
            String v = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_SLOW_MS"));
            if (StringUtils.isNotBlank(v)) {
                thresholdMs = Long.parseLong(v);
            }
        } catch (Exception e) {
            // en cas de souci de lecture, on garde les dernieres valeurs connues
        }
    }

    @Override
    public void destroy() {
        // rien a liberer
    }
}
