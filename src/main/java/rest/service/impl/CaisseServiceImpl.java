/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.BalanceDTO;
import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.GenericDTO;
import commonTasks.dto.MvtCaisseDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RapportDTO;
import commonTasks.dto.ResumeCaisseDTO;
import commonTasks.dto.SumCaisseDTO;
import commonTasks.dto.SummaryDTO;
import commonTasks.dto.VenteDetailsDTO;
import commonTasks.dto.VisualisationCaisseDTO;
import dal.AnnulationRecette;
import dal.AnnulationRecette_;
import dal.LigneResumeCaisse;
import dal.LigneResumeCaisse_;
import dal.MvtTransaction;
import dal.MvtTransaction_;
import dal.Notification;
import dal.TBilletage;
import dal.TBilletageDetails;
import dal.TCaisse;
import dal.TCashTransaction;
import dal.TCashTransaction_;
import dal.TClient;
import dal.TCoffreCaisse;
import dal.TEmplacement;
import dal.TEmplacement_;
import dal.TFamille_;
import dal.TModeReglement;
import dal.TMvtCaisse;
import dal.TOfficine;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TReglement;
import dal.TResumeCaisse;
import dal.TResumeCaisse_;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TTypeMvtCaisse_;
import dal.TTypeReglement;
import dal.TTypeReglement_;
import dal.TUser;
import dal.TUser_;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import dal.enumeration.TypeTransaction;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaDelete;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CaisseService;
import rest.service.LogService;
import rest.service.NotificationService;
import rest.service.SessionHelperService;
import rest.service.TransactionService;
import rest.service.dto.CoffreCaisseDTO;
import rest.service.dto.MvtCaisseModeDTO;
import rest.service.dto.MvtCaisseSummaryDTO;
import rest.service.exception.CaisseUsingExeception;
import toolkits.parameters.commonparameter;
import util.Constant;
import util.DateCommonUtils;
import util.DateConverter;
import util.FunctionUtils;
import util.NotificationUtils;
import util.NumberUtils;

/**
 *
 * @author Kobena
 */
@Stateless
public class CaisseServiceImpl implements CaisseService {

    private static final Logger LOG = Logger.getLogger(CaisseServiceImpl.class.getName());
    private static final String MVT_QUERY = "SELECT tm.`lg_TYPE_MVT_CAISSE_ID` AS typeId, m.`str_COMMENTAIRE` AS commentaire,tm.categorie AS categorie,m.lg_MVT_CAISSE_ID AS id,m.str_NUM_COMPTE AS numCompte,DATE(m.dt_CREATED) AS dateOpreration,DATE_FORMAT(m.dt_CREATED,'%H:%i:%s') AS heureOpreration,m.int_AMOUNT AS montant,tm.str_DESCRIPTION AS typeMvtCaisse,CONCAT(SUBSTR(u.str_FIRST_NAME, 1, 1), '.', u.str_LAST_NAME)   AS userAbrName,tr.str_NAME AS modeReglement,m.str_REF_TICKET AS tiket FROM t_mvt_caisse m,t_type_mvt_caisse tm,t_user u, t_mode_reglement modeReglement,t_type_reglement tr  WHERE m.lg_TYPE_MVT_CAISSE_ID=tm.lg_TYPE_MVT_CAISSE_ID"
            + " AND m.int_AMOUNT <> 0 AND u.lg_USER_ID=m.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID=modeReglement.lg_MODE_REGLEMENT_ID AND modeReglement.lg_TYPE_REGLEMENT_ID=tr.lg_TYPE_REGLEMENT_ID AND m.bool_CHECKED=?1 AND DATE(m.dt_CREATED) BETWEEN ?2 AND ?3 {userId} ORDER BY m.dt_CREATED ";

    private static final String MVT_SUMMARY_QUERY = "SELECT tm.`lg_TYPE_MVT_CAISSE_ID` AS typeId, SUM(m.int_AMOUNT) AS montant,tr.str_NAME AS modeReglement FROM t_mvt_caisse m,t_type_mvt_caisse tm,t_user u, t_mode_reglement modeReglement,t_type_reglement tr  "
            + " WHERE m.lg_TYPE_MVT_CAISSE_ID=tm.lg_TYPE_MVT_CAISSE_ID AND tm.`lg_TYPE_MVT_CAISSE_ID` <> '1' AND u.lg_USER_ID=m.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID=modeReglement.lg_MODE_REGLEMENT_ID AND modeReglement.lg_TYPE_REGLEMENT_ID=tr.lg_TYPE_REGLEMENT_ID AND m.bool_CHECKED=?1 AND DATE(m.dt_CREATED) BETWEEN ?2 AND ?3 %s GROUP BY tr.lg_TYPE_REGLEMENT_ID,tm.`lg_TYPE_MVT_CAISSE_ID` ";

    private static final String MVT_QUERY_COUNT = "SELECT COUNT(m.lg_MVT_CAISSE_ID) FROM t_mvt_caisse m,t_user u WHERE  m.int_AMOUNT <> 0 AND u.lg_USER_ID=m.lg_USER_ID AND m.bool_CHECKED=?1 AND DATE(m.dt_CREATED) BETWEEN ?2 AND ?3 %s  ";

