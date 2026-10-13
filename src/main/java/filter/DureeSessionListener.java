package filter;

import javax.ejb.EJB;
import javax.servlet.annotation.WebListener;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;
import rest.service.securite.SecuriteAccesService;

/**
 * Expiration des sessions apres inactivite (13/10) : la duree vient du parametre KEY_DUREE_SESSION_MINUTES (720 par
 * defaut, soit 12 h ; 0 : jamais, ancien comportement). Appliquee a chaque session creee, connexion ecran comme
 * application mobile a cookie. Les telephones a jeton (v1/mobile/...) ne sont pas concernes.
 */
@WebListener
public class DureeSessionListener implements HttpSessionListener {

    @EJB
    private SecuriteAccesService securiteAcces;

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        try {
            se.getSession().setMaxInactiveInterval(securiteAcces.dureeSessionSecondes());
        } catch (RuntimeException e) {
            // reglage illisible : la session garde la duree de web.xml, la connexion n'est jamais bloquee
        }
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        // rien a liberer
    }
}
