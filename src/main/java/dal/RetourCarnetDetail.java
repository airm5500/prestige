/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDateTime;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "retour_carnet_detail")
public class RetourCarnetDetail implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Basic(optional = false)
    @Column(name = "id", nullable = false, length = 11)
    private Integer id;
    @NotNull
    @JoinColumn(name = "motif_retour_carnet_id", referencedColumnName = "id", nullable = false)
    @ManyToOne
    private MotifRetourCarnet motifRetourCarnet;
    @NotNull
    @JoinColumn(name = "produit_id", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne
    private TFamille produit;
    @NotNull
    @JoinColumn(name = "retour_carnet_id", referencedColumnName = "id", nullable = false)
    @ManyToOne
    private RetourCarnet retourCarnet;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @NotNull
    @Column(name = "stock_init", nullable = false)
    private Integer stockInit;
    @NotNull
    @Column(name = "stock_final", nullable = false)
    private Integer stockFinal;
    @NotNull
    @Column(name = "qty_retour", nullable = false)
    private Integer qtyRetour;
    @NotNull
    @Column(name = "prix_uni", nullable = false)
    private Integer prixUni;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public MotifRetourCarnet getMotifRetourCarnet() {
        return motifRetourCarnet;
    }

    public void setMotifRetourCarnet(MotifRetourCarnet motifRetourCarnet) {
        this.motifRetourCarnet = motifRetourCarnet;
    }

    public TFamille getProduit() {
        return produit;
    }

    public void setProduit(TFamille produit) {
        this.produit = produit;
    }

    public RetourCarnet getRetourCarnet() {
        return retourCarnet;
    }

    public void setRetourCarnet(RetourCarnet retourCarnet) {
        this.retourCarnet = retourCarnet;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getStockInit() {
        return stockInit;
    }

    public void setStockInit(Integer stockInit) {
        this.stockInit = stockInit;
    }

    public Integer getStockFinal() {
        return stockFinal;
    }

    public void setStockFinal(Integer stockFinal) {
        this.stockFinal = stockFinal;
    }

    public Integer getQtyRetour() {
        return qtyRetour;
    }

    public void setQtyRetour(Integer qtyRetour) {
        this.qtyRetour = qtyRetour;
    }

    public Integer getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(Integer prixUni) {
        this.prixUni = prixUni;
    }

}
