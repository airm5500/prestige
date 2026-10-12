package rest.service.impl;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ANALYSE DE LA DEMANDE (besoins du 11/10, point 14), onglet des Previsions : comment la demande (unites vendues) se
 * repartit sur l'annee, pour aider a anticiper les commandes de saison.
 * <p>
 * Sur les N derniers mois COMPLETS (le mois en cours est exclu : il ferait croire a un creux) :
 * <ul>
 * <li>matrice annee x mois des unites vendues ;</li>
 * <li>indice saisonnier de chaque mois de l'annee : moyenne du mois / moyenne de tous les mois (1 = mois normal, 1,5 =
 * 50 % de plus) ; pics et creux ;</li>
 * <li>tendance : 12 derniers mois contre les 12 precedents ;</li>
 * <li>produits les plus saisonniers (ecart des indices) et ceux dont le pic arrive le mois prochain ou le suivant.</li>
 * </ul>
 * Meme perimetre de ventes que le Pilotage. Lecture seule. Filtres : nom ou CIP (debut), emplacement.
 */
@Stateless
public class DemandeSaisonniereService {

    /** Un produit doit avoir au moins ces unites sur la fenetre pour etre classe (sinon le hasard fait la saison). */
    static final int UNITES_MIN_PRODUIT = 24;

    static final String LIGNES = " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND p.lg_TYPE_VENTE_ID <> '" + PilotageSql.TYPE_VENTE_EXCLU + "'"
            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Fenetre : les {@code mois} mois complets avant le mois de {@code aujourdhui}. */
    static YearMonth[] fenetre(LocalDate aujourdhui, int mois) {
        YearMonth fin = YearMonth.from(aujourdhui).minusMonths(1);
        return new YearMonth[] { fin.minusMonths(mois - 1L), fin };
    }

    /**
     * Indices saisonniers des 12 mois de l'annee a partir des unites de chaque mois de la fenetre : moyenne des mois de
     * meme nom / moyenne de tous les mois. 0 partout si rien n'est vendu. Arrondi a 2 decimales.
     */
    static double[] indices(Map<YearMonth, Long> unites, YearMonth debut, YearMonth fin) {
        double[] somme = new double[12];
        int[] nb = new int[12];
        double total = 0;
        int mois = 0;
        for (YearMonth m = debut; !m.isAfter(fin); m = m.plusMonths(1)) {
            long u = unites.getOrDefault(m, 0L);
            somme[m.getMonthValue() - 1] += u;
            nb[m.getMonthValue() - 1]++;
            total += u;
            mois++;
        }
        double moyenne = mois == 0 ? 0 : total / mois;
        double[] r = new double[12];
        for (int i = 0; i < 12; i++) {
            r[i] = moyenne == 0 || nb[i] == 0 ? 0 : Math.round(somme[i] / nb[i] / moyenne * 100) / 100.0;
        }
        return r;
    }

    /** Force de la saison : ecart-type des indices des mois couverts (0 = demande reguliere). */
    static double force(double[] indices) {
        double s = 0, s2 = 0;
        int n = 0;
        for (double v : indices) {
            s += v;
            s2 += v * v;
            n++;
        }
        double m = s / n;
        return Math.round(Math.sqrt(Math.max(0, s2 / n - m * m)) * 100) / 100.0;
    }

    static int pic(double[] indices) {
        int k = 0;
        for (int i = 1; i < 12; i++) {
            if (indices[i] > indices[k]) {
                k = i;
            }
        }
        return k + 1;
    }

    private static String echapper(String texte) {
        return texte.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String select, String suite, YearMonth debut, YearMonth fin, String texte,
            String rayon) {
        String filtre = (texte == null ? "" : " AND (f.int_CIP LIKE ?3 ESCAPE '!' OR f.str_NAME LIKE ?3 ESCAPE '!')")
                + (rayon == null ? "" : " AND f.lg_ZONE_GEO_ID = ?4");
        Query q = em.createNativeQuery(select + LIGNES + filtre + suite).setParameter(1, debut.atDay(1).toString())
                .setParameter(2, fin.plusMonths(1).atDay(1).toString());
        if (texte != null) {
            q.setParameter(3, echapper(texte));
        }
        if (rayon != null) {
            q.setParameter(4, rayon);
        }
        return q.getResultList();
    }

