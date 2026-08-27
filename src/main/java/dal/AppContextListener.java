package dal;

import java.io.IOException;
import java.util.logging.Filter;
import java.util.logging.Logger;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

/**
 * Libere les ressources globales a l'arret/undeploy de l'application.
 *
 * Indispensable pour les redeploiements a chaud sous GlassFish/Payara : la factory JPA partagee
 * (dataManager.SHARED_EMF) est enregistree dans le SessionManager d'EclipseLink, qui vit au niveau du serveur. Si elle
 * n'est pas fermee au undeploy, le deploiement suivant recupere la session de l'ancienne application et ses entites
 * chargees par l'ancien classloader, ce qui provoque des ClassCastException du type "dal.TSousMenu cannot be cast to
 * dal.TSousMenu".
 */
@WebListener
public class AppContextListener implements ServletContextListener {

    /**
     * Supprime le bruit "le client a raccroche" du log serveur : quand le navigateur abandonne une requete en cours
     * (changement d'ecran qui detruit le tableau de bord et ses rafraichissements, timeout Ext, F5...), Jersey ne peut
     * plus ecrire la reponse et journalise un SEVERE "An I/O error has occurred while writing a response message
     * entity" cause par IOException "Connection is closed". Le traitement metier, lui, s'est termine normalement : ces
     * entrees n'ont aucune valeur diagnostique et noient les vraies erreurs. Ce filtre ne retire QUE les
     * enregistrements dont la cause est un abandon de connexion par le client ; toute autre erreur reste journalisee.
     */
    private static final Filter FILTRE_ABANDON_CLIENT = record -> {
        for (Throwable t = record.getThrown(); t != null; t = t.getCause()) {
            if (t.getClass().getName().endsWith("ClientAbortException")) {
                return false;
            }
            if (t instanceof IOException && t.getMessage() != null) {
                String message = t.getMessage();
                if (message.contains("Connection is closed") || message.contains("Broken pipe")
                        || message.contains("Connection reset") || message.contains("connexion")
                        || message.contains("abandonn")) {
                    return false;
                }
            }
        }
        return true;
    };

    // Reference forte : le LogManager ne garde que des references faibles sur les loggers,
    // sans elle le filtre pourrait disparaitre silencieusement au premier passage du GC.
    private static Logger jerseyServerRuntimeLogger;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        try {
            jerseyServerRuntimeLogger = Logger.getLogger("org.glassfish.jersey.server.ServerRuntime");
            jerseyServerRuntimeLogger.setFilter(FILTRE_ABANDON_CLIENT);
        } catch (RuntimeException e) {
            // la configuration du log ne doit jamais empecher le demarrage
        }
        // Prechauffage de la factory JPA partagee, en arriere-plan pour ne pas retarder le
        // deploiement : sa construction (20-30 s sur un poste d'officine, EclipseLink relit
        // toutes les classes du war) se paie ainsi PENDANT le demarrage du serveur, et non a
        // la premiere requete d'un utilisateur - ou elle bloquait le menu et toutes les
        // tuiles du tableau de bord derriere le verrou de dataManager (blocage vu au watchdog).
        Thread prechauffage = new Thread(dataManager::prechaufferSharedEntityManagerFactory,
                "prechauffage-factory-jpa");
        prechauffage.setDaemon(true);
        prechauffage.start();
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // Retire le filtre du logger (qui vit au niveau du serveur) pour ne pas retenir le
        // classloader de ce deploiement apres un undeploy.
        try {
            Logger logger = jerseyServerRuntimeLogger;
            if (logger != null && logger.getFilter() == FILTRE_ABANDON_CLIENT) {
                logger.setFilter(null);
            }
            jerseyServerRuntimeLogger = null;
        } catch (RuntimeException e) {
            // rien : l'application s'arrete
        }
        dataManager.closeSharedEntityManagerFactory();
    }
}
