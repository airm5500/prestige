/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.DelayedDTO;
import commonTasks.dto.Params;
import commonTasks.dto.ReglementCarnetDTO;
import dal.MotifReglement;
import dal.MvtTransaction;
import dal.Notification;
import dal.ReglementCarnet;
import dal.TClient;
import dal.TClient_;
import dal.TCompteClient;
import dal.TCompteClient_;
import dal.TDossierReglement;
import dal.TDossierReglementDetail;
import dal.TEmplacement_;
import dal.TModeReglement;
import dal.TMotifReglement;
import dal.TMvtCaisse;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClient_;
import dal.TPreenregistrement_;
import dal.TReglement;
import dal.TResumeCaisse;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.TUser_;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import dal.enumeration.TypeReglementCarnet;
import dal.enumeration.TypeTiersPayant;
import dal.enumeration.TypeTransaction;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
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
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.LogService;
import rest.service.NotificationService;
import rest.service.ReglementService;
import rest.service.SessionHelperService;
import rest.service.TransactionService;
import rest.service.dto.DossierReglementDTO;
import util.Constant;
import static util.Constant.MODE_ORANGE;
import util.DateCommonUtils;
import util.DateConverter;
import util.NotificationUtils;
import util.NumberUtils;

/**
 *
 * @author DICI
 */
@Stateless
public class ReglementServiceImpl implements ReglementService {

    private static final Logger LOG = Logger.getLogger(ReglementServiceImpl.class.getName());

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

    @Resource
    private SessionContext sessionContext;

    public EntityManager getEmg() {
        return em;
    }

    @Override
    public boolean checkCaisse(TUser ooTUser) {
        try {
            TypedQuery<TResumeCaisse> q = getEmg().createQuery(
                    "SELECT t FROM TResumeCaisse t WHERE t.lgUSERID.lgUSERID = ?1  AND t.strSTATUT = ?2 ",
                    TResumeCaisse.class);
            q.setParameter(1, ooTUser.getLgUSERID()).setParameter(2, DateConverter.STATUT_IS_IN_USE).setMaxResults(1);
            return (q.getSingleResult() != null);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
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
    public JSONObject listeDifferesData(Params params, boolean pairclient) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            List<DelayedDTO> list = listeDifferes(params, pairclient);
            json.put("total", list.size()).put("data", new JSONArray(list));
        } catch (Exception e) {
        }
        return json;

    }

    Comparator<DelayedDTO> comparator = Comparator.comparing(DelayedDTO::getDate);

    private TPreenregistrementCompteClient findById(String id) {
        return getEmg().find(TPreenregistrementCompteClient.class, id);
    }

    private TClient findClientById(String id) {
        try {
            return getEmg().find(TClient.class, id);
        } catch (Exception e) {
            return null;
        }

    }

