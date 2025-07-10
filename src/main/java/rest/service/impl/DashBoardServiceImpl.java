/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.AchatDTO;
import commonTasks.dto.BalanceDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RecapActiviteCreditDTO;
import commonTasks.dto.RecapActiviteDTO;
import commonTasks.dto.RecapActiviteReglementDTO;
import commonTasks.dto.TvaDTO;
import dal.MvtTransaction;
import dal.MvtTransaction_;
import dal.TDossierReglement;
import dal.TDossierReglement_;
import dal.TEmplacement_;
import dal.TFacture_;
import dal.TTiersPayant;
import dal.TUser;
import dal.TUser_;
import dal.enumeration.TypeTransaction;
import static dal.enumeration.TypeTransaction.ACHAT;
import static dal.enumeration.TypeTransaction.ENTREE;
import static dal.enumeration.TypeTransaction.SORTIE;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaBuilder.In;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.BalanceService;
import rest.service.DashBoardService;
import rest.service.dto.BalanceParamsDTO;

import util.Constant;

/**
 *
 * @author DICI
 */
@Stateless
public class DashBoardServiceImpl implements DashBoardService {

    private static final Logger LOG = Logger.getLogger(DashBoardServiceImpl.class.getName());
    private static final String EXCLUDE_STATEMENT = " AND  p.`lg_PREENREGISTREMENT_ID` NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) ";
    private static final String RAPPORT_SQL_QUERY = "SELECT SUM(sqlQ.cpAmount) AS amount ,SUM(m.`montantCredit`) AS montantCredit,COUNT(DISTINCT sqlQ.nbreClient) as nbreClient,sqlQ.typeTiersPayant,sqlQ.lg_PREENREGISTREMENT_ID, "
            + "  sqlQ.tiersPayantId as tiersPayantId ,sqlQ.libelleTiersPayant AS libelleTiersPayant, COUNT(DISTINCT p.`lg_PREENREGISTREMENT_ID`) AS nbreBon FROM t_preenregistrement p,mvttransaction m,"
            + "(SELECT tp.lg_TIERS_PAYANT_ID AS tiersPayantId, tp.str_NAME AS libelleTiersPayant,typeTp.str_LIBELLE_TYPE_TIERS_PAYANT AS typeTiersPayant, "
            + " SUM(cp.int_PRICE) AS cpAmount , cpt.lg_CLIENT_ID AS nbreClient ,cp.lg_PREENREGISTREMENT_ID AS lg_PREENREGISTREMENT_ID FROM  t_preenregistrement_compte_client_tiers_payent cp,t_compte_client_tiers_payant cl, t_tiers_payant tp, t_compte_client cpt,t_type_tiers_payant typeTp WHERE "
            + "cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` GROUP BY lg_PREENREGISTREMENT_ID )"
            + " AS sqlQ WHERE DATE(p.`dt_UPDATED`) BETWEEN  ?3 AND ?4 AND sqlQ.lg_PREENREGISTREMENT_ID=p.`lg_PREENREGISTREMENT_ID` AND  m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?1 AND m.`lg_EMPLACEMENT_ID` =?2 AND p.imported=0 AND m.`typeTransaction`=1 %s {excludeStatement} GROUP BY  tiersPayantId ORDER BY libelleTiersPayant ";
    private static final String RAPPORT_SQL_LIKE = " AND (sqlQ.libelleTiersPayant LIKE '%s' OR sqlQ.typeTiersPayant LIKE '%s') ";

