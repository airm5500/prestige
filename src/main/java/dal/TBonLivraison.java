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
@Table(name = "t_bon_livraison")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TBonLivraison.findAll", query = "SELECT t FROM TBonLivraison t"),
        @NamedQuery(name = "TBonLivraison.findByLgBONLIVRAISONID", query = "SELECT t FROM TBonLivraison t WHERE t.lgBONLIVRAISONID = :lgBONLIVRAISONID"),
        @NamedQuery(name = "TBonLivraison.findByStrREFLIVRAISON", query = "SELECT t FROM TBonLivraison t WHERE t.strREFLIVRAISON = :strREFLIVRAISON"),
        @NamedQuery(name = "TBonLivraison.findByDtDATELIVRAISON", query = "SELECT t FROM TBonLivraison t WHERE t.dtDATELIVRAISON = :dtDATELIVRAISON"),
        @NamedQuery(name = "TBonLivraison.findByIntMHT", query = "SELECT t FROM TBonLivraison t WHERE t.intMHT = :intMHT"),
        @NamedQuery(name = "TBonLivraison.findByIntTVA", query = "SELECT t FROM TBonLivraison t WHERE t.intTVA = :intTVA"),
        @NamedQuery(name = "TBonLivraison.findByIntHTTC", query = "SELECT t FROM TBonLivraison t WHERE t.intHTTC = :intHTTC"),
        @NamedQuery(name = "TBonLivraison.findByStrSTATUT", query = "SELECT t FROM TBonLivraison t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TBonLivraison.findByDtCREATED", query = "SELECT t FROM TBonLivraison t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TBonLivraison.findByDtUPDATED", query = "SELECT t FROM TBonLivraison t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TBonLivraison.findByStrSTATUTFACTURE", query = "SELECT t FROM TBonLivraison t WHERE t.strSTATUTFACTURE = :strSTATUTFACTURE"),
        @NamedQuery(name = "TBonLivraison.findByBlSELECTED", query = "SELECT t FROM TBonLivraison t WHERE t.blSELECTED = :blSELECTED") })
