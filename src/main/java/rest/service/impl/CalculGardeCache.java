package rest.service.impl;

import commonTasks.dto.GardeKpiDTO;
import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import dal.Garde;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Decision 39 du pharmacien (15/10, confirmee le 19/10) : garder quelques minutes le calcul d'une garde pour servir les
 * pages suivantes du rapport (l'application demande les produits par 100). La cle porte l'identifiant, les dates et la
 * derniere modification de la garde et la taille des tranches : une garde modifiee est recalculee aussitot. Les listes
 * gardees ne sont jamais modifiees (le filtrage de l'ecran en fait une copie).
 */
public final class CalculGardeCache {

    /** duree de vie d'un calcul */
    static final long DUREE_MS = 5 * 60 * 1000L;
    /** au-dela, les calculs perimes sont purges ; puis le plus ancien est retire */
    static final int MAX_ENTREES = 20;

    private static final Map<String, Calcul> CALCULS = new ConcurrentHashMap<>();

    /** Le calcul complet d'une garde. */
    public static final class Calcul {

        public final List<GardeTrancheDTO> tranches;
        public final List<GardeProduitDTO> classement;
        public final AnalyseGarde.Indicateurs indicateurs;
        public final GardeKpiDTO kpi;
        final long expire;

        public Calcul(List<GardeTrancheDTO> tranches, List<GardeProduitDTO> classement,
                AnalyseGarde.Indicateurs indicateurs, GardeKpiDTO kpi) {
            this(tranches, classement, indicateurs, kpi, System.currentTimeMillis() + DUREE_MS);
        }

        Calcul(List<GardeTrancheDTO> tranches, List<GardeProduitDTO> classement, AnalyseGarde.Indicateurs indicateurs,
                GardeKpiDTO kpi, long expire) {
            this.tranches = Collections.unmodifiableList(tranches);
            this.classement = Collections.unmodifiableList(classement);
            this.indicateurs = indicateurs;
            this.kpi = kpi;
            this.expire = expire;
        }
    }

    private CalculGardeCache() {
    }

    static String cle(Garde g, int heures) {
        return g.getId() + "|" + g.getDateDebut() + "|" + g.getDateFin() + "|" + g.getUpdatedAt() + "|" + heures;
    }

    /**
     * Le calcul garde s'il est encore valable, sinon celui que donne le fournisseur (garde pour les pages suivantes).
     */
    public static Calcul obtenir(Garde g, int heures, Supplier<Calcul> calculer) {
        String cle = cle(g, heures);
        long maintenant = System.currentTimeMillis();
        Calcul c = CALCULS.get(cle);
        if (c != null && c.expire > maintenant) {
            return c;
        }
        c = calculer.get();
        if (CALCULS.size() >= MAX_ENTREES) {
            CALCULS.values().removeIf(x -> x.expire <= maintenant);
            if (CALCULS.size() >= MAX_ENTREES) {
                CALCULS.entrySet().stream().min(Map.Entry.comparingByValue((a, b) -> Long.compare(a.expire, b.expire)))
                        .ifPresent(e -> CALCULS.remove(e.getKey()));
            }
        }
        CALCULS.put(cle, c);
        return c;
    }

    static int taille() {
        return CALCULS.size();
    }

    /** Oublie les calculs d'une garde (enregistrement, suppression). */
    public static void oublier(String gardeId) {
        CALCULS.keySet().removeIf(k -> k.startsWith(gardeId + "|"));
    }
}
