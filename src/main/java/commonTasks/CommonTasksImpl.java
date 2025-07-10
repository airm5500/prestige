/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks;

import commonTasks.dto.VenteResult;
import dal.Groupefournisseur_;
import dal.TBonLivraison;
import dal.TBonLivraison_;
import dal.TCashTransaction;
import dal.TCashTransaction_;
import dal.TGrossiste_;
import dal.TOrder;
import dal.TOrder_;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClient_;
import dal.TPreenregistrement_;
import dal.TReglement;
import dal.TRetourFournisseur;
import dal.TRetourFournisseur_;
import dal.TUser;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;

/**
 *
 * @author Kobena
 */
public class CommonTasksImpl /* implements CommonTasksSrv, CommonDataSrv */ {
    final String MODE_DIFFERE = "4";
    final String MODE_ESP = "1";
    final String VENTE_COMPTANT = "VNO";
    final String VENTE_ASSURANCE = "VO";
    final String DEPOT_EXTENSION = "5";
    final String STATUT_IS_CLOSED = "is_Closed";
    final String ORDER = "ORDER";
    final String STATUT_ENABLE = "enable";
    final String LABOREXCI = "LABOREX-CI";
    final String COPHARMED = "COPHARMED";
    final String TEDIS = "TEDIS PHAR.";
    final String AUTRES = "AUTRES";
    final String DPCI = "DPCI";
    private final EntityManager em;

