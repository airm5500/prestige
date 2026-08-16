package rest.service.dto;

import java.math.BigDecimal;

/**
 * Une ligne du releve des factures de groupe : UNE facture de groupe.
 *
 * C'est exactement une ligne de l'ecran "Facture de groupes" (menu Facture de groupe) : meme numero, meme date
 * d'edition, memes montants. Le releve n'invente aucun chiffre, il reprend ceux de la liste.
 *
 * @author koben
 */
public class ReleveGroupeLigneDTO {

    private String codeFacture;
    private String dateEdition;
    private Integer nbFactures;
    private BigDecimal montantFacture;
    private BigDecimal montantRegle;
    private BigDecimal montantRestant;
    private String statut;

    public ReleveGroupeLigneDTO() {
    }

    public ReleveGroupeLigneDTO(String codeFacture, String dateEdition, Integer nbFactures, BigDecimal montantFacture,
            BigDecimal montantRegle, BigDecimal montantRestant, String statut) {
        this.codeFacture = codeFacture;
        this.dateEdition = dateEdition;
        this.nbFactures = nbFactures;
        this.montantFacture = montantFacture;
        this.montantRegle = montantRegle;
        this.montantRestant = montantRestant;
        this.statut = statut;
    }

    public String getCodeFacture() {
        return codeFacture;
    }

    public void setCodeFacture(String codeFacture) {
        this.codeFacture = codeFacture;
    }

    public String getDateEdition() {
        return dateEdition;
    }

    public void setDateEdition(String dateEdition) {
        this.dateEdition = dateEdition;
    }

    public Integer getNbFactures() {
        return nbFactures;
    }

    public void setNbFactures(Integer nbFactures) {
        this.nbFactures = nbFactures;
    }

    public BigDecimal getMontantFacture() {
        return montantFacture;
    }

    public void setMontantFacture(BigDecimal montantFacture) {
        this.montantFacture = montantFacture;
    }

    public BigDecimal getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(BigDecimal montantRegle) {
        this.montantRegle = montantRegle;
    }

    public BigDecimal getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(BigDecimal montantRestant) {
        this.montantRestant = montantRestant;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }
}
