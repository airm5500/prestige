package job;

import bll.common.Parameter;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TLot;
import dal.TLot_;
import dal.TParameters;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.dataManager;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import toolkits.parameters.commonparameter;

/**
 *
 * @author user
 */
public class JobLot implements Job {
    private final SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd");
    dataManager OdaManager = null;

    public JobLot() {
        OdaManager = new dataManager();
        OdaManager.initEntityManager();
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        EntityManager em = OdaManager.getEm();
        try {
            LocalDate now = LocalDate.now();
            TParameters OTParameters = em.getReference(TParameters.class, "KEY_MONTH_PERIME");
            int int_NUMBER = 0;
            if (OTParameters != null) {
                int_NUMBER = Integer.parseInt(OTParameters.getStrVALUE());
            }
            LocalDate peremption = now.plusMonths(int_NUMBER);
            em.getTransaction().begin();

            List<TLot> lots = verifieLotCoursPreremption(em, now.minusMonths(12), peremption);

            int count = 0;

            for (TLot lot : lots) {
                count++;
                int qtyLot = lot.getIntNUMBER();
                int stockAct = qteStock(em, lot.getLgFAMILLEID().getLgFAMILLEID());

                if (stockAct > 0) {
                    int qteVendue = qteVendu(em, lot.getLgFAMILLEID().getLgFAMILLEID(),
                            lot.getDtCREATED().toInstant().atZone(ZoneId.systemDefault()).toLocalDate(),
                            LocalDate.now());

                    if (qtyLot <= qteVendue) {
                        updateLot(lot, em);
                    } else {
                        updateLotStatut(lot, em, qteVendue);
                    }

                } else {
                    lot.setIntQTYVENDUE(qtyLot);
                    em.merge(lot);
                }
                if (count % 3 == 0) {
                    em.getTransaction().commit();
                    em.getTransaction().begin();
                }
            }
            em.getTransaction().commit();
            em.clear();
            // em.close();

        } catch (Exception e) {

        }

    }

    public List<TLot> verifieLotCoursPreremption(EntityManager em, LocalDate now, LocalDate peremption) {
        List<TLot> lots = new ArrayList<>();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TLot> cq = cb.createQuery(TLot.class);
            Root<TLot> root = cq.from(TLot.class);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.or(cb.equal(root.get(TLot_.strSTATUT), Parameter.STATUT_ENCOURS_PEREMPTION),
                    cb.equal(root.get(TLot_.strSTATUT), commonparameter.statut_is_Closed)));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TLot_.dtPEREMPTION)),
                    java.sql.Date.valueOf(now), java.sql.Date.valueOf(peremption));
            Predicate notnull = cb.isNotNull(root.get(TLot_.dtPEREMPTION));
            Predicate pu = cb.greaterThan(root.get(TLot_.intNUMBER), root.get(TLot_.intQTYVENDUE));
            cq.where(criteria, btw, pu, notnull);
            Query q = em.createQuery(cq);
            lots = q.getResultList();

        } catch (Exception e) {

            e.printStackTrace();
        }
        return lots;
    }

    private int qteVendu(EntityManager em, String lg_FAMILLE_ID, LocalDate dateentree, LocalDate now) {
        int qte = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Predicate criteria = cb.equal(root.get(TPreenregistrementDetail_.strSTATUT),
                    commonparameter.statut_is_Closed);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrementDetail_.dtUPDATED)),
                    java.sql.Date.valueOf(dateentree), java.sql.Date.valueOf(now));
            criteria = cb.and(criteria, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lg_FAMILLE_ID));
            cq.select(cb.sum(root.get(TPreenregistrementDetail_.intQUANTITYSERVED)));
            cq.where(criteria, btw);
            Query q = em.createQuery(cq);
            qte = (Integer) q.getSingleResult();

        } catch (Exception e) {

        }
        return qte;
    }

    private void updateLot(TLot lot, EntityManager em) {
        try {
            lot.setIntQTYVENDUE(lot.getIntNUMBER());
            em.merge(lot);
        } catch (Exception e) {
        }
    }

    private void updateLotStatut(TLot lot, EntityManager em, int qty) {
        try {
            lot.setIntQTYVENDUE(qty);
            LocalDate now = LocalDate.now();
            LocalDate dtpremption = LocalDate.parse(format.format(lot.getDtPEREMPTION()));
            if (dtpremption.isBefore(now)) {
                lot.setStrSTATUT(commonparameter.statut_perime);
            } else {
                lot.setStrSTATUT(Parameter.STATUT_ENCOURS_PEREMPTION);
            }
            em.merge(lot);
        } catch (Exception e) {
        }
    }

    private int qteStock(EntityManager em, String lg_FAMILLE_ID) {
        int qte = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            Predicate criteria = cb.equal(root.get(TFamilleStock_.strSTATUT), commonparameter.statut_enable);
            // Predicate btw = cb.between(cb.function("DATE", Date.class,
            // root.get(TPreenregistrementDetail_.dtUPDATED)), java.sql.Date.valueOf(dateentree),
            // java.sql.Date.valueOf(now));
            criteria = cb.and(criteria, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lg_FAMILLE_ID));
            criteria = cb.and(criteria, cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), "1"));
            cq.select(cb.sum(root.get(TFamilleStock_.intNUMBERAVAILABLE)));
            cq.where(criteria);
            Query q = em.createQuery(cq);
            q.setMaxResults(1);
            qte = (Integer) q.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace(System.err);
        }
        return qte;
    }
}
