package rest.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 09/10 (4) : articles dormants. Produits en stock dont la derniere entree (reception, table t_warehouse)
 * date de plus de N jours et qui n'ont pas ete vendus depuis cette entree. Valeur du stock immobilise au prix d'achat.
 * Lecture seule ; memes lignes pour l'ecran, l'export Excel et l'edition PDF.
 */
@Stateless
public class ArticlesDormantsService {

    public static final int JOURS_DEFAUT = 90;
    private static final int RECHERCHE_MAX = 100;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Criteres de l'ecran ; valeurs absurdes ramenees dans des bornes. */
    public static class Criteres {

        int jours = JOURS_DEFAUT;
        String recherche, rayon, grossiste, famille, tri;

        public Criteres(Integer jours, String recherche, String rayon, String grossiste, String famille, String tri) {
            this.jours = jours == null ? JOURS_DEFAUT : Math.max(1, Math.min(3650, jours));
            this.recherche = StringUtils.left(StringUtils.trimToNull(recherche), RECHERCHE_MAX);
            this.rayon = tout(rayon) ? null : rayon;
            this.grossiste = tout(grossiste) ? null : grossiste;
            this.famille = tout(famille) ? null : famille;
            this.tri = tri;
        }

        private static boolean tout(String v) {
            return StringUtils.isBlank(v) || "ALL".equalsIgnoreCase(v) || "TOUT".equalsIgnoreCase(v);
        }

        public int getJours() {
            return jours;
        }
    }

    /** Une ligne (getters pour l'edition Jasper). */
    public static class Ligne {

        private final String cip, designation, rayon, grossiste, derniereEntree, derniereVente;
        private final Integer stock, prixAchat, prixVente, qteEntree, jours;
        private final Long valeurStock;

        Ligne(Object[] r) {
            SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy");
            cip = (String) r[1];
            designation = (String) r[2];
            rayon = (String) r[3];
            grossiste = (String) r[4];
            stock = entier(r[5]);
            prixAchat = entier(r[6]);
            prixVente = entier(r[7]);
            valeurStock = r[8] == null ? 0L : ((Number) r[8]).longValue();
            derniereEntree = r[9] == null ? null : f.format((Date) r[9]);
            jours = entier(r[10]);
            qteEntree = entier(r[11]);
            derniereVente = r[12] == null ? null : f.format((Date) r[12]);
        }

        private static Integer entier(Object o) {
            return o == null ? null : ((Number) o).intValue();
        }

        public String getCip() {
            return cip;
        }

        public String getDesignation() {
            return designation;
        }

        public String getRayon() {
            return rayon;
        }

        public String getGrossiste() {
            return grossiste;
        }

        public String getDerniereEntree() {
            return derniereEntree;
        }

        public String getDerniereVente() {
            return derniereVente;
        }

        public Integer getStock() {
            return stock;
        }

        public Integer getPrixAchat() {
            return prixAchat;
        }

        public Integer getPrixVente() {
            return prixVente;
        }

        public Integer getQteEntree() {
            return qteEntree;
        }

        public Integer getJours() {
            return jours;
        }

        public Long getValeurStock() {
            return valeurStock;
        }

        JSONObject json() {
            return new JSONObject().put("cip", cip).put("designation", designation).put("rayon", rayon)
                    .put("grossiste", grossiste).put("stock", stock).put("prixAchat", prixAchat)
                    .put("prixVente", prixVente).put("valeurStock", valeurStock)
                    .put("derniereEntree", derniereEntree == null ? JSONObject.NULL : derniereEntree)
                    .put("jours", jours).put("qteEntree", qteEntree == null ? JSONObject.NULL : qteEntree)
                    .put("derniereVente", derniereVente == null ? JSONObject.NULL : derniereVente);
        }
    }

