package rest.service.impl.activite;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plan du 08/11, point 15.1 : annulations rattachees a l'auteur de la vente (pas a celui qui annule : l'annulation
 * remplace lg_USER_ID de la vente par l'annuleur), et suivi des caissieres.
 * <ul>
 * <li>par vendeur : ventes saisies sur la periode (hors ventes remplacees par une modification), dont annulees ensuite
 * ; taux = annulees / ventes ;</li>
 * <li>par caissiere (celle qui a encaisse la vente) : annulations et modifications de ventes au comptant, modifications
 * de ventes a credit (assurance, carnet) ; plan du 09/11, point 10 : ventes encaissees au comptant et a credit, taux de
 * chaque operation rapporte aux ventes de son type, taux global = operations / ventes encaissees.</li>
 * </ul>
 */
public final class AnnulationsAuteurs {

    private AnnulationsAuteurs() {
    }

    /** Pourcentage arrondi au dixieme ; null sans denominateur. */
    static Double taux(long n, long sur) {
        return sur <= 0 ? null : AgregatsActivite.arrondi(100.0 * n / sur);
    }

    static long nombre(Object o) {
        return o instanceof Number ? Math.max(0, ((Number) o).longValue()) : 0;
    }

    /** Lignes [vendeur, ventes, annulees] ; vendeur sans vente ecarte ; tri : annulees, puis taux, puis nom. */
    public static List<Map<String, Object>> parVendeur(List<Object[]> lignes, Map<String, String> noms) {
        List<Map<String, Object>> l = new ArrayList<>();
        for (Object[] r : lignes) {
            long ventes = nombre(r[1]), annulees = Math.min(nombre(r[2]), ventes);
            if (r[0] == null || ventes == 0) {
                continue;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", String.valueOf(r[0]));
            m.put("nom", noms.getOrDefault(String.valueOf(r[0]), "?"));
            m.put("ventes", ventes);
            m.put("annulees", annulees);
            m.put("taux", AgregatsActivite.arrondi(100.0 * annulees / ventes));
            l.add(m);
        }
        l.sort(Comparator.<Map<String, Object>> comparingLong(m -> (Long) m.get("annulees")).reversed()
                .thenComparing(Comparator.<Map<String, Object>> comparingDouble(m -> (Double) m.get("taux")).reversed())
                .thenComparing(m -> (String) m.get("nom")));
        return l;
    }

    /**
     * Lignes [caissiere, annulations comptant, modifications comptant, modifications credit, ventes comptant, ventes
     * credit] (les deux dernieres colonnes sont facultatives) ; caissiere sans operation ecartee ; tri : total, puis
     * nom.
     */
    public static List<Map<String, Object>> parCaissier(List<Object[]> lignes, Map<String, String> noms) {
        Map<String, long[]> cumul = new LinkedHashMap<>();
        for (Object[] r : lignes) {
            if (r[0] == null) {
                continue;
            }
            long[] x = cumul.computeIfAbsent(String.valueOf(r[0]), k -> new long[5]);
            x[0] += nombre(r[1]);
            x[1] += nombre(r[2]);
            x[2] += nombre(r[3]);
            x[3] += r.length > 4 ? nombre(r[4]) : 0;
            x[4] += r.length > 5 ? nombre(r[5]) : 0;
        }
        List<Map<String, Object>> l = new ArrayList<>();
        cumul.forEach((id, x) -> {
            long total = x[0] + x[1] + x[2];
            if (total == 0) {
                return;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("nom", noms.getOrDefault(id, "?"));
            m.put("annulationsComptant", x[0]);
            m.put("modificationsComptant", x[1]);
            m.put("modificationsCredit", x[2]);
            m.put("total", total);
            /* plan du 09/11, point 10 : taux par type de vente (null sans vente de ce type) */
            m.put("ventesComptant", x[3]);
            m.put("ventesCredit", x[4]);
            m.put("tauxAnnulationsComptant", taux(x[0], x[3]));
            m.put("tauxModificationsComptant", taux(x[1], x[3]));
            m.put("tauxModificationsCredit", taux(x[2], x[4]));
            m.put("taux", taux(total, x[3] + x[4]));
            l.add(m);
        });
        l.sort(Comparator.<Map<String, Object>> comparingLong(m -> (Long) m.get("total")).reversed()
                .thenComparing(m -> (String) m.get("nom")));
        return l;
    }
}
