package dal;

/**
 * Action journalisee sur un prix de reference (cas 2 du 03/11/2026, Q2.6).
 */
public enum PrixReferenceJournalAction {
    AJOUT("Ajout"), MODIFICATION("Modification"), SUPPRESSION("Suppression");

    private final String libelle;

    PrixReferenceJournalAction(String libelle) {
        this.libelle = libelle;
    }

    public String getLibelle() {
        return libelle;
    }
}
