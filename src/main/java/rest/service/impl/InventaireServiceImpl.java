package rest.service.impl;

import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamille_;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TUser;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Predicate;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.SessionHelperService;
import rest.service.inventaire.dto.DetailInventaireDTO;
import rest.service.inventaire.dto.InventaireDTO;
import rest.service.inventaire.dto.RayonDTO;
import rest.service.inventaire.dto.UpdateInventaireDetailDTO;
import util.Constant;
import util.IdGenerator;

/**
 *
 * @author koben
 */
@Stateless
public class InventaireServiceImpl implements InventaireService {

    private static final Logger LOG = Logger.getLogger(InventaireServiceImpl.class.getName());
    @EJB
    private SessionHelperService sessionHelperService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    private static final String INVENTAIRE_QUERY = "INSERT INTO t_inventaire_famille(`lg_INVENTAIRE_ID`,`str_STATUT`,`dt_CREATED`,`boolINVENTAIRE`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`lg_FAMILLE_STOCK_ID`) "
            + " SELECT '{inventaireId}','enable',NOW(),TRUE,  f.`lg_FAMILLE_ID` AS lg_FAMILLE_ID,s.`int_NUMBER_AVAILABLE` ,s.`int_NUMBER_AVAILABLE`,s.`lg_FAMILLE_STOCK_ID` AS lg_FAMILLE_STOCK_ID  FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON d.`lg_PREENREGISTREMENT_ID`=p.`lg_PREENREGISTREMENT_ID` JOIN t_famille f ON f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` JOIN t_famille_stock s ON f.`lg_FAMILLE_ID`=s.`lg_FAMILLE_ID` "
            + " WHERE p.`str_STATUT`='is_Closed' AND p.`b_IS_CANCEL`=1 AND DATE(p.`dt_CREATED`) BETWEEN ?1 AND ?2 AND f.`str_STATUT`='enable' AND s.`lg_EMPLACEMENT_ID`='1' {userClose} GROUP BY  f.`lg_FAMILLE_ID`";

    @Override
    public JSONObject createInventaireFromCanceledList(String dtStart, String dtEnd, String userId, TUser tUser) {
        TInventaire inventaire = createInventaire(tUser, dtStart, dtEnd);
        int response = em
                .createNativeQuery(
                        buildQuery(userId, INVENTAIRE_QUERY.replace("{inventaireId}", inventaire.getLgINVENTAIREID())))
                .setParameter(1, java.sql.Date.valueOf(dtStart)).setParameter(2, java.sql.Date.valueOf(dtEnd))
                .executeUpdate();

        return new JSONObject().put("itemCount", response);
    }

