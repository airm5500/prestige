package rest.service.impl;

import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TUser;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.InventaireService;
import rest.service.inventaire.dto.DetailInventaireDTO;
import rest.service.inventaire.dto.InventaireDTO;
import rest.service.inventaire.dto.RayonDTO;
import rest.service.inventaire.dto.UpdateInventaireDetailDTO;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class InventaireServiceImpl implements InventaireService {

    private static final Logger LOG = Logger.getLogger(InventaireServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    private static final String INVENTAIRE_QUERY = "INSERT INTO t_inventaire_famille(`lg_INVENTAIRE_ID`,`str_STATUT`,`dt_CREATED`,`bool_INVENTAIRE`,`lg_FAMILLE_ID`,`int_NUMBER`,`int_NUMBER_INIT`,`lg_FAMILLE_STOCK_ID`) "
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
    public List<DetailInventaireDTO> fetchDetails(String idInventaire, String idRayon, Integer page,
            Integer maxResult) {
        try {
            /*
             * String id, String produitName, String produitCip, String produitEan, int produitPrixAchat, int
             * produitPrixUni, int quantiteInitiale, int quantiteSaisie
             */

            TypedQuery<DetailInventaireDTO> q = em.createQuery(
                    "SELECT new rest.service.inventaire.dto.DetailInventaireDTO( o.lgINVENTAIREFAMILLEID,o.lgFAMILLEID.strNAME,o.lgFAMILLEID.intCIP,o.lgFAMILLEID.intPAF,o.lgFAMILLEID.intPRICE,o.intNUMBERINIT,o.intNUMBER ) FROM TInventaireFamille o   WHERE o.lgINVENTAIREID.lgINVENTAIREID=?1 AND  o.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID=?2 ORDER BY o.lgFAMILLEID.strNAME ASC",
                    DetailInventaireDTO.class);
            q.setParameter(1, idInventaire);
            q.setParameter(2, idRayon);
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
}
