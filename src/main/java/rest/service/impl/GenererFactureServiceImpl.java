/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import bll.common.Parameter;
import commonTasks.dto.CodeFactureDTO;
import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.Mode;
import dal.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.TransactionManagement;
import javax.ejb.TransactionManagementType;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.Status;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import dal.enumeration.TypeLog;
import java.math.BigInteger;
import java.util.LinkedHashSet;
import java.util.concurrent.atomic.LongAdder;
import javax.enterprise.context.RequestScoped;
import org.apache.commons.lang3.StringUtils;
import rest.qualifier.Facturation;
import rest.service.GenererFactureService;
import toolkits.parameters.commonparameter;
import util.DateConverter;
import static util.DateConverter.KEY_CODE_FACTURE;

/**
 *
 * @author kkoffi
 */
@RequestScoped
@Facturation
@TransactionManagement(TransactionManagementType.BEAN)
public class GenererFactureServiceImpl implements GenererFactureService {

    private static final Logger LOG = Logger.getLogger(GenererFactureServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Inject
    private UserTransaction userTransaction;

    private List<CodeFactureDTO> genererFactureTemporaire(String groupId,
            Map<TTiersPayant, List<TPreenregistrementCompteClientTiersPayent>> data, Date dtdebut, Date dtfin,
            TTypeFacture OTTypeFacture, TTypeMvtCaisse OTTypeMvtCaisse) {
        List<CodeFactureDTO> l = new ArrayList<>();
        try {
            userTransaction.begin();
            data.forEach((k, v) -> {
                CodeFactureDTO o = genererFactureTemporaire(groupId, k, v, dtdebut, dtfin, OTTypeFacture,
                        OTTypeMvtCaisse);
                getEntityManager().flush();
                getEntityManager().clear();
                l.add(o);
            });

            userTransaction.commit();
            return l;
        } catch (NotSupportedException | SystemException e) {
            LOG.log(Level.SEVERE, null, e);

            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {

                LOG.log(Level.SEVERE, null, ex);
            }

        } catch (RollbackException | HeuristicMixedException | HeuristicRollbackException | SecurityException
                | IllegalStateException ex) {

            LOG.log(Level.SEVERE, null, ex);
        }

        return l;
    }

    private List<TPreenregistrementDetail> findItems(String OTPreenregistrement) {

        try {

            TypedQuery<TPreenregistrementDetail> q = getEntityManager().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE  t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1",
                    TPreenregistrementDetail.class);

            q.setParameter(1, OTPreenregistrement);

            return q.getResultList();
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
            return Collections.emptyList();
        }
    }

    public Integer getRemise(String OTPreenregistrement, final double tauxRemise, int taux) {

        if (taux < 100) {
            return 0;
        }
        LongAdder longAdder = new LongAdder();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = findItems(OTPreenregistrement);
        lstTPreenregistrementDetail.forEach(x -> {
            TFamille famille = x.getLgFAMILLEID();
            Integer remise = 0;
            if (!famille.getStrCODEREMISE().equals("2") && !famille.getStrCODEREMISE().equals("3")) {
                remise = (int) ((x.getIntPRICE() * tauxRemise) / 100);
                longAdder.add(remise);
            }

        });
        return longAdder.intValue();

    }

