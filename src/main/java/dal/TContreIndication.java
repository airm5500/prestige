/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_contre_indication")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TContreIndication.findAll", query = "SELECT t FROM TContreIndication t"),
        @NamedQuery(name = "TContreIndication.findByLgCONTREINDICATIONID", query = "SELECT t FROM TContreIndication t WHERE t.lgCONTREINDICATIONID = :lgCONTREINDICATIONID"),
        @NamedQuery(name = "TContreIndication.findByStrCODECONTREINDICATION", query = "SELECT t FROM TContreIndication t WHERE t.strCODECONTREINDICATION = :strCODECONTREINDICATION"),
        @NamedQuery(name = "TContreIndication.findByStrLIBELLECONTREINDICATION", query = "SELECT t FROM TContreIndication t WHERE t.strLIBELLECONTREINDICATION = :strLIBELLECONTREINDICATION"),
        @NamedQuery(name = "TContreIndication.findByStrSTATUT", query = "SELECT t FROM TContreIndication t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TContreIndication.findByDtCREATED", query = "SELECT t FROM TContreIndication t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TContreIndication.findByDtUPDATED", query = "SELECT t FROM TContreIndication t WHERE t.dtUPDATED = :dtUPDATED") })
public class TContreIndication implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CONTRE_INDICATION_ID", nullable = false, length = 40)
    private String lgCONTREINDICATIONID;
    @Column(name = "str_CODE_CONTRE_INDICATION", length = 40)
    private String strCODECONTREINDICATION;
    @Column(name = "str_LIBELLE_CONTRE_INDICATION", length = 40)
    private String strLIBELLECONTREINDICATION;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TContreIndication() {
    }

    public TContreIndication(String lgCONTREINDICATIONID) {
        this.lgCONTREINDICATIONID = lgCONTREINDICATIONID;
    }

    public String getLgCONTREINDICATIONID() {
        return lgCONTREINDICATIONID;
    }

    public void setLgCONTREINDICATIONID(String lgCONTREINDICATIONID) {
        this.lgCONTREINDICATIONID = lgCONTREINDICATIONID;
    }

    public String getStrCODECONTREINDICATION() {
        return strCODECONTREINDICATION;
    }

    public void setStrCODECONTREINDICATION(String strCODECONTREINDICATION) {
        this.strCODECONTREINDICATION = strCODECONTREINDICATION;
    }

    public String getStrLIBELLECONTREINDICATION() {
        return strLIBELLECONTREINDICATION;
    }

    public void setStrLIBELLECONTREINDICATION(String strLIBELLECONTREINDICATION) {
        this.strLIBELLECONTREINDICATION = strLIBELLECONTREINDICATION;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCONTREINDICATIONID != null ? lgCONTREINDICATIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TContreIndication)) {
            return false;
        }
        TContreIndication other = (TContreIndication) object;
        if ((this.lgCONTREINDICATIONID == null && other.lgCONTREINDICATIONID != null)
                || (this.lgCONTREINDICATIONID != null
                        && !this.lgCONTREINDICATIONID.equals(other.lgCONTREINDICATIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TContreIndication[ lgCONTREINDICATIONID=" + lgCONTREINDICATIONID + " ]";
    }

}
