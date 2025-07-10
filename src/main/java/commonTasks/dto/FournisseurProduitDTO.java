/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TFamilleGrossiste;
import dal.TGrossiste;
import java.io.Serializable;

/**
 *
 * @author koben
 */
public class FournisseurProduitDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String codeCip;
    private Integer prixAchat;
    private Integer prixUni;
    private Long produitId;
    private String produitLibelle;
    private Long fournisseurId;
    private String fournisseurLibelle;
    private boolean principal;

    public String getCodeCip() {
        return codeCip;
    }

    public void setCodeCip(String codeCip) {
        this.codeCip = codeCip;
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public Integer getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(Integer prixUni) {
        this.prixUni = prixUni;
    }

    public Long getProduitId() {
        return produitId;
    }

    public void setProduitId(Long produitId) {
        this.produitId = produitId;
    }

    public String getProduitLibelle() {
        return produitLibelle;
    }

    public void setProduitLibelle(String produitLibelle) {
        this.produitLibelle = produitLibelle;
    }

    public Long getFournisseurId() {
        return fournisseurId;
    }

    public void setFournisseurId(Long fournisseurId) {
        this.fournisseurId = fournisseurId;
    }

    public String getFournisseurLibelle() {
        return fournisseurLibelle;
    }

    public void setFournisseurLibelle(String fournisseurLibelle) {
        this.fournisseurLibelle = fournisseurLibelle;
    }

    public boolean isPrincipal() {
        return principal;
    }

    public void setPrincipal(boolean principal) {
        this.principal = principal;
    }

    public FournisseurProduitDTO(TFamilleGrossiste g) {
        this.codeCip = g.getStrCODEARTICLE();
        this.prixAchat = g.getIntPAF();
        this.prixUni = g.getIntPRICE();
        TGrossiste grossiste = g.getLgGROSSISTEID();
        this.fournisseurLibelle = grossiste.getStrLIBELLE();

    }

    public FournisseurProduitDTO() {
    }

}
