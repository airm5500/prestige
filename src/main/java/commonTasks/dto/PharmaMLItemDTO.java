/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.RuptureDetail;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TOrderDetail;
import java.io.Serializable;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author kkoffi
 */
public class PharmaMLItemDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String cip, ean, libelle;
    boolean livraisonPartielle, reliquats, livraisonEquivalente, livre = true;
    int quantite, prixUn, prixAchat, amount;
    private String typeCodification;
    private int codeRetour;

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public int getCodeRetour() {
        return codeRetour;
    }

    public void setCodeRetour(int codeRetour) {
        this.codeRetour = codeRetour;
    }

    public String getEan() {
        return ean;
    }

    public boolean isLivre() {
        return livre;
    }

    public void setLivre(boolean livre) {
        this.livre = livre;
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

    public boolean isLivraisonPartielle() {
        return livraisonPartielle;
    }

    public void setLivraisonPartielle(boolean livraisonPartielle) {
        this.livraisonPartielle = livraisonPartielle;
    }

    public boolean isReliquats() {
        return reliquats;
    }

    public void setReliquats(boolean reliquats) {
        this.reliquats = reliquats;
    }

    public boolean isLivraisonEquivalente() {
        return livraisonEquivalente;
    }

    public void setLivraisonEquivalente(boolean livraisonEquivalente) {
        this.livraisonEquivalente = livraisonEquivalente;
    }

    public int getQuantite() {
        return quantite;
    }

    public void setQuantite(int quantite) {
        this.quantite = quantite;
    }

    public PharmaMLItemDTO() {
    }

    public PharmaMLItemDTO(String cip, String ean, String libelle, boolean livraisonPartielle, boolean reliquats,
            boolean livraisonEquivalente, int quantite, String typeCodification) {
        this.cip = cip;
        this.ean = ean;
        this.libelle = libelle;
        this.livraisonPartielle = livraisonPartielle;
        this.reliquats = reliquats;
        this.livraisonEquivalente = livraisonEquivalente;
        this.quantite = quantite;
        this.typeCodification = typeCodification;
    }

    public String getTypeCodification() {
        return typeCodification;
    }

    public void setTypeCodification(String typeCodification) {
        this.typeCodification = typeCodification;
    }

    public int getPrixUn() {
        return prixUn;
    }

    public void setPrixUn(int prixUn) {
        this.prixUn = prixUn;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }

    public PharmaMLItemDTO(TOrderDetail o, TFamille famille, TFamilleGrossiste familleGrossiste,
            boolean livraisonPartielle, boolean reliquats, boolean livraisonEquivalente, String typeCodification) {
        this.cip = famille.getIntCIP();
        if (familleGrossiste != null && StringUtils.isEmpty(familleGrossiste.getStrCODEARTICLE())) {
            this.cip = familleGrossiste.getStrCODEARTICLE();
        }
        this.ean = famille.getIntEAN13();
        this.libelle = famille.getStrNAME();
        this.livraisonPartielle = livraisonPartielle;
        this.reliquats = reliquats;
        this.livraisonEquivalente = livraisonEquivalente;
        this.quantite = o.getIntNUMBER();
        this.typeCodification = typeCodification;
        this.amount = o.getIntPRICE();
        this.prixUn = o.getIntPRICEDETAIL();
        this.prixAchat = o.getIntPAFDETAIL();
    }

    public PharmaMLItemDTO(RuptureDetail o, TFamille famille, TFamilleGrossiste familleGrossiste,
            boolean livraisonPartielle, boolean reliquats, boolean livraisonEquivalente, String typeCodification) {
        this.cip = famille.getIntCIP();
        if (familleGrossiste != null && StringUtils.isEmpty(familleGrossiste.getStrCODEARTICLE())) {
            this.cip = familleGrossiste.getStrCODEARTICLE();
        }
        this.ean = famille.getIntEAN13();
        this.libelle = famille.getStrNAME();
        this.livraisonPartielle = livraisonPartielle;
        this.reliquats = reliquats;
        this.livraisonEquivalente = livraisonEquivalente;
        this.quantite = o.getQty();
        this.typeCodification = typeCodification;
        this.amount = o.getPrixAchat() * o.getQty();
        this.prixUn = o.getPrixVente();
        this.prixAchat = o.getPrixAchat();
    }
}
