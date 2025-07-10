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
@Table(name = "t_type_regime")
@XmlRootElement
@NamedQueries({

        @NamedQuery(name = "TTypeRegime.findByStrSTATUT", query = "SELECT t FROM TTypeRegime t WHERE t.strSTATUT = :strSTATUT") })
public class TTypeRegime implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_REGIME_ID", nullable = false, length = 40)
    private String lgTYPEREGIMEID;
    @Column(name = "str_LIBELLE", length = 50)
    private String strLIBELLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;

    public TTypeRegime() {
    }

    public TTypeRegime(String lgTYPEREGIMEID) {
        this.lgTYPEREGIMEID = lgTYPEREGIMEID;
    }

    public String getLgTYPEREGIMEID() {
        return lgTYPEREGIMEID;
    }

    public void setLgTYPEREGIMEID(String lgTYPEREGIMEID) {
        this.lgTYPEREGIMEID = lgTYPEREGIMEID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEREGIMEID != null ? lgTYPEREGIMEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeRegime)) {
            return false;
        }
        TTypeRegime other = (TTypeRegime) object;
        if ((this.lgTYPEREGIMEID == null && other.lgTYPEREGIMEID != null)
                || (this.lgTYPEREGIMEID != null && !this.lgTYPEREGIMEID.equals(other.lgTYPEREGIMEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeRegime[ lgTYPEREGIMEID=" + lgTYPEREGIMEID + " ]";
    }

}
