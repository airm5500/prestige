
package dal;

/**
 *
 * @author koben
 */
public enum PrixReferenceType {
    PRIX_REFERENCE("Prix de référence assusrance"), TAUX("Taux de remboursement produit");

    private final String libelle;

    private PrixReferenceType(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }

}
