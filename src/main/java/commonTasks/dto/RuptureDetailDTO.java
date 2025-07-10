/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.Rupture;
import dal.RuptureDetail;
import dal.TFamille;
import dal.TGrossiste;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

/**
 *
 * @author koben
 */
public class RuptureDetailDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private Integer prixAchat = 0;
    private Integer prixVente = 0, montantAchat = 0;
    private Integer qty = 0, seuil = 0, qteReappro, stock = 0;
    private String codeCip, libelle, id, grossisteId, grossisteLibelle, ruptureId, dateRrupture, familleLibelle;

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public Integer getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(Integer prixVente) {
        this.prixVente = prixVente;
    }

    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    public String getCodeCip() {
        return codeCip;
    }

    public void setCodeCip(String codeCip) {
        this.codeCip = codeCip;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getGrossisteLibelle() {
        return grossisteLibelle;
    }

    public void setGrossisteLibelle(String grossisteLibelle) {
        this.grossisteLibelle = grossisteLibelle;
    }

    public String getRuptureId() {
        return ruptureId;
    }

    public void setRuptureId(String ruptureId) {
        this.ruptureId = ruptureId;
    }

    public Integer getSeuil() {
        return seuil;
    }

    public void setSeuil(Integer seuil) {
        this.seuil = seuil;
    }

    public Integer getQteReappro() {
        return qteReappro;
    }

    public void setQteReappro(Integer qteReappro) {
        this.qteReappro = qteReappro;
    }

    public String getDateRrupture() {
        return dateRrupture;
    }

    public void setDateRrupture(String dateRrupture) {
        this.dateRrupture = dateRrupture;
    }

    public String getFamilleLibelle() {
        return familleLibelle;
    }

    public void setFamilleLibelle(String familleLibelle) {
        this.familleLibelle = familleLibelle;
    }

    public RuptureDetailDTO(RuptureDetail d) {
        TFamille f = d.getProduit();
        Rupture r = d.getRupture();
        TGrossiste g = r.getGrossiste();
        this.codeCip = f.getIntCIP();
        this.libelle = f.getStrNAME();
        this.id = d.getId();
        this.grossisteId = g.getLgGROSSISTEID();
        this.grossisteLibelle = g.getStrLIBELLE();
        this.ruptureId = r.getId();
        this.prixAchat = d.getPrixAchat();
        this.prixVente = d.getPrixVente();
        this.qty = d.getQty();

    }

    public Integer getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
    }

    public RuptureDetailDTO(RuptureDetail d, int stock) {
        TFamille f = d.getProduit();
        Rupture r = d.getRupture();
        TGrossiste g = r.getGrossiste();
        this.codeCip = f.getIntCIP();
        this.libelle = f.getStrNAME();
        this.id = d.getId();
        this.grossisteId = g.getLgGROSSISTEID();
        this.grossisteLibelle = g.getStrLIBELLE();
        this.ruptureId = r.getId();
        this.prixAchat = d.getPrixAchat();
        this.prixVente = d.getPrixVente();
        this.qty = d.getQty();
        this.montantAchat = d.getQty() * d.getPrixAchat();
        this.qteReappro = f.getIntQTEREAPPROVISIONNEMENT();
        this.seuil = f.getIntSEUILMIN();
        this.stock = stock;
        this.dateRrupture = r.getDtCreated().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        try {
            this.familleLibelle = f.getLgFAMILLEARTICLEID().getStrLIBELLE();
        } catch (Exception e) {
        }

    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 47 * hash + Objects.hashCode(this.id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final RuptureDetailDTO other = (RuptureDetailDTO) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

}
