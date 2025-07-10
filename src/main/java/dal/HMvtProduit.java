/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author Kobena
 */
@Entity
@Table(name = "HMvtProduit", indexes = { @Index(name = "HMvtProduit7", columnList = "mvtdate"),
        @Index(name = "HMvtPkey", columnList = "pkey") })
@XmlRootElement
public class HMvtProduit implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "uuid", nullable = false, length = 100)
    private String uuid = UUID.randomUUID().toString();
    @Column(name = "mvtdate", nullable = false, updatable = false)
    private LocalDate mvtDate = LocalDate.now();
    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "qteDebut", nullable = false)
    private Integer qteDebut;
    @Column(name = "qteFinale", nullable = false)
    private Integer qteFinale;
    @Column(name = "qteMvt", nullable = false)
    private Integer qteMvt;
    @Column(name = "pkey", nullable = false, length = 100)
    private String pkey;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID", nullable = false)
    @ManyToOne
    private TEmplacement emplacement;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne
    private TFamille famille;
    @JoinColumn(name = "typeMvt", referencedColumnName = "ID", nullable = false)
    @ManyToOne
    private Typemvtproduit typemvtproduit;
    @Column(name = "prixUn", nullable = false)
    private Integer prixUn;
    @Column(name = "prixAchat", nullable = false)
    private Integer prixAchat;
    @Column(name = "valeurTva", nullable = false)
    private Integer valeurTva = 0;
    @JoinColumn(name = "checked")
    private Boolean checked = true;
    @Column(name = "ug", nullable = false)
    private Integer ug = 0;
    @Column(name = "cmu_price")
    private Integer cmuPrice;
    @ManyToOne
    @JoinColumn(name = "lg_PREENREGISTREMENT_DETAIL_ID", referencedColumnName = "lg_PREENREGISTREMENT_DETAIL_ID")
    private TPreenregistrementDetail preenregistrementDetail;

    public Integer getCmuPrice() {
        return cmuPrice;
    }

    /*
     * @Formula("qteMvt*prixUn") private double montantTtc;
     *
     * @Formula("(qteMvt*prixUn)/(1+(valeurTva/100))") private double montantHt;
     */
    /*
     * @Transient public double getMontantHt() { return montantHt; }
     *
     * @Transient public double getMontantTtc() { return montantTtc; }
     */
    public void setCmuPrice(Integer cmuPrice) {
        this.cmuPrice = cmuPrice;
    }

    public TPreenregistrementDetail getPreenregistrementDetail() {
        return preenregistrementDetail;
    }

    public void setPreenregistrementDetail(TPreenregistrementDetail preenregistrementDetail) {
        this.preenregistrementDetail = preenregistrementDetail;
    }

    public Integer getValeurTva() {
        return valeurTva;
    }

    public HMvtProduit() {
    }

    public Boolean getChecked() {
        return checked;
    }

    public void setChecked(Boolean checked) {
        this.checked = checked;
    }

    public void setValeurTva(Integer valeurTva) {
        this.valeurTva = valeurTva;
    }

    public String getPkey() {
        return pkey;
    }

    public Integer getPrixUn() {
        return prixUn;
    }

    public void setPrixUn(Integer prixUn) {
        this.prixUn = prixUn;
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public void setPkey(String pkey) {
        this.pkey = pkey;
    }

    public String getUuid() {
        return uuid;
    }

    public Integer getQteMvt() {
        return qteMvt;
    }

    public void setQteMvt(Integer qteMvt) {
        this.qteMvt = qteMvt;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getQteDebut() {
        return qteDebut;
    }

    public void setQteDebut(Integer qteDebut) {
        this.qteDebut = qteDebut;
    }

    public Integer getQteFinale() {
        return qteFinale;
    }

    public void setQteFinale(Integer qteFinale) {
        this.qteFinale = qteFinale;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TEmplacement getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(TEmplacement emplacement) {
        this.emplacement = emplacement;
    }

    public TFamille getFamille() {
        return famille;
    }

    public void setFamille(TFamille famille) {
        this.famille = famille;
    }

    @Override
    public String toString() {
        return "HMvtProduit{" + "uuid=" + uuid + ", mvtDate=" + mvtDate + '}';
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 59 * hash + Objects.hashCode(this.uuid);
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
        final HMvtProduit other = (HMvtProduit) obj;
        if (!Objects.equals(this.uuid, other.uuid)) {
            return false;
        }
        return true;
    }

    public Typemvtproduit getTypemvtproduit() {
        return typemvtproduit;
    }

    public void setTypemvtproduit(Typemvtproduit typemvtproduit) {
        this.typemvtproduit = typemvtproduit;
    }

    public Integer getUg() {
        return ug;
    }

    public void setUg(Integer ug) {
        this.ug = ug;
    }

}
