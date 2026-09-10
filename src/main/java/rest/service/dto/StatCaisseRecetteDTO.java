package rest.service.dto;

import java.time.LocalDate;

/**
 *
 * @author koben
 */
public class StatCaisseRecetteDTO {

    private LocalDate mvtDate;
    private String displayMvtDate;
    private long montantEspece;
    private long montantCredit;
    private long montantReglementDiff;
    private long montantHt;
    private long montantTtc;
    private long montantTva;
    private long montantNet;
    private long montantRemise;
    private long montantReglementFacture;
    private long montantMobile;
    /**
     * Repartition du montant mobile money par mode, dans l'ordre ou l'officine les a declares.
     *
     * <p>
     * Construite a partir des modes REELLEMENT presents sur la journee : rien n'est code en dur, un operateur cree par
     * l'officine y figure au meme titre qu'Orange ou Wave, et un operateur sans encaissement du jour n'y figure pas du
     * tout. La somme des montants de cette repartition vaut, par construction, {@code montantMobile}.
     * </p>
     */
    private final java.util.Map<String, Long> detailMobile = new java.util.LinkedHashMap<>();
    private long montantCb;
    private long montantCheque;
    private long montantVirement;
    private long montantBilletage;
    private long nbreClient;
    private long montantSolde;
    private long montantEntre;
    private long montantSortie;

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getDisplayMvtDate() {
        return displayMvtDate;
    }

    public long getMontantEntre() {
        return montantEntre;
    }

    public void setMontantEntre(long montantEntre) {
        this.montantEntre = montantEntre;
    }

    public long getMontantSortie() {
        return montantSortie;
    }

    public void setMontantSortie(long montantSortie) {
        this.montantSortie = montantSortie;
    }

    public void setDisplayMvtDate(String displayMvtDate) {
        this.displayMvtDate = displayMvtDate;
    }

    public long getMontantEspece() {
        return montantEspece;
    }

    public void setMontantEspece(long montantEspece) {
        this.montantEspece = montantEspece;
    }

    public long getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(long montantCredit) {
        this.montantCredit = montantCredit;
    }

    public long getMontantReglementDiff() {
        return montantReglementDiff;
    }

    public void setMontantReglementDiff(long montantReglementDiff) {
        this.montantReglementDiff = montantReglementDiff;
    }

    public long getMontantHt() {
        return montantHt;
    }

    public void setMontantHt(long montantHt) {
        this.montantHt = montantHt;
    }

    public long getMontantTtc() {
        return montantTtc;
    }

    public void setMontantTtc(long montantTtc) {
        this.montantTtc = montantTtc;
    }

    public long getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(long montantTva) {
        this.montantTva = montantTva;
    }

    public long getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(long montantNet) {
        this.montantNet = montantNet;
    }

    public long getMontantRemise() {
        return montantRemise;
    }

    public void setMontantRemise(long montantRemise) {
        this.montantRemise = montantRemise;
    }

    public long getMontantReglementFacture() {
        return montantReglementFacture;
    }

    public void setMontantReglementFacture(long montantReglementFacture) {
        this.montantReglementFacture = montantReglementFacture;
    }

    public long getMontantMobile() {
        return montantMobile;
    }

    public void setMontantMobile(long montantMobile) {
        this.montantMobile = montantMobile;
    }

    public long getMontantCb() {
        return montantCb;
    }

    public void setMontantCb(long montantCb) {
        this.montantCb = montantCb;
    }

    public long getMontantCheque() {
        return montantCheque;
    }

    public void setMontantCheque(long montantCheque) {
        this.montantCheque = montantCheque;
    }

    public long getMontantVirement() {
        return montantVirement;
    }

    public void setMontantVirement(long montantVirement) {
        this.montantVirement = montantVirement;
    }

    public long getMontantBilletage() {
        return montantBilletage;
    }

    public void setMontantBilletage(long montantBilletage) {
        this.montantBilletage = montantBilletage;
    }

    public long getNbreClient() {
        return nbreClient;
    }

    public void setNbreClient(long nbreClient) {
        this.nbreClient = nbreClient;
    }

    public long getMontantSolde() {
        return montantSolde;
    }

    public void setMontantSolde(long montantSolde) {
        this.montantSolde = montantSolde;
    }

    public java.util.Map<String, Long> getDetailMobile() {
        return detailMobile;
    }

    /**
     * Ecart entre le comptant et le billetage de la journee : positif quand la caisse contient plus que le comptant
     * attendu, negatif quand elle contient moins.
     *
     * <p>
     * L'ecart n'a de sens que si un billetage a ete saisi : sans billetage il n'y a rien a comparer, et afficher
     * l'oppose du comptant ferait croire a un manquant. {@link #isBilletageSaisi()} distingue les deux cas, l'ecran et
     * les editions affichant alors un tiret.
     * </p>
     */
    public long getMontantEcart() {
        return montantEspece - montantBilletage;
    }

    /** Vrai si un billetage a ete saisi pour la journee : sans lui, l'ecart ne se calcule pas. */
    public boolean isBilletageSaisi() {
        return montantBilletage != 0;
    }

    /**
     * Solde de la journee, tel que l'officine le definit : comptant + mobile + reglement tiers payant + reglement
     * differe.
     *
     * <p>
     * Le comptant ({@code montantEspece}) vient de {@code vente_reglement} : il porte donc deja les ventes payees en
     * especes ET la part en especes d'une vente a credit, chacune y etant une ligne de reglement a part entiere.
     * Cheque, carte bancaire et virement n'entrent PAS dans ce solde : ils ne passent pas par la caisse.
     * </p>
     */
    /**
     * Le solde de la journee : comptant + mobile + reglement tiers payant + reglement differe, puis (retours des tests
     * 4) les entrees de caisse en plus et les sorties de caisse en moins. Le fonds de caisse n'y entre pas.
     */
    public void calculerSolde() {
        this.montantSolde = montantEspece + montantMobile + montantReglementFacture + montantReglementDiff
                + montantEntre - montantSortie;
    }

    /** Vrai des qu'une entree ou une sortie de caisse a ete enregistree sur la journee. */
    public boolean aDesMouvementsDeCaisse() {
        return montantEntre != 0 || montantSortie != 0;
    }

    /** Ajoute la part d'un mode mobile money a la journee, et au total mobile. */
    public void ajouterDetailMobile(String libelle, long montant) {
        detailMobile.merge(libelle, montant, Long::sum);
        this.montantMobile += montant;
    }
}
