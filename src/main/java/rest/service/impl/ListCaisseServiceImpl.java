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
import dal.TTypeMvtCaisse_;
import dal.TTypeReglement;
import dal.TTypeReglement_;
import dal.TUser;
import dal.TUser_;
import dal.VenteReglement;
import dal.VenteReglement_;
import dal.enumeration.TypeTransaction;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
import javax.persistence.criteria.Expression;
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
        Map<String, SumCaisseDTO> byMode = new LinkedHashMap<>();
        accumulate(byMode, sumReglementsVentes(caisseParams));
        accumulate(byMode, sumAutresMouvements(caisseParams));
        List<SumCaisseDTO> summaries = new ArrayList<>(byMode.values());
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

    private void accumulate(Map<String, SumCaisseDTO> byMode, List<Object[]> rows) {
        for (Object[] row : rows) {
            String mode = (String) row[0];
            long montant = row[1] != null ? ((Number) row[1]).longValue() : 0l;
            long montantAnnulation = row[2] != null ? ((Number) row[2]).longValue() : 0l;
            SumCaisseDTO sumCaisse = byMode.computeIfAbsent(mode, k -> {
                SumCaisseDTO dto = new SumCaisseDTO();
                dto.setModeReglement(k);
                return dto;
            });
            sumCaisse.setAmount(sumCaisse.getAmount() + montant);
            sumCaisse.setMontantAnnulation(sumCaisse.getMontantAnnulation() + montantAnnulation);
        }
    }

    /*
     * Totaux par mode de reglement des ventes, agreges en base au lieu de charger toutes les transactions de la periode
     * en memoire.
     */
    private List<Object[]> sumReglementsVentes(CaisseParamsDTO caisseParams) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            Root<VenteReglement> vr = cq.from(VenteReglement.class);
            List<Predicate> predicates = predicates(caisseParams, cb, root, cq);
            predicates.add(
                    cb.equal(vr.get(VenteReglement_.preenregistrement).get(TPreenregistrement_.lgPREENREGISTREMENTID),
                            root.get(MvtTransaction_.pkey)));
            predicates.add(root.get(MvtTransaction_.typeTransaction).in(TypeTransaction.VENTE_COMPTANT,
                    TypeTransaction.VENTE_CREDIT));
            Expression<String> mode = vr.get(VenteReglement_.typeReglement).get(TTypeReglement_.strNAME);
            Expression<Integer> annulation = cb.<Integer> selectCase()
                    .when(cb.lt(vr.get(VenteReglement_.montant), 0), vr.get(VenteReglement_.montant)).otherwise(0);
            cq.multiselect(mode, cb.sumAsLong(vr.get(VenteReglement_.montantAttentu)), cb.sumAsLong(annulation))
                    .where(cb.and(predicates.toArray(Predicate[]::new))).groupBy(mode);
            return getEntityManager().createQuery(cq).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /*
     * Totaux des mouvements hors vente (entrees/sorties de caisse...), portes par le reglement de la transaction.
     */
    private List<Object[]> sumAutresMouvements(CaisseParamsDTO caisseParams) {
        try {
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            List<Predicate> predicates = predicates(caisseParams, cb, root, cq);
            predicates.add(cb.not(root.get(MvtTransaction_.tTypeMvtCaisse).get(TTypeMvtCaisse_.lgTYPEMVTCAISSEID)
                    .in(Constant.MVT_VENTE_VO, Constant.MVT_VENTE_VNO)));
            Expression<String> mode = root.get(MvtTransaction_.reglement).get(TTypeReglement_.strNAME);
            Expression<Integer> annulation = cb.<Integer> selectCase()
                    .when(cb.lt(root.get(MvtTransaction_.montant), 0), root.get(MvtTransaction_.montant)).otherwise(0);
            cq.multiselect(mode, cb.sumAsLong(root.get(MvtTransaction_.montant)), cb.sumAsLong(annulation))
                    .where(cb.and(predicates.toArray(Predicate[]::new))).groupBy(mode);
            return getEntityManager().createQuery(cq).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
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

            predicates.add(cb.between(root.get(MvtTransaction_.createdAt), debut, fin));
        } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() == null) {

            predicates.add(
                    cb.between(root.get(MvtTransaction_.mvtDate), caisseParams.getStartDate(), caisseParams.getEnd()));
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
        List<VenteReglementDTO> reglements = new ArrayList<>();
        TClient client = null;
        if (estVente(m)) {
            TPreenregistrement p = findVenteByVenteId(m.getPkey());
            List<VenteReglement> venteReglements = p.getVenteReglements();
            if (CollectionUtils.isNotEmpty(venteReglements)) {
                reglements = venteReglements.stream().map(this::buildFromVente).collect(Collectors.toList());
            }

            client = p.getClient();

        }
        return construireLigne(m, client == null ? null : client.getStrFIRSTNAME() + " " + client.getStrLASTNAME(),
                reglements);
    }

    private static boolean estVente(MvtTransaction m) {
        return m.getTypeTransaction() == TypeTransaction.VENTE_COMPTANT
                || m.getTypeTransaction() == TypeTransaction.VENTE_CREDIT;
    }

    /**
     * Plan du 19/11, point 15 : les memes lignes que {@link #fetchAll}, pour l'export de toute une periode. fetchAll
     * charge chaque mouvement en entite, avec sa vente et ses liens (52 a 77 s pour un mois sur le banc) ; ici une
     * seule requete lit les colonnes utiles, avec les memes criteres et le meme ordre (heure de creation), puis clients
     * et reglements des ventes sont lus par lots, dans l'ordre ou la vente les rend (vente, puis identifiant).
     */
    @Override
    public List<VisualisationCaisseDTO> fetchAllExport(CaisseParamsDTO caisseParams) {
        StringBuilder sql = new StringBuilder(
                "SELECT m.typeTransaction, m.typeMvtCaisseId, tm.str_NAME AS typeLibelle, m.reference,"
                        + " u.str_FIRST_NAME, u.str_LAST_NAME, m.montant, m.montantRegle, m.pkey, m.mvtdate, m.createdAt,"
                        + " tr.str_NAME AS reglementLibelle FROM MvtTransaction m JOIN t_user u ON u.lg_USER_ID = m.caisse"
                        + " LEFT JOIN t_type_mvt_caisse tm ON tm.lg_TYPE_MVT_CAISSE_ID = m.typeMvtCaisseId"
                        + " LEFT JOIN t_type_reglement tr ON tr.lg_TYPE_REGLEMENT_ID = m.typeReglementId"
                        + " WHERE m.lg_EMPLACEMENT_ID = ?1 AND m.typeTransaction <> ?2");
        List<Object> valeurs = new ArrayList<>();
        valeurs.add(caisseParams.getEmplacementId());
        valeurs.add(TypeTransaction.ACHAT.ordinal());
        if (caisseParams.getStartHour() != null && caisseParams.getStartEnd() != null) {
            sql.append(" AND m.createdAt BETWEEN ?3 AND ?4");
            valeurs.add(java.sql.Timestamp
                    .valueOf(LocalDateTime.of(caisseParams.getStartDate(), caisseParams.getStartHour())));
            valeurs.add(
                    java.sql.Timestamp.valueOf(LocalDateTime.of(caisseParams.getEnd(), caisseParams.getStartEnd())));
        } else if (caisseParams.getStartHour() == null && caisseParams.getStartEnd() == null) {
            sql.append(" AND m.mvtdate BETWEEN ?3 AND ?4");
            valeurs.add(java.sql.Date.valueOf(caisseParams.getStartDate()));
            valeurs.add(java.sql.Date.valueOf(caisseParams.getEnd()));
        }
        if (StringUtils.isNotEmpty(caisseParams.getTypeReglementId())) {
            valeurs.add(caisseParams.getTypeReglementId());
            sql.append(" AND m.pkey IN (SELECT r.vente_id FROM vente_reglement r WHERE r.type_regelement = ?")
                    .append(valeurs.size()).append(")");
        }
        if (caisseParams.getUtilisateurId() != null) {
            valeurs.add(caisseParams.getUtilisateurId());
            sql.append(" AND m.caisse = ?").append(valeurs.size());
        }
        sql.append(" ORDER BY m.createdAt");
        Query qm = getEntityManager().createNativeQuery(sql.toString());
        for (int k = 0; k < valeurs.size(); k++) {
            qm.setParameter(k + 1, valeurs.get(k));
        }
        @SuppressWarnings("unchecked")
        List<Object[]> mvts = qm.getResultList();
        int comptant = TypeTransaction.VENTE_COMPTANT.ordinal(), credit = TypeTransaction.VENTE_CREDIT.ordinal();
        java.util.function.Predicate<Object[]> vente = l -> l[0] != null
                && (((Number) l[0]).intValue() == comptant || ((Number) l[0]).intValue() == credit);
        List<String> ventes = mvts.stream().filter(vente).map(l -> (String) l[8]).distinct()
                .collect(Collectors.toList());
        Map<String, String> clients = new java.util.HashMap<>();
        Map<String, List<VenteReglementDTO>> reglements = new java.util.HashMap<>();
        for (int i = 0; i < ventes.size(); i += 500) {
            List<String> lot = ventes.subList(i, Math.min(ventes.size(), i + 500));
            StringBuilder in = new StringBuilder();
            for (int k = 1; k <= lot.size(); k++) {
                in.append(k == 1 ? "?" : ",?").append(k);
            }
            Query qc = getEntityManager().createNativeQuery(
                    "SELECT p.lg_PREENREGISTREMENT_ID, c.str_FIRST_NAME, c.str_LAST_NAME FROM t_preenregistrement p"
                            + " JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID WHERE p.lg_PREENREGISTREMENT_ID IN ("
                            + in + ")");
            Query qr = getEntityManager().createNativeQuery(
                    "SELECT r.vente_id, r.type_regelement, t.str_NAME, r.montant, r.montant_attentu FROM vente_reglement r"
                            + " JOIN t_type_reglement t ON t.lg_TYPE_REGLEMENT_ID = r.type_regelement"
                            + " WHERE r.vente_id IN (" + in + ") ORDER BY r.vente_id, r.id");
            for (int k = 0; k < lot.size(); k++) {
                qc.setParameter(k + 1, lot.get(k));
                qr.setParameter(k + 1, lot.get(k));
            }
            for (Object o : qc.getResultList()) {
                Object[] l = (Object[]) o;
                /* meme concatenation que l'ecran (un nom absent s'y ecrit « null ») */
                clients.put((String) l[0], (String) l[1] + " " + (String) l[2]);
            }
            for (Object o : qr.getResultList()) {
                Object[] l = (Object[]) o;
                int montant = l[3] == null ? 0 : ((Number) l[3]).intValue();
                int attendu = l[4] == null ? 0 : ((Number) l[4]).intValue();
                VenteReglementDTO r = new VenteReglementDTO();
                r.setMontant(attendu);
                r.setMontantAttentu(attendu);
                r.setTypeReglement((String) l[2]);
                r.setTypeReglementId((String) l[1]);
                if (montant < 0) {
                    r.setMontantAnnulation(montant);
                }
                reglements.computeIfAbsent((String) l[0], x -> new ArrayList<>()).add(r);
            }
        }
        List<VisualisationCaisseDTO> l = new ArrayList<>(mvts.size());
        for (Object[] m : mvts) {
            /* memes regles que construireLigne */
            String type = (String) m[1];
            VisualisationCaisseDTO c = new VisualisationCaisseDTO();
            c.setTypeMouvement(Constant.MVT_VENTE_VO.equals(type) ? "VENTE A CREDIT"
                    : Constant.MVT_VENTE_VNO.equals(type) ? "VENTE AU COMPTANT" : (String) m[2]);
            c.setTypeMvt(type);
            c.setReference((String) m[3]);
            c.setOperateur((String) m[4] + " " + (String) m[5]);
            int montant = m[6] == null ? 0 : ((Number) m[6]).intValue();
            boolean venteCaisse = Constant.MVT_VENTE_VO.equals(type) || Constant.MVT_VENTE_VNO.equals(type);
            c.setMontant(venteCaisse ? (m[7] == null ? 0 : ((Number) m[7]).intValue()) : montant);
            List<VenteReglementDTO> rg = new ArrayList<>();
            if (vente.test(m)) {
                String client = clients.get((String) m[8]);
                if (client != null) {
                    c.setClient(client);
                }
                rg.addAll(reglements.getOrDefault((String) m[8], Collections.emptyList()));
            }
            if (!venteCaisse) {
                VenteReglementDTO r = new VenteReglementDTO();
                r.setMontant(montant);
                r.setMontantAttentu(montant);
                r.setTypeReglement((String) m[11]);
                if (montant < 0) {
                    r.setMontantAnnulation(montant);
                }
                rg.add(r);
            }
            c.setReglements(rg);
            java.time.LocalDate jour = jour(m[9]);
            c.setTaskDate(jour == null ? null : jour.format(dateFormat));
            LocalDateTime cree = instant(m[10]);
            if (cree != null) {
                c.setDateOperation(cree);
                c.setTaskHeure(cree.format(heureFormat));
            }
            l.add(c);
        }
        return l;
    }

    private static java.time.LocalDate jour(Object v) {
        if (v instanceof java.sql.Date) {
            return ((java.sql.Date) v).toLocalDate();
        }
        if (v instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) v).toLocalDateTime().toLocalDate();
        }
        if (v instanceof java.time.LocalDate) {
            return (java.time.LocalDate) v;
        }
        return v instanceof LocalDateTime ? ((LocalDateTime) v).toLocalDate() : null;
    }

    private static LocalDateTime instant(Object v) {
        if (v instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) v).toLocalDateTime();
        }
        return v instanceof LocalDateTime ? (LocalDateTime) v : null;
    }

    private VisualisationCaisseDTO construireLigne(MvtTransaction m, String client,
            List<VenteReglementDTO> reglements) {
        TTypeReglement reglement = m.getReglement();
        VisualisationCaisseDTO caisse = new VisualisationCaisseDTO();

        TTypeMvtCaisse mvt = m.gettTypeMvtCaisse();
        caisse.setTypeMouvement(libelleMouvement(mvt));
        caisse.setTypeMvt(mvt.getLgTYPEMVTCAISSEID());
        caisse.setReference(m.getReference());

        TUser caissier = m.getCaisse();
        caisse.setOperateur(caissier.getStrFIRSTNAME() + " " + caissier.getStrLASTNAME());
        caisse.setOperateurId(caissier.getLgUSERID());
        if (client != null) {
            caisse.setClient(client);
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
                    // Mode mobile money cree par l'officine : regroupe avec les operateurs historiques.
                    if (util.MobileMoney.est(reglement.getTypeReglementId())) {
                        o.setMobile(o.getMobile() + montant);
                    } else if (FideliteService.TYPE_REGLEMENT.equals(reglement.getTypeReglementId())) {
                        o.setPointsFidelite(o.getPointsFidelite() + montant);
                    }
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

    /**
     * Le libelle du type de mouvement tel qu'il doit APPARAITRE en caisse.
     *
     * <p>
     * La base nomme ces deux types « ventes ordonnancees » et « ventes N.O. », des termes de parametrage que le
     * personnel de caisse ne lit pas dans ce sens : ce qui l'interesse est de savoir si l'argent est entre ou non. La
     * correspondance se fait sur l'IDENTIFIANT du type et non sur son nom, pour qu'un renommage en parametrage ne la
     * rompe pas silencieusement.
     * </p>
     *
     * <p>
     * Seul l'affichage change ; le nom en base et les filtres, qui portent sur l'identifiant, restent intacts.
     * </p>
     */
    private static String libelleMouvement(TTypeMvtCaisse mvt) {
        if (mvt == null) {
            return "";
        }
        if (Constant.MVT_VENTE_VO.equals(mvt.getLgTYPEMVTCAISSEID())) {
            return "VENTE A CREDIT";
        }
        if (Constant.MVT_VENTE_VNO.equals(mvt.getLgTYPEMVTCAISSEID())) {
            return "VENTE AU COMPTANT";
        }
        return mvt.getStrNAME();
    }
}
