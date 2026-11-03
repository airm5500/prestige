package rest.service.ticket;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Cas 1 du 03/11/2026 (Q1.9) : sur le ticket de vente assurance, chaque ligne porte « Crédit : T[taux %] — Mont. : part
 * » pour chaque tiers-payant. Les parts par ligne sont recalculees a partir de la base de calcul de la ligne et du taux
 * applique, puis ramenees au total de l'organisme sur la vente (plafonds, arrondis) : la somme des lignes est
 * exactement la part imprimee dans le bloc tiers-payant.
 */
public final class CreditLigne {

    private CreditLigne() {
    }

    /**
     * Parts d'un tiers-payant, ligne par ligne, dont la somme vaut {@code totalTp}.
     *
     * @param bases
     *            base de calcul de chaque ligne (prix de reference ou montant de la ligne)
     * @param taux
     *            taux applique par le tiers-payant (0 a 100)
     * @param totalTp
     *            part de l'organisme sur la vente, telle qu'enregistree a la cloture
     */
    public static List<Integer> parts(List<Integer> bases, int taux, int totalTp) {
        List<Integer> res = new ArrayList<>();
        if (bases == null || bases.isEmpty()) {
            return res;
        }
        BigDecimal t = BigDecimal.valueOf(Math.max(0, taux)).divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
        long somme = 0;
        for (Integer b : bases) {
            int p = BigDecimal.valueOf(b == null ? 0 : b).multiply(t).setScale(0, RoundingMode.HALF_UP).intValue();
            res.add(p);
            somme += p;
        }
        int total = Math.max(0, totalTp);
        if (somme == total || somme <= 0) {
            return res;
        }
        if (Math.abs(somme - total) <= res.size()) {
            // simple ecart d'arrondi : la derniere ligne l'absorbe (6 725 et 3 145 a 70 % -> 4 708 et 2 201)
            int dernier = res.get(res.size() - 1) + (int) (total - somme);
            res.set(res.size() - 1, Math.max(0, dernier));
            return res;
        }
        // plafonne par le moteur : chaque ligne au prorata, la derniere absorbe l'ecart
        long cumul = 0;
        for (int i = 0; i < res.size() - 1; i++) {
            int p = BigDecimal.valueOf(res.get(i)).multiply(BigDecimal.valueOf(total))
                    .divide(BigDecimal.valueOf(somme), 0, RoundingMode.HALF_UP).intValue();
            res.set(i, p);
            cumul += p;
        }
        res.set(res.size() - 1, (int) Math.max(0, total - cumul));
        return res;
    }

    /** « Crédit : T[70 %] — Mont. : 4 708 », le nom de l'organisme en plus quand la vente en a plusieurs. */
    public static String libelle(String nomTiersPayant, int taux, int montant) {
        String nom = nomTiersPayant == null || nomTiersPayant.trim().isEmpty() ? "" : " " + nomTiersPayant.trim();
        return "Crédit" + nom + " : T[" + taux + " %] — Mont. : " + ConversionTicket.nombre(montant);
    }
}