    private CodeFactureDTO genererFactureTemporaire(String groupId, TTiersPayant tiersPayant,
            List<TPreenregistrementCompteClientTiersPayent> data, Date dtdebut, Date dtfin, TTypeFacture typeFacture,
            TTypeMvtCaisse typeMvtCaisse) {
        double montantForfetaire = tiersPayant.getDblREMISEFORFETAIRE();
        double tauxRemise = 0;
        double totalRemise = 0;
        double totalBrut = 0;
        double montantNetDetails;
        double montantRemiseDetails;
        boolean hasDiscount = false;
        int remiseVente = 0;
        int montantTvavente = 0;
        int montantVente = 0;
        try {
            Collection<TFactureDetail> tFactureDetailCollection = new ArrayList<>(data.size());
            if (tiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                hasDiscount = true;
                tauxRemise = (tiersPayant.getDblPOURCENTAGEREMISE() / 100);
            }
            TFacture tf = createInvoiceItem(data.size(), dtdebut, dtfin, 0, groupId, typeFacture,
                    typeMvtCaisse.getStrCODECOMPTABLE(), tiersPayant, true, 0, "");
            for (TPreenregistrementCompteClientTiersPayent tp : data) {
                TPreenregistrement p = tp.getLgPREENREGISTREMENTID();
                remiseVente += p.getIntPRICEREMISE();
                montantTvavente += p.getMontantTva();
                montantVente += p.getIntPRICE();
                totalBrut += tp.getIntPRICE();
                if (hasDiscount && p.getIntPRICEREMISE() == 0) {
                    montantRemiseDetails = (tp.getIntPRICE() * tauxRemise);
                    totalRemise += Math.round(montantRemiseDetails);
                    montantNetDetails = Math.round((tp.getIntPRICE() - montantRemiseDetails));
                } else {
                    montantRemiseDetails = 0;
                    montantNetDetails = tp.getIntPRICE();
                }

                TFactureDetail detail = invoiceDetail(tf, tp, montantNetDetails, montantRemiseDetails);
                tFactureDetailCollection.add(detail);
                getEntityManager().persist(detail);
            }
            tf.setTFactureDetailCollection(tFactureDetailCollection);
            tf.setDblMONTANTBrut(BigDecimal.valueOf(totalBrut));
            tf.setDblMONTANTCMDE((totalBrut - montantForfetaire) - totalRemise);
            tf.setDblMONTANTRESTANT((totalBrut - montantForfetaire) - totalRemise);
            tf.setDblMONTANTFOFETAIRE(BigDecimal.valueOf(montantForfetaire));
            tf.setDblMONTANTREMISE(BigDecimal.valueOf(totalRemise));
            tf.setMontantRemiseVente(remiseVente);
            tf.setMontantTvaVente(montantTvavente);
            tf.setMontantVente(montantVente);
            getEntityManager().persist(tf);
            return new CodeFactureDTO(tf.getLgFACTUREID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private List<TPreenregistrementCompteClientTiersPayent> getSelectedBons(List<String> datas) {
        List<TPreenregistrementCompteClientTiersPayent> list = new ArrayList<>();
        try {
            datas.forEach(s -> {
                TPreenregistrementCompteClientTiersPayent payent = getEntityManager()
                        .find(TPreenregistrementCompteClientTiersPayent.class, s);
                if (payent != null) {
                    list.add(payent);
                }
            });
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return list;
    }

    private List<TPreenregistrementCompteClientTiersPayent> findBonsByTierpayantId(String idtp, LocalDate dtStart,
            LocalDate dtEnd) {
        List<TPreenregistrementCompteClientTiersPayent> list = new ArrayList<>();
        try {
            TypedQuery<TPreenregistrementCompteClientTiersPayent> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID=?1  AND o.strSTATUTFACTURE=?2 AND FUNCTION('DATE', o.dtUPDATED) BETWEEN ?3 AND ?4 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND  o.lgPREENREGISTREMENTID.bISCANCEL =FALSE AND o.lgPREENREGISTREMENTID.strSTATUT= ?5 AND o.strSTATUT=?6 ",
                    TPreenregistrementCompteClientTiersPayent.class);
            q.setParameter(1, idtp);
            q.setParameter(2, DateConverter.STATUT_FACTURE_UNPAID);
            q.setParameter(3, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(4, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            q.setParameter(5, DateConverter.STATUT_IS_CLOSED);
            q.setParameter(6, DateConverter.STATUT_IS_CLOSED);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return list;
    }

    private List<TPreenregistrementCompteClientTiersPayent> getSelectedTp(List<String> datas, LocalDate dtStart,
            LocalDate dtEnd) {
        List<TPreenregistrementCompteClientTiersPayent> list = new ArrayList<>();
        try {
            datas.forEach(s -> {
                List<TPreenregistrementCompteClientTiersPayent> payent = findBonsByTierpayantId(s, dtStart, dtEnd);
                if (!payent.isEmpty()) {
                    list.addAll(payent);
                }
            });
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return list;
    }

    @Override
    public List<CodeFactureDTO> genererFactureTemporaire(GenererFactureDTO datas) {
        List<TPreenregistrementCompteClientTiersPayent> list;
        switch (datas.getMode()) {
        case SELECT:
            list = getSelectedTp(datas.getDatas(), datas.getDtStart(), datas.getDtEnd());
            break;
        case BONS:
            list = getSelectedBons(datas.getDatas());
            break;
        default:
            list = provisoirespartp(datas.getMode(), datas.getGroupTp(), datas.getTypetp(), datas.getTpid(),
                    datas.getCodegroup(), datas.getDtStart().toString(), datas.getDtEnd().toString());
            break;

        }

        TTypeFacture oTTypeFacture = getEntityManager().find(TTypeFacture.class,
                commonparameter.KEY_TYPE_FACTURE_TIERSPAYANT);
        TTypeMvtCaisse oTTypeMvtCaisse = getEntityManager().find(TTypeMvtCaisse.class,
                commonparameter.KEY_TYPE_FACTURE_TIERSPAYANT);
        return genererFactureTemporaire(datas.getGroupTp(),
                list.stream()
                        .collect(Collectors.groupingBy(o -> o.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID())),
                DateConverter.convertLocalDateToDate(datas.getDtStart()),
                DateConverter.convertLocalDateToDate(datas.getDtEnd()), oTTypeFacture, oTTypeMvtCaisse);

    }

    private List<TPreenregistrementCompteClientTiersPayent> provisoirespartp(Mode mode, String groupTp, String typetp,
            String tpid, String codegroup, String dtStart, String dtEnd) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementCompteClientTiersPayent> cq = cb
                    .createQuery(TPreenregistrementCompteClientTiersPayent.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TPreenregistrement> st = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID, JoinType.INNER);
            cq.select(root).orderBy(cb.asc(root.get(TPreenregistrementCompteClientTiersPayent_.dtUPDATED)));
            List<Predicate> predicates = provisoirespartpPredicates(cb, root, st, mode, groupTp, typetp, tpid,
                    codegroup, dtStart, dtEnd);
            cq.where(cb.and(predicates.toArray(new Predicate[0])));
            TypedQuery<TPreenregistrementCompteClientTiersPayent> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<Predicate> provisoirespartpPredicates(CriteriaBuilder cb,
            Root<TPreenregistrementCompteClientTiersPayent> root,
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
            if (typetp != null && !typetp.isEmpty()) {
                predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                        .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTYPETIERSPAYANTID)
                        .get(TTypeTiersPayant_.lgTYPETIERSPAYANTID), typetp));
            }
            break;
        case TP:
            if (tpid != null && !tpid.isEmpty()) {
                predicates.add(cb.equal(
                        root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                                .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID),
                        tpid));
            }
            break;
        case GROUP:
            if (typetp != null && !typetp.isEmpty()) {
                predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                        .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgGROUPEID)
                        .get(TGroupeTierspayant_.lgGROUPEID), Integer.valueOf(groupTp)));
            }
            break;
        case CODE_GROUP:
            if (codegroup != null && !codegroup.isEmpty()) {
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

    public TFacture createInvoiceItem(int datasSize, Date dt_debut, Date dt_fin, double d_montant,
            String groupeFactureId, TTypeFacture OTTypeFacture, String str_CODE_COMPTABLE, TTiersPayant payant,
            boolean template, int factureGroupe, String codeFacture) {
        TFacture facture = new TFacture();
        facture.setLgFACTUREID(UUID.randomUUID().toString());
        facture.setDtDEBUTFACTURE(dt_debut);
        facture.setStrPERE(groupeFactureId);
        facture.setLgTYPEFACTUREID(OTTypeFacture);
        facture.setDtFINFACTURE(dt_fin);
        facture.setStrCUSTOMER(payant.getLgTIERSPAYANTID());
        facture.setDtDATEFACTURE(new Date());
        facture.setStrCODEFACTURE(codeFacture);
        facture.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
        facture.setDblMONTANTPAYE(0.0);
        facture.setDblMONTANTBrut(new BigDecimal(0));
        facture.setDblMONTANTFOFETAIRE(facture.getDblMONTANTBrut());
        facture.setDblMONTANTREMISE(facture.getDblMONTANTBrut());
        facture.setIntNBDOSSIER(datasSize);
        facture.setDtCREATED(facture.getDtDATEFACTURE());
        facture.setDtUPDATED(facture.getDtDATEFACTURE());
        facture.setTiersPayant(payant);
        facture.setStrSTATUT(DateConverter.STATUT_ENABLE);
        facture.setTemplate(template);
        facture.setTypeFacture(factureGroupe);
        facture.setTypeFactureId(groupeFactureId);
        return facture;

    }

    private TFactureDetail invoiceDetail(TFacture oTFacture, TPreenregistrementCompteClientTiersPayent payent,
            Double montant, double montantRemise) {
        TFactureDetail oTFactureDetail = new TFactureDetail();
        TPreenregistrement preenregistrement = payent.getLgPREENREGISTREMENTID();
        oTFactureDetail.setLgFACTUREDETAILID(UUID.randomUUID().toString());
        oTFactureDetail.setLgFACTUREID(oTFacture);
        oTFactureDetail.setStrREF(payent.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
        oTFactureDetail.setStrREFDESCRIPTION(preenregistrement.getStrREFBON());
        oTFactureDetail.setDateOperation(preenregistrement.getDtUPDATED());
        String strCATEGORY = "";
        try {
            TCategoryClient categoryClient = preenregistrement.getClient().getLgCATEGORYCLIENTID();
            if (categoryClient != null) {
                strCATEGORY = categoryClient.getStrLIBELLE();
            }

        } catch (Exception e) {
        }
        oTFactureDetail.setStrCATEGORYCLIENT(strCATEGORY);
        oTFactureDetail.setDblMONTANT(montant);
        oTFactureDetail.setDblMONTANTBrut(new BigDecimal(payent.getIntPRICE()));
        oTFactureDetail.setDblMONTANTPAYE(0.0);
        oTFactureDetail.setPKey(preenregistrement.getLgPREENREGISTREMENTID());
        oTFactureDetail.setDblMONTANTREMISE(BigDecimal.valueOf(montantRemise));
        oTFactureDetail.setDblMONTANTRESTANT(montant);
        oTFactureDetail.setStrSTATUT(DateConverter.STATUT_ENABLE);
        oTFactureDetail.setDtCREATED(new Date());
        oTFactureDetail.setDtUPDATED(oTFactureDetail.getDtCREATED());
        oTFactureDetail.setAyantDroit(preenregistrement.getAyantDroit());
        oTFactureDetail.setClient(preenregistrement.getClient());
        oTFactureDetail.setStrFIRSTNAMECUSTOMER(preenregistrement.getStrFIRSTNAMECUSTOMER());
        oTFactureDetail.setStrLASTNAMECUSTOMER(preenregistrement.getStrLASTNAMECUSTOMER());
        oTFactureDetail.setStrNUMEROSECURITESOCIAL(preenregistrement.getStrNUMEROSECURITESOCIAL());
        oTFactureDetail.setMontantRemiseVente(preenregistrement.getIntPRICEREMISE());
        oTFactureDetail.setMontantTvaVente(preenregistrement.getMontantTva());
        oTFactureDetail.setMontantVente(preenregistrement.getIntPRICE());
        oTFactureDetail.setTaux(payent.getIntPERCENT());
        return oTFactureDetail;
    }

    private void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T, String codefacture) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(new Date());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(DateConverter.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(T.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(desc + " référence [" + codefacture + " ]");
        eventLog.setStrTYPELOG(ref);
        getEntityManager().persist(eventLog);
    }

    private void updateInvoicePlafond(TTiersPayant OTTiersPayant) {
        boolean isAbsolute = OTTiersPayant.getBCANBEUSE();
        if (!isAbsolute) {
            OTTiersPayant.setDbCONSOMMATIONMENSUELLE(0);
            OTTiersPayant.setBCANBEUSE(true);
            getEntityManager().merge(OTTiersPayant);
        }
        List<TCompteClientTiersPayant> list = (List<TCompteClientTiersPayant>) OTTiersPayant
                .getTCompteClientTiersPayantCollection();
        list.stream().filter(o -> o.getBIsAbsolute() != null && !o.getBIsAbsolute()).forEach(b -> {
            b.setBCANBEUSE(true);
            b.setDbCONSOMMATIONMENSUELLE(0);
            getEntityManager().merge(b);
        });

    }

    @Override
    public LinkedHashSet<CodeFactureDTO> genererFactureTierspayant(GenererFactureDTO datas) {
        List<TPreenregistrementCompteClientTiersPayent> list;
        switch (datas.getMode()) {
        case SELECT:
            list = getSelectedTp(datas.getDatas(), datas.getDtStart(), datas.getDtEnd());
            break;
        case BONS:
            list = getSelectedBons(datas.getDatas());
            break;
        default:
            list = provisoirespartp(datas.getMode(), datas.getGroupTp(), datas.getTypetp(), datas.getTpid(),
                    datas.getCodegroup(), datas.getDtStart().toString(), datas.getDtEnd().toString());
            break;

        }

        TTypeFacture OTTypeFacture = getEntityManager().find(TTypeFacture.class,
                commonparameter.KEY_TYPE_FACTURE_TIERSPAYANT);
        TTypeMvtCaisse OTTypeMvtCaisse = getEntityManager().find(TTypeMvtCaisse.class,
                commonparameter.KEY_TYPE_FACTURE_TIERSPAYANT);
        return genererFactureTiersPayants(datas.getOperateur(), datas.getGroupTp(),
                list.stream()
                        .collect(Collectors.groupingBy(o -> o.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID())),
                DateConverter.convertLocalDateToDate(datas.getDtStart()),
                DateConverter.convertLocalDateToDate(datas.getDtEnd()), OTTypeFacture, OTTypeMvtCaisse);

    }

    TParameters retrieveLastCodeFacture() {
        return getEntityManager().find(TParameters.class, KEY_CODE_FACTURE);
    }

    TGroupeTierspayant findGroupeTiersPayantById(String idGroupe) {
        try {
            Integer idGroupeToInt = Integer.valueOf(idGroupe);
            return getEntityManager().find(TGroupeTierspayant.class, idGroupeToInt);
        } catch (Exception e) {
            return null;
        }

    }

    TFacture genererFactureTiersPayants(String groupeFactureId, TTiersPayant tiersPayant,
            List<TPreenregistrementCompteClientTiersPayent> data, Date dtdebut, Date dtfin, TTypeFacture typeFacture,
            TTypeMvtCaisse typeMvtCaisse, String codeFacture) {
        double montantForfetaire = tiersPayant.getDblREMISEFORFETAIRE();
        double tauxRemise = 0;
        double totalRemise = 0;
        double totalBrut = 0;
        double montantNetDetails;
        double montantRemiseDetails;
        boolean hasDiscount = false;
        int remiseVente = 0;
        int montantTvavente = 0;
        int montantVente = 0;
        try {
            Collection<TFactureDetail> tFactureDetailCollection = new ArrayList<>(data.size());
            if (tiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                hasDiscount = true;
                tauxRemise = (tiersPayant.getDblPOURCENTAGEREMISE() / 100);
            }
            TFacture tf = createInvoiceItem(data.size(), dtdebut, dtfin, 0, groupeFactureId, typeFacture,
                    typeMvtCaisse.getStrCODECOMPTABLE(), tiersPayant, false, 0, codeFacture);
            for (TPreenregistrementCompteClientTiersPayent tp : data) {
                TPreenregistrement p = tp.getLgPREENREGISTREMENTID();
                remiseVente += p.getIntPRICEREMISE();
                montantTvavente += p.getMontantTva();
                montantVente += p.getIntPRICE();
                totalBrut += tp.getIntPRICE();
                if (hasDiscount && p.getIntPRICEREMISE() == 0) {
                    montantRemiseDetails = (tp.getIntPRICE() * tauxRemise);
                    totalRemise += Math.round(montantRemiseDetails);
                    montantNetDetails = Math.round((tp.getIntPRICE() - montantRemiseDetails));
                } else {
                    montantRemiseDetails = 0;
                    montantNetDetails = tp.getIntPRICE();
                }

                TFactureDetail detail = invoiceDetail(tf, tp, montantNetDetails, montantRemiseDetails);
                tFactureDetailCollection.add(detail);
                getEntityManager().persist(detail);
            }
            tf.setTFactureDetailCollection(tFactureDetailCollection);
            tf.setDblMONTANTBrut(BigDecimal.valueOf(totalBrut));
            tf.setDblMONTANTCMDE((totalBrut - montantForfetaire) - totalRemise);
            tf.setDblMONTANTRESTANT((totalBrut - montantForfetaire) - totalRemise);
            tf.setDblMONTANTFOFETAIRE(BigDecimal.valueOf(montantForfetaire));
            tf.setDblMONTANTREMISE(BigDecimal.valueOf(totalRemise));
            tf.setMontantRemiseVente(remiseVente);
            tf.setMontantTvaVente(montantTvavente);
            tf.setMontantVente(montantVente);
            getEntityManager().persist(tf);
            return tf;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    TFacture createGroupInvoice(Date dt_debut, Date dt_fin, String groupeFactureId, TTypeFacture OTTypeFacture,
            String str_CODE_COMPTABLE, TGroupeTierspayant groupeTierspayant, boolean template, String codeFacture) {
        TFacture OTFacture = new TFacture();
        OTFacture.setLgFACTUREID(groupeFactureId);
        OTFacture.setDtDEBUTFACTURE(dt_debut);
        OTFacture.setLgTYPEFACTUREID(OTTypeFacture);
        OTFacture.setDtFINFACTURE(dt_fin);
        OTFacture.setStrCUSTOMER(groupeTierspayant.getLgGROUPEID().toString());
        OTFacture.setStrCODEFACTURE(codeFacture);
        OTFacture.setStrCODECOMPTABLE(str_CODE_COMPTABLE);
        OTFacture.setDblMONTANTPAYE(0.0);
        OTFacture.setDtCREATED(new Date());
        OTFacture.setDtUPDATED(OTFacture.getDtCREATED());
        OTFacture.setDtDATEFACTURE(OTFacture.getDtCREATED());
        OTFacture.setStrSTATUT(DateConverter.STATUT_ENABLE);
        OTFacture.setTemplate(template);
        OTFacture.setTypeFacture(1);
        OTFacture.setGroupeTierspayant(groupeTierspayant);
        OTFacture.setTypeFactureId(null);
        return OTFacture;

    }

    TFacture updateGroupInvoice(TFacture groupeFacture, BigDecimal totalBrut, Double dblMONTANTCMDE,
            Double dblMONTANTRESTANT, BigDecimal dblMONTANTFOFETAIRE, BigDecimal dblMONTANTREMISE,
            Integer montantRemiseVente, Integer montantTvaVente, Integer montantVente, int nbreFacture) {
        groupeFacture.setDblMONTANTBrut(totalBrut);
        groupeFacture.setDblMONTANTCMDE(dblMONTANTCMDE);
        groupeFacture.setDblMONTANTRESTANT(dblMONTANTRESTANT);
        groupeFacture.setDblMONTANTFOFETAIRE(dblMONTANTFOFETAIRE);
        groupeFacture.setDblMONTANTREMISE(dblMONTANTREMISE);
        groupeFacture.setMontantRemiseVente(montantRemiseVente);
        groupeFacture.setMontantTvaVente(montantTvaVente);
        groupeFacture.setMontantVente(montantVente);
        groupeFacture.setIntNBDOSSIER(nbreFacture);
        return groupeFacture;

    }

    private LinkedHashSet<CodeFactureDTO> genererFactureTiersPayants(TUser user, String groupId,
            Map<TTiersPayant, List<TPreenregistrementCompteClientTiersPayent>> data, Date dtdebut, Date dtfin,
            TTypeFacture OTTypeFacture, TTypeMvtCaisse OTTypeMvtCaisse) {
        String groupeFactureId = null;
        TParameters paramsCodeFacture = retrieveLastCodeFacture();
        String lastCodeFacture = paramsCodeFacture.getStrVALUE();
        int codeFacture = Integer.parseInt(lastCodeFacture);
        int codeFactureLst = codeFacture;
        TFacture groupeFacture = null;
        if (!StringUtils.isEmpty(groupId)) {
            TGroupeTierspayant groupeTierspayant = findGroupeTiersPayantById(groupId);
            if (groupeTierspayant != null) {
                groupeFactureId = UUID.randomUUID().toString();
                groupeFacture = createGroupInvoice(dtdebut, dtfin, groupeFactureId, OTTypeFacture,
                        OTTypeMvtCaisse.getStrCODECOMPTABLE(), groupeTierspayant, false, lastCodeFacture);
                codeFactureLst++;
            }

        }

        LinkedHashSet<CodeFactureDTO> l = new LinkedHashSet<>();
        try {
            Double dblMONTANTRESTANT = 0.0;
            BigDecimal dblMONTANTFOFETAIRE = new BigDecimal(BigInteger.ZERO);
            BigDecimal dblMONTANTREMISE = new BigDecimal(BigInteger.ZERO);
            Integer montantRemiseVente = 0;
            Integer montantTvaVente = 0;
            Integer montantVente = 0;
            BigDecimal totalBrut = new BigDecimal(BigInteger.ZERO);
            Double dblMONTANTCMDE = 0.0;
            int count = 0;
            userTransaction.begin();
            for (Map.Entry<TTiersPayant, List<TPreenregistrementCompteClientTiersPayent>> entry : data.entrySet()) {
                lastCodeFacture = String.valueOf(codeFactureLst);
                TTiersPayant k = entry.getKey();
                List<TPreenregistrementCompteClientTiersPayent> v = entry.getValue();
                TFacture facture = genererFactureTiersPayants(groupeFactureId, k, v, dtdebut, dtfin, OTTypeFacture,
                        OTTypeMvtCaisse, lastCodeFacture);
                if (facture != null) {
                    l.add(new CodeFactureDTO(facture.getStrCODEFACTURE(), facture.getLgFACTUREID()));
                    if (groupeFacture != null) {
                        dblMONTANTRESTANT += facture.getDblMONTANTRESTANT();
                        dblMONTANTCMDE += facture.getDblMONTANTCMDE();
                        dblMONTANTFOFETAIRE.add(facture.getDblMONTANTFOFETAIRE());
                        dblMONTANTREMISE.add(facture.getDblMONTANTREMISE());
                        totalBrut.add(facture.getDblMONTANTBrut());
                        montantRemiseVente += facture.getMontantRemiseVente();
                        montantTvaVente += facture.getMontantTvaVente();
                        montantVente += facture.getMontantVente();
                        count++;
                    }
                    codeFactureLst++;
                    updateInvoicePlafond(k);
                    String description = "Génération de la facture numéro : " + facture.getStrCODEFACTURE();
                    updateItem(user, facture.getLgFACTUREID(), description, TypeLog.GENERATION_DE_FACTURE, facture,
                            facture.getStrCODEFACTURE());
                }
                getEntityManager().flush();
                getEntityManager().clear();
            }
            if (groupeFacture != null) {
                groupeFacture = updateGroupInvoice(groupeFacture, totalBrut, dblMONTANTCMDE, dblMONTANTRESTANT,
                        dblMONTANTFOFETAIRE, dblMONTANTREMISE, montantRemiseVente, montantTvaVente, montantVente,
                        count);
                getEntityManager().persist(groupeFacture);
            }
            paramsCodeFacture.setStrVALUE(String.valueOf(codeFactureLst));
            getEntityManager().merge(paramsCodeFacture);
            userTransaction.commit();
            return l;
        } catch (NotSupportedException | SystemException e) {

            LOG.log(Level.SEVERE, null, e);
            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {

                LOG.log(Level.SEVERE, null, ex);
            }

        } catch (RollbackException | HeuristicMixedException | HeuristicRollbackException | SecurityException
                | IllegalStateException ex) {

            LOG.log(Level.SEVERE, null, ex);
        }

        return l;
    }

    private boolean getParametreFacturation() {
        try {
            TParameters o = getEntityManager().find(TParameters.class, Parameter.KEY_CODE_NUMERARTION_FACTURE);
            return Integer.valueOf(o.getStrVALUE()).compareTo(1) == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private CodeFactureDTO genererFacture(String groupId, TTiersPayant OTTiersPayant,
            List<TPreenregistrementCompteClientTiersPayent> data, Date dtdebut, Date dtfin, TTypeFacture OTTypeFacture,
            TTypeMvtCaisse OTTypeMvtCaisse, String codeFacture) {
        double montantForfetaire = OTTiersPayant.getDblREMISEFORFETAIRE();
        double tauxRemise = 0;
        double totalRemise = 0;
        double totalBrut = 0;
        double montantNetDetails, montantRemiseDetails;
        boolean hasDiscount = false;
        Integer remiseVente = 0, montantTvavente = 0, montantVente = 0;
        try {
            Collection<TFactureDetail> tFactureDetailCollection = new ArrayList<>(data.size());
            if (OTTiersPayant.getDblPOURCENTAGEREMISE() > 0) {
                hasDiscount = true;
                tauxRemise = (OTTiersPayant.getDblPOURCENTAGEREMISE() / 100);
            }
            TFacture tf = createInvoiceItem(data.size(), dtdebut, dtfin, 0, groupId, OTTypeFacture,
                    OTTypeMvtCaisse.getStrCODECOMPTABLE(), OTTiersPayant, false, 0, codeFacture);
            for (TPreenregistrementCompteClientTiersPayent tp : data) {
                TPreenregistrement p = tp.getLgPREENREGISTREMENTID();
                remiseVente += p.getIntPRICEREMISE();
                montantTvavente += p.getMontantTva();
                montantVente += p.getIntPRICE();
                totalBrut += tp.getIntPRICE();
                if (hasDiscount && p.getIntPRICEREMISE() == 0) {
                    montantRemiseDetails = (tp.getIntPRICE() * tauxRemise);
                    totalRemise += Math.round(montantRemiseDetails);
                    montantNetDetails = Math.round((tp.getIntPRICE() - montantRemiseDetails));
                } else {
                    montantRemiseDetails = 0;
                    montantNetDetails = tp.getIntPRICE();
                }

                TFactureDetail detail = invoiceDetail(tf, tp, montantNetDetails, montantRemiseDetails);
                tFactureDetailCollection.add(detail);
                getEntityManager().persist(detail);
                tp.setStrSTATUTFACTURE(DateConverter.CHARGED);
                getEntityManager().merge(tp);
            }
            tf.setTFactureDetailCollection(tFactureDetailCollection);
            tf.setDblMONTANTBrut(BigDecimal.valueOf(totalBrut));
            tf.setDblMONTANTCMDE((totalBrut - montantForfetaire) - totalRemise);
            tf.setDblMONTANTRESTANT((totalBrut - montantForfetaire) - totalRemise);
            tf.setDblMONTANTFOFETAIRE(BigDecimal.valueOf(montantForfetaire));
            tf.setDblMONTANTREMISE(BigDecimal.valueOf(totalRemise));
            tf.setMontantRemiseVente(remiseVente);
            tf.setMontantTvaVente(montantTvavente);
            tf.setMontantVente(montantVente);
            getEntityManager().persist(tf);

            String description = "Génération de la facture numéro : " + tf.getStrCODEFACTURE() + " période du "
                    + DateConverter.convertDateToDD_MM_YYYY(tf.getDtDEBUTFACTURE()) + " Au "
                    + DateConverter.convertDateToDD_MM_YYYY(tf.getDtFINFACTURE()) + " tiers-payant: "
                    + OTTiersPayant.getStrFULLNAME() + " ";
            // updateItem(this.getOTUser(), "", description, TypeLog.GENERATION_DE_FACTURE, OFacture,
            // this.getOdataManager().getEm());
            // updateInvoicePlafond(OFacture, OTTiersPayant);
            return new CodeFactureDTO(tf.getLgFACTUREID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }
}