    @Override
    public List<DelayedDTO> listeDifferes(Params params, boolean pairclient) {
        try {
            params.setOperateur(this.sessionHelperService.getCurrentUser());
            EntityManager emg = this.getEmg();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementCompteClient> cq = cb.createQuery(TPreenregistrementCompteClient.class);
            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);

            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get(TPreenregistrementCompteClient_.strSTATUT), Constant.STATUT_IS_CLOSED));
            predicates.add(cb.isFalse(root.get(TPreenregistrementCompteClient_.lgPREENREGISTREMENTID)
                    .get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.equal(
                    root.get(TPreenregistrementCompteClient_.lgUSERID).get(TUser_.lgEMPLACEMENTID)
                            .get(TEmplacement_.lgEMPLACEMENTID),
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID()));

            if (params.getDescription() != null) {
                var clientPath = root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                        .get(TCompteClient_.lgCLIENTID);
                String pattern = params.getDescription() + "%";
                predicates.add(cb.or(cb.like(clientPath.get(TClient_.strFIRSTNAME), pattern),
                        cb.like(clientPath.get(TClient_.strLASTNAME), pattern),
                        cb.like(cb.concat(cb.concat(clientPath.get(TClient_.strFIRSTNAME), " "),
                                clientPath.get(TClient_.strLASTNAME)), pattern)));
            }

            // Le filtre par client s'applique indépendamment de pairclient
            if (params.getRef() != null) {
                predicates.add(cb.equal(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                        .get(TCompteClient_.lgCLIENTID).get(TClient_.lgCLIENTID), params.getRef()));
            }

            predicates.add(
                    cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrementCompteClient_.dtUPDATED)),
                            java.sql.Date.valueOf(params.getDtStart()), java.sql.Date.valueOf(params.getDtEnd())));
            predicates.add(cb.greaterThan(root.get(TPreenregistrementCompteClient_.intPRICERESTE), 0));

            cq.select(root).where(cb.and(predicates.toArray(Predicate[]::new)))
                    .orderBy(cb.asc(root.get(TPreenregistrementCompteClient_.dtUPDATED)));

            return emg.createQuery(cq).getResultList().stream().map(DelayedDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private TCompteClient getByClientId(String id) {
        TypedQuery<TCompteClient> q = getEmg()
                .createQuery("SELECT t FROM TCompteClient t WHERE t.lgCLIENTID.lgCLIENTID = ?1", TCompteClient.class)
                .setMaxResults(1).setParameter(1, id);
        return q.getSingleResult();
    }

    private TModeReglement findByIdMod(String id) {
        return getEmg().find(TModeReglement.class, id);
    }

    private TModeReglement findModeReglement(String idTypeRegl) {
        TModeReglement modeReglement;
        switch (idTypeRegl) {
        case "1":
        case "4":
            modeReglement = findByIdMod("1");
            break;
        case "2":
            modeReglement = findByIdMod("2");
            break;
        case "3":
            modeReglement = findByIdMod("5");
            break;
        case "6":
            modeReglement = findByIdMod("7");
            break;
        case "5":
            modeReglement = findByIdMod("6");
            break;
        case "7":
            modeReglement = findByIdMod(MODE_ORANGE);
            break;
        case "8":
            modeReglement = findByIdMod("8");
            break;
        case "9":
            modeReglement = findByIdMod("9");
            break;
        case "10":
            modeReglement = findByIdMod("11");
            break;
        default:
            modeReglement = findByIdMod(idTypeRegl);
            break;

        }
        return modeReglement;
    }

    private TMotifReglement findMotifReglement(String id) {
        return getEmg().find(TMotifReglement.class, id);
    }

    public TMvtCaisse mvtCaisse(TTypeMvtCaisse oTTypeMvtCaisse, TUser u, TModeReglement modeReglement,
            String strNUMCOMPTE, String strNUMPIECECOMPTABLE, TReglement reglement, int intAMOUNT, Date dtDATEMVT,
            String pKEY) {
        TMvtCaisse oTMvtCaisse = new TMvtCaisse();
        oTMvtCaisse.setLgMVTCAISSEID(UUID.randomUUID().toString());
        oTMvtCaisse.setLgTYPEMVTCAISSEID(oTTypeMvtCaisse);
        oTMvtCaisse.setLgMODEREGLEMENTID(modeReglement);
        oTMvtCaisse.setStrNUMCOMPTE(strNUMCOMPTE);
        oTMvtCaisse.setStrNUMPIECECOMPTABLE(strNUMPIECECOMPTABLE);
        oTMvtCaisse.setIntAMOUNT(Double.valueOf(intAMOUNT));
        oTMvtCaisse.setStrCOMMENTAIRE("");
        oTMvtCaisse.setStrSTATUT(Constant.STATUT_ENABLE);
        oTMvtCaisse.setDtDATEMVT(dtDATEMVT);
        oTMvtCaisse.setStrCREATEDBY(u);
        oTMvtCaisse.setDtCREATED(reglement.getDtCREATED());
        oTMvtCaisse.setPKey(pKEY);
        oTMvtCaisse.setDtUPDATED(reglement.getDtCREATED());
        oTMvtCaisse.setStrREFTICKET(DateConverter.getShortId(10));
        oTMvtCaisse.setLgUSERID(u.getLgUSERID());
        oTMvtCaisse.setBoolCHECKED(true);
        getEmg().persist(oTMvtCaisse);
        return oTMvtCaisse;
    }

    private TDossierReglementDetail createDossierReglementDetail(String ref, TDossierReglement dossierReglement,
            int montant) {
        TDossierReglementDetail dossierReglementDetail = new TDossierReglementDetail(UUID.randomUUID().toString());
        dossierReglementDetail.setDblAMOUNT(Double.valueOf(montant));
        dossierReglementDetail.setLgDOSSIERREGLEMENTID(dossierReglement);
        dossierReglementDetail.setDtCREATED(dossierReglement.getDtCREATED());
        dossierReglementDetail.setStrREF(ref);
        dossierReglementDetail.setDtUPDATED(dossierReglement.getDtCREATED());
        dossierReglementDetail.setStrSTATUT(DateConverter.STATUT_IS_CLOSED);
        getEmg().persist(dossierReglementDetail);
        return dossierReglementDetail;
    }

    private JSONObject reglerDiffereAllOld(ClotureVenteParams clotureVenteParams) throws JSONException {
        JSONObject json = new JSONObject();
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        try {

            if (checkCaisse(clotureVenteParams.getUserId())) {
                TTypeMvtCaisse oTTypeMvtCaisse = getEmg().find(TTypeMvtCaisse.class,
                        Constant.KEY_PARAM_MVT_REGLEMENT_DIFFERES);
                TCompteClient compteClient = getByClientId(clotureVenteParams.getClientId());
                List<TPreenregistrementCompteClient> listpreenregistrementCompteClient = getPreenregistrementCompteClients(
                        clotureVenteParams.getUserVendeurId(), clotureVenteParams.getCompteClientId(),
                        compteClient.getLgCOMPTECLIENTID());
                if (listpreenregistrementCompteClient.isEmpty()) {
                    return json.put("success", false).put("msg", "La lisse des vente est vide");
                }
                TModeReglement modeReglement = findModeReglement(clotureVenteParams.getTypeRegleId());
                TDossierReglement dossierReglement = createDossierReglements(clotureVenteParams.getClientId(),
                        clotureVenteParams.getUserId(), clotureVenteParams.getMontantPaye(), "DIFFERE",
                        dateFormat.parse(clotureVenteParams.getNatureVenteId()), clotureVenteParams.getTotalRecap(),
                        new Date());
                TReglement reglement = createTReglement(compteClient.getLgCOMPTECLIENTID(),
                        clotureVenteParams.getUserId(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                        clotureVenteParams.getBanque(), clotureVenteParams.getLieux(), "", modeReglement,
                        clotureVenteParams.getMontantPaye(), clotureVenteParams.getNom(),
                        dateFormat.parse(clotureVenteParams.getNatureVenteId()), new Date());
                TMvtCaisse caisse = mvtCaisse(oTTypeMvtCaisse, clotureVenteParams.getUserId(), modeReglement,
                        oTTypeMvtCaisse.getStrCODECOMPTABLE(), dossierReglement.getLgDOSSIERREGLEMENTID(), reglement,
                        clotureVenteParams.getMontantPaye(), dossierReglement.getDtREGLEMENT(),
                        clotureVenteParams.getNom());

                String description = "Reglement de différé  " + dossierReglement.getDblAMOUNT() + " Type de mouvement "
                        + oTTypeMvtCaisse.getStrDESCRIPTION() + " PAR "
                        + clotureVenteParams.getUserId().getStrFIRSTNAME() + " "
                        + clotureVenteParams.getUserId().getStrLASTNAME();

                transactionService.addTransaction(clotureVenteParams.getUserId(), clotureVenteParams.getUserId(),
                        dossierReglement.getLgDOSSIERREGLEMENTID(), clotureVenteParams.getMontantPaye(),
                        clotureVenteParams.getTotalRecap(), clotureVenteParams.getMontantPaye(),
                        clotureVenteParams.getMontantRecu(), Boolean.TRUE, CategoryTransaction.CREDIT,
                        TypeTransaction.ENTREE, modeReglement.getLgTYPEREGLEMENTID(), oTTypeMvtCaisse, getEmg(),
                        clotureVenteParams.getMontantPaye(), 0, 0, caisse.getStrREFTICKET(),
                        compteClient.getLgCLIENTID().getLgCLIENTID(),
                        clotureVenteParams.getTotalRecap() - clotureVenteParams.getMontantPaye());

                listpreenregistrementCompteClient.forEach(a -> {
                    createDossierReglementDetail(a.getLgPREENREGISTREMENTCOMPTECLIENTID(), dossierReglement,
                            a.getIntPRICERESTE());
                    a.setIntPRICERESTE(0);
                    a.setDtUPDATED(new Date());
                    getEmg().merge(a);
                });
                logService.updateItem(clotureVenteParams.getUserId(), caisse.getLgMVTCAISSEID(), description,
                        TypeLog.MVT_DE_CAISSE, caisse);
                /*
                 * notificationService .save(new
                 * Notification().canal(Canal.SMS_EMAIL).typeNotification(TypeNotification.MVT_DE_CAISSE)
                 * .message(description).addUser(clotureVenteParams.getUserId()));
                 */

                Map<String, Object> donneesMap = new HashMap<>();
                donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MVT_DE_CAISSE_REGLEMENT_DIFFERE.getValue());
                donneesMap.put(NotificationUtils.USER.getId(), clotureVenteParams.getUserId().getStrFIRSTNAME() + " "
                        + clotureVenteParams.getUserId().getStrLASTNAME());
                donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
                donneesMap.put(NotificationUtils.MONTANT.getId(),
                        NumberUtils.formatIntToString(dossierReglement.getDblAMOUNT()));
                createNotification(description, TypeNotification.MVT_DE_CAISSE, clotureVenteParams.getUserId(),
                        donneesMap, caisse.getLgMVTCAISSEID());

                return json.put("success", true).put("msg", "Opération effectuée").put("ref",
                        dossierReglement.getLgDOSSIERREGLEMENTID());
            }

            return json.put("success", false).put("msg", "Votre caisse est fermée");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private MotifReglement fromId(Integer id) {
        if (Objects.nonNull(id)) {
            MotifReglement motifReglement = new MotifReglement();
            motifReglement.setId(id);
            return motifReglement;
        }
        return null;
    }

    @Override
    public JSONObject faireReglementCarnetDepot(ReglementCarnetDTO reglementCarnetDTO, TUser user) {
        JSONObject json = new JSONObject();
        if (!this.checkCaisse(user)) {
            return json.put("success", false).put("msg", "Votre caisse est fermée");
        }
        TTypeMvtCaisse oTTypeMvtCaisse = getEmg().find(TTypeMvtCaisse.class, Constant.MVT_REGLE_TP);
        TTypeReglement typeReglement = getEmg().find(TTypeReglement.class, reglementCarnetDTO.getTypeReglement());
        TModeReglement modeReglement = findModeReglement(typeReglement.getLgTYPEREGLEMENTID());
        TTiersPayant payant = getEmg().find(TTiersPayant.class, reglementCarnetDTO.getTiersPayantId());
        if (payant.getAccount().intValue() < reglementCarnetDTO.getMontantPaye()) {
            return json.put("success", false).put("msg", "VEUILLEZ SAISIR UN MONTANT EGAL OU INFERIEUR AU SOLDE");
        }
        ReglementCarnet carnet = new ReglementCarnet();
        if (Objects.nonNull(reglementCarnetDTO.getMotifId()) && reglementCarnetDTO.getMotifId() != 0) {
            carnet.setMotifReglement(fromId(reglementCarnetDTO.getMotifId()));
        }
        if (StringUtils.isNotEmpty(reglementCarnetDTO.getDateReglement())) {
            carnet.setCreatedAt(DateCommonUtils
                    .convertLocalDateToLocalDateTime(LocalDate.parse(reglementCarnetDTO.getDateReglement())));

        } else {
            carnet.setCreatedAt(LocalDateTime.now());
        }
        carnet.setTypeReglement(typeReglement);

        carnet.setUser(user);
        carnet.setTiersPayant(payant);
        if (!payant.getIsDepot()) {
            carnet.setTypeTiersPayant(TypeTiersPayant.TIERS_PAYANT_EXCLUS);
        }
        Date evtDate = DateCommonUtils.convertLocalDateTimeToDate(carnet.getCreatedAt());
        carnet.setDescription(reglementCarnetDTO.getDescription());
        carnet.setMontantPaye(reglementCarnetDTO.getMontantPaye());
        carnet.setMontantPayer(payant.getAccount().intValue());
        carnet.setMontantRestant(carnet.getMontantPayer() - carnet.getMontantPaye());
        if (Objects.nonNull(reglementCarnetDTO.getTypeReglementCarnet())) {
            carnet.setTypeReglementCarnet(reglementCarnetDTO.getTypeReglementCarnet());
        } else {
            carnet.setTypeReglementCarnet(TypeReglementCarnet.REGLEMENT);
        }

        getEmg().persist(carnet);
        payant.setAccount(payant.getAccount() - carnet.getMontantPaye());
        carnet.setReference(findLastReference() + 1);
        TDossierReglement dossierReglement = createDossierReglements(payant.getLgTIERSPAYANTID(), user,
                carnet.getMontantPaye(), oTTypeMvtCaisse.getStrNAME(), evtDate, carnet.getMontantPayer(), evtDate);
        carnet.setIdDossier(dossierReglement.getLgDOSSIERREGLEMENTID());
        TReglement reglement = createTReglement(payant.getLgTIERSPAYANTID(), user,
                dossierReglement.getLgDOSSIERREGLEMENTID(), "", "", "", modeReglement, carnet.getMontantPaye(), "",
                evtDate, evtDate);
        TMvtCaisse caisse = mvtCaisse(oTTypeMvtCaisse, user, modeReglement, oTTypeMvtCaisse.getStrCODECOMPTABLE(),
                dossierReglement.getLgDOSSIERREGLEMENTID(), reglement, carnet.getMontantPaye(),
                dossierReglement.getDtREGLEMENT(), "");

        String description = "Reglement de   " + dossierReglement.getDblAMOUNT() + " Type de mouvement "
                + oTTypeMvtCaisse.getStrDESCRIPTION() + " PAR " + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
        addTransaction(user, carnet, caisse, dossierReglement.getLgDOSSIERREGLEMENTID(), typeReglement,
                payant.getLgTIERSPAYANTID());
        logService.updateItem(user, caisse.getLgMVTCAISSEID(), description, TypeLog.MVT_DE_CAISSE, caisse, evtDate);

        getEmg().persist(carnet);
        getEmg().merge(payant);

        Map<String, Object> donneesMap = new HashMap<>();
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MVT_DE_CAISSE_REGLEMENT_DEPOT.getValue());
        donneesMap.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donneesMap.put(NotificationUtils.MONTANT.getId(),
                NumberUtils.formatIntToString(dossierReglement.getDblAMOUNT()));
        createNotification(description, TypeNotification.MVT_DE_CAISSE, user, donneesMap, caisse.getLgMVTCAISSEID());

        return json.put("success", true).put("msg", "Opération effectuée").put("ref",
                dossierReglement.getLgDOSSIERREGLEMENTID());

    }

    private int findLastReference() {
        try {
            TypedQuery<Integer> query = getEmg().createQuery("SELECT MAX(o.reference) FROM ReglementCarnet o ",
                    Integer.class);
            return query.getSingleResult();
        } catch (Exception e) {

            return 0;
        }
    }

    public void addTransaction(TUser ooTUser, ReglementCarnet carnet, TMvtCaisse caisse, String pkey,
            TTypeReglement typeReglement, String organisme) {
        MvtTransaction transaction = new MvtTransaction();
        transaction.setUuid(UUID.randomUUID().toString());
        transaction.setUser(ooTUser);
        transaction.setCreatedAt(carnet.getCreatedAt());
        transaction.setPkey(pkey);
        transaction.setMvtDate(carnet.getCreatedAt().toLocalDate());
        transaction.setAvoidAmount(carnet.getMontantPaye());
        transaction.setMontant(carnet.getMontantPaye());
        transaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        transaction.setCaisse(ooTUser);
        transaction.setMontantCredit(0);
        transaction.setMontantVerse(0);
        transaction.setMontantRegle(carnet.getMontantPaye());
        transaction.setMontantPaye(carnet.getMontantPaye());
        transaction.setMontantNet(carnet.getMontantPaye());
        transaction.settTypeMvtCaisse(caisse.getLgTYPEMVTCAISSEID());
        transaction.setReglement(typeReglement);
        transaction.setMontantRestant(0);
        transaction.setMontantRemise(0);
        transaction.setMontantTva(0);
        transaction.setMarge(0);
        transaction.setCategoryTransaction(CategoryTransaction.CREDIT);
        transaction.setTypeTransaction(TypeTransaction.ENTREE);
        transaction.setChecked(Boolean.TRUE);
        transaction.setReference(caisse.getStrREFTICKET());
        transaction.setOrganisme(organisme);
        getEmg().persist(transaction);
    }

    private JSONObject reglerDiffereOld(ClotureVenteParams clotureVenteParams) throws JSONException {

        JSONObject json = new JSONObject();
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        try {
            if (checkCaisse(clotureVenteParams.getUserId())) {
                TTypeMvtCaisse oTTypeMvtCaisse = getEmg().find(TTypeMvtCaisse.class,
                        Constant.KEY_PARAM_MVT_REGLEMENT_DIFFERES);
                TCompteClient compteClient = getByClientId(clotureVenteParams.getClientId());
                JSONArray array = new JSONArray(clotureVenteParams.getCommentaire());
                if (array.isEmpty()) {
                    return json.put("success", false).put("msg", "Veuillez séléction au moins un dossier");
                }
                TModeReglement modeReglement = findModeReglement(clotureVenteParams.getTypeRegleId());
                TDossierReglement dossierReglement = createDossierReglements(clotureVenteParams.getClientId(),
                        clotureVenteParams.getUserId(), clotureVenteParams.getMontantPaye(), "DIFFERE",
                        dateFormat.parse(clotureVenteParams.getNatureVenteId()), clotureVenteParams.getTotalRecap(),
                        new Date());
                TReglement reglement = createTReglement(compteClient.getLgCOMPTECLIENTID(),
                        clotureVenteParams.getUserId(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                        clotureVenteParams.getBanque(), clotureVenteParams.getLieux(), "", modeReglement,
                        clotureVenteParams.getMontantPaye(), clotureVenteParams.getNom(),
                        dateFormat.parse(clotureVenteParams.getNatureVenteId()), new Date());
                TMvtCaisse caisse = mvtCaisse(oTTypeMvtCaisse, clotureVenteParams.getUserId(), modeReglement,
                        oTTypeMvtCaisse.getStrCODECOMPTABLE(), dossierReglement.getLgDOSSIERREGLEMENTID(), reglement,
                        clotureVenteParams.getMontantPaye(), dossierReglement.getDtREGLEMENT(),
                        clotureVenteParams.getNom());

                String description = "Reglement de différé  " + dossierReglement.getDblAMOUNT() + " Type de mouvement "
                        + oTTypeMvtCaisse.getStrDESCRIPTION() + " PAR "
                        + clotureVenteParams.getUserId().getStrFIRSTNAME() + " "
                        + clotureVenteParams.getUserId().getStrLASTNAME();
                transactionService.addTransaction(clotureVenteParams.getUserId(), clotureVenteParams.getUserId(),
                        dossierReglement.getLgDOSSIERREGLEMENTID(), clotureVenteParams.getMontantPaye(),
                        clotureVenteParams.getTotalRecap(), clotureVenteParams.getMontantPaye(),
                        clotureVenteParams.getMontantRecu(), Boolean.TRUE, CategoryTransaction.CREDIT,
                        TypeTransaction.ENTREE, modeReglement.getLgTYPEREGLEMENTID(), oTTypeMvtCaisse, getEmg(),
                        clotureVenteParams.getMontantPaye(), 0, 0, caisse.getStrREFTICKET(),
                        compteClient.getLgCLIENTID().getLgCLIENTID(),
                        clotureVenteParams.getTotalRecap() - clotureVenteParams.getMontantPaye());
                LongAdder montant = new LongAdder();
                montant.add(clotureVenteParams.getMontantPaye());
                array.forEach(a -> {
                    TPreenregistrementCompteClient tp = getEmg().find(TPreenregistrementCompteClient.class, a);
                    int resteMontant = tp.getIntPRICERESTE();
                    int total = (int) montant.sumThenReset();
                    if (total > 0 && total >= resteMontant) {
                        createDossierReglementDetail(tp.getLgPREENREGISTREMENTCOMPTECLIENTID(), dossierReglement,
                                tp.getIntPRICERESTE());
                        tp.setIntPRICERESTE(0);
                        tp.setDtUPDATED(new Date());
                        getEmg().merge(tp);
                        total -= resteMontant;
                        montant.add(total);
                    } else if (total > 0 && total < resteMontant) {
                        createDossierReglementDetail(tp.getLgPREENREGISTREMENTCOMPTECLIENTID(), dossierReglement,
                                total);
                        tp.setIntPRICERESTE(resteMontant - total);
                        tp.setDtUPDATED(new Date());
                        getEmg().merge(tp);
                        montant.reset();
                    }
                });
                logService.updateItem(clotureVenteParams.getUserId(), caisse.getLgMVTCAISSEID(), description,
                        TypeLog.MVT_DE_CAISSE, caisse);

                Map<String, Object> donneesMap = new HashMap<>();
                donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MVT_DE_CAISSE_REGLEMENT_DIFFERE.getValue());
                donneesMap.put(NotificationUtils.USER.getId(), clotureVenteParams.getUserId().getStrFIRSTNAME() + " "
                        + clotureVenteParams.getUserId().getStrLASTNAME());
                donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
                donneesMap.put(NotificationUtils.MONTANT.getId(),
                        NumberUtils.formatIntToString(dossierReglement.getDblAMOUNT()));
                createNotification(description, TypeNotification.MVT_DE_CAISSE, clotureVenteParams.getUserId(),
                        donneesMap, caisse.getLgMVTCAISSEID());

                return json.put("success", true).put("msg", "Opération effectuée").put("ref",
                        dossierReglement.getLgDOSSIERREGLEMENTID());
            }

            return json.put("success", false).put("msg", "Votre caisse est fermée");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public JSONObject reglerDiffereAllV2(ClotureVenteParams p) throws JSONException {

        JSONObject json = new JSONObject();
        try {
            p.setUserId(sessionHelperService.getCurrentUser());
            if (!checkCaisse(p.getUserId())) {
                return json.put("success", false).put("msg", "Votre caisse est fermée");
            }
            TCompteClient compteClient = getByClientId(p.getClientId());
            List<TPreenregistrementCompteClient> listPreEnreg = getPreenregistrementCompteClients(p.getUserVendeurId(),
                    p.getCompteClientId(), compteClient.getLgCOMPTECLIENTID());
            if (listPreEnreg.isEmpty()) {
                return json.put("success", false).put("msg", "La liste des ventes est vide");
            }
            TTypeMvtCaisse typeMvt = getEmg().find(TTypeMvtCaisse.class, Constant.KEY_PARAM_MVT_REGLEMENT_DIFFERES);
            TModeReglement modeReglement = findModeReglement(p.getTypeRegleId());
            Date dateReglement = java.sql.Date.valueOf(LocalDate.parse(p.getNatureVenteId()));
            Date now = new Date();
            TDossierReglement dossierReglement = createDossierReglements(p.getClientId(), p.getUserId(),
                    p.getMontantPaye(), "DIFFERE", dateReglement, p.getTotalRecap(), now);
            TReglement reglement = createTReglement(compteClient.getLgCOMPTECLIENTID(), p.getUserId(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(), p.getBanque(), p.getLieux(), "", modeReglement,
                    p.getMontantPaye(), p.getNom(), dateReglement, now);
            TMvtCaisse caisse = mvtCaisse(typeMvt, p.getUserId(), modeReglement, typeMvt.getStrCODECOMPTABLE(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(), reglement, p.getMontantPaye(),
                    dossierReglement.getDtREGLEMENT(), p.getNom());
            String description = buildDescription(dossierReglement.getDblAMOUNT(), typeMvt.getStrDESCRIPTION(),
                    p.getUserId());
            transactionService.addTransaction(p.getUserId(), p.getUserId(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                    p.getMontantPaye(), p.getTotalRecap(), p.getMontantPaye(), p.getMontantRecu(), Boolean.TRUE,
                    CategoryTransaction.CREDIT, TypeTransaction.ENTREE, modeReglement.getLgTYPEREGLEMENTID(), typeMvt,
                    getEmg(), p.getMontantPaye(), 0, 0, caisse.getStrREFTICKET(),
                    compteClient.getLgCLIENTID().getLgCLIENTID(), p.getTotalRecap() - p.getMontantPaye());
            listPreEnreg.forEach(a -> {
                createDossierReglementDetail(a.getLgPREENREGISTREMENTCOMPTECLIENTID(), dossierReglement,
                        a.getIntPRICERESTE());
                a.setIntPRICERESTE(0);
                a.setDtUPDATED(now);
                getEmg().merge(a);
            });
            logService.updateItem(p.getUserId(), caisse.getLgMVTCAISSEID(), description, TypeLog.MVT_DE_CAISSE, caisse);
            createNotification(description, TypeNotification.MVT_DE_CAISSE, p.getUserId(),
                    buildDonneesMapDiffere(p.getUserId(), dossierReglement.getDblAMOUNT()), caisse.getLgMVTCAISSEID());
            if (Objects.isNull(dossierReglement.getDblAMOUNT())
                    || dossierReglement.getDblAMOUNT().compareTo(0.0) == 0) {
                sessionContext.setRollbackOnly();
                return new JSONObject().put("success", false).put("msg", "Une erreur est survenue lors du règlement");
            }
            return json.put("success", true).put("msg", "Opération effectuée").put("ref",
                    dossierReglement.getLgDOSSIERREGLEMENTID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            sessionContext.setRollbackOnly();
            return new JSONObject().put("success", false).put("msg", "Une erreur est survenue lors du règlement");
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public JSONObject reglerDiffereV2(ClotureVenteParams p) throws JSONException {

        p.setUserId(sessionHelperService.getCurrentUser());
        JSONObject json = new JSONObject();
        try {
            if (!checkCaisse(p.getUserId())) {
                return json.put("success", false).put("msg", "Votre caisse est fermée");
            }
            TCompteClient compteClient = getByClientId(p.getClientId());
            JSONArray array = new JSONArray(p.getCommentaire());
            if (array.isEmpty()) {
                return json.put("success", false).put("msg", "Veuillez sélectionner au moins un dossier");
            }
            TTypeMvtCaisse typeMvt = getEmg().find(TTypeMvtCaisse.class, Constant.KEY_PARAM_MVT_REGLEMENT_DIFFERES);
            TModeReglement modeReglement = findModeReglement(p.getTypeRegleId());
            Date dateReglement = java.sql.Date.valueOf(LocalDate.parse(p.getNatureVenteId()));
            Date now = new Date();
            TDossierReglement dossierReglement = createDossierReglements(p.getClientId(), p.getUserId(),
                    p.getMontantPaye(), "DIFFERE", dateReglement, p.getTotalRecap(), now);
            TReglement reglement = createTReglement(compteClient.getLgCOMPTECLIENTID(), p.getUserId(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(), p.getBanque(), p.getLieux(), "", modeReglement,
                    p.getMontantPaye(), p.getNom(), dateReglement, now);
            TMvtCaisse caisse = mvtCaisse(typeMvt, p.getUserId(), modeReglement, typeMvt.getStrCODECOMPTABLE(),
                    dossierReglement.getLgDOSSIERREGLEMENTID(), reglement, p.getMontantPaye(),
                    dossierReglement.getDtREGLEMENT(), p.getNom());
            String description = buildDescription(dossierReglement.getDblAMOUNT(), typeMvt.getStrDESCRIPTION(),
                    p.getUserId());
            transactionService.addTransaction(p.getUserId(), p.getUserId(), dossierReglement.getLgDOSSIERREGLEMENTID(),
                    p.getMontantPaye(), p.getTotalRecap(), p.getMontantPaye(), p.getMontantRecu(), Boolean.TRUE,
                    CategoryTransaction.CREDIT, TypeTransaction.ENTREE, modeReglement.getLgTYPEREGLEMENTID(), typeMvt,
                    getEmg(), p.getMontantPaye(), 0, 0, caisse.getStrREFTICKET(),
                    compteClient.getLgCLIENTID().getLgCLIENTID(), p.getTotalRecap() - p.getMontantPaye());
            distributePayment(array, dossierReglement, p.getMontantPaye(), now);
            logService.updateItem(p.getUserId(), caisse.getLgMVTCAISSEID(), description, TypeLog.MVT_DE_CAISSE, caisse);
            createNotification(description, TypeNotification.MVT_DE_CAISSE, p.getUserId(),
                    buildDonneesMapDiffere(p.getUserId(), dossierReglement.getDblAMOUNT()), caisse.getLgMVTCAISSEID());
            if (Objects.isNull(dossierReglement.getDblAMOUNT())
                    || dossierReglement.getDblAMOUNT().compareTo(0.0) == 0) {
                sessionContext.setRollbackOnly();
                return new JSONObject().put("success", false).put("msg", "Une erreur est survenue lors du règlement");
            }
            return json.put("success", true).put("msg", "Opération effectuée").put("ref",
                    dossierReglement.getLgDOSSIERREGLEMENTID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            sessionContext.setRollbackOnly();
            return new JSONObject().put("success", false).put("msg", "Une erreur est survenue lors du règlement");
        }
    }

    private void distributePayment(JSONArray array, TDossierReglement dossierReglement, int montantPaye, Date now)
            throws org.json.JSONException {
        int remaining = montantPaye;
        for (int i = 0; i < array.length() && remaining > 0; i++) {
            String id = array.getString(i);
            TPreenregistrementCompteClient tp = getEmg().find(TPreenregistrementCompteClient.class, id);
            if (tp == null) {
                continue;
            }
            int dette = tp.getIntPRICERESTE();
            if (remaining >= dette) {
                createDossierReglementDetail(tp.getLgPREENREGISTREMENTCOMPTECLIENTID(), dossierReglement, dette);
                tp.setIntPRICERESTE(0);
                remaining -= dette;
            } else {
                createDossierReglementDetail(tp.getLgPREENREGISTREMENTCOMPTECLIENTID(), dossierReglement, remaining);
                tp.setIntPRICERESTE(dette - remaining);
                remaining = 0;
            }
            tp.setDtUPDATED(now);
            getEmg().merge(tp);
        }
    }

    private String buildDescription(double amount, String typeMvtDescription, TUser user) {
        return "Reglement de différé  " + amount + " Type de mouvement " + typeMvtDescription + " PAR "
                + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
    }

    private Map<String, Object> buildDonneesMapDiffere(TUser user, double amount) {
        Map<String, Object> donneesMap = new HashMap<>();
        donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MVT_DE_CAISSE_REGLEMENT_DIFFERE.getValue());
        donneesMap.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        donneesMap.put(NotificationUtils.MONTANT.getId(), NumberUtils.formatIntToString(amount));
        return donneesMap;
    }

    public TReglement createTReglement(String strREFCOMPTECLIENT, TUser u, String strREFRESSOURCE, String strBANQUE,
            String strLIEU, String strCOMMENTAIRE, TModeReglement oTModeReglement, int intAMOUNT, String nom,
            Date dtReglement, Date evt) {
        TReglement oTReglement = new TReglement();
        oTReglement.setLgREGLEMENTID(UUID.randomUUID().toString());
        oTReglement.setStrBANQUE(strBANQUE);
        oTReglement.setStrCODEMONNAIE("FR");
        oTReglement.setStrCOMMENTAIRE(strCOMMENTAIRE);
        oTReglement.setStrLIEU(strLIEU);
        oTReglement.setStrFIRSTLASTNAME(nom);
        oTReglement.setStrREFRESSOURCE(strREFRESSOURCE);
        oTReglement.setIntTAUX(0);
        oTReglement.setDtCREATED(evt);
        oTReglement.setDtUPDATED(evt);
        oTReglement.setLgMODEREGLEMENTID(oTModeReglement);
        oTReglement.setDtREGLEMENT(dtReglement);
        oTReglement.setLgUSERID(u);
        oTReglement.setBoolCHECKED(true);
        oTReglement.setBISFACTURE(false);
        oTReglement.setStrSTATUT(Constant.STATUT_IS_CLOSED);
        getEmg().persist(oTReglement);
        return oTReglement;
    }

    private TDossierReglement createDossierReglements(String lgCLIENTID, TUser u, Integer amount, String natureDossier,
            Date dtreglement, Integer montantattendu, Date evt) {

        TDossierReglement oTDossierReglement = new TDossierReglement();
        oTDossierReglement.setLgDOSSIERREGLEMENTID(UUID.randomUUID().toString());
        oTDossierReglement.setDblAMOUNT(Double.valueOf(amount));
        oTDossierReglement.setLgUSERID(u);
        oTDossierReglement.setStrNATUREDOSSIER(natureDossier);
        oTDossierReglement.setStrORGANISMEID(lgCLIENTID);
        oTDossierReglement.setDtREGLEMENT(dtreglement);
        oTDossierReglement.setDtCREATED(evt);
        oTDossierReglement.setDtUPDATED(evt);
        oTDossierReglement.setDblMONTANTATTENDU(Double.valueOf(montantattendu));
        oTDossierReglement.setStrSTATUT(Constant.STATUT_IS_CLOSED);
        getEmg().persist(oTDossierReglement);

        return oTDossierReglement;

    }

    public List<TPreenregistrementCompteClient> getPreenregistrementCompteClients(String dtDebut, String dtFin,
            String cmpt) {

        EntityManager emg = this.getEmg();
        List<Predicate> predicates = new ArrayList<>();
        CriteriaBuilder cb = emg.getCriteriaBuilder();
        CriteriaQuery<TPreenregistrementCompteClient> cq = cb.createQuery(TPreenregistrementCompteClient.class);
        Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
        cq.select(root);
        predicates.add(cb.and(cb.equal(
                root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID).get(TCompteClient_.lgCOMPTECLIENTID),
                cmpt)));
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrementCompteClient_.dtUPDATED)),
                java.sql.Date.valueOf(dtDebut), java.sql.Date.valueOf(dtFin));
        predicates.add(cb.and(btw));
        predicates
                .add(cb.and(cb.equal(root.get(TPreenregistrementCompteClient_.strSTATUT), Constant.STATUT_IS_CLOSED)));
        predicates.add(cb.and(cb.greaterThan(root.get(TPreenregistrementCompteClient_.intPRICERESTE), 0)));
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<TPreenregistrementCompteClient> q = emg.createQuery(cq);
        return q.getResultList();

    }

    private List<MvtTransaction> listeReglement(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId, String typeMvt, String clientId) {
        String sql = StringUtils.isEmpty(clientId)
                ? "SELECT o FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 AND o.tTypeMvtCaisse.lgTYPEMVTCAISSEID=?5   ORDER BY o.createdAt ASC "
                : "SELECT o FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.magasin.lgEMPLACEMENTID=?3 AND o.checked=?4 AND o.tTypeMvtCaisse.lgTYPEMVTCAISSEID=?5 AND o.organisme=?6  ORDER BY o.createdAt ASC";
        try {
            TypedQuery<MvtTransaction> query = getEmg().createQuery(sql, MvtTransaction.class);
            query.setParameter(1, dtStart);
            query.setParameter(2, dtEnd);
            query.setParameter(3, emplacementId);
            query.setParameter(4, checked);
            query.setParameter(5, typeMvt);
            if (StringUtils.isNotEmpty(clientId)) {
                query.setParameter(6, clientId);
            }
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject reglementsDifferes(LocalDate dtStart, LocalDate dtEnd, boolean checked, String clientId)
            throws JSONException {
        List<DelayedDTO> list = reglementsDifferesDto(dtStart, dtEnd, checked,
                sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), clientId);
        return new JSONObject().put("total", list.size()).put("data", new JSONArray(list));
    }

    private class Solde {

        private final String clientFullName;
        private final int montantRestant;

        public Solde(String clientFullName, int montantRestant) {

            this.clientFullName = clientFullName;
            this.montantRestant = montantRestant;
        }

        public String getClientFullName() {
            return clientFullName;
        }

        public int getMontantRestant() {
            return montantRestant;
        }

    }

    private Map<String, Solde> getSoldeByClient(Set<String> ids) {
        if (CollectionUtils.isEmpty(ids)) {
            return Map.of();
        }
        try {
            Query query = em.createNativeQuery(
                    "SELECT cl.lg_CLIENT_ID AS clientId,CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS clientFullName, COALESCE(SUM(o.int_PRICE_RESTE) ,0) AS solde  FROM t_client cl  JOIN t_compte_client cp ON cl.lg_CLIENT_ID=cp.lg_CLIENT_ID LEFT JOIN t_preenregistrement_compte_client o ON o.lg_COMPTE_CLIENT_ID=cp.lg_COMPTE_CLIENT_ID  JOIN t_preenregistrement p  ON p.lg_PREENREGISTREMENT_ID=o.lg_PREENREGISTREMENT_ID WHERE p.b_IS_CANCEL =FALSE AND  p.int_PRICE >0 AND cl.lg_CLIENT_ID IN(?1) GROUP BY cl.lg_CLIENT_ID,clientFullName",
                    Tuple.class).setParameter(1, ids);

            List<Tuple> results = query.getResultList();
            if (CollectionUtils.isEmpty(results)) {
                return Map.of();
            }
            Map<String, Solde> maps = new HashMap<>();
            for (Tuple result : results) {
                String clientId = result.get("clientId", String.class);
                String clientFullName = result.get("clientFullName", String.class);
                Number solde = result.get("solde", Number.class);
                maps.put(clientId, new Solde(clientFullName, solde.intValue()));
            }
            return maps;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Map.of();
        }
    }

    @Override
    public List<DelayedDTO> reglementsDifferesDto(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId, String clientId) {

        try {

            List<MvtTransaction> mvtTransactions = listeReglement(dtStart, dtEnd, checked, emplacementId,
                    Constant.MVT_REGLE_DIFF, clientId);
            Map<String, List<MvtTransaction>> map = mvtTransactions.stream()
                    .collect(Collectors.groupingBy(MvtTransaction::getOrganisme));
            List<DelayedDTO> delayedDTOs = new ArrayList<>();
            Set<String> ids = new HashSet<>();
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter dateTime = DateTimeFormatter.ofPattern("HH:mm");
            map.forEach((key, mvts) -> {
                ids.add(key);

                mvts.forEach(tp -> {
                    DelayedDTO delayed = new DelayedDTO();
                    delayed.setClientId(key);
                    delayed.setDateOperation(tp.getMvtDate());
                    LocalDateTime localDateTime = tp.getCreatedAt();
                    delayed.setDateOp(localDateTime.format(dateTimeFormatter));
                    delayed.setHeure(localDateTime.format(dateTime));
                    delayed.setMontantAttendu(tp.getAvoidAmount());
                    delayed.setMontantRegle(tp.getMontantRegle());
                    delayed.setLibelleRegl(tp.getReglement().getStrNAME());
                    delayed.setMontantRestant(tp.getMontantRestant());
                    TUser user = tp.getUser();
                    delayed.setUserFullName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
                    delayed.setDate(localDateTime);
                    delayed.setReference(tp.getPkey());
                    delayedDTOs.add(delayed);

                });

            });
            List<DelayedDTO> delayeds = new ArrayList<>();
            Map<String, Solde> soldes = getSoldeByClient(ids);
            for (DelayedDTO delayedDTO : delayedDTOs) {
                Solde solde = soldes.get(delayedDTO.getClientId());
                delayedDTO.setClientFullName(solde.getClientFullName());
                delayedDTO.setSolde(solde.getMontantRestant());
                delayedDTO.setSoldeFormated(NumberUtils.formatIntToString(solde.getMontantRestant()));
                delayeds.add(delayedDTO);
            }

            return delayeds;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<DelayedDTO> detailsReglmentDifferes(String refReglement) {
        try {
            TypedQuery<TDossierReglementDetail> q = getEmg().createQuery(
                    "SELECT o FROM TDossierReglementDetail o WHERE o.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID=?1",
                    TDossierReglementDetail.class);
            q.setParameter(1, refReglement);
            return q.getResultList().stream().map(x -> new DelayedDTO(x, findById(x.getStrREF())))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject detailsReglmentDiffere(String refReglement) throws JSONException {
        List<DelayedDTO> list = detailsReglmentDifferes(refReglement);
        return new JSONObject().put("total", list.size()).put("data", new JSONArray(list));
    }

    @Override
    public List<DossierReglementDTO> listeReglementFactures(String dtStart, String dtEnd, String tiersPayantId) {

        if (StringUtils.isNotEmpty(tiersPayantId)) {
            TTiersPayant payant = getEmg().find(TTiersPayant.class, tiersPayantId);
            TypedQuery<TDossierReglement> q = getEmg().createQuery(
                    "SELECT o FROM TDossierReglement o WHERE FUNCTION('DATE',o.dtREGLEMENT) BETWEEN ?1 AND ?2 AND o.strORGANISMEID=?3",
                    TDossierReglement.class);
            q.setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(3, tiersPayantId);
            return q.getResultList().stream().map(e -> new DossierReglementDTO(e, payant)).collect(Collectors.toList());
        }
        TypedQuery<TDossierReglement> q = getEmg().createQuery(
                "SELECT o FROM TDossierReglement o WHERE FUNCTION('DATE',o.dtREGLEMENT) BETWEEN ?1 AND ?2 AND o.lgFACTUREID IS NOT NULL",
                TDossierReglement.class);
        q.setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
        q.setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
        return q.getResultList().stream()
                .map(e -> new DossierReglementDTO(e, getEmg().find(TTiersPayant.class, e.getStrORGANISMEID())))
                .collect(Collectors.toList());
    }

}
