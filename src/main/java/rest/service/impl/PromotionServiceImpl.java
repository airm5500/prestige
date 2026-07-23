package rest.service.impl;

import dal.TFamille;
import dal.TPromotion;
import dal.TPromotionHistory;
import dal.TPromotionProduct;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.PromotionService;
import toolkits.parameters.commonparameter;

/**
 * Ecrans Promotions / Historique de promotions. Le prix promotionnel est calcule comme la vente le consomme
 * (bll.preenregistrement.addPreenregistrementDetail) : REMISE = prix remise en pourcentage, PRIX SPECIAL = prix saisi,
 * UNITES GRATUITES = prix inchange avec pack gratuit a partir d'un seuil ; le produit est marque blPROMOTED et la
 * promotion reste active tant que sa date de fin n'est pas depassee.
 */
@Stateless
public class PromotionServiceImpl implements PromotionService {

    private static final Logger LOG = Logger.getLogger(PromotionServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;
    private static final String TYPE_REMISE = "REMISE";
    private static final String TYPE_PRIX_SPECIAL = "PRIX SPECIAL";
    private static final String TYPE_UNITES_GRATUITES = "UNITES GRATUITES";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private String fmt(Date date) {
        return date != null ? new SimpleDateFormat("dd/MM/yyyy").format(date) : "";
    }

    private Date parse(String value) throws java.text.ParseException {
        return new SimpleDateFormat("yyyy-MM-dd").parse(value.trim());
    }

    private boolean typeValide(String type) {
        return TYPE_REMISE.equals(type) || TYPE_PRIX_SPECIAL.equals(type) || TYPE_UNITES_GRATUITES.equals(type);
    }

    /** Active tant que la date de fin n'est pas depassee (meme regle que la vente : isActivePromotion >= 0). */
    private boolean estActive(Date fin) {
        return fin != null && !fin.before(truncate(new Date()));
    }

    private Date truncate(Date date) {
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTime();
    }

    @Override
    public JSONObject listPromotions(String search, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String like = "%" + StringUtils.defaultString(search).trim() + "%";
            long total = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM t_promotion p WHERE p.str_TYPE LIKE ?1")
                    .setParameter(1, like).getSingleResult()).longValue();
            Query q = em.createNativeQuery("SELECT p.lg_CODE_PROMOTION_ID, p.str_TYPE, p.dt_START_DATE, p.dt_END_DATE,"
                    + " (SELECT COUNT(*) FROM t_promotion_product pp"
                    + "   WHERE pp.lg_CODE_PROMOTION_ID = p.lg_CODE_PROMOTION_ID) AS nb"
                    + " FROM t_promotion p WHERE p.str_TYPE LIKE ?1"
                    + " ORDER BY p.dt_END_DATE DESC, p.lg_CODE_PROMOTION_ID DESC").setParameter(1, like);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                results.put(new JSONObject().put("lg_CODE_PROMOTION_ID", String.valueOf(r[0]))
                        .put("str_TYPE", r[1] != null ? r[1] : "").put("dt_START_DATE", fmt((Date) r[2]))
                        .put("dt_END_DATE", fmt((Date) r[3])).put("bl_ACTIVE", estActive((Date) r[3]))
                        .put("int_NUMBER_PRODUCT", ((Number) r[4]).intValue()));
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listPromotions", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject createPromotion(String type, String dtStart, String dtEnd) {
        JSONObject json = new JSONObject();
        try {
            if (!typeValide(type)) {
                return json.put("success", FAILED).put("errors", "Type de promotion invalide");
            }
            if (StringUtils.isBlank(dtStart) || StringUtils.isBlank(dtEnd)) {
                return json.put("success", FAILED).put("errors", "Les dates de début et de fin sont obligatoires");
            }
            Date debut = parse(dtStart), fin = parse(dtEnd);
            if (fin.before(debut)) {
                return json.put("success", FAILED).put("errors", "La date de fin doit être après la date de début");
            }
            TPromotion promotion = new TPromotion();
            promotion.setStrTYPE(type);
            promotion.setDtSTARTDATE(debut);
            promotion.setDtENDDATE(fin);
            em.persist(promotion);
            return json.put("success", SUCCESS).put("errors", "Promotion créée avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "createPromotion", e);
            return json.put("success", FAILED).put("errors", "Impossible de créer la promotion");
        }
    }

    @Override
    public JSONObject updatePromotion(int promotionId, String type, String dtStart, String dtEnd) {
        JSONObject json = new JSONObject();
        try {
            TPromotion promotion = em.find(TPromotion.class, promotionId);
            if (promotion == null) {
                return json.put("success", FAILED).put("errors", "Promotion introuvable");
            }
            if (StringUtils.isNotBlank(type) && !type.equals(promotion.getStrTYPE())) {
                long produits = ((Number) em
                        .createNativeQuery("SELECT COUNT(*) FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ?1")
                        .setParameter(1, promotionId).getSingleResult()).longValue();
                if (produits > 0) {
                    return json.put("success", FAILED).put("errors",
                            "Le type ne peut plus changer : la promotion contient déjà " + produits
                                    + " produit(s) dont le prix a été calculé avec ce type");
                }
                if (!typeValide(type)) {
                    return json.put("success", FAILED).put("errors", "Type de promotion invalide");
                }
                promotion.setStrTYPE(type);
            }
            if (StringUtils.isNotBlank(dtStart)) {
                promotion.setDtSTARTDATE(parse(dtStart));
            }
            if (StringUtils.isNotBlank(dtEnd)) {
                promotion.setDtENDDATE(parse(dtEnd));
            }
            if (promotion.getDtENDDATE().before(promotion.getDtSTARTDATE())) {
                return json.put("success", FAILED).put("errors", "La date de fin doit être après la date de début");
            }
            em.merge(promotion);
            return json.put("success", SUCCESS).put("errors", "Promotion modifiée avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updatePromotion", e);
            return json.put("success", FAILED).put("errors", "Impossible de modifier la promotion");
        }
    }

    @Override
    public JSONObject cloturerPromotion(int promotionId) {
        JSONObject json = new JSONObject();
        try {
            TPromotion promotion = em.find(TPromotion.class, promotionId);
            if (promotion == null) {
                return json.put("success", FAILED).put("errors", "Promotion introuvable");
            }
            Calendar hier = Calendar.getInstance();
            hier.add(Calendar.DAY_OF_MONTH, -1);
            promotion.setDtENDDATE(truncate(hier.getTime()));
            em.merge(promotion);
            // Retrait du drapeau promotion sur tous les produits de cette promotion
            int produits = em.createNativeQuery("UPDATE t_famille f JOIN t_promotion_product pp"
                    + " ON pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID SET f.bl_PROMOTED = 0"
                    + " WHERE pp.lg_CODE_PROMOTION_ID = ?1").setParameter(1, promotionId).executeUpdate();
            return json.put("success", SUCCESS).put("errors",
                    "Promotion clôturée : " + produits + " produit(s) sorti(s) de promotion");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "cloturerPromotion", e);
            return json.put("success", FAILED).put("errors", "Impossible de clôturer la promotion");
        }
    }

