package rest.service.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Ligne de l'ecran « Ventes modifiées » (une modification) avec son detail produit.
 */
public class VenteModifieeDTO {

    public static class Ligne {

        private String produitId;
        private String produitCip;
        private String produitLibelle;
        private String action;
        private Integer qteAvant;
        private Integer qteApres;
        private Integer puAvant;
        private Integer puApres;
        private Integer montantAvant;
        private Integer montantApres;
        private String valeurAvant;
        private String valeurApres;

        public String getValeurAvant() {
            return valeurAvant;
        }

        public void setValeurAvant(String valeurAvant) {
            this.valeurAvant = valeurAvant;
        }

        public String getValeurApres() {
            return valeurApres;
        }

        public void setValeurApres(String valeurApres) {
            this.valeurApres = valeurApres;
        }

        public String getProduitId() {
            return produitId;
        }

        public void setProduitId(String produitId) {
            this.produitId = produitId;
        }

        public String getProduitCip() {
            return produitCip;
        }

        public void setProduitCip(String produitCip) {
            this.produitCip = produitCip;
        }

        public String getProduitLibelle() {
            return produitLibelle;
        }

        public void setProduitLibelle(String produitLibelle) {
            this.produitLibelle = produitLibelle;
        }

        public String getAction() {
            return action;
        }

        public void setAction(String action) {
            this.action = action;
        }

        public Integer getQteAvant() {
            return qteAvant;
        }

        public void setQteAvant(Integer qteAvant) {
            this.qteAvant = qteAvant;
        }

        public Integer getQteApres() {
            return qteApres;
        }

        public void setQteApres(Integer qteApres) {
            this.qteApres = qteApres;
        }

        public Integer getPuAvant() {
            return puAvant;
        }

        public void setPuAvant(Integer puAvant) {
            this.puAvant = puAvant;
        }

        public Integer getPuApres() {
            return puApres;
        }

        public void setPuApres(Integer puApres) {
            this.puApres = puApres;
        }

        public Integer getMontantAvant() {
            return montantAvant;
        }

        public void setMontantAvant(Integer montantAvant) {
            this.montantAvant = montantAvant;
        }

        public Integer getMontantApres() {
            return montantApres;
        }

        public void setMontantApres(Integer montantApres) {
            this.montantApres = montantApres;
        }
    }

    private String id;
    private String typeModification;
    private String typeLibelle;
    private String venteId;
    private String venteOrigineId;
    private String venteRef;
    /** Date de creation de la vente d'origine, jj/mm/aaaa hh:mm */
    private String venteDate;
    private String userName;
    private String date;
    private String heure;
    private Integer montantAvant;
    private Integer montantApres;
    private String description;
    private List<Ligne> lignes = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTypeModification() {
        return typeModification;
    }

    public void setTypeModification(String typeModification) {
        this.typeModification = typeModification;
    }

    public String getTypeLibelle() {
        return typeLibelle;
    }

    public void setTypeLibelle(String typeLibelle) {
        this.typeLibelle = typeLibelle;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public String getVenteOrigineId() {
        return venteOrigineId;
    }

    public void setVenteOrigineId(String venteOrigineId) {
        this.venteOrigineId = venteOrigineId;
    }

    public String getVenteRef() {
        return venteRef;
    }

    public void setVenteRef(String venteRef) {
        this.venteRef = venteRef;
    }

    public String getVenteDate() {
        return venteDate;
    }

    public void setVenteDate(String venteDate) {
        this.venteDate = venteDate;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public Integer getMontantAvant() {
        return montantAvant;
    }

    public void setMontantAvant(Integer montantAvant) {
        this.montantAvant = montantAvant;
    }

    public Integer getMontantApres() {
        return montantApres;
    }

    public void setMontantApres(Integer montantApres) {
        this.montantApres = montantApres;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Ligne> getLignes() {
        return lignes;
    }

    public void setLignes(List<Ligne> lignes) {
        this.lignes = lignes;
    }
}
