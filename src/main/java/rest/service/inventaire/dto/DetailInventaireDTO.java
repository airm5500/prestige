
package rest.service.inventaire.dto;

import java.util.Date;

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

    private final Date dtUpdated;

    private final boolean boolInventaire;

    public DetailInventaireDTO(Long id, String produitName, String produitCip, int produitPrixAchat, int produitPrixUni,
            int quantiteInitiale, int quantiteSaisie, Date dtUpdated, boolean boolInventaire) {
        this.id = id;
        this.produitName = produitName;
        this.produitCip = produitCip;

        this.produitPrixAchat = produitPrixAchat;
        this.produitPrixUni = produitPrixUni;
        this.quantiteInitiale = quantiteInitiale;
        this.quantiteSaisie = quantiteSaisie;
        this.dtUpdated = dtUpdated;
        this.boolInventaire = boolInventaire;
    }

    public DetailInventaireDTO(Long id, String produitName, String produitCip, int produitPrixAchat, int produitPrixUni,
            int quantiteInitiale, int quantiteSaisie, boolean boolInventaire) {
        this.id = id;
        this.produitName = produitName;
        this.produitCip = produitCip;

        this.produitPrixAchat = produitPrixAchat;
        this.produitPrixUni = produitPrixUni;
        this.quantiteInitiale = quantiteInitiale;
        this.quantiteSaisie = quantiteSaisie;
        this.dtUpdated = null;
        this.boolInventaire = boolInventaire;
    }

    public DetailInventaireDTO(Long id, String produitName, String produitCip, int produitPrixAchat, int produitPrixUni,
            int quantiteInitiale, int quantiteSaisie, boolean boolInventaire, Date dtUpdated) {

        this.id = id;
        this.produitName = produitName;
        this.produitCip = produitCip;
        this.produitPrixAchat = produitPrixAchat;
        this.produitPrixUni = produitPrixUni;
        this.quantiteInitiale = quantiteInitiale;
        this.quantiteSaisie = quantiteSaisie;
        this.boolInventaire = boolInventaire;
        this.dtUpdated = dtUpdated;
    }

    public boolean isBoolInventaire() {
        return boolInventaire;
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

    public Date getdtUpdated() {
        return dtUpdated;
    }
}
