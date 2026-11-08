package rest.service.impl;

import java.util.List;

/**
 * Demande 59 (plan du 08/11) : cloture « entrer le reçu » d'un BL ({@code PUT v1/commande/validerbl/{id}?mode=RECU}).
 * Regles pures, sans base, verifiees par {@code ReceptionEcartCoherenceTest}.
 * <ul>
 * <li>ligne avec lots : entre la somme des lots (UG comprises, {@code int_NUMBER} des lots les compte), plafonnee a
 * commande + UG prevues, comme la cloture actuelle ;</li>
 * <li>ligne sans lot : rien n'entre (jamais la quantite commandee), tout manque ;</li>
 * <li>manquant = commande − reçu, jamais negatif ;</li>
 * <li>un BL dont aucune ligne n'a de lot est refuse (« aucun produit reçu ») ;</li>
 * <li>la peremption n'est controlee que sur les lots saisis.</li>
 * </ul>
 */
public final class ReceptionEcart {

    private ReceptionEcart() {
    }

    /** Resultat d'une ligne de BL. */
    public static final class Ligne {
        public final int commande;
        /** quantite entree en stock (= reçu) */
        public final int aEntrer;
        public final int recu;
        public final int ug;
        public final int manquant;
        public final boolean sansLot;

        Ligne(int commande, int aEntrer, int ug, boolean sansLot) {
            this.commande = commande;
            this.aEntrer = aEntrer;
            this.recu = aEntrer;
            this.ug = ug;
            this.manquant = Math.max(0, commande - aEntrer);
            this.sansLot = sansLot;
        }

        /** La ligne figure dans les ecarts : reçu &lt; commande. */
        public boolean enEcart() {
            return recu < commande;
        }
    }

    /** Totaux d'un BL. */
    public static final class Bilan {
        public final int totalEntree;
        public final int totalManquant;
        public final int lignesEnEcart;

        Bilan(int totalEntree, int totalManquant, int lignesEnEcart) {
            this.totalEntree = totalEntree;
            this.totalManquant = totalManquant;
            this.lignesEnEcart = lignesEnEcart;
        }
    }

    /**
     * @param commande
     *            {@code int_QTE_CMDE} de la ligne
     * @param ugPrevues
     *            {@code int_QTE_UG} de la ligne au moment de la cloture (sert au plafond actuel)
     * @param lots
     *            un tableau {intNUMBER, intNUMBERGRATUIT} par lot saisi
     */
    public static Ligne calculer(int commande, int ugPrevues, List<int[]> lots) {
        int cmde = Math.max(0, commande);
        if (lots == null || lots.isEmpty()) {
            return new Ligne(cmde, 0, 0, true);
        }
        int somme = 0, ug = 0;
        for (int[] l : lots) {
            somme += Math.max(0, l[0]);
            ug += Math.max(0, l[1]);
        }
        int plafond = cmde + Math.max(0, ugPrevues);
        return new Ligne(cmde, Math.min(somme, plafond), ug, false);
    }

    /** Vrai si aucune ligne n'a de lot (nombre de lots par ligne). */
    public static boolean aucunProduitRecu(List<Integer> nbLotsParLigne) {
        return nbLotsParLigne.stream().allMatch(n -> n == null || n == 0);
    }

    /**
     * Peremption obligatoire, produit suivi : la ligne est refusee si un lot saisi n'a pas de date ; dans les modes
     * actuels, aussi si la ligne n'a aucun lot (comportement inchange).
     */
    public static boolean peremptionManquante(boolean modeRecu, int nbLots, int lotsSansDate) {
        if (nbLots == 0) {
            return !modeRecu;
        }
        return lotsSansDate > 0;
    }

    public static Bilan bilan(List<Ligne> lignes) {
        int entree = 0, manquant = 0, ecarts = 0;
        for (Ligne l : lignes) {
            entree += l.aEntrer;
            manquant += l.manquant;
            ecarts += l.enEcart() ? 1 : 0;
        }
        return new Bilan(entree, manquant, ecarts);
    }
}
