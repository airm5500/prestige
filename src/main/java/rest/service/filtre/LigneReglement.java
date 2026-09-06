package rest.service.filtre;

import java.math.BigDecimal;

/**
 * Une ligne de la liste des reglements (point 21).
 *
 * <p>
 * Comme le recapitulatif par compte organisme, la liste vient d'une couche ancienne qui rend des valeurs numerotees.
 * Les nommer permet de filtrer, d'exporter et de regrouper sans avoir a se souvenir de ce que contient « str_value10 ».
 */
public final class LigneReglement {

    private String dossierId;
    private String organisme;
    private String typeTiersPayant;
    private String codeFacture;
    private String modeReglement;
    private String montantRegle;
    private String montantAttente;
    private String dateReglement;
    private String heureReglement;
    private String operateur;
    /** Groupe du tiers payant, resolu depuis le nom de l'organisme ; vide s'il n'en a pas. */
    private String groupe = "";

    public String getDossierId() {
        return dossierId;
    }

    public void setDossierId(String dossierId) {
        this.dossierId = dossierId;
    }

    public String getOrganisme() {
        return organisme;
    }

    public void setOrganisme(String organisme) {
        this.organisme = organisme;
    }

    public String getTypeTiersPayant() {
        return typeTiersPayant;
    }

    public void setTypeTiersPayant(String typeTiersPayant) {
        this.typeTiersPayant = typeTiersPayant;
    }

    public String getCodeFacture() {
        return codeFacture;
    }

    public void setCodeFacture(String codeFacture) {
        this.codeFacture = codeFacture;
    }

    public String getModeReglement() {
        return modeReglement;
    }

    public void setModeReglement(String modeReglement) {
        this.modeReglement = modeReglement;
    }

    public String getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(String montantRegle) {
        this.montantRegle = montantRegle;
    }

    public String getMontantAttente() {
        return montantAttente;
    }

    public void setMontantAttente(String montantAttente) {
        this.montantAttente = montantAttente;
    }

    public String getDateReglement() {
        return dateReglement;
    }

    public void setDateReglement(String dateReglement) {
        this.dateReglement = dateReglement;
    }

    public String getHeureReglement() {
        return heureReglement;
    }

    public void setHeureReglement(String heureReglement) {
        this.heureReglement = heureReglement;
    }

    public String getOperateur() {
        return operateur;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public String getGroupe() {
        return groupe;
    }

    public void setGroupe(String groupe) {
        this.groupe = groupe == null ? "" : groupe;
    }

    /** Libelle du groupe pour l'edition : « Sans groupe » plutot qu'une bande vide. */
    public String getGroupeLibelle() {
        return groupe == null || groupe.isBlank() ? "Sans groupe" : groupe;
    }

    /** Montants en nombres : Jasper additionne les sous-totaux, ce qu'il ne peut pas faire sur des chaines. */
    public BigDecimal getMontantRegleNombre() {
        return nombre(montantRegle);
    }

    public BigDecimal getMontantAttenteNombre() {
        return nombre(montantAttente);
    }

    private static BigDecimal nombre(String valeur) {
        if (valeur == null || valeur.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(valeur.trim().replace(" ", "").replace(",", "."));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
