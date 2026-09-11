package commonTasks.dto;

import java.io.Serializable;
import util.CalculMarge;

/**
 * Un produit vu par l'analyse article : ses ventes sur la periode, sa marge (formule unique {@link CalculMarge}), son
 * stock actuel, sa rotation et le quadrant marge x rotation qui en decoule.
 */
public class ArticleAnalyseDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String produitId = "";
    private String cip = "";
    private String libelle = "";
    private String familleId = "";
    private String rayonId = "";
    private String grossisteId = "";
    private long quantite;
    /** Nombre de tickets (ventes distinctes) portant le produit. */
    private long tickets;
    private long montant;
    private long remise;
    private long tva;
    /** Montant d'achat des quantites vendues (prix d'achat fige sur la ligne x quantite). */
    private long achat;
    private long stock;
    /** Nombre de jours de la periode analysee, pour la couverture. */
    private long jours = 1;
    private String classe = "";
    /** 1 champions, 2 rentables mais lents, 3 volume fort peu rentable, 4 a risque ; 0 tant que non affecte. */
    private int quadrant;

    public ArticleAnalyseDTO() {
    }

    public ArticleAnalyseDTO(String produitId, String cip, String libelle) {
        this.produitId = produitId;
        this.cip = cip;
        this.libelle = libelle;
    }

    /* ------------------------------------------------------------------ indicateurs derives */

    public long getMontantHt() {
        return CalculMarge.montantHt(montant, remise, tva);
    }

    public long getMarge() {
        return CalculMarge.marge(montant, remise, tva, achat);
    }

    public double getTauxMarge() {
        return CalculMarge.pourcentage(getMarge(), getMontantHt());
    }

    /**
     * Rotation : quantite vendue sur la periode rapportee au stock actuel. Sans stock, le produit s'est vendu jusqu'a
     * epuisement : sa rotation vaut la quantite vendue (comme s'il restait une unite), pour qu'il se range du cote des
     * rotations elevees et non a zero.
     */
    public double getRotation() {
        if (stock > 0) {
            return Math.round(quantite * 100D / stock) / 100D;
        }
        return quantite;
    }

    /** Jours de couverture : le stock actuel divise par la vente moyenne par jour ; 0 sans stock. */
    public double getCouverture() {
        if (stock <= 0) {
            return 0D;
        }
        if (quantite <= 0 || jours <= 0) {
            return -1D; // stock sans aucune vente : couverture infinie, signalee a part
        }
        return Math.round(stock * jours * 10D / quantite) / 10D;
    }

    /** Valeur du stock actuel au prix d'achat moyen des ventes de la periode. */
    public long getValeurStock() {
        if (quantite <= 0 || stock <= 0) {
            return 0L;
        }
        return Math.round(stock * (double) achat / quantite);
    }

    /* ------------------------------------------------------------------ accesseurs */

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getFamilleId() {
        return familleId;
    }

    public String getRayonId() {
        return rayonId;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setRattachements(String familleId, String rayonId, String grossisteId) {
        this.familleId = familleId == null ? "" : familleId;
        this.rayonId = rayonId == null ? "" : rayonId;
        this.grossisteId = grossisteId == null ? "" : grossisteId;
    }

    public long getQuantite() {
        return quantite;
    }

    public void setQuantite(long quantite) {
        this.quantite = quantite;
    }

    public long getTickets() {
        return tickets;
    }

    public void setTickets(long tickets) {
        this.tickets = tickets;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public long getRemise() {
        return remise;
    }

    public void setRemise(long remise) {
        this.remise = remise;
    }

    public long getTva() {
        return tva;
    }

    public void setTva(long tva) {
        this.tva = tva;
    }

    public long getAchat() {
        return achat;
    }

    public void setAchat(long achat) {
        this.achat = achat;
    }

    public long getStock() {
        return stock;
    }

    public void setStock(long stock) {
        this.stock = stock;
    }

    public long getJours() {
        return jours;
    }

    public void setJours(long jours) {
        this.jours = jours;
    }

    public String getClasse() {
        return classe;
    }

    public void setClasse(String classe) {
        this.classe = classe == null ? "" : classe;
    }

    public int getQuadrant() {
        return quadrant;
    }

    public void setQuadrant(int quadrant) {
        this.quadrant = quadrant;
    }
}
