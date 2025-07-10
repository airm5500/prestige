/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stock.impl;

import javax.persistence.EntityManager;
import javax.persistence.ParameterMode;
import javax.persistence.StoredProcedureQuery;
import bll.stock.Stock;
import dal.TBonLivraisonDetail;
import dal.TOrder;
import dal.TOrderDetail;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.TypedQuery;

/**
 *
 * @author Kobena
 */
public class StockImpl implements Stock {

    private final EntityManager em;

    @Override
    public void setStatusInOrder(String lgFamilleID) throws Exception {
        StoredProcedureQuery p = getEntityManager().createStoredProcedureQuery("proc_indicateur_sugges");
        p.registerStoredProcedureParameter(1, String.class, ParameterMode.IN);
        p.setParameter(1, lgFamilleID);
        p.execute();
    }

    private EntityManager getEntityManager() {
        return em;
    }

    public StockImpl(EntityManager manager) {
        em = manager;
    }

    @Override
    public void deleteOrder(String lg_ORDER_ID) {
        try {
            TOrder order = em.find(TOrder.class, lg_ORDER_ID);
            List<TOrderDetail> lstTOrderDetail = getOrderItemByOrderId(lg_ORDER_ID);

            em.getTransaction().begin();
            lstTOrderDetail.forEach((t) -> {
                em.remove(t);
                try {
                    setStatusInOrder(t.getLgFAMILLEID().getLgFAMILLEID());
                } catch (Exception ex) {
                    Logger.getLogger(StockImpl.class.getName()).log(Level.SEVERE, null, ex);
                }
            });
            em.remove(order);
            em.getTransaction().commit();
        } catch (Exception e) {
            em.getTransaction().rollback();

        }

    }

    @Override
    public void deleteDetailsBonlivraison(String str_BONLIVRAISON_ID) throws Exception {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public List<TOrderDetail> getOrderItemByOrderId(String lg_ORDER_ID) throws Exception {
        TypedQuery<TOrderDetail> query = em.createQuery("SELECT o FROM TOrderDetail o WHERE o.lgORDERID.lgORDERID =?1",
                TOrderDetail.class);
        query.setParameter(1, lg_ORDER_ID);
        return query.getResultList();
    }

    @Override
    public List<TBonLivraisonDetail> getBonItemByBonId(String lg_BONLIVRAISON_ID) throws Exception {
        TypedQuery<TBonLivraisonDetail> query = em.createQuery(
                "SELECT o FROM TBonLivraisonDetail o WHERE o.lgBONLIVRAISONID.lgBONLIVRAISONID =?1",
                TBonLivraisonDetail.class);
        query.setParameter(1, lg_BONLIVRAISON_ID);
        return query.getResultList();
    }

}
