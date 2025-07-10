/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ComboDTO;
import commonTasks.dto.FactureDTO;
import commonTasks.dto.FactureDetailDTO;
import commonTasks.dto.ItemFactGenererDTO;
import commonTasks.dto.Mode;
import commonTasks.dto.ModelFactureDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.*;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FacturationService;
import util.DateConverter;

/**
 * @author kkoffi
 */
@Stateless
public class FacturationServiceImpl implements FacturationService {

    private static final Logger LOG = Logger.getLogger(FacturationServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<ModelFactureDTO> getAll() {
        try {
            TypedQuery<TModelFacture> tq = getEntityManager().createQuery("SELECT o FROM TModelFacture o ",
                    TModelFacture.class);
            return tq.getResultList().stream().map(ModelFactureDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public TModelFacture modelFactureById(String lgMODELFACTUREID) {
        return getEntityManager().find(TModelFacture.class, lgMODELFACTUREID);
    }

    @Override
    public JSONObject update(String id, ModelFactureDTO o) throws JSONException {
        try {
            TModelFacture facture = getEntityManager().find(TModelFacture.class, id);
            facture.setStrDESCRIPTION(o.getLibelle());
            facture.setNomFichier(o.getNomFichier());
            facture.setNomFichierRemiseTierspayant(o.getNomFichierRemiseTierspayant());
            facture.setDtUPDATED(new Date());
            getEntityManager().merge(facture);
            return new JSONObject().put("success", true);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public JSONObject groupetierspayant(String query) throws JSONException {

        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ComboDTO> cq = cb.createQuery(ComboDTO.class);
            Root<TGroupeTierspayant> root = cq.from(TGroupeTierspayant.class);
            cq.select(cb.construct(ComboDTO.class, root.get(TGroupeTierspayant_.lgGROUPEID),
                    root.get(TGroupeTierspayant_.strLIBELLE)));
            if (query != null && !"".equals(query)) {
                cq.where(cb.like(root.get("strLIBELLE"), query + "%"));
            }
            //
            Query q = getEntityManager().createQuery(cq);
            List<ComboDTO> l = q.getResultList();

            return new JSONObject().put("total", l.size()).put("data", new JSONArray(l));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    @Override
    public JSONObject provisoires(Mode mode, String groupTp, String typetp, String tpid, String codegroup,
            String dtStart, String dtEnd, String query, int start, int limit) throws JSONException {
        if (Mode.BONS == mode) {
            return provisoiresBon(tpid, dtStart, dtEnd, query, start, limit);
        }
        return provisoirespartp(mode, groupTp, typetp, tpid, codegroup, dtStart, dtEnd, start, limit);

    }

    private long provisoiresCount(Mode mode, String groupTp, String typetp, String tpid, String codegroup,
            String dtStart, String dtEnd) throws JSONException {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.count(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                    .get(TCompteClientTiersPayant_.lgTIERSPAYANTID)))
                    .groupBy(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID));
            List<Predicate> predicates = provisoirespartp(cb, root, st, mode, groupTp, typetp, tpid, codegroup, dtStart,
                    dtEnd);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList().size();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    private long provisoiresBonCount(String tpid, String query, String dtStart, String dtEnd) throws JSONException {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = provisoiresBonPredicate(cb, root, st, tpid, dtStart, dtEnd, query);

            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return ((Long) q.getSingleResult());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private JSONObject provisoiresBon(String tpid, String dtStart, String dtEnd, String query, int start, int limit)
            throws JSONException {

        try {
            long count = provisoiresBonCount(tpid, query, dtStart, dtEnd);
            if (count == 0) {
                return new JSONObject().put("total", 0).put("data", new JSONArray());
            }

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ItemFactGenererDTO> cq = cb.createQuery(ItemFactGenererDTO.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(ItemFactGenererDTO.class,
                    root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID),
                    root.get(TPreenregistrementCompteClientTiersPayent_.strREFBON),
                    root.get(TPreenregistrementCompteClientTiersPayent_.intPRICE)))
                    .orderBy(cb.asc(root.get(TPreenregistrementCompteClientTiersPayent_.dtUPDATED)));
            List<Predicate> predicates = provisoiresBonPredicate(cb, root, st, tpid, dtStart, dtEnd, query);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            List<ItemFactGenererDTO> l = q.getResultList();
            return new JSONObject().put("total", count).put("data", new JSONArray(l));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }

    }

    private List<Predicate> provisoiresBonPredicate(CriteriaBuilder cb,
            Root<TPreenregistrementCompteClientTiersPayent> root,
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st, String tpid, String dtStart,
            String dtEnd, String query) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(st.get(TPreenregistrement_.intPRICE), 0));
        Predicate btw = cb.between(cb.function("DATE", Date.class, st.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.equal(st.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUT),
                DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUTFACTURE),
                DateConverter.STATUT_FACTURE_UNPAID));
        if (tpid != null && !"".equals(tpid)) {
            predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                    .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID), tpid));
        }
        if (query != null && !"".equals(query)) {
            predicates.add(cb.or(cb.like(root.get(TPreenregistrementCompteClientTiersPayent_.strREFBON), query + "%"),
                    cb.like(st.get(TPreenregistrement_.client).get(TClient_.strFIRSTNAME), query + "%"),
                    cb.like(st.get(TPreenregistrement_.client).get(TClient_.strLASTNAME), query + "%")));
        }
        return predicates;
    }

