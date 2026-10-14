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

    public static final String OBJECTIF = "KEY_OBJECTIF_TAUX_PEREMPTION";

    /** Regroupements proposes (retours du 13/10, point 4) : expression SQL de la periode d'une date. */
    static String periode(String pas, String colonne) {
        switch (pas == null ? "" : pas) {
        case "semaine":
            return "DATE_FORMAT(" + colonne + ", '%x-S%v')";
        case "trimestre":
            return "CONCAT(YEAR(" + colonne + "), '-T', QUARTER(" + colonne + "))";
        case "annee":
            return "CAST(YEAR(" + colonne + ") AS CHAR)";
        default:
            return "DATE_FORMAT(" + colonne + ", '%Y-%m')";
        }
    }

    static String pas(String pas) {
        return "semaine".equals(pas) || "trimestre".equals(pas) || "annee".equals(pas) ? pas : "mois";
    }

    /** Objectif du taux de peremption, en % (0,5 par defaut). */
    @SuppressWarnings("unchecked")
    public double objectif() {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, OBJECTIF).getResultList();
        try {
            return r.isEmpty() || r.get(0) == null ? 0.5
                    : Double.parseDouble(String.valueOf(r.get(0)).trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            return 0.5;
        }
    }

    /** Enregistre l'objectif (entre 0,01 et 20 %) ; rend un message d'erreur, ou null. */
    public String enregistrerObjectif(double valeur) {
        if (Double.isNaN(valeur) || valeur < 0.01 || valeur > 20) {
            return "L'objectif doit être compris entre 0,01 et 20 %.";
        }
        String v = String.valueOf(Math.round(valeur * 100) / 100.0);
        int n = em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1, dt_UPDATED = NOW() WHERE str_KEY = ?2")
                .setParameter(1, v).setParameter(2, OBJECTIF).executeUpdate();
        if (n == 0) {
            em.createNativeQuery(
                    "INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)"
                            + " VALUES (?1, ?2, 'Objectif du taux de péremption, en %', 'NUMBER', 'enable', NOW())")
                    .setParameter(1, OBJECTIF).setParameter(2, v).executeUpdate();
        }
        return null;
    }

    public JSONObject analyser(LocalDate debut, LocalDate fin) {
        return analyser(debut, fin, "mois");
    }

    public JSONObject analyser(LocalDate debut, LocalDate fin, String regroupement) {
        String pas = pas(regroupement);
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

        /* retours du 13/10 (point 4) : produits qui se periment le plus SOUVENT (nombre de saisies) */
        JSONArray frequents = new JSONArray();
        for (Object[] l : lignes(
                "SELECT f.int_CIP, f.str_NAME, IFNULL(z.str_LIBELLEE, ''), COUNT(*), SUM(w.int_NUMBER),"
                        + " SUM(w.int_NUMBER * f.int_PRICE), SUM(w.int_NUMBER * f.int_PAF)" + PERIMES
                        + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, z.str_LIBELLEE"
                        + " ORDER BY COUNT(*) DESC, SUM(w.int_NUMBER) DESC, SUM(w.int_NUMBER * f.int_PRICE) DESC LIMIT 50",
                debut, fin)) {
            frequents.put(new JSONObject().put("cip", l[0]).put("libelle", l[1]).put("emplacement", l[2])
                    .put("fois", n(l[3])).put("quantite", n(l[4])).put("valeur", n(l[5])).put("valeurAchat", n(l[6]))
                    .put("part", pourcent(n(l[5]), valeur)));
        }

        /* retours du 13/10 (point 4) : evolution par intervalle reglable (semaine, mois, trimestre, annee) */
        Map<String, long[]> parPas = new LinkedHashMap<>();
        for (Object[] l : lignes(
                "SELECT " + periode(pas, "p.dt_CREATED") + ", SUM(p.int_PRICE)" + VENTES + " GROUP BY 1", debut, fin)) {
            parPas.computeIfAbsent(String.valueOf(l[0]), k -> new long[2])[1] = n(l[1]);
        }
        for (Object[] l : lignes("SELECT " + periode(pas, "w.dt_CREATED") + ", SUM(w.int_NUMBER * f.int_PRICE)"
                + PERIMES + " GROUP BY 1", debut, fin)) {
            parPas.computeIfAbsent(String.valueOf(l[0]), k -> new long[2])[0] = n(l[1]);
        }
        JSONArray periodes = new JSONArray();
        parPas.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .forEach(e -> periodes.put(new JSONObject().put("periode", e.getKey()).put("valeur", e.getValue()[0])
                        .put("ca", e.getValue()[1]).put("ratio", pourcent(e.getValue()[0], e.getValue()[1]))));

        double objectif = objectif();
        total.put("objectif", objectif).put("objectifAtteint", total.getDouble("ratio") < objectif);
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("total", total).put("zones", zones).put("produits", produits).put("frequents", frequents)
                .put("mois", parMois).put("pas", pas).put("periodes", periodes).put("objectif", objectif);
    }
}
