package util;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * La regle unique « ce type de reglement est-il du mobile money ? ».
 *
 * <p>
 * Jusqu'ici la reponse etait codee en dur, en une dizaine d'endroits, sous forme de listes d'identifiants (Orange, MTN,
 * Moov, Wave, Djamo...). Un mode de reglement cree par l'officine n'etait donc reconnu nulle part : ni par la vente, ni
 * par les rapports de caisse, ni par le ticket Z. La reference est desormais la categorie du type de reglement en base
 * (colonne str_CATEGORIE, valeur MOBILE_MONEY), chargee au demarrage et a chaque creation par
 * {@link rest.service.impl.MobileMoneyCache}.
 *
 * <p>
 * Les sept operateurs historiques restent reconnus meme si la base n'a pas encore ete migree : c'est ce qui garantit
 * qu'aucun rapport ne change de valeur a la mise a jour.
 */
public final class MobileMoney {

    /** Valeur de la categorie en base pour un type mobile money. */
    public static final String CATEGORIE_MOBILE_MONEY = "MOBILE_MONEY";
    /** Valeur de la categorie pour tout autre type. */
    public static final String CATEGORIE_STANDARD = "STANDARD";

    /** Les operateurs historiques, reconnus quoi qu'il arrive : 7 Orange, 8 Moov, 9 MTN, 10 Wave, 19 Djamo, 70, 80. */
    private static final Set<String> HISTORIQUES = Set.of(Constant.TYPE_REGLEMENT_ORANGE, Constant.MODE_MOOV,
            Constant.MODE_MTN, Constant.MODE_WAVE, Constant.MODE_DJAMO, "70", "80");

    private static volatile Set<String> depuisLaBase = Collections.emptySet();

    private MobileMoney() {
    }

    /** Un type de reglement est-il du mobile money ? Operateurs historiques, ou categorie MOBILE_MONEY en base. */
    public static boolean est(String typeReglementId) {
        if (typeReglementId == null) {
            return false;
        }
        return HISTORIQUES.contains(typeReglementId) || depuisLaBase.contains(typeReglementId);
    }

    /** Type mobile money qui n'est pas un des cinq operateurs a colonne propre dans les rapports. */
    public static boolean estAutreOperateur(String typeReglementId) {
        return est(typeReglementId) && !Constant.TYPE_REGLEMENT_ORANGE.equals(typeReglementId)
                && !Constant.MODE_MOOV.equals(typeReglementId) && !Constant.MODE_MTN.equals(typeReglementId)
                && !Constant.MODE_WAVE.equals(typeReglementId) && !Constant.MODE_DJAMO.equals(typeReglementId);
    }

    /** Tous les identifiants reconnus, historiques et base confondus. */
    public static Set<String> identifiants() {
        Set<String> tous = new HashSet<>(HISTORIQUES);
        tous.addAll(depuisLaBase);
        return Collections.unmodifiableSet(tous);
    }

    /** Remplace la liste venue de la base (appele au demarrage et apres chaque creation de type). */
    public static void definirDepuisLaBase(Set<String> identifiants) {
        depuisLaBase = identifiants == null ? Collections.emptySet()
                : Collections.unmodifiableSet(new HashSet<>(identifiants));
    }

    /** Vrai si la categorie lue en base est celle du mobile money. */
    public static boolean estCategorieMobileMoney(String categorie) {
        return CATEGORIE_MOBILE_MONEY.equalsIgnoreCase(categorie == null ? "" : categorie.trim());
    }
}
