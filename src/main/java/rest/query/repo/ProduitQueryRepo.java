/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.query.repo;

import dal.GammeProduit;
import dal.Groupefournisseur;
import dal.Laboratoire;
import dal.enumeration.Statut;
import java.util.Collections;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
@Stateless
public class ProduitQueryRepo {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    EntityManager getEntityManager() {
        return em;
    }

    public List<Groupefournisseur> findAllGroupeFournisseurs(String query) {
        try {
            TypedQuery<Groupefournisseur> q;
            if (StringUtils.isEmpty(query)) {
                q = getEntityManager().createQuery("SELECT OBJECT(o) FROM Groupefournisseur o ORDER BY o.libelle ASC",
                        Groupefournisseur.class);
                return q.getResultList();
            }
            q = getEntityManager().createQuery(
                    "SELECT OBJECT(o) FROM Groupefournisseur o WHERE O.libelle LIKE ?1 ORDER BY o.libelle ASC",
                    Groupefournisseur.class);

            q.setParameter(1, query + "%");
            return q.getResultList();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }
    }

    public Long countGammeProduit(String query) {
        try {
            TypedQuery<Long> q;
            if (StringUtils.isEmpty(query)) {
                q = getEntityManager().createQuery(
                        "SELECT COUNT(o) FROM GammeProduit o WHERE o.status=?1 ORDER BY o.libelle ASC", Long.class);
                q.setParameter(1, Statut.ENABLE);
                return q.getSingleResult();
            }
            q = getEntityManager().createQuery(
                    "SELECT COUNT(o) FROM GammeProduit o WHERE (O.libelle LIKE ?1 OR o.code LIKE ?1 )AND o.status=?2 AND  ORDER BY o.libelle ASC",
                    Long.class);
            q.setParameter(1, query + "%");
            q.setParameter(2, Statut.ENABLE);
            return q.getSingleResult();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return 0l;
        }
    }

    public Long countLaboratoire(String query) {
        try {
            TypedQuery<Long> q;
            if (StringUtils.isEmpty(query)) {
                q = getEntityManager().createQuery(
                        "SELECT COUNT(o) FROM Laboratoire o WHERE o.status=?1 ORDER BY o.libelle ASC", Long.class);
                q.setParameter(1, Statut.ENABLE);
                return q.getSingleResult();
            }
            q = getEntityManager().createQuery(
                    "SELECT COUNT(o) FROM Laboratoire o WHERE (O.libelle LIKE ?1 OR o.code LIKE ?1 )AND o.status=?2 AND  ORDER BY o.libelle ASC",
                    Long.class);
            q.setParameter(1, query + "%");
            q.setParameter(2, Statut.ENABLE);
            return q.getSingleResult();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return 0l;
        }
    }

    public List<GammeProduit> findAllGammeProduit(String query, int start, int limit, boolean all) {
        try {
            TypedQuery<GammeProduit> q;
            if (StringUtils.isEmpty(query)) {
                q = getEntityManager().createQuery(
                        "SELECT OBJECT(o) FROM GammeProduit o WHERE o.status=?1 ORDER BY o.libelle ASC",
                        GammeProduit.class);
                q.setParameter(1, Statut.ENABLE);
                if (!all) {
                    q.setFirstResult(start);
                    q.setMaxResults(limit);
                }
                return q.getResultList();
            }
            q = getEntityManager().createQuery(
                    "SELECT OBJECT(o) FROM GammeProduit o WHERE (O.libelle LIKE ?1 OR o.code LIKE ?1 )AND o.status=?2 AND  ORDER BY o.libelle ASC",
                    GammeProduit.class);
            q.setParameter(1, query + "%");
            q.setParameter(2, Statut.ENABLE);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }
    }

    public List<Laboratoire> findAllLaboratoire(String query, int start, int limit, boolean all) {
        try {
            TypedQuery<Laboratoire> q;
            if (StringUtils.isEmpty(query)) {
                q = getEntityManager().createQuery(
                        "SELECT OBJECT(o) FROM Laboratoire o WHERE o.status=?1 ORDER BY o.libelle ASC",
                        Laboratoire.class);
                q.setParameter(1, Statut.ENABLE);
                if (!all) {
                    q.setFirstResult(start);
                    q.setMaxResults(limit);
                }
                return q.getResultList();
            }
            q = getEntityManager().createQuery(
                    "SELECT OBJECT(o) FROM Laboratoire o WHERE (O.libelle LIKE ?1 OR o.code LIKE ?1 )AND o.status=?2 AND  ORDER BY o.libelle ASC",
                    Laboratoire.class);
            q.setParameter(1, query + "%");
            q.setParameter(2, Statut.ENABLE);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }
    }

}
