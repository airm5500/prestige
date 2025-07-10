/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.dto;

import javax.persistence.Tuple;

/**
 *
 * @author koben
 */
public class ProduitVenduDTO {

    private String cip, name, id;
    private int prix, prixAchat;

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getPrix() {
        return prix;
    }

    public void setPrix(int prix) {
        this.prix = prix;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public ProduitVenduDTO(String cip, String name, int prix, int prixAchat) {
        this.cip = cip;
        this.name = name;
        this.prix = prix;
        this.prixAchat = prixAchat;
    }

    public ProduitVenduDTO() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public ProduitVenduDTO(Tuple t) {
        this.cip = t.get(0, String.class);
        this.name = t.get(1, String.class);
        this.prix = t.get(2, Integer.class);
        this.prixAchat = t.get(3, Integer.class);
        this.id = t.get(4, String.class);
    }

}
