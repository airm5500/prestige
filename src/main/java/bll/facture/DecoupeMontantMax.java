package bll.facture;

import java.util.ArrayList;
import java.util.List;

/**
 * Decoupe des bons d'un tiers payant en factures quand la fiche fixe un « montant maximal par facture ».
 * <p>
 * Regles : les bons gardent leur ordre ; chaque bon entre dans une facture et une seule ; une facture se remplit tant
 * que le bon suivant ne lui fait pas depasser le plafond ; un bon qui depasse a lui seul le plafond forme sa propre
 * facture ; jamais de facture vide.
 * </p>
 * <p>
 * Remplace la boucle historique (factureManagement.createInvoices, cas 1, et ses six copies de
 * GroupeTierspayantController). Celle-ci creait une facture vide quand le premier bon depassait le plafond, oubliait
 * les deux derniers bons quand le depassement tombait sur le dernier, et comptait deux fois le bon suivant une coupure.
 * </p>
 */
public final class DecoupeMontantMax {

    private DecoupeMontantMax() {
    }

    /** Tranches [debut, fin[ de la liste, une par facture, dans l'ordre. Liste vide : aucune tranche. */
    public static List<int[]> decouper(long[] montants, long plafond) {
        List<int[]> tranches = new ArrayList<>();
        int debut = 0;
        long somme = 0;
        for (int i = 0; i < montants.length; i++) {
            if (i > debut && somme + montants[i] > plafond) {
                tranches.add(new int[] { debut, i });
                debut = i;
                somme = 0;
            }
            somme += montants[i];
        }
        if (debut < montants.length) {
            tranches.add(new int[] { debut, montants.length });
        }
        return tranches;
    }

    /**
     * Nombre de bons de la premiere facture, pour les ecrans qui ne font qu'une facture et laissent le reste a la
     * suivante. Liste vide : 0.
     */
    public static int premiereFacture(long[] montants, long plafond) {
        List<int[]> tranches = decouper(montants, plafond);
        return tranches.isEmpty() ? 0 : tranches.get(0)[1];
    }

    /** Montants des bons (int_PRICE de la part du tiers payant), dans l'ordre de la liste. */
    public static <T> long[] montants(List<T> bons, java.util.function.ToLongFunction<T> montant) {
        long[] m = new long[bons.size()];
        for (int i = 0; i < m.length; i++) {
            m[i] = montant.applyAsLong(bons.get(i));
        }
        return m;
    }
}