    /* FROM/WHERE commun ; parametres ordinaux contigus (?1 = emplacement, ?2 = jours, puis les filtres). */
    private String corps(Criteres c, List<Object> p, String emplacement) {
        p.add(emplacement);
        p.add(c.jours);
        StringBuilder s = new StringBuilder(" FROM t_famille f"
                + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = ?1 AND s.str_STATUT = 'enable'"
                + " JOIN (SELECT w.lg_FAMILLE_ID, MAX(w.dt_CREATED) derniere FROM t_warehouse w"
                + "       JOIN t_user wu ON wu.lg_USER_ID = w.lg_USER_ID WHERE wu.lg_EMPLACEMENT_ID = ?1"
                + "       GROUP BY w.lg_FAMILLE_ID) e ON e.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
                + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0"
                + " AND e.derniere < CURDATE() - INTERVAL ?2 DAY"
                + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d"
                + "   JOIN t_preenregistrement pv ON pv.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + "   WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND pv.str_STATUT = 'is_Closed' AND pv.b_IS_CANCEL = 0"
                + "   AND pv.dt_UPDATED >= e.derniere)");
        if (c.recherche != null) {
            p.add(c.recherche + "%");
            p.add("%" + c.recherche + "%");
            s.append(" AND (f.int_CIP LIKE ?").append(p.size() - 1).append(" OR f.str_NAME LIKE ?").append(p.size())
                    .append(")");
        }
        if (c.rayon != null) {
            p.add(c.rayon);
            s.append(" AND f.lg_ZONE_GEO_ID = ?").append(p.size());
        }
        if (c.grossiste != null) {
            p.add(c.grossiste);
            s.append(" AND f.lg_GROSSISTE_ID = ?").append(p.size());
        }
        if (c.famille != null) {
            p.add(c.famille);
            s.append(" AND f.lg_FAMILLEARTICLE_ID = ?").append(p.size());
        }
        return s.toString();
    }

    private Query requete(String sql, List<Object> p) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.size(); i++) {
            q.setParameter(i + 1, p.get(i));
        }
        return q;
    }

    private String ordre(Criteres c) {
        if ("jours".equals(c.tri)) {
            return " ORDER BY jours DESC, valeur DESC, f.str_NAME";
        }
        if ("libelle".equals(c.tri)) {
            return " ORDER BY f.str_NAME";
        }
        return " ORDER BY valeur DESC, f.str_NAME";
    }

    /** Lignes ; limit <= 0 = toutes (export, edition). */
    public List<Ligne> lignes(Criteres c, String emplacement, int start, int limit) {
        List<Object> p = new ArrayList<>();
        String sql = "SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, z.str_LIBELLEE, g.str_LIBELLE,"
                + " s.int_NUMBER_AVAILABLE, f.int_PAF, f.int_PRICE,"
                + " CAST(s.int_NUMBER_AVAILABLE AS SIGNED) * IFNULL(f.int_PAF, 0) valeur, e.derniere,"
                + " DATEDIFF(CURDATE(), e.derniere) jours,"
                + " (SELECT SUM(w2.int_NUMBER) FROM t_warehouse w2 WHERE w2.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + "    AND w2.dt_CREATED = e.derniere),"
                + " (SELECT MAX(pv2.dt_UPDATED) FROM t_preenregistrement_detail d2"
                + "    JOIN t_preenregistrement pv2 ON pv2.lg_PREENREGISTREMENT_ID = d2.lg_PREENREGISTREMENT_ID"
                + "    WHERE d2.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND pv2.str_STATUT = 'is_Closed' AND pv2.b_IS_CANCEL = 0)"
                + corps(c, p, emplacement) + ordre(c);
        Query q = requete(sql, p);
        if (limit > 0) {
            q.setFirstResult(Math.max(0, start));
            q.setMaxResults(limit);
        }
        List<Ligne> sortie = new ArrayList<>();
        for (Object o : q.getResultList()) {
            sortie.add(new Ligne((Object[]) o));
        }
        return sortie;
    }

    /** Nombre d'articles, stock total et valeur immobilisee (tous les articles du filtre, pas seulement la page). */
    public long[] totaux(Criteres c, String emplacement) {
        List<Object> p = new ArrayList<>();
        Object[] r = (Object[]) requete("SELECT COUNT(*), IFNULL(SUM(s.int_NUMBER_AVAILABLE), 0),"
                + " IFNULL(SUM(CAST(s.int_NUMBER_AVAILABLE AS SIGNED) * IFNULL(f.int_PAF, 0)), 0)"
                + corps(c, p, emplacement), p).getSingleResult();
        return new long[] { nombre(r[0]), nombre(r[1]), nombre(r[2]) };
    }

    private static long nombre(Object o) {
        return o == null ? 0L : o instanceof BigDecimal ? ((BigDecimal) o).longValue() : ((Number) o).longValue();
    }

    public JSONObject page(Criteres c, String emplacement, int start, int limit) {
        long[] t = totaux(c, emplacement);
        JSONArray data = new JSONArray();
        lignes(c, emplacement, start, Math.max(1, Math.min(limit, 500))).forEach(l -> data.put(l.json()));
        return new JSONObject().put("success", true).put("total", t[0]).put("stockTotal", t[1])
                .put("valeurTotale", t[2]).put("jours", c.jours).put("data", data);
    }
}
