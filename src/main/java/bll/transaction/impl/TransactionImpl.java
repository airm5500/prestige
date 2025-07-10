/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.transaction.impl;

import bll.common.Parameter;
import bll.transaction.Transaction;
import dal.AnnulationSnapshot;
import dal.TCashTransaction;
import dal.TCashTransaction_;
import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrement_;
import dal.TRecettes;
import dal.TRecettes_;
import dal.TReglement;
import dal.TUser;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;

/**
 *
 * @author Kobena
 */
public class TransactionImpl implements Transaction {

    private final EntityManager em;

    @Override
    public List<TRecettes> getRecetteses(LocalDate start, LocalDate end) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public Double getMontantRecetteses(LocalDate start, LocalDate end) throws Exception {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Double> cq = cb.createQuery(Double.class);
        Root<TRecettes> root = cq.from(TRecettes.class);
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TRecettes_.dtCREATED)),
                java.sql.Date.valueOf(start), java.sql.Date.valueOf(end));
        cq.select(cb.sum(root.get(TRecettes_.intAMOUNT)));
        cq.where(btw);
        Query q = em.createQuery(cq);
        Double amount = (Double) q.getSingleResult();
        if (amount == null) {
            return 0.0;
        }
        return amount;
    }

    public TransactionImpl(EntityManager _manager) {
        em = _manager;
    }

    @Override
    public Integer getBalanceRegl(String dt_start, String dt_end, String typevente, String lgEmp,
            String lgTYPEREGLEMENTID) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public Integer getBalanceRegl(String dt_start, String dt_end, String lgEmp, String lgTYPEREGLEMENTID) {

        Integer diff = 0;
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);
            Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate,
                    cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            predicate = cb.and(predicate,
                    cb.equal(pr.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
            predicate = cb.and(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), lgTYPEREGLEMENTID));
            Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, btw, ge);
            Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);
            cq.select(cb.sum(root.get(TCashTransaction_.intAMOUNT)));
            cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));
            Query q = em.createQuery(cq);
            diff = (Integer) q.getSingleResult();
            if (diff == null) {
                diff = 0;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return diff;
    }

    private TPreenregistrement findAnnulations(String idVente) {

        try {
            Query q = em.createQuery(
                    "SELECT o.preenregistrement FROM AnnulationSnapshot o WHERE o.preenregistrement.lgPREENREGISTREMENTID=?1 ");
            q.setParameter(1, idVente);
            q.setMaxResults(1);
            return (TPreenregistrement) q.getSingleResult();
        } catch (Exception e) {
            // e.printStackTrace(System.err);
            return null;
        }

    }

    private List<TPreenregistrement> findAnnulations(String dt_start, String dt_end, String emp) {

        try {
            Query q = em.createQuery(
                    "SELECT o.preenregistrement FROM AnnulationSnapshot o WHERE  FUNCTION('DATE',o.dateOp)  BETWEEN ?1 AND ?2 AND o.emplacement.lgEMPLACEMENTID=?3 ");
            q.setParameter(1, java.sql.Date.valueOf(dt_start), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(dt_end), TemporalType.DATE);
            q.setParameter(3, emp);
            return q.getResultList();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }

    }

    @Override
    public JSONObject getDataActivites(String dt_start, String dt_end, String emp, int start, int limit) {
        JSONObject jsono = new JSONObject();
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Predicate criteria = cb.conjunction();
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get("dtUPDATED")),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            criteria = cb.and(criteria, cb.equal(root.get("strSTATUT"), commonparameter.statut_is_Closed));
            criteria = cb.and(criteria, cb.equal(root.get("bISCANCEL"), Boolean.FALSE));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            Predicate pu = cb.greaterThan(root.get("intPRICE"), 0);
            criteria = cb.and(criteria,
                    cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            cq.where(criteria, pu, btw);
            Query q = em.createQuery(cq);
            q.setFirstResult(start);
            q.setMaxResults(limit);

            List<TPreenregistrement> oblist = q.getResultList();
            Integer achattTTC0 = 0, montantTotal = 0;
            Integer montVO = 0, montVNO = 0, montRemise = 0, ch = 0, cba = 0, vr = 0, DIFF = 0, montantHt = 0;
            Double _ht = 0.0;

            for (TPreenregistrement op : oblist) {
                // em.refresh(op);
                List<TPreenregistrementDetail> details = op.getTPreenregistrementDetailCollection().stream()
                        .collect(Collectors.toList());
                for (TPreenregistrementDetail it : details) {
                    TFamille tf = it.getLgFAMILLEID();
                    achattTTC0 += tf.getIntPAF() * it.getIntQUANTITY();
                    Integer tvaV = tf.getLgCODETVAID().getIntVALUE();
                    if (tvaV > 0) {
                        Double tva = 1 + (Double.valueOf(tf.getLgCODETVAID().getIntVALUE()) / 100);
                        _ht += (Double.valueOf(it.getIntPRICE()) / tva);
                        montantHt += it.getIntPRICE();
                    }
                }
                List<TPreenregistrementCompteClient> cmp = op.getTPreenregistrementCompteClientCollection().stream()
                        .collect(Collectors.toList());
                DIFF += cmp.stream().map((cp) -> cp.getIntPRICERESTE()).reduce(0, Integer::sum);

                if (op.getStrTYPEVENTE().equals("VO")) {
                    montVO += op.getIntPRICE() - op.getIntCUSTPART();
                } else {
                    montVNO += op.getIntPRICE();
                }
                montantTotal += op.getIntPRICE();
                montRemise += op.getIntPRICEREMISE();
                String modeRegl = op.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID()
                        .getLgTYPEREGLEMENTID();
                switch (modeRegl) {
                case "2":
                    ch += op.getIntPRICE();
                    break;
                case "3":
                    cba += op.getIntPRICE();
                    break;
                case "6":
                    vr += op.getIntPRICE();
                    break;
                }

                TPreenregistrement annuler = findAnnulations(op.getLgPREENREGISTREMENTID());
                if (annuler != null) {
                    em.refresh(annuler);
                    details = annuler.getTPreenregistrementDetailCollection().stream().collect(Collectors.toList());
                    for (TPreenregistrementDetail it : details) {
                        TFamille tf = it.getLgFAMILLEID();
                        achattTTC0 -= tf.getIntPAF() * it.getIntQUANTITY();
                        Integer tvaV = tf.getLgCODETVAID().getIntVALUE();
                        if (tvaV > 0) {
                            Double tva = 1 + (Double.valueOf(tf.getLgCODETVAID().getIntVALUE()) / 100);
                            _ht -= (Double.valueOf(it.getIntPRICE()) / tva);
                            montantHt -= it.getIntPRICE();
                        }
                    }
                    cmp = annuler.getTPreenregistrementCompteClientCollection().stream().collect(Collectors.toList());
                    DIFF -= cmp.stream().map((cp) -> cp.getIntPRICERESTE()).reduce(0, Integer::sum);

                    if (op.getStrTYPEVENTE().equals("VO")) {
                        montVO -= annuler.getIntPRICE() - op.getIntCUSTPART();
                    } else {
                        montVNO -= annuler.getIntPRICE();
                    }
                    montantTotal -= annuler.getIntPRICE();
                    montRemise -= annuler.getIntPRICEREMISE();
                    modeRegl = annuler.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID()
                            .getLgTYPEREGLEMENTID();
                    switch (modeRegl) {
                    case "2":
                        ch -= annuler.getIntPRICE();
                        break;
                    case "3":
                        cba -= annuler.getIntPRICE();
                        break;
                    case "6":
                        vr -= annuler.getIntPRICE();
                        break;
                    }

                }

            }
            if (oblist.isEmpty()) {
                oblist = findAnnulations(dt_start, dt_end, emp);

                for (TPreenregistrement op : oblist) {
                    List<TPreenregistrementDetail> details = op.getTPreenregistrementDetailCollection().stream()
                            .collect(Collectors.toList());
                    for (TPreenregistrementDetail it : details) {
                        TFamille tf = it.getLgFAMILLEID();
                        achattTTC0 += tf.getIntPAF() * it.getIntQUANTITY();
                        Integer tvaV = tf.getLgCODETVAID().getIntVALUE();
                        if (tvaV > 0) {
                            Double tva = 1 + (Double.valueOf(tf.getLgCODETVAID().getIntVALUE()) / 100);
                            _ht -= (Double.valueOf(it.getIntPRICE()) / tva);
                            montantHt -= it.getIntPRICE();
                        }
                    }
                    List<TPreenregistrementCompteClient> cmp = op.getTPreenregistrementCompteClientCollection().stream()
                            .collect(Collectors.toList());
                    DIFF -= cmp.stream().map((cp) -> cp.getIntPRICERESTE()).reduce(0, Integer::sum);

                    if (op.getStrTYPEVENTE().equals("VO")) {
                        montVO -= op.getIntPRICE() - op.getIntCUSTPART();
                    } else {
                        montVNO -= op.getIntPRICE();
                    }
                    montantTotal -= op.getIntPRICE();
                    montRemise -= op.getIntPRICEREMISE();
                    String modeRegl = op.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID()
                            .getLgTYPEREGLEMENTID();
                    switch (modeRegl) {
                    case "2":
                        ch -= op.getIntPRICE();
                        break;
                    case "3":
                        cba -= op.getIntPRICE();
                        break;
                    case "6":
                        vr -= op.getIntPRICE();
                        break;
                    }

                }

            }
            // Integer totalTTC= montVO + montVNO;
            long ht = Math.round(_ht);
            long TotalTva = montantHt - ht;
            jsono.put("cba", cba);
            jsono.put("diff", DIFF);
            jsono.put("vir", vr);
            jsono.put("ch", ch);
            jsono.put("montTTC", montantTotal);
            // jsono.put("montHT", montantTotal - TotalTva);
            jsono.put("montHT", ht);
            jsono.put("TVA", TotalTva);
            jsono.put("montAchat", achattTTC0);
            jsono.put("VO", montVO);
            jsono.put("VNO", montVNO);
            jsono.put("remiseHT", montRemise);
            jsono.put("montantHTCNET", montantTotal - montRemise);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return jsono;
    }

}
