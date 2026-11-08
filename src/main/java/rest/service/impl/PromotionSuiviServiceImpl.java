package rest.service.impl;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.PromotionSuiviService;
import rest.service.promotion.JournalPromotion;
import rest.service.promotion.PromotionAnalyse;
import rest.service.promotion.PromotionLigne;

/**
 * Plan du 06/11, point 3.5 (demande du 07/11) : lecture du journal des promotions (t_promotion_history) et des lignes
 * vendues en promotion (t_preenregistrement_detail.promotion_produit_id). Lecture seule.
 */
@Stateless
public class PromotionSuiviServiceImpl implements PromotionSuiviService {

    private static final Logger LOG = Logger.getLogger(PromotionSuiviServiceImpl.class.getName());
    /** Tri : cle de l'ecran -> expression SQL (liste fermee : rien de l'ecran n'entre tel quel dans la requete). */
    private static final Map<String, String> TRIS = new HashMap<>();

    static {
        TRIS.put("date", "h.dt_PROMOTED_DATE");
        TRIS.put("action", "h.str_ACTION");
        TRIS.put("type", "h.str_TYPE");
        TRIS.put("produit", "h.str_NAME");
        TRIS.put("utilisateur", "utilisateur");
        TRIS.put("promotion", "h.lg_CODE_PROMOTION_ID");
    }

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static String fmt(Object d, String motif) {
        return d instanceof Date ? new SimpleDateFormat(motif).format((Date) d) : "";
    }

    private static Integer entier(Object o) {
        return o instanceof Number ? ((Number) o).intValue() : null;
    }

    @Override
    public JSONObject historique(FiltreHistorique f, String tri, String sens, int start, int limit) {
        JSONArray results = new JSONArray();
        JSONObject json = new JSONObject();
        try {
            StringBuilder where = new StringBuilder(
                    " FROM t_promotion_history h" + " LEFT JOIN t_user u ON u.lg_USER_ID = h.lg_USER_ID WHERE 1 = 1");
            List<Object> p = new ArrayList<>();
            if (f.du != null) {
                p.add(java.sql.Date.valueOf(f.du));
                where.append(" AND h.dt_PROMOTED_DATE >= ?").append(p.size());
            }
            if (f.au != null) {
                p.add(java.sql.Date.valueOf(f.au.plusDays(1)));
                where.append(" AND h.dt_PROMOTED_DATE < ?").append(p.size());
            }
            if (StringUtils.isNotBlank(f.action)) {
                if ("ANCIEN".equals(f.action)) {
                    where.append(" AND (h.str_ACTION IS NULL OR h.str_ACTION = '')");
                } else {
                    p.add(f.action);
                    where.append(" AND h.str_ACTION = ?").append(p.size());
                }
            }
            if (StringUtils.isNotBlank(f.type)) {
                p.add(f.type);
                where.append(" AND h.str_TYPE = ?").append(p.size());
            }
            if (StringUtils.isNotBlank(f.produit)) {
                p.add("%" + f.produit.trim() + "%");
                where.append(" AND (h.str_NAME LIKE ?").append(p.size()).append(" OR h.int_CIP LIKE ?").append(p.size())
                        .append(")");
            }
            if (StringUtils.isNotBlank(f.utilisateur)) {
                p.add(f.utilisateur);
                where.append(" AND h.lg_USER_ID = ?").append(p.size());
            }
            if (f.promotion != null) {
                p.add(f.promotion);
                where.append(" AND h.lg_CODE_PROMOTION_ID = ?").append(p.size());
            }
            Query c = em.createNativeQuery("SELECT COUNT(*)" + where);
            for (int i = 0; i < p.size(); i++) {
                c.setParameter(i + 1, p.get(i));
            }
            long total = ((Number) c.getSingleResult()).longValue();
            String ordre = TRIS.getOrDefault(StringUtils.defaultString(tri).toLowerCase(), "h.dt_PROMOTED_DATE");
            String s = "ASC".equalsIgnoreCase(sens) ? "ASC" : "DESC";
            Query q = em.createNativeQuery("SELECT h.lg_CODE_PROMOTION_HISTORY, h.dt_PROMOTED_DATE, h.str_ACTION,"
                    + " h.lg_CODE_PROMOTION_ID, h.str_TYPE, h.int_CIP, h.str_NAME, h.int_DISCOUNT, h.db_PRICE,"
                    + " h.str_MODE_UG, h.int_ACTIVE_AT, h.int_PACK_NUMBER, h.str_AVANT, h.str_REF_VENTE,"
                    + " TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))) AS utilisateur,"
                    + " h.dt_START_DATE, h.dt_END_DATE, h.lg_FAMILLE_ID" + where + " ORDER BY " + ordre + " " + s
                    + ", h.lg_CODE_PROMOTION_HISTORY " + s);
            for (int i = 0; i < p.size(); i++) {
                q.setParameter(i + 1, p.get(i));
            }
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                String action = r[2] != null ? String.valueOf(r[2]) : "";
                boolean surProduit = StringUtils.isNotBlank((String) r[17]);
                String valeurs = surProduit
                        ? JournalPromotion.valeurs((String) r[4], entier(r[7]),
                                r[8] instanceof Number ? ((Number) r[8]).doubleValue() : null, (String) r[9],
                                entier(r[10]), entier(r[11]))
                        : JournalPromotion.periode((String) r[4], (Date) r[15], (Date) r[16]);
                results.put(new JSONObject().put("id", String.valueOf(r[0])).put("date", fmt(r[1], "dd/MM/yyyy HH:mm"))
                        .put("action", action).put("actionLibelle", JournalPromotion.libelle(action))
                        .put("promotion", String.valueOf(r[3])).put("type", StringUtils.defaultString((String) r[4]))
                        .put("cip", StringUtils.defaultString((String) r[5]))
                        .put("produit", StringUtils.defaultString((String) r[6]))
                        .put("avant", StringUtils.defaultString((String) r[12])).put("apres", valeurs)
                        .put("vente", StringUtils.defaultString((String) r[13])).put("utilisateur",
                                r[14] != null && !String.valueOf(r[14]).isEmpty() ? String.valueOf(r[14]) : ""));
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "historique promotions", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONArray utilisateursHistorique() {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT DISTINCT u.lg_USER_ID,"
                        + " TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))) AS nom"
                        + " FROM t_promotion_history h JOIN t_user u ON u.lg_USER_ID = h.lg_USER_ID ORDER BY nom")
                .getResultList()) {
            a.put(new JSONObject().put("id", String.valueOf(r[0])).put("nom", String.valueOf(r[1])));
        }
        return a;
    }

