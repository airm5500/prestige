package rest.service.impl;

import dal.TFamille;
import dal.TFamille_;
import dal.TParameters;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionManagement;
import javax.ejb.TransactionManagementType;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Root;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import org.apache.commons.lang3.StringUtils;
import rest.service.StockReapproService;
import util.DateUtil;

/**
 *
 * @author koben
 */
@TransactionManagement(value = TransactionManagementType.BEAN)
@Stateless
public class StockReapproServiceImpl implements StockReapproService {

    private static final Logger LOG = Logger.getLogger(StockReapproServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Inject
    private UserTransaction userTransaction;

    @Override
    public void execute() {
        if (!checkExecutePossible()) {
            return;
        }
        compute();

    }

    @Override
    public void computeReappro() {
        compute();
    }

    private void compute() {
        try {

            final int dayStock = getDayStock();
            final int delayReappro = getDelayReappro();
            LocalDate lastMonth = DateUtil.getLastMonthFromNow();
            LocalDate threeMonthAgo = DateUtil.getNthLastMonthFromNow(3);
            Date now = new Date();
            LOG.log(Level.INFO, "REAPPRO COMPUTE BEGIN AT ======>>>  {0} ", new Object[] { LocalDateTime.now() });
            userTransaction.begin();
            List<Produit> boiteCh = new ArrayList<>();
            Map<String, Integer> deconditiones = new HashMap<>();
            fetchConsommationProduit(threeMonthAgo, lastMonth).forEach((t) -> {
                String id = t.get("id", String.class);
                String parentId = t.get("parentId", String.class);
                int consommation = t.get("consommation", BigDecimal.class).intValue();
                short hasChild = t.get("hasChild", Byte.class).shortValue();
                short isChild = t.get("isChild", Byte.class).shortValue();
                Integer itemQuantity = t.get("itemQuantity", Integer.class);

                if (StringUtils.isEmpty(parentId) && (hasChild == 0)) {
                    Reappro reappro = compute(consommation, dayStock, delayReappro);
                    updateTFamille(id, reappro, now);
                } else {// boite CH
                    if (hasChild == 1 && StringUtils.isEmpty(parentId)) {
                        boiteCh.add(new Produit(id, consommation, itemQuantity));
                    } else if (isChild == 1) {
                        // deconditiones
                        deconditiones.put(parentId, consommation);
                    }
                }

            });

            computeBoiteCh(boiteCh, deconditiones, dayStock, delayReappro, now);
            computeInvendus(lastMonth, threeMonthAgo, deconditiones, dayStock, delayReappro, now);
            TParameters p = getParameters("KEY_DAY_SEUIL_REAPPRO");
            p.setStrVALUE(LocalDate.now().toString());
            p.setDtUPDATED(now);
            this.em.merge(p);
            userTransaction.commit();

        } catch (IllegalStateException | SecurityException | HeuristicMixedException | HeuristicRollbackException
                | NotSupportedException | RollbackException | SystemException e) {
            LOG.log(Level.SEVERE, null, e);
        }
        LOG.log(Level.INFO, "REAPPRO COMPUTE END AT ======>>>  {0} ", new Object[] { LocalDateTime.now() });

    }

    private void computeBoiteCh(List<Produit> boiteCh, Map<String, Integer> deconditiones, final int dayStock,
            final int delayReappro, Date now) {
        boiteCh.forEach((produit) -> {
            int conso = produit.getConsommation();
            int itemQty = produit.getItemQuantity();
            Integer itemQtySold = deconditiones.remove(produit.getProduitId());
            if (itemQtySold != null) {
                int itemConso = computeItemConso(itemQtySold, itemQty);
                conso += itemConso;
            }

            updateTFamille(produit.getProduitId(), compute(conso, dayStock, delayReappro), now);
        });
    }

    private int computeItemConso(int conso, int quantity) {
        return (int) Math.ceil(conso / Double.valueOf(quantity));
    }

    private void computeInvendus(LocalDate lastMonth, LocalDate threeMonthAgo, Map<String, Integer> deconditiones,
            final int dayStock, final int delayReappro, Date now) {

        produitsInvendus(threeMonthAgo, lastMonth).forEach((tuple) -> {
            String produitId = tuple.get("id", String.class);
            Integer itemQty = deconditiones.remove(produitId);
            if (itemQty != null) {
                int conso = computeItemConso(itemQty, tuple.get("itemQuantity", Integer.class));
                updateTFamille(produitId, compute(conso, dayStock, delayReappro), now);
            } else {
                updateTFamilleInvendus(tuple.get("id", String.class), now);
            }
        });

    }

    private List<Tuple> fetchConsommationProduit(LocalDate threeMonthAgo, LocalDate lastMonth) {
        String sql = "SELECT f.lg_FAMILLE_ID AS id, f.lg_FAMILLE_PARENT_ID AS parentId,SUM(d.int_QUANTITY) AS consommation, f.bool_DECONDITIONNE_EXIST AS hasChild,f.bool_DECONDITIONNE AS isChild,f.int_NUMBERDETAIL AS itemQuantity FROM  t_preenregistrement_detail d,t_famille f,t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID AND f.lg_FAMILLE_ID=d.lg_FAMILLE_ID "
                + " "
                + " AND f.str_STATUT='enable' AND p.str_STATUT='is_Closed' AND p.int_PRICE >0 AND p.b_IS_CANCEL=0 AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 GROUP BY f.lg_FAMILLE_ID";
        try {
            Query q = em.createNativeQuery(sql, Tuple.class);
            q.setParameter(1, java.sql.Date.valueOf(threeMonthAgo), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(lastMonth), TemporalType.DATE);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<Tuple> produitsInvendus(LocalDate threeMonthAgo, LocalDate lastMonth) {
        String sql = "SELECT pr.lg_FAMILLE_ID AS id,pr.int_NUMBERDETAIL AS itemQuantity FROM t_famille pr WHERE pr.bool_DECONDITIONNE=0 AND pr.lg_FAMILLE_ID NOT IN ( SELECT f.lg_FAMILLE_ID FROM  t_preenregistrement_detail d,t_famille f,t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID AND f.lg_FAMILLE_ID=d.lg_FAMILLE_ID "
                + " AND f.str_STATUT='enable' AND p.str_STATUT='is_Closed' AND p.int_PRICE >0 AND p.b_IS_CANCEL=0 AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2)";
        try {
            Query q = em.createNativeQuery(sql, Tuple.class);
            q.setParameter(1, java.sql.Date.valueOf(threeMonthAgo), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(lastMonth), TemporalType.DATE);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private void updateTFamille(String produitId, Reappro reappro, Date now) {

        CriteriaBuilder cb = this.em.getCriteriaBuilder();
        CriteriaUpdate<TFamille> update = cb.createCriteriaUpdate(TFamille.class);
        Root<TFamille> root = update.from(TFamille.class);
        update.set(TFamille_.INT_SE_UI_LM_IN, reappro.getSeuilMin());
        update.set(TFamille_.INT_SE_UI_LM_AX, reappro.getSeuilMax());
        update.set(TFamille_.INT_QT_ER_EA_PP_RO_VI_SI_ON_NE_ME_NT, reappro.getQuantity());
        update.set(TFamille_.DT_UP_DA_TE_D, now);
        update.set(TFamille_.DT_LA_ST_UP_DA_TE_SE_UI_LR_EA_PP_RO, now);
        update.where(cb.equal(root.get(TFamille_.lgFAMILLEID), produitId));
        this.em.createQuery(update).executeUpdate();
    }

    private void updateTFamilleInvendus(String produitId, Date now) {

        CriteriaBuilder cb = this.em.getCriteriaBuilder();
        CriteriaUpdate<TFamille> update = cb.createCriteriaUpdate(TFamille.class);
        Root<TFamille> root = update.from(TFamille.class);
        update.set(TFamille_.INT_SE_UI_LM_IN, 0);
        update.set(TFamille_.INT_SE_UI_LM_AX, 0);
        update.set(TFamille_.INT_QT_ER_EA_PP_RO_VI_SI_ON_NE_ME_NT, 0);
        update.set(TFamille_.DT_UP_DA_TE_D, now);
        update.set(TFamille_.DT_LA_ST_UP_DA_TE_SE_UI_LR_EA_PP_RO, now);
        update.where(cb.equal(root.get(TFamille_.lgFAMILLEID), produitId));
        this.em.createQuery(update).executeUpdate();
    }

    private TParameters getParameters(String key) {
        try {
            return em.getReference(TParameters.class, key);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private boolean checkExecutePossible() {

        TParameters p = getParameters("KEY_DAY_SEUIL_REAPPRO");// derniere date de mise a jour stock reappro
        if (p == null) {
            return false;
        }
        LocalDate date = LocalDate.parse(p.getStrVALUE());
        return (date.getMonthValue() != LocalDate.now().getMonthValue());

    }

    public Integer getDayStock() {

        TParameters p = getParameters("KEY_DAY_STOCK");
        if (p == null) {
            return 0;
        }
        return Integer.valueOf(p.getStrVALUE().trim());
    }

    public Integer getDelayReappro() {

        TParameters p = getParameters("KEY_DELAI_REAPPRO");
        if (p == null) {
            return 0;
        }
        return Integer.valueOf(p.getStrVALUE().trim());
    }

    private Reappro compute(int soldQuantity, int dayStock, int delayReappro) {
        double soldQuantityAvg = soldQuantity / 84.0d;
        int seuilMin = (int) Math.ceil(soldQuantityAvg * dayStock);
        int seuilMax = seuilMin * dayStock;
        int quantityReappro = (int) Math.ceil(soldQuantityAvg * delayReappro);
        return new Reappro(seuilMin, seuilMax, quantityReappro);
    }

    private class Reappro {

        private final int seuilMin;
        private final int seuilMax;
        private final int quantity;

        public Reappro(int seuilMin, int seuilMax, int quantity) {
            this.seuilMin = seuilMin;
            this.seuilMax = seuilMax;
            this.quantity = quantity;
        }

        public int getQuantity() {
            return quantity;
        }

        public int getSeuilMin() {
            return seuilMin;
        }

        public int getSeuilMax() {
            return seuilMax;
        }

    }

    private class Produit {

        private final String produitId;
        private final int consommation;
        private final int itemQuantity;

        public Produit(String produitId, int consommation, int itemQuantity) {
            this.produitId = produitId;
            this.consommation = consommation;
            this.itemQuantity = itemQuantity;
        }

        public int getItemQuantity() {
            return itemQuantity;
        }

        public String getProduitId() {
            return produitId;
        }

        public int getConsommation() {
            return consommation;
        }

    }
}
