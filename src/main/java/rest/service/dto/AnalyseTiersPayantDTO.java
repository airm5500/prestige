package rest.service.dto;

/**
 * Une ligne de l'analyse des tiers payants : soit un tiers payant, soit un produit vendu a un tiers payant, selon le
 * niveau demande.
 *
 * Les montants sont ceux des lignes de vente des ventes couvertes par le tiers payant. La marge suit la formule deja en
 * place dans l'analyse 20/80 du chiffre d'affaires : chiffre d'affaires hors taxes et net de remise, diminue du prix
 * d'achat reel porte par la ligne de vente.
 *
 * @author koben
 */
public class AnalyseTiersPayantDTO {

    private String tiersPayantId;
    private String tiersPayant;
    private String cip;
    private String designation;
    private long nbVentes;
    private long quantite;
    private long caTtc;
    private long caHt;
    private long montantAchat;
    private long marge;
    /** Part prise en charge par le tiers payant sur la periode. Renseignee au niveau tiers payant seulement. */
    private long partTiersPayant;

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(String tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public long getNbVentes() {
        return nbVentes;
    }

    public void setNbVentes(long nbVentes) {
        this.nbVentes = nbVentes;
    }

    public long getQuantite() {
        return quantite;
    }

    public void setQuantite(long quantite) {
        this.quantite = quantite;
    }

    public long getCaTtc() {
        return caTtc;
    }

    public void setCaTtc(long caTtc) {
        this.caTtc = caTtc;
    }

    public long getCaHt() {
        return caHt;
    }

    public void setCaHt(long caHt) {
        this.caHt = caHt;
    }

    public long getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(long montantAchat) {
        this.montantAchat = montantAchat;
    }

    public long getMarge() {
        return marge;
    }

    public void setMarge(long marge) {
        this.marge = marge;
    }

    public long getPartTiersPayant() {
        return partTiersPayant;
    }

    public void setPartTiersPayant(long partTiersPayant) {
        this.partTiersPayant = partTiersPayant;
    }

    /** Reste a la charge du client : ce que la vente a encaisse en dehors de la part du tiers payant. */
    public long getPartClient() {
        return caTtc - partTiersPayant;
    }

    /**
     * Marge rapportee au chiffre d'affaires hors taxes, en pourcentage. Zero quand le chiffre d'affaires est nul :
     * afficher un taux sur une base nulle n'aurait pas de sens.
     */
    public double getTauxMarge() {
        return tauxMarge(marge, caHt);
    }

    public static double tauxMarge(long marge, long caHt) {
        if (caHt == 0L) {
            return 0d;
        }
        return Math.round(marge * 10000d / caHt) / 100d;
    }
}
