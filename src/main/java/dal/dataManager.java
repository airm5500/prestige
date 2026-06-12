/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

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

    private static EntityManagerFactory sharedEntityManagerFactory() {
        EntityManagerFactory factory = SHARED_EMF;
        if (factory == null || !factory.isOpen()) {
            synchronized (dataManager.class) {
                factory = SHARED_EMF;
                if (factory == null || !factory.isOpen()) {
                    factory = Persistence.createEntityManagerFactory(PERSISTENCE_UNIT_NAME);
                    SHARED_EMF = factory;
                }
            }
        }
        return factory;
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
        getEm().close();
        isConected = false;
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
