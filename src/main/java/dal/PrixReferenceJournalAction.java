package dal;

/**
 * Action journalisee sur un prix de reference (cas 2 du 03/11/2026, Q2.6).
 */
public enum PrixReferenceJournalAction {
    AJOUT("Ajout"), MODIFICATION("Modification"), SUPPRESSION("Suppression"),
    /** Plan du 06/11, point 5.1 : la vente qui a pose le prix est annulee ; le prix reste sur la fiche. */
    ANNULATION("Annulation de la vente");

    private final String libelle;

    PrixReferenceJournalAction(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
