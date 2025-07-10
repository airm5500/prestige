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
@Table(name = "t_type_vente")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TTypeVente.findByStrSTATUT", query = "SELECT t FROM TTypeVente t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeVente.findByStrNAME", query = "SELECT t FROM TTypeVente t WHERE t.strNAME = :strNAME") })
public class TTypeVente implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_VENTE_ID", nullable = false, length = 40)
    private String lgTYPEVENTEID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 100)
    private String strDESCRIPTION;
    @Column(name = "str_TYPE", length = 40)
    private String strTYPE;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TTypeVente() {
    }

    public TTypeVente(String lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
    }

    public String getLgTYPEVENTEID() {
        return lgTYPEVENTEID;
    }

    public void setLgTYPEVENTEID(String lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
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

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
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
        hash += (lgTYPEVENTEID != null ? lgTYPEVENTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeVente)) {
            return false;
        }
        TTypeVente other = (TTypeVente) object;
        if ((this.lgTYPEVENTEID == null && other.lgTYPEVENTEID != null)
                || (this.lgTYPEVENTEID != null && !this.lgTYPEVENTEID.equals(other.lgTYPEVENTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeVente[ lgTYPEVENTEID=" + lgTYPEVENTEID + " ]";
    }

}
