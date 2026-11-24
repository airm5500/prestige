package filter;

import java.util.Locale;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Priority;
import javax.ejb.EJB;
import javax.ws.rs.Priorities;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.Provider;
import org.json.JSONObject;
import rest.service.impl.HorlogeVeille;

/**
 * Cahier des charges du 24/11, point 3 : « personne ne passe outre » le blocage de l'horloge. La fenêtre du navigateur
 * ne suffit pas (on peut la retirer) : tant que l'heure du serveur est fausse, toute écriture par l'API est refusée
 * (423), sauf la connexion, la déconnexion et les routes de l'horloge. Les lectures restent permises.
 * <p>
 * Si la décision ne peut pas être lue (base injoignable), rien n'est refusé ici : le blocage ne doit jamais venir d'une
 * panne de la veille elle-même.
 */
@Provider
@Priority(Priorities.AUTHORIZATION)
public class HorlogeBlocageFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(HorlogeBlocageFilter.class.getName());
    private static final Set<String> LECTURES = Set.of("GET", "HEAD", "OPTIONS");
    private static final Set<String> SORTIES = Set.of("v1/user/auth", "v1/user/auth-badge", "v1/user/logout");
    private static final String HORLOGE = "v1/horloge/";
    static final int VERROUILLE = 423;

    @EJB
    private HorlogeVeille veille;

    @javax.ws.rs.core.Context
    private javax.servlet.http.HttpServletRequest servletRequest;

    static boolean permis(String methode, String chemin) {
        if (methode == null || LECTURES.contains(methode.toUpperCase(Locale.ROOT))) {
            return true;
        }
        String c = chemin == null ? "" : chemin.startsWith("/") ? chemin.substring(1) : chemin;
        return SORTIES.contains(c) || c.startsWith(HORLOGE);
    }

    /** Corps du refus (JSON, statut 423), ou null si la requête passe. */
    static String refus(boolean bloque, String methode, String chemin) {
        if (!bloque || permis(methode, chemin)) {
            return null;
        }
        return new JSONObject().put("success", false).put("horlogeBloquee", true)
                .put("msg", "Opération refusée : l'heure du serveur est fausse. Faites « Mettre à jour » ou appelez "
                        + "l'administrateur pour remettre l'heure dans Windows.")
                .toString();
    }

    @Override
    public void filter(ContainerRequestContext requete) {
        String methode = requete.getMethod(), chemin = requete.getUriInfo().getPath();
        if (permis(methode, chemin) || veille == null) {
            return;
        }
        boolean bloque;
        try {
            bloque = veille.etatActuel().resultat.bloque;
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "decision de l'horloge illisible : requete laissee passer", e);
            return;
        }
        String r = refus(bloque, methode, chemin);
        if (r != null) {
            requete.abortWith(Response.status(VERROUILLE).type("application/json").entity(r).build());
            return;
        }
        /*
         * cahier du 24/11 : pendant une régularisation, chaque écriture est marquée « saisie en régularisation » dans
         * les traces de l'horloge (route, poste, utilisateur, heure du serveur et heure réelle) ; jamais le corps.
         */
        try {
            HorlogeVeille.Instantane i = veille.etatActuel();
            if (i.resultat.regularisationEnCours) {
                javax.servlet.http.HttpSession s = servletRequest == null ? null : servletRequest.getSession(false);
                Object u = s == null ? null : s.getAttribute(util.Constant.AIRTIME_USER);
                veille.tracer("SAISIE_EN_REGULARISATION", i.resultat, i.resultat.estimationRetenueMs,
                        servletRequest == null ? null : util.ContexteRequete.poste(servletRequest),
                        u instanceof dal.TUser ? ((dal.TUser) u).getLgUSERID() : null,
                        methode + " " + (chemin.length() > 200 ? chemin.substring(0, 200) : chemin));
            }
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "marque de saisie en regularisation", e);
        }
    }
}
