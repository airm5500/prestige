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
import static commonTasks.dto.Mode.CODE_GROUP;
import static commonTasks.dto.Mode.GROUP;
import static commonTasks.dto.Mode.TP;
import static commonTasks.dto.Mode.TYPETP;
import commonTasks.dto.ModelFactureDTO;
import commonTasks.dto.ReportFactureDTO;
import commonTasks.dto.ReportTypeTiersPayantFactureDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.*;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.*;
import org.apache.commons.lang3.StringUtils;

import org.json.JSONArray;
import rest.service.dto.ModelFactureComboDTO;
import toolkits.parameters.commonparameter;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.FacturationService;
import util.DateCommonUtils;
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
    public JSONObject modelFacturesPourListeDeroulante(String query, int start, int limit) throws JSONException {
        String recherche = "%" + StringUtils.trimToEmpty(query) + "%";
        String selection = " FROM TModelFacture t WHERE (t.strDESCRIPTION LIKE ?1 OR t.strVALUE LIKE ?1)"
                + " AND t.strSTATUT = ?2";

        Long total = getEntityManager().createQuery("SELECT COUNT(t)" + selection, Long.class)
                .setParameter(1, recherche).setParameter(2, commonparameter.statut_enable).getSingleResult();

        TypedQuery<TModelFacture> tq = getEntityManager()
                .createQuery("SELECT t" + selection + " ORDER BY t.strDESCRIPTION", TModelFacture.class)
                .setParameter(1, recherche).setParameter(2, commonparameter.statut_enable);
        tq.setFirstResult(Math.max(0, start));
        if (limit > 0) {
            tq.setMaxResults(limit);
        }

        JSONArray lignes = new JSONArray();
        for (TModelFacture modele : tq.getResultList()) {
            lignes.put(new ModelFactureComboDTO(modele).toJson());
        }
        // "total" et "results" : les deux noms que l'ecran lit deja, inchanges depuis la JSP
        return new JSONObject().put("total", total).put("results", lignes);
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
            String dtStart, String dtEnd, String query, int start, int limit, boolean carnetDepot)
            throws JSONException {
        if (Mode.BONS == mode) {
            return provisoiresBon(tpid, dtStart, dtEnd, query, start, limit, carnetDepot);
        }
        return provisoirespartp(mode, groupTp, typetp, tpid, codegroup, dtStart, dtEnd, start, limit, carnetDepot);

    }

    private long provisoiresCount(Mode mode, String groupTp, String typetp, String tpid, String codegroup,
            String dtStart, String dtEnd, boolean carnetDepot) throws JSONException {
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
                    dtEnd, carnetDepot);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList().size();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    private long provisoiresBonCount(String tpid, String query, String dtStart, String dtEnd, boolean carnetDepot)
            throws JSONException {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = provisoiresBonPredicate(cb, root, st, tpid, dtStart, dtEnd, query,
                    carnetDepot);

            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            Query q = getEntityManager().createQuery(cq);
            return ((Long) q.getSingleResult());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private JSONObject provisoiresBon(String tpid, String dtStart, String dtEnd, String query, int start, int limit,
            boolean carnetDepot) throws JSONException {

        try {
            long count = provisoiresBonCount(tpid, query, dtStart, dtEnd, carnetDepot);
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
            List<Predicate> predicates = provisoiresBonPredicate(cb, root, st, tpid, dtStart, dtEnd, query,
                    carnetDepot);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
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

    /**
     * Predicat de separation des circuits de facturation (carnets depot).
     *
     * <p>
     * Un tiers payant marque {@code is_depot} suit son propre circuit : ses bons et ses factures ne doivent pas
     * apparaitre dans la facturation ordinaire, et reciproquement. Le meme predicat sert aux requetes de donnees ET aux
     * requetes de comptage - sans cette symetrie, la pagination annoncerait un nombre de pages qui ne correspond a rien
     * (RG-05).
     * </p>
     *
     * <p>
     * Cote circuit ORDINAIRE, l'indicateur non renseigne est traite comme « pas un depot » : la colonne est declaree
     * non nulle, mais une base plus ancienne peut porter des valeurs vides, et il vaut mieux montrer une facture de
     * trop que de la faire disparaitre sans que personne comprenne pourquoi.
     * </p>
     */
    private static Predicate predicatCarnetDepot(CriteriaBuilder cb,
            javax.persistence.criteria.Path<dal.TTiersPayant> tiersPayant, boolean carnetDepot) {
        javax.persistence.criteria.Path<Boolean> depot = tiersPayant.get(TTiersPayant_.isDepot);
        if (carnetDepot) {
            return cb.isTrue(depot);
        }
        return cb.or(cb.isFalse(depot), cb.isNull(depot));
    }

    private List<Predicate> provisoiresBonPredicate(CriteriaBuilder cb,
            Root<TPreenregistrementCompteClientTiersPayent> root,
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st, String tpid, String dtStart,
            String dtEnd, String query, boolean carnetDepot) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(
                predicatCarnetDepot(cb, root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                        .get(TCompteClientTiersPayant_.lgTIERSPAYANTID), carnetDepot));
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
            String dtStart, String dtEnd, int start, int limit, boolean carnetDepot) throws JSONException {
        try {
            long count = provisoiresCount(mode, groupTp, typetp, tpid, codegroup, dtStart, dtEnd, carnetDepot);
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
                    dtEnd, carnetDepot);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
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
            String typetp, String tpid, String codegroup, String dtStart, String dtEnd, boolean carnetDepot) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(
                predicatCarnetDepot(cb, root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                        .get(TCompteClientTiersPayant_.lgTIERSPAYANTID), carnetDepot));
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
            int start, int limit, boolean carnetDepot) throws JSONException {
        return listerFactures(groupTp, typetp, tpid, codegroup, Boolean.valueOf(isTemplate), start, limit, carnetDepot);
    }

    @Override
    public JSONObject facturesCarnetDepot(String tpid, int start, int limit) throws JSONException {
        // isTemplate a null : provisoires et definitives, sans distinction (RG-06).
        return listerFactures(null, null, tpid, null, null, start, limit, true);
    }

    private JSONObject listerFactures(String groupTp, String typetp, String tpid, String codegroup, Boolean isTemplate,
            int start, int limit, boolean carnetDepot) throws JSONException {
        long count = provisoires10(groupTp, typetp, tpid, codegroup, isTemplate, carnetDepot);
        if (count == 0) {
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
        return new JSONObject().put("total", count).put("data", new JSONArray(
                listerFactures(groupTp, typetp, tpid, codegroup, isTemplate, false, start, limit, carnetDepot)));
    }

    private long provisoires10(String groupTp, String typetp, String tpid, String codegroup, Boolean isTemplate,
            boolean carnetDepot) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFacture> root = cq.from(TFacture.class);
            Join<TFacture, TTiersPayant> st = root.join(TFacture_.tiersPayant, JoinType.INNER);
            cq.select(cb.count(root));
            List<Predicate> predicates = provisoires10Predicates(cb, root, st, groupTp, typetp, tpid, codegroup,
                    isTemplate, carnetDepot);

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "provisoires10 count", e);
            return 0;
        }
    }

    @Override
    public List<FactureDTO> provisoires10(String groupTp, String typetp, String tpid, String codegroup,
            boolean isTemplate, boolean all, int start, int limit, boolean carnetDepot) {
        return listerFactures(groupTp, typetp, tpid, codegroup, Boolean.valueOf(isTemplate), all, start, limit,
                carnetDepot);
    }

    private List<FactureDTO> listerFactures(String groupTp, String typetp, String tpid, String codegroup,
            Boolean isTemplate, boolean all, int start, int limit, boolean carnetDepot) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TFacture> cq = cb.createQuery(TFacture.class);
            Root<TFacture> root = cq.from(TFacture.class);
            Join<TFacture, TTiersPayant> st = root.join(TFacture_.tiersPayant, JoinType.INNER);
            cq.select(root).orderBy(cb.desc(root.get(TFacture_.dtCREATED)), cb.desc(st.get(TTiersPayant_.strFULLNAME)));
            List<Predicate> predicates = provisoires10Predicates(cb, root, st, groupTp, typetp, tpid, codegroup,
                    isTemplate, carnetDepot);

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
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
            Boolean isTemplate, boolean carnetDepot) {
        List<Predicate> predicates = new ArrayList<>();
        // Le classement d'une facture depend du tiers payant qui lui est rattache, jamais de l'ecran
        // qui l'a creee (RG-01, RG-06).
        predicates.add(predicatCarnetDepot(cb, st, carnetDepot));
        /*
         * isTemplate null = on ne filtre pas sur ce critere. L'onglet des carnets depot montre « les factures deja
         * creees », provisoires ET definitives : une facture qui disparaitrait de la liste en devenant definitive
         * donnerait l'impression de s'etre volatilisee.
         */
        if (Boolean.TRUE.equals(isTemplate)) {
            predicates.add(cb.isTrue(root.get(TFacture_.template)));
        } else if (Boolean.FALSE.equals(isTemplate)) {
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

    /**
     * Supprime plusieurs factures PROVISOIRES d'un coup, exactement comme le bouton de suppression ligne a ligne : la
     * facture et ses lignes de detail disparaissent, et rien d'autre - generer une provisoire ne marque pas les bons,
     * ils restent donc disponibles pour une nouvelle facturation.
     *
     * <p>
     * Chaque identifiant est verifie une a une : une facture devenue definitive n'est PAS supprimee, elle est comptee a
     * part et nommee dans le compte rendu. C'est le garde-fou demande en recette : une definitive engage l'officine
     * vis-a-vis de l'organisme, elle ne se supprime pas par une action de masse.
     *
     * @param ids
     *            identifiants des factures a supprimer
     *
     * @return compte rendu : nombre supprime, et le detail de ce qui a ete refuse
     */
    @Override
    public JSONObject supprimerProvisoires(List<String> ids) {
        JSONObject reponse = new JSONObject();
        if (ids == null || ids.isEmpty()) {
            return reponse.put("success", false).put("message", "Aucune facture sélectionnée.");
        }
        int supprimees = 0;
        JSONArray refusees = new JSONArray();
        for (String id : ids) {
            if (id == null || id.trim().isEmpty()) {
                continue;
            }
            try {
                TFacture facture = getEntityManager().find(TFacture.class, id.trim());
                if (facture == null) {
                    refusees.put(new JSONObject().put("id", id).put("motif", "Facture introuvable"));
                    continue;
                }
                if (!Boolean.TRUE.equals(facture.getTemplate())) {
                    refusees.put(new JSONObject().put("id", id)
                            .put("code", facture.getStrCODEFACTURE() == null ? "" : facture.getStrCODEFACTURE())
                            .put("motif",
                                    "Cette facture n'est plus provisoire : elle a été transformée en définitive"));
                    continue;
                }
                deleteFactureDetails(facture);
                getEntityManager().remove(facture);
                supprimees++;
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "supprimerProvisoires " + id, e);
                refusees.put(new JSONObject().put("id", id).put("motif", "Suppression impossible : " + e.getMessage()));
            }
        }
        return reponse.put("success", true).put("supprimees", supprimees).put("refusees", refusees);
    }

    /**
     * Factures PROVISOIRES d'une periode, pour la purge : les memes filtres que l'ecran, plus les bornes de date.
     *
     * <p>
     * Les bornes portent sur la DATE DE GENERATION (dtCREATED), le jour ou la facture provisoire a ete produite - et
     * non sur la periode facturee. C'est le critere que l'application applique deja d'elle-meme : le travail de nuit de
     * {@code JobCalendar} efface chaque provisoire dont la date de creation est anterieure au jour courant, si bien
     * qu'une provisoire ne survit pas au lendemain de sa generation. La purge manuelle et la purge automatique
     * regardent donc la meme chose, et purger « du 1er au 30 juin » emporte ce qui a ete genere dans ces jours-la.
     *
     * <p>
     * Cette methode ne supprime rien : elle sert d'abord a annoncer le nombre exact a l'usager, puis a fournir la liste
     * a supprimer. La confirmation et la suppression sont deux gestes distincts.
     */
    @Override
    public List<FactureDTO> provisoiresDeLaPeriode(String groupTp, String typetp, String tpid, String codegroup,
            String dtStart, String dtEnd, boolean carnetDepot) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TFacture> cq = cb.createQuery(TFacture.class);
            Root<TFacture> root = cq.from(TFacture.class);
            Join<TFacture, TTiersPayant> st = root.join(TFacture_.tiersPayant, JoinType.INNER);
            cq.select(root).orderBy(cb.desc(root.get(TFacture_.dtCREATED)));
            List<Predicate> predicates = provisoires10Predicates(cb, root, st, groupTp, typetp, tpid, codegroup, true,
                    carnetDepot);
            // Meme critere que la purge automatique de JobCalendar : la date de GENERATION.
            predicates.add(cb.greaterThanOrEqualTo(cb.function("DATE", Date.class, root.get(TFacture_.dtCREATED)),
                    java.sql.Date.valueOf(dtStart)));
            predicates.add(cb.lessThanOrEqualTo(cb.function("DATE", Date.class, root.get(TFacture_.dtCREATED)),
                    java.sql.Date.valueOf(dtEnd)));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            return getEntityManager().createQuery(cq).getResultStream().map(FactureDTO::new)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.WARNING, "provisoiresDeLaPeriode", e);
            return Collections.emptyList();
        }
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
    public dal.TModelFacture modeleDetailArticleActif() {
        try {
            List<dal.TModelFacture> modeles = getEntityManager()
                    .createQuery("SELECT m FROM TModelFacture m WHERE m.typeAffichage = :type"
                            + " AND m.strSTATUT = :statut ORDER BY m.lgMODELFACTUREID", dal.TModelFacture.class)
                    .setParameter("type", dal.enumeration.TypeAffichage.DETAIL_ARTICLE)
                    .setParameter("statut", DateConverter.STATUT_ENABLE).setMaxResults(1).getResultList();
            return modeles.isEmpty() ? null : modeles.get(0);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "modele DETAIL_ARTICLE actif", e);
            return null;
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

    @Override
    public ReportTypeTiersPayantFactureDTO exportReleveFacture(String invoiceFilter, String tiersPayantId,
            String codeFacture, String searchTerm, String dtStart, String dtEnd) {
        SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy");
        SimpleDateFormat dHeure = new SimpleDateFormat("HH:mm:ss");
        ReportTypeTiersPayantFactureDTO reportTypeTiersPayantFacture = new ReportTypeTiersPayantFactureDTO();
        Map<TTiersPayant, List<TFacture>> factureByTp = fetchFactures(invoiceFilter, tiersPayantId, codeFacture,
                searchTerm, dtStart, dtEnd).stream().collect(
                        Collectors.groupingBy(TFacture::getTiersPayant, LinkedHashMap::new, Collectors.toList()));

        BigDecimal montantFacture = BigDecimal.ZERO;
        BigDecimal montantRegle = BigDecimal.ZERO;
        BigDecimal montantRestant = BigDecimal.ZERO;

        List<ReportFactureDTO> tierspayants = new ArrayList<>();

        for (Map.Entry<TTiersPayant, List<TFacture>> entry : factureByTp.entrySet()) {
            TTiersPayant tiersPayant = entry.getKey();
            List<TFacture> factures = entry.getValue();
            List<FactureDTO> invoies = new ArrayList<>();
            TTypeTiersPayant tTypeTiersPayant = tiersPayant.getLgTYPETIERSPAYANTID();
            ReportFactureDTO reportFacture = new ReportFactureDTO(tiersPayant.getLgTIERSPAYANTID(),
                    tiersPayant.getStrFULLNAME(), tTypeTiersPayant.getLgTYPETIERSPAYANTID(),
                    tTypeTiersPayant.getStrLIBELLETYPETIERSPAYANT());
            BigDecimal montantFactureTp = BigDecimal.ZERO;
            BigDecimal montantRegleTp = BigDecimal.ZERO;
            BigDecimal montantRestantTp = BigDecimal.ZERO;
            for (TFacture facture : factures) {
                FactureDTO factureDTO = new FactureDTO(facture);
                double montantPaye = Objects.requireNonNullElse(facture.getDblMONTANTPAYE(), 0.0);
                if (montantPaye > 0) {
                    factureDTO.setDtUPDATED(df.format(facture.getDtUPDATED()));
                    factureDTO.setHeure(dHeure.format(facture.getDtUPDATED()));
                }
                montantFactureTp = montantFactureTp.add(BigDecimal.valueOf(facture.getDblMONTANTCMDE()));
                montantRegleTp = montantRegleTp.add(BigDecimal.valueOf(montantPaye));
                montantRestantTp = montantRestantTp.add(BigDecimal.valueOf(facture.getDblMONTANTRESTANT()));
                invoies.add(factureDTO);
            }

            reportFacture.setMontantFacture(montantFactureTp);
            reportFacture.setFactures(invoies);
            reportFacture.setMontantRegle(montantRegleTp);
            reportFacture.setMontantRestant(montantRestantTp);
            tierspayants.add(reportFacture);
            montantFacture = montantFacture.add(montantFactureTp);
            montantRegle = montantRegle.add(montantRegleTp);
            montantRestant = montantRestant.add(montantRestantTp);
        }

        reportTypeTiersPayantFacture.setMontantFacture(montantFacture);
        reportTypeTiersPayantFacture.setTierspayants(tierspayants);
        reportTypeTiersPayantFacture.setMontantRegle(montantRegle);
        reportTypeTiersPayantFacture.setMontantRestant(montantRestant);

        return reportTypeTiersPayantFacture;
    }

    private List<Predicate> fetchFacturesPredicates(CriteriaBuilder cb, Root<TFacture> root,
            Join<TFacture, TTiersPayant> st, String searchTerm, String tiersPayantId, String codeFacture,
            String invoiceFilter, Date dtStart, Date dtEnd) {
        List<Predicate> predicates = new ArrayList<>();

        if (StringUtils.isNotBlank(codeFacture)) {
            predicates.add(cb.like(root.get(TFacture_.strCODEFACTURE), codeFacture + "%"));
        } else {
            predicates.add(cb.isFalse(root.get(TFacture_.template)));

            if (StringUtils.isNotBlank(tiersPayantId)) {
                predicates.add(cb.equal(st.get(TTiersPayant_.lgTIERSPAYANTID), tiersPayantId));
            }

            if (StringUtils.isNotBlank(searchTerm)) {
                String search = searchTerm.trim().toUpperCase() + "%";
                predicates.add(cb.or(cb.like(root.get(TFacture_.strCODEFACTURE), search),
                        cb.like(cb.upper(st.get(TTiersPayant_.strNAME)), search)));
            }
            predicates.add(cb.between(root.get(TFacture_.dtCREATED), dtStart, dtEnd));
            if (StringUtils.isNotBlank(invoiceFilter)) {

                switch (invoiceFilter) {
                case "payes":
                    predicates.add(cb.lessThanOrEqualTo(root.get(TFacture_.dblMONTANTRESTANT), 0.0));
                    break;
                case "non_regle":
                    predicates.add(cb.greaterThan(root.get(TFacture_.dblMONTANTRESTANT), 0.0));
                    predicates.add(cb.or(cb.isNull(root.get(TFacture_.dblMONTANTPAYE)),
                            cb.equal(root.get(TFacture_.dblMONTANTPAYE), 0.0)));
                    break;
                case "partiel":
                    predicates.add(cb.greaterThan(root.get(TFacture_.dblMONTANTRESTANT), 0.0));
                    predicates.add(cb.greaterThan(root.get(TFacture_.dblMONTANTPAYE), 0.0));
                    break;
                default:
                    predicates.add(cb.greaterThan(root.get(TFacture_.dblMONTANTRESTANT), 0.0));
                    break;
                }
            }
        }
        return predicates;
    }

    private List<TFacture> fetchFactures(String invoiceFilter, String tiersPayantId, String codeFacture,
            String searchTerm, String dtStart, String dtEnd) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TFacture> cq = cb.createQuery(TFacture.class);
            Root<TFacture> root = cq.from(TFacture.class);
            Join<TFacture, TTiersPayant> st = root.join(TFacture_.tiersPayant, JoinType.INNER);
            Join<TTiersPayant, TTypeTiersPayant> typeTiersPayant = st.join(TTiersPayant_.lgTYPETIERSPAYANTID,
                    JoinType.LEFT);
            cq.select(root).orderBy(cb.asc(typeTiersPayant.get(TTypeTiersPayant_.strLIBELLETYPETIERSPAYANT)),
                    cb.asc(st.get(TTiersPayant_.strFULLNAME)), cb.asc(root.get(TFacture_.strCODEFACTURE)));

            List<Predicate> predicates = fetchFacturesPredicates(cb, root, st, searchTerm, tiersPayantId, codeFacture,
                    invoiceFilter, DateCommonUtils.from(dtStart), DateCommonUtils.toDateAtEndOfDay(dtEnd));

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TFacture> q = getEntityManager().createQuery(cq);

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

}
