package rest.service.filtre;

import java.math.BigDecimal;

/**
 * Une ligne du recapitulatif par compte organisme (point 10).
 *
 * <p>
 * La procedure stockee rend des colonnes anonymes, recopiees jusqu'ici dans un porteur generique a huit champs
 * numerotes. Nommer les valeurs permet de filtrer, de trier, d'exporter et de regrouper sans avoir a se souvenir de ce
 * que contient « str_value7 ».
 */
public final class LigneRecapOrganisme {

    private String organisme;
    private String typeOrganisme;
    private String codeOrganisme;
    private String compteComptable;
    private String numeroCompte;
    private String debit;
    private String credit;
    private String solde;
    /** Groupe du tiers payant, resolu depuis le code organisme ; vide s'il n'en a pas. */
    private String groupe = "";

    public String getOrganisme() {
        return organisme;
    }

    public void setOrganisme(String organisme) {
        this.organisme = organisme;
    }

    public String getTypeOrganisme() {
        return typeOrganisme;
    }

    public void setTypeOrganisme(String typeOrganisme) {
        this.typeOrganisme = typeOrganisme;
    }

    public String getCodeOrganisme() {
        return codeOrganisme;
    }

    public void setCodeOrganisme(String codeOrganisme) {
        this.codeOrganisme = codeOrganisme;
    }

    public String getCompteComptable() {
        return compteComptable;
    }

    public void setCompteComptable(String compteComptable) {
        this.compteComptable = compteComptable;
    }

    public String getNumeroCompte() {
        return numeroCompte;
    }

    public void setNumeroCompte(String numeroCompte) {
        this.numeroCompte = numeroCompte;
    }

    public String getDebit() {
        return debit;
    }

    public void setDebit(String debit) {
        this.debit = debit;
    }

    public String getCredit() {
        return credit;
    }

    public void setCredit(String credit) {
        this.credit = credit;
    }

    public String getSolde() {
        return solde;
    }

    public void setSolde(String solde) {
        this.solde = solde;
    }

    /**
     * Montants sous forme de nombres, pour l'edition PDF : Jasper additionne les sous-totaux par groupe et le total
     * general, ce qu'il ne peut pas faire sur des chaines. Une valeur illisible vaut zero, une ligne isolee ne devant
     * pas faire echouer tout l'etat.
     */
    public BigDecimal getDebitNombre() {
        return nombre(debit);
    }

    public BigDecimal getCreditNombre() {
        return nombre(credit);
    }

    public BigDecimal getSoldeNombre() {
        return nombre(solde);
    }

    /** Libelle du groupe pour l'edition : « Sans groupe » plutot qu'une bande vide. */
    public String getGroupeLibelle() {
        return groupe == null || groupe.isBlank() ? "Sans groupe" : groupe;
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

    public String getGroupe() {
        return groupe;
    }

    public void setGroupe(String groupe) {
        this.groupe = groupe == null ? "" : groupe;
    }
}
