package rest.service.dto;

/**
 *
 * @author koben
 */
public class ArticleVenduDTO {

    private int numberOfTime;
    private String produitId;
    private int quantity;
    private String cip;
    private String produitName;
    private int prixAchat;
    private int prixUni;
    private String userId;
    private String firstName;
    private String lastName;
    private String abrName;

    public String getUserId() {
        return userId;
    }

    public void setAbrName(String abrName) {
        this.abrName = abrName;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public int getNumberOfTime() {
        return numberOfTime;
    }

    public void setNumberOfTime(int numberOfTime) {
        this.numberOfTime = numberOfTime;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getProduitName() {
        return produitName;
    }

    public void setProduitName(String produitName) {
        this.produitName = produitName;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public int getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(int prixUni) {
        this.prixUni = prixUni;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getAbrName() {
        abrName = firstName.charAt(0) + "." + lastName;
        return abrName;
    }

}
