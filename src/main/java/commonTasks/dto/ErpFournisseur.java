/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.Groupefournisseur;
import dal.TGrossiste;
import java.io.Serializable;

/**
 *
 * @author koben
 */
public class ErpFournisseur implements Serializable {

    private static final long serialVersionUID = 1L;
    private String fournisseurId;
    private String fournisseurLibelle;
    private String adresse;
    private String telephone;
    private String groupeId;
    private String groupeLibelle;

    public String getFournisseurId() {
        return fournisseurId;
    }

    public void setFournisseurId(String fournisseurId) {
        this.fournisseurId = fournisseurId;
    }

    public String getFournisseurLibelle() {
        return fournisseurLibelle;
    }

    public void setFournisseurLibelle(String fournisseurLibelle) {
        this.fournisseurLibelle = fournisseurLibelle;
    }

    public String getAdresse() {
        return adresse;
    }

    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getGroupeId() {
        return groupeId;
    }

    public void setGroupeId(String groupeId) {
        this.groupeId = groupeId;
    }

    public String getGroupeLibelle() {
        return groupeLibelle;
    }

    public void setGroupeLibelle(String groupeLibelle) {
        this.groupeLibelle = groupeLibelle;
    }

    public ErpFournisseur(TGrossiste f) {
        this.fournisseurId = f.getLgGROSSISTEID();
        this.fournisseurLibelle = f.getStrLIBELLE();
        this.adresse = f.getStrCODEPOSTAL();
        this.telephone = f.getStrTELEPHONE();
        Groupefournisseur g = f.getGroupeId();
        if (g != null) {
            this.groupeId = g.getId().toString();
            this.groupeLibelle = g.getLibelle();
        }

    }

    public ErpFournisseur() {
    }

}