    static long n(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    public JSONObject analyser(LocalDate aujourdhui, int nbMois, String query, String rayonId) {
        String texte = StringUtils.trimToNull(query);
        String rayon = StringUtils.isBlank(rayonId) || "ALL".equalsIgnoreCase(rayonId.trim()) ? null : rayonId.trim();
        YearMonth[] f = fenetre(aujourdhui, nbMois);
        YearMonth debut = f[0], fin = f[1];

        Map<YearMonth, Long> unites = new HashMap<>();
        Map<YearMonth, long[]> detail = new HashMap<>();
        for (Object[] l : lignes("SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS m, SUM(d.int_QUANTITY),"
                + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID), SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0))",
                " GROUP BY m", debut, fin, texte, rayon)) {
            YearMonth m = YearMonth.parse((String) l[0]);
            unites.put(m, n(l[1]));
            detail.put(m, new long[] { n(l[1]), n(l[2]), n(l[3]) });
        }
        /* matrice annee x mois (null = mois hors fenetre) */
        Map<Integer, JSONObject> annees = new LinkedHashMap<>();
        long total = 0;
        for (YearMonth m = debut; !m.isAfter(fin); m = m.plusMonths(1)) {
            JSONObject a = annees.computeIfAbsent(m.getYear(), y -> {
                JSONArray vide = new JSONArray();
                for (int i = 0; i < 12; i++) {
                    vide.put(JSONObject.NULL);
                }
                return new JSONObject().put("annee", y).put("mois", vide).put("total", 0L);
            });
            long[] v = detail.getOrDefault(m, new long[3]);
            a.getJSONArray("mois").put(m.getMonthValue() - 1, v[0]);
            a.put("total", a.getLong("total") + v[0]);
            total += v[0];
        }
        double[] ind = indices(unites, debut, fin);
        JSONArray indices = new JSONArray();
        for (double v : ind) {
            indices.put(v);
        }
        /* tendance : 12 derniers mois contre les 12 precedents (si la fenetre les couvre) */
        JSONObject tendance = new JSONObject();
        if (nbMois >= 24) {
            long recent = 0, avant = 0;
            for (int i = 0; i < 12; i++) {
                recent += unites.getOrDefault(fin.minusMonths(i), 0L);
                avant += unites.getOrDefault(fin.minusMonths(12L + i), 0L);
            }
            tendance.put("recent", recent).put("avant", avant).put("evolution",
                    avant == 0 ? JSONObject.NULL : Math.round((recent - avant) * 1000.0 / avant) / 10.0);
        }

        /* produits : unites par mois de la fenetre, pour leurs indices propres */
        Map<String, Object[]> fiches = new LinkedHashMap<>();
        Map<String, Map<YearMonth, Long>> parProduit = new HashMap<>();
        for (Object[] l : lignes(
                "SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME,"
                        + " DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS m, SUM(d.int_QUANTITY)",
                " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, m", debut, fin, texte, rayon)) {
            String id = (String) l[0];
            fiches.putIfAbsent(id, new Object[] { l[1], l[2] });
            parProduit.computeIfAbsent(id, k -> new HashMap<>()).put(YearMonth.parse((String) l[3]), n(l[4]));
        }
        int prochain = aujourdhui.getMonthValue() % 12 + 1, suivant = prochain % 12 + 1;
        List<JSONObject> produits = new ArrayList<>();
        for (Map.Entry<String, Map<YearMonth, Long>> e : parProduit.entrySet()) {
            long u = e.getValue().values().stream().mapToLong(Long::longValue).sum();
            if (u < UNITES_MIN_PRODUIT) {
                continue;
            }
            double[] ip = indices(e.getValue(), debut, fin);
            int p = pic(ip);
            Object[] fiche = fiches.get(e.getKey());
            produits.add(new JSONObject().put("id", e.getKey()).put("cip", fiche[0]).put("libelle", fiche[1])
                    .put("unites", u).put("force", force(ip)).put("pic", p).put("indicePic", ip[p - 1])
                    .put("anticiper", p == prochain || p == suivant));
        }
        produits.sort((a, b) -> Double.compare(b.getDouble("force"), a.getDouble("force")));
        JSONArray top = new JSONArray();
        for (JSONObject o : produits.subList(0, Math.min(30, produits.size()))) {
            top.put(o);
        }
        JSONArray anticiper = new JSONArray();
        for (JSONObject o : produits) {
            if (o.getBoolean("anticiper") && o.getDouble("indicePic") >= 1.3 && anticiper.length() < 30) {
                anticiper.put(o);
            }
        }
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("mois", nbMois).put("total", total).put("annees", new JSONArray(annees.values()))
                .put("indices", indices).put("pic", total == 0 ? JSONObject.NULL : pic(ind)).put("force", force(ind))
                .put("tendance", tendance).put("produits", top).put("anticiper", anticiper)
                .put("prochainMois", prochain).put("produitsClasses", produits.size());
    }
}
