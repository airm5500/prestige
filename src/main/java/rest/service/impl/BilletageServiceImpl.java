package rest.service.impl;

import dal.LigneResumeCaisse;
import dal.Notification;
import dal.TBilletage;
import dal.TBilletageDetails;
import dal.TCaisse;
import dal.TCoffreCaisse;
import dal.TCoffreCaisse_;
import dal.TEmplacement;
import dal.TResumeCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.TUser_;
import dal.enumeration.TypeLigneResume;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
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
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.BilletageService;
import rest.service.CaisseService;
import rest.service.LogService;
import rest.service.NotificationService;
import rest.service.dto.BilletageDTO;
import rest.service.dto.CoffreCaisseDTO;
import rest.service.dto.LigneResumeCaisseDTO;
import rest.service.dto.UserCaisseDataDTO;
import rest.service.exception.CaisseNotFoundExeception;
import rest.service.exception.CaisseUsingExeception;
import rest.service.exception.CashFundNotFoundExeception;
import util.CommonUtils;
import util.Constant;
import util.DateCommonUtils;
import util.DateUtil;
import util.FunctionUtils;
import util.NotificationUtils;
import util.NumberUtils;

/**
 *
 * @author koben
 */
@Stateless
public class BilletageServiceImpl implements BilletageService {
    // AND v.type_regelement IN(?5)
    // AND m.`lg_MODE_REGLEMENT_ID`=?4 AND

    private static final String SOLDE_SQL = " SELECT SUM(v.montant) AS montantRegle,v.type_regelement AS type_regelement FROM  vente_reglement v JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=v.vente_id WHERE p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?1 \n"
            + " AND  p.`lg_USER_CAISSIER_ID`= ?2 AND p.`dt_UPDATED` BETWEEN ?3 AND ?4  GROUP BY v.type_regelement ";
    private static final String SOLDE_SQL_OTHERS = "SELECT SUM(m.int_AMOUNT) AS montantRegle,tr.lg_TYPE_REGLEMENT_ID AS type_regelement  FROM t_mvt_caisse m,t_mode_reglement mr,t_type_reglement tr, t_user u WHERE   m.lg_MODE_REGLEMENT_ID=mr.lg_MODE_REGLEMENT_ID AND   mr.lg_TYPE_REGLEMENT_ID=tr.lg_TYPE_REGLEMENT_ID AND m.`lg_USER_ID`=u.`lg_USER_ID` AND u.`lg_USER_ID`=?1 AND m.`dt_CREATED` BETWEEN ?2 AND ?3 AND m.`lg_TYPE_MVT_CAISSE_ID` <> '1'  GROUP BY tr.lg_TYPE_REGLEMENT_ID ";