public class TBonLivraison implements Serializable, Cloneable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_BON_LIVRAISON_ID", nullable = false, length = 20)
    private String lgBONLIVRAISONID;
    @Column(name = "str_REF_LIVRAISON", length = 20)
    private String strREFLIVRAISON;
    @Column(name = "dt_DATE_LIVRAISON")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATELIVRAISON;
    @Column(name = "int_MHT")
    private Integer intMHT;
    @Column(name = "int_TVA")
    private Integer intTVA;
    @Column(name = "int_HTTC")
    private Integer intHTTC;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT_FACTURE", length = 40)
    private String strSTATUTFACTURE;
    @Column(name = "bl_SELECTED")
    private Boolean blSELECTED;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_ORDER_ID", referencedColumnName = "lg_ORDER_ID")
    @ManyToOne
    private TOrder lgORDERID;
    @OneToMany(mappedBy = "lgBONLIVRAISONID")
    private Collection<TRetourFournisseur> tRetourFournisseurCollection;
    @OneToMany(mappedBy = "lgBONLIVRAISONID")
    private Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection;

    @Column(name = "dt_REGLEMENT_DATE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtREGLEMENTDATE;
    @Column(name = "STATUS")
    private String strSTATUS;
    @Column(name = "int_MONTANT_REGLE")
    private Integer intMONTANTREGLE;
    @Column(name = "int_MONTANT_RESTANT")
    private Integer intMONTANTRESTANT;
    @Column(name = "direct_import", columnDefinition = "boolean default false")
    private Boolean directImport = Boolean.FALSE;

    public TBonLivraison() {
    }

    public TBonLivraison(String lgBONLIVRAISONID) {
        this.lgBONLIVRAISONID = lgBONLIVRAISONID;
    }

    public Integer getIntMONTANTREGLE() {
        return this.intMONTANTREGLE;
    }

    public void setIntMONTANTREGLE(Integer montant) {
        this.intMONTANTREGLE = montant;
    }

    public Integer getIntMONTANTRESTANT() {
        return this.intMONTANTRESTANT;
    }

    public void setIntMONTANTRESTANT(Integer montant) {
        this.intMONTANTRESTANT = montant;
    }

    public Date getDtREGLEMENTDATE() {
        return this.dtREGLEMENTDATE;
    }

    public void setDtREGLEMENTDATE(Date date) {
        this.dtREGLEMENTDATE = date;
    }

    public String getSTATUS() {
        return this.strSTATUS;
    }

    public void setSTATUS(String status) {
        this.strSTATUS = status;
    }

    public String getLgBONLIVRAISONID() {
        return lgBONLIVRAISONID;
    }

    public void setLgBONLIVRAISONID(String lgBONLIVRAISONID) {
        this.lgBONLIVRAISONID = lgBONLIVRAISONID;
    }

    public String getStrREFLIVRAISON() {
        return strREFLIVRAISON;
    }

    public void setStrREFLIVRAISON(String strREFLIVRAISON) {
        this.strREFLIVRAISON = strREFLIVRAISON;
    }

    public Date getDtDATELIVRAISON() {
        return dtDATELIVRAISON;
    }

    public void setDtDATELIVRAISON(Date dtDATELIVRAISON) {
        this.dtDATELIVRAISON = dtDATELIVRAISON;
    }

    public Integer getIntMHT() {
        return intMHT;
    }

    public void setIntMHT(Integer intMHT) {
        this.intMHT = intMHT;
    }

    public Integer getIntTVA() {
        return intTVA;
    }

    public void setIntTVA(Integer intTVA) {
        this.intTVA = intTVA;
    }

    public Integer getIntHTTC() {
        return intHTTC;
    }

    public void setIntHTTC(Integer intHTTC) {
        this.intHTTC = intHTTC;
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

    public String getStrSTATUTFACTURE() {
        return strSTATUTFACTURE;
    }

    public void setStrSTATUTFACTURE(String strSTATUTFACTURE) {
        this.strSTATUTFACTURE = strSTATUTFACTURE;
    }

    public Boolean getBlSELECTED() {
        return blSELECTED;
    }

    public void setBlSELECTED(Boolean blSELECTED) {
        this.blSELECTED = blSELECTED;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TOrder getLgORDERID() {
        return lgORDERID;
    }

    public void setLgORDERID(TOrder lgORDERID) {
        this.lgORDERID = lgORDERID;
    }

    @XmlTransient
    public Collection<TRetourFournisseur> getTRetourFournisseurCollection() {
        return tRetourFournisseurCollection;
    }

    public void setTRetourFournisseurCollection(Collection<TRetourFournisseur> tRetourFournisseurCollection) {
        this.tRetourFournisseurCollection = tRetourFournisseurCollection;
    }

    @XmlTransient
    public Collection<TBonLivraisonDetail> getTBonLivraisonDetailCollection() {
        return tBonLivraisonDetailCollection;
    }

    public void setTBonLivraisonDetailCollection(Collection<TBonLivraisonDetail> tBonLivraisonDetailCollection) {
        this.tBonLivraisonDetailCollection = tBonLivraisonDetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgBONLIVRAISONID != null ? lgBONLIVRAISONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TBonLivraison)) {
            return false;
        }
        TBonLivraison other = (TBonLivraison) object;
        if ((this.lgBONLIVRAISONID == null && other.lgBONLIVRAISONID != null)
                || (this.lgBONLIVRAISONID != null && !this.lgBONLIVRAISONID.equals(other.lgBONLIVRAISONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TBonLivraison[ lgBONLIVRAISONID=" + lgBONLIVRAISONID + " ]";
    }

    public Boolean getDirectImport() {
        return directImport;
    }

    public void setDirectImport(Boolean directImport) {
        this.directImport = directImport;
    }

    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

}
