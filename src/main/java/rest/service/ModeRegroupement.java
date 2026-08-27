package rest.service;

/**
 * Mode de regroupement du releve des factures de groupe (menu Facture de groupe).
 *
 * <p>
 * Ces deux valeurs et la regle qui les choisit vivaient sur l'interface {@link ReleveGroupeFactureService}. Le
 * conteneur inspecte les methodes des interfaces {@code @Local} pour les apparier a celles du bean : une methode
 * statique n'ayant pas d'equivalent dans l'implementation, Payara ouvrait un avertissement au deploiement. La regle
 * n'appartenait de toute facon pas au contrat de l'EJB : elle s'applique au parametre <em>avant</em> l'appel.
 */
public final class ModeRegroupement {

    /** Un bloc par facture de groupe : c'est le decoupage de la liste a l'ecran. */
    public static final String PAR_FACTURE_DE_GROUPE = "facture";

    /** Un bloc par organisme, toutes ses factures de la periode rassemblees. */
    public static final String PAR_TIERS_PAYANT = "tierspayant";

    private ModeRegroupement() {
    }

    /**
     * Ramene ce que demande l'ecran a l'un des deux modes connus.
     *
     * Tout ce qui n'est pas explicitement "par tiers payant" - valeur absente, vide ou inattendue - reste le decoupage
     * de la liste a l'ecran : une edition doit sortir, jamais echouer sur un parametre mal forme.
     */
    public static String normaliser(String demande) {
        return demande != null && PAR_TIERS_PAYANT.equalsIgnoreCase(demande.trim()) ? PAR_TIERS_PAYANT
                : PAR_FACTURE_DE_GROUPE;
    }
}
