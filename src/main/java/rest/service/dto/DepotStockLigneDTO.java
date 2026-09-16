package rest.service.dto;

/**
 * Ligne de stock d'un depot d'extension (evolution 5, point 1) : ce que le depot detient, et ce que cela vaut.
 *
 * <p>
 * Les valorisations sont calculees a partir de la quantite detenue, et non stockees : elles ne peuvent donc pas se
 * desynchroniser du stock ni des prix.
 * </p>
 */
public class DepotStockLigneDTO {

    private String id;
    private String cip;
    private String nom;
    private String famille;
    private String emplacement;
    private int stock;
    private int prixAchat;
    private int prixVente;

    public DepotStockLigneDTO() {
    }

    public DepotStockLigneDTO(String id, String cip, String nom, String famille, String emplacement, int stock,
            int prixAchat, int prixVente) {
        this.id = id;
        this.cip = cip;
        this.nom = nom;
        this.famille = famille;
        this.emplacement = emplacement;
        this.stock = stock;
        this.prixAchat = prixAchat;
        this.prixVente = prixVente;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getFamille() {
        return famille;
    }

    public void setFamille(String famille) {
        this.famille = famille;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(String emplacement) {
        this.emplacement = emplacement;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public int getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(int prixVente) {
        this.prixVente = prixVente;
    }

    public long getValeurAchat() {
        return (long) stock * prixAchat;
    }

    public long getValeurVente() {
        return (long) stock * prixVente;
    }
}
