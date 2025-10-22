package dal;

/**
 *
 * @author koben
 */
public enum PrixReferenceType {
    PRIX_REFERENCE("Prix de référence assusrance"), TAUX("Taux de remboursement produit"),
    MIX_TAUX_PRIX("Taux de remboursement et Prix de référence");

    private final String libelle;

    private PrixReferenceType(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }

}
