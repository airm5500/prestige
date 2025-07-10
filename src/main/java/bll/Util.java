/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll;

import dal.TPrivilege;
import dal.TPrivilege_;
import dal.TRole;
import dal.TRolePrivelege;
import dal.TRole_;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;

/**
 *
 * @author KKOFFI
 */
public class Util {

    public static final String ACTIONDELETEINVOICE = "03092017";
    public static final String ACTIONDELETERETOUR = "030920171";
    public static final String ACTIONDELETEAJUSTEMENT = "030920172";
    public static final String ACTIONDELETE = "06042016";
    public static final String DEPOT_EXTENSION = "5";
    public static final String DEPOT_AGREE = "4";
    public static final String VENTE_ASSURANCE = "2";
    public static final String ACTION_REGLER_FACTURE = "16012021";

    public static boolean isAllowed(EntityManager em, String actionID, String roleID) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TRolePrivelege> root = cq.from(TRolePrivelege.class);
            Join<TRolePrivelege, TPrivilege> rp = root.join("lgPRIVILEGEID", JoinType.INNER);
            Join<TRolePrivelege, TRole> r = root.join("lgROLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(r.get(TRole_.lgROLEID), roleID));
            criteria = cb.and(criteria, cb.equal(rp.get(TPrivilege_.lgPRIVELEGEID), actionID));
            cq.select(cb.count(root));
            cq.where(criteria);
            Query q = em.createQuery(cq);

            return (((Long) q.getSingleResult()).intValue() > 0);
        } finally {
            if (em != null) {
                // em.close();
            }
        }
    }
}
