package rest.service.dto;

/**
 *
 * @author koben
 */
public class NetComputedDTO {

    private final long plafondGlobal;
    private final int montantTiersPayant;
    private final int montantRestant;
    private final float taux;
    private final int plafondVente;
    private String tiersPayantName;
    private String compteClientId;

    public NetComputedDTO(int montantTiersPayant, int montantRestant, float taux, long plafondGlobal,
            int plafondVente) {
        this.montantTiersPayant = montantTiersPayant;
        this.montantRestant = montantRestant;
        this.taux = taux;
        this.plafondGlobal = plafondGlobal;
        this.plafondVente = plafondVente;

    }

    public String getTiersPayantName() {
        return tiersPayantName;
    }

    public void setTiersPayantName(String tiersPayantName) {
        this.tiersPayantName = tiersPayantName;
    }

    public String getCompteClientId() {
        return compteClientId;
    }

    public void setCompteClientId(String compteClientId) {
        this.compteClientId = compteClientId;
    }

    public long getPlafondGlobal() {
        return plafondGlobal;
    }

    public int getPlafondVente() {
        return plafondVente;
    }

    public int getMontantTiersPayant() {
        return montantTiersPayant;
    }

    public int getMontantRestant() {
        return montantRestant;
    }

    public float getTaux() {
        return taux;
    }

}