    @Override
    public List<InventaireDTO> fetch(Integer maxResult) {

        try {
            TypedQuery<InventaireDTO> q = em.createQuery(
                    "SELECT new rest.service.inventaire.dto.InventaireDTO( o.lgINVENTAIREID,o.strNAME ) FROM TInventaire o WHERE o.strSTATUT ='enable' ORDER BY  o.dtCREATED DESC",
                    InventaireDTO.class);
            if (Objects.nonNull(maxResult)) {
                q.setMaxResults(maxResult);
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetch", e);
            return List.of();
        }
    }

    @Override
    public List<RayonDTO> fetchRayon(String idInventaire, Integer page, Integer maxResult) {

        try {
            TypedQuery<RayonDTO> q = em.createQuery(
                    "SELECT new rest.service.inventaire.dto.RayonDTO( o.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID,o.lgFAMILLEID.lgZONEGEOID.strCODE,o.lgFAMILLEID.lgZONEGEOID.strLIBELLEE ) FROM TInventaireFamille o   WHERE o.lgINVENTAIREID.lgINVENTAIREID=?1  GROUP BY  o.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID ORDER BY  o.lgFAMILLEID.lgZONEGEOID.strLIBELLEE ASC",
                    RayonDTO.class);
            q.setParameter(1, idInventaire);
            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchRayon", e);
            return List.of();
        }

    }

    @Override
    public List<DetailInventaireDTO> fetchDetails(String idInventaire, String idRayon, String query, Integer page,
            Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire " + " AND o.boolINVENTAIRE=true "
                            + "AND o.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :idRayon");

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);
            q.setParameter("idRayon", idRayon);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetails", e);
            return List.of();
        }
    }

    @Override
    public List<DetailInventaireDTO> fetchDetailsUntouchedRayon(String idInventaire, String idRayon, String query,
            Integer page, Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire " + " AND o.boolINVENTAIRE=true "
                            + "AND o.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :idRayon " + "AND o.dtUPDATED IS NULL ");

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);
            q.setParameter("idRayon", idRayon);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetailsUntouchedRayon", e);
            return List.of();
        }
    }

    @Override
    public List<DetailInventaireDTO> fetchDetailsTouchedRayon(String idInventaire, String idRayon, String query,
            Integer page, Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire " + " AND o.boolINVENTAIRE=true "
                            + "AND o.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID = :idRayon " + "AND o.dtUPDATED IS NOT NULL ");

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);
            q.setParameter("idRayon", idRayon);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetailsTouchedRayon", e);
            return List.of();
        }
    }

    @Override
    public List<DetailInventaireDTO> fetchDetailsAll(String idInventaire, String query, Integer page,
            Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire" + " AND o.boolINVENTAIRE=true ");

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetailsAll", e);
            return List.of();
        }
    }

    @Override
    public List<DetailInventaireDTO> fetchDetailsAllUntouched(String idInventaire, String query, Integer page,
            Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire " + "AND o.dtUPDATED IS NULL" // ✅
                            + " AND o.boolINVENTAIRE=true " // filtre
            // “non
            // touché”
            );

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetailsAllUntouched", e);
            return List.of();
        }
    }

    @Override
    public List<DetailInventaireDTO> fetchDetailsAllTouched(String idInventaire, String query, Integer page,
            Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire " + "AND o.dtUPDATED IS NOT NULL" // ✅
                            + " AND o.boolINVENTAIRE=true "
            // filtre
            // “non
            // touché”
            );

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetailsAllTouched", e);
            return List.of();
        }
    }

    @Override
    public List<DetailInventaireDTO> fetchDetailsAllEcarts(String idInventaire, String query, Integer page,
            Integer maxResult) {
        try {
            StringBuilder jpql = new StringBuilder(
                    "SELECT DISTINCT new rest.service.inventaire.dto.DetailInventaireDTO(" + " o.lgINVENTAIREFAMILLEID,"
                            + " o.lgFAMILLEID.strNAME," + " o.lgFAMILLEID.intCIP," + " o.lgFAMILLEID.intPAF,"
                            + " o.lgFAMILLEID.intPRICE," + " o.intNUMBERINIT," + " o.intNUMBER," + "o.boolINVENTAIRE,"
                            + " o.dtUPDATED" + ") " + "FROM TInventaireFamille o "
                            + "LEFT JOIN o.lgFAMILLEID.tFamilleGrossisteCollection st "
                            + "WHERE o.lgINVENTAIREID.lgINVENTAIREID = :idInventaire " + "AND o.boolINVENTAIRE=true "
                            + "AND COALESCE(o.intNUMBERINIT, 0) <> COALESCE(o.intNUMBER, 0)");

            if (StringUtils.isNotBlank(query)) {
                jpql.append(" AND (" + " o.lgFAMILLEID.intCIP LIKE :search "
                        + " OR LOWER(o.lgFAMILLEID.strNAME) LIKE :searchLower "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.codeEanFabriquant)) LIKE :search "
                        + " OR TRIM(CONCAT('', o.lgFAMILLEID.intEAN13)) LIKE :search "
                        + " OR st.strCODEARTICLE LIKE :search " + " OR o.lgFAMILLEID.lgFAMILLEID LIKE :search " + ")");
            }

            jpql.append(" ORDER BY o.lgFAMILLEID.strNAME ASC");

            TypedQuery<DetailInventaireDTO> q = em.createQuery(jpql.toString(), DetailInventaireDTO.class);
            q.setParameter("idInventaire", idInventaire);

            if (StringUtils.isNotBlank(query)) {
                String trimmed = query.trim();
                q.setParameter("search", trimmed + "%");
                q.setParameter("searchLower", trimmed.toLowerCase() + "%");
            }

            if (Objects.nonNull(maxResult) && Objects.nonNull(page)) {
                q.setFirstResult(page);
                q.setMaxResults(maxResult);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchDetailsAllEcarts", e);
            return List.of();
        }
    }

    @Override
    public void updateDetailQuantity(UpdateInventaireDetailDTO updateInventaire) {
        TInventaireFamille inventaireFamille = em.find(TInventaireFamille.class, updateInventaire.getId());
        inventaireFamille.setIntNUMBER(updateInventaire.getQuantite());
        inventaireFamille.setDtUPDATED(new Date());
    }

    private String buildQuery(String userId, String sql) {
        if (StringUtils.isNotEmpty(userId)) {
            return sql.replace("{userClose}", String.format(" AND p.`lg_USER_ID`=%s ", userId));
        }
        return sql.replace("{userClose}", "");
    }

    private TInventaire createInventaire(TUser tUser, String dtStart, String dtEnd) {
        TInventaire inventaire = new TInventaire(UUID.randomUUID().toString());
        inventaire.setDtCREATED(new Date());
        inventaire.setDtUPDATED(inventaire.getDtCREATED());
        inventaire.setLgEMPLACEMENTID(tUser.getLgEMPLACEMENTID());
        inventaire.setLgUSERID(tUser);
        inventaire.setStrDESCRIPTION("INVENTAIRE PRODUITS ANNULES DU "
                + LocalDate.parse(dtStart).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " AU "
                + LocalDate.parse(dtEnd).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        inventaire.setStrNAME("INVENTAIRE PRODUITS ANNULES");
        inventaire.setStrSTATUT(Constant.STATUT_ENABLE);
        inventaire.setStrTYPE("emplacement");
        em.persist(inventaire);
        return inventaire;
    }

    @Override
    public void refreshStockLigneInventaire(String inventaireId) {
        String query = "UPDATE t_inventaire_famille f SET f.int_NUMBER_INIT=(SELECT s.int_NUMBER_AVAILABLE FROM t_famille_stock s WHERE s.lg_FAMILLE_STOCK_ID= f.lg_FAMILLE_STOCK_ID ) WHERE f.lg_INVENTAIRE_ID=?1";
        em.createNativeQuery(query).setParameter(1, inventaireId).executeUpdate();
    }

    @Override
    public int create(Set<String> produitIds, String description) {
        if (CollectionUtils.isEmpty(produitIds)) {
            return 0;
        }
        TInventaire oTInventaire = new TInventaire(IdGenerator.getComplexId());
        TUser tUser = sessionHelperService.getCurrentUser();
        TEmplacement emplacement = tUser.getLgEMPLACEMENTID();
        oTInventaire.setStrNAME(description);
        oTInventaire.setStrDESCRIPTION(description);
        oTInventaire.setLgUSERID(tUser);
        oTInventaire.setStrTYPE("emplacement");
        oTInventaire.setStrSTATUT(Constant.STATUT_ENABLE);
        oTInventaire.setDtCREATED(new Date());
        oTInventaire.setDtUPDATED(oTInventaire.getDtCREATED());
        oTInventaire.setLgEMPLACEMENTID(emplacement);

        em.persist(oTInventaire);

        for (String produitId : produitIds) {
            TFamilleStock familleStock = findByProduitId(produitId, emplacement.getLgEMPLACEMENTID());
            saveInventaireFamille(oTInventaire, familleStock);
        }

        return produitIds.size();
    }

    private TFamilleStock findByProduitId(String produitId, String emplId) {
        TypedQuery<TFamilleStock> tp = em.createQuery(
                "SELECT o FROM  TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 AND o.strSTATUT='enable'",
                TFamilleStock.class);
        tp.setMaxResults(1);
        tp.setParameter(1, produitId);
        tp.setParameter(2, emplId);
        return tp.getSingleResult();

    }

    private void saveInventaireFamille(TInventaire oTInventaire, TFamilleStock familleStock) {
        TInventaireFamille inventaireFamille = new TInventaireFamille();
        inventaireFamille.setDtCREATED(oTInventaire.getDtCREATED());
        inventaireFamille.setLgFAMILLEID(familleStock.getLgFAMILLEID());
        inventaireFamille.setBoolINVENTAIRE(Boolean.TRUE);
        inventaireFamille.setLgFAMILLESTOCKID(familleStock);
        inventaireFamille.setStrSTATUT(Constant.STATUT_ENABLE);
        inventaireFamille.setIntNUMBER(familleStock.getIntNUMBERAVAILABLE());
        inventaireFamille.setIntNUMBERINIT(inventaireFamille.getIntNUMBER());
        inventaireFamille.setLgINVENTAIREID(oTInventaire);
        inventaireFamille.setStrUPDATEDID("");
        em.persist(inventaireFamille);
    }
}
