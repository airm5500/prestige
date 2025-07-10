
package commonTasks.dto;

/**
 *
 * @author koben
 */
public class RecapActiviteReglementDTO {
    private final long montant;
    private final String libelle;

    public RecapActiviteReglementDTO(String libelle, long montant) {
        this.montant = montant;
        this.libelle = libelle;
    }

    public long getMontant() {
        return montant;
    }

    public String getLibelle() {
        return libelle;
    }

}
