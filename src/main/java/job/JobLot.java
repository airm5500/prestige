package job;

import bll.common.Parameter;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TLot;
import dal.TLot_;
import dal.TParameters;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import toolkits.parameters.commonparameter;

/**
 *
 * @author user
 */
@Stateless
public class JobLot {

    private static final Logger LOG = Logger.getLogger(JobLot.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private config.AppConfig appConfig;

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void execute() {
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            LocalDate now = LocalDate.now();
            TParameters oTParameters = em.find(TParameters.class, "KEY_MONTH_PERIME");
            int qtyNumber = 0;
            if (oTParameters != null) {
                qtyNumber = Integer.parseInt(oTParameters.getStrVALUE());
            }
            LocalDate peremption = now.plusMonths(qtyNumber);

            List<TLot> lots = verifieLotCoursPreremption(now.minusMonths(12), peremption);

            int count = 0;
            for (TLot lot : lots) {
                count++;
                int qtyLot = lot.getIntNUMBER();
                int stockAct = qteStock(lot.getLgFAMILLEID().getLgFAMILLEID());

                if (stockAct > 0) {
                    int qteVendue = qteVendu(lot.getLgFAMILLEID().getLgFAMILLEID(),
                            lot.getDtCREATED().toInstant().atZone(ZoneId.systemDefault()).toLocalDate(),
                            LocalDate.now());

                    if (qtyLot <= qteVendue) {
                        lot.setIntQTYVENDUE(lot.getIntNUMBER());
                    } else {
                        updateLotStatut(lot, qteVendue);
                    }
                } else {
                    lot.setIntQTYVENDUE(qtyLot);
                }
                em.merge(lot);

                // flush toutes les 3 itérations pour réduire la mémoire de dirty-checking
                // sans em.clear() pour ne pas détacher les lots restants (relations LAZY)
                if (count % 3 == 0) {
                    em.flush();
                }
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    private List<TLot> verifieLotCoursPreremption(LocalDate now, LocalDate peremption) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TLot> cq = cb.createQuery(TLot.class);
            Root<TLot> root = cq.from(TLot.class);
            Predicate statut = cb.or(cb.equal(root.get(TLot_.strSTATUT), Parameter.STATUT_ENCOURS_PEREMPTION),
                    cb.equal(root.get(TLot_.strSTATUT), commonparameter.statut_is_Closed));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TLot_.dtPEREMPTION)),
                    java.sql.Date.valueOf(now), java.sql.Date.valueOf(peremption));
            Predicate notnull = cb.isNotNull(root.get(TLot_.dtPEREMPTION));
            Predicate pu = cb.greaterThan(root.get(TLot_.intNUMBER), root.get(TLot_.intQTYVENDUE));
            cq.where(statut, btw, pu, notnull);
            return em.createQuery(cq).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private int qteVendu(String lgFamilleId, LocalDate dateEntree, LocalDate now) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Predicate statut = cb.equal(root.get(TPreenregistrementDetail_.strSTATUT),
                    commonparameter.statut_is_Closed);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrementDetail_.dtUPDATED)),
                    java.sql.Date.valueOf(dateEntree), java.sql.Date.valueOf(now));
            Predicate famille = cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lgFamilleId);
            cq.select(cb.sum(root.get(TPreenregistrementDetail_.intQUANTITYSERVED)));
            cq.where(statut, btw, famille);
            Integer result = em.createQuery(cq).getSingleResult();
            return result != null ? result : 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private void updateLotStatut(TLot lot, int qty) {
        lot.setIntQTYVENDUE(qty);
        LocalDate dtPeremption = lot.getDtPEREMPTION().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        if (dtPeremption.isBefore(LocalDate.now())) {
            lot.setStrSTATUT(commonparameter.statut_perime);
        } else {
            lot.setStrSTATUT(Parameter.STATUT_ENCOURS_PEREMPTION);
        }
    }

    private int qteStock(String lgFamilleId) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            Predicate statut = cb.equal(root.get(TFamilleStock_.strSTATUT), commonparameter.statut_enable);
            Predicate famille = cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lgFamilleId);
            Predicate emplacement = cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), "1");
            cq.select(cb.sum(root.get(TFamilleStock_.intNUMBERAVAILABLE)));
            cq.where(statut, famille, emplacement);
            Integer result = em.createQuery(cq).setMaxResults(1).getSingleResult();
            return result != null ? result : 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }
}
