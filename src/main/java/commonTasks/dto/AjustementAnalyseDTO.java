package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne de l'analyse des ajustements de stock : cumuls par produit sur une periode.
 */
public class AjustementAnalyseDTO implements Serializable {

    private String familleId;
    private String grossisteId;
    private String cip;
    private String name;
    private long nbAjustement;
    private long qtePositive;
    private long qteNegative;
    private long qteTotale;

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getNbAjustement() {
        return nbAjustement;
    }

    public void setNbAjustement(long nbAjustement) {
        this.nbAjustement = nbAjustement;
    }

    public long getQtePositive() {
        return qtePositive;
    }

    public void setQtePositive(long qtePositive) {
        this.qtePositive = qtePositive;
    }

    public long getQteNegative() {
        return qteNegative;
    }

    public void setQteNegative(long qteNegative) {
        this.qteNegative = qteNegative;
    }

    public long getQteTotale() {
        return qteTotale;
    }

    public void setQteTotale(long qteTotale) {
        this.qteTotale = qteTotale;
    }
}
