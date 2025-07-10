/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.stock;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraisonDetail_;
import dal.TBonLivraison_;
import dal.TFamille;
import dal.TFamille_;
import dal.TMouvement;
import dal.TMouvement_;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TUser;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;

/**
 *
 * @author user
 */
public class StockImpl implements MouvementService {

    private EntityManager em;
    private TUser Ouser;
    private String lgemplacement;

    public String getLgemplacement() {
        lgemplacement = Ouser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        return lgemplacement;
    }

    public StockImpl(EntityManager em, TUser Ouser) {
        this.em = em;
        this.Ouser = Ouser;

    }

    public EntityManager getEm() {
        return em;
    }

    public void setEm(EntityManager em) {
        this.em = em;
    }

    public TUser getOuser() {
        return Ouser;
    }

    public void setOuser(TUser Ouser) {
        this.Ouser = Ouser;
    }

    @Override
    public Integer entreeStock(TFamille famille, LocalDate debut, LocalDate fin) {
        CriteriaBuilder cb = getEm().getCriteriaBuilder();
        CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
        Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
        Join<TBonLivraisonDetail, TBonLivraison> jf = root.join("lgBONLIVRAISONID", JoinType.INNER);
        Predicate predicate = cb.conjunction();
        predicate = cb.and(predicate, cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), famille.getLgFAMILLEID()));
        Predicate btw = cb.between(cb.function("DATE", Date.class, jf.get(TBonLivraison_.dtUPDATED)),
                java.sql.Date.valueOf(debut), java.sql.Date.valueOf(fin));
        predicate = cb.and(predicate, btw);
        predicate = cb.and(predicate, cb.equal(jf.get(TBonLivraison_.strSTATUT), commonparameter.statut_is_Closed));
        cq.select(cb.sum(root.get(TBonLivraisonDetail_.intQTERECUE)));
        cq.where(predicate);
        TypedQuery<Integer> q = getEm().createQuery(cq);

        Integer count = q.getSingleResult();
        if (count == null) {
            return 0;
        }
        return count;
    }

    @Override
    public Integer stockVente(TFamille famille, LocalDate debut, LocalDate fin, String empl) {

        CriteriaBuilder cb = getEm().getCriteriaBuilder();
        CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
        Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
        Join<TPreenregistrementDetail, TPreenregistrement> pr = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
        Join<TPreenregistrement, TUser> pru = pr.join("lgUSERID", JoinType.INNER);
        Predicate criteria = cb.conjunction();
        criteria = cb.and(criteria, cb.equal(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID),
                famille.getLgFAMILLEID()));
        criteria = cb.and(criteria,
                cb.equal(root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.strSTATUT),
                        "is_Closed"));
        criteria = cb.and(criteria,
                cb.equal(pru.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), this.getLgemplacement()));
        Predicate pu = cb.greaterThan(
                root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID).get(TPreenregistrement_.intPRICE), 0);
        Predicate btw = cb
                .between(
                        cb.function("DATE", Date.class,
                                root.get(TPreenregistrementDetail_.lgPREENREGISTREMENTID)
                                        .get(TPreenregistrement_.dtUPDATED)),
                        java.sql.Date.valueOf(debut), java.sql.Date.valueOf(fin));
        cq.select(cb.sum(cb.diff(root.get(TPreenregistrementDetail_.intQUANTITY),
                root.get(TPreenregistrementDetail_.intFREEPACKNUMBER))));
        cq.where(criteria, cb.and(pu), cb.and(btw));
        TypedQuery<Integer> q = getEm().createQuery(cq);
        Integer num = q.getSingleResult();
        if (num == null) {
            return 0;
        }

        return num;

    }

    @Override
    public List<TMouvement> listMvt(String lgFamille, String zoneID, String search, String dateDebut, String dateEnd,
            String empl, String LgFamilleArticle, boolean all, int start, int limit) {
        CriteriaBuilder cb = getEm().getCriteriaBuilder();
        CriteriaQuery<TMouvement> cq = cb.createQuery(TMouvement.class);
        Root<TMouvement> root = cq.from(TMouvement.class);
        Join<TMouvement, TFamille> pr = root.join("lgFAMILLEID", JoinType.INNER);
        Predicate criteria = cb.conjunction();
        criteria = cb.and(criteria, cb.equal(pr.get(TFamille_.strSTATUT), "enable"));

        if (!"".equals(lgFamille)) {
            criteria = cb.and(criteria, cb.equal(pr.get(TFamille_.lgFAMILLEID), lgFamille));
        }
        if (!"".equals(search) && "".equals(lgFamille)) {
            criteria = cb.and(criteria,
                    cb.or(cb.like(pr.get(TFamille_.intCIP), search + "%"),
                            cb.like(pr.get(TFamille_.strNAME), search + "%"),
                            cb.like(pr.get(TFamille_.intEAN13), search + "%")));
        }
        if (!"".equals(zoneID)) {
            criteria = cb.and(criteria,
                    cb.equal(pr.get(TFamille_.lgFAMILLEID).get("lgZONEGEOID").get("lgZONEGEOID"), zoneID));
        }
        if (!"".equals(LgFamilleArticle)) {
            criteria = cb.and(criteria,
                    cb.equal(pr.get(TFamille_.lgFAMILLEID).get("lgFAMILLEARTICLEID").get("lgFAMILLEARTICLEID"),
                            LgFamilleArticle));
        }
        criteria = cb.and(criteria,
                cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), this.getLgemplacement()));
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TMouvement_.dtDAY)),
                java.sql.Date.valueOf(dateDebut), java.sql.Date.valueOf(dateEnd));
        cq.select(root);
        cq.where(criteria, cb.and(btw));
        Query q = getEm().createQuery(cq);
        if (!all) {
            q.setFirstResult(start);
            q.setMaxResults(limit);
        }
        return q.getResultList();
    }

}
