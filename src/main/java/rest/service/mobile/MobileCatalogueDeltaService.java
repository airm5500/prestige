package rest.service.mobile;

import commonTasks.dto.SearchDTO;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import java.sql.Timestamp;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.hibernate.jpa.QueryHints;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * H5 (Prestige Mobile) : changements du catalogue produits depuis un instant donne.
 * <p>
 * Le telephone garde une copie du catalogue (meme contenu que {@code GET v1/vente/search?query=%}). Au lieu de la
 * telecharger en entier a chaque mise a jour (10 000 produits = plusieurs Mo), il ne demande que les produits modifies
 * depuis sa derniere mise a jour, avec l'horloge du SERVEUR (aucun decalage d'heure du telephone).
 * <p>
 * Un produit est « modifie » depuis {@code depuis} (exclu) jusqu'a {@code jusqua} (inclus) si :
 * <ul>
 * <li>{@code t_famille.dt_UPDATED} a change (fiche article, prix, activation / desactivation / suppression REST) ;</li>
 * <li>{@code t_famille_stock.dt_UPDATED} de l'emplacement de l'operateur a change (vente cloturee, ajustement, entree
 * de BL, inventaire, deconditionnement, perimes, retour fournisseur) ;</li>
 * <li>un mouvement de stock {@code HMvtProduit.createdAt} a ete enregistre pour cet emplacement (filet de securite :
 * quelques chemins modifient le stock sans toucher dt_UPDATED, ex. retour depot) ;</li>
 * <li>un changement de prix a ete journalise dans {@code t_mouvementprice} (mouchard des prix).</li>
 * </ul>
 * Chaque produit modifie est renvoye exactement comme la recherche de vente le montrerait ({@code statut: "actif"}), ou
 * avec {@code statut: "supprime"} s'il n'y apparait plus (desactive, supprime, plus de stock pour l'emplacement...) :
 * le telephone le retire alors de sa copie.
 * <p>
 * Dans les bases Prestige, les declencheurs {@code t_famille_before_upd_tr} et {@code t_famille_stock_before_upd_tr}
 * posent {@code dt_UPDATED = NOW()} a CHAQUE modification de ligne (JPA, SQL natif, anciens ecrans) : les deux
 * premieres conditions suffisent alors. Les deux autres sont un filet de securite pour une base ou ces declencheurs
 * manqueraient (la plupart des chemins Java posent dt_UPDATED eux-memes, pas tous). Ce qui echapperait encore (ex.
 * libelle d'un rayon renomme) est rattrape par la verification complete quotidienne faite par le telephone.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.SUPPORTS)
public class MobileCatalogueDeltaService {

    public static final String FORMAT = "yyyy-MM-dd HH:mm:ss";
    public static final int LIMITE_DEFAUT = 500;
    public static final int LIMITE_MAX = 2000;

    public static final String ACTIF = "actif";
    public static final String SUPPRIME = "supprime";

    /** Identifiants des produits modifies dans (?1, ?2] pour l'emplacement ?3. */
    private static final String IDS = "SELECT f.lg_FAMILLE_ID AS id FROM t_famille f"
            + " WHERE f.dt_UPDATED > ?1 AND f.dt_UPDATED <= ?2" + " UNION SELECT s.lg_FAMILLE_ID FROM t_famille_stock s"
            + " WHERE s.dt_UPDATED > ?1 AND s.dt_UPDATED <= ?2 AND s.lg_EMPLACEMENT_ID = ?3"
            + " UNION SELECT h.lg_FAMILLE_ID FROM HMvtProduit h"
            + " WHERE h.createdAt > ?1 AND h.createdAt <= ?2 AND h.lg_EMPLACEMENT_ID = ?3"
            + " UNION SELECT m.lg_FAMILLE_ID FROM t_mouvementprice m"
            + " WHERE m.dt_CREATED > ?1 AND m.dt_CREATED <= ?2 AND m.lg_FAMILLE_ID IS NOT NULL";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Horloge de la base (celle qui date les modifications). */
    public Date maintenant() {
        Object o = em.createNativeQuery("SELECT NOW()").getSingleResult();
        if (o instanceof Date) {
            return new Date(((Date) o).getTime() / 1000 * 1000);
        }
        if (o instanceof java.time.LocalDateTime) {
            return Timestamp.valueOf((java.time.LocalDateTime) o);
        }
        return new Date(System.currentTimeMillis() / 1000 * 1000);
    }

    public static String format(Date d) {
        return new SimpleDateFormat(FORMAT).format(d);
    }

    /** « 2026-10-10 23:14:35 » (ou avec un T) ; null si illisible. */
    public static Date lire(String s) {
        if (StringUtils.isBlank(s)) {
            return null;
        }
        String t = s.trim().replace('T', ' ');
        if (t.length() > 19) {
            t = t.substring(0, 19);
        }
        try {
            SimpleDateFormat f = new SimpleDateFormat(FORMAT);
            f.setLenient(false);
            return f.parse(t);
        } catch (ParseException e) {
            return null;
        }
    }

    /**
     * Page de changements. {@code jusqua} null : maintenant (horloge de la base) ; le telephone repasse la valeur
     * renvoyee ({@code serveurMaintenant}) pour les pages suivantes, ce qui fige l'ensemble pendant la pagination.
     */
    public JSONObject changements(Date depuis, Date jusqua, int start, int limit, String emplacementId) {
        Date fin = jusqua != null ? jusqua : maintenant();
        int lim = limit <= 0 ? LIMITE_DEFAUT : Math.min(limit, LIMITE_MAX);
        int deb = Math.max(start, 0);
        Timestamp d = new Timestamp(depuis.getTime());
        Timestamp f = new Timestamp(fin.getTime());

        Number total = (Number) em.createNativeQuery("SELECT COUNT(*) FROM (" + IDS + ") ids").setParameter(1, d)
                .setParameter(2, f).setParameter(3, emplacementId).getSingleResult();
        @SuppressWarnings("unchecked")
        List<Object> ids = em.createNativeQuery("SELECT ids.id FROM (" + IDS + ") ids ORDER BY ids.id")
                .setParameter(1, d).setParameter(2, f).setParameter(3, emplacementId).setFirstResult(deb)
                .setMaxResults(lim).getResultList();

        List<String> page = new ArrayList<>();
        for (Object o : ids) {
            if (o != null) {
                page.add(o.toString());
            }
        }
        Map<String, SearchDTO> vus = produits(page, emplacementId);
        JSONArray data = new JSONArray();
        for (String id : page) {
            SearchDTO p = vus.get(id);
            if (p != null) {
                data.put(new JSONObject(p).put("statut", ACTIF));
            } else {
                data.put(new JSONObject().put("lgFAMILLEID", id).put("statut", SUPPRIME));
            }
        }
        return new JSONObject().put("success", true).put("depuis", format(depuis)).put("serveurMaintenant", format(fin))
                .put("total", total == null ? 0 : total.longValue()).put("start", deb).put("limit", lim)
                .put("data", data);
    }

    /**
     * Produits de la page tels que la recherche de vente les montre (memes colonnes, memes conditions que
     * SalesServiceImpl.produits : produit actif, stock de l'emplacement, au moins une fiche grossiste, rayon).
     */
    private Map<String, SearchDTO> produits(List<String> ids, String emplacementId) {
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<SearchDTO> cq = cb.createQuery(SearchDTO.class);
        Root<TFamille> root = cq.from(TFamille.class);
        Join<TFamille, TFamilleGrossiste> st = root.join("tFamilleGrossisteCollection", JoinType.INNER);
        Join<TFamille, TFamilleStock> fa = root.join("tFamilleStockCollection", JoinType.INNER);
        cq.select(cb.construct(SearchDTO.class, root.get(TFamille_.lgFAMILLEID), root.get(TFamille_.intCIP),
                root.get(TFamille_.strNAME), root.get("lgZONEGEOID").get("strLIBELLEE"), root.get(TFamille_.intPRICE),
                fa.get(TFamilleStock_.intNUMBERAVAILABLE), root.get(TFamille_.intPAF), fa.get(TFamilleStock_.intNUMBER),
                root.get(TFamille_.boolDECONDITIONNE), root.get(TFamille_.lgFAMILLEPARENTID),
                root.get(TFamille_.codeEanFabriquant))).distinct(true);
        cq.where(cb.equal(root.get(TFamille_.strSTATUT), "enable"),
                cb.equal(fa.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emplacementId),
                root.get(TFamille_.lgFAMILLEID).in(ids));
        TypedQuery<SearchDTO> q = em.createQuery(cq);
        q.setHint(QueryHints.HINT_CACHEABLE, false);
        Map<String, SearchDTO> out = new LinkedHashMap<>();
        for (SearchDTO p : q.getResultList()) {
            out.putIfAbsent(p.getLgFAMILLEID(), p);
        }
        return out;
    }
}
