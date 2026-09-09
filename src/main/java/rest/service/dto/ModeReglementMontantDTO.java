package rest.service.dto;

/**
 * Le montant encaisse sur un mode de reglement dans la balance vente / caisse (retour du 09/09, point 4).
 *
 * <p>
 * La balance ne connaissait les modes que par des colonnes fixes (especes, cheque, carte, virement, cinq operateurs
 * mobiles). La ventilation demandee liste TOUS les modes rencontres sur la periode, y compris un operateur mobile cree
 * par l'officine : c'est cet objet qui les porte, dans l'ordre d'affichage.
 * </p>
 */
public class ModeReglementMontantDTO {

    private final String modeId;
    private final String libelle;
    private final boolean mobile;
    private long montant;

    public ModeReglementMontantDTO(String modeId, String libelle, boolean mobile, long montant) {
        this.modeId = modeId;
        this.libelle = libelle;
        this.mobile = mobile;
        this.montant = montant;
    }

    public String getModeId() {
        return modeId;
    }

    public String getLibelle() {
        return libelle;
    }

    public boolean isMobile() {
        return mobile;
    }

    public long getMontant() {
        return montant;
    }

    public void ajouter(long valeur) {
        this.montant += valeur;
    }

    @Override
    public String toString() {
        return modeId + " " + libelle + (mobile ? " (mobile)" : "") + " = " + montant;
    }
}
