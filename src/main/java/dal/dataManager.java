/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Logger;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.EntityTransaction;
import javax.persistence.Persistence;

import toolkits.utils.jdom;

/**
 *
 * @author Administrator
 */
public class dataManager {

    public boolean isConected = false;
    private EntityManagerFactory emf;
    private EntityManager em;
    private static final String PERSISTENCE_UNIT_NAME = "DALPU";
    // La creation d'une EntityManagerFactory est tres couteuse (bootstrap JPA + pool de connexions) :
    // elle doit etre partagee par toute l'application et non recree a chaque requete.
    private static volatile EntityManagerFactory SHARED_EMF;
    // Nom de session EclipseLink UNIQUE par deploiement. EclipseLink met en
    // cache les sessions par nom dans un registre statique au niveau du
    // SERVEUR (il survit aux redeploiements) ; avec le nom par defaut
    // ("DALPU"), un redeploiement a chaud recupere la session de l'ancienne
    // application et ses entites chargees par l'ancien classloader, d'ou des
    // ClassCastException du type "TSousMenu cannot be cast to TSousMenu".
    // Cette constante etant initialisee au chargement de la classe, chaque
    // deploiement (= nouveau classloader) obtient un nom different et donc
    // une session neuve.
    private static final String ECLIPSELINK_SESSION_NAME = PERSISTENCE_UNIT_NAME + "-" + UUID.randomUUID();

    private static EntityManagerFactory sharedEntityManagerFactory() {
        EntityManagerFactory factory = SHARED_EMF;
        if (factory == null || !factory.isOpen()) {
            synchronized (dataManager.class) {
                factory = SHARED_EMF;
                if (factory == null || !factory.isOpen()) {
                    Map<String, Object> props = new HashMap<>();
                    props.put("eclipselink.session-name", ECLIPSELINK_SESSION_NAME);
                    // Cache d'entites isole par EntityManager (pas de cache partage entre
                    // requetes) : c'est la semantique qu'avait l'application quand chaque
                    // requete creait sa propre factory (cache toujours vide au depart). Un
                    // cache partage par toute l'application exposerait des donnees perimees
                    // apres les updates SQL natifs du code metier et cree de la contention
                    // sur les identity maps EclipseLink (evictAll() de bllBase.persiste()
                    // a chaque ecriture, pendant que d'autres threads lisent).
                    props.put("eclipselink.cache.shared.default", "false");
                    factory = Persistence.createEntityManagerFactory(PERSISTENCE_UNIT_NAME, props);
                    SHARED_EMF = factory;
                }
            }
        }
        return factory;
    }

    /**
     * Ferme la factory partagee. A appeler UNIQUEMENT a l'arret/undeploy de l'application (voir dal.AppContextListener)
     * : sans cette fermeture, la session EclipseLink de l'ancien deploiement survit dans le registre du serveur et
     * renvoie des entites chargees par l'ancien classloader, d'ou des ClassCastException (TSousMenu -> TSousMenu) apres
     * un redeploiement a chaud.
     */
    public static void closeSharedEntityManagerFactory() {
        synchronized (dataManager.class) {
            EntityManagerFactory factory = SHARED_EMF;
            SHARED_EMF = null;
            if (factory != null && factory.isOpen()) {
                try {
                    factory.close();
                } catch (RuntimeException e) {
                    // Rien a faire : l'application s'arrete.
                }
            }
        }
    }

    private EntityTransaction Transaction;
    private boolean bTransactionGroupe = false;
    // début transaction

    public boolean isTransactionGroupe() {
        return bTransactionGroupe;
    }

    public void setTransactionGroupe(boolean pbTransactionGroupe) {
        this.bTransactionGroupe = pbTransactionGroupe;
    }

    public dataManager() {
        jdom.InitRessource();
        jdom.LoadRessource();
    }

    /*
     * public static void main(String[]ars) { dataManager m=new dataManager(); m.initEntityManager(); System.exit(0);
     *
     * }
     */
    public void initEntityManager() {

        setEmf(sharedEntityManagerFactory());
        setEm(getEmf().createEntityManager());
        isConected = true;

    }

    public void BeginTransaction() {
        // début transaction
        Transaction = em.getTransaction();

        Transaction.begin();
        // affichage personnes
    }

    public void beginTransaction() {

        Transaction = em.getTransaction();
        if (!Transaction.isActive()) {
            Transaction.begin();
        }

    }

    public void closeTransaction() {
        if (Transaction.isActive()) {
            Transaction.commit();
        }

    }

    public void CloseTransaction() {
        // début transaction
        Transaction.commit();
        // affichage personnes
    }

    public void RejectTransaction() {
        // début transaction
        Transaction.rollback();
        // affichage personnes
    }

    public void closeEntityManager() {
        // Ne ferme que l'EntityManager : la factory est partagee par toute l'application.
        // Une transaction RESOURCE_LOCAL encore active ici signifie qu'une exception est
        // survenue entre begin et commit dans le code metier (les catch historiques ne font
        // pas de rollback) : fermer l'EntityManager dans cet etat garderait la connexion
        // JDBC hors du pool pour toujours (pool jdbc/__laborex_pool partage par toute
        // l'application, qui finirait par se bloquer entierement). On rollback donc avant
        // de fermer, et la fermeture ne doit jamais faire echouer la requete appelante.
        EntityManager manager = getEm();
        isConected = false;
        if (manager == null) {
            return;
        }
        try {
            if (manager.isOpen()) {
                try {
                    EntityTransaction transaction = manager.getTransaction();
                    if (transaction != null && transaction.isActive()) {
                        Logger.getLogger(dataManager.class.getName()).warning(
                                "Transaction encore active a la fermeture de l'EntityManager : rollback automatique");
                        transaction.rollback();
                    }
                } catch (RuntimeException e) {
                    // au pire, la fermeture ci-dessous libere les ressources restantes
                }
                manager.close();
            }
        } catch (RuntimeException e) {
            // ne jamais propager une erreur de fermeture a la requete appelante
        }
    }

    /**
     * @return the emf
     */
    public EntityManagerFactory getEmf() {

        return emf;

    }

    /**
     * @param emf
     *            the emf to set
     */
    public void setEmf(EntityManagerFactory emf) {
        this.emf = emf;
    }

    /**
     * @return the em
     */
    public EntityManager getEm() {
        return em;
    }

    /**
     * @param em
     *            the em to set
     */
    public void setEm(EntityManager em) {
        this.em = em;
    }

}