    // @Override
    public Integer getBalanceRegl(String dt_start, String dt_end, String typevente, String lgEmp,
            String lgTYPEREGLEMENTID) throws Exception {

        Integer diff;
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
        Root<TCashTransaction> root = cq.from(TCashTransaction.class);

        Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
        Subquery<String> sub = cq.subquery(String.class);
        Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
        Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
        Predicate predicate = cb.conjunction();

        predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
        predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
        predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), "is_Closed"));
        predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
        predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente));
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

        return diff;
    }

    public CommonTasksImpl(EntityManager _em) {
        this.em = _em;
    }

    // @Override
    public Integer getBalanceAllTypeVenteRegl(String dtstart, String lgEmp) throws Exception {

        Integer diff;
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
        Root<TCashTransaction> root = cq.from(TCashTransaction.class);

        Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
        Subquery<String> sub = cq.subquery(String.class);
        Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
        Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
        Predicate predicate = cb.conjunction();

        predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
        predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), DEPOT_EXTENSION));
        predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), STATUT_IS_CLOSED));

        predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
        // predicate = cb.and(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), lgTYPEREGLEMENTID));
        predicate = cb.or(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), MODE_DIFFERE),
                cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), MODE_ESP));
        Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);
        predicate = cb.and(predicate, cb.equal(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtstart)));
        sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, ge);

        Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);

        cq.select(cb.sum(root.get(TCashTransaction_.intAMOUNT)));

        cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));

        Query q = em.createQuery(cq);

        diff = (Integer) q.getSingleResult();
        if (diff == null) {
            diff = 0;
        }

        return diff;
    }

    // @Override
    public Integer getBalanceRegl(String dtstart, String typevente, String lgEmp) {

        Integer diff = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);

            Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
            // Predicate predicate = cb.conjunction();

            Predicate predicate = cb.and(cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), DEPOT_EXTENSION));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), STATUT_IS_CLOSED));
            // predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
            // predicate = cb.and(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID),
            // lgTYPEREGLEMENTID));
            predicate = cb.or(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), MODE_DIFFERE),
                    cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), MODE_ESP));
            Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate,
                    cb.equal(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                            java.sql.Date.valueOf(dtstart)));
            sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, ge,
                    cb.and(cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente)));

            Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);

            cq.select(cb.sum(root.get(TCashTransaction_.intAMOUNT)));

            cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));

            Query q = em.createQuery(cq);

            diff = (Integer) q.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return diff;
    }

    // @Override
    public List<VenteResult> cumulDesVentesSurPeriode(String dt_start, String dt_end, String lgEmp, String typevente)
            throws Exception {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<VenteResult> cq = cb.createQuery(VenteResult.class);
        Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
        Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
        Predicate predicate = cb.conjunction();
        predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), typevente));
        predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
        predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
        predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), DEPOT_EXTENSION));
        predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), STATUT_IS_CLOSED));
        Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
        cq.select(cb.construct(VenteResult.class,
                cb.function("DATE_FORMAT", String.class, root.get(TPreenregistrement_.dtUPDATED),
                        cb.literal("%Y-%m-%d")),
                root.get(TPreenregistrement_.strTYPEVENTE),
                cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intPRICEREMISE))),
                root.get(TPreenregistrement_.intPRICEREMISE),
                cb.countDistinct(root.get(TPreenregistrement_.lgPREENREGISTREMENTID))))
                .groupBy(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)))
                .orderBy(cb.asc(root.get(TPreenregistrement_.dtUPDATED)));

        cq.where(predicate, btw, ge);
        Query q = em.createQuery(cq);

        List<VenteResult> list = q.getResultList();
        return list;

    }

    // @Override
    public List<VenteResult> cumulDesAchatsSurPeriode(String dt_start, String dt_end) throws Exception {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<VenteResult> cq = cb.createQuery(VenteResult.class);
        Root<TBonLivraison> root = cq.from(TBonLivraison.class);
        Join<TBonLivraison, TOrder> pu = root.join("lgORDERID", JoinType.INNER);
        Predicate predicate = cb.conjunction();
        predicate = cb.and(predicate, cb.equal(root.get(TBonLivraison_.strSTATUT), STATUT_IS_CLOSED));
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TBonLivraison_.dtDATELIVRAISON)),
                java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));

        cq.select(cb.construct(VenteResult.class,
                cb.function("DATE_FORMAT", String.class, root.get(TBonLivraison_.dtDATELIVRAISON),
                        cb.literal("%Y-%m-%d")),
                root.get(TBonLivraison_.lgORDERID).get(TOrder_.lgGROSSISTEID).get(TGrossiste_.groupeId)
                        .get(Groupefournisseur_.libelle),
                cb.sum(root.get(TBonLivraison_.intMHT))))
                .groupBy(cb.function("DATE", Date.class, root.get(TBonLivraison_.dtDATELIVRAISON)),
                        root.get(TBonLivraison_.lgORDERID).get(TOrder_.lgGROSSISTEID).get(TGrossiste_.groupeId)
                                .get(Groupefournisseur_.libelle))
                .orderBy(cb.asc(root.get(TBonLivraison_.dtDATELIVRAISON)));

        cq.where(predicate, btw);
        Query q = em.createQuery(cq);

        List<VenteResult> list = q.getResultList();
        return list;
    }

    // @Override
    public List<VenteResult> cumulDesVentesVOSurPeriode(String dt_start, String dt_end, String lgEmp) throws Exception {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<VenteResult> cq = cb.createQuery(VenteResult.class);
        Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
        Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
        Predicate predicate = cb.conjunction();
        predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), VENTE_ASSURANCE));
        predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
        predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
        predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), DEPOT_EXTENSION));
        predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), STATUT_IS_CLOSED));
        Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
        // String dateOperationToString, String typeVente, Integer totalVente, Integer montantComptant, Integer
        // montantCredit, Integer remise, Long nbreClient

        cq.select(cb.construct(VenteResult.class,
                cb.function("DATE_FORMAT", String.class, root.get(TPreenregistrement_.dtUPDATED),
                        cb.literal("%Y-%m-%d")),
                root.get(TPreenregistrement_.strTYPEVENTE), cb.sum(root.get(TPreenregistrement_.intPRICE)),
                cb.sum(cb.diff(root.get(TPreenregistrement_.intCUSTPART),
                        root.get(TPreenregistrement_.intPRICEREMISE))),
                cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                        cb.diff(root.get(TPreenregistrement_.intCUSTPART),
                                root.get(TPreenregistrement_.intPRICEREMISE)))),
                root.get(TPreenregistrement_.intPRICEREMISE),
                cb.countDistinct(root.get(TPreenregistrement_.lgPREENREGISTREMENTID))))
                .groupBy(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)))
                .orderBy(cb.asc(root.get(TPreenregistrement_.dtUPDATED)));

        cq.where(predicate, btw, ge);
        Query q = em.createQuery(cq);

        List<VenteResult> list = q.getResultList();
        return list;

    }

    // @Override
    public Integer getMontantDiffere(String dtstart, String lgEmp) {

        Integer diff = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
            Join<TPreenregistrementCompteClient, TPreenregistrement> r = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Predicate predicate = cb.and(
                    cb.equal(r.get(TPreenregistrement_.lgUSERID).get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(r.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), DEPOT_EXTENSION));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.strSTATUT), STATUT_IS_CLOSED));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.bISCANCEL), false));
            Predicate ge = cb.greaterThan(r.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate,
                    cb.equal(cb.function("DATE", Date.class, r.get(TPreenregistrement_.dtUPDATED)),
                            java.sql.Date.valueOf(dtstart)));
            cq.select(cb.sum(root.get(TPreenregistrementCompteClient_.intPRICERESTE)));
            cq.where(predicate, ge);
            Query q = em.createQuery(cq);
            diff = (Integer) q.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return diff;
    }

    // @Override
    public Integer getMontantDiffere(String dtstart, String dt_end, String lgEmp) {
        Integer diff = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
            Join<TPreenregistrementCompteClient, TPreenregistrement> r = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Predicate predicate = cb.and(
                    cb.equal(r.get(TPreenregistrement_.lgUSERID).get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(r.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), DEPOT_EXTENSION));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.strSTATUT), STATUT_IS_CLOSED));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.bISCANCEL), false));
            Predicate ge = cb.greaterThan(r.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, r.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dtstart), java.sql.Date.valueOf(dt_end));
            cq.select(cb.sum(root.get(TPreenregistrementCompteClient_.intPRICERESTE)));
            cq.where(predicate, ge, btw);
            Query q = em.createQuery(cq);
            diff = (Integer) q.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return diff;
    }

    // @Override
    public Integer getMontantAvoirAchat(String dtstart) {
        Integer val = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Double> cq = cb.createQuery(Double.class);
            Root<TRetourFournisseur> root = cq.from(TRetourFournisseur.class);
            Predicate predicate = cb.and(cb.notEqual(root.get(TRetourFournisseur_.strREPONSEFRS), ""));
            predicate = cb.and(predicate, cb.equal(root.get(TRetourFournisseur_.strSTATUT), STATUT_ENABLE));
            predicate = cb.and(predicate,
                    cb.equal(cb.function("DATE", Date.class, root.get(TRetourFournisseur_.dtUPDATED)),
                            java.sql.Date.valueOf(dtstart)));
            cq.select(cb.sum(root.get(TRetourFournisseur_.dlAMOUNT)));
            cq.where(predicate);
            Query q = em.createQuery(cq);
            Double d = (Double) q.getSingleResult();
            val = d.intValue();
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return val;
    }

}
