package rest.service.litige;

import org.apache.commons.lang3.StringUtils;

/**
 * Calculs de la cloture d'un litige tiers payant (sortis de LitigeServiceImpl, sans changement de comportement) :
 * montant accorde, ecart, encours du compte client, restant d'une facture. Verifies par ClotureLitigeCoherenceTest.
 */
public final class ClotureLitige {

    private ClotureLitige() {
    }

    /**
     * Montant accorde saisi : nombre entier entre 1 et la part d'origine.
     *
     * @return le montant, ou null s'il n'est pas un nombre entier
     */
    public static Integer montantAccorde(String saisie) {
        try {
            return Integer.parseInt(StringUtils.defaultString(saisie).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** vrai si le montant accorde est entre 1 et la part d'origine */
    public static boolean accordeValide(int accorde, int part) {
        return accorde > 0 && accorde <= part;
    }

    /** ce que l'organisme ne paiera pas : part d'origine - montant accorde (0 accorde = abandon, ecart = part) */
    public static int ecart(int part, int accorde) {
        return part - accorde;
    }

    /** encours du compte client diminue de l'ecart, jamais negatif */
    public static int encours(Integer consommation, int ecart) {
        return Math.max(0, (consommation == null ? 0 : consommation) - ecart);
    }

    /** le compte redevient utilisable si l'encours ne depasse plus le plafond */
    public static boolean utilisable(int encours, Integer plafond) {
        return encours <= (plafond == null ? 0 : plafond);
    }

    /** restant a recouvrer d'une facture (ou d'une ligne) diminue de l'ecart, jamais negatif */
    public static Double restant(Double restant, int ecart) {
        return Math.max(0d, (restant == null ? 0d : restant) - ecart);
    }
}
