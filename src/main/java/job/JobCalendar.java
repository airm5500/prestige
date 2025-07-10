/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import dal.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.annotation.PostConstruct;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.Root;
import util.DateConverter;

/**
 *
 * @author KKOFFI
 */
@Singleton
@Startup
public class JobCalendar {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEm() {
        return em;
    }

    @PostConstruct
    public void init() {
        exec();
        removeFacture();
        removeSuggestionO();
        // updateOrderDetailPrices();
    }

    @Schedule(hour = "0", dayOfMonth = "*", persistent = false)
    public void execute() {
        exec();

    }

    public void exec() {
        try {
            Optional<TCalendrier> optional = getOneByCurrentDay();
            if (optional.isPresent()) {
                TCalendrier calendrier = optional.get();
                LocalDate now = LocalDate.now();
                if (calendrier.getDtDay() == null) {
                    calendrier.setDtDay(LocalDate.now());
                    calendrier.setDtUPDATED(new Date());
                    calendrier.setIntNUMBERJOUR(calendrier.getIntNUMBERJOUR() + 1);
                    int lengthOfMounth = LocalDate.now().lengthOfMonth();
                    if (LocalDate.now().getDayOfMonth() == lengthOfMounth) {
                        calendrier.setDtEND(new Date());
                    }

                } else if (!now.isEqual(calendrier.getDtDay())) {
                    calendrier.setDtDay(LocalDate.now());
                    calendrier.setDtUPDATED(new Date());
                    calendrier.setIntNUMBERJOUR(calendrier.getIntNUMBERJOUR() + 1);
                    int lengthOfMounth = LocalDate.now().lengthOfMonth();
                    if (LocalDate.now().getDayOfMonth() == lengthOfMounth) {
                        calendrier.setDtEND(new Date());
                    }

                }
                getEm().merge(calendrier);

            } else {

                createNewCalendar();

            }

        } catch (Exception e) {

        }
    }

    public void createNewCalendar() {
        LocalDate now = LocalDate.now();
        var date = new Date();
        TCalendrier calendrier = new TCalendrier(UUID.randomUUID().toString());
        calendrier.setDtBEGIN(date);
        calendrier.setDtEND(date);
        calendrier.setDtCREATED(date);
        calendrier.setDtUPDATED(date);
        calendrier.setStrSTATUT("enable");
        calendrier.setIntANNEE(now.getYear());
        calendrier.setIntNUMBERJOUR(1);
        calendrier.setLgMONTHID(new TMonth(now.getMonthValue() + ""));
        calendrier.setDtDay(now);
        getEm().persist(calendrier);
    }

    public Optional<TCalendrier> getOneByCurrentDay() {
        try {
            LocalDate now = LocalDate.now();
            TypedQuery<TCalendrier> tq = getEm().createQuery(
                    "SELECT o FROM TCalendrier o WHERE  o.lgMONTHID.lgMONTHID=?1 AND o.intANNEE=?2 ORDER BY o.dtDay DESC ",
                    TCalendrier.class);
            tq.setParameter(1, now.getMonthValue() + "");
            tq.setParameter(2, now.getYear());
            tq.setMaxResults(1);
            TCalendrier o = tq.getSingleResult();
            return o != null ? Optional.of(o) : Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public List<TFacture> findFactureProvisoires() {
        try {

            TypedQuery<TFacture> tq = getEm().createQuery(
                    "SELECT o FROM TFacture o WHERE  FUNCTION('DATE',o.dtCREATED) < ?1  AND  o.template = TRUE ",
                    TFacture.class);
            tq.setParameter(1, java.sql.Date.valueOf(LocalDate.now()));
            return tq.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void removeFacture() {
        findFactureProvisoires().forEach(d -> {
            deleteFactureDetails(d);
            getEm().remove(d);
        });
    }

    public void deleteFactureDetails(TFacture facture) {
        try {
            CriteriaBuilder cb = getEm().getCriteriaBuilder();
            CriteriaDelete<TFactureDetail> q = cb.createCriteriaDelete(TFactureDetail.class);
            Root<TFactureDetail> root = q.from(TFactureDetail.class);
            q.where(cb.equal(root.get(TFactureDetail_.lgFACTUREID), facture));
            getEm().createQuery(q).executeUpdate();
        } catch (Exception e) {

        }
    }

    public void deleteSuggestionDetails(TSuggestionOrder order) {
        try {
            CriteriaBuilder cb = getEm().getCriteriaBuilder();
            CriteriaDelete<TSuggestionOrderDetails> q = cb.createCriteriaDelete(TSuggestionOrderDetails.class);
            Root<TSuggestionOrderDetails> root = q.from(TSuggestionOrderDetails.class);
            q.where(cb.equal(root.get(TSuggestionOrderDetails_.lgSUGGESTIONORDERID), order));
            getEm().createQuery(q).executeUpdate();
        } catch (Exception e) {

        }
    }

    public List<TSuggestionOrder> findSuggestionOrders() {
        try {

            TypedQuery<TSuggestionOrder> tq = getEm().createQuery(
                    "SELECT o FROM TSuggestionOrder o WHERE  FUNCTION('DATE',o.dtCREATED) < ?1  AND  o.strSTATUT=?2 ",
                    TSuggestionOrder.class);
            tq.setParameter(1, java.sql.Date.valueOf(LocalDate.now()));
            tq.setParameter(2, DateConverter.STATUT_ENABLE);
            return tq.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public List<TSuggestionOrder> findSuggestionOrdersO() {
        try {
            TypedQuery<TSuggestionOrder> tq = getEm().createQuery(
                    "SELECT o FROM TSuggestionOrder o WHERE  FUNCTION('DATE',o.dtCREATED) < ?1 ",
                    TSuggestionOrder.class);
            tq.setParameter(1, java.sql.Date.valueOf(LocalDate.now().minusMonths(1)));
            return tq.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void removeSuggestionO() {
        findSuggestionOrdersO().forEach(d -> {
            deleteSuggestionDetails(d);
            getEm().remove(d);
        });
    }

    private List<TFamilleGrossiste> listDonPriceIsZero() {
        try {
            TypedQuery<TFamilleGrossiste> q = this.getEm().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE  o.strSTATUT='enable' AND (o.intPAF=0 OR o.intPRICE=0)",
                    TFamilleGrossiste.class);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void updateOrderDetailPrices() {
        listDonPriceIsZero().forEach(e -> {
            TFamille famille = e.getLgFAMILLEID();
            e.setIntPAF(e.getIntPAF().compareTo(0) == 0 ? famille.getIntPAF() : e.getIntPAF());
            e.setIntPRICE(e.getIntPRICE().compareTo(0) == 0 ? famille.getIntPRICE() : e.getIntPRICE());
            e.setDtUPDATED(new Date());
            getEm().merge(e);
        });
    }
}
