package commonTasks.dto;

import java.io.Serializable;

/** Un reglement d'une vente de la garde (H2) : le mode et le montant attendu dans ce mode. */
public class GardeReglementDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String venteId;
    private final String typeReglementId;
    private final long montant;

    public GardeReglementDTO(String venteId, String typeReglementId, long montant) {
        this.venteId = venteId == null ? "" : venteId;
        this.typeReglementId = typeReglementId == null ? "" : typeReglementId;
        this.montant = montant;
    }

    public String getVenteId() {
        return venteId;
    }

    public String getTypeReglementId() {
        return typeReglementId;
    }

    public long getMontant() {
        return montant;
    }
}
