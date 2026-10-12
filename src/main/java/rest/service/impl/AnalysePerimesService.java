package rest.service.impl;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Analyse des perimes (besoins du 11/10, point 2) sur les saisies de perimes (t_warehouse, statut « delete ») d'une
 * periode (date de saisie) : emplacements les plus touches, produits qui se periment le plus, evolution par mois et
 * ratio valeur perimee / chiffre d'affaires de la periode.
 * <p>
 * Valeur perimee = quantite x prix de vente du produit (comme la liste) ; valeur d'achat = quantite x prix d'achat.
 * Chiffre d'affaires = ventes cloturees, non annulees, de montant positif (meme perimetre que la frequentation).
 */
@Stateless
public class AnalysePerimesService {

    static final String PERIMES = " FROM t_warehouse w JOIN t_famille f ON f.lg_FAMILLE_ID = w.lg_FAMILLE_ID"
            + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
            + " WHERE w.str_STATUT = 'delete' AND w.dt_CREATED >= ?1 AND w.dt_CREATED < ?2";
    static final String VENTES = " FROM t_preenregistrement p WHERE p.dt_CREATED >= ?1 AND p.dt_CREATED < ?2"
            + " AND p.int_PRICE > 0 AND p.b_IS_CANCEL = 0 AND p.str_STATUT = 'is_Closed'";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, LocalDate debut, LocalDate fin) {
        return em.createNativeQuery(sql).setParameter(1, debut.toString()).setParameter(2, fin.plusDays(1).toString())
                .getResultList();
    }

    static long n(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    /** Pourcentage, deux decimales (un ratio de perimes est souvent inferieur a 1 %). */
    static double pourcent(long valeur, long total) {
        return total == 0 ? 0 : Math.round(valeur * 10000.0 / total) / 100.0;
    }

    public JSONObject analyser(LocalDate debut, LocalDate fin) {
        Object[] t = lignes("SELECT COUNT(*), COUNT(DISTINCT w.lg_FAMILLE_ID), SUM(w.int_NUMBER),"
                + " SUM(w.int_NUMBER * f.int_PRICE), SUM(w.int_NUMBER * f.int_PAF)" + PERIMES, debut, fin).get(0);
        long ca = n(lignes("SELECT SUM(p.int_PRICE), COUNT(*)" + VENTES, debut, fin).get(0)[0]);
        long valeur = n(t[3]), achat = n(t[4]);
        JSONObject total = new JSONObject().put("saisies", n(t[0])).put("produits", n(t[1])).put("quantite", n(t[2]))
                .put("valeur", valeur).put("valeurAchat", achat).put("ca", ca).put("ratio", pourcent(valeur, ca));

        JSONArray zones = new JSONArray();
        for (Object[] l : lignes("SELECT IFNULL(z.str_LIBELLEE, '(sans emplacement)'), COUNT(*),"
                + " COUNT(DISTINCT w.lg_FAMILLE_ID), SUM(w.int_NUMBER), SUM(w.int_NUMBER * f.int_PRICE),"
                + " SUM(w.int_NUMBER * f.int_PAF)" + PERIMES + " GROUP BY z.lg_ZONE_GEO_ID, z.str_LIBELLEE"
                + " ORDER BY SUM(w.int_NUMBER * f.int_PRICE) DESC", debut, fin)) {
            zones.put(new JSONObject().put("libelle", l[0]).put("saisies", n(l[1])).put("produits", n(l[2]))
                    .put("quantite", n(l[3])).put("valeur", n(l[4])).put("valeurAchat", n(l[5]))
                    .put("part", pourcent(n(l[4]), valeur)));
        }

        JSONArray produits = new JSONArray();
        for (Object[] l : lignes(
                "SELECT f.int_CIP, f.str_NAME, IFNULL(z.str_LIBELLEE, ''), COUNT(*), SUM(w.int_NUMBER),"
                        + " SUM(w.int_NUMBER * f.int_PRICE), SUM(w.int_NUMBER * f.int_PAF)" + PERIMES
                        + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, z.str_LIBELLEE"
                        + " ORDER BY SUM(w.int_NUMBER * f.int_PRICE) DESC, COUNT(*) DESC LIMIT 50",
                debut, fin)) {
            produits.put(new JSONObject().put("cip", l[0]).put("libelle", l[1]).put("emplacement", l[2])
                    .put("fois", n(l[3])).put("quantite", n(l[4])).put("valeur", n(l[5])).put("valeurAchat", n(l[6]))
                    .put("part", pourcent(n(l[5]), valeur)));
        }

        Map<String, long[]> mois = new LinkedHashMap<>();
        for (Object[] l : lignes("SELECT DATE_FORMAT(p.dt_CREATED, '%Y-%m'), SUM(p.int_PRICE)" + VENTES
                + " GROUP BY DATE_FORMAT(p.dt_CREATED, '%Y-%m') ORDER BY 1", debut, fin)) {
            mois.computeIfAbsent((String) l[0], k -> new long[2])[1] = n(l[1]);
        }
        for (Object[] l : lignes("SELECT DATE_FORMAT(w.dt_CREATED, '%Y-%m'), SUM(w.int_NUMBER * f.int_PRICE)" + PERIMES
                + " GROUP BY DATE_FORMAT(w.dt_CREATED, '%Y-%m')", debut, fin)) {
            mois.computeIfAbsent((String) l[0], k -> new long[2])[0] = n(l[1]);
        }
        JSONArray parMois = new JSONArray();
        mois.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .forEach(e -> parMois.put(new JSONObject().put("mois", e.getKey()).put("valeur", e.getValue()[0])
                        .put("ca", e.getValue()[1]).put("ratio", pourcent(e.getValue()[0], e.getValue()[1]))));

        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("total", total).put("zones", zones).put("produits", produits).put("mois", parMois);
    }
}
