package commonTasks.dto;

import java.time.LocalDate;
import java.util.Date;
import org.json.JSONObject;

/** Une ligne de la liste « Rappels et piluliers à préparer » (plan d'octobre, section 4.1). */
public class RappelHabitudeDTO {

    private String id;
    private String clientId;
    private String client;
    private String telephone;
    /** null = jamais renseigne, true / false = accepte / refuse. */
    private Boolean consentSms;
    private boolean msgMedicaments;
    private String familleId;
    private String cip;
    private String produit;
    private int stock;
    private LocalDate dernierAchat;
    private LocalDate prevu;
    private int frequence;
    private int achats;
    private String statut;
    private Date envoi;
    private String traitePar;

    public JSONObject toJson() {
        return new JSONObject().put("id", id).put("clientId", clientId).put("client", client)
                .put("telephone", telephone == null ? "" : telephone)
                .put("consentSms", consentSms == null ? JSONObject.NULL : consentSms)
                .put("msgMedicaments", msgMedicaments).put("familleId", familleId).put("cip", cip == null ? "" : cip)
                .put("produit", produit).put("stock", stock)
                .put("dernierAchat", dernierAchat == null ? "" : dernierAchat.toString())
                .put("prevu", prevu == null ? "" : prevu.toString()).put("frequence", frequence).put("achats", achats)
                .put("statut", statut).put("envoi", envoi == null ? JSONObject.NULL : envoi.getTime())
                .put("traitePar", traitePar == null ? "" : traitePar);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

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

    public boolean isMsgMedicaments() {
        return msgMedicaments;
    }

    public void setMsgMedicaments(boolean msgMedicaments) {
        this.msgMedicaments = msgMedicaments;
    }

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getProduit() {
        return produit;
    }

    public void setProduit(String produit) {
        this.produit = produit;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public LocalDate getDernierAchat() {
        return dernierAchat;
    }

    public void setDernierAchat(LocalDate dernierAchat) {
        this.dernierAchat = dernierAchat;
    }

    public LocalDate getPrevu() {
        return prevu;
    }

    public void setPrevu(LocalDate prevu) {
        this.prevu = prevu;
    }

    public int getFrequence() {
        return frequence;
    }

    public void setFrequence(int frequence) {
        this.frequence = frequence;
    }

    public int getAchats() {
        return achats;
    }

    public void setAchats(int achats) {
        this.achats = achats;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Date getEnvoi() {
        return envoi;
    }

    public void setEnvoi(Date envoi) {
        this.envoi = envoi;
    }

    public String getTraitePar() {
        return traitePar;
    }

    public void setTraitePar(String traitePar) {
        this.traitePar = traitePar;
    }
}
