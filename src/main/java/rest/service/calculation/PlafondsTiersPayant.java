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
 * <li>le <b>plafond de credit</b> ({@code dbl_PLAFOND_CREDIT}) : encours global de l'organisme. La part tiers payant
 * d'une vente est ECRETEE a ce qu'il en reste (plafond moins consommation globale) : la difference passe a la charge du
 * client (especes ou autre reglement), exactement comme pour le plafond par vente. La vente n'est plus refusee - un
 * avertissement previent simplement la caisse.</li>
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
     * Part tiers payant ecretee a ce qu'il reste du plafond de credit de l'organisme.
     *
     * <p>
     * Sans plafond pose, la part passe entiere. Un organisme deja au plafond (ou au-dela) ne rembourse plus rien :
     * l'ecretage descend a zero, jamais en negatif. La difference est a la charge du client - c'est le meme
     * fonctionnement que le plafond par vente, il n'y a plus de refus de vente.
     *
     * @param plafondCredit
     *            plafond de credit de la fiche de l'organisme (null ou 0 = aucun ecretage)
     * @param consommationGlobale
     *            consommation deja enregistree pour l'organisme (null = 0)
     * @param partTiersPayant
     *            part de CETTE vente mise a la charge de l'organisme
     */
    public static BigDecimal partEcreteeAuCredit(Double plafondCredit, Number consommationGlobale,
            BigDecimal partTiersPayant) {
        return encoursRestant(plafondCredit, consommationGlobale)
                .map(reste -> partTiersPayant.min(reste.max(BigDecimal.ZERO))).orElse(partTiersPayant);
    }
}
