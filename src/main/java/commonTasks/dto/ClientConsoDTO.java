package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne du suivi global de consommation : cumuls d'achats par client sur une periode.
 */
public class ClientConsoDTO implements Serializable {

    private String clientId;
    private String client;
    private String contact;
    private long nbAchats;
    private long montant;
    private String dernierAchat;
    private String premierAchat;
    private long frequenceJours;
    private String habitude;

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClient() {
        return client;
    }

    public void setClient(String client) {
        this.client = client;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public long getNbAchats() {
        return nbAchats;
    }

    public void setNbAchats(long nbAchats) {
        this.nbAchats = nbAchats;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public String getDernierAchat() {
        return dernierAchat;
    }

    public void setDernierAchat(String dernierAchat) {
        this.dernierAchat = dernierAchat;
    }

    public String getPremierAchat() {
        return premierAchat;
    }

    public void setPremierAchat(String premierAchat) {
        this.premierAchat = premierAchat;
    }

    public long getFrequenceJours() {
        return frequenceJours;
    }

    public void setFrequenceJours(long frequenceJours) {
        this.frequenceJours = frequenceJours;
    }

    public String getHabitude() {
        return habitude;
    }

    public void setHabitude(String habitude) {
        this.habitude = habitude;
    }

    /** Telephone tel qu'enregistre sur la fiche (str_ADRESSE), pour les campagnes SMS / WhatsApp (point 2). */
    private String telephone;
    /** Consentement SMS / WhatsApp : null = non renseigne, true = accepte, false = refuse. */
    private Boolean consentSms;

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public Boolean getConsentSms() {
        return consentSms;
    }

    public void setConsentSms(Boolean consentSms) {
        this.consentSms = consentSms;
    }
}
