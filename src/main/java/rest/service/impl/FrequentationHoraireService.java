package rest.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Analyse de frequentation horaire (besoins du 11/10, point 12) : ventes, montant, panier moyen et quantites par
 * tranche horaire sur une periode, avec la part de chaque tranche dans le chiffre d'affaires et dans les ventes. Meme
 * perimetre que l'ancien ecran : ventes cloturees, non annulees, de montant positif.
 * <p>
 * Tranches : « habituelles » (les 10 plages historiques de l'ecran) ou regulieres de 1 a 6 heures.
 */
@Stateless
public class FrequentationHoraireService {

    /** Plages historiques de l'ecran : [debut, fin] en heures incluses. */
    static final int[][] HABITUELLES = { { 0, 6 }, { 7, 8 }, { 9, 10 }, { 11, 13 }, { 14, 15 }, { 16, 16 }, { 17, 17 },
            { 18, 18 }, { 19, 19 }, { 20, 23 } };

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Tranches de {@code taille} heures (1 a 6), ou habituelles si {@code taille} vaut 0. */
    static List<int[]> tranches(int taille) {
        List<int[]> r = new ArrayList<>();
        if (taille <= 0) {
            for (int[] t : HABITUELLES) {
                r.add(t.clone());
            }
            return r;
        }
        for (int h = 0; h < 24; h += taille) {
            r.add(new int[] { h, Math.min(23, h + taille - 1) });
        }
        return r;
    }

    static String libelle(int[] t) {
        return String.format("%02d:00-%02d:59", t[0], t[1]);
    }

    private long[] parHeure(String sql, LocalDate debut, LocalDate fin) {
        long[] v = new long[24];
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery(sql).setParameter(1, debut.toString())
                .setParameter(2, fin.plusDays(1).toString()).getResultList();
        for (Object[] o : l) {
            int h = ((Number) o[0]).intValue();
            if (h >= 0 && h < 24 && o[1] != null) {
                v[h] = ((Number) o[1]).longValue();
            }
        }
        return v;
    }

    static final String FILTRE = " WHERE p.dt_CREATED >= ?1 AND p.dt_CREATED < ?2 AND p.int_PRICE > 0"
            + " AND p.b_IS_CANCEL = 0 AND p.str_STATUT = 'is_Closed'";

    public JSONObject analyser(LocalDate debut, LocalDate fin, int taille) {
        long[] montant = parHeure("SELECT HOUR(p.dt_CREATED), SUM(p.int_PRICE) FROM t_preenregistrement p" + FILTRE
                + " GROUP BY HOUR(p.dt_CREATED)", debut, fin);
        long[] ventes = parHeure("SELECT HOUR(p.dt_CREATED), COUNT(*) FROM t_preenregistrement p" + FILTRE
                + " GROUP BY HOUR(p.dt_CREATED)", debut, fin);
        long[] quantites = parHeure("SELECT HOUR(p.dt_CREATED), SUM(d.int_QUANTITY) FROM t_preenregistrement_detail d"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID" + FILTRE
                + " GROUP BY HOUR(p.dt_CREATED)", debut, fin);
        long totalMontant = 0, totalVentes = 0, totalQuantites = 0;
        for (int h = 0; h < 24; h++) {
            totalMontant += montant[h];
            totalVentes += ventes[h];
            totalQuantites += quantites[h];
        }
        JSONArray lignes = new JSONArray();
        for (int[] t : tranches(taille)) {
            long m = 0, v = 0, q = 0;
            for (int h = t[0]; h <= t[1]; h++) {
                m += montant[h];
                v += ventes[h];
                q += quantites[h];
            }
            lignes.put(new JSONObject().put("tranche", libelle(t)).put("debut", t[0]).put("fin", t[1]).put("montant", m)
                    .put("ventes", v).put("quantites", q).put("panier", v == 0 ? 0 : Math.round((double) m / v))
                    .put("partCa", part(m, totalMontant)).put("partVentes", part(v, totalVentes)));
        }
        return new JSONObject().put("success", true).put("data", lignes).put("total",
                new JSONObject().put("montant", totalMontant).put("ventes", totalVentes)
                        .put("quantites", totalQuantites)
                        .put("panier", totalVentes == 0 ? 0 : Math.round((double) totalMontant / totalVentes)));
    }

    /** Part en pourcentage, une decimale. */
    static double part(long valeur, long total) {
        return total == 0 ? 0 : Math.round(valeur * 1000.0 / total) / 10.0;
    }
}
