package rest.service.dto;

/**
 * Une cellule du tableau « evolution par mode de paiement » : une periode, un mode, un montant (retour du 09/09, point
 * 4). Le PDF croise ces cellules (periodes en ligne, modes en colonne) ; les rangs fixent l'ordre des deux axes.
 */
public class ModeParPeriodeDTO {

    private final String periode;
    private final int rangPeriode;
    private final String mode;
    private final int rangMode;
    private final long montant;

    public ModeParPeriodeDTO(String periode, int rangPeriode, String mode, int rangMode, long montant) {
        this.periode = periode;
        this.rangPeriode = rangPeriode;
        this.mode = mode;
        this.rangMode = rangMode;
        this.montant = montant;
    }

    public String getPeriode() {
        return periode;
    }

    public int getRangPeriode() {
        return rangPeriode;
    }

    public String getMode() {
        return mode;
    }

    public int getRangMode() {
        return rangMode;
    }

    public long getMontant() {
        return montant;
    }
}
