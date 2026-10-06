package rest.service.impl;

import commonTasks.dto.ProduitCodeGeoDTO;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import rest.service.ProduitsCodeGeoService;

/**
 * PRODUITS PAR CODE GEO (plan d'octobre, section 6) : ou ranger, ou trouver. Code geo du rayon, code geo de la reserve,
 * stock du rayon et de la reserve de l'emplacement de l'utilisateur, colisage. Trie par code geo. Lecture seule.
 */
@Stateless
public class ProduitsCodeGeoServiceImpl implements ProduitsCodeGeoService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String FROM = " FROM t_famille f LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
            + " LEFT JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = :emp"
            + " LEFT JOIN t_type_stock_famille r ON r.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND r.lg_TYPE_STOCK_ID = '2'"
            + "   AND r.lg_EMPLACEMENT_ID = :emp";

    private String where(Filtre f) {
        StringBuilder w = new StringBuilder(" WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0");
        if (StringUtils.isNotBlank(f.zoneId) && !"ALL".equals(f.zoneId)) {
            w.append(" AND f.lg_ZONE_GEO_ID = :zone");
        }
        if (StringUtils.isNotBlank(f.codeGeo)) {
            w.append(" AND f.str_CODE_GEO_ARTICLE LIKE :geo");
        }
        if (StringUtils.isNotBlank(f.codeGeoReserve)) {
            w.append(" AND f.str_CODE_GEO_ARTICLE_RESERVE LIKE :geor");
        }
        if ("RAYON".equals(f.sansCode)) {
            w.append(" AND COALESCE(f.str_CODE_GEO_ARTICLE, '') = ''");
        } else if ("RESERVE".equals(f.sansCode)) {
            w.append(" AND COALESCE(f.str_CODE_GEO_ARTICLE_RESERVE, '') = ''");
        }
        if (StringUtils.isNotBlank(f.recherche)) {
            w.append(" AND (f.str_NAME LIKE :q OR f.int_CIP LIKE :q OR f.int_EAN13 LIKE :q)");
        }
        if (f.enStock) {
            w.append(" AND (COALESCE(s.int_NUMBER_AVAILABLE, 0) > 0 OR COALESCE(r.int_NUMBER, 0) > 0)");
        }
        return w.toString();
    }

    private void lier(Query q, Filtre f) {
        q.setParameter("emp", f.emplacementId);
        if (StringUtils.isNotBlank(f.zoneId) && !"ALL".equals(f.zoneId)) {
            q.setParameter("zone", f.zoneId);
        }
        if (StringUtils.isNotBlank(f.codeGeo)) {
            q.setParameter("geo", f.codeGeo.trim() + "%");
        }
        if (StringUtils.isNotBlank(f.codeGeoReserve)) {
            q.setParameter("geor", f.codeGeoReserve.trim() + "%");
        }
        if (StringUtils.isNotBlank(f.recherche)) {
            q.setParameter("q", f.recherche.trim() + "%");
        }
    }

    @Override
    public long compter(Filtre f) {
        Query q = em.createNativeQuery("SELECT COUNT(*)" + FROM + where(f));
        lier(q, f);
        return ((Number) q.getSingleResult()).longValue();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ProduitCodeGeoDTO> lister(Filtre f, int start, int limit) {
        Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID AS id, f.int_CIP AS cip, f.str_NAME AS libelle,"
                + " z.str_LIBELLEE AS emplacement, f.str_CODE_GEO_ARTICLE AS geo, f.str_CODE_GEO_ARTICLE_RESERVE AS geor,"
                + " s.int_NUMBER_AVAILABLE AS stock, r.int_NUMBER AS reserve, f.int_COLISAGE AS colisage" + FROM
                + where(f)
                + " ORDER BY COALESCE(NULLIF(f.str_CODE_GEO_ARTICLE, ''), 'ZZZZZZ'), z.str_LIBELLEE, f.str_NAME",
                Tuple.class);
        lier(q, f);
        if (limit > 0) {
            q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
        }
        List<ProduitCodeGeoDTO> sortie = new ArrayList<>();
        for (Tuple t : (List<Tuple>) q.getResultList()) {
            ProduitCodeGeoDTO d = new ProduitCodeGeoDTO();
            d.setId((String) t.get("id"));
            d.setCip(StringUtils.defaultString((String) t.get("cip")));
            d.setLibelle(StringUtils.trimToEmpty((String) t.get("libelle")));
            d.setEmplacement(StringUtils.trimToEmpty((String) t.get("emplacement")));
            d.setCodeGeo(StringUtils.defaultString((String) t.get("geo")));
            d.setCodeGeoReserve(StringUtils.defaultString((String) t.get("geor")));
            d.setStockRayon(t.get("stock") == null ? 0 : ((Number) t.get("stock")).intValue());
            d.setStockReserve(t.get("reserve") == null ? 0 : ((Number) t.get("reserve")).intValue());
            d.setColisage(t.get("colisage") == null ? null : ((Number) t.get("colisage")).intValue());
            sortie.add(d);
        }
        return sortie;
    }
}
