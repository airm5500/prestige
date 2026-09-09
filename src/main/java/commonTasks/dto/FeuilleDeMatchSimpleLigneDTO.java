package commonTasks.dto;

import java.io.Serializable;

/**
 * Une ligne de la feuille de match SIMPLE (retour du 09/09) : le rang, le produit, son CIP13, les unites gratuites, les
 * quantites achetees et la frequence d'achat sur la periode.
 */
public class FeuilleDeMatchSimpleLigneDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String produitId = "";
    private String rang = "";
    private String produit = "";
    private String cip13 = "";
    private long ug;
    private long quantite;
    private long frequence;
    /** Quantite vendue sur la periode (retour des tests du 09/09, point 3). */
    private long quantiteVendue;

    public FeuilleDeMatchSimpleLigneDTO() {
    }

    public FeuilleDeMatchSimpleLigneDTO(String produitId, String produit, String cip13, long ug, long quantite,
            long frequence) {
        this.produitId = produitId == null ? "" : produitId;
        this.produit = produit == null ? "" : produit;
        this.cip13 = cip13 == null ? "" : cip13;
        this.ug = ug;
        this.quantite = quantite;
        this.frequence = frequence;
    }

    public FeuilleDeMatchSimpleLigneDTO(String produitId, String produit, String cip13, long ug, long quantite,
            long frequence, long quantiteVendue) {
        this(produitId, produit, cip13, ug, quantite, frequence);
        this.quantiteVendue = quantiteVendue;
    }

    public long getQuantiteVendue() {
        return quantiteVendue;
    }

    public String getProduitId() {
        return produitId;
    }

    public String getRang() {
        return rang;
    }

    public void setRang(String rang) {
        this.rang = rang == null ? "" : rang;
    }

    public String getProduit() {
        return produit;
    }

    public String getCip13() {
        return cip13;
    }

    public long getUg() {
        return ug;
    }

    public long getQuantite() {
        return quantite;
    }

    public long getFrequence() {
        return frequence;
    }
}