    private static final String RAPPORT_COUNT_SQL_QUERY = "SELECT count_tmp.tiersPayantId FROM (SELECT COUNT(DISTINCT sqlQ.tiersPayantId) as tiersPayantId,sqlQ.libelleTiersPayant AS libelleTiersPayant,sqlQ.typeTiersPayant,sqlQ.lg_PREENREGISTREMENT_ID"
            + " FROM t_preenregistrement p,mvttransaction m,"
            + "(SELECT tp.lg_TIERS_PAYANT_ID AS tiersPayantId ,tp.str_NAME AS libelleTiersPayant,typeTp.str_LIBELLE_TYPE_TIERS_PAYANT AS typeTiersPayant, cp.`lg_PREENREGISTREMENT_ID` AS  lg_PREENREGISTREMENT_ID FROM  t_preenregistrement_compte_client_tiers_payent cp, \n"
            + "t_compte_client_tiers_payant cl, t_tiers_payant tp, t_compte_client cpt,t_type_tiers_payant typeTp WHERE \n"
            + "cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND \n"
            + "cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` GROUP BY lg_PREENREGISTREMENT_ID ) "
            + " AS sqlQ WHERE DATE(p.`dt_UPDATED`) BETWEEN  ?3 AND ?4 AND sqlQ.lg_PREENREGISTREMENT_ID=p.`lg_PREENREGISTREMENT_ID`  AND m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND p.`lg_TYPE_VENTE_ID` <> ?1 AND m.`lg_EMPLACEMENT_ID` =?2 AND p.imported=0 AND m.`typeTransaction`=1 %s {excludeStatement} ) AS count_tmp ";

    private static final String RAPPORT_TOTAUX_SQL_QUERY = " SELECT SUM(sqlQ.cpAmount) AS amount ,SUM(m.`montantCredit`) AS montantCredit,COUNT(DISTINCT sqlQ.nbreClient) as nbreClient,\n"
            + "COUNT(DISTINCT p.`lg_PREENREGISTREMENT_ID`) AS nbreBon,sqlQ.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p,mvttransaction m,\n"
            + "(\n"
            + "SELECT tp.lg_TIERS_PAYANT_ID AS tiersPayantId, tp.str_NAME AS libelleTiersPayant,typeTp.str_LIBELLE_TYPE_TIERS_PAYANT AS typeTiersPayant,\n"
            + "SUM(cp.int_PRICE) AS cpAmount , cpt.lg_CLIENT_ID AS nbreClient ,cp.`lg_PREENREGISTREMENT_ID` AS lg_PREENREGISTREMENT_ID FROM  t_preenregistrement_compte_client_tiers_payent cp, \n"
            + "t_compte_client_tiers_payant cl, t_tiers_payant tp, t_compte_client cpt,t_type_tiers_payant typeTp WHERE \n"
            + "cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AND cl.lg_TIERS_PAYANT_ID=tp.lg_TIERS_PAYANT_ID AND \n"
            + "cl.lg_COMPTE_CLIENT_ID=cpt.lg_COMPTE_CLIENT_ID AND tp.lg_TYPE_TIERS_PAYANT_ID=typeTp.`lg_TYPE_TIERS_PAYANT_ID` GROUP BY cp.`lg_PREENREGISTREMENT_ID` )  "
            + " AS sqlQ WHERE DATE(p.`dt_UPDATED`) BETWEEN  ?3 AND ?4 AND sqlQ.lg_PREENREGISTREMENT_ID=p.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed' AND m.`typeTransaction`=1 AND m.pkey=p.`lg_PREENREGISTREMENT_ID` AND p.`lg_TYPE_VENTE_ID` <> ?1 AND m.`lg_EMPLACEMENT_ID` =?2 AND p.imported=0 AND m.`typeTransaction`=1 %s {excludeStatement} ";
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @EJB
    private BalanceService balanceService;

    @Override
    public JSONObject donneesRecapActiviteView(LocalDate dtStart, LocalDate dtEnd, String emplacementId, TUser tu,
            String query) throws JSONException {
        return new JSONObject().put("data", new JSONObject(donneesRecapActivite(dtStart, dtEnd, emplacementId, tu)));
    }

    @Override
    public JSONObject donneesRecapActiviteView(LocalDate dtStart, LocalDate dtEnd, String emplacementId, String query)
            throws JSONException {
        return new JSONObject().put("data", new JSONObject(donneesRecapActivite(dtStart, dtEnd, emplacementId, query)));
    }

