package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne du suivi de consommation d'un client : cumuls par produit sur une periode.
 */
public class ClientConsoProduitDTO implements Serializable {

    private String cip;
    private String name;
    private String dernierAchat;
    private long nbAchats;
    private long qteTotale;
    private double qteMoyenne;
    private long frequenceJours;
    private long montant;
    private String habitude;

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

    public String getDernierAchat() {
        return dernierAchat;
    }

    public void setDernierAchat(String dernierAchat) {
        this.dernierAchat = dernierAchat;
    }

    public long getNbAchats() {
        return nbAchats;
    }

    public void setNbAchats(long nbAchats) {
        this.nbAchats = nbAchats;
    }

    public long getQteTotale() {
        return qteTotale;
    }

    public void setQteTotale(long qteTotale) {
        this.qteTotale = qteTotale;
    }

    public double getQteMoyenne() {
        return qteMoyenne;
    }

    public void setQteMoyenne(double qteMoyenne) {
        this.qteMoyenne = qteMoyenne;
    }

    public long getFrequenceJours() {
        return frequenceJours;
    }

    public void setFrequenceJours(long frequenceJours) {
        this.frequenceJours = frequenceJours;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public String getHabitude() {
        return habitude;
    }

    public void setHabitude(String habitude) {
        this.habitude = habitude;
    }
}
