package rest.service.impl;

import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TTypeStockFamille;
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
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.persistence.Query;

/**
 *
 * @author koben
 */
@Stateless
public class InventaireServiceImpl implements InventaireService {

    private static final Logger LOG = Logger.getLogger(InventaireServiceImpl.class.getName());
    @EJB
    private SessionHelperService sessionHelperService;
    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;
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
        // Determine le type d'inventaire : pour un inventaire reserve, la valeur
        // initiale doit provenir du stock reserve (t_type_stock_famille type 2),
        // pas du stock rayon (t_famille_stock.int_NUMBER_AVAILABLE).
        boolean isReserve = false;
        try {
            TInventaire inv = em.find(TInventaire.class, inventaireId);
            isReserve = inv != null && "reserve".equalsIgnoreCase(inv.getStrTYPE());
        } catch (Exception e) {
            LOG.log(Level.WARNING, "refreshStockLigneInventaire: type inventaire indetermine id={0}", inventaireId);
        }

        String query;
        if (isReserve) {
            query = "UPDATE t_inventaire_famille f SET f.int_NUMBER_INIT="
                    + "(SELECT t.int_NUMBER FROM t_type_stock_famille t "
                    + " WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
                    + " AND t.lg_TYPE_STOCK_ID = '2' AND t.str_STATUT = 'enable' "
                    + " AND t.lg_EMPLACEMENT_ID = (SELECT s.lg_EMPLACEMENT_ID FROM t_famille_stock s "
                    + "     WHERE s.lg_FAMILLE_STOCK_ID = f.lg_FAMILLE_STOCK_ID) LIMIT 1) "
                    + "WHERE f.lg_INVENTAIRE_ID=?1 AND f.bool_INVENTAIRE=true";
        } else {
            query = "UPDATE t_inventaire_famille f SET f.int_NUMBER_INIT=(SELECT s.int_NUMBER_AVAILABLE FROM t_famille_stock s WHERE s.lg_FAMILLE_STOCK_ID= f.lg_FAMILLE_STOCK_ID ) WHERE f.lg_INVENTAIRE_ID=?1 AND f.bool_INVENTAIRE=true";
        }
        em.createNativeQuery(query).setParameter(1, inventaireId).executeUpdate();
    }

    @Override
    public int create(Set<String> produitIds, String description) {
        return create(produitIds, description, description);
    }

    @Override
    public int create(Set<String> produitIds, String name, String description) {
        if (CollectionUtils.isEmpty(produitIds)) {
            return 0;
        }
        TInventaire oTInventaire = new TInventaire(IdGenerator.getComplexId());
        TUser tUser = sessionHelperService.getCurrentUser();
        TEmplacement emplacement = tUser.getLgEMPLACEMENTID();
        oTInventaire.setStrNAME(name);
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

    /*
     * cree un nouvel inventaire a partir des lignes en ecart d'un inventaire source (y compris cloture). Les produits
     * sont repris mais le stock initial est RECALCULE depuis le stock courant de l'emplacement, pour ne pas creer
     * d'ecarts artificiels si le stock a evolue depuis. Methode EJB : la creation entete + lignes est atomique
     * (transaction conteneur).
     */
    @Override
    public JSONObject createInventaireFromEcarts(String sourceInventaireId, TUser tUser) {
        JSONObject json = new JSONObject();
        TInventaire source = em.find(TInventaire.class, sourceInventaireId);
        if (source == null) {
            return json.put("success", false).put("count", 0).put("message", "Inventaire source introuvable.");
        }
        TypedQuery<TFamille> q = em.createQuery(
                "SELECT DISTINCT o.lgFAMILLEID FROM TInventaireFamille o WHERE o.lgINVENTAIREID.lgINVENTAIREID = ?1 AND o.boolINVENTAIRE = TRUE AND COALESCE(o.intNUMBER, 0) <> COALESCE(o.intNUMBERINIT, 0)",
                TFamille.class);
        q.setParameter(1, sourceInventaireId);
        List<TFamille> familles = q.getResultList();
        if (familles.isEmpty()) {
            return json.put("success", false).put("count", 0).put("message",
                    "Aucun écart sur l'inventaire source : aucun inventaire créé.");
        }

        TEmplacement emplacement = tUser.getLgEMPLACEMENTID();
        TInventaire nouveau = new TInventaire(IdGenerator.getComplexId());
        String name = "ECARTS " + source.getStrNAME();
        nouveau.setStrNAME(name);
        nouveau.setStrDESCRIPTION("Inventaire créé à partir des écarts de : " + source.getStrNAME());
        nouveau.setLgUSERID(tUser);
        nouveau.setStrTYPE("emplacement");
        nouveau.setStrSTATUT(Constant.STATUT_ENABLE);
        nouveau.setDtCREATED(new Date());
        nouveau.setDtUPDATED(nouveau.getDtCREATED());
        nouveau.setLgEMPLACEMENTID(emplacement);
        em.persist(nouveau);

        int count = 0, ignores = 0;
        for (TFamille famille : familles) {
            try {
                TFamilleStock familleStock = findByProduitId(famille.getLgFAMILLEID(),
                        emplacement.getLgEMPLACEMENTID());
                saveInventaireFamille(nouveau, familleStock);
                count++;
            } catch (Exception e) {
                ignores++;
                LOG.log(Level.WARNING, "createInventaireFromEcarts: produit sans stock actif ignoré={0} : {1}",
                        new Object[] { famille.getLgFAMILLEID(), e.getMessage() });
            }
        }
        String message = count + " ligne(s) créée(s) dans l'inventaire \"" + name + "\""
                + (ignores > 0 ? " ; " + ignores + " produit(s) sans stock actif ignoré(s)" : "");
        return json.put("success", true).put("count", count).put("ignored", ignores)
                .put("inventaireId", nouveau.getLgINVENTAIREID()).put("message", message);
    }

    @Override
    public int createReserveInventaire(Set<String> produitIds, String description) {
        return createReserveInventaire(produitIds, description, description);
    }

    @Override
    public int createReserveInventaire(Set<String> produitIds, String name, String description) {
        if (CollectionUtils.isEmpty(produitIds)) {
            return 0;
        }
        TUser tUser = sessionHelperService.getCurrentUser();
        TEmplacement emplacement = tUser.getLgEMPLACEMENTID();
        String emplId = emplacement.getLgEMPLACEMENTID();

        TInventaire oTInventaire = new TInventaire(IdGenerator.getComplexId());
        oTInventaire.setStrNAME(name);
        oTInventaire.setStrDESCRIPTION(description);
        oTInventaire.setLgUSERID(tUser);
        oTInventaire.setStrTYPE("reserve"); // distingue des inventaires normaux
        oTInventaire.setStrSTATUT(Constant.STATUT_ENABLE);
        oTInventaire.setDtCREATED(new Date());
        oTInventaire.setDtUPDATED(oTInventaire.getDtCREATED());
        oTInventaire.setLgEMPLACEMENTID(emplacement);
        em.persist(oTInventaire);

        int count = 0;
        for (String produitId : produitIds) {
            try {
                TFamilleStock familleStock = findByProduitId(produitId, emplId);
                int stockReserve = findReserveStock(produitId, emplId);
                saveInventaireFamilleWithQte(oTInventaire, familleStock, stockReserve);
                count++;
            } catch (Exception e) {
                LOG.log(Level.WARNING, "createReserveInventaire: impossible de traiter produit={0} : {1}",
                        new Object[] { produitId, e.getMessage() });
            }
        }
        LOG.log(Level.INFO, "createReserveInventaire: {0}/{1} produits, inventaire={2}",
                new Object[] { count, produitIds.size(), oTInventaire.getLgINVENTAIREID() });
        return count;
    }

    /** Retourne le stock reserve (t_type_stock_famille type 2) pour un produit/emplacement. */
    private int findReserveStock(String produitId, String emplId) {
        try {
            Query q = em.createNativeQuery("SELECT t.int_NUMBER FROM t_type_stock_famille t "
                    + "WHERE t.lg_FAMILLE_ID = ?1 AND t.lg_EMPLACEMENT_ID = ?2 "
                    + "AND t.lg_TYPE_STOCK_ID = '2' AND t.str_STATUT = 'enable'");
            q.setParameter(1, produitId);
            q.setParameter(2, emplId);
            q.setMaxResults(1);
            Object result = q.getSingleResult();
            return result == null ? 0 : ((Number) result).intValue();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "findReserveStock: pas de stock reserve pour produit={0} empl={1}",
                    new Object[] { produitId, emplId });
            return 0;
        }
    }

    private void saveInventaireFamilleWithQte(TInventaire oTInventaire, TFamilleStock familleStock, int qte) {
        TInventaireFamille inventaireFamille = new TInventaireFamille();
        inventaireFamille.setDtCREATED(oTInventaire.getDtCREATED());
        inventaireFamille.setLgFAMILLEID(familleStock.getLgFAMILLEID());
        inventaireFamille.setBoolINVENTAIRE(Boolean.TRUE);
        inventaireFamille.setLgFAMILLESTOCKID(familleStock);
        inventaireFamille.setStrSTATUT(Constant.STATUT_ENABLE);
        inventaireFamille.setIntNUMBER(qte);
        inventaireFamille.setIntNUMBERINIT(qte);
        inventaireFamille.setLgINVENTAIREID(oTInventaire);
        inventaireFamille.setStrUPDATEDID("");
        em.persist(inventaireFamille);
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

    @Override
    public JSONObject createInventaireFromCsv(String csvContent, TUser tUser) {
        JSONObject json = new JSONObject();
        if (StringUtils.isBlank(csvContent)) {
            return json.put("success", false).put("count", 0).put("message", "Fichier CSV vide.");
        }
        Set<String> cips = Arrays.stream(csvContent.split("\\r?\\n")).map(String::trim).filter(StringUtils::isNotBlank)
                .map(line -> line.split(";")[0].trim()).filter(StringUtils::isNotBlank)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (cips.isEmpty()) {
            return json.put("success", false).put("count", 0).put("message", "Aucun CIP valide trouvé.");
        }
        StringBuilder cipQuery = new StringBuilder(
                "SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE CAST(f.int_CIP AS CHAR) IN (");
        int idx = 1;
        for (int i = 0; i < cips.size(); i++) {
            cipQuery.append("?").append(i + 1);
            if (i < cips.size() - 1) {
                cipQuery.append(",");
            }
        }
        cipQuery.append(")");
        Query cipNativeQuery = em.createNativeQuery(cipQuery.toString());
        for (String cip : cips) {
            cipNativeQuery.setParameter(idx++, cip);
        }
        List<String> familleIds = cipNativeQuery.getResultList();
        if (familleIds.isEmpty()) {
            return json.put("success", false).put("count", 0).put("message",
                    "Aucun article correspondant aux CIPs importés.");
        }
        TInventaire inventaire = createInventaireFromCsv(tUser, familleIds.size());
        StringBuilder insertQuery = new StringBuilder(
                "INSERT INTO t_inventaire_famille(`lg_INVENTAIRE_ID`,`str_STATUT`,`dt_CREATED`,`bool_INVENTAIRE`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`lg_FAMILLE_STOCK_ID`) ");
        insertQuery.append(
                "SELECT ?1,'enable',NOW(),TRUE,f.lg_FAMILLE_ID,s.int_NUMBER_AVAILABLE,s.int_NUMBER_AVAILABLE,s.lg_FAMILLE_STOCK_ID ");
        insertQuery.append("FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID ");
        insertQuery.append("WHERE f.lg_FAMILLE_ID IN (");
        for (int i = 0; i < familleIds.size(); i++) {
            insertQuery.append("?").append(i + 2);
            if (i < familleIds.size() - 1) {
                insertQuery.append(",");
            }
        }
        insertQuery.append(") AND s.lg_EMPLACEMENT_ID='1'");
        Query insertNativeQuery = em.createNativeQuery(insertQuery.toString()).setParameter(1,
                inventaire.getLgINVENTAIREID());
        idx = 2;
        for (String familleId : familleIds) {
            insertNativeQuery.setParameter(idx++, familleId);
        }
        int inserted = insertNativeQuery.executeUpdate();
        return json.put("success", true).put("count", inserted).put("message", "Inventaire créé avec succès.");
    }

    @Override
    public Set<String> produitIdsFromVentes(List<String> venteIds) {
        if (CollectionUtils.isEmpty(venteIds)) {
            return Set.of();
        }
        TypedQuery<String> q = em.createQuery(
                "SELECT DISTINCT d.lgFAMILLEID.lgFAMILLEID FROM TPreenregistrementDetail d WHERE d.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID IN :ids",
                String.class);
        q.setParameter("ids", venteIds);
        return new LinkedHashSet<>(q.getResultList());
    }

    /*
     * Export Excel des produits d'un inventaire, tous champs : CIP, designation, emplacement, stock machine
     * (int_NUMBER_INIT), stock saisi (int_NUMBER), ecart, prix, valeur d'ecart au prix d'achat, comptage (fait/quand).
     * Lecture seule : utilisable a tout moment, y compris apres cloture.
     */
    @Override
    public byte[] exportInventaireExcel(String inventaireId) throws java.io.IOException {
        TInventaire inventaire = em.find(TInventaire.class, inventaireId);
        String titre = "Produits de l'inventaire " + (inventaire != null
                ? inventaire.getStrNAME() + " du "
                        + new java.text.SimpleDateFormat("dd/MM/yyyy").format(inventaire.getDtCREATED())
                : inventaireId);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em
                .createNativeQuery("SELECT f.int_CIP, f.str_NAME, z.str_CODE, z.str_LIBELLEE,"
                        + " t.int_NUMBER_INIT, t.int_NUMBER, (t.int_NUMBER - t.int_NUMBER_INIT) AS ecart,"
                        + " COALESCE(f.int_PAF,0), COALESCE(f.int_PRICE,0),"
                        + " (t.int_NUMBER - t.int_NUMBER_INIT) * COALESCE(f.int_PAF,0) AS valeurEcart,"
                        + " t.dt_UPDATED, COALESCE(t.bool_INVENTAIRE,0)" + " FROM t_inventaire_famille t"
                        + " JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID"
                        + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                        + " WHERE t.lg_INVENTAIRE_ID = ?1 ORDER BY z.str_CODE ASC, f.str_NAME ASC")
                .setParameter(1, inventaireId).getResultList();
        String[] headers = new String[] { "CIP", "Designation", "Code empl.", "Emplacement", "Stock machine",
                "Stock saisi", "Ecart", "Prix achat", "Prix vente", "Valeur ecart (achat)", "Compte", "Date comptage",
                "Inclus dans l'inventaire" };
        java.text.SimpleDateFormat dtFmt = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm");
        return reportExcelExportService.createExcelReport(titre, headers, rows, (row, r) -> {
            row.createCell(0).setCellValue(r[0] == null ? "" : r[0].toString());
            row.createCell(1).setCellValue(r[1] == null ? "" : r[1].toString());
            row.createCell(2).setCellValue(r[2] == null ? "" : r[2].toString());
            row.createCell(3).setCellValue(r[3] == null ? "" : r[3].toString());
            row.createCell(4).setCellValue(r[4] == null ? 0 : ((Number) r[4]).longValue());
            row.createCell(5).setCellValue(r[5] == null ? 0 : ((Number) r[5]).longValue());
            row.createCell(6).setCellValue(r[6] == null ? 0 : ((Number) r[6]).longValue());
            row.createCell(7).setCellValue(r[7] == null ? 0 : ((Number) r[7]).longValue());
            row.createCell(8).setCellValue(r[8] == null ? 0 : ((Number) r[8]).longValue());
            row.createCell(9).setCellValue(r[9] == null ? 0 : ((Number) r[9]).longValue());
            row.createCell(10).setCellValue(r[10] == null ? "Non" : "Oui");
            row.createCell(11).setCellValue(r[10] == null ? "" : dtFmt.format((Date) r[10]));
            row.createCell(12).setCellValue(r[11] != null && ((Number) r[11]).intValue() != 0 ? "Oui" : "Non");
        });
    }

    private TInventaire createInventaireFromCsv(TUser tUser, int itemCount) {
        TInventaire inventaire = new TInventaire(UUID.randomUUID().toString());
        inventaire.setDtCREATED(new Date());
        inventaire.setDtUPDATED(inventaire.getDtCREATED());
        inventaire.setLgEMPLACEMENTID(tUser.getLgEMPLACEMENTID());
        inventaire.setLgUSERID(tUser);
        inventaire.setStrDESCRIPTION("INVENTAIRE IMPORTE CSV (" + itemCount + " articles)");
        inventaire.setStrNAME("INVENTAIRE CSV");
        inventaire.setStrSTATUT(Constant.STATUT_ENABLE);
        inventaire.setStrTYPE("unitaire");
        em.persist(inventaire);
        return inventaire;
    }

}
