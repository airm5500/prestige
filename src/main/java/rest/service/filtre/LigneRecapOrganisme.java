package rest.service.filtre;

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

    public String getGroupe() {
        return groupe;
    }

    public void setGroupe(String groupe) {
        this.groupe = groupe == null ? "" : groupe;
    }
}