    private static final String VENTES = " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_VENDEUR_ID"
            + " LEFT JOIN t_promotion_product pp ON pp.lg_PROMOTION_PRODUCT_ID = d.promotion_produit_id"
            + " LEFT JOIN t_promotion pr ON pr.lg_CODE_PROMOTION_ID = pp.lg_CODE_PROMOTION_ID"
            + " WHERE d.promotion_produit_id IS NOT NULL AND p.str_STATUT = 'is_Closed'"
            + " AND COALESCE(p.b_IS_CANCEL, 0) = 0 AND p.int_PRICE > 0"
            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2";

    @Override
    public List<PromotionAnalyse.Ligne> ventes(LocalDate du, LocalDate au, String type, String produit,
            String vendeur) {
        List<PromotionAnalyse.Ligne> l = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT p.dt_UPDATED, p.str_REF,"
                + " TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))),"
                + " f.int_CIP, f.str_NAME, pr.lg_CODE_PROMOTION_ID, pr.dt_START_DATE, pr.dt_END_DATE,"
                + " COALESCE(d.promo_type, pr.str_TYPE), COALESCE(d.promo_mode, pp.str_MODE_UG),"
                + " COALESCE(d.promo_seuil, pp.int_ACTIVE_AT), COALESCE(d.promo_gratuites, pp.int_PACK_NUMBER),"
                + " d.int_QUANTITY, d.int_FREE_PACK_NUMBER, d.promo_prix_avant, d.int_PRICE_UNITAIR, d.int_PRICE"
                + VENTES);
        List<Object> prm = new ArrayList<>();
        prm.add(java.sql.Date.valueOf(du));
        prm.add(java.sql.Date.valueOf(au.plusDays(1)));
        if (StringUtils.isNotBlank(type)) {
            prm.add(type);
            sql.append(" AND COALESCE(d.promo_type, pr.str_TYPE) = ?").append(prm.size());
        }
        if (StringUtils.isNotBlank(produit)) {
            prm.add("%" + produit.trim() + "%");
            sql.append(" AND (f.str_NAME LIKE ?").append(prm.size()).append(" OR f.int_CIP LIKE ?").append(prm.size())
                    .append(")");
        }
        if (StringUtils.isNotBlank(vendeur)) {
            prm.add(vendeur);
            sql.append(" AND p.lg_USER_VENDEUR_ID = ?").append(prm.size());
        }
        sql.append(" ORDER BY p.dt_UPDATED DESC, p.str_REF, f.str_NAME");
        Query q = em.createNativeQuery(sql.toString());
        for (int i = 0; i < prm.size(); i++) {
            q.setParameter(i + 1, prm.get(i));
        }
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            Timestamp t = (Timestamp) r[0];
            String typ = (String) r[8];
            Integer prixAvant = entier(r[14]);
            int pu = entier(r[15]) != null ? entier(r[15]) : 0;
            if (prixAvant == null && PromotionLigne.UNITES_GRATUITES.equals(typ)) {
                prixAvant = pu; // unites gratuites : le prix ne change pas
            }
            String promotion = r[5] != null
                    ? "N° " + r[5] + " — " + JournalPromotion.periode(typ, (Date) r[6], (Date) r[7])
                    : StringUtils.defaultString(typ) + " (produit retiré de la promotion)";
            l.add(new PromotionAnalyse.Ligne(t.toLocalDateTime().toLocalDate(), fmt(t, "HH:mm"),
                    StringUtils.defaultString((String) r[1]), StringUtils.defaultIfBlank((String) r[2], "—"),
                    StringUtils.defaultString((String) r[3]), StringUtils.defaultString((String) r[4]), promotion, typ,
                    (String) r[9], entier(r[10]), entier(r[11]), entier(r[12]) != null ? entier(r[12]) : 0,
                    entier(r[13]) != null ? entier(r[13]) : 0, prixAvant, pu,
                    entier(r[16]) != null ? entier(r[16]) : 0));
        }
        return l;
    }

    @Override
    public JSONArray vendeurs(LocalDate du, LocalDate au) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT DISTINCT u.lg_USER_ID,"
                        + " TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))) AS nom"
                        + VENTES + " AND u.lg_USER_ID IS NOT NULL ORDER BY nom")
                .setParameter(1, java.sql.Date.valueOf(du)).setParameter(2, java.sql.Date.valueOf(au.plusDays(1)))
                .getResultList()) {
            a.put(new JSONObject().put("id", String.valueOf(r[0])).put("nom", String.valueOf(r[1])));
        }
        return a;
    }

    @Override
    public String officine() {
        List<?> r = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1").getResultList();
        return r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0));
    }
}
