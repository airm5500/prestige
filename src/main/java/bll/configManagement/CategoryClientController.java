/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.configManagement.exceptions.NonexistentEntityException;
import bll.configManagement.exceptions.PreexistingEntityException;
import dal.TCategoryClient;
import java.io.Serializable;
import javax.persistence.Query;
import javax.persistence.EntityNotFoundException;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import dal.TClient;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.criteria.CriteriaBuilder;

/**
 *
 * @author KKOFFI
 */
public class CategoryClientController implements Serializable {

    /**
     *
     */
    private static final long serialVersionUID = 1L;

    public CategoryClientController(EntityManagerFactory emf) {
        this.emf = emf;
    }

    private EntityManagerFactory emf = null;

    public EntityManager getEntityManager() {
        return emf.createEntityManager();
    }

    public boolean create(TCategoryClient TCategoryClient) throws PreexistingEntityException, Exception {
        boolean isOK = false;
        if (TCategoryClient.getTClientCollection() == null) {
            TCategoryClient.setTClientCollection(new ArrayList<>());
        }
        EntityManager em = null;
        try {
            em = getEntityManager();
            em.getTransaction().begin();
            Collection<TClient> attachedTClientCollection = new ArrayList<>();
            for (TClient TClientCollectionTClientToAttach : TCategoryClient.getTClientCollection()) {
                TClientCollectionTClientToAttach = em.getReference(TClientCollectionTClientToAttach.getClass(),
                        TClientCollectionTClientToAttach.getLgCLIENTID());
                attachedTClientCollection.add(TClientCollectionTClientToAttach);
            }
            TCategoryClient.setTClientCollection(attachedTClientCollection);
            em.persist(TCategoryClient);
            for (TClient TClientCollectionTClient : TCategoryClient.getTClientCollection()) {
                TCategoryClient oldLgCATEGORYCLIENTIDOfTClientCollectionTClient = TClientCollectionTClient
                        .getLgCATEGORYCLIENTID();
                TClientCollectionTClient.setLgCATEGORYCLIENTID(TCategoryClient);
                TClientCollectionTClient = em.merge(TClientCollectionTClient);
                if (oldLgCATEGORYCLIENTIDOfTClientCollectionTClient != null) {
                    oldLgCATEGORYCLIENTIDOfTClientCollectionTClient.getTClientCollection()
                            .remove(TClientCollectionTClient);
                    oldLgCATEGORYCLIENTIDOfTClientCollectionTClient = em
                            .merge(oldLgCATEGORYCLIENTIDOfTClientCollectionTClient);
                }
            }
            em.getTransaction().commit();
            isOK = true;
        } catch (Exception ex) {

            if (findTCategoryClient(TCategoryClient.getLgCATEGORYCLIENTID()) != null) {

                throw new PreexistingEntityException("TCategoryClient " + TCategoryClient + " already exists.", ex);
            }
            throw ex;
        } finally {
            if (em != null) {

            }

        }
        return isOK;
    }

