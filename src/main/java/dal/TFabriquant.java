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
@Table(name = "t_fabriquant")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFabriquant.findAll", query = "SELECT t FROM TFabriquant t"),
        @NamedQuery(name = "TFabriquant.findByLgFABRIQUANTID", query = "SELECT t FROM TFabriquant t WHERE t.lgFABRIQUANTID = :lgFABRIQUANTID"),
        @NamedQuery(name = "TFabriquant.findByStrCODE", query = "SELECT t FROM TFabriquant t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TFabriquant.findByStrNAME", query = "SELECT t FROM TFabriquant t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TFabriquant.findByStrDESCRIPTION", query = "SELECT t FROM TFabriquant t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TFabriquant.findByStrADRESSE", query = "SELECT t FROM TFabriquant t WHERE t.strADRESSE = :strADRESSE"),
        @NamedQuery(name = "TFabriquant.findByStrTELEPHONE", query = "SELECT t FROM TFabriquant t WHERE t.strTELEPHONE = :strTELEPHONE"),
        @NamedQuery(name = "TFabriquant.findByDtCREATED", query = "SELECT t FROM TFabriquant t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFabriquant.findByDtUPDATED", query = "SELECT t FROM TFabriquant t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TFabriquant.findByStrSTATUT", query = "SELECT t FROM TFabriquant t WHERE t.strSTATUT = :strSTATUT") })
public class TFabriquant implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FABRIQUANT_ID", nullable = false, length = 20)
    private String lgFABRIQUANTID;
    @Column(name = "str_CODE", length = 40)
    private String strCODE;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 100)
    private String strDESCRIPTION;
    @Column(name = "str_ADRESSE", length = 40)
    private String strADRESSE;
    @Column(name = "str_TELEPHONE", length = 20)
    private String strTELEPHONE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgFABRIQUANTID")
    private Collection<TFamille> tFamilleCollection;

    public TFabriquant() {
    }

    public TFabriquant(String lgFABRIQUANTID) {
        this.lgFABRIQUANTID = lgFABRIQUANTID;
    }

    public String getLgFABRIQUANTID() {
        return lgFABRIQUANTID;
    }

    public void setLgFABRIQUANTID(String lgFABRIQUANTID) {
        this.lgFABRIQUANTID = lgFABRIQUANTID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getStrTELEPHONE() {
        return strTELEPHONE;
    }

    public void setStrTELEPHONE(String strTELEPHONE) {
        this.strTELEPHONE = strTELEPHONE;
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
        hash += (lgFABRIQUANTID != null ? lgFABRIQUANTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFabriquant)) {
            return false;
        }
        TFabriquant other = (TFabriquant) object;
        if ((this.lgFABRIQUANTID == null && other.lgFABRIQUANTID != null)
                || (this.lgFABRIQUANTID != null && !this.lgFABRIQUANTID.equals(other.lgFABRIQUANTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFabriquant[ lgFABRIQUANTID=" + lgFABRIQUANTID + " ]";
    }

}
