package commonTasks.dto;

/**
 *
 * @author koben
 */
public class MontantTp {

    private String compteClientTiersPayantId;
    private int montant;

    public String getCompteClientTiersPayantId() {
        return compteClientTiersPayantId;
    }

    public void setCompteClientTiersPayantId(String compteClientTiersPayantId) {
        this.compteClientTiersPayantId = compteClientTiersPayantId;
    }

    public int getMontant() {
        return montant;
    }

    public void setMontant(int montant) {
        this.montant = montant;
    }

    @Override
    public String toString() {
        return "MontantTp{" + "compteClientTiersPayantId=" + compteClientTiersPayantId + ", montant=" + montant + '}';
    }

}