    public boolean edit(TCategoryClient TCategoryClient) throws NonexistentEntityException, Exception {
        EntityManager em = null;
        boolean isOK = false;
        try {
            em = getEntityManager();
            em.getTransaction().begin();
            TCategoryClient persistentTCategoryClient = em.find(TCategoryClient.class,
                    TCategoryClient.getLgCATEGORYCLIENTID());
            Collection<TClient> TClientCollectionOld = persistentTCategoryClient.getTClientCollection();
            Collection<TClient> TClientCollectionNew = TCategoryClient.getTClientCollection();
            Collection<TClient> attachedTClientCollectionNew = new ArrayList<>();
            for (TClient TClientCollectionNewTClientToAttach : TClientCollectionNew) {
                TClientCollectionNewTClientToAttach = em.getReference(TClientCollectionNewTClientToAttach.getClass(),
                        TClientCollectionNewTClientToAttach.getLgCLIENTID());
                attachedTClientCollectionNew.add(TClientCollectionNewTClientToAttach);
            }
            TClientCollectionNew = attachedTClientCollectionNew;
            TCategoryClient.setTClientCollection(TClientCollectionNew);
            TCategoryClient = em.merge(TCategoryClient);
            for (TClient TClientCollectionOldTClient : TClientCollectionOld) {
                if (!TClientCollectionNew.contains(TClientCollectionOldTClient)) {
                    TClientCollectionOldTClient.setLgCATEGORYCLIENTID(null);
                    TClientCollectionOldTClient = em.merge(TClientCollectionOldTClient);
                }
            }
            for (TClient TClientCollectionNewTClient : TClientCollectionNew) {
                if (!TClientCollectionOld.contains(TClientCollectionNewTClient)) {
                    TCategoryClient oldLgCATEGORYCLIENTIDOfTClientCollectionNewTClient = TClientCollectionNewTClient
                            .getLgCATEGORYCLIENTID();
                    TClientCollectionNewTClient.setLgCATEGORYCLIENTID(TCategoryClient);
                    TClientCollectionNewTClient = em.merge(TClientCollectionNewTClient);
                    if (oldLgCATEGORYCLIENTIDOfTClientCollectionNewTClient != null
                            && !oldLgCATEGORYCLIENTIDOfTClientCollectionNewTClient.equals(TCategoryClient)) {
                        oldLgCATEGORYCLIENTIDOfTClientCollectionNewTClient.getTClientCollection()
                                .remove(TClientCollectionNewTClient);
                        oldLgCATEGORYCLIENTIDOfTClientCollectionNewTClient = em
                                .merge(oldLgCATEGORYCLIENTIDOfTClientCollectionNewTClient);
                    }
                }
            }
            em.getTransaction().commit();
            isOK = true;
        } catch (Exception ex) {
            String msg = ex.getLocalizedMessage();
            if (msg == null || msg.length() == 0) {
                String id = TCategoryClient.getLgCATEGORYCLIENTID();
                if (findTCategoryClient(id) == null) {
                    throw new NonexistentEntityException("The tCategoryClient with id " + id + " no longer exists.");
                }
            }
            throw ex;
        } finally {
            if (em != null) {

            }
        }
        return isOK;
    }

    public boolean destroy(String id) throws NonexistentEntityException {
        EntityManager em = null;
        boolean isOK = false;
        try {
            em = getEntityManager();
            em.getTransaction().begin();
            TCategoryClient TCategoryClient;
            try {
                TCategoryClient = em.getReference(TCategoryClient.class, id);
                TCategoryClient.getLgCATEGORYCLIENTID();
            } catch (EntityNotFoundException enfe) {
                throw new NonexistentEntityException("The TCategoryClient with id " + id + " no longer exists.", enfe);
            }
            Collection<TClient> TClientCollection = TCategoryClient.getTClientCollection();
            for (TClient TClientCollectionTClient : TClientCollection) {
                TClientCollectionTClient.setLgCATEGORYCLIENTID(null);
                TClientCollectionTClient = em.merge(TClientCollectionTClient);
            }
            em.remove(TCategoryClient);
            em.getTransaction().commit();
            isOK = true;
        } finally {
            if (em != null) {

            }
        }
        return isOK;
    }

    public List<TCategoryClient> findTCategoryClientEntities() {
        return findTCategoryClientEntities(true, -1, -1, "");
    }

    public List<TCategoryClient> findTCategoryClientEntities(int maxResults, int firstResult, String str_LIBELLE) {
        return findTCategoryClientEntities(false, maxResults, firstResult, str_LIBELLE);
    }

    private List<TCategoryClient> findTCategoryClientEntities(boolean all, int maxResults, int firstResult,
            String str_LIBELLE) {
        EntityManager em = getEntityManager();
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TCategoryClient> cq = cb.createQuery(TCategoryClient.class);
            Root<TCategoryClient> root = cq.from(TCategoryClient.class);
            cq.select(root);
            cq.where(cb.like(root.get("strLIBELLE"), str_LIBELLE + "%"));
            Query q = em.createQuery(cq);
            if (!all) {
                q.setMaxResults(maxResults);
                q.setFirstResult(firstResult);
            }
            return q.getResultList();
        } finally {

        }
    }

    public TCategoryClient findTCategoryClient(String id) {
        EntityManager em = getEntityManager();
        try {
            return em.find(TCategoryClient.class, id);
        } finally {

        }
    }

    public int getTCategoryClientCount(String search) {
        EntityManager em = getEntityManager();
        try {
            /*
             * CriteriaQuery cq = em.getCriteriaBuilder().createQuery(); Root<TCategoryClient> rt =
             * cq.from(TCategoryClient.class); cq.select(em.getCriteriaBuilder().count(rt));
             */

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TCategoryClient> rt = cq.from(TCategoryClient.class);
            cq.select(cb.count(rt));
            cq.where(cb.like(rt.get("strLIBELLE"), search + "%"));
            Query q = em.createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();
        } finally {

        }
    }

}
