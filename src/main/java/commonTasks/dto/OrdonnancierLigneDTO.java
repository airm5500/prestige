package commonTasks.dto;

import java.io.Serializable;

/**
 * Une ligne du registre de l'ordonnancier : un produit soumis a ordonnance delivre lors d'une vente.
 *
 * <p>
 * L'ecran presente une ligne par VENTE, avec le detail des produits sous le (+). L'edition et l'export, eux, ont besoin
 * d'un tableau plat : le registre de l'ordonnancier se lit produit par produit, puisque c'est la delivrance du produit
 * reglemente qui doit etre tracable, pas la vente qui la contient.
 * </p>
 */
public class OrdonnancierLigneDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String date = "";
    private String heure = "";
    private String reference = "";
    private String client = "";
    private String medecin = "";
    private String numeroOrdre = "";
    private String cip = "";
    private String produit = "";
    private String codeTableau = "";
    private Integer quantite = 0;
    private Integer montant = 0;
    private String vendeur = "";

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getClient() {
        return client;
    }

    public void setClient(String client) {
        this.client = client;
    }

    public String getMedecin() {
        return medecin;
    }

    public void setMedecin(String medecin) {
        this.medecin = medecin;
    }

    public String getNumeroOrdre() {
        return numeroOrdre;
    }

    public void setNumeroOrdre(String numeroOrdre) {
        this.numeroOrdre = numeroOrdre;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getProduit() {
        return produit;
    }

    public void setProduit(String produit) {
        this.produit = produit;
    }

    public String getCodeTableau() {
        return codeTableau;
    }

    public void setCodeTableau(String codeTableau) {
        this.codeTableau = codeTableau;
    }

    public Integer getQuantite() {
        return quantite;
    }

    public void setQuantite(Integer quantite) {
        this.quantite = quantite;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public String getVendeur() {
        return vendeur;
    }

    public void setVendeur(String vendeur) {
        this.vendeur = vendeur;
    }
}
