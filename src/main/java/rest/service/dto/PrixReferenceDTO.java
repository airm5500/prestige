package rest.service.dto;

import dal.PrixReference;
import dal.PrixReferenceType;
import dal.TTiersPayant;

/**
 *
 * @author koben
 */
public class PrixReferenceDTO {

    private String id;
    private int valeur;
    private PrixReferenceType type;
    private boolean enabled;
    private String produitId;
    private String tiersPayantId;
    private String tiersPayantName;
    private String typeLibelle;

    public String getTiersPayantName() {
        return tiersPayantName;
    }

    public void setTiersPayantName(String tiersPayantName) {
        this.tiersPayantName = tiersPayantName;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getValeur() {
        return valeur;
    }

    public void setValeur(int valeur) {
        this.valeur = valeur;
    }

    public PrixReferenceType getType() {
        return type;
    }

    public void setType(PrixReferenceType type) {
        this.type = type;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public PrixReferenceDTO() {
    }

    public String getTypeLibelle() {
        return typeLibelle;
    }

    public void setTypeLibelle(String typeLibelle) {
        this.typeLibelle = typeLibelle;
    }

    public PrixReferenceDTO(PrixReference prixReference) {
        this.id = prixReference.getId();
        this.valeur = prixReference.getValeur();
        this.type = prixReference.getType();
        this.enabled = prixReference.isEnabled();
        this.produitId = prixReference.getProduit().getLgFAMILLEID();
        TTiersPayant payant = prixReference.getTiersPayant();
        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.typeLibelle = prixReference.getType().getLibelle();
        this.tiersPayantName = payant.getStrFULLNAME();
    }

}