    private JSONObject provisoirespartp(Mode mode, String groupTp, String typetp, String tpid, String codegroup,
            String dtStart, String dtEnd, int start, int limit) throws JSONException {
        try {
            long count = provisoiresCount(mode, groupTp, typetp, tpid, codegroup, dtStart, dtEnd);
            if (count == 0) {
                return new JSONObject().put("total", 0).put("data", new JSONArray());
            }

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<ItemFactGenererDTO> cq = cb.createQuery(ItemFactGenererDTO.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.construct(ItemFactGenererDTO.class,
                    root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID),
                    root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.strFULLNAME),
                    cb.sum(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICE)), cb.count(root)))
                    .groupBy(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID))
                    .orderBy(cb.asc(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.strFULLNAME)));
            List<Predicate> predicates = provisoirespartp(cb, root, st, mode, groupTp, typetp, tpid, codegroup, dtStart,
                    dtEnd);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            List<ItemFactGenererDTO> l = q.getResultList();
            return new JSONObject().put("total", count).put("data", new JSONArray(l));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "provisoirespartp ===>", e);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

    private List<Predicate> provisoirespartp(CriteriaBuilder cb, Root<TPreenregistrementCompteClientTiersPayent> root,
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st, Mode mode, String groupTp,
            String typetp, String tpid, String codegroup, String dtStart, String dtEnd) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(st.get(TPreenregistrement_.intPRICE), 0));
        Predicate btw = cb.between(cb.function("DATE", Date.class, st.get(TPreenregistrement_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.equal(st.get(TPreenregistrement_.strSTATUT), DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUT),
                DateConverter.STATUT_IS_CLOSED));
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUTFACTURE),
                DateConverter.STATUT_FACTURE_UNPAID));

        switch (mode) {
        case TYPETP:
            if (typetp != null && !"".equals(typetp)) {
                predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                        .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTYPETIERSPAYANTID)
                        .get(TTypeTiersPayant_.lgTYPETIERSPAYANTID), typetp));
            }
            break;
        case TP:
            if (tpid != null && !"".equals(tpid)) {
                predicates.add(cb.equal(
                        root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                                .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID),
                        tpid));
            }
            break;
        case GROUP:
            if (groupTp != null && !"".equals(groupTp)) {
                predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                        .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgGROUPEID)
                        .get(TGroupeTierspayant_.lgGROUPEID), Integer.valueOf(groupTp)));
            }
            break;
        case CODE_GROUP:
            if (codegroup != null && !"".equals(codegroup)) {
                predicates.add(cb.equal(
                        root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                                .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.strCODEREGROUPEMENT),
                        codegroup));
            }
            break;
        default:
            break;
        }
        return predicates;
    }

    @Override
    public JSONObject provisoires10(String groupTp, String typetp, String tpid, String codegroup, boolean isTemplate,
            int start, int limit) throws JSONException {
        long count = provisoires10(groupTp, typetp, tpid, codegroup, isTemplate);
        if (count == 0) {
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
        return new JSONObject().put("total", count).put("data",
                new JSONArray(provisoires10(groupTp, typetp, tpid, codegroup, isTemplate, false, start, limit)));
    }

    private long provisoires10(String groupTp, String typetp, String tpid, String codegroup, boolean isTemplate) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFacture> root = cq.from(TFacture.class);
            Join<TFacture, TTiersPayant> st = root.join(TFacture_.tiersPayant, JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = provisoires10Predicates(cb, root, st, groupTp, typetp, tpid, codegroup,
                    isTemplate);

            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return (long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "provisoires10 count", e);
            return 0;
        }
    }

    @Override
    public List<FactureDTO> provisoires10(String groupTp, String typetp, String tpid, String codegroup,
            boolean isTemplate, boolean all, int start, int limit) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TFacture> cq = cb.createQuery(TFacture.class);
            Root<TFacture> root = cq.from(TFacture.class);
            Join<TFacture, TTiersPayant> st = root.join(TFacture_.tiersPayant, JoinType.INNER);
            cq.select(root).orderBy(cb.desc(root.get(TFacture_.dtCREATED)), cb.desc(st.get(TTiersPayant_.strFULLNAME)));
            List<Predicate> predicates = provisoires10Predicates(cb, root, st, groupTp, typetp, tpid, codegroup,
                    isTemplate);

            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<TFacture> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultStream().map(FactureDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.WARNING, "provisoires10", e);
            return Collections.emptyList();
        }
    }

    private List<Predicate> provisoires10Predicates(CriteriaBuilder cb, Root<TFacture> root,
            Join<TFacture, TTiersPayant> st, String groupTp, String typetp, String tpid, String codegroup,
            boolean isTemplate) {
        List<Predicate> predicates = new ArrayList<>();
        if (isTemplate) {
            predicates.add(cb.isTrue(root.get(TFacture_.template)));
        } else {
            predicates.add(cb.isFalse(root.get(TFacture_.template)));
        }

        if (typetp != null && !"".equals(typetp)) {
            predicates.add(cb.equal(
                    st.get(TTiersPayant_.lgTYPETIERSPAYANTID).get(TTypeTiersPayant_.lgTYPETIERSPAYANTID), typetp));
        }

        if (tpid != null && !"".equals(tpid)) {
            predicates.add(cb.equal(root.get(TFacture_.tiersPayant).get(TTiersPayant_.lgTIERSPAYANTID), tpid));
        }

        if (groupTp != null && !"".equals(groupTp)) {
            predicates.add(cb.equal(st.get(TTiersPayant_.lgGROUPEID).get(TGroupeTierspayant_.lgGROUPEID),
                    Integer.valueOf(groupTp)));
        }

        if (codegroup != null && !"".equals(codegroup)) {
            predicates.add(cb.equal(st.get(TTiersPayant_.strCODEREGROUPEMENT), codegroup));
        }
        return predicates;
    }

    @Override
    public TFacture findFactureById(String idFacture) {
        return getEntityManager().find(TFacture.class, idFacture);
    }

    @Override
    public List<TFacture> findArangeOfFacture(List<String> ids) {
        List<TFacture> factures = new ArrayList<>();
        try {
            ids.forEach(s -> {
                factures.add(getEntityManager().find(TFacture.class, s));
            });
        } catch (Exception e) {
        }
        return factures;
    }

    @Override
    public void removeFacture(String idFacture) {
        TFacture facture = getEntityManager().find(TFacture.class, idFacture);
        deleteFactureDetails(facture);
        getEntityManager().remove(facture);
    }

    private void deleteFactureDetails(TFacture facture) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaDelete<TFactureDetail> q = cb.createCriteriaDelete(TFactureDetail.class);
            Root<TFactureDetail> root = q.from(TFactureDetail.class);
            q.where(cb.equal(root.get(TFactureDetail_.lgFACTUREID), facture));
            getEntityManager().createQuery(q).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    @Override
    public List<FactureDetailDTO> findFacturesDetailsByFactureId(String id) {
        try {
            TypedQuery<TFactureDetail> q = getEntityManager().createNamedQuery("TFactureDetail.findByFactureId",
                    TFactureDetail.class);
            q.setParameter("lgFACTUREID", id);
            return q.getResultList().stream().map(FactureDetailDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<VenteDetailsDTO> findArticleByFactureDetailsId(String id) {
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager()
                    .createNamedQuery("TPreenregistrementDetail.findByVenteId", TPreenregistrementDetail.class);
            q.setParameter("lgPREENREGISTREMENTID", id);
            return q.getResultList().stream().map(VenteDetailsDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<VenteDetailsDTO> findArticleByFacturId(String id) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root
                    .join(TPreenregistrementDetail_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(root);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TFactureDetail> pr = sub.from(TFactureDetail.class);
            sub.select(pr.get(TFactureDetail_.pKey))
                    .where(cb.equal(pr.get(TFactureDetail_.lgFACTUREID).get(TFacture_.lgFACTUREID), id));
            cq.where(cb.in(st.get(TPreenregistrement_.lgPREENREGISTREMENTID)).value(sub));
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(cq);
            return q.getResultList().stream().map(VenteDetailsDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

}
