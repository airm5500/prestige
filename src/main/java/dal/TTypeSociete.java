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
@Table(name = "t_type_societe")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeSociete.findAll", query = "SELECT t FROM TTypeSociete t"),
        @NamedQuery(name = "TTypeSociete.findByLgTYPESOCIETE", query = "SELECT t FROM TTypeSociete t WHERE t.lgTYPESOCIETE = :lgTYPESOCIETE"),
        @NamedQuery(name = "TTypeSociete.findByStrCODETYPESOCIETE", query = "SELECT t FROM TTypeSociete t WHERE t.strCODETYPESOCIETE = :strCODETYPESOCIETE"),
        @NamedQuery(name = "TTypeSociete.findByStrLIBELLETYPESOCIETE", query = "SELECT t FROM TTypeSociete t WHERE t.strLIBELLETYPESOCIETE = :strLIBELLETYPESOCIETE"),
        @NamedQuery(name = "TTypeSociete.findByStrSTATUT", query = "SELECT t FROM TTypeSociete t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeSociete.findByDtCREATED", query = "SELECT t FROM TTypeSociete t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeSociete.findByDtUPDATED", query = "SELECT t FROM TTypeSociete t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypeSociete implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_SOCIETE", nullable = false, length = 40)
    private String lgTYPESOCIETE;
    @Column(name = "str_CODE_TYPE_SOCIETE", length = 40)
    private String strCODETYPESOCIETE;
    @Column(name = "str_LIBELLE_TYPE_SOCIETE", length = 40)
    private String strLIBELLETYPESOCIETE;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TTypeSociete() {
    }

    public TTypeSociete(String lgTYPESOCIETE) {
        this.lgTYPESOCIETE = lgTYPESOCIETE;
    }

    public String getLgTYPESOCIETE() {
        return lgTYPESOCIETE;
    }

    public void setLgTYPESOCIETE(String lgTYPESOCIETE) {
        this.lgTYPESOCIETE = lgTYPESOCIETE;
    }

    public String getStrCODETYPESOCIETE() {
        return strCODETYPESOCIETE;
    }

    public void setStrCODETYPESOCIETE(String strCODETYPESOCIETE) {
        this.strCODETYPESOCIETE = strCODETYPESOCIETE;
    }

    public String getStrLIBELLETYPESOCIETE() {
        return strLIBELLETYPESOCIETE;
    }

    public void setStrLIBELLETYPESOCIETE(String strLIBELLETYPESOCIETE) {
        this.strLIBELLETYPESOCIETE = strLIBELLETYPESOCIETE;
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
        hash += (lgTYPESOCIETE != null ? lgTYPESOCIETE.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeSociete)) {
            return false;
        }
        TTypeSociete other = (TTypeSociete) object;
        if ((this.lgTYPESOCIETE == null && other.lgTYPESOCIETE != null)
                || (this.lgTYPESOCIETE != null && !this.lgTYPESOCIETE.equals(other.lgTYPESOCIETE))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeSociete[ lgTYPESOCIETE=" + lgTYPESOCIETE + " ]";
    }

}
