package rest.service.impl;

import dal.GammeProduit;
import dal.Laboratoire;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraison_;
import dal.TCodeActe;
import dal.TCodeGestion;
import dal.TCodeTva;
import dal.TFabriquant;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TFamillearticle;
import dal.TGrossiste;
import dal.TIndicateurReapprovisionnement;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaire_;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrement_;
import dal.TPrivilege;
import dal.TRemise;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TZoneGeographique;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ProductStateService;
import rest.service.SearchProduitServcie;
import toolkits.utils.date;
import util.Constant;
import util.DateConverter;
import util.DateUtil;

/**
 *
 * @author koben
 */
@Stateless
public class SearchProduitServcieImpl implements SearchProduitServcie {

    private static final Logger LOG = Logger.getLogger(SearchProduitServcieImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private ProductStateService productStateService;

    @Override
    public JSONObject fetchProduits(List<TPrivilege> usersPrivileges, TUser user, String produitId, String search,
            String diciId, String type, int limit, int start) {
        boolean checkExpirationdate = checkDatePeremption();
        JSONObject data = new JSONObject();
        Object[] objs = getPrivilegeProductByUser(user.getLgUSERID());
        boolean canceledBtn = Constant.hasAuthorityByName(usersPrivileges, Constant.ACTION_DESACTIVE_PRODUIT);
        JSONArray arrayObj = new JSONArray();
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        if (StringUtils.isNotEmpty(produitId)) {
            TFamille famille = this.em.find(TFamille.class, produitId);
            int stock = getStock(famille.getLgFAMILLEID(), empl);
            Object[] tuple = new Object[] { famille, stock, famille.getGamme(), famille.getLaboratoire(),
                    famille.getLgFAMILLEARTICLEID(), famille.getLgGROSSISTEID(), famille.getLgZONEGEOID(),
                    famille.getLgTYPEETIQUETTEID(), famille.getLgCODEACTEID(), famille.getLgCODEGESTIONID(),
                    famille.getLgFABRIQUANTID(), famille.getLgINDICATEURREAPPROVISIONNEMENTID(),
                    famille.getLgREMISEID(), famille.getLgCODETVAID() };
            arrayObj.put(buildProduitData(canceledBtn, tuple, objs, user, empl, checkExpirationdate));
            data.put("total", 1);
        } else {
            getAllLite(false, search, diciId, empl, type, true, start, limit).forEach(
                    tuple -> arrayObj.put(buildProduitDataLite(canceledBtn, tuple, objs, empl, checkExpirationdate)));
            data.put("total", getAllCount(search, diciId, empl, type, true));
        }
        data.put("results", arrayObj);
        return data;
    }

    @Override
    public JSONObject fetchOrderProduits(TUser user, String produitId, String search, int limit, int start) {
        JSONArray arrayObj = new JSONArray();
        JSONObject data = new JSONObject();
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        if (StringUtils.isNotEmpty(produitId)) {
            TFamille famille = this.em.find(TFamille.class, produitId);
            int stock = getStock(famille.getLgFAMILLEID(), empl);
            Object[] tuple = new Object[] { famille, stock, famille.getGamme(), famille.getLaboratoire(),
                    famille.getLgFAMILLEARTICLEID(), famille.getLgGROSSISTEID(), famille.getLgZONEGEOID(),
                    famille.getLgTYPEETIQUETTEID(), famille.getLgCODEACTEID(), famille.getLgCODEGESTIONID(),
                    famille.getLgFABRIQUANTID(), famille.getLgINDICATEURREAPPROVISIONNEMENTID(),
                    famille.getLgREMISEID(), famille.getLgCODETVAID() };
            arrayObj.put(buildProduitData(tuple, empl));
            data.put("total", 1);
        } else {
            long count = getAllCount(search, null, empl, null, false);
            if (count == 0) {
                JSONObject jSONObject = new JSONObject();
                jSONObject.put("lg_FAMILLE_ID", "0");
                jSONObject.put("CIP", "0");
                jSONObject.put("int_CIP", 0);
                jSONObject.put("str_DESCRIPTION", "Ajouter un nouvel article");
                jSONObject.put("str_DESCRIPTION_PLUS", "Ajouter un nouvel article");
                arrayObj.put(jSONObject);
            } else {
                getAll(false, search, null, empl, null, false, start, limit)
                        .forEach(tuple -> arrayObj.put(buildProduitData(tuple, empl)));
            }

            data.put("total", count);
        }
        data.put("data", arrayObj);
        return data;
    }

    private boolean checkDatePeremption() {
        try {
            return Integer.parseInt(
                    em.getReference(TParameters.class, "KEY_ACTIVATE_PEREMPTION_DATE").getStrVALUE().trim()) == 1;
        } catch (Exception e) {
            return false;
        }
    }

    public Object[] getPrivilegeProductByUser(String userId) {
        try {
            return (Object[]) em.createNativeQuery("call proc_getprivilege_user_for_product(?)").setParameter(1, userId)
                    .getSingleResult();

        } catch (Exception e) {
            return null;
        }
    }

    private List<Object[]> getAll(boolean all, String search, String diciId, String emplacementId, String type,
            boolean checkDeconditionne, int start, int limit) {
        try {
            StringBuilder sql = new StringBuilder();
            sql.append("SELECT DISTINCT {t.*}, fs.int_NUMBER_AVAILABLE as stock, ");
            sql.append("{gamme.*}, {labo.*}, {farticle.*}, {grossiste.*}, {zone.*}, ");
            sql.append("{etiquette.*}, {acte.*}, {gestion.*}, {fabriquant.*}, ");
            sql.append("{indicateur.*}, {remise.*}, {tva.*} ");
            sql.append("FROM t_famille t ");
            sql.append("INNER JOIN t_famille_stock fs ON t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID ");
            sql.append("INNER JOIN t_famille_grossiste fg ON t.lg_FAMILLE_ID = fg.lg_FAMILLE_ID ");
            sql.append("LEFT JOIN gamme_produit gamme ON t.gamme_id = gamme.id ");
            sql.append("LEFT JOIN laboratoire labo ON t.laboratoire_id = labo.id ");
            sql.append(
                    "LEFT JOIN t_famillearticle farticle ON t.lg_FAMILLEARTICLE_ID = farticle.lg_FAMILLEARTICLE_ID ");
            sql.append("LEFT JOIN t_grossiste grossiste ON t.lg_GROSSISTE_ID = grossiste.lg_GROSSISTE_ID ");
            sql.append("LEFT JOIN t_zone_geographique zone ON t.lg_ZONE_GEO_ID = zone.lg_ZONE_GEO_ID ");
            sql.append("LEFT JOIN t_typeetiquette etiquette ON t.lg_TYPEETIQUETTE_ID = etiquette.lg_TYPEETIQUETTE_ID ");
            sql.append("LEFT JOIN t_code_acte acte ON t.lg_CODE_ACTE_ID = acte.lg_CODE_ACTE_ID ");
            sql.append("LEFT JOIN t_code_gestion gestion ON t.lg_CODE_GESTION_ID = gestion.lg_CODE_GESTION_ID ");
            sql.append("LEFT JOIN t_fabriquant fabriquant ON t.lg_FABRIQUANT_ID = fabriquant.lg_FABRIQUANT_ID ");
            sql.append(
                    "LEFT JOIN t_indicateur_reapprovisionnement indicateur ON t.lg_INDICATEUR_REAPPROVISIONNEMENT_ID = indicateur.lg_INDICATEUR_REAPPROVISIONNEMENT_ID ");
            sql.append("LEFT JOIN t_remise remise ON t.lg_REMISE_ID = remise.lg_REMISE_ID ");
            sql.append("LEFT JOIN t_code_tva tva ON t.lg_CODE_TVA_ID = tva.lg_CODE_TVA_ID ");
            if (StringUtils.isNotEmpty(diciId)) {
                sql.append("INNER JOIN t_famille_dci fd ON t.lg_FAMILLE_ID = fd.lg_FAMILLE_ID ");
            }
            sql.append("WHERE t.str_STATUT = 'enable' AND fs.lg_EMPLACEMENT_ID = :emplacementId ");

            // Apply centralized filters
            applyFilters(sql, search, diciId, type, checkDeconditionne);

            sql.append(" ORDER BY t.str_DESCRIPTION ASC");

            org.hibernate.query.NativeQuery q = (org.hibernate.query.NativeQuery) em.createNativeQuery(sql.toString())
                    .unwrap(org.hibernate.query.NativeQuery.class).addEntity("t", TFamille.class)
                    .addScalar("stock", org.hibernate.type.IntegerType.INSTANCE)
                    .addEntity("gamme", dal.GammeProduit.class).addEntity("labo", dal.Laboratoire.class)
                    .addEntity("farticle", dal.TFamillearticle.class).addEntity("grossiste", dal.TGrossiste.class)
                    .addEntity("zone", dal.TZoneGeographique.class).addEntity("etiquette", dal.TTypeetiquette.class)
                    .addEntity("acte", dal.TCodeActe.class).addEntity("gestion", dal.TCodeGestion.class)
                    .addEntity("fabriquant", dal.TFabriquant.class)
                    .addEntity("indicateur", dal.TIndicateurReapprovisionnement.class)
                    .addEntity("remise", dal.TRemise.class).addEntity("tva", dal.TCodeTva.class);

            // Set centralized filter parameters
            setFilterParameters(q, emplacementId, search, diciId);

            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /**
     * Lite version of getAll - returns only essential data: TFamille, stock, and TZoneGeographique Tuple structure:
     * [0]=TFamille, [1]=stock(Integer), [2]=TZoneGeographique Use this for better performance when full relationship
     * data is not needed
     */
    private List<Object[]> getAllLite(boolean all, String search, String diciId, String emplacementId, String type,
            boolean checkDeconditionne, int start, int limit) {
        try {
            StringBuilder sql = new StringBuilder();
            sql.append("SELECT DISTINCT {t.*}, fs.int_NUMBER_AVAILABLE as stock, {zone.*} ");
            sql.append("FROM t_famille t ");
            sql.append("INNER JOIN t_famille_stock fs ON t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID ");
            sql.append("INNER JOIN t_famille_grossiste fg ON t.lg_FAMILLE_ID = fg.lg_FAMILLE_ID ");
            sql.append("LEFT JOIN t_zone_geographique zone ON t.lg_ZONE_GEO_ID = zone.lg_ZONE_GEO_ID ");
            if (StringUtils.isNotEmpty(diciId)) {
                sql.append("INNER JOIN t_famille_dci fd ON t.lg_FAMILLE_ID = fd.lg_FAMILLE_ID ");
            }
            sql.append("WHERE t.str_STATUT = 'enable' AND fs.lg_EMPLACEMENT_ID = :emplacementId ");

            // Apply centralized filters
            applyFilters(sql, search, diciId, type, checkDeconditionne);

            sql.append(" ORDER BY t.str_DESCRIPTION ASC");

            org.hibernate.query.NativeQuery q = (org.hibernate.query.NativeQuery) em.createNativeQuery(sql.toString())
                    .unwrap(org.hibernate.query.NativeQuery.class).addEntity("t", TFamille.class)
                    .addScalar("stock", org.hibernate.type.IntegerType.INSTANCE)
                    .addEntity("zone", dal.TZoneGeographique.class);

            // Set centralized filter parameters
            setFilterParameters(q, emplacementId, search, diciId);

            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private long getAllCount(String search, String diciId, String emplacementId, String type,
            boolean checkDeconditionne) {
        try {
            StringBuilder sql = new StringBuilder();
            sql.append("SELECT COUNT(DISTINCT t.lg_FAMILLE_ID) FROM t_famille t ");
            sql.append("INNER JOIN t_famille_stock fs ON t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID ");
            sql.append("INNER JOIN t_famille_grossiste fg ON t.lg_FAMILLE_ID = fg.lg_FAMILLE_ID ");
            if (StringUtils.isNotEmpty(diciId)) {
                sql.append("INNER JOIN t_famille_dci fd ON t.lg_FAMILLE_ID = fd.lg_FAMILLE_ID ");
            }
            sql.append("WHERE t.str_STATUT = 'enable' AND fs.lg_EMPLACEMENT_ID = :emplacementId ");

            // Apply centralized filters
            applyFilters(sql, search, diciId, type, checkDeconditionne);

            Query q = em.createNativeQuery(sql.toString());

            // Set centralized filter parameters
            setFilterParameters(q, emplacementId, search, diciId);

            return ((Number) q.getSingleResult()).longValue();

        } catch (Exception e) {

            LOG.log(Level.SEVERE, null, e);
            return 0l;
        }
    }

    /**
     * Centralized method to apply common filters to product queries
     */
    private void applyFilters(StringBuilder sql, String search, String diciId, String type,
            boolean checkDeconditionne) {
        if (StringUtils.isNotEmpty(search)) {
            sql.append(
                    "AND (t.int_CIP LIKE :search  OR fg.str_CODE_ARTICLE LIKE :search OR t.int_EAN13 LIKE :search OR t.str_NAME LIKE :search OR t.code_ean_fabriquant LIKE :search ) ");
        }
        if (!checkDeconditionne) {
            sql.append("AND t.bool_DECONDITIONNE = 0 ");
        }
        if (StringUtils.isNotEmpty(diciId)) {
            sql.append("AND fd.lg_DCI_ID = :diciId ");
        }
        if (StringUtils.isNotEmpty(type)) {
            switch (type) {
            case "DECONDITIONNE":
                sql.append("AND t.bool_DECONDITIONNE = 1 AND t.bool_DECONDITIONNE_EXIST = 1 ");
                break;
            case "DECONDITION":
                sql.append("AND t.bool_DECONDITIONNE = 0 AND t.bool_DECONDITIONNE_EXIST = 1 ");
                break;
            case "SANSEMPLACEMENT":
                sql.append("AND t.lg_ZONE_GEO_ID = '1' ");
                break;
            default:
                break;
            }
        }
    }

    /**
     * Centralized method to set filter parameters on queries
     */
    private void setFilterParameters(Query q, String emplacementId, String search, String diciId) {
        q.setParameter("emplacementId", emplacementId);
        if (StringUtils.isNotEmpty(search)) {
            q.setParameter("search", search + "%");
        }
        if (StringUtils.isNotEmpty(diciId)) {
            q.setParameter("diciId", diciId);
        }
    }

    /**
     * Lite version for simple product data (used with getAllLite) Tuple: [0]=TFamille, [1]=stock, [2]=TZoneGeographique
     */
    private JSONObject buildProduitDataLite(Object[] tuple, String empl) {
        JSONObject json = new JSONObject();
        TFamille t = (TFamille) tuple[0];
        int stock = ((Number) tuple[1]).intValue();
        TZoneGeographique zone = tuple.length > 2 ? (TZoneGeographique) tuple[2] : null;

        json.put("int_NUMBER", stock);
        json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
        json.put("int_NUMBER_AVAILABLE", stock);
        json.put("str_NAME", t.getStrNAME());
        json.put("STATUS", t.getIntORERSTATUS());
        json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
        json.put("int_PRICE", t.getIntPRICE());
        json.put("int_EAN13", t.getIntEAN13());
        json.put("int_CIP", t.getIntCIP());
        json.put("CIP", t.getIntCIP());
        json.put("int_PAF", t.getIntPAF());
        json.put("int_PAT", t.getIntPAT());
        if (zone != null && zone.getStrLIBELLEE() != null) {
            json.put("lg_ZONE_GEO_ID", zone.getStrLIBELLEE());
        } else {
            json.put("lg_ZONE_GEO_ID", "");
        }
        json.put("codeEanFabriquant", t.getCodeEanFabriquant());
        return json;
    }

    /**
     * Original version for backward compatibility (delegates to lite version)
     */
    private JSONObject buildProduitData(Object[] tuple, String empl) {
        return buildProduitDataLite(tuple, empl);
    }

    /**
     * Complete lite version for detailed product data (used with getAllLite) Tuple: [0]=TFamille, [1]=stock,
     * [2]=TZoneGeographique Uses lazy loading only for critical relationships (grossiste, familleArticle) Skips
     * optional relationships for better performance
     */
    private JSONObject buildProduitDataLite(boolean canceledAction, Object[] tuple, Object[] objArray, String empl,
            boolean checkExpirationdate) {
        JSONObject json = new JSONObject();
        try {
            TFamille t = (TFamille) tuple[0];
            int stock = ((Number) tuple[1]).intValue();
            TZoneGeographique zone = tuple.length > 2 ? (TZoneGeographique) tuple[2] : null;

            json.put("ACTION_DESACTIVE_PRODUIT", canceledAction);
            json.put("BTNDELETE", Boolean.valueOf(objArray[1].toString()));
            json.put("P_BT_UPDATE", Boolean.valueOf(objArray[2].toString()));
            json.put("P_UPDATE_PAF", Boolean.valueOf(objArray[3].toString()));
            json.put("P_UPDATE_PRIXVENTE", Boolean.valueOf(objArray[4].toString()));
            json.put("P_UPDATE_CODETABLEAU", Boolean.valueOf(objArray[5].toString()));
            json.put("P_UPDATE_CODEREMISE", Boolean.valueOf(objArray[6].toString()));
            json.put("P_UPDATE_CIP", Boolean.valueOf(objArray[7].toString()));
            json.put("P_UPDATE_DESIGNATION", Boolean.valueOf(objArray[8].toString()));
            json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
            json.put("scheduled", t.isScheduled());
            json.put("cmu_price", 0);
            json.put("codeEanFabriquant", t.getCodeEanFabriquant());

            json.put("str_NAME", t.getStrNAME());
            json.put("STATUS", t.getIntORERSTATUS());
            json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
            json.put("int_PRICE", t.getIntPRICE());

            json.put("int_CIP", t.getIntCIP());
            json.put("int_PAF", t.getIntPAF());
            json.put("int_PAT", t.getIntPAT());
            json.put("int_QTE_REAPPROVISIONNEMENT",
                    (t.getIntQTEREAPPROVISIONNEMENT() != null ? t.getIntQTEREAPPROVISIONNEMENT() : 0));
            json.put("int_STOCK_REAPROVISONEMENT", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
            json.put("int_EAN13", t.getIntEAN13());
            json.put("int_S", t.getIntS());
            json.put("int_T", t.getIntT());
            json.put("int_SEUIL_MIN", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));

            // Use zone from tuple (no lazy loading)
            if (zone != null && zone.getStrLIBELLEE() != null) {
                json.put("lg_ZONE_GEO_ID", zone.getStrLIBELLEE());
            } else {
                json.put("lg_ZONE_GEO_ID", "");
            }

            if (t.getBoolDECONDITIONNE() == 0 && t.getBoolDECONDITIONNEEXIST() == 1) {
                Object[] deconditionnement = getDecondionneParent(t.getLgFAMILLEID());
                if (deconditionnement != null) {
                    json.put("lg_FAMILLE_DECONDITION_ID", deconditionnement[0]);
                    json.put("str_DESCRIPTION_DECONDITION", deconditionnement[1]);
                    json.put("int_NUMBER_AVAILABLE_DECONDITION", deconditionnement[2]);
                }
            }
            json.put("int_NUMBERDETAIL", t.getIntNUMBERDETAIL());

            json.put("int_PRICE_TIPS", t.getIntPRICETIPS());
            json.put("int_TAUX_MARQUE", t.getIntTAUXMARQUE());

            // Optional relationship fields - skipped in lite version
            // lg_TYPEETIQUETTE_ID, lg_CODE_ACTE_ID, lg_CODE_GESTION_ID,
            // lg_FABRIQUANT_ID, lg_INDICATEUR_REAPPROVISIONNEMENT_ID skipped
            json.put("str_CODE_TAUX_REMBOURSEMENT", t.getStrCODETAUXREMBOURSEMENT());
            json.put("str_CODE_REMISE", t.getStrCODEREMISE());
            // lg_REMISE_ID skipped in lite version

            json.put("bool_DECONDITIONNE", t.getBoolDECONDITIONNE());
            json.put("bool_DECONDITIONNE_EXIST", t.getBoolDECONDITIONNEEXIST());

            // lg_CODE_TVA_ID skipped in lite version
            json.put("int_NUMBER", stock);
            json.put("int_NUMBER_AVAILABLE", stock);
            json.put("str_STATUT", t.getStrSTATUT());

            json.put("bool_RESERVE", t.getBoolRESERVE());

            json.put("dt_CREATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getDtCREATED()));
            json.put("dt_UPDATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getDtUPDATED()));

            json.put("lg_EMPLACEMENT_ID", empl);
            if (checkExpirationdate) {
                json.put("checkExpirationdate", t.getBoolCHECKEXPIRATIONDATE());
            } else {
                json.put("checkExpirationdate", false);
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        TFamille t = (TFamille) tuple[0];

        json.put("produitState", new JSONObject(productStateService.getEtatProduit(t.getLgFAMILLEID())));

        return json;
    }

    private JSONObject buildProduitData(boolean canceledAction, Object[] tuple, Object[] objArray, TUser user,
            String empl, boolean checkExpirationdate) {
        JSONObject json = new JSONObject();
        try {
            TFamille t = (TFamille) tuple[0];
            int stock = ((Number) tuple[1]).intValue();
            GammeProduit gamme = tuple.length > 2 ? (GammeProduit) tuple[2] : null;
            Laboratoire labo = tuple.length > 3 ? (Laboratoire) tuple[3] : null;
            TFamillearticle familleArticle = tuple.length > 4 ? (TFamillearticle) tuple[4] : null;
            TGrossiste grossiste = tuple.length > 5 ? (TGrossiste) tuple[5] : null;
            TZoneGeographique zone = tuple.length > 6 ? (TZoneGeographique) tuple[6] : null;
            TTypeetiquette etiquette = tuple.length > 7 ? (TTypeetiquette) tuple[7] : null;
            TCodeActe codeActe = tuple.length > 8 ? (TCodeActe) tuple[8] : null;
            TCodeGestion codeGestion = tuple.length > 9 ? (TCodeGestion) tuple[9] : null;
            TFabriquant fabriquant = tuple.length > 10 ? (TFabriquant) tuple[10] : null;
            TIndicateurReapprovisionnement indicateur = tuple.length > 11 ? (TIndicateurReapprovisionnement) tuple[11]
                    : null;
            TRemise remise = tuple.length > 12 ? (TRemise) tuple[12] : null;
            TCodeTva codeTva = tuple.length > 13 ? (TCodeTva) tuple[13] : null;

            json.put("ACTION_DESACTIVE_PRODUIT", canceledAction);
            json.put("BTNDELETE", Boolean.valueOf(objArray[1].toString()));
            json.put("P_BT_UPDATE", Boolean.valueOf(objArray[2].toString()));
            json.put("P_UPDATE_PAF", Boolean.valueOf(objArray[3].toString()));
            json.put("P_UPDATE_PRIXVENTE", Boolean.valueOf(objArray[4].toString()));
            json.put("P_UPDATE_CODETABLEAU", Boolean.valueOf(objArray[5].toString()));
            json.put("P_UPDATE_CODEREMISE", Boolean.valueOf(objArray[6].toString()));
            json.put("P_UPDATE_CIP", Boolean.valueOf(objArray[7].toString()));
            json.put("P_UPDATE_DESIGNATION", Boolean.valueOf(objArray[8].toString()));
            json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
            json.put("scheduled", t.isScheduled());
            json.put("codeEanFabriquant", t.getCodeEanFabriquant());

            try {
                if (gamme != null) {
                    json.put("gammeId", gamme.getId());
                }
            } catch (Exception e) {
            }
            try {
                if (labo != null) {
                    json.put("laboratoireId", labo.getId());
                }
            } catch (Exception e) {
            }
            json.put("dt_Peremtion",
                    (t.getDtPEREMPTION() != null ? date.formatterShort.format(t.getDtPEREMPTION()) : ""));
            json.put("dtPEREMPTION", (t.getDtPEREMPTION() != null ? date.formatterMysqlShort.format(t.getDtPEREMPTION())
                    : LocalDate.now().toString()));
            if (familleArticle != null) {
                json.put("lg_FAMILLEARTICLE_ID", familleArticle.getStrLIBELLE());
            }
            json.put("str_NAME", t.getStrNAME());
            json.put("STATUS", t.getIntORERSTATUS());
            json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
            json.put("int_PRICE", t.getIntPRICE());
            if (grossiste != null) {
                json.put("lg_GROSSISTE_ID", grossiste.getStrLIBELLE());
            }
            json.put("int_CIP", t.getIntCIP());
            json.put("int_PAF", t.getIntPAF());
            json.put("int_PAT", t.getIntPAT());
            json.put("int_QTE_REAPPROVISIONNEMENT",
                    (t.getIntQTEREAPPROVISIONNEMENT() != null ? t.getIntQTEREAPPROVISIONNEMENT() : 0));
            json.put("int_STOCK_REAPROVISONEMENT", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
            json.put("int_EAN13", t.getIntEAN13());
            json.put("int_S", t.getIntS());
            json.put("int_T", t.getIntT());
            json.put("int_SEUIL_MIN", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
            if (zone != null && zone.getStrLIBELLEE() != null) {
                json.put("lg_ZONE_GEO_ID", zone.getStrLIBELLEE());
            } else {
                json.put("lg_ZONE_GEO_ID", "");
            }
            if (t.getBoolDECONDITIONNE() == 0 && t.getBoolDECONDITIONNEEXIST() == 1) {
                Object[] deconditionnement = getDecondionneParent(t.getLgFAMILLEID());
                if (deconditionnement != null) {
                    json.put("lg_FAMILLE_DECONDITION_ID", deconditionnement[0]);
                    json.put("str_DESCRIPTION_DECONDITION", deconditionnement[1]);
                    json.put("int_NUMBER_AVAILABLE_DECONDITION", deconditionnement[2]);
                }
            }
            json.put("int_NUMBERDETAIL", t.getIntNUMBERDETAIL());

            json.put("int_PRICE_TIPS", t.getIntPRICETIPS());
            json.put("int_TAUX_MARQUE", t.getIntTAUXMARQUE());
            try {
                if (etiquette != null) {
                    json.put("lg_TYPEETIQUETTE_ID", etiquette.getStrDESCRIPTION());
                }
            } catch (Exception e) {
            }
            try {
                if (codeActe != null) {
                    json.put("lg_CODE_ACTE_ID", codeActe.getStrLIBELLEE());
                }
            } catch (Exception e) {
            }
            try {
                if (codeGestion != null) {
                    json.put("lg_CODE_GESTION_ID", codeGestion.getStrCODEBAREME());
                }
            } catch (Exception e) {
            }
            try {
                if (fabriquant != null) {
                    json.put("lg_FABRIQUANT_ID", fabriquant.getStrNAME());
                }
            } catch (Exception e) {

            }
            try {
                if (indicateur != null) {
                    json.put("lg_INDICATEUR_REAPPROVISIONNEMENT_ID", indicateur.getStrLIBELLEINDICATEUR());
                }
            } catch (Exception e) {

            }
            json.put("str_CODE_TAUX_REMBOURSEMENT", t.getStrCODETAUXREMBOURSEMENT());

            try {
                json.put("str_CODE_REMISE", t.getStrCODEREMISE());
                if (remise != null) {
                    json.put("lg_REMISE_ID", remise.getStrNAME());
                }
            } catch (Exception e) {

            }

            json.put("bool_DECONDITIONNE", t.getBoolDECONDITIONNE());
            json.put("bool_DECONDITIONNE_EXIST", t.getBoolDECONDITIONNEEXIST());

            try {
                if (codeTva != null) {
                    json.put("lg_CODE_TVA_ID", codeTva.getStrNAME());
                }
            } catch (Exception e) {

            }

            json.put("int_NUMBER", stock);
            json.put("int_NUMBER_AVAILABLE", stock);
            json.put("str_STATUT", t.getStrSTATUT());

            json.put("bool_RESERVE", t.getBoolRESERVE());

            if (t.getBoolRESERVE() && "1".equals(empl)) {
                json.put("int_SEUIL_RESERVE", t.getIntSEUILRESERVE());
                Integer reserveStock = getReserveStockNumber(t.getLgFAMILLEID(), empl);
                if (reserveStock != null) {
                    json.put("int_STOCK_RESERVE", reserveStock);
                }
            }

            json.put("dt_CREATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getDtCREATED()));
            json.put("dt_UPDATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getDtUPDATED()));

            json.put("lg_EMPLACEMENT_ID", empl);
            if (checkExpirationdate) {
                json.put("checkExpirationdate", t.getBoolCHECKEXPIRATIONDATE());
            } else {
                json.put("checkExpirationdate", false);
            }
            try {

                json.put("dt_LAST_INVENTAIRE", dateDerniereInventare(t.getLgFAMILLEID(), user));
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }

            try {

                String dateVente = dateDerniereVente(t.getLgFAMILLEID(), user);

                json.put("dt_LAST_VENTE", dateVente);

            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }

            try {

                String dateEntree = dateEntree(t.getLgFAMILLEID());

                json.put("dt_LAST_ENTREE", dateEntree);

            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        TFamille t = (TFamille) tuple[0];
        java.util.Date deliveryDate = findLatestDeliveryDate(t.getLgFAMILLEID());

        if (deliveryDate != null) {
            json.put("dt_DATE_LIVRAISON", DateConverter.convertDateToDD_MM_YYYY(deliveryDate));
        }

        json.put("produitState", new JSONObject(productStateService.getEtatProduit(t.getLgFAMILLEID())));

        return json;
    }

    /**
     * Returns deconditioning parent product data: [lg_FAMILLE_ID, str_DESCRIPTION, int_NUMBER_AVAILABLE]
     */
    public Object[] getDecondionneParent(String produitId) {
        try {
            String sql = "SELECT f.lg_FAMILLE_ID, f.str_DESCRIPTION, fs.int_NUMBER_AVAILABLE "
                    + "FROM t_famille_stock fs " + "INNER JOIN t_famille f ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
                    + "WHERE f.lg_FAMILLE_PARENT_ID = ?1 ";

            Query q = em.createNativeQuery(sql);
            q.setParameter(1, produitId);
            q.setMaxResults(1);

            return (Object[]) q.getSingleResult();

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Returns the latest delivery date for a given product
     */
    private java.util.Date findLatestDeliveryDate(String familleId) {
        try {
            String sql = "SELECT bl.dt_DATE_LIVRAISON " + "FROM t_bon_livraison_detail bld "
                    + "INNER JOIN t_bon_livraison bl ON bld.lg_BON_LIVRAISON_ID = bl.lg_BON_LIVRAISON_ID "
                    + "WHERE bld.lg_FAMILLE_ID = ?1 AND bl.str_STATUT = 'is_Closed' "
                    + "ORDER BY bl.dt_DATE_LIVRAISON DESC ";

            Query q = em.createNativeQuery(sql);
            q.setParameter(1, familleId);
            q.setMaxResults(1);

            return (java.util.Date) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.INFO, "Delivery date not found for famille: " + familleId);
            return null;
        }
    }

    public Integer getStock(String lgFAMILLEID, String lgEMPLACEMENT) {
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            cq.select(root.get(TFamilleStock_.intNUMBERAVAILABLE));
            cq.where(cb.and(cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lgFAMILLEID)),
                    cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEMPLACEMENT));
            Query q = em.createQuery(cq);
            q.setMaxResults(1);
            return (Integer) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return null;
    }

    private String dateEntree(String lgFAMILLEID) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);

            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            Join<TBonLivraisonDetail, TBonLivraison> j = root.join("lgBONLIVRAISONID", JoinType.INNER);
            Join<TBonLivraisonDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(j.get(TBonLivraison_.strSTATUT), Constant.STATUT_IS_CLOSED));
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, j.get(TBonLivraison_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(j.get(TBonLivraison_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);
            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();

        }
        return date;
    }

    public String dateDerniereVente(String lgFAMILLEID, TUser user) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TPreenregistrement_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TPreenregistrement_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return date;
    }

    public String dateDerniereInventare(String lgFAMILLEID, TUser user) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jp = root.join("lgINVENTAIREID", JoinType.INNER);
            Join<TInventaireFamille, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()));

            predicate = cb.and(predicate, cb.equal(jp.get(TInventaire_.strSTATUT), "is_Closed"));

            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TInventaire_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TInventaire_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
        }
        return date;
    }

    /**
     * Returns the reserve stock number for a product
     */
    private Integer getReserveStockNumber(String produitId, String empl) {
        try {
            String sql = "SELECT tsf.int_NUMBER " + "FROM t_type_stock_famille tsf "
                    + "WHERE tsf.lg_TYPE_STOCK_ID = '2' " + "AND tsf.lg_FAMILLE_ID = ?1 "
                    + "AND tsf.lg_EMPLACEMENT_ID LIKE ?2 " + "LIMIT 1";

            Query q = em.createNativeQuery(sql);
            q.setParameter(1, produitId);
            q.setParameter(2, empl);
            q.setMaxResults(1);

            Object result = q.getSingleResult();
            return result != null ? ((Number) result).intValue() : null;

        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject fetchOne(List<TPrivilege> usersPrivileges, TUser user, String produitId) {
        boolean checkExpirationdate = checkDatePeremption();
        JSONObject data = new JSONObject();
        Object[] objs = getPrivilegeProductByUser(user.getLgUSERID());
        boolean canceledBtn = Constant.hasAuthorityByName(usersPrivileges, Constant.ACTION_DESACTIVE_PRODUIT);

        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

        TFamille famille = this.em.find(TFamille.class, produitId);
        int stock = getStock(famille.getLgFAMILLEID(), empl);
        Object[] tuple = new Object[] { famille, stock, famille.getGamme(), famille.getLaboratoire(),
                famille.getLgFAMILLEARTICLEID(), famille.getLgGROSSISTEID(), famille.getLgZONEGEOID(),
                famille.getLgTYPEETIQUETTEID(), famille.getLgCODEACTEID(), famille.getLgCODEGESTIONID(),
                famille.getLgFABRIQUANTID(), famille.getLgINDICATEURREAPPROVISIONNEMENTID(), famille.getLgREMISEID(),
                famille.getLgCODETVAID() };

        return data.put("data", buildProduitData(canceledBtn, tuple, objs, user, empl, checkExpirationdate));
    }
}
