package rest.service.ticket;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Cas 1 du 03/11/2026 (Q1.9) : sur le ticket de vente assurance, chaque ligne porte « Taux <taux> % : part » pour
 * chaque tiers-payant. Les parts par ligne sont recalculees a partir de la base de calcul de la ligne et du taux
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
        List<Integer> tauxParLigne = new ArrayList<>();
        if (bases != null) {
            bases.forEach(x -> tauxParLigne.add(taux));
        }
        return parts(bases, tauxParLigne, totalTp);
    }

    /**
     * Ticket du 05/11 : chaque ligne avec son propre taux (taux modifie sur la ligne a l'ecran de vente, table
     * taux_produit), toujours ramene au total de l'organisme.
     */
    public static List<Integer> parts(List<Integer> bases, List<Integer> tauxParLigne, int totalTp) {
        List<Integer> res = new ArrayList<>();
        if (bases == null || bases.isEmpty()) {
            return res;
        }
        long somme = 0;
        for (int i = 0; i < bases.size(); i++) {
            Integer b = bases.get(i);
            Integer tx = tauxParLigne == null || i >= tauxParLigne.size() ? null : tauxParLigne.get(i);
            BigDecimal t = BigDecimal.valueOf(Math.max(0, tx == null ? 0 : tx)).divide(BigDecimal.valueOf(100), 10,
                    RoundingMode.HALF_UP);
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

    /**
     * Retour du 05/11 : taux tels qu'imprimes, dans l'ordre des organismes. Leur total ne depasse jamais 100 % ; quand
     * il s'en ecarte d'un ou deux points (29 % ou 31 % pour un complementaire qui prend le reste d'un 70 %), le dernier
     * organisme affiche le reste exact : 100 − les autres. Les parts (montants) ne changent pas.
     */
    public static List<Integer> tauxAffiches(List<Integer> taux) {
        List<Integer> res = new ArrayList<>();
        if (taux == null) {
            return res;
        }
        int cumul = 0;
        for (int i = 0; i < taux.size(); i++) {
            int t = Math.max(0, taux.get(i) == null ? 0 : taux.get(i));
            boolean dernier = i == taux.size() - 1;
            if (cumul + t > 100 || (dernier && i > 0 && Math.abs(cumul + t - 100) <= 2)) {
                t = Math.max(0, 100 - cumul);
            }
            res.add(t);
            cumul += t;
        }
        return res;
    }

    /**
     * Retour du 05/11 : « P.REF 6 000 » quand la ligne a un prix de reference different du prix de vente ; vide sinon
     * (sans reference, la ligne garde le seul taux du client).
     */
    public static String prixReference(Integer reference, Integer prixVente) {
        if (reference == null || reference <= 0
                || (prixVente != null && reference.intValue() == prixVente.intValue())) {
            return "";
        }
        return "P.REF " + ConversionTicket.nombre(reference);
    }

    /**
     * « Taux 70 % : 4 708 » (retour du 03/11 : sans « Crédit » ni « Mont. »), precede du nom de l'organisme quand la
     * vente en a plusieurs : « MUGEF-CI · Taux 80 % : 1 200 ».
     */
    public static String libelle(String nomTiersPayant, int taux, int montant) {
        String nom = nomTiersPayant == null || nomTiersPayant.trim().isEmpty() ? "" : nomTiersPayant.trim() + " · ";
        return nom + "Taux " + taux + " % : " + ConversionTicket.nombre(montant);
    }
}
