package util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * La formule unique de calcul de la marge (point 19).
 *
 * <p>
 * Plusieurs formules coexistaient : l'analyse tiers payant retirait la TVA, le carnet depot prenait le prix d'achat
 * COURANT de la fiche article, la balance encore autre chose. Deux ecrans pouvaient donc annoncer deux marges
 * differentes sur la meme periode, sans qu'on sache lequel croire.
 *
 * <p>
 * La reference retenue est celle de l'ecran <b>« Marge sur produits »</b> du menu Analyse de gestion, deja utilise en
 * officine :
 *
 * <pre>
 *   montant HT     = prix de vente - remise - TVA
 *   montant d'achat = prix d'achat de la LIGNE x quantite
 *   marge          = montant HT - montant d'achat
 *   % de marge     = marge / montant HT x 100
 * </pre>
 *
 * <p>
 * Deux points meritent d'etre dits, parce qu'ils ne vont pas de soi :
 *
 * <ul>
 * <li>le prix d'achat est celui <b>enregistre sur la ligne de vente</b> ({@code prixAchat}), fige au moment de la
 * vente. Prendre le prix d'achat courant de la fiche article ferait changer retroactivement la marge d'une vente de
 * janvier a chaque revision de tarif fournisseur ;</li>
 * <li>le pourcentage se rapporte au <b>montant HT</b>, et non au montant d'achat : c'est un taux de marque, celui que
 * l'ecran de reference affiche depuis toujours.</li>
 * </ul>
 */
public final class CalculMarge {

    private CalculMarge() {
    }

    /** Montant hors taxes : prix de vente diminue de la remise accordee et de la TVA collectee. */
    public static long montantHt(long montantTtc, long remise, long tva) {
        return montantTtc - remise - tva;
    }

    /** Marge en valeur : ce qui reste du montant hors taxes une fois l'achat paye. */
    public static long marge(long montantTtc, long remise, long tva, long montantAchat) {
        return montantHt(montantTtc, remise, tva) - montantAchat;
    }

    /**
     * Marge en pourcentage du montant hors taxes, a une decimale.
     *
     * <p>
     * Rend {@code 0} quand le montant hors taxes est nul : la division n'aurait pas de sens, et l'ecran de reference
     * produisait dans ce cas une valeur infinie qui s'affichait « NaN ».
     */
    public static double pourcentage(long marge, long montantHt) {
        if (montantHt == 0) {
            return 0d;
        }
        return BigDecimal.valueOf(marge).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(montantHt), 1, RoundingMode.HALF_UP).doubleValue();
    }

    /** Marge en pourcentage a partir des montants bruts, sans avoir a calculer le hors taxes soi-meme. */
    public static double pourcentage(long montantTtc, long remise, long tva, long montantAchat) {
        return pourcentage(marge(montantTtc, remise, tva, montantAchat), montantHt(montantTtc, remise, tva));
    }
}
