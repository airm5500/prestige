package rest.service.impl;

import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.SumCaisseDTO;
import commonTasks.dto.VenteReglementDTO;
import dal.MvtTransaction;
import dal.MvtTransaction_;
import dal.TClient;
import dal.TEmplacement_;
import dal.TPreenregistrement;
import dal.TPreenregistrement_;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TTypeReglement_;
import dal.TUser;
import dal.TUser_;
import dal.VenteReglement;
import dal.VenteReglement_;
import dal.enumeration.TypeTransaction;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ListCaisseService;
import rest.service.v2.dto.VisualisationCaisseDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class ListCaisseServiceImpl implements ListCaisseService {

    private static final Logger LOG = Logger.getLogger(ListCaisseServiceImpl.class.getName());

    private final DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final DateTimeFormatter heureFormat = DateTimeFormatter.ofPattern("HH:mm");
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<VisualisationCaisseDTO> fetchAll(CaisseParamsDTO caisseParams) {
        return findAllTransaction(caisseParams).stream().map(this::buildFromMvtTransaction)
                .collect(Collectors.toList());
    }

    @Override
    public List<SumCaisseDTO> fetchSummary(CaisseParamsDTO caisseParams) {
        List<SumCaisseDTO> summaries = new ArrayList<>();
        caisseParams.setAll(true);
        findAllTransaction(caisseParams).stream().map(this::buildSummaryFromMvtTransaction)
                .flatMap(e -> e.getReglements().stream())
                .collect(Collectors.groupingBy(VenteReglementDTO::getTypeReglement)).forEach((k, v) -> {
                    SumCaisseDTO sumCaisse = new SumCaisseDTO();
                    sumCaisse.setModeReglement(k);
                    long montant = 0;
                    long montantAnnulation = 0;
                    for (VenteReglementDTO venteReglementDTO : v) {
                        montant += venteReglementDTO.getMontant();

                        montantAnnulation += venteReglementDTO.getMontantAnnulation();
                    }
                    sumCaisse.setAmount(montant);
                    sumCaisse.setMontantAnnulation(montantAnnulation);

                    summaries.add(sumCaisse);
                });
        long annulation = summaries.stream().map(SumCaisseDTO::getMontantAnnulation).reduce(0l, Long::sum);
        if (annulation != 0) {
            SumCaisseDTO sumCaisse = new SumCaisseDTO();
            sumCaisse.setModeReglement("Annulation");
            sumCaisse.setMontantAnnulation(annulation);
            sumCaisse.setAmount(annulation);
            summaries.add(sumCaisse);
        }
        return summaries;
    }

    private List<Predicate> predicates(CaisseParamsDTO caisseParams, CriteriaBuilder cb, Root<MvtTransaction> root,
            CriteriaQuery cq) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(MvtTransaction_.magasin).get(TEmplacement_.lgEMPLACEMENTID),
                caisseParams.getEmplacementId()));

        predicates.add(cb.notEqual(root.get(MvtTransaction_.typeTransaction), TypeTransaction.ACHAT));
        if (caisseParams.getStartHour() != null && caisseParams.getStartEnd() != null) {
            LocalDateTime debut = LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour());
            LocalDateTime fin = LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd());

            predicates.add(cb.between(cb.function("TIMESTAMP", Timestamp.class, root.get(MvtTransaction_.createdAt)),
                    java.sql.Timestamp.valueOf(debut), java.sql.Timestamp.valueOf(fin)));
        } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() == null) {

            predicates.add(cb.between(cb.function("DATE", Date.class, root.get(MvtTransaction_.mvtDate)),
                    java.sql.Date.valueOf(caisseParams.getStartDate()), java.sql.Date.valueOf(caisseParams.getEnd())));
        }
        if (StringUtils.isNotEmpty(caisseParams.getTypeReglementId())) {

            Subquery<String> sub = cq.subquery(String.class);
            Root<VenteReglement> pr = sub.from(VenteReglement.class);
            sub.select(pr.get(VenteReglement_.preenregistrement).get(TPreenregistrement_.lgPREENREGISTREMENTID))
                    .where(cb.and(
                            cb.equal(pr.get(VenteReglement_.preenregistrement)
                                    .get(TPreenregistrement_.lgPREENREGISTREMENTID), root.get(MvtTransaction_.pkey)),
                            cb.equal(pr.get(VenteReglement_.typeReglement).get(TTypeReglement_.lgTYPEREGLEMENTID),
                                    caisseParams.getTypeReglementId())));

            predicates.add(cb.in(root.get(MvtTransaction_.pkey)).value(sub));

        }
        if (caisseParams.getUtilisateurId() != null) {
            predicates.add(
                    cb.equal(root.get(MvtTransaction_.caisse).get(TUser_.lgUSERID), caisseParams.getUtilisateurId()));
        }

        return predicates;
    }

    private long findAllsTransaction(CaisseParamsDTO caisseParams) {

        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = predicates(caisseParams, cb, root, cq);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (Long) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0l;
        }

    }

    private List<MvtTransaction> findAllTransaction(CaisseParamsDTO caisseParams) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<MvtTransaction> cq = cb.createQuery(MvtTransaction.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(root).orderBy(cb.asc(root.get(MvtTransaction_.createdAt)));
            List<Predicate> predicates = predicates(caisseParams, cb, root, cq);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(cq);
            if (!caisseParams.isAll()) {
                q.setFirstResult(caisseParams.getStart());
                q.setMaxResults(caisseParams.getLimit());
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private TPreenregistrement findVenteByVenteId(String id) {

        try {
            return getEntityManager().find(TPreenregistrement.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private VisualisationCaisseDTO buildFromMvtTransaction(MvtTransaction m) {
        TTypeReglement reglement = m.getReglement();
        VisualisationCaisseDTO caisse = new VisualisationCaisseDTO();

        List<VenteReglementDTO> reglements = new ArrayList<>();
        TClient client = null;
        if (m.getTypeTransaction() == TypeTransaction.VENTE_COMPTANT
                || m.getTypeTransaction() == TypeTransaction.VENTE_CREDIT) {
            TPreenregistrement p = findVenteByVenteId(m.getPkey());
            List<VenteReglement> venteReglements = p.getVenteReglements();
            if (CollectionUtils.isNotEmpty(venteReglements)) {
                reglements = venteReglements.stream().map(this::buildFromVente).collect(Collectors.toList());
            }

            client = p.getClient();

        }

        TTypeMvtCaisse mvt = m.gettTypeMvtCaisse();
        caisse.setTypeMouvement(mvt.getStrNAME());
        caisse.setTypeMvt(mvt.getLgTYPEMVTCAISSEID());
        caisse.setReference(m.getReference());

        TUser caissier = m.getCaisse();
        caisse.setOperateur(caissier.getStrFIRSTNAME() + " " + caissier.getStrLASTNAME());
        caisse.setOperateurId(caissier.getLgUSERID());
        if (client != null) {
            caisse.setClient(client.getStrFIRSTNAME() + " " + client.getStrLASTNAME());
        }
        switch (mvt.getLgTYPEMVTCAISSEID()) {
        case Constant.MVT_VENTE_VO:
        case Constant.MVT_VENTE_VNO:
            caisse.setMontant(m.getMontantRegle());
            caisse.setMontantBrut(m.getMontant());
            caisse.setMontantNet(m.getMontantNet());
            caisse.setMontantCaisse(m.getMontantRegle());
            caisse.setMontantCredit(m.getMontantRestant());

            break;
        default:
            caisse.setMontant(m.getMontant());
            caisse.setMontantBrut(m.getMontant());
            caisse.setMontantNet(m.getMontant());
            reglements.add(buildFromTypeReglement(reglement, m.getMontant(), m.getMontant()));
            break;

        }
        caisse.setReglements(reglements);
        buildFromRegelement(caisse);
        caisse.setModeReglement(reglement.getStrNAME());
        caisse.setModeRegle(reglement.getLgTYPEREGLEMENTID());
        caisse.setDateOperation(m.getCreatedAt());
        caisse.setTaskDate(m.getMvtDate().format(dateFormat));
        caisse.setTaskHeure(m.getCreatedAt().format(heureFormat));
        return caisse;

    }

    private void buildFromRegelement(VisualisationCaisseDTO o) {
        List<VenteReglementDTO> reglements = o.getReglements();
        if (CollectionUtils.isNotEmpty(reglements)) {

            for (VenteReglementDTO reglement : reglements) {
                int montant = reglement.getMontantAttentu();
                switch (reglement.getTypeReglementId()) {
                case Constant.MODE_ESP:
                    o.setEspece(montant);
                    break;
                case Constant.MODE_CHEQUE:
                    o.setCheque(montant);
                    break;
                case Constant.MODE_CB:
                    o.setCarteBancaire(montant);
                    break;
                case Constant.MODE_VIREMENT:
                    o.setVirement(montant);
                    break;
                case Constant.MODE_MOOV:
                case Constant.TYPE_REGLEMENT_ORANGE:
                case Constant.MODE_MTN:
                case Constant.MODE_WAVE:
                case Constant.MODE_DJAMO:
                    o.setMobile(o.getMobile() + montant);
                    break;

                default:
                    break;
                }
            }
        }
    }

    private VenteReglementDTO buildFromTypeReglement(TTypeReglement tTypeReglement, int montant, int montantAttendu) {
        VenteReglementDTO reglement = new VenteReglementDTO();
        reglement.setMontant(montantAttendu);
        reglement.setMontantAttentu(montantAttendu);
        reglement.setTypeReglement(tTypeReglement.getStrNAME());
        reglement.setTypeReglementId(tTypeReglement.getLgTYPEREGLEMENTID());
        if (montant < 0) {
            reglement.setMontantAnnulation(montant);

        }

        return reglement;
    }

    private VenteReglementDTO buildFromVente(VenteReglement venteReglement) {

        TTypeReglement tTypeReglement = venteReglement.getTypeReglement();
        return buildFromTypeReglement(tTypeReglement, venteReglement.getMontant(), venteReglement.getMontantAttentu());

    }

    private VisualisationCaisseDTO buildSummaryFromMvtTransaction(MvtTransaction m) {
        TTypeReglement reglement = m.getReglement();
        VisualisationCaisseDTO caisse = new VisualisationCaisseDTO();

        List<VenteReglementDTO> reglements = new ArrayList<>();

        if (m.getTypeTransaction() == TypeTransaction.VENTE_COMPTANT
                || m.getTypeTransaction() == TypeTransaction.VENTE_CREDIT) {

            TPreenregistrement p = findVenteByVenteId(m.getPkey());
            List<VenteReglement> venteReglements = p.getVenteReglements();
            if (CollectionUtils.isNotEmpty(venteReglements)) {
                reglements = venteReglements.stream().map(this::buildFromVente).collect(Collectors.toList());
            }
        }
        TTypeMvtCaisse mvt = m.gettTypeMvtCaisse();

        switch (mvt.getLgTYPEMVTCAISSEID()) {
        case Constant.MVT_VENTE_VO:
        case Constant.MVT_VENTE_VNO:

            break;
        default:

            reglements.add(buildFromTypeReglement(reglement, m.getMontant(), m.getMontant()));
            break;

        }
        caisse.setReglements(reglements);

        return caisse;

    }

    @Override
    public JSONObject donneeCaisses(CaisseParamsDTO caisseParams) {
        JSONObject json = new JSONObject();
        long total = findAllsTransaction(caisseParams);
        if (total == 0) {
            return json.put("total", 0).put("data", new JSONArray());
        }

        List<VisualisationCaisseDTO> data = fetchAll(caisseParams);
        List<SumCaisseDTO> sumCaisses = fetchSummary(caisseParams);
        json.put("total", total).put("data", new JSONArray(data)).put("metaData", new JSONArray(sumCaisses));
        return json;
    }
}
