package commonTasks.dto;

import java.io.Serializable;

/** Une ligne de l'edition « Suivi équivalence » (Excel et PDF) : un produit dans son groupe de DCI. */
public class SuiviEquivalenceLigneDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String groupe;
    private Integer rang;
    private String cip;
    private String libelle;
    private String equivalence;
    private Long quantite;
    private Double part;
    private Long montant;
    private Long marge;
    private Long stock;
    private String couverture;
    private String derniereVente;
    private String repere;

    public String getGroupe() {
        return groupe;
    }

    public void setGroupe(String groupe) {
        this.groupe = groupe;
    }

    public Integer getRang() {
        return rang;
    }

    public void setRang(Integer rang) {
        this.rang = rang;
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

    public String getEquivalence() {
        return equivalence;
    }

    public void setEquivalence(String equivalence) {
        this.equivalence = equivalence;
    }

    public Long getQuantite() {
        return quantite;
    }

    public void setQuantite(Long quantite) {
        this.quantite = quantite;
    }

    public Double getPart() {
        return part;
    }

    public void setPart(Double part) {
        this.part = part;
    }

    public Long getMontant() {
        return montant;
    }

    public void setMontant(Long montant) {
        this.montant = montant;
    }

    public Long getMarge() {
        return marge;
    }

    public void setMarge(Long marge) {
        this.marge = marge;
    }

    public Long getStock() {
        return stock;
    }

    public void setStock(Long stock) {
        this.stock = stock;
    }

    public String getCouverture() {
        return couverture;
    }

    public void setCouverture(String couverture) {
        this.couverture = couverture;
    }

    public String getDerniereVente() {
        return derniereVente;
    }

    public void setDerniereVente(String derniereVente) {
        this.derniereVente = derniereVente;
    }

    public String getRepere() {
        return repere;
    }

    public void setRepere(String repere) {
        this.repere = repere;
    }
}
