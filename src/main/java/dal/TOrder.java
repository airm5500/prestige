/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_order")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TOrder.findAll", query = "SELECT t FROM TOrder t"),
        @NamedQuery(name = "TOrder.findByLgORDERID", query = "SELECT t FROM TOrder t WHERE t.lgORDERID = :lgORDERID"),
        @NamedQuery(name = "TOrder.findByStrREFORDER", query = "SELECT t FROM TOrder t WHERE t.strREFORDER = :strREFORDER"),
        @NamedQuery(name = "TOrder.findByIntLINE", query = "SELECT t FROM TOrder t WHERE t.intLINE = :intLINE"),
        @NamedQuery(name = "TOrder.findByStrSTATUT", query = "SELECT t FROM TOrder t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TOrder.findByDtCREATED", query = "SELECT t FROM TOrder t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TOrder.findByDtUPDATED", query = "SELECT t FROM TOrder t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TOrder.findByIntPRICE", query = "SELECT t FROM TOrder t WHERE t.intPRICE = :intPRICE") })
public class TOrder implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ORDER_ID", nullable = false, length = 50)
    private String lgORDERID;
    @Column(name = "str_REF_ORDER", length = 20)
    private String strREFORDER;
    @Column(name = "int_LINE")
    private Integer intLINE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "int_PRICE")
    private Integer intPRICE = 0;
    @OneToMany(mappedBy = "lgORDERID")
    private Collection<TBonLivraison> tBonLivraisonCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @OneToMany(mappedBy = "lgORDERID", cascade = CascadeType.REMOVE)
    private Collection<TOrderDetail> tOrderDetailCollection;
    @Column(name = "recu", columnDefinition = "boolean default false")
    private Boolean recu = Boolean.FALSE;
    @Column(name = "direct_import", columnDefinition = "boolean default false")
    private Boolean directImport = Boolean.FALSE;

    public TOrder() {
    }

    public Boolean getRecu() {
        return recu;
    }

    public void setRecu(Boolean recu) {
        this.recu = recu;
    }

    public TOrder(String lgORDERID) {
        this.lgORDERID = lgORDERID;
    }

    public String getLgORDERID() {
        return lgORDERID;
    }

    public void setLgORDERID(String lgORDERID) {
        this.lgORDERID = lgORDERID;
    }

    public String getStrREFORDER() {
        return strREFORDER;
    }

    public void setStrREFORDER(String strREFORDER) {
        this.strREFORDER = strREFORDER;
    }

    public Integer getIntLINE() {
        return intLINE;
    }

    public void setIntLINE(Integer intLINE) {
        this.intLINE = intLINE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    @XmlTransient
    public Collection<TBonLivraison> getTBonLivraisonCollection() {
        return tBonLivraisonCollection;
    }

    public void setTBonLivraisonCollection(Collection<TBonLivraison> tBonLivraisonCollection) {
        this.tBonLivraisonCollection = tBonLivraisonCollection;
    }

    public Boolean getDirectImport() {
        return directImport;
    }

    public void setDirectImport(Boolean directImport) {
        this.directImport = directImport;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    @XmlTransient
    public Collection<TOrderDetail> getTOrderDetailCollection() {
        return tOrderDetailCollection;
    }

    public void setTOrderDetailCollection(Collection<TOrderDetail> tOrderDetailCollection) {
        this.tOrderDetailCollection = tOrderDetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgORDERID != null ? lgORDERID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TOrder)) {
            return false;
        }
        TOrder other = (TOrder) object;
        if ((this.lgORDERID == null && other.lgORDERID != null)
                || (this.lgORDERID != null && !this.lgORDERID.equals(other.lgORDERID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TOrder[ lgORDERID=" + lgORDERID + " ]";
    }

}
