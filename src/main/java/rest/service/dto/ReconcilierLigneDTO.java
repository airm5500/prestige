package rest.service.dto;

public class ReconcilierLigneDTO {

    private String orderId;
    private String familleId;
    private int qty;
    private int prixAchat;
    private int prixUn;
    private int ug;

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getFamilleId() {
        return familleId;
    }

    public void setFamilleId(String familleId) {
        this.familleId = familleId;
    }

    public int getQty() {
        return qty;
    }

    public void setQty(int qty) {
        this.qty = qty;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public int getPrixUn() {
        return prixUn;
    }

    public void setPrixUn(int prixUn) {
        this.prixUn = prixUn;
    }

    public int getUg() {
        return ug;
    }

    public void setUg(int ug) {
        this.ug = ug;
    }
}