    @EJB
    private TransactionService transactionService;
    @EJB
    private LogService logService;
    @EJB
    private NotificationService notificationService;
    @EJB
    private SessionHelperService sessionHelperService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public boolean checkParameterByKey(String key) {
        try {
            TParameters parameters = getEntityManager().find(TParameters.class, key);
            return (Integer.parseInt(parameters.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
            return false;
        }
    }

    private void createNotification(String msg, TypeNotification typeNotification, TUser user,
            Map<String, Object> donneesMap, String entityRef) {
        try {
            notificationService.save(
                    new Notification().entityRef(entityRef).donnees(this.notificationService.buildDonnees(donneesMap))
                            .setCategorieNotification(notificationService.getOneByName(typeNotification)).message(msg)
                            .addUser(user));
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }

    @Override
    public JSONObject donneeCaisses(CaisseParamsDTO caisseParams, boolean all) {
        JSONObject json = new JSONObject();
        try {
            Long count = findAllsTransaction(caisseParams);
            if (count == 0) {
                return json.put("total", 0).put("data", new JSONArray());
            }
            SumCaisseDTO caisse = cumul(caisseParams, all);
            List<SumCaisseDTO> os = caisse.getSummary();
            List<VisualisationCaisseDTO> data = caisse.getCaisses();
            json.put("total", count).put("data", new JSONArray(data)).put("metaData", new JSONArray(os));
        } catch (JSONException e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return json;
    }

    @Override
    public SumCaisseDTO cumul(CaisseParamsDTO caisseParams, boolean all) {
        SumCaisseDTO dTO = new SumCaisseDTO();
        try {
            List<SumCaisseDTO> os = new ArrayList<>();
            List<VisualisationCaisseDTO> caisses;
            List<VisualisationCaisseDTO> sum;
            if (!all) {
                caisses = findAllsTransaction(caisseParams, all);
                dTO.setCaisses(caisses);
                sum = findAllsTransaction(caisseParams, true);
            } else {
                caisses = findAllsTransaction(caisseParams, all);
                dTO.setCaisses(caisses);
                sum = caisses;
            }

            Map<String, List<VisualisationCaisseDTO>> map = sum.stream()
                    .collect(Collectors.groupingBy(s -> s.getModeRegle()));
            LongAdder montantEspec = new LongAdder();
            LongAdder montantCredit = new LongAdder();
            LongAdder montantAnnulation = new LongAdder();
            LongAdder montantSortie = new LongAdder();
            LongAdder montantEntree = new LongAdder();
            LongAdder montantVir = new LongAdder();
            LongAdder montantCb = new LongAdder();
            LongAdder montantcheque = new LongAdder();
            LongAdder montantCaisse = new LongAdder();
            LongAdder montantFondCaisse = new LongAdder();
            LongAdder montantMobileMoney = new LongAdder();

            map.forEach((k, v) -> {
                switch (k) {
                case DateConverter.MODE_ESP:
                    v.forEach(b -> {
                        montantCaisse.add(b.getMontantCaisse());
                        if (b.getTypeMvt().equals(DateConverter.MVT_FOND_CAISSE)) {
                            montantFondCaisse.add(b.getMontant());
                        } else {
                            montantEspec.add(b.getMontant());

                            if (b.getTypeMvt().equals(DateConverter.MVT_REGLE_VO)
                                    || b.getTypeMvt().equals(DateConverter.MVT_REGLE_VNO)) {
                                montantCredit.add(b.getMontantCredit());
                                if (b.getMontant() < 0) {
                                    montantAnnulation.add(b.getMontant());
                                }
                            } else {
                                if (b.getMontant() < 0) {
                                    montantSortie.add(b.getMontant());
                                } else {
                                    montantEntree.add(b.getMontant());
                                }
                            }
                        }

                    });
                    break;
                case DateConverter.MODE_VIREMENT:
                    v.forEach(b -> {
                        montantVir.add(b.getMontant());
                        if (b.getTypeMvt().equals(DateConverter.MVT_REGLE_VO)
                                || b.getTypeMvt().equals(DateConverter.MVT_REGLE_VNO)) {
                            montantCredit.add(b.getMontantCredit());
                            if (b.getMontant() < 0) {
                                montantAnnulation.add(b.getMontant());
                            }
                        } else {
                            if (b.getMontant() < 0) {
                                montantSortie.add(b.getMontant());
                            } else {
                                montantEntree.add(b.getMontant());
                            }
                        }

                    });
                    break;
                case DateConverter.MODE_CB:
                    v.forEach(b -> {
                        montantCb.add(b.getMontant());
                        if (b.getTypeMvt().equals(DateConverter.MVT_REGLE_VO)
                                || b.getTypeMvt().equals(DateConverter.MVT_REGLE_VNO)) {
                            montantCredit.add(b.getMontantCredit());
                            if (b.getMontant() < 0) {
                                montantAnnulation.add(b.getMontant());
                            }
                        } else {
                            if (b.getMontant() < 0) {
                                montantSortie.add(b.getMontant());
                            } else {
                                montantEntree.add(b.getMontant());
                            }
                        }

                    });
                    break;
                case DateConverter.MODE_CHEQUE:
                    v.forEach(b -> {
                        montantcheque.add(b.getMontant());
                        if (b.getTypeMvt().equals(DateConverter.MVT_REGLE_VO)
                                || b.getTypeMvt().equals(DateConverter.MVT_REGLE_VNO)) {
                            montantCredit.add(b.getMontantCredit());
                            if (b.getMontant() < 0) {
                                montantAnnulation.add(b.getMontant());
                            }
                        } else {
                            if (b.getMontant() < 0) {
                                montantSortie.add(b.getMontant());
                            } else {
                                montantEntree.add(b.getMontant());
                            }
                        }
                    });
                    break;
                case DateConverter.MODE_MTN:
                case DateConverter.MODE_MOOV:
                case DateConverter.TYPE_REGLEMENT_ORANGE:
                case DateConverter.MODE_WAVE:
                case DateConverter.MODE_DJAMO:
                    v.forEach(b -> {
                        montantMobileMoney.add(b.getMontant());
                        if (b.getTypeMvt().equals(DateConverter.MVT_REGLE_VO)
                                || b.getTypeMvt().equals(DateConverter.MVT_REGLE_VNO)) {
                            montantCredit.add(b.getMontantCredit());
                            if (b.getMontant() < 0) {
                                montantAnnulation.add(b.getMontant());
                            }
                        } else {
                            if (b.getMontant() < 0) {
                                montantSortie.add(b.getMontant());
                            } else {
                                montantEntree.add(b.getMontant());
                            }
                        }

                    });
                    break;
                default:
                    break;
                }
            });

            int montantTotalEspec = montantEspec.intValue();
            int montantTotalCredit = montantCredit.intValue();
            int montantTotalAnnulation = montantAnnulation.intValue();
            int montantTotalSortie = montantSortie.intValue();
            int montantTotalEntree = montantEntree.intValue();
            int montantTotalVir = montantVir.intValue();
            int montantTotalCb = montantCb.intValue();
            int montantTotalcheque = montantcheque.intValue();
            int montantTotalFondCaisse = montantFondCaisse.intValue();
            int montantTotalMobileMoney = montantMobileMoney.intValue();
            if (montantTotalFondCaisse != 0) {
                os.add(new SumCaisseDTO(montantTotalFondCaisse, "Fond.Caisse"));
            }

            if (montantTotalcheque != 0) {
                os.add(new SumCaisseDTO(montantTotalcheque, "Chèque"));
            }
            if (montantTotalCb != 0) {
                os.add(new SumCaisseDTO(montantTotalCb, "Carte.Bancaire"));
            }
            if (montantTotalVir != 0) {
                os.add(new SumCaisseDTO(montantTotalVir, "Virement"));
            }
            if (montantTotalCredit != 0) {
                os.add(new SumCaisseDTO(montantTotalCredit, "Différé"));
            }
            if (montantTotalSortie != 0) {
                os.add(new SumCaisseDTO(montantTotalSortie, "Sortie.Caisse"));
            }
            if (montantTotalEntree != 0) {
                os.add(new SumCaisseDTO(montantTotalEntree, "Entrée.Caisse"));
            }
            if (montantTotalMobileMoney != 0) {
                os.add(new SumCaisseDTO(montantTotalMobileMoney, "Paiement.Mobile"));
            }
            os.add(new SumCaisseDTO(montantTotalEspec, "Espèce"));
            if (montantTotalAnnulation != 0) {
                os.add(new SumCaisseDTO(montantTotalAnnulation, "Annulation"));
            }
            dTO.setSummary(os);
        } catch (Exception e) {

            LOG.log(Level.SEVERE, "--------------->>> cumul", e);
        }

        return dTO;
    }

    @Override
    public List<SumCaisseDTO> getCaisse(CaisseParamsDTO caisseParams) {
        List<SumCaisseDTO> lis = new ArrayList<>();
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);
            cq.multiselect(cb.sum(root.get(TCashTransaction_.intAMOUNT)), root.get(TCashTransaction_.lgTYPEREGLEMENTID))
                    .groupBy(root.get(TCashTransaction_.lgTYPEREGLEMENTID));
            predicates.add(cb.and(cb.equal(root.get(TCashTransaction_.strTRANSACTIONREF), "C")));
            predicates.add(cb.and(cb.ge(root.get(TCashTransaction_.intAMOUNT), 0)));
            predicates.add(cb.and(cb.notEqual(root.get(TCashTransaction_.strTASK), "ANNULE_VENTE")));
            predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    caisseParams.getEmplacementId())));
            if (caisseParams.getStartHour() != null && caisseParams.getStartEnd() == null) {
                LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
                LocalTime hfin = LocalTime.now();
                LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), hfin);
                Predicate btw = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, root.get(TCashTransaction_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(debut), java.sql.Timestamp.valueOf(fin));
                predicates.add(cb.and(btw));
            } else if (caisseParams.getStartHour() != null && caisseParams.getStartEnd() != null) {
                LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
                LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
                Predicate btw = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, root.get(TCashTransaction_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(debut), java.sql.Timestamp.valueOf(fin));
                predicates.add(cb.and(btw));
            } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() != null) {
                LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), LocalTime.of(0, 0, 0));
                LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
                Predicate btw = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, root.get(TCashTransaction_.dtUPDATED)),
                        java.sql.Timestamp.valueOf(debut), java.sql.Timestamp.valueOf(fin));
                predicates.add(cb.and(btw));
            } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() == null) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TCashTransaction_.dtUPDATED)),
                        java.sql.Date.valueOf(caisseParams.getStartDate()),
                        java.sql.Date.valueOf(caisseParams.getEnd()));
                predicates.add(cb.and(btw));
            }
            if (caisseParams.getTypeReglementId() != null) {
                predicates.add(cb.and(
                        cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), caisseParams.getTypeReglementId())));
            }
            if (caisseParams.getUtilisateurId() != null) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgUSERID"), caisseParams.getUtilisateurId())));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            List<Object[]> data = q.getResultList();
            data.forEach(objects -> lis.add(new SumCaisseDTO(Long.parseLong(objects[0] + ""), objects[1] + "")));
            return lis;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public JSONObject getResumeCaisse(LocalDate dtStart, LocalDate dtEnd, TUser u, boolean cancel, boolean allActivite,
            int start, int limit, boolean all, String userId) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            long total = caisseSummaryCount(dtStart, dtEnd, u, allActivite, userId);
            if (total == 0) {
                json.put("total", 0);
                json.put("data", new JSONArray());
                return json;
            }
            List<ResumeCaisseDTO> os = getResumeCaisse(dtStart, dtEnd, u, allActivite, start, limit, cancel, userId,
                    all);
            int summary = caisseSummary(dtStart, dtEnd, u, allActivite, userId);
            json.put("total", total);
            json.put("data", new JSONArray(os));
            json.put("metaData", new JSONObject().put("summary", summary));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json;
        }
    }

    private Integer getBilletageByCaisse(String ldCAISSEID) {
        Integer montant = 0;
        try {
            TBilletage oTBilletage = (TBilletage) getEntityManager()
                    .createQuery("SELECT t FROM TBilletage t WHERE t.ldCAISSEID = ?1 ").setParameter(1, ldCAISSEID)
                    .getSingleResult();
            if (oTBilletage != null) {
                montant = oTBilletage.getIntAMOUNT().intValue();
            }
        } catch (Exception e) {
            return 0;

        }
        return montant;

    }

    private Integer getBilletageByCaisse(String ldCAISSEID, String lgUSERID) {
        Integer montant = 0;
        try {
            TBilletage oTBilletage = (TBilletage) getEntityManager()
                    .createQuery("SELECT t FROM TBilletage t WHERE t.ldCAISSEID = ?1 AND t.lgUSERID.lgUSERID = ?2")
                    .setParameter(1, ldCAISSEID).setParameter(2, lgUSERID).getSingleResult();
            if (oTBilletage != null) {
                montant = oTBilletage.getIntAMOUNT().intValue();
            }
        } catch (Exception e) {
            return 0;

        }
        return montant;

    }

    @Override
    public List<ResumeCaisseDTO> getResumeCaisse(LocalDate dtStart, LocalDate dtEnd, TUser u, boolean allActivite,
            int start, int limit, boolean cancel, String userId, boolean all) {
        List<Predicate> predicates = new ArrayList<>();
        try {
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TResumeCaisse> cq = cb.createQuery(TResumeCaisse.class);
            Root<TResumeCaisse> root = cq.from(TResumeCaisse.class);
            cq.select(root).orderBy(cb.desc(root.get(TResumeCaisse_.dtCREATED)));
            if (!allActivite) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                        emp.getLgEMPLACEMENTID())));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TResumeCaisse_.dtCREATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(cb.and(btw));
            if (userId != null && !"".equals(userId)) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgUSERID"), userId)));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TResumeCaisse> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            if (!isTrue(Constant.KEY_PRENDRE_EN_COMPTE_FOND_CAISSE)) {
                return q.getResultList().stream()
                        .map(o -> new ResumeCaisseDTO(o,
                                getBilletageByCaisse(o.getLdCAISSEID(), o.getLgUSERID().getLgUSERID()),
                                montantAnnuleGestionCaisse(o.getLgUSERID().getLgUSERID(),
                                        DateConverter.convertDateToLocalDateTime(o.getDtCREATED()),
                                        DateConverter.convertDateToLocalDateTime(o.getDtUPDATED()), false)
                                        + montantAnnuleRecette(o.getLgUSERID().getLgUSERID(),
                                                DateConverter.convertDateToLocalDate(o.getDtCREATED()),
                                                DateConverter.convertDateToLocalDate(o.getDtCREATED())),
                                cancel))
                        .collect(Collectors.toList());
            } else {
                return q.getResultList().stream()
                        .map(o -> new ResumeCaisseDTO(o,
                                getBilletageByCaisse(o.getLdCAISSEID(), o.getLgUSERID().getLgUSERID()),
                                montantAnnuleGestionCaisse(o.getLgUSERID().getLgUSERID(),
                                        DateConverter.convertDateToLocalDateTime(o.getDtCREATED()),
                                        DateConverter.convertDateToLocalDateTime(o.getDtUPDATED()), false)
                                        + montantAnnuleRecette(o.getLgUSERID().getLgUSERID(),
                                                DateConverter.convertDateToLocalDate(o.getDtCREATED()),
                                                DateConverter.convertDateToLocalDate(o.getDtCREATED())),
                                cancel, true))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<VisualisationCaisseDTO> findAllMvtCaisse(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<VisualisationCaisseDTO> cq = cb.createQuery(VisualisationCaisseDTO.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(cb.construct(VisualisationCaisseDTO.class,
                    root.get(MvtTransaction_.tTypeMvtCaisse).get(TTypeMvtCaisse_.strNAME),
                    root.get(MvtTransaction_.tTypeMvtCaisse).get(TTypeMvtCaisse_.lgTYPEMVTCAISSEID),
                    root.get(MvtTransaction_.reglement).get(TTypeReglement_.lgTYPEREGLEMENTID),
                    root.get(MvtTransaction_.reglement).get(TTypeReglement_.strNAME),
                    cb.sum(root.get(MvtTransaction_.montant))))
                    .groupBy(root.get(MvtTransaction_.tTypeMvtCaisse), root.get(MvtTransaction_.reglement));
            predicates.add(cb.and(
                    cb.equal(root.get(MvtTransaction_.magasin).get(TEmplacement_.lgEMPLACEMENTID), emplacementId)));

            predicates.add(cb.between(root.get(MvtTransaction_.mvtDate), dtStart, dtEnd));
            predicates.add(cb.isTrue(root.get(MvtTransaction_.checked)));
            predicates.add(cb.notEqual(root.get(MvtTransaction_.typeTransaction), TypeTransaction.ACHAT));
            predicates.add(root.get(MvtTransaction_.tTypeMvtCaisse).get(TTypeMvtCaisse_.lgTYPEMVTCAISSEID)
                    .in(Arrays.asList(DateConverter.MVT_FOND_CAISSE, DateConverter.MVT_ENTREE_CAISSE,
                            DateConverter.MVT_SORTIE_CAISSE, DateConverter.MVT_REGLE_TP, DateConverter.MVT_REGLE_DIFF,
                            DateConverter.CAUTION_ID)));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<VisualisationCaisseDTO> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private TUser findUser(String idUser) {
        return getEntityManager().find(TUser.class, idUser);
    }

    public TCaisse getTCaisse(String lgUSERID) {

        try {
            TypedQuery<TCaisse> query = getEntityManager()
                    .createQuery("SELECT t FROM TCaisse t WHERE t.lgUSERID.lgUSERID = ?1 ", TCaisse.class)
                    .setParameter(1, lgUSERID).setMaxResults(1);
            TCaisse o = query.getSingleResult();
            getEntityManager().refresh(o);

            return o;
        } catch (Exception e) {
            TUser tu = findUser(lgUSERID);
            TCaisse oTCaisse = new TCaisse();
            oTCaisse.setLgUSERID(tu);
            oTCaisse.setIntSOLDE(0.0);
            oTCaisse.setDtCREATED(new Date());
            oTCaisse.setLgCREATEDBY(tu.getStrLOGIN());
            oTCaisse.setLgCAISSEID(UUID.randomUUID().toString());
            getEntityManager().persist(oTCaisse);
            return oTCaisse;
        }
    }

    public TBilletageDetails getTBilletageDetails(String lgCAISSEID) {

        try {
            TypedQuery<TBilletageDetails> query = getEntityManager()
                    .createQuery("SELECT t FROM TBilletageDetails t WHERE t.lgBILLETAGEID.ldCAISSEID = ?1",
                            TBilletageDetails.class)
                    .setParameter(1, lgCAISSEID);
            query.setMaxResults(1);
            return query.getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    public TResumeCaisse getTResumeCaisse(String lUSERID, String strSTATUT) {
        TResumeCaisse oTResumeCaisse = null;
        try {
            TypedQuery<TResumeCaisse> query = getEntityManager().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID = ?1 AND t.strSTATUT = ?2 ORDER BY t.dtCREATED DESC",
                    TResumeCaisse.class).setParameter(1, lUSERID).setParameter(2, strSTATUT);
            oTResumeCaisse = query.setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return oTResumeCaisse;
    }

    @Override
    public JSONObject rollbackcloseCaisse(TUser o, String idCaisse) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TResumeCaisse oTResumeCaisse = getEntityManager().find(TResumeCaisse.class, idCaisse);

            if (oTResumeCaisse.getStrSTATUT().equals(Constant.STATUT_IS_USING)) {
                json.put("success", false).put("msg",
                        " Impossible d'annuler cette caisse ;La caisse specifiée est déjà  en cours d'utilisation");
                return json;
            }
            TResumeCaisse oTResumeCaisseCurrent = this.getTResumeCaisse(oTResumeCaisse.getLgUSERID().getLgUSERID(),
                    Constant.STATUT_IS_USING);
            if (oTResumeCaisseCurrent != null) {
                json.put("success", false).put("msg",
                        " Impossible d'annuler la clôture cette caisse ;Cet utilisateur a deja une caisse en cours d'utilisation");
                return json;
            }
            TBilletageDetails oBilletageDetails = this.getTBilletageDetails(idCaisse);
            oTResumeCaisse.setLgUPDATEDBY(o.getStrLOGIN());
            oTResumeCaisse.setIntSOLDESOIR(0);
            oTResumeCaisse.setStrSTATUT(Constant.STATUT_IS_USING);
            oTResumeCaisse.setDtUPDATED(new Date());
            Double billetage = 0.0;
            if (oBilletageDetails != null) {
                TBilletage tb = oBilletageDetails.getLgBILLETAGEID();
                billetage = tb.getIntAMOUNT();
                getEntityManager().remove(oBilletageDetails);
                getEntityManager().remove(tb);
            }
            removeLigneResumeCaisse(oTResumeCaisse);
            getEntityManager().merge(oTResumeCaisse);
            String description = "Annulation de la clôture de la caisse de "
                    + oTResumeCaisse.getLgUSERID().getStrFIRSTNAME() + " "
                    + oTResumeCaisse.getLgUSERID().getStrLASTNAME() + " par " + o.getStrFIRSTNAME() + " "
                    + o.getStrLASTNAME() + " effectuée avec succès";
            logService.updateItem(o, idCaisse, description, TypeLog.ANNULATION_DE_CAISSE, oTResumeCaisse);
            Map<String, Object> donneesMap = new HashMap<>();
            donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.ANNULATION_DE_CAISSE.getValue());
            donneesMap.put(NotificationUtils.USER.getId(), o.getStrFIRSTNAME() + " " + o.getStrLASTNAME());
            donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatIntToString(billetage));
            createNotification(description, TypeNotification.ANNULATION_CLOTURE_DE_CAISSE, o, donneesMap,
                    oTResumeCaisse.getLdCAISSEID());

            json.put("success", true).put("msg", "Opération effectuée avec succes ");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impossible d'annuler la cloture de cette caisse");

        }
        return json;
    }

    @Override
    public JSONObject closeCaisse(TUser o, String idCaisse) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TResumeCaisse oResumeCaisse = getEntityManager().find(TResumeCaisse.class, idCaisse);

            if (oResumeCaisse.getStrSTATUT().equals(Constant.STATUT_IS_USING)) {
                json.put("success", false).put("msg", " La caisse est en cours d utilisation ");
                return json;
            } else if (oResumeCaisse.getStrSTATUT().equals(Constant.STATUT_IS_CLOSED)) {
                json.put("success", false).put("msg", " La caisse a déjà été fermée ");
                return json;
            }
            Integer billetage = getBilletageByCaisse(idCaisse);
            oResumeCaisse.setStrSTATUT(Constant.STATUT_IS_CLOSED);
            TCaisse oTCaisse = getTCaisse(oResumeCaisse.getLgUSERID().getLgUSERID());
            String description = "Validation de la Cloture de la caisse de  " + o.getStrLOGIN() + " avec un montant de "
                    + DateConverter.amountFormat(billetage, '.');
            oTCaisse.setIntSOLDE(0.0);
            oTCaisse.setLgUPDATEDBY(o.getLgUSERID());
            oTCaisse.setDtUPDATED(new Date());
            getEntityManager().merge(oTCaisse);
            logService.updateItem(o, idCaisse, description, TypeLog.VALIDATION_DE_CAISSE, oResumeCaisse);
            json.put("success", true).put("msg", " Validation de cloture de caisse effectuée avec succes ");
            Map<String, Object> donneesMap = new HashMap<>();
            donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.VALIDATION_DE_CAISSE.getValue());
            donneesMap.put(NotificationUtils.USER.getId(), o.getStrFIRSTNAME() + " " + o.getStrLASTNAME());
            donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatIntToString(billetage));
            createNotification(description, TypeNotification.VALIDATION_DE_CAISSE, o, donneesMap,
                    oResumeCaisse.getLdCAISSEID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", " Echec de validation de cloture de caisse");

        }
        return json;
    }

    @Override
    public JSONObject createMvt(MvtCaisseDTO caisseDTO, TUser user) throws Exception {
        JSONObject json = new JSONObject();
        EntityManager emg = getEntityManager();
        // try {
        if (!checkCaisse(user)) {
            return json.put("success", false).put("msg", "Votre caisse est fermée.");
        }
        TTypeMvtCaisse typeMvtCaisse = emg.find(TTypeMvtCaisse.class, caisseDTO.getIdTypeMvt());
        TModeReglement modeReglement = findModeByIdOrName(caisseDTO.getIdModeRegle());
        TTypeReglement tTypeReglement = findTypeRegByIdOrName(caisseDTO.getIdTypeRegl());
        if (modeReglement == null) {
            return json.put("success", false).put("msg", "Echec d'encaissement. Mode de règlement inexistant.");
        }
        if (typeMvtCaisse.getLgTYPEMVTCAISSEID().equals(Constant.MVT_SORTIE_CAISSE)) {
            caisseDTO.setAmount(caisseDTO.getAmount() * (-1));
        }
        TMvtCaisse mvtCaisse = addTMvtCaisse(typeMvtCaisse, caisseDTO, modeReglement, user);
        String description = "Mouvement d'une somme de  " + mvtCaisse.getIntAMOUNT().intValue() + " Type de mouvement "
                + typeMvtCaisse.getStrDESCRIPTION() + " par " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
        createReglement(caisseDTO, user, mvtCaisse, modeReglement);
        transactionService.addTransaction(user, user, mvtCaisse.getLgMVTCAISSEID(), mvtCaisse.getIntAMOUNT().intValue(),
                mvtCaisse.getIntAMOUNT().intValue(), mvtCaisse.getIntAMOUNT().intValue(), 0,
                caisseDTO.getAmount() > 0 ? caisseDTO.getAmount() : 0, Boolean.TRUE,
                caisseDTO.getAmount() > 0 ? CategoryTransaction.CREDIT : CategoryTransaction.DEBIT,
                caisseDTO.getAmount() > 0 ? TypeTransaction.ENTREE : TypeTransaction.SORTIE, tTypeReglement,
                typeMvtCaisse, 0, emg, caisseDTO.getAmount() > 0 ? caisseDTO.getAmount() : 0, 0, 0,
                mvtCaisse.getStrREFTICKET());

        logService.updateItem(user, mvtCaisse.getStrREFTICKET(), description, TypeLog.MVT_DE_CAISSE, mvtCaisse);
        Map<String, Object> donneesMap = new HashMap<>();
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MVT_DE_CAISSE.getValue());
        donneesMap.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatIntToString(mvtCaisse.getIntAMOUNT()));
        createNotification(description, TypeNotification.MVT_DE_CAISSE, user, donneesMap, mvtCaisse.getLgMVTCAISSEID());
        return json.put("success", true).put("msg", "Opération effectuée .").put("mvtId", mvtCaisse.getLgMVTCAISSEID());
        /*
         * } catch (Exception e) { LOG.log(Level.SEVERE, null, e); return json.put("success", false).put("msg",
         * "L'opération a échouée."); }
         */

    }

    private TModeReglement findModeByIdOrName(String id) {
        try {
            TypedQuery<TModeReglement> tq = em.createQuery(
                    "SELECT o FROM TModeReglement o WHERE o.lgMODEREGLEMENTID LIKE ?1 OR o.strNAME LIKE ?1 OR o.strDESCRIPTION LIKE ?1",
                    TModeReglement.class);
            tq.setParameter(1, id + "%");
            tq.setMaxResults(1);
            return tq.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private TModeReglement findModeById(String id) {
        try {
            return getEntityManager().find(TModeReglement.class, id);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private TTypeReglement findTypeRegByIdOrName(String id) {
        try {
            TypedQuery<TTypeReglement> tq = em.createQuery(
                    "SELECT o FROM TTypeReglement o WHERE o.lgTYPEREGLEMENTID LIKE ?1 OR o.strNAME LIKE ?1 OR o.strDESCRIPTION LIKE ?1",
                    TTypeReglement.class);
            tq.setParameter(1, id + "%");
            tq.setMaxResults(1);
            return tq.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    public TMvtCaisse addTMvtCaisse(TTypeMvtCaisse typeMvtCaisse, MvtCaisseDTO caisseDTO, TModeReglement modeReglement,
            TUser user) throws Exception {
        DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        TMvtCaisse mvtCaisse = new TMvtCaisse(UUID.randomUUID().toString());
        mvtCaisse.setBoolCHECKED(Boolean.TRUE);
        mvtCaisse.setDtCREATED(new Date());
        mvtCaisse.setLgTYPEMVTCAISSEID(typeMvtCaisse);
        mvtCaisse.setLgMODEREGLEMENTID(modeReglement);
        mvtCaisse.setStrNUMCOMPTE(typeMvtCaisse.getStrCODECOMPTABLE());
        mvtCaisse.setStrNUMPIECECOMPTABLE(caisseDTO.getNumPieceComptable());
        mvtCaisse.setIntAMOUNT(caisseDTO.getAmount().doubleValue());
        mvtCaisse.setStrCOMMENTAIRE(caisseDTO.getCommentaire());
        mvtCaisse.setStrSTATUT(Constant.STATUT_ENABLE);
        mvtCaisse.setDtDATEMVT(dateFormat.parse(caisseDTO.getDateMvt()));
        mvtCaisse.setStrCREATEDBY(user);
        mvtCaisse.setPKey(user.getLgUSERID());
        mvtCaisse.setDtUPDATED(mvtCaisse.getDtCREATED());
        mvtCaisse.setStrREFTICKET(DateConverter.getShortId(10));
        mvtCaisse.setLgUSERID(user.getLgUSERID());
        em.persist(mvtCaisse);
        return mvtCaisse;

    }

    private TReglement createReglement(MvtCaisseDTO caisseDTO, TUser user, TMvtCaisse mvtCaisse,
            TModeReglement modeReglement) throws Exception {
        TReglement tReglement = new TReglement();
        tReglement.setLgREGLEMENTID(UUID.randomUUID().toString());
        tReglement.setStrBANQUE(caisseDTO.getBanque());
        tReglement.setStrCODEMONNAIE(caisseDTO.getCodeMonnaie());
        tReglement.setStrCOMMENTAIRE(caisseDTO.getCommentaire());
        tReglement.setStrLIEU(caisseDTO.getLieux());
        tReglement.setStrFIRSTLASTNAME(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        tReglement.setStrREFRESSOURCE(mvtCaisse.getLgMVTCAISSEID());
        tReglement.setIntTAUX(0);
        tReglement.setDtCREATED(new Date());
        tReglement.setDtUPDATED(new Date());
        tReglement.setLgMODEREGLEMENTID(modeReglement);
        tReglement.setDtREGLEMENT(mvtCaisse.getDtDATEMVT());
        tReglement.setLgUSERID(user);
        tReglement.setBoolCHECKED(mvtCaisse.getBoolCHECKED());
        em.persist(tReglement);
        return tReglement;
    }

    @Override
    public boolean checkCaisse(TUser ooTUser) {
        try {
            TypedQuery<TResumeCaisse> q = this.em.createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID = ?1  AND t.strSTATUT = ?2 ",
                    TResumeCaisse.class);
            q.setParameter(1, ooTUser.getLgUSERID()).setParameter(2, Constant.STATUT_IS_USING).setMaxResults(1);
            return (q.getSingleResult() != null);
        } catch (Exception e) {
            // LOG.log(Level.SEVERE, null, e);
            return false;
        }
    }

    private TCoffreCaisse getStatutCoffre(String userId) {

        try {
            TypedQuery<TCoffreCaisse> q = this.em.createQuery(
                    "SELECT t FROM TCoffreCaisse t WHERE t.lgUSERID.lgUSERID = ?1 AND  t.strSTATUT = ?2  AND   FUNCTION('DATE', t.dtCREATED)=CURRENT_DATE ",
                    TCoffreCaisse.class).setParameter(1, userId).setParameter(2, Constant.STATUT_IS_WAITING_VALIDATION);
            return q.getSingleResult();

        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
            return null;

        }

    }

    @Override
    public JSONObject attribuerFondDeCaisse(String idUser, TUser operateur, Integer amount) throws JSONException {
        EntityManager emg = getEntityManager();
        JSONObject json = new JSONObject();

        try {
            TUser user = emg.find(TUser.class, idUser);

            if (user.getBIsConnected() == null || user.getBIsConnected().equals(false)) {
                return json.put("success", false).put("msg", "Cet utilisateur n'est pas connecté");

            }
            if (checkCaisse(user)) {
                return json.put("success", false).put("msg", "La caisse de cet utilisateur est en cours d'utilisation");
            }
            if (getStatutCoffre(idUser) != null) {
                return json.put("success", false).put("msg", "Cet utilisateur a déjà reçu un fond de caisse");
            }
            createCoffreCaisse(user, operateur, amount.doubleValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("success", false).put("msg", "L'opération a échoué");
        }
        return json.put("success", true).put("msg", "L'opération  effectuée ");
    }

    private void createCoffreCaisse(TUser user, TUser operateur, double amount) throws Exception {
        TCoffreCaisse coffreCaisse = new TCoffreCaisse();
        coffreCaisse.setIdCoffreCaisse(UUID.randomUUID().toString());
        coffreCaisse.setLgUSERID(user);
        coffreCaisse.setIntAMOUNT(amount);
        coffreCaisse.setDtCREATED(new Date());
        coffreCaisse.setStrSTATUT(Constant.STATUT_IS_WAITING_VALIDATION);
        coffreCaisse.setLdCREATEDBY(operateur.getLgUSERID());
        this.em.persist(coffreCaisse);
        String description = "Reaprovisionement de la caisse de " + user.getStrLOGIN() + " d'un montant de "
                + coffreCaisse.getIntAMOUNT().intValue() + " par " + operateur.getStrFIRSTNAME() + " "
                + operateur.getStrLASTNAME();
        logService.updateItem(operateur, coffreCaisse.getIdCoffreCaisse(), description,
                TypeLog.ATTRIBUTION_DE_FOND_DE_CAISSE, coffreCaisse);
        Map<String, Object> donneesMap = new HashMap<>();
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.ATTRIBUTION_DE_FOND_DE_CAISSE.getValue());
        donneesMap.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatIntToString(coffreCaisse.getIntAMOUNT()));
        createNotification(description, TypeNotification.MVT_DE_CAISSE, operateur, donneesMap,
                coffreCaisse.getIdCoffreCaisse());
    }

    private TCaisse findByUser(String userId) {
        try {
            TypedQuery<TCaisse> q = getEntityManager()
                    .createQuery("SELECT o FROM TCaisse o WHERE o.lgUSERID.lgUSERID=?1", TCaisse.class);
            q.setParameter(1, userId);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    public TMvtCaisse addTMvtCaisse(TUser user, TTypeMvtCaisse typeMvtCaisse, TTypeReglement type, String numComptable,
            String modeReglementId, double amount) {
        TModeReglement modeReglement = findModeById(modeReglementId);
        TMvtCaisse mvtCaisse = new TMvtCaisse();
        mvtCaisse.setLgMVTCAISSEID(UUID.randomUUID().toString());
        mvtCaisse.setLgTYPEMVTCAISSEID(typeMvtCaisse);
        mvtCaisse.setLgMODEREGLEMENTID(modeReglement);
        mvtCaisse.setStrNUMCOMPTE(typeMvtCaisse.getStrCODECOMPTABLE());
        mvtCaisse.setStrNUMPIECECOMPTABLE(numComptable);
        mvtCaisse.setIntAMOUNT(amount);
        mvtCaisse.setStrCOMMENTAIRE(typeMvtCaisse.getStrNAME());
        mvtCaisse.setStrSTATUT(Constant.STATUT_ENABLE);
        mvtCaisse.setDtDATEMVT(new Date());
        mvtCaisse.setDtCREATED(mvtCaisse.getDtDATEMVT());
        mvtCaisse.setDtUPDATED(mvtCaisse.getDtDATEMVT());
        mvtCaisse.setStrCREATEDBY(user);
        mvtCaisse.setPKey(user.getLgUSERID());
        mvtCaisse.setStrREFTICKET(DateConverter.getShortId(10));
        mvtCaisse.setLgUSERID(user.getLgUSERID());
        mvtCaisse.setBoolCHECKED(true);
        getEntityManager().persist(mvtCaisse);

        return mvtCaisse;
    }

    Comparator<RapportDTO> comparatorReport = Comparator.comparingInt(RapportDTO::getOder);

    @Override
    public JSONObject rapportGestionViewData(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            Map<Params, List<RapportDTO>> map = rapportGestion(params);
            List<RapportDTO> data = new ArrayList<>();
            LongAdder montantDep = new LongAdder(), montantRg = new LongAdder();
            map.forEach((k, v) -> {
                if (k.getRef().equals(DateConverter.DEPENSES)) {
                    montantDep.add(k.getValue());
                } else {
                    montantRg.add(k.getValue());
                }
                if (v != null) {
                    data.addAll(v);
                }

            });
            data.sort(comparatorReport);
            json.put("total", data.size()).put("data", new JSONArray(data)).put("metaData", new JSONObject()
                    .put("montantCaisse", montantRg.intValue()).put("montantDepense", montantDep.intValue()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    @Override
    public Map<Params, List<RapportDTO>> rapportGestion(Params params) {
        List<RapportDTO> rapports = new ArrayList<>();
        Map<Params, List<RapportDTO>> myMap = new HashMap<>();
        try {
            List<MvtTransaction> transactions = findTransaction(LocalDate.parse(params.getDtStart()),
                    LocalDate.parse(params.getDtEnd()), true,
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), 0, 0, true);
            if (!transactions.isEmpty()) {
                Map<TypeTransaction, List<MvtTransaction>> groupe = transactions.stream()
                        .collect(Collectors.groupingBy(MvtTransaction::getTypeTransaction));
                LongAdder montantDepense = new LongAdder();
                LongAdder montantReglement = new LongAdder();
                LongAdder montantTTC = new LongAdder();
                LongAdder marge = new LongAdder();
                LongAdder montantACHAT = new LongAdder();
                LongAdder counter = new LongAdder();
                LongAdder counterSortie = new LongAdder();
                counter.add(5);
                counterSortie.add(4);
                RapportDTO rapportTTC = new RapportDTO();
                RapportDTO rapportHT = new RapportDTO();
                rapportTTC.setOder(0);
                rapportTTC.setDisplay(0);
                rapportHT.setDisplay(0);
                rapportHT.setOder(1);
                rapportTTC.setLibelle(DateConverter.CA_TTC);
                rapportHT.setLibelle(DateConverter.CA_HT);
                rapportTTC.setCategorie(DateConverter.CA);
                rapportHT.setCategorie(DateConverter.CA);
                groupe.forEach((k, v) -> {
                    switch (k) {
                    case VENTE_COMPTANT:
                    case VENTE_CREDIT:
                        v.forEach(o -> {
                            rapportTTC.setMontant(rapportTTC.getMontant() + o.getMontantNet());
                            marge.add(o.getMarge());
                            rapportHT.setMontant(rapportHT.getMontant() + (o.getMontantNet() - o.getMontantTva()));
                        });
                        montantTTC.add(rapportTTC.getMontant());
                        break;
                    case ACHAT:
                        RapportDTO rapportAcht = new RapportDTO();
                        Integer montantAchat = v.stream().mapToInt(MvtTransaction::getMontantNet).sum();
                        rapportAcht.setMontant(montantAchat);
                        montantACHAT.add(montantAchat);
                        rapportAcht.setOder(2);
                        rapportAcht.setDisplay(1);
                        rapportAcht.setLibelle(DateConverter.ACHATS);
                        rapportAcht.setCategorie(DateConverter.ACHATS);
                        rapports.add(rapportAcht);
                        break;
                    case ENTREE:
                        v.forEach(r -> {
                            RapportDTO rapportEntree = new RapportDTO();
                            rapportEntree.setMontant(r.getMontant());
                            montantReglement.add(r.getMontant());
                            counter.increment();
                            rapportEntree.setDisplay(5);
                            rapportEntree.setOder(counter.intValue());
                            rapportEntree.setLibelle(r.gettTypeMvtCaisse().getStrNAME());
                            rapportEntree.setCategorie(DateConverter.ENTREE_CAISSE);
                            rapports.add(rapportEntree);
                        });
                        break;
                    case SORTIE:
                        v.forEach(r -> {
                            RapportDTO rapportSorie = new RapportDTO();
                            rapportSorie.setMontant(r.getMontant());
                            montantDepense.add(r.getMontant());
                            rapportSorie.setDisplay(4);
                            counterSortie.increment();
                            rapportSorie.setOder(counter.intValue());
                            rapportSorie.setLibelle(r.gettTypeMvtCaisse().getStrNAME());
                            rapportSorie.setCategorie(DateConverter.DEPENSES);
                            rapports.add(rapportSorie);
                        });
                        break;
                    default:
                        break;
                    }
                });
                rapports.add(rapportTTC);
                rapports.add(rapportHT);
                RapportDTO rapportMarge = new RapportDTO();
                rapportMarge.setOder(3);
                rapportMarge.setDisplay(2);
                rapportMarge.setCategorie(DateConverter.MARGE);
                rapportMarge.setLibelle(DateConverter.MARGE);
                rapportMarge.setMontant(marge.intValue());
                rapports.add(rapportMarge);
                Params p = new Params();
                p.setRef(DateConverter.DEPENSES);
                p.setValue(montantDepense.intValue());
                myMap.put(p, rapports);
                p = new Params();
                p.setRef(DateConverter.ENTREE_CAISSE);
                p.setValue(montantReglement.intValue());
                myMap.put(p, null);
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return myMap;
    }

    private List<MvtTransaction> findTransaction(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId, int start, int limit, boolean all) {
        try {
            TypedQuery<MvtTransaction> query = getEntityManager().createQuery(
                    "SELECT o FROM MvtTransaction o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.magasin.lgEMPLACEMENTID=:empl AND o.checked=:checked",
                    MvtTransaction.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);

            if (!all) {
                query.setFirstResult(start);
                query.setMaxResults(limit);

            }
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private TClient findClientByVenteId(String id) {
        try {
            return getEntityManager().find(TClient.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    Comparator<VisualisationCaisseDTO> comparatorCaisse = Comparator
            .comparing(VisualisationCaisseDTO::getDateOperation);

    private List<VisualisationCaisseDTO> findAllsTransaction(CaisseParamsDTO caisseParams, boolean all) {

        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<MvtTransaction> cq = cb.createQuery(MvtTransaction.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(root).orderBy(cb.asc(root.get(MvtTransaction_.createdAt)));

            predicates.add(cb.and(cb.equal(root.get(MvtTransaction_.magasin).get(TEmplacement_.lgEMPLACEMENTID),
                    caisseParams.getEmplacementId())));

            predicates.add(cb.and(cb.notEqual(root.get(MvtTransaction_.typeTransaction), TypeTransaction.ACHAT)));
            if (caisseParams.getStartHour() != null && caisseParams.getStartEnd() != null) {
                LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
                LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
                Predicate btw = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, root.get(MvtTransaction_.createdAt)),
                        java.sql.Timestamp.valueOf(debut), java.sql.Timestamp.valueOf(fin));
                predicates.add(cb.and(btw));
            } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() == null) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(MvtTransaction_.mvtDate)),
                        java.sql.Date.valueOf(caisseParams.getStartDate()),
                        java.sql.Date.valueOf(caisseParams.getEnd()));
                predicates.add(cb.and(btw));
            }
            if (caisseParams.getTypeReglementId() != null) {
                predicates
                        .add(cb.and(cb.equal(root.get(MvtTransaction_.reglement).get(TTypeReglement_.lgTYPEREGLEMENTID),
                                caisseParams.getTypeReglementId())));
            }
            if (caisseParams.getUtilisateurId() != null) {
                predicates.add(cb.and(cb.equal(root.get(MvtTransaction_.caisse).get(TUser_.lgUSERID),
                        caisseParams.getUtilisateurId())));
            }

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(caisseParams.getStart());
                q.setMaxResults(caisseParams.getLimit());
            }

            return q.getResultList().stream()
                    .map(x -> new VisualisationCaisseDTO(x,
                            caisseParams.isFindClient() ? findClientByVenteId(x.getOrganisme()) : null))
                    /* .filter(w->Objects.nonNull(w.getTypeMouvement()) ) */.sorted(comparatorCaisse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private Long findAllsTransaction(CaisseParamsDTO caisseParams) {

        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(cb.count(root));
            predicates.add(cb.equal(root.get(MvtTransaction_.magasin).get(TEmplacement_.lgEMPLACEMENTID),
                    caisseParams.getEmplacementId()));

            predicates.add(cb.and(cb.notEqual(root.get(MvtTransaction_.typeTransaction), TypeTransaction.ACHAT)));
            if (caisseParams.getStartHour() != null && caisseParams.getStartEnd() != null) {
                LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
                LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());
                Predicate btw = cb.between(
                        cb.function("TIMESTAMP", Timestamp.class, root.get(MvtTransaction_.createdAt)),
                        java.sql.Timestamp.valueOf(debut), java.sql.Timestamp.valueOf(fin));
                predicates.add(btw);
            } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() == null) {
                Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(MvtTransaction_.mvtDate)),
                        java.sql.Date.valueOf(caisseParams.getStartDate()),
                        java.sql.Date.valueOf(caisseParams.getEnd()));
                predicates.add(btw);
            }
            if (caisseParams.getTypeReglementId() != null) {
                predicates.add(cb.equal(root.get(MvtTransaction_.reglement).get(TTypeReglement_.lgTYPEREGLEMENTID),
                        caisseParams.getTypeReglementId()));
            }
            if (caisseParams.getUtilisateurId() != null) {
                predicates.add(cb.equal(root.get(MvtTransaction_.caisse).get(TUser_.lgUSERID),
                        caisseParams.getUtilisateurId()));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0l;
        }

    }

    @Override
    public Integer totalVenteDepot(LocalDate dtStart, LocalDate dtEnd, String empl) {
        try {
            Query q = getEntityManager().createQuery(
                    "SELECT SUM(o.intPRICE) FROM TPreenregistrement o WHERE o.intPRICE >0 AND o.bISCANCEL=FALSE AND FUNCTION('DATE',o.dtUPDATED) BETWEEN ?1 AND ?2 AND o.lgTYPEVENTEID.lgTYPEVENTEID=?3 AND o.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?4 ");
            q.setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(3, DateConverter.DEPOT_EXTENSION);
            q.setParameter(4, empl);
            Long t = (Long) q.getSingleResult();
            if (t != null) {
                return t.intValue();
            }
            return 0;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public List<MvtTransaction> venteDepot(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        try {
            TypedQuery<MvtTransaction> query = getEntityManager().createQuery(
                    "SELECT o FROM MvtTransaction o WHERE o.mvtDate BETWEEN :dtStart AND :dtEnd AND o.magasin.lgEMPLACEMENTID <>:empl AND o.checked=:checked AND o.typeTransaction IN :typetransac ",
                    MvtTransaction.class);
            query.setParameter("dtStart", dtStart);
            query.setParameter("dtEnd", dtEnd);
            query.setParameter("empl", emplacementId);
            query.setParameter("checked", checked);
            query.setParameter("typetransac", EnumSet.of(TypeTransaction.VENTE_COMPTANT, TypeTransaction.VENTE_CREDIT));
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private Integer montantAnnuleGestionCaisse(String userId, LocalDateTime dtStart, LocalDateTime dtEnd,
            boolean isSummary) {
        List<Predicate> predicates = new ArrayList<>();
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<MvtTransaction> cq = cb.createQuery(MvtTransaction.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(root);
            if (isSummary) {
                predicates
                        .add(cb.between(root.get(MvtTransaction_.mvtDate), dtStart.toLocalDate(), dtEnd.toLocalDate()));
            } else {
                predicates.add(cb.between(root.get(MvtTransaction_.createdAt), dtStart, dtEnd));
            }
            predicates.add(cb.equal(root.get(MvtTransaction_.caisse).get(TUser_.lgUSERID), userId));
            predicates.add(cb.equal(root.get(MvtTransaction_.categoryTransaction), CategoryTransaction.DEBIT));
            predicates.add(root.get(MvtTransaction_.typeTransaction).in(TypeTransaction.VENTE_CREDIT,
                    TypeTransaction.VENTE_COMPTANT));
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(cq);
            List<MvtTransaction> list = q.getResultList();
            return list.stream().map(x -> Math.abs(x.getMontantRegle())).reduce(0, Integer::sum);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    // la valeur des annulations pour une caisse fermee pendant l'annulation de la vente
    private Integer montantAnnuleRecette(String userId, LocalDate dtStart, LocalDate dtEnd) {
        List<Predicate> predicates = new ArrayList<>();
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<AnnulationRecette> cq = cb.createQuery(AnnulationRecette.class);
            Root<AnnulationRecette> root = cq.from(AnnulationRecette.class);
            cq.select(root);

            predicates.add(cb.between(root.get(AnnulationRecette_.mvtDate), dtStart, dtEnd));
            if (userId != null && !userId.isEmpty()) {
                predicates.add(cb.equal(root.get(AnnulationRecette_.caissier).get(TUser_.lgUSERID), userId));
            }

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<AnnulationRecette> q = getEntityManager().createQuery(cq);
            List<AnnulationRecette> list = q.getResultList();
            return list.stream().map(x -> Math.abs(x.getMontantRegle())).reduce(0, Integer::sum);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private int caisseSummary(LocalDate dtStart, LocalDate dtEnd, TUser u, Boolean allActivite, String userId)
            throws JSONException {
        List<Predicate> predicates = new ArrayList<>();
        try {
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TResumeCaisse> root = cq.from(TResumeCaisse.class);
            cq.select(cb.sum(root.get(TResumeCaisse_.intSOLDESOIR)));
            if (!allActivite) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                        emp.getLgEMPLACEMENTID())));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TResumeCaisse_.dtCREATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(cb.and(btw));
            if (userId != null && !"".equals(userId)) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgUSERID"), userId)));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            Integer total = (Integer) q.getSingleResult();
            return total != null
                    ? total - (montantAnnuleGestionCaisse(null, dtStart.atStartOfDay(), dtEnd.atStartOfDay(), true)
                            + montantAnnuleRecette(null, dtStart, dtEnd))
                    : (-1) * montantAnnuleGestionCaisse(null, dtStart.atStartOfDay(), dtEnd.atStartOfDay(), true)
                            + montantAnnuleRecette(null, dtStart, dtEnd);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    private long caisseSummaryCount(LocalDate dtStart, LocalDate dtEnd, TUser u, Boolean allActivite, String userId) {
        List<Predicate> predicates = new ArrayList<>();
        try {
            TEmplacement emp = u.getLgEMPLACEMENTID();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TResumeCaisse> root = cq.from(TResumeCaisse.class);
            cq.select(cb.count(root));
            if (!allActivite) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                        emp.getLgEMPLACEMENTID())));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TResumeCaisse_.dtCREATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(cb.and(btw));
            if (userId != null && !"".equals(userId)) {
                predicates.add(cb.and(cb.equal(root.get("lgUSERID").get("lgUSERID"), userId)));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<Predicate> mouvementCaissesPredicats(CriteriaBuilder cb, Root<MvtTransaction> root,
            CaisseParamsDTO caisseParams) {
        List<Predicate> predicates = new ArrayList<>();
        Predicate btw = cb.between(root.get(MvtTransaction_.mvtDate), caisseParams.getStartDate(),
                caisseParams.getEnd());
        predicates.add(btw);
        predicates.add(cb.equal(root.get(MvtTransaction_.magasin).get(TEmplacement_.lgEMPLACEMENTID),
                caisseParams.getEmplacementId()));
        predicates.add(root.get(MvtTransaction_.tTypeMvtCaisse).get(TTypeMvtCaisse_.lgTYPEMVTCAISSEID).in(
                DateConverter.MVT_FOND_CAISSE, DateConverter.MVT_REGLE_TP, DateConverter.MVT_REGLE_DIFF,
                DateConverter.MVT_ENTREE_CAISSE, DateConverter.MVT_SORTIE_CAISSE));
        if (caisseParams.getUtilisateurId() != null) {
            predicates.add(cb.and(
                    cb.equal(root.get(MvtTransaction_.caisse).get(TUser_.lgUSERID), caisseParams.getUtilisateurId())));
        }

        return predicates;
    }

    @Override
    public List<VisualisationCaisseDTO> mouvementCaisses(CaisseParamsDTO caisseParams, boolean all) {
        try {
            List<Predicate> predicates;
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<MvtTransaction> cq = cb.createQuery(MvtTransaction.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(root).orderBy(cb.asc(root.get(MvtTransaction_.createdAt)));
            predicates = mouvementCaissesPredicats(cb, root, caisseParams);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(caisseParams.getStart());
                q.setMaxResults(caisseParams.getLimit());
            }
            return q.getResultList().stream()
                    .map(x -> new VisualisationCaisseDTO(x,
                            isReglementTierspayant(x.gettTypeMvtCaisse().getLgTYPEMVTCAISSEID())
                                    ? findClientByVenteId(x.getOrganisme()) : null,
                            isReglementTierspayant(x.gettTypeMvtCaisse().getLgTYPEMVTCAISSEID())
                                    ? findTiersPayantId(x.getOrganisme()) : null))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private Long countMouvementCaisses(CaisseParamsDTO caisseParams) {
        try {
            List<Predicate> predicates;
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(cb.count(root));
            predicates = mouvementCaissesPredicats(cb, root, caisseParams);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Long> q = getEntityManager().createQuery(cq);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0l;
        }
    }

    private boolean isReglementTierspayant(String typeReglement) {
        return typeReglement.equals(DateConverter.MVT_REGLE_TP);
    }

    private TTiersPayant findTiersPayantId(String id) {
        try {
            return getEntityManager().find(TTiersPayant.class, id);

        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject mouvementCaisses(CaisseParamsDTO caisseParams) throws JSONException {
        JSONObject json = new JSONObject();
        long total = countMouvementCaisses(caisseParams);
        if (total == 0) {
            return json.put("total", 0).put("data", new JSONArray());
        }
        List<SumCaisseDTO> summary = summaryMouvementCaisses(caisseParams);
        List<VisualisationCaisseDTO> data = mouvementCaisses(caisseParams, false);
        return json.put("total", total).put("data", new JSONArray(data)).put("metaData", new JSONArray(summary));

    }

    private List<SumCaisseDTO> summaryMouvementCaisses(CaisseParamsDTO caisseParams) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<SumCaisseDTO> cq = cb.createQuery(SumCaisseDTO.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(cb.construct(SumCaisseDTO.class, root.get(MvtTransaction_.reglement).get(TTypeReglement_.strNAME),
                    cb.sumAsLong(root.get(MvtTransaction_.montant)))).groupBy(root.get(MvtTransaction_.reglement));
            List<Predicate> predicates = mouvementCaissesPredicats(cb, root, caisseParams);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public long getMontantCa(LocalDate dtStart, LocalDate dtEnd) {
        try {
            TUser tUser = sessionHelperService.getCurrentUser();
            Query query = getEntityManager().createNativeQuery(
                    "SELECT COALESCE( SUM(vr.montant),0) AS montantEspece FROM  vente_reglement vr JOIN mvttransaction mv ON vr.vente_id=mv.vente_id "
                            + "  WHERE DATE(vr.mvtDate) BETWEEN ?1 AND ?2 AND vr.type_regelement=1 AND mv.typeTransaction=0  AND mv.checked  AND mv.lg_EMPLACEMENT_ID=?3");
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, tUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

            return ((Number) query.getSingleResult()).longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0L;
        }
    }

    @Override
    public List<Object[]> getVenteReglements(LocalDate dtStart, LocalDate dtEnd, int start, int max) {
        try {
            String lgEmp = sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            Query query = getEntityManager().createNativeQuery(
                    "SELECT vr.montant AS montantEspece,vr.id AS id, vr.vente_id AS vente_id,mv.`uuid` AS mvTransactId FROM  vente_reglement vr JOIN mvttransaction mv ON vr.vente_id=mv.vente_id JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=vr.vente_id "
                            + " WHERE DATE(vr.mvtDate) BETWEEN ?1 AND ?2 AND vr.type_regelement=1 AND mv.typeTransaction=0 AND mv.lg_EMPLACEMENT_ID=?3 AND mv.checked AND p.int_PRICE_REMISE=0 AND p.int_PRICE >0 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=false  AND p.lg_TYPE_VENTE_ID <> '5' ORDER BY vr.montant DESC");
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, lgEmp);
            query.setFirstResult(start);
            query.setMaxResults(max);
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public MvtTransaction findByVenteId(String venteId) {
        try {
            TypedQuery<MvtTransaction> q = getEntityManager()
                    .createQuery("SELECT o FROM  MvtTransaction o WHERE o.pkey=?1", MvtTransaction.class);
            q.setMaxResults(1);
            q.setParameter(1, venteId);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public boolean getKeyTakeIntoAccount() {
        try {

            TParameters tp = getEntityManager().find(TParameters.class, DateConverter.KEY_TAKE_INTO_ACCOUNT);
            return (Integer.parseInt(tp.getStrVALUE()) == 1);

        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean getKeyParams() {
        try {

            TParameters tp = getEntityManager().find(TParameters.class, DateConverter.KEY_PARAMS);
            return (Integer.parseInt(tp.getStrVALUE()) == 1);

        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public long montantAccount(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            TypeTransaction transaction, String typrReglement) {
        try {
            TypedQuery<Long> query = getEntityManager().createQuery(
                    "SELECT COALESCE(SUM(o.montantAcc),0) FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 AND o.typeTransaction =?5 AND o.reglement.lgTYPEREGLEMENTID=?6",
                    Long.class);
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacementId);
            query.setParameter(4, checked);
            query.setParameter(5, transaction);
            query.setParameter(6, typrReglement);
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public long montantAccount(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            TypeTransaction transaction, String typrReglement, String typeMvtCaisse) {
        try {
            TypedQuery<Long> query = getEntityManager().createQuery(
                    "SELECT COALESCE(SUM(o.montantAcc),0) FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 AND o.typeTransaction =?5 AND o.reglement.lgTYPEREGLEMENTID=?6 AND o.tTypeMvtCaisse.lgTYPEMVTCAISSEID=?7 AND o.flaged=TRUE",
                    Long.class);
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacementId);
            query.setParameter(4, checked);
            query.setParameter(5, transaction);
            query.setParameter(6, typrReglement);
            query.setParameter(7, typeMvtCaisse);
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public long montantAccount(LocalDate dtStart, LocalDate dtEnd, String emplacementId, TypeTransaction transaction,
            String typrReglement, String typeMvtCaisse) {
        try {
            TypedQuery<Long> query = getEntityManager().createQuery(
                    "SELECT COALESCE(SUM(o.montant),0)- COALESCE(SUM(o.montantAcc),0) AS montant FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 AND o.typeTransaction =?5 AND o.flaged=TRUE",
                    Long.class);
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacementId);
            query.setParameter(4, true);
            query.setParameter(5, transaction);
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public TOfficine findOfficine() {
        return getEntityManager().find(TOfficine.class, "1");
    }

    private int stockUg(String idProduit, String emplacementId) {
        try {
            Query q = this.getEntityManager().createNamedQuery("TFamilleStock.findStockUg");
            q.setParameter("lgFAMILLEID", idProduit);
            q.setParameter("lgEMPLACEMENTID", emplacementId);
            return (Integer) q.getSingleResult();
        } catch (Exception e) {

            return 0;
        }
    }

    @Override
    public JSONObject venteUg(LocalDate dtStart, LocalDate dtEnd, String query) {
        int montant = 0, nbreVente = 0;
        List<VenteDetailsDTO> datas = venteUgDTO(dtStart, dtEnd, query);

        for (VenteDetailsDTO e : datas) {
            montant += e.getMontantUg();
            nbreVente += e.getUniteGratuite();

        }
        return new JSONObject().put("total", true).put("data", new JSONArray(datas)).put("metaData",
                new JSONObject().put("montantAchat", montant).put("nbreVente", nbreVente));

    }

    @Override
    public List<VenteDetailsDTO> venteUgDTO(LocalDate dtStart, LocalDate dtEnd, String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> st = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            cq.select(root).orderBy(cb.asc(st.get(TPreenregistrement_.dtUPDATED)));
            Predicate btw = cb.between(cb.function("DATE", Date.class, st.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            predicates.add(cb.greaterThan(root.get(TPreenregistrementDetail_.intUG), 0));
            predicates.add(cb.greaterThan(st.get(TPreenregistrement_.intPRICE), 0));
            predicates.add(cb.isFalse(st.get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.equal(st.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicates.add(cb.equal(st.get(TPreenregistrement_.strTYPEVENTE), DateConverter.VENTE_COMPTANT));
            if (!StringUtils.isEmpty(query)) {
                Predicate predicate = cb.and(cb.or(
                        cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                        cb.like(st.get(TPreenregistrement_.strREFTICKET), query + "%"),
                        cb.like(st.get(TPreenregistrement_.strREF), query + "%"),
                        cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%"),
                        cb.like(root.get(TPreenregistrementDetail_.lgFAMILLEID).get(TFamille_.intEAN13), query + "%")));
                predicates.add(predicate);
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(cq);
            return q.getResultList().stream()
                    .map(e -> new VenteDetailsDTO(e)
                            .stockUg(stockUg(e.getLgFAMILLEID().getLgFAMILLEID(), DateConverter.OFFICINE)))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<MvtTransaction> balanceVenteCaisse(LocalDate dtStart, LocalDate dtEnd, String emplacementId) {
        try {
            TypedQuery<MvtTransaction> query = getEntityManager().createQuery(
                    "SELECT o FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 AND o.tTypeMvtCaisse.lgTYPEMVTCAISSEID=?5 AND o.montant <> o.montantAcc",
                    MvtTransaction.class);
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacementId);
            query.setParameter(4, true);
            query.setParameter(5, DateConverter.MVT_REGLE_VNO);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private int remisePara(String idVente) {
        try {
            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 AND o.lgFAMILLEID.boolACCOUNT=FALSE",
                    TPreenregistrementDetail.class);
            q.setParameter(1, idVente);
            return q.getResultList().stream().map(TPreenregistrementDetail::getIntPRICEREMISE).reduce(0, Integer::sum);
        } catch (Exception e) {
            return 0;
        }
    }

    private GenericDTO balanceFormatPara(List<MvtTransaction> venteVNO) {
        List<BalanceDTO> balances = new ArrayList<>();
        GenericDTO generic = new GenericDTO();
        SummaryDTO summary = new SummaryDTO();
        if (!venteVNO.isEmpty()) {
            BalanceDTO vno = new BalanceDTO();
            vno.setTypeVente("VNO");

            int _montantTTC = 0, _montantNet = 0, _montantRemise = 0, _montantEsp = 0, _montantCheque = 0,
                    _MontantVirement = 0, _montantCB = 0, _montantDiff = 0, _nbreVente = 0, montantAchat = 0,
                    montantSortie = 0, marge = 0, fondCaisse = 0, montantReglDiff = 0, montantRegleTp = 0,
                    montantEntre = 0, montantTva = 0, montantTp = 0, _montantMobilePayment = 0;
            double ratioVA = 0.0;
            int montantTTC = 0, montantNet = 0, montantRemise = 0, panierMoyen = 0, montantEsp = 0, montantCheque = 0,
                    MontantVirement = 0, montantCB = 0, montantDiff = 0, nbreVente = 0, montantMobilePayment = 0;

            for (MvtTransaction mvt : venteVNO) {
                int remise = remisePara(mvt.getPkey());
                montantRemise += remise;
                montantNet += (((mvt.getMontant() - mvt.getMontantAcc()) - remise) - mvt.getMontantttcug());
                montantTTC += ((mvt.getMontant() - mvt.getMontantAcc()) - mvt.getMontantttcug());

                montantTva += (mvt.getMontantTva() - mvt.getMontantTvaUg());
                marge += (mvt.getMarge() - mvt.getMargeug());
                montantDiff += mvt.getMontantRestant();
                if (mvt.getCategoryTransaction().equals(CategoryTransaction.CREDIT)) {
                    nbreVente++;

                }
                int montantPara = ((mvt.getMontant() - mvt.getMontantAcc() - remise) - mvt.getMontantnetug());
                switch (mvt.getReglement().getLgTYPEREGLEMENTID()) {

                case DateConverter.MODE_ESP:

                    montantEsp += montantPara;
                    break;
                case DateConverter.MODE_CHEQUE:
                    montantCheque += montantPara;
                    break;
                case DateConverter.MODE_CB:
                    montantCB += montantPara;
                    break;
                case DateConverter.MODE_VIREMENT:
                    MontantVirement += montantPara;
                    break;
                case DateConverter.MODE_MOOV:
                case DateConverter.TYPE_REGLEMENT_ORANGE:
                case DateConverter.MODE_MTN:
                case DateConverter.MODE_WAVE:
                case DateConverter.MODE_DJAMO:
                    montantMobilePayment += montantPara;
                    break;
                }

            }
            _montantTTC += montantTTC;
            _montantNet += montantNet;
            _MontantVirement += MontantVirement;
            _montantCB += montantCB;
            _montantCheque += montantCheque;
            _montantEsp += montantEsp;
            _montantRemise += montantRemise;
            _montantDiff += montantDiff;
            _nbreVente += nbreVente;
            _montantMobilePayment += montantMobilePayment;
            if (nbreVente > 0) {
                panierMoyen = montantTTC / nbreVente;
            }

            vno.setMontantCB(montantCB);
            vno.setMontantCheque(montantCheque);
            vno.setMontantEsp(montantEsp);
            vno.setMontantDiff(montantDiff);
            vno.setMontantNet(montantNet);
            vno.setMontantTTC(montantTTC);
            vno.setMontantVirement(MontantVirement);
            vno.setNbreVente(nbreVente);
            vno.setMontantRemise(montantRemise);
            vno.setMontantTp(0);
            vno.setMontantMobilePayment(montantMobilePayment);
            vno.setPanierMoyen(panierMoyen);

            int pourcentageVno = (int) Math.round((Double.valueOf(vno.getMontantNet()) * 100) / Math.abs(_montantNet));
            vno.setPourcentage(pourcentageVno);
            balances.add(vno);

            if (montantAchat > 0) {
                ratioVA = Double.valueOf(_montantTTC) / montantAchat;
                ratioVA = new BigDecimal(ratioVA).setScale(2, RoundingMode.HALF_UP).doubleValue();
            }
            summary.setFondCaisse(fondCaisse);
            summary.setMarge(marge);
            summary.setMontantAchat(montantAchat);
            summary.setMontantCB(_montantCB);
            summary.setMontantCheque(_montantCheque);
            summary.setMontantDiff(_montantDiff);
            summary.setMontantRegDiff(montantReglDiff);
            summary.setMontantEntre(montantEntre);
            summary.setMontantEsp(_montantEsp);
            summary.setMontantNet(_montantNet);
            summary.setMontantSortie(montantSortie);
            summary.setMontantVirement(_MontantVirement);
            summary.setMontantMobilePayment(_montantMobilePayment);
            summary.setMontantHT((_montantTTC - montantTva));
            summary.setMontantRegleTp(montantRegleTp);
            summary.setMontantRemise(_montantRemise);
            summary.setMontantTva(montantTva);
            summary.setNbreVente(_nbreVente);
            summary.setMontantTTC(_montantTTC);
            if (_nbreVente > 0) {
                summary.setPanierMoyen(_montantTTC / _nbreVente);
            }
            summary.setRatioVA(ratioVA);
            summary.setMontantTp(montantTp);

        }
        generic.setBalances(balances);
        generic.setSummary(summary);
        return generic;
    }

    @Override
    public GenericDTO balanceVenteCaisseReportPara(LocalDate dtStart, LocalDate dtEnd, String emplacementId) {

        List<MvtTransaction> transactions = balanceVenteCaisse(dtStart, dtEnd, emplacementId);

        return balanceFormatPara(transactions);

    }

    @Override
    public JSONObject balancePara(LocalDate dtStart, LocalDate dtEnd, String emplacementId) throws JSONException {

        List<MvtTransaction> transactions = balanceVenteCaisse(dtStart, dtEnd, emplacementId);

        GenericDTO generic = balanceFormatPara(transactions);

        JSONObject json = new JSONObject();
        List<BalanceDTO> balances = generic.getBalances();
        SummaryDTO summary = generic.getSummary();
        json.put("total", balances.size());
        json.put("data", balances);
        json.put("metaData", new JSONObject(summary));
        return json;
    }

    private boolean isTrue(String parameterKey) {
        try {
            TParameters tp = getEntityManager().find(TParameters.class, parameterKey);
            return (Integer.parseInt(tp.getStrVALUE()) == 1);

        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public List<MvtTransaction> balanceVenteCaisse(LocalDate dtStart, boolean checked, String emplacementId) {
        try {
            TypedQuery<MvtTransaction> query = getEntityManager().createQuery(
                    "SELECT o FROM MvtTransaction o WHERE o.mvtDate = ?1  AND o.magasin.lgEMPLACEMENTID=?2 AND o.checked=?3 ",
                    MvtTransaction.class);
            query.setParameter(1, dtStart);

            query.setParameter(2, emplacementId);
            query.setParameter(3, checked);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public List<rest.service.dto.MvtCaisseDTO> getAllMvtCaisses(String dtStart, String dtEnd, boolean checked,
            String userId, int limit, int start, boolean all) {
        List<rest.service.dto.MvtCaisseDTO> list = new ArrayList<>();
        fetchAllMvtCaisses(dtStart, dtEnd, checked, userId, limit, start, all)
                .forEach(e -> list.add(buildMvtCaisse(e)));
        return list;
    }

    @Override
    public MvtCaisseSummaryDTO getAllMvtCaissesSummary(String dtStart, String dtEnd, String userId, boolean checked) {
        LongAdder total = new LongAdder();
        List<MvtCaisseModeDTO> modes = new ArrayList<>();
        getMvtCaissesSummary(dtStart, dtEnd, checked, userId).forEach((k, v) -> {
            long montant = 0;
            for (rest.service.dto.MvtCaisseDTO mvtCaisseDTO : v) {

                montant += mvtCaisseDTO.getMontant();
            }
            modes.add(MvtCaisseModeDTO.builder().modeReglement(k).montant(montant).build());
            total.add(montant);

        });
        return MvtCaisseSummaryDTO.builder().total(total.sum()).modes(modes).build();
    }

    private String replaceUserPlaceholder(String sql, String userId) {
        return StringUtils.isNotEmpty(userId) ? String.format(sql, String.format(" AND u.lg_USER_ID=%s ", userId))
                : String.format(sql, " ");
    }

    private String replaceUserIdPlaceholder(String sql, String userId) {
        return StringUtils.isNotEmpty(userId) ? sql.replace("{userId}", String.format(" AND u.lg_USER_ID=%s ", userId))
                : sql.replace("{userId}", "");
    }

    @Override
    public JSONObject getAllMvtCaisses(String dtStart, String dtEnd, boolean checked, String userId, int limit,
            int start) {
        return FunctionUtils.returnData(this.getAllMvtCaisses(dtStart, dtEnd, checked, userId, limit, start, false),
                countMvtCaisses(dtStart, dtEnd, checked, userId));
    }

    private List<Tuple> fetchAllMvtCaisses(String dtStart, String dtEnd, boolean checked, String userId, int limit,
            int start, boolean all) {
        String sql = replaceUserIdPlaceholder(MVT_QUERY, userId);
        LOG.log(Level.INFO, "sql---  getAllMvtCaisses {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, checked)
                    .setParameter(2, java.sql.Date.valueOf(dtStart)).setParameter(3, java.sql.Date.valueOf(dtEnd));
            if (!all) {
                query.setFirstResult(start);
                query.setMaxResults(limit);
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private long countMvtCaisses(String dtStart, String dtEnd, boolean checked, String userId) {
        String sql = replaceUserPlaceholder(MVT_QUERY_COUNT, userId);
        LOG.log(Level.INFO, "sql---  getAllMvtCaisses {0}", sql);
        try {
            Query query = em.createNativeQuery(sql).setParameter(1, checked)
                    .setParameter(2, java.sql.Date.valueOf(dtStart)).setParameter(3, java.sql.Date.valueOf(dtEnd));

            return ((Number) query.getSingleResult()).longValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private Map<String, List<rest.service.dto.MvtCaisseDTO>> getMvtCaissesSummary(String dtStart, String dtEnd,
            boolean checked, String userId) {
        String sql = replaceUserPlaceholder(MVT_SUMMARY_QUERY, userId);
        LOG.log(Level.INFO, "sql---  MVT_SUMMARY_QUERY {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, checked)
                    .setParameter(2, java.sql.Date.valueOf(dtStart)).setParameter(3, java.sql.Date.valueOf(dtEnd));

            return ((List<Tuple>) query.getResultList()).stream().map(this::buildCaissesSummary)
                    .collect(Collectors.groupingBy(rest.service.dto.MvtCaisseDTO::getModeReglement));

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Map.of();
        }
    }

    private rest.service.dto.MvtCaisseDTO buildMvtCaisse(Tuple t) {

        long amount = t.get("montant", Double.class).longValue();
        String typeMvtId = t.get("typeId", String.class);

        return rest.service.dto.MvtCaisseDTO.builder().montant(amount).id(t.get("id", String.class))
                .typeMvtCaisse(t.get("typeMvtCaisse", String.class)).modeReglement(t.get("modeReglement", String.class))
                .userAbrName(t.get("userAbrName", String.class)).numCompte(t.get("numCompte", String.class))
                .tiket(t.get("tiket", String.class)).heureOpreration(t.get("heureOpreration", String.class))
                .dateOpreration(t.get("dateOpreration", java.sql.Date.class).toLocalDate()
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .typeId(typeMvtId).commentaire(t.get("commentaire", String.class)).build();
    }

    private rest.service.dto.MvtCaisseDTO buildCaissesSummary(Tuple t) {

        return rest.service.dto.MvtCaisseDTO.builder().montant(t.get("montant", Double.class).longValue())
                .typeId(t.get("typeId", String.class)).modeReglement(t.get("modeReglement", String.class)).build();

    }

    @Override
    public String ouvrirCaisse(TUser user, CoffreCaisseDTO coffreCaisse) throws CaisseUsingExeception {
        return attribuerFondDeCaisse(coffreCaisse, user);
    }

    private String attribuerFondDeCaisse(CoffreCaisseDTO coffreCaisseDto, TUser user) throws CaisseUsingExeception {

        if (checkCaisse(user)) {
            throw new CaisseUsingExeception("La caisse de cet utilisateur est en cours d'utilisation");
        }
        if (getStatutCoffre(user.getLgUSERID()) != null) {
            throw new CaisseUsingExeception("Cet utilisateur a déjà reçu un fond de caisse");
        }
        String description = "Ouverture de la caisse de " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()
                + " d'un montant de " + coffreCaisseDto.getAmount();
        TCoffreCaisse coffreCaisse = createCoffreCaisse(user, coffreCaisseDto);
        TMvtCaisse mvtCaisse = validerFondDeCaisse(coffreCaisse, user, description);
        logService.updateItem(user, coffreCaisse.getIdCoffreCaisse(), description, TypeLog.OUVERTURE_CAISSE,
                coffreCaisse);
        Map<String, Object> donneesMap = new HashMap<>();
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.OUVERTURE_CAISSE.getValue());
        donneesMap.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatIntToString(coffreCaisseDto.getAmount()));
        createNotification(description, TypeNotification.MVT_DE_CAISSE, user, donneesMap,
                coffreCaisse.getIdCoffreCaisse());
        return mvtCaisse.getLgMVTCAISSEID();

    }

    private TCoffreCaisse createCoffreCaisse(TUser user, CoffreCaisseDTO coffreCaisseDTO) {
        TCoffreCaisse coffreCaisse = new TCoffreCaisse();
        coffreCaisse.setIdCoffreCaisse(UUID.randomUUID().toString());
        coffreCaisse.setLgUSERID(user);
        coffreCaisse.setIntAMOUNT(Double.valueOf(coffreCaisseDTO.getAmount()));
        coffreCaisse.setDtCREATED(new Date());
        coffreCaisse.setDtUPDATED(coffreCaisse.getDtCREATED());
        coffreCaisse.setStrSTATUT(Constant.STATUT_IS_ASSIGN);
        coffreCaisse.setLdCREATEDBY(user.getLgUSERID());
        coffreCaisse.setLdUPDATEDBY(user.getStrLOGIN());
        this.em.persist(coffreCaisse);

        return coffreCaisse;
    }

    private TCaisse updateTCaisse(TCaisse oOTCaisse, TUser user) {
        oOTCaisse.setDtUPDATED(new Date());
        oOTCaisse.setLgUPDATEDBY(user.getStrLOGIN());
        oOTCaisse.setIntSOLDE(0.0);
        oOTCaisse.setLgUSERID(user);
        oOTCaisse.setLgCREATEDBY(user.getLgUSERID());
        getEntityManager().merge(oOTCaisse);
        return oOTCaisse;

    }

    private TCaisse createTCaisse(TUser user) {
        TCaisse oOTCaisse = new TCaisse();
        oOTCaisse.setLgCAISSEID(UUID.randomUUID().toString());
        oOTCaisse.setDtCREATED(new Date());
        oOTCaisse.setDtUPDATED(oOTCaisse.getDtCREATED());
        oOTCaisse.setLgUPDATEDBY(user.getStrLOGIN());
        oOTCaisse.setIntSOLDE(0.0);
        oOTCaisse.setLgUSERID(user);
        oOTCaisse.setLgCREATEDBY(user.getLgUSERID());
        getEntityManager().merge(oOTCaisse);
        return oOTCaisse;

    }

    private void createResummerCaisse(TCoffreCaisse oCoffreCaisse, TUser user) {
        TResumeCaisse resumeCaisse = new TResumeCaisse();
        resumeCaisse.setLdCAISSEID(UUID.randomUUID().toString());
        resumeCaisse.setIntSOLDEMATIN(oCoffreCaisse.getIntAMOUNT().intValue());
        resumeCaisse.setLgUSERID(user);
        resumeCaisse.setDtCREATED(new Date());
        resumeCaisse.setLgCREATEDBY(user.getLgUSERID());
        resumeCaisse.setIdCoffreCaisse(oCoffreCaisse);
        resumeCaisse.setIntSOLDESOIR(0);
        resumeCaisse.setStrSTATUT(Constant.STATUT_IS_USING);
        getEntityManager().persist(resumeCaisse);
    }

    private TMvtCaisse validerFondDeCaisse(TCoffreCaisse oCoffreCaisse, TUser user, String description) {

        TTypeMvtCaisse typeMvtCaisse = getEntityManager().find(TTypeMvtCaisse.class, Constant.MVT_FOND_CAISSE);
        TTypeReglement reglement = getEntityManager().find(TTypeReglement.class, Constant.MODE_ESP);

        TCaisse oOTCaisse = findByUser(user.getLgUSERID());
        if (Objects.nonNull(oOTCaisse)) {
            updateTCaisse(oOTCaisse, user);

        } else {
            createTCaisse(user);
        }
        createResummerCaisse(oCoffreCaisse, user);
        TMvtCaisse mvtCaisse = addTMvtCaisse(user, typeMvtCaisse, reglement, description, "1",
                oCoffreCaisse.getIntAMOUNT());
        int amount = oCoffreCaisse.getIntAMOUNT().intValue();
        transactionService.addTransaction(user, user, mvtCaisse.getLgMVTCAISSEID(), amount, amount, amount, 0,
                Boolean.TRUE, CategoryTransaction.DEBIT, TypeTransaction.SORTIE, reglement, typeMvtCaisse,
                getEntityManager(), 0, 0, 0, mvtCaisse.getStrREFTICKET());

        return mvtCaisse;

    }

    private void removeLigneResumeCaisse(TResumeCaisse resumeCaisse) {

        CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
        CriteriaDelete<LigneResumeCaisse> q = cb.createCriteriaDelete(LigneResumeCaisse.class);
        Root<LigneResumeCaisse> root = q.from(LigneResumeCaisse.class);
        q.where(cb.equal(root.get(LigneResumeCaisse_.resumeCaisse).get(TResumeCaisse_.ldCAISSEID),
                resumeCaisse.getLdCAISSEID()));
        getEntityManager().createQuery(q).executeUpdate();

    }

}
