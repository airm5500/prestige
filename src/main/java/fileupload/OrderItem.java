/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package fileupload;

import java.io.Serializable;
import java.time.LocalDate;

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
    private Integer prixAchat;
    private String etablissement;
    private String numeroLot;
    private LocalDate datePeremption;

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public OrderItem cip(String cip) {
        this.cip = cip;
        return this;
    }

    public OrderItem prixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
        return this;
    }

    public OrderItem libelle(String libelle) {
        this.libelle = libelle;
        return this;
    }

    public OrderItem cmde(Integer cmde) {
        this.cmde = cmde;
        return this;
    }

    public OrderItem cmdeL(Integer cmdeL) {
        this.cmdeL = cmdeL;
        return this;
    }

    public OrderItem refBl(String refBl) {
        this.refBl = refBl;
        return this;
    }

    public OrderItem dateBl(String dateBl) {
        this.dateBl = dateBl;
        return this;
    }

    public OrderItem montant(Double montant) {
        this.montant = montant;
        return this;
    }

    public String getNumeroLot() {
        return numeroLot;
    }

    public OrderItem setNumeroLot(String numeroLot) {
        this.numeroLot = numeroLot;
        return this;
    }

    public LocalDate getDatePeremption() {
        return datePeremption;
    }

    public OrderItem setDatePeremption(LocalDate datePeremption) {
        this.datePeremption = datePeremption;
        return this;
    }

    public OrderItem ug(Integer ug) {
        this.ug = ug;
        return this;
    }

    public OrderItem prixUn(Integer prixUn) {
        this.prixUn = prixUn;
        return this;
    }

    public OrderItem tva(Double tva) {
        this.tva = tva;
        return this;
    }

    public OrderItem ean(String ean) {
        this.ean = ean;
        return this;
    }

    public OrderItem facture(String facture) {
        this.facture = facture;
        return this;
    }

    public OrderItem ligne(Integer ligne) {
        this.ligne = ligne;
        return this;
    }

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
    // String cip, String ean, String libelle, Integer cmde, Integer cmdeL, String refBl, String dateBl
    // dpc1 3

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

    // tedis csv
    public OrderItem(int ligne, String cip, int prixAchat, Integer cmdeL, double tva, int prixUn) {
        this.cip = cip;
        this.prixUn = prixUn;
        this.cmdeL = cmdeL;
        this.ligne = ligne;
        this.prixAchat = prixAchat;
        this.tva = tva;

    }

    public OrderItem(String cip, Double montant, Integer cmdeL, Integer ug, Integer prixUn, String refBl,
            String dateBl) {
        this.cip = cip;
        this.prixUn = prixUn;
        this.dateBl = dateBl;
        this.ug = ug;
        this.montant = montant;
        this.cmdeL = cmdeL;
        this.refBl = refBl;

    }
    // cophamed

    public OrderItem() {

    }

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

    public String getEtablissement() {
        return etablissement;
    }

    public void setEtablissement(String etablissement) {
        this.etablissement = etablissement;
    }

    // printer.printRecord("N° Facture", "N° ligne", "CIP/EAN13", "Libellé du produit", "Qté commandée","Qté
    // livrée","Prix de cession","Prix public","N° commande","Tva");
    public OrderItem(String etablissement, String facture, Integer ligne, String cip, String libelle, Integer cmde,
            int ug, Integer cmdeL, Double montant, Double prixUn, String refBl, Double tva) {
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
        this.etablissement = etablissement;
        this.ug = ug;
    }

    @Override
    public String toString() {
        return "OrderItem{" + "cip=" + cip + ", ean=" + ean + ", libelle=" + libelle + ", cmde=" + cmde + ", cmdeL="
                + cmdeL + ", refBl=" + refBl + ", dateBl=" + dateBl + ", montant=" + montant + ", ug=" + ug
                + ", prixUn=" + prixUn + ", tva=" + tva + ", ligne=" + ligne + ", facture=" + facture + ", prixAchat="
                + prixAchat + '}';
    }

}
