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
@Table(name = "t_code_acte")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCodeActe.findAll", query = "SELECT t FROM TCodeActe t"),
        @NamedQuery(name = "TCodeActe.findByLgCODEACTEID", query = "SELECT t FROM TCodeActe t WHERE t.lgCODEACTEID = :lgCODEACTEID"),
        @NamedQuery(name = "TCodeActe.findByStrCODE", query = "SELECT t FROM TCodeActe t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TCodeActe.findByStrLIBELLEE", query = "SELECT t FROM TCodeActe t WHERE t.strLIBELLEE = :strLIBELLEE"),
        @NamedQuery(name = "TCodeActe.findByDtCREATED", query = "SELECT t FROM TCodeActe t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCodeActe.findByDtUPDATED", query = "SELECT t FROM TCodeActe t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCodeActe.findByStrSTATUT", query = "SELECT t FROM TCodeActe t WHERE t.strSTATUT = :strSTATUT") })
public class TCodeActe implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CODE_ACTE_ID", nullable = false, length = 40)
    private String lgCODEACTEID;
    @Column(name = "str_CODE", length = 20)
    private String strCODE;
    @Column(name = "str_LIBELLEE", length = 40)
    private String strLIBELLEE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgCODEACTEID")
    private Collection<TFamille> tFamilleCollection;

    public TCodeActe() {
    }

    public TCodeActe(String lgCODEACTEID) {
        this.lgCODEACTEID = lgCODEACTEID;
    }

    public String getLgCODEACTEID() {
        return lgCODEACTEID;
    }

    public void setLgCODEACTEID(String lgCODEACTEID) {
        this.lgCODEACTEID = lgCODEACTEID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrLIBELLEE() {
        return strLIBELLEE;
    }

    public void setStrLIBELLEE(String strLIBELLEE) {
        this.strLIBELLEE = strLIBELLEE;
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
        hash += (lgCODEACTEID != null ? lgCODEACTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCodeActe)) {
            return false;
        }
        TCodeActe other = (TCodeActe) object;
        if ((this.lgCODEACTEID == null && other.lgCODEACTEID != null)
                || (this.lgCODEACTEID != null && !this.lgCODEACTEID.equals(other.lgCODEACTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCodeActe[ lgCODEACTEID=" + lgCODEACTEID + " ]";
    }

}