    private static final Logger LOG = Logger.getLogger(BilletageServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;
    @EJB
    private CaisseService caisseService;
    @EJB
    private NotificationService notificationService;

    private TCaisse getUserCaisse(TUser user) {
        try {
            TypedQuery<TCaisse> q = em
                    .createQuery("SELECT o FROM TCaisse o WHERE o.lgUSERID.lgUSERID=?1", TCaisse.class)
                    .setParameter(1, user.getLgUSERID());
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;

        }

    }

    private TCaisse createCaisse(TUser user, double amount) {
        TCaisse oCaisse = new TCaisse();
        oCaisse.setLgUSERID(user);
        oCaisse.setIntSOLDE(amount);
        oCaisse.setDtCREATED(new Date());
        oCaisse.setDtUPDATED(oCaisse.getDtCREATED());
        oCaisse.setLgUPDATEDBY(user.getLgUSERID());
        oCaisse.setLgCREATEDBY(user.getLgUSERID());
        oCaisse.setLgCAISSEID(UUID.randomUUID().toString());

        this.em.persist(oCaisse);
        return oCaisse;
    }

    private Optional<TResumeCaisse> getUserResumeCaisse(TUser user, String status) {

        try {
            TypedQuery<TResumeCaisse> q = this.em.createQuery(
                    "SELECT o FROM TResumeCaisse o WHERE o.lgUSERID.lgUSERID=?1 AND o.strSTATUT=?2 ORDER BY o.dtCREATED DESC",
                    TResumeCaisse.class).setParameter(1, user.getLgUSERID()).setParameter(2, status);
            q.setMaxResults(1);
            return Optional.ofNullable(q.getSingleResult());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Optional.empty();

        }
    }

    private Pair<LocalDateTime, LocalDateTime> buildDateParam(String dtStart, String dtEnd, String hStart,
            String hEnd) {
        LocalDate dateStart = LocalDate.now();

        if (StringUtils.isNotEmpty(dtStart)) {
            dateStart = LocalDate.parse(dtStart);
        }
        LocalDateTime start = dateStart.atStartOfDay();
        LocalDate dateEnd = dateStart;
        if (StringUtils.isNotEmpty(dtEnd)) {
            dateEnd = LocalDate.parse(dtEnd);
        }
        LocalDateTime end = dateEnd.atTime(LocalTime.MAX);
        if (StringUtils.isNotEmpty(hStart)) {
            start = dateStart.atTime(LocalTime.parse(hStart));
        }
        if (StringUtils.isNotEmpty(hEnd)) {
            end = dateStart.atTime(LocalTime.parse(hEnd));
        }
        return Pair.of(start, end);
    }

    @Override
    public UserCaisseDataDTO getUserCaisseData(String dtStart, String dtEnd, String hStart, String hEnd, TUser user) {

        TCaisse caisse = getUserCaisse(user);
        if (caisse == null) {
            caisse = createCaisse(user, 0);
        }
        Optional<TResumeCaisse> o = getUserResumeCaisse(user, Constant.STATUT_IS_USING);
        if (o.isEmpty()) {
            throw new CaisseNotFoundExeception(
                    "Resumé de caisse not found for user " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        }
        TResumeCaisse resumeCaisse = o.get();
        return UserCaisseDataDTO.builder().userId(user.getLgUSERID()).caisseId(caisse.getLgCAISSEID())
                .solde(caisse.getIntSOLDE().longValue())
                .cashFund(Objects.nonNull(resumeCaisse.getIntSOLDEMATIN()) ? resumeCaisse.getIntSOLDEMATIN() : 0)
                .display(true).userFullName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME())
                .createAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtCREATED()))
                .updateAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtUPDATED()))
                .resumeCaisseId(resumeCaisse.getLdCAISSEID()).build();
    }

    private TCoffreCaisse getCoffreCaisse(LocalDateTime dtStart, LocalDateTime dtEnd, TUser user, String status) {
        try {
            TypedQuery<TCoffreCaisse> q = this.em.createQuery(
                    "SELECT o FROM TCoffreCaisse o WHERE o.lgUSERID.lgUSERID=?1 AND  o.dtCREATED BETWEEN ?2 AND ?3 AND o.strSTATUT=?4 ORDER BY  o.dtCREATED DESC",
                    TCoffreCaisse.class).setParameter(1, user.getLgUSERID())
                    .setParameter(2, Timestamp.valueOf(dtStart), TemporalType.TIMESTAMP)
                    .setParameter(3, Timestamp.valueOf(dtEnd), TemporalType.TIMESTAMP).setParameter(4, status);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.INFO, "Cash fund not found");
            return null;
        }
    }

    @Override
    public CoffreCaisseDTO getUserCoffreCaisseDTO(String dtStart, String dtEnd, String hStart, String hEnd, TUser user)
            throws CashFundNotFoundExeception {
        Pair<LocalDateTime, LocalDateTime> pair = buildDateParam(dtStart, dtEnd, hStart, hEnd);
        LocalDateTime start = pair.getLeft();
        LocalDateTime end = pair.getRight();
        TCoffreCaisse caisse = getCoffreCaisse(start, end, user, Constant.STATUT_IS_WAITING_VALIDATION);
        if (Objects.isNull(caisse)) {
            throw new CashFundNotFoundExeception("Not cash fund");
        }
        TUser createdBy = em.find(TUser.class, caisse.getLdCREATEDBY());
        return CoffreCaisseDTO.builder().userId(user.getLgUSERID()).id(caisse.getIdCoffreCaisse())
                .amount(caisse.getIntAMOUNT().intValue()).hidden(true)
                .userFullName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME())
                .createdByFullName(createdBy.getStrFIRSTNAME() + " " + createdBy.getStrLASTNAME())
                .createAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtCREATED()))
                .updateAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtUPDATED())).statut(caisse.getStrSTATUT())
                .build();

    }

    @Override
    public void cloturerCaisse(BilletageDTO billetage, TUser user) throws CaisseUsingExeception {
        TResumeCaisse oTResumeCaisse = this.em.find(TResumeCaisse.class, billetage.getResumeCaisseId());
        if (oTResumeCaisse == null) {
            throw new CaisseUsingExeception("Erreur de cloture de la caisse [" + billetage.getResumeCaisseId() + "]");
        }
        if (oTResumeCaisse.getStrSTATUT().equals(Constant.STATUT_IS_PROGRESS)) {
            throw new CaisseUsingExeception("Impossible de cloturer cette caisse [" + billetage.getResumeCaisseId()
                    + "]. Elle est déjà fermée");
        }
        // caisseAmountOtherMvts(oTResumeCaisse)
        setLigneResumeCaissesFromDto(oTResumeCaisse);
        setLigneResumeCaissesFromReglement(oTResumeCaisse);
        double amount = getCashAmount(oTResumeCaisse, TypeLigneResume.VENTE)
                + getCashAmount(oTResumeCaisse, TypeLigneResume.REGLEMENT);
        TCaisse caisse = getUserCaisse(user);
        Date now = new Date();
        if (caisse == null) {
            createCaisse(user, amount);
        } else {
            caisse.setIntSOLDE(amount);
            caisse.setDtUPDATED(now);
            caisse.setLgUPDATEDBY(user.getLgUSERID());
            this.em.merge(caisse);
        }

        oTResumeCaisse.setLgUPDATEDBY(user.getLgUSERID());
        var montantFinal = (int) amount;
        oTResumeCaisse.setIntSOLDESOIR(montantFinal);
        oTResumeCaisse.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        oTResumeCaisse.setDtUPDATED(now);
        doBilletage(oTResumeCaisse, billetage, user);
        String description = "Cloture de la caisse de  " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()
                + " avec succès avec un montant de: " + NumberUtils.formatLongToString(montantFinal) + " à la date du "
                + DateCommonUtils.formatCurrentDate() + " Billetage " + billetage;
        logService.updateItem(user, oTResumeCaisse.getLdCAISSEID(), description, TypeLog.CLOTURE_CAISSE,
                oTResumeCaisse);

        JSONArray data = new JSONArray();
        List<LigneResumeCaisse> ligneResumeCaisses = oTResumeCaisse.getLigneResumeCaisses();
        for (LigneResumeCaisse ligneResumeCaisse : ligneResumeCaisses) {
            JSONObject jsonItemUg = new JSONObject();
            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), ligneResumeCaisse.getTypeLigne().name());
            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), ligneResumeCaisse.getTypeReglement().getStrNAME());
            jsonItemUg.put(NotificationUtils.MONTANT.getId(),
                    NumberUtils.formatLongToString(ligneResumeCaisse.getMontant()));
            data.put(jsonItemUg);
        }
        Map<String, Object> donneesMap = new HashMap<>();
        if (!data.isEmpty()) {
            donneesMap.put(NotificationUtils.ITEMS.getId(), data);
        }
        donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatLongToString(montantFinal));
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.CLOTURE_CAISSE.getValue());
        donneesMap.put(NotificationUtils.MESSAGE.getId(), description);
        donneesMap.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        Notification notification = createNotification(description, TypeNotification.CLOTURE_DE_CAISSE, user,
                donneesMap, oTResumeCaisse.getLdCAISSEID());
        notificationService.sendMail(notification);
        notificationService.sendSms(notification);

    }

    private Notification createNotification(String msg, TypeNotification typeNotification, TUser user,
            Map<String, Object> donneesMap, String entityRef) {
        Notification notification = new Notification().entityRef(entityRef)
                .donnees(this.notificationService.buildDonnees(donneesMap))
                .setCategorieNotification(notificationService.getOneByName(typeNotification)).message(msg)
                .addUser(user);
        try {
            notificationService.save(notification);
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
        return notification;
    }

    private TBilletage createBilletage(TResumeCaisse caisse, TUser user, double billetageAmount) {
        TBilletage billetage = new TBilletage();
        billetage.setLgBILLETAGEID(UUID.randomUUID().toString());
        billetage.setLdCAISSEID(caisse.getLdCAISSEID());
        billetage.setIntAMOUNT(billetageAmount);
        billetage.setLgUSERID(user);
        billetage.setDtCREATED(new Date());
        billetage.setDtUPDATED(billetage.getDtCREATED());
        this.em.persist(billetage);
        return billetage;
    }

    private void doBilletage(TResumeCaisse caisse, BilletageDTO billetageDTO, TUser user) {
        int total = billetageDTO.getTotal();
        TBilletage billetage = createBilletage(caisse, user, total);
        createBilletageItem(billetage, billetageDTO);
    }

    private void createBilletageItem(TBilletage billetage, BilletageDTO billetageDTO) {

        TBilletageDetails billetageDetails = new TBilletageDetails();
        billetageDetails.setLgBILLETAGEDETAILSID(UUID.randomUUID().toString());
        billetageDetails.setLgBILLETAGEID(billetage);
        billetageDetails.setIntNBDIXMIL(billetageDTO.getDixMille());
        billetageDetails.setIntNBCINQMIL(billetageDTO.getCinqMille());
        billetageDetails.setIntNBDEUXMIL(billetageDTO.getDeuxMille());
        billetageDetails.setIntNBMIL(billetageDTO.getMille());
        billetageDetails.setIntNBCINQCENT(billetageDTO.getCinqCent());
        billetageDetails.setIntAUTRE(billetageDTO.getAutre());
        billetageDetails.setDtCREATED(new Date());
        billetageDetails.setLgCREATEDBY(billetage.getLgUSERID().getStrLOGIN());
        this.em.persist(billetageDetails);
    }

    private List<LigneResumeCaisseDTO> caisseAmount(TResumeCaisse caisse) {

        try {
            Query query = this.em.createNativeQuery(SOLDE_SQL, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, caisse.getLgUSERID().getLgUSERID())
                    .setParameter(3, caisse.getDtCREATED(), TemporalType.TIMESTAMP).setParameter(4, new Date(),
                            TemporalType.TIMESTAMP)/*
                                                    * .setParameter(5, List.of(Constant.MODE_ESP, Constant.MODE_WAVE,
                                                    * Constant.TYPE_REGLEMENT_ORANGE, Constant.MODE_MOOV,
                                                    * Constant.MODE_MTN))
                                                    */;
            return ((List<Tuple>) query.getResultList()).stream().map(LigneResumeCaisseDTO::new)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();

        }

    }

    private List<LigneResumeCaisseDTO> caisseAmountOtherMvts(TResumeCaisse caisse) {
        try {
            Query query = this.em.createNativeQuery(SOLDE_SQL_OTHERS, Tuple.class)
                    .setParameter(1, caisse.getLgUSERID().getLgUSERID())
                    .setParameter(2, caisse.getDtCREATED(), TemporalType.TIMESTAMP)
                    .setParameter(3, new Date(), TemporalType.TIMESTAMP)/* .setParameter(4, Constant.MODE_ESP) */;

            return ((List<Tuple>) query.getResultList()).stream().map(this::buildLigneResumeCaisse)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }

    }

    @Override
    public CoffreCaisseDTO getUserCoffreCaisse(String dtStart, String dtEnd, String hStart, String hEnd, TUser user) {
        Pair<LocalDateTime, LocalDateTime> pair = buildDateParam(dtStart, dtEnd, hStart, hEnd);
        LocalDateTime start = pair.getLeft();
        LocalDateTime end = pair.getRight();
        TCoffreCaisse caisse = getCoffreCaisse(start, end, user, Constant.STATUT_IS_WAITING_VALIDATION);
        boolean isUsing = caisseService.checkCaisse(user);

        if (Objects.nonNull(caisse)) {
            return CoffreCaisseDTO.builder().userId(user.getLgUSERID()).id(caisse.getIdCoffreCaisse())
                    .amount(caisse.getIntAMOUNT().intValue()).hidden(true).inUse(isUsing)
                    .userFullName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME())
                    .createAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtCREATED()))
                    .updateAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtUPDATED()))
                    .statut(caisse.getStrSTATUT()).build();
        }
        if (isUsing) {
            caisse = getCoffreCaisse(start, end, user, Constant.STATUT_IS_ASSIGN);
        }
        if (Objects.nonNull(caisse)) {
            return CoffreCaisseDTO.builder().userId(user.getLgUSERID()).hidden(true).inUse(isUsing)
                    .amount(caisse.getIntAMOUNT().intValue())
                    .userFullName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME())
                    .firstName(user.getStrFIRSTNAME())
                    .createAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(caisse.getDtCREATED()))
                    .lastName(user.getStrLASTNAME()).build();
        }
        return CoffreCaisseDTO.builder().userId(user.getLgUSERID()).hidden(false).inUse(isUsing)
                .userFullName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME()).firstName(user.getStrFIRSTNAME())
                .lastName(user.getStrLASTNAME()).build();

    }

    private List<CoffreCaisseDTO> fetchListCoffreCaisses(LocalDate dtStart, LocalDate end, String search, int start,
            int limit) {
        return getListCoffreCaisses(dtStart, end, search, start, limit).stream().map(this::buildFromTCoffreCaisse)
                .collect(Collectors.toList());

    }

    private List<Predicate> predicatesFondCaisses(LocalDate dtStart, LocalDate dtEnd, String search, CriteriaBuilder cb,
            Root<TCoffreCaisse> root) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.between(cb.function("DATE", Date.class, root.get(TCoffreCaisse_.dtCREATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd)));

        if (StringUtils.isNotEmpty(search)) {

            predicates.add(cb.or(cb.like(root.get(TCoffreCaisse_.lgUSERID).get(TUser_.strFIRSTNAME), search + "%"),
                    cb.like(root.get(TCoffreCaisse_.lgUSERID).get(TUser_.strLASTNAME), search + "%")));
        }

        return predicates;
    }

    private List<TCoffreCaisse> getListCoffreCaisses(LocalDate dtStart, LocalDate dtEnd, String search, int start,
            int limit) {
        try {
            CriteriaBuilder cb = this.em.getCriteriaBuilder();
            CriteriaQuery<TCoffreCaisse> cq = cb.createQuery(TCoffreCaisse.class);
            Root<TCoffreCaisse> root = cq.from(TCoffreCaisse.class);
            cq.select(root).orderBy(cb.desc(root.get(TCoffreCaisse_.dtCREATED)));
            List<Predicate> predicates = predicatesFondCaisses(dtStart, dtEnd, search, cb, root);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TCoffreCaisse> q = this.em.createQuery(cq);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private long countCoffreCaisses(LocalDate dtStart, LocalDate dtEnd, String search) {
        try {
            CriteriaBuilder cb = this.em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TCoffreCaisse> root = cq.from(TCoffreCaisse.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = predicatesFondCaisses(dtStart, dtEnd, search, cb, root);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = this.em.createQuery(cq);
            return (Long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private CoffreCaisseDTO buildFromTCoffreCaisse(TCoffreCaisse coffreCaisse) {
        TUser tUser = coffreCaisse.getLgUSERID();
        TEmplacement emplacement = tUser.getLgEMPLACEMENTID();
        return CoffreCaisseDTO.builder().amount(coffreCaisse.getIntAMOUNT().intValue())
                .userFullName(tUser.getStrFIRSTNAME() + " " + tUser.getStrLASTNAME())
                .emplacement(emplacement.getStrNAME())
                .createAt(DateUtil.convertDateToDD_MM_YYYY_HH_mm(coffreCaisse.getDtCREATED())).build();
    }

    @Override
    public JSONObject getListCoffreCaisses(String dtStart, String dtEnd, String search, int start, int limit) {
        LocalDate dateStart = LocalDate.now();
        LocalDate dateEnd = LocalDate.now();
        if (StringUtils.isNotEmpty(dtStart)) {
            dateStart = LocalDate.parse(dtStart);
        }
        if (StringUtils.isNotEmpty(dtEnd)) {
            dateEnd = LocalDate.parse(dtEnd);
        }
        long count = countCoffreCaisses(dateStart, dateEnd, search);
        List<CoffreCaisseDTO> data = fetchListCoffreCaisses(dateStart, dateEnd, search, start, limit);
        return FunctionUtils.returnData(data, count);
    }

    private void setLigneResumeCaissesFromDto(TResumeCaisse caisse) {
        caisseAmount(caisse).forEach(e -> {
            TTypeReglement typeReglement = em.find(TTypeReglement.class, e.getIdRegelement());
            LigneResumeCaisse ligneResumeCaisse = new LigneResumeCaisse();
            ligneResumeCaisse.setTypeReglement(typeReglement);
            ligneResumeCaisse.setMontant(e.getMontant());
            ligneResumeCaisse.setResumeCaisse(caisse);
            ligneResumeCaisse.setTypeLigne(TypeLigneResume.VENTE);
            caisse.getLigneResumeCaisses().add(ligneResumeCaisse);
        });
    }

    private long getCashAmount(TResumeCaisse caisse, TypeLigneResume typeLigne) {
        return caisse.getLigneResumeCaisses().stream()
                .filter(ligne -> CommonUtils.isCashTypeReglement(ligne.getTypeReglement().getLgTYPEREGLEMENTID())
                        && ligne.getTypeLigne() == typeLigne)
                .mapToLong(LigneResumeCaisse::getMontant).reduce(0, Long::sum);

    }

    private void setLigneResumeCaissesFromReglement(TResumeCaisse caisse) {
        caisseAmountOtherMvts(caisse).forEach(e -> {
            TTypeReglement typeReglement = em.find(TTypeReglement.class, e.getIdRegelement());
            LigneResumeCaisse ligneResumeCaisse = new LigneResumeCaisse();
            ligneResumeCaisse.setTypeReglement(typeReglement);
            ligneResumeCaisse.setMontant(e.getMontant());
            ligneResumeCaisse.setResumeCaisse(caisse);
            ligneResumeCaisse.setTypeLigne(TypeLigneResume.REGLEMENT);
            caisse.getLigneResumeCaisses().add(ligneResumeCaisse);
        });

    }

    private LigneResumeCaisseDTO buildLigneResumeCaisse(Tuple tuple) {

        var montant = tuple.get("montantRegle", Double.class).longValue();
        var idRegelement = tuple.get("type_regelement", String.class);

        return new LigneResumeCaisseDTO(montant, null, idRegelement, null);

    }
}
