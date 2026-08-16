package rest.service.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Resultat complet du releve des factures de groupe : les blocs (un par groupe) et les totaux generaux.
 *
 * Meme organisation que le releve des factures clients en compte (ReportTypeTiersPayantFactureDTO), pour que les deux
 * etats se lisent de la meme facon.
 *
 * @author koben
 */
public class ReleveGroupeFactureDTO {

    private List<ReleveGroupeDTO> groupes = new ArrayList<>();
    private BigDecimal montantFacture = BigDecimal.ZERO;
    private BigDecimal montantRegle = BigDecimal.ZERO;
    private BigDecimal montantRestant = BigDecimal.ZERO;
    private int nbFactures;

    public List<ReleveGroupeDTO> getGroupes() {
        return groupes;
    }

    public void setGroupes(List<ReleveGroupeDTO> groupes) {
        this.groupes = groupes;
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

    public int getNbFactures() {
        return nbFactures;
    }

    public void setNbFactures(int nbFactures) {
        this.nbFactures = nbFactures;
    }
}
