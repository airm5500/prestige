package rest.service.calculation;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Regles des plafonds portes par la fiche du tiers payant, hors conteneur pour etre testables.
 *
 * <p>
 * Deux plafonds distincts :
 *
 * <ul>
 * <li>le <b>plafond par vente</b> ({@code dbl_PLAFOND_VENTE}) : valeur predefinie du plafond des liens client/tiers
 * payant. Il ne s'applique jamais directement a une vente - il ne fait qu'alimenter le plafond du lien, ou une valeur
 * saisie sur le client reste prioritaire ;</li>
 * <li>le <b>plafond de credit</b> ({@code dbl_PLAFOND_CREDIT}) : encours global de l'organisme. Une vente dont la part
 * tiers payant depasse ce qu'il en reste est REFUSEE - elle n'est pas ecretee en reportant la difference sur le
 * client.</li>
 * </ul>
 */
public final class PlafondsTiersPayant {

    private PlafondsTiersPayant() {
    }

    /**
     * Plafond initial d'un lien client/tiers payant : la valeur saisie sur le client prime ; a defaut, la valeur
     * predefinie par l'organisme ; sinon zero, qui veut dire « aucun plafond » et ne plafonne donc jamais a zero.
     *
     * @param valeurSaisieClient
     *            zone « Plafond vente » du formulaire client (0 = non renseignee)
     * @param plafondVenteTiersPayant
     *            plafond par vente de la fiche de l'organisme (null ou 0 = aucun)
     */
    public static double plafondInitialDuLien(double valeurSaisieClient, Double plafondVenteTiersPayant) {
        if (valeurSaisieClient > 0) {
            return valeurSaisieClient;
        }
        if (plafondVenteTiersPayant != null && plafondVenteTiersPayant > 0) {
            return plafondVenteTiersPayant;
        }
        return 0;
    }

    /**
     * Ce qu'il reste de l'encours autorise par le plafond de credit de l'organisme. Vide quand aucun plafond n'est
     * pose.
     */
    public static Optional<BigDecimal> encoursRestant(Double plafondCredit, Number consommationGlobale) {
        if (plafondCredit == null || plafondCredit <= 0) {
            return Optional.empty();
        }
        BigDecimal conso = consommationGlobale == null ? BigDecimal.ZERO
                : BigDecimal.valueOf(consommationGlobale.doubleValue());
        return Optional.of(BigDecimal.valueOf(plafondCredit).subtract(conso));
    }

    /**
     * Motif de refus de la vente, ou vide si elle peut passer.
     *
     * <p>
     * Le controle porte sur la part tiers payant seule - jamais sur le total de la vente - et tient compte de l'encours
     * deja consomme : un client dont l'organisme est deja au plafond ne passe plus, meme pour une petite vente.
     *
     * @param nomTiersPayant
     *            nom montre dans le message
     * @param plafondCredit
     *            plafond de credit de la fiche de l'organisme (null ou 0 = aucun controle)
     * @param consommationGlobale
     *            consommation deja enregistree pour l'organisme (null = 0)
     * @param partTiersPayant
     *            part de CETTE vente mise a la charge de l'organisme
     */
    public static Optional<String> motifDeRefus(String nomTiersPayant, Double plafondCredit, Number consommationGlobale,
            int partTiersPayant) {
        return encoursRestant(plafondCredit, consommationGlobale)
                .filter(reste -> BigDecimal.valueOf(partTiersPayant).compareTo(reste) > 0)
                .map(reste -> "Vente refusée : la part du tiers payant " + nomTiersPayant + " ("
                        + format(BigDecimal.valueOf(partTiersPayant))
                        + ") dépasse ce qu'il reste de son plafond de crédit (" + format(reste.max(BigDecimal.ZERO))
                        + " sur " + format(BigDecimal.valueOf(plafondCredit)) + ").");
    }

    private static String format(BigDecimal montant) {
        return montant.setScale(0, java.math.RoundingMode.HALF_UP).toPlainString();
    }
}