    private List<MvtTransaction> findAllsTransaction(LocalDate dtStart, LocalDate dtEnd, String emplacementId) {

        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<MvtTransaction> cq = cb.createQuery(MvtTransaction.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(root).orderBy(cb.desc(root.get(MvtTransaction_.createdAt)));
            predicates
                    .add(cb.equal(root.get(MvtTransaction_.magasin).get(TEmplacement_.lgEMPLACEMENTID), emplacementId));
            Predicate btw = cb.between(root.get(MvtTransaction_.mvtDate), dtStart, dtEnd);
            predicates.add(btw);
            In<TypeTransaction> in = cb.in(root.get(MvtTransaction_.typeTransaction));
            List<TypeTransaction> status = List.of(TypeTransaction.ACHAT, TypeTransaction.ENTREE,
                    TypeTransaction.SORTIE);
            status.forEach(s -> in.value(s));
            predicates.add(in);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private List<TTiersPayant> getPayants(String name) {
        return getEntityManager().createQuery(
                "SELECT o FROM TTiersPayant o WHERE (o.strNAME LIKE ?1 OR o.lgTYPETIERSPAYANTID.strLIBELLETYPETIERSPAYANT LIKE ?1) ")
                .setParameter(1, name + "%").getResultList();
    }

    private TTiersPayant findPayantById(String id) {
        try {
            return getEntityManager().find(TTiersPayant.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<Params> donneesReglementsTp(LocalDate dtStart, LocalDate dtEnd, String emplacementId, TUser tu,
            String query, int start, int limit, boolean all) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Params> cq = cb.createQuery(Params.class);
            Root<TDossierReglement> root = cq.from(TDossierReglement.class);
            // String description, String ref, String refParent, long value, long nbreClient, long nbreBons
            cq.select(cb.construct(Params.class, root.get(TDossierReglement_.lgFACTUREID).get(TFacture_.strCODEFACTURE),
                    root.get(TDossierReglement_.strORGANISMEID), root.get(TDossierReglement_.dblAMOUNT),
                    root.get(TDossierReglement_.lgFACTUREID).get(TFacture_.dblMONTANTCMDE),
                    root.get(TDossierReglement_.lgFACTUREID).get(TFacture_.dblMONTANTRESTANT)));
            predicates.add(cb.equal(root.get(TDossierReglement_.lgUSERID).get(TUser_.lgEMPLACEMENTID)
                    .get(TEmplacement_.lgEMPLACEMENTID), emplacementId));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TDossierReglement_.dtCREATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            if (query != null && !"".equals(query)) {
                List<String> or = getPayants(query).stream().map(TTiersPayant::getLgTIERSPAYANTID)
                        .collect(Collectors.toList());
                predicates.add(root.get(TDossierReglement_.strORGANISMEID).in(or));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Params> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            List<Params> list = q.getResultList();

            return list.stream().map(x -> new Params(x, findPayantById(x.getRef()))).sorted(comparator)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    public long donneesReglementsTp(LocalDate dtStart, LocalDate dtEnd, String emplacementId, String query) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TDossierReglement> root = cq.from(TDossierReglement.class);
            // String description, String ref, String refParent, long value, long nbreClient, long nbreBons
            cq.select(cb.count(root));
            predicates.add(cb.equal(root.get(TDossierReglement_.lgUSERID).get(TUser_.lgEMPLACEMENTID)
                    .get(TEmplacement_.lgEMPLACEMENTID), emplacementId));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TDossierReglement_.dtCREATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
            predicates.add(btw);
            if (query != null && !"".equals(query)) {
                List<String> or = getPayants(query).stream().map(TTiersPayant::getLgTIERSPAYANTID)
                        .collect(Collectors.toList());
                predicates.add(root.get(TDossierReglement_.strORGANISMEID).in(or));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    Comparator<Params> comparator = Comparator.comparing(Params::getDescription);

    @Override
    public JSONObject donneesReglementsTpView(LocalDate dtStart, LocalDate dtEnd, String emplacementId, TUser tu,
            String query, int start, int limit, boolean all) throws JSONException {
        JSONObject json = new JSONObject();
        long count = donneesReglementsTp(dtStart, dtEnd, emplacementId, query);
        return json.put("total", count).put("data",
                new JSONArray(donneesReglementsTp(dtStart, dtEnd, emplacementId, tu, query, start, limit, all)));

    }

    @Override
    public JSONObject donneesCreditAccordesView(BalanceParamsDTO balanceParams) throws JSONException {
        JSONObject json = new JSONObject();
        int count = fetchRecapPreenregistrementsCount(balanceParams);
        return json.put("total", count).put("data", new JSONArray(donneesCreditAccordes(balanceParams)));

    }

    RecapActiviteDTO buildVenteData(LocalDate dtStart, LocalDate dtEnd, String emplacementId) {
        RecapActiviteDTO recapActivite = new RecapActiviteDTO();
        List<BalanceDTO> balanceVente = this.balanceService.recapBalance(BalanceParamsDTO.builder()
                .dtStart(dtStart.toString()).dtEnd(dtEnd.toString()).emplacementId(emplacementId).build());
        List<TvaDTO> tvas = this.balanceService.statistiqueTvaPeriodique(BalanceParamsDTO.builder()
                .dtStart(dtStart.toString()).dtEnd(dtEnd.toString()).emplacementId(emplacementId).build());
        for (TvaDTO tva : tvas) {
            recapActivite.setMontantHT(tva.getMontantHt() + recapActivite.getMontantHT());
            recapActivite.setMontantTVA(recapActivite.getMontantTVA() + tva.getMontantTva());
            recapActivite.setMontantTTC(tva.getMontantTtc() + recapActivite.getMontantTTC());
        }
        long montantEsp = 0;
        long montantCb = 0;
        long montantDiff = 0;
        long montantVir = 0;

        long montantCh = 0;
        long montantOrange = 0;
        long montantMoov = 0;
        long montantMtn = 0;
        long montantWave = 0;
        List<RecapActiviteReglementDTO> reglements = new ArrayList<>();
        for (BalanceDTO b : balanceVente) {
            recapActivite.setMontantNet(b.getMontantNet() + recapActivite.getMontantNet());
            recapActivite.setMontantRemise(b.getMontantRemise() + recapActivite.getMontantRemise());
            recapActivite.setMontantRegle(recapActivite.getMontantRegle() + b.getMontantRegle());
            recapActivite.setMontantEsp(b.getMontantEsp() + recapActivite.getMontantEsp());
            recapActivite.setMontantCredit(recapActivite.getMontantCredit() + b.getMontantDiff() + b.getMontantTp());
            recapActivite.setMarge(b.getMarge() + recapActivite.getMarge());
            montantCb += b.getMontantCB();
            montantEsp += b.getMontantEsp();
            montantDiff += b.getMontantDiff();

            montantCh += b.getMontantCheque();
            montantVir += b.getMontantVirement();
            montantOrange += b.getMontantOrange();
            montantMoov += b.getMontantMoov();
            montantMtn += b.getMontantMtn();
            montantWave += b.getMontantWave();

        }
        if (montantEsp != 0) {
            reglements.add(new RecapActiviteReglementDTO("Espèce", montantEsp));
        }

        if (montantOrange != 0) {
            reglements.add(new RecapActiviteReglementDTO("Orange", montantOrange));
        }
        if (montantMoov != 0) {
            reglements.add(new RecapActiviteReglementDTO("Moov", montantMoov));
        }
        if (montantMtn != 0) {
            reglements.add(new RecapActiviteReglementDTO("MTN", montantMtn));
        }
        if (montantWave != 0) {
            reglements.add(new RecapActiviteReglementDTO("WAVE", montantWave));
        }
        if (montantCb != 0) {
            reglements.add(new RecapActiviteReglementDTO("Carte bancaire", montantCb));
        }
        if (montantCh != 0) {
            reglements.add(new RecapActiviteReglementDTO("Chèque", montantCh));
        }
        if (montantDiff != 0) {
            reglements.add(new RecapActiviteReglementDTO("Différé", montantDiff));
        }
        if (montantVir != 0) {
            reglements.add(new RecapActiviteReglementDTO("Virement", montantVir));
        }
        recapActivite.setReglements(reglements);
        return recapActivite;
    }

    @Override
    public RecapActiviteDTO donneesRecapActivite(LocalDate dtStart, LocalDate dtEnd, String emplacementId, TUser tu) {
        RecapActiviteDTO recapActivite = buildVenteData(dtStart, dtEnd, emplacementId);
        List<MvtTransaction> mvtTransactions = findAllsTransaction(dtStart, dtEnd, emplacementId);
        List<RecapActiviteReglementDTO> mvtsCaisse = new ArrayList<>();
        List<AchatDTO> achats = new ArrayList<>();

        long montantTotalMvt = 0;
        long montantTotalAchat = 0;
        long montantTotalHtAchat = 0;
        long montantTotalTvaAchat = 0;

        for (MvtTransaction v : mvtTransactions) {

            switch (v.getTypeTransaction()) {

            case ENTREE:
            case SORTIE:
                mvtsCaisse.add(new RecapActiviteReglementDTO(v.gettTypeMvtCaisse().getStrNAME(), v.getMontantRegle()));
                montantTotalMvt += v.getMontantRegle();
                break;
            case ACHAT:
                AchatDTO achat = new AchatDTO();
                achat.setLibelleGroupeGrossiste(Objects.nonNull(v.getGrossiste().getGroupeId())
                        ? v.getGrossiste().getGroupeId().getLibelle() : v.getGrossiste().getStrLIBELLE());
                achat.setMontantTTC(v.getMontant());
                achat.setMontantHT(v.getMontantNet());
                achat.setMontantTVA(v.getMontantTva());
                achats.add(achat);
                montantTotalAchat += v.getMontant();
                montantTotalHtAchat += v.getMontantNet();
                montantTotalTvaAchat += v.getMontantTva();

                break;
            default:
                break;
            }
        }

        Map<String, Long> mvts = mvtsCaisse.stream().collect(Collectors.groupingBy(
                RecapActiviteReglementDTO::getLibelle, Collectors.summingLong(RecapActiviteReglementDTO::getMontant)));
        List<RecapActiviteReglementDTO> mvt = new ArrayList<>();
        mvts.forEach((key, value) -> mvt.add(new RecapActiviteReglementDTO(key, value)));
        recapActivite.setMvtsCaisse(mvt);
        List<AchatDTO> achatsglobal = new ArrayList<>();
        achats.stream().collect(Collectors.groupingBy(AchatDTO::getLibelleGroupeGrossiste)).forEach((k, v) -> {
            AchatDTO o = new AchatDTO();
            o.setLibelleGroupeGrossiste(k);
            LongAdder montantAchatTTC = new LongAdder();
            LongAdder montantAchatTh = new LongAdder();
            LongAdder montantAchatTva = new LongAdder();
            v.forEach(b -> {
                montantAchatTTC.add(b.getMontantTTC());
                montantAchatTh.add(b.getMontantHT());
                montantAchatTva.add(b.getMontantTVA());
            });
            o.setMontantHT(montantAchatTh.intValue());
            o.setMontantTTC(montantAchatTTC.intValue());
            o.setMontantTVA(montantAchatTva.intValue());
            achatsglobal.add(o);
        });
        recapActivite.setAchats(achatsglobal);
        recapActivite.setMontantTotalMvt(montantTotalMvt);

        long totalAchat = montantTotalAchat;
        if (totalAchat > 0) {
            double ratio = Double.valueOf(recapActivite.getMontantNet()) / totalAchat;
            recapActivite.setRatio(BigDecimal.valueOf(ratio).setScale(2, RoundingMode.HALF_UP).doubleValue());
        }
        recapActivite.setMontantTotalHT(montantTotalHtAchat);
        recapActivite.setMontantTotalTTC(totalAchat);
        recapActivite.setMontantTotalTVA(montantTotalTvaAchat);
        try {

            int pourEp = (int) Math.ceil(
                    Double.valueOf(recapActivite.getMontantEsp()) * 100 / Math.abs(recapActivite.getMontantNet()));

            recapActivite.setPourcentageEsp(pourEp);
            recapActivite.setPourcentageCredit(100 - pourEp);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return recapActivite;

    }

    @Override
    public RecapActiviteDTO donneesRecapActivite(LocalDate dtStart, LocalDate dtEnd, String emplacementId,
            String query) {
        RecapActiviteDTO recapActivite = buildVenteData(dtStart, dtEnd, emplacementId);
        List<MvtTransaction> mvtTransactions = findAllsTransaction(dtStart, dtEnd, emplacementId);
        List<RecapActiviteReglementDTO> mvtsCaisse = new ArrayList<>();
        List<AchatDTO> achats = new ArrayList<>();

        long montantTotalMvt = 0;
        long montantTotalAchat = 0;
        long montantTotalHtAchat = 0;
        long montantTotalTvaAchat = 0;

        for (MvtTransaction v : mvtTransactions) {

            switch (v.getTypeTransaction()) {

            case ENTREE:
            case SORTIE:
                mvtsCaisse.add(new RecapActiviteReglementDTO(v.gettTypeMvtCaisse().getStrNAME(), v.getMontantRegle()));
                montantTotalMvt += v.getMontantRegle();
                break;
            case ACHAT:
                AchatDTO achat = new AchatDTO();
                achat.setLibelleGroupeGrossiste(Objects.nonNull(v.getGrossiste().getGroupeId())
                        ? v.getGrossiste().getGroupeId().getLibelle() : v.getGrossiste().getStrLIBELLE());
                achat.setMontantTTC(v.getMontant());
                achat.setMontantHT(v.getMontantNet());
                achat.setMontantTVA(v.getMontantTva());
                achats.add(achat);
                montantTotalAchat += v.getMontant();
                montantTotalHtAchat += v.getMontantNet();
                montantTotalTvaAchat += v.getMontantTva();

                break;
            default:
                break;
            }
        }

        Map<String, Long> mvts = mvtsCaisse.stream().collect(Collectors.groupingBy(
                RecapActiviteReglementDTO::getLibelle, Collectors.summingLong(RecapActiviteReglementDTO::getMontant)));
        List<RecapActiviteReglementDTO> mvt = new ArrayList<>();
        mvts.forEach((key, value) -> mvt.add(new RecapActiviteReglementDTO(key, value)));
        recapActivite.setMvtsCaisse(mvt);
        List<AchatDTO> achatsglobal = new ArrayList<>();
        achats.stream().collect(Collectors.groupingBy(AchatDTO::getLibelleGroupeGrossiste)).forEach((k, v) -> {
            AchatDTO o = new AchatDTO();
            o.setLibelleGroupeGrossiste(k);
            LongAdder montantAchatTTC = new LongAdder();
            LongAdder montantAchatTh = new LongAdder();
            LongAdder montantAchatTva = new LongAdder();
            v.forEach(b -> {
                montantAchatTTC.add(b.getMontantTTC());
                montantAchatTh.add(b.getMontantHT());
                montantAchatTva.add(b.getMontantTVA());
            });
            o.setMontantHT(montantAchatTh.intValue());
            o.setMontantTTC(montantAchatTTC.intValue());
            o.setMontantTVA(montantAchatTva.intValue());
            achatsglobal.add(o);
        });
        recapActivite.setAchats(achatsglobal);
        recapActivite.setMontantTotalMvt(montantTotalMvt);

        long totalAchat = montantTotalAchat;
        if (totalAchat > 0) {
            double ratio = Double.valueOf(recapActivite.getMontantNet()) / totalAchat;
            recapActivite.setRatio(BigDecimal.valueOf(ratio).setScale(2, RoundingMode.HALF_UP).doubleValue());
        }
        recapActivite.setMontantTotalHT(montantTotalHtAchat);
        recapActivite.setMontantTotalTTC(totalAchat);
        recapActivite.setMontantTotalTVA(montantTotalTvaAchat);
        try {

            int pourEp = (int) Math.ceil(
                    Double.valueOf(recapActivite.getMontantEsp()) * 100 / Math.abs(recapActivite.getMontantNet()));

            recapActivite.setPourcentageEsp(pourEp);
            recapActivite.setPourcentageCredit(100 - pourEp);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return recapActivite;

    }

    private String replacePlaceHolder(String sql, BalanceParamsDTO balanceParams) {
        if (balanceParams.isShowAllAmount()) {
            sql = sql.replace("{excludeStatement}", "");

        } else {
            sql = sql.replace("{excludeStatement}", EXCLUDE_STATEMENT);
        }
        if (StringUtils.isNotEmpty(balanceParams.getQuery())) {
            sql = String.format(sql,
                    String.format(RAPPORT_SQL_LIKE, balanceParams.getQuery() + "%", balanceParams.getQuery() + "%"));
        } else {
            sql = String.format(sql, "");
        }

        return sql;
    }

    private List<Tuple> fetchRecapPreenregistrements(BalanceParamsDTO balanceParams) {

        String sql = replacePlaceHolder(RAPPORT_SQL_QUERY, balanceParams);
        LOG.log(Level.INFO, "sql--- rapport activite credit sql {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));
            if (!balanceParams.isAll()) {
                query.setFirstResult(balanceParams.getStart());
                query.setMaxResults(balanceParams.getLimi());
            }
            return query.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private int fetchRecapPreenregistrementsCount(BalanceParamsDTO balanceParams) {

        String sql = replacePlaceHolder(RAPPORT_COUNT_SQL_QUERY, balanceParams);
        LOG.log(Level.INFO, "sql--- rapport activite credit sql {0}", sql);
        try {
            Query query = em.createNativeQuery(sql).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));

            return ((BigInteger) query.getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private RecapActiviteCreditDTO buildFromTuple(Tuple tuple) {
        return new RecapActiviteCreditDTO(tuple.get("libelleTiersPayant", String.class),
                tuple.get("typeTiersPayant", String.class), tuple.get("amount", BigDecimal.class).longValue(),
                tuple.get("nbreClient", BigInteger.class).longValue(),
                tuple.get("nbreBon", BigInteger.class).longValue());
    }

    @Override
    public List<RecapActiviteCreditDTO> donneesCreditAccordes(BalanceParamsDTO balanceParams) {
        return fetchRecapPreenregistrements(balanceParams).stream().map(this::buildFromTuple)
                .collect(Collectors.toList());
    }

    private Tuple fetchRecapPreenregistrementsCreditTotaux(BalanceParamsDTO balanceParams) {

        String sql = replacePlaceHolder(RAPPORT_TOTAUX_SQL_QUERY, balanceParams);
        LOG.log(Level.INFO, "sql--- rapport RAPPORT_TOTAUX_SQL_QUERY credit sql {0}", sql);
        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, Constant.DEPOT_EXTENSION)
                    .setParameter(2, balanceParams.getEmplacementId())
                    .setParameter(3, java.sql.Date.valueOf(balanceParams.getDtStart()))
                    .setParameter(4, java.sql.Date.valueOf(balanceParams.getDtEnd()));

            return (Tuple) query.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public RecapActiviteCreditDTO donneesRecapTotataux(BalanceParamsDTO balanceParams) {
        return Optional.ofNullable(fetchRecapPreenregistrementsCreditTotaux(balanceParams))
                .map(this::buildMonoFromTuple).orElse(new RecapActiviteCreditDTO(0, 0, 0));
    }

    @Override
    public RecapActiviteCreditDTO donneesRecapTotaux(BalanceParamsDTO balanceParams) {
        return Optional.ofNullable(fetchRecapPreenregistrementsCreditTotaux(balanceParams))
                .map(this::buildMonoFromTuple).orElse(new RecapActiviteCreditDTO(0, 0, 0));
    }

    private RecapActiviteCreditDTO buildMonoFromTuple(Tuple tuple) {
        if (Objects.isNull(tuple)) {
            return new RecapActiviteCreditDTO(0, 0, 0);
        }
        BigDecimal amount = tuple.get("amount", BigDecimal.class);
        if (Objects.isNull(amount)) {
            return new RecapActiviteCreditDTO(0, 0, 0);
        }
        try {
            return new RecapActiviteCreditDTO(amount.longValue(), tuple.get("nbreClient", BigInteger.class).longValue(),
                    tuple.get("nbreBon", BigInteger.class).longValue());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new RecapActiviteCreditDTO(0, 0, 0);
        }

    }

}
