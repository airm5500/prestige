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
@Table(name = "t_code_tva")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCodeTva.findAll", query = "SELECT t FROM TCodeTva t"),
        @NamedQuery(name = "TCodeTva.findByLgCODETVAID", query = "SELECT t FROM TCodeTva t WHERE t.lgCODETVAID = :lgCODETVAID"),
        @NamedQuery(name = "TCodeTva.findByStrNAME", query = "SELECT t FROM TCodeTva t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TCodeTva.findByIntVALUE", query = "SELECT t FROM TCodeTva t WHERE t.intVALUE = :intVALUE"),
        @NamedQuery(name = "TCodeTva.findByDtCREATED", query = "SELECT t FROM TCodeTva t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCodeTva.findByDtUPDATED", query = "SELECT t FROM TCodeTva t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCodeTva.findByStrSTATUT", query = "SELECT t FROM TCodeTva t WHERE t.strSTATUT = :strSTATUT") })
public class TCodeTva implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CODE_TVA_ID", nullable = false, length = 40)
    private String lgCODETVAID;
    @Column(name = "str_NAME", length = 20)
    private String strNAME;
    @Column(name = "int_VALUE")
    private Integer intVALUE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgCODETVAID")
    private Collection<TFamille> tFamilleCollection;

    public TCodeTva() {
    }

    public TCodeTva(String lgCODETVAID) {
        this.lgCODETVAID = lgCODETVAID;
    }

    public String getLgCODETVAID() {
        return lgCODETVAID;
    }

    public void setLgCODETVAID(String lgCODETVAID) {
        this.lgCODETVAID = lgCODETVAID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public Integer getIntVALUE() {
        return intVALUE;
    }

    public void setIntVALUE(Integer intVALUE) {
        this.intVALUE = intVALUE;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    @XmlTransient
    public Collection<TFamille> getTFamilleCollection() {
        return tFamilleCollection;
    }

    public void setTFamilleCollection(Collection<TFamille> tFamilleCollection) {
        this.tFamilleCollection = tFamilleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCODETVAID != null ? lgCODETVAID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCodeTva)) {
            return false;
        }
        TCodeTva other = (TCodeTva) object;
        if ((this.lgCODETVAID == null && other.lgCODETVAID != null)
                || (this.lgCODETVAID != null && !this.lgCODETVAID.equals(other.lgCODETVAID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCodeTva[ lgCODETVAID=" + lgCODETVAID + " ]";
    }

}
