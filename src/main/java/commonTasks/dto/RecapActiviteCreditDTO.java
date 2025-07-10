package commonTasks.dto;

/**
 *
 * @author koben
 */
public class RecapActiviteCreditDTO {

    private final String libelleTiersPayant;
    private final String libelleTypeTiersPayant;
    private final long montant;
    private final long nbreClient;
    private final long nbreBons;

    public RecapActiviteCreditDTO(String libelleTiersPayant, String libelleTypeTiersPayant, long montant,
            long nbreClient, long nbreBons) {
        this.libelleTiersPayant = libelleTiersPayant;
        this.libelleTypeTiersPayant = libelleTypeTiersPayant;
        this.montant = montant;
        this.nbreClient = nbreClient;
        this.nbreBons = nbreBons;

    }

    public RecapActiviteCreditDTO(long montant, long nbreClient, long nbreBons) {
        this.libelleTiersPayant = null;
        this.libelleTypeTiersPayant = null;
        this.montant = montant;
        this.nbreClient = nbreClient;
        this.nbreBons = nbreBons;

    }

    public String getLibelleTiersPayant() {
        return libelleTiersPayant;
    }

    public String getLibelleTypeTiersPayant() {
        return libelleTypeTiersPayant;
    }

    public long getNbreClient() {
        return nbreClient;
    }

    public long getNbreBons() {
        return nbreBons;
    }

    public long getMontant() {
        return montant;
    }

}
