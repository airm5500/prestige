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
 * Retours du 13/10 (point 10) : onglet « Analyse » de la liste des avoirs (produits dus aux clients).
 * <p>
 * Ventes de la periode (date de la vente) cloturees, non annulees, qui ont eu un avoir : encore ouvert (b_IS_AVOIR) ou
 * deja cloture (b_HAS_AVOIR). Quantite due d'une ligne : int_AVOIR tant que l'avoir est ouvert, int_AVOIR_INITIAL une
 * fois cloture (la cloture remet int_AVOIR a 0 apres l'avoir recopie). Valeur = quantite due x prix unitaire de vente.
 * Lecture seule.
 */
@Stateless
public class AnalyseAvoirsService {

    static final String VENTES = " FROM t_preenregistrement p WHERE p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2"
            + " AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0";
    static final String AVOIRS = VENTES + " AND (p.b_IS_AVOIR = 1 OR p.b_HAS_AVOIR = 1)";
    /** Lignes en avoir : quantite due (ouverte ou historisee a la cloture). */
    static final String DU = "(CASE WHEN d.b_IS_AVOIR = 1 THEN d.int_AVOIR ELSE IFNULL(d.int_AVOIR_INITIAL, 0) END)";
    static final String LIGNES = " FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
            + " WHERE p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND (p.b_IS_AVOIR = 1 OR p.b_HAS_AVOIR = 1) AND " + DU + " > 0";

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

    static double d(Object o) {
        return o == null ? 0 : Math.round(((Number) o).doubleValue() * 10) / 10.0;
    }

    static double pourcent(long valeur, long total) {
        return total == 0 ? 0 : Math.round(valeur * 1000.0 / total) / 10.0;
    }

    /** Tranche d'anciennete d'un avoir encore ouvert, en jours depuis la vente. */
    static String tranche(long jours) {
        return jours <= 2 ? "0 à 2 jours"
                : jours <= 7 ? "3 à 7 jours" : jours <= 30 ? "8 à 30 jours" : "plus de 30 jours";
    }

    public JSONObject analyser(LocalDate debut, LocalDate fin) {
        Object[] v = lignes("SELECT COUNT(*), SUM(p.int_PRICE)" + VENTES, debut, fin).get(0);
        Object[] a = lignes("SELECT COUNT(*), SUM(p.b_IS_AVOIR = 1), SUM(p.b_IS_AVOIR = 0),"
                + " AVG(CASE WHEN p.b_IS_AVOIR = 0 AND p.dt_CLOTURE_AVOIR IS NOT NULL THEN TIMESTAMPDIFF(HOUR, p.dt_UPDATED, p.dt_CLOTURE_AVOIR) END)"
                + AVOIRS, debut, fin).get(0);
        Object[] q = lignes("SELECT COUNT(*), SUM(" + DU + "), SUM(" + DU + " * d.int_PRICE_UNITAIR),"
                + " SUM(CASE WHEN d.b_IS_AVOIR = 1 THEN d.int_AVOIR * d.int_PRICE_UNITAIR ELSE 0 END), COUNT(DISTINCT d.lg_FAMILLE_ID)"
                + LIGNES, debut, fin).get(0);
        long ventes = n(v[0]), avoirs = n(a[0]), ouverts = n(a[1]), clotures = n(a[2]);
        JSONObject total = new JSONObject().put("ventes", ventes).put("ca", n(v[1])).put("avoirs", avoirs)
                .put("enCours", ouverts).put("clotures", clotures).put("tauxCloture", pourcent(clotures, avoirs))
                .put("partVentes", pourcent(avoirs, ventes))
                .put("delaiMoyenJours", a[3] == null ? JSONObject.NULL : d(((Number) a[3]).doubleValue() / 24.0))
                .put("lignes", n(q[0])).put("quantite", n(q[1])).put("valeur", n(q[2])).put("valeurEnCours", n(q[3]))
                .put("produits", n(q[4]));

        JSONArray produits = new JSONArray();
        for (Object[] l : lignes("SELECT f.int_CIP, f.str_NAME, IFNULL(g.str_LIBELLE, ''), COUNT(*), SUM(" + DU + "),"
                + " SUM(CASE WHEN d.b_IS_AVOIR = 1 THEN d.int_AVOIR ELSE 0 END), SUM(" + DU + " * d.int_PRICE_UNITAIR)"
                + LIGNES
                + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, g.str_LIBELLE ORDER BY COUNT(*) DESC, SUM(" + DU
                + ") DESC LIMIT 30", debut, fin)) {
            produits.put(new JSONObject().put("cip", l[0]).put("libelle", l[1]).put("grossiste", l[2])
                    .put("fois", n(l[3])).put("quantite", n(l[4])).put("enCours", n(l[5])).put("valeur", n(l[6])));
        }

        JSONArray grossistes = new JSONArray();
        for (Object[] l : lignes(
                "SELECT IFNULL(g.str_LIBELLE, '(sans grossiste)'), COUNT(*), COUNT(DISTINCT d.lg_FAMILLE_ID)," + " SUM("
                        + DU + "), SUM(" + DU + " * d.int_PRICE_UNITAIR)" + LIGNES
                        + " GROUP BY g.lg_GROSSISTE_ID, g.str_LIBELLE ORDER BY COUNT(*) DESC",
                debut, fin)) {
            grossistes.put(new JSONObject().put("libelle", l[0]).put("fois", n(l[1])).put("produits", n(l[2]))
                    .put("quantite", n(l[3])).put("valeur", n(l[4])).put("part", pourcent(n(l[1]), n(q[0]))));
        }

        /* anciennete des avoirs encore ouverts (a ce jour) */
        Map<String, long[]> anciennete = new LinkedHashMap<>();
        for (String t : new String[] { "0 à 2 jours", "3 à 7 jours", "8 à 30 jours", "plus de 30 jours" }) {
            anciennete.put(t, new long[2]);
        }
        for (Object[] l : lignes(
                "SELECT DATEDIFF(NOW(), p.dt_UPDATED), (SELECT SUM(d.int_AVOIR * d.int_PRICE_UNITAIR) FROM t_preenregistrement_detail d"
                        + " WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND d.b_IS_AVOIR = 1)" + VENTES
                        + " AND p.b_IS_AVOIR = 1",
                debut, fin)) {
            long[] c = anciennete.get(tranche(n(l[0])));
            c[0]++;
            c[1] += n(l[1]);
        }
        JSONArray age = new JSONArray();
        anciennete
                .forEach((k, c) -> age.put(new JSONObject().put("tranche", k).put("avoirs", c[0]).put("valeur", c[1])));

        Map<String, long[]> mois = new LinkedHashMap<>();
        for (Object[] l : lignes("SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m'), COUNT(*)" + VENTES + " GROUP BY 1", debut,
                fin)) {
            mois.computeIfAbsent(String.valueOf(l[0]), k -> new long[4])[0] = n(l[1]);
        }
        for (Object[] l : lignes(
                "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m'), COUNT(*), SUM(p.b_IS_AVOIR = 0)" + AVOIRS + " GROUP BY 1",
                debut, fin)) {
            long[] c = mois.computeIfAbsent(String.valueOf(l[0]), k -> new long[4]);
            c[1] = n(l[1]);
            c[2] = n(l[2]);
        }
        for (Object[] l : lignes("SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m'), SUM(" + DU + " * d.int_PRICE_UNITAIR)"
                + LIGNES + " GROUP BY 1", debut, fin)) {
            mois.computeIfAbsent(String.valueOf(l[0]), k -> new long[4])[3] = n(l[1]);
        }
        JSONArray parMois = new JSONArray();
        mois.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .forEach(e -> parMois.put(new JSONObject().put("mois", e.getKey()).put("ventes", e.getValue()[0])
                        .put("avoirs", e.getValue()[1]).put("clotures", e.getValue()[2]).put("valeur", e.getValue()[3])
                        .put("part", pourcent(e.getValue()[1], e.getValue()[0]))));

        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("total", total).put("produits", produits).put("grossistes", grossistes).put("anciennete", age)
                .put("mois", parMois);
    }
}
