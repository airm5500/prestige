/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TModelFacture;
import java.io.Serializable;

/**
 *
 * @author kkoffi
 */
public class ModelFactureDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String id, libelle, valeur, nomFichier, nomFichierRemiseTierspayant;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getValeur() {
        return valeur;
    }

    public void setValeur(String valeur) {
        this.valeur = valeur;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public String getNomFichierRemiseTierspayant() {
        return nomFichierRemiseTierspayant;
    }

    public void setNomFichierRemiseTierspayant(String nomFichierRemiseTierspayant) {
        this.nomFichierRemiseTierspayant = nomFichierRemiseTierspayant;
    }

    public void setNomFichier(String nomFichier) {
        this.nomFichier = nomFichier;
    }

    public ModelFactureDTO() {
    }

    public ModelFactureDTO(TModelFacture facture) {
        this.id = facture.getLgMODELFACTUREID();
        this.libelle = facture.getStrDESCRIPTION();
        this.valeur = facture.getStrVALUE();
        this.nomFichier = facture.getNomFichier();
    }

}
