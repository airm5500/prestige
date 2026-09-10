package commonTasks.dto;

import java.io.Serializable;

/** Un produit vendu pendant une garde, avec sa classe ABC calculee sur la fenetre exacte de la garde. */
public class GardeProduitDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String produitId = "";
    private String cip = "";
    private String libelle = "";
    private String classe = "";
    private long quantite;
    private long montant;
    /** Nombre de lignes de vente : deux ventes du meme produit font deux lignes, une seule ligne de palmares. */
    private int lignes;
    /** Part du produit dans le chiffre de la garde, en pourcentage. */
    private double part;
    /** Part cumulee jusqu'a ce produit inclus, en pourcentage. C'est elle qui montre l'effet de concentration. */
    private double cumulPart;

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

    public String getClasse() {
        return classe;
    }

    public void setClasse(String classe) {
        this.classe = classe;
    }

    public long getQuantite() {
        return quantite;
    }

    public void setQuantite(long quantite) {
        this.quantite = quantite;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public int getLignes() {
        return lignes;
    }

    public void setLignes(int lignes) {
        this.lignes = lignes;
    }

    public double getPart() {
        return part;
    }

    public void setPart(double part) {
        this.part = part;
    }

    public double getCumulPart() {
        return cumulPart;
    }

    public void setCumulPart(double cumulPart) {
        this.cumulPart = cumulPart;
    }
}
