package rest.service.impl;

import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TUser;
import dal.VenteSuppression;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.VenteSuppressionService;
import rest.service.dto.VenteSuppressionDTO;

/**
 * Tracabilite des produits retires d'une vente et des ventes abandonnees.
 */
@Stateless
public class VenteSuppressionServiceImpl implements VenteSuppressionService {

    private static final Logger LOG = Logger.getLogger(VenteSuppressionServiceImpl.class.getName());
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HEURE_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void logProduitSuppression(TPreenregistrement vente, TPreenregistrementDetail detail, TUser user) {
        try {
            em.persist(build(VenteSuppression.TYPE_PRODUIT, vente, detail, user));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "logProduitSuppression", e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void logVenteSuppression(TPreenregistrement vente, TUser user) {
        try {
            if (vente == null || CollectionUtils.isEmpty(vente.getTPreenregistrementDetailCollection())) {
                return;
            }
            // Les devis (nature de vente '3') ne sont pas des ventes abandonnees
            if (vente.getLgNATUREVENTEID() != null && "3".equals(vente.getLgNATUREVENTEID().getLgNATUREVENTEID())) {
                return;
            }
            for (TPreenregistrementDetail detail : vente.getTPreenregistrementDetailCollection()) {
                em.persist(build(VenteSuppression.TYPE_VENTE, vente, detail, user));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "logVenteSuppression", e);
        }
    }

    /** Operateur affiche pour les suppressions faites par le systeme, et non par une personne. */
    public static final String AUTEUR_SYSTEME = "Système";

    @Override
    public void logVenteSuppressionSysteme(TPreenregistrement vente) {
        try {
            if (vente == null || CollectionUtils.isEmpty(vente.getTPreenregistrementDetailCollection())) {
                return;
            }
            // Les devis (nature de vente '3') ne sont pas des ventes abandonnees : meme exclusion que
            // la suppression manuelle, pour que les deux chemins tracent exactement les memes cas.
            if (vente.getLgNATUREVENTEID() != null && "3".equals(vente.getLgNATUREVENTEID().getLgNATUREVENTEID())) {
                return;
            }
            for (TPreenregistrementDetail detail : vente.getTPreenregistrementDetailCollection()) {
                VenteSuppression suppression = build(VenteSuppression.TYPE_VENTE, vente, detail, null);
                // Pas d'utilisateur : on force le libelle plutot que de laisser la colonne vide, sans
                // quoi ces lignes seraient indiscernables d'une trace incomplete.
                suppression.setUserName(AUTEUR_SYSTEME);
                em.persist(suppression);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "logVenteSuppressionSysteme", e);
        }
    }

    private VenteSuppression build(String type, TPreenregistrement vente, TPreenregistrementDetail detail, TUser user) {
        VenteSuppression suppression = new VenteSuppression();
        suppression.setTypeSuppression(type);
        if (vente != null) {
            suppression.setVenteId(vente.getLgPREENREGISTREMENTID());
            suppression.setVenteRef(
                    StringUtils.isNotEmpty(vente.getStrREF()) ? vente.getStrREF() : vente.getStrREFTICKET());
        }
        if (detail != null) {
            TFamille famille = detail.getLgFAMILLEID();
            if (famille != null) {
                suppression.setProduitId(famille.getLgFAMILLEID());
                suppression.setProduitCip(famille.getIntCIP());
                suppression.setProduitLibelle(famille.getStrNAME());
            }
            suppression.setQuantite(detail.getIntQUANTITY() == null ? 0 : detail.getIntQUANTITY());
        }
        if (user != null) {
            suppression.setUserId(user.getLgUSERID());
            suppression.setUserName(user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        }
        suppression.setMvtDate(LocalDateTime.now());
        return suppression;
    }

    @Override
    public JSONObject list(String dtStart, String dtEnd, String userId, String query, String type, int start,
            int limit) {
        JSONObject json = new JSONObject();
        try {
            long total = count(dtStart, dtEnd, userId, query, type);
            List<VenteSuppression> results = query(dtStart, dtEnd, userId, query, type, start, limit);
            json.put("total", total);
            json.put("results",
                    new JSONArray(results.stream().map(this::toDto).map(JSONObject::new).collect(Collectors.toList())));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list", e);
            json.put("total", 0);
            json.put("results", new JSONArray());
        }
        return json;
    }

    @Override
    public List<VenteSuppressionDTO> fetchAll(String dtStart, String dtEnd, String userId, String query, String type) {
        return query(dtStart, dtEnd, userId, query, type, 0, 0).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Set<String> produitIds(String dtStart, String dtEnd, String userId, String query, String type) {
        return query(dtStart, dtEnd, userId, query, type, 0, 0).stream().map(VenteSuppression::getProduitId)
                .filter(StringUtils::isNotEmpty).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private VenteSuppressionDTO toDto(VenteSuppression suppression) {
        VenteSuppressionDTO dto = new VenteSuppressionDTO();
        dto.setId(suppression.getId());
        dto.setTypeSuppression(suppression.getTypeSuppression());
        dto.setVenteId(suppression.getVenteId());
        dto.setVenteRef(suppression.getVenteRef());
        dto.setProduitId(suppression.getProduitId());
        dto.setProduitCip(suppression.getProduitCip());
        dto.setProduitLibelle(suppression.getProduitLibelle());
        dto.setQuantite(suppression.getQuantite());
        dto.setUserName(suppression.getUserName());
        if (suppression.getMvtDate() != null) {
            dto.setDate(suppression.getMvtDate().format(DATE_FORMAT));
            dto.setHeure(suppression.getMvtDate().format(HEURE_FORMAT));
        }
        return dto;
    }

    private List<VenteSuppression> query(String dtStart, String dtEnd, String userId, String query, String type,
            int start, int limit) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<VenteSuppression> cq = cb.createQuery(VenteSuppression.class);
            Root<VenteSuppression> root = cq.from(VenteSuppression.class);
            cq.select(root).where(predicates(cb, root, dtStart, dtEnd, userId, query, type).toArray(Predicate[]::new))
                    .orderBy(cb.desc(root.get("mvtDate")));
            TypedQuery<VenteSuppression> q = em.createQuery(cq);
            if (limit > 0) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "query", e);
            return List.of();
        }
    }

    private long count(String dtStart, String dtEnd, String userId, String query, String type) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<VenteSuppression> root = cq.from(VenteSuppression.class);
            cq.select(cb.count(root))
                    .where(predicates(cb, root, dtStart, dtEnd, userId, query, type).toArray(Predicate[]::new));
            return em.createQuery(cq).getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "count", e);
            return 0;
        }
    }

    private List<Predicate> predicates(CriteriaBuilder cb, Root<VenteSuppression> root, String dtStart, String dtEnd,
            String userId, String query, String type) {
        List<Predicate> predicates = new java.util.ArrayList<>();
        if (StringUtils.isNotEmpty(dtStart)) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("mvtDate"),
                    LocalDateTime.of(LocalDate.parse(dtStart), LocalTime.MIN)));
        }
        if (StringUtils.isNotEmpty(dtEnd)) {
            predicates.add(
                    cb.lessThanOrEqualTo(root.get("mvtDate"), LocalDateTime.of(LocalDate.parse(dtEnd), LocalTime.MAX)));
        }
        if (StringUtils.isNotEmpty(userId)) {
            predicates.add(cb.equal(root.get("userId"), userId));
        }
        if (StringUtils.isNotEmpty(type)) {
            predicates.add(cb.equal(root.get("typeSuppression"), type));
        }
        if (StringUtils.isNotEmpty(query)) {
            String search = query.trim() + "%";
            predicates.add(cb.or(cb.like(root.get("produitCip"), search),
                    cb.like(cb.lower(root.get("produitLibelle")), search.toLowerCase()),
                    cb.like(root.get("venteRef"), search)));
        }
        return predicates;
    }
}
