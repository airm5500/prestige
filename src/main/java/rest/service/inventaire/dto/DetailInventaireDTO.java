
package rest.service.inventaire.dto;

/**
 *
 * @author koben
 */
public class DetailInventaireDTO {

    private final Long id;
    private final String produitName;
    private final String produitCip;

    private final int produitPrixAchat;
    private final int produitPrixUni;
    private final int quantiteInitiale;
    private final int quantiteSaisie;

    public DetailInventaireDTO(Long id, String produitName, String produitCip, int produitPrixAchat, int produitPrixUni,
            int quantiteInitiale, int quantiteSaisie) {
        this.id = id;
        this.produitName = produitName;
        this.produitCip = produitCip;

        this.produitPrixAchat = produitPrixAchat;
        this.produitPrixUni = produitPrixUni;
        this.quantiteInitiale = quantiteInitiale;
        this.quantiteSaisie = quantiteSaisie;
    }

    public Long getId() {
        return id;
    }

    public String getProduitName() {
        return produitName;
    }

    public String getProduitCip() {
        return produitCip;
    }

    public int getProduitPrixAchat() {
        return produitPrixAchat;
    }

    public int getProduitPrixUni() {
        return produitPrixUni;
    }

    public int getQuantiteInitiale() {
        return quantiteInitiale;
    }

    public int getQuantiteSaisie() {
        return quantiteSaisie;
    }

}
