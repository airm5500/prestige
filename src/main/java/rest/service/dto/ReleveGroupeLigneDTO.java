package rest.service.dto;

import java.math.BigDecimal;

/**
 * Une ligne du releve des factures de groupe : UNE facture, donc UN tiers payant.
 *
 * Une facture de groupe rassemble plusieurs factures, une par organisme. Le releve descend a ce niveau de detail pour
 * qu'on sache a QUI appartient chaque facture ; le numero et la date de la facture de groupe sont rappeles sur la ligne
 * (codeFactureGroupe / dateEdition) et servent a regrouper les lignes dans l'etat.
 *
 * @author koben
 */
public class ReleveGroupeLigneDTO {

    private String codeFactureGroupe;
    private String dateEdition;
    private String codeFacture;
    private String tiersPayant;
    private BigDecimal montantFacture;
    private BigDecimal montantRegle;
    private BigDecimal montantRestant;
    private String statut;

    public ReleveGroupeLigneDTO() {
    }

    public ReleveGroupeLigneDTO(String codeFactureGroupe, String dateEdition, String codeFacture, String tiersPayant,
            BigDecimal montantFacture, BigDecimal montantRegle, BigDecimal montantRestant, String statut) {
        this.codeFactureGroupe = codeFactureGroupe;
        this.dateEdition = dateEdition;
        this.codeFacture = codeFacture;
        this.tiersPayant = tiersPayant;
        this.montantFacture = montantFacture;
        this.montantRegle = montantRegle;
        this.montantRestant = montantRestant;
        this.statut = statut;
    }

    public String getCodeFactureGroupe() {
        return codeFactureGroupe;
    }

    public void setCodeFactureGroupe(String codeFactureGroupe) {
        this.codeFactureGroupe = codeFactureGroupe;
    }

    public String getDateEdition() {
        return dateEdition;
    }

    public void setDateEdition(String dateEdition) {
        this.dateEdition = dateEdition;
    }

    public String getCodeFacture() {
        return codeFacture;
    }

    public void setCodeFacture(String codeFacture) {
        this.codeFacture = codeFacture;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(String tiersPayant) {
        this.tiersPayant = tiersPayant;
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