    @Override
    public JSONObject listProduits(int promotionId, String search, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String like = StringUtils.defaultString(search).trim() + "%";
            String where = " FROM t_promotion_product pp JOIN t_famille f ON f.lg_FAMILLE_ID = pp.lg_FAMILLE_ID"
                    + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
                    + " WHERE pp.lg_CODE_PROMOTION_ID = ?1 AND (f.str_NAME LIKE ?2 OR f.int_CIP LIKE ?2)";
            long total = ((Number) em.createNativeQuery("SELECT COUNT(*)" + where).setParameter(1, promotionId)
                    .setParameter(2, like).getSingleResult()).longValue();
            Query q = em
                    .createNativeQuery("SELECT pp.lg_PROMOTION_PRODUCT_ID, f.lg_FAMILLE_ID, g.str_LIBELLE,"
                            + " f.str_NAME, f.str_DESCRIPTION, f.int_CIP, f.int_PRICE, pp.int_DISCOUNT, pp.bl_MODE,"
                            + " pp.db_PRICE, pp.int_PACK_NUMBER, pp.int_ACTIVE_AT" + where + " ORDER BY f.str_NAME ASC")
                    .setParameter(1, promotionId).setParameter(2, like);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                results.put(new JSONObject().put("lg_PROMOTION_PRODUCT_ID", String.valueOf(r[0]))
                        .put("lg_FAMILLE_ID", String.valueOf(r[1])).put("lg_GROSSISTE_ID", r[2] != null ? r[2] : "")
                        .put("str_NAME", r[3] != null ? r[3] : "").put("str_DESCRIPTION", r[4] != null ? r[4] : "")
                        .put("int_CIP", r[5] != null ? r[5] : "")
                        .put("int_PRICE", r[6] != null ? ((Number) r[6]).doubleValue() : 0)
                        .put("int_ORIGINAL_PRICE", r[6] != null ? ((Number) r[6]).doubleValue() : 0)
                        .put("int_DISCOUNT", r[7] != null ? String.valueOf(r[7]) : "")
                        .put("bl_MODE", r[8] != null && ((Number) r[8]).intValue() != 0)
                        .put("int_PROMOTION_PRICE", r[9] != null ? ((Number) r[9]).doubleValue() : 0)
                        .put("int_PACK_NUMBER", r[10] != null ? ((Number) r[10]).intValue() : 0)
                        .put("int_ACTIVE_AT", r[11] != null ? ((Number) r[11]).intValue() : 0));
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listProduits promotion", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject addProduit(int promotionId, String familleId, int discount, double promoPrice, int packNumber,
            int activeAt) {
        JSONObject json = new JSONObject();
        try {
            TPromotion promotion = em.find(TPromotion.class, promotionId);
            if (promotion == null) {
                return json.put("success", FAILED).put("errors", "Promotion introuvable");
            }
            TFamille famille = em.find(TFamille.class, familleId);
            if (famille == null) {
                return json.put("success", FAILED).put("errors", "Produit introuvable");
            }
            String type = StringUtils.defaultString(promotion.getStrTYPE());
            double prixPromo;
            switch (type) {
            case TYPE_REMISE:
                if (discount <= 0 || discount >= 100) {
                    return json.put("success", FAILED).put("errors", "La remise doit être entre 1 et 99 %");
                }
                prixPromo = Math.round(famille.getIntPRICE() * (100 - discount) / 100.0);
                break;
            case TYPE_PRIX_SPECIAL:
                if (promoPrice <= 0) {
                    return json.put("success", FAILED).put("errors", "Le prix promotionnel doit être supérieur à 0");
                }
                prixPromo = promoPrice;
                break;
            case TYPE_UNITES_GRATUITES:
                if (packNumber <= 0 || activeAt <= 0) {
                    return json.put("success", FAILED).put("errors",
                            "Le nombre d'unités gratuites et le seuil de déclenchement doivent être supérieurs à 0");
                }
                prixPromo = famille.getIntPRICE();
                break;
            default:
                return json.put("success", FAILED).put("errors", "Type de promotion invalide");
            }

            // Deja dans cette promotion : on met a jour la ligne au lieu de la dupliquer
            List<TPromotionProduct> existants = em
                    .createQuery("SELECT t FROM TPromotionProduct t WHERE t.lgCODEPROMOTIONID.lgCODEPROMOTIONID = ?1"
                            + " AND t.lgFAMILLEID.lgFAMILLEID = ?2", TPromotionProduct.class)
                    .setParameter(1, promotionId).setParameter(2, familleId).getResultList();
            TPromotionProduct produit = existants.isEmpty() ? new TPromotionProduct() : existants.get(0);
            produit.setLgCODEPROMOTIONID(promotion);
            produit.setLgFAMILLEID(famille);
            produit.setIntDISCOUNT(discount);
            produit.setBlMODE(TYPE_REMISE.equals(type));
            produit.setIntPACKNUMBER(packNumber);
            produit.setIntACTIVEAT(activeAt);
            produit.setDbPRICE(prixPromo);
            produit.setDtPROMOTEDDATE(new Date());
            if (existants.isEmpty()) {
                em.persist(produit);
            } else {
                em.merge(produit);
            }

            // Le produit est marque comme promu : la vente appliquera le prix/pack promotionnel
            famille.setBlPROMOTED(Boolean.TRUE);
            em.merge(famille);

            // Trace dans l'historique des promotions
            TPromotionHistory histo = new TPromotionHistory();
            histo.setLgCODEPROMOTIONID(promotionId);
            histo.setIntCIP(famille.getIntCIP());
            histo.setLgFAMILLEID(famille.getLgFAMILLEID());
            histo.setStrNAME(famille.getStrNAME());
            histo.setDtPROMOTEDDATE(new Date());
            histo.setDtSTARTDATE(promotion.getDtSTARTDATE());
            histo.setDtENDDATE(promotion.getDtENDDATE());
            histo.setStrTYPE(type);
            histo.setIntDISCOUNT(discount);
            histo.setBlMODE(TYPE_REMISE.equals(type));
            histo.setIntPACKNUMBER(packNumber);
            histo.setIntACTIVEAT(activeAt);
            histo.setDbPRICE(prixPromo);
            em.persist(histo);

            return json.put("success", SUCCESS).put("errors",
                    "Produit '" + famille.getStrNAME() + "' ajouté à la promotion");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "addProduit promotion", e);
            return json.put("success", FAILED).put("errors", "Impossible d'ajouter le produit à la promotion");
        }
    }

    @Override
    public JSONObject removeProduit(int promotionProductId) {
        JSONObject json = new JSONObject();
        try {
            TPromotionProduct produit = em.find(TPromotionProduct.class, promotionProductId);
            if (produit == null) {
                return json.put("success", FAILED).put("errors", "Produit introuvable dans la promotion");
            }
            TFamille famille = produit.getLgFAMILLEID();
            em.remove(produit);
            if (famille != null) {
                famille.setBlPROMOTED(Boolean.FALSE);
                em.merge(famille);
            }
            return json.put("success", SUCCESS).put("errors", "Produit retiré de la promotion");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "removeProduit promotion", e);
            return json.put("success", FAILED).put("errors", "Impossible de retirer le produit de la promotion");
        }
    }

    @Override
    public JSONObject listHistorique(String search, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String like = "%" + StringUtils.defaultString(search).trim() + "%";
            String where = " FROM t_promotion_history h WHERE (h.str_NAME LIKE ?1 OR h.int_CIP LIKE ?1"
                    + " OR h.str_TYPE LIKE ?1)";
            long total = ((Number) em.createNativeQuery("SELECT COUNT(*)" + where).setParameter(1, like)
                    .getSingleResult()).longValue();
            Query q = em.createNativeQuery("SELECT h.lg_CODE_PROMOTION_HISTORY, h.lg_CODE_PROMOTION_ID, h.int_CIP,"
                    + " h.lg_FAMILLE_ID, h.str_NAME, h.str_TYPE, h.int_DISCOUNT, h.bl_MODE, h.db_PRICE,"
                    + " h.int_PACK_NUMBER, h.int_ACTIVE_AT, h.dt_START_DATE, h.dt_END_DATE, h.dt_PROMOTED_DATE,"
                    + " (SELECT COUNT(*) FROM t_promotion_history h2 WHERE h2.lg_FAMILLE_ID = h.lg_FAMILLE_ID)"
                    + " AS int_COUNT" + where + " ORDER BY h.dt_PROMOTED_DATE DESC, h.lg_CODE_PROMOTION_HISTORY DESC")
                    .setParameter(1, like);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                results.put(new JSONObject().put("lg_CODE_PROMOTION_HISTORY", String.valueOf(r[0]))
                        .put("lg_CODE_PROMOTION_ID", String.valueOf(r[1])).put("int_CIP", r[2] != null ? r[2] : "")
                        .put("lg_FAMILLE_ID", r[3] != null ? r[3] : "").put("str_NAME", r[4] != null ? r[4] : "")
                        .put("str_TYPE", r[5] != null ? r[5] : "")
                        .put("int_DISCOUNT", r[6] != null ? String.valueOf(r[6]) : "")
                        .put("bl_MODE", r[7] != null && ((Number) r[7]).intValue() != 0 ? "Oui" : "Non")
                        .put("db_PROMOTION_PRICE", r[8] != null ? String.valueOf(((Number) r[8]).doubleValue()) : "")
                        .put("int_PACK_NUMBER", r[9] != null ? String.valueOf(r[9]) : "")
                        .put("int_ACTIVE_AT", r[10] != null ? String.valueOf(r[10]) : "")
                        .put("dt_START_DATE", fmt((Date) r[11])).put("dt_END_DATE", fmt((Date) r[12]))
                        .put("dt_PROMOTED_DATE", fmt((Date) r[13])).put("int_COUNT", ((Number) r[14]).intValue()));
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listHistorique promotions", e);
            return json.put("total", 0).put("results", results);
        }
    }
}
