/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package fileupload;

import java.io.Serializable;

/**
 *
 * @author Kobena
 */
public class OrderItem implements Serializable {

    private String cip;
    private String ean;
    private String libelle;
    private Integer cmde;
    private Integer cmdeL;
    private String refBl;
    private String dateBl;
    private Double montant;
    private Integer ug;
    private Integer prixUn;
    private Double tva;
     private Integer ligne;
      private String facture;

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getEan() {
        return ean;
    }

    public void setEan(String ean) {
        this.ean = ean;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public Integer getCmde() {
        return cmde;
    }

    public void setCmde(Integer cmde) {
        this.cmde = cmde;
    }

    public Integer getCmdeL() {
        return cmdeL;
    }

    public void setCmdeL(Integer cmdeL) {
        this.cmdeL = cmdeL;
    }

    public String getRefBl() {
        return refBl;
    }

    public void setRefBl(String refBl) {
        this.refBl = refBl;
    }

    public String getDateBl() {
        return dateBl;
    }

    public void setDateBl(String dateBl) {
        this.dateBl = dateBl;
    }
//String cip, String ean, String libelle, Integer cmde, Integer cmdeL, String refBl, String dateBl
    //dpc1 3

    public OrderItem(String refBl, String dateBl, String cip, String libelle, Integer cmdeL, Double montant) {
        this.cip = cip;
        this.libelle = libelle;
        this.montant = montant;
        this.cmdeL = cmdeL;
        this.refBl = refBl;
        this.dateBl = dateBl;
    }

    public Double getMontant() {
        return montant;
    }

    public void setMontant(Double montant) {
        this.montant = montant;
    }

    //tedis csv
    public OrderItem(String cip, Integer cmde, String ean, Integer cmdeL, Double montant) {
        this.cip = cip;
        this.cmde = cmde;
        this.montant = montant;
        this.cmdeL = cmdeL;
        this.ean = ean;

    }

    public OrderItem(String cip, Double montant, Integer cmdeL, Integer ug, Integer prixUn, String refBl, String dateBl) {
        this.cip = cip;
        this.prixUn = prixUn;
        this.dateBl = dateBl;
        this.ug = ug;
        this.montant = montant;
        this.cmdeL = cmdeL;
        this.refBl = refBl;

    }
//cophamed

    public OrderItem(String cip, Integer cmde, Integer cmdeL, Double montant) {
        this.cip = cip;
        this.cmde = cmde;
        this.cmdeL = cmdeL;
        this.montant = montant;
    }

    public Integer getUg() {
        return ug;
    }

    public void setUg(Integer ug) {
        this.ug = ug;
    }

    public Integer getPrixUn() {
        return prixUn;
    }

    public void setPrixUn(Integer prixUn) {
        this.prixUn = prixUn;
    }

    public Double getTva() {
        return tva;
    }

    public void setTva(Double tva) {
        this.tva = tva;
    }

    public Integer getLigne() {
        return ligne;
    }

    public void setLigne(Integer ligne) {
        this.ligne = ligne;
    }

    public String getFacture() {
        return facture;
    }

    public void setFacture(String facture) {
        this.facture = facture;
    }
//   printer.printRecord("N° Facture", "N° ligne", "CIP/EAN13", "Libellé du produit", "Qté commandée","Qté livrée","Prix de cession","Prix public","N° commande","Tva");
    public OrderItem(String facture, Integer ligne,String cip,String libelle, Integer cmde, Integer cmdeL,  Double montant, Double prixUn,  String refBl, Double tva) {
        this.cip = cip;
        this.libelle = libelle;
        this.cmde = cmde;
        this.cmdeL = cmdeL;
        this.refBl = refBl;
        this.montant = montant;
        this.prixUn = prixUn.intValue();
        this.tva = tva;
        this.ligne = ligne;
        this.facture = facture;
    }

}