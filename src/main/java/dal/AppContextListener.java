package dal;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

/**
 * Libere les ressources globales a l'arret/undeploy de l'application.
 *
 * Indispensable pour les redeploiements a chaud sous GlassFish/Payara : la
 * factory JPA partagee (dataManager.SHARED_EMF) est enregistree dans le
 * SessionManager d'EclipseLink, qui vit au niveau du serveur. Si elle n'est
 * pas fermee au undeploy, le deploiement suivant recupere la session de
 * l'ancienne application et ses entites chargees par l'ancien classloader,
 * ce qui provoque des ClassCastException du type
 * "dal.TSousMenu cannot be cast to dal.TSousMenu".
 */
@WebListener
public class AppContextListener implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        // Rien a initialiser : la factory est creee a la demande.
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        dataManager.closeSharedEntityManagerFactory();
    }
}
