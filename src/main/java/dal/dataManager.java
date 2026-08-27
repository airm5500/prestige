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
                    // NE PAS desactiver le cache partage (eclipselink.cache.shared.default=false) :
                    // avec des entites isolees, EclipseLink sert les lectures via la connexion
                    // propre de la ClientSession, connexion qui n'est rendue au pool qu'a la
                    // fermeture de l'EntityManager. Or de nombreux flux historiques (JSP,
                    // tableau de bord) ne ferment jamais leur EntityManager : chaque lecture
                    // confisquerait alors une connexion du pool jdbc/__laborex_pool jusqu'a
                    // l'epuisement complet (plus aucune donnee dans toute l'application).
                    factory = Persistence.createEntityManagerFactory(PERSISTENCE_UNIT_NAME, props);
                    SHARED_EMF = factory;
                }
            }
        }
        return factory;
    }

    /**
     * Construit la factory partagee EN AVANCE, au demarrage de l'application (voir dal.AppContextListener).
     *
     * <p>
     * Sans ce prechauffage, la factory se construisait a la PREMIERE requete apres un (re)demarrage : EclipseLink relit
     * alors les metadonnees de toutes les classes du war - vingt a trente secondes sur un poste d'officine - et, le
     * verrou de classe etant tenu pendant la construction, TOUTES les requetes de la premiere vague (menu, tuiles du
     * tableau de bord) attendaient derriere. C'est le blocage photographie par le watchdog : quatre threads BLOCKED sur
     * dataManager.class pendant que le cinquieme construisait la factory.
     */
    public static void prechaufferSharedEntityManagerFactory() {
        long debut = System.currentTimeMillis();
        try {
            // createEntityManager + close : la factory seule ne suffit pas, EclipseLink ne
            // deploie la session et n'ouvre la connexion (login) qu'au premier EntityManager.
            sharedEntityManagerFactory().createEntityManager().close();
            java.util.logging.Logger.getLogger(dataManager.class.getName()).log(java.util.logging.Level.INFO,
                    "Factory JPA partagee prechauffee en {0} ms : la premiere requete ne paiera pas sa construction",
                    System.currentTimeMillis() - debut);
        } catch (RuntimeException e) {
            // La premiere requete retentera par le chemin normal ; ne pas empecher le demarrage.
            java.util.logging.Logger.getLogger(dataManager.class.getName()).log(java.util.logging.Level.WARNING,
                    "prechauffage de la factory JPA", e);
        }
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
                        signalerTransactionAbandonnee();
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
     * Journalise une transaction laissee active par le code metier (exception avalee entre begin et commit) : trace
     * serveur + evenement dans le Centre de Support avec l'origine exacte (classe.methode:ligne du flux fautif), pour
     * pouvoir corriger a la source. Best-effort : ne perturbe jamais la requete appelante.
     */
    private static void signalerTransactionAbandonnee() {
        String origine = "";
        StringBuilder texte = new StringBuilder();
        for (StackTraceElement frame : Thread.currentThread().getStackTrace()) {
            String classe = frame.getClassName();
            if (classe.startsWith("java.") || classe.startsWith("javax.") || classe.startsWith("jdk.")
                    || classe.startsWith("sun.") || classe.equals(dataManager.class.getName())) {
                continue;
            }
            if (origine.isEmpty()) {
                origine = classe + "." + frame.getMethodName() + ":" + frame.getLineNumber();
            }
            texte.append(frame).append('\n');
        }
        Logger.getLogger(dataManager.class.getName()).warning(
                "Transaction encore active a la fermeture de l'EntityManager (rollback automatique). Origine : "
                        + origine);
        try {
            rest.service.SupportEventService support = javax.enterprise.inject.spi.CDI.current()
                    .select(rest.service.SupportEventService.class).get();
            rest.service.dto.SupportEventDTO dto = new rest.service.dto.SupportEventDTO();
            dto.setType("JAVA");
            dto.setNiveau("ERROR");
            dto.setModule("BASE DE DONNEES");
            dto.setMessageCourt(
                    "Transaction non clôturée détectée (rollback automatique avant fermeture) : " + origine);
            dto.setUrlOuEcran(origine.length() > 255 ? origine.substring(0, 255) : origine);
            dto.setPayloadJson("Explication : une écriture en base a échoué sans que la transaction soit refermée par "
                    + "le code métier appelant. Sans le rollback automatique, la connexion JDBC associée resterait "
                    + "définitivement hors du pool partagé jdbc/__laborex_pool ; à force, le pool se vide et plus "
                    + "aucune donnée ne s'affiche dans l'application (REST et JSP) jusqu'au redémarrage du serveur. "
                    + "La pile ci-dessous identifie le flux à corriger à la source.");
            dto.setStack(texte.length() > 20000 ? texte.substring(0, 20000) : texte.toString());
            support.record(dto, "");
        } catch (RuntimeException e) {
            // centre de support indisponible (demarrage/arret) : la trace serveur ci-dessus reste
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
